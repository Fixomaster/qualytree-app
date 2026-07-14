/**
 * Qualytree Change Control — 구성 변경 기록 (CCR)
 *
 * 모든 엔티티의 생성·변경·삭제는 이 모듈을 거쳐 CCR로 기록된다.
 * 직접 storage를 변경하는 것은 SSoT 원칙 위반.
 *
 * CCR 한 건은 다음을 포함:
 *   - 변경 대상 엔티티 EID
 *   - 액션 종류 (CREATE / UPDATE / DELETE)
 *   - 변경 전·후 값 (전체 또는 패치)
 *   - 변경 사유 (사용자 입력 또는 자동)
 *   - 작업자 + 권한 Level + 시각
 *   - 영향 분석 결과 (linkage.backward 스냅샷)
 *   - 적용 규제 조항 (regulationMapping)
 *   - 해시 (변경 불가 무결성)
 *   - 진행 중 작업 지시에 미치는 영향 (시간 잠금 결정)
 *
 * 적용 원칙:
 * - Project Instructions §13.15 구성 관리 — CCR 자동 등록
 * - Project Instructions §11.5 21 CFR Part 11 §11.10(e) 감사 추적
 * - Project Instructions §22.5 AI 의사결정 추적성 (AI 결정 시 모델 메타도 첨부)
 * - ISO 13485 §4.2.4 문서 변경 통제
 *
 * 데이터 구조:
 *   localStorage('qualytree.changeRecords') = [
 *     {
 *       id: "CCR-2026-0001",
 *       targetEid: "inspectionTemplate:tpl-1736512345",
 *       action: "UPDATE",
 *       before: {...},
 *       after: {...},
 *       diff: {...},
 *       reason: "...",
 *       performedBy: { name, email, level },
 *       performedAt: "ISO-8601",
 *       impacts: [{ eid, kind, kindLabel }, ...],
 *       regulations: [{ std, clause, desc }, ...],
 *       hash: "sha256-substitute",
 *       affectsRunningWOs: ["WO-2026-0001", ...]   // 진행 중 WO 영향 (시간 잠금)
 *     }
 *   ]
 */

import { auth } from './auth'
import { permissions, LEVEL_LABEL } from './permissions'
import { eid, parseEid, findEntity, getAdapter } from './entityRegistry'
import {
  addLink,
  removeLink,
  getImpactedEntities,
  purgeLinksFor,
} from './linkage'
import { getActionRegulations } from './regulationMapping'

const KEY = 'qualytree.changeRecords'
const COUNTER_KEY = 'qualytree.ccrCounter'

export const CHANGE_ACTIONS = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
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

function nextCcrId() {
  const counter = parseInt(localStorage.getItem(COUNTER_KEY) || '0', 10) + 1
  localStorage.setItem(COUNTER_KEY, String(counter))
  const year = new Date().getFullYear()
  return `CCR-${year}-${String(counter).padStart(4, '0')}`
}

/* ================================================================
   유틸리티
   ================================================================ */

/**
 * 두 객체 간 변경 사항 추출 (얕은 비교)
 */
function computeDiff(before, after) {
  if (!before) return { _all: after }
  if (!after) return { _all: before }
  const diff = {}
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  keys.forEach((k) => {
    if (k.startsWith('_')) return // 메타 필드 무시
    const a = before[k]
    const b = after[k]
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      diff[k] = { from: a, to: b }
    }
  })
  return diff
}

/**
 * 변경 내용 해시 (단순 무결성 — 실제 운영은 SHA-256 권장)
 */
function computeHash(record) {
  const str = JSON.stringify({
    id: record.id,
    targetEid: record.targetEid,
    action: record.action,
    diff: record.diff,
    performedAt: record.performedAt,
  })
  // 간단한 해시 (시연용)
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return `qh_${Math.abs(hash).toString(16)}`
}

/**
 * 진행 중 작업 지시 중 이 엔티티 변경에 영향 받을 가능성 있는 것 식별
 * (시간 잠금 — 발급 시점 스냅샷 유지가 원칙이므로, 영향이 없는 게 정상이지만 알림 목적)
 */
function detectAffectedRunningWOs(targetEid) {
  const parsed = parseEid(targetEid)
  if (!parsed) return []

  // 검사 항목 변경 → 그 항목을 포함한 WO들 (시간 잠금되어 있어 변경 미적용)
  if (parsed.type === 'inspectionTemplate') {
    const adapter = getAdapter('workOrder')
    if (!adapter) return []
    const wos = adapter.findAll() || []
    return wos
      .filter((wo) => wo.status !== 'completed')
      .filter((wo) =>
        wo.stages.some(
          (s) =>
            s.inspectionTemplates &&
            s.inspectionTemplates.some((t) => t.id === parsed.id)
        )
      )
      .map((wo) => wo.id)
  }

  // 공정 블록 변경 → 그 블록을 사용하는 WO들
  if (parsed.type === 'processBlock') {
    const adapter = getAdapter('workOrder')
    if (!adapter) return []
    const wos = adapter.findAll() || []
    return wos
      .filter((wo) => wo.status !== 'completed')
      .filter((wo) => wo.stages.some((s) => s.blockId === parsed.id))
      .map((wo) => wo.id)
  }

  return []
}

/* ================================================================
   API — 핵심 함수
   ================================================================ */

/**
 * 변경 기록 발의 — 모든 엔티티 변경은 이 함수를 거친다
 *
 * @param {Object} options
 * @param {string} options.targetEid - 변경 대상 EID
 * @param {string} options.action - CREATE | UPDATE | DELETE
 * @param {Object} [options.before] - 변경 전 상태
 * @param {Object} [options.after] - 변경 후 상태
 * @param {string} [options.reason] - 변경 사유 (사용자 입력)
 * @param {Array<string>} [options.forwardLinks] - 추가할 forward 링크 [{toEid, kind}]
 * @param {Array<string>} [options.removeLinks] - 제거할 링크 [{toEid, kind}]
 * @param {Object} [options.aiContext] - AI 결정 시 모델 메타데이터 (§22.5)
 * @returns {Object} 생성된 CCR 레코드
 */
export function commitChange(options) {
  const {
    targetEid,
    action,
    before,
    after,
    reason,
    forwardLinks = [],
    removeLinks: removeLinksList = [],
    aiContext,
  } = options

  if (!targetEid || !action) {
    throw new Error('commitChange: targetEid + action 필수')
  }

  const cur = auth.current()
  const performer = {
    name: cur?.name || 'unknown',
    email: cur?.email || null,
    level: cur?.level ?? permissions.currentLevel(),
    levelLabel:
      LEVEL_LABEL[cur?.level ?? permissions.currentLevel()]?.ko || 'unknown',
  }

  const parsed = parseEid(targetEid)
  const entityType = parsed?.type
  const regulations = entityType
    ? getActionRegulations(entityType, action.toLowerCase())
    : []

  const diff = computeDiff(before, after)
  const impacts = getImpactedEntities(targetEid)
  const affectsRunningWOs = detectAffectedRunningWOs(targetEid)

  const record = {
    id: nextCcrId(),
    targetEid,
    targetType: entityType,
    action,
    before: before || null,
    after: after || null,
    diff,
    reason: reason || '(사유 미기재)',
    performedBy: performer,
    performedAt: new Date().toISOString(),
    impacts,
    regulations,
    affectsRunningWOs,
    aiContext: aiContext || null,
  }
  record.hash = computeHash(record)

  // 저장
  const all = loadAll()
  all.push(record)
  saveAll(all)

  // 링크 갱신
  forwardLinks.forEach((l) => {
    if (l && l.toEid && l.kind) {
      addLink(targetEid, l.toEid, l.kind)
    }
  })
  removeLinksList.forEach((l) => {
    if (l && l.toEid) {
      removeLink(targetEid, l.toEid, l.kind || null)
    }
  })

  // 삭제 시 모든 링크 정리
  if (action === CHANGE_ACTIONS.DELETE) {
    purgeLinksFor(targetEid)
  }

  return record
}

/**
 * 모든 CCR 조회
 */
export function getAllRecords() {
  return loadAll()
}

/**
 * 특정 엔티티의 변경 이력
 */
export function getRecordsForEntity(targetEid) {
  return loadAll().filter((r) => r.targetEid === targetEid)
}

/**
 * 특정 사용자의 변경 이력 (감사·심사용)
 */
export function getRecordsByUser(emailOrName) {
  return loadAll().filter(
    (r) =>
      r.performedBy.email === emailOrName ||
      r.performedBy.name === emailOrName
  )
}

/**
 * 영향 분석 — 변경 전 미리보기 (사용자 확인용)
 *
 * @param {string} targetEid
 * @returns {Object} {
 *   target: 엔티티 정보,
 *   impacts: 영향 받는 엔티티 목록,
 *   affectsRunningWOs: 진행 중 WO 목록,
 *   regulations: 관련 규제,
 * }
 */
export function previewImpact(targetEid, action = 'update') {
  const parsed = parseEid(targetEid)
  const target = findEntity(targetEid)
  const impacts = getImpactedEntities(targetEid)
  const affectsRunningWOs = detectAffectedRunningWOs(targetEid)
  const regulations = parsed
    ? getActionRegulations(parsed.type, action.toLowerCase())
    : []

  return {
    target,
    targetEid,
    targetType: parsed?.type,
    impacts,
    affectsRunningWOs,
    regulations,
  }
}

/**
 * CCR로 인한 재검토 필요 항목 표시 (UI에서 "재검토 필요" 배지 표시용)
 * @returns {Object} { "<eid>": [{ ccrId, kind }, ...] }
 */
export function getPendingReviewItems() {
  const all = loadAll()
  const out = {}
  all.forEach((r) => {
    if (r.action === CHANGE_ACTIONS.DELETE) return
    r.impacts.forEach((im) => {
      if (!out[im.eid]) out[im.eid] = []
      out[im.eid].push({
        ccrId: r.id,
        sourceEid: r.targetEid,
        kind: im.kind,
        at: r.performedAt,
      })
    })
  })
  return out
}

/**
 * 디버그·관리용 — 전체 초기화 (시연 환경 리셋)
 */
export function resetAll() {
  localStorage.removeItem(KEY)
  localStorage.removeItem(COUNTER_KEY)
}

/* ================================================================
   영향평가서 (Impact Assessment) — CCR 1건당 사람이 작성하는 서술형 평가
   ================================================================
   CCR(commitChange)은 영향받는 엔티티를 자동으로 추적하지만(impacts 필드),
   실제 위험도·조치 필요성에 대한 서술 판단은 담당자가 별도로 작성해야 한다.
   ISO 13485 §4.2.4 / §7.3.9(설계변경) — 변경이 미치는 영향에 대한 평가·기록.
*/
const IA_KEY = 'qualytree.impactAssessments'

function loadIA() {
  try {
    const raw = localStorage.getItem(IA_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveIA(arr) {
  localStorage.setItem(IA_KEY, JSON.stringify(arr))
}

export const IMPACT_RISK_LEVEL = {
  LOW: '낮음',
  MEDIUM: '보통',
  HIGH: '높음',
}

export const impactAssessments = {
  /** CCR 1건에 대한 영향평가서 작성/수정 (upsert — CCR당 1건) */
  upsert(ccrId, data) {
    const cur = auth.current()
    const all = loadIA()
    const idx = all.findIndex((a) => a.ccrId === ccrId)
    const now = new Date().toISOString()
    if (idx === -1) {
      const rec = {
        id: 'IA-' + ccrId,
        ccrId,
        riskLevel: IMPACT_RISK_LEVEL.LOW,
        affectedAreas: '',
        content: '',
        conclusion: '',
        assessedBy: cur?.name || 'unknown',
        assessedAt: now,
        updatedAt: now,
        ...data,
      }
      all.push(rec)
      saveIA(all)
      return rec
    }
    all[idx] = { ...all[idx], ...data, updatedAt: now, updatedBy: cur?.name || 'unknown' }
    saveIA(all)
    return all[idx]
  },
  get(ccrId) {
    return loadIA().find((a) => a.ccrId === ccrId) || null
  },
  getAll() {
    return loadIA()
  },
}
