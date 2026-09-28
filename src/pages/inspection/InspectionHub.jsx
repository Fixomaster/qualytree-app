// src/pages/inspection/InspectionHub.jsx
// ISO 13485 Â§8.2.3 ê³µì  ì¤ ê²ì¬ / Â§8.2.4 ìµì¢ ì í ê²ì¬ ê´ë¦¬
import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, Trash2, X, ChevronDown, ChevronUp, Edit3,
  CheckCircle2, XCircle, AlertTriangle, ClipboardList,
  TrendingUp, Microscope, FlaskConical, Package, BarChart2,
  FileWarning, BadgeCheck, ExternalLink,
  ClipboardCheck,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import AIDraftButton from '../../components/AIDraftButton'
import { auth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import { onboarding } from '../../lib/onboardingState'
import { INSP_TYPES, deriveInspectionStandards } from '../../lib/inspectionStandardConstants'
import { ensureMfgDefaults } from '../manufacturing/ManufacturingHub'

/** ë¡ì»¬ ë ì§ YYYY-MM-DD (toISOStringì UTC ê¸°ì¤ì´ë¼ ìì  ì í íë£¨ ì´ê¸ë¨) */
function todayLocal() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// ââ localStorage ââââââââââââââââââââââââââââââââââââââââââââââ
const LS_INS = 'qualytree.inspections'
let _sbCidIns = null
function lsR(k) { try { return JSON.parse(localStorage.getItem(k) || '[]') } catch { return [] } }
function lsW(k, d) {
  localStorage.setItem(k, JSON.stringify(d))
  if (_sbCidIns) {
    supabase.from('company_data').upsert({
      company_id: _sbCidIns, data_type: 'localStorage_sync', data_key: k, payload: d,
    }, { onConflict: 'company_id,data_type,data_key' }).catch(console.error)
  }
}
function genInsId() { return `INS-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }

// ââ ìì âââââââââââââââââââââââââââââââââââââââââââââââââââââ

const VERDICTS = [
  { value: 'pass',        label: 'í©ê²©',     color: '#059669', bg: '#D1FAE5', icon: CheckCircle2 },
  { value: 'conditional', label: 'ì¡°ê±´ë¶í©ê²©', color: '#D97706', bg: '#FEF3C7', icon: AlertTriangle },
  { value: 'fail',        label: 'ë¶í©ê²©',   color: '#DC2626', bg: '#FEE2E2', icon: XCircle },
  { value: 'pending',     label: 'ê²ì¬ ì¤',  color: '#6B7280', bg: '#F3F4F6', icon: ClipboardList },
]

const PROCESS_STEPS = ['ììì¬ ìê³ ', 'ì ë¨/ê°ê³µ', 'ì±í/ì¡°ë¦½', 'ì©ì /ì í©', 'íë©´ì²ë¦¬', 'ê²êµì ', 'í¬ì¥', 'ìµì¢ê²ì¬', 'ì¶í']

// íì¤ ê²ì¬ê¸°ì¤ìê° ìë ì íì ì ì©í  ê¸°ë³¸ ìµì¢ê²ì¬ í­ëª©
const DEFAULT_FQC_CHECKLIST = ['ì¸ê´ ê²ì¬', 'ì¹ì/ê·ê²© íì¸', 'ê¸°ë¥ ëì ìí', 'íìì¬í­(ë¼ë²¨) íì¸', 'í¬ì¥ ìí íì¸']

// ê²ì¬ í­ëª© íì  ìí(êµ¬ë²ì  boolean ê°ê³¼ ì ë²ì  3ë¨ê³ ë¬¸ìì´ ê°ì ëª¨ë ì§ì)
function ciState(ci) {
  if (ci.ok === true || ci.ok === 'true' || ci.ok === 'pass') return 'pass'
  if (ci.ok === false || ci.ok === 'false' || ci.ok === 'fail') return 'fail'
  if (ci.ok === 'conditional') return 'conditional'
  return null
}
function loadWos() {
  ensureMfgDefaults() // /manufacturing ë¯¸ë°©ë¬¸ ìíììë ëì¼ ê¸°ë³¸ WO ëª©ë¡ ì¬ì©
  try { return JSON.parse(localStorage.getItem('qms_mfg_wo') || '[]') } catch { return [] }
}
function loadProcRecords() {
  ensureMfgDefaults()
  try { return JSON.parse(localStorage.getItem('qms_mfg_proc') || '[]') } catch { return [] }
}

const emptyForm = () => ({
  inspType: 'ipc', productName: '', productCode: '', lotNo: '', woId: '',
  sampleSize: '', inspectedQty: '', defectQty: '',
  inspDate: todayLocal(),
  inspector: '', processStep: '', standardId: '',
  checkItems: [],          // [{ name, spec, result, ok }]
  verdict: 'pending', conditionNote: '', ncrId: '',
  notes: '',
})

// ââ ë©ì¸ âââââââââââââââââââââââââââââââââââââââââââââââââââââ
export default function InspectionHub() {
  const user = auth.current()
  const companyId = user?.company?.id ?? null
  useEffect(() => { _sbCidIns = companyId }, [companyId])
  useEffect(() => {
    if (!companyId) return
    supabase.from('company_data').select('payload')
      .eq('company_id', companyId).eq('data_type', 'localStorage_sync').eq('data_key', LS_INS)
      .maybeSingle()
      .then(({ data: row }) => {
        if (row?.payload != null) {
          localStorage.setItem(LS_INS, JSON.stringify(row.payload))
          setRecords(row.payload)
        }
      })
  }, [companyId])
  const [records, setRecords] = useState(() => lsR(LS_INS))
  const [tab, setTab] = useState('records')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [verdictFilter, setVerdictFilter] = useState('all')
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState(emptyForm())
  const [editId, setEditId]       = useState(null)
  const [expanded, setExpanded]   = useState(null)
  const navigate = useNavigate()

  // ê²ì¬ ê¸°ì¤ì â ì í ê°ë°(ì¤ê³ë¨ê³)ìì ìì±í ê°ì ê·¸ëë¡ íì ì¡°í (SSoT: ì í ë ì½ë)
  const standards = useMemo(() => deriveInspectionStandards(onboarding.load()?.products || []), [])
  const goToProduct  = (productId) => navigate('/products?tab=product&productId=' + encodeURIComponent(productId) + '&detailTab=info')
  const goToProducts = () => navigate('/products?tab=product')

  // ìì° ìë£ â ìµì¢ê²ì¬ ëê¸° ëª©ë¡ (WO ìíê° 'ìë£'ì´ê³  ìì§ ìµì¢ê²ì¬ ê¸°ë¡ì´ ìë ììì§ì)
  const wos = useMemo(() => loadWos(), [])
  const procRecords = useMemo(() => loadProcRecords(), [])
  const waitingWos = useMemo(
    () => wos.filter(w => w.status === 'ìë£' && !records.some(r => r.woId === w.id)),
    [wos, records]
  )

  function openFinal(w) {
    const std = standards.find(s => (s.productName || '').trim() === (w.product || '').trim())
    const items = std && (std.checkItems || []).length
      ? std.checkItems.map(ci => ({ name: ci.name, spec: ci.spec, result: '', ok: null }))
      : DEFAULT_FQC_CHECKLIST.map(name => ({ name, spec: '', result: '', ok: null }))
    setForm({
      ...emptyForm(),
      inspType: 'fqc',
      productName: w.product,
      productCode: std?.productCode || '',
      woId: w.id,
      inspDate: todayLocal(),
      inspector: user?.name || '',
      processStep: 'ìµì¢ê²ì¬',
      standardId: std?.id || '',
      checkItems: items,
    })
    setEditId(null)
    setShowForm(true)
  }

  const saveRec = d => { setRecords(d); lsW(LS_INS, d) }

  const openNew      = () => { setForm(emptyForm()); setEditId(null); setShowForm(true) }
  const openEdit     = r  => { setForm({ ...r, checkItems: r.checkItems || [] }); setEditId(r.id); setShowForm(true) }
  const removeRec    = id => { if (!confirm('ì­ì ?')) return; saveRec(records.filter(r => r.id !== id)) }
  const fld          = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // ê²ì¬ í­ëª© ê´ë¦¬ (í¼ ë´)
  const addCheckItem  = () => setForm(f => ({ ...f, checkItems: [...(f.checkItems || []), { name: '', spec: '', result: '', ok: null }] }))
  const updCheckItem  = (i, k, v) => setForm(f => {
    const items = [...(f.checkItems || [])]
    items[i] = { ...items[i], [k]: v }
    // ì ì²´ í­ëª© ìë ¥ê°ì ë°ë¼ í©ê²©/ì¡°ê±´ë¶í©ê²©/ë¶í©ê²©/íì ëê¸° ìë ì°ì¶ (#229)
    const states = items.map(ciState)
    const allDone = items.length > 0 && states.every(s => s !== null)
    const anyFail = states.some(s => s === 'fail')
    const anyCond = states.some(s => s === 'conditional')
    const verdict = allDone ? (anyFail ? 'fail' : anyCond ? 'conditional' : 'pass') : 'pending'
    return { ...f, checkItems: items, verdict }
  })
  const delCheckItem  = i => setForm(f => { const c = [...(f.checkItems||[])]; c.splice(i,1); return { ...f, checkItems: c } })

  // ê¸°ì¤ì ì ì© â ê²ì¬ í­ëª© ìë ì±ì°ê¸°
  const applyStandard = stdId => {
    const std = standards.find(s => s.id === stdId)
    if (!std) return
    const items = (std.checkItems || []).map(ci => ({ name: ci.name, spec: ci.spec, result: '', ok: null }))
    setForm(f => ({ ...f, standardId: stdId, checkItems: items }))
  }

  const submitRec = () => {
    if (!form.productName || !form.inspector)
      return alert('ì íëªê³¼ ê²ì¬ìë íììëë¤.')
    const now = new Date().toISOString()
    const defectRate = form.inspectedQty && form.defectQty
      ? ((parseInt(form.defectQty) / parseInt(form.inspectedQty)) * 100).toFixed(1)
      : null
    if (editId) saveRec(records.map(r => r.id === editId ? { ...form, id: editId, defectRate } : r))
    else saveRec([{ ...form, id: genInsId(), createdAt: now, createdBy: user?.name || '-', defectRate }, ...records])
    setShowForm(false)
  }

  // íí°ë§
  const filtered = useMemo(() => {
    let list = [...records]
    if (typeFilter !== 'all')    list = list.filter(r => r.inspType === typeFilter)
    if (verdictFilter !== 'all') list = list.filter(r => r.verdict === verdictFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r => (r.id + r.productName + r.lotNo + r.woId + r.inspector).toLowerCase().includes(q))
    }
    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  }, [records, typeFilter, verdictFilter, search])

  // ì§ê³
  const total    = records.length
  const passRate = total ? Math.round((records.filter(r => r.verdict === 'pass').length / total) * 100) : 0
  const fails    = records.filter(r => r.verdict === 'fail')
  const pending  = records.filter(r => r.verdict === 'pending').length
  const failedNoNcr = fails.filter(r => !r.ncrId).length
  const conditionals = records.filter(r => r.verdict === 'conditional')

  const TABS = [
    { key: 'records',    label: 'ê²ì¬ ê¸°ë¡',   icon: ClipboardList },
    { key: 'analysis',   label: 'íí© ë¶ì',   icon: BarChart2 },
    { key: 'standards',  label: 'ê²ì¬ ê¸°ì¤ì', icon: FileWarning },
  ]

  return (
    <AppLayout user={user} title="ê²ì¬ ê´ë¦¬" subtitle="ISO 13485 Â§8.2.3 ê³µì  ì¤ ê²ì¬ Â· Â§8.2.4 ìµì¢ ê²ì¬ Â· í©ê²©/ë¶í©ê²© íì  Â· NCR ì°ë">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto">

        {/* ìë¦¼ ë°°ë */}
        {failedNoNcr > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-5" style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}>
            <XCircle size={14} style={{ color: '#DC2626' }} />
            <span className="text-[13px] font-semibold" style={{ color: '#991B1B' }}>
              ë¶í©ê²© {failedNoNcr}ê±´ â NCR ë¯¸ë±ë¡ (íì§íë¸ìì NCR ë±ë¡ íì)
            </span>
          </div>
        )}

        {conditionals.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-5" style={{ background: '#FEF3C7', border: '1px solid #FCD34D' }}>
            <AlertTriangle size={14} style={{ color: '#D97706' }} />
            <span className="text-[13px] font-semibold" style={{ color: '#92400E' }}>
              ì¡°ê±´ë¶í©ê²© {conditionals.length}ê±´ â íì§ì±ìì íì¸ ë° ì¡°ê±´ ì´í íì
            </span>
          </div>
        )}

        <HubBanner
          title="ê²ì¬ ê´ë¦¬"
          subtitle="ISO 13485 Â§8.2.3/Â§8.2.4 Â· ê³µì ê²ì¬ Â· ìµì¢ê²ì¬ Â· í©ê²©íì  Â· ê²ì¬ ê¸°ë¡ ì ì§"
          icon={ClipboardCheck}
          color="#0EA5E9"
          workflow={['ìì° ìë£', 'ìµì¢ê²ì¬ ëê¸°', 'ê²ì¬ ì§í', 'í©ê²©/ë¶í©ê²©/ì¡°ê±´ë¶ íì ', 'ê¸°ë¡ ë³´ê´', 'ì¶í ì¹ì¸']}
        />

        <div style={{display:'flex',justifyContent:'flex-end',marginBottom:'10px'}}>
          <AIDraftButton docType="inspection" />
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'ì ì²´ ê²ì¬',   count: total,      color: '#6B7280' },
            { label: 'í©ê²©',        count: records.filter(r => r.verdict === 'pass').length, color: '#059669' },
            { label: 'ë¶í©ê²©',      count: fails.length,  color: '#DC2626' },
            { label: 'ê²ì¬ ì¤',     count: pending,       color: '#2563EB' },
            { label: 'í©ê²©ë¥ ',      count: `${passRate}%`, color: passRate >= 95 ? '#059669' : passRate >= 80 ? '#D97706' : '#DC2626' },
          ].map(s => (
            <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="text-[22px] font-bold" style={{ color: s.color }}>{s.count}</div>
              <div className="text-[10.5px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{s.label}</div>
            </div>
          ))}
        </div>

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

        {/* ââ ê²ì¬ ê¸°ë¡ í­ ââ */}
        {tab === 'records' && (
          <>
            {waitingWos.length > 0 && (
              <div className="mb-5">
                <div className="text-[12px] font-bold mb-2 flex items-center gap-1.5" style={{ color: 'var(--ink-soft)' }}>
                  <BadgeCheck size={13} style={{ color: '#059669' }} /> ìµì¢ê²ì¬ ëê¸° ({waitingWos.length}) â ìì°ì´ ìë£ë ììì§ììëë¤. í´ë¦­íì¬ ê²ì¬ë¥¼ ììíì¸ì.
                </div>
                <div className="space-y-2">
                  {waitingWos.map(w => (
                    <div key={w.id} onClick={() => openFinal(w)} className="flex items-center justify-between gap-3 p-3 rounded-xl cursor-pointer transition"
                      style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                      <div>
                        <div className="text-[13px] font-bold" style={{ color: 'var(--ink)' }}>{w.product}</div>
                        <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{w.id} Â· ìë {w.qty} Â· ìë£ì¼ {w.dueDate || '-'}</div>
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: '#059669', color: '#fff' }}>ê²ì¬ ìì â</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-[180px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                <Search size={14} style={{ color: 'var(--ink-faint)' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ì íëª Â· LOT Â· ê²ì¬ì ê²ì..." className="flex-1 text-[13px] outline-none" style={{ background: 'none', border: 'none', color: 'var(--ink)' }} />
              </div>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 rounded-xl text-[13px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
                <option value="all">ì ì²´ ì í</option>
                {INSP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <select value={verdictFilter} onChange={e => setVerdictFilter(e.target.value)} className="px-3 py-2 rounded-xl text-[13px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
                <option value="all">ì ì²´ íì </option>
                {VERDICTS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>

            {filtered.length === 0
              ? <InsEmpty />
              : <div className="space-y-2">
                  {filtered.map(r => (
                    <InsRow key={r.id} record={r} standards={standards}
                      expanded={expanded === r.id}
                      onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
                      onEdit={() => openEdit(r)}
                      onDelete={() => removeRec(r.id)}
                    />
                  ))}
                </div>
            }
          </>
        )}

        {/* ââ íí© ë¶ì í­ ââ */}
        {tab === 'analysis' && <InsAnalysis records={records} procRecords={procRecords} />}

        {/* ââ ê²ì¬ ê¸°ì¤ì í­ ââ */}
        {tab === 'standards' && (
          <StdTab standards={standards} goToProduct={goToProduct} goToProducts={goToProducts} />
        )}

      </div>

      {showForm && (
        <InsForm form={form} fld={fld} updCheckItem={updCheckItem}
          editId={editId} standards={standards}
          user={user} onSubmit={submitRec} onClose={() => setShowForm(false)} />
      )}
    </AppLayout>
  )
}

// ââ ê²ì¬ ê¸°ë¡ í ââââââââââââââââââââââââââââââââââââââââââââââ
function InsRow({ record: r, standards, expanded, onToggle, onEdit, onDelete }) {
  const it = INSP_TYPES.find(t => t.value === r.inspType) || INSP_TYPES[0]
  const vd = VERDICTS.find(v => v.value === r.verdict) || VERDICTS[3]
  const VIcon = vd.icon
  const ITIcon = it.icon
  const std = standards?.find(s => s.id === r.standardId)
  const passItems = (r.checkItems || []).filter(c => ciState(c) === 'pass').length
  const totalItems = (r.checkItems || []).length

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: `1px solid ${r.verdict === 'fail' ? '#FECACA' : 'var(--line)'}` }}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={onToggle} style={{ borderBottom: expanded ? '1px solid var(--line)' : 'none' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${it.color}15` }}>
          <ITIcon size={16} style={{ color: it.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px]" style={{ color: 'var(--ink-faint)' }}>{r.id}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${it.color}15`, color: it.color }}>{it.short}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1" style={{ background: vd.bg, color: vd.color }}>
              <VIcon size={10} />{vd.label}
            </span>
            {r.defectRate > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#FEF3C7', color: '#D97706' }}>ë¶ëë¥  {r.defectRate}%</span>
            )}
          </div>
          <div className="text-[14px] font-semibold mt-0.5 truncate" style={{ color: 'var(--ink)' }}>
            {r.productName}
            {r.lotNo && <span className="text-[12px] font-normal ml-1" style={{ color: 'var(--ink-faint)' }}>LOT: {r.lotNo}</span>}
          </div>
          <div className="text-[12px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
            {r.inspDate} Â· ê²ì¬ì: {r.inspector}
            {r.processStep && ` Â· ${r.processStep}`}
            {totalItems > 0 && ` Â· ê²ì¬í­ëª© ${passItems}/${totalItems} í©ê²©`}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={e => { e.stopPropagation(); onEdit() }} className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)', border: 'none', cursor: 'pointer' }}><Edit3 size={13} /></button>
          <button onClick={e => { e.stopPropagation(); onDelete() }} className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', cursor: 'pointer' }}><Trash2 size={13} /></button>
          {expanded ? <ChevronUp size={16} style={{ color: 'var(--ink-faint)' }} /> : <ChevronDown size={16} style={{ color: 'var(--ink-faint)' }} />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <SL>ì íÂ·ë¡í¸ ì ë³´</SL>
            <IR k="ì íëª"    v={r.productName} />
            <IR k="ì í ì½ë" v={r.productCode} />
            <IR k="LOT ë²í¸"  v={r.lotNo} />
            <IR k="ììì§ì"  v={r.woId || '-'} />
            <IR k="ê³µì  ë¨ê³" v={r.processStep || '-'} />
            <SL>ìíë§</SL>
            <IR k="ê²ì¬ ìë" v={r.inspectedQty} />
            <IR k="ë¶ë ìë" v={r.defectQty || '0'} />
            <IR k="ë¶ëë¥ "    v={r.defectRate != null ? `${r.defectRate}%` : '-'} />
            {std && <><SL>ì ì© ê¸°ì¤ì</SL><div className="text-[12px]" style={{ color: 'var(--ink)' }}>{std.name} (v{std.version})</div></>}
          </div>
          <div>
            <SL>ê²ì¬ í­ëª© ({(r.checkItems||[]).length}ê°)</SL>
            {(r.checkItems || []).length === 0 && <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>í­ëª© ìì</div>}
            <div className="space-y-1">
              {(r.checkItems || []).map((ci, i) => {
                const st = ciState(ci)
                const bg = st === 'pass' ? '#D1FAE5' : st === 'fail' ? '#FEE2E2' : st === 'conditional' ? '#FEF3C7' : 'var(--bg-soft)'
                const color = st === 'pass' ? '#059669' : st === 'fail' ? '#DC2626' : st === 'conditional' ? '#D97706' : '#9CA3AF'
                const mark = st === 'pass' ? 'â' : st === 'fail' ? 'â' : st === 'conditional' ? 'â³' : 'â'
                return (
                  <div key={i} className="flex items-center gap-2 p-1.5 rounded-lg" style={{ background: bg }}>
                    <span style={{ color, fontSize: 13 }}>{mark}</span>
                    <span className="text-[12px] flex-1" style={{ color: 'var(--ink)' }}>{ci.name}</span>
                    <span className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{ci.result || ci.spec}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div>
            <SL>íì  ê²°ê³¼</SL>
            <div className="p-3 rounded-xl mb-2" style={{ background: VERDICTS.find(v => v.value === r.verdict)?.bg || '#F3F4F6' }}>
              <div className="text-[14px] font-bold" style={{ color: VERDICTS.find(v => v.value === r.verdict)?.color || '#6B7280' }}>
                {VERDICTS.find(v => v.value === r.verdict)?.label || r.verdict}
              </div>
              {r.conditionNote && <div className="text-[12px] mt-1" style={{ color: 'var(--ink)' }}>{r.conditionNote}</div>}
            </div>
            {r.verdict === 'fail' && (
              <>
                <SL>ì°ê²° NCR</SL>
                <div className="text-[12px]" style={{ color: r.ncrId ? '#DC2626' : 'var(--ink-faint)' }}>
                  {r.ncrId || 'â  NCR ë¯¸ë±ë¡ â íì§íë¸ìì ë±ë¡ íì'}
                </div>
              </>
            )}
            {r.notes && <><SL>ë¹ê³ </SL><div className="text-[12px] p-2 rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink)' }}>{r.notes}</div></>}
          </div>
        </div>
      )}
    </div>
  )
}

// ââ íí© ë¶ì âââââââââââââââââââââââââââââââââââââââââââââââââ
function InsAnalysis({ records, procRecords }) {
  // ê³µì  ì¤ ê²ì¬(IPC)ë ìì°íí©ì ê³µì ê¸°ë¡ìì ì§ì  íì ëë¯ë¡(#231), íí© ë¶ìììë
  // ê³µì ê¸°ë¡ ë°ì´í°ë¥¼ í¨ê» ì§ê³íì¬ ì íë³ ê²ì¬ íí©ì ë°ìíë¤.
  const ipcTotal = (procRecords || []).length
  const ipcPass  = (procRecords || []).filter(p => p.result === 'í©ê²©').length
  const ipcFail  = (procRecords || []).filter(p => p.result === 'ë¶í©ê²©').length

  const byType = INSP_TYPES.map(t => {
    if (t.value === 'ipc') {
      return { ...t, total: ipcTotal, pass: ipcPass, fail: ipcFail }
    }
    return {
      ...t,
      total: records.filter(r => r.inspType === t.value).length,
      pass:  records.filter(r => r.inspType === t.value && r.verdict === 'pass').length,
      fail:  records.filter(r => r.inspType === t.value && r.verdict === 'fail').length,
    }
  })

  // ìë³ ë¶ëë¥ 
  const monthly = {}
  records.forEach(r => {
    const m = (r.inspDate || r.createdAt || '').slice(0, 7)
    if (!m) return
    if (!monthly[m]) monthly[m] = { total: 0, fail: 0 }
    monthly[m].total++
    if (r.verdict === 'fail') monthly[m].fail++
  })
  const monthKeys = Object.keys(monthly).sort().slice(-6)

  // ìµê·¼ ë¶í©ê²© ëª©ë¡
  const recentFails = records.filter(r => r.verdict === 'fail').sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 5)

  return (
    <div className="space-y-5">
      {/* ì íë³ í©ê²©ë¥  */}
      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>ì íë³ ê²ì¬ íí©</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {byType.map(t => {
            const rate = t.total ? Math.round((t.pass / t.total) * 100) : null
            const TIcon = t.icon
            return (
              <div key={t.value} className="p-4 rounded-xl text-center" style={{ background: 'var(--bg-soft)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: `${t.color}15` }}>
                  <TIcon size={18} style={{ color: t.color }} />
                </div>
                <div className="text-[12px] font-bold mb-1" style={{ color: 'var(--ink)' }}>{t.short}</div>
                <div className="text-[22px] font-bold" style={{ color: rate === null ? '#9CA3AF' : rate >= 95 ? '#059669' : rate >= 80 ? '#D97706' : '#DC2626' }}>
                  {rate !== null ? `${rate}%` : '-'}
                </div>
                <div className="text-[10.5px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>í©ê²©ë¥  Â· {t.total}ê±´</div>
                <div className="flex justify-center gap-2 mt-1 text-[10px]">
                  <span style={{ color: '#059669' }}>í©ê²© {t.pass}</span>
                  <span style={{ color: '#DC2626' }}>ë¶í© {t.fail}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ìë³ ì¶ì´ */}
      {monthKeys.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>ìë³ ê²ì¬ ê±´ì ë° ë¶í©ê²© ì¶ì´</div>
          <div className="flex items-end gap-3 h-[120px]">
            {monthKeys.map(m => {
              const d = monthly[m]
              const h = Math.max(8, Math.round((d.total / Math.max(...monthKeys.map(k => monthly[k].total))) * 100))
              const fh = d.total ? Math.round((d.fail / d.total) * h) : 0
              return (
                <div key={m} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{d.total}ê±´</div>
                  <div className="w-full rounded-t-lg overflow-hidden flex flex-col justify-end" style={{ height: `${h}px`, background: '#D1FAE5' }}>
                    {fh > 0 && <div className="w-full" style={{ height: `${fh}px`, background: '#DC2626' }} />}
                  </div>
                  <div className="text-[9px]" style={{ color: 'var(--ink-faint)' }}>{m.slice(5)}</div>
                </div>
              )
            })}
          </div>
          <div className="flex gap-4 mt-2 text-[11px]">
            <span className="flex items-center gap-1"><span style={{ display:'inline-block',width:10,height:10,background:'#D1FAE5',borderRadius:2 }}></span>í©ê²©</span>
            <span className="flex items-center gap-1"><span style={{ display:'inline-block',width:10,height:10,background:'#DC2626',borderRadius:2 }}></span>ë¶í©ê²©</span>
          </div>
        </div>
      )}

      {/* ìµê·¼ ë¶í©ê²© */}
      {recentFails.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[14px] font-bold mb-3" style={{ color: 'var(--ink)' }}>ìµê·¼ ë¶í©ê²© íí©</div>
          <div className="space-y-2">
            {recentFails.map(r => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#FEE2E2' }}>
                <XCircle size={14} style={{ color: '#DC2626' }} />
                <div className="flex-1">
                  <div className="text-[12.5px] font-semibold" style={{ color: '#7F1D1D' }}>{r.productName} Â· LOT {r.lotNo || '-'}</div>
                  <div className="text-[11px]" style={{ color: '#991B1B' }}>{r.inspDate} Â· {r.inspector} Â· {INSP_TYPES.find(t=>t.value===r.inspType)?.short}</div>
                </div>
                <div className="text-[11px] font-bold" style={{ color: r.ncrId ? '#059669' : '#DC2626' }}>
                  {r.ncrId ? `NCR: ${r.ncrId}` : 'NCR ë¯¸ë±ë¡'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ââ ê²ì¬ ê¸°ì¤ì í­ ââââââââââââââââââââââââââââââââââââââââââââ
function StdTab({ standards, goToProduct, goToProducts }) {
  const [detail, setDetail] = useState(null)
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-[13px]" style={{ color: 'var(--ink-faint)' }}>ê²ì¬ ê¸°ì¤ìë ì íÂ·ê³µì  &gt; ì í ê°ë°(ì¤ê³ë¨ê³)ìì ìì±í©ëë¤. ëª©ë¡ì í´ë¦­íë©´ ìì¸ ë´ì©ì ë³¼ ì ììµëë¤.</div>
        <button onClick={goToProducts} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold" style={{ background: '#059669', color: 'white', border: 'none', cursor: 'pointer' }}>
          <ExternalLink size={14} /> ì í ê°ë°ìì ìì±
        </button>
      </div>
      {standards.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--ink-faint)' }}>
          <FileWarning size={40} strokeWidth={1} className="mx-auto mb-3 opacity-30" />
          <div>ë±ë¡ë ê²ì¬ ê¸°ì¤ìê° ììµëë¤.</div>
          <div className="text-[12px] mt-1">ì í ê°ë° íë©´ìì ì íë³ ê²ì¬ ê¸°ì¤ìë¥¼ ìì±íì¸ì.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {standards.map(s => {
            const it = INSP_TYPES.find(t => t.value === s.inspType) || INSP_TYPES[1]
            return (
              <div key={s.id} onClick={() => setDetail(s)} className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[10px]" style={{ color: 'var(--ink-faint)' }}>{s.id}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${it.color}15`, color: it.color }}>{it.short}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>v{s.version}</span>
                    </div>
                    <div className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>{s.name}</div>
                    <div className="text-[12px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
                      ì í: {s.productName} Â· ì í ì½ë: {s.productCode || '-'} Â· ìíì¼: {s.effectiveDate || '-'} Â· ê²ì¬ í­ëª© {(s.checkItems||[]).length}ê°
                    </div>
                  </div>
                  <ChevronDown size={16} style={{ color: 'var(--ink-faint)', transform: 'rotate(-90deg)' }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
      {detail && <StdDetailModal std={detail} onGoToProduct={goToProduct} onClose={() => setDetail(null)} />}
    </div>
  )
}

// ââ ê²ì¬ ê¸°ì¤ì ìì¸ (ì¡°í ì ì©) ââââââââââââââââââââââââââââââââ
function StdDetailModal({ std, onGoToProduct, onClose }) {
  const it = INSP_TYPES.find(t => t.value === std.inspType) || INSP_TYPES[1]
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }} onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--line)', width: '100%', maxWidth: 640, boxShadow: '0 24px 64px rgba(0,0,0,0.3)', padding: 28 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${it.color}15`, color: it.color }}>{it.short}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>v{std.version}</span>
            </div>
            <div className="text-[16px] font-bold" style={{ color: 'var(--ink)' }}>{std.name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)' }}><X size={20} /></button>
        </div>

        <div className="space-y-2 mb-4">
          <IR k="ì ì© ì í" v={std.productName} />
          <IR k="ì í ì½ë" v={std.productCode || '-'} />
          <IR k="ê²ì¬ ì í" v={it.label} />
          <IR k="ìíì¼" v={std.effectiveDate || '-'} />
          <IR k="AQL ìì¤" v={std.aqlLevel || '-'} />
          <IR k="í©ê²©/ë¶í©ê²© ìë" v={[std.acceptQty, std.rejectQty].filter(Boolean).join(' / ') || '-'} />
        </div>

        <SL>ê²ì¬ í­ëª©</SL>
        {(std.checkItems || []).length === 0 ? (
          <div className="text-[12px] text-center py-3" style={{ color: 'var(--ink-faint)', background: 'var(--bg-soft)', borderRadius: 8 }}>ë±ë¡ë ê²ì¬ í­ëª©ì´ ììµëë¤.</div>
        ) : (
          <div className="space-y-1.5">
            {std.checkItems.map((ci, i) => (
              <div key={i} className="flex gap-2 text-[12px] p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
                <span style={{ color: 'var(--ink-faint)', minWidth: 16 }}>{i + 1}.</span>
                <span style={{ color: 'var(--ink)', flex: 1 }}>{ci.name}</span>
                {ci.spec && <span style={{ color: 'var(--ink-faint)' }}>{ci.spec}</span>}
                {ci.method && <span style={{ color: 'var(--ink-faint)' }}>Â· {ci.method}</span>}
              </div>
            ))}
          </div>
        )}

        {std.notes && (
          <div className="mt-4">
            <SL>ë¹ê³ </SL>
            <div className="text-[12.5px]" style={{ color: 'var(--ink)' }}>{std.notes}</div>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>ë«ê¸°</button>
          {std.productId && (
            <button onClick={() => onGoToProduct(std.productId)} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-1.5" style={{ background: '#059669', color: 'white', border: 'none', cursor: 'pointer' }}>
              <ExternalLink size={13} /> ì í ê°ë°ìì ìì 
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ââ ê²ì¬ ê¸°ë¡ í¼ ââââââââââââââââââââââââââââââââââââââââââââââ
function InsForm({ form, fld, updCheckItem, editId, standards, user, onSubmit, onClose }) {
  const std = standards.find(s => s.id === form.standardId)
  const vd = VERDICTS.find(v => v.value === form.verdict) || VERDICTS[3]
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }} onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--line)', width: '100%', maxWidth: 720, boxShadow: '0 24px 64px rgba(0,0,0,0.3)', padding: 28 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="text-[16px] font-bold" style={{ color: 'var(--ink)' }}>{editId ? 'ìµì¢ê²ì¬ ê¸°ë¡ ìì ' : 'ìµì¢ê²ì¬ ì§í'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)' }}><X size={20} /></button>
        </div>

        <div className="space-y-3">
          {/* ì íÂ·ë¡í¸Â·ê²ì¬ì ì ë³´ â ììì§ì(WO) í´ë¦­ ì ìë ë°ì, ìì  ë¶ê° (#225,#226,#227) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-soft)' }}>
            <IR k="ì íëª" v={form.productName} />
            <IR k="ì í ì½ë" v={form.productCode} />
            <IR k="ì°ê²° ììì§ì" v={form.woId} />
            <IR k="ê³µì  ë¨ê³" v={form.processStep || 'ìµì¢ê²ì¬'} />
            <IR k="ê²ì¬ì¼" v={form.inspDate} />
            <IR k="ê²ì¬ì" v={form.inspector || user?.name} />
            <IR k="ì ì© ê¸°ì¤ì" v={std ? `${std.name} (v${std.version})` : 'ê¸°ë³¸ ìµì¢ê²ì¬ í­ëª©'} />
          </div>

          {/* ê²ì¬ í­ëª© â ê²ì¬ê¸°ì¤ì(SSoT)ë¡ ìë ìì±, ê²°ê³¼ ìë ¥ë§ ê°ë¥ (#224,#228) */}
          <div className="pt-2" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="text-[12px] font-bold mb-2" style={{ color: 'var(--ink-soft)' }}>ê²ì¬ í­ëª© ({(form.checkItems || []).length}ê°)</div>
            <div className="space-y-2">
              {(form.checkItems || []).map((ci, i) => (
                <div key={i} className="grid gap-2 items-center" style={{ gridTemplateColumns: '1fr 1fr 96px' }}>
                  <div className="text-[12.5px] px-1" style={{ color: 'var(--ink)' }}>{ci.name}</div>
                  <input value={ci.result} onChange={e => updCheckItem(i, 'result', e.target.value)} placeholder="ì¸¡ì ê° / ê¸°ì¤ì¹" style={{ ...IS, fontSize: 12 }} />
                  <select value={ci.ok === null || ci.ok === undefined || ci.ok === '' ? '' : ciState(ci) || ''} onChange={e => updCheckItem(i, 'ok', e.target.value === '' ? null : e.target.value)} style={{ ...IS, fontSize: 12 }}>
                    <option value="">-</option>
                    <option value="pass">í©ê²©</option>
                    <option value="conditional">ì¡°ê±´ë¶</option>
                    <option value="fail">ë¶í©ê²©</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* íì  â ê²ì¬ í­ëª© ê²°ê³¼ì ë°ë¼ ìë ì°ì¶ (#229) */}
          <div className="pt-2" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="text-[12px] font-bold mb-2" style={{ color: 'var(--ink-soft)' }}>ìµì¢ íì  (ìë)</div>
            <div className="p-3 rounded-xl flex items-center gap-2" style={{ background: vd.bg }}>
              <vd.icon size={16} style={{ color: vd.color }} />
              <span className="text-[14px] font-bold" style={{ color: vd.color }}>{form.verdict === 'pending' ? 'ê²ì¬ í­ëª© ìë ¥ ëê¸°' : vd.label}</span>
            </div>
          </div>
          {form.verdict === 'fail' && (
            <F l="ì°ê²° NCR ID"><input value={form.ncrId} onChange={e => fld('ncrId', e.target.value)} placeholder="NCR-2026-00001" style={IS} className="w-full" /></F>
          )}
          {form.verdict === 'conditional' && (
            <F l="ì¡°ê±´ë¶ í©ê²© ì¡°ê±´ (íì§ì±ìì íì¸ íì)"><textarea value={form.conditionNote} onChange={e => fld('conditionNote', e.target.value)} rows={2} placeholder="íì© ì¡°ê±´ ë° íì ì¡°ì¹..." style={{ ...IS, resize: 'vertical' }} className="w-full" /></F>
          )}
          <F l="ë¹ê³ "><textarea value={form.notes} onChange={e => fld('notes', e.target.value)} rows={2} style={{ ...IS, resize: 'vertical' }} className="w-full" /></F>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>ì·¨ì</button>
          <button onClick={onSubmit} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: '#2563EB', color: 'white', border: 'none', cursor: 'pointer' }}>
            {editId ? 'ìì  ì ì¥' : 'ê²ì¬ ê²°ê³¼ ì ì¥'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SL({ children }) { return <div className="text-[10px] font-bold mb-1 mt-2" style={{ color: 'var(--ink-faint)' }}>{children}</div> }
function IR({ k, v }) {
  return (
    <div className="flex gap-2 mb-0.5">
      <span className="text-[10.5px] flex-shrink-0" style={{ color: 'var(--ink-faint)', minWidth: 64 }}>{k}</span>
      <span className="text-[12px]" style={{ color: 'var(--ink)' }}>{v || '-'}</span>
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
const IS = { border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--ink)', background: 'var(--bg-card)', outline: 'none' }

function InsEmpty() {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <Microscope size={48} strokeWidth={1} className="mx-auto mb-3 opacity-30" style={{ color: '#2563EB' }} />
      <div className="text-[16px] font-bold mb-1" style={{ color: 'var(--ink-soft)' }}>ê²ì¬ ê¸°ë¡ ìì</div>
      <div className="text-[13px]" style={{ color: 'var(--ink-faint)' }}>ìì°ìì ììì§ìê° ìë£ëë©´ ì´ê³³ì ìµì¢ê²ì¬ ëê¸° í­ëª©ì´ ìëì¼ë¡ íìë©ëë¤.</div>
    </div>
  )
}
