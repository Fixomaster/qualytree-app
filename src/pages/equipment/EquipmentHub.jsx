import React, { useState, useEffect } from 'react'
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
import { fileStore } from '../../lib/fileStore'

function useLS(key,init){const[v,setV]=useState(()=>{try{const raw=localStorage.getItem(key);if(raw!=null)return JSON.parse(raw);localStorage.setItem(key,JSON.stringify(init));return init}catch{return init}});const set=(u)=>{const n=typeof u==='function'?u(v):u;localStorage.setItem(key,JSON.stringify(n));setV(n)};return[v,set]}
const nid=(p)=>`${p}-${new Date().toISOString().slice(2,4)}${String(new Date().getMonth()+1).padStart(2,'0')}-${String(Date.now()).slice(-3)}`
function toISODate(d){
  if(!d||d==='—') return null
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
const SectionTitle=({children,breadcrumb})=><div className="mb-5">{breadcrumb&&<div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-1" style={{color:'var(--ink-faint)'}}>설비·교정 / {breadcrumb}</div>}<h2 className="text-[22px]" style={{color:'var(--ink)',fontWeight:500}}>{children}</h2></div>
function EmptyRow({cols,msg}){return(<tr><td colSpan={cols||20} className="py-10 text-center text-sm" style={{color:"var(--ink-mute)"}}>{msg||"등록된 항목이 없습니다."}</td></tr>)}
function EmptyCard({msg}){return(<div className="py-10 text-center text-sm" style={{color:"var(--ink-mute)"}}>{msg||"등록된 항목이 없습니다."}</div>)}

function Modal({title,onClose,children,wide}){return <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.45)'}} onClick={e=>e.target===e.currentTarget&&onClose()}><div className={`rounded-2xl p-6 w-full ${wide?'max-w-2xl':'max-w-lg'} max-h-[92vh] overflow-y-auto`} style={{background:'var(--bg-card)',boxShadow:'0 24px 64px rgba(0,0,0,0.18)',border:'1px solid var(--line)'}}><div className="flex items-center justify-between mb-5"><h3 className="text-[17px] font-semibold" style={{color:'var(--ink)'}}>{title}</h3><button onClick={onClose} style={{color:'var(--ink-faint)'}}><X size={18}/></button></div>{children}</div></div>}

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
    <FL label={label||'첨부 파일 (성적서·보고서 등)'}>
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

/* ─── 초기 데이터 ─── */
const INIT_INSTR=[
  {id:'EQP-M-001',name:'버니어 캘리퍼스 150mm',model:'Mitutoyo 530-312',serial:'M-2019-0012',lastCalib:'2024-01-15',nextCalib:'2025-01-15',interval:'12개월',status:'사용가능',location:'검사실 A'},
  {id:'EQP-M-002',name:'마이크로미터 0-25mm',model:'Mitutoyo 103-137',serial:'M-2020-0034',lastCalib:'2024-06-01',nextCalib:'2024-12-01',interval:'6개월',status:'사용가능',location:'검사실 A'},
  {id:'EQP-M-003',name:'표면거칠기계',model:'Mitutoyo SJ-210',serial:'SJ-2021-0005',lastCalib:'2023-12-10',nextCalib:'2024-06-10',interval:'6개월',status:'교정임박',location:'검사실 B'},
  {id:'EQP-M-004',name:'하중계 500N',model:'Shimadzu LC-500',serial:'LC-2018-0007',lastCalib:'2024-03-22',nextCalib:'2025-03-22',interval:'12개월',status:'사용가능',location:'시험실'},
  {id:'EQP-M-005',name:'온습도계',model:'Testo 635-2',serial:'TE-2022-0018',lastCalib:'2024-02-05',nextCalib:'2024-08-05',interval:'6개월',status:'사용가능',location:'창고 A'},
  {id:'EQP-P-001',name:'CNC 선반 #1',model:'DOOSAN PUMA 2100',serial:'CNC-2020-001',lastCalib:'—',nextCalib:'—',interval:'PM 관리',status:'사용가능',location:'1공정'},
  {id:'EQP-P-002',name:'3축 CMM',model:'Zeiss Contura G2',serial:'CMM-2021-001',lastCalib:'2024-01-10',nextCalib:'2024-07-01',interval:'6개월',status:'교정임박',location:'검사실 A'},
  {id:'EQP-P-003',name:'초음파 세척기',model:'Power Sonic 410',serial:'UC-2019-003',lastCalib:'—',nextCalib:'—',interval:'PM 관리',status:'사용가능',location:'세척실'},
]
const INIT_HIST=[
  {id:'EH-2406-012',eqp:'EQP-P-001',name:'CNC 선반 #1',date:'2024-06-15',type:'PM',desc:'주기 예방보전 — 오일 교환, 필터 청소, 척 점검',technician:'이기술',result:'정상',next:'2024-09-15'},
  {id:'EH-2406-011',eqp:'EQP-M-003',name:'표면거칠기계',date:'2024-06-10',type:'수리',desc:'탐침 교체 — 마모로 인한 측정 오차 발생',technician:'제조사 A/S',result:'정상복구',next:'교정 의뢰 예정'},
  {id:'EH-2405-008',eqp:'EQP-P-001',name:'CNC 선반 #1',date:'2024-05-20',type:'PM',desc:'월간 점검 — 이상 없음',technician:'이기술',result:'정상',next:'2024-06-20'},
  {id:'EH-2405-006',eqp:'EQP-M-002',name:'마이크로미터',date:'2024-06-01',type:'교정',desc:'정기교정 (6개월)',technician:'한국교정연구원',result:'합격 (성적서 CAL-2406-002)',next:'2024-12-01'},
]

/* ─── IQ·OQ·PQ 적격성평가 ─── */
const PQ_FREQ_OPTS=['월 1회','분기 1회','반기 1회','연 1회']
const defaultQual=()=>({
  iq:{done:false,date:'',evaluator:'',result:'',notes:'',fileId:null,fileName:''},
  oq:{done:false,date:'',evaluator:'',result:'',notes:'',fileId:null,fileName:''},
  pq:{frequency:'분기 1회',records:[]},
})
function getQual(instr){ return instr.qual||defaultQual() }
function qualStage(instr){
  const q=getQual(instr)
  if(!q.iq.done||q.iq.result!=='적합') return 'iq'
  if(!q.oq.done||q.oq.result!=='적합') return 'oq'
  return 'pq'
}
function qualStageInfo(instr){
  const stage=qualStage(instr)
  if(stage==='iq') return {label:'IQ 대기',tone:'amber'}
  if(stage==='oq') return {label:'OQ 대기',tone:'blue'}
  return {label:'PQ 진행중',tone:'green'}
}
function monthsOf(freq){ return {'월 1회':1,'분기 1회':3,'반기 1회':6,'연 1회':12}[freq]||3 }
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
    result: current?.result || '적합',
    notes: current?.notes || '',
    fileId: current?.fileId || null,
    fileName: current?.fileName || '',
  }))
  const set=k=>e=>sf(p=>({...p,[k]:e.target.value}))
  return(
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FL label="평가일 *"><input style={inp} type="date" value={f.date} onChange={set('date')}/></FL>
        <FL label="평가자 *"><input style={inp} value={f.evaluator} onChange={set('evaluator')}/></FL>
        <FL label="판정"><select style={sel} value={f.result} onChange={set('result')}>{['적합','부적합'].map(o=><option key={o}>{o}</option>)}</select></FL>
      </div>
      <FL label="평가 내용·비고"><textarea style={{...inp,minHeight:'64px',resize:'vertical'}} value={f.notes} onChange={set('notes')} placeholder={`${title} 관련 확인 내용을 입력하세요`}/></FL>
      <SingleAttach fileId={f.fileId} fileName={f.fileName} label="첨부 파일 (평가 보고서 등)" onAttach={(id,name)=>sf(p=>({...p,fileId:id,fileName:name}))} onRemove={()=>sf(p=>({...p,fileId:null,fileName:''}))}/>
      <div className="flex gap-2 pt-2"><SBtn onClick={()=>f.evaluator&&onSave({...f,done:true})}>평가 저장</SBtn><SBtn onClick={onCancel} secondary>취소</SBtn></div>
    </div>
  )
}

function QualEvalDone({data,onRedo}){
  return(
    <div className="space-y-2">
      <div className="flex items-center gap-2"><Badge text={data.result} tone={data.result==='적합'?'green':'red'}/><span className="text-[12px]" style={{color:'var(--ink-mute)'}}>{data.date} · 평가자 {data.evaluator}</span></div>
      {data.notes&&<div className="text-[12.5px] p-2 rounded" style={{background:'var(--bg-soft)',color:'var(--ink)'}}>{data.notes}</div>}
      {data.fileId&&<a href={fileStore.getObjectURL(data.fileId)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[12px]" style={{color:'var(--moss)'}}><Paperclip size={11}/> {data.fileName||'첨부파일'}</a>}
      <div className="pt-1"><ActBtn label="재평가" onClick={onRedo}/></div>
    </div>
  )
}

function PQPanel({instr,pq,onSetFrequency,onAddRecord}){
  const [adding,setAdding]=useState(false)
  const [f,sf]=useState({date:new Date().toISOString().slice(0,10),evaluator:'',result:'이상없음',notes:'',fileId:null,fileName:''})
  const set=k=>e=>sf(p=>({...p,[k]:e.target.value}))
  const due=nextPQDate(pq)
  const sortedRecords=[...(pq.records||[])].sort((a,b)=>new Date(b.date)-new Date(a.date))
  const submit=()=>{
    if(!f.evaluator)return
    onAddRecord({id:nid('PQ'),...f})
    sf({date:new Date().toISOString().slice(0,10),evaluator:'',result:'이상없음',notes:'',fileId:null,fileName:''})
    setAdding(false)
  }
  return(
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <FL label="점검 주기"><select style={sel} value={pq.frequency} onChange={e=>onSetFrequency(e.target.value)}>{PQ_FREQ_OPTS.map(o=><option key={o}>{o}</option>)}</select></FL>
        {due&&<div className="text-[12px]" style={{color:'var(--ink-mute)'}}>다음 점검 예정일: <b style={{color:'var(--ink)'}}>{due}</b></div>}
      </div>
      {!adding?(
        <ActBtn label="+ 점검 기록 추가" color="green" onClick={()=>setAdding(true)}/>
      ):(
        <div className="p-3 rounded-xl space-y-2" style={{background:'var(--bg-soft)'}}>
          <div className="grid grid-cols-2 gap-3">
            <FL label="점검일 *"><input style={inp} type="date" value={f.date} onChange={set('date')}/></FL>
            <FL label="점검자 *"><input style={inp} value={f.evaluator} onChange={set('evaluator')}/></FL>
            <FL label="결과"><select style={sel} value={f.result} onChange={set('result')}>{['이상없음','이상있음'].map(o=><option key={o}>{o}</option>)}</select></FL>
          </div>
          <FL label="비고"><textarea style={{...inp,minHeight:'56px',resize:'vertical'}} value={f.notes} onChange={set('notes')}/></FL>
          <SingleAttach fileId={f.fileId} fileName={f.fileName} onAttach={(id,name)=>sf(p=>({...p,fileId:id,fileName:name}))} onRemove={()=>sf(p=>({...p,fileId:null,fileName:''}))}/>
          <div className="flex gap-2 pt-1"><SBtn onClick={submit}>저장</SBtn><SBtn secondary onClick={()=>setAdding(false)}>취소</SBtn></div>
        </div>
      )}
      <div className="space-y-1.5">
        {sortedRecords.length===0?<div className="text-[12px] text-center py-4" style={{color:'var(--ink-faint)'}}>등록된 PQ 점검 기록이 없습니다.</div>:sortedRecords.map(r=>(
          <div key={r.id} className="p-2.5 rounded-lg" style={{background:'var(--bg-soft)'}}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[12px] font-mono" style={{color:'var(--ink-faint)'}}>{r.date}</span>
              <Badge text={r.result} tone={r.result==='이상없음'?'green':'red'}/>
              <span className="text-[11.5px]" style={{color:'var(--ink-mute)'}}>점검자 {r.evaluator}</span>
            </div>
            {r.notes&&<div className="text-[12px] mt-1" style={{color:'var(--ink)'}}>{r.notes}</div>}
            {r.fileId&&<a href={fileStore.getObjectURL(r.fileId)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11.5px] mt-1" style={{color:'var(--moss)'}}><Paperclip size={10}/> {r.fileName||'첨부파일'}</a>}
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
  const oqUnlocked=q.iq.done&&q.iq.result==='적합'
  const pqUnlocked=oqUnlocked&&q.oq.done&&q.oq.result==='적합'
  const tabs=[
    {id:'iq',label:'IQ 설치적격성평가',locked:false},
    {id:'oq',label:'OQ 시운전적격성평가',locked:!oqUnlocked},
    {id:'pq',label:'PQ 성능적격성평가',locked:!pqUnlocked},
  ]
  return(
    <Modal title={`적격성평가 — ${instrument.name} (${instrument.id})`} onClose={onClose} wide>
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
          : <QualEvalForm title="설치적격성평가(IQ)" current={q.iq} onSave={(data)=>patchQual({iq:data})} onCancel={onClose}/>
      )}
      {tab==='oq'&&(
        !oqUnlocked
          ? <div className="text-[12.5px] p-3 rounded-lg flex items-center gap-2" style={{background:'var(--bg-soft)',color:'var(--ink-mute)'}}><Lock size={13}/> IQ(설치적격성평가)가 적합 판정으로 완료되어야 OQ를 진행할 수 있습니다.</div>
          : q.oq.done
            ? <QualEvalDone data={q.oq} onRedo={()=>patchQual({oq:{...q.oq,done:false}})}/>
            : <QualEvalForm title="시운전적격성평가(OQ)" current={q.oq} onSave={(data)=>patchQual({oq:data})} onCancel={onClose}/>
      )}
      {tab==='pq'&&(
        !pqUnlocked
          ? <div className="text-[12.5px] p-3 rounded-lg flex items-center gap-2" style={{background:'var(--bg-soft)',color:'var(--ink-mute)'}}><Lock size={13}/> OQ(시운전적격성평가)가 적합 판정으로 완료되어야 PQ를 진행할 수 있습니다.</div>
          : <PQPanel instr={instrument} pq={q.pq} onSetFrequency={(freq)=>patchQual({pq:{...q.pq,frequency:freq}})} onAddRecord={(rec)=>patchQual({pq:{...q.pq,records:[...(q.pq.records||[]),rec]}})}/>
      )}
    </Modal>
  )
}

/* ─── 설비현황목록 ─── */

function InstrumentsView({instruments,setInstruments,openId}){
  const[modal,setModal]=useState(null);const[edit,setEdit]=useState(null)
  const[detail,setDetail]=useState(null); const[detailTab,setDetailTab]=useState(null)
  const [srch, setSrch] = useState('')
  useEffect(() => {
    if (openId) { const item = instruments.find(x => x.id === openId); if (item) { setEdit(item); setModal('form') } }
  }, [openId])
  const shown = srch ? instruments.filter(i=>[i.name,i.model,i.serial,i.location].some(v=>v&&v.toLowerCase().includes(srch.toLowerCase()))) : instruments
  const statusOpts=['사용가능','교정임박','교정중','사용제한','폐기']
  const del=id=>{if(window.confirm('삭제하시겠습니까?'))setInstruments(p=>p.filter(x=>x.id!==id))}
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
  const urgent=instruments.filter(i=>i.status==='교정임박'||i.status==='교정중')
  return(
    <div>
      <SectionTitle breadcrumb="설비현황목록">설비현황목록</SectionTitle>
      {urgent.length>0&&<div className="mb-4 p-3 rounded-lg flex items-start gap-2" style={{background:'var(--rust-soft)',border:'1px solid var(--rust)'}}><AlertTriangle size={14} style={{color:'var(--rust)',marginTop:2}}/><span className="text-[12.5px]" style={{color:'var(--rust)'}}><b>점검 필요 {urgent.length}건</b> — {urgent.map(i=>i.name).join(', ')} (ISO 13485 §7.6)</span></div>}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{color:'var(--ink-faint)'}}>설비현황목록 (ISO 13485 §7.6) — {instruments.length}개</span>
          <button onClick={()=>{setEdit(null);setModal('form')}} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium" style={{background:'var(--moss)',color:'var(--bg)'}}><Plus size={13}/> 기기 등록</button>
        </div>
      <div className="flex items-center gap-2 mb-3">
        <input className="flex-1 text-xs rounded-lg px-3 py-1.5 outline-none"
          style={{background:"var(--bg-soft)",border:"1px solid var(--line)",color:"var(--ink)"}}
          placeholder="기기명 · 모델 · S/N · 위치 검색..."
          value={srch} onChange={e=>setSrch(e.target.value)}/>
        {srch&&<button onClick={()=>setSrch("")} className="text-xs px-2 rounded" style={{color:"var(--ink-mute)"}}>✕</button>}
      </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['기기ID','기기명','모델','S/N','최근점검','차기점검','주기','위치','상태','적격성평가','작업'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>{shown.length===0?<EmptyRow msg={srch?"검색 결과가 없습니다.":undefined}/>:shown.map(i=>{
              const qi=qualStageInfo(i)
              return(
      <tr key={i.id}>
                <TD mono color="var(--moss)">{i.id}</TD>
                <TD><button onClick={()=>openDetail(i)} className="font-medium hover:underline" style={{color:'var(--ink)'}}>{i.name}</button></TD>
                <TD muted>{i.model}</TD>
                <TD mono muted>{i.serial}</TD>
                <TD mono muted>{i.lastCalib}</TD>
                <TD mono color={i.status==='교정임박'?'var(--rust)':undefined}>{i.nextCalib}</TD>
                <TD muted>{i.interval}</TD>
                <TD muted>{i.location}</TD>
                <TD><StatusSelect value={i.status} options={statusOpts} onChange={v=>setInstruments(p=>p.map(x=>x.id===i.id?{...x,status:v}:x))}/></TD>
                <TD><button onClick={()=>openDetail(i)} className="inline-flex items-center gap-1"><Badge text={qi.label} tone={qi.tone}/><ChevronRight size={11} style={{color:'var(--ink-faint)'}}/></button></TD>
                <TD><div className="flex gap-1"><ActBtn label="수정" onClick={()=>{setEdit(i);setModal('form')}}/><ActBtn label="삭제" color="red" onClick={()=>del(i.id)}/></div></TD>
              </tr>
            )})}</tbody>
          </table>
        </div>
      </Card>
      {modal==='form'&&<Modal title={edit?'기기 수정':'기기 등록'} onClose={()=>{setModal(null);setEdit(null)}}><InstrForm initial={edit||{}} onSave={save} onCancel={()=>{setModal(null);setEdit(null)}} statusOpts={statusOpts}/></Modal>}
      {detailInstr&&<DeviceDetail instrument={detailInstr} setInstruments={setInstruments} onClose={()=>{setDetail(null);setDetailTab(null)}} initialTab={detailTab}/>}
    </div>
  )
}
function InstrForm({initial,onSave,onCancel,statusOpts}){
  const[f,sf]=useState({name:'',model:'',serial:'',lastCalib:'',nextCalib:'',interval:'12개월',location:'',status:'사용가능',...initial})
  const set=k=>e=>sf(p=>({...p,[k]:e.target.value}))
  return(
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FL label="기기명 *"><input style={inp} value={f.name} onChange={set('name')} placeholder="예) 버니어 캘리퍼스"/></FL>
        <FL label="모델명"><input style={inp} value={f.model} onChange={set('model')}/></FL>
        <FL label="시리얼 번호"><input style={inp} value={f.serial} onChange={set('serial')}/></FL>
        <FL label="최근 점검일"><input style={inp} type="date" value={f.lastCalib} onChange={set('lastCalib')}/></FL>
        <FL label="차기 점검일"><input style={inp} type="date" value={f.nextCalib} onChange={set('nextCalib')}/></FL>
        <FL label="점검 주기"><select style={sel} value={f.interval} onChange={set('interval')}>{['3개월','6개월','12개월','PM 관리','해당없음'].map(o=><option key={o}>{o}</option>)}</select></FL>
        <FL label="보관 위치"><input style={inp} value={f.location} onChange={set('location')}/></FL>
        <FL label="상태"><select style={sel} value={f.status} onChange={set('status')}>{statusOpts.map(o=><option key={o}>{o}</option>)}</select></FL>
      </div>
      <div className="text-[11.5px]" style={{color:'var(--ink-faint)'}}>* 신규 등록 시 기기명·모델명·시리얼번호만 입력해도 등록할 수 있으며, 등록 즉시 IQ(설치적격성평가) 화면으로 이동합니다.</div>
      <div className="flex gap-2 pt-2"><SBtn onClick={()=>f.name&&onSave(f)}>{initial.name?'수정 저장':'등록'}</SBtn><SBtn onClick={onCancel} secondary>취소</SBtn></div>
    </div>
  )
}

/* ─── 이력 관리 ─── */
function HistoryView({history,setHistory,instruments}){
  const[modal,setModal]=useState(null);const[edit,setEdit]=useState(null)
  const typeOpts=['PM','교정','수리','점검','기타']
  const resultOpts=['정상','정상복구','합격','조건부','불합격']
  const del=id=>{if(window.confirm('삭제하시겠습니까?'))setHistory(p=>p.filter(x=>x.id!==id))}
  const save=f=>{
    if(edit){setHistory(p=>p.map(x=>x.id===edit.id?{...x,...f}:x));setEdit(null)}
    else{setHistory(p=>[...p,{id:nid('EH'),date:new Date().toISOString().slice(0,10),...f}])}
    setModal(null)
  }
  return(
    <div>
      <SectionTitle breadcrumb="이력 관리">이력 관리 (PM · 교정 · 수리)</SectionTitle>
      <Card>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{color:'var(--ink-faint)'}}>설비·기기 이력 — {history.length}건</span>
          <button onClick={()=>{setEdit(null);setModal('form')}} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium" style={{background:'var(--moss)',color:'var(--bg)'}}><Plus size={13}/> 이력 추가</button>
        </div>
        <div className="space-y-2">
          {history.length===0?<EmptyCard/>:history.map(h=>(
      <div key={h.id} className="p-3 rounded-xl flex items-start gap-3" style={{border:'1px solid var(--line)',background:'var(--bg)'}}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-mono text-[11px] font-bold" style={{color:'var(--moss)'}}>{h.id}</span>
                  <span className="text-[11px]" style={{color:'var(--ink-faint)'}}>{h.date}</span>
                  <Badge text={h.type} tone={h.type==='교정'?'blue':h.type==='수리'?'amber':'green'}/>
                  <Badge text={h.name} tone="gray"/>
                </div>
                <div className="text-[12.5px]" style={{color:'var(--ink)'}}>{h.desc}</div>
                <div className="mt-1 flex gap-3 text-[11.5px]" style={{color:'var(--ink-mute)'}}>
                  <span>담당: {h.technician}</span>
                  <span>결과: <span style={{color:'var(--moss)',fontWeight:600}}>{h.result}</span></span>
                  {h.next&&<span>차기: {h.next}</span>}
                  {h.fileId&&(
                    <a href={fileStore.getObjectURL(h.fileId)} target="_blank" rel="noreferrer" className="flex items-center gap-1" style={{color:'var(--moss)'}}>
                      <Paperclip size={11}/> {h.fileName||'첨부파일'}
                    </a>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <ActBtn label="수정" onClick={()=>{setEdit(h);setModal('form')}}/>
                <ActBtn label="삭제" color="red" onClick={()=>del(h.id)}/>
              </div>
            </div>
          ))}
        </div>
      </Card>
      {modal==='form'&&<Modal title={edit?'이력 수정':'이력 추가'} onClose={()=>{setModal(null);setEdit(null)}}><HistForm initial={edit||{}} instruments={instruments} onSave={save} onCancel={()=>{setModal(null);setEdit(null)}} typeOpts={typeOpts} resultOpts={resultOpts}/></Modal>}
    </div>
  )
}
function HistForm({initial,instruments,onSave,onCancel,typeOpts,resultOpts}){
  const[f,sf]=useState({eqp:'',name:'',type:'PM',desc:'',technician:'',result:'정상',next:'',...initial})
  const set=k=>e=>sf(p=>({...p,[k]:e.target.value}))
  const selEqp=e=>{const i=instruments.find(x=>x.id===e.target.value);if(i)sf(p=>({...p,eqp:i.id,name:i.name}));else set('eqp')(e)}
  return(
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FL label="기기/설비 *"><select style={sel} value={f.eqp} onChange={selEqp}><option value="">선택</option>{instruments.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></FL>
        <FL label="이력 유형"><select style={sel} value={f.type} onChange={set('type')}>{typeOpts.map(o=><option key={o}>{o}</option>)}</select></FL>
        <FL label="담당자 *"><input style={inp} value={f.technician} onChange={set('technician')}/></FL>
        <FL label="결과"><select style={sel} value={f.result} onChange={set('result')}>{resultOpts.map(o=><option key={o}>{o}</option>)}</select></FL>
        <FL label="차기 예정일"><input style={inp} type="date" value={f.next} onChange={set('next')}/></FL>
      </div>
      <FL label="작업 내용 *"><textarea style={{...inp,minHeight:'72px',resize:'vertical'}} value={f.desc} onChange={set('desc')} placeholder="수행한 작업 내용을 입력하세요"/></FL>
      <SingleAttach fileId={f.fileId} fileName={f.fileName} onAttach={(id,name)=>sf(p=>({...p,fileId:id,fileName:name}))} onRemove={()=>sf(p=>({...p,fileId:null,fileName:''}))}/>
      <div className="flex gap-2 pt-2"><SBtn onClick={()=>f.eqp&&f.desc&&f.technician&&onSave(f)}>{initial.eqp?'수정 저장':'추가'}</SBtn><SBtn onClick={onCancel} secondary>취소</SBtn></div>
    </div>
  )
}

/* ─── 점검 일정 ─── */
function CalibCompleteForm({instr,onSave,onCancel}){
  const today=new Date().toISOString().slice(0,10)
  const suggestNext=()=>{
    const m=parseInt(instr.interval)||12
    const d=new Date(); d.setMonth(d.getMonth()+m)
    return d.toISOString().slice(0,10)
  }
  const [f,sf]=useState({technician:'',next:instr.interval&&instr.interval!=='PM 관리'&&instr.interval!=='해당없음'?suggestNext():'',fileId:null,fileName:''})
  const set=k=>e=>sf(p=>({...p,[k]:e.target.value}))
  return(
    <div className="space-y-3">
      <div className="text-[12.5px] p-2 rounded" style={{background:'var(--bg-soft)',color:'var(--ink-mute)'}}>{instr.name} ({instr.id}) — 점검 완료 처리 시 오늘({today}) 날짜로 최근점검일이 갱신되고, 이력 관리에도 자동으로 기록됩니다.</div>
      <div className="grid grid-cols-2 gap-3">
        <FL label="점검 수행자 *"><input style={inp} value={f.technician} onChange={set('technician')} placeholder="예) 홍길동"/></FL>
        <FL label="차기 점검일 *"><input style={inp} type="date" value={f.next} onChange={set('next')}/></FL>
      </div>
      <SingleAttach fileId={f.fileId} fileName={f.fileName} onAttach={(id,name)=>sf(p=>({...p,fileId:id,fileName:name}))} onRemove={()=>sf(p=>({...p,fileId:null,fileName:''}))}/>
      <div className="flex gap-2 pt-2"><SBtn onClick={()=>f.technician&&f.next&&onSave(f)}>점검완료 처리</SBtn><SBtn onClick={onCancel} secondary>취소</SBtn></div>
    </div>
  )
}
function ScheduleView({instruments,setInstruments,history,setHistory}){
  const [calibModal,setCalibModal]=useState(null)
  const calibItems=instruments.filter(i=>i.interval!=='PM 관리'&&i.interval!=='해당없음')
  const parseDate=(d)=>{ const iso=toISODate(d); if(!iso) return null; const t=new Date(iso).getTime(); return isNaN(t)?null:t }
  const sorted=[...calibItems].sort((a,b)=>{
    const ta=parseDate(a.nextCalib), tb=parseDate(b.nextCalib)
    if(ta===null&&tb===null) return 0
    if(ta===null) return 1
    if(tb===null) return -1
    return ta-tb
  })
  const today=new Date().toISOString().slice(0,10)
  const getDday=(d)=>{const iso=toISODate(d);if(!iso)return'—';const diff=Math.ceil((new Date(iso)-new Date(today))/(1000*60*60*24));if(diff<0)return`D+${Math.abs(diff)} 초과`;if(diff===0)return'오늘';return`D-${diff}`}
  const getTone=(d)=>{const iso=toISODate(d);if(!iso)return'gray';const diff=Math.ceil((new Date(iso)-new Date(today))/(1000*60*60*24));if(diff<0)return'red';if(diff<=30)return'amber';return'green'}
  const urgent=sorted.filter(i=>{const t=parseDate(i.nextCalib);return t!==null&&t<new Date(today).getTime()})
  const soon=sorted.filter(i=>{const t=parseDate(i.nextCalib);if(t===null)return false;const diff=(t-new Date(today).getTime())/(1000*60*60*24);return diff>=0&&diff<=30})
  const completeCalib=(f)=>{
    const instr=calibModal
    setInstruments(p=>p.map(x=>x.id===instr.id?{...x,lastCalib:today,nextCalib:f.next,status:'사용가능'}:x))
    if(setHistory){
      setHistory(p=>[...p,{id:nid('EH'),date:today,eqp:instr.id,name:instr.name,type:'점검',desc:`정기점검 완료 (점검일정 화면에서 처리)`,technician:f.technician,result:'합격',next:f.next,fileId:f.fileId,fileName:f.fileName}])
    }
    setCalibModal(null)
  }
  return(
    <div>
      <SectionTitle breadcrumb="점검 일정">점검 일정 관리</SectionTitle>
      {urgent.length>0&&<div className="mb-3 p-3 rounded-lg flex items-start gap-2" style={{background:'var(--rust-soft)',border:'1px solid var(--rust)'}}><AlertTriangle size={14} style={{color:'var(--rust)',marginTop:2}}/><span className="text-[12.5px]" style={{color:'var(--rust)'}}><b>점검 기한 초과 {urgent.length}건</b> — {urgent.map(i=>i.name).join(', ')} — 즉시 점검 필요</span></div>}
      {soon.length>0&&<div className="mb-4 p-3 rounded-lg flex items-start gap-2" style={{background:'#fff7ed',border:'1px solid #b45309'}}><Clock size={14} style={{color:'#b45309',marginTop:2}}/><span className="text-[12.5px]" style={{color:'#b45309'}}><b>30일 내 점검 필요 {soon.length}건</b> — 점검 일정 확인 및 조치</span></div>}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{color:'var(--ink-faint)'}}>점검 일정 (ISO 13485 §7.6) — {calibItems.length}개 기기 · 점검일 도래순 정렬</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['기기ID','기기명','차기 점검일','D-day','주기','현재 상태','상태 변경'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>{sorted.length===0?<EmptyRow msg="점검 대상 기기가 없습니다."/>:sorted.map(i=>{
              const dd=getDday(i.nextCalib)
              const tone=getTone(i.nextCalib)
              return(
                <tr key={i.id}>
                  <TD mono color="var(--moss)">{i.id}</TD>
                  <TD><span className="font-medium">{i.name}</span></TD>
                  <TD mono muted>{i.nextCalib}</TD>
                  <TD><Badge text={dd} tone={tone}/></TD>
                  <TD muted>{i.interval}</TD>
                  <TD><Badge text={i.status} tone={i.status==='교정임박'?'amber':i.status==='사용가능'?'green':'red'}/></TD>
                  <TD>
                    <div className="flex gap-1 flex-wrap">
                      <ActBtn label="점검완료" color="green" onClick={()=>setCalibModal(i)}/>
                      <ActBtn label="점검중" onClick={()=>setInstruments(p=>p.map(x=>x.id===i.id?{...x,status:'교정중'}:x))}/>
                    </div>
                  </TD>
                </tr>
              )
            })}</tbody>
          </table>
        </div>
      </Card>
      {calibModal&&<Modal title={`점검완료 처리 — ${calibModal.name}`} onClose={()=>setCalibModal(null)}><CalibCompleteForm instr={calibModal} onSave={completeCalib} onCancel={()=>setCalibModal(null)}/></Modal>}
    </div>
  )
}

/* ─── 설비 홈 ─── */
function EqpHome({instruments,onNavigate}){
  const urgent=instruments.filter(i=>i.status==='교정임박').length
  const broken=instruments.filter(i=>i.status==='사용제한').length
  const CARDS=[
    {id:'instruments',icon:Wrench,label:'설비현황목록',desc:'기기 등록 · IQ/OQ/PQ · S/N 관리',count:`${instruments.length}개`,warn:urgent>0||broken>0},
    {id:'schedule',icon:Calendar,label:'점검 일정',desc:'D-day 관리 · 도래순 정렬 · 초과 경보',count:`${urgent}건 임박`,warn:urgent>0},
  ]
  const summary=[
    {label:'전체 기기',value:`${instruments.length}개`,warn:false,sub:'등록 기기 수'},
    {label:'점검 임박',value:`${urgent}개`,warn:urgent>0,sub:'30일 이내'},
    {label:'사용 제한',value:`${broken}개`,warn:broken>0,sub:'점검 필요'},
  ]
  return(
    <div>
      <HubBanner
          title="설비·교정 관리"
          subtitle="ISO 13485 §7.6 · 설비현황목록 · IQ/OQ/PQ 적격성평가 · 점검 일정"
          icon={Settings2}
          color="#0284C7"
          quickActions={[{label:'기기 등록',icon:Plus,onClick:()=>onNavigate('instruments'),primary:true},{label:'점검 일정',icon:Calendar,onClick:()=>onNavigate('schedule')}]}
          workflow={['기기 등록','IQ 설치적격성평가','OQ 시운전적격성평가','PQ 주기 성능확인','상태 업데이트','차기 점검 예약']}
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
  const tabLabels={instruments:'설비현황목록',schedule:'점검일정'}
  const viewMap={
    home:<EqpHome instruments={instruments} onNavigate={setView}/>,
    instruments:<InstrumentsView instruments={instruments} setInstruments={setInstruments} openId={editId}/>,
    history:<HistoryView history={history} setHistory={setHistory} instruments={instruments}/>,
    schedule:<ScheduleView instruments={instruments} setInstruments={setInstruments} history={history} setHistory={setHistory}/>,
  }
  const content = (
    <div className={embedded ? '' : 'px-6 lg:px-8 py-6 max-w-[1280px] mx-auto'}>
      {view!=='home'&&<button onClick={()=>setView('home')} className="flex items-center gap-1.5 mb-5 text-[13px]" style={{color:'var(--moss)'}}><ArrowLeft size={14}/> 설비·교정 홈</button>}
      {view!=='home'&&<div className="flex gap-1 flex-wrap mb-5">{Object.entries(tabLabels).map(([id,label])=><button key={id} onClick={()=>setView(id)} className="text-[12px] px-3 py-1.5 rounded-lg border transition" style={{background:view===id?'var(--moss)':'var(--bg-card)',color:view===id?'var(--bg)':'var(--ink-mute)',borderColor:view===id?'var(--moss)':'var(--line)'}}>{label}</button>)}</div>}
      {viewMap[view]||viewMap.home}
    </div>
  )
  if (embedded) return content
  return(
    <AppLayout user={user} title="설비·교정" subtitle="설비현황 · IQ/OQ/PQ · 점검 일정">
      {content}
    </AppLayout>
  )
}
