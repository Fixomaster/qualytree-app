import React, { useState, useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
Home,
IdCard,
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
} from 'lucide-react'
import Logo from './Logo'
import { auth } from '../lib/auth'
import { menuPermissions } from '../lib/menuPermissions'

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
{ to: '/regulatory', label: '인허가' },
],
},
{
label: '설계·개발', icon: Code2,
items: [
{ to: '/products', label: '제품·설계개발' },
],
},
{
label: '문서·규정', icon: FileText,
items: [
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

export default function Sidebar() {
const loc = useLocation()
const cur = auth.current()
const userId = cur?.memberId || (cur?.email ? 'demo_' + cur.email : null)

const allowed = useMemo(() => menuPermissions.getAllowedDomains(userId), [userId])
const visibleDomains = DOMAINS.filter(d => allowed.includes(d.label))

const [open, setOpen] = useState(() => {
const s = {}
DOMAINS.forEach((d, i) => {
if (d.items.some(item => loc.pathname.startsWith(item.to))) s[i] = true
})
return s
})

const toggle = (i) => setOpen(p => ({ ...p, [i]: !p[i] }))

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
