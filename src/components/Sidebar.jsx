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
  Users,
  Printer,
} from 'lucide-react'
import Logo from './Logo'
import { auth } from '../lib/auth'
import { menuPermissions } from '../lib/menuPermissions'
import { deptAuth, DEPT_LIST } from '../lib/deptAuth'
import GlobalSearch from './GlobalSearch'

// ì¨ë³´ë© STEP3(ì¡°ì§ë)ìì ë±ë¡í ë¶ì ì´ë¦ì ì½ì´, ë·° ì í ëª©ë¡(DEPT_LIST)ì íì¬ ì¤ì 
// ì¡°ì§ì ë§ì¶° ì¶ë ¤ë¸ë¤. ë§¤ì¹­ëë ê² ê±°ì ìì¼ë©´(ì: ì¨ë³´ë© ì ) ì ì²´ ëª©ë¡ì ê·¸ëë¡ ë³´ì¬ì¤ë¤.
function loadOnboardingDeptNames() {
  try {
    const raw = localStorage.getItem('qualytree.onboarding')
    if (!raw) return []
    const ob = JSON.parse(raw)
    return (ob.departments || []).map((d) => d.name).filter(Boolean)
  } catch { return [] }
}
function loadLeafDeptNames() {
  try {
    const raw = localStorage.getItem('qualytree.onboarding')
    if (!raw) return []
    const ob = JSON.parse(raw)
    const depts = ob.departments || []
    const childIds = new Set(depts.map(d => d.parentId).filter(Boolean))
    return depts.filter(d => !childIds.has(d.id) || !d.parentId).map(d => d.name).filter(Boolean)
  } catch { return [] }
}
function relevantDeptOptions() {
  try {
    const raw = localStorage.getItem('qualytree.onboarding')
    if (!raw) return DEPT_LIST
    const ob = JSON.parse(raw)
    const depts = ob.departments || []
    if (!depts.length) return DEPT_LIST
    const childIds = new Set(depts.map(d => d.parentId).filter(Boolean))
    const leafDepts = depts.filter(d => !childIds.has(d.id) || !d.parentId)
    if (!leafDepts.length) return DEPT_LIST
    return leafDepts.map(d => ({ code: d.id, icon: 'ð¢', label: d.name }))
  } catch { return DEPT_LIST }
}

const DOMAINS = [
{
label: 'ìì£¼Â·ê³ ê°', icon: TrendingUp,
items: [
{ to: '/sales', label: 'ìì íí©' },
{ to: '/customer-req', label: 'ê³ ê° ìêµ¬ì¬í­ ê²í ' },
{ to: '/complaints', label: 'ê³ ê°ë¶ë§ ê´ë¦¬' },
],
},
{
label: 'êµ¬ë§¤Â·ìì¬', icon: ShoppingCart,
items: [
{ to: '/purchase', label: 'êµ¬ë§¤ íí©' },
{ to: '/supplier', label: 'ê³µê¸ìì²´ ê´ë¦¬' },
{ to: '/purchase-info', label: 'êµ¬ë§¤ì ë³´Â·ììê²ì¬' },
],
},
{
label: 'ìì°Â·ì ì¡°', icon: Factory,
items: [
{ to: '/manufacturing', label: 'ìì° íí©' },
{ to: '/process-validation', label: 'ê³µì ì í¨ì±íì¸(ì¤í)' },
{ to: '/traceability', label: 'ì íì¶ì ì±ê´ë¦¬' },
{ to: '/product-id', label: 'ì íìë³Â·ìí' },
{ to: '/customer-property', label: 'ê³ ê°ìì°ê´ë¦¬' },
{ to: '/preservation', label: 'ì íë³´ì¡´Â·ì·¨ê¸' },
{ to: '/inventory', label: 'ì¬ê³ Â·ì¶ê³ ê´ë¦¬' },
{ to: '/cleanliness', label: 'ì²­ê²°Â·ì¤ì¼ ê´ë¦¬' },
{ to: '/sterile', label: 'ë©¸ê·  ìë£ê¸°ê¸°' },
{ to: '/service', label: 'ì¤ì¹Â·ìë¹ì¤' },
],
},
{
label: 'íì§Â·ê²ì¬', icon: ShieldCheck,
items: [
{ to: '/inspection', label: 'ê³µì Â·ìµì¢ ê²ì¬' },
{ to: '/quality', label: 'NCRÂ·ë¶ì í©' },
{ to: '/containment', label: 'ê²©ë¦¬ê´ë¦¬' },
{ to: '/improvement', label: 'CAPAÂ·ê°ì ' },
{ to: '/change-control',label: 'ë³ê²½ê´ë¦¬' },
{ to: '/audit', label: 'ë´ë¶ê°ì¬' },
{ to: '/workenv', label: 'ììíê²½ê´ë¦¬' },
{ to: '/measurement', label: 'ì¸¡ì Â·ë¶ìÂ·ê°ì ' },
{ to: '/kpi-dashboard', label: 'íì§ KPI' },
    { to: '/post-market-safety', label: 'ìííìì ê´ë¦¬' },
    { to: '/csv', label: 'CSV ì í¨ì±íì¸' },
    { to: '/stability', label: 'ìì ì± ìí ê´ë¦¬' },
],
},
{
label: 'ì¤ê³Â·ê°ë°', icon: Code2,
items: [
{ to: '/products', label: 'ì íÂ·ì¤ê³ê°ë°' },
{ to: '/design-history', label: 'ì¤ê³ì´ë ¥íì¼(DHF)' },
],
},
{
label: 'ë¬¸ìÂ·ê·ì ', icon: FileText,
items: [
{ to: '/qms-overview', label: 'QMS ê°ì' },
{ to: '/record-master', label: 'ê¸°ë¡ ëì¥' },
{ to: '/document-control', label: 'ë¬¸ìê´ë¦¬' },
],
},
{
label: 'ì¤ë¹Â·êµì ', icon: Wrench,
items: [
{ to: '/equipment', label: 'ì¤ë¹ íí©' },
{ to: '/calibration', label: 'êµì ê´ë¦¬' },
{ to: '/infrastructure', label: 'ì¸íë¼ê´ë¦¬' },
],
},
{
label: 'êµì¡Â·ì¸ë ¥', icon: GraduationCap,
items: [
{ to: '/training', label: 'êµì¡íë ¨' },
{ to: '/competency', label: 'ì­ëê´ë¦¬' },
{ to: '/org-responsibility', label: 'ì¡°ì§Â·ì±ì' },
{ to: '/resource-plan', label: 'ìì ê³í' },
],
},
{
label: 'ê²½ìÂ·ì ëµ', icon: BarChart3,
items: [
{ to: '/management-review', label: 'ê²½ìê²í ' },
{ to: '/quality-plan', label: 'íì§ê³í' },
{ to: '/management-commitment', label: 'ê²½ììì§Â·íì§ë°©ì¹¨Â·ëª©í' },
],
},
]

const IMP_ITEMS = [
{ to: '/foreign-manufacturers', label: 'ì¸êµ­ì ì¡°ì GMP' },
{ to: '/import-products', label: 'íëª© íê° íí©' },
{ to: '/import-clearance', label: 'ìì íµê´ ê¸°ë¡' },
{ to: '/import-management-standard', label: 'ììê´ë¦¬ê¸°ì¤ì' },
{ to: '/csv', label: 'CSV ì í¨ì±íì¸' },
{ to: '/stability', label: 'ìì ì± ìí ê´ë¦¬' },
{ to: '/post-market-safety', label: 'ìííìì ê´ë¦¬' },
]

export default function Sidebar() {
const loc = useLocation()
const cur = auth.current()
const userId = cur?.memberId || (cur?.email ? 'demo_' + cur.email : null)

// #6/#7: ë¶ì ë³´ê¸° ì í â CEO/ë§¤ëì ê° ë¶ìë³ ë©ë´Â·ëìë³´ëë¥¼ ë°ê¿ë³¼ ì ìëë¡.
// ìµìì ì¨ë³´ë© ì¡°ì§ëì ë±ë¡ë ë¶ì ê¸°ì¤ì¼ë¡ ì¶ë ¤ "ë¶ìëªì´ ëë¬´ ë§ë¤"ë ë¬¸ì ë¥¼ ì¤ì¸ë¤.
const canSwitchDept = (cur?.level ?? 0) >= 2
const [dept, setDeptState] = useState(() => deptAuth.getDepartment() || 'ALL')
useEffect(() => {
const handler = (e) => { if (e.detail) setDeptState(e.detail) }
window.addEventListener('qt-dept-changed', handler)
return () => window.removeEventListener('qt-dept-changed', handler)
}, [])
const deptOptions = useMemo(() => relevantDeptOptions(), [])

const isAdmin = cur?.isCompanyAdmin || (cur?.level ?? 0) >= 3
  const userDept = dept
  const ob = useMemo(() => { try { return JSON.parse(localStorage.getItem('qualytree.onboarding') || '{}') } catch { return {} } }, [])
  const hasKGMP = ob.certs?.kgmp === true
  const hasImport = ob.certs?.kgmp_importer === true
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
      <GlobalSearch />
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
<span>í ëìë³´ë</span>
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
          <span>ìë¬´ íë¡ì¸ì¤ íë¦ë</span>
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
<span>ê³µì§ì¬í­</span>
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
<Users size={17} strokeWidth={1.7} />
<span>ê³ì  ê´ë¦¬</span>
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
<span>ê¸°ë³¸ì ë³´</span>
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
<span>ì¸íê°</span>
</NavLink>

{hasImport && (
<>
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
<span>GMP ì ì²­</span>
</NavLink>


<NavLink
to="/gmp-self-inspection"
className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] mb-0.5 transition"
style={({ isActive }) => ({
color: isActive ? 'var(--moss)' : 'var(--ink)',
background: isActive ? 'var(--leaf-soft)' : 'transparent',
fontWeight: isActive ? 600 : 500,
})}
>
<ShieldCheck size={16} strokeWidth={1.7} />
<span>GMP ìê°ì ê²</span>
</NavLink>
<NavLink
to="/oem-full"
className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] mb-0.5 transition"
style={({ isActive }) => ({
color: isActive ? 'var(--moss)' : 'var(--ink)',
background: isActive ? 'var(--leaf-soft)' : 'transparent',
fontWeight: isActive ? 600 : 500,
})}
>
<Building2 size={16} strokeWidth={1.7} />
<span>OEM 전공정위탁</span>
</NavLink>
<NavLink
to="/oem-partial"
className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] mb-0.5 transition"
style={({ isActive }) => ({
color: isActive ? 'var(--moss)' : 'var(--ink)',
background: isActive ? 'var(--leaf-soft)' : 'transparent',
fontWeight: isActive ? 600 : 500,
})}
>
<Share2 size={16} strokeWidth={1.7} />
<span>OEM 일부위탁</span>
</NavLink>
<NavLink
to="/print-export"
className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] mb-0.5 transition"
style={({ isActive }) => ({
color: isActive ? 'var(--moss)' : 'var(--ink)',
background: isActive ? 'var(--leaf-soft)' : 'transparent',
fontWeight: isActive ? 600 : 500,
})}
>
<Printer size={16} strokeWidth={1.7} />
<span>문서 출력</span>
</NavLink>
<NavLink
to="/company-master"
className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] mb-0.5 transition"
style={({ isActive }) => ({
color: isActive ? 'var(--moss)' : 'var(--ink)',
background: isActive ? 'var(--leaf-soft)' : 'transparent',
fontWeight: isActive ? 600 : 500,
})}
>
<Building2 size={16} strokeWidth={1.7} />
<span>회사 마스터</span>
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
<span className="flex-1 text-left">ìì GMP</span>
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
<span className="flex-1 text-left">ì ì¡° GMP</span>
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
const i = DOMAINS.findIndex(dd => dd.label === domain.label)
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
</>
)}

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
<span>ì´ìì ì½ì</span>
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
<span>íëÂ·ìê¸ ê´ë¦¬</span>
</NavLink>
</>
)}

{canSwitchDept && (
<div className="px-3 mt-4 mb-2">
<div className="font-mono text-[10px] tracking-[0.2em] uppercase mb-1.5" style={{ color: 'var(--ink-faint)' }}>
ë¶ì ë³´ê¸° ì í
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
<span className="flex-1">ê´ë¦¬ì ì¤ì </span>
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
<div className="mt-1 text-[13.5px] font-medium leading-tight">ì¨ë³´ë© ì§í</div>
<div className="text-[12px] mt-0.5 opacity-80">5ë¶ì´ë©´ ììë©ëë¤</div>
</NavLink>
</div>
</aside>
)
}
