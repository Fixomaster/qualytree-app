import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
  Edit2,
  Trash2,
  ClipboardCheck,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import { supabase } from '../../lib/supabaseClient'
import { onboarding, getProductProcesses, productKeyOf, hasAnyProcesses } from '../../lib/onboardingState'
import { PROCESS_BLOCKS } from '../../lib/processBlocks'
import {
let _sbCidWoq = null
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

// ÃªÂ³ÂµÃ¬Â Â Ã¬Â ÂÃ¬ÂÂÃªÂ°Â Ã¬ÂÂÃ¬ÂÂ Ã«ÂÂ Ã¬ÂÂ¬Ã¬ÂÂ©Ã­ÂÂ  Ã­ÂÂÃ¬Â¤Â ÃªÂ¸Â°Ã«Â³Â¸ ÃªÂ³ÂµÃ¬Â Â Ã¬Â²Â´Ã¬ÂÂ¸ (KGMP Ã¬ÂÂ¼Ã«Â°Â Ã¬Â ÂÃ¬Â¡Â°ÃÂ·ÃªÂ²ÂÃ¬ÂÂ¬ Ã­ÂÂÃ«Â¦Â)
const DEFAULT_PROCESSES = [
  { id: 'def-1', blockId: 'visual-inspection', order: 1, customName: 'Ã¬ÂÂÃ¬ÂÂÃªÂ²ÂÃ¬ÂÂ¬(IQC)' },
  { id: 'def-2', blockId: 'manual-assembly', order: 2, customName: 'Ã¬Â£Â¼ÃªÂ³ÂµÃ¬Â Â' },
  { id: 'def-3', blockId: 'cmm-inspection', order: 3, customName: 'ÃªÂ³ÂµÃ¬Â ÂÃªÂ²ÂÃ¬ÂÂ¬(IPQC)' },
  { id: 'def-4', blockId: 'functional-test', order: 4, customName: 'Ã¬ÂµÂÃ¬Â¢ÂÃªÂ²ÂÃ¬ÂÂ¬(OQC)' },
  { id: 'def-5', blockId: 'primary-packaging', order: 5, customName: 'Ã­ÂÂ¬Ã¬ÂÂ¥' },
  { id: 'def-6', blockId: 'labeling', order: 6, customName: 'Ã«ÂÂ¼Ã«Â²Â¨Ã«Â§Â' },
]

function OpsShell({ embedded, user, title, subtitle, children }) {
  if (embedded) return <>{children}</>
  return (
    <AppLayout user={user} title={title} subtitle={subtitle}>
      {children}
    </AppLayout>
  )
}

export default function WorkOrderQueue({ embedded = false } = {}) {
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const user = auth.current()
  const onbState = onboarding.load()

  // Ã¬ÂÂ¨Ã«Â³Â´Ã«ÂÂ© Ã«Â¯Â¸Ã¬ÂÂÃ«Â£Â ÃªÂ°ÂÃ«ÂÂ
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
  const [selectedId, setSelectedId] = useState(() => searchParams.get('id') || null)
  const [batchWo, setBatchWo] = useState(null)

  const reload = () => setOpState(operations.load())

  // Ã¬Â²Â« Ã¬Â§ÂÃ¬ÂÂ Ã¬ÂÂ Ã«ÂÂ°Ã«ÂªÂ¨ 1ÃªÂ±Â´ Ã¬ÂÂÃ«ÂÂ Ã«Â°ÂÃªÂ¸Â
  useEffect(() => {
    if (!onboardingComplete) return
    const cur = operations.load()
    if (cur.workOrders.length === 0) {
      operations.seedDemo({
        ...onbState,
        processes: procFor(onbState),
        product: onbState.product || {
          name: onbState.products?.[0]?.name || ((onbState.company?.name || '') + ' Ã¬Â ÂÃ­ÂÂ').trim(),
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

  // Ã¬ÂÂ¨Ã«Â³Â´Ã«ÂÂ© Ã«Â¯Â¸Ã¬ÂÂÃ«Â£Â Ã­ÂÂÃ«Â©Â´
  if (!onboardingComplete) {
    return (
      <OpsShell
        embedded={embedded}
        user={user}
        title="Ã¬ÂÂÃ¬ÂÂ Ã¬Â§ÂÃ¬ÂÂ"
        subtitle="Ã­ÂÂÃ¬ÂÂ¥ Ã¬ÂÂ´Ã¬ÂÂ Ã¬ÂÂÃ¬ÂÂ Ã¬Â Â Ã¬ÂÂ¨Ã«Â³Â´Ã«ÂÂ©Ã¬ÂÂ´ Ã­ÂÂÃ¬ÂÂÃ­ÂÂ©Ã«ÂÂÃ«ÂÂ¤"
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
              Ã«Â¨Â¼Ã¬Â Â ÃªÂ³ÂµÃ¬Â ÂÃ¬ÂÂ Ã¬Â ÂÃ¬ÂÂÃ­ÂÂ´ Ã¬Â£Â¼Ã¬ÂÂ¸Ã¬ÂÂ
            </div>
            <div
              className="mt-2 text-[13.5px] leading-relaxed max-w-md mx-auto"
              style={{ color: 'var(--ink-mute)' }}
            >
              Ã­ÂÂÃ¬ÂÂ¥ Ã¬ÂÂ´Ã¬ÂÂ(OPS)Ã¬ÂÂ Ã¬ÂÂ¨Ã«Â³Â´Ã«ÂÂ© 3Ã«ÂÂ¨ÃªÂ³Â <strong>ÃªÂ³ÂµÃ¬Â Â Ã¬Â ÂÃ¬ÂÂ</strong>Ã¬ÂÂÃ¬ÂÂ
              ÃªÂµÂ¬Ã¬ÂÂ±Ã­ÂÂ ÃªÂ³ÂµÃ¬Â Â Ã¬ÂÂÃ¬ÂÂÃ«Â¥Â¼ ÃªÂ·Â¸Ã«ÂÂÃ«Â¡Â Ã¬ÂÂÃ¬ÂÂ Ã¬Â§ÂÃ¬ÂÂÃ«Â¡Â Ã«Â°ÂÃªÂ¸ÂÃ­ÂÂ©Ã«ÂÂÃ«ÂÂ¤. Ã­ÂÂ Ã«Â²Â Ã¬Â ÂÃ¬ÂÂÃ­ÂÂ´
              Ã«ÂÂÃ«Â©Â´, ÃªÂ°ÂÃ¬ÂÂ ÃªÂ³ÂµÃ¬Â ÂÃ¬ÂÂ Ã«ÂªÂ¨Ã«ÂÂ  Ã¬ÂÂÃ¬ÂÂ Ã¬Â§ÂÃ¬ÂÂÃªÂ°Â Ã¬ÂÂÃ«ÂÂÃ¬ÂÂ¼Ã«Â¡Â ÃªÂ°ÂÃ¬ÂÂ Ã«ÂÂ¨ÃªÂ³Â Ã¬Â²Â´Ã¬ÂÂ¸Ã¬ÂÂ
              Ã«ÂÂ°Ã«Â¦ÂÃ«ÂÂÃ«ÂÂ¤.
            </div>
            <button
              onClick={() => nav('/onboarding')}
              className="btn-primary mt-6"
            >
              Ã¬ÂÂ¨Ã«Â³Â´Ã«ÂÂ©Ã¬ÂÂ¼Ã«Â¡Â Ã¬ÂÂ´Ã«ÂÂ <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </OpsShell>
    )
  }

  return (
    <OpsShell
      embedded={embedded}
      user={user}
      title="Ã¬ÂÂÃ¬ÂÂ Ã¬Â§ÂÃ¬ÂÂ"
      subtitle={`${onbState.company?.name || ''} ÃÂ· ${
        opState.workOrders.length
      }ÃªÂ±Â´ Ã«Â°ÂÃªÂ¸ÂÃ«ÂÂ¨`}
    >
      <div className="px-6 lg:px-8 py-8 max-w-[1280px] mx-auto fade-in">
        {/* Ã­ÂÂ¤Ã«ÂÂ Ã¢ÂÂ OPS Ã¬ÂÂÃ¬ÂÂ­ Ã¬ÂÂÃ«Â³Â */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-3">
            <span
              className="tag"
              style={{
                background: 'var(--rust-soft)',
                color: 'var(--rust)',
              }}
            >
              OPS-001 ÃÂ· WORK ORDER QUEUE
            </span>
            <span
              className="text-[12.5px]"
              style={{ color: 'var(--ink-mute)' }}
            >
              Ã­ÂÂÃ¬ÂÂ¥ Ã¬ÂÂ´Ã¬ÂÂ Ã¬Â§ÂÃ¬ÂÂÃ¬Â Â
            </span>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="btn-primary"
            style={{ background: 'var(--rust)' }}
          >
            <Plus size={15} /> Ã¬ÂÂ Ã¬ÂÂÃ¬ÂÂ Ã¬Â§ÂÃ¬ÂÂ
          </button>
        </div>

        {/* Ã­ÂÂµÃªÂ³Â Ã¬Â¹Â´Ã«ÂÂ Ã¢ÂÂ Ã­ÂÂ Ã­ÂÂÃ­ÂÂ© */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard
            icon={Clock}
            tag="PENDING"
            label="Ã«ÂÂÃªÂ¸Â°"
            count={stats.pending}
            tone="amber"
            active={filter === 'pending'}
            onClick={() => setFilter('pending')}
          />
          <StatCard
            icon={PlayCircle}
            tag="IN PROGRESS"
            label="Ã¬Â§ÂÃ­ÂÂ Ã¬Â¤Â"
            count={stats.in_progress}
            tone="rust"
            active={filter === 'in_progress'}
            onClick={() => setFilter('in_progress')}
          />
          <StatCard
            icon={CheckCircle2}
            tag="COMPLETED"
            label="Ã¬ÂÂÃ«Â£Â"
            count={stats.completed}
            tone="leaf"
            active={filter === 'completed'}
            onClick={() => setFilter('completed')}
          />
          <StatCard
            icon={PauseCircle}
            tag="ON HOLD"
            label="Ã«Â³Â´Ã«Â¥Â"
            count={stats.on_hold}
            tone="ink"
            active={filter === 'on_hold'}
            onClick={() => setFilter('on_hold')}
          />
        </div>

        {/* Ã­ÂÂÃ­ÂÂ° Ã­ÂÂÃ¬ÂÂ + Ã¬Â ÂÃ¬Â²Â´ Ã«Â³Â´ÃªÂ¸Â° */}
        {filter !== 'all' && (
          <div className="flex items-center gap-2 mb-3">
            <span
              className="text-[12px]"
              style={{ color: 'var(--ink-mute)' }}
            >
              Ã­ÂÂÃ­ÂÂ°:
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

        {/* Ã«Â©ÂÃ¬ÂÂ¸: Ã¬Â¢Â Ã«Â¦Â¬Ã¬ÂÂ¤Ã­ÂÂ¸ + Ã¬ÂÂ° Ã¬ÂÂÃ¬ÂÂ¸ */}
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
                  onOpenInspection={() => nav(`/operations/${wo.id}/inspection`)}
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
                onOpenEbr={() => setBatchWo(selected)}
                onOpenInspection={() => nav(`/operations/${selected.id}/inspection`)}
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
                Ã¬ÂÂÃ¬ÂÂ Ã¬Â§ÂÃ¬ÂÂÃ«Â¥Â¼ Ã¬ÂÂ Ã­ÂÂÃ­ÂÂÃ«Â©Â´<br />
                Ã¬ÂÂÃ¬ÂÂ¸Ã¬ÂÂ Ã¬Â§ÂÃ­ÂÂ Ã«ÂÂ¨ÃªÂ³ÂÃªÂ°Â Ã­ÂÂÃ¬ÂÂÃ«ÂÂ©Ã«ÂÂÃ«ÂÂ¤.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ã¬ÂÂ WO Ã«ÂªÂ¨Ã«ÂÂ¬ */}
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
      {batchWo && (
        <WoBatchModal wo={batchWo} onClose={() => setBatchWo(null)} />
      )}
    </OpsShell>
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
      pending: 'Ã«ÂÂÃªÂ¸Â°',
      in_progress: 'Ã¬Â§ÂÃ­ÂÂ Ã¬Â¤Â',
      completed: 'Ã¬ÂÂÃ«Â£Â',
      on_hold: 'Ã«Â³Â´Ã«Â¥Â',
    }[s] || s
  )
}

/* ================================================================
   WorkOrderCard
   ================================================================ */
function WorkOrderCard({ wo, selected, onSelect, onOpen, onOpenInspection, findBlock }) {
  const completedCount = wo.stages.filter(
    (s) => s.status === PROCESS_STATUS.COMPLETED
  ).length
  const totalCount = wo.stages.length
  const progress = totalCount > 0 ? completedCount / totalCount : 0

  // Ã­ÂÂÃ¬ÂÂ¬ Ã­ÂÂÃ¬ÂÂ± Ã«ÂÂ¨ÃªÂ³Â
  const activeStage = wo.stages.find(
    (s) =>
      s.status === PROCESS_STATUS.IN_PROGRESS ||
      s.status === PROCESS_STATUS.PENDING
  )
  const activeBlock = activeStage ? findBlock(activeStage.blockId) : null

  // Ã«Â§ÂÃªÂ°Â D-day
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
            {wo.productModel} ÃÂ· Ã«Â¡ÂÃ­ÂÂ¸ {wo.lotNumber} ÃÂ· Ã¬ÂÂÃ«ÂÂ {wo.quantity}
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
          title="eBR Ã¬ÂÂÃ«Â Â¥Ã¬ÂÂ¼Ã«Â¡Â Ã¬ÂÂ´Ã«ÂÂ"
        >
          <ChevronRight size={17} strokeWidth={1.8} />
        </button>
      </div>

      {/* 4Ã«ÂÂ¨ÃªÂ³Â ÃªÂ²ÂÃ¬ÂÂ¬ Ã­ÂÂÃ«Â©Â´ Ã¬Â§ÂÃ¬ÂÂÃ¬Â Â Ã¢ÂÂ /operations/:woId/inspection (ÃÂ§13.14 IQCÃ¢ÂÂFAIÃ¢ÂÂIPIÃ¢ÂÂLAI) */}
      {onOpenInspection && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onOpenInspection()
          }}
          className="mt-2 inline-flex items-center gap-1 text-[12px] px-2 py-1 rounded-md transition"
          style={{ background: 'var(--leaf-soft)', color: 'var(--moss)', fontWeight: 500 }}
          title="ÃªÂ²ÂÃ¬ÂÂ¬ Ã«ÂÂ¨ÃªÂ³Â (IQCÃÂ·FAIÃÂ·IPIÃÂ·LAI)"
        >
          <ClipboardCheck size={13} strokeWidth={1.8} /> ÃªÂ²ÂÃ¬ÂÂ¬ Ã«ÂÂ¨ÃªÂ³Â (IQCÃÂ·FAIÃÂ·IPIÃÂ·LAI)
        </button>
      )}

      {/* Ã¬Â§ÂÃ­ÂÂÃ«Â¥Â  Ã«Â°Â */}
      <div className="mt-3">
        <div
          className="flex items-center justify-between text-[11px] mb-1"
          style={{ color: 'var(--ink-mute)' }}
        >
          <span>
            Ã¬Â§ÂÃ­ÂÂ {completedCount}/{totalCount}
            {activeBlock && wo.status !== WO_STATUS.COMPLETED && (
              <span className="ml-2" style={{ color: 'var(--rust)' }}>
                ÃÂ· Ã«ÂÂ¤Ã¬ÂÂ: {activeBlock.name}
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
    pending: { bg: 'var(--amber-soft)', fg: 'var(--amber)', text: 'Ã«ÂÂÃªÂ¸Â°' },
    in_progress: {
      bg: 'var(--rust-soft)',
      fg: 'var(--rust)',
      text: 'Ã¬Â§ÂÃ­ÂÂ Ã¬Â¤Â',
    },
    completed: { bg: 'var(--leaf-soft)', fg: 'var(--moss)', text: 'Ã¬ÂÂÃ«Â£Â' },
    on_hold: { bg: 'var(--bg-soft)', fg: 'var(--ink-mute)', text: 'Ã«Â³Â´Ã«Â¥Â' },
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
function DetailPanel({ wo, findBlock, onOpenEbr, onOpenInspection, onClose }) {
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

      {/* Ã«Â©ÂÃ­ÂÂ Ã¬Â ÂÃ«Â³Â´ */}
      <div className="space-y-2 mb-4">
        <Meta label="Ã¬Â ÂÃ­ÂÂ" value={wo.productName} />
        <Meta label="Ã«ÂªÂ¨Ã«ÂÂ¸" value={wo.productModel} />
        <Meta label="Ã«Â¡ÂÃ­ÂÂ¸" value={wo.lotNumber} mono />
        <Meta label="Ã¬ÂÂÃ«ÂÂ" value={`${wo.quantity}ÃªÂ°Â`} />
        <Meta label="Ã«Â§ÂÃªÂ°Â" value={`${wo.dueDate} (${formatDDay(wo.dueDate)})`} />
      </div>

      {/* Ã«ÂÂ¨ÃªÂ³Â Ã¬Â§ÂÃ­ÂÂ Ã¢ÂÂ ÃªÂ³ÂµÃ¬Â Â Ã¬ÂÂÃ¬Â°Â¨ Ã¬ÂÂ ÃªÂ¸Â Ã¬ÂÂÃªÂ°ÂÃ­ÂÂ */}
      <div
        className="mb-4 pt-3"
        style={{ borderTop: '1px solid var(--line)' }}
      >
        <div
          className="font-mono text-[10px] tracking-[0.16em] uppercase mb-2"
          style={{ color: 'var(--ink-mute)' }}
        >
          STAGE GATE ÃÂ· ÃªÂ³ÂµÃ¬Â Â Ã¬ÂÂÃ¬Â°Â¨ Ã¬ÂÂ ÃªÂ¸Â
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
            Ã¬ÂÂÃ«Â£ÂÃ«ÂÂ eBR Ã«Â³Â´ÃªÂ¸Â° <ArrowRight size={15} />
          </>
        ) : wo.status === WO_STATUS.PENDING ? (
          <>
            Ã­ÂÂÃ¬ÂÂ¥ Ã¬ÂÂÃ«Â Â¥ Ã¬ÂÂÃ¬ÂÂ <PlayCircle size={15} />
          </>
        ) : (
          <>
            Ã¬Â§ÂÃ­ÂÂ Ã¬Â¤Â Ã«ÂÂ¨ÃªÂ³ÂÃ«Â¡Â <ArrowRight size={15} />
          </>
        )}
      </button>
      {onOpenInspection && (
        <button
          onClick={onOpenInspection}
          className="btn-primary w-full justify-center mt-2"
          style={{ background: 'var(--moss-mid)' }}
          title="4Ã«ÂÂ¨ÃªÂ³Â ÃªÂ²ÂÃ¬ÂÂ¬ (IQCÃÂ·FAIÃÂ·IPIÃÂ·LAI) Ã­ÂÂÃ«Â©Â´Ã¬ÂÂ¼Ã«Â¡Â Ã¬ÂÂ´Ã«ÂÂ"
        >
          ÃªÂ²ÂÃ¬ÂÂ¬ Ã«ÂÂ¨ÃªÂ³Â (IQCÃÂ·FAIÃÂ·IPIÃÂ·LAI) <ClipboardCheck size={15} />
        </button>
      )}
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
      label: 'Ã¬ÂÂ ÃªÂ¹Â',
    },
    pending: {
      iconColor: 'var(--amber)',
      textColor: 'var(--ink)',
      bg: 'var(--amber-soft)',
      label: 'Ã¬Â§ÂÃ¬ÂÂ ÃªÂ°ÂÃ«ÂÂ¥',
    },
    in_progress: {
      iconColor: 'var(--rust)',
      textColor: 'var(--ink)',
      bg: 'var(--rust-soft)',
      label: 'Ã¬Â§ÂÃ­ÂÂ Ã¬Â¤Â',
    },
    completed: {
      iconColor: 'var(--leaf)',
      textColor: 'var(--ink-mute)',
      bg: 'var(--leaf-soft)',
      label: 'Ã¬ÂÂÃ«Â£Â',
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
          title={`Ã¬ÂÂÃ¬ÂÂÃ¬ÂÂ: ${operator}`}
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
        Ã¬ÂÂ´ Ã­ÂÂÃ­ÂÂ°Ã¬ÂÂ Ã¬ÂÂÃ¬ÂÂ Ã¬Â§ÂÃ¬ÂÂÃªÂ°Â Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤
      </div>
      <div
        className="mt-1 text-[12.5px]"
        style={{ color: 'var(--ink-mute)' }}
      >
        Ã¬ÂÂ Ã¬ÂÂÃ¬ÂÂ Ã¬Â§ÂÃ¬ÂÂÃ«Â¥Â¼ Ã«Â°ÂÃªÂ¸ÂÃ­ÂÂÃ«Â©Â´ Ã¬ÂÂ¬ÃªÂ¸Â° Ã«ÂÂÃ­ÂÂÃ«ÂÂ©Ã«ÂÂÃ«ÂÂ¤.
      </div>
      <button
        onClick={onCreate}
        className="btn-primary mt-4"
        style={{ background: 'var(--rust)' }}
      >
        <Plus size={14} /> Ã¬ÂÂ Ã¬ÂÂÃ¬ÂÂ Ã¬Â§ÂÃ¬ÂÂ
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
    if (!name) { alert('Ã¬Â ÂÃ­ÂÂÃ«ÂªÂÃ¬ÂÂ Ã¬ÂÂÃ«Â Â¥Ã­ÂÂ Ã«ÂÂ¤ Ã«ÂÂ±Ã«Â¡ÂÃ­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ.'); return }
    if (models.some((m) => m.name === name && (m.classNo || '') === (form.productModel || ''))) { alert('Ã¬ÂÂ´Ã«Â¯Â¸ Ã«ÂÂ±Ã«Â¡ÂÃ«ÂÂ Ã«ÂªÂ¨Ã«ÂÂ¸Ã¬ÂÂÃ«ÂÂÃ«ÂÂ¤.'); return }
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
      alert('Ã«ÂªÂ¨Ã«ÂÂ  Ã­ÂÂ­Ã«ÂªÂ©Ã¬ÂÂ Ã¬ÂÂÃ«Â Â¥Ã­ÂÂ´ Ã¬Â£Â¼Ã¬ÂÂ¸Ã¬ÂÂ.')
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
              Ã¬ÂÂ Ã¬ÂÂÃ¬ÂÂ Ã¬Â§ÂÃ¬ÂÂ Ã«Â°ÂÃªÂ¸Â
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

        {/* Ã¬ÂÂÃ«ÂÂ Ã¬ÂÂ¸ÃªÂ³Â Ã¬ÂÂÃ«Â¦Â¼ */}
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
            <strong>{form.productName ? `${form.productName}Ã¬ÂÂ ` : ''}ÃªÂ³ÂµÃ¬Â Â {processCount}Ã«ÂÂ¨ÃªÂ³Â</strong>ÃªÂ°Â ÃªÂ·Â¸Ã«ÂÂÃ«Â¡Â Ã«ÂÂ¨ÃªÂ³Â
            Ã¬Â²Â´Ã¬ÂÂ¸Ã¬ÂÂ¼Ã«Â¡Â Ã«Â°ÂÃªÂ¸ÂÃ«ÂÂ©Ã«ÂÂÃ«ÂÂ¤. Ã¬Â ÂÃ­ÂÂÃ«Â§ÂÃ«ÂÂ¤ Ã«ÂÂ¤Ã«Â¥Â¸ ÃªÂ³ÂµÃ¬Â ÂÃ¬ÂÂ´ Ã¬Â ÂÃ¬ÂÂÃ«ÂÂÃ¬ÂÂ´ Ã¬ÂÂÃ«ÂÂ¤Ã«Â©Â´ Ã¬ÂÂÃ«ÂÂÃ¬ÂÂÃ¬ÂÂ Ã«ÂªÂ¨Ã«ÂÂ¸Ã¬ÂÂ Ã¬ÂÂ Ã­ÂÂÃ­ÂÂ Ã«ÂÂÃ«Â¡Â Ã«Â°ÂÃ¬ÂÂÃ«ÂÂ©Ã«ÂÂÃ«ÂÂ¤.
            Ã¬Â²Â« Ã«ÂÂ¨ÃªÂ³ÂÃ«Â§Â Ã¬Â§ÂÃ¬ÂÂ ÃªÂ°ÂÃ«ÂÂ¥, Ã¬ÂÂ´Ã­ÂÂ Ã«ÂÂ¨ÃªÂ³ÂÃ«ÂÂ Ã¬ÂÂÃ¬Â°Â¨ Ã¬ÂÂ ÃªÂ¸Â
            Ã­ÂÂ´Ã¬Â ÂÃ«ÂÂ©Ã«ÂÂÃ«ÂÂ¤.
          </div>
        </div>

        {/* Ã«ÂªÂ¨Ã«ÂÂ¸ ÃªÂ²ÂÃ¬ÂÂÃÂ·Ã¬ÂÂ Ã­ÂÂ */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px]" style={{ color: 'var(--ink-mute)' }}>Ã«ÂªÂ¨Ã«ÂÂ¸ Ã¬ÂÂ Ã­ÂÂ (Ã«ÂÂ±Ã«Â¡Â {models.length}ÃªÂ±Â´)</span>
            <button onClick={registerModel} className="text-[11.5px]" style={{ color: 'var(--rust)' }}>+ Ã­ÂÂÃ¬ÂÂ¬ Ã¬Â ÂÃ­ÂÂÃ«ÂªÂ/Ã«ÂªÂ¨Ã«ÂÂ¸Ã¬ÂÂ Ã¬ÂÂ Ã«ÂªÂ¨Ã«ÂÂ¸Ã«Â¡Â Ã«ÂÂ±Ã«Â¡Â</button>
          </div>
          <input
            className="input-base mb-1"
            placeholder="Ã«ÂªÂ¨Ã«ÂÂ¸Ã«ÂªÂÃÂ·Ã«Â¶ÂÃ«Â¥ÂÃ«Â²ÂÃ­ÂÂ¸ ÃªÂ²ÂÃ¬ÂÂÃ¢ÂÂ¦"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="rounded-md max-h-40 overflow-auto" style={{ border: '1px solid var(--line)' }}>
            {models.length === 0 ? (
              <div className="px-2.5 py-2 text-[12px]" style={{ color: 'var(--ink-faint)' }}>
                Ã«ÂÂ±Ã«Â¡ÂÃ«ÂÂ Ã«ÂªÂ¨Ã«ÂÂ¸Ã¬ÂÂ´ Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤. Ã¬ÂÂÃ«ÂÂÃ¬ÂÂ Ã¬Â ÂÃ­ÂÂÃ«ÂªÂÃÂ·Ã«ÂªÂ¨Ã«ÂÂ¸Ã¬ÂÂ Ã¬ÂÂÃ«Â Â¥Ã­ÂÂÃªÂ³Â  "Ã¬ÂÂ Ã«ÂªÂ¨Ã«ÂÂ¸Ã«Â¡Â Ã«ÂÂ±Ã«Â¡Â"Ã¬ÂÂ Ã«ÂÂÃ«Â¥Â´Ã«Â©Â´ Ã«ÂÂ¤Ã¬ÂÂÃ«Â¶ÂÃ­ÂÂ° ÃªÂ²ÂÃ¬ÂÂÃÂ·Ã¬ÂÂ Ã­ÂÂÃ­ÂÂ  Ã¬ÂÂ Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤.
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
                    {p.classNo ? <span style={{ color: 'var(--ink-faint)' }}> ÃÂ· {p.classNo}</span> : null}
                    {p.grade ? <span style={{ color: 'var(--ink-faint)' }}> ÃÂ· {p.grade}Ã«ÂÂ±ÃªÂ¸Â</span> : null}
                  </button>
                ))
            )}
          </div>
        </div>

        <div className="space-y-3">
          <Field label="Ã¬Â ÂÃ­ÂÂÃ«ÂªÂ">
            <input
              className="input-base"
              value={form.productName}
              onChange={(e) =>
                setForm({ ...form, productName: e.target.value })
              }
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ã«ÂªÂ¨Ã«ÂÂ¸">
              <input
                className="input-base"
                value={form.productModel}
                onChange={(e) =>
                  setForm({ ...form, productModel: e.target.value })
                }
              />
            </Field>
            <Field label="Ã«Â¡ÂÃ­ÂÂ¸ Ã«Â²ÂÃ­ÂÂ¸">
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
            <Field label="Ã¬ÂÂÃ«ÂÂ">
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
            <Field label="Ã«Â§ÂÃªÂ°ÂÃ¬ÂÂ¼">
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
          <Field label="Ã¬ÂÂ°Ã¬ÂÂ Ã¬ÂÂÃ¬ÂÂ">
            <div className="flex gap-2">
              {[
                { v: 'normal', t: 'Ã¬ÂÂ¼Ã«Â°Â' },
                { v: 'urgent', t: 'ÃªÂ¸Â´ÃªÂ¸Â' },
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
            Ã¬Â·Â¨Ã¬ÂÂ
          </button>
          <button
            onClick={submit}
            className="btn-primary flex-1 justify-center"
            style={{ background: 'var(--rust)' }}
          >
            Ã«Â°ÂÃªÂ¸Â <ArrowRight size={15} />
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
   Ã¬ÂÂ Ã­ÂÂ¸
   ================================================================ */
function formatDDay(dueDate) {
  const due = new Date(dueDate + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((due - today) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Ã¬ÂÂ¤Ã«ÂÂ Ã«Â§ÂÃªÂ°Â'
  if (diff > 0) return `D-${diff}`
  return `D+${Math.abs(diff)} Ã¬Â§ÂÃ¬ÂÂ°`
}

function isOverdue(dueDate) {
  const due = new Date(dueDate + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return due < today
}


// Ã¢ÂÂÃ¢ÂÂ Ã«Â°Â°Ã¬Â¹ÂÃªÂ¸Â°Ã«Â¡ÂÃ¬ÂÂ Ã«ÂªÂ¨Ã«ÂÂ¬ Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
const WO_BR_KEY = 'qualytree.wo_batch_records'
function WoBatchModal({ wo, onClose }) {
  const user = auth.current()
  const companyId = user?.company_id
  const EMPTY = { batchNo:'', lotNo:'', actualQty:'', startDate:'', endDate:'', operators:'', equipment:'', yieldRate:'', inspResult:'Ã­ÂÂ©ÃªÂ²Â©', status:'Ã¬ÂÂÃ¬ÂÂ±Ã¬Â¤Â', notes:'' }
  const [recs, setRecs] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  useEffect(() => { _sbCidWoq = companyId }, [companyId])
  useEffect(() => {
    if (!companyId) return
    supabase.from('company_data')
      .select('payload')
      .eq('company_id', companyId)
      .eq('data_type', 'localStorage_sync')
      .eq('data_key', WO_BR_KEY)
      .maybeSingle()
      .then(({ data: sbData }) => {
        if (sbData?.payload) {
          setRecs(sbData.payload.filter(r => r.woId === wo.id))
        }
      })
  }, [companyId, wo.id])

  useEffect(() => {
    try {
      const all = JSON.parse(localStorage.getItem(WO_BR_KEY) || '[]')
      setRecs(all.filter(r => r.woId === wo.id))
    } catch {}
  }, [wo.id])

  const persist = (list) => {
    try {
      const all = JSON.parse(localStorage.getItem(WO_BR_KEY) || '[]')
      const other = all.filter(r => r.woId !== wo.id)
      localStorage.setItem(WO_BR_KEY, JSON.stringify([...other, ...list]))
      if (_sbCidWoq) {
        supabase.from('company_data').upsert({
          company_id: _sbCidWoq, data_type: 'localStorage_sync',
          data_key: WO_BR_KEY, payload: [...other, ...list]
        }, { onConflict: 'company_id,data_type,data_key' })
      }
    } catch {}
    setRecs(list)
  }

  const openNew = () => {
    const today = new Date().toISOString().slice(0,10)
    setForm({ ...EMPTY, batchNo:'BR-'+Date.now().toString().slice(-6), startDate:today, endDate:today })
    setEditId(null)
    setShowForm(true)
  }

  const openEdit = (r) => {
    setForm({ batchNo:r.batchNo, lotNo:r.lotNo, actualQty:r.actualQty, startDate:r.startDate, endDate:r.endDate, operators:r.operators, equipment:r.equipment, yieldRate:r.yieldRate, inspResult:r.inspResult, status:r.status, notes:r.notes })
    setEditId(r.id)
    setShowForm(true)
  }

  const save = () => {
    if (!form.batchNo.trim()) return
    if (editId) {
      persist(recs.map(r => r.id === editId ? { ...r, ...form } : r))
    } else {
      persist([...recs, { id: Date.now().toString(), woId: wo.id, woNo: wo.orderNo, productName: wo.productName, planQty: wo.quantity, ...form }])
    }
    setShowForm(false)
  }

  const del = (id) => {
    if (!window.confirm('Ã¬ÂÂ­Ã¬Â ÂÃ­ÂÂÃ¬ÂÂÃªÂ²Â Ã¬ÂÂµÃ«ÂÂÃªÂ¹Â?')) return
    persist(recs.filter(r => r.id !== id))
  }

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const statusColor = (s) => s==='Ã¬ÂÂÃ«Â£Â'?'green':s==='Ã¬ÂÂ¹Ã¬ÂÂ¸'?'blue':'gray'
  const inspColor = (s) => s==='Ã­ÂÂ©ÃªÂ²Â©'?'green':s==='Ã«Â¶ÂÃ­ÂÂ©ÃªÂ²Â©'?'red':'yellow'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background:'rgba(0,0,0,0.4)' }} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4" style={{ background:'var(--surface)' }}>
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-[16px] font-bold">Ã«Â°Â°Ã¬Â¹ÂÃªÂ¸Â°Ã«Â¡ÂÃ¬ÂÂ</h2>
            <p className="text-[12px]" style={{ color:'var(--ink-faint)' }}>{wo.orderNo} Ã¢ÂÂ {wo.productName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openNew} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[13px] font-medium" style={{ background:'var(--accent)', color:'#fff' }}><Plus size={14}/>Ã¬ÂÂ ÃªÂ·Â</button>
            <button onClick={onClose} className="p-1.5 rounded-lg" style={{ background:'var(--surface-2)' }}><X size={16}/></button>
          </div>
        </div>

        {showForm && (
          <div className="rounded-xl border p-4 space-y-3" style={{ borderColor:'var(--border)', background:'var(--surface-2)' }}>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1"><span className="text-[12px] font-medium">Ã«Â°Â°Ã¬Â¹ÂÃ«Â²ÂÃ­ÂÂ¸</span><input value={form.batchNo} onChange={e=>setF('batchNo',e.target.value)} className="border rounded px-2 py-1 text-[13px]" style={{ borderColor:'var(--border)', background:'var(--surface)' }}/></label>
              <label className="flex flex-col gap-1"><span className="text-[12px] font-medium">Ã«Â¡ÂÃ­ÂÂ¸Ã«Â²ÂÃ­ÂÂ¸</span><input value={form.lotNo} onChange={e=>setF('lotNo',e.target.value)} className="border rounded px-2 py-1 text-[13px]" style={{ borderColor:'var(--border)', background:'var(--surface)' }}/></label>
              <label className="flex flex-col gap-1"><span className="text-[12px] font-medium">Ã¬ÂÂ¤Ã¬Â Â Ã¬ÂÂÃ¬ÂÂ°Ã¬ÂÂÃ«ÂÂ</span><input type="number" value={form.actualQty} onChange={e=>setF('actualQty',e.target.value)} className="border rounded px-2 py-1 text-[13px]" style={{ borderColor:'var(--border)', background:'var(--surface)' }}/></label>
              <label className="flex flex-col gap-1"><span className="text-[12px] font-medium">Ã¬ÂÂÃ¬ÂÂ¨ (%)</span><input type="number" value={form.yieldRate} onChange={e=>setF('yieldRate',e.target.value)} className="border rounded px-2 py-1 text-[13px]" style={{ borderColor:'var(--border)', background:'var(--surface)' }}/></label>
              <label className="flex flex-col gap-1"><span className="text-[12px] font-medium">Ã¬ÂÂÃ¬ÂÂ Ã¬ÂÂÃ¬ÂÂÃ¬ÂÂ¼</span><input type="date" value={form.startDate} onChange={e=>setF('startDate',e.target.value)} className="border rounded px-2 py-1 text-[13px]" style={{ borderColor:'var(--border)', background:'var(--surface)' }}/></label>
              <label className="flex flex-col gap-1"><span className="text-[12px] font-medium">Ã¬ÂÂÃ¬ÂÂ Ã¬Â¢ÂÃ«Â£ÂÃ¬ÂÂ¼</span><input type="date" value={form.endDate} onChange={e=>setF('endDate',e.target.value)} className="border rounded px-2 py-1 text-[13px]" style={{ borderColor:'var(--border)', background:'var(--surface)' }}/></label>
              <label className="flex flex-col gap-1"><span className="text-[12px] font-medium">Ã¬ÂÂÃ¬ÂÂÃ¬ÂÂ</span><input value={form.operators} onChange={e=>setF('operators',e.target.value)} className="border rounded px-2 py-1 text-[13px]" style={{ borderColor:'var(--border)', background:'var(--surface)' }}/></label>
              <label className="flex flex-col gap-1"><span className="text-[12px] font-medium">Ã¬ÂÂ¬Ã¬ÂÂ© Ã¬ÂÂ¤Ã«Â¹Â</span><input value={form.equipment} onChange={e=>setF('equipment',e.target.value)} className="border rounded px-2 py-1 text-[13px]" style={{ borderColor:'var(--border)', background:'var(--surface)' }}/></label>
              <label className="flex flex-col gap-1"><span className="text-[12px] font-medium">ÃªÂ²ÂÃ¬ÂÂ¬ÃªÂ²Â°ÃªÂ³Â¼</span><select value={form.inspResult} onChange={e=>setF('inspResult',e.target.value)} className="border rounded px-2 py-1 text-[13px]" style={{ borderColor:'var(--border)', background:'var(--surface)' }}><option>Ã­ÂÂ©ÃªÂ²Â©</option><option>Ã«Â¶ÂÃ­ÂÂ©ÃªÂ²Â©</option><option>Ã«Â³Â´Ã«Â¥Â</option></select></label>
              <label className="flex flex-col gap-1"><span className="text-[12px] font-medium">Ã¬ÂÂÃ­ÂÂ</span><select value={form.status} onChange={e=>setF('status',e.target.value)} className="border rounded px-2 py-1 text-[13px]" style={{ borderColor:'var(--border)', background:'var(--surface)' }}><option>Ã¬ÂÂÃ¬ÂÂ±Ã¬Â¤Â</option><option>Ã¬ÂÂÃ«Â£Â</option><option>Ã¬ÂÂ¹Ã¬ÂÂ¸</option></select></label>
              <label className="flex flex-col gap-1 col-span-2"><span className="text-[12px] font-medium">Ã«Â¹ÂÃªÂ³Â </span><textarea value={form.notes} onChange={e=>setF('notes',e.target.value)} rows={2} className="border rounded px-2 py-1 text-[13px]" style={{ borderColor:'var(--border)', background:'var(--surface)' }}/></label>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={()=>setShowForm(false)} className="px-3 py-1.5 rounded-lg text-[13px]" style={{ background:'var(--surface-2)', border:'1px solid var(--border)' }}>Ã¬Â·Â¨Ã¬ÂÂ</button>
              <button onClick={save} className="px-3 py-1.5 rounded-lg text-[13px] font-medium" style={{ background:'var(--accent)', color:'#fff' }}>Ã¬Â ÂÃ¬ÂÂ¥</button>
            </div>
          </div>
        )}

        {recs.length === 0 && !showForm && (
          <div className="text-center py-8" style={{ color:'var(--ink-faint)' }}>
            <p className="text-[14px]">Ã«Â°Â°Ã¬Â¹ÂÃªÂ¸Â°Ã«Â¡ÂÃ¬ÂÂÃªÂ°Â Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤</p>
            <p className="text-[12px] mt-1">Ã¬ÂÂ ÃªÂ·Â Ã«Â²ÂÃ­ÂÂ¼Ã¬ÂÂ¼Ã«Â¡Â Ã«Â°Â°Ã¬Â¹ÂÃªÂ¸Â°Ã«Â¡ÂÃ¬ÂÂÃ«Â¥Â¼ Ã¬ÂÂÃ¬ÂÂ±Ã­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ</p>
          </div>
        )}

        <div className="space-y-2">
          {recs.map(r => (
            <div key={r.id} className="rounded-xl border p-3" style={{ borderColor:'var(--border)', background:'var(--surface)' }}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-semibold">{r.batchNo}</p>
                    <span className="px-1.5 py-0.5 rounded text-[11px] font-medium" style={{ background: r.status==='Ã¬ÂÂ¹Ã¬ÂÂ¸'?'var(--accent-soft)':(r.status==='Ã¬ÂÂÃ«Â£Â'?'rgba(34,197,94,0.12)':' rgba(148,163,184,0.15)'), color: r.status==='Ã¬ÂÂ¹Ã¬ÂÂ¸'?'var(--accent)':(r.status==='Ã¬ÂÂÃ«Â£Â'?'#16a34a':'var(--ink-mute)') }}>{r.status}</span>
                    <span className="px-1.5 py-0.5 rounded text-[11px] font-medium" style={{ background: r.inspResult==='Ã­ÂÂ©ÃªÂ²Â©'?'rgba(34,197,94,0.12)':(r.inspResult==='Ã«Â¶ÂÃ­ÂÂ©ÃªÂ²Â©'?'rgba(239,68,68,0.12)':' rgba(234,179,8,0.12)'), color: r.inspResult==='Ã­ÂÂ©ÃªÂ²Â©'?'#16a34a':(r.inspResult==='Ã«Â¶ÂÃ­ÂÂ©ÃªÂ²Â©'?'#dc2626':'#b45309') }}>{r.inspResult}</span>
                  </div>
                  <p className="text-[12px] mt-0.5" style={{ color:'var(--ink-faint)' }}>Ã«Â¡ÂÃ­ÂÂ¸: {r.lotNo} ÃÂ· ÃªÂ³ÂÃ­ÂÂ {r.planQty} Ã¢ÂÂ Ã¬ÂÂ¤Ã¬Â Â {r.actualQty} ÃÂ· Ã¬ÂÂÃ¬ÂÂ¨ {r.yieldRate}%</p>
                  <p className="text-[12px]" style={{ color:'var(--ink-faint)' }}>{r.startDate} ~ {r.endDate} ÃÂ· {r.operators}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={()=>openEdit(r)} className="p-1 rounded" style={{ color:'var(--ink-faint)' }}><Edit2 size={14}/></button>
                  <button onClick={()=>del(r.id)} className="p-1 rounded" style={{ color:'var(--danger)' }}><Trash2 size={14}/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}