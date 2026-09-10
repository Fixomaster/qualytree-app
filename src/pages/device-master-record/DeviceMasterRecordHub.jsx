// src/pages/device-master-record/DeviceMasterRecordHub.jsx
// ISO 13485 §7.3.10 / §4.2.3 — 의료기기 파일 (Device Master Record)
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

const LS_KEY = 'qualytree.dmr'

const DMR_TABS = [
  { key: 'info',        label: '기기 기본정보',  icon: Package,    clause: '§4.2.3(a)' },
  { key: 'specs',       label: '사양·도면',       icon: Cpu,        clause: '§4.2.3(b)' },
  { key: 'process',     label: '제조공정',        icon: Layers,     clause: '§4.2.3(c)' },
  { key: 'inspection',  label: '검사·시험기준',   icon: ShieldCheck,clause: '§4.2.3(d)' },
  { key: 'labeling',    label: '라벨·포장',       icon: Tag,        clause: '§4.2.3(e)' },
  { key: 'maintenance', label: '설치·유지보수',   icon: Wrench,     clause: '§4.2.3(f)' },
  { key: 'history',     label: '변경이력',        icon: GitBranch,  clause: '§4.2.5'    },
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
  draft:   { label: '초안', color: 'bg-yellow-100 text-yellow-800' },
  active:  { label: '승인', color: 'bg-green-100 text-green-800'  },
  obsolete:{ label: '폐기', color: 'bg-gray-100 text-gray-600'    },
}

function load()  { try { return JSON.parse(localStorage.getItem(LS_KEY)) || [] } catch { return [] } }
function save(d) { localStorage.setItem(LS_KEY, JSON.stringify(d)) }

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
            <th className="border px-3 py-2 text-left">일자</th>
            <th className="border px-3 py-2 text-left">버전</th>
            <th className="border px-3 py-2 text-left">작성자</th>
            <th className="border px-3 py-2 text-left">변경 요약</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 && (
            <tr><td colSpan={4} className="border px-3 py-4 text-center text-gray-400 text-xs">변경이력 없음</td></tr>
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
        <input placeholder="버전" className="border rounded px-2 py-1 text-xs w-20"
          value={form.version} onChange={e => setForm(f => ({...f, version: e.target.value}))} />
        <input placeholder="작성자" className="border rounded px-2 py-1 text-xs w-24"
          value={form.author} onChange={e => setForm(f => ({...f, author: e.target.value}))} />
        <input placeholder="변경 요약" className="border rounded px-2 py-1 text-xs flex-1"
          value={form.summary} onChange={e => setForm(f => ({...f, summary: e.target.value}))} />
        <button className="bg-blue-600 text-white text-xs px-3 py-1 rounded hover:bg-blue-700"
          onClick={() => { if(form.version && form.summary) { onAdd(form); setForm(f => ({...f, version:'', author:'', summary:''})) }}}>추가</button>
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

  React.useEffect(() => {
    const data = load()
    setRecords(data)
    if (data.length > 0) setSelectedId(data[0].id)
  }, [])

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
    if (!window.confirm('이 DMR을 삭제하시겠습니까?')) return
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
        ['의도된 용도',s.info.intendedUse],['분류 등급',s.info.classification],
        ['UDI',s.info.udi],['허가·신고 번호',s.info.regulatoryRef],
        ['제조자',s.info.manufacturer],['비고',s.info.notes]
      ]) : (
        <div>
          <FieldBlock label="적용 목적 / 의도된 용도 §4.2.3(a)" value={s.info.intendedUse} onChange={v=>updateField('info','intendedUse',v)} rows={3} placeholder="기기의 의도된 사용 목적을 기술"/>
          <FieldBlock label="분류 등급 (예: 2등급, Class II)" value={s.info.classification} type="input" onChange={v=>updateField('info','classification',v)}/>
          <FieldBlock label="UDI (고유기기식별자)" value={s.info.udi} type="input" onChange={v=>updateField('info','udi',v)} placeholder="UDI-DI / UDI-PI"/>
          <FieldBlock label="허가·신고 번호 (식약처)" value={s.info.regulatoryRef} type="input" onChange={v=>updateField('info','regulatoryRef',v)}/>
          <FieldBlock label="제조자 / 제조소" value={s.info.manufacturer} type="input" onChange={v=>updateField('info','manufacturer',v)}/>
          <FieldBlock label="비고" value={s.info.notes} onChange={v=>updateField('info','notes',v)} rows={2}/>
        </div>
      )
      case 'specs': return ro ? view([
        ['성능 사양',s.specs.performanceSpecs],['치수/외형',s.specs.dimensions],
        ['재질/원자재',s.specs.materials],['도면 참조',s.specs.drawingRef],['소프트웨어 버전',s.specs.softwareVersion]
      ]) : (
        <div>
          <FieldBlock label="성능 사양 §4.2.3(b)" value={s.specs.performanceSpecs} onChange={v=>updateField('specs','performanceSpecs',v)} rows={4} placeholder="측정 범위, 정확도, 전기 사양 등"/>
          <FieldBlock label="치수 / 외형" value={s.specs.dimensions} onChange={v=>updateField('specs','dimensions',v)} rows={2}/>
          <FieldBlock label="재질 / 원자재" value={s.specs.materials} onChange={v=>updateField('specs','materials',v)} rows={2}/>
          <FieldBlock label="도면 참조 번호" value={s.specs.drawingRef} type="input" onChange={v=>updateField('specs','drawingRef',v)} placeholder="도면 번호 또는 문서 ID"/>
          <FieldBlock label="소프트웨어 버전" value={s.specs.softwareVersion} type="input" onChange={v=>updateField('specs','softwareVersion',v)}/>
        </div>
      )
      case 'process': return ro ? view([
        ['제조공정 개요',s.process.processOverview],['핵심 공정 단계',s.process.criticalSteps],
        ['설비 목록',s.process.equipmentList],['환경 요구사항',s.process.environmentalReqs]
      ]) : (
        <div>
          <FieldBlock label="제조공정 개요 §4.2.3(c)" value={s.process.processOverview} onChange={v=>updateField('process','processOverview',v)} rows={4} placeholder="주요 공정 단계 기술"/>
          <FieldBlock label="핵심 공정 단계 (Critical Steps)" value={s.process.criticalSteps} onChange={v=>updateField('process','criticalSteps',v)} rows={3}/>
          <FieldBlock label="설비 목록" value={s.process.equipmentList} onChange={v=>updateField('process','equipmentList',v)} rows={2}/>
          <FieldBlock label="환경 요구사항 (온도·습도·청정도 등)" value={s.process.environmentalReqs} onChange={v=>updateField('process','environmentalReqs',v)} rows={2}/>
        </div>
      )
      case 'inspection': return ro ? view([
        ['합격 기준',s.inspection.acceptanceCriteria],['시험 방법',s.inspection.testMethods],
        ['샘플링 계획',s.inspection.samplingPlan],['출하 승인 요구사항',s.inspection.releaseRequirements]
      ]) : (
        <div>
          <FieldBlock label="합격 기준 §4.2.3(d)" value={s.inspection.acceptanceCriteria} onChange={v=>updateField('inspection','acceptanceCriteria',v)} rows={4} placeholder="각 항목별 합격/불합격 판정 기준"/>
          <FieldBlock label="시험 방법" value={s.inspection.testMethods} onChange={v=>updateField('inspection','testMethods',v)} rows={3}/>
          <FieldBlock label="샘플링 계획 (AQL 등)" value={s.inspection.samplingPlan} onChange={v=>updateField('inspection','samplingPlan',v)} rows={2}/>
          <FieldBlock label="출하 승인 요구사항" value={s.inspection.releaseRequirements} onChange={v=>updateField('inspection','releaseRequirements',v)} rows={2}/>
        </div>
      )
      case 'labeling': return ro ? view([
        ['라벨 기재사항',s.labeling.labelContent],['포장 사양',s.labeling.packagingSpec],
        ['멸균 배리어 사양',s.labeling.sterileBarrier],['보관 조건',s.labeling.storageConditions]
      ]) : (
        <div>
          <FieldBlock label="라벨 기재사항 §4.2.3(e)" value={s.labeling.labelContent} onChange={v=>updateField('labeling','labelContent',v)} rows={4} placeholder="제품명, 모델번호, 제조번호, 유효기간, 경고사항 등"/>
          <FieldBlock label="포장 사양" value={s.labeling.packagingSpec} onChange={v=>updateField('labeling','packagingSpec',v)} rows={3}/>
          <FieldBlock label="멸균 배리어 사양 (해당 시)" value={s.labeling.sterileBarrier} onChange={v=>updateField('labeling','sterileBarrier',v)} rows={2}/>
          <FieldBlock label="보관 조건 (온도·습도·차광 등)" value={s.labeling.storageConditions} onChange={v=>updateField('labeling','storageConditions',v)} rows={2}/>
        </div>
      )
      case 'maintenance': return ro ? view([
        ['설치 요구사항',s.maintenance.installationReqs],['유지보수 주기',s.maintenance.maintenanceSchedule],
        ['서비스 지침',s.maintenance.serviceInstructions],['예상 사용 수명',s.maintenance.expectedLifespan]
      ]) : (
        <div>
          <FieldBlock label="설치 요구사항 §4.2.3(f)" value={s.maintenance.installationReqs} onChange={v=>updateField('maintenance','installationReqs',v)} rows={3} placeholder="설치 환경, 전원, 공간 요구사항 등"/>
          <FieldBlock label="유지보수 주기 / 점검 항목" value={s.maintenance.maintenanceSchedule} onChange={v=>updateField('maintenance','maintenanceSchedule',v)} rows={3}/>
          <FieldBlock label="서비스 지침" value={s.maintenance.serviceInstructions} onChange={v=>updateField('maintenance','serviceInstructions',v)} rows={3}/>
          <FieldBlock label="예상 사용 수명" value={s.maintenance.expectedLifespan} type="input" onChange={v=>updateField('maintenance','expectedLifespan',v)}/>
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
      <HubBanner icon={<FileText size={22}/>} title="의료기기 파일 (DMR)"
        subtitle="ISO 13485 §4.2.3 · Device Master Record — 제품별 완성 기기 명세 관리" clause="§4.2.3"/>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[{label:'전체 DMR',value:stats.total,color:'text-blue-600'},
          {label:'승인 완료',value:stats.active,color:'text-green-600'},
          {label:'초안',value:stats.draft,color:'text-yellow-600'}
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
              <span className="text-sm font-semibold text-gray-700">DMR 목록</span>
              <button className="text-blue-600 hover:text-blue-800" onClick={()=>setShowForm(true)} title="새 DMR 등록"><Plus size={16}/></button>
            </div>
            <div className="px-3 py-2 border-b border-gray-100">
              <input className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none"
                placeholder="제품명·모델 검색" value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
              {filtered.length===0 && (
                <div className="px-4 py-6 text-center text-xs text-gray-400">DMR이 없습니다.<br/>+ 로 등록하세요.</div>
              )}
              {filtered.map(r=>(
                <div key={r.id}
                  className={`px-4 py-3 cursor-pointer hover:bg-blue-50 transition-colors ${selectedId===r.id?'bg-blue-50 border-l-2 border-blue-500':''}`}
                  onClick={()=>{setSelectedId(r.id);setEditing(false);setActiveTab('info')}}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{r.productName}</div>
                      <div className="text-xs text-gray-500 truncate">{r.modelNumber||'—'}</div>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded ml-2 flex-shrink-0 ${STATUS_META[r.status]?.color}`}>{STATUS_META[r.status]?.label}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">v{r.version} · {r.updatedAt}</div>
                </div>
              ))}
            </div>
          </div>
          {showForm && (
            <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-4 mt-3">
              <div className="text-sm font-semibold text-gray-700 mb-3 flex justify-between">
                새 DMR 등록 <button onClick={()=>setShowForm(false)}><X size={14}/></button>
              </div>
              <input className="w-full border rounded px-2 py-1 text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-blue-300"
                placeholder="제품명 *" value={newName} onChange={e=>setNewName(e.target.value)}/>
              <input className="w-full border rounded px-2 py-1 text-sm mb-3 focus:outline-none focus:ring-1 focus:ring-blue-300"
                placeholder="모델번호" value={newModel} onChange={e=>setNewModel(e.target.value)}/>
              <button className="w-full bg-blue-600 text-white text-sm py-1.5 rounded hover:bg-blue-700" onClick={addRecord}>등록</button>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {!selected ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
              <FileText size={40} className="mx-auto mb-3 opacity-30"/>
              <div className="text-sm">좌측에서 DMR을 선택하거나 새로 등록하세요.</div>
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
                    <span className="text-xs text-gray-400">버전 v{selected.version}</span>
                    <span className="text-xs text-gray-400">최종수정 {selected.updatedAt}</span>
                    {selected.dhfRef && <span className="text-xs text-blue-500 flex items-center gap-1"><Link2 size={10}/> DHF {selected.dhfRef}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <select className="border rounded text-xs px-2 py-1 text-gray-600" value={selected.status}
                    onChange={e=>updateField('root','status',e.target.value)}>
                    <option value="draft">초안</option>
                    <option value="active">승인</option>
                    <option value="obsolete">폐기</option>
                  </select>
                  {editing ? (
                    <button className="flex items-center gap-1 text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700" onClick={saveNow}>
                      <Save size={12}/> 저장{saved&&' ✓'}
                    </button>
                  ) : (
                    <button className="flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700" onClick={()=>setEditing(true)}>
                      <Edit2 size={12}/> 편집
                    </button>
                  )}
                  <button className="text-xs text-red-400 hover:text-red-600 px-2 py-1" onClick={()=>deleteRecord(selected.id)}><Trash2 size={14}/></button>
                </div>
              </div>
              {editing && (
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">버전</span>
                    <input className="border rounded px-2 py-0.5 text-xs w-16" value={selected.version}
                      onChange={e=>updateField('root','version',e.target.value)}/>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">DHF 연계 ID</span>
                    <input className="border rounded px-2 py-0.5 text-xs w-32" value={selected.dhfRef}
                      onChange={e=>updateField('root','dhfRef',e.target.value)} placeholder="DHF 문서번호"/>
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
                    내용을 수정하려면 <strong>편집</strong> 버튼을 누르세요.
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