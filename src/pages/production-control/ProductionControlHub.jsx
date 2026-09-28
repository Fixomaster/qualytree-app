// src/pages/production-control/ProductionControlHub.jsx
// ISO 13485 Â§7.5.1 â ìì° ë° ìë¹ì¤ ì ê³µ ê´ë¦¬ (ìì° ì ì´ ê³í)
import React, { useState, useMemo, useEffect } from 'react'
import {
  Plus, Save, Edit2, Trash2, Layers, CheckCircle2,
  AlertTriangle, ClipboardList, ChevronUp, ChevronDown,
  Package, BarChart2, Cpu, ArrowRight, GripVertical,
  Factory, Settings
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'
import { supabase } from '../../lib/supabaseClient'
let _sbCidPc = null
import { useSearchParams } from 'react-router-dom'

// ââ ìì âââââââââââââââââââââââââââââââââââââââââââââââââââââ
const LS_KEY = 'qualytree.production_control'

// ì ì´ ê³í ìí
const PCP_STATUSES = {
  draft:    { label: 'ì´ì',   color: '#9CA3AF', bg: '#F3F4F6' },
  review:   { label: 'ê²í ',   color: '#D97706', bg: '#FEF3C7' },
  approved: { label: 'ì¹ì¸',   color: '#059669', bg: '#D1FAE5' },
  obsolete: { label: 'íê¸°',   color: '#6B7280', bg: '#F3F4F6' },
}

// Â§7.5.1 ê³µì  ì í
const PROCESS_TYPES = [
  'ìì ê²ì¬', 'ììì¬ ì¤ë¹', 'ì ë¨Â·ê°ê³µ', 'ì±íÂ·ì¡°ë¦½', 'ì©ì Â·ì í©',
  'ì½íÂ·íë©´ì²ë¦¬', 'ë©¸ê· ', 'í¬ì¥', 'ë¼ë²¨ë§', 'ìµì¢ ê²ì¬', 'ì¶í ê²ì¬',
  'ì¸ì²Â·ì¸ì ', 'ìíí¸ì¨ì´ ì¤ì¹', 'êµì Â·ì ê²', 'ê¸°í',
]

// ê´ë¦¬ ë°©ë²
const CONTROL_METHODS = [
  'ì¡ì ê²ì¬', 'ì¹ì ì¸¡ì ', 'ê¸°ë¥ ìí', 'ì ê¸° ìí', 'ì±ë¥ ìí',
  'ìì ì§ìì ì¤ì', 'ê³µì  íë¼ë¯¸í° ëª¨ëí°ë§', 'íµê³ì  ê³µì  ê´ë¦¬ (SPC)',
  'ë°©ë² ì í¨ì± íì¸', 'ì¤ë¹ êµì  íì¸', 'ì¨ë/ìµë ëª¨ëí°ë§', 'ê¸°í',
]

// ê¸°ë¡ ì í
const RECORD_TYPES = [
  'ë°°ì¹ ê¸°ë¡ (EBR)', 'ê²ì¬ ê¸°ë¡', 'ì¥ë¹ ë¡ê·¸', 'êµì  ê¸°ë¡',
  'íê²½ ëª¨ëí°ë§ ê¸°ë¡', 'ì¼í ê¸°ë¡', 'ìì ì§ìì', 'ê¸°í',
]

function genPcpId() { return `PCP-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }
function genStepId() { return `STEP-${String(Date.now()).slice(-6)}` }
function today()    { return new Date().toISOString().slice(0, 10) }

const EMPTY_STEP = {
  id: '', seq: 1, processType: 'ì¡°ë¦½', stepName: '', wiNo: '',
  equipment: '', materials: '',
  controlParams: '',    // ê´ë¦¬ íë¼ë¯¸í° (ì¨ë, ìë ¥, ìê° ë±)
  controlMethod: 'ì¡ì ê²ì¬',
  acceptanceCriteria: '',
  samplePlan: '',       // ìíë§ ê³í
  frequency: 'ë§¤ ë¡í¸',
  recordType: 'ë°°ì¹ ê¸°ë¡ (EBR)',
  responsible: '',
  linkedValidationId: '', linkedEquipmentId: '',
  specialProcess: false, // í¹ì ê³µì  ì¬ë¶ (Â§7.5.6)
  notes: '',
}

const EMPTY_PCP = {
  pcpNo: '', revision: 'Rev.0', status: 'draft',
  productKey: '', productName: '', productCode: '', deviceClass: 'Class II',
  preparedBy: '', reviewedBy: '', approvedBy: '',
  issueDate: today(), reviewDate: '',
  scope: '',            // ì ì© ë²ì
  releaseCriteria: '',  // ì¶í ê¸°ì¤ Â§7.5.1(f)
  environmentReqs: '',  // íê²½ ìêµ¬ì¬í­ Â§7.5.1(e)
  monitoringPlan: '',   // ëª¨ëí°ë§ ê³í Â§7.5.1(g)
  linkedDmrId: '', linkedDhfId: '', linkedValidationId: '',
  steps: [],            // ê³µì  ë¨ê³ ëª©ë¡
  notes: '',
}

// ââ ë©ì¸ âââââââââââââââââââââââââââââââââââââââââââââââââââââ
export default function ProductionControlHub({ embedded = false, productKey: scopeProductKey = null, productLabel = '' } = {}) {
  const user = auth.current()
  const companyId = user?.company_id
  const canEdit = user?.level >= 2
  const [searchParams] = useSearchParams()
  // #305: ì íê³µì (ProductsHub)ì ìë² ëë  ëë í´ë¹ ì í(productKey)ì PCPë§ ë¸ì¶íë¤.
  const scopeKey = scopeProductKey || searchParams.get('productId') || null

  const [pcps, setPcps] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
  })
  const [tab, setTab] = useState('list')   // list | detail | analysis
  const [selectedId, setSelectedId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_PCP)
  const [editId, setEditId] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  // KGMP LOTë²í¸ ì²´ê³
  const [lotCfg, setLotCfg] = useState(() => { try { return JSON.parse(localStorage.getItem('qualytree.lot_config') || 'null') || {prefix:'',yearFmt:'YY',monthFmt:'MM',seqDigits:3,sep:'-'} } catch { return {prefix:'',yearFmt:'YY',monthFmt:'MM',seqDigits:3,sep:'-'} } })
  const saveLotCfg = (cfg) => {
    setLotCfg(cfg)
    localStorage.setItem('qualytree.lot_config', JSON.stringify(cfg))
    if (_sbCidPc) supabase.from('company_data').upsert({company_id: _sbCidPc, data_type: 'localStorage_sync', data_key: 'qualytree.lot_config', payload: cfg}, {onConflict: 'company_id,data_type,data_key'})
  }
  const [lotLog, setLotLog] = useState(() => { try { return JSON.parse(localStorage.getItem('qualytree.lot_log') || '[]') } catch { return [] } })
  useEffect(() => { _sbCidPc = companyId || null }, [companyId])
  useEffect(() => {
    if (!companyId) return
    supabase.from('company_data').select('payload')
      .eq('company_id', companyId).eq('data_type', 'localStorage_sync')
      .eq('data_key', LS_KEY).maybeSingle()
      .then(({ data: sbData }) => { if (sbData?.payload) setPcps(sbData.payload) })
    supabase.from('company_data').select('payload')
      .eq('company_id', companyId).eq('data_type', 'localStorage_sync')
      .eq('data_key', 'qualytree.lot_config').maybeSingle()
      .then(({ data: sbData }) => { if (sbData?.payload) setLotCfg(sbData.payload) })
    supabase.from('company_data').select('payload')
      .eq('company_id', companyId).eq('data_type', 'localStorage_sync')
      .eq('data_key', 'qualytree.lot_log').maybeSingle()
      .then(({ data: sbData }) => { if (sbData?.payload) setLotLog(sbData.payload) })
  }, [companyId])
  const genLot = () => {
    const now = new Date()
    const yy = String(now.getFullYear()).slice(lotCfg.yearFmt==='YY'?2:0)
    const mm = String(now.getMonth()+1).padStart(2,'0')
    const datePart = yy + (lotCfg.monthFmt!=='(none)'?mm:'')
    const seq = String(lotLog.length+1).padStart(lotCfg.seqDigits||3,'0')
    const lot = [lotCfg.prefix, datePart, seq].filter(Boolean).join(lotCfg.sep||'')
    const entry = { id: Date.now().toString(), lot, createdAt: now.toISOString().slice(0,10) }
    const next = [entry, ...lotLog]
    setLotLog(next); try { localStorage.setItem('qualytree.lot_log', JSON.stringify(next)) } catch {}
    if (_sbCidPc) supabase.from('company_data').upsert({company_id: _sbCidPc, data_type: 'localStorage_sync', data_key: 'qualytree.lot_log', payload: next}, {onConflict: 'company_id,data_type,data_key'})
  }
  const previewLot = () => {
    const now = new Date()
    const yy = String(now.getFullYear()).slice(lotCfg.yearFmt==='YY'?2:0)
    const mm = String(now.getMonth()+1).padStart(2,'0')
    const datePart = yy + (lotCfg.monthFmt!=='(none)'?mm:'')
    const seq = String(lotLog.length+1).padStart(lotCfg.seqDigits||3,'0')
    return [lotCfg.prefix, datePart, seq].filter(Boolean).join(lotCfg.sep||'')||'(ë¯¸ì¤ì )'
  }


  function save(list) {
    setPcps(list)
    localStorage.setItem(LS_KEY, JSON.stringify(list))
    if (_sbCidPc) supabase.from('company_data').upsert({company_id: _sbCidPc, data_type: 'localStorage_sync', data_key: LS_KEY, payload: list}, {onConflict: 'company_id,data_type,data_key'})
  }

  function submitPcp() {
    if (!form.productName.trim()) return alert('ì íëªì ìë ¥íì¸ì.')
    const isEdit = !!editId
    const obj = isEdit
      ? pcps.map(p => p.id === editId ? { ...p, ...form } : p)
      : [{ id: genPcpId(), createdAt: today(), ...form, pcpNo: form.pcpNo || genPcpId(), steps: form.steps || [] }, ...pcps]
    save(obj)
    setShowForm(false); setForm(EMPTY_PCP); setEditId(null)
  }

  function deletePcp(id) {
    if (!confirm('ìì° ì ì´ ê³íì ì­ì íìê² ìµëê¹?')) return
    save(pcps.filter(p => p.id !== id))
    if (selectedId === id) { setSelectedId(null); setTab('list') }
  }

  const selectedPcp = pcps.find(p => p.id === selectedId)

  const scopedPcps = scopeKey ? pcps.filter(p => p.productKey === scopeKey) : pcps

  const filtered = useMemo(() => scopedPcps.filter(p => filterStatus === 'all' || p.status === filterStatus), [scopedPcps, filterStatus])

  const analysis = useMemo(() => {
    const byStatus = {}
    Object.keys(PCP_STATUSES).forEach(k => { byStatus[k] = scopedPcps.filter(p => p.status === k).length })
    const totalSteps = scopedPcps.reduce((acc, p) => acc + (p.steps?.length || 0), 0)
    const specialSteps = scopedPcps.reduce((acc, p) => acc + (p.steps?.filter(s => s.specialProcess)?.length || 0), 0)
    const missingCriteria = scopedPcps.filter(p => (p.steps || []).some(s => !s.acceptanceCriteria))
    return { byStatus, totalSteps, specialSteps, missingCriteria }
  }, [scopedPcps])

  const F = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // ê³µì  ë¨ê³ í¸ì§ (í¼ ë´ìì)
  function addStep() {
    const seq = (form.steps?.length || 0) + 1
    F('steps', [...(form.steps || []), { ...EMPTY_STEP, id: genStepId(), seq }])
  }
  function updateStep(id, field, value) {
    F('steps', form.steps.map(s => s.id === id ? { ...s, [field]: value } : s))
  }
  function removeStep(id) { F('steps', form.steps.filter(s => s.id !== id)) }
  function moveStep(id, dir) {
    const steps = [...(form.steps || [])]
    const idx = steps.findIndex(s => s.id === id)
    if (dir === 'up' && idx > 0) [steps[idx - 1], steps[idx]] = [steps[idx], steps[idx - 1]]
    if (dir === 'down' && idx < steps.length - 1) [steps[idx], steps[idx + 1]] = [steps[idx + 1], steps[idx]]
    F('steps', steps.map((s, i) => ({ ...s, seq: i + 1 })))
  }

  // ìì¸ ë·°ìì ë¨ê³ ì¸ë¼ì¸ í¸ì§
  const [editingStepId, setEditingStepId] = useState(null)
  const [stepDraft, setStepDraft] = useState(null)

  function saveStepInline(pcpId) {
    save(pcps.map(p => {
      if (p.id !== pcpId) return p
      return { ...p, steps: p.steps.map(s => s.id === editingStepId ? { ...s, ...stepDraft } : s) }
    }))
    setEditingStepId(null); setStepDraft(null)
  }

  const body = (
    <div className={embedded ? '' : 'px-6 lg:px-8 py-6 max-w-[1600px] mx-auto'}>

        {/* í­ */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-soft)' }}>
          {[
            { key: 'list',     label: `PCP ëª©ë¡ (${scopedPcps.length})` },
            { key: 'detail',   label: selectedPcp ? `ê³µì í: ${selectedPcp.productName}` : 'ê³µì  ìì¸' },
            { key: 'analysis', label: 'íí© ë¶ì' },
            { key: 'lot', label: 'LOT ì²´ê³ ì¤ì ' },
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

        {/* ââ ëª©ë¡ í­ ââ */}
        {tab === 'list' && (
          <div>
            <div className="flex flex-wrap gap-2 mb-4 items-center">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-[13px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                <option value="all">ì ì²´ ìí</option>
                {Object.entries(PCP_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              {canEdit && (
                <button onClick={() => { setForm({ ...EMPTY_PCP, productKey: scopeKey || '', productName: scopeKey ? productLabel : '' }); setEditId(null); setShowForm(true) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold ml-auto"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} /> PCP ë±ë¡
                </button>
              )}
            </div>

            {showForm && (
              <PcpForm form={form} F={F} onSave={submitPcp}
                onCancel={() => { setShowForm(false); setForm(EMPTY_PCP); setEditId(null) }}
                isEdit={!!editId} addStep={addStep} updateStep={updateStep} removeStep={removeStep} moveStep={moveStep} />
            )}

            <div className="space-y-3">
              {filtered.length === 0 && (
                <div className="text-center py-16 text-[13px]" style={{ color: 'var(--ink-faint)' }}>ë±ë¡ë ìì° ì ì´ ê³íì´ ììµëë¤.</div>
              )}
              {filtered.map(pcp => {
                const st = PCP_STATUSES[pcp.status] || PCP_STATUSES.draft
                const steps = pcp.steps || []
                const specialCount = steps.filter(s => s.specialProcess).length
                const missingCrit = steps.filter(s => !s.acceptanceCriteria).length
                return (
                  <div key={pcp.id} className="p-4 rounded-2xl cursor-pointer"
                    style={{ background: 'var(--bg-card)', border: `1.5px solid ${selectedId === pcp.id ? 'var(--moss)' : 'var(--line)'}` }}
                    onClick={() => { setSelectedId(pcp.id); setTab('detail') }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-[14px]" style={{ color: 'var(--ink)' }}>{pcp.productName}</span>
                          <span className="font-mono text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>{pcp.pcpNo}</span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                          <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{pcp.revision}</span>
                        </div>
                        <div className="flex gap-3 flex-wrap text-[12px]" style={{ color: 'var(--ink-soft)' }}>
                          <span>ê³µì  ë¨ê³: <strong>{steps.length}</strong>ê°</span>
                          {specialCount > 0 && <span style={{ color: '#7C3AED' }}>í¹ì ê³µì : {specialCount}ê°</span>}
                          {missingCrit > 0 && <span style={{ color: '#DC2626' }}>â  í©ê²© ê¸°ì¤ ë¯¸ë±ë¡: {missingCrit}ê°</span>}
                          {pcp.approvedBy && <span>ì¹ì¸ì: {pcp.approvedBy}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        {canEdit && (
                          <>
                            <button onClick={() => { setForm({ ...EMPTY_PCP, ...pcp }); setEditId(pcp.id); setShowForm(true); setTab('list') }}
                              className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                              <Edit2 size={12} style={{ color: 'var(--ink-soft)' }} />
                            </button>
                            <button onClick={() => deletePcp(pcp.id)}
                              className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', border: '1px solid #FECACA', cursor: 'pointer' }}>
                              <Trash2 size={12} style={{ color: '#DC2626' }} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ââ ê³µì  ìì¸ í­ ââ */}
        {tab === 'detail' && !selectedPcp && (
          <div className="text-center py-16 text-[13px]" style={{ color: 'var(--ink-faint)' }}>ëª©ë¡ìì PCPë¥¼ ì ííì¸ì.</div>
        )}
        {tab === 'detail' && selectedPcp && (
          <PcpDetailView pcp={selectedPcp} canEdit={canEdit}
            editingStepId={editingStepId} stepDraft={stepDraft}
            setEditingStepId={setEditingStepId} setStepDraft={setStepDraft}
            onSaveStep={() => saveStepInline(selectedPcp.id)}
            onAddStep={() => {
              const seq = (selectedPcp.steps?.length || 0) + 1
              const newStep = { ...EMPTY_STEP, id: genStepId(), seq }
              save(pcps.map(p => p.id === selectedPcp.id ? { ...p, steps: [...(p.steps || []), newStep] } : p))
            }}
            onDeleteStep={(stepId) => {
              save(pcps.map(p => p.id === selectedPcp.id ? { ...p, steps: p.steps.filter(s => s.id !== stepId).map((s, i) => ({ ...s, seq: i + 1 })) } : p))
            }} />
        )}

        {/* ââ ë¶ì í­ ââ */}
        {tab === 'analysis' && <AnalysisView analysis={analysis} pcps={scopedPcps} />}

        {/* KGMP LOTë²í¸ ì²´ê³ ì¤ì  */}
        {tab === 'lot' && (
          <div>
            <div style={{fontSize:13.5,fontWeight:700,color:'var(--ink)',marginBottom:4}}>LOTë²í¸ ì²´ê³ ì¤ì </div>
            <div style={{fontSize:12,color:'var(--ink-mute)',marginBottom:16}}>KGMP Â§7 â ì ì¡°ë²í¸(ë¶ë²í¸) ì²´ê³ ì¤ì  ë° ë°ë² ê¸°ë¡</div>
            <div style={{background:'var(--bg-card)',border:'1px solid var(--line)',borderRadius:12,padding:20,marginBottom:20}}>
              <div style={{fontSize:13,fontWeight:600,color:'var(--ink)',marginBottom:12}}>íì ì¤ì </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr',gap:12,marginBottom:16}}>
                <div><div style={{fontSize:11.5,color:'var(--ink-mute)',marginBottom:4}}>ì ëì¬</div>
                  <input value={lotCfg.prefix} onChange={e=>saveLotCfg({...lotCfg,prefix:e.target.value})} placeholder="ì: KT" style={{width:'100%',padding:'7px 10px',borderRadius:7,border:'1px solid var(--line)',fontSize:12.5,boxSizing:'border-box',background:'var(--bg)',color:'var(--ink)'}} /></div>
                <div><div style={{fontSize:11.5,color:'var(--ink-mute)',marginBottom:4}}>ì°ë</div>
                  <select value={lotCfg.yearFmt} onChange={e=>saveLotCfg({...lotCfg,yearFmt:e.target.value})} style={{width:'100%',padding:'7px 10px',borderRadius:7,border:'1px solid var(--line)',fontSize:12.5,background:'var(--bg)',color:'var(--ink)'}}>
                    <option value="YY">YY</option><option value="YYYY">YYYY</option>
                  </select></div>
                <div><div style={{fontSize:11.5,color:'var(--ink-mute)',marginBottom:4}}>ì</div>
                  <select value={lotCfg.monthFmt} onChange={e=>saveLotCfg({...lotCfg,monthFmt:e.target.value})} style={{width:'100%',padding:'7px 10px',borderRadius:7,border:'1px solid var(--line)',fontSize:12.5,background:'var(--bg)',color:'var(--ink)'}}>
                    <option value="MM">MM í¬í¨</option><option value="(none)">ìëµ</option>
                  </select></div>
                <div><div style={{fontSize:11.5,color:'var(--ink-mute)',marginBottom:4}}>ì¼ë ¨ë²í¸ ìë¦¿ì</div>
                  <select value={lotCfg.seqDigits} onChange={e=>saveLotCfg({...lotCfg,seqDigits:Number(e.target.value)})} style={{width:'100%',padding:'7px 10px',borderRadius:7,border:'1px solid var(--line)',fontSize:12.5,background:'var(--bg)',color:'var(--ink)'}}>
                    {[2,3,4,5].map(n=><option key={n} value={n}>{n}ìë¦¬</option>)}
                  </select></div>
                <div><div style={{fontSize:11.5,color:'var(--ink-mute)',marginBottom:4}}>êµ¬ë¶ì</div>
                  <select value={lotCfg.sep} onChange={e=>saveLotCfg({...lotCfg,sep:e.target.value})} style={{width:'100%',padding:'7px 10px',borderRadius:7,border:'1px solid var(--line)',fontSize:12.5,background:'var(--bg)',color:'var(--ink)'}}>
                    <option value="-">-</option><option value="">ìì</option><option value="/">/</option>
                  </select></div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:14}}>
                <div style={{fontSize:12.5,color:'var(--ink-mute)'}}>ë¯¸ë¦¬ë³´ê¸°:</div>
                <div style={{fontFamily:'monospace',fontSize:15,fontWeight:700,color:'#059669',background:'#D1FAE5',padding:'4px 14px',borderRadius:6}}>{previewLot()}</div>
                <button onClick={genLot} style={{padding:'8px 18px',borderRadius:8,border:'none',background:'#2563EB',color:'#fff',fontSize:12.5,fontWeight:600,cursor:'pointer'}}>LOT ë²í¸ ë°ë²</button>
              </div>
            </div>
            {lotLog.length>0 && (
              <div style={{background:'var(--bg-card)',border:'1px solid var(--line)',borderRadius:12,padding:20}}>
                <div style={{fontSize:13,fontWeight:600,color:'var(--ink)',marginBottom:12}}>LOT ë°ë² ì´ë ¥</div>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:12.5}}>
                  <thead><tr><th style={{padding:'7px 10px',textAlign:'left',color:'var(--ink-mute)',borderBottom:'1px solid var(--line)'}}>#</th><th style={{padding:'7px 10px',textAlign:'left',color:'var(--ink-mute)',borderBottom:'1px solid var(--line)'}}>LOTë²í¸</th><th style={{padding:'7px 10px',textAlign:'left',color:'var(--ink-mute)',borderBottom:'1px solid var(--line)'}}>ë°ë²ì¼</th></tr></thead>
                  <tbody>{lotLog.map((row,i)=>(
                    <tr key={row.id} style={{borderBottom:'1px solid var(--line)'}}>
                      <td style={{padding:'7px 10px',color:'var(--ink-mute)'}}>{lotLog.length-i}</td>
                      <td style={{padding:'7px 10px',fontFamily:'monospace',fontWeight:700,color:'#059669'}}>{row.lot}</td>
                      <td style={{padding:'7px 10px',color:'var(--ink-mute)'}}>{row.createdAt}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        )}
    </div>
  )

  if (embedded) return body

  return (
    <AppLayout user={user} title="ìì° ì ì´ ê³í" subtitle="ISO 13485 Â§7.5.1 â ê³µì  ë¨ê³ë³ ê´ë¦¬ í­ëª©Â·í©ê²© ê¸°ì¤Â·ì¶í ê¸°ì¤">
      <HubBanner title="ìì° ì ì´ ê³í" subtitle="ISO 13485 Â§7.5.1 â ìì° ë° ìë¹ì¤ ì ê³µ ê´ë¦¬" icon={Settings} color="#EA580C" workflow={['ê³í ìë¦½','ê³µì  ì¹ì¸','ìì° ì¤í','ê²ì¬','ì¶í ì¹ì¸']} />
      {body}
    </AppLayout>
  )
}

// ââ PCP ìì¸ ë·° âââââââââââââââââââââââââââââââââââââââââââââââ
function PcpDetailView({ pcp, canEdit, editingStepId, stepDraft, setEditingStepId, setStepDraft, onSaveStep, onAddStep, onDeleteStep }) {
  const steps = pcp.steps || []
  const st = PCP_STATUSES[pcp.status] || PCP_STATUSES.draft

  return (
    <div className="space-y-5">
      {/* PCP í¤ë */}
      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div>
            <div className="font-bold text-[16px]" style={{ color: 'var(--ink)' }}>{pcp.productName}</div>
            <div className="text-[12.5px]" style={{ color: 'var(--ink-soft)' }}>
              {pcp.pcpNo} Â· {pcp.revision} Â·
              <span className="ml-1 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px]">
          {[['ìì±ì', pcp.preparedBy], ['ê²í ì', pcp.reviewedBy], ['ì¹ì¸ì', pcp.approvedBy], ['ì í¨ì¼', pcp.issueDate]].map(([l, v]) =>
            v && <div key={l}><span style={{ color: 'var(--ink-faint)' }}>{l}: </span><span style={{ color: 'var(--ink)' }}>{v}</span></div>
          )}
        </div>
        {pcp.releaseCriteria && (
          <div className="mt-3 p-3 rounded-xl text-[12.5px]" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
            <span className="font-bold" style={{ color: '#1E40AF' }}>Â§7.5.1(f) ì¶í ê¸°ì¤: </span>
            <span style={{ color: '#1E40AF' }}>{pcp.releaseCriteria}</span>
          </div>
        )}
      </div>

      {/* ê³µì  ë¨ê³ íì´ë¸ */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[13px] font-bold" style={{ color: 'var(--ink)' }}>ê³µì  ë¨ê³ ({steps.length}ê°)</div>
          {canEdit && (
            <button onClick={onAddStep} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12px] font-semibold"
              style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--moss)', cursor: 'pointer' }}>
              <Plus size={12} /> ë¨ê³ ì¶ê°
            </button>
          )}
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: 'var(--bg-soft)' }}>
                {['#', 'ê³µì  ë¨ê³', 'ê´ë¦¬ íë¼ë¯¸í°', 'ê´ë¦¬ ë°©ë²', 'í©ê²© ê¸°ì¤', 'ë¹ë', 'ê¸°ë¡', 'ë´ë¹', ''].map(h => (
                  <th key={h} className="px-2 py-2 text-left font-semibold" style={{ color: 'var(--ink-soft)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {steps.length === 0 && (
                <tr><td colSpan={9} className="text-center py-10" style={{ color: 'var(--ink-faint)' }}>ê³µì  ë¨ê³ë¥¼ ì¶ê°íì¸ì.</td></tr>
              )}
              {steps.map((step, idx) => {
                const isEditing = editingStepId === step.id
                const d = isEditing ? stepDraft : step
                const missingCrit = !step.acceptanceCriteria
                return (
                  <tr key={step.id} style={{ background: idx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-soft)', borderTop: '1px solid var(--line)' }}>
                    <td className="px-2 py-2 text-center font-bold" style={{ color: 'var(--ink-soft)' }}>
                      <div className="flex items-center gap-0.5">
                        {step.specialProcess && <span title="í¹ì ê³µì " style={{ color: '#7C3AED', fontSize: 11 }}>â</span>}
                        {step.seq}
                      </div>
                    </td>
                    {isEditing ? (
                      <>
                        <td className="px-2 py-1.5">
                          <input value={d.stepName} onChange={e => setStepDraft(s => ({ ...s, stepName: e.target.value }))}
                            className="w-full px-2 py-1 rounded text-[12px]"
                            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={d.controlParams} onChange={e => setStepDraft(s => ({ ...s, controlParams: e.target.value }))}
                            placeholder="ì¨ë, ìë ¥, ìê°..."
                            className="w-full px-2 py-1 rounded text-[12px]"
                            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
                        </td>
                        <td className="px-2 py-1.5">
                          <select value={d.controlMethod} onChange={e => setStepDraft(s => ({ ...s, controlMethod: e.target.value }))}
                            className="w-full px-2 py-1 rounded text-[12px]"
                            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                            {CONTROL_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={d.acceptanceCriteria} onChange={e => setStepDraft(s => ({ ...s, acceptanceCriteria: e.target.value }))}
                            placeholder="í©ê²© ê¸°ì¤..."
                            className="w-full px-2 py-1 rounded text-[12px]"
                            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={d.frequency} onChange={e => setStepDraft(s => ({ ...s, frequency: e.target.value }))}
                            className="w-24 px-2 py-1 rounded text-[12px]"
                            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
                        </td>
                        <td className="px-2 py-1.5">
                          <select value={d.recordType} onChange={e => setStepDraft(s => ({ ...s, recordType: e.target.value }))}
                            className="w-full px-2 py-1 rounded text-[12px]"
                            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                            {RECORD_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={d.responsible} onChange={e => setStepDraft(s => ({ ...s, responsible: e.target.value }))}
                            className="w-20 px-2 py-1 rounded text-[12px]"
                            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="flex gap-1">
                            <button onClick={onSaveStep} className="px-2 py-0.5 rounded text-[11px] font-bold"
                              style={{ background: '#D1FAE5', color: '#059669', border: 'none', cursor: 'pointer' }}>ì ì¥</button>
                            <button onClick={() => { setEditingStepId(null); setStepDraft(null) }}
                              className="px-2 py-0.5 rounded text-[11px]"
                              style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink-soft)', cursor: 'pointer' }}>ì·¨ì</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-2 py-2">
                          <div className="font-semibold" style={{ color: 'var(--ink)' }}>{step.stepName || '-'}</div>
                          {step.wiNo && <div className="text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>WI: {step.wiNo}</div>}
                          {step.processType && <div className="text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>{step.processType}</div>}
                        </td>
                        <td className="px-2 py-2" style={{ color: 'var(--ink-soft)' }}>{step.controlParams || '-'}</td>
                        <td className="px-2 py-2" style={{ color: 'var(--ink-soft)' }}>{step.controlMethod}</td>
                        <td className="px-2 py-2">
                          {missingCrit
                            ? <span className="text-[11px] text-red-500">â  ë¯¸ë±ë¡</span>
                            : <span style={{ color: 'var(--ink)' }}>{step.acceptanceCriteria}</span>}
                        </td>
                        <td className="px-2 py-2" style={{ color: 'var(--ink-soft)' }}>{step.frequency || '-'}</td>
                        <td className="px-2 py-2 text-[11px]" style={{ color: 'var(--ink-soft)' }}>{step.recordType}</td>
                        <td className="px-2 py-2" style={{ color: 'var(--ink-soft)' }}>{step.responsible || '-'}</td>
                        <td className="px-2 py-2">
                          {canEdit && (
                            <div className="flex gap-1">
                              <button onClick={() => { setEditingStepId(step.id); setStepDraft({ ...step }) }}
                                className="p-1 rounded" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                                <Edit2 size={10} style={{ color: 'var(--ink-soft)' }} />
                              </button>
                              <button onClick={() => onDeleteStep(step.id)}
                                className="p-1 rounded" style={{ background: '#FEE2E2', border: 'none', cursor: 'pointer' }}>
                                <Trash2 size={10} style={{ color: '#DC2626' }} />
                              </button>
                            </div>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {steps.some(s => s.specialProcess) && (
          <div className="mt-2 text-[11.5px]" style={{ color: '#7C3AED' }}>
            â í¹ì ê³µì  (Â§7.5.6) â ê²°ê³¼ë¥¼ ê²ì¬ë¡ ìì í íì¸í  ì ìì´ ì í¨ì± íì¸ì´ íìí ê³µì 
          </div>
        )}
      </div>

      {/* ì¶ê° ì ë³´ */}
      {(pcp.environmentReqs || pcp.monitoringPlan) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pcp.environmentReqs && (
            <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="text-[12.5px] font-bold mb-1" style={{ color: 'var(--ink)' }}>Â§7.5.1(e) íê²½ ìêµ¬ì¬í­</div>
              <p className="text-[12.5px] whitespace-pre-line" style={{ color: 'var(--ink-soft)' }}>{pcp.environmentReqs}</p>
            </div>
          )}
          {pcp.monitoringPlan && (
            <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="text-[12.5px] font-bold mb-1" style={{ color: 'var(--ink)' }}>Â§7.5.1(g) ëª¨ëí°ë§ ê³í</div>
              <p className="text-[12.5px] whitespace-pre-line" style={{ color: 'var(--ink-soft)' }}>{pcp.monitoringPlan}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ââ PCP ë±ë¡ í¼ âââââââââââââââââââââââââââââââââââââââââââââââ
function PcpForm({ form, F, onSave, onCancel, isEdit, addStep, updateStep, removeStep, moveStep }) {
  return (
    <div className="mb-5 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>{isEdit ? 'PCP ìì ' : 'ìì° ì ì´ ê³í ë±ë¡ (Â§7.5.1)'}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <Field label="ì íëª *" value={form.productName} onChange={v => F('productName', v)} />
        <Field label="ì í ì½ë" value={form.productCode} onChange={v => F('productCode', v)} />
        <Field label="PCP ë²í¸" value={form.pcpNo} onChange={v => F('pcpNo', v)} placeholder="ìë ìì±" />
        <Field label="ê°ì  ë²í¸" value={form.revision} onChange={v => F('revision', v)} placeholder="Rev.0" />
        <FieldSelect label="ìí" value={form.status} onChange={v => F('status', v)}
          options={Object.entries(PCP_STATUSES).map(([k, v]) => ({ value: k, label: v.label }))} />
        <Field label="ì í¨ì¼" type="date" value={form.issueDate} onChange={v => F('issueDate', v)} />
        <Field label="ìì±ì" value={form.preparedBy} onChange={v => F('preparedBy', v)} />
        <Field label="ê²í ì" value={form.reviewedBy} onChange={v => F('reviewedBy', v)} />
        <Field label="ì¹ì¸ì" value={form.approvedBy} onChange={v => F('approvedBy', v)} />
        <Field label="ì°ê²° DMR ID" value={form.linkedDmrId} onChange={v => F('linkedDmrId', v)} placeholder="DMR-xxxx" />
        <Field label="ì°ê²° DHF ID" value={form.linkedDhfId} onChange={v => F('linkedDhfId', v)} placeholder="DHF-xxxx" />
        <Field label="ì°ê²° ë°¸ë¦¬ë°ì´ì ID" value={form.linkedValidationId} onChange={v => F('linkedValidationId', v)} placeholder="VAL-xxxx" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <FieldArea label="Â§7.5.1(f) ì¶í ê¸°ì¤" value={form.releaseCriteria} onChange={v => F('releaseCriteria', v)} rows={2}
          placeholder="ëª¨ë  ê³µì  ë¨ê³ í©ê²©, ìµì¢ ê²ì¬ í©ê²©, ë°°ì¹ ê¸°ë¡ ìê²°..." />
        <FieldArea label="Â§7.5.1(e) íê²½ ìêµ¬ì¬í­" value={form.environmentReqs} onChange={v => F('environmentReqs', v)} rows={2}
          placeholder="í´ë¦°ë£¸ Class 10000, ì¨ë 20Â±5Â°C, ìµë 40~60%..." />
        <FieldArea label="Â§7.5.1(g) ëª¨ëí°ë§ ê³í" value={form.monitoringPlan} onChange={v => F('monitoringPlan', v)} rows={2} />
        <FieldArea label="ë¹ê³ " value={form.notes} onChange={v => F('notes', v)} rows={2} />
      </div>

      {/* ê³µì  ë¨ê³ */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[13px] font-bold" style={{ color: 'var(--ink)' }}>ê³µì  ë¨ê³</div>
          <button onClick={addStep} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12px] font-semibold"
            style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--moss)', cursor: 'pointer' }}>
            <Plus size={12} /> ë¨ê³ ì¶ê°
          </button>
        </div>
        {(form.steps || []).length === 0 ? (
          <div className="text-center py-6 text-[13px]" style={{ color: 'var(--ink-faint)' }}>ê³µì  ë¨ê³ë¥¼ ì¶ê°íì¸ì.</div>
        ) : (form.steps || []).map((step, idx) => (
          <div key={step.id} className="mb-2 p-3 rounded-xl" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-bold text-[12px] w-5 text-center" style={{ color: 'var(--moss)' }}>{step.seq}</span>
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                <input value={step.stepName} onChange={e => updateStep(step.id, 'stepName', e.target.value)}
                  placeholder="ë¨ê³ ì´ë¦ *"
                  className="px-2 py-1 rounded-lg text-[12.5px]"
                  style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
                <select value={step.processType} onChange={e => updateStep(step.id, 'processType', e.target.value)}
                  className="px-2 py-1 rounded-lg text-[12.5px]"
                  style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                  {PROCESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input value={step.acceptanceCriteria} onChange={e => updateStep(step.id, 'acceptanceCriteria', e.target.value)}
                  placeholder="í©ê²© ê¸°ì¤ *"
                  className="px-2 py-1 rounded-lg text-[12.5px]"
                  style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
                <input value={step.responsible} onChange={e => updateStep(step.id, 'responsible', e.target.value)}
                  placeholder="ë´ë¹ì"
                  className="px-2 py-1 rounded-lg text-[12.5px]"
                  style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => moveStep(step.id, 'up')} disabled={idx === 0} className="p-1 rounded"
                  style={{ background: 'var(--bg)', border: '1px solid var(--line)', cursor: 'pointer', opacity: idx === 0 ? 0.3 : 1 }}>
                  <ChevronUp size={11} style={{ color: 'var(--ink-soft)' }} />
                </button>
                <button onClick={() => moveStep(step.id, 'down')} disabled={idx === (form.steps.length - 1)} className="p-1 rounded"
                  style={{ background: 'var(--bg)', border: '1px solid var(--line)', cursor: 'pointer', opacity: idx === (form.steps.length - 1) ? 0.3 : 1 }}>
                  <ChevronDown size={11} style={{ color: 'var(--ink-soft)' }} />
                </button>
                <button onClick={() => removeStep(step.id)} className="p-1 rounded"
                  style={{ background: '#FEE2E2', border: 'none', cursor: 'pointer' }}>
                  <Trash2 size={11} style={{ color: '#DC2626' }} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 ml-7">
              <input value={step.controlParams} onChange={e => updateStep(step.id, 'controlParams', e.target.value)}
                placeholder="ê´ë¦¬ íë¼ë¯¸í°"
                className="px-2 py-1 rounded-lg text-[12px]"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
              <select value={step.controlMethod} onChange={e => updateStep(step.id, 'controlMethod', e.target.value)}
                className="px-2 py-1 rounded-lg text-[12px]"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                {CONTROL_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <input value={step.frequency} onChange={e => updateStep(step.id, 'frequency', e.target.value)}
                placeholder="ë¹ë (ë§¤ ë¡í¸)"
                className="px-2 py-1 rounded-lg text-[12px]"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
              <label className="flex items-center gap-1.5 text-[12px] cursor-pointer" style={{ color: '#7C3AED' }}>
                <input type="checkbox" checked={!!step.specialProcess} onChange={e => updateStep(step.id, 'specialProcess', e.target.checked)}
                  className="accent-violet-600 w-3.5 h-3.5" />
                í¹ì ê³µì 
              </label>
            </div>
          </div>
        ))}
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

// ââ ë¶ì ë·° ââââââââââââââââââââââââââââââââââââââââââââââââââ
function AnalysisView({ analysis, pcps }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'ì´ PCP', value: pcps.length, color: '#2563EB', bg: '#DBEAFE' },
          { label: 'ì´ ê³µì  ë¨ê³', value: analysis.totalSteps, color: '#7C3AED', bg: '#EDE9FE' },
          { label: 'í¹ì ê³µì ', value: analysis.specialSteps, color: '#D97706', bg: '#FEF3C7' },
          { label: 'ê¸°ì¤ ë¯¸ë±ë¡ PCP', value: analysis.missingCriteria.length, color: analysis.missingCriteria.length > 0 ? '#DC2626' : '#059669', bg: analysis.missingCriteria.length > 0 ? '#FEE2E2' : '#D1FAE5' },
        ].map(c => (
          <div key={c.label} className="p-4 rounded-2xl text-center" style={{ background: c.bg, border: `1px solid ${c.color}30` }}>
            <div className="text-[26px] font-bold" style={{ color: c.color }}>{c.value}</div>
            <div className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>PCP ìíë³ ë¶í¬</div>
        {Object.entries(PCP_STATUSES).map(([k, v]) => (
          <div key={k} className="flex items-center gap-3 mb-2">
            <span className="text-[12px] w-20" style={{ color: 'var(--ink-soft)' }}>{v.label}</span>
            <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--bg-soft)' }}>
              <div className="h-2 rounded-full" style={{ width: pcps.length ? `${((analysis.byStatus[k] || 0) / pcps.length) * 100}%` : '0%', background: v.color }} />
            </div>
            <span className="text-[12px] font-bold w-5 text-right" style={{ color: 'var(--ink)' }}>{analysis.byStatus[k] || 0}</span>
          </div>
        ))}
      </div>

      {analysis.missingCriteria.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: '#FEF3C7', border: '1px solid #FCD34D' }}>
          <div className="text-[13px] font-bold mb-2" style={{ color: '#92400E' }}>â  í©ê²© ê¸°ì¤ ë¯¸ë±ë¡ PCP</div>
          {analysis.missingCriteria.map(p => (
            <div key={p.id} className="text-[12.5px] mb-1" style={{ color: '#92400E' }}>
              {p.productName} â {p.steps?.filter(s => !s.acceptanceCriteria).map(s => s.stepName || `ë¨ê³${s.seq}`).join(', ')}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ââ ê³µíµ âââââââââââââââââââââââââââââââââââââââââââââââââââââ
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
