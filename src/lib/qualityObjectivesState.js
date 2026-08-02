// src/lib/qualityObjectivesState.js
// ISO 13485 §5.4.1 품질 목표 — 실제 저장소·상태계산 로직 공유
// QualityObjectivesHub(품질방침·목표 페이지의 '품질목표' 탭)와 managementReviewState.js(경영검토
// KPI 자동집계)가 동일한 데이터/판정 로직을 공유하도록 단일 진실 공급원(SSoT)으로 분리함. (#356)

export const LS_KEY = 'qualytree.quality_objectives'

export const OBJ_STATUSES = {
  on_track:  { label: '달성 중',   color: '#059669', bg: '#D1FAE5' },
  at_risk:   { label: '위험',      color: '#D97706', bg: '#FEF3C7' },
  missed:    { label: '미달성',    color: '#DC2626', bg: '#FEE2E2' },
  achieved:  { label: '달성',      color: '#2563EB', bg: '#DBEAFE' },
  not_started: { label: '미시작', color: '#9CA3AF', bg: '#F3F4F6' },
}

export function getAll() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}

// 달성률 계산
export function calcRate(obj) {
  const actual = parseFloat(obj.actualValue)
  const target = parseFloat(obj.targetValue)
  const baseline = parseFloat(obj.baselineValue)
  if (isNaN(actual) || isNaN(target)) return null
  if (obj.direction === 'lower') {
    if (!isNaN(baseline) && baseline !== target) {
      return Math.max(0, Math.min(100, Math.round(((baseline - actual) / (baseline - target)) * 100)))
    }
    return actual <= target ? 100 : Math.max(0, Math.round((target / actual) * 100))
  } else {
    if (target === 0) return actual >= 0 ? 100 : 0
    return Math.max(0, Math.min(150, Math.round((actual / target) * 100)))
  }
}

// 자동 상태 결정
export function autoStatus(obj) {
  const rate = calcRate(obj)
  if (rate === null) return obj.status || 'not_started'
  if (rate >= 100) return 'achieved'
  if (rate >= 80) return 'on_track'
  if (rate >= 60) return 'at_risk'
  return 'missed'
}

export function effStatus(obj) {
  return obj.autoCalc !== false ? autoStatus(obj) : (obj.status || 'not_started')
}

// #364: 품질목표 등록 시 KPI명을 직접 타이핑하는 대신, 실제 QMS 데이터에 연동된 KPI를
// 선택하면 실적값이 자동으로 채워지도록 함. '기타'를 선택한 경우에만 기존처럼 직접 입력.
export const LINKED_KPI_OPTIONS = [
  { id: 'capa_rate', label: 'CAPA 완료율', unit: '%', direction: 'higher' },
  { id: 'training_rate', label: '교육 이수율', unit: '%', direction: 'higher' },
  { id: 'ncr_open', label: 'NCR 미결 건수', unit: '건', direction: 'lower' },
  { id: 'calibration_overdue', label: '설비교정 기한초과 건수', unit: '건', direction: 'lower' },
  { id: 'audit_open_findings', label: '내부심사 미종결 건수', unit: '건', direction: 'lower' },
  { id: 'supplier_reeval_due', label: '공급업체 재평가 도래 건수', unit: '건', direction: 'lower' },
  { id: 'other', label: '기타 (직접 입력)', unit: '', direction: 'higher' },
]

/** 경영검토 KPI 스냅샷(managementReviewState.buildSnapshot().kpi)에서 연동 KPI의 현재 실적값을 계산 */
export function computeLinkedActual(kpiId, kpiSnapshot) {
  if (!kpiSnapshot) return ''
  switch (kpiId) {
    case 'capa_rate': {
      const total = (kpiSnapshot.capaOpen || 0) + (kpiSnapshot.capaClosed || 0)
      return total > 0 ? Math.round((kpiSnapshot.capaClosed / total) * 100) : ''
    }
    case 'training_rate':
      return kpiSnapshot.trainingCompliance == null ? '' : kpiSnapshot.trainingCompliance
    case 'ncr_open':
      return kpiSnapshot.ncrOpen ?? ''
    case 'calibration_overdue':
      return kpiSnapshot.calibrationOverdue ?? ''
    case 'audit_open_findings':
      return kpiSnapshot.auditOpenFindings ?? ''
    case 'supplier_reeval_due':
      return kpiSnapshot.supplierReevalDue ?? ''
    default:
      return ''
  }
}

export default { LS_KEY, OBJ_STATUSES, getAll, calcRate, autoStatus, effStatus, LINKED_KPI_OPTIONS, computeLinkedActual }
