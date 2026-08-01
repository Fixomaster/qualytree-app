// src/lib/orgDepts.js
// 조직도(OrgResponsibilityHub, /org-responsibility)에 등록된 부서 목록을 여러 화면(내부감사·역량관리 등)에서
// 공용으로 가져다 쓰기 위한 헬퍼. 부서 코드를 화면마다 따로 하드코딩(특히 영문 코드)하지 않도록 통일한다.
const ORG_ROLES_KEY = 'qualytree.org_roles'
export const DEFAULT_DEPTS = ['경영진', '품질부', '생산부', '개발부', '영업부', '구매부', '설비부', '문서관리', '인허가', '기타']

export function loadOrgDepts() {
  try {
    const roles = JSON.parse(localStorage.getItem(ORG_ROLES_KEY) || '[]')
    const depts = [...new Set(roles.map(r => r.dept).filter(Boolean))]
    return depts.length ? depts : DEFAULT_DEPTS
  } catch {
    return DEFAULT_DEPTS
  }
}
