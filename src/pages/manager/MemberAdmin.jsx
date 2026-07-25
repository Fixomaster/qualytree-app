// src/pages/manager/MemberAdmin.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, UserPlus, Check, RotateCcw, Trash2, Pause, Play, Copy, LayoutGrid } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { menuPermissions, DOMAIN_KEYS } from '../../lib/menuPermissions'

const ROLE_LABEL = { 1: '작업자', 2: '검사관', 3: '매니저' }
const STATUS_LABEL = { active: '활성', pending: '승인대기', suspended: '정지', removed: '삭제됨' }
const STATUS_COLOR = {
  active: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  suspended: 'bg-slate-200 text-slate-600',
}

export default function MemberAdmin() {
  const nav = useNavigate()
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [ctx, setCtx] = useState(null)
  const [form, setForm] = useState({ name: '', role: 'operator', password: '', expires_at: '' })
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState(null)
  const [rowMsg, setRowMsg] = useState(null)
  const [expandedPerms, setExpandedPerms] = useState(null)
  const [localPerms, setLocalPerms] = useState({})

  const getPerms = (id) => {
    if (localPerms[id]) return localPerms[id]
    const saved = menuPermissions.getForUser(id)
    return saved || Object.fromEntries(DOMAIN_KEYS.map(k => [k, true]))
  }
  const togglePerm = (id, key, val) => {
    menuPermissions.toggle(id, key, val)
    setLocalPerms(p => ({ ...p, [id]: { ...getPerms(id), [key]: val } }))
  }
  const resetPerms = (id) => {
    menuPermissions.reset(id)
    setLocalPerms(p => { const n = { ...p }; delete n[id]; return n })
  }

  const load = async () => {
    setErr('')
    const { data, error } = await supabase.rpc('manager_context')
    if (error) { setErr(typeof error.message === 'string' ? error.message : '불러오기 실패'); setCtx(null) }
    else setCtx(data)
    setLoading(false)
  }
  useEffect(() => { load() /* eslint-disable-next-line */ }, [])

  const create = async (e) => {
    e?.preventDefault?.()
    setBusy(true); setErr(''); setCreated(null); setRowMsg(null)
    const payload = {
      p_name: form.name.trim(),
      p_role: form.role,
      p_password: form.password,
      p_expires_at: form.role === 'inspector' && form.expires_at ? new Date(form.expires_at).toISOString() : null,
    }
    const { data, error } = await supabase.rpc('manager_create_member', payload)
    if (error) setErr(typeof error.message === 'string' ? error.message : '생성 실패')
    else {
      setCreated({ ...(data || {}), password: form.password })
      setForm({ name: '', role: form.role, password: '', expires_at: '' })
      await load()
    }
    setBusy(false)
  }

  const act = async (id, action) => {
    setBusy(true); setErr(''); setRowMsg(null)
    const { data, error } = await supabase.rpc('manager_update_member', { p_member_id: id, p_action: action })
    if (error) setErr(typeof error.message === 'string' ? error.message : '처리 실패')
    else { if (data && data.temp_password) setRowMsg(data); await load() }
    setBusy(false)
  }

  const copy = (t) => { try { navigator.clipboard.writeText(t) } catch { /* */ } }
  const bizNo = ctx && ctx.business_number ? ctx.business_number : (created && created.business_number) || ''

  if (loading) return <div className="min-h-screen grid place-items-center text-slate-500">불러오는 중...</div>

  if (!ctx) {
    return (
      <div className="min-h-screen grid place-items-center px-6">
        <div className="text-center">
          <p className="text-slate-700 mb-3">{err || '매니저 권한이 필요합니다.'}</p>
          <button onClick={() => nav('/home')} className="text-emerald-700 text-sm">← 홈으로</button>
        </div>
      </div>
    )
  }

  const seatText = ctx.seats > 0 ? `${ctx.used_seats} / ${ctx.seats}석` : `${ctx.used_seats}명 (무제한)`
  const members = Array.isArray(ctx.members) ? ctx.members : []
  const pending = members.filter((m) => m.status === 'pending')

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-6">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => nav('/home')} className="flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-800 mb-3">
          <ArrowLeft size={15} /> 홈으로
        </button>

        <div className="flex items-end justify-between flex-wrap gap-3 mb-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">계정 관리 <span className="text-base font-normal text-slate-500">{ctx.company_name}</span></h1>
            <p className="text-xs text-slate-500 mt-1">작업자·검사관은 <b>사업자번호 + 이름 + 비밀번호</b>로 로그인합니다 (이메일 불필요).</p>
          </div>
          <div className="text-sm text-slate-600 text-right">
            <div>좌석 사용: <b className="text-slate-900">{seatText}</b></div>
            {bizNo && <div className="text-[12px] text-slate-500">회사 사업자번호: <b className="text-slate-700">{bizNo}</b></div>}
          </div>
        </div>

        {err && <div className="mb-3 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">{err}</div>}

        <form onSubmit={create} className="bg-white border border-slate-200 rounded-xl p-4 mb-4 mt-2">
          <div className="text-[15px] font-semibold text-slate-900 mb-3 flex items-center gap-1.5"><UserPlus size={16} /> 계정 발급</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-[12px] font-medium text-slate-600 mb-1">이름 (로그인 ID로 사용)</span>
              <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-emerald-500" placeholder="홍길동" />
            </label>
            <label className="block">
              <span className="block text-[12px] font-medium text-slate-600 mb-1">임시 비밀번호 (본인에게 전달)</span>
              <input type="text" required minLength={4} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-emerald-500" placeholder="4자 이상" />
            </label>
            <label className="block">
              <span className="block text-[12px] font-medium text-slate-600 mb-1">역할</span>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-emerald-500">
                <option value="operator">작업자 — 공정·검사 입력 (승인 후 활성, 좌석 차감)</option>
                <option value="inspector">검사관 — 읽기 전용 임시 계정 (즉시 활성, 좌석 무관)</option>
              </select>
            </label>
            {form.role === 'inspector' && (
              <label className="block">
                <span className="block text-[12px] font-medium text-slate-600 mb-1">만료일 (선택)</span>
                <input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-emerald-500" />
              </label>
            )}
          </div>
          <button type="submit" disabled={busy}
            className="mt-3 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium">
            {busy ? '처리 중...' : '계정 발급'}
          </button>

          {created && (
            <div className="mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-[13px] text-emerald-900">
              <div className="font-semibold mb-1">✓ 계정이 생성되었습니다 {created.status === 'pending' && '(승인대기)'}</div>
              <div className="mt-1 p-2 rounded bg-white border border-emerald-200 leading-relaxed">
                <div>· 사업자번호: <code className="font-bold">{created.business_number || bizNo}</code></div>
                <div>· 이름: <code className="font-bold">{created.name}</code></div>
                <div className="flex items-center gap-2">· 비밀번호: <code className="font-bold">{created.password}</code>
                  <button type="button" onClick={() => copy(created.password)} className="text-emerald-700"><Copy size={13} /></button>
                </div>
              </div>
              {created.status === 'pending' && <div className="text-emerald-700 mt-1">아래 목록에서 "승인"해야 로그인이 활성화됩니다.</div>}
            </div>
          )}
          {rowMsg && (
            <div className="mt-3 p-3 rounded-lg bg-sky-50 border border-sky-200 text-[13px] text-sky-900">
              <div className="font-semibold mb-1">비밀번호가 재발급되었습니다</div>
              <div className="flex items-center gap-2">새 임시 비밀번호: <code className="font-bold">{rowMsg.temp_password}</code>
                <button type="button" onClick={() => copy(rowMsg.temp_password)} className="text-sky-700"><Copy size={13} /></button>
              </div>
            </div>
          )}
        </form>

        {pending.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <div className="text-[14px] font-semibold text-amber-800 mb-2">승인 대기 {pending.length}건</div>
            {pending.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-1.5 text-[13px]">
                <span className="text-slate-800">{m.name} <span className="text-slate-500">({ROLE_LABEL[m.permission_level]})</span></span>
                <span className="flex gap-2">
                  <button onClick={() => act(m.id, 'approve')} disabled={busy} className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white"><Check size={13} /> 승인</button>
                  <button onClick={() => act(m.id, 'remove')} disabled={busy} className="px-2.5 py-1 rounded border border-slate-300 text-slate-600">거절</button>
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left font-medium px-4 py-2">이름</th>
                <th className="text-left font-medium px-3 py-2">역할</th>
                <th className="text-left font-medium px-3 py-2">상태</th>
                <th className="text-right font-medium px-4 py-2">관리</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <React.Fragment key={m.id}>
                  <tr className="border-t border-slate-100">
                    <td className="px-4 py-2.5 text-slate-900 font-medium">{m.name}</td>
                    <td className="px-3 py-2.5 text-slate-700">
                      {ROLE_LABEL[m.permission_level]}{m.is_admin && ' (관리자)'}
                      {m.expires_at && <div className="text-[11px] text-slate-400">~{String(m.expires_at).slice(0, 10)}</div>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={'px-2 py-0.5 rounded-full text-[11px] ' + (STATUS_COLOR[m.status] || 'bg-slate-100 text-slate-500')}>
                        {STATUS_LABEL[m.status] || m.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {m.is_admin ? <span className="text-slate-300">—</span> : (
                        <span className="inline-flex gap-1.5">
                          {m.status === 'pending' && (
                            <button title="승인" onClick={() => act(m.id, 'approve')} disabled={busy}
                              className="p-1.5 rounded border border-slate-200 text-emerald-600 hover:bg-emerald-50"><Check size={14} /></button>
                          )}
                          {m.status === 'active' && (
                            <button title="정지" onClick={() => act(m.id, 'suspend')} disabled={busy}
                              className="p-1.5 rounded border border-slate-200 text-slate-500 hover:bg-slate-50"><Pause size={14} /></button>
                          )}
                          {m.status === 'suspended' && (
                            <button title="재활성" onClick={() => act(m.id, 'reactivate')} disabled={busy}
                              className="p-1.5 rounded border border-slate-200 text-emerald-600 hover:bg-emerald-50"><Play size={14} /></button>
                          )}
                          <button title="비밀번호 재발급" onClick={() => act(m.id, 'reset_password')} disabled={busy}
                            className="p-1.5 rounded border border-slate-200 text-sky-600 hover:bg-sky-50"><RotateCcw size={14} /></button>
                          <button title="삭제" onClick={() => act(m.id, 'remove')} disabled={busy}
                            className="p-1.5 rounded border border-slate-200 text-rose-600 hover:bg-rose-50"><Trash2 size={14} /></button>
                          <button
                            title="메뉴 권한"
                            onClick={() => setExpandedPerms(expandedPerms === m.id ? null : m.id)}
                            className={'p-1.5 rounded border ' + (expandedPerms === m.id ? 'border-emerald-400 text-emerald-600 bg-emerald-50' : 'border-slate-200 text-slate-500 hover:bg-slate-50')}
                          >
                            <LayoutGrid size={14} />
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                  {expandedPerms === m.id && (
                    <tr className="bg-slate-50 border-t border-slate-100">
                      <td colSpan={4} className="px-6 py-4">
                        <div className="text-[12px] font-semibold text-slate-600 mb-2.5">
                          메뉴 노출 권한 — {m.name}
                        </div>
                        <div className="flex flex-wrap gap-x-5 gap-y-2">
                          {DOMAIN_KEYS.map(k => (
                            <label key={k} className="flex items-center gap-1.5 text-[12px] text-slate-700 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={getPerms(m.id)[k] !== false}
                                onChange={e => togglePerm(m.id, k, e.target.checked)}
                                className="accent-emerald-600 w-3.5 h-3.5 cursor-pointer"
                              />
                              {k}
                            </label>
                          ))}
                        </div>
                        <div className="mt-2 flex items-center gap-3">
                          <button onClick={() => resetPerms(m.id)}
                            className="text-[11px] text-slate-400 hover:text-slate-700 underline">
                            전체 허용으로 초기화
                          </button>
                          <span className="text-[11px] text-slate-300">변경 즉시 저장됩니다</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
