/**
 * Inspection Stages — 검사 단계 (IQC / FAI / IPI / LAI)
 *
 * 적용 원칙:
 * - Project Instructions §13.14 검사 단계 및 샘플링
 * - Project Instructions §13.14.0 IQC (Incoming Quality Control, v1.2 신설)
 * - ISO 13485:2016 §7.4.3 (구매한 제품의 검증), §8.2.4 (제품 모니터링·측정), §8.2.6 (제품의 적합성 모니터링)
 * - 21 CFR 820.80 (Receiving, in-process, and finished device acceptance activities)
 * - ISO 2859-1 (샘플링 검사 — 향후 강화 검사 트리거에 사용)
 *
 * 데이터 구조:
 *   localStorage('qualytree.inspectionExecutions') = [
 *     {
 *       id: "INS-2026-0001",
 *       woId: "WO-2026-0001",
 *       stageType: "IQC" | "FAI" | "IPI" | "LAI",
 *       plannedSampleSize: number,         // 계획된 샘플 크기
 *       actualSampleSize: number,          // 실제 검사된 샘플 크기
 *       sampledItems: [                    // 각 샘플 단위 측정 결과
 *         { unitNo, measurements: [...], pass: true|false }
 *       ],
 *       status: "planned" | "in_progress" | "completed_pass" | "completed_fail",
 *       startedAt, completedAt,
 *       performerId, performerName, performerLevel,
 *       inspectorId, inspectorName,        // 검사관 (Level 2+) 검토 서명
 *       inspectorSignature: { signedAt, name, ... } | null,
 *       reasonForEnhanced: string | null,  // 강화 검사 사유 (있으면)
 *       linkedNcrIds: [...]                // 부적합 발생 시 NCR 연결
 *     }
 *   ]
 */

import { commitChange, CHANGE_ACTIONS } from './changeControl'
import { ENTITY_TYPES, eid } from './entityRegistry'
import { addLink, LINK_KINDS } from './linkage'
import { auth } from './auth'
import { permissions } from './permissions'
import { operations } from './operationsState'

const KEY = 'qualytree.inspectionExecutions'
const COUNTER_KEY = 'qualytree.inspectionCounter'

export const STAGE_TYPES = {
  IQC: 'IQC',
  FAI: 'FAI',
  IPI: 'IPI',
  LAI: 'LAI',
}

export const STAGE_TYPE_META = {
  IQC: {
    ko: '수입검사',
    en: 'Incoming Quality Control',
    description: '입고 자재 검사 — 공급자 → 자재 합격 판정',
    when: '자재 입고 시 / 신규 공급자 / 부적합 후 강화 검사',
    standards: 'ISO 13485 §7.4.3 / 21 CFR 820.80(b)',
    color: 'sky',
    order: 0,
  },
  FAI: {
    ko: '초도검사',
    en: 'First Article Inspection',
    description: '첫 N개 100% 검사 — 양산 진입 가능 여부 판정',
    when: '신규 공정 / 신규 작업 지시 / 설계 변경 후 첫 생산',
    standards: 'ISO 13485 §8.2.4 / 21 CFR 820.80(c) / AS9102 (FAI 표준)',
    color: 'amber',
    order: 1,
  },
  IPI: {
    ko: '공정검사',
    en: 'In-Process Inspection',
    description: '공정 중 샘플링 검사 — 양산 안정성 모니터링',
    when: '양산 중 매 N개 / 매 시간 / 매 로트 단위',
    standards:
      'ISO 13485 §8.2.4 / 21 CFR 820.80(c) / ISO 2859-1 (샘플링)',
    color: 'leaf',
    order: 2,
  },
  LAI: {
    ko: '출하검사',
    en: 'Last Article / Final Inspection',
    description: '완성품 최종 검사 — 출하 가능 판정',
    when: '작업 지시 마무리 시 / 출하 직전',
    standards: 'ISO 13485 §8.2.6 / 21 CFR 820.80(d)',
    color: 'moss',
    order: 3,
  },
}

export const EXEC_STATUS = {
  PLANNED: 'planned',
  IN_PROGRESS: 'in_progress',
  COMPLETED_PASS: 'completed_pass',
  COMPLETED_FAIL: 'completed_fail',
}

export const EXEC_STATUS_LABEL = {
  planned: { ko: '계획됨', tone: 'ink-mute' },
  in_progress: { ko: '진행 중', tone: 'amber' },
  completed_pass: { ko: '합격', tone: 'leaf' },
  completed_fail: { ko: '부적합', tone: 'rust' },
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

function nextInsId() {
  const counter = parseInt(localStorage.getItem(COUNTER_KEY) || '0', 10) + 1
  localStorage.setItem(COUNTER_KEY, String(counter))
  const year = new Date().getFullYear()
  return `INS-${year}-${String(counter).padStart(4, '0')}`
}

/* ================================================================
   샘플 크기 권장 — 단순 규칙 (향후 ISO 2859-1로 확장)
   ================================================================ */
export function recommendSampleSize(stageType, lotQuantity) {
  if (!lotQuantity || lotQuantity <= 0) return 1
  switch (stageType) {
    case STAGE_TYPES.IQC:
      // 수입검사: 신규 공급자는 전수, 일반은 ISO 2859-1 일반 검사 수준 II 근사
      if (lotQuantity <= 8) return lotQuantity
      if (lotQuantity <= 50) return 5
      if (lotQuantity <= 150) return 20
      if (lotQuantity <= 500) return 32
      return 50
    case STAGE_TYPES.FAI:
      // 초도검사: 첫 N개 100%
      return Math.min(5, lotQuantity)
    case STAGE_TYPES.IPI:
      // 공정검사: 약 5~10% 샘플
      if (lotQuantity <= 10) return Math.min(2, lotQuantity)
      if (lotQuantity <= 50) return 5
      if (lotQuantity <= 200) return Math.ceil(lotQuantity * 0.05)
      return Math.min(20, Math.ceil(lotQuantity * 0.03))
    case STAGE_TYPES.LAI:
      // 출하검사: 마지막 N개
      return Math.min(5, lotQuantity)
    default:
      return 1
  }
}

/* ================================================================
   API
   ================================================================ */
export const inspectionStages = {
  loadAll,

  findById(id) {
    return loadAll().find((e) => e.id === id) || null
  },

  /**
   * 검사 단계 계획 (플랜 발행 — 매니저)
   *
   * @param {Object} input
   * @param {string} input.woId
   * @param {string} input.stageType - STAGE_TYPES 중 하나
   * @param {number} [input.plannedSampleSize]
   * @param {string} [input.reasonForEnhanced]
   * @returns {Object} 생성된 검사 단계 실행 레코드
   */
  plan(input) {
    const { woId, stageType, plannedSampleSize, reasonForEnhanced } = input
    if (!woId || !stageType) {
      throw new Error('inspectionStages.plan: woId + stageType 필수')
    }
    const wo = operations.getWorkOrder(woId)
    if (!wo) {
      throw new Error(`작업 지시 ${woId} 없음`)
    }

    const cur = auth.current()
    const id = nextInsId()
    const sampleSize =
      plannedSampleSize ?? recommendSampleSize(stageType, wo.quantity)

    const record = {
      id,
      woId,
      stageType,
      plannedSampleSize: sampleSize,
      actualSampleSize: 0,
      sampledItems: [],
      status: EXEC_STATUS.PLANNED,
      plannedBy: cur?.name,
      plannedByLevel: cur?.level ?? permissions.currentLevel(),
      plannedAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      performerId: null,
      performerName: null,
      performerLevel: null,
      inspectorName: null,
      inspectorSignature: null,
      reasonForEnhanced: reasonForEnhanced || null,
      linkedNcrIds: [],
    }

    const all = loadAll()
    all.push(record)
    saveAll(all)

    // CCR + 양방향 연결
    const insEid = eid('inspectionExecution', id)
    commitChange({
      targetEid: insEid,
      action: CHANGE_ACTIONS.CREATE,
      after: record,
      reason: `${STAGE_TYPE_META[stageType].ko}(${stageType}) 검사 계획 — ${wo.id} (${sampleSize}개 샘플)`,
    })
    addLink(insEid, eid(ENTITY_TYPES.WORK_ORDER, woId), 'forWorkOrder')

    return record
  },

  /**
   * 검사 시작 (작업자 또는 검사관)
   */
  start(insId) {
    const all = loadAll()
    const idx = all.findIndex((e) => e.id === insId)
    if (idx === -1) return null
    if (all[idx].status !== EXEC_STATUS.PLANNED) {
      throw new Error('계획됨 상태에서만 시작 가능')
    }
    const before = { ...all[idx] }
    const cur = auth.current()
    all[idx] = {
      ...all[idx],
      status: EXEC_STATUS.IN_PROGRESS,
      startedAt: new Date().toISOString(),
      performerId: cur?.email,
      performerName: cur?.name,
      performerLevel: cur?.level ?? permissions.currentLevel(),
    }
    saveAll(all)

    commitChange({
      targetEid: eid('inspectionExecution', insId),
      action: CHANGE_ACTIONS.UPDATE,
      before,
      after: all[idx],
      reason: '검사 시작',
    })
    return all[idx]
  },

  /**
   * 측정값 저장 (저장 only — 서명 전)
   * sampledItems = [{ unitNo, measurements: [{ templateId, value, pass, note }], pass }]
   */
  saveProgress(insId, sampledItems) {
    const all = loadAll()
    const idx = all.findIndex((e) => e.id === insId)
    if (idx === -1) return null
    const before = { ...all[idx] }
    all[idx] = {
      ...all[idx],
      sampledItems: [...sampledItems],
      actualSampleSize: sampledItems.filter((s) =>
        s.measurements?.some((m) => m.value !== '')
      ).length,
    }
    saveAll(all)
    // 진행 저장은 CCR 발의 안 함 (너무 잦음) — 완료 시점에만
    return all[idx]
  },

  /**
   * 검사 완료 + 서명 — 검사관(Level 2+) 권한 필요
   * 부적합 단위가 있으면 자동 NCR 발의 (호출자에서 처리)
   */
  complete(insId, payload) {
    const { sampledItems, inspectorName } = payload
    const all = loadAll()
    const idx = all.findIndex((e) => e.id === insId)
    if (idx === -1) return null
    if (all[idx].status !== EXEC_STATUS.IN_PROGRESS) {
      throw new Error('진행 중 상태에서만 완료 가능')
    }

    const cur = auth.current()
    const before = { ...all[idx] }

    const anyFail = (sampledItems || []).some((s) => s.pass === false)
    const allMeasured = (sampledItems || []).every(
      (s) =>
        s.measurements && s.measurements.length > 0 && s.pass !== null && s.pass !== undefined
    )

    if (!allMeasured) {
      throw new Error('모든 샘플의 측정값이 입력되어야 완료 가능')
    }

    const now = new Date().toISOString()
    all[idx] = {
      ...all[idx],
      sampledItems,
      actualSampleSize: sampledItems.length,
      status: anyFail
        ? EXEC_STATUS.COMPLETED_FAIL
        : EXEC_STATUS.COMPLETED_PASS,
      completedAt: now,
      inspectorName: inspectorName || cur?.name,
      inspectorSignature: {
        signedAt: now,
        name: inspectorName || cur?.name,
        email: cur?.email,
        level: cur?.level ?? permissions.currentLevel(),
      },
    }
    saveAll(all)

    commitChange({
      targetEid: eid('inspectionExecution', insId),
      action: CHANGE_ACTIONS.UPDATE,
      before,
      after: all[idx],
      reason: anyFail
        ? `${STAGE_TYPE_META[all[idx].stageType].ko} 검사 완료 — 부적합 발견`
        : `${STAGE_TYPE_META[all[idx].stageType].ko} 검사 완료 — 합격`,
    })

    return all[idx]
  },

  /**
   * NCR 연결 첨부
   */
  attachNcr(insId, ncrId) {
    const all = loadAll()
    const idx = all.findIndex((e) => e.id === insId)
    if (idx === -1) return null
    const before = { ...all[idx] }
    all[idx].linkedNcrIds = [...(all[idx].linkedNcrIds || []), ncrId]
    saveAll(all)
    commitChange({
      targetEid: eid('inspectionExecution', insId),
      action: CHANGE_ACTIONS.UPDATE,
      before,
      after: all[idx],
      reason: `NCR ${ncrId} 연결`,
    })
    addLink(
      eid('inspectionExecution', insId),
      eid(ENTITY_TYPES.NCR, ncrId),
      'detectedNcr'
    )
    return all[idx]
  },

  forWorkOrder(woId) {
    return loadAll()
      .filter((e) => e.woId === woId)
      .sort((a, b) => {
        const oa = STAGE_TYPE_META[a.stageType]?.order ?? 99
        const ob = STAGE_TYPE_META[b.stageType]?.order ?? 99
        return oa - ob
      })
  },

  /** 한 작업 지시에 4가지 검사 단계 표준 플랜 일괄 생성 */
  planAllStandard(woId) {
    const out = []
    ;[STAGE_TYPES.IQC, STAGE_TYPES.FAI, STAGE_TYPES.IPI, STAGE_TYPES.LAI].forEach(
      (st) => {
        try {
          out.push(this.plan({ woId, stageType: st }))
        } catch (e) {
          // 이미 있는 경우 등 무시
        }
      }
    )
    return out
  },

  /**
   * 출하 적합 판정 — LAI가 합격이면 출하 가능
   */
  isReleaseQualified(woId) {
    const all = this.forWorkOrder(woId)
    const lai = all.find((e) => e.stageType === STAGE_TYPES.LAI)
    return lai?.status === EXEC_STATUS.COMPLETED_PASS
  },
}
