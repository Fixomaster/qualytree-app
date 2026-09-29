// src/pages/production-control/ProductionControlHub.jsx
// ISO 13485 ÃÂ§7.5.1 Ã¢ÂÂ Ã¬ÂÂÃ¬ÂÂ° Ã«Â°Â Ã¬ÂÂÃ«Â¹ÂÃ¬ÂÂ¤ Ã¬Â ÂÃªÂ³Âµ ÃªÂ´ÂÃ«Â¦Â¬ (Ã¬ÂÂÃ¬ÂÂ° Ã¬Â ÂÃ¬ÂÂ´ ÃªÂ³ÂÃ­ÂÂ)
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
import { useSearchParams } from 'react-router-dom'
let _sbCidPc = null

// Ã¢ÂÂÃ¢ÂÂ Ã¬ÂÂÃ¬ÂÂ Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
const LS_KEY = 'qualytree.production_control'

// Ã¬Â ÂÃ¬ÂÂ´ ÃªÂ³ÂÃ­ÂÂ Ã¬ÂÂÃ­ÂÂ
const PCP_STATUSES = {
  draft:    { label: 'Ã¬Â´ÂÃ¬ÂÂ',   color: '#9CA3AF', bg: '#F3F4F6' },
  review:   { label: 'ÃªÂ²ÂÃ­ÂÂ ',   color: '#D97706', bg: '#FEF3C7' },
  approved: { label: 'Ã¬ÂÂ¹Ã¬ÂÂ¸',   color: '#059669', bg: '#D1FAE5' },
  obsolete: { label: 'Ã­ÂÂÃªÂ¸Â°',   color: '#6B7280', bg: '#F3F4F6' },
}

// ÃÂ§7.5.1 ÃªÂ³ÂµÃ¬Â Â Ã¬ÂÂ Ã­ÂÂ
const PROCESS_TYPES = [
  'Ã¬ÂÂÃ¬ÂÂ ÃªÂ²ÂÃ¬ÂÂ¬', 'Ã¬ÂÂÃ¬ÂÂÃ¬ÂÂ¬ Ã¬Â¤ÂÃ«Â¹Â', 'Ã¬Â ÂÃ«ÂÂ¨ÃÂ·ÃªÂ°ÂÃªÂ³Âµ', 'Ã¬ÂÂ±Ã­ÂÂÃÂ·Ã¬Â¡Â°Ã«Â¦Â½', 'Ã¬ÂÂ©Ã¬Â ÂÃÂ·Ã¬Â ÂÃ­ÂÂ©',
  'Ã¬Â½ÂÃ­ÂÂÃÂ·Ã­ÂÂÃ«Â©Â´Ã¬Â²ÂÃ«Â¦Â¬', 'Ã«Â©Â¸ÃªÂ·Â ', 'Ã­ÂÂ¬Ã¬ÂÂ¥', 'Ã«ÂÂ¼Ã«Â²Â¨Ã«Â§Â', 'Ã¬ÂµÂÃ¬Â¢Â ÃªÂ²ÂÃ¬ÂÂ¬', 'Ã¬Â¶ÂÃ­ÂÂ ÃªÂ²ÂÃ¬ÂÂ¬',
  'Ã¬ÂÂ¸Ã¬Â²ÂÃÂ·Ã¬ÂÂ¸Ã¬Â Â', 'Ã¬ÂÂÃ­ÂÂÃ­ÂÂ¸Ã¬ÂÂ¨Ã¬ÂÂ´ Ã¬ÂÂ¤Ã¬Â¹Â', 'ÃªÂµÂÃ¬Â ÂÃÂ·Ã¬Â ÂÃªÂ²Â', 'ÃªÂ¸Â°Ã­ÂÂ',
]

// ÃªÂ´ÂÃ«Â¦Â¬ Ã«Â°Â©Ã«Â²Â
const CONTROL_METHODS = [
  'Ã¬ÂÂ¡Ã¬ÂÂ ÃªÂ²ÂÃ¬ÂÂ¬', 'Ã¬Â¹ÂÃ¬ÂÂ Ã¬Â¸Â¡Ã¬Â Â', 'ÃªÂ¸Â°Ã«ÂÂ¥ Ã¬ÂÂÃ­ÂÂ', 'Ã¬Â ÂÃªÂ¸Â° Ã¬ÂÂÃ­ÂÂ', 'Ã¬ÂÂ±Ã«ÂÂ¥ Ã¬ÂÂÃ­ÂÂ',
  'Ã¬ÂÂÃ¬ÂÂ Ã¬Â§ÂÃ¬ÂÂÃ¬ÂÂ Ã¬Â¤ÂÃ¬ÂÂ', 'ÃªÂ³ÂµÃ¬Â Â Ã­ÂÂÃ«ÂÂ¼Ã«Â¯Â¸Ã­ÂÂ° Ã«ÂªÂ¨Ã«ÂÂÃ­ÂÂ°Ã«Â§Â', 'Ã­ÂÂµÃªÂ³ÂÃ¬Â Â ÃªÂ³ÂµÃ¬Â Â ÃªÂ´ÂÃ«Â¦Â¬ (SPC)',
  'Ã«Â°Â©Ã«Â²Â Ã¬ÂÂ Ã­ÂÂ¨Ã¬ÂÂ± Ã­ÂÂÃ¬ÂÂ¸', 'Ã¬ÂÂ¤Ã«Â¹Â ÃªÂµÂÃ¬Â Â Ã­ÂÂÃ¬ÂÂ¸', 'Ã¬ÂÂ¨Ã«ÂÂ/Ã¬ÂÂµÃ«ÂÂ Ã«ÂªÂ¨Ã«ÂÂÃ­ÂÂ°Ã«Â§Â', 'ÃªÂ¸Â°Ã­ÂÂ',
]

// ÃªÂ¸Â°Ã«Â¡Â Ã¬ÂÂ Ã­ÂÂ
const RECORD_TYPES = [
  'Ã«Â°Â°Ã¬Â¹Â ÃªÂ¸Â°Ã«Â¡Â (EBR)', 'ÃªÂ²ÂÃ¬ÂÂ¬ ÃªÂ¸Â°Ã«Â¡Â', 'Ã¬ÂÂ¥Ã«Â¹Â Ã«Â¡ÂÃªÂ·Â¸', 'ÃªÂµÂÃ¬Â Â ÃªÂ¸Â°Ã«Â¡Â',
  'Ã­ÂÂÃªÂ²Â½ Ã«ÂªÂ¨Ã«ÂÂÃ­ÂÂ°Ã«Â§Â ÃªÂ¸Â°Ã«Â¡Â', 'Ã¬ÂÂ¼Ã­ÂÂ ÃªÂ¸Â°Ã«Â¡Â', 'Ã¬ÂÂÃ¬ÂÂ Ã¬Â§ÂÃ¬ÂÂÃ¬ÂÂ', 'ÃªÂ¸Â°Ã­ÂÂ',
]

function genPcpId() { return `PCP-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }
function genStepId() { return `STEP-${String(Date.now()).slice(-6)}` }
function today()    { return new Date().toISOString().slice(0, 10) }

const EMPTY_STEP = {
  id: '', seq: 1, processType: 'Ã¬Â¡Â°Ã«Â¦Â½', stepName: '', wiNo: '',
  equipment: '', materials: '',
  controlParams: '',    // ÃªÂ´ÂÃ«Â¦Â¬ Ã­ÂÂÃ«ÂÂ¼Ã«Â¯Â¸Ã­ÂÂ° (Ã¬ÂÂ¨Ã«ÂÂ, Ã¬ÂÂÃ«Â Â¥, Ã¬ÂÂÃªÂ°Â Ã«ÂÂ±)
  controlMethod: 'Ã¬ÂÂ¡Ã¬ÂÂ ÃªÂ²ÂÃ¬ÂÂ¬',
  acceptanceCriteria: '',
  samplePlan: '',       // Ã¬ÂÂÃ­ÂÂÃ«Â§Â ÃªÂ³ÂÃ­ÂÂ
  frequency: 'Ã«Â§Â¤ Ã«Â¡ÂÃ­ÂÂ¸',
  recordType: 'Ã«Â°Â°Ã¬Â¹Â ÃªÂ¸Â°Ã«Â¡Â (EBR)',
  responsible: '',
  linkedValidationId: '', linkedEquipmentId: '',
  specialProcess: false, // Ã­ÂÂ¹Ã¬ÂÂ ÃªÂ³ÂµÃ¬Â Â Ã¬ÂÂ¬Ã«Â¶Â (ÃÂ§7.5.6)
  notes: '',
}

const EMPTY_PCP = {
  pcpNo: '', revision: 'Rev.0', status: 'draft',
  productKey: '', productName: '', productCode: '', deviceClass: 'Class II',
  preparedBy: '', reviewedBy: '', approvedBy: '',
  issueDate: today(), reviewDate: '',
  scope: '',            // Ã¬Â ÂÃ¬ÂÂ© Ã«Â²ÂÃ¬ÂÂ
  releaseCriteria: '',  // Ã¬Â¶ÂÃ­ÂÂ ÃªÂ¸Â°Ã¬Â¤Â ÃÂ§7.5.1(f)
  environmentReqs: '',  // Ã­ÂÂÃªÂ²Â½ Ã¬ÂÂÃªÂµÂ¬Ã¬ÂÂ¬Ã­ÂÂ­ ÃÂ§7.5.1(e)
  monitoringPlan: '',   // Ã«ÂªÂ¨Ã«ÂÂÃ­ÂÂ°Ã«Â§Â ÃªÂ³ÂÃ­ÂÂ ÃÂ§7.5.1(g)
  linkedDmrId: '', linkedDhfId: '', linkedValidationId: '',
  steps: [],            // ÃªÂ³ÂµÃ¬Â Â Ã«ÂÂ¨ÃªÂ³Â Ã«ÂªÂ©Ã«Â¡Â
  notes: '',
}

// Ã¢ÂÂÃ¢ÂÂ Ã«Â©ÂÃ¬ÂÂ¸ Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
export default function ProductionControlHub({ embedded = false, productKey: scopeProductKey = null, productLabel = '' } = {}) {
  const user = auth.current()
  const companyId = user?.company_id
  const canEdit = user?.level >= 2
  const [searchParams] = useSearchParams()
  // #305: Ã¬Â ÂÃ­ÂÂÃªÂ³ÂµÃ¬Â Â(ProductsHub)Ã¬ÂÂ Ã¬ÂÂÃ«Â²Â Ã«ÂÂÃ«ÂÂ  Ã«ÂÂÃ«ÂÂ Ã­ÂÂ´Ã«ÂÂ¹ Ã¬Â ÂÃ­ÂÂ(productKey)Ã¬ÂÂ PCPÃ«Â§Â Ã«ÂÂ¸Ã¬Â¶ÂÃ­ÂÂÃ«ÂÂ¤.
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
  // KGMP LOTÃ«Â²ÂÃ­ÂÂ¸ Ã¬Â²Â´ÃªÂ³Â
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
    return [lotCfg.prefix, datePart, seq].filter(Boolean).join(lotCfg.sep||'')||'(Ã«Â¯Â¸Ã¬ÂÂ¤Ã¬Â Â)'
  }


  function save(list) {
    setPcps(list)
    localStorage.setItem(LS_KEY, JSON.stringify(list))
    if (_sbCidPc) supabase.from('company_data').upsert({company_id: _sbCidPc, data_type: 'localStorage_sync', data_key: LS_KEY, payload: list}, {onConflict: 'company_id,data_type,data_key'})
  }

  function submitPcp() {
    if (!form.productName.trim()) return alert('Ã¬Â ÂÃ­ÂÂÃ«ÂªÂÃ¬ÂÂ Ã¬ÂÂÃ«Â Â¥Ã­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ.')
    const isEdit = !!editId
    const obj = isEdit
      ? pcps.map(p => p.id === editId ? { ...p, ...form } : p)
      : [{ id: genPcpId(), createdAt: today(), ...form, pcpNo: form.pcpNo || genPcpId(), steps: form.steps || [] }, ...pcps]
    save(obj)
    setShowForm(false); setForm(EMPTY_PCP); setEditId(null)
  }

  function deletePcp(id) {
    if (!confirm('Ã¬ÂÂÃ¬ÂÂ° Ã¬Â ÂÃ¬ÂÂ´ ÃªÂ³ÂÃ­ÂÂÃ¬ÂÂ Ã¬ÂÂ­Ã¬Â ÂÃ­ÂÂÃ¬ÂÂÃªÂ²Â Ã¬ÂÂµÃ«ÂÂÃªÂ¹Â?')) return
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

  // ÃªÂ³ÂµÃ¬Â Â Ã«ÂÂ¨ÃªÂ³Â Ã­ÂÂ¸Ã¬Â§Â (Ã­ÂÂ¼ Ã«ÂÂ´Ã¬ÂÂÃ¬ÂÂ)
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

  // Ã¬ÂÂÃ¬ÂÂ¸ Ã«Â·Â°Ã¬ÂÂÃ¬ÂÂ Ã«ÂÂ¨ÃªÂ³Â Ã¬ÂÂ¸Ã«ÂÂ¼Ã¬ÂÂ¸ Ã­ÂÂ¸Ã¬Â§Â
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

        {/* Ã­ÂÂ­ */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-soft)' }}>
          {[
            { key: 'list',     label: `PCP Ã«ÂªÂ©Ã«Â¡Â (${scopedPcps.length})` },
            { key: 'detail',   label: selectedPcp ? `ÃªÂ³ÂµÃ¬Â ÂÃ­ÂÂ: ${selectedPcp.productName}` : 'ÃªÂ³ÂµÃ¬Â Â Ã¬ÂÂÃ¬ÂÂ¸' },
            { key: 'analysis', label: 'Ã­ÂÂÃ­ÂÂ© Ã«Â¶ÂÃ¬ÂÂ' },
            { key: 'lot', label: 'LOT Ã¬Â²Â´ÃªÂ³Â Ã¬ÂÂ¤Ã¬Â Â' },
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

        {/* Ã¢ÂÂÃ¢ÂÂ Ã«ÂªÂ©Ã«Â¡Â Ã­ÂÂ­ Ã¢ÂÂÃ¢ÂÂ */}
        {tab === 'list' && (
          <div>
            <div className="flex flex-wrap gap-2 mb-4 items-center">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-[13px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                <option value="all">Ã¬Â ÂÃ¬Â²Â´ Ã¬ÂÂÃ­ÂÂ</option>
                {Object.entries(PCP_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              {canEdit && (
                <button onClick={() => { setForm({ ...EMPTY_PCP, productKey: scopeKey || '', productName: scopeKey ? productLabel : '' }); setEditId(null); setShowForm(true) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold ml-auto"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} /> PCP Ã«ÂÂ±Ã«Â¡Â
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
                <div className="text-center py-16 text-[13px]" style={{ color: 'var(--ink-faint)' }}>Ã«ÂÂ±Ã«Â¡ÂÃ«ÂÂ Ã¬ÂÂÃ¬ÂÂ° Ã¬Â ÂÃ¬ÂÂ´ ÃªÂ³ÂÃ­ÂÂÃ¬ÂÂ´ Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤.</div>
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
                          <span>ÃªÂ³ÂµÃ¬Â Â Ã«ÂÂ¨ÃªÂ³Â: <strong>{steps.length}</strong>ÃªÂ°Â</span>
                          {specialCount > 0 && <span style={{ color: '#7C3AED' }}>Ã­ÂÂ¹Ã¬ÂÂ ÃªÂ³ÂµÃ¬Â Â: {specialCount}ÃªÂ°Â</span>}
                          {missingCrit > 0 && <span style={{ color: '#DC2626' }}>Ã¢ÂÂ  Ã­ÂÂ©ÃªÂ²Â© ÃªÂ¸Â°Ã¬Â¤Â Ã«Â¯Â¸Ã«ÂÂ±Ã«Â¡Â: {missingCrit}ÃªÂ°Â</span>}
                          {pcp.approvedBy && <span>Ã¬ÂÂ¹Ã¬ÂÂ¸Ã¬ÂÂ: {pcp.approvedBy}</span>}
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

        {/* Ã¢ÂÂÃ¢ÂÂ ÃªÂ³ÂµÃ¬Â Â Ã¬ÂÂÃ¬ÂÂ¸ Ã­ÂÂ­ Ã¢ÂÂÃ¢ÂÂ */}
        {tab === 'detail' && !selectedPcp && (
          <div className="text-center py-16 text-[13px]" style={{ color: 'var(--ink-faint)' }}>Ã«ÂªÂ©Ã«Â¡ÂÃ¬ÂÂÃ¬ÂÂ PCPÃ«Â¥Â¼ Ã¬ÂÂ Ã­ÂÂÃ­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ.</div>
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

        {/* Ã¢ÂÂÃ¢ÂÂ Ã«Â¶ÂÃ¬ÂÂ Ã­ÂÂ­ Ã¢ÂÂÃ¢ÂÂ */}
        {tab === 'analysis' && <AnalysisView analysis={analysis} pcps={scopedPcps} />}

        {/* KGMP LOTÃ«Â²ÂÃ­ÂÂ¸ Ã¬Â²Â´ÃªÂ³Â Ã¬ÂÂ¤Ã¬Â Â */}
        {tab === 'lot' && (
          <div>
            <div style={{fontSize:13.5,fontWeight:700,color:'var(--ink)',marginBottom:4}}>LOTÃ«Â²ÂÃ­ÂÂ¸ Ã¬Â²Â´ÃªÂ³Â Ã¬ÂÂ¤Ã¬Â Â</div>
            <div style={{fontSize:12,color:'var(--ink-mute)',marginBottom:16}}>KGMP ÃÂ§7 Ã¢ÂÂ Ã¬Â ÂÃ¬Â¡Â°Ã«Â²ÂÃ­ÂÂ¸(Ã«Â¶ÂÃ«Â²ÂÃ­ÂÂ¸) Ã¬Â²Â´ÃªÂ³Â Ã¬ÂÂ¤Ã¬Â Â Ã«Â°Â Ã«Â°ÂÃ«Â²Â ÃªÂ¸Â°Ã«Â¡Â</div>
            <div style={{background:'var(--bg-card)',border:'1px solid var(--line)',borderRadius:12,padding:20,marginBottom:20}}>
              <div style={{fontSize:13,fontWeight:600,color:'var(--ink)',marginBottom:12}}>Ã­ÂÂÃ¬ÂÂ Ã¬ÂÂ¤Ã¬Â Â</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr',gap:12,marginBottom:16}}>
                <div><div style={{fontSize:11.5,color:'var(--ink-mute)',marginBottom:4}}>Ã¬Â ÂÃ«ÂÂÃ¬ÂÂ¬</div>
                  <input value={lotCfg.prefix} onChange={e=>saveLotCfg({...lotCfg,prefix:e.target.value})} placeholder="Ã¬ÂÂ: KT" style={{width:'100%',padding:'7px 10px',borderRadius:7,border:'1px solid var(--line)',fontSize:12.5,boxSizing:'border-box',background:'var(--bg)',color:'var(--ink)'}} /></div>
                <div><div style={{fontSize:11.5,color:'var(--ink-mute)',marginBottom:4}}>Ã¬ÂÂ°Ã«ÂÂ</div>
                  <select value={lotCfg.yearFmt} onChange={e=>saveLotCfg({...lotCfg,yearFmt:e.target.value})} style={{width:'100%',padding:'7px 10px',borderRadius:7,border:'1px solid var(--line)',fontSize:12.5,background:'var(--bg)',color:'var(--ink)'}}>
                    <option value="YY">YY</option><option value="YYYY">YYYY</option>
                  </select></div>
                <div><div style={{fontSize:11.5,color:'var(--ink-mute)',marginBottom:4}}>Ã¬ÂÂ</div>
                  <select value={lotCfg.monthFmt} onChange={e=>saveLotCfg({...lotCfg,monthFmt:e.target.value})} style={{width:'100%',padding:'7px 10px',borderRadius:7,border:'1px solid var(--line)',fontSize:12.5,background:'var(--bg)',color:'var(--ink)'}}>
                    <option value="MM">MM Ã­ÂÂ¬Ã­ÂÂ¨</option><option value="(none)">Ã¬ÂÂÃ«ÂÂµ</option>
                  </select></div>
                <div><div style={{fontSize:11.5,color:'var(--ink-mute)',marginBottom:4}}>Ã¬ÂÂ¼Ã«Â Â¨Ã«Â²ÂÃ­ÂÂ¸ Ã¬ÂÂÃ«Â¦Â¿Ã¬ÂÂ</div>
                  <select value={lotCfg.seqDigits} onChange={e=>saveLotCfg({...lotCfg,seqDigits:Number(e.target.value)})} style={{width:'100%',padding:'7px 10px',borderRadius:7,border:'1px solid var(--line)',fontSize:12.5,background:'var(--bg)',color:'var(--ink)'}}>
                    {[2,3,4,5].map(n=><option key={n} value={n}>{n}Ã¬ÂÂÃ«Â¦Â¬</option>)}
                  </select></div>
                <div><div style={{fontSize:11.5,color:'var(--ink-mute)',marginBottom:4}}>ÃªÂµÂ¬Ã«Â¶ÂÃ¬ÂÂ</div>
                  <select value={lotCfg.sep} onChange={e=>saveLotCfg({...lotCfg,sep:e.target.value})} style={{width:'100%',padding:'7px 10px',borderRadius:7,border:'1px solid var(--line)',fontSize:12.5,background:'var(--bg)',color:'var(--ink)'}}>
                    <option value="-">-</option><option value="">Ã¬ÂÂÃ¬ÂÂ</option><option value="/">/</option>
                  </select></div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:14}}>
                <div style={{fontSize:12.5,color:'var(--ink-mute)'}}>Ã«Â¯Â¸Ã«Â¦Â¬Ã«Â³Â´ÃªÂ¸Â°:</div>
                <div style={{fontFamily:'monospace',fontSize:15,fontWeight:700,color:'#059669',background:'#D1FAE5',padding:'4px 14px',borderRadius:6}}>{previewLot()}</div>
                <button onClick={genLot} style={{padding:'8px 18px',borderRadius:8,border:'none',background:'#2563EB',color:'#fff',fontSize:12.5,fontWeight:600,cursor:'pointer'}}>LOT Ã«Â²ÂÃ­ÂÂ¸ Ã«Â°ÂÃ«Â²Â</button>
              </div>
            </div>
            {lotLog.length>0 && (
              <div style={{background:'var(--bg-card)',border:'1px solid var(--line)',borderRadius:12,padding:20}}>
                <div style={{fontSize:13,fontWeight:600,color:'var(--ink)',marginBottom:12}}>LOT Ã«Â°ÂÃ«Â²Â Ã¬ÂÂ´Ã«Â Â¥</div>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:12.5}}>
                  <thead><tr><th style={{padding:'7px 10px',textAlign:'left',color:'var(--ink-mute)',borderBottom:'1px solid var(--line)'}}>#</th><th style={{padding:'7px 10px',textAlign:'left',color:'var(--ink-mute)',borderBottom:'1px solid var(--line)'}}>LOTÃ«Â²ÂÃ­ÂÂ¸</th><th style={{padding:'7px 10px',textAlign:'left',color:'var(--ink-mute)',borderBottom:'1px solid var(--line)'}}>Ã«Â°ÂÃ«Â²ÂÃ¬ÂÂ¼</th></tr></thead>
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
    <AppLayout user={user} title="Ã¬ÂÂÃ¬ÂÂ° Ã¬Â ÂÃ¬ÂÂ´ ÃªÂ³ÂÃ­ÂÂ" subtitle="ISO 13485 ÃÂ§7.5.1 Ã¢ÂÂ ÃªÂ³ÂµÃ¬Â Â Ã«ÂÂ¨ÃªÂ³ÂÃ«Â³Â ÃªÂ´ÂÃ«Â¦Â¬ Ã­ÂÂ­Ã«ÂªÂ©ÃÂ·Ã­ÂÂ©ÃªÂ²Â© ÃªÂ¸Â°Ã¬Â¤ÂÃÂ·Ã¬Â¶ÂÃ­ÂÂ ÃªÂ¸Â°Ã¬Â¤Â">
      <HubBanner title="Ã¬ÂÂÃ¬ÂÂ° Ã¬Â ÂÃ¬ÂÂ´ ÃªÂ³ÂÃ­ÂÂ" subtitle="ISO 13485 ÃÂ§7.5.1 Ã¢ÂÂ Ã¬ÂÂÃ¬ÂÂ° Ã«Â°Â Ã¬ÂÂÃ«Â¹ÂÃ¬ÂÂ¤ Ã¬Â ÂÃªÂ³Âµ ÃªÂ´ÂÃ«Â¦Â¬" icon={Settings} color="#EA580C" workflow={['ÃªÂ³ÂÃ­ÂÂ Ã¬ÂÂÃ«Â¦Â½','ÃªÂ³ÂµÃ¬Â Â Ã¬ÂÂ¹Ã¬ÂÂ¸','Ã¬ÂÂÃ¬ÂÂ° Ã¬ÂÂ¤Ã­ÂÂ','ÃªÂ²ÂÃ¬ÂÂ¬','Ã¬Â¶ÂÃ­ÂÂ Ã¬ÂÂ¹Ã¬ÂÂ¸']} />
      {body}
    </AppLayout>
  )
}

// Ã¢ÂÂÃ¢ÂÂ PCP Ã¬ÂÂÃ¬ÂÂ¸ Ã«Â·Â° Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
function PcpDetailView({ pcp, canEdit, editingStepId, stepDraft, setEditingStepId, setStepDraft, onSaveStep, onAddStep, onDeleteStep }) {
  const steps = pcp.steps || []
  const st = PCP_STATUSES[pcp.status] || PCP_STATUSES.draft

  return (
    <div className="space-y-5">
      {/* PCP Ã­ÂÂ¤Ã«ÂÂ */}
      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div>
            <div className="font-bold text-[16px]" style={{ color: 'var(--ink)' }}>{pcp.productName}</div>
            <div className="text-[12.5px]" style={{ color: 'var(--ink-soft)' }}>
              {pcp.pcpNo} ÃÂ· {pcp.revision} ÃÂ·
              <span className="ml-1 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px]">
          {[['Ã¬ÂÂÃ¬ÂÂ±Ã¬ÂÂ', pcp.preparedBy], ['ÃªÂ²ÂÃ­ÂÂ Ã¬ÂÂ', pcp.reviewedBy], ['Ã¬ÂÂ¹Ã¬ÂÂ¸Ã¬ÂÂ', pcp.approvedBy], ['Ã¬ÂÂ Ã­ÂÂ¨Ã¬ÂÂ¼', pcp.issueDate]].map(([l, v]) =>
            v && <div key={l}><span style={{ color: 'var(--ink-faint)' }}>{l}: </span><span style={{ color: 'var(--ink)' }}>{v}</span></div>
          )}
        </div>
        {pcp.releaseCriteria && (
          <div className="mt-3 p-3 rounded-xl text-[12.5px]" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
            <span className="font-bold" style={{ color: '#1E40AF' }}>ÃÂ§7.5.1(f) Ã¬Â¶ÂÃ­ÂÂ ÃªÂ¸Â°Ã¬Â¤Â: </span>
            <span style={{ color: '#1E40AF' }}>{pcp.releaseCriteria}</span>
          </div>
        )}
      </div>

      {/* ÃªÂ³ÂµÃ¬Â Â Ã«ÂÂ¨ÃªÂ³Â Ã­ÂÂÃ¬ÂÂ´Ã«Â¸Â */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[13px] font-bold" style={{ color: 'var(--ink)' }}>ÃªÂ³ÂµÃ¬Â Â Ã«ÂÂ¨ÃªÂ³Â ({steps.length}ÃªÂ°Â)</div>
          {canEdit && (
            <button onClick={onAddStep} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12px] font-semibold"
              style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--moss)', cursor: 'pointer' }}>
              <Plus size={12} /> Ã«ÂÂ¨ÃªÂ³Â Ã¬Â¶ÂÃªÂ°Â
            </button>
          )}
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: 'var(--bg-soft)' }}>
                {['#', 'ÃªÂ³ÂµÃ¬Â Â Ã«ÂÂ¨ÃªÂ³Â', 'ÃªÂ´ÂÃ«Â¦Â¬ Ã­ÂÂÃ«ÂÂ¼Ã«Â¯Â¸Ã­ÂÂ°', 'ÃªÂ´ÂÃ«Â¦Â¬ Ã«Â°Â©Ã«Â²Â', 'Ã­ÂÂ©ÃªÂ²Â© ÃªÂ¸Â°Ã¬Â¤Â', 'Ã«Â¹ÂÃ«ÂÂ', 'ÃªÂ¸Â°Ã«Â¡Â', 'Ã«ÂÂ´Ã«ÂÂ¹', ''].map(h => (
                  <th key={h} className="px-2 py-2 text-left font-semibold" style={{ color: 'var(--ink-soft)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {steps.length === 0 && (
                <tr><td colSpan={9} className="text-center py-10" style={{ color: 'var(--ink-faint)' }}>ÃªÂ³ÂµÃ¬Â Â Ã«ÂÂ¨ÃªÂ³ÂÃ«Â¥Â¼ Ã¬Â¶ÂÃªÂ°ÂÃ­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ.</td></tr>
              )}
              {steps.map((step, idx) => {
                const isEditing = editingStepId === step.id
                const d = isEditing ? stepDraft : step
                const missingCrit = !step.acceptanceCriteria
                return (
                  <tr key={step.id} style={{ background: idx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-soft)', borderTop: '1px solid var(--line)' }}>
                    <td className="px-2 py-2 text-center font-bold" style={{ color: 'var(--ink-soft)' }}>
                      <div className="flex items-center gap-0.5">
                        {step.specialProcess && <span title="Ã­ÂÂ¹Ã¬ÂÂ ÃªÂ³ÂµÃ¬Â Â" style={{ color: '#7C3AED', fontSize: 11 }}>Ã¢ÂÂ</span>}
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
                            placeholder="Ã¬ÂÂ¨Ã«ÂÂ, Ã¬ÂÂÃ«Â Â¥, Ã¬ÂÂÃªÂ°Â..."
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
                            placeholder="Ã­ÂÂ©ÃªÂ²Â© ÃªÂ¸Â°Ã¬Â¤Â..."
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
                              style={{ background: '#D1FAE5', color: '#059669', border: 'none', cursor: 'pointer' }}>Ã¬Â ÂÃ¬ÂÂ¥</button>
                            <button onClick={() => { setEditingStepId(null); setStepDraft(null) }}
                              className="px-2 py-0.5 rounded text-[11px]"
                              style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink-soft)', cursor: 'pointer' }}>Ã¬Â·Â¨Ã¬ÂÂ</button>
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
                            ? <span className="text-[11px] text-red-500">Ã¢ÂÂ  Ã«Â¯Â¸Ã«ÂÂ±Ã«Â¡Â</span>
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
            Ã¢ÂÂ Ã­ÂÂ¹Ã¬ÂÂ ÃªÂ³ÂµÃ¬Â Â (ÃÂ§7.5.6) Ã¢ÂÂ ÃªÂ²Â°ÃªÂ³Â¼Ã«Â¥Â¼ ÃªÂ²ÂÃ¬ÂÂ¬Ã«Â¡Â Ã¬ÂÂÃ¬Â ÂÃ­ÂÂ Ã­ÂÂÃ¬ÂÂ¸Ã­ÂÂ  Ã¬ÂÂ Ã¬ÂÂÃ¬ÂÂ´ Ã¬ÂÂ Ã­ÂÂ¨Ã¬ÂÂ± Ã­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ´ Ã­ÂÂÃ¬ÂÂÃ­ÂÂ ÃªÂ³ÂµÃ¬Â Â
          </div>
        )}
      </div>

      {/* Ã¬Â¶ÂÃªÂ°Â Ã¬Â ÂÃ«Â³Â´ */}
      {(pcp.environmentReqs || pcp.monitoringPlan) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pcp.environmentReqs && (
            <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="text-[12.5px] font-bold mb-1" style={{ color: 'var(--ink)' }}>ÃÂ§7.5.1(e) Ã­ÂÂÃªÂ²Â½ Ã¬ÂÂÃªÂµÂ¬Ã¬ÂÂ¬Ã­ÂÂ­</div>
              <p className="text-[12.5px] whitespace-pre-line" style={{ color: 'var(--ink-soft)' }}>{pcp.environmentReqs}</p>
            </div>
          )}
          {pcp.monitoringPlan && (
            <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="text-[12.5px] font-bold mb-1" style={{ color: 'var(--ink)' }}>ÃÂ§7.5.1(g) Ã«ÂªÂ¨Ã«ÂÂÃ­ÂÂ°Ã«Â§Â ÃªÂ³ÂÃ­ÂÂ</div>
              <p className="text-[12.5px] whitespace-pre-line" style={{ color: 'var(--ink-soft)' }}>{pcp.monitoringPlan}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Ã¢ÂÂÃ¢ÂÂ PCP Ã«ÂÂ±Ã«Â¡Â Ã­ÂÂ¼ Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
function PcpForm({ form, F, onSave, onCancel, isEdit, addStep, updateStep, removeStep, moveStep }) {
  return (
    <div className="mb-5 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>{isEdit ? 'PCP Ã¬ÂÂÃ¬Â Â' : 'Ã¬ÂÂÃ¬ÂÂ° Ã¬Â ÂÃ¬ÂÂ´ ÃªÂ³ÂÃ­ÂÂ Ã«ÂÂ±Ã«Â¡Â (ÃÂ§7.5.1)'}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <Field label="Ã¬Â ÂÃ­ÂÂÃ«ÂªÂ *" value={form.productName} onChange={v => F('productName', v)} />
        <Field label="Ã¬Â ÂÃ­ÂÂ Ã¬Â½ÂÃ«ÂÂ" value={form.productCode} onChange={v => F('productCode', v)} />
        <Field label="PCP Ã«Â²ÂÃ­ÂÂ¸" value={form.pcpNo} onChange={v => F('pcpNo', v)} placeholder="Ã¬ÂÂÃ«ÂÂ Ã¬ÂÂÃ¬ÂÂ±" />
        <Field label="ÃªÂ°ÂÃ¬Â Â Ã«Â²ÂÃ­ÂÂ¸" value={form.revision} onChange={v => F('revision', v)} placeholder="Rev.0" />
        <FieldSelect label="Ã¬ÂÂÃ­ÂÂ" value={form.status} onChange={v => F('status', v)}
          options={Object.entries(PCP_STATUSES).map(([k, v]) => ({ value: k, label: v.label }))} />
        <Field label="Ã¬ÂÂ Ã­ÂÂ¨Ã¬ÂÂ¼" type="date" value={form.issueDate} onChange={v => F('issueDate', v)} />
        <Field label="Ã¬ÂÂÃ¬ÂÂ±Ã¬ÂÂ" value={form.preparedBy} onChange={v => F('preparedBy', v)} />
        <Field label="ÃªÂ²ÂÃ­ÂÂ Ã¬ÂÂ" value={form.reviewedBy} onChange={v => F('reviewedBy', v)} />
        <Field label="Ã¬ÂÂ¹Ã¬ÂÂ¸Ã¬ÂÂ" value={form.approvedBy} onChange={v => F('approvedBy', v)} />
        <Field label="Ã¬ÂÂ°ÃªÂ²Â° DMR ID" value={form.linkedDmrId} onChange={v => F('linkedDmrId', v)} placeholder="DMR-xxxx" />
        <Field label="Ã¬ÂÂ°ÃªÂ²Â° DHF ID" value={form.linkedDhfId} onChange={v => F('linkedDhfId', v)} placeholder="DHF-xxxx" />
        <Field label="Ã¬ÂÂ°ÃªÂ²Â° Ã«Â°Â¸Ã«Â¦Â¬Ã«ÂÂ°Ã¬ÂÂ´Ã¬ÂÂ ID" value={form.linkedValidationId} onChange={v => F('linkedValidationId', v)} placeholder="VAL-xxxx" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <FieldArea label="ÃÂ§7.5.1(f) Ã¬Â¶ÂÃ­ÂÂ ÃªÂ¸Â°Ã¬Â¤Â" value={form.releaseCriteria} onChange={v => F('releaseCriteria', v)} rows={2}
          placeholder="Ã«ÂªÂ¨Ã«ÂÂ  ÃªÂ³ÂµÃ¬Â Â Ã«ÂÂ¨ÃªÂ³Â Ã­ÂÂ©ÃªÂ²Â©, Ã¬ÂµÂÃ¬Â¢Â ÃªÂ²ÂÃ¬ÂÂ¬ Ã­ÂÂ©ÃªÂ²Â©, Ã«Â°Â°Ã¬Â¹Â ÃªÂ¸Â°Ã«Â¡Â Ã¬ÂÂÃªÂ²Â°..." />
        <FieldArea label="ÃÂ§7.5.1(e) Ã­ÂÂÃªÂ²Â½ Ã¬ÂÂÃªÂµÂ¬Ã¬ÂÂ¬Ã­ÂÂ­" value={form.environmentReqs} onChange={v => F('environmentReqs', v)} rows={2}
          placeholder="Ã­ÂÂ´Ã«Â¦Â°Ã«Â£Â¸ Class 10000, Ã¬ÂÂ¨Ã«ÂÂ 20ÃÂ±5ÃÂ°C, Ã¬ÂÂµÃ«ÂÂ 40~60%..." />
        <FieldArea label="ÃÂ§7.5.1(g) Ã«ÂªÂ¨Ã«ÂÂÃ­ÂÂ°Ã«Â§Â ÃªÂ³ÂÃ­ÂÂ" value={form.monitoringPlan} onChange={v => F('monitoringPlan', v)} rows={2} />
        <FieldArea label="Ã«Â¹ÂÃªÂ³Â " value={form.notes} onChange={v => F('notes', v)} rows={2} />
      </div>

      {/* ÃªÂ³ÂµÃ¬Â Â Ã«ÂÂ¨ÃªÂ³Â */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[13px] font-bold" style={{ color: 'var(--ink)' }}>ÃªÂ³ÂµÃ¬Â Â Ã«ÂÂ¨ÃªÂ³Â</div>
          <button onClick={addStep} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12px] font-semibold"
            style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--moss)', cursor: 'pointer' }}>
            <Plus size={12} /> Ã«ÂÂ¨ÃªÂ³Â Ã¬Â¶ÂÃªÂ°Â
          </button>
        </div>
        {(form.steps || []).length === 0 ? (
          <div className="text-center py-6 text-[13px]" style={{ color: 'var(--ink-faint)' }}>ÃªÂ³ÂµÃ¬Â Â Ã«ÂÂ¨ÃªÂ³ÂÃ«Â¥Â¼ Ã¬Â¶ÂÃªÂ°ÂÃ­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ.</div>
        ) : (form.steps || []).map((step, idx) => (
          <div key={step.id} className="mb-2 p-3 rounded-xl" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-bold text-[12px] w-5 text-center" style={{ color: 'var(--moss)' }}>{step.seq}</span>
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                <input value={step.stepName} onChange={e => updateStep(step.id, 'stepName', e.target.value)}
                  placeholder="Ã«ÂÂ¨ÃªÂ³Â Ã¬ÂÂ´Ã«Â¦Â *"
                  className="px-2 py-1 rounded-lg text-[12.5px]"
                  style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
                <select value={step.processType} onChange={e => updateStep(step.id, 'processType', e.target.value)}
                  className="px-2 py-1 rounded-lg text-[12.5px]"
                  style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                  {PROCESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input value={step.acceptanceCriteria} onChange={e => updateStep(step.id, 'acceptanceCriteria', e.target.value)}
                  placeholder="Ã­ÂÂ©ÃªÂ²Â© ÃªÂ¸Â°Ã¬Â¤Â *"
                  className="px-2 py-1 rounded-lg text-[12.5px]"
                  style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
                <input value={step.responsible} onChange={e => updateStep(step.id, 'responsible', e.target.value)}
                  placeholder="Ã«ÂÂ´Ã«ÂÂ¹Ã¬ÂÂ"
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
                placeholder="ÃªÂ´ÂÃ«Â¦Â¬ Ã­ÂÂÃ«ÂÂ¼Ã«Â¯Â¸Ã­ÂÂ°"
                className="px-2 py-1 rounded-lg text-[12px]"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
              <select value={step.controlMethod} onChange={e => updateStep(step.id, 'controlMethod', e.target.value)}
                className="px-2 py-1 rounded-lg text-[12px]"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                {CONTROL_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <input value={step.frequency} onChange={e => updateStep(step.id, 'frequency', e.target.value)}
                placeholder="Ã«Â¹ÂÃ«ÂÂ (Ã«Â§Â¤ Ã«Â¡ÂÃ­ÂÂ¸)"
                className="px-2 py-1 rounded-lg text-[12px]"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
              <label className="flex items-center gap-1.5 text-[12px] cursor-pointer" style={{ color: '#7C3AED' }}>
                <input type="checkbox" checked={!!step.specialProcess} onChange={e => updateStep(step.id, 'specialProcess', e.target.checked)}
                  className="accent-violet-600 w-3.5 h-3.5" />
                Ã­ÂÂ¹Ã¬ÂÂ ÃªÂ³ÂµÃ¬Â Â
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={onSave} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
          style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
          <Save size={13} /> Ã¬Â ÂÃ¬ÂÂ¥
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-[13px]"
          style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>Ã¬Â·Â¨Ã¬ÂÂ</button>
      </div>
    </div>
  )
}

// Ã¢ÂÂÃ¢ÂÂ Ã«Â¶ÂÃ¬ÂÂ Ã«Â·Â° Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
function AnalysisView({ analysis, pcps }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Ã¬Â´Â PCP', value: pcps.length, color: '#2563EB', bg: '#DBEAFE' },
          { label: 'Ã¬Â´Â ÃªÂ³ÂµÃ¬Â Â Ã«ÂÂ¨ÃªÂ³Â', value: analysis.totalSteps, color: '#7C3AED', bg: '#EDE9FE' },
          { label: 'Ã­ÂÂ¹Ã¬ÂÂ ÃªÂ³ÂµÃ¬Â Â', value: analysis.specialSteps, color: '#D97706', bg: '#FEF3C7' },
          { label: 'ÃªÂ¸Â°Ã¬Â¤Â Ã«Â¯Â¸Ã«ÂÂ±Ã«Â¡Â PCP', value: analysis.missingCriteria.length, color: analysis.missingCriteria.length > 0 ? '#DC2626' : '#059669', bg: analysis.missingCriteria.length > 0 ? '#FEE2E2' : '#D1FAE5' },
        ].map(c => (
          <div key={c.label} className="p-4 rounded-2xl text-center" style={{ background: c.bg, border: `1px solid ${c.color}30` }}>
            <div className="text-[26px] font-bold" style={{ color: c.color }}>{c.value}</div>
            <div className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>PCP Ã¬ÂÂÃ­ÂÂÃ«Â³Â Ã«Â¶ÂÃ­ÂÂ¬</div>
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
          <div className="text-[13px] font-bold mb-2" style={{ color: '#92400E' }}>Ã¢ÂÂ  Ã­ÂÂ©ÃªÂ²Â© ÃªÂ¸Â°Ã¬Â¤Â Ã«Â¯Â¸Ã«ÂÂ±Ã«Â¡Â PCP</div>
          {analysis.missingCriteria.map(p => (
            <div key={p.id} className="text-[12.5px] mb-1" style={{ color: '#92400E' }}>
              {p.productName} Ã¢ÂÂ {p.steps?.filter(s => !s.acceptanceCriteria).map(s => s.stepName || `Ã«ÂÂ¨ÃªÂ³Â${s.seq}`).join(', ')}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Ã¢ÂÂÃ¢ÂÂ ÃªÂ³ÂµÃ­ÂÂµ Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
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
