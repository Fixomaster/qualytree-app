// src/pages/workenv/WorkEnvHub.jsx
// ISO 13485 Â§6.4 ììíê²½ ê´ë¦¬ â ì ì¡° êµ¬ì­ë³ íê²½ ëª¨ëí°ë§Â·ì´í ê°ì§Â·NCR ì°ë
import React, { useState, useMemo } from 'react'
import {
  Plus, Search, Trash2, X, Edit3, ChevronDown, ChevronUp,
  Thermometer, Droplets, Wind, Activity, AlertTriangle,
  CheckCircle2, XCircle, TrendingUp, BarChart2, MapPin,
  Settings, Clock,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'

// ââ localStorage ââââââââââââââââââââââââââââââââââââââââââââââ
const LS_LOG  = 'qualytree.env_logs'
const LS_ZONE = 'qualytree.env_zones'
function lsR(k) { try { return JSON.parse(localStorage.getItem(k) || '[]') } catch { return [] } }
function lsW(k, d) { localStorage.setItem(k, JSON.stringify(d)) }
function genLogId()  { return `ENV-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }
function genZoneId() { return `ZON-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }

// ââ ìì âââââââââââââââââââââââââââââââââââââââââââââââââââââ
const PARAM_DEFS = [
  { key: 'temp',     label: 'ì¨ë',     unit: 'Â°C',     icon: Thermometer, color: '#EF4444', defaultMin: 18, defaultMax: 26 },
  { key: 'humidity', label: 'ìµë',     unit: '%RH',    icon: Droplets,    color: '#3B82F6', defaultMin: 40, defaultMax: 65 },
  { key: 'particle', label: 'íí°í´(â¥0.5Î¼m)', unit: 'ê°/mÂ³', icon: Wind, color: '#8B5CF6', defaultMin: 0, defaultMax: 352000 },
  { key: 'pressure', label: 'ì°¨ì',     unit: 'Pa',     icon: Activity,    color: '#059669', defaultMin: 5, defaultMax: 20 },
]

const CLEAN_CLASSES = [
  { value: 'ISO5',   label: 'ISO 5 (Class 100)',    color: '#DC2626' },
  { value: 'ISO6',   label: 'ISO 6 (Class 1000)',   color: '#D97706' },
  { value: 'ISO7',   label: 'ISO 7 (Class 10000)',  color: '#2563EB' },
  { value: 'ISO8',   label: 'ISO 8 (Class 100000)', color: '#059669' },
  { value: 'CDA',    label: 'ì¼ë° ì ì¡° êµ¬ì­ (CDA)', color: '#6B7280' },
  { value: 'none',   label: 'ì²­ì ë ë¯¸ë¶ë¥',         color: '#9CA3AF' },
]

const emptyZone = () => ({
  name: '', location: '', cleanClass: 'CDA', description: '',
  tempMin: 18, tempMax: 26, humMin: 40, humMax: 65,
  partMax: 352000, pressMin: 5, pressMax: 20,
  monitorFreq: 'daily', active: true,
})

const emptyLog = () => ({
  zoneId: '', measuredAt: new Date().toISOString().slice(0, 16),
  measuredBy: '',
  temp: '', humidity: '', particle: '', pressure: '',
  ncrId: '', notes: '', deviations: [],
})

// ì´í íì 
function calcDeviations(log, zone) {
  if (!zone) return []
  const devs = []
  if (log.temp !== '' && log.temp !== null && log.temp !== undefined) {
    const v = parseFloat(log.temp)
    if (!isNaN(v) && (v < zone.tempMin || v > zone.tempMax))
      devs.push({ param: 'ì¨ë', value: `${v}Â°C`, limit: `${zone.tempMin}~${zone.tempMax}Â°C` })
  }
  if (log.humidity !== '' && log.humidity !== null) {
    const v = parseFloat(log.humidity)
    if (!isNaN(v) && (v < zone.humMin || v > zone.humMax))
      devs.push({ param: 'ìµë', value: `${v}%RH`, limit: `${zone.humMin}~${zone.humMax}%RH` })
  }
  if (log.particle !== '' && log.particle !== null) {
    const v = parseFloat(log.particle)
    if (!isNaN(v) && v > zone.partMax)
      devs.push({ param: 'íí°í´', value: `${v.toLocaleString()}ê°/mÂ³`, limit: `â¤${zone.partMax.toLocaleString()}ê°/mÂ³` })
  }
  if (log.pressure !== '' && log.pressure !== null) {
    const v = parseFloat(log.pressure)
    if (!isNaN(v) && (v < zone.pressMin || v > zone.pressMax))
      devs.push({ param: 'ì°¨ì', value: `${v}Pa`, limit: `${zone.pressMin}~${zone.pressMax}Pa` })
  }
  return devs
}

// ââ ë©ì¸ âââââââââââââââââââââââââââââââââââââââââââââââââââââ
export default function WorkEnvHub() {
  const user = auth.current()
  const [logs, setLogs]   = useState(() => lsR(LS_LOG))
  const [zones, setZones] = useState(() => lsR(LS_ZONE))
  const [tab, setTab]     = useState('logs')
  const [search, setSearch]         = useState('')
  const [zoneFilter, setZoneFilter] = useState('all')
  const [deviOnly, setDeviOnly]     = useState(false)
  const [showLogForm, setShowLogForm]   = useState(false)
  const [showZoneForm, setShowZoneForm] = useState(false)
  const [logForm, setLogForm]   = useState(emptyLog())
  const [zoneForm, setZoneForm] = useState(emptyZone())
  const [editLogId, setEditLogId]   = useState(null)
  const [editZoneId, setEditZoneId] = useState(null)
  const [expanded, setExpanded]     = useState(null)

  const saveLogs  = d => { setLogs(d); lsW(LS_LOG, d) }
  const saveZones = d => { setZones(d); lsW(LS_ZONE, d) }

  const openNewLog  = () => { setLogForm(emptyLog()); setEditLogId(null); setShowLogForm(true) }
  const openEditLog = r  => { setLogForm({ ...r }); setEditLogId(r.id); setShowLogForm(true) }
  const openNewZone = ()  => { setZoneForm(emptyZone()); setEditZoneId(null); setShowZoneForm(true) }
  const openEditZone = z  => { setZoneForm({ ...z }); setEditZoneId(z.id); setShowZoneForm(true) }
  const removeLog  = id => { if (!confirm('ì­ì ?')) return; saveLogs(logs.filter(l => l.id !== id)) }
  const removeZone = id => { if (!confirm('êµ¬ì­ ì­ì  ì ê´ë ¨ ê¸°ë¡ì ì ì§ë©ëë¤. ì­ì ?')) return; saveZones(zones.filter(z => z.id !== id)) }
  const lfld = (k, v) => setLogForm(f => ({ ...f, [k]: v }))
  const zfld = (k, v) => setZoneForm(f => ({ ...f, [k]: v }))

  const submitLog = () => {
    if (!logForm.zoneId)
      return alert('ì¸¡ì  êµ¬ì­ì íììëë¤.')
    const zone = zones.find(z => z.id === logForm.zoneId)
    const deviations = calcDeviations(logForm, zone)
    const now = new Date().toISOString()
    /* #270: ì¸¡ì ì â ë¡ê·¸ì¸ë ì¬ì©ì ìë ì¤ì  */
    const entry = { ...logForm, measuredBy: user?.name || logForm.measuredBy || '-', deviations, id: editLogId || genLogId(), createdAt: now, createdBy: user?.name || '-' }
    if (editLogId) saveLogs(logs.map(l => l.id === editLogId ? entry : l))
    else saveLogs([entry, ...logs])
    setShowLogForm(false)
  }

  const submitZone = () => {
    if (!zoneForm.name) return alert('êµ¬ì­ ì´ë¦ì íììëë¤.')
    const now = new Date().toISOString()
    if (editZoneId) saveZones(zones.map(z => z.id === editZoneId ? { ...zoneForm, id: editZoneId } : z))
    else saveZones([{ ...zoneForm, id: genZoneId(), createdAt: now }, ...zones])
    setShowZoneForm(false)
  }

  // íí°
  const filtered = useMemo(() => {
    let list = [...logs]
    if (zoneFilter !== 'all') list = list.filter(l => l.zoneId === zoneFilter)
    if (deviOnly) list = list.filter(l => (l.deviations || []).length > 0)
    if (search) {
      const q = search.toLowerCase()
      const zone = zones.find(z => z.name.toLowerCase().includes(q))
      list = list.filter(l => (l.id + l.measuredBy + l.notes).toLowerCase().includes(q) || (zone && l.zoneId === zone.id))
    }
    return list.sort((a, b) => (b.measuredAt || b.createdAt || '').localeCompare(a.measuredAt || a.createdAt || ''))
  }, [logs, zoneFilter, deviOnly, search, zones])

  // ì§ê³
  const totalLogs   = logs.length
  const deviCount   = logs.filter(l => (l.deviations || []).length > 0).length
  const deviNoNcr   = logs.filter(l => (l.deviations || []).length > 0 && !l.ncrId)
  const todayLogs   = logs.filter(l => (l.measuredAt || '').startsWith(new Date().toISOString().slice(0, 10))).length
  const activeZones = zones.filter(z => z.active !== false).length

  const TABS = [
    { key: 'logs',     label: 'ëª¨ëí°ë§ ê¸°ë¡',  icon: Activity },
    { key: 'zones',    label: 'êµ¬ì­ ê´ë¦¬',      icon: MapPin },
    { key: 'analysis', label: 'íí© ë¶ì',      icon: BarChart2 },
  ]

  return (
    <AppLayout user={user} title="ììíê²½ ê´ë¦¬" subtitle="ISO 13485 Â§6.4 Â· ì ì¡° êµ¬ì­ íê²½ ëª¨ëí°ë§ Â· ì´í ê°ì§ Â· NCR ì°ë">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto">

        {/* ì´í ìë¦¼ ë°°ë */}
        {deviNoNcr.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-5" style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}>
            <AlertTriangle size={14} style={{ color: '#DC2626' }} />
            <span className="text-[13px] font-semibold" style={{ color: '#991B1B' }}>
              íê²½ ì´í {deviNoNcr.length}ê±´ â NCR ë¯¸ë±ë¡. íì§íë¸ìì NCR ë±ë¡ íì.
            </span>
          </div>
        )}

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'ê´ë¦¬ êµ¬ì­',   count: activeZones,  color: '#2563EB' },
            { label: 'ì ì²´ ê¸°ë¡',   count: totalLogs,    color: '#6B7280' },
            { label: 'ì¤ë ì¸¡ì ',   count: todayLogs,    color: '#059669' },
            { label: 'ì´í ë°ì',   count: deviCount,    color: '#DC2626' },
            { label: 'NCR ë¯¸ë±ë¡',  count: deviNoNcr.length, color: deviNoNcr.length > 0 ? '#DC2626' : '#059669' },
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

        {/* ââ ëª¨ëí°ë§ ê¸°ë¡ í­ ââ */}
        {tab === 'logs' && (
          <>
            <div className="flex gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-[160px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                <Search size={14} style={{ color: 'var(--ink-faint)' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="êµ¬ì­ëªÂ·ì¸¡ì ì ê²ì..." className="flex-1 text-[13px] outline-none" style={{ background: 'none', border: 'none', color: 'var(--ink)' }} />
              </div>
              <select value={zoneFilter} onChange={e => setZoneFilter(e.target.value)} style={{ ...SEL }}>
                <option value="all">ì ì²´ êµ¬ì­</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
              <button onClick={() => setDeviOnly(!deviOnly)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
                style={{ background: deviOnly ? '#FEE2E2' : 'var(--bg-card)', color: deviOnly ? '#DC2626' : 'var(--ink-faint)', border: `1px solid ${deviOnly ? '#FECACA' : 'var(--line)'}`, cursor: 'pointer' }}>
                <AlertTriangle size={13} /> ì´íë§
              </button>
              <button onClick={openNewLog} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold" style={{ background: '#2563EB', color: 'white', border: 'none', cursor: 'pointer' }}>
                <Plus size={14} /> ì¸¡ì  ê¸°ë¡ ì¶ê°
              </button>
            </div>

            {zones.length === 0 ? (
              <div className="text-center py-16 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                <MapPin size={40} strokeWidth={1} className="mx-auto mb-3 opacity-30" />
                <div className="text-[14px] font-bold mb-1" style={{ color: 'var(--ink-soft)' }}>êµ¬ì­ ë±ë¡ íì</div>
                <div className="text-[13px] mb-4" style={{ color: 'var(--ink-faint)' }}>ë¨¼ì  "êµ¬ì­ ê´ë¦¬" í­ìì ì ì¡° êµ¬ì­ì ë±ë¡í´ ì£¼ì¸ì</div>
                <button onClick={() => setTab('zones')} className="px-4 py-2 rounded-xl text-[13px] font-semibold" style={{ background: '#2563EB', color: 'white', border: 'none', cursor: 'pointer' }}>êµ¬ì­ ê´ë¦¬ë¡ ì´ë</button>
              </div>
            ) : filtered.length === 0 ? (
              <EnvEmpty onAdd={openNewLog} />
            ) : (
              <div className="space-y-2">
                {filtered.map(log => (
                  <LogRow key={log.id} log={log} zone={zones.find(z => z.id === log.zoneId)}
                    expanded={expanded === log.id}
                    onToggle={() => setExpanded(expanded === log.id ? null : log.id)}
                    onEdit={() => openEditLog(log)}
                    onDelete={() => removeLog(log.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ââ êµ¬ì­ ê´ë¦¬ í­ ââ */}
        {tab === 'zones' && (
          <ZonesTab zones={zones} logs={logs} onNew={openNewZone} onEdit={openEditZone} onDelete={removeZone} />
        )}

        {/* ââ íí© ë¶ì í­ ââ */}
        {tab === 'analysis' && <EnvAnalysis logs={logs} zones={zones} />}

        {/* ISO ìë´ */}
        <div className="mt-6 p-4 rounded-2xl" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
          <div className="text-[12.5px] font-semibold mb-1.5" style={{ color: 'var(--ink-soft)' }}>ð¡ ISO 13485 Â§6.4 ììíê²½ ìê±´</div>
          <div className="text-[12px]" style={{ color: 'var(--ink-faint)', lineHeight: 1.7 }}>
            Â§6.4 â ì¡°ì§ì ì í ìêµ¬ì¬í­ ì í©ì±ì ìí¥ì ë¯¸ì¹ë ììíê²½ì ê²°ì íê³  ê´ë¦¬íì¬ì¼ íë¤ &nbsp;|&nbsp;
            ì¤ì¼ ì ì´: ë©¸ê· ê¸°ê¸°Â·ì²­ì  êµ¬ì­ ë± í¹ìíê²½ ì¡°ê±´ ë¬¸ìí &nbsp;|&nbsp;
            ì´í ë°ì ì Â§8.3 ë¶ì í© ì í ê´ë¦¬ ì ì°¨ ì¦ì ì ì© &nbsp;|&nbsp;
            KS Q ISO 14644 í´ë¦°ë£¸ ê¸°ì¤ ì°¸ê³ 
          </div>
        </div>
      </div>

      {showLogForm && (
        <LogForm form={logForm} lfld={lfld} zones={zones} editId={editLogId}
          user={user} onSubmit={submitLog} onClose={() => setShowLogForm(false)} />
      )}
      {showZoneForm && (
        <ZoneForm form={zoneForm} zfld={zfld} editId={editZoneId}
          onSubmit={submitZone} onClose={() => setShowZoneForm(false)} />
      )}
    </AppLayout>
  )
}

// ââ ì¸¡ì  ê¸°ë¡ í ââââââââââââââââââââââââââââââââââââââââââââââ
function LogRow({ log, zone, expanded, onToggle, onEdit, onDelete }) {
  const devs = log.deviations || []
  const hasDeviation = devs.length > 0
  const cc = zone ? CLEAN_CLASSES.find(c => c.value === zone.cleanClass) : null

  const params = [
    { key: 'temp',     label: 'ì¨ë',  unit: 'Â°C',     value: log.temp,     icon: Thermometer, color: '#EF4444' },
    { key: 'humidity', label: 'ìµë',  unit: '%RH',    value: log.humidity, icon: Droplets,    color: '#3B82F6' },
    { key: 'particle', label: 'íí°í´', unit: '/mÂ³',   value: log.particle, icon: Wind,        color: '#8B5CF6' },
    { key: 'pressure', label: 'ì°¨ì',  unit: 'Pa',     value: log.pressure, icon: Activity,    color: '#059669' },
  ].filter(p => p.value !== '' && p.value !== undefined && p.value !== null)

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: `1px solid ${hasDeviation ? '#FECACA' : 'var(--line)'}` }}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={onToggle} style={{ borderBottom: expanded ? '1px solid var(--line)' : 'none' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: hasDeviation ? '#FEE2E2' : '#D1FAE5' }}>
          {hasDeviation
            ? <AlertTriangle size={16} style={{ color: '#DC2626' }} />
            : <CheckCircle2 size={16} style={{ color: '#059669' }} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px]" style={{ color: 'var(--ink-faint)' }}>{log.id}</span>
            {zone && <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: `${cc?.color || '#6B7280'}15`, color: cc?.color || '#6B7280' }}>{zone.name}</span>}
            {hasDeviation
              ? <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: '#FEE2E2', color: '#DC2626' }}>ì´í {devs.length}ê±´</span>
              : <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: '#D1FAE5', color: '#059669' }}>ì ì</span>
            }
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {params.map(p => {
              const PIcon = p.icon
              const isDeviated = devs.some(d => d.param === p.label)
              return (
                <span key={p.key} className="text-[12px] flex items-center gap-1" style={{ color: isDeviated ? '#DC2626' : 'var(--ink)' }}>
                  <PIcon size={11} style={{ color: isDeviated ? '#DC2626' : p.color }} />
                  {p.value}{p.unit}
                </span>
              )
            })}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
            {log.measuredAt?.replace('T', ' ').slice(0, 16)} Â· ì¸¡ì ì: {log.measuredBy}
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
            <SL>ì¸¡ì ê°</SL>
            {params.length === 0 && <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>ì¸¡ì ê° ìì</div>}
            {[
              { k: 'ì¨ë', v: log.temp, u: 'Â°C' },
              { k: 'ìµë', v: log.humidity, u: '%RH' },
              { k: 'íí°í´', v: log.particle ? Number(log.particle).toLocaleString() : null, u: 'ê°/mÂ³' },
              { k: 'ì°¨ì', v: log.pressure, u: 'Pa' },
            ].filter(r => r.v !== '' && r.v != null).map(r => (
              <IR key={r.k} k={r.k} v={`${r.v} ${r.u}`} />
            ))}
          </div>
          <div>
            {hasDeviation && (
              <>
                <SL>ì´í í­ëª©</SL>
                <div className="space-y-1.5">
                  {devs.map((d, i) => (
                    <div key={i} className="p-2 rounded-lg" style={{ background: '#FEE2E2' }}>
                      <div className="text-[12px] font-bold" style={{ color: '#DC2626' }}>{d.param} ì´í</div>
                      <div className="text-[11px]" style={{ color: '#991B1B' }}>ì¸¡ì : {d.value} / ê¸°ì¤: {d.limit}</div>
                    </div>
                  ))}
                </div>
                <SL>ì°ê²° NCR</SL>
                <div className="text-[12px]" style={{ color: log.ncrId ? '#059669' : '#DC2626' }}>
                  {log.ncrId || 'â  NCR ë¯¸ë±ë¡'}
                </div>
              </>
            )}
            {!hasDeviation && (
              <><SL>íì </SL><div className="text-[13px] font-bold" style={{ color: '#059669' }}>â ì  í­ëª© ì ì ë²ì ì´ë´</div></>
            )}
          </div>
          <div>
            <SL>êµ¬ì­ ì ë³´</SL>
            {zone ? (
              <>
                <IR k="êµ¬ì­ëª" v={zone.name} />
                <IR k="ìì¹"   v={zone.location} />
                <IR k="ì²­ì ë" v={cc?.label || zone.cleanClass} />
              </>
            ) : <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>êµ¬ì­ ì ë³´ ìì</div>}
            {log.notes && <><SL>ë¹ê³ </SL><div className="text-[12px] p-2 rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink) '}}>{log.notes}</div></>}
          </div>
        </div>
      )}
    </div>
  )
}

// ââ êµ¬ì­ ê´ë¦¬ í­ ââââââââââââââââââââââââââââââââââââââââââââââ
function ZonesTab({ zones, logs, onNew, onEdit, onDelete }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-[13px]" style={{ color: 'var(--ink-faint)' }}>ì ì¡° êµ¬ì­ë³ íê²½ íì© ë²ìë¥¼ ì¤ì í©ëë¤. ì¸¡ì  ê¸°ë¡ ìë ¥ ì ìëì¼ë¡ ì´í ì¬ë¶ë¥¼ íì í©ëë¤.</div>
        <button onClick={onNew} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold" style={{ background: '#2563EB', color: 'white', border: 'none', cursor: 'pointer' }}>
          <Plus size={14} /> êµ¬ì­ ì¶ê°
        </button>
      </div>
      {zones.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <MapPin size={40} strokeWidth={1} className="mx-auto mb-3 opacity-30" />
          <div className="text-[14px] font-bold mb-2" style={{ color: 'var(--ink-soft)' }}>ë±ë¡ë êµ¬ì­ ìì</div>
          <button onClick={onNew} className="px-4 py-2 rounded-xl text-[13px] font-semibold" style={{ background: '#2563EB', color: 'white', border: 'none', cursor: 'pointer' }}>êµ¬ì­ ì¶ê°</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {zones.map(z => {
            const cc = CLEAN_CLASSES.find(c => c.value === z.cleanClass)
            const zoneLogs = logs.filter(l => l.zoneId === z.id)
            const recentDev = zoneLogs.filter(l => (l.deviations || []).length > 0).length
            return (
              <div key={z.id} className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: `1px solid ${recentDev > 0 ? '#FECACA' : 'var(--line)'}` }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${cc?.color || '#6B7280'}15`, color: cc?.color || '#6B7280' }}>{cc?.label?.split(' ')[0] || z.cleanClass}</span>
                      {!z.active && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#F3F4F6', color: '#6B7280' }}>ë¹íì±</span>}
                    </div>
                    <div className="text-[15px] font-bold" style={{ color: 'var(--ink) '}}>{z.name}</div>
                    <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>{z.location}</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => onEdit(z)} className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)', border: 'none', cursor: 'pointer' }}><Edit3 size={13} /></button>
                    <button onClick={() => onDelete(z.id)} className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', cursor: 'pointer' }}><Trash2 size={13} /></button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
                    <div style={{ color: 'var(--ink-faint)' }}>ì¨ë</div>
                    <div className="font-bold" style={{ color: '#EF4444' }}>{z.tempMin}~{z.tempMax}Â°C</div>
                  </div>
                  <div className="p-2 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
                    <div style={{ color: 'var(--ink-faint)' }}>ìµë</div>
                    <div className="font-bold" style={{ color: '#3B82F6' }}>{z.humMin}~{z.humMax}%RH</div>
                  </div>
                  {/* #274: íí°í´ ìí â ì°¨ì íì */}
                  <div className="p-2 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
                    <div style={{ color: 'var(--ink-faint)' }}>ì°¨ì íì©</div>
                    <div className="font-bold" style={{ color: '#059669' }}>{z.pressMin}~{z.pressMax}Pa</div>
                  </div>
                  <div className="p-2 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
                    <div style={{ color: 'var(--ink-faint)' }}>ì¸¡ì  ê¸°ë¡</div>
                    <div className="font-bold" style={{ color: recentDev > 0 ? '#DC2626' : '#059669' }}>
                      {zoneLogs.length}ëª± ý i/ {recentDev}ê±´
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ââ íí© ë¶ì âââââââââââââââââââââââââââââââââââââââââââââââââ
function EnvAnalysis({ logs, zones }) {
  const zoneStats = zones.map(z => {
    const zl = logs.filter(l => l.zoneId === z.id)
    const devCount = zl.filter(l => (l.deviations || []).length > 0).length
    const rate = zl.length ? Math.round((devCount / zl.length) * 100) : 0
    return { ...z,h total: zl.length, devCount, deviationRate: rate }
  }).sort((a, b) => b.deviationRate - a.deviationRate)

  // ìë³ ì´í ì¶ì´
  const monthly = {}
  logs.forEach(l => {
    const m = (l.measuredAt || l.createdAt || '').slice(0, 7)
    if (!m) return
    if (!monthly[m]) monthly[m] = { total: 0, dev: 0 }
    monthly[m].total++
    if ((l.deviations || []).length > 0) monthly[m].dev++
  })
  const monthKeys = Object.keys(monthly).sort().slice(-6)

  // íë¼ë¯¸í°ë³ ì´í íì
  const paramDev = { 'ì¨ë': 0, 'ìµë': 0, 'íí°í´': 0, 'ì°¨ì': 0 }
  logs.forEach(l => (l.deviations || []).forEach(d => {
    if (paramDev[d.param] !== undefined) paramDev[d.param]++
  }))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* êµ¬ì­ë³ ì´íë¥  */}
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink) '}}>êµ¬ì­ë³ ì´íë¥ </div>
          {zoneStats.length === 0 ? (
            <div className="text-[13px] text-center py-6" style={{ color: 'var(--ink-faint)' }}>ë°ì´í° ìì</div>
          ) : (
            <div className="space-y-3">
              {zoneStats.map(z => {
                const cc = CLEAN_CLASSES.find(c => c.value === z.cleanClass)
                return (
                  <div key={z.id}>
                    <div className="flex justify-between mb-1">
                      <span className="text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>{z.name}</span>
                      <span className="text-[12px]" style={{ color: z.deviationRate > 10 ? '#DC2626' : z.deviationRate > 5 ? '#D97706' : '#059669' }}>
                        {z.deviationRate}% ({z.devCount}/{z.total}ëª±)
                      </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-soft)' }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(z.deviationRate, 100)}%`, background: z.deviationRate > 10 ? '#DC2626' : z.deviationRate > 5 ? '#D97706' : '#059669' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* íë¼ë¯¸í°ë³ ì´í */}
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>íë¼ë¯¸í°ë³ ì´í íì</div>
          <div className="space-y-3">
            {PARAM_DEFS.map(p => {
              const cnt = paramDev[p.label] || 0
              const max = Math.max(...Object.values(paramDev), 1)
              return (
                <div key={p.key} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${p.color}15` }}>
                    <p.icon size={13} style={{ color: p.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-[12px]" style={{ color: 'var(--ink)' }}>{p.label}</span>
                      <span className="text-[12px] font-bold" style={{ color: cnt > 0 ? '#DC2626' : '#059669' }}>{cnt}ê±´</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-soft)' }}>
                      <div className="h-full rounded-full" style={{ width: `${(cnt / max) * 100}%`, background: p.color }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ìë³ ì¶ì´ */}
      {monthKeys.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>ìë³ ì¸¡ì  ê±´ì ë° ì´í ì¶ì´</div>
          <div className="flex items-end gap-3 h-[120px]">
            {monthKeys.map(m => {
              const d = monthly[m]
              const maxH = Math.max(...monthKeys.map(k => monthly[k].total), 1)
              const h = Math.max(8, Math.round((d.total / maxH) * 100))
              const fh = d.total ? Math.round((d.dev / d.total) * h) : 0
              return (
                <div key={m} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{d.total}ê±´</span>
                  <div className="w-full rounded-t-lg overflow-hidden flex flex-col justify-end" style={{ height: `${h}px`, background: '#D1FAE5' }}>
                    {fh > 0 && <div className="w-full" style={{ height: `${fh}px`, background: '#EF4444' }} />}
                  </div>
                  <span className="text-[9px]" style={{ color: 'var(--ink-faint)' }}>{m.slice(5)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ââ ì¸¡ì  ê¸°ë¡ í¼ ââââââââââââââââââââââââââââââââââââââââââââââ
function LogForm({ form, lfld, zones, editId, user, onSubmit, onClose }) {
  const zone = zones.find(z => z.id === form.zoneId)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }} onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--line)', width: '100%', maxWidth: 640, boxShadow: '0 24px 64px rgba(0,0,0,0.3)', padding: 28 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="text-[16px] font-bold" style={{ color: 'var(--ink) '}}>{editId ? 'ì¸¡ì  ê¸°ë¡ ìì ' : 'íê²½ ì¸¡ì  ê¸°ë¡ ì¶ê°'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)' }}><X size={20} /></button>
        </div>

        <div className="space-y-3">
          <R2>
            <F l="ì¸¡ì  êµ¬ì­ *">
              <select value={form.zoneId} onChange={e => lfld('zoneId', e.target.value)} style={IS} className="w-full">
                <option value="">êµ¬ì­ ì í...</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </F>
            <F l="ì¸¡ì  ì¼ì"><input type="datetime-local" value={form.measuredAt} onChange={e => lfld('measuredAt', e.target.value)} style={IS} className="w-full" /></F>
          </R2>
          {/* #270: ì¸¡ì ì íë ì­ì  â ì ì¥ ì ë¡ê·¸ì¸ë ì¬ì©ìë¡ ìë ê¸°ë¡ */}

          {/* ì¸¡ì ê° */}
          <div className="pt-2" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="text-[12px] font-bold mb-2" style={{ color: 'var(--ink-soft)' }}>ì¸¡ì ê° (í´ë¹ í­ëª©ë§ ìë ¥)</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { k: 'temp', l: 'ì¨ë (Â°C)', placeholder: 'ì: 22.5', c: '#EF4444', icon: Thermometer,
                hint: zone ? `íì©: ${zone.tempMin}~${zone.tempMax}Â°C` : '' },
              { k: 'humidity', l: 'ìµë (%RH)', placeholder: 'ì: 55', c: '#3B82F6', icon: Droplets,
                hint: zone ? `íì©: ${zone.humMin}~${zone.humMax}%RH` : '' },
              { k: 'particle', l: 'íí°í´ (ê°/mÂ³)', placeholder: 'ì: 125000', c: '#8B5CF6', icon: Wind,
                hint: zone ? `ìí: ${Number(zone.partMax).toLocaleString()}` : '' },
              { k: 'pressure', l: 'ì°¨ì (Pa)', placeholder: 'ì: 10', c: '#059669', icon: Activity,
                hint: zone ? `íì©: ${zone.pressMin}~${zone.pressMax}Pa` : '' },
            ].map(p => {
              const PIcon = p.icon
              const val = form[p.k]
              // ë¹ ë¥¸ ì´í íë¨
              let deviated = false
              if (zone && val !== '') {
                const v = parseFloat(val)
                if (p.k === 'temp'     && !isNaN(v) && (v < zone.tempMin || v > zone.tempMax)) deviated = true
                if (p.k === 'humidity' && !isNaN(v) && (v < zone.humMin  || v > zone.humMax))  deviated = true
                if (p.k === 'particle' && !isNaN(v) && v > zone.partMax)  deviated = true
                if (p.k === 'pressure' && !isNaN(v) && (v < zone.pressMin || v > zone.pressMax)) deviated = true
              }
              return (
                <div key={p.k}>
                  <label className="flex items-center gap-1 text-[11.5px] font-semibold mb-1" style={{ color: deviated ? '#DC2626' : 'var(--ink-faint)' }}>
                    <PIcon size={11} style={{ color: deviated ? '#DC2626' : p.c }} />
                    {p.l} {deviated && 'â  ì´í'}
                  </label>
                  <input value={val} onChange={e => lfld(p.k, e.target.value)} placeholder={p.placeholder} type="number" step="any"
                    style={{ ...IS, borderColor: deviated ? '#FECACA' : undefined, background: deviated ? '#FFF5F5' : undefined }} className="w-full" />
                  {p.hint && <div className="text-[10px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{p.hint}</div>}
                </div>
              )
            })}
          </div>

          {/* #273: ì°ê²° NCR ì­ì  */}
          <F l="ë¹ê³ "><textarea value={form.notes} onChange={e => lfld('notes', e.target.value)} rows={2} style={{ ...IS, resize: 'vertical' }} className="w-full" /></F>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>ì·¨ì¬</button>
          <button onClick={onSubmit} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: '#2563EB', color: 'white', border: 'none', cursor: 'pointer' }}>
            {editId ? 'ìì  ì ì¥' : 'ì¸¡ì  ê¸°ë¡ ë±ë¡'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ââ êµ¬ì­ ì¤ì  í¼ ââââââââââââââââââââââââââââââââââââââââââââââ
function ZoneForm({ form, zfld, editId, onSubmit, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }} onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--line)', width: '100%', maxWidth: 620, boxShadow: '0 24px 64px rgba(0,0,0,0.3)', padding: 28 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="text-[16px] font-bold" style={{ color: 'var(--ink)' }}>{editId ? 'êµ¬ì­ ìì ' : 'ì ì¡° êµ¬ì­ ì¶ê°'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)' }}><X size={20} /></button>
        </div>
        <div className="space-y-3">
          <R2>
            <F l="êµ¬ì­ ì´ë¦ *"><input value={form.name} onChange={e => zfld('name', e.target.value)} placeholder="ì: í´ë¦°ë£¸ Aë" style={IS} className="w-full" /></F>
            <F l="ìì¹"><input value={form.location} onChange={e => zfld('location', e.target.value)} placeholder="ì: 2ì¸µ ìì°ë" style={IS} className="w-full" /></F>
          </R2>
          <R2>
            <F l="ì²­ì ë ë±ê¸">
              <select value={form.cleanClass} onChange={e => zfld('cleanClass', e.target.value)} style={IS} className="w-full">
                {CLEAN_CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </F>
            <F l="ì¸¡ì  ì£¼ê¸°">
              <select value={form.monitorFreq} onChange={e => zfld('monitorFreq', e.target.value)} style={IS} className="w-full">
                <option value="realtime">ì¤ìê°</option>
                <option value="hourly">1ìê°ë§ë¤</option>
                <option value="twice_daily">1ì¼ 2í</option>
                <option value="daily">1ì¼ 1í</option>
                <option value="weekly">ì£¼ 1í</option>
                <option value="monthly">ì 1í</option>
              </select>
            </F>
          </R2>
          <div className="pt-2" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="text-[12px] font-bold mb-2" style={{ color: 'var(--ink-soft)' }}>íì© ë²ì ì¤ì </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <F l="ì¨ë ìµìê° (Â°C)"><input type="number" step="0.1" value={form.tempMin} onChange={e => zfld('tempMin', parseFloat(e.target.value))} style={IS} className="w-full" /></F>
            <F l="ì¨ë ìµëê° (Â°C)"><input type="number" step="0.1" value={form.tempMax} onChange={e => zfld('tempMax', parseFloat(e.target.value))} style={IS} className="w-full" /></F>
            <F l="ìµë ìµìê° (%RH)"><input type="number" step="1" value={form.humMin} onChange={e => zfld('humMin', parseFloat(e.target.value))} style={IS} className="w-full" /></F>
            <F l="ìµë ìµëê° (%RH)"><input type="number" step="1" value={form.humMax} onChange={e => zfld('humMax', parseFloat(e.target.value))} style={IS} className="w-full" /></F>
            <F l="íí°í´ ìí (ê°/mÂ³)"><input type="number" step="1" value={form.partMax} onChange={e => zfld('partMax', parseFloat(e.target.value))} style={IS} className="w-full" /></F>
            <div className="grid grid-cols-2 gap-2">
              <F l="ì°¨ì ìµìê° (Pa)"><input type="number" step="0.5" value={form.pressMin} onChange={e => zfld('pressMin', parseFloat(e.target.value))} style={IS} className="w-full" /></F>
              <F l="ìµëê° (Pa)"><input type="number" step="0.5" value={form.pressMax} onChange={e => zfld('pressMax', parseFloat(e.target.value))} style={IS} className="w-full" /></F>
            </div>
          </div>
          <F l="ë¹ê³ "><textarea value={form.description} onChange={e => zfld('description', e.target.value)} rows={2} placeholder="êµ¬ì­ ì¤ëª ë° í¹ì´ì¬í­..." style={{ ...IS, resize: 'vertical' }} className="w-full" /></F>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.active !== false} onChange={e => zfld('active', e.target.checked)} style={{ accentColor: '#059669' }} />
            <span className="text-[13px]" style={{ color: 'var(--ink)' }}>íì± êµ¬ì­ (ëª¨ëí°ë§ ëì)</span>
          </label>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>ì·¨ì</button>
          <button onClick={onSubmit} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: '#2563EB', color: 'white', border: 'none', cursor: 'pointer' }}>
            {editId ? 'ìì  ì ì¥' : 'êµ¬ì­ ë±ë¡'}
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
      <span className="text-[10.5px] flex-shrink-0" style={{ color: 'var(--ink-faint)', minWidth: 56 }}>{k}</span>
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
const IS  = { border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--ink)', background: 'var(--bg-card)', outline: 'none' }
const SEL = { border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px', fontSize: 13, color: 'var(--ink)', background: 'var(--bg-card)', outline: 'none', cursor: 'pointer' }

function EnvEmpty({ onAdd }) {
  return (
    <div className="flex flex-col items-center py-20 text-center rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
      <Thermometer size={48} strokeWidth={1} className="mx-auto mb-3 opacity-30" style={{ color: '#EF4444' }} />
      <div className="text-[16px] font-bold mb-1" style={{ color: 'var(--ink-soft)' }}>ì¸¡ì  ê¸°ë¡ ìì</div>
      <div className="text-[13px] mb-5" style={{ color: 'var(--ink-faint)' }}>ì¨ëÂ·ìµëÂ·íí°í´ ì¸¡ì  ê²°ê³¼ë¥¼ ê¸°ë¡íê³  ì´í ì¬ë¶ë¥¼ ìëì¼ë¡ íì í©ëë¤</div>
      <button onClick={onAdd} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: '#2563EB', color: 'white', border: 'none', cursor: 'pointer' }}>
        <Plus size={15} /> ì¸¡ì  ê¸°ë¡ ì¶ê°
      </button>
    </div>
  )
}
