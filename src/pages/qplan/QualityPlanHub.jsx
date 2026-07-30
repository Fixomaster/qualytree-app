// src/pages/qplan/QualityPlanHub.jsx
// ISO 13485 Â§7.1 ì í ì¤íì ê³í â íì§ ê³í íë¸
import React, { useState, useMemo } from 'react'
import {
  Plus, Save, Edit2, Trash2, CheckCircle2, Clock,
  AlertTriangle, FileText, Link2, ChevronRight,
  Package, Layers, ClipboardList, BarChart2,
  Shield, FlaskConical, Microscope, GitBranch,
  Star, ArrowRight, X,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'

// ââ ìì âââââââââââââââââââââââââââââââââââââââââââââââââââââ
const LS_KEY = 'qualytree.quality_plans'

const PLAN_STATUSES = {
  draft:    { label: 'ì´ì',    color: '#6366F1', bg: '#EEF2FF' },
  review:   { label: 'ê²í  ì¤', color: '#D97706', bg: '#FEF3C7' },
  approved: { label: 'ì¹ì¸',    color: '#059669', bg: '#D1FAE5' },
  obsolete: { label: 'íê¸°',    color: '#9CA3AF', bg: '#F3F4F6' },
}

/* #366: ê¸°ê¸°ë±ê¸ â êµ­ë´ GMP ë±ê¸ ê¸°ì¤ */
const DEVICE_CLASSES = ['1ë±ê¸', '2ë±ê¸', '3ë±ê¸', '4ë±ê¸', 'ë¯¸ë¶ë¥']

const ACTIVITY_GROUPS = [
  {
    group: 'ì¤ê³Â·ê°ë° (Â§7.3)',
    items: [
      'ì¤ê³ ìë ¥ ê²í  ë° ì¹ì¸',
      'ì¤ê³ ì¶ë ¥ ê²í ',
      'ì¤ê³ ê²í  (Design Review)',
      'ì¤ê³ ê²ì¦ (Design Verification)',
      'ì¤ê³ ì í¨ì± íì¸ (Design Validation)',
      'ì¤ê³ ì´ì  (Design Transfer)',
    ],
  },
  {
    group: 'ìí ê´ë¦¬ (ISO 14971)',
    items: [
      'ìí ë¶ì (FMEA)',
      'ìí ì ê° ì¡°ì¹',
      'ìë¥ ìí íê°',
      'ìí ê´ë¦¬ ë³´ê³ ì ì¹ì¸',
    ],
  },
  {
    group: 'êµ¬ë§¤Â·ê³µê¸ìì²´ (Â§7.4)',
    items: [
      'ê³µê¸ìì²´ ì ì  ë° íê°',
      'êµ¬ë§¤ ì¬ìì ìì±',
      'ìì ê²ì¬ ê¸°ì¤ ìë¦½',
    ],
  },
  {
    group: 'ìì°Â·ìë¹ì¤ ì ê³µ (Â§7.5)',
    items: [
      'ìì° ê³µì  ë¬¸ìí (SOP)',
      'ê³µì  ì í¨ì± íì¸ (Validation)',
      'ì²­ê²° ê´ë¦¬ ê¸°ì¤ ìë¦½ (Â§7.5.2)',
      'ì í ìë³Â·ì¶ì ì± ê¸°ì¤ ìë¦½ (Â§7.5.9)',
      'ë³´ì¡´Â·ì·¨ê¸Â·í¬ì¥ ê¸°ì¤ ìë¦½ (Â§7.5.11)',
    ],
  },
  {
    group: 'ê²ì¬Â·ì¸¡ì  (Â§7.6 / Â§8.2)',
    items: [
      'ê²ì¬ ê¸°ì¤ì (IQC/ê³µì ê²ì¬/ìµì¢ê²ì¬) ìì±',
      'ì¸¡ì  ì¥ë¹ êµì  ê³í ìë¦½',
      'ìíë§ ê³í ìë¦½',
      'í©ê²© ê¸°ì¤ ì ì',
    ],
  },
  {
    group: 'ê·ì Â·ì¸íê°',
    items: [
      'ê·ì  ë¶ë¥ íì  (ìë£ê¸°ê¸° ë±ê¸)',
      'ì¸Â·íê° ì ì²­ ìë£ ì¤ë¹',
      'ìì ë°ì´í° ìêµ¬ì¬í­ ê²í ',
      'ë¼ë²¨ë§ ìêµ¬ì¬í­ ì ì',
      'UDI ë±ë¡ ê³í',
    ],
  },
  {
    group: 'íì§ ê¸°ë¡',
    items: [
      'íì ê¸°ë¡ ëª©ë¡ ìì± (Â§4.2.4)',
      'ê¸°ë¡ ë³´ì¡´ ê¸°ê° ì ì',
      'DHF êµ¬ì± ê³í',
      'DMR(Device Master Record) êµ¬ì±',
    ],
  },
]

const ALL_DEFAULT_ITEMS = ACTIVITY_GROUPS.flatMap(g =>
  g.items.map(name => ({ group: g.group, name, required: true, status: 'not_started', owner: '', dueDate: '', linkedId: '', notes: '' }))
)

const ITEM_STATUSES = {
  not_started: { label: 'ë¯¸ìì',  color: '#9CA3AF' },
  in_progress: { label: 'ì§í ì¤', color: '#D97706' },
  completed:   { label: 'ìë£',    color: '#059669' },
  na:          { label: 'N/A',     color: '#6B7280' },
}

function planId() { return `QP-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }
function todayStr(){ return new Date().toISOString().slice(0, 10) }

const EMPTY_PLAN = {
  productName: '', productCode: '', revision: '1.0',
  deviceClass: '2ë±ê¸', intendedUse: '',
  projectManager: '', approver: '', approvedDate: '',
  startDate: todayStr(), targetDate: '',
  status: 'draft',
  linkedDhfId: '', linkedRiskId: '', linkedValId: '', linkedChangeId= '',
  regulatorySubmission: '', customerRequirements: '',
  notes: '',
  activities: ALL_DEFAULT_ITEMS.map(a => ({ ...a })),
}

// ââ ë©ì¸ âââââââââââââââââââââââââââââââââââââââââââââââââââââ
export default function QualityPlanHub() {
  const user = auth.current()
  const canEdit = user?.level >= 2

  const [plans, setPlans] = useState(() => {
    try {
      /* #365: activities ìë êµ¬í íëë ìì¸ë³´ê¸° ê°ë¥íëë¡ ë§ì´ê·¸ë ì´ì */
      const stored = JSON.parse(localStorage.getItem(LS_KEY) || '[]')
      return stored.map(p => ({
        ...p,
        activities: (p.activities && p.activities.length > 0)
          ? p.activities
          : ALL_DEFAULT_ITEMS.map(a => ({ ...a })),
      }))
    } catch { return [] }
  })

  const [tab, setTab] = useState('list')          // list | detail | analysis
  const [selectedId, setSelectedId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_PLAN)
  const [editId, setEditId] = useState(null)
  const [actFilter, setActFilter] = useState('all')  // all | group name
  const [filterStatus, setFilterStatus] = useState('all')

  function save(list) { setPlans(list); localStorage.setItem(LS_KEY, JSON.stringify(list)) }

  function submitPlan() {
    if (!form.productName.trim()) return alert('ì íëªì ìë ¥íì¸ì.')
    const next = editId
      ? plans.map(p => p.id === editId ? { ...p, ...form } : p)
      : [{ id: planId(), createdAt: todayStr(), ...form }, ...plans]
    save(next)
    setShowForm(false); setForm(EMPTY_PLAN); setEditId(null)
  }

  function deletePlan(id) {
    if (!confirm('íì§ ê³íìë¥¼ ì­ì íìê² ìµëê¹?')) return
    save(plans.filter(p => p.id !== id))
    if (selectedId === id) { setSelectedId(null); setTab('list') }
  }

  function updateActivity(planId, actIdx, field, value) {
    const next = plans.map(p => {
      if (p.id !== planId) return p
      const acts = [...(p.activities || [])]
      acts[actIdx] = { ...acts[actIdx], [field]: value }
      return { ...p, activities: acts }
    })
    save(next)
  }

  function quickPlanStatus(id, status) {
    const update = { status }
    if (status === 'approved') update.approvedDate = todayStr()
    save(plans.map(p => p.id === id ? { ...p, ...update } : p))
  }

  const selected = plans.find(p => p.id === selectedId)

  // ì íë ê³í ìë£ì¨
  function calcProgress(plan) {
    const acts = (plan.activities || []).filter(a => a.required && a.status !== 'na')
    if (!acts.length) return null
    const done = acts.filter(a => a.status === 'completed').length
    return Math.round((done / acts.length) * 100)
  }

  // íí°ë ê³í ëª©ë¡
  const filteredPlans = useMemo(() => plans.filter(p => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false
    return true
  }), [plans, filterStatus])

  // ì íë ê³íì íí°ë íë
  const filteredActs = useMemo(() => {
    if (!selected) return []
    const acts = (selected.activities || [])
    if (actFilter === 'all') return acts
    return acts.filter(a => a.group === actFilter)
  }, [selected, actFilter])

  // ê·¸ë£¹ë³ ìë£ì¨
  const groupProgress = useMemo(() => {
    if (!selected) return {}
    const result = {}
    ACTIVITY_GROUPS.forEach(g => {
      const acts = (selected.activities || []).filter(a => a.group === g.group && a.required && a.status !== 'na')
      const done = acts.filter(a => a.status === 'completed').length
      result[g.group] = acts.length ? Math.round((done / acts.length) * 100) : null
    })
    return result
  }, [selected])

  // ë¶ì
  const analysis = useMemo(() => {
    const byStatus = {}
    Object.keys(PLAN_STATUSES).forEach(k => { byStatus[k] = plans.filter(p => p.status === k).length })
    const lowProgress = plans.filter(p => {
      const prog = calcProgress(p)
      return prog !== null && prog < 50 && p.status !== 'obsolete'
    })
    const overdueItems = plans.flatMap(p =>
      (p.activities || []).filter(a => a.dueDate && new Date(a.dueDate) < new Date() && a.status !== 'completed' && a.status !== 'na')
        .map(a => ({ plan: p, act: a }))
    )
    return { byStatus, lowProgress, overdueItems }
  }, [plans])

  const groups = ACTIVITY_GROUPS.map(g => g.group)

  return (
    <AppLayout user={user} title="íì§ ê³í (QP)" subtitle="ISO 13485 Â§7.1 ì í ì¤íì ê³í â ì íë³ íì§ ê³íì">
      <div className="px-6 lg:px-8 py-6 max-w-[1400px] mx-auto">

        {/* í­ */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-soft)' }}>
          {[
            { key: 'list',     label: `QP ëª©ë¡ (${plans.length})` },
            { key: 'detail',   label: 'ê³íì ìì¸', disabled: !selectedId },
            { key: 'analysis', label: 'íí© ë¶ì' },
          ].map(t => (
            <button key={t.key} onClick={() => !t.disabled && setTab(t.key)} disabled={t.disabled}
              className="px-4 py-1.5 rounded-lg text-[13px] font-semibold transition"
              style={{
                background: tab === t.key ? 'var(--bg-card)' : 'transparent',
                color: t.disabled ? 'var(--ink-faint)' : tab === t.key ? 'var(--moss)' : 'var(--ink-soft)',
                boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                border: 'none', cursor: t.disabled ? 'not-allowed' : 'pointer',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ââ ëª©ë¡ í­ ââ */}
        {tab === 'list' && (
          <div>
            <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-[13px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                <option value="all">ì ì²´ ìí</option>
                {Object.entries(PLAN_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              {canEdit && (
                <button onClick={() => { setForm(EMPTY_PLAN); setEditId(null); setShowForm(true) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} /> QP ì ê· ìì±
                </button>
              )}
            </div>

            {showForm && (
              <PlanForm form={form} setForm={setForm} onSave={submitPlan}
                onCancel={() => { setShowForm(false); setForm(EMPTY_PLAN); setEditId(null) }}
                isEdit={!!editId} />
            )}

            {filteredPlans.length === 0 ? (
              <div className="text-center py-20" style={{ color: 'var(--ink-faint)' }}>
                <ClipboardList size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <div className="text-[14px]">ë±ë¡ë íì§ ê³íìê° ììµëë¤.</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPlans.map(plan => {
                  const sm = PLAN_STATUSES[plan.status] || PLAN_STATUSES.draft
                  const prog = calcProgress(plan)
                  const actTotal = (plan.activities || []).filter(a => a.required && a.status !== 'na').length
                  const actDone  = (plan.activities || []).filter(a => a.status === 'completed').length

                  return (
                    <div key={plan.id} className="p-4 rounded-2xl cursor-pointer transition"
                      style={{ background: 'var(--bg-card)', border: '1.5px solid var(--line)' }}
                      onClick={() => { setSelectedId(plan.id); setTab('detail') }}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] font-mono" style={{ color: 'var(--ink-faint)' }}>{plan.id}</span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
                          </div>
                          <div className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>{plan.productName}</div>
                          <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{plan.productCode} Â· Rev.{plan.revision} Â· {plan.deviceClass}</div>
                        </div>
                      </div>

                      {/* ì§íë¥  */}
                      {prog !== null && (
                        <div className="mb-2">
                          <div className="flex justify-between text-[11px] mb-1" style={{ color: 'var(--ink-faint)' }}>
                            <span>íë ì§íë¥ </span>
                            <span style={{ fontWeight: 700, color: prog === 100 ? '#059669' : prog >= 50 ? '#D97706' : '#DC2626' }}>{prog}%</span>
                          </div>
                          <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-soft)' }}>
                            <div className="h-1.5 rounded-full" style={{ width: `${prog}%`, background: prog === 100 ? '#059669' : prog >= 50 ? '#D97706' : '#DC2626' }} />
                          </div>
                        </div>
                      )}

                      <div className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>
                        íë {actDone}/{actTotal} ìë£ Â· PM: {plan.projectManager || '-'}
                      </div>
                      {(plan.linkedDhfId || plan.linkedRiskId || plan.linkedValId) && (
                        <div className="flex gap-2 mt-1.5 flex-wrap">
                          {plan.linkedDhfId && <span className="text-[10px] flex items-center gap-0.5" style={{ color: '#2563EB' }}><Link2 size={9} /> DHF</span>}
                          {plan.linkedRiskId && <span className="text-[10px] flex items-center gap-0.5" style={{ color: '#DC2626' }}><Link2 size={9} /> FMEA</span>}
                          {plan.linkedValId && <span className="text-[10px] flex items-center gap-0.5" style={{ color: '#059669' }}><Link2 size={9} /> ë°¸ë¦¬</span>}
                        </div>
                      )}

                      {canEdit && (
                        <div className="flex gap-1 mt-3" onClick={e => e.stopPropagation()}>
                          {plan.status === 'draft' && <QuickBtn label="ê²í " color="#D97706" onClick={() => quickPlanStatus(plan.id, 'review')} />}
                          {plan.status === 'review' && <QuickBtn label="ì¹ì¸" color="#059669" onClick={() => quickPlanStatus(plan.id, 'approved')} />}
                          <button onClick={() => { setForm({ ...EMPTY_PLAN, ...plan }); setEditId(plan.id); setShowForm(true); setTab('list') }}
                            className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                            <Edit2 size={12} style={{ color: 'var(--ink-soft)' }} />
                          </button>
                          <button onClick={() => deletePlan(plan.id)}
                            className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', border: '1px solid #FECACA', cursor: 'pointer' }}>
                            <Trash2 size={12} style={{ color: '#DC2626' }} />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ââ ìì¸ í­ ââ */}
        {tab === 'detail' && selected && (
          <DetailView
            plan={selected} canEdit={canEdit}
            actFilter={actFilter} setActFilter={setActFilter}
            filteredActs={filteredActs} groupProgress={groupProgress}
            groups={groups} updateActivity={updateActivity} calcProgress={calcProgress}
          />
        )}

        {/* ââ ë¶ì í­ ââ */}
        {tab === 'analysis' && (
          <AnalysisView analysis={analysis} plans={plans} setSelectedId={setSelectedId} setTab={setTab} />
        )}
      </div>
    </AppLayout>
  )
}

// ââ ê³íì ìì¸ ë·° ââââââââââââââââââââââââââââââââââââââââââââ
function DetailView({ plan, canEdit, actFilter, setActFilter, filteredActs, groupProgress, groups, updateActivity, calcProgress }) {
  const sm = PLAN_STATUSES[plan.status] || PLAN_STATUSES.draft
  const prog = calcProgress(plan)

  return (
    <div>
      {/* í¤ë */}
      <div className="p-5 rounded-2xl mb-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[12px] font-mono" style={{ color: 'var(--ink-faint)' }}>{plan.id}</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
            </div>
            <div className="text-[20px] font-bold" style={{ color: 'var(--ink)' }}>{plan.productName}</div>
            <div className="text-[13px]" style={{ color: 'var(--ink-faint)' }}>{plan.productCode} Â· Rev.{plan.revision} Â· {plan.deviceClass}</div>
          </div>
          <div className="text-right text-[12px]" style={{ color: 'var(--ink-faint)' }}>
            <div>PM: {plan.projectManager || '-'}</div>
            <div>ì¹ì¸ì: {plan.approver || '-'}</div>
            {plan.approvedDate && <div>ì¹ì¸ì¼: {plan.approvedDate}</div>}
            {plan.targetDate && <div>ëª©í ìë£: {plan.targetDate}</div>}
          </div>
        </div>

        {/* ì ì²´ ì§íë¥  */}
        {prog !== null && (
          <div className="mb-3">
            <div className="flex justify-between text-[12px] mb-1" style={{ color: 'var(--ink-soft)' }}>
              <span className="font-semibold">ì ì²´ íë ì§íë¥ </span>
              <span className="font-bold" style={{ color: prog === 100 ? '#059669' : prog >= 50 ? '#D97706' : '#DC2626' }}>{prog}%</span>
            </div>
            <div className="h-2 rounded-full" style={{ background: 'var(--bg-soft)' }}>
              <div className="h-2 rounded-full transition-all" style={{ width: `${prog}%`, background: prog === 100 ? '#059669' : prog >= 50 ? '#D97706' : '#DC2626' }} />
            </div>
          </div>
        )}

        {/* ê·¸ë£¹ë³ ë¯¸ë ì§íë° */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          {ACTIVITY_GROUPS.map(g => {
            const p = groupProgress[g.group]
            return (
              <div key={g.group} className="p-2 rounded-xl cursor-pointer" onClick={() => setActFilter(actFilter === g.group ? 'all' : g.group)}
                style={{ background: actFilter === g.group ? 'var(--bg-soft)' : 'transparent', border: `1px solid ${actFilter === g.group ? 'var(--moss)' : 'var(--line)'}` }}>
                <div className="text-[10.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{g.group.replace(' (Â§7.3)', '').replace(' (ISO 14971)', '').replace(' (Â§7.4)', '').replace(' (Â§7.5)', '').replace(' (Â§7.6 / Â§8.2)', '')}</div>
                <div className="h-1.5 rounded-full" style={{ background: 'var(--line)' }}>
                  <div className="h-1.5 rounded-full" style={{ width: `${p ?? 0}%`, background: p === 100 ? '#059669' : p !== null && p > 0 ? '#D97706' : '#E5E7EB' }} />
                </div>
                <div className="text-[10px] mt-0.5 text-right" style={{ color: 'var(--ink-faint)' }}>{p !== null ? `${p}%` : '-'}</div>
              </div>
            )
          })}
        </div>

        {/* ì°ê²° ë§í¬ */}
        {(plan.linkedDhfId || plan.linkedRiskId || plan.linkedValId || plan.linkedChangeId) && (
          <div className="flex gap-2 flex-wrap">
            {plan.linkedDhfId && <LinkChip label={`DHF: ${plan.linkedDhfId}`} color="#2563EB" />}
            {plan.linkedRiskId && <LinkChip label={`FMEA: ${plan.linkedRiskId}`} color="#DC2626" />}
            {plan.linkedValId && <LinkChip label={`ë°¸ë¦¬: ${plan.linkedValId}`} color="#059669" />}
            {plan.linkedChangeId && <LinkChip label={`ë³ê²½: ${plan.linkedChangeId}`} color="#7C3AED" />}
          </div>
        )}

        {plan.intendedUse && (
          <div className="mt-3 p-3 rounded-xl text-[12.5px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
            <span className="font-bold" style={{ color: 'var(--ink)' }}>ì¬ì© ëª©ì : </span>{plan.intendedUse}
          </div>
        )}
        {plan.customerRequirements && (
          <div className="mt-2 p-3 rounded-xl text-[12.5px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
            <span className="font-bold" style={{ color: 'var(--ink)' }}>ê³ ê° ìêµ¬ì¬í­: </span>{plan.customerRequirements}
          </div>
        )}
        {plan.regulatorySubmission && (
          <div className="mt-2 p-3 rounded-xl text-[12.5px]" style={{ background: '#EFF6FF', color: '#1E40AF' }}>
            <span className="font-bold">ê·ì  ì ì¶ ê³í: </span>{plan.regulatorySubmission}
          </div>
        )}
      </div>

      {/* íë íí° í­ */}
      <div className="flex gap-1 flex-wrap mb-4">
        <ActTabBtn active={actFilter === 'all'} onClick={() => setActFilter('all')} label="ì ì²´" />
        {groups.map(g => (
          <ActTabBtn key={g} active={actFilter === g} onClick={() => setActFilter(actFilter === g ? 'all' : g)}
            label={g.replace(/\s*\(.*\)/, '')} />
        ))}
      </div>

      {/* íë ëª©ë¡ */}
      <div className="space-y-2">
        {filteredActs.map((act, rawIdx) => {
          // ì ì²´ activitiesììì ì¤ì  ì¸ë±ì¤
          const realIdx = (selected?.activities || []).findIndex((a, i) =>
            a.group === act.group && a.name === act.name &&
            (selected.activities || []).indexOf(a) === (selected.activities || []).findIndex((b, j) => b.group === act.group && b.name === act.name && j >= i)
          )
          const sm2 = ITEM_STATUSES[act.status] || ITEM_STATUSES.not_started
          const isOverdue = act.dueDate && new Date(act.dueDate) < new Date() && act.status !== 'completed' && act.status !== 'na'

          return (
            <div key={`${act.group}-${act.name}`} className="p-3 rounded-xl"
              style={{ background: isOverdue ? '#FFF5F5' : 'var(--bg-card)', border: `1px solid ${isOverdue ? '#FECACA' : 'var(--line)'}` }}>
              <div className="flex items-center gap-3 flex-wrap">
                {/* ìí ë±ì§ */}
                {canEdit ? (
                  <select value={act.status}
                    onChange={e => updateActivity(selected.id, realIdx === -1 ? (selected.activities || []).findIndex(a => a.name === act.name && a.group === act.group) : realIdx, 'status', e.target.value)}
                    className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: sm2.color + '20', color: sm2.color, border: `1px solid ${sm2.color}60`, cursor: 'pointer' }}>
                    {Object.entries(ITEM_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                ) : (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: sm2.color + '20', color: sm2.color }}>{sm2.label}</span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-semibold" style={{ color: 'var(--ink)', opacity: act.status === 'na' ? 0.4 : 1 }}>{act.name}</div>
                  <div className="text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>{act.group}</div>
                </div>
                {canEdit && (
                  <div className="flex gap-2 items-center flex-wrap">
                    <input type="text" value={act.owner || ''} placeholder="ë´ë¹ì"
                      onChange={e => updateActivity(selected.id, (selected.activities || []).findIndex(a => a.name === act.name && a.group === act.group), 'owner', e.target.value)}
                      className="px-2 py-0.5 rounded-lg text-[11px]"
                      style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', width: 80 }} />
                    <input type="date" value={act.dueDate || ''}
                      onChange={e => updateActivity(selected.id, (selected.activities || []).findIndex(a => a.name === act.name && a.group === act.group), 'dueDate', e.target.value)}
                      className="px-2 py-0.5 rounded-lg text-[11px]"
                      style={{ background: 'var(--bg-soft)', border: `1px solid ${isOverdue ? '#DC2626' : 'var(--line)'}`, color: isOverdue ? '#DC2626' : 'var(--ink) }} />
                  </div>
                )}
                {!canEdit && act.owner && <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{act.owner}</span>}
                {!canEdit && act.dueDate && <span className="text-[11px]" style={{ color: isOverdue ? '#DC2626' : 'var(--ink-faint)' }}>{act.dueDate}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ActTabBtn({ active, onClick, label }) {
  return (
    <button onClick={onClick} className="px-3 py-1.5 rounded-lg text-[11.5px] font-semibold"
      style={{
        background: active ? 'var(--moss)' : 'var(--bg-card)',
        color: active ? '#fff' : 'var(--ink-soft)',
        border: `1px solid ${active ? 'var(--moss)' : 'var(--line)'}`,
        cursor: 'pointer',
      }}>
      {label}
    </button>
  )
}

function LinkChip({ label, color }) {
  return (
    <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: color + '15', color, border: `1px solid ${color}40` }}>
      <Link2 size={9} /> {label}
    </span>
  )
}

// ââ ë¶ì í­ ââââââââââââââââââââââââââââââââââââââââââââââââââ
function AnalysisView({ analysis, plans, setSelectedId, setTab }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(PLAN_STATUSES).map(([k, v]) => (
          <div key={k} className="p-4 rounded-2xl text-center" style={{ background: v.bg, border: `1px solid ${v.color}40` }}>
            <div className="text-[26px] font-bold" style={{ color: v.color }}>{analysis.byStatus[k] || 0}</div>
            <div className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>{v.label}</div>
          </div>
        ))}
      </div>

      {analysis.overdueItems.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
          <div className="text-[13px] font-bold mb-3" style={{ color: '#DC2626' }}>â  ê¸°í ì´ê³¼ íë ({analysis.overdueItems.length}ê±´)</div>
          <div className="space-y-1.5">
            {analysis.overdueItems.slice(0, 8).map(({ plan, act }, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg cursor-pointer"
                style={{ background: '#FFF5F5', border: '1px solid #FECACA' }}
                onClick={() => { setSelectedId(plan.id); setTab('detail') }}>
                <div className="text-[12px]">
                  <span className="font-bold" style={{ color: '#991B1B' }}>{act.name}</span>
                  <span className="ml-2" style={{ color: '#DC2626' }}>{plan.productName}</span>
                </div>
                <div className="text-[11px]" style={{ color: '#DC2626' }}>ê¸°í: {act.dueDate}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {analysis.lowProgress.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <div className="text-[13px] font-bold mb-3" style={{ color: '#92400E' }}>ì§íë¥  50% ë¯´ë íì§ êóí</div>
          <div className="space-y-2">
            {analysis.lowProgress.map(plan => {
              const prog = (() => {
                const acts = (plan.activities || []).filter(a => a.required && a.status !== 'na')
                const done = acts.filter(a => a.status === 'completed').length
                return acts.length ? Math.round((done / acts.length) * 100) : null
              })()
              return (
                <div key={plan.id} className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer"
                  style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}
                  onClick={() => { setSelectedId(plan.id); setTab('detail') }}>
                  <div className="flex-1">
                    <div className="text-[12px] font-bold" style={{ color: '#78350F' }}>{plan.productName}</div>
                    <div className="h-1.5 rounded-full mt-1" style={{ background: '#FDE68A' }}>
                      <div className="h-1.5 rounded-full" style={{ width: `${prog ?? 0}%`, background: '#D97706' }} />
                    </div>
                  </div>
                  <div className="text-[13px] font-bold" style={{ color: '#D97706' }}>{prog ?? 0}%</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  }
  )
}

// ââ íì§ ê³í í¼ âââââââââââââââââââââââââââââââââââââââââââââ
function PlanForm({ form, setForm, onSave, onCancel, isEdit }) {
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="mb-6 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>{isEdit ? 'íì§ ê³íì ìì ' : 'íì§ ê³íì ì ê· ìì±'}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <Field label="ì íëª *" value={form.productName} onChange={v => F('productName', v)} />
        <Field label="ì í ì½ë" value={form.productCode} onChange={v => F('productCode', v)} />
        <Field label="ê°ì  ë²í¸" value={form.revision} onChange={v => F('revision', v)} />
        <FieldSelect label="ê¸°ê¸° ë±ê¸" value={form.deviceClass} onChange={v => F('deviceClass', v)}
          options={DEVICE_CLASSES.map(c => ({ value: c, label: c }))} />
        <Field label="ììì¼" type="date" value={form.startDate} onChange={v => F('startDate', v)} />
        <Field label="ëª©í ìë£ì¼" type="date" value={form.targetDate} onChange={v => F('targetDate', v)} />
        <Field label="íë¡ì í¸ ì±ìì (PM)" value={form.projectManager} onChange={v => F('projectManager', v)} />
        {/* #369: ì¹ì¸ì ì­ì  â ê¶íê°ì§ ì¬ëì´ ëª©ë¡ìì ì¹ì¸ë²í¼ í´ë¦­ ì ìëê¸°ë¡ */}
        {/* #368: ìí ì­ì  â ì ê·ìì±ì í­ì ì´ì(draft)ì¼ë¡ ìì */}
        <Field label="ì°ê²° DHF ID" value={form.linkedDhfId} onChange={v => F('linkedDhfId', v)} placeholder="DHF-xxxx" />
        <Field label="ì°ê²° FMEA ID" value={form.linkedRiskId} onChange={v => F('linkedRiskId', v)} placeholder="RISK-xxxx" />
        <Field label="ì°ê²° ë°¸ë¦¬ë°ì´ì ID" value={form.linkedValId} onChange={v => F('linkedValId', v)} placeholder="VAL-xxxx" />
        <Field label="ì°ê²° ë³ê²½ê´ë¦¬ ID" value={form.linkedChangeId} onChange={v => F('linkedChangeId', v)} placeholder="CHG-xxxx" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <FieldArea label="ì¬ì© ëª©ì  (Intended Use)" value={form.intendedUse} onChange={v => F('intendedUse', v)} rows={2} />
        <FieldArea label="ê³ ê° ìêµ¬ì¬í­ (Â§7.2)" value={form.customerRequirements} onChange={v => F('customerRequirements', v)} rows={2} />
        <FieldArea label="ê·ì  ì ì¶ ê³í" value={form.regulatorySubmission} onChange={v => F('regulatorySubmission', v)} rows={2} />
        <FieldArea label="ë¹ê³ " value={form.notes} onChange={v => F('notes', v)} rows={2} />
      </div>
      <div className="p-3 rounded-xl mb-4 text-[12px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
        ð¡ ì ì¥ í <strong>ê³íì ìì¸</strong> í­ìì ê° íëì ë´ë¹ìÂ·ê¸°íÂ·ìë£ ìíë¥¼ ìë°ì´í¸íì¸ì. ({ALL_DEFAULT_ITEMS.length}ê° íì¤ íëì´ ìë í¬í¨ë©ëë¤.)
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

function QuickBtn({ label, color, onClick }) {
  return (
    <button onClick={onClick} className="px-2 py-1 rounded-lg text-[11px] font-bold"
      style={{ background: `${color}15`, border: `1px solid ${color}40`, color, cursor: 'pointer' }}>
      {label}
    </button>
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
