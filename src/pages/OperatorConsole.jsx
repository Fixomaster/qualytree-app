// src/pages/OperatorConsole.jsx
// Stage 3/4 — 운영자 콘솔 (가입 요청 승인/거절)
// 안전 원칙:
//  - 모든 DB 호출은 RPC 우회 (RLS 함정 회피)
//  - 모든 에러는 문자열로 state에 저장 (React error #31 차단)
//  - 운영자 권한 검증 실패 시 로그인 화면으로 fallback

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../lib/auth'
import { supabase, isPlatformOperator } from '../lib/supabase'

export default function OperatorConsole() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')
  const [isOperator, setIsOperator] = useState(false)
  const [requests, setRequests] = useState([])
  const [filter, setFilter] = useState('pending')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [notes, setNotes] = useState('')

  // 로그인 폼 (이메일+비밀번호)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [signingIn, setSigningIn] = useState(false)

  // ── 초기 진입: 운영자 권한 확인 ─────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const op = await isPlatformOperator()
        if (op === true) {
          setIsOperator(true)
          await loadRequests(filter)
        } else {
          setIsOperator(false)
        }
      } catch (e) {
        console.warn('[operator] auth check soft-failed:', String(e?.message || e))
        setIsOperator(false)
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadRequests = async (statusFilter) => {
    try {
      const { data, error } = await supabase.rpc('list_signup_requests', {
        p_status: statusFilter || null,
      })
      if (error) {
        setAuthError(typeof error.message === 'string' ? error.message : '조회 실패')
        setRequests([])
        return
      }
      setRequests(Array.isArray(data) ? data : [])
      setAuthError('')
    } catch (e) {
      setAuthError(String(e?.message || e) || '조회 실패')
      setRequests([])
    }
  }

  // ── 운영자 로그인 ──────────────────────────────────────
  const handleSignIn = async (e) => {
    e?.preventDefault?.()
    if (!email.trim() || !password) {
      setAuthError('이메일과 비밀번호를 입력해주세요.')
      return
    }
    setSigningIn(true)
    setAuthError('')

    const result = await auth.signInWithPassword(email.trim().toLowerCase(), password)

    if (!result.ok) {
      setSigningIn(false)
      setAuthError(typeof result.error === 'string' ? result.error : '로그인 실패')
      return
    }

    // 로그인 후 운영자 권한 재검증
    try {
      const op = await isPlatformOperator()
      if (op === true) {
        setIsOperator(true)
        await loadRequests(filter)
      } else {
        setAuthError('운영자 권한이 없는 계정입니다.')
        auth.signOut()
      }
    } catch (e) {
      setAuthError('권한 확인 실패: ' + String(e?.message || e))
    } finally {
      setSigningIn(false)
    }
  }

  // ── 필터 변경 ─────────────────────────────────────────
  const handleFilterChange = async (newFilter) => {
    setFilter(newFilter)
    setSelectedRequest(null)
    setActionError('')
    setActionSuccess(null)
    await loadRequests(newFilter)
  }

  // ── 승인 ────────────────────────────────────────────
  const handleApprove = async () => {
    if (!selectedRequest) return
    setActionLoading(true)
    setActionError('')
    setActionSuccess(null)

    try {
      const { data, error } = await supabase.rpc('process_signup_request', {
        p_request_id: selectedRequest.id,
        p_action: 'approve',
        p_rejection_reason: null,
        p_notes: notes || null,
      })
      if (error) {
        setActionError(typeof error.message === 'string' ? error.message : '승인 실패')
        return
      }
      let account = null
      try {
        const prov = await supabase.rpc('provision_company_manager', { p_request_id: selectedRequest.id })
        account = prov.error
          ? { error: typeof prov.error.message === 'string' ? prov.error.message : '계정 생성 실패' }
          : prov.data
      } catch (e2) {
        account = { error: String(e2?.message || e2) }
      }
      setActionSuccess({ ...(data && typeof data === 'object' ? data : {}), ok: true, action: 'approve', account })
      await loadRequests(filter)
    } catch (e) {
      setActionError(String(e?.message || e))
    } finally {
      setActionLoading(false)
    }
  }

  // ── 거절 ────────────────────────────────────────────
  const handleReject = async () => {
    if (!selectedRequest) return
    if (!rejectionReason.trim()) {
      setActionError('거절 사유를 입력해주세요.')
      return
    }
    setActionLoading(true)
    setActionError('')
    setActionSuccess(null)

    try {
      const { data, error } = await supabase.rpc('process_signup_request', {
        p_request_id: selectedRequest.id,
        p_action: 'reject',
        p_rejection_reason: rejectionReason.trim(),
        p_notes: notes || null,
      })
      if (error) {
        setActionError(typeof error.message === 'string' ? error.message : '거절 실패')
        return
      }
      setActionSuccess(data || { ok: true, action: 'reject' })
      await loadRequests(filter)
    } catch (e) {
      setActionError(String(e?.message || e))
    } finally {
      setActionLoading(false)
    }
  }

  const handleSignOut = () => {
    auth.signOut()
    setIsOperator(false)
    setRequests([])
    setSelectedRequest(null)
    setEmail('')
    setPassword('')
  }

  // ──────────────────────────────────────────────────────
  // 렌더링
  // ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={styles.center}>
        <div style={styles.spinner}>확인 중...</div>
      </div>
    )
  }

  // 운영자 아님 → 로그인 폼
  if (!isOperator) {
    return (
      <div style={styles.center}>
        <div style={styles.loginCard}>
          <div style={styles.brand}>Qualytree</div>
          <div style={styles.subtitle}>운영자 콘솔</div>

          {authError && <div style={styles.error}>{authError}</div>}

          <div style={styles.form}>
            <input
              type="email"
              placeholder="운영자 이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              autoFocus
            />
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
              style={styles.input}
            />
            <button
              onClick={handleSignIn}
              disabled={signingIn}
              style={styles.primaryButton}
            >
              {signingIn ? '확인 중...' : '로그인'}
            </button>
            <button onClick={() => navigate('/login')} style={styles.linkButton}>
              ← 일반 로그인으로
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 운영자 화면
  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.brand}>Qualytree · 운영자 콘솔</div>
          <div style={styles.subtitle}>가입 요청 관리</div>
        </div>
        <button onClick={handleSignOut} style={styles.linkButton}>로그아웃</button>
      </div>

      <div style={styles.toolbar}>
        <div style={styles.filterRow}>
          {[
            { code: 'pending',  label: '대기 중' },
            { code: 'approved', label: '승인됨' },
            { code: 'rejected', label: '거절됨' },
            { code: '',         label: '전체' },
          ].map((f) => (
            <button
              key={f.code || 'all'}
              onClick={() => handleFilterChange(f.code)}
              style={{
                ...styles.filterButton,
                ...(filter === f.code ? styles.filterButtonActive : {}),
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div style={styles.count}>{requests.length}건</div>
      </div>

      {authError && <div style={styles.error}>{authError}</div>}

      <div style={styles.layout}>
        {/* 좌측: 요청 목록 */}
        <div style={styles.listColumn}>
          {requests.length === 0 ? (
            <div style={styles.empty}>해당 상태의 요청이 없습니다.</div>
          ) : (
            requests.map((r) => (
              <div
                key={r.id}
                onClick={() => {
                  setSelectedRequest(r)
                  setActionError('')
                  setActionSuccess(null)
                  setRejectionReason('')
                  setNotes('')
                }}
                style={{
                  ...styles.listItem,
                  ...(selectedRequest?.id === r.id ? styles.listItemActive : {}),
                }}
              >
                <div style={styles.listCompany}>{r.company_name}</div>
                <div style={styles.listMeta}>
                  {r.admin_email} · {r.desired_plan} · {r.employee_count_band}
                </div>
                <div style={styles.listMeta}>
                  <StatusBadge status={r.status} />
                  <span style={{ marginLeft: 8, color: '#a8a29e' }}>
                    {formatDate(r.created_at)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 우측: 상세 + 액션 */}
        <div style={styles.detailColumn}>
          {!selectedRequest ? (
            <div style={styles.detailEmpty}>좌측에서 요청을 선택하세요.</div>
          ) : (
            <div>
              <h2 style={styles.detailTitle}>{selectedRequest.company_name}</h2>

              <div style={styles.detailGrid}>
                <DetailRow label="상태"   value={<StatusBadge status={selectedRequest.status} />} />
                <DetailRow label="신청일" value={formatDate(selectedRequest.created_at)} />
                <DetailRow label="사업자번호"    value={selectedRequest.business_number || '-'} />
                <DetailRow label="대표자"        value={selectedRequest.representative || '-'} />
                <DetailRow label="업종"          value={selectedRequest.industry || '-'} />
                <DetailRow label="직원 수 구간"  value={selectedRequest.employee_count_band} />
                <DetailRow label="희망 플랜"     value={selectedRequest.desired_plan} />
                <DetailRow label="결제 주기"     value={selectedRequest.desired_billing_cycle} />
                <DetailRow label="희망 인증"     value={(selectedRequest.desired_certifications || []).join(', ')} />
                <DetailRow label="관리자 이메일" value={selectedRequest.admin_email} />
                <DetailRow label="관리자 이름"   value={selectedRequest.admin_name} />
                <DetailRow label="관리자 연락처" value={selectedRequest.admin_phone || '-'} />
                {selectedRequest.rejection_reason && (
                  <DetailRow label="거절 사유" value={selectedRequest.rejection_reason} />
                )}
                {selectedRequest.notes && (
                  <DetailRow label="비고" value={selectedRequest.notes} />
                )}
              </div>

              {actionError && <div style={styles.error}>{actionError}</div>}

              {actionSuccess && (
                <div style={{ marginTop: 16, padding: 16, borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontWeight: 700, color: '#166534', marginBottom: 8 }}>
                    {actionSuccess.action === 'approve' ? '✓ 승인 완료' : '✓ 거절 처리 완료'}
                  </div>
                  {actionSuccess.action === 'approve' && actionSuccess.account && !actionSuccess.account.error && (
                    <div style={{ fontSize: 13, color: '#14532d', lineHeight: 1.7 }}>
                      <div>매니저(관리자) 로그인 계정이 생성되었습니다. 아래 정보를 신청자에게 전달하세요.</div>
                      <div style={{ marginTop: 8, padding: 10, background: '#ffffff', borderRadius: 8, border: '1px solid #d1fae5' }}>
                        <div>아이디(이메일): <code style={{ fontWeight: 700 }}>{actionSuccess.account.email}</code></div>
                        <div>임시 비밀번호: <code style={{ fontWeight: 700 }}>{actionSuccess.account.temp_password}</code></div>
                      </div>
                      <div style={{ marginTop: 6, color: '#15803d' }}>최초 로그인 후 비밀번호를 변경하도록 안내하세요.</div>
                    </div>
                  )}
                  {actionSuccess.action === 'approve' && actionSuccess.account && actionSuccess.account.error && (
                    <div style={{ fontSize: 13, color: '#b91c1c' }}>
                      회사 승인은 완료됐지만 로그인 계정 생성에 실패했습니다: {actionSuccess.account.error}
                    </div>
                  )}
                  {actionSuccess.action === 'reject' && (
                    <div style={{ fontSize: 13, color: '#14532d' }}>거절 사유가 기록되었습니다.</div>
                  )}
                </div>
              )}

              {selectedRequest.status === 'pending' && !actionSuccess && (
                <div style={styles.actionBox}>
                  <Field label="비고 (선택)">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      style={styles.textarea}
                    />
                  </Field>

                  <Field label="거절 사유 (거절 시 필수)">
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={2}
                      placeholder="거절 시에만 작성"
                      style={styles.textarea}
                    />
                  </Field>

                  <div style={styles.actionRow}>
                    <button
                      onClick={handleReject}
                      disabled={actionLoading}
                      style={styles.rejectButton}
                    >
                      {actionLoading ? '...' : '거절'}
                    </button>
                    <button
                      onClick={handleApprove}
                      disabled={actionLoading}
                      style={styles.approveButton}
                    >
                      {actionLoading ? '...' : '승인'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const styleMap = {
    pending:  { bg: '#fef3c7', fg: '#92400e', label: '대기 중' },
    approved: { bg: '#dcfce7', fg: '#166534', label: '승인됨' },
    rejected: { bg: '#fee2e2', fg: '#991b1b', label: '거절됨' },
  }
  const s = styleMap[status] || { bg: '#f5f5f4', fg: '#57534e', label: status }
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      background: s.bg, color: s.fg,
      fontSize: 11, fontWeight: 600,
      borderRadius: 4,
    }}>
      {s.label}
    </span>
  )
}

function DetailRow({ label, value }) {
  return (
    <div style={styles.detailRow}>
      <div style={styles.detailLabel}>{label}</div>
      <div style={styles.detailValue}>{value}</div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: '#57534e', marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  )
}

function formatDate(iso) {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    return d.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

const styles = {
  page: {
    minHeight: '100vh', background: '#fafaf9',
    fontFamily: 'Pretendard, -apple-system, sans-serif',
  },
  center: {
    minHeight: '100vh', background: '#f5f5f4',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'Pretendard, -apple-system, sans-serif',
  },
  spinner: { color: '#78716c', fontSize: 14 },
  loginCard: {
    width: '100%', maxWidth: 400, background: '#fff',
    borderRadius: 16, padding: '40px 36px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
    textAlign: 'center',
  },
  brand: {
    fontFamily: 'Fraunces, serif',
    fontSize: 24, fontWeight: 600, color: '#1c1917',
    letterSpacing: '-0.02em',
  },
  subtitle: { fontSize: 13, color: '#78716c', marginTop: 4, marginBottom: 24 },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: {
    padding: '10px 12px', border: '1px solid #d6d3d1',
    borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none',
  },
  primaryButton: {
    padding: '10px 20px', background: '#1c1917', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500,
    cursor: 'pointer', marginTop: 4,
  },
  linkButton: {
    padding: '10px 16px', background: 'transparent', color: '#78716c',
    border: 'none', fontSize: 13, cursor: 'pointer',
  },
  error: {
    padding: '10px 14px', background: '#fef2f2', color: '#991b1b',
    borderRadius: 8, fontSize: 13, marginBottom: 12,
    border: '1px solid #fecaca', textAlign: 'left',
  },
  success: {
    padding: '14px 16px', background: '#f0fdf4', color: '#166534',
    borderRadius: 8, fontSize: 13, marginTop: 16,
    border: '1px solid #bbf7d0',
  },
  successTitle: { fontWeight: 600, marginBottom: 6 },
  successBody: { fontSize: 12, lineHeight: 1.6 },
  header: {
    background: '#fff', borderBottom: '1px solid #e7e5e4',
    padding: '20px 32px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  toolbar: {
    padding: '16px 32px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: '#fafaf9',
  },
  filterRow: { display: 'flex', gap: 4 },
  filterButton: {
    padding: '6px 12px', background: 'transparent', color: '#57534e',
    border: '1px solid transparent', borderRadius: 6,
    fontSize: 13, cursor: 'pointer',
  },
  filterButtonActive: {
    background: '#1c1917', color: '#fff',
  },
  count: { fontSize: 12, color: '#78716c' },
  layout: {
    display: 'grid', gridTemplateColumns: '380px 1fr',
    gap: 24, padding: '0 32px 32px',
  },
  listColumn: {
    display: 'flex', flexDirection: 'column', gap: 8,
    maxHeight: 'calc(100vh - 200px)', overflowY: 'auto',
  },
  listItem: {
    padding: 14, background: '#fff', borderRadius: 10,
    border: '1px solid #e7e5e4', cursor: 'pointer',
    transition: 'all 0.15s',
  },
  listItemActive: {
    borderColor: '#1c1917', boxShadow: '0 0 0 1px #1c1917',
  },
  listCompany: { fontSize: 14, fontWeight: 600, color: '#1c1917' },
  listMeta: { fontSize: 12, color: '#78716c', marginTop: 4 },
  empty: { padding: 32, textAlign: 'center', color: '#a8a29e', fontSize: 13 },
  detailColumn: {
    background: '#fff', borderRadius: 12,
    border: '1px solid #e7e5e4', padding: 24,
    minHeight: 400,
  },
  detailEmpty: {
    padding: 60, textAlign: 'center', color: '#a8a29e', fontSize: 13,
  },
  detailTitle: {
    fontSize: 20, fontWeight: 600, color: '#1c1917',
    marginTop: 0, marginBottom: 16,
  },
  detailGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px',
    marginBottom: 16,
  },
  detailRow: { display: 'flex', flexDirection: 'column', gap: 2 },
  detailLabel: { fontSize: 11, color: '#a8a29e' },
  detailValue: { fontSize: 13, color: '#1c1917', wordBreak: 'break-all' },
  actionBox: {
    marginTop: 20, paddingTop: 20, borderTop: '1px solid #e7e5e4',
  },
  textarea: {
    width: '100%', padding: '8px 10px',
    border: '1px solid #d6d3d1', borderRadius: 6,
    fontSize: 13, fontFamily: 'inherit', outline: 'none',
    resize: 'vertical', boxSizing: 'border-box',
  },
  actionRow: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 },
  approveButton: {
    padding: '8px 20px', background: '#15803d', color: '#fff',
    border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500,
    cursor: 'pointer',
  },
  rejectButton: {
    padding: '8px 20px', background: '#fff', color: '#991b1b',
    border: '1px solid #fecaca', borderRadius: 6, fontSize: 13, fontWeight: 500,
    cursor: 'pointer',
  },
}
