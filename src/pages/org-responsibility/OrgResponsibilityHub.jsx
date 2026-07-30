// src/pages/org-responsibility/OrgResponsibilityHub.jsx
// ISO 13485 Â§5.5 â ì±ìÂ·ê¶í ë° ìì¬ìíµ
import React, { useState, useMemo } from 'react'
import {
  Plus, Save, Edit2, Trash2, User, Users,
  Building2, MessageSquare, ShieldCheck, Star,
  ChevronDown, ChevronRight, Link2, BarChart2,
  Check, X, Minus,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'

// ââ ìì âââââââââââââââââââââââââââââââââââââââââââââââââââââ
const LS_KEY_ROLES   = 'qualytree.org_roles'
const LS_KEY_COMMS   = 'qualytree.org_comms'

// ì­í  ë ë²¨
const ROLE_LEVELS = [
  { value: 'executive',  label: 'ê²½ìì§',     color: '#7C3AED', bg: '#EDE9FE' },
  { value: 'director',   label: 'ë¶ìì¥',     color: '#2563EB', bg: '#DBEAFE' },
  { value: 'manager',    label: 'íì¥Â·ë´ë¹',  color: '#059669', bg: '#D1FAE5' },
  { value: 'operator',   label: 'ì¤ë¬´ì',     color: '#D97706', bg: '#FEF3C7' },
  { value: 'external',   label: 'ì¸ë¶Â·ìí',  color: '#6B7280', bg: '#F3F4F6' },
]

// ë¶ì
const DEPTS = ['ê²½ìì§', 'íì§ë¶', 'ìì°ë¶', 'ê°ë°ë¶', 'ììë¶', 'êµ¬ë§¤ë¶', 'ì¤ë¹ë¶', 'ë¬¸ìê´ë¦¬', 'ì¸íê°', 'ê¸°í']

// Â§5.5ìì ìêµ¬íë íµì¬ QMS íë¡ì¸ì¤ (RACI í)
const QMS_PROCESSES = [
  'íì§ë°©ì¹¨ ìë¦½ ë° ê²í ',
  'íì§ëª©í ì¤ì  ë° ëª¨ëí°ë§',
  'ê²½ìê²í  ì£¼ê´',
  'ë´ë¶ê°ì¬ ê³í ë° ì¤ì',
  'ë¬¸ì ì¹ì¸ ë° ë°°í¬',
  'ë¶ì í©í ê´ë¦¬',
  'ìì Â·ìë°©ì¡°ì¹ (CAPA)',
  'ê³ ê°ë¶ë§ ì²ë¦¬',
  'ê³µê¸ìì²´ íê°Â·ì¹ì¸',
  'ì¤ê³Â·ê°ë° ê´ë¦¬',
  'ìì°Â·ê³µì  ê´ë¦¬',
  'êµì Â·ì¤ë¹ ê´ë¦¬',
  'ìíê´ë¦¬ (ISO 14971)',
  'ì¸íê°Â·î·ì  ëì',
  'êµì¡íë ¨ ê³í ë° ì¤ì',
  'ë³ê²½ ê´ë¦¬',
]

// ì»¤ë®¤ëì¼ì´ì ì í
const COMM_TYPES = [
  'ê²½ìê²í  íì', 'ë¶ì íì', 'ì ì¬ ê³µì§', 'ìë¬´ ì§ì', 'êµì¡', 'QMS ê³µì§', 'íì§ ì´ì ê³µì ', 'ê¸°í'
]
const COMM_STATUSES = {
  planned:   { label: 'ê³í',   color: '#9CA3AF', bg: '#F3F4F6' },
  completed: { label: 'ìë£',   color: '#059669', bg: '#D1FAE5' },
  recurring: { label: 'ì ê¸°',   color: '#2563EB', bg: '#DBEAFE' },
}

// RACI ê°
const RACI = {
  R: { label: 'R', desc: 'ì¤í ì±ì', color: '#2563EB', bg: '#DBEAFE' },
  A: { label: 'A', desc: 'ìµì¢ ì¹ì¸', color: '#7C3AED', bg: '#EDE9FE' },
  C: { label: 'C', desc: 'íì íì', color: '#D97706', bg: '#FEF3C7' },
  I: { label: 'I', desc: 'íµë³´ ëì', color: '#059669', bg: '#D1FAE5' },
  '': { label: '-', desc: 'í´ë¹ ìì', color: '#D1D5DB', bg: 'transparent' },
}

function genRoleId() { return `ROLE-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }
function genCommId() { return `COMM-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }
function today() { return new Date().toISOString().slice(0, 10) }

const EMPTY_ROLE = {
  name: '', title: '', dept: 'íì§ë¶', level: 'manager',
  isMR: false,      // ê²½ìëë¦¬ì¸ (Â§5.5.2)
  responsibilities: '',   // ì£¼ì ì±ì
  authorities: '',        // ê¶í
  qualifications: '',     // ìê²© ìê±´
  reportTo: '',           // ë³´ê³  ëì (ë¤ë¥¸ ì­í  id)
  email: '', phone: '',
  linkedCompetencyId: '',
  notes: '',
  raciMap: {},            // { processName: 'R'|'A'|'C'|'I'|'' }
}

const EMPTY_COMM = {
  title: '', type: 'ë¶ì íì', frequency: 'ì1í',
  participants: '', responsible: '',
  agenda: '', medium: 'ëë©´ íì',
  status: 'recurring', lastDate: '', nextDate: '',
  notes: '',
}

// ââ ë©ì¸ âââââââââââââââââââââââââââââââââââââââââââââââââââââ
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
    if (!roleForm.name.trim()) return alert('ë´ë¹ìëªì ìë ¥íì¸ì.')
    if (!roleForm.title.trim()) return alert('ì§ì±/ì­í ëªì ìë ¥íì¸ì.')
    const isEdit = !!editRoleId
    const obj = isEdit
      ? roles.map(r => r.id === editRoleId ? { ...r, ...roleForm } : r)
      : [{ id: genRoleId(), createdAt: today(), ...roleForm }, ...roles]
    saveRoles(obj)
    setShowRoleForm(false); setRoleForm(EMPTY_ROLE); setEditRoleId(null)
  }

  function submitComm() {
    if (!commForm.title.trim()) return alert('ì»¤ë®¤ëì¼ì´ì ì ëª©ì ìë ¥íì¸ì.')
    const isEdit = !!editCommId
    const obj = isEdit
      ? comms.map(c => c.id === editCommId ? { ...c, ...commForm } : c)
      : [{ id: genCommId(), createdAt: today(), ...commForm }, ...comms]
    saveComms(obj)
    setShowCommForm(false); setCommForm(EMPTY_COMM); setEditCommId(null)
  }

  function deleteRole(id) { if (confirm('ì­í ì ì­ì íìê² ìµëê¹?')) saveRoles(roles.filter(r => r.id !== id)) }
  function deleteComm(id) { if (confirm('ì»¤ë®¤ëì¼ì´ì í­ëª©ì ì­ì íìê² ìµëê¹?')) saveComms(comms.filter(c => c.id !== id)) }

  // RACI ì í ê¸ (ìí: '' â R â A â C â I â '')
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

  // ë¶ì
  const analysis = useMemo(() => {
    const byDept = {}
    DEPTS.forEach(d => { byDept[d] = roles.filter(r => r.dept === d).length })
    const byLevel = {}
    ROLE_LEVELS.forEach(l => { byLevel[l.value] = roles.filter(r => r.level === l.value).length })
    // RACI ì»¤ë²ë¦¬ì§: ê° íë¡ì¸ì¤ë§ë¤ R ë´ë¹ì ìëì§
    const raciCoverage = QMS_PROCESSES.map(p => ({
      process: p,
      hasR: roles.some(r => (r.raciMap || {})[p] === 'R'),
      hasA: roles.some(r => (r.raciMap || {})[p] === 'A'),
    }))
    const uncovered = raciCoverage.filter(p => !p.hasR)
    return { byDept, byLevel, raciCoverage, uncovered }
  }, [roles])

  return (
    <AppLayout user={user} title="ì¡°ì§ ë° ì±ì ê´ë¦¬" subtitle="ISO 13485 Â§5.5 â ì±ìÂ·ê¶íÂ·ê²½ìëë¦¬ì¸Â·ë´ë¶ ì»¤ë®¤ëì¼ì´ì">
      <div className="px-6 lg:px-8 py-6 max-w-[1800px] mx-auto">

        {/* ê²½ìëë¦¬ì¸ ë°°ë (Â§5.5.2) */}
        {mrRole ? (
          <div className="mb-5 p-4 rounded-2xl flex items-center gap-3"
            style={{ background: '#EDE9FE', border: '1.5px solid #7C3AED40' }}>
            <ShieldCheck size={20} style={{ color: '#7C3AED', flexShrink: 0 }} />
            <div>
              <span className="text-[12px] font-bold" style={{ color: '#7C3AED' }}>Â§5.5.2 ê²½ìëë¦¬ì¸ (Management Representative)</span>
              <span className="ml-3 text-[13px] font-semibold" style={{ color: '#4C1D95' }}>{mrRole.name} â {mrRole.title} ({mrRole.dept})</span>
            </div>
          </div>
        ) : canEdit ? (
          <div className="mb-5 p-3 rounded-xl text-[12.5px] flex items-center gap-2"
            style={{ background: '#FEF3C7', border: '1px solid #FCD34D', color: '#92400E' }}>
            <Star size={14} /> Â§5.5.2 ê²½ìëë¦¬ì¸ì´ ì§ì ëì§ ìììµëë¤. ì­í  ë±ë¡ ì "ê²½ìëë¦¬ì¸ ì§ì " ì²´í¬ë°ì¤ë¥¼ ì ííì¸ì.
          </div>
        ) : null}

        {/* í­ */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-soft)' }}>
          {[
            { key: 'roles',    label: `ì­í Â·ì±ì (${roles.length})` },
            { key: 'raci',     label: 'RACI ë§¤í¸ë¦­ì¤' },
            { key: 'comms',    label: `ì»¤ë®¤ëì¼ì´ì (${comms.length})` },
            { key: 'analysis', label: 'íí© ë¶ì' },
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

        {/* ââ ì­í Â·ì±ì í­ ââ */}
        {tab === 'roles' && (
          <div>
            {/* íí° + ë±ë¡ */}
            <div className="flex flex-wrap gap-2 mb-4 items-center">
              <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-[13px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                <option value="all">ì ì²´ ë¶ì</option>
                {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-[13px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                <option value="all">ì ì²´ ë ë²¨</option>
                {ROLE_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
              {canEdit && (
                <button onClick={() => { setRoleForm(EMPTY_ROLE); setEditRoleId(null); setShowRoleForm(true) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold ml-auto"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} /> ì­í  ë±ë¡
                </button>
              )}
            </div>

            {showRoleForm && (
              <RoleForm form={roleForm} setForm={setRoleForm}
                onSave={submitRole}
                onCancel={() => { setShowRoleForm(false); setRoleForm(EMPTY_ROLE); setEditRoleId(null) }}
                isEdit={!!editRoleId} roles={roles} />
            )}

            {/* ì­í  ì¹´ë ëª©ë¡ */}
            <div className="space-y-2">
              {filteredRoles.length === 0 && (
                <div className="text-center py-16 text-[13px]" style={{ color: 'var(--ink-faint)' }}>ë±ë¡ë ì­í ì´ ììµëë¤.</div>
              )}
              {filteredRoles.map(role => {
                const lvl = ROLE_LEVELS.find(l => l.value === role.level) || ROLE_LEVELS[2]
                const isOpen = expandedRole === role.id
                const raciCounts = Object.values(role.raciMap || {}).reduce((acc, v) => {
                  if (v) acc[v] = (acc[v] || 0) + 1; return acc
                }, {})
                return (
                  <div key={role.id} className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)', background: 'var(--bg-card)' }}>
                    {/* í¤ë í */}
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
                              <ShieldCheck size={9} /> ê²½ìëë¦¬ì¸
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
                    {/* ìì¸ í¼ì¹¨ */}
                    {isOpen && (
                      <div className="px-4 pb-4 border-t" style={{ borderColor: 'var(--line)' }}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                          {role.responsibilities && (
                            <InfoBlock label="ì£¼ì ì±ì" value={role.responsibilities} />
                          )}
                          {role.authorities && (
                            <InfoBlock label="ê¶í" value={role.authorities} />
                          )}
                          {role.qualifications && (
                            <InfoBlock label="ìê²© ìê±´" value={role.qualifications} />
                          )}
                          {(role.email || role.phone) && (
                            <InfoBlock label="ì°ë½ì²" value={[role.email, role.phone].filter(Boolean).join(' Â· ')} />
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

        {/* ââ RACI ë§¤í¸ë¦­ì¤ í­ ââ */}
        {tab === 'raci' && (
          <div>
            <div className="text-[12.5px] mb-3 flex gap-4 flex-wrap" style={{ color: 'var(--ink-soft)' }}>
              {Object.entries(RACI).filter(([k]) => k).map(([k, v]) => (
                <span key={k} className="flex items-center gap-1">
                  <span className="font-bold px-1.5 py-0.5 rounded text-[11px]" style={{ background: v.bg, color: v.color }}>{k}</span>
                  {v.desc}
                </span>
              ))}
              {canEdit && <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>Â· ì í´ë¦­ì¼ë¡ RâAâCâIâ(ê³µë°±) ìí</span>}
            </div>
            {roles.length === 0 ? (
              <div className="text-center py-12 text-[13px]" style={{ color: 'var(--ink-faint)' }}>ë¨¼ì  ì­í ì ë±ë¡íì¸ì.</div>
            ) : (
              <div className="overflow-x-auto rounded-2xl" style={{ border: '1px solid var(--line)' }}>
                <table className="text-[11.5px]" style={{ borderCollapse: 'collapse', minWidth: 600 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-soft)' }}>
                      <th className="px-3 py-2 text-left font-semibold sticky left-0 z-10" style={{ color: 'var(--ink-soft)', background: 'var(--bg-soft)', minWidth: 200, borderBottom: '1px solid var(--line)' }}>
                        QMS íë¡ì¸ì¤
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
                              {!hasR && <span title="R(ì¤íì±ì) ë¯¸ì§ì " style={{ color: '#DC2626', fontSize: 10 }}>â </span>}
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
                                  <span style={{ color: 'var(--line)' }}>â</span>
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

        {/* ââ ì»¤ë®¤ëì¼ì´ì í­ (Â§5.5.3) ââ */}
        {tab === 'comms' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="text-[12.5px]" style={{ color: 'var(--ink-soft)' }}>Â§5.5.3 ë´ë¶ ì»¤ë®¤ëì¼ì´ì â QMS í¨ê³¼ì±ì ê´í ìíµ ì±ë ë° ë°©ë² ë±ë¡</div>
              {canEdit && (
                <button onClick={() => { setCommForm(EMPTY_COMM); setEditCommId(null); setShowCommForm(true) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} /> ì»¤ë®¤ëì¼ì´ì ë±ë¡
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
                    {['ì ëª©', 'ì í', 'ì£¼ê¸°Â·ë§¤ì²´', 'ì°¸ì ëì', 'ë´ë¹ì', 'ìí', 'ìµê·¼ ì¼ì', ''].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--ink-soft)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comms.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-12" style={{ color: 'var(--ink-faint)' }}>ë±ë¡ë ì»¤ë®¤ëì¼ì´ì í­ëª©ì´ ììµëë¤.</td></tr>
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

        {/* ââ íí© ë¶ì í­ */}
        {tab === 'analysis' && (
          <AnalysisView analysis={analysis} roles={roles} comms={comms} mrRole={mrRole} />
        )}
      </div>
    </AppLayout>
  )
}

// ââ ë¶ì ë¶° ââââââââââââââââââââââââââââââââââââââââââââââââââ
function AnalysisView({ analysis, roles, comms, mrRole }) {
  const covered = analysis.raciCoverage.filter(p => p.hasR).length
  const coverRate = QMS_PROCESSES.length > 0 ? Math.round((covered / QMS_PROCESSES.length) * 100) : 0
  return (
    <div className="space-y-5">
      {/* Éªì(ì ì½¼ë */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'ë±ë¡ì´ ì­í ì´', value: roles.length, color: '#2563EB', bg: '#DBEAFE' },
          { label: 'ê²½ìëë¦¬ ì´', value: mrRole ? 'ì§ì ê¨' : 'å¯¸ç§ì ', color: mrRole ? '#059669' : '#DC2626', bg: mrRole ? '#D1FAE5' : '#FEE2E2' },
          { label: 'RACI ì»¤ë²ì¨', value: `${coverRate}%`, color: coverRate >= 80 ? '#059669' : '#D97706', bg: coverRate >= 80 ? '#D1FAE5' : '#FEF3C7' },
          { label: 'ì»¤ë®¤ëì¼ì´ì', value: comms.length, color: '#7C3AED', bg: '#EDE9FE' },
        ].map(card => (
          <div key={card.label} className="p-4 rounded-2xl text-center" style={{ background: card.bg, border: `1px solid ${card.color}30` }}>
            <div className="text-[26px] font-bold" style={{ color: card.color }}>{card.value}</div>
            <div className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* RACI ë¯¸ì§ì íë¡ì¸ì¤ */}
      {analysis.uncovered.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: '#FEF3C7', border: '1px solid #FCD34D' }}>
          <div className="text-[13px] font-bold mb-2" style={{ color: '#92400E' }}>â  R(ì¤íì±ì) ë¯¸ì§ì íë¡ì¸ì¤ ({analysis.uncovered.length}ê°)</div>
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

      {/* ë ë²¨ë³ ë¶í¬ */}
      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>ì¡°ì§ ë ë²¨ë³ ë¶í¬</div>
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

      {/* ë¶ìë³ ë¶í¬ */}
      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>ë¶ìë³ ì­í  ì</div>
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

// ââ ì­í  í¼ ââââââââââââââââââââââââââââââââââââââââââââââââââ
function RoleForm({ form, setForm, onSave, onCancel, isEdit, roles }) {
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="mb-5 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>{isEdit ? 'ì­í  ìì ' : 'ì­í  ë±ë¡ (Â§5.5.1)'}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <Field label="ë´ë¹ìëª *" value={form.name} onChange={v => F('name', v)} />
        <Field label="ì§ì±Â·ì­í ëª *" value={form.title} onChange={v => F('title', v)} placeholder="íì§ë³´ì¦íì¥, QMS ë´ë¹ì..." />
        <FieldSelect label="ë¶ì" value={form.dept} onChange={v => F('dept', v)}
          options={DEPTS.map(d => ({ value: d, label: d }))} />
        <FieldSelect label="ì¡°ì§ ë ë²¨" value={form.level} onChange={v => F('level', v)}
          options={ROLE_LEVELS.map(l => ({ value: l.value, label: l.label }))} />
        <Field label="ì´ë©ì¼" value={form.email} onChange={v => F('email', v)} type="email" />
        <Field label="ì íë²í¸" value={form.phone} onChange={v => F('phone', v)} />
        <FieldSelect label="ë³´ê³  ëì" value={form.reportTo} onChange={v => F('reportTo', v)}
          options={[{ value: '', label: '(ìì)' }, ...roles.filter(r => r.id !== form.id).map(r => ({ value: r.id, label: `${r.name} (${r.title})` }))]} />
        {/* #349: ì°ê²° ì­ë ID ì­ì  */}
      </div>
      <div className="mb-3">
        <label className="flex items-center gap-2 cursor-pointer text-[12.5px] font-semibold" style={{ color: '#7C3AED' }}>
          <input type="checkbox" checked={!!form.isMR} onChange={e => F('isMR', e.target.checked)} className="accent-violet-600 w-4 h-4" />
          <ShieldCheck size={14} /> Â§5.5.2 ê²½ìëë¦¬ì¸ (Management Representative) ì§ì 
        </label>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <FieldArea label="ì£¼ì ì±ì" value={form.responsibilities} onChange={v => F('responsibilities', v)} rows={3}
          placeholder="- QMS ìë¦½Â·ì ì§Â·ê°ì  ì±ì&#10;- ë´ë¶ê°ì¬ ì¡°ì¨&#10;..." />
        <FieldArea label="ê¶í" value={form.authorities} onChange={v => F('authorities', v)} rows={3}
          placeholder="- ë¶ì í© ì í ì¶í ë³´ë¥&#10;- ìì ì¡°ì¹ ìêµ¬Â·ê²ì¦&#10;..." />
        <FieldArea label="ìê²© ìê±´" value={form.qualifications} onChange={v => F('qualifications', v)} rows={2} />
        <FieldArea label="ë¹ê³ " value={form.notes} onChange={v => F('notes', v)} rows={2} />
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
          style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
          <Save size={13} /> ì ì¥
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-[13px]"
          style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>ì·¨ì</button>
      </div>
    </div>
  )
}

// ââ ì»¤ë®¤ëì¼ì´ì í¼ ââââââââââââââââââââââââââââââââââââââââââ
function CommForm({ form, setForm, onSave, onCancel, isEdit }) {
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="mb-5 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>{isEdit ? 'ì»¤ë®¤ëì¼ì´ì ìì ' : 'ì»¤ë®¤ëì¼ì´ì ë±ë¡ (Â§5.5.3)'}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <Field label="ì ëª© *" value={form.title} onChange={v => F('title', v)} placeholder="ìê° íì§ íì..." />
        <FieldSelect label="ì í" value={form.type} onChange={v => F('type', v)}
          options={COMM_TYPES.map(t => ({ value: t, label: t }))} />
        <FieldSelect label="ìí" value={form.status} onChange={v => F('status', v)}
          options={Object.entries(COMM_STATUSES).map(([k, v]) => ({ value: k, label: v.label }))} />
        <Field label="ì£¼ê¸°" value={form.frequency} onChange={v => F('frequency', v)} placeholder="ì1í, ë¶ê¸°1í..." />
        <Field label="ë§¤ì²´Â·ë°©ë²" value={form.medium} onChange={v => F('medium', v)} placeholder="ëë©´ íì, ì´ë©ì¼, ê³µì§ê²ìí..." />
        {/* #352: ë´ë¹ì ì­ì  (ìì±ì=ë´ë¹ì) */}
        <Field label="ì°¸ì ëì ë¶ìÂ·ì¸ì" value={form.participants} onChange={v => F('participants', v)} placeholder="íì§ë¶, ìì°ë¶, ê²½ìì§..." />
        <Field label="ìµê·¼ ì¤ìì¼" type="date" value={form.lastDate} onChange={v => F('lastDate', v)} />
        <Field label="ë¤ì ìì ì¼" type="date" value={form.nextDate} onChange={v => F('nextDate', v)} />
      </div>
      <div className="mb-3"><FieldArea label="ì£¼ì ìê±´" value={form.agenda} onChange={v => F('agenda', v)} rows={2} /></div>
      <div className="mb-4"><FieldArea label="ë¹ê³ " value={form.notes} onChange={v => F('notes', v)} rows={2} /></div>
      <div className="flex gap-2">
        <button onClick={onSave} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
          style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
          <Save size={13} /> ì ì¥
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-[13px]"
          style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>ì·¨ì</button>
      </div>
    </div>
  )
}

// ââ ê³µíµ âââââââââââââââââââââââââââââââââââââââââââââââââââââ
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
