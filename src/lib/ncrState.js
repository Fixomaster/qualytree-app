/**
 * NCR (Nonconformance Report) — 부적합 보고서
 *
 * 적용 원칙:
 * - Project Instructions §14 부적합품 관리
 * - Project Instructions §14.3 위험 구간 자동 추적·격리·재검사 큐 등록 (특허 P11)
 * - ISO 13485 §8.3 부적합 제품의 통제
 * - 21 CFR 820.90 Nonconforming product
 *
 * 모든 NCR 변이는 changeControl.commitChange를 거쳐 CCR이 자동 생성된다.
 * OOS 검출 시 자동 발의 → 영향 범위 자동 계산 → 격리 큐 자동 등록 → CAPA 후보 평가.
 *
 * 데이터 구조:
 *   localStorage('qualytree.ncrs') = [
 *     {
 *       id: "NCR-2026-0001",
 *       severity: "Critical" | "Major" | "Minor",
 *       source: { type: 'oos' | 'manual' | 'iqc' | ..., stageEid, woId, templateId },
 *       title, description,
 *       detectedAt, detectedBy, performerLevel,
 *       status: 'open' | 'investigating' | 'contained' | 'corrected' | 'closed',
 *       impact: {
 *         affectedTemplateEid,
 *         affectedStages: [stageEid, ...],
 *         lastOkSignature: { stageId, signedAt, by },  // 마지막 OK 검사 시점
 *         suspectPeriodStart: ISO,                     // 위험 구간 시작
 *         suspectPeriodEnd: ISO,                       // 검출 시점 (현재)
 *         affectedWOs: [woId, ...],                    // 위험 구간에 들어가는 모든 WO
 *         affectedQuantity: N,                         // 격리 대상 수량
 *       },
 *       containment: { quarantineId, isolatedAt, isolatedBy },
 *       correction: { description, completedAt, by },
 *       capaId: null | "CAPA-2026-XXX",                // CAPA 발의되었으면 ID
 *       closure: { closedAt, by, reason },
 *     }
 *   ]
 */

import {
  commitChange,
  CHANGE_ACTIONS,
} from './changeControl'
import { ENTITY_TYPES, eid } from './entityRegistry'
import { LINK_KINDS, addLink } from './linkage'
import { auth } from './auth'
import { permissions } from './permissions'
import { operations, PROCESS_STATUS } from './operationsState'

const KEY = 'qualytree.ncrs'
const COUNTER_KEY = 'qualytree.ncrCounter'

export const NCR_STATUS = {
  OPEN: 'open',
  INVESTIGATING: 'investigating',
  CONTAINED: 'contained',
  CORRECTED: 'corrected',
  CLOSED: 'closed',
}

export const NCR_STATUS_LABEL = {
  open: { ko: '발의', tone: 'rust' },
  investigating: { ko: '조사 중', tone: 'amber' },
  contained: { ko: '격리 완료', tone: 'amber' },
  corrected: { ko: '시정 완료', tone: 'leaf' },
  closed: { ko: '종결', tone: 'ink-mute' },
}

export const NCR_SEVERITY = {
  CRITICAL: 'Critical',
  MAJOR: 'Major',
  MINOR: 'Minor',
}

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

function nextNcrId() {
  const counter = parseInt(localStorage.getItem(COUNTER_KEY) || '0', 10) + 1
  localStorage.setItem(COUNTER_KEY, String(counter))
  const year = new Date().getFullYear()
  return `NCR-${year}-${String(counter).padStart(4, '0')}`
}

/* ================================================================
   영향 범위 계산 — 위험 구간 자동 추적 (특허 P11 핵심 로직)
   ================================================================ */

/**
 * 특정 검사 항목 템플릿의 OOS 검출 시,
 * "마지막 OK 검사 이후 같은 항목으로 측정한 모든 제품"을 자동 식별
 *
 * @param {string} templateId - 부적합 검출된 검사 항목 ID
 * @param {string} currentStageEid - 검출이 발생한 단계 EID
 * @returns {Object} {
 *   lastOkSignature: { woId, stageId, signedAt, by } | null,
 *   suspectPeriodStart, suspectPeriodEnd,
 *   affectedStages, affectedWOs, affectedQuantity,
 * }
 */
export function calculateSuspectPeriod(templateId, currentStageEid) {
  const allWOs = operations.load().workOrders || []
  const now = new Date().toISOString()

  // 같은 템플릿(또는 동일 sourceInspection을 공유하는 템플릿)을 사용한 모든 단계 수집
  // 시간순 정렬
  const relevantStages = []
  allWOs.forEach((wo) => {
    wo.stages.forEach((s) => {
      const usesTemplate =
        s.inspectionTemplates &&
        s.inspectionTemplates.some((t) => t.id === templateId)
      if (!usesTemplate) return
      relevantStages.push({
        woId: wo.id,
        woQuantity: wo.quantity || 0,
        stageId: s.stageId,
        status: s.status,
        signedAt: s.operatorSignature?.signedAt || null,
        signedBy: s.operatorSignature?.name || null,
        completedAt: s.completedAt,
        measurements: s.measurements || [],
      })
    })
  })

  // 시간순 정렬 (서명 시각 기준, 미서명은 맨 뒤)
  relevantStages.sort((a, b) => {
    if (!a.signedAt && !b.signedAt) return 0
    if (!a.signedAt) return 1
    if (!b.signedAt) return -1
    return a.signedAt.localeCompare(b.signedAt)
  })

  // 현재 단계 인덱스 찾기
  const currentEidParts = currentStageEid.split(':')
  const currentStageId = currentEidParts[currentEidParts.length - 1]
  const currentIdx = relevantStages.findIndex((s) => s.stageId === currentStageId)

  // 마지막 OK 서명: 현재 단계 이전 (시간순) 중 측정값이 모두 합격으로 서명 완료된 것
  let lastOkIdx = -1
  for (let i = (currentIdx >= 0 ? currentIdx : relevantStages.length) - 1; i >= 0; i--) {
    const s = relevantStages[i]
    if (s.status !== PROCESS_STATUS.COMPLETED) continue
    // 그 단계에서 같은 템플릿 측정값이 합격이었는지 확인
    const m = s.measurements.find((mm) => mm.templateId === templateId)
    if (m && m.pass === 'pass') {
      lastOkIdx = i
      break
    }
  }

  const lastOk = lastOkIdx >= 0 ? relevantStages[lastOkIdx] : null

  // 위험 구간: lastOk 이후 ~ 현재 (lastOk 미포함)
  const suspectStages = relevantStages.slice(
    lastOkIdx + 1,
    currentIdx >= 0 ? currentIdx + 1 : relevantStages.length
  )

  // WO 수량 합계
  const affectedWoIds = [...new Set(suspectStages.map((s) => s.woId))]
  const affectedWOs = affectedWoIds.map((id) => {
    const wo = allWOs.find((w) => w.id === id)
    return {
      woId: id,
      productName: wo?.productName,
      lotNumber: wo?.lotNumber,
      quantity: wo?.quantity || 0,
    }
  })
  const affectedQuantity = affectedWOs.reduce((sum, w) => sum + w.quantity, 0)

  return {
    lastOkSignature: lastOk
      ? {
          woId: lastOk.woId,
          stageId: lastOk.stageId,
          signedAt: lastOk.signedAt,
          by: lastOk.signedBy,
        }
      : null,
    suspectPeriodStart: lastOk?.signedAt || allWOs[0]?.createdAt || null,
    suspectPeriodEnd: now,
    affectedStages: suspectStages.map((s) => `${s.woId}:${s.stageId}`),
    affectedWOs,
    affectedQuantity,
  }
}

/* ================================================================
   API — NCR 라이프사이클
   ================================================================ */
export const ncr = {
  loadAll,

  findById(id) {
    return loadAll().find((n) => n.id === id) || null
  },

  /**
   * NCR 발의
   * @param {Object} input
   * @param {string} input.severity - 'Critical' | 'Major' | 'Minor'
   * @param {Object} input.source - { type, stageEid, woId, templateId, measurementValue }
   * @param {string} input.title
   * @param {string} input.description
   * @param {Object} [input.suspectPeriodOverride] - 위험 구간 오버라이드 (테스트용)
   * @returns {Object} 생성된 NCR
   */
  raise(input) {
    const cur = auth.current()
    const id = nextNcrId()

    // 위험 구간 자동 계산 (templateId 있을 때만)
    let impact = null
    if (input.source?.templateId && input.source?.stageEid) {
      impact = {
        affectedTemplateEid: eid(
          ENTITY_TYPES.INSPECTION_TEMPLATE,
          input.source.templateId
        ),
        ...calculateSuspectPeriod(input.source.templateId, input.source.stageEid),
      }
    }

    const record = {
      id,
      severity: input.severity || NCR_SEVERITY.MAJOR,
      source: input.source || { type: 'manual' },
      title: input.title || '(제목 없음)',
      description: input.description || '',
      detectedAt: new Date().toISOString(),
      detectedBy: cur?.name || 'unknown',
      performerLevel: cur?.level ?? permissions.currentLevel(),
      status: NCR_STATUS.OPEN,
      impact,
      containment: null,
      correction: null,
      capaId: null,
      closure: null,
    }

    const all = loadAll()
    all.push(record)
    saveAll(all)

    // CCR 발의 — 모든 변이는 commitChange 거침
    const ncrEid = eid(ENTITY_TYPES.NCR, id)
    commitChange({
      targetEid: ncrEid,
      action: CHANGE_ACTIONS.CREATE,
      after: record,
      reason: `NCR 발의 — ${record.title} (${record.severity})`,
    })

    // 양방향 연결
    if (input.source?.stageEid) {
      addLink(ncrEid, input.source.stageEid, LINK_KINDS.RAISED_FROM_STAGE)
    }
    if (impact?.affectedTemplateEid) {
      addLink(ncrEid, impact.affectedTemplateEid, LINK_KINDS.IMPACTS)
    }

    return record
  },

  /**
   * NCR 상태 전환
   */
  updateStatus(id, newStatus, options = {}) {
    const all = loadAll()
    const idx = all.findIndex((n) => n.id === id)
    if (idx === -1) return null
    const before = { ...all[idx] }
    all[idx] = { ...all[idx], status: newStatus }

    // 상태별 보조 필드 갱신
    const cur = auth.current()
    const now = new Date().toISOString()

    if (newStatus === NCR_STATUS.CONTAINED && options.containment) {
      all[idx].containment = {
        ...options.containment,
        isolatedAt: now,
        isolatedBy: cur?.name,
      }
    }
    if (newStatus === NCR_STATUS.CORRECTED && options.correction) {
      all[idx].correction = {
        description: options.correction,
        completedAt: now,
        by: cur?.name,
      }
    }
    if (newStatus === NCR_STATUS.CLOSED) {
      all[idx].closure = {
        closedAt: now,
        by: cur?.name,
        reason: options.reason || '종결',
      }
    }

    saveAll(all)

    commitChange({
      targetEid: eid(ENTITY_TYPES.NCR, id),
      action: CHANGE_ACTIONS.UPDATE,
      before,
      after: all[idx],
      reason: options.reason || `NCR 상태 변경: ${before.status} → ${newStatus}`,
    })

    return all[idx]
  },

  /**
   * CAPA 연결 (capaState에서 호출됨)
   */
  attachCapa(ncrId, capaId) {
    const all = loadAll()
    const idx = all.findIndex((n) => n.id === ncrId)
    if (idx === -1) return null
    const before = { ...all[idx] }
    all[idx].capaId = capaId
    saveAll(all)

    commitChange({
      targetEid: eid(ENTITY_TYPES.NCR, ncrId),
      action: CHANGE_ACTIONS.UPDATE,
      before,
      after: all[idx],
      reason: `CAPA ${capaId} 연결됨`,
    })
    addLink(
      eid(ENTITY_TYPES.CAPA, capaId),
      eid(ENTITY_TYPES.NCR, ncrId),
      LINK_KINDS.ADDRESSES_NCR
    )
    return all[idx]
  },

  /**
   * 미처리 NCR 카운트 (대시보드용)
   */
  getOpenCount() {
    return loadAll().filter(
      (n) => n.status !== NCR_STATUS.CLOSED && n.status !== NCR_STATUS.CORRECTED
    ).length
  },

  /**
   * 특정 WO의 NCR 이력
   */
  forWorkOrder(woId) {
    return loadAll().filter(
      (n) => n.source?.woId === woId || (n.impact?.affectedWOs || []).some((w) => w.woId === woId)
    )
  },

  /**
   * 특정 검사 항목의 NCR 이력 (CAPA 임계값 평가용)
   */
  forTemplate(templateId, sinceISO = null) {
    return loadAll().filter((n) => {
      if (n.source?.templateId !== templateId) return false
      if (sinceISO && n.detectedAt < sinceISO) return false
      return true
    })
  },
}
