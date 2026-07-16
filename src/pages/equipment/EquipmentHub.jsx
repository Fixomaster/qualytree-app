import React, { useState } from 'react'
import { Wrench, Calendar, AlertTriangle, ArrowLeft, Plus, X, Clock, Activity } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'

function useLS(key,init){const[v,setV]=useState(()=>{try{return JSON.parse(localStorage.getItem(key))??init}catch{return init}});const set=(u)=>{const n=typeof u==='function'?u(v):u;localStorage.setItem(key,JSON.stringify(n));setV(n)};return[v,set]}
const nid=(p)=>`${p}-${new Date().toISOString().slice(2,4)}${String(new Date().getMonth()+1).padStart(2,'0')}-${String(Date.now()).slice(-3)}`
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
function Modal({title,onClose,children}){return <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.45)'}} onClick={e=>e.target===e.currentTarget&&onClose()}><div className="rounded-2xl p-6 w-full max-w-lg max-h-[92vh] overflow-y-auto" style={{background:'var(--bg-card)',boxShadow:'0 24px 64px rgba(0,0,0,0.18)',border:'1px solid var(--line)'}}><div className="flex items-center justify-between mb-5"><h3 className="text-[17px] font-semibold" style={{color:'var(--ink)'}}>{title}</h3><button onClick={onClose} style={{color:'var(--ink-faint)'}}><X size={18}/></button></div>{children}</div></div>}

/* ─── 초기 데이터 ─── */
const INIT_INSTR=[
  {id:'EQP-M-001',name:'버니어 캘리퍼스 150mm',model:'Mitutoyo 530-312',serial:'M-2019-0012',range:'0-150mm / 0.02mm',lastCalib:'24-01-15',nextCalib:'25-01-15',interval:'12개월',status:'사용가능',location:'검사실 A',calibBody:'한국교정연구원'},
  {id:'EQP-M-002',name:'마이크로미터 0-25mm',model:'Mitutoyo 103-137',serial:'M-2020-0034',range:'0-25mm / 0.001mm',lastCalib:'24-06-01',nextCalib:'24-12-01',interval:'6개월',status:'사용가능',location:'검사실 A',calibBody:'한국교정연구원'},
  {id:'EQP-M-003',name:'표면거칠기계',model:'Mitutoyo SJ-210',serial:'SJ-2021-0005',range:'Ra 0.05-16μm',lastCalib:'23-12-10',nextCalib:'24-06-10',interval:'6개월',status:'교정임박',location:'검사실 B',calibBody:'KRISS'},
  {id:'EQP-M-004',name:'하중계 500N',model:'Shimadzu LC-500',serial:'LC-2018-0007',range:'0-500N / 0.1N',lastCalib:'24-03-22',nextCalib:'25-03-22',interval:'12개월',status:'사용가능',location:'시험실',calibBody:'한국계량기술연구원'},
  {id:'EQP-M-005',name:'온습도계',model:'Testo 635-2',serial:'TE-2022-0018',range:'-20~70°C / 0-100%RH',lastCalib:'24-02-05',nextCalib:'24-08-05',interval:'6개월',status:'사용가능',location:'창고 A',calibBody:'한국교정연구원'},
  {id:'EQP-P-001',name:'CNC 선반 #1',model:'DOOSAN PUMA 2100',serial:'CNC-2020-001',range:'최대 φ350mm',lastCalib:'—',nextCalib:'—',interval:'PM 관리',status:'사용가능',location:'1공정',calibBody:'내부PM'},
  {id:'EQP-P-002',name:'3축 CMM',model:'Zeiss Contura G2',serial:'CMM-2021-001',range:'600×400×400mm',lastCalib:'24-01-10',nextCalib:'24-07-01',interval:'6개월',status:'교정임박',location:'검사실 A',calibBody:'KRISS'},
  {id:'EQP-P-003',name:'초음파 세척기',model:'Power Sonic 410',serial:'UC-2019-003',range:'40kHz / 70W',lastCalib:'—',nextCalib:'—',interval:'PM 관리',status:'사용가능',location:'세척실',calibBody:'내부PM'},
]
const INIT_HIST=[
  {id:'EH-2406-012',eqp:'EQP-P-001',name:'CNC 선반 #1',date:'24-06-15',type:'PM',desc:'주기 예방보전 — 오일 교환, 필터 청소, 척 점검',technician:'이기술',result:'정상',next:'24-09-15'},
  {id:'EH-2406-011',eqp:'EQP-M-003',name:'표면거칠기계',date:'24-06-10',type:'수리',desc:'탐침 교체 — 마모로 인한 측정 오차 발생',technician:'제조사 A/S',result:'정상복구',next:'교정 의뢰 예정'},
  {id:'EH-2405-008',eqp:'EQP-P-001',name:'CNC 선반 #1',date:'24-05-20',type:'PM',desc:'월간 점검 — 이상 없음',technician:'이기술',result:'정상',next:'24-06-20'},
  {id:'EH-2405-006',eqp:'EQP-M-002',name:'마이크로미터',date:'24-06-01',type:'교정',desc:'정기교정 (6개월)',technician:'한국교정연구원',result:'합격 (성적서 CAL-2406-002)',next:'24-12-01'},
]

/* ─── 측정기기 목록 ─── */
function InstrumentsView({instruments,setInstruments}){
  const[modal,setModal]=useState(null);const[edit,setEdit]=useState(null)
  const statusOpts=['사용가능','교정임박','교정중','사용제한','폐기']
  const del=id=>{if(window.confirm('삭제하시겠습니까?'))setInstruments(p=>p.filter(x=>x.id!==id))}
  const save=f=>{if(edit){setInstruments(p=>p.map(x=>x.id===edit.id?{...x,...f}:x));setEdit(null)}else{setInstruments(p=>[...p,{id:nid('EQP'),...f}])};setModal(null)}
  const urgent=instruments.filter(i=>i.status==='교정임박'||i.status==='교정중')
  return(
    <div>
      <SectionTitle breadcrumb="측정기기 목록">측정기기 목록</SectionTitle>
      {urgent.length>0&&<div className="mb-4 p-3 rounded-lg flex items-start gap-2" style={{background:'var(--rust-soft)',border:'1px solid var(--rust)'}}><AlertTriangle size={14} style={{color:'var(--rust)',marginTop:2}}/><span className="text-[12.5px]" style={{color:'var(--rust)'}}><b>교정 필요 {urgent.length}건</b> — {urgent.map(i=>i.name).join(', ')} (ISO 13485 §7.6)</span></div>}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{color:'var(--ink-faint)'}}>측정기기 목록 (ISO 13485 §7.6) — {instruments.length}개</span>
          <button onClick={()=>{setEdit(null);setModal('form')}} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium" style={{background:'var(--moss)',color:'var(--bg)'}}><Plus size={13}/> 기기 등록</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['기기ID','기기명','모델','S/N','범위','최근교정','차기교정','주기','위치','기관','상태','작업'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>{instruments.map(i=>(
              <tr key={i.id}>
                <TD mono color="var(--moss)">{i.id}</TD>
                <TD><span className="font-medium">{i.name}</span></TD>
                <TD muted>{i.model}</TD>
                <TD mono muted>{i.serial}</TD>
                <TD muted>{i.range}</TD>
                <TD mono muted>{i.lastCalib}</TD>
                <TD mono color={i.status==='교정임박'?'var(--rust)':undefined}>{i.nextCalib}</TD>
                <TD muted>{i.interval}</TD>
                <TD muted>{i.location}</TD>
                <TD muted>{i.calibBody}</TD>
                <TD><StatusSelect value={i.status} options={statusOpts} onChange={v=>setInstruments(p=>p.map(x=>x.id===i.id?{...x,status:v}:x))}/></TD>
                <TD><div className="flex gap-1"><ActBtn label="수정" onClick={()=>{setEdit(i);setModal('form')}}/><ActBtn label="삭제" color="red" onClick={()=>del(i.id)}/></div></TD>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
      {modal==='form'&&<Modal title={edit?'기기 수정':'기기 등록'} onClose={()=>{setModal(null);setEdit(null)}}><InstrForm initial={edit||{}} onSave={save} onCancel={()=>{setModal(null);setEdit(null)}} statusOpts={statusOpts}/></Modal>}
    </div>
  )
}
function InstrForm({initial,onSave,onCancel,statusOpts}){
  const[f,sf]=useState({name:'',model:'',serial:'',range:'',lastCalib:'',nextCalib:'',interval:'12개월',location:'',calibBody:'한국교정연구원',status:'사용가능',...initial})
  const set=k=>e=>sf(p=>({...p,[k]:e.target.value}))
  return(
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FL label="기기명 *"><input style={inp} value={f.name} onChange={set('name')} placeholder="예) 버니어 캘리퍼스"/></FL>
        <FL label="모델명"><input style={inp} value={f.model} onChange={set('model')}/></FL>
        <FL label="시리얼 번호"><input style={inp} value={f.serial} onChange={set('serial')}/></FL>
        <FL label="측정 범위"><input style={inp} value={f.range} onChange={set('range')} placeholder="예) 0-150mm / 0.02mm"/></FL>
        <FL label="최근 교정일"><input style={inp} type="date" value={f.lastCalib} onChange={set('lastCalib')}/></FL>
        <FL label="차기 교정일"><input style={inp} type="date" value={f.nextCalib} onChange={set('nextCalib')}/></FL>
        <FL label="교정 주기"><select style={sel} value={f.interval} onChange={set('interval')}>{['3개월','6개월','12개월','PM 관리','해당없음'].map(o=><option key={o}>{o}</option>)}</select></FL>
        <FL label="보관 위치"><input style={inp} value={f.location} onChange={set('location')}/></FL>
        <FL label="교정 기관"><input style={inp} value={f.calibBody} onChange={set('calibBody')} placeholder="예) 한국교정연구원, KRISS"/></FL>
        <FL label="상태"><select style={sel} value={f.status} onChange={set('status')}>{statusOpts.map(o=><option key={o}>{o}</option>)}</select></FL>
      </div>
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
    if(f.type==='교정'&&f.eqp){
      const instr=instruments.find(i=>i.id===f.eqp)
      if(instr&&f.next){
        // nextCalib 업데이트
      }
    }
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
          {history.map(h=>(
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
      <div className="flex gap-2 pt-2"><SBtn onClick={()=>f.eqp&&f.desc&&f.technician&&onSave(f)}>{initial.eqp?'수정 저장':'추가'}</SBtn><SBtn onClick={onCancel} secondary>취소</SBtn></div>
    </div>
  )
}

/* ─── 교정 일정 ─── */
function ScheduleView({instruments,setInstruments}){
  const calibItems=instruments.filter(i=>i.interval!=='PM 관리'&&i.interval!=='해당없음')
  const sorted=[...calibItems].sort((a,b)=>a.nextCalib.localeCompare(b.nextCalib))
  const today=new Date().toISOString().slice(0,10)
  const getDday=(d)=>{if(!d||d==='—')return'—';const diff=Math.ceil((new Date(d)-new Date(today))/(1000*60*60*24));if(diff<0)return`D+${Math.abs(diff)} 초과`;if(diff===0)return'오늘';return`D-${diff}`}
  const getTone=(d)=>{if(!d||d==='—')return'gray';const diff=Math.ceil((new Date(d)-new Date(today))/(1000*60*60*24));if(diff<0)return'red';if(diff<=30)return'amber';return'green'}
  const urgent=sorted.filter(i=>{const d=new Date(i.nextCalib)-new Date(today);return d/(1000*60*60*24)<0})
  const soon=sorted.filter(i=>{const d=new Date(i.nextCalib)-new Date(today);return d>=0&&d/(1000*60*60*24)<=30})
  return(
    <div>
      <SectionTitle breadcrumb="교정 일정">교정 일정 관리</SectionTitle>
      {urgent.length>0&&<div className="mb-3 p-3 rounded-lg flex items-start gap-2" style={{background:'var(--rust-soft)',border:'1px solid var(--rust)'}}><AlertTriangle size={14} style={{color:'var(--rust)',marginTop:2}}/><span className="text-[12.5px]" style={{color:'var(--rust)'}}><b>교정 기한 초과 {urgent.length}건</b> — {urgent.map(i=>i.name).join(', ')} — 즉시 교정 의뢰 필요</span></div>}
      {soon.length>0&&<div className="mb-4 p-3 rounded-lg flex items-start gap-2" style={{background:'#fff7ed',border:'1px solid #b45309'}}><Clock size={14} style={{color:'#b45309',marginTop:2}}/><span className="text-[12.5px]" style={{color:'#b45309'}}><b>30일 내 교정 필요 {soon.length}건</b> — 교정 기관 예약 진행</span></div>}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{color:'var(--ink-faint)'}}>교정 일정 (ISO 13485 §7.6) — {calibItems.length}개 기기</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['기기ID','기기명','차기 교정일','D-day','교정 기관','주기','현재 상태','상태 변경'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>{sorted.map(i=>{
              const dd=getDday(i.nextCalib)
              const tone=getTone(i.nextCalib)
              return(
                <tr key={i.id}>
                  <TD mono color="var(--moss)">{i.id}</TD>
                  <TD><span className="font-medium">{i.name}</span></TD>
                  <TD mono muted>{i.nextCalib}</TD>
                  <TD><Badge text={dd} tone={tone}/></TD>
                  <TD muted>{i.calibBody}</TD>
                  <TD muted>{i.interval}</TD>
                  <TD><Badge text={i.status} tone={i.status==='교정임박'?'amber':i.status==='사용가능'?'green':'red'}/></TD>
                  <TD>
                    <div className="flex gap-1 flex-wrap">
                      <ActBtn label="교정완료" color="green" onClick={()=>{
                        const next=prompt('차기 교정일을 입력하세요 (YYYY-MM-DD):')
                        if(next)setInstruments(p=>p.map(x=>x.id===i.id?{...x,lastCalib:new Date().toISOString().slice(0,10),nextCalib:next,status:'사용가능'}:x))
                      }}/>
                      <ActBtn label="교정중" onClick={()=>setInstruments(p=>p.map(x=>x.id===i.id?{...x,status:'교정중'}:x))}/>
                    </div>
                  </TD>
                </tr>
              )
            })}</tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

/* ─── 설비 홈 ─── */
function EqpHome({instruments,history,onNavigate}){
  const urgent=instruments.filter(i=>i.status==='교정임박').length
  const broken=instruments.filter(i=>i.status==='사용제한').length
  const CARDS=[
    {id:'instruments',icon:Wrench,label:'측정기기 목록',desc:'기기 등록 · 교정 주기 · S/N 관리',count:`${instruments.length}개`,warn:urgent>0||broken>0},
    {id:'history',icon:Activity,label:'이력 관리',desc:'PM · 교정 · 수리 이력 기록',count:`${history.length}건`},
    {id:'schedule',icon:Calendar,label:'교정 일정',desc:'D-day 관리 · 기관 예약 · 초과 경보',count:`${urgent}건 임박`,warn:urgent>0},
  ]
  const summary=[
    {label:'전체 기기',value:`${instruments.length}개`,warn:false,sub:'등록 기기 수'},
    {label:'교정 임박',value:`${urgent}개`,warn:urgent>0,sub:'30일 이내'},
    {label:'사용 제한',value:`${broken}개`,warn:broken>0,sub:'점검 필요'},
    {label:'이력 기록',value:`${history.length}건`,warn:false,sub:'PM+교정+수리'},
  ]
  return(
    <div>
      <div className="mb-5">
        <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{color:'var(--moss)'}}>EQP · ISO 13485 §7.6</span>
        <div className="text-[26px] mt-1 font-semibold" style={{color:'var(--ink)'}}>설비·교정</div>
        <div className="text-[12.5px] mt-0.5" style={{color:'var(--ink-mute)'}}>측정기기 관리 · 교정 일정 · PM 이력</div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {summary.map(s=>(
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

export default function EquipmentHub(){
  const user=auth.current();const[view,setView]=useState('home')
  const[instruments,setInstruments]=useLS('qms_eqp_instruments',INIT_INSTR)
  const[history,setHistory]=useLS('qms_eqp_history',INIT_HIST)
  const tabLabels={instruments:'측정기기',history:'이력관리',schedule:'교정일정'}
  const viewMap={
    home:<EqpHome instruments={instruments} history={history} onNavigate={setView}/>,
    instruments:<InstrumentsView instruments={instruments} setInstruments={setInstruments}/>,
    history:<HistoryView history={history} setHistory={setHistory} instruments={instruments}/>,
    schedule:<ScheduleView instruments={instruments} setInstruments={setInstruments}/>,
  }
  return(
    <AppLayout user={user} title="설비·교정" subtitle="측정기기 관리 · 교정 일정 · PM 이력">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto">
        {view!=='home'&&<button onClick={()=>setView('home')} className="flex items-center gap-1.5 mb-5 text-[13px]" style={{color:'var(--moss)'}}><ArrowLeft size={14}/> 설비·교정 홈</button>}
        {view!=='home'&&<div className="flex gap-1 flex-wrap mb-5">{Object.entries(tabLabels).map(([id,label])=><button key={id} onClick={()=>setView(id)} className="text-[12px] px-3 py-1.5 rounded-lg border transition" style={{background:view===id?'var(--moss)':'var(--bg-card)',color:view===id?'var(--bg)':'var(--ink-mute)',borderColor:view===id?'var(--moss)':'var(--line)'}}>{label}</button>)}</div>}
        {viewMap[view]||viewMap.home}
      </div>
    </AppLayout>
  )
}
