import { useState, useCallback } from 'react'
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'

const STORAGE_KEY = 'qt_approvals'
export const SETTINGS_KEY = 'qt_approval_hubs'

export function isApprovalEnabled(hubName) {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '[]')
    return Array.isArray(s) && s.includes(hubName)
  } catch { return false }
}

const STATUS_MAP = {
  draft:    { label: '초안',    color: 'text-gray-500',   bg: 'bg-gray-100',  Icon: AlertCircle },
  pending:  { label: '검토 중', color: 'text-yellow-600', bg: 'bg-yellow-50', Icon: Clock },
  approved: { label: '승인됨',  color: 'text-green-600',  bg: 'bg-green-50',  Icon: CheckCircle },
  rejected: { label: '반려됨',  color: 'text-red-500',    bg: 'bg-red-50',    Icon: XCircle },
}

export default function ApprovalWidget({ recordId, currentUser, onStatusChange }) {
  const load = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} } }
  const [data, setData] = useState(load)
  const rec = data[recordId] || { status: 'draft', history: [] }

  const save = useCallback((next) => {
    const nd = { ...data, [recordId]: next }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nd))
    setData(nd)
    onStatusChange?.(next.status)
  }, [data, recordId, onStatusChange])

  const isManager = currentUser?.isCompanyAdmin || (currentUser?.level ?? 0) >= 3
  const who = currentUser?.email || '사용자'
  const now = () => new Date().toLocaleString('ko-KR')
  const log = (action, status) => ({ status, history: [...rec.history, { action, by: who, at: now() }] })
  const info = STATUS_MAP[rec.status] || STATUS_MAP.draft

  return (
    <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-white">
      <div className="flex items-center justify-between">
        <span className={'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ' + info.bg + ' ' + info.color}>
          <info.Icon size={11}/>{info.label}
        </span>
        <div className="flex gap-1.5">
          {rec.status === 'draft' && (
            <button onClick={() => save(log('검토 요청', 'pending'))}
              className="px-2.5 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">검토 요청</button>
          )}
          {rec.status === 'pending' && isManager && (<>
            <button onClick={() => save(log('승인', 'approved'))}
              className="px-2.5 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">승인</button>
            <button onClick={() => save(log('반려', 'rejected'))}
              className="px-2.5 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600">반려</button>
          </>)}
          {['approved','rejected'].includes(rec.status) && isManager && (
            <button onClick={() => save(log('초안으로', 'draft'))}
              className="px-2.5 py-1 text-xs border border-slate-300 text-slate-600 rounded hover:bg-slate-50">초안으로</button>
          )}
        </div>
      </div>
      {rec.history.length > 0 && (
        <div className="text-xs text-slate-400 border-t border-slate-100 pt-1.5 space-y-0.5">
          {rec.history.slice(-3).map((h,i) => (
            <div key={i}><b className="text-slate-600">{h.action}</b> · {h.by} · {h.at}</div>
          ))}
        </div>
      )}
    </div>
  )
}