// src/lib/sterileSpecConstants.js
// 멸균 방법 사양 — 제품 마스터(제품·공정 화면)에서 입력하고
// 멸균 의료기기 관리 화면(SterileControlHub)에서 읽기 전용으로 조회하는 공용 SSoT.
// ISO 13485 §7.5.7 — 멸균 의료기기 특별 요구사항

export const STERILE_METHODS = [
  'EO (에틸렌옥사이드)',
  '감마선 (Gamma Radiation)',
  'E-beam (전자빔)',
  '고압증기멸균 (Autoclave)',
  '건열 멸균 (Dry Heat)',
  '과산화수소 플라즈마 (H₂O₂ Plasma)',
  'X선 방사선',
  '기타',
]

export const SAL_LEVELS = [
  '10⁻⁶ (의료기기 표준)',
  '10⁻³',
  '10⁻¹',
  '기타',
]

export const BIOBURDEN_METHODS = [
  'ISO 11737-1 (총균수)',
  'ISO 11737-1 + 동정',
  '해당 없음',
  '기타',
]

export const SPEC_STATUSES = [
  { value: 'validated',      label: '밸리데이션 완료',  color: '#10B981' },
  { value: 'under_val',      label: '밸리데이션 진행중', color: '#F59E0B' },
  { value: 'not_validated',  label: '밸리데이션 필요',   color: '#EF4444' },
  { value: 'not_required',   label: '해당 없음',         color: '#6B7280' },
]

// 제품 레코드(onboarding.products[])에 병합되는 멸균 사양 필드의 기본값.
// ProductsHub의 제품 편집 폼에서 이 필드들을 직접 편집합니다.
export const EMPTY_STERILE_FIELDS = {
  sterileEnabled: false,
  sterileMethod: STERILE_METHODS[0],
  salTarget: SAL_LEVELS[0],
  cycleTemp: '', cycleTime: '', cyclePressure: '', cycleDose: '',
  validationRef: '', packagingRef: '',
  bioburdenLimit: '', bioburdenMethod: BIOBURDEN_METHODS[0],
  expiryMonths: '',
  sterilityTestRequired: true, reprocessingAllowed: false,
  sterileNotes: '', sterileStatus: 'not_validated',
}

// 제품 목록(onboarding.products[])에서 멸균 사양이 활성화된 제품만 뽑아
// SterileControlHub가 기존에 쓰던 스펙 레코드 모양으로 변환한다.
// 별도 저장소 없이 제품 레코드 자체가 단일 진실 공급원(SSoT)이므로,
// 제품 개발 화면에서 입력한 값과 멸균 의료기기 관리 화면 표시가 항상 일치한다.
export function deriveSterileSpecs(products) {
  return (products || [])
    .filter(p => p && p.sterileEnabled)
    .map(p => ({
      id: 'SC-' + (p.id || p.classNo || p.name || 'unknown'),
      productId: p.id || null,
      productName: p.name || p.itemName || '(제품명 미입력)',
      productCode: p.modelNumber || p.classNo || '',
      sterileMethod: p.sterileMethod || STERILE_METHODS[0],
      salTarget: p.salTarget || SAL_LEVELS[0],
      cycleTemp: p.cycleTemp || '',
      cycleTime: p.cycleTime || '',
      cyclePressure: p.cyclePressure || '',
      cycleDose: p.cycleDose || '',
      validationRef: p.validationRef || '',
      packagingRef: p.packagingRef || '',
      bioburdenLimit: p.bioburdenLimit || '',
      bioburdenMethod: p.bioburdenMethod || BIOBURDEN_METHODS[0],
      expiryMonths: p.expiryMonths || '',
      sterilityTestRequired: p.sterilityTestRequired !== false,
      reprocessingAllowed: !!p.reprocessingAllowed,
      notes: p.sterileNotes || '',
      status: p.sterileStatus || 'not_validated',
    }))
}
