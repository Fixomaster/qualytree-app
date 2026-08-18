import React, { useState } from 'react'
import { Search, Bell, ChevronDown, LogOut, User as UserIcon, UserCog, ShieldCheck, ArrowLeft } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { auth } from '../lib/auth'
import { LEVELS, LEVEL_LABEL } from '../lib/permissions'
import ProfileSettingsModal from './ProfileSettingsModal'

export default function TopBar({ user, title, subtitle }) {
  const nav = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showRoleSwap, setShowRoleSwap] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  // í(ë¶ìë³ ëìë³´ë)ììë ë¤ë¡ê°ê¸°ê° ìë¯¸ ìì¼ë¯ë¡ ì¨ê¸´ë¤. ê·¸ ì¸ íë©´ììë í­ì íì â
  // ë¸ë¼ì°ì  íì¤í ë¦¬ê° ìì¼ë©´ ë¤ë¡ ì´ë, ìë¡ê³ ì¹¨ ë±ì¼ë¡ íì¤í ë¦¬ê° ìì¼ë©´ íì¼ë¡ ì´ë.
  const isHome = location.pathname === '/home'
  const goBack = () => {
    if (window.history.length > 2) nav(-1)
    else nav('/home')
  }

  const onSignOut = () => {
    auth.signOut()
    nav('/login')
  }

  const onSwapLevel = (lv) => {
    auth.setLevel(lv)
    setShowRoleSwap(false)
    setMenuOpen(false)
    // íë©´ ì ì²´ ìë¡ê³ ì¹¨ â ê¶í ê²ì´í¸ ì¦ì ë°ì
    window.location.reload()
  }

  const currentLevel = user?.level ?? LEVELS.OPERATOR
  const levelInfo = LEVEL_LABEL[currentLevel]

  return (
    <header
      className="h-[64px] sticky top-0 z-30 flex items-center justify-between px-6 lg:px-8"
      style={{
        background: 'rgba(250,250,248,0.85)',
        backdropFilter: 'saturate(140%) blur(10px)',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        {!isHome && (
          <button
            onClick={goBack}
            aria-label="ì´ì  íë©´ì¼ë¡ ëìê°ê¸°"
            title="ì´ì  íë©´ì¼ë¡"
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition"
            style={{ color: 'var(--ink-soft)', background: 'var(--bg-soft)' }}
          >
            <ArrowLeft size={16} strokeWidth={1.8} />
          </button>
        )}
        <div className="min-w-0">
          {title && (
            <div
              className="font-display text-[18px] leading-tight truncate"
              style={{ color: 'var(--ink)', fontWeight: 500 }}
            >
              {title}
            </div>
          )}
          {subtitle && (
            <div
              className="text-[12.5px] mt-0.5 truncate"
              style={{ color: 'var(--ink-mute)' }}
            >
              {subtitle}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* search — Ctrl+K triggers GlobalSearch */}
        <button
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer"
          style={{ background: 'var(--bg-soft)', color: 'var(--ink-mute)', minWidth: 240, border: 'none', textAlign: 'left' }}
          onClick={() => window.dispatchEvent(new CustomEvent('openSearch'))}
        >
          <Search size={14} />
          <span style={{ fontSize: 13, flex: 1 }}>검색...</span>
          <span
            className="font-mono text-[10px] px-1.5 py-0.5 rounded"
            style={{ background: 'var(--bg)', color: 'var(--ink-faint)' }}
          >
            Ctrl+K
          </span>
        </button>

        {/* notifications */}
        <button
          className="relative w-9 h-9 rounded-full flex items-center justify-center transition"
          style={{ color: 'var(--ink-soft)' }}
          onClick={(e) => e.preventDefault()}
        >
          <Bell size={17} strokeWidth={1.7} />
          <span
            className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full pulse-soft"
            style={{ background: 'var(--amber)' }}
          />
        </button>

        {/* user */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full transition"
            style={{ background: 'var(--bg-soft)' }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center font-medium text-[12px]"
              style={{ background: 'var(--moss)', color: 'var(--bg)' }}
            >
              {(user?.name || user?.email || '?').slice(0, 1).toUpperCase()}
            </div>
            <span className="text-[13px] hidden sm:inline" style={{ color: 'var(--ink)' }}>
              {user?.name || user?.email?.split('@')[0]}
            </span>
            {/* ê¶í ë°°ì§ */}
            <span
              className="font-mono text-[9.5px] tracking-wider px-1.5 py-0.5 rounded uppercase hidden sm:inline"
              style={{
                background: levelBg(currentLevel),
                color: levelFg(currentLevel),
                fontWeight: 500,
              }}
              title={`${levelInfo.ko} Â· Level ${currentLevel}`}
            >
              {levelInfo.short}
            </span>
            <ChevronDown size={13} style={{ color: 'var(--ink-mute)' }} />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-[calc(100%+6px)] w-64 rounded-xl shadow-lg py-1.5 overflow-hidden fade-in"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--line)',
                boxShadow: '0 8px 24px rgba(15,26,20,0.08)',
              }}
            >
              <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--line)' }}>
                <div className="text-[13px] font-medium">{user?.name}</div>
                <div className="text-[11.5px]" style={{ color: 'var(--ink-mute)' }}>
                  {user?.email}
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <ShieldCheck size={11} style={{ color: levelFg(currentLevel) }} />
                  <span
                    className="text-[11.5px] font-medium"
                    style={{ color: levelFg(currentLevel) }}
                  >
                    {levelInfo.ko} Â· Level {currentLevel}
                  </span>
                </div>
              </div>

              {/* ìì°ì© ì­í  ì í */}
              {!showRoleSwap ? (
                <MenuItem
                  icon={UserCog}
                  label="ê¶í ì í (ìì°ì©)"
                  onClick={() => setShowRoleSwap(true)}
                />
              ) : (
                <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--line)' }}>
                  <div
                    className="font-mono text-[10px] tracking-[0.16em] uppercase mb-2"
                    style={{ color: 'var(--ink-mute)' }}
                  >
                    SWITCH LEVEL
                  </div>
                  <div className="space-y-1">
                    {[LEVELS.OPERATOR, LEVELS.INSPECTOR, LEVELS.MANAGER].map((lv) => (
                      <button
                        key={lv}
                        onClick={() => onSwapLevel(lv)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12.5px] transition"
                        style={{
                          background:
                            currentLevel === lv ? 'var(--leaf-soft)' : 'transparent',
                          color: currentLevel === lv ? 'var(--moss)' : 'var(--ink)',
                          fontWeight: currentLevel === lv ? 500 : 400,
                        }}
                      >
                        <span
                          className="font-mono text-[9.5px] px-1.5 py-0.5 rounded uppercase"
                          style={{
                            background: levelBg(lv),
                            color: levelFg(lv),
                            fontWeight: 500,
                          }}
                        >
                          {LEVEL_LABEL[lv].short}
                        </span>
                        <span>{LEVEL_LABEL[lv].ko}</span>
                        {currentLevel === lv && (
                          <span
                            className="ml-auto text-[10px]"
                            style={{ color: 'var(--moss)' }}
                          >
                            â
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div
                    className="text-[10.5px] mt-2"
                    style={{ color: 'var(--ink-faint)' }}
                  >
                    ì¤ì  ì´ììì  SSOÂ·MFAë¡ ê²°ì ë©ëë¤ (Â§11.3)
                  </div>
                </div>
              )}

              <MenuItem icon={UserIcon} label="íë¡í ì¤ì " onClick={() => { setMenuOpen(false); setProfileOpen(true) }} />
              <MenuItem icon={LogOut} label="ë¡ê·¸ìì" onClick={onSignOut} danger />
            </div>
          )}
        </div>
      </div>

      {profileOpen && (
        <ProfileSettingsModal user={{ ...user, level: currentLevel }} onClose={() => setProfileOpen(false)} />
      )}
    </header>
  )
}

function MenuItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] hover:bg-[var(--bg-soft)] transition"
      style={{ color: danger ? 'var(--rust)' : 'var(--ink)' }}
    >
      <Icon size={14} strokeWidth={1.7} />
      <span>{label}</span>
    </button>
  )
}

function levelBg(lv) {
  if (lv === LEVELS.MANAGER) return 'var(--moss)'
  if (lv === LEVELS.INSPECTOR) return 'var(--sky-soft)'
  return 'var(--bg-deep)'
}
function levelFg(lv) {
  if (lv === LEVELS.MANAGER) return 'var(--bg)'
  if (lv === LEVELS.INSPECTOR) return 'var(--sky)'
  return 'var(--ink-mute)'
}
