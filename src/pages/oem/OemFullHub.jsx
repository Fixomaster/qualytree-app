// src/pages/oem/OemFullHub.jsx
import React, { useState, useCallback, useMemo } from 'react'
import { Building2, FileText, Shield, ClipboardList, CheckCircle2, Plus, Trash2, AlertTriangle, Edit2, X, Calendar, CheckCircle, Circle } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'

const LS_KEY = 'qualytree.oem_full'
const EMPTY_CONTRACTOR = { id:'', name:'', bizNo:'', ceo:'', phone:'', address:'', startDate:'', status:'active', note:'' }
const EMPTY_CONTRACT = { id:'', contractorId:'', title:'', signDate:'', expiryDate:'', type:'oem', fileRef:'', note:'' }
const EMPTY_QA = { id:'', contractorId:'', version:'', effDate:'', qcStd:'', inspMethod:'', defectAction:'', note:'' }
const EMPTY_AUDIT = { id:'', contractorId:'', planDate:'', actualDate:'', auditor:'', result:'planned', findings:'', note:'' }

function loadData() {
  try { const r=localStorage.getItem(LS_KEY); return r?JSON.parse(r):{contractors:[],contracts:[],qualityAgreements:[],audits:[]} }
  catch { return {contractors:[],contracts:[],qualityAgreements:[],audits:[]} }
}
function saveData(d) { try { localStorage.setItem(LS_KEY,JSON.stringify(d)) } catch {} }
const uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,5)
const ACCENT = '#EA580C'
const ACCENT_SOFT = '#FFF7ED'

const TABS = [
  {id:'overview',label:'개요',Icon:Building2},
  {id:'contractors',label:'수탁사 관리',Icon:ClipboardList},
  {id:'contracts',label:'계약서',Icon:FileText},
  {id:'quality',label:'품질 협약',Icon:Shield},
  {id:'audit',label:'감사 일정',Icon:CheckCircle2},
]
export default function OemFullHub() {
  const [data,setData] = useState(loadData)
  const [tab,setTab] = useState('overview')
  const today = new Date().toISOString().slice(0,10)
  const update = useCallback((patch) => {
    setData(prev => { const next={...prev,...patch}; saveData(next); return next })
  }, [])
  const stats = useMemo(() => ({
    active: data.contractors.filter(c=>c.status==='active').length,
    expiring: data.contracts.filter(c=>{ if(!c.expiryDate) return false; const d=(new Date(c.expiryDate)-new Date(today))/86400000; return d>=0&&d<=90 }).length,
    auditDue: data.audits.filter(a=>a.result==='planned'&&a.planDate&&a.planDate<=today).length,
    qaCount: data.qualityAgreements.length,
  }), [data, today])
  return (
    <AppLayout>
      <HubBanner icon={Building2} title="OEM 전공정위탁 관리" subtitle="OEM 수탁사 계약데교질협약감사 통합 관리 (의료기기법 §14)" color={ACCENT} />
      <div style={{display:'flex',gap:2,padding:'0 24px',borderBottom:'1px solid var(--border)',background:'var(--bg)'}}>
        {TABS.map(({id,label,Icon}) => {
          const active=tab===id
          return <button key={id} onClick={()=>setTab(id)} style={{display:'flex',alignItems:'center',gap:6,padding:'10px 14px',background:'transparent',border:'none',borderBottom:active?'2px solid '+ACCENT:'2px solid transparent',color:active?ACCENT:'var(--ink-muted)',fontWeight:active?600:400,fontSize:13,cursor:'pointer'}}><Icon size={14} strokeWidth={1.7}/>{label}</button>
        })}
      </div>
      <div style={{padding:'24px 24px 60px'}}>
        {tab==='overview' && <OverviewTab stats={stats} data={data} today={today}/>}
        {tab==='contractors' && <ContractorsTab data={data} update={update}/>}
        {tab==='contracts' && <ContractsTab data={data} update={update} today={today}/>}
        {tab==='quality' && <QualityTab data={data} update={update}/>}
        {tab==='audit' && <AuditTab data={data} update={update} today={today}/>}
      </div>
    </AppLayout>
  )
}
function OverviewTab({stats,data,today}) {
  const cards = [
    {label:'활성 수탁사',value:stats.active,unit:'개사',color:ACCENT,Icon:Building2},
    {label:'계약 만료 임박(90일)',value:stats.expiring,unit:'건',color:stats.expiring>0?'#DC2626':'#16A34A',Icon:Calendar},
    {label:'감사 지연',value:stats.auditDue,unit:'건',color:stats.auditDue>0?'#D97706':'#16A34A',Icon:ClipboardList},
    {label:'품질 협약',value:stats.qaCount,unit:'건',color:'#7C3AED',Icon:Shield},
  ]
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:32}}>
        {cards.map(({label,value,unit,color,Icon}) => (
          <div key={label} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:'20px 24px'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}><Icon size={16} color={color} strokeWidth={1.7}/><span style={{fontSize:12,color:'var(--ink-muted)'}}>{label}</span></div>
            <span style={{fontSize:28,fontWeight:700,color}}>{value}</span><span style={{fontSize:13,color:'var(--ink-muted)',marginLeft:4}}>{unit}</span>
          </div>
        ))}
      </div>
      <SectionBox title="OEM 전공정위탁 관리 요건">
        {[
          {done:data.contractors.length>0,text:'수탁사 등록 및 관리'},
          {done:data.contracts.length>0,text:'OEM 제조 계약서 체결 및 보관'},
          {done:data.qualityAgreements.length>0,text:'품질 협약서 체결'},
          {done:data.audits.some(a=>a.result!=='planned'),text:'수탁사 정기 감사 이력 보유'},
        ].map(({done,text}) => (
          <div key={text} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid var(--border-soft)'}}>
            {done?<CheckCircle size={18} color="#16A34A" strokeWidth={1.7}/>:<Circle size={18} color="var(--ink-muted)" strokeWidth={1.7}/>}
            <span style={{fontSize:14,color:done?'var(--ink)':'var(--ink-muted)'}}>{text}</span>
          </div>
        ))}
      </SectionBox>
      {data.contractors.length>0&&(
        <SectionBox title="수탁사 목록 (요약)">
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead><tr style={{borderBottom:'2px solid var(--border)'}}>{['수탁사명','사업자번호','대표자','연락처','상태'].map(h=><th key={h} style={{textAlign:'left',padding:'8px 12px',color:'var(--ink-muted)',fontWeight:600}}>{h}</th>)}</tr></thead>
            <tbody>{data.contractors.map(c=><tr key={c.id} style={{borderBottom:'1px solid var(--border-soft)'}}><td style={{padding:'10px 12px',fontWeight:500}}>{c.name}</td><td style={{padding:'10px 12px',color:'var(--ink-muted)'}}>{c.bizNo}</td><td style={{padding:'10px 12px'}}>{c.ceo}</td><td style={{padding:'10px 12px',color:'var(--ink-muted)'}}>{c.phone}</td><td style={{padding:'10px 12px'}}><StatusBadge status={c.status}/></td></tr>)}</tbody>
          </table>
        </SectionBox>
      )}
    </div>
  )
}
function ContractorsTab({data,update}) {
  const [form,setForm]=useState(null)
  const open=(item=null)=>setForm(item?{...item}:{...EMPTY_CONTRACTOR,id:uid(),_isNew:true})
  const save=()=>{
    if(!form.name.trim()) return
    const list=form._isNew?[...data.contractors,{...form,_isNew:undefined}]:data.contractors.map(c=>c.id===form.id?{...form,_isNew:undefined}:c)
    update({contractors:list});setForm(null)
  }
  const del=id=>{if(confirm('삭제하시겠습니까?'))update({contractors:data.contractors.filter(c=>c.id!==id)})}
  return (
    <div>
      <ListHeader title="수탁사 목록" onAdd={open}/>
      {data.contractors.length===0?<Empty icon={Building2} text="등록된 수탁사가 없습니다"/>:data.contractors.map(c=>(
        <div key={c.id} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'16px 20px',marginBottom:10}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}><span style={{fontWeight:600,fontSize:15}}>{c.name}</span><StatusBadge status={c.status}/></div>
              <div style={{display:'flex',flexWrap:'wrap',gap:'4px 20px',fontSize:13,color:'var(--ink-muted)'}}>
                {c.bizNo&&<span>{c.bizNo}</span>}{c.ceo&&<span>{c.ceo}</span>}{c.phone&&<span>{c.phone}</span>}{c.startDate&&<span>위탁시작: {c.startDate}</span>}
              </div>
            </div>
            <div style={{display:'flex',gap:6}}><IconBtn onClick={()=>open(c)}><Edit2 size={14}/></IconBtn><IconBtn danger onClick={()=>del(c.id)}><Trash2 size={14}/></IconBtn></div>
          </div>
        </div>
      ))}
      {form&&(
        <Modal title={form._isNew?'수탁사 추가':'수탁사 수정'} onClose={()=>setForm(null)}>
          <Grid2>
            <Field label="수탁사명 *" value={form.name} onChange={v=>setForm(f=>({...f,name:v}))}/>
            <Field label="사업자번호" value={form.bizNo} onChange={v=>setForm(f=>({...f,bizNo:v}))} placeholder="000-00-00000"/>
            <Field label="대표자" value={form.ceo} onChange={v=>setForm(f=>({...f,ceo:v}))}/>
            <Field label="연락처" value={form.phone} onChange={v=>setForm(f=>({...f,phone:v}))}/>
            <Field label="위탁 시작일" type="date" value={form.startDate} onChange={v=>setForm(f=>({...f,startDate:v}))}/>
            <SelectField label="상태" value={form.status} onChange={v=>setForm(f=>({...f,status:v}))} options={[['active','활성'],['suspended','중단'],['terminated','해지']]}/>
          </Grid2>
          <Field label="주소" value={form.address} onChange={v=>setForm(f=>({...f,address:v}))} full/>
          <Field label="비고" value={form.note} onChange={v=>setForm(f=>({...f,note:v}))} full/>
          <ModalFooter onCancel={()=>setForm(null)} onSave={save}/>
        </Modal>
      )}
    </div>
  )
}
function ContractsTab({data,update,today}) {
  const [form,setForm]=useState(null)
  const open=(item=null)=>setForm(item?{...item}:{...EMPTY_CONTRACT,id:uid(),_isNew:true})
  const save=()=>{
    if(!form.title.trim()) return
    const list=form._isNew?[...data.contracts,{...form,_isNew:undefined}]:data.contracts.map(c=>c.id===form.id?{...form,_isNew:undefined}:c)
    update({contracts:list});setForm(null)
  }
  const del=id=>{if(confirm('삭제하시겠습니까?'))update({contracts:data.contracts.filter(c=>c.id!==id)})}
  const getDays=d=>d?Math.ceil((new Date(d)-new Date(today))/86400000):null
  return (
    <div>
      <ListHeader title="OEM 계약서 목록" onAdd={open}/>
      {data.contracts.length===0?<Empty icon={FileText} text="등록된 계약서가 없습니다"/>:data.contracts.map(c=>{
        const days=getDays(c.expiryDate);const urgent=days!==null&&days>=0&&days<=90;const expired=days!==null&&days<0
        const cname=data.contractors.find(x=>x.id===c.contractorId)?.name||'—'
        return (
          <div key={c.id} style={{background:'var(--surface)',borderRadius:10,padding:'14px 18px',marginBottom:10,border:'1px solid '+(expired?'#FCA5A5':urgent?'#FDE68A':'var(--border)')}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div>
                <div style={{fontWeight:600,fontSize:14,marginBottom:4}}>{c.title}</div>
                <div style={{fontSize:12,color:'var(--ink-muted)',display:'flex',flexWrap:'wrap',gap:'2px 16px'}}>
                  <span>수탁사: {cname}</span><span>체결: {c.signDate||'—'}</span>
                  <span style={{color:expired?'#DC2626':urgent?'#D97706':'inherit'}}>만료: {c.expiryDate||'—'}{days!==null&&' ('+(expired?'만료됨':days+'일 남음')+')'}</span>
                </div>
              </div>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                {(urgent||expired)&&<AlertTriangle size={16} color={expired?'#DC2626':'#D97706'}/>}
                <IconBtn onClick={()=>open(c)}><Edit2 size={14}/></IconBtn><IconBtn danger onClick={()=>del(c.id)}><Trash2 size={14}/></IconBtn>
              </div>
            </div>
          </div>
        )
      })}
      {form&&(
        <Modal title={form._isNew?'계약서 추가':'계약서 수정'} onClose={()=>setForm(null)}>
          <Field label="계약명 *" value={form.title} onChange={v=>setForm(f=>({...f,title:v}))} full/>
          <Grid2>
            <SelectField label="수탁사" value={form.contractorId} onChange={v=>setForm(f=>({...f,contractorId:v}))} options={data.contractors.map(c=>[c.id,c.name])} placeholder="선택"/>
            <SelectField label="계약 유형" value={form.type} onChange={v=>setForm(f=>({...f,type:v}))} options={[['oem','OEM 제조 계약'],['quality','품질 협약'],['nda','기밀유지(NDA)'],['other','기타']]}/>
            <Field label="계약 체결일" type="date" value={form.signDate} onChange={v=>setForm(f=>({...f,signDate:v}))}/>
            <Field label="계약 만료일" type="date" value={form.expiryDate} onChange={v=>setForm(f=>({...f,expiryDate:v}))}/>
          </Grid2>
          <Field label="관련 파일/문서 번호" value={form.fileRef} onChange={v=>setForm(f=>({...f,fileRef:v}))} full/>
          <Field label="비고" value={form.note} onChange={v=>setForm(f=>({...f,note:v}))} full/>
          <ModalFooter onCancel={()=>setForm(null)} onSave={save}/>
        </Modal>
      )}
    </div>
  )
}
function QualityTab({data,update}) {
  const [form,setForm]=useState(null)
  const open=(item=null)=>setForm(item?{...item}:{...EMPTY_QA,id:uid(),_isNew:true})
  const save=()=>{
    const list=form._isNew?[...data.qualityAgreements,{...form,_isNew:undefined}]:data.qualityAgreements.map(q=>q.id===form.id?{...form,_isNew:undefined}:q)
    update({qualityAgreements:list});setForm(null)
  }
  const del=id=>{if(confirm('삭제하시겠습니까?'))update({qualityAgreements:data.qualityAgreements.filter(q=>q.id!==id)})}
  return (
    <div>
      <ListHeader title="품질 협약서 목록" onAdd={open}/>
      {data.qualityAgreements.length===0?<Empty icon={Shield} text="등록된 품질 협약이 없습니다"/>:data.qualityAgreements.map(q=>{
        const cname=data.contractors.find(x=>x.id===q.contractorId)?.name||'—'
        return (
          <div key={q.id} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'16px 20px',marginBottom:10}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div>
                <div style={{fontWeight:600,marginBottom:4}}>품질 협약 v{q.version||'—'} <span style={{fontWeight:400,fontSize:12,color:'var(--ink-muted)'}}>({cname})</span></div>
                <div style={{fontSize:12,color:'var(--ink-muted)',display:'flex',gap:16}}><span>발효일: {q.effDate||'—'}</span>{q.inspMethod&&<span>검사기준: {q.inspMethod}</span>}</div>
                {q.qcStd&&<div style={{fontSize:12,marginTop:6}}>품질 기준: {q.qcStd}</div>}
              </div>
              <div style={{display:'flex',gap:6}}><IconBtn onClick={()=>open(q)}><Edit2 size={14}/></IconBtn><IconBtn danger onClick={()=>del(q.id)}><Trash2 size={14}/></IconBtn></div>
            </div>
          </div>
        )
      })}
      {form&&(
        <Modal title={form._isNew?'품질 협약 추가':'품질 협약 수정'} onClose={()=>setForm(null)}>
          <Grid2>
            <SelectField label="수탁사" value={form.contractorId} onChange={v=>setForm(f=>({...f,contractorId:v}))} options={data.contractors.map(c=>[c.id,c.name])} placeholder="선택"/>
            <Field label="버전" value={form.version} onChange={v=>setForm(f=>({...f,version:v}))} placeholder="1.0"/>
            <Field label="발효일" type="date" value={form.effDate} onChange={v=>setForm(f=>({...f,effDate:v}))}/>
            <Field label="검사 기준" value={form.inspMethod} onChange={v=>setForm(f=>({...f,inspMethod:v}))} placeholder="AQL 1.0"/>
          </Grid2>
          <Field label="품질 기준" value={form.qcStd} onChange={v=>setForm(f=>({...f,qcStd:v}))} full/>
          <Field label="불량 처리 기준" value={form.defectAction} onChange={v=>setForm(f=>({...f,defectAction:v}))} full/>
          <Field label="비고" value={form.note} onChange={v=>setForm(f=>({...f,note:v}))} full/>
          <ModalFooter onCancel={()=>setForm(null)} onSave={save}/>
        </Modal>
      )}
    </div>
  )
}
function AuditTab({data,update,today}) {
  const [form,setForm]=useState(null)
  const open=(item=null)=>setForm(item?{...item}:{...EMPTY_AUDIT,id:uid(),_isNew:true})
  const save=()=>{
    const list=form._isNew?[...data.audits,{...form,_isNew:undefined}]:data.audits.map(a=>a.id===form.id?{...form,_isNew:undefined}:a)
    update({audits:list});setForm(null)
  }
  const del=id=>{if(confirm('삭제하시겠습니까?'))update({audits:data.audits.filter(a=>a.id!==id)})}
  const RES={planned:{label:'예정',color:'#3B82F6',bg:'#EFF6FF'},pass:{label:'합격',color:'#16A34A',bg:'#F0FDF4'},conditional:{label:'조건부',color:'#D97706',bg:'#FFFBEB'},fail:{label:'불합격',color:'#DC2626',bg:'#FEF2F2'}}
  const sorted=[...data.audits].sort((a,b)=>(b.planDate||'').localeCompare(a.planDate||''))
  return (
    <div>
      <ListHeader title="수탁사 감사 이력" onAdd={open}/>
      {sorted.length===0?<Empty icon={CheckCircle2} text="등록된 감사 이력이 없습니다"/>:sorted.map(a=>{
        const cname=data.contractors.find(x=>x.id===a.contractorId)?.name||'—'
        const res=RES[a.result]||RES.planned
        const overdue=a.result==='planned'&&a.planDate&&a.planDate<today
        return (
          <div key={a.id} style={{background:'var(--surface)',borderRadius:10,padding:'14px 18px',marginBottom:10,border:'1px solid '+(overdue?'#FCA5A5':'var(--border)')}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                  <span style={{fontWeight:600,fontSize:14}}>{cname} 감사</span>
                  <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,color:res.color,background:res.bg}}>{res.label}</span>
                  {overdue&&<span style={{fontSize:11,color:'#DC2626',fontWeight:600}}>⚠ 지연</span>}
                </div>
                <div style={{fontSize:12,color:'var(--ink-muted)',display:'flex',flexWrap:'wrap',gap:'2px 16px'}}>
                  <span>예정: {a.planDate||'—'}</span>{a.actualDate&&<span>실시: {a.actualDate}</span>}{a.auditor&&<span>감사자: {a.auditor}</span>}
                </div>
                {a.findings&&<div style={{fontSize:12,marginTop:6}}>지적: {a.findings}</div>}
              </div>
              <div style={{display:'flex',gap:6}}><IconBtn onClick={()=>open(a)}><Edit2 size={14}/></IconBtn><IconBtn danger onClick={()=>del(a.id)}><Trash2 size={14}/></IconBtn></div>
            </div>
          </div>
        )
      })}
      {form&&(
        <Modal title={form._isNew?'감사 추가':'감사 수정'} onClose={()=>setForm(null)}>
          <Grid2>
            <SelectField label="수탁사" value={form.contractorId} onChange={v=>setForm(f=>({...f,contractorId:v}))} options={data.contractors.map(c=>[c.id,c.name])} placeholder="선택"/>
            <SelectField label="감사 결과" value={form.result} onChange={v=>setForm(f=>({...f,result:v}))} options={[['planned','예정'],['pass','합격'],['conditional','조건부 합격'],['fail','불합격']]}/>
            <Field label="계획일" type="date" value={form.planDate} onChange={v=>setForm(f=>({...f,planDate:v}))}/>
            <Field label="실시일" type="date" value={form.actualDate} onChange={v=>setForm(f=>({...f,actualDate:v}))}/>
            <Field label="감사자" value={form.auditor} onChange={v=>setForm(f=>({...f,auditor:v}))}/>
          </Grid2>
          <Field label="지적 사항" value={form.findings} onChange={v=>setForm(f=>({...f,findings:v}))} full/>
          <Field label="비고" value={form.note} onChange={v=>setForm(f=>({...f,note:v}))} full/>
          <ModalFooter onCancel={()=>setForm(null)} onSave={save}/>
        </Modal>
      )}
    </div>
  )
}
function SectionBox({title,children}) {
  return <div style={{marginBottom:28}}><h4 style={{fontSize:14,fontWeight:600,marginBottom:14}}>{title}</h4><div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'4px 16px'}}>{children}</div></div>
}
function ListHeader({title,onAdd}) {
  return <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}><h3 style={{fontSize:16,fontWeight:600,margin:0}}>{title}</h3><Btn onClick={onAdd}><Plus size={14}/> 추가</Btn></div>
}
function StatusBadge({status}) {
  const map={active:['활성','#16A34A','#F0FDF4'],suspended:['중단','#D97706','#FFFBEB'],terminated:['해지','#6B7280','#F3F4F6']}
  const [l,c,b]=map[status]||map.active
  return <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,color:c,background:b}}>{l}</span>
}
function Field({label,value,onChange,type='text',placeholder='',full}) {
  return <label style={{display:'flex',flexDirection:'column',gap:4,gridColumn:full?'1 / -1':undefined}}><span style={{fontSize:12,fontWeight:500}}>{label}</span><input type={type} value={value||''} placeholder={placeholder} onChange={e=>onChange(e.target.value)} style={{padding:'8px 10px',border:'1px solid var(--border)',borderRadius:6,fontSize:13,background:'var(--bg)',outline:'none'}}/></label>
}
function SelectField({label,value,onChange,options,placeholder}) {
  return <label style={{display:'flex',flexDirection:'column',gap:4}}><span style={{fontSize:12,fontWeight:500}}>{label}</span><select value={value||''} onChange={e=>onChange(e.target.value)} style={{padding:'8px 10px',border:'1px solid var(--border)',borderRadius:6,fontSize:13,background:'var(--bg)'}}>{placeholder&&<option value="">{placeholder}</option>}{options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
}
function Grid2({children}) { return <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>{children}</div> }
function Modal({title,children,onClose}) {
  return <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={e=>e.target===e.currentTarget&&onClose()}><div style={{background:'var(--bg)',borderRadius:14,width:560,maxWidth:'90vw',maxHeight:'85vh',overflowY:'auto',padding:28}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}><h3 style={{margin:0,fontSize:16,fontWeight:700}}>{title}</h3><button onClick={onClose} style={{border:'none',background:'none',cursor:'pointer'}}><X size={18}/></button></div><div style={{display:'flex',flexDirection:'column',gap:12}}>{children}</div></div></div>
}
function ModalFooter({onCancel,onSave}) {
  return <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:8,paddingTop:16,borderTop:'1px solid var(--border)'}}><button onClick={onCancel} style={{padding:'8px 20px',border:'1px solid var(--border)',borderRadius:6,background:'none',cursor:'pointer',fontSize:13}}>취소</button><button onClick={onSave} style={{padding:'8px 20px',border:'none',borderRadius:6,background:ACCENT,color:'#fff',cursor:'pointer',fontSize:13,fontWeight:600}}>저장</button></div>
}
function Btn({children,onClick}) {
  return <button onClick={onClick} style={{display:'flex',alignItems:'center',gap:5,padding:'8px 16px',border:'none',borderRadius:8,background:ACCENT_SOFT,color:ACCENT,fontSize:13,fontWeight:600,cursor:'pointer'}}>{children}</button>
}
function IconBtn({children,onClick,danger}) {
  return <button onClick={onClick} style={{display:'flex',alignItems:'center',padding:6,border:'1px solid var(--border)',borderRadius:6,background:'var(--bg)',color:danger?'#DC2626':'var(--ink-muted)',cursor:'pointer'}}>{children}</button>
}
function Empty({icon:Icon,text}) {
  return <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10,padding:'48px 24px',color:'var(--ink-muted)'}}><Icon size={36} strokeWidth={1.2}/><p style={{fontSize:14,margin:0}}>{text}</p></div>
}