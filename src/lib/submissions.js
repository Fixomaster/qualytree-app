/**
 * Submissions — 인허가 신청·통지 통합 관리 (RA-001)
 *
 * 적용 표준:
 * - Project Instructions §12 규제 정보 자동 수집·신청·통지 통합
 * - 의료기기법 §6 (제조허가·인증·신고)
 * - 21 CFR 807 (FDA 510(k) Premarket Notification)
 * - 21 CFR 814 (Premarket Approval)
 * - MDR (EU) 2017/745 Article 52 (Conformity Assessment Procedures)
 * - PMDA Pharmaceutical Affairs Law
 * - NMPA 의료기기 등록 규정
 *
 * 데이터 구조:
 *   localStorage('qualytree.submissions') = [
 *     {
 *       id: "SUB-2026-0001",
 *       productId: "MRUHP-8H",
 *       productName: "ULNA Hook Plate",
 *       jurisdiction: "MFDS" | "FDA" | "MDR" | "PMDA" | "NMPA" | "TGA" | "ANVISA",
 *       submissionType: "510k" | "PMA" | "DeNovo" | "MDR-Class-IIb" | "KGMP" | ...,
 *       status: "draft" | "preparing" | "submitted" | "deficiency" | "approved" | "rejected" | "withdrawn",
 *       submittedAt, approvedAt, deficiencyAt,
 *       deficiencies: [{ id, receivedAt, deadline, description, status: 'open|responded|closed' }],
 *       notifications: [{ id, receivedAt, type, summary, read }],
 *       packageReady: boolean,        // 자동 생성 패키지 준비 완료 여부
 *       documents: [...],
 *       createdBy, createdAt
 *     }
 *   ]
 */

import { commitChange, CHANGE_ACTIONS } from './changeControl'
import { ENTITY_TYPES, eid } from './entityRegistry'
import { addLink } from './linkage'
import { auth } from './auth'

const KEY = 'qualytree.submissions'
const COUNTER_KEY = 'qualytree.submissionCounter'

export const JURISDICTIONS = {
  MFDS: { ko: '식약처', en: 'MFDS', country: '🇰🇷 한국' },
  FDA: { ko: 'FDA', en: 'FDA', country: '🇺🇸 미국' },
  MDR: { ko: 'EU MDR', en: 'EU MDR', country: '🇪🇺 유럽' },
  PMDA: { ko: 'PMDA', en: 'PMDA', country: '🇯🇵 일본' },
  NMPA: { ko: 'NMPA', en: 'NMPA', country: '🇨🇳 중국' },
  TGA: { ko: 'TGA', en: 'TGA', country: '🇦🇺 호주' },
  ANVISA: { ko: 'ANVISA', en: 'ANVISA', country: '🇧🇷 브라질' },
}

export const SUBMISSION_TYPES = {
  // FDA
  FDA_510K: { ko: '510(k) Premarket Notification', en: '510(k)', jurisdiction: 'FDA' },
  FDA_PMA: { ko: 'PMA Premarket Approval', en: 'PMA', jurisdiction: 'FDA' },
  FDA_DENOVO: { ko: 'De Novo Classification', en: 'De Novo', jurisdiction: 'FDA' },
  FDA_QSUB: { ko: 'Q-Submission (Pre-Sub)', en: 'Q-Sub', jurisdiction: 'FDA' },
  // MFDS
  MFDS_NEWMD: { ko: '의료기기 제조허가', en: 'New Medical Device License', jurisdiction: 'MFDS' },
  MFDS_KGMP: { ko: 'KGMP 적합인정 심사', en: 'KGMP Audit', jurisdiction: 'MFDS' },
  // MDR
  MDR_CE_IIa: { ko: 'CE 적합성 평가 (Class IIa)', en: 'CE Conformity IIa', jurisdiction: 'MDR' },
  MDR_CE_IIb: { ko: 'CE 적합성 평가 (Class IIb)', en: 'CE Conformity IIb', jurisdiction: 'MDR' },
  MDR_CE_III: { ko: 'CE 적합성 평가 (Class III)', en: 'CE Conformity III', jurisdiction: 'MDR' },
  // PMDA
  PMDA_NEWMD: { ko: 'PMDA 의료기기 승인', en: 'PMDA Approval', jurisdiction: 'PMDA' },
  // NMPA
  NMPA_REG: { ko: 'NMPA 등록', en: 'NMPA Registration', jurisdiction: 'NMPA' },
}

export const SUBMISSION_STATUS = {
  DRAFT: 'draft',
  PREPARING: 'preparing',
  SUBMITTED: 'submitted',
  DEFICIENCY: 'deficiency',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
}

export const SUBMISSION_STATUS_META = {
  draft: { ko: '초안', tone: 'ink-mute' },
  preparing: { ko: '패키지 준비', tone: 'amber' },
  submitted: { ko: '제출됨', tone: 'sky' },
  deficiency: { ko: '보완 요청', tone: 'rust' },
  approved: { ko: '승인', tone: 'leaf' },
  rejected: { ko: '반려', tone: 'rust' },
  withdrawn: { ko: '철회', tone: 'ink-mute' },
}

/* 보완 요청 마감 시한 — 일 단위 */
export const DEFICIENCY_DEADLINES = {
  FDA: 180,      // 510(k) Hold: 180일
  MFDS: 30,      // 의료기기법 시행규칙
  MDR: 90,       // NB 보완 요청
  PMDA: 60,
  NMPA: 60,
  TGA: 90,
  ANVISA: 90,
}

/* ================================================================
   Storage
   ================================================================ */
function loadAll() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveAll(arr) {
  localStorage.setItem(KEY, JSON.stringify(arr))
}

function nextSubId() {
  const counter = parseInt(localStorage.getItem(COUNTER_KEY) || '0', 10) + 1
  localStorage.setItem(COUNTER_KEY, String(counter))
  const year = new Date().getFullYear()
  return `SUB-${year}-${String(counter).padStart(4, '0')}`
}

function nextDefId(submission) {
  const n = (submission.deficiencies?.length || 0) + 1
  return `DEF-${submission.id}-${String(n).padStart(2, '0')}`
}

/* ================================================================
   API
   ================================================================ */
export const submissions = {
  loadAll,

  findById(id) {
    return loadAll().find((s) => s.id === id) || null
  },

  /** 드래프트 상태의 신청 내용(관할·유형 등)을 수정한다 — 제출 후에는 수정 불가. */
  update(subId, patch) {
    const all = loadAll()
    const idx = all.findIndex((s) => s.id === subId)
    if (idx === -1) return null
    if (all[idx].status !== 'draft') throw new Error('드래프트 상태에서만 내용을 수정할 수 있습니다.')
    const before = { ...all[idx] }
    all[idx] = { ...all[idx], ...patch }
    saveAll(all)
    commitChange({
      targetEid: eid('submission', subId),
      action: CHANGE_ACTIONS.UPDATE,
      before,
      after: all[idx],
      reason: '신청 내용 수정',
    })
    return all[idx]
  },

  /**
   * 신청 발행 (드래프트 생성)
   */
  create(input) {
    const {
      productId,
      productName,
      jurisdiction,
      submissionType,
    } = input
    if (!productId || !jurisdiction || !submissionType) {
      throw new Error('submissions.create: productId + jurisdiction + submissionType 필수')
    }
    const cur = auth.current()
    const id = nextSubId()
    const record = {
      id,
      productId,
      productName: productName || productId,
      jurisdiction,
      submissionType,
      status: SUBMISSION_STATUS.DRAFT,
      submittedAt: null,
      approvedAt: null,
      deficiencyAt: null,
      deficiencies: [],
      notifications: [],
      packageReady: false,
      documents: [],
      createdBy: cur?.name,
      createdAt: new Date().toISOString(),
    }
    const all = loadAll()
    all.push(record)
    saveAll(all)

    // CCR + 양방향 연결
    const subEid = eid('submission', id)
    commitChange({
      targetEid: subEid,
      action: CHANGE_ACTIONS.CREATE,
      after: record,
      reason: `${JURISDICTIONS[jurisdiction]?.ko} ${SUBMISSION_TYPES[submissionType]?.ko || submissionType} 신청 드래프트 생성 — ${productName}`,
    })
    addLink(subEid, eid(ENTITY_TYPES.PRODUCT, productId), 'forProduct')

    return record
  },

  /**
   * 패키지 준비 완료 (Stage 1: 패키지 자동 생성)
   * documents: 제품의 기술문서(techDocs) 등 실제 제출서류 목록 — 호출부(RegulatoryHub)에서
   * productDocs.getTechDocs(productKey)로 조회해 전달한다. 여기서 첨부해 다운로드 가능하게 만든다.
   */
  prepare(subId, documents = []) {
    const all = loadAll()
    const idx = all.findIndex((s) => s.id === subId)
    if (idx === -1) return null
    const before = { ...all[idx] }
    all[idx] = {
      ...all[idx],
      status: SUBMISSION_STATUS.PREPARING,
      packageReady: true,
      documents: documents.length ? documents : (all[idx].documents || []),
    }
    saveAll(all)
    commitChange({
      targetEid: eid('submission', subId),
      action: CHANGE_ACTIONS.UPDATE,
      before,
      after: all[idx],
      reason: '신청 패키지 자동 생성 완료 — 제출 준비됨',
    })
    return all[idx]
  },

  /**
   * 제출 (외부 포털 이동 — 사용자가 직접 제출했음을 시스템에 알림)
   */
  markSubmitted(subId, externalRefNumber = null) {
    const all = loadAll()
    const idx = all.findIndex((s) => s.id === subId)
    if (idx === -1) return null
    const before = { ...all[idx] }
    all[idx] = {
      ...all[idx],
      status: SUBMISSION_STATUS.SUBMITTED,
      submittedAt: new Date().toISOString(),
      externalRefNumber,
    }
    saveAll(all)
    commitChange({
      targetEid: eid('submission', subId),
      action: CHANGE_ACTIONS.UPDATE,
      before,
      after: all[idx],
      reason: `${JURISDICTIONS[all[idx].jurisdiction]?.ko}에 정식 제출됨${
        externalRefNumber ? ` (참조번호: ${externalRefNumber})` : ''
      }`,
    })
    return all[idx]
  },

  /**
   * 보완 요청 등록 (당국으로부터 받은 통지)
   */
  addDeficiency(subId, defInput) {
    const all = loadAll()
    const idx = all.findIndex((s) => s.id === subId)
    if (idx === -1) return null
    const before = { ...all[idx] }
    const sub = all[idx]
    const deadlineDays =
      DEFICIENCY_DEADLINES[sub.jurisdiction] || 60
    const receivedAt = defInput.receivedAt || new Date().toISOString()
    const deadline = new Date(
      new Date(receivedAt).getTime() + deadlineDays * 24 * 60 * 60 * 1000
    ).toISOString()

    const def = {
      id: nextDefId(sub),
      receivedAt,
      deadline,
      description: defInput.description || '',
      items: defInput.items || [],
      status: 'open',
    }
    all[idx] = {
      ...all[idx],
      status: SUBMISSION_STATUS.DEFICIENCY,
      deficiencyAt: receivedAt,
      deficiencies: [...(sub.deficiencies || []), def],
    }
    saveAll(all)
    commitChange({
      targetEid: eid('submission', subId),
      action: CHANGE_ACTIONS.UPDATE,
      before,
      after: all[idx],
      reason: `${JURISDICTIONS[sub.jurisdiction]?.ko} 보완 요청 접수 — 마감 ${deadlineDays}일 (${new Date(deadline).toLocaleDateString('ko-KR')})`,
    })
    return { submission: all[idx], deficiency: def }
  },

  /**
   * 보완 응답 완료
   */
  respondToDeficiency(subId, defId) {
    const all = loadAll()
    const idx = all.findIndex((s) => s.id === subId)
    if (idx === -1) return null
    const before = { ...all[idx] }
    const sub = all[idx]
    const newDefs = sub.deficiencies.map((d) =>
      d.id === defId
        ? { ...d, status: 'responded', respondedAt: new Date().toISOString() }
        : d
    )
    const allClosed = newDefs.every((d) => d.status !== 'open')
    all[idx] = {
      ...all[idx],
      deficiencies: newDefs,
      status: allClosed ? SUBMISSION_STATUS.SUBMITTED : SUBMISSION_STATUS.DEFICIENCY,
    }
    saveAll(all)
    commitChange({
      targetEid: eid('submission', subId),
      action: CHANGE_ACTIONS.UPDATE,
      before,
      after: all[idx],
      reason: `보완 응답 완료 (${defId})${allClosed ? ' — 모든 보완 응답 완료, 재심사 대기' : ''}`,
    })
    return all[idx]
  },

  /**
   * 승인 (당국으로부터 승인 통지 받음)
   */
  approve(subId, certNumber = null) {
    const all = loadAll()
    const idx = all.findIndex((s) => s.id === subId)
    if (idx === -1) return null
    const before = { ...all[idx] }
    all[idx] = {
      ...all[idx],
      status: SUBMISSION_STATUS.APPROVED,
      approvedAt: new Date().toISOString(),
      certificateNumber: certNumber,
    }
    saveAll(all)
    commitChange({
      targetEid: eid('submission', subId),
      action: CHANGE_ACTIONS.UPDATE,
      before,
      after: all[idx],
      reason: `${JURISDICTIONS[all[idx].jurisdiction]?.ko} 승인됨${
        certNumber ? ` — 인증번호 ${certNumber}` : ''
      }`,
    })
    return all[idx]
  },

  /**
   * 마감 임박 보완 요청 — 알림용
   */
  upcomingDeadlines(daysAhead = 30) {
    const all = loadAll()
    const now = Date.now()
    const cutoff = now + daysAhead * 24 * 60 * 60 * 1000
    const out = []
    all.forEach((sub) => {
      ;(sub.deficiencies || [])
        .filter((d) => d.status === 'open')
        .forEach((d) => {
          const deadline = new Date(d.deadline).getTime()
          if (deadline <= cutoff) {
            const daysLeft = Math.ceil((deadline - now) / (24 * 60 * 60 * 1000))
            out.push({
              submission: sub,
              deficiency: d,
              daysLeft,
              isOverdue: daysLeft < 0,
            })
          }
        })
    })
    return out.sort((a, b) => a.daysLeft - b.daysLeft)
  },
}
