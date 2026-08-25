import { useState, useCallback, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, AlertCircle, Lock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { logAudit } from '../lib/auditTrail'

const STORAGE_KEY = 'qt_approvals'
export const SETTINGS_KEY = 'qt_approval_hubs'

export function isApprovalEnabled(hubName) {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')
    return !!s[hubName]
  } catch { return false }
}

const STATUS_MAP = {
  draft:    { label: '초안',    color: 'text-slate-500',   bg: 'bg-slate-50',   icon: AlertCircle },
  pending:  { label: '검토 중', color: 'text-amber-600',   bg: 'bg-amber-50',   icon: Clock },
  approved: { label: '승인됨',  color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
  rejected: { label: '반려됨',  color: 'text-red-600',     bg: 'bg-red-50',     icon: XCircle },
}

export default function ApprovalWidget({ recordId, currentUser, onStatusChange }) {
  const [rec, setRec] = useState({ status: 'draft', history: [] })
  const [loading, setLoading] = useState(false)
  const [signModal, setSignModal] = useState(null)
  const [signReason, setSignReason] = useState('')

  const companyId = currentUser?.company_id || currentUser?.companyId

  // Load: Supabase 우선, localStorage 폴백
  useEffect(() => {
    if (!recordId) return
    let cancelled = false
    async function load() {
      if (companyId) {
        try {
          const { data } = await supabase
            .from('approvals')
            .select('status, history')
            .eq('company_id', String(companyId))
            .eq('record_id', recordId)
            .maybeSingle()
          if (!cancelled && data) {
            setRec({ status: data.status, history: data.history || [] })
            return
          }
        } catch {}
      }
      try {
        const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
        if (!cancelled && all[recordId]) setRec(all[recordId])
      } catch {}
    }
    load()
    return () => { cancelled = true }
  }, [recordId, companyId])

  const save = useCallback(async (nextStatus, reason = '') => {
    setLoading(true)
    const who = currentUser?.name || currentUser?.displayName || currentUser?.full_name || currentUser?.email || '사용자'
    const newHistory = [...rec.history, {
      action: nextStatus,
      by: who,
      byEmail: currentUser?.email,
      at: new Date().toLocaleString('ko-KR'),
      reason: reason || undefined,
    }]
    const updated = { status: nextStatus, history: newHistory }

    // Supabase 저장
    if (companyId) {
      try {
        await supabase.from('approvals').upsert({
          company_id: String(companyId),
          record_id: recordId,
          status: nextStatus,
          history: newHistory,
          signed_at: ['approved','rejected'].includes(nextStatus) ? new Date().toISOString() : null,
          signed_by_email: currentUser?.email,
          signed_by_name: who,
          sign_reason: reason || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'company_id,record_id' })

        // 감사 추적 로그
        await logAudit({
          action: nextStatus.toUpperCase(),
          entityType: 'approval',
          entityId: recordId,
          companyId: String(companyId),
          before: rec,
          after: updated,
          signReason: reason || null,
        })
      } catch (e) {
        console.warn('[ApprovalWidget] supabase save failed:', e?.message)
      }
    }

    // localStorage 백업
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      all[recordId] = updated
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
    } catch {}

    setRec(updated)
    setLoading(false)
    onStatusChange?.(nextStatus)
  }, [rec, recordId, companyId, currentUser, onStatusChange])

  const openSignModal = (nextStatus) => {
    setSignReason('')
    setSignModal(nextStatus)
  }

  const confirmSign = async () => {
    if (!signReason.trim()) return
    await save(signModal, signReason.trim())
    setSignModal(null)
    setSignReason('')
  }

  const isManager = currentUser?.isCompanyAdmin || (currentUser?.level ?? 0) >= 3
  const info = STATUS_MAP[rec.status] || STATUS_MAP.draft
  const Icon = info.icon
  const isLocked = rec.status === 'approved'

  return (
    <div className="border rounded-lg p-4 space-y-3 text-sm">
      {/* 현재 상태 */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-md ${info.bg}`}>
        <Icon size={16} className={info.color} />
        <span className={`font-medium ${info.color}`}>{info.label}</span>
        {isLocked && <Lock size={12} className="text-emerald-500 ml-1" title="승인 완료 — 변경 불가" />}
      </div>

      {/* 액션 버튼 */}
      {!isLocked && (
        <div className="flex gap-2 flex-wrap">
          {rec.status === 'draft' && (
            <button
              disabled={loading}
              onClick={() => save('pending')}
              className="px-3 py-1.5 rounded bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-50 text-xs"
            >검토 요청</button>
          )}
          {rec.status === 'pending' && isManager && (
            <>
              <button
                disabled={loading}
                onClick={() => openSignModal('approved')}
                className="px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 text-xs"
              >승인 (전자서명)</button>
              <button
                disabled={loading}
                onClick={() => openSignModal('rejected')}
                className="px-3 py-1.5 rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 text-xs"
              >반려 (전자서명)</button>
            </>
          )}
          {rec.status === 'rejected' && (
            <button
              disabled={loading}
              onClick={() => save('draft')}
              className="px-3 py-1.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 text-xs"
            >이의신청 / 재초안</button>
          )}
        </div>
      )}

      {/* 서명·이력 */}
      {rec.history.length > 0 && (
        <div className="space-y-1 border-t pt-2">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">서명 이력</p>
          {rec.history.map((h, i) => (
            <div key={i} className="text-xs text-slate-500 flex flex-wrap gap-1">
              <span className="font-medium text-slate-700">{STATUS_MAP[h.action]?.label || h.action}</span>
              <span>—</span>
              <span>{h.by}</span>
              <span className="text-slate-400">{h.at}</span>
              {h.reason && <span className="italic text-slate-600">"{h.reason}"</span>}
            </div>
          ))}
        </div>
      )}

      {/* 전자서명 모달 — 식약처 기준: 서명 사유 필수 입력 */}
      {signModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80 space-y-4">
            <h3 className="font-semibold text-slate-800">
              전자서명 — {signModal === 'approved' ? '승인' : '반려'}
            </h3>
            <p className="text-xs text-slate-500">
              식약처 전자문서 관리 기준 제17조에 따라 서명 사유를 입력해야 합니다.
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                서명 사유 <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={signReason}
                onChange={e => setSignReason(e.target.value)}
                placeholder="예: 기술 검토 완료 및 적합 판정"
                className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
              />
            </div>
            <div className="text-xs text-slate-400 space-y-0.5">
              <div>서명자: <span className="text-slate-600">{currentUser?.email}</span></div>
              <div>일시: <span className="text-slate-600">{new Date().toLocaleString('ko-KR')}</span></div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setSignModal(null)}
                className="px-3 py-1.5 rounded text-sm text-slate-600 hover:bg-slate-100"
              >취소</button>
              <button
                disabled={!signReason.trim() || loading}
                onClick={confirmSign}
                className="px-4 py-1.5 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50"
              >{loading ? '처리 중…' : signModal === 'approved' ? '승인 서명' : '반려 서명'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
