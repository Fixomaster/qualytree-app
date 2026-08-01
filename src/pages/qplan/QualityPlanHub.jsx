// src/pages/qplan/QualityPlanHub.jsx
// ISO 13485 §7.1 제품 실현의 계획 — 품질 계획 허브
import React, { useState, useMemo } from 'react'
import {
  Plus, Save, Edit2, Trash2, CheckCircle2, Clock,
  AlertTriangle, FileText, ChevronRight,
  Package, Layers, ClipboardList, BarChart2,
  Shield, FlaskConical, Microscope, GitBranch,
  Star, ArrowRight, X,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'

// ── 상수 ─────────────────────────────────────────────────────
const LS_KEY = 'qualytree.quality_plans'

const PLAN_STATUSES = {
  draft:    { label: '초안',    color: '#6366F1', bg: '#EEF2FF' },
  review:   { label: '검토 중', color: '#D97706', bg: '#FEF3C7' },
  approved: { label: '승인',    color: '#059669', bg: '#D1FAE5' },
  obsolete: { label: '폐기',    color: '#9CA3AF', bg: '#F3F4F6' },
}

const DEVICE_CLASSES = ['1등급', '2등급', '3등급', '4등급', '미분류']

const ACTIVITY_GROUPS = [
  {
    group: '설계·개발 (§7.3)',
    items: [
      '설계 입력 검토 및 승인',
      '설계 출력 검토',
      '설계 검토 (Design Review)',
      '설계 검증 (Design Verification)',
      '설계 유효성 확인 (Design Validation)',
      '설계 이전 (Design Transfer)',
    ],
  },
  {
    group: '위험 관리 (ISO 14971)',
    items: [
      '위험 분석 (FMEA)',
      '위험 저감 조치',
      '잔류 위험 평가',
      '위험 관리 보고서 승인',
    ],
  },
  {
    group: '구매·공급업체 (§7.4)',
    items: [
      '공급업체 선정 및 평가',
      '구매 사양서 작성',
      '수입 검사 기준 수립',
    ],
  },
  {
    group: '생산·서비스 제공 (§7.5)',
    items: [
      '생산 공정 문서화 (SOP)',
      '공정 유효성 확인 (Validation)',
      '청결 관리 기준 수립 (§7.5.2)',
      '제품 식별·추적성 기준 수립 (§7.5.9)',
      '보존·취급·포장 기준 수립 (§7.5.11)',
    ],
  },
  {
    group: '검사·측정 (§7.6 / §8.2)',
    items: [
      '검사 기준서 (IQC/공정검사/최종검사) 작성',
      '측정 장비 교정 계획 수립',
      '샘플링 계획 수립',
      '합격 기준 정의',
    ],
  },
  {
    group: '규제·인허가',
    items: [
      '규제 분류 확정 (의료기기 등급)',
      '인·허가 신청 자료 준비',
      '임상 데이터 요구사항 검토',
      '라벨링 요구사항 정의',
      'UDI 등록 계획',
    ],
  },
  {
    group: '품질 기록',
    items: [
      '필요 기록 목록 작성 (§4.2.4)',
      '기록 보존 기간 정의',
      'DHF 구성 계획',
      'DMR(Device Master Record) 구성',
    ],
  },
]

const ALL_DEFAULT_ITEMS = ACTIVITY_GROUPS.flatMap(g =>
  g.items.map(name => ({ group: g.group, name, required: true, status: 'not_started', owner: '', dueDate: '', linkedId: '', notes: '' }))
)

const ITEM_STATUSES = {
  not_started: { label: '미시작',  color: '#9CA3AF' },
  in_progress: { label: '진행 중', color: '#D97706' },
  completed:   { label: '완료',    color: '#059669' },
  na:          { label: 'N/A',     color: '#6B7280' },
}

function planId() { return `QP-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }
function todayStr(){ return new Date().toISOString().slice(0, 10) }

const EMPTY_PLAN = {
  productName: '', productCode: '', revision: '1.0',
  deviceClass: '2등급', intendedUse: '',
  projectManager: '', approver: '', approvedDate: '',
  startDate: todayStr(), targetDate: '',
  status: 'draft',
  regulatorySubmission: '', customerRequirements: '',
  notes: '',
  activities: ALL_DEFAULT_ITEMS.map(a => ({ ...a })),
}

// ── 메인 ─────────────────────────────────────────────────────
export default function QualityPlanHub() {
  const user = auth.current()
  const canEdit = user?.level >= 2

  const [plans, setPlans] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
  })

  const [tab, setTab] = useState('list')          // list | detail | analysis
  const [selectedId, setSelectedId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_PLAN)
  const [editId, setEditId] = useState(null)
  const [actFilter, setActFilter] = useState('all')  // all | group name
  const [filterStatus, setFilterStatus] = useState('all')

  function save(list) { setPlans(list); localStorage.setItem(LS_KEY, JSON.stringify(list)) }

  function submitPlan() {
    if (!form.productName.trim()) return alert('제품명을 입력하세요.')
    const next = editId
      ? plans.map(p => p.id === editId ? { ...p, ...form } : p)
      : [{ id: planId(), createdAt: todayStr(), ...form }, ...plans]
    save(next)
    setShowForm(false); setForm(EMPTY_PLAN); setEditId(null)
  }

  function deletePlan(id) {
    if (!confirm('품질 계획서를 삭제하시겠습니까?')) return
    save(plans.filter(p => p.id !== id))
    if (selectedId === id) { setSelectedId(null); setTab('list') }
  }

  function updateActivity(planId, actIdx, field, value) {
    const next = plans.map(p => {
      if (p.id !== planId) return p
      const acts = [...(p.activities || [])]
      acts[actIdx] = { ...acts[actIdx], [field]: value }
      return { ...p, activities: acts }
    })
    save(next)
  }

  function quickPlanStatus(id, status) {
    const update = { status }
    if (status === 'approved') { update.approvedDate = todayStr(); update.approver = user?.name || '' }
    save(plans.map(p => p.id === id ? { ...p, ...update } : p))
  }

  const selected = plans.find(p => p.id === selectedId)

  // 선택된 계획 완료율
  function calcProgress(plan) {
    const acts = (plan.activities || []).filter(a => a.required && a.status !== 'na')
    if (!acts.length) return null
    const done = acts.filter(a => a.status === 'completed').length
    return Math.round((done / acts.length) * 100)
  }

  // 필터된 계획 목록
  const filteredPlans = useMemo(() => plans.filter(p => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false
    return true
  }), [plans, filterStatus])

  // 선택된 계획의 필터된 활동
  const filteredActs = useMemo(() => {
    if (!selected) return []
    const acts = (selected.activities || [])
    if (actFilter === 'all') return acts
    return acts.filter(a => a.group === actFilter)
  }, [selected, actFilter])

  // 그룹별 완료율
  const groupProgress = useMemo(() => {
    if (!selected) return {}
    const result = {}
    ACTIVITY_GROUPS.forEach(g => {
      const acts = (selected.activities || []).filter(a => a.group === g.group && a.required && a.status !== 'na')
      const done = acts.filter(a => a.status === 'completed').length
      result[g.group] = acts.length ? Math.round((done / acts.length) * 100) : null
    })
    return result
  }, [selected])

  // 분석
  const analysis = useMemo(() => {
    const byStatus = {}
    Object.keys(PLAN_STATUSES).forEach(k => { byStatus[k] = plans.filter(p => p.status === k).length })
    const lowProgress = plans.filter(p => {
      const prog = calcProgress(p)
      return prog !== null && prog < 50 && p.status !== 'obsolete'
    })
    const overdueItems = plans.flatMap(p =>
      (p.activities || []).filter(a => a.dueDate && new Date(a.dueDate) < new Date() && a.status !== 'completed' && a.status !== 'na')
        .map(a => ({ plan: p, act: a }))
    )
    return { byStatus, lowProgress, overdueItems }
  }, [plans])

  const groups = ACTIVITY_GROUPS.map(g => g.group)

  return (
    <AppLayout user={user} title="품질 계획 (QP)" subtitle="ISO 13485 §7.1 제품 실현의 계획 — 제품별 품질 계획서">
      <div className="px-6 lg:px-8 py-6 max-w-[1400px] mx-auto">

        {/* 탭 */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-soft)' }}>
          {[
            { key: 'list',     label: `QP 목록 (${plans.length})` },
            { key: 'detail',   label: '계획서 상세', disabled: !selectedId },
            { key: 'analysis', label: '현황 분석' },
          ].map(t => (
            <button key={t.key} onClick={() => !t.disabled && setTab(t.key)} disabled={t.disabled}
              className="px-4 py-1.5 rounded-lg text-[13px] font-semibold transition"
              style={{
                background: tab === t.key ? 'var(--bg-card)' : 'transparent',
                color: t.disabled ? 'var(--ink-faint)' : tab === t.key ? 'var(--moss)' : 'var(--ink-soft)',
                boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                border: 'none', cursor: t.disabled ? 'not-allowed' : 'pointer',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── 목록 탭 ── */}
        {tab === 'list' && (
          <div>
            <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-[13px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                <option value="all">전체 상태</option>
                {Object.entries(PLAN_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              {canEdit && (
                <button onClick={() => { setForm(EMPTY_PLAN); setEditId(null); setShowForm(true) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} /> QP 신규 작성
                </button>
              )}
            </div>

            {showForm && (
              <PlanForm form={form} setForm={setForm} onSave={submitPlan}
                onCancel={() => { setShowForm(false); setForm(EMPTY_PLAN); setEditId(null) }}
                isEdit={!!editId} />
            )}

            {filteredPlans.length === 0 ? (
              <div className="text-center py-20" style={{ color: 'var(--ink-faint)' }}>
                <ClipboardList size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <div className="text-[14px]">등록된 품질 계획서가 없습니다.</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPlans.map(plan => {
                  const sm = PLAN_STATUSES[plan.status] || PLAN_STATUSES.draft
                  const prog = calcProgress(plan)
                  const actTotal = (plan.activities || []).filter(a => a.required && a.status !== 'na').length
                  const actDone  = (plan.activities || []).filter(a => a.status === 'completed').length

                  return (
                    <div key={plan.id} className="p-4 rounded-2xl cursor-pointer transition"
                      style={{ background: 'var(--bg-card)', border: '1.5px solid var(--line)' }}
                      onClick={() => { setSelectedId(plan.id); setTab('detail') }}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] font-mono" style={{ color: 'var(--ink-faint)' }}>{plan.id}</span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
                          </div>
                          <div className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>{plan.productName}</div>
                          <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{plan.productCode} · Rev.{plan.revision} · {plan.deviceClass}</div>
                        </div>
                      </div>

                      {/* 진행률 */}
                      {prog !== null && (
                        <div className="mb-2">
                          <div className="flex justify-between text-[11px] mb-1" style={{ color: 'var(--ink-faint)' }}>
                            <span>활동 진행률</span>
                            <span style={{ fontWeight: 700, color: prog === 100 ? '#059669' : prog >= 50 ? '#D97706' : '#DC2626' }}>{prog}%</span>
                          </div>
                          <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-soft)' }}>
                            <div className="h-1.5 rounded-full" style={{ width: `${prog}%`, background: prog === 100 ? '#059669' : prog >= 50 ? '#D97706' : '#DC2626' }} />
                          </div>
                        </div>
                      )}

                      <div className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>
                        활동 {actDone}/{actTotal} 완료 · PM: {plan.projectManager || '-'}
                      </div>

                      {canEdit && (
                        <div className="flex gap-1 mt-3" onClick={e => e.stopPropagation()}>
                          {plan.status === 'draft' && <QuickBtn label="검토" color="#D97706" onClick={() => quickPlanStatus(plan.id, 'review')} />}
                          {plan.status === 'review' && <QuickBtn label="승인" color="#059669" onClick={() => quickPlanStatus(plan.id, 'approved')} />}
                          <button onClick={() => { setForm({ ...EMPTY_PLAN, ...plan }); setEditId(plan.id); setShowForm(true); setTab('list') }}
                            className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                            <Edit2 size={12} style={{ color: 'var(--ink-soft)' }} />
                          </button>
                          <button onClick={() => deletePlan(plan.id)}
                            className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', border: '1px solid #FECACA', cursor: 'pointer' }}>
                            <Trash2 size={12} style={{ color: '#DC2626' }} />
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

        {/* ── 상세 탭 ── */}
        {tab === 'detail' && selected && (
          <DetailView
            plan={selected} canEdit={canEdit}
            actFilter={actFilter} setActFilter={setActFilter}
            filteredActs={filteredActs} groupProgress={groupProgress}
            groups={groups} updateActivity={updateActivity} calcProgress={calcProgress}
          />
        )}

        {/* ── 분석 탭 ── */}
        {tab === 'analysis' && (
          <AnalysisView analysis={analysis} plans={plans} setSelectedId={setSelectedId} setTab={setTab} />
        )}
      </div>
    </AppLayout>
  )
}

// ── 계획서 상세 뷰 ────────────────────────────────────────────
function DetailView({ plan, canEdit, actFilter, setActFilter, filteredActs, groupProgress, groups, updateActivity, calcProgress }) {
  const sm = PLAN_STATUSES[plan.status] || PLAN_STATUSES.draft
  const prog = calcProgress(plan)

  return (
    <div>
      {/* 헤더 */}
      <div className="p-5 rounded-2xl mb-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[12px] font-mono" style={{ color: 'var(--ink-faint)' }}>{plan.id}</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
            </div>
            <div className="text-[20px] font-bold" style={{ color: 'var(--ink)' }}>{plan.productName}</div>
            <div className="text-[13px]" style={{ color: 'var(--ink-faint)' }}>{plan.productCode} · Rev.{plan.revision} · {plan.deviceClass}</div>
          </div>
          <div className="text-right text-[12px]" style={{ color: 'var(--ink-faint)' }}>
            <div>PM: {plan.projectManager || '-'}</div>
            <div>승인자: {plan.approver || '-'}</div>
            {plan.approvedDate && <div>승인일: {plan.approvedDate}</div>}
            {plan.targetDate && <div>목표 완료: {plan.targetDate}</div>}
          </div>
        </div>

        {/* 전체 진행률 */}
        {prog !== null && (
          <div className="mb-3">
            <div className="flex justify-between text-[12px] mb-1" style={{ color: 'var(--ink-soft)' }}>
              <span className="font-semibold">전체 활동 진행률</span>
              <span className="font-bold" style={{ color: prog === 100 ? '#059669' : prog >= 50 ? '#D97706' : '#DC2626' }}>{prog}%</span>
            </div>
            <div className="h-2 rounded-full" style={{ background: 'var(--bg-soft)' }}>
              <div className="h-2 rounded-full transition-all" style={{ width: `${prog}%`, background: prog === 100 ? '#059669' : prog >= 50 ? '#D97706' : '#DC2626' }} />
            </div>
          </div>
        )}

        {/* 그룹별 미니 진행바 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          {ACTIVITY_GROUPS.map(g => {
            const p = groupProgress[g.group]
            return (
              <div key={g.group} className="p-2 rounded-xl cursor-pointer" onClick={() => setActFilter(actFilter === g.group ? 'all' : g.group)}
                style={{ background: actFilter === g.group ? 'var(--bg-soft)' : 'transparent', border: `1px solid ${actFilter === g.group ? 'var(--moss)' : 'var(--line)'}` }}>
                <div className="text-[10.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{g.group.replace(' (§7.3)', '').replace(' (ISO 14971)', '').replace(' (§7.4)', '').replace(' (§7.5)', '').replace(' (§7.6 / §8.2)', '')}</div>
                <div className="h-1.5 rounded-full" style={{ background: 'var(--line)' }}>
                  <div className="h-1.5 rounded-full" style={{ width: `${p ?? 0}%`, background: p === 100 ? '#059669' : p !== null && p > 0 ? '#D97706' : '#E5E7EB' }} />
                </div>
                <div className="text-[10px] mt-0.5 text-right" style={{ color: 'var(--ink-faint)' }}>{p !== null ? `${p}%` : '-'}</div>
              </div>
            )
          })}
        </div>

        {plan.intendedUse && (
          <div className="mt-3 p-3 rounded-xl text-[12.5px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
            <span className="font-bold" style={{ color: 'var(--ink)' }}>사용 목적: </span>{plan.intendedUse}
          </div>
        )}
        {plan.customerRequirements && (
          <div className="mt-2 p-3 rounded-xl text-[12.5px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
            <span className="font-bold" style={{ color: 'var(--ink)' }}>고객 요구사항: </span>{plan.customerRequirements}
          </div>
        )}
        {plan.regulatorySubmission && (
          <div className="mt-2 p-3 rounded-xl text-[12.5px]" style={{ background: '#EFF6FF', color: '#1E40AF' }}>
            <span className="font-bold">규제 제출 계획: </span>{plan.regulatorySubmission}
          </div>
        )}
        {plan.notes && (
          <div className="mt-2 p-3 rounded-xl text-[12.5px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
            <span className="font-bold" style={{ color: 'var(--ink)' }}>비고: </span>{plan.notes}
          </div>
        )}
      </div>

      {/* 활동 필터 탭 */}
      <div className="flex gap-1 flex-wrap mb-4">
        <ActTabBtn active={actFilter === 'all'} onClick={() => setActFilter('all')} label="전체" />
        {groups.map(g => (
          <ActTabBtn key={g} active={actFilter === g} onClick={() => setActFilter(actFilter === g ? 'all' : g)}
            label={g.replace(/\s*\(.*\)/, '')} />
        ))}
      </div>

      {/* 활동 목록 */}
      <div className="space-y-2">
        {filteredActs.map((act, rawIdx) => {
          // 전체 activities에서의 실제 인덱스
          const realIdx = (selected?.activities || []).findIndex((a, i) =>
            a.group === act.group && a.name === act.name &&
            (selected.activities || []).indexOf(a) === (selected.activities || []).findIndex((b, j) => b.group === act.group && b.name === act.name && j >= i)
          )
          const sm2 = ITEM_STATUSES[act.status] || ITEM_STATUSES.not_started
          const isOverdue = act.dueDate && new Date(act.dueDate) < new Date() && act.status !== 'completed' && act.status !== 'na'

          return (
            <div key={`${act.group}-${act.name}`} className="p-3 rounded-xl"
              style={{ background: isOverdue ? '#FFF5F5' : 'var(--bg-card)', border: `1px solid ${isOverdue ? '#FECACA' : 'var(--line)'}` }}>
              <div className="flex items-center gap-3 flex-wrap">
                {/* 상태 뱃지 */}
                {canEdit ? (
                  <select value={act.status}
                    onChange={e => updateActivity(selected.id, realIdx === -1 ? (selected.activities || []).findIndex(a => a.name === act.name && a.group === act.group) : realIdx, 'status', e.target.value)}
                    className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: sm2.color + '20', color: sm2.color, border: `1px solid ${sm2.color}60`, cursor: 'pointer' }}>
                    {Object.entries(ITEM_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                ) : (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: sm2.color + '20', color: sm2.color }}>{sm2.label}</span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-semibold" style={{ color: 'var(--ink)', opacity: act.status === 'na' ? 0.4 : 1 }}>{act.name}</div>
                  <div className="text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>{act.group}</div>
                </div>
                {canEdit && (
                  <div className="flex gap-2 items-center flex-wrap">
                    <input type="text" value={act.owner || ''} placeholder="담당자"
                      onChange={e => updateActivity(selected.id, (selected.activities || []).findIndex(a => a.name === act.name && a.group === act.group), 'owner', e.target.value)}
                      className="px-2 py-0.5 rounded-lg text-[11px]"
                      style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', width: 80 }} />
                    <input type="date" value={act.dueDate || ''}
                      onChange={e => updateActivity(selected.id, (selected.activities || []).findIndex(a => a.name === act.name && a.group === act.group), 'dueDate', e.target.value)}
                      className="px-2 py-0.5 rounded-lg text-[11px]"
                      style={{ background: 'var(--bg-soft)', border: `1px solid ${isOverdue ? '#DC2626' : 'var(--line)'}`, color: isOverdue ? '#DC2626' : 'var(--ink)' }} />
                  </div>
                )}
                {!canEdit && act.owner && <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{act.owner}</span>}
                {!canEdit && act.dueDate && <span className="text-[11px]" style={{ color: isOverdue ? '#DC2626' : 'var(--ink-faint)' }}>{act.dueDate}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ActTabBtn({ active, onClick, label }) {
  return (
    <button onClick={onClick} className="px-3 py-1.5 rounded-lg text-[11.5px] font-semibold"
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

// ── 분석 탭 ──────────────────────────────────────────────────
function AnalysisView({ analysis, plans, setSelectedId, setTab }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(PLAN_STATUSES).map(([k, v]) => (
          <div key={k} className="p-4 rounded-2xl text-center" style={{ background: v.bg, border: `1px solid ${v.color}40` }}>
            <div className="text-[26px] font-bold" style={{ color: v.color }}>{analysis.byStatus[k] || 0}</div>
            <div className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>{v.label}</div>
          </div>
        ))}
      </div>

      {analysis.overdueItems.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
          <div className="text-[13px] font-bold mb-3" style={{ color: '#DC2626' }}>⚠ 기한 초과 활동 ({analysis.overdueItems.length}건)</div>
          <div className="space-y-1.5">
            {analysis.overdueItems.slice(0, 8).map(({ plan, act }, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg cursor-pointer"
                style={{ background: '#FFF5F5', border: '1px solid #FECACA' }}
                onClick={() => { setSelectedId(plan.id); setTab('detail') }}>
                <div className="text-[12px]">
                  <span className="font-bold" style={{ color: '#991B1B' }}>{act.name}</span>
                  <span className="ml-2" style={{ color: '#DC2626' }}>{plan.productName}</span>
                </div>
                <div className="text-[11px]" style={{ color: '#DC2626' }}>기한: {act.dueDate}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {analysis.lowProgress.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <div className="text-[13px] font-bold mb-3" style={{ color: '#92400E' }}>진행률 50% 미만 품질 계획</div>
          <div className="space-y-2">
            {analysis.lowProgress.map(plan => {
              const prog = (() => {
                const acts = (plan.activities || []).filter(a => a.required && a.status !== 'na')
                const done = acts.filter(a => a.status === 'completed').length
                return acts.length ? Math.round((done / acts.length) * 100) : null
              })()
              return (
                <div key={plan.id} className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer"
                  style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}
                  onClick={() => { setSelectedId(plan.id); setTab('detail') }}>
                  <div className="flex-1">
                    <div className="text-[12px] font-bold" style={{ color: '#78350F' }}>{plan.productName}</div>
                    <div className="h-1.5 rounded-full mt-1" style={{ background: '#FDE68A' }}>
                      <div className="h-1.5 rounded-full" style={{ width: `${prog ?? 0}%`, background: '#D97706' }} />
                    </div>
                  </div>
                  <div className="text-[13px] font-bold" style={{ color: '#D97706' }}>{prog ?? 0}%</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── 품질 계획 폼 ─────────────────────────────────────────────
function PlanForm({ form, setForm, onSave, onCancel, isEdit }) {
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="mb-6 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>{isEdit ? '품질 계획서 수정' : '품질 계획서 신규 작성'}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <Field label="제품명 *" value={form.productName} onChange={v => F('productName', v)} />
        <Field label="제품 코드" value={form.productCode} onChange={v => F('productCode', v)} />
        <Field label="개정 번호" value={form.revision} onChange={v => F('revision', v)} />
        <FieldSelect label="기기 등급" value={form.deviceClass} onChange={v => F('deviceClass', v)}
          options={DEVICE_CLASSES.map(c => ({ value: c, label: c }))} />
        <Field label="시작일" type="date" value={form.startDate} onChange={v => F('startDate', v)} />
        <Field label="목표 완료일" type="date" value={form.targetDate} onChange={v => F('targetDate', v)} />
        <Field label="프로젝트 책임자 (PM)" value={form.projectManager} onChange={v => F('projectManager', v)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <FieldArea label="사용 목적 (Intended Use)" value={form.intendedUse} onChange={v => F('intendedUse', v)} rows={2} />
        <FieldArea label="고객 요구사항 (§7.2)" value={form.customerRequirements} onChange={v => F('customerRequirements', v)} rows={2} />
        <FieldArea label="규제 제출 계획" value={form.regulatorySubmission} onChange={v => F('regulatorySubmission', v)} rows={2} />
        <FieldArea label="비고" value={form.notes} onChange={v => F('notes', v)} rows={2} />
      </div>
      <div className="p-3 rounded-xl mb-4 text-[12px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
        💡 저장 후 <strong>계획서 상세</strong> 탭에서 각 활동의 담당자·기한·완료 상태를 업데이트하세요. ({ALL_DEFAULT_ITEMS.length}개 표준 활동이 자동 포함됩니다.)
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
          style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
          <Save size={13} /> 저장
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-[13px]"
          style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>취소</button>
      </div>
    </div>
  )
}

function QuickBtn({ label, color, onClick }) {
  return (
    <button onClick={onClick} className="px-2 py-1 rounded-lg text-[11px] font-bold"
      style={{ background: `${color}15`, border: `1px solid ${color}40`, color, cursor: 'pointer' }}>
      {label}
    </button>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
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
