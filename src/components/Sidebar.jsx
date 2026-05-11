import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  PackageSearch,
  Workflow,
  ShieldCheck,
  FileCheck2,
  HelpCircle,
  Settings,
  GitBranch,
  Crown,
} from 'lucide-react'
import Logo from './Logo'
import { auth } from '../lib/auth'

const NAV = [
  { to: '/dashboard', label: '대시보드', en: 'Dashboard', icon: LayoutDashboard, area: 'ENT' },
  { to: '/products', label: '제품·공정', en: 'Products & Processes', icon: PackageSearch, area: 'ONB' },
  { to: '/operations', label: '현장 운영', en: 'Operations', icon: Workflow, area: 'OPS' },
  { to: '/quality', label: '품질·NCR', en: 'Quality & NCR', icon: ShieldCheck, area: 'QMS' },
  { to: '/regulatory', label: '인허가', en: 'Regulatory', icon: FileCheck2, area: 'RA' },
  { to: '/tree', label: 'Quality Tree', en: 'Quality Tree', icon: GitBranch, area: 'TREE' },
]

const FOOT = [
  { to: '/help', label: '도움', icon: HelpCircle, soon: true },
  { to: '/admin', label: '관리자', icon: Settings, soon: true },
]

export default function Sidebar() {
  const loc = useLocation()

  return (
    <aside
      className="hidden md:flex flex-col shrink-0 h-screen sticky top-0"
      style={{
        width: 248,
        background: 'var(--bg-card)',
        borderRight: '1px solid var(--line)',
      }}
    >
      <div className="px-5 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--line)' }}>
        <Logo size={26} />
        <span
          className="font-mono text-[9.5px] tracking-[0.18em] uppercase"
          style={{ color: 'var(--ink-faint)' }}
        >
          v0.2
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div
          className="px-3 mb-2 font-mono text-[10px] tracking-[0.2em] uppercase"
          style={{ color: 'var(--ink-faint)' }}
        >
          Workspace
        </div>
        {NAV.map((item) => (
          <SidebarItem key={item.to} {...item} />
        ))}

       {auth.identityKind() === 'operator' && (
          <>
            <div
              className="px-3 mt-6 mb-2 font-mono text-[10px] tracking-[0.2em] uppercase"
              style={{ color: 'var(--ink-faint)' }}
            >
              Operator
            </div>
            <SidebarItem
              to="/operator"
              label="운영자 콘솔"
              icon={Crown}
              area="OPS-ADMIN"
            />
          </>
        )}

        {auth.identityKind() === 'operator' && (
          <>
            <div
              className="px-3 mt-6 mb-2 font-mono text-[10px] tracking-[0.2em] uppercase"
              style={{ color: 'var(--ink-faint)' }}
            >
              Operator
            </div>
            <SidebarItem
              to="/operator"
              label="운영자 콘솔"
              icon={Crown}
              area="OPS-ADMIN"
            />
          </>
        )}

        <div
          className="px-3 mt-6 mb-2 font-mono text-[10px] tracking-[0.2em] uppercase"
          style={{ color: 'var(--ink-faint)' }}
        >
          System
        </div>
        {FOOT.map((item) => (
          <SidebarItem key={item.to} {...item} />
        ))}
      </nav>

      <div className="p-3 border-t" style={{ borderColor: 'var(--line)' }}>
        <NavLink
          to="/onboarding"
          className="block p-3 rounded-xl transition"
          style={({ isActive }) => ({
            background: isActive
              ? 'var(--moss)'
              : loc.pathname.startsWith('/onboarding')
              ? 'var(--moss)'
              : 'var(--leaf-soft)',
            color: loc.pathname.startsWith('/onboarding') ? 'var(--bg)' : 'var(--moss)',
          })}
        >
          <div className="font-mono text-[9.5px] tracking-[0.18em] uppercase opacity-80">
            START HERE
          </div>
          <div className="mt-1 text-[13.5px] font-medium leading-tight">
            온보딩 진행
          </div>
          <div className="text-[12px] mt-0.5 opacity-80">
            5분이면 시작됩니다
          </div>
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
      className={({ isActive }) =>
        'group flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] mb-0.5 transition'
      }
      style={({ isActive }) => ({
        color: soon ? 'var(--ink-faint)' : isActive ? 'var(--moss)' : 'var(--ink-soft)',
        background: !soon && isActive ? 'var(--leaf-soft)' : 'transparent',
        cursor: soon ? 'not-allowed' : 'pointer',
      })}
    >
      <Icon size={17} strokeWidth={1.7} />
      <span className="flex-1">{label}</span>
      {area && (
        <span
          className="font-mono text-[9px] tracking-wider px-1.5 py-0.5 rounded"
          style={{
            color: 'var(--ink-faint)',
            background: 'var(--bg-soft)',
          }}
        >
          {area}
        </span>
      )}
      {soon && (
        <span
          className="font-mono text-[9px] tracking-wider"
          style={{ color: 'var(--ink-faint)' }}
        >
          SOON
        </span>
      )}
    </NavLink>
  )
}