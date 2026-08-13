// src/pages/dhf/DesignHistoryHub.jsx
// ISO 13485 §7.3 설계 및 개발 — 설계 이력 파일 (DHF) 허브
import React, { useState, useEffect, useMemo } from 'react'
import {
  Plus, X, Save, Edit2, Trash2, ChevronDown, ChevronUp,
  FileText, CheckCircle2, Clock, AlertTriangle, XCircle,
  Link2, FlaskConical, GitBranch, Package, Layers,
  ClipboardList, Users, Star, ArrowRight, BarChart2,
  Sparkles, Loader2,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { productDocs, TECH_DOC_CATEGORY } from '../../lib/productDocsState'
import { onboarding, productKeyOf } from '../../lib/onboardingState'
import { fileStore } from '../../lib/fileStore'
import { Paperclip } from 'lucide-react'

// ── 상수 ─────────────────────────────────────────────────────
const LS_KEY = 'qualytree.dhf'

const DEV_PHASES = [
  { key: 'planning',      label: '기획',        color: '#6366F1' },
  { key: 'input',         label: '설계 입력',   color: '#2563EB' },
  { key: 'output',        label: '설계 출력',   color: '#0891B2' },
  { key: 'review',        label: '설계 검토',   color: '#D97706' },
  { key: 'verification',  label: '설계 검증',   color: '#7C3AED' },
  { key: 'validation',    label: '설계 유효성 확인', color: '#059669' },
  { key: 'transfer',      label: '설계 이전',   color: '#DC2626' },
  { key: 'change',        label: '설계 변경',   color: '#F97316' },
]

const PHASE_MAP = Object.fromEntries(DEV_PHASES.map(p => [p.key, p]))

// 설계변경(change)은 설계이전 완료 후 상시 이어지는 변경관리 활동이므로 최초 개발 진행률(100%) 산정에서 제외한다.
const PROGRESS_PHASE_KEYS = DEV_PHASES.filter(p => p.key !== 'change').map(p => p.key)
// 기록 유형이 존재하는 단계 순서(기획 제외) — 승인된 기록이 있어야 다음 단계로 자동 진행된다.
const RECORD_PHASE_ORDER = ['input', 'output', 'review', 'verification', 'validation', 'transfer']

// 실제 승인된 기록을 기준으로 현재 단계를 자동 산출한다(수기 선택 대신 기록 입력에 따라 자동 진행 — #296).
function derivePhase(dhf) {
  const recs = dhf.records || []
  for (const key of RECORD_PHASE_ORDER) {
    const hasApproved = recs.some(r => r.type === key && r.status === 'approved')
    if (!hasApproved) return key
  }
  return 'change'
}

// 기록 추가 시 기본 기록유형을 산출한다. currentPhase는 진행률 표시를 위한 'planning'(기획) 값을 가질 수 있는데,
// 'planning'은 ITEM_TYPES(실제 기록유형)에 없는 값이므로 그대로 넘기면 폼/AI초안 생성이 깨진다(#299 버그 수정).
function defaultRecordType(dhf) {
  const phase = dhf.currentPhase
  if (phase === 'change') return 'change'
  if (RECORD_PHASE_ORDER.includes(phase)) return phase
  return 'input'
}

const DEVICE_CLASSES = ['Class I', 'Class II', 'Class IIa', 'Class IIb', 'Class III', '미분류']
const RECORD_STATUSES = ['open', 'in_review', 'approved', 'rejected']
const STATUS_META = {
  open:      { label: '작성 중',  color: '#6366F1', bg: '#EEF2FF' },
  in_review: { label: '검토 중',  color: '#D97706', bg: '#FEF3C7' },
  approved:  { label: '승인',     color: '#059669', bg: '#D1FAE5' },
  rejected:  { label: '반려',     color: '#DC2626', bg: '#FEE2E2' },
}

const ITEM_TYPES = {
  input:        { label: '설계 입력', icon: ClipboardList },
  output:       { label: '설계 출력', icon: FileText },
  review:       { label: '설계 검토', icon: Users },
  verification: { label: '설계 검증', icon: CheckCircle2 },
  validation:   { label: '유효성 확인', icon: FlaskConical },
  transfer:     { label: '설계 이전', icon: ArrowRight },
  change:       { label: '설계 변경', icon: GitBranch },
}

function genId() {
  return `DHF-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`
}
function recId() {
  return `REC-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`
}
function todayStr() { return new Date().toISOString().slice(0, 10) }

const EMPTY_RECORD = {
  type: 'input', title: '', description: '', author: '',
  reviewers: '', date: todayStr(), status: 'open',
  approver: '', approvedDate: '', linkedChangeId: '', linkedValId: '', notes: '',
  attachments: '',
}

const EMPTY_DHF = {
  productKey: '', productName: '', productCode: '', revision: 'A', deviceClass: 'Class II',
  intendedUse: '', targetPopulation: '', contraindications: '',
  projectManager: '', teamMembers: '', startDate: todayStr(), targetDate: '',
  currentPhase: 'planning', status: 'open', notes: '',
  records: [],
}

// ── 메인 ─────────────────────────────────────────────────────
// ── 기술문서(인허가 제출용) 패널 — 제품별 KGMP/수입 인허가 기술 자료 첨부 ──────
function TechDocsPanel({ canEdit }) {
  const ob = onboarding.load()
  const products = (Array.isArray(ob.products) && ob.products.length)
    ? ob.products
    : (ob.product && ob.product.name ? [ob.product] : [{ name: '기본 제품' }])

  const [productIdx, setProductIdx] = useState(0)
  const product = products[Math.min(productIdx, products.length - 1)] || products[0]
  const productKey = productKeyOf(product)

  const [docs, setDocs] = useState(() => productDocs.getTechDocs(productKey))
  const [busyCat, setBusyCat] = useState(null)

  function refresh(key) { setDocs(productDocs.getTechDocs(key)) }

  async function attach(category, file) {
    if (!file) return
    setBusyCat(category)
    try {
      const fileId = await fileStore.saveFile(file)
      const existing = docs.find((d) => d.category === category)
      if (existing) {
        productDocs.updateTechDoc(existing.id, { fileId, fileName: file.name })
      } else {
        productDocs.addTechDoc(productKey, { category, title: category, fileId, fileName: file.name })
      }
      refresh(productKey)
    } catch (e) {
      alert(e.message || '파일 첨부에 실패했습니다.')
    } finally {
      setBusyCat(null)
    }
  }

  function removeFile(category) {
    const existing = docs.find((d) => d.category === category)
    if (!existing) return
    productDocs.updateTechDoc(existing.id, { fileId: null, fileName: '' })
    refresh(productKey)
  }

  return (
    <div className="max-w-3xl">
      {products.length > 1 && (
        <div className="mb-4">
          <label className="text-[12px]" style={{ color: 'var(--ink-mute)' }}>
            제품 선택
            <select
              value={productIdx}
              onChange={(e) => { const idx = Number(e.target.value); setProductIdx(idx); refresh(productKeyOf(products[idx])) }}
              className="block mt-1 px-3 py-1.5 rounded-lg text-[13px]"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}
            >
              {products.map((p, i) => <option key={productKeyOf(p) + i} value={i}>{p.name || '제품 ' + (i + 1)}</option>)}
            </select>
          </label>
        </div>
      )}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
        {Object.values(TECH_DOC_CATEGORY).map((category, i) => {
          const doc = docs.find((d) => d.category === category)
          return (
            <div
              key={category}
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderTop: i === 0 ? 'none' : '1px solid var(--line)', background: 'var(--bg-card)' }}
            >
              <span className="text-[12.5px] font-medium flex-1 min-w-0" style={{ color: 'var(--ink)' }}>{category}</span>
              {doc?.fileId ? (
                <>
                  <span className="text-[11.5px] truncate max-w-[220px]" style={{ color: 'var(--moss)' }}>{doc.fileName || '첨부됨'}</span>
                  {canEdit && (
                    <button type="button" onClick={() => removeFile(category)} className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center" style={{ color: 'var(--ink-faint)' }} title="첨부 제거">
                      <X size={13} />
                    </button>
                  )}
                </>
              ) : (
                <span className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>미등록</span>
              )}
              {canEdit && (
                <label className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-medium cursor-pointer" style={{ background: 'var(--leaf-soft)', color: 'var(--moss)' }}>
                  <Paperclip size={12} />
                  {busyCat === category ? '업로드 중...' : doc?.fileId ? '재첨부' : '첨부'}
                  <input type="file" className="hidden" disabled={busyCat === category}
                    onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; attach(category, f) }} />
                </label>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function DesignHistoryHub({
  const navigate = useNavigate(); embedded = false, productKey: scopeProductKey = null, productLabel = '' } = {}) {
  const user = auth.current()
  const canEdit = user?.level >= 2
  const [searchParams] = useSearchParams()
  // #282-286,302: 제품공정(ProductsHub) 상세뷰에 임베드될 때는 해당 제품(productKey)의 DHF만 노출한다.
  const scopeKey = scopeProductKey || searchParams.get('productId') || null

  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
  })
  const [tab, setTab] = useState(() => searchParams.get('tab') || 'list')         // list | detail | techdocs | analysis
  const [selectedId, setSelectedId] = useState(null)

  // 특정 제품으로 스코프된 경우, 해당 제품의 DHF가 있으면 자동으로 상세보기로 진입한다.
  useEffect(() => {
    if (!scopeKey) return
    const mine = items.filter(d => d.productKey === scopeKey)
    if (mine.length === 1) { setSelectedId(mine[0].id); setTab('detail') }
    else if (mine.length === 0) { setTab('list') }
  }, [scopeKey, items])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_DHF)
  const [editId, setEditId] = useState(null)
  const [filterPhase, setFilterPhase] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')

  // Record 추가 상태
  const [showRecForm, setShowRecForm] = useState(false)
  const [recForm, setRecForm] = useState(EMPTY_RECORD)
  const [editRecIdx, setEditRecIdx] = useState(null)
  const [recTab, setRecTab] = useState('all')  // all | input | output | review | verification | validation | transfer | change

  function save(list) {
    setItems(list)
    localStorage.setItem(LS_KEY, JSON.stringify(list))
  }

  function submitDhf() {
    if (!form.productName.trim()) return alert('제품명을 입력하세요.')
    let next
    if (editId) {
      next = items.map(i => i.id === editId ? { ...i, ...form } : i)
    } else {
      next = [{ id: genId(), createdAt: todayStr(), ...form }, ...items]
    }
    save(next)
    setShowForm(false); setForm(EMPTY_DHF); setEditId(null)
  }

  function deleteDhf(id) {
    if (!confirm('DHF를 삭제하시겠습니까?')) return
    const next = items.filter(i => i.id !== id)
    save(next)
    if (selectedId === id) { setSelectedId(null); setTab('list') }
  }

  const selected = items.find(i => i.id === selectedId)

  function submitRec() {
    if (!recForm.title.trim()) return alert('제목을 입력하세요.')
    const next = items.map(dhf => {
      if (dhf.id !== selectedId) return dhf
      const recs = [...(dhf.records || [])]
      if (editRecIdx !== null) {
        recs[editRecIdx] = { ...recs[editRecIdx], ...recForm }
      } else {
        recs.push({ id: recId(), createdAt: todayStr(), ...recForm })
      }
      const updated = { ...dhf, records: recs }
      // 기록 저장 시마다 승인된 기록을 기준으로 현재 단계를 자동 재계산한다(#296).
      return { ...updated, currentPhase: derivePhase(updated) }
    })
    save(next)
    setShowRecForm(false); setRecForm(EMPTY_RECORD); setEditRecIdx(null)
  }

  function deleteRec(dhfId, idx) {
    if (!confirm('기록을 삭제하시겠습니까?')) return
    const next = items.map(dhf => {
      if (dhf.id !== dhfId) return dhf
      const recs = [...(dhf.records || [])]
      recs.splice(idx, 1)
      const updated = { ...dhf, records: recs }
      return { ...updated, currentPhase: derivePhase(updated) }
    })
    save(next)
  }

  function updatePhase(dhfId, phase) {
    const next = items.map(i => i.id === dhfId ? { ...i, currentPhase: phase } : i)
    save(next)
  }

  // 분석 데이터
  const analysis = useMemo(() => {
    const phaseCount = {}
    DEV_PHASES.forEach(p => phaseCount[p.key] = 0)
    const statusCount = { open: 0, in_review: 0, approved: 0, rejected: 0 }
    const classCount = {}
    items.forEach(d => {
      if (phaseCount[d.currentPhase] !== undefined) phaseCount[d.currentPhase]++
      if (statusCount[d.status] !== undefined) statusCount[d.status]++
      classCount[d.deviceClass] = (classCount[d.deviceClass] || 0) + 1
    })
    const overdueItems = items.filter(d => d.targetDate && new Date(d.targetDate) < new Date() && d.status !== 'approved')
    const pendingReview = items.flatMap(d => (d.records || []).filter(r => r.status === 'in_review').map(r => ({ dhf: d, rec: r })))
    return { phaseCount, statusCount, classCount, overdueItems, pendingReview }
  }, [items])

  // 필터
  const filtered = useMemo(() => items.filter(d => {
    if (scopeKey && d.productKey !== scopeKey) return false
    if (filterPhase !== 'all' && d.currentPhase !== filterPhase) return false
    if (filterStatus !== 'all' && d.status !== filterStatus) return false
    if (search && !d.productName.toLowerCase().includes(search.toLowerCase())
      && !d.productCode?.toLowerCase().includes(search.toLowerCase())
      && !d.id.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [items, scopeKey, filterPhase, filterStatus, search])

  // 선택된 DHF의 records 필터
  const filteredRecs = useMemo(() => {
    if (!selected) return []
    const recs = selected.records || []
    if (recTab === 'all') return recs
    return recs.filter(r => r.type === recTab)
  }, [selected, recTab])

  const recTypeCounts = useMemo(() => {
    if (!selected) return {}
    const recs = selected.records || []
    const counts = {}
    recs.forEach(r => { counts[r.type] = (counts[r.type] || 0) + 1 })
    return counts
  }, [selected])

  // 단계 진행률
  function phaseProgress(phase) {
    if (phase === 'change') return 100
    const idx = PROGRESS_PHASE_KEYS.indexOf(phase)
    return idx >= 0 ? Math.round(((idx + 1) / PROGRESS_PHASE_KEYS.length) * 100) : 0
  }

  const body = (
    <div className={embedded ? '' : 'px-6 lg:px-8 py-6 max-w-[1400px] mx-auto'}>

        {/* 탭 */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-soft)' }}>
          {[
            { key: 'list', label: `DHF 목록 (${items.length})` },
            { key: 'detail', label: '상세 보기', disabled: !selectedId },
            { key: 'techdocs', label: '기술문서(인허가)' },
            { key: 'analysis', label: '현황 분석' },
          ].map(t => (
            <button key={t.key}
              onClick={() => !t.disabled && setTab(t.key)}
              disabled={t.disabled}
              className="px-4 py-1.5 rounded-lg text-[13px] font-semibold transition"
              style={{
                background: tab === t.key ? 'var(--bg-card)' : 'transparent',
                color: t.disabled ? 'var(--ink-faint)' : tab === t.key ? 'var(--moss)' : 'var(--ink-soft)',
                boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                cursor: t.disabled ? 'not-allowed' : 'pointer', border: 'none',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── 기술문서(인허가) 탭 ── */}
        {tab === 'techdocs' && <TechDocsPanel canEdit={canEdit} />}

        {/* ── DHF 목록 탭 ── */}
        {tab === 'list' && (
          <div>
            {/* 툴바 */}
            <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="제품명 / 코드 / DHF번호 검색..."
                  className="px-3 py-1.5 rounded-xl text-[13px]"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', width: 220 }} />
                <select value={filterPhase} onChange={e => setFilterPhase(e.target.value)}
                  className="px-3 py-1.5 rounded-xl text-[13px]"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                  <option value="all">전체 단계</option>
                  {DEV_PHASES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  className="px-3 py-1.5 rounded-xl text-[13px]"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                  <option value="all">전체 상태</option>
                  {RECORD_STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                </select>
              </div>
              {canEdit && (
                <button onClick={() => { setForm({ ...EMPTY_DHF, productKey: scopeKey || '', productName: scopeKey ? productLabel : '' }); setEditId(null); setShowForm(true) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} /> DHF 신규 등록
                </button>
              )}
            </div>

            {/* DHF 폼 */}
            {showForm && (
              <DhfForm form={form} setForm={setForm} onSave={submitDhf}
                onCancel={() => { setShowForm(false); setForm(EMPTY_DHF); setEditId(null) }}
                isEdit={!!editId} />
            )}

            {/* 목록 */}
            {filtered.length === 0 ? (
              <div className="text-center py-20" style={{ color: 'var(--ink-faint)' }}>
                <Layers size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <div className="text-[14px]">등록된 DHF가 없습니다.</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(dhf => {
                  const meta = STATUS_META[dhf.status] || STATUS_META.open
                  const phase = PHASE_MAP[dhf.currentPhase]
                  const prog = phaseProgress(dhf.currentPhase)
                  const recCount = (dhf.records || []).length
                  const approvedRecs = (dhf.records || []).filter(r => r.status === 'approved').length
                  const overdue = dhf.targetDate && new Date(dhf.targetDate) < new Date() && dhf.status !== 'approved'

                  return (
                    <div key={dhf.id}
                      className="p-4 rounded-2xl cursor-pointer transition"
                      style={{ background: 'var(--bg-card)', border: `1.5px solid ${overdue ? '#FCA5A5' : 'var(--line)'}` }}
                      onClick={() => { setSelectedId(dhf.id); setTab('detail') }}>
                      {/* 헤더 */}
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="text-[13px] font-bold" style={{ color: 'var(--ink)' }}>{dhf.productName}</div>
                          <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{dhf.productCode} · Rev.{dhf.revision} · {dhf.deviceClass}</div>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                      </div>
                      {/* 단계 진행바 */}
                      <div className="mb-2">
                        <div className="flex justify-between text-[11px] mb-1" style={{ color: 'var(--ink-faint)' }}>
                          <span style={{ color: phase?.color, fontWeight: 700 }}>{phase?.label || dhf.currentPhase}</span>
                          <span>{prog}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--bg-soft)' }}>
                          <div className="h-1.5 rounded-full transition-all" style={{ width: `${prog}%`, background: phase?.color || 'var(--moss)' }} />
                        </div>
                      </div>
                      {/* 메타 */}
                      <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--ink-faint)' }}>
                        <span>기록 {approvedRecs}/{recCount}건 승인</span>
                        {dhf.targetDate && <span style={{ color: overdue ? '#DC2626' : 'var(--ink-faint)' }}>목표: {dhf.targetDate}</span>}
                      </div>
                      {overdue && <div className="text-[11px] mt-1" style={{ color: '#DC2626' }}>⚠ 목표일 초과</div>}
                      {/* 하단 버튼 */}
                      {canEdit && (
                        <div className="flex gap-1 mt-3" onClick={e => e.stopPropagation()}>
                          <button onClick={() => { setForm({ ...EMPTY_DHF, ...dhf }); setEditId(dhf.id); setShowForm(true); setTab('list') }}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px]"
                            style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink-soft)', cursor: 'pointer' }}>
                            <Edit2 size={11} /> 수정
                          </button>
                          <button onClick={() => deleteDhf(dhf.id)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px]"
                            style={{ background: '#FEE2E2', border: '1px solid #FECACA', color: '#DC2626', cursor: 'pointer' }}>
                            <Trash2 size={11} /> 삭제
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── 상세 보기 탭 ── */}
        {tab === 'detail' && selected && (
          <DetailView
            dhf={selected} canEdit={canEdit}
            showRecForm={showRecForm} setShowRecForm={setShowRecForm}
            recForm={recForm} setRecForm={setRecForm}
            editRecIdx={editRecIdx} setEditRecIdx={setEditRecIdx}
            submitRec={submitRec} deleteRec={deleteRec}
            recTab={recTab} setRecTab={setRecTab}
            filteredRecs={filteredRecs} recTypeCounts={recTypeCounts}
            updatePhase={updatePhase} phaseProgress={phaseProgress}
          />
        )}

        {/* ── 현황 분석 탭 ── */}
        {tab === 'analysis' && (
          <AnalysisView analysis={analysis} items={items} setSelectedId={setSelectedId} setTab={setTab} />
        )}
    </div>
  )

  if (embedded) return body

  return (
    <AppLayout user={user} title="설계 이력 파일 (DHF)" subtitle="ISO 13485 §7.3 설계 및 개발">
      {body}
    </AppLayout>
  )
}

// ── DHF 등록/수정 폼 ─────────────────────────────────────────
function DhfForm({ form, setForm, onSave, onCancel, isEdit }) {
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="mb-6 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>{isEdit ? 'DHF 수정' : 'DHF 신규 등록'}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <Field label="제품명 *" value={form.productName} onChange={v => F('productName', v)} />
        <Field label="제품 코드" value={form.productCode} onChange={v => F('productCode', v)} />
        <Field label="리비전" value={form.revision} onChange={v => F('revision', v)} />
        <FieldSelect label="기기 등급" value={form.deviceClass} onChange={v => F('deviceClass', v)} options={DEVICE_CLASSES.map(c => ({ value: c, label: c }))} />
        <Field label="시작일" type="date" value={form.startDate} onChange={v => F('startDate', v)} />
        <Field label="목표 완료일" type="date" value={form.targetDate} onChange={v => F('targetDate', v)} />
        <Field label="프로젝트 책임자" value={form.projectManager} onChange={v => F('projectManager', v)} />
        <Field label="팀원 (쉼표 구분)" value={form.teamMembers} onChange={v => F('teamMembers', v)} />
        <FieldSelect label="상태" value={form.status} onChange={v => F('status', v)}
          options={RECORD_STATUSES.map(s => ({ value: s, label: STATUS_META[s].label }))} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <FieldArea label="사용 목적 (Intended Use)" value={form.intendedUse} onChange={v => F('intendedUse', v)} rows={3} />
        <FieldArea label="대상 환자 / 금기사항" value={form.targetPopulation} onChange={v => F('targetPopulation', v)} rows={3} />
        <FieldArea label="비고" value={form.notes} onChange={v => F('notes', v)} rows={2} />
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
          style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
          <Save size={13} /> 저장
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-[13px]"
          style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
          취소
        </button>
      </div>
    </div>
  )
}

// ── 상세 뷰 ─────────────────────────────────────────────────
function DetailView({ dhf, canEdit, showRecForm, setShowRecForm, recForm, setRecForm, editRecIdx, setEditRecIdx,
  submitRec, deleteRec, recTab, setRecTab, filteredRecs, recTypeCounts, updatePhase, phaseProgress }) {

  const [showAiModal, setShowAiModal] = useState(false)
  const meta = STATUS_META[dhf.status] || STATUS_META.open
  const phase = PHASE_MAP[dhf.currentPhase]
  const prog = phaseProgress(dhf.currentPhase)

  return (
    <div>
      {/* DHF 헤더 카드 */}
      <div className="p-5 rounded-2xl mb-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[12px] font-mono" style={{ color: 'var(--ink-faint)' }}>{dhf.id}</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
            </div>
            <div className="text-[20px] font-bold" style={{ color: 'var(--ink)' }}>{dhf.productName}</div>
            <div className="text-[13px]" style={{ color: 'var(--ink-faint)' }}>{dhf.productCode} · Rev.{dhf.revision} · {dhf.deviceClass}</div>
          </div>
          <div className="text-right">
            <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>시작 {dhf.startDate}</div>
            {dhf.targetDate && <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>목표 {dhf.targetDate}</div>}
            <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>PM: {dhf.projectManager || '-'}</div>
          </div>
        </div>

        {/* 단계 진행 타임라인 */}
        <div className="mb-4">
          <div className="text-[12px] font-bold mb-2" style={{ color: 'var(--ink-soft)' }}>개발 단계 진행 현황</div>
          <div className="flex gap-1 flex-wrap">
            {DEV_PHASES.map((p, i) => {
              const isActive = dhf.currentPhase === p.key
              const isPast = DEV_PHASES.findIndex(x => x.key === dhf.currentPhase) > i
              return (
                <div key={p.key}
                  title="승인된 기록에 따라 자동으로 진행됩니다"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                  style={{
                    background: isActive ? p.color : isPast ? `${p.color}20` : 'var(--bg-soft)',
                    color: isActive ? '#fff' : isPast ? p.color : 'var(--ink-faint)',
                    border: `1px solid ${isActive ? p.color : isPast ? `${p.color}50` : 'var(--line)'}`,
                  }}>
                  {isPast && <CheckCircle2 size={10} />}
                  {p.label}
                </div>
              )
            })}
          </div>
          <div className="mt-2">
            <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-soft)' }}>
              <div className="h-1.5 rounded-full transition-all" style={{ width: `${prog}%`, background: phase?.color || 'var(--moss)' }} />
            </div>
          </div>
        </div>

        {/* 사용 목적 */}
        {dhf.intendedUse && (
          <div className="p-3 rounded-xl text-[12.5px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
            <span className="font-bold" style={{ color: 'var(--ink)' }}>사용 목적: </span>{dhf.intendedUse}
          </div>
        )}
      </div>

      {/* 추적성 매트릭스 — 설계입력→출력→검토→검증→유효성확인→이전 단계별 기록 커버리지 (#301) */}
      <div className="p-5 rounded-2xl mb-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="text-[13px] font-bold mb-1" style={{ color: 'var(--ink)' }}>추적성 매트릭스</div>
        <div className="text-[11.5px] mb-3" style={{ color: 'var(--ink-faint)' }}>ISO 13485 §7.3 설계 단계별 기록 승인 현황 — 단계 진행은 이 표의 승인 여부에 따라 자동으로 판단됩니다.</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: 'var(--bg-soft)' }}>
                {['단계', '기록 수', '승인 완료', '검토중/반려', '단계 상태'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--ink-soft)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RECORD_PHASE_ORDER.map((key, i) => {
                const recs = (dhf.records || []).filter(r => r.type === key)
                const approved = recs.filter(r => r.status === 'approved').length
                const pending = recs.length - approved
                const reached = RECORD_PHASE_ORDER.indexOf(dhf.currentPhase) > i || dhf.currentPhase === 'change'
                const isCurrent = dhf.currentPhase === key
                const meta = ITEM_TYPES[key]
                return (
                  <tr key={key} style={{ borderTop: '1px solid var(--line)' }}>
                    <td className="px-3 py-2 font-semibold" style={{ color: 'var(--ink)' }}>{meta.label}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--ink-soft)' }}>{recs.length}</td>
                    <td className="px-3 py-2 font-bold" style={{ color: approved > 0 ? '#059669' : 'var(--ink-faint)' }}>{approved}</td>
                    <td className="px-3 py-2" style={{ color: pending > 0 ? '#D97706' : 'var(--ink-faint)' }}>{pending}</td>
                    <td className="px-3 py-2">
                      {reached ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#D1FAE5', color: '#059669' }}>완료</span>
                      ) : isCurrent ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: '#D97706' }}>진행 중</span>
                      ) : (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>대기</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 기록 섹션 */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>설계 개발 기록 ({(dhf.records || []).length}건)</div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAiModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[12px] font-bold"
              style={{ background: '#F5F3FF', color: '#7C3AED', border: '1px solid #DDD6FE', cursor: 'pointer' }}>
              <Sparkles size={12} /> AI 초안 생성
            </button>
            <button onClick={() => { setRecForm({ ...EMPTY_RECORD, type: defaultRecordType(dhf) }); setEditRecIdx(null); setShowRecForm(true) }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[12px] font-bold"
              style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
              <Plus size={12} /> 기록 추가
            </button>
          </div>
        )}
      </div>

      {/* AI 초안 생성 모달 */}
      {showAiModal && (
        <DhfAiDraftModal
          dhf={dhf}
          defaultType={defaultRecordType(dhf)}
          onClose={() => setShowAiModal(false)}
          onUse={(draft) => {
            setRecForm({ ...EMPTY_RECORD, type: draft.type, title: draft.title, description: draft.description, notes: draft.notes || '' })
            setEditRecIdx(null)
            setShowAiModal(false)
            setShowRecForm(true)
          }}
        />
      )}

      {/* 기록 타입 탭 */}
      <div className="flex gap-1 flex-wrap mb-4">
        <RecTabBtn active={recTab === 'all'} onClick={() => setRecTab('all')} label={`전체 (${(dhf.records || []).length})`} />
        {Object.entries(ITEM_TYPES).map(([k, v]) => {
          const cnt = recTypeCounts[k] || 0
          return cnt > 0 ? (
            <RecTabBtn key={k} active={recTab === k} onClick={() => setRecTab(k)} label={`${v.label} (${cnt})`} />
          ) : null
        })}
      </div>

      {/* 기록 폼 */}
      {showRecForm && (
        <RecordForm form={recForm} setForm={setRecForm}
          onSave={submitRec}
          onCancel={() => { setShowRecForm(false); setRecForm(EMPTY_RECORD); setEditRecIdx(null) }}
          isEdit={editRecIdx !== null}
          allowedTypes={
            dhf.currentPhase === 'change'
              ? [...RECORD_PHASE_ORDER, 'change']
              // currentPhase가 'planning'(기획, 최초 상태)이면 indexOf가 -1이 되어 빈 배열이 나오는 버그가 있었다 —
              // 이 경우 최소 '설계 입력'은 선택 가능해야 한다(#299 버그 수정).
              : RECORD_PHASE_ORDER.slice(0, Math.max(1, RECORD_PHASE_ORDER.indexOf(dhf.currentPhase) + 1))
          } />
      )}

      {/* 기록 목록 */}
      {filteredRecs.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--ink-faint)' }}>
          <FileText size={28} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
          <div className="text-[13px]">기록이 없습니다.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecs.map((rec, idx) => {
            const typeInfo = ITEM_TYPES[rec.type]
            const TypeIcon = typeInfo?.icon || FileText
            const sMeta = STATUS_META[rec.status] || STATUS_META.open
            const realIdx = (dhf.records || []).findIndex(r => r.id === rec.id)
            return (
              <div key={rec.id} className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: 'var(--bg-soft)' }}>
                      <TypeIcon size={15} style={{ color: 'var(--moss)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[13px] font-bold" style={{ color: 'var(--ink)' }}>{rec.title}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>{typeInfo?.label}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: sMeta.bg, color: sMeta.color }}>{sMeta.label}</span>
                      </div>
                      {rec.description && <div className="text-[12px] mb-1" style={{ color: 'var(--ink-soft)' }}>{rec.description}</div>}
                      <div className="flex gap-3 text-[11px]" style={{ color: 'var(--ink-faint)' }}>
                        <span>작성: {rec.author || '-'} · {rec.date}</span>
                        {rec.reviewers && <span>검토: {rec.reviewers}</span>}
                        {rec.approver && <span>승인: {rec.approver} ({rec.approvedDate})</span>}
                      </div>
                      {(rec.linkedChangeId || rec.linkedValId) && (
                        <div className="flex gap-2 mt-1">
                          {rec.linkedChangeId && <span className="flex items-center gap-1 text-[11px]" style={{ color: '#7C3AED' }}><Link2 size={10} /> 변경 {rec.linkedChangeId}</span>}
                          {rec.linkedValId && <span className="flex items-center gap-1 text-[11px]" style={{ color: '#059669' }}><FlaskConical size={10} /> 밸리 {rec.linkedValId}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => { setRecForm({ ...EMPTY_RECORD, ...rec }); setEditRecIdx(realIdx); setShowRecForm(true) }}
                        className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                        <Edit2 size={12} style={{ color: 'var(--ink-soft)' }} />
                      </button>
                      <button onClick={() => deleteRec(dhf.id, realIdx)}
                        className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', border: '1px solid #FECACA', cursor: 'pointer' }}>
                        <Trash2 size={12} style={{ color: '#DC2626' }} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function RecTabBtn({ active, onClick, label }) {
  return (
    <button onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-[12px] font-semibold"
      style={{
        background: active ? 'var(--moss)' : 'var(--bg-card)',
        color: active ? '#fff' : 'var(--ink-soft)',
        border: `1px solid ${active ? 'var(--moss)' : 'var(--line)'}`,
        cursor: 'pointer',
      }}>
      {label}
    </button>
  )
}

// ── 기록 폼 ──────────────────────────────────────────────────
function RecordForm({ form, setForm, onSave, onCancel, isEdit, allowedTypes }) {
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const typeEntries = Object.entries(ITEM_TYPES).filter(([k]) => !allowedTypes || allowedTypes.includes(k))
  return (
    <div className="mb-4 p-4 rounded-2xl" style={{ background: 'var(--bg-soft)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>{isEdit ? '기록 수정' : '기록 추가'}</div>
      {!isEdit && (
        <div className="mb-2 text-[11px]" style={{ color: 'var(--ink-faint)' }}>
          ℹ 현재 단계까지의 기록 유형만 선택할 수 있습니다 — 이전 단계 기록을 먼저 승인 처리해야 다음 단계가 열립니다.
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <FieldSelect label="기록 유형 *" value={form.type} onChange={v => F('type', v)}
          options={typeEntries.map(([k, v]) => ({ value: k, label: v.label }))} />
        <Field label="제목 *" value={form.title} onChange={v => F('title', v)} />
        <FieldSelect label="상태" value={form.status} onChange={v => F('status', v)}
          options={RECORD_STATUSES.map(s => ({ value: s, label: STATUS_META[s].label }))} />
        <Field label="작성일" type="date" value={form.date} onChange={v => F('date', v)} />
        <Field label="작성자" value={form.author} onChange={v => F('author', v)} />
        <Field label="검토자 (쉼표 구분)" value={form.reviewers} onChange={v => F('reviewers', v)} />
        <Field label="승인자" value={form.approver} onChange={v => F('approver', v)} />
        <Field label="승인일" type="date" value={form.approvedDate} onChange={v => F('approvedDate', v)} />
        <Field label="연결 변경관리 ID" value={form.linkedChangeId} onChange={v => F('linkedChangeId', v)} placeholder="CHG-xxxx" />
        <Field label="연결 밸리데이션 ID" value={form.linkedValId} onChange={v => F('linkedValId', v)} placeholder="VAL-xxxx" />
        <Field label="첨부 문서 번호" value={form.attachments} onChange={v => F('attachments', v)} />
      </div>
      <FieldArea label="설명" value={form.description} onChange={v => F('description', v)} rows={3} />
      <FieldArea label="비고" value={form.notes} onChange={v => F('notes', v)} rows={2} />
      <div className="flex gap-2 mt-3">
        <button onClick={onSave} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold"
          style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
          <Save size={12} /> 저장
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-[12px]"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
          취소
        </button>
      </div>
    </div>
  )
}

// ── AI 초안 생성 모달 (기록 추가) ────────────────────────────
function DhfAiDraftModal({ dhf, defaultType, onClose, onUse }) {
  const [itemType, setItemType] = useState(defaultType || 'input')
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState(null)

  const generate = async () => {
    setLoading(true)
    setError('')
    setDraft(null)
    try {
      const r = await fetch('/api/dhf-draft', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          productName: dhf.productName || '',
          itemType,
          intendedUse: dhf.intendedUse || '',
          context: context.trim(),
        }),
      })
      const j = await r.json()
      if (!j.ok) {
        setError(j.message || 'AI 초안 생성에 실패했습니다.')
      } else {
        setDraft({ type: itemType, title: j.title, description: j.description, notes: j.notes })
      }
    } catch (e) {
      setError('AI 초안 생성 중 오류가 발생했습니다: ' + String((e && e.message) || e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '32px 16px', overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--line)',
          width: '100%', maxWidth: 640, boxShadow: '0 24px 64px rgba(0,0,0,0.3)', padding: 28,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-[16px] font-bold" style={{ color: 'var(--ink)' }}>
            <Sparkles size={18} style={{ color: '#7C3AED' }} /> DHF 기록 AI 초안 생성
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)' }}>
            <X size={20} />
          </button>
        </div>
        <div className="text-[12px] mb-5" style={{ color: 'var(--ink-faint)' }}>
          제품 정보와 선택한 설계 단계를 바탕으로 기록 제목·내용 초안을 생성합니다. 반드시 내용을 검토·수정한 뒤 저장하세요 — AI 초안은 참고용이며 최종 판단은 사용자 책임입니다.
        </div>

        <div className="space-y-3">
          <FieldSelect label="설계 단계 (기록 유형)" value={itemType} onChange={setItemType}
            options={Object.entries(ITEM_TYPES).map(([k, v]) => ({ value: k, label: v.label }))} />
          <FieldArea label="참고 내용 (선택 — 이 제품의 실제 특징을 적을수록 초안 품질이 좋아집니다)"
            value={context} onChange={setContext} rows={3}
            placeholder="예: 손목형 산소포화도 측정기, 블루투스로 앱 연동, 재사용 가능한 실리콘 밴드 사용" />
          {error && (
            <div className="text-[12.5px] px-3 py-2 rounded-lg" style={{ background: '#FEE2E2', color: '#991B1B' }}>{error}</div>
          )}
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[13px] font-semibold"
            style={{ background: '#7C3AED', color: 'white', border: 'none', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {loading ? '생성 중...' : '초안 생성'}
          </button>
        </div>

        {draft && (
          <div className="mt-5">
            <div className="text-[11px] font-mono tracking-wider mb-2" style={{ color: 'var(--ink-faint)' }}>
              제안된 초안 — 사용하려면 아래 카드를 클릭하면 등록 폼에 채워집니다
            </div>
            <button
              onClick={() => onUse(draft)}
              className="w-full text-left p-3.5 rounded-xl transition"
              style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}
            >
              <div className="text-[10px] font-mono px-1.5 py-0.5 rounded inline-block mb-1" style={{ background: 'var(--bg-card)', color: 'var(--ink-faint)' }}>
                {ITEM_TYPES[draft.type]?.label || draft.type}
              </div>
              <div className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{draft.title}</div>
              <div className="text-[12px] mt-1 whitespace-pre-wrap" style={{ color: 'var(--ink-soft)' }}>{draft.description}</div>
              {draft.notes && (
                <div className="text-[11.5px] mt-1" style={{ color: 'var(--ink-faint)' }}>비고: {draft.notes}</div>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 현황 분석 ─────────────────────────────────────────────────
function AnalysisView({ analysis, items, setSelectedId, setTab }) {
  const maxPhase = Math.max(...Object.values(analysis.phaseCount), 1)
  const maxStatus = Math.max(...Object.values(analysis.statusCount), 1)

  return (
    <div className="space-y-5">
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 16px',background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:8}}>
        <span style={{fontSize:13,color:'#1e40af'}}>📋 DHF 등록·수정은 제품·설계개발 메뉴에서 진행합니다.</span>
        <button onClick={()=>navigate('/products')} style={{fontSize:12,padding:'4px 12px',background:'#2563EB',color:'#fff',border:'none',borderRadius:6,cursor:'pointer'}}>→ 제품·설계개발</button>
      </div>
      {/* KPI 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniKpi label="전체 DHF" value={items.length} />
        <MiniKpi label="진행 중" value={analysis.statusCount.in_review + analysis.statusCount.open}
          warn={(analysis.statusCount.in_review + analysis.statusCount.open) > 5} />
        <MiniKpi label="목표일 초과" value={analysis.overdueItems.length} bad={analysis.overdueItems.length > 0} />
        <MiniKpi label="검토 대기 기록" value={analysis.pendingReview.length} warn={analysis.pendingReview.length > 0} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 단계별 분포 */}
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>개발 단계별 DHF 현황</div>
          <div className="space-y-2">
            {DEV_PHASES.map(p => {
              const cnt = analysis.phaseCount[p.key] || 0
              return (
                <div key={p.key} className="flex items-center gap-3">
                  <span className="text-[11px] w-24 flex-shrink-0" style={{ color: 'var(--ink-soft)' }}>{p.label}</span>
                  <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ background: 'var(--bg-soft)' }}>
                    <div className="h-4 rounded-full" style={{ width: `${(cnt / maxPhase) * 100}%`, background: p.color, minWidth: cnt > 0 ? 12 : 0 }} />
                  </div>
                  <span className="text-[12px] font-bold w-5 text-right" style={{ color: 'var(--ink)' }}>{cnt}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* 상태별 */}
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>상태별 DHF 현황</div>
          <div className="space-y-2">
            {RECORD_STATUSES.map(s => {
              const cnt = analysis.statusCount[s] || 0
              const sm = STATUS_META[s]
              return (
                <div key={s} className="flex items-center gap-3">
                  <span className="text-[11px] w-16 flex-shrink-0" style={{ color: sm.color, fontWeight: 600 }}>{sm.label}</span>
                  <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ background: 'var(--bg-soft)' }}>
                    <div className="h-4 rounded-full" style={{ width: `${(cnt / maxStatus) * 100}%`, background: sm.color, minWidth: cnt > 0 ? 12 : 0 }} />
                  </div>
                  <span className="text-[12px] font-bold w-5 text-right" style={{ color: 'var(--ink)' }}>{cnt}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 목표일 초과 */}
      {analysis.overdueItems.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
          <div className="text-[13px] font-bold mb-3" style={{ color: '#DC2626' }}>⚠ 목표일 초과 DHF</div>
          <div className="space-y-2">
            {analysis.overdueItems.map(d => (
              <div key={d.id} className="flex items-center justify-between p-2 rounded-lg cursor-pointer"
                style={{ background: '#FFF5F5', border: '1px solid #FECACA' }}
                onClick={() => { setSelectedId(d.id); setTab('detail') }}>
                <div>
                  <span className="text-[13px] font-bold" style={{ color: '#991B1B' }}>{d.productName}</span>
                  <span className="text-[11px] ml-2" style={{ color: '#DC2626' }}>{d.id}</span>
                </div>
                <div className="text-[11px]" style={{ color: '#DC2626' }}>목표: {d.targetDate}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 검토 대기 기록 */}
      {analysis.pendingReview.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[13px] font-bold mb-3" style={{ color: '#D97706' }}>검토 대기 기록</div>
          <div className="space-y-2">
            {analysis.pendingReview.slice(0, 10).map(({ dhf, rec }) => (
              <div key={rec.id} className="flex items-center justify-between p-2 rounded-lg cursor-pointer"
                style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
                onClick={() => { setSelectedId(dhf.id); setTab('detail') }}>
                <div>
                  <span className="text-[12px] font-bold" style={{ color: '#92400E' }}>{rec.title}</span>
                  <span className="text-[11px] ml-2" style={{ color: '#D97706' }}>{ITEM_TYPES[rec.type]?.label}</span>
                </div>
                <div className="text-[11px]" style={{ color: '#D97706' }}>{dhf.productName}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MiniKpi({ label, value, warn, bad }) {
  const color = bad ? '#DC2626' : warn ? '#D97706' : 'var(--ink)'
  const bg = bad ? '#FEE2E2' : warn ? '#FEF3C7' : 'var(--bg-card)'
  const border = bad ? '#FECACA' : warn ? '#FDE68A' : 'var(--line)'
  return (
    <div className="p-4 rounded-2xl text-center" style={{ background: bg, border: `1px solid ${border}` }}>
      <div className="text-[26px] font-bold" style={{ color }}>{value}</div>
      <div className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>{label}</div>
    </div>
  )
}

// ── 공용 입력 컴포넌트 ────────────────────────────────────────
function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-1.5 rounded-xl text-[13px]"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
    </div>
  )
}
function FieldSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <select value={value || ''} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-1.5 rounded-xl text-[13px]"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
function FieldArea({ label, value, onChange, rows = 3, placeholder }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
        className="w-full px-3 py-1.5 rounded-xl text-[13px] resize-none"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
    </div>
  )
}
