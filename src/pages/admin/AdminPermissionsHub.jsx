// src/pages/admin/AdminPermissionsHub.jsx
import React, { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck, Check, ChevronDown, ChevronUp, RotateCcw, Save, Users,
  UserPlus, Pause, Play, Trash2, Copy,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import { menuPermissions, MENU_MAP, DOMAIN_KEYS, loadOnboardingDepts, setUserDept } from '../../lib/menuPermissions'
import { supabase } from '../../lib/supabase'

const DOMAIN_ORDER = DOMAIN_KEYS
function buildDomainGroups() {
  const map = {}
  DOMAIN_ORDER.forEach(d => { map[d] = [] })
  MENU_MAP.forEach(m => { if (map[m.domain]) map[m.domain].push(m) })
  return map
}
const DOMAIN_GROUPS = buildDomainGroups()

const ROLE_LABEL = { 1: '작업자', 2: '검사관', 3: '매니저' }
const STATUS_LABEL = { active: '활성', pending: '승인대기', suspended: '정지', removed: '삭제됨' }
const STATUS_COLOR = {
  active: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  suspended: 'bg-slate-200 text-slate-600',
}

export default function AdminPermissionsHub() {
  const user = auth.current()
  const level = user?.level ?? user?.permissionLevel ?? 0
  const [tab, setTab] = useState('members')
  const depts = useMemo(() => loadOnboardingDepts(), [])

  // ── 탭1: 직원 관리 ──
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [ctx, setCtx] = useState(null)
  const [form, setForm] = useState({ name: '', role: 'operator', password: '', expires_at: '' })
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState(null)
  const [rowMsg, setRowMsg] = useState(null)
  const [memberDepts, setMemberDepts] = useState({})

  function getAllUserDeptsLocal() {
    try { return JSON.parse(localStorage.getItem('qt_user_dept') || '{}') } catch { return {} }
  }

  const loadCtx = async () => {
    setErr('')
    const { data, error } = await supabase.rpc('manager_context')
    if (error) setErr(typeof error.message === 'string' ? error.message : '로드 실패')
    else {
      setCtx(data)
      const ud = getAllUserDeptsLocal()
      const map = {}
      const list = Array.isArray(data?.members) ? data.members : []
      list.forEach(m => { map[m.email] = ud[m.email] || '' })
      setMemberDepts(map)
    }
    setLoading(false)
  }

  useEffect(() => { loadCtx() }, [])

  const create = async (e) => {
    e?.preventDefault?.()
    setBusy(true); setErr(''); setCreated(null); setRowMsg(null)
    const payload = { p_name: form.name.trim(), p_role: form.role, p_password: form.password, p_expires_at: form.expires_at || null }
    const { data, error } = await supabase.rpc('manager_create_member', payload)
    if (error) setErr(typeof error.message === 'string' ? error.message : '생성 실패')
    else { setCreated({ ...(data || {}), password: form.password }); setForm({ name: '', role: form.role, password: '', expires_at: '' }); await loadCtx() }
    setBusy(false)
  }

  const act = async (id, action) => {
    setBusy(true); setErr(''); setRowMsg(null)
    const { data, error } = await supabase.rpc('manager_update_member', { p_member_id: id, p_action: action })
    if (error) setErr(typeof error.message === 'string' ? error.message : '처리 실패')
    else { if (data && data.temp_password) setRowMsg(data); await loadCtx() }
    setBusy(false)
  }

  function handleDeptChange(email, dept) {
    setUserDept(email, dept)
    setMemberDepts(prev => ({ ...prev, [email]: dept }))
  }

  const copy = (t) => { try { navigator.clipboard.writeText(t) } catch {} }

  // ── 탭2: 메뉴 권한 ──
  const [selDept, setSelDept] = useState(() => depts[0]?.id || '')
  const [routeMap, setRouteMap] = useState({})
  const [openDomains, setOpenDomains] = useState({})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!selDept) return
    const raw = menuPermissions.getRawDeptPerms(selDept)
    setRouteMap(raw ? { ...raw } : {})
    setSaved(false)
  }, [selDept])

  function isAllowed(route) { return routeMap[route] !== false }
  function toggleRoute(route) { setRouteMap(prev => ({ ...prev, [route]: !isAllowed(route) })); setSaved(false) }
  function toggleDomain(domain) {
    const items = DOMAIN_GROUPS[domain] || []
    const allOn = items.every(m => isAllowed(m.route))
    const update = {}
    items.forEach(m => { update[m.route] = !allOn })
    setRouteMap(prev => ({ ...prev, ...update })); setSaved(false)
  }
  function handleSave() { menuPermissions.setDeptMenus(selDept, routeMap); setSaved(true); setTimeout(() => setSaved(false), 2000) }
  function handleReset() { menuPermissions.resetDept(selDept); setRouteMap({}); setSaved(false) }

  if (level < 3 && !user?.isCompanyAdmin) {
    return (
      <AppLayout user={user} title="계정 관리" subtitle="관리자 전용">
        <div className="px-6 py-16 text-center text-slate-500">
          <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>매니저 이상만 접근할 수 있습니다.</p>
        </div>
      </AppLayout>
    )
  }

  const members = Array.isArray(ctx?.members) ? ctx.members.filter(m => m.status !== 'removed') : []
  const pending = members.filter(m => m.status === 'pending')
  const bizNo = ctx?.business_number || ''
  const seatText = ctx ? (ctx.seats > 0 ? ctx.used_seats + ' / ' + ctx.seats + '석' : ctx.used_seats + '명 (무제한)') : ''

  return (
    <AppLayout user={user} title="계정 관리" subtitle="직원 계정 및 메뉴 권한 관리">
      <div className="px-6 lg:px-8 py-8 max-w-[960px]">
        <div className="flex gap-1 mb-6 border-b border-slate-200">
          {[['members', '직원 관리'], ['menus', '메뉴 권한']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === k ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {l}
            </button>
          ))}
        </div>

        {tab === 'members' && (
          <>
            {err && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{err}</div>}
            <form onSubmit={create} className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
              <div className="text-[15px] font-semibold text-slate-900 mb-3 flex items-center gap-1.5">
                <UserPlus size={16} /> 계정 발급 (입사)
                {seatText && <span className="ml-auto text-xs font-normal text-slate-500">좌석: {seatText}</span>}
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-[12px] font-medium text-slate-600 mb-1">이름 (로그인 ID)</span>
                  <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-blue-500" placeholder="홍길동" />
                </label>
                <label className="block">
                  <span className="block text-[12px] font-medium text-slate-600 mb-1">임시 비밀번호</span>
                  <input type="text" required minLength={4} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-blue-500" placeholder="4자 이상" />
                </label>
                <label className="block">
                  <span className="block text-[12px] font-medium text-slate-600 mb-1">역할</span>
                  <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-blue-500">
                    <option value="operator">작업자 (승인 후 활성)</option>
                    <option value="inspector">검사관 (즉시 활성)</option>
                  </select>
                </label>
              </div>
              <button type="submit" disabled={busy}
                className="mt-3 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium">
                {busy ? '처리 중...' : '계정 발급'}
              </button>
              {created && (
                <div className="mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-[13px] text-emerald-900">
                  <div className="font-semibold mb-1">✅ 계정 발급 완료 — 직원에게 전달하세요</div>
                  <div className="mt-1 p-2 rounded bg-white border border-emerald-200 leading-relaxed">
                    <div>· 사업자번호: <code className="font-bold">{bizNo}</code></div>
                    <div>· 이름: <code className="font-bold">{created.name}</code></div>
                    <div className="flex items-center gap-2">· 비밀번호: <code className="font-bold">{created.password}</code>
                      <button type="button" onClick={() => copy(created.password)} className="text-emerald-700"><Copy size={13} /></button>
                    </div>
                  </div>
                </div>
              )}
              {rowMsg && (
                <div className="mt-3 p-3 rounded-lg bg-sky-50 border border-sky-200 text-[13px]">
                  <div className="font-semibold mb-1">비밀번호 재발급</div>
                  <div className="flex items-center gap-2">새 비밀번호: <code className="font-bold">{rowMsg.temp_password}</code>
                    <button type="button" onClick={() => copy(rowMsg.temp_password)} className="text-sky-700"><Copy size={13} /></button>
                  </div>
                </div>
              )}
            </form>

            {pending.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <div className="text-[14px] font-semibold text-amber-800 mb-2">승인 대기 {pending.length}건</div>
                {pending.map(m => (
                  <div key={m.id} className="flex items-center justify-between py-1.5 text-[13px]">
                    <span>{m.name} <span className="text-slate-500">({ROLE_LABEL[m.permission_level]})</span></span>
                    <span className="flex gap-2">
                      <button onClick={() => act(m.id, 'approve')} disabled={busy} className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white text-[12px]"><Check size={12} /> 승인</button>
                      <button onClick={() => act(m.id, 'remove')} disabled={busy} className="px-2.5 py-1 rounded border border-slate-300 text-slate-600 text-[12px]">거절</button>
                    </span>
                  </div>
                ))}
              </div>
            )}

            {loading ? (
              <div className="text-center py-12 text-slate-400">불러오는 중...</div>
            ) : members.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p>등록된 직원이 없습니다.</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-[13px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase">이름</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase">역할</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase">상태</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase">부서</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-slate-500 uppercase">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {members.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-medium text-slate-800">
                          {m.name}{m.is_admin && <span className="ml-1 text-[10px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded">관리자</span>}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500">{ROLE_LABEL[m.permission_level] || m.role}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLOR[m.status] || 'bg-slate-100 text-slate-500'}`}>
                            {STATUS_LABEL[m.status] || m.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {m.is_admin ? <span className="text-slate-300 text-[12px]">—</span> : (
                            <select value={memberDepts[m.email] || ''} onChange={e => handleDeptChange(m.email, e.target.value)}
                              className="border border-slate-200 rounded-lg px-2 py-1 text-[12px] focus:outline-none focus:border-blue-500 bg-white">
                              <option value="">미지정</option>
                              {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {m.is_admin ? <span className="text-slate-300">—</span> : (
                            <span className="inline-flex gap-1.5">
                              {m.status === 'pending' && <button title="승인" onClick={() => act(m.id, 'approve')} disabled={busy} className="p-1.5 rounded border border-slate-200 text-emerald-600 hover:bg-emerald-50"><Check size={14} /></button>}
                              {m.status === 'active' && <button title="정지" onClick={() => act(m.id, 'suspend')} disabled={busy} className="p-1.5 rounded border border-slate-200 text-amber-600 hover:bg-amber-50"><Pause size={14} /></button>}
                              {m.status === 'suspended' && <button title="활성화" onClick={() => act(m.id, 'activate')} disabled={busy} className="p-1.5 rounded border border-slate-200 text-blue-600 hover:bg-blue-50"><Play size={14} /></button>}
                              <button title="비밀번호 재발급" onClick={() => act(m.id, 'reset_password')} disabled={busy} className="p-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50"><RotateCcw size={14} /></button>
                              <button title="퇴사 처리" onClick={() => { if(window.confirm(m.name + ' 계정을 삭제(퇴사)하시겠습니까?')) act(m.id, 'remove') }} disabled={busy} className="p-1.5 rounded border border-slate-200 text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === 'menus' && (
          <>
            <div className="mb-5 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
              <span>조직도 부서별로 접근 가능한 메뉴를 설정합니다. 관리자는 부서 설정과 무관하게 전체 메뉴에 접근합니다.</span>
            </div>
            {depts.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p className="mb-2">등록된 부서가 없습니다.</p>
                <Link to="/org-responsibility" className="text-blue-600 underline text-sm">기본정보에서 조직도를 먼저 설정해주세요</Link>
              </div>
            ) : (
              <div className="flex gap-5">
                <div className="w-44 shrink-0">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">부서</p>
                  <div className="space-y-0.5">
                    {depts.map(dept => (
                      <button key={dept.id} onClick={() => setSelDept(dept.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-[13px] transition-colors ${selDept === dept.id ? 'bg-blue-600 text-white font-medium' : 'text-slate-700 hover:bg-slate-100'}`}>
                        {dept.name}
                      </button>
                    ))}
                  </div>
                </div>
                {selDept && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold text-slate-800">{depts.find(d => d.id === selDept)?.name || selDept} — 메뉴 권한</h2>
                      <div className="flex gap-2">
                        <button onClick={handleReset} className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
                          <RotateCcw className="w-3 h-3" /> 초기화
                        </button>
                        <button onClick={handleSave} className={`flex items-center gap-1 px-2.5 py-1.5 text-[12px] rounded-lg ${saved ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                          {saved ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                          {saved ? '저장됨' : '저장'}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {DOMAIN_ORDER.map(domain => {
                        const items = DOMAIN_GROUPS[domain] || []
                        if (!items.length) return null
                        const allOn = items.every(m => isAllowed(m.route))
                        const isOpen = openDomains[domain] !== false
                        return (
                          <div key={domain} className="border border-slate-200 rounded-lg overflow-hidden">
                            <div className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 cursor-pointer hover:bg-slate-100"
                              onClick={() => setOpenDomains(p => ({ ...p, [domain]: !isOpen }))}>
                              <input type="checkbox" checked={allOn}
                                ref={el => { if (el) el.indeterminate = !allOn && items.some(m => isAllowed(m.route)) }}
                                onChange={() => toggleDomain(domain)} onClick={e => e.stopPropagation()}
                                className="w-4 h-4 cursor-pointer accent-blue-600" />
                              <span className="text-[13px] font-medium text-slate-700 flex-1">{domain}</span>
                              <span className="text-[11px] text-slate-400">{items.filter(m => isAllowed(m.route)).length}/{items.length}</span>
                              {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                            </div>
                            {isOpen && (
                              <div className="px-3 py-2 space-y-1.5 bg-white">
                                {items.map(m => (
                                  <label key={m.route} className="flex items-center gap-2.5 cursor-pointer group">
                                    <input type="checkbox" checked={isAllowed(m.route)} onChange={() => toggleRoute(m.route)}
                                      className="w-4 h-4 cursor-pointer accent-blue-600" />
                                    <span className="text-[13px] text-slate-600 group-hover:text-slate-900">{m.label}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}
