// src/pages/risk/RiskHub.jsx
// ISO 14971 Ã¬ÂÂÃ­ÂÂÃªÂ´ÂÃ«Â¦Â¬ Ã­ÂÂÃ«Â¸Â Ã¢ÂÂ FMEA Ã¬ÂÂÃ­ÂÂ Ã«ÂÂ±Ã«Â¡ÂÃ«Â¶Â ÃÂ· Ã¬ÂÂÃ­ÂÂ Ã«Â§Â¤Ã­ÂÂ¸Ã«Â¦Â­Ã¬ÂÂ¤ ÃÂ· Ã¬Â ÂÃªÂ°Â Ã¬Â¡Â°Ã¬Â¹Â
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
import { useSearchParams } from 'react-router-dom'

// Ã¢ÂÂÃ¢ÂÂ localStorage Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
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

// Ã¢ÂÂÃ¢ÂÂ Ã¬ÂÂ¬ÃªÂ°ÂÃ«ÂÂ / Ã«Â°ÂÃ¬ÂÂÃªÂ°ÂÃ«ÂÂ¥Ã¬ÂÂ± Ã¬Â ÂÃ¬ÂÂ Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
const SEVERITY = [
  { value: 1, label: '1-ÃªÂ²Â½Ã«Â¯Â¸', desc: 'Ã¬ÂÂ¼Ã¬ÂÂÃ¬Â Â Ã«Â¶ÂÃ­ÂÂ¸, Ã¬ÂÂÃ¬ÂÂ° Ã­ÂÂÃ«Â³Âµ' },
  { value: 2, label: '2-Ã¬ÂÂ', desc: 'ÃªÂ°ÂÃ¬ÂÂ­Ã¬Â Â Ã¬ÂÂÃ­ÂÂ´, Ã¬ÂÂÃ«Â£Â ÃªÂ°ÂÃ¬ÂÂ Ã«Â¶ÂÃ­ÂÂÃ¬ÂÂ' },
  { value: 3, label: '3-Ã¬Â¤Â', desc: 'ÃªÂ°ÂÃ¬ÂÂ­Ã¬Â Â Ã¬ÂÂÃ­ÂÂ´, Ã¬ÂÂÃ«Â£Â ÃªÂ°ÂÃ¬ÂÂ Ã­ÂÂÃ¬ÂÂ' },
  { value: 4, label: '4-Ã¬Â¤ÂÃ«ÂÂ', desc: 'Ã«Â¹ÂÃªÂ°ÂÃ¬ÂÂ­Ã¬Â Â Ã¬ÂÂÃ­ÂÂ´ / Ã¬ÂÂÃªÂµÂ¬ Ã¬ÂÂ¥Ã¬ÂÂ ' },
  { value: 5, label: '5-Ã¬Â¹ÂÃ«ÂªÂ', desc: 'Ã¬ÂÂ¬Ã«Â§Â Ã«ÂÂÃ«ÂÂ Ã¬ÂÂÃ«ÂªÂ Ã¬ÂÂÃ­ÂÂ' },
]

const PROBABILITY = [
  { value: 1, label: '1-ÃªÂ±Â°Ã¬ÂÂÃ¬ÂÂÃ¬ÂÂ', desc: '< 1/100,000' },
  { value: 2, label: '2-Ã«ÂÂ®Ã¬ÂÂ', desc: '1/100,000 ~ 1/10,000' },
  { value: 3, label: '3-Ã«Â³Â´Ã­ÂÂµ', desc: '1/10,000 ~ 1/1,000' },
  { value: 4, label: '4-Ã«ÂÂÃ¬ÂÂ', desc: '1/1,000 ~ 1/100' },
  { value: 5, label: '5-Ã«Â§Â¤Ã¬ÂÂ°Ã«ÂÂÃ¬ÂÂ', desc: '> 1/100' },
]

const CONTROL_TYPES = [
  { value: 'inherent', label: 'ÃªÂ³Â Ã¬ÂÂ  Ã¬ÂÂÃ¬Â Â Ã¬ÂÂ¤ÃªÂ³Â' },
  { value: 'protective', label: 'Ã«Â³Â´Ã­ÂÂ¸ Ã¬ÂÂÃ«ÂÂ¨' },
  { value: 'information', label: 'Ã¬ÂÂÃ¬Â Â Ã¬Â ÂÃ«Â³Â´ Ã¬Â ÂÃªÂ³Âµ' },
  { value: 'none', label: 'Ã«Â¯Â¸Ã¬Â¡Â°Ã¬Â¹Â' },
]

const RISK_CATEGORIES = [
  'Ã¬ÂÂÃ«Â¬Â¼Ã­ÂÂÃ¬Â Â', 'Ã¬Â ÂÃªÂ¸Â°Ã¬Â Â', 'Ã¬ÂÂÃ«ÂÂÃ¬Â§Â', 'ÃªÂ¸Â°ÃªÂ³ÂÃ¬Â Â', 'Ã«Â°Â©Ã¬ÂÂ¬Ã¬ÂÂ ', 'Ã¬ÂÂÃ­ÂÂÃ­ÂÂ¸Ã¬ÂÂ¨Ã¬ÂÂ´',
  'Ã¬ÂÂ¬Ã¬ÂÂ© Ã¬ÂÂ¤Ã«Â¥Â', 'Ã«Â³Â´ÃªÂ´ÂÃÂ·Ã¬ÂÂ´Ã«Â°Â', 'Ã¬ÂÂÃ¬Â²Â´Ã¬Â ÂÃ­ÂÂ©Ã¬ÂÂ±', 'ÃªÂ¸Â°Ã­ÂÂ',
]

// RPN(Ã¬ÂÂÃ­ÂÂ Ã¬ÂÂ°Ã¬ÂÂ Ã¬ÂÂÃ¬ÂÂ) ÃªÂ¸Â°Ã¬Â¤Â
function rpnColor(rpn) {
  if (rpn >= 15) return { bg: '#FEE2E2', text: '#991B1B', label: 'Ã­ÂÂÃ¬ÂÂ©Ã«Â¶ÂÃªÂ°Â' }
  if (rpn >= 8)  return { bg: '#FEF3C7', text: '#92400E', label: 'Ã¬Â¡Â°ÃªÂ±Â´Ã«Â¶ÂÃ­ÂÂÃ¬ÂÂ©' }
  return { bg: '#D1FAE5', text: '#065F46', label: 'Ã­ÂÂÃ¬ÂÂ©ÃªÂ°ÂÃ«ÂÂ¥' }
}

function matrixColor(s, p) {
  const rpn = s * p
  if (rpn >= 15 || (s >= 4 && p >= 3) || (s === 5 && p >= 2)) return '#EF4444'
  if (rpn >= 8  || (s >= 3 && p >= 3)) return '#F59E0B'
  return '#10B981'
}

// Ã¢ÂÂÃ¢ÂÂ Ã«Â¹Â Ã­ÂÂ¼ Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
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

// Ã¢ÂÂÃ¢ÂÂ Ã«Â©ÂÃ¬ÂÂ¸ Ã¬Â»Â´Ã­ÂÂ¬Ã«ÂÂÃ­ÂÂ¸ Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
export default function RiskHub({ embedded = false, productKey: scopeProductKey = null, productLabel = '' } = {}) {
  const user = auth.current()
  const [searchParams] = useSearchParams()
  // #284: Ã¬Â ÂÃ­ÂÂÃªÂ³ÂµÃ¬Â Â(ProductsHub)Ã¬ÂÂ Ã¬ÂÂÃ«Â²Â Ã«ÂÂÃ«ÂÂ  Ã«ÂÂÃ«ÂÂ Ã­ÂÂ´Ã«ÂÂ¹ Ã¬Â ÂÃ­ÂÂ(productKey)Ã¬ÂÂ Ã¬ÂÂÃ­ÂÂÃ«Â§Â Ã«ÂÂ¸Ã¬Â¶ÂÃ­ÂÂÃ«ÂÂ¤.
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
    if (!form.title || !form.harm) return alert('Ã¬Â ÂÃ«ÂªÂ©ÃªÂ³Â¼ Ã¬ÂÂÃ­ÂÂ´(Harm)Ã«ÂÂ Ã­ÂÂÃ¬ÂÂÃ¬ÂÂÃ«ÂÂÃ«ÂÂ¤.')
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
    if (!confirm('Ã¬ÂÂ­Ã¬Â ÂÃ­ÂÂÃ¬ÂÂÃªÂ²Â Ã¬ÂÂµÃ«ÂÂÃªÂ¹Â?')) return
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
    { key: 'register', label: 'Ã¬ÂÂÃ­ÂÂ Ã«ÂÂ±Ã«Â¡ÂÃ«Â¶Â', icon: List },
    { key: 'matrix',   label: 'Ã¬ÂÂÃ­ÂÂ Ã«Â§Â¤Ã­ÂÂ¸Ã«Â¦Â­Ã¬ÂÂ¤', icon: Grid },
    { key: 'control',  label: 'Ã¬Â ÂÃªÂ°Â Ã¬Â¡Â°Ã¬Â¹Â Ã­ÂÂÃ­ÂÂ©', icon: TrendingDown },
  ]

  const body = (
    <>
      <div className={embedded ? '' : 'px-6 lg:px-8 py-6 max-w-[1280px] mx-auto'}>

        {/* Ã«Â°Â°Ã«ÂÂ (Ã¬ÂÂÃ«Â²Â Ã«ÂÂ Ã¬ÂÂ Ã¬ÂÂ¨ÃªÂ¹Â Ã¢ÂÂ Ã¬ÂÂÃ¬ÂÂ ProductsHub Ã­ÂÂ¤Ã«ÂÂ Ã¬ÂÂ¬Ã¬ÂÂ©) */}
        {!embedded && (
        <HubBanner
          title="Ã¬ÂÂÃ­ÂÂÃªÂ´ÂÃ«Â¦Â¬"
          subtitle="ISO 14971:2019 ÃÂ· FMEA ÃÂ· Ã¬ÂÂÃ­ÂÂ Ã«Â¶ÂÃ¬ÂÂ ÃÂ· Ã­ÂÂÃ¬ÂÂ©ÃªÂ¸Â°Ã¬Â¤Â Ã­ÂÂÃªÂ°Â"
          icon={ShieldAlert}
          color="#EF4444"
          quickActions={[
            { label: 'Ã¬ÂÂÃ­ÂÂ Ã­ÂÂ­Ã«ÂªÂ© Ã¬Â¶ÂÃªÂ°Â', icon: Plus, onClick: openNew, primary: true },
            { label: 'AI Ã¬Â´ÂÃ¬ÂÂ Ã¬ÂÂÃ¬ÂÂ±', icon: Sparkles, onClick: () => setShowAiModal(true) },
          ]}
          workflow={['Ã¬ÂÂÃ­ÂÂ Ã¬ÂÂÃ«Â³Â', 'Ã¬ÂÂÃ­ÂÂ Ã¬Â¶ÂÃ¬Â Â (SÃÂP)', 'Ã¬ÂÂÃ­ÂÂ Ã­ÂÂÃªÂ°Â', 'Ã¬ÂÂÃ­ÂÂ Ã­ÂÂµÃ¬Â Â', 'Ã¬ÂÂÃ¬ÂÂ¬Ã¬ÂÂÃ­ÂÂ Ã­ÂÂÃªÂ°Â', 'Ã«Â³Â´ÃªÂ³Â Ã¬ÂÂ Ã¬ÂÂÃ¬ÂÂ±']}
        />
        )}

        {/* KPI Ã¬Â¹Â´Ã«ÂÂ */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Ã¬Â´Â Ã¬ÂÂÃ­ÂÂ Ã­ÂÂ­Ã«ÂªÂ©', count: stats.total, color: '#6B7280' },
            { label: 'Ã­ÂÂÃ¬ÂÂ©Ã«Â¶ÂÃªÂ°Â (Ã«Â¹Â¨ÃªÂ°Â)', count: stats.high, color: '#EF4444' },
            { label: 'Ã¬Â¡Â°ÃªÂ±Â´Ã«Â¶ÂÃ­ÂÂÃ¬ÂÂ© (Ã«ÂÂ¸Ã«ÂÂ)', count: stats.med, color: '#F59E0B' },
            { label: 'Ã­ÂÂÃ¬ÂÂ©ÃªÂ°ÂÃ«ÂÂ¥ (Ã¬Â´ÂÃ«Â¡Â)', count: stats.low, color: '#10B981' },
            { label: 'ÃªÂ²ÂÃ¬Â¦Â Ã¬ÂÂÃ«Â£Â', count: stats.verified, color: '#3B82F6' },
          ].map(s => (
            <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="text-[22px] font-bold" style={{ color: s.color }}>{s.count}</div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Ã­ÂÂ­ */}
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

        {/* Ã¢ÂÂÃ¢ÂÂ Ã¬ÂÂÃ­ÂÂ Ã«ÂÂ±Ã«Â¡ÂÃ«Â¶Â Ã­ÂÂ­ Ã¢ÂÂÃ¢ÂÂ */}
        {tab === 'register' && (
          <>
            <div className="flex gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-[200px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                <Search size={14} style={{ color: 'var(--ink-faint)' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Ã¬ÂÂÃ­ÂÂID ÃÂ· Ã¬Â ÂÃ«ÂªÂ© ÃÂ· Ã¬ÂÂÃ­ÂÂ´ ÃªÂ²ÂÃ¬ÂÂ..."
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
                <option value="all">Ã¬Â ÂÃ¬Â²Â´ Ã¬ÂÂ Ã­ÂÂ</option>
                {RISK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button
                onClick={() => setShowAiModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold"
                style={{ background: 'var(--bg-card)', color: '#7C3AED', border: '1px solid #7C3AED40', cursor: 'pointer' }}
              >
                <Sparkles size={14} /> AI Ã¬Â´ÂÃ¬ÂÂ Ã¬ÂÂÃ¬ÂÂ±
              </button>
              <button
                onClick={openNew}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold"
                style={{ background: '#EF4444', color: 'white', border: 'none', cursor: 'pointer' }}
              >
                <Plus size={14} /> Ã¬ÂÂÃ­ÂÂ Ã­ÂÂ­Ã«ÂªÂ© Ã¬Â¶ÂÃªÂ°Â
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

        {/* Ã¢ÂÂÃ¢ÂÂ Ã¬ÂÂÃ­ÂÂ Ã«Â§Â¤Ã­ÂÂ¸Ã«Â¦Â­Ã¬ÂÂ¤ Ã­ÂÂ­ Ã¢ÂÂÃ¢ÂÂ */}
        {tab === 'matrix' && <RiskMatrix risks={scopedRisks} />}

        {/* Ã¢ÂÂÃ¢ÂÂ Ã¬Â ÂÃªÂ°Â Ã¬Â¡Â°Ã¬Â¹Â Ã­ÂÂÃ­ÂÂ© Ã­ÂÂ­ Ã¢ÂÂÃ¢ÂÂ */}
        {tab === 'control' && <ControlStatus risks={scopedRisks} onEdit={openEdit} />}
      </div>

      {/* Ã¬ÂÂÃ­ÂÂ Ã¬Â¶ÂÃªÂ°Â/Ã¬ÂÂÃ¬Â Â Ã«ÂªÂ¨Ã«ÂÂ¬ */}
      {showForm && (
        <RiskForm
          form={form}
          fld={fld}
          editId={editId}
          onSubmit={submit}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* AI Ã¬Â´ÂÃ¬ÂÂ Ã¬ÂÂÃ¬ÂÂ± Ã«ÂªÂ¨Ã«ÂÂ¬ */}
      {showAiModal && (
        <AiDraftModal onClose={() => setShowAiModal(false)} onUse={openFromAi} />
      )}
    </>
  )

  if (embedded) return body

  return (
    <AppLayout user={user} title="Ã¬ÂÂÃ­ÂÂÃªÂ´ÂÃ«Â¦Â¬" subtitle="ISO 14971 Ã¬ÂÂÃ­ÂÂÃ«Â¶ÂÃ¬ÂÂ ÃÂ· FMEA ÃÂ· Ã¬ÂÂÃ­ÂÂ Ã«ÂÂ±Ã«Â¡ÂÃ«Â¶Â">
      {body}
    </AppLayout>
  )
}

// Ã¢ÂÂÃ¢ÂÂ Ã¬ÂÂÃ­ÂÂ Ã­ÂÂ Ã¬Â»Â´Ã­ÂÂ¬Ã«ÂÂÃ­ÂÂ¸ Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
function RiskRow({ risk, expanded, onToggle, onEdit, onDelete, onVerify }) {
  const rpn = risk.severity * risk.probability
  const residualRpn = risk.residualSeverity * risk.residualProbability
  const { bg, text, label } = rpnColor(rpn)

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
      {/* Ã­ÂÂ¤Ã«ÂÂ Ã­ÂÂ */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={onToggle}
        style={{ borderBottom: expanded ? '1px solid var(--line)' : 'none' }}
      >
        {/* RPN Ã«Â°Â°Ã¬Â§Â */}
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
                Ã¢ÂÂ ÃªÂ²ÂÃ¬Â¦ÂÃ¬ÂÂÃ«Â£Â
              </span>
            )}
          </div>
          <div className="text-[13.5px] font-semibold mt-0.5 truncate" style={{ color: 'var(--ink)' }}>
            {risk.title || '(Ã¬Â ÂÃ«ÂªÂ© Ã¬ÂÂÃ¬ÂÂ)'}
          </div>
          <div className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--ink-faint)' }}>
            Ã¬ÂÂÃ­ÂÂ´: {risk.harm || '-'} &nbsp;|&nbsp; Ã¬ÂÂ¬ÃªÂ°ÂÃ«ÂÂ {risk.severity} ÃÂ Ã«Â°ÂÃ¬ÂÂÃªÂ°ÂÃ«ÂÂ¥Ã¬ÂÂ± {risk.probability}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={e => { e.stopPropagation(); onVerify() }}
            title={risk.verified ? 'ÃªÂ²ÂÃ¬Â¦Â Ã¬Â·Â¨Ã¬ÂÂ' : 'ÃªÂ²ÂÃ¬Â¦Â Ã¬ÂÂÃ«Â£Â Ã¬Â²ÂÃ«Â¦Â¬'}
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

      {/* Ã­ÂÂÃ¬ÂÂ¥ Ã¬ÂÂÃ¬ÂÂ¸ */}
      {expanded && (
        <div className="px-4 py-4 grid gap-4 md:grid-cols-2">
          <div>
            <Label>Ã¬ÂÂÃ­ÂÂÃ¬ÂÂÃ¬ÂÂ¸ (Hazard)</Label>
            <Value>{risk.hazard || '-'}</Value>
            <Label>Ã¬ÂÂÃ­ÂÂ Ã¬ÂÂÃ­ÂÂ© (Hazardous Situation)</Label>
            <Value>{risk.hazardousSituation || '-'}</Value>
            <Label>Ã¬ÂÂÃ­ÂÂ´ (Harm)</Label>
            <Value>{risk.harm || '-'}</Value>
          </div>
          <div>
            <Label>Ã¬Â´ÂÃªÂ¸Â° Ã¬ÂÂÃ­ÂÂ Ã­ÂÂÃªÂ°Â</Label>
            <div className="flex gap-3 mb-3">
              <ScoreBox label="Ã¬ÂÂ¬ÃªÂ°ÂÃ«ÂÂ" val={risk.severity} />
              <span className="self-center text-[18px] font-bold" style={{ color: 'var(--ink-faint)' }}>ÃÂ</span>
              <ScoreBox label="Ã«Â°ÂÃ¬ÂÂÃªÂ°ÂÃ«ÂÂ¥Ã¬ÂÂ±" val={risk.probability} />
              <span className="self-center text-[18px] font-bold" style={{ color: 'var(--ink-faint)' }}>=</span>
              <ScoreBox label="RPN" val={rpn} color={text} bg={bg} />
            </div>
            <Label>Ã¬ÂÂÃ­ÂÂ Ã­ÂÂµÃ¬Â Â Ã¬Â¡Â°Ã¬Â¹Â</Label>
            <Value>{risk.controlMeasure || '-'} ({CONTROL_TYPES.find(c => c.value === risk.controlType)?.label || '-'})</Value>
            <Label>Ã¬ÂÂÃ¬ÂÂ¬ Ã¬ÂÂÃ­ÂÂ (Ã¬Â ÂÃªÂ°Â Ã­ÂÂ)</Label>
            <div className="flex gap-3">
              <ScoreBox label="Ã¬ÂÂÃ¬ÂÂ¬ Ã¬ÂÂ¬ÃªÂ°ÂÃ«ÂÂ" val={risk.residualSeverity} />
              <span className="self-center text-[18px] font-bold" style={{ color: 'var(--ink-faint)' }}>ÃÂ</span>
              <ScoreBox label="Ã¬ÂÂÃ¬ÂÂ¬ Ã«Â°ÂÃ¬ÂÂÃªÂ°ÂÃ«ÂÂ¥Ã¬ÂÂ±" val={risk.residualProbability} />
              <span className="self-center text-[18px] font-bold" style={{ color: 'var(--ink-faint)' }}>=</span>
              <ScoreBox label="Ã¬ÂÂÃ¬ÂÂ¬ RPN" val={residualRpn} color={rpnColor(residualRpn).text} bg={rpnColor(residualRpn).bg} />
            </div>
          </div>
          {risk.notes && (
            <div className="md:col-span-2">
              <Label>Ã«Â¹ÂÃªÂ³Â </Label>
              <Value>{risk.notes}</Value>
            </div>
          )}
          <div className="md:col-span-2 text-[11px]" style={{ color: 'var(--ink-faint)' }}>
            Ã«ÂÂ±Ã«Â¡Â: {risk.createdBy} ÃÂ· {risk.createdAt?.slice(0, 10) || '-'}
            {risk.verified && ` ÃÂ· ÃªÂ²ÂÃ¬Â¦Â: ${risk.verifiedAt}`}
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

// Ã¢ÂÂÃ¢ÂÂ Ã¬ÂÂÃ­ÂÂ Ã«Â§Â¤Ã­ÂÂ¸Ã«Â¦Â­Ã¬ÂÂ¤ Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
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
          { color: '#EF4444', bg: '#FEE2E2', label: 'Ã­ÂÂÃ¬ÂÂ©Ã«Â¶ÂÃªÂ°Â (RPNÃ¢ÂÂ¥15)' },
          { color: '#F59E0B', bg: '#FEF3C7', label: 'Ã¬Â¡Â°ÃªÂ±Â´Ã«Â¶Â Ã­ÂÂÃ¬ÂÂ© (RPN 8~14)' },
          { color: '#10B981', bg: '#D1FAE5', label: 'Ã­ÂÂÃ¬ÂÂ©ÃªÂ°ÂÃ«ÂÂ¥ (RPN<8)' },
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
                Ã«Â°ÂÃ¬ÂÂÃªÂ°ÂÃ«ÂÂ¥Ã¬ÂÂ± {p}
              </div>
            ))}
          </div>

          {[5,4,3,2,1].map(s => (
            <div key={s} className="flex items-center mb-1.5">
              <div className="text-[11px] font-semibold text-right pr-2 flex-shrink-0" style={{ width: 88, color: 'var(--ink-faint)' }}>
                Ã¬ÂÂ¬ÃªÂ°ÂÃ«ÂÂ {s}
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
                    title={`Ã¬ÂÂ¬ÃªÂ°ÂÃ«ÂÂ ${s} ÃÂ Ã«Â°ÂÃ¬ÂÂÃªÂ°ÂÃ«ÂÂ¥Ã¬ÂÂ± ${p} = RPN ${rpn}\nÃ¬ÂÂÃ­ÂÂ ${items.length}ÃªÂ±Â´`}
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
            Ã¬ÂÂ«Ã¬ÂÂ = RPN ÃÂ· Ã¬ÂÂ = Ã«ÂÂ±Ã«Â¡ÂÃ«ÂÂ Ã¬ÂÂÃ­ÂÂ ÃªÂ±Â´Ã¬ÂÂ
          </div>
        </div>
      </div>

      {risks.filter(r => r.severity * r.probability >= 15).length > 0 && (
        <div className="mt-6">
          <div className="text-[13px] font-bold mb-3 flex items-center gap-2" style={{ color: '#EF4444' }}>
            <AlertTriangle size={15} /> Ã­ÂÂÃ¬ÂÂ©Ã«Â¶ÂÃªÂ°Â Ã¬ÂÂÃ­ÂÂ Ã­ÂÂ­Ã«ÂªÂ© (Ã¬Â¦ÂÃ¬ÂÂ Ã¬Â¡Â°Ã¬Â¹Â Ã­ÂÂÃ¬ÂÂ)
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
                    <div className="text-[11px]" style={{ color: '#991B1B' }}>Ã¬ÂÂÃ­ÂÂ´: {r.harm}</div>
                  </div>
                  {r.verified && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: '#DBEAFE', color: '#1D4ED8' }}>ÃªÂ²ÂÃ¬Â¦ÂÃ¬ÂÂÃ«Â£Â</span>
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

// Ã¢ÂÂÃ¢ÂÂ Ã¬Â ÂÃªÂ°Â Ã¬Â¡Â°Ã¬Â¹Â Ã­ÂÂÃ­ÂÂ© Ã­ÂÂ­ Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
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
          <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>Ã¬ÂÂÃ­ÂÂ Ã¬Â ÂÃªÂ°Â Ã¬ÂÂ±ÃªÂ³ÂµÃ«Â¥Â </div>
        </div>
        <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[28px] font-bold" style={{ color: '#3B82F6' }}>{avgReduction}</div>
          <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>Ã­ÂÂÃªÂ·Â  RPN ÃªÂ°ÂÃ¬ÂÂ</div>
        </div>
        <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[28px] font-bold" style={{ color: '#8B5CF6' }}>{risks.filter(r => r.verified).length}</div>
          <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>ÃªÂ²ÂÃ¬Â¦Â Ã¬ÂÂÃ«Â£Â Ã­ÂÂ­Ã«ÂªÂ©</div>
        </div>
      </div>

      {byType.map(ct => ct.items.length > 0 && (
        <div key={ct.value} className="mb-5">
          <div className="text-[13px] font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--ink)' }}>
            <TrendingDown size={14} style={{ color: '#10B981' }} />
            {ct.label} ({ct.items.length}ÃªÂ±Â´)
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
                      {r.controlMeasure || '(Ã¬Â ÂÃªÂ°Â Ã¬Â¡Â°Ã¬Â¹Â Ã«Â¯Â¸Ã¬ÂÂÃ«Â Â¥)'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-center">
                      <div className="text-[14px] font-bold" style={{ color: rpnColor(before).text }}>{before}</div>
                      <div className="text-[9px]" style={{ color: 'var(--ink-faint)' }}>Ã¬Â´ÂÃªÂ¸Â°</div>
                    </div>
                    <div className="text-[12px]" style={{ color: reduced > 0 ? '#10B981' : '#EF4444' }}>
                      {reduced > 0 ? `Ã¢ÂÂ¼${reduced}` : reduced === 0 ? 'Ã¢ÂÂ' : `Ã¢ÂÂ²${Math.abs(reduced)}`}
                    </div>
                    <div className="text-center">
                      <div className="text-[14px] font-bold" style={{ color: rpnColor(after).text }}>{after}</div>
                      <div className="text-[9px]" style={{ color: 'var(--ink-faint)' }}>Ã¬ÂÂÃ¬ÂÂ¬</div>
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
          <div>Ã¬ÂÂÃ­ÂÂ Ã«ÂÂ±Ã«Â¡ÂÃ«Â¶ÂÃ¬ÂÂ Ã­ÂÂ­Ã«ÂªÂ©Ã¬ÂÂ Ã¬Â¶ÂÃªÂ°ÂÃ­ÂÂÃ«Â©Â´ Ã¬Â ÂÃªÂ°Â Ã¬Â¡Â°Ã¬Â¹Â Ã­ÂÂÃ­ÂÂ©Ã¬ÂÂ´ Ã­ÂÂÃ¬ÂÂÃ«ÂÂ©Ã«ÂÂÃ«ÂÂ¤</div>
        </div>
      )}
    </div>
  )
}

// Ã¢ÂÂÃ¢ÂÂ AI Ã¬Â´ÂÃ¬ÂÂ Ã¬ÂÂÃ¬ÂÂ± Ã«ÂªÂ¨Ã«ÂÂ¬ Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
function AiDraftModal({ onClose, onUse }) {
  const [productName, setProductName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [items, setItems] = useState(null)

  const generate = async () => {
    if (!productName.trim() && !description.trim()) {
      setError('Ã¬Â ÂÃ­ÂÂÃ«ÂªÂ Ã«ÂÂÃ«ÂÂ Ã¬Â ÂÃ­ÂÂ/ÃªÂ¸Â°Ã«ÂÂ¥ Ã¬ÂÂ¤Ã«ÂªÂÃ¬ÂÂ Ã¬ÂÂÃ«Â Â¥Ã­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ.')
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
        setError(j.message || 'AI Ã¬Â´ÂÃ¬ÂÂ Ã¬ÂÂÃ¬ÂÂ±Ã¬ÂÂ Ã¬ÂÂ¤Ã­ÂÂ¨Ã­ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤.')
      } else {
        setItems(j.items)
      }
    } catch (e) {
      setError('AI Ã¬Â´ÂÃ¬ÂÂ Ã¬ÂÂÃ¬ÂÂ± Ã¬Â¤Â Ã¬ÂÂ¤Ã«Â¥ÂÃªÂ°Â Ã«Â°ÂÃ¬ÂÂÃ­ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤: ' + String((e && e.message) || e))
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
            <Sparkles size={18} style={{ color: '#7C3AED' }} /> Ã¬ÂÂÃ­ÂÂ Ã­ÂÂ­Ã«ÂªÂ© AI Ã¬Â´ÂÃ¬ÂÂ Ã¬ÂÂÃ¬ÂÂ±
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)' }}>
            <X size={20} />
          </button>
        </div>
        <div className="text-[12px] mb-5" style={{ color: 'var(--ink-faint)' }}>
          Ã¬Â ÂÃ­ÂÂ/ÃªÂ¸Â°Ã«ÂÂ¥Ã¬ÂÂ Ã¬ÂÂ¤Ã«ÂªÂÃ­ÂÂÃ«Â©Â´ ISO 14971 ÃªÂ´ÂÃ¬Â ÂÃ¬ÂÂ Ã¬ÂÂÃ­ÂÂ Ã­ÂÂ­Ã«ÂªÂ© Ã¬Â´ÂÃ¬ÂÂÃ¬ÂÂ Ã¬ÂÂ¬Ã«ÂÂ¬ ÃªÂ±Â´ Ã¬Â ÂÃ¬ÂÂÃ­ÂÂ©Ã«ÂÂÃ«ÂÂ¤. Ã«Â°ÂÃ«ÂÂÃ¬ÂÂ Ã«ÂÂ´Ã¬ÂÂ©Ã¬ÂÂ ÃªÂ²ÂÃ­ÂÂ ÃÂ·Ã¬ÂÂÃ¬Â ÂÃ­ÂÂ Ã«ÂÂ¤ Ã«ÂÂ±Ã«Â¡ÂÃ­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ Ã¢ÂÂ AI Ã¬Â´ÂÃ¬ÂÂÃ¬ÂÂ Ã¬Â°Â¸ÃªÂ³Â Ã¬ÂÂ©Ã¬ÂÂ´Ã«Â©Â° Ã¬ÂµÂÃ¬Â¢Â Ã­ÂÂÃ«ÂÂ¨Ã¬ÂÂ Ã¬ÂÂ¬Ã¬ÂÂ©Ã¬ÂÂ Ã¬Â±ÂÃ¬ÂÂÃ¬ÂÂÃ«ÂÂÃ«ÂÂ¤.
        </div>

        <div className="space-y-3">
          <Field label="Ã¬Â ÂÃ­ÂÂÃ«ÂªÂ">
            <input value={productName} onChange={e => setProductName(e.target.value)} placeholder="Ã¬ÂÂ: Ã­ÂÂ´Ã«ÂÂÃ¬ÂÂ© Ã­ÂÂÃ«ÂÂ¹Ã¬Â¸Â¡Ã¬Â ÂÃªÂ¸Â°" className="w-full" style={inputStyle} />
          </Field>
          <Field label="Ã¬Â ÂÃ­ÂÂ/ÃªÂ¸Â°Ã«ÂÂ¥ Ã¬ÂÂ¤Ã«ÂªÂ">
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Ã¬ÂÂ: Ã­ÂÂÃ¬ÂÂÃªÂ°Â Ã¬Â§ÂÃ¬Â Â Ã¬Â±ÂÃ­ÂÂ Ã­ÂÂ Ã¬ÂÂ¤Ã­ÂÂ¸Ã«Â¦Â½Ã¬ÂÂ Ã¬ÂÂ½Ã¬ÂÂÃ­ÂÂ´ Ã­ÂÂÃ«ÂÂ¹ Ã¬ÂÂÃ¬Â¹ÂÃ«Â¥Â¼ Ã¬Â¸Â¡Ã¬Â ÂÃ­ÂÂÃ«ÂÂ Ã­ÂÂ´Ã«ÂÂÃ¬ÂÂ© Ã¬Â ÂÃ¬ÂÂÃªÂ¸Â°ÃªÂ¸Â°. Ã«Â¸ÂÃ«Â£Â¨Ã­ÂÂ¬Ã¬ÂÂ¤Ã«Â¡Â Ã¬ÂÂ±Ã¬ÂÂ ÃªÂ²Â°ÃªÂ³Â¼ Ã¬Â ÂÃ¬ÂÂ¡."
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
            {loading ? 'Ã¬ÂÂÃ¬ÂÂ± Ã¬Â¤Â...' : 'Ã¬Â´ÂÃ¬ÂÂ Ã¬ÂÂÃ¬ÂÂ±'}
          </button>
        </div>

        {items && items.length > 0 && (
          <div className="mt-5 space-y-2.5">
            <div className="text-[11px] font-mono tracking-wider" style={{ color: 'var(--ink-faint)' }}>
              Ã¬Â ÂÃ¬ÂÂÃ«ÂÂ Ã¬ÂÂÃ­ÂÂ Ã­ÂÂ­Ã«ÂªÂ© {items.length}ÃªÂ±Â´ Ã¢ÂÂ Ã­ÂÂÃ«ÂÂÃ«Â¥Â¼ Ã¬ÂÂ Ã­ÂÂÃ­ÂÂÃ«Â©Â´ Ã«ÂÂ±Ã«Â¡Â Ã­ÂÂ¼Ã¬ÂÂ Ã¬Â±ÂÃ¬ÂÂÃ¬Â§ÂÃ«ÂÂÃ«ÂÂ¤
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
                    <div className="text-[11.5px] mt-1" style={{ color: 'var(--ink-faint)' }}>Ã¬Â ÂÃªÂ°Â Ã¬Â¡Â°Ã¬Â¹Â(Ã¬ÂÂ): {it.controlMeasure}</div>
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

// Ã¢ÂÂÃ¢ÂÂ Ã¬ÂÂÃ­ÂÂ Ã¬Â¶ÂÃªÂ°Â/Ã¬ÂÂÃ¬Â Â Ã­ÂÂ¼ Ã«ÂªÂ¨Ã«ÂÂ¬ Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
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
            {editId ? 'Ã¬ÂÂÃ­ÂÂ Ã­ÂÂ­Ã«ÂªÂ© Ã¬ÂÂÃ¬Â Â' : 'Ã¬ÂÂÃ­ÂÂ Ã­ÂÂ­Ã«ÂªÂ© Ã¬Â¶ÂÃªÂ°Â'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)' }}>
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <Row2>
            <Field label="Ã¬Â ÂÃ«ÂªÂ© *">
              <input value={form.title} onChange={e => fld('title', e.target.value)} placeholder="Ã¬ÂÂÃ­ÂÂ Ã­ÂÂ­Ã«ÂªÂ© Ã¬Â ÂÃ«ÂªÂ©..." className="w-full" style={inputStyle} />
            </Field>
            <Field label="Ã¬ÂÂÃ­ÂÂ Ã¬ÂÂ Ã­ÂÂ">
              <select value={form.category} onChange={e => fld('category', e.target.value)} className="w-full" style={inputStyle}>
                <option value="">Ã¬ÂÂ Ã­ÂÂ...</option>
                {RISK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </Row2>

          <Field label="Ã¬ÂÂÃ­ÂÂÃ¬ÂÂÃ¬ÂÂ¸ (Hazard) Ã¢ÂÂ Ã¬ÂÂÃ­ÂÂ´Ã«Â¥Â¼ Ã¬ÂÂ Ã«Â°ÂÃ­ÂÂ  Ã¬ÂÂ Ã¬ÂÂÃ«ÂÂ Ã¬ÂÂ Ã¬ÂÂ¬Ã¬Â Â Ã¬ÂÂÃ¬ÂÂ¸">
            <input value={form.hazard} onChange={e => fld('hazard', e.target.value)} placeholder="Ã¬ÂÂ: ÃªÂ³Â Ã¬Â ÂÃ¬ÂÂ Ã«ÂÂ¸Ã¬Â¶Â, Ã¬ÂÂÃ­ÂÂÃ­ÂÂ¸Ã¬ÂÂ¨Ã¬ÂÂ´ Ã¬ÂÂ¤Ã«Â¥Â..." className="w-full" style={inputStyle} />
          </Field>
          <Field label="Ã¬ÂÂÃ­ÂÂ Ã¬ÂÂÃ­ÂÂ© (Hazardous Situation) Ã¢ÂÂ Ã¬ÂÂÃ­ÂÂÃ¬ÂÂÃ¬ÂÂ¸Ã¬ÂÂ´ Ã«Â°ÂÃ¬ÂÂÃ­ÂÂÃ«ÂÂ Ã¬ÂÂÃ­ÂÂ©">
            <input value={form.hazardousSituation} onChange={e => fld('hazardousSituation', e.target.value)} placeholder="Ã¬ÂÂ: Ã¬ÂÂ¬Ã¬ÂÂ©Ã¬ÂÂÃªÂ°Â ÃªÂ¸Â°ÃªÂ¸Â° Ã¬Â²Â­Ã¬ÂÂ Ã¬Â¤Â Ã¬Â ÂÃ¬ÂÂ Ã«Â¯Â¸Ã¬Â°Â¨Ã«ÂÂ¨..." className="w-full" style={inputStyle} />
          </Field>
          <Field label="Ã¬ÂÂÃ­ÂÂ´ (Harm) * Ã¢ÂÂ Ã¬ÂÂ¤Ã¬Â ÂÃ«Â¡Â Ã«Â°ÂÃ¬ÂÂÃ­ÂÂÃ«ÂÂ Ã­ÂÂ¼Ã­ÂÂ´">
            <input value={form.harm} onChange={e => fld('harm', e.target.value)} placeholder="Ã¬ÂÂ: Ã¬Â ÂÃªÂ¸Â° Ã¬ÂÂ¼Ã­ÂÂ¬, Ã«ÂÂ°Ã¬ÂÂ´Ã­ÂÂ° Ã¬ÂÂ¤Ã«Â¥ÂÃ«Â¡Â Ã¬ÂÂ¸Ã­ÂÂ Ã¬ÂÂ¤Ã¬Â§Â..." className="w-full" style={inputStyle} />
          </Field>

          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-soft)' }}>
            <div className="text-[12px] font-bold mb-3" style={{ color: 'var(--ink-soft)' }}>Ã¬Â´ÂÃªÂ¸Â° Ã¬ÂÂÃ­ÂÂ Ã­ÂÂÃªÂ°Â</div>
            <Row2>
              <Field label={`Ã¬ÂÂ¬ÃªÂ°ÂÃ«ÂÂ (Severity): ${form.severity}`}>
                <select value={form.severity} onChange={e => fld('severity', +e.target.value)} className="w-full" style={inputStyle}>
                  {SEVERITY.map(s => <option key={s.value} value={s.value}>{s.label} Ã¢ÂÂ {s.desc}</option>)}
                </select>
              </Field>
              <Field label={`Ã«Â°ÂÃ¬ÂÂÃªÂ°ÂÃ«ÂÂ¥Ã¬ÂÂ± (Probability): ${form.probability}`}>
                <select value={form.probability} onChange={e => fld('probability', +e.target.value)} className="w-full" style={inputStyle}>
                  {PROBABILITY.map(p => <option key={p.value} value={p.value}>{p.label} Ã¢ÂÂ {p.desc}</option>)}
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
            <Field label="Ã­ÂÂµÃ¬Â Â Ã«Â°Â©Ã«Â²Â">
              <select value={form.controlType} onChange={e => fld('controlType', e.target.value)} className="w-full" style={inputStyle}>
                {CONTROL_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
            <div />
          </Row2>
          <Field label="Ã¬ÂÂÃ­ÂÂ Ã­ÂÂµÃ¬Â Â Ã¬Â¡Â°Ã¬Â¹Â Ã«ÂÂ´Ã¬ÂÂ©">
            <textarea value={form.controlMeasure} onChange={e => fld('controlMeasure', e.target.value)} rows={2} placeholder="ÃªÂµÂ¬Ã¬Â²Â´Ã¬Â ÂÃ¬ÂÂ¸ Ã¬Â ÂÃªÂ°Â Ã¬Â¡Â°Ã¬Â¹Â Ã«ÂÂ´Ã¬ÂÂ©..." className="w-full" style={{ ...inputStyle, resize: 'vertical' }} />
          </Field>

          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-soft)' }}>
            <div className="text-[12px] font-bold mb-3" style={{ color: 'var(--ink-soft)' }}>Ã¬ÂÂÃ¬ÂÂ¬ Ã¬ÂÂÃ­ÂÂ Ã­ÂÂÃªÂ°Â (Ã¬Â ÂÃªÂ°Â Ã¬Â¡Â°Ã¬Â¹Â Ã­ÂÂ)</div>
            <Row2>
              <Field label={`Ã¬ÂÂÃ¬ÂÂ¬ Ã¬ÂÂ¬ÃªÂ°ÂÃ«ÂÂ: ${form.residualSeverity}`}>
                <select value={form.residualSeverity} onChange={e => fld('residualSeverity', +e.target.value)} className="w-full" style={inputStyle}>
                  {SEVERITY.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </Field>
              <Field label={`Ã¬ÂÂÃ¬ÂÂ¬ Ã«Â°ÂÃ¬ÂÂÃªÂ°ÂÃ«ÂÂ¥Ã¬ÂÂ±: ${form.residualProbability}`}>
                <select value={form.residualProbability} onChange={e => fld('residualProbability', +e.target.value)} className="w-full" style={inputStyle}>
                  {PROBABILITY.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </Field>
            </Row2>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>Ã¬ÂÂÃ¬ÂÂ¬ RPN =</span>
              <span className="text-[18px] font-bold px-3 py-1 rounded-lg" style={{ background: rpnColor(resRpn).bg, color: rpnColor(resRpn).text }}>
                {resRpn} ({rpnColor(resRpn).label})
              </span>
            </div>
          </div>

          <Field label="Ã«Â¹ÂÃªÂ³Â ">
            <textarea value={form.notes} onChange={e => fld('notes', e.target.value)} rows={2} placeholder="Ã¬Â¶ÂÃªÂ°Â Ã«Â©ÂÃ«ÂªÂ¨..." className="w-full" style={{ ...inputStyle, resize: 'vertical' }} />
          </Field>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
            Ã¬Â·Â¨Ã¬ÂÂ
          </button>
          <button onClick={onSubmit} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: '#EF4444', color: 'white', border: 'none', cursor: 'pointer' }}>
            {editId ? 'Ã¬ÂÂÃ¬Â Â Ã¬Â ÂÃ¬ÂÂ¥' : 'Ã¬ÂÂÃ­ÂÂ Ã­ÂÂ­Ã«ÂªÂ© Ã«ÂÂ±Ã«Â¡Â'}
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

// Ã¢ÂÂÃ¢ÂÂ Empty State Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <ShieldAlert size={48} strokeWidth={1} className="mb-3" style={{ color: '#EF4444', opacity: 0.5 }} />
      <div className="text-[16px] font-bold mb-1" style={{ color: 'var(--ink-soft)' }}>Ã¬ÂÂÃ­ÂÂ Ã­ÂÂ­Ã«ÂªÂ© Ã¬ÂÂÃ¬ÂÂ</div>
      <div className="text-[13px] mb-5" style={{ color: 'var(--ink-faint)' }}>
        ISO 14971Ã¬ÂÂ Ã«ÂÂ°Ã«ÂÂ¼ Ã¬Â ÂÃ­ÂÂÃ¬ÂÂ Ã¬ÂÂÃ­ÂÂÃ¬ÂÂÃ¬ÂÂ¸Ã¬ÂÂ Ã¬ÂÂÃ«Â³ÂÃ­ÂÂÃªÂ³Â  Ã«ÂÂ±Ã«Â¡ÂÃ­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ
      </div>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold"
        style={{ background: '#EF4444', color: 'white', border: 'none', cursor: 'pointer' }}
      >
        <Plus size={15} /> Ã¬Â²Â« Ã«Â²ÂÃ¬Â§Â¸ Ã¬ÂÂÃ­ÂÂ Ã­ÂÂ­Ã«ÂªÂ© Ã¬Â¶ÂÃªÂ°Â
      </button>
      <div className="mt-6 p-4 rounded-xl max-w-md" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
        <div className="text-[12px] font-semibold mb-1" style={{ color: '#92400E' }}>Ã°ÂÂÂ¡ Ã¬ÂÂÃ­ÂÂ Ã­ÂÂ­Ã«ÂªÂ© Ã¬ÂÂÃ¬ÂÂ</div>
        <div className="text-[12px] text-left space-y-1" style={{ color: '#78350F', lineHeight: 1.6 }}>
          <div>Ã¢ÂÂ¢ Ã¬Â ÂÃªÂ¸Â° Ã¬Â¶Â©ÃªÂ²Â© (Ã¬ÂÂ¬ÃªÂ°ÂÃ«ÂÂ 5 ÃÂ Ã«Â°ÂÃ¬ÂÂÃªÂ°ÂÃ«ÂÂ¥Ã¬ÂÂ± 2 = RPN 10)</div>
          <div>Ã¢ÂÂ¢ Ã¬ÂÂÃ­ÂÂÃ­ÂÂ¸Ã¬ÂÂ¨Ã¬ÂÂ´ Ã¬ÂÂ¤Ã«Â¥ÂÃ«Â¡Â Ã¬ÂÂ¸Ã­ÂÂ Ã¬ÂÂ¤Ã¬Â§Â (Ã¬ÂÂ¬ÃªÂ°ÂÃ«ÂÂ 4 ÃÂ Ã«Â°ÂÃ¬ÂÂÃªÂ°ÂÃ«ÂÂ¥Ã¬ÂÂ± 3)</div>
          <div>Ã¢ÂÂ¢ Ã«Â¶ÂÃ­ÂÂ Ã¬ÂÂ´Ã«Â¬Â¼Ã¬Â§Â Ã¬ÂÂÃ«Â¥Â (Ã¬ÂÂ¬ÃªÂ°ÂÃ«ÂÂ 3 ÃÂ Ã«Â°ÂÃ¬ÂÂÃªÂ°ÂÃ«ÂÂ¥Ã¬ÂÂ± 2)</div>
        </div>
      </div>
    </div>
  )
}
