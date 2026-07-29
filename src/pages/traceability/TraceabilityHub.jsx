// src/pages/traceability/TraceabilityHub.jsx
// ISO 13485 §7.5.9 제품 추적성 관리 — LOT 배포 이력 · 리콜 시뮬레이션 · 고객 추적
import React, { useState, useMemo, useEffect } from 'react'
import {
  Plus, Search, Trash2, AlertTriangle, ChevronDown,
  ChevronUp, X, Package, Users, RotateCcw, Edit3,
  MapPin, Hash, Calendar, TrendingUp, List,
  GitBranch, ChevronRight, ArrowUpDown, Boxes, Factory, Truck, Download, Printer,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'
import { buildChainRows, searchChainRows, pivotChainRows, sortChainRows, SORTS } from '../../lib/traceability'
import { printRecallNotice } from '../../lib/pdfPrint'
import { downloadRecallCustomerListPdf } from '../../lib/recallPdf'

// ── localStorage ──────────────────────────────────────────────
const LS_KEY = 'qualytree.distributions'
function lsR() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] } }
function lsW(d) { localStorage.setItem(LS_KEY, JSON.stringify(d)) }
function genId() { return `DST-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }

// ── 상수 ─────────────────────────────────────────────────────
const DIST_TYPES = [
  { value: 'sale',     label: '판매',    color: '#2563EB' },
  { value: 'install',  label: '설치',    color: '#059669' },
  { value: 'loan',     label: '대여',    color: '#D97706' },
  { value: 'demo',     label: '데모',    color: '#7C3AED' },
  { value: 'service',  label: '서비스',  color: '#0891B2' },
  { value: 'return',   label: '반품',    color: '#DC2626' },
]

const RECALL_CLASSES = [
  { value: 'I',   label: 'Class I — 즉시 리콜',   color: '#DC2626', bg: '#FEE2E2', desc: '건강에 심각한 위해 또는 사망 가능성' },
  { value: 'II',  label: 'Class II — 신속 리콜',  color: '#D97706', bg: '#FEF3C7', desc: '일시적 또는 가역적 건강 위해' },
  { value: 'III', label: 'Class III — 일반 리콜',  color: '#6B7280', bg: '#F3F4F6', desc: '건강 위해 가능성 낮음' },
]

const emptyForm = () => ({
  productName: '', productCode: '', lotNo: '', serialNos: '',
  qty: '', distType: 'sale', distDate: new Date().toISOString().slice(0, 10),
  customerName: '', customerCode: '', customerContact: '', customerAddress: '',
  woId: '', notes: '',
})

const emptyRecall = () => ({
  lotNo: '', recallClass: 'II', reason: '', affectedQty: '',
  initiatedDate: new Date().toISOString().slice(0, 10),
  status: 'planning', notes: '',
})

// ── 메인 ─────────────────────────────────────────────────────
export default function TraceabilityHub() {
  const user = auth.current()
  const [records, setRecords] = useState(() => lsR())
  const [tab, setTab]         = useState('dist')
  const [search, setSearch]   = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState(emptyForm())
  const [editId, setEditId]       = useState(null)
  const [expanded, setExpanded]   = useState(null)
  // 리콜 시뮬레이션
  const [recallLot, setRecallLot]     = useState('')
  const [recallForm, setRecallForm]   = useState(emptyRecall())
  const [recallActive, setRecallActive] = useState(false)

  const save = d => { setRecords(d); lsW(d) }

  const openNew  = () => { setForm(emptyForm()); setEditId(null); setShowForm(true) }
  const openEdit = r  => { setForm({ ...r }); setEditId(r.id); setShowForm(true) }
  const submit   = () => {
    if (!form.productName || !form.lotNo || !form.customerName)
      return alert('제품명, LOT 번호, 고객명은 필수입니다.')
    const now = new Date().toISOString()
    if (editId) save(records.map(r => r.id === editId ? { ...form, id: editId } : r))
    else save([{ ...form, id: genId(), createdAt: now, createdBy: user?.name || '-' }, ...records])
    setShowForm(false)
  }
  const remove = id => { if (!confirm('삭제?')) return; save(records.filter(r => r.id !== id)) }
  const fld = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const rfld = (k, v) => setRecallForm(f => ({ ...f, [k]: v }))

  // 리콜 시뮬레이션 — 해당 LOT의 영향을 받는 고객을 조회한다.
  // (1) 수동으로 기록된 배포 이력(records)과 (2) 원자재→WO→완제품→납품 전체 계보(traceability)를
  // 모두 조회해 병합한다 — 완제품 LOT뿐 아니라 원자재 LOT으로 리콜을 시작해도(원료 오염 등) 실제로
  // 그 LOT이 사용된 작업지시를 거쳐 도달한 고객까지 추적된다.
  const recallHits = useMemo(() => {
    if (!recallLot.trim()) return []
    const q = recallLot.trim().toLowerCase()
    const distHits = records
      .filter(r => r.lotNo?.toLowerCase().includes(q) && r.distType !== 'return')
      .map(r => ({ ...r }))
    const chainHits = buildChainRows()
      .filter(r => r.customer && ((r.finLot && r.finLot.toLowerCase().includes(q)) || (r.materialLot && r.materialLot.toLowerCase().includes(q))))
      .map(r => ({
        id: r.deliveryId || r.distId || `${r.woId}-${r.customer}`,
        lotNo: r.finLot || r.materialLot,
        customerName: r.customer, customerContact: r.customerContact || '', customerAddress: r.customerAddress || '',
        qty: r.qty, distType: 'sale',
      }))
    const map = new Map()
    ;[...distHits, ...chainHits].forEach(h => {
      const key = `${h.customerName}::${h.lotNo}`
      const existing = map.get(key)
      if (!existing || (!existing.customerContact && h.customerContact)) map.set(key, h)
    })
    return [...map.values()]
  }, [recallLot, records])

  const recallQty = recallHits.reduce((sum, r) => sum + (parseInt(r.qty) || 0), 0)

  // 필터링
  const filtered = useMemo(() => {
    let list = [...records]
    if (typeFilter !== 'all') list = list.filter(r => r.distType === typeFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r => (r.id + r.productName + r.lotNo + r.customerName + r.serialNos).toLowerCase().includes(q))
    }
    return list.sort((a, b) => (b.distDate || '').localeCompare(a.distDate || ''))
  }, [records, search, typeFilter])

  // 집계
  const lots = [...new Set(records.map(r => r.lotNo).filter(Boolean))]
  const customers = [...new Set(records.map(r => r.customerName).filter(Boolean))]
  const products  = [...new Set(records.map(r => r.productName).filter(Boolean))]
  const totalQty  = records.filter(r => r.distType !== 'return').reduce((s, r) => s + (parseInt(r.qty) || 0), 0)
  const thisMonth = records.filter(r => r.distDate?.startsWith(new Date().toISOString().slice(0, 7))).length

  const TABS = [
    { key: 'dist',   label: '배포 이력',      icon: List },
    { key: 'lot',    label: 'LOT 추적',        icon: Hash },
    { key: 'recall', label: '리콜 시뮬레이션', icon: RotateCcw },
  ]

  return (
    <AppLayout user={user} title="제품 추적성" subtitle="ISO 13485 §7.5.9 · LOT 배포 이력 · 고객 추적 · 리콜 시뮬레이션">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto">

        <HubBanner
          title="제품 추적성 관리"
          subtitle="ISO 13485 §7.5.9 · 제품·로트 추적성 · 공급망 기록 유지 · 리콜 대응"
          icon={GitBranch}
          color="#8B5CF6"
          quickActions={[{ label: '추적 기록 추가', icon: Plus, onClick: openNew, primary: true }]}
          workflow={['원자재 식별', '제조 이력', '공정 기록', '최종품 식별', '납품 추적', '리콜 대응']}
        />

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: '총 배포 기록', count: records.length, color: '#6B7280' },
            { label: '고객 수',       count: customers.length, color: '#2563EB' },
            { label: 'LOT 종류',      count: lots.length,      color: '#8B5CF6' },
            { label: '총 배포 수량',  count: totalQty,         color: '#059669' },
            { label: '이번 달',       count: thisMonth,        color: '#D97706' },
          ].map(s => (
            <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="text-[22px] font-bold" style={{ color: s.color }}>{s.count}</div>
              <div className="text-[10.5px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: 'var(--bg-soft)', width: 'fit-content' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition"
              style={{ background: tab === t.key ? 'var(--bg-card)' : 'transparent', color: tab === t.key ? 'var(--ink)' : 'var(--ink-faint)', border: 'none', cursor: 'pointer', boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
              <t.icon size={14} />{t.label}
            </button>
          ))}
        </div>

        {/* ── 배포 이력 탭 ── */}
        {tab === 'dist' && (
          <>
            <div className="flex gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-[180px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                <Search size={14} style={{ color: 'var(--ink-faint)' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="제품명 · LOT · 고객명 · 시리얼 검색..." className="flex-1 text-[13px] outline-none" style={{ background: 'none', border: 'none', color: 'var(--ink)' }} />
              </div>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 rounded-xl text-[13px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
                <option value="all">전체 유형</option>
                {DIST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <button onClick={openNew} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold" style={{ background: '#2563EB', color: 'white', border: 'none', cursor: 'pointer' }}>
                <Plus size={14} /> 배포 기록 추가
              </button>
            </div>

            {filtered.length === 0
              ? <DistEmpty onAdd={openNew} />
              : <div className="space-y-2">
                  {filtered.map(r => (
                    <DistRow key={r.id} record={r}
                      expanded={expanded === r.id}
                      onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
                      onEdit={() => openEdit(r)}
                      onDelete={() => remove(r.id)}
                    />
                  ))}
                </div>
            }
          </>
        )}

        {/* ── LOT 추적 탭 ── */}
        {tab === 'lot' && <ChainTraceView />}

        {/* ── 리콜 시뮬레이션 탭 ── */}
        {tab === 'recall' && (
          <RecallView
            records={records}
            lots={lots}
            recallLot={recallLot}
            setRecallLot={setRecallLot}
            recallHits={recallHits}
            recallQty={recallQty}
            recallForm={recallForm}
            rfld={rfld}
            recallActive={recallActive}
            setRecallActive={setRecallActive}
          />
        )}

      </div>

      {showForm && <DistForm form={form} fld={fld} editId={editId} lots={lots} products={products} onSubmit={submit} onClose={() => setShowForm(false)} />}
    </AppLayout>
  )
}

// ── 배포 기록 행 ──────────────────────────────────────────────
function DistRow({ record: r, expanded, onToggle, onEdit, onDelete }) {
  const dt = DIST_TYPES.find(t => t.value === r.distType) || DIST_TYPES[0]

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={onToggle} style={{ borderBottom: expanded ? '1px solid var(--line)' : 'none' }}>
        {/* 유형 배지 */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${dt.color}15` }}>
          <Package size={16} style={{ color: dt.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px]" style={{ color: 'var(--ink-faint)' }}>{r.id}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: `${dt.color}15`, color: dt.color }}>{dt.label}</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#8B5CF615', color: '#7C3AED' }}>LOT: {r.lotNo}</span>
          </div>
          <div className="text-[14px] font-semibold mt-0.5 truncate" style={{ color: 'var(--ink)' }}>
            {r.productName} <span className="text-[12px] font-normal" style={{ color: 'var(--ink-faint)' }}>→ {r.customerName}</span>
          </div>
          <div className="text-[12px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
            {r.distDate} · 수량 {r.qty || '-'} · {r.customerAddress || '-'}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={e => { e.stopPropagation(); onEdit() }} className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)', border: 'none', cursor: 'pointer' }}><Edit3 size={13} /></button>
          <button onClick={e => { e.stopPropagation(); onDelete() }} className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', cursor: 'pointer' }}><Trash2 size={13} /></button>
          {expanded ? <ChevronUp size={16} style={{ color: 'var(--ink-faint)' }} /> : <ChevronDown size={16} style={{ color: 'var(--ink-faint)' }} />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <SL>제품 정보</SL>
            <IR k="제품명"     v={r.productName} />
            <IR k="제품 코드"  v={r.productCode} />
            <IR k="LOT 번호"   v={r.lotNo} />
            <IR k="시리얼 번호" v={r.serialNos} />
            <IR k="수량"       v={r.qty} />
          </div>
          <div>
            <SL>고객 정보</SL>
            <IR k="고객명"     v={r.customerName} />
            <IR k="고객 코드"  v={r.customerCode} />
            <IR k="연락처"     v={r.customerContact} />
            <IR k="주소"       v={r.customerAddress} />
          </div>
          <div>
            <SL>배포 정보</SL>
            <IR k="배포 유형"  v={DIST_TYPES.find(t => t.value === r.distType)?.label} />
            <IR k="배포일"     v={r.distDate} />
            <IR k="작업지시"   v={r.woId || '없음'} />
            <IR k="등록자"     v={r.createdBy} />
            {r.notes && <><SL>비고</SL><div className="text-[12px] p-2 rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink)' }}>{r.notes}</div></>}
          </div>
        </div>
      )}
    </div>
  )
}

function SL({ children }) { return <div className="text-[10px] font-bold mb-1 mt-2" style={{ color: 'var(--ink-faint)' }}>{children}</div> }
function IR({ k, v }) {
  return (
    <div className="flex gap-2 mb-0.5">
      <span className="text-[10.5px] w-18 flex-shrink-0" style={{ color: 'var(--ink-faint)', minWidth: 64 }}>{k}</span>
      <span className="text-[12px]" style={{ color: 'var(--ink)' }}>{v || '-'}</span>
    </div>
  )
}

// ── LOT 추적 탭 (원자재 → WO → 완제품 LOT → 납품/배포 → 고객, 양방향 연동) ─────
const CHAIN_FIELD_LABEL = {
  materialLot: '원자재 LOT', woId: '작업지시(WO)', finLot: '완제품 LOT',
  so: '수주(SO)', customer: '고객', deliveryId: '납품', distId: '배포기록',
}
function Chip({ value, display, color, onClick, mono = true }) {
  if (!value) return <span className="text-[11px] px-2" style={{ color: 'var(--ink-faint)' }}>-</span>
  return (
    <button onClick={onClick} className={`text-[11px] px-2 py-1 rounded font-medium hover:opacity-80 ${mono ? 'font-mono' : ''}`}
      style={{ background: `${color}18`, color, border: 'none', cursor: 'pointer' }}>
      {display || value}
    </button>
  )
}
function ChainRowCard({ row: r, onPivot }) {
  return (
    <div className="p-3 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
      <div className="flex items-center gap-1.5 flex-wrap">
        <div className="flex flex-col items-start">
          <span className="text-[9.5px]" style={{ color: 'var(--ink-faint)' }}>{r.materialName || '원자재'}</span>
          <Chip value={r.materialLot} color="#7C3AED" onClick={() => onPivot('materialLot', r.materialLot, `원자재 LOT: ${r.materialLot}`)} />
        </div>
        <ChevronRight size={13} style={{ color: 'var(--ink-faint)' }} />
        <div className="flex flex-col items-start">
          <span className="text-[9.5px]" style={{ color: 'var(--ink-faint)' }}>작업지시</span>
          <Chip value={r.woId} color="#2563EB" onClick={() => onPivot('woId', r.woId, `작업지시: ${r.woId}`)} />
        </div>
        <ChevronRight size={13} style={{ color: 'var(--ink-faint)' }} />
        <div className="flex flex-col items-start">
          <span className="text-[9.5px]" style={{ color: 'var(--ink-faint)' }}>{r.finProduct || '완제품'}</span>
          <Chip value={r.finLot} color="#059669" onClick={() => onPivot('finLot', r.finLot, `완제품 LOT: ${r.finLot}`)} />
        </div>
        <ChevronRight size={13} style={{ color: 'var(--ink-faint)' }} />
        <div className="flex flex-col items-start">
          <span className="text-[9.5px]" style={{ color: 'var(--ink-faint)' }}>수주</span>
          <Chip value={r.so} color="#D97706" onClick={() => onPivot('so', r.so, `수주: ${r.so}`)} />
        </div>
        <ChevronRight size={13} style={{ color: 'var(--ink-faint)' }} />
        <div className="flex flex-col items-start">
          <span className="text-[9.5px]" style={{ color: 'var(--ink-faint)' }}>{r.deliveryId ? '납품' : r.distId ? '배포' : '고객'}</span>
          <Chip value={r.customer} display={r.customer} color="#DC2626" mono={false} onClick={() => onPivot('customer', r.customer, `고객: ${r.customer}`)} />
        </div>
      </div>
      <div className="flex items-center gap-3 mt-2 text-[11px]" style={{ color: 'var(--ink-faint)' }}>
        {r.deliveryId && <span>납품번호: <span className="font-mono" style={{ color: 'var(--ink-mute)' }}>{r.deliveryId}</span></span>}
        {r.distId && <span>배포기록: <span className="font-mono" style={{ color: 'var(--ink-mute)' }}>{r.distId}</span></span>}
        {r.qty && <span>수량: {r.qty}</span>}
        {r.date && <span>{r.date}</span>}
        {r.materialVendor && <span>공급업체: {r.materialVendor}</span>}
        {r.customerContact && <span>연락처: {r.customerContact}</span>}
        {r.customerAddress && <span>{r.customerAddress}</span>}
      </div>
    </div>
  )
}
function SummaryChip({ label, count, color }) {
  return (
    <div className="p-3 rounded-xl text-center" style={{ background: `${color}12`, border: `1px solid ${color}30` }}>
      <div className="text-[20px] font-bold" style={{ color }}>{count}</div>
      <div className="text-[10.5px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{label}</div>
    </div>
  )
}
function ChainTraceView() {
  const [rows] = useState(() => buildChainRows())
  const [query, setQuery] = useState('')
  const [pivot, setPivot] = useState(null)
  const [sortKey, setSortKey] = useState('date')
  const [sortDir, setSortDir] = useState('desc')

  const filtered = useMemo(() => {
    let list = pivot ? pivotChainRows(rows, pivot.field, pivot.value) : rows
    list = searchChainRows(list, query)
    return sortChainRows(list, sortKey, sortDir)
  }, [rows, pivot, query, sortKey, sortDir])

  const onPivot = (field, value, label) => { if (!value) return; setPivot({ field, value, label }); setQuery('') }

  const summary = useMemo(() => {
    const u = (k) => new Set(filtered.map((r) => r[k]).filter(Boolean)).size
    return { materials: u('materialLot'), wos: u('woId'), finLots: u('finLot'), customers: u('customer') }
  }, [filtered])

  return (
    <div>
      <div className="p-4 rounded-2xl mb-5" style={{ background: '#EDE9FE', border: '1px solid #DDD6FE' }}>
        <div className="text-[13px] font-bold mb-1" style={{ color: '#5B21B6' }}>원자재 → 고객 전체 계보 추적</div>
        <div className="text-[12px]" style={{ color: '#5B21B6', lineHeight: 1.6 }}>
          원자재 LOT을 선택하면 어떤 작업지시로 어떤 완제품이 만들어져 누구에게 갔는지, 반대로 고객을 선택하면 그 고객이 사용 중인 제품이 어떤 원자재 LOT으로 만들어졌는지 추적됩니다.
          체인의 어떤 항목(LOT·WO·수주·고객 등)을 클릭해도 연결된 기록으로 바로 연동됩니다.
        </div>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-[220px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <Search size={14} style={{ color: 'var(--ink-faint)' }} />
          <input value={query} onChange={(e) => { setQuery(e.target.value); if (pivot) setPivot(null) }}
            placeholder="원자재명·LOT·WO번호·SO번호·완제품LOT·납품번호·고객명 등 무엇이든 검색..."
            className="flex-1 text-[13px] outline-none" style={{ background: 'none', border: 'none', color: 'var(--ink)' }} />
        </div>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} style={IPS}>
          {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink-mute)', cursor: 'pointer' }}>
          <ArrowUpDown size={13} />{sortDir === 'asc' ? '오름차순' : '내림차순'}
        </button>
      </div>

      {pivot && (
        <div className="flex items-center justify-between gap-2 mb-4 p-3 rounded-xl flex-wrap" style={{ background: '#DBEAFE', border: '1px solid #BFDBFE' }}>
          <span className="text-[12.5px] font-semibold" style={{ color: '#1D4ED8' }}>
            <GitBranch size={13} className="inline mr-1.5" style={{ verticalAlign: -2 }} />{pivot.label} 기준 연결된 추적 결과 {filtered.length}건
          </span>
          <button onClick={() => setPivot(null)} className="text-[11.5px] px-3 py-1 rounded-lg" style={{ background: 'white', color: '#1D4ED8', border: '1px solid #93C5FD', cursor: 'pointer' }}>전체 보기</button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryChip label="원자재 LOT" count={summary.materials} color="#7C3AED" />
        <SummaryChip label="작업지시(WO)" count={summary.wos} color="#2563EB" />
        <SummaryChip label="완제품 LOT" count={summary.finLots} color="#059669" />
        <SummaryChip label="고객" count={summary.customers} color="#DC2626" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--ink-faint)' }}>
          <GitBranch size={40} strokeWidth={1.2} className="mx-auto mb-3 opacity-30" />
          <div>검색 결과가 없습니다. 원자재 입고, 작업지시 LOT, 납품 기록을 등록하면 여기에 표시됩니다.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r, i) => <ChainRowCard key={i} row={r} onPivot={onPivot} />)}
        </div>
      )}
    </div>
  )
}

// ── 리콜 시뮬레이션 탭 ───────────────────────────────────────
function RecallView({ records, lots, recallLot, setRecallLot, recallHits, recallQty, recallForm, rfld, recallActive, setRecallActive }) {
  const rcInfo = RECALL_CLASSES.find(r => r.value === recallForm.recallClass) || RECALL_CLASSES[1]
  const [pdfBusy, setPdfBusy] = useState(false)

  return (
    <div>
      {/* 상단 안내 */}
      <div className="p-4 rounded-2xl mb-5" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
        <div className="text-[13px] font-bold mb-1" style={{ color: '#92400E' }}>⚠ 리콜 시뮬레이션 사용 안내</div>
        <div className="text-[12px]" style={{ color: '#78350F', lineHeight: 1.6 }}>
          특정 LOT의 제품을 배포 받은 고객 목록을 즉시 조회합니다. 실제 리콜 시 이 목록을 기반으로 고객에게 통보하고 규제당국에 보고합니다.
        </div>
      </div>

      {/* LOT 입력 */}
      <div className="p-5 rounded-2xl mb-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="text-[14px] font-bold mb-3" style={{ color: 'var(--ink)' }}>Step 1 — 리콜 대상 LOT 입력</div>
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] px-3 py-2 rounded-xl" style={{ background: 'var(--bg-soft)', border: '2px solid #DC2626' }}>
            <Hash size={14} style={{ color: '#DC2626' }} />
            <input
              value={recallLot}
              onChange={e => setRecallLot(e.target.value)}
              placeholder="LOT 번호 입력 또는 선택..."
              className="flex-1 text-[13px] outline-none font-mono"
              style={{ background: 'none', border: 'none', color: 'var(--ink)' }}
            />
          </div>
          <select value={recallLot} onChange={e => setRecallLot(e.target.value)} style={{ ...IPS, minWidth: 180 }}>
            <option value="">등록된 LOT 선택</option>
            {lots.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* 영향 분석 결과 */}
      {recallLot && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="p-4 rounded-2xl text-center" style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}>
              <div className="text-[28px] font-bold" style={{ color: '#DC2626' }}>{recallHits.length}</div>
              <div className="text-[11px] mt-0.5" style={{ color: '#991B1B' }}>영향 받는 배포 건수</div>
            </div>
            <div className="p-4 rounded-2xl text-center" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
              <div className="text-[28px] font-bold" style={{ color: '#D97706' }}>
                {[...new Set(recallHits.map(r => r.customerName))].length}
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: '#92400E' }}>통보 대상 고객 수</div>
            </div>
            <div className="p-4 rounded-2xl text-center" style={{ background: '#EDE9FE', border: '1px solid #C4B5FD' }}>
              <div className="text-[28px] font-bold" style={{ color: '#7C3AED' }}>{recallQty}</div>
              <div className="text-[11px] mt-0.5" style={{ color: '#5B21B6' }}>영향 수량 (회수 대상)</div>
            </div>
          </div>

          {/* 리콜 등급 선택 */}
          <div className="p-5 rounded-2xl mb-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
            <div className="text-[14px] font-bold mb-3" style={{ color: 'var(--ink)' }}>Step 2 — 리콜 등급 및 사유</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              {RECALL_CLASSES.map(rc => (
                <button key={rc.value} type="button" onClick={() => rfld('recallClass', rc.value)}
                  className="p-3 rounded-xl text-left transition"
                  style={{ background: recallForm.recallClass === rc.value ? rc.bg : 'var(--bg-soft)', border: `2px solid ${recallForm.recallClass === rc.value ? rc.color : 'transparent'}`, cursor: 'pointer' }}>
                  <div className="text-[12px] font-bold" style={{ color: rc.color }}>{rc.label}</div>
                  <div className="text-[10.5px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{rc.desc}</div>
                </button>
              ))}
            </div>
            <div className="mb-3">
              <label className="block text-[11px] font-bold mb-1" style={{ color: 'var(--ink-faint)' }}>리콜 사유</label>
              <textarea value={recallForm.reason} onChange={e => rfld('reason', e.target.value)} rows={2} placeholder="리콜 원인 및 위해성..." style={{ ...IPS, resize: 'vertical', width: '100%' }} />
            </div>
          </div>

          {/* 통보 대상 고객 목록 */}
          {recallHits.length > 0 && (
            <div className="p-5 rounded-2xl mb-5" style={{ background: 'var(--bg-card)', border: '2px solid #DC2626' }}>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={16} style={{ color: '#DC2626' }} />
                <div className="text-[14px] font-bold" style={{ color: '#DC2626' }}>
                  Step 3 — 통보 대상 고객 목록 (LOT: {recallLot})
                </div>
              </div>
              <div className="space-y-2">
                {[...new Set(recallHits.map(r => r.customerName))].map(cust => {
                  const custRecs = recallHits.filter(r => r.customerName === cust)
                  const qty = custRecs.reduce((s, r) => s + (parseInt(r.qty) || 0), 0)
                  return (
                    <div key={cust} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#FEE2E2' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#DC2626' }}>
                        <Users size={14} style={{ color: 'white' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-bold" style={{ color: '#7F1D1D' }}>{cust}</div>
                        <div className="text-[11px]" style={{ color: '#991B1B' }}>
                          연락처: {custRecs[0]?.customerContact || '-'} &nbsp;|&nbsp; 배포 기록: {custRecs.length}건
                        </div>
                        {custRecs[0]?.customerAddress && (
                          <div className="text-[11px] flex items-center gap-1 mt-0.5" style={{ color: '#991B1B' }}>
                            <MapPin size={10} /> {custRecs[0].customerAddress}
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-[16px] font-bold" style={{ color: '#DC2626' }}>{qty}</div>
                        <div className="text-[10px]" style={{ color: '#991B1B' }}>회수 수량</div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* 출력 / PDF 다운로드 버튼 */}
              <div className="flex gap-2 mt-4">
                <button
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold"
                  style={{ background: '#DC2626', color: 'white', border: 'none', cursor: 'pointer' }}
                  onClick={() => printRecallNotice({ lot: recallLot, recallClass: recallForm.recallClass, reason: recallForm.reason, hits: recallHits })}
                >
                  <Printer size={15} /> 리콜 통보 목록 인쇄
                </button>
                <button
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold"
                  disabled={pdfBusy}
                  style={{ background: 'white', color: '#DC2626', border: '2px solid #DC2626', cursor: pdfBusy ? 'default' : 'pointer', opacity: pdfBusy ? 0.6 : 1 }}
                  onClick={async () => {
                    setPdfBusy(true)
                    try {
                      await downloadRecallCustomerListPdf({ lot: recallLot, recallClass: recallForm.recallClass, reason: recallForm.reason, hits: recallHits })
                    } catch (e) {
                      alert(e.message || 'PDF 생성에 실패했습니다.')
                    } finally {
                      setPdfBusy(false)
                    }
                  }}
                >
                  <Download size={15} /> {pdfBusy ? 'PDF 생성 중...' : '통보 고객목록 PDF 다운로드'}
                </button>
              </div>
            </div>
          )}

          {recallHits.length === 0 && (
            <div className="p-5 rounded-2xl text-center" style={{ background: '#D1FAE5', border: '1px solid #A7F3D0' }}>
              <div className="text-[14px] font-bold" style={{ color: '#059669' }}>✓ 해당 LOT 배포 기록 없음</div>
              <div className="text-[12px] mt-1" style={{ color: '#047857' }}>"{recallLot}" LOT의 배포 기록이 없습니다</div>
            </div>
          )}
        </>
      )}

      {!recallLot && (
        <div className="text-center py-16" style={{ color: 'var(--ink-faint)' }}>
          <RotateCcw size={40} strokeWidth={1.2} className="mx-auto mb-3 opacity-30" />
          <div>LOT 번호를 입력하면 영향 받는 고객과 수량을 즉시 파악할 수 있습니다</div>
        </div>
      )}
    </div>
  )
}

// ── 배포 기록 추가 폼 ─────────────────────────────────────────
function DistForm({ form, fld, editId, lots, products, onSubmit, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px', overflowY: 'auto' }} onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--line)', width: '100%', maxWidth: 680, boxShadow: '0 24px 64px rgba(0,0,0,0.3)', padding: 28 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="text-[16px] font-bold" style={{ color: 'var(--ink)' }}>{editId ? '배포 기록 수정' : '배포 기록 추가'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)' }}><X size={20} /></button>
        </div>

        <div className="space-y-3">
          <R2>
            <F l="제품명 *">
              <input value={form.productName} onChange={e => fld('productName', e.target.value)} placeholder="제품명" list="prod-list" style={IS} className="w-full" />
              <datalist id="prod-list">{products.map(p => <option key={p} value={p} />)}</datalist>
            </F>
            <F l="제품 코드"><input value={form.productCode} onChange={e => fld('productCode', e.target.value)} placeholder="예: MD-001" style={IS} className="w-full" /></F>
          </R2>
          <R2>
            <F l="LOT 번호 *">
              <input value={form.lotNo} onChange={e => fld('lotNo', e.target.value)} placeholder="예: LOT-2026-001" list="lot-list" style={IS} className="w-full" />
              <datalist id="lot-list">{lots.map(l => <option key={l} value={l} />)}</datalist>
            </F>
            <F l="시리얼 번호 (여러 개: 쉼표 구분)"><input value={form.serialNos} onChange={e => fld('serialNos', e.target.value)} placeholder="SN-001, SN-002..." style={IS} className="w-full" /></F>
          </R2>
          <R2>
            <F l="수량"><input value={form.qty} onChange={e => fld('qty', e.target.value)} placeholder="예: 10" style={IS} className="w-full" /></F>
            <F l="배포 유형">
              <select value={form.distType} onChange={e => fld('distType', e.target.value)} style={IS} className="w-full">
                {DIST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </F>
          </R2>
          <F l="배포일"><input type="date" value={form.distDate} onChange={e => fld('distDate', e.target.value)} style={IS} className="w-full" /></F>

          <div className="pt-2 pb-1" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="text-[12px] font-bold mb-2" style={{ color: 'var(--ink-soft)' }}>고객 정보</div>
          </div>
          <R2>
            <F l="고객명 *"><input value={form.customerName} onChange={e => fld('customerName', e.target.value)} placeholder="병원·기관·업체명" style={IS} className="w-full" /></F>
            <F l="고객 코드"><input value={form.customerCode} onChange={e => fld('customerCode', e.target.value)} placeholder="예: CUST-001" style={IS} className="w-full" /></F>
          </R2>
          <R2>
            <F l="연락처"><input value={form.customerContact} onChange={e => fld('customerContact', e.target.value)} placeholder="전화·이메일" style={IS} className="w-full" /></F>
            <F l="연결 작업지시(WO)"><input value={form.woId} onChange={e => fld('woId', e.target.value)} placeholder="예: WO-2026-00001" style={IS} className="w-full" /></F>
          </R2>
          <F l="주소"><input value={form.customerAddress} onChange={e => fld('customerAddress', e.target.value)} placeholder="서울시..." style={IS} className="w-full" /></F>
          <F l="비고"><textarea value={form.notes} onChange={e => fld('notes', e.target.value)} rows={2} style={{ ...IS, resize: 'vertical' }} className="w-full" /></F>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>취소</button>
          <button onClick={onSubmit} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: '#2563EB', color: 'white', border: 'none', cursor: 'pointer' }}>
            {editId ? '수정 저장' : '배포 기록 등록'}
          </button>
        </div>
      </div>
    </div>
  )
}

function R2({ children }) { return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div> }
function F({ l, children }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-faint)' }}>{l}</label>
      {children}
    </div>
  )
}
const IS = { border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--ink)', background: 'var(--bg-card)', outline: 'none' }
const IPS = { border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--ink)', background: 'var(--bg-card)', outline: 'none' }

function DistEmpty({ onAdd }) {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <Package size={48} strokeWidth={1} className="mx-auto mb-3 opacity-30" style={{ color: '#2563EB' }} />
      <div className="text-[16px] font-bold mb-1" style={{ color: 'var(--ink-soft)' }}>배포 기록 없음</div>
      <div className="text-[13px] mb-5" style={{ color: 'var(--ink-faint)' }}>제품 LOT별 배포 이력을 기록하면 리콜 시 즉시 대응할 수 있습니다</div>
      <button onClick={onAdd} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: '#2563EB', color: 'white', border: 'none', cursor: 'pointer' }}>
        <Plus size={15} /> 첫 번째 배포 기록 추가
      </button>
    </div>
  )
}
