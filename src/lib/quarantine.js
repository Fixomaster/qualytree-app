/**
 * Quarantine — 격리·재검사 큐
 *
 * 적용 원칙:
 * - Project Instructions §14.3 위험 구간 자동 추적·격리·재검사 큐 등록 (특허 P11)
 * - ISO 13485 §8.3 부적합 제품의 통제 — 격리(Containment)
 * - 21 CFR 820.90(a) 부적합 제품의 식별·문서화·평가·격리·처분
 *
 * NCR 발의 → 위험 구간(suspectPeriod)의 모든 제품 → 자동 격리 큐 등록
 * 격리된 제품은 다음 처분 옵션:
 *   - rework (재작업)
 *   - re-inspect (재검사)
 *   - scrap (폐기)
 *   - use-as-is (특채 — 의료기기에서는 강한 정당화 필요)
 */

import {
  commitChange,
  CHANGE_ACTIONS,
} from './changeControl'
import { ENTITY_TYPES, eid } from './entityRegistry'
import { addLink } from './linkage'
import { auth } from './auth'

const KEY = 'qualytree.quarantineItems'
const COUNTER_KEY = 'qualytree.quarantineCounter'

export const QUARANTINE_STATUS = {
  ISOLATED: 'isolated', // 격리 완료, 처분 미정
  REINSPECTING: 'reinspecting', // 재검사 진행 중
  REWORK: 'rework', // 재작업 진행 중
  SCRAPPED: 'scrapped', // 폐기 완료
  RELEASED: 'released', // 재검사 합격 — 출하 가능
  USE_AS_IS: 'use-as-is', // 특채 (강한 정당화 필요)
}

export const QUARANTINE_STATUS_LABEL = {
  isolated: { ko: '격리됨', tone: 'rust' },
  reinspecting: { ko: '재검사 중', tone: 'amber' },
  rework: { ko: '재작업 중', tone: 'amber' },
  scrapped: { ko: '폐기 완료', tone: 'ink-mute' },
  released: { ko: '출하 가능', tone: 'leaf' },
  'use-as-is': { ko: '특채', tone: 'sky' },
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

function nextQId() {
  const counter = parseInt(localStorage.getItem(COUNTER_KEY) || '0', 10) + 1
  localStorage.setItem(COUNTER_KEY, String(counter))
  const year = new Date().getFullYear()
  return `Q-${year}-${String(counter).padStart(4, '0')}`
}

/* ================================================================
   API
   ================================================================ */
export const quarantine = {
  loadAll,

  findById(id) {
    return loadAll().find((q) => q.id === id) || null
  },

  /**
   * NCR로부터 격리 큐 항목 일괄 생성
   * NCR.impact.affectedWOs를 순회하며 각 WO를 격리 큐에 등록
   *
   * @param {Object} ncrRecord - NCR 객체
   * @returns {Array} 생성된 격리 항목들
   */
  isolateFromNcr(ncrRecord) {
    if (!ncrRecord.impact || !ncrRecord.impact.affectedWOs) return []
    const cur = auth.current()
    const all = loadAll()
    const created = []

    ncrRecord.impact.affectedWOs.forEach((wo) => {
      // 이미 같은 NCR로 격리된 WO는 스킵
      const dupe = all.find(
        (q) => q.sourceNcrId === ncrRecord.id && q.woId === wo.woId
      )
      if (dupe) return

      const item = {
        id: nextQId(),
        sourceNcrId: ncrRecord.id,
        woId: wo.woId,
        productName: wo.productName,
        lotNumber: wo.lotNumber,
        quantity: wo.quantity,
        reason: `${ncrRecord.severity} NCR — ${ncrRecord.title}`,
        status: QUARANTINE_STATUS.ISOLATED,
        isolatedAt: new Date().toISOString(),
        isolatedBy: cur?.name || 'system',
        disposition: null,
        dispositionAt: null,
        dispositionBy: null,
        reInspectionWoId: null,
      }
      all.push(item)
      created.push(item)

      const qEid = eid('quarantineItem', item.id)
      commitChange({
        targetEid: qEid,
        action: CHANGE_ACTIONS.CREATE,
        after: item,
        reason: `격리 — NCR ${ncrRecord.id} 위험 구간 자동 등록`,
      })

      // 연결: 격리 → NCR
      addLink(qEid, eid(ENTITY_TYPES.NCR, ncrRecord.id), 'quarantinedBy')
      addLink(qEid, eid(ENTITY_TYPES.WORK_ORDER, wo.woId), 'isolatesWO')
    })

    saveAll(all)
    return created
  },

  /**
   * 처분 결정
   */
  setDisposition(qId, disposition, options = {}) {
    const all = loadAll()
    const idx = all.findIndex((q) => q.id === qId)
    if (idx === -1) return null

    const before = { ...all[idx] }
    const cur = auth.current()
    const now = new Date().toISOString()

    all[idx].status = disposition
    all[idx].disposition = options.note || disposition
    all[idx].dispositionAt = now
    all[idx].dispositionBy = cur?.name
    if (options.reInspectionWoId) {
      all[idx].reInspectionWoId = options.reInspectionWoId
    }

    saveAll(all)

    commitChange({
      targetEid: eid('quarantineItem', qId),
      action: CHANGE_ACTIONS.UPDATE,
      before,
      after: all[idx],
      reason: options.reason || `격리 처분: ${disposition}`,
    })

    return all[idx]
  },

  /** 격리 중 항목 카운트 (대시보드용) */
  getActiveCount() {
    return loadAll().filter(
      (q) =>
        q.status === QUARANTINE_STATUS.ISOLATED ||
        q.status === QUARANTINE_STATUS.REINSPECTING ||
        q.status === QUARANTINE_STATUS.REWORK
    ).length
  },

  forNcr(ncrId) {
    return loadAll().filter((q) => q.sourceNcrId === ncrId)
  },

  forWorkOrder(woId) {
    return loadAll().filter((q) => q.woId === woId)
  },
}
