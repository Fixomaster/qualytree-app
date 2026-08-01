// src/lib/cleanlinessSpecConstants.js
// 청결도 사양 — 제품 마스터(제품·공정 > 제품 개발 화면)에서 입력하고
// 청결·오염 관리 화면(CleanlinessHub)에서 읽기 전용으로 조회하는 공용 SSoT.
// ISO 13485 §7.5.2 — 청결 및 오염 관리

export const CLEAN_APPLIES_WHEN = {
  supplied_clean:    '청결 상태로 공급되는 제품',
  cleaned_before:    '사용 전 세척이 필요한 제품',
  contamination_ctl: '오염에 민감한 제품',
  sterile_prep:      '멸균 전 청결 준비 필요',
}

export const CLEAN_CLASSES = [
  'ISO Class 1', 'ISO Class 2', 'ISO Class 3', 'ISO Class 4', 'ISO Class 5',
  'ISO Class 6', 'ISO Class 7', 'ISO Class 8', 'ISO Class 9',
  'Class 100 (ISO 5)', 'Class 10,000 (ISO 7)', 'Class 100,000 (ISO 8)',
  '일반 작업장', '해당 없음',
]

export const CLEANING_METHODS = [
  '순수(DI) 세척', '초음파 세척', '알코올 와이핑', '에어 블로잉',
  '멸균 생리식염수 세척', 'IPA 세척', '세제 세척 후 수세',
  '질소 퍼징', '자동 세척기 (WFI)', '기타',
]

export const CONTAMINATION_TYPES = [
  '미립자 (파티클)', '미생물', '화학물질', '정전기 (ESD)',
  '교차 오염', '중금속', '발열원', '기타',
]

export const MONITOR_FREQS = ['매 배치', '매일', '매주', '매월', '분기별', '수시']

export const CLEAN_STATUSES = [
  { value: 'active',        label: '적용중',       color: '#10B981' },
  { value: 'under_val',     label: '밸리데이션 진행중', color: '#F59E0B' },
  { value: 'not_validated', label: '밸리데이션 필요',  color: '#EF4444' },
  { value: 'not_required',  label: '해당 없음',        color: '#6B7280' },
]

// 제품 레코드(onboarding.products[])에 병합되는 청결도 사양 필드의 기본값.
// ProductsHub의 제품 편집 폼에서 이 필드들을 직접 편집합니다.
export const EMPTY_CLEAN_FIELDS = {
  cleanEnabled: false,
  cleanAppliesWhen: 'supplied_clean',
  cleanClass: CLEAN_CLASSES[6],
  cleaningMethod: CLEANING_METHODS[0],
  contaminationTypes: [],
  particleLimit: '', microbialLimit: '', chemicalLimit: '',
  cleaningProcedureRef: '', cleanValidationRef: '',
  inspectionMethod: '', acceptanceCriteria: '',
  cleanFrequency: MONITOR_FREQS[0], cleanResponsible: '',
  cleanNotes: '', cleanStatus: 'not_validated',
}

// 제품 목록(onboarding.products[])에서 청결도 사양이 활성화된 제품만 뽑아
// CleanlinessHub가 기존에 쓰던 사양 레코드 모양으로 변환한다.
// 별도 저장소 없이 제품 레코드 자체가 단일 진실 공급원(SSoT)이므로,
// 제품 개발 화면에서 입력한 값과 청결·오염 관리 화면 표시가 항상 일치한다.
export function deriveCleanlinessSpecs(products) {
  return (products || [])
    .filter(p => p && p.cleanEnabled)
    .map(p => ({
      id: 'CL-' + (p.id || p.classNo || p.name || 'unknown'),
      productId: p.id || null,
      productName: p.name || p.itemName || '(제품명 미입력)',
      productCode: p.modelNumber || p.classNo || '',
      appliesWhen: p.cleanAppliesWhen || 'supplied_clean',
      cleanClass: p.cleanClass || CLEAN_CLASSES[6],
      cleaningMethod: p.cleaningMethod || CLEANING_METHODS[0],
      contaminationTypes: p.contaminationTypes || [],
      particleLimit: p.particleLimit || '',
      microbialLimit: p.microbialLimit || '',
      chemicalLimit: p.chemicalLimit || '',
      cleaningProcedureRef: p.cleaningProcedureRef || '',
      validationRef: p.cleanValidationRef || '',
      inspectionMethod: p.inspectionMethod || '',
      acceptanceCriteria: p.acceptanceCriteria || '',
      frequency: p.cleanFrequency || MONITOR_FREQS[0],
      responsible: p.cleanResponsible || '',
      notes: p.cleanNotes || '',
      status: p.cleanStatus || 'not_validated',
    }))
}
