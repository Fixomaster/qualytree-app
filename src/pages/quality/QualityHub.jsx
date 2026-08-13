// src/pages/quality/QualityHub.jsx — §8.3 NCR 자급자족 버전
import React, { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertTriangle, Package, FileWarning, ChevronDown, ChevronUp,
  Plus, Search, BarChart2, ArrowRight, RefreshCw, ShieldAlert, Info,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'

const NCR_KEY     = 'qualytree.ncrs'
const NCR_CNT_KEY = 'qualytree.ncrCounter'
const QUAR_KEY    = 'qualytree.quarantineItems'

function loadNcrs() { try { return JSON.parse(localStorage.getItem(NCR_KEY)||'[]') } catch { return [] } }
function saveNcrs(a){ localStorage.setItem(NCR_KEY, JSON.stringify(a)) }
function nextNcrId(){
  const n=parseInt(localStorage.getItem(NCR_CNT_KEY)||'0',10)+1
  localStorage.setItem(NCR_CNT_KEY,String(n))
  return `NCR-${new Date().getFullYear()}-${String(n).padStart(4,'0')}`
}
function loadQuarantine(){ try { return JSON.parse(localStorage.getItem(QUAR_KEY)||'[]') } catch { return [] } }

const SEV_CFG={
  Critical:{label:'Critical',color:'#DC2626',bg:'#FEF2F2',icon:ShieldAlert},
  Major:   {label:'Major',   color:'#D97706',bg:'#FFFBEB',icon:AlertTriangle},
  Minor:   {label:'Minor',   color:'#2563EB',bg:'#EFF6FF',icon:Info},
}
const STA_CFG={
  open:         {label:'발생',    color:'#6B7280',bg:'#F3F4F6'},
  investigating:{label:'조사중',  color:'#D97706',bg:'#FFFBEB'},
  contained:    {label:'격리완료',color:'#7C3AED',bg:'#F5F3FF'},
  corrected:    {label:'시정완료',color:'#059669',bg:'#ECFDF5'},
  closed:       {label:'종결',    color:'#374151',bg:'#E5E7EB'},
}
const STA_NEXT={open:'investigating',investigating:'contained',contained:'corrected',corrected:'closed'}
const SRC_LABELS={manual:'수동 입력',iqc:'수입검사',oos:'OOS/OOT',customer:'고객불만',audit:'내부심사',final:'최종검사',other:'기타'}
const TABS=[
  {id:'list',      label:'NCR 목록',icon:FileWarning},
  {id:'quarantine',label:'격리·처분',icon:Package},
  {id:'analysis',  label:'현황분석', icon:BarChart2},
]
const inputSt={width:'100%',padding:'8px 10px',border:'1px solid #D1D5DB',borderRadius:8,fontSize:13,outline:'none',boxSizing:'border-box'}

const Bdg=({bg,color,children})=><span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:9999,background:bg,color}}>{children}</span>

function EmptyState({icon:Icon,text}){return(
  <div style={{textAlign:'center',padding:'48px 0',color:'#9CA3AF'}}>
    <Icon size={36} style={{margin:'0 auto 12px',opacity:.4}}/>
    <p style={{fontSize:14}}>{text}</p>
  </div>
)}

function NcrForm({initial,onSave,onCancel}){
  const[form,setForm]=useState(initial||{title:'',description:'',severity:'Major',source:'manual',productLot:'',relatedWo:''})
  const set=k=>e=>setForm(p=>({...p,[k]:e.target.value}))
  const sel=(label,key,opts)=>(
    <div>
      <label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:4}}>{label}</label>
      <select value={form[key]} onChange={set(key)} style={inputSt}>{opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
    </div>
  )
  const inp=(label,key)=>(
    <div>
      <label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:4}}>{label}</label>
      <input value={form[key]} onChange={set(key)} style={inputSt}/>
    </div>
  )
  return(
    <div style={{background:'#F9FAFB',border:'1px solid #E5E7EB',borderRadius:12,padding:20,marginBottom:16}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
        {inp('제목 *','title')}
        {sel('심각도','severity',Object.entries(SEV_CFG).map(([k,v])=>[k,v.label]))}
        {sel('발생원','source',Object.entries(SRC_LABELS).map(([k,v])=>[k,v]))}
        {inp('제품 LOT','productLot')}
        {inp('관련 작업지시','relatedWo')}
      </div>
      <div style={{marginBottom:12}}>
        <label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:4}}>내용</label>
        <textarea value={form.description} onChange={set('description')} rows={3} style={{...inputSt,resize:'vertical'}}/>
      </div>
      <div style={{display:'flex',gap:8}}>
        <button onClick={()=>form.title.trim()&&onSave(form)} style={{padding:'8px 18px',background:'#1B4332',color:'#fff',border:'none',borderRadius:8,fontSize:13,cursor:'pointer'}}>저장</button>
        <button onClick={onCancel} style={{padding:'8px 18px',background:'#fff',color:'#374151',border:'1px solid #D1D5DB',borderRadius:8,fontSize:13,cursor:'pointer'}}>취소</button>
      </div>
    </div>
  )
}

function NcrCard({item,expanded,onExpand,canEdit,onAdvance}){
  const sev=SEV_CFG[item.severity]||SEV_CFG.Major
  const sta=STA_CFG[item.status]||STA_CFG.open
  const SevIc=sev.icon
  const nextSta=STA_NEXT[item.status]
  return(
    <div style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:12,overflow:'hidden',marginBottom:8}}>
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px',cursor:'pointer'}} onClick={onExpand}>
        <SevIc size={16} color={sev.color}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:11,fontWeight:700,color:'#6B7280',fontFamily:'monospace'}}>{item.id}</span>
            <Bdg bg={sev.bg} color={sev.color}>{sev.label}</Bdg>
            <Bdg bg={sta.bg} color={sta.color}>{sta.label}</Bdg>
          </div>
          <p style={{fontSize:13,fontWeight:600,color:'#111827',margin:'3px 0 0',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{item.title}</p>
        </div>
        {expanded?<ChevronUp size={16} color="#9CA3AF"/>:<ChevronDown size={16} color="#9CA3AF"/>}
      </div>
      {expanded&&(
        <div style={{padding:'0 16px 14px',borderTop:'1px solid #F3F4F6'}}>
          {item.description&&<p style={{fontSize:13,color:'#374151',margin:'10px 0 8px'}}>{item.description}</p>}
          <div style={{display:'flex',gap:8,flexWrap:'wrap',fontSize:12,color:'#6B7280',marginBottom:10}}>
            <span>발생원: {SRC_LABELS[item.source?.type]||item.source?.type||'—'}</span>
            {item.productLot&&<span>| LOT: {item.productLot}</span>}
            {item.relatedWo&&<span>| WO: {item.relatedWo}</span>}
            <span>| 등록: {item.detectedBy} {item.detectedAt?new Date(item.detectedAt).toLocaleDateString('ko'):''}</span>
          </div>
          {canEdit&&nextSta&&(
            <button onClick={()=>onAdvance(item)} style={{display:'flex',alignItems:'center',gap:4,padding:'5px 12px',background:'#1B4332',color:'#fff',border:'none',borderRadius:7,fontSize:12,cursor:'pointer'}}>
              <ArrowRight size={13}/> {STA_CFG[nextSta]?.label}로 전환
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function AnalysisTab({items}){
  if(!items.length) return <EmptyState icon={BarChart2} text="NCR 데이터가 없습니다."/>
  const bySev=Object.entries(SEV_CFG).map(([k,v])=>({...v,count:items.filter(i=>i.severity===k).length}))
  const bySta=Object.entries(STA_CFG).map(([k,v])=>({...v,count:items.filter(i=>i.status===k).length}))
  const maxC=Math.max(...bySev.map(s=>s.count),1)
  return(
    <div style={{display:'flex',gap:16,flexDirection:'column'}}>
      <div style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:12,padding:20}}>
        <h3 style={{fontSize:13,fontWeight:700,color:'#374151',marginBottom:14}}>심각도별 현황</h3>
        {bySev.map(s=>(
          <div key={s.label} style={{marginBottom:10}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}>
              <Bdg bg={s.bg} color={s.color}>{s.label}</Bdg>
              <span style={{fontWeight:700,color:'#111827'}}>{s.count}건</span>
            </div>
            <div style={{height:8,background:'#F3F4F6',borderRadius:4,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${(s.count/maxC)*100}%`,background:s.color,borderRadius:4,transition:'width .4s'}}/>
            </div>
          </div>
        ))}
      </div>
      <div style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:12,padding:20}}>
        <h3 style={{fontSize:13,fontWeight:700,color:'#374151',marginBottom:14}}>상태별 현황</h3>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {bySta.map(s=>(
            <div key={s.label} style={{flex:'1 1 100px',background:s.bg,borderRadius:10,padding:'12px 16px',textAlign:'center'}}>
              <div style={{fontSize:20,fontWeight:800,color:s.color}}>{s.count}</div>
              <div style={{fontSize:11,color:s.color,marginTop:2}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function QuarantineTab(){
  const[items,setItems]=useState([])
  useEffect(()=>{setItems(loadQuarantine())},[])
  if(!items.length) return <EmptyState icon={Package} text="격리된 항목이 없습니다. NCR 발생 시 해당 WO가 자동으로 격리됩니다."/>
  return(
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      {items.map(q=>(
        <div key={q.id} style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:10,padding:'12px 16px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <span style={{fontSize:12,fontWeight:700,color:'#6B7280',fontFamily:'monospace'}}>{q.id}</span>
              <p style={{fontSize:13,fontWeight:600,color:'#111827',margin:'4px 0 0'}}>{q.productName||q.reason||'—'} {q.lotNumber?`(LOT: ${q.lotNumber})`:''}</p>
            </div>
            <Bdg bg="#FEF2F2" color="#DC2626">{q.status||'격리중'}</Bdg>
          </div>
          {q.sourceNcrId&&<p style={{fontSize:11,color:'#9CA3AF',margin:'6px 0 0'}}>원인 NCR: <span style={{fontWeight:600}}>{q.sourceNcrId}</span></p>}
        </div>
      ))}
    </div>
  )
}

export default function QualityHub(){
  const[searchParams]=useSearchParams()
  const[tab,setTab]=useState(searchParams.get('tab')||'list')
  const[search,setSearch]=useState('')
  const[sevFilter,setSevFilter]=useState('all')
  const[staFilter,setStaFilter]=useState('all')
  const[expandedId,setExpandedId]=useState(null)
  const[showForm,setShowForm]=useState(false)
  const[editItem,setEditItem]=useState(null)
  const[tick,setTick]=useState(0)
  const refresh=()=>setTick(t=>t+1)

  const user=auth.current()
  const canEdit=true

  const allItems=useMemo(()=>loadNcrs(),[tick])
  const filtered=useMemo(()=>allItems.filter(i=>{
    if(sevFilter!=='all'&&i.severity!==sevFilter) return false
    if(staFilter!=='all'&&i.status!==staFilter) return false
    if(search&&!i.title?.toLowerCase().includes(search.toLowerCase())&&
       !i.id?.toLowerCase().includes(search.toLowerCase())&&
       !i.productLot?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }),[allItems,sevFilter,staFilter,search])

  function handleSave(form){
    const all=loadNcrs()
    if(editItem){
      const idx=all.findIndex(n=>n.id===editItem.id)
      if(idx!==-1) all[idx]={...all[idx],...form,source:{type:form.source||'manual'}}
      saveNcrs(all)
    } else {
      all.push({
        id:nextNcrId(),title:form.title,description:form.description||'',
        severity:form.severity||'Major',source:{type:form.source||'manual'},
        productLot:form.productLot||'',relatedWo:form.relatedWo||'',
        detectedAt:new Date().toISOString(),
        detectedBy:user?.name||user?.email||'unknown',
        status:'open',impact:null,investigationReport:null,
        containment:null,correction:null,capaId:null,closure:null,
      })
      saveNcrs(all)
    }
    setShowForm(false); setEditItem(null); refresh()
  }

  function handleAdvance(item){
    const next=STA_NEXT[item.status]
    if(!next) return
    const all=loadNcrs()
    const idx=all.findIndex(n=>n.id===item.id)
    if(idx!==-1){all[idx]={...all[idx],status:next};saveNcrs(all)}
    refresh()
  }

  const openCnt=allItems.filter(i=>i.status==='open').length

  return(
    <AppLayout>
      <div style={{maxWidth:860,margin:'0 auto',padding:'24px 16px'}}>
        {/* 헤더 */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
          <div>
            <h1 style={{fontSize:20,fontWeight:800,color:'#111827',margin:0}}>NCR · 부적합 관리</h1>
            <p style={{fontSize:13,color:'#6B7280',margin:'4px 0 0'}}>ISO 13485 §8.3 — 부적합 제품 식별·격리·처분·시정</p>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <span style={{fontSize:12,color:'#9CA3AF'}}>전체 {allItems.length}건 | 미결 {openCnt}건</span>
            {canEdit&&tab==='list'&&(
              <button onClick={()=>{setShowForm(true);setEditItem(null)}}
                style={{display:'flex',alignItems:'center',gap:5,padding:'8px 14px',background:'#1B4332',color:'#fff',border:'none',borderRadius:8,fontSize:13,cursor:'pointer',fontWeight:600}}>
                <Plus size={15}/> NCR 등록
              </button>
            )}
            <button onClick={refresh} style={{padding:8,background:'#fff',border:'1px solid #E5E7EB',borderRadius:8,cursor:'pointer',color:'#6B7280'}}>
              <RefreshCw size={15}/>
            </button>
          </div>
        </div>

        {/* 탭 */}
        <div style={{display:'flex',gap:4,borderBottom:'1px solid #E5E7EB',marginBottom:20}}>
          {TABS.map(t=>{const Ic=t.icon;return(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',border:'none',
                borderBottom:tab===t.id?'2px solid #1B4332':'2px solid transparent',
                background:'transparent',fontSize:13,fontWeight:tab===t.id?700:400,
                color:tab===t.id?'#1B4332':'#6B7280',cursor:'pointer',marginBottom:-1}}>
              <Ic size={15}/>{t.label}
            </button>
          )})}
        </div>

        {/* NCR 목록 */}
        {tab==='list'&&(
          <div>
            {(showForm||editItem)&&<NcrForm initial={editItem} onSave={handleSave} onCancel={()=>{setShowForm(false);setEditItem(null)}}/>}
            <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
              <div style={{position:'relative',flex:1,minWidth:160}}>
                <Search size={14} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#9CA3AF'}}/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="NCR번호, 제목, LOT 검색" style={{...inputSt,paddingLeft:32}}/>
              </div>
              <select value={sevFilter} onChange={e=>setSevFilter(e.target.value)} style={{...inputSt,width:'auto'}}>
                <option value="all">전체 심각도</option>
                {Object.entries(SEV_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
              <select value={staFilter} onChange={e=>setStaFilter(e.target.value)} style={{...inputSt,width:'auto'}}>
                <option value="all">전체 상태</option>
                {Object.entries(STA_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            {filtered.length===0
              ?<EmptyState icon={FileWarning} text={search||sevFilter!=='all'||staFilter!=='all'?'검색 결과가 없습니다':'NCR이 없습니다. 상단 버튼으로 첫 NCR을 등록하세요.'}/>
              :filtered.map(item=>(
                <NcrCard key={item.id} item={item}
                  expanded={expandedId===item.id}
                  onExpand={()=>setExpandedId(expandedId===item.id?null:item.id)}
                  onAdvance={handleAdvance}
                  canEdit={canEdit}/>
              ))
            }
          </div>
        )}
        {tab==='quarantine'&&<QuarantineTab/>}
        {tab==='analysis'&&<AnalysisTab items={allItems}/>}
      </div>
    </AppLayout>
  )
}
