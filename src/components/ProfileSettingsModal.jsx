import React, { useState } from 'react'
import { X, User as UserIcon, Mail, KeyRound, Loader2, CheckCircle2 } from 'lucide-react'
import { auth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { LEVEL_LABEL } from '../lib/permissions'

export default function ProfileSettingsModal({ user, onClose }) {
  const [name, setName] = useState(user?.name || '')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState('')

  const levelInfo = LEVEL_LABEL[user?.level] || LEVEL_LABEL[1]

  const save = async (e) => {
    e?.preventDefault?.()
    setErr(''); setDone('')
    if (!name.trim()) { setErr('이름을 입력해주세요.'); return }
    if (pw || pw2) {
      if (pw.length < 6) { setErr('새 비밀번호는 6자 이상이어야 합니다.'); return }
      if (pw !== pw2) { setErr('새 비밀번호가 일치하지 않습니다.'); return }
    }
    setSaving(true)
    try {
      // 1. 이름 — 로컬 세션은 즉시 반영, Supabase 계정(email 로그인)이면 user_metadata에도 best-effort로 반영
      const cur = auth.current()
      const isDemo = !user?.identityKind || user.identityKind === 'demo'
      if (cur) {
        // 데모 계정이 아니면 nameOverride를 남겨 refreshFromSupabase()가 백엔드 원본 이름으로
        // 되돌리지 않도록 한다 (백엔드에 프로필 갱신 RPC가 아직 없어 완전한 서버 동기화는 불가 —
        // 이 브라우저에서는 유지된다).
        localStorage.setItem('qualytree.auth', JSON.stringify({ ...cur, name: name.trim(), ...(isDemo ? {} : { nameOverride: true }) }))
      }
      if (!isDemo) {
        try { await supabase.auth.updateUser({ data: { name: name.trim() } }) } catch { /* best-effort */ }
      }
      // 2. 비밀번호 (선택) — Supabase 이메일 계정에서만 지원
      if (pw) {
        if (user?.identityKind === 'demo') {
          setErr('데모 계정은 비밀번호 변경을 지원하지 않습니다.')
          setSaving(false)
          return
        }
        const { error } = await supabase.auth.updateUser({ password: pw })
        if (error) {
          setErr('비밀번호 변경 실패: ' + (error.message || ''))
          setSaving(false)
          return
        }
      }
      setDone('저장되었습니다.')
      setPw(''); setPw2('')
      setTimeout(() => { window.location.reload() }, 700)
    } catch (e) {
      setErr('저장 중 오류가 발생했습니다: ' + String(e?.message || e))
    }
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(15,26,20,0.35)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] rounded-2xl p-5 fade-in"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', boxShadow: '0 20px 60px rgba(15,26,20,0.25)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="text-[15.5px] font-medium" style={{ color: 'var(--ink)' }}>프로필 설정</div>
          <button onClick={onClose} className="p-1 rounded-md" style={{ color: 'var(--ink-faint)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center font-medium text-[15px]"
            style={{ background: 'var(--moss)', color: 'var(--bg)' }}
          >
            {(name || user?.email || '?').slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{levelInfo.ko} · Level {user?.level}</div>
            <div className="text-[11.5px]" style={{ color: 'var(--ink-mute)' }}>{user?.company?.name || user?.email}</div>
          </div>
        </div>

        <form onSubmit={save} className="space-y-3">
          <label className="block">
            <span className="flex items-center gap-1.5 text-[12px] font-medium mb-1" style={{ color: 'var(--ink-soft)' }}>
              <UserIcon size={12} /> 이름
            </span>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
              style={{ border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)' }}
            />
          </label>

          <label className="block">
            <span className="flex items-center gap-1.5 text-[12px] font-medium mb-1" style={{ color: 'var(--ink-soft)' }}>
              <Mail size={12} /> 이메일
            </span>
            <input
              type="text" value={user?.email || ''} disabled
              className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
              style={{ border: '1px solid var(--line)', background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}
            />
          </label>

          <div className="pt-1 mt-1" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="text-[11.5px] mb-2 mt-3" style={{ color: 'var(--ink-faint)' }}>비밀번호 변경 (선택 — 비워두면 유지됩니다)</div>
            <div className="space-y-2">
              <label className="block">
                <span className="flex items-center gap-1.5 text-[12px] font-medium mb-1" style={{ color: 'var(--ink-soft)' }}>
                  <KeyRound size={12} /> 새 비밀번호
                </span>
                <input
                  type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="6자 이상"
                  className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                  style={{ border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)' }}
                />
              </label>
              <label className="block">
                <span className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--ink-soft)' }}>새 비밀번호 확인</span>
                <input
                  type="password" value={pw2} onChange={(e) => setPw2(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                  style={{ border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)' }}
                />
              </label>
            </div>
          </div>

          {err && (
            <div className="text-[12px] px-3 py-2 rounded-lg" style={{ background: 'var(--rust-soft)', color: 'var(--rust)' }}>{err}</div>
          )}
          {done && (
            <div className="flex items-center gap-1.5 text-[12px] px-3 py-2 rounded-lg" style={{ background: 'var(--leaf-soft)', color: 'var(--moss)' }}>
              <CheckCircle2 size={13} /> {done}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-[13px] font-medium disabled:opacity-60"
              style={{ background: 'var(--moss)', color: 'var(--bg)' }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {saving ? '저장 중...' : '저장'}
            </button>
            <button
              type="button" onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-[13px] font-medium"
              style={{ border: '1px solid var(--line)', color: 'var(--ink-soft)' }}
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
