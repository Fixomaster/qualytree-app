// src/lib/menuPermissions.js
// 부서별 메뉴 접근 권한 — 조직도 기반 (per-department per-menu)
// qt_dept_menu_perms: { deptName: { '/route': true/false } }
// qt_user_dept:       { email: 'deptName' }

const DEPT_PERM_KEY = 'qt_dept_menu_perms'
const USER_DEPT_KEY = 'qt_user_dept'
const ONBOARDING_KEY = 'qualytree.onboarding'

export const MENU_MAP = [
  { route: '/sales',         label: '영업 현황',         domain: '수주·고객' },
  { route: '/customer-req',  label: '고객 요구사항 검토', domain: '수주·고객' },
  { route: '/complaints',    label: '고객불만 관리',      domain: '수주·고객' },
  { route: '/purchase',      label: '구매 현황',          domain: '구매·자재' },
  { route: '/supplier',      label: '공급업체 관리',      domain: '구매·자재' },
  { route: '/purchase-info', label: '구매정보·수입검사',  domain: '구매·자재' },
  { route: '/manufacturing',      label: '생산 현황',           domain: '생산·제조' },
  { route: '/process-validation', label: '공정유효성확인',       domain: '생산·제조' },
  { route: '/traceability',       label: '제품추적성관리',       domain: '생산·제조' },
  { route: '/product-id',         label: '제품식별·상태',        domain: '생산·제조' },
  { route: '/customer-property',  label: '고객자산관리',         domain: '생산·제조' },
  { route: '/preservation',       label: '제품보존·취급',        domain: '생산·제조' },
  { route: '/inventory',          label: '재고·출고관리',        domain: '생산·제조' },
  { route: '/cleanliness',        label: '청결·오염 관리',       domain: '생산·제조' },
  { route: '/sterile',            label: '멸균 의료기기',        domain: '생산·제조' },
  { route: '/service',            label: '설치·서비스',          domain: '생산·제조' },
  { route: '/inspection',     label: '공정·최종 검사', domain: '품질·검사' },
  { route: '/quality',        label: 'NCR·부적합',     domain: '품질·검사' },
  { route: '/improvement',    label: 'CAPA·개선',      domain: '품질·검사' },
  { route: '/change-control', label: '변경관리',        domain: '품질·검사' },
  { route: '/audit',          label: '내부감사',        domain: '품질·검사' },
  { route: '/workenv',        label: '작업환경관리',    domain: '품질·검사' },
  { route: '/measurement',    label: '측정·분석·개선',  domain: '품질·검사' },
  { route: '/kpi-dashboard',  label: '품질 KPI',       domain: '품질·검사' },
  { route: '/products',       label: '제품·설계개발',   domain: '설계·개발' },
  { route: '/design-history', label: '설계이력파일(DHF)', domain: '설계·개발' },
  { route: '/qms-overview',     label: 'QMS 개요',  domain: '문서·규정' },
  { route: '/record-master',    label: '기록 대장',  domain: '문서·규정' },
  { route: '/document-control', label: '문서관리',   domain: '문서·규정' },
  { route: '/equipment',      label: '설비 현황',  domain: '설비·교정' },
  { route: '/calibration',    label: '교정관리',   domain: '설비·교정' },
  { route: '/infrastructure', label: '인프라관리', domain: '설비·교정' },
  { route: '/training',           label: '교육훈련',  domain: '교육·인력' },
  { route: '/competency',         label: '역량관리',  domain: '교육·인력' },
  { route: '/org-responsibility', label: '조직·책임', domain: '교육·인력' },
  { route: '/resource-plan',      label: '자원 계획', domain: '교육·인력' },
  { route: '/management-review',     label: '경영검토',         domain: '경영·전략' },
  { route: '/quality-plan',          label: '품질계획',         domain: '경영·전략' },
  { route: '/management-commitment', label: '경영의지·품질방침', domain: '경영·전략' },
]

export const DOMAIN_KEYS = [...new Set(MENU_MAP.map(m => m.domain))]

function loadDeptPerms() {
  try { return JSON.parse(localStorage.getItem(DEPT_PERM_KEY) || '{}') } catch { return {} }
}
function saveDeptPerms(data) {
  try { localStorage.setItem(DEPT_PERM_KEY, JSON.stringify(data)) } catch {}
}

export function loadOnboardingDepts() {
  try {
    const ob = JSON.parse(localStorage.getItem(ONBOARDING_KEY) || '{}')
    return (ob.departments || []).map(d => d.name).filter(Boolean)
  } catch { return [] }
}

export function getUserDept(email) {
  if (!email) return null
  try {
    return JSON.parse(localStorage.getItem(USER_DEPT_KEY) || '{}')[email] || null
  } catch { return null }
}

export function setUserDept(email, dept) {
  if (!email) return
  try {
    const d = JSON.parse(localStorage.getItem(USER_DEPT_KEY) || '{}')
    if (dept) d[email] = dept; else delete d[email]
    localStorage.setItem(USER_DEPT_KEY, JSON.stringify(d))
  } catch {}
}

export function getAllUserDepts() {
  try { return JSON.parse(localStorage.getItem(USER_DEPT_KEY) || '{}') } catch { return {} }
}

export const menuPermissions = {
  MENU_MAP,
  DOMAIN_KEYS,

  getDeptAllowedMenus(deptName) {
    if (!deptName) return MENU_MAP.map(m => m.route)
    const perms = loadDeptPerms()[deptName]
    if (!perms) return MENU_MAP.map(m => m.route)
    return MENU_MAP.map(m => m.route).filter(r => perms[r] !== false)
  },

  setDeptMenus(deptName, routeMap) {
    if (!deptName) return
    const all = loadDeptPerms()
    all[deptName] = routeMap
    saveDeptPerms(all)
  },

  setDeptMenu(deptName, route, visible) {
    if (!deptName) return
    const all = loadDeptPerms()
    if (!all[deptName]) all[deptName] = {}
    all[deptName][route] = visible
    saveDeptPerms(all)
  },

  resetDept(deptName) {
    const all = loadDeptPerms()
    delete all[deptName]
    saveDeptPerms(all)
  },

  getRawDeptPerms(deptName) {
    return loadDeptPerms()[deptName] || null
  },

  // 하위 호환 (MemberAdmin 기존 코드용)
  getForUser(userId) {
    try { return JSON.parse(localStorage.getItem('qt_menu_perms') || '{}')[userId] ?? null } catch { return null }
  },
  getAllowedDomains() { return DOMAIN_KEYS },
  toggle() {},
  reset() {},
}
