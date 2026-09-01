// src/pages/sterile-control/SterileControlHub.jsx
// ISO 13485 Â§7.5.7 â ë©¸ê·  ìë£ê¸°ê¸° í¹ë³ ìêµ¬ì¬í­
import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../../lib/auth'
import { onboarding } from '../../lib/onboardingState'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import {
  Beaker, CheckCircle, AlertTriangle, PlusCircle,
  ChevronDown, ChevronUp, Trash2, Save, XCircle,
  BarChart2, FileText, ClipboardList, ShieldCheck, ExternalLink,
  Edit2, Printer,
,
  Shield,
} from 'lucide-react'
import {
  STERILE_METHODS, SAL_LEVELS, BIOBURDEN_METHODS, SPEC_STATUSES, deriveSterileSpecs,
} from '../../lib/sterileSpecConstants'
import { printSterileBatchCert, printSterilizationProcedure } from '../../lib/pdfPrint'

// âââ ìì ââââââââââââââââââââââââââââââââââââââââââââââ
// ë©¸ê·  ë°©ë² ì¬ì(STERILE_METHODS ë±)ì ì íÂ·ê³µì  íë©´ìì ìë ¥ëì´
// ì í ë ì½ë ìì²´ê° SSoTê° ëë¯ë¡, ì¬ê¸°ìë ë³ë ì ì¥ì ìì´
// sterileSpecConstants.jsë¥¼ íµí´ íì(derive)íë¤.
const BATCHES_KEY = 'qualytree.sterile_batches'
const POLICY_KEY  = 'qualytree.sterile_policy'

const BATCH_RESULTS = [
  { value: 'pass',        label: 'í©ê²©',       color: '#10B981' },
  { value: 'fail',        label: 'ë¶í©ê²©',     color: '#EF4444' },
  { value: 'conditional', label: 'ì¡°ê±´ë¶ í©ê²©', color: '#F59E0B' },
]

const EMPTY_BATCH = {
  specId: '', batchNo: '', date: new Date().toISOString().slice(0, 10),
  productName: '', lotNo: '', sterileMethod: STERILE_METHODS[0],
  actualTemp: '', actualTime: '', actualPressure: '', actualDose: '',
  bioburdenResult: '', salAchieved: '',
  result: 'pass', notes: '',
}

// ë©¸ê·  ë°©ë²ì ë°ë¼ ì¤ì¸¡ ì¬ì´í´ íë¼ë¯¸í° ì¤ ì¤ì ë¡ ìë¯¸ ìë í­ëª©ë§ ìë ¥ë°ëë¤. (#190)
const CYCLE_PARAMS_BY_METHOD = {
  'EO (ìí¸ë ì¥ì¬ì´ë)':            ['temp', 'time', 'pressure'],
  'ê°ë§ì  (Gamma Radiation)':      ['dose'],
  'E-beam (ì ìë¹)':                ['dose'],
  'ê³ ìì¦ê¸°ë©¸ê·  (Autoclave)':       ['temp', 'time', 'pressure'],
  'ê±´ì´ ë©¸ê·  (Dry Heat)':           ['temp', 'time'],
  'ê³¼ì°íìì íë¼ì¦ë§ (HâOâ Plasma)': ['temp', 'time'],
  'Xì  ë°©ì¬ì ':                     ['dose'],
}
function cycleParamsFor(method) { return CYCLE_PARAMS_BY_METHOD[method] || ['temp', 'time', 'pressure', 'dose'] }

// ë°°ì¹/ë¡í¸ ë²í¸ë¡ ìì°ì¤ì¸ WOë¥¼ ì¡°íí´ ì´ë¤ ì íì¸ì§ ìë ì°ê²°íë¤. (#188)
function findWoByLot(lot) {
  if (!lot || !lot.trim()) return null
  try {
    const wos = JSON.parse(localStorage.getItem('qms_mfg_wo') || '[]')
    return (Array.isArray(wos) ? wos : []).find(w => w.lot && w.lot.trim().toLowerCase() === lot.trim().toLowerCase()) || null
  } catch { return null }
}

const DEFAULT_POLICY = {
  revision: 'A', issueDate: '', approvedBy: '',
  scope: '',
  reprocessingPolicy: '',
  singleUseStatement: '',
  labelingReqs: '',
  expiryTrackingMethod: '',
  postMarketMonitoring: '',
  revisionHistory: [],
}

// âââ í¬í¼ ââââââââââââââââââââââââââââââââââââââââââââââ
function genBatchId() { return `SB-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }

function lsGet(key, def) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def } catch { return def }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

function StatusBadge({ value, options }) {
  const opt = options.find(o => o.value === value) || options[0]
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, borderRadius: 4, padding: '2px 7px',
      background: opt.color + '22', color: opt.color,
    }}>{opt.label}</span>
  )
}

function Field({ label, required, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)' }}>
        {label}{required && <span style={{ color: '#EF4444' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

const inp = {
  background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 6,
  padding: '6px 10px', color: 'var(--ink)', fontSize: 13, width: '100%', boxSizing: 'border-box',
}
const textarea = { ...inp, resize: 'vertical', minHeight: 72, fontFamily: 'inherit' }
const sel      = { ...inp, cursor: 'pointer' }

// âââ ìì ì± ì²´ì»¤ âââââââââââââââââââââââââââââââââââââ
function useCompleteness(specs, batches, policy) {
  const checks = [
    { label: 'ë©¸ê·  ë°©ë² ì¬ì ìµì 1ê±´', done: specs.length > 0 },
    { label: 'ëª¨ë  ì¬ìì SAL ëª©í ì¤ì ', done: specs.length > 0 && specs.every(s => s.salTarget) },
    { label: 'ëª¨ë  ì¬ìì ë°¸ë¦¬ë°ì´ì ì°¸ì¡° ìë ¥', done: specs.length > 0 && specs.every(s => s.validationRef) },
    { label: 'ëª¨ë  ì¬ìì í¬ì¥ ì°¸ì¡° ìë ¥', done: specs.length > 0 && specs.every(s => s.packagingRef) },
    { label: 'ë©¸ê·  ë°°ì¹ ê¸°ë¡ ìµì 1ê±´', done: batches.length > 0 },
    { label: 'ì¬ì²ë¦¬ ì ì± ë¬¸ì ìì±', done: !!(policy.reprocessingPolicy && policy.singleUseStatement) },
    { label: 'ë¼ë²¨ë§ ìêµ¬ì¬í­ ë¬¸ìí', done: !!policy.labelingReqs },
    { label: 'ì í¨ê¸°ê° ì¶ì  ë°©ë² ì ì', done: !!policy.expiryTrackingMethod },
  ]
  const done  = checks.filter(c => c.done).length
  const total = checks.length
  const pct   = Math.round((done / total) * 100)
  return { checks, done, total, pct }
}

// âââ í­ ë²í¼ âââââââââââââââââââââââââââââââââââââââââ
function TabBar({ tabs, active, onSelect }) {
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--line)', marginBottom: 20 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onSelect(t.id)} style={{
          padding: '8px 16px', fontSize: 13, fontWeight: active === t.id ? 700 : 400,
          color: active === t.id ? 'var(--moss)' : 'var(--ink-soft)',
          borderBottom: active === t.id ? '2px solid var(--moss)' : '2px solid transparent',
          background: 'none', border: 'none', borderRadius: '6px 6px 0 0',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {t.icon && <t.icon size={14} />}{t.label}
        </button>
      ))}
    </div>
  )
}

// ââââââââââââââââââââââââââââââââââââââââââââââââââââââ
//  TAB 1 â ë©¸ê·  ë°©ë² ì¬ì (ì½ê¸° ì ì© Â· ì íÂ·ê³µì  íë©´ìì ìë ¥)
// ââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function SpecTab({ specs, canEdit, onNavigateToProduct, onNavigateToProducts }) {
  const [selected, setSelected] = useState(null)

  return (
    <div>
      {/* ìë¨ ìë´ */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 14, gap: 12, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
          ì´ {specs.length}ê±´ì ì í ë©¸ê·  ì¬ì Â· ì íÂ·ê³µì  &gt; ì í ê°ë° íë©´ìì ìë ¥í ë´ì©ì´ ì¬ê¸° ìë ë°ìë©ëë¤
        </span>
        {canEdit && (
          <button onClick={onNavigateToProducts} style={{
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
            background: 'var(--moss)', color: '#fff', border: 'none', borderRadius: 6,
            padding: '7px 14px', cursor: 'pointer',
          }}>
            <ExternalLink size={14} /> ì í ê°ë°ìì ì¬ì ìë ¥
          </button>
        )}
      </div>

      {/* ëª©ë¡ íì´ë¸ */}
      {specs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--ink-faint)', fontSize: 14 }}>
          ë±ë¡ë ë©¸ê·  ë°©ë² ì¬ìì´ ììµëë¤.
          <div style={{ fontSize: 12.5, marginTop: 6 }}>
            ì íÂ·ê³µì  &gt; ì í ê°ë° íë©´ìì ì íì "ë©¸ê·  ìë£ê¸°ê¸°"ë¡ ì¤ì íê³  ì¬ìì ìë ¥íì¸ì.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {specs.map(s => (
            <div key={s.id} style={{
              background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10,
              overflow: 'hidden',
            }}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' }}
                onClick={() => setSelected(selected === s.id ? null : s.id)}
              >
                <Beaker size={16} style={{ color: 'var(--moss)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{s.productName}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                    {s.productCode && <span style={{ marginRight: 10 }}>ì½ë: {s.productCode}</span>}
                    <span style={{ marginRight: 10 }}>ë°©ë²: {s.sterileMethod}</span>
                    <span>SAL: {s.salTarget}</span>
                  </div>
                </div>
                <StatusBadge value={s.status} options={SPEC_STATUSES} />
                {canEdit && s.productId && (
                  <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => onNavigateToProduct(s.productId)} style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      fontSize: 12, padding: '4px 10px', borderRadius: 5,
                      border: '1px solid var(--line)', background: 'none', cursor: 'pointer', color: 'var(--ink-soft)',
                    }}>
                      <ExternalLink size={12} /> ì í ê°ë°ìì ê´ë¦¬
                    </button>
                  </div>
                )}
                {selected === s.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>

              {/* ìì¸ í¼ì¹ê¸° */}
              {selected === s.id && (
                <div style={{ borderTop: '1px solid var(--line)', padding: '14px 16px', background: 'var(--bg-soft)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, fontSize: 13 }}>
                    <InfoRow label="ë°ì´ì¤ë²ë  íë"     value={s.bioburdenLimit || '\u2014'} />
                    <InfoRow label="ë°ì´ì¤ë²ë  ìíë²"   value={s.bioburdenMethod} />
                    <InfoRow label="ë©¸ê·  ì í¨ê¸°ê°"       value={s.expiryMonths ? `${s.expiryMonths}ê°ì` : '\u2014'} />
                    <InfoRow label="ì¬ì´í´ ì¨ë"         value={s.cycleTemp ? `${s.cycleTemp}â` : '\u2014'} />
                    <InfoRow label="ì¬ì´í´ ìê°"         value={s.cycleTime ? `${s.cycleTime}ë¶` : '\u2014'} />
                    <InfoRow label="ì¬ì´í´ ìë ¥"         value={s.cyclePressure ? `${s.cyclePressure} bar` : '\u2014'} />
                    <InfoRow label="ì ë"                value={s.cycleDose || '\u2014'} />
                    <InfoRow label="ë°¸ë¦¬ë°ì´ì ì°¸ì¡°"     value={s.validationRef || '\u2014'} />
                    <InfoRow label="í¬ì¥ ë°¸ë¦¬ë°ì´ì"     value={s.packagingRef || '\u2014'} />
                    <InfoRow label="ë©¸ê· ì± ìí íì"    value={s.sterilityTestRequired ? 'ì' : 'ìëì¤'} />
                    <InfoRow label="ì¬ì²ë¦¬ íì©"         value={s.reprocessingAllowed ? 'ì (ì£¼ì)' : 'ë¨íì© (ì¬ì²ë¦¬ ê¸ì§)'} />
                    {s.notes && <div style={{ gridColumn: '1/-1' }}><InfoRow label="ë¹ê³ " value={s.notes} /></div>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-faint)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--ink)' }}>{value}</div>
    </div>
  )
}

// ââââââââââââââââââââââââââââââââââââââââââââââââââââââ
//  TAB 2 â ë©¸ê·  ë°°ì¹ ê¸°ë¡
// ââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function BatchTab({ batches, setBatches, specs, canEdit }) {
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [draft,    setDraft]    = useState(EMPTY_BATCH)
  const [certRow,  setCertRow]  = useState(null)

  const openNew = () => {
    const base = specs.length > 0
      ? { ...EMPTY_BATCH, specId: specs[0].id, productName: specs[0].productName, sterileMethod: specs[0].sterileMethod }
      : { ...EMPTY_BATCH }
    setDraft(base)
    setEditing(null)
    setShowForm(true)
  }
  const openEdit = b => { setDraft({ ...b }); setEditing(b.id); setShowForm(true) }
  const save = () => {
    if (!draft.batchNo) return
    if (editing) {
      setBatches(batches.map(b => b.id === editing ? { ...draft, id: editing } : b))
    } else {
      setBatches([...batches, { ...draft, id: genBatchId() }])
    }
    setShowForm(false)
  }
  const del = id => {
    if (!window.confirm('ì­ì íìê² ìµëê¹?')) return
    setBatches(batches.filter(b => b.id !== id))
  }
  const upd = k => e => setDraft(d => ({ ...d, [k]: e.target.value }))
  const onSpecChange = e => {
    const s = specs.find(x => x.id === e.target.value)
    if (s) setDraft(d => ({ ...d, specId: s.id, productName: s.productName, sterileMethod: s.sterileMethod }))
    else setDraft(d => ({ ...d, specId: '', productName: '' }))
  }
  // ë°°ì¹/ë¡í¸ ë²í¸ ìë ¥ ì ìì°ì¤ì¸ WOë¥¼ ì¡°íí´ ì íì ìë í¹ì íë¤. (#188)
  const onBatchNoBlur = () => {
    const wo = findWoByLot(draft.batchNo)
    if (!wo) return
    const s = specs.find(x => x.productName === wo.product)
    setDraft(d => ({
      ...d,
      productName: wo.product || d.productName,
      lotNo: wo.lot || d.lotNo,
      ...(s ? { specId: s.id, sterileMethod: s.sterileMethod } : {}),
    }))
  }

  const selectedSpec = specs.find(s => s.id === draft.specId)
  const cycleParams = cycleParamsFor(draft.sterileMethod)
  const validationSubstituted = !!(selectedSpec && selectedSpec.validationRef)

  const resultColor = v => BATCH_RESULTS.find(r => r.value === v)?.color || '#6B7280'

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>ì´ {batches.length}ê±´ì ë©¸ê·  ë°°ì¹ ê¸°ë¡ Â· í í´ë¦­ ì ì±ì ì íì¸</span>
        {canEdit && (
          <button onClick={openNew} style={{
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
            background: 'var(--moss)', color: '#fff', border: 'none', borderRadius: 6,
            padding: '7px 14px', cursor: 'pointer',
          }}>
            <PlusCircle size={15} /> ë°°ì¹ ê¸°ë¡ ì¶ê°
          </button>
        )}
      </div>

      {showForm && (
        <div style={{
          background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 10, padding: 20, marginBottom: 20,
        }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>
            {editing ? 'ë°°ì¹ ê¸°ë¡ ìì ' : 'ì ë©¸ê·  ë°°ì¹ ê¸°ë¡'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
            <Field label="ë°°ì¹/ë¡í¸ ë²í¸" required>
              <input style={inp} value={draft.batchNo} onChange={upd('batchNo')} onBlur={onBatchNoBlur} placeholder="ì: LOT-2024-001 (ìë ¥ ì ìì°ì¤ WOìì ì í ìëì¡°í)" />
            </Field>
            <Field label="ë©¸ê·  ì¼ì">
              <input type="date" style={inp} value={draft.date} onChange={upd('date')} />
            </Field>
            <Field label="ë©¸ê·  ì¬ì ì°ê²° (ì í í¹ì )">
              <select style={sel} value={draft.specId} onChange={onSpecChange}>
                <option value="">â ì í â</option>
                {specs.map(s => <option key={s.id} value={s.id}>{s.productName}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <Field label="ì í (ìë í¹ì ë¨)">
              <div style={{ ...inp, display: 'flex', alignItems: 'center', background: 'var(--bg-soft)', color: draft.productName ? 'var(--ink)' : 'var(--ink-faint)' }}>
                {draft.productName || 'ë°°ì¹ë²í¸ ìë ¥ ëë ë©¸ê·  ì¬ì ì í ì ìë íì'}
              </div>
            </Field>
            <Field label="ë©¸ê·  ë°©ë² (ì¬ì ì°ê²° ê¸°ì¤)">
              <div style={{ ...inp, display: 'flex', alignItems: 'center', background: 'var(--bg-soft)', color: 'var(--ink)' }}>
                {draft.sterileMethod}
              </div>
            </Field>
          </div>

          <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8, padding: 14, marginBottom: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: 'var(--ink-soft)' }}>ì¤ì¸¡ ì¬ì´í´ íë¼ë¯¸í° (ë©¸ê·  ë°©ë²ì ë°ë¼ ìë ¥ í­ëª©ì´ ë¬ë¼ì§ëë¤)</div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cycleParams.length}, 1fr)`, gap: 10 }}>
              {cycleParams.includes('temp') && (
                <Field label="ì¨ë (â)">
                  <input style={inp} value={draft.actualTemp} onChange={upd('actualTemp')} />
                </Field>
              )}
              {cycleParams.includes('time') && (
                <Field label="ìê° (ë¶)">
                  <input style={inp} value={draft.actualTime} onChange={upd('actualTime')} />
                </Field>
              )}
              {cycleParams.includes('pressure') && (
                <Field label="ìë ¥ (bar)">
                  <input style={inp} value={draft.actualPressure} onChange={upd('actualPressure')} />
                </Field>
              )}
              {cycleParams.includes('dose') && (
                <Field label="ì ë (kGy)">
                  <input style={inp} value={draft.actualDose} onChange={upd('actualDose')} />
                </Field>
              )}
            </div>
          </div>

          {!validationSubstituted && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <Field label="ë°ì´ì¤ë²ë  ê²°ê³¼ (CFU/ê°)">
                <input style={inp} value={draft.bioburdenResult} onChange={upd('bioburdenResult')} placeholder="ì: 12" />
              </Field>
              <Field label="ë¬ì± SAL">
                <input style={inp} value={draft.salAchieved} onChange={upd('salAchieved')} placeholder="ì: 10â»â¶" />
              </Field>
            </div>
          )}
          {validationSubstituted && (
            <div style={{ fontSize: 11.5, padding: '8px 12px', borderRadius: 8, background: 'var(--bg-soft)', color: 'var(--ink-faint)', marginBottom: 14 }}>
              â¹ ì´ ì íì ë°¸ë¦¬ë°ì´ì ì°¸ì¡°({selectedSpec.validationRef})ê° ë±ë¡ëì´ ìì´ ë°ì´ì¤ë²ë Â·SAL ê²°ê³¼ë ë°¸ë¦¬ë°ì´ì ê²°ê³¼ë¡ ëì²´ë©ëë¤.
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14, marginBottom: 14 }}>
            <Field label="í©/ë¶ íì " required>
              <select style={sel} value={draft.result} onChange={upd('result')}>
                {BATCH_RESULTS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </Field>
          </div>

          <Field label="ë¹ê³ ">
            <textarea style={textarea} value={draft.notes} onChange={upd('notes')} />
          </Field>

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={save} style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
              background: 'var(--moss)', color: '#fff', border: 'none', borderRadius: 6,
              padding: '7px 16px', cursor: 'pointer',
            }}>
              <Save size={14} /> ì ì¥
            </button>
            <button onClick={() => setShowForm(false)} style={{
              fontSize: 13, background: 'none', border: '1px solid var(--line)',
              borderRadius: 6, padding: '7px 14px', cursor: 'pointer', color: 'var(--ink-soft)',
            }}>ì·¨ì</button>
          </div>
        </div>
      )}

      {batches.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--ink-faint)', fontSize: 14 }}>
          ë±ë¡ë ë©¸ê·  ë°°ì¹ ê¸°ë¡ì´ ììµëë¤.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--line)', background: 'var(--bg-soft)' }}>
                {['ë°°ì¹ë²í¸', 'ì¼ì', 'ì íëª', 'ë©¸ê· ë°©ë²', 'ë°ì´ì¤ë²ë ', 'SAL', 'íì ', ''].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, fontSize: 12, color: 'var(--ink-soft)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {batches.map((b, i) => (
                <tr key={b.id} onClick={() => setCertRow(b)} style={{ borderBottom: '1px solid var(--line)', background: i % 2 ? 'var(--bg-soft)' : 'var(--bg-card)', cursor: 'pointer' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--ink)' }}>{b.batchNo}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--ink-soft)' }}>{b.date}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--ink)' }}>{b.productName || 'â'}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--ink-soft)', fontSize: 12 }}>{b.sterileMethod}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--ink-soft)' }}>{b.bioburdenResult || 'â'}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--ink-soft)' }}>{b.salAchieved || 'â'}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, borderRadius: 4, padding: '2px 7px',
                      background: resultColor(b.result) + '22', color: resultColor(b.result),
                    }}>
                      {BATCH_RESULTS.find(r => r.value === b.result)?.label || b.result}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px' }} onClick={e => e.stopPropagation()}>
                    {canEdit && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(b)} style={{
                          fontSize: 11, padding: '3px 8px', borderRadius: 4,
                          border: '1px solid var(--line)', background: 'none', cursor: 'pointer', color: 'var(--ink-soft)',
                        }}>ìì </button>
                        <button onClick={() => del(b.id)} style={{
                          fontSize: 11, padding: '3px 6px', borderRadius: 4,
                          border: '1px solid #FCA5A5', background: 'none', cursor: 'pointer', color: '#EF4444',
                        }}><Trash2 size={11} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {certRow && (
        <SterileModal title="ë©¸ê·  ë°°ì¹ ì±ì ì" onClose={() => setCertRow(null)}>
          <BatchCertificate batch={certRow} specs={specs} onClose={() => setCertRow(null)} />
        </SterileModal>
      )}
    </div>
  )
}

function SterileModal({ title, onClose, children }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.45)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--bg-card)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 520,
        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.18)', border: '1px solid var(--line)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)' }}>
            <XCircle size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function BatchCertificate({ batch, specs, onClose }) {
  const spec = specs.find(s => s.id === batch.specId)
  const Row = ({ label, value }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
      <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>{label}</span>
      <span style={{ fontSize: 12.5, color: 'var(--ink)' }}>{value || 'â'}</span>
    </div>
  )
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>ë©¸ê·  ë°°ì¹ ì±ì ì</div>
        <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Sterilization Batch Certificate Â· ISO 13485 Â§7.5.7</div>
      </div>
      <Row label="ë°°ì¹/ë¡í¸ ë²í¸" value={batch.batchNo} />
      <Row label="ë©¸ê·  ì¼ì" value={batch.date} />
      <Row label="ì íëª" value={batch.productName} />
      <Row label="ìì° ë¡í¸" value={batch.lotNo} />
      <Row label="ë©¸ê·  ë°©ë²" value={batch.sterileMethod} />
      <Row label="ì°ê²°ë ì¬ì" value={spec ? `${spec.productName} (SAL ${spec.salTarget})` : 'â (ì§ì  ìë ¥)'} />
      <Row label="ì¤ì¸¡ ì¨ë" value={batch.actualTemp ? `${batch.actualTemp}â` : ''} />
      <Row label="ì¤ì¸¡ ìê°" value={batch.actualTime ? `${batch.actualTime}ë¶` : ''} />
      <Row label="ì¤ì¸¡ ìë ¥" value={batch.actualPressure ? `${batch.actualPressure} bar` : ''} />
      <Row label="ì¤ì¸¡ ì ë" value={batch.actualDose} />
      <Row label="ë°ì´ì¤ë²ë  ê²°ê³¼" value={batch.bioburdenResult ? `${batch.bioburdenResult} CFU/ê°` : ''} />
      <Row label="ë¬ì± SAL" value={batch.salAchieved} />
      <Row label="í©/ë¶ íì " value={BATCH_RESULTS.find(r => r.value === batch.result)?.label || batch.result} />
      <Row label="ë¹ê³ " value={batch.notes} />
      <div style={{ display: 'flex', gap: 10, paddingTop: 16 }}>
        <button onClick={() => printSterileBatchCert(batch, spec)} style={{
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
          background: 'var(--moss)', color: '#fff', border: 'none', borderRadius: 6,
          padding: '7px 16px', cursor: 'pointer',
        }}>
          <FileText size={14} /> ì¸ì
        </button>
        <button onClick={onClose} style={{
          fontSize: 13, background: 'none', border: '1px solid var(--line)',
          borderRadius: 6, padding: '7px 14px', cursor: 'pointer', color: 'var(--ink-soft)',
        }}>ë«ê¸°</button>
      </div>
    </div>
  )
}

// ââââââââââââââââââââââââââââââââââââââââââââââââââââââ
//  TAB 3 â ì¬ì²ë¦¬Â·ë¼ë²¨ë§ ì ì± ë¬¸ì
// ââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function PolicyTab({ policy, setPolicy, canEdit }) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(policy)
  const upd = k => e => setDraft(d => ({ ...d, [k]: e.target.value }))
  const save = () => { setPolicy(draft); setEditing(false) }
  const openEdit = () => { setDraft({ ...policy }); setEditing(true) }

  // ê°ì  ì´ë ¥ ì¶ê°
  const addRev = () => {
    const row = { date: new Date().toISOString().slice(0, 10), revision: '', by: '', summary: '' }
    setDraft(d => ({ ...d, revisionHistory: [...(d.revisionHistory || []), row] }))
  }
  const updRev = (i, k, v) => {
    const h = [...draft.revisionHistory]
    h[i] = { ...h[i], [k]: v }
    setDraft(d => ({ ...d, revisionHistory: h }))
  }
  const delRev = i => setDraft(d => ({ ...d, revisionHistory: d.revisionHistory.filter((_, j) => j !== i) }))

  const SECTIONS = [
    { key: 'scope',               label: '1. ì ì© ë²ì' },
    { key: 'singleUseStatement',  label: '2. ë¨í ì¬ì© ëªì (Â§7.5.7 íì)' },
    { key: 'reprocessingPolicy',  label: '3. ì¬ì²ë¦¬ ì ì± (ì¬ì²ë¦¬ íì© ì íì ê²½ì°)' },
    { key: 'labelingReqs',        label: '4. ë¼ë²¨ë§ ìêµ¬ì¬í­' },
    { key: 'expiryTrackingMethod',label: '5. ì í¨ê¸°ê° ì¶ì  ë°©ë²' },
    { key: 'postMarketMonitoring',label: '6. ìí í ë©¸ê·  ëª¨ëí°ë§' },
  ]

  return (
    <div>
      {/* ë¬¸ì í¤ë â ì½ê¸° ì ì© ë·° */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>ë©¸ê· ê´ë¦¬ ì ì°¨ì</div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
            Sterilization Management Procedure Â· ISO 13485 Â§7.5.7 â ì¬ì²ë¦¬ ì í Â· ë¼ë²¨ë§ Â· ì í¨ê¸°ê° ì¶ì 
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => printSterilizationProcedure(policy)} style={{
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
            background: 'none', border: '1px solid var(--line)',
            borderRadius: 6, padding: '7px 14px', cursor: 'pointer', color: 'var(--ink-soft)',
          }}><FileText size={14} /> ì¸ì</button>
          {canEdit && (
            <button onClick={openEdit} style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
              background: 'var(--moss)', color: '#fff', border: 'none',
              borderRadius: 6, padding: '7px 14px', cursor: 'pointer',
            }}><Edit2 size={13} /> ì ì°¨ì í¸ì§</button>
          )}
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 16, padding: '8px 12px', background: 'var(--bg-soft)', borderRadius: 6 }}>
        ì´ íë©´ì ë©¸ê· ê´ë¦¬ ì ì°¨ì ë´ì©ì ì¡°í ì ì©ì¼ë¡ íìí©ëë¤. ì ì°¨ìê° ìì ëë©´ ì´ íë©´ìë ì¦ì ëì¼í ë´ì©ì´ ë°ìë©ëë¤.
      </div>

      {/* ë¬¸ì ë©í ì ë³´ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-faint)' }}>ê°ì ë²í¸</div>
          <div style={{ fontSize: 14, color: 'var(--ink)', marginTop: 3 }}>{policy.revision || 'â'}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-faint)' }}>ë°íì¼</div>
          <div style={{ fontSize: 14, color: 'var(--ink)', marginTop: 3 }}>{policy.issueDate || 'â'}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-faint)' }}>ì¹ì¸ì</div>
          <div style={{ fontSize: 14, color: 'var(--ink)', marginTop: 3 }}>{policy.approvedBy || 'â'}</div>
        </div>
      </div>

      {/* ë¬¸ì ë³¸ë¬¸ â ì½ê¸° ì ì© */}
      {SECTIONS.map(({ key, label }) => (
        <div key={key} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 5 }}>{label}</div>
          <div style={{
            fontSize: 13, color: policy[key] ? 'var(--ink)' : 'var(--ink-faint)',
            lineHeight: 1.6, background: 'var(--bg-soft)', borderRadius: 6, padding: 10, minHeight: 48, whiteSpace: 'pre-line',
          }}>
            {policy[key] || <em>ë¯¸ìë ¥</em>}
          </div>
        </div>
      ))}

      {/* ê°ì  ì´ë ¥ â ì½ê¸° ì ì© */}
      <div style={{ marginTop: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>ê°ì  ì´ë ¥</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)', background: 'var(--bg-soft)' }}>
              {['ë ì§', 'ê°ì ë²í¸', 'ìì±ì', 'ë´ì© ìì½'].map(h => (
                <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--ink-soft)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(policy.revisionHistory || []).map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '6px 10px' }}>{r.date}</td>
                <td style={{ padding: '6px 10px' }}>{r.revision}</td>
                <td style={{ padding: '6px 10px' }}>{r.by}</td>
                <td style={{ padding: '6px 10px' }}>{r.summary}</td>
              </tr>
            ))}
            {(policy.revisionHistory || []).length === 0 && (
              <tr><td colSpan={4} style={{ padding: '12px 10px', color: 'var(--ink-faint)', fontSize: 13 }}>ê°ì  ì´ë ¥ ìì</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* í¸ì§ ëª¨ë¬ â ì ì¥ ì¦ì ì ì¡°í íë©´ì ë°ìë¨ (ëì¼ ë°ì´í° ìì¤) */}
      {editing && (
        <SterileModal title="ë©¸ê· ê´ë¦¬ ì ì°¨ì í¸ì§" onClose={() => setEditing(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
            <Field label="ê°ì ë²í¸">
              <input style={inp} value={draft.revision} onChange={upd('revision')} />
            </Field>
            <Field label="ë°íì¼">
              <input type="date" style={inp} value={draft.issueDate} onChange={upd('issueDate')} />
            </Field>
            <Field label="ì¹ì¸ì">
              <input style={inp} value={draft.approvedBy} onChange={upd('approvedBy')} />
            </Field>
          </div>

          {[
            { key: 'scope',               label: 'ì ì© ë²ì', ph: 'ì´ ì ì±ì´ ì ì©ëë ë©¸ê·  ìë£ê¸°ê¸° ì íêµ° ê¸°ì ' },
            { key: 'singleUseStatement',  label: 'ë¨í ì¬ì© ëªì (Â§7.5.7 íì)', ph: 'ëª¨ë  ë©¸ê·  ìë£ê¸°ê¸°ë ë¨í ì¬ì© ì íì¼ë¡ ì¬ì²ë¦¬ë¥¼ ê¸ì§íë¤. ë¨, ...' },
            { key: 'reprocessingPolicy',  label: 'ì¬ì²ë¦¬ ì ì± (ì¬ì²ë¦¬ íì© ì íì ê²½ì°)', ph: 'ì¬ì²ë¦¬ íì© ì íì´ ìë ê²½ì° "í´ë¹ ìì" ê¸°ì¬' },
            { key: 'labelingReqs',        label: 'ë¼ë²¨ë§ ìêµ¬ì¬í­', ph: 'ë©¸ê·  ìí íì, ì í¨ê¸°ê°, ë¡í¸ë²í¸, ë¨íì© ê¸°í¸(âº ê¸ì§) ë± ISO 15223 ê¸°í¸ ì¬ì© ë´ì­' },
            { key: 'expiryTrackingMethod',label: 'ì í¨ê¸°ê° ì¶ì  ë°©ë²', ph: 'ì íë³ ë©¸ê·  ì í¨ê¸°ê° ì¤ì  ê·¼ê±° ë° ì¶ì  ìì¤í ê¸°ì ' },
            { key: 'postMarketMonitoring',label: 'ìí í ë©¸ê·  ëª¨ëí°ë§', ph: 'ìí í ë©¸ê·  ì ì§ íì¸, í¬ì¥ ìì ì± ëª¨ëí°ë§ ë°©ë² ê¸°ì ' },
          ].map(({ key, label, ph }) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 5 }}>{label}</div>
              <textarea style={textarea} value={draft[key]} onChange={upd(key)} placeholder={ph} />
            </div>
          ))}

          {/* ê°ì  ì´ë ¥ í¸ì§ */}
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>ê°ì  ì´ë ¥</div>
              <button onClick={addRev} style={{
                fontSize: 12, background: 'none', border: '1px solid var(--line)',
                borderRadius: 5, padding: '3px 10px', cursor: 'pointer', color: 'var(--ink-soft)',
              }}>+ ì¶ê°</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)', background: 'var(--bg-soft)' }}>
                  {['ë ì§', 'ê°ì ë²í¸', 'ìì±ì', 'ë´ì© ìì½', ''].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--ink-soft)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(draft.revisionHistory || []).map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '6px 10px' }}>
                      <input style={{ ...inp, padding: '3px 6px' }} value={r.date} onChange={e => updRev(i, 'date', e.target.value)} />
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <input style={{ ...inp, padding: '3px 6px' }} value={r.revision} onChange={e => updRev(i, 'revision', e.target.value)} />
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <input style={{ ...inp, padding: '3px 6px' }} value={r.by} onChange={e => updRev(i, 'by', e.target.value)} />
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <input style={{ ...inp, padding: '3px 6px' }} value={r.summary} onChange={e => updRev(i, 'summary', e.target.value)} />
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <button onClick={() => delRev(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
                {(draft.revisionHistory || []).length === 0 && (
                  <tr><td colSpan={5} style={{ padding: '12px 10px', color: 'var(--ink-faint)', fontSize: 13 }}>ê°ì  ì´ë ¥ ìì</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button onClick={save} style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
              background: 'var(--moss)', color: '#fff', border: 'none', borderRadius: 6,
              padding: '7px 16px', cursor: 'pointer',
            }}>
              <Save size={14} /> ì ì¥
            </button>
            <button onClick={() => setEditing(false)} style={{
              fontSize: 13, background: 'none', border: '1px solid var(--line)',
              borderRadius: 6, padding: '7px 14px', cursor: 'pointer', color: 'var(--ink-soft)',
            }}>ì·¨ì</button>
          </div>
        </SterileModal>
      )}
    </div>
  )
}

// ââââââââââââââââââââââââââââââââââââââââââââââââââââââ
//  TAB 4 â íí© ë¶ì
// ââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function AnalysisTab({ specs, batches, compl }) {
  // ë°°ì¹ ê²°ê³¼ ì§ê³ (ì ì²´)
  const passCount  = batches.filter(b => b.result === 'pass').length
  const failCount  = batches.filter(b => b.result === 'fail').length
  const condCount  = batches.filter(b => b.result === 'conditional').length

  // ë°¸ë¦¬ë°ì´ì ìí ë¶í¬
  const statusMap = {}
  SPEC_STATUSES.forEach(s => { statusMap[s.value] = 0 })
  specs.forEach(s => { statusMap[s.status] = (statusMap[s.status] || 0) + 1 })

  // ê²½ê³ 
  const warnings = []
  if (specs.some(s => !s.validationRef)) warnings.push('ë°¸ë¦¬ë°ì´ì ì°¸ì¡°ê° ìë ì¬ìì´ ììµëë¤.')
  if (specs.some(s => !s.packagingRef))  warnings.push('í¬ì¥ ë°¸ë¦¬ë°ì´ì ì°¸ì¡°ê° ìë ì¬ìì´ ììµëë¤.')
  if (specs.some(s => !s.expiryMonths)) warnings.push('ë©¸ê·  ì í¨ê¸°ê°ì´ ì¤ì ëì§ ìì ì¬ìì´ ììµëë¤.')
  if (failCount > 0) warnings.push(`ë¶í©ê²© ë°°ì¹ ${failCount}ê±´ì´ ììµëë¤.`)

  const bar = (val, max, color) => (
    <div style={{ height: 12, borderRadius: 6, background: 'var(--line)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${max > 0 ? (val / max) * 100 : 0}%`, background: color, borderRadius: 6 }} />
    </div>
  )

  // ìë³ ë©¸ê·  ë°°ì¹ í©ê²©ë¥  + ìë³ ë©¸ê· ë°©ë²ë³ ì í ì (batches ê¸°ì¤ ì§ê³)
  const monthly = useMemo(() => {
    const map = {}
    batches.forEach(b => {
      const m = (b.date || '').slice(0, 7) || 'ë¯¸ì'
      if (!map[m]) map[m] = { total: 0, pass: 0, fail: 0, cond: 0, methods: {} }
      map[m].total += 1
      if (b.result === 'pass') map[m].pass += 1
      else if (b.result === 'fail') map[m].fail += 1
      else if (b.result === 'conditional') map[m].cond += 1
      const method = b.sterileMethod || 'ë¯¸ì§ì '
      if (!map[m].methods[method]) map[m].methods[method] = new Set()
      if (b.productName) map[m].methods[method].add(b.productName)
    })
    return Object.keys(map).sort().reverse().map(m => {
      const d = map[m]
      return {
        month: m,
        total: d.total, pass: d.pass, fail: d.fail, cond: d.cond,
        passRate: d.total ? Math.round((d.pass / d.total) * 100) : 0,
        methodCounts: Object.entries(d.methods)
          .map(([method, set]) => ({ method, count: set.size }))
          .sort((a, b) => b.count - a.count),
      }
    })
  }, [batches])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ìë³ ë©¸ê·  ë°°ì¹ í©ê²©ë¥  */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>ìë³ ë©¸ê·  ë°°ì¹ í©ê²©ë¥ </div>
        {monthly.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--ink-faint)', fontSize: 13 }}>
            ë©¸ê·  ë°°ì¹ ê¸°ë¡ì ë±ë¡íë©´ ìë³ í©ê²©ë¥ ì´ íìë©ëë¤.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {monthly.map(m => (
              <div key={m.month} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--bg-soft)', borderRadius: 8 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', minWidth: 64 }}>{m.month}</span>
                <div style={{ flex: 1 }}>{bar(m.pass, m.total, m.passRate >= 95 ? '#10B981' : m.passRate >= 80 ? '#F59E0B' : '#EF4444')}</div>
                <span style={{ fontSize: 12.5, color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>{m.total}ê±´ Â· í©ê²©ë¥  {m.passRate}%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ìë³ ë©¸ê· ë°©ë²ë³ ì í ì */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>ìë³ ë©¸ê· ë°©ë²ë³ ì í ì</div>
        {monthly.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--ink-faint)', fontSize: 13 }}>
            ë©¸ê·  ë°°ì¹ ê¸°ë¡ì ë±ë¡íë©´ ìë³ ë©¸ê· ë°©ë²ë³ ì í ìê° íìë©ëë¤.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {monthly.map(m => (
              <div key={m.month}>
                <div style={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>{m.month}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {m.methodCounts.map(({ method, count }) => (
                    <span key={method} style={{
                      fontSize: 12, padding: '4px 10px', borderRadius: 999,
                      background: '#EDE9FE', color: '#7C3AED', fontWeight: 600,
                    }}>{method} Â· {count}ê°</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ë°¸ë¦¬ë°ì´ì ìí */}
      {specs.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>ë°¸ë¦¬ë°ì´ì ìí íí©</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {SPEC_STATUSES.map(s => (
              <div key={s.value} style={{
                background: s.color + '18', border: `1px solid ${s.color}44`, borderRadius: 8, padding: '10px 16px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{statusMap[s.value] || 0}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ê²½ê³  */}
      {warnings.length > 0 && (
        <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#92400E', marginBottom: 8 }}>
            <AlertTriangle size={16} /> ê°ì  íì í­ëª©
          </div>
          {warnings.map((w, i) => (
            <div key={i} style={{ fontSize: 13, color: '#78350F', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span>â¢</span> {w}
            </div>
          ))}
        </div>
      )}

      {specs.length === 0 && batches.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--ink-faint)', fontSize: 14 }}>
          ì¬ì ë° ë°°ì¹ ê¸°ë¡ì ë±ë¡íë©´ ë¶ì ê²°ê³¼ê° íìë©ëë¤.
        </div>
      )}
    </div>
  )
}

// ââââââââââââââââââââââââââââââââââââââââââââââââââââââ
//  MAIN HUB
// ââââââââââââââââââââââââââââââââââââââââââââââââââââââ
export default function SterileControlHub() {
  const user    = auth.current()
  const canEdit = (user?.level || 0) >= 2
  const nav = useNavigate()

  // ë©¸ê·  ë°©ë² ì¬ìì ì íÂ·ê³µì  íë©´(ì í ê°ë°)ìì ìë ¥ë ì í ë ì½ëë¡ë¶í° íìëë¤ (SSoT).
  const specs = useMemo(() => deriveSterileSpecs(onboarding.load()?.products || []), [])
  const [batches,  setBatchesRaw] = useState(() => lsGet(BATCHES_KEY, []))
  const [policy,   setPolicyRaw]  = useState(() => lsGet(POLICY_KEY,  DEFAULT_POLICY))
  const [tab,      setTab]        = useState('specs')

  const setBatches = v => { setBatchesRaw(v); lsSet(BATCHES_KEY, v) }
  const setPolicy  = v => { setPolicyRaw(v);  lsSet(POLICY_KEY,  v) }

  const goToProduct = (productId) => nav('/products?tab=product&productId=' + encodeURIComponent(productId) + '&detailTab=info')
  const goToProducts = () => nav('/products?tab=product')

  const compl = useCompleteness(specs, batches, policy)

  const TABS = [
    { id: 'specs',   label: 'ë©¸ê·  ë°©ë² ì¬ì',    icon: Beaker },
    { id: 'batches', label: 'ë©¸ê·  ë°°ì¹ ê¸°ë¡',    icon: ClipboardList },
    { id: 'policy',  label: 'ì¬ì²ë¦¬Â·ë¼ë²¨ë§ ì ì±', icon: FileText },
    { id: 'analysis',label: 'íí© ë¶ì',          icon: BarChart2 },
  ]

  return (
    <AppLayout user={user} title="ë©¸ê·  ìë£ê¸°ê¸° ê´ë¦¬" subtitle="ISO 13485 Â§7.5.7 â ë©¸ê·  ë°©ë² Â· ë°°ì¹ ê¸°ë¡ Â· ì¬ì²ë¦¬ ì ì±">
      <HubBanner title="ë©¸ê·  ìë£ê¸°ê¸° ê´ë¦¬" subtitle="ISO 13485 Â§7.5.5 â ë©¸ê·  ê³µì  ì í¨ì± íì¸ ë° ì ì§" icon={Shield} color="#7C3AED" />
      {/* Â§7.5.7 ì ë³´ ë°°ë */}
      <div style={{
        background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
        border: '1px solid #BFDBFE', borderRadius: 10, padding: '12px 16px',
        marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 12,
      }}>
        <ShieldCheck size={20} style={{ color: '#2563EB', flexShrink: 0, marginTop: 1 }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1E40AF' }}>ISO 13485 Â§7.5.7 â ë©¸ê·  ìë£ê¸°ê¸° í¹ë³ ìêµ¬ì¬í­</div>
          <div style={{ fontSize: 12, color: '#3B82F6', marginTop: 2 }}>
            ë©¸ê·  ìë£ê¸°ê¸° ì ì¡° ì ë©¸ê·  ë°©ë² ë°¸ë¦¬ë°ì´ì ê¸°ë¡ ì ì§ Â· SAL ë¬ì± íì¸ Â· ë¨í ì¬ì© íì Â· ë©¸ê·  ì í¨ê¸°ê° ë¼ë²¨ íê¸° ìë¬´
          </div>
        </div>
        {/* ìì ì± ë±ì§ */}
        <div style={{
          marginLeft: 'auto', flexShrink: 0,
          background: compl.pct >= 80 ? '#D1FAE5' : compl.pct >= 50 ? '#FEF3C7' : '#FEE2E2',
          color:      compl.pct >= 80 ? '#065F46' : compl.pct >= 50 ? '#92400E'  : '#991B1B',
          border: '1px solid ' + (compl.pct >= 80 ? '#6EE7B7' : compl.pct >= 50 ? '#FCD34D' : '#FCA5A5'),
          borderRadius: 8, padding: '6px 14px', fontWeight: 700, fontSize: 14, textAlign: 'center', minWidth: 80,
        }}>
          {compl.pct}%
          <div style={{ fontSize: 10, fontWeight: 400 }}>{compl.done}/{compl.total}</div>
        </div>
      </div>

      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--line)',
        borderRadius: 12, padding: 24,
      }}>
        <TabBar tabs={TABS} active={tab} onSelect={setTab} />

        {tab === 'specs'    && <SpecTab     specs={specs}   canEdit={canEdit} onNavigateToProduct={goToProduct} onNavigateToProducts={goToProducts} />}
        {tab === 'batches'  && <BatchTab    batches={batches} setBatches={setBatches} specs={specs} canEdit={canEdit} />}
        {tab === 'policy'   && <PolicyTab   policy={policy} setPolicy={setPolicy}  canEdit={canEdit} />}
        {tab === 'analysis' && <AnalysisTab specs={specs}   batches={batches}      compl={compl} />}
      </div>
    </AppLayout>
  )
}
