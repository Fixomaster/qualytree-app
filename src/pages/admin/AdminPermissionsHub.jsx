// src/pages/admin/AdminPermissionsHub.jsx
import React, { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, Check, ChevronDown, ChevronUp, RotateCcw, Save, Users, UserCog } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import { menuPermissions, MENU_MAP, DOMAIN_KEYS, loadOnboardingDepts, getUserDept, setUserDept } from '../../lib/menuPermissions'
import { supabase } from '../../lib/supabase'

const DOMAIN_ORDER = DOMAIN_KEYS

function buildDomainGroups() {
  const map = {}
  DOMAIN_ORDER.forEach(d => { map[d] = [] })
  MENU_MAP.forEach(m => { if (map[m.domain]) map[m.domain].push(m) })
  return map
}
const DOMAIN_GROUPS = buildDomainGroups()

const INP_CLS = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-blue-500'

export default function AdminPermissionsHub() {
  const user = auth.current()
  const level = user?.level ?? user?.permissionLevel ?? 0

  const depts = useMemo(() => loadOnboardingDepts(), [])
  const [tab, setTab] = useState('menus')

  // ─── 탭1: 부서별 메뉴 권한 ───────────────────────────────
  const [selDept, setSelDept] = useState(() => depts[0] || '')
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

  function toggleRoute(route) {
    setRouteMap(prev => ({ ...prev, [route]: !isAllowed(route) }))
    setSaved(false)
  }

  function toggleDomain(domain) {
    const items = DOMAIN_GROUPS[domain] || []
    const allOn = items.every(m => isAllowed(m.route))
    const update = {}
    items.forEach(m => { update[m.route] = !allOn })
    setRouteMap(prev => ({ ...prev, ...update }))
    setSaved(false)
  }

  function handleSave() {
    menuPermissions.setDeptMenus(selDept, routeMap)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleReset() {
    menuPermissions.resetDept(selDept)
    setRouteMap({})
    setSaved(false)
  }

  // ─── 탭2: 사용자 부서 배정 ───────────────────────────────
  const [members, setMembers] = useState([])
  const [memberDepts, setMemberDepts] = useState({})
  const [loadingMembers, setLoadingMembers] = useState(false)

  async function loadMembers() {
    setLoadingMembers(true)
    try {
      const { data } = await supabase.rpc('manager_context')
      const list = Array.isArray(data?.members) ? data.members : []
      setMembers(list)
      const ud = getAllUserDeptsLocal()
      const map = {}
      list.forEach(m => { map[m.email] = ud[m.email] || '' })
      setMemberDepts(map)
    } catch {}
    setLoadingMembers(false)
  }

  function getAllUserDeptsLocal() {
    try { return JSON.parse(localStorage.getItem('qt_user_dept') || '{}') } catch { return {} }
  }

  useEffect(() => { if (tab === 'users') loadMembers() }, [tab])

  function handleDeptChange(email, dept) {
    setUserDept(email, dept)
    setMemberDepts(prev => ({ ...prev, [email]: dept }))
  }

  const ROLE_LABEL = { 1: '작업자', 2: '검사관', 3: '매니저', operator: '작업자', inspector: '검사관', manager: '매니저' }
  const STATUS_CLS = { active: 'bg-emerald-100 text-emerald-700', pending: 'bg-amber-100 text-amber-700', suspended: 'bg-slate-200 text-slate-500' }


  if (level < 3 && !user?.isCompanyAdmin) {
    return (
      <AppLayout user={user} title="권한 관리" subtitle="관리자 전용">
        <div className="px-6 py-16 text-center text-slate-500">
          <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>매니저 이상만 접근할 수 있습니다.</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout user={user} title="권한 관리" subtitle="부서별 메뉴 접근 설정">
      <div className="px-6 lg:px-8 py-8 max-w-[960px]">

        {/* 탭 */}
        <div className="flex gap-1 mb-6 border-b border-slate-200">
          {[['menus','부서별 메뉴 권한'],['users','사용자 부서 배정',['approval','승인 설정']]].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab===k ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* ─── 탭1: 부서별 메뉴 ─── */}
        {tab === 'menus' && (
          <>
            <div className="mb-5 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                조직도 부서별로 접근 가능한 메뉴를 설정합니다. 매니저 계정은 부서 설정과 무관하게 전체 메뉴에 접근합니다.
                &nbsp;<Link to="/org-responsibility" className="underline text-blue-600">조직도 편집 →</Link>
              </span>
            </div>

            {depts.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p className="mb-2">등록된 부서가 없습니다.</p>
                <Link to="/org-responsibility" className="text-blue-600 underline text-sm">기본정보에서 조직도를 먼저 설정해주세요</Link>
              </div>
            ) : (
              <div className="flex gap-5">
                {/* 좌측 부서 목록 */}
                <div className="w-44 shrink-0">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">부서</p>
                  <div className="space-y-0.5">
                    {depts.map(dept => (
                      <button key={dept} onClick={() => setSelDept(dept)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-[13px] transition-colors ${selDept===dept ? 'bg-blue-600 text-white font-medium' : 'text-slate-700 hover:bg-slate-100'}`}>
                        {dept}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 우측 체크박스 */}
                {selDept && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold text-slate-800">{selDept} — 메뉴 권한</h2>
                      <div className="flex gap-2">
                        <button onClick={handleReset}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
                          <RotateCcw className="w-3 h-3" /> 초기화
                        </button>
                        <button onClick={handleSave}
                          className={`flex items-center gap-1 px-2.5 py-1.5 text-[12px] rounded-lg ${saved ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
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
                        const someOn = items.some(m => isAllowed(m.route))
                        const isOpen = openDomains[domain] !== false

                        
return (
                          <div key={domain} className="border border-slate-200 rounded-lg overflow-hidden">
                            <div className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 cursor-pointer hover:bg-slate-100"
                              onClick={() => setOpenDomains(p => ({ ...p, [domain]: !isOpen }))}>
                              <input type="checkbox" checked={allOn}
                                ref={el => { if (el) el.indeterminate = !allOn && someOn }}
                                onChange={() => toggleDomain(domain)}
                                onClick={e => e.stopPropagation()}
                                className="w-4 h-4 cursor-pointer accent-blue-600" />
                              <span className="text-[13px] font-medium text-slate-700 flex-1">{domain}</span>
                              <span className="text-[11px] text-slate-400">{items.filter(m=>isAllowed(m.route)).length}/{items.length}</span>
                              {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                            </div>
                            {isOpen && (
                              <div className="divide-y divide-slate-100">
                                {items.map(m => (
                                  <label key={m.route} className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-blue-50 cursor-pointer">
                                    <input type="checkbox" checked={isAllowed(m.route)} onChange={() => toggleRoute(m.route)}
                                      className="w-4 h-4 cursor-pointer accent-blue-600" />
                                    <span className="text-[13px] text-slate-700 flex-1">{m.label}</span>
                                    <span className="text-[11px] text-slate-400 font-mono">{m.route}</span>
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

        {/* ─── 탭2: 사용자 부서 배정 ─── */}
        {tab === 'users' && (
          <>
            <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex items-start gap-2">
              <UserCog className="w-4 h-4 mt-0.5 shrink-0" />
              <span>각 사용자의 소속 부서를 지정합니다. 부서에 따라 접근 가능한 메뉴가 결정됩니다.</span>
            </div>

            {loadingMembers ? (
              <div className="text-center py-12 text-slate-400">불러오는 중...</div>
            ) : members.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p>등록된 사용자가 없습니다.</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-[13px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase">이름</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase">역할</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase">상태</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase">소속 부서</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {members.filter(m => m.status !== 'removed').map(m => (
                      <tr key={m.member_id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-medium text-slate-800">{m.name}</td>
                        <td className="px-4 py-2.5 text-slate-500">{ROLE_LABEL[m.role] || m.role}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_CLS[m.status] || 'bg-slate-100 text-slate-500'}`}>
                            {m.status === 'active' ? '활성' : m.status === 'pending' ? '승인대기' : m.status === 'suspended' ? '정지' : m.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <select value={memberDepts[m.email] || ''}
                            onChange={e => handleDeptChange(m.email, e.target.value)}
                            className="border border-slate-200 rounded-lg px-2 py-1 text-[12px] text-slate-700 focus:outline-none focus:border-blue-500 bg-white">
                            <option value="">부서 없음 (전체 접근)</option>
                            {depts.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
        {tab === 'approval' && (
        )}
      </div>
    </AppLayout>
  )
}
