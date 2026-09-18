// 제품별 허가증(인허가 문서) · 작업표준서(SOP) — ISO 13485 §4.2.3(각 시장 인허가) / §7.5.1(작업표준)
//
// - licenses(허가증) — 제품 × 시장(KGMP/FDA/CE 등)별 실제 발급된 인허가 문서 (번호·발급기관·유효기간·첨부파일)
// - workInstructions(작업표준서) — 제품×공정에서 자동 매핑된 SOP 이름에 실제 본문을 작성·발효 관리
//
// equipmentState.js와 동일한 localStorage 기반 패턴(로드/세이브, id는 uid())을 따른다.

const STORE_KEY = 'qualytree.productDocs'

function defaultState() {
  return {
    licenses: [],
    workInstructions: [],
    techDocs: [],
    licenseChangeRequests: [],
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return defaultState()
    const def = defaultState()
    const saved = JSON.parse(raw)
    return { ...def, ...saved }
  } catch {
    return defaultState()
  }
}

function save(next) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(next))
  } catch (e) {
    console.error('productDocsState save failed', e)
  }
  return next
}

const uid = () => Math.random().toString(36).slice(2, 10)

export const MARKETS = [
  { id: 'KGMP', label: 'KGMP (한국 식약처)' },
  { id: 'FDA', label: 'FDA (미국)' },
  { id: 'CE', label: 'CE (EU MDR)' },
  { id: 'ETC', label: '기타' },
]

export const wiStatus = {
  DRAFT: '작성중',
  REVIEW: '검토중',
  EFFECTIVE: '발효',
}

// KGMP/수입 인허가 — 제품별 기술문서·공통 제출 문서 카테고리
export const TECH_DOC_CATEGORY = {
  DEVICE_DESC: '제품 설명서 (Device Description)',
  DESIGN_DEV: '설계 및 개발 자료',
  RISK_FILE: '위험관리 파일 (Risk Management File)',
  PERFORMANCE: '성능시험 자료',
  SAFETY_EFFICACY: '안전성 및 유효성 자료',
  ELECTRICAL_SAFETY: '전기안전 시험성적서 (IEC 60601 시리즈)',
  EMC: 'EMC 시험성적서 (IEC 60601-1-2)',
  SW_VALIDATION: '소프트웨어 검증 자료',
  CYBERSECURITY: '사이버보안 문서',
  BIOCOMPAT: '생물학적 안전성 평가 (ISO 10993)',
  PHYSICOCHEMICAL: '물리·화학적 특성 자료',
  STABILITY: '안정성(Stability) 자료 — 보관·사용기한 근거',
  RADIATION_SAFETY: '방사선에 관한 안전성 자료',
  STERILIZATION_VAL: '멸균 밸리데이션 자료',
  CLINICAL_EVAL: '임상평가·임상시험 자료',
  CATALOG: '제품 카탈로그',
  IFU: '사용설명서 (IFU)',
  LABEL: '제품 라벨 (Label)',
  PHOTO: '제품 사진',
}

/** 유효기간 기준 허가증 상태 계산 — 만료/만료임박(90일 이내)/유효 */
function licenseStatusOf(expiryDate) {
  if (!expiryDate) return ''
  const days = (new Date(expiryDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
  if (days < 0) return '만료'
  if (days <= 90) return '만료임박'
  return '유효'
}

export const productDocs = {
  load,
  save,
  defaultState,
  uid,
  MARKETS,
  wiStatus,
  licenseStatusOf,

  // ── 허가증 ──
  addLicense(productKey, item) {
    const s = load()
    const rec = {
      id: uid(),
      productKey: productKey || 'main',
      market: 'KGMP',
      licenseNo: '',
      productName: '',
      issuer: '',
      issueDate: '',
      expiryDate: '',
      fileId: null,
      notes: '',
      ...item,
    }
    s.licenses = [...s.licenses, rec]
    save(s)
    return rec
  },
  updateLicense(id, patch) {
    const s = load()
    s.licenses = s.licenses.map((l) => (l.id === id ? { ...l, ...patch } : l))
    save(s)
    return s
  },
  deleteLicense(id) {
    const s = load()
    s.licenses = s.licenses.filter((l) => l.id !== id)
    save(s)
    return s
  },
  getLicenses(productKey) {
    const s = load()
    return s.licenses
      .filter((l) => l.productKey === (productKey || 'main'))
      .sort((a, b) => (b.issueDate || '').localeCompare(a.issueDate || ''))
  },

  // ── 허가증 변경 신청 · 승인 (KGMP 허가 변경사항 발생 시 담당자 신청 → 매니저 승인 후 실제 반영) ──
  requestLicenseChange(licenseId, patch, meta) {
    const s = load()
    const license = s.licenses.find((l) => l.id === licenseId)
    if (!license) return null
    const rec = {
      id: uid(),
      licenseId,
      productKey: license.productKey,
      market: license.market,
      licenseNo: license.licenseNo,
      previous: { ...license },
      patch: { ...patch },
      status: 'pending', // pending | approved | rejected
      requestedBy: (meta && meta.requestedBy) || '',
      requestedAt: new Date().toISOString(),
      approvedBy: '',
      approvedAt: '',
      rejectReason: '',
    }
    s.licenseChangeRequests = [...(s.licenseChangeRequests || []), rec]
    save(s)
    return rec
  },
  approveLicenseChange(requestId, approverName) {
    const s = load()
    const req = (s.licenseChangeRequests || []).find((r) => r.id === requestId)
    if (!req || req.status !== 'pending') return s
    s.licenses = s.licenses.map((l) => (l.id === req.licenseId ? { ...l, ...req.patch } : l))
    s.licenseChangeRequests = s.licenseChangeRequests.map((r) =>
      r.id === requestId ? { ...r, status: 'approved', approvedBy: approverName, approvedAt: new Date().toISOString() } : r
    )
    save(s)
    return s
  },
  rejectLicenseChange(requestId, approverName, reason) {
    const s = load()
    s.licenseChangeRequests = (s.licenseChangeRequests || []).map((r) =>
      r.id === requestId ? { ...r, status: 'rejected', approvedBy: approverName, approvedAt: new Date().toISOString(), rejectReason: reason || '' } : r
    )
    save(s)
    return s
  },
  getLicenseChangeRequests(filter) {
    const s = load()
    let list = s.licenseChangeRequests || []
    if (filter && filter.status) list = list.filter((r) => r.status === filter.status)
    if (filter && filter.productKey) list = list.filter((r) => r.productKey === filter.productKey)
    return list.slice().sort((a, b) => (b.requestedAt || '').localeCompare(a.requestedAt || ''))
  },
  getPendingLicenseChangeRequest(licenseId) {
    const s = load()
    return (s.licenseChangeRequests || []).find((r) => r.licenseId === licenseId && r.status === 'pending') || null
  },

  // ── 작업표준서 (SOP) ──
  addWorkInstruction(productKey, item) {
    const s = load()
    const rec = {
      id: uid(),
      productKey: productKey || 'main',
      sopName: '',
      blockId: '',
      content: '',
      status: wiStatus.DRAFT,
      rev: 0,
      updatedAt: '',
      updatedBy: '',
      ...item,
    }
    s.workInstructions = [...s.workInstructions, rec]
    save(s)
    return rec
  },
  updateWorkInstruction(id, patch) {
    const s = load()
    s.workInstructions = s.workInstructions.map((w) =>
      w.id === id ? { ...w, ...patch, rev: (w.rev || 0) + 1, updatedAt: new Date().toISOString() } : w
    )
    save(s)
    return s
  },
  deleteWorkInstruction(id) {
    const s = load()
    s.workInstructions = s.workInstructions.filter((w) => w.id !== id)
    save(s)
    return s
  },
  getWorkInstructions(productKey) {
    const s = load()
    return s.workInstructions.filter((w) => w.productKey === (productKey || 'main'))
  },
  findWorkInstruction(productKey, sopName) {
    const s = load()
    return s.workInstructions.find((w) => w.productKey === (productKey || 'main') && w.sopName === sopName) || null
  },

  // ── 기술문서 · 공통 제출 문서 (KGMP/수입 인허가) ──
  addTechDoc(productKey, item) {
    const s = load()
    const rec = {
      id: uid(),
      productKey: productKey || 'main',
      category: TECH_DOC_CATEGORY.DEVICE_DESC,
      title: '',
      fileId: null,
      fileName: '',
      issueDate: '',
      notes: '',
      ...item,
    }
    s.techDocs = Array.isArray(s.techDocs) ? [...s.techDocs, rec] : [rec]
    save(s)
    return rec
  },
  updateTechDoc(id, patch) {
    const s = load()
    s.techDocs = (s.techDocs || []).map((d) => (d.id === id ? { ...d, ...patch } : d))
    save(s)
    return s
  },
  deleteTechDoc(id) {
    const s = load()
    s.techDocs = (s.techDocs || []).filter((d) => d.id !== id)
    save(s)
    return s
  },
  getTechDocs(productKey) {
    const s = load()
    return (s.techDocs || []).filter((d) => d.productKey === (productKey || 'main'))
  },
}

export default productDocs
