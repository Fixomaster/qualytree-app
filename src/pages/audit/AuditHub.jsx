// src/pages/audit/AuditHub.jsx
// ISO 13485:2016 Â§8.2.2 ë´ë¶ê°ì¬ íë¸
import React, { useState, useMemo } from 'react'
import {
  Search, Plus, ChevronRight, CheckCircle2,
  Clock, AlertTriangle, Calendar, Users,
  FileText, BarChart2, ClipboardList, XCircle,
  ChevronDown, Download, Filter,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'

const STORAGE_KEY = 'qualytree.audits'
const CAR_KEY = 'qualytree.audit_cars'  // Corrective Action Requests from audit

// ê°ì¬ ìí
const AUDIT_STATUS = {
  PLANNED:     'planned',
  IN_PROGRESS: 'in_progress',
  COMPLETED:   'completed',
  CLOSED:      'closed',
}

const AUDIT_STATUS_LABEL = {
  planned:     'ê³í',
  in_progress: 'ì§í ì¤',
  completed:   'ìë£ (ìì ì¡°ì¹ ëê¸°)',
  closed:      'ì¢ê²°',
}

const AUDIT_STATUS_COLOR = {
  planned:     '#6B7280',
  in_progress: '#F59E0B',
  completed:   '#3B82F6',
  closed:      '#10B981',
}

// CAR ìí
const CAR_STATUS = {
  OPEN:     'open',
  PROGRESS: 'in_progress',
  VERIFIED: 'verified',
  CLOSED:   'closed',
}
const CAR_STATUS_LABEL = { open: 'ë¯¸ì²ë¦¬', in_progress: 'ì¡°ì¹ ì¤', verified: 'ê²ì¦ ìë£', closed: 'ì¢ê²°' }
const CAR_STATUS_COLOR = { open: '#EF4444', in_progress: '#F59E0B', verified: '#3B82F6', closed: '#10B981' }

// ISO 13485 ê°ì¬ ê¸°ì¤ ì²´í¬ë¦¬ì¤í¸ (ì£¼ì í­ëª©)
const AUDIT_CHECKLIST = [
  { iso: '4.1', item: 'íì§ê²½ììì¤í ì¼ë° ìê±´' },
  { iso: '4.2', item: 'ë¬¸ìí ìê±´ (ë§¤ë´ì¼Â·ì ì°¨Â·ê¸°ë¡)' },
  { iso: '5.1', item: 'ê²½ìì§ ì±ì ë° ìì§' },
  { iso: '5.4', item: 'íì§ëª©í ë° ê³í' },
  { iso: '6.2', item: 'ì¸ì  ìì (êµì¡Â·ì­ë)' },
  { iso: '6.3', item: 'ê¸°ë°êµ¬ì¡° (ì¤ë¹Â·íê²½)' },
  { iso: '7.2', item: 'ê³ ê° ê´ë ¨ íë¡ì¸ì¤ (ìêµ¬ì¬í­)' },
  { iso: '7.3', item: 'ì¤ê³ ë° ê°ë°' },
  { iso: '7.4', item: 'êµ¬ë§¤ (ê³µê¸ìì²´ ê´ë¦¬)' },
  { iso: '7.5', item: 'ìì° ë° ìë¹ì¤ ì ê³µ' },
  { iso: '7.6', item: 'ëª¨ëí°ë§ ë° ì¸¡ì ì¥ì¹ ê´ë¦¬' },
  { iso: '8.2.1', item: 'ê³ ê°ë§ì¡± ëª¨ëí°ë§' },
  { iso: '8.2.4', item: 'ì í ëª¨ëí°ë§ ë° ì¸¡ì ' },
  { iso: '8.3', item: 'ë¶ì í© ì í ê´ë¦¬' },
  { iso: '8.4', item: 'ë°ì´í° ë¶ì' },
  { iso: '8.5', item: 'ê°ì  (CAPA)' },
]

function loadAudits() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function saveAudits(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}
function loadCARs() {
  try { return JSON.parse(localStorage.getItem(CAR_KEY) || '[]') } catch { return [] }
}
function saveCARs(data) {
  localStorage.setItem(CAR_KEY, JSON.stringify(data))
}
function genId(prefix) {
  return `${prefix}-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`
}

export default function AuditHub() {
  const user = auth.current()
  const [tab, setTab] = useState('audits') // audits | cars | checklist
  const [audits, setAudits] = useState(() => loadAudits())
  const [cars, setCARs] = useState(() => loadCARs())
  const [showForm, setShowForm] = useState(false)
  const [showCARForm, setShowCARForm] = useState(false)
  const [selectedAudit, setSelectedAudit] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [, forceRefresh] = useState(0)
  const refresh = () => forceRefresh(t => t + 1)

  const reload = () => {
    setAudits(loadAudits())
    setCARs(loadCARs())
  }

  // íµê³
  const stats = useMemo(() => ({
    total: audits.length,
    planned: audits.filter(a => a.status === AUDIT_STATUS.PLANNED).length,
    inProgress: audits.filter(a => a.status === AUDIT_STATUS.IN_PROGRESS).length,
    completed: audits.filter(a => a.status === AUDIT_STATUS.COMPLETED).length,
    carOpen: cars.filter(c => c.status === CAR_STATUS.OPEN).length,
    carTotal: cars.length,
  }), [audits, cars])

  const filteredAudits = useMemo(() => {
    let arr = [...audits].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    if (filterStatus !== 'all') arr = arr.filter(a => a.status === filterStatus)
    return arr
  }, [audits, filterStatus])

  return (
    <AppLayout user={user} title="ë´ë¶ê°ì¬" subtitle="ISO 13485 Â§8.2.2 Â· ë´ë¶ê°ì¬ ê³íÂ·ì¤ìÂ·ìì ì¡°ì¹">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto">

        {/* KPI ì¹´ë */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'ê³íë ê°ì¬', value: stats.planned, icon: Calendar, color: '#6B7280' },
            { label: 'ì§í ì¤', value: stats.inProgress, icon: Clock, color: '#F59E0B' },
            { label: 'ìë£', value: stats.completed, icon: CheckCircle2, color: '#3B82F6' },
            { label: 'ë¯¸ê²° CAR', value: stats.carOpen, icon: AlertTriangle, color: '#EF4444', urgent: stats.carOpen > 0 },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="p-4 rounded-2xl"
              style={{
                background: 'var(--bg-card)',
                border: `1px solid ${kpi.urgent ? '#EF444440' : 'var(--line)'}`,
                boxShadow: kpi.urgent ? '0 0 0 2px #EF444420' : 'none',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>{kpi.label}</span>
                <kpi.icon size={15} style={{ color: kpi.color }} />
              </div>
              <div className="text-[26px] font-bold" style={{ color: kpi.urgent ? '#EF4444' : 'var(--ink)' }}>
                {kpi.value}
              </div>
            </div>
          ))}
        </div>

        {/* í­ â ê°ì¬ ê³íÂ·ì¤ìë§ íì (#264 ì²´í¬ë¦¬ì¤í¸ í­ ì­ì , #262 ìì ì¡°ì¹ìì²­ í­ ì­ì ) */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: 'var(--bg-soft)', width: 'fit-content' }}>
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium"
            style={{
              background: 'var(--bg-card)',
              color: 'var(--ink)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            }}
          >
            <Search size={14} />
            ê°ì¬ ê³íÂ·ì¤ì
          </div>
        </div>

        {/* í­ ì½íì¸  */}
        {tab === 'audits' && (
          <AuditsTab
            audits={filteredAudits}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            showForm={showForm}
            setShowForm={setShowForm}
            selectedAudit={selectedAudit}
            setSelectedAudit={setSelectedAudit}
            onSave={(form) => {
              const updated = selectedAudit
                ? audits.map(a => a.id === selectedAudit.id ? { ...a, ...form, updatedAt: new Date().toISOString() } : a)
                : [...audits, {
                    ...form,
                    id: genId('AUD'),
                    status: AUDIT_STATUS.PLANNED,
                    createdAt: new Date().toISOString(),
                    createdBy: user?.name || 'Unknown',
                    findings: [],
                  }]
              saveAudits(updated)
              setAudits(updated)
              setShowForm(false)
              setSelectedAudit(null)
            }}
            onStatusChange={(id, status) => {
              const updated = audits.map(a => a.id === id ? { ...a, status, updatedAt: new Date().toISOString() } : a)
              saveAudits(updated)
              setAudits(updated)
            }}
          />
        )}

        {/* #262 CAR í­ ì­ì , #264 ì²´í¬ë¦¬ì¤í¸ í­ ì­ì  */}
      </div>
    </AppLayout>
  )
}

/* ââ ê°ì¬ ëª©ë¡ í­ ââ */
function AuditsTab({ audits, filterStatus, setFilterStatus, showForm, setShowForm, selectedAudit, setSelectedAudit, onSave, onStatusChange }) {
  const [form, setForm] = useState({
    auditType: 'ì ê¸°', year: new Date().getFullYear(), scope: '', auditDate: '', auditor: '', auditee: '',
    type: 'internal', standard: 'ISO 13485',
  })

  const startEdit = (audit) => {
    setSelectedAudit(audit)
    setForm({ auditType: audit.auditType || 'ì ê¸°', year: audit.year || new Date().getFullYear(), scope: audit.scope || '', auditDate: audit.auditDate || '', auditor: audit.auditor || '', auditee: audit.auditee || '', type: audit.type || 'internal', standard: audit.standard || 'ISO 13485' })
    setShowForm(true)
  }

  const resetForm = () => {
    setSelectedAudit(null)
    setForm({ auditType: 'ì ê¸°', year: new Date().getFullYear(), scope: '', auditDate: '', auditor: '', auditee: '', type: 'internal', standard: 'ISO 13485' })
  }

  return (
    <>
      {/* ì¡ìë° */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {['all', ...Object.values(AUDIT_STATUS)].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition"
              style={{
                background: filterStatus === s ? '#6366F1' : 'var(--bg-soft)',
                color: filterStatus === s ? '#fff' : 'var(--ink-soft)',
                border: 'none', cursor: 'pointer',
              }}
            >
              {s === 'all' ? 'ì ì²´' : AUDIT_STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold"
          style={{ background: '#6366F1', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          <Plus size={15} />
          ê°ì¬ ë±ë¡
        </button>
      </div>

      {/* í¼ */}
      {showForm && (
        <AuditForm
          form={form}
          setForm={setForm}
          isEdit={!!selectedAudit}
          onSubmit={() => onSave(form)}
          onCancel={() => { setShowForm(false); resetForm() }}
        />
      )}

      {/* ëª©ë¡ */}
      {audits.length === 0 ? (
        <EmptyState
          icon={Search}
          title="ë±ë¡ë ê°ì¬ê° ììµëë¤"
          desc="ë´ë¶ê°ì¬ ê³íì ë±ë¡íê³  ISO 13485 ì¤ì íí©ì ê´ë¦¬íì¸ì."
        />
      ) : (
        <div className="space-y-3">
          {audits.map((audit) => (
            <AuditCard
              key={audit.id}
              audit={audit}
              onEdit={() => startEdit(audit)}
              onStatusChange={(status) => onStatusChange(audit.id, status)}
            />
          ))}
        </div>
      )}
    </>
  )
}

function AuditCard({ audit, onEdit, onStatusChange }) {
  const [open, setOpen] = useState(false)
  const statusColor = AUDIT_STATUS_COLOR[audit.status] || '#6B7280'

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}
    >
      <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusColor }} />
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold truncate" style={{ color: 'var(--ink)' }}>
              {audit.id} Â· {audit.title}
            </div>
            <div className="flex items-center gap-3 mt-1 text-[12px]" style={{ color: 'var(--ink-faint)' }}>
              {audit.auditDate && <span>ð {audit.auditDate}</span>}
              {audit.auditor && <span>ð¤ {audit.auditor}</span>}
              {audit.scope && <span className="truncate max-w-[200px]">ð {audit.scope}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className="text-[11px] font-medium px-2.5 py-1 rounded-full"
            style={{ background: `${statusColor}20`, color: statusColor }}
          >
            {AUDIT_STATUS_LABEL[audit.status]}
          </span>
          <ChevronDown size={15} style={{ color: 'var(--ink-faint)', transform: open ? 'rotate(180deg)' : 'none', transition: '0.15s' }} />
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: 'var(--line)' }}>
          <div className="pt-4 flex flex-wrap gap-2">
            {/* ìí ì í ë²í¼ */}
            {audit.status === AUDIT_STATUS.PLANNED && (
              <ActionBtn color="#F59E0B" onClick={() => onStatusChange(AUDIT_STATUS.IN_PROGRESS)}>
                ê°ì¬ ìì
              </ActionBtn>
            )}
            {audit.status === AUDIT_STATUS.IN_PROGRESS && (
              <ActionBtn color="#3B82F6" onClick={() => onStatusChange(AUDIT_STATUS.COMPLETED)}>
                ê°ì¬ ìë£
              </ActionBtn>
            )}
            {audit.status === AUDIT_STATUS.COMPLETED && (
              <ActionBtn color="#10B981" onClick={() => onStatusChange(AUDIT_STATUS.CLOSED)}>
                ê°ì¬ ì¢ê²°
              </ActionBtn>
            )}
            <ActionBtn color="#6B7280" onClick={onEdit}>ìì </ActionBtn>
          </div>
          {audit.findings && audit.findings.length > 0 && (
            <div className="mt-3">
              <div className="text-[12px] font-semibold mb-2" style={{ color: 'var(--ink-soft)' }}>ë¶ì í© ì¬í­</div>
              {audit.findings.map((f, i) => (
                <div key={i} className="text-[12px] p-2 rounded-lg mb-1" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
                  {f}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AuditForm({ form, setForm, isEdit, onSubmit, onCancel }) {
  const f = (k) => ({ value: form[k], onChange: (e) => setForm(p => ({ ...p, [k]: e.target.value })) })
  return (
    <div className="mb-5 p-5 rounded-2xl" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>
        {isEdit ? 'ê°ì¬ ìì ' : 'ë´ë¶ê°ì¬ ë±ë¡'}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* #254: ê°ì¬ëªâê°ì¬ì¢ë¥(ì ê¸°/ë¶ì), #255: ê°ì¬ì°ë ì¶ê° */}
        <FormField label="ê°ì¬ì¢ë¥ *" required>
          <select {...f('auditType')} className="qt-input">
            <option value="ì ê¸°">ì ê¸°</option>
            <option value="ë¶ì">ë¶ì</option>
          </select>
        </FormField>
        <FormField label="ê°ì¬ì°ë">
          <input type="number" {...f('year')} min="2020" max="2099" className="qt-input" />
        </FormField>
        <FormField label="ê°ì¬ ì í">
          <select {...f('type')} className="qt-input">
            <option value="internal">ë´ë¶ê°ì¬</option>
            <option value="supplier">ê³µê¸ìì²´ ê°ì¬</option>
            <option value="certification">ì¸ì¦ ì¬ì¬</option>
          </select>
        </FormField>
        <FormField label="ê°ì¬ ë²ì">
          <input {...f('scope')} placeholder="ì: ìì°ë¶ ì ì²´, êµ¬ë§¤ íë¡ì¸ì¤" className="qt-input" />
        </FormField>
        <FormField label="ê°ì¬ ê¸°ì¤">
          <input {...f('standard')} placeholder="ì: ISO 13485:2016" className="qt-input" />
        </FormField>
        {/* #257: ê°ì¬ì¼âê°ì¬ìì ì¼(datetime-local) */}
        <FormField label="ê°ì¬ìì ì¼">
          <input type="datetime-local" {...f('auditDate')} className="qt-input" />
        </FormField>
        <FormField label="ê°ì¬ì">
          <input {...f('auditor')} placeholder="ê°ì¬ì ì´ë¦" className="qt-input" />
        </FormField>
        <FormField label="í¼ê°ì¬ ë¶ì">
          <input {...f('auditee')} placeholder="ì: ìì°ë¶" className="qt-input" />
        </FormField>
      </div>
      <div className="flex justify-end gap-3 mt-4">
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-[13px]" style={{ background: 'var(--bg)', color: 'var(--ink-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>ì·¨ì</button>
        <button
          onClick={onSubmit}
          disabled={!form.auditType}
          className="px-5 py-2 rounded-xl text-[13px] font-semibold"
          style={{ background: form.auditType ? '#6366F1' : 'var(--bg-soft)', color: form.auditType ? '#fff' : 'var(--ink-faint)', border: 'none', cursor: form.auditType ? 'pointer' : 'not-allowed' }}
        >
          {isEdit ? 'ì ì¥' : 'ë±ë¡'}
        </button>
      </div>
    </div>
  )
}

/* ââ CAR í­ ââ */
function CARsTab({ cars, showCARForm, setShowCARForm, onSave, onStatusChange }) {
  /* #263: auditId/requirement/assignee/dueDate íë ì­ì  */
  const [form, setForm] = useState({ finding: '', severity: 'major' })
  const f = (k) => ({ value: form[k], onChange: (e) => setForm(p => ({ ...p, [k]: e.target.value })) })

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div className="text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>
          ìì ì¡°ì¹ ìì²­ (CAR) â Corrective Action Request
        </div>
        <button
          onClick={() => setShowCARForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold"
          style={{ background: '#EF4444', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          <Plus size={15} /> CAR ë°í
        </button>
      </div>

      {showCARForm && (
        <div className="mb-5 p-5 rounded-2xl" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
          <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>CAR ë°í</div>
          {/* #263: auditId(ê´ë ¨ê°ì¬ID), requirement(ê´ë ¨ìê±´), assignee(ë´ë¹ì), dueDate(ìë£ëª©íì¼) ì­ì  */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="ë¶ì Ý© ì¬ê°ë">
              <select {...f('severity')} className="qt-input">
                <option value="major">ì¤ì ë¶ì í© (Major)</option>
                <option value="minor">ê²½ë¯¸í ë¶ì í© (Minor)</option>
                <option value="observation">ê´ì°° ì¬í­ (Observation)</option>
              </select>
            </FormField>
            <FormField label="ë¶ì í© ë´ì© *" colSpan>
              <textarea {...f('finding')} rows={3} placeholder="ë¶ì í© ì¬í­ì êµ¬ì²´ì ì¼ë¡ ê¸°ì íì¸ì" className="qt-input" style={{ resize: 'vertical' }} />
            </FormField>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setShowCARForm(false)} className="px-4 py-2 rounded-xl text-[13px]" style={{ background: 'var(--bg)', color: 'var(--ink-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>ì·¨ì</button>
            <button
              onClick={() => { if (form.finding) onSave(form) }}
              disabled={!form.finding}
              className="px-5 py-2 rounded-xl text-[13px] font-semibold"
              style={{ background: form.finding ? '#EF4444' : 'var(--bg-soft)', color: form.finding ? '#fff' : 'var(--ink-faint)', border: 'none', cursor: form.finding ? 'pointer' : 'not-allowed' }}
            >
              CAR ë°í
            </button>
          </div>
        </div>
      )}

      {cars.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="ë°íë CAR ìì" desc="ê°ì¬ìì ë¶ì í© ì¬í­ ë°ê²¬ ì CARì ë°ííì¸ì." />
      ) : (
        <div className="space-y-3">
          {[...cars].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((car) => {
            const sc = CAR_STATUS_COLOR[car.status] || '#6B7280'
            const severityColor = car.severity === 'major' ? '#EF4444' : car.severity === 'minor' ? '#F59E0B' : '#6B7280'
            const severityLabel = car.severity === 'major' ? 'Major' : car.severity === 'minor' ? 'Minor' : 'Obs.'
            return (
              <div key={car.id} className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[11px] font-bold" style={{ color: 'var(--ink-faint)' }}>{car.id}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${severityColor}20`, color: severityColor }}>{severityLabel}</span>
                    </div>
                    <div className="text-[13.5px] font-medium" style={{ color: 'var(--ink)' }}>{car.finding}</div>
                    {car.requirement && <div className="text-[12px] mt-1" style={{ color: 'var(--ink-faint)' }}>ìê±´: {car.requirement}</div>}
                    <div className="flex gap-4 mt-2 text-[12px]" style={{ color: 'var(--ink-faint)' }}>
                      {car.assignee && <span>ð¤ {car.assignee}</span>}
                      {car.dueDate && <span>ð ëª©í: {car.dueDate}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: `${sc}20`, color: sc }}>{CAR_STATUS_LABEL[car.status]}</span>
                    {car.status !== CAR_STATUS.CLOSED && (
                      <select
                        value={car.status}
                        onChange={(e) => onStatusChange(car.id, e.target.value)}
                        className="text-[11px] px-2 py-1 rounded-lg border"
                        style={{ borderColor: 'var(--line)', background: 'var(--bg)', color: 'var(--ink-soft)', cursor: 'pointer' }}
                      >
                        {Object.entries(CAR_STATUS_LABEL).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

/* ââ ì²´í¬ë¦¬ì¤í¸ í­ ââ */
function ChecklistTab() {
  const [checks, setChecks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('qualytree.audit_checklist') || '{}') } catch { return {} }
  })
  const toggle = (iso, val) => {
    const updated = { ...checks, [iso]: val }
    setChecks(updated)
    localStorage.setItem('qualytree.audit_checklist', JSON.stringify(updated))
  }
  const done = AUDIT_CHECKLIST.filter(c => checks[c.iso] === 'ok').length

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>ISO 13485 ê°ì¬ ì²´í¬ë¦¬ì¤í¸</div>
          <div className="text-[12px] mt-1" style={{ color: 'var(--ink-faint)' }}>
            ì Ý©: {done}/{AUDIT_CHECKLIST.length} í­ëª©
          </div>
        </div>
        <div className="w-32 h-2 rounded-full" style={{ background: 'var(--bg-soft)' }}>
          <div className="h-2 rounded-full transition-all" style={{ width: `${(done / AUDIT_CHECKLIST.length) * 100}%`, background: '#10B981' }} />
        </div>
      </div>
      <div className="space-y-2">
        {AUDIT_CHECKLIST.map((c) => {
          const val = checks[c.iso] || 'pending'
          return (
            <div key={c.iso} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <span className="font-mono text-[11px] font-bold w-14 flex-shrink-0" style={{ color: 'var(--ink-faint)' }}>Â§{c.iso}</span>
              <span className="flex-1 text-[13px]" style={{ color: 'var(--ink)' }}>{c.item}</span>
              <div className="flex gap-2">
                {[
                  { val: 'ok', label: 'ì í©', color: '#10B981' },
                  { val: 'nc', label: 'ë¶ì í©', color: '#EF4444' },
                  { val: 'na', label: 'N/A', color: '#6B7280' },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    onClick={() => toggle(c.iso, val === opt.val ? 'pending' : opt.val)}
                    className="text-[11px] px-2.5 py-1 rounded-lg font-medium transition"
                    style={{
                      background: val === opt.val ? opt.color : 'var(--bg-soft)',
                      color: val === opt.val ? '#fff' : 'var(--ink-faint)',
                      border: 'none', cursor: 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

/* ââ ê³µíµ ì»´í¬ëí¸ ââ */
function ActionBtn({ color, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30`, cursor: 'pointer' }}
    >
      {children}
    </button>
  )
}

function FormField({ label, children, colSpan, required }) {
  return (
    <div className={colSpan ? 'md:col-span-2' : ''}>
      <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink-soft)' }}>
        {label}{required && <span style={{ color: '#EF4444' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

function EmptyState({ icon: Icon, title, desc }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center" style={{ color: 'var(--ink-faint)' }}>
      <Icon size={40} strokeWidth={1.2} className="mb-3" style={{ opacity: 0.35 }} />
      <div className="text-[15px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{title}</div>
      <div className="text-[13px] max-w-xs">{desc}</div>
    </div>
  )
}
