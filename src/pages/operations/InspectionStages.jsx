import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Lock,
  Plus,
  AlertTriangle,
  Sparkles,
  Save,
  PenTool,
  Package,
  Layers,
  ShieldCheck,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import { permissions, requirePermission, LEVELS } from '../../lib/permissions'
import { operations } from '../../lib/operationsState'
import {
  inspectionStages,
  STAGE_TYPES,
  STAGE_TYPE_META,
  EXEC_STATUS,
  EXEC_STATUS_LABEL,
  recommendSampleSize,
} from '../../lib/inspectionStages'
import { inspectionTemplates, evalAgainstSpec } from '../../lib/inspectionTemplates'
import { ncr, NCR_SEVERITY } from '../../lib/ncrState'
import { capa, evaluateForCAPA } from '../../lib/capaState'
import { ENTITY_TYPES, eid } from '../../lib/entityRegistry'

/**
 * OPS-003 — 검사 단계 (IQC / FAI / IPI / LAI)
 *
 * 적용 표준:
 * - Project Instructions §13.14
 * - ISO 13485:2016 §7.4.3 / §8.2.4 / §8.2.6
 * - 21 CFR 820.80
 */
export default function InspectionStages() {
  const { woId } = useParams()
  const nav = useNavigate()
  const user = auth.current()

  const [wo, setWo] = useState(operations.getWorkOrder(woId))
  const [stages, setStages] = useState(inspectionStages.forWorkOrder(woId))
  const [activeTab, setActiveTab] = useState(STAGE_TYPES.IQC)
  const [toast, setToast] = useState(null)

  const reload = () => {
    setWo(operations.getWorkOrder(woId))
    setStages(inspectionStages.forWorkOrder(woId))
  }

  const showToast = (text, kind = 'ok') => {
    setToast({ text, kind })
    setTimeout(() => setToast(null), 2400)
  }

  if (!wo) {
    return (
      <AppLayout user={user} title="검사 단계">
        <div className="px-6 py-10 text-center" style={{ color: 'var(--ink-mute)' }}>
          작업 지시를 찾을 수 없습니다.{' '}
          <button onClick={() => nav('/operations')} className="underline">
            큐로 돌아가기
          </button>
        </div>
      </AppLayout>
    )
  }

  const canPlan = permissions.can('ops.inspection.defineTemplate') // 매니저
  const canMeasure = permissions.can('ops.stage.measure') // 작업자+
  const canSign = permissions.can('ops.inspection.review') // 검사관+

  // 4개 검사 단계 자동 발행 (계획됨 상태만)
  const handlePlanAll = () => {
    if (!requirePermission('ops.inspection.defineTemplate')) return
    inspectionStages.planAllStandard(woId)
    reload()
    showToast('IQC / FAI / IPI / LAI 4개 검사 단계 계획 발행됨')
  }

  // 단일 검사 단계 발행
  const handlePlanOne = (stageType) => {
    if (!requirePermission('ops.inspection.defineTemplate')) return
    try {
      inspectionStages.plan({ woId, stageType })
      reload()
      showToast(`${STAGE_TYPE_META[stageType].ko} 단계 계획됨`)
    } catch (err) {
      alert(`발행 실패: ${err.message}`)
    }
  }

  const stagesByType = {
    [STAGE_TYPES.IQC]: stages.find((s) => s.stageType === STAGE_TYPES.IQC),
    [STAGE_TYPES.FAI]: stages.find((s) => s.stageType === STAGE_TYPES.FAI),
    [STAGE_TYPES.IPI]: stages.find((s) => s.stageType === STAGE_TYPES.IPI),
    [STAGE_TYPES.LAI]: stages.find((s) => s.stageType === STAGE_TYPES.LAI),
  }

  const releaseQualified = inspectionStages.isReleaseQualified(woId)

  return (
    <AppLayout
      user={user}
      title={`검사 단계 · ${wo.id}`}
      subtitle={`${wo.productName} · 로트 ${wo.lotNumber} · ${wo.quantity}개`}
    >
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto fade-in">
        {/* Toast */}
        {toast && (
          <div
            className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-lg text-[13px] flex items-center gap-2 fade-in"
            style={{
              background: toast.kind === 'warn' ? 'var(--rust)' : 'var(--moss)',
              color: 'var(--bg)',
              boxShadow: '0 6px 20px rgba(15,26,20,0.18)',
              fontWeight: 500,
            }}
          >
            <CheckCircle2 size={14} strokeWidth={2.2} />
            {toast.text}
          </div>
        )}

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <button
            onClick={() => nav('/operations')}
            className="btn-ghost text-[13px]"
          >
            <ArrowLeft size={13} /> 작업 지시 큐
          </button>
          <span
            className="font-mono text-[10px] tracking-[0.18em] uppercase"
            style={{ color: 'var(--moss)' }}
          >
            OPS-003 · INSPECTION STAGES
          </span>
        </div>

        {/* 작업 지시 정보 */}
        <div
          className="card-base p-4 mb-5 grid md:grid-cols-5 gap-4"
        >
          <Meta label="제품" value={wo.productName} />
          <Meta label="모델" value={wo.productModel} mono />
          <Meta label="로트" value={wo.lotNumber} mono />
          <Meta label="수량" value={`${wo.quantity}개`} />
          <Meta
            label="출하 가능"
            value={
              <span
                className="tag"
                style={{
                  background: releaseQualified
                    ? 'var(--leaf-soft)'
                    : 'var(--bg-soft)',
                  color: releaseQualified ? 'var(--moss)' : 'var(--ink-mute)',
                }}
              >
                {releaseQualified ? '✓ LAI 합격' : 'LAI 합격 필요'}
              </span>
            }
          />
        </div>

        {/* 4개 검사 단계 진행 카드 */}
        <div className="grid md:grid-cols-4 gap-3 mb-5">
          {[STAGE_TYPES.IQC, STAGE_TYPES.FAI, STAGE_TYPES.IPI, STAGE_TYPES.LAI].map(
            (type) => (
              <StageCard
                key={type}
                type={type}
                stage={stagesByType[type]}
                active={activeTab === type}
                onClick={() => setActiveTab(type)}
                onPlan={() => handlePlanOne(type)}
                canPlan={canPlan}
              />
            )
          )}
        </div>

        {/* 일괄 발행 버튼 */}
        {stages.length === 0 && canPlan && (
          <div
            className="card-base p-6 text-center mb-5"
            style={{ borderStyle: 'dashed' }}
          >
            <ClipboardCheck
              size={32}
              style={{ color: 'var(--ink-faint)', margin: '0 auto' }}
              strokeWidth={1.4}
            />
            <div className="mt-3 text-[13px]" style={{ color: 'var(--ink)' }}>
              검사 단계가 아직 계획되지 않았습니다.
            </div>
            <button
              onClick={handlePlanAll}
              className="btn-primary mt-3"
              style={{ background: 'var(--moss)' }}
            >
              <Sparkles size={13} /> IQC / FAI / IPI / LAI 4단계 일괄 발행
            </button>
            <div
              className="mt-2 text-[11px]"
              style={{ color: 'var(--ink-faint)' }}
            >
              샘플 크기는 작업 지시 수량 기준 ISO 2859-1 근사 자동 계산
            </div>
          </div>
        )}

        {/* 활성 검사 단계 상세 */}
        {stages.length > 0 && (
          <StageDetail
            stage={stagesByType[activeTab]}
            stageType={activeTab}
            wo={wo}
            canPlan={canPlan}
            canMeasure={canMeasure}
            canSign={canSign}
            onPlan={() => handlePlanOne(activeTab)}
            onUpdate={() => {
              reload()
            }}
            showToast={showToast}
          />
        )}
      </div>
    </AppLayout>
  )
}

/* ================================================================
   StageCard — 4개 검사 단계 진행 상황 카드
   ================================================================ */
function StageCard({ type, stage, active, onClick, onPlan, canPlan }) {
  const meta = STAGE_TYPE_META[type]
  const status = stage?.status || 'unplanned'
  const statusLabel = stage
    ? EXEC_STATUS_LABEL[stage.status]
    : { ko: '미계획', tone: 'ink-mute' }

  return (
    <button
      onClick={onClick}
      className="card-base p-3.5 text-left transition"
      style={{
        borderColor: active ? `var(--${meta.color})` : 'var(--line)',
        borderWidth: active ? 2 : 1,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="font-mono text-[10px] tracking-[0.16em] uppercase"
          style={{ color: `var(--${meta.color})`, fontWeight: 600 }}
        >
          {type}
        </span>
        <span
          className="text-[12.5px] flex-1"
          style={{ color: 'var(--ink)', fontWeight: 500 }}
        >
          {meta.ko}
        </span>
      </div>
      <div
        className="text-[11px] mb-2 line-clamp-2"
        style={{ color: 'var(--ink-mute)', minHeight: 28 }}
      >
        {meta.description}
      </div>
      {stage ? (
        <div className="flex items-center justify-between">
          <span
            className="font-mono text-[10px] px-1.5 py-0.5 rounded"
            style={{
              background: `var(--${statusLabel.tone}-soft)`,
              color: `var(--${statusLabel.tone})`,
              fontWeight: 500,
            }}
          >
            {statusLabel.ko}
          </span>
          <span
            className="font-mono text-[10px]"
            style={{ color: 'var(--ink-faint)' }}
          >
            샘플 {stage.actualSampleSize}/{stage.plannedSampleSize}
          </span>
        </div>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onPlan()
          }}
          disabled={!canPlan}
          className="btn-ghost text-[11px] w-full justify-center"
          style={{ padding: '4px 8px' }}
        >
          <Plus size={11} /> 계획 발행
        </button>
      )}
    </button>
  )
}

/* ================================================================
   StageDetail — 단일 검사 단계 상세
   ================================================================ */
function StageDetail({
  stage,
  stageType,
  wo,
  canPlan,
  canMeasure,
  canSign,
  onPlan,
  onUpdate,
  showToast,
}) {
  const meta = STAGE_TYPE_META[stageType]

  if (!stage) {
    return (
      <div
        className="card-base p-6 text-center"
        style={{ borderStyle: 'dashed' }}
      >
        <ClipboardCheck
          size={28}
          style={{ color: 'var(--ink-faint)', margin: '0 auto' }}
          strokeWidth={1.4}
        />
        <div className="mt-2 text-[13px]" style={{ color: 'var(--ink)' }}>
          {meta.ko}({stageType}) 단계 미계획
        </div>
        {canPlan && (
          <button onClick={onPlan} className="btn-ghost mt-3 text-[12px]">
            <Plus size={12} /> {meta.ko} 계획 발행
          </button>
        )}
      </div>
    )
  }

  // 샘플 크기 만큼 슬롯 채우기
  const sampledItems = useMemo(() => {
    const slots = []
    for (let i = 0; i < stage.plannedSampleSize; i++) {
      const existing = stage.sampledItems?.[i]
      slots.push(
        existing || {
          unitNo: i + 1,
          measurements: [],
          pass: null,
        }
      )
    }
    return slots
  }, [stage])

  const [items, setItems] = useState(sampledItems)
  const [inspectorName, setInspectorName] = useState('')

  useEffect(() => {
    setItems(sampledItems)
  }, [stage.id, stage.plannedSampleSize])

  // 검사 항목 풀 — eBR과 동일한 inspectionTemplates 사용
  // IQC는 입고 자재 → 자재 검사 항목, FAI/IPI/LAI는 작업 지시의 단계별 항목 통합
  const allTemplates = useMemo(() => {
    if (stageType === STAGE_TYPES.IQC) {
      // IQC는 입고 자재 검사 — 일단 첫 공정 단계의 검사 항목을 임시 사용
      return wo.stages?.[0]?.inspectionTemplates || []
    }
    // FAI/IPI/LAI는 모든 단계의 검사 항목 통합
    const all = []
    const seen = new Set()
    ;(wo.stages || []).forEach((s) => {
      ;(s.inspectionTemplates || []).forEach((t) => {
        if (!seen.has(t.id)) {
          all.push(t)
          seen.add(t.id)
        }
      })
    })
    return all
  }, [wo, stageType])

  const handleStart = () => {
    if (!canMeasure) {
      alert('검사 시작은 작업자(Level 1) 이상 권한이 필요합니다.')
      return
    }
    inspectionStages.start(stage.id)
    onUpdate()
    showToast('검사 시작됨')
  }

  const updateMeasurement = (unitIdx, templateId, value) => {
    const tpl = allTemplates.find((t) => t.id === templateId)
    if (!tpl) return
    const passResult = evalAgainstSpec(value, tpl)
    const pass =
      passResult === 'pass' ? true : passResult === 'fail' ? false : null

    const next = [...items]
    const measurements = next[unitIdx].measurements || []
    const mIdx = measurements.findIndex((m) => m.templateId === templateId)
    const newMeasurement = {
      templateId,
      value,
      pass: pass === null ? null : pass ? 'pass' : 'fail',
      note: '',
    }
    if (mIdx === -1) {
      next[unitIdx] = {
        ...next[unitIdx],
        measurements: [...measurements, newMeasurement],
      }
    } else {
      next[unitIdx] = {
        ...next[unitIdx],
        measurements: measurements.map((m, i) =>
          i === mIdx ? newMeasurement : m
        ),
      }
    }

    // 단위 단위 합격 판정
    const allMeasurements = next[unitIdx].measurements
    const allMeasured =
      allMeasurements.length === allTemplates.length &&
      allMeasurements.every((m) => m.value !== '')
    if (allMeasured) {
      const anyFail = allMeasurements.some((m) => m.pass === 'fail')
      next[unitIdx].pass = !anyFail
    } else {
      next[unitIdx].pass = null
    }
    setItems(next)
  }

  const handleSaveProgress = () => {
    inspectionStages.saveProgress(stage.id, items)
    onUpdate()
    const measuredCount = items.filter((s) =>
      s.measurements?.some((m) => m.value !== '')
    ).length
    showToast(`측정 진행 저장 (${measuredCount}/${stage.plannedSampleSize})`)
  }

  const handleComplete = () => {
    if (!canSign) {
      alert('검사 완료는 검사관(Level 2) 이상 권한이 필요합니다.')
      return
    }
    if (!inspectorName.trim()) {
      alert('검사관 이름을 입력해 주세요.')
      return
    }
    const allMeasured = items.every(
      (s) => s.pass === true || s.pass === false
    )
    if (!allMeasured) {
      alert('모든 샘플의 측정값을 입력해 주세요.')
      return
    }

    try {
      const completed = inspectionStages.complete(stage.id, {
        sampledItems: items,
        inspectorName: inspectorName.trim(),
      })

      // 부적합이 있으면 NCR 자동 발의 (eBR과 같은 흐름)
      const failedUnits = items.filter((s) => s.pass === false)
      if (failedUnits.length > 0) {
        const raisedNcrs = []
        failedUnits.forEach((unit) => {
          ;(unit.measurements || [])
            .filter((m) => m.pass === 'fail')
            .forEach((m) => {
              const tpl = allTemplates.find((t) => t.id === m.templateId)
              if (!tpl) return
              const severity =
                tpl.criticality === 'Critical'
                  ? NCR_SEVERITY.CRITICAL
                  : tpl.criticality === 'Major'
                  ? NCR_SEVERITY.MAJOR
                  : NCR_SEVERITY.MINOR
              const ncrRecord = ncr.raise({
                severity,
                source: {
                  type: 'inspectionStage',
                  stageType: stage.stageType,
                  insExecId: stage.id,
                  woId: wo.id,
                  templateId: m.templateId,
                  unitNo: unit.unitNo,
                  measurementValue: m.value,
                },
                title: `${meta.ko}(${stage.stageType}) — ${tpl.label} (단위 ${unit.unitNo})`,
                description: `${meta.ko} 단계에서 단위 ${unit.unitNo}의 "${tpl.label}" 측정값 ${m.value}${
                  tpl.unit ? ' ' + tpl.unit : ''
                } 부적합 (규격: ${tpl.specMin}~${tpl.specMax}${
                  tpl.unit ? ' ' + tpl.unit : ''
                }).`,
              })
              inspectionStages.attachNcr(stage.id, ncrRecord.id)
              raisedNcrs.push(ncrRecord)
              const cap = evaluateForCAPA(ncrRecord)
              if (cap) {
                capa.raise({
                  title: cap.suggestedTitle,
                  description: cap.reason,
                  trigger: cap.trigger,
                  triggerReason: cap.reason,
                  sourceNcrIds: [ncrRecord.id],
                })
              }
            })
        })

        showToast(
          `검사 완료 — 부적합 ${failedUnits.length}건, NCR ${raisedNcrs.length}건 자동 발의`,
          'warn'
        )
      } else {
        showToast(`${meta.ko} 검사 합격 — 서명 완료`)
      }
      onUpdate()
    } catch (err) {
      alert(`검사 완료 실패: ${err.message}`)
    }
  }

  const isPlanned = stage.status === EXEC_STATUS.PLANNED
  const isInProgress = stage.status === EXEC_STATUS.IN_PROGRESS
  const isCompleted =
    stage.status === EXEC_STATUS.COMPLETED_PASS ||
    stage.status === EXEC_STATUS.COMPLETED_FAIL

  return (
    <div className="card-base p-5">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <span
            className="font-mono text-[10px] tracking-[0.18em] uppercase"
            style={{ color: `var(--${meta.color})` }}
          >
            {stage.id} · {stage.stageType}
          </span>
          <div
            className="font-display text-[20px] mt-1 leading-tight"
            style={{ color: 'var(--ink)', fontWeight: 500 }}
          >
            {meta.ko} ({meta.en})
          </div>
          <div
            className="text-[12px] mt-0.5"
            style={{ color: 'var(--ink-mute)' }}
          >
            {meta.when} · {meta.standards}
          </div>
        </div>
        <span
          className="tag"
          style={{
            background: `var(--${EXEC_STATUS_LABEL[stage.status].tone}-soft)`,
            color: `var(--${EXEC_STATUS_LABEL[stage.status].tone})`,
            fontWeight: 500,
          }}
        >
          {EXEC_STATUS_LABEL[stage.status].ko}
        </span>
      </div>

      <div
        className="grid md:grid-cols-3 gap-3 pt-3"
        style={{ borderTop: '1px solid var(--line)' }}
      >
        <Meta label="계획 샘플" value={`${stage.plannedSampleSize}개`} />
        <Meta label="실제 측정" value={`${stage.actualSampleSize}개`} />
        <Meta
          label="검사관 서명"
          value={
            stage.inspectorSignature
              ? `${stage.inspectorSignature.name} · ${new Date(stage.inspectorSignature.signedAt).toLocaleString('ko-KR')}`
              : '미서명'
          }
        />
      </div>

      {/* 액션 버튼 */}
      {isPlanned && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleStart}
            className="btn-primary"
            style={{ background: `var(--${meta.color})` }}
          >
            <ClipboardCheck size={13} /> 검사 시작
          </button>
        </div>
      )}

      {/* 검사 항목 매트릭스 (시작 후 또는 완료 후) */}
      {(isInProgress || isCompleted) && allTemplates.length > 0 && (
        <SampleMeasurementMatrix
          items={items}
          templates={allTemplates}
          onChangeMeasurement={updateMeasurement}
          readOnly={isCompleted || !canMeasure}
        />
      )}

      {(isInProgress || isCompleted) && allTemplates.length === 0 && (
        <div
          className="mt-4 rounded-lg p-4 text-center text-[12.5px]"
          style={{
            background: 'var(--amber-soft)',
            color: 'var(--amber)',
          }}
        >
          ⚠ 작업 지시에 검사 항목 템플릿이 정의되지 않았습니다. eBR 화면에서
          매니저가 검사 항목을 먼저 정의해야 합니다.
        </div>
      )}

      {/* 진행 저장 + 검사관 서명 */}
      {isInProgress && allTemplates.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="flex justify-end">
            <button
              onClick={handleSaveProgress}
              className="btn-ghost text-[12px]"
            >
              <Save size={12} /> 진행 저장 (서명 전)
            </button>
          </div>

          <div
            className="rounded-lg p-4"
            style={{
              background: 'var(--bg-soft)',
              border: '1px solid var(--line)',
            }}
          >
            <div
              className="font-mono text-[10px] tracking-[0.16em] uppercase mb-2"
              style={{ color: 'var(--ink-mute)' }}
            >
              INSPECTOR SIGNATURE · 검사관 전자 서명 (Part 11 §11.50/§11.70)
            </div>
            <div className="grid sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                placeholder="검사관 이름"
                className="input-base text-[13px] sm:col-span-2"
                disabled={!canSign}
              />
              <button
                onClick={handleComplete}
                disabled={!canSign || !inspectorName.trim()}
                className="btn-primary"
                style={{ background: 'var(--moss)' }}
              >
                <PenTool size={13} /> 서명 완료
              </button>
            </div>
            {!canSign && (
              <div
                className="mt-2 text-[11.5px]"
                style={{ color: 'var(--ink-mute)' }}
              >
                검사 완료 서명은 <strong>검사관(Level 2)</strong> 이상 권한이
                필요합니다. 우상단에서 권한 전환 후 진행하세요.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 부적합 결과 + NCR 연결 */}
      {isCompleted && stage.linkedNcrIds?.length > 0 && (
        <div
          className="mt-4 rounded-lg p-3"
          style={{
            background: 'var(--rust-soft)',
            border: '1px solid var(--rust)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={13} style={{ color: 'var(--rust)' }} />
            <span
              className="font-mono text-[10.5px] tracking-[0.16em] uppercase"
              style={{ color: 'var(--rust)', fontWeight: 600 }}
            >
              부적합 NCR 자동 발의 ({stage.linkedNcrIds.length}건)
            </span>
          </div>
          <div className="text-[12px]" style={{ color: 'var(--rust)' }}>
            {stage.linkedNcrIds.join(', ')} —{' '}
            <button
              onClick={() => window.open('/quality', '_self')}
              className="underline"
            >
              품질 통제로 이동
            </button>
          </div>
        </div>
      )}

      {/* 규제 매핑 */}
      <ComplianceFooter stageType={stageType} />
    </div>
  )
}

/* ================================================================
   SampleMeasurementMatrix — 단위 × 검사 항목 매트릭스
   ================================================================ */
function SampleMeasurementMatrix({
  items,
  templates,
  onChangeMeasurement,
  readOnly,
}) {
  return (
    <div className="mt-4">
      <div
        className="font-mono text-[10px] tracking-[0.16em] uppercase mb-2"
        style={{ color: 'var(--ink-mute)' }}
      >
        SAMPLE MEASUREMENTS · {items.length}개 단위 × {templates.length}개
        검사 항목
      </div>
      <div className="overflow-x-auto">
        <table
          className="w-full text-[12px] border-collapse"
          style={{ minWidth: 600 }}
        >
          <thead>
            <tr style={{ background: 'var(--bg-soft)' }}>
              <th
                className="text-left px-2 py-1.5"
                style={{
                  borderBottom: '1px solid var(--line)',
                  fontWeight: 500,
                  color: 'var(--ink-mute)',
                }}
              >
                단위
              </th>
              {templates.map((t) => (
                <th
                  key={t.id}
                  className="text-left px-2 py-1.5"
                  style={{
                    borderBottom: '1px solid var(--line)',
                    fontWeight: 500,
                    color: 'var(--ink-mute)',
                  }}
                >
                  {t.label}
                  {t.unit && (
                    <span
                      className="font-mono text-[10px] ml-1"
                      style={{ color: 'var(--ink-faint)' }}
                    >
                      ({t.unit})
                    </span>
                  )}
                  <div
                    className="font-mono text-[9.5px]"
                    style={{ color: 'var(--ink-faint)' }}
                  >
                    {t.specMin}~{t.specMax}
                  </div>
                </th>
              ))}
              <th
                className="text-center px-2 py-1.5"
                style={{
                  borderBottom: '1px solid var(--line)',
                  fontWeight: 500,
                  color: 'var(--ink-mute)',
                }}
              >
                결과
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}>
                <td
                  className="px-2 py-1.5 font-mono"
                  style={{
                    borderBottom: '1px solid var(--line)',
                    color: 'var(--ink-mute)',
                    width: 60,
                  }}
                >
                  #{item.unitNo}
                </td>
                {templates.map((t) => {
                  const m = item.measurements?.find(
                    (mm) => mm.templateId === t.id
                  )
                  return (
                    <td
                      key={t.id}
                      className="px-2 py-1.5"
                      style={{ borderBottom: '1px solid var(--line)' }}
                    >
                      <input
                        type="number"
                        step="any"
                        value={m?.value || ''}
                        onChange={(e) =>
                          onChangeMeasurement(idx, t.id, e.target.value)
                        }
                        disabled={readOnly}
                        className="w-full px-1.5 py-1 rounded text-[12px]"
                        style={{
                          background:
                            m?.pass === 'fail'
                              ? 'var(--rust-soft)'
                              : m?.pass === 'pass'
                              ? 'var(--leaf-soft)'
                              : 'var(--bg-card)',
                          color:
                            m?.pass === 'fail'
                              ? 'var(--rust)'
                              : m?.pass === 'pass'
                              ? 'var(--moss)'
                              : 'var(--ink)',
                          border: '1px solid var(--line)',
                          fontWeight: m?.pass ? 500 : 400,
                        }}
                      />
                    </td>
                  )
                })}
                <td
                  className="px-2 py-1.5 text-center"
                  style={{ borderBottom: '1px solid var(--line)' }}
                >
                  {item.pass === true ? (
                    <CheckCircle2
                      size={15}
                      style={{ color: 'var(--moss)', display: 'inline' }}
                    />
                  ) : item.pass === false ? (
                    <XCircle
                      size={15}
                      style={{ color: 'var(--rust)', display: 'inline' }}
                    />
                  ) : (
                    <span
                      className="text-[10.5px]"
                      style={{ color: 'var(--ink-faint)' }}
                    >
                      —
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ================================================================
   부속
   ================================================================ */
function Meta({ label, value, mono }) {
  return (
    <div>
      <div
        className="font-mono text-[10px] tracking-[0.16em] uppercase"
        style={{ color: 'var(--ink-faint)' }}
      >
        {label}
      </div>
      <div
        className={`mt-0.5 text-[12.5px] ${mono ? 'font-mono text-[11.5px]' : ''}`}
        style={{ color: 'var(--ink)' }}
      >
        {value}
      </div>
    </div>
  )
}

function ComplianceFooter({ stageType }) {
  const map = {
    IQC: ['ISO 13485 §7.4.3', '21 CFR 820.80(b)', 'ISO 2859-1', 'Part 11 §11.50'],
    FAI: ['ISO 13485 §8.2.4', '21 CFR 820.80(c)', 'AS9102', 'Part 11 §11.50'],
    IPI: ['ISO 13485 §8.2.4', '21 CFR 820.80(c)', 'ISO 2859-1', 'Part 11 §11.50'],
    LAI: ['ISO 13485 §8.2.6', '21 CFR 820.80(d)', 'Part 11 §11.50/§11.70'],
  }
  const regs = map[stageType] || []
  return (
    <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
      <div
        className="font-mono text-[10px] tracking-[0.16em] uppercase mb-1.5"
        style={{ color: 'var(--ink-faint)' }}
      >
        REGULATORY MAPPING
      </div>
      <div className="flex flex-wrap gap-1">
        {regs.map((r, i) => (
          <span
            key={i}
            className="font-mono text-[10px] px-1.5 py-0.5 rounded"
            style={{ background: 'var(--leaf-soft)', color: 'var(--moss)' }}
          >
            {r}
          </span>
        ))}
      </div>
    </div>
  )
}
