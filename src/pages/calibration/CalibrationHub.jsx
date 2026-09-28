// src/pages/calibration/CalibrationHub.jsx
// ISO 13485 Â§7.6 ì¸¡ì ì¥ì¹ êµì  ê´ë¦¬ íë¸
import React, { useState, useMemo, useEffect } from 'react'
import {
  Plus, Search, Edit3, Trash2, AlertTriangle,
  CheckCircle2, Clock, ChevronDown, ChevronUp,
  X, Wrench, BarChart2, List, Calendar,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import AIDraftButton from '../../components/AIDraftButton'
import { auth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'

const LS_KEY = 'qualytree.calibrations'
let _sbCidCal = null

function lsRead() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}
function lsWrite(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data))
  if (_sbCidCal) {
    supabase.from('company_data').upsert({
      company_id: _sbCidCal, data_type: 'localStorage_sync', data_key: LS_KEY, payload: data,
    }, { onConflict: 'company_id,data_type,data_key' }).catch(console.error)
  }
}

function genId() {
  const y = new Date().getFullYear()
  return `CAL-${y}-${String(Date.now()).slice(-5)}`
}

function addMonths(dateStr, months) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = new Date(dateStr) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function urgencyInfo(nextDate) {
  const days = daysUntil(nextDate)
  if (days === null) return { color: '#6B7280', bg: '#F3F4F6', label: 'ë¯¸ì¤ì ', level: 0 }
  if (days < 0)   return { color: '#DC2626', bg: '#FEE2E2', label: `${Math.abs(days)}ì¼ ì´ê³¼`, level: 3 }
  if (days <= 30) return { color: '#D97706', bg: '#FEF3C7', label: `D-${days}`, level: 2 }
  if (days <= 90) return { color: '#2563EB', bg: '#DBEAFE', label: `D-${days}`, level: 1 }
  return { color: '#059669', bg: '#D1FAE5', label: `D-${days}`, level: 0 }
}

const INTERVALS = [
  { value: 3,  label: '3ê°ì' },
  { value: 6,  label: '6ê°ì' },
  { value: 12, label: '12ê°ì (ì° 1í)' },
  { value: 24, label: '24ê°ì (2ëë§ë¤)' },
  { value: 36, label: '36ê°ì (3ëë§ë¤)' },
]

const CATEGORIES = [
  'ê¸¸ì´Â·ì¹ì', 'ë¬´ê²Â·í', 'ìë ¥Â·ì§ê³µ', 'ì¨ëÂ·ìµë',
  'ì ê¸°Â·ì ì', 'ì ëÂ·ìë', 'ê´íÂ·ìì±', 'ìê°Â·ì£¼íì', 'ê¸°í',
]

const LOCATIONS = ['ìì°ë¼ì¸ A', 'ìì°ë¼ì¸ B', 'íì§ê²ì¬ì¤', 'ì°êµ¬ì', 'ì°½ê³ ', 'ì¬ë¬´ì¤', 'ì¸ë¶ (ê³ ê°ì¬)']

const STATUS_OPTIONS = [
  { value: 'active',    label: 'ì¬ì© ì¤',    color: '#059669', bg: '#D1FAE5' },
  { value: 'expired',   label: 'êµì  ë§ë£',  color: '#DC2626', bg: '#FEE2E2' },
  { value: 'calibrating', label: 'êµì  ì§í ì¤', color: '#D97706', bg: '#FEF3C7' },
  { value: 'retired',   label: 'íê¸°',       color: '#6B7280', bg: '#F3F4F6' },
]

const emptyForm = () => ({
  assetId: '', name: '', model: '', manufacturer: '', serial: '',
  category: '', location: '', interval: 12,
  lastCalDate: '', nextCalDate: '',
  calBody: '', calCertNo: '', calResult: 'pass',
  status: 'active', notes: '',
  createdBy: '', createdAt: '',
})

export default function CalibrationHub() {
  const user = auth.current()
  const companyId = user?.company?.id ?? null
  useEffect(() => { _sbCidCal = companyId }, [companyId])
  useEffect(() => {
    if (!companyId) return
    supabase.from('company_data').select('payload')
      .eq('company_id', companyId).eq('data_type', 'localStorage_sync').eq('data_key', LS_KEY)
      .maybeSingle()
      .then(({ data: row }) => {
        if (row?.payload != null) {
          localStorage.setItem(LS_KEY, JSON.stringify(row.payload))
          setItems(row.payload)
        }
      })
  }, [companyId])
  const [items, setItems] = useState(() => lsRead())
  const [tab, setTab] = useState('list')
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [urgFilter, setUrgFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [editId, setEditId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  const save = (data) => { setItems(data); lsWrite(data) }

  const openNew = () => {
    setForm(emptyForm())
    setEditId(null)
    setShowForm(true)
  }

  const openEdit = (item) => {
    setForm({ ...item })
    setEditId(item.id)
    setShowForm(true)
  }

  const submit = () => {
    if (!form.name) return alert('ì¥ë¹ëªì íììëë¤.')
    const now = new Date().toISOString()
    if (editId) {
      save(items.map(i => i.id === editId ? { ...form, id: editId } : i))
    } else {
      save([{ ...form, id: genId(), createdAt: now, createdBy: user?.name || '-' }, ...items])
    }
    setShowForm(false)
    setEditId(null)
  }

  const remove = (id) => {
    if (!confirm('ì­ì íìê² ìµëê¹?')) return
    save(items.filter(i => i.id !== id))
  }

  const fld = (k, v) => setForm(f => {
    const next = { ...f, [k]: v }
    if (k === 'lastCalDate' || k === 'interval') {
      next.nextCalDate = addMonths(
        k === 'lastCalDate' ? v : f.lastCalDate,
        k === 'interval' ? v : f.interval
      )
    }
    return next
  })

  const filtered = useMemo(() => {
    let list = [...items]
    if (catFilter !== 'all') list = list.filter(i => i.category === catFilter)
    if (urgFilter === 'overdue') list = list.filter(i => daysUntil(i.nextCalDate) < 0)
    if (urgFilter === 'soon')    list = list.filter(i => { const d = daysUntil(i.nextCalDate); return d !== null && d >= 0 && d <= 30 })
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(i => (i.id + i.name + i.model + i.assetId + i.serial).toLowerCase().includes(q))
    }
    return list.sort((a, b) => {
      const da = daysUntil(a.nextCalDate) ?? 9999
      const db = daysUntil(b.nextCalDate) ?? 9999
      return da - db
    })
  }, [items, search, catFilter, urgFilter])

  const stats = useMemo(() => ({
    total:   items.length,
    overdue: items.filter(i => daysUntil(i.nextCalDate) < 0).length,
    soon:    items.filter(i => { const d = daysUntil(i.nextCalDate); return d !== null && d >= 0 && d <= 30 }).length,
    ok:      items.filter(i => { const d = daysUntil(i.nextCalDate); return d !== null && d > 30 }).length,
    retired: items.filter(i => i.status === 'retired').length,
  }), [items])

  const TABS = [
    { key: 'list',     label: 'ì¥ë¹ ëª©ë¡', icon: List },
    { key: 'schedule', label: 'êµì  ì¼ì ', icon: Calendar },
    { key: 'stats',    label: 'íí© ë¶ì', icon: BarChart2 },
  ]

  return (
    <AppLayout user={user} title="êµì  ê´ë¦¬" subtitle="ISO 13485 Â§7.6 Â· ì¸¡ì ì¥ì¹ êµì  ì£¼ê¸° ê´ë¦¬ Â· êµì  ê¸°ë¡">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto">

        {/* ë°°ë */}
        <HubBanner
          title="êµì  ê´ë¦¬"
          subtitle="ISO 13485 Â§7.6 Â· ì¸¡ì ì¥ì¹ êµì  ì£¼ê¸° ê´ë¦¬ Â· êµì  ê¸°ë¡ ì ì§"
          icon={Wrench}
          color="#0891B2"
          quickActions={[
            { label: 'ì¥ë¹ ë±ë¡', icon: Plus, onClick: openNew, primary: true },
          ]}
          workflow={['ì¥ë¹ ìë³', 'êµì  ì£¼ê¸° ì¤ì ', 'êµì  ì¤ì', 'ì±ì ì ë°ê¸', 'ê¸°ë¡ ë³´ê´', 'ë¤ì êµì  ìì½']}
        />

        <div style={{display:'flex',justifyContent:'flex-end',marginBottom:'10px'}}>
          <AIDraftButton docType="calibration" />
        </div>

        {/* KPI ì¹´ë */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'ì´ ì¸¡ì ì¥ì¹', count: stats.total,   color: '#6B7280' },
            { label: 'êµì  ë§ë£',   count: stats.overdue, color: '#DC2626' },
            { label: '30ì¼ ì´ë´',   count: stats.soon,    color: '#D97706' },
            { label: 'êµì  ìí¸',   count: stats.ok,      color: '#059669' },
            { label: 'íê¸°',        count: stats.retired, color: '#9CA3AF' },
          ].map(s => (
            <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="text-[22px] font-bold" style={{ color: s.color }}>{s.count}</div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ë§ë£ ê¸´ê¸ ìë¦¼ */}
        {stats.overdue > 0 && (
          <div className="flex items-center gap-3 p-4 rounded-2xl mb-5" style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}>
            <AlertTriangle size={18} style={{ color: '#DC2626', flexShrink: 0 }} />
            <div className="text-[13px] font-semibold" style={{ color: '#7F1D1D' }}>
              êµì  ë§ë£ ì¥ë¹ {stats.overdue}ê±´ â ì¦ì êµì  íì!
            </div>
          </div>
        )}

        {/* ê°ì ê³¼ì  #29 â êµì  ë§ë£ ìì (D-30 ì´ë´) ì¬ì  ìë¦¼. ë§ë£ ìë¦¼ì ììì ì´ë¯¸
            ì²ë¦¬íë¯ë¡, ì¬ê¸°ìë 'ìì§ ë§ë£ëì§ ììì§ë§ 30ì¼ ì´ë´ë¡ ë¤ê°ì¨' ê²ë§ ìë´ */}
        {stats.soon > 0 && (
          <div className="flex items-center gap-3 p-4 rounded-2xl mb-5" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
            <Clock size={18} style={{ color: '#D97706', flexShrink: 0 }} />
            <div className="text-[13px] font-semibold" style={{ color: '#78350F' }}>
              êµì  ë§ë£ ìì (30ì¼ ì´ë´) ì¥ë¹ {stats.soon}ê±´ â ë¯¸ë¦¬ êµì  ì¼ì ì ì¡ìì£¼ì¸ì.
            </div>
          </div>
        )}

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

        {/* ââ ì¥ë¹ ëª©ë¡ í­ ââ */}
        {tab === 'list' && (
          <>
            <div className="flex gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-[180px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                <Search size={14} style={{ color: 'var(--ink-faint)' }} />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="ì¥ë¹ëª Â· ê´ë¦¬ë²í¸ Â· ìë¦¬ì¼ ê²ì..."
                  className="flex-1 text-[13px] outline-none"
                  style={{ background: 'none', border: 'none', color: 'var(--ink)' }}
                />
              </div>
              <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="px-3 py-2 rounded-xl text-[13px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
                <option value="all">ì ì²´ ì í</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={urgFilter} onChange={e => setUrgFilter(e.target.value)} className="px-3 py-2 rounded-xl text-[13px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
                <option value="all">ì ì²´ ìí</option>
                <option value="overdue">ë§ë£ë ê²ë§</option>
                <option value="soon">30ì¼ ì´ë´</option>
              </select>
              <button
                onClick={openNew}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold"
                style={{ background: '#0891B2', color: 'white', border: 'none', cursor: 'pointer' }}
              >
                <Plus size={14} /> ì¥ë¹ ë±ë¡
              </button>
            </div>

            {filtered.length === 0 ? (
              <EmptyState onAdd={openNew} />
            ) : (
              <div className="space-y-2">
                {filtered.filter(i => i.status !== 'retired').map(item => (
                  <CalItem
                    key={item.id}
                    item={item}
                    expanded={expandedId === item.id}
                    onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    onEdit={() => openEdit(item)}
                    onDelete={() => remove(item.id)}
                  />
                ))}
                {filtered.filter(i => i.status === 'retired').length > 0 && (
                  <div className="mt-4">
                    <div className="text-[11px] font-semibold mb-2 px-1" style={{ color: 'var(--ink-faint)' }}>íê¸° ì¥ë¹</div>
                    {filtered.filter(i => i.status === 'retired').map(item => (
                      <CalItem key={item.id} item={item} expanded={expandedId === item.id} onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)} onEdit={() => openEdit(item)} onDelete={() => remove(item.id)} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {tab === 'schedule' && <ScheduleView items={items} />}
        {tab === 'stats' && <StatsView items={items} />}
      </div>

      {showForm && <CalForm form={form} fld={fld} editId={editId} onSubmit={submit} onClose={() => setShowForm(false)} />}
    </AppLayout>
  )
}

// ââ ì¥ë¹ í âââââââââââââââââââââââââââââââââââââââââââââââââââ
function CalItem({ item, expanded, onToggle, onEdit, onDelete }) {
  const urg = urgencyInfo(item.nextCalDate)
  const stInfo = STATUS_OPTIONS.find(s => s.value === item.status) || STATUS_OPTIONS[0]

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={onToggle} style={{ borderBottom: expanded ? '1px solid var(--line)' : 'none' }}>
        <div className="w-16 flex-shrink-0 text-center py-1.5 rounded-xl" style={{ background: urg.bg }}>
          <div className="text-[11px] font-bold" style={{ color: urg.color }}>{urg.label}</div>
          <div className="text-[9px] mt-0.5" style={{ color: urg.color, opacity: 0.75 }}>êµì ì¼</div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px]" style={{ color: 'var(--ink-faint)' }}>{item.id}</span>
            {item.assetId && <span className="font-mono text-[10px]" style={{ color: 'var(--ink-faint)' }}>[{item.assetId}]</span>}
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: stInfo.bg, color: stInfo.color, fontWeight: 600 }}>{stInfo.label}</span>
            {item.category && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>{item.category}</span>}
          </div>
          <div className="text-[14px] font-semibold mt-0.5 truncate" style={{ color: 'var(--ink)' }}>{item.name}</div>
          <div className="text-[12px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
            {item.model && `${item.model} Â· `}{item.location || '-'} Â· êµì ì£¼ê¸° {INTERVALS.find(i => i.value === item.interval)?.label || `${item.interval}ê°ì`}
          </div>
        </div>

        <div className="text-right flex-shrink-0 mr-2">
          <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>ë¤ì êµì ì¼</div>
          <div className="text-[13px] font-bold" style={{ color: urg.color }}>{item.nextCalDate || '-'}</div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={e => { e.stopPropagation(); onEdit() }} className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)', border: 'none', cursor: 'pointer' }}>
            <Edit3 size={14} />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete() }} className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', cursor: 'pointer' }}>
            <Trash2 size={13} />
          </button>
          {expanded ? <ChevronUp size={16} style={{ color: 'var(--ink-faint)' }} /> : <ChevronDown size={16} style={{ color: 'var(--ink-faint)' }} />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <SLabel>ì¥ë¹ ì ë³´</SLabel>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              {[
                ['ì ì¡°ì¬', item.manufacturer],
                ['ëª¨ë¸ëª', item.model],
                ['ìë¦¬ì¼ ë²í¸', item.serial],
                ['ì¤ì¹ ìì¹', item.location],
                ['ê´ë¦¬ ë²í¸', item.assetId],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td style={{ padding: '3px 8px 3px 0', color: 'var(--ink-faint)', whiteSpace: 'nowrap', width: 80 }}>{k}</td>
                  <td style={{ padding: '3px 0', color: 'var(--ink)' }}>{v || '-'}</td>
                </tr>
              ))}
            </table>
          </div>
          <div>
            <SLabel>ìµê·¼ êµì  ì ë³´</SLabel>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              {[
                ['ìµì¢ êµì ì¼', item.lastCalDate],
                ['ë¤ì êµì ì¼', item.nextCalDate],
                ['êµì  ê¸°ê´', item.calBody],
                ['ì±ì ì ë²í¸', item.calCertNo],
                ['êµì  ê²°ê³¼', item.calResult === 'pass' ? 'â í©ê²©' : 'â ë¶í©ê²©'],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td style={{ padding: '3px 8px 3px 0', color: 'var(--ink-faint)', whiteSpace: 'nowrap', width: 85 }}>{k}</td>
                  <td style={{ padding: '3px 0', color: 'var(--ink)', fontWeight: k === 'êµì  ê²°ê³¼' ? 700 : 400 }}>{v || '-'}</td>
                </tr>
              ))}
            </table>
          </div>
          {item.notes && (
            <div className="md:col-span-2">
              <SLabel>ë¹ê³ </SLabel>
              <div className="text-[12px] p-2 rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink)' }}>{item.notes}</div>
            </div>
          )}
          <div className="md:col-span-2 text-[11px]" style={{ color: 'var(--ink-faint)' }}>
            ë±ë¡: {item.createdBy} Â· {item.createdAt?.slice(0, 10) || '-'}
          </div>
        </div>
      )}
    </div>
  )
}

function SLabel({ children }) {
  return <div className="text-[11px] font-bold mb-2" style={{ color: 'var(--ink-faint)' }}>{children}</div>
}

// ââ êµì  ì¼ì  íìë¼ì¸ ââââââââââââââââââââââââââââââââââââââââ
function ScheduleView({ items }) {
  const active = items.filter(i => i.status !== 'retired' && i.nextCalDate)
  const sorted = [...active].sort((a, b) => a.nextCalDate.localeCompare(b.nextCalDate))

  const byMonth = {}
  sorted.forEach(item => {
    const month = item.nextCalDate.slice(0, 7)
    if (!byMonth[month]) byMonth[month] = []
    byMonth[month].push(item)
  })

  if (sorted.length === 0) {
    return (
      <div className="text-center py-20" style={{ color: 'var(--ink-faint)' }}>
        <Calendar size={40} strokeWidth={1.2} className="mx-auto mb-3 opacity-30" />
        <div>ì¥ë¹ë¥¼ ë±ë¡íê³  êµì ì¼ì ìë ¥íë©´ ì¼ì ì´ íìë©ëë¤</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {Object.entries(byMonth).map(([month, monthItems]) => {
        const [y, m] = month.split('-')
        const monthLabel = `${y}ë ${+m}ì`
        return (
          <div key={month}>
            <div className="flex items-center gap-3 mb-2">
              <div className="text-[13px] font-bold px-3 py-1 rounded-full" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
                ð {monthLabel}
              </div>
              <div className="h-px flex-1" style={{ background: 'var(--line)' }} />
              <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>{monthItems.length}ê±´</div>
            </div>
            <div className="space-y-2 ml-4">
              {monthItems.map(item => {
                const urg = urgencyInfo(item.nextCalDate)
                return (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: `1px solid ${urg.color}30` }}>
                    <div className="w-12 text-center py-1 rounded-lg flex-shrink-0" style={{ background: urg.bg }}>
                      <div className="text-[11px] font-bold" style={{ color: urg.color }}>{urg.label}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--ink)' }}>{item.name}</div>
                      <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{item.nextCalDate} Â· {item.calBody || 'êµì ê¸°ê´ ë¯¸ì§ì '}</div>
                    </div>
                    <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{item.location}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ââ íí© ë¶ì í­ âââââââââââââââââââââââââââââââââââââââââââââ
function StatsView({ items }) {
  const active = items.filter(i => i.status !== 'retired')
  const byCat = {}
  CATEGORIES.forEach(c => { byCat[c] = items.filter(i => i.category === c).length })
  const maxCat = Math.max(...Object.values(byCat), 1)

  const byLoc = {}
  active.forEach(i => {
    const loc = i.location || 'ë¯¸ì§ì '
    byLoc[loc] = (byLoc[loc] || 0) + 1
  })

  const complianceRate = active.length === 0 ? 0
    : Math.round(active.filter(i => daysUntil(i.nextCalDate) >= 0).length / active.length * 100)

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="text-[13px] font-bold mb-4" style={{ color: 'var(--ink)' }}>êµì  ì¤ìì¨</div>
        <div className="flex items-center justify-center">
          <div className="relative w-36 h-36">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="var(--line)" strokeWidth="10" />
              <circle
                cx="50" cy="50" r="40" fill="none"
                stroke={complianceRate >= 90 ? '#10B981' : complianceRate >= 70 ? '#F59E0B' : '#EF4444'}
                strokeWidth="10"
                strokeDasharray={`${complianceRate * 2.513} 251.3`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-[28px] font-bold" style={{ color: complianceRate >= 90 ? '#10B981' : complianceRate >= 70 ? '#F59E0B' : '#EF4444' }}>
                {complianceRate}%
              </div>
              <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>ì¤ìì¨</div>
            </div>
          </div>
        </div>
        <div className="mt-3 text-center text-[12px]" style={{ color: 'var(--ink-faint)' }}>
          {active.filter(i => daysUntil(i.nextCalDate) >= 0).length} / {active.length} ì¥ë¹ êµì  ì í¨
        </div>
      </div>

      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="text-[13px] font-bold mb-4" style={{ color: 'var(--ink)' }}>ì íë³ ì¥ë¹ ì</div>
        <div className="space-y-2">
          {CATEGORIES.filter(c => byCat[c] > 0).map(c => (
            <div key={c} className="flex items-center gap-2">
              <div className="text-[11px] w-20 flex-shrink-0" style={{ color: 'var(--ink-soft)' }}>{c}</div>
              <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: 'var(--bg-soft)' }}>
                <div className="h-full rounded-full" style={{ width: `${(byCat[c] / maxCat) * 100}%`, background: '#0891B2' }} />
              </div>
              <div className="text-[11px] font-bold w-5 text-right" style={{ color: 'var(--ink)' }}>{byCat[c]}</div>
            </div>
          ))}
          {Object.values(byCat).every(v => v === 0) && (
            <div className="text-[12px] text-center py-4" style={{ color: 'var(--ink-faint)' }}>ì¥ë¹ë¥¼ ë±ë¡íë©´ ë¶í¬ê° íìë©ëë¤</div>
          )}
        </div>
      </div>

      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="text-[13px] font-bold mb-4" style={{ color: 'var(--ink)' }}>ìì¹ë³ ì¥ë¹ íí©</div>
        {Object.keys(byLoc).length === 0 ? (
          <div className="text-[12px] text-center py-4" style={{ color: 'var(--ink-faint)' }}>ë±ë¡ë ì¥ë¹ ìì</div>
        ) : (
          <div className="space-y-2">
            {Object.entries(byLoc).sort((a, b) => b[1] - a[1]).map(([loc, cnt]) => (
              <div key={loc} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
                <span className="text-[12px]" style={{ color: 'var(--ink)' }}>{loc}</span>
                <span className="text-[12px] font-bold px-2 py-0.5 rounded" style={{ background: '#0891B215', color: '#0891B2' }}>{cnt}ë</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="text-[13px] font-bold mb-4" style={{ color: 'var(--ink)' }}>ì´ë² ë¬ êµì  ìì </div>
        {(() => {
          const thisMonth = new Date().toISOString().slice(0, 7)
          const thisMonthItems = active.filter(i => i.nextCalDate?.startsWith(thisMonth))
          return thisMonthItems.length === 0 ? (
            <div className="text-[12px] text-center py-4" style={{ color: 'var(--ink-faint)' }}>ì´ë² ë¬ êµì  ìì  ìì</div>
          ) : (
            <div className="space-y-2">
              {thisMonthItems.map(i => {
                const urg = urgencyInfo(i.nextCalDate)
                return (
                  <div key={i.id} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: urg.bg }}>
                    <div className="text-[11px] font-bold w-16" style={{ color: urg.color }}>{i.nextCalDate.slice(5)}</div>
                    <div className="text-[12px] truncate" style={{ color: 'var(--ink)' }}>{i.name}</div>
                  </div>
                )
              })}
            </div>
          )
        })()}
      </div>
    </div>
  )
}

// ââ ì¥ë¹ ë±ë¡/ìì  í¼ ëª¨ë¬ ââââââââââââââââââââââââââââââââââââ
function CalForm({ form, fld, editId, onSubmit, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px', overflowY: 'auto' }} onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--line)', width: '100%', maxWidth: 660, boxShadow: '0 24px 64px rgba(0,0,0,0.3)', padding: 28 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="text-[16px] font-bold" style={{ color: 'var(--ink)' }}>{editId ? 'ì¥ë¹ ì ë³´ ìì ' : 'ì¸¡ì ì¥ì¹ ë±ë¡'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)' }}><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <Row2>
            <FField label="ì¥ë¹ëª *">
              <input value={form.name} onChange={e => fld('name', e.target.value)} placeholder="ì: ë²ëì´ ìºë¦¬í¼ì¤" className="w-full" style={IS} />
            </FField>
            <FField label="ê´ë¦¬ ë²í¸ (ìì° ë²í¸)">
              <input value={form.assetId} onChange={e => fld('assetId', e.target.value)} placeholder="ì: EQP-001" className="w-full" style={IS} />
            </FField>
          </Row2>
          <Row2>
            <FField label="ì ì¡°ì¬">
              <input value={form.manufacturer} onChange={e => fld('manufacturer', e.target.value)} placeholder="ì: Mitutoyo" className="w-full" style={IS} />
            </FField>
            <FField label="ëª¨ë¸ëª">
              <input value={form.model} onChange={e => fld('model', e.target.value)} placeholder="ì: 530-119" className="w-full" style={IS} />
            </FField>
          </Row2>
          <Row2>
            <FField label="ìë¦¬ì¼ ë²í¸">
              <input value={form.serial} onChange={e => fld('serial', e.target.value)} placeholder="ìë¦¬ì¼ ë²í¸" className="w-full" style={IS} />
            </FField>
            <FField label="ì í">
              <select value={form.category} onChange={e => fld('category', e.target.value)} className="w-full" style={IS}>
                <option value="">ì í...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FField>
          </Row2>
          <Row2>
            <FField label="ì¤ì¹ ìì¹">
              <select value={form.location} onChange={e => fld('location', e.target.value)} className="w-full" style={IS}>
                <option value="">ì í...</option>
                {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </FField>
            <FField label="êµì  ì£¼ê¸°">
              <select value={form.interval} onChange={e => fld('interval', +e.target.value)} className="w-full" style={IS}>
                {INTERVALS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
              </select>
            </FField>
          </Row2>

          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-soft)' }}>
            <div className="text-[12px] font-bold mb-3" style={{ color: 'var(--ink-soft)' }}>ìµê·¼ êµì  ì ë³´</div>
            <Row2>
              <FField label="ìµì¢ êµì ì¼ (ìë ¥ ì ë¤ì êµì ì¼ ìë ê³ì°)">
                <input type="date" value={form.lastCalDate} onChange={e => fld('lastCalDate', e.target.value)} className="w-full" style={IS} />
              </FField>
              <FField label="ë¤ì êµì ì¼ (ìë ê³ì°)">
                <input type="date" value={form.nextCalDate} onChange={e => fld('nextCalDate', e.target.value)} className="w-full" style={{ ...IS, background: form.lastCalDate ? '#F0FDF4' : 'var(--bg-card)' }} />
              </FField>
            </Row2>
            <Row2>
              <FField label="êµì  ê¸°ê´">
                <input value={form.calBody} onChange={e => fld('calBody', e.target.value)} placeholder="ì: íêµ­êµì ì°êµ¬ì" className="w-full" style={IS} />
              </FField>
              <FField label="êµì  ì±ì ì ë²í¸">
                <input value={form.calCertNo} onChange={e => fld('calCertNo', e.target.value)} placeholder="ì: KCL-2026-00123" className="w-full" style={IS} />
              </FField>
            </Row2>
            <Row2>
              <FField label="êµì  ê²°ê³¼">
                <select value={form.calResult} onChange={e => fld('calResult', e.target.value)} className="w-full" style={IS}>
                  <option value="pass">â í©ê²©</option>
                  <option value="fail">â ë¶í©ê²© (ìë¦¬/íê¸° íì)</option>
                </select>
              </FField>
              <FField label="ìí">
                <select value={form.status} onChange={e => fld('status', e.target.value)} className="w-full" style={IS}>
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </FField>
            </Row2>
          </div>

          <FField label="ë¹ê³ ">
            <textarea value={form.notes} onChange={e => fld('notes', e.target.value)} rows={2} placeholder="í¹ì´ì¬í­..." className="w-full" style={{ ...IS, resize: 'vertical' }} />
          </FField>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>ì·¨ì</button>
          <button onClick={onSubmit} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: '#0891B2', color: 'white', border: 'none', cursor: 'pointer' }}>
            {editId ? 'ìì  ì ì¥' : 'ì¥ë¹ ë±ë¡'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Row2({ children }) { return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div> }
function FField({ label, children }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-faint)' }}>{label}</label>
      {children}
    </div>
  )
}
const IS = { border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--ink)', background: 'var(--bg-card)', outline: 'none' }

function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <Wrench size={48} strokeWidth={1} className="mx-auto mb-3 opacity-30" style={{ color: '#0891B2' }} />
      <div className="text-[16px] font-bold mb-1" style={{ color: 'var(--ink-soft)' }}>ë±ë¡ë ì¸¡ì ì¥ì¹ ìì</div>
      <div className="text-[13px] mb-5" style={{ color: 'var(--ink-faint)' }}>ë²ëì´ ìºë¦¬í¼ì¤, ë§ì´í¬ë¡ë¯¸í°, ì¨ëê³ ë± êµì ì´ íìí ì¥ë¹ë¥¼ ë±ë¡íì¸ì</div>
      <button onClick={onAdd} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: '#0891B2', color: 'white', border: 'none', cursor: 'pointer' }}>
        <Plus size={15} /> ì²« ë²ì§¸ ì¥ë¹ ë±ë¡
      </button>
    </div>
  )
}
