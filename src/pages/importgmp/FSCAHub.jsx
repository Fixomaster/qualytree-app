// src/pages/importgmp/FSCAHub.jsx
// Field Safety Corrective Action (FSCA) 현장 안전성 시정조치 허브
// 수입GMP 요건: 이상사례 기반 FSCA 계획·실행·완료 추적 (#131)
import React, { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Plus, Search, Edit3, Trash2, ChevronDown, ChevronUp,
  X, AlertTriangle, CheckCircle2, Shield, BarChart2, List, FileWarning
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'

const STORAGE_KEY = 'qualytree.fsca'

const ACTION_TYPES = [
  '의료기기 회수', '경고 레터 발송', '라벨/사용설명서 개정',
  '소프트웨어 업데이트', '사용 중지 권고', '검사/점검 지침 배포', '기타'
]
const RISK_LEVELS = ['매우 높음', '높음', '중간', '낮음']
const SCOPE_OPTIONS = ['국내 전체', '특정 병원/기관', '해외', '전세계']
const STATUS_OPTIONS = ['계획', '진행중', '완료', '취소']
const STATUS_COLORS = {
  '계획': 'bg-blue-100 text-blue-700',
  '진행중': 'bg-yellow-100 text-yellow-800',
  '완료': 'bg-green-100 text-green-800',
  '취소': 'bg-gray-100 text-gray-600',
}
const RISK_COLORS = {
  '매우 높음': 'bg-red-100 text-red-700',
  '높음': 'bg-orange-100 text-orange-700',
  '중간': 'bg-yellow-100 text-yellow-700',
  '낮음': 'bg-blue-100 text-blue-700',
}

function newId() { return 'FSCA-' + Date.now() }

const EMPTY = {
  id: '', no: '', adverseId: '', product: '', lot: '',
  actionType: '의료기기 회수', riskLevel: '높음', scope: '국내 전체',
  startDate: '', targetDate: '', completeDate: '',
  reportedToAuthority: false, reportDate: '', reportNo: '',
  notificationCount: '', actionDetail: '',
  assignee: '', status: '계획', recallId: '', note: ''
}

function Field({ label, value, span }) {
  if (!value && value !== 0) return null
  return (
    <div className={span > 1 ? 'col-span-' + span : ''}>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 whitespace-pre-wrap">{String(value)}</p>
    </div>
  )
}

function Input({ label, req, children }) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}{req ? ' *' : ''}</label>
      {children}
    </div>
  )
}

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-orange-300"

export default function FSCAHub() {
  const [records, setRecords] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
  })
  const [tab, setTab] = useState('list')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ ...EMPTY })
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
    setForm({ ...EMPTY, id: newId() })
    setEditId(null); setShowForm(true); setTab('form')
  }

  function openEdit(rec) {
    setForm({ ...rec }); setEditId(rec.id); setShowForm(true); setTab('form')
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

  function handleDelete(id) {
    if (!window.confirm('삭제하시겠습니까?')) return
    save(records.filter(r => r.id !== id))
  }

  function fld(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })) }
  function chk(k) { return e => setForm(f => ({ ...f, [k]: e.target.checked })) }

  const filtered = useMemo(() => {
    let list = records
    if (filterStatus !== 'all') list = list.filter(r => r.status === filterStatus)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        (r.no || '').toLowerCase().includes(q) ||
        (r.product || '').toLowerCase().includes(q) ||
        (r.actionType || '').toLowerCase().includes(q) ||
        (r.adverseId || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [records, search, filterStatus])

  const stats = useMemo(() => ({
    total: records.length,
    active: records.filter(r => r.status === '진행중').length,
    done: records.filter(r => r.status === '완료').length,
    highRisk: records.filter(r => r.riskLevel === '매우 높음' || r.riskLevel === '높음').length,
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
        <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
          onClick={() => setExpanded(isOpen ? null : rec.id)}>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="text-xs text-gray-400 shrink-0 font-mono">{rec.no || rec.id}</span>
            <span className="font-medium text-sm text-gray-800 truncate">{rec.product}</span>
            <span className={'text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ' + (STATUS_COLORS[rec.status] || 'bg-gray-100')}>
              {rec.status}
            </span>
            <span className={'text-xs px-2 py-0.5 rounded-full hidden sm:inline shrink-0 ' + (RISK_COLORS[rec.riskLevel] || 'bg-gray-100')}>
              {rec.riskLevel}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <span className="text-xs text-gray-400 hidden md:inline">{rec.actionType}</span>
            <button onClick={e => { e.stopPropagation(); openEdit(rec) }} className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><Edit3 size={14} /></button>
            <button onClick={e => { e.stopPropagation(); handleDelete(rec.id) }} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
            {isOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </div>
        </div>
        {isOpen && (
          <div className="px-4 pb-4 border-t border-gray-100 pt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="FSCA 번호" value={rec.no} />
            <Field label="연계 이상사례 ID" value={rec.adverseId} />
            <Field label="연계 회수 ID" value={rec.recallId} />
            <Field label="제품명" value={rec.product} />
            <Field label="로트번호" value={rec.lot} />
            <Field label="조치 유형" value={rec.actionType} />
            <Field label="위험 수준" value={rec.riskLevel} />
            <Field label="조치 범위" value={rec.scope} />
            <Field label="상태" value={rec.status} />
            <Field label="시작일" value={rec.startDate} />
            <Field label="완료목표일" value={rec.targetDate} />
            <Field label="완료일" value={rec.completeDate} />
            <Field label="당국 보고" value={rec.reportedToAuthority ? '보고완료' : '미보고'} />
            <Field label="보고일" value={rec.reportDate} />
            <Field label="접수번호" value={rec.reportNo} />
            <Field label="통보 기관 수" value={rec.notificationCount} />
            <Field label="담당자" value={rec.assignee} />
            {rec.actionDetail && <Field label="조치 상세" value={rec.actionDetail} span={3} />}
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
        icon={<Shield size={22} />}
        title="FSCA — 현장 안전성 시정조치"
        subtitle="Field Safety Corrective Action: 이상사례 기반 안전 조치 계획·실행·완료 관리 (수입GMP)"
        color="orange"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: '전체 FSCA', value: stats.total, color: 'text-gray-700' },
          { label: '진행중', value: stats.active, color: 'text-yellow-600' },
          { label: '완료', value: stats.done, color: 'text-green-600' },
          { label: '고위험 (높음+)', value: stats.highRisk, color: 'text-red-600' },
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
            <h3 className="font-semibold text-gray-800">{editId ? 'FSCA 수정' : 'FSCA 등록'}</h3>
            <button onClick={() => { setShowForm(false); setTab('list') }} className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input label="FSCA 번호" req><input required className={inputCls} value={form.no} onChange={fld('no')} placeholder="FSCA-2024-001" /></Input>
            <Input label="연계 이상사례 ID"><input className={inputCls} value={form.adverseId} onChange={fld('adverseId')} placeholder="ADV-XXX" /></Input>
            <Input label="제품명" req><input required className={inputCls} value={form.product} onChange={fld('product')} /></Input>
            <Input label="로트번호"><input className={inputCls} value={form.lot} onChange={fld('lot')} /></Input>
            <Input label="조치 유형" req>
              <select required className={inputCls} value={form.actionType} onChange={fld('actionType')}>
                {ACTION_TYPES.map(a => <option key={a}>{a}</option>)}
              </select>
            </Input>
            <Input label="위험 수준">
              <select className={inputCls} value={form.riskLevel} onChange={fld('riskLevel')}>
                {RISK_LEVELS.map(r => <option key={r}>{r}</option>)}
              </select>
            </Input>
            <Input label="조치 범위">
              <select className={inputCls} value={form.scope} onChange={fld('scope')}>
                {SCOPE_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </Input>
            <Input label="상태">
              <select className={inputCls} value={form.status} onChange={fld('status')}>
                {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </Input>
            <Input label="시작일"><input type="date" className={inputCls} value={form.startDate} onChange={fld('startDate')} /></Input>
            <Input label="완료목표일"><input type="date" className={inputCls} value={form.targetDate} onChange={fld('targetDate')} /></Input>
            <Input label="완료일"><input type="date" className={inputCls} value={form.completeDate} onChange={fld('completeDate')} /></Input>
            <Input label="통보 기관 수"><input type="number" className={inputCls} value={form.notificationCount} onChange={fld('notificationCount')} /></Input>
            <div className="flex items-center gap-3 py-2">
              <input type="checkbox" id="fsca-reported" checked={form.reportedToAuthority} onChange={chk('reportedToAuthority')} className="w-4 h-4" />
              <label htmlFor="fsca-reported" className="text-sm text-gray-700">식약처 보고완료</label>
            </div>
            <Input label="보고일"><input type="date" className={inputCls} value={form.reportDate} onChange={fld('reportDate')} /></Input>
            <Input label="식약처 접수번호"><input className={inputCls} value={form.reportNo} onChange={fld('reportNo')} /></Input>
            <Input label="연계 회수 ID"><input className={inputCls} value={form.recallId} onChange={fld('recallId')} placeholder="RC-XXX" /></Input>
            <Input label="담당자"><input className={inputCls} value={form.assignee} onChange={fld('assignee')} /></Input>
            <div className="md:col-span-2">
              <Input label="조치 상세 내용"><textarea rows={3} className={inputCls} value={form.actionDetail} onChange={fld('actionDetail')} /></Input>
            </div>
            <div className="md:col-span-2">
              <Input label="비고"><textarea rows={2} className={inputCls} value={form.note} onChange={fld('note')} /></Input>
            </div>
            <div className="md:col-span-2 flex gap-2 justify-end">
              <button type="button" onClick={() => { setShowForm(false); setTab('list') }} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">취소</button>
              <button type="submit" className="px-4 py-2 text-sm rounded-lg bg-orange-500 text-white hover:bg-orange-600 font-medium">{editId ? '수정' : '등록'}</button>
            </div>
          </form>
        </div>
      )}

      {(tab === 'list' || tab === 'inprogress' || tab === 'done') && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-orange-300"
                placeholder="제품명, FSCA번호, 이상사례 ID 검색..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {tab === 'list' && (
              <select className="text-sm border border-gray-200 rounded-lg px-2 py-2 outline-none" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="all">전체</option>
                {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            )}
            <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600">
              <Plus size={14} /> 등록
            </button>
          </div>
          {listToShow.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Shield size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">등록된 FSCA가 없습니다</p>
              <button onClick={openNew} className="mt-3 text-sm text-orange-500 hover:underline">첫 번째 FSCA 등록 →</button>
            </div>
          ) : listToShow.map(rec => <RecordRow key={rec.id} rec={rec} />)}
        </div>
      )}

      {tab === 'stats' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-4">FSCA 현황 분석</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-3">조치 유형별</p>
              {ACTION_TYPES.map(a => {
                const cnt = records.filter(r => r.actionType === a).length
                const pct = records.length ? Math.round(cnt / records.length * 100) : 0
                return cnt > 0 ? (<div key={a} className="mb-2">
                  <div className="flex justify-between text-xs text-gray-600 mb-1"><span>{a}</span><span>{cnt}건 ({pct}%)</span></div>
                  <div className="h-2 bg-gray-100 rounded-full"><div className="h-2 bg-orange-400 rounded-full" style={{ width: pct + '%' }} /></div>
                </div>) : null
              })}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-3">위험 수준별</p>
              {RISK_LEVELS.map(r => {
                const cnt = records.filter(rec => rec.riskLevel === r).length
                const pct = records.length ? Math.round(cnt / records.length * 100) : 0
                const c = { '매우 높음': 'bg-red-400', '높음': 'bg-orange-400', '중간': 'bg-yellow-400', '낮음': 'bg-blue-400' }[r]
                return (<div key={r} className="mb-2">
                  <div className="flex justify-between text-xs text-gray-600 mb-1"><span>{r}</span><span>{cnt}건 ({pct}%)</span></div>
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
                <div className="flex-1 bg-orange-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-orange-500">{records.filter(r => !r.reportedToAuthority && r.status !== '취소').length}</p>
                  <p className="text-xs text-gray-500 mt-1">보고 미완료</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
