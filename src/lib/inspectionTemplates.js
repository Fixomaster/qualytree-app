// 검사 항목 템플릿 — 공정 블록별 회사 고유 검사 규격
// 매니저가 정의 → 작업자는 측정값만 입력
// 템플릿 변경 시 §13.15 CCR(Configuration Change Record) 자동 등록
import { auth } from './auth'
import { commitChange, previewImpact as previewChangeImpact, CHANGE_ACTIONS } from './changeControl'
import { eid, ENTITY_TYPES } from './entityRegistry'
const KEY = 'qualytree.inspectionTemplates'

/** 고유 템플릿 ID — 같은 ms에 여러 건 추가돼도 충돌하지 않음 */
function newTplId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `tpl-${crypto.randomUUID()}`
  }
  return `tpl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * 4번째 인자 정규화 — 문자열(정의자 이름)이거나 { definedBy, reason } 옵션 객체
 * @returns {{ definedBy: string|null, reason: string|null }}
 */
function normalizeOpts(opts) {
  if (!opts) return { definedBy: null, reason: null }
  if (typeof opts === 'string') return { definedBy: opts, reason: null }
  if (typeof opts === 'object') {
    const by = opts.definedBy
    return {
      definedBy:
        typeof by === 'string' ? by : by?.name || by?.email || null,
      reason: typeof opts.reason === 'string' ? opts.reason : null,
    }
  }
  return { definedBy: null, reason: null }
}

function currentPerformerName() {
  try {
    const cur = auth.current()
    return cur?.name || cur?.email || null
  } catch {
    return null
  }
}

/** CCR 자동 발의 — §13.15 (실패해도 템플릿 저장 자체는 막지 않음) */
function recordChange(action, tpl, before, after, reason) {
  try {
    commitChange({
      targetEid: eid(ENTITY_TYPES.INSPECTION_TEMPLATE, tpl.id),
      action,
      before,
      after,
      reason,
    })
  } catch (e) {
    console.warn('[inspectionTemplates] CCR 기록 실패', e)
  }
}

/**
 * 데이터 구조:
 * {
 *   "cnc-milling": [
 *     {
 *       id: "tpl-1",
 *       label: "치수 A",
 *       unit: "mm",
 *       specMin: 19.95,
 *       specMax: 20.05,
 *       specNominal: 20.00,
 *       criticality: "Critical" | "Major" | "Minor",
 *       method: "CMM" | "버니어" | ...,
 *       sourceInspection: "치수 검사 (CMM)",  // 어느 자동 매핑 항목에서 시작했는지
 *       version: 1,
 *       definedBy: "홍길동",
 *       definedAt: "2026-05-10T10:00:00Z",
 *     }
 *   ],
 *   "ultrasonic-clean": [...]
 * }
 */

export const CRITICALITY = {
  CRITICAL: 'Critical',
  MAJOR: 'Major',
  MINOR: 'Minor',
}

export const CRITICALITY_OPTIONS = [
  { value: 'Critical', label: 'Critical', desc: '안전·필수 성능 직접 영향' },
  { value: 'Major', label: 'Major', desc: '주요 품질 특성' },
  { value: 'Minor', label: 'Minor', desc: '외관·일반 특성' },
]

export const inspectionTemplates = {
  loadAll() {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  },

  saveAll(map) {
    localStorage.setItem(KEY, JSON.stringify(map))
  },

  /** 특정 공정 블록의 검사 항목 템플릿 목록 */
  forBlock(blockId) {
    const all = this.loadAll()
    return all[blockId] || []
  },

  /**
   * 새 템플릿 추가
   * @param {string|{definedBy?:string, reason?:string}} [opts] 정의자 이름 또는 옵션 객체
   */
  add(blockId, template, opts) {
    const { definedBy, reason } = normalizeOpts(opts)
    const all = this.loadAll()
    if (!all[blockId]) all[blockId] = []
    const newTpl = {
      id: newTplId(),
      version: 1,
      definedBy: definedBy || currentPerformerName() || '매니저',
      definedAt: new Date().toISOString(),
      ...template,
    }
    all[blockId].push(newTpl)
    this.saveAll(all)
    recordChange(
      CHANGE_ACTIONS.CREATE,
      newTpl,
      null,
      { ...newTpl, blockId },
      reason || `${newTpl.label || '검사 항목'} 검사 항목 신규 정의`
    )
    return newTpl
  },

  /**
   * 기존 템플릿 수정 — 버전 +1, CCR 자동 발의
   * @param {string|{definedBy?:string, reason?:string}} [opts] 정의자 이름 또는 옵션 객체
   */
  update(blockId, tplId, patch, opts) {
    const { definedBy, reason } = normalizeOpts(opts)
    const all = this.loadAll()
    const list = all[blockId] || []
    const idx = list.findIndex((t) => t.id === tplId)
    if (idx === -1) return null
    const before = { ...list[idx] }
    list[idx] = {
      ...list[idx],
      ...patch,
      version: (list[idx].version || 1) + 1,
      definedBy:
        definedBy ||
        currentPerformerName() ||
        (typeof before.definedBy === 'string' ? before.definedBy : '매니저'),
      definedAt: new Date().toISOString(),
    }
    all[blockId] = list
    this.saveAll(all)
    recordChange(
      CHANGE_ACTIONS.UPDATE,
      list[idx],
      { ...before, blockId },
      { ...list[idx], blockId },
      reason || `${list[idx].label || '검사 항목'} 검사 항목 수정`
    )
    return list[idx]
  },

  /**
   * 템플릿 삭제 — CCR(DELETE) 자동 발의
   * @param {string|{reason?:string}} [opts]
   */
  remove(blockId, tplId, opts) {
    const { reason } = normalizeOpts(opts)
    const all = this.loadAll()
    const list = all[blockId] || []
    const target = list.find((t) => t.id === tplId)
    all[blockId] = list.filter((t) => t.id !== tplId)
    this.saveAll(all)
    if (target) {
      recordChange(
        CHANGE_ACTIONS.DELETE,
        target,
        { ...target, blockId },
        null,
        reason || `${target.label || '검사 항목'} 검사 항목 삭제`
      )
    }
  },

  /**
   * 템플릿 변경 전 영향 분석 미리보기 (§13.15) — changeControl.previewImpact 위임
   * @returns {{ impacts: Array, affectsRunningWOs: Array, regulations: Array }}
   */
  previewImpact(tplId, action = 'update') {
    try {
      return previewChangeImpact(eid(ENTITY_TYPES.INSPECTION_TEMPLATE, tplId), action)
    } catch (e) {
      console.warn('[inspectionTemplates] previewImpact 실패', e)
      return { targetEid: null, impacts: [], affectsRunningWOs: [], regulations: [] }
    }
  },

  /**
   * WO 발급 시 사용 — 템플릿 스냅샷 (시간 잠금)
   * 진행 중 WO는 발급 시점 템플릿을 영구 보존
   */
  snapshotForBlock(blockId) {
    return this.forBlock(blockId).map((t) => ({ ...t }))
  },

  /**
   * 자동 매핑 항목으로부터 단일 템플릿 시드 생성 (매니저 첫 등록 편의)
   * 매니저가 "치수 검사 (CMM)" 자동 매핑 항목을 보고 한 번 클릭하면
   * 빈 규격 템플릿이 생성되어 매니저가 specMin/specMax만 채우도록 유도
   */
  seedFromAutoMapping(blockId, sourceInspection, definedBy) {
    return this.add(
      blockId,
      {
        label: sourceInspection,
        unit: '',
        specMin: '',
        specMax: '',
        specNominal: '',
        criticality: CRITICALITY.MAJOR,
        method: '',
        sourceInspection,
      },
      definedBy
    )
  },
}

/**
 * 측정값이 규격에 적합한지 자동 판정
 * @param {number|string} value
 * @param {object} template
 * @returns {'pass' | 'fail' | 'unknown'}
 */
export function evalAgainstSpec(value, template) {
  const v = parseFloat(value)
  if (Number.isNaN(v)) return 'unknown'
  const min = template.specMin === '' ? null : parseFloat(template.specMin)
  const max = template.specMax === '' ? null : parseFloat(template.specMax)
  if (min == null && max == null) return 'unknown' // 규격 미정의
  if (min != null && v < min) return 'fail'
  if (max != null && v > max) return 'fail'
  return 'pass'
}
