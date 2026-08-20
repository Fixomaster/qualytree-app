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
import GlobalSearch from './GlobalSearch'

// Ã¬ÂÂ¨Ã«Â³Â´Ã«ÂÂ© STEP3(Ã¬Â¡Â°Ã¬Â§ÂÃ«ÂÂ)Ã¬ÂÂÃ¬ÂÂ Ã«ÂÂ±Ã«Â¡ÂÃ­ÂÂ Ã«Â¶ÂÃ¬ÂÂ Ã¬ÂÂ´Ã«Â¦ÂÃ¬ÂÂ Ã¬ÂÂ½Ã¬ÂÂ´, Ã«Â·Â° Ã¬Â ÂÃ­ÂÂ Ã«ÂªÂ©Ã«Â¡Â(DEPT_LIST)Ã¬ÂÂ Ã­ÂÂÃ¬ÂÂ¬ Ã¬ÂÂ¤Ã¬Â Â
// Ã¬Â¡Â°Ã¬Â§ÂÃ¬ÂÂ Ã«Â§ÂÃ¬Â¶Â° Ã¬Â¶ÂÃ«Â Â¤Ã«ÂÂ¸Ã«ÂÂ¤. Ã«Â§Â¤Ã¬Â¹Â­Ã«ÂÂÃ«ÂÂ ÃªÂ²Â ÃªÂ±Â°Ã¬ÂÂ Ã¬ÂÂÃ¬ÂÂ¼Ã«Â©Â´(Ã¬ÂÂ: Ã¬ÂÂ¨Ã«Â³Â´Ã«ÂÂ© Ã¬Â Â) Ã¬Â ÂÃ¬Â²Â´ Ã«ÂªÂ©Ã«Â¡ÂÃ¬ÂÂ ÃªÂ·Â¸Ã«ÂÂÃ«Â¡Â Ã«Â³Â´Ã¬ÂÂ¬Ã¬Â¤ÂÃ«ÂÂ¤.
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
  const norm = (s) => (s || '').replace(/[ÃÂ·\s]/g, '')
  const hit = (label) => names.some((n) => {
    const a = norm(n); const b = norm(label)
    return a.includes(b) || b.includes(a) || a.includes(b.slice(0, 2))
  })
  const filtered = DEPT_LIST.filter((d) => d.code === 'ALL' || hit(d.label))
  return filtered.length > 1 ? filtered : DEPT_LIST
}

const DOMAINS = [
{
label: 'Ã¬ÂÂÃ¬Â£Â¼ÃÂ·ÃªÂ³Â ÃªÂ°Â', icon: TrendingUp,
items: [
{ to: '/sales', label: 'Ã¬ÂÂÃ¬ÂÂ Ã­ÂÂÃ­ÂÂ©' },
{ to: '/customer-req', label: 'ÃªÂ³Â ÃªÂ°Â Ã¬ÂÂÃªÂµÂ¬Ã¬ÂÂ¬Ã­ÂÂ­ ÃªÂ²ÂÃ­ÂÂ ' },
{ to: '/complaints', label: 'ÃªÂ³Â ÃªÂ°ÂÃ«Â¶ÂÃ«Â§Â ÃªÂ´ÂÃ«Â¦Â¬' },
],
},
{
label: 'ÃªÂµÂ¬Ã«Â§Â¤ÃÂ·Ã¬ÂÂÃ¬ÂÂ¬', icon: ShoppingCart,
items: [
{ to: '/purchase', label: 'ÃªÂµÂ¬Ã«Â§Â¤ Ã­ÂÂÃ­ÂÂ©' },
{ to: '/supplier', label: 'ÃªÂ³ÂµÃªÂ¸ÂÃ¬ÂÂÃ¬Â²Â´ ÃªÂ´ÂÃ«Â¦Â¬' },
{ to: '/purchase-info', label: 'ÃªÂµÂ¬Ã«Â§Â¤Ã¬Â ÂÃ«Â³Â´ÃÂ·Ã¬ÂÂÃ¬ÂÂÃªÂ²ÂÃ¬ÂÂ¬' },
],
},
{
label: 'Ã¬ÂÂÃ¬ÂÂ°ÃÂ·Ã¬Â ÂÃ¬Â¡Â°', icon: Factory,
items: [
{ to: '/manufacturing', label: 'Ã¬ÂÂÃ¬ÂÂ° Ã­ÂÂÃ­ÂÂ©' },
{ to: '/process-validation', label: 'ÃªÂ³ÂµÃ¬Â ÂÃ¬ÂÂ Ã­ÂÂ¨Ã¬ÂÂ±Ã­ÂÂÃ¬ÂÂ¸(Ã¬ÂÂ¤Ã­ÂÂ)' },
{ to: '/traceability', label: 'Ã¬Â ÂÃ­ÂÂÃ¬Â¶ÂÃ¬Â ÂÃ¬ÂÂ±ÃªÂ´ÂÃ«Â¦Â¬' },
{ to: '/product-id', label: 'Ã¬Â ÂÃ­ÂÂÃ¬ÂÂÃ«Â³ÂÃÂ·Ã¬ÂÂÃ­ÂÂ' },
{ to: '/customer-property', label: 'ÃªÂ³Â ÃªÂ°ÂÃ¬ÂÂÃ¬ÂÂ°ÃªÂ´ÂÃ«Â¦Â¬' },
{ to: '/preservation', label: 'Ã¬Â ÂÃ­ÂÂÃ«Â³Â´Ã¬Â¡Â´ÃÂ·Ã¬Â·Â¨ÃªÂ¸Â' },
{ to: '/inventory', label: 'Ã¬ÂÂ¬ÃªÂ³Â ÃÂ·Ã¬Â¶ÂÃªÂ³Â ÃªÂ´ÂÃ«Â¦Â¬' },
{ to: '/cleanliness', label: 'Ã¬Â²Â­ÃªÂ²Â°ÃÂ·Ã¬ÂÂ¤Ã¬ÂÂ¼ ÃªÂ´ÂÃ«Â¦Â¬' },
{ to: '/sterile', label: 'Ã«Â©Â¸ÃªÂ·Â  Ã¬ÂÂÃ«Â£ÂÃªÂ¸Â°ÃªÂ¸Â°' },
{ to: '/service', label: 'Ã¬ÂÂ¤Ã¬Â¹ÂÃÂ·Ã¬ÂÂÃ«Â¹ÂÃ¬ÂÂ¤' },
],
},
{
label: 'Ã­ÂÂÃ¬Â§ÂÃÂ·ÃªÂ²ÂÃ¬ÂÂ¬', icon: ShieldCheck,
items: [
{ to: '/inspection', label: 'ÃªÂ³ÂµÃ¬Â ÂÃÂ·Ã¬ÂµÂÃ¬Â¢Â ÃªÂ²ÂÃ¬ÂÂ¬' },
{ to: '/quality', label: 'NCRÃÂ·Ã«Â¶ÂÃ¬Â ÂÃ­ÂÂ©' },
{ to: '/improvement', label: 'CAPAÃÂ·ÃªÂ°ÂÃ¬ÂÂ ' },
{ to: '/change-control',label: 'Ã«Â³ÂÃªÂ²Â½ÃªÂ´ÂÃ«Â¦Â¬' },
{ to: '/audit', label: 'Ã«ÂÂ´Ã«Â¶ÂÃªÂ°ÂÃ¬ÂÂ¬' },
{ to: '/workenv', label: 'Ã¬ÂÂÃ¬ÂÂÃ­ÂÂÃªÂ²Â½ÃªÂ´ÂÃ«Â¦Â¬' },
{ to: '/measurement', label: 'Ã¬Â¸Â¡Ã¬Â ÂÃÂ·Ã«Â¶ÂÃ¬ÂÂÃÂ·ÃªÂ°ÂÃ¬ÂÂ ' },
{ to: '/kpi-dashboard', label: 'Ã­ÂÂÃ¬Â§Â KPI' },
    { to: '/post-market-safety', label: '시판후안전관리' },
    { to: '/csv', label: 'CSV Ã¬ÂÂ Ã­ÂÂ¨Ã¬ÂÂ±Ã­ÂÂÃ¬ÂÂ¸' },
    { to: '/stability', label: 'Ã¬ÂÂÃ¬Â ÂÃ¬ÂÂ± Ã¬ÂÂÃ­ÂÂ ÃªÂ´ÂÃ«Â¦Â¬' },
],
},
{
label: 'Ã¬ÂÂ¤ÃªÂ³ÂÃÂ·ÃªÂ°ÂÃ«Â°Â', icon: Code2,
items: [
{ to: '/products', label: 'Ã¬Â ÂÃ­ÂÂÃÂ·Ã¬ÂÂ¤ÃªÂ³ÂÃªÂ°ÂÃ«Â°Â' },
{ to: '/design-history', label: 'Ã¬ÂÂ¤ÃªÂ³ÂÃ¬ÂÂ´Ã«Â Â¥Ã­ÂÂÃ¬ÂÂ¼(DHF)' },
],
},
{
label: 'Ã«Â¬Â¸Ã¬ÂÂÃÂ·ÃªÂ·ÂÃ¬Â Â', icon: FileText,
items: [
{ to: '/qms-overview', label: 'QMS ÃªÂ°ÂÃ¬ÂÂ' },
{ to: '/record-master', label: 'ÃªÂ¸Â°Ã«Â¡Â Ã«ÂÂÃ¬ÂÂ¥' },
{ to: '/document-control', label: 'Ã«Â¬Â¸Ã¬ÂÂÃªÂ´ÂÃ«Â¦Â¬' },
],
},
{
label: 'Ã¬ÂÂ¤Ã«Â¹ÂÃÂ·ÃªÂµÂÃ¬Â Â', icon: Wrench,
items: [
{ to: '/equipment', label: 'Ã¬ÂÂ¤Ã«Â¹Â Ã­ÂÂÃ­ÂÂ©' },
{ to: '/calibration', label: 'ÃªÂµÂÃ¬Â ÂÃªÂ´ÂÃ«Â¦Â¬' },
{ to: '/infrastructure', label: 'Ã¬ÂÂ¸Ã­ÂÂÃ«ÂÂ¼ÃªÂ´ÂÃ«Â¦Â¬' },
],
},
{
label: 'ÃªÂµÂÃ¬ÂÂ¡ÃÂ·Ã¬ÂÂ¸Ã«Â Â¥', icon: GraduationCap,
items: [
{ to: '/training', label: 'ÃªÂµÂÃ¬ÂÂ¡Ã­ÂÂÃ«Â Â¨' },
{ to: '/competency', label: 'Ã¬ÂÂ­Ã«ÂÂÃªÂ´ÂÃ«Â¦Â¬' },
{ to: '/org-responsibility', label: 'Ã¬Â¡Â°Ã¬Â§ÂÃÂ·Ã¬Â±ÂÃ¬ÂÂ' },
{ to: '/resource-plan', label: 'Ã¬ÂÂÃ¬ÂÂ ÃªÂ³ÂÃ­ÂÂ' },
],
},
{
label: 'ÃªÂ²Â½Ã¬ÂÂÃÂ·Ã¬Â ÂÃ«ÂÂµ', icon: BarChart3,
items: [
{ to: '/management-review', label: 'ÃªÂ²Â½Ã¬ÂÂÃªÂ²ÂÃ­ÂÂ ' },
{ to: '/quality-plan', label: 'Ã­ÂÂÃ¬Â§ÂÃªÂ³ÂÃ­ÂÂ' },
{ to: '/management-commitment', label: 'ÃªÂ²Â½Ã¬ÂÂÃ¬ÂÂÃ¬Â§ÂÃÂ·Ã­ÂÂÃ¬Â§ÂÃ«Â°Â©Ã¬Â¹Â¨ÃÂ·Ã«ÂªÂ©Ã­ÂÂ' },
],
},
]

const IMP_ITEMS = [
{ to: '/foreign-manufacturers', label: 'Ã¬ÂÂ¸ÃªÂµÂ­Ã¬Â ÂÃ¬Â¡Â°Ã¬ÂÂ GMP' },
{ to: '/import-products', label: 'Ã­ÂÂÃ«ÂªÂ© Ã­ÂÂÃªÂ°Â Ã­ÂÂÃ­ÂÂ©' },
{ to: '/import-clearance', label: 'Ã¬ÂÂÃ¬ÂÂ Ã­ÂÂµÃªÂ´Â ÃªÂ¸Â°Ã«Â¡Â' },
{ to: '/post-market-safety', label: '시판후안전관리' },
{ to: '/import-management-standard', label: 'Ã¬ÂÂÃ¬ÂÂÃªÂ´ÂÃ«Â¦Â¬ÃªÂ¸Â°Ã¬Â¤ÂÃ¬ÂÂ' },
{ to: '/csv', label: 'CSV Ã¬ÂÂ Ã­ÂÂ¨Ã¬ÂÂ±Ã­ÂÂÃ¬ÂÂ¸' },
{ to: '/stability', label: 'Ã¬ÂÂÃ¬Â ÂÃ¬ÂÂ± Ã¬ÂÂÃ­ÂÂ ÃªÂ´ÂÃ«Â¦Â¬' }
]

export default function Sidebar() {
const loc = useLocation()
const cur = auth.current()
const userId = cur?.memberId || (cur?.email ? 'demo_' + cur.email : null)

// #6/#7: Ã«Â¶ÂÃ¬ÂÂ Ã«Â³Â´ÃªÂ¸Â° Ã¬Â ÂÃ­ÂÂ Ã¢ÂÂ CEO/Ã«Â§Â¤Ã«ÂÂÃ¬Â ÂÃªÂ°Â Ã«Â¶ÂÃ¬ÂÂÃ«Â³Â Ã«Â©ÂÃ«ÂÂ´ÃÂ·Ã«ÂÂÃ¬ÂÂÃ«Â³Â´Ã«ÂÂÃ«Â¥Â¼ Ã«Â°ÂÃªÂ¿ÂÃ«Â³Â¼ Ã¬ÂÂ Ã¬ÂÂÃ«ÂÂÃ«Â¡Â.
// Ã¬ÂÂµÃ¬ÂÂÃ¬ÂÂ Ã¬ÂÂ¨Ã«Â³Â´Ã«ÂÂ© Ã¬Â¡Â°Ã¬Â§ÂÃ«ÂÂÃ¬ÂÂ Ã«ÂÂ±Ã«Â¡ÂÃ«ÂÂ Ã«Â¶ÂÃ¬ÂÂ ÃªÂ¸Â°Ã¬Â¤ÂÃ¬ÂÂ¼Ã«Â¡Â Ã¬Â¶ÂÃ«Â Â¤ "Ã«Â¶ÂÃ¬ÂÂÃ«ÂªÂÃ¬ÂÂ´ Ã«ÂÂÃ«Â¬Â´ Ã«Â§ÂÃ«ÂÂ¤"Ã«ÂÂ Ã«Â¬Â¸Ã¬Â ÂÃ«Â¥Â¼ Ã¬Â¤ÂÃ¬ÂÂ¸Ã«ÂÂ¤.
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
<span>Ã­ÂÂ Ã«ÂÂÃ¬ÂÂÃ«Â³Â´Ã«ÂÂ</span>
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
          <span>Ã¬ÂÂÃ«Â¬Â´ Ã­ÂÂÃ«Â¡ÂÃ¬ÂÂ¸Ã¬ÂÂ¤ Ã­ÂÂÃ«Â¦ÂÃ«ÂÂ</span>
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
<span>ÃªÂ³ÂµÃ¬Â§ÂÃ¬ÂÂ¬Ã­ÂÂ­</span>
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
<span>ÃªÂ¶ÂÃ­ÂÂ ÃªÂ´ÂÃ«Â¦Â¬</span>
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
<span>ÃªÂ¸Â°Ã«Â³Â¸Ã¬Â ÂÃ«Â³Â´</span>
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
<span>Ã¬ÂÂ¸Ã­ÂÂÃªÂ°Â</span>
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
<span>GMP Ã¬ÂÂ Ã¬Â²Â­</span>
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
<span className="flex-1 text-left">Ã¬ÂÂÃ¬ÂÂ GMP</span>
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
<span className="flex-1 text-left">Ã¬Â ÂÃ¬Â¡Â° GMP</span>
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
<span>Ã¬ÂÂ´Ã¬ÂÂÃ¬ÂÂ Ã¬Â½ÂÃ¬ÂÂ</span>
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
<span>Ã­ÂÂÃ«ÂÂÃÂ·Ã¬ÂÂÃªÂ¸Â ÃªÂ´ÂÃ«Â¦Â¬</span>
</NavLink>
</>
)}

{canSwitchDept && (
<div className="px-3 mt-4 mb-2">
<div className="font-mono text-[10px] tracking-[0.2em] uppercase mb-1.5" style={{ color: 'var(--ink-faint)' }}>
Ã«Â¶ÂÃ¬ÂÂ Ã«Â³Â´ÃªÂ¸Â° Ã¬Â ÂÃ­ÂÂ
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
<span className="flex-1">ÃªÂ´ÂÃ«Â¦Â¬Ã¬ÂÂ Ã¬ÂÂ¤Ã¬Â Â</span>
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
<div className="mt-1 text-[13.5px] font-medium leading-tight">Ã¬ÂÂ¨Ã«Â³Â´Ã«ÂÂ© Ã¬Â§ÂÃ­ÂÂ</div>
<div className="text-[12px] mt-0.5 opacity-80">5Ã«Â¶ÂÃ¬ÂÂ´Ã«Â©Â´ Ã¬ÂÂÃ¬ÂÂÃ«ÂÂ©Ã«ÂÂÃ«ÂÂ¤</div>
</NavLink>
</div>
</aside>
)
}
