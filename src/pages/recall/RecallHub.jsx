// src/pages/recall/RecallHub.jsx
// 리콜/회수 관리 허브 — KGMP 제9장 / 수입GMP 요건 (회수 판단기준, 절차, 당국 보고)
import React, { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Plus, Search, Edit3, Trash2, ChevronDown, ChevronUp,
  X, AlertTriangle, CheckCircle2, RotateCcw,
  BarChart2, List, Shield
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'

const STORAGE_KEY = 'qualytree.recall'
const RECALL_CLASS = ['Class I (긴급)', 'Class II (중요)', 'Class III (일반)']
const STATUS_OPTIONS = ['진행중', '완료', '취소']
const STATUS_COLORS = {
  '진행중': 'bg-yellow-100 text-yellow-800',
  '완료': 'bg-green-100 text-green-800',
  '취소': 'bg-gray-100 text-gray-600',
}
const CLASS_COLORS = {
  'Class I (긴급)': 'bg-red-100 text-red-700',
  'Class II (중요)': 'bg-orange-100 text-orange-700',
  'Class III (일반)': 'bg-blue-100 text-blue-700',
}

function newId() { return 'RC-' + Date.now() }

const EMPTY_FORM = {
  id: '', no: '', product: '', lot: '', reason: '', recallClass: 'Class II (중요)',
  startDate: '', targetDate: '', completeDate: '',
  reportedToAuthority: false, reportDate: '', reportNo: '',
  totalQty: '', recalledQty: '', assignee: '', status: '진행중',
  capaId: '', note: ''
}

function Field({ label, value, span }) {
  if (!value && value !== 0) return null
  return (
    <div className={span > 1 ? 'col-span-' + span : ''}>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800">{String(value)}</p>
    </div>
  )
}

export default function RecallHub() {
  const [records, setRecords] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
  })
  const [tab, setTab] = useState('list')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const user = auth.getUser ? auth.getUser() : {}

  function save(data) {
    setRecords(data)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  function openNew() {
    setForm({ ...EMPTY_FORM, id: newId() })
    setEditId(null)
    setShowForm(true)
    setTab('form')
  }

  function openEdit(rec) {
    setForm({ ...rec })
    setEditId(rec.id)
    setShowForm(true)
    setTab('form')
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (editId) {
      save(records.map(r => r.id === editId ? { ...form } : r))
    } else {
      save([{ ...form, id: newId(), createdAt: new Date().toISOString(), createdBy: user?.name || '' }, ...records])
    }
    setShowForm(false); setEditId(null); setForm({ ...EMPTY_FORM }); setTab('list')
  }

  function handleDelete(id) {
    if (!window.confirm('삭제하시겠습니까?')) return
    save(records.filter(r => r.id !== id))
  }

  const filtered = useMemo(() => {
    let list = records
    if (filterStatus !== 'all') list = list.filter(r => r.status === filterStatus)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        (r.product || '').toLowerCase().includes(q) ||
        (r.lot || '').toLowerCase().includes(q) ||
        (r.no || '').toLowerCase().includes(q) ||
        (r.reason || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [records, search, filterStatus])

  const stats = useMemo(() => ({
    total: records.length,
    inProgress: records.filter(r => r.status === '진행중').length,
    done: records.filter(r => r.status === '완료').length,
    classI: records.filter(r => r.recallClass === 'Class I (긴급)').length,
  }), [records])

  const TABS = [
    { key: 'list', label: '전체 목록', icon: List },
    { key: 'inprogress', label: '진행중', icon: AlertTriangle },
    { key: 'done', label: '완료', icon: CheckCircle2 },
    { key: 'stats', label: '현황분석', icon: BarChart2 },
  ]

  function RecordRow({ rec }) {
    const isOpen = expanded === rec.id
    return (
      <div className="border border-gray-200 rounded-xl mb-2 bg-white overflow-hidden">
        <div
          className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setExpanded(isOpen ? null : rec.id)}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="text-xs text-gray-400 shrink-0 font-mono">{rec.no || rec.id}</span>
            <span className="font-medium text-sm text-gray-800 truncate">{rec.product}</span>
            <span className={'text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ' + (STATUS_COLORS[rec.status] || 'bg-gray-100 text-gray-600')}>
              {rec.status}
            </span>
            <span className={'text-xs px-2 py-0.5 rounded-full hidden sm:inline shrink-0 ' + (CLASS_COLORS[rec.recallClass] || 'bg-gray-100 text-gray-600')}>
              {rec.recallClass}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <span className="text-xs text-gray-400 hidden md:inline">{rec.startDate}</span>
            <button onClick={e => { e.stopPropagation(); openEdit(rec) }} className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><Edit3 size={14} /></button>
            <button onClick={e => { e.stopPropagation(); handleDelete(rec.id) }} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
            {isOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </div>
        </div>
        {isOpen && (
          <div className="px-4 pb-4 border-t border-gray-100 pt-3 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <Field label="회수번호" value={rec.no} />
            <Field label="제품명" value={rec.product} />
            <Field label="로트번호" value={rec.lot} />
            <Field label="회수사유" value={rec.reason} span={2} />
            <Field label="회수등급" value={rec.recallClass} />
            <Field label="회수시작일" value={rec.startDate} />
            <Field label="완료목표일" value={rec.targetDate} />
            <Field label="완료일" value={rec.completeDate} />
            <Field label="당국보고" value={rec.reportedToAuthority ? '보고완료' : '미보고'} />
            <Field label="보고일" value={rec.reportDate} />
            <Field label="식약처 접수번호" value={rec.reportNo} />
            <Field label="대상수량" value={rec.totalQty} />
            <Field label="회수완료수량" value={rec.recalledQty} />
            <Field label="담당자" value={rec.assignee} />
            <Field label="CAPA ID" value={rec.capaId} />
            {rec.note && <Field label="비고" value={rec.note} span={3} />}
          </div>
        )}
      </div>
    )
  }

  const listToShow = tab === 'inprogress'
    ? records.filter(r => r.status === '진행중')
    : tab === 'done'
    ? records.filter(r => r.status === '완료')
    : filtered

  return (
    <AppLayout>
      <HubBanner
        icon={<RotateCcw size={22} />}
        title="리콜 / 회수 관리"
        subtitle="의료기기 회수 프로세스 추적 및 규제기관 보고 관리 (KGMP 제9장 / 수입GMP)"
        color="red"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: '전체 회수', value: stats.total, color: 'text-gray-700' },
          { label: '진행중', value: stats.inProgress, color: 'text-yellow-600' },
          { label: '완료', value: stats.done, color: 'text-green-600' },
          { label: 'Class I (긴급)', value: stats.classI, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">{s.label}</p>
            <p className={'text-2xl font-bold ' + s.color}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
        {TABS.map(t => (
          <button key={t.key}
            onClick={() => { setTab(t.key); setShowForm(false) }}
            className={'flex-1 flex items-center justify-center gap-1.5 text-sm py-2 rounded-lg font-medium transition-colors ' +
              (tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">{editId ? '회수 수정' : '회수 등록'}</h3>
            <button onClick={() => { setShowForm(false); setTab('list') }} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-500 block mb-1">회수번호 *</label>
              <input required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-300" value={form.no} onChange={e => setForm(f => ({ ...f, no: e.target.value }))} placeholder="RC-2024-001" /></div>
            <div><label className="text-xs text-gray-500 block mb-1">제품명 *</label>
              <input required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-300" value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} /></div>
            <div><label className="text-xs text-gray-500 block mb-1">로트번호</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-300" value={form.lot} onChange={e => setForm(f => ({ ...f, lot: e.target.value }))} /></div>
            <div><label className="text-xs text-gray-500 block mb-1">회수등급 *</label>
              <select required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-300" value={form.recallClass} onChange={e => setForm(f => ({ ...f, recallClass: e.target.value }))}>
                {RECALL_CLASS.map(c => <option key={c}>{c}</option>)}</select></div>
            <div className="md:col-span-2"><label className="text-xs text-gray-500 block mb-1">회수사유 *</label>
              <textarea required rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-300" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} /></div>
            <div><label className="text-xs text-gray-500 block mb-1">회수시작일</label>
              <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-300" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></div>
            <div><label className="text-xs text-gray-500 block mb-1">완료목표일</label>
              <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-300" value={form.targetDate} onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))} /></div>
            <div><label className="text-xs text-gray-500 block mb-1">완료일</label>
              <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-300" value={form.completeDate} onChange={e => setForm(f => ({ ...f, completeDate: e.target.value }))} /></div>
            <div><label className="text-xs text-gray-500 block mb-1">상태</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-300" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}</select></div>
            <div className="flex items-center gap-3 py-2">
              <input type="checkbox" id="reported" checked={form.reportedToAuthority} onChange={e => setForm(f => ({ ...f, reportedToAuthority: e.target.checked }))} className="w-4 h-4" />
              <label htmlFor="reported" className="text-sm text-gray-700">식약처 보고완료</label></div>
            <div><label className="text-xs text-gray-500 block mb-1">보고일</label>
              <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-300" value={form.reportDate} onChange={e => setForm(f => ({ ...f, reportDate: e.target.value }))} /></div>
            <div><label className="text-xs text-gray-500 block mb-1">식약처 접수번호</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-300" value={form.reportNo} onChange={e => setForm(f => ({ ...f, reportNo: e.target.value }))} /></div>
            <div><label className="text-xs text-gray-500 block mb-1">대상수량</label>
              <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-300" value={form.totalQty} onChange={e => setForm(f => ({ ...f, totalQty: e.target.value }))} /></div>
            <div><label className="text-xs text-gray-500 block mb-1">회수완료수량</label>
              <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-300" value={form.recalledQty} onChange={e => setForm(f => ({ ...f, recalledQty: e.target.value }))} /></div>
            <div><label className="text-xs text-gray-500 block mb-1">담당자</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-300" value={form.assignee} onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))} /></div>
            <div><label className="text-xs text-gray-500 block mb-1">연계 CAPA ID</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-300" value={form.capaId} onChange={e => setForm(f => ({ ...f, capaId: e.target.value }))} placeholder="CAPA-XXX" /></div>
            <div className="md:col-span-2"><label className="text-xs text-gray-500 block mb-1">비고</label>
              <textarea rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-300" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} /></div>
            <div className="md:col-span-2 flex gap-2 justify-end">
              <button type="button" onClick={() => { setShowForm(false); setTab('list') }} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">취소</button>
              <button type="submit" className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium">{editId ? '수정' : '등록'}</button>
            </div>
          </form>
        </div>
      )}

      {(tab === 'list' || tab === 'inprogress' || tab === 'done') && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-red-300"
                placeholder="제품명, 로트번호, 회수번호 검색..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {tab === 'list' && (
              <select className="text-sm border border-gray-200 rounded-lg px-2 py-2 outline-none" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="all">전체</option>
                {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            )}
            <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
              <Plus size={14} /> 등록
            </button>
          </div>
          {listToShow.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <RotateCcw size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">등록된 회수 건이 없습니다</p>
              <button onClick={openNew} className="mt-3 text-sm text-red-600 hover:underline">첫 번째 회수 건 등록 →</button>
            </div>
          ) : listToShow.map(rec => <RecordRow key={rec.id} rec={rec} />)}
        </div>
      )}

      {tab === 'stats' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-4">회수 현황 분석</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-3">등급별 현황</p>
              {RECALL_CLASS.map(cls => {
                const cnt = records.filter(r => r.recallClass === cls).length
                const pct = records.length ? Math.round(cnt / records.length * 100) : 0
                return (<div key={cls} className="mb-2">
                  <div className="flex justify-between text-xs text-gray-600 mb-1"><span>{cls}</span><span>{cnt}건 ({pct}%)</span></div>
                  <div className="h-2 bg-gray-100 rounded-full"><div className="h-2 bg-red-400 rounded-full" style={{ width: pct + '%' }} /></div>
                </div>)
              })}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-3">상태별 현황</p>
              {STATUS_OPTIONS.map(s => {
                const cnt = records.filter(r => r.status === s).length
                const pct = records.length ? Math.round(cnt / records.length * 100) : 0
                const c = { '진행중': 'bg-yellow-400', '완료': 'bg-green-400', '취소': 'bg-gray-300' }[s]
                return (<div key={s} className="mb-2">
                  <div className="flex justify-between text-xs text-gray-600 mb-1"><span>{s}</span><span>{cnt}건 ({pct}%)</span></div>
                  <div className="h-2 bg-gray-100 rounded-full"><div className={'h-2 ' + c + ' rounded-full'} style={{ width: pct + '%' }} /></div>
                </div>)
              })}
            </div>
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-gray-600 mb-2">식약처 보고 현황</p>
              <div className="flex gap-4">
                <div className="flex-1 bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{records.filter(r => r.reportedToAuthority).length}</p>
                  <p className="text-xs text-gray-500 mt-1">보고완료</p>
                </div>
                <div className="flex-1 bg-red-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{records.filter(r => !r.reportedToAuthority && r.status === '진행중').length}</p>
                  <p className="text-xs text-gray-500 mt-1">보고 미완료 (진행중)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
