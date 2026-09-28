// src/pages/oem/OemFullHub.jsx
import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { Building2, FileText, Shield, ClipboardList, CheckCircle2, Plus, Trash2, AlertTriangle, Edit2, X, Calendar, CheckCircle, Circle } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'
import { supabase } from '../../lib/supabaseClient'
let _sbCidOemF = null

const LS_KEY = 'qualytree.oem_full'
const EMPTY_CONTRACTOR = { id:'', name:'', bizNo:'', ceo:'', phone:'', address:'', startDate:'', status:'active', note:'' }
const EMPTY_CONTRACT = { id:'', contractorId:'', title:'', signDate:'', expiryDate:'', type:'oem', fileRef:'', note:'' }
const EMPTY_QA = { id:'', contractorId:'', version:'', effDate:'', qcStd:'', inspMethod:'', defectAction:'', note:'' }
const EMPTY_AUDIT = { id:'', contractorId:'', planDate:'', actualDate:'', auditor:'', result:'planned', findings:'', note:'' }

function loadData() {
  try { const r=localStorage.getItem(LS_KEY); return r?JSON.parse(r):{contractors:[],contracts:[],qualityAgreements:[],audits:[]} }
  catch { return {contractors:[],contracts:[],qualityAgreements:[],audits:[]} }
}
function saveData(d) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(d)) } catch {}
  if (_sbCidOemF) {
    supabase.from('company_data').upsert({
      company_id: _sbCidOemF, data_type: 'localStorage_sync',
      data_key: LS_KEY, payload: d
    }, { onConflict: 'company_id,data_type,data_key' })
  }
}
const uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,5)
const ACCENT = '#EA580C'
const ACCENT_SOFT = '#FFF7ED'

const TABS = [
  {id:'overview',label:'ê°ì',Icon:Building2},
  {id:'contractors',label:'ìíì¬ ê´ë¦¬',Icon:ClipboardList},
  {id:'contracts',label:'ê³ì½ì',Icon:FileText},
  {id:'quality',label:'íì§ íì½',Icon:Shield},
  {id:'audit',label:'ê°ì¬ ì¼ì ',Icon:CheckCircle2},
]
export default function OemFullHub() {
  const [data,setData] = useState(loadData)
  const [tab,setTab] = useState('overview')
  const user = auth.current()
  const companyId = user?.company_id
  useEffect(() => { _sbCidOemF = companyId }, [companyId])
  useEffect(() => {
    if (!companyId) return
    supabase.from('company_data')
      .select('payload')
      .eq('company_id', companyId)
      .eq('data_type', 'localStorage_sync')
      .eq('data_key', LS_KEY)
      .maybeSingle()
      .then(({ data: sbData }) => {
        if (sbData?.payload) {
          setData(sbData.payload)
        }
      })
  }, [companyId])
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
      <HubBanner icon={Building2} title="OEM ì ê³µì ìí ê´ë¦¬" subtitle="OEM ìíì¬ ê³ì½ë°êµì§íì½ê°ì¬ íµí© ê´ë¦¬ (ìë£ê¸°ê¸°ë² Â§14)" color={ACCENT} />
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
    {label:'íì± ìíì¬',value:stats.active,unit:'ê°ì¬',color:ACCENT,Icon:Building2},
    {label:'ê³ì½ ë§ë£ ìë°(90ì¼)',value:stats.expiring,unit:'ê±´',color:stats.expiring>0?'#DC2626':'#16A34A',Icon:Calendar},
    {label:'ê°ì¬ ì§ì°',value:stats.auditDue,unit:'ê±´',color:stats.auditDue>0?'#D97706':'#16A34A',Icon:ClipboardList},
    {label:'íì§ íì½',value:stats.qaCount,unit:'ê±´',color:'#7C3AED',Icon:Shield},
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
      <SectionBox title="OEM ì ê³µì ìí ê´ë¦¬ ìê±´">
        {[
          {done:data.contractors.length>0,text:'ìíì¬ ë±ë¡ ë° ê´ë¦¬'},
          {done:data.contracts.length>0,text:'OEM ì ì¡° ê³ì½ì ì²´ê²° ë° ë³´ê´'},
          {done:data.qualityAgreements.length>0,text:'íì§ íì½ì ì²´ê²°'},
          {done:data.audits.some(a=>a.result!=='planned'),text:'ìíì¬ ì ê¸° ê°ì¬ ì´ë ¥ ë³´ì '},
        ].map(({done,text}) => (
          <div key={text} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid var(--border-soft)'}}>
            {done?<CheckCircle size={18} color="#16A34A" strokeWidth={1.7}/>:<Circle size={18} color="var(--ink-muted)" strokeWidth={1.7}/>}
            <span style={{fontSize:14,color:done?'var(--ink)':'var(--ink-muted)'}}>{text}</span>
          </div>
        ))}
      </SectionBox>
      {data.contractors.length>0&&(
        <SectionBox title="ìíì¬ ëª©ë¡ (ìì½)">
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead><tr style={{borderBottom:'2px solid var(--border)'}}>{['ìíì¬ëª','ì¬ììë²í¸','ëíì','ì°ë½ì²','ìí'].map(h=><th key={h} style={{textAlign:'left',padding:'8px 12px',color:'var(--ink-muted)',fontWeight:600}}>{h}</th>)}</tr></thead>
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
  const del=id=>{if(confirm('ì­ì íìê² ìµëê¹?'))update({contractors:data.contractors.filter(c=>c.id!==id)})}
  return (
    <div>
      <ListHeader title="ìíì¬ ëª©ë¡" onAdd={open}/>
      {data.contractors.length===0?<Empty icon={Building2} text="ë±ë¡ë ìíì¬ê° ììµëë¤"/>:data.contractors.map(c=>(
        <div key={c.id} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'16px 20px',marginBottom:10}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}><span style={{fontWeight:600,fontSize:15}}>{c.name}</span><StatusBadge status={c.status}/></div>
              <div style={{display:'flex',flexWrap:'wrap',gap:'4px 20px',fontSize:13,color:'var(--ink-muted)'}}>
                {c.bizNo&&<span>{c.bizNo}</span>}{c.ceo&&<span>{c.ceo}</span>}{c.phone&&<span>{c.phone}</span>}{c.startDate&&<span>ìíìì: {c.startDate}</span>}
              </div>
            </div>
            <div style={{display:'flex',gap:6}}><IconBtn onClick={()=>open(c)}><Edit2 size={14}/></IconBtn><IconBtn danger onClick={()=>del(c.id)}><Trash2 size={14}/></IconBtn></div>
          </div>
        </div>
      ))}
      {form&&(
        <Modal title={form._isNew?'ìíì¬ ì¶ê°':'ìíì¬ ìì '} onClose={()=>setForm(null)}>
          <Grid2>
            <Field label="ìíì¬ëª *" value={form.name} onChange={v=>setForm(f=>({...f,name:v}))}/>
            <Field label="ì¬ììë²í¸" value={form.bizNo} onChange={v=>setForm(f=>({...f,bizNo:v}))} placeholder="000-00-00000"/>
            <Field label="ëíì" value={form.ceo} onChange={v=>setForm(f=>({...f,ceo:v}))}/>
            <Field label="ì°ë½ì²" value={form.phone} onChange={v=>setForm(f=>({...f,phone:v}))}/>
            <Field label="ìí ììì¼" type="date" value={form.startDate} onChange={v=>setForm(f=>({...f,startDate:v}))}/>
            <SelectField label="ìí" value={form.status} onChange={v=>setForm(f=>({...f,status:v}))} options={[['active','íì±'],['suspended','ì¤ë¨'],['terminated','í´ì§']]}/>
          </Grid2>
          <Field label="ì£¼ì" value={form.address} onChange={v=>setForm(f=>({...f,address:v}))} full/>
          <Field label="ë¹ê³ " value={form.note} onChange={v=>setForm(f=>({...f,note:v}))} full/>
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
  const del=id=>{if(confirm('ì­ì íìê² ìµëê¹?'))update({contracts:data.contracts.filter(c=>c.id!==id)})}
  const getDays=d=>d?Math.ceil((new Date(d)-new Date(today))/86400000):null
  return (
    <div>
      <ListHeader title="OEM ê³ì½ì ëª©ë¡" onAdd={open}/>
      {data.contracts.length===0?<Empty icon={FileText} text="ë±ë¡ë ê³ì½ìê° ììµëë¤"/>:data.contracts.map(c=>{
        const days=getDays(c.expiryDate);const urgent=days!==null&&days>=0&&days<=90;const expired=days!==null&&days<0
        const cname=data.contractors.find(x=>x.id===c.contractorId)?.name||'â'
        return (
          <div key={c.id} style={{background:'var(--surface)',borderRadius:10,padding:'14px 18px',marginBottom:10,border:'1px solid '+(expired?'#FCA5A5':urgent?'#FDE68A':'var(--border)')}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div>
                <div style={{fontWeight:600,fontSize:14,marginBottom:4}}>{c.title}</div>
                <div style={{fontSize:12,color:'var(--ink-muted)',display:'flex',flexWrap:'wrap',gap:'2px 16px'}}>
                  <span>ìíì¬: {cname}</span><span>ì²´ê²°: {c.signDate||'â'}</span>
                  <span style={{color:expired?'#DC2626':urgent?'#D97706':'inherit'}}>ë§ë£: {c.expiryDate||'â'}{days!==null&&' ('+(expired?'ë§ë£ë¨':days+'ì¼ ë¨ì')+')'}</span>
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
        <Modal title={form._isNew?'ê³ì½ì ì¶ê°':'ê³ì½ì ìì '} onClose={()=>setForm(null)}>
          <Field label="ê³ì½ëª *" value={form.title} onChange={v=>setForm(f=>({...f,title:v}))} full/>
          <Grid2>
            <SelectField label="ìíì¬" value={form.contractorId} onChange={v=>setForm(f=>({...f,contractorId:v}))} options={data.contractors.map(c=>[c.id,c.name])} placeholder="ì í"/>
            <SelectField label="ê³ì½ ì í" value={form.type} onChange={v=>setForm(f=>({...f,type:v}))} options={[['oem','OEM ì ì¡° ê³ì½'],['quality','íì§ íì½'],['nda','ê¸°ë°ì ì§(NDA)'],['other','ê¸°í']]}/>
            <Field label="ê³ì½ ì²´ê²°ì¼" type="date" value={form.signDate} onChange={v=>setForm(f=>({...f,signDate:v}))}/>
            <Field label="ê³ì½ ë§ë£ì¼" type="date" value={form.expiryDate} onChange={v=>setForm(f=>({...f,expiryDate:v}))}/>
          </Grid2>
          <Field label="ê´ë ¨ íì¼/ë¬¸ì ë²í¸" value={form.fileRef} onChange={v=>setForm(f=>({...f,fileRef:v}))} full/>
          <Field label="ë¹ê³ " value={form.note} onChange={v=>setForm(f=>({...f,note:v}))} full/>
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
  const del=id=>{if(confirm('ì­ì íìê² ìµëê¹?'))update({qualityAgreements:data.qualityAgreements.filter(q=>q.id!==id)})}
  return (
    <div>
      <ListHeader title="íì§ íì½ì ëª©ë¡" onAdd={open}/>
      {data.qualityAgreements.length===0?<Empty icon={Shield} text="ë±ë¡ë íì§ íì½ì´ ììµëë¤"/>:data.qualityAgreements.map(q=>{
        const cname=data.contractors.find(x=>x.id===q.contractorId)?.name||'â'
        return (
          <div key={q.id} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'16px 20px',marginBottom:10}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div>
                <div style={{fontWeight:600,marginBottom:4}}>íì§ íì½ v{q.version||'â'} <span style={{fontWeight:400,fontSize:12,color:'var(--ink-muted)'}}>({cname})</span></div>
                <div style={{fontSize:12,color:'var(--ink-muted)',display:'flex',gap:16}}><span>ë°í¨ì¼: {q.effDate||'â'}</span>{q.inspMethod&&<span>ê²ì¬ê¸°ì¤: {q.inspMethod}</span>}</div>
                {q.qcStd&&<div style={{fontSize:12,marginTop:6}}>íì§ ê¸°ì¤: {q.qcStd}</div>}
              </div>
              <div style={{display:'flex',gap:6}}><IconBtn onClick={()=>open(q)}><Edit2 size={14}/></IconBtn><IconBtn danger onClick={()=>del(q.id)}><Trash2 size={14}/></IconBtn></div>
            </div>
          </div>
        )
      })}
      {form&&(
        <Modal title={form._isNew?'íì§ íì½ ì¶ê°':'íì§ íì½ ìì '} onClose={()=>setForm(null)}>
          <Grid2>
            <SelectField label="ìíì¬" value={form.contractorId} onChange={v=>setForm(f=>({...f,contractorId:v}))} options={data.contractors.map(c=>[c.id,c.name])} placeholder="ì í"/>
            <Field label="ë²ì " value={form.version} onChange={v=>setForm(f=>({...f,version:v}))} placeholder="1.0"/>
            <Field label="ë°í¨ì¼" type="date" value={form.effDate} onChange={v=>setForm(f=>({...f,effDate:v}))}/>
            <Field label="ê²ì¬ ê¸°ì¤" value={form.inspMethod} onChange={v=>setForm(f=>({...f,inspMethod:v}))} placeholder="AQL 1.0"/>
          </Grid2>
          <Field label="íì§ ê¸°ì¤" value={form.qcStd} onChange={v=>setForm(f=>({...f,qcStd:v}))} full/>
          <Field label="ë¶ë ì²ë¦¬ ê¸°ì¤" value={form.defectAction} onChange={v=>setForm(f=>({...f,defectAction:v}))} full/>
          <Field label="ë¹ê³ " value={form.note} onChange={v=>setForm(f=>({...f,note:v}))} full/>
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
  const del=id=>{if(confirm('ì­ì íìê² ìµëê¹?'))update({audits:data.audits.filter(a=>a.id!==id)})}
  const RES={planned:{label:'ìì ',color:'#3B82F6',bg:'#EFF6FF'},pass:{label:'í©ê²©',color:'#16A34A',bg:'#F0FDF4'},conditional:{label:'ì¡°ê±´ë¶',color:'#D97706',bg:'#FFFBEB'},fail:{label:'ë¶í©ê²©',color:'#DC2626',bg:'#FEF2F2'}}
  const sorted=[...data.audits].sort((a,b)=>(b.planDate||'').localeCompare(a.planDate||''))
  return (
    <div>
      <ListHeader title="ìíì¬ ê°ì¬ ì´ë ¥" onAdd={open}/>
      {sorted.length===0?<Empty icon={CheckCircle2} text="ë±ë¡ë ê°ì¬ ì´ë ¥ì´ ììµëë¤"/>:sorted.map(a=>{
        const cname=data.contractors.find(x=>x.id===a.contractorId)?.name||'â'
        const res=RES[a.result]||RES.planned
        const overdue=a.result==='planned'&&a.planDate&&a.planDate<today
        return (
          <div key={a.id} style={{background:'var(--surface)',borderRadius:10,padding:'14px 18px',marginBottom:10,border:'1px solid '+(overdue?'#FCA5A5':'var(--border)')}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                  <span style={{fontWeight:600,fontSize:14}}>{cname} ê°ì¬</span>
                  <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,color:res.color,background:res.bg}}>{res.label}</span>
                  {overdue&&<span style={{fontSize:11,color:'#DC2626',fontWeight:600}}>â  ì§ì°</span>}
                </div>
                <div style={{fontSize:12,color:'var(--ink-muted)',display:'flex',flexWrap:'wrap',gap:'2px 16px'}}>
                  <span>ìì : {a.planDate||'â'}</span>{a.actualDate&&<span>ì¤ì: {a.actualDate}</span>}{a.auditor&&<span>ê°ì¬ì: {a.auditor}</span>}
                </div>
                {a.findings&&<div style={{fontSize:12,marginTop:6}}>ì§ì : {a.findings}</div>}
              </div>
              <div style={{display:'flex',gap:6}}><IconBtn onClick={()=>open(a)}><Edit2 size={14}/></IconBtn><IconBtn danger onClick={()=>del(a.id)}><Trash2 size={14}/></IconBtn></div>
            </div>
          </div>
        )
      })}
      {form&&(
        <Modal title={form._isNew?'ê°ì¬ ì¶ê°':'ê°ì¬ ìì '} onClose={()=>setForm(null)}>
          <Grid2>
            <SelectField label="ìíì¬" value={form.contractorId} onChange={v=>setForm(f=>({...f,contractorId:v}))} options={data.contractors.map(c=>[c.id,c.name])} placeholder="ì í"/>
            <SelectField label="ê°ì¬ ê²°ê³¼" value={form.result} onChange={v=>setForm(f=>({...f,result:v}))} options={[['planned','ìì '],['pass','í©ê²©'],['conditional','ì¡°ê±´ë¶ í©ê²©'],['fail','ë¶í©ê²©']]}/>
            <Field label="ê³íì¼" type="date" value={form.planDate} onChange={v=>setForm(f=>({...f,planDate:v}))}/>
            <Field label="ì¤ìì¼" type="date" value={form.actualDate} onChange={v=>setForm(f=>({...f,actualDate:v}))}/>
            <Field label="ê°ì¬ì" value={form.auditor} onChange={v=>setForm(f=>({...f,auditor:v}))}/>
          </Grid2>
          <Field label="ì§ì  ì¬í­" value={form.findings} onChange={v=>setForm(f=>({...f,findings:v}))} full/>
          <Field label="ë¹ê³ " value={form.note} onChange={v=>setForm(f=>({...f,note:v}))} full/>
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
  return <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}><h3 style={{fontSize:16,fontWeight:600,margin:0}}>{title}</h3><Btn onClick={onAdd}><Plus size={14}/> ì¶ê°</Btn></div>
}
function StatusBadge({status}) {
  const map={active:['íì±','#16A34A','#F0FDF4'],suspended:['ì¤ë¨','#D97706','#FFFBEB'],terminated:['í´ì§','#6B7280','#F3F4F6']}
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
  return <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:8,paddingTop:16,borderTop:'1px solid var(--border)'}}><button onClick={onCancel} style={{padding:'8px 20px',border:'1px solid var(--border)',borderRadius:6,background:'none',cursor:'pointer',fontSize:13}}>ì·¨ì</button><button onClick={onSave} style={{padding:'8px 20px',border:'none',borderRadius:6,background:ACCENT,color:'#fff',cursor:'pointer',fontSize:13,fontWeight:600}}>ì ì¥</button></div>
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