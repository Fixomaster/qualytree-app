// src/pages/risk/RiskHub.jsx
// ISO 14971 ìíê´ë¦¬ íë¸ â FMEA ìí ë±ë¡ë¶ Â· ìí ë§¤í¸ë¦­ì¤ Â· ì ê° ì¡°ì¹
import React, { useState, useMemo, useEffect } from 'react'
import {
  AlertTriangle, Plus, Trash2, Search, ShieldAlert,
  ChevronDown, ChevronUp, CheckCircle2, Info,
  TrendingDown, Grid, List, Edit3, X, Sparkles, Loader2,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'
import { supabase } from '../../lib/supabaseClient'
import { supabase } from '../../lib/supabaseClient'
import { useSearchParams } from 'react-router-dom'

// ââ localStorage ââââââââââââââââââââââââââââââââââââââââââââââ
const LS_KEY = 'qualytree.risks'

function lsRead() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}
function lsWrite(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data))
}

function genId() {
  const y = new Date().getFullYear()
  return `RSK-${y}-${String(Date.now()).slice(-5)}`
}

// ââ ì¬ê°ë / ë°ìê°ë¥ì± ì ì ââââââââââââââââââââââââââââââââââ
const SEVERITY = [
  { value: 1, label: '1-ê²½ë¯¸', desc: 'ì¼ìì  ë¶í¸, ìì° íë³µ' },
  { value: 2, label: '2-ì', desc: 'ê°ì­ì  ìí´, ìë£ ê°ì ë¶íì' },
  { value: 3, label: '3-ì¤', desc: 'ê°ì­ì  ìí´, ìë£ ê°ì íì' },
  { value: 4, label: '4-ì¤ë', desc: 'ë¹ê°ì­ì  ìí´ / ìêµ¬ ì¥ì ' },
  { value: 5, label: '5-ì¹ëª', desc: 'ì¬ë§ ëë ìëª ìí' },
]

const PROBABILITY = [
  { value: 1, label: '1-ê±°ììì', desc: '< 1/100,000' },
  { value: 2, label: '2-ë®ì', desc: '1/100,000 ~ 1/10,000' },
  { value: 3, label: '3-ë³´íµ', desc: '1/10,000 ~ 1/1,000' },
  { value: 4, label: '4-ëì', desc: '1/1,000 ~ 1/100' },
  { value: 5, label: '5-ë§¤ì°ëì', desc: '> 1/100' },
]

const CONTROL_TYPES = [
  { value: 'inherent', label: 'ê³ ì  ìì  ì¤ê³' },
  { value: 'protective', label: 'ë³´í¸ ìë¨' },
  { value: 'information', label: 'ìì  ì ë³´ ì ê³µ' },
  { value: 'none', label: 'ë¯¸ì¡°ì¹' },
]

const RISK_CATEGORIES = [
  'ìë¬¼íì ', 'ì ê¸°ì ', 'ìëì§', 'ê¸°ê³ì ', 'ë°©ì¬ì ', 'ìíí¸ì¨ì´',
  'ì¬ì© ì¤ë¥', 'ë³´ê´Â·ì´ë°', 'ìì²´ì í©ì±', 'ê¸°í',
]

// RPN(ìí ì°ì ìì) ê¸°ì¤
function rpnColor(rpn) {
  if (rpn >= 15) return { bg: '#FEE2E2', text: '#991B1B', label: 'íì©ë¶ê°' }
  if (rpn >= 8)  return { bg: '#FEF3C7', text: '#92400E', label: 'ì¡°ê±´ë¶íì©' }
  return { bg: '#D1FAE5', text: '#065F46', label: 'íì©ê°ë¥' }
}

function matrixColor(s, p) {
  const rpn = s * p
  if (rpn >= 15 || (s >= 4 && p >= 3) || (s === 5 && p >= 2)) return '#EF4444'
  if (rpn >= 8  || (s >= 3 && p >= 3)) return '#F59E0B'
  return '#10B981'
}

// ââ ë¹ í¼ âââââââââââââââââââââââââââââââââââââââââââââââââââââ
const emptyForm = () => ({
  id: '', productKey: '', title: '', category: '',
  hazard: '', hazardousSituation: '', harm: '',
  severity: 3, probability: 3,
  controlType: 'protective', controlMeasure: '',
  residualSeverity: 2, residualProbability: 2,
  verified: false, verifiedAt: '', notes: '',
  createdBy: '', createdAt: '',
})

let _sbCidRisk = null

// ââ ë©ì¸ ì»´í¬ëí¸ âââââââââââââââââââââââââââââââââââââââââââââ
export default function RiskHub({ embedded = false, productKey: scopeProductKey = null, productLabel = '' } = {}) {
  const user = auth.current()
  const [searchParams] = useSearchParams()
  // #284: ì íê³µì (ProductsHub)ì ìë² ëë  ëë í´ë¹ ì í(productKey)ì ìíë§ ë¸ì¶íë¤.
  const scopeKey = scopeProductKey || searchParams.get('productId') || null
  const [risks, setRisks] = useState(() => lsRead())
  const [tab, setTab] = useState('register')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [editId, setEditId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [catFilter, setCatFilter] = useState('all')
  const [showAiModal, setShowAiModal] = useState(false)

  const save = (data) => {
    setRisks(data)
    lsWrite(data)
    if (_sbCidRisk) {
      supabase.from('company_data').upsert({
        company_id: _sbCidRisk, data_type: 'localStorage_sync',
        data_key: LS_KEY, payload: data
      }, { onConflict: 'company_id,data_type,data_key' })
    }
  }

  const openNew = () => {
    setForm({ ...emptyForm(), productKey: scopeKey || '' })
    setEditId(null)
    setShowForm(true)
  }

  const openFromAi = (item) => {
    setForm({ ...emptyForm(), ...item, title: item.hazard })
    setEditId(null)
    setShowAiModal(false)
    setShowForm(true)
  }

  const openEdit = (r) => {
    setForm({ ...r })
    setEditId(r.id)
    setShowForm(true)
  }

  const submit = () => {
    if (!form.title || !form.harm) return alert('ì ëª©ê³¼ ìí´(Harm)ë íììëë¤.')
    const now = new Date().toISOString()
    if (editId) {
      const updated = risks.map(r => r.id === editId ? { ...form, id: editId } : r)
      save(updated)
    } else {
      const newR = { ...form, id: genId(), createdAt: now, createdBy: user?.name || '-' }
      save([newR, ...risks])
    }
    setShowForm(false)
    setForm(emptyForm())
    setEditId(null)
  }

  const remove = (id) => {
    if (!confirm('ì­ì íìê² ìµëê¹?')) return
    save(risks.filter(r => r.id !== id))
  }

  const toggleVerify = (id) => {
    const updated = risks.map(r => r.id === id
      ? { ...r, verified: !r.verified, verifiedAt: !r.verified ? new Date().toISOString().slice(0, 10) : '' }
      : r)
    save(updated)
  }

  const fld = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const filtered = useMemo(() => {
    let list = risks
    if (scopeKey) list = list.filter(r => r.productKey === scopeKey)
    if (catFilter !== 'all') list = list.filter(r => r.category === catFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r => (r.id + r.title + r.harm + r.hazard).toLowerCase().includes(q))
    }
    return list.sort((a, b) => (b.severity * b.probability) - (a.severity * a.probability))
  }, [risks, search, catFilter])

  const scopedRisks = scopeKey ? risks.filter(r => r.productKey === scopeKey) : risks
  const stats = {
    total: scopedRisks.length,
    high: scopedRisks.filter(r => r.severity * r.probability >= 15).length,
    med: scopedRisks.filter(r => { const n = r.severity * r.probability; return n >= 8 && n < 15 }).length,
    low: scopedRisks.filter(r => r.severity * r.probability < 8).length,
    verified: scopedRisks.filter(r => r.verified).length,
  }

  const TABS = [
    { key: 'register', label: 'ìí ë±ë¡ë¶', icon: List },
    { key: 'matrix',   label: 'ìí ë§¤í¸ë¦­ì¤', icon: Grid },
    { key: 'control',  label: 'ì ê° ì¡°ì¹ íí©', icon: TrendingDown },
  ]

  const body = (
    <>
      <div className={embedded ? '' : 'px-6 lg:px-8 py-6 max-w-[1280px] mx-auto'}>

        {/* ë°°ë (ìë² ë ì ì¨ê¹ â ìì ProductsHub í¤ë ì¬ì©) */}
        {!embedded && (
        <HubBanner
          title="ìíê´ë¦¬"
          subtitle="ISO 14971:2019 Â· FMEA Â· ìí ë¶ì Â· íì©ê¸°ì¤ íê°"
          icon={ShieldAlert}
          color="#EF4444"
          quickActions={[
            { label: 'ìí í­ëª© ì¶ê°', icon: Plus, onClick: openNew, primary: true },
            { label: 'AI ì´ì ìì±', icon: Sparkles, onClick: () => setShowAiModal(true) },
          ]}
          workflow={['ìí ìë³', 'ìí ì¶ì  (SÃP)', 'ìí íê°', 'ìí íµì ', 'ìì¬ìí íê°', 'ë³´ê³ ì ìì±']}
        />
        )}

        {/* KPI ì¹´ë */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'ì´ ìí í­ëª©', count: stats.total, color: '#6B7280' },
            { label: 'íì©ë¶ê° (ë¹¨ê°)', count: stats.high, color: '#EF4444' },
            { label: 'ì¡°ê±´ë¶íì© (ë¸ë)', count: stats.med, color: '#F59E0B' },
            { label: 'íì©ê°ë¥ (ì´ë¡)', count: stats.low, color: '#10B981' },
            { label: 'ê²ì¦ ìë£', count: stats.verified, color: '#3B82F6' },
          ].map(s => (
            <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="text-[22px] font-bold" style={{ color: s.color }}>{s.count}</div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* í­ */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: 'var(--bg-soft)', width: 'fit-content' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition"
              style={{
                background: tab === t.key ? 'var(--bg-card)' : 'transparent',
                color: tab === t.key ? 'var(--ink)' : 'var(--ink-faint)',
                border: 'none', cursor: 'pointer',
                boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {/* ââ ìí ë±ë¡ë¶ í­ ââ */}
        {tab === 'register' && (
          <>
            <div className="flex gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-[200px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                <Search size={14} style={{ color: 'var(--ink-faint)' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="ìíID Â· ì ëª© Â· ìí´ ê²ì..."
                  className="flex-1 text-[13px] outline-none"
                  style={{ background: 'none', border: 'none', color: 'var(--ink)' }}
                />
              </div>
              <select
                value={catFilter}
                onChange={e => setCatFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-[13px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}
              >
                <option value="all">ì ì²´ ì í</option>
                {RISK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button
                onClick={() => setShowAiModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold"
                style={{ background: 'var(--bg-card)', color: '#7C3AED', border: '1px solid #7C3AED40', cursor: 'pointer' }}
              >
                <Sparkles size={14} /> AI ì´ì ìì±
              </button>
              <button
                onClick={openNew}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold"
                style={{ background: '#EF4444', color: 'white', border: 'none', cursor: 'pointer' }}
              >
                <Plus size={14} /> ìí í­ëª© ì¶ê°
              </button>
            </div>

            {filtered.length === 0 ? (
              <EmptyState onAdd={openNew} />
            ) : (
              <div className="space-y-2">
                {filtered.map(r => (
                  <RiskRow
                    key={r.id}
                    risk={r}
                    expanded={expandedId === r.id}
                    onToggle={() => setExpandedId(expandedId === r.id ? null : r.id)}
                    onEdit={() => openEdit(r)}
                    onDelete={() => remove(r.id)}
                    onVerify={() => toggleVerify(r.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ââ ìí ë§¤í¸ë¦­ì¤ í­ ââ */}
        {tab === 'matrix' && <RiskMatrix risks={scopedRisks} />}

        {/* ââ ì ê° ì¡°ì¹ íí© í­ ââ */}
        {tab === 'control' && <ControlStatus risks={scopedRisks} onEdit={openEdit} />}
      </div>

      {/* ìí ì¶ê°/ìì  ëª¨ë¬ */}
      {showForm && (
        <RiskForm
          form={form}
          fld={fld}
          editId={editId}
          onSubmit={submit}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* AI ì´ì ìì± ëª¨ë¬ */}
      {showAiModal && (
        <AiDraftModal onClose={() => setShowAiModal(false)} onUse={openFromAi} />
      )}
    </>
  )

  if (embedded) return body

  return (
    <AppLayout user={user} title="ìíê´ë¦¬" subtitle="ISO 14971 ìíë¶ì Â· FMEA Â· ìí ë±ë¡ë¶">
      {body}
    </AppLayout>
  )
}

// ââ ìí í ì»´í¬ëí¸ ââââââââââââââââââââââââââââââââââââââââââ
function RiskRow({ risk, expanded, onToggle, onEdit, onDelete, onVerify }) {
  const rpn = risk.severity * risk.probability
  const residualRpn = risk.residualSeverity * risk.residualProbability
  const { bg, text, label } = rpnColor(rpn)

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
      {/* í¤ë í */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={onToggle}
        style={{ borderBottom: expanded ? '1px solid var(--line)' : 'none' }}
      >
        {/* RPN ë°°ì§ */}
        <div
          className="flex-shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center"
          style={{ background: bg }}
        >
          <div className="text-[17px] font-bold leading-none" style={{ color: text }}>{rpn}</div>
          <div className="text-[8px] font-semibold mt-0.5" style={{ color: text }}>RPN</div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[11px]" style={{ color: 'var(--ink-faint)' }}>{risk.id}</span>
            {risk.category && (
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>
                {risk.category}
              </span>
            )}
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: bg, color: text }}
            >
              {label}
            </span>
            {risk.verified && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: '#DBEAFE', color: '#1D4ED8' }}>
                â ê²ì¦ìë£
              </span>
            )}
          </div>
          <div className="text-[13.5px] font-semibold mt-0.5 truncate" style={{ color: 'var(--ink)' }}>
            {risk.title || '(ì ëª© ìì)'}
          </div>
          <div className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--ink-faint)' }}>
            ìí´: {risk.harm || '-'} &nbsp;|&nbsp; ì¬ê°ë {risk.severity} Ã ë°ìê°ë¥ì± {risk.probability}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={e => { e.stopPropagation(); onVerify() }}
            title={risk.verified ? 'ê²ì¦ ì·¨ì' : 'ê²ì¦ ìë£ ì²ë¦¬'}
            className="p-1.5 rounded-lg"
            style={{ background: risk.verified ? '#DBEAFE' : 'var(--bg-soft)', color: risk.verified ? '#1D4ED8' : 'var(--ink-faint)', border: 'none', cursor: 'pointer' }}
          >
            <CheckCircle2 size={14} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onEdit() }}
            className="p-1.5 rounded-lg"
            style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)', border: 'none', cursor: 'pointer' }}
          >
            <Edit3 size={14} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="p-1.5 rounded-lg"
            style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', cursor: 'pointer' }}
          >
            <Trash2 size={13} />
          </button>
          {expanded ? <ChevronUp size={16} style={{ color: 'var(--ink-faint)' }} /> : <ChevronDown size={16} style={{ color: 'var(--ink-faint)' }} />}
        </div>
      </div>

      {/* íì¥ ìì¸ */}
      {expanded && (
        <div className="px-4 py-4 grid gap-4 md:grid-cols-2">
          <div>
            <Label>ìíìì¸ (Hazard)</Label>
            <Value>{risk.hazard || '-'}</Value>
            <Label>ìí ìí© (Hazardous Situation)</Label>
            <Value>{risk.hazardousSituation || '-'}</Value>
            <Label>ìí´ (Harm)</Label>
            <Value>{risk.harm || '-'}</Value>
          </div>
          <div>
            <Label>ì´ê¸° ìí íê°</Label>
            <div className="flex gap-3 mb-3">
              <ScoreBox label="ì¬ê°ë" val={risk.severity} />
              <span className="self-center text-[18px] font-bold" style={{ color: 'var(--ink-faint)' }}>Ã</span>
              <ScoreBox label="ë°ìê°ë¥ì±" val={risk.probability} />
              <span className="self-center text-[18px] font-bold" style={{ color: 'var(--ink-faint)' }}>=</span>
              <ScoreBox label="RPN" val={rpn} color={text} bg={bg} />
            </div>
            <Label>ìí íµì  ì¡°ì¹</Label>
            <Value>{risk.controlMeasure || '-'} ({CONTROL_TYPES.find(c => c.value === risk.controlType)?.label || '-'})</Value>
            <Label>ìì¬ ìí (ì ê° í)</Label>
            <div className="flex gap-3">
              <ScoreBox label="ìì¬ ì¬ê°ë" val={risk.residualSeverity} />
              <span className="self-center text-[18px] font-bold" style={{ color: 'var(--ink-faint)' }}>Ã</span>
              <ScoreBox label="ìì¬ ë°ìê°ë¥ì±" val={risk.residualProbability} />
              <span className="self-center text-[18px] font-bold" style={{ color: 'var(--ink-faint)' }}>=</span>
              <ScoreBox label="ìì¬ RPN" val={residualRpn} color={rpnColor(residualRpn).text} bg={rpnColor(residualRpn).bg} />
            </div>
          </div>
          {risk.notes && (
            <div className="md:col-span-2">
              <Label>ë¹ê³ </Label>
              <Value>{risk.notes}</Value>
            </div>
          )}
          <div className="md:col-span-2 text-[11px]" style={{ color: 'var(--ink-faint)' }}>
            ë±ë¡: {risk.createdBy} Â· {risk.createdAt?.slice(0, 10) || '-'}
            {risk.verified && ` Â· ê²ì¦: ${risk.verifiedAt}`}
          </div>
        </div>
      )}
    </div>
  )
}

function Label({ children }) {
  return <div className="text-[11px] font-semibold mb-1 mt-2.5" style={{ color: 'var(--ink-faint)' }}>{children}</div>
}
function Value({ children }) {
  return <div className="text-[13px] p-2 rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink)', lineHeight: 1.5 }}>{children}</div>
}
function ScoreBox({ label, val, color, bg }) {
  return (
    <div className="flex flex-col items-center" style={{ minWidth: 52 }}>
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-[20px] font-bold"
        style={{ background: bg || 'var(--bg-soft)', color: color || 'var(--ink)' }}
      >{val}</div>
      <div className="text-[9px] mt-1 text-center" style={{ color: 'var(--ink-faint)' }}>{label}</div>
    </div>
  )
}

// ââ ìí ë§¤í¸ë¦­ì¤ âââââââââââââââââââââââââââââââââââââââââââââ
function RiskMatrix({ risks }) {
  const cellRisks = {}
  risks.forEach(r => {
    const key = `${r.severity}-${r.probability}`
    if (!cellRisks[key]) cellRisks[key] = []
    cellRisks[key].push(r)
  })

  return (
    <div>
      <div className="mb-4 flex items-center gap-4 flex-wrap">
        {[
          { color: '#EF4444', bg: '#FEE2E2', label: 'íì©ë¶ê° (RPNâ¥15)' },
          { color: '#F59E0B', bg: '#FEF3C7', label: 'ì¡°ê±´ë¶ íì© (RPN 8~14)' },
          { color: '#10B981', bg: '#D1FAE5', label: 'íì©ê°ë¥ (RPN<8)' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5 text-[12px]">
            <div className="w-4 h-4 rounded" style={{ background: l.bg, border: `2px solid ${l.color}` }} />
            <span style={{ color: 'var(--ink-soft)' }}>{l.label}</span>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: 480 }}>
          <div className="flex items-center mb-1" style={{ paddingLeft: 90 }}>
            {[1,2,3,4,5].map(p => (
              <div key={p} className="flex-1 text-center text-[11px] font-semibold" style={{ color: 'var(--ink-faint)' }}>
                ë°ìê°ë¥ì± {p}
              </div>
            ))}
          </div>

          {[5,4,3,2,1].map(s => (
            <div key={s} className="flex items-center mb-1.5">
              <div className="text-[11px] font-semibold text-right pr-2 flex-shrink-0" style={{ width: 88, color: 'var(--ink-faint)' }}>
                ì¬ê°ë {s}
              </div>
              {[1,2,3,4,5].map(p => {
                const key = `${s}-${p}`
                const items = cellRisks[key] || []
                const color = matrixColor(s, p)
                const rpn = s * p
                const isHigh = rpn >= 15 || (s >= 4 && p >= 3) || (s === 5 && p >= 2)
                const isMed = !isHigh && (rpn >= 8 || (s >= 3 && p >= 3))
                const bg = isHigh ? '#FEE2E2' : isMed ? '#FEF3C7' : '#D1FAE5'

                return (
                  <div
                    key={p}
                    className="flex-1 rounded-xl mx-0.5 flex flex-col items-center justify-center"
                    style={{
                      height: 72,
                      background: bg,
                      border: `2px solid ${items.length > 0 ? color : 'transparent'}`,
                    }}
                    title={`ì¬ê°ë ${s} Ã ë°ìê°ë¥ì± ${p} = RPN ${rpn}\nìí ${items.length}ê±´`}
                  >
                    <div className="text-[10px] font-bold" style={{ color: isHigh ? '#991B1B' : isMed ? '#92400E' : '#065F46' }}>
                      {rpn}
                    </div>
                    {items.length > 0 && (
                      <div
                        className="text-[11px] font-bold mt-0.5 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: color, color: 'white' }}
                      >
                        {items.length}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}

          <div className="text-center text-[11px] mt-2" style={{ color: 'var(--ink-faint)' }}>
            ì«ì = RPN Â· ì = ë±ë¡ë ìí ê±´ì
          </div>
        </div>
      </div>

      {risks.filter(r => r.severity * r.probability >= 15).length > 0 && (
        <div className="mt-6">
          <div className="text-[13px] font-bold mb-3 flex items-center gap-2" style={{ color: '#EF4444' }}>
            <AlertTriangle size={15} /> íì©ë¶ê° ìí í­ëª© (ì¦ì ì¡°ì¹ íì)
          </div>
          <div className="space-y-2">
            {risks
              .filter(r => r.severity * r.probability >= 15)
              .map(r => (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#EF4444' }}>
                    <span className="text-[14px] font-bold text-white">{r.severity * r.probability}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[11px]" style={{ color: '#991B1B' }}>{r.id}</div>
                    <div className="text-[13px] font-semibold truncate" style={{ color: '#7F1D1D' }}>{r.title}</div>
                    <div className="text-[11px]" style={{ color: '#991B1B' }}>ìí´: {r.harm}</div>
                  </div>
                  {r.verified && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: '#DBEAFE', color: '#1D4ED8' }}>ê²ì¦ìë£</span>
                  )}
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}

// ââ ì ê° ì¡°ì¹ íí© í­ âââââââââââââââââââââââââââââââââââââââââ
function ControlStatus({ risks, onEdit }) {
  const byType = CONTROL_TYPES.map(ct => ({
    ...ct,
    items: risks.filter(r => r.controlType === ct.value),
  }))

  const reductionRate = risks.length === 0 ? 0 : Math.round(
    risks.filter(r => {
      const before = r.severity * r.probability
      const after = r.residualSeverity * r.residualProbability
      return after < before
    }).length / risks.length * 100
  )

  const avgReduction = risks.length === 0 ? 0 : Math.round(
    risks.reduce((acc, r) => {
      const before = r.severity * r.probability
      const after = r.residualSeverity * r.residualProbability
      return acc + Math.max(0, before - after)
    }, 0) / risks.length * 10
  ) / 10

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[28px] font-bold" style={{ color: '#10B981' }}>{reductionRate}%</div>
          <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>ìí ì ê° ì±ê³µë¥ </div>
        </div>
        <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[28px] font-bold" style={{ color: '#3B82F6' }}>{avgReduction}</div>
          <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>íê·  RPN ê°ì</div>
        </div>
        <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[28px] font-bold" style={{ color: '#8B5CF6' }}>{risks.filter(r => r.verified).length}</div>
          <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>ê²ì¦ ìë£ í­ëª©</div>
        </div>
      </div>

      {byType.map(ct => ct.items.length > 0 && (
        <div key={ct.value} className="mb-5">
          <div className="text-[13px] font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--ink)' }}>
            <TrendingDown size={14} style={{ color: '#10B981' }} />
            {ct.label} ({ct.items.length}ê±´)
          </div>
          <div className="space-y-2">
            {ct.items.map(r => {
              const before = r.severity * r.probability
              const after = r.residualSeverity * r.residualProbability
              const reduced = before - after
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', cursor: 'pointer' }}
                  onClick={() => onEdit(r)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px]" style={{ color: 'var(--ink-faint)' }}>{r.id}</span>
                      <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--ink)' }}>{r.title}</span>
                    </div>
                    <div className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--ink-faint)' }}>
                      {r.controlMeasure || '(ì ê° ì¡°ì¹ ë¯¸ìë ¥)'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-center">
                      <div className="text-[14px] font-bold" style={{ color: rpnColor(before).text }}>{before}</div>
                      <div className="text-[9px]" style={{ color: 'var(--ink-faint)' }}>ì´ê¸°</div>
                    </div>
                    <div className="text-[12px]" style={{ color: reduced > 0 ? '#10B981' : '#EF4444' }}>
                      {reduced > 0 ? `â¼${reduced}` : reduced === 0 ? 'â' : `â²${Math.abs(reduced)}`}
                    </div>
                    <div className="text-center">
                      <div className="text-[14px] font-bold" style={{ color: rpnColor(after).text }}>{after}</div>
                      <div className="text-[9px]" style={{ color: 'var(--ink-faint)' }}>ìì¬</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {risks.length === 0 && (
        <div className="text-center py-16" style={{ color: 'var(--ink-faint)' }}>
          <TrendingDown size={40} strokeWidth={1.2} className="mx-auto mb-3 opacity-30" />
          <div>ìí ë±ë¡ë¶ì í­ëª©ì ì¶ê°íë©´ ì ê° ì¡°ì¹ íí©ì´ íìë©ëë¤</div>
        </div>
      )}
    </div>
  )
}

// ââ AI ì´ì ìì± ëª¨ë¬ ââââââââââââââââââââââââââââââââââââââââ
function AiDraftModal({ onClose, onUse }) {
  const [productName, setProductName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [items, setItems] = useState(null)

  const generate = async () => {
    if (!productName.trim() && !description.trim()) {
      setError('ì íëª ëë ì í/ê¸°ë¥ ì¤ëªì ìë ¥íì¸ì.')
      return
    }
    setLoading(true)
    setError('')
    setItems(null)
    try {
      const r = await fetch('/api/risk-draft', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ productName: productName.trim(), description: description.trim() }),
      })
      const j = await r.json()
      if (!j.ok) {
        setError(j.message || 'AI ì´ì ìì±ì ì¤í¨íìµëë¤.')
      } else {
        setItems(j.items)
      }
    } catch (e) {
      setError('AI ì´ì ìì± ì¤ ì¤ë¥ê° ë°ìíìµëë¤: ' + String((e && e.message) || e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '32px 16px', overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 20,
          border: '1px solid var(--line)',
          width: '100%', maxWidth: 680,
          boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
          padding: 28,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-[16px] font-bold" style={{ color: 'var(--ink)' }}>
            <Sparkles size={18} style={{ color: '#7C3AED' }} /> ìí í­ëª© AI ì´ì ìì±
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)' }}>
            <X size={20} />
          </button>
        </div>
        <div className="text-[12px] mb-5" style={{ color: 'var(--ink-faint)' }}>
          ì í/ê¸°ë¥ì ì¤ëªíë©´ ISO 14971 ê´ì ì ìí í­ëª© ì´ìì ì¬ë¬ ê±´ ì ìí©ëë¤. ë°ëì ë´ì©ì ê²í Â·ìì í ë¤ ë±ë¡íì¸ì â AI ì´ìì ì°¸ê³ ì©ì´ë©° ìµì¢ íë¨ì ì¬ì©ì ì±ììëë¤.
        </div>

        <div className="space-y-3">
          <Field label="ì íëª">
            <input value={productName} onChange={e => setProductName(e.target.value)} placeholder="ì: í´ëì© íë¹ì¸¡ì ê¸°" className="w-full" style={inputStyle} />
          </Field>
          <Field label="ì í/ê¸°ë¥ ì¤ëª">
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="ì: íìê° ì§ì  ì±í í ì¤í¸ë¦½ì ì½ìí´ íë¹ ìì¹ë¥¼ ì¸¡ì íë í´ëì© ì ìê¸°ê¸°. ë¸ë£¨í¬ì¤ë¡ ì±ì ê²°ê³¼ ì ì¡."
              className="w-full"
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </Field>
          {error && (
            <div className="text-[12.5px] px-3 py-2 rounded-lg" style={{ background: '#FEE2E2', color: '#991B1B' }}>{error}</div>
          )}
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[13px] font-semibold"
            style={{ background: '#7C3AED', color: 'white', border: 'none', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {loading ? 'ìì± ì¤...' : 'ì´ì ìì±'}
          </button>
        </div>

        {items && items.length > 0 && (
          <div className="mt-5 space-y-2.5">
            <div className="text-[11px] font-mono tracking-wider" style={{ color: 'var(--ink-faint)' }}>
              ì ìë ìí í­ëª© {items.length}ê±´ â íëë¥¼ ì ííë©´ ë±ë¡ í¼ì ì±ìì§ëë¤
            </div>
            {items.map((it, i) => {
              const rpn = it.severity * it.probability
              return (
                <button
                  key={i}
                  onClick={() => onUse(it)}
                  className="w-full text-left p-3.5 rounded-xl transition"
                  style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}
                >
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-card)', color: 'var(--ink-faint)' }}>{it.category}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: rpnColor(rpn).bg, color: rpnColor(rpn).text }}>RPN {rpn} ({rpnColor(rpn).label})</span>
                  </div>
                  <div className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{it.hazard}</div>
                  <div className="text-[12px] mt-0.5" style={{ color: 'var(--ink-soft)' }}>{it.harm}</div>
                  {it.controlMeasure && (
                    <div className="text-[11.5px] mt-1" style={{ color: 'var(--ink-faint)' }}>ì ê° ì¡°ì¹(ì): {it.controlMeasure}</div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ââ ìí ì¶ê°/ìì  í¼ ëª¨ë¬ âââââââââââââââââââââââââââââââââââââ
function RiskForm({ form, fld, editId, onSubmit, onClose }) {
  const rpn = form.severity * form.probability
  const resRpn = form.residualSeverity * form.residualProbability

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '32px 16px', overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 20,
          border: '1px solid var(--line)',
          width: '100%', maxWidth: 680,
          boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
          padding: 28,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="text-[16px] font-bold" style={{ color: 'var(--ink)' }}>
            {editId ? 'ìí í­ëª© ìì ' : 'ìí í­ëª© ì¶ê°'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)' }}>
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <Row2>
            <Field label="ì ëª© *">
              <input value={form.title} onChange={e => fld('title', e.target.value)} placeholder="ìí í­ëª© ì ëª©..." className="w-full" style={inputStyle} />
            </Field>
            <Field label="ìí ì í">
              <select value={form.category} onChange={e => fld('category', e.target.value)} className="w-full" style={inputStyle}>
                <option value="">ì í...</option>
                {RISK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </Row2>

          <Field label="ìíìì¸ (Hazard) â ìí´ë¥¼ ì ë°í  ì ìë ì ì¬ì  ìì¸">
            <input value={form.hazard} onChange={e => fld('hazard', e.target.value)} placeholder="ì: ê³ ì ì ë¸ì¶, ìíí¸ì¨ì´ ì¤ë¥..." className="w-full" style={inputStyle} />
          </Field>
          <Field label="ìí ìí© (Hazardous Situation) â ìíìì¸ì´ ë°ìíë ìí©">
            <input value={form.hazardousSituation} onChange={e => fld('hazardousSituation', e.target.value)} placeholder="ì: ì¬ì©ìê° ê¸°ê¸° ì²­ì ì¤ ì ì ë¯¸ì°¨ë¨..." className="w-full" style={inputStyle} />
          </Field>
          <Field label="ìí´ (Harm) * â ì¤ì ë¡ ë°ìíë í¼í´">
            <input value={form.harm} onChange={e => fld('harm', e.target.value)} placeholder="ì: ì ê¸° ì¼í¬, ë°ì´í° ì¤ë¥ë¡ ì¸í ì¤ì§..." className="w-full" style={inputStyle} />
          </Field>

          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-soft)' }}>
            <div className="text-[12px] font-bold mb-3" style={{ color: 'var(--ink-soft)' }}>ì´ê¸° ìí íê°</div>
            <Row2>
              <Field label={`ì¬ê°ë (Severity): ${form.severity}`}>
                <select value={form.severity} onChange={e => fld('severity', +e.target.value)} className="w-full" style={inputStyle}>
                  {SEVERITY.map(s => <option key={s.value} value={s.value}>{s.label} â {s.desc}</option>)}
                </select>
              </Field>
              <Field label={`ë°ìê°ë¥ì± (Probability): ${form.probability}`}>
                <select value={form.probability} onChange={e => fld('probability', +e.target.value)} className="w-full" style={inputStyle}>
                  {PROBABILITY.map(p => <option key={p.value} value={p.value}>{p.label} â {p.desc}</option>)}
                </select>
              </Field>
            </Row2>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>RPN =</span>
              <span className="text-[18px] font-bold px-3 py-1 rounded-lg" style={{ background: rpnColor(rpn).bg, color: rpnColor(rpn).text }}>
                {rpn} ({rpnColor(rpn).label})
              </span>
            </div>
          </div>

          <Row2>
            <Field label="íµì  ë°©ë²">
              <select value={form.controlType} onChange={e => fld('controlType', e.target.value)} className="w-full" style={inputStyle}>
                {CONTROL_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
            <div />
          </Row2>
          <Field label="ìí íµì  ì¡°ì¹ ë´ì©">
            <textarea value={form.controlMeasure} onChange={e => fld('controlMeasure', e.target.value)} rows={2} placeholder="êµ¬ì²´ì ì¸ ì ê° ì¡°ì¹ ë´ì©..." className="w-full" style={{ ...inputStyle, resize: 'vertical' }} />
          </Field>

          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-soft)' }}>
            <div className="text-[12px] font-bold mb-3" style={{ color: 'var(--ink-soft)' }}>ìì¬ ìí íê° (ì ê° ì¡°ì¹ í)</div>
            <Row2>
              <Field label={`ìì¬ ì¬ê°ë: ${form.residualSeverity}`}>
                <select value={form.residualSeverity} onChange={e => fld('residualSeverity', +e.target.value)} className="w-full" style={inputStyle}>
                  {SEVERITY.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </Field>
              <Field label={`ìì¬ ë°ìê°ë¥ì±: ${form.residualProbability}`}>
                <select value={form.residualProbability} onChange={e => fld('residualProbability', +e.target.value)} className="w-full" style={inputStyle}>
                  {PROBABILITY.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </Field>
            </Row2>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>ìì¬ RPN =</span>
              <span className="text-[18px] font-bold px-3 py-1 rounded-lg" style={{ background: rpnColor(resRpn).bg, color: rpnColor(resRpn).text }}>
                {resRpn} ({rpnColor(resRpn).label})
              </span>
            </div>
          </div>

          <Field label="ë¹ê³ ">
            <textarea value={form.notes} onChange={e => fld('notes', e.target.value)} rows={2} placeholder="ì¶ê° ë©ëª¨..." className="w-full" style={{ ...inputStyle, resize: 'vertical' }} />
          </Field>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
            ì·¨ì
          </button>
          <button onClick={onSubmit} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: '#EF4444', color: 'white', border: 'none', cursor: 'pointer' }}>
            {editId ? 'ìì  ì ì¥' : 'ìí í­ëª© ë±ë¡'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Row2({ children }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
}
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-faint)' }}>{label}</label>
      {children}
    </div>
  )
}
const inputStyle = {
  border: '1px solid var(--line)',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 13,
  color: 'var(--ink)',
  background: 'var(--bg-card)',
  outline: 'none',
}

// ââ Empty State ââââââââââââââââââââââââââââââââââââââââââââââââ
function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <ShieldAlert size={48} strokeWidth={1} className="mb-3" style={{ color: '#EF4444', opacity: 0.5 }} />
      <div className="text-[16px] font-bold mb-1" style={{ color: 'var(--ink-soft)' }}>ìí í­ëª© ìì</div>
      <div className="text-[13px] mb-5" style={{ color: 'var(--ink-faint)' }}>
        ISO 14971ì ë°ë¼ ì íì ìíìì¸ì ìë³íê³  ë±ë¡íì¸ì
      </div>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold"
        style={{ background: '#EF4444', color: 'white', border: 'none', cursor: 'pointer' }}
      >
        <Plus size={15} /> ì²« ë²ì§¸ ìí í­ëª© ì¶ê°
      </button>
      <div className="mt-6 p-4 rounded-xl max-w-md" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
        <div className="text-[12px] font-semibold mb-1" style={{ color: '#92400E' }}>ð¡ ìí í­ëª© ìì</div>
        <div className="text-[12px] text-left space-y-1" style={{ color: '#78350F', lineHeight: 1.6 }}>
          <div>â¢ ì ê¸° ì¶©ê²© (ì¬ê°ë 5 Ã ë°ìê°ë¥ì± 2 = RPN 10)</div>
          <div>â¢ ìíí¸ì¨ì´ ì¤ë¥ë¡ ì¸í ì¤ì§ (ì¬ê°ë 4 Ã ë°ìê°ë¥ì± 3)</div>
          <div>â¢ ë¶í ì´ë¬¼ì§ ìë¥ (ì¬ê°ë 3 Ã ë°ìê°ë¥ì± 2)</div>
        </div>
      </div>
    </div>
  )
}
