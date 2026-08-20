// src/pages/stability/StabilityHub.jsx
// 안정성 시험 관리 허브 — 제조GMP 제8장: 유효기간 설정을 위한 안정성 시험 계획·실시·기록 (#134)
import React, { useState, useMemo } from 'react'
import {
  Plus, Search, Edit3, Trash2, ChevronDown, ChevronUp,
  X, CheckCircle2, AlertTriangle, Thermometer, BarChart2, List, Clock
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'

const STORAGE_KEY = 'qualytree.stability'

const STUDY_TYPES = ['실시간 안정성', '가속 안정성', '중간조건 안정성', '광안정성', '동결융해', '개봉 후 사용기간']
const STORAGE_CONDITIONS = ['25±2°C / 60±5%RH', '30±2°C / 65±5%RH', '40±2°C / 75±5%RH', '-20±5°C', '2~8°C', '기타']
const PHASES = ['계획', '진행중', '완료', '중단']
const TEST_RESULTS = ['합격', '불합격', '진행중', '미실시', '보류']
const STATUS_COLORS = {
  '계획': 'bg-blue-100 text-blue-700',
  '진행중': 'bg-yellow-100 text-yellow-800',
  '완료': 'bg-green-100 text-green-700',
  '중단': 'bg-gray-100 text-gray-600',
}

// Standard time points in months
const TIME_POINTS = [1, 3, 6, 9, 12, 18, 24, 36, 48, 60]

function newId() { return 'STB-' + Date.now() }

const EMPTY = {
  id: '', no: '', productName: '', lot: '', studyType: '실시간 안정성',
  storageCondition: '25±2°C / 60±5%RH', startDate: '', plannedDuration: '24',
  targetShelfLife: '', phase: '계획', protocol: '', assignee: '',
  timePointResults: {}, // { '3': { date:'', result:'', summary:'' }, ... }
  conclusion: '', shelfLifeDetermined: '', note: ''
}

function Field({ label, value, span }) {
  if (!value) return null
  return (
    <div className={span > 1 ? 'col-span-' + span : ''}>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800">{value}</p>
    </div>
  )
}

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-teal-300"

export default function StabilityHub() {
  const [records, setRecords] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
  })
  const [tab, setTab] = useState('list')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ ...EMPTY, timePointResults: {} })
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [formSection, setFormSection] = useState('basic')
  const user = auth.getUser ? auth.getUser() : {}

  function save(data) {
    setRecords(data); localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  function openNew() {
    setForm({ ...EMPTY, id: newId(), timePointResults: {} })
    setEditId(null); setShowForm(true); setTab('form'); setFormSection('basic')
  }

  function openEdit(rec) {
    setForm({ ...rec, timePointResults: rec.timePointResults || {} })
    setEditId(rec.id); setShowForm(true); setTab('form'); setFormSection('basic')
  }

  function handleDelete(id) {
    if (!window.confirm('삭제하시겠습니까?')) return
    save(records.filter(r => r.id !== id))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (editId) {
      save(records.map(r => r.id === editId ? { ...form } : r))
    } else {
      save([{ ...form, id: newId(), createdAt: new Date().toISOString(), createdBy: user?.name || '' }, ...records])
    }
    setShowForm(false); setEditId(null); setForm({ ...EMPTY, timePointResults: {} }); setTab('list')
  }

  function fld(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })) }

  function setTpResult(month, field, value) {
    setForm(f => ({
      ...f,
      timePointResults: {
        ...f.timePointResults,
        [month]: { ...(f.timePointResults[month] || {}), [field]: value }
      }
    }))
  }

  const filtered = useMemo(() => {
    if (!search) return records
    const q = search.toLowerCase()
    return records.filter(r =>
      (r.productName || '').toLowerCase().includes(q) ||
      (r.lot || '').toLowerCase().includes(q) ||
      (r.no || '').toLowerCase().includes(q)
    )
  }, [records, search])

  const stats = useMemo(() => ({
    total: records.length,
    ongoing: records.filter(r => r.phase === '진행중').length,
    done: records.filter(r => r.phase === '완료').length,
    plan: records.filter(r => r.phase === '계획').length,
  }), [records])

  const TABS = [
    { key: 'list', label: '전체 목록', icon: List },
    { key: 'timeline', label: '시험 일정', icon: Clock },
    { key: 'stats', label: '통계', icon: BarChart2 },
  ]

  function RecordRow({ rec }) {
    const isOpen = expanded === rec.id
    const tpr = rec.timePointResults || {}
    const passCount = Object.values(tpr).filter(v => v.result === '합격').length
    const totalPoints = Object.keys(tpr).length
    return (
      <div className="border border-gray-200 rounded-xl mb-2 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
          onClick={() => setExpanded(isOpen ? null : rec.id)}>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="text-xs text-gray-400 shrink-0 font-mono">{rec.no || rec.id}</span>
            <span className="font-medium text-sm text-gray-800 truncate">{rec.productName}</span>
            <span className="text-xs text-gray-500 hidden sm:inline">{rec.storageCondition}</span>
            <span className={'text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ' + (STATUS_COLORS[rec.phase] || 'bg-gray-100')}>{rec.phase}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            {totalPoints > 0 && <span className="text-xs text-gray-400">{passCount}/{totalPoints} 합격</span>}
            <button onClick={e => { e.stopPropagation(); openEdit(rec) }} className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><Edit3 size={14} /></button>
            <button onClick={e => { e.stopPropagation(); handleDelete(rec.id) }} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
            {isOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </div>
        </div>
        {isOpen && (
          <div className="px-4 pb-4 border-t border-gray-100 pt-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              <Field label="시험번호" value={rec.no} />
              <Field label="제품명" value={rec.productName} />
              <Field label="로트번호" value={rec.lot} />
              <Field label="시험 유형" value={rec.studyType} />
              <Field label="보관조건" value={rec.storageCondition} />
              <Field label="시작일" value={rec.startDate} />
              <Field label="계획 기간" value={rec.plannedDuration + '개월'} />
              <Field label="목표 유효기간" value={rec.targetShelfLife} />
              <Field label="프로토콜 번호" value={rec.protocol} />
              <Field label="담당자" value={rec.assignee} />
              {rec.shelfLifeDetermined && <Field label="확정 유효기간" value={rec.shelfLifeDetermined} />}
            </div>
            {Object.keys(tpr).length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">시간대별 시험 결과</p>
                <div className="flex flex-wrap gap-2">
                  {TIME_POINTS.filter(m => tpr[m]).map(m => {
                    const tp = tpr[m]
                    const colors = { '합격': 'bg-green-50 border-green-200 text-green-700', '불합격': 'bg-red-50 border-red-200 text-red-700', '진행중': 'bg-yellow-50 border-yellow-200 text-yellow-700' }
                    return (
                      <div key={m} className={'border rounded-lg px-3 py-2 text-xs ' + (colors[tp.result] || 'bg-gray-50 border-gray-200 text-gray-600')}>
                        <p className="font-bold">{m}개월</p>
                        <p>{tp.result || '-'}</p>
                        <p className="text-gray-500">{tp.date || ''}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {rec.conclusion && <div className="mt-3"><p className="text-xs text-gray-400 mb-0.5">결론</p><p className="text-sm text-gray-800">{rec.conclusion}</p></div>}
          </div>
        )}
      </div>
    )
  }

  return (
    <AppLayout>
      <HubBanner
        icon={<Thermometer size={22} />}
        title="안정성 시험 관리"
        subtitle="유효기간 설정을 위한 안정성 시험 계획·실시·기록 관리 (제조GMP 제8장 §QA-3)"
        color="teal"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: '전체 시험', value: stats.total, color: 'text-gray-700' },
          { label: '계획', value: stats.plan, color: 'text-blue-600' },
          { label: '진행중', value: stats.ongoing, color: 'text-yellow-600' },
          { label: '완료', value: stats.done, color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">{s.label}</p>
            <p className={'text-2xl font-bold ' + s.color}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setShowForm(false) }}
            className={'flex-1 flex items-center justify-center gap-1.5 text-sm py-2 rounded-lg font-medium transition-colors ' +
              (tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">{editId ? '시험 수정' : '시험 등록'}</h3>
            <button onClick={() => { setShowForm(false); setTab('list') }} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
          </div>
          <div className="flex gap-1 mb-4 border-b pb-3 border-gray-100">
            {['basic', 'results'].map(s => (
              <button key={s} onClick={() => setFormSection(s)}
                className={'px-3 py-1.5 text-xs rounded-lg font-medium ' + (formSection === s ? 'bg-teal-600 text-white' : 'text-gray-500 hover:bg-gray-100')}>
                {s === 'basic' ? '기본정보' : '시간대별 결과'}
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmit}>
            {formSection === 'basic' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-500 block mb-1">시험번호 *</label><input required className={inputCls} value={form.no} onChange={fld('no')} placeholder="STB-2024-001" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">제품명 *</label><input required className={inputCls} value={form.productName} onChange={fld('productName')} /></div>
                <div><label className="text-xs text-gray-500 block mb-1">로트번호</label><input className={inputCls} value={form.lot} onChange={fld('lot')} /></div>
                <div><label className="text-xs text-gray-500 block mb-1">시험 유형</label>
                  <select className={inputCls} value={form.studyType} onChange={fld('studyType')}>{STUDY_TYPES.map(s=><option key={s}>{s}</option>)}</select></div>
                <div><label className="text-xs text-gray-500 block mb-1">보관조건</label>
                  <select className={inputCls} value={form.storageCondition} onChange={fld('storageCondition')}>{STORAGE_CONDITIONS.map(c=><option key={c}>{c}</option>)}</select></div>
                <div><label className="text-xs text-gray-500 block mb-1">시작일</label><input type="date" className={inputCls} value={form.startDate} onChange={fld('startDate')} /></div>
                <div><label className="text-xs text-gray-500 block mb-1">계획 기간 (개월)</label><input type="number" className={inputCls} value={form.plannedDuration} onChange={fld('plannedDuration')} /></div>
                <div><label className="text-xs text-gray-500 block mb-1">목표 유효기간</label><input className={inputCls} value={form.targetShelfLife} onChange={fld('targetShelfLife')} placeholder="예: 24개월" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">단계</label>
                  <select className={inputCls} value={form.phase} onChange={fld('phase')}>{PHASES.map(p=><option key={p}>{p}</option>)}</select></div>
                <div><label className="text-xs text-gray-500 block mb-1">프로토콜 번호</label><input className={inputCls} value={form.protocol} onChange={fld('protocol')} /></div>
                <div><label className="text-xs text-gray-500 block mb-1">담당자</label><input className={inputCls} value={form.assignee} onChange={fld('assignee')} /></div>
                <div><label className="text-xs text-gray-500 block mb-1">확정 유효기간</label><input className={inputCls} value={form.shelfLifeDetermined} onChange={fld('shelfLifeDetermined')} placeholder="완료 후 기입" /></div>
                <div className="md:col-span-2"><label className="text-xs text-gray-500 block mb-1">결론</label><textarea rows={2} className={inputCls} value={form.conclusion} onChange={fld('conclusion')} /></div>
                <div className="md:col-span-2"><label className="text-xs text-gray-500 block mb-1">비고</label><textarea rows={2} className={inputCls} value={form.note} onChange={fld('note')} /></div>
              </div>
            )}
            {formSection === 'results' && (
              <div>
                <p className="text-xs text-gray-500 mb-3">시험 시간대별 결과를 입력하세요 (개월 단위)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {TIME_POINTS.filter(m => parseInt(m) <= parseInt(form.plannedDuration || 60)).map(m => {
                    const tp = form.timePointResults[m] || {}
                    return (
                      <div key={m} className="border border-gray-200 rounded-xl p-3">
                        <p className="text-sm font-semibold text-gray-700 mb-2">{m}개월 시점</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div><label className="text-xs text-gray-500 block mb-1">시험일</label>
                            <input type="date" className={inputCls} value={tp.date || ''} onChange={e => setTpResult(m, 'date', e.target.value)} /></div>
                          <div><label className="text-xs text-gray-500 block mb-1">결과</label>
                            <select className={inputCls} value={tp.result || ''} onChange={e => setTpResult(m, 'result', e.target.value)}>
                              <option value="">선택</option>{TEST_RESULTS.map(r=><option key={r}>{r}</option>)}</select></div>
                          <div className="col-span-2"><label className="text-xs text-gray-500 block mb-1">요약</label>
                            <input className={inputCls} value={tp.summary || ''} onChange={e => setTpResult(m, 'summary', e.target.value)} /></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-end mt-4">
              <button type="button" onClick={() => { setShowForm(false); setTab('list') }} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">취소</button>
              <button type="submit" className="px-4 py-2 text-sm rounded-lg bg-teal-600 text-white hover:bg-teal-700 font-medium">{editId ? '수정' : '등록'}</button>
            </div>
          </form>
        </div>
      )}

      {tab === 'list' && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-300"
                placeholder="제품명, 로트번호, 시험번호 검색..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700">
              <Plus size={14} /> 등록
            </button>
          </div>
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Thermometer size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">등록된 안정성 시험이 없습니다</p>
              <button onClick={openNew} className="mt-3 text-sm text-teal-600 hover:underline">첫 번째 시험 등록 →</button>
            </div>
          ) : filtered.map(r => <RecordRow key={r.id} rec={r} />)}
        </div>
      )}

      {tab === 'timeline' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-4">안정성 시험 일정 현황</h3>
          {records.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">등록된 시험이 없습니다</p>
          ) : records.map(rec => {
            const tpr = rec.timePointResults || {}
            const months = TIME_POINTS.filter(m => parseInt(m) <= parseInt(rec.plannedDuration || 60))
            return (
              <div key={rec.id} className="mb-6 pb-6 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-800">{rec.productName}</span>
                  <span className="text-xs text-gray-400">{rec.storageCondition}</span>
                  <span className={'text-xs px-2 py-0.5 rounded-full ' + (STATUS_COLORS[rec.phase] || 'bg-gray-100')}>{rec.phase}</span>
                </div>
                <div className="flex gap-1">
                  {months.map(m => {
                    const tp = tpr[m] || {}
                    const bg = { '합격': '#dcfce7', '불합격': '#fee2e2', '진행중': '#fef9c3', '보류': '#e5e7eb' }[tp.result] || '#f3f4f6'
                    return (
                      <div key={m} title={m + '개월: ' + (tp.result || '미실시')}
                        style={{ background: bg, flex:1, height:28, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <span style={{ fontSize:10, color:'#374151' }}>{m}M</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'stats' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-4">안정성 시험 통계</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-3">시험 유형별</p>
              {STUDY_TYPES.map(s => {
                const cnt = records.filter(r => r.studyType === s).length
                const pct = records.length ? Math.round(cnt/records.length*100) : 0
                return cnt > 0 ? (<div key={s} className="mb-2">
                  <div className="flex justify-between text-xs mb-1"><span>{s}</span><span>{cnt}건 ({pct}%)</span></div>
                  <div className="h-2 bg-gray-100 rounded-full"><div className="h-2 bg-teal-400 rounded-full" style={{width:pct+'%'}} /></div>
                </div>) : null
              })}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-3">단계별</p>
              {PHASES.map(p => {
                const cnt = records.filter(r => r.phase === p).length
                const pct = records.length ? Math.round(cnt/records.length*100) : 0
                return (<div key={p} className="mb-2">
                  <div className="flex justify-between text-xs mb-1"><span>{p}</span><span>{cnt}건 ({pct}%)</span></div>
                  <div className="h-2 bg-gray-100 rounded-full"><div className="h-2 bg-teal-500 rounded-full" style={{width:pct+'%'}} /></div>
                </div>)
              })}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
