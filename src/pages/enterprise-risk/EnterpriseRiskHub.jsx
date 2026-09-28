// src/pages/enterprise-risk/EnterpriseRiskHub.jsx
// ISO 14971:2019 â ì ì¬ ìíê´ë¦¬ íë¸ (Enterprise Risk Management)
import React, { useState, useMemo, useEffect } from 'react'
import {
  AlertTriangle, Plus, Trash2, Edit3, X, Save,
  ShieldAlert, ShieldCheck, TrendingUp, TrendingDown,
  BarChart2, ClipboardList, CheckCircle2, Clock,
  ChevronDown, ChevronRight, Filter, RefreshCw,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'
import { supabase } from '../../lib/supabaseClient'

const LS_KEY = 'qualytree.enterprise_risks'
let _sbCidEr = null

const CATEGORIES = [
  { key: 'design',      label: 'ì¤ê³Â·ê°ë°',    color: '#6366f1' },
  { key: 'production',  label: 'ìì°Â·ì ì¡°',    color: '#f59e0b' },
  { key: 'quality',     label: 'íì§ìì¤í',   color: '#10b981' },
  { key: 'supply',      label: 'ê³µê¸ë§',       color: '#3b82f6' },
  { key: 'regulatory',  label: 'ê·ì Â·ì¸íê°',  color: '#ef4444' },
  { key: 'infra',       label: 'ì¸íë¼Â·ì¤ë¹',  color: '#8b5cf6' },
]

const SEVERITY_LABELS = ['','ê²½ë¯¸','ë³´íµ','ì¤ê°','ì¬ê°','ì¹ëª']
const PROB_LABELS     = ['','ë§¤ì°ë®ì','ë®ì','ë³´íµ','ëì','ë§¤ì°ëì']

function calcRisk(s,p) {
  const rpn = s * p
  if (s >= 4 || rpn >= 12) return 'high'
  if (s >= 3 || rpn >= 6)  return 'medium'
  return 'low'
}

const RISK_META = {
  high:   { label: 'ê³ ìí', color: 'bg-red-100 text-red-700',    dot: 'bg-red-500'    },
  medium: { label: 'ì¤ìí', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400' },
  low:    { label: 'ì ìí', color: 'bg-green-100 text-green-700', dot: 'bg-green-500'  },
}

const STATUS_META = {
  open:        { label: 'ë¯¸ì¡°ì¹', color: 'bg-gray-100 text-gray-600'    },
  'in-progress':{ label: 'ì¡°ì¹ì¤', color: 'bg-blue-100 text-blue-700'   },
  closed:      { label: 'ìë£',   color: 'bg-green-100 text-green-700'  },
}

const EMPTY_RISK = () => ({
  id: Date.now(),
  title: '',
  category: 'production',
  process: '',
  description: '',
  hazard: '',
  severity: 3,
  probability: 3,
  treatment: 'mitigate',
  controls: '',
  residualSeverity: 2,
  residualProbability: 2,
  status: 'open',
  owner: '',
  dueDate: '',
  createdAt: new Date().toISOString().slice(0,10),
  updatedAt: new Date().toISOString().slice(0,10),
})

function lsRead()  { try { return JSON.parse(localStorage.getItem(LS_KEY)||'[]') } catch { return [] } }
function lsWrite(d) {
  localStorage.setItem(LS_KEY, JSON.stringify(d))
  if (_sbCidEr) {
    supabase.from('company_data').upsert({
      company_id: _sbCidEr, data_type: 'localStorage_sync',
      data_key: LS_KEY, payload: d
    }, { onConflict: 'company_id,data_type,data_key' })
  }
}

// ââ ìí ë§¤í¸ë¦­ì¤ ì ìì âââââââââââââââââââââââââââââââââââââ
function matrixColor(s, p) {
  const r = calcRisk(s, p)
  return r === 'high' ? '#fee2e2' : r === 'medium' ? '#fef9c3' : '#dcfce7'
}

// ââ ì«ì ìë ¥ âââââââââââââââââââââââââââââââââââââââââââââââââ
function ScaleInput({ label, value, onChange, labels }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span className="text-xs font-semibold text-gray-500">{label}</span>
        <span className="text-xs font-bold text-blue-600">{value} â {labels[value]||''}</span>
      </div>
      <input type="range" min={1} max={5} value={value}
        onChange={e=>onChange(Number(e.target.value))}
        className="w-full accent-blue-600"/>
      <div className="flex justify-between text-xs text-gray-300 mt-0.5">
        {[1,2,3,4,5].map(n=><span key={n}>{n}</span>)}
      </div>
    </div>
  )
}
export default function EnterpriseRiskHub() {
  const user = auth.current()
  const companyId = user?.company_id
  const [risks, setRisks] = React.useState([])
  const [tab, setTab] = React.useState('dashboard')
  const [filterCat, setFilterCat] = React.useState('all')
  const [filterStatus, setFilterStatus] = React.useState('all')
  const [showForm, setShowForm] = React.useState(false)
  const [editId, setEditId] = React.useState(null)
  const [form, setForm] = React.useState(EMPTY_RISK())
  const [saved, setSaved] = React.useState(false)

  React.useEffect(() => { setRisks(lsRead()) }, [])
  useEffect(() => { _sbCidEr = companyId }, [companyId])
  useEffect(() => {
    if (!companyId) return
    supabase.from('company_data')
      .select('payload').eq('company_id', companyId)
      .eq('data_type', 'localStorage_sync').eq('data_key', LS_KEY)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.payload) {
          setRisks(data.payload)
          lsWrite(data.payload)
        }
      })
  }, [companyId])

  function persist(updated) {
    setRisks(updated); lsWrite(updated)
    setSaved(true); setTimeout(()=>setSaved(false), 1500)
  }

  function openNew() {
    setForm(EMPTY_RISK()); setEditId(null); setShowForm(true); setTab('register')
  }

  function openEdit(r) {
    setForm({...r}); setEditId(r.id); setShowForm(true); setTab('register')
  }

  function saveForm() {
    if (!form.title.trim()) return
    const now = new Date().toISOString().slice(0,10)
    if (editId) {
      persist(risks.map(r => r.id===editId ? {...form, updatedAt: now} : r))
    } else {
      persist([...risks, {...form, id: Date.now(), createdAt: now, updatedAt: now}])
    }
    setShowForm(false); setEditId(null); setForm(EMPTY_RISK())
  }

  function deleteRisk(id) {
    if (!window.confirm('ìí í­ëª©ì ì­ì íìê² ìµëê¹?')) return
    persist(risks.filter(r=>r.id!==id))
  }

  function updateStatus(id, status) {
    persist(risks.map(r=>r.id===id ? {...r, status, updatedAt: new Date().toISOString().slice(0,10)} : r))
  }

  const filtered = React.useMemo(() => risks.filter(r =>
    (filterCat==='all' || r.category===filterCat) &&
    (filterStatus==='all' || r.status===filterStatus)
  ), [risks, filterCat, filterStatus])

  const stats = React.useMemo(() => {
    const total  = risks.length
    const high   = risks.filter(r=>calcRisk(r.severity,r.probability)==='high').length
    const medium = risks.filter(r=>calcRisk(r.severity,r.probability)==='medium').length
    const low    = risks.filter(r=>calcRisk(r.severity,r.probability)==='low').length
    const open   = risks.filter(r=>r.status==='open').length
    const closed = risks.filter(r=>r.status==='closed').length
    return {total, high, medium, low, open, closed}
  }, [risks])

  // ì¹´íê³ ë¦¬ë³ ìí ì§ê³
  const byCat = React.useMemo(() =>
    CATEGORIES.map(c => ({
      ...c,
      count: risks.filter(r=>r.category===c.key).length,
      high:  risks.filter(r=>r.category===c.key && calcRisk(r.severity,r.probability)==='high').length,
    })), [risks])

  // ìí ë§¤í¸ë¦­ì¤ ë°ì´í° (5x5 ê·¸ë¦¬ë)
  function matrixCount(s, p) {
    return risks.filter(r=>r.severity===s && r.probability===p).length
  }

  // ââ ëìë³´ë í­ âââââââââââââââââââââââââââââââââââââââââââ
  function renderDashboard() {
    return (
      <div>
        {/* KPI ì¹´ë */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            {label:'ì ì²´',value:stats.total,color:'text-gray-700'},
            {label:'ê³ ìí',value:stats.high,color:'text-red-600'},
            {label:'ì¤ìí',value:stats.medium,color:'text-yellow-600'},
            {label:'ì ìí',value:stats.low,color:'text-green-600'},
            {label:'ë¯¸ì¡°ì¹',value:stats.open,color:'text-blue-600'},
          ].map(c=>(
            <div key={c.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
              <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
              <div className="text-xs text-gray-400 mt-1">{c.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* ìí ë§¤í¸ë¦­ì¤ */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="text-sm font-semibold text-gray-700 mb-3">ìí ë§¤í¸ë¦­ì¤ (ì¬ê°ë Ã ë°ìê°ë¥ì±)</div>
            <div className="relative">
              <div className="text-xs text-gray-400 text-center mb-1">ë°ìê°ë¥ì± â</div>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="w-8 text-gray-400 text-right pr-2">ì¬ê°ë</th>
                    {[1,2,3,4,5].map(p=>(
                      <th key={p} className="border border-gray-200 px-1 py-1 text-center text-gray-500 bg-gray-50">{p}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[5,4,3,2,1].map(s=>(
                    <tr key={s}>
                      <td className="text-gray-500 text-right pr-2 text-xs">{s}</td>
                      {[1,2,3,4,5].map(p=>{
                        const cnt=matrixCount(s,p)
                        return (
                          <td key={p} className="border border-gray-200 px-1 py-2 text-center font-bold"
                            style={{backgroundColor:matrixColor(s,p)}}>
                            {cnt>0?cnt:''}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ìì­ë³ ìí íí© */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="text-sm font-semibold text-gray-700 mb-3">ìì­ë³ ìí íí©</div>
            {byCat.map(c=>(
              <div key={c.key} className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:c.color}}/>
                <div className="text-xs text-gray-600 w-24 flex-shrink-0">{c.label}</div>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className="h-2 rounded-full" style={{width:stats.total?((c.count/stats.total)*100)+'%':'0%',backgroundColor:c.color}}/>
                </div>
                <div className="text-xs text-gray-500 w-8 text-right">{c.count}</div>
                {c.high>0 && <span className="text-xs bg-red-100 text-red-600 px-1.5 rounded">ê³ {c.high}</span>}
              </div>
            ))}
            {risks.length===0 && <div className="text-center text-xs text-gray-400 py-8">ìí í­ëª©ì ë±ë¡íì¸ì.</div>}
          </div>
        </div>

        {/* ê³ ìí ëª©ë¡ */}
        {stats.high > 0 && (
          <div className="bg-white rounded-xl border border-red-100 shadow-sm p-4 mt-5">
            <div className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
              <AlertTriangle size={14}/> ì¦ì ì¡°ì¹ íì â ê³ ìí í­ëª©
            </div>
            {risks.filter(r=>calcRisk(r.severity,r.probability)==='high').map(r=>(
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <div className="text-sm font-medium text-gray-800">{r.title}</div>
                  <div className="text-xs text-gray-400">{CATEGORIES.find(c=>c.key===r.category)?.label} Â· ì¬ê°ë {r.severity} Â· ë°ìê°ë¥ì± {r.probability}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_META[r.status]?.color}`}>{STATUS_META[r.status]?.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
  // ââ ìí ë±ë¡ í­ ââââââââââââââââââââââââââââââââââââââââââ
  function renderRegister() {
    return (
      <div>
        {/* íí° + ì¶ê° ë²í¼ */}
        <div className="flex flex-wrap gap-2 mb-4 items-center">
          <select className="border rounded px-2 py-1 text-xs" value={filterCat} onChange={e=>setFilterCat(e.target.value)}>
            <option value="all">ì ì²´ ìì­</option>
            {CATEGORIES.map(c=><option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <select className="border rounded px-2 py-1 text-xs" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
            <option value="all">ì ì²´ ìí</option>
            <option value="open">ë¯¸ì¡°ì¹</option>
            <option value="in-progress">ì¡°ì¹ì¤</option>
            <option value="closed">ìë£</option>
          </select>
          <div className="flex-1"/>
          <button className="flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"
            onClick={openNew}><Plus size={13}/> ìí ë±ë¡</button>
        </div>

        {/* ìí ëª©ë¡ */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {filtered.length===0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              <ShieldAlert size={32} className="mx-auto mb-2 opacity-30"/>
              ë±ë¡ë ìí í­ëª©ì´ ììµëë¤.
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">ìí ì ëª©</th>
                  <th className="px-3 py-2 text-left">ìì­</th>
                  <th className="px-3 py-2 text-center">ì¬ê°ë</th>
                  <th className="px-3 py-2 text-center">ê°ë¥ì±</th>
                  <th className="px-3 py-2 text-center">ìíë±ê¸</th>
                  <th className="px-3 py-2 text-center">ìí</th>
                  <th className="px-3 py-2 text-center">ë´ë¹ì</th>
                  <th className="px-3 py-2 text-center">ì¡°ì¹</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(r=>{
                  const level = calcRisk(r.severity, r.probability)
                  const cat = CATEGORIES.find(c=>c.key===r.category)
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{r.title}</div>
                        {r.process && <div className="text-xs text-gray-400">{r.process}</div>}
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{backgroundColor:cat?.color}}>{cat?.label}</span>
                      </td>
                      <td className="px-3 py-3 text-center text-xs font-bold text-gray-700">{r.severity}</td>
                      <td className="px-3 py-3 text-center text-xs font-bold text-gray-700">{r.probability}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${RISK_META[level]?.color}`}>{RISK_META[level]?.label}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <select className={`text-xs border rounded px-1 py-0.5 ${STATUS_META[r.status]?.color}`}
                          value={r.status} onChange={e=>updateStatus(r.id, e.target.value)}>
                          <option value="open">ë¯¸ì¡°ì¹</option>
                          <option value="in-progress">ì¡°ì¹ì¤</option>
                          <option value="closed">ìë£</option>
                        </select>
                      </td>
                      <td className="px-3 py-3 text-center text-xs text-gray-600">{r.owner||'â'}</td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex justify-center gap-1">
                          <button className="text-blue-400 hover:text-blue-600" onClick={()=>openEdit(r)}><Edit3 size={14}/></button>
                          <button className="text-red-300 hover:text-red-500" onClick={()=>deleteRisk(r.id)}><Trash2 size={14}/></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ë±ë¡/í¸ì§ í¼ */}
        {showForm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <span className="font-bold text-gray-800">{editId?'ìí í­ëª© ìì ':'ìí í­ëª© ë±ë¡'}</span>
                <button onClick={()=>setShowForm(false)}><X size={18}/></button>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">ìí ì ëª© *</label>
                  <input className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
                    value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="ìí ìëë¦¬ì¤ ì ëª©"/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">ìí ìì­</label>
                    <select className="w-full border rounded px-3 py-2 text-sm" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                      {CATEGORIES.map(c=><option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">íë¡ì¸ì¤ / í´ë¹ ë¶ì</label>
                    <input className="w-full border rounded px-3 py-2 text-sm" value={form.process} onChange={e=>setForm(f=>({...f,process:e.target.value}))} placeholder="ì: ì¡°ë¦½ê³µì , ì¶íê²ì¬"/>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">ìí ì¤ëª / ì ì¬ì  ê²°ê³¼</label>
                  <textarea className="w-full border rounded px-3 py-2 text-sm resize-none" rows={3}
                    value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="ìíì ìì¸, ë©ì»¤ëì¦, ì ì¬ ê²°ê³¼ë¥¼ ê¸°ì "/>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">ìíì (Hazard)</label>
                  <input className="w-full border rounded px-3 py-2 text-sm" value={form.hazard} onChange={e=>setForm(f=>({...f,hazard:e.target.value}))} placeholder="ì: ì ê¸°, ê¸°ê³ì , ìë¬¼íì , ìíí¸ì¨ì´"/>
                </div>
                <ScaleInput label="ì¬ê°ë (Severity)" value={form.severity} onChange={v=>setForm(f=>({...f,severity:v}))} labels={SEVERITY_LABELS}/>
                <ScaleInput label="ë°ìê°ë¥ì± (Probability)" value={form.probability} onChange={v=>setForm(f=>({...f,probability:v}))} labels={PROB_LABELS}/>
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  ìí ë±ê¸: <strong className={`${calcRisk(form.severity,form.probability)==='high'?'text-red-600':calcRisk(form.severity,form.probability)==='medium'?'text-yellow-600':'text-green-600'}`}>
                    {RISK_META[calcRisk(form.severity,form.probability)]?.label}
                  </strong>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">ìí ì²ë¦¬ ë°©ë²</label>
                  <select className="w-full border rounded px-3 py-2 text-sm" value={form.treatment} onChange={e=>setForm(f=>({...f,treatment:e.target.value}))}>
                    <option value="mitigate">ìí (Mitigate)</option>
                    <option value="accept">ìì© (Accept)</option>
                    <option value="avoid">íí¼ (Avoid)</option>
                    <option value="transfer">ì´ì  (Transfer)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">ê´ë¦¬ ë°©ì / ì¡°ì¹ ë´ì©</label>
                  <textarea className="w-full border rounded px-3 py-2 text-sm resize-none" rows={3}
                    value={form.controls} onChange={e=>setForm(f=>({...f,controls:e.target.value}))} placeholder="ì¤ê³ ë³ê²½, ì ì°¨ ì¶ê°, êµì¡, ê²ì¬ ê°í ë±"/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">ë´ë¹ì</label>
                    <input className="w-full border rounded px-3 py-2 text-sm" value={form.owner} onChange={e=>setForm(f=>({...f,owner:e.target.value}))}/>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">ëª©í ìë£ì¼</label>
                    <input type="date" className="w-full border rounded px-3 py-2 text-sm" value={form.dueDate} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))}/>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 px-6 py-4 border-t">
                <button className="text-sm px-4 py-2 border rounded hover:bg-gray-50" onClick={()=>setShowForm(false)}>ì·¨ì</button>
                <button className="text-sm px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                  onClick={saveForm}><Save size={13}/> {editId?'ìì ':'ë±ë¡'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }
  // ââ ì¡°ì¹ íí© í­ âââââââââââââââââââââââââââââââââââââââââ
  function renderActions() {
    const overdue = risks.filter(r => r.status!=='closed' && r.dueDate && r.dueDate < new Date().toISOString().slice(0,10))
    const inProgress = risks.filter(r => r.status==='in-progress')
    return (
      <div className="space-y-4">
        {overdue.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2"><Clock size={14}/> ê¸°í ì´ê³¼ í­ëª© ({overdue.length}ê±´)</div>
            {overdue.map(r=>(
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-red-100 last:border-0">
                <div>
                  <div className="text-sm text-gray-800">{r.title}</div>
                  <div className="text-xs text-red-500">ê¸°í: {r.dueDate} Â· ë´ë¹: {r.owner||'ë¯¸ì§ì '}</div>
                </div>
                <button className="text-xs bg-blue-600 text-white px-2 py-1 rounded" onClick={()=>updateStatus(r.id,'in-progress')}>ì¡°ì¹ì¤ì¼ë¡</button>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="text-sm font-semibold text-gray-700 mb-3">ì ì²´ ì¡°ì¹ íí©</div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              {label:'ë¯¸ì¡°ì¹', val:stats.open, color:'text-gray-600', bg:'bg-gray-50'},
              {label:'ì¡°ì¹ì¤', val:risks.filter(r=>r.status==='in-progress').length, color:'text-blue-600', bg:'bg-blue-50'},
              {label:'ìë£',   val:stats.closed, color:'text-green-600', bg:'bg-green-50'},
            ].map(c=>(
              <div key={c.label} className={`${c.bg} rounded-lg p-3 text-center`}>
                <div className={`text-xl font-bold ${c.color}`}>{c.val}</div>
                <div className="text-xs text-gray-400">{c.label}</div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {risks.filter(r=>r.status!=='closed').sort((a,b)=>b.severity*b.probability - a.severity*a.probability).map(r=>{
              const level = calcRisk(r.severity, r.probability)
              return (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${RISK_META[level]?.dot}`}/>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-800 truncate">{r.title}</div>
                    <div className="text-xs text-gray-400">{r.owner||'ë´ë¹ì ë¯¸ì§ì '} {r.dueDate?'Â· '+r.dueDate:''}</div>
                  </div>
                  <select className="text-xs border rounded px-1 py-0.5" value={r.status}
                    onChange={e=>updateStatus(r.id,e.target.value)}>
                    <option value="open">ë¯¸ì¡°ì¹</option>
                    <option value="in-progress">ì¡°ì¹ì¤</option>
                    <option value="closed">ìë£</option>
                  </select>
                </div>
              )
            })}
            {risks.filter(r=>r.status!=='closed').length===0 && (
              <div className="text-center py-8 text-green-600 text-sm"><CheckCircle2 size={24} className="mx-auto mb-2"/>ëª¨ë  ìí í­ëª©ì´ ì¡°ì¹ ìë£ëììµëë¤.</div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const TABS = [
    { key:'dashboard', label:'ìí íí©',  icon:BarChart2     },
    { key:'register',  label:'ìí ë±ë¡ë¶', icon:ClipboardList },
    { key:'actions',   label:'ì¡°ì¹ ì¶ì ',   icon:CheckCircle2  },
  ]

  return (
    <AppLayout>
      <HubBanner
        title="ì ì¬ ìíê´ë¦¬"
        subtitle="ISO 14971:2019 â ì¤ê³Â·ì ì¡°Â·íì§ìì¤íÂ·ê³µê¸ë§Â·ê·ì  ì  ìì­ ìí ìë³ ë° ì²ë¦¬"
        icon={ShieldAlert}
        color="#dc2626"
        quickActions={[{ label:'ìí í­ëª© ì¶ê°', icon:Plus, onClick:openNew, primary:true }]}
      />

      {/* í­ */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(t=>{
          const Icon=t.icon
          return (
            <button key={t.key}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab===t.key?'bg-white text-blue-700 shadow-sm':'text-gray-500 hover:text-gray-700'}`}
              onClick={()=>setTab(t.key)}>
              <Icon size={14}/>{t.label}
            </button>
          )
        })}
      </div>

      {tab==='dashboard' && renderDashboard()}
      {tab==='register'  && renderRegister()}
      {tab==='actions'   && renderActions()}
    </AppLayout>
  )
}