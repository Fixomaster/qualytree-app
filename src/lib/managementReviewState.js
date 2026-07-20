// 경영검토 — ISO 13485 §5.6 / FDA QMSR §820.20(c)
//
// - qualityObjectives(품질목표) — 목표·실적 추적
// - complaints(고객불만) — 접수·조사·종결 로그, 경영검토 입력으로 자동 집계
// - reviews(경영검토 기록) — KPI·품질목표·고객불만·CAPA현황 자동 스냅샷 + 결정사항 + 승인 절차
//
// 다른 SSoT 모듈(capaState/ncrState/equipmentState/supplierState/internalAuditState/trainingState)을
// 직접 조회해 §5.6.2 요구 입력 항목을 자동 집계한다 (특허 P13 다중 데이터 통합 사상과 동일한 원칙).

import { capa, CAPA_STATUS } from './capaState'
import { ncr } from './ncrState'
import { equipment } from './equipmentState'
import { suppliers } from './supplierState'
import { findings, FINDING_STATUS } from './internalAuditState'
import { sessions as trainingSessions } from './trainingState'
import { onboarding } from './onboardingState'

const STORE_KEY = 'qualytree.managementReview'
// Documents.jsx(품질 문서)와 동일한 저장소 키 — 경영검토 승인 시 '경영검토' 절차서 docState에
// 즉시 이력을 반영하기 위해 직접 참조한다 (ISO 13485 §4.2.4 문서·기록 관리 연계).
const DOC_KEY = 'qualytree.documents'

function loadDocState() {
  try { return JSON.parse(localStorage.getItem(DOC_KEY) || '{}') } catch { return {} }
}

function saveDocState(next) {
  try { localStorage.setItem(DOC_KEY, JSON.stringify(next)) } catch { /* 저장 실패 시에도 경영검토 승인 자체는 유지 */ }
}

/**
 * 경영검토가 승인되면 온보딩 절차 목록에서 '경영검토' 절차서를 찾아 품질 문서(Documents.jsx)
 * docState에 승인 이력을 즉시 반영한다. kgmpProgress.js의 procedureItem()과 동일한
 * 키워드 매칭 방식(name에 '경영검토' 포함)을 사용해 두 화면의 데이터가 항상 일치하도록 한다.
 */
function syncApprovedReviewToDocuments(review, approverName) {
  try {
    const procedures = (onboarding.load().procedures || []).filter((p) => p.applicable !== false)
    const matched = procedures.find((p) => (p.name || '').includes('경영검토'))
    if (!matched) return
    const key = 'P-' + matched.id
    const docs = loadDocState()
    const cur = docs[key] || { status: 'draft', rev: 0, history: [] }
    const today = new Date().toISOString().slice(0, 10)
    const periodLabel = review.period || review.meetingDate || ''
    const note = `경영검토 승인 반영${periodLabel ? ' (기간: ' + periodLabel + ')' : ''} · 승인자: ${approverName}`
    docs[key] = {
      ...cur,
      updatedAt: Date.now(),
      lastReviewApprovalAt: today,
      lastReviewId: review.id,
      history: [...(cur.history || []), { rev: cur.rev || 0, action: note, by: approverName, at: today }],
    }
    saveDocState(docs)
  } catch { /* best-effort 연동 — 실패해도 경영검토 승인 자체는 정상 처리 */ }
}

function defaultState() {
  return {
    reviews: [],
    qualityObjectives: [],
    complaints: [],
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
    console.error('managementReviewState save failed', e)
  }
  return next
}

const uid = () => Math.random().toString(36).slice(2, 10)

export const OBJECTIVE_STATUS = {
  ON_TRACK: '진행중',
  MET: '달성',
  MISSED: '미달성',
}

export const COMPLAINT_STATUS = {
  OPEN: '접수',
  INVESTIGATING: '조사중',
  CLOSED: '종결',
}

export const REVIEW_STATUS = {
  DRAFT: '작성중',
  APPROVED: '승인완료',
}

export const qualityObjectives = {
  add(item) {
    const s = load()
    const rec = { id: uid(), objective: '', target: '', unit: '', actual: '', period: '', status: OBJECTIVE_STATUS.ON_TRACK, ...item }
    s.qualityObjectives = [...s.qualityObjectives, rec]
    save(s)
    return rec
  },
  update(id, patch) {
    const s = load()
    s.qualityObjectives = s.qualityObjectives.map((o) => (o.id === id ? { ...o, ...patch } : o))
    save(s)
    return s
  },
  delete(id) {
    const s = load()
    s.qualityObjectives = s.qualityObjectives.filter((o) => o.id !== id)
    save(s)
    return s
  },
  getAll() {
    return load().qualityObjectives
  },
}

export const complaints = {
  add(item) {
    const s = load()
    const rec = { id: uid(), date: new Date().toISOString().slice(0, 10), customer: '', product: '', description: '', severity: '보통', status: COMPLAINT_STATUS.OPEN, resolution: '', closedAt: '', ...item }
    s.complaints = [...s.complaints, rec]
    save(s)
    return rec
  },
  update(id, patch) {
    const s = load()
    s.complaints = s.complaints.map((c) => (c.id === id ? { ...c, ...patch } : c))
    save(s)
    return s
  },
  delete(id) {
    const s = load()
    s.complaints = s.complaints.filter((c) => c.id !== id)
    save(s)
    return s
  },
  getAll() {
    return load().complaints.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  },
  getOpenCount() {
    return load().complaints.filter((c) => c.status !== COMPLAINT_STATUS.CLOSED).length
  },
}

/** §5.6.2 요구 입력 항목 자동 집계 — KPI·품질목표·고객불만·CAPA현황 */
export function buildSnapshot() {
  const eq = equipment.load()
  const overdueCalibration = eq.calibrationPlans.filter((p) => p.nextDate && new Date(p.nextDate).getTime() < Date.now()).length
  const supplierReevalDue = suppliers.dueForReeval(0).length
  const openAuditFindings = findings.getAll().filter((f) => f.status !== FINDING_STATUS.CLOSED).length
  const allCapas = capa.loadAll()
  const trainingCompliance = trainingSessions.complianceRate()

  return {
    generatedAt: new Date().toISOString(),
    kpi: {
      ncrOpen: ncr.getOpenCount(),
      capaOpen: allCapas.filter((c) => c.status !== CAPA_STATUS.CLOSED).length,
      capaClosed: allCapas.filter((c) => c.status === CAPA_STATUS.CLOSED).length,
      calibrationOverdue: overdueCalibration,
      supplierReevalDue,
      auditOpenFindings: openAuditFindings,
      trainingCompliance,
      complaintOpen: complaints.getOpenCount(),
      complaintTotal: complaints.getAll().length,
    },
    qualityObjectivesSnapshot: qualityObjectives.getAll(),
    complaintsSnapshot: complaints.getAll().slice(0, 10),
    capaSnapshot: allCapas.map((c) => ({ id: c.id, title: c.title, status: c.status })),
  }
}

export const reviews = {
  create({ period, meetingDate, attendees, agenda }) {
    const s = load()
    const rec = {
      id: uid(),
      period: period || '',
      meetingDate: meetingDate || '',
      attendees: attendees || '',
      status: REVIEW_STATUS.DRAFT,
      snapshot: buildSnapshot(),
      agenda: agenda || '',
      decisions: '',
      minutesFiles: [], // 회의록 원본(서명본·스캔본 등) 첨부 보관 — [{id, fileId, fileName, uploadedAt}]
      actionItems: [],
      preparedBy: '',
      preparedAt: '',
      approvedBy: '',
      approvedAt: '',
      createdAt: new Date().toISOString(),
    }
    s.reviews = [...s.reviews, rec]
    save(s)
    return rec
  },
  attachMinutesFile(id, { fileId, fileName }) {
    const s = load()
    s.reviews = s.reviews.map((r) => (r.id === id
      ? { ...r, minutesFiles: [...(r.minutesFiles || []), { id: uid(), fileId, fileName, uploadedAt: new Date().toISOString() }] }
      : r))
    save(s)
    return s
  },
  removeMinutesFile(id, minutesFileId) {
    const s = load()
    s.reviews = s.reviews.map((r) => (r.id === id
      ? { ...r, minutesFiles: (r.minutesFiles || []).filter((m) => m.id !== minutesFileId) }
      : r))
    save(s)
    return s
  },
  update(id, patch) {
    const s = load()
    s.reviews = s.reviews.map((r) => (r.id === id ? { ...r, ...patch } : r))
    save(s)
    return s
  },
  addActionItem(id, item) {
    const s = load()
    s.reviews = s.reviews.map((r) => (r.id === id ? { ...r, actionItems: [...r.actionItems, { id: uid(), description: '', owner: '', dueDate: '', status: '진행중', ...item }] } : r))
    save(s)
    return s
  },
  updateActionItem(id, itemId, patch) {
    const s = load()
    s.reviews = s.reviews.map((r) => (r.id === id ? { ...r, actionItems: r.actionItems.map((a) => (a.id === itemId ? { ...a, ...patch } : a)) } : r))
    save(s)
    return s
  },
  approve(id, approverName) {
    const s = load()
    let approved = null
    s.reviews = s.reviews.map((r) => {
      if (r.id !== id) return r
      approved = { ...r, status: REVIEW_STATUS.APPROVED, approvedBy: approverName, approvedAt: new Date().toISOString() }
      return approved
    })
    save(s)
    // 승인 즉시 품질 문서(경영검토 절차서)에 이력 반영 — "승인되면 바로 업데이트" 요구사항
    if (approved) syncApprovedReviewToDocuments(approved, approverName)
    return s
  },
  delete(id) {
    const s = load()
    s.reviews = s.reviews.filter((r) => r.id !== id)
    save(s)
    return s
  },
  getAll() {
    return load().reviews.slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  },
}

export default { reviews, qualityObjectives, complaints, buildSnapshot, OBJECTIVE_STATUS, COMPLAINT_STATUS, REVIEW_STATUS }
