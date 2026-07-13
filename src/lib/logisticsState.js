// 수입 후 유지관리(QMS/GMP) 기록 — 수입검사·입고·출고·유통기록 / 이상사례 보고
// KGMP 수입 의료기기 유지관리 시 필요한 기록: 수입검사 기록, 입고 기록, 출고 기록,
// 유통 기록, 이상사례 보고 기록
//
// equipmentState.js / supplierState.js와 동일한 localStorage 기반 패턴을 따른다.

const STORE_KEY = 'qualytree.logistics'

function defaultState() {
  return {
    logs: [],
    adverseEvents: [],
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return defaultState()
    const def = defaultState()
    const saved = JSON.parse(raw)
    return { ...def, ...saved }
  } catch {
    return defaultState()
  }
}

function save(next) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(next))
  } catch (e) {
    console.error('logisticsState save failed', e)
  }
  return next
}

const uid = () => Math.random().toString(36).slice(2, 10)

export const LOG_TYPE = {
  IMPORT_INSPECTION: '수입검사',
  RECEIVING: '입고',
  SHIPPING: '출고',
  DISTRIBUTION: '유통',
}

export const AE_STATUS = {
  OPEN: '조사중',
  REPORTED: '보고완료',
  CLOSED: '종결',
}

export const logs = {
  add(item) {
    const s = load()
    const rec = {
      id: uid(),
      type: LOG_TYPE.IMPORT_INSPECTION,
      date: '',
      productName: '',
      lotNo: '',
      qty: '',
      partner: '',
      result: '',
      notes: '',
      createdAt: new Date().toISOString(),
      ...item,
    }
    s.logs = [...s.logs, rec]
    save(s)
    return rec
  },
  update(id, patch) {
    const s = load()
    s.logs = s.logs.map((l) => (l.id === id ? { ...l, ...patch } : l))
    save(s)
    return s
  },
  delete(id) {
    const s = load()
    s.logs = s.logs.filter((l) => l.id !== id)
    save(s)
    return s
  },
  getAll(type) {
    const s = load()
    return type ? s.logs.filter((l) => l.type === type) : s.logs
  },
}

export const adverseEvents = {
  add(item) {
    const s = load()
    const rec = {
      id: uid(),
      date: '',
      productName: '',
      lotNo: '',
      description: '',
      severity: '',
      reporter: '',
      status: AE_STATUS.OPEN,
      actionTaken: '',
      reportedTo: '',
      reportedDate: '',
      createdAt: new Date().toISOString(),
      ...item,
    }
    s.adverseEvents = [...s.adverseEvents, rec]
    save(s)
    return rec
  },
  update(id, patch) {
    const s = load()
    s.adverseEvents = s.adverseEvents.map((a) => (a.id === id ? { ...a, ...patch } : a))
    save(s)
    return s
  },
  delete(id) {
    const s = load()
    s.adverseEvents = s.adverseEvents.filter((a) => a.id !== id)
    save(s)
    return s
  },
  getAll() {
    return load().adverseEvents
  },
}
