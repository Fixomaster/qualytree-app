import React, { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle, CheckCircle2, Clock, Package, FileWarning,
  ChevronDown, ChevronUp, Plus, Search, Filter, BarChart2,
  ArrowRight, RefreshCw, Trash2, Edit2, XCircle, ShieldAlert,
  AlertCircle, Info
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import { ncr, NCR_STATUS, NCR_STATUS_LABEL, NCR_SEVERITY } from '../../lib/ncrState'
import { quarantine, QUARANTINE_STATUS, QUARANTINE_STATUS_LABEL } from '../../lib/quarantine'
import { permissions } from '../../lib/permissions'

/* ───────────────── 상수 ───────────────── */
const SEVERITY_CONFIG = {
  Critical: { label: 'Critical', color: '#DC2626', bg: '#FEF2F2', icon: ShieldAlert },
  Major:    { label: 'Major',    color: '#D97706', bg: '#FFFBEB', icon: AlertTriangle },
  Minor:    { label: 'Minor',    color: '#2563EB', bg: '#EFF6FF', icon: Info },
}
const STATUS_CONFIG = {
  open:          { label: '접수',     color: '#6B7280', bg: '#F3F4F6' },
  investigating: { label: '조사 중',  color: '#D97706', bg: '#FFFBEB' },
  contained:     { label: '격리됨',   color: '#7C3AED', bg: '#F5F3FF' },
  corrected:     { label: '처리 완료',color: '#059669', bg: '#ECFDF5' },
  closed:        { label: '종결',     color: '#374151', bg: '#E5E7EB' },
}
const SOURCE_LABELS = {
  iqc: '수입검사', oos: '공정이탈', manual: '수동 등록',
  customer: '고객불만', audit: '내부심사', final: '최종검사', other: '기타',
}
const DISPOSITION_LABELS = {
  rework: '재작업', retest: '재검사', 'use-as-is': '특채(Use-as-is)',
  scrap: '폐기', pending: '처분 대기',
}
const TABS = [
  { id: 'list',       label: 'NCR 목록',   icon: FileWarning },
  { id: 'quarantine', label: '격리·처분',  icon: Package },
  { id: 'analysis',   label: '현황 분석',  icon: BarChart2 },
]

/* ───────────────── 유틸 ───────────────── */
const badge = (cfg, text) => (
  <span style={{
    display:'inline-flex', alignItems:'center', gap:3,
    fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:9999,
    background: cfg.bg, color: cfg.color
  }}>{text}</span>
)

function EmptyState({ icon: Icon, text }) {
  return (
    <div style={{ textAlign:'center', padding:'48px 0', color:'#9CA3AF' }}>
      <Icon size={36} style={{ margin:'0 auto 12px', opacity:.4 }} />
      <p style={{ fontSize:14 }}>{text}</p>
    </div>
  )
}

/* ───────────────── NCR 등록 폼 ───────────────── */
function NcrForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {
    title: '', description: '', severity: 'Major',
    source: 'manual', detectedAt: new Date().toISOString().slice(0,10),
    productLot: '', relatedWo: '', disposition: 'pending',
    rootCause: '', correctiveAction: '',
  })
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const field = (label, key, type='text', opts=null) => (
    <div>
      <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:4 }}>{label}</label>
      {opts
        ? <select value={form[key]} onChange={set(key)} style={inputSt}>{opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
        : <input type={type} value={form[key]} onChange={set(key)} style={inputSt} />}
    </div>
  )
  return (
    <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:10, padding:20, marginBottom:16 }}>
      <h3 style={{ fontSize:14, fontWeight:700, color:'#111827', marginBottom:16 }}>
        {initial ? 'NCR 수정' : '신규 NCR 등록'}
      </h3>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div style={{ gridColumn:'span 2' }}>
          <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:4 }}>제목 *</label>
          <input value={form.title} onChange={set('title')} style={inputSt} placeholder="부적합 내용을 간략히 입력" />
        </div>
        <div style={{ gridColumn:'span 2' }}>
          <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:4 }}>상세 내용</label>
          <textarea value={form.description} onChange={set('description')} rows={3}
            style={{ ...inputSt, resize:'vertical' }} placeholder="부적합 상세 내용, 발견 경위 등" />
        </div>
        {field('심각도', 'severity', 'text', [['Critical','Critical — 즉시 격리'],['Major','Major — 중요 조치'],['Minor','Minor — 경미']])}
        {field('발생 구분', 'source', 'text', Object.entries(SOURCE_LABELS))}
        {field('발견일', 'detectedAt', 'date')}
        {field('관련 제품/LOT', 'productLot')}
        {field('관련 작업지시', 'relatedWo')}
        {field('처분 방향', 'disposition', 'text', Object.entries(DISPOSITION_LABELS))}
        <div style={{ gridColumn:'span 2' }}>
          <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:4 }}>근본 원인</label>
          <textarea value={form.rootCause} onChange={set('rootCause')} rows={2}
            style={{ ...inputSt, resize:'vertical' }} placeholder="원인 분석 결과 (5-Why, Fishbone 등)" />
        </div>
        <div style={{ gridColumn:'span 2' }}>
          <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:4 }}>시정조치</label>
          <textarea value={form.correctiveAction} onChange={set('correctiveAction')} rows={2}
            style={{ ...inputSt, resize:'vertical' }} placeholder="취한 조치 또는 계획" />
        </div>
      </div>
      <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:16 }}>
        <button onClick={onCancel} style={btnSecondary}>취소</button>
        <button onClick={() => form.title.trim() && onSave(form)} style={btnPrimary}>
          {initial ? '수정 저장' : 'NCR 등록'}
        </button>
      </div>
    </div>
  )
}

/* ───────────────── NCR 카드 ───────────────── */
function NcrCard({ item, onExpand, expanded, onEdit, onAdvance, canEdit }) {
  const sev = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.Minor
  const sta = STATUS_CONFIG[item.status] || STATUS_CONFIG.open
  const SevIcon = sev.icon
  return (
    <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:10, marginBottom:8, overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', cursor:'pointer' }}
           onClick={onExpand}>
        <SevIcon size={16} style={{ color: sev.color, flexShrink:0 }} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <span style={{ fontSize:12, fontWeight:700, color:'#6B7280', fontFamily:'monospace' }}>{item.id}</span>
            {badge(sev, sev.label)}
            {badge(sta, sta.label)}
            {item.source && <span style={{ fontSize:11, color:'#9CA3AF' }}>{SOURCE_LABELS[item.source] || item.source}</span>}
          </div>
          <p style={{ fontSize:13, fontWeight:600, color:'#111827', margin:'4px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {item.title}
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
          <span style={{ fontSize:11, color:'#9CA3AF' }}>{item.detectedAt?.slice(0,10)}</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop:'1px solid #F3F4F6', padding:'14px 16px', background:'#FAFAFA' }}>
          {item.description && <p style={{ fontSize:13, color:'#374151', marginBottom:12 }}>{item.description}</p>}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
            {item.productLot && <InfoRow label="관련 제품/LOT" val={item.productLot} />}
            {item.relatedWo  && <InfoRow label="작업지시" val={item.relatedWo} />}
            {item.disposition && <InfoRow label="처분 방향" val={DISPOSITION_LABELS[item.disposition] || item.disposition} />}
            {item.detectedBy && <InfoRow label="발견자" val={item.detectedBy} />}
          </div>
          {item.rootCause && (
            <div style={{ marginBottom:8 }}>
              <p style={{ fontSize:11, fontWeight:700, color:'#6B7280', marginBottom:2 }}>근본 원인</p>
              <p style={{ fontSize:13, color:'#374151' }}>{item.rootCause}</p>
            </div>
          )}
          {item.correctiveAction && (
            <div style={{ marginBottom:12 }}>
              <p style={{ fontSize:11, fontWeight:700, color:'#6B7280', marginBottom:2 }}>시정조치</p>
              <p style={{ fontSize:13, color:'#374151' }}>{item.correctiveAction}</p>
            </div>
          )}
          {canEdit && (
            <div style={{ display:'flex', gap:6 }}>
              {item.status !== 'closed' && (
                <button onClick={() => onAdvance(item)} style={btnSmall}>
                  <ArrowRight size={12} /> 다음 단계
                </button>
              )}
              <button onClick={() => onEdit(item)} style={btnSmall}>
                <Edit2 size={12} /> 수정
              </button>
              <Link to={`/improvement?tab=capa&ncr=${item.id}`}
                style={{ ...btnSmall, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:4 }}>
                <ArrowRight size={12} /> CAPA 연결
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
function InfoRow({ label, val }) {
  return (
    <div>
      <span style={{ fontSize:11, fontWeight:600, color:'#9CA3AF' }}>{label}</span>
      <p style={{ fontSize:13, color:'#374151', margin:'2px 0 0' }}>{val}</p>
    </div>
  )
}

/* ───────────────── 현황 분석 탭 ───────────────── */
function AnalysisTab({ items }) {
  const total = items.length
  const bySev = Object.keys(SEVERITY_CONFIG).map(k => ({ key:k, count: items.filter(i=>i.severity===k).length }))
  const bySta = Object.keys(STATUS_CONFIG).map(k => ({ key:k, count: items.filter(i=>i.status===k).length }))
  const open  = items.filter(i => i.status !== 'closed').length
  const StatCard = ({ label, value, color }) => (
    <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:10, padding:16, textAlign:'center' }}>
      <p style={{ fontSize:28, fontWeight:800, color: color || '#111827', margin:0 }}>{value}</p>
      <p style={{ fontSize:12, color:'#6B7280', margin:'4px 0 0' }}>{label}</p>
    </div>
  )
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        <StatCard label="전체 NCR" value={total} />
        <StatCard label="진행 중" value={open} color="#D97706" />
        <StatCard label="Critical" value={bySev.find(b=>b.key==='Critical')?.count||0} color="#DC2626" />
        <StatCard label="종결" value={bySta.find(b=>b.key==='closed')?.count||0} color="#059669" />
      </div>
      <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:10, padding:16 }}>
        <h4 style={{ fontSize:13, fontWeight:700, color:'#374151', marginBottom:12 }}>심각도별 현황</h4>
        {bySev.map(({ key, count }) => {
          const cfg = SEVERITY_CONFIG[key]
          const pct = total ? Math.round(count/total*100) : 0
          return (
            <div key={key} style={{ marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}>
                <span style={{ fontWeight:600, color: cfg.color }}>{cfg.label}</span>
                <span style={{ color:'#6B7280' }}>{count}건 ({pct}%)</span>
              </div>
              <div style={{ background:'#F3F4F6', borderRadius:4, height:8 }}>
                <div style={{ background: cfg.color, borderRadius:4, height:8, width: pct+'%', transition:'width .3s' }} />
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:10, padding:16 }}>
        <h4 style={{ fontSize:13, fontWeight:700, color:'#374151', marginBottom:12 }}>처리 상태별 현황</h4>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          {bySta.map(({ key, count }) => {
            const cfg = STATUS_CONFIG[key]
            return (
              <div key={key} style={{ background: cfg.bg, borderRadius:8, padding:'10px 12px', textAlign:'center' }}>
                <p style={{ fontSize:20, fontWeight:800, color: cfg.color, margin:0 }}>{count}</p>
                <p style={{ fontSize:11, color: cfg.color, margin:'2px 0 0' }}>{cfg.label}</p>
              </div>
            )
          })}
        </div>
      </div>
      <div style={{ background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:10, padding:14 }}>
        <p style={{ fontSize:12, color:'#1D4ED8', margin:0 }}>
          💡 CAPA·시정조치는 <Link to="/improvement?tab=capa" style={{ fontWeight:700 }}>CAPA·개선</Link> 메뉴,
          변경 이력(CCR)은 <Link to="/change-control" style={{ fontWeight:700 }}>변경 관리</Link> 메뉴에서 확인하세요.
        </p>
      </div>
    </div>
  )
}

/* ───────────────── 격리·처분 탭 ───────────────── */
function QuarantineTab({ canEdit }) {
  const items = quarantine.loadAll()
  if (!items.length) return <EmptyState icon={Package} text="격리된 제품이 없습니다" />
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {items.map(q => {
        const sta = QUARANTINE_STATUS_LABEL?.[q.status] || q.status
        return (
          <div key={q.id} style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:10, padding:'12px 16px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <span style={{ fontSize:12, fontWeight:700, color:'#6B7280', fontFamily:'monospace' }}>{q.id}</span>
                <p style={{ fontSize:13, fontWeight:600, color:'#111827', margin:'4px 0 0' }}>
                  {q.productLot || q.description || '—'}
                </p>
              </div>
              <span style={{ fontSize:12, fontWeight:600, padding:'3px 10px', borderRadius:9999,
                background:'#FEF2F2', color:'#DC2626' }}>{sta}</span>
            </div>
            {q.ncrId && (
              <p style={{ fontSize:11, color:'#9CA3AF', margin:'6px 0 0' }}>
                연결 NCR: <span style={{ fontWeight:600 }}>{q.ncrId}</span>
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ───────────────── 스타일 상수 ───────────────── */
const inputSt = {
  width:'100%', padding:'7px 10px', fontSize:13, border:'1px solid #D1D5DB',
  borderRadius:6, outline:'none', boxSizing:'border-box', background:'#fff',
}
const btnPrimary = {
  display:'inline-flex', alignItems:'center', gap:6, padding:'7px 16px', fontSize:13,
  fontWeight:600, background:'#1D4ED8', color:'#fff', border:'none', borderRadius:7, cursor:'pointer',
}
const btnSecondary = {
  display:'inline-flex', alignItems:'center', gap:6, padding:'7px 16px', fontSize:13,
  fontWeight:600, background:'#F3F4F6', color:'#374151', border:'1px solid #D1D5DB', borderRadius:7, cursor:'pointer',
}
const btnSmall = {
  display:'inline-flex', alignItems:'center', gap:4, padding:'4px 10px', fontSize:12,
  fontWeight:600, background:'#F3F4F6', color:'#374151', border:'1px solid #D1D5DB', borderRadius:6, cursor:'pointer',
}

/* ───────────────── 메인 컴포넌트 ───────────────── */
export default function QualityHub() {
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState(searchParams.get('tab') || 'list')
  const [search, setSearch] = useState('')
  const [sevFilter, setSevFilter] = useState('all')
  const [staFilter, setStaFilter] = useState('all')
  const [expandedId, setExpandedId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)

  const user = auth.current()
  const canEdit = permissions.canEdit?.(user) ?? true

  // 상태 업데이트 트리거용
  const [tick, setTick] = useState(0)
  const refresh = () => setTick(t => t+1)

  const allItems = useMemo(() => ncr.loadAll ? ncr.loadAll() : [], [tick])

  const filtered = useMemo(() => allItems.filter(i => {
    if (sevFilter !== 'all' && i.severity !== sevFilter) return false
    if (staFilter !== 'all' && i.status !== staFilter) return false
    if (search && !i.title?.toLowerCase().includes(search.toLowerCase()) &&
        !i.id?.toLowerCase().includes(search.toLowerCase()) &&
        !i.productLot?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [allItems, sevFilter, staFilter, search])

  const STATUS_NEXT = { open:'investigating', investigating:'contained', contained:'corrected', corrected:'closed' }

  function handleSave(form) {
    if (editItem) {
      ncr.updateStatus(editItem.id, form.status || editItem.status)
      if (form.rootCause || form.correctiveAction) {
        ncr.setInvestigationReport(editItem.id, { rootCauseSummary: form.rootCause || '', conclusion: form.correctiveAction || '' })
      }
    } else {
      ncr.raise({ title: form.title, description: form.description, severity: form.severity, source: { type: form.source } })
    }
    setShowForm(false)
    setEditItem(null)
    refresh()
  }

  function handleAdvance(item) {
    const next = STATUS_NEXT[item.status]
    if (next) { ncr.updateStatus(item.id, next); refresh() }
  }

  return (
    <AppLayout>
      <div style={{ maxWidth:860, margin:'0 auto', padding:'24px 16px' }}>
        {/* 헤더 */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:800, color:'#111827', margin:0 }}>NCR · 부적합 관리</h1>
            <p style={{ fontSize:13, color:'#6B7280', margin:'4px 0 0' }}>ISO 13485 §8.3 — 부적합 제품의 통제</p>
          </div>
          {canEdit && tab === 'list' && !showForm && (
            <button onClick={() => { setShowForm(true); setEditItem(null) }} style={btnPrimary}>
              <Plus size={14} /> NCR 등록
            </button>
          )}
        </div>

        {/* 탭 */}
        <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:'2px solid #E5E7EB', paddingBottom:0 }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)} style={{
              display:'inline-flex', alignItems:'center', gap:6,
              padding:'8px 14px', fontSize:13, fontWeight: tab===id ? 700 : 500,
              color: tab===id ? '#1D4ED8' : '#6B7280',
              background:'none', border:'none', cursor:'pointer',
              borderBottom: tab===id ? '2px solid #1D4ED8' : '2px solid transparent',
              marginBottom:-2,
            }}>
              <Icon size={14} />{label}
              {id==='list' && allItems.filter(i=>i.status!=='closed').length > 0 && (
                <span style={{ background:'#EF4444', color:'#fff', borderRadius:9999,
                  fontSize:10, fontWeight:800, padding:'1px 6px', marginLeft:2 }}>
                  {allItems.filter(i=>i.status!=='closed').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* NCR 목록 탭 */}
        {tab === 'list' && (
          <div>
            {(showForm || editItem) && (
              <NcrForm
                initial={editItem}
                onSave={handleSave}
                onCancel={() => { setShowForm(false); setEditItem(null) }}
              />
            )}
            {/* 필터바 */}
            <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
              <div style={{ position:'relative', flex:1, minWidth:160 }}>
                <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF' }} />
                <input value={search} onChange={e=>setSearch(e.target.value)}
                  placeholder="NCR번호, 제목, LOT 검색" style={{ ...inputSt, paddingLeft:32 }} />
              </div>
              <select value={sevFilter} onChange={e=>setSevFilter(e.target.value)} style={{ ...inputSt, width:'auto' }}>
                <option value="all">전체 심각도</option>
                {Object.entries(SEVERITY_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
              <select value={staFilter} onChange={e=>setStaFilter(e.target.value)} style={{ ...inputSt, width:'auto' }}>
                <option value="all">전체 상태</option>
                {Object.entries(STATUS_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>

            {/* 목록 */}
            {filtered.length === 0
              ? <EmptyState icon={FileWarning} text={search||sevFilter!=='all'||staFilter!=='all' ? '검색 결과가 없습니다' : 'NCR이 없습니다. 등록 버튼으로 추가하세요'} />
              : filtered.map(item => (
                <NcrCard key={item.id} item={item}
                  expanded={expandedId === item.id}
                  onExpand={() => setExpandedId(expandedId===item.id ? null : item.id)}
                  onEdit={i => { setEditItem(i); setShowForm(false); window.scrollTo(0,0) }}
                  onAdvance={handleAdvance}
                  canEdit={canEdit}
                />
              ))
            }
          </div>
        )}

        {/* 격리·처분 탭 */}
        {tab === 'quarantine' && <QuarantineTab canEdit={canEdit} />}

        {/* 현황 분석 탭 */}
        {tab === 'analysis' && <AnalysisTab items={allItems} />}
      </div>
    </AppLayout>
  )
}
