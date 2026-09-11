import React, { useState, useMemo } from 'react'
import { AlertTriangle, RotateCcw, Shield, Plus, Search, Edit3, Trash2, X, FileText } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'adverse', label: '이상사례 보고', icon: AlertTriangle },
  { key: 'recall',  label: '리콜/회수',   icon: RotateCcw },
  { key: 'safety',  label: '안전성 조치',   icon: Shield },
  { key: 'mdr',    label: 'MDR 보고서',    icon: FileText },
]

// ─── Adverse Events constants ────────────────────────────────────────────────
const ADV_KEY      = 'qualytree.adverse_events'
const ADV_EMPTY    = { id: '', reportDate: '', productName: '', lotNo: '', eventType: '', severity: '', description: '', reportTo: '', status: '접수' }
const ADV_TYPES    = ['부작용', '오작동', '성능적하', '라粪띁오류', '기타'
]
const ADV_SEVS     = ['경미', '중등도', '중증', '사망']
const ADV_STATUSES = ['접수', '조사중', '완료', '보고완료']
const ADV_REPORTS  = ['식품의약품안전처', '건강보험심사평가원', '해외규제기관', '기타']

// ─── Recall constants ─────────────────────────────────────────────────────────
const REC_KEY      = 'qualytree.recall_records'
const REC_EMPTY    = { id: '', noticeDate: '', productName: '', lotNo: '', quantity: '', recallReason: '', recallClass: 'Class II (중요)', action: '', status: '진행중' }
const REC_CLASSES  = ['Class I (긴급)', 'Class II (중요)', 'Class III (일반)']
const REC_STATUSES = ['계획수립', '진행중', '완료', '취소']

// ─── Safety Action constants ──────────────────────────────────────────────────
const SAF_KEY      = 'qualytree.safety_actions'
const SAF_EMPTY    = { id: '', issueDate: '', productName: '', lotNo: '', actionType: '', reason: '', measure: '', status: '계획' }
const SAF_TYPES    = ['사용주의통보', '라벨변경', '사용제한', '수리/개선', '점검권고', '회수병행', '기타']
const SAF_STATUSES = ['계획', '진행중', '완료']

// ─── Helpers ──────────────────────────────────────────────────────────────────
const newId   = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
const lsRead  = (k) => { try { return JSON.parse(localStorage.getItem(k) || '[]') } catch { return [] } }
const lsSave  = (k, d) => localStorage.setItem(k, JSON.stringify(d))

const STATUS_COLOR = {
  '접수':    'bg-blue-100 text-blue-700',
  '조사중':  'bg-yellow-100 text-yellow-700',
  '완료':    'bg-green-100 text-green-700',
  '보고완료':'bg-purple-100 text-purple-700',
  '계획수립':'bg-gray-100 text-gray-600',
  '진행중':  'bg-orange-100 text-orange-700',
  '취소':    'bg-red-100 text-red-600',
  '계획':    'bg-gray-100 text-gray-600',
}
const SEV_COLOR = {
  '경미': 'bg-green-100 text-green-700',
  '중등도':'bg-yellow-100 text-yellow-700',
  '중증': 'bg-orange-100 text-orange-700',
  '사망': 'bg-red-100 text-red-700',
}
const CLASS_COLOR = {
  'Class I (긴급)':    'bg-red-100 text-red-700',
  'Class II (중요)':   'bg-orange-100 text-orange-700',
  'Class III (일반)':  'bg-yellow-100 text-yellow-700',
}

// ─── Shared micro-components ──────────────────────────────────────────────────
function Badge({ text, map }) {
  const cls = (map && map[text]) || 'bg-gray-100 text-gray-600'
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{text}</span>
}

function FRow({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200'

function FInput({ ...p }) { return <input {...p} className={inputCls} /> }
function FSel({ opts, ...p }) {
  return (
    <select {...p} className={inputCls}>
      {opts.map(o => <option key={o}>{o}</option>)}
    </select>
  )
}
function FTA({ ...p }) { return <textarea {...p} rows={3} className={inputCls} /> }

// ─── Stats row ────────────────────────────────────────────────────────────────
function Stats({ rows }) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${rows.length}, 1fr)` }}>
      {rows.map(([label, val, cls]) => (
        <div key={label} className="bg-white rounded-xl border border-gray-100 p-3 text-center shadow-sm">
          <div className={`text-2xl font-bold ${cls}`}>{val}</div>
          <div className="text-xs text-gray-500 mt-0.5">{label}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Search + Add toolbar ─────────────────────────────────────────────────────
function Toolbar({ search, onSearch, placeholder, onAdd, label }) {
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
        />
      </div>
      <button
        onClick={onAdd}
        className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
      >
        <Plus size={14} /> {label}
      </button>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function Empty({ searching, msg }) {
  return (
    <div className="text-center py-12 text-gray-400 text-sm bg-white rounded-xl border border-gray-100">
      {searching ? '검색 결과가 없습니다.' : msg}
    </div>
  )
}

// ─── Form shell ───────────────────────────────────────────────────────────────
function FormShell({ title, onClose, onSave, children }) {
  return (
    <div className="bg-white rounded-xl border border-red-100 p-4 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-700 text-sm">{title}</h3>
        <button onClick={onClose}><X size={16} className="text-gray-400 hover:text-gray-600" /></button>
      </div>
      {children}
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">취소</button>
        <button onClick={onSave} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">저장</button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — 이상사례 보고
// ═══════════════════════════════════════════════════════════════════════════════
function AdverseTab() {
  const [items, setItems] = useState(() => lsRead(ADV_KEY))
  const [form, setForm] = useState({ ...ADV_EMPTY })
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [expandId, setExpandId] = useState(null)

  const persist = d => { setItems(d); lsSave(ADV_KEY, d) }

  const filtered = useMemo(() =>
    items.filter(i => !search || i.productName?.includes(search) || i.eventType?.includes(search) || i.status?.includes(search)),
    [items, search]
  )

  const openNew  = () => { setForm({ ...ADV_EMPTY }); setEditId(null); setShowForm(true) }
  const openEdit = item => { setForm({ ...item }); setEditId(item.id); setShowForm(true) }
  const close    = () => { setShowForm(false); setEditId(null) }

  const submit = () => {
    if (!form.productName || !form.reportDate) return
    const next = editId
      ? items.map(i => i.id === editId ? { ...form, id: editId } : i)
      : [{ ...form, id: newId() }, ...items]
    persist(next); close()
  }

  const del = id => { if (window.confirm('삭제하시겠습니까?')) persist(items.filter(i => i.id !== id)) }

  const f = v => e => setForm({ ...form, [v]: e.target.value })

  return (
    <div className="space-y-4">
      <Stats rows={[
        ['전체', items.length, 'text-gray-700'],
        ['처리중', items.filter(i => ['접수','조사중'].includes(i.status)).length, 'text-orange-600'],
        ['보고완료', items.filter(i => i.status === '보고완료').length, 'text-green-600'],
      ]} />
      <Toolbar search={search} onSearch={setSearch} placeholder="제품명, 사례유형, 처리상태..." onAdd={openNew} label="신규 등록" />

      {showForm && (
        <FormShell title={editId ? '이상사례 수정' : '이상사례 신규 등록'} onClose={close} onSave={submit}>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <FRow label="보고일자 *"><FInput type="date" value={form.reportDate} onChange={f('reportDate')} /></FRow>
            <FRow label="제품명 *"><FInput value={form.productName} onChange={f('productName')} placeholder="제품명" /></FRow>
            <FRow label="LOT/일련번호"><FInput value={form.lotNo} onChange={f('lotNo')} placeholder="LOT No." /></FRow>
            <FRow label="사례 유형"><FSel opts={ADV_TYPES} value={form.eventType} onChange={f('eventType')} /></FRow>
            <FRow label="중증도"><FSel opts={ADV_SEVS} value={form.severity} onChange={f('severity')} /></FRow>
            <FRow label="보고 기관"><FSel opts={ADV_REPORTS} value={form.reportTo} onChange={f('reportTo')} /></FRow>
            <FRow label="처리 상태"><FSel opts={ADV_STATUSES} value={form.status} onChange={f('status')} /></FRow>
          </div>
          <FRow label="사례 내용">
            <FTA value={form.description} onChange={f('description')} placeholder="이상사례 상세 내용" />
          </FRow>
        </FormShell>
      )}

      <div className="space-y-2">
        {filtered.length === 0
          ? <Empty searching={!!search} msg="등록된 이상사례가 없습니다." />
          : filtered.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50" onClick={() => setExpandId(expandId === item.id ? null : item.id)}>
                <AlertTriangle size={15} className="text-red-500 shrink-0" />
                <span className="flex-1 text-sm font-medium text-gray-800">{item.productName}</span>
                <span className="text-xs text-gray-400">{item.reportDate}</span>
                {item.severity && <Badge text={item.severity} map={SEV_COLOR} />}
                <Badge text={item.status} map={STATUS_COLOR} />
                <button onClick={e => { e.stopPropagation(); openEdit(item) }} className="p-1 rounded hover:bg-gray-100"><Edit3 size={13} className="text-gray-400" /></button>
                <button onClick={e => { e.stopPropagation(); del(item.id) }} className="p-1 rounded hover:bg-red-50"><Trash2 size={13} className="text-red-400" /></button>
              </div>
              {expandId === item.id && (
                <div className="border-t border-gray-50 px-4 pb-3 pt-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div><span className="text-gray-400">LOT No.: </span>{item.lotNo || '-'}</div>
                  <div><span className="text-gray-400">사례유형: </span>{item.eventType || '-'}</div>
                  <div><span className="text-gray-400">보고기관: </span>{item.reportTo || '-'}</div>
                  <div><span className="text-gray-400">중증도: </span>{item.severity || '-'}</div>
                  {item.description && <div className="col-span-2"><span className="text-gray-400">내용: </span>{item.description}</div>}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — 리콜/회수
// ═══════════════════════════════════════════════════════════════════════════════
function RecallTab() {
  const [items, setItems] = useState(() => lsRead(REC_KEY))
  const [form, setForm] = useState({ ...REC_EMPTY })
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [expandId, setExpandId] = useState(null)

  const persist = d => { setItems(d); lsSave(REC_KEY, d) }

  const filtered = useMemo(() =>
    items.filter(i => !search || i.productName?.includes(search) || i.recallReason?.includes(search) || i.status?.includes(search)),
    [items, search]
  )

  const openNew  = () => { setForm({ ...REC_EMPTY }); setEditId(null); setShowForm(true) }
  const openEdit = item => { setForm({ ...item }); setEditId(item.id); setShowForm(true) }
  const close    = () => { setShowForm(false); setEditId(null) }

  const submit = () => {
    if (!form.productName || !form.noticeDate) return
    const next = editId
      ? items.map(i => i.id === editId ? { ...form, id: editId } : i)
      : [{ ...form, id: newId() }, ...items]
    persist(next); close()
  }

  const del = id => { if (window.confirm('삭제하시겠습니까?')) persist(items.filter(i => i.id !== id)) }

  const f = v => e => setForm({ ...form, [v]: e.target.value })

  return (
    <div className="space-y-4">
      <Stats rows={[
        ['전체', items.length, 'text-gray-700'],
        ['진행중', items.filter(i => ['계획수립','진행중'].includes(i.status)).length, 'text-orange-600'],
        ['완료', items.filter(i => i.status === '완료').length, 'text-green-600'],
      ]} />
      <Toolbar search={search} onSearch={setSearch} placeholder="제품명, 회수사유, 처리상태..." onAdd={openNew} label="신규 등록" />

      {showForm && (
        <FormShell title={editId ? '리콜/회수 수정' : '리콜/회수 신규 등록'} onClose={close} onSave={submit}>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <FRow label="통보/공지일 *"><FInput type="date" value={form.noticeDate} onChange={f('noticeDate')} /></FRow>
            <FRow label="제품명 *"><FInput value={form.productName} onChange={f('productName')} placeholder="제품명" /></FRow>
            <FRow label="LOT/일련번호"><FInput value={form.lotNo} onChange={f('lotNo')} placeholder="LOT No." /></FRow>
            <FRow label="회수 수량"><FInput value={form.quantity} onChange={f('quantity')} placeholder="수량 및 단위" /></FRow>
            <FRow label="회수 등급"><FSel opts={REC_CLASSES} value={form.recallClass} onChange={f('recallClass')} /></FRow>
            <FRow label="처리 상태"><FSel opts={REC_STATUSES} value={form.status} onChange={f('status')} /></FRow>
          </div>
          <FRow label="회수 사유">
            <FTA value={form.recallReason} onChange={f('recallReason')} placeholder="회수 사유" />
          </FRow>
          <div className="mt-3">
            <FRow label="조치 내용">
              <FTA value={form.action} onChange={f('action')} placeholder="취해진 또는 취할 조치 내용" />
            </FRow>
          </div>
        </FormShell>
      )}

      <div className="space-y-2">
        {filtered.length === 0
          ? <Empty searching={!!search} msg="등록된 리콜/회수 이력이 없습니다." />
          : filtered.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50" onClick={() => setExpandId(expandId === item.id ? null : item.id)}>
                <RotateCcw size={15} className="text-red-500 shrink-0" />
                <span className="flex-1 text-sm font-medium text-gray-800">{item.productName}</span>
                <span className="text-xs text-gray-400">{item.noticeDate}</span>
                {item.recallClass && <Badge text={item.recallClass} map={CLASS_COLOR} />}
                <Badge text={item.status} map={STATUS_COLOR} />
                <button onClick={e => { e.stopPropagation(); openEdit(item) }} className="p-1 rounded hover:bg-gray-100"><Edit3 size={13} className="text-gray-400" /></button>
                <button onClick={e => { e.stopPropagation(); del(item.id) }} className="p-1 rounded hover:bg-red-50"><Trash2 size={13} className="text-red-400" /></button>
              </div>
              {expandId === item.id && (
                <div className="border-t border-gray-50 px-4 pb-3 pt-2 space-y-1.5 text-xs text-gray-600">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-gray-400">LOT No.: </span>{item.lotNo || '-'}</div>
                    <div><span className="text-gray-400">회수수량: </span>{item.quantity || '-'}</div>
                  </div>
                  {item.recallReason && <div><span className="text-gray-400">회수사유: </span>{item.recallReason}</div>}
                  {item.action && <div><span className="text-gray-400">조치내용: </span>{item.action}</div>}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3 — 안전성 조치
// ═══════════════════════════════════════════════════════════════════════════════
function SafetyTab() {
  const [items, setItems] = useState(() => lsRead(SAF_KEY))
  const [form, setForm] = useState({ ...SAF_EMPTY })
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [expandId, setExpandId] = useState(null)

  const persist = d => { setItems(d); lsSave(SAF_KEY, d) }

  const filtered = useMemo(() =>
    items.filter(i => !search || i.productName?.includes(search) || i.actionType?.includes(search) || i.status?.includes(search)),
    [items, search]
  )

  const openNew  = () => { setForm({ ...SAF_EMPTY }); setEditId(null); setShowForm(true) }
  const openEdit = item => { setForm({ ...item }); setEditId(item.id); setShowForm(true) }
  const close    = () => { setShowForm(false); setEditId(null) }

  const submit = () => {
    if (!form.productName || !form.issueDate) return
    const next = editId
      ? items.map(i => i.id === editId ? { ...form, id: editId } : i)
      : [{ ...form, id: newId() }, ...items]
    persist(next); close()
  }

  const del = id => { if (window.confirm('삭제하시겠습니까?')) persist(items.filter(i => i.id !== id)) }

  const f = v => e => setForm({ ...form, [v]: e.target.value })

  return (
    <div className="space-y-4">
      <Stats rows={[
        ['전체', items.length, 'text-gray-700'],
        ['진행중', items.filter(i => ['계획','진행중'].includes(i.status)).length, 'text-orange-600'],
        ['완료', items.filter(i => i.status === '완료').length, 'text-green-600'],
      ]} />
      <Toolbar search={search} onSearch={setSearch} placeholder="제품명, 조치유형, 처리상태..." onAdd={openNew} label="신규 등록" />

      {showForm && (
        <FormShell title={editId ? '안전성 조치 수정' : '안전성 조치 신규 등록'} onClose={close} onSave={submit}>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <FRow label="조치 발령일 *"><FInput type="date" value={form.issueDate} onChange={f('issueDate')} /></FRow>
            <FRow label="제품명 *"><FInput value={form.productName} onChange={f('productName')} placeholder="제품명" /></FRow>
            <FRow label="LOT/일련번호"><FInput value={form.lotNo} onChange={f('lotNo')} placeholder="LOT No." /></FRow>
            <FRow label="조치 유형"><FSel opts={SAF_TYPES} value={form.actionType} onChange={f('actionType')} /></FRow>
            <FRow label="이행 상태"><FSel opts={SAF_STATUSES} value={form.status} onChange={f('status')} /></FRow>
          </div>
          <FRow label="발동 사유">
            <FTA value={form.reason} onChange={f('reason')} placeholder="안전성 조치 발동 사유" />
          </FRow>
          <div className="mt-3">
            <FRow label="세부 조치 내용">
              <FTA value={form.measure} onChange={f('measure')} placeholder="구체적인 조치 내용" />
            </FRow>
          </div>
        </FormShell>
      )}

      <div className="space-y-2">
        {filtered.length === 0
          ? <Empty searching={!!search} msg="등록된 안전성 조치 이력이 없습니다." />
          : filtered.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50" onClick={() => setExpandId(expandId === item.id ? null : item.id)}>
                <Shield size={15} className="text-red-500 shrink-0" />
                <span className="flex-1 text-sm font-medium text-gray-800">{item.productName}</span>
                <span className="text-xs text-gray-400">{item.issueDate}</span>
                {item.actionType && (
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{item.actionType}</span>
                )}
                <Badge text={item.status} map={STATUS_COLOR} />
                <button onClick={e => { e.stopPropagation(); openEdit(item) }} className="p-1 rounded hover:bg-gray-100"><Edit3 size={13} className="text-gray-400" /></button>
                <button onClick={e => { e.stopPropagation(); del(item.id) }} className="p-1 rounded hover:bg-red-50"><Trash2 size={13} className="text-red-400" /></button>
              </div>
              {expandId === item.id && (
                <div className="border-t border-gray-50 px-4 pb-3 pt-2 space-y-1.5 text-xs text-gray-600">
                  <div><span className="text-gray-400">LOT No.: </span>{item.lotNo || '-'}</div>
                  {item.reason && <div><span className="text-gray-400">발동사유: </span>{item.reason}</div>}
                  {item.measure && <div><span className="text-gray-400">조치내용: </span>{item.measure}</div>}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function PostMarketSafetyHub() {
  const [activeTab, setActiveTab] = useState('adverse')

  return (
    <AppLayout>
      <HubBanner icon={AlertTriangle} title="시판후안전관리" subtitle="이상사례 보고 · 리콜/회수 · 안전성 조치 통합 관리" color="#dc2626" />
      <div className="max-w-4xl mx-auto px-4 pb-10">

        {/* Tab navigation */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === t.key
                    ? 'bg-white text-red-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={14} />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'adverse' && <AdverseTab />}
        {activeTab === 'recall'  && <RecallTab />}
        {activeTab === 'safety'  && <SafetyTab />}
        {activeTab === 'mdr'     && <MdrTab />}
      </div>
    </AppLayout>
  )
}


// ── MDR 보고서 탭 ────────────────────────────────────────────
const MDR_KEY = 'qualytree.mdr_reports'
function MdrTab() {
  const [reports, setReports] = React.useState([])
  const [showForm, setShowForm] = React.useState(false)
  const [editId, setEditId] = React.useState(null)
  const EMPTY = { reportNo:'', reportType:'15일보고', productName:'', incidentDate:'', reportDate:'', patientInfo:'', eventDescription:'', deviceProblem:'', patientOutcome:'', cause:'', corrective:'', status:'작성중' }
  const [form, setForm] = React.useState(EMPTY)

  React.useEffect(() => {
    try { setReports(JSON.parse(localStorage.getItem(MDR_KEY)||'[]')) } catch {}
  }, [])

  const persist = (list) => { try { localStorage.setItem(MDR_KEY, JSON.stringify(list)) } catch {}; setReports(list) }

  const generateDraft = () => {
    const today = new Date().toISOString().slice(0,10)
    setForm({
      reportNo: 'MDR-' + Date.now().toString().slice(-6),
      reportType: '15일보고',
      productName: '',
      incidentDate: today,
      reportDate: today,
      patientInfo: '환자 식별번호: ___  나이: ___  성별: ___  사용 목적: ___',
      eventDescription: '[이상사례 발생일]: ___\n[발생 장소]: ___\n[사고 경위]: 환자에게 기기를 사용 중 ___이 발생하였음.\n[기기 상태]: 사고 당시 기기의 상태는 ___ 이었으며, 시리얼번호 ___ 로 확인됨.',
      deviceProblem: '□ 기기 고장  □ 라벨 오류  □ 사용자 오류  □ 기기 성능 저하  □ 기타: ___',
      patientOutcome: '□ 사망  □ 중대한 부상  □ 입원  □ 생명 위협  □ 후유증  □ 의료 처치 필요  □ 무해',
      cause: '[임시 원인 분석]:\n제조 공정: ___\n설계 결함: ___\n사용자 오류: ___\n환경 요인: ___',
      corrective: '[즉각 조치]:\n1. 해당 로트 격리 조치\n2. 의료기관 통보\n3. 원인 조사 착수\n\n[예방 조치]:\n1. CAPA 등록 예정\n2. 제조 공정 검토 예정',
      status: '작성중'
    })
    setEditId(null)
    setShowForm(true)
  }

  const handlePrint = (r) => {
    const esc = (s) => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br/>')
    const html = `<!DOCTYPE html><html><head><title>MDR-${r.reportNo}</title><style>body{font-family:serif;margin:30px;font-size:12px}h1{font-size:16px;text-align:center;border-bottom:2px solid #000;padding-bottom:6px}table{width:100%;border-collapse:collapse}td{border:1px solid #000;padding:5px;vertical-align:top}.lb{background:#f0f0f0;width:20%;font-weight:bold}</style></head><body><h1>의료기기 이상사례 보고서 (MDR)</h1><table><tr><td class=lb>보고번호</td><td>${esc(r.reportNo)}</td><td class=lb>보고유형</td><td>${esc(r.reportType)}</td></tr><tr><td class=lb>제품명</td><td>${esc(r.productName)}</td><td class=lb>보고일</td><td>${esc(r.reportDate)}</td></tr><tr><td class=lb>사고발생일</td><td>${esc(r.incidentDate)}</td><td class=lb>상태</td><td>${esc(r.status)}</td></tr><tr><td class=lb>환자정보</td><td colspan=3>${esc(r.patientInfo)}</td></tr><tr><td class=lb>사고개요</td><td colspan=3>${esc(r.eventDescription)}</td></tr><tr><td class=lb>기기결함</td><td colspan=3>${esc(r.deviceProblem)}</td></tr><tr><td class=lb>환자결과</td><td colspan=3>${esc(r.patientOutcome)}</td></tr><tr><td class=lb>원인분석</td><td colspan=3>${esc(r.cause)}</td></tr><tr><td class=lb>시정조치</td><td colspan=3>${esc(r.corrective)}</td></tr></table></body></html>`
    const w = window.open('','_blank'); w.document.write(html); w.document.close(); w.print()
  }

  const save = () => {
    if (!form.reportNo.trim()) return
    if (editId) { persist(reports.map(r=>r.id===editId?{...r,...form}:r)) }
    else { persist([...reports, {id:Date.now().toString(),...form}]) }
    setShowForm(false)
  }
  const del = (id) => { if(!window.confirm('삭제하시겠습니까?')) return; persist(reports.filter(r=>r.id!==id)) }
  const setF = (k,v) => setForm(f=>({...f,[k]:v}))

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center justify-between">
        <span className="text-[13px]" style={{color:'var(--ink-faint)'}}>MDR 보고서 {reports.length}건</span>
        <div className="flex gap-2">
          <button onClick={generateDraft} className="px-3 py-1.5 rounded-lg text-[13px] font-medium" style={{background:'#7c3aed',color:'#fff'}}>AI 초안 생성</button>
          <button onClick={()=>{setEditId(null);setForm({...EMPTY,reportDate:new Date().toISOString().slice(0,10)});setShowForm(true)}} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[13px] font-medium" style={{background:'var(--accent)',color:'#fff'}}><Plus size={14}/> 신규</button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl border p-4 space-y-3" style={{borderColor:'var(--border)',background:'var(--surface-2)'}}>
          <div className="grid grid-cols-2 gap-3">
            <FInput label="보고번호" value={form.reportNo} onChange={e=>setF('reportNo',e.target.value)} />
            <FSel label="보고유형" value={form.reportType} onChange={e=>setF('reportType',e.target.value)} options={['15일보고','30일보고','보완보고']} />
            <FInput label="제품명" value={form.productName} onChange={e=>setF('productName',e.target.value)} />
            <FSel label="상태" value={form.status} onChange={e=>setF('status',e.target.value)} options={['작성중','검토중','제출완료']} />
            <FInput label="사고발생일" type="date" value={form.incidentDate} onChange={e=>setF('incidentDate',e.target.value)} />
            <FInput label="보고일" type="date" value={form.reportDate} onChange={e=>setF('reportDate',e.target.value)} />
            <div className="col-span-2"><FTA label="환자정보" value={form.patientInfo} onChange={e=>setF('patientInfo',e.target.value)} rows={2} /></div>
            <div className="col-span-2"><FTA label="사고개요" value={form.eventDescription} onChange={e=>setF('eventDescription',e.target.value)} rows={4} /></div>
            <div className="col-span-2"><FTA label="기기결함" value={form.deviceProblem} onChange={e=>setF('deviceProblem',e.target.value)} rows={2} /></div>
            <div className="col-span-2"><FTA label="환자결과" value={form.patientOutcome} onChange={e=>setF('patientOutcome',e.target.value)} rows={2} /></div>
            <div className="col-span-2"><FTA label="원인분석" value={form.cause} onChange={e=>setF('cause',e.target.value)} rows={3} /></div>
            <div className="col-span-2"><FTA label="시정조치" value={form.corrective} onChange={e=>setF('corrective',e.target.value)} rows={3} /></div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={()=>setShowForm(false)} className="px-3 py-1.5 rounded-lg text-[13px]" style={{background:'var(--surface-2)',border:'1px solid var(--border)'}}>취소</button>
            <button onClick={save} className="px-3 py-1.5 rounded-lg text-[13px] font-medium" style={{background:'var(--accent)',color:'#fff'}}>저장</button>
          </div>
        </div>
      )}

      {reports.length===0&&!showForm&&(
        <div className="text-center py-8" style={{color:'var(--ink-faint)'}}>
          <p className="text-[14px]">MDR 보고서가 없습니다</p>
          <p className="text-[12px] mt-1">AI 초안 생성으로 빠르게 작성하세요</p>
        </div>
      )}

      <div className="space-y-2">
        {reports.map(r=>(
          <div key={r.id} className="rounded-xl border p-3" style={{borderColor:'var(--border)',background:'var(--surface)'}}>
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-semibold">{r.reportNo}</p>
                  <Badge label={r.reportType} color={r.reportType==='15일보고'?'red':'orange'} />
                  <Badge label={r.status} color={r.status==='제출완료'?'green':r.status==='검토중'?'blue':'gray'} />
                </div>
                <p className="text-[12px] mt-0.5" style={{color:'var(--ink-faint)'}}>{r.productName} · 사고: {r.incidentDate} · 보고: {r.reportDate}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={()=>handlePrint(r)} className="px-2 py-1 rounded text-[12px]" style={{background:'var(--surface-2)',border:'1px solid var(--border)'}}>출력</button>
                <button onClick={()=>{setEditId(r.id);setForm({reportNo:r.reportNo,reportType:r.reportType,productName:r.productName,incidentDate:r.incidentDate,reportDate:r.reportDate,patientInfo:r.patientInfo,eventDescription:r.eventDescription,deviceProblem:r.deviceProblem,patientOutcome:r.patientOutcome,cause:r.cause,corrective:r.corrective,status:r.status});setShowForm(true)}} className="p-1 rounded" style={{color:'var(--ink-faint)'}}><Edit3 size={14}/></button>
                <button onClick={()=>del(r.id)} className="p-1 rounded" style={{color:'var(--danger)'}}><Trash2 size={14}/></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}