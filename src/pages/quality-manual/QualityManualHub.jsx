// src/pages/quality-manual/QualityManualHub.jsx
// ISO 13485 Â§4.2.1 â íì§ ë§¤ë´ì¼
import React, { useState, useMemo } from 'react'
import {
  Save, Edit2, Plus, Trash2, BookOpen, FileText,
  CheckCircle2, AlertTriangle, GitBranch, Users,
  RefreshCw, ChevronDown, ChevronRight, Download,
  Star, Layers, ArrowRight,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'

// ââ ìì âââââââââââââââââââââââââââââââââââââââââââââââââââââ
const LS_KEY = 'qualytree.quality_manual'

// ISO 13485:2016 ì¡°í­ë³ íë¡ì¸ì¤ ëª©ë¡ (Â§4.2.1(c) ì°¸ì¡° íì)
const ISO_SECTIONS = [
  { clause: '4',     title: 'íì§ê²½ììì¤í ì¼ë° ìêµ¬ì¬í­' },
  { clause: '4.1',   title: 'ì¼ë° ìêµ¬ì¬í­ (QMS ìë¦½Â·ì ì§Â·ê°ì )' },
  { clause: '4.2',   title: 'ë¬¸ìí ìêµ¬ì¬í­' },
  { clause: '4.2.1', title: 'ì¼ë° (ë¬¸ìíë QMS)' },
  { clause: '4.2.2', title: 'íì§ ë§¤ë´ì¼' },
  { clause: '4.2.3', title: 'ìë£ê¸°ê¸° íì¼' },
  { clause: '4.2.4', title: 'ë¬¸ì ê´ë¦¬' },
  { clause: '4.2.5', title: 'ê¸°ë¡ ê´ë¦¬' },
  { clause: '5',     title: 'ê²½ìì ì±ì' },
  { clause: '5.1',   title: 'ê²½ì ìì§' },
  { clause: '5.2',   title: 'ê³ ê° ì¤ì' },
  { clause: '5.3',   title: 'íì§ ë°©ì¹¨' },
  { clause: '5.4',   title: 'ê¸°í' },
  { clause: '5.5',   title: 'ì±ìÂ·ê¶íÂ·ìì¬ìíµ' },
  { clause: '5.6',   title: 'ê²½ì ê²í ' },
  { clause: '6',     title: 'ìì ê´ë¦¬' },
  { clause: '6.1',   title: 'ìì íë³´' },
  { clause: '6.2',   title: 'ì¸ì  ìì' },
  { clause: '6.3',   title: 'ì¸íë¼' },
  { clause: '6.4',   title: 'ìì íê²½' },
  { clause: '7',     title: 'ì í ì¤í' },
  { clause: '7.1',   title: 'ì í ì¤í ê¸°í' },
  { clause: '7.2',   title: 'ê³ ê° ê´ë ¨ íë¡ì¸ì¤' },
  { clause: '7.3',   title: 'ì¤ê³ ë° ê°ë°' },
  { clause: '7.4',   title: 'êµ¬ë§¤' },
  { clause: '7.5',   title: 'ìì° ë° ìë¹ì¤ ì ê³µ' },
  { clause: '7.6',   title: 'ëª¨ëí°ë§Â·ì¸¡ì  ì¥ë¹ ê´ë¦¬' },
  { clause: '8',     title: 'ì¸¡ì Â·ë¶ìÂ·ê°ì ' },
  { clause: '8.1',   title: 'ì¼ë° (ëª¨ëí°ë§Â·ì¸¡ì Â·ë¶ìÂ·ê°ì  ê¸°í)' },
  { clause: '8.2',   title: 'ëª¨ëí°ë§ ë° ì¸¡ì ' },
  { clause: '8.3',   title: 'ë¶ì í© ì í ê´ë¦¬' },
  { clause: '8.4',   title: 'ë°ì´í° ë¶ì' },
  { clause: '8.5',   title: 'ê°ì ' },
]

// Qualytree ë´ êµ¬í íë¸ ë§¤í
const QUALYTREE_HUBS = [
  { path: '/quality-objectives',     label: 'íì§ ëª©í ê´ë¦¬',     clause: '5.4' },
  { path: '/org-responsibility',     label: 'ì¡°ì§Â·ì±ì ê´ë¦¬',     clause: '5.5' },
  { path: '/management-review',      label: 'ê²½ì ê²í ',          clause: '5.6' },
  { path: '/competency',             label: 'ì­ë ê´ë¦¬',          clause: '6.2' },
  { path: '/infrastructure',         label: 'ì¸íë¼ ê´ë¦¬',        clause: '6.3' },
  { path: '/work-env',               label: 'ììíê²½ ê´ë¦¬',      clause: '6.4' },
  { path: '/quality-plan',           label: 'íì§ ê³í',          clause: '7.1' },
  { path: '/customer-req',           label: 'ê³ ê° ìêµ¬ì¬í­ ê²í ', clause: '7.2' },
  { path: '/dhf',                    label: 'ì¤ê³ ì´ë ¥ íì¼',     clause: '7.3' },
  { path: '/suppliers',              label: 'ê³µê¸ìì²´ ê´ë¦¬',      clause: '7.4' },
  { path: '/purchase-verification',  label: 'êµ¬ë§¤ ì ë³´Â·ììê²ì¬', clause: '7.4' },
  { path: '/inspection',             label: 'ê³µì Â·ìµì¢ ê²ì¬',     clause: '7.5' },
  { path: '/validation',             label: 'ê³µì  ì í¨ì± íì¸',   clause: '7.5' },
  { path: '/traceability',           label: 'ì í ìë³Â·ì¶ì ì±',   clause: '7.5' },
  { path: '/preservation',           label: 'ì í ë³´ì¡´Â·ì·¨ê¸',     clause: '7.5' },
  { path: '/service',                label: 'ì¤ì¹Â·ìë¹ì¤',        clause: '7.5' },
  { path: '/calibration',            label: 'êµì  ê´ë¦¬',          clause: '7.6' },
  { path: '/quality-dashboard',      label: 'íì§ KPI ëìë³´ë',  clause: '8' },
  { path: '/complaints',             label: 'ê³ ê°ë¶ë§ ê´ë¦¬',      clause: '8.2' },
  { path: '/audit',                  label: 'ë´ë¶ê°ì¬',           clause: '8.2' },
  { path: '/quality',                label: 'NCR / ë¶ì í© ê´ë¦¬',  clause: '8.3' },
  { path: '/risk',                   label: 'ìíê´ë¦¬ (FMEA)',    clause: '8' },
  { path: '/change-control',         label: 'ë³ê²½ ê´ë¦¬',          clause: '4.1' },
  { path: '/doc-control',            label: 'ë¬¸ì ê´ë¦¬ ëì¥',     clause: '4.2' },
  { path: '/improvement',            label: 'ê°ì  íë',          clause: '8.5' },
]

// íµì¬ íë¡ì¸ì¤ ìí¸ìì© (íì¤í¸ ê¸°ë° íë¡ì°)
const PROCESS_INTERACTIONS = [
  { from: 'ê³ ê° ìêµ¬ì¬í­',    to: 'íì§ ê³í',         arrow: true },
  { from: 'íì§ ê³í',        to: 'ì¤ê³Â·ê°ë°',         arrow: true },
  { from: 'ì¤ê³Â·ê°ë°',        to: 'êµ¬ë§¤',              arrow: true },
  { from: 'êµ¬ë§¤',             to: 'ììê²ì¬ (IQC)',     arrow: true },
  { from: 'ììê²ì¬ (IQC)',   to: 'ìì°Â·ìë¹ì¤',       arrow: true },
  { from: 'ìì°Â·ìë¹ì¤',      to: 'ê³µì  ê²ì¬',         arrow: true },
  { from: 'ê³µì  ê²ì¬',        to: 'ìµì¢ ê²ì¬Â·ì¶í',    arrow: true },
  { from: 'ìµì¢ ê²ì¬Â·ì¶í',   to: 'ê³ ê°',              arrow: true },
  { from: 'ê³ ê°',             to: 'ê³ ê°ë¶ë§Â·í¼ëë°±',   arrow: true },
  { from: 'ê³ ê°ë¶ë§Â·í¼ëë°±',  to: 'CAPAÂ·ê°ì ',         arrow: true },
  { from: 'CAPAÂ·ê°ì ',        to: 'ê²½ì ê²í ',         arrow: true },
]

const DEVICE_CLASSES = ['Class I', 'Class II', 'Class IIa', 'Class IIb', 'Class III', 'ë¯¸ë¶ë¥', 'í´ë¹ ìì']

function today() { return new Date().toISOString().slice(0, 10) }

// ââ ê¸°ë³¸ ë§¤ë´ì¼ êµ¬ì¡° âââââââââââââââââââââââââââââââââââââââââ
const DEFAULT_MANUAL = {
  // ê¸°ë³¸ ì ë³´
  companyName: '',
  manualNo: 'QM-001',
  title: 'íì§ ë§¤ë´ì¼',
  revision: 'Rev.0',
  issueDate: today(),
  effectiveDate: today(),
  preparedBy: '', reviewedBy: '', approvedBy: '',

  // Â§4.2.1(a) â QMS ë²ì
  scope: '',
  deviceTypes: '',         // ì ì© ìë£ê¸°ê¸° ì¢ë¥
  deviceClasses: [],       // ê¸°ê¸° ë±ê¸
  activities: '',          // ì¡°ì§ íë (ì¤ê³/ì ì¡°/íë§¤ ë±)

  // Â§4.2.1(b) â ì ì¸ ì¬í­
  hasExclusions: false,
  exclusions: [],          // [{clause, reason}]

  // Â§4.2.1(c) â ë¬¸ìíë ì ì°¨ ì°¸ì¡°
  procedureRefs: [],       // [{sop, title, clause, docNo}]

  // íì§ ë°©ì¹¨ (Â§5.3)
  qualityPolicy: '',

  // íë¡ì¸ì¤ ë§µ ì¬ì©ì ì ì ë©ëª¨
  processNotes: '',

  // ë°°í¬ ëª©ë¡
  distributionList: [],    // [{dept, name, copyNo}]

  // ê°ì  ì´ë ¥
  revisionHistory: [],     // [{rev, date, description, by}]
}

// ââ ë©ì¸ âââââââââââââââââââââââââââââââââââââââââââââââââââââ
export default function QualityManualHub() {
  const user = auth.current()
  const canEdit = user?.level >= 2

  const [manual, setManual] = useState(() => {
    try {
      const saved = localStorage.getItem(LS_KEY)
      if (!saved) return { ...DEFAULT_MANUAL }
      const p = JSON.parse(saved)
      const ensureArr = k => Array.isArray(p[k]) ? p[k] : DEFAULT_MANUAL[k] || []
      return { ...DEFAULT_MANUAL, ...p, deviceClasses: ensureArr('deviceClasses'), exclusions: ensureArr('exclusions'), procedureRefs: ensureArr('procedureRefs'), distributionList: ensureArr('distributionList'), revisionHistory: ensureArr('revisionHistory') }
    } catch { return { ...DEFAULT_MANUAL } }
  })
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(null)
  const [tab, setTab] = useState('overview')   // overview | scope | procedures | process | distribution | history

  function startEdit() { setDraft(JSON.parse(JSON.stringify(manual))); setEditing(true) }
  function cancelEdit() { setDraft(null); setEditing(false) }
  function saveEdit() {
    const saved = { ...draft }
    setManual(saved)
    localStorage.setItem(LS_KEY, JSON.stringify(saved))
    setEditing(false); setDraft(null)
  }

  const D = draft || manual
  const F = (k, v) => setDraft(d => ({ ...d, [k]: v }))

  // ì ì¸ ì¬í­ ê´ë¦¬
  function addExclusion() { F('exclusions', [...(D.exclusions || []), { id: Date.now(), clause: '', reason: '' }]) }
  function updateExclusion(id, field, value) { F('exclusions', (Array.isArray(D.exclusions)?D.exclusions:[]).map(e => e.id === id ? { ...e, [field]: value } : e)) }
  function removeExclusion(id) { F('exclusions', D.exclusions.filter(e => e.id !== id)) }

  // ì ì°¨ ì°¸ì¡° ê´ë¦¬
  function addProcRef() { F('procedureRefs', [...(D.procedureRefs || []), { id: Date.now(), sop: '', title: '', clause: '', docNo: '' }]) }
  function updateProcRef(id, field, value) { F('procedureRefs', (Array.isArray(D.procedureRefs)?D.procedureRefs:[]).map(p => p.id === id ? { ...p, [field]: value } : p)) }
  function removeProcRef(id) { F('procedureRefs', D.procedureRefs.filter(p => p.id !== id)) }

  // ë°°í¬ ê´ë¦¬
  function addDist() { F('distributionList', [...(D.distributionList || []), { id: Date.now(), dept: '', name: '', copyNo: '' }]) }
  function updateDist(id, field, value) { F('distributionList', (Array.isArray(D.distributionList)?D.distributionList:[]).map(d => d.id === id ? { ...d, [field]: value } : d)) }
  function removeDist(id) { F('distributionList', D.distributionList.filter(d => d.id !== id)) }

  // ê°ì  ì´ë ¥ ì¶ê°
  function addRevision() {
    const rev = { id: Date.now(), rev: '', date: today(), description: '', by: user?.name || '' }
    F('revisionHistory', [...(D.revisionHistory || []), rev])
  }
  function updateRev(id, field, value) { F('revisionHistory', (Array.isArray(D.revisionHistory)?D.revisionHistory:[]).map(r => r.id === id ? { ...r, [field]: value } : r)) }
  function removeRev(id) { F('revisionHistory', D.revisionHistory.filter(r => r.id !== id)) }

  // ìì±ë ì²´í¬
  const completeness = useMemo(() => {
    const m = manual
    const checks = [
      { label: 'QMS ë²ì ë±ë¡',         done: !!(m.scope?.trim()) },
      { label: 'íì§ ë°©ì¹¨ ë±ë¡',         done: !!(m.qualityPolicy?.trim()) },
      { label: 'ì ì°¨ ì°¸ì¡° 1ê±´ ì´ì',     done: (m.procedureRefs?.length || 0) > 0 },
      { label: 'ì¹ì¸ì ìëª',            done: !!(m.approvedBy?.trim()) },
      { label: 'ì í¨ì¼ ì¤ì ',            done: !!(m.effectiveDate) },
      { label: 'ë°°í¬ ëª©ë¡ ë±ë¡',         done: (m.distributionList?.length || 0) > 0 },
      { label: 'ì ì¸ ì¬í­ ì²ë¦¬',         done: !m.hasExclusions || (m.exclusions?.length || 0) > 0 },
    ]
    return checks
  }, [manual])

  const doneCount = (Array.isArray(completeness)?completeness:[]).filter(c => c.done).length

  return (
    <AppLayout user={user} title="íì§ ë§¤ë´ì¼" subtitle="ISO 13485 Â§4.2.1 â QMS ë²ìÂ·ì ì¸ì¬í­Â·íë¡ì¸ì¤ ìí¸ìì©Â·ì ì°¨ ì°¸ì¡°">
      <HubBanner title="품질 매뉴얼 관리" subtitle="ISO 13485 §4.2.1 — 품질 매뉴얼 작성·유지·배포" icon={BookOpen} color="#4F46E5" workflow={['초안 작성', '내부 검토', '경영진 승인', '배포', '정기 개정']} />
      <div className="px-6 lg:px-8 py-6 max-w-[1400px] mx-auto">

        {/* í¤ë ì¹´ë */}
        <div className="mb-5 p-5 rounded-2xl flex items-start justify-between gap-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={18} style={{ color: 'var(--moss)' }} />
              <span className="text-[18px] font-bold" style={{ color: 'var(--ink)' }}>
                {manual.title || 'íì§ ë§¤ë´ì¼'} {manual.manualNo && `(${manual.manualNo})`}
              </span>
              <span className="text-[12px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--leaf-soft)', color: 'var(--moss)' }}>
                {manual.revision || 'Rev.0'}
              </span>
            </div>
            <div className="text-[13px]" style={{ color: 'var(--ink-soft)' }}>
              {manual.companyName || '(íì¬ëª ë¯¸ë±ë¡)'} Â· ì í¨ì¼: {manual.effectiveDate || '-'}
            </div>
            {manual.approvedBy && (
              <div className="text-[12px] mt-1" style={{ color: 'var(--ink-faint)' }}>
                ìì±: {manual.preparedBy || '-'} Â· ê²í : {manual.reviewedBy || '-'} Â· ì¹ì¸: {manual.approvedBy}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {/* ìì±ë */}
            <div className="text-center">
              <div className="text-[22px] font-bold" style={{ color: doneCount >= 6 ? '#059669' : '#D97706' }}>
                {doneCount}/{completeness.length}
              </div>
              <div className="text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>ìì±ë</div>
            </div>
            {canEdit && !editing && (
              <button onClick={startEdit}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
                style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                <Edit2 size={13} /> í¸ì§
              </button>
            )}
            {editing && (
              <>
                <button onClick={saveEdit}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Save size={13} /> ì ì¥
                </button>
                <button onClick={cancelEdit} className="px-3 py-2 rounded-xl text-[13px]"
                  style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
                  ì·¨ì
                </button>
              </>
            )}
          </div>
        </div>

        {/* ìì±ë ì²´í¬ë¦¬ì¤í¸ */}
        <div className="mb-5 p-4 rounded-2xl" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
          <div className="text-[12px] font-bold mb-2" style={{ color: 'var(--ink-soft)' }}>Â§4.2.1 íì í­ëª© ì²´í¬</div>
          <div className="flex flex-wrap gap-2">
            {(Array.isArray(completeness)?completeness:[]).map(c => (
              <span key={c.label} className="flex items-center gap-1 text-[11.5px] px-2.5 py-1 rounded-full font-semibold"
                style={{ background: c.done ? '#D1FAE5' : '#FEE2E2', color: c.done ? '#059669' : '#DC2626' }}>
                {c.done ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />} {c.label}
              </span>
            ))}
          </div>
        </div>

        {/* í­ */}
        <div className="flex flex-wrap gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-soft)' }}>
          {[
            { key: 'overview',     label: 'ê¸°ë³¸ ì ë³´' },
            { key: 'scope',        label: 'ì ì© ë²ìÂ·ì ì¸' },
            { key: 'procedures',   label: `ì ì°¨ ì°¸ì¡° (${manual.procedureRefs?.length || 0})` },
            { key: 'process',      label: 'íë¡ì¸ì¤ ë§µ' },
            { key: 'distribution', label: `ë°°í¬ ëª©ë¡ (${manual.distributionList?.length || 0})` },
            { key: 'history',      label: `ê°ì  ì´ë ¥ (${manual.revisionHistory?.length || 0})` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition"
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

        {/* ââ ê¸°ë³¸ ì ë³´ í­ ââ */}
        {tab === 'overview' && (
          <div className="space-y-4">
            {editing ? (
              <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <Field label="íì¬ëª" value={D.companyName} onChange={v => F('companyName', v)} />
                  <Field label="ë§¤ë´ì¼ ë²í¸" value={D.manualNo} onChange={v => F('manualNo', v)} />
                  <Field label="ì ëª©" value={D.title} onChange={v => F('title', v)} />
                  <Field label="ê°ì  ë²í¸" value={D.revision} onChange={v => F('revision', v)} placeholder="Rev.0" />
                  <Field label="ë°íì¼" type="date" value={D.issueDate} onChange={v => F('issueDate', v)} />
                  <Field label="ì í¨ì¼" type="date" value={D.effectiveDate} onChange={v => F('effectiveDate', v)} />
                  <Field label="ìì±ì" value={D.preparedBy} onChange={v => F('preparedBy', v)} />
                  <Field label="ê²í ì" value={D.reviewedBy} onChange={v => F('reviewedBy', v)} />
                  <Field label="ì¹ì¸ì *" value={D.approvedBy} onChange={v => F('approvedBy', v)} />
                </div>
                <FieldArea label="íì§ ë°©ì¹¨ (Â§5.3)" value={D.qualityPolicy} onChange={v => F('qualityPolicy', v)} rows={4}
                  placeholder="ë¹ì¬ë ISO 13485 ìêµ¬ì¬í­ì ì¶©ì¡±íë ìë£ê¸°ê¸°ë¥¼ ì§ìì ì¼ë¡ ì ê³µíê¸° ìí´..." />
              </div>
            ) : (
              <div className="space-y-4">
                <InfoSection title="ê¸°ë³¸ ì ë³´">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      ['íì¬ëª', manual.companyName],
                      ['ë§¤ë´ì¼ ë²í¸', manual.manualNo],
                      ['ê°ì  ë²í¸', manual.revision],
                      ['ë°íì¼', manual.issueDate],
                      ['ì í¨ì¼', manual.effectiveDate],
                      ['ìì±ì', manual.preparedBy],
                      ['ê²í ì', manual.reviewedBy],
                      ['ì¹ì¸ì', manual.approvedBy],
                    ].map(([l, v]) => <InfoItem key={l} label={l} value={v} />)}
                  </div>
                </InfoSection>
                {manual.qualityPolicy && (
                  <InfoSection title="íì§ ë°©ì¹¨ (Â§5.3)">
                    <p className="text-[13px] whitespace-pre-line leading-relaxed" style={{ color: 'var(--ink)' }}>{manual.qualityPolicy}</p>
                  </InfoSection>
                )}
              </div>
            )}
          </div>
        )}

        {/* ââ ì ì© ë²ìÂ·ì ì¸ í­ ââ */}
        {tab === 'scope' && (
          <div className="space-y-4">
            {editing ? (
              <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                <div className="mb-4 p-3 rounded-xl text-[12px]" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF' }}>
                  Â§4.2.1(a) QMS ì ì© ë²ìë ì í ì í, íë, ì ì© ìì¹ë¥¼ ëªíí ê¸°ì í´ì¼ í©ëë¤.
                </div>
                <FieldArea label="QMS ì ì© ë²ì *" value={D.scope} onChange={v => F('scope', v)} rows={4}
                  placeholder="ë¹ì¬ íì§ê²½ììì¤íì ì ì© ë²ìë [ì í ì í]ì ì¤ê³Â·ê°ë°Â·ì ì¡°Â·íë§¤Â·ìë¹ì¤ì ì ì©ë©ëë¤." />
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="ì ì© ìë£ê¸°ê¸° ì¢ë¥" value={D.deviceTypes} onChange={v => F('deviceTypes', v)} placeholder="íìê³, ì²´ì¨ê³, ì£¼ì¬ê¸°..." />
                  <Field label="ì£¼ì íë" value={D.activities} onChange={v => F('activities', v)} placeholder="ì¤ê³Â·ê°ë°Â·ì ì¡°Â·íë§¤Â·A/S" />
                </div>
                <div className="mt-3">
                  <div className="text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>ì ì© ê¸°ê¸° ë±ê¸</div>
                  <div className="flex flex-wrap gap-2">
                    {DEVICE_CLASSES.map(cls => (
                      <label key={cls} className="flex items-center gap-1.5 text-[12.5px] cursor-pointer">
                        <input type="checkbox"
                          checked={(D.deviceClasses || []).includes(cls)}
                          onChange={e => F('deviceClasses', e.target.checked
                            ? [...(D.deviceClasses || []), cls]
                            : (D.deviceClasses || []).filter(c => c !== cls))}
                          className="accent-green-500 w-3.5 h-3.5" />
                        {cls}
                      </label>
                    ))}
                  </div>
                </div>

                {/* ì ì¸ ì¬í­ */}
                <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
                  <label className="flex items-center gap-2 text-[13px] font-semibold cursor-pointer mb-3" style={{ color: 'var(--ink)' }}>
                    <input type="checkbox" checked={!!D.hasExclusions} onChange={e => F('hasExclusions', e.target.checked)} className="accent-green-500 w-4 h-4" />
                    Â§4.2.1(b) ì ì¸ ì¬í­ ìì (ì¼ë¶ ìêµ¬ì¬í­ ì ì© ì ì¸)
                  </label>
                  {D.hasExclusions && (
                    <div className="space-y-2">
                      {(D.exclusions || []).map(excl => (
                        <div key={excl.id} className="flex gap-2 items-start">
                          <input value={excl.clause} onChange={e => updateExclusion(excl.id, 'clause', e.target.value)}
                            placeholder="ì ì¸ ì¡°í­ (ì: 7.3)" className="w-28 px-2 py-1.5 rounded-xl text-[12.5px]"
                            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
                          <input value={excl.reason} onChange={e => updateExclusion(excl.id, 'reason', e.target.value)}
                            placeholder="ì ì¸ ì¬ì  (ì: ì¤ê³Â·ê°ë° íë ìì)" className="flex-1 px-2 py-1.5 rounded-xl text-[12.5px]"
                            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
                          <button onClick={() => removeExclusion(excl.id)} className="p-1.5 rounded-lg mt-0.5"
                            style={{ background: '#FEE2E2', border: 'none', cursor: 'pointer' }}>
                            <Trash2 size={12} style={{ color: '#DC2626' }} />
                          </button>
                        </div>
                      ))}
                      <button onClick={addExclusion} className="flex items-center gap-1 text-[12px] px-3 py-1.5 rounded-xl"
                        style={{ background: 'var(--bg-soft)', border: '1px dashed var(--line)', color: 'var(--moss)', cursor: 'pointer' }}>
                        <Plus size={12} /> ì ì¸ ì¬í­ ì¶ê°
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <InfoSection title="Â§4.2.1(a) QMS ì ì© ë²ì">
                  <p className="text-[13px] whitespace-pre-line leading-relaxed mb-3" style={{ color: 'var(--ink)' }}>
                    {manual.scope || <span style={{ color: 'var(--ink-faint)' }}>(ë¯¸ë±ë¡)</span>}
                  </p>
                  <div className="flex flex-wrap gap-3 text-[12.5px]">
                    {manual.deviceTypes && <span style={{ color: 'var(--ink-soft)' }}>ê¸°ê¸°: {manual.deviceTypes}</span>}
                    {manual.activities && <span style={{ color: 'var(--ink-soft)' }}>íë: {manual.activities}</span>}
                    {(manual.deviceClasses || []).length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {(Array.isArray(manual.deviceClasses)?manual.deviceClasses:[]).map(c => (
                          <span key={c} className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--leaf-soft)', color: 'var(--moss)' }}>{c}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </InfoSection>

                <InfoSection title="Â§4.2.1(b) ì ì¸ ì¬í­">
                  {!manual.hasExclusions ? (
                    <p className="text-[13px]" style={{ color: 'var(--ink-soft)' }}>ì ì¸ ì¬í­ ìì â ëª¨ë  ISO 13485 ìêµ¬ì¬í­ ì ì©</p>
                  ) : (manual.exclusions || []).length === 0 ? (
                    <p className="text-[13px]" style={{ color: '#DC2626' }}>ì ì¸ ì¬í­ ììì¼ë¡ ì¤ì ëì¼ë í­ëª©ì´ ë±ë¡ëì§ ìììµëë¤.</p>
                  ) : (
                    <table className="w-full text-[12.5px]">
                      <thead><tr style={{ background: 'var(--bg-soft)' }}>
                        <th className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--ink-soft)' }}>ì ì¸ ì¡°í­</th>
                        <th className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--ink-soft)' }}>ì ì¸ ì¬ì </th>
                      </tr></thead>
                      <tbody>
                        {(Array.isArray(manual.exclusions)?manual.exclusions:[]).map((e, i) => (
                          <tr key={e.id} style={{ background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-soft)', borderTop: '1px solid var(--line)' }}>
                            <td className="px-3 py-2 font-mono font-bold" style={{ color: '#D97706' }}>Â§{e.clause}</td>
                            <td className="px-3 py-2" style={{ color: 'var(--ink)' }}>{e.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </InfoSection>
              </div>
            )}
          </div>
        )}

        {/* ââ ì ì°¨ ì°¸ì¡° í­ ââ */}
        {tab === 'procedures' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[12.5px]" style={{ color: 'var(--ink-soft)' }}>Â§4.2.1(c) ë¬¸ìíë ì ì°¨ì ì°¸ì¡° â í´ë¹ SOP/ë¬¸ìë¥¼ ISO ì¡°í­ê³¼ ì°ê²°íì¬ ë±ë¡íì¸ì.</div>
              {editing && (
                <button onClick={addProcRef} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12px] font-semibold"
                  style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--moss)', cursor: 'pointer' }}>
                  <Plus size={12} /> ì ì°¨ ì¶ê°
                </button>
              )}
            </div>

            {/* ISO ì¡°í­ ì»¤ë²ë¦¬ì§ ë¯¸ë ë·° */}
            <div className="mb-4 p-4 rounded-2xl" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
              <div className="text-[12px] font-bold mb-2" style={{ color: 'var(--ink-soft)' }}>Qualytree íë¸ ì°ê²° íí©</div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
                {QUALYTREE_HUBS.map(h => (
                  <div key={h.path} className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                    <CheckCircle2 size={10} style={{ color: 'var(--moss)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--ink-soft)' }}>{h.label}</span>
                    <span className="ml-auto font-mono text-[10px]" style={{ color: 'var(--ink-faint)' }}>Â§{h.clause}</span>
                  </div>
                ))}
              </div>
            </div>

            {editing ? (
              <div className="space-y-2">
                {(D.procedureRefs || []).map(p => (
                  <div key={p.id} className="flex gap-2 flex-wrap items-center p-2 rounded-xl"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                    <input value={p.sop} onChange={e => updateProcRef(p.id, 'sop', e.target.value)}
                      placeholder="SOP/ì ì°¨ì ë²í¸" className="w-32 px-2 py-1.5 rounded-lg text-[12.5px]"
                      style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
                    <input value={p.title} onChange={e => updateProcRef(p.id, 'title', e.target.value)}
                      placeholder="ë¬¸ì ì ëª©" className="flex-1 min-w-[160px] px-2 py-1.5 rounded-lg text-[12.5px]"
                      style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
                    <select value={p.clause} onChange={e => updateProcRef(p.id, 'clause', e.target.value)}
                      className="w-40 px-2 py-1.5 rounded-lg text-[12.5px]"
                      style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                      <option value="">ISO ì¡°í­ ì í</option>
                      {ISO_SECTIONS.map(s => <option key={s.clause} value={s.clause}>Â§{s.clause} {s.title}</option>)}
                    </select>
                    <button onClick={() => removeProcRef(p.id)} className="p-1.5 rounded-lg"
                      style={{ background: '#FEE2E2', border: 'none', cursor: 'pointer' }}>
                      <Trash2 size={11} style={{ color: '#DC2626' }} />
                    </button>
                  </div>
                ))}
                {(D.procedureRefs || []).length === 0 && (
                  <div className="text-center py-6 text-[13px]" style={{ color: 'var(--ink-faint)' }}>
                    "ì ì°¨ ì¶ê°" ë²í¼ì¼ë¡ SOPë¥¼ ë±ë¡íì¸ì.
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
                <table className="w-full text-[12.5px]">
                  <thead><tr style={{ background: 'var(--bg-soft)' }}>
                    {['SOP ë²í¸', 'ë¬¸ì ì ëª©', 'ISO ì¡°í­'].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--ink-soft)' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {(manual.procedureRefs || []).length === 0 ? (
                      <tr><td colSpan={3} className="text-center py-10" style={{ color: 'var(--ink-faint)' }}>ë±ë¡ë ì ì°¨ ì°¸ì¡°ê° ììµëë¤. í¸ì§ ë²í¼ì í´ë¦­íì¸ì.</td></tr>
                    ) : (manual.procedureRefs || []).map((p, i) => (
                      <tr key={p.id} style={{ background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-soft)', borderTop: '1px solid var(--line)' }}>
                        <td className="px-3 py-2 font-mono text-[11.5px]" style={{ color: 'var(--ink-soft)' }}>{p.sop || '-'}</td>
                        <td className="px-3 py-2 font-semibold" style={{ color: 'var(--ink)' }}>{p.title}</td>
                        <td className="px-3 py-2">
                          {p.clause && <span className="font-mono text-[11.5px] px-2 py-0.5 rounded" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>Â§{p.clause}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ââ íë¡ì¸ì¤ ë§µ í­ ââ */}
        {tab === 'process' && (
          <div>
            <div className="text-[12.5px] mb-4" style={{ color: 'var(--ink-soft)' }}>
              Â§4.2.1(d) íë¡ì¸ì¤ ìí¸ìì© â íµì¬ QMS íë¡ì¸ì¤ì ìì ë° ìí¸ìì©ì ìê°íí©ëë¤.
            </div>
            {/* íë¡ì¸ì¤ íë¡ì° */}
            <div className="p-5 rounded-2xl mb-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="text-[13px] font-bold mb-4" style={{ color: 'var(--ink)' }}>íµì¬ íë¡ì¸ì¤ íë¦ë</div>
              <div className="flex flex-wrap gap-2 items-center">
                {PROCESS_INTERACTIONS.map((pi, idx) => (
                  <React.Fragment key={idx}>
                    <div className="px-3 py-2 rounded-xl text-[12px] font-semibold text-center"
                      style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', minWidth: 90 }}>
                      {pi.from}
                    </div>
                    {pi.arrow && <ArrowRight size={14} style={{ color: 'var(--moss)', flexShrink: 0 }} />}
                  </React.Fragment>
                ))}
                <div className="px-3 py-2 rounded-xl text-[12px] font-semibold"
                  style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                  {PROCESS_INTERACTIONS[PROCESS_INTERACTIONS.length - 1].to}
                </div>
              </div>
            </div>

            {/* Qualytree íë¸ - ISO ë§¤í */}
            <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>Qualytree íë¸ â ISO 13485 ì¡°í­ ë§¤í</div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {QUALYTREE_HUBS.map(h => (
                  <div key={h.path} className="flex items-center gap-2 p-2.5 rounded-xl"
                    style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
                    <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0"
                      style={{ background: 'var(--leaf-soft)', color: 'var(--moss)' }}>Â§{h.clause}</span>
                    <span className="text-[12px]" style={{ color: 'var(--ink)' }}>{h.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {editing && (
              <div className="mt-4">
                <FieldArea label="íë¡ì¸ì¤ ìí¸ìì© ì¶ê° ì¤ëª (ì í)" value={D.processNotes} onChange={v => F('processNotes', v)} rows={3}
                  placeholder="ì§ì íë¡ì¸ì¤: ì¸ì  ìì, ì¸íë¼, ììíê²½ ê´ë¦¬ê° ì í ì¤í íë¡ì¸ì¤ë¥¼ ì§ìí©ëë¤..." />
              </div>
            )}
            {!editing && manual.processNotes && (
              <div className="mt-4 p-4 rounded-2xl" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
                <div className="text-[12.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>ì¶ê° ì¤ëª</div>
                <p className="text-[13px] whitespace-pre-line" style={{ color: 'var(--ink)' }}>{manual.processNotes}</p>
              </div>
            )}
          </div>
        )}

        {/* ââ ë°°í¬ ëª©ë¡ í­ ââ */}
        {tab === 'distribution' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[12.5px]" style={{ color: 'var(--ink-soft)' }}>íì§ ë§¤ë´ì¼ ë°°í¬ ì¬ë³¸ ê´ë¦¬</div>
              {editing && (
                <button onClick={addDist} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12px] font-semibold"
                  style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--moss)', cursor: 'pointer' }}>
                  <Plus size={12} /> ë°°í¬ì² ì¶ê°
                </button>
              )}
            </div>
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
              <table className="w-full text-[12.5px]">
                <thead><tr style={{ background: 'var(--bg-soft)' }}>
                  {editing
                    ? ['ë¶ì', 'ë°°í¬ ëìì', 'ì¬ë³¸ ë²í¸', ''].map(h => <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--ink-soft)' }}>{h}</th>)
                    : ['ë¶ì', 'ë°°í¬ ëìì', 'ì¬ë³¸ ë²í¸'].map(h => <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--ink-soft)' }}>{h}</th>)
                  }
                </tr></thead>
                <tbody>
                  {(editing ? D.distributionList : manual.distributionList || []).length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-10" style={{ color: 'var(--ink-faint)' }}>ë°°í¬ ëª©ë¡ì´ ììµëë¤.</td></tr>
                  ) : (editing ? D.distributionList : manual.distributionList || []).map((dist, i) => (
                    <tr key={dist.id} style={{ background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-soft)', borderTop: '1px solid var(--line)' }}>
                      {editing ? (
                        <>
                          <td className="px-3 py-2"><input value={dist.dept} onChange={e => updateDist(dist.id, 'dept', e.target.value)}
                            className="w-full px-2 py-1 rounded-lg text-[12.5px]"
                            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} /></td>
                          <td className="px-3 py-2"><input value={dist.name} onChange={e => updateDist(dist.id, 'name', e.target.value)}
                            className="w-full px-2 py-1 rounded-lg text-[12.5px]"
                            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} /></td>
                          <td className="px-3 py-2"><input value={dist.copyNo} onChange={e => updateDist(dist.id, 'copyNo', e.target.value)}
                            placeholder="No.1" className="w-20 px-2 py-1 rounded-lg text-[12.5px]"
                            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} /></td>
                          <td className="px-3 py-2"><button onClick={() => removeDist(dist.id)} className="p-1.5 rounded-lg"
                            style={{ background: '#FEE2E2', border: 'none', cursor: 'pointer' }}>
                            <Trash2 size={11} style={{ color: '#DC2626' }} /></button></td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-2" style={{ color: 'var(--ink-soft)' }}>{dist.dept}</td>
                          <td className="px-3 py-2 font-semibold" style={{ color: 'var(--ink)' }}>{dist.name}</td>
                          <td className="px-3 py-2 font-mono text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>{dist.copyNo}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ââ ê°ì  ì´ë ¥ í­ ââ */}
        {tab === 'history' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[12.5px]" style={{ color: 'var(--ink-soft)' }}>íì§ ë§¤ë´ì¼ ê°ì  ì´ë ¥</div>
              {editing && (
                <button onClick={addRevision} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12px] font-semibold"
                  style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--moss)', cursor: 'pointer' }}>
                  <Plus size={12} /> ê°ì  ì¶ê°
                </button>
              )}
            </div>
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
              <table className="w-full text-[12.5px]">
                <thead><tr style={{ background: 'var(--bg-soft)' }}>
                  {['ê°ì  ë²í¸', 'ê°ì ì¼', 'ê°ì  ë´ì©', 'ìì±ì', editing ? '' : null].filter(Boolean).map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--ink-soft)' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {(editing ? D.revisionHistory : manual.revisionHistory || []).length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-10" style={{ color: 'var(--ink-faint)' }}>ê°ì  ì´ë ¥ì´ ììµëë¤.</td></tr>
                  ) : (editing ? D.revisionHistory : manual.revisionHistory || []).map((r, i) => (
                    <tr key={r.id} style={{ background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-soft)', borderTop: '1px solid var(--line)' }}>
                      {editing ? (
                        <>
                          <td className="px-3 py-2 w-28"><input value={r.rev} onChange={e => updateRev(r.id, 'rev', e.target.value)}
                            placeholder="Rev.1" className="w-full px-2 py-1 rounded-lg text-[12.5px]"
                            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} /></td>
                          <td className="px-3 py-2 w-36"><input type="date" value={r.date} onChange={e => updateRev(r.id, 'date', e.target.value)}
                            className="w-full px-2 py-1 rounded-lg text-[12.5px]"
                            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} /></td>
                          <td className="px-3 py-2"><input value={r.description} onChange={e => updateRev(r.id, 'description', e.target.value)}
                            placeholder="ê°ì  ì¬ì  ë° ë´ì©" className="w-full px-2 py-1 rounded-lg text-[12.5px]"
                            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} /></td>
                          <td className="px-3 py-2 w-24"><input value={r.by} onChange={e => updateRev(r.id, 'by', e.target.value)}
                            placeholder="ìì±ì" className="w-full px-2 py-1 rounded-lg text-[12.5px]"
                            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} /></td>
                          <td className="px-3 py-2"><button onClick={() => removeRev(r.id)} className="p-1.5 rounded-lg"
                            style={{ background: '#FEE2E2', border: 'none', cursor: 'pointer' }}>
                            <Trash2 size={11} style={{ color: '#DC2626' }} /></button></td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-2 font-bold" style={{ color: 'var(--moss)' }}>{r.rev}</td>
                          <td className="px-3 py-2" style={{ color: 'var(--ink-soft)' }}>{r.date}</td>
                          <td className="px-3 py-2" style={{ color: 'var(--ink)' }}>{r.description}</td>
                          <td className="px-3 py-2" style={{ color: 'var(--ink-soft)' }}>{r.by}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

// ââ ê³µíµ âââââââââââââââââââââââââââââââââââââââââââââââââââââ
function InfoSection({ title, children }) {
  return (
    <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
      <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>{title}</div>
      {children}
    </div>
  )
}
function InfoItem({ label, value }) {
  return (
    <div className="p-3 rounded-xl" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
      <div className="text-[11px] font-bold mb-0.5" style={{ color: 'var(--ink-faint)' }}>{label}</div>
      <div className="text-[13px] font-semibold" style={{ color: value ? 'var(--ink)' : 'var(--ink-faint)' }}>{value || 'ë¯¸ë±ë¡'}</div>
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
