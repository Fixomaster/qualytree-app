// src/pages/sop/SopHub.jsx
// ISO 13485 §4.2 — 작업표준서(SOP) 전용 관리 모듈
import React, { useState, useEffect, useMemo } from 'react'
import { Plus, Save, Edit2, Trash2, FileText, BookOpen,
  CheckCircle2, Clock, AlertCircle, X, ChevronDown, ChevronRight,
  Send, RotateCcw, Copy, Printer } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'

const LS_KEY = 'qualytree.sop'
const lsRead = () => { try { return JSON.parse(localStorage.getItem(LS_KEY)||'[]') } catch { return [] } }
const lsWrite = v => localStorage.setItem(LS_KEY, JSON.stringify(v))

const CATEGORIES = [
  { value:'quality',    label:'품질관리' },
  { value:'production', label:'생산' },
  { value:'inspection', label:'검사' },
  { value:'purchase',   label:'구매' },
  { value:'design',     label:'설계개발' },
  { value:'regulatory', label:'인허가' },
  { value:'other',      label:'기타' },
]
const STATUS_META = {
  draft:    { label:'초안',    color:'bg-gray-100 text-gray-600' },
  review:   { label:'검토중',  color:'bg-yellow-100 text-yellow-700' },
  approved: { label:'승인',    color:'bg-green-100 text-green-700' },
  obsolete: { label:'폐기',    color:'bg-red-100 text-red-500' },
}
const SOP_TABS = [
  { key:'info',     label:'기본정보',   icon: FileText },
  { key:'body',     label:'본문작성',   icon: BookOpen },
  { key:'approval', label:'검토·승인',  icon: CheckCircle2 },
  { key:'history',  label:'개정이력',   icon: RotateCcw },
  { key:'related',  label:'관련문서',   icon: Copy },
  { key:'dist',     label:'배포현황',   icon: Send },
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
        : <div className="text-sm text-gray-800 min-h-[2rem] px-1 whitespace-pre-wrap">{value||<span className="text-gray-300 italic">—</span>}</div>
      }
    </div>
  )
}

export default function SopHub() {
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

  useEffect(() => { lsWrite(sops) }, [sops])

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

  const deleteSop = id => { if(window.confirm('삭제하시겠습니까?')) { setSops(prev=>prev.filter(s=>s.id!==id)); if(selectedId===id){setSelectedId(null);setEditing(false)} } }

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
    const entry = { id:Date.now(), department:'', name:'', date:'', method:'이메일' }
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

  function renderTab() {
    if (!selected) return null
    switch(activeTab) {
      case 'info': return (
        <div className="grid grid-cols-2 gap-x-6">
          <Field label="SOP 제목" value={selected.title} onChange={v=>updateField('title',v)} editing={editing}/>
          <Field label="문서번호" value={selected.docNumber} onChange={v=>updateField('docNumber',v)} editing={editing}/>
          <Field label="버전" value={selected.version} onChange={v=>updateField('version',v)} editing={editing}/>
          <div className="mb-4"><label className="block text-xs font-medium text-gray-500 mb-1">분류</label>
            {editing
              ? <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={selected.category} onChange={e=>updateField('category',e.target.value)}>
                  {CATEGORIES.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              : <div className="text-sm text-gray-800 px-1">{CATEGORIES.find(c=>c.value===selected.category)?.label||'—'}</div>}
          </div>
          <Field label="담당부서" value={selected.department} onChange={v=>updateField('department',v)} editing={editing}/>
          <Field label="작성일" value={selected.createdAt} onChange={v=>updateField('createdAt',v)} editing={editing} type="date"/>
          <div className="col-span-2"><Field label="목적" value={selected.purpose} onChange={v=>updateField('purpose',v)} editing={editing} type="textarea" rows={3}/></div>
          <div className="col-span-2"><Field label="적용범위" value={selected.scope} onChange={v=>updateField('scope',v)} editing={editing} type="textarea" rows={2}/></div>
          <div className="col-span-2"><Field label="책임과 권한" value={selected.responsibilities} onChange={v=>updateField('responsibilities',v)} editing={editing} type="textarea" rows={2}/></div>
          <div className="col-span-2"><Field label="참조문서" value={selected.references} onChange={v=>updateField('references',v)} editing={editing} type="textarea" rows={2}/></div>
        </div>
      )
      case 'body': return (
        <div>
          <div className="text-xs text-gray-500 mb-2">절차 본문 — 각 단계, 방법, 기준을 상세히 기술하세요.</div>
          {editing
            ? <textarea rows={20} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-300" value={selected.body||''} onChange={e=>updateField('body',e.target.value)} placeholder="1. 목적&#10;2. 적용범위&#10;3. 절차&#10;  3.1 ..." />
            : <pre className="whitespace-pre-wrap text-sm text-gray-800 bg-gray-50 rounded-lg p-4 min-h-[12rem]">{selected.body||<span className="text-gray-300 italic">본문 없음</span>}</pre>}
        </div>
      )
      case 'approval': return (
        <div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-gray-500">검토·승인 이력을 등록하세요.</span>
            <button className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700" onClick={addApproval}><Plus size={12} className="inline mr-1"/>추가</button>
          </div>
          {selected.approvals.length===0 && <div className="text-center text-xs text-gray-400 py-6">등록된 승인 이력이 없습니다.</div>}
          <div className="space-y-2">
            {selected.approvals.map(a=>(
              <div key={a.id} className="grid grid-cols-5 gap-2 bg-gray-50 p-3 rounded-lg text-xs">
                <input className="border rounded px-2 py-1" placeholder="역할(작성/검토/승인)" value={a.role} onChange={e=>updateApproval(a.id,'role',e.target.value)}/>
                <input className="border rounded px-2 py-1" placeholder="성명" value={a.name} onChange={e=>updateApproval(a.id,'name',e.target.value)}/>
                <input type="date" className="border rounded px-2 py-1" value={a.date} onChange={e=>updateApproval(a.id,'date',e.target.value)}/>
                <select className="border rounded px-2 py-1" value={a.decision} onChange={e=>updateApproval(a.id,'decision',e.target.value)}>
                  <option value="pending">대기</option><option value="approved">승인</option><option value="rejected">반려</option>
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
            <span className="text-xs text-gray-500">버전별 개정 이력</span>
            <button className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700" onClick={addHistory}><Plus size={12} className="inline mr-1"/>추가</button>
          </div>
          {selected.history.length===0 && <div className="text-center text-xs text-gray-400 py-6">개정 이력이 없습니다.</div>}
          <div className="space-y-2">
            {selected.history.map(h=>(
              <div key={h.id} className="grid grid-cols-4 gap-2 bg-gray-50 p-3 rounded-lg text-xs">
                <input type="date" className="border rounded px-2 py-1" value={h.date} onChange={e=>updateHistory(h.id,'date',e.target.value)}/>
                <input className="border rounded px-2 py-1 w-20" placeholder="버전" value={h.version} onChange={e=>updateHistory(h.id,'version',e.target.value)}/>
                <input className="border rounded px-2 py-1" placeholder="개정자" value={h.author} onChange={e=>updateHistory(h.id,'author',e.target.value)}/>
                <input className="border rounded px-2 py-1 flex-1" placeholder="개정 요약" value={h.summary} onChange={e=>updateHistory(h.id,'summary',e.target.value)}/>
              </div>
            ))}
          </div>
        </div>
      )
      case 'related': return (
        <div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-gray-500">관련 문서·SOP</span>
            <button className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700" onClick={addRelated}><Plus size={12} className="inline mr-1"/>추가</button>
          </div>
          {selected.relatedDocs.length===0 && <div className="text-center text-xs text-gray-400 py-6">관련 문서가 없습니다.</div>}
          <div className="space-y-2">
            {selected.relatedDocs.map(r=>(
              <div key={r.id} className="grid grid-cols-4 gap-2 bg-gray-50 p-3 rounded-lg text-xs">
                <input className="border rounded px-2 py-1" placeholder="문서번호" value={r.docNumber} onChange={e=>updateRelated(r.id,'docNumber',e.target.value)}/>
                <input className="border rounded px-2 py-1 col-span-2" placeholder="문서명" value={r.title} onChange={e=>updateRelated(r.id,'title',e.target.value)}/>
                <button className="text-red-400 hover:text-red-600 text-right" onClick={()=>removeRelated(r.id)}><Trash2 size={13}/></button>
              </div>
            ))}
          </div>
        </div>
      )
      case 'dist': return (
        <div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-gray-500">배포 이력</span>
            <button className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700" onClick={addDist}><Plus size={12} className="inline mr-1"/>추가</button>
          </div>
          {selected.distribution.length===0 && <div className="text-center text-xs text-gray-400 py-6">배포 이력이 없습니다.</div>}
          <div className="space-y-2">
            {selected.distribution.map(d=>(
              <div key={d.id} className="grid grid-cols-4 gap-2 bg-gray-50 p-3 rounded-lg text-xs">
                <input className="border rounded px-2 py-1" placeholder="부서" value={d.department} onChange={e=>updateDist(d.id,'department',e.target.value)}/>
                <input className="border rounded px-2 py-1" placeholder="수령인" value={d.name} onChange={e=>updateDist(d.id,'name',e.target.value)}/>
                <input type="date" className="border rounded px-2 py-1" value={d.date} onChange={e=>updateDist(d.id,'date',e.target.value)}/>
                <button className="text-red-400 hover:text-red-600 text-right" onClick={()=>removeDist(d.id)}><Trash2 size={13}/></button>
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
        title="작업표준서(SOP)"
        subtitle="ISO 13485 §4.2 — 업무 절차·작업 기준 문서 통합 관리"
        icon={BookOpen}
        color="#4f46e5"
        workflow={['SOP 등록','본문 작성','검토','승인','배포']}
      />

      {/* 통계 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[{label:'전체',value:stats.total,color:'text-indigo-600'},
          {label:'승인',value:stats.approved,color:'text-green-600'},
          {label:'검토중',value:stats.review,color:'text-yellow-600'},
          {label:'초안',value:stats.draft,color:'text-gray-500'}
        ].map(c=>(
          <div key={c.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
            <div className="text-xs text-gray-400 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-5">
        {/* 좌측 목록 */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">SOP 목록</span>
              <button className="text-indigo-600 hover:text-indigo-800" onClick={()=>setShowForm(true)}><Plus size={16}/></button>
            </div>
            <div className="px-3 py-2 border-b border-gray-100 space-y-1">
              <input className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none"
                placeholder="제목·문서번호 검색" value={search} onChange={e=>setSearch(e.target.value)}/>
              <div className="flex gap-1">
                <select className="flex-1 border border-gray-200 rounded px-1 py-1 text-xs" value={filterCat} onChange={e=>setFilterCat(e.target.value)}>
                  <option value="all">전체분류</option>
                  {CATEGORIES.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <select className="flex-1 border border-gray-200 rounded px-1 py-1 text-xs" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
                  <option value="all">전체상태</option>
                  {Object.entries(STATUS_META).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>
            <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
              {filtered.length===0 && <div className="px-4 py-6 text-center text-xs text-gray-400">SOP를 등록하세요.<br/>우측 상단 + 버튼</div>}
              {filtered.map(s=>(
                <div key={s.id}
                  className={`px-4 py-3 cursor-pointer hover:bg-indigo-50 transition-colors ${selectedId===s.id?'bg-indigo-50 border-l-2 border-indigo-500':''}`}
                  onClick={()=>{setSelectedId(s.id);setEditing(false);setActiveTab('info')}}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{s.title}</div>
                      <div className="text-xs text-gray-500">{s.docNumber||'—'} · {CATEGORIES.find(c=>c.value===s.category)?.label}</div>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded ml-1 flex-shrink-0 ${STATUS_META[s.status]?.color}`}>{STATUS_META[s.status]?.label}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">v{s.version} · {s.updatedAt}</div>
                </div>
              ))}
            </div>
          </div>

          {showForm && (
            <div className="bg-white rounded-xl border border-indigo-200 shadow-sm p-4 mt-3">
              <div className="text-sm font-semibold text-gray-700 mb-3 flex justify-between">새 SOP 등록 <button onClick={()=>setShowForm(false)}><X size={14}/></button></div>
              <input className="w-full border rounded px-2 py-1 text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-indigo-300" placeholder="SOP 제목 *" value={newTitle} onChange={e=>setNewTitle(e.target.value)}/>
              <select className="w-full border rounded px-2 py-1 text-sm mb-3" value={newCat} onChange={e=>setNewCat(e.target.value)}>
                {CATEGORIES.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <button className="w-full bg-indigo-600 text-white text-sm py-1.5 rounded hover:bg-indigo-700" onClick={addSop}>등록</button>
            </div>
          )}
        </div>

        {/* 우측 상세 */}
        <div className="flex-1 min-w-0">
          {!selected ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
              <BookOpen size={40} className="mx-auto mb-3 opacity-30"/>
              <div className="text-sm">좌측에서 SOP를 선택하거나 새로 등록하세요.</div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* 헤더 */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-bold text-gray-800">{selected.title}</span>
                    {selected.docNumber && <span className="text-xs text-gray-400">· {selected.docNumber}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_META[selected.status]?.color}`}>{STATUS_META[selected.status]?.label}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">v{selected.version} · {CATEGORIES.find(c=>c.value===selected.category)?.label} · 최종수정 {selected.updatedAt}</div>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  <select className="border rounded text-xs px-2 py-1 text-gray-600" value={selected.status} onChange={e=>updateField('status',e.target.value)}>
                    <option value="draft">초안</option><option value="review">검토중</option><option value="approved">승인</option><option value="obsolete">폐기</option>
                  </select>
                  {editing
                    ? <button className="flex items-center gap-1 text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700" onClick={()=>setEditing(false)}><Save size={12}/> 저장</button>
                    : <button className="flex items-center gap-1 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700" onClick={()=>setEditing(true)}><Edit2 size={12}/> 편집</button>
                  }
                  <button className="text-xs text-red-400 hover:text-red-600 px-2 py-1" onClick={()=>deleteSop(selected.id)}><Trash2 size={14}/></button>
                </div>
              </div>

              {/* 탭 */}
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