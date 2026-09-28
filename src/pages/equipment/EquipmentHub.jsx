import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Wrench,
  Calendar,
  AlertTriangle,
  ArrowLeft,
  Plus,
  X,
  Clock,
  Activity,
  Settings2,
  Paperclip,
  Lock,
  ChevronRight,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import { fileStore } from '../../lib/fileStore'
const _SB_DATA_TYPE_EQ = 'localStorage_sync'
function useLS(key,init){
  const companyId = auth.current()?.company?.id ?? null
  const[v,setV]=React.useState(()=>{try{const raw=localStorage.getItem(key); if(raw!=null)return JSON.parse(raw); return init}catch{return init}})
  const vRef=React.useRef(v)
  React.useEffect(()=>{vRef.current=v},[v])
  React.useEffect(()=>{
    if(!companyId)return
    supabase.from('company_data').select('payload').eq('company_id',companyId).eq('data_type',_SB_DATA_TYPE_EQ).eq('data_key',key).maybeSingle()
      .then(({data:row})=>{if(row?.payload!=null){localStorage.setItem(key,JSON.stringify(row.payload));setV(row.payload);vRef.current=row.payload}})
  },[key,companyId])
  const set=(u)=>{const n=typeof u==='function'?u(vRef.current):u;vRef.current=n;localStorage.setItem(key,JSON.stringify(n));setV(n);if(companyId){supabase.from('company_data').upsert({company_id:companyId,data_type:_SB_DATA_TYPE_EQ,data_key:key,payload:n},{onConflict:'company_id,data_type,data_key'}).catch(console.error)}}
  return[v,set]
}
const nid=(p)=>`${p}-${new Date().toISOString().slice(2,4)}${String(new Date().getMonth()+1).padStart(2,'0')}-${String(Date.now()).slice(-3)}`
function toISODate(d){
  if(!d||d==='â') return null
  const s=String(d).trim()
  let m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if(m) return s
  m=s.match(/^(\d{2})-(\d{2})-(\d{2})$/)
  if(m) return `20${m[1]}-${m[2]}-${m[3]}`
  const t=new Date(s).getTime()
  return isNaN(t)?null:s
}
const inp={width:'100%',padding:'7px 10px',borderRadius:'7px',border:'1px solid var(--line)',background:'var(--bg)',color:'var(--ink)',fontSize:'13px',outline:'none'}
const sel={...inp,appearance:'none'}
const Badge=({text,tone='gray'})=>{const c={red:{bg:'var(--rust-soft)',fg:'var(--rust)'},green:{bg:'var(--leaf-soft)',fg:'var(--moss)'},amber:{bg:'#fff7ed',fg:'#b45309'},blue:{bg:'#eff6ff',fg:'#1d4ed8'},gray:{bg:'var(--bg-soft)',fg:'var(--ink-mute)'}}[tone]??{bg:'var(--bg-soft)',fg:'var(--ink-mute)'};return <span className="font-mono text-[10px] tracking-wider px-1.5 py-0.5 rounded" style={{background:c.bg,color:c.fg,fontWeight:500}}>{text}</span>}
const TH=({children})=><th className="pb-2 text-left font-medium px-2 first:pl-0 whitespace-nowrap text-[11.5px]" style={{color:'var(--ink-faint)',borderBottom:'1px solid var(--line)'}}>{children}</th>
const TD=({children,mono,color,right,muted})=><td className={`py-2 px-2 first:pl-0 text-[12.5px]${mono?' font-mono text-[11px]':''}${right?' text-right tabular-nums':''}`} style={{color:color||(muted?'var(--ink-mute)':'var(--ink)'),borderBottom:'1px solid var(--line)'}}>{children}</td>
const ActBtn=({label,color,onClick})=><button onClick={onClick} className="text-[11px] px-2 py-0.5 rounded hover:opacity-80" style={{background:color==='red'?'var(--rust-soft)':color==='green'?'var(--leaf-soft)':'var(--bg-soft)',color:color==='red'?'var(--rust)':color==='green'?'var(--moss)':'var(--ink-mute)',fontWeight:500}}>{label}</button>
const SBtn=({children,onClick,secondary})=><button onClick={onClick} className="px-4 py-2 rounded-lg text-[13px] font-medium" style={{background:secondary?'var(--bg-soft)':'var(--moss)',color:secondary?'var(--ink-mute)':'var(--bg)'}}>{children}</button>
const FL=({label,children})=><div><div className="text-[11.5px] font-medium mb-1" style={{color:'var(--ink-mute)'}}>{label}</div>{children}</div>
const Card=({children})=><div className="rounded-xl p-4" style={{background:'var(--bg-card)',border:'1px solid var(--line)'}}>{children}</div>
const StatusSelect=({value,options,onChange})=><select value={value} onChange={e=>onChange(e.target.value)} style={{...sel,padding:'3px 6px',fontSize:'11px',width:'auto'}}>{options.map(o=><option key={o}>{o}</option>)}</select>
const SectionTitle=({children,breadcrumb})=><div className="mb-5">{breadcrumb&&<div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-1" style={{color:'var(--ink-faint)'}}>ì¤ë¹Â·êµì  / {breadcrumb}</div>}<h2 className="text-[22px]" style={{color:'var(--ink)',fontWeight:500}}>{children}</h2></div>
function EmptyRow({cols,msg}){return(<tr><td colSpan={cols||20} className="py-10 text-center text-sm" style={{color:"var(--ink-mute)"}}>{msg||"ë±ë¡ë í­ëª©ì´ ììµëë¤."}</td></tr>)}
function EmptyCard({msg}){return(<div className="py-10 text-center text-sm" style={{color:"var(--ink-mute)"}}>{msg||"ë±ë¡ë í­ëª©ì´ ììµëë¤."}</div>)}

function Modal({title,onClose,children,wide}){return <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.45)'}} onClick={e=>e.target===e.currentTarget&&onClose()}><div className={`rounded-2xl p-6 w-full ${wide?'max-w-2xl':'max-w-lg'} max-h-[92vh] overflow-y-auto`} style={{background:'var(--bg-card)',boxShadow:'0 24px 64px rgba(0,0,0,0.18)',border:'1px solid var(--line)'}}><div className="flex items-center justify-between mb-5"><h3 className="text-[17px] font-semibold" style={{color:'var(--ink)'}}>{title}</h3><button onClick={onClose} style={{color:'var(--ink-faint)'}}><X size={18}/></button></div>{children}</div></div>}

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
    <FL label={label||'ì²¨ë¶ íì¼ (ì±ì ìÂ·ë³´ê³ ì ë±)'}>
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

/* âââ ì´ê¸° ë°ì´í° âââ */
const INIT_INSTR=[
  {id:'EQP-M-001',name:'ë²ëì´ ìºë¦¬í¼ì¤ 150mm',model:'Mitutoyo 530-312',serial:'M-2019-0012',lastCalib:'2024-01-15',nextCalib:'2025-01-15',interval:'12ê°ì',status:'ì¬ì©ê°ë¥',location:'ê²ì¬ì¤ A'},
  {id:'EQP-M-002',name:'ë§ì´í¬ë¡ë¯¸í° 0-25mm',model:'Mitutoyo 103-137',serial:'M-2020-0034',lastCalib:'2024-06-01',nextCalib:'2024-12-01',interval:'6ê°ì',status:'ì¬ì©ê°ë¥',location:'ê²ì¬ì¤ A'},
  {id:'EQP-M-003',name:'íë©´ê±°ì¹ ê¸°ê³',model:'Mitutoyo SJ-210',serial:'SJ-2021-0005',lastCalib:'2023-12-10',nextCalib:'2024-06-10',interval:'6ê°ì',status:'êµì ìë°',location:'ê²ì¬ì¤ B'},
  {id:'EQP-M-004',name:'íì¤ê³ 500N',model:'Shimadzu LC-500',serial:'LC-2018-0007',lastCalib:'2024-03-22',nextCalib:'2025-03-22',interval:'12ê°ì',status:'ì¬ì©ê°ë¥',location:'ìíì¤'},
  {id:'EQP-M-005',name:'ì¨ìµëê³',model:'Testo 635-2',serial:'TE-2022-0018',lastCalib:'2024-02-05',nextCalib:'2024-08-05',interval:'6ê°ì',status:'ì¬ì©ê°ë¥',location:'ì°½ê³  A'},
  {id:'EQP-P-001',name:'CNC ì ë° #1',model:'DOOSAN PUMA 2100',serial:'CNC-2020-001',lastCalib:'â',nextCalib:'â',interval:'PM ê´ë¦¬',status:'ì¬ì©ê°ë¥',location:'1ê³µì '},
  {id:'EQP-P-002',name:'3ì¶ CMM',model:'Zeiss Contura G2',serial:'CMM-2021-001',lastCalib:'2024-01-10',nextCalib:'2024-07-01',interval:'6ê°ì',status:'êµì ìë°',location:'ê²ì¬ì¤ A'},
  {id:'EQP-P-003',name:'ì´ìí ì¸ì²ê¸°',model:'Power Sonic 410',serial:'UC-2019-003',lastCalib:'â',nextCalib:'â',interval:'PM ê´ë¦¬',status:'ì¬ì©ê°ë¥',location:'ì¸ì²ì¤'},
]
const INIT_HIST=[
  {id:'EH-2406-012',eqp:'EQP-P-001',name:'CNC ì ë° #1',date:'2024-06-15',type:'PM',desc:'ì£¼ê¸° ìë°©ë³´ì  â ì¤ì¼ êµí, íí° ì²­ì, ì² ì ê²',technician:'ì´ê¸°ì ',result:'ì ì',next:'2024-09-15'},
  {id:'EH-2406-011',eqp:'EQP-M-003',name:'íë©´ê±°ì¹ ê¸°ê³',date:'2024-06-10',type:'ìë¦¬',desc:'íì¹¨ êµì²´ â ë§ëª¨ë¡ ì¸í ì¸¡ì  ì¤ì°¨ ë°ì',technician:'ì ì¡°ì¬ A/S',result:'ì ìë³µêµ¬',next:'êµì  ìë¢° ìì '},
  {id:'EH-2405-008',eqp:'EQP-P-001',name:'CNC ì ë° #1',date:'2024-05-20',type:'PM',desc:'ìê° ì ê² â ì´ì ìì',technician:'ì´ê¸°ì ',result:'ì ì',next:'2024-06-20'},
  {id:'EH-2405-006',eqp:'EQP-M-002',name:'ë§ì´í¬ë¡ë¯¸í°',date:'2024-06-01',type:'êµì ',desc:'ì ê¸°êµì  (6ê°ì)',technician:'íêµ­êµì ì°êµ¬ì',result:'í©ê²© (ì±ì ì CAL-2406-002)',next:'2024-12-01'},
]

/* âââ IQÂ·OQÂ·PQ ì ê²©ì±íê° âââ */
const PQ_FREQ_OPTS=['ì 1í','ë¶ê¸° 1í','ë°ê¸° 1í','ì° 1í']
const defaultQual=()=>({
  iq:{done:false,date:'',evaluator:'',result:'',notes:'',fileId:null,fileName:''},
  oq:{done:false,date:'',evaluator:'',result:'',notes:'',fileId:null,fileName:''},
  pq:{frequency:'ë¶ê¸° 1í',records:[]},
})
function getQual(instr){ return instr.qual||defaultQual() }
function qualStage(instr){
  const q=getQual(instr)
  if(!q.iq.done||q.iq.result!=='ì í©') return 'iq'
  if(!q.oq.done||q.oq.result!=='ì í©') return 'oq'
  return 'pq'
}
function qualStageInfo(instr){
  const stage=qualStage(instr)
  if(stage==='iq') return {label:'IQ ëê¸°',tone:'amber'}
  if(stage==='oq') return {label:'OQ ëê¸°',tone:'blue'}
  return {label:'PQ ì§íì¤',tone:'green'}
}
function monthsOf(freq){ return {'ì 1í':1,'ë¶ê¸° 1í':3,'ë°ê¸° 1í':6,'ì° 1í':12}[freq]||3 }
function nextPQDate(pq){
  const last=[...(pq.records||[])].sort((a,b)=>new Date(b.date)-new Date(a.date))[0]
  if(!last||!last.date) return null
  const d=new Date(last.date)
  d.setMonth(d.getMonth()+monthsOf(pq.frequency))
  return d.toISOString().slice(0,10)
}

function QualEvalForm({title,current,onSave,onCancel}){
  const [f,sf]=useState(()=>({
    date: current?.date || new Date().toISOString().slice(0,10),
    evaluator: current?.evaluator || '',
    result: current?.result || 'ì í©',
    notes: current?.notes || '',
    fileId: current?.fileId || null,
    fileName: current?.fileName || '',
  }))
  const set=k=>e=>sf(p=>({...p,[k]:e.target.value}))
  return(
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FL label="íê°ì¼ *"><input style={inp} type="date" value={f.date} onChange={set('date')}/></FL>
        <FL label="íê°ì *"><input style={inp} value={f.evaluator} onChange={set('evaluator')}/></FL>
        <FL label="íì "><select style={sel} value={f.result} onChange={set('result')}>{['ì í©','ë¶ì í©'].map(o=><option key={o}>{o}</option>)}</select></FL>
      </div>
      <FL label="íê° ë´ì©Â·ë¹ê³ "><textarea style={{...inp,minHeight:'64px',resize:'vertical'}} value={f.notes} onChange={set('notes')} placeholder={`${title} ê´ë ¨ íì¸ ë´ì©ì ìë ¥íì¸ì`}/></FL>
      <SingleAttach fileId={f.fileId} fileName={f.fileName} label="ì²¨ë¶ íì¼ (íê° ë³´ê³ ì ë±)" onAttach={(id,name)=>sf(p=>({...p,fileId:id,fileName:name}))} onRemove={()=>sf(p=>({...p,fileId:null,fileName:''}))}/>
      <div className="flex gap-2 pt-2"><SBtn onClick={()=>f.evaluator&&onSave({...f,done:true})}>íê° ì ì¥</SBtn><SBtn onClick={onCancel} secondary>ì·¨ì</SBtn></div>
    </div>
  )
}

function QualEvalDone({data,onRedo}){
  return(
    <div className="space-y-2">
      <div className="flex items-center gap-2"><Badge text={data.result} tone={data.result==='ì í©'?'green':'red'}/><span className="text-[12px]" style={{color:'var(--ink-mute)'}}>{data.date} Â· íê°ì {data.evaluator}</span></div>
      {data.notes&&<div className="text-[12.5px] p-2 rounded" style={{background:'var(--bg-soft)',color:'var(--ink)'}}>{data.notes}</div>}
      {data.fileId&&<a href={fileStore.getObjectURL(data.fileId)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[12px]" style={{color:'var(--moss)'}}><Paperclip size={11}/> {data.fileName||'ì²¨ë¶íì¼'}</a>}
      <div className="pt-1"><ActBtn label="ì¬íê°" onClick={onRedo}/></div>
    </div>
  )
}

function PQPanel({instr,pq,onSetFrequency,onAddRecord}){
  const [adding,setAdding]=useState(false)
  const [f,sf]=useState({date:new Date().toISOString().slice(0,10),evaluator:'',result:'ì´ììì',notes:'',fileId:null,fileName:''})
  const set=k=>e=>sf(p=>({...p,[k]:e.target.value}))
  const due=nextPQDate(pq)
  const sortedRecords=[...(pq.records||[])].sort((a,b)=>new Date(b.date)-new Date(a.date))
  const submit=()=>{
    if(!f.evaluator)return
    onAddRecord({id:nid('PQ'),...f})
    sf({date:new Date().toISOString().slice(0,10),evaluator:'',result:'ì´ììì',notes:'',fileId:null,fileName:''})
    setAdding(false)
  }
  return(
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <FL label="ì ê² ì£¼ê¸°"><select style={sel} value={pq.frequency} onChange={e=>onSetFrequency(e.target.value)}>{PQ_FREQ_OPTS.map(o=><option key={o}>{o}</option>)}</select></FL>
        {due&&<div className="text-[12px]" style={{color:'var(--ink-mute)'}}>ë¤ì ì ê² ìì ì¼: <b style={{color:'var(--ink)'}}>{due}</b></div>}
      </div>
      {!adding?(
        <ActBtn label="+ ì ê² ê¸°ë¡ ì¶ê°" color="green" onClick={()=>setAdding(true)}/>
      ):(
        <div className="p-3 rounded-xl space-y-2" style={{background:'var(--bg-soft)'}}>
          <div className="grid grid-cols-2 gap-3">
            <FL label="ì ê²ì¼ *"><input style={inp} type="date" value={f.date} onChange={set('date')}/></FL>
            <FL label="ì ê²ì *"><input style={inp} value={f.evaluator} onChange={set('evaluator')}/></FL>
            <FL label="ê²°ê³¼"><select style={sel} value={f.result} onChange={set('result')}>{['ì´ììì','ì´ììì'].map(o=><option key={o}>{o}</option>)}</select></FL>
          </div>
          <FL label="ë¹ê³ "><textarea style={{...inp,minHeight:'56px',resize:'vertical'}} value={f.notes} onChange={set('notes')}/></FL>
          <SingleAttach fileId={f.fileId} fileName={f.fileName} onAttach={(id,name)=>sf(p=>({...p,fileId:id,fileName:name}))} onRemove={()=>sf(p=>({...p,fileId:null,fileName:''}))}/>
          <div className="flex gap-2 pt-1"><SBtn onClick={submit}>ì ì¥</SBtn><SBtn secondary onClick={()=>setAdding(false)}>ì·¨ì</SBtn></div>
        </div>
      )}
      <div className="space-y-1.5">
        {sortedRecords.length===0?<div className="text-[12px] text-center py-4" style={{color:'var(--ink-faint)'}}>ë±ë¡ë PQ ì ê² ê¸°ë¡ì´ ììµëë¤.</div>:sortedRecords.map(r=>(
          <div key={r.id} className="p-2.5 rounded-lg" style={{background:'var(--bg-soft)'}}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[12px] font-mono" style={{color:'var(--ink-faint)'}}>{r.date}</span>
              <Badge text={r.result} tone={r.result==='ì´ììì'?'green':'red'}/>
              <span className="text-[11.5px]" style={{color:'var(--ink-mute)'}}>ì ê²ì {r.evaluator}</span>
            </div>
            {r.notes&&<div className="text-[12px] mt-1" style={{color:'var(--ink)'}}>{r.notes}</div>}
            {r.fileId&&<a href={fileStore.getObjectURL(r.fileId)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11.5px] mt-1" style={{color:'var(--moss)'}}><Paperclip size={10}/> {r.fileName||'ì²¨ë¶íì¼'}</a>}
          </div>
        ))}
      </div>
    </div>
  )
}

function DeviceDetail({instrument,setInstruments,onClose,initialTab}){
  const q=getQual(instrument)
  const stage=qualStage(instrument)
  const [tab,setTab]=useState(initialTab||stage)
  const patchQual=(patch)=>{
    setInstruments(p=>p.map(x=>x.id===instrument.id?{...x,qual:{...getQual(x),...patch}}:x))
  }
  const oqUnlocked=q.iq.done&&q.iq.result==='ì í©'
  const pqUnlocked=oqUnlocked&&q.oq.done&&q.oq.result==='ì í©'
  const tabs=[
    {id:'iq',label:'IQ ì¤ì¹ì ê²©ì±íê°',locked:false},
    {id:'oq',label:'OQ ìì´ì ì ê²©ì±íê°',locked:!oqUnlocked},
    {id:'pq',label:'PQ ì±ë¥ì ê²©ì±íê°',locked:!pqUnlocked},
  ]
  return(
    <Modal title={`ì ê²©ì±íê° â ${instrument.name} (${instrument.id})`} onClose={onClose} wide>
      <div className="flex gap-1 mb-4 flex-wrap">
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>!t.locked&&setTab(t.id)} disabled={t.locked}
            className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border transition"
            style={{background:tab===t.id?'var(--moss)':'var(--bg-card)',color:tab===t.id?'var(--bg)':t.locked?'var(--ink-faint)':'var(--ink-mute)',borderColor:tab===t.id?'var(--moss)':'var(--line)',cursor:t.locked?'not-allowed':'pointer'}}>
            {t.locked&&<Lock size={11}/>}{t.label}
          </button>
        ))}
      </div>
      {tab==='iq'&&(
        q.iq.done
          ? <QualEvalDone data={q.iq} onRedo={()=>patchQual({iq:{...q.iq,done:false}})}/>
          : <QualEvalForm title="ì¤ì¹ì ê²©ì±íê°(IQ)" current={q.iq} onSave={(data)=>patchQual({iq:data})} onCancel={onClose}/>
      )}
      {tab==='oq'&&(
        !oqUnlocked
          ? <div className="text-[12.5px] p-3 rounded-lg flex items-center gap-2" style={{background:'var(--bg-soft)',color:'var(--ink-mute)'}}><Lock size={13}/> IQ(ì¤ì¹ì ê²©ì±íê°)ê° ì í© íì ì¼ë¡ ìë£ëì´ì¼ OQë¥¼ ì§íí  ì ììµëë¤.</div>
          : q.oq.done
            ? <QualEvalDone data={q.oq} onRedo={()=>patchQual({oq:{...q.oq,done:false}})}/>
            : <QualEvalForm title="ìì´ì ì ê²©ì±íê°(OQ)" current={q.oq} onSave={(data)=>patchQual({oq:data})} onCancel={onClose}/>
      )}
      {tab==='pq'&&(
        !pqUnlocked
          ? <div className="text-[12.5px] p-3 rounded-lg flex items-center gap-2" style={{background:'var(--bg-soft)',color:'var(--ink-mute)'}}><Lock size={13}/> OQ(ìì´ì ì ê²©ì±íê°)ê° ì í© íì ì¼ë¡ ìë£ëì´ì¼ PQë¥¼ ì§íí  ì ììµëë¤.</div>
          : <PQPanel instr={instrument} pq={q.pq} onSetFrequency={(freq)=>patchQual({pq:{...q.pq,frequency:freq}})} onAddRecord={(rec)=>patchQual({pq:{...q.pq,records:[...(q.pq.records||[]),rec]}})}/>
      )}
    </Modal>
  )
}

/* âââ ì¤ë¹íí©ëª©ë¡ âââ */

function InstrumentsView({instruments,setInstruments,openId}){
  const[modal,setModal]=useState(null);const[edit,setEdit]=useState(null)
  const[detail,setDetail]=useState(null); const[detailTab,setDetailTab]=useState(null)
  const [srch, setSrch] = useState('')
  useEffect(() => {
    if (openId) { const item = instruments.find(x => x.id === openId); if (item) { setEdit(item); setModal('form') } }
  }, [openId])
  const shown = srch ? instruments.filter(i=>[i.name,i.model,i.serial,i.location,i.application,i.kind].some(v=>v&&v.toLowerCase().includes(srch.toLowerCase()))) : instruments
  const statusOpts=['ì¬ì©ê°ë¥','êµì ìë°','êµì ì¤','ì¬ì©ì í','íê¸°']
  const del=id=>{if(window.confirm('ì­ì íìê² ìµëê¹?'))setInstruments(p=>p.filter(x=>x.id!==id))}
  const save=f=>{
    if(edit){
      setInstruments(p=>p.map(x=>x.id===edit.id?{...x,...f}:x))
      setEdit(null); setModal(null)
    }else{
      const newId=nid('EQP')
      setInstruments(p=>[...p,{id:newId,...f}])
      setModal(null)
      setDetail(newId); setDetailTab('iq')
    }
  }
  const openDetail=(instr)=>{ setDetail(instr.id); setDetailTab(null) }
  const detailInstr = detail ? instruments.find(x=>x.id===detail) : null
  const urgent=instruments.filter(i=>i.status==='êµì ìë°'||i.status==='êµì ì¤')
  return(
    <div>
      <SectionTitle breadcrumb="ì¤ë¹íí©ëª©ë¡">ì¤ë¹íí©ëª©ë¡</SectionTitle>
      {urgent.length>0&&<div className="mb-4 p-3 rounded-lg flex items-start gap-2" style={{background:'var(--rust-soft)',border:'1px solid var(--rust)'}}><AlertTriangle size={14} style={{color:'var(--rust)',marginTop:2}}/><span className="text-[12.5px]" style={{color:'var(--rust)'}}><b>ì ê² íì {urgent.length}ê±´</b> â {urgent.map(i=>i.name).join(', ')} (ISO 13485 Â§7.6)</span></div>}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{color:'var(--ink-faint)'}}>ì¤ë¹íí©ëª©ë¡ (ISO 13485 Â§7.6) â {instruments.length}ê°</span>
          <button onClick={()=>{setEdit(null);setModal('form')}} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium" style={{background:'var(--moss)',color:'var(--bg)'}}><Plus size={13}/> ê¸°ê¸° ë±ë¡</button>
        </div>
      <div className="flex items-center gap-2 mb-3">
        <input className="flex-1 text-xs rounded-lg px-3 py-1.5 outline-none"
          style={{background:"var(--bg-soft)",border:"1px solid var(--line)",color:"var(--ink)"}}
          placeholder="ê¸°ê¸°ëª Â· ëª¨ë¸ Â· S/N Â· ìì¹ ê²ì..."
          value={srch} onChange={e=>setSrch(e.target.value)}/>
        {srch&&<button onClick={()=>setSrch("")} className="text-xs px-2 rounded" style={{color:"var(--ink-mute)"}}>â</button>}
      </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['ê¸°ê¸°ID','ê¸°ê¸°ëª','êµ¬ë¶','ëª¨ë¸','S/N','ìµê·¼ì ê²','ì°¨ê¸°ì ê²','ì£¼ê¸°','ìì¹','ìí','ì ê²©ì±íê°','ìì'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>{shown.length===0?<EmptyRow msg={srch?"ê²ì ê²°ê³¼ê° ììµëë¤.":undefined}/>:shown.map(i=>{
              const qi=qualStageInfo(i)
              return(
      <tr key={i.id}>
                <TD mono color="var(--moss)">{i.id}</TD>
                <TD>
                  <button onClick={()=>openDetail(i)} className="font-medium hover:underline" style={{color:'var(--ink)'}}>{i.name}</button>
                  {i.application && <div className="text-[11px] mt-0.5" style={{color:'var(--ink-faint)'}}>{i.application}</div>}
                </TD>
                <TD><Badge text={i.kind||'ì ì¡°ì¤ë¹'} tone={i.kind==='ì¸¡ì ì¥ë¹'?'blue':'gray'}/></TD>
                <TD muted>{i.model}</TD>
                <TD mono muted>{i.serial}</TD>
                <TD mono muted>{i.lastCalib}</TD>
                <TD mono color={i.status==='êµì ìë°'?'var(--rust)':undefined}>{i.nextCalib}</TD>
                <TD muted>{i.interval}</TD>
                <TD muted>{i.location}</TD>
                <TD><StatusSelect value={i.status} options={statusOpts} onChange={v=>setInstruments(p=>p.map(x=>x.id===i.id?{...x,status:v}:x))}/></TD>
                <TD><button onClick={()=>openDetail(i)} className="inline-flex items-center gap-1"><Badge text={qi.label} tone={qi.tone}/><ChevronRight size={11} style={{color:'var(--ink-faint)'}}/></button></TD>
                <TD><div className="flex gap-1"><ActBtn label="ìì " onClick={()=>{setEdit(i);setModal('form')}}/><ActBtn label="ì­ì " color="red" onClick={()=>del(i.id)}/></div></TD>
              </tr>
            )})}</tbody>
          </table>
        </div>
      </Card>
      {modal==='form'&&<Modal title={edit?'ê¸°ê¸° ìì ':'ê¸°ê¸° ë±ë¡'} onClose={()=>{setModal(null);setEdit(null)}}><InstrForm initial={edit||{}} onSave={save} onCancel={()=>{setModal(null);setEdit(null)}} statusOpts={statusOpts}/></Modal>}
      {detailInstr&&<DeviceDetail instrument={detailInstr} setInstruments={setInstruments} onClose={()=>{setDetail(null);setDetailTab(null)}} initialTab={detailTab}/>}
    </div>
  )
}
function InstrForm({initial,onSave,onCancel,statusOpts}){
  const[f,sf]=useState({name:'',kind:'ì ì¡°ì¤ë¹',application:'',model:'',serial:'',lastCalib:'',nextCalib:'',interval:'12ê°ì',location:'',status:'ì¬ì©ê°ë¥',...initial})
  const set=k=>e=>sf(p=>({...p,[k]:e.target.value}))
  return(
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FL label="ê¸°ê¸°ëª *"><input style={inp} value={f.name} onChange={set('name')} placeholder="ì) ë²ëì´ ìºë¦¬í¼ì¤"/></FL>
        <FL label="êµ¬ë¶"><select style={sel} value={f.kind} onChange={set('kind')}>{['ì ì¡°ì¤ë¹','ì¸¡ì ì¥ë¹'].map(o=><option key={o}>{o}</option>)}</select></FL>
        <FL label="ì ì©íë (ì©ë/ì ì©ê³µì )"><input style={inp} value={f.application} onChange={set('application')} placeholder="ì) ìì í ì¡°ë¦½, ìµì¢ê²ì¬ ì¹ìì¸¡ì "/></FL>
        <FL label="ëª¨ë¸ëª"><input style={inp} value={f.model} onChange={set('model')}/></FL>
        <FL label="ìë¦¬ì¼ ë²í¸"><input style={inp} value={f.serial} onChange={set('serial')}/></FL>
        <FL label="ìµê·¼ ì ê²ì¼"><input style={inp} type="date" value={f.lastCalib} onChange={set('lastCalib')}/></FL>
        <FL label="ì°¨ê¸° ì ê²ì¼"><input style={inp} type="date" value={f.nextCalib} onChange={set('nextCalib')}/></FL>
        <FL label="ì ê² ì£¼ê¸°"><select style={sel} value={f.interval} onChange={set('interval')}>{['3ê°ì','6ê°ì','12ê°ì','PM ê´ë¦¬','í´ë¹ìì'].map(o=><option key={o}>{o}</option>)}</select></FL>
        <FL label="ë³´ê´ ìì¹"><input style={inp} value={f.location} onChange={set('location')}/></FL>
        <FL label="ìí"><select style={sel} value={f.status} onChange={set('status')}>{statusOpts.map(o=><option key={o}>{o}</option>)}</select></FL>
      </div>
      <div className="text-[11.5px]" style={{color:'var(--ink-faint)'}}>* ì ê· ë±ë¡ ì ê¸°ê¸°ëªÂ·ëª¨ë¸ëªÂ·ìë¦¬ì¼ë²í¸ë§ ìë ¥í´ë ë±ë¡í  ì ìì¼ë©°, ë±ë¡ ì¦ì IQ(ì¤ì¹ì ê²©ì±íê°) íë©´ì¼ë¡ ì´ëí©ëë¤. êµ¬ë¶Â·ì ì©íëì GMP ì ì²­ì ì²¨ë¶(2-ë¤-1-2 ìì¤Â·ì¥ë¹ëª©ë¡)ì íìí í­ëª©ìëë¤.</div>
      <div className="flex gap-2 pt-2"><SBtn onClick={()=>f.name&&onSave(f)}>{initial.name?'ìì  ì ì¥':'ë±ë¡'}</SBtn><SBtn onClick={onCancel} secondary>ì·¨ì</SBtn></div>
    </div>
  )
}

/* âââ ì´ë ¥ ê´ë¦¬ âââ */
function HistoryView({history,setHistory,instruments}){
  const[modal,setModal]=useState(null);const[edit,setEdit]=useState(null)
  const typeOpts=['PM','êµì ','ìë¦¬','ì ê²','ê¸°í']
  const resultOpts=['ì ì','ì ìë³µêµ¬','í©ê²©','ì¡°ê±´ë¶','ë¶í©ê²©']
  const del=id=>{if(window.confirm('ì­ì íìê² ìµëê¹?'))setHistory(p=>p.filter(x=>x.id!==id))}
  const save=f=>{
    if(edit){setHistory(p=>p.map(x=>x.id===edit.id?{...x,...f}:x));setEdit(null)}
    else{setHistory(p=>[...p,{id:nid('EH'),date:new Date().toISOString().slice(0,10),...f}])}
    setModal(null)
  }
  return(
    <div>
      <SectionTitle breadcrumb="ì´ë ¥ ê´ë¦¬">ì´ë ¥ ê´ë¦¬ (PM Â· êµì  Â· ìë¦¬)</SectionTitle>
      <Card>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{color:'var(--ink-faint)'}}>ì¤ë¹Â·ê¸°ê¸° ì´ë ¥ â {history.length}ê±´</span>
          <button onClick={()=>{setEdit(null);setModal('form')}} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium" style={{background:'var(--moss)',color:'var(--bg)'}}><Plus size={13}/> ì´ë ¥ ì¶ê°</button>
        </div>
        <div className="space-y-2">
          {history.length===0?<EmptyCard/>:history.map(h=>(
      <div key={h.id} className="p-3 rounded-xl flex items-start gap-3" style={{border:'1px solid var(--line)',background:'var(--bg)'}}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-mono text-[11px] font-bold" style={{color:'var(--moss)'}}>{h.id}</span>
                  <span className="text-[11px]" style={{color:'var(--ink-faint)'}}>{h.date}</span>
                  <Badge text={h.type} tone={h.type==='êµì '?'blue':h.type==='ìë¦¬'?'amber':'green'}/>
                  <Badge text={h.name} tone="gray"/>
                </div>
                <div className="text-[12.5px]" style={{color:'var(--ink)'}}>{h.desc}</div>
                <div className="mt-1 flex gap-3 text-[11.5px]" style={{color:'var(--ink-mute)'}}>
                  <span>ë´ë¹: {h.technician}</span>
                  <span>ê²°ê³¼: <span style={{color:'var(--moss)',fontWeight:600}}>{h.result}</span></span>
                  {h.next&&<span>ì°¨ê¸°: {h.next}</span>}
                  {h.fileId&&(
                    <a href={fileStore.getObjectURL(h.fileId)} target="_blank" rel="noreferrer" className="flex items-center gap-1" style={{color:'var(--moss)'}}>
                      <Paperclip size={11}/> {h.fileName||'ì²¨ë¶íì¼'}
                    </a>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <ActBtn label="ìì " onClick={()=>{setEdit(h);setModal('form')}}/>
                <ActBtn label="ì­ì " color="red" onClick={()=>del(h.id)}/>
              </div>
            </div>
          ))}
        </div>
      </Card>
      {modal==='form'&&<Modal title={edit?'ì´ë ¥ ìì ':'ì´ë ¥ ì¶ê°'} onClose={()=>{setModal(null);setEdit(null)}}><HistForm initial={edit||{}} instruments={instruments} onSave={save} onCancel={()=>{setModal(null);setEdit(null)}} typeOpts={typeOpts} resultOpts={resultOpts}/></Modal>}
    </div>
  )
}
function HistForm({initial,instruments,onSave,onCancel,typeOpts,resultOpts}){
  const[f,sf]=useState({eqp:'',name:'',type:'PM',desc:'',technician:'',result:'ì ì',next:'',...initial})
  const set=k=>e=>sf(p=>({...p,[k]:e.target.value}))
  const selEqp=e=>{const i=instruments.find(x=>x.id===e.target.value);if(i)sf(p=>({...p,eqp:i.id,name:i.name}));else set('eqp')(e)}
  return(
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FL label="ê¸°ê¸°/ì¤ë¹ *"><select style={sel} value={f.eqp} onChange={selEqp}><option value="">ì í</option>{instruments.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></FL>
        <FL label="ì´ë ¥ ì í"><select style={sel} value={f.type} onChange={set('type')}>{typeOpts.map(o=><option key={o}>{o}</option>)}</select></FL>
        <FL label="ë´ë¹ì *"><input style={inp} value={f.technician} onChange={set('technician')}/></FL>
        <FL label="ê²°ê³¼"><select style={sel} value={f.result} onChange={set('result')}>{resultOpts.map(o=><option key={o}>{o}</option>)}</select></FL>
        <FL label="ì°¨ê¸° ìì ì¼"><input style={inp} type="date" value={f.next} onChange={set('next')}/></FL>
      </div>
      <FL label="ìì ë´ì© *"><textarea style={{...inp,minHeight:'72px',resize:'vertical'}} value={f.desc} onChange={set('desc')} placeholder="ìíí ìì ë´ì©ì ìë ¥íì¸ì"/></FL>
      <SingleAttach fileId={f.fileId} fileName={f.fileName} onAttach={(id,name)=>sf(p=>({...p,fileId:id,fileName:name}))} onRemove={()=>sf(p=>({...p,fileId:null,fileName:''}))}/>
      <div className="flex gap-2 pt-2"><SBtn onClick={()=>f.eqp&&f.desc&&f.technician&&onSave(f)}>{initial.eqp?'ìì  ì ì¥':'ì¶ê°'}</SBtn><SBtn onClick={onCancel} secondary>ì·¨ì</SBtn></div>
    </div>
  )
}

/* âââ ì ê² ì¼ì  âââ */
function CalibCompleteForm({instr,onSave,onCancel}){
  const today=new Date().toISOString().slice(0,10)
  const suggestNext=()=>{
    const m=parseInt(instr.interval)||12
    const d=new Date(); d.setMonth(d.getMonth()+m)
    return d.toISOString().slice(0,10)
  }
  const [f,sf]=useState({technician:'',next:instr.interval&&instr.interval!=='PM ê´ë¦¬'&&instr.interval!=='í´ë¹ìì'?suggestNext():'',fileId:null,fileName:''})
  const set=k=>e=>sf(p=>({...p,[k]:e.target.value}))
  return(
    <div className="space-y-3">
      <div className="text-[12.5px] p-2 rounded" style={{background:'var(--bg-soft)',color:'var(--ink-mute)'}}>{instr.name} ({instr.id}) â ì ê² ìë£ ì²ë¦¬ ì ì¤ë({today}) ë ì§ë¡ ìµê·¼ì ê²ì¼ì´ ê°±ì ëê³ , ì´ë ¥ ê´ë¦¬ìë ìëì¼ë¡ ê¸°ë¡ë©ëë¤.</div>
      <div className="grid grid-cols-2 gap-3">
        <FL label="ì ê² ìíì *"><input style={inp} value={f.technician} onChange={set('technician')} placeholder="ì) íê¸¸ë"/></FL>
        <FL label="ì°¨ê¸° ì ê²ì¼ *"><input style={inp} type="date" value={f.next} onChange={set('next')}/></FL>
      </div>
      <SingleAttach fileId={f.fileId} fileName={f.fileName} onAttach={(id,name)=>sf(p=>({...p,fileId:id,fileName:name}))} onRemove={()=>sf(p=>({...p,fileId:null,fileName:''}))}/>
      <div className="flex gap-2 pt-2"><SBtn onClick={()=>f.technician&&f.next&&onSave(f)}>ì ê²ìë£ ì²ë¦¬</SBtn><SBtn onClick={onCancel} secondary>ì·¨ì</SBtn></div>
    </div>
  )
}
function ScheduleView({instruments,setInstruments,history,setHistory}){
  const [calibModal,setCalibModal]=useState(null)
  const calibItems=instruments.filter(i=>i.interval!=='PM ê´ë¦¬'&&i.interval!=='í´ë¹ìì')
  const parseDate=(d)=>{ const iso=toISODate(d); if(!iso) return null; const t=new Date(iso).getTime(); return isNaN(t)?null:t }
  const sorted=[...calibItems].sort((a,b)=>{
    const ta=parseDate(a.nextCalib), tb=parseDate(b.nextCalib)
    if(ta===null&&tb===null) return 0
    if(ta===null) return 1
    if(tb===null) return -1
    return ta-tb
  })
  const today=new Date().toISOString().slice(0,10)
  const getDday=(d)=>{const iso=toISODate(d);if(!iso)return'â';const diff=Math.ceil((new Date(iso)-new Date(today))/(1000*60*60*24));if(diff<0)return`D+${Math.abs(diff)} ì´ê³¼`;if(diff===0)return'ì¤ë';return`D-${diff}`}
  const getTone=(d)=>{const iso=toISODate(d);if(!iso)return'gray';const diff=Math.ceil((new Date(iso)-new Date(today))/(1000*60*60*24));if(diff<0)return'red';if(diff<=30)return'amber';return'green'}
  const urgent=sorted.filter(i=>{const t=parseDate(i.nextCalib);return t!==null&&t<new Date(today).getTime()})
  const soon=sorted.filter(i=>{const t=parseDate(i.nextCalib);if(t===null)return false;const diff=(t-new Date(today).getTime())/(1000*60*60*24);return diff>=0&&diff<=30})
  const completeCalib=(f)=>{
    const instr=calibModal
    setInstruments(p=>p.map(x=>x.id===instr.id?{...x,lastCalib:today,nextCalib:f.next,status:'ì¬ì©ê°ë¥'}:x))
    if(setHistory){
      setHistory(p=>[...p,{id:nid('EH'),date:today,eqp:instr.id,name:instr.name,type:'ì ê²',desc:`ì ê¸°ì ê² ìë£ (ì ê²ì¼ì  íë©´ìì ì²ë¦¬)`,technician:f.technician,result:'í©ê²©',next:f.next,fileId:f.fileId,fileName:f.fileName}])
    }
    setCalibModal(null)
  }
  return(
    <div>
      <SectionTitle breadcrumb="ì ê² ì¼ì ">ì ê² ì¼ì  ê´ë¦¬</SectionTitle>
      {urgent.length>0&&<div className="mb-3 p-3 rounded-lg flex items-start gap-2" style={{background:'var(--rust-soft)',border:'1px solid var(--rust)'}}><AlertTriangle size={14} style={{color:'var(--rust)',marginTop:2}}/><span className="text-[12.5px]" style={{color:'var(--rust)'}}><b>ì ê² ê¸°í ì´ê³¼ {urgent.length}ê±´</b> â {urgent.map(i=>i.name).join(', ')} â ì¦ì ì ê² íì</span></div>}
      {soon.length>0&&<div className="mb-4 p-3 rounded-lg flex items-start gap-2" style={{background:'#fff7ed',border:'1px solid #b45309'}}><Clock size={14} style={{color:'#b45309',marginTop:2}}/><span className="text-[12.5px]" style={{color:'#b45309'}}><b>30ì¼ ë´ ì ê² íì {soon.length}ê±´</b> â ì ê² ì¼ì  íì¸ ë° ì¡°ì¹</span></div>}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{color:'var(--ink-faint)'}}>ì ê² ì¼ì  (ISO 13485 Â§7.6) â {calibItems.length}ê° ê¸°ê¸° Â· ì ê²ì¼ ëëì ì ë ¬</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['ê¸°ê¸°ID','ê¸°ê¸°ëª','ì°¨ê¸° ì ê²ì¼','D-day','ì£¼ê¸°','íì¬ ìí','ìí ë³ê²½'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>{sorted.length===0?<EmptyRow msg="ì ê² ëì ê¸°ê¸°ê° ììµëë¤."/>:sorted.map(i=>{
              const dd=getDday(i.nextCalib)
              const tone=getTone(i.nextCalib)
              return(
                <tr key={i.id}>
                  <TD mono color="var(--moss)">{i.id}</TD>
                  <TD><span className="font-medium">{i.name}</span></TD>
                  <TD mono muted>{i.nextCalib}</TD>
                  <TD><Badge text={dd} tone={tone}/></TD>
                  <TD muted>{i.interval}</TD>
                  <TD><Badge text={i.status} tone={i.status==='êµì ìë°'?'amber':i.status==='ì¬ì©ê°ë¥'?'green':'red'}/></TD>
                  <TD>
                    <div className="flex gap-1 flex-wrap">
                      <ActBtn label="ì ê²ìë£" color="green" onClick={()=>setCalibModal(i)}/>
                      <ActBtn label="ì ê²ì¤" onClick={()=>setInstruments(p=>p.map(x=>x.id===i.id?{...x,status:'êµì ì¤'}:x))}/>
                    </div>
                  </TD>
                </tr>
              )
            })}</tbody>
          </table>
        </div>
      </Card>
      {calibModal&&<Modal title={`ì ê²ìë£ ì²ë¦¬ â ${calibModal.name}`} onClose={()=>setCalibModal(null)}><CalibCompleteForm instr={calibModal} onSave={completeCalib} onCancel={()=>setCalibModal(null)}/></Modal>}
    </div>
  )
}

/* âââ ì¤ë¹ í âââ */
function EqpHome({instruments,onNavigate}){
  const urgent=instruments.filter(i=>i.status==='êµì ìë°').length
  const broken=instruments.filter(i=>i.status==='ì¬ì©ì í').length
  const CARDS=[
    {id:'instruments',icon:Wrench,label:'ì¤ë¹íí©ëª©ë¡',desc:'ê¸°ê¸° ë±ë¡ Â· IQ/OQ/PQ Â· S/N ê´ë¦¬',count:`${instruments.length}ê°`,warn:urgent>0||broken>0},
    {id:'schedule',icon:Calendar,label:'ì ê² ì¼ì ',desc:'D-day ê´ë¦¬ Â· ëëì ì ë ¬ Â· ì´ê³¼ ê²½ë³´',count:`${urgent}ê±´ ìë°`,warn:urgent>0},
  ]
  const summary=[
    {label:'ì ì²´ ê¸°ê¸°',value:`${instruments.length}ê°`,warn:false,sub:'ë±ë¡ ê¸°ê¸° ì'},
    {label:'ì ê² ìë°',value:`${urgent}ê°`,warn:urgent>0,sub:'30ì¼ ì´ë´'},
    {label:'ì¬ì© ì í',value:`${broken}ê°`,warn:broken>0,sub:'ì ê² íì'},
  ]
  return(
    <div>
      <HubBanner
          title="ì¤ë¹Â·êµì  ê´ë¦¬"
          subtitle="ISO 13485 Â§7.6 Â· ì¤ë¹íí©ëª©ë¡ Â· IQ/OQ/PQ ì ê²©ì±íê° Â· ì ê² ì¼ì "
          icon={Settings2}
          color="#0284C7"
          quickActions={[{label:'ê¸°ê¸° ë±ë¡',icon:Plus,onClick:()=>onNavigate('instruments'),primary:true},{label:'ì ê² ì¼ì ',icon:Calendar,onClick:()=>onNavigate('schedule')}]}
          workflow={['ê¸°ê¸° ë±ë¡','IQ ì¤ì¹ì ê²©ì±íê°','OQ ìì´ì ì ê²©ì±íê°','PQ ì£¼ê¸° ì±ë¥íì¸','ìí ìë°ì´í¸','ì°¨ê¸° ì ê² ìì½']}
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
      <div className="grid sm:grid-cols-3 gap-3">
        {CARDS.map(card=>(
          <button key={card.id} onClick={()=>onNavigate(card.id)}
            className="rounded-xl p-5 text-left transition hover:shadow-md"
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

export default function EquipmentHub({ embedded = false } = {}){
  const user=auth.current()
  const [searchParams] = useSearchParams()
  const[view,setView]=useState(searchParams.get('tab') || 'home')
  const editId = searchParams.get('edit')
  const[instruments,setInstruments]=useLS('qms_eqp_instruments',INIT_INSTR)
  const[history,setHistory]=useLS('qms_eqp_history',INIT_HIST)
  const tabLabels={instruments:'ì¤ë¹íí©ëª©ë¡',schedule:'ì ê²ì¼ì '}
  const viewMap={
    home:<EqpHome instruments={instruments} onNavigate={setView}/>,
    instruments:<InstrumentsView instruments={instruments} setInstruments={setInstruments} openId={editId}/>,
    history:<HistoryView history={history} setHistory={setHistory} instruments={instruments}/>,
    schedule:<ScheduleView instruments={instruments} setInstruments={setInstruments} history={history} setHistory={setHistory}/>,
  }
  const content = (
    <div className={embedded ? '' : 'px-6 lg:px-8 py-6 max-w-[1280px] mx-auto'}>
      {view!=='home'&&<button onClick={()=>setView('home')} className="flex items-center gap-1.5 mb-5 text-[13px]" style={{color:'var(--moss)'}}><ArrowLeft size={14}/> ì¤ë¹Â·êµì  í</button>}
      {view!=='home'&&<div className="flex gap-1 flex-wrap mb-5">{Object.entries(tabLabels).map(([id,label])=><button key={id} onClick={()=>setView(id)} className="text-[12px] px-3 py-1.5 rounded-lg border transition" style={{background:view===id?'var(--moss)':'var(--bg-card)',color:view===id?'var(--bg)':'var(--ink-mute)',borderColor:view===id?'var(--moss)':'var(--line)'}}>{label}</button>)}</div>}
      {viewMap[view]||viewMap.home}
    </div>
  )
  if (embedded) return content
  return(
    <AppLayout user={user} title="ì¤ë¹Â·êµì " subtitle="ì¤ë¹íí© Â· IQ/OQ/PQ Â· ì ê² ì¼ì ">
      {content}
    </AppLayout>
  )
}
