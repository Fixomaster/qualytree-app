// 온보딩 진행 상태 관리 (localStorage)
const KEY = 'qualytree.onboarding'

const DEFAULT = {
  step: 1, // 현재 단계 (1~5)
  completedSteps: [],
  // Step 1 — 회사
  company: {
    name: '',
    bizNumber: '',
    ceo: '', // 대표자(대표이사) — Documents.jsx 등 문서 생성 시 자동 반영
    address: '',
    site: '', // 제조소 주소 (본사와 다른 경우)
    phone: '',
    email: '',
    qmRep: '', // 품질책임자 성명 — 회사·조직 > 품질책임자 지정 탭과 연동되어 자동 반영
    employeeCount: '',
    existingCerts: [], // ['iso-13485', 'kgmp', ...]
  },
  // Step 2 — 제품
  product: {
    name: '',
    modelNumber: '',
    intendedUse: '',
    contact: '', // body contact type
    electricity: '',
    software: '',
    classification: null, // computed
  },
  // Step 3 — 공정
  processes: [], // [{ id, blockId, order, customName? }] — 레거시(단일) 공정 목록, 하위 호환용
  productProcesses: {}, // { [productId]: [{ id, blockId, order, customName? }] } — 제품별 공정 목록
  // Step 4 — 다중 규제
  regulations: ['iso-13485'], // 항상 포함
  targetMarkets: [], // ['korea', 'us', 'eu', ...]
  // Step 5 — 역할
  roles: [], // [{ roleId, personName, email, ... }]
  finishedAt: null,
}

/**
 * 제품 키 계산 — 제품별 공정 목록을 구분하는 기준.
 * 제품에 id가 없으면(레거시 단일 제품) 'main'으로 취급합니다.
 */
export function productKeyOf(p) {
  return (p && p.id) || 'main'
}

/**
 * 특정 제품의 공정 목록을 가져옵니다.
 * productProcesses에 항목이 없으면 레거시 전역 processes를 기본값으로 사용합니다(하위 호환).
 */
export function getProductProcesses(ob, productKey) {
  const key = productKey || 'main'
  const map = (ob && ob.productProcesses) || {}
  if (Array.isArray(map[key])) return map[key]
  return (ob && ob.processes) || []
}

/**
 * 특정 제품의 공정 목록을 저장한 새 온보딩 상태를 반환합니다(원본은 변경하지 않음).
 */
export function setProductProcesses(ob, productKey, list) {
  const key = productKey || 'main'
  const map = { ...((ob && ob.productProcesses) || {}) }
  map[key] = list
  return { ...ob, productProcesses: map }
}

/**
 * 회사 전체에서 실제 사용 중인 공정 블록 ID 집합 (모든 제품의 공정 목록 + 레거시 목록 통합).
 */
export function getAllUsedBlockIds(ob) {
  const set = new Set()
  ;((ob && ob.processes) || []).forEach((p) => set.add(p.blockId))
  const map = (ob && ob.productProcesses) || {}
  Object.values(map).forEach((list) => {
    ;(Array.isArray(list) ? list : []).forEach((p) => set.add(p.blockId))
  })
  return set
}

/**
 * 회사 전체에 정의된 공정이 하나라도 있는지 (레거시 전역 목록 또는 제품별 목록 중 하나라도).
 */
export function hasAnyProcesses(ob) {
  if (((ob && ob.processes) || []).length > 0) return true
  const map = (ob && ob.productProcesses) || {}
  return Object.values(map).some((list) => Array.isArray(list) && list.length > 0)
}

export const onboarding = {
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

  /**
   * 회사 기본정보(company) 필드 일부만 갱신 — "기본정보" 화면에서 사용.
   * 여기서 저장된 값은 Documents.jsx·kgmpDocumentBundle.js·kgmpProgress.js 등
   * 이미 ob.company를 참조하는 모든 문서 생성 로직에 자동으로 반영된다.
   */
  updateCompany(patch) {
    const s = this.load()
    const next = { ...s, company: { ...s.company, ...patch } }
    return this.save(next)
  },

  reset() {
    localStorage.removeItem(KEY)
  },

  isComplete() {
    const s = this.load()
    return s.completedSteps.length === 5
  },

  /**
   * 지정한 절차서 이름들이 procedures 목록에 없으면(부분 문자열 매칭 실패 시) 자동 추가.
   * KGMP 허브 등에서 필수 절차서 항목이 항상 실제 편집 페이지로 연결되도록 보완할 때 사용.
   */
  ensureProcedures(names) {
    const s = this.load()
    const list = Array.isArray(s.procedures) ? s.procedures : []
    const uid = () => Math.random().toString(36).slice(2, 10)
    let changed = false
    const next = [...list]
    ;(names || []).forEach((name) => {
      const exists = next.some((p) => p.name === name)
      if (!exists) {
        next.push({ id: uid(), name, applicable: true, custom: true })
        changed = true
      }
    })
    if (changed) {
      const saved = this.save({ ...s, procedures: next })
      return saved
    }
    return s
  },
}
