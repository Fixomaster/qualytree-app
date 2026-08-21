// src/pages/quality/QualityHub.jsx — §8.3 NCR 부적합 관리
import React, { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ShieldAlert, Plus, Search, Edit3, Trash2, X, Package } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'

const NCR_KEY     = 'qualytree.ncrs'
const NCR_CNT_KEY = 'qualytree.ncrCounter'
const QUAR_KEY    = 'qualytree.quarantineItems'

function lsRead(key) { try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] } }
function lsSave(key, val) { localStorage.setItem(key, JSON.stringify(val)) }

function nextNcrId() {
  const n = parseInt(localStorage.getItem(NCR_CNT_KEY) || '0', 10) + 1
  localStorage.setItem(NCR_CNT_KEY, String(n))
  return `NCR-${new Date().getFullYear()}-${String(n).padStart(4, '0')}`
}
function nextQuarId() {
  const arr = lsRead(QUAR_KEY)
  return `QUAR-${new Date().getFullYear()}-${String(arr.length + 1).padStart(3, '0')}`
}
function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }

/* ── 공통 UI ── */
function Badge({ label, color }) {
  const colors = {
    red:    'bg-red-100 text-red-700',
    orange: 'bg-orange-100 text-orange-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    green:  'bg-green-100 text-green-700',
    blue:   'bg-blue-100 text-blue-700',
    gray:   'bg-gray-100 text-gray-600',
  }
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[color] || colors.gray}`}>{label}</span>
}

function severityColor(s) {
  if (s === '중대') return 'red'
  if (s === '중등도') return 'orange'
  return 'yellow'
}
function ncrStatusColor(s) {
  if (s === '종결') return 'green'
  if (s === '처리완료') return 'blue'
  if (s === '조사중') return 'orange'
  return 'gray'
}
function quarStatusColor(s) {
  if (s === '해제') return 'green'
  if (s === '처리중') return 'orange'
  return 'red'
}

function FRow({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  )
}
function FInput({ value, onChange, placeholder, type = 'text', required }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
    />
  )
}
function FSel({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 bg-white"
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}
function FTA({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
    />
  )
}

function Stats({ items }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {items.map(({ label, value, color }) => (
        <div key={label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${color || 'text-gray-800'}`}>{value}</p>
        </div>
      ))}
    </div>
  )
}

function FormShell({ title, onClose, onSubmit, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={onSubmit} className="p-5 space-y-4">
          {children}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 rounded-xl py-2 text-sm text-gray-600 hover:bg-gray-50">취소</button>
            <button type="submit"
              className="flex-1 bg-red-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-red-700">저장</button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════
   NCR 탭
══════════════════════════════════════════ */
const NCR_EMPTY = {
  ncrId: '', date: '', productName: '', lotNo: '',
  defectType: '원자재', severity: '경미',
  description: '', disposition: '격리',
  assignee: '', status: '등록'
}

function NcrTab() {
  const [records, setRecords] = useState(() => lsRead(NCR_KEY))
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(null)   // null | { ...fields, _id? }
  const [editing, setEditing] = useState(null)

  function save(items) { setRecords(items); lsSave(NCR_KEY, items) }

  function openNew() {
    setForm({ ...NCR_EMPTY, date: new Date().toISOString().slice(0, 10), ncrId: nextNcrId() })
    setEditing(null)
  }
  function openEdit(r) { setForm({ ...r }); setEditing(r._id) }

  function handleSubmit(e) {
    e.preventDefault()
    if (editing) {
      save(records.map(r => r._id === editing ? { ...form, _id: editing } : r))
    } else {
      save([{ ...form, _id: newId() }, ...records])
    }
    setForm(null)
  }

  function del(id) {
    if (!window.confirm('삭제하시겠습니까?')) return
    save(records.filter(r => r._id !== id))
  }

  const filtered = useMemo(() => {
    if (!search) return records
    const q = search.toLowerCase()
    return records.filter(r =>
      (r.ncrId || '').toLowerCase().includes(q) ||
      (r.productName || '').toLowerCase().includes(q) ||
      (r.lotNo || '').toLowerCase().includes(q) ||
      (r.defectType || '').includes(q) ||
      (r.status || '').includes(q)
    )
  }, [records, search])

  const total = records.length
  const active = records.filter(r => r.status !== '종결').length
  const critical = records.filter(r => r.severity === '중대').length
  const closed = records.filter(r => r.status === '종결').length

  return (
    <div>
      <Stats items={[
        { label: '전체 NCR', value: total, color: 'text-gray-800' },
        { label: '진행중', value: active, color: 'text-orange-600' },
        { label: '중대', value: critical, color: 'text-red-600' },
        { label: '종결', value: closed, color: 'text-green-600' },
      ]} />

      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="NCR번호, 제품명, 로트번호 검색..."
            className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
          />
        </div>
        <button onClick={openNew}
          className="flex items-center gap-1 bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-700">
          <Plus size={14} /> 등록
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ShieldAlert size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">등록된 NCR이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <div key={r._id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-xs font-semibold text-red-600">{r.ncrId}</span>
                    <Badge label={r.severity} color={severityColor(r.severity)} />
                    <Badge label={r.status} color={ncrStatusColor(r.status)} />
                    <Badge label={r.defectType} color="gray" />
                  </div>
                  <p className="text-sm font-medium text-gray-800 truncate">{r.productName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {r.date} {r.lotNo ? `· Lot: ${r.lotNo}` : ''} {r.assignee ? `· 담당: ${r.assignee}` : ''}
                  </p>
                  {r.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{r.description}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Edit3 size={14} />
                  </button>
                  <button onClick={() => del(r._id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {form && (
        <FormShell
          title={editing ? 'NCR 수정' : 'NCR 등록'}
          onClose={() => setForm(null)}
          onSubmit={handleSubmit}
        >
          <div className="grid grid-cols-2 gap-3">
            <FRow label="NCR 번호">
              <FInput value={form.ncrId} onChange={v => setForm(f => ({ ...f, ncrId: v }))} />
            </FRow>
            <FRow label="발생일">
              <FInput type="date" value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} required />
            </FRow>
          </div>
          <FRow label="제품명">
            <FInput value={form.productName} onChange={v => setForm(f => ({ ...f, productName: v }))} placeholder="제품명 입력" required />
          </FRow>
          <div className="grid grid-cols-2 gap-3">
            <FRow label="로트/배치번호">
              <FInput value={form.lotNo} onChange={v => setForm(f => ({ ...f, lotNo: v }))} placeholder="Lot No." />
            </FRow>
            <FRow label="담당자">
              <FInput value={form.assignee} onChange={v => setForm(f => ({ ...f, assignee: v }))} placeholder="담당자명" />
            </FRow>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FRow label="부적합 유형">
              <FSel value={form.defectType} onChange={v => setForm(f => ({ ...f, defectType: v }))}
                options={['원자재', '공정중', '완제품', '고객반품', '기타']} />
            </FRow>
            <FRow label="심각도">
              <FSel value={form.severity} onChange={v => setForm(f => ({ ...f, severity: v }))}
                options={['경미', '중등도', '중대']} />
            </FRow>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FRow label="처리방법">
              <FSel value={form.disposition} onChange={v => setForm(f => ({ ...f, disposition: v }))}
                options={['격리', '사용중지', '반품', '폐기', '재작업', '특채']} />
            </FRow>
            <FRow label="상태">
              <FSel value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))}
                options={['등록', '조사중', '처리완료', '종결']} />
            </FRow>
          </div>
          <FRow label="부적합 내용">
            <FTA value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))}
              placeholder="부적합 내용 및 원인을 상세히 기술하세요" />
          </FRow>
        </FormShell>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════
   격리 현황 탭
══════════════════════════════════════════ */
const QUAR_EMPTY = {
  quarId: '', date: '', productName: '', lotNo: '',
  qty: '', unit: 'EA', location: '',
  reason: '', status: '격리중'
}

function QuarantineTab() {
  const [records, setRecords] = useState(() => lsRead(QUAR_KEY))
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(null)
  const [editing, setEditing] = useState(null)

  function save(items) { setRecords(items); lsSave(QUAR_KEY, items) }

  function openNew() {
    setForm({ ...QUAR_EMPTY, date: new Date().toISOString().slice(0, 10), quarId: nextQuarId() })
    setEditing(null)
  }
  function openEdit(r) { setForm({ ...r }); setEditing(r._id) }

  function handleSubmit(e) {
    e.preventDefault()
    if (editing) {
      save(records.map(r => r._id === editing ? { ...form, _id: editing } : r))
    } else {
      save([{ ...form, _id: newId() }, ...records])
    }
    setForm(null)
  }

  function del(id) {
    if (!window.confirm('삭제하시겠습니까?')) return
    save(records.filter(r => r._id !== id))
  }

  const filtered = useMemo(() => {
    if (!search) return records
    const q = search.toLowerCase()
    return records.filter(r =>
      (r.quarId || '').toLowerCase().includes(q) ||
      (r.productName || '').toLowerCase().includes(q) ||
      (r.lotNo || '').toLowerCase().includes(q) ||
      (r.status || '').includes(q)
    )
  }, [records, search])

  const active = records.filter(r => r.status === '격리중').length
  const processing = records.filter(r => r.status === '처리중').length
  const released = records.filter(r => r.status === '해제').length

  return (
    <div>
      <Stats items={[
        { label: '전체', value: records.length, color: 'text-gray-800' },
        { label: '격리중', value: active, color: 'text-red-600' },
        { label: '처리중', value: processing, color: 'text-orange-600' },
        { label: '해제', value: released, color: 'text-green-600' },
      ]} />

      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="제품명, 로트번호 검색..."
            className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
          />
        </div>
        <button onClick={openNew}
          className="flex items-center gap-1 bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-700">
          <Plus size={14} /> 등록
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Package size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">격리 항목이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <div key={r._id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-xs font-semibold text-red-600">{r.quarId}</span>
                    <Badge label={r.status} color={quarStatusColor(r.status)} />
                  </div>
                  <p className="text-sm font-medium text-gray-800">{r.productName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {r.date}
                    {r.lotNo ? ` · Lot: ${r.lotNo}` : ''}
                    {r.qty ? ` · 수량: ${r.qty} ${r.unit}` : ''}
                    {r.location ? ` · 위치: ${r.location}` : ''}
                  </p>
                  {r.reason && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{r.reason}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Edit3 size={14} />
                  </button>
                  <button onClick={() => del(r._id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {form && (
        <FormShell
          title={editing ? '격리 항목 수정' : '격리 항목 등록'}
          onClose={() => setForm(null)}
          onSubmit={handleSubmit}
        >
          <div className="grid grid-cols-2 gap-3">
            <FRow label="격리 번호">
              <FInput value={form.quarId} onChange={v => setForm(f => ({ ...f, quarId: v }))} />
            </FRow>
            <FRow label="격리 일자">
              <FInput type="date" value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} required />
            </FRow>
          </div>
          <FRow label="제품명">
            <FInput value={form.productName} onChange={v => setForm(f => ({ ...f, productName: v }))} placeholder="제품명 입력" required />
          </FRow>
          <div className="grid grid-cols-2 gap-3">
            <FRow label="로트번호">
              <FInput value={form.lotNo} onChange={v => setForm(f => ({ ...f, lotNo: v }))} placeholder="Lot No." />
            </FRow>
            <FRow label="보관 위치">
              <FInput value={form.location} onChange={v => setForm(f => ({ ...f, location: v }))} placeholder="창고 위치" />
            </FRow>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FRow label="수량">
              <FInput value={form.qty} onChange={v => setForm(f => ({ ...f, qty: v }))} placeholder="0" />
            </FRow>
            <FRow label="단위">
              <FSel value={form.unit} onChange={v => setForm(f => ({ ...f, unit: v }))}
                options={['EA', 'BOX', 'KG', 'L', 'SET']} />
            </FRow>
            <FRow label="상태">
              <FSel value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))}
                options={['격리중', '처리중', '해제']} />
            </FRow>
          </div>
          <FRow label="격리 사유">
            <FTA value={form.reason} onChange={v => setForm(f => ({ ...f, reason: v }))}
              placeholder="격리 사유를 입력하세요" />
          </FRow>
        </FormShell>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════
   메인
══════════════════════════════════════════ */
const TABS = [
  { key: 'ncr',        label: 'NCR 부적합', icon: ShieldAlert },
  { key: 'quarantine', label: '격리 현황',   icon: Package },
]

export default function QualityHub() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'ncr'

  function setTab(key) {
    setSearchParams({ tab: key })
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 pb-10">
        <HubBanner
          icon={ShieldAlert}
          title="NCR·부적합 관리"
          subtitle="부적합 사항 등록 · 격리 현황 관리 (ISO 13485 §8.3)"
          color="#dc2626"
        />

        {/* 탭 */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === key
                  ? 'bg-white text-red-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'ncr'        && <NcrTab />}
        {activeTab === 'quarantine' && <QuarantineTab />}
      </div>
    </AppLayout>
  )
}
