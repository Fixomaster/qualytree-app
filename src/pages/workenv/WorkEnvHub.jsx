// src/pages/workenv/WorkEnvHub.jsx
// ISO 13485 §6.4 작업환경 관리 — 제조 구역별 환경 모니터링·이탈 감지·NCR 연동
import React, { useState, useMemo } from 'react'
import {
  Plus, Search, Trash2, X, Edit3, ChevronDown, ChevronUp,
  Thermometer, Droplets, Wind, Activity, AlertTriangle,
  CheckCircle2, XCircle, TrendingUp, BarChart2, MapPin,
  Settings, Clock,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'

// ── localStorage ──────────────────────────────────────────────
const LS_LOG  = 'qualytree.env_logs'
const LS_ZONE = 'qualytree.env_zones'
function lsR(k) { try { return JSON.parse(localStorage.getItem(k) || '[]') } catch { return [] } }
function lsW(k, d) { localStorage.setItem(k, JSON.stringify(d)) }
function genLogId()  { return `ENV-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }
function genZoneId() { return `ZON-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }

// ── 상수 ─────────────────────────────────────────────────────
const PARAM_DEFS = [
  { key: 'temp',     label: '온도',     unit: '°C',     icon: Thermometer, color: '#EF4444', defaultMin: 18, defaultMax: 26 },
  { key: 'humidity', label: '습도',     unit: '%RH',    icon: Droplets,    color: '#3B82F6', defaultMin: 40, defaultMax: 65 },
  { key: 'particle', label: '파티클(≥0.5μm)', unit: '개/m³', icon: Wind, color: '#8B5CF6', defaultMin: 0, defaultMax: 352000 },
  { key: 'pressure', label: '차압',     unit: 'Pa',     icon: Activity,    color: '#059669', defaultMin: 5, defaultMax: 20 },
]

const CLEAN_CLASSES = [
  { value: 'ISO5',   label: 'ISO 5 (Class 100)',    color: '#DC2626' },
  { value: 'ISO6',   label: 'ISO 6 (Class 1000)',   color: '#D97706' },
  { value: 'ISO7',   label: 'ISO 7 (Class 10000)',  color: '#2563EB' },
  { value: 'ISO8',   label: 'ISO 8 (Class 100000)', color: '#059669' },
  { value: 'CDA',    label: '일반 제조 구역 (CDA)', color: '#6B7280' },
  { value: 'none',   label: '청정도 미분류',         color: '#9CA3AF' },
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

// 이탈 판정
function calcDeviations(log, zone) {
  if (!zone) return []
  const devs = []
  if (log.temp !== '' && log.temp !== null && log.temp !== undefined) {
    const v = parseFloat(log.temp)
    if (!isNaN(v) && (v < zone.tempMin || v > zone.tempMax))
      devs.push({ param: '온도', value: `${v}°C`, limit: `${zone.tempMin}~${zone.tempMax}°C` })
  }
  if (log.humidity !== '' && log.humidity !== null) {
    const v = parseFloat(log.humidity)
    if (!isNaN(v) && (v < zone.humMin || v > zone.humMax))
      devs.push({ param: '습도', value: `${v}%RH`, limit: `${zone.humMin}~${zone.humMax}%RH` })
  }
  if (log.particle !== '' && log.particle !== null) {
    const v = parseFloat(log.particle)
    if (!isNaN(v) && v > zone.partMax)
      devs.push({ param: '파티클', value: `${v.toLocaleString()}개/m³`, limit: `≤${zone.partMax.toLocaleString()}개/m³` })
  }
  if (log.pressure !== '' && log.pressure !== null) {
    const v = parseFloat(log.pressure)
    if (!isNaN(v) && (v < zone.pressMin || v > zone.pressMax))
      devs.push({ param: '차압', value: `${v}Pa`, limit: `${zone.pressMin}~${zone.pressMax}Pa` })
  }
  return devs
}

// ── 메인 ─────────────────────────────────────────────────────
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
  const removeLog  = id => { if (!confirm('삭제?')) return; saveLogs(logs.filter(l => l.id !== id)) }
  const removeZone = id => { if (!confirm('구역 삭제 시 관련 기록은 유지됩니다. 삭제?')) return; saveZones(zones.filter(z => z.id !== id)) }
  const lfld = (k, v) => setLogForm(f => ({ ...f, [k]: v }))
  const zfld = (k, v) => setZoneForm(f => ({ ...f, [k]: v }))

  const submitLog = () => {
    if (!logForm.zoneId || !logForm.measuredBy)
      return alert('측정 구역과 측정자는 필수입니다.')
    const zone = zones.find(z => z.id === logForm.zoneId)
    const deviations = calcDeviations(logForm, zone)
    const now = new Date().toISOString()
    const entry = { ...logForm, deviations, id: editLogId || genLogId(), createdAt: now, createdBy: user?.name || '-' }
    if (editLogId) saveLogs(logs.map(l => l.id === editLogId ? entry : l))
    else saveLogs([entry, ...logs])
    setShowLogForm(false)
  }

  const submitZone = () => {
    if (!zoneForm.name) return alert('구역 이름은 필수입니다.')
    const now = new Date().toISOString()
    if (editZoneId) saveZones(zones.map(z => z.id === editZoneId ? { ...zoneForm, id: editZoneId } : z))
    else saveZones([{ ...zoneForm, id: genZoneId(), createdAt: now }, ...zones])
    setShowZoneForm(false)
  }

  // 필터
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

  // 집계
  const totalLogs   = logs.length
  const deviCount   = logs.filter(l => (l.deviations || []).length > 0).length
  const deviNoNcr   = logs.filter(l => (l.deviations || []).length > 0 && !l.ncrId)
  const todayLogs   = logs.filter(l => (l.measuredAt || '').startsWith(new Date().toISOString().slice(0, 10))).length
  const activeZones = zones.filter(z => z.active !== false).length

  const TABS = [
    { key: 'logs',     label: '모니터링 기록',  icon: Activity },
    { key: 'zones',    label: '구역 관리',      icon: MapPin },
    { key: 'analysis', label: '현황 분석',      icon: BarChart2 },
  ]

  return (
    <AppLayout user={user} title="작업환경 관리" subtitle="ISO 13485 §6.4 · 제조 구역 환경 모니터링 · 이탈 감지 · NCR 연동">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto">

        {/* 이탈 알림 배너 */}
        {deviNoNcr.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-5" style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}>
            <AlertTriangle size={14} style={{ color: '#DC2626' }} />
            <span className="text-[13px] font-semibold" style={{ color: '#991B1B' }}>
              환경 이탈 {deviNoNcr.length}건 — NCR 미등록. 품질허브에서 NCR 등록 필요.
            </span>
          </div>
        )}

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: '관리 구역',   count: activeZones,  color: '#2563EB' },
            { label: '전체 기록',   count: totalLogs,    color: '#6B7280' },
            { label: '오늘 측정',   count: todayLogs,    color: '#059669' },
            { label: '이탈 발생',   count: deviCount,    color: '#DC2626' },
            { label: 'NCR 미등록',  count: deviNoNcr.length, color: deviNoNcr.length > 0 ? '#DC2626' : '#059669' },
          ].map(s => (
            <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="text-[22px] font-bold" style={{ color: s.color }}>{s.count}</div>
              <div className="text-[10.5px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: 'var(--bg-soft)', width: 'fit-content' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition"
              style={{ background: tab === t.key ? 'var(--bg-card)' : 'transparent', color: tab === t.key ? 'var(--ink)' : 'var(--ink-faint)', border: 'none', cursor: 'pointer', boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
              <t.icon size={14} />{t.label}
            </button>
          ))}
        </div>

        {/* ── 모니터링 기록 탭 ── */}
        {tab === 'logs' && (
          <>
            <div className="flex gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-[160px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                <Search size={14} style={{ color: 'var(--ink-faint)' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="구역명·측정자 검색..." className="flex-1 text-[13px] outline-none" style={{ background: 'none', border: 'none', color: 'var(--ink)' }} />
              </div>
              <select value={zoneFilter} onChange={e => setZoneFilter(e.target.value)} style={{ ...SEL }}>
                <option value="all">전체 구역</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
              <button onClick={() => setDeviOnly(!deviOnly)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
                style={{ background: deviOnly ? '#FEE2E2' : 'var(--bg-card)', color: deviOnly ? '#DC2626' : 'var(--ink-faint)', border: `1px solid ${deviOnly ? '#FECACA' : 'var(--line)'}`, cursor: 'pointer' }}>
                <AlertTriangle size={13} /> 이탈만
              </button>
              <button onClick={openNewLog} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold" style={{ background: '#2563EB', color: 'white', border: 'none', cursor: 'pointer' }}>
                <Plus size={14} /> 측정 기록 추가
              </button>
            </div>

            {zones.length === 0 ? (
              <div className="text-center py-16 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                <MapPin size={40} strokeWidth={1} className="mx-auto mb-3 opacity-30" />
                <div className="text-[14px] font-bold mb-1" style={{ color: 'var(--ink-soft)' }}>구역 등록 필요</div>
                <div className="text-[13px] mb-4" style={{ color: 'var(--ink-faint)' }}>먼저 "구역 관리" 탭에서 제조 구역을 등록해 주세요</div>
                <button onClick={() => setTab('zones')} className="px-4 py-2 rounded-xl text-[13px] font-semibold" style={{ background: '#2563EB', color: 'white', border: 'none', cursor: 'pointer' }}>구역 관리로 이동</button>
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

        {/* ── 구역 관리 탭 ── */}
        {tab === 'zones' && (
          <ZonesTab zones={zones} logs={logs} onNew={openNewZone} onEdit={openEditZone} onDelete={removeZone} />
        )}

        {/* ── 현황 분석 탭 ── */}
        {tab === 'analysis' && <EnvAnalysis logs={logs} zones={zones} />}

        {/* ISO 안내 */}
        <div className="mt-6 p-4 rounded-2xl" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
          <div className="text-[12.5px] font-semibold mb-1.5" style={{ color: 'var(--ink-soft)' }}>🌡 ISO 13485 §6.4 작업환경 요건</div>
          <div className="text-[12px]" style={{ color: 'var(--ink-faint)', lineHeight: 1.7 }}>
            §6.4 — 조직은 제품 요구사항 적합성에 영향을 미치는 작업환경을 결정하고 관리하여야 한다 &nbsp;|&nbsp;
            오염 제어: 멸균기기·청정 구역 등 특수환경 조건 문서화 &nbsp;|&nbsp;
            이탈 발생 시 §8.3 부적합 제품 관리 절차 즉시 적용 &nbsp;|&nbsp;
            KS Q ISO 14644 클린룸 기준 참고
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

// ── 측정 기록 행 ──────────────────────────────────────────────
function LogRow({ log, zone, expanded, onToggle, onEdit, onDelete }) {
  const devs = log.deviations || []
  const hasDeviation = devs.length > 0
  const cc = zone ? CLEAN_CLASSES.find(c => c.value === zone.cleanClass) : null

  const params = [
    { key: 'temp',     label: '온도',  unit: '°C',     value: log.temp,     icon: Thermometer, color: '#EF4444' },
    { key: 'humidity', label: '습도',  unit: '%RH',    value: log.humidity, icon: Droplets,    color: '#3B82F6' },
    { key: 'particle', label: '파티클', unit: '/m³',   value: log.particle, icon: Wind,        color: '#8B5CF6' },
    { key: 'pressure', label: '차압',  unit: 'Pa',     value: log.pressure, icon: Activity,    color: '#059669' },
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
              ? <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: '#FEE2E2', color: '#DC2626' }}>이탈 {devs.length}건</span>
              : <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: '#D1FAE5', color: '#059669' }}>정상</span>
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
            {log.measuredAt?.replace('T', ' ').slice(0, 16)} · 측정자: {log.measuredBy}
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
            <SL>측정값</SL>
            {params.length === 0 && <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>측정값 없음</div>}
            {[
              { k: '온도', v: log.temp, u: '°C' },
              { k: '습도', v: log.humidity, u: '%RH' },
              { k: '파티클', v: log.particle ? Number(log.particle).toLocaleString() : null, u: '개/m³' },
              { k: '차압', v: log.pressure, u: 'Pa' },
            ].filter(r => r.v !== '' && r.v != null).map(r => (
              <IR key={r.k} k={r.k} v={`${r.v} ${r.u}`} />
            ))}
          </div>
          <div>
            {hasDeviation && (
              <>
                <SL>이탈 항목</SL>
                <div className="space-y-1.5">
                  {devs.map((d, i) => (
                    <div key={i} className="p-2 rounded-lg" style={{ background: '#FEE2E2' }}>
                      <div className="text-[12px] font-bold" style={{ color: '#DC2626' }}>{d.param} 이탈</div>
                      <div className="text-[11px]" style={{ color: '#991B1B' }}>측정: {d.value} / 기준: {d.limit}</div>
                    </div>
                  ))}
                </div>
                <SL>연결 NCR</SL>
                <div className="text-[12px]" style={{ color: log.ncrId ? '#059669' : '#DC2626' }}>
                  {log.ncrId || '⚠ NCR 미등록'}
                </div>
              </>
            )}
            {!hasDeviation && (
              <><SL>판정</SL><div className="text-[13px] font-bold" style={{ color: '#059669' }}>✓ 전 항목 정상 범위 이내</div></>
            )}
          </div>
          <div>
            <SL>구역 정보</SL>
            {zone ? (
              <>
                <IR k="구역명" v={zone.name} />
                <IR k="위치"   v={zone.location} />
                <IR k="청정도" v={cc?.label || zone.cleanClass} />
              </>
            ) : <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>구역 정보 없음</div>}
            {log.notes && <><SL>비고</SL><div className="text-[12px] p-2 rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink)' }}>{log.notes}</div></>}
          </div>
        </div>
      )}
    </div>
  )
}

// ── 구역 관리 탭 ──────────────────────────────────────────────
function ZonesTab({ zones, logs, onNew, onEdit, onDelete }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-[13px]" style={{ color: 'var(--ink-faint)' }}>제조 구역별 환경 허용 범위를 설정합니다. 측정 기록 입력 시 자동으로 이탈 여부를 판정합니다.</div>
        <button onClick={onNew} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold" style={{ background: '#2563EB', color: 'white', border: 'none', cursor: 'pointer' }}>
          <Plus size={14} /> 구역 추가
        </button>
      </div>
      {zones.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <MapPin size={40} strokeWidth={1} className="mx-auto mb-3 opacity-30" />
          <div className="text-[14px] font-bold mb-2" style={{ color: 'var(--ink-soft)' }}>등록된 구역 없음</div>
          <button onClick={onNew} className="px-4 py-2 rounded-xl text-[13px] font-semibold" style={{ background: '#2563EB', color: 'white', border: 'none', cursor: 'pointer' }}>구역 추가</button>
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
                      {!z.active && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#F3F4F6', color: '#6B7280' }}>비활성</span>}
                    </div>
                    <div className="text-[15px] font-bold" style={{ color: 'var(--ink)' }}>{z.name}</div>
                    <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>{z.location}</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => onEdit(z)} className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)', border: 'none', cursor: 'pointer' }}><Edit3 size={13} /></button>
                    <button onClick={() => onDelete(z.id)} className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', cursor: 'pointer' }}><Trash2 size={13} /></button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
                    <div style={{ color: 'var(--ink-faint)' }}>온도</div>
                    <div className="font-bold" style={{ color: '#EF4444' }}>{z.tempMin}~{z.tempMax}°C</div>
                  </div>
                  <div className="p-2 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
                    <div style={{ color: 'var(--ink-faint)' }}>습도</div>
                    <div className="font-bold" style={{ color: '#3B82F6' }}>{z.humMin}~{z.humMax}%RH</div>
                  </div>
                  <div className="p-2 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
                    <div style={{ color: 'var(--ink-faint)' }}>파티클 상한</div>
                    <div className="font-bold" style={{ color: '#8B5CF6' }}>≤{Number(z.partMax).toLocaleString()}/m³</div>
                  </div>
                  <div className="p-2 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
                    <div style={{ color: 'var(--ink-faint)' }}>측정 기록</div>
                    <div className="font-bold" style={{ color: recentDev > 0 ? '#DC2626' : '#059669' }}>
                      {zoneLogs.length}건 / 이탈 {recentDev}건
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

// ── 현황 분석 ─────────────────────────────────────────────────
function EnvAnalysis({ logs, zones }) {
  const zoneStats = zones.map(z => {
    const zl = logs.filter(l => l.zoneId === z.id)
    const devCount = zl.filter(l => (l.deviations || []).length > 0).length
    const rate = zl.length ? Math.round((devCount / zl.length) * 100) : 0
    return { ...z, total: zl.length, devCount, deviationRate: rate }
  }).sort((a, b) => b.deviationRate - a.deviationRate)

  // 월별 이탈 추이
  const monthly = {}
  logs.forEach(l => {
    const m = (l.measuredAt || l.createdAt || '').slice(0, 7)
    if (!m) return
    if (!monthly[m]) monthly[m] = { total: 0, dev: 0 }
    monthly[m].total++
    if ((l.deviations || []).length > 0) monthly[m].dev++
  })
  const monthKeys = Object.keys(monthly).sort().slice(-6)

  // 파라미터별 이탈 횟수
  const paramDev = { '온도': 0, '습도': 0, '파티클': 0, '차압': 0 }
  logs.forEach(l => (l.deviations || []).forEach(d => {
    if (paramDev[d.param] !== undefined) paramDev[d.param]++
  }))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 구역별 이탈률 */}
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>구역별 이탈률</div>
          {zoneStats.length === 0 ? (
            <div className="text-[13px] text-center py-6" style={{ color: 'var(--ink-faint)' }}>데이터 없음</div>
          ) : (
            <div className="space-y-3">
              {zoneStats.map(z => {
                const cc = CLEAN_CLASSES.find(c => c.value === z.cleanClass)
                return (
                  <div key={z.id}>
                    <div className="flex justify-between mb-1">
                      <span className="text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>{z.name}</span>
                      <span className="text-[12px]" style={{ color: z.deviationRate > 10 ? '#DC2626' : z.deviationRate > 5 ? '#D97706' : '#059669' }}>
                        {z.deviationRate}% ({z.devCount}/{z.total}건)
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

        {/* 파라미터별 이탈 */}
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>파라미터별 이탈 횟수</div>
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
                      <span className="text-[12px] font-bold" style={{ color: cnt > 0 ? '#DC2626' : '#059669' }}>{cnt}건</span>
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

      {/* 월별 추이 */}
      {monthKeys.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>월별 측정 건수 및 이탈 추이</div>
          <div className="flex items-end gap-3 h-[120px]">
            {monthKeys.map(m => {
              const d = monthly[m]
              const maxH = Math.max(...monthKeys.map(k => monthly[k].total), 1)
              const h = Math.max(8, Math.round((d.total / maxH) * 100))
              const fh = d.total ? Math.round((d.dev / d.total) * h) : 0
              return (
                <div key={m} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{d.total}건</span>
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

// ── 측정 기록 폼 ──────────────────────────────────────────────
function LogForm({ form, lfld, zones, editId, user, onSubmit, onClose }) {
  const zone = zones.find(z => z.id === form.zoneId)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }} onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--line)', width: '100%', maxWidth: 640, boxShadow: '0 24px 64px rgba(0,0,0,0.3)', padding: 28 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="text-[16px] font-bold" style={{ color: 'var(--ink)' }}>{editId ? '측정 기록 수정' : '환경 측정 기록 추가'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)' }}><X size={20} /></button>
        </div>

        <div className="space-y-3">
          <R2>
            <F l="측정 구역 *">
              <select value={form.zoneId} onChange={e => lfld('zoneId', e.target.value)} style={IS} className="w-full">
                <option value="">구역 선택...</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </F>
            <F l="측정 일시"><input type="datetime-local" value={form.measuredAt} onChange={e => lfld('measuredAt', e.target.value)} style={IS} className="w-full" /></F>
          </R2>
          <F l="측정자 *"><input value={form.measuredBy} onChange={e => lfld('measuredBy', e.target.value)} placeholder={user?.name || '측정자 이름'} style={IS} className="w-full" /></F>

          {/* 측정값 */}
          <div className="pt-2" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="text-[12px] font-bold mb-2" style={{ color: 'var(--ink-soft)' }}>측정값 (해당 항목만 입력)</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { k: 'temp', l: '온도 (°C)', placeholder: '예: 22.5', c: '#EF4444', icon: Thermometer,
                hint: zone ? `허용: ${zone.tempMin}~${zone.tempMax}°C` : '' },
              { k: 'humidity', l: '습도 (%RH)', placeholder: '예: 55', c: '#3B82F6', icon: Droplets,
                hint: zone ? `허용: ${zone.humMin}~${zone.humMax}%RH` : '' },
              { k: 'particle', l: '파티클 (개/m³)', placeholder: '예: 125000', c: '#8B5CF6', icon: Wind,
                hint: zone ? `상한: ${Number(zone.partMax).toLocaleString()}` : '' },
              { k: 'pressure', l: '차압 (Pa)', placeholder: '예: 10', c: '#059669', icon: Activity,
                hint: zone ? `허용: ${zone.pressMin}~${zone.pressMax}Pa` : '' },
            ].map(p => {
              const PIcon = p.icon
              const val = form[p.k]
              // 빠른 이탈 판단
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
                    {p.l} {deviated && '⚠ 이탈'}
                  </label>
                  <input value={val} onChange={e => lfld(p.k, e.target.value)} placeholder={p.placeholder} type="number" step="any"
                    style={{ ...IS, borderColor: deviated ? '#FECACA' : undefined, background: deviated ? '#FFF5F5' : undefined }} className="w-full" />
                  {p.hint && <div className="text-[10px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{p.hint}</div>}
                </div>
              )
            })}
          </div>

          <F l="연결 NCR (이탈 시)"><input value={form.ncrId} onChange={e => lfld('ncrId', e.target.value)} placeholder="NCR-2026-00001" style={IS} className="w-full" /></F>
          <F l="비고"><textarea value={form.notes} onChange={e => lfld('notes', e.target.value)} rows={2} style={{ ...IS, resize: 'vertical' }} className="w-full" /></F>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>취소</button>
          <button onClick={onSubmit} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: '#2563EB', color: 'white', border: 'none', cursor: 'pointer' }}>
            {editId ? '수정 저장' : '측정 기록 등록'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 구역 설정 폼 ──────────────────────────────────────────────
function ZoneForm({ form, zfld, editId, onSubmit, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }} onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--line)', width: '100%', maxWidth: 620, boxShadow: '0 24px 64px rgba(0,0,0,0.3)', padding: 28 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="text-[16px] font-bold" style={{ color: 'var(--ink)' }}>{editId ? '구역 수정' : '제조 구역 추가'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)' }}><X size={20} /></button>
        </div>
        <div className="space-y-3">
          <R2>
            <F l="구역 이름 *"><input value={form.name} onChange={e => zfld('name', e.target.value)} placeholder="예: 클린룸 A동" style={IS} className="w-full" /></F>
            <F l="위치"><input value={form.location} onChange={e => zfld('location', e.target.value)} placeholder="예: 2층 생산동" style={IS} className="w-full" /></F>
          </R2>
          <R2>
            <F l="청정도 등급">
              <select value={form.cleanClass} onChange={e => zfld('cleanClass', e.target.value)} style={IS} className="w-full">
                {CLEAN_CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </F>
            <F l="측정 주기">
              <select value={form.monitorFreq} onChange={e => zfld('monitorFreq', e.target.value)} style={IS} className="w-full">
                <option value="realtime">실시간</option>
                <option value="hourly">1시간마다</option>
                <option value="daily">1일 1회</option>
                <option value="weekly">주 1회</option>
                <option value="monthly">월 1회</option>
              </select>
            </F>
          </R2>
          <div className="pt-2" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="text-[12px] font-bold mb-2" style={{ color: 'var(--ink-soft)' }}>허용 범위 설정</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <F l="온도 최솟값 (°C)"><input type="number" step="0.1" value={form.tempMin} onChange={e => zfld('tempMin', parseFloat(e.target.value))} style={IS} className="w-full" /></F>
            <F l="온도 최댓값 (°C)"><input type="number" step="0.1" value={form.tempMax} onChange={e => zfld('tempMax', parseFloat(e.target.value))} style={IS} className="w-full" /></F>
            <F l="습도 최솟값 (%RH)"><input type="number" step="1" value={form.humMin} onChange={e => zfld('humMin', parseFloat(e.target.value))} style={IS} className="w-full" /></F>
            <F l="습도 최댓값 (%RH)"><input type="number" step="1" value={form.humMax} onChange={e => zfld('humMax', parseFloat(e.target.value))} style={IS} className="w-full" /></F>
            <F l="파티클 상한 (개/m³)"><input type="number" step="1" value={form.partMax} onChange={e => zfld('partMax', parseFloat(e.target.value))} style={IS} className="w-full" /></F>
            <div className="grid grid-cols-2 gap-2">
              <F l="차압 최솟값 (Pa)"><input type="number" step="0.5" value={form.pressMin} onChange={e => zfld('pressMin', parseFloat(e.target.value))} style={IS} className="w-full" /></F>
              <F l="최댓값 (Pa)"><input type="number" step="0.5" value={form.pressMax} onChange={e => zfld('pressMax', parseFloat(e.target.value))} style={IS} className="w-full" /></F>
            </div>
          </div>
          <F l="비고"><textarea value={form.description} onChange={e => zfld('description', e.target.value)} rows={2} placeholder="구역 설명 및 특이사항..." style={{ ...IS, resize: 'vertical' }} className="w-full" /></F>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.active !== false} onChange={e => zfld('active', e.target.checked)} style={{ accentColor: '#059669' }} />
            <span className="text-[13px]" style={{ color: 'var(--ink)' }}>활성 구역 (모니터링 대상)</span>
          </label>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>취소</button>
          <button onClick={onSubmit} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: '#2563EB', color: 'white', border: 'none', cursor: 'pointer' }}>
            {editId ? '수정 저장' : '구역 등록'}
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
      <div className="text-[16px] font-bold mb-1" style={{ color: 'var(--ink-soft)' }}>측정 기록 없음</div>
      <div className="text-[13px] mb-5" style={{ color: 'var(--ink-faint)' }}>온도·습도·파티클 측정 결과를 기록하고 이탈 여부를 자동으로 판정합니다</div>
      <button onClick={onAdd} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: '#2563EB', color: 'white', border: 'none', cursor: 'pointer' }}>
        <Plus size={15} /> 측정 기록 추가
      </button>
    </div>
  )
}
