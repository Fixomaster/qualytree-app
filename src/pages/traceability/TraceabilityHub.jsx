// src/pages/traceability/TraceabilityHub.jsx
// ISO 13485 §7.5.9 제품 추적성 관리 — LOT 배포 이력 · 리콜 시뮬레이션 · 고객 추적
import React, { useState, useMemo } from 'react'
import {
  Plus, Search, Trash2, AlertTriangle, ChevronDown,
  ChevronUp, X, Package, Users, RotateCcw, Edit3,
  MapPin, Hash, Calendar, TrendingUp, List,
  GitBranch,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'

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

  // 리콜 시뮬레이션 — 해당 LOT 배포 내역 조회
  const recallHits = useMemo(() => {
    if (!recallLot.trim()) return []
    const q = recallLot.trim().toLowerCase()
    return records.filter(r =>
      r.lotNo?.toLowerCase().includes(q) && r.distType !== 'return'
    )
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
        {tab === 'lot' && <LotTraceView records={records} products={products} lots={lots} />}

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

// ── LOT 추적 탭 ───────────────────────────────────────────────
function LotTraceView({ records, products, lots }) {
  const [selLot, setSelLot] = useState('')
  const [selProd, setSelProd] = useState('')

  const lotRecords = useMemo(() => {
    let list = records
    if (selLot)  list = list.filter(r => r.lotNo === selLot)
    if (selProd) list = list.filter(r => r.productName === selProd)
    return list.sort((a, b) => (b.distDate || '').localeCompare(a.distDate || ''))
  }, [records, selLot, selProd])

  const lotCustomers = [...new Set(lotRecords.map(r => r.customerName).filter(Boolean))]
  const lotQty = lotRecords.filter(r => r.distType !== 'return').reduce((s, r) => s + (parseInt(r.qty) || 0), 0)

  return (
    <div>
      <div className="flex gap-3 mb-5 flex-wrap">
        <div>
          <label className="block text-[11px] font-bold mb-1" style={{ color: 'var(--ink-faint)' }}>LOT 번호 선택</label>
          <select value={selLot} onChange={e => setSelLot(e.target.value)} style={{ ...IPS, minWidth: 200 }}>
            <option value="">전체 LOT</option>
            {lots.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold mb-1" style={{ color: 'var(--ink-faint)' }}>제품 선택</label>
          <select value={selProd} onChange={e => setSelProd(e.target.value)} style={{ ...IPS, minWidth: 200 }}>
            <option value="">전체 제품</option>
            {products.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* 요약 카드 */}
      {(selLot || selProd) && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="p-4 rounded-2xl text-center" style={{ background: '#DBEAFE', border: '1px solid #BFDBFE' }}>
            <div className="text-[26px] font-bold" style={{ color: '#2563EB' }}>{lotRecords.length}</div>
            <div className="text-[11px]" style={{ color: '#1D4ED8' }}>배포 기록</div>
          </div>
          <div className="p-4 rounded-2xl text-center" style={{ background: '#D1FAE5', border: '1px solid #A7F3D0' }}>
            <div className="text-[26px] font-bold" style={{ color: '#059669' }}>{lotCustomers.length}</div>
            <div className="text-[11px]" style={{ color: '#047857' }}>고객 수</div>
          </div>
          <div className="p-4 rounded-2xl text-center" style={{ background: '#EDE9FE', border: '1px solid #C4B5FD' }}>
            <div className="text-[26px] font-bold" style={{ color: '#7C3AED' }}>{lotQty}</div>
            <div className="text-[11px]" style={{ color: '#6D28D9' }}>총 수량</div>
          </div>
        </div>
      )}

      {/* 고객 목록 */}
      {lotCustomers.length > 0 && (
        <div className="mb-5">
          <div className="text-[13px] font-bold mb-2" style={{ color: 'var(--ink)' }}>배포 고객 목록</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {lotCustomers.map(cust => {
              const custRecs = lotRecords.filter(r => r.customerName === cust)
              const qty = custRecs.filter(r => r.distType !== 'return').reduce((s, r) => s + (parseInt(r.qty) || 0), 0)
              return (
                <div key={cust} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#DBEAFE' }}>
                    <Users size={14} style={{ color: '#2563EB' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--ink)' }}>{cust}</div>
                    <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>
                      {custRecs.map(r => r.lotNo).join(', ')} · {qty}개
                    </div>
                  </div>
                  <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{custRecs[0]?.customerAddress || '-'}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 상세 기록 */}
      <div className="text-[13px] font-bold mb-2" style={{ color: 'var(--ink)' }}>상세 배포 기록</div>
      {lotRecords.length === 0 ? (
        <div className="text-center py-10" style={{ color: 'var(--ink-faint)' }}>배포 기록을 추가하면 여기에 표시됩니다</div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="grid gap-3 px-4 py-2.5 text-[11px] font-semibold" style={{ gridTemplateColumns: '100px 1fr 120px 80px 90px 80px', color: 'var(--ink-faint)', borderBottom: '1px solid var(--line)', background: 'var(--bg-soft)' }}>
            <span>배포 ID</span><span>제품명</span><span>고객명</span><span>LOT</span><span>배포일</span><span>수량</span>
          </div>
          {lotRecords.map((r, i) => {
            const dt = DIST_TYPES.find(t => t.value === r.distType) || DIST_TYPES[0]
            return (
              <div key={r.id} className="grid gap-3 px-4 py-3 items-center" style={{ gridTemplateColumns: '100px 1fr 120px 80px 90px 80px', borderBottom: i < lotRecords.length - 1 ? '1px solid var(--line)' : 'none' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-soft)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <span className="font-mono text-[10px]" style={{ color: 'var(--ink-faint)' }}>{r.id}</span>
                <div>
                  <div className="text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>{r.productName}</div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${dt.color}15`, color: dt.color }}>{dt.label}</span>
                </div>
                <span className="text-[12px] truncate" style={{ color: 'var(--ink)' }}>{r.customerName}</span>
                <span className="font-mono text-[11px]" style={{ color: '#7C3AED' }}>{r.lotNo}</span>
                <span className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>{r.distDate}</span>
                <span className="text-[12px] font-bold" style={{ color: 'var(--ink)' }}>{r.qty || '-'}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── 리콜 시뮬레이션 탭 ───────────────────────────────────────
function RecallView({ records, lots, recallLot, setRecallLot, recallHits, recallQty, recallForm, rfld, recallActive, setRecallActive }) {
  const rcInfo = RECALL_CLASSES.find(r => r.value === recallForm.recallClass) || RECALL_CLASSES[1]

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

              {/* 출력 버튼 */}
              <button
                className="mt-4 w-full py-3 rounded-xl text-[13px] font-bold"
                style={{ background: '#DC2626', color: 'white', border: 'none', cursor: 'pointer' }}
                onClick={() => {
                  const lines = [...new Set(recallHits.map(r => r.customerName))].map(cust => {
                    const cr = recallHits.filter(r => r.customerName === cust)
                    return `${cust} | 연락처: ${cr[0]?.customerContact || '-'} | 수량: ${cr.reduce((s,r)=>s+(parseInt(r.qty)||0),0)}`
                  }).join('\n')
                  alert(`=== 리콜 통보 대상 목록 ===\nLOT: ${recallLot}\n등급: Class ${recallForm.recallClass}\n\n${lines}\n\n총 ${[...new Set(recallHits.map(r=>r.customerName))].length}개 고객, ${recallQty}개 회수 대상`)
                }}
              >
                📋 리콜 통보 목록 출력 (프린트)
              </button>
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
