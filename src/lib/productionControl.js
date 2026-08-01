// src/lib/productionControl.js
// 생산현황(작업지시·공정기록)이 개발(생산 제어 계획, /production-control)에서 정의한
// 제품별 공정 순서·설비·파라미터를 그대로 사용하기 위한 연동 헬퍼.
// 데이터 출처: qualytree.production_control (ProductionControlHub.jsx의 PCP)

const LS_PCP = 'qualytree.production_control'

export function loadPcps() {
  try { const v = JSON.parse(localStorage.getItem(LS_PCP) || '[]'); return Array.isArray(v) ? v : [] } catch { return [] }
}

const norm = (s) => String(s || '').trim().toLowerCase()

/** 제품명(또는 제품코드)으로 일치하는 생산 제어 계획(PCP)을 찾는다.
 *  승인(approved) 상태를 우선하고, 없으면 가장 최근에 만든 것을 사용한다. */
export function findPcpForProduct(productName, pcps) {
  const list = (pcps || loadPcps()).filter(p =>
    norm(p.productName) === norm(productName) || (p.productCode && norm(p.productCode) === norm(productName))
  )
  if (!list.length) return null
  const approved = list.find(p => p.status === 'approved')
  if (approved) return approved
  return [...list].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0]
}

/** PCP의 공정 단계를 순서(seq)대로 정렬해 반환 */
export function orderedSteps(pcp) {
  if (!pcp || !Array.isArray(pcp.steps)) return []
  return [...pcp.steps].sort((a, b) => (a.seq || 0) - (b.seq || 0))
}

const PASS_RESULTS = ['합격', '조건부합격']

/** 특정 WO·공정단계에 해당하는 공정기록 중 가장 최근 것을 찾는다 (단계명 일치 기준) */
export function latestRecordForStep(woId, stepName, procRecords) {
  const matches = (procRecords || []).filter(r => r.wo === woId && norm(r.step) === norm(stepName))
  if (!matches.length) return null
  return [...matches].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0) || String(b.id).localeCompare(String(a.id)))[0]
}

/** 공정단계 하나의 진행 상태: 'todo' | 'fail' | 'done' */
export function stepStatus(woId, stepName, procRecords) {
  const rec = latestRecordForStep(woId, stepName, procRecords)
  if (!rec) return 'todo'
  if (PASS_RESULTS.includes(rec.result)) return 'done'
  if (rec.result === '불합격') return 'fail'
  return 'todo'
}

/**
 * WO의 진행률을 계산한다.
 * - 제품에 매칭되는 PCP(공정 정의)가 있으면: 정의된 공정단계 중 합격 처리된 단계 비율로 자동 계산.
 * - 매칭되는 PCP가 없으면: 자동 계산이 불가능하므로 기존에 저장된 값을 그대로 사용한다(수동 입력 폐지 후 하위호환).
 */
/** PCP가 없는 WO의 경우, 기존 공정기록에서 실제 등장한 단계를 시간순으로 뽑아 임시 흐름을 구성한다 */
export function deriveStepsFromRecords(woId, procRecords) {
  const seen = []
  const set = new Set()
  ;(procRecords || [])
    .filter(r => r.wo === woId)
    .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0))
    .forEach(r => { const k = norm(r.step); if (r.step && !set.has(k)) { set.add(k); seen.push({ stepName: r.step, equipment: r.machine, controlParams: r.param }) } })
  return seen
}

/**
 * WO의 진행률을 계산한다.
 * - 제품에 매칭되는 PCP(공정 정의)가 있으면: 정의된 공정단계 중 합격 처리된 단계 비율로 자동 계산.
 * - 매칭되는 PCP는 없지만 공정기록이 존재하면: 실제 기록된 단계들을 기준으로 자동 계산(임시 흐름).
 * - 공정기록도 전혀 없으면: 자동 계산이 불가능하므로 기존에 저장된 값을 그대로 사용한다(수동 입력 폐지 후 하위호환, 신규 WO는 0%로 시작).
 */
/**
 * WO의 "현재 공정 단계"와 "담당팀/자"를 PCP(생산 제어 계획)에서 자동으로 파생시킨다.
 * - PCP가 있으면: 아직 합격 처리되지 않은 첫 단계를 현재 단계로 삼고, 그 단계의 담당자(responsible)를 사용.
 *   모든 단계가 완료되었으면 마지막 단계를 유지하되 "완료"로 표시.
 * - PCP가 없으면(제품이 아직 개발문서에 공정 정의가 안 된 경우): 기존 저장값을 그대로 사용(하위호환).
 */
export function deriveCurrentStep(wo, procRecords, pcps) {
  const pcp = findPcpForProduct(wo.product, pcps)
  const steps = orderedSteps(pcp)
  if (pcp && steps.length > 0) {
    const next = steps.find(s => stepStatus(wo.id, s.stepName, procRecords) !== 'done')
    const target = next || steps[steps.length - 1]
    return { stepName: target.stepName, responsible: target.responsible || '', done: !next, auto: true }
  }
  return { stepName: wo.step || '', responsible: wo.assignee || '', done: false, auto: false }
}

export function computeWoProgress(wo, procRecords, pcps) {
  const pcp = findPcpForProduct(wo.product, pcps)
  const steps = orderedSteps(pcp)
  if (pcp && steps.length > 0) {
    const doneCount = steps.filter(s => stepStatus(wo.id, s.stepName, procRecords) === 'done').length
    const pct = Math.round((doneCount / steps.length) * 100)
    return { pct, auto: true, pcp, steps, doneCount }
  }
  const derived = deriveStepsFromRecords(wo.id, procRecords)
  if (derived.length > 0) {
    const doneCount = derived.filter(s => stepStatus(wo.id, s.stepName, procRecords) === 'done').length
    const pct = Math.round((doneCount / derived.length) * 100)
    return { pct, auto: true, pcp: null, steps: derived, doneCount }
  }
  return { pct: Number(wo.progress) || 0, auto: false, pcp: null, steps: [] }
}
