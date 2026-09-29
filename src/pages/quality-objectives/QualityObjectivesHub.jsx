// src/pages/quality-objectives/QualityObjectivesHub.jsx
// ISO 13485 ÃÂ§5.4.1 Ã­ÂÂÃ¬Â§Â Ã«ÂªÂ©Ã­ÂÂ / ÃÂ§5.4.2 QMS ÃªÂ¸Â°Ã­ÂÂ
import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Save, Edit2, Trash2, Target, TrendingUp,
  TrendingDown, Minus, AlertTriangle, CheckCircle2,
  BarChart2, Calendar, Link2, ChevronDown, ChevronUp,
  RefreshCw, Award, ExternalLink,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'
import { supabase } from '../../lib/supabaseClient'
import { LS_KEY, OBJ_STATUSES, calcRate, autoStatus, LINKED_KPI_OPTIONS, computeLinkedActual } from '../../lib/qualityObjectivesState'
import { buildSnapshot } from '../../lib/managementReviewState'
let _sbCidQo = null

// Ã¢ÂÂÃ¢ÂÂ Ã¬ÂÂÃ¬ÂÂ Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
const LS_KEY_POLICY = 'qualytree.quality_policy'

const PERIODS = ['Ã¬ÂÂÃªÂ°Â', 'Ã«Â¶ÂÃªÂ¸Â°', 'Ã«Â°ÂÃªÂ¸Â°', 'Ã¬ÂÂ°ÃªÂ°Â']
const YEARS = ['2023', '2024', '2025', '2026', '2027']

const DEPT_LIST = [
  'Ã¬Â ÂÃ¬ÂÂ¬', 'Ã­ÂÂÃ¬Â§ÂÃ«Â¶Â(QUA)', 'Ã¬ÂÂÃ¬ÂÂ°Ã«Â¶Â(MFG)', 'Ã¬ÂÂÃ¬ÂÂÃ«Â¶Â(SAL)',
  'ÃªÂµÂ¬Ã«Â§Â¤Ã«Â¶Â(PUR)', 'Ã¬ÂÂ¤Ã«Â¹ÂÃ«Â¶Â(EQP)', 'ÃªÂ°ÂÃ«Â°ÂÃ«Â¶Â(DEV)', 'ÃªÂ²Â½Ã¬ÂÂÃªÂ²ÂÃ­ÂÂ (MR)',
  'ÃªÂµÂÃ¬ÂÂ¡Ã­ÂÂÃ«Â Â¨(TRN)', 'Ã¬ÂÂ¸Ã­ÂÂÃªÂ°Â(RA)', 'Ã«ÂÂ´Ã«Â¶ÂÃªÂ°ÂÃ¬ÂÂ¬(AUD)',
]

const KPI_UNIT_PRESETS = [
  '%', 'ppm', 'ÃªÂ±Â´', 'Ã¬ÂÂ¼', 'Ã¬ÂÂÃªÂ°Â', 'Ã¬Â Â', 'ÃªÂ°Â', 'Ã«ÂªÂ', 'Ã­ÂÂ', 'ÃªÂ¸Â°Ã­ÂÂ',
]

const CATEGORIES = [
  'Ã¬Â ÂÃ­ÂÂ Ã­ÂÂÃ¬Â§Â', 'ÃªÂ³Â ÃªÂ°Â Ã«Â§ÂÃ¬Â¡Â±', 'ÃªÂ³ÂµÃ¬Â Â Ã­ÂÂ¨Ã¬ÂÂ¨', 'ÃªÂ³ÂµÃªÂ¸ÂÃ¬ÂÂÃ¬Â²Â´ ÃªÂ´ÂÃ«Â¦Â¬', 'Ã¬ÂÂ¸Ã¬Â Â Ã¬ÂÂÃ¬ÂÂ',
  'Ã«Â²ÂÃªÂ·Â Ã¬Â¤ÂÃ¬ÂÂ', 'Ã¬Â§ÂÃ¬ÂÂÃ¬Â Â ÃªÂ°ÂÃ¬ÂÂ ', 'Ã¬ÂÂÃ­ÂÂ ÃªÂ´ÂÃ«Â¦Â¬', 'ÃªÂ¸Â°Ã­ÂÂ',
]

function genId() { return `QO-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }
function today() { return new Date().toISOString().slice(0, 10) }

const EMPTY_FORM = {
  title: '', category: 'Ã¬Â ÂÃ­ÂÂ Ã­ÂÂÃ¬Â§Â', dept: 'Ã­ÂÂÃ¬Â§ÂÃ«Â¶Â(QUA)',
  period: 'Ã¬ÂÂ°ÃªÂ°Â', year: String(new Date().getFullYear()),
  startDate: today(), endDate: '',
  kpiName: '', unit: '%', direction: 'higher',
  baselineValue: '', targetValue: '', actualValue: '',
  status: 'not_started', autoCalc: true,
  linkedKpiId: '',
  linkedKpi: 'other',   // #364: Ã¬ÂÂ°Ã«ÂÂ KPI Ã¬ÂÂ Ã­ÂÂ Ã¢ÂÂ 'other'ÃªÂ°Â Ã¬ÂÂÃ«ÂÂÃ«Â©Â´ Ã¬ÂÂ¤Ã¬Â ÂÃªÂ°ÂÃ¬ÂÂ Ã¬ÂÂ¤Ã¬Â Â Ã«ÂÂ°Ã¬ÂÂ´Ã­ÂÂ°Ã¬ÂÂÃ¬ÂÂ Ã¬ÂÂÃ«ÂÂÃ¬ÂÂ¼Ã«Â¡Â Ã«Â¶ÂÃ«ÂÂ¬Ã¬ÂÂ´
  description: '', actions: '',
  notes: '',
  actuals: [],   // monthly/quarterly actuals [{date, value, note}]
}

// Ã¢ÂÂÃ¢ÂÂ Ã«Â©ÂÃ¬ÂÂ¸ Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
export default function QualityObjectivesHub() {
  const user = auth.current()
  return (
    <AppLayout user={user} title="Ã­ÂÂÃ¬Â§Â Ã«ÂªÂ©Ã­ÂÂ ÃªÂ´ÂÃ«Â¦Â¬" subtitle="ISO 13485 ÃÂ§5.4.1 Ã­ÂÂÃ¬Â§Â Ã«ÂªÂ©Ã­ÂÂ / ÃÂ§5.4.2 QMS ÃªÂ¸Â°Ã­ÂÂ">
      <HubBanner title="Ã­ÂÂÃ¬Â§Â Ã«ÂªÂ©Ã­ÂÂ ÃªÂ´ÂÃ«Â¦Â¬" subtitle="ISO 13485 ÃÂ§5.4 Ã¢ÂÂ Ã­ÂÂÃ¬Â§Â Ã«ÂªÂ©Ã­ÂÂ Ã¬ÂÂ¤Ã¬Â ÂÃÂ·Ã«ÂªÂ¨Ã«ÂÂÃ­ÂÂ°Ã«Â§ÂÃÂ·Ã«ÂÂ¬Ã¬ÂÂ± Ã­ÂÂÃªÂ°Â" icon={Target} color="#059669" workflow={['Ã«ÂªÂ©Ã­ÂÂ Ã¬ÂÂ¤Ã¬Â Â', 'KPI Ã«Â°Â°Ã«Â¶Â', 'Ã¬ÂÂ¤Ã¬Â Â Ã«ÂªÂ¨Ã«ÂÂÃ­ÂÂ°Ã«Â§Â', 'Ã«ÂÂ¬Ã¬ÂÂ±Ã«ÂÂ Ã­ÂÂÃªÂ°Â', 'Ã¬Â°Â¨ÃªÂ¸Â° Ã«ÂªÂ©Ã­ÂÂ Ã¬ÂÂÃ«Â¦Â½']} />
      <QualityObjectivesPanel />
    </AppLayout>
  )
}

// #360: Ã­ÂÂÃ¬Â§ÂÃ«Â°Â©Ã¬Â¹Â¨ÃªÂ³Â¼ Ã«Â©ÂÃ«ÂÂ´ Ã­ÂÂµÃ­ÂÂ© Ã¢ÂÂ QualityPolicyHub(ÃªÂ²Â½Ã¬ÂÂÃ¬ÂÂÃ¬Â§ÂÃÂ·Ã­ÂÂÃ¬Â§ÂÃ«Â°Â©Ã¬Â¹Â¨) Ã­ÂÂ­ Ã¬ÂÂÃ¬ÂÂÃ¬ÂÂÃ«ÂÂ Ã«Â ÂÃ«ÂÂÃ«Â§ÂÃ«ÂÂÃ«ÂÂÃ«Â¡Â
// AppLayout Ã¬ÂÂÃ¬ÂÂ´ Ã«ÂÂ´Ã¬ÂÂ©Ã«Â§Â export. /quality-objectives Ã«ÂÂ¼Ã¬ÂÂ°Ã­ÂÂ¸(Ã«ÂÂ¥Ã«Â§ÂÃ­ÂÂ¬ Ã­ÂÂÃ¬ÂÂÃ­ÂÂ¸Ã­ÂÂ)Ã«ÂÂ Ã¬ÂÂ Ã«ÂÂÃ­ÂÂ¼ÃªÂ°Â Ã«ÂÂ´Ã«ÂÂ¹.
export function QualityObjectivesPanel() {
  const canEdit = auth.current()?.level >= 2
  const companyId = user?.company_id

  const [objectives, setObjectives] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
  })

  const [tab, setTab] = useState('list')    // list | detail | analysis
  const [selectedId, setSelectedId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [filterDept, setFilterDept] = useState('all')
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()))
  const [filterStatus, setFilterStatus] = useState('all')
  const [showActualForm, setShowActualForm] = useState(false)
  const [actualForm, setActualForm] = useState({ date: today(), value: '', note: '' })

  function save(list) {
    setObjectives(list)
    localStorage.setItem(LS_KEY_POLICY, JSON.stringify(list))
    if (_sbCidQo) supabase.from('company_data').upsert({company_id: _sbCidQo, data_type: 'localStorage_sync', data_key: LS_KEY_POLICY, payload: list}, {onConflict: 'company_id,data_type,data_key'})
  }
  useEffect(() => { _sbCidQo = companyId || null }, [companyId])
  useEffect(() => {
    if (!companyId) return
    supabase.from('company_data').select('payload')
      .eq('company_id', companyId).eq('data_type', 'localStorage_sync')
      .eq('data_key', LS_KEY_POLICY).maybeSingle()
      .then(({ data: sbData }) => { if (sbData?.payload) setObjectives(sbData.payload) })
  }, [companyId])

  function submitObj() {
    if (!form.title.trim()) return alert('Ã«ÂªÂ©Ã­ÂÂÃ«ÂªÂÃ¬ÂÂ Ã¬ÂÂÃ«Â Â¥Ã­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ.')
    if (!form.targetValue) return alert('Ã«ÂªÂ©Ã­ÂÂÃªÂ°ÂÃ¬ÂÂ Ã¬ÂÂÃ«Â Â¥Ã­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ.')
    const computed = { ...form }
    if (form.autoCalc) computed.status = autoStatus(computed)
    const next = editId
      ? objectives.map(o => o.id === editId ? { ...o, ...computed } : o)
      : [{ id: genId(), createdAt: today(), actuals: [], ...computed }, ...objectives]
    save(next)
    setShowForm(false); setForm(EMPTY_FORM); setEditId(null)
  }

  function deleteObj(id) {
    if (!confirm('Ã­ÂÂÃ¬Â§Â Ã«ÂªÂ©Ã­ÂÂÃ«Â¥Â¼ Ã¬ÂÂ­Ã¬Â ÂÃ­ÂÂÃ¬ÂÂÃªÂ²Â Ã¬ÂÂµÃ«ÂÂÃªÂ¹Â?')) return
    save(objectives.filter(o => o.id !== id))
    if (selectedId === id) { setSelectedId(null); setTab('list') }
  }

  function addActual(objId) {
    if (!actualForm.value) return alert('Ã¬ÂÂ¤Ã¬Â ÂÃªÂ°ÂÃ¬ÂÂ Ã¬ÂÂÃ«Â Â¥Ã­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ.')
    const entry = { ...actualForm, id: Date.now() }
    const next = objectives.map(o => {
      if (o.id !== objId) return o
      const updated = { ...o, actuals: [...(o.actuals || []), entry], actualValue: actualForm.value }
      if (updated.autoCalc) updated.status = autoStatus(updated)
      return updated
    })
    save(next)
    setActualForm({ date: today(), value: '', note: '' })
    setShowActualForm(false)
  }

  const selected = objectives.find(o => o.id === selectedId)

  const filtered = useMemo(() => objectives.filter(o => {
    if (filterDept !== 'all' && o.dept !== filterDept) return false
    if (filterYear !== 'all' && o.year !== filterYear) return false
    if (filterStatus !== 'all') {
      const st = o.autoCalc ? autoStatus(o) : (o.status || 'not_started')
      if (st !== filterStatus) return false
    }
    return true
  }), [objectives, filterDept, filterYear, filterStatus])

  // Ã«Â¶ÂÃ¬ÂÂ
  const analysis = useMemo(() => {
    const yr = objectives.filter(o => o.year === filterYear)
    const byStatus = {}
    Object.keys(OBJ_STATUSES).forEach(k => {
      byStatus[k] = yr.filter(o => (o.autoCalc ? autoStatus(o) : o.status) === k).length
    })
    const byDept = {}
    yr.forEach(o => { byDept[o.dept] = (byDept[o.dept] || 0) + 1 })
    const achieved = yr.filter(o => (o.autoCalc ? autoStatus(o) : o.status) === 'achieved').length
    const total = yr.length
    const achieveRate = total > 0 ? Math.round((achieved / total) * 100) : null
    const missed = yr.filter(o => (o.autoCalc ? autoStatus(o) : o.status) === 'missed')
    const atRisk = yr.filter(o => (o.autoCalc ? autoStatus(o) : o.status) === 'at_risk')
    return { byStatus, byDept, achieved, total, achieveRate, missed, atRisk }
  }, [objectives, filterYear])

  return (
      <div className="px-6 lg:px-8 py-6 max-w-[1400px] mx-auto">

        {/* Ã­ÂÂ­ */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-soft)' }}>
          {[
            { key: 'list',     label: `Ã«ÂªÂ©Ã­ÂÂ Ã«ÂªÂ©Ã«Â¡Â (${objectives.length})` },
            { key: 'analysis', label: 'Ã«ÂÂ¬Ã¬ÂÂ± Ã­ÂÂÃ­ÂÂ©' },
          ].map(t => (
            <button key={t.key} onClick={() => !t.disabled && setTab(t.key)} disabled={t.disabled}
              className="px-4 py-1.5 rounded-lg text-[13px] font-semibold transition"
              style={{
                background: tab === t.key ? 'var(--bg-card)' : 'transparent',
                color: t.disabled ? 'var(--ink-faint)' : tab === t.key ? 'var(--moss)' : 'var(--ink-soft)',
                boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                border: 'none', cursor: t.disabled ? 'not-allowed' : 'pointer',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Ã¢ÂÂÃ¢ÂÂ Ã«ÂªÂ©Ã«Â¡Â Ã­ÂÂ­ Ã¢ÂÂÃ¢ÂÂ */}
        {tab === 'list' && (
          <div>
            {/* Ã­ÂÂÃ­ÂÂ° */}
            <div className="flex flex-wrap gap-2 mb-4 items-center">
              <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-[13px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                <option value="all">Ã¬Â ÂÃ¬Â²Â´ Ã¬ÂÂ°Ã«ÂÂ</option>
                {YEARS.map(y => <option key={y} value={y}>{y}Ã«ÂÂ</option>)}
              </select>
              <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-[13px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                <option value="all">Ã¬Â ÂÃ¬Â²Â´ Ã«Â¶ÂÃ¬ÂÂ</option>
                {DEPT_LIST.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-[13px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                <option value="all">Ã¬Â ÂÃ¬Â²Â´ Ã¬ÂÂÃ­ÂÂ</option>
                {Object.entries(OBJ_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              {canEdit && (
                <button onClick={() => { setForm(EMPTY_FORM); setEditId(null); setShowForm(true) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold ml-auto"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} /> Ã­ÂÂÃ¬Â§Â Ã«ÂªÂ©Ã­ÂÂ Ã«ÂÂ±Ã«Â¡Â
                </button>
              )}
            </div>

            {showForm && (
              <ObjForm form={form} setForm={setForm} onSave={submitObj}
                onCancel={() => { setShowForm(false); setForm(EMPTY_FORM); setEditId(null) }}
                isEdit={!!editId} />
            )}

            {/* ÃªÂ²Â½Ã«Â³Â´ */}
            {(analysis.missed.length > 0 || analysis.atRisk.length > 0) && tab === 'list' && (
              <div className="mb-4 space-y-2">
                {analysis.missed.length > 0 && (
                  <div className="p-3 rounded-xl text-[12.5px] flex items-center gap-2 flex-wrap"
                    style={{ background: '#FEE2E2', border: '1px solid #FECACA', color: '#991B1B' }}>
                    <AlertTriangle size={14} />
                    Ã«Â¯Â¸Ã«ÂÂ¬Ã¬ÂÂ± Ã«ÂªÂ©Ã­ÂÂ {analysis.missed.length}ÃªÂ±Â´:
                    {analysis.missed.slice(0, 3).map(o => (
                      <span key={o.id} className="font-bold cursor-pointer underline" onClick={() => { setSelectedId(o.id); setTab('detail') }}>{o.title}</span>
                    ))}
                  </div>
                )}
                {analysis.atRisk.length > 0 && (
                  <div className="p-3 rounded-xl text-[12.5px] flex items-center gap-2 flex-wrap"
                    style={{ background: '#FEF3C7', border: '1px solid #FDE68A', color: '#92400E' }}>
                    <AlertTriangle size={14} />
                    Ã¬ÂÂÃ­ÂÂ Ã«ÂªÂ©Ã­ÂÂ {analysis.atRisk.length}ÃªÂ±Â´:
                    {analysis.atRisk.slice(0, 3).map(o => (
                      <span key={o.id} className="font-bold cursor-pointer underline" onClick={() => { setSelectedId(o.id); setTab('detail') }}>{o.title}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {filtered.length === 0 ? (
              <div className="text-center py-20" style={{ color: 'var(--ink-faint)' }}>
                <Target size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <div className="text-[14px]">Ã«ÂÂ±Ã«Â¡ÂÃ«ÂÂ Ã­ÂÂÃ¬Â§Â Ã«ÂªÂ©Ã­ÂÂÃªÂ°Â Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤.</div>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(obj => {
                  const effStatus = obj.autoCalc ? autoStatus(obj) : (obj.status || 'not_started')
                  const sm = OBJ_STATUSES[effStatus] || OBJ_STATUSES.not_started
                  const rate = calcRate(obj)
                  const isHigher = obj.direction !== 'lower'
                  return (
                    <div key={obj.id} className="p-4 rounded-2xl cursor-pointer transition"
                      style={{ background: 'var(--bg-card)', border: '1.5px solid var(--line)' }}
                      onClick={() => { setSelectedId(obj.id); setTab('detail') }}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-[11px] font-mono" style={{ color: 'var(--ink-faint)' }}>{obj.id}</span>
                            <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
                            <span className="text-[10.5px] px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>{obj.dept} ÃÂ· {obj.year}Ã«ÂÂ ÃÂ· {obj.period}</span>
                          </div>
                          <div className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>{obj.title}</div>
                          <div className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>{obj.kpiName} ÃÂ· {obj.category}</div>
                        </div>

                        {/* KPI Ã¬ÂÂÃ¬Â¹Â */}
                        <div className="text-right shrink-0">
                          <div className="flex items-center gap-2 justify-end mb-1">
                            <span className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>Ã«ÂªÂ©Ã­ÂÂ: <strong style={{ color: 'var(--ink)' }}>{obj.targetValue}{obj.unit}</strong></span>
                            {obj.actualValue && (
                              <span className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>Ã¬ÂÂ¤Ã¬Â Â: <strong style={{ color: sm.color }}>{obj.actualValue}{obj.unit}</strong></span>
                            )}
                          </div>
                          {rate !== null && (
                            <div className="flex items-center gap-1 justify-end">
                              {rate >= 100
                                ? <TrendingUp size={12} style={{ color: '#059669' }} />
                                : rate < 60
                                ? <TrendingDown size={12} style={{ color: '#DC2626' }} />
                                : <Minus size={12} style={{ color: '#D97706' }} />}
                              <span className="text-[13px] font-bold" style={{ color: sm.color }}>{rate}%</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Ã¬Â§ÂÃ­ÂÂÃ«Â°Â */}
                      {rate !== null && (
                        <div className="mt-2">
                          <div className="h-2 rounded-full" style={{ background: 'var(--bg-soft)' }}>
                            <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(rate, 100)}%`, background: sm.color }} />
                          </div>
                        </div>
                      )}

                      {canEdit && (
                        <div className="flex gap-1 mt-3 flex-wrap" onClick={e => e.stopPropagation()}>
                          <button onClick={() => { setForm({ ...EMPTY_FORM, ...obj }); setEditId(obj.id); setShowForm(true) }}
                            className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                            <Edit2 size={12} style={{ color: 'var(--ink-soft)' }} />
                          </button>
                          <button onClick={() => deleteObj(obj.id)}
                            className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', border: '1px solid #FECACA', cursor: 'pointer' }}>
                            <Trash2 size={12} style={{ color: '#DC2626' }} />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Ã¢ÂÂÃ¢ÂÂ Ã¬ÂÂÃ¬ÂÂ¸ Ã­ÂÂ­ Ã¢ÂÂÃ¢ÂÂ */}
        {tab === 'detail' && selected && (
          <DetailView
            obj={selected} canEdit={canEdit}
            showActualForm={showActualForm} setShowActualForm={setShowActualForm}
            actualForm={actualForm} setActualForm={setActualForm}
            addActual={addActual} autoStatus={autoStatus} calcRate={calcRate}
          />
        )}

        {/* Ã¢ÂÂÃ¢ÂÂ Ã«Â¶ÂÃ¬ÂÂ Ã­ÂÂ­ Ã¢ÂÂÃ¢ÂÂ */}
        {tab === 'analysis' && (
          <AnalysisView analysis={analysis} filterYear={filterYear}
            objectives={objectives} setSelectedId={setSelectedId} setTab={setTab}
            autoStatus={autoStatus} calcRate={calcRate} />
        )}
      </div>
  )
}

// Ã¢ÂÂÃ¢ÂÂ Ã¬ÂÂÃ¬ÂÂ¸ Ã«Â·Â° Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
function DetailView({ obj, canEdit, showActualForm, setShowActualForm, actualForm, setActualForm, addActual, autoStatus, calcRate }) {
  const effStatus = obj.autoCalc ? autoStatus(obj) : (obj.status || 'not_started')
  const sm = OBJ_STATUSES[effStatus] || OBJ_STATUSES.not_started
  const rate = calcRate(obj)

  return (
    <div className="space-y-4">
      {/* Ã­ÂÂ¤Ã«ÂÂ */}
      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[12px] font-mono" style={{ color: 'var(--ink-faint)' }}>{obj.id}</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
              {obj.autoCalc && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>Ã¬ÂÂÃ«ÂÂ Ã¬ÂÂ°Ã¬Â Â</span>}
            </div>
            <div className="text-[20px] font-bold" style={{ color: 'var(--ink)' }}>{obj.title}</div>
            <div className="text-[13px]" style={{ color: 'var(--ink-soft)' }}>{obj.dept} ÃÂ· {obj.category} ÃÂ· {obj.year}Ã«ÂÂ {obj.period}</div>
          </div>

          {/* Ã«ÂÂÃ­ÂÂ KPI Ã¬ÂÂÃ¬Â¹Â */}
          <div className="text-center p-4 rounded-2xl" style={{ background: sm.bg, minWidth: 120 }}>
            <div className="text-[11px] mb-1" style={{ color: sm.color }}>{obj.kpiName || 'KPI'}</div>
            {rate !== null ? (
              <>
                <div className="text-[28px] font-black" style={{ color: sm.color }}>{rate}%</div>
                <div className="text-[11px]" style={{ color: sm.color }}>Ã«ÂÂ¬Ã¬ÂÂ±Ã«Â¥Â </div>
              </>
            ) : (
              <div className="text-[20px] font-bold" style={{ color: sm.color }}>-</div>
            )}
          </div>
        </div>

        {/* Ã«Â©ÂÃ­ÂÂ ÃªÂ·Â¸Ã«Â¦Â¬Ã«ÂÂ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          {[
            { label: 'ÃªÂ¸Â°Ã¬Â¤ÂÃªÂ°Â (Baseline)', value: obj.baselineValue ? `${obj.baselineValue}${obj.unit}` : '-' },
            { label: 'Ã«ÂªÂ©Ã­ÂÂÃªÂ°Â', value: `${obj.targetValue}${obj.unit}` },
            { label: 'Ã¬ÂµÂÃªÂ·Â¼ Ã¬ÂÂ¤Ã¬Â Â', value: obj.actualValue ? `${obj.actualValue}${obj.unit}` : '-' },
            { label: 'Ã«Â°Â©Ã­ÂÂ¥', value: obj.direction === 'lower' ? 'Ã¢ÂÂ Ã«ÂÂ®Ã¬ÂÂÃ¬ÂÂÃ«Â¡Â Ã¬Â¢ÂÃ¬ÂÂ' : 'Ã¢ÂÂ Ã«ÂÂÃ¬ÂÂÃ¬ÂÂÃ«Â¡Â Ã¬Â¢ÂÃ¬ÂÂ' },
            { label: 'Ã¬ÂÂÃ¬ÂÂÃ¬ÂÂ¼', value: obj.startDate || '-' },
            { label: 'Ã¬Â¢ÂÃ«Â£ÂÃ¬ÂÂ¼', value: obj.endDate || '-' },
          ].map(({ label, value }) => (
            <div key={label} className="p-2 rounded-xl" style={{ background: 'var(--bg-soft)' }}>
              <div className="text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>{label}</div>
              <div className="text-[12.5px] font-semibold" style={{ color: 'var(--ink)' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Ã¬Â§ÂÃ­ÂÂÃ«Â°Â */}
        {rate !== null && (
          <div className="mb-3">
            <div className="flex justify-between text-[12px] mb-1" style={{ color: 'var(--ink-soft)' }}>
              <span>Ã«ÂÂ¬Ã¬ÂÂ±Ã«Â¥Â </span>
              <span className="font-bold" style={{ color: sm.color }}>{rate}%</span>
            </div>
            <div className="h-3 rounded-full" style={{ background: 'var(--bg-soft)' }}>
              <div className="h-3 rounded-full transition-all" style={{ width: `${Math.min(rate, 100)}%`, background: sm.color }} />
            </div>
          </div>
        )}

        {/* Ã«Â§ÂÃ­ÂÂ¬ */}
        {obj.linkedKpiId && (
          <div className="flex gap-2 flex-wrap mb-2">
            <LinkChip label={`KPI: ${obj.linkedKpiId}`} color="#2563EB" />
          </div>
        )}

        {obj.description && (
          <div className="mt-2 p-3 rounded-xl text-[12.5px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
            <span className="font-bold" style={{ color: 'var(--ink)' }}>Ã«ÂªÂ©Ã­ÂÂ Ã¬ÂÂ¤Ã«ÂªÂ: </span>{obj.description}
          </div>
        )}
        {obj.actions && (
          <div className="mt-2 p-3 rounded-xl text-[12.5px]" style={{ background: '#EFF6FF', color: '#1E40AF' }}>
            <span className="font-bold">Ã«ÂÂ¬Ã¬ÂÂ± Ã«Â°Â©Ã¬ÂÂ: </span>{obj.actions}
          </div>
        )}

        {canEdit && (
          <button onClick={() => setShowActualForm(!showActualForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold mt-3"
            style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
            <RefreshCw size={13} /> Ã¬ÂÂ¤Ã¬Â Â Ã¬ÂÂÃ«Â Â¥
          </button>
        )}
      </div>

      {/* Ã¬ÂÂ¤Ã¬Â Â Ã¬ÂÂÃ«Â Â¥ Ã­ÂÂ¼ */}
      {showActualForm && canEdit && (
        <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
          <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>Ã¬ÂÂ¤Ã¬Â Â Ã¬ÂÂÃ«Â Â¥</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>Ã¬Â¸Â¡Ã¬Â ÂÃ¬ÂÂ¼</label>
              <input type="date" value={actualForm.date} onChange={e => setActualForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-1.5 rounded-xl text-[13px]"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>Ã¬ÂÂ¤Ã¬Â ÂÃªÂ°Â ({obj.unit}) *</label>
              <input type="number" value={actualForm.value} onChange={e => setActualForm(f => ({ ...f, value: e.target.value }))}
                placeholder={`Ã«ÂªÂ©Ã­ÂÂ: ${obj.targetValue}${obj.unit}`}
                className="w-full px-3 py-1.5 rounded-xl text-[13px]"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>Ã«Â¹ÂÃªÂ³Â </label>
              <input type="text" value={actualForm.note} onChange={e => setActualForm(f => ({ ...f, note: e.target.value }))}
                className="w-full px-3 py-1.5 rounded-xl text-[13px]"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => addActual(obj.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
              style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
              <Save size={13} /> Ã¬Â ÂÃ¬ÂÂ¥
            </button>
            <button onClick={() => setShowActualForm(false)}
              className="px-4 py-2 rounded-xl text-[13px]"
              style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>Ã¬Â·Â¨Ã¬ÂÂ</button>
          </div>
        </div>
      )}

      {/* Ã¬ÂÂ¤Ã¬Â Â Ã¬ÂÂ´Ã«Â Â¥ */}
      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>Ã¬ÂÂ¤Ã¬Â Â Ã¬ÂÂ´Ã«Â Â¥ ({(obj.actuals || []).length}ÃªÂ±Â´)</div>
        {(obj.actuals || []).length === 0 ? (
          <div className="text-center py-6 text-[13px]" style={{ color: 'var(--ink-faint)' }}>Ã¬ÂÂ¤Ã¬Â Â Ã¬ÂÂ´Ã«Â Â¥Ã¬ÂÂ´ Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤.</div>
        ) : (
          <table className="w-full text-[12.5px]">
            <thead>
              <tr style={{ background: 'var(--bg-soft)' }}>
                {['Ã¬Â¸Â¡Ã¬Â ÂÃ¬ÂÂ¼', 'Ã¬ÂÂ¤Ã¬Â ÂÃªÂ°Â', 'Ã«ÂÂ¬Ã¬ÂÂ±Ã«Â¥Â ', 'Ã«Â¹ÂÃªÂ³Â '].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--ink-soft)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...(obj.actuals || [])].reverse().map((a, i) => {
                const tmpObj = { ...obj, actualValue: a.value }
                const r = calcRate(tmpObj)
                const statusKey = r !== null ? (r >= 100 ? 'achieved' : r >= 80 ? 'on_track' : r >= 60 ? 'at_risk' : 'missed') : 'not_started'
                const sm2 = OBJ_STATUSES[statusKey]
                return (
                  <tr key={a.id || i} style={{ borderTop: '1px solid var(--line)' }}>
                    <td className="px-3 py-2" style={{ color: 'var(--ink-soft)' }}>{a.date}</td>
                    <td className="px-3 py-2 font-bold" style={{ color: 'var(--ink)' }}>{a.value}{obj.unit}</td>
                    <td className="px-3 py-2">
                      {r !== null && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: sm2.bg, color: sm2.color }}>{r}%</span>}
                    </td>
                    <td className="px-3 py-2" style={{ color: 'var(--ink-soft)' }}>{a.note || '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// Ã¢ÂÂÃ¢ÂÂ Ã«Â¶ÂÃ¬ÂÂ Ã­ÂÂ­ Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
function AnalysisView({ analysis, filterYear, objectives, setSelectedId, setTab, autoStatus, calcRate }) {
  const yr = objectives.filter(o => o.year === filterYear)

  return (
    <div className="space-y-5">
      {/* Ã¬Â ÂÃ¬Â²Â´ Ã«ÂÂ¬Ã¬ÂÂ±Ã«Â¥Â  */}
      {analysis.total > 0 && (
        <div className="p-6 rounded-2xl text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[13px] mb-1" style={{ color: 'var(--ink-faint)' }}>{filterYear}Ã«ÂÂ Ã¬Â ÂÃ¬Â²Â´ Ã«ÂªÂ©Ã­ÂÂ Ã«ÂÂ¬Ã¬ÂÂ±Ã«Â¥Â </div>
          <div className="text-[48px] font-black" style={{ color: analysis.achieveRate >= 80 ? '#059669' : analysis.achieveRate >= 60 ? '#D97706' : '#DC2626' }}>
            {analysis.achieveRate}%
          </div>
          <div className="text-[13px]" style={{ color: 'var(--ink-soft)' }}>{analysis.achieved}/{analysis.total}ÃªÂ°Â Ã«ÂªÂ©Ã­ÂÂ Ã«ÂÂ¬Ã¬ÂÂ±</div>
          <div className="h-3 rounded-full mt-3" style={{ background: 'var(--bg-soft)' }}>
            <div className="h-3 rounded-full" style={{ width: `${analysis.achieveRate}%`, background: analysis.achieveRate >= 80 ? '#059669' : analysis.achieveRate >= 60 ? '#D97706' : '#DC2626' }} />
          </div>
        </div>
      )}

      {/* Ã¬ÂÂÃ­ÂÂÃ«Â³Â */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(OBJ_STATUSES).map(([k, v]) => (
          <div key={k} className="p-4 rounded-2xl text-center" style={{ background: v.bg, border: `1px solid ${v.color}40` }}>
            <div className="text-[26px] font-bold" style={{ color: v.color }}>{analysis.byStatus[k] || 0}</div>
            <div className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>{v.label}</div>
          </div>
        ))}
      </div>

      {/* Ã«Â¯Â¸Ã«ÂÂ¬Ã¬ÂÂ±ÃÂ·Ã¬ÂÂÃ­ÂÂ Ã«ÂªÂ©Ã­ÂÂ */}
      {[
        { list: analysis.missed, title: 'Ã«Â¯Â¸Ã«ÂÂ¬Ã¬ÂÂ± Ã«ÂªÂ©Ã­ÂÂ', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
        { list: analysis.atRisk, title: 'Ã¬ÂÂÃ­ÂÂ Ã«ÂªÂ©Ã­ÂÂ', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
      ].map(({ list, title, color, bg, border }) => list.length > 0 && (
        <div key={title} className="p-5 rounded-2xl" style={{ background: bg, border: `1px solid ${border}` }}>
          <div className="text-[13px] font-bold mb-3" style={{ color }}>{title} ({list.length}ÃªÂ±Â´)</div>
          <div className="space-y-2">
            {list.map(obj => {
              const rate = calcRate(obj)
              return (
                <div key={obj.id} className="flex items-center justify-between p-2.5 rounded-xl cursor-pointer"
                  style={{ background: bg, border: `1px solid ${border}` }}
                  onClick={() => { setSelectedId(obj.id); setTab('detail') }}>
                  <div>
                    <div className="text-[12px] font-bold" style={{ color }}>{obj.title}</div>
                    <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{obj.dept} ÃÂ· Ã«ÂªÂ©Ã­ÂÂ: {obj.targetValue}{obj.unit}</div>
                  </div>
                  <div className="text-right">
                    {rate !== null && <div className="text-[13px] font-bold" style={{ color }}>{rate}%</div>}
                    <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{obj.actualValue ? `Ã¬ÂÂ¤Ã¬Â Â: ${obj.actualValue}${obj.unit}` : 'Ã¬ÂÂ¤Ã¬Â Â Ã«Â¯Â¸Ã¬ÂÂÃ«Â Â¥'}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Ã«Â¶ÂÃ¬ÂÂÃ«Â³Â Ã«ÂªÂ©Ã­ÂÂ Ã¬ÂÂ */}
      {Object.keys(analysis.byDept).length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>Ã«Â¶ÂÃ¬ÂÂÃ«Â³Â Ã­ÂÂÃ¬Â§Â Ã«ÂªÂ©Ã­ÂÂ Ã¬ÂÂ</div>
          {Object.entries(analysis.byDept).sort(([, a], [, b]) => b - a).map(([dept, cnt]) => (
            <div key={dept} className="flex items-center gap-3 mb-2">
              <span className="text-[12px] w-32 shrink-0" style={{ color: 'var(--ink-soft)' }}>{dept}</span>
              <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--bg-soft)' }}>
                <div className="h-2 rounded-full" style={{ width: `${(cnt / analysis.total) * 100}%`, background: 'var(--moss)' }} />
              </div>
              <span className="text-[12px] font-bold w-4" style={{ color: 'var(--ink)' }}>{cnt}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Ã¢ÂÂÃ¢ÂÂ Ã­ÂÂ¼ Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
function ObjForm({ form, setForm, onSave, onCancel, isEdit }) {
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const navigate = useNavigate()
  const policy = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY_POLICY) || '{}') } catch { return {} }
  }, [])
  const kpiSnapshot = useMemo(() => { try { return buildSnapshot().kpi } catch { return null } }, [])
  const isLinked = form.linkedKpi && form.linkedKpi !== 'other'

  // #364: Ã¬ÂÂ°Ã«ÂÂ KPI Ã¬ÂÂ Ã­ÂÂ Ã¬ÂÂ KPIÃ«ÂªÂÃÂ·Ã«ÂÂ¨Ã¬ÂÂÃÂ·Ã«Â°Â©Ã­ÂÂ¥Ã¬ÂÂ Ã¬ÂÂÃ«ÂÂ Ã¬Â§ÂÃ¬Â ÂÃ­ÂÂÃªÂ³Â  Ã¬ÂÂ¤Ã¬Â ÂÃªÂ°ÂÃ¬ÂÂ Ã¬ÂÂ¤Ã¬Â Â Ã«ÂÂ°Ã¬ÂÂ´Ã­ÂÂ°Ã¬ÂÂÃ¬ÂÂ Ã«Â¶ÂÃ«ÂÂ¬Ã¬ÂÂ¨Ã«ÂÂ¤.
  // 'ÃªÂ¸Â°Ã­ÂÂ'Ã«Â¥Â¼ Ã¬ÂÂ Ã­ÂÂÃ­ÂÂÃ«Â©Â´ ÃªÂ¸Â°Ã¬Â¡Â´ÃªÂ³Â¼ Ã«ÂÂÃ¬ÂÂ¼Ã­ÂÂÃªÂ²Â Ã¬Â ÂÃ«Â¶Â Ã¬Â§ÂÃ¬Â Â Ã¬ÂÂÃ«Â Â¥.
  function onLinkedKpiChange(id) {
    F('linkedKpi', id)
    if (id === 'other') return
    const opt = LINKED_KPI_OPTIONS.find(o => o.id === id)
    if (!opt) return
    setForm(f => ({
      ...f,
      linkedKpi: id,
      kpiName: opt.label,
      unit: opt.unit,
      direction: opt.direction,
      actualValue: String(computeLinkedActual(id, kpiSnapshot)),
    }))
  }
  function refreshLinkedActual() {
    if (!isLinked) return
    F('actualValue', String(computeLinkedActual(form.linkedKpi, kpiSnapshot)))
  }
  return (
    <div className="mb-6 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>{isEdit ? 'Ã­ÂÂÃ¬Â§Â Ã«ÂªÂ©Ã­ÂÂ Ã¬ÂÂÃ¬Â Â' : 'Ã­ÂÂÃ¬Â§Â Ã«ÂªÂ©Ã­ÂÂ Ã«ÂÂ±Ã«Â¡Â'}</div>

      {/* Ã­ÂÂÃ¬Â§Â Ã«Â°Â©Ã¬Â¹Â¨ Ã¬Â°Â¸ÃªÂ³Â  */}
      <div className="mb-4 p-4 rounded-2xl" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 text-[12.5px] font-bold" style={{ color: '#1E40AF' }}>
            <Award size={13} /> Ã­ÂÂÃ¬Â§Â Ã«Â°Â©Ã¬Â¹Â¨ (ÃÂ§5.3) Ã¢ÂÂ Ã¬Â°Â¸ÃªÂ³Â Ã­ÂÂÃ¬ÂÂ¬ Ã¬ÂÂÃ¬ÂÂ±Ã­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ
          </div>
          <button onClick={() => navigate('/management-commitment')}
            className="flex items-center gap-1 text-[11.5px] font-semibold"
            style={{ background: 'none', border: 'none', color: '#1E40AF', cursor: 'pointer' }}>
            Ã«Â°Â©Ã¬Â¹Â¨ Ã­ÂÂÃ¬ÂÂ´Ã¬Â§ÂÃ«Â¡Â Ã¬ÂÂ´Ã«ÂÂ <ExternalLink size={11} />
          </button>
        </div>
        {policy.statement
          ? <p className="text-[12.5px] whitespace-pre-line" style={{ color: '#1E40AF' }}>{policy.statement}</p>
          : <p className="text-[12px]" style={{ color: '#1E40AF' }}>Ã¬ÂÂÃ¬Â§Â Ã­ÂÂÃ¬Â§Â Ã«Â°Â©Ã¬Â¹Â¨Ã¬ÂÂ´ Ã¬ÂÂÃ¬ÂÂ±Ã«ÂÂÃ¬Â§Â Ã¬ÂÂÃ¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤. ÃªÂ²Â½Ã¬ÂÂ Ã¬ÂÂÃ¬Â§ÂÃÂ·Ã­ÂÂÃ¬Â§Â Ã«Â°Â©Ã¬Â¹Â¨ Ã«Â©ÂÃ«ÂÂ´Ã¬ÂÂÃ¬ÂÂ Ã«Â¨Â¼Ã¬Â Â Ã¬ÂÂÃ¬ÂÂ±Ã­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ.</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <Field label="Ã«ÂªÂ©Ã­ÂÂÃ«ÂªÂ *" value={form.title} onChange={v => F('title', v)} />
        <FieldSelect label="Ã¬Â¹Â´Ã­ÂÂÃªÂ³Â Ã«Â¦Â¬" value={form.category} onChange={v => F('category', v)}
          options={CATEGORIES.map(c => ({ value: c, label: c }))} />
        <FieldSelect label="Ã«Â¶ÂÃ¬ÂÂ" value={form.dept} onChange={v => F('dept', v)}
          options={DEPT_LIST.map(d => ({ value: d, label: d }))} />
        <FieldSelect label="Ã¬ÂÂ°Ã«ÂÂ" value={form.year} onChange={v => F('year', v)}
          options={YEARS.map(y => ({ value: y, label: `${y}Ã«ÂÂ` }))} />
        <FieldSelect label="Ã¬Â£Â¼ÃªÂ¸Â°" value={form.period} onChange={v => F('period', v)}
          options={PERIODS.map(p => ({ value: p, label: p }))} />
        <FieldSelect label="Ã¬ÂÂ°Ã«ÂÂ KPI" value={form.linkedKpi || 'other'} onChange={onLinkedKpiChange}
          options={LINKED_KPI_OPTIONS.map(o => ({ value: o.id, label: o.label }))} />
        <Field label="KPI Ã«ÂªÂÃ¬Â¹Â­" value={form.kpiName} onChange={v => F('kpiName', v)} placeholder="ÃªÂ²ÂÃ¬ÂÂ¬ Ã­ÂÂ©ÃªÂ²Â©Ã«Â¥Â " disabled={isLinked} />
        <FieldSelect label="Ã«ÂÂ¨Ã¬ÂÂ" value={form.unit} onChange={v => F('unit', v)}
          options={KPI_UNIT_PRESETS.map(u => ({ value: u, label: u }))} disabled={isLinked} />
        <FieldSelect label="Ã«Â°Â©Ã­ÂÂ¥" value={form.direction} onChange={v => F('direction', v)}
          options={[{ value: 'higher', label: 'Ã¢ÂÂ Ã«ÂÂÃ¬ÂÂÃ¬ÂÂÃ«Â¡Â Ã¬Â¢ÂÃ¬ÂÂ' }, { value: 'lower', label: 'Ã¢ÂÂ Ã«ÂÂ®Ã¬ÂÂÃ¬ÂÂÃ«Â¡Â Ã¬Â¢ÂÃ¬ÂÂ' }]} disabled={isLinked} />
        <Field label="ÃªÂ¸Â°Ã¬Â¤ÂÃªÂ°Â (Baseline)" value={form.baselineValue} onChange={v => F('baselineValue', v)} type="number" />
        <Field label="Ã«ÂªÂ©Ã­ÂÂÃªÂ°Â *" value={form.targetValue} onChange={v => F('targetValue', v)} type="number" />
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11.5px] font-semibold" style={{ color: 'var(--ink-soft)' }}>Ã­ÂÂÃ¬ÂÂ¬ Ã¬ÂÂ¤Ã¬Â ÂÃªÂ°Â</label>
            {isLinked && <button type="button" onClick={refreshLinkedActual} className="text-[10.5px] font-semibold" style={{ background: 'none', border: 'none', color: 'var(--moss)', cursor: 'pointer' }}>Ã¬ÂÂ¤Ã¬Â Â Ã¬ÂÂÃ«ÂÂ Ã«Â¶ÂÃ«ÂÂ¬Ã¬ÂÂ¤ÃªÂ¸Â°</button>}
          </div>
          <input type="number" value={form.actualValue || ''} onChange={e => F('actualValue', e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl text-[13px]"
            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
          {isLinked && <div className="text-[10.5px] mt-1" style={{ color: 'var(--ink-faint)' }}>Ã¬ÂÂ¤Ã¬Â Â Ã«ÂÂ°Ã¬ÂÂ´Ã­ÂÂ°(ÃªÂ²Â½Ã¬ÂÂÃªÂ²ÂÃ­ÂÂ  KPI Ã¬ÂÂÃ«ÂÂÃ¬Â§ÂÃªÂ³Â)Ã¬ÂÂÃ¬ÂÂ Ã«Â¶ÂÃ«ÂÂ¬Ã¬ÂÂ¨ ÃªÂ°ÂÃ¬ÂÂÃ«ÂÂÃ«ÂÂ¤. Ã­ÂÂÃ¬ÂÂ Ã¬ÂÂ Ã¬ÂÂÃ¬Â Â ÃªÂ°ÂÃ«ÂÂ¥Ã­ÂÂ©Ã«ÂÂÃ«ÂÂ¤.</div>}
        </div>
        <div className="flex items-center gap-3 pt-5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.autoCalc !== false}
              onChange={e => F('autoCalc', e.target.checked)} className="accent-green-500" />
            <span className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>Ã¬ÂÂÃ­ÂÂ Ã¬ÂÂÃ«ÂÂ Ã¬ÂÂ°Ã¬Â Â</span>
          </label>
        </div>
        {!form.autoCalc && (
          <FieldSelect label="Ã¬ÂÂÃ­ÂÂ" value={form.status} onChange={v => F('status', v)}
            options={Object.entries(OBJ_STATUSES).map(([k, v]) => ({ value: k, label: v.label }))} />
        )}
        <Field label="Ã¬ÂÂÃ¬ÂÂÃ¬ÂÂ¼" type="date" value={form.startDate} onChange={v => F('startDate', v)} />
        <Field label="Ã¬Â¢ÂÃ«Â£ÂÃ¬ÂÂ¼" type="date" value={form.endDate} onChange={v => F('endDate', v)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <FieldArea label="Ã«ÂªÂ©Ã­ÂÂ Ã¬ÂÂ¤Ã«ÂªÂ" value={form.description} onChange={v => F('description', v)} rows={2} />
        <FieldArea label="Ã«ÂÂ¬Ã¬ÂÂ± Ã«Â°Â©Ã¬ÂÂ" value={form.actions} onChange={v => F('actions', v)} rows={2} />
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

function LinkChip({ label, color }) {
  return (
    <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: color + '15', color, border: `1px solid ${color}40` }}>
      <Link2 size={9} /> {label}
    </span>
  )
}
function Field({ label, value, onChange, type = 'text', placeholder, disabled = false }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
        className="w-full px-3 py-1.5 rounded-xl text-[13px]"
        style={{ background: disabled ? 'var(--bg-soft)' : 'var(--bg)', border: '1px solid var(--line)', color: disabled ? 'var(--ink-faint)' : 'var(--ink)' }} />
    </div>
  )
}
function FieldSelect({ label, value, onChange, options, disabled = false }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <select value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled}
        className="w-full px-3 py-1.5 rounded-xl text-[13px]"
        style={{ background: disabled ? 'var(--bg-soft)' : 'var(--bg)', border: '1px solid var(--line)', color: disabled ? 'var(--ink-faint)' : 'var(--ink)' }}>
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
