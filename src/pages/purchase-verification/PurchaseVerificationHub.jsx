// src/pages/purchase-verification/PurchaseVerificationHub.jsx
// ISO 13485 §7.4.2 구매 정보 / §7.4.3 구매된 제품의 검증
import React, { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Plus, Save, Edit2, Trash2, FileText, CheckCircle2,
  XCircle, Clock, AlertTriangle, ShieldCheck, Package,
  BarChart2, Link2, ArrowRight, Truck,
  PackageCheck,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'

// ── 상수 ─────────────────────────────────────────────────────
const LS_PO  = 'qualytree.purchase_orders'
const LS_IQC = 'qualytree.iqc_records'

// 발주서 상태
const PO_STATUSES = {
  draft:     { label: '초안',     color: '#9CA3AF', bg: '#F3F4F6' },
  issued:    { label: '발행',     color: '#2563EB', bg: '#DBEAFE' },
  delivered: { label: '입고',     color: '#D97706', bg: '#FEF3C7' },
  verified:  { label: '검증 완료', color: '#059669', bg: '#D1FAE5' },
  rejected:  { label: '반품',     color: '#DC2626', bg: '#FEE2E2' },
  closed:    { label: '완료',     color: '#6B7280', bg: '#F3F4F6' },
}

// IQC 결과
const IQC_RESULTS = {
  pending:    { label: '검사 대기', color: '#9CA3AF', bg: '#F3F4F6', icon: Clock },
  pass:       { label: '합격',      color: '#059669', bg: '#D1FAE5', icon: CheckCircle2 },
  conditional:{ label: '조건부 합격', color: '#D97706', bg: '#FEF3C7', icon: AlertTriangle },
  fail:       { label: '불합격',    color: '#DC2626', bg: '#FEE2E2', icon: XCircle },
  waived:     { label: '면제',      color: '#7C3AED', bg: '#EDE9FE', icon: ShieldCheck },
}

// §7.4.2 구매 문서 필수 항목 유형
const ITEM_TYPES = [
  '원자재', '부품·반제품', '완제품', '포장재', '소모품', '설비·장비', '서비스', '소프트웨어', '기타'
]

// 검사 방법
const INSPECT_METHODS = [
  '전수 검사', '샘플링 검사 (AQL)', '성적서 확인', '공급업체 데이터 검토', '면제 (승인 공급업체)', '기타'
]

// AQL 레벨
const AQL_LEVELS = ['AQL 0.065', 'AQL 0.1', 'AQL 0.25', 'AQL 0.4', 'AQL 0.65', 'AQL 1.0', 'AQL 1.5', 'AQL 2.5', 'AQL 4.0', 'N/A']

function genPoId()  { return `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }
function genIqcId() { return `IQC-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }
function today()    { return new Date().toISOString().slice(0, 10) }

const EMPTY_PO = {
  poNo: '', supplierId: '', supplierName: '', supplierCode: '',
  itemName: '', itemCode: '', itemType: '원자재',
  spec: '',          // §7.4.2 핵심: 구매 사양
  reqQty: '', unit: '', unitPrice: '', currency: 'KRW',
  issueDate: today(), deliveryDate: '',
  qualityReqs: '',   // §7.4.2: 품질 요구사항 (인증, 검사, 기록 요구 등)
  regulatoryReqs: '', // 규제 요구사항
  inspectionReqs: '', // 검사·시험 요구사항
  approvalReqs: '',   // 승인 요구사항 (자재 승인 등)
  status: 'draft',
  linkedSupplierId: '', linkedChangeId: '', linkedRiskId: '',
  notes: '',
}

const EMPTY_IQC = {
  poId: '', poNo: '', supplierName: '', itemName: '', itemCode: '',
  lotNo: '', qty: '', receivedDate: today(),
  inspectMethod: '샘플링 검사 (AQL)', aqlLevel: 'AQL 1.0',
  sampleSize: '', defectsFound: '',
  cocReceived: false,   // CoC (성적서) 수령 여부
  cocNo: '',
  checkItems: [],       // [{name, spec, result:'pass'|'fail'|'na', actual, note}]
  result: 'pending',
  inspector: '', inspectDate: today(),
  disposalAction: '', // 불합격 시 처리 (반품/격리/특채)
  linkedProductIdId: '',
  notes: '',
}

// §7.4.3 기본 검사 항목 (품목 유형별)
const DEFAULT_CHECK_ITEMS = {
  '원자재':   ['외관 검사', '치수 측정', '재질 확인 (성적서)', '중량 확인', '포장 상태'],
  '부품·반제품': ['외관·치수', '기능 시험', '성적서 검토', '수량 확인', '마킹·라벨'],
  '완제품':   ['외관 검사', '기능 시험', '치수 측정', '성적서', '라벨·포장', '수량'],
  '포장재':   ['외관 검사', '치수 확인', '재질 확인', '인쇄 내용 확인'],
  '서비스':   ['작업 범위 이행 확인', '기록·보고서 검토', '장비 교정 이력'],
  '소프트웨어':['버전 확인', '라이선스 확인', '설치 시험'],
}

// ── 메인 ─────────────────────────────────────────────────────
// ── 입고·출고 기록 패널 (KGMP 유지 기록) ────────────────────────
const LS_INOUT = 'qualytree.receiving_shipping'
const EMPTY_INOUT = { type: 'in', date: '', itemName: '', qty: '', partner: '', note: '' }

function ReceivingShippingPanel({ canEdit }) {
  const [records, setRecords] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_INOUT) || '[]') } catch { return [] }
  })
  const [form, setForm] = useState(EMPTY_INOUT)
  const [showForm, setShowForm] = useState(false)

  function saveAll(list) { setRecords(list); localStorage.setItem(LS_INOUT, JSON.stringify(list)) }

  function submit() {
    if (!form.itemName.trim()) return alert('품목명을 입력하세요.')
    if (!form.date) return alert('일자를 입력하세요.')
    const rec = { id: 'IO-' + Date.now(), createdAt: new Date().toISOString().slice(0, 10), ...form }
    saveAll([rec, ...records])
    setForm(EMPTY_INOUT); setShowForm(false)
  }

  function remove(id) {
    if (!confirm('기록을 삭제하시겠습니까?')) return
    saveAll(records.filter((r) => r.id !== id))
  }

  const inCount = records.filter((r) => r.type === 'in').length
  const outCount = records.filter((r) => r.type === 'out').length

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="text-[12.5px]" style={{ color: 'var(--ink-mute)' }}>입고 <b style={{ color: 'var(--ink)' }}>{inCount}건</b> · 출고 <b style={{ color: 'var(--ink)' }}>{outCount}건</b></div>
        {canEdit && (
          <button onClick={() => { setForm(EMPTY_INOUT); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold ml-auto"
            style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
            <Plus size={14} /> 입고·출고 기록 추가
          </button>
        )}
      </div>

      {showForm && (
        <div className="rounded-2xl p-4 mb-4" style={{ border: '1px solid var(--line)', background: 'var(--bg-card)' }}>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <label className="text-[12px]" style={{ color: 'var(--ink-mute)' }}>
              구분
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="block w-full mt-1 px-3 py-1.5 rounded-lg text-[13px]" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                <option value="in">입고</option>
                <option value="out">출고</option>
              </select>
            </label>
            <label className="text-[12px]" style={{ color: 'var(--ink-mute)' }}>
              일자 *
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="block w-full mt-1 px-3 py-1.5 rounded-lg text-[13px]" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
            </label>
            <label className="text-[12px]" style={{ color: 'var(--ink-mute)' }}>
              품목명 *
              <input type="text" value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })}
                className="block w-full mt-1 px-3 py-1.5 rounded-lg text-[13px]" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
            </label>
            <label className="text-[12px]" style={{ color: 'var(--ink-mute)' }}>
              수량
              <input type="text" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })}
                className="block w-full mt-1 px-3 py-1.5 rounded-lg text-[13px]" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
            </label>
            <label className="text-[12px]" style={{ color: 'var(--ink-mute)' }}>
              거래처
              <input type="text" value={form.partner} onChange={(e) => setForm({ ...form, partner: e.target.value })}
                className="block w-full mt-1 px-3 py-1.5 rounded-lg text-[13px]" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
            </label>
            <label className="text-[12px] col-span-2" style={{ color: 'var(--ink-mute)' }}>
              비고
              <input type="text" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="block w-full mt-1 px-3 py-1.5 rounded-lg text-[13px]" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
            </label>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded-lg text-[12.5px]" style={{ border: '1px solid var(--line)', color: 'var(--ink-mute)', background: 'transparent' }}>취소</button>
            <button onClick={submit} className="px-3 py-1.5 rounded-lg text-[12.5px] font-bold" style={{ background: 'var(--moss)', color: '#fff', border: 'none' }}>저장</button>
          </div>
        </div>
      )}

      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
        <table className="w-full text-[12.5px]">
          <thead>
            <tr style={{ background: 'var(--bg-soft)' }}>
              {['구분', '일자', '품목명', '수량', '거래처', '비고', ''].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--ink-soft)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12" style={{ color: 'var(--ink-faint)' }}>등록된 입고·출고 기록이 없습니다.</td></tr>
            ) : records.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid var(--line)' }}>
                <td className="px-3 py-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold" style={{ background: r.type === 'in' ? '#D1FAE5' : '#DBEAFE', color: r.type === 'in' ? '#059669' : '#2563EB' }}>
                    {r.type === 'in' ? '입고' : '출고'}
                  </span>
                </td>
                <td className="px-3 py-2" style={{ color: 'var(--ink)' }}>{r.date}</td>
                <td className="px-3 py-2" style={{ color: 'var(--ink)' }}>{r.itemName}</td>
                <td className="px-3 py-2" style={{ color: 'var(--ink-mute)' }}>{r.qty}</td>
                <td className="px-3 py-2" style={{ color: 'var(--ink-mute)' }}>{r.partner}</td>
                <td className="px-3 py-2" style={{ color: 'var(--ink-mute)' }}>{r.note}</td>
                <td className="px-3 py-2 text-right">
                  {canEdit && (
                    <button onClick={() => remove(r.id)} style={{ color: 'var(--ink-faint)' }}><Trash2 size={13} /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function PurchaseVerificationHub() {
  const user = auth.current()
  const canEdit = user?.level >= 2
  const [searchParams] = useSearchParams()

  const [pos,  setPos]  = useState(() => { try { return JSON.parse(localStorage.getItem(LS_PO)  || '[]') } catch { return [] } })
  const [iqcs, setIqcs] = useState(() => { try { return JSON.parse(localStorage.getItem(LS_IQC) || '[]') } catch { return [] } })

  const [tab, setTab] = useState(() => searchParams.get('tab') || 'po')   // po | iqc | inout | analysis
  const [showPoForm,  setShowPoForm]  = useState(false)
  const [showIqcForm, setShowIqcForm] = useState(false)
  const [poForm,  setPoForm]  = useState(EMPTY_PO)
  const [iqcForm, setIqcForm] = useState(EMPTY_IQC)
  const [editPoId,  setEditPoId]  = useState(null)
  const [editIqcId, setEditIqcId] = useState(null)
  const [filterPoStatus, setFilterPoStatus] = useState('all')
  const [filterIqcResult, setFilterIqcResult] = useState('all')
  const [searchQ, setSearchQ] = useState('')

  function savePo(list)  { setPos(list);  localStorage.setItem(LS_PO,  JSON.stringify(list)) }
  function saveIqc(list) { setIqcs(list); localStorage.setItem(LS_IQC, JSON.stringify(list)) }

  function submitPo() {
    if (!poForm.itemName.trim()) return alert('품목명을 입력하세요.')
    if (!poForm.supplierName.trim()) return alert('공급업체명을 입력하세요.')
    const isEdit = !!editPoId
    const obj = isEdit
      ? pos.map(p => p.id === editPoId ? { ...p, ...poForm } : p)
      : [{ id: genPoId(), createdAt: today(), ...poForm, poNo: poForm.poNo || genPoId() }, ...pos]
    savePo(obj)
    setShowPoForm(false); setPoForm(EMPTY_PO); setEditPoId(null)
  }

  function submitIqc() {
    if (!iqcForm.itemName.trim()) return alert('품목명을 입력하세요.')
    const isEdit = !!editIqcId
    const obj = isEdit
      ? iqcs.map(i => i.id === editIqcId ? { ...i, ...iqcForm } : i)
      : [{ id: genIqcId(), createdAt: today(), ...iqcForm }, ...iqcs]
    saveIqc(obj)
    // PO 상태 자동 업데이트
    if (iqcForm.poId && !isEdit) {
      savePo(pos.map(p => p.id === iqcForm.poId
        ? { ...p, status: iqcForm.result === 'pass' || iqcForm.result === 'waived' ? 'verified' : iqcForm.result === 'fail' ? 'rejected' : 'delivered' }
        : p))
    }
    setShowIqcForm(false); setIqcForm(EMPTY_IQC); setEditIqcId(null)
  }

  function deletePo(id)  { if (confirm('발주서를 삭제하시겠습니까?')) savePo(pos.filter(p => p.id !== id)) }
  function deleteIqc(id) { if (confirm('IQC 기록을 삭제하시겠습니까?')) saveIqc(iqcs.filter(i => i.id !== id)) }

  function quickPoStatus(id, status) {
    savePo(pos.map(p => p.id === id ? { ...p, status } : p))
  }

  // PO에서 IQC 등록 바로가기
  function startIqcFromPo(po) {
    setIqcForm({
      ...EMPTY_IQC,
      poId: po.id, poNo: po.poNo || po.id,
      supplierName: po.supplierName, itemName: po.itemName, itemCode: po.itemCode,
      checkItems: (DEFAULT_CHECK_ITEMS[po.itemType] || DEFAULT_CHECK_ITEMS['원자재']).map(name => ({
        id: Date.now() + Math.random(), name, spec: '', result: 'na', actual: '', note: ''
      })),
    })
    setEditIqcId(null)
    setShowIqcForm(true)
    setTab('iqc')
  }

  const filteredPos = useMemo(() => pos.filter(p => {
    if (filterPoStatus !== 'all' && p.status !== filterPoStatus) return false
    if (searchQ) {
      const q = searchQ.toLowerCase()
      if (!((p.itemName || '').toLowerCase().includes(q) || (p.supplierName || '').toLowerCase().includes(q) || (p.poNo || '').toLowerCase().includes(q))) return false
    }
    return true
  }), [pos, filterPoStatus, searchQ])

  const filteredIqcs = useMemo(() => iqcs.filter(i => {
    if (filterIqcResult !== 'all' && i.result !== filterIqcResult) return false
    if (searchQ) {
      const q = searchQ.toLowerCase()
      if (!((i.itemName || '').toLowerCase().includes(q) || (i.supplierName || '').toLowerCase().includes(q) || (i.poNo || '').toLowerCase().includes(q))) return false
    }
    return true
  }), [iqcs, filterIqcResult, searchQ])

  const analysis = useMemo(() => {
    const byPoStatus = {}
    Object.keys(PO_STATUSES).forEach(k => { byPoStatus[k] = pos.filter(p => p.status === k).length })
    const byIqcResult = {}
    Object.keys(IQC_RESULTS).forEach(k => { byIqcResult[k] = iqcs.filter(i => i.result === k).length })
    const failRate = iqcs.length > 0 ? ((byIqcResult.fail || 0) / iqcs.length * 100).toFixed(1) : 0
    const pendingIqc = pos.filter(p => p.status === 'delivered' && !iqcs.some(i => i.poId === p.id))
    return { byPoStatus, byIqcResult, failRate, pendingIqc }
  }, [pos, iqcs])

  return (
    <AppLayout user={user} title="구매 정보 및 수입검사" subtitle="ISO 13485 §7.4.2 구매 정보 / §7.4.3 구매 제품 검증">
      <div className="px-6 lg:px-8 py-6 max-w-[1600px] mx-auto">

        {/* 입고 후 IQC 대기 경보 */}
        {analysis.pendingIqc.length > 0 && (
          <div className="mb-4 p-3 rounded-xl flex items-center gap-2 flex-wrap text-[12.5px]"
            style={{ background: '#FEF3C7', border: '1px solid #FCD34D', color: '#92400E' }}>
            <AlertTriangle size={14} />
            IQC 미실시 입고 품목 {analysis.pendingIqc.length}건:
            {analysis.pendingIqc.slice(0, 3).map(p => (
              <span key={p.id} className="font-bold">{p.itemName} ({p.supplierName})</span>
            ))}
          </div>
        )}

        {/* 탭 */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-soft)' }}>
          {[
            { key: 'po',       label: `발주서 (${pos.length})` },
            { key: 'iqc',      label: `수입검사 IQC (${iqcs.length})` },
            { key: 'inout',    label: '입고·출고 기록' },
            { key: 'analysis', label: '현황 분석' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="px-4 py-1.5 rounded-lg text-[13px] font-semibold transition"
              style={{
                background: tab === t.key ? 'var(--bg-card)' : 'transparent',
                color: tab === t.key ? 'var(--moss)' : 'var(--ink-soft)',
                boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                border: 'none', cursor: 'pointer',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* 검색 공통 */}
        <div className="flex flex-wrap gap-2 mb-4 items-center">
          <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder="품목명·공급업체·PO번호 검색..."
            className="px-3 py-1.5 rounded-xl text-[13px] flex-1 min-w-[160px]"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
          {tab === 'po' && (
            <select value={filterPoStatus} onChange={e => setFilterPoStatus(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-[13px]"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
              <option value="all">전체 상태</option>
              {Object.entries(PO_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          )}
          {tab === 'iqc' && (
            <select value={filterIqcResult} onChange={e => setFilterIqcResult(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-[13px]"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
              <option value="all">전체 결과</option>
              {Object.entries(IQC_RESULTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          )}
          {canEdit && tab === 'po' && (
            <button onClick={() => { setPoForm(EMPTY_PO); setEditPoId(null); setShowPoForm(true) }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
              style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
              <Plus size={14} /> 발주서 등록
            </button>
          )}
          {canEdit && tab === 'iqc' && (
            <button onClick={() => { setIqcForm(EMPTY_IQC); setEditIqcId(null); setShowIqcForm(true) }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
              style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
              <Plus size={14} /> IQC 등록
            </button>
          )}
        </div>

        {/* ── 발주서 탭 ── */}
        {tab === 'po' && (
          <div>
            {showPoForm && (
              <PoForm form={poForm} setForm={setPoForm} onSave={submitPo}
                onCancel={() => { setShowPoForm(false); setPoForm(EMPTY_PO); setEditPoId(null) }}
                isEdit={!!editPoId} />
            )}
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr style={{ background: 'var(--bg-soft)' }}>
                    {['PO 번호', '공급업체', '품목명', '품목 유형', '사양 등록', '상태', '납기일', ''].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--ink-soft)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPos.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-12" style={{ color: 'var(--ink-faint)' }}>등록된 발주서가 없습니다.</td></tr>
                  ) : filteredPos.map((po, idx) => {
                    const st = PO_STATUSES[po.status] || PO_STATUSES.draft
                    const hasSpec = !!(po.spec || po.qualityReqs || po.inspectionReqs)
                    return (
                      <tr key={po.id} style={{ background: idx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-soft)', borderTop: '1px solid var(--line)' }}>
                        <td className="px-3 py-2 font-mono text-[11.5px]" style={{ color: 'var(--ink-soft)' }}>{po.poNo || po.id}</td>
                        <td className="px-3 py-2">
                          <div className="font-semibold" style={{ color: 'var(--ink)' }}>{po.supplierName}</div>
                          {po.supplierCode && <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{po.supplierCode}</div>}
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-semibold" style={{ color: 'var(--ink)' }}>{po.itemName}</div>
                          <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{po.itemCode} {po.reqQty && `· ${po.reqQty}${po.unit}`}</div>
                        </td>
                        <td className="px-3 py-2 text-[11.5px]" style={{ color: 'var(--ink-soft)' }}>{po.itemType}</td>
                        <td className="px-3 py-2">
                          {hasSpec
                            ? <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#D1FAE5', color: '#059669' }}>등록됨</span>
                            : <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#FEE2E2', color: '#DC2626' }}>미등록</span>}
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                        </td>
                        <td className="px-3 py-2 text-[11.5px]" style={{ color: 'var(--ink-soft)' }}>{po.deliveryDate || '-'}</td>
                        <td className="px-3 py-2">
                          {canEdit && (
                            <div className="flex gap-1 flex-wrap">
                              {po.status === 'issued' && <QuickBtn label="입고" color="#D97706" onClick={() => quickPoStatus(po.id, 'delivered')} />}
                              {po.status === 'delivered' && (
                                <button onClick={() => startIqcFromPo(po)}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-bold"
                                  style={{ background: '#DBEAFE', border: '1px solid #2563EB40', color: '#2563EB', cursor: 'pointer' }}>
                                  <ShieldCheck size={10} /> IQC
                                </button>
                              )}
                              <button onClick={() => { setPoForm({ ...EMPTY_PO, ...po }); setEditPoId(po.id); setShowPoForm(true) }}
                                className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                                <Edit2 size={11} style={{ color: 'var(--ink-soft)' }} />
                              </button>
                              <button onClick={() => deletePo(po.id)}
                                className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', border: '1px solid #FECACA', cursor: 'pointer' }}>
                                <Trash2 size={11} style={{ color: '#DC2626' }} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── IQC 탭 ── */}
        {tab === 'iqc' && (
          <div>
            {showIqcForm && (
              <IqcForm form={iqcForm} setForm={setIqcForm} onSave={submitIqc}
                onCancel={() => { setShowIqcForm(false); setIqcForm(EMPTY_IQC); setEditIqcId(null) }}
                isEdit={!!editIqcId} pos={pos} />
            )}
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr style={{ background: 'var(--bg-soft)' }}>
                    {['IQC 번호', '공급업체', '품목명', '검사 방법', 'CoC', '검사 결과', '검사일', '검사자', ''].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--ink-soft)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredIqcs.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-12" style={{ color: 'var(--ink-faint)' }}>등록된 IQC 기록이 없습니다.</td></tr>
                  ) : filteredIqcs.map((iqc, idx) => {
                    const res = IQC_RESULTS[iqc.result] || IQC_RESULTS.pending
                    const Icon = res.icon
                    return (
                      <tr key={iqc.id} style={{ background: idx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-soft)', borderTop: '1px solid var(--line)' }}>
                        <td className="px-3 py-2 font-mono text-[11px]" style={{ color: 'var(--ink-faint)' }}>{iqc.id}</td>
                        <td className="px-3 py-2 font-semibold" style={{ color: 'var(--ink)' }}>{iqc.supplierName || '-'}</td>
                        <td className="px-3 py-2">
                          <div className="font-semibold" style={{ color: 'var(--ink)' }}>{iqc.itemName}</div>
                          {iqc.lotNo && <div className="text-[11px] font-mono" style={{ color: 'var(--ink-faint)' }}>LOT: {iqc.lotNo}</div>}
                        </td>
                        <td className="px-3 py-2 text-[11.5px]" style={{ color: 'var(--ink-soft)' }}>
                          <div>{iqc.inspectMethod}</div>
                          {iqc.aqlLevel && iqc.aqlLevel !== 'N/A' && <div className="text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>{iqc.aqlLevel}</div>}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {iqc.cocReceived
                            ? <span style={{ color: '#059669', fontSize: 14 }}>✓</span>
                            : <span style={{ color: '#DC2626', fontSize: 14 }}>✗</span>}
                        </td>
                        <td className="px-3 py-2">
                          <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full w-fit"
                            style={{ background: res.bg, color: res.color }}>
                            <Icon size={10} /> {res.label}
                          </span>
                          {iqc.result === 'fail' && iqc.disposalAction && (
                            <div className="text-[10.5px] mt-0.5" style={{ color: '#DC2626' }}>→ {iqc.disposalAction}</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-[11.5px]" style={{ color: 'var(--ink-soft)' }}>{iqc.inspectDate || '-'}</td>
                        <td className="px-3 py-2 text-[11.5px]" style={{ color: 'var(--ink-soft)' }}>{iqc.inspector || '-'}</td>
                        <td className="px-3 py-2">
                          {canEdit && (
                            <div className="flex gap-1">
                              <button onClick={() => { setIqcForm({ ...EMPTY_IQC, ...iqc }); setEditIqcId(iqc.id); setShowIqcForm(true) }}
                                className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                                <Edit2 size={11} style={{ color: 'var(--ink-soft)' }} />
                              </button>
                              <button onClick={() => deleteIqc(iqc.id)}
                                className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', border: '1px solid #FECACA', cursor: 'pointer' }}>
                                <Trash2 size={11} style={{ color: '#DC2626' }} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 현황 분석 탭 ── */}
        {tab === 'inout' && <ReceivingShippingPanel canEdit={canEdit} />}

        {tab === 'analysis' && <AnalysisView analysis={analysis} pos={pos} iqcs={iqcs} />}
      </div>
    </AppLayout>
  )
}

// ── 분석 뷰 ──────────────────────────────────────────────────
function AnalysisView({ analysis, pos, iqcs }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: '총 발주서', value: pos.length, color: '#2563EB', bg: '#DBEAFE' },
          { label: '수입검사 건수', value: iqcs.length, color: '#7C3AED', bg: '#EDE9FE' },
          { label: '불합격률', value: `${analysis.failRate}%`, color: parseFloat(analysis.failRate) > 5 ? '#DC2626' : '#059669', bg: parseFloat(analysis.failRate) > 5 ? '#FEE2E2' : '#D1FAE5' },
          { label: 'IQC 미실시 입고', value: analysis.pendingIqc.length, color: analysis.pendingIqc.length > 0 ? '#D97706' : '#059669', bg: analysis.pendingIqc.length > 0 ? '#FEF3C7' : '#D1FAE5' },
        ].map(c => (
          <div key={c.label} className="p-4 rounded-2xl text-center" style={{ background: c.bg, border: `1px solid ${c.color}30` }}>
            <div className="text-[26px] font-bold" style={{ color: c.color }}>{c.value}</div>
            <div className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 발주서 상태 */}
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>발주서 상태 분포</div>
          {Object.entries(PO_STATUSES).map(([k, v]) => (
            <div key={k} className="flex items-center gap-3 mb-2">
              <span className="text-[12px] w-20" style={{ color: 'var(--ink-soft)' }}>{v.label}</span>
              <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--bg-soft)' }}>
                <div className="h-2 rounded-full" style={{ width: pos.length ? `${((analysis.byPoStatus[k] || 0) / pos.length) * 100}%` : '0%', background: v.color }} />
              </div>
              <span className="text-[12px] font-bold w-5 text-right" style={{ color: 'var(--ink)' }}>{analysis.byPoStatus[k] || 0}</span>
            </div>
          ))}
        </div>

        {/* IQC 결과 */}
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>수입검사 결과 분포</div>
          {Object.entries(IQC_RESULTS).map(([k, v]) => (
            <div key={k} className="flex items-center gap-3 mb-2">
              <span className="text-[12px] w-24" style={{ color: 'var(--ink-soft)' }}>{v.label}</span>
              <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--bg-soft)' }}>
                <div className="h-2 rounded-full" style={{ width: iqcs.length ? `${((analysis.byIqcResult[k] || 0) / iqcs.length) * 100}%` : '0%', background: v.color }} />
              </div>
              <span className="text-[12px] font-bold w-5 text-right" style={{ color: 'var(--ink)' }}>{analysis.byIqcResult[k] || 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 사양 미등록 발주서 */}
      {pos.filter(p => !p.spec && !p.qualityReqs && !p.inspectionReqs).length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: '#FEF3C7', border: '1px solid #FCD34D' }}>
          <div className="text-[13px] font-bold mb-2" style={{ color: '#92400E' }}>
            ⚠ §7.4.2 구매 사양 미등록 발주서 ({pos.filter(p => !p.spec && !p.qualityReqs && !p.inspectionReqs).length}건)
          </div>
          <div className="flex flex-wrap gap-2">
            {pos.filter(p => !p.spec && !p.qualityReqs && !p.inspectionReqs).map(p => (
              <span key={p.id} className="text-[12px] px-2 py-1 rounded-lg"
                style={{ background: '#FEF9C3', border: '1px solid #FCD34D', color: '#92400E' }}>
                {p.itemName} ({p.supplierName})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── 발주서 폼 ─────────────────────────────────────────────────
function PoForm({ form, setForm, onSave, onCancel, isEdit }) {
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="mb-5 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>{isEdit ? '발주서 수정' : '발주서 등록 (§7.4.2)'}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <Field label="PO 번호" value={form.poNo} onChange={v => F('poNo', v)} placeholder="자동 생성" />
        <Field label="공급업체명 *" value={form.supplierName} onChange={v => F('supplierName', v)} />
        <Field label="공급업체 코드" value={form.supplierCode} onChange={v => F('supplierCode', v)} />
        <Field label="품목명 *" value={form.itemName} onChange={v => F('itemName', v)} />
        <Field label="품목 코드" value={form.itemCode} onChange={v => F('itemCode', v)} />
        <FieldSelect label="품목 유형" value={form.itemType} onChange={v => F('itemType', v)}
          options={ITEM_TYPES.map(t => ({ value: t, label: t }))} />
        <Field label="수량" value={form.reqQty} onChange={v => F('reqQty', v)} type="number" />
        <Field label="단위" value={form.unit} onChange={v => F('unit', v)} placeholder="EA, kg, m..." />
        <Field label="단가" value={form.unitPrice} onChange={v => F('unitPrice', v)} type="number" />
        <FieldSelect label="통화" value={form.currency} onChange={v => F('currency', v)}
          options={['KRW','USD','EUR','JPY','CNY'].map(c => ({ value: c, label: c }))} />
        <Field label="발주일" type="date" value={form.issueDate} onChange={v => F('issueDate', v)} />
        <Field label="납기일" type="date" value={form.deliveryDate} onChange={v => F('deliveryDate', v)} />
        <FieldSelect label="상태" value={form.status} onChange={v => F('status', v)}
          options={Object.entries(PO_STATUSES).map(([k, v]) => ({ value: k, label: v.label }))} />
        <Field label="연결 공급업체 ID" value={form.linkedSupplierId} onChange={v => F('linkedSupplierId', v)} placeholder="SUP-xxxx" />
        <Field label="연결 변경 관리 ID" value={form.linkedChangeId} onChange={v => F('linkedChangeId', v)} placeholder="CHG-xxxx" />
      </div>
      {/* §7.4.2 핵심 사양 입력 */}
      <div className="p-3 mb-3 rounded-xl" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
        <div className="text-[12px] font-bold mb-2" style={{ color: '#1E40AF' }}>§7.4.2 구매 사양 및 요구사항 (필수)</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FieldArea label="제품·재료 사양" value={form.spec} onChange={v => F('spec', v)} rows={3}
            placeholder="규격, 재질, 치수, 도면 번호 등..." />
          <FieldArea label="품질 요구사항" value={form.qualityReqs} onChange={v => F('qualityReqs', v)} rows={3}
            placeholder="인증서 요구, CoC 제출, 검사 기록 보관 등..." />
          <FieldArea label="검사·시험 요구사항" value={form.inspectionReqs} onChange={v => F('inspectionReqs', v)} rows={2}
            placeholder="입고 검사 항목, 시험 방법 등..." />
          <FieldArea label="규제·승인 요구사항" value={form.regulatoryReqs} onChange={v => F('regulatoryReqs', v)} rows={2}
            placeholder="KC, CE, FDA 등 인증 요구..." />
        </div>
      </div>
      <div className="mb-4"><FieldArea label="비고" value={form.notes} onChange={v => F('notes', v)} rows={2} /></div>
      <div className="flex gap-2">
        <button onClick={onSave} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
          style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
          <Save size={13} /> 저장
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-[13px]"
          style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>취소</button>
      </div>
    </div>
  )
}

// ── IQC 폼 ───────────────────────────────────────────────────
function IqcForm({ form, setForm, onSave, onCancel, isEdit, pos }) {
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function addCheckItem() {
    setForm(f => ({ ...f, checkItems: [...(f.checkItems || []), { id: Date.now(), name: '', spec: '', result: 'na', actual: '', note: '' }] }))
  }
  function updateCheckItem(id, field, value) {
    setForm(f => ({ ...f, checkItems: f.checkItems.map(ci => ci.id === id ? { ...ci, [field]: value } : ci) }))
  }
  function removeCheckItem(id) {
    setForm(f => ({ ...f, checkItems: f.checkItems.filter(ci => ci.id !== id) }))
  }

  // PO 선택 시 자동 채우기
  function selectPo(poId) {
    if (!poId) { F('poId', ''); return }
    const po = pos.find(p => p.id === poId)
    if (!po) return
    const defaultItems = (DEFAULT_CHECK_ITEMS[po.itemType] || DEFAULT_CHECK_ITEMS['원자재']).map(name => ({
      id: Date.now() + Math.random(), name, spec: '', result: 'na', actual: '', note: ''
    }))
    setForm(f => ({
      ...f, poId: po.id, poNo: po.poNo || po.id,
      supplierName: po.supplierName, itemName: po.itemName, itemCode: po.itemCode,
      checkItems: f.checkItems?.length ? f.checkItems : defaultItems,
    }))
  }

  const checkItems = form.checkItems || []
  const RESULT_CYCLE = ['na', 'pass', 'fail']

  return (
    <div className="mb-5 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>{isEdit ? 'IQC 수정' : '수입검사 등록 (§7.4.3)'}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <div>
          <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>연결 발주서 (PO)</label>
          <select value={form.poId || ''} onChange={e => selectPo(e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl text-[13px]"
            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
            <option value="">(직접 입력)</option>
            {pos.map(p => <option key={p.id} value={p.id}>{p.poNo || p.id} — {p.itemName} ({p.supplierName})</option>)}
          </select>
        </div>
        <Field label="공급업체" value={form.supplierName} onChange={v => F('supplierName', v)} />
        <Field label="품목명 *" value={form.itemName} onChange={v => F('itemName', v)} />
        <Field label="품목 코드" value={form.itemCode} onChange={v => F('itemCode', v)} />
        <Field label="로트 번호" value={form.lotNo} onChange={v => F('lotNo', v)} />
        <Field label="수량" value={form.qty} onChange={v => F('qty', v)} type="number" />
        <Field label="입고일" type="date" value={form.receivedDate} onChange={v => F('receivedDate', v)} />
        <FieldSelect label="검사 방법" value={form.inspectMethod} onChange={v => F('inspectMethod', v)}
          options={INSPECT_METHODS.map(m => ({ value: m, label: m }))} />
        <FieldSelect label="AQL 수준" value={form.aqlLevel} onChange={v => F('aqlLevel', v)}
          options={AQL_LEVELS.map(a => ({ value: a, label: a }))} />
        <Field label="샘플 수량" value={form.sampleSize} onChange={v => F('sampleSize', v)} type="number" />
        <Field label="불량 발견 수" value={form.defectsFound} onChange={v => F('defectsFound', v)} type="number" />
        <Field label="검사자" value={form.inspector} onChange={v => F('inspector', v)} />
        <Field label="검사일" type="date" value={form.inspectDate} onChange={v => F('inspectDate', v)} />
        <FieldSelect label="최종 결과 *" value={form.result} onChange={v => F('result', v)}
          options={Object.entries(IQC_RESULTS).map(([k, v]) => ({ value: k, label: v.label }))} />
        {form.result === 'fail' && (
          <Field label="불합격 처리 방법" value={form.disposalAction} onChange={v => F('disposalAction', v)} placeholder="반품/격리/특채..." />
        )}
      </div>
      {/* CoC */}
      <div className="flex items-center gap-4 mb-3">
        <label className="flex items-center gap-2 text-[12.5px] cursor-pointer" style={{ color: 'var(--ink-soft)' }}>
          <input type="checkbox" checked={!!form.cocReceived} onChange={e => F('cocReceived', e.target.checked)} className="accent-green-500 w-4 h-4" />
          성적서 (CoC/시험성적서) 수령 완료
        </label>
        {form.cocReceived && <Field label="성적서 번호" value={form.cocNo} onChange={v => F('cocNo', v)} />}
      </div>
      {/* 검사 항목 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[12.5px] font-bold" style={{ color: 'var(--ink)' }}>검사 항목 (§7.4.3)</div>
          <button onClick={addCheckItem} className="flex items-center gap-1 px-3 py-1 rounded-lg text-[11.5px] font-semibold"
            style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--moss)', cursor: 'pointer' }}>
            <Plus size={11} /> 항목 추가
          </button>
        </div>
        {checkItems.length === 0 ? (
          <div className="text-center py-4 text-[12px]" style={{ color: 'var(--ink-faint)' }}>검사 항목이 없습니다. "항목 추가" 버튼을 클릭하거나 PO를 선택하세요.</div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ background: 'var(--bg-soft)' }}>
                  {['검사 항목', '기준/사양', '결과 (클릭)', '실측값', '비고', ''].map(h => (
                    <th key={h} className="px-2 py-1.5 text-left font-semibold" style={{ color: 'var(--ink-soft)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {checkItems.map((ci, i) => {
                  const resultColors = { pass: { bg: '#D1FAE5', color: '#059669' }, fail: { bg: '#FEE2E2', color: '#DC2626' }, na: { bg: '#F3F4F6', color: '#9CA3AF' } }
                  const rc = resultColors[ci.result] || resultColors.na
                  return (
                    <tr key={ci.id} style={{ background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-soft)', borderTop: '1px solid var(--line)' }}>
                      <td className="px-2 py-1">
                        <input value={ci.name} onChange={e => updateCheckItem(ci.id, 'name', e.target.value)}
                          className="w-full px-2 py-1 rounded-lg text-[12px]"
                          style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
                      </td>
                      <td className="px-2 py-1">
                        <input value={ci.spec} onChange={e => updateCheckItem(ci.id, 'spec', e.target.value)}
                          className="w-full px-2 py-1 rounded-lg text-[12px]"
                          style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
                      </td>
                      <td className="px-2 py-1">
                        <button onClick={() => updateCheckItem(ci.id, 'result', RESULT_CYCLE[(RESULT_CYCLE.indexOf(ci.result) + 1) % 3])}
                          className="px-3 py-0.5 rounded-full text-[11px] font-bold"
                          style={{ background: rc.bg, color: rc.color, border: 'none', cursor: 'pointer', minWidth: 60 }}>
                          {{ pass: '합격', fail: '불합격', na: 'N/A' }[ci.result]}
                        </button>
                      </td>
                      <td className="px-2 py-1">
                        <input value={ci.actual} onChange={e => updateCheckItem(ci.id, 'actual', e.target.value)}
                          className="w-24 px-2 py-1 rounded-lg text-[12px]"
                          style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
                      </td>
                      <td className="px-2 py-1">
                        <input value={ci.note} onChange={e => updateCheckItem(ci.id, 'note', e.target.value)}
                          className="w-full px-2 py-1 rounded-lg text-[12px]"
                          style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
                      </td>
                      <td className="px-2 py-1">
                        <button onClick={() => removeCheckItem(ci.id)}
                          className="p-1 rounded" style={{ background: '#FEE2E2', border: 'none', cursor: 'pointer' }}>
                          <Trash2 size={10} style={{ color: '#DC2626' }} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="mb-4"><FieldArea label="비고" value={form.notes} onChange={v => F('notes', v)} rows={2} /></div>
      <div className="flex gap-2">
        <button onClick={onSave} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
          style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
          <Save size={13} /> 저장
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-[13px]"
          style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>취소</button>
      </div>
    </div>
  )
}

// ── 공통 ─────────────────────────────────────────────────────
function QuickBtn({ label, color, onClick }) {
  return (
    <button onClick={onClick} className="px-2 py-0.5 rounded text-[10.5px] font-bold"
      style={{ background: `${color}15`, border: `1px solid ${color}40`, color, cursor: 'pointer' }}>
      {label}
    </button>
  )
}
function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-1.5 rounded-xl text-[13px]"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
    </div>
  )
}
function FieldSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <select value={value || ''} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-1.5 rounded-xl text-[13px]"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
function FieldArea({ label, value, onChange, rows = 3, placeholder }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
        className="w-full px-3 py-1.5 rounded-xl text-[13px] resize-none"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
    </div>
  )
}
