/**
 * CAPA (Corrective and Preventive Action) — 시정·예방조치
 *
 * 적용 원칙:
 * - Project Instructions §14 부적합품 관리·CAPA
 * - ISO 13485 §8.5.2 시정조치, §8.5.3 예방조치
 * - 21 CFR 820.100 CAPA
 *
 * 발의 트리거:
 * 1. Critical NCR 1건 발생 → 즉시 CAPA 후보
 * 2. 같은 검사 항목 Major NCR N(=3)건 누적 → CAPA 후보
 * 3. 시판후 신호(향후 §17) → CAPA 후보
 * 4. 매니저 수동 발의
 *
 * 라이프사이클:
 *   발의(open) → 근본원인 분석(rca) → 시정조치 실행(corrective)
 *   → 예방조치 수립(preventive) → 효과성 검증(verification) → 종결(closed)
 */

import {
  commitChange,
  CHANGE_ACTIONS,
} from './changeControl'
import { ENTITY_TYPES, eid } from './entityRegistry'
import { LINK_KINDS, addLink } from './linkage'
import { auth } from './auth'
import { permissions } from './permissions'
import { ncr, NCR_SEVERITY } from './ncrState'

const KEY = 'qualytree.capas'
const COUNTER_KEY = 'qualytree.capaCounter'

export const CAPA_STATUS = {
  OPEN: 'open',
  RCA: 'rca', // Root Cause Analysis
  CORRECTIVE: 'corrective',
  PREVENTIVE: 'preventive',
  VERIFICATION: 'verification',
  CLOSED: 'closed',
}

export const CAPA_STATUS_LABEL = {
  open: { ko: '발의', tone: 'rust' },
  rca: { ko: '근본원인 분석', tone: 'amber' },
  corrective: { ko: '시정조치 실행', tone: 'amber' },
  preventive: { ko: '예방조치 수립', tone: 'sky' },
  verification: { ko: '효과성 검증', tone: 'sky' },
  closed: { ko: '종결', tone: 'leaf' },
}

// CAPA 자동 발의 임계값
const THRESHOLD_MAJOR_NCR = 3 // 같은 항목 Major NCR 3건 누적
const THRESHOLD_DAYS = 90 // 누적 평가 기간 (90일 윈도우)

/* ================================================================
   Storage
   ================================================================ */
function loadAll() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveAll(arr) {
  localStorage.setItem(KEY, JSON.stringify(arr))
}

function nextCapaId() {
  const counter = parseInt(localStorage.getItem(COUNTER_KEY) || '0', 10) + 1
  localStorage.setItem(COUNTER_KEY, String(counter))
  const year = new Date().getFullYear()
  return `CAPA-${year}-${String(counter).padStart(4, '0')}`
}

/* ================================================================
   임계값 평가 — NCR 발의 시 자동 호출
   ================================================================ */

/**
 * 새 NCR이 발의되었을 때 CAPA 발의 필요 여부 평가
 * @param {Object} newNcr - 방금 발의된 NCR
 * @returns {Object | null} { trigger, count, suggestedTitle } | null (CAPA 불필요)
 */
export function evaluateForCAPA(newNcr) {
  // Trigger 1: Critical NCR 즉시
  if (newNcr.severity === NCR_SEVERITY.CRITICAL) {
    return {
      trigger: 'critical-immediate',
      reason: 'Critical NCR — 즉시 CAPA 의무 (ISO 13485 §8.5.2)',
      count: 1,
      suggestedTitle: `Critical NCR 대응 — ${newNcr.title}`,
    }
  }

  // Trigger 2: 같은 검사 항목 Major NCR 누적
  if (newNcr.severity === NCR_SEVERITY.MAJOR && newNcr.source?.templateId) {
    const since = new Date(Date.now() - THRESHOLD_DAYS * 86400000).toISOString()
    const sameTemplateNcrs = ncr.forTemplate(newNcr.source.templateId, since)
    const majorCount = sameTemplateNcrs.filter(
      (n) => n.severity === NCR_SEVERITY.MAJOR
    ).length
    if (majorCount >= THRESHOLD_MAJOR_NCR) {
      return {
        trigger: 'major-recurrence',
        reason: `같은 검사 항목 Major NCR ${majorCount}건 누적 (최근 ${THRESHOLD_DAYS}일)`,
        count: majorCount,
        suggestedTitle: `재발성 부적합 CAPA — ${newNcr.title}`,
      }
    }
  }

  return null
}

/* ================================================================
   API
   ================================================================ */
export const capa = {
  loadAll,

  findById(id) {
    return loadAll().find((c) => c.id === id) || null
  },

  /**
   * CAPA 발의
   */
  raise(input) {
    const cur = auth.current()
    const id = nextCapaId()

    const record = {
      id,
      title: input.title || '(제목 없음)',
      description: input.description || '',
      trigger: input.trigger || 'manual',
      triggerReason: input.triggerReason || '',
      sourceNcrIds: input.sourceNcrIds || [],
      raisedAt: new Date().toISOString(),
      raisedBy: cur?.name || 'unknown',
      performerLevel: cur?.level ?? permissions.currentLevel(),
      status: CAPA_STATUS.OPEN,
      rootCause: null,
      correctiveAction: null,
      preventiveAction: null,
      verification: null,
      closure: null,
    }

    const all = loadAll()
    all.push(record)
    saveAll(all)

    const capaEid = eid(ENTITY_TYPES.CAPA, id)
    commitChange({
      targetEid: capaEid,
      action: CHANGE_ACTIONS.CREATE,
      after: record,
      reason: `CAPA 발의 — ${record.title} (${record.trigger})`,
    })

    // 연결된 NCR들과 양방향 연결 + 각 NCR에 capaId 첨부
    ;(input.sourceNcrIds || []).forEach((ncrId) => {
      ncr.attachCapa(ncrId, id)
    })

    return record
  },

  /**
   * 단계 업데이트 — 근본원인, 시정, 예방, 검증, 종결
   */
  updateStage(id, stageData, newStatus, options = {}) {
    const all = loadAll()
    const idx = all.findIndex((c) => c.id === id)
    if (idx === -1) return null

    const before = { ...all[idx] }
    const cur = auth.current()
    const now = new Date().toISOString()

    // 단계별 데이터 입력
    if (stageData.rootCause)
      all[idx].rootCause = { ...stageData.rootCause, recordedAt: now, by: cur?.name }
    if (stageData.correctiveAction)
      all[idx].correctiveAction = {
        ...stageData.correctiveAction,
        recordedAt: now,
        by: cur?.name,
      }
    if (stageData.preventiveAction)
      all[idx].preventiveAction = {
        ...stageData.preventiveAction,
        recordedAt: now,
        by: cur?.name,
      }
    if (stageData.verification)
      all[idx].verification = {
        ...stageData.verification,
        recordedAt: now,
        by: cur?.name,
      }
    if (newStatus === CAPA_STATUS.CLOSED) {
      all[idx].closure = {
        closedAt: now,
        by: cur?.name,
        reason: options.reason || '종결',
      }
    }

    if (newStatus) all[idx].status = newStatus

    saveAll(all)

    commitChange({
      targetEid: eid(ENTITY_TYPES.CAPA, id),
      action: CHANGE_ACTIONS.UPDATE,
      before,
      after: all[idx],
      reason:
        options.reason ||
        `CAPA 단계 업데이트${newStatus ? `: ${before.status} → ${newStatus}` : ''}`,
    })

    return all[idx]
  },

  /** 진행 중 CAPA 카운트 */
  getOpenCount() {
    return loadAll().filter((c) => c.status !== CAPA_STATUS.CLOSED).length
  },

  forNcr(ncrId) {
    return loadAll().filter((c) => (c.sourceNcrIds || []).includes(ncrId))
  },
}
