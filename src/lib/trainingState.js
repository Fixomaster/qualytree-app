// 교육훈련 — ISO 13485 §6.2 (인적자원·역량·인식) / FDA QMSR §820.25
//
// - annualPlans(연간교육계획) — 연도별 교육 항목 계획, 승인 절차
// - materials(교육자료) — 파일 라이브러리
// - sessions(교육 실시) — 실시 결과 + 참석자별 평가(교육평가)·서명(참석기록)
//
// equipmentState.js와 동일한 localStorage 기반 패턴을 따른다.

const STORE_KEY = 'qualytree.training'

function defaultState() {
  return {
    annualPlans: [],
    materials: [],
    sessions: [],
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
    console.error('trainingState save failed', e)
  }
  return next
}

const uid = () => Math.random().toString(36).slice(2, 10)

export const PLAN_STATUS = {
  DRAFT: '초안',
  APPROVED: '승인완료',
}

export const plans = {
  load,
  save,
  defaultState,
  uid,

  add(year) {
    const s = load()
    if (s.annualPlans.some((p) => p.year === year)) throw new Error(`${year}년 계획이 이미 존재합니다.`)
    const rec = { id: uid(), year, items: [], status: PLAN_STATUS.DRAFT, approvedBy: '', approvedAt: '' }
    s.annualPlans = [...s.annualPlans, rec]
    save(s)
    return rec
  },
  addItem(planId, item) {
    const s = load()
    s.annualPlans = s.annualPlans.map((p) =>
      p.id === planId ? { ...p, items: [...p.items, { id: uid(), topic: '', targetRole: '', quarter: 'Q1', plannedDate: '', ...item }] } : p
    )
    save(s)
    return s
  },
  removeItem(planId, itemId) {
    const s = load()
    s.annualPlans = s.annualPlans.map((p) => (p.id === planId ? { ...p, items: p.items.filter((i) => i.id !== itemId) } : p))
    save(s)
    return s
  },
  approve(planId, approverName) {
    const s = load()
    s.annualPlans = s.annualPlans.map((p) =>
      p.id === planId ? { ...p, status: PLAN_STATUS.APPROVED, approvedBy: approverName, approvedAt: new Date().toISOString() } : p
    )
    save(s)
    return s
  },
  delete(planId) {
    const s = load()
    s.annualPlans = s.annualPlans.filter((p) => p.id !== planId)
    save(s)
    return s
  },
  getAll() {
    return load().annualPlans.slice().sort((a, b) => (b.year || 0) - (a.year || 0))
  },
}

export const materials = {
  add(item) {
    const s = load()
    const rec = { id: uid(), title: '', category: '', fileId: null, fileName: '', uploadedAt: new Date().toISOString(), ...item }
    s.materials = [...s.materials, rec]
    save(s)
    return rec
  },
  delete(id) {
    const s = load()
    s.materials = s.materials.filter((m) => m.id !== id)
    save(s)
    return s
  },
  getAll() {
    return load().materials
  },
}

export const sessions = {
  add(item) {
    const s = load()
    const rec = {
      id: uid(),
      topic: '',
      date: '',
      instructor: '',
      materialIds: [],
      evaluationMethod: '',
      status: '예정',
      attendees: [],
      ...item,
    }
    s.sessions = [...s.sessions, rec]
    save(s)
    return rec
  },
  update(id, patch) {
    const s = load()
    s.sessions = s.sessions.map((x) => (x.id === id ? { ...x, ...patch } : x))
    save(s)
    return s
  },
  delete(id) {
    const s = load()
    s.sessions = s.sessions.filter((x) => x.id !== id)
    save(s)
    return s
  },
  addAttendee(sessionId, attendee) {
    const s = load()
    s.sessions = s.sessions.map((x) =>
      x.id === sessionId ? { ...x, attendees: [...x.attendees, { id: uid(), name: '', dept: '', score: '', passed: true, signedAt: new Date().toISOString(), ...attendee }] } : x
    )
    save(s)
    return s
  },
  removeAttendee(sessionId, attendeeId) {
    const s = load()
    s.sessions = s.sessions.map((x) => (x.id === sessionId ? { ...x, attendees: x.attendees.filter((a) => a.id !== attendeeId) } : x))
    save(s)
    return s
  },
  getAll() {
    return load().sessions.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  },
  /** 교육 이수율 — 완료 세션의 참석자 중 합격 비율 */
  complianceRate() {
    const all = load().sessions.filter((x) => x.status === '완료')
    let total = 0
    let passed = 0
    all.forEach((x) => (x.attendees || []).forEach((a) => { total += 1; if (a.passed) passed += 1 }))
    return total === 0 ? null : Math.round((passed / total) * 100)
  },
}

export default { plans, materials, sessions, PLAN_STATUS }
