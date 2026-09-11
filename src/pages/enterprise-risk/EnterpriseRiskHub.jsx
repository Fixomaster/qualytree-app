// src/pages/enterprise-risk/EnterpriseRiskHub.jsx
// ISO 14971:2019 — 전사 위험관리 허브 (Enterprise Risk Management)
import React, { useState, useMemo } from 'react'
import {
  AlertTriangle, Plus, Trash2, Edit3, X, Save,
  ShieldAlert, ShieldCheck, TrendingUp, TrendingDown,
  BarChart2, ClipboardList, CheckCircle2, Clock,
  ChevronDown, ChevronRight, Filter, RefreshCw,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'

const LS_KEY = 'qualytree.enterprise_risks'

const CATEGORIES = [
  { key: 'design',      label: '설계·개발',    color: '#6366f1' },
  { key: 'production',  label: '생산·제조',    color: '#f59e0b' },
  { key: 'quality',     label: '품질시스템',   color: '#10b981' },
  { key: 'supply',      label: '공급망',       color: '#3b82f6' },
  { key: 'regulatory',  label: '규제·인허가',  color: '#ef4444' },
  { key: 'infra',       label: '인프라·설비',  color: '#8b5cf6' },
]

const SEVERITY_LABELS = ['','경미','보통','중간','심각','치명']
const PROB_LABELS     = ['','매우낮음','낮음','보통','높음','매우높음']

function calcRisk(s,p) {
  const rpn = s * p
  if (s >= 4 || rpn >= 12) return 'high'
  if (s >= 3 || rpn >= 6)  return 'medium'
  return 'low'
}

const RISK_META = {
  high:   { label: '고위험', color: 'bg-red-100 text-red-700',    dot: 'bg-red-500'    },
  medium: { label: '중위험', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400' },
  low:    { label: '저위험', color: 'bg-green-100 text-green-700', dot: 'bg-green-500'  },
}

const STATUS_META = {
  open:        { label: '미조치', color: 'bg-gray-100 text-gray-600'    },
  'in-progress':{ label: '조치중', color: 'bg-blue-100 text-blue-700'   },
  closed:      { label: '완료',   color: 'bg-green-100 text-green-700'  },
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
function lsWrite(d){ localStorage.setItem(LS_KEY, JSON.stringify(d)) }

// ── 위험 매트릭스 셀 색상 ─────────────────────────────────────
function matrixColor(s, p) {
  const r = calcRisk(s, p)
  return r === 'high' ? '#fee2e2' : r === 'medium' ? '#fef9c3' : '#dcfce7'
}

// ── 숫자 입력 ─────────────────────────────────────────────────
function ScaleInput({ label, value, onChange, labels }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span className="text-xs font-semibold text-gray-500">{label}</span>
        <span className="text-xs font-bold text-blue-600">{value} — {labels[value]||''}</span>
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
  const [risks, setRisks] = React.useState([])
  const [tab, setTab] = React.useState('dashboard')
  const [filterCat, setFilterCat] = React.useState('all')
  const [filterStatus, setFilterStatus] = React.useState('all')
  const [showForm, setShowForm] = React.useState(false)
  const [editId, setEditId] = React.useState(null)
  const [form, setForm] = React.useState(EMPTY_RISK())
  const [saved, setSaved] = React.useState(false)

  React.useEffect(() => { setRisks(lsRead()) }, [])

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
    if (!window.confirm('위험 항목을 삭제하시겠습니까?')) return
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

  // 카테고리별 위험 집계
  const byCat = React.useMemo(() =>
    CATEGORIES.map(c => ({
      ...c,
      count: risks.filter(r=>r.category===c.key).length,
      high:  risks.filter(r=>r.category===c.key && calcRisk(r.severity,r.probability)==='high').length,
    })), [risks])

  // 위험 매트릭스 데이터 (5x5 그리드)
  function matrixCount(s, p) {
    return risks.filter(r=>r.severity===s && r.probability===p).length
  }

  // ── 대시보드 탭 ───────────────────────────────────────────
  function renderDashboard() {
    return (
      <div>
        {/* KPI 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            {label:'전체',value:stats.total,color:'text-gray-700'},
            {label:'고위험',value:stats.high,color:'text-red-600'},
            {label:'중위험',value:stats.medium,color:'text-yellow-600'},
            {label:'저위험',value:stats.low,color:'text-green-600'},
            {label:'미조치',value:stats.open,color:'text-blue-600'},
          ].map(c=>(
            <div key={c.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
              <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
              <div className="text-xs text-gray-400 mt-1">{c.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 위험 매트릭스 */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="text-sm font-semibold text-gray-700 mb-3">위험 매트릭스 (심각도 × 발생가능성)</div>
            <div className="relative">
              <div className="text-xs text-gray-400 text-center mb-1">발생가능성 →</div>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="w-8 text-gray-400 text-right pr-2">심각도</th>
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

          {/* 영역별 위험 현황 */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="text-sm font-semibold text-gray-700 mb-3">영역별 위험 현황</div>
            {byCat.map(c=>(
              <div key={c.key} className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:c.color}}/>
                <div className="text-xs text-gray-600 w-24 flex-shrink-0">{c.label}</div>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className="h-2 rounded-full" style={{width:stats.total?((c.count/stats.total)*100)+'%':'0%',backgroundColor:c.color}}/>
                </div>
                <div className="text-xs text-gray-500 w-8 text-right">{c.count}</div>
                {c.high>0 && <span className="text-xs bg-red-100 text-red-600 px-1.5 rounded">고{c.high}</span>}
              </div>
            ))}
            {risks.length===0 && <div className="text-center text-xs text-gray-400 py-8">위험 항목을 등록하세요.</div>}
          </div>
        </div>

        {/* 고위험 목록 */}
        {stats.high > 0 && (
          <div className="bg-white rounded-xl border border-red-100 shadow-sm p-4 mt-5">
            <div className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
              <AlertTriangle size={14}/> 즉시 조치 필요 — 고위험 항목
            </div>
            {risks.filter(r=>calcRisk(r.severity,r.probability)==='high').map(r=>(
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <div className="text-sm font-medium text-gray-800">{r.title}</div>
                  <div className="text-xs text-gray-400">{CATEGORIES.find(c=>c.key===r.category)?.label} · 심각도 {r.severity} · 발생가능성 {r.probability}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_META[r.status]?.color}`}>{STATUS_META[r.status]?.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
  // ── 위험 등록 탭 ──────────────────────────────────────────
  function renderRegister() {
    return (
      <div>
        {/* 필터 + 추가 버튼 */}
        <div className="flex flex-wrap gap-2 mb-4 items-center">
          <select className="border rounded px-2 py-1 text-xs" value={filterCat} onChange={e=>setFilterCat(e.target.value)}>
            <option value="all">전체 영역</option>
            {CATEGORIES.map(c=><option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <select className="border rounded px-2 py-1 text-xs" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
            <option value="all">전체 상태</option>
            <option value="open">미조치</option>
            <option value="in-progress">조치중</option>
            <option value="closed">완료</option>
          </select>
          <div className="flex-1"/>
          <button className="flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"
            onClick={openNew}><Plus size={13}/> 위험 등록</button>
        </div>

        {/* 위험 목록 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {filtered.length===0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              <ShieldAlert size={32} className="mx-auto mb-2 opacity-30"/>
              등록된 위험 항목이 없습니다.
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">위험 제목</th>
                  <th className="px-3 py-2 text-left">영역</th>
                  <th className="px-3 py-2 text-center">심각도</th>
                  <th className="px-3 py-2 text-center">가능성</th>
                  <th className="px-3 py-2 text-center">위험등급</th>
                  <th className="px-3 py-2 text-center">상태</th>
                  <th className="px-3 py-2 text-center">담당자</th>
                  <th className="px-3 py-2 text-center">조치</th>
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
                          <option value="open">미조치</option>
                          <option value="in-progress">조치중</option>
                          <option value="closed">완료</option>
                        </select>
                      </td>
                      <td className="px-3 py-3 text-center text-xs text-gray-600">{r.owner||'—'}</td>
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

        {/* 등록/편집 폼 */}
        {showForm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <span className="font-bold text-gray-800">{editId?'위험 항목 수정':'위험 항목 등록'}</span>
                <button onClick={()=>setShowForm(false)}><X size={18}/></button>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">위험 제목 *</label>
                  <input className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
                    value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="위험 시나리오 제목"/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">위험 영역</label>
                    <select className="w-full border rounded px-3 py-2 text-sm" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                      {CATEGORIES.map(c=><option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">프로세스 / 해당 부위</label>
                    <input className="w-full border rounded px-3 py-2 text-sm" value={form.process} onChange={e=>setForm(f=>({...f,process:e.target.value}))} placeholder="예: 조립공정, 출하검사"/>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">위험 설명 / 잠재적 결과</label>
                  <textarea className="w-full border rounded px-3 py-2 text-sm resize-none" rows={3}
                    value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="위험의 원인, 메커니즘, 잠재 결과를 기술"/>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">위험원 (Hazard)</label>
                  <input className="w-full border rounded px-3 py-2 text-sm" value={form.hazard} onChange={e=>setForm(f=>({...f,hazard:e.target.value}))} placeholder="예: 전기, 기계적, 생물학적, 소프트웨어"/>
                </div>
                <ScaleInput label="심각도 (Severity)" value={form.severity} onChange={v=>setForm(f=>({...f,severity:v}))} labels={SEVERITY_LABELS}/>
                <ScaleInput label="발생가능성 (Probability)" value={form.probability} onChange={v=>setForm(f=>({...f,probability:v}))} labels={PROB_LABELS}/>
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  위험 등급: <strong className={`${calcRisk(form.severity,form.probability)==='high'?'text-red-600':calcRisk(form.severity,form.probability)==='medium'?'text-yellow-600':'text-green-600'}`}>
                    {RISK_META[calcRisk(form.severity,form.probability)]?.label}
                  </strong>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">위험 처리 방법</label>
                  <select className="w-full border rounded px-3 py-2 text-sm" value={form.treatment} onChange={e=>setForm(f=>({...f,treatment:e.target.value}))}>
                    <option value="mitigate">완화 (Mitigate)</option>
                    <option value="accept">수용 (Accept)</option>
                    <option value="avoid">회피 (Avoid)</option>
                    <option value="transfer">이전 (Transfer)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">관리 방안 / 조치 내용</label>
                  <textarea className="w-full border rounded px-3 py-2 text-sm resize-none" rows={3}
                    value={form.controls} onChange={e=>setForm(f=>({...f,controls:e.target.value}))} placeholder="설계 변경, 절차 추가, 교육, 검사 강화 등"/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">담당자</label>
                    <input className="w-full border rounded px-3 py-2 text-sm" value={form.owner} onChange={e=>setForm(f=>({...f,owner:e.target.value}))}/>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">목표 완료일</label>
                    <input type="date" className="w-full border rounded px-3 py-2 text-sm" value={form.dueDate} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))}/>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 px-6 py-4 border-t">
                <button className="text-sm px-4 py-2 border rounded hover:bg-gray-50" onClick={()=>setShowForm(false)}>취소</button>
                <button className="text-sm px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                  onClick={saveForm}><Save size={13}/> {editId?'수정':'등록'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }
  // ── 조치 현황 탭 ─────────────────────────────────────────
  function renderActions() {
    const overdue = risks.filter(r => r.status!=='closed' && r.dueDate && r.dueDate < new Date().toISOString().slice(0,10))
    const inProgress = risks.filter(r => r.status==='in-progress')
    return (
      <div className="space-y-4">
        {overdue.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2"><Clock size={14}/> 기한 초과 항목 ({overdue.length}건)</div>
            {overdue.map(r=>(
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-red-100 last:border-0">
                <div>
                  <div className="text-sm text-gray-800">{r.title}</div>
                  <div className="text-xs text-red-500">기한: {r.dueDate} · 담당: {r.owner||'미지정'}</div>
                </div>
                <button className="text-xs bg-blue-600 text-white px-2 py-1 rounded" onClick={()=>updateStatus(r.id,'in-progress')}>조치중으로</button>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="text-sm font-semibold text-gray-700 mb-3">전체 조치 현황</div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              {label:'미조치', val:stats.open, color:'text-gray-600', bg:'bg-gray-50'},
              {label:'조치중', val:risks.filter(r=>r.status==='in-progress').length, color:'text-blue-600', bg:'bg-blue-50'},
              {label:'완료',   val:stats.closed, color:'text-green-600', bg:'bg-green-50'},
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
                    <div className="text-xs text-gray-400">{r.owner||'담당자 미지정'} {r.dueDate?'· '+r.dueDate:''}</div>
                  </div>
                  <select className="text-xs border rounded px-1 py-0.5" value={r.status}
                    onChange={e=>updateStatus(r.id,e.target.value)}>
                    <option value="open">미조치</option>
                    <option value="in-progress">조치중</option>
                    <option value="closed">완료</option>
                  </select>
                </div>
              )
            })}
            {risks.filter(r=>r.status!=='closed').length===0 && (
              <div className="text-center py-8 text-green-600 text-sm"><CheckCircle2 size={24} className="mx-auto mb-2"/>모든 위험 항목이 조치 완료되었습니다.</div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const TABS = [
    { key:'dashboard', label:'위험 현황',  icon:BarChart2     },
    { key:'register',  label:'위험 등록부', icon:ClipboardList },
    { key:'actions',   label:'조치 추적',   icon:CheckCircle2  },
  ]

  return (
    <AppLayout>
      <HubBanner
        title="전사 위험관리"
        subtitle="ISO 14971:2019 — 설계·제조·품질시스템·공급망·규제 전 영역 위험 식별 및 처리"
        icon={ShieldAlert}
        color="#dc2626"
        quickActions={[{ label:'위험 항목 추가', icon:Plus, onClick:openNew, primary:true }]}
      />

      {/* 탭 */}
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