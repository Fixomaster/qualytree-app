import React, { useState } from 'react'
import {
  TrendingUp, Users, ShoppingCart, ClipboardList,
  FileText, MessageSquare, Truck, BarChart2,
  Plus, ChevronRight, Clock, ArrowLeft, AlertTriangle,
  CheckCircle, XCircle, Package,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'

/* ─── 샘플 데이터 ─── */
const CUSTOMERS = [
  { id: 'C-001', name: '삼성의료기기㈜', type: '직접', contact: '김철수 부장', phone: '02-1234-5678', items: 'SCS M3.5×22mm', grade: 'A', lastOrder: '24-06-17', status: '활성' },
  { id: 'C-002', name: '한국외과의원', type: '직접', contact: '이영희 원장', phone: '031-234-5678', items: 'BPL 3㎖', grade: 'B', lastOrder: '24-06-10', status: '활성' },
  { id: 'C-003', name: '서울대학병원구매팀', type: '병원', contact: '박민준 팀장', phone: '02-345-6789', items: 'SCS M4.0×24mm', grade: 'A', lastOrder: '24-05-30', status: '활성' },
  { id: 'C-004', name: '부산척추클리닉', type: '직접', contact: '최지현 원장', phone: '051-456-7890', items: 'SCS M3.5×22mm', grade: 'C', lastOrder: '24-03-15', status: '휴면' },
]

const ORDERS = [
  { so: 'SO-2406-012', customer: '삼성의료기기㈜', items: 'SCS M3.5×22mm 수량 200EA', dueDate: '24-06-25', dday: 'D-3', wo: 'WO-2406-018', amount: '4,200,000', status: '생산중' },
  { so: 'SO-2406-011', customer: '한국외과의원', items: 'BPL 3㎖', dueDate: '24-06-28', dday: 'D-6', wo: 'WO 대기중', amount: '1,050,000', status: '생산대기' },
  { so: 'SO-2406-010', customer: '서울대학병원구매팀', items: 'SCS M4.0×24mm', dueDate: '24-07-05', dday: 'D-13', wo: 'WO-2406-017', amount: '6,300,000', status: '생산중' },
  { so: 'SO-2406-008', customer: '부산척추클리닉', items: 'BPL 4㎖', dueDate: '24-06-20', dday: '완료', wo: '완료', amount: '820,000', status: '납품완료' },
  { so: 'SO-2406-005', customer: '삼성의료기기㈜', items: 'SCS M3.5×24mm 100EA', dueDate: '24-06-14', dday: '완료', wo: '완료', amount: '2,100,000', status: '납품완료' },
]

const QUOTES = [
  { id: 'QT-2406-007', customer: '인천정형외과', items: 'SCS M3.5 시리즈 샘플', date: '24-06-20', validUntil: '24-07-20', amount: '견적예정', status: '검토중' },
  { id: 'QT-2406-006', customer: '강남세브란스병원', items: 'SCS M4.0×24mm 500EA', date: '24-06-18', validUntil: '24-07-18', amount: '15,750,000', status: '발송완료' },
  { id: 'QT-2406-005', customer: '삼성의료기기㈜', items: 'BPL 시리즈 정기계약', date: '24-06-10', validUntil: '24-07-10', amount: '82,000,000', status: '협의중' },
  { id: 'QT-2406-003', customer: '부산척추클리닉', items: 'SCS M3.5×22mm 200EA', date: '24-05-28', validUntil: '24-06-28', amount: '4,200,000', status: '수주확정' },
]

const COMPLAINTS = [
  { id: 'CMP-2406-003', date: '24-06-18', customer: '한국외과의원', content: '포장 파손 — 멸균 유효성 우려', severity: '중요', deadline: '24-06-25', capa: 'CA-2406-006', status: '조치중' },
  { id: 'CMP-2406-002', date: '24-06-05', customer: '서울대학병원구매팀', content: '제품 치수 편차 — 나사 체결 불량', severity: '심각', deadline: '24-06-19', capa: 'CA-2406-004', status: 'CAPA완료' },
  { id: 'CMP-2406-001', date: '24-05-22', customer: '삼성의료기기㈜', content: 'UDI 라벨 인쇄 오류', severity: '경미', deadline: '24-06-05', capa: 'CA-2406-001', status: '종결' },
]

const DELIVERIES = [
  { id: 'DL-2406-008', so: 'SO-2406-008', customer: '부산척추클리닉', items: 'BPL 4㎖ 50EA', date: '24-06-20', lot: 'LOT-2406-045', udi: '08806526001234', status: '납품완료' },
  { id: 'DL-2406-007', so: 'SO-2406-005', customer: '삼성의료기기㈜', items: 'SCS M3.5×24mm 100EA', date: '24-06-14', lot: 'LOT-2406-043', udi: '08806526001187', status: '납품완료' },
  { id: 'DL-2406-006', so: 'SO-2406-004', customer: '삼성의료기기㈜', items: 'SCS M4.0×22mm 200EA', date: '24-06-08', lot: 'LOT-2406-040', udi: '08806526001180', status: '납품완료' },
  { id: 'DL-2406-005', so: 'SO-2406-003', customer: '한국외과의원', items: 'BPL 3㎖ 100EA', date: '24-06-01', lot: 'LOT-2406-035', udi: '08806526001124', status: '납품완료' },
]

const PERFORMANCE = [
  { month: '1월', orders: 8, amount: 18200000, delivered: 8, complaint: 0 },
  { month: '2월', orders: 6, amount: 13500000, delivered: 6, complaint: 1 },
  { month: '3월', orders: 10, amount: 22800000, delivered: 9, complaint: 0 },
  { month: '4월', orders: 9, amount: 19600000, delivered: 9, complaint: 1 },
  { month: '5월', orders: 11, amount: 25100000, delivered: 10, complaint: 1 },
  { month: '6월', orders: 12, amount: 14370000, delivered: 4, complaint: 3 },
]

const PROD_REQUESTS = [
  { id: 'PR-2406-009', so: 'SO-2406-012', item: 'SCS M3.5×22mm', qty: 200, dueDate: '24-06-25', priority: '긴급', status: 'WO발행완료' },
  { id: 'PR-2406-008', so: 'SO-2406-010', item: 'SCS M4.0×24mm', qty: 300, dueDate: '24-07-05', priority: '보통', status: 'WO발행완료' },
  { id: 'PR-2406-007', so: 'SO-2406-011', item: 'BPL 3㎖', qty: 100, dueDate: '24-06-28', priority: '보통', status: 'WO대기' },
]

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
  if (s.includes('긴급') || s.includes('심각') || s.includes('완료필요') || s.includes('생산중') || s === '휴면') return 'red'
  if (s.includes('대기') || s.includes('검토') || s.includes('협의') || s.includes('조치')) return 'amber'
  if (s.includes('완료') || s.includes('확정') || s.includes('종결') || s === '활성') return 'green'
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
    {breadcrumb && <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-1" style={{ color: 'var(--ink-faint)' }}>영업 / {breadcrumb}</div>}
    <h2 className="font-display text-[22px]" style={{ color: 'var(--ink)', fontWeight: 500 }}>{children}</h2>
  </div>
)

/* ─── 서브뷰: 홈 ─── */
function SalesHome({ onNavigate }) {
  const CARDS = [
    { id: 'customers', icon: Users, label: '고객사 관리', desc: '고객사 등록 · 등급 · 담당자 · 수주이력', count: `${CUSTOMERS.length}개사` },
    { id: 'orders', icon: ClipboardList, label: '수주 관리', desc: '수주 목록 · D-day · WO 연동 · 상태 추적', count: `${ORDERS.filter(o=>!o.dday.includes('완료')).length}건 진행중` },
    { id: 'quotes', icon: FileText, label: '견적 관리', desc: '견적서 작성 · 발송 · 수주 전환', count: `${QUOTES.length}건` },
    { id: 'complaints', icon: MessageSquare, label: '고객 불만', desc: '고객불만 접수 · CAPA 연동 · 종결 관리', count: `${COMPLAINTS.filter(c=>c.status!=='종결').length}건 미결` },
    { id: 'delivery', icon: Truck, label: '납품 이력', desc: '납품 완료 · UDI·Lot 추적 · 증빙 관리', count: `${DELIVERIES.length}건` },
    { id: 'performance', icon: BarChart2, label: '영업 실적', desc: '월별 수주·납품·민원 통계 요약', count: '6개월' },
    { id: 'prod-req', icon: ShoppingCart, label: '생산 요청', desc: '수주 기반 생산 요청 발행 · WO 연동', count: `${PROD_REQUESTS.length}건` },
  ]
  const summary = [
    { label: '이달 수주', value: '12건', sub: '전월 대비 +1건' },
    { label: '납기 임박', value: '3건', sub: 'D-7 이내', warn: true },
    { label: '미결 고객불만', value: '3건', sub: 'CAPA 조치중', warn: true },
    { label: '이달 납품', value: '4건', sub: '납기준수율 91.7%' },
  ]
  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--moss)' }}>SAL · SALES · ISO 13485 §7.2 · §8.2.1</span>
          <div className="font-display text-[26px] mt-1" style={{ color: 'var(--ink)', fontWeight: 500 }}>영업</div>
          <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>고객사 통합 현황 · 수주에서 납품까지 추적</div>
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
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {CARDS.map(card => (
          <button key={card.id} onClick={() => onNavigate(card.id)}
            className="card-base p-4 text-left hover:shadow-md transition group">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--leaf-soft)' }}>
                <card.icon size={18} style={{ color: 'var(--moss)' }} strokeWidth={1.7} />
              </div>
              <span className="font-display text-[13px]" style={{ color: 'var(--moss)', fontWeight: 600 }}>{card.count}</span>
            </div>
            <div className="text-[13.5px] font-medium" style={{ color: 'var(--ink)' }}>{card.label}</div>
            <div className="text-[12px] mt-1" style={{ color: 'var(--ink-mute)' }}>{card.desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function CustomersView() {
  return (
    <div>
      <SectionTitle breadcrumb="고객사 관리">고객사 관리</SectionTitle>
      <div className="card-base p-4">
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-3" style={{ color: 'var(--ink-faint)' }}>고객사 목록 (ISO 13485 §7.2.1)</div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['ID','고객사명','유형','담당자','연락처','주요품목','등급','최근수주','상태'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>
              {CUSTOMERS.map(c => (
                <tr key={c.id}>
                  <TD mono color="var(--moss)">{c.id}</TD>
                  <TD><span className="font-medium">{c.name}</span></TD>
                  <TD><Badge text={c.type} tone="gray" /></TD>
                  <TD>{c.contact}</TD>
                  <TD mono color="var(--ink-faint)">{c.phone}</TD>
                  <TD color="var(--ink-mute)">{c.items}</TD>
                  <TD><Badge text={`${c.grade}등급`} tone={c.grade==='A'?'green':c.grade==='B'?'amber':'red'} /></TD>
                  <TD mono color="var(--ink-faint)">{c.lastOrder}</TD>
                  <TD><Badge text={c.status} tone={c.status==='활성'?'green':'gray'} /></TD>
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
      <SectionTitle breadcrumb="수주 관리">수주 관리</SectionTitle>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: '진행중', value: ORDERS.filter(o=>!o.dday.includes('완료')).length+'건', tone: 'green' },
          { label: '납기임박(D-7)', value: ORDERS.filter(o=>o.dday.startsWith('D-')&&parseInt(o.dday.slice(2))<=7).length+'건', tone: 'red' },
          { label: '이달 수주금액', value: '1,437만원', tone: 'blue' },
        ].map(s=>(
          <div key={s.label} className="card-base p-3">
            <div className="text-[12px]" style={{color:'var(--ink-mute)'}}>{s.label}</div>
            <div className="font-display text-[22px] mt-0.5" style={{color:s.tone==='red'?'var(--rust)':s.tone==='blue'?'#1d4ed8':'var(--moss)',fontWeight:600}}>{s.value}</div>
          </div>
        ))}
      </div>
      <div className="card-base p-4">
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-3" style={{ color: 'var(--ink-faint)' }}>수주 목록 (ISO 13485 §7.2.2)</div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['SO번호','고객사','품목','납기일','D-day','WO','금액(원)','상태'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>
              {ORDERS.map(o => (
                <tr key={o.so}>
                  <TD mono color="var(--moss)">{o.so}</TD>
                  <TD>{o.customer}</TD>
                  <TD color="var(--ink-mute)">{o.items}</TD>
                  <TD mono color="var(--ink-faint)">{o.dueDate}</TD>
                  <TD mono color={o.dday.startsWith('D-')&&parseInt(o.dday.slice(2))<=7?'var(--rust)':'var(--ink-mute)'}><b>{o.dday}</b></TD>
                  <TD mono color="var(--ink-faint)">{o.wo}</TD>
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

function QuotesView() {
  return (
    <div>
      <SectionTitle breadcrumb="견적 관리">견적 관리</SectionTitle>
      <div className="card-base p-4">
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-3" style={{ color: 'var(--ink-faint)' }}>견적 목록 (ISO 13485 §7.2.2)</div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['견적번호','고객사','품목','작성일','유효기간','금액(원)','상태'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>
              {QUOTES.map(q => (
                <tr key={q.id}>
                  <TD mono color="var(--moss)">{q.id}</TD>
                  <TD><span className="font-medium">{q.customer}</span></TD>
                  <TD color="var(--ink-mute)">{q.items}</TD>
                  <TD mono color="var(--ink-faint)">{q.date}</TD>
                  <TD mono color="var(--ink-faint)">{q.validUntil}</TD>
                  <TD right>{q.amount}</TD>
                  <TD><Badge text={q.status} tone={statusTone(q.status)} /></TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ComplaintsView() {
  const open = COMPLAINTS.filter(c => c.status !== '종결')
  return (
    <div>
      <SectionTitle breadcrumb="고객 불만">고객 불만 관리</SectionTitle>
      {open.length > 0 && (
        <div className="mb-4 p-3 rounded-lg flex items-start gap-2" style={{ background: 'var(--rust-soft)', border: '1px solid var(--rust)' }}>
          <AlertTriangle size={14} style={{ color: 'var(--rust)', marginTop: 2, flexShrink: 0 }} />
          <div className="text-[12.5px]" style={{ color: 'var(--rust)' }}>
            <b>미결 고객불만 {open.length}건</b> — CAPA 조치 기한 내 완료 필요 (ISO 13485 §8.2.1)
          </div>
        </div>
      )}
      <div className="space-y-3">
        {COMPLAINTS.map(c => (
          <div key={c.id} className="card-base p-4">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <span className="font-mono text-[11.5px] font-medium" style={{ color: 'var(--rust)' }}>{c.id}</span>
              <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{c.date}</span>
              <Badge text={c.customer} tone="gray" />
              <Badge text={c.severity} tone={c.severity==='심각'?'red':c.severity==='중요'?'amber':'gray'} />
              <Badge text={c.status} tone={statusTone(c.status)} />
            </div>
            <div className="text-[13px]" style={{ color: 'var(--ink)' }}>{c.content}</div>
            <div className="mt-2 flex items-center gap-3 text-[11.5px]" style={{ color: 'var(--ink-mute)' }}>
              <span>CAPA: <span className="font-mono" style={{ color: 'var(--moss)' }}>{c.capa}</span></span>
              <span>조치기한: {c.deadline}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DeliveryView() {
  return (
    <div>
      <SectionTitle breadcrumb="납품 이력">납품 이력</SectionTitle>
      <div className="card-base p-4">
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-3" style={{ color: 'var(--ink-faint)' }}>납품 이력 — UDI·Lot 추적 (ISO 13485 §7.5.3, §7.2.3)</div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['납품번호','SO','고객사','품목','납품일','LOT','UDI','상태'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>
              {DELIVERIES.map(d => (
                <tr key={d.id}>
                  <TD mono color="var(--moss)">{d.id}</TD>
                  <TD mono color="var(--ink-faint)">{d.so}</TD>
                  <TD>{d.customer}</TD>
                  <TD color="var(--ink-mute)">{d.items}</TD>
                  <TD mono color="var(--ink-faint)">{d.date}</TD>
                  <TD mono color="var(--ink-faint)">{d.lot}</TD>
                  <TD mono color="var(--ink-faint)">{d.udi}</TD>
                  <TD><Badge text={d.status} tone="green" /></TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function PerformanceView() {
  const total = PERFORMANCE.reduce((a, b) => a + b.amount, 0)
  return (
    <div>
      <SectionTitle breadcrumb="영업 실적">영업 실적</SectionTitle>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: '상반기 수주금액', value: (total/10000).toFixed(0)+'만원', tone: 'green' },
          { label: '총 수주건수', value: PERFORMANCE.reduce((a,b)=>a+b.orders,0)+'건', tone: 'blue' },
          { label: '총 납품건수', value: PERFORMANCE.reduce((a,b)=>a+b.delivered,0)+'건', tone: 'green' },
          { label: '고객불만 누계', value: PERFORMANCE.reduce((a,b)=>a+b.complaint,0)+'건', tone: 'red' },
        ].map(s=>(
          <div key={s.label} className="card-base p-4">
            <div className="text-[12px]" style={{color:'var(--ink-mute)'}}>{s.label}</div>
            <div className="font-display text-[24px] mt-0.5" style={{color:s.tone==='red'?'var(--rust)':s.tone==='blue'?'#1d4ed8':'var(--moss)',fontWeight:600}}>{s.value}</div>
          </div>
        ))}
      </div>
      <div className="card-base p-4">
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-3" style={{ color: 'var(--ink-faint)' }}>월별 영업 실적 (2024 상반기)</div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['월','수주건수','수주금액(원)','납품건수','고객불만'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>
              {PERFORMANCE.map(p => (
                <tr key={p.month}>
                  <TD>{p.month}</TD>
                  <TD right>{p.orders}</TD>
                  <TD right>{p.amount.toLocaleString()}</TD>
                  <TD right>{p.delivered}</TD>
                  <TD right color={p.complaint>0?'var(--rust)':'var(--ink-faint)'}>{p.complaint>0?p.complaint+'건':'—'}</TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ProdRequestView() {
  return (
    <div>
      <SectionTitle breadcrumb="생산 요청">생산 요청</SectionTitle>
      <div className="card-base p-4">
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-3" style={{ color: 'var(--ink-faint)' }}>수주 기반 생산 요청 목록</div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['요청ID','SO','품목','수량','납기일','우선순위','상태'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>
              {PROD_REQUESTS.map(r => (
                <tr key={r.id}>
                  <TD mono color="var(--moss)">{r.id}</TD>
                  <TD mono color="var(--ink-faint)">{r.so}</TD>
                  <TD>{r.item}</TD>
                  <TD right>{r.qty}EA</TD>
                  <TD mono color="var(--ink-faint)">{r.dueDate}</TD>
                  <TD><Badge text={r.priority} tone={r.priority==='긴급'?'red':'gray'} /></TD>
                  <TD><Badge text={r.status} tone={statusTone(r.status)} /></TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ─── 메인 허브 ─── */
export default function SalesHub() {
  const user = auth.current()
  const [view, setView] = useState('home')

  const viewMap = {
    home: <SalesHome onNavigate={setView} />,
    customers: <CustomersView />,
    orders: <OrdersView />,
    quotes: <QuotesView />,
    complaints: <ComplaintsView />,
    delivery: <DeliveryView />,
    performance: <PerformanceView />,
    'prod-req': <ProdRequestView />,
  }

  const tabLabels = {
    customers: '고객사 관리', orders: '수주 관리', quotes: '견적 관리',
    complaints: '고객 불만', delivery: '납품 이력', performance: '영업 실적', 'prod-req': '생산 요청',
  }

  return (
    <AppLayout user={user} title="영업" subtitle="고객사 관리 · 수주 · 납품 · 고객불만">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto fade-in">
        {view !== 'home' && (
          <button onClick={() => setView('home')}
            className="flex items-center gap-1.5 mb-5 text-[13px] hover:underline"
            style={{ color: 'var(--moss)' }}>
            <ArrowLeft size={14} /> 영업 홈
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
