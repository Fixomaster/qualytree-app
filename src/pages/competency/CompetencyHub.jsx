// src/pages/competency/CompetencyHub.jsx
// ISO 13485 Â§6.2 ì¸ì ìì â ì­ë ê´ë¦¬ íë¸
import React, { useState, useMemo } from 'react'
import {
  Plus, X, Save, Edit2, Trash2, Users, Star, CheckCircle2,
  AlertTriangle, XCircle, BarChart2, BookOpen, Award,
  User, Briefcase, ChevronRight, Download,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'

// ââ ìì âââââââââââââââââââââââââââââââââââââââââââââââââââââ
const LS_ROLES  = 'qualytree.comp_roles'
const LS_EMP    = 'qualytree.comp_employees'

const COMP_LEVELS = [
  { value: 0, label: 'ë¯¸íê°', color: '#9CA3AF', bg: '#F3F4F6' },
  { value: 1, label: 'ê¸°ì´',   color: '#3B82F6', bg: '#EFF6FF' },
  { value: 2, label: 'ì¤ë¬´',   color: '#8B5CF6', bg: '#F5F3FF' },
  { value: 3, label: 'ìë ¨',   color: '#059669', bg: '#ECFDF5' },
  { value: 4, label: 'ì ë¬¸',   color: '#D97706', bg: '#FEF3C7' },
]
const LEVEL_MAP = Object.fromEntries(COMP_LEVELS.map(l => [l.value, l]))

const COMP_CATEGORIES = ['ê¸°ì  ì­ë', 'íì§/ê·ì ', 'ìì ', 'ê´ë¦¬/ë¦¬ëì­', 'ì¸ì´/ìíµ', 'ê¸°í']

const DEPT_CODES = ['SAL','MFG','PUR','QUA','EQP','DEV','DOC','MR','TRN','RA','AUD','IMP','ALL']

function todayStr() { return new Date().toISOString().slice(0, 10) }
function roleId()  { return `ROL-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }
function empId()   { return `EMP-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }

const EMPTY_ROLE = {
  title: '', dept: 'QUA', description: '',
  competencies: [], // [{ name, category, requiredLevel }]
}
const EMPTY_EMP = {
  name: '', employeeNo: '', dept: 'QUA', jobTitle: '',
  hireDate: todayStr(), email: '', phone: '',
  competencies: [], // [{ name, actualLevel, evaluatedAt, evaluatedBy, effectiveness, notes }]
  notes: '',
}

// ââ ë©ì¸ âââââââââââââââââââââââââââââââââââââââââââââââââââââ
export default function CompetencyHub() {
  const user = auth.current()
  const canEdit = user?.level >= 2

  const [roles, setRoles] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_ROLES) || '[]') } catch { return [] }
  })
  const [employees, setEmployees] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_EMP) || '[]') } catch { return [] }
  })

  const [tab, setTab] = useState('matrix')   // matrix | roles | employees | analysis

  // ì­í  í¼
  const [showRoleForm, setShowRoleForm] = useState(false)
  const [roleForm, setRoleForm] = useState(EMPTY_ROLE)
  const [editRoleId, setEditRoleId] = useState(null)
  const [roleCompDraft, setRoleCompDraft] = useState({ name: '', category: 'ê¸°ì  ì­ë', requiredLevel: 2 })

  // ì§ì í¼
  const [showEmpForm, setShowEmpForm] = useState(false)
  const [empForm, setEmpForm] = useState(EMPTY_EMP)
  const [editEmpId, setEditEmpId] = useState(null)
  const [empCompDraft, setEmpCompDraft] = useState({ name: '', actualLevel: 0, evaluatedAt: todayStr(), evaluatedBy: '', effectiveness: '', notes: '' })
  const [filterDept, setFilterDept] = useState('all')

  function saveRoles(list) { setRoles(list); localStorage.setItem(LS_ROLES, JSON.stringify(list)) }
  function saveEmps(list)  { setEmployees(list); localStorage.setItem(LS_EMP, JSON.stringify(list)) }

  // ââ ì­í  CRUD âââââââââââââââââââââââââââââââââââââââââââââ
  function submitRole() {
    if (!roleForm.title.trim()) return alert('ì§ë¬´ëªì ìë ¥íì¸ì.')
    let next
    if (editRoleId) {
      next = roles.map(r => r.id === editRoleId ? { ...r, ...roleForm } : r)
    } else {
      next = [{ id: roleId(), createdAt: todayStr(), ...roleForm }, ...roles]
    }
    saveRoles(next)
    setShowRoleForm(false); setRoleForm(EMPTY_ROLE); setEditRoleId(null)
  }

  function deleteRole(id) {
    if (!confirm('ì§ë¬´ë¥¼ ì­ì íìê² ìµëê¹?')) return
    saveRoles(roles.filter(r => r.id !== id))
  }

  function addRoleComp() {
    if (!roleCompDraft.name.trim()) return
    setRoleForm(f => ({ ...f, competencies: [...(f.competencies || []), { ...roleCompDraft }] }))
    setRoleCompDraft({ name: '', category: 'ê¸°ì  ì­ë', requiredLevel: 2 })
  }
  function removeRoleComp(idx) {
    setRoleForm(f => ({ ...f, competencies: f.competencies.filter((_, i) => i !== idx) }))
  }

  // ââ ì§ì CRUD âââââââââââââââââââââââââââââââââââââââââââââ
  function submitEmp() {
    if (!empForm.name.trim()) return alert('ì§ìëªì ìë ¥íì¸ì.')
    let next
    if (editEmpId) {
      next = employees.map(e => e.id === editEmpId ? { ...e, ...empForm } : e)
    } else {
      next = [{ id: empId(), createdAt: todayStr(), ...empForm }, ...employees]
    }
    saveEmps(next)
    setShowEmpForm(false); setEmpForm(EMPTY_EMP); setEditEmpId(null)
  }

  function deleteEmp(id) {
    if (!confirm('ì§ì ê¸°ë¡ì ì­ì íìê² ìµëê¹?')) return
    saveEmps(employees.filter(e => e.id !== id))
  }

  function addEmpComp() {
    if (!empCompDraft.name.trim()) return
    setEmpForm(f => ({ ...f, competencies: [...(f.competencies || []), { ...empCompDraft }] }))
    setEmpCompDraft({ name: '', actualLevel: 0, evaluatedAt: todayStr(), evaluatedBy: '', effectiveness: '', notes: '' })
  }
  function removeEmpComp(idx) {
    setEmpForm(f => ({ ...f, competencies: f.competencies.filter((_, i) => i !== idx) }))
  }

  // ââ ì­ë ë§¤í¸ë¦­ì¤ ê³ì° âââââââââââââââââââââââââââââââââââââ
  // ì§ë¬´ë³ë¡ ìêµ¬ ì­ëì ëª¨ì¼ê³ , ì§ìë¤ì ì¤ì  ìì¤ê³¼ ë¹êµ
  const matrixData = useMemo(() => {
    const filteredEmps = filterDept === 'all' ? employees : employees.filter(e => e.dept === filterDept)
    // ì ì²´ ì­ë í­ëª© ëª©ë¡ (roleìì ëª¨ì)
    const allComps = new Map()
    roles.forEach(r => {
      ;(r.competencies || []).forEach(c => {
        if (!allComps.has(c.name)) allComps.set(c.name, { name: c.name, category: c.category, maxRequired: c.requiredLevel })
        else {
          const cur = allComps.get(c.name)
          if (c.requiredLevel > cur.maxRequired) allComps.set(c.name, { ...cur, maxRequired: c.requiredLevel })
        }
      })
    })
    const compList = Array.from(allComps.values())

    // ì§ìë³ ì­ë ë§µ
    const empCompMap = {}
    filteredEmps.forEach(e => {
      empCompMap[e.id] = {}
      ;(e.competencies || []).forEach(c => { empCompMap[e.id][c.name] = c })
    })

    // GAP ê³ì°
    const gapStats = filteredEmps.map(e => {
      let total = 0, gaps = 0, met = 0
      roles.filter(r => r.dept === e.dept).forEach(r => {
        ;(r.competencies || []).forEach(c => {
          total++
          const actual = empCompMap[e.id]?.[c.name]?.actualLevel || 0
          if (actual >= c.requiredLevel) met++
          else gaps++
        })
      })
      return { emp: e, total, gaps, met, rate: total ? Math.round((met / total) * 100) : null }
    })

    return { compList, filteredEmps, empCompMap, gapStats }
  }, [roles, employees, filterDept])

  // ë¶ì ë°ì´í°
  const analysis = useMemo(() => {
    const deptGap = {}
    DEPT_CODES.forEach(d => { deptGap[d] = { total: 0, gaps: 0 } })
    matrixData.gapStats.forEach(({ emp, total, gaps }) => {
      if (deptGap[emp.dept]) {
        deptGap[emp.dept].total += total
        deptGap[emp.dept].gaps += gaps
      }
    })
    const noEvalEmps = employees.filter(e =>
      (e.competencies || []).length === 0 ||
      (e.competencies || []).every(c => c.actualLevel === 0)
    )
    const lowEffEmps = employees.filter(e =>
      (e.competencies || []).some(c => c.effectiveness === 'ineffective')
    )
    return { deptGap, noEvalEmps, lowEffEmps }
  }, [matrixData, employees])

  return (
    <AppLayout user={user} title="ì­ë ê´ë¦¬" subtitle="ISO 13485 Â§6.2 ì¸ì ìì Â· ì§ë¬´ë³ ì­ë ìêµ¬ì¬í­ Â· GAP ë¶ì">
      <div className="px-6 lg:px-8 py-6 max-w-[1400px] mx-auto">

        {/* í­ */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-soft)' }}>
          {[
            { key: 'matrix',    label: 'ì­ë ë§¤í¸ë¦­ì¤' },
            { key: 'roles',     label: `ì§ë¬´ ê´ë¦¬ (${roles.length})` },
            { key: 'employees', label: `ì§ì ì­ë (${employees.length})` },
            { key: 'analysis',  label: 'GAP ë¶ì' },
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

        {/* ââ ì­ë ë§¤í¸ë¦­ì¤ í­ ââ */}
        {tab === 'matrix' && (
          <MatrixView
            matrixData={matrixData} roles={roles}
            filterDept={filterDept} setFilterDept={setFilterDept}
          />
        )}

        {/* ââ ì§ë¬´ ê´ë¦¬ í­ ââ */}
        {tab === 'roles' && (
          <RolesTab
            roles={roles} canEdit={canEdit}
            showForm={showRoleForm} setShowForm={setShowRoleForm}
            form={roleForm} setForm={setRoleForm}
            editId={editRoleId} setEditId={setEditRoleId}
            onSubmit={submitRole} onDelete={deleteRole}
            compDraft={roleCompDraft} setCompDraft={setRoleCompDraft}
            onAddComp={addRoleComp} onRemoveComp={removeRoleComp}
          />
        )}

        {/* ââ ì§ì ì­ë í­ ââ */}
        {tab === 'employees' && (
          <EmployeesTab
            employees={employees} canEdit={canEdit}
            showForm={showEmpForm} setShowForm={setShowEmpForm}
            form={empForm} setForm={setEmpForm}
            editId={editEmpId} setEditId={setEditEmpId}
            onSubmit={submitEmp} onDelete={deleteEmp}
            compDraft={empCompDraft} setCompDraft={setEmpCompDraft}
            onAddComp={addEmpComp} onRemoveComp={removeEmpComp}
            roles={roles}
          />
        )}

        {/* ââ GAP ë¶ì í­ ââ */}
        {tab === 'analysis' && (
          <AnalysisTab analysis={analysis} matrixData={matrixData} employees={employees} />
        )}
      </div>
    </AppLayout>
  )
}

// ââ ì­ë ë§¤í¸ë¦­ì¤ ë·° âââââââââââââââââââââââââââââââââââââââââ
function MatrixView({ matrixData, roles, filterDept, setFilterDept }) {
  const { compList, filteredEmps, empCompMap, gapStats } = matrixData

  // ì§ë¬´ì ì­ë ìêµ¬ ìì¤ ë§µ (ì´ë¦âìµê³  requiredLevel)
  const reqMap = useMemo(() => {
    const m = {}
    roles.forEach(r => (r.competencies || []).forEach(c => {
      if (!m[c.name] || c.requiredLevel > m[c.name]) m[c.name] = c.requiredLevel
    }))
    return m
  }, [roles])

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
          className="px-3 py-1.5 rounded-xl text-[13px]"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
          <option value="all">ì ì²´ ë¶ì</option>
          {DEPT_CODES.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <div className="flex gap-2 flex-wrap">
          {COMP_LEVELS.map(l => (
            <span key={l.value} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: l.bg, color: l.color }}>
              {l.value} {l.label}
            </span>
          ))}
          <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold"
            style={{ background: '#FEE2E2', color: '#DC2626' }}>
            â GAP
          </span>
        </div>
      </div>

      {filteredEmps.length === 0 || compList.length === 0 ? (
        <div className="text-center py-20" style={{ color: 'var(--ink-faint)' }}>
          <BarChart2 size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <div className="text-[14px]">ì§ë¬´ì ì§ì ì­ë ë°ì´í°ë¥¼ ë¨¼ì  ë±ë¡íì¸ì.</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="text-[11.5px] border-collapse" style={{ minWidth: 600 }}>
            <thead>
              <tr>
                <th className="text-left px-3 py-2 sticky left-0" style={{ background: 'var(--bg-card)', color: 'var(--ink-soft)', border: '1px solid var(--line)', minWidth: 120 }}>ì§ì</th>
                <th className="px-2 py-2" style={{ background: 'var(--bg-card)', color: 'var(--ink-soft)', border: '1px solid var(--line)', minWidth: 60 }}>ì¶©ì¡±ë¥ </th>
                {compList.map(c => (
                  <th key={c.name} className="px-2 py-1.5 text-center" style={{ background: 'var(--bg-card)', color: 'var(--ink-soft)', border: '1px solid var(--line)', minWidth: 72 }}>
                    {/* #344: rotate(180deg) â rotate(0deg)ì¼ë¡ ìì  (ê¸ì¨ ì ë°©í¥) */}
                    <div style={{ writingMode: 'vertical-rl', transform: 'rotate(0deg)', height: 80, fontSize: 10, fontWeight: 600, color: 'var(--ink)' }}>{c.name}</div>
                    <div className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>ìêµ¬ {reqMap[c.name] || '-'}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gapStats.map(({ emp, rate }) => {
                const cm = empCompMap[emp.id] || {}
                return (
                  <tr key={emp.id}>
                    <td className="px-3 py-2 sticky left-0 font-semibold" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                      {emp.name}
                      <div className="text-[10px] font-normal" style={{ color: 'var(--ink-faint)' }}>{emp.dept} Â· {emp.jobTitle}</div>
                    </td>
                    <td className="text-center px-2 py-2" style={{ border: '1px solid var(--line)' }}>
                      <span className="font-bold text-[12px]" style={{ color: rate === null ? 'var(--ink-faint)' : rate >= 80 ? '#059669' : rate >= 50 ? '#D97706' : '#DC2626' }}>
                        {rate !== null ? `${rate}%` : '-'}
                      </span>
                    </td>
                    {compList.map(c => {
                      const rec = cm[c.name]
                      const actual = rec?.actualLevel ?? 0
                      const required = reqMap[c.name] || 0
                      const isGap = required > 0 && actual < required
                      const lv = LEVEL_MAP[actual]
                      return (
                        <td key={c.name} className="text-center px-1 py-1" style={{ border: '1px solid var(--line)', background: isGap ? '#FFF5F5' : 'var(--bg)' }}>
                          {actual > 0 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg font-bold text-[12px]"
                              style={{ background: lv.bg, color: lv.color }}>
                              {actual}
                            </span>
                          ) : (
                            <span className="text-[10px]" style={{ color: isGap ? '#DC2626' : 'var(--ink-faint)' }}>{isGap ? 'â' : 'â'}</span>
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
  )
}

// ââ ì§ë¬´ ê´ë¦¬ í­ âââââââââââââââââââââââââââââââââââââââââââââ
function RolesTab({ roles, canEdit, showForm, setShowForm, form, setForm, editId, setEditId,
  onSubmit, onDelete, compDraft, setCompDraft, onAddComp, onRemoveComp }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-[13px]" style={{ color: 'var(--ink-soft)' }}>ì§ë¬´ë³ ì­ë ìêµ¬ì¬í­ì ì ìí©ëë¤.</div>
        {canEdit && (
          <button onClick={() => { setForm(EMPTY_ROLE); setEditId(null); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
            style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
            <Plus size={14} /> ì§ë¬´ ì¶ê°
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-5 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
          <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>{editId ? 'ì§ë¬´ ìì ' : 'ì§ë¬´ ì¶ê°'}</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <Field label="ì§ë¬´ëª *" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} />
            <FieldSelect label="ë¶ì" value={form.dept} onChange={v => setForm(f => ({ ...f, dept: v }))}
              options={DEPT_CODES.map(d => ({ value: d, label: d }))} />
            <FieldArea label="ì§ë¬´ ì¤ëª" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} rows={2} />
          </div>

          {/* ì­ë í­ëª© ì¶ê° */}
          <div className="mb-4">
            <div className="text-[12px] font-bold mb-2" style={{ color: 'var(--ink-soft)' }}>ì­ë ìêµ¬ì¬í­</div>
            <div className="flex gap-2 flex-wrap mb-3">
              <input value={compDraft.name} onChange={e => setCompDraft(d => ({ ...d, name: e.target.value }))}
                placeholder="ì­ëëª (ì: ë©¸ê·  ê³µì  ì´í´)" className="px-3 py-1.5 rounded-xl text-[12px] flex-1"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)', minWidth: 160 }} />
              <select value={compDraft.category} onChange={e => setCompDraft(d => ({ ...d, category: e.target.value }))}
                className="px-3 py-1.5 rounded-xl text-[12px]"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                {COMP_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={compDraft.requiredLevel} onChange={e => setCompDraft(d => ({ ...d, requiredLevel: Number(e.target.value) }))}
                className="px-3 py-1.5 rounded-xl text-[12px]"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                {COMP_LEVELS.filter(l => l.value > 0).map(l => (
                  <option key={l.value} value={l.value}>ìêµ¬ {l.value} â {l.label}</option>
                ))}
              </select>
              <button onClick={onAddComp} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12px] font-bold"
                style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                <Plus size={12} /> ì¶ê°
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(form.competencies || []).map((c, i) => {
                const lv = LEVEL_MAP[c.requiredLevel]
                return (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                    style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
                    <span className="text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>{c.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: lv.bg, color: lv.color }}>ìêµ¬ {c.requiredLevel}</span>
                    <span className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{c.category}</span>
                    <button onClick={() => onRemoveComp(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626' }}><X size={12} /></button>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={onSubmit} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
              style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
              <Save size={13} /> ì ì¥
            </button>
            <button onClick={() => { setShowForm(false); setForm(EMPTY_ROLE); setEditId(null) }}
              className="px-4 py-2 rounded-xl text-[13px]"
              style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
              ì·¨ì
            </button>
          </div>
        </div>
      )}

      {roles.length === 0 ? (
        <div className="text-center py-20" style={{ color: 'var(--ink-faint)' }}>
          <Briefcase size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <div className="text-[14px]">ë±ë¡ë ì§ë¬´ê° ììµëë¤.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map(role => (
            <div key={role.id} className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>{role.title}</div>
                  <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{role.dept} Â· {(role.competencies || []).length}ê° ì­ë ìêµ¬</div>
                </div>
                {canEdit && (
                  <div className="flex gap-1">
                    <button onClick={() => { setForm({ ...EMPTY_ROLE, ...role }); setEditId(role.id); setShowForm(true) }}
                      className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                      <Edit2 size={12} style={{ color: 'var(--ink-soft)' }} />
                    </button>
                    <button onClick={() => onDelete(role.id)}
                      className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', border: '1px solid #FECACA', cursor: 'pointer' }}>
                      <Trash2 size={12} style={{ color: '#DC2626' }} />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(role.competencies || []).map((c, i) => {
                  const lv = LEVEL_MAP[c.requiredLevel]
                  return (
                    <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px]"
                      style={{ background: lv.bg, border: `1px solid ${lv.color}30` }}>
                      <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{c.name}</span>
                      <span className="font-bold" style={{ color: lv.color }}>Lv.{c.requiredLevel}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ââ ì§ì ì­ë í­ âââââââââââââââââââââââââââââââââââââââââââââ
function EmployeesTab({ employees, canEdit, showForm, setShowForm, form, setForm, editId, setEditId,
  onSubmit, onDelete, compDraft, setCompDraft, onAddComp, onRemoveComp, roles }) {

  const EFFECTIVENESS = [
    { value: '', label: 'ë¯¸íê°' },
    { value: 'effective', label: 'í¨ê³¼ì ' },
    { value: 'partial', label: 'ë¶ë¶ í¨ê³¼' },
    { value: 'ineffective', label: 'ë¹í¨ê³¼ì ' },
  ]

  // ì íë ë¶ìì ì§ë¬´ ì­ë ìë ì±ì°ê¸°
  function autofillFromRole() {
    const role = roles.find(r => r.dept === form.dept)
    if (!role || !(role.competencies || []).length) return alert('í´ë¹ ë¶ìì ì§ë¬´ ì­ë ìêµ¬ì¬í­ì´ ììµëë¤.')
    const existing = new Set((form.competencies || []).map(c => c.name))
    const toAdd = (role.competencies || []).filter(c => !existing.has(c.name)).map(c => ({
      name: c.name, actualLevel: 0, evaluatedAt: todayStr(), evaluatedBy: '', effectiveness: '', notes: '',
    }))
    if (!toAdd.length) return alert('ì´ë¯¸ ëª¨ë  ì­ëì´ ë±ë¡ëì´ ììµëë¤.')
    setForm(f => ({ ...f, competencies: [...(f.competencies || []), ...toAdd] }))
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-[13px]" style={{ color: 'var(--ink-soft)' }}>ì§ìë³ ì¤ì  ì­ë ìì¤ì ê¸°ë¡Â·íê°í©ëë¤.</div>
        {canEdit && (
          <button onClick={() => { setForm(EMPTY_EMP); setEditId(null); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
            style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
            <Plus size={14} /> ì§ì ì¶ê°
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-5 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
          <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>{editId ? 'ì§ì ì­ë ìì ' : 'ì§ì ì­ë ì¶ê°'}</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <Field label="ì´ë¦ *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
            {/* #346: ì¬ë² ì­ì  */}
            <FieldSelect label="ë¶ì" value={form.dept} onChange={v => setForm(f => ({ ...f, dept: v }))}
              options={DEPT_CODES.map(d => ({ value: d, label: d }))} />
            <Field label="ì§ì±" value={form.jobTitle} onChange={v => setForm(f => ({ ...f, jobTitle: v }))} />
            <Field label="ìì¬ì¼" type="date" value={form.hireDate} onChange={v => setForm(f => ({ ...f, hireDate: v }))} />
            <Field label="ì´ë©ì¼" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} />
          </div>

          {/* ì­ë íê° ìë ¥ */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[12px] font-bold" style={{ color: 'var(--ink-soft)' }}>ì­ë íê° ê¸°ë¡</div>
              <button onClick={autofillFromRole} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px]"
                style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink-soft)', cursor: 'pointer' }}>
                <BookOpen size={11} /> ì§ë¬´ ì­ë ìë ì±ì°ê¸°
              </button>
            </div>
            <div className="flex gap-2 flex-wrap mb-3">
              <input value={compDraft.name} onChange={e => setCompDraft(d => ({ ...d, name: e.target.value }))}
                placeholder="ì­ëëª" className="px-3 py-1.5 rounded-xl text-[12px] flex-1"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)', minWidth: 140 }} />
              <select value={compDraft.actualLevel} onChange={e => setCompDraft(d => ({ ...d, actualLevel: Number(e.target.value) }))}
                className="px-3 py-1.5 rounded-xl text-[12px]"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                {COMP_LEVELS.map(l => <option key={l.value} value={l.value}>{l.value} â {l.label}</option>)}
              </select>
              <input type="date" value={compDraft.evaluatedAt} onChange={e => setCompDraft(d => ({ ...d, evaluatedAt: e.target.value }))}
                className="px-3 py-1.5 rounded-xl text-[12px]"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
              <input value={compDraft.evaluatedBy} onChange={e => setCompDraft(d => ({ ...d, evaluatedBy: e.target.value }))}
                placeholder="íê°ì" className="px-3 py-1.5 rounded-xl text-[12px]"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)', width: 100 }} />
              <select value={compDraft.effectiveness} onChange={e => setCompDraft(d => ({ ...d, effectiveness: e.target.value }))}
                className="px-3 py-1.5 rounded-xl text-[12px]"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                {EFFECTIVENESS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
              <button onClick={onAddComp} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12px] font-bold"
                style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                <Plus size={12} /> ì¶ê°
              </button>
            </div>
            <div className="space-y-1">
              {(form.competencies || []).map((c, i) => {
                const lv = LEVEL_MAP[c.actualLevel]
                const eff = { effective: { label: 'í¨ê³¼ì ', color: '#059669' }, partial: { label: 'ë¶ë¶', color: '#D97706' }, ineffective: { label: 'ë¹í¨ê³¼ì ', color: '#DC2626' } }
                const effInfo = eff[c.effectiveness]
                return (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl flex-wrap"
                    style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
                    <span className="text-[12px] font-semibold flex-1" style={{ color: 'var(--ink)' }}>{c.name}</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: lv.bg, color: lv.color }}>Lv.{c.actualLevel} {lv.label}</span>
                    {effInfo && <span className="text-[10px] font-bold" style={{ color: effInfo.color }}>{effInfo.label}</span>}
                    <span className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{c.evaluatedAt} {c.evaluatedBy && `Â· ${c.evaluatedBy}`}</span>
                    <button onClick={() => onRemoveComp(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626' }}><X size={12} /></button>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={onSubmit} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
              style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
              <Save size={13} /> ì ì¥
            </button>
            <button onClick={() => { setShowForm(false); setForm(EMPTY_EMP); setEditId(null) }}
              className="px-4 py-2 rounded-xl text-[13px]"
              style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
              ì·¨ì
            </button>
          </div>
        </div>
      )}

      {employees.length === 0 ? (
        <div className="text-center py-20" style={{ color: 'var(--ink-faint)' }}>
          <Users size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <div className="text-[14px]">ë±ë¡ë ì§ìì´ ììµëë¤.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {employees.map(emp => {
            const evalCount = (emp.competencies || []).filter(c => c.actualLevel > 0).length
            const totalCount = (emp.competencies || []).length
            const ineffective = (emp.competencies || []).filter(c => c.effectiveness === 'ineffective')
            return (
              <div key={emp.id} className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: `1.5px solid ${ineffective.length > 0 ? '#FECACA' : 'var(--line)'}` }}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[14px]"
                      style={{ background: 'var(--bg-soft)', color: 'var(--moss)' }}>
                      {emp.name?.[0] || '?'}
                    </div>
                    <div>
                      <div className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>{emp.name}</div>
                      <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{emp.dept} Â· {emp.jobTitle} Â· {emp.employeeNo}</div>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1">
                      <button onClick={() => { setForm({ ...EMPTY_EMP, ...emp }); setEditId(emp.id); setShowForm(true) }}
                        className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                        <Edit2 size={12} style={{ color: 'var(--ink-soft)' }} />
                      </button>
                      <button onClick={() => onDelete(emp.id)}
                        className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', border: '1px solid #FECACA', cursor: 'pointer' }}>
                        <Trash2 size={12} style={{ color: '#DC2626' }} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="text-[11.5px] mb-2" style={{ color: 'var(--ink-soft)' }}>
                  ì­ë íê° {evalCount}/{totalCount}ê±´
                  {ineffective.length > 0 && <span className="ml-2 font-bold" style={{ color: '#DC2626' }}>â  ë¹í¨ê³¼ì  {ineffective.length}ê±´</span>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(emp.competencies || []).slice(0, 6).map((c, i) => {
                    const lv = LEVEL_MAP[c.actualLevel]
                    return (
                      <div key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px]"
                        style={{ background: lv.bg, border: `1px solid ${lv.color}30` }}>
                        <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{c.name}</span>
                        <span style={{ color: lv.color, fontWeight: 700 }}>Lv.{c.actualLevel}</span>
                      </div>
                    )
                  })}
                  {(emp.competencies || []).length > 6 && (
                    <span className="text-[10px] self-center" style={{ color: 'var(--ink-faint)' }}>+{(emp.competencies || []).length - 6}ê°</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ââ GAP ë¶ì í­ ââââââââââââââââââââââââââââââââââââââââââââââ
function AnalysisTab({ analysis, matrixData, employees }) {
  const { gapStats } = matrixData
  const withGaps = gapStats.filter(s => s.gaps > 0)
  const noData = gapStats.filter(s => s.total === 0)

  return (
    <div className="space-y-5">
      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniKpi label="ì ì²´ ì§ì" value={employees.length} />
        <MiniKpi label="GAP ì¡´ì¬" value={withGaps.length} warn={withGaps.length > 0} />
        <MiniKpi label="ë¯¸íê°" value={analysis.noEvalEmps.length} warn={analysis.noEvalEmps.length > 0} />
        <MiniKpi label="êµì¡ ë¹í¨ê³¼" value={analysis.lowEffEmps.length} bad={analysis.lowEffEmps.length > 0} />
      </div>

      {/* GAP ìì ì§ì */}
      {withGaps.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>ì­ë GAP ì§ì</div>
          <div className="space-y-2">
            {withGaps.sort((a, b) => b.gaps - a.gaps).slice(0, 10).map(({ emp, total, gaps, met, rate }) => (
              <div key={emp.id} className="flex items-center gap-3 p-2.5 rounded-xl"
                style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0"
                  style={{ background: 'var(--bg-card)', color: 'var(--moss)' }}>{emp.name?.[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-bold" style={{ color: 'var(--ink)' }}>{emp.name} <span className="font-normal text-[11px]" style={{ color: 'var(--ink-faint)' }}>{emp.dept} Â· {emp.jobTitle}</span></div>
                  <div className="h-1.5 rounded-full mt-1" style={{ background: 'var(--line)' }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${rate}%`, background: rate >= 80 ? '#059669' : rate >= 50 ? '#D97706' : '#DC2626' }} />
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-[13px] font-bold" style={{ color: rate >= 80 ? '#059669' : rate >= 50 ? '#D97706' : '#DC2626' }}>{rate}%</div>
                  <div className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>GAP {gaps}/{total}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ë¯¸íê°  ì§ì */}
      {analysis.noEvalEmps.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <div className="text-[13px] font-bold mb-2" style={{ color: '#92400E' }}>â  ì­ë ë¯¸íê° ì§ì ({analysis.noEvalEmps.length}ëª)</div>
          <div className="flex flex-wrap gap-2">
            {analysis.noEvalEmps.map(e => (
              <span key={e.id} className="px-2.5 py-1 rounded-lg text-[11.5px] font-semibold"
                style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}>
                {e.name} ({e.dept})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* êµì¡ ë¹í¨ê³¼ */}
      {analysis.lowEffEmps.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
          <div className="text-[13px] font-bold mb-2" style={{ color: '#991B1B' }}>êµì¡ í¨ê³¼ì± ë¯¸ë¬ ì§ì</div>
          <div className="flex flex-wrap gap-2">
            {analysis.lowEffEmps.map(e => (
              <span key={e.id} className="px-2.5 py-1 rounded-lg text-[11.5px] font-semibold"
                style={{ background: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA' }}>
                {e.name} ({e.dept})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MiniKpi({ label, value, warn, bad }) {
  const color = bad ? '#DC2626' : warn ? '#D97706' : 'var(--ink)'
  const bg    = bad ? '#FEE2E2' : warn ? '#FEF3C7' : 'var(--bg-card)'
  const border = bad ? '#FECACA' : warn ? '#FDE68A' : 'var(--line)'
  return (
    <div className="p-4 rounded-2xl text-center" style={{ background: bg, border: `1px solid ${border}` }}>
      <div className="text-[26px] font-bold" style={{ color }}>{value}</div>
      <div className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>{label}</div>
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
function FieldArea({ label, value, onChange, rows = 3 }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows}
        className="w-full px-3 py-1.5 rounded-xl text-[13px] resize-none"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
    </div>
  )
}
