// src/pages/dhf/DesignHistoryHub.jsx
// ISO 13485 §7.3 설계 및 개발 — 설계 이력 파일 (DHF) 허브
import React, { useState, useEffect, useMemo } from 'react'
import {
  Plus, X, Save, Edit2, Trash2, ChevronDown, ChevronUp,
  FileText, CheckCircle2, Clock, AlertTriangle, XCircle,
  Link2, FlaskConical, GitBranch, Package, Layers,
  ClipboardList, Users, Star, ArrowRight, BarChart2,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'

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
  productName: '', productCode: '', revision: 'A', deviceClass: 'Class II',
  intendedUse: '', targetPopulation: '', contraindications: '',
  projectManager: '', teamMembers: '', startDate: todayStr(), targetDate: '',
  currentPhase: 'planning', status: 'open', notes: '',
  records: [],
}

// ── 메인 ─────────────────────────────────────────────────────
export default function DesignHistoryHub() {
  const user = auth.current()
  const canEdit = user?.level >= 2

  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
  })
  const [tab, setTab] = useState('list')         // list | detail | analysis
  const [selectedId, setSelectedId] = useState(null)
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
      return { ...dhf, records: recs }
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
      return { ...dhf, records: recs }
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
    if (filterPhase !== 'all' && d.currentPhase !== filterPhase) return false
    if (filterStatus !== 'all' && d.status !== filterStatus) return false
    if (search && !d.productName.toLowerCase().includes(search.toLowerCase())
      && !d.productCode?.toLowerCase().includes(search.toLowerCase())
      && !d.id.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [items, filterPhase, filterStatus, search])

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
  const PHASE_ORDER = DEV_PHASES.map(p => p.key)
  function phaseProgress(phase) {
    const idx = PHASE_ORDER.indexOf(phase)
    return idx >= 0 ? Math.round(((idx + 1) / PHASE_ORDER.length) * 100) : 0
  }

  return (
    <AppLayout user={user} title="설계 이력 파일 (DHF)" subtitle="ISO 13485 §7.3 설계 및 개발">
      <div className="px-6 lg:px-8 py-6 max-w-[1400px] mx-auto">

        {/* 탭 */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-soft)' }}>
          {[
            { key: 'list', label: `DHF 목록 (${items.length})` },
            { key: 'detail', label: '상세 보기', disabled: !selectedId },
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
                <button onClick={() => { setForm(EMPTY_DHF); setEditId(null); setShowForm(true) }}
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
        <FieldSelect label="현재 단계" value={form.currentPhase} onChange={v => F('currentPhase', v)}
          options={DEV_PHASES.map(p => ({ value: p.key, label: p.label }))} />
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
                <button key={p.key}
                  onClick={() => canEdit && updatePhase(dhf.id, p.key)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition"
                  style={{
                    background: isActive ? p.color : isPast ? `${p.color}20` : 'var(--bg-soft)',
                    color: isActive ? '#fff' : isPast ? p.color : 'var(--ink-faint)',
                    border: `1px solid ${isActive ? p.color : isPast ? `${p.color}50` : 'var(--line)'}`,
                    cursor: canEdit ? 'pointer' : 'default',
                  }}>
                  {isPast && <CheckCircle2 size={10} />}
                  {p.label}
                </button>
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

      {/* 기록 섹션 */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>설계 개발 기록 ({(dhf.records || []).length}건)</div>
        {canEdit && (
          <button onClick={() => { setRecForm({ ...EMPTY_RECORD }); setEditRecIdx(null); setShowRecForm(true) }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[12px] font-bold"
            style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
            <Plus size={12} /> 기록 추가
          </button>
        )}
      </div>

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
          isEdit={editRecIdx !== null} />
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
function RecordForm({ form, setForm, onSave, onCancel, isEdit }) {
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="mb-4 p-4 rounded-2xl" style={{ background: 'var(--bg-soft)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>{isEdit ? '기록 수정' : '기록 추가'}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <FieldSelect label="기록 유형 *" value={form.type} onChange={v => F('type', v)}
          options={Object.entries(ITEM_TYPES).map(([k, v]) => ({ value: k, label: v.label }))} />
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

// ── 현황 분석 ─────────────────────────────────────────────────
function AnalysisView({ analysis, items, setSelectedId, setTab }) {
  const maxPhase = Math.max(...Object.values(analysis.phaseCount), 1)
  const maxStatus = Math.max(...Object.values(analysis.statusCount), 1)

  return (
    <div className="space-y-5">
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
function FieldArea({ label, value, onChange, rows = 3 }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows}
        className="w-full px-3 py-1.5 rounded-xl text-[13px] resize-none"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
    </div>
  )
}
