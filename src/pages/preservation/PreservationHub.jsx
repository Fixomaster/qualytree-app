// src/pages/preservation/PreservationHub.jsx
// ISO 13485 Â§7.5.11 ì í ë³´ì¡´Â·ì·¨ê¸ + Â§7.5.2 ì í ì²­ê²°
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
let _sbCidPres = null
import { onboarding } from '../../lib/onboardingState'
import { STORAGE_CONDITIONS, derivePreservationSpecs } from '../../lib/preservationSpecConstants'

// ââ ìì âââââââââââââââââââââââââââââââââââââââââââââââââââââ
const LS_LOTS   = 'qualytree.preservation_lots'    // LOTë³ ì í¨ê¸°ê° ì¬ê³ 

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
  in_stock:   { label: 'ì¬ê³ ',   color: '#2563EB', bg: '#EFF6FF' },
  quarantine: { label: 'ê²©ë¦¬',   color: '#D97706', bg: '#FEF3C7' },
  released:   { label: 'ì¶í',   color: '#059669', bg: '#D1FAE5' },
  expired:    { label: 'ë§ë£',   color: '#DC2626', bg: '#FEE2E2' },
  disposed:   { label: 'íê¸°',   color: '#9CA3AF', bg: '#F3F4F6' },
}

// ââ ë©ì¸ âââââââââââââââââââââââââââââââââââââââââââââââââââââ
export default function PreservationHub() {
  const user = auth.current()
  const companyId = user?.company_id
  const canEdit = user?.level >= 2
  const nav = useNavigate()

  // ë³´ì¡´ ì¬ìì ì í ê°ë° íë©´(ProductsHub)ìì ìë ¥íë ê°ì ì½ê¸° ì ì©ì¼ë¡ íìí©ëë¤ (SSoT).
  const specs = useMemo(() => derivePreservationSpecs(onboarding.load()?.products || []), [])
  const [lots,   setLots]   = useState(() => { try { return JSON.parse(localStorage.getItem(LS_LOTS)   || '[]') } catch { return [] } })

  const [tab, setTab] = useState('lots')   // lots | specs | analysis

  // LOT ìí
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

  // ââ LOT CRUD âââââââââââââââââââââââââââââââââââââââââââââ
  function submitLot() {
    if (!lotForm.productName.trim()) return alert('ì íëªì ìë ¥íì¸ì.')
    if (!lotForm.lotNo.trim()) return alert('LOT ë²í¸ë¥¼ ìë ¥íì¸ì.')
    const next = editLotId
      ? lots.map(l => l.id === editLotId ? { ...l, ...lotForm } : l)
      : [{ id: lotId(), createdAt: todayStr(), ...lotForm }, ...lots]
    saveLots(next)
    setShowLotForm(false); setLotForm(EMPTY_LOT); setEditLotId(null)
  }

  function quickLotStatus(id, status) {
    saveLots(lots.map(l => l.id === id ? { ...l, status } : l))
  }

  // ââ íí° âââââââââââââââââââââââââââââââââââââââââââââââââ
  const filteredLots = useMemo(() => lots.filter(l => {
    if (lotFilter !== 'all' && l.status !== lotFilter) return false
    if (lotSearch && !l.productName.toLowerCase().includes(lotSearch.toLowerCase())
      && !l.lotNo.toLowerCase().includes(lotSearch.toLowerCase())) return false
    return true
  }), [lots, lotFilter, lotSearch])

  // ââ ë¶ì âââââââââââââââââââââââââââââââââââââââââââââââââ
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
    <AppLayout user={user} title="ì í ë³´ì¡´Â·ì·¨ê¸ ê´ë¦¬" subtitle="ISO 13485 Â§7.5.11 ë³´ì¡´ Â· Â§7.5.2 ì²­ê²° Â· ì í¨ê¸°ê° ì¶ì ">
      <div className="px-6 lg:px-8 py-6 max-w-[1400px] mx-auto">

        <HubBanner
          title="ì í ë³´ì¡´Â·ì·¨ê¸ ê´ë¦¬"
          subtitle="ISO 13485 Â§7.5.11 Â· ë³´ê´ ì¡°ê±´ Â· LOT ì í¨ê¸°ê° ì¶ì "
          icon={Package2}
          color="#8B5CF6"
          workflow={['ë³´ì¡´ ì¬ì ì¤ì ','LOT ì¬ê³  ë±ë¡','íê²½Â·ì¡°ê±´ íì¸','ì í¨ê¸°ê° ì¶ì ']}
        />

        <div className="mb-5 p-3 rounded-2xl flex items-center justify-between" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
          <div className="text-[12.5px]" style={{ color: '#1E3A8A' }}>ì¶í ì  ì ê² Â· ìì í ì¬ê³  Â· ë°°í¬ì´ë ¥ì ì¬ê³ Â·ì¶ê³ ê´ë¦¬ íë©´ì¼ë¡ ì´ëíìµëë¤.</div>
          <button onClick={() => nav('/inventory')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12.5px] font-bold"
            style={{ background: '#fff', border: '1px solid #BFDBFE', color: '#2563EB', cursor: 'pointer' }}>
            ì¬ê³ Â·ì¶ê³ ê´ë¦¬ ì´ë <ArrowUpRight size={13} />
          </button>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <Kpi label="ì¬ê³  LOT" value={analysis.statusCount.in_stock || 0} />
          <Kpi label="ë§ë£ ìë° (30ì¼)" value={analysis.expiring30.length} warn={analysis.expiring30.length > 0} />
          <Kpi label="ì í¨ê¸°ê° ì´ê³¼" value={analysis.expired.length} bad={analysis.expired.length > 0} />
          <Kpi label="ê²©ë¦¬ ì¬ê³ " value={analysis.quarantine.length} warn={analysis.quarantine.length > 0} />
        </div>

        {/* í­ */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-soft)' }}>
          {[
            { key: 'lots',     label: `LOT ì¬ê³  íí© (${lots.length})` },
            { key: 'specs',    label: `ë³´ì¡´ ì¬ì (${specs.length})` },
            { key: 'analysis', label: 'íí© ë¶ì' },
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

        {/* ââ LOT ì¬ê³  íí© í­ ââ */}
        {tab === 'lots' && (
          <div>
            <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                <input value={lotSearch} onChange={e => setLotSearch(e.target.value)}
                  placeholder="ì íëª / LOT ê²ì..."
                  className="px-3 py-1.5 rounded-xl text-[13px]"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', width: 200 }} />
                <select value={lotFilter} onChange={e => setLotFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl text-[13px]"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                  <option value="all">ì ì²´ ìí</option>
                  {Object.entries(LOT_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className="text-[11.5px] px-1" style={{ color: 'var(--ink-faint)' }}>â¹ ììì§ì(WO) ìì°ìë£ ì ìë ë±ë¡ë©ëë¤. ëª©ë¡ì í­ëª©ì ëë¬ ìì¸ ì ë³´ë¥¼ ìì íì¸ì.</div>
            </div>

            {showLotForm && (
              <LotForm form={lotForm} setForm={setLotForm} specs={specs} onSave={submitLot}
                onCancel={() => { setShowLotForm(false); setLotForm(EMPTY_LOT); setEditLotId(null) }}
                isEdit={!!editLotId} />
            )}

            {filteredLots.length === 0 ? (
              <Empty icon={Archive} text="ë±ë¡ë LOTê° ììµëë¤." />
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
                            {isExpired && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#FEE2E2', color: '#DC2626' }}>â  ì í¨ê¸°ê° ì´ê³¼</span>}
                            {isNear30  && !isExpired && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: '#D97706' }}>D-{d}</span>}
                            {isNear90  && !isNear30 && <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: '#EFF6FF', color: '#2563EB' }}>D-{d}</span>}
                            {storCond && <span className="text-[11px]">{storCond.icon} {storCond.label}</span>}
                          </div>
                          <div className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>{lot.productName}</div>
                          <div className="flex gap-3 text-[12px] flex-wrap mt-0.5" style={{ color: 'var(--ink-faint)' }}>
                            <span>LOT: <strong style={{ color: 'var(--ink)' }}>{lot.lotNo}</strong></span>
                            {lot.productCode && <span>ì½ë: {lot.productCode}</span>}
                            <span>ìë: {lot.qty || '-'}</span>
                            {lot.storageLocation && <span>ìì¹: {lot.storageLocation}</span>}
                          </div>
                          <div className="flex gap-3 text-[11.5px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
                            <span>ì ì¡°: {lot.manufacturedDate}</span>
                            {lot.expiryDate && <span style={{ color: isExpired ? '#DC2626' : isNear30 ? '#D97706' : 'var(--ink-faint)', fontWeight: isExpired || isNear30 ? 700 : 400 }}>ì í¨: {lot.expiryDate}</span>}
                          </div>
                          {(lot.linkedDistId) && (
                            <div className="text-[11px] mt-1 flex items-center gap-1" style={{ color: '#7C3AED' }}>
                              <Link2 size={10} /> ì¶ì ì± {lot.linkedDistId}
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
                              {lot.status === 'in_stock' && <QuickBtn label="ê²©ë¦¬" color="#D97706" onClick={() => quickLotStatus(lot.id, 'quarantine')} />}
                              {lot.status === 'in_stock' && <QuickBtn label="ì¶í" color="#059669" onClick={() => quickLotStatus(lot.id, 'released')} />}
                              {lot.status === 'in_stock' && isExpired && <QuickBtn label="íê¸°" color="#DC2626" onClick={() => quickLotStatus(lot.id, 'disposed')} />}
                              {lot.status === 'quarantine' && <QuickBtn label="í´ì " color="#2563EB" onClick={() => quickLotStatus(lot.id, 'in_stock')} />}
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

        {/* ââ ë³´ì¡´ ì¬ì í­ (ì í ê°ë° íë©´ ìë ¥ê°ì ì½ê¸° ì ì©ì¼ë¡ íì) ââ */}
        {tab === 'specs' && (
          <div>
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <div className="text-[13px]" style={{ color: 'var(--ink-soft)' }}>ì íë³ ë³´ì¡´Â·ì·¨ê¸ ì¡°ê±´ ë° í¬ì¥ ì¬ì â ì í ê°ë° íë©´ìì ìë ¥í©ëë¤.</div>
              <button onClick={() => nav('/products?tab=product')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12.5px] font-bold"
                style={{ background: '#fff', border: '1px solid #BFDBFE', color: '#2563EB', cursor: 'pointer' }}>
                ì í ê°ë°ìì ì¬ì ìë ¥ <ArrowUpRight size={13} />
              </button>
            </div>

            {specs.length === 0 ? (
              <Empty icon={Package} text="ë³´ì¡´ ì¬ìì´ íì±íë ì íì´ ììµëë¤. ì í ê°ë° íë©´ìì ìë ¥íì¸ì." />
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
                          <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{spec.productCode} Â· {spec.deviceClass}</div>
                        </div>
                        <ArrowUpRight size={14} style={{ color: 'var(--ink-faint)' }} />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[12px]">
                        <InfoRow icon="ð¡ï¸" label="ë³´ê´ ì¡°ê±´" value={`${cond?.icon || ''} ${cond?.label || spec.storageCondition}`} />
                        {(spec.tempMin || spec.tempMax) && <InfoRow icon="ð¡ï¸" label="ì¨ë" value={`${spec.tempMin || '-'}~${spec.tempMax || '-'}â`} />}
                        {(spec.humMin || spec.humMax) && <InfoRow icon="ð§" label="ìµë" value={`${spec.humMin || '-'}~${spec.humMax || '-'}%RH`} />}
                        <InfoRow icon="â±" label="ì í¨ê¸°ê°" value={`${spec.shelfLifeMonths}ê°ì`} />
                        <InfoRow icon="ð§ª" label="ë©¸ê· " value={spec.sterility} />
                        {spec.lightSensitive && <InfoRow icon="ð" label="ì°¨ê´" value="íì" />}
                        {spec.shockSensitive && <InfoRow icon="â " label="ì¶©ê²©" value="ì·¨ì½ â ì£¼ì" />}
                        {spec.stackLimit && <InfoRow icon="ð¦" label="ì ì¬ íê³" value={spec.stackLimit} />}
                      </div>
                      {spec.cleanlinessReq && (
                        <div className="mt-2 px-2 py-1 rounded-lg text-[11.5px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
                          ì²­ê²° ìêµ¬ì¬í­: {spec.cleanlinessReq}
                        </div>
                      )}
                      {spec.handlingInstructions && (
                        <div className="mt-1 px-2 py-1 rounded-lg text-[11.5px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
                          ì·¨ê¸ ì§ì¹¨: {spec.handlingInstructions}
                        </div>
                      )}
                      {(spec.pkgCheckItems || []).length > 0 && (
                        <div className="mt-1 px-2 py-1 rounded-lg text-[11.5px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
                          ì¶í ì  ì ê² í­ëª© {spec.pkgCheckItems.length}ê±´ ì§ì ë¨
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ââ íí© ë¶ì í­ ââ */}
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
              <AlertSection color="#DC2626" title={`ì í¨ê¸°ê° ì´ê³¼ ì¬ê³  LOT (${analysis.expired.length}ê±´)`} bg="#FEF2F2" border="#FECACA">
                {analysis.expired.map(l => (
                  <div key={l.id} className="text-[12px] py-1" style={{ color: '#7F1D1D' }}>â¢ {l.lotNo} â {l.productName} (ë§ë£: {l.expiryDate})</div>
                ))}
              </AlertSection>
            )}

            {analysis.expiring30.length > 0 && (
              <AlertSection color="#D97706" title={`30ì¼ ë´ ë§ë£ ìë° LOT (${analysis.expiring30.length}ê±´)`} bg="#FFFBEB" border="#FDE68A">
                {analysis.expiring30.map(l => {
                  const d = daysDiff(l.expiryDate)
                  return (
                    <div key={l.id} className="text-[12px] py-1" style={{ color: '#78350F' }}>â¢ {l.lotNo} â {l.productName} Â· D-{d} Â· ìì¹: {l.storageLocation || '-'}</div>
                  )
                })}
              </AlertSection>
            )}

            {analysis.expiring90.length > 0 && (
              <AlertSection color="#2563EB" title={`90ì¼ ë´ ë§ë£ ìì  LOT (${analysis.expiring90.length}ê±´)`} bg="#EFF6FF" border="#BFDBFE">
                {analysis.expiring90.map(l => {
                  const d = daysDiff(l.expiryDate)
                  return (
                    <div key={l.id} className="text-[12px] py-1" style={{ color: '#1E3A8A' }}>â¢ {l.lotNo} â {l.productName} Â· D-{d}</div>
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


// ââ LOT í¼ âââââââââââââââââââââââââââââââââââââââââââââââââââ
function LotForm({ form, setForm, specs, onSave, onCancel, isEdit }) {
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const selectedSpec = specs.find(s => s.id === form.specId)
  return (
    <div className="mb-5 p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>{isEdit ? 'LOT ìì ' : 'LOT ë±ë¡'}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <Field label="ì íëª *" value={form.productName} onChange={v => F('productName', v)} />
        <Field label="ì í ì½ë" value={form.productCode} onChange={v => F('productCode', v)} />
        <Field label="LOT ë²í¸ *" value={form.lotNo} onChange={v => F('lotNo', v)} />
        <Field label="ìë" value={form.qty} onChange={v => F('qty', v)} />
        <Field label="ì ì¡°ì¼" type="date" value={form.manufacturedDate} onChange={v => F('manufacturedDate', v)} />
        <Field label="ì í¨ê¸°ê°" type="date" value={form.expiryDate} onChange={v => F('expiryDate', v)} />
        <Field label="ë³´ê´ ìì¹" value={form.storageLocation} onChange={v => F('storageLocation', v)} placeholder="ì°½ê³  A-3" />
        <FieldSelect label="ë³´ì¡´ ì¬ì ì°ê²°" value={form.specId} onChange={v => {
          const s = specs.find(x => x.id === v)
          setForm(f => ({ ...f, specId: v, productName: s ? s.productName : f.productName, productCode: s ? s.productCode : f.productCode }))
        }} options={[{ value: '', label: 'ì í ì í¨' }, ...specs.map(s => ({ value: s.id, label: `${s.productName} (${s.productCode})` }))]} />
        <FieldSelect label="ìí" value={form.status} onChange={v => F('status', v)}
          options={Object.entries(LOT_STATUSES).map(([k, v]) => ({ value: k, label: v.label }))} />
        <Field label="ì°ê²° ì¶ì ì± ID" value={form.linkedDistId} onChange={v => F('linkedDistId', v)} placeholder="DST-xxxx" />
      </div>
      {selectedSpec && (
        <div className="mb-3 px-3 py-2 rounded-xl text-[12px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
          ?? ë³´ì¡´ ì¡°ê±´: {STORAGE_CONDITIONS.find(c => c.key === selectedSpec.storageCondition)?.label} Â· ì í¨ê¸°ê° {selectedSpec.shelfLifeMonths}ê°ì
          {selectedSpec.tempMin && ` Â· ì¨ë ${selectedSpec.tempMin}~${selectedSpec.tempMax}â`}
        </div>
      )}
      <FieldArea label="ë¹ê³ " value={form.notes} onChange={v => F('notes', v)} rows={2} />
      <div className="flex gap-2 mt-3">
        <button onClick={onSave} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
          style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}><Save size={13} /> ì ì¥</button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-[13px]"
          style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>ì·¨ì</button>
      </div>
    </div>
  )
}

// ââ ì¶í ì  ì ê² í¼ âââââââââââââââââââââââââââââââââââââââââââ
// ââ ê³µì© ì»´í¬ëí¸ âââââââââââââââââââââââââââââââââââââââââââââ
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
