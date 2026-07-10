import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Plus,
  Workflow,
  Package,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  PlayCircle,
  PauseCircle,
  Sparkles,
  X,
  ChevronRight,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import { onboarding, getProductProcesses, productKeyOf, hasAnyProcesses } from '../../lib/onboardingState'
import { PROCESS_BLOCKS } from '../../lib/processBlocks'
import {
  operations,
  WO_STATUS,
  PROCESS_STATUS,
} from '../../lib/operationsState'

const CUSTOM_BLOCK_KEY = 'qualytree.customBlocks'
function loadCustomBlocks() {
  try {
    const raw = localStorage.getItem(CUSTOM_BLOCK_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

// 공정 정의가 없을 때 사용할 표준 기본 공정 체인 (KGMP 일반 제조·검사 흐름)
const DEFAULT_PROCESSES = [
  { id: 'def-1', blockId: 'visual-inspection', order: 1, customName: '수입검사(IQC)' },
  { id: 'def-2', blockId: 'manual-assembly', order: 2, customName: '주공정' },
  { id: 'def-3', blockId: 'cmm-inspection', order: 3, customName: '공정검사(IPQC)' },
  { id: 'def-4', blockId: 'functional-test', order: 4, customName: '최종검사(OQC)' },
  { id: 'def-5', blockId: 'primary-packaging', order: 5, customName: '포장' },
  { id: 'def-6', blockId: 'labeling', order: 6, customName: '라벨링' },
]

export default function WorkOrderQueue() {
  const nav = useNavigate()
  const user = auth.current()
  const onbState = onboarding.load()

  // 온보딩 미완료 가드
  const procFor = (onb) => {
    const firstProduct = Array.isArray(onb.products) && onb.products.length ? onb.products[0] : null
    const list = getProductProcesses(onb, productKeyOf(firstProduct))
    return list.length ? list : DEFAULT_PROCESSES
  }
  const newOnbReady =
    (onbState.done && Object.values(onbState.done).filter(Boolean).length >= 6) ||
    (Array.isArray(onbState.products) && onbState.products.length > 0)
  const onboardingComplete =
    (onbState.completedSteps?.includes(3) && hasAnyProcesses(onbState)) || newOnbReady

  const [opState, setOpState] = useState(() => operations.load())
  const [filter, setFilter] = useState('all') // all | pending | in_progress | completed
  const [showNew, setShowNew] = useState(false)
  const [selectedId, setSelectedId] = useState(null)

  const reload = () => setOpState(operations.load())

  // 첫 진입 시 데모 1건 자동 발급
  useEffect(() => {
    if (!onboardingComplete) return
    const cur = operations.load()
    if (cur.workOrders.length === 0) {
      operations.seedDemo({
        ...onbState,
        processes: procFor(onbState),
        product: onbState.product || {
          name: onbState.products?.[0]?.name || ((onbState.company?.name || '') + ' 제품').trim(),
          modelNumber: onbState.products?.[0]?.classNo || 'MODEL-001',
        },
      })
      reload()
    }
  }, [onboardingComplete])

  const allBlocks = useMemo(
    () => [...PROCESS_BLOCKS, ...loadCustomBlocks()],
    []
  )
  const findBlock = (id) => allBlocks.find((b) => b.id === id)

  const filtered = useMemo(() => {
    if (filter === 'all') return opState.workOrders
    return opState.workOrders.filter((w) => w.status === filter)
  }, [opState.workOrders, filter])

  const stats = useMemo(() => {
    const acc = { pending: 0, in_progress: 0, completed: 0, on_hold: 0 }
    opState.workOrders.forEach((w) => {
      acc[w.status] = (acc[w.status] || 0) + 1
    })
    return acc
  }, [opState.workOrders])

  const selected = useMemo(
    () => opState.workOrders.find((w) => w.id === selectedId) || null,
    [opState.workOrders, selectedId]
  )

  // 온보딩 미완료 화면
  if (!onboardingComplete) {
    return (
      <AppLayout
        user={user}
        title="작업 지시"
        subtitle="현장 운영 시작 전 온보딩이 필요합니다"
      >
        <div className="px-6 lg:px-8 py-8 max-w-[1280px] mx-auto">
          <div
            className="card-base p-10 text-center fade-in"
            style={{ borderStyle: 'dashed' }}
          >
            <div
              className="inline-flex w-14 h-14 items-center justify-center rounded-full mb-4"
              style={{ background: 'var(--rust-soft)' }}
            >
              <AlertTriangle
                size={22}
                style={{ color: 'var(--rust)' }}
                strokeWidth={1.6}
              />
            </div>
            <div
              className="font-display text-[22px]"
              style={{ color: 'var(--ink)', fontWeight: 500 }}
            >
              먼저 공정을 정의해 주세요
            </div>
            <div
              className="mt-2 text-[13.5px] leading-relaxed max-w-md mx-auto"
              style={{ color: 'var(--ink-mute)' }}
            >
              현장 운영(OPS)은 온보딩 3단계 <strong>공정 정의</strong>에서
              구성한 공정 순서를 그대로 작업 지시로 발급합니다. 한 번 정의해
              두면, 같은 공정의 모든 작업 지시가 자동으로 같은 단계 체인을
              따릅니다.
            </div>
            <button
              onClick={() => nav('/onboarding')}
              className="btn-primary mt-6"
            >
              온보딩으로 이동 <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout
      user={user}
      title="작업 지시"
      subtitle={`${onbState.company?.name || ''} · ${
        opState.workOrders.length
      }건 발급됨`}
    >
      <div className="px-6 lg:px-8 py-8 max-w-[1280px] mx-auto fade-in">
        {/* 헤더 — OPS 영역 식별 */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-3">
            <span
              className="tag"
              style={{
                background: 'var(--rust-soft)',
                color: 'var(--rust)',
              }}
            >
              OPS-001 · WORK ORDER QUEUE
            </span>
            <span
              className="text-[12.5px]"
              style={{ color: 'var(--ink-mute)' }}
            >
              현장 운영 진입점
            </span>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="btn-primary"
            style={{ background: 'var(--rust)' }}
          >
            <Plus size={15} /> 새 작업 지시
          </button>
        </div>

        {/* 통계 카드 — 큐 현황 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard
            icon={Clock}
            tag="PENDING"
            label="대기"
            count={stats.pending}
            tone="amber"
            active={filter === 'pending'}
            onClick={() => setFilter('pending')}
          />
          <StatCard
            icon={PlayCircle}
            tag="IN PROGRESS"
            label="진행 중"
            count={stats.in_progress}
            tone="rust"
            active={filter === 'in_progress'}
            onClick={() => setFilter('in_progress')}
          />
          <StatCard
            icon={CheckCircle2}
            tag="COMPLETED"
            label="완료"
            count={stats.completed}
            tone="leaf"
            active={filter === 'completed'}
            onClick={() => setFilter('completed')}
          />
          <StatCard
            icon={PauseCircle}
            tag="ON HOLD"
            label="보류"
            count={stats.on_hold}
            tone="ink"
            active={filter === 'on_hold'}
            onClick={() => setFilter('on_hold')}
          />
        </div>

        {/* 필터 표시 + 전체 보기 */}
        {filter !== 'all' && (
          <div className="flex items-center gap-2 mb-3">
            <span
              className="text-[12px]"
              style={{ color: 'var(--ink-mute)' }}
            >
              필터:
            </span>
            <button
              onClick={() => setFilter('all')}
              className="tag"
              style={{
                background: 'var(--bg-soft)',
                color: 'var(--ink)',
                cursor: 'pointer',
              }}
            >
              {labelFor(filter)} <X size={11} className="ml-1" />
            </button>
          </div>
        )}

        {/* 메인: 좌 리스트 + 우 상세 */}
        <div className="grid lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 space-y-2.5">
            {filtered.length === 0 ? (
              <EmptyState
                onCreate={() => setShowNew(true)}
              />
            ) : (
              filtered.map((wo) => (
                <WorkOrderCard
                  key={wo.id}
                  wo={wo}
                  selected={selectedId === wo.id}
                  onSelect={() => setSelectedId(wo.id)}
                  onOpen={() => nav(`/operations/${wo.id}/ebr`)}
                  findBlock={findBlock}
                />
              ))
            )}
          </div>

          <div className="lg:col-span-5">
            {selected ? (
              <DetailPanel
                wo={selected}
                findBlock={findBlock}
                onOpenEbr={() => nav(`/operations/${selected.id}/ebr`)}
                onClose={() => setSelectedId(null)}
              />
            ) : (
              <div
                className="card-base p-6 text-center"
                style={{
                  borderStyle: 'dashed',
                  color: 'var(--ink-mute)',
                  fontSize: 13,
                }}
              >
                작업 지시를 선택하면<br />
                상세와 진행 단계가 표시됩니다.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 새 WO 모달 */}
      {showNew && (
        <NewWorkOrderModal
          onbState={onbState}
          onClose={() => setShowNew(false)}
          onCreated={(wo) => {
            reload()
            setSelectedId(wo.id)
            setShowNew(false)
          }}
        />
      )}
    </AppLayout>
  )
}

/* ================================================================
   StatCard
   ================================================================ */
function StatCard({ icon: Icon, tag, label, count, tone, active, onClick }) {
  const toneStyle = {
    amber: { bg: 'var(--amber-soft)', fg: 'var(--amber)' },
    rust: { bg: 'var(--rust-soft)', fg: 'var(--rust)' },
    leaf: { bg: 'var(--leaf-soft)', fg: 'var(--moss)' },
    ink: { bg: 'var(--bg-soft)', fg: 'var(--ink-mute)' },
  }[tone]

  return (
    <button
      onClick={onClick}
      className="card-base p-4 text-left transition"
      style={{
        borderColor: active ? toneStyle.fg : 'var(--line)',
        boxShadow: active ? `0 0 0 3px ${toneStyle.bg}` : 'none',
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: toneStyle.bg }}
        >
          <Icon size={14} style={{ color: toneStyle.fg }} strokeWidth={1.7} />
        </span>
        <span
          className="font-mono text-[9.5px] tracking-[0.16em] uppercase"
          style={{ color: 'var(--ink-mute)' }}
        >
          {tag}
        </span>
      </div>
      <div className="flex items-baseline gap-2 mt-2">
        <span
          className="font-display"
          style={{ fontSize: 26, fontWeight: 500, color: 'var(--ink)' }}
        >
          {count}
        </span>
        <span
          className="text-[12px]"
          style={{ color: 'var(--ink-mute)' }}
        >
          {label}
        </span>
      </div>
    </button>
  )
}

function labelFor(s) {
  return (
    {
      pending: '대기',
      in_progress: '진행 중',
      completed: '완료',
      on_hold: '보류',
    }[s] || s
  )
}

/* ================================================================
   WorkOrderCard
   ================================================================ */
function WorkOrderCard({ wo, selected, onSelect, onOpen, findBlock }) {
  const completedCount = wo.stages.filter(
    (s) => s.status === PROCESS_STATUS.COMPLETED
  ).length
  const totalCount = wo.stages.length
  const progress = totalCount > 0 ? completedCount / totalCount : 0

  // 현재 활성 단계
  const activeStage = wo.stages.find(
    (s) =>
      s.status === PROCESS_STATUS.IN_PROGRESS ||
      s.status === PROCESS_STATUS.PENDING
  )
  const activeBlock = activeStage ? findBlock(activeStage.blockId) : null

  // 마감 D-day
  const dueLabel = formatDDay(wo.dueDate)
  const overdue = isOverdue(wo.dueDate) && wo.status !== WO_STATUS.COMPLETED

  return (
    <div
      onClick={onSelect}
      className="card-base p-4 cursor-pointer transition"
      style={{
        borderColor: selected ? 'var(--rust)' : 'var(--line)',
        boxShadow: selected ? '0 0 0 3px var(--rust-soft)' : 'none',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="font-mono text-[11px] font-medium"
              style={{ color: 'var(--moss)' }}
            >
              {wo.id}
            </span>
            <StatusPill status={wo.status} />
            {wo.priority === 'urgent' && (
              <span
                className="tag"
                style={{
                  background: 'var(--rust-soft)',
                  color: 'var(--rust)',
                }}
              >
                URGENT
              </span>
            )}
          </div>
          <div
            className="mt-1.5 text-[14.5px] leading-tight truncate"
            style={{ color: 'var(--ink)', fontWeight: 500 }}
          >
            {wo.productName}
          </div>
          <div
            className="text-[12px] mt-0.5"
            style={{ color: 'var(--ink-mute)' }}
          >
            {wo.productModel} · 로트 {wo.lotNumber} · 수량 {wo.quantity}
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation()
            onOpen()
          }}
          className="shrink-0 p-2 rounded-lg transition"
          style={{
            background: 'var(--bg-soft)',
            color: 'var(--ink)',
          }}
          title="eBR 입력으로 이동"
        >
          <ChevronRight size={17} strokeWidth={1.8} />
        </button>
      </div>

      {/* 진행률 바 */}
      <div className="mt-3">
        <div
          className="flex items-center justify-between text-[11px] mb-1"
          style={{ color: 'var(--ink-mute)' }}
        >
          <span>
            진행 {completedCount}/{totalCount}
            {activeBlock && wo.status !== WO_STATUS.COMPLETED && (
              <span className="ml-2" style={{ color: 'var(--rust)' }}>
                · 다음: {activeBlock.name}
              </span>
            )}
          </span>
          <span
            style={{
              color: overdue ? 'var(--rust)' : 'var(--ink-mute)',
              fontWeight: overdue ? 500 : 400,
            }}
          >
            {dueLabel}
          </span>
        </div>
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: 'var(--bg-deep)' }}
        >
          <div
            className="h-full transition-all"
            style={{
              width: `${progress * 100}%`,
              background:
                wo.status === WO_STATUS.COMPLETED
                  ? 'var(--leaf)'
                  : 'var(--rust)',
            }}
          />
        </div>
      </div>
    </div>
  )
}

function StatusPill({ status }) {
  const cfg = {
    pending: { bg: 'var(--amber-soft)', fg: 'var(--amber)', text: '대기' },
    in_progress: {
      bg: 'var(--rust-soft)',
      fg: 'var(--rust)',
      text: '진행 중',
    },
    completed: { bg: 'var(--leaf-soft)', fg: 'var(--moss)', text: '완료' },
    on_hold: { bg: 'var(--bg-soft)', fg: 'var(--ink-mute)', text: '보류' },
  }[status] || {
    bg: 'var(--bg-soft)',
    fg: 'var(--ink-mute)',
    text: status,
  }
  return (
    <span
      className="tag"
      style={{ background: cfg.bg, color: cfg.fg }}
    >
      {cfg.text}
    </span>
  )
}

/* ================================================================
   DetailPanel
   ================================================================ */
function DetailPanel({ wo, findBlock, onOpenEbr, onClose }) {
  return (
    <div className="card-base p-5 sticky top-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div
            className="font-mono text-[10px] tracking-[0.16em] uppercase"
            style={{ color: 'var(--ink-mute)' }}
          >
            DETAIL
          </div>
          <div
            className="font-mono text-[13px] mt-1"
            style={{ color: 'var(--moss)', fontWeight: 500 }}
          >
            {wo.id}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md"
          style={{ color: 'var(--ink-mute)' }}
        >
          <X size={16} />
        </button>
      </div>

      {/* 메타 정보 */}
      <div className="space-y-2 mb-4">
        <Meta label="제품" value={wo.productName} />
        <Meta label="모델" value={wo.productModel} />
        <Meta label="로트" value={wo.lotNumber} mono />
        <Meta label="수량" value={`${wo.quantity}개`} />
        <Meta label="마감" value={`${wo.dueDate} (${formatDDay(wo.dueDate)})`} />
      </div>

      {/* 단계 진행 — 공정 순차 잠금 시각화 */}
      <div
        className="mb-4 pt-3"
        style={{ borderTop: '1px solid var(--line)' }}
      >
        <div
          className="font-mono text-[10px] tracking-[0.16em] uppercase mb-2"
          style={{ color: 'var(--ink-mute)' }}
        >
          STAGE GATE · 공정 순차 잠금
        </div>
        <ol className="space-y-1.5">
          {wo.stages.map((stage, i) => {
            const block = findBlock(stage.blockId)
            const name = stage.customName || block?.name || stage.blockId
            return (
              <StageRow
                key={stage.stageId}
                idx={i + 1}
                name={name}
                status={stage.status}
                operator={stage.operatorName}
              />
            )
          })}
        </ol>
      </div>

      <button
        onClick={onOpenEbr}
        className="btn-primary w-full justify-center"
        style={{ background: 'var(--rust)' }}
        disabled={wo.status === WO_STATUS.COMPLETED}
      >
        {wo.status === WO_STATUS.COMPLETED ? (
          <>
            완료된 eBR 보기 <ArrowRight size={15} />
          </>
        ) : wo.status === WO_STATUS.PENDING ? (
          <>
            현장 입력 시작 <PlayCircle size={15} />
          </>
        ) : (
          <>
            진행 중 단계로 <ArrowRight size={15} />
          </>
        )}
      </button>
    </div>
  )
}

function Meta({ label, value, mono }) {
  return (
    <div className="flex items-baseline gap-3 text-[13px]">
      <span
        className="w-10 shrink-0 font-mono text-[10.5px] tracking-wide uppercase"
        style={{ color: 'var(--ink-faint)' }}
      >
        {label}
      </span>
      <span
        className={mono ? 'font-mono text-[12.5px]' : ''}
        style={{ color: 'var(--ink)' }}
      >
        {value}
      </span>
    </div>
  )
}

function StageRow({ idx, name, status, operator }) {
  const cfg = {
    locked: {
      iconColor: 'var(--ink-faint)',
      textColor: 'var(--ink-faint)',
      bg: 'var(--bg-soft)',
      label: '잠김',
    },
    pending: {
      iconColor: 'var(--amber)',
      textColor: 'var(--ink)',
      bg: 'var(--amber-soft)',
      label: '진입 가능',
    },
    in_progress: {
      iconColor: 'var(--rust)',
      textColor: 'var(--ink)',
      bg: 'var(--rust-soft)',
      label: '진행 중',
    },
    completed: {
      iconColor: 'var(--leaf)',
      textColor: 'var(--ink-mute)',
      bg: 'var(--leaf-soft)',
      label: '완료',
    },
  }[status]

  return (
    <li
      className="flex items-center gap-2.5 py-1.5 px-2 rounded-md"
      style={{ background: cfg.bg }}
    >
      <span
        className="w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px]"
        style={{
          background: 'var(--bg-card)',
          color: cfg.iconColor,
          border: `1px solid ${cfg.iconColor}`,
          fontWeight: 500,
        }}
      >
        {idx}
      </span>
      <span
        className="text-[12.5px] flex-1 truncate"
        style={{
          color: cfg.textColor,
          textDecoration:
            status === PROCESS_STATUS.COMPLETED ? 'line-through' : 'none',
        }}
      >
        {name}
      </span>
      <span
        className="font-mono text-[9.5px] tracking-wider uppercase"
        style={{ color: cfg.iconColor }}
      >
        {cfg.label}
      </span>
      {operator && status === PROCESS_STATUS.COMPLETED && (
        <span
          className="font-mono text-[9.5px]"
          style={{ color: 'var(--ink-faint)' }}
          title={`작업자: ${operator}`}
        >
          {operator.slice(0, 3)}
        </span>
      )}
    </li>
  )
}

/* ================================================================
   EmptyState
   ================================================================ */
function EmptyState({ onCreate }) {
  return (
    <div
      className="card-base p-8 text-center"
      style={{ borderStyle: 'dashed' }}
    >
      <Workflow
        size={26}
        style={{ color: 'var(--ink-faint)', margin: '0 auto' }}
        strokeWidth={1.4}
      />
      <div
        className="mt-3 font-display text-[16px]"
        style={{ color: 'var(--ink)', fontWeight: 500 }}
      >
        이 필터의 작업 지시가 없습니다
      </div>
      <div
        className="mt-1 text-[12.5px]"
        style={{ color: 'var(--ink-mute)' }}
      >
        새 작업 지시를 발급하면 여기 나타납니다.
      </div>
      <button
        onClick={onCreate}
        className="btn-primary mt-4"
        style={{ background: 'var(--rust)' }}
      >
        <Plus size={14} /> 새 작업 지시
      </button>
    </div>
  )
}

/* ================================================================
   NewWorkOrderModal
   ================================================================ */
function NewWorkOrderModal({ onbState, onClose, onCreated }) {
  const [form, setForm] = useState(() => {
    const today = new Date()
    const due = new Date(today)
    due.setDate(due.getDate() + 5)
    const lotPrefix = today.toISOString().slice(2, 10).replace(/-/g, '')
    const seq = String(operations.load().nextWoSeq).padStart(3, '0')
    return {
      productName: onbState.product?.name || onbState.products?.[0]?.name || '',
      productModel: onbState.product?.modelNumber || onbState.products?.[0]?.classNo || '',
      lotNumber: `L${lotPrefix}-${seq}`,
      quantity: 50,
      dueDate: due.toISOString().slice(0, 10),
      priority: 'normal',
    }
  })

  const [models, setModels] = useState(() => (Array.isArray(onbState.products) ? onbState.products : []))
  const [q, setQ] = useState('')
  const initialModel = (Array.isArray(onbState.products) && onbState.products.length) ? onbState.products[0] : (onbState.product?.name ? onbState.product : null)
  const [selectedProductId, setSelectedProductId] = useState(() => initialModel ? productKeyOf(initialModel) : null)
  const pickModel = (p) => { setForm((ff) => ({ ...ff, productName: p.name || '', productModel: p.classNo || p.modelNumber || '' })); setSelectedProductId(productKeyOf(p)) }
  const registerModel = () => {
    const name = (form.productName || '').trim()
    if (!name) { alert('제품명을 입력한 뒤 등록하세요.'); return }
    if (models.some((m) => m.name === name && (m.classNo || '') === (form.productModel || ''))) { alert('이미 등록된 모델입니다.'); return }
    const rec = { id: 'pm' + Date.now(), name, classNo: form.productModel || '', grade: '', cat1: '', cat2: '' }
    const next = [...models, rec]
    setModels(next)
    setSelectedProductId(productKeyOf(rec))
    try { const ob = onboarding.load(); onboarding.save({ ...ob, products: next }) } catch { /* */ }
  }

  const procsForSelected = selectedProductId ? getProductProcesses(onbState, selectedProductId) : []
  const procs = procsForSelected.length ? procsForSelected : DEFAULT_PROCESSES
  const processCount = procs.length

  const submit = () => {
    if (!form.productName || !form.lotNumber || !form.quantity || !form.dueDate) {
      alert('모든 항목을 입력해 주세요.')
      return
    }
    const wo = operations.createWorkOrder({
      ...form,
      onboardingProcesses: procs,
    })
    onCreated(wo)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,26,20,0.55)' }}
      onClick={onClose}
    >
      <div
        className="card-base p-6 max-w-md w-full fade-in"
        style={{ background: 'var(--bg-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div
              className="font-mono text-[10px] tracking-[0.18em] uppercase"
              style={{ color: 'var(--rust)' }}
            >
              NEW WORK ORDER
            </div>
            <div
              className="font-display text-[20px] mt-1"
              style={{ color: 'var(--ink)', fontWeight: 500 }}
            >
              새 작업 지시 발급
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md"
            style={{ color: 'var(--ink-mute)' }}
          >
            <X size={17} />
          </button>
        </div>

        {/* 자동 인계 알림 */}
        <div
          className="rounded-lg p-3 mb-4 flex items-start gap-2"
          style={{
            background: 'var(--leaf-soft)',
            border: '1px solid var(--leaf)',
          }}
        >
          <Sparkles
            size={14}
            style={{ color: 'var(--moss)', marginTop: 2 }}
            strokeWidth={1.8}
          />
          <div className="text-[12px]" style={{ color: 'var(--moss)' }}>
            <strong>{form.productName ? `${form.productName}의 ` : ''}공정 {processCount}단계</strong>가 그대로 단계
            체인으로 발급됩니다. 제품마다 다른 공정이 정의되어 있다면 아래에서 모델을 선택한 대로 반영됩니다.
            첫 단계만 진입 가능, 이후 단계는 순차 잠금
            해제됩니다.
          </div>
        </div>

        {/* 모델 검색·선택 */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px]" style={{ color: 'var(--ink-mute)' }}>모델 선택 (등록 {models.length}건)</span>
            <button onClick={registerModel} className="text-[11.5px]" style={{ color: 'var(--rust)' }}>+ 현재 제품명/모델을 새 모델로 등록</button>
          </div>
          <input
            className="input-base mb-1"
            placeholder="모델명·분류번호 검색…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="rounded-md max-h-40 overflow-auto" style={{ border: '1px solid var(--line)' }}>
            {models.length === 0 ? (
              <div className="px-2.5 py-2 text-[12px]" style={{ color: 'var(--ink-faint)' }}>
                등록된 모델이 없습니다. 아래에 제품명·모델을 입력하고 "새 모델로 등록"을 누르면 다음부터 검색·선택할 수 있습니다.
              </div>
            ) : (
              models
                .filter((p) => { const t = (q || '').toLowerCase(); return !t || (p.name || '').toLowerCase().includes(t) || (p.classNo || '').toLowerCase().includes(t) })
                .slice(0, 300)
                .map((p) => (
                  <button
                    key={p.id || p.name}
                    onClick={() => pickModel(p)}
                    className="w-full text-left px-2.5 py-1.5 text-[12.5px]"
                    style={{ borderBottom: '1px solid var(--line)', background: (form.productName === p.name && (form.productModel || '') === (p.classNo || '')) ? 'var(--leaf-soft)' : 'transparent', color: 'var(--ink)' }}
                  >
                    {p.name}
                    {p.classNo ? <span style={{ color: 'var(--ink-faint)' }}> · {p.classNo}</span> : null}
                    {p.grade ? <span style={{ color: 'var(--ink-faint)' }}> · {p.grade}등급</span> : null}
                  </button>
                ))
            )}
          </div>
        </div>

        <div className="space-y-3">
          <Field label="제품명">
            <input
              className="input-base"
              value={form.productName}
              onChange={(e) =>
                setForm({ ...form, productName: e.target.value })
              }
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="모델">
              <input
                className="input-base"
                value={form.productModel}
                onChange={(e) =>
                  setForm({ ...form, productModel: e.target.value })
                }
              />
            </Field>
            <Field label="로트 번호">
              <input
                className="input-base font-mono text-[13px]"
                value={form.lotNumber}
                onChange={(e) =>
                  setForm({ ...form, lotNumber: e.target.value })
                }
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="수량">
              <input
                type="number"
                min="1"
                className="input-base"
                value={form.quantity}
                onChange={(e) =>
                  setForm({
                    ...form,
                    quantity: parseInt(e.target.value, 10) || 0,
                  })
                }
              />
            </Field>
            <Field label="마감일">
              <input
                type="date"
                className="input-base"
                value={form.dueDate}
                onChange={(e) =>
                  setForm({ ...form, dueDate: e.target.value })
                }
              />
            </Field>
          </div>
          <Field label="우선순위">
            <div className="flex gap-2">
              {[
                { v: 'normal', t: '일반' },
                { v: 'urgent', t: '긴급' },
              ].map((p) => (
                <button
                  key={p.v}
                  onClick={() => setForm({ ...form, priority: p.v })}
                  className="flex-1 py-2 rounded-lg text-[13px] transition"
                  style={{
                    background:
                      form.priority === p.v
                        ? p.v === 'urgent'
                          ? 'var(--rust)'
                          : 'var(--moss)'
                        : 'var(--bg-soft)',
                    color:
                      form.priority === p.v
                        ? 'var(--bg)'
                        : 'var(--ink)',
                    fontWeight: form.priority === p.v ? 500 : 400,
                  }}
                >
                  {p.t}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="btn-ghost flex-1 justify-center">
            취소
          </button>
          <button
            onClick={submit}
            className="btn-primary flex-1 justify-center"
            style={{ background: 'var(--rust)' }}
          >
            발급 <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span
        className="block font-mono text-[10px] tracking-[0.16em] uppercase mb-1.5"
        style={{ color: 'var(--ink-mute)' }}
      >
        {label}
      </span>
      {children}
    </label>
  )
}

/* ================================================================
   유틸
   ================================================================ */
function formatDDay(dueDate) {
  const due = new Date(dueDate + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((due - today) / (1000 * 60 * 60 * 24))
  if (diff === 0) return '오늘 마감'
  if (diff > 0) return `D-${diff}`
  return `D+${Math.abs(diff)} 지연`
}

function isOverdue(dueDate) {
  const due = new Date(dueDate + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return due < today
}
