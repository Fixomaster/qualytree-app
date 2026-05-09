// 온보딩 진행 상태 관리 (localStorage)
const KEY = 'qualytree.onboarding'

const DEFAULT = {
  step: 1, // 현재 단계 (1~5)
  completedSteps: [],
  // Step 1 — 회사
  company: {
    name: '',
    bizNumber: '',
    address: '',
    site: '',
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
  processes: [], // [{ id, blockId, order, customName? }]
  // Step 4 — 다중 규제
  regulations: ['iso-13485'], // 항상 포함
  targetMarkets: [], // ['korea', 'us', 'eu', ...]
  // Step 5 — 역할
  roles: [], // [{ roleId, personName, email, ... }]
  finishedAt: null,
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

  reset() {
    localStorage.removeItem(KEY)
  },

  isComplete() {
    const s = this.load()
    return s.completedSteps.length === 5
  },
}
