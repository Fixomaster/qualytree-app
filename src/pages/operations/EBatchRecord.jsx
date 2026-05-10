import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Lock,
  CheckCircle2,
  Clock,
  PlayCircle,
  AlertTriangle,
  PenTool,
  Sparkles,
  Plus,
  Trash2,
  ChevronDown,
  Package,
  ShieldCheck,
  FileText,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import { onboarding } from '../../lib/onboardingState'
import { PROCESS_BLOCKS } from '../../lib/processBlocks'
import {
  operations,
  PROCESS_STATUS,
  WO_STATUS,
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

export default function EBatchRecord() {
  const { woId } = useParams()
  const nav = useNavigate()
  const user = auth.current()

  const [wo, setWo] = useState(() => operations.getWorkOrder(woId))
  const [activeStageId, setActiveStageId] = useState(null)

  const allBlocks = useMemo(
    () => [...PROCESS_BLOCKS, ...loadCustomBlocks()],
    []
  )
  const findBlock = (id) => allBlocks.find((b) => b.id === id)

  // 활성 단계 자동 선택 — 진행 중인 단계, 없으면 진입 가능 단계
  useEffect(() => {
    if (!wo) return
    if (activeStageId) {
      const exists = wo.stages.find((s) => s.stageId === activeStageId)
      if (exists) return
    }
    const inProgress = wo.stages.find(
      (s) => s.status === PROCESS_STATUS.IN_PROGRESS
    )
    const pending = wo.stages.find(
      (s) => s.status === PROCESS_STATUS.PENDING
    )
    const lastCompleted = [...wo.stages]
      .reverse()
      .find((s) => s.status === PROCESS_STATUS.COMPLETED)
    setActiveStageId(
      (inProgress || pending || lastCompleted || wo.stages[0])?.stageId
    )
  }, [wo, activeStageId])

  if (!wo) {
    return (
      <AppLayout user={user} title="eBR" subtitle="작업 지시를 찾을 수 없음">
        <div className="px-6 lg:px-8 py-8 max-w-[1280px] mx-auto">
          <div className="card-base p-8 text-center">
            <AlertTriangle
              size={28}
              style={{ color: 'var(--rust)', margin: '0 auto' }}
              strokeWidth={1.5}
            />
            <div
              className="mt-3 font-display text-[18px]"
              style={{ color: 'var(--ink)' }}
            >
              작업 지시 {woId}를 찾을 수 없습니다
            </div>
            <button
              onClick={() => nav('/operations')}
              className="btn-ghost mt-4"
            >
              <ArrowLeft size={14} /> 작업 지시 큐로
            </button>
          </div>
        </div>
      </AppLayout>
    )
  }

  const activeStage = wo.stages.find((s) => s.stageId === activeStageId)
  const activeBlock = activeStage ? findBlock(activeStage.blockId) : null
  const completedCount = wo.stages.filter(
    (s) => s.status === PROCESS_STATUS.COMPLETED
  ).length
  const progress = (completedCount / wo.stages.length) * 100

  const handleStart = () => {
    const operatorName = user?.name || '작업자'
    operations.startStage(wo.id, activeStageId, operatorName)
    setWo(operations.getWorkOrder(woId))
  }

  const handleComplete = (payload) => {
    operations.completeStage(wo.id, activeStageId, payload)
    const updated = operations.getWorkOrder(woId)
    setWo(updated)

    // 다음 단계로 자동 이동 (있으면)
    const cur = updated.stages.find((s) => s.stageId === activeStageId)
    const curIdx = updated.stages.findIndex((s) => s.stageId === activeStageId)
    const next = updated.stages[curIdx + 1]
    if (next && next.status === PROCESS_STATUS.PENDING) {
      setTimeout(() => setActiveStageId(next.stageId), 600)
    }
  }

  return (
    <AppLayout
      user={user}
      title={`eBR · ${wo.id}`}
      subtitle={`${wo.productName} · 로트 ${wo.lotNumber}`}
    >
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto fade-in">
        {/* 상단 메타 + 진행 바 */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <button
            onClick={() => nav('/operations')}
            className="btn-ghost"
          >
            <ArrowLeft size={14} /> 작업 지시 큐
          </button>
          <span
            className="tag"
            style={{
              background: 'var(--rust-soft)',
              color: 'var(--rust)',
            }}
          >
            OPS-002 · ELECTRONIC BATCH RECORD
          </span>
        </div>

        {/* WO 메타 패널 */}
        <div className="card-base p-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <MetaCell label="제품" value={wo.productName} />
            <MetaCell label="모델" value={wo.productModel} />
            <MetaCell label="로트" value={wo.lotNumber} mono />
            <MetaCell label="수량" value={`${wo.quantity}개`} />
            <MetaCell
              label="진행률"
              value={`${completedCount}/${wo.stages.length}`}
              accent
            />
          </div>
          <div
            className="mt-4 h-1.5 rounded-full overflow-hidden"
            style={{ background: 'var(--bg-deep)' }}
          >
            <div
              className="h-full transition-all"
              style={{
                width: `${progress}%`,
                background:
                  wo.status === WO_STATUS.COMPLETED
                    ? 'var(--leaf)'
                    : 'var(--rust)',
              }}
            />
          </div>
        </div>

        {/* 메인: 좌 단계 리스트 + 우 입력 */}
        <div className="grid lg:grid-cols-12 gap-5">
          {/* 좌: 단계 진행 사이드 */}
          <div className="lg:col-span-3">
            <div className="card-base p-3 lg:sticky lg:top-4">
              <div
                className="font-mono text-[10px] tracking-[0.16em] uppercase px-2 mb-2"
                style={{ color: 'var(--ink-mute)' }}
              >
                STAGES · 공정 순차 잠금
              </div>
              <ol className="space-y-1">
                {wo.stages.map((stage, i) => {
                  const block = findBlock(stage.blockId)
                  const name =
                    stage.customName || block?.name || stage.blockId
                  const isActive = stage.stageId === activeStageId
                  const locked = stage.status === PROCESS_STATUS.LOCKED
                  return (
                    <button
                      key={stage.stageId}
                      onClick={() => !locked && setActiveStageId(stage.stageId)}
                      disabled={locked}
                      className="w-full flex items-center gap-2 p-2 rounded-md text-left transition"
                      style={{
                        background: isActive
                          ? 'var(--rust-soft)'
                          : 'transparent',
                        color: locked ? 'var(--ink-faint)' : 'var(--ink)',
                        cursor: locked ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <StageIcon status={stage.status} idx={i + 1} />
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-[12.5px] truncate"
                          style={{ fontWeight: isActive ? 500 : 400 }}
                        >
                          {name}
                        </div>
                        {stage.operatorSignature && (
                          <div
                            className="font-mono text-[9.5px] mt-0.5"
                            style={{ color: 'var(--ink-faint)' }}
                          >
                            ✓ {stage.operatorSignature.name}
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </ol>
            </div>
          </div>

          {/* 우: 활성 단계 입력 */}
          <div className="lg:col-span-9">
            {activeStage && activeBlock ? (
              <StageEditor
                key={activeStage.stageId}
                stage={activeStage}
                block={activeBlock}
                woStatus={wo.status}
                operatorDefault={user?.name || '작업자'}
                onStart={handleStart}
                onComplete={handleComplete}
              />
            ) : (
              <div className="card-base p-8 text-center text-[13px]" style={{ color: 'var(--ink-mute)' }}>
                좌측에서 공정 단계를 선택하세요.
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

/* ================================================================
   StageIcon
   ================================================================ */
function StageIcon({ status, idx }) {
  if (status === PROCESS_STATUS.LOCKED) {
    return (
      <span
        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
        style={{
          background: 'var(--bg-soft)',
          color: 'var(--ink-faint)',
        }}
      >
        <Lock size={11} strokeWidth={2} />
      </span>
    )
  }
  if (status === PROCESS_STATUS.COMPLETED) {
    return (
      <span
        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
        style={{ background: 'var(--leaf)', color: 'var(--bg)' }}
      >
        <CheckCircle2 size={12} strokeWidth={2.5} />
      </span>
    )
  }
  if (status === PROCESS_STATUS.IN_PROGRESS) {
    return (
      <span
        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 pulse-soft"
        style={{ background: 'var(--rust)', color: 'var(--bg)' }}
      >
        <PlayCircle size={12} strokeWidth={2} />
      </span>
    )
  }
  return (
    <span
      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 font-mono text-[10px]"
      style={{
        background: 'var(--bg-card)',
        color: 'var(--amber)',
        border: '1px solid var(--amber)',
        fontWeight: 500,
      }}
    >
      {idx}
    </span>
  )
}

/* ================================================================
   StageEditor — 활성 단계의 측정·검사·서명 입력 화면
   ================================================================ */
function StageEditor({
  stage,
  block,
  woStatus,
  operatorDefault,
  onStart,
  onComplete,
}) {
  const isCompleted = stage.status === PROCESS_STATUS.COMPLETED
  const isInProgress = stage.status === PROCESS_STATUS.IN_PROGRESS
  const isPending = stage.status === PROCESS_STATUS.PENDING
  const isLocked = stage.status === PROCESS_STATUS.LOCKED

  // 측정값 입력 — 공정 블록의 inspections 자동 변환
  const initialMeasurements = useMemo(() => {
    if (stage.measurements && stage.measurements.length > 0) {
      return stage.measurements
    }
    return (block.inspections || []).map((label, i) => ({
      id: `m-${i}`,
      label,
      value: '',
      unit: guessUnit(label),
      pass: null, // null | true | false
    }))
  }, [stage, block])

  const [measurements, setMeasurements] = useState(initialMeasurements)
  const [notes, setNotes] = useState(stage.notes || '')
  const [signedBy, setSignedBy] = useState(
    stage.operatorSignature?.name || operatorDefault
  )
  const [showSignDialog, setShowSignDialog] = useState(false)

  // 잠금/완료 시 표시 모드
  const readOnly = isLocked || isCompleted

  const updateMeasurement = (idx, patch) => {
    const next = [...measurements]
    next[idx] = { ...next[idx], ...patch }
    setMeasurements(next)
  }

  const addMeasurement = () => {
    setMeasurements([
      ...measurements,
      {
        id: `m-${Date.now()}`,
        label: '',
        value: '',
        unit: '',
        pass: null,
      },
    ])
  }

  const removeMeasurement = (idx) => {
    setMeasurements(measurements.filter((_, i) => i !== idx))
  }

  // 모든 측정 완료 체크
  const allMeasured = measurements.every(
    (m) => m.value !== '' && m.pass !== null
  )
  const anyFail = measurements.some((m) => m.pass === false)

  return (
    <div className="space-y-4 fade-in" key={stage.stageId}>
      {/* 단계 헤더 */}
      <div className="card-base p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div
              className="font-mono text-[10px] tracking-[0.18em] uppercase"
              style={{ color: 'var(--rust)' }}
            >
              STAGE {stage.order} · {stage.stageId}
            </div>
            <div
              className="font-display text-[24px] mt-1.5 leading-tight"
              style={{ color: 'var(--ink)', fontWeight: 500 }}
            >
              {stage.customName || block.name}
            </div>
            <div
              className="text-[13px] mt-1.5 leading-relaxed"
              style={{ color: 'var(--ink-mute)' }}
            >
              {block.desc}
            </div>
          </div>

          {/* 상태 배지 */}
          <StatusBadgeBig status={stage.status} />
        </div>

        {/* 자동 매핑된 SOP/표준/위험 — 어제 ONB-003에서 정의한 데이터 */}
        <div
          className="mt-4 pt-4 grid md:grid-cols-3 gap-4"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          <AutoChip
            icon={FileText}
            label="자동 매핑 SOP"
            items={block.sopAuto}
          />
          <AutoChip
            icon={ShieldCheck}
            label="적용 표준"
            items={block.standards}
          />
          <AutoChip
            icon={AlertTriangle}
            label="연관 위험"
            items={block.risks}
            tone="rust"
          />
        </div>
      </div>

      {/* 잠긴 단계 안내 */}
      {isLocked && (
        <div
          className="card-base p-6 text-center"
          style={{
            background: 'var(--bg-soft)',
            borderStyle: 'dashed',
          }}
        >
          <Lock
            size={22}
            style={{ color: 'var(--ink-faint)', margin: '0 auto' }}
            strokeWidth={1.6}
          />
          <div
            className="mt-2 text-[13.5px]"
            style={{ color: 'var(--ink-mute)' }}
          >
            이전 단계가 완료·서명되어야 진입할 수 있습니다.<br />
            (공정 순차 잠금 — Stage Gate)
          </div>
        </div>
      )}

      {/* PENDING — 시작 버튼 */}
      {isPending && (
        <div className="card-base p-6 text-center">
          <PlayCircle
            size={26}
            style={{ color: 'var(--rust)', margin: '0 auto' }}
            strokeWidth={1.6}
          />
          <div
            className="mt-2 font-display text-[18px]"
            style={{ color: 'var(--ink)', fontWeight: 500 }}
          >
            이 단계를 시작할 준비가 되었습니다
          </div>
          <div
            className="mt-1 text-[13px]"
            style={{ color: 'var(--ink-mute)' }}
          >
            시작하면 작업자({operatorDefault})와 시작 시각이 자동 기록됩니다.
          </div>
          <button
            onClick={onStart}
            className="btn-primary mt-4"
            style={{ background: 'var(--rust)' }}
          >
            <PlayCircle size={15} /> 단계 시작
          </button>
        </div>
      )}

      {/* IN PROGRESS / COMPLETED — 측정값 입력 */}
      {(isInProgress || isCompleted) && (
        <>
          <div className="card-base p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div
                  className="font-mono text-[10px] tracking-[0.16em] uppercase"
                  style={{ color: 'var(--ink-mute)' }}
                >
                  MEASUREMENTS · 측정·검사 결과
                </div>
                <div
                  className="text-[12px] mt-0.5"
                  style={{ color: 'var(--ink-mute)' }}
                >
                  공정 블록에서 정의된 검사 항목이 자동으로 표시됩니다.
                </div>
              </div>
              {!readOnly && (
                <button
                  onClick={addMeasurement}
                  className="text-[12px] flex items-center gap-1 px-2 py-1 rounded-md"
                  style={{
                    background: 'var(--bg-soft)',
                    color: 'var(--ink)',
                  }}
                >
                  <Plus size={12} /> 항목 추가
                </button>
              )}
            </div>

            <div className="space-y-2">
              {measurements.length === 0 && (
                <div
                  className="text-center py-4 text-[12.5px]"
                  style={{ color: 'var(--ink-mute)' }}
                >
                  검사 항목을 추가하세요.
                </div>
              )}
              {measurements.map((m, idx) => (
                <MeasurementRow
                  key={m.id}
                  m={m}
                  readOnly={readOnly}
                  onChange={(patch) => updateMeasurement(idx, patch)}
                  onRemove={() => removeMeasurement(idx)}
                />
              ))}
            </div>

            {/* 메모 */}
            <div className="mt-4">
              <span
                className="block font-mono text-[10px] tracking-[0.16em] uppercase mb-1.5"
                style={{ color: 'var(--ink-mute)' }}
              >
                작업 메모
              </span>
              <textarea
                className="input-base"
                rows={2}
                value={notes}
                disabled={readOnly}
                placeholder="이상 사항·관찰 내용 등을 기록"
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* OOS 경고 */}
          {anyFail && !readOnly && (
            <div
              className="rounded-lg p-3 flex items-start gap-2"
              style={{
                background: 'var(--rust-soft)',
                border: '1px solid var(--rust)',
              }}
            >
              <AlertTriangle
                size={15}
                style={{ color: 'var(--rust)', marginTop: 2 }}
                strokeWidth={1.8}
              />
              <div className="text-[12.5px]" style={{ color: 'var(--rust)' }}>
                <strong>OOS 검출 항목이 있습니다.</strong> 부적합 항목이 포함된
                상태로 단계를 완료하면 NCR이 자동 발의되며, 마지막 OK 검사
                이후 모든 제품이 위험 구간으로 격리됩니다 (§14.3). 부적합
                원인 확인 후 진행해 주세요.
              </div>
            </div>
          )}

          {/* 전자서명 — 단계 완료 */}
          {isInProgress && (
            <div className="card-base p-5">
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'var(--moss)' }}
                >
                  <PenTool
                    size={16}
                    style={{ color: 'var(--bg)' }}
                    strokeWidth={1.8}
                  />
                </div>
                <div className="flex-1">
                  <div
                    className="font-display text-[16px]"
                    style={{ color: 'var(--ink)', fontWeight: 500 }}
                  >
                    전자서명으로 단계 완료
                  </div>
                  <div
                    className="text-[12.5px] mt-0.5"
                    style={{ color: 'var(--ink-mute)' }}
                  >
                    21 CFR Part 11 / EU Annex 11 준수. 서명 시 작업자·시각·
                    측정값 해시가 변경 불가 기록으로 보존되며, 다음 단계가
                    잠금 해제됩니다.
                  </div>

                  <div className="mt-3 grid md:grid-cols-[1fr_auto] gap-2">
                    <input
                      className="input-base"
                      value={signedBy}
                      onChange={(e) => setSignedBy(e.target.value)}
                      placeholder="서명자 이름"
                    />
                    <button
                      disabled={!allMeasured || !signedBy.trim()}
                      onClick={() => setShowSignDialog(true)}
                      className="btn-primary justify-center"
                      style={{ background: 'var(--moss)' }}
                    >
                      <PenTool size={14} /> 서명·완료
                    </button>
                  </div>
                  {!allMeasured && (
                    <div
                      className="mt-2 text-[12px]"
                      style={{ color: 'var(--amber)' }}
                    >
                      ⚠ 모든 측정 항목의 값과 합격/부적합을 입력해야 서명할 수
                      있습니다.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 완료된 단계 — 서명 표시 */}
          {isCompleted && stage.operatorSignature && (
            <div
              className="rounded-xl p-4 flex items-center gap-3"
              style={{
                background: 'var(--leaf-soft)',
                border: '1px solid var(--leaf)',
              }}
            >
              <CheckCircle2
                size={18}
                style={{ color: 'var(--moss)' }}
                strokeWidth={2}
              />
              <div className="flex-1">
                <div
                  className="text-[13.5px]"
                  style={{ color: 'var(--moss)', fontWeight: 500 }}
                >
                  단계 완료 · {stage.operatorSignature.name} 서명
                </div>
                <div
                  className="font-mono text-[11px] mt-0.5"
                  style={{ color: 'var(--moss)', opacity: 0.7 }}
                >
                  {new Date(stage.operatorSignature.signedAt).toLocaleString(
                    'ko-KR'
                  )}
                </div>
              </div>
              <Sparkles
                size={14}
                style={{ color: 'var(--moss)' }}
                strokeWidth={1.6}
              />
            </div>
          )}
        </>
      )}

      {/* 서명 확인 다이얼로그 */}
      {showSignDialog && (
        <SignConfirmDialog
          stage={stage}
          block={block}
          measurements={measurements}
          notes={notes}
          signedBy={signedBy}
          onCancel={() => setShowSignDialog(false)}
          onConfirm={() => {
            onComplete({
              measurements,
              inspectionResults: [],
              notes,
              signedBy,
            })
            setShowSignDialog(false)
          }}
        />
      )}
    </div>
  )
}

/* ================================================================
   AutoChip — 공정 블록의 자동 매핑 항목 표시
   ================================================================ */
function AutoChip({ icon: Icon, label, items, tone = 'moss' }) {
  const fg = tone === 'rust' ? 'var(--rust)' : 'var(--moss)'
  const bg = tone === 'rust' ? 'var(--rust-soft)' : 'var(--leaf-soft)'
  if (!items || items.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <Icon size={12} style={{ color: 'var(--ink-faint)' }} />
          <span
            className="font-mono text-[9.5px] tracking-[0.16em] uppercase"
            style={{ color: 'var(--ink-faint)' }}
          >
            {label}
          </span>
        </div>
        <div
          className="text-[12px]"
          style={{ color: 'var(--ink-faint)' }}
        >
          없음
        </div>
      </div>
    )
  }
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={12} style={{ color: fg }} />
        <span
          className="font-mono text-[9.5px] tracking-[0.16em] uppercase"
          style={{ color: 'var(--ink-mute)' }}
        >
          {label}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {items.map((it, i) => (
          <span
            key={i}
            className="text-[11px] px-2 py-0.5 rounded-md"
            style={{ background: bg, color: fg }}
          >
            {it}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ================================================================
   MeasurementRow
   ================================================================ */
function MeasurementRow({ m, readOnly, onChange, onRemove }) {
  return (
    <div
      className="flex items-center gap-2 p-2 rounded-lg"
      style={{ background: 'var(--bg-soft)' }}
    >
      <input
        className="input-base flex-1"
        style={{ background: 'var(--bg-card)', padding: '0.5rem 0.7rem' }}
        value={m.label}
        disabled={readOnly}
        placeholder="검사 항목"
        onChange={(e) => onChange({ label: e.target.value })}
      />
      <input
        className="input-base w-24"
        style={{
          background: 'var(--bg-card)',
          padding: '0.5rem 0.7rem',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 13,
        }}
        value={m.value}
        disabled={readOnly}
        placeholder="값"
        onChange={(e) => onChange({ value: e.target.value })}
      />
      <input
        className="input-base w-16"
        style={{
          background: 'var(--bg-card)',
          padding: '0.5rem 0.7rem',
          fontSize: 12,
        }}
        value={m.unit}
        disabled={readOnly}
        placeholder="단위"
        onChange={(e) => onChange({ unit: e.target.value })}
      />
      <div className="flex gap-1">
        <button
          onClick={() => onChange({ pass: true })}
          disabled={readOnly}
          className="px-2.5 py-1.5 rounded-md text-[11.5px] transition"
          style={{
            background: m.pass === true ? 'var(--leaf)' : 'var(--bg-card)',
            color:
              m.pass === true ? 'var(--bg)' : 'var(--ink-mute)',
            border: '1px solid var(--line)',
            fontWeight: m.pass === true ? 500 : 400,
            cursor: readOnly ? 'default' : 'pointer',
          }}
        >
          합격
        </button>
        <button
          onClick={() => onChange({ pass: false })}
          disabled={readOnly}
          className="px-2.5 py-1.5 rounded-md text-[11.5px] transition"
          style={{
            background: m.pass === false ? 'var(--rust)' : 'var(--bg-card)',
            color:
              m.pass === false ? 'var(--bg)' : 'var(--ink-mute)',
            border: '1px solid var(--line)',
            fontWeight: m.pass === false ? 500 : 400,
            cursor: readOnly ? 'default' : 'pointer',
          }}
        >
          부적합
        </button>
      </div>
      {!readOnly && (
        <button
          onClick={onRemove}
          className="p-1.5 rounded-md"
          style={{ color: 'var(--ink-faint)' }}
          title="항목 삭제"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  )
}

/* ================================================================
   StatusBadgeBig
   ================================================================ */
function StatusBadgeBig({ status }) {
  const cfg = {
    locked: {
      bg: 'var(--bg-soft)',
      fg: 'var(--ink-faint)',
      text: '잠김',
      Icon: Lock,
    },
    pending: {
      bg: 'var(--amber-soft)',
      fg: 'var(--amber)',
      text: '진입 가능',
      Icon: Clock,
    },
    in_progress: {
      bg: 'var(--rust-soft)',
      fg: 'var(--rust)',
      text: '진행 중',
      Icon: PlayCircle,
    },
    completed: {
      bg: 'var(--leaf-soft)',
      fg: 'var(--moss)',
      text: '완료',
      Icon: CheckCircle2,
    },
  }[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px]"
      style={{ background: cfg.bg, color: cfg.fg, fontWeight: 500 }}
    >
      <cfg.Icon size={13} strokeWidth={1.8} />
      {cfg.text}
    </span>
  )
}

/* ================================================================
   MetaCell
   ================================================================ */
function MetaCell({ label, value, mono, accent }) {
  return (
    <div>
      <div
        className="font-mono text-[10px] tracking-[0.16em] uppercase"
        style={{ color: 'var(--ink-faint)' }}
      >
        {label}
      </div>
      <div
        className={`mt-1 text-[14px] truncate ${mono ? 'font-mono text-[13px]' : ''}`}
        style={{
          color: accent ? 'var(--rust)' : 'var(--ink)',
          fontWeight: accent ? 500 : 400,
        }}
      >
        {value}
      </div>
    </div>
  )
}

/* ================================================================
   SignConfirmDialog
   ================================================================ */
function SignConfirmDialog({
  stage,
  block,
  measurements,
  notes,
  signedBy,
  onCancel,
  onConfirm,
}) {
  const failCount = measurements.filter((m) => m.pass === false).length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,26,20,0.55)' }}
      onClick={onCancel}
    >
      <div
        className="card-base p-6 max-w-md w-full fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-3">
          <PenTool
            size={17}
            style={{ color: 'var(--moss)' }}
            strokeWidth={1.8}
          />
          <span
            className="font-display text-[18px]"
            style={{ color: 'var(--ink)', fontWeight: 500 }}
          >
            전자서명 확인
          </span>
        </div>

        <div
          className="text-[13px] leading-relaxed"
          style={{ color: 'var(--ink-mute)' }}
        >
          본 서명은 21 CFR Part 11 §11.50 / §11.70 및 EU Annex 11에 따라{' '}
          <strong style={{ color: 'var(--ink)' }}>변경 불가 기록</strong>으로
          보존됩니다.
        </div>

        <div
          className="mt-4 rounded-lg p-3"
          style={{
            background: 'var(--bg-soft)',
            border: '1px solid var(--line)',
          }}
        >
          <div className="text-[12.5px] space-y-1">
            <div>
              <span
                className="font-mono text-[10px] tracking-wide uppercase"
                style={{ color: 'var(--ink-faint)' }}
              >
                STAGE
              </span>{' '}
              <span style={{ color: 'var(--ink)' }}>
                {stage.customName || block.name}
              </span>
            </div>
            <div>
              <span
                className="font-mono text-[10px] tracking-wide uppercase"
                style={{ color: 'var(--ink-faint)' }}
              >
                MEASUREMENTS
              </span>{' '}
              <span style={{ color: 'var(--ink)' }}>
                {measurements.length}건
                {failCount > 0 && (
                  <span style={{ color: 'var(--rust)' }}>
                    {' '}(부적합 {failCount}건)
                  </span>
                )}
              </span>
            </div>
            <div>
              <span
                className="font-mono text-[10px] tracking-wide uppercase"
                style={{ color: 'var(--ink-faint)' }}
              >
                SIGNER
              </span>{' '}
              <span style={{ color: 'var(--ink)' }}>{signedBy}</span>
            </div>
            <div>
              <span
                className="font-mono text-[10px] tracking-wide uppercase"
                style={{ color: 'var(--ink-faint)' }}
              >
                TIMESTAMP
              </span>{' '}
              <span className="font-mono text-[11.5px]" style={{ color: 'var(--ink)' }}>
                {new Date().toLocaleString('ko-KR')}
              </span>
            </div>
          </div>
        </div>

        {failCount > 0 && (
          <div
            className="mt-3 rounded-lg p-3 flex items-start gap-2"
            style={{
              background: 'var(--rust-soft)',
              border: '1px solid var(--rust)',
            }}
          >
            <AlertTriangle
              size={14}
              style={{ color: 'var(--rust)', marginTop: 2 }}
              strokeWidth={1.8}
            />
            <div className="text-[12px]" style={{ color: 'var(--rust)' }}>
              부적합 항목이 포함되어 서명됩니다. 단계 완료 후 NCR이 자동
              발의되며, 다음 단계가 잠금 해제됨과 동시에 마지막 OK 검사
              이후 모든 제품이 재검사 큐에 등록됩니다.
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-5">
          <button onClick={onCancel} className="btn-ghost flex-1 justify-center">
            취소
          </button>
          <button
            onClick={onConfirm}
            className="btn-primary flex-1 justify-center"
            style={{ background: 'var(--moss)' }}
          >
            <PenTool size={14} /> 서명 확정
          </button>
        </div>
      </div>
    </div>
  )
}

/* ================================================================
   유틸 — 검사 항목명에서 단위 추측
   ================================================================ */
function guessUnit(label) {
  if (!label) return ''
  if (label.includes('치수') || label.includes('GD&T')) return 'mm'
  if (label.includes('압입') || label.includes('힘')) return 'N'
  if (label.includes('표면 거칠기')) return 'μm'
  if (label.includes('온도')) return '°C'
  if (label.includes('압력')) return 'bar'
  if (label.includes('누설')) return 'mbar·L/s'
  if (label.includes('선량')) return 'kGy'
  if (label.includes('생물부담') || label.includes('TOC')) return 'CFU'
  return ''
}
