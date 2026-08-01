// src/pages/competency/CompetencyHub.jsx
// ISO 13485 §6.2 인적자원 — 역량 관리 허브
import React, { useState, useMemo } from 'react'
import {
  Plus, X, Save, Edit2, Trash2, Users, Star, CheckCircle2,
  AlertTriangle, XCircle, BarChart2, BookOpen, Award,
  User, Briefcase, ChevronRight, Download,
  GraduationCap,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'
import { loadOrgDepts } from '../../lib/orgDepts'

// ── 상수 ─────────────────────────────────────────────────────
const LS_ROLES  = 'qualytree.comp_roles'
const LS_EMP    = 'qualytree.comp_employees'

const COMP_LEVELS = [
  { value: 0, label: '미평가', color: '#9CA3AF', bg: '#F3F4F6' },
  { value: 1, label: '기초',   color: '#3B82F6', bg: '#EFF6FF' },
  { value: 2, label: '실무',   color: '#8B5CF6', bg: '#F5F3FF' },
  { value: 3, label: '숙련',   color: '#059669', bg: '#ECFDF5' },
  { value: 4, label: '전문',   color: '#D97706', bg: '#FEF3C7' },
]
const LEVEL_MAP = Object.fromEntries(COMP_LEVELS.map(l => [l.value, l]))

const COMP_CATEGORIES = ['기술 역량', '품질/규제', '안전', '관리/리더십', '언어/소통', '기타']


function todayStr() { return new Date().toISOString().slice(0, 10) }
function roleId()  { return `ROL-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }
function empId()   { return `EMP-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }

const EMPTY_ROLE = {
  title: '', dept: '', description: '',
  competencies: [], // [{ name, category, requiredLevel }]
}
const EMPTY_EMP = {
  name: '', dept: '', jobTitle: '',
  hireDate: todayStr(), email: '', phone: '',
  competencies: [], // [{ name, actualLevel, evaluatedAt, evaluatedBy, effectiveness, notes }]
  notes: '',
}

// ── 메인 ─────────────────────────────────────────────────────
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

  // 역할 폼
  const [showRoleForm, setShowRoleForm] = useState(false)
  const [roleForm, setRoleForm] = useState(EMPTY_ROLE)
  const [editRoleId, setEditRoleId] = useState(null)
  const [roleCompDraft, setRoleCompDraft] = useState({ name: '', category: '기술 역량', requiredLevel: 2 })

  // 직원 폼
  const [showEmpForm, setShowEmpForm] = useState(false)
  const [empForm, setEmpForm] = useState(EMPTY_EMP)
  const [editEmpId, setEditEmpId] = useState(null)
  const [empCompDraft, setEmpCompDraft] = useState({ name: '', actualLevel: 0, evaluatedAt: todayStr(), evaluatedBy: '', effectiveness: '', notes: '' })
  const [filterDept, setFilterDept] = useState('all')

  function saveRoles(list) { setRoles(list); localStorage.setItem(LS_ROLES, JSON.stringify(list)) }
  function saveEmps(list)  { setEmployees(list); localStorage.setItem(LS_EMP, JSON.stringify(list)) }

  // ── 역할 CRUD ─────────────────────────────────────────────
  function submitRole() {
    if (!roleForm.title.trim()) return alert('직무명을 입력하세요.')
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
    if (!confirm('직무를 삭제하시겠습니까?')) return
    saveRoles(roles.filter(r => r.id !== id))
  }

  function addRoleComp() {
    if (!roleCompDraft.name.trim()) return
    setRoleForm(f => ({ ...f, competencies: [...(f.competencies || []), { ...roleCompDraft }] }))
    setRoleCompDraft({ name: '', category: '기술 역량', requiredLevel: 2 })
  }
  function removeRoleComp(idx) {
    setRoleForm(f => ({ ...f, competencies: f.competencies.filter((_, i) => i !== idx) }))
  }

  // ── 직원 CRUD ─────────────────────────────────────────────
  function submitEmp() {
    if (!empForm.name.trim()) return alert('직원명을 입력하세요.')
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
    if (!confirm('직원 기록을 삭제하시겠습니까?')) return
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

  // ── 역량 매트릭스 계산 ─────────────────────────────────────
  // 직무별로 요구 역량을 모으고, 직원들의 실제 수준과 비교
  const matrixData = useMemo(() => {
    const filteredEmps = filterDept === 'all' ? employees : employees.filter(e => e.dept === filterDept)
    // 전체 역량 항목 목록 (role에서 모음)
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

    // 직원별 역량 맵
    const empCompMap = {}
    filteredEmps.forEach(e => {
      empCompMap[e.id] = {}
      ;(e.competencies || []).forEach(c => { empCompMap[e.id][c.name] = c })
    })

    // GAP 계산
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

  // 분석 데이터
  const analysis = useMemo(() => {
    const deptGap = {}
    loadOrgDepts().forEach(d => { deptGap[d] = { total: 0, gaps: 0 } })
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
    <AppLayout user={user} title="역량 관리" subtitle="ISO 13485 §6.2 인적자원 · 직무별 역량 요구사항 · GAP 분석">
      <div className="px-6 lg:px-8 py-6 max-w-[1400px] mx-auto">

        {/* 탭 */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-soft)' }}>
          {[
            { key: 'matrix',    label: '역량 매트릭스' },
            { key: 'roles',     label: `직무 관리 (${roles.length})` },
            { key: 'employees', label: `직원 역량 (${employees.length})` },
            { key: 'analysis',  label: 'GAP 분석' },
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

        {/* ── 역량 매트릭스 탭 ── */}
        {tab === 'matrix' && (
          <MatrixView
            matrixData={matrixData} roles={roles}
            filterDept={filterDept} setFilterDept={setFilterDept}
          />
        )}

        {/* ── 직무 관리 탭 ── */}
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

        {/* ── 직원 역량 탭 ── */}
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

        {/* ── GAP 분석 탭 ── */}
        {tab === 'analysis' && (
          <AnalysisTab analysis={analysis} matrixData={matrixData} employees={employees} />
        )}
      </div>
    </AppLayout>
  )
}

// ── 역량 매트릭스 뷰 ─────────────────────────────────────────
function MatrixView({ matrixData, roles, filterDept, setFilterDept }) {
  const { compList, filteredEmps, empCompMap, gapStats } = matrixData

  // 직무의 역량 요구 수준 맵 (이름→최고 requiredLevel)
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
          <option value="all">전체 부서</option>
          {loadOrgDepts().map(d => <option key={d} value={d}>{d}</option>)}
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
            ✕ GAP
          </span>
        </div>
      </div>

      {filteredEmps.length === 0 || compList.length === 0 ? (
        <div className="text-center py-20" style={{ color: 'var(--ink-faint)' }}>
          <BarChart2 size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <div className="text-[14px]">직무와 직원 역량 데이터를 먼저 등록하세요.</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="text-[11.5px] border-collapse" style={{ minWidth: 600 }}>
            <thead>
              <tr>
                <th className="text-left px-3 py-2 sticky left-0" style={{ background: 'var(--bg-card)', color: 'var(--ink-soft)', border: '1px solid var(--line)', minWidth: 120 }}>직원</th>
                <th className="px-2 py-2" style={{ background: 'var(--bg-card)', color: 'var(--ink-soft)', border: '1px solid var(--line)', minWidth: 60 }}>충족률</th>
                {compList.map(c => (
                  <th key={c.name} className="px-2 py-1.5 text-center" style={{ background: 'var(--bg-card)', color: 'var(--ink-soft)', border: '1px solid var(--line)', minWidth: 72 }}>
                    <div style={{ writingMode: 'vertical-rl', height: 80, fontSize: 10, fontWeight: 600, color: 'var(--ink)' }}>{c.name}</div>
                    <div className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>요구 {reqMap[c.name] || '-'}</div>
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
                      <div className="text-[10px] font-normal" style={{ color: 'var(--ink-faint)' }}>{emp.dept} · {emp.jobTitle}</div>
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
                            <span className="text-[10px]" style={{ color: isGap ? '#DC2626' : 'var(--ink-faint)' }}>{isGap ? '✕' : '–'}</span>
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

// ── 직무 관리 탭 ─────────────────────────────────────────────
function RolesTab({ roles, canEdit, showForm, setShowForm, form, setForm, editId, setEditId,
  onSubmit, onDelete, compDraft, setCompDraft, onAddComp, onRemoveComp }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-[13px]" style={{ color: 'var(--ink-soft)' }}>직무별 역량 요구사항을 정의합니다.</div>
        {canEdit && (
          <button onClick={() => { setForm(EMPTY_ROLE); setEditId(null); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
            style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
            <Plus size={14} /> 직무 추가
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-5 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
          <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>{editId ? '직무 수정' : '직무 추가'}</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <Field label="직무명 *" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} />
            <FieldSelect label="부서" value={form.dept} onChange={v => setForm(f => ({ ...f, dept: v }))}
              options={loadOrgDepts().map(d => ({ value: d, label: d }))} />
            <FieldArea label="직무 설명" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} rows={2} />
          </div>

          {/* 역량 항목 추가 */}
          <div className="mb-4">
            <div className="text-[12px] font-bold mb-2" style={{ color: 'var(--ink-soft)' }}>역량 요구사항</div>
            <div className="flex gap-2 flex-wrap mb-3">
              <input value={compDraft.name} onChange={e => setCompDraft(d => ({ ...d, name: e.target.value }))}
                placeholder="역량명 (예: 멸균 공정 이해)" className="px-3 py-1.5 rounded-xl text-[12px] flex-1"
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
                  <option key={l.value} value={l.value}>요구 {l.value} — {l.label}</option>
                ))}
              </select>
              <button onClick={onAddComp} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12px] font-bold"
                style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                <Plus size={12} /> 추가
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(form.competencies || []).map((c, i) => {
                const lv = LEVEL_MAP[c.requiredLevel]
                return (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                    style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
                    <span className="text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>{c.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: lv.bg, color: lv.color }}>요구 {c.requiredLevel}</span>
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
              <Save size={13} /> 저장
            </button>
            <button onClick={() => { setShowForm(false); setForm(EMPTY_ROLE); setEditId(null) }}
              className="px-4 py-2 rounded-xl text-[13px]"
              style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
              취소
            </button>
          </div>
        </div>
      )}

      {roles.length === 0 ? (
        <div className="text-center py-20" style={{ color: 'var(--ink-faint)' }}>
          <Briefcase size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <div className="text-[14px]">등록된 직무가 없습니다.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map(role => (
            <div key={role.id} className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>{role.title}</div>
                  <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{role.dept} · {(role.competencies || []).length}개 역량 요구</div>
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

// ── 직원 역량 탭 ─────────────────────────────────────────────
function EmployeesTab({ employees, canEdit, showForm, setShowForm, form, setForm, editId, setEditId,
  onSubmit, onDelete, compDraft, setCompDraft, onAddComp, onRemoveComp, roles }) {

  const EFFECTIVENESS = [
    { value: '', label: '미평가' },
    { value: 'effective', label: '효과적' },
    { value: 'partial', label: '부분 효과' },
    { value: 'ineffective', label: '비효과적' },
  ]

  // 선택된 부서의 직무 역량 자동 채우기
  function autofillFromRole() {
    const role = roles.find(r => r.dept === form.dept)
    if (!role || !(role.competencies || []).length) return alert('해당 부서의 직무 역량 요구사항이 없습니다.')
    const existing = new Set((form.competencies || []).map(c => c.name))
    const toAdd = (role.competencies || []).filter(c => !existing.has(c.name)).map(c => ({
      name: c.name, actualLevel: 0, evaluatedAt: todayStr(), evaluatedBy: '', effectiveness: '', notes: '',
    }))
    if (!toAdd.length) return alert('이미 모든 역량이 등록되어 있습니다.')
    setForm(f => ({ ...f, competencies: [...(f.competencies || []), ...toAdd] }))
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-[13px]" style={{ color: 'var(--ink-soft)' }}>직원별 실제 역량 수준을 기록·평가합니다.</div>
        {canEdit && (
          <button onClick={() => { setForm(EMPTY_EMP); setEditId(null); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
            style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
            <Plus size={14} /> 직원 추가
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-5 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
          <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>{editId ? '직원 역량 수정' : '직원 역량 추가'}</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <Field label="이름 *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
            <FieldSelect label="부서" value={form.dept} onChange={v => setForm(f => ({ ...f, dept: v }))}
              options={loadOrgDepts().map(d => ({ value: d, label: d }))} />
            <Field label="직책" value={form.jobTitle} onChange={v => setForm(f => ({ ...f, jobTitle: v }))} />
            <Field label="입사일" type="date" value={form.hireDate} onChange={v => setForm(f => ({ ...f, hireDate: v }))} />
            <Field label="이메일" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} />
          </div>

          {/* 역량 평가 입력 */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[12px] font-bold" style={{ color: 'var(--ink-soft)' }}>역량 평가 기록</div>
              <button onClick={autofillFromRole} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px]"
                style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink-soft)', cursor: 'pointer' }}>
                <BookOpen size={11} /> 직무 역량 자동 채우기
              </button>
            </div>
            <div className="flex gap-2 flex-wrap mb-3">
              <input value={compDraft.name} onChange={e => setCompDraft(d => ({ ...d, name: e.target.value }))}
                placeholder="역량명" className="px-3 py-1.5 rounded-xl text-[12px] flex-1"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)', minWidth: 140 }} />
              <select value={compDraft.actualLevel} onChange={e => setCompDraft(d => ({ ...d, actualLevel: Number(e.target.value) }))}
                className="px-3 py-1.5 rounded-xl text-[12px]"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                {COMP_LEVELS.map(l => <option key={l.value} value={l.value}>{l.value} — {l.label}</option>)}
              </select>
              <input type="date" value={compDraft.evaluatedAt} onChange={e => setCompDraft(d => ({ ...d, evaluatedAt: e.target.value }))}
                className="px-3 py-1.5 rounded-xl text-[12px]"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
              <input value={compDraft.evaluatedBy} onChange={e => setCompDraft(d => ({ ...d, evaluatedBy: e.target.value }))}
                placeholder="평가자" className="px-3 py-1.5 rounded-xl text-[12px]"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)', width: 100 }} />
              <select value={compDraft.effectiveness} onChange={e => setCompDraft(d => ({ ...d, effectiveness: e.target.value }))}
                className="px-3 py-1.5 rounded-xl text-[12px]"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                {EFFECTIVENESS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
              <button onClick={onAddComp} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12px] font-bold"
                style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                <Plus size={12} /> 추가
              </button>
            </div>
            <input value={compDraft.notes} onChange={e => setCompDraft(d => ({ ...d, notes: e.target.value }))}
              placeholder="평가 근거 (예: OJT 관찰 결과, 시험 성적, 자격증 사본 등)" className="w-full px-3 py-1.5 rounded-xl text-[12px] mb-3"
              style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
            <div className="space-y-1">
              {(form.competencies || []).map((c, i) => {
                const lv = LEVEL_MAP[c.actualLevel]
                const eff = { effective: { label: '효과적', color: '#059669' }, partial: { label: '부분', color: '#D97706' }, ineffective: { label: '비효과적', color: '#DC2626' } }
                const effInfo = eff[c.effectiveness]
                return (
                  <div key={i} className="px-3 py-2 rounded-xl"
                    style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[12px] font-semibold flex-1" style={{ color: 'var(--ink)' }}>{c.name}</span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: lv.bg, color: lv.color }}>Lv.{c.actualLevel} {lv.label}</span>
                      {effInfo && <span className="text-[10px] font-bold" style={{ color: effInfo.color }}>{effInfo.label}</span>}
                      <span className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{c.evaluatedAt} {c.evaluatedBy && `· ${c.evaluatedBy}`}</span>
                      <button onClick={() => onRemoveComp(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626' }}><X size={12} /></button>
                    </div>
                    {c.notes && <div className="text-[11px] mt-1" style={{ color: 'var(--ink-faint)' }}>근거: {c.notes}</div>}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={onSubmit} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
              style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
              <Save size={13} /> 저장
            </button>
            <button onClick={() => { setShowForm(false); setForm(EMPTY_EMP); setEditId(null) }}
              className="px-4 py-2 rounded-xl text-[13px]"
              style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
              취소
            </button>
          </div>
        </div>
      )}

      {employees.length === 0 ? (
        <div className="text-center py-20" style={{ color: 'var(--ink-faint)' }}>
          <Users size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <div className="text-[14px]">등록된 직원이 없습니다.</div>
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
                      <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{emp.dept} · {emp.jobTitle}</div>
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
                  역량 평가 {evalCount}/{totalCount}건
                  {ineffective.length > 0 && <span className="ml-2 font-bold" style={{ color: '#DC2626' }}>⚠ 비효과적 {ineffective.length}건</span>}
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
                    <span className="text-[10px] self-center" style={{ color: 'var(--ink-faint)' }}>+{(emp.competencies || []).length - 6}개</span>
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

// ── GAP 분석 탭 ──────────────────────────────────────────────
function AnalysisTab({ analysis, matrixData, employees }) {
  const { gapStats } = matrixData
  const withGaps = gapStats.filter(s => s.gaps > 0)
  const noData = gapStats.filter(s => s.total === 0)

  return (
    <div className="space-y-5">
      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniKpi label="전체 직원" value={employees.length} />
        <MiniKpi label="GAP 존재" value={withGaps.length} warn={withGaps.length > 0} />
        <MiniKpi label="미평가" value={analysis.noEvalEmps.length} warn={analysis.noEvalEmps.length > 0} />
        <MiniKpi label="교육 비효과" value={analysis.lowEffEmps.length} bad={analysis.lowEffEmps.length > 0} />
      </div>

      {/* GAP 상위 직원 */}
      {withGaps.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>역량 GAP 직원</div>
          <div className="space-y-2">
            {withGaps.sort((a, b) => b.gaps - a.gaps).slice(0, 10).map(({ emp, total, gaps, met, rate }) => (
              <div key={emp.id} className="flex items-center gap-3 p-2.5 rounded-xl"
                style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0"
                  style={{ background: 'var(--bg-card)', color: 'var(--moss)' }}>{emp.name?.[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-bold" style={{ color: 'var(--ink)' }}>{emp.name} <span className="font-normal text-[11px]" style={{ color: 'var(--ink-faint)' }}>{emp.dept} · {emp.jobTitle}</span></div>
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

      {/* 미평가 직원 */}
      {analysis.noEvalEmps.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <div className="text-[13px] font-bold mb-2" style={{ color: '#92400E' }}>⚠ 역량 미평가 직원 ({analysis.noEvalEmps.length}명)</div>
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

      {/* 교육 비효과 */}
      {analysis.lowEffEmps.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
          <div className="text-[13px] font-bold mb-2" style={{ color: '#991B1B' }}>교육 효과성 미달 직원</div>
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
