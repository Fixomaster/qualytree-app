// 작업 지시(Work Order) 및 eBR 상태 관리
// localStorage 기반, 어제 온보딩에서 정의한 공정을 그대로 가져와 작업 지시로 발행
import { inspectionTemplates } from './inspectionTemplates'

const KEY = 'qualytree.operations'

const DEFAULT = {
  workOrders: [], // 작업 지시 배열
  nextWoSeq: 1,
}

export const PROCESS_STATUS = {
  LOCKED: 'locked', // 이전 공정 미완료 → 진입 불가
  PENDING: 'pending', // 진입 가능, 미시작
  IN_PROGRESS: 'in_progress', // 진행 중 (측정값 입력 단계)
  COMPLETED: 'completed', // 완료 + 전자서명 → 다음 공정 잠금 해제
}

export const WO_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ON_HOLD: 'on_hold',
}

export const operations = {
  load() {
    try {
      const raw = localStorage.getItem(KEY)
      if (!raw) return { ...DEFAULT }
      return { ...DEFAULT, ...JSON.parse(raw) }
    } catch {
      return { ...DEFAULT }
    }
  },

  save(state) {
    localStorage.setItem(KEY, JSON.stringify(state))
    return state
  },

  reset() {
    localStorage.removeItem(KEY)
  },

  /**
   * 새 작업 지시 발행 — 어제 ONB-003에서 정의한 공정 순서를
   * 그대로 단계 체인으로 변환합니다.
   *
   * @param {object} args
   * @param {string} args.productName
   * @param {string} args.productModel
   * @param {string} args.lotNumber
   * @param {number} args.quantity
   * @param {string} args.dueDate
   * @param {'normal'|'urgent'} args.priority
   * @param {Array} args.onboardingProcesses - state.processes (from onboarding)
   */
  createWorkOrder({
    productName,
    productModel,
    lotNumber,
    quantity,
    dueDate,
    priority = 'normal',
    onboardingProcesses = [],
  }) {
    const state = this.load()
    const seq = String(state.nextWoSeq).padStart(4, '0')
    const year = new Date().getFullYear()
    const woId = `WO-${year}-${seq}`

    const stages = [...onboardingProcesses]
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((p, idx) => {
        // 시간 잠금 — 발급 시점의 검사 항목 템플릿을 스냅샷으로 복제
        const templateSnapshot = inspectionTemplates.snapshotForBlock(p.blockId)
        return {
          stageId: `${woId}-S${String(idx + 1).padStart(2, '0')}`,
          order: idx + 1,
          blockId: p.blockId,
          customName: p.customName || null,
          // 첫 단계만 PENDING, 나머지는 LOCKED (공정 순차 잠금)
          status: idx === 0 ? PROCESS_STATUS.PENDING : PROCESS_STATUS.LOCKED,
          startedAt: null,
          completedAt: null,
          operatorName: null,
          operatorSignature: null, // 전자서명 (이름·시각 패키지)
          // 검사 항목 템플릿 스냅샷 (매니저가 정의한 것을 발급 시점에 고정)
          inspectionTemplates: templateSnapshot,
          // 측정값 입력 — 템플릿마다 한 줄, 작업자가 채움
          // [{ templateId, value, pass: 'pass'|'fail'|null, note }]
          measurements: templateSnapshot.map((t) => ({
            templateId: t.id,
            value: '',
            pass: null,
            note: '',
          })),
          // 매니저가 작업 지시별로 임시 추가한 항목
          // [{ id, label, unit, value, pass, addedBy, addedAt }]
          adHocItems: [],
          notes: '',
        }
      })

    const wo = {
      id: woId,
      productName,
      productModel,
      lotNumber,
      quantity,
      dueDate,
      priority,
      status: WO_STATUS.PENDING,
      stages,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
    }

    state.workOrders.unshift(wo) // 최신순
    state.nextWoSeq += 1
    this.save(state)
    return wo
  },

  getWorkOrder(woId) {
    const state = this.load()
    return state.workOrders.find((w) => w.id === woId) || null
  },

  updateWorkOrder(woId, updater) {
    const state = this.load()
    const idx = state.workOrders.findIndex((w) => w.id === woId)
    if (idx === -1) return null
    const updated = updater({ ...state.workOrders[idx] })
    state.workOrders[idx] = updated
    this.save(state)
    return updated
  },

  /**
   * 특정 단계 시작 — PENDING → IN_PROGRESS
   */
  startStage(woId, stageId, operatorName) {
    return this.updateWorkOrder(woId, (wo) => {
      const stage = wo.stages.find((s) => s.stageId === stageId)
      if (!stage || stage.status !== PROCESS_STATUS.PENDING) return wo

      stage.status = PROCESS_STATUS.IN_PROGRESS
      stage.startedAt = new Date().toISOString()
      stage.operatorName = operatorName

      if (wo.status === WO_STATUS.PENDING) {
        wo.status = WO_STATUS.IN_PROGRESS
        wo.startedAt = new Date().toISOString()
      }
      return wo
    })
  },

  /**
   * 단계 완료 + 전자서명 → 다음 단계 잠금 해제 (Stage Gate)
   */
  completeStage(woId, stageId, payload) {
    const { measurements, adHocItems, notes, signedBy } = payload
    return this.updateWorkOrder(woId, (wo) => {
      const stageIdx = wo.stages.findIndex((s) => s.stageId === stageId)
      if (stageIdx === -1) return wo
      const stage = wo.stages[stageIdx]

      stage.measurements = measurements || stage.measurements || []
      stage.adHocItems = adHocItems || stage.adHocItems || []
      stage.notes = notes || ''
      stage.status = PROCESS_STATUS.COMPLETED
      stage.completedAt = new Date().toISOString()
      stage.operatorSignature = {
        name: signedBy,
        signedAt: new Date().toISOString(),
      }

      // 다음 단계 잠금 해제 (공정 순차 잠금)
      const next = wo.stages[stageIdx + 1]
      if (next && next.status === PROCESS_STATUS.LOCKED) {
        next.status = PROCESS_STATUS.PENDING
      }

      // 모든 단계 완료 → WO 완료
      const allDone = wo.stages.every(
        (s) => s.status === PROCESS_STATUS.COMPLETED
      )
      if (allDone) {
        wo.status = WO_STATUS.COMPLETED
        wo.completedAt = new Date().toISOString()
      }

      return wo
    })
  },

  /**
   * 진행 중 측정값 저장 (단계 완료 전에도 부분 저장 가능)
   * 매니저가 진행 중에 검사 항목 템플릿을 추가/수정/삭제할 때도 호출됨
   */
  saveStageProgress(woId, stageId, payload) {
    return this.updateWorkOrder(woId, (wo) => {
      const stage = wo.stages.find((s) => s.stageId === stageId)
      if (!stage) return wo
      if (payload.inspectionTemplates != null)
        stage.inspectionTemplates = payload.inspectionTemplates
      if (payload.measurements != null) stage.measurements = payload.measurements
      if (payload.adHocItems != null) stage.adHocItems = payload.adHocItems
      if (payload.notes != null) stage.notes = payload.notes
      return wo
    })
  },

  /**
   * 데모 작업 지시 자동 생성 — 시연용
   */
  seedDemo(onboardingState) {
    const existing = this.load()
    if (existing.workOrders.length > 0) return existing.workOrders[0]

    const productName = onboardingState.product?.name || '의료기기 제품'
    const productModel = onboardingState.product?.modelNumber || 'MODEL-001'
    const today = new Date()
    const due = new Date(today)
    due.setDate(due.getDate() + 5)
    const dueDate = due.toISOString().slice(0, 10)
    const lotPrefix = today
      .toISOString()
      .slice(2, 10)
      .replace(/-/g, '')

    return this.createWorkOrder({
      productName,
      productModel,
      lotNumber: `L${lotPrefix}-001`,
      quantity: 50,
      dueDate,
      priority: 'normal',
      onboardingProcesses: onboardingState.processes || [],
    })
  },
}
