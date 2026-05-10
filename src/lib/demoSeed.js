/**
 * Demo Seed — 풍성한 데모 상태 자동 구축
 *
 * 한 번 호출하면 회사·제품·공정·검사 항목·작업 지시·NCR/CAPA/격리까지
 * 시연에 필요한 모든 노드가 자동 생성된다.
 * 모든 변이가 Phase A의 commitChange를 거치므로 CCR 이력도 함께 누적되며,
 * Quality Tree에도 즉시 풍성하게 노출된다.
 *
 * 사용 예:
 *   import { runDemoSeed } from './demoSeed'
 *   const summary = runDemoSeed({ withFailures: true })
 *
 * 옵션:
 *   - withFailures: true 시 한 작업 지시에 부적합·NCR·CAPA·격리까지 생성
 *   - withCcrHistory: true 시 의도적으로 검사 항목 1건을 수정하여 CCR 이력 1건 추가
 */

import { auth } from './auth'
import { permissions, LEVELS } from './permissions'
import { onboarding } from './onboardingState'
import { operations, PROCESS_STATUS } from './operationsState'
import { inspectionTemplates } from './inspectionTemplates'
import { ncr, NCR_SEVERITY, NCR_STATUS } from './ncrState'
import { capa, evaluateForCAPA } from './capaState'
import { quarantine, QUARANTINE_STATUS } from './quarantine'
import { ENTITY_TYPES, eid } from './entityRegistry'

const KEYS_TO_RESET = [
  'qualytree.operations',
  'qualytree.inspectionTemplates',
  'qualytree.changeRecords',
  'qualytree.linkage',
  'qualytree.ncrs',
  'qualytree.capas',
  'qualytree.quarantineItems',
  'qualytree.ncrCounter',
  'qualytree.capaCounter',
  'qualytree.quarantineCounter',
  'qualytree.ccrCounter',
  'qualytree.customBlocks',
  'qualytree.customCategories',
  'qualytree.onboarding',
]

/**
 * 모든 데모 데이터 초기화
 */
export function clearAllData() {
  KEYS_TO_RESET.forEach((k) => localStorage.removeItem(k))
}

/**
 * 데모 시드 실행 — 메인 진입점
 *
 * @param {Object} options
 * @param {boolean} [options.reset=true] - 기존 데이터 초기화
 * @param {boolean} [options.withFailures=true] - 부적합·NCR·CAPA·격리 생성
 * @param {boolean} [options.withCcrHistory=true] - CCR 이력 추가
 * @returns {Object} 생성 요약 통계
 */
export function runDemoSeed(options = {}) {
  const {
    reset = true,
    withFailures = true,
    withCcrHistory = true,
  } = options

  if (reset) clearAllData()

  // 데모 시드는 매니저 권한으로 실행되어야 함 (CCR 발의 + 모든 정의 권한)
  // 현재 사용자 Level을 매니저로 일시 상승 (시연 종료 후 자동 복구하지 않음 — 사용자가 직접 전환)
  const prevLevel = permissions.currentLevel()
  permissions.setLevel(LEVELS.MANAGER)

  const summary = {
    company: null,
    product: null,
    processes: 0,
    templates: 0,
    workOrders: 0,
    ncrs: 0,
    capas: 0,
    quarantineItems: 0,
    ccrs: 0,
  }

  try {
    // ==========================================================
    // 1. 온보딩 데이터 (회사·제품·공정·역할)
    // ==========================================================
    const onbData = buildOnboardingState()
    onboarding.save(onbData)
    summary.company = onbData.company.name
    summary.product = onbData.product.name
    summary.processes = onbData.processes.length

    // ==========================================================
    // 2. 검사 항목 템플릿 (각 공정 블록당 2~3개)
    //    inspectionTemplates.add()는 commitChange를 거쳐 CCR도 자동 발의
    // ==========================================================
    const tplCount = seedInspectionTemplates()
    summary.templates = tplCount

    // ==========================================================
    // 3. CCR 이력 — 검사 항목 1건 의도적 수정으로 변경 이력 추가
    // ==========================================================
    if (withCcrHistory) {
      seedCcrHistory()
    }

    // ==========================================================
    // 4. 작업 지시 3건 발급 + 일부 진행 처리
    // ==========================================================
    const woResults = seedWorkOrders(onbData)
    summary.workOrders = woResults.created.length

    // ==========================================================
    // 5. 부적합 → NCR → CAPA → 격리 흐름
    // ==========================================================
    if (withFailures) {
      const failureResults = seedFailureFlow(woResults)
      summary.ncrs = failureResults.ncrs
      summary.capas = failureResults.capas
      summary.quarantineItems = failureResults.quarantine
    }

    // 최종 CCR 카운트
    summary.ccrs = JSON.parse(
      localStorage.getItem('qualytree.changeRecords') || '[]'
    ).length
  } catch (err) {
    // 실패해도 prevLevel 복구는 안 함 — 매니저 상태로 둬서 사용자가 추가 작업 가능
    console.error('Demo seed error:', err)
    throw err
  }

  return summary
}

/* ================================================================
   1. 온보딩 데이터 구축
   ================================================================ */
function buildOnboardingState() {
  return {
    step: 5,
    completedSteps: [1, 2, 3, 4, 5],
    company: {
      name: '메디플렉스 정형외과',
      bizNumber: '123-45-67890',
      address: '서울특별시 강남구',
      site: 'https://example.kr',
      employeeCount: '11~30',
      existingCerts: ['iso-13485', 'kgmp'],
    },
    product: {
      name: 'ULNA Hook Plate',
      modelNumber: 'MRUHP-8H',
      intendedUse: '척골 골절 고정용 임플란트 (Class IIb)',
      contact: 'implantable',
      electricity: 'none',
      software: 'none',
      classification: 'IIb',
    },
    processes: [
      { id: 'p1', blockId: 'cnc-milling', order: 1 },
      { id: 'p2', blockId: 'ultrasonic-clean', order: 2 },
      { id: 'p3', blockId: 'manual-assembly', order: 3 },
      { id: 'p4', blockId: 'cmm-inspection', order: 4 },
      { id: 'p5', blockId: 'primary-packaging', order: 5 },
    ],
    regulations: ['iso-13485', 'kgmp', 'fda-qmsr'],
    targetMarkets: ['korea', 'us'],
    roles: [
      {
        roleId: 'r1',
        roleName: '생산 작업자',
        personName: '김작업',
        email: 'op1@medi.kr',
        level: LEVELS.OPERATOR,
      },
      {
        roleId: 'r2',
        roleName: 'QA 검사관',
        personName: '이검사',
        email: 'qa1@medi.kr',
        level: LEVELS.INSPECTOR,
      },
      {
        roleId: 'r3',
        roleName: '품질경영대리인',
        personName: '박매니저',
        email: 'mgr@medi.kr',
        level: LEVELS.MANAGER,
      },
      {
        roleId: 'r4',
        roleName: 'RA 책임자',
        personName: '최RA',
        email: 'ra@medi.kr',
        level: LEVELS.MANAGER,
      },
    ],
    finishedAt: new Date().toISOString(),
  }
}

/* ================================================================
   2. 검사 항목 템플릿 시드
   ================================================================ */
function seedInspectionTemplates() {
  const templatesByBlock = {
    'cnc-milling': [
      {
        label: '두께',
        unit: 'mm',
        specMin: 2.95,
        specMax: 3.05,
        specNominal: 3.0,
        criticality: 'Critical',
        method: 'CMM',
        sourceInspection: '치수 검사 (CMM)',
      },
      {
        label: '폭',
        unit: 'mm',
        specMin: 11.9,
        specMax: 12.1,
        specNominal: 12.0,
        criticality: 'Major',
        method: 'CMM',
        sourceInspection: '치수 검사 (CMM)',
      },
      {
        label: '표면 거칠기 Ra',
        unit: 'μm',
        specMin: 0,
        specMax: 1.6,
        specNominal: 0.8,
        criticality: 'Major',
        method: '조도계',
        sourceInspection: '표면 거칠기',
      },
    ],
    'ultrasonic-clean': [
      {
        label: '잔류 입자 (TOC)',
        unit: 'ppm',
        specMin: 0,
        specMax: 5,
        specNominal: 1,
        criticality: 'Critical',
        method: 'TOC 분석기',
      },
      {
        label: 'pH',
        unit: '',
        specMin: 6.5,
        specMax: 7.5,
        specNominal: 7.0,
        criticality: 'Minor',
        method: 'pH 미터',
      },
    ],
    'manual-assembly': [
      {
        label: '체결 토크',
        unit: 'Nm',
        specMin: 4.5,
        specMax: 5.5,
        specNominal: 5.0,
        criticality: 'Critical',
        method: '토크렌치',
      },
      {
        label: '조립 정렬도',
        unit: 'mm',
        specMin: 0,
        specMax: 0.1,
        specNominal: 0,
        criticality: 'Major',
        method: '버니어',
      },
    ],
    'cmm-inspection': [
      {
        label: '전장',
        unit: 'mm',
        specMin: 99.5,
        specMax: 100.5,
        specNominal: 100,
        criticality: 'Major',
        method: 'CMM',
      },
      {
        label: '구멍 직경',
        unit: 'mm',
        specMin: 4.95,
        specMax: 5.05,
        specNominal: 5.0,
        criticality: 'Major',
        method: 'CMM',
      },
    ],
    'primary-packaging': [
      {
        label: '실링 강도',
        unit: 'N/15mm',
        specMin: 1.5,
        specMax: 99,
        specNominal: 3.0,
        criticality: 'Major',
        method: '실링 테스터',
      },
      {
        label: '패키지 무결성',
        unit: '',
        specMin: 1,
        specMax: 1,
        specNominal: 1,
        criticality: 'Minor',
        method: '시각 검사',
      },
    ],
  }

  let count = 0
  Object.entries(templatesByBlock).forEach(([blockId, list]) => {
    list.forEach((tpl) => {
      inspectionTemplates.add(blockId, tpl, {
        reason: `${tpl.label} 검사 항목 신규 정의`,
      })
      count++
    })
  })
  return count
}

/* ================================================================
   3. CCR 이력 — 의도적 수정 1건
   ================================================================ */
function seedCcrHistory() {
  // CNC 밀링의 첫 항목(두께)의 규격을 한 번 수정하여 CCR 이력 만들기
  const list = inspectionTemplates.forBlock('cnc-milling')
  if (list.length === 0) return
  const target = list[0]
  inspectionTemplates.update(
    'cnc-milling',
    target.id,
    { specMax: 3.06 }, // 3.05 → 3.06 (공급자 변경에 따른 미세 조정)
    {
      reason: '공급자 변경에 따른 규격 미세 조정 (NCR-2025-014 후속)',
    }
  )
}

/* ================================================================
   4. 작업 지시 3건 시드
   ================================================================ */
function seedWorkOrders(onbData) {
  const wos = []

  // WO-1: 진행 중 (3/5 단계 완료)
  const wo1 = operations.createWorkOrder({
    productName: onbData.product.name,
    productModel: onbData.product.modelNumber,
    lotNumber: 'L260510-001',
    quantity: 50,
    onboardingProcesses: onbData.processes,
  })
  wos.push(wo1)

  // 1단계: 시작 + 측정값 모두 합격 + 완료
  const w1stages = wo1.stages
  if (w1stages.length >= 1) {
    operations.startStage(wo1.id, w1stages[0].stageId, '김작업')
    completeStageAllPass(wo1.id, w1stages[0].stageId, '김작업')
  }
  // 2단계도 같은 방식
  if (w1stages.length >= 2) {
    operations.startStage(wo1.id, w1stages[1].stageId, '김작업')
    completeStageAllPass(wo1.id, w1stages[1].stageId, '김작업')
  }
  // 3단계: 시작만 (진행 중)
  if (w1stages.length >= 3) {
    operations.startStage(wo1.id, w1stages[2].stageId, '김작업')
  }

  // WO-2: 부적합 발생 (시연 핵심)
  // operations.createWorkOrder는 createdAt을 약간 차이 두기 위해 sleep 효과
  const wo2 = operations.createWorkOrder({
    productName: onbData.product.name,
    productModel: onbData.product.modelNumber,
    lotNumber: 'L260510-002',
    quantity: 30,
    onboardingProcesses: onbData.processes,
  })
  wos.push(wo2)

  // 1단계만 완료 (모두 합격)
  if (wo2.stages.length >= 1) {
    operations.startStage(wo2.id, wo2.stages[0].stageId, '김작업')
    completeStageAllPass(wo2.id, wo2.stages[0].stageId, '김작업')
  }
  // 2단계 시작 — 여기서 NCR 발의 (failure flow에서 처리)

  // WO-3: 발급 대기 (변경 없음, 첫 단계 PENDING)
  const wo3 = operations.createWorkOrder({
    productName: onbData.product.name,
    productModel: onbData.product.modelNumber,
    lotNumber: 'L260510-003',
    quantity: 40,
    onboardingProcesses: onbData.processes,
  })
  wos.push(wo3)

  return { created: wos, wo1, wo2, wo3 }
}

/**
 * 단계의 모든 측정값을 합격으로 채워 완료 (NCR 발의 X)
 */
function completeStageAllPass(woId, stageId, operatorName) {
  const wo = operations.getWorkOrder(woId)
  if (!wo) return
  const stage = wo.stages.find((s) => s.stageId === stageId)
  if (!stage) return

  const measurements = (stage.inspectionTemplates || []).map((t) => {
    // 공칭값으로 측정 (합격)
    const value =
      t.specNominal !== '' && t.specNominal != null
        ? String(t.specNominal)
        : t.specMin !== '' && t.specMin != null && t.specMax !== '' && t.specMax != null
        ? String((parseFloat(t.specMin) + parseFloat(t.specMax)) / 2)
        : '1'
    return { templateId: t.id, value, pass: 'pass', note: '' }
  })

  operations.completeStage(woId, stageId, {
    measurements,
    notes: '정상 가공 완료',
    signedBy: operatorName,
  })
}

/* ================================================================
   5. 부적합 → NCR → CAPA → 격리 흐름
   ================================================================ */
function seedFailureFlow({ wo2 }) {
  if (!wo2) return { ncrs: 0, capas: 0, quarantine: 0 }

  // WO-2의 2단계(세척)에서 잔류 입자(TOC) 부적합 시뮬레이션
  const stage2 = wo2.stages[1]
  if (!stage2) return { ncrs: 0, capas: 0, quarantine: 0 }

  operations.startStage(wo2.id, stage2.stageId, '김작업')

  // 측정값 채우기 — 그 중 잔류 입자만 부적합
  const stageNow = operations
    .getWorkOrder(wo2.id)
    .stages.find((s) => s.stageId === stage2.stageId)

  const tocTpl = (stageNow.inspectionTemplates || []).find(
    (t) => t.label === '잔류 입자 (TOC)'
  )

  const measurements = (stageNow.inspectionTemplates || []).map((t) => {
    if (tocTpl && t.id === tocTpl.id) {
      // 부적합 — 규격 0~5 ppm인데 12 ppm 측정 (1.5배 초과)
      return { templateId: t.id, value: '12', pass: 'fail', note: '한도 초과' }
    }
    const value =
      t.specNominal !== '' && t.specNominal != null
        ? String(t.specNominal)
        : '1'
    return { templateId: t.id, value, pass: 'pass', note: '' }
  })

  operations.completeStage(wo2.id, stage2.stageId, {
    measurements,
    notes: '잔류 입자 한도 초과 발견 — 즉시 NCR 발의',
    signedBy: '김작업',
  })

  // EBatchRecord 화면의 handleComplete와 동일한 흐름 재현
  const ncrCount = { ncrs: 0, capas: 0, quarantine: 0 }
  if (tocTpl) {
    const stageEid = eid(
      ENTITY_TYPES.STAGE,
      `${wo2.id}:${stage2.stageId}`
    )
    const severity =
      tocTpl.criticality === 'Critical'
        ? NCR_SEVERITY.CRITICAL
        : tocTpl.criticality === 'Major'
        ? NCR_SEVERITY.MAJOR
        : NCR_SEVERITY.MINOR

    const ncrRecord = ncr.raise({
      severity,
      source: {
        type: 'oos',
        stageEid,
        woId: wo2.id,
        templateId: tocTpl.id,
        measurementValue: '12',
      },
      title: `OOS — ${tocTpl.label}`,
      description: `세척 단계에서 "${tocTpl.label}" 측정값 12 ${tocTpl.unit} 부적합 (규격: ${tocTpl.specMin}~${tocTpl.specMax} ${tocTpl.unit}). 즉시 격리 + 근본원인 분석 필요.`,
    })
    ncrCount.ncrs++

    // CAPA 자동 평가
    const capaTrigger = evaluateForCAPA(ncrRecord)
    if (capaTrigger) {
      capa.raise({
        title: capaTrigger.suggestedTitle,
        description: capaTrigger.reason,
        trigger: capaTrigger.trigger,
        triggerReason: capaTrigger.reason,
        sourceNcrIds: [ncrRecord.id],
      })
      ncrCount.capas++
    }

    // 격리 큐 자동 등록 (위험 구간 모든 WO를 격리)
    const isolated = quarantine.isolateFromNcr(ncrRecord)
    ncrCount.quarantine = isolated.length

    // NCR 상태를 contained(격리 완료)로
    ncr.updateStatus(ncrRecord.id, NCR_STATUS.CONTAINED, {
      reason: '위험 구간 격리 큐 자동 등록',
      containment: {
        quarantineCount: isolated.length,
      },
    })
  }

  return ncrCount
}
