import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
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

/* âââ util âââ */
function useLS(key,init){const[v,setV]=useState(()=>{try{const raw=localStorage.getItem(key);if(raw!=null)return JSON.parse(raw);localStorage.setItem(key,JSON.stringify(init));return init}catch{return init}});const set=(u)=>{const n=typeof u==='function'?u(v):u;localStorage.setItem(key,JSON.stringify(n));setV(n)};return[v,set]}
const nid=(p)=>`${p}-${new Date().toISOString().slice(2,4)}${String(new Date().getMonth()+1).padStart(2,'0')}-${String(Date.now()).slice(-3)}`
function loadMaterialLotOptions(){try{const inv=JSON.parse(localStorage.getItem('qms_pur_inventory')||'[]');const set=new Set();inv.forEach(m=>{if(m.lot)set.add(m.lot);(m.receipts||[]).forEach(r=>{if(r.lot)set.add(r.lot)})});return[...set]}catch{return[]}}
/* íê° ëª¨ë¸(ì íÂ·ê³µì  íë©´ìì ë±ë¡) ê²ìì© ëª©ë¡ â ìì íë©´ê³¼ ëì¼í ìì¤ */
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
/* ìì/ì¬ê³ ìì ë±ë¡ë ë¯¸ì°ê³ ìì°ìì²­(qms_sal_prodreqs) â WO ë°í ì í´ë¦­ í ë²ì¼ë¡ ë¶ë¬ì¤ê¸°ì© */
function loadPendingProdReqs(){
  try{
    const list=JSON.parse(localStorage.getItem('qms_sal_prodreqs')||'[]')
    return Array.isArray(list)?list.filter(r=>!r.wo&&!['ìë£','ì·¨ì'].includes(r.status)):[]
  }catch{return[]}
}
function linkProdReqToWo(prId,woId){
  try{
    const list=JSON.parse(localStorage.getItem('qms_sal_prodreqs')||'[]')
    const next=(Array.isArray(list)?list:[]).map(r=>r.id===prId?{...r,wo:woId,status:'WOë°íìë£'}:r)
    localStorage.setItem('qms_sal_prodreqs',JSON.stringify(next))
  }catch{}
}
const inp={width:'100%',padding:'7px 10px',borderRadius:'7px',border:'1px solid var(--line)',background:'var(--bg)',color:'var(--ink)',fontSize:'13px',outline:'none'}
const sel={...inp,appearance:'none'}
const Badge=({text,tone='gray'})=>{const c={red:{bg:'var(--rust-soft)',fg:'var(--rust)'},green:{bg:'var(--leaf-soft)',fg:'var(--moss)'},amber:{bg:'#fff7ed',fg:'#b45309'},blue:{bg:'#eff6ff',fg:'#1d4ed8'},gray:{bg:'var(--bg-soft)',fg:'var(--ink-mute)'}}[tone]??{bg:'var(--bg-soft)',fg:'var(--ink-mute)'};return <span className="font-mono text-[10px] tracking-wider px-1.5 py-0.5 rounded" style={{background:c.bg,color:c.fg,fontWeight:500}}>{text}</span>}
const statusTone=(s='')=>{if(s.includes('ë¶í©ê²©')||s.includes('ë¶ë')||s.includes('ì·¨ì')||s.includes('ì¬ê°')||s.includes('íê¸°'))return'red';if(s.includes('ëê¸°')||s.includes('ì¡°ì¹')||s.includes('ê²ì¬ì¤')||s.includes('ì§í')||s.includes('ì¡°ê±´ë¶'))return'amber';if(s.includes('ìë£')||s.includes('í©ê²©')||s.includes('ì¢ê²°')||s.includes('ì ì')||s.includes('ì¹ì¸'))return'green';return'gray'}
const TH=({children})=><th className="pb-2 text-left font-medium px-2 first:pl-0 whitespace-nowrap text-[11.5px]" style={{color:'var(--ink-faint)',borderBottom:'1px solid var(--line)'}}>{children}</th>
const TD=({children,mono,color,right,muted})=><td className={`py-2 px-2 first:pl-0 text-[12.5px]${mono?' font-mono text-[11px]':''}${right?' text-right tabular-nums':''}`} style={{color:color||(muted?'var(--ink-mute)':'var(--ink)'),borderBottom:'1px solid var(--line)'}}>{children}</td>
const ActBtn=({label,color,onClick})=><button onClick={onClick} className="text-[11px] px-2 py-0.5 rounded hover:opacity-80" style={{background:color==='red'?'var(--rust-soft)':color==='green'?'var(--leaf-soft)':'var(--bg-soft)',color:color==='red'?'var(--rust)':color==='green'?'var(--moss)':'var(--ink-mute)',fontWeight:500}}>{label}</button>
const SBtn=({children,onClick,secondary})=><button onClick={onClick} className="px-4 py-2 rounded-lg text-[13px] font-medium" style={{background:secondary?'var(--bg-soft)':'var(--moss)',color:secondary?'var(--ink-mute)':'var(--bg)'}}>{children}</button>
const FL=({label,children})=><div><div className="text-[11.5px] font-medium mb-1" style={{color:'var(--ink-mute)'}}>{label}</div>{children}</div>
const Card=({children})=><div className="rounded-xl p-4" style={{background:'var(--bg-card)',border:'1px solid var(--line)'}}>{children}</div>
const StatusSelect=({value,options,onChange})=><select value={value} onChange={e=>onChange(e.target.value)} style={{...sel,padding:'3px 6px',fontSize:'11px',width:'auto'}}>{options.map(o=><option key={o}>{o}</option>)}</select>
const SectionTitle=({children,breadcrumb})=><div className="mb-5">{breadcrumb&&<div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-1" style={{color:'var(--ink-faint)'}}>ìì° / {breadcrumb}</div>}<h2 className="text-[22px]" style={{color:'var(--ink)',fontWeight:500}}>{children}</h2></div>
function EmptyRow({cols,msg}){return(<tr><td colSpan={cols||20} className="py-10 text-center text-sm" style={{color:"var(--ink-mute)"}}>{msg||"ë±ë¡ë í­ëª©ì´ ììµëë¤."}</td></tr>)}
function EmptyCard({msg}){return(<div className="py-10 text-center text-sm" style={{color:"var(--ink-mute)"}}>{msg||"ë±ë¡ë í­ëª©ì´ ììµëë¤."}</div>)}

function Modal({title,onClose,children}){return <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.45)'}} onClick={e=>e.target===e.currentTarget&&onClose()}><div className="rounded-2xl p-6 w-full max-w-lg max-h-[92vh] overflow-y-auto" style={{background:'var(--bg-card)',boxShadow:'0 24px 64px rgba(0,0,0,0.18)',border:'1px solid var(--line)'}}><div className="flex items-center justify-between mb-5"><h3 className="text-[17px] font-semibold" style={{color:'var(--ink)'}}>{title}</h3><button onClick={onClose} style={{color:'var(--ink-faint)'}}><X size={18}/></button></div>{children}</div></div>}

function SingleAttach({fileId,fileName,onAttach,onRemove,label}){
  const [busy,setBusy]=useState(false)
  const attach=async(file)=>{
    if(!file)return
    setBusy(true)
    try{ const id=await fileStore.saveFile(file); onAttach(id,file.name) }
    catch(e){ alert(e.message||'íì¼ ì²¨ë¶ì ì¤í¨íìµëë¤.') }
    finally{ setBusy(false) }
  }
  return(
    <FL label={label||'ì²¨ë¶ íì¼'}>
      {fileId?(
        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-[12px]" style={{background:'var(--bg-soft)',border:'1px solid var(--line)'}}>
          <span className="truncate" style={{color:'var(--moss)'}}>{fileName||'ì²¨ë¶ë¨'}</span>
          <button type="button" onClick={onRemove} style={{color:'var(--ink-faint)'}}><X size={12}/></button>
        </div>
      ):(
        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-medium cursor-pointer" style={{background:'var(--leaf-soft)',color:'var(--moss)'}}>
          <Paperclip size={12}/> {busy?'ìë¡ë ì¤...':'íì¼ ì²¨ë¶'}
          <input type="file" className="hidden" disabled={busy} onChange={e=>{const f=e.target.files?.[0];e.target.value='';attach(f)}}/>
        </label>
      )}
    </FL>
  )
}

function AttachLink({fileId,fileName}){
  if(!fileId) return null
  return <a href={fileStore.getObjectURL(fileId)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1" style={{color:'var(--moss)'}}><Paperclip size={11}/> {fileName||'ì²¨ë¶íì¼'}</a>
}

/* âââ ì´ê¸° ë°ì´í° âââ */
const INIT_WO=[
  {id:'WO-2406-018',so:'SO-2406-012',product:'SCS M3.5Ã22mm',qty:'200',step:'ê°ê³µì¤',dueDate:'24-06-25',startDate:'24-06-19',assignee:'3ê³µì í',progress:'60',status:'ì§íì¤'},
  {id:'WO-2406-017',so:'SO-2406-010',product:'SCS M4.0Ã24mm',qty:'300',step:'ê²ì¬ëê¸°',dueDate:'24-07-05',startDate:'24-06-17',assignee:'ê²ì¬í',progress:'80',status:'ì§íì¤'},
  {id:'WO-2406-015',so:'SO-2406-008',product:'BPL 4ã',qty:'50',step:'ìë£',dueDate:'24-06-20',startDate:'24-06-10',assignee:'â',progress:'100',status:'ìë£'},
  {id:'WO-2406-014',so:'SO-2406-005',product:'SCS M3.5Ã24mm',qty:'100',step:'ìë£',dueDate:'24-06-14',startDate:'24-06-05',assignee:'â',progress:'100',status:'ìë£'},
]
const INIT_PROC=[
  {id:'PR-2406-044',wo:'WO-2406-018',date:'24-06-21',step:'CNC ì ì­',machine:'CNC-01',operator:'ì´ê¸°ì ',param:'íì ì 2800rpm, ì´ì¡ìë 0.12mm/rev',result:'í©ê²©',note:''},
  {id:'PR-2406-043',wo:'WO-2406-018',date:'24-06-20',step:'ììì¬ ì¤ë¹',machine:'â',operator:'ë°ìì¬',param:'Ti-6Al-4V Ï12mm, LOT-2406-012',result:'í©ê²©',note:''},
  {id:'PR-2406-042',wo:'WO-2406-017',date:'24-06-21',step:'ìµì¢ê²ì¬',machine:'CMM-01',operator:'ê¹ê²ì¬',param:'ì¹ìê³µì°¨ Â±0.05mm',result:'í©ê²©',note:''},
]
const INIT_INSPECT=[
  {id:'IPC-2406-033',wo:'WO-2406-018',step:'CNC ì ì­ í ê³µì ê²ì¬',date:'24-06-21',inspector:'ì´ê¸°ì ',spec:'Ï3.5mm Â±0.02, ëì¬ í¼ì¹ 0.6mm',measured:'3.499, 0.600',result:'í©ê²©',status:'í©ê²©'},
  {id:'IPC-2406-032',wo:'WO-2406-017',step:'ìµì¢ì¹ì ê²ì¬',date:'24-06-21',inspector:'ê¹ê²ì¬',spec:'Ï4.0mm Â±0.02, L=24mm Â±0.1',measured:'4.001, 24.05',result:'í©ê²©',status:'í©ê²©'},
  {id:'IPC-2406-031',wo:'WO-2406-017',step:'íë©´ì²ë¦¬ í ì¸ê´ ê²ì¬',date:'24-06-20',inspector:'ì´ê²ì¬',spec:'ìë¸ë¤ì´ì§ ê· ì¼ë',measured:'ì´ì ìì (5EA ì ì¸)',result:'ì¡°ê±´ë¶í©ê²©',status:'ì¡°ê±´ë¶'},
]
const INIT_NCR=[
  {id:'NC-2406-003',date:'24-06-20',wo:'WO-2406-017',step:'íë©´ì²ë¦¬ í ì¸ê´',desc:'ìë¸ë¤ì´ì§ ë¶ê· ì¼ 5EA',severity:'ê²½ë¯¸',disposition:'ì¬ì²ë¦¬',capaNo:'CA-2406-005',status:'ì¡°ì¹ì¤'},
  {id:'NC-2406-001',date:'24-06-08',wo:'WO-2406-015',step:'ì±í í ì¹ì ê²ì¬',desc:'ì¸ê²½ ì´ê³¼ê³µì°¨ 1EA â íê¸°ì²ë¦¬',severity:'ê²½ë¯¸',disposition:'íê¸°',capaNo:'â',status:'ì¢ê²°'},
]

/* âââ ììì§ì (WO) âââ */
const WO_SORTS = {
  dueDate: { label:'ë©ê¸°ì¼ì', fn:(a,b)=>String(a.dueDate||'').localeCompare(String(b.dueDate||'')) },
  progress: { label:'ì§íë¥ ì', fn:(a,b)=>(Number(a.progress)||0)-(Number(b.progress)||0) },
  status: { label:'ìíì', fn:(a,b)=>String(a.status||'').localeCompare(String(b.status||'')) },
  id: { label:'WOë²í¸ì', fn:(a,b)=>String(a.id||'').localeCompare(String(b.id||'')) },
}
function WoView({wo,setWo,openId,proc,pcps,onOpenProc}){
  const[modal,setModal]=useState(null);const[edit,setEdit]=useState(null)
  const[sortKey,setSortKey]=useState('dueDate');const[sortDir,setSortDir]=useState('asc')
  useEffect(() => {
    if (openId) { const item = wo.find(x => x.id === openId); if (item) { setEdit(item); setModal('form') } }
  }, [openId])
  const statusOpts=['ëê¸°','ì§íì¤','ê²ì¬ì¤','ìë£','ì·¨ì']
  const [pendingReqs]=useState(()=>loadPendingProdReqs())
  const del=id=>{if(window.confirm('ì­ì íìê² ìµëê¹?'))setWo(p=>p.filter(x=>x.id!==id))}
  const save=f=>{
    const {_linkedReqId, ...rest} = f
    const id = edit ? edit.id : nid('WO')
    if(edit){setWo(p=>syncWoCompletionEffects(p.map(x=>x.id===edit.id?{...x,...rest}:x)));setEdit(null)}
    else{setWo(p=>syncWoCompletionEffects([...p,{id,progress:'0',status:'ëê¸°',...rest}]))}
    if(!edit) syncOrderStatusFromWo(id, rest.status || 'ëê¸°')
    if(_linkedReqId) linkProdReqToWo(_linkedReqId, id)
    setModal(null)
  }
  const sorted = useMemo(()=>{
    const arr = [...wo].sort(WO_SORTS[sortKey].fn)
    return sortDir==='desc' ? arr.reverse() : arr
  }, [wo, sortKey, sortDir])
  return(
    <div>
      <SectionTitle breadcrumb="ììì§ì (WO)">ììì§ì ê´ë¦¬</SectionTitle>
      <Card>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{color:'var(--ink-faint)'}}>ììì§ì ëª©ë¡ (ISO 13485 Â§7.5.1) â {wo.length}ê±´</span>
          <div className="flex items-center gap-2">
            <select style={{...sel,width:'auto',padding:'5px 8px',fontSize:'12px'}} value={sortKey} onChange={e=>setSortKey(e.target.value)}>
              {Object.entries(WO_SORTS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
            <button onClick={()=>setSortDir(d=>d==='asc'?'desc':'asc')} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px]" style={{background:'var(--bg-soft)',color:'var(--ink-mute)'}} title="ì ë ¬ ë°©í¥ ì í">
              <ArrowUpDown size={12}/>{sortDir==='asc'?'ì¤ë¦ì°¨ì':'ë´ë¦¼ì°¨ì'}
            </button>
            <button onClick={()=>{setEdit(null);setModal('form')}} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium" style={{background:'var(--moss)',color:'var(--bg)'}}><Plus size={13}/> WO ë°í</button>
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
                  {!['ì·¨ì','ìë£'].includes(w.status) ? (
                    <ActBtn label="ì·¨ì" color="red" onClick={()=>{if(window.confirm('ì´ ììì§ìë¥¼ ì·¨ìíìê² ìµëê¹?')){setWo(p=>p.map(x=>x.id===w.id?{...x,status:'ì·¨ì'}:x));syncOrderStatusFromWo(w.id,'ì·¨ì')}}}/>
                  ) : w.status==='ì·¨ì' && (
                    <ActBtn label="ì·¨ì ì² í" onClick={()=>setWo(p=>p.map(x=>x.id===w.id?{...x,status:'ëê¸°'}:x))}/>
                  )}
                  <ActBtn label="ìì " onClick={()=>{setEdit(w);setModal('form')}}/>
                  <ActBtn label="ì­ì " color="red" onClick={()=>del(w.id)}/>
                </div>
              </div>
              <div className="flex items-center gap-4 text-[12px] mb-2 flex-wrap" style={{color:'var(--ink-mute)'}}>
                <span>íê³µì : <b style={{color:'var(--ink)'}}>{w.step}</b></span>
                <span>ë´ë¹: {w.assignee}</span>
                <span>ìë£ììì¼: {w.dueDate}</span>
                {w.lot&&<span className="font-mono" style={{color:'#7C3AED'}}>ìì í LOT: {w.lot}</span>}
                <span onClick={e=>e.stopPropagation()}><AttachLink fileId={w.fileId} fileName={w.fileName}/></span>
                <span className="flex items-center gap-1" style={{color:'var(--moss)'}}>ê³µì ê¸°ë¡ ë³´ê¸° <ChevronRight size={12}/></span>
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-1" style={{color:'var(--ink-mute)'}}>
                  <span>ì§íë¥  {auto?'(ê³µì ê¸°ë¡ ìë ì°ë)':'(ê³µì  ë¯¸ì ì)'}</span><span style={{color:'var(--moss)',fontWeight:600}}>{pct}%</span>
                </div>
                <div className="rounded-full h-2" style={{background:'var(--bg-soft)'}}>
                  <div className="rounded-full h-2 transition-all" style={{width:`${pct}%`,background:pct===100?'var(--moss)':'#60a5fa'}}/>
                </div>
              </div>
            </div>
          )})}
        </div>
      </Card>
      {modal==='form'&&<Modal title={edit?'WO ìì ':'ììì§ì ë°í'} onClose={()=>{setModal(null);setEdit(null)}}><WoForm initial={edit||{}} onSave={save} onCancel={()=>{setModal(null);setEdit(null)}} pendingReqs={pendingReqs} isEdit={!!edit}/></Modal>}
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
        <FL label="ììÂ·ì¬ê³  ìì°ìì²­ìì ë¶ë¬ì¤ê¸° (ì í ì ìëìë ¥)">
          <select style={sel} defaultValue="" onChange={e=>e.target.value&&applyReq(e.target.value)}>
            <option value="">ëê¸°ì¤ì¸ ìì°ìì²­ ì í...</option>
            {pendingReqs.map(r=><option key={r.id} value={r.id}>{r.id} â {r.item} ({r.qty}EA) {r.note?`Â· ${r.note}`:''}</option>)}
          </select>
        </FL>
      )}
      <div className="grid grid-cols-2 gap-3">
        <FL label="ì íëª * (íê° ëª¨ë¸ ê²ì)">
          <input style={inp} list="wo-model-list" value={f.product} onChange={set('product')} placeholder="íê° ëª¨ë¸ ê²ì..."/>
          <datalist id="wo-model-list">{orderableModels.map(m=><option key={m.id} value={m.spec||m.code}>{m.productName?`${m.productName} Â· ${m.code}`:m.code}</option>)}</datalist>
        </FL>
        <FL label="ìë(EA)"><input style={inp} type="number" value={f.qty} onChange={set('qty')}/></FL>
        <FL label="ììì¼"><input style={inp} type="date" value={f.startDate} onChange={set('startDate')}/></FL>
        <FL label="ìë£ììì¼"><input style={inp} type="date" value={f.dueDate} onChange={set('dueDate')}/></FL>
      </div>
      <div className="text-[11px] px-2.5 py-2 rounded-lg" style={{background:'var(--bg-soft)',color:'var(--ink-faint)'}}>í ê³µì  ë¨ê³Â·ë´ë¹í/ìÂ·ì§íë¥ Â·ìíë ê°ë°(ìì° ì ì´ ê³í)ìì ì ìí ê³µì  ììì ê³µì ê¸°ë¡ ìë ¥ íí©ì ë°ë¼ ìëì¼ë¡ ê³ì°ë©ëë¤. (ì·¨ìë§ ëª©ë¡ìì ë³ë ì²ë¦¬)</div>
      <div className="pt-1" style={{borderTop:'1px solid var(--line)'}}>
        <div className="text-[11.5px] font-medium mt-2 mb-2" style={{color:'var(--ink-mute)'}}>LOT ì¶ì  ì ë³´ (ì íì¶ì ì±ê´ë¦¬ ì°ë)</div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="ìì í LOT ë²í¸"><input style={inp} value={f.lot} onChange={set('lot')} placeholder="ì) LOT-2606-001" list="wo-fin-lot-list"/></FL>
          <FL label="ì¬ì© ììì¬ LOT (ì½¤ë§ êµ¬ë¶)"><input style={inp} value={f.materialLots} onChange={set('materialLots')} placeholder="ì) LOT-2406-012, LOT-2405-008" list="wo-mat-lot-list"/></FL>
        </div>
        <datalist id="wo-mat-lot-list">{matLotOpts.map(l=><option key={l} value={l}/>)}</datalist>
      </div>
      <div className="flex gap-2 pt-2"><SBtn onClick={()=>f.product&&onSave(f)}>{initial.product?'ìì  ì ì¥':'WO ë°í'}</SBtn><SBtn onClick={onCancel} secondary>ì·¨ì</SBtn></div>
    </div>
  )
}

/* âââ ê³µì  ê¸°ë¡ (WOë³ ê³µì  íë¦ ì¹´ë) âââ */
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
  const resultOpts=['í©ê²©','ì¡°ê±´ë¶í©ê²©','ë¶í©ê²©','í´ë¹ìì']
  const openStep = (pcpStep) => {
    const rec = latestOrNullFor(w.id, pcpStep?.stepName, proc)
    setStepModal({pcpStep, record: rec})
  }
  const saveStep = (f) => {
    if (f.editId) { setProc(p=>p.map(x=>x.id===f.editId?{...x,...f}:x)) }
    else { setProc(p=>[...p,{id:nid('PR'),date:new Date().toISOString().slice(0,10),...f}]) }
    setStepModal(null)
  }
  const delRec = id=>{if(window.confirm('ì­ì íìê² ìµëê¹?'))setProc(p=>p.filter(x=>x.id!==id))}
  return(
    <Card>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[12px] font-bold" style={{color:'var(--moss)'}}>{w.id}</span>
          <Badge text={w.product} tone="blue"/>
          <Badge text={`${w.qty}EA`} tone="gray"/>
          <Badge text={w.status} tone={statusTone(w.status)}/>
        </div>
        <span className="text-[11px]" style={{color:'var(--ink-faint)'}}>{pcp?`ì°ë PCP: ${pcp.pcpNo||pcp.productName}`:(derived.length>0?'ê³µì  ì ì ìì â ê¸°ë¡ ê¸°ë° ìì íë¦':'ê³µì  ì ì ìì')}</span>
      </div>
      {steps.length===0?(
        <div className="text-[12px] py-3 text-center" style={{color:'var(--ink-mute)'}}>ë±ë¡ë ê³µì  íë¦ì´ ììµëë¤. ìë ë²í¼ì¼ë¡ ì²« ê³µì  ê¸°ë¡ì ì¶ê°íì¸ì.</div>
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
        {steps.length===0 && <ActBtn label="+ ì²« ê³µì  ê¸°ë¡ ì¶ê°" onClick={()=>setStepModal({pcpStep:null, record:null})}/>}
        <ActBtn label={histOpen?'ì´ë ¥ ì¨ê¸°ê¸°':`ì´ë ¥ ë³´ê¸° (${records.length}ê±´)`} onClick={()=>setHistOpen(v=>!v)}/>
      </div>
      {histOpen&&(
        <div className="overflow-x-auto mt-3">
          <table className="w-full">
            <thead><tr>{['ê¸°ë¡ID','ì¼ì','ê³µì ë¨ê³','ì¤ë¹','ììì','ì¤ì¸¡/íë¼ë¯¸í°','ê²°ê³¼','ë¹ê³ ','ì²¨ë¶','ìì'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>{records.length===0?<EmptyRow/>:records.map(p=>(
      <tr key={p.id}>
                <TD mono color="var(--moss)">{p.id}</TD>
                <TD mono muted>{p.date}</TD>
                <TD><span className="font-medium">{p.step}</span></TD>
                <TD muted>{p.machine}</TD>
                <TD>{p.operator}</TD>
                <TD muted>{p.measured||p.param}</TD>
                <TD><Badge text={p.result} tone={statusTone(p.result)}/></TD>
                <TD muted>{p.note||'â'}</TD>
                <TD>{p.fileId?<AttachLink fileId={p.fileId} fileName={p.fileName}/>:<span style={{color:'var(--ink-faint)'}}>â</span>}</TD>
                <TD><div className="flex gap-1"><ActBtn label="ìì " onClick={()=>setStepModal({pcpStep:pcpSteps.find(s=>s.stepName===p.step)||null, record:p})}/><ActBtn label="ì­ì " color="red" onClick={()=>delRec(p.id)}/></div></TD>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {stepModal&&<Modal title={stepModal.record?'ê³µì  ê¸°ë¡ ìì ':(stepModal.pcpStep?`ê³µì  ìë ¥ â ${stepModal.pcpStep.stepName}`:'ê³µì  ê¸°ë¡ ì¶ê°')} onClose={()=>setStepModal(null)}>
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
    result:'í©ê²©',
    note:'',
    ncrDesc:'',
    fileId:null,fileName:'',
    ...record,
    editId:record?record.id:undefined,
  })
  const set=k=>e=>sf(p=>({...p,[k]:e.target.value}))
  const canSave = f.step && f.operator
  const isNc = f.result==='ë¶í©ê²©'||f.result==='ì¡°ê±´ë¶í©ê²©'
  // ê³µì ê¸°ë¡ìì ë¶í©ê²©/ì¡°ê±´ë¶í©ê²©ì¼ë¡ íì ëë©´ ë¶ì í©(NCR)ì´ ìë ë°íëë¤(íì§ ë¶ì í©ê´ë¦¬ì ëì¼ ì ì¥ì). (#137)
  const submit = () => {
    if (!canSave) return
    let next = { ...f }
    if (isNc && !next.ncrId) {
      const raised = ncrLib.raise({
        title: `ê³µì ê¸°ë¡ ë¶ì í© â ${f.step} (WO ${woId})`,
        description: f.ncrDesc || f.note || '(ìì¸ ë´ì© ë¯¸ìë ¥)',
        severity: f.result==='ë¶í©ê²©' ? NCR_SEVERITY.MAJOR : NCR_SEVERITY.MINOR,
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
          <div><b style={{color:'var(--ink)'}}>ê³µì ë¨ê³:</b> {pcpStep.stepName} {pcpStep.processType&&`(${pcpStep.processType})`}</div>
          <div><b style={{color:'var(--ink)'}}>ì¤ë¹:</b> {pcpStep.equipment||'â'}</div>
          <div><b style={{color:'var(--ink)'}}>ê´ë¦¬ íë¼ë¯¸í° ê¸°ì¤:</b> {pcpStep.controlParams||'â'}</div>
          <div><b style={{color:'var(--ink)'}}>ê´ë¦¬ ë°©ë²:</b> {pcpStep.controlMethod||'â'}</div>
          <div><b style={{color:'var(--ink)'}}>í©ê²© ê¸°ì¤:</b> {pcpStep.acceptanceCriteria||'â'}</div>
          {pcpStep.responsible&&<div><b style={{color:'var(--ink)'}}>ì±ìì:</b> {pcpStep.responsible}</div>}
        </div>
      ):(
        <div className="grid grid-cols-2 gap-3">
          <FL label="ê³µì  ë¨ê³ *"><input style={inp} value={f.step} onChange={set('step')} placeholder="ì) CNC ì ì­"/></FL>
          <FL label="ì¬ì© ì¤ë¹"><input style={inp} value={f.machine} onChange={set('machine')} placeholder="CNC-01, ì¸ì£¼ ë±"/></FL>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <FL label="ììì *"><input style={inp} value={f.operator} onChange={set('operator')}/></FL>
        <FL label="ê²°ê³¼"><select style={sel} value={f.result} onChange={set('result')}>{resultOpts.map(o=><option key={o}>{o}</option>)}</select></FL>
      </div>
      {isPcp?(
        <FL label="ì¤ì¸¡ê° / ì¤ì  ê¸°ë¡"><textarea style={{...inp,minHeight:'50px',resize:'vertical'}} value={f.measured} onChange={set('measured')} placeholder="ì¤ì  ì¸¡ì ê°Â·LOTë²í¸ ë±ì ìë ¥íì¸ì"/></FL>
      ):(
        <FL label="ê³µì  íë¼ë¯¸í°"><textarea style={{...inp,minHeight:'50px',resize:'vertical'}} value={f.param} onChange={set('param')} placeholder="ì¤ì ê°, ì¡°ê±´, LOTë²í¸ ë±"/></FL>
      )}
      <FL label="ë¹ê³ "><input style={inp} value={f.note} onChange={set('note')}/></FL>
      {isNc && (
        <FL label="ë¶ì í© ìì¸ ë´ì© (ë¶ì í©ê´ë¦¬(NCR)ì ìë ë±ë¡ë©ëë¤)">
          <textarea style={{...inp,minHeight:'60px',resize:'vertical'}} value={f.ncrDesc} onChange={set('ncrDesc')} placeholder="ë¬´ìì´ ì´ë»ê² ê¸°ì¤ì ë²ì´ë¬ëì§ ê¸°ìíì¸ì"/>
        </FL>
      )}
      <SingleAttach label="ì²¨ë¶ íì¼ (ë°°ì¹ê¸°ë¡Â·LOT ìë¥ ë±)" fileId={f.fileId} fileName={f.fileName} onAttach={(id,name)=>sf(p=>({...p,fileId:id,fileName:name}))} onRemove={()=>sf(p=>({...p,fileId:null,fileName:''}))}/>
      <div className="flex gap-2 pt-2"><SBtn onClick={submit}>{record?'ìì  ì ì¥':'ê¸°ë¡ ì ì¥'}</SBtn><SBtn onClick={onCancel} secondary>ì·¨ì</SBtn></div>
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
      <SectionTitle breadcrumb="ê³µì  ê¸°ë¡">ê³µì  ê¸°ë¡ (ë°°ì¹ ë ì½ë)</SectionTitle>
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

/* âââ ê³µì  ê²ì¬ âââ */
function InspectCertificate({insp,wo,onClose}){
  const w = wo.find(x=>x.id===insp.wo)
  const Row=({label,value})=><div className="grid grid-cols-3 gap-2 py-1.5" style={{borderBottom:'1px solid var(--line)'}}><span className="text-[11.5px]" style={{color:'var(--ink-faint)'}}>{label}</span><span className="col-span-2 text-[12.5px]" style={{color:'var(--ink)'}}>{value||'â'}</span></div>
  return(
    <div className="space-y-1">
      <div className="text-center mb-3">
        <div className="text-[15px] font-bold" style={{color:'var(--ink)'}}>ê³µì ê²ì¬ì±ì ì</div>
        <div className="text-[11px]" style={{color:'var(--ink-faint)'}}>In-Process Inspection Certificate Â· ISO 13485 Â§8.2.6</div>
      </div>
      <Row label="ê²ì¬ ID" value={insp.id}/>
      <Row label="ê²ì¬ì¼" value={insp.date}/>
      <Row label="ììì§ì(WO)" value={insp.wo}/>
      <Row label="ì íëª" value={w?.product}/>
      <Row label="ê²ì¬ ë¨ê³" value={insp.step}/>
      <Row label="ê²ì¬ì" value={insp.inspector}/>
      <Row label="ê²ì¬ ê·ê²©" value={insp.spec}/>
      <Row label="ì¤ì¸¡ê°" value={insp.measured}/>
      <Row label="ê²°ê³¼" value={<Badge text={insp.status} tone={statusTone(insp.status)}/>}/>
      <Row label="ì²¨ë¶" value={insp.fileId?<AttachLink fileId={insp.fileId} fileName={insp.fileName}/>:'â'}/>
      <div className="flex gap-2 pt-4">
        <SBtn onClick={()=>printInspectionCert(insp,w)}><span className="flex items-center gap-1.5"><Printer size={13}/> ì¸ì</span></SBtn>
        <SBtn onClick={onClose} secondary>ë«ê¸°</SBtn>
      </div>
    </div>
  )
}
/* ê³µì ê²ì¬(IPC)ë ë ì´ì ë³ëë¡ ë±ë¡Â·ìë ¥íì§ ìëë¤ â ê° ê³µì ê¸°ë¡(StepEntryForm)ì
   ììì/ê²°ê³¼/ì¤ì¸¡ê° ìë ¥ì´ ê³§ ê³µì ê²ì¬ ê²°ê³¼ì´ë¯ë¡, ì´ íë©´ì ê³µì ê¸°ë¡ìì íìë
   ì½ê¸° ì ì© ë·°ë¡ë§ ëìíë¤ (Â§8.2.6 ìêµ¬ì¬í­ ì¶©ì¡±ì ê³µì ê¸°ë¡ ìë ¥ ìì ì ì´ë¯¸ ìë£ë¨). */
function InspectView({proc,wo}){
  const[certRow,setCertRow]=useState(null)
  const inspect = useMemo(()=>proc.map(p=>({
    id:p.id, date:p.date, wo:p.wo, step:p.step, inspector:p.operator,
    spec:p.param, measured:p.measured||p.param, status:p.result,
    fileId:p.fileId, fileName:p.fileName, note:p.note,
  })).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))), [proc])
  return(
    <div>
      <SectionTitle breadcrumb="ê³µì  ê²ì¬ (IPC)">ê³µì  ê²ì¬</SectionTitle>
      <div className="mb-3 text-[11.5px] px-1" style={{color:'var(--ink-faint)'}}>â¹ ê³µì ê²ì¬ ê²°ê³¼ë ê³µì ê¸°ë¡ ìë ¥ ì í¨ê» ê¸°ë¡ë©ëë¤ â ì´ íë©´ì ê²°ê³¼ë¥¼ ëª¨ìë³´ë ì¡°í ì ì© íë©´ìëë¤. ìë ¥Â·ìì ì ê³µì ê¸°ë¡ìì í´ì£¼ì¸ì.</div>
      <Card>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{color:'var(--ink-faint)'}}>ê³µì ê²ì¬ ê²°ê³¼ (ISO 13485 Â§8.2.6) â {inspect.length}ê±´ Â· í í´ë¦­ ì ì±ì ì ë³´ê¸°</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['ê²ì¬ID','WO','ê²ì¬ë¨ê³','ê²ì¬ì¼','ê²ì¬ì','ê·ê²©/íë¼ë¯¸í°','ì¸¡ì ê°','ê²°ê³¼','ì²¨ë¶'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>{inspect.length===0?<EmptyRow/>:inspect.map(i=>(
      <tr key={i.id} onClick={()=>setCertRow(i)} className="cursor-pointer" style={{transition:'background 0.1s'}} onMouseEnter={e=>e.currentTarget.style.background='var(--bg-soft)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <TD mono color="var(--moss)">{i.id}</TD>
                <TD mono muted>{i.wo}</TD>
                <TD>{i.step}</TD>
                <TD mono muted>{i.date}</TD>
                <TD>{i.inspector}</TD>
                <TD muted>{i.spec}</TD>
                <TD mono muted>{i.measured}</TD>
                <TD><Badge text={i.status||'ë¯¸ìë ¥'} tone={statusTone(i.status||'')}/></TD>
                <TD>{i.fileId?<AttachLink fileId={i.fileId} fileName={i.fileName}/>:<span style={{color:'var(--ink-faint)'}}>â</span>}</TD>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
      {certRow&&<Modal title="ê³µì ê²ì¬ì±ì ì" onClose={()=>setCertRow(null)}><InspectCertificate insp={certRow} wo={wo} onClose={()=>setCertRow(null)}/></Modal>}
    </div>
  )
}

/* âââ ë¶ì í© ê´ë¦¬ (NCR) â ê³µì ê¸°ë¡ìì ë°íë ë¶ì í©(íì§ NCR ì ì¥ì)ì ëª¨ìë³´ë ì¡°í ì ì© íë©´ âââ */
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
      <SectionTitle breadcrumb="ë¶ì í© ê´ë¦¬ (NCR)">ë¶ì í© ê´ë¦¬ (NCR)</SectionTitle>
      <div className="mb-4 p-3 rounded-lg text-[12px]" style={{background:'var(--bg-soft)',color:'var(--ink-faint)'}}>
        â¹ ë¶ì í©ì ê³µì ê¸°ë¡ìì ê²°ê³¼ê° "ë¶í©ê²©/ì¡°ê±´ë¶í©ê²©"ì¼ë¡ ìë ¥ëë©´ ìëì¼ë¡ ì ìë©ëë¤. ì¡°ì¬Â·ì¡°ì¹Â·CAPA ì°ëÂ·ì¢ê²° ì²ë¦¬ë íì§Â·ê²ì¬ íë©´ìì ì§ííë©°, ì´ íë©´ì ì§í ìí©ì íì¸íë ì¡°í ì ì©ìëë¤.
      </div>
      {open.length>0&&<div className="mb-4 p-3 rounded-lg flex items-start gap-2" style={{background:'var(--rust-soft)',border:'1px solid var(--rust)'}}><AlertTriangle size={14} style={{color:'var(--rust)',marginTop:2}}/><span className="text-[12.5px]" style={{color:'var(--rust)'}}><b>ë¯¸ê²° ë¶ì í© {open.length}ê±´</b> â íì§ìì ì¡°ì¹ ì§í ì¤ (ISO 13485 Â§8.3)</span></div>}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{color:'var(--ink-faint)'}}>ë¶ì í© ëª©ë¡ â {list.length}ê±´</span>
          <button onClick={()=>setList(loadProcessNcrs())} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium" style={{background:'var(--bg-soft)',border:'1px solid var(--line)',color:'var(--ink-soft)'}}>ìë¡ê³ ì¹¨</button>
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
                    <span>ì í: {woProduct(n.source?.woId)}</span>
                    <span>ê³µì : {n.source?.stepName||'-'}</span>
                    <span>ë°ê²¬ì: {n.detectedBy}</span>
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

/* âââ ìì° ì¤ì  âââ */
const PERF_SORTERS = {
  id:      (a,b)=>String(a.id).localeCompare(String(b.id)),
  product: (a,b)=>String(a.product||'').localeCompare(String(b.product||'')),
  qty:     (a,b)=>(Number(a.qty)||0)-(Number(b.qty)||0),
  startDate:(a,b)=>String(a.startDate||'').localeCompare(String(b.startDate||'')),
  dueDate: (a,b)=>String(a.dueDate||'').localeCompare(String(b.dueDate||'')),
  progress:(a,b)=>(Number(a.progress)||0)-(Number(b.progress)||0),
  status:  (a,b)=>String(a.status||'').localeCompare(String(b.status||'')),
}
function PerfSortTH({label,sortKey,active,dir,onSort}){
  return(
    <th onClick={()=>onSort(sortKey)} className="text-left px-3 py-2 text-[11px] font-bold uppercase tracking-wide cursor-pointer select-none" style={{color:active?'var(--moss)':'var(--ink-faint)'}}>
      <span className="inline-flex items-center gap-1">{label}{active&&<ArrowUpDown size={10}/>}</span>
    </th>
  )
}
function PerfView({wo}){
  const done=wo.filter(w=>w.status==='ìë£')
  const inProg=wo.filter(w=>w.status==='ì§íì¤')
  const [sortKey,setSortKey]=useState('startDate')
  const [sortDir,setSortDir]=useState('desc')
  const onSort=k=>{ if(sortKey===k) setSortDir(d=>d==='asc'?'desc':'asc'); else { setSortKey(k); setSortDir('asc') } }
  const sorted=useMemo(()=>{
    const fn=PERF_SORTERS[sortKey]||PERF_SORTERS.startDate
    const list=[...wo].sort(fn)
    return sortDir==='desc'?list.reverse():list
  },[wo,sortKey,sortDir])

  // ìë³ ìì° íí© â ì°©ìì ê¸°ì¤ ì ì²´/ìë£ ê±´ì (#139)
  const monthly=useMemo(()=>{
    const map={}
    wo.forEach(w=>{
      const m=(w.startDate||'').slice(0,7)
      if(!m) return
      if(!map[m]) map[m]={month:m,total:0,done:0,qty:0}
      map[m].total+=1
      map[m].qty+=Number(w.qty)||0
      if(w.status==='ìë£') map[m].done+=1
    })
    return Object.values(map).sort((a,b)=>b.month.localeCompare(a.month)).slice(0,12)
  },[wo])
  const maxTotal=Math.max(1,...monthly.map(m=>m.total))

  return(
    <div>
      <SectionTitle breadcrumb="ìì° ì¤ì ">ìì° ì¤ì </SectionTitle>
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          {label:'ì§íì¤ WO',value:inProg.length+'ê±´',color:'var(--moss)'},
          {label:'ìë£ WO',value:done.length+'ê±´',color:'#1d4ed8'},
          {label:'ì ì²´ WO',value:wo.length+'ê±´',color:'var(--ink)'},
        ].map(s=><div key={s.label} className="rounded-xl p-4" style={{background:'var(--bg-card)',border:'1px solid var(--line)'}}><div className="text-[12px]" style={{color:'var(--ink-mute)'}}>{s.label}</div><div className="text-[24px] font-bold mt-0.5" style={{color:s.color}}>{s.value}</div></div>)}
      </div>

      <div className="mb-4"><Card>
        <div className="font-mono text-[10px] tracking-widest uppercase mb-3" style={{color:'var(--ink-faint)'}}>ìë³ ìì° íí© (ì°©ìì ê¸°ì¤)</div>
        {monthly.length===0?<div className="text-[12.5px] py-4 text-center" style={{color:'var(--ink-faint)'}}>WOë¥¼ ë°ííë©´ ìë³ íí©ì´ íìë©ëë¤.</div>:(
          <div className="space-y-2">
            {monthly.map(m=>(
              <div key={m.month} className="flex items-center gap-3">
                <span className="font-mono text-[12px] font-bold w-[64px]" style={{color:'var(--ink)'}}>{m.month}</span>
                <div className="flex-1 h-4 rounded-full overflow-hidden flex" style={{background:'var(--bg-soft)'}}>
                  <div style={{width:`${(m.done/maxTotal)*100}%`,background:'var(--moss)'}}/>
                  <div style={{width:`${((m.total-m.done)/maxTotal)*100}%`,background:'#93c5fd'}}/>
                </div>
                <span className="text-[11.5px] whitespace-nowrap" style={{color:'var(--ink-soft)'}}>{m.total}ê±´ (ìë£ {m.done} Â· ìë {m.qty}EA)</span>
              </div>
            ))}
          </div>
        )}
      </Card></div>

      <Card>
        <div className="font-mono text-[10px] tracking-widest uppercase mb-3" style={{color:'var(--ink-faint)'}}>WO íí© (í¤ë í´ë¦­ ì ì ë ¬)</div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              <PerfSortTH label="WOë²í¸" sortKey="id" active={sortKey==='id'} dir={sortDir} onSort={onSort}/>
              <PerfSortTH label="ì í" sortKey="product" active={sortKey==='product'} dir={sortDir} onSort={onSort}/>
              <PerfSortTH label="ìë" sortKey="qty" active={sortKey==='qty'} dir={sortDir} onSort={onSort}/>
              <PerfSortTH label="ììì¼" sortKey="startDate" active={sortKey==='startDate'} dir={sortDir} onSort={onSort}/>
              <PerfSortTH label="ìë£ììì¼" sortKey="dueDate" active={sortKey==='dueDate'} dir={sortDir} onSort={onSort}/>
              <TH>ë´ë¹</TH>
              <PerfSortTH label="ì§íë¥ " sortKey="progress" active={sortKey==='progress'} dir={sortDir} onSort={onSort}/>
              <PerfSortTH label="ìí" sortKey="status" active={sortKey==='status'} dir={sortDir} onSort={onSort}/>
            </tr></thead>
            <tbody>{sorted.length===0?<EmptyRow/>:sorted.map(w=>(
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

/* âââ ìì° í âââ */
function MfgHome({wo,proc,onNavigate}){
  const inProg=wo.filter(w=>w.status==='ì§íì¤').length
  const openNcr=useMemo(()=>loadProcessNcrs().filter(n=>n.status!=='closed'&&n.status!=='corrected').length,[proc])
  const attn=proc.filter(p=>p.result==='ì¡°ê±´ë¶í©ê²©'||p.result==='ë¶í©ê²©').length
  const passCount=proc.filter(p=>p.result==='í©ê²©').length
  const CARDS=[
    {id:'wo',icon:ClipboardList,label:'ììì§ì (WO)',desc:'WO ë°í Â· ì§íë¥  Â· ê³µì ë¨ê³ ê´ë¦¬',count:`${inProg}ê±´ ì§íì¤`,warn:false},
    {id:'proc',icon:FileText,label:'ê³µì  ê¸°ë¡',desc:'ë°°ì¹ ë ì½ë Â· ê³µì  íë¼ë¯¸í° ê¸°ë¡',count:`${proc.length}ê±´`},
    {id:'inspect',icon:Activity,label:'ê³µì  ê²ì¬ (IPC)',desc:'ê³µì ê²ì¬ ê·ê²© vs ì¸¡ì ê° (ê³µì ê¸°ë¡ ê¸°ë° ì¡°í)',count:`${attn}ê±´ ì£¼ì`,warn:attn>0},
    {id:'ncr',icon:AlertTriangle,label:'ë¶ì í© ê´ë¦¬ (NCR)',desc:'ë°ì ë¶ì í© Â· ì²ë¦¬ë°©ë² Â· CAPA ì°ë',count:`${openNcr}ê±´ ë¯¸ê²°`,warn:openNcr>0},
    {id:'perf',icon:Cog,label:'ìì° ì¤ì ',desc:'WO íí© Â· ì§íë¥  íµê³',count:`${wo.length}ê±´`},
  ]
  const summary=[
    {label:'ì§íì¤ WO',value:`${inProg}ê±´`,warn:false,sub:'íì¬ ìì° ì¤'},
    {label:'ë¯¸ê²° NCR',value:`${openNcr}ê±´`,warn:openNcr>0,sub:'ì¡°ì¹ íì'},
    {label:'ê³µì  ê¸°ë¡',value:`${proc.length}ê±´`,warn:false,sub:'ë°°ì¹ ë ì½ë'},
    {label:'ê³µì  ê²ì¬',value:`${proc.length}ê±´`,warn:false,sub:`í©ê²© ${passCount}ê±´`},
  ]
  return(
    <div>
      <HubBanner
          title="ìì° ê´ë¦¬"
          subtitle="ISO 13485 Â§7.5 Â· ììì§ì Â· ê³µì  ê´ë¦¬ Â· ìì° ì´ë ¥ Â· UDI"
          icon={Factory}
          color="#D97706"
          quickActions={[{label:'ììì§ì ë±ë¡',icon:Plus,onClick:()=>onNavigate('wo'),primary:true}]}
          workflow={['ê³í ìë¦½','ììì§ì ë°í','ìì¬ ì¶ê³ ','ê³µì  ìì','ê³µì ê²ì¬','ìì í ìê³ ']}
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

/* âââ ë©ì¸ âââ */
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

  /* ììì§ì ì§íë¥ ì ê°ë°ìì ì ìí ê³µì  ììÂ·ê³µì ê¸°ë¡ ìë ¥ íí©ì ë°ë¼ ìë ê³ì°íê³ ,
     100%ì ëë¬íë©´ ìíë¥¼ ìëì¼ë¡ 'ìë£'ë¡ ì ííë¤ (ìì íì¬ê³ /ìì£¼ìí ìë ì°ë í¬í¨). */
  useEffect(() => {
    const curPcps = loadPcps()
    let changed = false
    const statusChanges = []
    const next = wo.map(w => {
      if (w.status === 'ì·¨ì') return w
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
      const newStatus = w.status === 'ìë£' ? 'ìë£' : (pct === 100 ? 'ìë£' : pct === 0 ? 'ëê¸°' : 'ì§íì¤')
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

  const tabLabels={wo:'ììì§ì(WO)',proc:'ê³µì ê¸°ë¡',inspect:'ê³µì ê²ì¬',ncr:'ë¶ì í©(NCR)',perf:'ìì°ì¤ì '}
  const viewMap={
    home:<MfgHome wo={wo} proc={proc} onNavigate={setView}/>,
    wo:(<div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'60px 20px',textAlign:'center'}}>
    <div style={{fontSize:15,fontWeight:600,marginBottom:8,color:'var(--ink)'}}>작업지시·배치기록서 전용 페이지로 이전되었습니다</div>
    <div style={{fontSize:13,color:'var(--ink-faint)',marginBottom:20}}>더 완성된 전용 페이지에서 작업지시 생성, 배치기록 입력, 실적 관리를 할 수 있습니다.</div>
    <a href="/batch-records" style={{display:'inline-flex',alignItems:'center',gap:6,padding:'10px 24px',background:'var(--moss)',color:'#fff',borderRadius:8,textDecoration:'none',fontWeight:600,fontSize:14}}>작업지시·배치기록 바로가기 →</a>
  </div>),
    proc:<ProcRecView proc={proc} setProc={setProc} wo={wo} pcps={pcps} focusWo={focusWo}/>,
    inspect:<InspectView proc={proc} wo={wo}/>,
    ncr:<NcrView wo={wo} openId={editId}/>,
    perf:<PerfView wo={wo}/>,
  }
  return(
    <AppLayout user={user} title="ìì°" subtitle="ììì§ì Â· ê³µì ê¸°ë¡ Â· ê²ì¬ Â· ë¶ì í© ê´ë¦¬">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto">
        {view!=='home'&&<button onClick={()=>{setView('home');setFocusWo(null)}} className="flex items-center gap-1.5 mb-5 text-[13px]" style={{color:'var(--moss)'}}><ArrowLeft size={14}/> ìì° í</button>}
        {view!=='home'&&<div className="flex gap-1 flex-wrap mb-5">{Object.entries(tabLabels).map(([id,label])=><button key={id} onClick={()=>{setView(id);if(id!=='proc')setFocusWo(null)}} className="text-[12px] px-3 py-1.5 rounded-lg border transition" style={{background:view===id?'var(--moss)':'var(--bg-card)',color:view===id?'var(--bg)':'var(--ink-mute)',borderColor:view===id?'var(--moss)':'var(--line)'}}>{label}</button>)}</div>}
        {viewMap[view]||viewMap.home}
      </div>
    </AppLayout>
  )
}
