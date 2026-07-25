// src/lib/deptAuth.js
// 부서 선택 헬퍼 — auth.js를 수정하지 않고 부서 정보를 localStorage에서 관리

const AUTH_KEY = 'qualytree.auth'
const DEPT_KEY = 'qualytree.dept'

export const DEPT_LIST = [
  { code: 'SAL', label: '영업부',   icon: '📊', color: '#3B82F6', desc: '수주 · 고객관리 · 계약 · 설치·AS' },
  { code: 'MFG', label: '생산부',   icon: '🏭', color: '#F59E0B', desc: '작업지시 · 공정관리 · 전자배치기록(EBR)' },
  { code: 'PUR', label: '구매부',   icon: '🛒', color: '#8B5CF6', desc: '발주 · 납품 · 공급업체 관리 · 고객지급품' },
  { code: 'QUA', label: '품질부',   icon: '🔍', color: '#10B981', desc: 'NCR · CAPA · 수입검사 · 격리 관리' },
  { code: 'EQP', label: '설비부',   icon: '⚙️', color: '#6366F1', desc: '설비 · 교정 · 예방보전 · 생산설비관리' },
  { code: 'DEV', label: '개발부',   icon: '🔬', color: '#EC4899', desc: '설계 · 개발 · 설계검증 · 공정밸리데이션' },
  { code: 'DOC', label: '문서관리', icon: '📄', color: '#14B8A6', desc: '품질문서 · 기록 관리 · 문서대장' },
  { code: 'MR',  label: '경영검토', icon: '👔', color: '#F97316', desc: '경영검토 · 자원관리 · 품질방침 · 공지' },
  { code: 'TRN', label: '교육훈련', icon: '📚', color: '#06B6D4', desc: '직원 교육 · 역량 관리 · 교육 기록' },
  { code: 'RA',  label: '인허가',   icon: '📋', color: '#84CC16', desc: '식약처 등록 · 변경허가 · 규제당국보고' },
  { code: 'AUD', label: '내부감사', icon: '🔎', color: '#EF4444', desc: '내부감사 계획 · 실시 · 시정조치 추적' },
  { code: 'IMP', label: '개선활동', icon: '📈', color: '#22D3EE', desc: '개선 과제 · KPI 추적 · 경영진 보고' },
  { code: 'ALL', label: '전체 보기', icon: '🏢', color: '#6B7280', desc: '관리자 모드: 전체 메뉴 표시' },
]

export const deptAuth = {
  /** 현재 선택된 부서 코드 반환 (null이면 미선택) */
  getDepartment() {
    try {
      const raw = localStorage.getItem(AUTH_KEY)
      const s = raw ? JSON.parse(raw) : null
      if (s?.department) return s.department
    } catch {}
    return localStorage.getItem(DEPT_KEY) || null
  },

  /** 부서 선택 저장 */
  setDepartment(dept) {
    localStorage.setItem(DEPT_KEY, dept)
    // auth 세션에도 반영 (optional)
    try {
      const raw = localStorage.getItem(AUTH_KEY)
      const s = raw ? JSON.parse(raw) : null
      if (s) {
        s.department = dept
        localStorage.setItem(AUTH_KEY, JSON.stringify(s))
      }
    } catch {}
    // Sidebar 등에서 listen할 수 있도록 이벤트 발행
    try {
      window.dispatchEvent(new CustomEvent('qt-dept-changed', { detail: dept }))
    } catch {}
  },

  /** 부서 선택 초기화 */
  clearDepartment() {
    localStorage.removeItem(DEPT_KEY)
    try {
      const raw = localStorage.getItem(AUTH_KEY)
      const s = raw ? JSON.parse(raw) : null
      if (s) {
        delete s.department
        localStorage.setItem(AUTH_KEY, JSON.stringify(s))
      }
    } catch {}
    try {
      window.dispatchEvent(new CustomEvent('qt-dept-changed', { detail: null }))
    } catch {}
  },

  /** 부서 정보 객체 반환 */
  getDeptInfo(code) {
    return DEPT_LIST.find(d => d.code === code) || null
  },

  /** 해당 부서가 볼 수 있는 허브 경로 목록 */
  getNavForDept(code) {
    return DEPT_NAV[code] || DEPT_NAV['ALL']
  },
}

// 부서별 사이드바 메뉴 정의
const HOME = { to: '/home', label: '홈 대시보드', badge: 'HOME' }
const FLOW = { to: '/flow', label: '업무 흐름도', badge: 'FLOW' }

export const DEPT_NAV = {
  SAL: [
    HOME,
    { to: '/sales',          label: '영업 허브',    badge: 'SAL' },
    { to: '/customer-req',   label: '고객 요구사항', badge: 'SAL' },
    { to: '/complaints',     label: '고객불만',      badge: 'SAL' },
    { to: '/service',        label: '설치·서비스',   badge: 'SAL' },
    { to: '/traceability',   label: '제품 추적성',  badge: 'SAL' },
    { to: '/quality',        label: 'NCR / CAPA',  badge: 'QUA' },
    { to: '/documents',      label: '품질 문서',    badge: 'DOC' },
  ],
  MFG: [
    HOME,
    { to: '/manufacturing',  label: '생산 허브',       badge: 'MFG' },
    { to: '/operations',     label: '작업지시',        badge: 'OPS' },
    { to: '/inspection',      label: '공정·검사',       badge: 'MFG' },
    { to: '/work-env',        label: '작업환경 관리',   badge: 'MFG' },
    { to: '/infrastructure',  label: '인프라 관리',     badge: 'MFG' },
    { to: '/preservation',    label: '제품 보존·취급',  badge: 'MFG' },
    { to: '/product-id',         label: '제품 식별·상태',  badge: 'MFG' },
    { to: '/production-control', label: '생산 제어 계획',  badge: 'MFG' },
    { to: '/traceability',   label: '제품 추적성',     badge: 'MFG' },
    { to: '/quality',        label: 'NCR / CAPA',     badge: 'QUA' },
    { to: '/documents',      label: '품질 문서',       badge: 'DOC' },
  ],
  PUR: [
    HOME,
    { to: '/purchase',   label: '구매 허브',      badge: 'PUR' },
    { to: '/suppliers',              label: '공급업체 관리',    badge: 'PUR' },
    { to: '/purchase-verification',  label: '구매 정보·수입검사', badge: 'PUR' },
    { to: '/quality',                label: '수입검사 · IQC',   badge: 'QUA' },
    { to: '/documents',  label: '품질 문서',      badge: 'DOC' },
  ],
  QUA: [
    HOME,
    { to: '/quality',            label: '품질 허브',         badge: 'QUA' },
    { to: '/quality-dashboard',  label: '품질 KPI 대시보드', badge: 'QUA' },
    FLOW,
    { to: '/inspection',         label: '검사 관리',         badge: 'QUA' },
    { to: '/risk',               label: '위험관리 (FMEA)',   badge: 'RA' },
    { to: '/complaints',         label: '고객불만',          badge: 'SAL' },
    { to: '/customer-req',        label: '고객 요구사항',     badge: 'SAL' },
    { to: '/doc-control',           label: '문서 관리 대장',    badge: 'DOC' },
    { to: '/quality-objectives',   label: '품질 목표 관리',    badge: 'QUA' },
    { to: '/quality-plan',           label: '품질 계획 (QP)',      badge: 'QUA' },
    { to: '/product-id',             label: '제품 식별·상태',      badge: 'QUA' },
    { to: '/purchase-verification',  label: '구매 정보·수입검사',  badge: 'PUR' },
    { to: '/production-control',     label: '생산 제어 계획',       badge: 'QUA' },
    { to: '/change-control',     label: '변경 관리',         badge: 'QUA' },
    { to: '/traceability',       label: '제품 추적성',       badge: 'QUA' },
    { to: '/audit',              label: '내부감사',          badge: 'AUD' },
    { to: '/improvement',        label: '개선활동',          badge: 'IMP' },
    { to: '/operations',         label: '작업지시',          badge: 'OPS' },
    { to: '/documents',          label: '품질 문서',         badge: 'DOC' },
  ],
  EQP: [
    HOME,
    { to: '/equipment',    label: '설비 허브',      badge: 'EQP' },
    { to: '/calibration',    label: '교정 관리',       badge: 'EQP' },
    { to: '/infrastructure', label: '인프라 관리',     badge: 'EQP' },
    { to: '/validation',     label: '공정 밸리데이션', badge: 'EQP' },
    { to: '/operations',   label: '작업지시',       badge: 'OPS' },
    { to: '/quality',      label: 'NCR / CAPA',    badge: 'QUA' },
    { to: '/documents',    label: '품질 문서',      badge: 'DOC' },
  ],
  DEV: [
    HOME,
    { to: '/development',    label: '개발 허브',            badge: 'DEV' },
    { to: '/dhf',            label: '설계 이력 파일 (DHF)', badge: 'DEV' },
    { to: '/device-file',    label: '의료기기 파일 (DMR)',  badge: 'DEV' },
    { to: '/customer-req',   label: '고객 요구사항',        badge: 'SAL' },
    { to: '/quality-plan',       label: '품질 계획 (QP)',  badge: 'DEV' },
    { to: '/production-control', label: '생산 제어 계획', badge: 'DEV' },
    { to: '/risk',           label: '위험관리 (FMEA)', badge: 'RA' },
    { to: '/validation',     label: '공정 밸리데이션', badge: 'DEV' },
    { to: '/change-control', label: '변경 관리',       badge: 'DEV' },
    { to: '/products',       label: '제품 · 공정',     badge: 'PRD' },
    { to: '/regulatory',     label: '인허가',          badge: 'RA' },
    { to: '/documents',      label: '품질 문서',       badge: 'DOC' },
  ],
  DOC: [
    HOME,
    { to: '/documents',       label: '문서 허브',     badge: 'DOC' },
    { to: '/doc-control',     label: '문서 관리 대장', badge: 'DOC' },
    { to: '/quality-manual',  label: '품질 매뉴얼',    badge: 'DOC' },
    { to: '/quality',      label: '품질 기록',     badge: 'QUA' },
    { to: '/export',       label: '기록 내보내기', badge: 'DOC' },
  ],
  MR: [
    HOME,
    { to: '/dashboard',           label: '경영 현황',         badge: 'MR' },
    FLOW,
    { to: '/management-review',   label: '경영검토',          badge: 'MR' },
    { to: '/quality-dashboard',   label: '품질 KPI 대시보드', badge: 'QUA' },
    { to: '/doc-control',          label: '문서 관리 대장',    badge: 'DOC' },
    { to: '/quality-objectives',  label: '품질 목표 관리',    badge: 'MR' },
    { to: '/quality-plan',        label: '품질 계획 (QP)',    badge: 'MR' },
    { to: '/org-responsibility',  label: '조직·책임 관리',    badge: 'MR' },
    { to: '/quality-policy',      label: '경영 의지·품질 방침', badge: 'MR' },
    { to: '/quality-manual',      label: '품질 매뉴얼',       badge: 'MR' },
    { to: '/infrastructure',      label: '인프라 관리',       badge: 'MR' },
    { to: '/competency',          label: '역량 관리',         badge: 'MR' },
    { to: '/quality',             label: '품질 현황',         badge: 'QUA' },
    { to: '/audit',               label: '내부감사',          badge: 'AUD' },
    { to: '/improvement',         label: '개선활동',          badge: 'IMP' },
  ],
  TRN: [
    HOME,
    { to: '/training',     label: '교육 허브',    badge: 'TRN' },
    { to: '/documents',    label: '교육 문서',    badge: 'DOC' },
  ],
  RA: [
    HOME,
    { to: '/regulatory',   label: '인허가 허브',          badge: 'RA' },
    { to: '/device-file',  label: '의료기기 파일 (DMR)',  badge: 'RA' },
    { to: '/quality',      label: 'NCR / CAPA',          badge: 'QUA' },
    { to: '/documents',    label: '품질 문서',    badge: 'DOC' },
    { to: '/tree',         label: 'Quality Tree', badge: 'TREE' },
  ],
  AUD: [
    HOME,
    { to: '/audit',        label: '감사 허브',    badge: 'AUD' },
    { to: '/quality',      label: '품질 기록',    badge: 'QUA' },
    { to: '/documents',    label: '품질 문서',    badge: 'DOC' },
  ],
  IMP: [
    HOME,
    { to: '/improvement',  label: '개선 허브',    badge: 'IMP' },
    { to: '/quality',      label: 'NCR / CAPA',  badge: 'QUA' },
    { to: '/documents',    label: '품질 문서',    badge: 'DOC' },
  ],
  ALL: [
    HOME,
    FLOW,
    { to: '/dashboard',         label: '대시보드',   badge: 'MR' },
    { to: '/sales',             label: '영업',       badge: 'SAL' },
    { to: '/manufacturing',     label: '생산',       badge: 'MFG' },
    { to: '/purchase',          label: '구매',       badge: 'PUR' },
    { to: '/quality',           label: '품질·NCR',   badge: 'QUA' },
    { to: '/equipment',         label: '설비',       badge: 'EQP' },
    { to: '/development',       label: '개발',       badge: 'DEV' },
    { to: '/operations',        label: '작업지시',   badge: 'OPS' },
    { to: '/documents',         label: '문서',       badge: 'DOC' },
    { to: '/regulatory',        label: '인허가',     badge: 'RA' },
    { to: '/audit',             label: '내부감사',   badge: 'AUD' },
    { to: '/improvement',       label: '개선활동',   badge: 'IMP' },
    { to: '/management-review', label: '경영검토',   badge: 'MR' },
    { to: '/training',          label: '교육',       badge: 'TRN' },
    { to: '/tree',              label: 'Quality Tree', badge: 'TREE' },
    { to: '/risk',              label: '위험관리 (FMEA)', badge: 'RA' },
    { to: '/calibration',       label: '교정 관리',      badge: 'EQP' },
    { to: '/suppliers',         label: '공급업체 관리',  badge: 'PUR' },
    { to: '/complaints',        label: '고객불만',       badge: 'SAL' },
    { to: '/traceability',      label: '제품 추적성',    badge: 'MFG' },
    { to: '/change-control',    label: '변경 관리',      badge: 'QUA' },
    { to: '/inspection',        label: '검사 관리',      badge: 'QUA' },
    { to: '/work-env',          label: '작업환경 관리',  badge: 'MFG' },
    { to: '/validation',         label: '공정 밸리데이션',  badge: 'DEV' },
    { to: '/quality-dashboard',  label: '품질 KPI 대시보드',    badge: 'QUA' },
    { to: '/dhf',                label: '설계 이력 파일 (DHF)', badge: 'DEV' },
    { to: '/competency',         label: '역량 관리',            badge: 'MR' },
    { to: '/service',            label: '설치·서비스',          badge: 'SAL' },
    { to: '/preservation',       label: '제품 보존·취급',       badge: 'MFG' },
    { to: '/quality-plan',       label: '품질 계획 (QP)',       badge: 'QUA' },
    { to: '/customer-req',       label: '고객 요구사항',        badge: 'SAL' },
    { to: '/infrastructure',     label: '인프라 관리',          badge: 'EQP' },
    { to: '/doc-control',          label: '문서 관리 대장',       badge: 'DOC' },
    { to: '/quality-objectives',   label: '품질 목표 관리',       badge: 'MR' },
    { to: '/product-id',           label: '제품 식별·상태',       badge: 'MFG' },
    { to: '/org-responsibility',     label: '조직·책임 관리',       badge: 'MR' },
    { to: '/purchase-verification',  label: '구매 정보·수입검사',   badge: 'PUR' },
    { to: '/quality-manual',         label: '품질 매뉴얼',          badge: 'DOC' },
    { to: '/device-file',            label: '의료기기 파일 (DMR)',  badge: 'DEV' },
    { to: '/production-control',     label: '생산 제어 계획',       badge: 'MFG' },
    { to: '/quality-policy',         label: '경영 의지·품질 방침', badge: 'MR' },
    { to: '/export',                 label: '기록 내보내기',        badge: 'DOC' },
  ],
}
