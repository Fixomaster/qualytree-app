import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  TrendingUp, Users, ShoppingCart, ClipboardList,
  FileText, MessageSquare, Truck, BarChart2,
  Plus, ArrowLeft, AlertTriangle, X, Edit2, Trash2,
  CheckCircle, Package, Search,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'

/* ─── util ─── */
function useLS(key, init) {
  const [v, setV] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) ?? init } catch { return init }
  })
  const set = (u) => {
    const n = typeof u === 'function' ? u(v) : u
    localStorage.setItem(key, JSON.stringify(n))
    setV(n)
  }
  return [v, set]
}
const nid = (p) =>
  `${p}-${new Date().toISOString().slice(2,4)}${String(new Date().getMonth()+1).padStart(2,'0')}-${String(Date.now()).slice(-3)}`

/* ─── UI 부품 ─── */
const inp = {
  width:'100%', padding:'7px 10px', borderRadius:'7px',
  border:'1px solid var(--line)', background:'var(--bg)',
  color:'var(--ink)', fontSize:'13px', outline:'none',
}
const sel = { ...inp, appearance:'none' }

const Badge = ({ text, tone='gray' }) => {
  const c = {
    red:   { bg:'var(--rust-soft)',  fg:'var(--rust)' },
    green: { bg:'var(--leaf-soft)',  fg:'var(--moss)' },
    amber: { bg:'#fff7ed', fg:'#b45309' },
    blue:  { bg:'#eff6ff', fg:'#1d4ed8' },
    gray:  { bg:'var(--bg-soft)',    fg:'var(--ink-mute)' },
  }[tone] ?? { bg:'var(--bg-soft)', fg:'var(--ink-mute)' }
  return (
    <span className="font-mono text-[10px] tracking-wider px-1.5 py-0.5 rounded"
      style={{ background:c.bg, color:c.fg, fontWeight:500 }}>{text}</span>
  )
}
const statusTone = (s='') => {
  if (s.includes('긴급')||s.includes('심각')||s.includes('부족')||s==='휴면'||s==='불합격'||s.includes('취소')) return 'red'
  if (s.includes('대기')||s.includes('검토')||s.includes('협의')||s.includes('조치')||s.includes('예정')||s==='교정임박') return 'amber'
  if (s.includes('완료')||s.includes('확정')||s.includes('종결')||s==='활성'||s==='합격'||s.includes('발송')) return 'green'
  return 'gray'
}
const TH = ({ children, w }) => (
  <th className="pb-2 text-left font-medium px-2 first:pl-0 whitespace-nowrap text-[11.5px]"
    style={{ color:'var(--ink-faint)', borderBottom:'1px solid var(--line)', width:w }}>{children}</th>
)
const TD = ({ children, mono, color, right, muted }) => (
  <td className={`py-2 px-2 first:pl-0 text-[12.5px]${mono?' font-mono text-[11px]':''}${right?' text-right tabular-nums':''}`}
    style={{ color:color||( muted?'var(--ink-mute)':'var(--ink)'), borderBottom:'1px solid var(--line)' }}>{children}</td>
)
function ActBtn({ label, color, onClick }) {
  return (
    <button onClick={onClick} className="text-[11px] px-2 py-0.5 rounded transition hover:opacity-80"
      style={{ background: color==='red'?'var(--rust-soft)':color==='green'?'var(--leaf-soft)':'var(--bg-soft)',
               color: color==='red'?'var(--rust)':color==='green'?'var(--moss)':'var(--ink-mute)',
               fontWeight:500 }}>
      {label}
    </button>
  )
}
const SBtn = ({ children, onClick, secondary }) => (
  <button onClick={onClick} className="px-4 py-2 rounded-lg text-[13px] font-medium transition"
    style={{ background: secondary?'var(--bg-soft)':'var(--moss)',
             color: secondary?'var(--ink-mute)':'var(--bg)' }}>
    {children}
  </button>
)
function FL({ label, children }) {
  return (
    <div>
      <div className="text-[11.5px] font-medium mb-1" style={{ color:'var(--ink-mute)' }}>{label}</div>
      {children}
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background:'rgba(0,0,0,0.45)' }} onClick={(e)=>e.target===e.currentTarget&&onClose()}>
      <div className="rounded-2xl p-6 w-full max-w-lg max-h-[92vh] overflow-y-auto"
        style={{ background:'var(--bg-card)', boxShadow:'0 24px 64px rgba(0,0,0,0.18)', border:'1px solid var(--line)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[17px] font-semibold" style={{ color:'var(--ink)' }}>{title}</h3>
          <button onClick={onClose} style={{ color:'var(--ink-faint)' }}><X size={18}/></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function EmptyRow({cols,msg}){return(<tr><td colSpan={cols||20} className="py-10 text-center text-sm" style={{color:"var(--ink-mute)"}}>{msg||"등록된 항목이 없습니다."}</td></tr>)}
function EmptyCard({msg}){return(<div className="py-10 text-center text-sm" style={{color:"var(--ink-mute)"}}>{msg||"등록된 항목이 없습니다."}</div>)}

function StatusSelect({ value, options, onChange }) {
  return (
    <select value={value} onChange={e=>onChange(e.target.value)} style={{ ...sel, padding:'3px 6px', fontSize:'11px', width:'auto' }}>
      {options.map(o=><option key={o}>{o}</option>)}
    </select>
  )
}

const SectionTitle = ({ children, breadcrumb }) => (
  <div className="mb-5">
    {breadcrumb && <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-1" style={{ color:'var(--ink-faint)' }}>영업 / {breadcrumb}</div>}
    <h2 className="text-[22px]" style={{ color:'var(--ink)', fontWeight:500 }}>{children}</h2>
  </div>
)

/* ─── 초기 데이터 ─── */
const INIT_CUSTOMERS = [
  { id:'C-001', name:'삼성의료기기㈜', type:'직접', contact:'김철수 부장', phone:'02-1234-5678', items:'SCS M3.5×22mm', grade:'A', lastOrder:'24-06-17', status:'활성' },
  { id:'C-002', name:'한국외과의원', type:'직접', contact:'이영희 원장', phone:'031-234-5678', items:'BPL 3㎖', grade:'B', lastOrder:'24-06-10', status:'활성' },
  { id:'C-003', name:'서울대학병원구매팀', type:'병원', contact:'박민준 팀장', phone:'02-345-6789', items:'SCS M4.0×24mm', grade:'A', lastOrder:'24-05-30', status:'활성' },
  { id:'C-004', name:'부산척추클리닉', type:'직접', contact:'최지현 원장', phone:'051-456-7890', items:'SCS M3.5×22mm', grade:'C', lastOrder:'24-03-15', status:'휴면' },
]
const INIT_ORDERS = [
  { id:'SO-2406-012', customer:'삼성의료기기㈜', items:'SCS M3.5×22mm', qty:'200EA', dueDate:'24-06-25', amount:'4200000', wo:'WO-2406-018', status:'생산중' },
  { id:'SO-2406-011', customer:'한국외과의원', items:'BPL 3㎖', qty:'100EA', dueDate:'24-06-28', amount:'1050000', wo:'—', status:'수주접수' },
  { id:'SO-2406-010', customer:'서울대학병원구매팀', items:'SCS M4.0×24mm', qty:'300EA', dueDate:'24-07-05', amount:'6300000', wo:'WO-2406-017', status:'생산중' },
  { id:'SO-2406-008', customer:'부산척추클리닉', items:'BPL 4㎖', qty:'50EA', dueDate:'24-06-20', amount:'820000', wo:'완료', status:'납품완료' },
]
const INIT_QUOTES = [
  { id:'QT-2406-007', customer:'인천정형외과', items:'SCS M3.5 시리즈 샘플', date:'24-06-20', validUntil:'24-07-20', amount:'견적예정', status:'검토중' },
  { id:'QT-2406-006', customer:'강남세브란스병원', items:'SCS M4.0×24mm 500EA', date:'24-06-18', validUntil:'24-07-18', amount:'15750000', status:'발송완료' },
  { id:'QT-2406-005', customer:'삼성의료기기㈜', items:'BPL 시리즈 정기계약', date:'24-06-10', validUntil:'24-07-10', amount:'82000000', status:'협의중' },
  { id:'QT-2406-003', customer:'부산척추클리닉', items:'SCS M3.5×22mm 200EA', date:'24-05-28', validUntil:'24-06-28', amount:'4200000', status:'수주확정' },
]
const INIT_COMPLAINTS = [
  { id:'CMP-2406-003', date:'24-06-18', customer:'한국외과의원', content:'포장 파손 — 멸균 유효성 우려', severity:'중요', deadline:'24-06-25', capa:'CA-2406-006', status:'조치중' },
  { id:'CMP-2406-002', date:'24-06-05', customer:'서울대학병원구매팀', content:'제품 치수 편차 — 나사 체결 불량', severity:'심각', deadline:'24-06-19', capa:'CA-2406-004', status:'CAPA완료' },
  { id:'CMP-2406-001', date:'24-05-22', customer:'삼성의료기기㈜', content:'UDI 라벨 인쇄 오류', severity:'경미', deadline:'24-06-05', capa:'CA-2406-001', status:'종결' },
]
const INIT_DELIVERIES = [
  { id:'DL-2406-008', so:'SO-2406-008', customer:'부산척추클리닉', items:'BPL 4㎖ 50EA', date:'24-06-20', lot:'LOT-2406-045', udi:'08806526001234', status:'납품완료' },
  { id:'DL-2406-007', so:'SO-2406-005', customer:'삼성의료기기㈜', items:'SCS M3.5×24mm 100EA', date:'24-06-14', lot:'LOT-2406-043', udi:'08806526001187', status:'납품완료' },
  { id:'DL-2406-006', so:'SO-2406-004', customer:'삼성의료기기㈜', items:'SCS M4.0×22mm 200EA', date:'24-06-08', lot:'LOT-2406-040', udi:'08806526001180', status:'납품완료' },
]
const INIT_PRODREQS = [
  { id:'PR-2406-009', so:'SO-2406-012', item:'SCS M3.5×22mm', qty:'200', dueDate:'24-06-25', priority:'긴급', status:'WO발행완료' },
  { id:'PR-2406-008', so:'SO-2406-010', item:'SCS M4.0×24mm', qty:'300', dueDate:'24-07-05', priority:'보통', status:'WO발행완료' },
  { id:'PR-2406-007', so:'SO-2406-011', item:'BPL 3㎖', qty:'100', dueDate:'24-06-28', priority:'보통', status:'WO대기' },
]

/* ─── 고객사 관리 ─── */
function CustomerForm({ initial={}, customers, onSave, onCancel }) {
  const [f, sf] = useState({ name:'', type:'직접', contact:'', phone:'', items:'', grade:'A', status:'활성', ...initial })
  const set = k => e => sf(p=>({...p,[k]:e.target.value}))
  const ok = f.name.trim()
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FL label="고객사명 *"><input style={inp} value={f.name} onChange={set('name')} placeholder="예) 삼성의료기기㈜" /></FL>
        <FL label="유형">
          <select style={sel} value={f.type} onChange={set('type')}>
            {['직접','병원','대리점','수출'].map(o=><option key={o}>{o}</option>)}
          </select>
        </FL>
        <FL label="담당자"><input style={inp} value={f.contact} onChange={set('contact')} placeholder="이름 직함" /></FL>
        <FL label="연락처"><input style={inp} value={f.phone} onChange={set('phone')} placeholder="02-0000-0000" /></FL>
        <FL label="주요 품목"><input style={inp} value={f.items} onChange={set('items')} placeholder="예) SCS M3.5×22mm" /></FL>
        <FL label="등급">
          <select style={sel} value={f.grade} onChange={set('grade')}>
            {['A','B','C'].map(o=><option key={o}>{o}등급</option>)}
          </select>
        </FL>
        <FL label="상태">
          <select style={sel} value={f.status} onChange={set('status')}>
            {['활성','휴면','블랙리스트'].map(o=><option key={o}>{o}</option>)}
          </select>
        </FL>
      </div>
      <div className="flex gap-2 pt-2">
        <SBtn onClick={()=>ok&&onSave(f)} secondary={!ok}>{initial.name?'수정 저장':'등록'}</SBtn>
        <SBtn onClick={onCancel} secondary>취소</SBtn>
      </div>
    </div>
  )
}

function CustomersView({ customers, setCustomers }) {
  const [modal, setModal] = useState(null)
  const [edit, setEdit] = useState(null)

  const save = (f) => {
    if (edit) { setCustomers(p=>p.map(x=>x.id===edit.id?{...x,...f}:x)); setEdit(null) }
    else { setCustomers(p=>[...p, { id:nid('C'), lastOrder:'—', ...f }]) }
    setModal(null)
  }
  const del = (id) => { if(window.confirm('삭제하시겠습니까?')) setCustomers(p=>p.filter(x=>x.id!==id)) }
  const statusOpts = ['활성','휴면','블랙리스트']

  return (
    <div>
      <SectionTitle breadcrumb="고객사 관리">고객사 관리</SectionTitle>
      <div className="rounded-xl p-4" style={{ background:'var(--bg-card)', border:'1px solid var(--line)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color:'var(--ink-faint)' }}>고객사 목록 (ISO 13485 §7.2.1) — {customers.length}개사</span>
          <button onClick={()=>{setEdit(null);setModal('form')}}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
            style={{ background:'var(--moss)', color:'var(--bg)' }}>
            <Plus size={13}/> 고객사 등록
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              {['ID','고객사명','유형','담당자','연락처','주요품목','등급','최근수주','상태','작업'].map(h=><TH key={h}>{h}</TH>)}
            </tr></thead>
            <tbody>
              {customers.length===0?<EmptyRow/>:customers.map(c=>(
      <tr key={c.id}>
                  <TD mono color="var(--moss)">{c.id}</TD>
                  <TD><span className="font-medium">{c.name}</span></TD>
                  <TD muted>{c.type}</TD>
                  <TD>{c.contact}</TD>
                  <TD mono muted>{c.phone}</TD>
                  <TD muted>{c.items}</TD>
                  <TD><Badge text={`${c.grade}등급`} tone={c.grade==='A'?'green':c.grade==='B'?'amber':'red'}/></TD>
                  <TD mono muted>{c.lastOrder}</TD>
                  <TD>
                    <StatusSelect value={c.status} options={statusOpts}
                      onChange={v=>setCustomers(p=>p.map(x=>x.id===c.id?{...x,status:v}:x))}/>
                  </TD>
                  <TD>
                    <div className="flex gap-1">
                      <ActBtn label="수정" onClick={()=>{setEdit(c);setModal('form')}}/>
                      <ActBtn label="삭제" color="red" onClick={()=>del(c.id)}/>
                    </div>
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {modal==='form' && (
        <Modal title={edit?'고객사 수정':'고객사 등록'} onClose={()=>{setModal(null);setEdit(null)}}>
          <CustomerForm initial={edit||{}} onSave={save} onCancel={()=>{setModal(null);setEdit(null)}}/>
        </Modal>
      )}
    </div>
  )
}

/* ─── 수주 관리 ─── */
function OrdersView({ orders, setOrders, customers, openId }) {
  const [modal, setModal] = useState(null)
  const [edit, setEdit] = useState(null)
  useEffect(() => {
    if (openId) { const item = orders.find(x => x.id === openId); if (item) { setEdit(item); setModal('form') } }
  }, [openId])
  const statusOpts = ['수주접수','생산요청','생산중','검사중','납품대기','납품완료','취소']
  const init = { id:'', customer:'', items:'', qty:'', dueDate:'', amount:'', wo:'—', status:'수주접수' }

  const save = (f) => {
    if (edit) { setOrders(p=>p.map(x=>x.id===edit.id?{...x,...f}:x)); setEdit(null) }
    else { setOrders(p=>[...p, { ...init, id:nid('SO'), ...f }]) }
    setModal(null)
  }
  const del = (id) => { if(window.confirm('삭제하시겠습니까?')) setOrders(p=>p.filter(x=>x.id!==id)) }

  const active = orders.filter(o=>!['납품완료','취소'].includes(o.status))
  return (
    <div>
      <SectionTitle breadcrumb="수주 관리">수주 관리</SectionTitle>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl p-3" style={{background:'var(--bg-card)',border:'1px solid var(--line)'}}>
          <div className="text-[12px]" style={{color:'var(--ink-mute)'}}>진행중</div>
          <div className="text-[22px] font-bold mt-0.5" style={{color:'var(--moss)'}}>{active.length}건</div>
        </div>
        <div className="rounded-xl p-3" style={{background:'var(--bg-card)',border:'1px solid var(--line)'}}>
          <div className="text-[12px]" style={{color:'var(--ink-mute)'}}>총 수주</div>
          <div className="text-[22px] font-bold mt-0.5" style={{color:'var(--ink)'}}>{orders.length}건</div>
        </div>
        <div className="rounded-xl p-3" style={{background:'var(--bg-card)',border:'1px solid var(--line)'}}>
          <div className="text-[12px]" style={{color:'var(--ink-mute)'}}>납품완료</div>
          <div className="text-[22px] font-bold mt-0.5" style={{color:'#1d4ed8'}}>{orders.filter(o=>o.status==='납품완료').length}건</div>
        </div>
      </div>
      <div className="rounded-xl p-4" style={{ background:'var(--bg-card)', border:'1px solid var(--line)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color:'var(--ink-faint)' }}>수주 목록 (ISO 13485 §7.2.2)</span>
          <button onClick={()=>{setEdit(null);setModal('form')}}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
            style={{ background:'var(--moss)', color:'var(--bg)' }}>
            <Plus size={13}/> 수주 등록
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              {['SO번호','고객사','품목','수량','납기일','금액(원)','WO','상태','작업'].map(h=><TH key={h}>{h}</TH>)}
            </tr></thead>
            <tbody>
              {orders.length===0?<EmptyRow/>:orders.map(o=>(
      <tr key={o.id}>
                  <TD mono color="var(--moss)">{o.id}</TD>
                  <TD>{o.customer}</TD>
                  <TD muted>{o.items}</TD>
                  <TD right>{o.qty}</TD>
                  <TD mono muted>{o.dueDate}</TD>
                  <TD right>{Number(o.amount).toLocaleString()}</TD>
                  <TD mono muted>{o.wo}</TD>
                  <TD>
                    <StatusSelect value={o.status} options={statusOpts}
                      onChange={v=>setOrders(p=>p.map(x=>x.id===o.id?{...x,status:v}:x))}/>
                  </TD>
                  <TD>
                    <div className="flex gap-1">
                      <ActBtn label="수정" onClick={()=>{setEdit(o);setModal('form')}}/>
                      <ActBtn label="삭제" color="red" onClick={()=>del(o.id)}/>
                    </div>
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {modal==='form' && (
        <Modal title={edit?'수주 수정':'수주 등록'} onClose={()=>{setModal(null);setEdit(null)}}>
          <OrderForm initial={edit||init} customers={customers} onSave={save} onCancel={()=>{setModal(null);setEdit(null)}} statusOpts={statusOpts}/>
        </Modal>
      )}
    </div>
  )
}
function OrderForm({ initial, customers, onSave, onCancel, statusOpts }) {
  const [f, sf] = useState(initial)
  const set = k => e => sf(p=>({...p,[k]:e.target.value}))
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FL label="고객사 *">
          <select style={sel} value={f.customer} onChange={set('customer')}>
            <option value="">선택</option>
            {customers.map(c=><option key={c.id}>{c.name}</option>)}
          </select>
        </FL>
        <FL label="상태">
          <select style={sel} value={f.status} onChange={set('status')}>
            {statusOpts.map(o=><option key={o}>{o}</option>)}
          </select>
        </FL>
        <FL label="품목 *"><input style={inp} value={f.items} onChange={set('items')} placeholder="예) SCS M3.5×22mm"/></FL>
        <FL label="수량"><input style={inp} value={f.qty} onChange={set('qty')} placeholder="예) 200EA"/></FL>
        <FL label="납기일"><input style={inp} type="date" value={f.dueDate} onChange={set('dueDate')}/></FL>
        <FL label="금액(원)"><input style={inp} type="number" value={f.amount} onChange={set('amount')} placeholder="4200000"/></FL>
        <FL label="WO 번호"><input style={inp} value={f.wo} onChange={set('wo')} placeholder="WO-XXXX-XXX"/></FL>
      </div>
      <div className="flex gap-2 pt-2">
        <SBtn onClick={()=>f.customer&&f.items&&onSave(f)}>{initial.customer?'수정 저장':'등록'}</SBtn>
        <SBtn onClick={onCancel} secondary>취소</SBtn>
      </div>
    </div>
  )
}

/* ─── 견적 관리 ─── */
function QuotesView({ quotes, setQuotes, customers }) {
  const [modal, setModal] = useState(null)
  const [edit, setEdit] = useState(null)
  const statusOpts = ['검토중','발송완료','협의중','수주확정','견적취소']
  const init = { id:'', customer:'', items:'', date:new Date().toISOString().slice(0,10), validUntil:'', amount:'', status:'검토중' }

  const save = (f) => {
    if (edit) { setQuotes(p=>p.map(x=>x.id===edit.id?{...x,...f}:x)); setEdit(null) }
    else { setQuotes(p=>[...p, { ...init, id:nid('QT'), ...f }]) }
    setModal(null)
  }
  const del = (id) => { if(window.confirm('삭제하시겠습니까?')) setQuotes(p=>p.filter(x=>x.id!==id)) }

  return (
    <div>
      <SectionTitle breadcrumb="견적 관리">견적 관리</SectionTitle>
      <div className="rounded-xl p-4" style={{ background:'var(--bg-card)', border:'1px solid var(--line)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color:'var(--ink-faint)' }}>견적 목록 (ISO 13485 §7.2.2) — {quotes.length}건</span>
          <button onClick={()=>{setEdit(null);setModal('form')}}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
            style={{ background:'var(--moss)', color:'var(--bg)' }}>
            <Plus size={13}/> 견적 등록
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              {['견적번호','고객사','품목','작성일','유효기간','금액(원)','상태','작업'].map(h=><TH key={h}>{h}</TH>)}
            </tr></thead>
            <tbody>
              {quotes.length===0?<EmptyRow/>:quotes.map(q=>(
      <tr key={q.id}>
                  <TD mono color="var(--moss)">{q.id}</TD>
                  <TD><span className="font-medium">{q.customer}</span></TD>
                  <TD muted>{q.items}</TD>
                  <TD mono muted>{q.date}</TD>
                  <TD mono muted>{q.validUntil}</TD>
                  <TD right>{isNaN(Number(q.amount))?q.amount:Number(q.amount).toLocaleString()}</TD>
                  <TD>
                    <StatusSelect value={q.status} options={statusOpts}
                      onChange={v=>setQuotes(p=>p.map(x=>x.id===q.id?{...x,status:v}:x))}/>
                  </TD>
                  <TD>
                    <div className="flex gap-1">
                      <ActBtn label="수정" onClick={()=>{setEdit(q);setModal('form')}}/>
                      <ActBtn label="삭제" color="red" onClick={()=>del(q.id)}/>
                    </div>
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {modal==='form' && (
        <Modal title={edit?'견적 수정':'견적 등록'} onClose={()=>{setModal(null);setEdit(null)}}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FL label="고객사 *">
                <select style={sel} value={(edit||init).customer}
                  onChange={e=>setEdit(p=>({...(p||init),customer:e.target.value}))||!edit&&setModal(p=>({...p,customer:e.target.value}))}>
                  <option value="">선택</option>
                  {customers.map(c=><option key={c.id}>{c.name}</option>)}
                </select>
              </FL>
              <FL label="상태">
                <select style={sel} value={(edit||init).status} onChange={e=>edit?setEdit(p=>({...p,status:e.target.value})):null}>
                  {statusOpts.map(o=><option key={o}>{o}</option>)}
                </select>
              </FL>
            </div>
            <QuoteFormInner initial={edit||init} customers={customers} onSave={save} onCancel={()=>{setModal(null);setEdit(null)}} statusOpts={statusOpts}/>
          </div>
        </Modal>
      )}
    </div>
  )
}
function QuoteFormInner({ initial, customers, onSave, onCancel, statusOpts }) {
  const [f, sf] = useState(initial)
  const set = k => e => sf(p=>({...p,[k]:e.target.value}))
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FL label="고객사 *">
          <select style={sel} value={f.customer} onChange={set('customer')}>
            <option value="">선택</option>
            {customers.map(c=><option key={c.id}>{c.name}</option>)}
          </select>
        </FL>
        <FL label="상태">
          <select style={sel} value={f.status} onChange={set('status')}>
            {statusOpts.map(o=><option key={o}>{o}</option>)}
          </select>
        </FL>
        <FL label="품목 *"><input style={inp} value={f.items} onChange={set('items')} placeholder="예) SCS M3.5×22mm 500EA"/></FL>
        <FL label="금액(원)"><input style={inp} value={f.amount} onChange={set('amount')} placeholder="15750000 또는 견적예정"/></FL>
        <FL label="작성일"><input style={inp} type="date" value={f.date} onChange={set('date')}/></FL>
        <FL label="유효기간까지"><input style={inp} type="date" value={f.validUntil} onChange={set('validUntil')}/></FL>
      </div>
      <div className="flex gap-2 pt-2">
        <SBtn onClick={()=>f.customer&&f.items&&onSave(f)}>{initial.customer?'수정 저장':'등록'}</SBtn>
        <SBtn onClick={onCancel} secondary>취소</SBtn>
      </div>
    </div>
  )
}

/* ─── 고객 불만 ─── */
function ComplaintsView({ complaints, setComplaints, openId }) {
  const [modal, setModal] = useState(null)
  const [edit, setEdit] = useState(null)
  useEffect(() => {
    if (openId) { const item = complaints.find(x => x.id === openId); if (item) { setEdit(item); setModal('form') } }
  }, [openId])
  const statusOpts = ['접수','조사중','조치중','CAPA완료','종결']
  const init = { id:'', date:new Date().toISOString().slice(0,10), customer:'', content:'', severity:'중요', deadline:'', capa:'', status:'접수' }

  const save = (f) => {
    if (edit) { setComplaints(p=>p.map(x=>x.id===edit.id?{...x,...f}:x)); setEdit(null) }
    else { setComplaints(p=>[...p, { ...init, id:nid('CMP'), ...f }]) }
    setModal(null)
  }
  const del = (id) => { if(window.confirm('삭제하시겠습니까?')) setComplaints(p=>p.filter(x=>x.id!==id)) }
  const open = complaints.filter(c=>c.status!=='종결')

  return (
    <div>
      <SectionTitle breadcrumb="고객 불만">고객 불만 관리</SectionTitle>
      {open.length > 0 && (
        <div className="mb-4 p-3 rounded-lg flex items-start gap-2" style={{ background:'var(--rust-soft)', border:'1px solid var(--rust)' }}>
          <AlertTriangle size={14} style={{ color:'var(--rust)', marginTop:2, flexShrink:0 }}/>
          <div className="text-[12.5px]" style={{ color:'var(--rust)' }}>
            <b>미결 고객불만 {open.length}건</b> — CAPA 조치 기한 내 완료 필요 (ISO 13485 §8.2.1)
          </div>
        </div>
      )}
      <div className="rounded-xl p-4" style={{ background:'var(--bg-card)', border:'1px solid var(--line)' }}>
        <div className="flex items-center justify-between mb-4">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color:'var(--ink-faint)' }}>고객불만 목록 — {complaints.length}건</span>
          <button onClick={()=>{setEdit(null);setModal('form')}}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
            style={{ background:'var(--rust)', color:'white' }}>
            <Plus size={13}/> 불만 접수
          </button>
        </div>
        <div className="space-y-3">
          {complaints.length===0?<EmptyCard/>:complaints.map(c=>(
      <div key={c.id} className="p-3 rounded-xl" style={{ border:'1px solid var(--line)', background:'var(--bg)' }}>
              <div className="flex items-start gap-3 flex-wrap justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[11.5px] font-medium" style={{ color:'var(--rust)' }}>{c.id}</span>
                  <span className="text-[11px]" style={{ color:'var(--ink-faint)' }}>{c.date}</span>
                  <Badge text={c.customer} tone="gray"/>
                  <Badge text={c.severity} tone={c.severity==='심각'?'red':c.severity==='중요'?'amber':'gray'}/>
                </div>
                <div className="flex items-center gap-2">
                  <StatusSelect value={c.status} options={statusOpts}
                    onChange={v=>setComplaints(p=>p.map(x=>x.id===c.id?{...x,status:v}:x))}/>
                  <ActBtn label="수정" onClick={()=>{setEdit(c);setModal('form')}}/>
                  <ActBtn label="삭제" color="red" onClick={()=>del(c.id)}/>
                </div>
              </div>
              <div className="text-[13px]" style={{ color:'var(--ink)' }}>{c.content}</div>
              <div className="mt-1.5 flex items-center gap-3 text-[11.5px]" style={{ color:'var(--ink-mute)' }}>
                {c.capa && <span>CAPA: <span className="font-mono" style={{ color:'var(--moss)' }}>{c.capa}</span></span>}
                {c.deadline && <span>조치기한: {c.deadline}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
      {modal==='form' && (
        <Modal title={edit?'불만 수정':'고객불만 접수'} onClose={()=>{setModal(null);setEdit(null)}}>
          <ComplaintForm initial={edit||init} onSave={save} onCancel={()=>{setModal(null);setEdit(null)}} statusOpts={statusOpts}/>
        </Modal>
      )}
    </div>
  )
}
function ComplaintForm({ initial, onSave, onCancel, statusOpts }) {
  const [f, sf] = useState(initial)
  const set = k => e => sf(p=>({...p,[k]:e.target.value}))
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FL label="고객사 *"><input style={inp} value={f.customer} onChange={set('customer')} placeholder="고객사명"/></FL>
        <FL label="접수일"><input style={inp} type="date" value={f.date} onChange={set('date')}/></FL>
        <FL label="심각도">
          <select style={sel} value={f.severity} onChange={set('severity')}>
            {['경미','중요','심각'].map(o=><option key={o}>{o}</option>)}
          </select>
        </FL>
        <FL label="상태">
          <select style={sel} value={f.status} onChange={set('status')}>
            {statusOpts.map(o=><option key={o}>{o}</option>)}
          </select>
        </FL>
      </div>
      <FL label="불만 내용 *">
        <textarea style={{...inp,minHeight:'72px',resize:'vertical'}} value={f.content} onChange={set('content')} placeholder="불만 사항을 자세히 기입하세요"/>
      </FL>
      <div className="grid grid-cols-2 gap-3">
        <FL label="조치 기한"><input style={inp} type="date" value={f.deadline} onChange={set('deadline')}/></FL>
        <FL label="CAPA 번호"><input style={inp} value={f.capa} onChange={set('capa')} placeholder="CA-XXXX-XXX"/></FL>
      </div>
      <div className="flex gap-2 pt-2">
        <SBtn onClick={()=>f.customer&&f.content&&onSave(f)}>{initial.customer?'수정 저장':'접수 등록'}</SBtn>
        <SBtn onClick={onCancel} secondary>취소</SBtn>
      </div>
    </div>
  )
}

/* ─── 납품 이력 ─── */
function DeliveryView({ deliveries, setDeliveries, orders, openId }) {
  const [modal, setModal] = useState(null)
  const [edit, setEdit] = useState(null)
  useEffect(() => {
    if (openId) { const item = deliveries.find(x => x.id === openId); if (item) { setEdit(item); setModal('form') } }
  }, [openId])
  const init = { id:'', so:'', customer:'', items:'', date:new Date().toISOString().slice(0,10), lot:'', udi:'', status:'납품완료' }

  const save = (f) => {
    if (edit) { setDeliveries(p=>p.map(x=>x.id===edit.id?{...x,...f}:x)); setEdit(null) }
    else { setDeliveries(p=>[...p, { ...init, id:nid('DL'), ...f }]) }
    setModal(null)
  }
  const del = (id) => { if(window.confirm('삭제하시겠습니까?')) setDeliveries(p=>p.filter(x=>x.id!==id)) }

  return (
    <div>
      <SectionTitle breadcrumb="납품 이력">납품 이력</SectionTitle>
      <div className="rounded-xl p-4" style={{ background:'var(--bg-card)', border:'1px solid var(--line)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color:'var(--ink-faint)' }}>납품 이력 — UDI·Lot 추적 (ISO 13485 §7.5.3)</span>
          <button onClick={()=>{setEdit(null);setModal('form')}}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
            style={{ background:'var(--moss)', color:'var(--bg)' }}>
            <Plus size={13}/> 납품 등록
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              {['납품번호','SO','고객사','품목','납품일','LOT','UDI','상태','작업'].map(h=><TH key={h}>{h}</TH>)}
            </tr></thead>
            <tbody>
              {deliveries.length===0?<EmptyRow/>:deliveries.map(d=>(
      <tr key={d.id}>
                  <TD mono color="var(--moss)">{d.id}</TD>
                  <TD mono muted>{d.so}</TD>
                  <TD>{d.customer}</TD>
                  <TD muted>{d.items}</TD>
                  <TD mono muted>{d.date}</TD>
                  <TD mono muted>{d.lot}</TD>
                  <TD mono muted>{d.udi}</TD>
                  <TD><Badge text={d.status} tone="green"/></TD>
                  <TD>
                    <div className="flex gap-1">
                      <ActBtn label="수정" onClick={()=>{setEdit(d);setModal('form')}}/>
                      <ActBtn label="삭제" color="red" onClick={()=>del(d.id)}/>
                    </div>
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {modal==='form' && (
        <Modal title={edit?'납품 수정':'납품 등록'} onClose={()=>{setModal(null);setEdit(null)}}>
          <DeliveryForm initial={edit||init} orders={orders} onSave={save} onCancel={()=>{setModal(null);setEdit(null)}}/>
        </Modal>
      )}
    </div>
  )
}
function DeliveryForm({ initial, orders, onSave, onCancel }) {
  const [f, sf] = useState(initial)
  const set = k => e => sf(p=>({...p,[k]:e.target.value}))
  const selectSO = e => {
    const o = orders.find(x=>x.id===e.target.value)
    if (o) sf(p=>({...p, so:o.id, customer:o.customer, items:o.items}))
    else set('so')(e)
  }
  return (
    <div className="space-y-3">
      <FL label="수주번호 (SO)">
        <select style={sel} value={f.so} onChange={selectSO}>
          <option value="">직접 입력</option>
          {orders.map(o=><option key={o.id} value={o.id}>{o.id} — {o.customer}</option>)}
        </select>
      </FL>
      <div className="grid grid-cols-2 gap-3">
        <FL label="고객사"><input style={inp} value={f.customer} onChange={set('customer')} placeholder="고객사명"/></FL>
        <FL label="품목"><input style={inp} value={f.items} onChange={set('items')} placeholder="품목·수량"/></FL>
        <FL label="납품일"><input style={inp} type="date" value={f.date} onChange={set('date')}/></FL>
        <FL label="LOT 번호"><input style={inp} value={f.lot} onChange={set('lot')} placeholder="LOT-XXXX-XXX"/></FL>
        <FL label="UDI"><input style={inp} value={f.udi} onChange={set('udi')} placeholder="08806526XXXXXX"/></FL>
        <FL label="상태">
          <select style={sel} value={f.status} onChange={set('status')}>
            {['납품완료','반품','교환'].map(o=><option key={o}>{o}</option>)}
          </select>
        </FL>
      </div>
      <div className="flex gap-2 pt-2">
        <SBtn onClick={()=>f.customer&&onSave(f)}>{initial.customer?'수정 저장':'등록'}</SBtn>
        <SBtn onClick={onCancel} secondary>취소</SBtn>
      </div>
    </div>
  )
}

/* ─── 생산 요청 ─── */
function ProdRequestView({ prodReqs, setProdReqs, orders }) {
  const [modal, setModal] = useState(null)
  const [edit, setEdit] = useState(null)
  const statusOpts = ['WO대기','WO발행완료','생산중','완료','취소']
  const init = { id:'', so:'', item:'', qty:'', dueDate:'', priority:'보통', status:'WO대기' }

  const save = (f) => {
    if (edit) { setProdReqs(p=>p.map(x=>x.id===edit.id?{...x,...f}:x)); setEdit(null) }
    else { setProdReqs(p=>[...p, { ...init, id:nid('PR'), ...f }]) }
    setModal(null)
  }
  const del = (id) => { if(window.confirm('삭제하시겠습니까?')) setProdReqs(p=>p.filter(x=>x.id!==id)) }

  return (
    <div>
      <SectionTitle breadcrumb="생산 요청">생산 요청</SectionTitle>
      <div className="rounded-xl p-4" style={{ background:'var(--bg-card)', border:'1px solid var(--line)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color:'var(--ink-faint)' }}>수주 기반 생산 요청 목록</span>
          <button onClick={()=>{setEdit(null);setModal('form')}}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
            style={{ background:'var(--moss)', color:'var(--bg)' }}>
            <Plus size={13}/> 생산 요청
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              {['요청ID','SO','품목','수량','납기일','우선순위','상태','작업'].map(h=><TH key={h}>{h}</TH>)}
            </tr></thead>
            <tbody>
              {prodReqs.length===0?<EmptyRow/>:prodReqs.map(r=>(
      <tr key={r.id}>
                  <TD mono color="var(--moss)">{r.id}</TD>
                  <TD mono muted>{r.so}</TD>
                  <TD>{r.item}</TD>
                  <TD right>{r.qty}EA</TD>
                  <TD mono muted>{r.dueDate}</TD>
                  <TD><Badge text={r.priority} tone={r.priority==='긴급'?'red':'gray'}/></TD>
                  <TD>
                    <StatusSelect value={r.status} options={statusOpts}
                      onChange={v=>setProdReqs(p=>p.map(x=>x.id===r.id?{...x,status:v}:x))}/>
                  </TD>
                  <TD>
                    <div className="flex gap-1">
                      <ActBtn label="수정" onClick={()=>{setEdit(r);setModal('form')}}/>
                      <ActBtn label="삭제" color="red" onClick={()=>del(r.id)}/>
                    </div>
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {modal==='form' && (
        <Modal title={edit?'생산요청 수정':'생산 요청 등록'} onClose={()=>{setModal(null);setEdit(null)}}>
          <ProdReqForm initial={edit||init} orders={orders} onSave={save} onCancel={()=>{setModal(null);setEdit(null)}} statusOpts={statusOpts}/>
        </Modal>
      )}
    </div>
  )
}
function ProdReqForm({ initial, orders, onSave, onCancel, statusOpts }) {
  const [f, sf] = useState(initial)
  const set = k => e => sf(p=>({...p,[k]:e.target.value}))
  const selectSO = e => {
    const o = orders.find(x=>x.id===e.target.value)
    if(o) sf(p=>({...p, so:o.id, item:o.items, qty:o.qty?.replace('EA',''), dueDate:o.dueDate}))
    else set('so')(e)
  }
  return (
    <div className="space-y-3">
      <FL label="연계 수주 (SO)">
        <select style={sel} value={f.so} onChange={selectSO}>
          <option value="">직접 입력</option>
          {orders.map(o=><option key={o.id} value={o.id}>{o.id} — {o.customer} · {o.items}</option>)}
        </select>
      </FL>
      <div className="grid grid-cols-2 gap-3">
        <FL label="품목 *"><input style={inp} value={f.item} onChange={set('item')} placeholder="품목명"/></FL>
        <FL label="수량(EA)"><input style={inp} type="number" value={f.qty} onChange={set('qty')}/></FL>
        <FL label="납기일"><input style={inp} type="date" value={f.dueDate} onChange={set('dueDate')}/></FL>
        <FL label="우선순위">
          <select style={sel} value={f.priority} onChange={set('priority')}>
            {['긴급','높음','보통','낮음'].map(o=><option key={o}>{o}</option>)}
          </select>
        </FL>
        <FL label="상태">
          <select style={sel} value={f.status} onChange={set('status')}>
            {statusOpts.map(o=><option key={o}>{o}</option>)}
          </select>
        </FL>
      </div>
      <div className="flex gap-2 pt-2">
        <SBtn onClick={()=>f.item&&onSave(f)}>{initial.item?'수정 저장':'등록'}</SBtn>
        <SBtn onClick={onCancel} secondary>취소</SBtn>
      </div>
    </div>
  )
}

/* ─── 영업 실적 (읽기 전용 요약) ─── */
function PerformanceView({ orders, deliveries, complaints }) {
  const months = ['1월','2월','3월','4월','5월','6월']
  const total = orders.reduce((a,o)=>a+(Number(o.amount)||0),0)
  return (
    <div>
      <SectionTitle breadcrumb="영업 실적">영업 실적</SectionTitle>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label:'총 수주금액', value:(total/10000).toFixed(0)+'만원', tone:'green' },
          { label:'총 수주건수', value:orders.length+'건', tone:'blue' },
          { label:'납품완료', value:orders.filter(o=>o.status==='납품완료').length+'건', tone:'green' },
          { label:'고객불만 누계', value:complaints.length+'건', tone:complaints.length>0?'red':'green' },
        ].map(s=>(
          <div key={s.label} className="rounded-xl p-4" style={{background:'var(--bg-card)',border:'1px solid var(--line)'}}>
            <div className="text-[12px]" style={{color:'var(--ink-mute)'}}>{s.label}</div>
            <div className="text-[24px] font-bold mt-0.5" style={{color:s.tone==='red'?'var(--rust)':s.tone==='blue'?'#1d4ed8':'var(--moss)'}}>{s.value}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl p-4" style={{ background:'var(--bg-card)', border:'1px solid var(--line)' }}>
        <div className="font-mono text-[10px] tracking-widest uppercase mb-3" style={{ color:'var(--ink-faint)' }}>수주 상태 분포</div>
        {['수주접수','생산중','납품완료'].map(s=>{
          const cnt = orders.filter(o=>o.status===s).length
          const pct = orders.length ? (cnt/orders.length*100) : 0
          return (
            <div key={s} className="mb-2">
              <div className="flex justify-between text-[12px] mb-1">
                <span style={{color:'var(--ink-mute)'}}>{s}</span>
                <span style={{color:'var(--ink)'}}>{cnt}건</span>
              </div>
              <div className="rounded-full h-2" style={{background:'var(--bg-soft)'}}>
                <div className="rounded-full h-2 transition-all" style={{width:`${pct}%`,background:'var(--moss)'}}/>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── 영업 홈 ─── */

function MarketResView() {
  const [items, setItems] = useLS('qms_sal_mktres', [])
  const [modal, setModal] = useState(null)
  const [edit, setEdit] = useState(null)
  const [srch, setSrch] = useState('')

  const del = (id) => { if (window.confirm('삭제할까요?')) setItems(items.filter(i => i.id !== id)) }
  const save = (f) => {
    if (edit) {
      setItems(items.map(i => i.id === edit.id ? { ...f, id: edit.id, date: edit.date } : i))
    } else {
      const now = new Date()
      const yr = String(now.getFullYear()).slice(2)
      const mo = String(now.getMonth() + 1).padStart(2, '0')
      const dy = String(now.getDate()).padStart(2, '0')
      setItems([{ ...f, id: 'MR-' + Date.now().toString().slice(-6), date: yr + '-' + mo + '-' + dy }, ...items])
    }
    setModal(null); setEdit(null)
  }
  const shown = srch
    ? items.filter(i => [i.src, i.product, i.content, i.linkage].some(v => v && v.toLowerCase().includes(srch.toLowerCase())))
    : items

  return (
    <div>
      <SectionTitle breadcrumb="시장조사·고객요구">시장조사 · 고객 요구사항</SectionTitle>
      {modal === 'form' && (
        <Modal onClose={() => { setModal(null); setEdit(null) }}>
          <h3 className="font-medium text-[15px] mb-4" style={{ color: 'var(--ink)' }}>
            {edit ? '요구사항 수정' : '요구사항 등록'}
          </h3>
          <MarketResForm init={edit} onSave={save} />
        </Modal>
      )}
      <div className="mb-3 p-3 rounded-lg text-[12.5px]"
        style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink-mute)' }}>
        ℹ 고객·시장에서 수집된 요구사항은 제품 설계 입력(설계 계획)과 연동됩니다 · ISO 13485 §7.2.1
      </div>
      <div className="card-base p-4">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <input
            className="flex-1 min-w-[180px] text-xs rounded-lg px-3 py-1.5 outline-none"
            style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)' }}
            placeholder="출처 · 제품 · 내용 검색..."
            value={srch} onChange={e => setSrch(e.target.value)}
          />
          {srch && <button onClick={() => setSrch('')} className="text-xs px-2 rounded" style={{ color: 'var(--ink-mute)' }}>✕</button>}
          <ActBtn icon={Plus} onClick={() => setModal('form')}>등록</ActBtn>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['요구 출처', '제품 분류', '요구 내용', '등록일', '설계 연동', '처리 상태', ''].map(h => <TH key={h}>{h}</TH>)}
              </tr>
            </thead>
            <tbody>
              {shown.length === 0
                ? <EmptyRow msg={srch ? '검색 결과가 없습니다.' : '등록된 요구사항이 없습니다. 고객 요청이나 시장조사 결과를 등록하세요.'} />
                : shown.map(r => (
                <tr key={r.id}>
                  <TD>
                    <Badge
                      text={r.src}
                      tone={r.src === '고객요청' ? 'blue' : r.src === '시장조사' ? 'amber' : 'gray'}
                    />
                  </TD>
                  <TD color="var(--ink-mute)">{r.product || '—'}</TD>
                  <TD>{r.content}</TD>
                  <TD mono color="var(--ink-faint)">{r.date}</TD>
                  <TD mono color="var(--ink-faint)">{r.linkage || '—'}</TD>
                  <TD>
                    <Badge
                      text={r.state}
                      tone={r.state === '설계반영' ? 'green' : r.state === '설계진행중' ? 'amber' : r.state === '보류' ? 'red' : 'gray'}
                    />
                  </TD>
                  <TD>
                    <div className="flex gap-1">
                      <button
                        className="text-[11px] px-2 py-0.5 rounded"
                        style={{ background: 'var(--bg-soft)', color: 'var(--ink-mute)' }}
                        onClick={() => { setEdit(r); setModal('form') }}
                      >수정</button>
                      <button
                        className="text-[11px] px-2 py-0.5 rounded"
                        style={{ background: 'var(--rust-soft)', color: 'var(--rust)' }}
                        onClick={() => del(r.id)}
                      >삭제</button>
                    </div>
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function MarketResForm({ init, onSave }) {
  const [f, setF] = useState(init || { src: '고객요청', product: '', content: '', linkage: '', state: '검토중' })
  const up = (k, v) => setF(p => ({ ...p, [k]: v }))
  return (
    <div className="space-y-3">
      <FL label="요구 출처 *">
        <StatusSelect opts={['고객요청', '시장조사', '전시회', '내부검토']} val={f.src} onChange={v => up('src', v)} />
      </FL>
      <FL label="제품 분류">
        <input className="inp" value={f.product} onChange={e => up('product', e.target.value)} placeholder="예: 골절합용나사, 골절합용판" />
      </FL>
      <FL label="요구 내용 *">
        <textarea className="inp min-h-[72px] resize-none" value={f.content} onChange={e => up('content', e.target.value)} placeholder="고객 또는 시장에서 수집된 요구사항을 구체적으로 입력하세요" />
      </FL>
      <FL label="설계 연동">
        <input className="inp" value={f.linkage} onChange={e => up('linkage', e.target.value)} placeholder="예: 설계변경 #1, 신규 설계 계획" />
      </FL>
      <FL label="처리 상태">
        <StatusSelect opts={['검토중', '설계반영', '설계진행중', '보류']} val={f.state} onChange={v => up('state', v)} />
      </FL>
      <div className="flex justify-end pt-2">
        <button
          className="btn-secondary text-xs px-4 py-2"
          onClick={() => {
            if (!f.content.trim()) { alert('요구 내용을 입력하세요.'); return }
            onSave(f)
          }}
        >저장</button>
      </div>
    </div>
  )
}

function SalesHome({ customers, orders, complaints, deliveries, prodReqs, onNavigate }) {
  const active = orders.filter(o=>!['납품완료','취소'].includes(o.status)).length
  const [mktItems] = useLS('qms_sal_mktres', [])
  const openCmp = complaints.filter(c=>c.status!=='종결').length
  const CARDS = [
    { id:'customers', icon:Users, label:'고객사 관리', desc:'고객사 등록 · 등급 · 담당자 · 수주이력', count:`${customers.length}개사` },
    { id:'orders', icon:ClipboardList, label:'수주 관리', desc:'수주 목록 · WO 연동 · 상태 추적', count:`${active}건 진행중` },
    { id:'quotes', icon:FileText, label:'견적 관리', desc:'견적서 작성 · 발송 · 수주 전환', count:`${INIT_QUOTES.length}건` },
    { id:'complaints', icon:MessageSquare, label:'고객 불만', desc:'고객불만 접수 · CAPA 연동 · 종결 관리', count:`${openCmp}건 미결`, warn:openCmp>0 },
    { id:'delivery', icon:Truck, label:'납품 이력', desc:'납품 완료 · UDI·Lot 추적 · 증빙 관리', count:`${deliveries.length}건` },
    { id:'performance', icon:BarChart2, label:'영업 실적', desc:'수주·납품·민원 통계 요약', count:'집계' },
    { id:'prod-req', icon:ShoppingCart, label:'생산 요청', desc:'수주 기반 생산 요청 발행 · WO 연동', count:`${prodReqs.length}건` },
    { id:'market', icon:Search, label:'시장조사·고객요구', desc:'고객·시장 요구사항 수집 · 설계 입력 연동', count:`${mktItems.length}건` },
  ]
  const summary = [
    { label:'진행중 수주', value:`${active}건`, sub:'WO 연동 포함' },
    { label:'미결 고객불만', value:`${openCmp}건`, sub:'CAPA 조치중', warn:openCmp>0 },
    { label:'총 납품', value:`${deliveries.length}건`, sub:'UDI 추적 완료' },
    { label:'등록 고객사', value:`${customers.length}개사`, sub:`활성 ${customers.filter(c=>c.status==='활성').length}개사` },
  ]
  return (
    <div>
      <div className="mb-5">
        <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color:'var(--moss)' }}>SAL · ISO 13485 §7.2 · §8.2.1</span>
        <div className="text-[26px] mt-1 font-semibold" style={{ color:'var(--ink)' }}>영업</div>
        <div className="text-[12.5px] mt-0.5" style={{ color:'var(--ink-mute)' }}>고객사 통합 현황 · 수주에서 납품까지 추적</div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {summary.length===0?<EmptyCard/>:summary.map(s=>(
      <div key={s.label} className="rounded-xl p-4" style={{background:'var(--bg-card)',border:'1px solid var(--line)'}}>
            <div className="text-[12px] mb-1" style={{ color:'var(--ink-mute)' }}>{s.label}</div>
            <div className="text-[24px] font-bold" style={{ color:s.warn?'var(--rust)':'var(--moss)' }}>{s.value}</div>
            <div className="text-[11px] mt-0.5" style={{ color:'var(--ink-faint)' }}>{s.sub}</div>
          </div>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {CARDS.map(card=>(
          <button key={card.id} onClick={()=>onNavigate(card.id)}
            className="rounded-xl p-4 text-left transition hover:shadow-md"
            style={{background:'var(--bg-card)',border:`1px solid ${card.warn?'var(--rust)':'var(--line)'}`}}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background:card.warn?'var(--rust-soft)':'var(--leaf-soft)' }}>
                <card.icon size={18} style={{ color:card.warn?'var(--rust)':'var(--moss)' }} strokeWidth={1.7}/>
              </div>
              <span className="text-[13px] font-bold" style={{ color:card.warn?'var(--rust)':'var(--moss)' }}>{card.count}</span>
            </div>
            <div className="text-[13.5px] font-semibold" style={{ color:'var(--ink)' }}>{card.label}</div>
            <div className="text-[12px] mt-1" style={{ color:'var(--ink-mute)' }}>{card.desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─── 메인 ─── */
export default function SalesHub() {
  const user = auth.current()
  const [searchParams] = useSearchParams()
  const [view, setView] = useState(searchParams.get('tab') || 'home')
  const editId = searchParams.get('edit')

  const [customers, setCustomers] = useLS('qms_sal_customers', INIT_CUSTOMERS)
  const [orders, setOrders] = useLS('qms_sal_orders', INIT_ORDERS)
  const [quotes, setQuotes] = useLS('qms_sal_quotes', INIT_QUOTES)
  const [complaints, setComplaints] = useLS('qms_sal_complaints', INIT_COMPLAINTS)
  const [deliveries, setDeliveries] = useLS('qms_sal_deliveries', INIT_DELIVERIES)
  const [prodReqs, setProdReqs] = useLS('qms_sal_prodreqs', INIT_PRODREQS)

  const tabLabels = {
    customers:'고객사 관리', orders:'수주 관리', quotes:'견적 관리',
    complaints:'고객 불만', delivery:'납품 이력', performance:'영업 실적', 'prod-req':'생산 요청', 'market':'시장조사·고객요구',
  }

  const viewMap = {
    home: <SalesHome customers={customers} orders={orders} complaints={complaints}
                     deliveries={deliveries} prodReqs={prodReqs} onNavigate={setView}/>,
    customers: <CustomersView customers={customers} setCustomers={setCustomers}/>,
    orders: <OrdersView orders={orders} setOrders={setOrders} customers={customers} openId={editId}/>,
    quotes: <QuotesView quotes={quotes} setQuotes={setQuotes} customers={customers}/>,
    complaints: <ComplaintsView complaints={complaints} setComplaints={setComplaints} openId={editId}/>,
    delivery: <DeliveryView deliveries={deliveries} setDeliveries={setDeliveries} orders={orders} openId={editId}/>,
    performance: <PerformanceView orders={orders} deliveries={deliveries} complaints={complaints}/>,
    'prod-req': <ProdRequestView prodReqs={prodReqs} setProdReqs={setProdReqs} orders={orders}/>,
    'market': <MarketResView />,
  }

  return (
    <AppLayout user={user} title="영업" subtitle="고객사 관리 · 수주 · 납품 · 고객불만">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto">
        {view!=='home' && (
          <button onClick={()=>setView('home')}
            className="flex items-center gap-1.5 mb-5 text-[13px]"
            style={{ color:'var(--moss)' }}>
            <ArrowLeft size={14}/> 영업 홈
          </button>
        )}
        {view!=='home' && (
          <div className="flex gap-1 flex-wrap mb-5">
            {Object.entries(tabLabels).map(([id,label])=>(
              <button key={id} onClick={()=>setView(id)}
                className="text-[12px] px-3 py-1.5 rounded-lg border transition"
                style={{
                  background:view===id?'var(--moss)':'var(--bg-card)',
                  color:view===id?'var(--bg)':'var(--ink-mute)',
                  borderColor:view===id?'var(--moss)':'var(--line)',
                }}>{label}</button>
            ))}
          </div>
        )}
        {viewMap[view] || viewMap.home}
      </div>
    </AppLayout>
  )
}
