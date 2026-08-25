/**
 * Qualytree Change Review — 변경관리(ECR/ECN) 심사 워크플로우 레이어
 *
 * lib/changeControl.js 가 자동 기록하는 CCR(구성 변경 기록)은 "무엇이 바뀌었는지"만
 * 담는다. 이 모듈은 그 CCR 1건 당 "영향평가 → 승인/반려 → 이행완료"라는
 * 사람이 수행하는 심사 단계를 별도로 추적한다 (CCR 원본은 불변 — 심사 상태만 여기서 관리).
 *
 * 적용 원칙:
 * - ISO 13485 §4.1.4 / §7.3.9 변경 관리 — 영향평가·승인·이행 기록
 * - Project Instructions §13.15 구성 관리
 *
 * 데이터 구조:
 *   localStorage('qualytree.changeReview') = [
 *     {
 *       ccrId: "CCR-2026-0001",
 *       status: "pending_impact" | "pending_approval" | "approved" | "rejected" | "completed",
 *       approvedBy, approvedAt, approvalNote,
 *       rejectedBy, rejectedAt, rejectionNote,
 *       implementedBy, implementedAt, implementationNote,
 *     }
 *   ]
 */

import { auth } from './auth'

const KEY = 'qualytree.changeReview'

export const REVIEW_STATUS = {
  PENDING_IMPACT: 'pending_impact',     // 영향평가 대기
  PENDING_APPROVAL: 'pending_approval', // 승인 대기
  APPROVED: 'approved',                 // 승인(이행 대기)
  REJECTED: 'rejected',                 // 반려
  COMPLETED: 'completed',               // 이행 완료
}

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

function upsert(ccrId, patch) {
  const all = loadAll()
  const idx = all.findIndex((r) => r.ccrId === ccrId)
  const now = new Date().toISOString()
  if (idx === -1) {
    const rec = { ccrId, status: REVIEW_STATUS.PENDING_IMPACT, createdAt: now, ...patch }
    all.push(rec)
    saveAll(all)
    return rec
  }
  all[idx] = { ...all[idx], ...patch, updatedAt: now }
  saveAll(all)
  return all[idx]
}

export const changeReview = {
  /** CCR 1건의 심사 상태 조회 (없으면 기본값 = 영향평가 대기) */
  get(ccrId) {
    return loadAll().find((r) => r.ccrId === ccrId) || { ccrId, status: REVIEW_STATUS.PENDING_IMPACT }
  },

  getAll() {
    return loadAll()
  },

  /** 영향평가 작성 완료 → 승인 대기로 전환 */
  submitImpact(ccrId) {
    const cur = auth.current()
    return upsert(ccrId, {
      status: REVIEW_STATUS.PENDING_APPROVAL,
      requestedByEmail: cur?.email || null,
      requestedByName: cur?.name || cur?.email || null,
      requestedAt: new Date().toISOString(),
    })
  },

  /** 승인 — 승인자는 항상 현재 로그인 사용자 (수기 입력 불가) */
  approve(ccrId, note) {
    const cur = auth.current()
    return upsert(ccrId, {
      status: REVIEW_STATUS.APPROVED,
      approvedBy: cur?.name || 'unknown',
      approvedAt: new Date().toISOString(),
      approvalNote: note || '',
    })
  },

  /** 반려 */
  reject(ccrId, note) {
    const cur = auth.current()
    return upsert(ccrId, {
      status: REVIEW_STATUS.REJECTED,
      rejectedBy: cur?.name || 'unknown',
      rejectedAt: new Date().toISOString(),
      rejectionNote: note || '',
    })
  },

  /** 반려 후 재작성 요청 — 영향평가 단계로 되돌림 */
  reopen(ccrId) {
    return upsert(ccrId, { status: REVIEW_STATUS.PENDING_IMPACT })
  },

  /** 이행 완료 — 완료일은 항상 클릭 시점 자동 기록 (수기 입력 불가) */
  complete(ccrId, note) {
    const cur = auth.current()
    return upsert(ccrId, {
      status: REVIEW_STATUS.COMPLETED,
      implementedBy: cur?.name || 'unknown',
      implementedAt: new Date().toISOString(),
      implementationNote: note || '',
    })
  },
}
