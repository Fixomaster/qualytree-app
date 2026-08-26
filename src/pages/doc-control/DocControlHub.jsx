// src/pages/doc-control/DocControlHub.jsx
// ISO 13485 Â§4.2.3 ë¬¸ì ê´ë¦¬ + Â§4.2.4 ê¸°ë¡ ê´ë¦¬
import React, { useState, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Plus, Save, Edit2, Trash2, FileText, History,
  Users, BarChart2, AlertTriangle, CheckCircle2,
  Clock, Download, Eye, RotateCcw, Link2,
  BookOpen, ClipboardList, Archive,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'
import { companyDocs, DOC_CATEGORY } from '../../lib/companyState'
import { onboarding } from '../../lib/onboardingState'
import { fileStore } from '../../lib/fileStore'
import { commitChange, CHANGE_ACTIONS } from '../../lib/changeControl'
import { eid, ENTITY_TYPES } from '../../lib/entityRegistry'
import { Paperclip, X, Building2 } from 'lucide-react'

// ââ ìì âââââââââââââââââââââââââââââââââââââââââââââââââââââ
const LS_KEY_DOCS = 'qualytree.doc_register'

const DOC_TYPES = {
  QM:   { label: 'íì§ ë§¤ë´ì¼',   badge: 'QM',  color: '#7C3AED', bg: '#EDE9FE' },
  SOP:  { label: 'íì¤ììì ì°¨ì', badge: 'SOP', color: '#2563EB', bg: '#DBEAFE' },
  WI:   { label: 'ììì§ìì',    badge: 'WI',  color: '#0891B2', bg: '#CFFAFE' },
  FORM: { label: 'ìì',          badge: 'FM',  color: '#059669', bg: '#D1FAE5' },
  SPEC: { label: 'ì¬ìì',        badge: 'SP',  color: '#D97706', bg: '#FEF3C7' },
  PLAN: { label: 'ê³íì',        badge: 'PL',  color: '#DC2626', bg: '#FEE2E2' },
  REPT: { label: 'ë³´ê³ ì',        badge: 'RP',  color: '#9CA3AF', bg: '#F3F4F6' },
  OTHER:{ label: 'ê¸°í',          badge: 'OT',  color: '#6B7280', bg: '#F9FAFB' },
}

const DOC_STATUSES = {
  draft:       { label: 'ì´ì',    color: '#6366F1', bg: '#EEF2FF' },
  review:      { label: 'ê²í  ì¤', color: '#D97706', bg: '#FEF3C7' },
  approved:    { label: 'ì¹ì¸',    color: '#059669', bg: '#D1FAE5' },
  distributed: { label: 'ë°°í¬',    color: '#2563EB', bg: '#DBEAFE' },
  obsolete:    { label: 'íê¸°',    color: '#9CA3AF', bg: '#F3F4F6' },
}

const DEPT_CODES = ['SAL','MFG','PUR','QUA','EQP','DEV','DOC','MR','TRN','RA','AUD','IMP','ALL']

const RETENTION_PERIODS = ['1ë', '2ë', '3ë', '5ë', '7ë', '10ë', 'ìêµ¬ ë³´ì¡´']

const DOC_DEPTS = ['íì§ë¶(QUA)', 'ìì°ë¶(MFG)', 'ê°ë°ë¶(DEV)', 'ììë¶(SAL)', 'êµ¬ë§¤ë¶(PUR)', 'ì¤ë¹ë¶(EQP)', 'ë¬¸ìê´ë¦¬(DOC)', 'ê²½ìê²í (MR)', 'ì¸íê°(RA)', 'ì  ë¶ì']

function genDocId() { return `DOC-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }
function today() { return new Date().toISOString().slice(0, 10) }

const EMPTY_DOC = {
  docNo: '', title: '', type: 'SOP', status: 'draft',
  revision: 'Rev.0', issueDate: '', approvedDate: '', reviewDate: '',
  author: '', reviewer: '', approver: '',
  ownerDept: 'íì§ë¶(QUA)',
  distributionList: [],
  retentionPeriod: '3ë',
  relatedStandard: '',   // e.g. ISO 13485 Â§7.5.3
  linkedHubId: '',
  supersededBy: '', supersedes: '',
  scope: '', purpose: '',
  revisionHistory: [],
  notes: '',
}

// ââ íì¬Â·ì¸ì¦ìë¥ í¨ë (KGMP Â§6 â íì¬ ê¸°ë³¸ì ë³´ + ì¸íê° ì ì¶ì© íì¬ ìë¥) ââââââ
// ì¤ì  ìë ¥Â·ìì ì ì¬ì´ëë©ë´ "ê¸°ë³¸ì ë³´"(/company) í ê³³ììë§ ì´ë¤ì§ëë¡ íê³ ,
// ì¬ê¸°ìë ê°ì ë°ì´í°(onboarding.company / companyDocs)ë¥¼ ì½ê¸° ì ì©ì¼ë¡ ë³´ì¬ì£¼ê¸°ë§ íë¤.
// (ì¤ë³µ ìë ¥ íë©´ì ìì  ë°ì´í° ë¶ì¼ì¹ë¥¼ ìì²ì ì¼ë¡ ë°©ì§)
function InfoField({ label, value }) {
  return (
    <div>
      <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{label}</div>
      <div className="text-[13px] mt-0.5" style={{ color: value ? 'var(--ink)' : 'var(--ink-faint)' }}>{value || 'ë¯¸ìë ¥'}</div>
    </div>
  )
}

function CompanyDocsPanel() {
  const navigate = useNavigate()
  const company = onboarding.load().company || {}
  const docs = companyDocs.load().documents || []
  const allCategories = Object.values(DOC_CATEGORY)
  const registeredCount = allCategories.filter((cat) => docs.some((d) => d.category === cat)).length
  const profileDone = !!(company.name && company.bizNumber && company.ceo)

  return (
    <div className="max-w-3xl">
      <div className="rounded-2xl p-4 mb-4" style={{ border: '1px solid var(--line)', background: 'var(--bg-card)' }}>
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <Building2 size={16} style={{ color: 'var(--moss)' }} />
            <div className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>íì¬ ê¸°ë³¸ ì ë³´</div>
          </div>
          <button type="button" onClick={() => navigate('/company')} className="text-[11.5px] font-medium shrink-0" style={{ color: 'var(--moss)' }}>
            ê¸°ë³¸ì ë³´ìì ìì  â
          </button>
        </div>
        <div className="text-[11px] mb-3" style={{ color: 'var(--ink-faint)' }}>
          íì¬ ê¸°ë³¸ì ë³´ì ì¸ì¦Â·íê° ìë¥ë ì¬ì´ëë©ë´ "ê¸°ë³¸ì ë³´"ìì í ê³³ì ìë ¥Â·ê´ë¦¬í©ëë¤. ì¬ê¸°ìë ìµì  ë±ë¡ íí©ë§ íì¸í©ëë¤.
        </div>
        <div className="grid grid-cols-2 gap-3">
          <InfoField label="íì¬ëª" value={company.name} />
          <InfoField label="ì¬ììë±ë¡ë²í¸" value={company.bizNumber} />
          <InfoField label="ëíì" value={company.ceo} />
          <InfoField label="íì§ì±ìì" value={company.qmRep} />
        </div>
        {!profileDone && (
          <div className="mt-3 text-[11.5px] px-2.5 py-1.5 rounded-lg" style={{ background: 'var(--amber-soft)', color: 'var(--amber)' }}>
            íì¬ ê¸°ë³¸ì ë³´ê° ìì§ ìë ¥ëì§ ìììµëë¤. "ê¸°ë³¸ì ë³´"ìì ìë ¥í´ ì£¼ì¸ì.
          </div>
        )}
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--line)', background: 'var(--bg-soft)' }}>
          <span className="text-[12px] font-medium" style={{ color: 'var(--ink-mute)' }}>ì¸ì¦Â·íê° ìë¥ ë±ë¡ íí©</span>
          <span className="text-[11px] font-mono" style={{ color: 'var(--ink-faint)' }}>{registeredCount} / {allCategories.length}</span>
        </div>
        {allCategories.map((category, i) => {
          const doc = docs.find((d) => d.category === category)
          return (
            <div
              key={category}
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderTop: i === 0 ? 'none' : '1px solid var(--line)', background: 'var(--bg-card)' }}
            >
              <span className="text-[12.5px] font-medium flex-1 min-w-0" style={{ color: 'var(--ink)' }}>{category}</span>
              {doc?.fileId ? (
                <span className="text-[11.5px] truncate max-w-[220px]" style={{ color: 'var(--moss)' }}>{doc.fileName || 'ì²¨ë¶ë¨'}</span>
              ) : doc ? (
                <span className="text-[11.5px]" style={{ color: 'var(--amber)' }}>ë±ë¡ë¨ Â· ì²¨ë¶ ìì</span>
              ) : (
                <span className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>ë¯¸ë±ë¡</span>
              )}
            </div>
          )
        })}
      </div>
      <button type="button" onClick={() => navigate('/company?tab=docs')} className="mt-3 text-[12px] font-medium" style={{ color: 'var(--moss)' }}>
        ê¸°ë³¸ì ë³´ íì¬ë¬¸ìí¨ìì ë±ë¡Â·ìì íê¸° â
      </button>
    </div>
  )
}

// ââ ë©ì¸ âââââââââââââââââââââââââââââââââââââââââââââââââââââ
export default function DocControlHub() {
  const user = auth.current()
  const canEdit = user?.level >= 2
  const [searchParams] = useSearchParams()

  const [docs, setDocs] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY_DOCS) || '[]') } catch { return [] }
  })

  const [tab, setTab] = useState(() => searchParams.get('tab') || 'docs')    // company | docs | records | analysis
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_DOC)
  const [editId, setEditId] = useState(null)
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterDept, setFilterDept] = useState('all')
  const [searchQ, setSearchQ] = useState(() => searchParams.get('openName') || '')
  const [showDetail, setShowDetail] = useState(null)

  function saveDocs(list) { setDocs(list); localStorage.setItem(LS_KEY_DOCS, JSON.stringify(list)) }

  function submitDoc() {
    if (!form.title.trim()) return alert('ë¬¸ì ì ëª©ì ìë ¥íì¸ì.')
    if (!form.docNo.trim()) return alert('ë¬¸ì ë²í¸ë¥¼ ìë ¥íì¸ì.')
    const isEdit = !!editId
    if (isEdit) {
      const before = docs.find(d => d.id === editId) || null
      const after = { ...before, ...form }
      saveDocs(docs.map(d => d.id === editId ? after : d))
      commitChange({
        targetEid: eid(ENTITY_TYPES.DOCUMENT, editId),
        action: CHANGE_ACTIONS.UPDATE,
        before, after,
        reason: 'ë¬¸ì ì ë³´ ìì ',
      })
    } else {
      const rec = { id: genDocId(), createdAt: today(), revisionHistory: [], ...form }
      saveDocs([rec, ...docs])
      commitChange({
        targetEid: eid(ENTITY_TYPES.DOCUMENT, rec.id),
        action: CHANGE_ACTIONS.CREATE,
        before: null, after: rec,
        reason: 'ì ê· ë¬¸ì ë±ë¡',
      })
    }
    setShowForm(false); setForm(EMPTY_DOC); setEditId(null)
  }

  function deleteDoc(id) {
    if (!confirm('ë¬¸ìë¥¼ ì­ì íìê² ìµëê¹?')) return
    saveDocs(docs.filter(d => d.id !== id))
    if (showDetail === id) setShowDetail(null)
  }

  function quickDocStatus(id, status) {
    const before = docs.find(d => d.id === id) || null
    const upd = { status }
    if (status === 'approved') upd.approvedDate = today()
    if (status === 'distributed') upd.issueDate = today()
    const after = before ? { ...before, ...upd } : null
    saveDocs(docs.map(d => d.id === id ? { ...d, ...upd } : d))
    if (before) {
      commitChange({
        targetEid: eid(ENTITY_TYPES.DOCUMENT, id),
        action: CHANGE_ACTIONS.UPDATE,
        before, after,
        reason: `ë¬¸ì ìí ë³ê²½ (${DOC_STATUSES[status]?.label || status})`,
      })
    }
  }

  function addRevision(docId, revNote) {
    if (!revNote.trim()) return
    const entry = { rev: form.revision || 'Rev.?', date: today(), note: revNote, by: user?.name || '' }
    saveDocs(docs.map(d => {
      if (d.id !== docId) return d
      return { ...d, revisionHistory: [...(d.revisionHistory || []), entry] }
    }))
  }

  // íí°ë§
  const filteredDocs = useMemo(() => docs.filter(d => {
    if (filterType !== 'all' && d.type !== filterType) return false
    if (filterStatus !== 'all' && d.status !== filterStatus) return false
    if (filterDept !== 'all' && d.ownerDept !== filterDept) return false
    if (searchQ && !(d.title.toLowerCase().includes(searchQ.toLowerCase()) || d.docNo.toLowerCase().includes(searchQ.toLowerCase()))) return false
    return true
  }), [docs, filterType, filterStatus, filterDept, searchQ])

  // ë¬¸ì ì í ì°ì ìì: ë§¤ë´ì¼ â ì ì°¨ì â ììì§ìì â ìì ìì¼ë¡ íì (ISO 13485 Â§4.2.3 ë¬¸ì ì²´ê³)
  const TYPE_ORDER = Object.keys(DOC_TYPES)
  const sortedDocs = useMemo(() => {
    return [...filteredDocs].sort((a, b) => {
      const ai = TYPE_ORDER.indexOf(a.type), bi = TYPE_ORDER.indexOf(b.type)
      if (ai !== bi) return ai - bi
      return (a.docNo || '').localeCompare(b.docNo || '')
    })
  }, [filteredDocs])

  // ë¶ì ë°ì´í°
  const analysis = useMemo(() => {
    const byType = {}
    Object.keys(DOC_TYPES).forEach(k => { byType[k] = docs.filter(d => d.type === k).length })
    const byStatus = {}
    Object.keys(DOC_STATUSES).forEach(k => { byStatus[k] = docs.filter(d => d.status === k).length })
    const pendingReview = docs.filter(d => {
      if (!d.reviewDate || d.status === 'obsolete') return false
      return new Date(d.reviewDate) <= new Date()
    })
    const draftDocs = docs.filter(d => d.status === 'draft' || d.status === 'review')
    return { byType, byStatus, pendingReview, draftDocs }
  }, [docs])

  const detailDoc = docs.find(d => d.id === showDetail)

  return (
    <AppLayout user={user} title="ë¬¸ì ê´ë¦¬" subtitle="ISO 13485 Â§4.2.3 ë¬¸ì ê´ë¦¬ / Â§4.2.4 ê¸°ë¡ ê´ë¦¬">
      <div className="px-6 lg:px-8 py-6 max-w-[1400px] mx-auto">

        {/* í­ */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-soft)' }}>
          {[
            { key: 'company',  label: 'íì¬Â·ì¸ì¦ìë¥' },
            { key: 'docs',     label: `ë¬¸ì ëì¥ (${docs.length})` },
            { key: 'analysis', label: 'íí© ë¶ì' },
{ key: 'quality-manual', label: 'íì§ë§¤ë´ì¼' },
{ key: 'medical-device-file', label: 'ìë£ê¸°ê¸°íì¼' },
          ].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setShowDetail(null) }}
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

        {/* ââ íì¬Â·ì¸ì¦ìë¥ ââ */}
        {tab === 'company' && <CompanyDocsPanel />}

        {/* ââ ë¬¸ì ëì¥ ââ */}
        {tab === 'docs' && !detailDoc && (
          <div>
            {/* #309: ì ì°¨ìÂ·ë§¤ë´ì¼ ë± ì ì QMS ë¬¸ìë AI ìëìì± ë°©ìì íì§ë¬¸ì(Documents.jsx)ìì
                ìì±Â·ìì í©ëë¤. ì´ ë¬¸ìëì¥ì ê·¸ ì¸ ì¸ì¦ìÂ·ì¸ë¶ë¬¸ì ë±ì ë±ë¡Â·ì´ë ¥ ê´ë¦¬ì©ìëë¤. */}
            <div className="mb-4 p-3.5 rounded-xl flex items-center justify-between gap-3 flex-wrap"
              style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
              <div className="text-[12.5px]" style={{ color: '#1E40AF' }}>
                <strong>ì ì°¨ìÂ·ë§¤ë´ì¼ ë± ì ì QMS ë¬¸ì</strong>ë AIê° ìëì¼ë¡ ìì±Â·ìì íë <strong>íì§ë¬¸ì</strong>ìì ê´ë¦¬ë©ëë¤.
                ì´ ë¬¸ìëì¥ì ì¸ì¦ìÂ·ì¸ë¶ë¬¸ì ë± ê·¸ ì¸ ë¬¸ìì ë±ë¡Â·ì´ë ¥ ê´ë¦¬ì©ìëë¤.
              </div>
              <button onClick={() => navigate('/documents')}
                className="shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-bold"
                style={{ background: '#2563EB', color: '#fff', border: 'none', cursor: 'pointer' }}>
                íì§ë¬¸ì(AI ìëìì±)ë¡ ì´ë â
              </button>
            </div>
            {/* ê²ìÂ·íí° */}
            <div className="flex flex-wrap gap-2 mb-4 items-center">
              <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="ë¬¸ìë²í¸Â·ì ëª© ê²ì..."
                className="px-3 py-1.5 rounded-xl text-[13px] flex-1 min-w-[160px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-[13px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                <option value="all">ì ì²´ ì í</option>
                {Object.entries(DOC_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-[13px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                <option value="all">ì ì²´ ìí</option>
                {Object.entries(DOC_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              {canEdit && (
                <button onClick={() => { setForm(EMPTY_DOC); setEditId(null); setShowForm(true) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold ml-auto"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} /> ë¬¸ì ë±ë¡
                </button>
              )}
            </div>

            {showForm && (
              <DocForm form={form} setForm={setForm} onSave={submitDoc}
                onCancel={() => { setShowForm(false); setForm(EMPTY_DOC); setEditId(null) }}
                isEdit={!!editId} />
            )}

            {/* ê²í  ê¸°í ê²½ë³´ */}
            {analysis.pendingReview.length > 0 && (
              <div className="mb-4 p-3 rounded-xl flex items-center gap-2 text-[12.5px] flex-wrap"
                style={{ background: '#FEF3C7', border: '1px solid #FDE68A', color: '#92400E' }}>
                <AlertTriangle size={14} />
                ì ê¸° ê²í  ê¸°í ëë: {analysis.pendingReview.map(d => (
                  <span key={d.id} className="font-bold cursor-pointer underline mx-1" onClick={() => setShowDetail(d.id)}>{d.docNo}</span>
                ))}
              </div>
            )}

            {/* ë¬¸ì ëª©ë¡ íì´ë¸ */}
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr style={{ background: 'var(--bg-soft)' }}>
                    {['ë¬¸ìë²í¸', 'ì í', 'ì ëª©', 'ê°ì ', 'ìí', 'ìì± ë¶ì', 'ì¹ì¸ì¼', 'ê²í  ìì ì¼', ''].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--ink-soft)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedDocs.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-12" style={{ color: 'var(--ink-faint)' }}>ë±ë¡ë ë¬¸ìê° ììµëë¤.</td></tr>
                  ) : sortedDocs.map((doc, i) => {
                    const tp = DOC_TYPES[doc.type] || DOC_TYPES.OTHER
                    const st = DOC_STATUSES[doc.status] || DOC_STATUSES.draft
                    const reviewOverdue = doc.reviewDate && new Date(doc.reviewDate) <= new Date() && doc.status !== 'obsolete'
                    return (
                      <tr key={doc.id} className="transition cursor-pointer"
                        style={{ background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-soft)', borderTop: '1px solid var(--line)' }}
                        onClick={() => setShowDetail(doc.id)}>
                        <td className="px-3 py-2 font-mono font-semibold" style={{ color: 'var(--moss)' }}>{doc.docNo}</td>
                        <td className="px-3 py-2">
                          <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: tp.bg, color: tp.color }}>{tp.badge}</span>
                        </td>
                        <td className="px-3 py-2 font-semibold" style={{ color: 'var(--ink)' }}>{doc.title}</td>
                        <td className="px-3 py-2 font-mono text-[11.5px]" style={{ color: 'var(--ink-soft)' }}>{doc.revision}</td>
                        <td className="px-3 py-2">
                          <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                        </td>
                        <td className="px-3 py-2" style={{ color: 'var(--ink-soft)' }}>{doc.ownerDept}</td>
                        <td className="px-3 py-2" style={{ color: 'var(--ink-soft)' }}>{doc.approvedDate || '-'}</td>
                        <td className="px-3 py-2" style={{ color: reviewOverdue ? '#DC2626' : 'var(--ink-soft)', fontWeight: reviewOverdue ? 700 : 400 }}>
                          {doc.reviewDate || '-'}{reviewOverdue && ' â '}
                        </td>
                        <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                          {canEdit && (
                            <div className="flex gap-1">
                              {doc.status === 'draft' && <QuickBtn label="ê²í " color="#D97706" onClick={() => quickDocStatus(doc.id, 'review')} />}
                              {doc.status === 'review' && <QuickBtn label="ì¹ì¸" color="#059669" onClick={() => quickDocStatus(doc.id, 'approved')} />}
                              {doc.status === 'approved' && <QuickBtn label="ë°°í¬" color="#2563EB" onClick={() => quickDocStatus(doc.id, 'distributed')} />}
                              {doc.status !== 'obsolete' && <QuickBtn label="íê¸°" color="#9CA3AF" onClick={() => quickDocStatus(doc.id, 'obsolete')} />}
                              <button onClick={() => { setForm({ ...EMPTY_DOC, ...doc }); setEditId(doc.id); setShowForm(true) }}
                                className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                                <Edit2 size={11} style={{ color: 'var(--ink-soft)' }} />
                              </button>
                              <button onClick={() => deleteDoc(doc.id)}
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

        {/* ââ ë¬¸ì ìì¸ ââ */}
        {tab === 'docs' && detailDoc && (
          <DocDetail doc={detailDoc} canEdit={canEdit}
            onBack={() => setShowDetail(null)} onEdit={() => { setForm({ ...EMPTY_DOC, ...detailDoc }); setEditId(detailDoc.id); setShowForm(true); setShowDetail(null) }}
            onDelete={() => deleteDoc(detailDoc.id)} />
        )}

        {/* ââ ë¶ì í­ ââ */}
        {tab === 'analysis' && (
          <AnalysisView analysis={analysis} docs={docs} setShowDetail={setShowDetail} setTab={setTab} />
        )}

{tab === 'quality-manual' && <QualityManualTab />}
{tab === 'medical-device-file' && <MedicalDeviceFileTab />}
      </div>
    </AppLayout>
  )
}

// ââ ë¬¸ì ìì¸ ë·° âââââââââââââââââââââââââââââââââââââââââââââ
function DocDetail({ doc, canEdit, onBack, onEdit, onDelete }) {
  const tp = DOC_TYPES[doc.type] || DOC_TYPES.OTHER
  const st = DOC_STATUSES[doc.status] || DOC_STATUSES.draft

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 mb-4 text-[13px]"
        style={{ background: 'none', border: 'none', color: 'var(--moss)', cursor: 'pointer' }}>
        â ëª©ë¡ì¼ë¡
      </button>

      <div className="p-5 rounded-2xl mb-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: tp.bg, color: tp.color }}>{tp.label}</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
              <span className="text-[11px] font-mono" style={{ color: 'var(--ink-faint)' }}>{doc.revision}</span>
            </div>
            <div className="text-[11px] font-mono font-bold" style={{ color: 'var(--moss)' }}>{doc.docNo}</div>
            <div className="text-[20px] font-bold" style={{ color: 'var(--ink)' }}>{doc.title}</div>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <button onClick={onEdit} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12px]"
                style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
                <Edit2 size={12} /> ìì 
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'ìì±ì', value: doc.author || '-' },
            { label: 'ê²í ì', value: doc.reviewer || '-' },
            { label: 'ì¹ì¸ì', value: doc.approver || '-' },
            { label: 'ê´ë¦¬ ë¶ì', value: doc.ownerDept },
            { label: 'ë°íì¼', value: doc.issueDate || '-' },
            { label: 'ì¹ì¸ì¼', value: doc.approvedDate || '-' },
            { label: 'ì ê¸°ê²í ì¼', value: doc.reviewDate || '-' },
            { label: 'ë³´ì¡´ ê¸°ê°', value: doc.retentionPeriod },
          ].map(({ label, value }) => (
            <div key={label} className="p-2 rounded-xl" style={{ background: 'var(--bg-soft)' }}>
              <div className="text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>{label}</div>
              <div className="text-[12.5px] font-semibold" style={{ color: 'var(--ink)' }}>{value}</div>
            </div>
          ))}
        </div>

        {doc.relatedStandard && (
          <div className="mb-3 p-2.5 rounded-xl text-[12px]" style={{ background: '#EFF6FF', color: '#1E40AF' }}>
            <span className="font-bold">ê´ë ¨ ê·ê²©: </span>{doc.relatedStandard}
          </div>
        )}
        {doc.scope && (
          <div className="mb-2 p-2.5 rounded-xl text-[12.5px]" style={{ background: 'var(--bg-soft)' }}>
            <span className="font-bold" style={{ color: 'var(--ink)' }}>ì ì© ë²ì: </span>
            <span style={{ color: 'var(--ink-soft)' }}>{doc.scope}</span>
          </div>
        )}
        {doc.purpose && (
          <div className="mb-2 p-2.5 rounded-xl text-[12.5px]" style={{ background: 'var(--bg-soft)' }}>
            <span className="font-bold" style={{ color: 'var(--ink)' }}>ëª©ì : </span>
            <span style={{ color: 'var(--ink-soft)' }}>{doc.purpose}</span>
          </div>
        )}

        {/* ë°°í¬ ëª©ë¡ */}
        {doc.distributionList && doc.distributionList.length > 0 && (
          <div className="mb-2">
            <div className="text-[12px] font-bold mb-1.5" style={{ color: 'var(--ink)' }}>ë°°í¬ ëª©ë¡</div>
            <div className="flex flex-wrap gap-1.5">
              {doc.distributionList.map(d => (
                <span key={d} className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: '#DBEAFE', color: '#1E40AF' }}>{d}</span>
              ))}
            </div>
          </div>
        )}

        {(doc.supersedes || doc.supersededBy) && (
          <div className="flex gap-4 mt-2 text-[12px]" style={{ color: 'var(--ink-faint)' }}>
            {doc.supersedes && <span>ëì²´ ë¬¸ì: <strong style={{ color: 'var(--ink)' }}>{doc.supersedes}</strong></span>}
            {doc.supersededBy && <span>ëì²´ë¨: <strong style={{ color: '#DC2626' }}>{doc.supersededBy}</strong></span>}
          </div>
        )}
      </div>

      {/* ê°ì  ì´ë ¥ */}
      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="text-[13px] font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--ink)' }}>
          <History size={14} /> ê°ì  ì´ë ¥ ({(doc.revisionHistory || []).length}ê±´)
        </div>
        {(doc.revisionHistory || []).length === 0 ? (
          <div className="text-center py-6 text-[13px]" style={{ color: 'var(--ink-faint)' }}>ê°ì  ì´ë ¥ ìì</div>
        ) : (
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: 'var(--bg-soft)' }}>
                {['ê°ì  ë²í¸', 'ì¼ì', 'ë´ë¹ì', 'ê°ì  ë´ì©'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--ink-soft)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...(doc.revisionHistory || [])].reverse().map((r, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--line)' }}>
                  <td className="px-3 py-2 font-mono font-bold" style={{ color: 'var(--moss)' }}>{r.rev}</td>
                  <td className="px-3 py-2" style={{ color: 'var(--ink-soft)' }}>{r.date}</td>
                  <td className="px-3 py-2" style={{ color: 'var(--ink-soft)' }}>{r.by || '-'}</td>
                  <td className="px-3 py-2" style={{ color: 'var(--ink)' }}>{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ââ ë¶ì âââââââââââââââââââââââââââââââââââââââââââââââââââââ
function AnalysisView({ analysis, docs, setShowDetail, setTab }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(DOC_STATUSES).map(([k, v]) => (
          <div key={k} className="p-4 rounded-2xl text-center" style={{ background: v.bg, border: `1px solid ${v.color}40` }}>
            <div className="text-[26px] font-bold" style={{ color: v.color }}>{analysis.byStatus[k] || 0}</div>
            <div className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>{v.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(DOC_TYPES).slice(0, 4).map(([k, v]) => (
          <div key={k} className="p-4 rounded-2xl text-center" style={{ background: v.bg, border: `1px solid ${v.color}30` }}>
            <div className="text-[24px] font-bold" style={{ color: v.color }}>{analysis.byType[k] || 0}</div>
            <div className="text-[11.5px]" style={{ color: 'var(--ink-soft)' }}>{v.label}</div>
          </div>
        ))}
      </div>

      {analysis.pendingReview.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <div className="text-[13px] font-bold mb-3" style={{ color: '#92400E' }}>â° ì ê¸° ê²í  ê¸°í ëë ({analysis.pendingReview.length}ê±´)</div>
          <div className="space-y-1.5">
            {analysis.pendingReview.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-2.5 rounded-xl cursor-pointer"
                style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}
                onClick={() => { setTab('docs'); setShowDetail(doc.id) }}>
                <div>
                  <span className="font-mono font-bold text-[11.5px]" style={{ color: '#78350F' }}>{doc.docNo}</span>
                  <span className="ml-2 text-[12px]" style={{ color: '#92400E' }}>{doc.title}</span>
                </div>
                <span className="text-[11px]" style={{ color: '#D97706' }}>ê²í ì¼: {doc.reviewDate}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>ë¬¸ì ì íë³ íí©</div>
          {Object.entries(DOC_TYPES).map(([k, v]) => (
            <div key={k} className="flex items-center gap-3 mb-1.5">
              <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full w-10 text-center" style={{ background: v.bg, color: v.color }}>{v.badge}</span>
              <span className="text-[12px] flex-1" style={{ color: 'var(--ink-soft)' }}>{v.label}</span>
              <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--bg-soft)' }}>
                <div className="h-2 rounded-full" style={{ width: `${docs.length ? ((analysis.byType[k] || 0) / docs.length) * 100 : 0}%`, background: v.color }} />
              </div>
              <span className="text-[12px] font-bold w-5 text-right" style={{ color: v.color }}>{analysis.byType[k] || 0}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}

// ââ í¼ âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function DocForm({ form, setForm, onSave, onCancel, isEdit }) {
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleDist = (dept) => {
    const list = form.distributionList || []
    F('distributionList', list.includes(dept) ? list.filter(d => d !== dept) : [...list, dept])
  }
  return (
    <div className="mb-6 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>{isEdit ? 'ë¬¸ì ìì ' : 'ë¬¸ì ë±ë¡'}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <Field label="ë¬¸ì ë²í¸ *" value={form.docNo} onChange={v => F('docNo', v)} placeholder="QUA-SOP-001" />
        <Field label="ì ëª© *" value={form.title} onChange={v => F('title', v)} />
        <FieldSelect label="ì í" value={form.type} onChange={v => F('type', v)}
          options={Object.entries(DOC_TYPES).map(([k, v]) => ({ value: k, label: v.label }))} />
        <FieldSelect label="ìí" value={form.status} onChange={v => F('status', v)}
          options={Object.entries(DOC_STATUSES).map(([k, v]) => ({ value: k, label: v.label }))} />
        <Field label="ê°ì  ë²í¸" value={form.revision} onChange={v => F('revision', v)} placeholder="Rev.0" />
        <FieldSelect label="ê´ë¦¬ ë¶ì" value={form.ownerDept} onChange={v => F('ownerDept', v)}
          options={DOC_DEPTS.map(d => ({ value: d, label: d }))} />
        <Field label="ìì±ì" value={form.author} onChange={v => F('author', v)} />
        <Field label="ê²í ì" value={form.reviewer} onChange={v => F('reviewer', v)} />
        <Field label="ì¹ì¸ì" value={form.approver} onChange={v => F('approver', v)} />
        <Field label="ë°íì¼" type="date" value={form.issueDate} onChange={v => F('issueDate', v)} />
        <Field label="ì¹ì¸ì¼" type="date" value={form.approvedDate} onChange={v => F('approvedDate', v)} />
        <Field label="ì ê¸° ê²í  ìì ì¼" type="date" value={form.reviewDate} onChange={v => F('reviewDate', v)} />
        <FieldSelect label="ë³´ì¡´ ê¸°ê°" value={form.retentionPeriod} onChange={v => F('retentionPeriod', v)}
          options={RETENTION_PERIODS.map(r => ({ value: r, label: r }))} />
        <Field label="ê´ë ¨ ê·ê²© (e.g. ISO 13485 Â§7.5)" value={form.relatedStandard} onChange={v => F('relatedStandard', v)} />
        <Field label="ëì²´ ë¬¸ì ë²í¸" value={form.supersedes} onChange={v => F('supersedes', v)} placeholder="ì´ì  ë¬¸ì ë²í¸" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <FieldArea label="ëª©ì " value={form.purpose} onChange={v => F('purpose', v)} rows={2} />
        <FieldArea label="ì ì© ë²ì" value={form.scope} onChange={v => F('scope', v)} rows={2} />
        <FieldArea label="ë¹ê³ " value={form.notes} onChange={v => F('notes', v)} rows={2} />
      </div>
      {/* ë°°í¬ ëª©ë¡ */}
      <div className="mb-4">
        <div className="text-[11.5px] font-semibold mb-2" style={{ color: 'var(--ink-soft)' }}>ë°°í¬ ëª©ë¡ (ë¤ì¤ ì í)</div>
        <div className="flex flex-wrap gap-1.5">
          {DOC_DEPTS.map(dept => {
            const sel = (form.distributionList || []).includes(dept)
            return (
              <button key={dept} onClick={() => toggleDist(dept)}
                className="px-2.5 py-1 rounded-xl text-[11px] font-semibold"
                style={{ background: sel ? 'var(--moss)' : 'var(--bg-soft)', color: sel ? '#fff' : 'var(--ink-soft)', border: `1px solid ${sel ? 'var(--moss)' : 'var(--line)'}`, cursor: 'pointer' }}>
                {dept}
              </button>
            )
          })}
        </div>
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

// ââ ê³µíµ âââââââââââââââââââââââââââââââââââââââââââââââââââââ
function QuickBtn({ label, color, onClick }) {
  return (
    <button onClick={onClick} className="px-2 py-0.5 rounded text-[10.5px] font-bold"
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

// ââ íì§ë§¤ë´ì¼ í­ (ISO 13485 Â§4.2.1) ââââââââââââââââââââââââ
function QualityManualTab() {
  const navigate = useNavigate()
  const LS_KEY = 'qualytree.quality_manual'
  const [sections, setSections] = React.useState(() => {
    try { const _p = JSON.parse(localStorage.getItem(LS_KEY) || '[]'); return Array.isArray(_p) ? _p : [] } catch { return [] }
  })
  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[15px] font-bold" style={{ color: 'var(--ink)' }}>íì§ ë§¤ë´ì¼</div>
          <div className="text-[12px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>ISO 13485 Â§4.2.1 â íì§ê²½ììì¤í ë¬¸ìí</div>
        </div>
        <button onClick={() => navigate('/quality-manual')}
          className="px-4 py-2 rounded-xl text-[13px] font-bold"
          style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
          ì ì²´ ê´ë¦¬ â
        </button>
      </div>
      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        {sections.length === 0 ? (
          <div className="text-center py-8 text-[13px]" style={{ color: 'var(--ink-faint)' }}>
            <BookOpen size={28} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
            <div>ë±ë¡ë íì§ ë§¤ë´ì¼ ì¹ìì´ ììµëë¤.</div>
            <button onClick={() => navigate('/quality-manual')}
              className="mt-3 text-[12px] font-medium"
              style={{ background: 'none', border: 'none', color: 'var(--moss)', cursor: 'pointer' }}>
              íì§ë§¤ë´ì¼ ê´ë¦¬ìì ë±ë¡íê¸° â
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {sections.map((s, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
                <span className="text-[12px] font-mono font-bold" style={{ color: 'var(--moss)' }}>{s.no || s.sectionNo || (i+1)}</span>
                <span className="text-[13px] font-semibold flex-1" style={{ color: 'var(--ink)' }}>{s.title}</span>
                {s.status && <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: '#D1FAE5', color: '#065F46' }}>{s.status}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ââ ìë£ê¸°ê¸°íì¼ í­ (ISO 13485 Â§4.2.3) â ì´ë ì ì© ââââââââââ
function MedicalDeviceFileTab() {
  const navigate = useNavigate()
  const LS_KEY = 'qualytree.medical_device_file'
  const [files, setFiles] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
  })
  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold" style={{ color: 'var(--ink)' }}>ìë£ê¸°ê¸° íì¼</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#DBEAFE', color: '#1E40AF' }}>ì´ë ì ì©</span>
          </div>
          <div className="text-[12px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>ISO 13485 Â§4.2.3 â ìë£ê¸°ê¸°ë³ ê·ì  ë¬¸ì</div>
        </div>
        <button onClick={() => navigate('/medical-device-file')}
          className="px-4 py-2 rounded-xl text-[13px] font-bold"
          style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
          ìì¸ ê´ë¦¬ â
        </button>
      </div>
      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        {files.length === 0 ? (
          <div className="text-center py-8 text-[13px]" style={{ color: 'var(--ink-faint)' }}>
            <Archive size={28} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
            <div>ë±ë¡ë ìë£ê¸°ê¸° íì¼ì´ ììµëë¤.</div>
            <button onClick={() => navigate('/medical-device-file')}
              className="mt-3 text-[12px] font-medium"
              style={{ background: 'none', border: 'none', color: 'var(--moss)', cursor: 'pointer' }}>
              ìë£ê¸°ê¸°íì¼ ê´ë¦¬ìì ë±ë¡íê¸° â
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
                <span className="text-[12px] font-mono font-bold" style={{ color: 'var(--moss)' }}>{f.no || f.deviceNo || (i+1)}</span>
                <span className="text-[13px] font-semibold flex-1" style={{ color: 'var(--ink)' }}>{f.title || f.deviceName}</span>
                <Eye size={13} style={{ color: 'var(--ink-faint)' }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
