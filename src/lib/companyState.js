// 회사·조직 문서 — ISO 13485 §4.1(조직) / §5.5.1(책임과 권한) / §6.3(기반시설) / KGMP 제6조(제조관리자)
//
// - documents(회사문서함) — 사업자등록증·제조업허가증·제조소 평면도·사진
// - roleDocs(부서별 직무기술서·권한책임서) — 조직도(onboardingState.departments) 부서에 연결
// - qualityManager(품질책임자 지정) — 제조관리자 자격증·임명장 첨부 + 승인 절차
//
// equipmentState.js와 동일한 localStorage 기반 패턴을 따른다.

const STORE_KEY = 'qualytree.companyDocs'

function defaultState() {
  return {
    documents: [],
    roleDocs: [],
    qualityManager: null,
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
    console.error('companyState save failed', e)
  }
  return next
}

const uid = () => Math.random().toString(36).slice(2, 10)

export const DOC_CATEGORY = {
  BIZ_REG: '사업자등록증',
  MFG_LICENSE: '제조업허가증',
  FACILITY_PLAN: '제조소 평면도',
  FACILITY_PHOTO: '제조소 사진',
  FACILITY_REG: '제조소 등록자료',
  IMPORT_LICENSE: '수입업 허가증',
  AGENT_CONTRACT: '대리인 계약서 (Authorization Letter)',
  GMP_CERT: '제조소 GMP 인증서',
  ISO13485_CERT: 'ISO 13485 인증서',
}

export const QM_STATUS = {
  DRAFT: '지정대기',
  APPROVED: '승인완료',
}

export const companyDocs = {
  load,
  save,
  defaultState,
  uid,
  DOC_CATEGORY,
  QM_STATUS,

  // ── 회사문서함 ──
  addDocument(item) {
    const s = load()
    const rec = {
      id: uid(),
      category: DOC_CATEGORY.BIZ_REG,
      title: '',
      issuer: '',
      issueDate: '',
      expiryDate: '',
      fileId: null,
      fileName: '',
      notes: '',
      ...item,
    }
    s.documents = [...s.documents, rec]
    save(s)
    return rec
  },
  updateDocument(id, patch) {
    const s = load()
    s.documents = s.documents.map((d) => (d.id === id ? { ...d, ...patch } : d))
    save(s)
    return s
  },
  deleteDocument(id) {
    const s = load()
    s.documents = s.documents.filter((d) => d.id !== id)
    save(s)
    return s
  },
  getDocuments(category) {
    const s = load()
    return category ? s.documents.filter((d) => d.category === category) : s.documents
  },

  // ── 부서별 직무기술서·권한책임서 ──
  upsertRoleDoc(departmentId, departmentName, patch) {
    const s = load()
    const existing = s.roleDocs.find((r) => r.departmentId === departmentId)
    if (existing) {
      s.roleDocs = s.roleDocs.map((r) => (r.departmentId === departmentId ? { ...r, ...patch, departmentName, updatedAt: new Date().toISOString() } : r))
    } else {
      s.roleDocs = [
        ...s.roleDocs,
        { id: uid(), departmentId, departmentName, jobDescription: '', authorityResponsibility: '', updatedAt: new Date().toISOString(), ...patch },
      ]
    }
    save(s)
    return s
  },
  getRoleDoc(departmentId) {
    return load().roleDocs.find((r) => r.departmentId === departmentId) || null
  },
  getAllRoleDocs() {
    return load().roleDocs
  },

  // ── 품질책임자 지정 ──
  setQualityManager(patch) {
    const s = load()
    const cur = s.qualityManager || { name: '', title: '', appointedDate: '', certFileId: null, certFileName: '', letterFileId: null, letterFileName: '', status: QM_STATUS.DRAFT, approvedBy: '', approvedAt: '' }
    s.qualityManager = { ...cur, ...patch, status: QM_STATUS.DRAFT, approvedBy: '', approvedAt: '' }
    save(s)
    return s
  },
  approveQualityManager(approverName) {
    const s = load()
    if (!s.qualityManager) return s
    if (!s.qualityManager.certFileId || !s.qualityManager.letterFileId) {
      throw new Error('제조관리자 자격증과 임명장을 모두 첨부해야 승인할 수 있습니다.')
    }
    s.qualityManager = { ...s.qualityManager, status: QM_STATUS.APPROVED, approvedBy: approverName, approvedAt: new Date().toISOString() }
    save(s)
    return s
  },
  getQualityManager() {
    return load().qualityManager
  },
}

export default companyDocs
