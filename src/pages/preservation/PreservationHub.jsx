// src/pages/preservation/PreservationHub.jsx
// ISO 13485 ÃÂ§7.5.11 Ã¬Â ÂÃ­ÂÂ Ã«Â³Â´Ã¬Â¡Â´ÃÂ·Ã¬Â·Â¨ÃªÂ¸Â + ÃÂ§7.5.2 Ã¬Â ÂÃ­ÂÂ Ã¬Â²Â­ÃªÂ²Â°
import React, { useState, useMemo } from 'react'
import {
  X, Save, Edit2, Trash2, Package, Thermometer,
  AlertTriangle, CheckCircle2, Clock, XCircle, Archive,
  Droplets, Sun, Wind, BarChart2, Link2,
  Package2, ArrowUpRight,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import { onboarding } from '../../lib/onboardingState'
import { STORAGE_CONDITIONS, derivePreservationSpecs } from '../../lib/preservationSpecConstants'
let _sbCidPres = null

// Ã¢ÂÂÃ¢ÂÂ Ã¬ÂÂÃ¬ÂÂ Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
const LS_LOTS   = 'qualytree.preservation_lots'    // LOTÃ«Â³Â Ã¬ÂÂ Ã­ÂÂ¨ÃªÂ¸Â°ÃªÂ°Â Ã¬ÂÂ¬ÃªÂ³Â 

function lotId()   { return `PLT-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }
function todayStr(){ return new Date().toISOString().slice(0, 10) }
function daysDiff(d){ return d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null }

const EMPTY_LOT = {
  productName: '', productCode: '', lotNo: '', qty: '',
  manufacturedDate: todayStr(), expiryDate: '', storageLocation: '',
  specId: '', linkedDistId: '', status: 'in_stock',  // in_stock | quarantine | released | expired | disposed
  notes: '',
}

const LOT_STATUSES = {
  in_stock:   { label: 'Ã¬ÂÂ¬ÃªÂ³Â ',   color: '#2563EB', bg: '#EFF6FF' },
  quarantine: { label: 'ÃªÂ²Â©Ã«Â¦Â¬',   color: '#D97706', bg: '#FEF3C7' },
  released:   { label: 'Ã¬Â¶ÂÃ­ÂÂ',   color: '#059669', bg: '#D1FAE5' },
  expired:    { label: 'Ã«Â§ÂÃ«Â£Â',   color: '#DC2626', bg: '#FEE2E2' },
  disposed:   { label: 'Ã­ÂÂÃªÂ¸Â°',   color: '#9CA3AF', bg: '#F3F4F6' },
}

// Ã¢ÂÂÃ¢ÂÂ Ã«Â©ÂÃ¬ÂÂ¸ Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
export default function PreservationHub() {
  const user = auth.current()
  const companyId = user?.company_id
  const canEdit = user?.level >= 2
  const nav = useNavigate()

  // Ã«Â³Â´Ã¬Â¡Â´ Ã¬ÂÂ¬Ã¬ÂÂÃ¬ÂÂ Ã¬Â ÂÃ­ÂÂ ÃªÂ°ÂÃ«Â°Â Ã­ÂÂÃ«Â©Â´(ProductsHub)Ã¬ÂÂÃ¬ÂÂ Ã¬ÂÂÃ«Â Â¥Ã­ÂÂÃ«ÂÂ ÃªÂ°ÂÃ¬ÂÂ Ã¬ÂÂ½ÃªÂ¸Â° Ã¬Â ÂÃ¬ÂÂ©Ã¬ÂÂ¼Ã«Â¡Â Ã­ÂÂÃ¬ÂÂÃ­ÂÂ©Ã«ÂÂÃ«ÂÂ¤ (SSoT).
  const specs = useMemo(() => derivePreservationSpecs(onboarding.load()?.products || []), [])
  const [lots,   setLots]   = useState(() => { try { return JSON.parse(localStorage.getItem(LS_LOTS)   || '[]') } catch { return [] } })

  const [tab, setTab] = useState('lots')   // lots | specs | analysis

  // LOT Ã¬ÂÂÃ­ÂÂ
  const [showLotForm, setShowLotForm] = useState(false)
  const [lotForm, setLotForm] = useState(EMPTY_LOT)
  const [editLotId, setEditLotId] = useState(null)
  const [lotFilter, setLotFilter] = useState('all')
  const [lotSearch, setLotSearch] = useState('')
  useEffect(() => { _sbCidPres = companyId || null }, [companyId])
  useEffect(() => {
    if (!companyId) return
    supabase.from('company_data').select('payload')
      .eq('company_id', companyId).eq('data_type', 'localStorage_sync')
      .eq('data_key', LS_LOTS).maybeSingle()
      .then(({ data: sbData }) => { if (sbData?.payload) setLots(sbData.payload) })
  }, [companyId])

  function saveLots(l) {
    setLots(l)
    localStorage.setItem(LS_LOTS, JSON.stringify(l))
    if (_sbCidPres) {
      supabase.from('company_data').upsert(
        {company_id: _sbCidPres, data_type: 'localStorage_sync', data_key: LS_LOTS, payload: l},
        {onConflict: 'company_id,data_type,data_key'}
      )
    }
  }

  // Ã¢ÂÂÃ¢ÂÂ LOT CRUD Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  function submitLot() {
    if (!lotForm.productName.trim()) return alert('Ã¬Â ÂÃ­ÂÂÃ«ÂªÂÃ¬ÂÂ Ã¬ÂÂÃ«Â Â¥Ã­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ.')
    if (!lotForm.lotNo.trim()) return alert('LOT Ã«Â²ÂÃ­ÂÂ¸Ã«Â¥Â¼ Ã¬ÂÂÃ«Â Â¥Ã­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ.')
    const next = editLotId
      ? lots.map(l => l.id === editLotId ? { ...l, ...lotForm } : l)
      : [{ id: lotId(), createdAt: todayStr(), ...lotForm }, ...lots]
    saveLots(next)
    setShowLotForm(false); setLotForm(EMPTY_LOT); setEditLotId(null)
  }

  function quickLotStatus(id, status) {
    saveLots(lots.map(l => l.id === id ? { ...l, status } : l))
  }

  // Ã¢ÂÂÃ¢ÂÂ Ã­ÂÂÃ­ÂÂ° Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  const filteredLots = useMemo(() => lots.filter(l => {
    if (lotFilter !== 'all' && l.status !== lotFilter) return false
    if (lotSearch && !l.productName.toLowerCase().includes(lotSearch.toLowerCase())
      && !l.lotNo.toLowerCase().includes(lotSearch.toLowerCase())) return false
    return true
  }), [lots, lotFilter, lotSearch])

  // Ã¢ÂÂÃ¢ÂÂ Ã«Â¶ÂÃ¬ÂÂ Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  const analysis = useMemo(() => {
    const expiring30  = lots.filter(l => { const d = daysDiff(l.expiryDate); return d !== null && d >= 0 && d <= 30 && l.status === 'in_stock' })
    const expiring90  = lots.filter(l => { const d = daysDiff(l.expiryDate); return d !== null && d > 30 && d <= 90 && l.status === 'in_stock' })
    const expired     = lots.filter(l => { const d = daysDiff(l.expiryDate); return d !== null && d < 0 && l.status === 'in_stock' })
    const quarantine  = lots.filter(l => l.status === 'quarantine')
    const statusCount = {}
    Object.keys(LOT_STATUSES).forEach(k => { statusCount[k] = lots.filter(l => l.status === k).length })
    return { expiring30, expiring90, expired, quarantine, statusCount }
  }, [lots])


  const openNew = () => { setTab('lots'); setLotForm(EMPTY_LOT); setEditLotId(null); setShowLotForm(true) }

  return (
    <AppLayout user={user} title="Ã¬Â ÂÃ­ÂÂ Ã«Â³Â´Ã¬Â¡Â´ÃÂ·Ã¬Â·Â¨ÃªÂ¸Â ÃªÂ´ÂÃ«Â¦Â¬" subtitle="ISO 13485 ÃÂ§7.5.11 Ã«Â³Â´Ã¬Â¡Â´ ÃÂ· ÃÂ§7.5.2 Ã¬Â²Â­ÃªÂ²Â° ÃÂ· Ã¬ÂÂ Ã­ÂÂ¨ÃªÂ¸Â°ÃªÂ°Â Ã¬Â¶ÂÃ¬Â Â">
      <div className="px-6 lg:px-8 py-6 max-w-[1400px] mx-auto">

        <HubBanner
          title="Ã¬Â ÂÃ­ÂÂ Ã«Â³Â´Ã¬Â¡Â´ÃÂ·Ã¬Â·Â¨ÃªÂ¸Â ÃªÂ´ÂÃ«Â¦Â¬"
          subtitle="ISO 13485 ÃÂ§7.5.11 ÃÂ· Ã«Â³Â´ÃªÂ´Â Ã¬Â¡Â°ÃªÂ±Â´ ÃÂ· LOT Ã¬ÂÂ Ã­ÂÂ¨ÃªÂ¸Â°ÃªÂ°Â Ã¬Â¶ÂÃ¬Â Â"
          icon={Package2}
          color="#8B5CF6"
          workflow={['Ã«Â³Â´Ã¬Â¡Â´ Ã¬ÂÂ¬Ã¬ÂÂ Ã¬ÂÂ¤Ã¬Â Â','LOT Ã¬ÂÂ¬ÃªÂ³Â  Ã«ÂÂ±Ã«Â¡Â','Ã­ÂÂÃªÂ²Â½ÃÂ·Ã¬Â¡Â°ÃªÂ±Â´ Ã­ÂÂÃ¬ÂÂ¸','Ã¬ÂÂ Ã­ÂÂ¨ÃªÂ¸Â°ÃªÂ°Â Ã¬Â¶ÂÃ¬Â Â']}
        />

        <div className="mb-5 p-3 rounded-2xl flex items-center justify-between" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
          <div className="text-[12.5px]" style={{ color: '#1E3A8A' }}>Ã¬Â¶ÂÃ­ÂÂ Ã¬Â Â Ã¬Â ÂÃªÂ²Â ÃÂ· Ã¬ÂÂÃ¬Â ÂÃ­ÂÂ Ã¬ÂÂ¬ÃªÂ³Â  ÃÂ· Ã«Â°Â°Ã­ÂÂ¬Ã¬ÂÂ´Ã«Â Â¥Ã¬ÂÂ Ã¬ÂÂ¬ÃªÂ³Â ÃÂ·Ã¬Â¶ÂÃªÂ³Â ÃªÂ´ÂÃ«Â¦Â¬ Ã­ÂÂÃ«Â©Â´Ã¬ÂÂ¼Ã«Â¡Â Ã¬ÂÂ´Ã«ÂÂÃ­ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤.</div>
          <button onClick={() => nav('/inventory')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12.5px] font-bold"
            style={{ background: '#fff', border: '1px solid #BFDBFE', color: '#2563EB', cursor: 'pointer' }}>
            Ã¬ÂÂ¬ÃªÂ³Â ÃÂ·Ã¬Â¶ÂÃªÂ³Â ÃªÂ´ÂÃ«Â¦Â¬ Ã¬ÂÂ´Ã«ÂÂ <ArrowUpRight size={13} />
          </button>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <Kpi label="Ã¬ÂÂ¬ÃªÂ³Â  LOT" value={analysis.statusCount.in_stock || 0} />
          <Kpi label="Ã«Â§ÂÃ«Â£Â Ã¬ÂÂÃ«Â°Â (30Ã¬ÂÂ¼)" value={analysis.expiring30.length} warn={analysis.expiring30.length > 0} />
          <Kpi label="Ã¬ÂÂ Ã­ÂÂ¨ÃªÂ¸Â°ÃªÂ°Â Ã¬Â´ÂÃªÂ³Â¼" value={analysis.expired.length} bad={analysis.expired.length > 0} />
          <Kpi label="ÃªÂ²Â©Ã«Â¦Â¬ Ã¬ÂÂ¬ÃªÂ³Â " value={analysis.quarantine.length} warn={analysis.quarantine.length > 0} />
        </div>

        {/* Ã­ÂÂ­ */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-soft)' }}>
          {[
            { key: 'lots',     label: `LOT Ã¬ÂÂ¬ÃªÂ³Â  Ã­ÂÂÃ­ÂÂ© (${lots.length})` },
            { key: 'specs',    label: `Ã«Â³Â´Ã¬Â¡Â´ Ã¬ÂÂ¬Ã¬ÂÂ (${specs.length})` },
            { key: 'analysis', label: 'Ã­ÂÂÃ­ÂÂ© Ã«Â¶ÂÃ¬ÂÂ' },
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

        {/* Ã¢ÂÂÃ¢ÂÂ LOT Ã¬ÂÂ¬ÃªÂ³Â  Ã­ÂÂÃ­ÂÂ© Ã­ÂÂ­ Ã¢ÂÂÃ¢ÂÂ */}
        {tab === 'lots' && (
          <div>
            <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                <input value={lotSearch} onChange={e => setLotSearch(e.target.value)}
                  placeholder="Ã¬Â ÂÃ­ÂÂÃ«ÂªÂ / LOT ÃªÂ²ÂÃ¬ÂÂ..."
                  className="px-3 py-1.5 rounded-xl text-[13px]"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', width: 200 }} />
                <select value={lotFilter} onChange={e => setLotFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl text-[13px]"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                  <option value="all">Ã¬Â ÂÃ¬Â²Â´ Ã¬ÂÂÃ­ÂÂ</option>
                  {Object.entries(LOT_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className="text-[11.5px] px-1" style={{ color: 'var(--ink-faint)' }}>Ã¢ÂÂ¹ Ã¬ÂÂÃ¬ÂÂÃ¬Â§ÂÃ¬ÂÂ(WO) Ã¬ÂÂÃ¬ÂÂ°Ã¬ÂÂÃ«Â£Â Ã¬ÂÂ Ã¬ÂÂÃ«ÂÂ Ã«ÂÂ±Ã«Â¡ÂÃ«ÂÂ©Ã«ÂÂÃ«ÂÂ¤. Ã«ÂªÂ©Ã«Â¡ÂÃ¬ÂÂ Ã­ÂÂ­Ã«ÂªÂ©Ã¬ÂÂ Ã«ÂÂÃ«ÂÂ¬ Ã¬ÂÂÃ¬ÂÂ¸ Ã¬Â ÂÃ«Â³Â´Ã«Â¥Â¼ Ã¬ÂÂÃ¬Â ÂÃ­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ.</div>
            </div>

            {showLotForm && (
              <LotForm form={lotForm} setForm={setLotForm} specs={specs} onSave={submitLot}
                onCancel={() => { setShowLotForm(false); setLotForm(EMPTY_LOT); setEditLotId(null) }}
                isEdit={!!editLotId} />
            )}

            {filteredLots.length === 0 ? (
              <Empty icon={Archive} text="Ã«ÂÂ±Ã«Â¡ÂÃ«ÂÂ LOTÃªÂ°Â Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤." />
            ) : (
              <div className="space-y-3">
                {filteredLots.map(lot => {
                  const sm = LOT_STATUSES[lot.status] || LOT_STATUSES.in_stock
                  const d = daysDiff(lot.expiryDate)
                  const isExpired = d !== null && d < 0
                  const isNear30  = d !== null && d >= 0 && d <= 30
                  const isNear90  = d !== null && d > 30 && d <= 90
                  const spec = specs.find(s => s.id === lot.specId)
                  const storCond = STORAGE_CONDITIONS.find(c => c.key === spec?.storageCondition)

                  return (
                    <div key={lot.id} className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: `1.5px solid ${isExpired ? '#FECACA' : isNear30 ? '#FDE68A' : 'var(--line)'}` }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-[11px] font-mono" style={{ color: 'var(--ink-faint)' }}>{lot.id}</span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
                            {isExpired && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#FEE2E2', color: '#DC2626' }}>Ã¢ÂÂ  Ã¬ÂÂ Ã­ÂÂ¨ÃªÂ¸Â°ÃªÂ°Â Ã¬Â´ÂÃªÂ³Â¼</span>}
                            {isNear30  && !isExpired && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: '#D97706' }}>D-{d}</span>}
                            {isNear90  && !isNear30 && <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: '#EFF6FF', color: '#2563EB' }}>D-{d}</span>}
                            {storCond && <span className="text-[11px]">{storCond.icon} {storCond.label}</span>}
                          </div>
                          <div className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>{lot.productName}</div>
                          <div className="flex gap-3 text-[12px] flex-wrap mt-0.5" style={{ color: 'var(--ink-faint)' }}>
                            <span>LOT: <strong style={{ color: 'var(--ink)' }}>{lot.lotNo}</strong></span>
                            {lot.productCode && <span>Ã¬Â½ÂÃ«ÂÂ: {lot.productCode}</span>}
                            <span>Ã¬ÂÂÃ«ÂÂ: {lot.qty || '-'}</span>
                            {lot.storageLocation && <span>Ã¬ÂÂÃ¬Â¹Â: {lot.storageLocation}</span>}
                          </div>
                          <div className="flex gap-3 text-[11.5px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
                            <span>Ã¬Â ÂÃ¬Â¡Â°: {lot.manufacturedDate}</span>
                            {lot.expiryDate && <span style={{ color: isExpired ? '#DC2626' : isNear30 ? '#D97706' : 'var(--ink-faint)', fontWeight: isExpired || isNear30 ? 700 : 400 }}>Ã¬ÂÂ Ã­ÂÂ¨: {lot.expiryDate}</span>}
                          </div>
                          {(lot.linkedDistId) && (
                            <div className="text-[11px] mt-1 flex items-center gap-1" style={{ color: '#7C3AED' }}>
                              <Link2 size={10} /> Ã¬Â¶ÂÃ¬Â ÂÃ¬ÂÂ± {lot.linkedDistId}
                            </div>
                          )}
                        </div>
                        {canEdit && (
                          <div className="flex gap-1 flex-shrink-0 flex-col items-end">
                            <div className="flex gap-1">
                              <button onClick={() => { setLotForm({ ...EMPTY_LOT, ...lot }); setEditLotId(lot.id); setShowLotForm(true) }}
                                className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                                <Edit2 size={12} style={{ color: 'var(--ink-soft)' }} />
                              </button>
                              <button onClick={() => saveLots(lots.filter(l => l.id !== lot.id))}
                                className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', border: '1px solid #FECACA', cursor: 'pointer' }}>
                                <Trash2 size={12} style={{ color: '#DC2626' }} />
                              </button>
                            </div>
                            <div className="flex gap-1 mt-1">
                              {lot.status === 'in_stock' && <QuickBtn label="ÃªÂ²Â©Ã«Â¦Â¬" color="#D97706" onClick={() => quickLotStatus(lot.id, 'quarantine')} />}
                              {lot.status === 'in_stock' && <QuickBtn label="Ã¬Â¶ÂÃ­ÂÂ" color="#059669" onClick={() => quickLotStatus(lot.id, 'released')} />}
                              {lot.status === 'in_stock' && isExpired && <QuickBtn label="Ã­ÂÂÃªÂ¸Â°" color="#DC2626" onClick={() => quickLotStatus(lot.id, 'disposed')} />}
                              {lot.status === 'quarantine' && <QuickBtn label="Ã­ÂÂ´Ã¬Â Â" color="#2563EB" onClick={() => quickLotStatus(lot.id, 'in_stock')} />}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Ã¢ÂÂÃ¢ÂÂ Ã«Â³Â´Ã¬Â¡Â´ Ã¬ÂÂ¬Ã¬ÂÂ Ã­ÂÂ­ (Ã¬Â ÂÃ­ÂÂ ÃªÂ°ÂÃ«Â°Â Ã­ÂÂÃ«Â©Â´ Ã¬ÂÂÃ«Â Â¥ÃªÂ°ÂÃ¬ÂÂ Ã¬ÂÂ½ÃªÂ¸Â° Ã¬Â ÂÃ¬ÂÂ©Ã¬ÂÂ¼Ã«Â¡Â Ã­ÂÂÃ¬ÂÂ) Ã¢ÂÂÃ¢ÂÂ */}
        {tab === 'specs' && (
          <div>
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <div className="text-[13px]" style={{ color: 'var(--ink-soft)' }}>Ã¬Â ÂÃ­ÂÂÃ«Â³Â Ã«Â³Â´Ã¬Â¡Â´ÃÂ·Ã¬Â·Â¨ÃªÂ¸Â Ã¬Â¡Â°ÃªÂ±Â´ Ã«Â°Â Ã­ÂÂ¬Ã¬ÂÂ¥ Ã¬ÂÂ¬Ã¬ÂÂ Ã¢ÂÂ Ã¬Â ÂÃ­ÂÂ ÃªÂ°ÂÃ«Â°Â Ã­ÂÂÃ«Â©Â´Ã¬ÂÂÃ¬ÂÂ Ã¬ÂÂÃ«Â Â¥Ã­ÂÂ©Ã«ÂÂÃ«ÂÂ¤.</div>
              <button onClick={() => nav('/products?tab=product')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12.5px] font-bold"
                style={{ background: '#fff', border: '1px solid #BFDBFE', color: '#2563EB', cursor: 'pointer' }}>
                Ã¬Â ÂÃ­ÂÂ ÃªÂ°ÂÃ«Â°ÂÃ¬ÂÂÃ¬ÂÂ Ã¬ÂÂ¬Ã¬ÂÂ Ã¬ÂÂÃ«Â Â¥ <ArrowUpRight size={13} />
              </button>
            </div>

            {specs.length === 0 ? (
              <Empty icon={Package} text="Ã«Â³Â´Ã¬Â¡Â´ Ã¬ÂÂ¬Ã¬ÂÂÃ¬ÂÂ´ Ã­ÂÂÃ¬ÂÂ±Ã­ÂÂÃ«ÂÂ Ã¬Â ÂÃ­ÂÂÃ¬ÂÂ´ Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤. Ã¬Â ÂÃ­ÂÂ ÃªÂ°ÂÃ«Â°Â Ã­ÂÂÃ«Â©Â´Ã¬ÂÂÃ¬ÂÂ Ã¬ÂÂÃ«Â Â¥Ã­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {specs.map(spec => {
                  const cond = STORAGE_CONDITIONS.find(c => c.key === spec.storageCondition)
                  return (
                    <div key={spec.id} className="p-4 rounded-2xl cursor-pointer" onClick={() => nav('/products?tab=product' + (spec.productId ? '&productId=' + encodeURIComponent(spec.productId) : '') + '&detailTab=info')}
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>{spec.productName}</div>
                          <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{spec.productCode} ÃÂ· {spec.deviceClass}</div>
                        </div>
                        <ArrowUpRight size={14} style={{ color: 'var(--ink-faint)' }} />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[12px]">
                        <InfoRow icon="Ã°ÂÂÂ¡Ã¯Â¸Â" label="Ã«Â³Â´ÃªÂ´Â Ã¬Â¡Â°ÃªÂ±Â´" value={`${cond?.icon || ''} ${cond?.label || spec.storageCondition}`} />
                        {(spec.tempMin || spec.tempMax) && <InfoRow icon="Ã°ÂÂÂ¡Ã¯Â¸Â" label="Ã¬ÂÂ¨Ã«ÂÂ" value={`${spec.tempMin || '-'}~${spec.tempMax || '-'}Ã¢ÂÂ`} />}
                        {(spec.humMin || spec.humMax) && <InfoRow icon="Ã°ÂÂÂ§" label="Ã¬ÂÂµÃ«ÂÂ" value={`${spec.humMin || '-'}~${spec.humMax || '-'}%RH`} />}
                        <InfoRow icon="Ã¢ÂÂ±" label="Ã¬ÂÂ Ã­ÂÂ¨ÃªÂ¸Â°ÃªÂ°Â" value={`${spec.shelfLifeMonths}ÃªÂ°ÂÃ¬ÂÂ`} />
                        <InfoRow icon="Ã°ÂÂ§Âª" label="Ã«Â©Â¸ÃªÂ·Â " value={spec.sterility} />
                        {spec.lightSensitive && <InfoRow icon="Ã°ÂÂÂ" label="Ã¬Â°Â¨ÃªÂ´Â" value="Ã­ÂÂÃ¬ÂÂ" />}
                        {spec.shockSensitive && <InfoRow icon="Ã¢ÂÂ " label="Ã¬Â¶Â©ÃªÂ²Â©" value="Ã¬Â·Â¨Ã¬ÂÂ½ Ã¢ÂÂ Ã¬Â£Â¼Ã¬ÂÂ" />}
                        {spec.stackLimit && <InfoRow icon="Ã°ÂÂÂ¦" label="Ã¬Â ÂÃ¬ÂÂ¬ Ã­ÂÂÃªÂ³Â" value={spec.stackLimit} />}
                      </div>
                      {spec.cleanlinessReq && (
                        <div className="mt-2 px-2 py-1 rounded-lg text-[11.5px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
                          Ã¬Â²Â­ÃªÂ²Â° Ã¬ÂÂÃªÂµÂ¬Ã¬ÂÂ¬Ã­ÂÂ­: {spec.cleanlinessReq}
                        </div>
                      )}
                      {spec.handlingInstructions && (
                        <div className="mt-1 px-2 py-1 rounded-lg text-[11.5px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
                          Ã¬Â·Â¨ÃªÂ¸Â Ã¬Â§ÂÃ¬Â¹Â¨: {spec.handlingInstructions}
                        </div>
                      )}
                      {(spec.pkgCheckItems || []).length > 0 && (
                        <div className="mt-1 px-2 py-1 rounded-lg text-[11.5px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
                          Ã¬Â¶ÂÃ­ÂÂ Ã¬Â Â Ã¬Â ÂÃªÂ²Â Ã­ÂÂ­Ã«ÂªÂ© {spec.pkgCheckItems.length}ÃªÂ±Â´ Ã¬Â§ÂÃ¬Â ÂÃ«ÂÂ¨
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Ã¢ÂÂÃ¢ÂÂ Ã­ÂÂÃ­ÂÂ© Ã«Â¶ÂÃ¬ÂÂ Ã­ÂÂ­ Ã¢ÂÂÃ¢ÂÂ */}
        {tab === 'analysis' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(LOT_STATUSES).map(([k, v]) => (
                <Kpi key={k} label={v.label} value={analysis.statusCount[k] || 0}
                  bad={k === 'expired' && (analysis.statusCount[k] || 0) > 0}
                  warn={k === 'quarantine' && (analysis.statusCount[k] || 0) > 0} />
              ))}
            </div>

            {analysis.expired.length > 0 && (
              <AlertSection color="#DC2626" title={`Ã¬ÂÂ Ã­ÂÂ¨ÃªÂ¸Â°ÃªÂ°Â Ã¬Â´ÂÃªÂ³Â¼ Ã¬ÂÂ¬ÃªÂ³Â  LOT (${analysis.expired.length}ÃªÂ±Â´)`} bg="#FEF2F2" border="#FECACA">
                {analysis.expired.map(l => (
                  <div key={l.id} className="text-[12px] py-1" style={{ color: '#7F1D1D' }}>Ã¢ÂÂ¢ {l.lotNo} Ã¢ÂÂ {l.productName} (Ã«Â§ÂÃ«Â£Â: {l.expiryDate})</div>
                ))}
              </AlertSection>
            )}

            {analysis.expiring30.length > 0 && (
              <AlertSection color="#D97706" title={`30Ã¬ÂÂ¼ Ã«ÂÂ´ Ã«Â§ÂÃ«Â£Â Ã¬ÂÂÃ«Â°Â LOT (${analysis.expiring30.length}ÃªÂ±Â´)`} bg="#FFFBEB" border="#FDE68A">
                {analysis.expiring30.map(l => {
                  const d = daysDiff(l.expiryDate)
                  return (
                    <div key={l.id} className="text-[12px] py-1" style={{ color: '#78350F' }}>Ã¢ÂÂ¢ {l.lotNo} Ã¢ÂÂ {l.productName} ÃÂ· D-{d} ÃÂ· Ã¬ÂÂÃ¬Â¹Â: {l.storageLocation || '-'}</div>
                  )
                })}
              </AlertSection>
            )}

            {analysis.expiring90.length > 0 && (
              <AlertSection color="#2563EB" title={`90Ã¬ÂÂ¼ Ã«ÂÂ´ Ã«Â§ÂÃ«Â£Â Ã¬ÂÂÃ¬Â Â LOT (${analysis.expiring90.length}ÃªÂ±Â´)`} bg="#EFF6FF" border="#BFDBFE">
                {analysis.expiring90.map(l => {
                  const d = daysDiff(l.expiryDate)
                  return (
                    <div key={l.id} className="text-[12px] py-1" style={{ color: '#1E3A8A' }}>Ã¢ÂÂ¢ {l.lotNo} Ã¢ÂÂ {l.productName} ÃÂ· D-{d}</div>
                  )
                })}
              </AlertSection>
            )}

          </div>
        )}
      </div>
    </AppLayout>
  )
}


// Ã¢ÂÂÃ¢ÂÂ LOT Ã­ÂÂ¼ Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
function LotForm({ form, setForm, specs, onSave, onCancel, isEdit }) {
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const selectedSpec = specs.find(s => s.id === form.specId)
  return (
    <div className="mb-5 p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>{isEdit ? 'LOT Ã¬ÂÂÃ¬Â Â' : 'LOT Ã«ÂÂ±Ã«Â¡Â'}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <Field label="Ã¬Â ÂÃ­ÂÂÃ«ÂªÂ *" value={form.productName} onChange={v => F('productName', v)} />
        <Field label="Ã¬Â ÂÃ­ÂÂ Ã¬Â½ÂÃ«ÂÂ" value={form.productCode} onChange={v => F('productCode', v)} />
        <Field label="LOT Ã«Â²ÂÃ­ÂÂ¸ *" value={form.lotNo} onChange={v => F('lotNo', v)} />
        <Field label="Ã¬ÂÂÃ«ÂÂ" value={form.qty} onChange={v => F('qty', v)} />
        <Field label="Ã¬Â ÂÃ¬Â¡Â°Ã¬ÂÂ¼" type="date" value={form.manufacturedDate} onChange={v => F('manufacturedDate', v)} />
        <Field label="Ã¬ÂÂ Ã­ÂÂ¨ÃªÂ¸Â°ÃªÂ°Â" type="date" value={form.expiryDate} onChange={v => F('expiryDate', v)} />
        <Field label="Ã«Â³Â´ÃªÂ´Â Ã¬ÂÂÃ¬Â¹Â" value={form.storageLocation} onChange={v => F('storageLocation', v)} placeholder="Ã¬Â°Â½ÃªÂ³Â  A-3" />
        <FieldSelect label="Ã«Â³Â´Ã¬Â¡Â´ Ã¬ÂÂ¬Ã¬ÂÂ Ã¬ÂÂ°ÃªÂ²Â°" value={form.specId} onChange={v => {
          const s = specs.find(x => x.id === v)
          setForm(f => ({ ...f, specId: v, productName: s ? s.productName : f.productName, productCode: s ? s.productCode : f.productCode }))
        }} options={[{ value: '', label: 'Ã¬ÂÂ Ã­ÂÂ Ã¬ÂÂ Ã­ÂÂ¨' }, ...specs.map(s => ({ value: s.id, label: `${s.productName} (${s.productCode})` }))]} />
        <FieldSelect label="Ã¬ÂÂÃ­ÂÂ" value={form.status} onChange={v => F('status', v)}
          options={Object.entries(LOT_STATUSES).map(([k, v]) => ({ value: k, label: v.label }))} />
        <Field label="Ã¬ÂÂ°ÃªÂ²Â° Ã¬Â¶ÂÃ¬Â ÂÃ¬ÂÂ± ID" value={form.linkedDistId} onChange={v => F('linkedDistId', v)} placeholder="DST-xxxx" />
      </div>
      {selectedSpec && (
        <div className="mb-3 px-3 py-2 rounded-xl text-[12px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
          ?? Ã«Â³Â´Ã¬Â¡Â´ Ã¬Â¡Â°ÃªÂ±Â´: {STORAGE_CONDITIONS.find(c => c.key === selectedSpec.storageCondition)?.label} ÃÂ· Ã¬ÂÂ Ã­ÂÂ¨ÃªÂ¸Â°ÃªÂ°Â {selectedSpec.shelfLifeMonths}ÃªÂ°ÂÃ¬ÂÂ
          {selectedSpec.tempMin && ` ÃÂ· Ã¬ÂÂ¨Ã«ÂÂ ${selectedSpec.tempMin}~${selectedSpec.tempMax}Ã¢ÂÂ`}
        </div>
      )}
      <FieldArea label="Ã«Â¹ÂÃªÂ³Â " value={form.notes} onChange={v => F('notes', v)} rows={2} />
      <div className="flex gap-2 mt-3">
        <button onClick={onSave} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
          style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}><Save size={13} /> Ã¬Â ÂÃ¬ÂÂ¥</button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-[13px]"
          style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>Ã¬Â·Â¨Ã¬ÂÂ</button>
      </div>
    </div>
  )
}

// Ã¢ÂÂÃ¢ÂÂ Ã¬Â¶ÂÃ­ÂÂ Ã¬Â Â Ã¬Â ÂÃªÂ²Â Ã­ÂÂ¼ Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
// Ã¢ÂÂÃ¢ÂÂ ÃªÂ³ÂµÃ¬ÂÂ© Ã¬Â»Â´Ã­ÂÂ¬Ã«ÂÂÃ­ÂÂ¸ Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
function Kpi({ label, value, good, warn, bad }) {
  const color  = bad ? '#DC2626' : warn ? '#D97706' : good ? '#059669' : 'var(--ink)'
  const bg     = bad ? '#FEE2E2' : warn ? '#FEF3C7' : good ? '#D1FAE5' : 'var(--bg-card)'
  const border = bad ? '#FECACA' : warn ? '#FDE68A' : good ? '#A7F3D0' : 'var(--line)'
  return (
    <div className="p-4 rounded-2xl text-center" style={{ background: bg, border: `1px solid ${border}` }}>
      <div className="text-[26px] font-bold" style={{ color }}>{value}</div>
      <div className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>{label}</div>
    </div>
  )
}

function QuickBtn({ label, color, onClick }) {
  return (
    <button onClick={onClick} className="px-2 py-0.5 rounded-lg text-[11px] font-bold"
      style={{ background: `${color}15`, border: `1px solid ${color}40`, color, cursor: 'pointer' }}>
      {label}
    </button>
  )
}

function Empty({ icon: Icon, text }) {
  return (
    <div className="text-center py-20" style={{ color: 'var(--ink-faint)' }}>
      <Icon size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
      <div className="text-[14px]">{text}</div>
    </div>
  )
}

function AlertSection({ color, title, bg, border, children }) {
  return (
    <div className="p-5 rounded-2xl" style={{ background: bg, border: `1px solid ${border}` }}>
      <div className="text-[13px] font-bold mb-2" style={{ color }}>{title}</div>
      {children}
    </div>
  )
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-1.5">
      <span>{icon}</span>
      <span style={{ color: 'var(--ink-faint)' }}>{label}:</span>
      <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{value}</span>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder, list, listOptions }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} list={list}
        className="w-full px-3 py-1.5 rounded-xl text-[13px]"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
      {list && listOptions && <datalist id={list}>{listOptions.map(n => <option key={n} value={n} />)}</datalist>}
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
