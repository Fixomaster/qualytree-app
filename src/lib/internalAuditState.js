// 내부심사 — ISO 13485 §8.2.4 / FDA QMSR §820.22
//
// - audits(심사) — 계획(Plan) → 계획승인 → 체크리스트 진행 → 보고서 작성 → 보고서 승인(완료)
// - checklist(체크리스트) — 심사 대상 카드에서 CARDS(gmpProgress.js) 필수/선택/검증 항목을 자동 발행
// - findings(시정조치) — 체크리스트 미충족/부분충족 또는 수동 등록, CAPA와 연계하여 종결
//
// equipmentState.js와 동일한 localStorage 기반 패턴을 따른다.

import { CARDS, STATUS, computeCardProgress, loadContext } from './gmpProgress'

const STORE_KEY = 'qualytree.internalAudits'

function defaultState() {
  return {
    audits: [],
    checklist: [],
    findings: [],
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
    console.error('internalAuditState save failed', e)
  }
  return next
}

const uid = () => Math.random().toString(36).slice(2, 10)

function nextAuditId(existing) {
  const year = new Date().getFullYear()
  const seq = existing.filter((a) => a.id.startsWith(`AUD-${year}`)).length + 1
  return `AUD-${year}-${String(seq).padStart(3, '0')}`
}

export const AUDIT_STATUS = {
  PLANNING: '계획중',
  PLAN_APPROVED: '계획승인',
  IN_PROGRESS: '심사진행중',
  REPORT_DRAFT: '보고서작성중',
  COMPLETED: '완료',
}

export const FINDING_CLASS = {
  MAJOR: 'Major',
  MINOR: 'Minor',
  OFI: '관찰(OFI)',
}

export const FINDING_STATUS = {
  OPEN: '미조치',
  CAPA_LINKED: 'CAPA 연계',
  CLOSED: '종결',
}

export const CHECKLIST_RESULT = {
  MET: '충족',
  PARTIAL: '부분충족',
  UNMET: '미충족',
  NA: '해당없음',
}

/** 선택된 카드들의 CARDS 항목(N/A 제외)을 체크리스트 행으로 변환 — ISO 13485 §8.2.4 */
function buildChecklistRows(auditId, cardIds) {
  const ctx = loadContext()
  const rows = []
  cardIds.forEach((cardId) => {
    const card = CARDS.find((c) => c.id === cardId)
    if (!card) return
    const progress = computeCardProgress(card, ctx)
    ;(progress.items || [])
      .filter((item) => item.resolvedStatus !== STATUS.NA)
      .forEach((item) => {
        rows.push({
          id: uid(),
          auditId,
          cardId: card.id,
          cardTitle: card.title,
          itemId: item.id,
          label: item.label,
          resolvedStatus: item.resolvedStatus,
          systemFulfillment: item.fulfillment, // 시스템 자동판정 — 참고용, 심사원 독립 판단을 대체하지 않음
          citations: item.citations || [],
          result: '',
          evidence: '',
          notes: '',
          checkedBy: '',
          checkedAt: '',
        })
      })
  })
  return rows
}

export const audits = {
  load,
  save,
  defaultState,
  uid,

  // ── 계획 (Plan) ──
  add(item) {
    const s = load()
    const rec = {
      id: nextAuditId(s.audits),
      title: '',
      scope: '',
      cardIds: [],
      plannedDate: '',
      leadAuditor: '',
      auditors: '',
      status: AUDIT_STATUS.PLANNING,
      planApprovedBy: '',
      planApprovedAt: '',
      report: null,
      createdAt: new Date().toISOString(),
      ...item,
    }
    s.audits = [...s.audits, rec]
    save(s)
    return rec
  },
  update(id, patch) {
    const s = load()
    s.audits = s.audits.map((a) => (a.id === id ? { ...a, ...patch } : a))
    save(s)
    return s
  },
  delete(id) {
    const s = load()
    s.audits = s.audits.filter((a) => a.id !== id)
    s.checklist = s.checklist.filter((c) => c.auditId !== id)
    s.findings = s.findings.filter((f) => f.auditId !== id)
    save(s)
    return s
  },
  get(id) {
    return load().audits.find((a) => a.id === id) || null
  },
  getAll() {
    return load().audits.slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  },

  /** 계획 승인 — 체크리스트 자동 발행 + 심사진행중으로 전환 (Manager 전용, ISO 13485 §8.2.4) */
  approvePlan(id, approverName) {
    const s = load()
    const a = s.audits.find((x) => x.id === id)
    if (!a) return null
    if (!a.cardIds || a.cardIds.length === 0) throw new Error('심사 대상 카드를 1개 이상 선택하세요.')
    const rows = buildChecklistRows(id, a.cardIds)
    s.checklist = [...s.checklist, ...rows]
    s.audits = s.audits.map((x) =>
      x.id === id
        ? { ...x, status: AUDIT_STATUS.IN_PROGRESS, planApprovedBy: approverName, planApprovedAt: new Date().toISOString() }
        : x
    )
    save(s)
    return s
  },

  /** 보고서 작성 — 체크리스트·시정조치 요약 자동 집계 */
  draftReport(id, { overview, conclusion, preparedBy }) {
    const s = load()
    const checklist = s.checklist.filter((c) => c.auditId === id)
    const findings = s.findings.filter((f) => f.auditId === id)
    const summary = {
      totalItems: checklist.length,
      met: checklist.filter((c) => c.result === CHECKLIST_RESULT.MET).length,
      partial: checklist.filter((c) => c.result === CHECKLIST_RESULT.PARTIAL).length,
      unmet: checklist.filter((c) => c.result === CHECKLIST_RESULT.UNMET).length,
      unchecked: checklist.filter((c) => !c.result).length,
      majorFindings: findings.filter((f) => f.classification === FINDING_CLASS.MAJOR).length,
      minorFindings: findings.filter((f) => f.classification === FINDING_CLASS.MINOR).length,
      ofiFindings: findings.filter((f) => f.classification === FINDING_CLASS.OFI).length,
    }
    s.audits = s.audits.map((x) =>
      x.id === id
        ? {
            ...x,
            status: AUDIT_STATUS.REPORT_DRAFT,
            report: { overview: overview || '', conclusion: conclusion || '', preparedBy: preparedBy || '', preparedAt: new Date().toISOString(), summary, approvedBy: '', approvedAt: '' },
          }
        : x
    )
    save(s)
    return s
  },

  /** 보고서 승인 — 심사 완료 (Manager 전용) */
  approveReport(id, approverName) {
    const s = load()
    s.audits = s.audits.map((x) =>
      x.id === id && x.report
        ? { ...x, status: AUDIT_STATUS.COMPLETED, report: { ...x.report, approvedBy: approverName, approvedAt: new Date().toISOString() } }
        : x
    )
    save(s)
    return s
  },
}

export const checklist = {
  getForAudit(auditId) {
    return load().checklist.filter((c) => c.auditId === auditId)
  },
  setResult(rowId, patch) {
    const s = load()
    s.checklist = s.checklist.map((c) => (c.id === rowId ? { ...c, ...patch, checkedAt: new Date().toISOString() } : c))
    save(s)
    return s
  },
}

export const findings = {
  add(auditId, item) {
    const s = load()
    const rec = {
      id: uid(),
      auditId,
      cardId: item.cardId || '',
      checklistItemId: item.checklistItemId || null,
      classification: FINDING_CLASS.MINOR,
      description: '',
      evidence: '',
      dueDate: '',
      status: FINDING_STATUS.OPEN,
      capaId: null,
      closedAt: '',
      ...item,
    }
    s.findings = [...s.findings, rec]
    save(s)
    return rec
  },
  update(id, patch) {
    const s = load()
    s.findings = s.findings.map((f) => (f.id === id ? { ...f, ...patch } : f))
    save(s)
    return s
  },
  linkCapa(id, capaId) {
    const s = load()
    s.findings = s.findings.map((f) => (f.id === id ? { ...f, capaId, status: FINDING_STATUS.CAPA_LINKED } : f))
    save(s)
    return s
  },
  close(id) {
    const s = load()
    s.findings = s.findings.map((f) => (f.id === id ? { ...f, status: FINDING_STATUS.CLOSED, closedAt: new Date().toISOString() } : f))
    save(s)
    return s
  },
  delete(id) {
    const s = load()
    s.findings = s.findings.filter((f) => f.id !== id)
    save(s)
    return s
  },
  getForAudit(auditId) {
    return load().findings.filter((f) => f.auditId === auditId)
  },
  getAll() {
    return load().findings
  },
}

export default { audits, checklist, findings, AUDIT_STATUS, FINDING_CLASS, FINDING_STATUS, CHECKLIST_RESULT }
