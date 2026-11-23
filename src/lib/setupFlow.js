// src/lib/setupFlow.js
// 처음 인허가를 준비하는 고객을 위한 "순서 안내" — 제조사 KGMP / 수입사 GMP 트랙별 단계 정의와
// 실제 저장된 데이터를 읽어 자동으로 완료 여부를 판정한다(수동 체크 불필요).
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

const VISITED_KEY = 'qualytree.setup_visited'

// keys: 하나라도 의미 있는 데이터가 있으면 '완료'로 본다.
export const KGMP_STEPS = [
  { to: '/company',             title: '기본정보',             desc: '회사명·대표자·제조소 주소 등 모든 문서에 자동 반영되는 기본 정보를 입력합니다.', keys: ['qualytree.company_master'] },
  { to: '/org-responsibility',  title: '조직·책임',            desc: '품질책임자(QMR)와 부서별 책임·권한을 지정합니다.', keys: ['qualytree.org_roles'] },
  { to: '/management-commitment', title: '품질방침·목표',      desc: '경영진의 품질방침과 연간 품질목표를 수립합니다.', keys: ['qualytree.quality_policy'] },
  { to: '/products',            title: '제품·설계개발',        desc: '허가 대상 제품(모델)과 공정 정보를 등록합니다.', keys: ['qualytree.productModels', 'qualytree.customBlocks'] },
  { to: '/quality-manual',      title: '품질매뉴얼',           desc: 'QMS 전체를 설명하는 품질매뉴얼을 작성합니다. AI 초안을 활용하세요.', keys: ['qualytree.quality_manual'] },
  { to: '/quality-procedure',   title: '품질절차서',           desc: '문서·기록관리 등 절차서를 항목별로 작성합니다.', keys: [], custom: 'qp' },
  { to: '/sop',                 title: 'SOP',                  desc: '현장에서 쓰는 표준작업절차서를 작성합니다.', keys: ['qualytree.sop'] },
  { to: '/risk',                title: '제품 위험관리',        desc: 'ISO 14971에 따라 제품 위험을 식별·평가합니다.', keys: ['qualytree.risks'] },
  { to: '/supplier',            title: '공급업체 관리',        desc: '주요 공급업체를 등록하고 평가합니다.', keys: ['qualytree.suppliers'], recurring: '신규 업체·연 1회 평가' },
  { to: '/training',            title: '교육훈련',             desc: '교육 계획을 세우고 실시 기록을 남깁니다.', keys: ['qualytree.training'], recurring: '교육 실시 때마다' },
  { to: '/audit',               title: '내부감사',             desc: '연간 내부감사 계획·결과·시정조치를 기록합니다.', keys: ['qualytree.audits', 'qualytree.internalAudits'], recurring: '연 1회 이상' },
  { to: '/gmp-self-inspection', title: 'GMP 자가점검',         desc: '심사 전 GMP 기준 자가점검으로 부족한 부분을 확인합니다.', keys: ['qualytree.gmp_self_inspection_v3'] },
]

// 수입사 GMP 전용 단계(제조사 트랙과 겹치는 기본정보·조직·공급업체·교육·감사는 공통 사용)
export const IMPORT_ONLY_STEPS = [
  { to: '/foreign-manufacturers', title: '외국제조소 GMP',    desc: '수입 대상 외국 제조소와 GMP 증빙을 등록합니다.', keys: ['qualytree.foreignManufacturers'] },
  { to: '/import-products',       title: '품목 허가 현황',    desc: '수입 품목의 허가·신고 현황을 등록합니다.', keys: ['qualytree.import_products'] },
  { to: '/import-management-standard', title: '수입관리기준서', desc: '수입관리기준서를 작성합니다.', keys: ['qualytree.import_management_standard'] },
  { to: '/import-clearance',      title: '수입 통관 기록',    desc: '입고·통관 기록을 지속적으로 남깁니다.', keys: ['qualytree.import_clearance'], recurring: '수입할 때마다' },
  { to: '/gmp-application',       title: 'GMP 적합인정 신청', desc: '준비된 자료로 GMP 적합인정 신청서류를 만듭니다.', keys: ['qualytree.gmp_applications', 'qualytree.gmpApplicationHistory'] },
]
const IMPORT_COMMON = ['/company', '/org-responsibility', '/supplier', '/training', '/audit']

function readObMeta() {
  try { const ob = JSON.parse(localStorage.getItem('qualytree.onboarding') || '{}'); return { kgmp: ob.certs?.kgmp === true, imp: ob.certs?.kgmp_importer === true } } catch { return { kgmp: false, imp: false } }
}

export function getFlowSteps() {
  const { kgmp, imp } = readObMeta()
  if (kgmp && imp) return [...KGMP_STEPS, ...IMPORT_ONLY_STEPS]
  if (kgmp) return KGMP_STEPS
  if (imp) {
    const common = KGMP_STEPS.filter(s => IMPORT_COMMON.includes(s.to))
    const byTo = Object.fromEntries(common.map(s => [s.to, s]))
    // 순서: 기본정보 → 조직 → 외국제조소 → 품목 → 관리기준서 → 공급업체 → 교육 → 통관 → 감사 → 신청
    return [byTo['/company'], byTo['/org-responsibility'], IMPORT_ONLY_STEPS[0], IMPORT_ONLY_STEPS[1], IMPORT_ONLY_STEPS[2], byTo['/supplier'], byTo['/training'], IMPORT_ONLY_STEPS[3], byTo['/audit'], IMPORT_ONLY_STEPS[4]]
  }
  return []
}

function meaningful(v) {
  if (v == null) return false
  if (typeof v === 'string') return v.replace(/<[^>]*>/g, '').trim().length > 0
  if (typeof v === 'number') return true
  if (typeof v === 'boolean') return false
  if (Array.isArray(v)) return v.some(meaningful)
  if (typeof v === 'object') return Object.values(v).some(meaningful)
  return false
}
function hasData(key) {
  try { const raw = localStorage.getItem(key); if (!raw) return false; return meaningful(JSON.parse(raw)) } catch { return false }
}
function qpFilled() {
  try {
    const l = JSON.parse(localStorage.getItem('qualytree.quality_procedures') || '[]')
    return (Array.isArray(l) ? l : []).some(p => (p.items || []).some(i => meaningful(i.content) || /<img|<table/i.test(i.content || '')))
  } catch { return false }
}
function isDone(step) {
  if (step.custom === 'qp') return qpFilled()
  return step.keys.some(hasData)
}
function loadVisited() { try { return JSON.parse(localStorage.getItem(VISITED_KEY) || '{}') } catch { return {} } }

// status: 'done' | 'doing'(방문했으나 미완료) | 'todo'; current: 지금 해야 할 첫 미완료 단계 index
export function computeFlow() {
  const steps = getFlowSteps()
  const visited = loadVisited()
  const list = steps.map((s, i) => ({ ...s, no: i + 1, done: isDone(s) }))
  const currentIdx = list.findIndex(s => !s.done)
  return list.map((s, i) => ({ ...s, status: s.done ? 'done' : (visited[s.to] ? 'doing' : 'todo'), current: i === currentIdx }))
}

export function useSetupFlow() {
  const loc = useLocation()
  const [flow, setFlow] = useState(() => computeFlow())
  useEffect(() => {
    // 방문 기록 (방문했지만 미완료 = 진행 중)
    try {
      const steps = getFlowSteps()
      const hit = steps.find(s => loc.pathname === s.to || loc.pathname.startsWith(s.to + '/'))
      if (hit) {
        const v = loadVisited()
        if (!v[hit.to]) { v[hit.to] = 1; localStorage.setItem(VISITED_KEY, JSON.stringify(v)) }
      }
    } catch { /* ignore */ }
    setFlow(computeFlow())
    const t = setInterval(() => setFlow(computeFlow()), 4000)
    return () => clearInterval(t)
  }, [loc.pathname])
  return flow
}

export const STATUS_COLOR = { done: '#2f8f4e', doing: '#e08a1e', todo: '#b8b6ae' }
