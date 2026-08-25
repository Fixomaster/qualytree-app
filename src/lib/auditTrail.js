import { supabase } from './supabase'

/**
 * 감사 추적 (Audit Trail)
 * ISO 13485 §4.2.5 / 식약처 전자문서 기준
 * - 변경 불가 로그: INSERT 전용 (UPDATE/DELETE 없음)
 */

/**
 * 감사 로그 작성
 * @param {object} p
 * @param {string} p.action       - APPROVE | REJECT | SUBMIT | CREATE | UPDATE | DELETE | SIGN
 * @param {string} p.entityType   - 엔터티 유형 (예: 'approval', 'capa', 'ncr')
 * @param {string} p.entityId     - 레코드 ID
 * @param {string} p.companyId    - 회사 ID
 * @param {object} [p.before]     - 변경 전 데이터
 * @param {object} [p.after]      - 변경 후 데이터
 * @param {string} [p.signReason] - 전자서명 사유 (승인/반려 시 필수)
 */
export async function logAudit({ action, entityType, entityId, companyId, before = null, after = null, signReason = null }) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !companyId) return

    const { error } = await supabase.from('audit_logs').insert({
      company_id: String(companyId),
      user_id: user.id,
      user_email: user.email,
      user_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
      action,
      entity_type: entityType,
      entity_id: String(entityId),
      before_data: before,
      after_data: after,
      sign_reason: signReason || null,
    })
    if (error) console.warn('[auditTrail]', error.message)
  } catch (e) {
    console.warn('[auditTrail] logAudit failed:', e?.message)
  }
}

/**
 * 감사 로그 조회
 */
export async function getAuditLogs({ companyId, entityType = null, entityId = null, limit = 100 }) {
  try {
    let q = supabase.from('audit_logs')
      .select('*')
      .eq('company_id', String(companyId))
      .order('created_at', { ascending: false })
      .limit(limit)
    if (entityType) q = q.eq('entity_type', entityType)
    if (entityId) q = q.eq('entity_id', String(entityId))
    const { data, error } = await q
    if (error) throw error
    return data || []
  } catch (e) {
    console.warn('[auditTrail] getAuditLogs failed:', e?.message)
    return []
  }
}
