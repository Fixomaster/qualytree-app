// src/lib/inspectionStandardConstants.js
// 검사 기준서(ISO 13485 §8.2.3/§8.2.4) 공용 상수 및 파생(derive) 로직.
// 검사 기준서는 이제 "제품·공정 > 제품 개발" 화면(개발 설계단계)에서 작성하며,
// 검사 관리(InspectionHub)의 "검사 기준서" 탭은 제품 데이터로부터 파생된 값을
// 조회 전용으로 보여준다 (SSoT는 제품 레코드 하나 — 별도 저장소로 복제하지 않음).
import { Microscope, BadgeCheck, Package, FlaskConical } from 'lucide-react'

export const INSP_TYPES = [
  { value: 'ipc', label: '공정 중 검사 (IPC)', color: '#2563EB', icon: Microscope, short: 'IPC' },
  { value: 'fqc', label: '최종 제품 검사 (FQC)', color: '#059669', icon: BadgeCheck, short: 'FQC' },
  { value: 'incoming', label: '수입검사 (IQC)', color: '#D97706', icon: Package, short: 'IQC' },
  { value: 'process_val', label: '공정 유효성 확인', color: '#7C3AED', icon: FlaskConical, short: 'VAL' },
]

export const EMPTY_INSP_STD_ITEM = { name: '', spec: '', method: '' }

export function deriveInspectionStandards(products) {
  return (products || [])
    .filter((p) => p && p.inspStdName && String(p.inspStdName).trim())
    .map((p) => ({
      id: 'STD-' + (p.id || p.classNo || p.name || 'unknown'),
      productId: p.id || null,
      productName: p.name || p.itemName || '(제품명 미입력)',
      name: p.inspStdName,
      productCode: p.modelNumber || p.classNo || '',
      version: p.inspStdVersion || '1.0',
      effectiveDate: p.inspStdEffectiveDate || '',
      inspType: p.inspStdType || 'fqc',
      aqlLevel: p.inspStdAqlLevel || '',
      acceptQty: p.inspStdAcceptQty || '',
      rejectQty: p.inspStdRejectQty || '',
      checkItems: Array.isArray(p.inspStdCheckItems) ? p.inspStdCheckItems : [],
      notes: p.inspStdNotes || '',
    }))
}

// ── 수입검사 자동 합부판정 ──────────────────────────────────
// 규격(spec) 문자열(예: "10~20", "10±0.5", "≥500", "20 이상")과 측정값을 비교하여
// 'pass' | 'fail' | null(판정 불가 — 수동 판단 필요)을 반환한다.
export function evalAgainstSpec(spec, measured) {
  if (measured === '' || measured == null) return null
  const v = parseFloat(String(measured).replace(/,/g, ''))
  if (Number.isNaN(v)) return null
  const s = String(spec || '').trim()
  if (!s) return null

  let m = s.match(/(-?\d+(?:\.\d+)?)\s*(?:~|-|부터|to)\s*(-?\d+(?:\.\d+)?)/)
  if (m) {
    const a = parseFloat(m[1]), b = parseFloat(m[2])
    const lo = Math.min(a, b), hi = Math.max(a, b)
    return v >= lo && v <= hi ? 'pass' : 'fail'
  }
  m = s.match(/(-?\d+(?:\.\d+)?)\s*±\s*(\d+(?:\.\d+)?)/)
  if (m) {
    const a = parseFloat(m[1]), t = parseFloat(m[2])
    return v >= a - t && v <= a + t ? 'pass' : 'fail'
  }
  m = s.match(/(?:≥|>=)\s*(-?\d+(?:\.\d+)?)/) || s.match(/(-?\d+(?:\.\d+)?)\s*이상/)
  if (m) return v >= parseFloat(m[1]) ? 'pass' : 'fail'
  m = s.match(/(?:≤|<=)\s*(-?\d+(?:\.\d+)?)/) || s.match(/(-?\d+(?:\.\d+)?)\s*이하/)
  if (m) return v <= parseFloat(m[1]) ? 'pass' : 'fail'
  m = s.match(/(?:>)\s*(-?\d+(?:\.\d+)?)/) || s.match(/(-?\d+(?:\.\d+)?)\s*초과/)
  if (m) return v > parseFloat(m[1]) ? 'pass' : 'fail'
  m = s.match(/(?:<)\s*(-?\d+(?:\.\d+)?)/) || s.match(/(-?\d+(?:\.\d+)?)\s*미만/)
  if (m) return v < parseFloat(m[1]) ? 'pass' : 'fail'
  m = s.match(/^(-?\d+(?:\.\d+)?)$/)
  if (m) return v === parseFloat(m[1]) ? 'pass' : 'fail'
  return null
}
