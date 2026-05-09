// 제품 분류 옵션 (RA 비전공자 친화적 객관식)

export const DEVICE_CONTACT_TYPES = [
  { id: 'none', label: '환자 신체와 직접 접촉하지 않음', en: 'No body contact', hint: '예: 진단 영상 SW' },
  { id: 'surface', label: '피부 표면에만 닿음', en: 'Surface contact', hint: '예: 청진기, 외용 패치' },
  { id: 'mucosal', label: '점막에 닿음', en: 'Mucosal', hint: '예: 위내시경' },
  { id: 'breached', label: '손상된 피부·조직과 닿음', en: 'Breached/compromised', hint: '예: 상처 드레싱, 봉합사' },
  { id: 'invasive-short', label: '체내에 단기간(<24h) 삽입', en: 'Short-term invasive', hint: '예: 수술 도구' },
  { id: 'invasive-prolonged', label: '체내에 일정 기간(<30d) 삽입', en: 'Prolonged invasive', hint: '예: 카테터' },
  { id: 'implant', label: '체내 장기 삽입(>30d) — 임플란트', en: 'Implant', hint: '예: 정형외과 임플란트, 인공관절' },
]

export const DEVICE_USES_ELECTRICITY = [
  { id: 'no', label: '아니오 — 기계식만', impact: 'IEC 60601-1 비적용' },
  { id: 'battery', label: '예 — 배터리', impact: 'IEC 60601-1 + IEC 62133 적용' },
  { id: 'mains', label: '예 — 전원에 연결', impact: 'IEC 60601-1 적용' },
]

export const DEVICE_HAS_SOFTWARE = [
  { id: 'none', label: '없음', impact: '' },
  { id: 'embedded', label: '제품 내장 SW', impact: 'IEC 62304 적용 (Class A/B/C 결정 필요)' },
  { id: 'samd', label: 'SaMD (독립형 SW 의료기기)', impact: 'IEC 62304 + FDA SaMD Guidance' },
]

// 사용자 입력에 따른 자동 등급 분류
export function classifyDevice(input) {
  const { contact, electricity, software } = input
  const result = {
    fdaClass: 'I',
    mdrClass: 'I',
    kmfdsClass: '1',
    risk: 'low',
    reasoning: [],
  }

  if (contact === 'implant') {
    result.fdaClass = 'III'
    result.mdrClass = 'III'
    result.kmfdsClass = '4'
    result.risk = 'high'
    result.reasoning.push('체내 장기 삽입 임플란트 → MDR Rule 8 (Class III)')
  } else if (contact === 'invasive-prolonged') {
    result.fdaClass = 'II'
    result.mdrClass = 'IIb'
    result.kmfdsClass = '3'
    result.risk = 'medium-high'
    result.reasoning.push('30일 이상 침습 → MDR Rule 7 (Class IIb)')
  } else if (contact === 'invasive-short') {
    result.fdaClass = 'II'
    result.mdrClass = 'IIa'
    result.kmfdsClass = '2'
    result.risk = 'medium'
    result.reasoning.push('단기 침습 → MDR Rule 6 (Class IIa)')
  } else if (contact === 'breached' || contact === 'mucosal') {
    result.fdaClass = 'II'
    result.mdrClass = 'IIa'
    result.kmfdsClass = '2'
    result.risk = 'medium'
  }

  if (electricity === 'mains' || electricity === 'battery') {
    result.reasoning.push('전기 사용 → IEC 60601-1 적용')
  }
  if (software === 'embedded' || software === 'samd') {
    result.reasoning.push('SW 포함 → IEC 62304 적용')
  }

  return result
}

// 다중 규제 옵션
export const REGULATIONS = [
  {
    id: 'iso-13485',
    name: 'ISO 13485:2016',
    region: '글로벌',
    desc: '의료기기 품질경영시스템 (QMS) 국제 표준',
    must: true,
    autoIncluded: true,
  },
  {
    id: 'kgmp',
    name: 'KGMP',
    region: '한국 (식약처)',
    desc: '한국 의료기기 제조 및 품질관리 기준',
    primary: ['한국 시장 진출'],
  },
  {
    id: 'fda-510k',
    name: 'FDA 510(k)',
    region: '미국 (FDA)',
    desc: '시판전 신고 — Class I/II 일반적',
    primary: ['미국 시장 진출'],
  },
  {
    id: 'fda-pma',
    name: 'FDA PMA',
    region: '미국 (FDA)',
    desc: '시판전 승인 — Class III 임플란트 등',
    primary: ['미국 시장 진출 (Class III)'],
  },
  {
    id: 'fda-qmsr',
    name: 'FDA QMSR',
    region: '미국 (FDA)',
    desc: '21 CFR 820 → 2026.2.2 ISO 13485 통합 발효',
    autoLinked: 'iso-13485',
  },
  {
    id: 'mdr',
    name: 'EU MDR (2017/745)',
    region: '유럽',
    desc: '의료기기 규정 — NB 인증',
    primary: ['EU 시장 진출'],
  },
  {
    id: 'mdsap',
    name: 'MDSAP',
    region: '미국·캐나다·호주·브라질·일본',
    desc: 'Medical Device Single Audit Program — 5개국 단일 심사',
    primary: ['다국가 진출'],
  },
  {
    id: 'pmda',
    name: 'PMDA',
    region: '일본',
    desc: '일본 의약품의료기기종합기구',
    primary: ['일본 시장 진출'],
  },
  {
    id: 'nmpa',
    name: 'NMPA',
    region: '중국',
    desc: '중국 국가약품감독관리국',
    primary: ['중국 시장 진출'],
  },
]

// 역할 (Skill Matrix)
export const STANDARD_ROLES = [
  { id: 'qmr', name: '품질경영대리인 (QMR)', en: 'Quality Management Representative', required: true, ref: 'ISO 13485 §5.5.2' },
  { id: 'ra', name: 'RA 담당', en: 'Regulatory Affairs', required: true },
  { id: 'qa', name: 'QA 담당', en: 'Quality Assurance', required: true },
  { id: 'qc', name: 'QC 담당', en: 'Quality Control', required: false },
  { id: 'production', name: '생산 책임자', en: 'Production Manager', required: true },
  { id: 'engineering', name: '설계·개발', en: 'Design & Development', required: true },
  { id: 'prrc', name: 'PRRC (MDR)', en: 'Person Responsible for Regulatory Compliance', required: false, ref: 'MDR Article 15' },
]
