// src/pages/regulatory/RegulatoryHub.jsx
// 인허가 허브 — MFDS 고시 제2026-6호 별표7 기반 자동 서류 매핑
import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  Search, CheckCircle2, Clock, FileText, Plus,
  ChevronRight, X, Info, Save, Tag,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'

import { PRODUCT_CATEGORIES, REG_MATRIX } from '../../data/regulatoryData'

// ── 13개 서류 컬럼 ────────────────────────────────────────────────────────
const DOC_COLS = [
  { idx:0,  key:'compare',     label:'본질적동등성 비교표',          group:'공통' },
  { idx:1,  key:'purpose',     label:'사용목적에 관한 자료',          group:'기본' },
  { idx:2,  key:'principle',   label:'작용원리에 관한 자료',          group:'기본' },
  { idx:3,  key:'electrical',  label:'전기·기계적 안전에 관한 자료',  group:'안전' },
  { idx:4,  key:'radiation',   label:'방사선 안전에 관한 자료',       group:'안전' },
  { idx:5,  key:'emf',         label:'전자파 안전에 관한 자료',       group:'안전' },
  { idx:6,  key:'bio',         label:'생물학적 안전에 관한 자료',     group:'안전' },
  { idx:7,  key:'performance', label:'성능에 관한 자료',              group:'성능' },
  { idx:8,  key:'physchem',    label:'물리화학적 특성에 관한 자료',   group:'성능' },
  { idx:9,  key:'stability',   label:'안정성에 관한 자료',            group:'성능' },
  { idx:10, key:'clinical',    label:'임상시험자료',                  group:'임상' },
  { idx:11, key:'origin',      label:'기원 및 개발경위에 관한 자료',  group:'기타' },
  { idx:12, key:'foreign',     label:'외국의 허가현황에 관한 자료',   group:'기타' },
]

// ── 비교 항목 → 분류 매핑 ─────────────────────────────────────────────────
const COMPARE_ITEMS = [
  { key:'purpose',     label:'사용목적',    row:'가_새로운_사용목적', code:'가', classLabel:'가 — 새로운 사용목적' },
  { key:'principle',   label:'작용원리',    row:'나_새로운_작용원리', code:'나', classLabel:'나 — 새로운 작용원리' },
  { key:'material',    label:'원재료·부품', row:'다_새로운_원재료',   code:'다', classLabel:'다 — 새로운 원재료' },
  { key:'performance', label:'성능·효능',   row:'라_개량_성능',      code:'라', classLabel:'라 — 개량된 성능' },
  { key:'standard',    label:'시험규격',    row:'마_개량_시험규격',  code:'마', classLabel:'마 — 개량된 시험규격' },
  { key:'usage',       label:'사용방법',    row:'바_개량_사용방법',  code:'바', classLabel:'바 — 개량된 사용방법' },
]

const ROW_MAP = {
  '가':'가_새로운_사용목적','나':'나_새로운_작용원리','다':'다_새로운_원재료',
  '라':'라_개량_성능','마':'마_개량_시험규격','바':'바_개량_사용방법','동등':'동등',
}

const CLASS_COLOR = {
  가:'#7c3aed',나:'#1d4ed8',다:'#0f766e',라:'#b45309',마:'#9a3412',바:'#7e1d5a',동등:'#166534'
}
const clr = code => CLASS_COLOR[code] || '#6b7280'

const LS_KEY = 'qualytree.regulatory_products'
const loadProducts = () => { try { return JSON.parse(localStorage.getItem(LS_KEY)||'[]') } catch { return [] } }
const saveProducts = l => localStorage.setItem(LS_KEY, JSON.stringify(l))

// ─────────────────────────────────────────────────────────────────────────
export default function RegulatoryHub() {
  const user = auth.user()
  const [tab, setTab] = useState(0)
  const [products, setProducts] = useState(loadProducts)

  function handleSave(product) {
    const list = [...products, { ...product, id: Date.now(), savedAt: new Date().toISOString() }]
    setProducts(list); saveProducts(list); setTab(0)
  }
  function handleDelete(id) {
    const list = products.filter(p => p.id !== id)
    setProducts(list); saveProducts(list)
  }

  return (
    <AppLayout user={user} title="인허가 허브"
      subtitle="MFDS 고시 제2026-6호 별표7 — 품목별 기술문서 제출 범위 자동 매핑">
      <div className="fade-in" style={{ maxWidth: 920, margin: '0 auto' }}>

        {/* Tab bar */}
        <div style={{ display:'flex', borderBottom:'1px solid var(--line)', marginBottom:24 }}>
          {['허가 현황','신규 신청'].map((label, i) => (
            <button key={i} onClick={() => setTab(i)} style={{
              padding:'10px 20px', fontSize:13, fontWeight:500, background:'none',
              border:'none', cursor:'pointer', transition:'all .15s',
              borderBottom: tab===i ? '2px solid var(--moss)' : '2px solid transparent',
              color: tab===i ? 'var(--moss)' : 'var(--ink-faint)',
            }}>{label}</button>
          ))}
        </div>

        {tab===0 && <ProductList products={products} onNew={()=>setTab(1)} onDelete={handleDelete} />}
        {tab===1 && <WizardForm onSave={handleSave} onCancel={()=>setTab(0)} />}
      </div>
    </AppLayout>
  )
}

// ─── 허가 현황 ─────────────────────────────────────────────────────────────
function ProductList({ products, onNew, onDelete }) {
  const [selected, setSelected] = useState(null)

  if (products.length === 0) {
    return (
      <div className="card-base" style={{ textAlign:'center', padding:'60px 24px' }}>
        <FileText size={40} style={{ margin:'0 auto 16px', color:'var(--ink-faint)' }} />
        <p style={{ fontSize:15, fontWeight:500, color:'var(--ink)', marginBottom:8 }}>
          등록된 허가 항목이 없습니다
        </p>
        <p style={{ fontSize:13, color:'var(--ink-faint)', marginBottom:24 }}>
          신규 신청 탭에서 품목 정보를 입력하고 필요 서류를 확인하세요
        </p>
        <button className="btn-primary" onClick={onNew}
          style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
          <Plus size={14} /> 신규 신청 시작
        </button>
      </div>
    )
  }

  if (selected) {
    const p = selected
    const docs = p.docList || []
    return (
      <div>
        <button onClick={() => setSelected(null)} className="btn-ghost"
          style={{ display:'inline-flex', alignItems:'center', gap:4, marginBottom:16 }}>
          ← 목록으로
        </button>
        <div className="card-base" style={{ padding:24 }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                <span className="font-display" style={{ fontSize:17, fontWeight:600, color:'var(--ink)' }}>
                  {p.productName}
                </span>
                {p.classification && (
                  <span style={{
                    fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:4,
                    background: clr(p.classification)+'20', color: clr(p.classification),
                  }}>{p.classLabel}</span>
                )}
              </div>
              <p style={{ fontSize:12, color:'var(--ink-faint)' }}>
                {p.productCode} · {p.grade ? p.grade+'등급' : '등급 미상'}
                {p.isImport ? ' · 수입' : ' · 제조'}
                {' · '}{new Date(p.savedAt).toLocaleDateString('ko-KR')}
              </p>
            </div>
            <button
              onClick={() => { if(window.confirm('삭제하시겠습니까?')){ onDelete(p.id); setSelected(null) } }}
              style={{ fontSize:12, color:'var(--ink-faint)', background:'none', border:'none', cursor:'pointer' }}>
              삭제
            </button>
          </div>

          {p.compareName && (
            <div style={{ background:'var(--bg-soft,#f8f9fa)', borderRadius:8, padding:'12px 16px', marginBottom:20, fontSize:12 }}>
              <p style={{ fontWeight:600, marginBottom:4, color:'var(--ink)' }}>기허가 제품</p>
              <p style={{ color:'var(--ink-mute)' }}>
                품목명: {p.compareName}
                {p.comparePermit ? ' · 허가번호: '+p.comparePermit : ''}
                {p.compareMfg ? ' · 제조사: '+p.compareMfg : ''}
              </p>
            </div>
          )}

          <p style={{ fontSize:13, fontWeight:600, marginBottom:10, color:'var(--ink)' }}>필요 서류 목록</p>
          {docs.length === 0
            ? <p style={{ color:'var(--ink-faint)', fontSize:13 }}>서류 정보 없음</p>
            : (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {docs.map(d => (
                  <div key={d.key} style={{
                    display:'flex', alignItems:'center', gap:10, padding:'8px 12px',
                    borderRadius:6, background:'var(--bg-soft,#f8f9fa)',
                  }}>
                    {d.status==='done'
                      ? <CheckCircle2 size={14} style={{ color:'var(--moss)' }} />
                      : d.status==='na'
                      ? <X size={14} style={{ color:'var(--ink-faint)' }} />
                      : <Clock size={14} style={{ color:'var(--amber,#f59e0b)' }} />}
                    <span style={{ fontSize:13, flex:1, color: d.status==='na' ? 'var(--ink-faint)' : 'var(--ink)' }}>
                      {d.label}
                      {d.required===2 && <span style={{ fontSize:10, color:'#b45309', marginLeft:4 }}>△품목별판단</span>}
                    </span>
                    {d.note && <span style={{ fontSize:11, color:'var(--ink-faint)' }}>{d.note}</span>}
                  </div>
                ))}
              </div>
            )
          }
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
        <button className="btn-primary" onClick={onNew}
          style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
          <Plus size={14} /> 신규 신청
        </button>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {products.map(p => (
          <div key={p.id} className="card-base"
            onClick={() => setSelected(p)}
            style={{ padding:'14px 20px', cursor:'pointer', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:14, fontWeight:500, color:'var(--ink)', marginBottom:2 }}>{p.productName}</p>
              <p style={{ fontSize:12, color:'var(--ink-faint)' }}>
                {p.productCode} · {p.grade ? p.grade+'등급' : '-'} · {p.isImport ? '수입' : '제조'}
                {' · '}{new Date(p.savedAt).toLocaleDateString('ko-KR')}
              </p>
            </div>
            {p.classification && (
              <span style={{
                fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:4, flexShrink:0,
                background: clr(p.classification)+'20', color: clr(p.classification),
              }}>{p.classLabel}</span>
            )}
            <ChevronRight size={14} style={{ color:'var(--ink-faint)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── 신규 신청 마법사 ─────────────────────────────────────────────────────
const INITIAL_FORM = {
  productName:'', productCode:'', grade:'', isImport:false, fieldType:'',
  compareName:'', comparePermit:'', compareMfg:'',
  comparison:{ purpose:null, principle:null, material:null, performance:null, standard:null, usage:null },
  classification:null, classLabel:'', docList:[],
}

function WizardForm({ onSave, onCancel }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(INITIAL_FORM)
  const update = patch => setForm(f => ({ ...f, ...patch }))

  const STEPS = ['품목 기본정보','동등성 비교표','필요 서류 목록']
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', marginBottom:28 }}>
        {STEPS.map((label, i) => {
          const n = i+1, active = step===n, done = step>n
          return (
            <React.Fragment key={i}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{
                  width:26, height:26, borderRadius:13, display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:12, fontWeight:700,
                  background: (done||active) ? 'var(--moss)' : 'var(--line)',
                  color: (done||active) ? '#fff' : 'var(--ink-faint)',
                }}>{done ? '✓' : n}</div>
                <span style={{ fontSize:13, fontWeight:active?600:400, color:active?'var(--ink)':'var(--ink-faint)' }}>
                  {label}
                </span>
              </div>
              {i < STEPS.length-1 && (
                <div style={{ flex:1, height:1, background:'var(--line)', margin:'0 12px' }} />
              )}
            </React.Fragment>
          )
        })}
      </div>

      {step===1 && <Step1 form={form} onChange={update} onNext={()=>setStep(2)} onCancel={onCancel} />}
      {step===2 && <Step2 form={form} onChange={update} onNext={()=>setStep(3)} onBack={()=>setStep(1)} />}
      {step===3 && <Step3 form={form} onChange={update} onSave={()=>onSave(form)} onBack={()=>setStep(2)} />}
    </div>
  )
}

// ─── Step 1: 품목 기본정보 ────────────────────────────────────────────────
function Step1({ form, onChange, onNext, onCancel }) {
  const [query, setQuery] = useState(form.productName || '')
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    if (!query) return []
    const q = query.toLowerCase()
    return PRODUCT_CATEGORIES.filter(c =>
      c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    ).slice(0,12)
  }, [query])

  function selectCat(cat) {
    const fields = Object.keys(REG_MATRIX[cat.code] || {})
    onChange({ productName:cat.name, productCode:cat.code, fieldType: fields.length===1 ? fields[0] : '' })
    setQuery(cat.name); setOpen(false)
  }

  const catEntry = REG_MATRIX[form.productCode]
  const availableFields = catEntry ? Object.keys(catEntry) : []
  const hasBoth = availableFields.length > 1
  const canNext = form.productName && form.productCode && form.grade && (!hasBoth || form.fieldType)

  return (
    <div className="card-base" style={{ padding:28 }}>
      <p className="font-display" style={{ fontSize:15, fontWeight:600, marginBottom:20, color:'var(--ink)' }}>
        품목 기본정보 입력
      </p>

      <div style={{ marginBottom:18, position:'relative' }}>
        <label style={{ fontSize:12, fontWeight:600, color:'var(--ink-mute)', display:'block', marginBottom:6 }}>
          품목명 <span style={{ color:'#ef4444' }}>*</span>
        </label>
        <div style={{ position:'relative' }}>
          <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--ink-faint)' }} />
          <input className="input-base" style={{ paddingLeft:32 }}
            placeholder="품목명 또는 분류번호로 검색 (예: 혈압계, A23000)"
            value={query}
            onChange={e => {
              setQuery(e.target.value); setOpen(true)
              if(!e.target.value) onChange({productName:'',productCode:'',fieldType:''})
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(()=>setOpen(false),150)}
          />
        </div>
        {open && filtered.length > 0 && (
          <div style={{
            position:'absolute', top:'100%', left:0, right:0, zIndex:50, marginTop:4,
            background:'var(--bg-card)', border:'1px solid var(--line)', borderRadius:8,
            boxShadow:'0 4px 16px rgba(0,0,0,.08)', maxHeight:240, overflowY:'auto',
          }}>
            {filtered.map(c => (
              <div key={c.code} onMouseDown={() => selectCat(c)}
                style={{ padding:'9px 14px', cursor:'pointer', borderBottom:'1px solid var(--line)', display:'flex', gap:10, alignItems:'center' }}
                onMouseEnter={e => e.currentTarget.style.background='var(--leaf-soft)'}
                onMouseLeave={e => e.currentTarget.style.background=''}>
                <span style={{ fontSize:11, fontFamily:'monospace', color:'var(--ink-faint)', flexShrink:0 }}>{c.code}</span>
                <span style={{ fontSize:13, color:'var(--ink)' }}>{c.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginBottom:18 }}>
        <label style={{ fontSize:12, fontWeight:600, color:'var(--ink-mute)', display:'block', marginBottom:6 }}>분류번호</label>
        <input className="input-base" value={form.productCode} readOnly
          placeholder="품목 선택 시 자동 입력"
          style={{ background:'var(--bg-soft,#f8f9fa)', color: form.productCode ? 'var(--ink)' : 'var(--ink-faint)' }} />
      </div>

      <div style={{ marginBottom:18 }}>
        <label style={{ fontSize:12, fontWeight:600, color:'var(--ink-mute)', display:'block', marginBottom:8 }}>
          등급 <span style={{ color:'#ef4444' }}>*</span>
        </label>
        <div style={{ display:'flex', gap:8 }}>
          {['1','2','3','4'].map(g => (
            <button key={g} onClick={() => onChange({grade:g})} style={{
              padding:'7px 18px', borderRadius:6, fontSize:13, fontWeight:500, cursor:'pointer',
              border: form.grade===g ? '1px solid var(--moss)' : '1px solid var(--line)',
              background: form.grade===g ? 'var(--leaf-soft)' : 'transparent',
              color: form.grade===g ? 'var(--moss)' : 'var(--ink-mute)',
            }}>{g}등급</button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom:18 }}>
        <label style={{ fontSize:12, fontWeight:600, color:'var(--ink-mute)', display:'block', marginBottom:8 }}>제조·수입 구분</label>
        <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, color:'var(--ink)"}}>
          <input type="checkbox" checked={form.isImport} onChange={e => onChange({isImport:e.target.checked})}
            style={{ width:15, height:15, accentColor:'var(--moss)' }} />
          수입 제품
          <span style={{ fontSize:11, color:'var(--ink-faint)' }}>(ssrt크 시 CFS·외국 GMP 서류 추가)</span>
        </label>
      </div>

      {hasBoth && (
        <div style={{ marginBottom:18 }}>
          <label style={{ fontSize:12, fontWeight:600, color:'var(--ink-mute)', display:'block', marginBottom:8 }}>
            분야 구분 <span style={{ color:'#ef4444' }}>*</span>
            <span style={{ fontWeight:400, marginLeft:6 }}>— 이 품목은 전기·의료용품 양쪽에 해당됩니다</span>
          </label>
          <div style={{ display:'flex', gap:8 }}>
            {availableFields.map(f => (
              <button key={f} onClick={() => onChange({fieldType:f})} style={{
                padding:'7px 18px', borderRadius:6, fontSize:13, fontWeight:500, cursor:'pointer',
                border: form.fieldType===f ? '1px solid var(--moss)' : '1px solid var(--line)',
                background: form.fieldType===f ? 'var(--leaf-soft)' : 'transparent',
                color: form.fieldType===f ? 'var(--moss)' : 'var(--ink-mute)',
              }}>{f==='전기' ? '전기분야' : '의료용품분야'}</button>
            ))}
          </div>
        </div>
      )}

      {!form.productCode && (
        <div style={{
          background:'var(--amber-soft,#fef3c7)', borderRadius:8, padding:'10px 14px', marginBottom:20,
          fontSize:12, color:'#92400e', display:'flex', gap:8,
        }}>
          <Info size={14} style={{ flexShrink:0, marginTop:1 }} />
          목록에 없는 품목은 식약처 의료기기통합정보시스템(udiportal.mfds.go.kr)에서 분류번호를 확인 후 가장 유사한 품목을 선택하세요.
        </div>
      )}

      <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:8 }}>
        <button className="btn-ghost" onClick={onCancel}>취소</button>
        <button className="btn-primary" onClick={onNext} disabled={!canNext}
          style={{ display:'inline-flex', alignItems:'center', gap:6, opacity:canNext?1:.4, cursor:canNext?'pointer':'not-allowed' }}>
          다음 <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── Step 2: 본질적동등성 비교표 ─────────────────────────────────────────
function Step2({ form, onChange, onNext, onBack }) {
  const { comparison } = form

  function setCompare(key, value) {
    onChange({ comparison: { ...comparison, [key]: value } })
  }

  const classification = useMemo(() => {
    for (const item of COMPARE_ITEMS) {
      if (comparison[item.key] === false) return { code:item.code, label:item.classLabel }
    }
    const allAnswered = COMPARE_ITEMS.every(item => comparison[item.key] !== null)
    if (allAnswered) return { code:'동등', label:'동등 — 기허가 제품과 동등' }
    return null
  }, [comparison])

  useEffect(() => {
    if (classification) onChange({ classification:classification.code, classLabel:classification.label })
  }, [classification])

  const allAnswered = COMPARE_ITEMS.every(i => comparison[i.key] !== null)

  return (
    <div className="card-base" style={{ padding:28 }}>
      <p className="font-display" style={{ fontSize:15, fontWeight:600, marginBottom:4, color:'var(--ink)' }}>
        본질적동등품목 비교표
      </p>
      <p style={{ fontSize:12, color:'var(--ink-faint)', marginBottom:20 }}>
        KTL 양식 기반 · MFDS 의료기기 허가·신고·심사 규정 제2026-6호
      </p>

      <div style={{ background:'var(--amber-soft,#fef3c7)', borderRadius:8, padding:'12px 16px', marginBottom:20, fontSize:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, fontWeight:600, color:'#92400e', marginBottom:4 }}>
          <Info size={13} /> 기허가 제품 정보는 사용자가 직접 조회해야 합니다
        </div>
        <p style={{ color:'#78350f', lineHeight:1.6 }}>
          식약처&nbsp;
          <a href="https://udiportal.mfds.go.kr" target="_blank" rel="noreferrer"
            style={{ color:'#1d4ed8', textDecoration:'underline' }}>
            의료기기통합정보시스템
          </a>
          &nbsp;또는 의료기기 안전나라에서 비교 대상 기허가 제품의 품목명·허가번호를 확인 후 아래에 입력하세요.
        </p>
      </div>

      <p style={{ fontSize:12, fontWeight:600, color:'var(--ink-mute)', marginBottom:8 }}>기허가 제품 정보 (선택)</p>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:24 }}>
        {[
          { key:'compareName', ph:'품목명' },
          { key:'comparePermit', ph:'허가번호 (예: 신고제21-xxx)' },
          { key:'compareMfg', ph:'제조사' },
        ].map(f => (
          <input key={f.key} className="input-base" placeholder={f.ph}
            value={form[f.key]||''} onChange={e => onChange({[f.key]:e.target.value})} />
        ))}
      </div>

      <p style={{ fontSize:12, fontWeight:600, color:'var(--ink-mute)', marginBottom:8 }}>
        항목별 동등 여부 — 기허가 제품 대비 신청 제품
      </p>
      <div style={{ border:'1px solid var(--line)', borderRadius:8, overflow:'hidden', marginBottom:24 }}>
        <div style={{
          display:'grid', gridTemplateColumns:'1fr 160px', padding:'8px 16px',
          background:'var(--bg-soft,#f8f9fa)', fontSize:11, fontWeight:600, color:'var(--ink-faint)', letterSpacing:'0.05em',
        }}>
          <span>비교 항목</span>
          <span style={{ textAlign:'center' }}>기허가 제품과 동일?</span>
        </div>
        {COMPARE_ITEMS.map((item, i) => {
          const val = comparison[item.key]
          return (
            <div key={item.key} style={{
              display:'grid', gridTemplateColumns:'1fr 160px', padding:'12px 16px', alignItems:'center',
              borderTop: i>0 ? '1px solid var(--line)' : 'none',
              background: val===false ? 'rgba(239,68,68,.04)' : 'transparent',
            }}>
              <div>
                <span style={{ fontSize:13, fontWeight:500, color:'var(--ink)' }}>{item.label}</span>
                {val===false && (
                  <span style={{ fontSize:11, marginLeft:8, color:'var(--ink-faint)' }}>→ {item.classLabel}</span>
                )}
              </div>
              <div style={{ display:'flex', gap:4, justifyContent:'center' }}>
                <button onClick={() => setCompare(item.key, true)} style={{
                  padding:'5px 10px', fontSize:12, fontWeight:500, borderRadius:5, cursor:'pointer',
                  border: val===true ? '1px solid var(--moss)' : '1px solid var(--line)',
                  background: val===true ? 'var(--leaf-soft)' : 'transparent',
                  color: val===true ? 'var(--moss)' : 'var(--ink-mute)',
                }}>예</button>
                <button onClick={() => setCompare(item.key, false)} style={{
                  padding:'5px 10px', fontSize:12, fontWeight:500, borderRadius:5, cursor:'pointer',
                  border: val===false ? '1px solid #ef4444' : '1px solid var(--line)',
                  background: val===false ? '#fef2f2' : 'transparent',
                  color: val===false ? '#ef4444' : 'var(--ink-mute)',
                }}>아니오</button>
              </div>
            </div>
          )
        })}
      </div>

      {classification && (
        <div style={{
          borderRadius:8, padding:'14px 18px', marginBottom:20,
          background: clr(classification.code)+'18',
          border: '1px solid '+clr(classification.code)+'40',
          display:'flex', alignItems:'center', gap:10,
        }}>
          <Tag size={16} style={{ color:clr(classification.code), flexShrink:0 }} />
          <div>
            <p style={{ fontSize:12, fontWeight:600, color:'var(--ink-mute)', marginBottom:2 }}>자동 분류 결과</p>
            <p style={{ fontSize:14, fontWeight:700, color:clr(classification.code) }}>{classification.label}</p>
          </div>
        </div>
      )}

      <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
        <button className="btn-ghost" onClick={onBack}>← 이전</button>
        <button className="btn-primary" onClick={onNext} disabled={!allAnswered}
          style={{ display:'inline-flex', alignItems:'center', gap:6, opacity:allAnswered?1:.4, cursor:allAnswered?'pointer':'not-allowed' }}>
          다음 <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── Step 3: 필요 서류 목록 ───────────────────────────────────────────────
function Step3({ form, onChange, onSave, onBack }) {
  const [docStatus, setDocStatus] = useState({})
  const [docNotes, setDocNotes] = useState({})

  const docList = useMemo(() => {
    const { productCode, fieldType, classification, isImport } = form
    if (!productCode || !classification) return []

    const catData = REG_MATRIX[productCode]
    if (!catData) return []

    const fieldData = (fieldType && catData[fieldType]) ? catData[fieldType] : catData[Object.keys(catData)[0]]
    if (!fieldData) return []

    const rowKey = ROW_MAP[classification]
    const colVals = fieldData[rowKey]
    if (!colVals) return []

    const result = []
    DOC_COLS.forEach((col, i) => {
      const v = colVals[i]
      if (v===1 || v===2) result.push({ ...col, required:v })
    })

    if (isImport) {
      result.push({ key:'cfs', label:'수출국 자유판매증명서 (Certificate of Free Sale)', group:'수입', required:1 })
      result.push({ key:'gmp', label:'외국 제조소 GMP 인증서 또는 실태조사 결과서', group:'수입', required:1 })
    }
    return result
  }, [form])

  useEffect(() => {
    const list = docList.map(d => ({
      ...d, status: docStatus[d.key]||'pending', note: docNotes[d.key]||'',
    }))
    onChange({ docList:list })
  }, [docList, docStatus, docNotes])

  const setStatus = (key, val) => setDocStatus(s => ({ ...s, [key]:val }))
  const setNote   = (key, val) => setDocNotes(n => ({ ...n, [key]:val }))

  const GROUPS = ['공통','기본','안전','성능','임상','기타','수입']
  const grouped = GROUPS.reduce((acc, g) => {
    const items = docList.filter(d => d.group===g)
    if (items.length) acc[g] = items
    return acc
  }, {})

  const STATUS_BTNS = [
    { val:'pending', label:'준비중', color:'var(--amber,#f59e0b)', bg:'#fef3c7' },
    { val:'done',    label:'완료',   color:'var(--moss)',           bg:'var(--leaf-soft)' },
    { val:'na',      label:'해당없음',color:'var(--ink-faint)',     bg:'var(--bg-soft,#f8f9fa)' },
  ]

  return (
    <div className="card-base" style={{ padding:28 }}>
      <p className="font-display" style={{ fontSize:15, fontWeight:600, marginBottom:4, color:'var(--ink)' }}>
        필요 서류 목록
      </p>

      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:16 }}>
        <span style={{
          fontSize:12, padding:'3px 10px', borderRadius:4, fontWeight:600,
          background: clr(form.classification)+'20', color:clr(form.classification),
        }}>{form.classLabel || form.classification}</span>
        <span style={{ fontSize:12, padding:'3px 10px', borderRadius:4, background:'var(--bg-soft,#f8f9fa)', color:'var(--ink-mute)' }}>
          {form.productName}
        </span>
        {form.isImport && (
          <span style={{ fontSize:12, padding:'3px 10px', borderRadius:4, background:'#dbeafe', color:'#1d4ed8' }}>수입</span>
        )}
      </div>

      <div style={{ background:'var(--bg-soft,#f8f9fa)', borderRadius:8, padding:'10px 14px', marginBottom:20, fontSize:12, color:'var(--ink-faint)' }}>
        <strong style={{ color:'var(--ink)' }}>△ 품목별 판단</strong> 서류는 식약처 담당자 협의 후 제출 여부가 결정됩니다.
        각 서류의 준비 상태를 체크하고 저장하세요.
      </div>

      {docList.length===0
        ? (
          <p style={{ color:'var(--ink-faint)', fontSize:13, textAlign:'center', padding:'24px 0' }}>
            해당하는 서류가 없습니다. 이전 단계에서 분류 결과를 확인하세요.
          </p>
        )
        : Object.entries(grouped).map(([grp, items]) => (
          <div key={grp} style={{ marginBottom:20 }}>
            <p style={{
              fontSize:11, fontWeight:700, color:'var(--ink-faint)',
              letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:8,
            }}>{grp}</p>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {items.map(doc => {
                const st = docStatus[doc.key]||'pending'
                return (
                  <div key={doc.key} style={{
                    borderRadius:8, border:'1px solid var(--line)', padding:'12px 14px',
                    background: st==='na' ? 'var(--bg-soft,#f8f9fa)' : 'transparent',
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                      <span style={{
                        fontSize:13, flex:1,
                        color: st==='na' ? 'var(--ink-faint)' : 'var(--ink)',
                        fontWeight: st==='done' ? 500 : 400,
                      }}>
                        {doc.label}
                        {doc.required===1 && <span style={{ fontSize:10, color:'#ef4444', marginLeft:6, fontWeight:600 }}>○필수</span>}
                        {doc.required===2 && <span style={{ fontSize:10, color:'#b45309', marginLeft:6, fontWeight:600 }}>△품목별판단</span>}
                      </span>
                      <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                        {STATUS_BTNS.map(btn => (
                          <button key={btn.val} onClick={() => setStatus(doc.key, btn.val)} style={{
                            padding:'3px 9px', fontSize:11, fontWeight:500, borderRadius:4, cursor:'pointer',
                            border: st===btn.val ? '1px solid '+btn.color : '1px solid var(--line)',
                            background: st===btn.val ? btn.bg : 'transparent',
                            color: st===btn.val ? btn.color : 'var(--ink-faint)',
                          }}>{btn.label}</button>
                        ))}
                      </div>
                    </div>
                    <input className="input-base" placeholder="메모 (담당기관, 진행상황, 주의사항 등)"
                      value={docNotes[doc.key]||''} onChange={e => setNote(doc.key, e.target.value)}
                      style={{ fontSize:12, padding:'5px 10px' }} />
                  </div>
                )
              })}
            </div>
          </div>
        ))
      }

      <div style={{ display:'flex', justifyContent:'space-between', gap:8, marginTop:8 }}>
        <button className="btn-ghost" onClick={onBack}>← 이전</button>
        <button className="btn-primary" onClick={onSave}
          style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
          <Save size={14} /> 허가 현황에 저장
        </button>
      </div>
    </div>
  )
}
