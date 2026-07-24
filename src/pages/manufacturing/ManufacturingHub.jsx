import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Cog, ClipboardList, AlertTriangle, ArrowLeft, Plus, X, Activity, FileText, Wrench } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'

/* ─── util ─── */
function useLS(key,init){const[v,setV]=useState(()=>{try{return JSON.parse(localStorage.getItem(key))??init}catch{return init}});const set=(u)=>{const n=typeof u==='function'?u(v):u;localStorage.setItem(key,JSON.stringify(n));setV(n)};return[v,set]}
const nid=(p)=>`${p}-${new Date().toISOString().slice(2,4)}${String(new Date().getMonth()+1).padStart(2,'0')}-${String(Date.now()).slice(-3)}`
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
function WoView({wo,setWo,openId}){
  const[modal,setModal]=useState(null);const[edit,setEdit]=useState(null)
  useEffect(() => {
    if (openId) { const item = wo.find(x => x.id === openId); if (item) { setEdit(item); setModal('form') } }
  }, [openId])
  const statusOpts=['대기','진행중','검사중','완료','취소']
  const del=id=>{if(window.confirm('삭제하시겠습니까?'))setWo(p=>p.filter(x=>x.id!==id))}
  const save=f=>{if(edit){setWo(p=>p.map(x=>x.id===edit.id?{...x,...f}:x));setEdit(null)}else{setWo(p=>[...p,{id:nid('WO'),...f}])};setModal(null)}
  return(
    <div>
      <SectionTitle breadcrumb="작업지시 (WO)">작업지시 관리</SectionTitle>
      <Card>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{color:'var(--ink-faint)'}}>작업지시 목록 (ISO 13485 §7.5.1) — {wo.length}건</span>
          <button onClick={()=>{setEdit(null);setModal('form')}} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium" style={{background:'var(--moss)',color:'var(--bg)'}}><Plus size={13}/> WO 발행</button>
        </div>
        <div className="space-y-3">
          {wo.length===0?<EmptyCard/>:wo.map(w=>(
      <div key={w.id} className="p-3 rounded-xl" style={{border:'1px solid var(--line)',background:'var(--bg)'}}>
              <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[12px] font-bold" style={{color:'var(--moss)'}}>{w.id}</span>
                  <Badge text={w.product} tone="blue"/>
                  <Badge text={`${w.qty}EA`} tone="gray"/>
                  {w.so&&<span className="font-mono text-[10px]" style={{color:'var(--ink-faint)'}}>{w.so}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <StatusSelect value={w.status} options={statusOpts} onChange={v=>setWo(p=>p.map(x=>x.id===w.id?{...x,status:v}:x))}/>
                  <ActBtn label="수정" onClick={()=>{setEdit(w);setModal('form')}}/>
                  <ActBtn label="삭제" color="red" onClick={()=>del(w.id)}/>
                </div>
              </div>
              <div className="flex items-center gap-4 text-[12px] mb-2" style={{color:'var(--ink-mute)'}}>
                <span>현공정: <b style={{color:'var(--ink)'}}>{w.step}</b></span>
                <span>담당: {w.assignee}</span>
                <span>납기: {w.dueDate}</span>
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-1" style={{color:'var(--ink-mute)'}}>
                  <span>진행률</span><span style={{color:'var(--moss)',fontWeight:600}}>{w.progress}%</span>
                </div>
                <div className="rounded-full h-2" style={{background:'var(--bg-soft)'}}>
                  <div className="rounded-full h-2 transition-all" style={{width:`${w.progress}%`,background:w.progress==='100'?'var(--moss)':'#60a5fa'}}/>
                </div>
              </div>
              {w.status==='진행중'&&(
                <div className="flex gap-1 mt-2">
                  {[10,25,50,75,90,100].map(p=>(
                    <button key={p} onClick={()=>setWo(prev=>prev.map(x=>x.id===w.id?{...x,progress:String(p),status:p===100?'완료':x.status}:x))}
                      className="text-[10px] px-2 py-0.5 rounded font-mono transition"
                      style={{background:Number(w.progress)===p?'var(--moss)':'var(--bg-soft)',color:Number(w.progress)===p?'var(--bg)':'var(--ink-mute)'}}>
                      {p}%
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
      {modal==='form'&&<Modal title={edit?'WO 수정':'작업지시 발행'} onClose={()=>{setModal(null);setEdit(null)}}><WoForm initial={edit||{}} onSave={save} onCancel={()=>{setModal(null);setEdit(null)}} statusOpts={statusOpts}/></Modal>}
    </div>
  )
}
function WoForm({initial,onSave,onCancel,statusOpts}){
  const[f,sf]=useState({so:'',product:'',qty:'',step:'',dueDate:'',startDate:new Date().toISOString().slice(0,10),assignee:'',progress:'0',status:'대기',...initial})
  const set=k=>e=>sf(p=>({...p,[k]:e.target.value}))
  return(
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FL label="SO 번호"><input style={inp} value={f.so} onChange={set('so')} placeholder="SO-XXXX-XXX"/></FL>
        <FL label="제품명 *"><input style={inp} value={f.product} onChange={set('product')} placeholder="예) SCS M3.5×22mm"/></FL>
        <FL label="수량(EA)"><input style={inp} type="number" value={f.qty} onChange={set('qty')}/></FL>
        <FL label="현 공정 단계"><input style={inp} value={f.step} onChange={set('step')} placeholder="예) CNC 선삭"/></FL>
        <FL label="시작일"><input style={inp} type="date" value={f.startDate} onChange={set('startDate')}/></FL>
        <FL label="납기일"><input style={inp} type="date" value={f.dueDate} onChange={set('dueDate')}/></FL>
        <FL label="담당팀/자"><input style={inp} value={f.assignee} onChange={set('assignee')}/></FL>
        <FL label="진행률(%)"><input style={inp} type="number" min="0" max="100" value={f.progress} onChange={set('progress')}/></FL>
        <FL label="상태"><select style={sel} value={f.status} onChange={set('status')}>{statusOpts.map(o=><option key={o}>{o}</option>)}</select></FL>
      </div>
      <div className="flex gap-2 pt-2"><SBtn onClick={()=>f.product&&onSave(f)}>{initial.product?'수정 저장':'WO 발행'}</SBtn><SBtn onClick={onCancel} secondary>취소</SBtn></div>
    </div>
  )
}

/* ─── 공정 기록 ─── */
function ProcRecView({proc,setProc,wo}){
  const[modal,setModal]=useState(null);const[edit,setEdit]=useState(null)
  const del=id=>{if(window.confirm('삭제하시겠습니까?'))setProc(p=>p.filter(x=>x.id!==id))}
  const save=f=>{if(edit){setProc(p=>p.map(x=>x.id===edit.id?{...x,...f}:x));setEdit(null)}else{setProc(p=>[...p,{id:nid('PR'),date:new Date().toISOString().slice(0,10),...f}])};setModal(null)}
  const resultOpts=['합격','조건부합격','불합격','해당없음']
  return(
    <div>
      <SectionTitle breadcrumb="공정 기록">공정 기록 (배치 레코드)</SectionTitle>
      <Card>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{color:'var(--ink-faint)'}}>공정 기록 목록 (ISO 13485 §7.5.1) — {proc.length}건</span>
          <button onClick={()=>{setEdit(null);setModal('form')}} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium" style={{background:'var(--moss)',color:'var(--bg)'}}><Plus size={13}/> 기록 추가</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['기록ID','WO','일자','공정단계','설비','작업자','공정 파라미터','결과','비고','작업'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>{proc.length===0?<EmptyRow/>:proc.map(p=>(
      <tr key={p.id}>
                <TD mono color="var(--moss)">{p.id}</TD>
                <TD mono muted>{p.wo}</TD>
                <TD mono muted>{p.date}</TD>
                <TD><span className="font-medium">{p.step}</span></TD>
                <TD muted>{p.machine}</TD>
                <TD>{p.operator}</TD>
                <TD muted>{p.param}</TD>
                <TD><Badge text={p.result} tone={statusTone(p.result)}/></TD>
                <TD muted>{p.note||'—'}</TD>
                <TD><div className="flex gap-1"><ActBtn label="수정" onClick={()=>{setEdit(p);setModal('form')}}/><ActBtn label="삭제" color="red" onClick={()=>del(p.id)}/></div></TD>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
      {modal==='form'&&<Modal title={edit?'기록 수정':'공정 기록 추가'} onClose={()=>{setModal(null);setEdit(null)}}><ProcForm initial={edit||{}} wo={wo} onSave={save} onCancel={()=>{setModal(null);setEdit(null)}} resultOpts={resultOpts}/></Modal>}
    </div>
  )
}
function ProcForm({initial,wo,onSave,onCancel,resultOpts}){
  const[f,sf]=useState({wo:'',step:'',machine:'',operator:'',param:'',result:'합격',note:'',...initial})
  const set=k=>e=>sf(p=>({...p,[k]:e.target.value}))
  return(
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FL label="WO 번호"><select style={sel} value={f.wo} onChange={set('wo')}><option value="">직접 입력</option>{wo.map(w=><option key={w.id} value={w.id}>{w.id} — {w.product}</option>)}</select></FL>
        <FL label="공정 단계 *"><input style={inp} value={f.step} onChange={set('step')} placeholder="예) CNC 선삭"/></FL>
        <FL label="사용 설비"><input style={inp} value={f.machine} onChange={set('machine')} placeholder="CNC-01, 외주 등"/></FL>
        <FL label="작업자 *"><input style={inp} value={f.operator} onChange={set('operator')}/></FL>
        <FL label="결과"><select style={sel} value={f.result} onChange={set('result')}>{resultOpts.map(o=><option key={o}>{o}</option>)}</select></FL>
      </div>
      <FL label="공정 파라미터"><textarea style={{...inp,minHeight:'60px',resize:'vertical'}} value={f.param} onChange={set('param')} placeholder="설정값, 조건, LOT번호 등"/></FL>
      <FL label="비고"><input style={inp} value={f.note} onChange={set('note')}/></FL>
      <div className="flex gap-2 pt-2"><SBtn onClick={()=>f.step&&f.operator&&onSave(f)}>{initial.step?'수정 저장':'기록 추가'}</SBtn><SBtn onClick={onCancel} secondary>취소</SBtn></div>
    </div>
  )
}

/* ─── 공정 검사 ─── */
function InspectView({inspect,setInspect,wo}){
  const[modal,setModal]=useState(null);const[edit,setEdit]=useState(null)
  const statusOpts=['검사중','합격','조건부','불합격']
  const del=id=>{if(window.confirm('삭제하시겠습니까?'))setInspect(p=>p.filter(x=>x.id!==id))}
  const save=f=>{if(edit){setInspect(p=>p.map(x=>x.id===edit.id?{...x,...f}:x));setEdit(null)}else{setInspect(p=>[...p,{id:nid('IPC'),date:new Date().toISOString().slice(0,10),...f}])};setModal(null)}
  return(
    <div>
      <SectionTitle breadcrumb="공정 검사 (IPC)">공정 검사</SectionTitle>
      <Card>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{color:'var(--ink-faint)'}}>공정검사 결과 (ISO 13485 §8.2.6) — {inspect.length}건</span>
          <button onClick={()=>{setEdit(null);setModal('form')}} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium" style={{background:'var(--moss)',color:'var(--bg)'}}><Plus size={13}/> 검사 등록</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['검사ID','WO','검사단계','검사일','검사자','규격','측정값','결과','작업'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>{inspect.length===0?<EmptyRow/>:inspect.map(i=>(
      <tr key={i.id}>
                <TD mono color="var(--moss)">{i.id}</TD>
                <TD mono muted>{i.wo}</TD>
                <TD>{i.step}</TD>
                <TD mono muted>{i.date}</TD>
                <TD>{i.inspector}</TD>
                <TD muted>{i.spec}</TD>
                <TD mono muted>{i.measured}</TD>
                <TD><StatusSelect value={i.status} options={statusOpts} onChange={v=>setInspect(p=>p.map(x=>x.id===i.id?{...x,status:v,result:v}:x))}/></TD>
                <TD><div className="flex gap-1"><ActBtn label="수정" onClick={()=>{setEdit(i);setModal('form')}}/><ActBtn label="삭제" color="red" onClick={()=>del(i.id)}/></div></TD>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
      {modal==='form'&&<Modal title={edit?'검사 수정':'공정 검사 등록'} onClose={()=>{setModal(null);setEdit(null)}}><InspectForm initial={edit||{}} wo={wo} onSave={save} onCancel={()=>{setModal(null);setEdit(null)}} statusOpts={statusOpts}/></Modal>}
    </div>
  )
}
function InspectForm({initial,wo,onSave,onCancel,statusOpts}){
  const[f,sf]=useState({wo:'',step:'',inspector:'',spec:'',measured:'',status:'합격',...initial})
  const set=k=>e=>sf(p=>({...p,[k]:e.target.value}))
  return(
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FL label="WO 번호"><select style={sel} value={f.wo} onChange={set('wo')}><option value="">직접 입력</option>{wo.map(w=><option key={w.id} value={w.id}>{w.id}</option>)}</select></FL>
        <FL label="검사 단계 *"><input style={inp} value={f.step} onChange={set('step')} placeholder="예) CNC 선삭 후 검사"/></FL>
        <FL label="검사자 *"><input style={inp} value={f.inspector} onChange={set('inspector')}/></FL>
        <FL label="결과"><select style={sel} value={f.status} onChange={set('status')}>{statusOpts.map(o=><option key={o}>{o}</option>)}</select></FL>
      </div>
      <FL label="검사 규격"><input style={inp} value={f.spec} onChange={set('spec')} placeholder="예) φ3.5mm ±0.02"/></FL>
      <FL label="측정값"><input style={inp} value={f.measured} onChange={set('measured')} placeholder="실제 측정값 입력"/></FL>
      <div className="flex gap-2 pt-2"><SBtn onClick={()=>f.step&&f.inspector&&onSave(f)}>{initial.step?'수정 저장':'등록'}</SBtn><SBtn onClick={onCancel} secondary>취소</SBtn></div>
    </div>
  )
}

/* ─── 부적합 관리 (NCR) ─── */
function NcrView({ncr,setNcr,wo,openId}){
  const[modal,setModal]=useState(null);const[edit,setEdit]=useState(null)
  useEffect(() => {
    if (openId) { const item = ncr.find(x => x.id === openId); if (item) { setEdit(item); setModal('form') } }
  }, [openId])
  const statusOpts=['접수','조치중','검토중','CAPA연동','종결']
  const del=id=>{if(window.confirm('삭제하시겠습니까?'))setNcr(p=>p.filter(x=>x.id!==id))}
  const save=f=>{if(edit){setNcr(p=>p.map(x=>x.id===edit.id?{...x,...f}:x));setEdit(null)}else{setNcr(p=>[...p,{id:nid('NC'),date:new Date().toISOString().slice(0,10),...f}])};setModal(null)}
  const open=ncr.filter(n=>n.status!=='종결')
  return(
    <div>
      <SectionTitle breadcrumb="부적합 관리 (NCR)">부적합 관리 (NCR)</SectionTitle>
      {open.length>0&&<div className="mb-4 p-3 rounded-lg flex items-start gap-2" style={{background:'var(--rust-soft)',border:'1px solid var(--rust)'}}><AlertTriangle size={14} style={{color:'var(--rust)',marginTop:2}}/><span className="text-[12.5px]" style={{color:'var(--rust)'}}><b>미결 부적합 {open.length}건</b> — 조치 완료 후 종결 처리 요망 (ISO 13485 §8.3)</span></div>}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{color:'var(--ink-faint)'}}>부적합 목록 — {ncr.length}건</span>
          <button onClick={()=>{setEdit(null);setModal('form')}} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium" style={{background:'var(--rust)',color:'white'}}><Plus size={13}/> 부적합 발행</button>
        </div>
        <div className="space-y-3">
          {ncr.length===0?<EmptyCard/>:ncr.map(n=>(
      <div key={n.id} className="p-3 rounded-xl" style={{border:`1px solid ${n.status!=='종결'?'var(--rust)':'var(--line)'}`,background:'var(--bg)'}}>
              <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[12px] font-bold" style={{color:'var(--rust)'}}>{n.id}</span>
                  <span className="text-[11px]" style={{color:'var(--ink-faint)'}}>{n.date}</span>
                  <Badge text={n.wo} tone="gray"/>
                  <Badge text={n.severity} tone={n.severity==='심각'?'red':n.severity==='중요'?'amber':'gray'}/>
                </div>
                <div className="flex items-center gap-2">
                  <StatusSelect value={n.status} options={statusOpts} onChange={v=>setNcr(p=>p.map(x=>x.id===n.id?{...x,status:v}:x))}/>
                  <ActBtn label="수정" onClick={()=>{setEdit(n);setModal('form')}}/>
                  <ActBtn label="삭제" color="red" onClick={()=>del(n.id)}/>
                </div>
              </div>
              <div className="text-[13px]" style={{color:'var(--ink)'}}>{n.desc}</div>
              <div className="mt-1.5 flex gap-3 text-[11.5px]" style={{color:'var(--ink-mute)'}}>
                <span>공정: {n.step}</span>
                <span>처리: <b>{n.disposition}</b></span>
                {n.capaNo&&n.capaNo!=='—'&&<span>CAPA: <span className="font-mono" style={{color:'var(--moss)'}}>{n.capaNo}</span></span>}
              </div>
            </div>
          ))}
        </div>
      </Card>
      {modal==='form'&&<Modal title={edit?'NCR 수정':'부적합 발행'} onClose={()=>{setModal(null);setEdit(null)}}><NcrForm initial={edit||{}} wo={wo} onSave={save} onCancel={()=>{setModal(null);setEdit(null)}} statusOpts={statusOpts}/></Modal>}
    </div>
  )
}
function NcrForm({initial,wo,onSave,onCancel,statusOpts}){
  const[f,sf]=useState({wo:'',step:'',desc:'',severity:'경미',disposition:'재처리',capaNo:'',status:'접수',...initial})
  const set=k=>e=>sf(p=>({...p,[k]:e.target.value}))
  return(
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FL label="연관 WO"><select style={sel} value={f.wo} onChange={set('wo')}><option value="">직접 입력</option>{wo.map(w=><option key={w.id} value={w.id}>{w.id} — {w.product}</option>)}</select></FL>
        <FL label="발생 공정 단계"><input style={inp} value={f.step} onChange={set('step')} placeholder="예) 표면처리 후 외관"/></FL>
        <FL label="심각도"><select style={sel} value={f.severity} onChange={set('severity')}>{['경미','중요','심각'].map(o=><option key={o}>{o}</option>)}</select></FL>
        <FL label="처리 방법"><select style={sel} value={f.disposition} onChange={set('disposition')}>{['재처리','폐기','특채사용','반품'].map(o=><option key={o}>{o}</option>)}</select></FL>
        <FL label="CAPA 번호"><input style={inp} value={f.capaNo} onChange={set('capaNo')} placeholder="CA-XXXX-XXX (없으면 공란)"/></FL>
        <FL label="상태"><select style={sel} value={f.status} onChange={set('status')}>{statusOpts.map(o=><option key={o}>{o}</option>)}</select></FL>
      </div>
      <FL label="부적합 내용 *"><textarea style={{...inp,minHeight:'72px',resize:'vertical'}} value={f.desc} onChange={set('desc')} placeholder="부적합 상세 내용을 기입하세요"/></FL>
      <div className="flex gap-2 pt-2"><SBtn onClick={()=>f.desc&&onSave(f)}>{initial.desc?'수정 저장':'발행'}</SBtn><SBtn onClick={onCancel} secondary>취소</SBtn></div>
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
function MfgHome({wo,ncr,inspect,proc,onNavigate}){
  const inProg=wo.filter(w=>w.status==='진행중').length
  const openNcr=ncr.filter(n=>n.status!=='종결').length
  const CARDS=[
    {id:'wo',icon:ClipboardList,label:'작업지시 (WO)',desc:'WO 발행 · 진행률 · 공정단계 관리',count:`${inProg}건 진행중`,warn:false},
    {id:'proc',icon:FileText,label:'공정 기록',desc:'배치 레코드 · 공정 파라미터 기록',count:`${proc.length}건`},
    {id:'inspect',icon:Activity,label:'공정 검사 (IPC)',desc:'공정검사 규격 vs 측정값',count:`${inspect.filter(i=>i.status==='조건부'||i.status==='불합격').length}건 주의`,warn:inspect.filter(i=>i.status==='조건부'||i.status==='불합격').length>0},
    {id:'ncr',icon:AlertTriangle,label:'부적합 관리 (NCR)',desc:'발생 부적합 · 처리방법 · CAPA 연동',count:`${openNcr}건 미결`,warn:openNcr>0},
    {id:'perf',icon:Cog,label:'생산 실적',desc:'WO 현황 · 진행률 통계',count:`${wo.length}건`},
  ]
  const summary=[
    {label:'진행중 WO',value:`${inProg}건`,warn:false,sub:'현재 생산 중'},
    {label:'미결 NCR',value:`${openNcr}건`,warn:openNcr>0,sub:'조치 필요'},
    {label:'공정 기록',value:`${proc.length}건`,warn:false,sub:'배치 레코드'},
    {label:'공정 검사',value:`${inspect.length}건`,warn:false,sub:`합격 ${inspect.filter(i=>i.status==='합격').length}건`},
  ]
  return(
    <div>
      <div className="mb-5">
        <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{color:'var(--moss)'}}>MFG · ISO 13485 §7.5</span>
        <div className="text-[26px] mt-1 font-semibold" style={{color:'var(--ink)'}}>생산</div>
        <div className="text-[12.5px] mt-0.5" style={{color:'var(--ink-mute)'}}>작업지시 · 공정기록 · 검사 · 부적합 관리</div>
      </div>
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
  const[inspect,setInspect]=useLS('qms_mfg_inspect',INIT_INSPECT)
  const[ncr,setNcr]=useLS('qms_mfg_ncr',INIT_NCR)
  const tabLabels={wo:'작업지시(WO)',proc:'공정기록',inspect:'공정검사',ncr:'부적합(NCR)',perf:'생산실적'}
  const viewMap={
    home:<MfgHome wo={wo} ncr={ncr} inspect={inspect} proc={proc} onNavigate={setView}/>,
    wo:<WoView wo={wo} setWo={setWo} openId={editId}/>,
    proc:<ProcRecView proc={proc} setProc={setProc} wo={wo}/>,
    inspect:<InspectView inspect={inspect} setInspect={setInspect} wo={wo}/>,
    ncr:<NcrView ncr={ncr} setNcr={setNcr} wo={wo} openId={editId}/>,
    perf:<PerfView wo={wo}/>,
  }
  return(
    <AppLayout user={user} title="생산" subtitle="작업지시 · 공정기록 · 검사 · 부적합 관리">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto">
        {view!=='home'&&<button onClick={()=>setView('home')} className="flex items-center gap-1.5 mb-5 text-[13px]" style={{color:'var(--moss)'}}><ArrowLeft size={14}/> 생산 홈</button>}
        {view!=='home'&&<div className="flex gap-1 flex-wrap mb-5">{Object.entries(tabLabels).map(([id,label])=><button key={id} onClick={()=>setView(id)} className="text-[12px] px-3 py-1.5 rounded-lg border transition" style={{background:view===id?'var(--moss)':'var(--bg-card)',color:view===id?'var(--bg)':'var(--ink-mute)',borderColor:view===id?'var(--moss)':'var(--line)'}}>{label}</button>)}</div>}
        {viewMap[view]||viewMap.home}
      </div>
    </AppLayout>
  )
}
