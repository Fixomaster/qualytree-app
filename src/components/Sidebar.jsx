import React, { useState, useMemo, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
Home,
IdCard,
Megaphone,
TrendingUp,
ShoppingCart,
Factory,
ShieldCheck,
Code2,
FileText,
Wrench,
GraduationCap,
BarChart3,
ChevronRight,
Crown,
Settings,
BadgeCheck,
FileCheck2,
Globe,
Building2,
  Share2,
} from 'lucide-react'
import Logo from './Logo'
import { auth } from '../lib/auth'
import { menuPermissions, getUserDept } from '../lib/menuPermissions'
import { deptAuth, DEPT_LIST } from '../lib/deptAuth'

// 온보딩 STEP3(조직도)에서 등록한 부서 이름을 읽어, 뷰 전환 목록(DEPT_LIST)을 회사 실제
// 조직에 맞춰 추려낸다. 매칭되는 게 거의 없으면(예: 온보딩 전) 전체 목록을 그대로 보여준다.
function loadOnboardingDeptNames() {
  try {
    const raw = localStorage.getItem('qualytree.onboarding')
    if (!raw) return []
    const ob = JSON.parse(raw)
    return (ob.departments || []).map((d) => d.name).filter(Boolean)
  } catch { return [] }
}
function relevantDeptOptions() {
  const names = loadOnboardingDeptNames()
  if (!names.length) return DEPT_LIST
  const norm = (s) => (s || '').replace(/[·\s]/g, '')
  const hit = (label) => names.some((n) => {
    const a = norm(n); const b = norm(label)
    return a.includes(b) || b.includes(a) || a.includes(b.slice(0, 2))
  })
  const filtered = DEPT_LIST.filter((d) => d.code === 'ALL' || hit(d.label))
  return filtered.length > 1 ? filtered : DEPT_LIST
}

const DOMAINS = [
{
label: '수주·고객', icon: TrendingUp,
items: [
{ to: '/sales', label: '영업 현황' },
{ to: '/customer-req', label: '고객 요구사항 검토' },
{ to: '/complaints', label: '고객불만 관리' },
],
},
{
label: '구매·자재', icon: ShoppingCart,
items: [
{ to: '/purchase', label: '구매 현황' },
{ to: '/supplier', label: '공급업체 관리' },
{ to: '/purchase-info', label: '구매정보·수입검사' },
],
},
{
label: '생산·제조', icon: Factory,
items: [
{ to: '/manufacturing', label: '생산 현황' },
{ to: '/process-validation', label: '공정유효성확인(실행)' },
{ to: '/traceability', label: '제품추적성관리' },
{ to: '/product-id', label: '제품식별·상태' },
{ to: '/customer-property', label: '고객자산관리' },
{ to: '/preservation', label: '제품보존·취급' },
{ to: '/inventory', label: '재고·출고관리' },
{ to: '/cleanliness', label: '청결·오염 관리' },
{ to: '/sterile', label: '멸균 의료기기' },
{ to: '/service', label: '설치·서비스' },
],
},
{
label: '품질·검사', icon: ShieldCheck,
items: [
{ to: '/inspection', label: '공정·최종 검사' },
{ to: '/quality', label: 'NCR·부적합' },
{ to: '/improvement', label: 'CAPA·개선' },
{ to: '/change-control',label: '변경관리' },
{ to: '/audit', label: '내부감사' },
{ to: '/workenv', label: '작업환경관리' },
{ to: '/measurement', label: '측정·분석·개선' },
{ to: '/kpi-dashboard', label: '품질 KPI' },
],
},
{
label: '설계·개발', icon: Code2,
items: [
{ to: '/products', label: '제품·설계개발' },
{ to: '/design-history', label: '설계이력파일(DHF)' },
],
},
{
label: '문서·규정', icon: FileText,
items: [
{ to: '/qms-overview', label: 'QMS 개요' },
{ to: '/record-master', label: '기록 대장' },
{ to: '/document-control', label: '문서관리' },
],
},
{
label: '설비·교정', icon: Wrench,
items: [
{ to: '/equipment', label: '설비 현황' },
{ to: '/calibration', label: '교정관리' },
{ to: '/infrastructure', label: '인프라관리' },
],
},
{
label: '교육·인력', icon: GraduationCap,
items: [
{ to: '/training', label: '교육훈련' },
{ to: '/competency', label: '역량관리' },
{ to: '/org-responsibility', label: '조직·책임' },
{ to: '/resource-plan', label: '자원 계획' },
],
},
{
label: '경영·전략', icon: BarChart3,
items: [
{ to: '/management-review', label: '경영검토' },
{ to: '/quality-plan', label: '품질계획' },
{ to: '/management-commitment', label: '경영의지·품질방침·목표' },
],
},
]

const IMP_ITEMS = [
{ to: '/foreign-manufacturers', label: '외국제조소 GMP' },
{ to: '/import-products', label: '품목 허가 현황' },
{ to: '/import-clearance', label: '수입 통관 기록' },
{ to: '/import-adverse', label: '이상사례 보고' },
{ to: '/import-management-standard', label: '수입관리기준서' },
]

export default function Sidebar() {
const loc = useLocation()
const cur = auth.current()
const userId = cur?.memberId || (cur?.email ? 'demo_' + cur.email : null)

// #6/#7: 부서 보기 전환 — CEO/매니저가 부서별 메뉴·대시보드를 바꿔볼 수 있도록.
// 옵션은 온보딩 조직도에 등록된 부서 기준으로 추려 "부서명이 너무 많다"는 문제를 줄인다.
const canSwitchDept = (cur?.level ?? 0) >= 2
const [dept, setDeptState] = useState(() => deptAuth.getDepartment() || 'ALL')
useEffect(() => {
const handler = (e) => { if (e.detail) setDeptState(e.detail) }
window.addEventListener('qt-dept-changed', handler)
return () => window.removeEventListener('qt-dept-changed', handler)
}, [])
const deptOptions = useMemo(() => relevantDeptOptions(), [])

const isAdmin = cur?.isCompanyAdmin || (cur?.level ?? 0) >= 3
  const userDept = getUserDept(cur?.email)
  const allowedMenus = useMemo(() => {
    if (isAdmin) return null
    return menuPermissions.getDeptAllowedMenus(userDept)
  }, [isAdmin, userDept])
  const visibleDomains = useMemo(() =>
    DOMAINS
      .map(d => ({ ...d, items: allowedMenus ? d.items.filter(item => allowedMenus.includes(item.to)) : d.items }))
      .filter(d => d.items.length > 0),
    [allowedMenus]
  )

const [open, setOpen] = useState(() => {
const s = {}
DOMAINS.forEach((d, i) => {
if (d.items.some(item => loc.pathname.startsWith(item.to))) s[i] = true
})
return s
})

const toggle = (i) => setOpen(p => ({ ...p, [i]: !p[i] }))

const [mfgOpen, setMfgOpen] = useState(() =>
DOMAINS.some(d => d.items.some(item => loc.pathname.startsWith(item.to)))
)
const mfgActive = visibleDomains.some(d => d.items.some(item => loc.pathname.startsWith(item.to)))

const [impOpen, setImpOpen] = useState(() =>
IMP_ITEMS.some(item => loc.pathname.startsWith(item.to))
)
const impActive = IMP_ITEMS.some(item => loc.pathname.startsWith(item.to))

return (
<aside
className="hidden md:flex flex-col shrink-0 h-screen sticky top-0"
style={{ width: 248, background: 'var(--bg-card)', borderRight: '1px solid var(--line)' }}
>
<div
className="px-5 py-5 flex items-center justify-between"
style={{ borderBottom: '1px solid var(--line)' }}
>
<Logo size={26} />
<span
className="font-mono text-[9.5px] tracking-[0.18em] uppercase"
style={{ color: 'var(--ink-faint)' }}
>
v0.3
</span>
</div>

<nav className="flex-1 px-3 py-3 overflow-y-auto">
<NavLink
to="/home"
className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] mb-1 transition"
style={({ isActive }) => ({
color: isActive ? 'var(--moss)' : 'var(--ink-soft)',
background: isActive ? 'var(--leaf-soft)' : 'transparent',
fontWeight: isActive ? 600 : 400,
})}
>
<Home size={17} strokeWidth={1.7} />
<span>홈 대시보드</span>
</NavLink>

        <NavLink
          to="/flow"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] mb-1 transition"
          style={({ isActive }) => ({
            color: isActive ? 'var(--moss)' : 'var(--ink-soft)',
            background: isActive ? 'var(--leaf-soft)' : 'transparent',
            fontWeight: isActive ? 600 : 400,
          })}
        >
          <Share2 size={17} strokeWidth={1.7} />
          <span>업무 프로세스 흐름도</span>
        </NavLink>

<NavLink
to="/notices"
className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] mb-1 transition"
style={({ isActive }) => ({
color: isActive ? 'var(--moss)' : 'var(--ink-soft)',
background: isActive ? 'var(--leaf-soft)' : 'transparent',
fontWeight: isActive ? 600 : 400,
})}
>
<Megaphone size={17} strokeWidth={1.7} />
<span>공지사항</span>
</NavLink>

{isAdmin && (
<NavLink
to="/admin/permissions"
className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] mb-1 transition"
style={({ isActive }) => ({
color: isActive ? 'var(--moss)' : 'var(--ink-soft)',
background: isActive ? 'var(--leaf-soft)' : 'transparent',
fontWeight: isActive ? 600 : 400,
})}
>
<ShieldCheck size={17} strokeWidth={1.7} />
<span>권한 관리</span>
</NavLink>
)}

<div
className="px-3 my-2 font-mono text-[10px] tracking-[0.2em] uppercase"
style={{ color: 'var(--ink-faint)' }}
>
Workspace
</div>

<NavLink
to="/company"
className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] mb-0.5 transition"
style={({ isActive }) => ({
color: isActive ? 'var(--moss)' : 'var(--ink)',
background: isActive ? 'var(--leaf-soft)' : 'transparent',
fontWeight: isActive ? 600 : 500,
})}
>
<IdCard size={16} strokeWidth={1.7} />
<span>기본정보</span>
</NavLink>

<NavLink
to="/regulatory"
className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] mb-0.5 transition"
style={({ isActive }) => ({
color: isActive ? 'var(--moss)' : 'var(--ink)',
background: isActive ? 'var(--leaf-soft)' : 'transparent',
fontWeight: isActive ? 600 : 500,
})}
>
<BadgeCheck size={16} strokeWidth={1.7} />
<span>인허가</span>
</NavLink>

<NavLink
to="/gmp-application"
className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] mb-0.5 transition"
style={({ isActive }) => ({
color: isActive ? 'var(--moss)' : 'var(--ink)',
background: isActive ? 'var(--leaf-soft)' : 'transparent',
fontWeight: isActive ? 600 : 500,
})}
>
<FileCheck2 size={16} strokeWidth={1.7} />
<span>GMP 신청</span>
</NavLink>

<div className="mb-0.5">
<button
onClick={() => setImpOpen(o => !o)}
className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition"
style={{
color: impActive ? 'var(--moss)' : 'var(--ink)',
background: impOpen ? 'var(--bg-soft)' : impActive ? 'var(--leaf-soft)' : 'transparent',
fontWeight: 500,
textAlign: 'left',
border: 'none',
cursor: 'pointer',
width: '100%',
}}
>
<Globe size={16} strokeWidth={1.7} style={{ flexShrink: 0 }} />
<span className="flex-1 text-left">수입 GMP</span>
<ChevronRight
size={13}
strokeWidth={2}
style={{
transform: impOpen ? 'rotate(90deg)' : 'rotate(0deg)',
transition: 'transform 0.15s',
color: 'var(--ink-faint)',
flexShrink: 0,
}}
/>
</button>

{impOpen && (
<div className="ml-5 mt-0.5 mb-1">
{IMP_ITEMS.map(item => (
<NavLink
key={item.to}
to={item.to}
className="flex items-center px-3 py-1.5 rounded-lg text-[12.5px] mb-0.5 transition"
style={({ isActive }) => ({
color: isActive ? 'var(--moss)' : 'var(--ink-soft)',
background: isActive ? 'var(--leaf-soft)' : 'transparent',
fontWeight: isActive ? 600 : 400,
})}
>
{item.label}
</NavLink>
))}
</div>
)}
</div>

<div className="mb-0.5">
<button
onClick={() => setMfgOpen(o => !o)}
className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition"
style={{
color: mfgActive ? 'var(--moss)' : 'var(--ink)',
background: mfgOpen ? 'var(--bg-soft)' : mfgActive ? 'var(--leaf-soft)' : 'transparent',
fontWeight: 500,
textAlign: 'left',
border: 'none',
cursor: 'pointer',
width: '100%',
}}
>
<Building2 size={16} strokeWidth={1.7} style={{ flexShrink: 0 }} />
<span className="flex-1 text-left">제조 GMP</span>
<ChevronRight
size={13}
strokeWidth={2}
style={{
transform: mfgOpen ? 'rotate(90deg)' : 'rotate(0deg)',
transition: 'transform 0.15s',
color: 'var(--ink-faint)',
flexShrink: 0,
}}
/>
</button>

{mfgOpen && (
<div className="ml-3 mt-0.5 mb-1">
{visibleDomains.map((domain) => {
const i = DOMAINS.indexOf(domain)
const isActive = domain.items.some(item => loc.pathname.startsWith(item.to))
const isOpen = open[i]
return (
<div key={i} className="mb-0.5">
<button
onClick={() => toggle(i)}
className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition"
style={{
color: isActive ? 'var(--moss)' : 'var(--ink)',
background: isOpen ? 'var(--bg-soft)' : isActive ? 'var(--leaf-soft)' : 'transparent',
fontWeight: 500,
textAlign: 'left',
border: 'none',
cursor: 'pointer',
width: '100%',
}}
>
<domain.icon size={16} strokeWidth={1.7} style={{ flexShrink: 0 }} />
<span className="flex-1 text-left">{domain.label}</span>
<ChevronRight
size={13}
strokeWidth={2}
style={{
transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
transition: 'transform 0.15s',
color: 'var(--ink-faint)',
flexShrink: 0,
}}
/>
</button>

{isOpen && (
<div className="ml-5 mt-0.5 mb-1">
{domain.items.map(item => (
<NavLink
key={item.to}
to={item.to}
className="flex items-center px-3 py-1.5 rounded-lg text-[12.5px] mb-0.5 transition"
style={({ isActive }) => ({
color: isActive ? 'var(--moss)' : 'var(--ink-soft)',
background: isActive ? 'var(--leaf-soft)' : 'transparent',
fontWeight: isActive ? 600 : 400,
})}
>
{item.label}
</NavLink>
))}
</div>
)}
</div>
)
})}
</div>
)}
</div>

{auth.identityKind() === 'operator' && (
<>
<div
className="px-3 mt-4 mb-2 font-mono text-[10px] tracking-[0.2em] uppercase"
style={{ color: 'var(--ink-faint)' }}
>
Operator
</div>
<NavLink
to="/operator"
className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] mb-0.5 transition"
style={({ isActive }) => ({
color: isActive ? 'var(--moss)' : 'var(--ink-soft)',
background: isActive ? 'var(--leaf-soft)' : 'transparent',
})}
>
<Crown size={16} strokeWidth={1.7} />
<span>운영자 콘솔</span>
</NavLink>
<NavLink
to="/operator/plans"
className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] mb-0.5 transition"
style={({ isActive }) => ({
color: isActive ? 'var(--moss)' : 'var(--ink-soft)',
background: isActive ? 'var(--leaf-soft)' : 'transparent',
})}
>
<Crown size={16} strokeWidth={1.7} />
<span>플랜·요금 관리</span>
</NavLink>
</>
)}

{canSwitchDept && (
<div className="px-3 mt-4 mb-2">
<div className="font-mono text-[10px] tracking-[0.2em] uppercase mb-1.5" style={{ color: 'var(--ink-faint)' }}>
부서 보기 전환
</div>
<select
value={dept}
onChange={(e) => deptAuth.setDepartment(e.target.value)}
className="w-full px-2.5 py-1.5 rounded-lg text-[12px]"
style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)' }}
>
{deptOptions.map((d) => (
<option key={d.code} value={d.code}>{d.icon} {d.label}</option>
))}
</select>
</div>
)}
<div
className="px-3 mt-4 mb-2 font-mono text-[10px] tracking-[0.2em] uppercase"
style={{ color: 'var(--ink-faint)' }}
>
System
</div>
<div
className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] mb-0.5"
style={{ color: 'var(--ink-faint)', cursor: 'not-allowed' }}
>
<Settings size={16} strokeWidth={1.7} />
<span className="flex-1">관리자 설정</span>
<span className="font-mono text-[9px]" style={{ color: 'var(--ink-faint)' }}>SOON</span>
</div>
</nav>

<div className="p-3 border-t" style={{ borderColor: 'var(--line)' }}>
<NavLink
to="/onboarding"
className="block p-3 rounded-xl transition"
style={({ isActive }) => ({
background: loc.pathname.startsWith('/onboarding') ? 'var(--moss)' : 'var(--leaf-soft)',
color: loc.pathname.startsWith('/onboarding') ? 'var(--bg)' : 'var(--moss)',
})}
>
<div className="font-mono text-[9.5px] tracking-[0.18em] uppercase opacity-80">
START HERE
</div>
<div className="mt-1 text-[13.5px] font-medium leading-tight">온보딩 진행</div>
<div className="text-[12px] mt-0.5 opacity-80">5분이면 시작됩니다</div>
</NavLink>
</div>
</aside>
)
}
