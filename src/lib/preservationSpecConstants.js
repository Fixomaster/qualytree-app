// src/lib/preservationSpecConstants.js
// 보존 사양 — 제품 마스터(제품·공정 > 제품 개발 화면)에서 입력하고
// 재고·출고관리 화면(InventoryHub)과 제품 보존·취급 관리 화면(PreservationHub)에서
// 읽기 전용으로 조회하는 공용 SSoT. ISO 13485 §7.5.11 제품 보존

export const STORAGE_CONDITIONS = [
  { key: 'room',   label: '실온 (1~30℃)',     icon: '🌡️' },
  { key: 'cool',   label: '냉장 (2~8℃)',      icon: '❄️' },
  { key: 'frozen', label: '냉동 (-18℃ 이하)', icon: '🧊' },
  { key: 'dry',    label: '건조 보관',          icon: '☁️' },
  { key: 'dark',   label: '차광 보관',          icon: '🌑' },
  { key: 'other',  label: '기타 조건',          icon: '📦' },
]

export const STERILITY = ['비멸균', '멸균 (EO)', '멸균 (감마선)', '멸균 (전자선)', '멸균 (증기)', '멸균 (기타)']
export const PACKAGING_TYPES = ['단위 포장', '내포장', '외포장', '운송 포장']

// 제품 레코드(onboarding.products[])에 병합되는 보존 사양 필드의 기본값.
// ProductsHub의 제품 편집 폼에서 이 필드들을 직접 편집합니다.
export const EMPTY_PRESERVATION_FIELDS = {
  preserveEnabled: false,
  storageCondition: 'room', tempMin: '', tempMax: '', humMin: '', humMax: '',
  lightSensitive: false, shockSensitive: false, stackLimit: '',
  shelfLifeMonths: 12, preserveSterility: '비멸균',
  packagingType: '단위 포장', packagingSpec: '',
  cleanlinessReq: '', handlingInstructions: '',
  linkedEnvZoneId: '', preserveNotes: '',
  pkgCheckItems: [], // 출하 전 점검 시 사용할 포장/보존 점검 항목 (제품별)
}

// 제품 목록(onboarding.products[])에서 보존 사양이 활성화된 제품만 뽑아
// PreservationHub/InventoryHub가 기존에 쓰던 사양 레코드 모양으로 변환한다.
// 별도 저장소 없이 제품 레코드 자체가 단일 진실 공급원(SSoT)이므로,
// 제품 개발 화면에서 입력한 값과 재고·보존 관리 화면 표시가 항상 일치한다.
export function derivePreservationSpecs(products) {
  return (products || [])
    .filter(p => p && p.preserveEnabled)
    .map(p => ({
      id: 'PSP-' + (p.id || p.classNo || p.name || 'unknown'),
      productId: p.id || null,
      productName: p.name || p.itemName || '(제품명 미입력)',
      productCode: p.modelNumber || p.classNo || '',
      deviceClass: p.classification || 'Class II',
      storageCondition: p.storageCondition || 'room',
      tempMin: p.tempMin || '', tempMax: p.tempMax || '',
      humMin: p.humMin || '', humMax: p.humMax || '',
      lightSensitive: !!p.lightSensitive, shockSensitive: !!p.shockSensitive,
      stackLimit: p.stackLimit || '',
      shelfLifeMonths: p.shelfLifeMonths || 12,
      sterility: p.preserveSterility || '비멸균',
      packagingType: p.packagingType || '단위 포장',
      packagingSpec: p.packagingSpec || '',
      cleanlinessReq: p.cleanlinessReq || '',
      handlingInstructions: p.handlingInstructions || '',
      linkedEnvZoneId: p.linkedEnvZoneId || '',
      notes: p.preserveNotes || '',
      pkgCheckItems: p.pkgCheckItems || [],
    }))
}
