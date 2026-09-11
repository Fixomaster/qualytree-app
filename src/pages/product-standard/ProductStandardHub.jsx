// src/pages/product-standard/ProductStandardHub.jsx
// ISO 13485 Â§7.1 / Â§4.2.3 â ì í íì¤ì (Product Specification Document)
import React, { useState, useEffect, useMemo } from 'react'
import {
  Plus, Save, Edit2, Trash2, FileText, BookOpen,
  CheckCircle2, Tag, Layers, ShieldCheck, Link2,
  GitBranch, X, Clipboard, FlaskConical, Award,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'

const LS_KEY = 'qualytree.product_standard'

const STD_TABS = [
  { key:'info',       label:'ê¸°ë³¸ ì ë³´',   icon:FileText,     desc:'ì íëªÂ·ë¶ë¥Â·ì ìì¦' },
  { key:'perf',       label:'ì±ë¥ ê·ê²©',   icon:ShieldCheck,  desc:'ì±ë¥ ìêµ¬ì¬í­Â·í©ê²©ê¸°ì¤' },
  { key:'material',   label:'ììì¬ ê·ê²©', icon:Layers,       desc:'ì¬ì§Â·ê³µê¸ìì²´Â·ê·ê²©ë²í¸' },
  { key:'test',       label:'ìí ë°©ë²',   icon:FlaskConical, desc:'ìí ì ì°¨Â·ì¥ë¹Â·ê¸°ì¤' },
  { key:'regulatory', label:'ì¸íê° ì°ê³', icon:Award,        desc:'íê°ë²í¸Â·ì¡°ê±´Â·ê°±ì ' },
  { key:'history',    label:'ê°ì ì´ë ¥',    icon:GitBranch,    desc:'ë²ì ë³ ë³ê²½ ì¬í­' },
  { key:'dhf', label:'DHF·인허가 연계', icon:Link2, desc:'설계이력·인허가 연계' },
]

const EMPTY_STD = () => ({
  id: Date.now(),
  productName: '',
  modelNumber: '',
  docNumber: '',
  version: '1.0',
  status: 'draft',
  createdAt: new Date().toISOString().slice(0,10),
  updatedAt: new Date().toISOString().slice(0,10),
  info: {
    classification: '',
    classificationBasis: '',
    intendedUse: '',
    indications: '',
    contraindications: '',
    targetPatient: '',
    usePeriod: '',
    notes: '',
  },
  perf: [],   // [{id, item, requirement, criterion, testRef}]
  material: [],  // [{id, component, material, spec, supplier, notes}]
  test: [],   // [{id, testName, method, equipment, criterion, notes}]
  regulatory: {
    approvalNumber: '',
    approvalDate: '',
    approvalAuthority: 'ìíìì½íìì ì²',
    expiryDate: '',
    conditions: '',
    dhfRef: '',
    dmrRef: '',
    changeHistory: '',
  },
  history: [],  // [{date, version, author, summary}]
})

const STATUS_META = {
  draft:    { label:'ì´ì', color:'bg-yellow-100 text-yellow-800' },
  approved: { label:'ì¹ì¸', color:'bg-green-100 text-green-800'  },
  obsolete: { label:'íê¸°', color:'bg-gray-100 text-gray-500'    },
}

function lsRead()  { try { return JSON.parse(localStorage.getItem(LS_KEY)||'[]') } catch { return [] } }
function lsWrite(d){ localStorage.setItem(LS_KEY, JSON.stringify(d)) }

function Field({ label, value, onChange, type='textarea', rows=3, placeholder='' }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      {type==='input'
        ? <input className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/>
        : <textarea className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            rows={rows} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/>
      }
    </div>
  )
}

// í ì¶ê° íì´ë¸ ê³µíµ ì»´í¬ëí¸
function EditableTable({ columns, rows, onAdd, onDelete, emptyRow }) {
  const [form, setForm] = React.useState(emptyRow())
  return (
    <div>
      <div className="overflow-x-auto mb-3">
        <table className="w-full text-xs border-collapse min-w-max">
          <thead>
            <tr className="bg-gray-50 text-gray-500">
              {columns.map(c=><th key={c.key} className="border px-3 py-2 text-left whitespace-nowrap">{c.label}</th>)}
              <th className="border px-2 py-2 w-8"/>
            </tr>
          </thead>
          <tbody>
            {rows.length===0 && <tr><td colSpan={columns.length+1} className="border px-3 py-4 text-center text-gray-400">í­ëª© ìì â ìëìì ì¶ê°íì¸ì.</td></tr>}
            {rows.map(row=>(
              <tr key={row.id} className="hover:bg-gray-50">
                {columns.map(c=><td key={c.key} className="border px-3 py-2 text-gray-700 whitespace-pre-wrap">{row[c.key]||'â'}</td>)}
                <td className="border px-2 py-2 text-center"><button onClick={()=>onDelete(row.id)} className="text-red-300 hover:text-red-500"><X size={12}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 flex-wrap bg-gray-50 p-3 rounded-lg">
        {columns.map(c=>(
          <input key={c.key} placeholder={c.label} className="border rounded px-2 py-1 text-xs flex-1 min-w-24"
            value={form[c.key]||''} onChange={e=>setForm(f=>({...f,[c.key]:e.target.value}))}/>
        ))}
        <button className="bg-blue-600 text-white text-xs px-3 py-1 rounded hover:bg-blue-700 whitespace-nowrap"
          onClick={()=>{ if(Object.values(form).some(v=>v)) { onAdd({...form,id:Date.now()}); setForm(emptyRow()) }}}>í ì¶ê°</button>
      </div>
    </div>
  )
}

export default function ProductStandardHub() {
  const user = auth.current()
  const [products, setProducts] = React.useState([])
  const [selectedId, setSelectedId] = React.useState(null)
  const [activeTab, setActiveTab] = React.useState('info')
  const [editing, setEditing] = React.useState(false)
  const [showForm, setShowForm] = React.useState(false)
  const [newName, setNewName] = React.useState('')
  const [newModel, setNewModel] = React.useState('')
  const [search, setSearch] = React.useState('')

  React.useEffect(() => {
    const data = lsRead()
    setProducts(data)
    if (data.length>0) setSelectedId(data[0].id)
  }, [])

  const filtered = React.useMemo(()=>
    products.filter(p=>
      p.productName.toLowerCase().includes(search.toLowerCase()) ||
      (p.modelNumber||'').toLowerCase().includes(search.toLowerCase())
    ), [products, search])

  const selected = products.find(p=>p.id===selectedId)||null

  function persist(updated) { setProducts(updated); lsWrite(updated) }

  function addProduct() {
    if (!newName.trim()) return
    const s = EMPTY_STD()
    s.productName = newName.trim(); s.modelNumber = newModel.trim()
    const updated = [...products, s]
    persist(updated); setSelectedId(s.id)
    setNewName(''); setNewModel(''); setShowForm(false)
    setActiveTab('info'); setEditing(true)
  }

  function deleteProduct(id) {
    if (!window.confirm('ì­ì íìê² ìµëê¹?')) return
    const updated = products.filter(p=>p.id!==id)
    persist(updated); setSelectedId(updated.length>0?updated[0].id:null)
  }

  function updateRoot(field, value) {
    setProducts(prev=>{ const u=prev.map(p=>p.id===selectedId?{...p,[field]:value,updatedAt:new Date().toISOString().slice(0,10)}:p); lsWrite(u); return u })
  }

  function updateSection(section, field, value) {
    setProducts(prev=>{ const u=prev.map(p=>p.id===selectedId?{...p,[section]:{...p[section],[field]:value},updatedAt:new Date().toISOString().slice(0,10)}:p); lsWrite(u); return u })
  }

  function addRow(section, row) {
    setProducts(prev=>{ const u=prev.map(p=>p.id===selectedId?{...p,[section]:[...(p[section]||[]),row]}:p); lsWrite(u); return u })
  }

  function delRow(section, rowId) {
    setProducts(prev=>{ const u=prev.map(p=>p.id===selectedId?{...p,[section]:(p[section]||[]).filter(r=>r.id!==rowId)}:p); lsWrite(u); return u })
  }

  function saveNow() { lsWrite(products); setEditing(false) }

  // ââ í­ ì½íì¸  ââââââââââââââââââââââââââââââââââââââââââââââ
  function renderTab() {
    if (!selected) return null
    const s = selected
    const ro = !editing

    function readView(pairs) {
      return (
        <div className="space-y-3">
          {pairs.filter(([,v])=>v).map(([k,v])=>(
            <div key={k}>
              <div className="text-xs font-semibold text-gray-400 mb-0.5">{k}</div>
              <div className="text-sm text-gray-700 whitespace-pre-line">{v}</div>
            </div>
          ))}
          {pairs.every(([,v])=>!v) && <div className="text-gray-400 text-sm py-4 text-center">ë´ì©ì í¸ì§íë ¤ë©´ í¸ì§ ë²í¼ì ëë¥´ì¸ì.</div>}
        </div>
      )
    }

    switch(activeTab) {
      case 'info': return ro ? readView([
        ['ë¶ë¥ ë±ê¸', s.info.classification],['ë¶ë¥ ê·¼ê±°', s.info.classificationBasis],
        ['ìëë ì©ë', s.info.intendedUse],['ì ìì¦', s.info.indications],
        ['ê¸ê¸°ì¬í­', s.info.contraindications],['ëì íì', s.info.targetPatient],
        ['ì¬ì© ê¸°ê°', s.info.usePeriod],['ë¹ê³ ', s.info.notes],
      ]) : (
        <div>
          <Field label="ë¶ë¥ ë±ê¸ (ì: 2ë±ê¸, Class II)" value={s.info.classification} type="input" onChange={v=>updateSection('info','classification',v)}/>
          <Field label="ë¶ë¥ ê·¼ê±° (ë²ì  ê¸°ì¤)" value={s.info.classificationBasis} type="input" onChange={v=>updateSection('info','classificationBasis',v)} placeholder="ì: ìë£ê¸°ê¸°ë² ìíê·ì¹ ë³í"/>
          <Field label="ìëë ì©ë" value={s.info.intendedUse} onChange={v=>updateSection('info','intendedUse',v)} rows={3} placeholder="ê¸°ê¸°ì ìë£ì  ëª©ì  ë° ì ì© ë²ì"/>
          <Field label="ì ìì¦" value={s.info.indications} onChange={v=>updateSection('info','indications',v)} rows={3}/>
          <Field label="ê¸ê¸°ì¬í­ / ì£¼ìì¬í­" value={s.info.contraindications} onChange={v=>updateSection('info','contraindications',v)} rows={2}/>
          <Field label="ëì íìêµ°" value={s.info.targetPatient} type="input" onChange={v=>updateSection('info','targetPatient',v)}/>
          <Field label="ìì ì¬ì© ê¸°ê° / ì í¨ê¸°ê°" value={s.info.usePeriod} type="input" onChange={v=>updateSection('info','usePeriod',v)}/>
        </div>
      )

      case 'perf': return (
        <EditableTable
          columns={[
            {key:'item',label:'ì±ë¥ í­ëª©'},{key:'requirement',label:'ìêµ¬ì¬í­'},{key:'criterion',label:'í©ê²© ê¸°ì¤'},{key:'testRef',label:'ìí ë°©ë² ì°¸ì¡°'},
          ]}
          rows={s.perf||[]}
          onAdd={row=>addRow('perf',row)}
          onDelete={id=>delRow('perf',id)}
          emptyRow={()=>({item:'',requirement:'',criterion:'',testRef:''})}
        />
      )

      case 'material': return (
        <EditableTable
          columns={[
            {key:'component',label:'ë¶í/ììì¬ëª'},{key:'material',label:'ì¬ì§'},{key:'spec',label:'ê·ê²©ë²í¸'},{key:'supplier',label:'ê³µê¸ìì²´'},{key:'notes',label:'ë¹ê³ '},
          ]}
          rows={s.material||[]}
          onAdd={row=>addRow('material',row)}
          onDelete={id=>delRow('material',id)}
          emptyRow={()=>({component:'',material:'',spec:'',supplier:'',notes:''})}
        />
      )

      case 'test': return (
        <EditableTable
          columns={[
            {key:'testName',label:'ìíëª'},{key:'method',label:'ìí ë°©ë²'},{key:'equipment',label:'ìí ì¥ë¹'},{key:'criterion',label:'íì  ê¸°ì¤'},{key:'notes',label:'ë¹ê³ '},
          ]}
          rows={s.test||[]}
          onAdd={row=>addRow('test',row)}
          onDelete={id=>delRow('test',id)}
          emptyRow={()=>({testName:'',method:'',equipment:'',criterion:'',notes:''})}
        />
      )

      case 'regulatory': return ro ? readView([
        ['íê°Â·ì ê³  ë²í¸', s.regulatory.approvalNumber],['íê°ì¼', s.regulatory.approvalDate],
        ['íê° ê¸°ê´', s.regulatory.approvalAuthority],['ë§ë£ì¼', s.regulatory.expiryDate],
        ['íê° ì¡°ê±´', s.regulatory.conditions],['DHF ì°ê³', s.regulatory.dhfRef],
        ['DMR ì°ê³', s.regulatory.dmrRef],['ë³ê²½ ì´ë ¥', s.regulatory.changeHistory],
      ]) : (
        <div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="íê°Â·ì ê³  ë²í¸" value={s.regulatory.approvalNumber} type="input" onChange={v=>updateSection('regulatory','approvalNumber',v)}/>
            <Field label="íê°ì¼" value={s.regulatory.approvalDate} type="input" onChange={v=>updateSection('regulatory','approvalDate',v)} placeholder="YYYY-MM-DD"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="íê° ê¸°ê´" value={s.regulatory.approvalAuthority} type="input" onChange={v=>updateSection('regulatory','approvalAuthority',v)}/>
            <Field label="ì í¨ ê¸°ê° / ë§ë£ì¼" value={s.regulatory.expiryDate} type="input" onChange={v=>updateSection('regulatory','expiryDate',v)} placeholder="YYYY-MM-DD"/>
          </div>
          <Field label="íê° ì¡°ê±´" value={s.regulatory.conditions} onChange={v=>updateSection('regulatory','conditions',v)} rows={2}/>
          <div className="grid grid-cols-2 gap-4">
            <Field label="DHF ì°ê³ ë¬¸ìë²í¸" value={s.regulatory.dhfRef} type="input" onChange={v=>updateSection('regulatory','dhfRef',v)}/>
            <Field label="DMR ì°ê³ ë¬¸ìë²í¸" value={s.regulatory.dmrRef} type="input" onChange={v=>updateSection('regulatory','dmrRef',v)}/>
          </div>
          <Field label="ë³ê²½ íê° ì´ë ¥ ìì½" value={s.regulatory.changeHistory} onChange={v=>updateSection('regulatory','changeHistory',v)} rows={3}/>
        </div>
      )

      case 'history': return (
        <div>
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-xs border-collapse">
              <thead><tr className="bg-gray-50 text-gray-500">
                <th className="border px-3 py-2 text-left">ì¼ì</th><th className="border px-3 py-2 text-left">ë²ì </th>
                <th className="border px-3 py-2 text-left">ìì±ì</th><th className="border px-3 py-2 text-left">ë³ê²½ ìì½</th>
                <th className="border px-2 py-2 w-8"/>
              </tr></thead>
              <tbody>
                {(s.history||[]).length===0 && <tr><td colSpan={5} className="border px-3 py-4 text-center text-gray-400">ê°ì ì´ë ¥ ìì</td></tr>}
                {(s.history||[]).map((h,i)=>(
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="border px-3 py-2">{h.date}</td><td className="border px-3 py-2">{h.version}</td>
                    <td className="border px-3 py-2">{h.author}</td><td className="border px-3 py-2">{h.summary}</td>
                    <td className="border px-2 py-2 text-center"><button onClick={()=>delRow('history',h.id)} className="text-red-300 hover:text-red-500"><X size={12}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <HistoryAddRow onAdd={row=>addRow('history',row)}/>
        </div>
      )
      case 'dhf': {
        const dhfData = (() => { try { return JSON.parse(localStorage.getItem('qualytree.design_history')||'[]') } catch { return [] } })()
        const regData = (() => { try { return JSON.parse(localStorage.getItem('qualytree.regulatory_products')||'[]') } catch { return [] } })()
        const productName = s?.info?.productName || ''
        const linkedDhf = dhfData.filter(d => !productName || d.name?.includes(productName) || productName.includes(d.name?.slice(0,4)||'___'))
        const linkedReg = regData.filter(d => !productName || d.name?.includes(productName) || productName.includes(d.name?.slice(0,4)||'___'))
        return (
          <div style={{padding:'8px 0'}}>
            <div style={{marginBottom:20}}>
              <div style={{fontSize:14,fontWeight:600,marginBottom:10,display:'flex',alignItems:'center',gap:6}}><Link2 size={15}/>설계이력파일(DHF) 연계</div>
              {linkedDhf.length===0?(<div style={{padding:'20px',textAlign:'center',background:'var(--surface-2)',borderRadius:8,fontSize:13,color:'var(--ink-faint)'}}>연계된 DHF 없음 — 제품명으로 자동 매칭됩니다</div>):
              linkedDhf.map(d=>(
                <div key={d.id} style={{border:'1px solid var(--border)',borderRadius:8,padding:'10px 12px',marginBottom:8,background:'var(--surface)'}}>
                  <div style={{fontSize:13,fontWeight:600}}>{d.name}</div>
                  <div style={{fontSize:12,color:'var(--ink-faint)',marginTop:2}}>DHF ID: {String(d.id).slice(-6)} · 상태: {d.stage||d.status||'진행중'}</div>
                </div>
              ))}
            </div>
            <div>
              <div style={{fontSize:14,fontWeight:600,marginBottom:10,display:'flex',alignItems:'center',gap:6}}><ShieldCheck size={15}/>인허가 연계</div>
              {linkedReg.length===0?(<div style={{padding:'20px',textAlign:'center',background:'var(--surface-2)',borderRadius:8,fontSize:13,color:'var(--ink-faint)'}}>연계된 인허가 없음 — 제품명으로 자동 매칭됩니다</div>):
              linkedReg.map(d=>(
                <div key={d.id} style={{border:'1px solid var(--border)',borderRadius:8,padding:'10px 12px',marginBottom:8,background:'var(--surface)'}}>
                  <div style={{fontSize:13,fontWeight:600}}>{d.name}</div>
                  <div style={{fontSize:12,color:'var(--ink-faint)',marginTop:2}}>허가번호: {d.approvalNo||'미입력'} · 분류: {d.deviceClass||'미입력'}</div>
                </div>
              ))}
            </div>
          </div>
        )
      }
      default: return null
    }
  }

  const stats = React.useMemo(()=>({
    total:    products.length,
    approved: products.filter(p=>p.status==='approved').length,
    draft:    products.filter(p=>p.status==='draft').length,
  }),[products])

// HistoryAddRow â íì¼ ìµìë¨ì ì ìí´ì¼ íë¯ë¡ _ps1 ë§ì§ë§ì ì¶ê°í  ë´ì©
// ì¤ì ë¡ë ps1ìì ì ìí´ì¼ íì§ë§, ì¬ê¸°ì ì§ì  ì¸ë¼ì¸ì¼ë¡ ì²ë¦¬

  function HistoryAddRow({ onAdd }) {
    const [form, setForm] = React.useState({date:new Date().toISOString().slice(0,10),version:'',author:'',summary:''})
    return (
      <div className="flex gap-2 flex-wrap bg-gray-50 p-3 rounded-lg">
        <input type="date" className="border rounded px-2 py-1 text-xs" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
        <input placeholder="ë²ì " className="border rounded px-2 py-1 text-xs w-20" value={form.version} onChange={e=>setForm(f=>({...f,version:e.target.value}))}/>
        <input placeholder="ìì±ì" className="border rounded px-2 py-1 text-xs w-24" value={form.author} onChange={e=>setForm(f=>({...f,author:e.target.value}))}/>
        <input placeholder="ë³ê²½ ìì½" className="border rounded px-2 py-1 text-xs flex-1" value={form.summary} onChange={e=>setForm(f=>({...f,summary:e.target.value}))}/>
        <button className="bg-blue-600 text-white text-xs px-3 py-1 rounded hover:bg-blue-700"
          onClick={()=>{ if(form.version&&form.summary){ onAdd({...form,id:Date.now()}); setForm(f=>({...f,version:'',author:'',summary:''})) }}}>ì¶ê°</button>
      </div>
    )
  }

  return (
    <AppLayout>
      <HubBanner
        title="ì í íì¤ì"
        subtitle="ISO 13485 Â§7.1 / Â§4.2.3 â ì íë³ ì±ë¥ê·ê²©Â·ììì¬Â·ìíë°©ë²Â·ì¸íê° íµí© ê´ë¦¬"
        icon={BookOpen}
        color="#7c3aed"
        workflow={['ì í ë±ë¡','ê·ê²© ìì±','ìí ê²ì¦','ì¸íê° ì°ê³','ì¹ì¸']}
      />

      {/* íµê³ */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[{label:'ì ì²´ ì í',value:stats.total,color:'text-purple-600'},
          {label:'ì¹ì¸ ìë£',value:stats.approved,color:'text-green-600'},
          {label:'ì´ì',value:stats.draft,color:'text-yellow-600'}
        ].map(c=>(
          <div key={c.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
            <div className="text-xs text-gray-400 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-5">
        {/* ì í ëª©ë¡ */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">ì í ëª©ë¡</span>
              <button className="text-purple-600 hover:text-purple-800" onClick={()=>setShowForm(true)}><Plus size={16}/></button>
            </div>
            <div className="px-3 py-2 border-b border-gray-100">
              <input className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none"
                placeholder="ì íëªÂ·ëª¨ë¸ ê²ì" value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
              {filtered.length===0 && <div className="px-4 py-6 text-center text-xs text-gray-400">ì íì ë±ë¡íì¸ì.<br/>ì°ì¸¡ ìë¨ + ë²í¼</div>}
              {filtered.map(p=>(
                <div key={p.id}
                  className={`px-4 py-3 cursor-pointer hover:bg-purple-50 transition-colors ${selectedId===p.id?'bg-purple-50 border-l-2 border-purple-500':''}`}
                  onClick={()=>{setSelectedId(p.id);setEditing(false);setActiveTab('info')}}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{p.productName}</div>
                      <div className="text-xs text-gray-500 truncate">{p.modelNumber||'â'} {p.docNumber?'Â· '+p.docNumber:''}</div>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded ml-1 flex-shrink-0 ${STATUS_META[p.status]?.color}`}>{STATUS_META[p.status]?.label}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">v{p.version} Â· {p.updatedAt}</div>
                </div>
              ))}
            </div>
          </div>

          {showForm && (
            <div className="bg-white rounded-xl border border-purple-200 shadow-sm p-4 mt-3">
              <div className="text-sm font-semibold text-gray-700 mb-3 flex justify-between">ì ì í ë±ë¡ <button onClick={()=>setShowForm(false)}><X size={14}/></button></div>
              <input className="w-full border rounded px-2 py-1 text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-purple-300" placeholder="ì íëª *" value={newName} onChange={e=>setNewName(e.target.value)}/>
              <input className="w-full border rounded px-2 py-1 text-sm mb-3 focus:outline-none focus:ring-1 focus:ring-purple-300" placeholder="ëª¨ë¸ë²í¸" value={newModel} onChange={e=>setNewModel(e.target.value)}/>
              <button className="w-full bg-purple-600 text-white text-sm py-1.5 rounded hover:bg-purple-700" onClick={addProduct}>ë±ë¡</button>
            </div>
          )}
        </div>

        {/* ì°ì¸¡ ìì¸ */}
        <div className="flex-1 min-w-0">
          {!selected ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
              <BookOpen size={40} className="mx-auto mb-3 opacity-30"/>
              <div className="text-sm">ì¢ì¸¡ìì ì íì ì ííê±°ë ìë¡ ë±ë¡íì¸ì.</div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* í¤ë */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-bold text-gray-800">{selected.productName}</span>
                    {selected.modelNumber && <span className="text-sm text-gray-500">{selected.modelNumber}</span>}
                    {selected.docNumber && <span className="text-xs text-gray-400">Â· {selected.docNumber}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_META[selected.status]?.color}`}>{STATUS_META[selected.status]?.label}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">ë²ì  v{selected.version} Â· ìµì¢ìì  {selected.updatedAt}</div>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  <select className="border rounded text-xs px-2 py-1 text-gray-600" value={selected.status} onChange={e=>updateRoot('status',e.target.value)}>
                    <option value="draft">ì´ì</option><option value="approved">ì¹ì¸</option><option value="obsolete">íê¸°</option>
                  </select>
                  {editing
                    ? <button className="flex items-center gap-1 text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700" onClick={saveNow}><Save size={12}/> ì ì¥</button>
                    : <button className="flex items-center gap-1 text-xs bg-purple-600 text-white px-3 py-1.5 rounded hover:bg-purple-700" onClick={()=>setEditing(true)}><Edit2 size={12}/> í¸ì§</button>
                  }
                  <button className="text-xs text-red-400 hover:text-red-600 px-2 py-1" onClick={()=>deleteProduct(selected.id)}><Trash2 size={14}/></button>
                </div>
              </div>

              {editing && (
                <div className="px-5 py-3 bg-gray-50 border-b flex gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">ë¬¸ìë²í¸</span>
                    <input className="border rounded px-2 py-0.5 text-xs w-32" value={selected.docNumber} onChange={e=>updateRoot('docNumber',e.target.value)} placeholder="ì: PS-001"/>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">ë²ì </span>
                    <input className="border rounded px-2 py-0.5 text-xs w-16" value={selected.version} onChange={e=>updateRoot('version',e.target.value)}/>
                  </div>
                </div>
              )}

              {/* í­ */}
              <div className="flex border-b border-gray-100 overflow-x-auto bg-gray-50">
                {STD_TABS.map(t=>{
                  const Icon=t.icon
                  return (
                    <button key={t.key}
                      className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab===t.key?'border-purple-500 text-purple-700 bg-white':'border-transparent text-gray-500 hover:text-gray-700'}`}
                      onClick={()=>setActiveTab(t.key)}>
                      <Icon size={13}/>{t.label}
                    </button>
                  )
                })}
              </div>

              <div className="p-5">
                {!editing && activeTab!=='history' && activeTab!=='perf' && activeTab!=='material' && activeTab!=='test' && (
                  <div className="text-xs text-blue-600 bg-blue-50 rounded px-3 py-2 mb-3 flex items-center gap-2">
                    <CheckCircle2 size={12}/> í¸ì§ ë²í¼ì ëë¬ ë´ì©ì ìì íì¸ì.
                  </div>
                )}
                {renderTab()}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}