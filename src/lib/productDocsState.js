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
}

export default productDocs
