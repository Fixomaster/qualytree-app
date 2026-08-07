// src/lib/orgDepts.js
// 조직도(OrgResponsibilityHub, /org-responsibility)에 등록된 부서 목록을 여러 화면(내부감사·역량관리 등)에서
// 공용으로 가져다 쓰기 위한 헬퍼. 부서 코드를 화면마다 따로 하드코딩(특히 영문 코드)하지 않도록 통일한다.
//
// #15 — 이전에는 qualytree.org_roles(이 화면 자체에 등록된 역할)에 부서가 하나도 없으면
// 회사 실제 조직도(온보딩 STEP3)와 무관한 고정 10개 부서 목록(DEFAULT_DEPTS)을 그대로 보여줘,
// "기본정보 > 조직도"에서 구성한 부서와 매칭되지 않는 문제가 있었다. 온보딩에서 실제로 등록한
// 부서(qualytree.onboarding.departments)를 최우선으로 사용하도록 변경한다.
const ORG_ROLES_KEY = 'qualytree.org_roles'
const ONBOARDING_KEY = 'qualytree.onboarding'
export const DEFAULT_DEPTS = ['경영진', '품질부', '생산부', '개발부', '영업부', '구매부', '설비부', '문서관리', '인허가', '기타']

function loadOnboardingDeptNames() {
  try {
    const raw = localStorage.getItem(ONBOARDING_KEY)
    if (!raw) return []
    const ob = JSON.parse(raw)
    return [...new Set((ob.departments || []).map((d) => d.name).filter(Boolean))]
  } catch {
    return []
  }
}

export function loadOrgDepts() {
  const onboardingDepts = loadOnboardingDeptNames()
  if (onboardingDepts.length) return onboardingDepts
  try {
    const roles = JSON.parse(localStorage.getItem(ORG_ROLES_KEY) || '[]')
    const depts = [...new Set(roles.map(r => r.dept).filter(Boolean))]
    return depts.length ? depts : DEFAULT_DEPTS
  } catch {
    return DEFAULT_DEPTS
  }
}
