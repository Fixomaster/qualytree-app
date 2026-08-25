/**
 * Qualytree Change Review â ë³ê²½ê´ë¦¬(ECR/ECN) ì¬ì¬ ìí¬íë¡ì° ë ì´ì´
 *
 * lib/changeControl.js ê° ìë ê¸°ë¡íë CCR(êµ¬ì± ë³ê²½ ê¸°ë¡)ì "ë¬´ìì´ ë°ëìëì§"ë§
 * ë´ëë¤. ì´ ëª¨ëì ê·¸ CCR 1ê±´ ë¹ "ìí¥íê° â ì¹ì¸/ë°ë ¤ â ì´íìë£"ë¼ë
 * ì¬ëì´ ìííë ì¬ì¬ ë¨ê³ë¥¼ ë³ëë¡ ì¶ì íë¤ (CCR ìë³¸ì ë¶ë³ â ì¬ì¬ ìíë§ ì¬ê¸°ì ê´ë¦¬).
 *
 * ì ì© ìì¹:
 * - ISO 13485 Â§4.1.4 / Â§7.3.9 ë³ê²½ ê´ë¦¬ â ìí¥íê°Â·ì¹ì¸Â·ì´í ê¸°ë¡
 * - Project Instructions Â§13.15 êµ¬ì± ê´ë¦¬
 *
 * ë°ì´í° êµ¬ì¡°:
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
  PENDING_IMPACT: 'pending_impact',     // ìí¥íê° ëê¸°
  PENDING_APPROVAL: 'pending_approval', // ì¹ì¸ ëê¸°
  APPROVED: 'approved',                 // ì¹ì¸(ì´í ëê¸°)
  REJECTED: 'rejected',                 // ë°ë ¤
  COMPLETED: 'completed',               // ì´í ìë£
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
  /** CCR 1ê±´ì ì¬ì¬ ìí ì¡°í (ìì¼ë©´ ê¸°ë³¸ê° = ìí¥íê° ëê¸°) */
  get(ccrId) {
    return loadAll().find((r) => r.ccrId === ccrId) || { ccrId, status: REVIEW_STATUS.PENDING_IMPACT }
  },

  getAll() {
    return loadAll()
  },

  /** ìí¥íê° ìì± ìë£ â ì¹ì¸ ëê¸°ë¡ ì í */
  submitImpact(ccrId) {
    const cur = auth.current()
    return upsert(ccrId, {
      status: REVIEW_STATUS.PENDING_APPROVAL,
      requestedByEmail: cur?.email || null,
      requestedByName: cur?.name || cur?.email || null,
      requestedAt: new Date().toISOString(),
    })
  },

  /** ì¹ì¸ â ì¹ì¸ìë í­ì íì¬ ë¡ê·¸ì¸ ì¬ì©ì (ìê¸° ìë ¥ ë¶ê°) */
  approve(ccrId, note) {
    const cur = auth.current()
    return upsert(ccrId, {
      status: REVIEW_STATUS.APPROVED,
      approvedBy: cur?.name || 'unknown',
      approvedAt: new Date().toISOString(),
      approvalNote: note || '',
    })
  },

  /** ë°ë ¤ */
  reject(ccrId, note) {
    const cur = auth.current()
    return upsert(ccrId, {
      status: REVIEW_STATUS.REJECTED,
      rejectedBy: cur?.name || 'unknown',
      rejectedAt: new Date().toISOString(),
      rejectionNote: note || '',
    })
  },

  /** ë°ë ¤ í ì¬ìì± ìì²­ â ìí¥íê° ë¨ê³ë¡ ëëë¦¼ */
  reopen(ccrId) {
    return upsert(ccrId, { status: REVIEW_STATUS.PENDING_IMPACT })
  },

  /** ì´í ìë£ â ìë£ì¼ì í­ì í´ë¦­ ìì  ìë ê¸°ë¡ (ìê¸° ìë ¥ ë¶ê°) */
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
