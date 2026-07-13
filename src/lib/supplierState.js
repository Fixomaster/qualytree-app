// 공급자관리 — ISO 13485 §7.4.1(평가·선정·재평가) / §7.4.1(d)(위험등급) / KGMP 제22조
//
// - suppliers(공급자대장) — 공급자 마스터 (위험등급·공급범위·승인상태)
// - evaluations(평가·재평가 기록) — 공급자당 N건, 신규평가/정기재평가/수시평가
//   최신 평가 결과에 따라 supplier.status·approvedDate·nextReevalDate가 자동 갱신됨
//
// equipmentState.js와 동일한 localStorage 기반 패턴을 따른다.

const STORE_KEY = 'qualytree.suppliers'

function defaultState() {
  return {
    suppliers: [],
    evaluations: [],
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
    console.error('supplierState save failed', e)
  }
  return next
}

const uid = () => Math.random().toString(36).slice(2, 10)

export const riskClass = {
  CRITICAL: 'Critical',
  MAJOR: 'Major',
  MINOR: 'Minor',
}

// 위험등급별 기본 재평가 주기(개월) — Critical 12개월(EU MDR Annex IX §2.2.4 현장심사 3년·서류재평가 매년)
export const DEFAULT_REEVAL_MONTHS = {
  [riskClass.CRITICAL]: 12,
  [riskClass.MAJOR]: 24,
  [riskClass.MINOR]: 36,
}

export const supplierStatus = {
  APPROVED: '승인',
  CONDITIONAL: '조건부승인',
  HOLD: '보류',
  SUSPENDED: '중단',
}

export const evalType = {
  INITIAL: '신규평가',
  REEVAL: '정기재평가',
  FOR_CAUSE: '수시평가',
}

export const evalResult = {
  PASS: '합격',
  CONDITIONAL: '조건부합격',
  FAIL: '불합격',
}

function addMonths(dateStr, months) {
  const d = dateStr ? new Date(dateStr) : new Date()
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

function statusFromResult(result) {
  if (result === evalResult.PASS) return supplierStatus.APPROVED
  if (result === evalResult.CONDITIONAL) return supplierStatus.CONDITIONAL
  return supplierStatus.HOLD
}

export const suppliers = {
  load,
  save,
  defaultState,
  uid,
  riskClass,
  DEFAULT_REEVAL_MONTHS,
  supplierStatus,
  evalType,
  evalResult,

  // ── 공급자대장 ──
  addSupplier(item) {
    const s = load()
    const rec = {
      id: uid(),
      name: '',
      bizNo: '',
      category: '',
      scope: '',
      contact: '',
      riskClass: riskClass.MAJOR,
      status: supplierStatus.HOLD,
      approvedDate: '',
      lastEvalDate: '',
      nextReevalDate: '',
      notes: '',
      ...item,
    }
    s.suppliers = [...s.suppliers, rec]
    save(s)
    return rec
  },
  updateSupplier(id, patch) {
    const s = load()
    s.suppliers = s.suppliers.map((sup) => (sup.id === id ? { ...sup, ...patch } : sup))
    save(s)
    return s
  },
  deleteSupplier(id) {
    const s = load()
    s.suppliers = s.suppliers.filter((sup) => sup.id !== id)
    s.evaluations = s.evaluations.filter((e) => e.supplierId !== id)
    save(s)
    return s
  },
  getSuppliers() {
    return load().suppliers
  },
  getSupplier(id) {
    return load().suppliers.find((s) => s.id === id) || null
  },
  /** 승인 공급자 목록(ASL) — 현재 승인/조건부승인 상태인 공급자만, 승인일 최신순 */
  approvedSuppliers() {
    const s = load()
    return s.suppliers
      .filter((sup) => sup.status === supplierStatus.APPROVED || sup.status === supplierStatus.CONDITIONAL)
      .sort((a, b) => (b.approvedDate || '').localeCompare(a.approvedDate || ''))
  },

  // ── 평가·재평가 기록 ──
  /** 평가 기록 추가 + 결과에 따라 공급자 상태/승인일/차기재평가일 자동 갱신 */
  addEvaluation(supplierId, item) {
    const s = load()
    const sup = s.suppliers.find((x) => x.id === supplierId)
    const rec = {
      id: uid(),
      supplierId,
      date: new Date().toISOString().slice(0, 10),
      type: evalType.INITIAL,
      evaluator: '',
      result: evalResult.PASS,
      score: '',
      criteria: '',
      findings: '',
      notes: '',
      files: [],
      ...item,
    }
    s.evaluations = [...s.evaluations, rec]
    if (sup) {
      const cycle = DEFAULT_REEVAL_MONTHS[sup.riskClass] || 24
      const patch = {
        status: statusFromResult(rec.result),
        lastEvalDate: rec.date,
        nextReevalDate: addMonths(rec.date, cycle),
      }
      if (rec.result === evalResult.PASS || rec.result === evalResult.CONDITIONAL) {
        if (!sup.approvedDate || rec.type === evalType.INITIAL) patch.approvedDate = rec.date
      }
      s.suppliers = s.suppliers.map((x) => (x.id === supplierId ? { ...x, ...patch } : x))
    }
    save(s)
    return rec
  },
  updateEvaluation(id, patch) {
    const s = load()
    s.evaluations = s.evaluations.map((e) => (e.id === id ? { ...e, ...patch } : e))
    save(s)
    return s
  },
  deleteEvaluation(id) {
    const s = load()
    s.evaluations = s.evaluations.filter((e) => e.id !== id)
    save(s)
    return s
  },
  getEvaluations(supplierId) {
    const s = load()
    return s.evaluations
      .filter((e) => e.supplierId === supplierId)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  },
  /** 재평가 임박(60일 이내) 또는 만료된 공급자 목록 */
  dueForReeval(withinDays = 60) {
    const s = load()
    const cutoff = Date.now() + withinDays * 24 * 60 * 60 * 1000
    return s.suppliers.filter((sup) => sup.nextReevalDate && new Date(sup.nextReevalDate).getTime() <= cutoff)
  },
}

export default suppliers
