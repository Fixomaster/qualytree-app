// src/pages/product-standard/ProductStandardHub.jsx
// ISO 13485 §7.1 / §4.2.3 — 제품 표준서 (Product Specification Document)
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
  { key:'info',       label:'기본 정보',   icon:FileText,     desc:'제품명·분류·적응증' },
  { key:'perf',       label:'성능 규격',   icon:ShieldCheck,  desc:'성능 요구사항·합격기준' },
  { key:'material',   label:'원자재 규격', icon:Layers,       desc:'재질·공급업체·규격번호' },
  { key:'test',       label:'시험 방법',   icon:FlaskConical, desc:'시험 절차·장비·기준' },
  { key:'regulatory', label:'인허가 연계', icon:Award,        desc:'허가번호·조건·갱신' },
  { key:'history',    label:'개정이력',    icon:GitBranch,    desc:'버전별 변경 사항' },
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
    approvalAuthority: '식품의약품안전처',
    expiryDate: '',
    conditions: '',
    dhfRef: '',
    dmrRef: '',
    changeHistory: '',
  },
  history: [],  // [{date, version, author, summary}]
})

const STATUS_META = {
  draft:    { label:'초안', color:'bg-yellow-100 text-yellow-800' },
  approved: { label:'승인', color:'bg-green-100 text-green-800'  },
  obsolete: { label:'폐기', color:'bg-gray-100 text-gray-500'    },
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

// 행 추가 테이블 공통 컴포넌트
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
            {rows.length===0 && <tr><td colSpan={columns.length+1} className="border px-3 py-4 text-center text-gray-400">항목 없음 — 아래에서 추가하세요.</td></tr>}
            {rows.map(row=>(
              <tr key={row.id} className="hover:bg-gray-50">
                {columns.map(c=><td key={c.key} className="border px-3 py-2 text-gray-700 whitespace-pre-wrap">{row[c.key]||'—'}</td>)}
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
          onClick={()=>{ if(Object.values(form).some(v=>v)) { onAdd({...form,id:Date.now()}); setForm(emptyRow()) }}}>행 추가</button>
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
    if (!window.confirm('삭제하시겠습니까?')) return
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

  // ── 탭 콘텐츠 ──────────────────────────────────────────────
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
          {pairs.every(([,v])=>!v) && <div className="text-gray-400 text-sm py-4 text-center">내용을 편집하려면 편집 버튼을 누르세요.</div>}
        </div>
      )
    }

    switch(activeTab) {
      case 'info': return ro ? readView([
        ['분류 등급', s.info.classification],['분류 근거', s.info.classificationBasis],
        ['의도된 용도', s.info.intendedUse],['적응증', s.info.indications],
        ['금기사항', s.info.contraindications],['대상 환자', s.info.targetPatient],
        ['사용 기간', s.info.usePeriod],['비고', s.info.notes],
      ]) : (
        <div>
          <Field label="분류 등급 (예: 2등급, Class II)" value={s.info.classification} type="input" onChange={v=>updateSection('info','classification',v)}/>
          <Field label="분류 근거 (법적 기준)" value={s.info.classificationBasis} type="input" onChange={v=>updateSection('info','classificationBasis',v)} placeholder="예: 의료기기법 시행규칙 별표"/>
          <Field label="의도된 용도" value={s.info.intendedUse} onChange={v=>updateSection('info','intendedUse',v)} rows={3} placeholder="기기의 의료적 목적 및 적용 범위"/>
          <Field label="적응증" value={s.info.indications} onChange={v=>updateSection('info','indications',v)} rows={3}/>
          <Field label="금기사항 / 주의사항" value={s.info.contraindications} onChange={v=>updateSection('info','contraindications',v)} rows={2}/>
          <Field label="대상 환자군" value={s.info.targetPatient} type="input" onChange={v=>updateSection('info','targetPatient',v)}/>
          <Field label="예상 사용 기간 / 유효기간" value={s.info.usePeriod} type="input" onChange={v=>updateSection('info','usePeriod',v)}/>
        </div>
      )

      case 'perf': return (
        <EditableTable
          columns={[
            {key:'item',label:'성능 항목'},{key:'requirement',label:'요구사항'},{key:'criterion',label:'합격 기준'},{key:'testRef',label:'시험 방법 참조'},
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
            {key:'component',label:'부품/원자재명'},{key:'material',label:'재질'},{key:'spec',label:'규격번호'},{key:'supplier',label:'공급업체'},{key:'notes',label:'비고'},
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
            {key:'testName',label:'시험명'},{key:'method',label:'시험 방법'},{key:'equipment',label:'시험 장비'},{key:'criterion',label:'판정 기준'},{key:'notes',label:'비고'},
          ]}
          rows={s.test||[]}
          onAdd={row=>addRow('test',row)}
          onDelete={id=>delRow('test',id)}
          emptyRow={()=>({testName:'',method:'',equipment:'',criterion:'',notes:''})}
        />
      )

      case 'regulatory': return ro ? readView([
        ['허가·신고 번호', s.regulatory.approvalNumber],['허가일', s.regulatory.approvalDate],
        ['허가 기관', s.regulatory.approvalAuthority],['만료일', s.regulatory.expiryDate],
        ['허가 조건', s.regulatory.conditions],['DHF 연계', s.regulatory.dhfRef],
        ['DMR 연계', s.regulatory.dmrRef],['변경 이력', s.regulatory.changeHistory],
      ]) : (
        <div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="허가·신고 번호" value={s.regulatory.approvalNumber} type="input" onChange={v=>updateSection('regulatory','approvalNumber',v)}/>
            <Field label="허가일" value={s.regulatory.approvalDate} type="input" onChange={v=>updateSection('regulatory','approvalDate',v)} placeholder="YYYY-MM-DD"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="허가 기관" value={s.regulatory.approvalAuthority} type="input" onChange={v=>updateSection('regulatory','approvalAuthority',v)}/>
            <Field label="유효 기간 / 만료일" value={s.regulatory.expiryDate} type="input" onChange={v=>updateSection('regulatory','expiryDate',v)} placeholder="YYYY-MM-DD"/>
          </div>
          <Field label="허가 조건" value={s.regulatory.conditions} onChange={v=>updateSection('regulatory','conditions',v)} rows={2}/>
          <div className="grid grid-cols-2 gap-4">
            <Field label="DHF 연계 문서번호" value={s.regulatory.dhfRef} type="input" onChange={v=>updateSection('regulatory','dhfRef',v)}/>
            <Field label="DMR 연계 문서번호" value={s.regulatory.dmrRef} type="input" onChange={v=>updateSection('regulatory','dmrRef',v)}/>
          </div>
          <Field label="변경 허가 이력 요약" value={s.regulatory.changeHistory} onChange={v=>updateSection('regulatory','changeHistory',v)} rows={3}/>
        </div>
      )

      case 'history': return (
        <div>
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-xs border-collapse">
              <thead><tr className="bg-gray-50 text-gray-500">
                <th className="border px-3 py-2 text-left">일자</th><th className="border px-3 py-2 text-left">버전</th>
                <th className="border px-3 py-2 text-left">작성자</th><th className="border px-3 py-2 text-left">변경 요약</th>
                <th className="border px-2 py-2 w-8"/>
              </tr></thead>
              <tbody>
                {(s.history||[]).length===0 && <tr><td colSpan={5} className="border px-3 py-4 text-center text-gray-400">개정이력 없음</td></tr>}
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
      default: return null
    }
  }

  const stats = React.useMemo(()=>({
    total:    products.length,
    approved: products.filter(p=>p.status==='approved').length,
    draft:    products.filter(p=>p.status==='draft').length,
  }),[products])

// HistoryAddRow — 파일 최상단에 정의해야 하므로 _ps1 마지막에 추가할 내용
// 실제로는 ps1에서 정의해야 하지만, 여기서 직접 인라인으로 처리

  function HistoryAddRow({ onAdd }) {
    const [form, setForm] = React.useState({date:new Date().toISOString().slice(0,10),version:'',author:'',summary:''})
    return (
      <div className="flex gap-2 flex-wrap bg-gray-50 p-3 rounded-lg">
        <input type="date" className="border rounded px-2 py-1 text-xs" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
        <input placeholder="버전" className="border rounded px-2 py-1 text-xs w-20" value={form.version} onChange={e=>setForm(f=>({...f,version:e.target.value}))}/>
        <input placeholder="작성자" className="border rounded px-2 py-1 text-xs w-24" value={form.author} onChange={e=>setForm(f=>({...f,author:e.target.value}))}/>
        <input placeholder="변경 요약" className="border rounded px-2 py-1 text-xs flex-1" value={form.summary} onChange={e=>setForm(f=>({...f,summary:e.target.value}))}/>
        <button className="bg-blue-600 text-white text-xs px-3 py-1 rounded hover:bg-blue-700"
          onClick={()=>{ if(form.version&&form.summary){ onAdd({...form,id:Date.now()}); setForm(f=>({...f,version:'',author:'',summary:''})) }}}>추가</button>
      </div>
    )
  }

  return (
    <AppLayout>
      <HubBanner
        title="제품 표준서"
        subtitle="ISO 13485 §7.1 / §4.2.3 — 제품별 성능규격·원자재·시험방법·인허가 통합 관리"
        icon={BookOpen}
        color="#7c3aed"
        workflow={['제품 등록','규격 작성','시험 검증','인허가 연계','승인']}
      />

      {/* 통계 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[{label:'전체 제품',value:stats.total,color:'text-purple-600'},
          {label:'승인 완료',value:stats.approved,color:'text-green-600'},
          {label:'초안',value:stats.draft,color:'text-yellow-600'}
        ].map(c=>(
          <div key={c.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
            <div className="text-xs text-gray-400 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-5">
        {/* 제품 목록 */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">제품 목록</span>
              <button className="text-purple-600 hover:text-purple-800" onClick={()=>setShowForm(true)}><Plus size={16}/></button>
            </div>
            <div className="px-3 py-2 border-b border-gray-100">
              <input className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none"
                placeholder="제품명·모델 검색" value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
              {filtered.length===0 && <div className="px-4 py-6 text-center text-xs text-gray-400">제품을 등록하세요.<br/>우측 상단 + 버튼</div>}
              {filtered.map(p=>(
                <div key={p.id}
                  className={`px-4 py-3 cursor-pointer hover:bg-purple-50 transition-colors ${selectedId===p.id?'bg-purple-50 border-l-2 border-purple-500':''}`}
                  onClick={()=>{setSelectedId(p.id);setEditing(false);setActiveTab('info')}}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{p.productName}</div>
                      <div className="text-xs text-gray-500 truncate">{p.modelNumber||'—'} {p.docNumber?'· '+p.docNumber:''}</div>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded ml-1 flex-shrink-0 ${STATUS_META[p.status]?.color}`}>{STATUS_META[p.status]?.label}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">v{p.version} · {p.updatedAt}</div>
                </div>
              ))}
            </div>
          </div>

          {showForm && (
            <div className="bg-white rounded-xl border border-purple-200 shadow-sm p-4 mt-3">
              <div className="text-sm font-semibold text-gray-700 mb-3 flex justify-between">새 제품 등록 <button onClick={()=>setShowForm(false)}><X size={14}/></button></div>
              <input className="w-full border rounded px-2 py-1 text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-purple-300" placeholder="제품명 *" value={newName} onChange={e=>setNewName(e.target.value)}/>
              <input className="w-full border rounded px-2 py-1 text-sm mb-3 focus:outline-none focus:ring-1 focus:ring-purple-300" placeholder="모델번호" value={newModel} onChange={e=>setNewModel(e.target.value)}/>
              <button className="w-full bg-purple-600 text-white text-sm py-1.5 rounded hover:bg-purple-700" onClick={addProduct}>등록</button>
            </div>
          )}
        </div>

        {/* 우측 상세 */}
        <div className="flex-1 min-w-0">
          {!selected ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
              <BookOpen size={40} className="mx-auto mb-3 opacity-30"/>
              <div className="text-sm">좌측에서 제품을 선택하거나 새로 등록하세요.</div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* 헤더 */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-bold text-gray-800">{selected.productName}</span>
                    {selected.modelNumber && <span className="text-sm text-gray-500">{selected.modelNumber}</span>}
                    {selected.docNumber && <span className="text-xs text-gray-400">· {selected.docNumber}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_META[selected.status]?.color}`}>{STATUS_META[selected.status]?.label}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">버전 v{selected.version} · 최종수정 {selected.updatedAt}</div>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  <select className="border rounded text-xs px-2 py-1 text-gray-600" value={selected.status} onChange={e=>updateRoot('status',e.target.value)}>
                    <option value="draft">초안</option><option value="approved">승인</option><option value="obsolete">폐기</option>
                  </select>
                  {editing
                    ? <button className="flex items-center gap-1 text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700" onClick={saveNow}><Save size={12}/> 저장</button>
                    : <button className="flex items-center gap-1 text-xs bg-purple-600 text-white px-3 py-1.5 rounded hover:bg-purple-700" onClick={()=>setEditing(true)}><Edit2 size={12}/> 편집</button>
                  }
                  <button className="text-xs text-red-400 hover:text-red-600 px-2 py-1" onClick={()=>deleteProduct(selected.id)}><Trash2 size={14}/></button>
                </div>
              </div>

              {editing && (
                <div className="px-5 py-3 bg-gray-50 border-b flex gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">문서번호</span>
                    <input className="border rounded px-2 py-0.5 text-xs w-32" value={selected.docNumber} onChange={e=>updateRoot('docNumber',e.target.value)} placeholder="예: PS-001"/>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">버전</span>
                    <input className="border rounded px-2 py-0.5 text-xs w-16" value={selected.version} onChange={e=>updateRoot('version',e.target.value)}/>
                  </div>
                </div>
              )}

              {/* 탭 */}
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
                    <CheckCircle2 size={12}/> 편집 버튼을 눌러 내용을 수정하세요.
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