// src/pages/csv/CSVHub.jsx
// 컴퓨터화 시스템 유효성확인 (Computer System Validation) 허브
// 제조GMP 제4장: IQ/OQ/PQ 문서화 및 소프트웨어 유효성확인 기록 관리 (#133)
import React, { useState, useMemo } from 'react'
import {
  Plus, Search, Edit3, Trash2, ChevronDown, ChevronUp,
  X, CheckCircle2, AlertTriangle, Monitor, BarChart2, List, Clock
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'

const STORAGE_KEY = 'qualytree.csv'

const SYSTEM_TYPES = ['ERP/MES', '품질관리 소프트웨어', '측정/분석 장비 SW', '임상 소프트웨어', '문서관리 시스템', '데이터수집 시스템', '기타']
const GMP_CATEGORIES = ['GxP 영향 있음', 'GxP 간접 영향', 'GxP 영향 없음']
const PHASES = ['계획', 'IQ (설치 적격성)', 'OQ (운전 적격성)', 'PQ (성능 적격성)', '완료', '재검증 필요']
const STATUS_COLORS = {
  '계획': 'bg-blue-100 text-blue-700',
  'IQ (설치 적격성)': 'bg-purple-100 text-purple-700',
  'OQ (운전 적격성)': 'bg-yellow-100 text-yellow-700',
  'PQ (성능 적격성)': 'bg-orange-100 text-orange-700',
  '완료': 'bg-green-100 text-green-700',
  '재검증 필요': 'bg-red-100 text-red-700',
}

function newId() { return 'CSV-' + Date.now() }

const EMPTY = {
  id: '', no: '', systemName: '', vendor: '', version: '', systemType: 'ERP/MES',
  gmpCategory: 'GxP 영향 있음', location: '', owner: '', phase: '계획',
  planDate: '', iqDate: '', oqDate: '', pqDate: '', completeDate: '', nextRevalDate: '',
  iqResult: '', oqResult: '', pqResult: '',
  iqDoc: '', oqDoc: '', pqDoc: '', vpDoc: '',
  deviations: '', riskLevel: '중간', summary: '', note: ''
}

const RISK = ['높음', '중간', '낮음']
const RISK_COLORS = { '높음': 'bg-red-100 text-red-700', '중간': 'bg-yellow-100 text-yellow-700', '낮음': 'bg-green-100 text-green-700' }
const RESULT = ['합격', '불합격', '조건부합격', '진행중', '미실시']

function Field({ label, value, span }) {
  if (!value) return null
  return (
    <div className={span > 1 ? 'col-span-' + span : ''}>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800">{value}</p>
    </div>
  )
}

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-violet-300"

export default function CSVHub() {
  const [records, setRecords] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
  })
  const [tab, setTab] = useState('list')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ ...EMPTY })
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [formTab, setFormTab] = useState('basic')
  const user = auth.getUser ? auth.getUser() : {}

  function save(data) {
    setRecords(data)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  function openNew() {
    setForm({ ...EMPTY, id: newId() }); setEditId(null); setShowForm(true); setTab('form'); setFormTab('basic')
  }

  function openEdit(rec) {
    setForm({ ...rec }); setEditId(rec.id); setShowForm(true); setTab('form'); setFormTab('basic')
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
    setShowForm(false); setEditId(null); setForm({ ...EMPTY }); setTab('list')
  }

  function fld(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })) }

  const filtered = useMemo(() => {
    if (!search) return records
    const q = search.toLowerCase()
    return records.filter(r =>
      (r.systemName || '').toLowerCase().includes(q) ||
      (r.vendor || '').toLowerCase().includes(q) ||
      (r.no || '').toLowerCase().includes(q)
    )
  }, [records, search])

  const stats = useMemo(() => ({
    total: records.length,
    done: records.filter(r => r.phase === '완료').length,
    inProgress: records.filter(r => !['완료','재검증 필요','계획'].includes(r.phase)).length,
    reval: records.filter(r => r.phase === '재검증 필요').length,
  }), [records])

  const TABS = [
    { key: 'list', label: '전체 목록', icon: List },
    { key: 'status', label: '진행 현황', icon: Clock },
    { key: 'stats', label: '통계', icon: BarChart2 },
  ]

  const FORM_TABS = ['basic', 'iq', 'oq', 'pq']
  const FORM_TAB_LABELS = { basic: '기본정보', iq: 'IQ', oq: 'OQ', pq: 'PQ/완료' }

  function RecordRow({ rec }) {
    const isOpen = expanded === rec.id
    return (
      <div className="border border-gray-200 rounded-xl mb-2 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
          onClick={() => setExpanded(isOpen ? null : rec.id)}>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="text-xs text-gray-400 shrink-0 font-mono">{rec.no || rec.id}</span>
            <span className="font-medium text-sm text-gray-800 truncate">{rec.systemName}</span>
            <span className="text-xs text-gray-500 hidden sm:inline truncate">{rec.version}</span>
            <span className={'text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ' + (STATUS_COLORS[rec.phase] || 'bg-gray-100')}>
              {rec.phase}
            </span>
            <span className={'text-xs px-2 py-0.5 rounded-full shrink-0 ' + (RISK_COLORS[rec.riskLevel] || 'bg-gray-100')}>
              {rec.riskLevel}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <button onClick={e => { e.stopPropagation(); openEdit(rec) }} className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><Edit3 size={14} /></button>
            <button onClick={e => { e.stopPropagation(); handleDelete(rec.id) }} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
            {isOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </div>
        </div>
        {isOpen && (
          <div className="px-4 pb-4 border-t border-gray-100 pt-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <Field label="시스템명" value={rec.systemName} />
              <Field label="공급업체" value={rec.vendor} />
              <Field label="버전" value={rec.version} />
              <Field label="유형" value={rec.systemType} />
              <Field label="GMP 분류" value={rec.gmpCategory} />
              <Field label="위험도" value={rec.riskLevel} />
              <Field label="소유부서" value={rec.owner} />
              <Field label="설치위치" value={rec.location} />
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-3">
              <Field label="IQ 실시일" value={rec.iqDate} />
              <Field label="IQ 결과" value={rec.iqResult} />
              <Field label="OQ 실시일" value={rec.oqDate} />
              <Field label="OQ 결과" value={rec.oqResult} />
              <Field label="PQ 실시일" value={rec.pqDate} />
              <Field label="PQ 결과" value={rec.pqResult} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="VP 문서번호" value={rec.vpDoc} />
              <Field label="완료일" value={rec.completeDate} />
              <Field label="재검증 예정일" value={rec.nextRevalDate} />
              {rec.deviations && <Field label="일탈 사항" value={rec.deviations} span={2} />}
              {rec.summary && <Field label="요약" value={rec.summary} span={3} />}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <AppLayout>
      <HubBanner
        icon={<Monitor size={22} />}
        title="컴퓨터화 시스템 유효성확인 (CSV)"
        subtitle="Computer System Validation: IQ/OQ/PQ 단계별 유효성확인 계획·실행·기록 관리 (제조GMP 제4장)"
        color="violet"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: '전체 시스템', value: stats.total, color: 'text-gray-700' },
          { label: '유효성확인 완료', value: stats.done, color: 'text-green-600' },
          { label: '진행중', value: stats.inProgress, color: 'text-yellow-600' },
          { label: '재검증 필요', value: stats.reval, color: 'text-red-600' },
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
            <h3 className="font-semibold text-gray-800">{editId ? '시스템 수정' : '시스템 등록'}</h3>
            <button onClick={() => { setShowForm(false); setTab('list') }} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
          </div>
          <div className="flex gap-1 mb-4 border-b border-gray-100 pb-3">
            {FORM_TABS.map(ft => (
              <button key={ft} onClick={() => setFormTab(ft)}
                className={'px-3 py-1.5 text-xs rounded-lg font-medium ' + (formTab === ft ? 'bg-violet-600 text-white' : 'text-gray-500 hover:bg-gray-100')}>
                {FORM_TAB_LABELS[ft]}
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmit}>
            {formTab === 'basic' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-500 block mb-1">관리번호 *</label><input required className={inputCls} value={form.no} onChange={fld('no')} placeholder="CSV-2024-001" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">시스템명 *</label><input required className={inputCls} value={form.systemName} onChange={fld('systemName')} /></div>
                <div><label className="text-xs text-gray-500 block mb-1">공급업체</label><input className={inputCls} value={form.vendor} onChange={fld('vendor')} /></div>
                <div><label className="text-xs text-gray-500 block mb-1">버전</label><input className={inputCls} value={form.version} onChange={fld('version')} /></div>
                <div><label className="text-xs text-gray-500 block mb-1">시스템 유형</label>
                  <select className={inputCls} value={form.systemType} onChange={fld('systemType')}>{SYSTEM_TYPES.map(s=><option key={s}>{s}</option>)}</select></div>
                <div><label className="text-xs text-gray-500 block mb-1">GxP 분류</label>
                  <select className={inputCls} value={form.gmpCategory} onChange={fld('gmpCategory')}>{GMP_CATEGORIES.map(g=><option key={g}>{g}</option>)}</select></div>
                <div><label className="text-xs text-gray-500 block mb-1">위험도</label>
                  <select className={inputCls} value={form.riskLevel} onChange={fld('riskLevel')}>{RISK.map(r=><option key={r}>{r}</option>)}</select></div>
                <div><label className="text-xs text-gray-500 block mb-1">현 단계</label>
                  <select className={inputCls} value={form.phase} onChange={fld('phase')}>{PHASES.map(p=><option key={p}>{p}</option>)}</select></div>
                <div><label className="text-xs text-gray-500 block mb-1">설치위치</label><input className={inputCls} value={form.location} onChange={fld('location')} /></div>
                <div><label className="text-xs text-gray-500 block mb-1">소유부서/담당자</label><input className={inputCls} value={form.owner} onChange={fld('owner')} /></div>
                <div><label className="text-xs text-gray-500 block mb-1">계획 시작일</label><input type="date" className={inputCls} value={form.planDate} onChange={fld('planDate')} /></div>
                <div><label className="text-xs text-gray-500 block mb-1">VP 문서번호</label><input className={inputCls} value={form.vpDoc} onChange={fld('vpDoc')} placeholder="VP-XXX" /></div>
              </div>
            )}
            {formTab === 'iq' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-500 block mb-1">IQ 실시일</label><input type="date" className={inputCls} value={form.iqDate} onChange={fld('iqDate')} /></div>
                <div><label className="text-xs text-gray-500 block mb-1">IQ 결과</label>
                  <select className={inputCls} value={form.iqResult} onChange={fld('iqResult')}><option value="">선택</option>{RESULT.map(r=><option key={r}>{r}</option>)}</select></div>
                <div className="md:col-span-2"><label className="text-xs text-gray-500 block mb-1">IQ 문서번호</label><input className={inputCls} value={form.iqDoc} onChange={fld('iqDoc')} placeholder="IQ-XXX" /></div>
              </div>
            )}
            {formTab === 'oq' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-500 block mb-1">OQ 실시일</label><input type="date" className={inputCls} value={form.oqDate} onChange={fld('oqDate')} /></div>
                <div><label className="text-xs text-gray-500 block mb-1">OQ 결과</label>
                  <select className={inputCls} value={form.oqResult} onChange={fld('oqResult')}><option value="">선택</option>{RESULT.map(r=><option key={r}>{r}</option>)}</select></div>
                <div className="md:col-span-2"><label className="text-xs text-gray-500 block mb-1">OQ 문서번호</label><input className={inputCls} value={form.oqDoc} onChange={fld('oqDoc')} placeholder="OQ-XXX" /></div>
              </div>
            )}
            {formTab === 'pq' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-500 block mb-1">PQ 실시일</label><input type="date" className={inputCls} value={form.pqDate} onChange={fld('pqDate')} /></div>
                <div><label className="text-xs text-gray-500 block mb-1">PQ 결과</label>
                  <select className={inputCls} value={form.pqResult} onChange={fld('pqResult')}><option value="">선택</option>{RESULT.map(r=><option key={r}>{r}</option>)}</select></div>
                <div className="md:col-span-2"><label className="text-xs text-gray-500 block mb-1">PQ 문서번호</label><input className={inputCls} value={form.pqDoc} onChange={fld('pqDoc')} placeholder="PQ-XXX" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">완료일</label><input type="date" className={inputCls} value={form.completeDate} onChange={fld('completeDate')} /></div>
                <div><label className="text-xs text-gray-500 block mb-1">재검증 예정일</label><input type="date" className={inputCls} value={form.nextRevalDate} onChange={fld('nextRevalDate')} /></div>
                <div className="md:col-span-2"><label className="text-xs text-gray-500 block mb-1">일탈 사항</label><textarea rows={2} className={inputCls} value={form.deviations} onChange={fld('deviations')} /></div>
                <div className="md:col-span-2"><label className="text-xs text-gray-500 block mb-1">요약/결론</label><textarea rows={2} className={inputCls} value={form.summary} onChange={fld('summary')} /></div>
                <div className="md:col-span-2"><label className="text-xs text-gray-500 block mb-1">비고</label><textarea rows={2} className={inputCls} value={form.note} onChange={fld('note')} /></div>
              </div>
            )}
            <div className="flex gap-2 justify-end mt-4">
              <button type="button" onClick={() => { setShowForm(false); setTab('list') }} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">취소</button>
              <button type="submit" className="px-4 py-2 text-sm rounded-lg bg-violet-600 text-white hover:bg-violet-700 font-medium">{editId ? '수정' : '등록'}</button>
            </div>
          </form>
        </div>
      )}

      {tab === 'list' && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-violet-300"
                placeholder="시스템명, 공급업체, 번호 검색..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700">
              <Plus size={14} /> 등록
            </button>
          </div>
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Monitor size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">등록된 시스템이 없습니다</p>
              <button onClick={openNew} className="mt-3 text-sm text-violet-600 hover:underline">첫 번째 시스템 등록 →</button>
            </div>
          ) : filtered.map(r => <RecordRow key={r.id} rec={r} />)}
        </div>
      )}

      {tab === 'status' && (
        <div>
          {PHASES.map(phase => {
            const list = records.filter(r => r.phase === phase)
            if (list.length === 0) return null
            return (
              <div key={phase} className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' + (STATUS_COLORS[phase] || 'bg-gray-100')}>{phase}</span>
                  <span className="text-xs text-gray-400">{list.length}건</span>
                </div>
                {list.map(r => (
                  <div key={r.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 font-mono">{r.no}</span>
                      <span className="text-sm font-medium text-gray-800">{r.systemName}</span>
                      <span className="text-xs text-gray-500">{r.version}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={'text-xs px-2 py-0.5 rounded-full ' + (RISK_COLORS[r.riskLevel] || 'bg-gray-100')}>{r.riskLevel}</span>
                      <button onClick={() => openEdit(r)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><Edit3 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
          {records.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Monitor size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">등록된 시스템이 없습니다</p>
            </div>
          )}
        </div>
      )}

      {tab === 'stats' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-4">CSV 현황 통계</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-3">단계별 현황</p>
              {PHASES.map(p => {
                const cnt = records.filter(r => r.phase === p).length
                const pct = records.length ? Math.round(cnt/records.length*100) : 0
                return (<div key={p} className="mb-2">
                  <div className="flex justify-between text-xs mb-1"><span>{p}</span><span>{cnt}건 ({pct}%)</span></div>
                  <div className="h-2 bg-gray-100 rounded-full"><div className="h-2 bg-violet-500 rounded-full" style={{width:pct+'%'}} /></div>
                </div>)
              })}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-3">GxP 분류별</p>
              {GMP_CATEGORIES.map(g => {
                const cnt = records.filter(r => r.gmpCategory === g).length
                const pct = records.length ? Math.round(cnt/records.length*100) : 0
                return (<div key={g} className="mb-2">
                  <div className="flex justify-between text-xs mb-1"><span>{g}</span><span>{cnt}건 ({pct}%)</span></div>
                  <div className="h-2 bg-gray-100 rounded-full"><div className="h-2 bg-blue-400 rounded-full" style={{width:pct+'%'}} /></div>
                </div>)
              })}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
