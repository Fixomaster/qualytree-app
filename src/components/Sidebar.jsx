import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  PackageSearch,
  FileCheck2,
  FileText,
  Settings,
  GitBranch,
  Crown,
  ShoppingCart,
  Package,
  Cog,
  Shield,
  BarChart2,
  GraduationCap,
  Stamp,
  Factory,
  Award,
  ScrollText,
} from 'lucide-react'
import Logo from './Logo'
import { auth } from '../lib/auth'
import { onboarding } from '../lib/onboardingState'
import { LEVELS } from '../lib/permissions'

// 항상 보이는 기본 메뉴
const NAV = [
  { to: '/monitoring',   label: '모니터링',   en: 'Monitoring',          icon: BarChart2,       area: 'MON' },
  { to: '/products',     label: '개발',  en: 'Development', icon: PackageSearch,   area: 'DEV' },
  { to: '/sales',        label: '영업',        en: 'Sales',               icon: ShoppingCart,    area: 'SAL' },
  { to: '/purchase',     label: '구매자재',   en: 'Purchase & Materials', icon: Package,         area: 'PUR' },
  { to: '/manufacturing',label: '생산',        en: 'Manufacturing',       icon: Cog,             area: 'MFG' },
  { to: '/quality',      label: '품질',        en: 'Quality & NCR',       icon: Shield,          area: 'QUA' },
  { to: '/documents',    label: '품질 문서',  en: 'Documents',           icon: FileText,        area: 'DOC' },
  { to: '/management-review', label: '경영검토', en: 'Management Review',  icon: ScrollText,      area: 'MR'  },
  { to: '/training',     label: '교육',        en: 'Training',            icon: GraduationCap,   area: 'TRN' },
]

// 가입 시 선택한 인증(certs)이 있을 때만 보이는 메뉴 — 관련 없는 인증의 화면·문서는 아예 노출하지 않는다
const CERT_NAV = [
  { certId: 'kgmp',           to: '/kgmp',                  label: 'KGMP',              en: 'KGMP Registration',   icon: Stamp,   area: 'KGMP' },
  { certId: 'kgmp_importer',  to: '/foreign-manufacturers',  label: '외국제조소(수입GMP)', en: 'Foreign Manufacturers', icon: Factory, area: 'IMP'  },
  { certId: 'iso13485',       to: '/iso13485',               label: 'ISO 13485',         en: 'ISO 13485 QMS',       icon: Award,   area: 'ISO'  },
]

const NAV_TAIL = [
  { to: '/regulatory',   label: '인허가',      en: 'Regulatory',          icon: FileCheck2,      area: 'RA'  },
  { to: '/tree',         label: 'Quality Tree',en: 'Quality Tree',        icon: GitBranch,       area: 'TREE'},
]

const FOOT = [
  { to: '/admin', label: '관리자', icon: Settings, area: 'ADM' },
]

export default function Sidebar() {
  const loc = useLocation()
  const certs = (onboarding.load().certs) || {}

  return (
    <aside
      className="hidden md:flex flex-col shrink-0 h-screen sticky top-0"
      style={{ width: 248, background: 'var(--bg-card)', borderRight: '1px solid var(--line)' }}
    >
      <div className="px-5 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--line)' }}>
        <Logo size={26} />
        <span className="font-mono text-[9.5px] tracking-[0.18em] uppercase" style={{ color: 'var(--ink-faint)' }}>
          v0.3
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="px-3 mb-2 font-mono text-[10px] tracking-[0.2em] uppercase" style={{ color: 'var(--ink-faint)' }}>
          Workspace
        </div>
        {NAV.map((item) => (
          <SidebarItem key={item.to} {...item} />
        ))}
        {CERT_NAV.filter((item) => !!certs[item.certId]).map((item) => (
          <SidebarItem key={item.to} {...item} />
        ))}
        {NAV_TAIL.map((item) => (
          <SidebarItem key={item.to} {...item} />
        ))}

        {auth.identityKind() === 'operator' && (
          <>
            <div className="px-3 mt-5 mb-2 font-mono text-[10px] tracking-[0.2em] uppercase" style={{ color: 'var(--ink-faint)' }}>
              Operator
            </div>
            <SidebarItem to="/operator" label="운영자 콘솔" icon={Crown} area="OPS-ADMIN" />
            <SidebarItem to="/operator/plans" label="플랜·요금 관리" icon={Crown} area="OPS-PLAN" />
          </>
        )}

        {auth.currentLevel() >= LEVELS.MANAGER && (
          <>
            <div className="px-3 mt-5 mb-2 font-mono text-[10px] tracking-[0.2em] uppercase" style={{ color: 'var(--ink-faint)' }}>
              System
            </div>
            {FOOT.map((item) => (
              <SidebarItem key={item.to} {...item} />
            ))}
          </>
        )}
      </nav>

      <div className="p-3 border-t" style={{ borderColor: 'var(--line)' }}>
        <NavLink
          to="/onboarding"
          className="block p-3 rounded-xl transition"
          style={({ isActive }) => ({
            background: isActive || loc.pathname.startsWith('/onboarding') ? 'var(--moss)' : 'var(--leaf-soft)',
            color: loc.pathname.startsWith('/onboarding') ? 'var(--bg)' : 'var(--moss)',
          })}
        >
          <div className="font-mono text-[9.5px] tracking-[0.18em] uppercase opacity-80">START HERE</div>
          <div className="mt-1 text-[13.5px] font-medium leading-tight">온보딩 진행</div>
          <div className="text-[12px] mt-0.5 opacity-80">5분이면 시작됩니다</div>
        </NavLink>
      </div>
    </aside>
  )
}

function SidebarItem({ to, label, en, icon: Icon, area, soon }) {
  return (
    <NavLink
      to={soon ? '#' : to}
      onClick={(e) => soon && e.preventDefault()}
      className={({ isActive }) => 'group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] mb-0.5 transition'}
      style={({ isActive }) => ({
        color: soon ? 'var(--ink-faint)' : isActive ? 'var(--moss)' : 'var(--ink-soft)',
        background: !soon && isActive ? 'var(--leaf-soft)' : 'transparent',
        cursor: soon ? 'not-allowed' : 'pointer',
      })}
    >
      <Icon size={16} strokeWidth={1.7} />
      <span className="flex-1 truncate">{label}</span>
      {area && (
        <span className="font-mono text-[9px] tracking-wider px-1.5 py-0.5 rounded shrink-0"
          style={{ color: 'var(--ink-faint)', background: 'var(--bg-soft)' }}>
          {area}
        </span>
      )}
      {soon && <span className="font-mono text-[9px] tracking-wider" style={{ color: 'var(--ink-faint)' }}>SOON</span>}
    </NavLink>
  )
}
