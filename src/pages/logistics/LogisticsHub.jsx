import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Truck,
  PackageCheck,
  PackageOpen,
  Route,
  AlertOctagon,
  Plus,
  Trash2,
  ClipboardCheck,
  Save,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'
import { supabase } from '../../lib/supabaseClient'
import { permissions, requirePermission } from '../../lib/permissions'
import { logs, adverseEvents, LOG_TYPE, AE_STATUS } from '../../lib/logisticsState'
let _sbCidLog = null

const LOG_TYPE_LIST = Object.values(LOG_TYPE)
const LOG_ICON = {
  [LOG_TYPE.IMPORT_INSPECTION]: PackageCheck,
  [LOG_TYPE.RECEIVING]: PackageOpen,
  [LOG_TYPE.SHIPPING]: Truck,
  [LOG_TYPE.DISTRIBUTION]: Route,
}

export default function LogisticsHub() {
  const user = auth.current()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState(() => searchParams.get('tab') || 'logs')
  const [tick, setTick] = useState(0)
  const refresh = () => setTick((x) => x + 1)
  const [toast, setToast] = useState(null)
  const showToast = (t) => { setToast(t); setTimeout(() => setToast(null), 2400) }

  const allLogs = logs.getAll()
  const allAe = adverseEvents.getAll()
  const openAe = allAe.filter((a) => a.status !== AE_STATUS.CLOSED)

  return (
    <AppLayout user={user} title="ìì¶ê³ Â·ì íµê´ë¦¬" subtitle="ììê²ì¬ / ìê³  / ì¶ê³  / ì íµê¸°ë¡ Â· ì´ìì¬ë¡ ë³´ê³ ">
      <HubBanner icon={Truck} title="ë¬¼ë¥ ê´ë¦¬" subtitle="ë¬¼ë¥Â·ì¬ê³  ê´ë¦¬" color="#EA580C" />
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto fade-in">
        {toast && (
          <div
            className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-lg text-[13px] flex items-center gap-2 fade-in"
            style={{ background: 'var(--moss)', color: 'var(--bg)', boxShadow: '0 6px 20px rgba(15,26,20,0.18)', fontWeight: 500 }}
          >
            â {toast}
          </div>
        )}

        <div className="mb-5">
          <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--moss)' }}>
            LOG Â· IMPORT / DISTRIBUTION RECORDS
          </span>
          <div className="font-display text-[26px] mt-1" style={{ color: 'var(--ink)', fontWeight: 500 }}>
            ìì¶ê³ Â·ì íµê´ë¦¬
          </div>
          <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>
            KGMP ìì í ì ì§ê´ë¦¬ â ììê²ì¬Â·ìê³ Â·ì¶ê³ Â·ì íµê¸°ë¡ê³¼ ì´ìì¬ë¡ ë³´ê³  ê¸°ë¡ì ê´ë¦¬í©ëë¤.
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <StatCard label="ì ì²´ ê¸°ë¡" value={allLogs.length} hint="ììê²ì¬Â·ìê³ Â·ì¶ê³ Â·ì íµ í©ê³" icon={PackageCheck} />
          <StatCard label="ì´ìì¬ë¡ ë³´ê³ " value={allAe.length} hint="ëì  ë±ë¡ ê±´ì" icon={AlertOctagon} />
          <StatCard label="ì¡°ì¬ì¤Â·ë¯¸ì¢ê²°" value={openAe.length} hint="ì¡°ì¬ì¤ + ë³´ê³ ìë£" icon={AlertOctagon} tone={openAe.length > 0 ? 'amber' : undefined} />
        </div>

        <div className="flex gap-1 mb-5 overflow-x-auto" style={{ borderBottom: '1px solid var(--line)' }}>
          <TabButton active={tab === 'logs'} onClick={() => setTab('logs')} icon={Truck} label="ììê²ì¬Â·ìê³ Â·ì¶ê³ Â·ì íµê¸°ë¡" en="LOGS" count={allLogs.length} />
          <TabButton active={tab === 'ae'} onClick={() => setTab('ae')} icon={AlertOctagon} label="ì´ìì¬ë¡ ë³´ê³ " en="ADVERSE EVENTS" count={allAe.length} />
        <TabButton active={tab==='release'} onClick={()=>setTab('release')} icon={ClipboardCheck} label={[52636,54616,32,49849,51064,183,54032,51221].map(c=>String.fromCodePoint(c)).join('')} en="RELEASE APPROVAL" />
        </div>

        {tab === 'logs' && <LogsTab key={'logs' + tick} onAction={showToast} refresh={refresh} />}
        {tab === 'ae' && <AeTab key={'ae' + tick} onAction={showToast} refresh={refresh} />}
      {tab === 'release' && <ReleaseTab />}
      </div>
    </AppLayout>
  )
}

/* ================================================================
   ììê²ì¬Â·ìê³ Â·ì¶ê³ Â·ì íµê¸°ë¡
   ================================================================ */
const EMPTY_LOG = { type: LOG_TYPE.IMPORT_INSPECTION, date: '', productName: '', lotNo: '', qty: '', partner: '', result: '', notes: '' }

function LogsTab({ onAction, refresh }) {
  const canEdit = permissions.can('logistics.edit')
  const [filter, setFilter] = useState('ALL')
  const [list, setList] = useState(() => logs.getAll())
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY_LOG)
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const save = () => {
    if (!requirePermission('logistics.edit')) return
    if (!form.productName.trim()) return
    logs.add(form)
    setList(logs.getAll())
    setForm(EMPTY_LOG)
    setAdding(false)
    onAction('ê¸°ë¡ì´ ë±ë¡ëììµëë¤.')
    refresh()
  }

  const del = (id) => {
    if (!requirePermission('logistics.edit')) return
    if (!window.confirm('ì´ ê¸°ë¡ì ì­ì í ê¹ì?')) return
    logs.delete(id)
    setList(logs.getAll())
    onAction('ê¸°ë¡ì´ ì­ì ëììµëë¤.')
    refresh()
  }

  const shown = filter === 'ALL' ? list : list.filter((l) => l.type === filter)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        <FilterChip active={filter === 'ALL'} onClick={() => setFilter('ALL')} label="ì ì²´" count={list.length} />
        {LOG_TYPE_LIST.map((t) => (
          <FilterChip key={t} active={filter === t} onClick={() => setFilter(t)} label={t} count={list.filter((l) => l.type === t).length} />
        ))}
      </div>

      {canEdit && !adding && (
        <button onClick={() => setAdding(true)} className="btn-ghost text-[12px]">
          <Plus size={12} /> ê¸°ë¡ ì¶ê°
        </button>
      )}

      {adding && (
        <div className="card-base p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <SelectField label="êµ¬ë¶" value={form.type} onChange={(v) => setF('type', v)} options={LOG_TYPE_LIST} />
            <Field label="ì¼ì" value={form.date} onChange={(v) => setF('date', v)} type="date" />
            <Field label="ì íëª" value={form.productName} onChange={(v) => setF('productName', v)} placeholder="ì íëª" />
            <Field label="LOT No." value={form.lotNo} onChange={(v) => setF('lotNo', v)} placeholder="ì: L2026-0713" />
            <Field label="ìë" value={form.qty} onChange={(v) => setF('qty', v)} placeholder="ì: 50" />
            <Field label="ê±°ëì²(ê³µê¸ì/ê³ ê°)" value={form.partner} onChange={(v) => setF('partner', v)} placeholder="ê³µê¸ì ëë ê³ ê°ì¬ëª" />
            <Field label="ê²°ê³¼/ìí" value={form.result} onChange={(v) => setF('result', v)} placeholder="ì: ì í©, ìë£" />
          </div>
          <TextAreaField label="ë¹ê³ " value={form.notes} onChange={(v) => setF('notes', v)} placeholder="ì í ìë ¥" />
          <div className="flex gap-2">
            <button onClick={save} className="btn-primary text-[12.5px]"><Save size={13} /> ì ì¥</button>
            <button onClick={() => { setAdding(false); setForm(EMPTY_LOG) }} className="btn-ghost text-[12.5px]">ì·¨ì</button>
          </div>
        </div>
      )}

      {shown.length === 0 && !adding && <EmptyState icon={Truck} text="ë±ë¡ë ê¸°ë¡ì´ ììµëë¤." />}

      {shown.length > 0 && (
        <div className="space-y-2">
          {shown.map((l) => {
            const Icon = LOG_ICON[l.type] || Truck
            return (
              <div key={l.id} className="card-base p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--leaf-soft)', color: 'var(--moss)' }}>
                      <Icon size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge text={l.type} tone="slate" />
                        <span className="text-[13.5px] font-medium" style={{ color: 'var(--ink)' }}>{l.productName || '(ì íëª ë¯¸ìë ¥)'}</span>
                      </div>
                      <div className="text-[11.5px] mt-1" style={{ color: 'var(--ink-mute)' }}>
                        {l.date || 'ì¼ì ë¯¸ìë ¥'} Â· LOT {l.lotNo || 'â'} Â· ìë {l.qty || 'â'} Â· {l.partner || 'ê±°ëì² ë¯¸ìë ¥'}
                      </div>
                      {l.result && <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-soft)' }}>ê²°ê³¼: {l.result}</div>}
                      {l.notes && <div className="text-[11.5px] mt-1" style={{ color: 'var(--ink-faint)' }}>{l.notes}</div>}
                    </div>
                  </div>
                  {canEdit && (
                    <button onClick={() => del(l.id)} className="shrink-0 opacity-50 hover:opacity-100" title="ì­ì ">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ================================================================
   ì´ìì¬ë¡ ë³´ê³ 
   ================================================================ */
const EMPTY_AE = { date: '', productName: '', lotNo: '', description: '', severity: '', reporter: '', status: AE_STATUS.OPEN, actionTaken: '', reportedTo: '', reportedDate: '' }

function AeTab({ onAction, refresh }) {
  const canEdit = permissions.can('logistics.edit')
  const [list, setList] = useState(() => adverseEvents.getAll())
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY_AE)
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const save = () => {
    if (!requirePermission('logistics.edit')) return
    if (!form.description.trim()) return
    adverseEvents.add(form)
    setList(adverseEvents.getAll())
    setForm(EMPTY_AE)
    setAdding(false)
    onAction('ì´ìì¬ë¡ê° ë±ë¡ëììµëë¤.')
    refresh()
  }

  const del = (id) => {
    if (!requirePermission('logistics.edit')) return
    if (!window.confirm('ì´ ì´ìì¬ë¡ ê¸°ë¡ì ì­ì í ê¹ì?')) return
    adverseEvents.delete(id)
    setList(adverseEvents.getAll())
    onAction('ì´ìì¬ë¡ ê¸°ë¡ì´ ì­ì ëììµëë¤.')
    refresh()
  }

  const setStatus = (id, status) => {
    if (!requirePermission('logistics.edit')) return
    adverseEvents.update(id, { status })
    setList(adverseEvents.getAll())
    refresh()
  }

  return (
    <div className="space-y-3">
      {canEdit && !adding && (
        <button onClick={() => setAdding(true)} className="btn-ghost text-[12px]">
          <Plus size={12} /> ì´ìì¬ë¡ ë±ë¡
        </button>
      )}

      {adding && (
        <div className="card-base p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Field label="ë°ìì¼" value={form.date} onChange={(v) => setF('date', v)} type="date" />
            <Field label="ì íëª" value={form.productName} onChange={(v) => setF('productName', v)} placeholder="ì íëª" />
            <Field label="LOT No." value={form.lotNo} onChange={(v) => setF('lotNo', v)} placeholder="ì: L2026-0713" />
            <Field label="ì¬ê°ë" value={form.severity} onChange={(v) => setF('severity', v)} placeholder="ì: ê²½ë¯¸/ì¤ë" />
            <Field label="ë³´ê³ ì" value={form.reporter} onChange={(v) => setF('reporter', v)} placeholder="ë³´ê³ ìëª" />
            <SelectField label="ìí" value={form.status} onChange={(v) => setF('status', v)} options={Object.values(AE_STATUS)} />
          </div>
          <TextAreaField label="ì¬ë¡ ë´ì©" value={form.description} onChange={(v) => setF('description', v)} placeholder="ë°ì ê²½ì ë° ì¦ìì ìë ¥íì¸ì" />
          <TextAreaField label="ì¡°ì¹ ë´ì©" value={form.actionTaken} onChange={(v) => setF('actionTaken', v)} placeholder="ì í ìë ¥" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="ë³´ê³ ì²(ê·ì ê¸°ê´ ë±)" value={form.reportedTo} onChange={(v) => setF('reportedTo', v)} placeholder="ì: ìíìì½íìì ì²" />
            <Field label="ë³´ê³ ì¼" value={form.reportedDate} onChange={(v) => setF('reportedDate', v)} type="date" />
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="btn-primary text-[12.5px]"><Save size={13} /> ì ì¥</button>
            <button onClick={() => { setAdding(false); setForm(EMPTY_AE) }} className="btn-ghost text-[12.5px]">ì·¨ì</button>
          </div>
        </div>
      )}

      {list.length === 0 && !adding && <EmptyState icon={AlertOctagon} text="ë±ë¡ë ì´ìì¬ë¡ê° ììµëë¤." />}

      {list.length > 0 && (
        <div className="space-y-2">
          {list.map((a) => {
            const tone = a.status === AE_STATUS.CLOSED ? 'emerald' : a.status === AE_STATUS.REPORTED ? 'amber' : 'rose'
            return (
              <div key={a.id} className="card-base p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge text={a.status} tone={tone} />
                      <span className="text-[13.5px] font-medium" style={{ color: 'var(--ink)' }}>{a.productName || '(ì íëª ë¯¸ìë ¥)'}</span>
                      <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{a.date || 'ë°ìì¼ ë¯¸ìë ¥'}</span>
                    </div>
                    <div className="text-[12px] mt-1" style={{ color: 'var(--ink-soft)' }}>{a.description}</div>
                    {a.actionTaken && <div className="text-[11.5px] mt-1" style={{ color: 'var(--ink-faint)' }}>ì¡°ì¹: {a.actionTaken}</div>}
                    {a.reportedTo && <div className="text-[11.5px] mt-1" style={{ color: 'var(--ink-faint)' }}>ë³´ê³ ì²: {a.reportedTo} ({a.reportedDate || 'â'})</div>}
                    {canEdit && (
                      <div className="flex gap-1.5 mt-2">
                        {Object.values(AE_STATUS).map((st) => (
                          <button
                            key={st}
                            onClick={() => setStatus(a.id, st)}
                            className="text-[10.5px] px-2 py-1 rounded-full"
                            style={{
                              background: a.status === st ? 'var(--moss)' : 'var(--bg-soft)',
                              color: a.status === st ? 'var(--bg)' : 'var(--ink-mute)',
                              fontWeight: a.status === st ? 600 : 400,
                            }}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {canEdit && (
                    <button onClick={() => del(a.id)} className="shrink-0 opacity-50 hover:opacity-100" title="ì­ì ">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ================================================================
   ê³µíµ UI
   ================================================================ */
function StatCard({ label, value, hint, icon: Icon, tone }) {
  return (
    <div className="card-base p-4 flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: tone === 'amber' ? 'var(--amber-soft)' : 'var(--leaf-soft)', color: tone === 'amber' ? 'var(--amber)' : 'var(--moss)' }}
      >
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <div className="text-[11.5px]" style={{ color: 'var(--ink-mute)' }}>{label}</div>
        <div className="text-[20px] font-bold tabular-nums" style={{ color: 'var(--ink)' }}>{value}</div>
        <div className="text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>{hint}</div>
      </div>
    </div>
  )
}

function ReleaseTab() {
  const LS = 'qualytree.release_approvals'
  const load = () => { try { return JSON.parse(localStorage.getItem(LS)||'[]') } catch { return [] } }
  const [records, setRecords] = React.useState(load)
  const EMPTY = {lotNo:'',productName:'',qty:'',verdict:'í©ê²©',inspector:'',signerName:'',signerTitle:'',notes:''}
  const [form, setForm] = React.useState(EMPTY)
  const [showForm, setShowForm] = React.useState(false)
  const user = auth.current()
  const companyId = user?.company_id
  useEffect(() => { _sbCidLog = companyId }, [companyId])
  useEffect(() => {
    if (!companyId) return
    supabase.from('company_data')
      .select('payload')
      .eq('company_id', companyId)
      .eq('data_type', 'localStorage_sync')
      .eq('data_key', LS)
      .maybeSingle()
      .then(({ data: sbData }) => {
        if (sbData?.payload) {
          setRecords(sbData.payload)
        }
      })
  }, [companyId])

  const save = arr => {
    localStorage.setItem(LS, JSON.stringify(arr))
    if (_sbCidLog) {
      supabase.from('company_data').upsert({
        company_id: _sbCidLog, data_type: 'localStorage_sync',
        data_key: LS, payload: arr
      }, { onConflict: 'company_id,data_type,data_key' })
    }
  }
  const F = (k,v) => setForm(p=>({...p,[k]:v}))

  const handleSubmit = () => {
    if (!form.lotNo || !form.productName) return alert('ë¡í¸ë²í¸ì ì íëªì íììëë¤')
    save([{id:Date.now(),...form,signedAt:new Date().toISOString()},...records])
    setForm(EMPTY); setShowForm(false)
  }

  const handleDelete = id => {
    if (!confirm('ì­ì íìê² ìµëê¹?')) return
    save(records.filter(r=>r.id!==id))
  }

  const handlePrint = rec => {
    const vcls = rec.verdict==='í©ê²©'?'green':rec.verdict==='ë¶í©ê²©'?'red':'orange'
    const html = '<'+'!DOCTYPE html><html><head><meta charset="utf-8"><title>ì¶ííì í<\/title><style>body{font-family:sans-serif;margin:40px}h2{text-align:center}table{width:100%;border-collapse:collapse}td,th{border:1px solid #333;padding:8px}th{background:#f0f0f0;width:140px}.v{font-weight:bold;color:'+vcls+'}.sig{margin-top:40px;text-align:right}<\/style><\/head><body><h2>ì¶í íì í<\/h2><table><tr><th>Lot No.<\/th><td>'+rec.lotNo+'<\/td><th>ì íëª<\/th><td>'+rec.productName+'<\/td><\/tr><tr><th>ìë<\/th><td>'+(rec.qty||'-')+'<\/td><th>íì ì¼<\/th><td>'+(rec.signedAt?new Date(rec.signedAt).toLocaleDateString('ko-KR'):'-')+'<\/td><\/tr><tr><th>ê²ì¬ì<\/th><td>'+(rec.inspector||'-')+'<\/td><th>íì ê²°ê³¼<\/th><td class="v">'+rec.verdict+'<\/td><\/tr><tr><th>ë¹ê³ <\/th><td colspan="3">'+(rec.notes||'-')+'<\/td><\/tr><\/table><div class="sig"><p>ìëªì: '+(rec.signerName||'-')+' ('+(rec.signerTitle||'-')+')<\/p><p>ì ììëª ì¼ì: '+(rec.signedAt?new Date(rec.signedAt).toLocaleString('ko-KR'):'-')+'<\/p><\/div><script>window.print();<\/sc'+'ript><\/body><\/html>'
    const w = window.open('','_blank','width=820,height=700')
    if (!w) { alert('íìì´ ì°¨ë¨ëììµëë¤'); return }
    w.document.write(html); w.document.close()
  }

  const vc = v => v==='í©ê²©'?'text-green-600':v==='ë¶í©ê²©'?'text-red-600':'text-yellow-600'

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-700">{[52636,54616,32,49849,51064,183,54032,51221].map(c=>String.fromCodePoint(c)).join('')} {[44592,47197].map(c=>String.fromCodePoint(c)).join('')}</h2>
        <button onClick={()=>setShowForm(p=>!p)} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">+ {[49888,44508,32,54032,51221].map(c=>String.fromCodePoint(c)).join('')}</button>
      </div>

      {showForm && (
        <div className="bg-white border rounded-lg p-4 space-y-3 shadow-sm">
          <h3 className="font-semibold text-gray-700">{[52636,54616,32,54032,51221,32,51077,47141].map(c=>String.fromCodePoint(c)).join('')}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-gray-500 mb-1">Lot No. *</label>
              <input className="w-full border rounded px-2 py-1 text-sm" value={form.lotNo} onChange={e=>F('lotNo',e.target.value)} placeholder="LOT-2024-001"/></div>
            <div><label className="block text-xs text-gray-500 mb-1">{[51228,54408,47749].map(c=>String.fromCodePoint(c)).join('')} *</label>
              <input className="w-full border rounded px-2 py-1 text-sm" value={form.productName} onChange={e=>F('productName',e.target.value)}/></div>
            <div><label className="block text-xs text-gray-500 mb-1">{[49688,47049].map(c=>String.fromCodePoint(c)).join('')}</label>
              <input className="w-full border rounded px-2 py-1 text-sm" value={form.qty} onChange={e=>F('qty',e.target.value)} placeholder="100"/></div>
            <div><label className="block text-xs text-gray-500 mb-1">{[54032,51221,44208,44284].map(c=>String.fromCodePoint(c)).join('')} *</label>
              <select className="w-full border rounded px-2 py-1 text-sm" value={form.verdict} onChange={e=>F('verdict',e.target.value)}>
                <option value={[54633,44201].map(c=>String.fromCodePoint(c)).join('')}>{[54633,44201].map(c=>String.fromCodePoint(c)).join('')}</option>
                <option value={[48520,54633,44201].map(c=>String.fromCodePoint(c)).join('')}>{[48520,54633,44201].map(c=>String.fromCodePoint(c)).join('')}</option>
                <option value={[48372,47448].map(c=>String.fromCodePoint(c)).join('')}>{[48372,47448].map(c=>String.fromCodePoint(c)).join('')}</option>
              </select></div>
            <div><label className="block text-xs text-gray-500 mb-1">{[44160,49324,51088].map(c=>String.fromCodePoint(c)).join('')}</label>
              <input className="w-full border rounded px-2 py-1 text-sm" value={form.inspector} onChange={e=>F('inspector',e.target.value)}/></div>
            <div><label className="block text-xs text-gray-500 mb-1">{[49436,47749,51088,32,49457,47749].map(c=>String.fromCodePoint(c)).join('')}</label>
              <input className="w-full border rounded px-2 py-1 text-sm" value={form.signerName} onChange={e=>F('signerName',e.target.value)}/></div>
            <div><label className="block text-xs text-gray-500 mb-1">{[49436,47749,51088,32,51649,50948].map(c=>String.fromCodePoint(c)).join('')}</label>
              <input className="w-full border rounded px-2 py-1 text-sm" value={form.signerTitle} onChange={e=>F('signerTitle',e.target.value)}/></div>
            <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">{[48708,44256].map(c=>String.fromCodePoint(c)).join('')}</label>
              <textarea className="w-full border rounded px-2 py-1 text-sm" rows={2} value={form.notes} onChange={e=>F('notes',e.target.value)}/></div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={()=>setShowForm(false)} className="px-3 py-1.5 border rounded text-sm text-gray-600 hover:bg-gray-50">{[52712,49548].map(c=>String.fromCodePoint(c)).join('')}</button>
            <button onClick={handleSubmit} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">{[51200,51109,32,40,51204,51088,49436,47749,41].map(c=>String.fromCodePoint(c)).join('')}</button>
          </div>
        </div>
      )}

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left">Lot No.</th>
              <th className="px-3 py-2 text-left">{[51228,54408,47749].map(c=>String.fromCodePoint(c)).join('')}</th>
              <th className="px-3 py-2 text-left">{[49688,47049].map(c=>String.fromCodePoint(c)).join('')}</th>
              <th className="px-3 py-2 text-center">{[54032,51221].map(c=>String.fromCodePoint(c)).join('')}</th>
              <th className="px-3 py-2 text-left">{[44160,49324,51088].map(c=>String.fromCodePoint(c)).join('')}</th>
              <th className="px-3 py-2 text-left">{[49436,47749,51088].map(c=>String.fromCodePoint(c)).join('')}</th>
              <th className="px-3 py-2 text-left">{[54032,51221,51068,49884].map(c=>String.fromCodePoint(c)).join('')}</th>
              <th className="px-3 py-2 text-center">{[51089,52629].map(c=>String.fromCodePoint(c)).join('')}</th>
            </tr>
          </thead>
          <tbody>
            {records.length===0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-400">{[52636,54616,32,54032,51221,32,44592,47197,51060,32,50630,49845,45768,45796].map(c=>String.fromCodePoint(c)).join('')}</td></tr>}
            {records.map(rec=>(
              <tr key={rec.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-xs">{rec.lotNo}</td>
                <td className="px-3 py-2">{rec.productName}</td>
                <td className="px-3 py-2">{rec.qty||'-'}</td>
                <td className={`px-3 py-2 text-center font-semibold ${vc(rec.verdict)}`}>{rec.verdict}</td>
                <td className="px-3 py-2">{rec.inspector||'-'}</td>
                <td className="px-3 py-2">{rec.signerName}{rec.signerTitle?` (${rec.signerTitle})`:''}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{rec.signedAt?new Date(rec.signedAt).toLocaleString('ko-KR'):'-'}</td>
                <td className="px-3 py-2 text-center space-x-2">
                  <button onClick={()=>handlePrint(rec)} className="text-blue-500 hover:text-blue-700 text-xs">{[52636,47141].map(c=>String.fromCodePoint(c)).join('')}</button>
                  <button onClick={()=>handleDelete(rec.id)} className="text-red-400 hover:text-red-600 text-xs">{[49325,51228].map(c=>String.fromCodePoint(c)).join('')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TabButton({ active, onClick, icon: Icon, label, en, count }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2.5 rounded-t-lg flex items-center gap-2 text-[13px] transition shrink-0"
      style={{
        background: active ? 'var(--bg-card)' : 'transparent',
        borderBottom: active ? '2px solid var(--moss)' : '2px solid transparent',
        color: active ? 'var(--ink)' : 'var(--ink-mute)',
        fontWeight: active ? 500 : 400,
      }}
    >
      <Icon size={14} />
      <span>{label}</span>
      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: active ? 'var(--leaf-soft)' : 'var(--bg-soft)', color: active ? 'var(--moss)' : 'var(--ink-faint)' }}>
        {count}
      </span>
      <span className="font-mono text-[9.5px] tracking-wider" style={{ color: 'var(--ink-faint)' }}>{en}</span>
    </button>
  )
}

function FilterChip({ active, onClick, label, count }) {
  return (
    <button
      onClick={onClick}
      className="text-[11.5px] px-2.5 py-1 rounded-full"
      style={{
        background: active ? 'var(--moss)' : 'var(--bg-soft)',
        color: active ? 'var(--bg)' : 'var(--ink-mute)',
        fontWeight: active ? 600 : 400,
      }}
    >
      {label} <span className="opacity-70">{count}</span>
    </button>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>{label}</span>
      <input
        type={type}
        className="input-base"
        style={{ padding: '0.5rem 0.7rem', fontSize: 13 }}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

function SelectField({ label, value, onChange, options, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>{label}</span>
      <select className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13 }} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
    </label>
  )
}

function TextAreaField({ label, value, onChange, placeholder, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>{label}</span>
      <textarea
        className="input-base"
        style={{ padding: '0.5rem 0.7rem', fontSize: 13, minHeight: 60 }}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="card-base p-8 text-center" style={{ borderStyle: 'dashed' }}>
      <Icon size={28} style={{ color: 'var(--ink-faint)', margin: '0 auto' }} strokeWidth={1.4} />
      <div className="mt-2 text-[13px]" style={{ color: 'var(--ink-mute)' }}>{text}</div>
    </div>
  )
}

function Badge({ text, tone = 'slate' }) {
  const map = {
    emerald: { bg: 'var(--leaf-soft)', fg: 'var(--moss)' },
    amber: { bg: 'var(--amber-soft)', fg: 'var(--amber)' },
    rose: { bg: '#fdecec', fg: '#c0392b' },
    slate: { bg: 'var(--bg-soft)', fg: 'var(--ink-mute)' },
  }
  const c = map[tone] || map.slate
  return <span className="text-[10.5px] px-1.5 py-0.5 rounded font-semibold" style={{ background: c.bg, color: c.fg }}>{text}</span>
}
