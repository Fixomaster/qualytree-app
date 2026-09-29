// src/pages/sop/SopHub.jsx
// ISO 13485 ÃÂ§4.2 Ã¢ÂÂ Ã¬ÂÂÃ¬ÂÂÃ­ÂÂÃ¬Â¤ÂÃ¬ÂÂ(SOP) Ã¬Â ÂÃ¬ÂÂ© ÃªÂ´ÂÃ«Â¦Â¬ Ã«ÂªÂ¨Ã«ÂÂ
import React, { useState, useEffect, useMemo } from 'react'
import { Plus, Save, Edit2, Trash2, FileText, BookOpen,
  CheckCircle2, Clock, AlertCircle, X, ChevronDown, ChevronRight,
  Send, RotateCcw, Copy, Printer } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import AIDraftButton from '../../components/AIDraftButton'
import { auth } from '../../lib/auth'
import { supabase } from '../../lib/supabaseClient'
import { auth } from '../../lib/auth'
import { supabase } from '../../lib/supabaseClient'

let _sbCidSop = null

const LS_KEY = 'qualytree.sop'
const lsRead = () => { try { return JSON.parse(localStorage.getItem(LS_KEY)||'[]') } catch { return [] } }
const lsWrite = v => localStorage.setItem(LS_KEY, JSON.stringify(v))

const CATEGORIES = [
  { value:'quality',    label:'Ã­ÂÂÃ¬Â§ÂÃªÂ´ÂÃ«Â¦Â¬' },
  { value:'production', label:'Ã¬ÂÂÃ¬ÂÂ°' },
  { value:'inspection', label:'ÃªÂ²ÂÃ¬ÂÂ¬' },
  { value:'purchase',   label:'ÃªÂµÂ¬Ã«Â§Â¤' },
  { value:'design',     label:'Ã¬ÂÂ¤ÃªÂ³ÂÃªÂ°ÂÃ«Â°Â' },
  { value:'regulatory', label:'Ã¬ÂÂ¸Ã­ÂÂÃªÂ°Â' },
  { value:'other',      label:'ÃªÂ¸Â°Ã­ÂÂ' },
]
const STATUS_META = {
  draft:    { label:'Ã¬Â´ÂÃ¬ÂÂ',    color:'bg-gray-100 text-gray-600' },
  review:   { label:'ÃªÂ²ÂÃ­ÂÂ Ã¬Â¤Â',  color:'bg-yellow-100 text-yellow-700' },
  approved: { label:'Ã¬ÂÂ¹Ã¬ÂÂ¸',    color:'bg-green-100 text-green-700' },
  obsolete: { label:'Ã­ÂÂÃªÂ¸Â°',    color:'bg-red-100 text-red-500' },
}
const SOP_TABS = [
  { key:'info',     label:'ÃªÂ¸Â°Ã«Â³Â¸Ã¬Â ÂÃ«Â³Â´',   icon: FileText },
  { key:'body',     label:'Ã«Â³Â¸Ã«Â¬Â¸Ã¬ÂÂÃ¬ÂÂ±',   icon: BookOpen },
  { key:'approval', label:'ÃªÂ²ÂÃ­ÂÂ ÃÂ·Ã¬ÂÂ¹Ã¬ÂÂ¸',  icon: CheckCircle2 },
  { key:'history',  label:'ÃªÂ°ÂÃ¬Â ÂÃ¬ÂÂ´Ã«Â Â¥',   icon: RotateCcw },
  { key:'related',  label:'ÃªÂ´ÂÃ«Â Â¨Ã«Â¬Â¸Ã¬ÂÂ',   icon: Copy },
  { key:'dist',     label:'Ã«Â°Â°Ã­ÂÂ¬Ã­ÂÂÃ­ÂÂ©',   icon: Send },
  { key:'print',    label:'Ã«Â¬Â¸Ã¬ÂÂ Ã¬Â¶ÂÃ«Â Â¥', icon: Printer },
  { key:'template', label:'Ã«Â¬Â¸Ã¬ÂÂ Ã¬ÂÂÃ¬ÂÂ', icon: Copy },
]

const SOP_TEMPLATES = [
  { id:'general', name:'Ã¬ÂÂ¼Ã«Â°Â Ã¬Â ÂÃ¬Â°Â¨Ã¬ÂÂ', category:'ÃªÂ³ÂµÃ­ÂÂµ', desc:'Ã«ÂªÂ©Ã¬Â ÂÃ¯Â¿Â½Ã¬Â ÂÃ¬ÂÂ©Ã«Â²ÂÃ¬ÂÂÃ¯Â¿Â½Ã¬Â ÂÃ¬Â°Â¨Ã¯Â¿Â½ÃªÂ¸Â°Ã«Â¡Â Ã¬ÂÂ¹Ã¬ÂÂ Ã­ÂÂÃ¬Â¤Â Ã¬ÂÂÃ¬ÂÂ',
    body:'1. Ã«ÂªÂ©Ã¬Â Â\n\n2. Ã¬Â ÂÃ¬ÂÂ©Ã«Â²ÂÃ¬ÂÂ\n\n3. Ã¬ÂÂ©Ã¬ÂÂ´ Ã«Â°Â Ã¬Â ÂÃ¬ÂÂ\n\n4. Ã¬Â±ÂÃ¬ÂÂÃªÂ³Â¼ ÃªÂ¶ÂÃ­ÂÂ\n4.1 Ã¬ÂÂÃ¬ÂÂ±Ã¬ÂÂ:\n4.2 ÃªÂ²ÂÃ­ÂÂ Ã¬ÂÂ:\n4.3 Ã¬ÂÂ¹Ã¬ÂÂ¸Ã¬ÂÂ:\n\n5. Ã¬Â ÂÃ¬Â°Â¨\n5.1 \n5.2 \n\n6. ÃªÂ´ÂÃ«Â Â¨ ÃªÂ¸Â°Ã«Â¡Â\n\n7. Ã¬Â°Â¸ÃªÂ³Â  Ã«Â¬Â¸Ã¬ÂÂ\n' },
  { id:'inspection', name:'ÃªÂ²ÂÃ¬ÂÂ¬ Ã¬Â ÂÃ¬Â°Â¨Ã¬ÂÂ', category:'ÃªÂ²ÂÃ¬ÂÂ¬', desc:'Ã¬ÂÂÃ¬ÂÂÃ¯Â¿Â½ÃªÂ³ÂµÃ¬Â ÂÃ¯Â¿Â½Ã¬ÂµÂÃ¬Â¢Â ÃªÂ²ÂÃ¬ÂÂ¬Ã¬ÂÂ© Ã­ÂÂÃ¬Â¤Â Ã¬ÂÂÃ¬ÂÂ',
    body:'1. Ã«ÂªÂ©Ã¬Â Â\n\n2. Ã¬Â ÂÃ¬ÂÂ©Ã«Â²ÂÃ¬ÂÂ\n\n3. ÃªÂ²ÂÃ¬ÂÂ¬ ÃªÂ¸Â°Ã¬Â¤Â\n3.1 Ã­ÂÂ©ÃªÂ²Â© ÃªÂ¸Â°Ã¬Â¤Â:\n3.2 Ã«Â¶ÂÃ­ÂÂ©ÃªÂ²Â© ÃªÂ¸Â°Ã¬Â¤Â:\n\n4. ÃªÂ²ÂÃ¬ÂÂ¬ Ã«Â°Â©Ã«Â²Â\n4.1 Ã¬ÂÂÃ«Â£Â Ã¬Â±ÂÃ¬Â·Â¨:\n4.2 ÃªÂ²ÂÃ¬ÂÂ¬ Ã­ÂÂ­Ã«ÂªÂ©:\n4.3 ÃªÂ²ÂÃ¬ÂÂ¬ Ã¬ÂÂ¥Ã«Â¹Â:\n\n5. Ã­ÂÂÃ¬Â Â Ã«Â°Â ÃªÂ¸Â°Ã«Â¡Â\n\n6. Ã«Â¶ÂÃ¬Â ÂÃ­ÂÂ© Ã¬Â²ÂÃ«Â¦Â¬\n' },
  { id:'cleaning', name:'Ã¬ÂÂ¸Ã¬Â²ÂÃ¯Â¿Â½Ã¬ÂÂÃ«ÂÂ Ã¬Â ÂÃ¬Â°Â¨Ã¬ÂÂ', category:'Ã­ÂÂÃªÂ²Â½', desc:'Ã¬ÂÂ¸Ã¬Â²ÂÃ¯Â¿Â½Ã¬ÂÂÃ«ÂÂ Ã¬Â ÂÃ¬Â°Â¨ Ã­ÂÂÃ¬Â¤Â Ã¬ÂÂÃ¬ÂÂ',
    body:'1. Ã«ÂªÂ©Ã¬Â Â\n\n2. Ã¬Â ÂÃ¬ÂÂ©Ã«Â²ÂÃ¬ÂÂ\n\n3. Ã¬ÂÂ¸Ã¬Â²ÂÃ¯Â¿Â½Ã¬ÂÂÃ«ÂÂ Ã¬Â£Â¼ÃªÂ¸Â°\n\n4. Ã¬ÂÂ¬Ã¬ÂÂ© Ã¬ÂÂ½Ã­ÂÂ Ã«Â°Â Ã«ÂÂÃ«ÂÂ\n\n5. Ã¬Â ÂÃ¬Â°Â¨\n5.1 Ã¬Â¤ÂÃ«Â¹Â:\n5.2 Ã¬ÂÂ¸Ã¬Â²Â:\n5.3 Ã¬ÂÂÃ«ÂÂ:\n5.4 ÃªÂ±Â´Ã¬Â¡Â°:\n\n6. Ã¬ÂÂ Ã­ÂÂ¨Ã¬ÂÂ± Ã­ÂÂÃ¬ÂÂ¸\n\n7. ÃªÂ¸Â°Ã«Â¡Â\n' },
  { id:'capa', name:'CAPA Ã¬Â ÂÃ¬Â°Â¨Ã¬ÂÂ', category:'Ã­ÂÂÃ¬Â§Â', desc:'Ã¬ÂÂÃ¬Â ÂÃ¯Â¿Â½Ã¬ÂÂÃ«Â°Â©Ã¬Â¡Â°Ã¬Â¹Â Ã¬Â²ÂÃ«Â¦Â¬ Ã­ÂÂÃ¬Â¤Â Ã¬ÂÂÃ¬ÂÂ',
    body:'1. Ã«ÂªÂ©Ã¬Â Â\n\n2. Ã¬Â ÂÃ¬ÂÂ©Ã«Â²ÂÃ¬ÂÂ\n\n3. Ã«Â°ÂÃ­ÂÂ ÃªÂ¸Â°Ã¬Â¤Â\n\n4. Ã¬Â ÂÃ¬Â°Â¨\n4.1 Ã«Â¶ÂÃ¬Â ÂÃ­ÂÂ© Ã¬ÂÂÃ«Â³Â:\n4.2 Ã¬ÂÂÃ¬ÂÂ¸ Ã«Â¶ÂÃ¬ÂÂ:\n4.3 Ã¬ÂÂÃ¬Â Â/Ã¬ÂÂÃ«Â°Â© Ã¬Â¡Â°Ã¬Â¹Â ÃªÂ³ÂÃ­ÂÂ:\n4.4 Ã¬ÂÂ¤Ã­ÂÂ:\n4.5 Ã­ÂÂ¨ÃªÂ³Â¼Ã¬ÂÂ± Ã­ÂÂÃ¬ÂÂ¸:\n\n5. ÃªÂ¸Â°Ã«Â¡Â Ã«Â°Â Ã¬Â¢ÂÃªÂ²Â°\n' },
]

const EMPTY_SOP = () => ({
  id: Date.now(),
  title: '', docNumber: '', version: '1.0', status: 'draft',
  category: 'quality', department: '', purpose: '', scope: '',
  body: '', responsibilities: '', references: '',
  approvals: [], history: [], relatedDocs: [], distribution: [],
  createdAt: new Date().toISOString().slice(0,10),
  updatedAt: new Date().toISOString().slice(0,10),
})

function Field({ label, value, onChange, editing, type='text', rows=2 }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {editing
        ? type==='textarea'
          ? <textarea rows={rows} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300" value={value||''} onChange={e=>onChange(e.target.value)}/>
          : <input type={type} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300" value={value||''} onChange={e=>onChange(e.target.value)}/>
        : <div className="text-sm text-gray-800 min-h-[2rem] px-1 whitespace-pre-wrap">{value||<span className="text-gray-300 italic">Ã¢ÂÂ</span>}</div>
      }
    </div>
  )
}

export default function SopHub() {
  const user = auth.current()
  const companyId = user?.company?.id ?? null
  useEffect(() => { _sbCidSop = companyId }, [companyId])
  useEffect(() => {
    if (!companyId) return
    supabase.from('company_data').select('payload')
      .eq('company_id', companyId).eq('data_type', 'localStorage_sync').eq('data_key', LS_KEY)
      .maybeSingle().then(({ data: row }) => {
        if (row?.payload != null) {
          localStorage.setItem(LS_KEY, JSON.stringify(row.payload))
          setSops(row.payload)
        }
      })
  }, [companyId])
  const [sops, setSops] = useState(lsRead)
  const [selectedId, setSelectedId] = useState(null)
  const [editing, setEditing] = useState(false)
  const [activeTab, setActiveTab] = useState('info')
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newCat, setNewCat] = useState('quality')

  useEffect(() => {
    lsWrite(sops)
    if (_sbCidSop) {
      supabase.from('company_data').upsert({
        company_id: _sbCidSop, data_type: 'localStorage_sync',
        data_key: LS_KEY, payload: sops
      }, { onConflict: 'company_id,data_type,data_key' })
    }
  }, [sops])

  const selected = sops.find(s => s.id === selectedId) || null

  const filtered = useMemo(() => sops.filter(s => {
    const q = search.toLowerCase()
    const matchQ = !q || s.title.toLowerCase().includes(q) || (s.docNumber||'').toLowerCase().includes(q)
    const matchC = filterCat==='all' || s.category===filterCat
    const matchS = filterStatus==='all' || s.status===filterStatus
    return matchQ && matchC && matchS
  }), [sops, search, filterCat, filterStatus])

  const addSop = () => {
    if (!newTitle.trim()) return
    const s = { ...EMPTY_SOP(), title: newTitle.trim(), category: newCat }
    setSops(prev => [s, ...prev])
    setSelectedId(s.id); setEditing(true); setActiveTab('info')
    setShowForm(false); setNewTitle(''); setNewCat('quality')
  }

  const updateField = (field, val) => {
    setSops(prev => prev.map(s => s.id===selectedId ? { ...s, [field]:val, updatedAt:new Date().toISOString().slice(0,10) } : s))
  }

  const deleteSop = id => { if(window.confirm('Ã¬ÂÂ­Ã¬Â ÂÃ­ÂÂÃ¬ÂÂÃªÂ²Â Ã¬ÂÂµÃ«ÂÂÃªÂ¹Â?')) { setSops(prev=>prev.filter(s=>s.id!==id)); if(selectedId===id){setSelectedId(null);setEditing(false)} } }

  const addApproval = () => {
    const entry = { id:Date.now(), role:'', name:'', date:'', decision:'pending', comment:'' }
    setSops(prev=>prev.map(s=>s.id===selectedId?{...s,approvals:[...s.approvals,entry]}:s))
  }
  const updateApproval = (aId, field, val) => {
    setSops(prev=>prev.map(s=>s.id===selectedId?{...s,approvals:s.approvals.map(a=>a.id===aId?{...a,[field]:val}:a)}:s))
  }
  const removeApproval = aId => {
    setSops(prev=>prev.map(s=>s.id===selectedId?{...s,approvals:s.approvals.filter(a=>a.id!==aId)}:s))
  }

  const addHistory = () => {
    const entry = { id:Date.now(), date:new Date().toISOString().slice(0,10), version:'', author:'', summary:'' }
    setSops(prev=>prev.map(s=>s.id===selectedId?{...s,history:[entry,...s.history]}:s))
  }
  const updateHistory = (hId, field, val) => {
    setSops(prev=>prev.map(s=>s.id===selectedId?{...s,history:s.history.map(h=>h.id===hId?{...h,[field]:val}:h)}:s))
  }

  const addRelated = () => {
    const entry = { id:Date.now(), docNumber:'', title:'', relation:'' }
    setSops(prev=>prev.map(s=>s.id===selectedId?{...s,relatedDocs:[...s.relatedDocs,entry]}:s))
  }
  const updateRelated = (rId, field, val) => {
    setSops(prev=>prev.map(s=>s.id===selectedId?{...s,relatedDocs:s.relatedDocs.map(r=>r.id===rId?{...r,[field]:val}:r)}:s))
  }
  const removeRelated = rId => {
    setSops(prev=>prev.map(s=>s.id===selectedId?{...s,relatedDocs:s.relatedDocs.filter(r=>r.id!==rId)}:s))
  }

  const addDist = () => {
    const entry = { id:Date.now(), department:'', name:'', date:'', method:'Ã¬ÂÂ´Ã«Â©ÂÃ¬ÂÂ¼' }
    setSops(prev=>prev.map(s=>s.id===selectedId?{...s,distribution:[...s.distribution,entry]}:s))
  }
  const updateDist = (dId, field, val) => {
    setSops(prev=>prev.map(s=>s.id===selectedId?{...s,distribution:s.distribution.map(d=>d.id===dId?{...d,[field]:val}:d)}:s))
  }
  const removeDist = dId => {
    setSops(prev=>prev.map(s=>s.id===selectedId?{...s,distribution:s.distribution.filter(d=>d.id!==dId)}:s))
  }

  const stats = useMemo(()=>({
    total: sops.length,
    approved: sops.filter(s=>s.status==='approved').length,
    review: sops.filter(s=>s.status==='review').length,
    draft: sops.filter(s=>s.status==='draft').length,
  }),[sops])

  const handlePrint = (sop) => {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${sop.title}</title>
<style>body{font-family:sans-serif;padding:20px;max-width:800px;margin:auto}
h1{font-size:20px;text-align:center;margin-bottom:4px}
.meta{text-align:center;color:#555;font-size:12px;margin-bottom:20px}
table{width:100%;border-collapse:collapse;margin-bottom:16px}
td,th{border:1px solid #ccc;padding:6px 10px;font-size:12px;text-align:left}
th{background:#f5f5f5;width:100px}
pre{white-space:pre-wrap;font-size:13px;border:1px solid #eee;padding:12px;background:#fafafa;border-radius:4px}
@media print{button{display:none}}</style></head>
<body>
<h1>${sop.title}</h1>
<p class="meta">Ã«Â¬Â¸Ã¬ÂÂÃ«Â²ÂÃ­ÂÂ¸: ${sop.docNumber||''} | Ã«Â²ÂÃ¬Â Â: ${sop.version||''} | Ã¬ÂÂÃ­ÂÂ: ${sop.status||''}</p>
<table>
<tr><th>Ã¬Â¹Â´Ã­ÂÂÃªÂ³Â Ã«Â¦Â¬</th><td>${sop.category||''}</td><th>Ã«Â¶ÂÃ¬ÂÂ</th><td>${sop.department||''}</td></tr>
<tr><th>Ã«ÂªÂ©Ã¬Â Â</th><td colspan="3">${sop.purpose||''}</td></tr>
<tr><th>Ã¬Â ÂÃ¬ÂÂ©Ã«Â²ÂÃ¬ÂÂ</th><td colspan="3">${sop.scope||''}</td></tr>
<tr><th>Ã¬ÂÂÃ¬ÂÂ±Ã¬ÂÂ</th><td colspan="3">${sop.responsibilities||''}</td></tr>
</table>
<h3>Ã«Â³Â¸Ã«Â¬Â¸</h3><pre>${sop.body||'(Ã«ÂÂ´Ã¬ÂÂ© Ã¬ÂÂÃ¬ÂÂ)'}</pre>
</body></html>`;
    const w = window.open('','_blank','width=820,height=700');
    if (!w) { alert('Ã­ÂÂÃ¬ÂÂÃ¬ÂÂ´ Ã¬Â°Â¨Ã«ÂÂ¨Ã«ÂÂÃ¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤. Ã­ÂÂÃ¬ÂÂ Ã­ÂÂÃ¬ÂÂ© Ã­ÂÂ Ã«ÂÂ¤Ã¬ÂÂ Ã¬ÂÂÃ«ÂÂÃ­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ.'); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 600);
  }

  function renderTab() {
    if (!selected) return null
    switch(activeTab) {
      case 'info': return (
        <div className="grid grid-cols-2 gap-x-6">
          <Field label="SOP Ã¬Â ÂÃ«ÂªÂ©" value={selected.title} onChange={v=>updateField('title',v)} editing={editing}/>
          <Field label="Ã«Â¬Â¸Ã¬ÂÂÃ«Â²ÂÃ­ÂÂ¸" value={selected.docNumber} onChange={v=>updateField('docNumber',v)} editing={editing}/>
          <Field label="Ã«Â²ÂÃ¬Â Â" value={selected.version} onChange={v=>updateField('version',v)} editing={editing}/>
          <div className="mb-4"><label className="block text-xs font-medium text-gray-500 mb-1">Ã«Â¶ÂÃ«Â¥Â</label>
            {editing
              ? <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={selected.category} onChange={e=>updateField('category',e.target.value)}>
                  {CATEGORIES.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              : <div className="text-sm text-gray-800 px-1">{CATEGORIES.find(c=>c.value===selected.category)?.label||'Ã¢ÂÂ'}</div>}
          </div>
          <Field label="Ã«ÂÂ´Ã«ÂÂ¹Ã«Â¶ÂÃ¬ÂÂ" value={selected.department} onChange={v=>updateField('department',v)} editing={editing}/>
          <Field label="Ã¬ÂÂÃ¬ÂÂ±Ã¬ÂÂ¼" value={selected.createdAt} onChange={v=>updateField('createdAt',v)} editing={editing} type="date"/>
          <div className="col-span-2"><Field label="Ã«ÂªÂ©Ã¬Â Â" value={selected.purpose} onChange={v=>updateField('purpose',v)} editing={editing} type="textarea" rows={3}/></div>
          <div className="col-span-2"><Field label="Ã¬Â ÂÃ¬ÂÂ©Ã«Â²ÂÃ¬ÂÂ" value={selected.scope} onChange={v=>updateField('scope',v)} editing={editing} type="textarea" rows={2}/></div>
          <div className="col-span-2"><Field label="Ã¬Â±ÂÃ¬ÂÂÃªÂ³Â¼ ÃªÂ¶ÂÃ­ÂÂ" value={selected.responsibilities} onChange={v=>updateField('responsibilities',v)} editing={editing} type="textarea" rows={2}/></div>
          <div className="col-span-2"><Field label="Ã¬Â°Â¸Ã¬Â¡Â°Ã«Â¬Â¸Ã¬ÂÂ" value={selected.references} onChange={v=>updateField('references',v)} editing={editing} type="textarea" rows={2}/></div>
        </div>
      )
      case 'body': return (
        <div>
          <div className="text-xs text-gray-500 mb-2">Ã¬Â ÂÃ¬Â°Â¨ Ã«Â³Â¸Ã«Â¬Â¸ Ã¢ÂÂ ÃªÂ°Â Ã«ÂÂ¨ÃªÂ³Â, Ã«Â°Â©Ã«Â²Â, ÃªÂ¸Â°Ã¬Â¤ÂÃ¬ÂÂ Ã¬ÂÂÃ¬ÂÂ¸Ã­ÂÂ ÃªÂ¸Â°Ã¬ÂÂ Ã­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ.</div>
          {editing
            ? <textarea rows={20} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-300" value={selected.body||''} onChange={e=>updateField('body',e.target.value)} placeholder="1. Ã«ÂªÂ©Ã¬Â Â&#10;2. Ã¬Â ÂÃ¬ÂÂ©Ã«Â²ÂÃ¬ÂÂ&#10;3. Ã¬Â ÂÃ¬Â°Â¨&#10;  3.1 ..." />
            : <pre className="whitespace-pre-wrap text-sm text-gray-800 bg-gray-50 rounded-lg p-4 min-h-[12rem]">{selected.body||<span className="text-gray-300 italic">Ã«Â³Â¸Ã«Â¬Â¸ Ã¬ÂÂÃ¬ÂÂ</span>}</pre>}
        </div>
      )
      case 'approval': return (
        <div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-gray-500">ÃªÂ²ÂÃ­ÂÂ ÃÂ·Ã¬ÂÂ¹Ã¬ÂÂ¸ Ã¬ÂÂ´Ã«Â Â¥Ã¬ÂÂ Ã«ÂÂ±Ã«Â¡ÂÃ­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ.</span>
            <button className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700" onClick={addApproval}><Plus size={12} className="inline mr-1"/>Ã¬Â¶ÂÃªÂ°Â</button>
          </div>
          {selected.approvals.length===0 && <div className="text-center text-xs text-gray-400 py-6">Ã«ÂÂ±Ã«Â¡ÂÃ«ÂÂ Ã¬ÂÂ¹Ã¬ÂÂ¸ Ã¬ÂÂ´Ã«Â Â¥Ã¬ÂÂ´ Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤.</div>}
          <div className="space-y-2">
            {selected.approvals.map(a=>(
              <div key={a.id} className="grid grid-cols-5 gap-2 bg-gray-50 p-3 rounded-lg text-xs">
                <input className="border rounded px-2 py-1" placeholder="Ã¬ÂÂ­Ã­ÂÂ (Ã¬ÂÂÃ¬ÂÂ±/ÃªÂ²ÂÃ­ÂÂ /Ã¬ÂÂ¹Ã¬ÂÂ¸)" value={a.role} onChange={e=>updateApproval(a.id,'role',e.target.value)}/>
                <input className="border rounded px-2 py-1" placeholder="Ã¬ÂÂ±Ã«ÂªÂ" value={a.name} onChange={e=>updateApproval(a.id,'name',e.target.value)}/>
                <input type="date" className="border rounded px-2 py-1" value={a.date} onChange={e=>updateApproval(a.id,'date',e.target.value)}/>
                <select className="border rounded px-2 py-1" value={a.decision} onChange={e=>updateApproval(a.id,'decision',e.target.value)}>
                  <option value="pending">Ã«ÂÂÃªÂ¸Â°</option><option value="approved">Ã¬ÂÂ¹Ã¬ÂÂ¸</option><option value="rejected">Ã«Â°ÂÃ«Â Â¤</option>
                </select>
                <button className="text-red-400 hover:text-red-600" onClick={()=>removeApproval(a.id)}><Trash2 size={13}/></button>
              </div>
            ))}
          </div>
        </div>
      )
      case 'history': return (
        <div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-gray-500">Ã«Â²ÂÃ¬Â ÂÃ«Â³Â ÃªÂ°ÂÃ¬Â Â Ã¬ÂÂ´Ã«Â Â¥</span>
            <button className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700" onClick={addHistory}><Plus size={12} className="inline mr-1"/>Ã¬Â¶ÂÃªÂ°Â</button>
          </div>
          {selected.history.length===0 && <div className="text-center text-xs text-gray-400 py-6">ÃªÂ°ÂÃ¬Â Â Ã¬ÂÂ´Ã«Â Â¥Ã¬ÂÂ´ Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤.</div>}
          <div className="space-y-2">
            {selected.history.map(h=>(
              <div key={h.id} className="grid grid-cols-4 gap-2 bg-gray-50 p-3 rounded-lg text-xs">
                <input type="date" className="border rounded px-2 py-1" value={h.date} onChange={e=>updateHistory(h.id,'date',e.target.value)}/>
                <input className="border rounded px-2 py-1 w-20" placeholder="Ã«Â²ÂÃ¬Â Â" value={h.version} onChange={e=>updateHistory(h.id,'version',e.target.value)}/>
                <input className="border rounded px-2 py-1" placeholder="ÃªÂ°ÂÃ¬Â ÂÃ¬ÂÂ" value={h.author} onChange={e=>updateHistory(h.id,'author',e.target.value)}/>
                <input className="border rounded px-2 py-1 flex-1" placeholder="ÃªÂ°ÂÃ¬Â Â Ã¬ÂÂÃ¬ÂÂ½" value={h.summary} onChange={e=>updateHistory(h.id,'summary',e.target.value)}/>
              </div>
            ))}
          </div>
        </div>
      )
      case 'related': return (
        <div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-gray-500">ÃªÂ´ÂÃ«Â Â¨ Ã«Â¬Â¸Ã¬ÂÂÃÂ·SOP</span>
            <button className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700" onClick={addRelated}><Plus size={12} className="inline mr-1"/>Ã¬Â¶ÂÃªÂ°Â</button>
          </div>
          {selected.relatedDocs.length===0 && <div className="text-center text-xs text-gray-400 py-6">ÃªÂ´ÂÃ«Â Â¨ Ã«Â¬Â¸Ã¬ÂÂÃªÂ°Â Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤.</div>}
          <div className="space-y-2">
            {selected.relatedDocs.map(r=>(
              <div key={r.id} className="grid grid-cols-4 gap-2 bg-gray-50 p-3 rounded-lg text-xs">
                <input className="border rounded px-2 py-1" placeholder="Ã«Â¬Â¸Ã¬ÂÂÃ«Â²ÂÃ­ÂÂ¸" value={r.docNumber} onChange={e=>updateRelated(r.id,'docNumber',e.target.value)}/>
                <input className="border rounded px-2 py-1 col-span-2" placeholder="Ã«Â¬Â¸Ã¬ÂÂÃ«ÂªÂ" value={r.title} onChange={e=>updateRelated(r.id,'title',e.target.value)}/>
                <button className="text-red-400 hover:text-red-600 text-right" onClick={()=>removeRelated(r.id)}><Trash2 size={13}/></button>
              </div>
            ))}
          </div>
        </div>
      )
      case 'dist': return (
        <div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-gray-500">Ã«Â°Â°Ã­ÂÂ¬ Ã¬ÂÂ´Ã«Â Â¥</span>
            <button className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700" onClick={addDist}><Plus size={12} className="inline mr-1"/>Ã¬Â¶ÂÃªÂ°Â</button>
          </div>
          {selected.distribution.length===0 && <div className="text-center text-xs text-gray-400 py-6">Ã«Â°Â°Ã­ÂÂ¬ Ã¬ÂÂ´Ã«Â Â¥Ã¬ÂÂ´ Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤.</div>}
          <div className="space-y-2">
            {selected.distribution.map(d=>(
              <div key={d.id} className="grid grid-cols-4 gap-2 bg-gray-50 p-3 rounded-lg text-xs">
                <input className="border rounded px-2 py-1" placeholder="Ã«Â¶ÂÃ¬ÂÂ" value={d.department} onChange={e=>updateDist(d.id,'department',e.target.value)}/>
                <input className="border rounded px-2 py-1" placeholder="Ã¬ÂÂÃ«Â Â¹Ã¬ÂÂ¸" value={d.name} onChange={e=>updateDist(d.id,'name',e.target.value)}/>
                <input type="date" className="border rounded px-2 py-1" value={d.date} onChange={e=>updateDist(d.id,'date',e.target.value)}/>
                <button className="text-red-400 hover:text-red-600 text-right" onClick={()=>removeDist(d.id)}><Trash2 size={13}/></button>
              </div>
            ))}
          </div>
        </div>
      )
      case 'print': return (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-800">Ã«Â¬Â¸Ã¬ÂÂ Ã¬Â¶ÂÃ«Â Â¥</h3>
            <button onClick={() => handlePrint(selected)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
              <Printer size={14}/> Ã¬Â¶ÂÃ«Â Â¥
            </button>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4 text-sm">
            <div className="text-center border-b pb-4">
              <h2 className="text-xl font-bold text-gray-900">{selected.title}</h2>
              <p className="text-xs text-gray-500 mt-1">
                Ã«Â¬Â¸Ã¬ÂÂÃ«Â²ÂÃ­ÂÂ¸: {selected.docNumber||'-'} &nbsp;|&nbsp; Ã«Â²ÂÃ¬Â Â: {selected.version||'-'} &nbsp;|&nbsp; Ã¬ÂÂÃ­ÂÂ: {selected.status||'-'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><span className="font-medium text-gray-600">Ã¬Â¹Â´Ã­ÂÂÃªÂ³Â Ã«Â¦Â¬:</span> {selected.category||'-'}</div>
              <div><span className="font-medium text-gray-600">Ã«Â¶ÂÃ¬ÂÂ:</span> {selected.department||'-'}</div>
              <div className="col-span-2"><span className="font-medium text-gray-600">Ã«ÂªÂ©Ã¬Â Â:</span> {selected.purpose||'-'}</div>
              <div className="col-span-2"><span className="font-medium text-gray-600">Ã¬Â ÂÃ¬ÂÂ©Ã«Â²ÂÃ¬ÂÂ:</span> {selected.scope||'-'}</div>
            </div>
            <div>
              <div className="font-medium text-gray-600 mb-2">Ã«Â³Â¸Ã«Â¬Â¸</div>
              <pre className="whitespace-pre-wrap text-sm text-gray-800 bg-gray-50 rounded-lg p-4 min-h-[120px]">
                {selected.body||'(Ã«ÂÂ´Ã¬ÂÂ© Ã¬ÂÂÃ¬ÂÂ)'}
              </pre>
            </div>
          </div>
        </div>
      )
      case 'template': return (
        <div>
          <h3 className="font-semibold text-gray-800 mb-1">Ã«Â¬Â¸Ã¬ÂÂ Ã¬ÂÂÃ¬ÂÂ Ã¬ÂÂ Ã­ÂÂ</h3>
          <p className="text-xs text-gray-500 mb-4">Ã¬ÂÂÃ¬ÂÂÃ¬ÂÂ Ã¬ÂÂ Ã­ÂÂÃ­ÂÂÃ«Â©Â´ Ã«Â³Â¸Ã«Â¬Â¸ Ã­ÂÂ­Ã¬ÂÂ Ã¬ÂÂÃ«ÂÂÃ¬ÂÂ¼Ã«Â¡Â Ã¬Â±ÂÃ¬ÂÂÃ¬Â§ÂÃ«ÂÂÃ«ÂÂ¤.</p>
          <div className="grid grid-cols-1 gap-3">
            {SOP_TEMPLATES.map(tpl => (
              <div key={tpl.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer transition-colors"
                onClick={() => { updateField('body', tpl.body.replace(/\\n/g,'\n')); setActiveTab('body'); }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm text-gray-900">{tpl.name}</span>
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{tpl.category}</span>
                </div>
                <p className="text-xs text-gray-500">{tpl.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )
      default: return null
    }
  }

  return (
    <AppLayout>
      <HubBanner
        title="Ã¬ÂÂÃ¬ÂÂÃ­ÂÂÃ¬Â¤ÂÃ¬ÂÂ(SOP)"
        subtitle="ISO 13485 ÃÂ§4.2 Ã¢ÂÂ Ã¬ÂÂÃ«Â¬Â´ Ã¬Â ÂÃ¬Â°Â¨ÃÂ·Ã¬ÂÂÃ¬ÂÂ ÃªÂ¸Â°Ã¬Â¤Â Ã«Â¬Â¸Ã¬ÂÂ Ã­ÂÂµÃ­ÂÂ© ÃªÂ´ÂÃ«Â¦Â¬"
        icon={BookOpen}
        color="#4f46e5"
        workflow={['SOP Ã«ÂÂ±Ã«Â¡Â','Ã«Â³Â¸Ã«Â¬Â¸ Ã¬ÂÂÃ¬ÂÂ±','ÃªÂ²ÂÃ­ÂÂ ','Ã¬ÂÂ¹Ã¬ÂÂ¸','Ã«Â°Â°Ã­ÂÂ¬']}
      />

      {/* Ã­ÂÂµÃªÂ³Â */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[{label:'Ã¬Â ÂÃ¬Â²Â´',value:stats.total,color:'text-indigo-600'},
          {label:'Ã¬ÂÂ¹Ã¬ÂÂ¸',value:stats.approved,color:'text-green-600'},
          {label:'ÃªÂ²ÂÃ­ÂÂ Ã¬Â¤Â',value:stats.review,color:'text-yellow-600'},
          {label:'Ã¬Â´ÂÃ¬ÂÂ',value:stats.draft,color:'text-gray-500'}
        ].map(c=>(
          <div key={c.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
            <div className="text-xs text-gray-400 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-5">
        {/* Ã¬Â¢ÂÃ¬Â¸Â¡ Ã«ÂªÂ©Ã«Â¡Â */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">SOP Ã«ÂªÂ©Ã«Â¡Â</span>
              <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                <AIDraftButton docType="sop" />
                <button className="text-indigo-600 hover:text-indigo-800" onClick={()=>setShowForm(true)}><Plus size={16}/></button>
              </div>
            </div>
            <div className="px-3 py-2 border-b border-gray-100 space-y-1">
              <input className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none"
                placeholder="Ã¬Â ÂÃ«ÂªÂ©ÃÂ·Ã«Â¬Â¸Ã¬ÂÂÃ«Â²ÂÃ­ÂÂ¸ ÃªÂ²ÂÃ¬ÂÂ" value={search} onChange={e=>setSearch(e.target.value)}/>
              <div className="flex gap-1">
                <select className="flex-1 border border-gray-200 rounded px-1 py-1 text-xs" value={filterCat} onChange={e=>setFilterCat(e.target.value)}>
                  <option value="all">Ã¬Â ÂÃ¬Â²Â´Ã«Â¶ÂÃ«Â¥Â</option>
                  {CATEGORIES.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <select className="flex-1 border border-gray-200 rounded px-1 py-1 text-xs" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
                  <option value="all">Ã¬Â ÂÃ¬Â²Â´Ã¬ÂÂÃ­ÂÂ</option>
                  {Object.entries(STATUS_META).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>
            <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
              {filtered.length===0 && <div className="px-4 py-6 text-center text-xs text-gray-400">SOPÃ«Â¥Â¼ Ã«ÂÂ±Ã«Â¡ÂÃ­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ.<br/>Ã¬ÂÂ°Ã¬Â¸Â¡ Ã¬ÂÂÃ«ÂÂ¨ + Ã«Â²ÂÃ­ÂÂ¼</div>}
              {filtered.map(s=>(
                <div key={s.id}
                  className={`px-4 py-3 cursor-pointer hover:bg-indigo-50 transition-colors ${selectedId===s.id?'bg-indigo-50 border-l-2 border-indigo-500':''}`}
                  onClick={()=>{setSelectedId(s.id);setEditing(false);setActiveTab('info')}}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{s.title}</div>
                      <div className="text-xs text-gray-500">{s.docNumber||'Ã¢ÂÂ'} ÃÂ· {CATEGORIES.find(c=>c.value===s.category)?.label}</div>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded ml-1 flex-shrink-0 ${STATUS_META[s.status]?.color}`}>{STATUS_META[s.status]?.label}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">v{s.version} ÃÂ· {s.updatedAt}</div>
                </div>
              ))}
            </div>
          </div>

          {showForm && (
            <div className="bg-white rounded-xl border border-indigo-200 shadow-sm p-4 mt-3">
              <div className="text-sm font-semibold text-gray-700 mb-3 flex justify-between">Ã¬ÂÂ SOP Ã«ÂÂ±Ã«Â¡Â <button onClick={()=>setShowForm(false)}><X size={14}/></button></div>
              <input className="w-full border rounded px-2 py-1 text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-indigo-300" placeholder="SOP Ã¬Â ÂÃ«ÂªÂ© *" value={newTitle} onChange={e=>setNewTitle(e.target.value)}/>
              <select className="w-full border rounded px-2 py-1 text-sm mb-3" value={newCat} onChange={e=>setNewCat(e.target.value)}>
                {CATEGORIES.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <button className="w-full bg-indigo-600 text-white text-sm py-1.5 rounded hover:bg-indigo-700" onClick={addSop}>Ã«ÂÂ±Ã«Â¡Â</button>
            </div>
          )}
        </div>

        {/* Ã¬ÂÂ°Ã¬Â¸Â¡ Ã¬ÂÂÃ¬ÂÂ¸ */}
        <div className="flex-1 min-w-0">
          {!selected ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
              <BookOpen size={40} className="mx-auto mb-3 opacity-30"/>
              <div className="text-sm">Ã¬Â¢ÂÃ¬Â¸Â¡Ã¬ÂÂÃ¬ÂÂ SOPÃ«Â¥Â¼ Ã¬ÂÂ Ã­ÂÂÃ­ÂÂÃªÂ±Â°Ã«ÂÂ Ã¬ÂÂÃ«Â¡Â Ã«ÂÂ±Ã«Â¡ÂÃ­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ.</div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Ã­ÂÂ¤Ã«ÂÂ */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-bold text-gray-800">{selected.title}</span>
                    {selected.docNumber && <span className="text-xs text-gray-400">ÃÂ· {selected.docNumber}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_META[selected.status]?.color}`}>{STATUS_META[selected.status]?.label}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">v{selected.version} ÃÂ· {CATEGORIES.find(c=>c.value===selected.category)?.label} ÃÂ· Ã¬ÂµÂÃ¬Â¢ÂÃ¬ÂÂÃ¬Â Â {selected.updatedAt}</div>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  <select className="border rounded text-xs px-2 py-1 text-gray-600" value={selected.status} onChange={e=>updateField('status',e.target.value)}>
                    <option value="draft">Ã¬Â´ÂÃ¬ÂÂ</option><option value="review">ÃªÂ²ÂÃ­ÂÂ Ã¬Â¤Â</option><option value="approved">Ã¬ÂÂ¹Ã¬ÂÂ¸</option><option value="obsolete">Ã­ÂÂÃªÂ¸Â°</option>
                  </select>
                  {editing
                    ? <button className="flex items-center gap-1 text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700" onClick={()=>setEditing(false)}><Save size={12}/> Ã¬Â ÂÃ¬ÂÂ¥</button>
                    : <button className="flex items-center gap-1 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700" onClick={()=>setEditing(true)}><Edit2 size={12}/> Ã­ÂÂ¸Ã¬Â§Â</button>
                  }
                  <button className="text-xs text-red-400 hover:text-red-600 px-2 py-1" onClick={()=>deleteSop(selected.id)}><Trash2 size={14}/></button>
                </div>
              </div>

              {/* Ã­ÂÂ­ */}
              <div className="flex border-b border-gray-100 overflow-x-auto bg-gray-50">
                {SOP_TABS.map(t=>{
                  const Icon=t.icon
                  return (
                    <button key={t.key}
                      className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab===t.key?'border-indigo-500 text-indigo-700 bg-white':'border-transparent text-gray-500 hover:text-gray-700'}`}
                      onClick={()=>setActiveTab(t.key)}>
                      <Icon size={13}/>{t.label}
                    </button>
                  )
                })}
              </div>

              <div className="p-5">{renderTab()}</div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}