// src/pages/org-responsibility/OrgResponsibilityHub.jsx
// ISO 13485 §5.5 — 책임·권한 및 의사소통
import React, { useState, useMemo } from 'react'
import {
  Plus, Save, Edit2, Trash2, User, Users,
  Building2, MessageSquare, ShieldCheck, Star,
  ChevronDown, ChevronRight, Link2, BarChart2,
  Check, X, Minus,
  Network,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'

// ── 상수 ─────────────────────────────────────────────────────
const LS_KEY_ROLES   = 'qualytree.org_roles'
const LS_KEY_COMMS   = 'qualytree.org_comms'

// 역할 레벨
const ROLE_LEVELS = [
  { value: 'executive',  label: '경영진',     color: '#7C3AED', bg: '#EDE9FE' },
  { value: 'director',   label: '부서장',     color: '#2563EB', bg: '#DBEAFE' },
  { value: 'manager',    label: '팀장·담당',  color: '#059669', bg: '#D1FAE5' },
  { value: 'operator',   label: '실무자',     color: '#D97706', bg: '#FEF3C7' },
  { value: 'external',   label: '외부·위탁',  color: '#6B7280', bg: '#F3F4F6' },
]

// 부서
const DEPTS = ['경영진', '품질부', '생산부', '개발부', '영업부', '구매부', '설비부', '문서관리', '인허가', '기타']

// §5.5에서 요구하는 핵심 QMS 프로세스 (RACI 행)
const QMS_PROCESSES = [
  '품질방침 수립 및 검토',
  '품질목표 설정 및 모니터링',
  '경영검토 주관',
  '내부감사 계획 및 실시',
  '문서 승인 및 배포',
  '부적합품 관리',
  '시정·예방조치 (CAPA)',
  '고객불만 처리',
  '공급업체 평가·승인',
  '설계·개발 관리',
  '생산·공정 관리',
  '교정·설비 관리',
  '위험관리 (ISO 14971)',
  '인허가·규제 대응',
  '교육훈련 계획 및 실시',
  '변경 관리',
]

// 커뮤니케이션 유형
const COMM_TYPES = [
  '경영검토 회의', '부서 회의', '전사 공지', '업무 지시', '교육', 'QMS 공지', '품질 이슈 공유', '기타'
]
const COMM_STATUSES = {
  planned:   { label: '계획',   color: '#9CA3AF', bg: '#F3F4F6' },
  completed: { label: '완료',   color: '#059669', bg: '#D1FAE5' },
  recurring: { label: '정기',   color: '#2563EB', bg: '#DBEAFE' },
}

// RACI 값
const RACI = {
  R: { label: 'R', desc: '실행 책임', color: '#2563EB', bg: '#DBEAFE' },
  A: { label: 'A', desc: '최종 승인', color: '#7C3AED', bg: '#EDE9FE' },
  C: { label: 'C', desc: '협의 필요', color: '#D97706', bg: '#FEF3C7' },
  I: { label: 'I', desc: '통보 대상', color: '#059669', bg: '#D1FAE5' },
  '': { label: '-', desc: '해당 없음', color: '#D1D5DB', bg: 'transparent' },
}

function genRoleId() { return `ROLE-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }
function genCommId() { return `COMM-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }
function today() { return new Date().toISOString().slice(0, 10) }

const EMPTY_ROLE = {
  name: '', title: '', dept: '품질부', level: 'manager',
  isMR: false,      // 경영대리인 (§5.5.2)
  responsibilities: '',   // 주요 책임
  authorities: '',        // 권한
  qualifications: '',     // 자격 요건
  reportTo: '',           // 보고 대상 (다른 역할 id)
  email: '', phone: '',
  linkedCompetencyId: '',
  notes: '',
  raciMap: {},            // { processName: 'R'|'A'|'C'|'I'|'' }
}

const EMPTY_COMM = {
  title: '', type: '부서 회의', frequency: '월1회',
  participants: '', responsible: '',
  agenda: '', medium: '대면 회의',
  status: 'recurring', lastDate: '', nextDate: '',
  notes: '',
}

// ── 메인 ─────────────────────────────────────────────────────
export default function OrgResponsibilityHub() {
  const user = auth.current()
  const canEdit = user?.level >= 2

  const [roles, setRoles] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY_ROLES) || '[]') } catch { return [] }
  })
  const [comms, setComms] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY_COMMS) || '[]') } catch { return [] }
  })

  const [tab, setTab] = useState('roles')   // roles | raci | comms | analysis
  const [showRoleForm, setShowRoleForm] = useState(false)
  const [showCommForm, setShowCommForm] = useState(false)
  const [roleForm, setRoleForm] = useState(EMPTY_ROLE)
  const [commForm, setCommForm] = useState(EMPTY_COMM)
  const [editRoleId, setEditRoleId] = useState(null)
  const [editCommId, setEditCommId] = useState(null)
  const [expandedRole, setExpandedRole] = useState(null)
  const [filterDept, setFilterDept] = useState('all')
  const [filterLevel, setFilterLevel] = useState('all')

  function saveRoles(list) { setRoles(list); localStorage.setItem(LS_KEY_ROLES, JSON.stringify(list)) }
  function saveComms(list) { setComms(list); localStorage.setItem(LS_KEY_COMMS, JSON.stringify(list)) }

  function submitRole() {
    if (!roleForm.name.trim()) return alert('담당자명을 입력하세요.')
    if (!roleForm.title.trim()) return alert('직책/역할명을 입력하세요.')
    const isEdit = !!editRoleId
    const obj = isEdit
      ? roles.map(r => r.id === editRoleId ? { ...r, ...roleForm } : r)
      : [{ id: genRoleId(), createdAt: today(), ...roleForm }, ...roles]
    saveRoles(obj)
    setShowRoleForm(false); setRoleForm(EMPTY_ROLE); setEditRoleId(null)
  }

  function submitComm() {
    if (!commForm.title.trim()) return alert('커뮤니케이션 제목을 입력하세요.')
    const isEdit = !!editCommId
    const obj = isEdit
      ? comms.map(c => c.id === editCommId ? { ...c, ...commForm } : c)
      : [{ id: genCommId(), createdAt: today(), ...commForm }, ...comms]
    saveComms(obj)
    setShowCommForm(false); setCommForm(EMPTY_COMM); setEditCommId(null)
  }

  function deleteRole(id) { if (confirm('역할을 삭제하시겠습니까?')) saveRoles(roles.filter(r => r.id !== id)) }
  function deleteComm(id) { if (confirm('커뮤니케이션 항목을 삭제하시겠습니까?')) saveComms(comms.filter(c => c.id !== id)) }

  // RACI 셀 토글 (순환: '' → R → A → C → I → '')
  const RACI_CYCLE = ['', 'R', 'A', 'C', 'I']
  function cycleRaci(roleId, process) {
    if (!canEdit) return
    setRoles(prev => {
      const updated = prev.map(r => {
        if (r.id !== roleId) return r
        const cur = (r.raciMap || {})[process] || ''
        const idx = RACI_CYCLE.indexOf(cur)
        const next = RACI_CYCLE[(idx + 1) % RACI_CYCLE.length]
        return { ...r, raciMap: { ...(r.raciMap || {}), [process]: next } }
      })
      localStorage.setItem(LS_KEY_ROLES, JSON.stringify(updated))
      return updated
    })
  }

  const filteredRoles = useMemo(() => roles.filter(r => {
    if (filterDept !== 'all' && r.dept !== filterDept) return false
    if (filterLevel !== 'all' && r.level !== filterLevel) return false
    return true
  }), [roles, filterDept, filterLevel])

  const mrRole = roles.find(r => r.isMR)

  // 분석
  const analysis = useMemo(() => {
    const byDept = {}
    DEPTS.forEach(d => { byDept[d] = roles.filter(r => r.dept === d).length })
    const byLevel = {}
    ROLE_LEVELS.forEach(l => { byLevel[l.value] = roles.filter(r => r.level === l.value).length })
    // RACI 커버리지: 각 프로세스마다 R 담당자 있는지
    const raciCoverage = QMS_PROCESSES.map(p => ({
      process: p,
      hasR: roles.some(r => (r.raciMap || {})[p] === 'R'),
      hasA: roles.some(r => (r.raciMap || {})[p] === 'A'),
    }))
    const uncovered = raciCoverage.filter(p => !p.hasR)
    return { byDept, byLevel, raciCoverage, uncovered }
  }, [roles])

  return (
    <AppLayout user={user} title="조직 및 책임 관리" subtitle="ISO 13485 §5.5 — 책임·권한·경영대리인·내부 커뮤니케이션">
      <div className="px-6 lg:px-8 py-6 max-w-[1800px] mx-auto">

        {/* 경영대리인 배너 (§5.5.2) */}
        {mrRole ? (
          <div className="mb-5 p-4 rounded-2xl flex items-center gap-3"
            style={{ background: '#EDE9FE', border: '1.5px solid #7C3AED40' }}>
            <ShieldCheck size={20} style={{ color: '#7C3AED', flexShrink: 0 }} />
            <div>
              <span className="text-[12px] font-bold" style={{ color: '#7C3AED' }}>§5.5.2 경영대리인 (Management Representative)</span>
              <span className="ml-3 text-[13px] font-semibold" style={{ color: '#4C1D95' }}>{mrRole.name} — {mrRole.title} ({mrRole.dept})</span>
            </div>
          </div>
        ) : canEdit ? (
          <div className="mb-5 p-3 rounded-xl text-[12.5px] flex items-center gap-2"
            style={{ background: '#FEF3C7', border: '1px solid #FCD34D', color: '#92400E' }}>
            <Star size={14} /> §5.5.2 경영대리인이 지정되지 않았습니다. 역할 등록 시 "경영대리인 지정" 체크박스를 선택하세요.
          </div>
        ) : null}

        {/* 탭 */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-soft)' }}>
          {[
            { key: 'roles',    label: `역할·책임 (${roles.length})` },
            { key: 'raci',     label: 'RACI 매트릭스' },
            { key: 'comms',    label: `커뮤니케이션 (${comms.length})` },
            { key: 'analysis', label: '현황 분석' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="px-4 py-1.5 rounded-lg text-[13px] font-semibold transition"
              style={{
                background: tab === t.key ? 'var(--bg-card)' : 'transparent',
                color: tab === t.key ? 'var(--moss)' : 'var(--ink-soft)',
                boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                border: 'none', cursor: 'pointer',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── 역할·책임 탭 ── */}
        {tab === 'roles' && (
          <div>
            {/* 필터 + 등록 */}
            <div className="flex flex-wrap gap-2 mb-4 items-center">
              <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-[13px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                <option value="all">전체 부서</option>
                {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-[13px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                <option value="all">전체 레벨</option>
                {ROLE_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
              {canEdit && (
                <button onClick={() => { setRoleForm(EMPTY_ROLE); setEditRoleId(null); setShowRoleForm(true) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold ml-auto"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} /> 역할 등록
                </button>
              )}
            </div>

            {showRoleForm && (
              <RoleForm form={roleForm} setForm={setRoleForm}
                onSave={submitRole}
                onCancel={() => { setShowRoleForm(false); setRoleForm(EMPTY_ROLE); setEditRoleId(null) }}
                isEdit={!!editRoleId} roles={roles} />
            )}

            {/* 역할 카드 목록 */}
            <div className="space-y-2">
              {filteredRoles.length === 0 && (
                <div className="text-center py-16 text-[13px]" style={{ color: 'var(--ink-faint)' }}>등록된 역할이 없습니다.</div>
              )}
              {filteredRoles.map(role => {
                const lvl = ROLE_LEVELS.find(l => l.value === role.level) || ROLE_LEVELS[2]
                const isOpen = expandedRole === role.id
                const raciCounts = Object.values(role.raciMap || {}).reduce((acc, v) => {
                  if (v) acc[v] = (acc[v] || 0) + 1; return acc
                }, {})
                return (
                  <div key={role.id} className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)', background: 'var(--bg-card)' }}>
                    {/* 헤더 행 */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[14px] shrink-0"
                        style={{ background: lvl.bg, color: lvl.color }}>
                        {role.name.slice(0, 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[13.5px]" style={{ color: 'var(--ink)' }}>{role.name}</span>
                          <span className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>{role.title}</span>
                          {role.isMR && (
                            <span className="flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full"
                              style={{ background: '#EDE9FE', color: '#7C3AED' }}>
                              <ShieldCheck size={9} /> 경영대리인
                            </span>
                          )}
                          <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: lvl.bg, color: lvl.color }}>{lvl.label}</span>
                          <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{role.dept}</span>
                        </div>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {Object.entries(raciCounts).map(([k, v]) => (
                            <span key={k} className="text-[10.5px] font-bold px-1.5 py-0.5 rounded"
                              style={{ background: RACI[k]?.bg, color: RACI[k]?.color }}>
                              {k}:{v}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {canEdit && (
                          <>
                            <button onClick={() => { setRoleForm({ ...EMPTY_ROLE, ...role }); setEditRoleId(role.id); setShowRoleForm(true) }}
                              className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                              <Edit2 size={12} style={{ color: 'var(--ink-soft)' }} />
                            </button>
                            <button onClick={() => deleteRole(role.id)}
                              className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', border: '1px solid #FECACA', cursor: 'pointer' }}>
                              <Trash2 size={12} style={{ color: '#DC2626' }} />
                            </button>
                          </>
                        )}
                        <button onClick={() => setExpandedRole(isOpen ? null : role.id)}
                          className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                          {isOpen ? <ChevronDown size={12} style={{ color: 'var(--ink-soft)' }} /> : <ChevronRight size={12} style={{ color: 'var(--ink-soft)' }} />}
                        </button>
                      </div>
                    </div>
                    {/* 상세 펼침 */}
                    {isOpen && (
                      <div className="px-4 pb-4 border-t" style={{ borderColor: 'var(--line)' }}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                          {role.responsibilities && (
                            <InfoBlock label="주요 책임" value={role.responsibilities} />
                          )}
                          {role.authorities && (
                            <InfoBlock label="권한" value={role.authorities} />
                          )}
                          {role.qualifications && (
                            <InfoBlock label="자격 요건" value={role.qualifications} />
                          )}
                          {(role.email || role.phone) && (
                            <InfoBlock label="연락처" value={[role.email, role.phone].filter(Boolean).join(' · ')} />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── RACI 매트릭스 탭 ── */}
        {tab === 'raci' && (
          <div>
            <div className="text-[12.5px] mb-3 flex gap-4 flex-wrap" style={{ color: 'var(--ink-soft)' }}>
              {Object.entries(RACI).filter(([k]) => k).map(([k, v]) => (
                <span key={k} className="flex items-center gap-1">
                  <span className="font-bold px-1.5 py-0.5 rounded text-[11px]" style={{ background: v.bg, color: v.color }}>{k}</span>
                  {v.desc}
                </span>
              ))}
              {canEdit && <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>· 셀 클릭으로 R→A→C→I→(공백) 순환</span>}
            </div>
            {roles.length === 0 ? (
              <div className="text-center py-12 text-[13px]" style={{ color: 'var(--ink-faint)' }}>먼저 역할을 등록하세요.</div>
            ) : (
              <div className="overflow-x-auto rounded-2xl" style={{ border: '1px solid var(--line)' }}>
                <table className="text-[11.5px]" style={{ borderCollapse: 'collapse', minWidth: 600 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-soft)' }}>
                      <th className="px-3 py-2 text-left font-semibold sticky left-0 z-10" style={{ color: 'var(--ink-soft)', background: 'var(--bg-soft)', minWidth: 200, borderBottom: '1px solid var(--line)' }}>
                        QMS 프로세스
                      </th>
                      {roles.map(r => (
                        <th key={r.id} className="px-2 py-2 text-center font-semibold" style={{ color: 'var(--ink-soft)', minWidth: 72, borderBottom: '1px solid var(--line)', borderLeft: '1px solid var(--line)' }}>
                          <div>{r.name}</div>
                          <div className="text-[10px] font-normal" style={{ color: 'var(--ink-faint)' }}>{r.dept}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {QMS_PROCESSES.map((proc, pi) => {
                      const hasR = roles.some(r => (r.raciMap || {})[proc] === 'R')
                      return (
                        <tr key={proc} style={{ background: pi % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-soft)', borderTop: '1px solid var(--line)' }}>
                          <td className="px-3 py-2 sticky left-0 z-10" style={{ color: 'var(--ink)', background: pi % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-soft)', borderRight: '1px solid var(--line)' }}>
                            <div className="flex items-center gap-2">
                              {!hasR && <span title="R(실행책임) 미지정" style={{ color: '#DC2626', fontSize: 10 }}>⚠</span>}
                              {proc}
                            </div>
                          </td>
                          {roles.map(r => {
                            const val = (r.raciMap || {})[proc] || ''
                            const rv = RACI[val] || RACI['']
                            return (
                              <td key={r.id} className="text-center py-2"
                                style={{ borderLeft: '1px solid var(--line)', cursor: canEdit ? 'pointer' : 'default' }}
                                onClick={() => cycleRaci(r.id, proc)}>
                                {val ? (
                                  <span className="inline-block font-bold px-2 py-0.5 rounded text-[11px]"
                                    style={{ background: rv.bg, color: rv.color }}>{val}</span>
                                ) : (
                                  <span style={{ color: 'var(--line)' }}>—</span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── 커뮤니케이션 탭 (§5.5.3) ── */}
        {tab === 'comms' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="text-[12.5px]" style={{ color: 'var(--ink-soft)' }}>§5.5.3 내부 커뮤니케이션 — QMS 효과성에 관한 소통 채널 및 방법 등록</div>
              {canEdit && (
                <button onClick={() => { setCommForm(EMPTY_COMM); setEditCommId(null); setShowCommForm(true) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} /> 커뮤니케이션 등록
                </button>
              )}
            </div>

            {showCommForm && (
              <CommForm form={commForm} setForm={setCommForm}
                onSave={submitComm}
                onCancel={() => { setShowCommForm(false); setCommForm(EMPTY_COMM); setEditCommId(null) }}
                isEdit={!!editCommId} />
            )}

            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr style={{ background: 'var(--bg-soft)' }}>
                    {['제목', '유형', '주기·매체', '참석 대상', '담당자', '상태', '최근 일자', ''].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--ink-soft)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comms.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-12" style={{ color: 'var(--ink-faint)' }}>등록된 커뮤니케이션 항목이 없습니다.</td></tr>
                  ) : comms.map((c, idx) => {
                    const st = COMM_STATUSES[c.status] || COMM_STATUSES.planned
                    return (
                      <tr key={c.id} style={{ background: idx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-soft)', borderTop: '1px solid var(--line)' }}>
                        <td className="px-3 py-2 font-semibold" style={{ color: 'var(--ink)' }}>{c.title}</td>
                        <td className="px-3 py-2" style={{ color: 'var(--ink-soft)' }}>{c.type}</td>
                        <td className="px-3 py-2">
                          <div style={{ color: 'var(--ink-soft)' }}>{c.frequency}</div>
                          <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{c.medium}</div>
                        </td>
                        <td className="px-3 py-2" style={{ color: 'var(--ink-soft)' }}>{c.participants || '-'}</td>
                        <td className="px-3 py-2" style={{ color: 'var(--ink-soft)' }}>{c.responsible || '-'}</td>
                        <td className="px-3 py-2">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: st.bg, color: st.color }}>{st.label}</span>
                        </td>
                        <td className="px-3 py-2 text-[11.5px]" style={{ color: 'var(--ink-soft)' }}>{c.lastDate || '-'}</td>
                        <td className="px-3 py-2">
                          {canEdit && (
                            <div className="flex gap-1">
                              <button onClick={() => { setCommForm({ ...EMPTY_COMM, ...c }); setEditCommId(c.id); setShowCommForm(true) }}
                                className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                                <Edit2 size={11} style={{ color: 'var(--ink-soft)' }} />
                              </button>
                              <button onClick={() => deleteComm(c.id)}
                                className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', border: '1px solid #FECACA', cursor: 'pointer' }}>
                                <Trash2 size={11} style={{ color: '#DC2626' }} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 현황 분석 탭 ── */}
        {tab === 'analysis' && (
          <AnalysisView analysis={analysis} roles={roles} comms={comms} mrRole={mrRole} />
        )}
      </div>
    </AppLayout>
  )
}

// ── 분석 뷰 ──────────────────────────────────────────────────
function AnalysisView({ analysis, roles, comms, mrRole }) {
  const covered = analysis.raciCoverage.filter(p => p.hasR).length
  const coverRate = QMS_PROCESSES.length > 0 ? Math.round((covered / QMS_PROCESSES.length) * 100) : 0
  return (
    <div className="space-y-5">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: '등록 역할', value: roles.length, color: '#2563EB', bg: '#DBEAFE' },
          { label: '경영대리인', value: mrRole ? '지정됨' : '미지정', color: mrRole ? '#059669' : '#DC2626', bg: mrRole ? '#D1FAE5' : '#FEE2E2' },
          { label: 'RACI 커버율', value: `${coverRate}%`, color: coverRate >= 80 ? '#059669' : '#D97706', bg: coverRate >= 80 ? '#D1FAE5' : '#FEF3C7' },
          { label: '커뮤니케이션', value: comms.length, color: '#7C3AED', bg: '#EDE9FE' },
        ].map(card => (
          <div key={card.label} className="p-4 rounded-2xl text-center" style={{ background: card.bg, border: `1px solid ${card.color}30` }}>
            <div className="text-[26px] font-bold" style={{ color: card.color }}>{card.value}</div>
            <div className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* RACI 미지정 프로세스 */}
      {analysis.uncovered.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: '#FEF3C7', border: '1px solid #FCD34D' }}>
          <div className="text-[13px] font-bold mb-2" style={{ color: '#92400E' }}>⚠ R(실행책임) 미지정 프로세스 ({analysis.uncovered.length}개)</div>
          <div className="flex flex-wrap gap-2">
            {analysis.uncovered.map(p => (
              <span key={p.process} className="text-[12px] px-2 py-1 rounded-lg"
                style={{ background: '#FEF9C3', border: '1px solid #FCD34D', color: '#92400E' }}>
                {p.process}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 레벨별 분포 */}
      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>조직 레벨별 분포</div>
        {ROLE_LEVELS.map(l => (
          <div key={l.value} className="flex items-center gap-3 mb-2">
            <span className="text-[12px] w-20" style={{ color: 'var(--ink-soft)' }}>{l.label}</span>
            <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--bg-soft)' }}>
              <div className="h-2 rounded-full" style={{ width: roles.length ? `${((analysis.byLevel[l.value] || 0) / roles.length) * 100}%` : '0%', background: l.color }} />
            </div>
            <span className="text-[12px] font-bold w-5 text-right" style={{ color: 'var(--ink)' }}>{analysis.byLevel[l.value] || 0}</span>
          </div>
        ))}
      </div>

      {/* 부서별 분포 */}
      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>부서별 역할 수</div>
        {DEPTS.filter(d => (analysis.byDept[d] || 0) > 0).map(d => (
          <div key={d} className="flex items-center gap-3 mb-2">
            <span className="text-[12px] flex-1" style={{ color: 'var(--ink-soft)' }}>{d}</span>
            <div className="w-32 h-2 rounded-full" style={{ background: 'var(--bg-soft)' }}>
              <div className="h-2 rounded-full" style={{ width: roles.length ? `${((analysis.byDept[d] || 0) / roles.length) * 100}%` : '0%', background: 'var(--moss)' }} />
            </div>
            <span className="text-[12px] font-bold w-4 text-right" style={{ color: 'var(--ink)' }}>{analysis.byDept[d] || 0}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 역할 폼 ──────────────────────────────────────────────────
function RoleForm({ form, setForm, onSave, onCancel, isEdit, roles }) {
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="mb-5 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>{isEdit ? '역할 수정' : '역할 등록 (§5.5.1)'}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <Field label="담당자명 *" value={form.name} onChange={v => F('name', v)} />
        <Field label="직책·역할명 *" value={form.title} onChange={v => F('title', v)} placeholder="품질보증팀장, QMS 담당자..." />
        <FieldSelect label="부서" value={form.dept} onChange={v => F('dept', v)}
          options={DEPTS.map(d => ({ value: d, label: d }))} />
        <FieldSelect label="조직 레벨" value={form.level} onChange={v => F('level', v)}
          options={ROLE_LEVELS.map(l => ({ value: l.value, label: l.label }))} />
        <Field label="이메일" value={form.email} onChange={v => F('email', v)} type="email" />
        <Field label="전화번호" value={form.phone} onChange={v => F('phone', v)} />
        <FieldSelect label="보고 대상" value={form.reportTo} onChange={v => F('reportTo', v)}
          options={[{ value: '', label: '(없음)' }, ...roles.filter(r => r.id !== form.id).map(r => ({ value: r.id, label: `${r.name} (${r.title})` }))]} />
        <Field label="연결 역량 ID" value={form.linkedCompetencyId} onChange={v => F('linkedCompetencyId', v)} placeholder="COMP-xxxx" />
      </div>
      <div className="mb-3">
        <label className="flex items-center gap-2 cursor-pointer text-[12.5px] font-semibold" style={{ color: '#7C3AED' }}>
          <input type="checkbox" checked={!!form.isMR} onChange={e => F('isMR', e.target.checked)} className="accent-violet-600 w-4 h-4" />
          <ShieldCheck size={14} /> §5.5.2 경영대리인 (Management Representative) 지정
        </label>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <FieldArea label="주요 책임" value={form.responsibilities} onChange={v => F('responsibilities', v)} rows={3}
          placeholder="- QMS 수립·유지·개선 책임&#10;- 내부감사 조율&#10;..." />
        <FieldArea label="권한" value={form.authorities} onChange={v => F('authorities', v)} rows={3}
          placeholder="- 부적합 제품 출하 보류&#10;- 시정조치 요구·검증&#10;..." />
        <FieldArea label="자격 요건" value={form.qualifications} onChange={v => F('qualifications', v)} rows={2} />
        <FieldArea label="비고" value={form.notes} onChange={v => F('notes', v)} rows={2} />
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
          style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
          <Save size={13} /> 저장
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-[13px]"
          style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>취소</button>
      </div>
    </div>
  )
}

// ── 커뮤니케이션 폼 ──────────────────────────────────────────
function CommForm({ form, setForm, onSave, onCancel, isEdit }) {
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="mb-5 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>{isEdit ? '커뮤니케이션 수정' : '커뮤니케이션 등록 (§5.5.3)'}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <Field label="제목 *" value={form.title} onChange={v => F('title', v)} placeholder="월간 품질 회의..." />
        <FieldSelect label="유형" value={form.type} onChange={v => F('type', v)}
          options={COMM_TYPES.map(t => ({ value: t, label: t }))} />
        <FieldSelect label="상태" value={form.status} onChange={v => F('status', v)}
          options={Object.entries(COMM_STATUSES).map(([k, v]) => ({ value: k, label: v.label }))} />
        <Field label="주기" value={form.frequency} onChange={v => F('frequency', v)} placeholder="월1회, 분기1회..." />
        <Field label="매체·방법" value={form.medium} onChange={v => F('medium', v)} placeholder="대면 회의, 이메일, 공지게시판..." />
        <Field label="담당자" value={form.responsible} onChange={v => F('responsible', v)} />
        <Field label="참석 대상 부서·인원" value={form.participants} onChange={v => F('participants', v)} placeholder="품질부, 생산부, 경영진..." />
        <Field label="최근 실시일" type="date" value={form.lastDate} onChange={v => F('lastDate', v)} />
        <Field label="다음 예정일" type="date" value={form.nextDate} onChange={v => F('nextDate', v)} />
      </div>
      <div className="mb-3"><FieldArea label="주요 안건" value={form.agenda} onChange={v => F('agenda', v)} rows={2} /></div>
      <div className="mb-4"><FieldArea label="비고" value={form.notes} onChange={v => F('notes', v)} rows={2} /></div>
      <div className="flex gap-2">
        <button onClick={onSave} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
          style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
          <Save size={13} /> 저장
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-[13px]"
          style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>취소</button>
      </div>
    </div>
  )
}

// ── 공통 ─────────────────────────────────────────────────────
function InfoBlock({ label, value }) {
  return (
    <div className="p-3 rounded-xl" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
      <div className="text-[11px] font-bold mb-1" style={{ color: 'var(--ink-faint)' }}>{label}</div>
      <div className="text-[12.5px] whitespace-pre-line" style={{ color: 'var(--ink)' }}>{value}</div>
    </div>
  )
}
function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-1.5 rounded-xl text-[13px]"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
    </div>
  )
}
function FieldSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <select value={value || ''} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-1.5 rounded-xl text-[13px]"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
function FieldArea({ label, value, onChange, rows = 3, placeholder }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
        className="w-full px-3 py-1.5 rounded-xl text-[13px] resize-none"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
    </div>
  )
}
