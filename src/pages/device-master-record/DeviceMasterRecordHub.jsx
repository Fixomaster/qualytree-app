// src/pages/device-master-record/DeviceMasterRecordHub.jsx
// ISO 13485 Â§7.3.10 / Â§4.2.3 â ìë£ê¸°ê¸° íì¼ (Device Master Record)
import React, { useState, useEffect, useMemo } from 'react'
import {
  Plus, Save, Edit2, Trash2, Package, FileText,
  CheckCircle2, AlertTriangle, ChevronDown, ChevronRight,
  Tag, Layers, ClipboardList, Cpu, BookOpen,
  ShieldCheck, Link2, RefreshCw, Download, X,
  Wrench, GitBranch,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'
import { supabase } from '../../lib/supabaseClient'

const LS_KEY = 'qualytree.dmr'
let _sbCidDmr = null

const DMR_TABS = [
  { key: 'info',        label: 'ê¸°ê¸° ê¸°ë³¸ì ë³´',  icon: Package,    clause: 'Â§4.2.3(a)' },
  { key: 'specs',       label: 'ì¬ìÂ·ëë©´',       icon: Cpu,        clause: 'Â§4.2.3(b)' },
  { key: 'process',     label: 'ì ì¡°ê³µì ',        icon: Layers,     clause: 'Â§4.2.3(c)' },
  { key: 'inspection',  label: 'ê²ì¬Â·ìíê¸°ì¤',   icon: ShieldCheck,clause: 'Â§4.2.3(d)' },
  { key: 'labeling',    label: 'ë¼ë²¨Â·í¬ì¥',       icon: Tag,        clause: 'Â§4.2.3(e)' },
  { key: 'maintenance', label: 'ì¤ì¹Â·ì ì§ë³´ì',   icon: Wrench,     clause: 'Â§4.2.3(f)' },
  { key: 'history',     label: 'ë³ê²½ì´ë ¥',        icon: GitBranch,  clause: 'Â§4.2.5'    },
]

const EMPTY_DMR = () => ({
  id: Date.now(),
  productName: '',
  modelNumber: '',
  version: '1.0',
  status: 'draft',
  createdAt: new Date().toISOString().slice(0, 10),
  updatedAt: new Date().toISOString().slice(0, 10),
  dhfRef: '',
  info:        { intendedUse: '', classification: '', udi: '', regulatoryRef: '', manufacturer: '', notes: '' },
  specs:       { performanceSpecs: '', dimensions: '', materials: '', drawingRef: '', softwareVersion: '', notes: '' },
  process:     { processOverview: '', criticalSteps: '', equipmentList: '', environmentalReqs: '', notes: '' },
  inspection:  { acceptanceCriteria: '', testMethods: '', samplingPlan: '', releaseRequirements: '', notes: '' },
  labeling:    { labelContent: '', packagingSpec: '', sterileBarrier: '', storageConditions: '', notes: '' },
  maintenance: { installationReqs: '', maintenanceSchedule: '', serviceInstructions: '', expectedLifespan: '', notes: '' },
  history: [],
})

const STATUS_META = {
  draft:   { label: 'ì´ì', color: 'bg-yellow-100 text-yellow-800' },
  active:  { label: 'ì¹ì¸', color: 'bg-green-100 text-green-800'  },
  obsolete:{ label: 'íê¸°', color: 'bg-gray-100 text-gray-600'    },
}

function load()  { try { return JSON.parse(localStorage.getItem(LS_KEY)) || [] } catch { return [] } }
function save(d) {
  localStorage.setItem(LS_KEY, JSON.stringify(d))
  if (_sbCidDmr) {
    supabase.from('company_data').upsert({
      company_id: _sbCidDmr, data_type: 'localStorage_sync',
      data_key: LS_KEY, payload: d
    }, { onConflict: 'company_id,data_type,data_key' })
  }
}

function FieldBlock({ label, value, onChange, type = 'textarea', rows = 3, placeholder = '' }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      {type === 'input' ? (
        <input className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <textarea className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
          rows={rows} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </div>
  )
}
function HistoryTable({ entries, onAdd }) {
  const [form, setForm] = React.useState({ date: new Date().toISOString().slice(0,10), version: '', author: '', summary: '' })
  return (
    <div>
      <table className="w-full text-sm mb-4 border-collapse">
        <thead>
          <tr className="bg-gray-50 text-gray-600 text-xs">
            <th className="border px-3 py-2 text-left">ì¼ì</th>
            <th className="border px-3 py-2 text-left">ë²ì </th>
            <th className="border px-3 py-2 text-left">ìì±ì</th>
            <th className="border px-3 py-2 text-left">ë³ê²½ ìì½</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 && (
            <tr><td colSpan={4} className="border px-3 py-4 text-center text-gray-400 text-xs">ë³ê²½ì´ë ¥ ìì</td></tr>
          )}
          {entries.map((e, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="border px-3 py-2 text-gray-700">{e.date}</td>
              <td className="border px-3 py-2 text-gray-700">{e.version}</td>
              <td className="border px-3 py-2 text-gray-700">{e.author}</td>
              <td className="border px-3 py-2 text-gray-700">{e.summary}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-2 flex-wrap">
        <input type="date" className="border rounded px-2 py-1 text-xs" value={form.date}
          onChange={e => setForm(f => ({...f, date: e.target.value}))} />
        <input placeholder="ë²ì " className="border rounded px-2 py-1 text-xs w-20"
          value={form.version} onChange={e => setForm(f => ({...f, version: e.target.value}))} />
        <input placeholder="ìì±ì" className="border rounded px-2 py-1 text-xs w-24"
          value={form.author} onChange={e => setForm(f => ({...f, author: e.target.value}))} />
        <input placeholder="ë³ê²½ ìì½" className="border rounded px-2 py-1 text-xs flex-1"
          value={form.summary} onChange={e => setForm(f => ({...f, summary: e.target.value}))} />
        <button className="bg-blue-600 text-white text-xs px-3 py-1 rounded hover:bg-blue-700"
          onClick={() => { if(form.version && form.summary) { onAdd(form); setForm(f => ({...f, version:'', author:'', summary:''})) }}}>ì¶ê°</button>
      </div>
    </div>
  )
}

export default function DeviceMasterRecordHub() {
  const [records, setRecords] = React.useState([])
  const [selectedId, setSelectedId] = React.useState(null)
  const [activeTab, setActiveTab] = React.useState('info')
  const [editing, setEditing] = React.useState(false)
  const [showForm, setShowForm] = React.useState(false)
  const [newName, setNewName] = React.useState('')
  const [newModel, setNewModel] = React.useState('')
  const [search, setSearch] = React.useState('')
  const [saved, setSaved] = React.useState(false)
  const companyId = auth.current()?.company_id

  React.useEffect(() => {
    const data = load()
    setRecords(data)
    if (data.length > 0) setSelectedId(data[0].id)
  }, [])
  React.useEffect(() => { _sbCidDmr = companyId }, [companyId])
  React.useEffect(() => {
    if (!companyId) return
    supabase.from('company_data')
      .select('payload').eq('company_id', companyId)
      .eq('data_type', 'localStorage_sync').eq('data_key', LS_KEY)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.payload) {
          setRecords(data.payload)
          localStorage.setItem(LS_KEY, JSON.stringify(data.payload))
        }
      })
  }, [companyId])

  const filtered = React.useMemo(() =>
    records.filter(r =>
      r.productName.toLowerCase().includes(search.toLowerCase()) ||
      r.modelNumber.toLowerCase().includes(search.toLowerCase())
    ), [records, search])

  const selected = records.find(r => r.id === selectedId) || null

  function persist(updated) {
    setRecords(updated); save(updated)
    setSaved(true); setTimeout(() => setSaved(false), 1800)
  }

  function addRecord() {
    if (!newName.trim()) return
    const rec = EMPTY_DMR()
    rec.productName = newName.trim(); rec.modelNumber = newModel.trim()
    const updated = [...records, rec]
    persist(updated); setSelectedId(rec.id)
    setNewName(''); setNewModel(''); setShowForm(false)
    setActiveTab('info'); setEditing(true)
  }

  function deleteRecord(id) {
    if (!window.confirm('ì´ DMRì ì­ì íìê² ìµëê¹?')) return
    const updated = records.filter(r => r.id !== id)
    persist(updated); setSelectedId(updated.length > 0 ? updated[0].id : null)
  }

  function updateField(tabKey, field, value) {
    setRecords(prev => {
      const updated = prev.map(r => {
        if (r.id !== selectedId) return r
        if (tabKey === 'root') return { ...r, [field]: value, updatedAt: new Date().toISOString().slice(0,10) }
        return { ...r, [tabKey]: { ...r[tabKey], [field]: value }, updatedAt: new Date().toISOString().slice(0,10) }
      })
      save(updated); return updated
    })
  }

  function addHistory(entry) {
    setRecords(prev => {
      const updated = prev.map(r => r.id === selectedId ? { ...r, history: [...(r.history||[]), entry] } : r)
      save(updated); return updated
    })
  }

  function saveNow() {
    save(records); setSaved(true); setTimeout(() => setSaved(false), 1800); setEditing(false)
  }
  function renderTabContent() {
    if (!selected) return null
    const s = selected
    const ro = !editing
    const view = (pairs) => (
      <div className="space-y-3">
        {pairs.map(([k,v]) => v ? (
          <div key={k}>
            <div className="text-xs font-semibold text-gray-400 mb-0.5">{k}</div>
            <div className="text-sm text-gray-700 whitespace-pre-line">{v}</div>
          </div>
        ) : null)}
      </div>
    )
    switch (activeTab) {
      case 'info': return ro ? view([
        ['ìëë ì©ë',s.info.intendedUse],['ë¶ë¥ ë±ê¸',s.info.classification],
        ['UDI',s.info.udi],['íê°Â·ì ê³  ë²í¸',s.info.regulatoryRef],
        ['ì ì¡°ì',s.info.manufacturer],['ë¹ê³ ',s.info.notes]
      ]) : (
        <div>
          <FieldBlock label="ì ì© ëª©ì  / ìëë ì©ë Â§4.2.3(a)" value={s.info.intendedUse} onChange={v=>updateField('info','intendedUse',v)} rows={3} placeholder="ê¸°ê¸°ì ìëë ì¬ì© ëª©ì ì ê¸°ì "/>
          <FieldBlock label="ë¶ë¥ ë±ê¸ (ì: 2ë±ê¸, Class II)" value={s.info.classification} type="input" onChange={v=>updateField('info','classification',v)}/>
          <FieldBlock label="UDI (ê³ ì ê¸°ê¸°ìë³ì)" value={s.info.udi} type="input" onChange={v=>updateField('info','udi',v)} placeholder="UDI-DI / UDI-PI"/>
          <FieldBlock label="íê°Â·ì ê³  ë²í¸ (ìì½ì²)" value={s.info.regulatoryRef} type="input" onChange={v=>updateField('info','regulatoryRef',v)}/>
          <FieldBlock label="ì ì¡°ì / ì ì¡°ì" value={s.info.manufacturer} type="input" onChange={v=>updateField('info','manufacturer',v)}/>
          <FieldBlock label="ë¹ê³ " value={s.info.notes} onChange={v=>updateField('info','notes',v)} rows={2}/>
        </div>
      )
      case 'specs': return ro ? view([
        ['ì±ë¥ ì¬ì',s.specs.performanceSpecs],['ì¹ì/ì¸í',s.specs.dimensions],
        ['ì¬ì§/ììì¬',s.specs.materials],['ëë©´ ì°¸ì¡°',s.specs.drawingRef],['ìíí¸ì¨ì´ ë²ì ',s.specs.softwareVersion]
      ]) : (
        <div>
          <FieldBlock label="ì±ë¥ ì¬ì Â§4.2.3(b)" value={s.specs.performanceSpecs} onChange={v=>updateField('specs','performanceSpecs',v)} rows={4} placeholder="ì¸¡ì  ë²ì, ì íë, ì ê¸° ì¬ì ë±"/>
          <FieldBlock label="ì¹ì / ì¸í" value={s.specs.dimensions} onChange={v=>updateField('specs','dimensions',v)} rows={2}/>
          <FieldBlock label="ì¬ì§ / ììì¬" value={s.specs.materials} onChange={v=>updateField('specs','materials',v)} rows={2}/>
          <FieldBlock label="ëë©´ ì°¸ì¡° ë²í¸" value={s.specs.drawingRef} type="input" onChange={v=>updateField('specs','drawingRef',v)} placeholder="ëë©´ ë²í¸ ëë ë¬¸ì ID"/>
          <FieldBlock label="ìíí¸ì¨ì´ ë²ì " value={s.specs.softwareVersion} type="input" onChange={v=>updateField('specs','softwareVersion',v)}/>
        </div>
      )
      case 'process': return ro ? view([
        ['ì ì¡°ê³µì  ê°ì',s.process.processOverview],['íµì¬ ê³µì  ë¨ê³',s.process.criticalSteps],
        ['ì¤ë¹ ëª©ë¡',s.process.equipmentList],['íê²½ ìêµ¬ì¬í­',s.process.environmentalReqs]
      ]) : (
        <div>
          <FieldBlock label="ì ì¡°ê³µì  ê°ì Â§4.2.3(c)" value={s.process.processOverview} onChange={v=>updateField('process','processOverview',v)} rows={4} placeholder="ì£¼ì ê³µì  ë¨ê³ ê¸°ì "/>
          <FieldBlock label="íµì¬ ê³µì  ë¨ê³ (Critical Steps)" value={s.process.criticalSteps} onChange={v=>updateField('process','criticalSteps',v)} rows={3}/>
          <FieldBlock label="ì¤ë¹ ëª©ë¡" value={s.process.equipmentList} onChange={v=>updateField('process','equipmentList',v)} rows={2}/>
          <FieldBlock label="íê²½ ìêµ¬ì¬í­ (ì¨ëÂ·ìµëÂ·ì²­ì ë ë±)" value={s.process.environmentalReqs} onChange={v=>updateField('process','environmentalReqs',v)} rows={2}/>
        </div>
      )
      case 'inspection': return ro ? view([
        ['í©ê²© ê¸°ì¤',s.inspection.acceptanceCriteria],['ìí ë°©ë²',s.inspection.testMethods],
        ['ìíë§ ê³í',s.inspection.samplingPlan],['ì¶í ì¹ì¸ ìêµ¬ì¬í­',s.inspection.releaseRequirements]
      ]) : (
        <div>
          <FieldBlock label="í©ê²© ê¸°ì¤ Â§4.2.3(d)" value={s.inspection.acceptanceCriteria} onChange={v=>updateField('inspection','acceptanceCriteria',v)} rows={4} placeholder="ê° í­ëª©ë³ í©ê²©/ë¶í©ê²© íì  ê¸°ì¤"/>
          <FieldBlock label="ìí ë°©ë²" value={s.inspection.testMethods} onChange={v=>updateField('inspection','testMethods',v)} rows={3}/>
          <FieldBlock label="ìíë§ ê³í (AQL ë±)" value={s.inspection.samplingPlan} onChange={v=>updateField('inspection','samplingPlan',v)} rows={2}/>
          <FieldBlock label="ì¶í ì¹ì¸ ìêµ¬ì¬í­" value={s.inspection.releaseRequirements} onChange={v=>updateField('inspection','releaseRequirements',v)} rows={2}/>
        </div>
      )
      case 'labeling': return ro ? view([
        ['ë¼ë²¨ ê¸°ì¬ì¬í­',s.labeling.labelContent],['í¬ì¥ ì¬ì',s.labeling.packagingSpec],
        ['ë©¸ê·  ë°°ë¦¬ì´ ì¬ì',s.labeling.sterileBarrier],['ë³´ê´ ì¡°ê±´',s.labeling.storageConditions]
      ]) : (
        <div>
          <FieldBlock label="ë¼ë²¨ ê¸°ì¬ì¬í­ Â§4.2.3(e)" value={s.labeling.labelContent} onChange={v=>updateField('labeling','labelContent',v)} rows={4} placeholder="ì íëª, ëª¨ë¸ë²í¸, ì ì¡°ë²í¸, ì í¨ê¸°ê°, ê²½ê³ ì¬í­ ë±"/>
          <FieldBlock label="í¬ì¥ ì¬ì" value={s.labeling.packagingSpec} onChange={v=>updateField('labeling','packagingSpec',v)} rows={3}/>
          <FieldBlock label="ë©¸ê·  ë°°ë¦¬ì´ ì¬ì (í´ë¹ ì)" value={s.labeling.sterileBarrier} onChange={v=>updateField('labeling','sterileBarrier',v)} rows={2}/>
          <FieldBlock label="ë³´ê´ ì¡°ê±´ (ì¨ëÂ·ìµëÂ·ì°¨ê´ ë±)" value={s.labeling.storageConditions} onChange={v=>updateField('labeling','storageConditions',v)} rows={2}/>
        </div>
      )
      case 'maintenance': return ro ? view([
        ['ì¤ì¹ ìêµ¬ì¬í­',s.maintenance.installationReqs],['ì ì§ë³´ì ì£¼ê¸°',s.maintenance.maintenanceSchedule],
        ['ìë¹ì¤ ì§ì¹¨',s.maintenance.serviceInstructions],['ìì ì¬ì© ìëª',s.maintenance.expectedLifespan]
      ]) : (
        <div>
          <FieldBlock label="ì¤ì¹ ìêµ¬ì¬í­ Â§4.2.3(f)" value={s.maintenance.installationReqs} onChange={v=>updateField('maintenance','installationReqs',v)} rows={3} placeholder="ì¤ì¹ íê²½, ì ì, ê³µê° ìêµ¬ì¬í­ ë±"/>
          <FieldBlock label="ì ì§ë³´ì ì£¼ê¸° / ì ê² í­ëª©" value={s.maintenance.maintenanceSchedule} onChange={v=>updateField('maintenance','maintenanceSchedule',v)} rows={3}/>
          <FieldBlock label="ìë¹ì¤ ì§ì¹¨" value={s.maintenance.serviceInstructions} onChange={v=>updateField('maintenance','serviceInstructions',v)} rows={3}/>
          <FieldBlock label="ìì ì¬ì© ìëª" value={s.maintenance.expectedLifespan} type="input" onChange={v=>updateField('maintenance','expectedLifespan',v)}/>
        </div>
      )
      case 'history': return <HistoryTable entries={s.history||[]} onAdd={addHistory}/>
      default: return null
    }
  }

  const stats = React.useMemo(() => ({
    total:  records.length,
    active: records.filter(r=>r.status==='active').length,
    draft:  records.filter(r=>r.status==='draft').length,
  }), [records])
  return (
    <AppLayout>
      <HubBanner icon={FileText} title="ìë£ê¸°ê¸° íì¼ (DMR)" subtitle="ISO 13485 Â§4.2.3 Â· Device Master Record â ì íë³ ìì± ê¸°ê¸° ëªì¸ ê´ë¦¬" color="#0284c7" workflow={['DMR ìì±', 'ì ë³´ ë±ë¡', 'ê²í Â·ì¹ì¸', 'ì ì§ê´ë¦¬']}/>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[{label:'ì ì²´ DMR',value:stats.total,color:'text-blue-600'},
          {label:'ì¹ì¸ ìë£',value:stats.active,color:'text-green-600'},
          {label:'ì´ì',value:stats.draft,color:'text-yellow-600'}
        ].map(c=>(
          <div key={c.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
            <div className="text-xs text-gray-500 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-5">
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">DMR ëª©ë¡</span>
              <button className="text-blue-600 hover:text-blue-800" onClick={()=>setShowForm(true)} title="ì DMR ë±ë¡"><Plus size={16}/></button>
            </div>
            <div className="px-3 py-2 border-b border-gray-100">
              <input className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none"
                placeholder="ì íëªÂ·ëª¨ë¸ ê²ì" value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
              {filtered.length===0 && (
                <div className="px-4 py-6 text-center text-xs text-gray-400">DMRì´ ììµëë¤.<br/>+ ë¡ ë±ë¡íì¸ì.</div>
              )}
              {filtered.map(r=>(
                <div key={r.id}
                  className={`px-4 py-3 cursor-pointer hover:bg-blue-50 transition-colors ${selectedId===r.id?'bg-blue-50 border-l-2 border-blue-500':''}`}
                  onClick={()=>{setSelectedId(r.id);setEditing(false);setActiveTab('info')}}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{r.productName}</div>
                      <div className="text-xs text-gray-500 truncate">{r.modelNumber||'â'}</div>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded ml-2 flex-shrink-0 ${STATUS_META[r.status]?.color}`}>{STATUS_META[r.status]?.label}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">v{r.version} Â· {r.updatedAt}</div>
                </div>
              ))}
            </div>
          </div>
          {showForm && (
            <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-4 mt-3">
              <div className="text-sm font-semibold text-gray-700 mb-3 flex justify-between">
                ì DMR ë±ë¡ <button onClick={()=>setShowForm(false)}><X size={14}/></button>
              </div>
              <input className="w-full border rounded px-2 py-1 text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-blue-300"
                placeholder="ì íëª *" value={newName} onChange={e=>setNewName(e.target.value)}/>
              <input className="w-full border rounded px-2 py-1 text-sm mb-3 focus:outline-none focus:ring-1 focus:ring-blue-300"
                placeholder="ëª¨ë¸ë²í¸" value={newModel} onChange={e=>setNewModel(e.target.value)}/>
              <button className="w-full bg-blue-600 text-white text-sm py-1.5 rounded hover:bg-blue-700" onClick={addRecord}>ë±ë¡</button>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {!selected ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
              <FileText size={40} className="mx-auto mb-3 opacity-30"/>
              <div className="text-sm">ì¢ì¸¡ìì DMRì ì ííê±°ë ìë¡ ë±ë¡íì¸ì.</div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-gray-800">{selected.productName}</span>
                    {selected.modelNumber && <span className="text-sm text-gray-500">{selected.modelNumber}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_META[selected.status]?.color}`}>{STATUS_META[selected.status]?.label}</span>
                  </div>
                  <div className="flex gap-4 mt-1">
                    <span className="text-xs text-gray-400">ë²ì  v{selected.version}</span>
                    <span className="text-xs text-gray-400">ìµì¢ìì  {selected.updatedAt}</span>
                    {selected.dhfRef && <span className="text-xs text-blue-500 flex items-center gap-1"><Link2 size={10}/> DHF {selected.dhfRef}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <select className="border rounded text-xs px-2 py-1 text-gray-600" value={selected.status}
                    disabled={ro} onChange={e=>updateField('root','status',e.target.value)}>
                    <option value="draft">ì´ì</option>
                    <option value="active">ì¹ì¸</option>
                    <option value="obsolete">íê¸°</option>
                  </select>
                  {editing ? (
                    <button className="flex items-center gap-1 text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700" onClick={saveNow}>
                      <Save size={12}/> ì ì¥{saved&&' â'}
                    </button>
                  ) : (
                    <button className="flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700" onClick={()=>setEditing(true)}>
                      <Edit2 size={12}/> í¸ì§
                    </button>
                  )}
                  <button className="text-xs text-red-400 hover:text-red-600 px-2 py-1" onClick={()=>deleteRecord(selected.id)}><Trash2 size={14}/></button>
                </div>
              </div>
              {editing && (
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">ë²ì </span>
                    <input className="border rounded px-2 py-0.5 text-xs w-16" value={selected.version}
                      readOnly={ro} onChange={e=>updateField('root','version',e.target.value)}/>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">DHF ì°ê³ ID</span>
                    <input className="border rounded px-2 py-0.5 text-xs w-32" value={selected.dhfRef}
                      readOnly={ro} onChange={e=>updateField('root','dhfRef',e.target.value)} placeholder="DHF ë¬¸ìë²í¸"/>
                  </div>
                </div>
              )}
              <div className="flex border-b border-gray-100 overflow-x-auto bg-gray-50">
                {DMR_TABS.map(tab=>{
                  const Icon=tab.icon
                  return (
                    <button key={tab.key}
                      className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab===tab.key?'border-blue-500 text-blue-700 bg-white':'border-transparent text-gray-500 hover:text-gray-700'}`}
                      onClick={()=>setActiveTab(tab.key)}>
                      <Icon size={13}/>{tab.label}
                      <span className="text-gray-300 text-xs">{tab.clause}</span>
                    </button>
                  )
                })}
              </div>
              <div className="p-5">
                {!editing && activeTab!=='history' && (
                  <div className="text-xs text-gray-400 mb-3 bg-blue-50 rounded px-3 py-2 flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-blue-400"/>
                    ë´ì©ì ìì íë ¤ë©´ <strong>í¸ì§</strong> ë²í¼ì ëë¥´ì¸ì.
                  </div>
                )}
                {renderTabContent()}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}