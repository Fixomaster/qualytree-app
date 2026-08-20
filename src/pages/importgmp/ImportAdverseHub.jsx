// src/pages/importgmp/ImportAdverseHub.jsx
// ìë£ê¸°ê¸°ë² Â§30ì¡° â ìì ìë£ê¸°ê¸° ì´ìì¬ë¡ ë³´ê³ . ComplaintHub.jsx(ê³ ê°ë¶ë§ê´ë¦¬)ì ëì¼í
// êµ¬ì¡°(ì ìâì¡°ì¬âê·ì ë³´ê³ âì¢ê²°, ìë ìíì°ì , ì¹ì¸ì ê²ì¦ ì¢ê²°)ë¥¼ ë°ë¥¸ë¤. (#298)
import React, { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Plus, Search, Edit3, Trash2, ChevronDown, ChevronUp,
  X, AlertTriangle, CheckCircle2, MessageSquare,
  FileWarning, TrendingUp, BarChart2, List, OctagonAlert,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import CertGate from '../../components/CertGate'
import { auth } from '../../lib/auth'
import { companyDocs } from '../../lib/companyState'
import { onboarding } from '../../lib/onboardingState'

// ìì íëª© íê°íí©ì ë±ë¡ë íëª©ëª â ì´ìì¬ë¡ì 'ì íëª'ì ìì  ìë ¥ì´ ìëë¼
// ë±ë¡ë ìì íëª© ê¸°ì¤ì¼ë¡ ê²ìí´ì ì ííëë¡ íë¤.
function importProductNames() {
  try {
    const raw = localStorage.getItem('qualytree.import_products')
    if (!raw) return []
    const list = JSON.parse(raw)
    return Array.isArray(list) ? [...new Set(list.map(p => p.productName).filter(Boolean))] : []
  } catch { return [] }
}

const LS_KEY = 'qualytree.import_adverse'
function lsR() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] } }
function lsW(d) { localStorage.setItem(LS_KEY, JSON.stringify(d)) }
function genId() { return `IAE-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }

const REPORT_TYPE_OPTIONS = ['ìë°ë³´ê³ ', 'ê³ ê°ë¶ë§']

const SEVERITIES = [
  { value: 'critical', label: 'ì¬ê° â ì¬ë§/ì¤ìí´', color: '#991B1B', bg: '#FEE2E2' },
  { value: 'major',    label: 'ì¤ì â ìë£ì  ì²ì¹ íì', color: '#DC2626', bg: '#FEE2E2' },
  { value: 'minor',    label: 'ê²½ë¯¸ â ê²½ë¯¸í ìí´/ë¶í¸', color: '#D97706', bg: '#FEF3C7' },
  { value: 'none',     label: 'í´ë¹ìì â ë¶ì ìì', color: '#059669', bg: '#D1FAE5' },
]

// #24 â ë°ë ¤ í­ëª© ì­ì . ë±ë¡ë ì´ìì¬ë¡ë ì ìâì¡°ì¬â(ìë¬´ë³´ê³  ì)ë³´ê³ âì²ë¦¬âì¢ê²°ë¡ë§ íë¬ê°ë¤.
const STATUSES = [
  { value: 'received',      label: 'ì ì',       color: '#6B7280', bg: '#F3F4F6' },
  { value: 'investigating', label: 'ì¡°ì¬ ì¤',    color: '#2563EB', bg: '#DBEAFE' },
  { value: 'reporting',     label: 'ê·ì  ë³´ê³ ',  color: '#7C3AED', bg: '#EDE9FE' },
  { value: 'resolving',     label: 'ì²ë¦¬ ì¤',    color: '#D97706', bg: '#FEF3C7' },
  { value: 'closed',        label: 'ì¢ê²°',       color: '#059669', bg: '#D1FAE5' },
]
// #25 â ì¡°ì¹ ê³¼ì  ìí¬íë¡ì° ë¨ê³(íì¥ ë·°ì ì¤íí¼ íìì©)
const WORKFLOW_STEPS = [
  { value: 'received',      label: 'ì ì' },
  { value: 'investigating', label: 'ì¡°ì¬ ì¤' },
  { value: 'reporting',     label: 'ê·ì  ë³´ê³ ' },
  { value: 'resolving',     label: 'ì²ë¦¬ ì¤' },
  { value: 'closed',        label: 'ì¢ê²°' },
]

// MFDS ë³´ê³  íë¨ ê¸°ì¤ ìë´
const MDR_GUIDE = [
  'ì¬ë§ ëë ì¬ê°í ë¶ìì ì´ëíê±°ë ì´ëí  ê°ë¥ì±ì´ ìë ê²½ì°',
  'ì íì ê¸°ë¥ ë¶ë, ë³ì§ ëë ë¶ì ì í ë¼ë²¨ë§ì¼ë¡ ì¸í´ ë°ìí ê²½ì°',
  'ëì¼ ì´ìì¬ë¡ê° ë°ë³µëì´ ìì  ë¦¬ì¤í¬ê° ìë¤ê³  íë¨ëë ê²½ì°',
  'ìì ì¡°ì¹(Recall) ëë íì¥ ìì (FSC)ì´ íìí ê²½ì°',
]

// ì²ë¦¬ ìíë ìì ì íì´ ìëë¼ ìì±ë ë´ì©(ì¡°ì¬ê²°ê³¼Â·ê·¼ë³¸ìì¸Â·ìì ì¡°ì¹Â·MFDSë³´ê³  ë±)ì ë°ë¼
// ìëì¼ë¡ ì§íëë¤. ë°ë ¤/ì¢ê²°(ì¹ì¸)ë§ ì¬ëì´ ì§ì  ê²°ì íë ì¢ê²° ìíë¡ ì·¨ê¸íë¤.
function deriveAdverseStatus(f) {
  if (f.status === 'closed') return f.status
  const hasInvestigation = !!(f.investigation && f.investigation.trim())
  const hasRootCause = !!(f.rootCause && f.rootCause.trim())
  const hasCorrective = !!(f.corrective && f.corrective.trim())
  if (f.reportType === 'ìë¬´ë³´ê³ ' && !f.reportDate && (hasInvestigation || hasRootCause || hasCorrective)) return 'reporting'
  if (hasCorrective) return 'resolving'
  if (hasInvestigation || hasRootCause) return 'investigating'
  return 'received'
}
// ì¢ê²° ì¹ì¸ ê°ë¥ ì¬ë¶ â ì¡°ì¬Â·ê·¼ë³¸ìì¸Â·ìì ì¡°ì¹ê° ëª¨ë ìì±ëê³ (ìë¬´ë³´ê³  ì ë³´ê³ ê¹ì§ ìë£) ìì§ ì¢ê²° ì ì¸ ê²½ì°.
function readyToClose(item) {
  if (item.status === 'closed') return false
  const ok = !!(item.investigation?.trim() && item.rootCause?.trim() && item.corrective?.trim())
  if (!ok) return false
  if (item.reportType === 'ìë¬´ë³´ê³ ' && !item.reportDate) return false
  return true
}

const emptyForm = () => ({
  productName: '', incidentDate: new Date().toISOString().slice(0, 10),
  reportDate: '', reportNo: '', reportType: 'ìë°ë³´ê³ ', mdrCriteria: [], severity: 'none',
  description: '', immediateAction: '',
  assignee: '', dueDate: '', status: 'received',
  investigation: '', rootCause: '', corrective: '', followup: '',
  closedDate: '', notes: '',
})

// ââ ë©ì¸ âââââââââââââââââââââââââââââââââââââââââââââââââââââ
export default function ImportAdverseHub() {
  const user = auth.current()
  const [searchParams] = useSearchParams()
  const [items, setItems] = useState(() => lsR())
  const [tab, setTab] = useState(() => searchParams.get('tab') || 'list')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sevFilter, setSevFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [editId, setEditId] = useState(null)
  const [expanded, setExpanded] = useState(null)

  const save = d => { setItems(d); lsW(d) }

  const openNew = () => { setForm({ ...emptyForm(), assignee: user?.name || '' }); setEditId(null); setShowForm(true) }
  const openEdit = item => { setForm({ ...item }); setEditId(item.id); setShowForm(true) }

  const submit = () => {
    if (!form.productName || !form.description) return alert('ì íëªê³¼ ì´ìì¬ë¡ ë´ì©ì íììëë¤.')
    if (!form.incidentDate) return alert('ë°ìì¼ì ìë ¥íì¸ì.')
    const now = new Date().toISOString()
    const withStatus = { ...form, status: deriveAdverseStatus(form) }
    if (editId) {
      save(items.map(i => i.id === editId ? { ...withStatus, id: editId } : i))
    } else {
      save([{ ...withStatus, id: genId(), createdAt: now, createdBy: user?.name || '-' }, ...items])
    }
    setShowForm(false)
  }

  const remove = id => { if (!confirm('ì­ì íìê² ìµëê¹?')) return; save(items.filter(i => i.id !== id)) }
  const fld = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // ì¢ê²°ì ìíê° íë ë°ê¾¸ë ê²ì¼ë¡ ëëì§ ìê³ , ê¸°ë³¸ì ë³´ì ë±ë¡ë íì§ì±ìì ëë
  // ëíì´ì¬ ë³¸ì¸ë§ ì¹ì¸ì ì±ëªì ìë ¥í´ ê²í Â·ì¹ì¸í´ì¼ ì¢ê²° ì²ë¦¬ëë¤.
  const approveClose = id => {
    const item = items.find(i => i.id === id)
    if (!item || !readyToClose(item)) return
    const qmName = ((companyDocs.getQualityManager() || {}).name || '').trim()
    const ceoName = ((onboarding.load().company || {}).ceo || '').trim()
    if (!qmName && !ceoName) {
      alert('ê¸°ë³¸ì ë³´ì íì§ì±ìì ëë ëíì´ì¬ê° ë±ë¡ëì´ ìì§ ììµëë¤. ë¨¼ì  ê¸°ë³¸ì ë³´ìì ë±ë¡íì¸ì.')
      return
    }
    const who = [qmName && `íì§ì±ìì(${qmName})`, ceoName && `ëíì´ì¬(${ceoName})`].filter(Boolean).join(' ëë ')
    const input = window.prompt(`ì´ìì¬ë¡ ì¢ê²° ì¹ì¸ â ${who} ë³¸ì¸ë§ ì¹ì¸í  ì ììµëë¤.\nì¹ì¸ì ì±ëªì ìë ¥íì¸ì:`, '')
    if (input === null) return
    const approver = input.trim()
    if (!approver) { alert('ì¹ì¸ì ì±ëªì ìë ¥í´ì¼ í©ëë¤.'); return }
    if (approver !== qmName && approver !== ceoName) {
      alert('ìë ¥í ì´ë¦ì´ ë±ë¡ë íì§ì±ìì ëë ëíì´ì¬ì ì¼ì¹íì§ ìì ì¹ì¸í  ì ììµëë¤.')
      return
    }
    save(items.map(i => i.id === id ? { ...i, status: 'closed', closedDate: new Date().toISOString().slice(0, 10), approvedBy: approver } : i))
  }

  const filtered = useMemo(() => {
    let list = [...items]
    if (statusFilter !== 'all') list = list.filter(i => i.status === statusFilter)
    if (sevFilter !== 'all') list = list.filter(i => i.severity === sevFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(i => (i.id + i.productName + i.description + (i.reportNo || '')).toLowerCase().includes(q))
    }
    return list.sort((a, b) => (b.createdAt || b.incidentDate || '').localeCompare(a.createdAt || a.incidentDate || ''))
  }, [items, search, statusFilter, sevFilter])

  const stats = {
    total: items.length,
    open: items.filter(i => !['closed', 'rejected'].includes(i.status)).length,
    mandatory: items.filter(i => i.reportType === 'ìë¬´ë³´ê³ ').length,
    critical: items.filter(i => ['critical', 'major'].includes(i.severity)).length,
    closed: items.filter(i => i.status === 'closed').length,
    thisMonth: items.filter(i => i.incidentDate?.startsWith(new Date().toISOString().slice(0, 7))).length,
  }

  const TABS = [
    { key: 'list', label: 'ì´ìì¬ë¡ ëª©ë¡', icon: List },
    { key: 'stats', label: 'íí© ë¶ì', icon: BarChart2 },
    { key: 'trend', label: '트렌드 분석', icon: TrendingUp },
    { key: 'mdr', label: 'MFDS ë³´ê³  íí©', icon: FileWarning },
  ]

  return (
    <AppLayout user={user} title="ì´ìì¬ë¡ ë³´ê³ " subtitle="ìë£ê¸°ê¸°ë² Â§30ì¡° Â· ìì ìë£ê¸°ê¸° ì´ìì¬ë¡ MFDS ë³´ê³  ì´ë ¥ ê´ë¦¬">
      <CertGate certId="kgmp_importer" label="ìì GMP">
        <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto">

          <HubBanner
            title="ì´ìì¬ë¡ ë³´ê³ "
            subtitle="ìë£ê¸°ê¸°ë² Â§30ì¡° Â· ì´ìì¬ë¡ ì ì Â· ì¡°ì¬ Â· ìì ì¡°ì¹ Â· MFDS ê·ì  ë³´ê³ "
            icon={OctagonAlert}
            color="#EF4444"
            quickActions={[{ label: 'ì´ìì¬ë¡ ë±ë¡', icon: Plus, onClick: openNew, primary: true }]}
            workflow={['ì´ìì¬ë¡ ì¸ì§', 'ì´ê¸° íê°', 'ì¡°ì¬', 'ìì ì¡°ì¹', 'MFDS ë³´ê³ ', 'ì¢ê²°']}
          />

          {/* KPI */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
            {[
              { label: 'ì´ ì ì', count: stats.total, color: '#6B7280' },
              { label: 'ì²ë¦¬ ì¤', count: stats.open, color: '#2563EB' },
              { label: 'ì¬ê°/ì¤ì', count: stats.critical, color: '#DC2626' },
              { label: 'ìë¬´ë³´ê³ ', count: stats.mandatory, color: '#7C3AED' },
              { label: 'ì´ë² ë¬', count: stats.thisMonth, color: '#D97706' },
              { label: 'ì¢ê²°', count: stats.closed, color: '#059669' },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                <div className="text-[20px] font-bold" style={{ color: s.color }}>{s.count}</div>
                <div className="text-[10.5px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* MFDS ë¯¸ë³´ê³  ê²½ê³  */}
          {items.filter(i => i.reportType === 'ìë¬´ë³´ê³ ' && !i.reportDate && i.status !== 'closed').length > 0 && (
            <div className="flex items-center gap-3 p-4 rounded-2xl mb-5" style={{ background: '#EDE9FE', border: '1px solid #C4B5FD' }}>
              <FileWarning size={18} style={{ color: '#7C3AED', flexShrink: 0 }} />
              <div>
                <div className="text-[13px] font-bold" style={{ color: '#4C1D95' }}>
                  MFDS ê·ì  ë³´ê³  ë¯¸ìë£ {items.filter(i => i.reportType === 'ìë¬´ë³´ê³ ' && !i.reportDate && i.status !== 'closed').length}ê±´
                </div>
                <div className="text-[12px]" style={{ color: '#6D28D9' }}>ìì½ì² ì´ìì¬ë¡ ë³´ê³  ê¸°íì íì¸íì¸ì (ì¬ë§/ì¤ìí´: ì¦ì, ê¸°í: 30ì¼ ì´ë´)</div>
              </div>
            </div>
          )}

          {/* í­ */}
          <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: 'var(--bg-soft)', width: 'fit-content' }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition"
                style={{ background: tab === t.key ? 'var(--bg-card)' : 'transparent', color: tab === t.key ? 'var(--ink)' : 'var(--ink-faint)', border: 'none', cursor: 'pointer', boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
                <t.icon size={14} />{t.label}
              </button>
            ))}
          </div>

          {/* ââ ëª©ë¡ í­ ââ */}
          {tab === 'list' && (
            <>
              <div className="flex gap-3 mb-4 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-[180px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                  <Search size={14} style={{ color: 'var(--ink-faint)' }} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ì íëª Â· ë²í¸ Â· ë´ì© ê²ì..." className="flex-1 text-[13px] outline-none" style={{ background: 'none', border: 'none', color: 'var(--ink)' }} />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-xl text-[13px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
                  <option value="all">ì ì²´ ìí</option>
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <select value={sevFilter} onChange={e => setSevFilter(e.target.value)} className="px-3 py-2 rounded-xl text-[13px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
                  <option value="all">ì ì²´ ì¬ê°ë</option>
                  {SEVERITIES.map(s => <option key={s.value} value={s.value}>{s.label.split(' â ')[0]}</option>)}
                </select>
                <button onClick={openNew} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold" style={{ background: '#DC2626', color: 'white', border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} /> ì´ìì¬ë¡ ë±ë¡
                </button>
              </div>

              {filtered.length === 0
                ? <EmptyState onAdd={openNew} />
                : <div className="space-y-2">
                    {filtered.map(item => (
                      <AdverseRow key={item.id} item={item}
                        expanded={expanded === item.id}
                        onToggle={() => setExpanded(expanded === item.id ? null : item.id)}
                        onEdit={() => openEdit(item)}
                        onDelete={() => remove(item.id)}
                        onApproveClose={() => approveClose(item.id)}
                      />
                    ))}
                  </div>
              }
            </>
          )}

          {/* ââ íí© ë¶ì í­ ââ */}
          {tab === 'stats' && <StatsView items={items} />}

          {/* ââ MFDS ë³´ê³  íí© í­ ââ */}
          {tab === 'mdr' && <MdrView items={items} onEdit={openEdit} />}

        </div>

        {showForm && <AdverseForm form={form} fld={fld} editId={editId} onSubmit={submit} onClose={() => setShowForm(false)} />}
      </CertGate>
    </AppLayout>
  )
}

// ââ ì´ìì¬ë¡ í ì»´í¬ëí¸ ââââââââââââââââââââââââââââââââââââââ
function AdverseRow({ item, expanded, onToggle, onEdit, onDelete, onApproveClose }) {
  const st = STATUSES.find(s => s.value === item.status) || STATUSES[0]
  const canClose = readyToClose(item)
  const sev = SEVERITIES.find(s => s.value === item.severity) || SEVERITIES[3]

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={onToggle} style={{ borderBottom: expanded ? '1px solid var(--line)' : 'none' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: sev.bg }}>
          {['critical', 'major'].includes(item.severity)
            ? <AlertTriangle size={16} style={{ color: sev.color }} />
            : <MessageSquare size={16} style={{ color: sev.color }} />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px]" style={{ color: 'var(--ink-faint)' }}>{item.id}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: sev.bg, color: sev.color }}>{sev.label.split(' â ')[0]}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-soft)', color: 'var(--ink-mute)' }}>{item.reportType}</span>
            {item.reportType === 'ìë¬´ë³´ê³ ' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: '#EDE9FE', color: '#7C3AED' }}>
                {item.reportDate ? 'â ë³´ê³ ìë£' : 'â  ë³´ê³ íì'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>{item.productName}</span>
          </div>
          <div className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--ink-faint)' }}>{item.description}</div>
        </div>

        <div className="text-right flex-shrink-0 mr-1">
          <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>ë°ìì¼</div>
          <div className="text-[12px] font-medium" style={{ color: 'var(--ink)' }}>{item.incidentDate || '-'}</div>
          {item.dueDate && (
            <div className="text-[11px]" style={{ color: daysUntil(item.dueDate) < 0 ? '#DC2626' : 'var(--ink-faint)' }}>
              ë§ê° {item.dueDate}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {canClose && (
            <button onClick={e => { e.stopPropagation(); onApproveClose() }} className="px-2 py-1 rounded-lg text-[10.5px] font-bold" style={{ background: '#D1FAE5', color: '#059669', border: '1px solid #A7F3D0', cursor: 'pointer' }}>ì¢ê²° ì¹ì¸</button>
          )}
          <button onClick={e => { e.stopPropagation(); onEdit() }} className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)', border: 'none', cursor: 'pointer' }}><Edit3 size={13} /></button>
          <button onClick={e => { e.stopPropagation(); onDelete() }} className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', cursor: 'pointer' }}><Trash2 size={13} /></button>
          {expanded ? <ChevronUp size={16} style={{ color: 'var(--ink-faint)' }} /> : <ChevronDown size={16} style={{ color: 'var(--ink-faint)' }} />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 py-4 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2 flex items-center gap-1 mb-1 overflow-x-auto pb-1">
            {WORKFLOW_STEPS.map((s, i) => {
              const curIdx = WORKFLOW_STEPS.findIndex(w => w.value === item.status)
              const done = i <= curIdx
              const active = i === curIdx
              return (
                <div key={s.value} className="flex items-center flex-shrink-0">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold"
                    style={{ background: active ? '#DBEAFE' : done ? '#D1FAE5' : 'var(--bg-soft)', color: active ? '#2563EB' : done ? '#059669' : 'var(--ink-faint)', border: `1px solid ${active ? '#93C5FD' : done ? '#A7F3D0' : 'var(--line)'}` }}>
                    <span className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: done ? (active ? '#2563EB' : '#059669') : 'var(--line)', color: 'white', fontSize: 9 }}>{i + 1}</span>
                    {s.label}
                  </div>
                  {i < WORKFLOW_STEPS.length - 1 && <div className="w-3 h-px flex-shrink-0" style={{ background: done ? '#A7F3D0' : 'var(--line)' }} />}
                </div>
              )
            })}
          </div>
          <div>
            <SL>ì í ì ë³´</SL>
            <InfoRow k="ì íëª" v={item.productName} />
            <InfoRow k="ë°ìì¼" v={item.incidentDate} />
            <InfoRow k="ë³´ê³  ì í" v={item.reportType} />
          </div>
          <div>
            <SL>ì´ìì¬ë¡ ë´ì©</SL>
            <div className="text-[12.5px] p-2 rounded-lg mb-3" style={{ background: 'var(--bg-soft)', color: 'var(--ink)', lineHeight: 1.6 }}>{item.description}</div>
            {item.immediateAction && <>
              <SL>ì¦ê° ì¡°ì¹</SL>
              <div className="text-[12px] p-2 rounded-lg mb-2" style={{ background: 'var(--bg-soft)', color: 'var(--ink)' }}>{item.immediateAction}</div>
            </>}
            <SL>ì¡°ì¬ ë° ì²ë¦¬</SL>
            <InfoRow k="ë´ë¹ì" v={item.assignee} />
            <InfoRow k="ë§ê°ì¼" v={item.dueDate} />
          </div>
          {(item.investigation || item.rootCause || item.corrective) && (
            <div className="md:col-span-2">
              <SL>ì¡°ì¬ ê²°ê³¼ / ê·¼ë³¸ ìì¸ / ìì  ì¡°ì¹</SL>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[['ì¡°ì¬ ê²°ê³¼', item.investigation], ['ê·¼ë³¸ ìì¸', item.rootCause], ['ìì  ì¡°ì¹', item.corrective]].map(([k, v]) => v && (
                  <div key={k}>
                    <div className="text-[10px] font-bold mb-1" style={{ color: 'var(--ink-faint)' }}>{k}</div>
                    <div className="text-[12px] p-2 rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink)', lineHeight: 1.5 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {item.followup && (
            <div className="md:col-span-2">
              <SL>íì ì¡°ì¹</SL>
              <div className="text-[12px] p-2 rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink)' }}>{item.followup}</div>
            </div>
          )}
          {item.reportType === 'ìë¬´ë³´ê³ ' && (
            <div className="md:col-span-2 p-3 rounded-xl" style={{ background: '#EDE9FE', border: '1px solid #C4B5FD' }}>
              <div className="text-[12px] font-bold mb-1" style={{ color: '#4C1D95' }}>ð MFDS ê·ì  ë³´ê³  ì ë³´</div>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <InfoRow k="ë³´ê³ ì¼" v={item.reportDate || '(ë¯¸ë³´ê³ )'} />
                <InfoRow k="ì ì ë²í¸" v={item.reportNo || '-'} />
              </div>
            </div>
          )}
          <div className="md:col-span-2 text-[11px]" style={{ color: 'var(--ink-faint)' }}>
            ë±ë¡: {item.createdBy} Â· {item.createdAt?.slice(0, 10) || '-'}
            {item.closedDate && ` Â· ì¢ê²°: ${item.closedDate}${item.approvedBy ? ` (ì¹ì¸: ${item.approvedBy})` : ''}`}
          </div>
        </div>
      )}
    </div>
  )
}

function SL({ children }) { return <div className="text-[10.5px] font-bold mb-1 mt-2" style={{ color: 'var(--ink-faint)' }}>{children}</div> }
function InfoRow({ k, v }) {
  return (
    <div className="flex gap-2 mb-1">
      <span className="text-[11px] flex-shrink-0 w-16" style={{ color: 'var(--ink-faint)' }}>{k}</span>
      <span className="text-[12px]" style={{ color: 'var(--ink)' }}>{v || '-'}</span>
    </div>
  )
}
function daysUntil(d) { return d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null }

// ââ íí© ë¶ì âââââââââââââââââââââââââââââââââââââââââââââââââ
function StatsView({ items }) {
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i)
    const key = d.toISOString().slice(0, 7)
    months.push({ key, label: `${d.getMonth() + 1}ì`, count: items.filter(item => item.incidentDate?.startsWith(key)).length })
  }
  const maxMonth = Math.max(...months.map(m => m.count), 1)

  const byStatus = STATUSES.map(s => ({ ...s, count: items.filter(i => i.status === s.value).length }))
  const closeRate = items.length === 0 ? 0 : Math.round(items.filter(i => i.status === 'closed').length / items.length * 100)

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="text-[13px] font-bold mb-4" style={{ color: 'var(--ink)' }}>ìë³ ì ì ì¶ì´</div>
        <div className="flex items-end gap-2 h-32">
          {months.map(m => (
            <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
              <div className="text-[11px] font-bold" style={{ color: 'var(--ink-soft)' }}>{m.count || ''}</div>
              <div className="w-full rounded-t-lg" style={{ height: `${(m.count / maxMonth) * 100}%`, minHeight: 4, background: m.count > 0 ? '#DC2626' : 'var(--bg-soft)', transition: 'height 0.3s' }} />
              <div className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="text-[13px] font-bold mb-4" style={{ color: 'var(--ink)' }}>ì²ë¦¬ íí©</div>
        <div className="space-y-2">
          {byStatus.filter(s => s.count > 0).map(s => (
            <div key={s.value} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <div className="text-[12px] w-16" style={{ color: 'var(--ink)' }}>{s.label}</div>
              <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: 'var(--bg-soft)' }}>
                <div className="h-full rounded-full" style={{ width: `${(s.count / items.length) * 100}%`, background: s.color, transition: 'width 0.3s' }} />
              </div>
              <div className="text-[12px] font-bold w-6 text-right" style={{ color: 'var(--ink)' }}>{s.count}</div>
            </div>
          ))}
          {items.length === 0 && <div className="text-[12px] text-center py-4" style={{ color: 'var(--ink-faint)' }}>ë°ì´í° ìì</div>}
        </div>
        <div className="mt-3 pt-3 flex items-center gap-2" style={{ borderTop: '1px solid var(--line)' }}>
          <CheckCircle2 size={14} style={{ color: '#059669' }} />
          <span className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>ì¢ê²°ë¥ </span>
          <span className="text-[16px] font-bold" style={{ color: '#059669' }}>{closeRate}%</span>
        </div>
      </div>

      <div className="p-5 rounded-2xl md:col-span-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="text-[13px] font-bold mb-4" style={{ color: 'var(--ink)' }}>ì¬ê°ë ë¶í¬</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SEVERITIES.map(s => {
            const cnt = items.filter(i => i.severity === s.value).length
            return (
              <div key={s.value} className="p-3 rounded-xl text-center" style={{ background: s.bg }}>
                <div className="text-[22px] font-bold" style={{ color: s.color }}>{cnt}</div>
                <div className="text-[10px] mt-0.5" style={{ color: s.color, opacity: 0.8 }}>{s.label.split(' â ')[0]}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ââ MFDS ë³´ê³  íí© í­ ââââââââââââââââââââââââââââââââââââââââââ
function MdrView({ items, onEdit }) {
  const mdrItems = items.filter(i => i.reportType === 'ìë¬´ë³´ê³ ')

  return (
    <div>
      <div className="p-4 rounded-2xl mb-5" style={{ background: '#EDE9FE', border: '1px solid #C4B5FD' }}>
        <div className="text-[13px] font-bold mb-2" style={{ color: '#4C1D95' }}>ð MFDS(ìë£ê¸°ê¸° ì´ìì¬ë¡) ìë¬´ë³´ê³  íë¨ ê¸°ì¤</div>
        <div className="space-y-1">
          {MDR_GUIDE.map((g, i) => (
            <div key={i} className="flex items-start gap-2 text-[12px]" style={{ color: '#5B21B6' }}>
              <span className="flex-shrink-0 font-bold">{i + 1}.</span>
              <span>{g}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 text-[11px]" style={{ color: '#7C3AED' }}>
          â» ìì½ì² ë³´ê³  ê¸°í: ì¬ë§/ì¤ìí´ â ì¦ì(ì¸ì§ í 24h ì´ë´) ~ 30ì¼ ì´ë´ / ê¸°í â 30ì¼ ì´ë´
        </div>
      </div>

      {mdrItems.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--ink-faint)' }}>
          <FileWarning size={40} strokeWidth={1.2} className="mx-auto mb-3 opacity-30" />
          <div>ìë¬´ë³´ê³  ëì ì´ìì¬ë¡ê° ììµëë¤</div>
        </div>
      ) : (
        <div className="space-y-3">
          {mdrItems.filter(i => !i.reportDate).length > 0 && (
            <div>
              <div className="text-[12px] font-bold mb-2 flex items-center gap-2" style={{ color: '#DC2626' }}>
                <AlertTriangle size={13} /> ë¯¸ë³´ê³  ({mdrItems.filter(i => !i.reportDate).length}ê±´)
              </div>
              {mdrItems.filter(i => !i.reportDate).map(item => <MdrRow key={item.id} item={item} onEdit={onEdit} />)}
            </div>
          )}
          {mdrItems.filter(i => i.reportDate).length > 0 && (
            <div>
              <div className="text-[12px] font-bold mb-2 flex items-center gap-2" style={{ color: '#059669' }}>
                <CheckCircle2 size={13} /> ë³´ê³  ìë£ ({mdrItems.filter(i => i.reportDate).length}ê±´)
              </div>
              {mdrItems.filter(i => i.reportDate).map(item => <MdrRow key={item.id} item={item} onEdit={onEdit} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MdrRow({ item, onEdit }) {
  const done = !!item.reportDate
  const sev = SEVERITIES.find(s => s.value === item.severity) || SEVERITIES[3]
  const incidentDays = item.incidentDate ? Math.ceil((new Date() - new Date(item.incidentDate)) / 86400000) : 0

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl cursor-pointer" style={{ background: done ? '#F0FDF4' : '#FEF3C7', border: `1px solid ${done ? '#BBF7D0' : '#FDE68A'}` }} onClick={() => onEdit(item)}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: done ? '#D1FAE5' : '#FEE2E2' }}>
        {done ? <CheckCircle2 size={18} style={{ color: '#059669' }} /> : <AlertTriangle size={18} style={{ color: '#DC2626' }} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[10px]" style={{ color: 'var(--ink-faint)' }}>{item.id}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: sev.bg, color: sev.color }}>{sev.label.split(' â ')[0]}</span>
        </div>
        <div className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{item.productName || '-'}</div>
        <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>ë°ì {item.incidentDate} ({incidentDays}ì¼ ê²½ê³¼)</div>
      </div>
      <div className="text-right flex-shrink-0">
        {done ? (
          <>
            <div className="text-[11px] font-bold" style={{ color: '#059669' }}>ë³´ê³  ìë£</div>
            <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{item.reportDate}</div>
            <div className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>ì ìë²í¸: {item.reportNo || '-'}</div>
          </>
        ) : (
          <>
            <div className="text-[11px] font-bold" style={{ color: '#DC2626' }}>ë¯¸ë³´ê³ </div>
            <div className="text-[11px]" style={{ color: '#D97706' }}>{incidentDays}ì¼ ê²½ê³¼</div>
            <div className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>í´ë¦­íì¬ ë³´ê³  ì ë³´ ìë ¥</div>
          </>
        )}
      </div>
    </div>
  )
}

// ââ ì´ìì¬ë¡ ë±ë¡/ìì  í¼ ëª¨ë¬ ââââââââââââââââââââââââââââââââ
function AdverseForm({ form, fld, editId, onSubmit, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px', overflowY: 'auto' }} onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--line)', width: '100%', maxWidth: 700, boxShadow: '0 24px 64px rgba(0,0,0,0.3)', padding: 28 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="text-[16px] font-bold" style={{ color: 'var(--ink)' }}>{editId ? 'ì´ìì¬ë¡ ìì ' : 'ì´ìì¬ë¡ ë±ë¡'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)' }}><X size={20} /></button>
        </div>

        <div className="space-y-3">
          <R2>
            <F l="ì íëª * (ë±ë¡ íëª© ê²ì)">
              <input value={form.productName} onChange={e => fld('productName', e.target.value)} style={IS} className="w-full" list="adverse-product-list" placeholder="ì íëª ìë ¥ ëë ê²ì..." />
              <datalist id="adverse-product-list">{importProductNames().map(n => <option key={n} value={n} />)}</datalist>
            </F>
            <F l="ë°ìì¼ *"><input type="date" value={form.incidentDate} onChange={e => fld('incidentDate', e.target.value)} style={IS} className="w-full" /></F>
          </R2>
          <F l="MFDS ìë¬´ë³´ê³  í´ë¹ ì¬ë¶ (ìë ê¸°ì¤ ì¤ íëë¼ë í´ë¹ëë©´ ìë¬´ë³´ê³ ë¡ ìë ë¶ë¥ë©ëë¤)">
            <div className="space-y-1.5 p-2.5 rounded-xl" style={{ background: 'var(--bg-soft)' }}>
              {MDR_GUIDE.map((g, i) => (
                <label key={i} className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={(form.mdrCriteria || []).includes(i)}
                    onChange={e => {
                      const cur = form.mdrCriteria || []
                      const next = e.target.checked ? [...cur, i] : cur.filter(x => x !== i)
                      fld('mdrCriteria', next)
                      fld('reportType', next.length > 0 ? 'ìë¬´ë³´ê³ ' : (REPORT_TYPE_OPTIONS.includes(form.reportType) ? form.reportType : REPORT_TYPE_OPTIONS[0]))
                    }} style={{ width: 15, height: 15, marginTop: 1, flexShrink: 0 }} />
                  <span className="text-[11.5px]" style={{ color: 'var(--ink-soft)' }}>{g}</span>
                </label>
              ))}
            </div>
          </F>
          {(form.mdrCriteria || []).length > 0 ? (
            <div className="p-2.5 rounded-xl text-[11.5px] font-semibold" style={{ background: '#EDE9FE', color: '#4C1D95', border: '1px solid #C4B5FD' }}>
              MFDS ìë¬´ë³´ê³  ëìì¼ë¡ ë¶ë¥ëììµëë¤. ë±ë¡ í ì¡°ì¬ ì§íì ë°ë¼ 'MFDS ê·ì  ë³´ê³  ì ë³´'ì ì ìë²í¸ë¥¼ ìë ¥íì¸ì.
            </div>
          ) : (
            <F l="ë³´ê³  ì í">
              <select value={form.reportType} onChange={e => fld('reportType', e.target.value)} style={IS} className="w-full">
                {REPORT_TYPE_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </F>
          )}

          <F l="ì¬ê°ë (ë¶ìÂ·í¼í´ ìì¤)">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {SEVERITIES.map(s => (
                <button key={s.value} type="button" onClick={() => fld('severity', s.value)}
                  className="p-2 rounded-xl text-[11px] font-semibold text-center transition"
                  style={{ background: form.severity === s.value ? s.bg : 'var(--bg-soft)', color: form.severity === s.value ? s.color : 'var(--ink-faint)', border: `2px solid ${form.severity === s.value ? s.color : 'transparent'}`, cursor: 'pointer' }}>
                  {s.label.split(' â ')[0]}<div style={{ fontSize: 9, fontWeight: 400, marginTop: 2 }}>{s.label.split(' â ')[1]}</div>
                </button>
              ))}
            </div>
          </F>

          <F l="ì´ìì¬ë¡ ë´ì© *"><textarea value={form.description} onChange={e => fld('description', e.target.value)} rows={3} placeholder="ë°ì ê²½ì, ì¦ì, ê´ë ¨ íì/ì¬ì©ì ì ë³´ ë±ì ê¸°ì¬í©ëë¤." style={{ ...IS, resize: 'vertical' }} className="w-full" /></F>
          <F l="ì¦ê° ì¡°ì¹ (íì¥ ì¡°ì¹ ë±)"><textarea value={form.immediateAction} onChange={e => fld('immediateAction', e.target.value)} rows={2} style={{ ...IS, resize: 'vertical' }} className="w-full" /></F>

          <R2>
            <F l="ë´ë¹ì"><input value={form.assignee} onChange={e => fld('assignee', e.target.value)} style={IS} className="w-full" /></F>
            <F l="ì²ë¦¬ ë§ê°ì¼"><input type="date" value={form.dueDate} onChange={e => fld('dueDate', e.target.value)} style={IS} className="w-full" /></F>
          </R2>

          {editId && (
            <>
              {form.reportType === 'ìë¬´ë³´ê³ ' && (
                <div className="p-4 rounded-xl" style={{ background: '#EDE9FE', border: '1px solid #C4B5FD' }}>
                  <div className="text-[13px] font-semibold mb-2" style={{ color: '#4C1D95' }}>MFDS ê·ì  ë³´ê³  ì ë³´</div>
                  <R2>
                    <F l="ë³´ê³ ì¼"><input type="date" value={form.reportDate} onChange={e => fld('reportDate', e.target.value)} style={IS} className="w-full" /></F>
                    <F l="ìì½ì² ì ì ë²í¸"><input value={form.reportNo} onChange={e => fld('reportNo', e.target.value)} placeholder="ì ì ë²í¸" style={IS} className="w-full" /></F>
                  </R2>
                </div>
              )}

              <div className="text-[11.5px] font-bold pt-1" style={{ color: 'var(--ink-faint)' }}>ì§í ìí© (ì ì í ì¡°ì¬Â·ì²ë¦¬ ì§íì ë°ë¼ ìë ¥)</div>
              <F l="ì¡°ì¬ ê²°ê³¼"><textarea value={form.investigation} onChange={e => fld('investigation', e.target.value)} rows={2} style={{ ...IS, resize: 'vertical' }} className="w-full" /></F>
              <R2>
                <F l="ê·¼ë³¸ ìì¸"><textarea value={form.rootCause} onChange={e => fld('rootCause', e.target.value)} rows={2} style={{ ...IS, resize: 'vertical' }} className="w-full" /></F>
                <F l="ìì  ì¡°ì¹"><textarea value={form.corrective} onChange={e => fld('corrective', e.target.value)} rows={2} style={{ ...IS, resize: 'vertical' }} className="w-full" /></F>
              </R2>
              <F l="íì ì¡°ì¹ (ì í íì, CAPA ì°ê³ ë±)"><textarea value={form.followup} onChange={e => fld('followup', e.target.value)} rows={2} style={{ ...IS, resize: 'vertical' }} className="w-full" /></F>

              {(() => {
                const computed = STATUSES.find(s => s.value === deriveAdverseStatus(form)) || STATUSES[0]
                return (
                  <div className="p-3 rounded-xl flex items-center justify-between" style={{ background: computed.bg, border: `1px solid ${computed.color}40` }}>
                    <span className="text-[12px]" style={{ color: computed.color }}>ì²ë¦¬ ìí (ìì± ë´ì© ê¸°ì¤ ìë ì°ì )</span>
                    <span className="text-[12.5px] font-bold" style={{ color: computed.color }}>{computed.label}</span>
                  </div>
                )
              })()}
            </>
          )}
          <F l="ë¹ê³ "><textarea value={form.notes} onChange={e => fld('notes', e.target.value)} rows={2} style={{ ...IS, resize: 'vertical' }} className="w-full" /></F>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>ì·¨ì</button>
          <button onClick={onSubmit} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: '#DC2626', color: 'white', border: 'none', cursor: 'pointer' }}>
            {editId ? 'ìì  ì ì¥' : 'ì´ìì¬ë¡ ë±ë¡'}
          </button>
        </div>
      </div>
    </div>
  )
}

function R2({ children }) { return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div> }
function F({ l, children }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-faint)' }}>{l}</label>
      {children}
    </div>
  )
}
const IS = { border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--ink)', background: 'var(--bg-card)', outline: 'none', width: '100%' }

function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <OctagonAlert size={48} strokeWidth={1} className="mx-auto mb-3 opacity-30" style={{ color: '#DC2626' }} />
      <div className="text-[16px] font-bold mb-1" style={{ color: 'var(--ink-soft)' }}>ë±ë¡ë ì´ìì¬ë¡ ìì</div>
      <div className="text-[13px] mb-5" style={{ color: 'var(--ink-faint)' }}>ì´ìì¬ë¡ë¥¼ ë±ë¡íê³  ì²´ê³ì ì¼ë¡ ì²ë¦¬íì¸ì</div>
      <button onClick={onAdd} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: '#DC2626', color: 'white', border: 'none', cursor: 'pointer' }}>
        <Plus size={15} /> ì²« ë²ì§¸ ì´ìì¬ë¡ ë±ë¡
      </button>
    </div>
      {tab === 'trend' && (
        <div style={{ padding: '16px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* 제품별 신호 감지 */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', gridColumn: '1/-1' }}>
              <p style={{ fontWeight: 600, marginBottom: '12px', fontSize: '14px' }}>제품별 이상사례 신호 감지</p>
              <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>동일 제품에서 3건 이상 이상사례 발생 시 신호로 분류</p>
              {(() => {
                const byProduct = {};
                items.forEach(it => {
                  const p = it.productName || '미분류';
                  byProduct[p] = (byProduct[p] || []);
                  byProduct[p].push(it);
                });
                const signals = Object.entries(byProduct).filter(([,arr]) => arr.length >= 3).sort((a,b) => b[1].length - a[1].length);
                const normal = Object.entries(byProduct).filter(([,arr]) => arr.length < 3).sort((a,b) => b[1].length - a[1].length);
                return signals.length === 0 && normal.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#9ca3af' }}>등록된 이상사례가 없습니다</p>
                ) : (
                  <div>
                    {signals.map(([name, arr]) => (
                      <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', marginBottom: '6px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                        <span style={{ fontSize: '12px', background: '#dc2626', color: 'white', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>신호</span>
                        <span style={{ fontSize: '13px', fontWeight: 500, flex: 1 }}>{name}</span>
                        <span style={{ fontSize: '13px', color: '#dc2626', fontWeight: 700 }}>{arr.length}건</span>
                      </div>
                    ))}
                    {normal.slice(0, 5).map(([name, arr]) => (
                      <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', marginBottom: '6px', background: '#f9fafb', borderRadius: '8px' }}>
                        <span style={{ fontSize: '12px', background: '#e5e7eb', color: '#374151', padding: '2px 8px', borderRadius: '12px' }}>관찰</span>
                        <span style={{ fontSize: '13px', flex: 1 }}>{name}</span>
                        <span style={{ fontSize: '13px', color: '#374151' }}>{arr.length}건</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* 월별 발생 추이 */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
              <p style={{ fontWeight: 600, marginBottom: '12px', fontSize: '14px' }}>월별 발생 추이 (최근 12개월)</p>
              {(() => {
                const now = new Date();
                const months = [];
                for (let i = 11; i >= 0; i--) {
                  const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                  months.push(d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0'));
                }
                const byMonth = {};
                months.forEach(m => byMonth[m] = 0);
                items.forEach(it => {
                  if (it.incidentDate) {
                    const key = it.incidentDate.slice(0,7);
                    if (byMonth[key] !== undefined) byMonth[key]++;
                  }
                });
                const max = Math.max(...Object.values(byMonth), 1);
                return (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '100px' }}>
                    {months.map(m => (
                      <div key={m} title={m + ': ' + byMonth[m] + '건'} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                        <div style={{ width: '100%', background: byMonth[m] > 0 ? '#f87171' : '#e5e7eb', borderRadius: '3px 3px 0 0', height: Math.max(4, (byMonth[m]/max)*80) + 'px' }} />
                        <span style={{ fontSize: '9px', color: '#9ca3af', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{m.slice(5)}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* 중증도 분포 */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
              <p style={{ fontWeight: 600, marginBottom: '12px', fontSize: '14px' }}>중증도 분포</p>
              {(() => {
                const bySev = {};
                items.forEach(it => { const s = it.severity || '미분류'; bySev[s] = (bySev[s]||0)+1; });
                const total = items.length || 1;
                const sevColors = { '사망': '#991b1b', '생명위협': '#dc2626', '심각한 부상': '#f97316', '입원': '#eab308', '의료처치필요': '#3b82f6', '경미': '#22c55e', '미분류': '#9ca3af' };
                return Object.entries(bySev).sort((a,b)=>b[1]-a[1]).map(([s,cnt]) => (
                  <div key={s} style={{ marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                      <span style={{ color: '#374151' }}>{s}</span>
                      <span style={{ color: '#6b7280' }}>{cnt}건 ({Math.round(cnt/total*100)}%)</span>
                    </div>
                    <div style={{ height: '6px', background: '#f3f4f6', borderRadius: '3px' }}>
                      <div style={{ height: '6px', background: sevColors[s]||'#6b7280', borderRadius: '3px', width: (cnt/total*100)+'%' }} />
                    </div>
                  </div>
                ));
              })()}
            </div>

          </div>
        </div>
      )}

  )
}
