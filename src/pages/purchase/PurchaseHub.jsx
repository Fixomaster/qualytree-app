import React, { useState } from 'react'
import {
  Package, ClipboardList, FileText, Truck, BarChart2,
  AlertTriangle, ArrowLeft, CheckCircle, XCircle,
  ShoppingBag, Search, Star, Archive,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'

/* ─── 샘플 데이터 ─── */
const AVL = [
  { code: 'V-001', name: '대한금속㈜', items: 'Ti-6Al-4V 봉재, SCS 반제품', cert: 'ISO 13485', grade: 'A', lastAudit: '24-03-15', nextAudit: '25-03-15', status: '등록' },
  { code: 'V-002', name: '한국폴리머㈜', items: 'BPL 원료(UHMWPE)', cert: 'ISO 9001', grade: 'A', lastAudit: '24-01-22', nextAudit: '25-01-22', status: '등록' },
  { code: 'V-003', name: '우정정밀㈜', items: 'SCS 기계가공 외주', cert: 'KS Q ISO 9001', grade: 'B', lastAudit: '23-11-10', nextAudit: '24-11-10', status: '조건부등록' },
  { code: 'V-004', name: '세진코팅㈜', items: '표면처리(아노다이징)', cert: 'ISO 9001', grade: 'B', lastAudit: '23-09-28', nextAudit: '24-09-28', status: '등록' },
  { code: 'V-005', name: '태양포장㈜', items: 'UDI 라벨, 멸균 파우치', cert: 'ISO 15223', grade: 'A', lastAudit: '24-04-03', nextAudit: '25-04-03', status: '등록' },
]

const ORDERS = [
  { po: 'PO-2406-009', vendor: '대한금속㈜', items: 'Ti-6Al-4V 봉재 φ12mm', qty: '10kg', date: '24-06-18', dueDate: '24-06-28', amount: '850,000', status: '발주완료' },
  { po: 'PO-2406-008', vendor: '한국폴리머㈜', items: 'UHMWPE 원료 GUR1020', qty: '5kg', date: '24-06-15', dueDate: '24-07-01', amount: '420,000', status: '입고예정' },
  { po: 'PO-2406-007', vendor: '우정정밀㈜', items: 'SCS M3.5 반제품 가공', qty: '500EA', date: '24-06-12', dueDate: '24-06-25', amount: '2,500,000', status: '진행중' },
  { po: 'PO-2406-006', vendor: '태양포장㈜', items: 'UDI 라벨 8806526시리즈', qty: '2,000매', date: '24-06-10', dueDate: '24-06-20', amount: '180,000', status: '입고완료' },
  { po: 'PO-2406-005', vendor: '세진코팅㈜', items: '아노다이징 처리', qty: '200EA', date: '24-06-05', dueDate: '24-06-18', amount: '320,000', status: '입고완료' },
]

const INCOMING = [
  { id: 'IN-2406-008', po: 'PO-2406-006', vendor: '태양포장㈜', items: 'UDI 라벨', qty: '2,000매', eta: '24-06-20', lot: 'LOT-V240620-001', iqc: 'IQC 검사예정', status: '입고예정' },
  { id: 'IN-2406-007', po: 'PO-2406-009', vendor: '대한금속㈜', items: 'Ti-6Al-4V 봉재', qty: '10kg', eta: '24-06-28', lot: '—', iqc: '—', status: '발주대기' },
  { id: 'IN-2406-006', po: 'PO-2406-007', vendor: '우정정밀㈜', items: 'SCS M3.5 반제품', qty: '500EA', eta: '24-06-25', lot: '—', iqc: '—', status: '제조중' },
]

const INVENTORY = [
  { code: 'MAT-001', name: 'Ti-6Al-4V 봉재 φ12mm', unit: 'kg', stock: 24.5, min: 10, location: 'A-01-03', lot: 'LOT-2406-012', status: '정상' },
  { code: 'MAT-002', name: 'UHMWPE GUR1020', unit: 'kg', stock: 3.2, min: 5, location: 'A-02-01', lot: 'LOT-2405-008', status: '부족' },
  { code: 'MAT-003', name: 'SCS M3.5 반제품', unit: 'EA', stock: 320, min: 100, location: 'B-01-02', lot: 'LOT-2405-015', status: '정상' },
  { code: 'MAT-004', name: 'UDI 라벨 (8806526)', unit: '매', stock: 180, min: 500, location: 'C-02-01', lot: 'LOT-2406-003', status: '부족' },
  { code: 'MAT-005', name: '멸균 파우치 85×210mm', unit: 'EA', stock: 2400, min: 1000, location: 'C-01-03', lot: 'LOT-2406-005', status: '정상' },
]

const EVAL = [
  { vendor: '대한금속㈜', period: '2024 Q1', quality: 95, delivery: 98, price: 88, response: 92, total: 93, grade: 'A', comment: '품질 안정적, 납기 우수' },
  { vendor: '한국폴리머㈜', period: '2024 Q1', quality: 90, delivery: 92, price: 85, response: 88, total: 89, grade: 'A', comment: '원료 순도 관리 양호' },
  { vendor: '우정정밀㈜', period: '2024 Q1', quality: 78, delivery: 82, price: 90, response: 75, total: 81, grade: 'B', comment: '치수 산포 개선 요청' },
  { vendor: '세진코팅㈜', period: '2024 Q1', quality: 85, delivery: 90, price: 87, response: 82, total: 86, grade: 'B', comment: '표면처리 균일도 양호' },
  { vendor: '태양포장㈜', period: '2024 Q1', quality: 96, delivery: 97, price: 82, response: 95, total: 93, grade: 'A', comment: '라벨 품질 우수' },
]

const IQC = [
  { id: 'IQC-2406-015', date: '24-06-20', po: 'PO-2406-006', vendor: '태양포장㈜', items: 'UDI 라벨', qty: '2,000매', inspector: '김검사', result: '합격', nc: '—', status: '합격' },
  { id: 'IQC-2406-014', date: '24-06-18', po: 'PO-2406-005', vendor: '세진코팅㈜', items: '아노다이징 처리품', qty: '200EA', inspector: '이검사', result: '조건부합격', nc: 'NC-2406-003(불균일 5EA)', status: '조건부' },
  { id: 'IQC-2406-013', date: '24-06-15', po: 'PO-2406-004', vendor: '대한금속㈜', items: 'Ti봉재 φ10mm', qty: '8kg', inspector: '김검사', result: '합격', nc: '—', status: '합격' },
]

const FIN_STOCK = [
  { code: 'FP-SCS-3522', name: 'SCS M3.5×22mm', unit: 'EA', stock: 125, min: 50, lot: 'LOT-2406-045', expiry: '2029-06', udi: '08806526001234', status: '정상' },
  { code: 'FP-SCS-3524', name: 'SCS M3.5×24mm', unit: 'EA', stock: 45, min: 50, lot: 'LOT-2406-043', expiry: '2029-06', udi: '08806526001187', status: '부족' },
  { code: 'FP-SCS-4022', name: 'SCS M4.0×22mm', unit: 'EA', stock: 200, min: 50, lot: 'LOT-2406-040', expiry: '2029-05', udi: '08806526001180', status: '정상' },
  { code: 'FP-BPL-3', name: 'BPL 3㎖', unit: 'EA', stock: 68, min: 30, lot: 'LOT-2406-035', expiry: '2028-12', udi: '08806526001124', status: '정상' },
]

const LOT_DETAIL = {
  lot: 'LOT-2406-045',
  product: 'SCS M3.5×22mm',
  udi: '08806526001234 (GS1-128)',
  wo: 'WO-2406-015',
  mfgDate: '24-06-05',
  expiry: '2029-06-05',
  qty: 200,
  released: 75,
  stock: 125,
  matLot: 'LOT-V240515-Ti-003',
  sterileLot: 'STR-2406-008',
  iqc: 'IQC-2406-010 (합격)',
  oqc: 'OQC-2406-012 (합격)',
  deliveries: [
    { dl: 'DL-2406-007', date: '24-06-14', customer: '삼성의료기기㈜', qty: 50 },
    { dl: 'DL-2406-008', date: '24-06-20', customer: '부산척추클리닉', qty: 25 },
  ],
}

/* ─── 공통 헬퍼 ─── */
const Badge = ({ text, tone = 'gray' }) => {
  const c = {
    red: { bg: 'var(--rust-soft)', fg: 'var(--rust)' },
    green: { bg: 'var(--leaf-soft)', fg: 'var(--moss)' },
    amber: { bg: '#fff7ed', fg: '#b45309' },
    blue: { bg: '#eff6ff', fg: '#1d4ed8' },
    gray: { bg: 'var(--bg-soft)', fg: 'var(--ink-mute)' },
  }[tone] || { bg: 'var(--bg-soft)', fg: 'var(--ink-mute)' }
  return (
    <span className="font-mono text-[10px] tracking-wider px-1.5 py-0.5 rounded"
      style={{ background: c.bg, color: c.fg, fontWeight: 500 }}>{text}</span>
  )
}

const statusTone = (s) => {
  if (!s) return 'gray'
  if (s.includes('부족') || s.includes('불합격') || s.includes('심각')) return 'red'
  if (s.includes('조건부') || s.includes('예정') || s.includes('진행') || s.includes('B')) return 'amber'
  if (s.includes('합격') || s.includes('정상') || s.includes('완료') || s.includes('등록') || s.includes('A')) return 'green'
  return 'gray'
}

const TH = ({ children }) => (
  <th className="pb-2 text-left font-medium px-2 first:pl-0 text-[11.5px]"
    style={{ color: 'var(--ink-faint)', borderBottom: '1px solid var(--line)' }}>{children}</th>
)
const TD = ({ children, mono, color, right }) => (
  <td className={`py-2 px-2 first:pl-0 text-[12.5px]${mono ? ' font-mono text-[11px]' : ''}${right ? ' text-right tabular-nums' : ''}`}
    style={{ color: color || 'var(--ink)', borderBottom: '1px solid var(--line)' }}>{children}</td>
)

const SectionTitle = ({ children, breadcrumb }) => (
  <div className="mb-5">
    {breadcrumb && <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-1" style={{ color: 'var(--ink-faint)' }}>구매자재 / {breadcrumb}</div>}
    <h2 className="font-display text-[22px]" style={{ color: 'var(--ink)', fontWeight: 500 }}>{children}</h2>
  </div>
)

/* ─── 서브뷰 ─── */
function PurchaseHome({ onNavigate }) {
  const CARDS = [
    { id: 'avl', icon: Star, label: 'AVL (승인공급자)', desc: '공급자 승인 목록 · 등급 · 인증 현황', count: `${AVL.length}개사` },
    { id: 'orders', icon: FileText, label: '발주 관리', desc: '발주서 목록 · 진행 현황 · 금액 관리', count: `${ORDERS.length}건` },
    { id: 'incoming', icon: Truck, label: '입고 예정', desc: '입고 예정 일정 · IQC 준비 현황', count: `${INCOMING.length}건` },
    { id: 'inventory', icon: Package, label: '재고 현황', desc: '원자재·부품 재고 · 부족 알림', count: `${INVENTORY.filter(i=>i.status==='부족').length}건 부족` },
    { id: 'eval', icon: BarChart2, label: '공급자 평가', desc: '분기별 공급자 평가 점수 · 등급 관리', count: `${EVAL.length}개사` },
    { id: 'iqc', icon: CheckCircle, label: '수입검사 연동', desc: 'IQC 검사 결과 · NC 연동', count: `${IQC.length}건` },
    { id: 'fin-stock', icon: Archive, label: '완제품 재고', desc: '완제품 재고 현황 · 유효기간 관리', count: `${FIN_STOCK.length}종` },
    { id: 'lot', icon: Search, label: 'Lot · UDI 상세', desc: 'LOT 추적 · UDI 이력 · 납품 연결', count: '' },
  ]
  const summary = [
    { label: '이달 발주', value: `${ORDERS.length}건`, sub: '전월 대비 +2건' },
    { label: '입고 예정', value: `${INCOMING.length}건`, sub: '금주 내 입고 예정', warn: true },
    { label: '재고 부족', value: `${INVENTORY.filter(i=>i.status==='부족').length}건`, sub: '발주 검토 필요', warn: true },
    { label: '공급자 수', value: `${AVL.filter(a=>a.status==='등록').length}개사`, sub: '등록 승인업체 기준' },
  ]
  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--moss)' }}>PUR · PURCHASE · ISO 13485 §7.4</span>
          <div className="font-display text-[26px] mt-1" style={{ color: 'var(--ink)', fontWeight: 500 }}>구매·자재</div>
          <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>AVL · 발주 · 입고 · 재고 · 공급자 평가</div>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {summary.map(s => (
          <div key={s.label} className="card-base p-4">
            <div className="text-[12px] mb-1" style={{ color: 'var(--ink-mute)' }}>{s.label}</div>
            <div className="font-display text-[24px]" style={{ color: s.warn ? 'var(--rust)' : 'var(--moss)', fontWeight: 600 }}>{s.value}</div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{s.sub}</div>
          </div>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {CARDS.map(card => (
          <button key={card.id} onClick={() => onNavigate(card.id)}
            className="card-base p-4 text-left hover:shadow-md transition group">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--leaf-soft)' }}>
                <card.icon size={18} style={{ color: 'var(--moss)' }} strokeWidth={1.7} />
              </div>
              {card.count && <span className="font-display text-[13px]" style={{ color: 'var(--moss)', fontWeight: 600 }}>{card.count}</span>}
            </div>
            <div className="text-[13.5px] font-medium" style={{ color: 'var(--ink)' }}>{card.label}</div>
            <div className="text-[12px] mt-1" style={{ color: 'var(--ink-mute)' }}>{card.desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function AvlView() {
  return (
    <div>
      <SectionTitle breadcrumb="AVL">AVL — 승인 공급자 목록</SectionTitle>
      <div className="card-base p-4">
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-3" style={{ color: 'var(--ink-faint)' }}>승인 공급자 목록 (ISO 13485 §7.4.1)</div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['코드','공급자명','공급 품목','인증','등급','최근감사','차기감사','상태'].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>
              {AVL.map(v => (
                <tr key={v.code}>
                  <TD mono color="var(--moss)">{v.code}</TD>
                  <TD><span className="font-medium">{v.name}</span></TD>
                  <TD color="var(--ink-mute)">{v.items}</TD>
                  <TD><Badge text={v.cert} tone="blue" /></TD>
                  <TD><Badge text={`${v.grade}등급`} tone={v.grade === 'A' ? 'green' : 'amber'} /></TD>
                  <TD mono color="var(--ink-faint)">{v.lastAudit}</TD>
                  <TD mono color="var(--ink-faint)">{v.nextAudit}</TD>
                  <TD><Badge text={v.status} tone={statusTone(v.status)} /></TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function OrdersView() {
  return (
    <div>
      <SectionTitle breadcrumb="발주 관리">발주 관리</SectionTitle>
      <div className="card-base p-4">
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-3" style={{ color: 'var(--ink-faint)' }}>발주 목록 (ISO 13485 §7.4.2)</div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['PO번호','공급자','품목','수량','발주일','납기일','금액(원)','상태'].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>
              {ORDERS.map(o => (
                <tr key={o.po}>
                  <TD mono color="var(--moss)">{o.po}</TD>
                  <TD>{o.vendor}</TD>
                  <TD color="var(--ink-mute)">{o.items}</TD>
                  <TD right>{o.qty}</TD>
                  <TD mono color="var(--ink-faint)">{o.date}</TD>
                  <TD mono color="var(--ink-faint)">{o.dueDate}</TD>
                  <TD right>{o.amount}</TD>
                  <TD><Badge text={o.status} tone={statusTone(o.status)} /></TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function IncomingView() {
  return (
    <div>
      <SectionTitle breadcrumb="입고 예정">입고 예정</SectionTitle>
      <div className="card-base p-4">
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-3" style={{ color: 'var(--ink-faint)' }}>입고 예정 현황 (ISO 13485 §7.4.3)</div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['입고ID','PO번호','공급자','품목','수량','예정일','LOT','IQC','상태'].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>
              {INCOMING.map(i => (
                <tr key={i.id}>
                  <TD mono color="var(--moss)">{i.id}</TD>
                  <TD mono color="var(--ink-faint)">{i.po}</TD>
                  <TD>{i.vendor}</TD>
                  <TD color="var(--ink-mute)">{i.items}</TD>
                  <TD right>{i.qty}</TD>
                  <TD mono color="var(--ink-faint)">{i.eta}</TD>
                  <TD mono color="var(--ink-faint)">{i.lot}</TD>
                  <TD color="var(--ink-mute)">{i.iqc}</TD>
                  <TD><Badge text={i.status} tone={statusTone(i.status)} /></TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function InventoryView() {
  const low = INVENTORY.filter(i => i.status === '부족')
  return (
    <div>
      <SectionTitle breadcrumb="재고 현황">재고 현황</SectionTitle>
      {low.length > 0 && (
        <div className="mb-4 p-3 rounded-lg flex items-start gap-2" style={{ background: 'var(--rust-soft)', border: '1px solid var(--rust)' }}>
          <AlertTriangle size={14} style={{ color: 'var(--rust)', marginTop: 2, flexShrink: 0 }} />
          <div className="text-[12.5px]" style={{ color: 'var(--rust)' }}>
            <b>재고 부족 {low.length}건</b> — {low.map(i => i.name).join(', ')} 발주 검토 필요
          </div>
        </div>
      )}
      <div className="card-base p-4">
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-3" style={{ color: 'var(--ink-faint)' }}>원자재·부품 재고 (ISO 13485 §7.5.3)</div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['자재코드','품명','단위','재고','최소기준','위치','LOT','상태'].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>
              {INVENTORY.map(i => (
                <tr key={i.code}>
                  <TD mono color="var(--moss)">{i.code}</TD>
                  <TD><span className="font-medium">{i.name}</span></TD>
                  <TD>{i.unit}</TD>
                  <TD right color={i.stock < i.min ? 'var(--rust)' : 'var(--ink)'}><b>{i.stock}</b></TD>
                  <TD right color="var(--ink-faint)">{i.min}</TD>
                  <TD mono color="var(--ink-faint)">{i.location}</TD>
                  <TD mono color="var(--ink-faint)">{i.lot}</TD>
                  <TD><Badge text={i.status} tone={statusTone(i.status)} /></TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function EvalView() {
  return (
    <div>
      <SectionTitle breadcrumb="공급자 평가">공급자 평가</SectionTitle>
      <div className="card-base p-4">
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-3" style={{ color: 'var(--ink-faint)' }}>공급자 평가 결과 — 2024 Q1 (ISO 13485 §7.4.1)</div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['공급자','평가기간','품질(40)','납기(30)','가격(20)','대응(10)','종합','등급','비고'].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>
              {EVAL.map(e => (
                <tr key={e.vendor}>
                  <TD><span className="font-medium">{e.vendor}</span></TD>
                  <TD color="var(--ink-faint)">{e.period}</TD>
                  <TD right>{e.quality}</TD>
                  <TD right>{e.delivery}</TD>
                  <TD right>{e.price}</TD>
                  <TD right>{e.response}</TD>
                  <TD right color={e.total >= 90 ? 'var(--moss)' : e.total >= 80 ? '#b45309' : 'var(--rust)'}><b>{e.total}</b></TD>
                  <TD><Badge text={`${e.grade}등급`} tone={e.grade === 'A' ? 'green' : 'amber'} /></TD>
                  <TD color="var(--ink-faint)">{e.comment}</TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function IqcView() {
  return (
    <div>
      <SectionTitle breadcrumb="수입검사 연동">수입검사 연동</SectionTitle>
      <div className="space-y-3">
        {IQC.map(q => (
          <div key={q.id} className="card-base p-4">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <span className="font-mono text-[11.5px] font-medium" style={{ color: 'var(--moss)' }}>{q.id}</span>
              <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{q.date}</span>
              <Badge text={q.vendor} tone="gray" />
              <Badge text={q.result} tone={statusTone(q.result)} />
            </div>
            <div className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{q.items} — {q.qty}</div>
            <div className="mt-2 flex items-center gap-4 text-[11.5px]" style={{ color: 'var(--ink-mute)' }}>
              <span>PO: <span className="font-mono">{q.po}</span></span>
              <span>검사자: {q.inspector}</span>
              {q.nc !== '—' && <span style={{ color: 'var(--rust)' }}>NC: {q.nc}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function FinStockView() {
  const low = FIN_STOCK.filter(f => f.status === '부족')
  return (
    <div>
      <SectionTitle breadcrumb="완제품 재고">완제품 재고</SectionTitle>
      {low.length > 0 && (
        <div className="mb-4 p-3 rounded-lg flex items-start gap-2" style={{ background: 'var(--rust-soft)', border: '1px solid var(--rust)' }}>
          <AlertTriangle size={14} style={{ color: 'var(--rust)', marginTop: 2, flexShrink: 0 }} />
          <div className="text-[12.5px]" style={{ color: 'var(--rust)' }}>
            <b>재고 부족 {low.length}건</b> — {low.map(f => f.name).join(', ')} 생산 검토 필요
          </div>
        </div>
      )}
      <div className="card-base p-4">
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-3" style={{ color: 'var(--ink-faint)' }}>완제품 재고 — UDI 연동 (ISO 13485 §7.5.3, §7.5.6)</div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['코드','품명','단위','재고','최소기준','LOT','유효기한','UDI','상태'].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>
              {FIN_STOCK.map(f => (
                <tr key={f.code}>
                  <TD mono color="var(--moss)">{f.code}</TD>
                  <TD><span className="font-medium">{f.name}</span></TD>
                  <TD>{f.unit}</TD>
                  <TD right color={f.stock < f.min ? 'var(--rust)' : 'var(--ink)'}><b>{f.stock}</b></TD>
                  <TD right color="var(--ink-faint)">{f.min}</TD>
                  <TD mono color="var(--ink-faint)">{f.lot}</TD>
                  <TD mono color="var(--ink-faint)">{f.expiry}</TD>
                  <TD mono color="var(--ink-faint)">{f.udi}</TD>
                  <TD><Badge text={f.status} tone={statusTone(f.status)} /></TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function LotView() {
  const d = LOT_DETAIL
  return (
    <div>
      <SectionTitle breadcrumb="Lot · UDI 상세">Lot · UDI 상세</SectionTitle>
      <div className="card-base p-5 mb-4">
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-4" style={{ color: 'var(--ink-faint)' }}>LOT 추적 카드 (ISO 13485 §7.5.3.2, §7.5.6)</div>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
          {[
            ['LOT', d.lot], ['제품명', d.product], ['UDI', d.udi], ['WO', d.wo],
            ['제조일', d.mfgDate], ['유효기한', d.expiry], ['생산수량', `${d.qty}EA`],
            ['출하수량', `${d.released}EA`], ['잔여재고', `${d.stock}EA`],
            ['원자재LOT', d.matLot], ['멸균LOT', d.sterileLot],
            ['수입검사', d.iqc], ['최종검사', d.oqc],
          ].map(([k, v]) => (
            <div key={k} className="flex items-start gap-3">
              <div className="text-[11px] w-24 shrink-0 mt-0.5" style={{ color: 'var(--ink-faint)' }}>{k}</div>
              <div className="font-mono text-[12px]" style={{ color: 'var(--ink)' }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="card-base p-4">
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-3" style={{ color: 'var(--ink-faint)' }}>납품 이력</div>
        <table className="w-full">
          <thead><tr>{['납품번호','납품일','고객사','수량'].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
          <tbody>
            {d.deliveries.map(dl => (
              <tr key={dl.dl}>
                <TD mono color="var(--moss)">{dl.dl}</TD>
                <TD mono color="var(--ink-faint)">{dl.date}</TD>
                <TD>{dl.customer}</TD>
                <TD right>{dl.qty}EA</TD>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─── 메인 허브 ─── */
export default function PurchaseHub() {
  const user = auth.current()
  const [view, setView] = useState('home')

  const viewMap = {
    home: <PurchaseHome onNavigate={setView} />,
    avl: <AvlView />,
    orders: <OrdersView />,
    incoming: <IncomingView />,
    inventory: <InventoryView />,
    eval: <EvalView />,
    iqc: <IqcView />,
    'fin-stock': <FinStockView />,
    lot: <LotView />,
  }

  const tabLabels = {
    avl: 'AVL', orders: '발주 관리', incoming: '입고 예정', inventory: '재고 현황',
    eval: '공급자 평가', iqc: '수입검사', 'fin-stock': '완제품 재고', lot: 'Lot·UDI',
  }

  return (
    <AppLayout user={user} title="구매·자재" subtitle="AVL · 발주 · 입고 · 재고 · 공급자 평가">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto fade-in">
        {view !== 'home' && (
          <button onClick={() => setView('home')}
            className="flex items-center gap-1.5 mb-5 text-[13px] hover:underline"
            style={{ color: 'var(--moss)' }}>
            <ArrowLeft size={14} /> 구매·자재 홈
          </button>
        )}
        {view !== 'home' && (
          <div className="flex gap-1 flex-wrap mb-5">
            {Object.entries(tabLabels).map(([id, label]) => (
              <button key={id} onClick={() => setView(id)}
                className="text-[12px] px-3 py-1.5 rounded-lg border transition"
                style={{
                  background: view === id ? 'var(--moss)' : 'var(--bg-card)',
                  color: view === id ? 'var(--bg)' : 'var(--ink-mute)',
                  borderColor: view === id ? 'var(--moss)' : 'var(--line)',
                }}>
                {label}
              </button>
            ))}
          </div>
        )}
        {viewMap[view] || viewMap.home}
      </div>
    </AppLayout>
  )
}
