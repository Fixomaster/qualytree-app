import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Cog,
  ClipboardList,
  AlertTriangle,
  ArrowLeft,
  Plus,
  X,
  Activity,
  FileText,
  Wrench,
  Workflow,
  Factory,
  Paperclip,
  ArrowUpDown,
  Printer,
  ChevronRight,
  CheckCircle2,
  Circle,
  XCircle,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'
import { syncOrderStatusFromWo, syncWoCompletionEffects } from '../../lib/woSync'
import WorkOrderQueue from '../operations/WorkOrderQueue'
import { fileStore } from '../../lib/fileStore'
import { printInspectionCert } from '../../lib/pdfPrint'
import { loadPcps, findPcpForProduct, orderedSteps, stepStatus, computeWoProgress, deriveStepsFromRecords, deriveCurrentStep } from '../../lib/productionControl'
import { productModels } from '../../lib/productLifecycleState'
import { onboarding, productKeyOf } from '../../lib/onboardingState'
import { ncr as ncrLib, NCR_STATUS_LABEL, NCR_SEVERITY } from '../../lib/ncrState'

/* ─── util ─── */
function useLS(key,init){const[v,setV]=useState(()=>{try{const raw=localStorage.getItem(key);if(raw!=null)return JSON.parse(raw);localStorage.setItem(key,JSON.stringify(init));return init}catch{return init}});const set=(u)=>{const n=typeof u==='function'?u(v):u;localStorage.setItem(key,JSON.stringify(n));setV(n)};return[v,set]}
const nid=(p)=>`${p}-${new Date().toISOString().slice(2,4)}${String(new Date().getMonth()+1).padStart(2,'0')}-${String(Date.now()).slice(-3)}`
function loadMaterialLotOptions(){try{const inv=JSON.parse(localStorage.getItem('qms_pur_inventory')||'[]');const set=new Set();inv.forEach(m=>{if(m.lot)set.add(m.lot);(m.receipts||[]).forEach(r=>{if(r.lot)set.add(r.lot)})});return[...set]}catch{return[]}}
/* 허가 모델(제품·공정 화면에서 등록) 검색용 목록 — 영업 화면과 동일한 소스 */
function loadOrderableModels(){
  try{
    const ob=onboarding.load()
    const products=(Array.isArray(ob.products)&&ob.products.length)?ob.products:(ob.product&&ob.product.name?[ob.product]:[])
    const seen=new Set()
    return productModels.getAll()
      .map(m=>{const p=products.find(pp=>productKeyOf(pp)===m.productKey);return{...m,productName:(p&&p.name)||''}})
      .filter(m=>(m.code||m.spec)&&(m.spec||m.code))
      .filter(m=>{const v=m.spec||m.code;if(seen.has(v))return false;seen.add(v);return true})
  }catch{return[]}
}
/* 영업/재고에서 등록된 미연계 생산요청(qms_sal_prodreqs) — WO 발행 시 클릭 한 번으로 불러오기용 */
function loadPendingProdReqs(){
  try{
    const list=JSON.parse(localStorage.getItem('qms_sal_prodreqs')||'[]')
    return Array.isArray(list)?list.filter(r=>!r.wo&&!['완료','취소'].includes(r.status)):[]
  }catch{return[]}
}
function linkProdReqToWo(prId,woId){
  try{
    const list=JSON.parse(localStorage.getItem('qms_sal_prodreqs')||'[]')
    const next=(Array.isArray(list)?list:[]).map(r=>r.id===prId?{...r,wo:woId,status:'WO발행완료'}:r)
    localStorage.setItem('qms_sal_prodreqs',JSON.stringify(next))
  }catch{}
}
const inp={width:'100%',padding:'7px 10px',borderRadius:'7px',border:'1px solid var(--line)',background:'var(--bg)',color:'var(--ink)',fontSize:'13px',outline:'none'}
const sel={...inp,appearance:'none'}
const Badge=({text,tone='gray'})=>{const c={red:{bg:'var(--rust-soft)',fg:'var(--rust)'},green:{bg:'var(--leaf-soft)',fg:'var(--moss)'},amber:{bg:'#fff7ed',fg:'#b45309'},blue:{bg:'#eff6ff',fg:'#1d4ed8'},gray:{bg:'var(--bg-soft)',fg:'var(--ink-mute)'}}[tone]??{bg:'var(--bg-soft)',fg:'var(--ink-mute)'};return <span className="font-mono text-[10px] tracking-wider px-1.5 py-0.5 rounded" style={{background:c.bg,color:c.fg,fontWeight:500}}>{text}</span>}
const statusTone=(s='')=>{if(s.includes('불합격')||s.includes('불량')||s.includes('취소')||s.includes('심각')||s.includes('폐기'))return'red';if(s.includes('대기')||s.includes('조치')||s.includes('검사중')||s.includes('진행')||s.includes('조건부'))return'amber';if(s.includes('완료')||s.includes('합격')||s.includes('종결')||s.includes('정상')||s.includes('승인'))return'green';return'gray'}
const TH=({children})=><th className="pb-2 text-left font-medium px-2 first:pl-0 whitespace-nowrap text-[11.5px]" style={{color:'var(--ink-faint)',borderBottom:'1px solid var(--line)'}}>{children}</th>
const TD=({children,mono,color,right,muted})=><td className={`py-2 px-2 first:pl-0 text-[12.5px]${mono?' font-mono text-[11px]':''}${right?' text-right tabular-nums':''}`} style={{color:color||(muted?'var(--ink-mute)':'var(--ink)'),borderBottom:'1px solid var(--line)'}}>{children}</td>
const ActBtn=({label,color,onClick})=><button onClick={onClick} className="text-[11px] px-2 py-0.5 rounded hover:opacity-80" style={{background:color==='red'?'var(--rust-soft)':color==='green'?'var(--leaf-soft)':'var(--bg-soft)',color:color==='red'?'var(--rust)':color==='green'?'var(--moss)':'var(--ink-mute)',fontWeight:500}}>{label}</button>
const SBtn=({children,onClick,secondary})=><button onClick={onClick} className="px-4 py-2 rounded-lg text-[13px] font-medium" style={{background:secondary?'var(--bg-soft)':'var(--moss)',color:secondary?'var(--ink-mute)':'var(--bg)'}}>{children}</button>
const FL=({label,children})=><div><div className="text-[11.5px] font-medium mb-1" style={{color:'var(--ink-mute)'}}>{label}</div>{children}</div>
const Card=({children})=><div className="rounded-xl p-4" style={{background:'var(--bg-card)',border:'1px solid var(--line)'}}>{children}</div>
const StatusSelect=({value,options,onChange})=><select value={value} onChange={e=>onChange(e.target.value)} style={{...sel,padding:'3px 6px',fontSize:'11px',width:'auto'}}>{options.map(o=><option key={o}>{o}</option>)}</select>
const SectionTitle=({children,breadcrumb})=><div className="mb-5">{breadcrumb&&<div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-1" style={{color:'var(--ink-faint)'}}>생산 / {breadcrumb}</div>}<h2 className="text-[22px]" style={{color:'var(--ink)',fontWeight:500}}>{children}</h2></div>
function EmptyRow({cols,msg}){return(<tr><td colSpan={cols||20} className="py-10 text-center text-sm" style={{color:"var(--ink-mute)"}}>{msg||"등록된 항목이 없습니다."}</td></tr>)}
function EmptyCard({msg}){return(<div className="py-10 text-center text-sm" style={{color:"var(--ink-mute)"}}>{msg||"등록된 항목이 없습니다."}</div>)}

function Modal({title,onClose,children}){return <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.45)'}} onClick={e=>e.target===e.currentTarget&&onClose()}><div className="rounded-2xl p-6 w-full max-w-lg max-h-[92vh] overflow-y-auto" style={{background:'var(--bg-card)',boxShadow:'0 24px 64px rgba(0,0,0,0.18)',border:'1px solid var(--line)'}}><div className="flex items-center justify-between mb-5"><h3 className="text-[17px] font-semibold" style={{color:'var(--ink)'}}>{title}</h3><button onClick={onClose} style={{color:'var(--ink-faint)'}}><X size={18}/></button></div>{children}</div></div>}

function SingleAttach({fileId,fileName,onAttach,onRemove,label}){
  const [busy,setBusy]=useState(false)
  const attach=async(file)=>{
    if(!file)return
    setBusy(true)
    try{ const id=await fileStore.saveFile(file); onAttach(id,file.name) }
    catch(e){ alert(e.message||'파일 첨부에 실패했습니다.') }
    finally{ setBusy(false) }
  }
  return(
    <FL label={label||'첨부 파일'}>
      {fileId?(
        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-[12px]" style={{background:'var(--bg-soft)',border:'1px solid var(--line)'}}>
          <span className="truncate" style={{color:'var(--moss)'}}>{fileName||'첨부됨'}</span>
          <button type="button" onClick={onRemove} style={{color:'var(--ink-faint)'}}><X size={12}/></button>
        </div>
      ):(
        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-medium cursor-pointer" style={{background:'var(--leaf-soft)',color:'var(--moss)'}}>
          <Paperclip size={12}/> {busy?'업로드 중...':'파일 첨부'}
          <input type="file" className="hidden" disabled={busy} onChange={e=>{const f=e.target.files?.[0];e.target.value='';attach(f)}}/>
        </label>
      )}
    </FL>
  )
}

function AttachLink({fileId,fileName}){
  if(!fileId) return null
  return <a href={fileStore.getObjectURL(fileId)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1" style={{color:'var(--moss)'}}><Paperclip size={11}/> {fileName||'첨부파일'}</a>
}

/* ─── 초기 데이터 ─── */
const INIT_WO=[
  {id:'WO-2406-018',so:'SO-2406-012',product:'SCS M3.5×22mm',qty:'200',step:'가공중',dueDate:'24-06-25',startDate:'24-06-19',assignee:'3공정팀',progress:'60',status:'진행중'},
  {id:'WO-2406-017',so:'SO-2406-010',product:'SCS M4.0×24mm',qty:'300',step:'검사대기',dueDate:'24-07-05',startDate:'24-06-17',assignee:'검사팀',progress:'80',status:'진행중'},
  {id:'WO-2406-015',so:'SO-2406-008',product:'BPL 4㎖',qty:'50',step:'완료',dueDate:'24-06-20',startDate:'24-06-10',assignee:'—',progress:'100',status:'완료'},
  {id:'WO-2406-014',so:'SO-2406-005',product:'SCS M3.5×24mm',qty:'100',step:'완료',dueDate:'24-06-14',startDate:'24-06-05',assignee:'—',progress:'100',status:'완료'},
]
const INIT_PROC=[
  {id:'PR-2406-044',wo:'WO-2406-018',date:'24-06-21',step:'CNC 선삭',machine:'CNC-01',operator:'이기술',param:'회전수 2800rpm, 이송속도 0.12mm/rev',result:'합격',note:''},
  {id:'PR-2406-043',wo:'WO-2406-018',date:'24-06-20',step:'원소재 준비',machine:'—',operator:'박자재',param:'Ti-6Al-4V φ12mm, LOT-2406-012',result:'합격',note:''},
  {id:'PR-2406-042',wo:'WO-2406-017',date:'24-06-21',step:'최종검사',machine:'CMM-01',operator:'김검사',param:'치수공차 ±0.05mm',result:'합격',note:''},
]
const INIT_INSPECT=[
  {id:'IPC-2406-033',wo:'WO-2406-018',step:'CNC 선삭 후 공정검사',date:'24-06-21',inspector:'이기술',spec:'φ3.5mm ±0.02, 나사 피치 0.6mm',measured:'3.499, 0.600',result:'합격',status:'합격'},
  {id:'IPC-2406-032',wo:'WO-2406-017',step:'최종치수 검사',date:'24-06-21',inspector:'김검사',spec:'φ4.0mm ±0.02, L=24mm ±0.1',measured:'4.001, 24.05',result:'합격',status:'합격'},
  {id:'IPC-2406-031',wo:'WO-2406-017',step:'표면처리 후 외관 검사',date:'24-06-20',inspector:'이검사',spec:'아노다이징 균일도',measured:'이상 없음 (5EA 제외)',result:'조건부합격',status:'조건부'},
]
const INIT_NCR=[
  {id:'NC-2406-003',date:'24-06-20',wo:'WO-2406-017',step:'표면처리 후 외관',desc:'아노다이징 불균일 5EA',severity:'경미',disposition:'재처리',capaNo:'CA-2406-005',status:'조치중'},
  {id:'NC-2406-001',date:'24-06-08',wo:'WO-2406-015',step:'성형 후 치수 검사',desc:'외경 초과공차 1EA — 폐기처리',severity:'경미',disposition:'폐기',capaNo:'—',status:'종결'},
]

/* ─── 작업지시 (WO) ─── */
const WO_SORTS = {
  dueDate: { label:'납기일순', fn:(a,b)=>String(a.dueDate||'').localeCompare(String(b.dueDate||'')) },
  progress: { label:'진행률순', fn:(a,b)=>(Number(a.progress)||0)-(Number(b.progress)||0) },
  status: { label:'상태순', fn:(a,b)=>String(a.status||'').localeCompare(String(b.status||'')) },
  id: { label:'WO번호순', fn:(a,b)=>String(a.id||'').localeCompare(String(b.id||'')) },
}
function WoView({wo,setWo,openId,proc,pcps,onOpenProc}){
  const[modal,setModal]=useState(null);const[edit,setEdit]=useState(null)
  const[sortKey,setSortKey]=useState('dueDate');const[sortDir,setSortDir]=useState('asc')
  useEffect(() => {
    if (openId) { const item = wo.find(x => x.id === openId); if (item) { setEdit(item); setModal('form') } }
  }, [openId])
  const statusOpts=['대기','진행중','검사중','완료','취소']
  const [pendingReqs]=useState(()=>loadPendingProdReqs())
  const del=id=>{if(window.confirm('삭제하시겠습니까?'))setWo(p=>p.filter(x=>x.id!==id))}
  const save=f=>{
    const {_linkedReqId, ...rest} = f
    const id = edit ? edit.id : nid('WO')
    if(edit){setWo(p=>syncWoCompletionEffects(p.map(x=>x.id===edit.id?{...x,...rest}:x)));setEdit(null)}
    else{setWo(p=>syncWoCompletionEffects([...p,{id,progress:'0',status:'대기',...rest}]))}
    if(!edit) syncOrderStatusFromWo(id, rest.status || '대기')
    if(_linkedReqId) linkProdReqToWo(_linkedReqId, id)
    setModal(null)
  }
  const sorted = useMemo(()=>{
    const arr = [...wo].sort(WO_SORTS[sortKey].fn)
    return sortDir==='desc' ? arr.reverse() : arr
  }, [wo, sortKey, sortDir])
  return(
    <div>
      <SectionTitle breadcrumb="작업지시 (WO)">작업지시 관리</SectionTitle>
      <Card>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{color:'var(--ink-faint)'}}>작업지시 목록 (ISO 13485 §7.5.1) — {wo.length}건</span>
          <div className="flex items-center gap-2">
            <select style={{...sel,width:'auto',padding:'5px 8px',fontSize:'12px'}} value={sortKey} onChange={e=>setSortKey(e.target.value)}>
              {Object.entries(WO_SORTS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
            <button onClick={()=>setSortDir(d=>d==='asc'?'desc':'asc')} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px]" style={{background:'var(--bg-soft)',color:'var(--ink-mute)'}} title="정렬 방향 전환">
              <ArrowUpDown size={12}/>{sortDir==='asc'?'오름차순':'내림차순'}
            </button>
            <button onClick={()=>{setEdit(null);setModal('form')}} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium" style={{background:'var(--moss)',color:'var(--bg)'}}><Plus size={13}/> WO 발행</button>
          </div>
        </div>
        <div className="space-y-3">
          {sorted.length===0?<EmptyCard/>:sorted.map(w=>{
            const {pct,auto} = computeWoProgress(w, proc, pcps)
            return(
      <div key={w.id} onClick={()=>onOpenProc&&onOpenProc(w.id)} className="p-3 rounded-xl cursor-pointer transition hover:shadow-md" style={{border:'1px solid var(--line)',background:'var(--bg)'}}>
              <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[12px] font-bold" style={{color:'var(--moss)'}}>{w.id}</span>
                  <Badge text={w.product} tone="blue"/>
                  <Badge text={`${w.qty}EA`} tone="gray"/>
                  {w.so&&<span className="font-mono text-[10px]" style={{color:'var(--ink-faint)'}}>{w.so}</span>}
                </div>
                <div className="flex items-center gap-2" onClick={e=>e.stopPropagation()}>
                  <Badge text={w.status} tone={statusTone(w.status)}/>
                  {!['취소','완료'].includes(w.status) ? (
                    <ActBtn label="취소" color="red" onClick={()=>{if(window.confirm('이 작업지시를 취소하시겠습니까?')){setWo(p=>p.map(x=>x.id===w.id?{...x,status:'취소'}:x));syncOrderStatusFromWo(w.id,'취소')}}}/>
                  ) : w.status==='취소' && (
                    <ActBtn label="취소 철회" onClick={()=>setWo(p=>p.map(x=>x.id===w.id?{...x,status:'대기'}:x))}/>
                  )}
                  <ActBtn label="수정" onClick={()=>{setEdit(w);setModal('form')}}/>
                  <ActBtn label="삭제" color="red" onClick={()=>del(w.id)}/>
                </div>
              </div>
              <div className="flex items-center gap-4 text-[12px] mb-2 flex-wrap" style={{color:'var(--ink-mute)'}}>
                <span>현공정: <b style={{color:'var(--ink)'}}>{w.step}</b></span>
                <span>담당: {w.assignee}</span>
                <span>완료예상일: {w.dueDate}</span>
                {w.lot&&<span className="font-mono" style={{color:'#7C3AED'}}>완제품 LOT: {w.lot}</span>}
                <span onClick={e=>e.stopPropagation()}><AttachLink fileId={w.fileId} fileName={w.fileName}/></span>
                <span className="flex items-center gap-1" style={{color:'var(--moss)'}}>공정기록 보기 <ChevronRight size={12}/></span>
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-1" style={{color:'var(--ink-mute)'}}>
                  <span>진행률 {auto?'(공정기록 자동 연동)':'(공정 미정의)'}</span><span style={{color:'var(--moss)',fontWeight:600}}>{pct}%</span>
                </div>
                <div className="rounded-full h-2" style={{background:'var(--bg-soft)'}}>
                  <div className="rounded-full h-2 transition-all" style={{width:`${pct}%`,background:pct===100?'var(--moss)':'#60a5fa'}}/>
                </div>
              </div>
            </div>
          )})}
        </div>
      </Card>
      {modal==='form'&&<Modal title={edit?'WO 수정':'작업지시 발행'} onClose={()=>{setModal(null);setEdit(null)}}><WoForm initial={edit||{}} onSave={save} onCancel={()=>{setModal(null);setEdit(null)}} pendingReqs={pendingReqs} isEdit={!!edit}/></Modal>}
    </div>
  )
}
function WoForm({initial,onSave,onCancel,pendingReqs,isEdit}){
  const[f,sf]=useState({so:'',product:'',qty:'',startDate:new Date().toISOString().slice(0,10),dueDate:'',lot:'',materialLots:'',_linkedReqId:null,...initial})
  const set=k=>e=>sf(p=>({...p,[k]:e.target.value}))
  const matLotOpts=useMemo(()=>loadMaterialLotOptions(),[])
  const orderableModels=useMemo(()=>loadOrderableModels(),[])
  const applyReq=(reqId)=>{
    const r=(pendingReqs||[]).find(x=>x.id===reqId)
    if(!r)return
    sf(p=>({...p,so:r.so||'',product:r.item||'',qty:r.qty||'',dueDate:r.dueDate||'',_linkedReqId:r.id}))
  }
  return(
    <div className="space-y-3">
      {!isEdit && (pendingReqs||[]).length>0 && (
        <FL label="영업·재고 생산요청에서 불러오기 (선택 시 자동입력)">
          <select style={sel} defaultValue="" onChange={e=>e.target.value&&applyReq(e.target.value)}>
            <option value="">대기중인 생산요청 선택...</option>
            {pendingReqs.map(r=><option key={r.id} value={r.id}>{r.id} — {r.item} ({r.qty}EA) {r.note?`· ${r.note}`:''}</option>)}
          </select>
        </FL>
      )}
      <div className="grid grid-cols-2 gap-3">
        <FL label="제품명 * (허가 모델 검색)">
          <input style={inp} list="wo-model-list" value={f.product} onChange={set('product')} placeholder="허가 모델 검색..."/>
          <datalist id="wo-model-list">{orderableModels.map(m=><option key={m.id} value={m.spec||m.code}>{m.productName?`${m.productName} · ${m.code}`:m.code}</option>)}</datalist>
        </FL>
        <FL label="수량(EA)"><input style={inp} type="number" value={f.qty} onChange={set('qty')}/></FL>
        <FL label="시작일"><input style={inp} type="date" value={f.startDate} onChange={set('startDate')}/></FL>
        <FL label="완료예상일"><input style={inp} type="date" value={f.dueDate} onChange={set('dueDate')}/></FL>
      </div>
      <div className="text-[11px] px-2.5 py-2 rounded-lg" style={{background:'var(--bg-soft)',color:'var(--ink-faint)'}}>현 공정 단계·담당팀/자·진행률·상태는 개발(생산 제어 계획)에서 정의한 공정 순서와 공정기록 입력 현황에 따라 자동으로 계산됩니다. (취소만 목록에서 별도 처리)</div>
      <div className="pt-1" style={{borderTop:'1px solid var(--line)'}}>
        <div className="text-[11.5px] font-medium mt-2 mb-2" style={{color:'var(--ink-mute)'}}>LOT 추적 정보 (제품추적성관리 연동)</div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="완제품 LOT 번호"><input style={inp} value={f.lot} onChange={set('lot')} placeholder="예) LOT-2606-001" list="wo-fin-lot-list"/></FL>
          <FL label="사용 원자재 LOT (콤마 구분)"><input style={inp} value={f.materialLots} onChange={set('materialLots')} placeholder="예) LOT-2406-012, LOT-2405-008" list="wo-mat-lot-list"/></FL>
        </div>
        <datalist id="wo-mat-lot-list">{matLotOpts.map(l=><option key={l} value={l}/>)}</datalist>
      </div>
      <div className="flex gap-2 pt-2"><SBtn onClick={()=>f.product&&onSave(f)}>{initial.product?'수정 저장':'WO 발행'}</SBtn><SBtn onClick={onCancel} secondary>취소</SBtn></div>
    </div>
  )
}

/* ─── 공정 기록 (WO별 공정 흐름 카드) ─── */
const STEP_ICON = { done: CheckCircle2, fail: XCircle, todo: Circle }
const STEP_COLOR = { done: 'var(--moss)', fail: 'var(--rust)', todo: 'var(--ink-faint)' }
function StepChip({label,status,onClick}){
  const Icon = STEP_ICON[status] || Circle
  const c = STEP_COLOR[status] || 'var(--ink-faint)'
  return(
    <button onClick={onClick} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium shrink-0 transition hover:opacity-80" style={{border:`1px solid ${status==='todo'?'var(--line)':c}`,background:status==='todo'?'var(--bg-soft)':(status==='fail'?'var(--rust-soft)':'var(--leaf-soft)'),color:c}}>
      <Icon size={13}/> {label}
    </button>
  )
}
function WoProcCard({w,proc,pcps,setProc,focused}){
  const[histOpen,setHistOpen]=useState(false)
  const[stepModal,setStepModal]=useState(null) // {pcpStep, record}
  const pcp = useMemo(()=>findPcpForProduct(w.product, pcps), [w.product, pcps])
  const pcpSteps = useMemo(()=>orderedSteps(pcp), [pcp])
  const derived = useMemo(()=>deriveStepsFromRecords(w.id, proc), [w.id, proc])
  const steps = pcpSteps.length>0 ? pcpSteps : derived
  const records = proc.filter(p=>p.wo===w.id)
  const resultOpts=['합격','조건부합격','불합격','해당없음']
  const openStep = (pcpStep) => {
    const rec = latestOrNullFor(w.id, pcpStep?.stepName, proc)
    setStepModal({pcpStep, record: rec})
  }
  const saveStep = (f) => {
    if (f.editId) { setProc(p=>p.map(x=>x.id===f.editId?{...x,...f}:x)) }
    else { setProc(p=>[...p,{id:nid('PR'),date:new Date().toISOString().slice(0,10),...f}]) }
    setStepModal(null)
  }
  const delRec = id=>{if(window.confirm('삭제하시겠습니까?'))setProc(p=>p.filter(x=>x.id!==id))}
  return(
    <Card>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[12px] font-bold" style={{color:'var(--moss)'}}>{w.id}</span>
          <Badge text={w.product} tone="blue"/>
          <Badge text={`${w.qty}EA`} tone="gray"/>
          <Badge text={w.status} tone={statusTone(w.status)}/>
        </div>
        <span className="text-[11px]" style={{color:'var(--ink-faint)'}}>{pcp?`연동 PCP: ${pcp.pcpNo||pcp.productName}`:(derived.length>0?'공정 정의 없음 — 기록 기반 임시 흐름':'공정 정의 없음')}</span>
      </div>
      {steps.length===0?(
        <div className="text-[12px] py-3 text-center" style={{color:'var(--ink-mute)'}}>등록된 공정 흐름이 없습니다. 아래 버튼으로 첫 공정 기록을 추가하세요.</div>
      ):(
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          {steps.map((s,i)=>(
            <React.Fragment key={s.id||s.stepName+i}>
              <StepChip label={s.stepName} status={stepStatus(w.id, s.stepName, proc)} onClick={()=>openStep(pcpSteps.length>0?s:{stepName:s.stepName,equipment:s.equipment,controlParams:s.controlParams,freeform:true})}/>
              {i<steps.length-1&&<ChevronRight size={13} style={{color:'var(--ink-faint)'}}/>}
            </React.Fragment>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 mt-2">
        {steps.length===0 && <ActBtn label="+ 첫 공정 기록 추가" onClick={()=>setStepModal({pcpStep:null, record:null})}/>}
        <ActBtn label={histOpen?'이력 숨기기':`이력 보기 (${records.length}건)`} onClick={()=>setHistOpen(v=>!v)}/>
      </div>
      {histOpen&&(
        <div className="overflow-x-auto mt-3">
          <table className="w-full">
            <thead><tr>{['기록ID','일자','공정단계','설비','작업자','실측/파라미터','결과','비고','첨부','작업'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>{records.length===0?<EmptyRow/>:records.map(p=>(
      <tr key={p.id}>
                <TD mono color="var(--moss)">{p.id}</TD>
                <TD mono muted>{p.date}</TD>
                <TD><span className="font-medium">{p.step}</span></TD>
                <TD muted>{p.machine}</TD>
                <TD>{p.operator}</TD>
                <TD muted>{p.measured||p.param}</TD>
                <TD><Badge text={p.result} tone={statusTone(p.result)}/></TD>
                <TD muted>{p.note||'—'}</TD>
                <TD>{p.fileId?<AttachLink fileId={p.fileId} fileName={p.fileName}/>:<span style={{color:'var(--ink-faint)'}}>—</span>}</TD>
                <TD><div className="flex gap-1"><ActBtn label="수정" onClick={()=>setStepModal({pcpStep:pcpSteps.find(s=>s.stepName===p.step)||null, record:p})}/><ActBtn label="삭제" color="red" onClick={()=>delRec(p.id)}/></div></TD>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {stepModal&&<Modal title={stepModal.record?'공정 기록 수정':(stepModal.pcpStep?`공정 입력 — ${stepModal.pcpStep.stepName}`:'공정 기록 추가')} onClose={()=>setStepModal(null)}>
        <StepEntryForm woId={w.id} pcpStep={stepModal.pcpStep} record={stepModal.record} resultOpts={resultOpts} onSave={saveStep} onCancel={()=>setStepModal(null)}/>
      </Modal>}
    </Card>
  )
}
function latestOrNullFor(woId, stepName, procRecords){
  if(!stepName) return null
  const matches=(procRecords||[]).filter(r=>r.wo===woId&&r.step===stepName)
  if(!matches.length) return null
  return [...matches].sort((a,b)=>new Date(b.date||0)-new Date(a.date||0))[0]
}
function StepEntryForm({woId,pcpStep,record,resultOpts,onSave,onCancel}){
  const isPcp = !!(pcpStep && !pcpStep.freeform)
  const[f,sf]=useState({
    wo:woId,
    step:pcpStep?pcpStep.stepName:'',
    machine:pcpStep?pcpStep.equipment:'',
    operator:'',
    param:isPcp?(pcpStep.controlParams||''):'',
    measured:'',
    result:'합격',
    note:'',
    ncrDesc:'',
    fileId:null,fileName:'',
    ...record,
    editId:record?record.id:undefined,
  })
  const set=k=>e=>sf(p=>({...p,[k]:e.target.value}))
  const canSave = f.step && f.operator
  const isNc = f.result==='불합격'||f.result==='조건부합격'
  // 공정기록에서 불합격/조건부합격으로 판정되면 부적합(NCR)이 자동 발행된다(품질 부적합관리와 동일 저장소). (#137)
  const submit = () => {
    if (!canSave) return
    let next = { ...f }
    if (isNc && !next.ncrId) {
      const raised = ncrLib.raise({
        title: `공정기록 부적합 — ${f.step} (WO ${woId})`,
        description: f.ncrDesc || f.note || '(상세 내용 미입력)',
        severity: f.result==='불합격' ? NCR_SEVERITY.MAJOR : NCR_SEVERITY.MINOR,
        source: { type: 'process_record', woId, stepName: f.step },
      })
      next.ncrId = raised.id
    }
    onSave(next)
  }
  return(
    <div className="space-y-3">
      {isPcp?(
        <div className="rounded-lg p-3 text-[12px] space-y-1" style={{background:'var(--bg-soft)',color:'var(--ink-mute)'}}>
          <div><b style={{color:'var(--ink)'}}>공정단계:</b> {pcpStep.stepName} {pcpStep.processType&&`(${pcpStep.processType})`}</div>
          <div><b style={{color:'var(--ink)'}}>설비:</b> {pcpStep.equipment||'—'}</div>
          <div><b style={{color:'var(--ink)'}}>관리 파라미터 기준:</b> {pcpStep.controlParams||'—'}</div>
          <div><b style={{color:'var(--ink)'}}>관리 방법:</b> {pcpStep.controlMethod||'—'}</div>
          <div><b style={{color:'var(--ink)'}}>합격 기준:</b> {pcpStep.acceptanceCriteria||'—'}</div>
          {pcpStep.responsible&&<div><b style={{color:'var(--ink)'}}>책임자:</b> {pcpStep.responsible}</div>}
        </div>
      ):(
        <div className="grid grid-cols-2 gap-3">
          <FL label="공정 단계 *"><input style={inp} value={f.step} onChange={set('step')} placeholder="예) CNC 선삭"/></FL>
          <FL label="사용 설비"><input style={inp} value={f.machine} onChange={set('machine')} placeholder="CNC-01, 외주 등"/></FL>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <FL label="작업자 *"><input style={inp} value={f.operator} onChange={set('operator')}/></FL>
        <FL label="결과"><select style={sel} value={f.result} onChange={set('result')}>{resultOpts.map(o=><option key={o}>{o}</option>)}</select></FL>
      </div>
      {isPcp?(
        <FL label="실측값 / 실제 기록"><textarea style={{...inp,minHeight:'50px',resize:'vertical'}} value={f.measured} onChange={set('measured')} placeholder="실제 측정값·LOT번호 등을 입력하세요"/></FL>
      ):(
        <FL label="공정 파라미터"><textarea style={{...inp,minHeight:'50px',resize:'vertical'}} value={f.param} onChange={set('param')} placeholder="설정값, 조건, LOT번호 등"/></FL>
      )}
      <FL label="비고"><input style={inp} value={f.note} onChange={set('note')}/></FL>
      {isNc && (
        <FL label="부적합 상세 내용 (부적합관리(NCR)에 자동 등록됩니다)">
          <textarea style={{...inp,minHeight:'60px',resize:'vertical'}} value={f.ncrDesc} onChange={set('ncrDesc')} placeholder="무엇이 어떻게 기준을 벗어났는지 기입하세요"/>
        </FL>
      )}
      <SingleAttach label="첨부 파일 (배치기록·LOT 서류 등)" fileId={f.fileId} fileName={f.fileName} onAttach={(id,name)=>sf(p=>({...p,fileId:id,fileName:name}))} onRemove={()=>sf(p=>({...p,fileId:null,fileName:''}))}/>
      <div className="flex gap-2 pt-2"><SBtn onClick={submit}>{record?'수정 저장':'기록 저장'}</SBtn><SBtn onClick={onCancel} secondary>취소</SBtn></div>
    </div>
  )
}
function ProcRecView({proc,setProc,wo,pcps,focusWo}){
  const ordered = useMemo(()=>{
    if(!focusWo) return wo
    const f = wo.find(w=>w.id===focusWo)
    if(!f) return wo
    return [f, ...wo.filter(w=>w.id!==focusWo)]
  }, [wo, focusWo])
  return(
    <div>
      <SectionTitle breadcrumb="공정 기록">공정 기록 (배치 레코드)</SectionTitle>
      <div className="space-y-4">
        {ordered.length===0?<Card><EmptyCard/></Card>:ordered.map(w=>(
          <div key={w.id} style={focusWo===w.id?{outline:'2px solid var(--moss)',borderRadius:'12px'}:undefined}>
            <WoProcCard w={w} proc={proc} pcps={pcps} setProc={setProc} focused={focusWo===w.id}/>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── 공정 검사 ─── */
function InspectCertificate({insp,wo,onClose}){
  const w = wo.find(x=>x.id===insp.wo)
  const Row=({label,value})=><div className="grid grid-cols-3 gap-2 py-1.5" style={{borderBottom:'1px solid var(--line)'}}><span className="text-[11.5px]" style={{color:'var(--ink-faint)'}}>{label}</span><span className="col-span-2 text-[12.5px]" style={{color:'var(--ink)'}}>{value||'—'}</span></div>
  return(
    <div className="space-y-1">
      <div className="text-center mb-3">
        <div className="text-[15px] font-bold" style={{color:'var(--ink)'}}>공정검사성적서</div>
        <div className="text-[11px]" style={{color:'var(--ink-faint)'}}>In-Process Inspection Certificate · ISO 13485 §8.2.6</div>
      </div>
      <Row label="검사 ID" value={insp.id}/>
      <Row label="검사일" value={insp.date}/>
      <Row label="작업지시(WO)" value={insp.wo}/>
      <Row label="제품명" value={w?.product}/>
      <Row label="검사 단계" value={insp.step}/>
      <Row label="검사자" value={insp.inspector}/>
      <Row label="검사 규격" value={insp.spec}/>
      <Row label="실측값" value={insp.measured}/>
      <Row label="결과" value={<Badge text={insp.status} tone={statusTone(insp.status)}/>}/>
      <Row label="첨부" value={insp.fileId?<AttachLink fileId={insp.fileId} fileName={insp.fileName}/>:'—'}/>
      <div className="flex gap-2 pt-4">
        <SBtn onClick={()=>printInspectionCert(insp,w)}><span className="flex items-center gap-1.5"><Printer size={13}/> 인쇄</span></SBtn>
        <SBtn onClick={onClose} secondary>닫기</SBtn>
      </div>
    </div>
  )
}
/* 공정검사(IPC)는 더 이상 별도로 등록·입력하지 않는다 — 각 공정기록(StepEntryForm)의
   작업자/결과/실측값 입력이 곧 공정검사 결과이므로, 이 화면은 공정기록에서 파생된
   읽기 전용 뷰로만 동작한다 (§8.2.6 요구사항 충족은 공정기록 입력 시점에 이미 완료됨). */
function InspectView({proc,wo}){
  const[certRow,setCertRow]=useState(null)
  const inspect = useMemo(()=>proc.map(p=>({
    id:p.id, date:p.date, wo:p.wo, step:p.step, inspector:p.operator,
    spec:p.param, measured:p.measured||p.param, status:p.result,
    fileId:p.fileId, fileName:p.fileName, note:p.note,
  })).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))), [proc])
  return(
    <div>
      <SectionTitle breadcrumb="공정 검사 (IPC)">공정 검사</SectionTitle>
      <div className="mb-3 text-[11.5px] px-1" style={{color:'var(--ink-faint)'}}>ℹ 공정검사 결과는 공정기록 입력 시 함께 기록됩니다 — 이 화면은 결과를 모아보는 조회 전용 화면입니다. 입력·수정은 공정기록에서 해주세요.</div>
      <Card>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{color:'var(--ink-faint)'}}>공정검사 결과 (ISO 13485 §8.2.6) — {inspect.length}건 · 행 클릭 시 성적서 보기</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['검사ID','WO','검사단계','검사일','검사자','규격/파라미터','측정값','결과','첨부'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>{inspect.length===0?<EmptyRow/>:inspect.map(i=>(
      <tr key={i.id} onClick={()=>setCertRow(i)} className="cursor-pointer" style={{transition:'background 0.1s'}} onMouseEnter={e=>e.currentTarget.style.background='var(--bg-soft)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <TD mono color="var(--moss)">{i.id}</TD>
                <TD mono muted>{i.wo}</TD>
                <TD>{i.step}</TD>
                <TD mono muted>{i.date}</TD>
                <TD>{i.inspector}</TD>
                <TD muted>{i.spec}</TD>
                <TD mono muted>{i.measured}</TD>
                <TD><Badge text={i.status||'미입력'} tone={statusTone(i.status||'')}/></TD>
                <TD>{i.fileId?<AttachLink fileId={i.fileId} fileName={i.fileName}/>:<span style={{color:'var(--ink-faint)'}}>—</span>}</TD>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
      {certRow&&<Modal title="공정검사성적서" onClose={()=>setCertRow(null)}><InspectCertificate insp={certRow} wo={wo} onClose={()=>setCertRow(null)}/></Modal>}
    </div>
  )
}

/* ─── 부적합 관리 (NCR) — 공정기록에서 발행된 부적합(품질 NCR 저장소)을 모아보는 조회 전용 화면 ─── */
function loadProcessNcrs(){
  try { return ncrLib.loadAll().filter(n=>n.source?.type==='process_record') } catch { return [] }
}
function NcrView({wo,openId}){
  const[list,setList]=useState(()=>loadProcessNcrs())
  const[expanded,setExpanded]=useState(openId||null)
  useEffect(()=>{ setList(loadProcessNcrs()) },[])
  const open=list.filter(n=>n.status!=='closed'&&n.status!=='corrected')
  const woProduct = id => wo.find(w=>w.id===id)?.product || ''
  return(
    <div>
      <SectionTitle breadcrumb="부적합 관리 (NCR)">부적합 관리 (NCR)</SectionTitle>
      <div className="mb-4 p-3 rounded-lg text-[12px]" style={{background:'var(--bg-soft)',color:'var(--ink-faint)'}}>
        ℹ 부적합은 공정기록에서 결과가 "불합격/조건부합격"으로 입력되면 자동으로 접수됩니다. 조사·조치·CAPA 연동·종결 처리는 품질·검사 화면에서 진행하며, 이 화면은 진행 상황을 확인하는 조회 전용입니다.
      </div>
      {open.length>0&&<div className="mb-4 p-3 rounded-lg flex items-start gap-2" style={{background:'var(--rust-soft)',border:'1px solid var(--rust)'}}><AlertTriangle size={14} style={{color:'var(--rust)',marginTop:2}}/><span className="text-[12.5px]" style={{color:'var(--rust)'}}><b>미결 부적합 {open.length}건</b> — 품질에서 조치 진행 중 (ISO 13485 §8.3)</span></div>}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{color:'var(--ink-faint)'}}>부적합 목록 — {list.length}건</span>
          <button onClick={()=>setList(loadProcessNcrs())} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium" style={{background:'var(--bg-soft)',border:'1px solid var(--line)',color:'var(--ink-soft)'}}>새로고침</button>
        </div>
        <div className="space-y-3">
          {list.length===0?<EmptyCard/>:list.map(n=>{
            const sl = NCR_STATUS_LABEL[n.status]||{ko:n.status,tone:'gray'}
            return(
      <div key={n.id} className="p-3 rounded-xl cursor-pointer" onClick={()=>setExpanded(expanded===n.id?null:n.id)} style={{border:`1px solid ${n.status!=='closed'?'var(--rust)':'var(--line)'}`,background:'var(--bg)'}}>
              <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[12px] font-bold" style={{color:'var(--rust)'}}>{n.id}</span>
                  <span className="text-[11px]" style={{color:'var(--ink-faint)'}}>{(n.detectedAt||'').slice(0,10)}</span>
                  <Badge text={n.source?.woId||'-'} tone="gray"/>
                  <Badge text={n.severity} tone={n.severity==='Critical'?'red':n.severity==='Major'?'amber':'gray'}/>
                  <Badge text={sl.ko} tone={n.status==='closed'?'gray':'amber'}/>
                </div>
              </div>
              <div className="text-[13px]" style={{color:'var(--ink)'}}>{n.title}</div>
              {expanded===n.id && (
                <div className="mt-2 pt-2 space-y-1" style={{borderTop:'1px solid var(--line)'}}>
                  <div className="text-[12.5px]" style={{color:'var(--ink)'}}>{n.description}</div>
                  <div className="mt-1.5 flex gap-3 flex-wrap text-[11.5px]" style={{color:'var(--ink-mute)'}}>
                    <span>제품: {woProduct(n.source?.woId)}</span>
                    <span>공정: {n.source?.stepName||'-'}</span>
                    <span>발견자: {n.detectedBy}</span>
                    {n.capaId&&<span>CAPA: <span className="font-mono" style={{color:'var(--moss)'}}>{n.capaId}</span></span>}
                  </div>
                </div>
              )}
            </div>
          )})}
        </div>
      </Card>
    </div>
  )
}

/* ─── 생산 실적 ─── */
function PerfView({wo}){
  const done=wo.filter(w=>w.status==='완료')
  const inProg=wo.filter(w=>w.status==='진행중')
  return(
    <div>
      <SectionTitle breadcrumb="생산 실적">생산 실적</SectionTitle>
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          {label:'진행중 WO',value:inProg.length+'건',color:'var(--moss)'},
          {label:'완료 WO',value:done.length+'건',color:'#1d4ed8'},
          {label:'전체 WO',value:wo.length+'건',color:'var(--ink)'},
        ].map(s=><div key={s.label} className="rounded-xl p-4" style={{background:'var(--bg-card)',border:'1px solid var(--line)'}}><div className="text-[12px]" style={{color:'var(--ink-mute)'}}>{s.label}</div><div className="text-[24px] font-bold mt-0.5" style={{color:s.color}}>{s.value}</div></div>)}
      </div>
      <Card>
        <div className="font-mono text-[10px] tracking-widest uppercase mb-3" style={{color:'var(--ink-faint)'}}>WO 현황</div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['WO번호','제품','수량','시작일','납기일','담당','진행률','상태'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>{wo.length===0?<EmptyRow/>:wo.map(w=>(
      <tr key={w.id}>
                <TD mono color="var(--moss)">{w.id}</TD>
                <TD>{w.product}</TD>
                <TD right>{w.qty}EA</TD>
                <TD mono muted>{w.startDate}</TD>
                <TD mono muted>{w.dueDate}</TD>
                <TD muted>{w.assignee}</TD>
                <TD>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-full h-1.5" style={{background:'var(--bg-soft)',minWidth:60}}>
                      <div className="rounded-full h-1.5" style={{width:`${w.progress}%`,background:'var(--moss)'}}/>
                    </div>
                    <span className="text-[11px] font-mono" style={{color:'var(--ink-mute)'}}>{w.progress}%</span>
                  </div>
                </TD>
                <TD><Badge text={w.status} tone={statusTone(w.status)}/></TD>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

/* ─── 생산 홈 ─── */
function MfgHome({wo,proc,onNavigate}){
  const inProg=wo.filter(w=>w.status==='진행중').length
  const openNcr=useMemo(()=>loadProcessNcrs().filter(n=>n.status!=='closed'&&n.status!=='corrected').length,[proc])
  const attn=proc.filter(p=>p.result==='조건부합격'||p.result==='불합격').length
  const passCount=proc.filter(p=>p.result==='합격').length
  const CARDS=[
    {id:'wo',icon:ClipboardList,label:'작업지시 (WO)',desc:'WO 발행 · 진행률 · 공정단계 관리',count:`${inProg}건 진행중`,warn:false},
    {id:'proc',icon:FileText,label:'공정 기록',desc:'배치 레코드 · 공정 파라미터 기록',count:`${proc.length}건`},
    {id:'inspect',icon:Activity,label:'공정 검사 (IPC)',desc:'공정검사 규격 vs 측정값 (공정기록 기반 조회)',count:`${attn}건 주의`,warn:attn>0},
    {id:'ncr',icon:AlertTriangle,label:'부적합 관리 (NCR)',desc:'발생 부적합 · 처리방법 · CAPA 연동',count:`${openNcr}건 미결`,warn:openNcr>0},
    {id:'perf',icon:Cog,label:'생산 실적',desc:'WO 현황 · 진행률 통계',count:`${wo.length}건`},
  ]
  const summary=[
    {label:'진행중 WO',value:`${inProg}건`,warn:false,sub:'현재 생산 중'},
    {label:'미결 NCR',value:`${openNcr}건`,warn:openNcr>0,sub:'조치 필요'},
    {label:'공정 기록',value:`${proc.length}건`,warn:false,sub:'배치 레코드'},
    {label:'공정 검사',value:`${proc.length}건`,warn:false,sub:`합격 ${passCount}건`},
  ]
  return(
    <div>
      <HubBanner
          title="생산 관리"
          subtitle="ISO 13485 §7.5 · 작업지시 · 공정 관리 · 생산 이력 · UDI"
          icon={Factory}
          color="#D97706"
          quickActions={[{label:'작업지시 등록',icon:Plus,onClick:()=>onNavigate('wo'),primary:true}]}
          workflow={['계획 수립','작업지시 발행','자재 출고','공정 작업','공정검사','완제품 입고']}
        />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
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
      </div>
    </div>
  )
}

/* ─── 메인 ─── */
export default function ManufacturingHub(){
  const user=auth.current()
  const [searchParams] = useSearchParams()
  const[view,setView]=useState(searchParams.get('tab') || 'home')
  const editId = searchParams.get('edit')
  const[wo,setWo]=useLS('qms_mfg_wo',INIT_WO)
  const[proc,setProc]=useLS('qms_mfg_proc',INIT_PROC)
  const[focusWo,setFocusWo]=useState(null)
  const pcps = useMemo(()=>loadPcps(), [view])
  const onOpenProc = (woId) => { setFocusWo(woId); setView('proc') }

  /* 작업지시 진행률을 개발에서 정의한 공정 순서·공정기록 입력 현황에 따라 자동 계산하고,
     100%에 도달하면 상태를 자동으로 '완료'로 전환한다 (완제품재고/수주상태 자동 연동 포함). */
  useEffect(() => {
    const curPcps = loadPcps()
    let changed = false
    const statusChanges = []
    const next = wo.map(w => {
      if (w.status === '취소') return w
      const { pct, auto } = computeWoProgress(w, proc, curPcps)
      const cur = deriveCurrentStep(w, proc, curPcps)
      const newStep = cur.stepName || w.step
      const newAssignee = cur.responsible || w.assignee
      if (!auto) {
        if (newStep === w.step && newAssignee === w.assignee) return w
        changed = true
        return { ...w, step: newStep, assignee: newAssignee }
      }
      const pctStr = String(pct)
      const newStatus = w.status === '완료' ? '완료' : (pct === 100 ? '완료' : pct === 0 ? '대기' : '진행중')
      if (w.progress === pctStr && newStatus === w.status && newStep === w.step && newAssignee === w.assignee) return w
      changed = true
      if (newStatus !== w.status) statusChanges.push([w.id, newStatus])
      return { ...w, progress: pctStr, status: newStatus, step: newStep, assignee: newAssignee }
    })
    if (changed) {
      setWo(syncWoCompletionEffects(next))
      statusChanges.forEach(([id, st]) => syncOrderStatusFromWo(id, st))
    }
  }, [wo, proc])

  const tabLabels={wo:'작업지시(WO)',proc:'공정기록',inspect:'공정검사',ncr:'부적합(NCR)',perf:'생산실적'}
  const viewMap={
    home:<MfgHome wo={wo} proc={proc} onNavigate={setView}/>,
    wo:<WoView wo={wo} setWo={setWo} openId={editId} proc={proc} pcps={pcps} onOpenProc={onOpenProc}/>,
    proc:<ProcRecView proc={proc} setProc={setProc} wo={wo} pcps={pcps} focusWo={focusWo}/>,
    inspect:<InspectView proc={proc} wo={wo}/>,
    ncr:<NcrView wo={wo} openId={editId}/>,
    perf:<PerfView wo={wo}/>,
  }
  return(
    <AppLayout user={user} title="생산" subtitle="작업지시 · 공정기록 · 검사 · 부적합 관리">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto">
        {view!=='home'&&<button onClick={()=>{setView('home');setFocusWo(null)}} className="flex items-center gap-1.5 mb-5 text-[13px]" style={{color:'var(--moss)'}}><ArrowLeft size={14}/> 생산 홈</button>}
        {view!=='home'&&<div className="flex gap-1 flex-wrap mb-5">{Object.entries(tabLabels).map(([id,label])=><button key={id} onClick={()=>{setView(id);if(id!=='proc')setFocusWo(null)}} className="text-[12px] px-3 py-1.5 rounded-lg border transition" style={{background:view===id?'var(--moss)':'var(--bg-card)',color:view===id?'var(--bg)':'var(--ink-mute)',borderColor:view===id?'var(--moss)':'var(--line)'}}>{label}</button>)}</div>}
        {viewMap[view]||viewMap.home}
      </div>
    </AppLayout>
  )
}
