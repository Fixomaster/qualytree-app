import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Package,
  ClipboardList,
  FileText,
  AlertTriangle,
  ArrowLeft,
  Plus,
  X,
  ShoppingBag,
  Star,
  Archive,
  CheckCircle,
  ShoppingCart,
  ExternalLink,
  Printer,
  UserCheck,
  ClipboardCheck,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'
import { suppliers } from '../../lib/supplierState'
import { requestProductionForFinItem } from '../../lib/orderFulfillment'
import { onboarding } from '../../lib/onboardingState'
import { deriveInspectionStandards, evalAgainstSpec } from '../../lib/inspectionStandardConstants'
import { printIqcCert } from '../../lib/pdfPrint'

/* ─── util ─── */
function useLS(key, init) {
  const [v, setV] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw != null) return JSON.parse(raw)
      localStorage.setItem(key, JSON.stringify(init))
      return init
    } catch { return init }
  })
  const set = (u) => { const n=typeof u==='function'?u(v):u; localStorage.setItem(key,JSON.stringify(n)); setV(n) }
  return [v, set]
}
const nid = (p) => `${p}-${new Date().toISOString().slice(2,4)}${String(new Date().getMonth()+1).padStart(2,'0')}-${String(Date.now()).slice(-3)}`
// 'YY-MM-DD'(레거시)와 'YYYY-MM-DD'(날짜 입력 필드) 두 형식을 모두 안전하게 Date로 변환한다.
function toDate(s) {
  if (!s) return null
  const parts = String(s).split('-')
  const d = parts.length === 3 && parts[0].length === 2 ? new Date(`20${s}`) : new Date(s)
  return isNaN(d.getTime()) ? null : d
}
// 발주(PO)가 납기예정일을 넘겼는데 아직 입고완료/취소되지 않은 경우 지연으로 간주
function isOrderOverdue(order) {
  const d = toDate(order.dueDate)
  if (!d || ['입고완료','반납','취소'].includes(order.status)) return false
  const today = new Date(); today.setHours(0,0,0,0)
  return d < today
}
const inp = { width:'100%', padding:'7px 10px', borderRadius:'7px', border:'1px solid var(--line)', background:'var(--bg)', color:'var(--ink)', fontSize:'13px', outline:'none' }
const sel = { ...inp, appearance:'none' }

const Badge = ({ text, tone='gray' }) => {
  const c = { red:{bg:'var(--rust-soft)',fg:'var(--rust)'}, green:{bg:'var(--leaf-soft)',fg:'var(--moss)'}, amber:{bg:'#fff7ed',fg:'#b45309'}, blue:{bg:'#eff6ff',fg:'#1d4ed8'}, gray:{bg:'var(--bg-soft)',fg:'var(--ink-mute)'} }[tone] ?? {bg:'var(--bg-soft)',fg:'var(--ink-mute)'}
  return <span className="font-mono text-[10px] tracking-wider px-1.5 py-0.5 rounded" style={{background:c.bg,color:c.fg,fontWeight:500}}>{text}</span>
}
const statusTone = (s='') => {
  if(s.includes('부족')||s.includes('불합격')||s.includes('불량')||s.includes('취소')) return 'red'
  if(s.includes('조건부')||s.includes('예정')||s.includes('진행')||s.includes('발주')||s==='B등급') return 'amber'
  if(s.includes('완료')||s.includes('합격')||s.includes('등록')||s==='A등급'||s==='정상') return 'green'
  return 'gray'
}
const TH = ({children}) => <th className="pb-2 text-left font-medium px-2 first:pl-0 whitespace-nowrap text-[11.5px]" style={{color:'var(--ink-faint)',borderBottom:'1px solid var(--line)'}}>{children}</th>
const TD = ({children,mono,color,right,muted}) => <td className={`py-2 px-2 first:pl-0 text-[12.5px]${mono?' font-mono text-[11px]':''}${right?' text-right tabular-nums':''}`} style={{color:color||(muted?'var(--ink-mute)':'var(--ink)'),borderBottom:'1px solid var(--line)'}}>{children}</td>
const ActBtn = ({label,color,onClick}) => <button onClick={onClick} className="text-[11px] px-2 py-0.5 rounded transition hover:opacity-80" style={{background:color==='red'?'var(--rust-soft)':color==='green'?'var(--leaf-soft)':'var(--bg-soft)',color:color==='red'?'var(--rust)':color==='green'?'var(--moss)':'var(--ink-mute)',fontWeight:500}}>{label}</button>
const SBtn = ({children,onClick,secondary}) => <button onClick={onClick} className="px-4 py-2 rounded-lg text-[13px] font-medium transition" style={{background:secondary?'var(--bg-soft)':'var(--moss)',color:secondary?'var(--ink-mute)':'var(--bg)'}}>{children}</button>
const FL = ({label,children}) => <div><div className="text-[11.5px] font-medium mb-1" style={{color:'var(--ink-mute)'}}>{label}</div>{children}</div>

function EmptyRow({cols,msg}){return(<tr><td colSpan={cols||20} className="py-10 text-center text-sm" style={{color:"var(--ink-mute)"}}>{msg||"등록된 항목이 없습니다."}</td></tr>)}
function EmptyCard({msg}){return(<div className="py-10 text-center text-sm" style={{color:"var(--ink-mute)"}}>{msg||"등록된 항목이 없습니다."}</div>)}

function Modal({title,onClose,children,wide}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.45)'}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className={`rounded-2xl p-6 w-full ${wide?'max-w-2xl':'max-w-lg'} max-h-[92vh] overflow-y-auto`} style={{background:'var(--bg-card)',boxShadow:'0 24px 64px rgba(0,0,0,0.18)',border:'1px solid var(--line)'}}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[17px] font-semibold" style={{color:'var(--ink)'}}>{title}</h3>
          <button onClick={onClose} style={{color:'var(--ink-faint)'}}><X size={18}/></button>
        </div>
        {children}
      </div>
    </div>
  )
}
const StatusSelect = ({value,options,onChange}) => (
  <select value={value} onChange={e=>onChange(e.target.value)} style={{...sel,padding:'3px 6px',fontSize:'11px',width:'auto'}}>
    {options.map(o=><option key={o}>{o}</option>)}
  </select>
)
const SectionTitle = ({children,breadcrumb}) => (
  <div className="mb-5">
    {breadcrumb&&<div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-1" style={{color:'var(--ink-faint)'}}>구매자재 / {breadcrumb}</div>}
    <h2 className="text-[22px]" style={{color:'var(--ink)',fontWeight:500}}>{children}</h2>
  </div>
)
const Card = ({children}) => <div className="rounded-xl p-4" style={{background:'var(--bg-card)',border:'1px solid var(--line)'}}>{children}</div>

/* ─── 초기 데이터 ─── */
const INIT_AVL = [
  {id:'V-001',name:'대한금속㈜',items:'Ti-6Al-4V 봉재, SCS 반제품',cert:'ISO 13485',grade:'A',lastAudit:'24-03-15',nextAudit:'25-03-15',status:'등록'},
  {id:'V-002',name:'한국폴리머㈜',items:'BPL 원료(UHMWPE)',cert:'ISO 9001',grade:'A',lastAudit:'24-01-22',nextAudit:'25-01-22',status:'등록'},
  {id:'V-003',name:'우정정밀㈜',items:'SCS 기계가공 외주',cert:'KS Q ISO 9001',grade:'B',lastAudit:'23-11-10',nextAudit:'24-11-10',status:'조건부등록'},
  {id:'V-004',name:'세진코팅㈜',items:'표면처리(아노다이징)',cert:'ISO 9001',grade:'B',lastAudit:'23-09-28',nextAudit:'24-09-28',status:'등록'},
  {id:'V-005',name:'태양포장㈜',items:'UDI 라벨, 멸균 파우치',cert:'ISO 15223',grade:'A',lastAudit:'24-04-03',nextAudit:'25-04-03',status:'등록'},
]
const INIT_ORDERS = [
  {id:'PO-2406-009',vendor:'대한금속㈜',items:'Ti-6Al-4V 봉재 φ12mm',qty:'10kg',date:'24-06-18',dueDate:'24-06-28',amount:'850000',status:'발주완료'},
  {id:'PO-2406-008',vendor:'한국폴리머㈜',items:'UHMWPE 원료 GUR1020',qty:'5kg',date:'24-06-15',dueDate:'24-07-01',amount:'420000',status:'입고예정'},
  {id:'PO-2406-007',vendor:'우정정밀㈜',items:'SCS M3.5 반제품 가공',qty:'500EA',date:'24-06-12',dueDate:'24-06-25',amount:'2500000',status:'진행중'},
  {id:'PO-2406-006',vendor:'태양포장㈜',items:'UDI 라벨 8806526시리즈',qty:'2,000매',date:'24-06-10',dueDate:'24-06-20',amount:'180000',status:'입고완료'},
]
const INIT_INVENTORY = [
  {id:'MAT-001',name:'Ti-6Al-4V 봉재 φ12mm',unit:'kg',stock:'24.5',min:'10',location:'A-01-03',lot:'LOT-2406-012',status:'정상'},
  {id:'MAT-002',name:'UHMWPE GUR1020',unit:'kg',stock:'3.2',min:'5',location:'A-02-01',lot:'LOT-2405-008',status:'부족'},
  {id:'MAT-003',name:'SCS M3.5 반제품',unit:'EA',stock:'320',min:'100',location:'B-01-02',lot:'LOT-2405-015',status:'정상'},
  {id:'MAT-004',name:'UDI 라벨 (8806526)',unit:'매',stock:'180',min:'500',location:'C-02-01',lot:'LOT-2406-0 3',status:'부족'},
  {id:'MAT-005',name:'멸균 파우치 85×210mm',unit:'EA',stock:'2400',min:'1000',location:'C-01-03',lot:'LOT-2406-005',status:'정상'},
]
const INIT_IQC = [
  {id:'IQC-2406-015',date:'24-06-20',po:'PO-2406-006',vendor:'태양포장㈜',items:'UDI 라벨',qty:'2,000매',inspector:'김검사',nc:'—',status:'합격'},
  {id:'IQC-2406-014',date:'24-06-18',po:'PO-2406-005',vendor:'세진코팅㈜',items:'아노다이징 처리품',qty:'200EA',inspector:'이검사',nc:'NC-2406-0 3',status:'조건부'},
  {id:'IQC-2406-013',date:'24-06-15',po:'PO-2406-004',vendor:'대한금속㈜',items:'Ti봉재 φ10mm',qty:'8kg',inspector:'김검사',nc:'—',status:'합격'},
]
const INIT_FIN = [
  {id:'FP-SCS-3522',name:'SCS M3.5×22mm',unit:'EA',stock:'125',min:'50',lot:'LOT-2406-045',expiry:'2029-06',udi:'08806526001234',status:'정상'},
  {id:'FP-SCS-3524',name:'SCS M3.5×24mm',unit:'EA',stock:'45',min:'50',lot:'LOT-2406-043',expiry:'2029-06',udi:'08806526001187',status:'부족'},
  {id:'FP-SCS-4022',name:'SCS M4.0×22mm',unit:'EA',stock:'200',min:'50',lot:'LOT-2406-040',expiry:'2029-05',udi:'08806526001180',status:'정상'},
  {id:'FP-BPL-3',name:'BPL 3㎖',unit:'EA',stock:'68',min:'30',lot:'LOT-2406-035',expiry:'2028-12',udi:'08806526001124',status:'정상'},
]

/* ─── AVL 협력업체 ─── */
function AvlView({avl,setAvl}) {
  const [modal,setModal]=useState(null); const [edit,setEdit]=useState(null)
  const [srch,setSrch]=useState('')
  const statusOpts=['등록','조건부등록','일시정지','삭제']
  const del=id=>{if(window.confirm('삭제하시겠습니까?'))setAvl(p=>p.filter(x=>x.id!==id))}
  const save=f=>{if(edit){setAvl(p=>p.map(x=>x.id===edit.id?{...x,...f}:x));setEdit(null)}else{setAvl(p=>[...p,{id:nid('V'),...f}])};setModal(null)}
  const shown=srch
    ? avl.filter(v=>[v.id,v.name,v.items,v.cert,v.grade,v.status].some(x=>x&&String(x).toLowerCase().includes(srch.toLowerCase())))
    : avl
  return (
    <div>
      <SectionTitle breadcrumb="협력업체 관리 (AVL)">협력업체 관리 (AVL)</SectionTitle>
      <Card>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{color:'var(--ink-faint)'}}>AVL (ISO 13485 §7.4.1) — {avl.length}개사</span>
          <button onClick={()=>{setEdit(null);setModal('form')}} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium" style={{background:'var(--moss)',color:'var(--bg)'}}><Plus size={13}/> 업체 등록</button>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <input className="flex-1 text-xs rounded-lg px-3 py-1.5 outline-none" style={{background:'var(--bg-soft)',border:'1px solid var(--line)',color:'var(--ink)'}} placeholder="코드 · 업체명 · 공급품목 · 인증 · 등급 · 상태 검색..." value={srch} onChange={e=>setSrch(e.target.value)}/>
          {srch&&<button onClick={()=>setSrch('')} className="text-xs px-2 rounded" style={{color:'var(--ink-mute)'}}>✕</button>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['코드','업체명','공급품목','인증','등급','최근심사','차기심사','상태','작업'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>{shown.length===0?<EmptyRow msg={srch?'검색 결과가 없습니다.':undefined}/>:shown.map(v=>(
      <tr key={v.id}>
                <TD mono color="var(--moss)">{v.id}</TD>
                <TD><span className="font-medium">{v.name}</span></TD>
                <TD muted>{v.items}</TD>
                <TD><Badge text={v.cert} tone="blue"/></TD>
                <TD><Badge text={v.grade+'등급'} tone={v.grade==='A'?'green':'amber'}/></TD>
                <TD mono muted>{v.lastAudit}</TD>
                <TD mono muted>{v.nextAudit}</TD>
                <TD><StatusSelect value={v.status} options={statusOpts} onChange={sv=>setAvl(p=>p.map(x=>x.id===v.id?{...x,status:sv}:x))}/></TD>
                <TD><div className="flex gap-1"><ActBtn label="수정" onClick={()=>{setEdit(v);setModal('form')}}/><ActBtn label="삭제" color="red" onClick={()=>del(v.id)}/></div></TD>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
      {modal==='form'&&<Modal title={edit?'업체 수정':'업체 등록'} onClose={()=>{setModal(null);setEdit(null)}}><AvlForm initial={edit||{}} onSave={save} onCancel={()=>{setModal(null);setEdit(null)}} statusOpts={statusOpts}/></Modal>}
    </div>
  )
}
function AvlForm({initial,onSave,onCancel,statusOpts}) {
  const [f,sf]=useState({name:'',items:'',cert:'ISO 9001',grade:'A',lastAudit:'',nextAudit:'',status:'등록',...initial})
  const set=k=>e=>sf(p=>({...p,[k]:e.target.value}))
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FL label="업체명 *">
          <input style={inp} value={f.name} onChange={set('name')} placeholder="예) 대한금속㈜" list="avl-supplier-name-list"/>
          <datalist id="avl-supplier-name-list">{suppliers.getSuppliers().map(s => <option key={s.id} value={s.name} />)}</datalist>
        </FL>
        <FL label="인증서"><input style={inp} value={f.cert} onChange={set('cert')} placeholder="ISO 13485"/></FL>
        <FL label="공급품목 *"><input style={inp} value={f.items} onChange={set('items')} placeholder="주요 공급 품목"/></FL>
        <FL label="등급"><select style={sel} value={f.grade} onChange={set('grade')}>{['A','B','C'].map(o=><option key={o}>{o}</option>)}</select></FL>
        <FL label="최근 심사일"><input style={inp} type="date" value={f.lastAudit} onChange={set('lastAudit')}/></FL>
        <FL label="차기 심사일"><input style={inp} type="date" value={f.nextAudit} onChange={set('nextAudit')}/></FL>
        <FL label="상태"><select style={sel} value={f.status} onChange={set('status')}>{statusOpts.map(o=><option key={o}>{o}</option>)}</select></FL>
      </div>
      <div className="flex gap-2 pt-2"><SBtn onClick={()=>f.name&&f.items&&onSave(f)}>{initial.name?'수정 저장':'등록'}</SBtn><SBtn onClick={onCancel} secondary>취소</SBtn></div>
    </div>
  )
}

/* ─── 발주 관리 ─── */
function OrdersView({orders,setOrders,avl,inventory,setInventory,openId}) {
  const [modal,setModal]=useState(null); const [edit,setEdit]=useState(null)
  const [srch,setSrch]=useState('')
  useEffect(() => {
    if (openId) { const item = orders.find(x => x.id === openId); if (item) { setEdit(item); setModal('form') } }
  }, [openId])
  const ORDER_STATUS_TONE={'발주완료':'gray','입고완료':'green','반납':'red','취소':'gray'}
  const addNewItem = (name) => { setInventory(p=>[...p,{id:nid('MAT'),name,unit:'EA',stock:'0',min:'0',location:'',lot:'',status:'부족'}]) }
  const del=id=>{if(window.confirm('삭제하시겠습니까?'))setOrders(p=>p.filter(x=>x.id!==id))}
  const save=f=>{
    if(edit){
      setOrders(p=>p.map(x=>x.id===edit.id?{...x,...f}:x))
      setEdit(null)
    }else{
      const newId = nid('PO')
      setOrders(p=>[...p,{id:newId,date:new Date().toISOString().slice(0,10),...f}])
    }
    setModal(null)
  }
  const overdue=orders.filter(isOrderOverdue)
  const shown=srch
    ? orders.filter(o=>[o.id,o.vendor,o.items,o.status].some(v=>v&&String(v).toLowerCase().includes(srch.toLowerCase())))
    : orders
  return (
    <div>
      <SectionTitle breadcrumb="발주 관리">발주 관리 (PO)</SectionTitle>
      {overdue.length>0&&(
        <div className="mb-4 p-3 rounded-lg flex items-start gap-2" style={{background:'var(--rust-soft)',border:'1px solid var(--rust)'}}>
          <AlertTriangle size={14} style={{color:'var(--rust)',marginTop:2,flexShrink:0}}/>
          <span className="text-[12.5px]" style={{color:'var(--rust)'}}><b>납기 지연 {overdue.length}건</b> — 납기예정일이 지났습니다: {overdue.map(o=>o.id).join(', ')}</span>
        </div>
      )}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{color:'var(--ink-faint)'}}>발주 목록 (ISO 13485 §7.4.2) — {orders.length}건</span>
          <button onClick={()=>{setEdit(null);setModal('form')}} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium" style={{background:'var(--moss)',color:'var(--bg)'}}><Plus size={13}/> 발주 등록</button>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <input className="flex-1 text-xs rounded-lg px-3 py-1.5 outline-none" style={{background:'var(--bg-soft)',border:'1px solid var(--line)',color:'var(--ink)'}} placeholder="PO번호 · 협력업체 · 품목 · 상태 검색..." value={srch} onChange={e=>setSrch(e.target.value)}/>
          {srch&&<button onClick={()=>setSrch('')} className="text-xs px-2 rounded" style={{color:'var(--ink-mute)'}}>✕</button>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['PO번호','협력업체','품목','수량','발주일','납기예정일','금액(원)','상태','작업'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>{shown.length===0?<EmptyRow msg={srch?'검색 결과가 없습니다.':undefined}/>:shown.map(o=>(
      <tr key={o.id}>
                <TD mono color="var(--moss)">{o.id}</TD>
                <TD>{o.vendor}</TD>
                <TD muted>{o.items}</TD>
                <TD right>{o.qty}</TD>
                <TD mono muted>{o.date}</TD>
                <TD mono color={isOrderOverdue(o)?'var(--rust)':undefined} muted={!isOrderOverdue(o)}>{o.dueDate}{isOrderOverdue(o)?' (지연)':''}</TD>
                <TD right>{Number(o.amount).toLocaleString()}</TD>
                <TD><Badge text={o.status} tone={ORDER_STATUS_TONE[o.status]||'amber'}/></TD>
                <TD><div className="flex gap-1"><ActBtn label="수정" onClick={()=>{setEdit(o);setModal('form')}}/><ActBtn label="삭제" color="red" onClick={()=>del(o.id)}/></div></TD>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
      {modal==='form'&&<Modal title={edit?'발주 수정':'발주 등록'} onClose={()=>{setModal(null);setEdit(null)}}><PoForm initial={edit||{}} avl={avl} inventory={inventory} onAddItem={addNewItem} onSave={save} onCancel={()=>{setModal(null);setEdit(null)}}/></Modal>}
    </div>
  )
}
function PoForm({initial,avl,inventory,onAddItem,onSave,onCancel}) {
  const [f,sf]=useState({vendor:'',items:'',qty:'',date:new Date().toISOString().slice(0,10),dueDate:'',unitPrice:'',amount:'',status:'발주완료',...initial})
  const [added,setAdded]=useState(false)
  const set=k=>e=>sf(p=>({...p,[k]:e.target.value}))
  const itemExists = inventory.some(m=>m.name.trim().toLowerCase()===f.items.trim().toLowerCase())
  const registerItem = () => { if(!f.items.trim()) return; onAddItem(f.items.trim()); setAdded(true) }
  // 수량(예: "500EA")에서 숫자만 뽑아 단가 × 수량으로 금액을 자동 계산한다.
  const qtyNum = parseFloat(String(f.qty).replace(/,/g,'')) || 0
  const unitPriceNum = parseFloat(f.unitPrice) || 0
  const setUnitPrice = e => {
    const v = e.target.value
    sf(p => ({ ...p, unitPrice: v, amount: (qtyNum && parseFloat(v)) ? String(qtyNum * parseFloat(v)) : p.amount }))
  }
  const setQty = e => {
    const v = e.target.value
    const n = parseFloat(String(v).replace(/,/g,'')) || 0
    sf(p => ({ ...p, qty: v, amount: (n && unitPriceNum) ? String(n * unitPriceNum) : p.amount }))
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FL label="협력업체 * (검색)">
          <input style={inp} list="po-vendor-list" value={f.vendor} onChange={set('vendor')} placeholder="업체명 입력·검색..."/>
          <datalist id="po-vendor-list">{avl.map(v=><option key={v.id} value={v.name}/>)}</datalist>
        </FL>
        <FL label="수량"><input style={inp} value={f.qty} onChange={setQty} placeholder="예) 500EA, 10kg"/></FL>
        <FL label="품목 * (검색)">
          <input style={inp} list="po-item-list" value={f.items} onChange={e=>{set('items')(e);setAdded(false)}} placeholder="품목명 및 규격 입력·검색..."/>
          <datalist id="po-item-list">{inventory.map(m=><option key={m.id} value={m.name}/>)}</datalist>
          {f.items.trim() && !itemExists && !added && (
            <button type="button" onClick={registerItem} className="mt-1 text-[11px] px-2 py-1 rounded-lg" style={{background:'var(--bg-soft)',color:'var(--moss)',border:'1px solid var(--line)',cursor:'pointer'}}>
              + '{f.items.trim()}' 자재 목록에 신규 품목으로 등록
            </button>
          )}
          {added && <div className="text-[11px] mt-1" style={{color:'var(--moss)'}}>✓ 자재 목록에 등록되었습니다</div>}
        </FL>
        <FL label="발주일"><input style={inp} type="date" value={f.date} onChange={set('date')}/></FL>
        <FL label="납기예정일"><input style={inp} type="date" value={f.dueDate} onChange={set('dueDate')}/></FL>
        <FL label="단가(원)"><input style={inp} type="number" value={f.unitPrice} onChange={setUnitPrice} placeholder="개당 단가"/></FL>
        <FL label="금액(원) — 단가×수량 자동계산"><input style={inp} type="number" value={f.amount} onChange={set('amount')}/></FL>
      </div>
      <div className="flex gap-2 pt-2"><SBtn onClick={()=>f.vendor&&f.items&&onSave(f)}>{initial.vendor?'수정 저장':'등록'}</SBtn><SBtn onClick={onCancel} secondary>취소</SBtn></div>
    </div>
  )
}


/* ─── 재고 관리 ─── */
function genLot() {
  const d = new Date()
  const ymd = d.toISOString().slice(2,10).replace(/-/g,'')
  return `LOT-${ymd}-${String(Date.now()).slice(-3)}`
}
function InventoryView({inventory,setInventory,orders,setOrders,openId,setIqc,avl}) {
  const [modal,setModal]=useState(null); const [edit,setEdit]=useState(null)
  const [receiveTarget,setReceiveTarget]=useState(null)
  const [issueTarget,setIssueTarget]=useState(null)
  const [zeroOnly,setZeroOnly]=useState(false)
  const [supplierFilter,setSupplierFilter]=useState('all')
  useEffect(() => {
    if (openId) { const item = inventory.find(x => x.id === openId); if (item) { setEdit(item); setModal('form') } }
  }, [openId])
  const del=id=>{if(window.confirm('삭제하시겠습니까?'))setInventory(p=>p.filter(x=>x.id!==id))}
  const save=f=>{
    const status=parseFloat(f.stock)<parseFloat(f.min)?'부족':'정상'
    if(edit){setInventory(p=>p.map(x=>x.id===edit.id?{...x,...f,status}:x));setEdit(null)}
    else{setInventory(p=>[...p,{id:nid('MAT'),...f,status}])}
    setModal(null)
  }
  const receive=f=>{
    setInventory(p=>p.map(m=>{
      if(m.id!==receiveTarget.id) return m
      const newStock=(parseFloat(m.stock)||0)+(parseFloat(f.qty)||0)
      const status=newStock<parseFloat(m.min)?'부족':'정상'
      const receipts=[...(m.receipts||[]),{id:nid('RCV'),date:f.date,qty:f.qty,lot:f.lot,certNo:f.certNo,poId:f.poId,poVendor:f.poVendor}]
      return {...m,stock:String(newStock),lot:f.lot,status,receipts}
    }))
    if(f.poId) setOrders(p=>p.map(o=>o.id===f.poId?{...o,status:'입고완료'}:o))
    // 자재 입고 시 수입검사(IQC) 목록을 "검사대기" 상태로 자동 생성 (#88, #89)
    if(setIqc){
      setIqc(p=>[{
        id:nid('IQC'), date:f.date, po:f.poId||'', vendor:f.poVendor||'', items:receiveTarget.name,
        qty:f.qty, materialId:receiveTarget.id, lot:f.lot, certNo:f.certNo,
        inspector:'', nc:'—', status:'검사대기', checkResults:[], overallResult:null, qcDecision:null,
      }, ...p])
    }
    setReceiveTarget(null)
  }
  const issue=f=>{
    setInventory(p=>p.map(m=>{
      if(m.id!==issueTarget.id) return m
      const newStock=Math.max(0,(parseFloat(m.stock)||0)-(parseFloat(f.qty)||0))
      const status=newStock<parseFloat(m.min)?'부족':'정상'
      const issues=[...(m.issues||[]),{id:nid('ISS'),date:f.date,qty:f.qty,reason:f.reason,notes:f.notes}]
      return {...m,stock:String(newStock),status,issues}
    }))
    setIssueTarget(null)
  }
  const shortfall=inventory.filter(i=>i.status==='부족')
  const zeroStock=inventory.filter(i=>parseFloat(i.stock)===0)
  const [srch,setSrch]=useState('')
  let shown=srch
    ? inventory.filter(m=>[m.id,m.name,m.location,m.lot,m.status,m.supplier].some(v=>v&&String(v).toLowerCase().includes(srch.toLowerCase())))
    : inventory
  if(zeroOnly) shown=shown.filter(m=>parseFloat(m.stock)===0)
  if(supplierFilter!=='all') shown=shown.filter(m=>m.supplier===supplierFilter)
  // #48 — 자재를 공급업체별로 묶어서 볼 수 있도록 공급업체 목록을 도출
  const supplierNames=[...new Set(inventory.map(m=>m.supplier).filter(Boolean))]
  return (
    <div>
      <SectionTitle breadcrumb="자재 현황">자재 현황</SectionTitle>
      {shortfall.length>0&&(
        <div className="mb-4 p-3 rounded-lg flex items-start gap-2" style={{background:'var(--rust-soft)',border:'1px solid var(--rust)'}}>
          <AlertTriangle size={14} style={{color:'var(--rust)',marginTop:2,flexShrink:0}}/>
          <span className="text-[12.5px]" style={{color:'var(--rust)'}}><b>안전재고 미만 {shortfall.length}개 품목</b> — {shortfall.map(i=>i.name).join(', ')}</span>
        </div>
      )}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{color:'var(--ink-faint)'}}>자재 재고 현황 (공급업체별)</span>
          <button onClick={()=>{setEdit(null);setModal('form')}} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium" style={{background:'var(--moss)',color:'var(--bg)'}}><Plus size={13}/> 자재 등록</button>
        </div>
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <input className="flex-1 text-xs rounded-lg px-3 py-1.5 outline-none" style={{background:'var(--bg-soft)',border:'1px solid var(--line)',color:'var(--ink)'}} placeholder="코드 · 자재명 · 위치 · LOT · 상태 · 공급업체 검색..." value={srch} onChange={e=>setSrch(e.target.value)}/>
            {srch&&<button onClick={()=>setSrch('')} className="text-xs px-2 rounded" style={{color:'var(--ink-mute)'}}>✕</button>}
          </div>
          {supplierNames.length>0 && (
            <select value={supplierFilter} onChange={e=>setSupplierFilter(e.target.value)} className="text-xs rounded-lg px-2 py-1.5 outline-none" style={{background:'var(--bg-soft)',border:'1px solid var(--line)',color:'var(--ink)'}}>
              <option value="all">전체 공급업체</option>
              {supplierNames.map(n=><option key={n} value={n}>{n}</option>)}
            </select>
          )}
          <label className="flex items-center gap-1.5 text-[12px] cursor-pointer select-none flex-shrink-0" style={{color:zeroOnly?'var(--rust)':'var(--ink-mute)'}}>
            <input type="checkbox" checked={zeroOnly} onChange={e=>setZeroOnly(e.target.checked)}/>
            재고 0인 품목만 보기 {zeroStock.length>0&&`(${zeroStock.length}건)`}
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['코드','자재명','공급업체','단위','재고','최소재고','위치','LOT','상태','작업'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>{shown.length===0?<EmptyRow msg={srch||zeroOnly?'검색 결과가 없습니다.':undefined}/>:shown.map(m=>{
              const below=parseFloat(m.stock)<parseFloat(m.min)
              return (
      <tr key={m.id}>
                <TD mono color="var(--moss)">{m.id}</TD>
                <TD><span className="font-medium">{m.name}</span></TD>
                <TD muted>{m.supplier||'-'}</TD>
                <TD muted>{m.unit}</TD>
                <TD right color={below?'var(--rust)':'var(--moss)'}>
                  <span className="inline-flex items-center gap-1 justify-end">
                    {below&&<AlertTriangle size={11} style={{color:'var(--rust)'}}/>}
                    <b>{m.stock}</b>
                  </span>
                </TD>
                <TD right muted>{m.min}</TD>
                <TD mono muted>{m.location}</TD>
                <TD mono muted>{m.lot}</TD>
                <TD><Badge text={m.status} tone={statusTone(m.status)}/></TD>
                <TD><div className="flex gap-1"><ActBtn label="입고" color="green" onClick={()=>setReceiveTarget(m)}/><ActBtn label="출고" onClick={()=>setIssueTarget(m)}/><ActBtn label="수정" onClick={()=>{setEdit(m);setModal('form')}}/><ActBtn label="삭제" color="red" onClick={()=>del(m.id)}/></div></TD>
              </tr>
            )})}</tbody>
          </table>
        </div>
      </Card>
      {modal==='form'&&<Modal title={edit?'자재 수정':'자재 등록'} onClose={()=>{setModal(null);setEdit(null)}}><MatForm initial={edit||{}} avl={avl} onSave={save} onCancel={()=>{setModal(null);setEdit(null)}}/></Modal>}
      {receiveTarget&&<Modal title={`자재 입고 — ${receiveTarget.name}`} onClose={()=>setReceiveTarget(null)}><ReceiveForm material={receiveTarget} orders={orders} onSave={receive} onCancel={()=>setReceiveTarget(null)}/></Modal>}
      {issueTarget&&<Modal title={`자재 출고 — ${issueTarget.name}`} onClose={()=>setIssueTarget(null)}><IssueForm material={issueTarget} onSave={issue} onCancel={()=>setIssueTarget(null)}/></Modal>}
    </div>
  )
}
function MatForm({initial,avl,onSave,onCancel}) {
  const isEdit = !!initial.name
  const [f,sf]=useState({name:'',supplier:'',unit:'EA',stock:'0',min:'',location:'',lot:'',...initial})
  const set=k=>e=>sf(p=>({...p,[k]:e.target.value}))
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FL label="자재명 *"><input style={inp} value={f.name} onChange={set('name')}/></FL>
        {/* #48 — 자재는 공급업체 관리(SupplierHub)에 등록된 업체와 묶어서 입력한다 */}
        <FL label="공급업체 (검색)">
          <input style={inp} list="mat-supplier-list" value={f.supplier} onChange={set('supplier')} placeholder="공급업체명 입력·검색..."/>
          <datalist id="mat-supplier-list">{(avl||[]).map(v=><option key={v.id} value={v.name}/>)}</datalist>
        </FL>
        <FL label="단위"><select style={sel} value={f.unit} onChange={set('unit')}>{['EA','kg','g','m','mm','매','본'].map(o=><option key={o}>{o}</option>)}</select></FL>
        <FL label="최소 재고"><input style={inp} type="number" step="0.1" value={f.min} onChange={set('min')}/></FL>
        <FL label="보관 위치"><input style={inp} value={f.location} onChange={set('location')} placeholder="A-01-01"/></FL>
        <FL label="LOT 번호"><input style={inp} value={f.lot} onChange={set('lot')} placeholder="LOT-XXXX-XXX"/></FL>
      </div>
      {!isEdit && (
        <div className="text-[11.5px] px-1" style={{ color:'var(--ink-faint)' }}>ℹ 재고 수량은 여기서 입력하지 않습니다 — 신규 자재는 재고 0으로 등록되며, 이후 '입고' 처리로만 재고가 늘어납니다 (추적성 확보).</div>
      )}
      <div className="flex gap-2 pt-2"><SBtn onClick={()=>f.name&&onSave(f)}>{initial.name?'수정 저장':'등록'}</SBtn><SBtn onClick={onCancel} secondary>취소</SBtn></div>
    </div>
  )
}
function ReceiveForm({material,orders,onSave,onCancel}) {
  const [f,sf]=useState({qty:'',lot:genLot(),certNo:'',poId:'',poVendor:'',date:new Date().toISOString().slice(0,10)})
  const set=k=>e=>sf(p=>({...p,[k]:e.target.value}))
  const openOrders=orders.filter(o=>!['입고완료','취소'].includes(o.status))
  const selPO=e=>{
    const o=orders.find(x=>x.id===e.target.value)
    sf(p=>({...p,poId:e.target.value,poVendor:o?o.vendor:'',qty:p.qty||(o?String(o.qty).replace(/[^0-9.]/g,''):p.qty)}))
  }
  return (
    <div className="space-y-3">
      <div className="p-3 rounded-lg" style={{background:'var(--bg-soft)'}}>
        <div className="text-[11.5px]" style={{color:'var(--ink-mute)'}}>현재 재고: <b style={{color:'var(--ink)'}}>{material.stock} {material.unit}</b> · 최소재고 {material.min} {material.unit}</div>
      </div>
      <FL label="발주 연동 (선택)">
        <select style={sel} value={f.poId} onChange={selPO}>
          <option value="">선택 안 함 (직접 입고)</option>
          {openOrders.map(o=><option key={o.id} value={o.id}>{o.id} — {o.vendor} — {o.items}</option>)}
        </select>
      </FL>
      <div className="grid grid-cols-2 gap-3">
        <FL label="입고 수량 *"><input style={inp} type="number" step="0.1" value={f.qty} onChange={set('qty')}/></FL>
        <FL label="입고일"><input style={inp} type="date" value={f.date} onChange={set('date')}/></FL>
        <FL label="LOT 번호"><input style={inp} value={f.lot} onChange={set('lot')}/></FL>
        <FL label="성적서 번호"><input style={inp} value={f.certNo} onChange={set('certNo')} placeholder="COA/시험성적서 번호"/></FL>
      </div>
      <div className="flex gap-2 pt-2"><SBtn onClick={()=>f.qty&&onSave(f)}>입고 등록</SBtn><SBtn onClick={onCancel} secondary>취소</SBtn></div>
    </div>
  )
}
function IssueForm({material,onSave,onCancel}) {
  const [f,sf]=useState({qty:'',reason:'생산 투입',notes:'',date:new Date().toISOString().slice(0,10)})
  const set=k=>e=>sf(p=>({...p,[k]:e.target.value}))
  return (
    <div className="space-y-3">
      <div className="p-3 rounded-lg" style={{background:'var(--bg-soft)'}}>
        <div className="text-[11.5px]" style={{color:'var(--ink-mute)'}}>현재 재고: <b style={{color:'var(--ink)'}}>{material.stock} {material.unit}</b> · 최소재고 {material.min} {material.unit}</div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FL label="출고 수량 *"><input style={inp} type="number" step="0.1" value={f.qty} onChange={set('qty')}/></FL>
        <FL label="출고일"><input style={inp} type="date" value={f.date} onChange={set('date')}/></FL>
        <FL label="사유"><select style={sel} value={f.reason} onChange={set('reason')}>{['생산 투입','반품(공급업체)','폐기','기타'].map(o=><option key={o}>{o}</option>)}</select></FL>
      </div>
      <FL label="비고"><input style={inp} value={f.notes} onChange={set('notes')}/></FL>
      <div className="flex gap-2 pt-2"><SBtn onClick={()=>f.qty&&onSave(f)}>출고 등록</SBtn><SBtn onClick={onCancel} secondary>취소</SBtn></div>
    </div>
  )
}

/* ─── 수입검사 (IQC) ─── */
// 자재명과 개발(제품) 단계에서 등록된 원자재 수입검사 기준서(inspStdType==='incoming')를 매칭한다.
// 정확히 일치하지 않아도 자재명/기준서명 중 한쪽이 다른 한쪽을 포함하면 매칭으로 간주한다.
function matchIqcStandard(materialName) {
  const products = onboarding.load()?.products || []
  const standards = deriveInspectionStandards(products).filter(s => s.inspType === 'incoming')
  if (standards.length === 0) return null
  const norm = s => String(s || '').toLowerCase().replace(/\s+/g, '')
  const target = norm(materialName)
  if (!target) return standards[0]
  return standards.find(s => {
    const n1 = norm(s.name), n2 = norm(s.productName)
    return (n1 && (target.includes(n1) || n1.includes(target))) || (n2 && (target.includes(n2) || n2.includes(target)))
  }) || null
}
function IqcView({iqc,setIqc,orders,setOrders,openId}) {
  const [srch,setSrch]=useState('')
  const [inspectTarget,setInspectTarget]=useState(null)
  const [decisionTarget,setDecisionTarget]=useState(null)
  const [detailTarget,setDetailTarget]=useState(null)
  const canDecide = (auth.current()?.level || 1) >= 3 // 품질책임자(매니저) 이상만 조건부 결정 가능
  useEffect(() => {
    if (openId) {
      const item = iqc.find(x => x.id === openId)
      if (item) { item.status==='검사대기' ? setInspectTarget(item) : setDetailTarget(item) }
    }
  }, [openId])
  const del=id=>{if(window.confirm('삭제하시겠습니까? (자재 입고 시 자동 생성된 검사 기록입니다)'))setIqc(p=>p.filter(x=>x.id!==id))}
  const submitInspection=(rec, checkResults, overallResult)=>{
    setIqc(p=>p.map(x=>x.id===rec.id?{
      ...x, checkResults, overallResult,
      inspector: auth.current()?.name || x.inspector || '-',
      inspectedAt: new Date().toISOString(),
      status: overallResult==='pass' ? '합격' : '불합격',
      nc: overallResult==='fail' ? (x.nc && x.nc!=='—' ? x.nc : 'NC-'+rec.id) : '—',
    }:x))
    setInspectTarget(null)
  }
  const decide=(rec, decision, note)=>{
    setIqc(p=>p.map(x=>x.id===rec.id?{
      ...x, status: decision, qcDecision:{decidedBy:auth.current()?.name||'-', decidedAt:new Date().toISOString(), decision, note},
    }:x))
    if (decision === '불합격' && rec.po && setOrders) {
      setOrders(p=>p.map(o=>o.id===rec.po?{...o,status:'반납'}:o))
    }
    setDecisionTarget(null)
  }
  const shown=srch
    ? iqc.filter(i=>[i.id,i.po,i.vendor,i.items,i.inspector,i.nc,i.status].some(v=>v&&String(v).toLowerCase().includes(srch.toLowerCase())))
    : iqc
  const waitCount = iqc.filter(i=>i.status==='검사대기').length
  return (
    <div>
      <SectionTitle breadcrumb="수입검사 (IQC)">수입검사 (IQC)</SectionTitle>
      <div className="mb-4 p-3 rounded-lg flex items-start gap-2" style={{background:'var(--bg-soft)',border:'1px solid var(--line)'}}>
        <ClipboardCheck size={14} style={{color:'var(--ink-mute)',marginTop:2,flexShrink:0}}/>
        <span className="text-[12.5px]" style={{color:'var(--ink-mute)'}}>자재 입고 시 검사 기록이 <b>자동 생성</b>됩니다 (검사대기). "검사 입력"을 눌러 측정값을 입력하면 개발 단계에 등록된 원자재 규격과 비교하여 합격·불합격이 자동 판정됩니다.{waitCount>0 && <b style={{color:'var(--rust)'}}> 검사대기 {waitCount}건</b>}</span>
      </div>
      <Card>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{color:'var(--ink-faint)'}}>수입검사 결과 (ISO 13485 §7.4.3)</span>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <input className="flex-1 text-xs rounded-lg px-3 py-1.5 outline-none" style={{background:'var(--bg-soft)',border:'1px solid var(--line)',color:'var(--ink)'}} placeholder="IQC번호 · PO · 협력업체 · 품목 · 검사자 · 부적합 · 결과 검색..." value={srch} onChange={e=>setSrch(e.target.value)}/>
          {srch&&<button onClick={()=>setSrch('')} className="text-xs px-2 rounded" style={{color:'var(--ink-mute)'}}>✕</button>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['IQC번호','검사일','PO','협력업체','품목','수량','검사자','부적합','결과','작업'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>{shown.length===0?<EmptyRow msg={srch?'검색 결과가 없습니다.':'입고된 자재가 없습니다 — 자재등록에서 입고 처리 시 자동 생성됩니다.'}/>:shown.map(i=>(
      <tr key={i.id}>
                <TD mono color="var(--moss)">{i.id}</TD>
                <TD mono muted>{i.date}</TD>
                <TD mono muted>{i.po||'-'}</TD>
                <TD>{i.vendor}</TD>
                <TD muted>{i.items}</TD>
                <TD right>{i.qty}</TD>
                <TD>{i.inspector||<span style={{color:'var(--ink-faint)'}}>-</span>}</TD>
                <TD mono muted color={i.nc!=='—'?'var(--rust)':undefined}>{i.nc}</TD>
                <TD><Badge text={i.status} tone={i.status==='검사대기'?'amber':statusTone(i.status)}/></TD>
                <TD><div className="flex gap-1 flex-wrap">
                  {i.status==='검사대기' && <ActBtn label="검사 입력" color="green" onClick={()=>setInspectTarget(i)}/>}
                  {i.status!=='검사대기' && i.checkResults?.length>0 && <ActBtn label="성적서" onClick={()=>setDetailTarget(i)}/>}
                  {i.status==='불합격' && canDecide && <ActBtn label="품질책임자 결정" color="red" onClick={()=>setDecisionTarget(i)}/>}
                  <ActBtn label="삭제" color="red" onClick={()=>del(i.id)}/>
                </div></TD>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
      {inspectTarget&&<Modal title={`검사 입력 — ${inspectTarget.items}`} onClose={()=>setInspectTarget(null)} wide><IqcInspectForm record={inspectTarget} onSubmit={submitInspection} onCancel={()=>setInspectTarget(null)}/></Modal>}
      {decisionTarget&&<Modal title={`품질책임자 결정 — ${decisionTarget.id}`} onClose={()=>setDecisionTarget(null)}><IqcDecisionForm record={decisionTarget} onDecide={decide} onCancel={()=>setDecisionTarget(null)}/></Modal>}
      {detailTarget&&<Modal title={`수입검사성적서 — ${detailTarget.id}`} onClose={()=>setDetailTarget(null)} wide><IqcCertView record={detailTarget} onClose={()=>setDetailTarget(null)}/></Modal>}
    </div>
  )
}
function IqcInspectForm({record,onSubmit,onCancel}) {
  const standard = useMemo(()=>matchIqcStandard(record.items),[record.items])
  const baseItems = standard?.checkItems?.length>0 ? standard.checkItems : [{name:'외관/수량 확인',spec:'PO 대비 이상 없음',method:'육안'}]
  const [rows,setRows]=useState(baseItems.map(ci=>({name:ci.name,spec:ci.spec,method:ci.method,measured:'',auto:null,manualOverride:''})))
  const setMeasured=(idx,v)=>{
    setRows(p=>p.map((r,i)=>i===idx?{...r,measured:v,auto:evalAgainstSpec(r.spec,v)}:r))
  }
  const setManual=(idx,v)=>{
    setRows(p=>p.map((r,i)=>i===idx?{...r,manualOverride:v}:r))
  }
  const resultOf=r=> r.manualOverride || r.auto || null
  const allJudged = rows.every(r=>resultOf(r))
  const overallResult = rows.some(r=>resultOf(r)==='fail') ? 'fail' : (allJudged ? 'pass' : null)
  const submit=()=>{
    if(!allJudged){ if(!window.confirm('일부 항목의 합격/불합격이 판정되지 않았습니다. 계속하시겠습니까? (미판정 항목은 불합격으로 처리됩니다)')) return }
    const checkResults = rows.map(r=>({name:r.name,spec:r.spec,method:r.method,measured:r.measured,result:resultOf(r)||'fail'}))
    const final = checkResults.some(r=>r.result==='fail') ? 'fail' : 'pass'
    onSubmit(record, checkResults, final)
  }
  return (
    <div className="space-y-3">
      <div className="p-3 rounded-lg grid grid-cols-2 gap-2 text-[12px]" style={{background:'var(--bg-soft)'}}>
        <div><span style={{color:'var(--ink-mute)'}}>품목: </span><b>{record.items}</b></div>
        <div><span style={{color:'var(--ink-mute)'}}>수량: </span><b>{record.qty}</b></div>
        <div><span style={{color:'var(--ink-mute)'}}>협력업체: </span><b>{record.vendor}</b></div>
        <div><span style={{color:'var(--ink-mute)'}}>검사자: </span><b>{auth.current()?.name||'-'} (자동 배정)</b></div>
      </div>
      {!standard && (
        <div className="p-3 rounded-lg flex items-start gap-2" style={{background:'#fff7ed',border:'1px solid #f59e0b'}}>
          <AlertTriangle size={14} style={{color:'#b45309',marginTop:2,flexShrink:0}}/>
          <span className="text-[12px]" style={{color:'#b45309'}}>이 자재에 대한 수입검사 기준서(규격)가 개발 단계에 등록되어 있지 않아 기본 확인 항목만 표시됩니다. <a href="/products" style={{textDecoration:'underline'}}>제품·공정 &gt; 제품 개발</a>에서 원자재 수입검사(IQC) 규격을 등록하면 이후 자동으로 연동됩니다.</span>
        </div>
      )}
      {standard && (
        <div className="text-[11.5px] px-1" style={{color:'var(--ink-faint)'}}>연동 기준서: <b style={{color:'var(--ink-mute)'}}>{standard.name}</b> ({standard.productName})</div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead><tr>{['검사항목','규격(기준)','측정값','판정'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
          <tbody>
            {rows.map((r,idx)=>{
              const res = resultOf(r)
              return (
                <tr key={idx}>
                  <TD>{r.name||'-'}</TD>
                  <TD muted>{r.spec||'(제한 없음)'}</TD>
                  <TD><input style={{...inp,padding:'4px 8px',fontSize:'12px'}} value={r.measured} onChange={e=>setMeasured(idx,e.target.value)} placeholder="측정값 입력"/></TD>
                  <TD>
                    {r.auto ? <Badge text={r.auto==='pass'?'합격':'불합격'} tone={r.auto==='pass'?'green':'red'}/> :
                      <select style={{...sel,padding:'3px 6px',fontSize:'11px',width:'auto'}} value={r.manualOverride} onChange={e=>setManual(idx,e.target.value)}>
                        <option value="">판정 선택</option>
                        <option value="pass">합격</option>
                        <option value="fail">불합격</option>
                      </select>}
                  </TD>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="p-2.5 rounded-lg flex items-center justify-between" style={{background: overallResult==='fail' ? 'var(--rust-soft)' : overallResult==='pass' ? 'var(--leaf-soft)' : 'var(--bg-soft)'}}>
        <span className="text-[12.5px] font-medium" style={{color: overallResult==='fail' ? 'var(--rust)' : overallResult==='pass' ? 'var(--moss)' : 'var(--ink-mute)'}}>종합 판정</span>
        <span className="text-[13px] font-bold" style={{color: overallResult==='fail' ? 'var(--rust)' : overallResult==='pass' ? 'var(--moss)' : 'var(--ink-faint)'}}>{overallResult==='fail'?'불합격':overallResult==='pass'?'합격':'미판정'}</span>
      </div>
      <div className="flex gap-2 pt-2"><SBtn onClick={submit}>검사 결과 저장</SBtn><SBtn onClick={onCancel} secondary>취소</SBtn></div>
    </div>
  )
}
function IqcDecisionForm({record,onDecide,onCancel}) {
  const [note,setNote]=useState('')
  return (
    <div className="space-y-3">
      <div className="p-3 rounded-lg" style={{background:'var(--rust-soft)'}}>
        <div className="text-[12.5px]" style={{color:'var(--rust)'}}><b>{record.items}</b> ({record.vendor}) — 수입검사 <b>불합격</b></div>
        <div className="text-[11.5px] mt-1" style={{color:'var(--rust)'}}>부적합: {record.nc}</div>
      </div>
      <div className="text-[12.5px]" style={{color:'var(--ink-mute)'}}>품질책임자로서 이 자재를 조건부 합격으로 특채(조건부 사용승인)할지, 불합격을 유지할지 결정해주세요.</div>
      <FL label="결정 사유 / 비고"><textarea style={{...inp,minHeight:70}} value={note} onChange={e=>setNote(e.target.value)} placeholder="조건부 승인 사유 또는 불합격 유지 사유를 입력하세요"/></FL>
      <div className="flex gap-2 pt-2">
        <SBtn onClick={()=>onDecide(record,'조건부',note)}>조건부 합격으로 결정</SBtn>
        <SBtn onClick={()=>onDecide(record,'불합격',note)} secondary>불합격 유지</SBtn>
      </div>
      <div className="flex"><button onClick={onCancel} className="text-[11.5px]" style={{color:'var(--ink-faint)'}}>취소</button></div>
    </div>
  )
}
function IqcCertView({record,onClose}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-[12px] p-3 rounded-lg" style={{background:'var(--bg-soft)'}}>
        <div><span style={{color:'var(--ink-mute)'}}>IQC번호: </span><b>{record.id}</b></div>
        <div><span style={{color:'var(--ink-mute)'}}>검사일: </span><b>{record.date}</b></div>
        <div><span style={{color:'var(--ink-mute)'}}>품목: </span><b>{record.items}</b></div>
        <div><span style={{color:'var(--ink-mute)'}}>협력업체: </span><b>{record.vendor}</b></div>
        <div><span style={{color:'var(--ink-mute)'}}>검사자: </span><b>{record.inspector||'-'}</b></div>
        <div><span style={{color:'var(--ink-mute)'}}>결과: </span><Badge text={record.status} tone={statusTone(record.status)}/></div>
      </div>
      {record.qcDecision && (
        <div className="p-3 rounded-lg text-[12px]" style={{background:'var(--bg-soft)'}}>
          <b>품질책임자 결정</b>: {record.qcDecision.decision} ({record.qcDecision.decidedBy}, {record.qcDecision.decidedAt?.slice(0,10)})
          {record.qcDecision.note && <div className="mt-1" style={{color:'var(--ink-mute)'}}>{record.qcDecision.note}</div>}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead><tr>{['검사항목','규격(기준)','측정값','판정'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
          <tbody>{(record.checkResults||[]).map((r,idx)=>(
            <tr key={idx}>
              <TD>{r.name}</TD><TD muted>{r.spec||'-'}</TD><TD>{r.measured||'-'}</TD>
              <TD><Badge text={r.result==='pass'?'합격':'불합격'} tone={r.result==='pass'?'green':'red'}/></TD>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="flex gap-2 pt-2">
        <SBtn onClick={()=>printIqcCert(record)}><span className="inline-flex items-center gap-1.5"><Printer size={13}/> 인쇄 / PDF 저장</span></SBtn>
        <SBtn onClick={onClose} secondary>닫기</SBtn>
      </div>
    </div>
  )
}

/* ─── 완제품 재고 ─── */
/* ─── 완제품 재고 ─── */
function FinStockView({fin,setFin}) {
  const [modal,setModal]=useState(null); const [edit,setEdit]=useState(null)
  const [reqMsg,setReqMsg]=useState(null)
  const del=id=>{if(window.confirm('삭제하시겠습니까?'))setFin(p=>p.filter(x=>x.id!==id))}
  const requestStock=m=>{
    const req=requestProductionForFinItem(m)
    if(req) setReqMsg(`생산 요청 등록 완료 — ${req.item} ${req.qty}EA (${req.id}). 영업 > 생산 요청 화면에서 확인할 수 있습니다.`)
  }
  const save=f=>{
    const status=parseInt(f.stock)<parseInt(f.min)?'부족':'정상'
    if(edit){setFin(p=>p.map(x=>x.id===edit.id?{...x,...f,status}:x));setEdit(null)}
    else{setFin(p=>[...p,{id:nid('FP'),...f,status}])}
    setModal(null)
  }
  const short=fin.filter(f=>f.status==='부족')
  const [srch,setSrch]=useState('')
  const shown=srch
    ? fin.filter(m=>[m.id,m.name,m.lot,m.udi,m.status].some(v=>v&&String(v).toLowerCase().includes(srch.toLowerCase())))
    : fin
  return (
    <div>
      <SectionTitle breadcrumb="완제품 재고">완제품 재고</SectionTitle>
      {short.length>0&&<div className="mb-4 p-3 rounded-lg flex items-start gap-2" style={{background:'var(--rust-soft)',border:'1px solid var(--rust)'}}><AlertTriangle size={14} style={{color:'var(--rust)',marginTop:2}}/><span className="text-[12.5px]" style={{color:'var(--rust)'}}><b>재고 부족 {short.length}품목</b> — 생산 요청 필요</span></div>}
      {reqMsg&&<div className="mb-4 p-3 rounded-lg flex items-start gap-2 justify-between" style={{background:'var(--moss-soft)',border:'1px solid var(--moss)'}}><div className="flex items-start gap-2"><CheckCircle size={14} style={{color:'var(--moss)',marginTop:2}}/><span className="text-[12.5px]" style={{color:'var(--moss)'}}>{reqMsg}</span></div><button onClick={()=>setReqMsg(null)} style={{color:'var(--moss)'}}><X size={13}/></button></div>}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{color:'var(--ink-faint)'}}>완제품 재고 현황 (ISO 13485 §7.5.5)</span>
          <button onClick={()=>{setEdit(null);setModal('form')}} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium" style={{background:'var(--moss)',color:'var(--bg)'}}><Plus size={13}/> 품목 등록</button>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <input className="flex-1 text-xs rounded-lg px-3 py-1.5 outline-none" style={{background:'var(--bg-soft)',border:'1px solid var(--line)',color:'var(--ink)'}} placeholder="품목코드 · 품목명 · LOT · UDI · 상태 검색..." value={srch} onChange={e=>setSrch(e.target.value)}/>
          {srch&&<button onClick={()=>setSrch('')} className="text-xs px-2 rounded" style={{color:'var(--ink-mute)'}}>✕</button>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['품목코드','품목명','단위','재고','최소','LOT','유효기간','UDI','상태','재고조정','작업'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>{shown.length===0?<EmptyRow msg={srch?'검색 결과가 없습니다.':undefined}/>:shown.map(m=>(
      <tr key={m.id}>
                <TD mono color="var(--moss)">{m.id}</TD>
                <TD><span className="font-medium">{m.name}</span></TD>
                <TD muted>{m.unit}</TD>
                <TD right color={parseInt(m.stock)<parseInt(m.min)?'var(--rust)':'var(--moss)'}><b>{m.stock}</b></TD>
                <TD right muted>{m.min}</TD>
                <TD mono muted>{m.lot}</TD>
                <TD mono muted>{m.expiry}</TD>
                <TD mono muted>{m.udi}</TD>
                <TD><Badge text={m.status} tone={statusTone(m.status)}/></TD>
                <TD>
                  <div className="flex gap-1">
                    <ActBtn label="-" color="red" onClick={()=>setFin(p=>p.map(x=>x.id===m.id?{...x,stock:String(Math.max(0,parseInt(x.stock)-1)),status:Math.max(0,parseInt(x.stock)-1)<parseInt(x.min)?'부족':'정상'}:x))}/>
                    <ActBtn label="+" color="green" onClick={()=>setFin(p=>p.map(x=>x.id===m.id?{...x,stock:String(parseInt(x.stock)+1),status:parseInt(x.stock)+1<parseInt(x.min)?'부족':'정상'}:x))}/>
                  </div>
                </TD>
                <TD><div className="flex gap-1">{m.status==='부족'&&<ActBtn label="재고 요청" color="red" onClick={()=>requestStock(m)}/>}<ActBtn label="수정" onClick={()=>{setEdit(m);setModal('form')}}/><ActBtn label="삭제" color="red" onClick={()=>del(m.id)}/></div></TD>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
      {modal==='form'&&<Modal title={edit?'품목 수정':'완제품 등록'} onClose={()=>{setModal(null);setEdit(null)}}><FinForm initial={edit||{}} onSave={save} onCancel={()=>{setModal(null);setEdit(null)}}/></Modal>}
    </div>
  )
}
function FinForm({initial,onSave,onCancel}) {
  const [f,sf]=useState({name:'',unit:'EA',stock:'',min:'',lot:'',expiry:'',udi:'',...initial})
  const set=k=>e=>sf(p=>({...p,[k]:e.target.value}))
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FL label="품목명 *"><input style={inp} value={f.name} onChange={set('name')}/></FL>
        <FL label="단위"><select style={sel} value={f.unit} onChange={set('unit')}>{['EA','SET','BOX'].map(o=><option key={o}>{o}</option>)}</select></FL>
        <FL label="현재 재고"><input style={inp} type="number" value={f.stock} onChange={set('stock')}/></FL>
        <FL label="최소 재고"><input style={inp} type="number" value={f.min} onChange={set('min')}/></FL>
        <FL label="LOT 번호"><input style={inp} value={f.lot} onChange={set('lot')}/></FL>
        <FL label="유효기간 (YYYY-MM)"><input style={inp} value={f.expiry} onChange={set('expiry')} placeholder="2029-06"/></FL>
        <FL label="UDI"><input style={inp} value={f.udi} onChange={set('udi')} placeholder="08806526XXXXXX"/></FL>
      </div>
      <div className="flex gap-2 pt-2"><SBtn onClick={()=>f.name&&onSave(f)}>{initial.name?'수정 저장':'등록'}</SBtn><SBtn onClick={onCancel} secondary>취소</SBtn></div>
    </div>
  )
}

/* ─── 구매 홈 ─── */
function PurchaseHome({avl,orders,inventory,iqc,fin,onNavigate,onGoSupplier}) {
  const shortMat=inventory.filter(i=>i.status==='부족').length
  const shortFin=fin.filter(i=>i.status==='부족').length
  const pendingIQC=iqc.filter(i=>i.status==='검사중').length
  const overdueOrders=orders.filter(isOrderOverdue).length
  const CARDS=[
    {id:'orders',icon:ClipboardList,label:'발주 관리',desc:'PO 발행 · 납기 추적',count:overdueOrders>0?`납기 지연 ${overdueOrders}건`:`${orders.filter(o=>!['입고완료','취소'].includes(o.status)).length}건 진행중`,warn:overdueOrders>0},
    {id:'inventory',icon:Archive,label:'자재 재고',desc:'현재고 · 최소재고 알림',count:`${shortMat}개 부족`,warn:shortMat>0},
    {id:'iqc',icon:CheckCircle,label:'수입검사 (IQC)',desc:'입고 품질검사 결과 관리',count:`${pendingIQC}건 대기`,warn:pendingIQC>0},
    {id:'fin',icon:Package,label:'완제품 재고',desc:'완제품 · UDI · LOT 현황',count:`${shortFin}개 부족`,warn:shortFin>0},
    {id:'analysis',icon:FileText,label:'현황 분석',desc:'발주·IQC·재고 통계',count:`${orders.length}건 발주`},
  ]
  const summary=[
    {label:'재고 부족 자재',value:`${shortMat}개`,warn:shortMat>0,sub:'발주 요청 필요'},
    {label:'진행중 발주',value:`${orders.filter(o=>!['입고완료','취소'].includes(o.status)).length}건`,sub:'PO 현황'},
    {label:'납기 지연 발주',value:`${overdueOrders}건`,warn:overdueOrders>0,sub:'납기예정일 경과'},
    {label:'IQC 대기',value:`${pendingIQC}건`,warn:pendingIQC>0,sub:'검사 진행 필요'},
    {label:'등록 업체',value:`${avl.length}개사`,sub:`승인 ${avl.filter(v=>v.status==='승인').length}개사`},
  ]
  return (
    <div>
      <HubBanner
          title="구매·자재 관리"
          subtitle="ISO 13485 §7.4 · 공급업체 · 발주 · 입고 검사 · 재고 추적"
          icon={ShoppingCart}
          color="#2563EB"
          quickActions={[{label:'발주 등록',icon:Plus,onClick:()=>onNavigate('orders'),primary:true}]}
          workflow={['구매 요청','공급업체 선정','발주','입고','수입검사','재고 등록']}
        />
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {summary.length===0?<EmptyCard/>:summary.map(s=>(
      <div key={s.label} className="rounded-xl p-4" style={{background:'var(--bg-card)',border:'1px solid var(--line)'}}>
            <div className="text-[12px] mb-1" style={{color:'var(--ink-mute)'}}>{s.label}</div>
            <div className="text-[24px] font-bold" style={{color:s.warn?'var(--rust)':'var(--moss)'}}>{s.value}</div>
            <div className="text-[11px] mt-0.5" style={{color:'var(--ink-faint)'}}>{s.sub}</div>
          </div>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {CARDS.map(card=>(
          <button key={card.id} onClick={()=>onNavigate(card.id)}
            className="rounded-xl p-4 text-left transition hover:shadow-md"
            style={{background:'var(--bg-card)',border:`1px solid ${card.warn?'var(--rust)':'var(--line)'}`}}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:card.warn?'var(--rust-soft)':'var(--leaf-soft)'}}>
                <card.icon size={18} style={{color:card.warn?'var(--rust)':'var(--moss)'}} strokeWidth={1.7}/>
              </div>
              <span className="text-[13px] font-bold" style={{color:card.warn?'var(--rust)':'var(--moss)'}}>{card.count}</span>
            </div>
            <div className="text-[13.5px] font-semibold" style={{color:'var(--ink)'}}>{card.label}</div>
            <div className="text-[12px] mt-1" style={{color:'var(--ink-mute)'}}>{card.desc}</div>
          </button>
        ))}
        <button onClick={onGoSupplier}
          className="rounded-xl p-4 text-left transition hover:shadow-md"
          style={{background:'var(--bg-card)',border:'1px dashed var(--line)'}}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:'var(--leaf-soft)'}}>
              <ExternalLink size={18} style={{color:'var(--moss)'}} strokeWidth={1.7}/>
            </div>
            <span className="text-[13px] font-bold" style={{color:'var(--moss)'}}>{avl.length}개사</span>
          </div>
          <div className="text-[13.5px] font-semibold" style={{color:'var(--ink)'}}>협력업체 · 평가 관리</div>
          <div className="text-[12px] mt-1" style={{color:'var(--ink-mute)'}}>업체 등록 · 등급 · 공급업체 평가는 「공급업체 관리」로 이동</div>
        </button>
      </div>
    </div>
  )
}

/* ─── 현황 분석 ─── */
function AnalysisView({orders,iqc,inventory,fin}) {
  const totalOrders=orders.length
  const doneOrders=orders.filter(o=>o.status==='입고완료').length
  const overdue=orders.filter(isOrderOverdue).length
  const totalIqc=iqc.length
  const passIqc=iqc.filter(i=>i.status==='합격').length
  const failIqc=iqc.filter(i=>i.status==='불합격').length
  const condIqc=iqc.filter(i=>i.status==='조건부').length
  const failRate=totalIqc>0?Math.round((failIqc/totalIqc)*1000)/10:0
  const shortMat=inventory.filter(i=>i.status==='부족').length
  const shortFin=fin.filter(i=>i.status==='부족').length
  const stats=[
    {label:'총 발주 건수',value:`${totalOrders}건`,sub:`입고완료 ${doneOrders}건`},
    {label:'납기 지연 발주',value:`${overdue}건`,warn:overdue>0,sub:'납기예정일 경과'},
    {label:'IQC 총 건수',value:`${totalIqc}건`,sub:`합격 ${passIqc} · 조건부 ${condIqc} · 불합격 ${failIqc}`},
    {label:'IQC 불합격률',value:`${failRate}%`,warn:failRate>5,sub:'전체 IQC 대비'},
    {label:'자재 재고 부족',value:`${shortMat}건`,warn:shortMat>0,sub:'안전재고 미만'},
    {label:'완제품 재고 부족',value:`${shortFin}건`,warn:shortFin>0,sub:'안전재고 미만'},
  ]
  const byVendor={}
  orders.forEach(o=>{byVendor[o.vendor]=(byVendor[o.vendor]||0)+1})
  const vendorRows=Object.entries(byVendor).sort((a,b)=>b[1]-a[1])
  return (
    <div>
      <SectionTitle breadcrumb="현황 분석">현황 분석</SectionTitle>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {stats.map(s=>(
          <Card key={s.label}>
            <div className="text-[12px] mb-1" style={{color:'var(--ink-mute)'}}>{s.label}</div>
            <div className="text-[24px] font-bold" style={{color:s.warn?'var(--rust)':'var(--moss)'}}>{s.value}</div>
            <div className="text-[11px] mt-0.5" style={{color:'var(--ink-faint)'}}>{s.sub}</div>
          </Card>
        ))}
      </div>
      <Card>
        <div className="font-mono text-[10px] tracking-widest uppercase mb-3" style={{color:'var(--ink-faint)'}}>업체별 발주 현황</div>
        {vendorRows.length===0?<EmptyCard/>:(
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>{['업체명','발주 건수'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
              <tbody>{vendorRows.map(([v,c])=>(
                <tr key={v}><TD><span className="font-medium">{v}</span></TD><TD right>{c}건</TD></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

/* ─── 메인 ─── */
export default function PurchaseHub() {
  const user=auth.current()
  const navigate=useNavigate()
  const [searchParams] = useSearchParams()
  const [view,setView]=useState(searchParams.get('tab') || 'home')
  const editId = searchParams.get('edit')
  // #46 — 발주등록의 협력업체 목록이 실제 「공급업체 관리」(SupplierHub / supplierState.js)와
  // 연동되지 않고 예전 독립 저장소(qms_pur_avl)를 참조하고 있어 등록한 업체가 뜨지 않았다.
  // 공급업체 관리에 등록된 실제 데이터를 그대로 읽어온다(편집은 「공급업체 관리」에서만).
  const avl = suppliers.getSuppliers()
  const [orders,setOrders]=useLS('qms_pur_orders',INIT_ORDERS)
  const [inventory,setInventory]=useLS('qms_pur_inventory',INIT_INVENTORY)
  const [iqc,setIqc]=useLS('qms_pur_iqc',INIT_IQC)
  const [fin,setFin]=useLS('qms_pur_fin',INIT_FIN)

  const tabLabels={orders:'발주관리',inventory:'자재현황',iqc:'수입검사',fin:'완제품재고',analysis:'현황분석'}
  const viewMap={
    home:<PurchaseHome avl={avl} orders={orders} inventory={inventory} iqc={iqc} fin={fin} onNavigate={setView} onGoSupplier={()=>navigate('/supplier')}/>,
    orders:<OrdersView orders={orders} setOrders={setOrders} avl={avl} inventory={inventory} setInventory={setInventory} openId={editId}/>,
    inventory:<InventoryView inventory={inventory} setInventory={setInventory} orders={orders} setOrders={setOrders} openId={editId} setIqc={setIqc} avl={avl}/>,
    iqc:<IqcView iqc={iqc} setIqc={setIqc} orders={orders} setOrders={setOrders} openId={editId}/>,
    fin:<FinStockView fin={fin} setFin={setFin}/>,
    analysis:<AnalysisView orders={orders} iqc={iqc} inventory={inventory} fin={fin}/>,
  }
  return (
    <AppLayout user={user} title="구매자재" subtitle="협력업체 · 발주 · 입고 · 재고 관리">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto">
        {view!=='home'&&<button onClick={()=>setView('home')} className="flex items-center gap-1.5 mb-5 text-[13px]" style={{color:'var(--moss)'}}><ArrowLeft size={14}/> 구매자재 홈</button>}
        {view!=='home'&&(
          <div className="flex gap-1 flex-wrap mb-5">
            {Object.entries(tabLabels).map(([id,label])=>(
              <button key={id} onClick={()=>setView(id)} className="text-[12px] px-3 py-1.5 rounded-lg border transition"
                style={{background:view===id?'var(--moss)':'var(--bg-card)',color:view===id?'var(--bg)':'var(--ink-mute)',borderColor:view===id?'var(--moss)':'var(--line)'}}>{label}</button>
            ))}
          </div>
        )}
        {viewMap[view]||viewMap.home}
      </div>
    </AppLayout>
  )
}
