// src/components/Sidebar.jsx
// 부서별 필터링 사이드바 — deptAuth 기반
import React, { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  TrendingUp,
  Factory,
  ShoppingCart,
  ShieldCheck,
  Wrench,
  Microscope,
  FileText,
  Crown,
  GraduationCap,
  FileCheck2,
  Search,
  BarChart2,
  Workflow,
  GitBranch,
  PackageSearch,
  Building2,
  ChevronDown,
  Users,
  Settings,
  HelpCircle,
  RefreshCw,
  Home,
} from 'lucide-react'
import Logo from './Logo'
import { auth } from '../lib/auth'
import { deptAuth, DEPT_LIST, DEPT_NAV } from '../lib/deptAuth'

// 배지 코드 → Lucide 아이콘 매핑
const BADGE_ICONS = {
  MR:   LayoutDashboard,
  SAL:  TrendingUp,
  MFG:  Factory,
  PUR:  ShoppingCart,
  QUA:  ShieldCheck,
  EQP:  Wrench,
  DEV:  Microscope,
  DOC:  FileText,
  TRN:  GraduationCap,
  RA:   FileCheck2,
  AUD:  Search,
  IMP:  BarChart2,
  OPS:  Workflow,
  TREE: GitBranch,
  PRD:  PackageSearch,
  ALL:  Building2,
  HOME: Home,
  FLOW: Workflow,
}

// 배지 색상
const BADGE_COLORS = {
  SAL: '#3B82F6', MFG: '#F59E0B', PUR: '#8B5CF6',
  QUA: '#10B981', EQP: '#6366F1', DEV: '#EC4899',
  DOC: '#14B8A6', MR: '#F97316',  TRN: '#06B6D4',
  RA: '#84CC16',  AUD: '#EF4444', IMP: '#22D3EE',
  OPS: '#78716C', TREE: '#6B7280', PRD: '#A78BFA',
}

export default function Sidebar() {
  const loc = useLocation()
  const [dept, setDept] = useState(() => deptAuth.getDepartment())
  const [showDeptPicker, setShowDeptPicker] = useState(false)
  const user = auth.current()

  // 부서 변경 이벤트 구독
  useEffect(() => {
    const handler = (e) => setDept(e.detail)
    window.addEventListener('qt-dept-changed', handler)
    return () => window.removeEventListener('qt-dept-changed', handler)
  }, [])

  const deptInfo = dept ? deptAuth.getDeptInfo(dept) : null
  const navItems = dept ? (DEPT_NAV[dept] || DEPT_NAV['ALL']) : []

  return (
    <>
      <aside
        className="hidden md:flex flex-col shrink-0 h-screen sticky top-0"
        style={{ width: 248, background: 'var(--bg-card)', borderRight: '1px solid var(--line)' }}
      >
        {/* 로고 */}
        <div className="px-5 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--line)' }}>
          <Logo size={26} />
          <span className="font-mono text-[9.5px] tracking-[0.18em] uppercase" style={{ color: 'var(--ink-faint)' }}>
            v0.3
          </span>
        </div>

        {/* 현재 부서 배지 */}
        {dept && deptInfo && (
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: `${deptInfo.color}12`, border: `1px solid ${deptInfo.color}30` }}
            >
              <span style={{ fontSize: 16 }}>{deptInfo.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold truncate" style={{ color: deptInfo.color }}>
                  {deptInfo.label}
                </div>
                <div className="font-mono text-[9px] tracking-wider" style={{ color: 'var(--ink-faint)' }}>
                  {dept} · {user?.name || '사용자'}
                </div>
              </div>
              <button
                onClick={() => setShowDeptPicker(true)}
                title="부서 변경"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--ink-faint)', padding: 2, borderRadius: 6,
                  display: 'flex', alignItems: 'center',
                }}
              >
                <RefreshCw size={12} />
              </button>
            </div>
          </div>
        )}

        {/* 미선택 상태 */}
        {!dept && (
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
            <button
              onClick={() => setShowDeptPicker(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium"
              style={{
                background: 'var(--leaf-soft)',
                color: 'var(--moss)',
                border: '1px solid var(--moss)',
                cursor: 'pointer',
              }}
            >
              <Users size={13} />
              <span>부서 선택하기</span>
              <ChevronDown size={12} style={{ marginLeft: 'auto' }} />
            </button>
          </div>
        )}

        {/* 메인 네비게이션 */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto">
          {dept ? (
            <>
              <div className="px-3 mb-2 font-mono text-[10px] tracking-[0.2em] uppercase" style={{ color: 'var(--ink-faint)' }}>
                {deptInfo?.label || dept} 메뉴
              </div>
              {navItems.map((item) => (
                <DeptNavItem key={item.to} item={item} />
              ))}

              {/* 공통 메뉴 구분선 */}
              <div className="px-3 mt-4 mb-2 font-mono text-[10px] tracking-[0.2em] uppercase" style={{ color: 'var(--ink-faint)' }}>
                공통
              </div>
              <DeptNavItem item={{ to: '/dashboard', label: '전사 대시보드', badge: 'MR' }} />
              <DeptNavItem item={{ to: '/tree', label: 'Quality Tree', badge: 'TREE' }} />
            </>
          ) : (
            <>
              <div className="px-3 mb-2 font-mono text-[10px] tracking-[0.2em] uppercase" style={{ color: 'var(--ink-faint)' }}>
                Workspace
              </div>
              {/* 부서 미선택시 기본 메뉴 표시 */}
              {DEPT_NAV['ALL'].map((item) => (
                <DeptNavItem key={item.to} item={item} />
              ))}
            </>
          )}

          {/* 운영자 메뉴 */}
          {auth.identityKind() === 'operator' && (
            <>
              <div className="px-3 mt-5 mb-2 font-mono text-[10px] tracking-[0.2em] uppercase" style={{ color: 'var(--ink-faint)' }}>
                Operator
              </div>
              <DeptNavItem item={{ to: '/operator', label: '운영자 콘솔', badge: 'SYS' }} rawIcon={Crown} />
              <DeptNavItem item={{ to: '/operator/plans', label: '플랜·요금 관리', badge: 'SYS' }} rawIcon={Crown} />
            </>
          )}

          {/* 시스템 메뉴 */}
          <div className="px-3 mt-5 mb-2 font-mono text-[10px] tracking-[0.2em] uppercase" style={{ color: 'var(--ink-faint)' }}>
            System
          </div>
          <DeptNavItem item={{ to: '/help', label: '도움', badge: null, soon: true }} rawIcon={HelpCircle} />
          <DeptNavItem item={{ to: '/admin', label: '관리자', badge: null, soon: true }} rawIcon={Settings} />
        </nav>

        {/* 하단 온보딩 버튼 */}
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

      {/* 부서 선택 팝업 (사이드바에서 변경 클릭 시) */}
      {showDeptPicker && (
        <DeptPickerOverlay
          currentDept={dept}
          onSelect={(newDept) => {
            deptAuth.setDepartment(newDept)
            setShowDeptPicker(false)
          }}
          onClose={() => setShowDeptPicker(false)}
        />
      )}
    </>
  )
}

/** 부서별 네비게이션 아이템 */
function DeptNavItem({ item, rawIcon: RawIcon }) {
  const { to, label, badge, soon } = item
  const Icon = RawIcon || (badge && BADGE_ICONS[badge]) || LayoutDashboard
  const color = badge && BADGE_COLORS[badge]

  return (
    <NavLink
      to={soon ? '#' : to}
      onClick={(e) => soon && e.preventDefault()}
      className={({ isActive }) => 'group flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] mb-0.5 transition'}
      style={({ isActive }) => ({
        color: soon ? 'var(--ink-faint)' : isActive ? (color || 'var(--moss)') : 'var(--ink-soft)',
        background: !soon && isActive ? (color ? `${color}12` : 'var(--leaf-soft)') : 'transparent',
        cursor: soon ? 'not-allowed' : 'pointer',
      })}
    >
      {({ isActive }) => (
        <>
          <Icon
            size={17}
            strokeWidth={1.7}
            style={{ color: isActive && color ? color : undefined, flexShrink: 0 }}
          />
          <span className="flex-1 truncate">{label}</span>
          {badge && (
            <span
              className="font-mono text-[9px] tracking-wider px-1.5 py-0.5 rounded"
              style={{
                color: isActive && color ? color : 'var(--ink-faint)',
                background: isActive && color ? `${color}18` : 'var(--bg-soft)',
              }}
            >
              {badge}
            </span>
          )}
          {soon && (
            <span className="font-mono text-[9px] tracking-wider" style={{ color: 'var(--ink-faint)' }}>
              SOON
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}

/** 부서 변경 미니 오버레이 */
function DeptPickerOverlay({ currentDept, onSelect, onClose }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 8888,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 18,
          border: '1px solid var(--line)',
          maxWidth: 640,
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>부서 변경</div>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 4 }}>
            현재: {currentDept ? DEPT_LIST.find(d => d.code === currentDept)?.label : '미선택'}
          </div>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 8,
            padding: 16,
          }}
        >
          {DEPT_LIST.map((dept) => (
            <button
              key={dept.code}
              onClick={() => onSelect(dept.code)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                borderRadius: 10,
                border: `1.5px solid ${currentDept === dept.code ? dept.color : 'var(--line)'}`,
                background: currentDept === dept.code ? `${dept.color}12` : 'var(--bg-soft)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.1s',
              }}
            >
              <span style={{ fontSize: 16 }}>{dept.icon}</span>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: currentDept === dept.code ? dept.color : 'var(--ink)' }}>
                  {dept.label}
                </div>
                <div style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--ink-faint)', letterSpacing: '0.1em' }}>
                  {dept.code}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
