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
  Edit3,
  ShieldCheck,
  FileText,
  Save,
  X,
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
import {
  inspectionTemplates,
  evalAgainstSpec,
  CRITICALITY_OPTIONS,
} from '../../lib/inspectionTemplates'
import { permissions, requirePermission } from '../../lib/permissions'

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

  // 활성 단계 자동 선택
  useEffect(() => {
    if (!wo) return
    if (activeStageId && wo.stages.find((s) => s.stageId === activeStageId)) return
    const inProgress = wo.stages.find(
      (s) => s.status === PROCESS_STATUS.IN_PROGRESS
    )
    const pending = wo.stages.find((s) => s.status === PROCESS_STATUS.PENDING)
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
            <button onClick={() => nav('/operations')} className="btn-ghost mt-4">
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
    if (!requirePermission('ops.stage.start')) return
    operations.startStage(wo.id, activeStageId, user?.name || '작업자')
    setWo(operations.getWorkOrder(woId))
  }

  const handleComplete = (payload) => {
    if (!requirePermission('ops.stage.sign')) return
    operations.completeStage(wo.id, activeStageId, payload)
    const updated = operations.getWorkOrder(woId)
    setWo(updated)
    const curIdx = updated.stages.findIndex((s) => s.stageId === activeStageId)
    const next = updated.stages[curIdx + 1]
    if (next && next.status === PROCESS_STATUS.PENDING) {
      setTimeout(() => setActiveStageId(next.stageId), 600)
    }
  }

  // 매니저가 진행 중에 항목 추가/수정/삭제했을 때 즉시 저장
  // (또는 작업자가 측정값 입력 중 부분 저장)
  const handleStageSave = (payload) => {
    operations.saveStageProgress(wo.id, activeStageId, payload)
    setWo(operations.getWorkOrder(woId))
  }

  return (
    <AppLayout
      user={user}
      title={`eBR · ${wo.id}`}
      subtitle={`${wo.productName} · 로트 ${wo.lotNumber}`}
    >
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto fade-in">
        {/* 상단 */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <button onClick={() => nav('/operations')} className="btn-ghost">
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

        {/* WO 메타 */}
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

        {/* 메인 */}
        <div className="grid lg:grid-cols-12 gap-5">
          {/* 좌: 단계 사이드바 */}
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
                  const name = stage.customName || block?.name || stage.blockId
                  const isActive = stage.stageId === activeStageId
                  const locked = stage.status === PROCESS_STATUS.LOCKED
                  return (
                    <button
                      key={stage.stageId}
                      onClick={() => !locked && setActiveStageId(stage.stageId)}
                      disabled={locked}
                      className="w-full flex items-center gap-2 p-2 rounded-md text-left transition"
                      style={{
                        background: isActive ? 'var(--rust-soft)' : 'transparent',
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

          {/* 우: 활성 단계 */}
          <div className="lg:col-span-9">
            {activeStage && activeBlock ? (
              <StageView
                key={activeStage.stageId}
                stage={activeStage}
                block={activeBlock}
                woStatus={wo.status}
                user={user}
                onStart={handleStart}
                onComplete={handleComplete}
                onStageSave={handleStageSave}
              />
            ) : (
              <div
                className="card-base p-8 text-center text-[13px]"
                style={{ color: 'var(--ink-mute)' }}
              >
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
   StageView — 단일 영역 안에서 권한별 모드 분기
     매니저: 항목 정의·수정·삭제 + 측정값 입력
     작업자: 항목 표시(읽기 전용) + 측정값 입력만
   ================================================================ */
function StageView({
  stage,
  block,
  woStatus,
  user,
  onStart,
  onComplete,
  onStageSave,
}) {
  const isCompleted = stage.status === PROCESS_STATUS.COMPLETED
  const isInProgress = stage.status === PROCESS_STATUS.IN_PROGRESS
  const isPending = stage.status === PROCESS_STATUS.PENDING
  const isLocked = stage.status === PROCESS_STATUS.LOCKED
  const readOnly = isLocked || isCompleted

  // 권한
  const canManage = permissions.can('ops.inspection.defineTemplate')
  const canMeasure = permissions.can('ops.stage.measure')
  const canSign = permissions.can('ops.stage.sign')

  // 검사 항목 — 진행 중 단계는 발급 시점 스냅샷을 기본으로 사용
  // 매니저가 추가/수정 시 마스터(inspectionTemplates 모듈)에도 반영하고
  // 동시에 현재 stage에도 즉시 반영한다
  const [templates, setTemplates] = useState(stage.inspectionTemplates || [])
  const [measurements, setMeasurements] = useState(stage.measurements || [])
  const [notes, setNotes] = useState(stage.notes || '')

  // 인라인 편집 폼 (새 항목 추가 또는 기존 수정)
  // editingTplId: 'new' | tpl.id | null
  const [editingTplId, setEditingTplId] = useState(null)
  const [editingDraft, setEditingDraft] = useState(null)

  const [signedBy, setSignedBy] = useState(
    stage.operatorSignature?.name || user?.name || '작업자'
  )
  const [showSignDialog, setShowSignDialog] = useState(false)

  // PENDING 단계인데 마스터에 새 템플릿이 추가되었을 가능성 — 진입 시 동기화
  // (다른 사용자가 매니저로 추가한 후, 작업자로 다시 들어올 때)
  useEffect(() => {
    if (isPending) {
      const fresh = inspectionTemplates.snapshotForBlock(stage.blockId)
      // 측정값이 비어있는 PENDING 단계라면 마스터를 다시 끌어옴
      const allEmpty = !measurements.length || measurements.every((m) => !m.value)
      if (allEmpty && fresh.length !== templates.length) {
        setTemplates(fresh)
        setMeasurements(
          fresh.map((t) => ({ templateId: t.id, value: '', pass: null, note: '' }))
        )
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage.blockId])

  /* -------- 검사 항목 정의 (매니저) -------- */
  const startNewTemplate = () => {
    if (!requirePermission('ops.inspection.defineTemplate')) return
    setEditingTplId('new')
    setEditingDraft({
      label: '',
      unit: '',
      specMin: '',
      specMax: '',
      specNominal: '',
      criticality: 'Major',
      method: '',
      sourceInspection: '',
    })
  }

  const startEditTemplate = (tpl) => {
    if (!requirePermission('ops.inspection.editTemplate')) return
    setEditingTplId(tpl.id)
    setEditingDraft({ ...tpl })
  }

  const cancelEditing = () => {
    setEditingTplId(null)
    setEditingDraft(null)
  }

  const saveEditing = () => {
    if (!editingDraft.label.trim()) {
      alert('항목명을 입력해 주세요.')
      return
    }
    let newTemplates = templates
    let newMeasurements = measurements

    if (editingTplId === 'new') {
      // 마스터에 추가
      const created = inspectionTemplates.add(
        stage.blockId,
        editingDraft,
        user?.name || '매니저'
      )
      newTemplates = [...templates, created]
      // 측정값 빈 슬롯 추가
      newMeasurements = [
        ...measurements,
        { templateId: created.id, value: '', pass: null, note: '' },
      ]
    } else {
      // 기존 항목 수정
      const updated = inspectionTemplates.update(
        stage.blockId,
        editingTplId,
        editingDraft,
        user?.name || '매니저'
      )
      newTemplates = templates.map((t) => (t.id === updated.id ? updated : t))
      // 규격이 바뀌었으면 기존 측정값의 합격 판정 재계산
      newMeasurements = measurements.map((m) => {
        if (m.templateId !== updated.id) return m
        if (m.value === '') return { ...m, pass: null }
        const passResult = evalAgainstSpec(m.value, updated)
        return { ...m, pass: passResult === 'unknown' ? null : passResult }
      })
    }

    setTemplates(newTemplates)
    setMeasurements(newMeasurements)
    setEditingTplId(null)
    setEditingDraft(null)

    // WO 단계에도 즉시 반영
    onStageSave({
      inspectionTemplates: newTemplates,
      measurements: newMeasurements,
    })
  }

  const removeTemplate = (tplId) => {
    if (!requirePermission('ops.inspection.deleteTemplate')) return
    if (
      !confirm(
        '이 검사 항목을 삭제할까요?\n현재 작업 지시에서도 즉시 제거되며, 마스터에서도 삭제됩니다.'
      )
    )
      return
    inspectionTemplates.remove(stage.blockId, tplId)
    const newTemplates = templates.filter((t) => t.id !== tplId)
    const newMeasurements = measurements.filter((m) => m.templateId !== tplId)
    setTemplates(newTemplates)
    setMeasurements(newMeasurements)
    onStageSave({
      inspectionTemplates: newTemplates,
      measurements: newMeasurements,
    })
  }

  /* -------- 자동 매핑 빠른 시드 (매니저) -------- */
  const definedSources = new Set(
    templates.map((t) => t.sourceInspection).filter(Boolean)
  )
  const unmappedAutoItems = (block.inspections || []).filter(
    (s) => !definedSources.has(s)
  )

  const seedFromMapping = (sourceInspection) => {
    if (!requirePermission('ops.inspection.defineTemplate')) return
    const created = inspectionTemplates.seedFromAutoMapping(
      stage.blockId,
      sourceInspection,
      user?.name || '매니저'
    )
    const newTemplates = [...templates, created]
    const newMeasurements = [
      ...measurements,
      { templateId: created.id, value: '', pass: null, note: '' },
    ]
    setTemplates(newTemplates)
    setMeasurements(newMeasurements)
    // 새로 만든 항목 바로 편집 모드로
    setEditingTplId(created.id)
    setEditingDraft(created)
    onStageSave({
      inspectionTemplates: newTemplates,
      measurements: newMeasurements,
    })
  }

  /* -------- 측정값 입력 (모든 권한) -------- */
  const updateMeasurement = (templateId, value) => {
    const tpl = templates.find((t) => t.id === templateId)
    if (!tpl) return
    const passResult = value === '' ? null : evalAgainstSpec(value, tpl)
    const next = (() => {
      const idx = measurements.findIndex((m) => m.templateId === templateId)
      if (idx === -1) {
        return [
          ...measurements,
          {
            templateId,
            value,
            pass: passResult === 'unknown' ? null : passResult,
            note: '',
          },
        ]
      }
      const arr = [...measurements]
      arr[idx] = {
        ...arr[idx],
        value,
        pass: passResult === 'unknown' ? null : passResult,
      }
      return arr
    })()
    setMeasurements(next)
  }

  const saveProgress = () => {
    onStageSave({ measurements, notes })
  }

  const allMeasured = templates.every((t) => {
    const m = measurements.find((mm) => mm.templateId === t.id)
    return m && m.value !== '' && (m.pass === 'pass' || m.pass === 'fail')
  })

  const anyFail = measurements.some((m) => m.pass === 'fail')

  /* -------- 화면 -------- */
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
          <StatusBadgeBig status={stage.status} />
        </div>

        {/* 자동 매핑 */}
        <div
          className="mt-4 pt-4 grid md:grid-cols-3 gap-4"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          <AutoChip icon={FileText} label="자동 매핑 SOP" items={block.sopAuto} />
          <AutoChip icon={ShieldCheck} label="적용 표준" items={block.standards} />
          <AutoChip
            icon={AlertTriangle}
            label="연관 위험"
            items={block.risks}
            tone="rust"
          />
        </div>
      </div>

      {/* 잠긴 단계 */}
      {isLocked && (
        <div
          className="card-base p-6 text-center"
          style={{ background: 'var(--bg-soft)', borderStyle: 'dashed' }}
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
            이전 단계가 완료·서명되어야 진입할 수 있습니다.
            <br />
            (공정 순차 잠금 — Stage Gate)
          </div>
        </div>
      )}

      {/* PENDING — 시작 전 */}
      {isPending && (
        <div className="card-base p-6">
          {templates.length === 0 ? (
            <div className="text-center">
              <AlertTriangle
                size={26}
                style={{ color: 'var(--amber)', margin: '0 auto' }}
                strokeWidth={1.6}
              />
              <div
                className="mt-2 font-display text-[18px]"
                style={{ color: 'var(--ink)', fontWeight: 500 }}
              >
                검사 항목이 정의되지 않았습니다
              </div>
              <div
                className="mt-1 text-[13px]"
                style={{ color: 'var(--ink-mute)' }}
              >
                {canManage
                  ? '먼저 아래 MEASUREMENTS 영역에서 검사 항목을 정의해 주세요.'
                  : '매니저가 검사 항목을 먼저 정의해야 시작할 수 있습니다.'}
              </div>
            </div>
          ) : !canMeasure ? (
            <div
              className="text-center text-[13px]"
              style={{ color: 'var(--ink-mute)' }}
            >
              단계 시작은 작업자(Level 1) 이상의 권한이 필요합니다.
            </div>
          ) : (
            <div className="text-center">
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
                검사 항목 {templates.length}개가 정의되어 있습니다. 시작하면 작업자(
                {user?.name})와 시작 시각이 자동 기록됩니다.
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
        </div>
      )}

      {/* MEASUREMENTS 영역 — 정의·측정 통합 */}
      {(isPending || isInProgress || isCompleted) && (
        <div className="card-base p-5">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <div
                className="font-mono text-[10px] tracking-[0.16em] uppercase"
                style={{ color: 'var(--ink-mute)' }}
              >
                MEASUREMENTS · 검사 항목
              </div>
              <div
                className="text-[12px] mt-0.5"
                style={{ color: 'var(--ink-mute)' }}
              >
                {canManage
                  ? '매니저: 항목·규격을 정의하면 작업자 화면에 같은 영역으로 표시됩니다. 작업자는 측정값만 입력합니다.'
                  : '정의된 검사 항목에 측정값을 입력하세요. 자동으로 합격/부적합이 판정됩니다.'}
              </div>
            </div>
            {canManage && !readOnly && editingTplId == null && (
              <button
                onClick={startNewTemplate}
                className="btn-primary"
                style={{ background: 'var(--moss)' }}
              >
                <Plus size={13} /> 검사 항목 추가
              </button>
            )}
          </div>

          {/* 자동 매핑 빠른 시드 — 매니저만 */}
          {canManage && unmappedAutoItems.length > 0 && !readOnly && editingTplId == null && (
            <div
              className="mb-3 rounded-lg p-3"
              style={{
                background: 'var(--leaf-soft)',
                border: '1px dashed var(--leaf)',
              }}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles size={12} style={{ color: 'var(--moss)' }} />
                <span
                  className="text-[11.5px]"
                  style={{ color: 'var(--moss)', fontWeight: 500 }}
                >
                  빠른 시드 — 자동 매핑된 검사 항목 (클릭하면 빈 규격으로 추가됨)
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {unmappedAutoItems.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => seedFromMapping(s)}
                    className="text-[12px] px-2.5 py-1 rounded-md"
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--moss)',
                      color: 'var(--moss)',
                    }}
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 정의된 검사 항목 목록 */}
          <div className="space-y-2">
            {templates.length === 0 && editingTplId == null && (
              <div
                className="text-center py-8 px-4 rounded-lg text-[13px]"
                style={{
                  background: 'var(--bg-soft)',
                  color: 'var(--ink-mute)',
                }}
              >
                {canManage ? (
                  <>
                    아직 정의된 검사 항목이 없습니다.
                    <br />
                    위 "<strong style={{ color: 'var(--moss)' }}>+ 검사 항목 추가</strong>" 버튼이나
                    빠른 시드 칩으로 시작하세요.
                  </>
                ) : (
                  <>매니저가 검사 항목을 먼저 정의해야 측정할 수 있습니다.</>
                )}
              </div>
            )}

            {templates.map((tpl) =>
              editingTplId === tpl.id ? (
                <TemplateEditForm
                  key={tpl.id}
                  value={editingDraft}
                  onChange={setEditingDraft}
                  onSave={saveEditing}
                  onCancel={cancelEditing}
                />
              ) : (
                <MeasurementRow
                  key={tpl.id}
                  template={tpl}
                  measurement={measurements.find((m) => m.templateId === tpl.id)}
                  canEdit={canManage && !readOnly}
                  canMeasure={canMeasure && (isInProgress || isPending) && !readOnly}
                  onChangeValue={(value) => updateMeasurement(tpl.id, value)}
                  onEdit={() => startEditTemplate(tpl)}
                  onRemove={() => removeTemplate(tpl.id)}
                />
              )
            )}

            {/* 새 항목 추가 폼 */}
            {editingTplId === 'new' && (
              <TemplateEditForm
                value={editingDraft}
                onChange={setEditingDraft}
                onSave={saveEditing}
                onCancel={cancelEditing}
              />
            )}
          </div>

          {/* 메모 */}
          {(isInProgress || isCompleted) && (
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
          )}

          {/* 진행 중 저장 */}
          {isInProgress && canMeasure && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={saveProgress}
                className="text-[12px] flex items-center gap-1.5 px-3 py-1.5 rounded-md"
                style={{ background: 'var(--bg-soft)', color: 'var(--ink)' }}
              >
                <Save size={12} /> 진행 저장 (서명 전)
              </button>
            </div>
          )}
        </div>
      )}

      {/* OOS 경고 */}
      {anyFail && !readOnly && isInProgress && (
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
            <strong>OOS(Out of Specification) 검출.</strong> 부적합 항목이 포함된 상태로 서명
            시 NCR이 자동 발의되며, 마지막 OK 검사 이후 모든 제품이 위험 구간으로 격리됩니다
            (§14.3).
          </div>
        </div>
      )}

      {/* 전자서명 */}
      {isInProgress && canSign && templates.length > 0 && (
        <div className="card-base p-5">
          <div className="flex items-start gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'var(--moss)' }}
            >
              <PenTool size={16} style={{ color: 'var(--bg)' }} strokeWidth={1.8} />
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
                21 CFR Part 11 §11.50 / EU Annex 11. 서명 시 작업자·시각·측정값 해시가 변경
                불가 기록으로 보존되며, 다음 단계가 잠금 해제됩니다.
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
                <div className="mt-2 text-[12px]" style={{ color: 'var(--amber)' }}>
                  ⚠ 모든 검사 항목의 측정값을 입력해야 서명할 수 있습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 완료된 단계 */}
      {isCompleted && stage.operatorSignature && (
        <div
          className="rounded-xl p-4 flex items-center gap-3"
          style={{ background: 'var(--leaf-soft)', border: '1px solid var(--leaf)' }}
        >
          <CheckCircle2 size={18} style={{ color: 'var(--moss)' }} strokeWidth={2} />
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
              {new Date(stage.operatorSignature.signedAt).toLocaleString('ko-KR')}
            </div>
          </div>
          <Sparkles size={14} style={{ color: 'var(--moss)' }} strokeWidth={1.6} />
        </div>
      )}

      {/* 작업자 입력 권한 부족 안내 */}
      {!canMeasure && isInProgress && (
        <div
          className="rounded-lg p-3 flex items-start gap-2"
          style={{
            background: 'var(--amber-soft)',
            border: '1px solid var(--amber)',
          }}
        >
          <span className="text-[14px]">🔒</span>
          <div className="text-[12.5px]" style={{ color: 'var(--rust)' }}>
            측정값 입력 권한이 없습니다. 작업자(Level 1) 이상으로 전환 후 입력해 주세요.
          </div>
        </div>
      )}

      {/* 서명 확인 */}
      {showSignDialog && (
        <SignConfirmDialog
          stage={stage}
          block={block}
          measurements={measurements}
          templates={templates}
          notes={notes}
          signedBy={signedBy}
          onCancel={() => setShowSignDialog(false)}
          onConfirm={() => {
            onComplete({ measurements, notes, signedBy })
            setShowSignDialog(false)
          }}
        />
      )}
    </div>
  )
}

/* ================================================================
   MeasurementRow — 단일 행
   - 항목 정보(읽기): 항목명·중요도·규격·단위
   - 측정값 입력: 항상 표시, 권한 없으면 disabled
   - 매니저 권한: 수정·삭제 아이콘 추가 표시
   ================================================================ */
function MeasurementRow({
  template,
  measurement,
  canEdit,
  canMeasure,
  onChangeValue,
  onEdit,
  onRemove,
}) {
  const m = measurement || { value: '', pass: null }
  const pass = m.pass
  const passColor =
    pass === 'pass' ? 'var(--leaf)' : pass === 'fail' ? 'var(--rust)' : 'var(--ink-faint)'
  const passBg =
    pass === 'pass'
      ? 'var(--leaf-soft)'
      : pass === 'fail'
      ? 'var(--rust-soft)'
      : 'var(--bg-soft)'
  const passText = pass === 'pass' ? '합격' : pass === 'fail' ? '부적합' : '미입력'

  return (
    <div
      className="rounded-lg p-3 flex items-center gap-3 flex-wrap"
      style={{ background: 'var(--bg-soft)' }}
    >
      {/* 항목명 + 규격 (읽기 전용) */}
      <div className="flex-1 min-w-[200px]">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[13px]"
            style={{ color: 'var(--ink)', fontWeight: 500 }}
          >
            {template.label}
          </span>
          <CriticalityChip c={template.criticality} />
          {canEdit && (
            <div className="flex items-center gap-0.5 ml-1">
              <button
                onClick={onEdit}
                className="p-1 rounded hover:bg-[var(--bg-card)] transition"
                style={{ color: 'var(--moss)' }}
                title="수정"
              >
                <Edit3 size={12} />
              </button>
              <button
                onClick={onRemove}
                className="p-1 rounded hover:bg-[var(--bg-card)] transition"
                style={{ color: 'var(--rust)' }}
                title="삭제"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>
        <div
          className="font-mono text-[11px] mt-0.5"
          style={{ color: 'var(--ink-mute)' }}
        >
          {template.specMin !== '' || template.specMax !== '' ? (
            <>
              규격: {template.specMin === '' ? '—' : template.specMin}~
              {template.specMax === '' ? '—' : template.specMax}
              {template.unit && ` ${template.unit}`}
              {template.method && ` · ${template.method}`}
            </>
          ) : (
            <span style={{ color: 'var(--amber)' }}>규격 미정의 — 매니저 정의 필요</span>
          )}
        </div>
      </div>

      {/* 측정값 입력 */}
      <div className="flex items-center gap-1.5">
        <input
          className="input-base"
          style={{
            width: 100,
            padding: '0.5rem 0.7rem',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 13,
            background: 'var(--bg-card)',
          }}
          type="number"
          step="any"
          value={m.value}
          disabled={!canMeasure}
          placeholder="측정값"
          onChange={(e) => onChangeValue(e.target.value)}
        />
        {template.unit && (
          <span
            className="text-[11.5px]"
            style={{ color: 'var(--ink-mute)' }}
          >
            {template.unit}
          </span>
        )}
      </div>

      {/* 자동 판정 */}
      <span
        className="tag"
        style={{
          background: passBg,
          color: passColor,
          minWidth: 56,
          justifyContent: 'center',
        }}
      >
        {passText}
      </span>
    </div>
  )
}

/* ================================================================
   TemplateEditForm — 검사 항목 정의·수정 인라인 폼 (매니저)
   ================================================================ */
function TemplateEditForm({ value, onChange, onSave, onCancel }) {
  const set = (patch) => onChange({ ...value, ...patch })
  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: 'var(--bg-card)',
        border: '2px solid var(--moss)',
      }}
    >
      <div
        className="font-mono text-[10px] tracking-[0.16em] uppercase mb-3"
        style={{ color: 'var(--moss)', fontWeight: 500 }}
      >
        {value.id ? `EDIT · ${value.label || '검사 항목'}` : 'NEW INSPECTION ITEM'}
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <Field label="항목명">
          <input
            className="input-base"
            value={value.label}
            onChange={(e) => set({ label: e.target.value })}
            placeholder="예: 치수 A, 외관 결함, 토크"
            autoFocus
          />
        </Field>
        <Field label="단위">
          <input
            className="input-base"
            value={value.unit}
            onChange={(e) => set({ unit: e.target.value })}
            placeholder="mm, N, °C, % ..."
          />
        </Field>
      </div>

      <div className="grid md:grid-cols-3 gap-3 mt-3">
        <Field label="규격 MIN">
          <input
            className="input-base"
            type="number"
            step="any"
            value={value.specMin}
            onChange={(e) => set({ specMin: e.target.value })}
            placeholder="예: 19.95"
          />
        </Field>
        <Field label="규격 MAX">
          <input
            className="input-base"
            type="number"
            step="any"
            value={value.specMax}
            onChange={(e) => set({ specMax: e.target.value })}
            placeholder="예: 20.05"
          />
        </Field>
        <Field label="공칭값 (선택)">
          <input
            className="input-base"
            type="number"
            step="any"
            value={value.specNominal}
            onChange={(e) => set({ specNominal: e.target.value })}
            placeholder="예: 20.00"
          />
        </Field>
      </div>

      <div className="grid md:grid-cols-2 gap-3 mt-3">
        <Field label="중요도 (Criticality)">
          <div className="flex gap-1.5">
            {CRITICALITY_OPTIONS.map((c) => (
              <button
                key={c.value}
                onClick={() => set({ criticality: c.value })}
                className="flex-1 py-1.5 rounded-md text-[12px] transition"
                style={{
                  background:
                    value.criticality === c.value
                      ? c.value === 'Critical'
                        ? 'var(--rust)'
                        : c.value === 'Major'
                        ? 'var(--amber)'
                        : 'var(--ink-mute)'
                      : 'var(--bg-soft)',
                  color:
                    value.criticality === c.value ? 'var(--bg)' : 'var(--ink)',
                  fontWeight: value.criticality === c.value ? 500 : 400,
                }}
                title={c.desc}
              >
                {c.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="측정 방법 (선택)">
          <input
            className="input-base"
            value={value.method}
            onChange={(e) => set({ method: e.target.value })}
            placeholder="CMM, 버니어, 토크렌치 ..."
          />
        </Field>
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onCancel} className="btn-ghost">
          <X size={14} /> 취소
        </button>
        <button
          onClick={onSave}
          className="btn-primary"
          style={{ background: 'var(--moss)' }}
        >
          <Save size={14} /> 저장
        </button>
      </div>
    </div>
  )
}

/* ================================================================
   부속 컴포넌트
   ================================================================ */
function CriticalityChip({ c }) {
  const cfg = {
    Critical: { bg: 'var(--rust-soft)', fg: 'var(--rust)' },
    Major: { bg: 'var(--amber-soft)', fg: 'var(--amber)' },
    Minor: { bg: 'var(--bg-soft)', fg: 'var(--ink-mute)' },
  }[c] || { bg: 'var(--bg-soft)', fg: 'var(--ink-mute)' }
  return (
    <span
      className="font-mono text-[9.5px] tracking-wider px-1.5 py-0.5 rounded uppercase"
      style={{ background: cfg.bg, color: cfg.fg, fontWeight: 500 }}
    >
      {c}
    </span>
  )
}

function StageIcon({ status, idx }) {
  if (status === PROCESS_STATUS.LOCKED) {
    return (
      <span
        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
        style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}
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
        <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>
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
   SignConfirmDialog
   ================================================================ */
function SignConfirmDialog({
  stage,
  block,
  measurements,
  templates,
  notes,
  signedBy,
  onCancel,
  onConfirm,
}) {
  const failCount = measurements.filter((m) => m.pass === 'fail').length
  const totalCount = templates.length

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
          <PenTool size={17} style={{ color: 'var(--moss)' }} strokeWidth={1.8} />
          <span
            className="font-display text-[18px]"
            style={{ color: 'var(--ink)', fontWeight: 500 }}
          >
            전자서명 확인
          </span>
        </div>

        <div className="text-[13px] leading-relaxed" style={{ color: 'var(--ink-mute)' }}>
          본 서명은 21 CFR Part 11 §11.50 / §11.70 및 EU Annex 11에 따라{' '}
          <strong style={{ color: 'var(--ink)' }}>변경 불가 기록</strong>으로 보존됩니다.
        </div>

        <div
          className="mt-4 rounded-lg p-3"
          style={{
            background: 'var(--bg-soft)',
            border: '1px solid var(--line)',
          }}
        >
          <div className="text-[12.5px] space-y-1">
            <SummaryRow label="STAGE" value={stage.customName || block.name} />
            <SummaryRow
              label="MEASUREMENTS"
              value={
                <>
                  {totalCount}건
                  {failCount > 0 && (
                    <span style={{ color: 'var(--rust)' }}> (부적합 {failCount}건)</span>
                  )}
                </>
              }
            />
            <SummaryRow label="SIGNER" value={signedBy} />
            <SummaryRow
              label="TIMESTAMP"
              value={
                <span className="font-mono text-[11.5px]">
                  {new Date().toLocaleString('ko-KR')}
                </span>
              }
            />
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
              부적합 항목이 포함되어 서명됩니다. 단계 완료 후 NCR이 자동 발의되며, 마지막 OK
              검사 이후 모든 제품이 재검사 큐에 등록됩니다.
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

function SummaryRow({ label, value }) {
  return (
    <div>
      <span
        className="font-mono text-[10px] tracking-wide uppercase"
        style={{ color: 'var(--ink-faint)' }}
      >
        {label}
      </span>{' '}
      <span style={{ color: 'var(--ink)' }}>{value}</span>
    </div>
  )
}
