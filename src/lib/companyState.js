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
    naCategories: [], // 회사문서함 중 "해당 없음" 처리한 카테고리 목록 (예: 제조업 아닌 회사의 수입업 허가증)
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

// 품질책임자(제조관리자) 자격 요건 — 의료기기법 시행규칙 [별표9] 품질관리 담당자의 자격기준 요약.
// 회사가 실제 자격증·경력증명서 등을 보유하고 있음을 스스로 체크하는 요건 목록으로,
// 이전에는 자격증·임명장 파일 첨부를 승인 조건으로 요구했으나, 파일 유무보다
// 법정 요건 충족 여부를 명시적으로 확인하는 방식으로 변경한다.
export const QM_REQUIREMENTS = [
  { id: 'qualification', label: '의료기기법 시행규칙 [별표9]에 따른 품질관리 담당자 자격기준(의사·치과의사·한의사·약사 또는 관련 학과 학위 + 실무경력 등)을 충족합니다.' },
  { id: 'independence', label: '품질업무 외의 다른 업무(생산·영업 등)에 대한 독립성이 확보되어, 품질에 관한 사항에 대해 독자적으로 판단·보고할 수 있습니다.' },
  { id: 'authority', label: '부적합품 처리, 시정·예방조치(CAPA), 문서 승인 등 품질경영시스템 운영에 필요한 권한을 대표이사로부터 위임받았습니다.' },
  { id: 'training', label: 'GMP·ISO 13485 등 관련 법령 및 품질경영시스템에 대한 교육을 이수하였거나 이수할 예정입니다.' },
]

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

  // ── 회사문서함 항목별 "해당 없음" 처리 ──
  // 9개 고정 항목 중 회사 업태(제조업/수입업 등)에 따라 해당하지 않는 문서가 있을 수 있어,
  // 등록하지 않아도 완료로 집계되도록 사용자가 직접 표시할 수 있게 한다.
  toggleNA(category) {
    const s = load()
    const set = new Set(s.naCategories || [])
    if (set.has(category)) set.delete(category)
    else set.add(category)
    s.naCategories = [...set]
    save(s)
    return s
  },
  isNA(category) {
    return (load().naCategories || []).includes(category)
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
    const cur = s.qualityManager || { name: '', title: '', appointedDate: '', requirements: [], status: QM_STATUS.DRAFT, approvedBy: '', approvedAt: '' }
    s.qualityManager = { ...cur, ...patch, status: QM_STATUS.DRAFT, approvedBy: '', approvedAt: '' }
    save(s)
    return s
  },
  approveQualityManager(approverName) {
    const s = load()
    if (!s.qualityManager) return s
    const checked = new Set(s.qualityManager.requirements || [])
    const allChecked = QM_REQUIREMENTS.every((r) => checked.has(r.id))
    if (!s.qualityManager.name?.trim()) {
      throw new Error('품질책임자 성명을 입력해야 승인할 수 있습니다.')
    }
    if (!allChecked) {
      throw new Error('품질책임자 자격 요건 4개 항목을 모두 확인·체크해야 승인할 수 있습니다.')
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
