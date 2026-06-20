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
  const [operators, setOperators] = useState([])
  const [opForm, setOpForm] = useState({ email: '', name: '', password: '' })
  const [opMsg, setOpMsg] = useState('')
  const [opBusy, setOpBusy] = useState(false)
  const [mustChange, setMustChange] = useState(false)
  const [mustChecked, setMustChecked] = useState(false)
  const [stats, setStats] = useState(null)
  const [statsView, setStatsView] = useState('month')
  const [newPw, setNewPw] = useState('')
  const [newPw2, setNewPw2] = useState('')
  const [pwBusy, setPwBusy] = useState(false)

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

  const inp = { width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 11px', fontSize: 13 }
  const loadOperators = async () => {
    try { const { data } = await supabase.rpc('list_platform_operators'); setOperators(Array.isArray(data) ? data : []) } catch { setOperators([]) }
  }
  const checkMustChange = async () => {
    try { const { data } = await supabase.rpc('my_operator_must_change'); setMustChange(data === true) } catch { setMustChange(false) } finally { setMustChecked(true) }
  }
  const createOperator = async (e) => {
    e?.preventDefault?.()
    setOpBusy(true); setOpMsg('')
    const { error } = await supabase.rpc('create_platform_operator', { p_email: opForm.email.trim().toLowerCase(), p_password: opForm.password, p_name: opForm.name.trim() || null })
    if (error) setOpMsg(typeof error.message === 'string' ? error.message : '추가 실패')
    else { setOpMsg('운영자가 추가되었습니다. 본인에게 이메일·임시비밀번호를 전달하세요. 첫 로그인 시 비밀번호 변경이 요구됩니다.'); setOpForm({ email: '', name: '', password: '' }); await loadOperators() }
    setOpBusy(false)
  }
  const deleteOperator = async (id) => {
    setOpBusy(true); setOpMsg('')
    const { error } = await supabase.rpc('delete_platform_operator', { p_id: id })
    if (error) setOpMsg(typeof error.message === 'string' ? error.message : '삭제 실패')
    else await loadOperators()
    setOpBusy(false)
  }
  const changeMyPassword = async (e) => {
    e?.preventDefault?.()
    if (!newPw || newPw.length < 6) { setOpMsg('새 비밀번호는 6자 이상이어야 합니다.'); return }
    if (newPw !== newPw2) { setOpMsg('두 비밀번호가 일치하지 않습니다.'); return }
    setPwBusy(true); setOpMsg('')
    const { error } = await supabase.auth.updateUser({ password: newPw })
    if (error) { setOpMsg(typeof error.message === 'string' ? error.message : '변경 실패'); setPwBusy(false); return }
    try { await supabase.rpc('clear_operator_pw_flag') } catch { /* */ }
    setMustChange(false); setNewPw(''); setNewPw2(''); setPwBusy(false)
  }
  useEffect(() => { if (isOperator) { loadOperators(); checkMustChange(); loadStats() } /* eslint-disable-next-line */ }, [isOperator])

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
  const loadStats = async () => {
    try { const { data } = await supabase.rpc('signup_request_stats'); setStats(data || null) } catch { setStats(null) }
  }
  const handleDeleteRequest = async (r) => {
    if (!r) return
    if (!window.confirm('이 도입신청서를 영구 삭제할까요? 되돌릴 수 없습니다.')) return
    setActionLoading(true); setActionError('')
    const { error } = await supabase.rpc('delete_signup_request', { p_id: r.id })
    setActionLoading(false)
    if (error) { setActionError(typeof error.message === 'string' ? error.message : '삭제 실패'); return }
    setSelectedRequest(null); loadRequests(filter); loadStats()
  }
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
      try {
        if (account && account.email && account.temp_password) {
          await supabase.functions.invoke('send-email', { body: {
            to: account.email,
            subject: '[Qualytree] 가입 승인 안내',
            html: '<p>' + (selectedRequest.company_name || '') + ' 담당자님, 가입이 승인되었습니다.</p>'
              + '<p>아이디(이메일): <b>' + account.email + '</b><br/>임시 비밀번호: <b>' + account.temp_password + '</b></p>'
              + '<p>로그인 후 비밀번호를 변경해 주세요.</p>',
          } })
        }
      } catch (e3) { /* 이메일 발송 실패는 승인에 영향 없음 */ }
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
      try {
        if (selectedRequest.admin_email) {
          await supabase.functions.invoke('send-email', { body: {
            to: selectedRequest.admin_email,
            subject: '[Qualytree] 가입 신청 결과 안내',
            html: '<p>' + (selectedRequest.company_name || '') + ' 담당자님, 가입 신청이 반려되었습니다.</p>'
              + '<p>사유: ' + (rejectionReason || '') + '</p>'
              + '<p>문의사항은 본 메일에 회신해 주세요.</p>',
          } })
        }
      } catch (e3) { /* 이메일 발송 실패는 처리에 영향 없음 */ }
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
  if (isOperator && !mustChecked) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f8fafc', color: '#64748b', fontSize: 14 }}>확인 중…</div>
    )
  }
  if (mustChange) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f8fafc', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 380, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 24 }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: '#0f172a' }}>Qualytree</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>첫 로그인 — 비밀번호 변경</div>
          <p style={{ fontSize: 13, color: '#475569', margin: '10px 0 14px' }}>보안을 위해 임시 비밀번호를 새 비밀번호로 변경해 주세요.</p>
          <form onSubmit={changeMyPassword}>
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="새 비밀번호 (6자 이상)" style={inp} />
            <input type="password" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} placeholder="새 비밀번호 확인" style={{ ...inp, marginTop: 8 }} />
            {opMsg && <div style={{ fontSize: 12.5, color: '#b91c1c', marginTop: 8 }}>{opMsg}</div>}
            <button type="submit" disabled={pwBusy} style={{ width: '100%', marginTop: 12, background: '#059669', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{pwBusy ? '변경 중…' : '비밀번호 변경'}</button>
          </form>
          <button onClick={handleSignOut} style={{ marginTop: 12, background: 'none', border: 'none', color: '#64748b', fontSize: 12.5, cursor: 'pointer' }}>로그아웃</button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.brand}>Qualytree · 운영자 콘솔</div>
          <div style={styles.subtitle}>가입 요청 관리</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => navigate('/preview')} style={styles.linkButton}>페이지 미리보기 →</button>
          <button onClick={handleSignOut} style={styles.linkButton}>로그아웃</button>
        </div>
      </div>
        {/* 운영자 관리 */}
        <div style={{ maxWidth: 1100, margin: '0 auto 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>운영자 관리</div>
          <form onSubmit={createOperator} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
            <label style={{ fontSize: 12, color: '#475569' }}>이메일<input type="email" required value={opForm.email} onChange={(e) => setOpForm({ ...opForm, email: e.target.value })} placeholder="operator@company.com" style={inp} /></label>
            <label style={{ fontSize: 12, color: '#475569' }}>이름<input type="text" value={opForm.name} onChange={(e) => setOpForm({ ...opForm, name: e.target.value })} placeholder="홍길동" style={inp} /></label>
            <label style={{ fontSize: 12, color: '#475569' }}>임시 비밀번호<input type="text" required value={opForm.password} onChange={(e) => setOpForm({ ...opForm, password: e.target.value })} placeholder="6자 이상" style={inp} /></label>
            <button type="submit" disabled={opBusy} style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>운영자 추가</button>
          </form>
          {opMsg && <div style={{ fontSize: 12.5, color: '#475569', marginTop: 8 }}>{opMsg}</div>}
          <div style={{ marginTop: 12, borderTop: '1px solid #f1f5f9' }}>
            {operators.map((op) => (
              <div key={op.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                <span style={{ color: '#0f172a' }}>{op.name || '—'} · {op.email} {op.must_change_password && <span style={{ color: '#b45309', fontSize: 11 }}>(비번변경 대기)</span>}</span>
                <button onClick={() => deleteOperator(op.id)} disabled={opBusy || operators.length <= 1} title={operators.length <= 1 ? '최소 1명은 남겨야 합니다' : '삭제'} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: operators.length <= 1 ? '#cbd5e1' : '#dc2626', cursor: operators.length <= 1 ? 'not-allowed' : 'pointer' }}>삭제</button>
              </div>
            ))}
            {operators.length === 0 && <div style={{ fontSize: 12.5, color: '#94a3b8', padding: '8px 0' }}>운영자 목록을 불러오는 중…</div>}
          </div>
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

      {stats && (
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:16, marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <div style={{ fontWeight:700, color:'#0f172a' }}>도입신청 통계</div>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={() => setStatsView('month')} style={{ padding:'5px 10px', borderRadius:7, fontSize:12, cursor:'pointer', border:'1px solid '+(statsView==='month'?'#1f4d38':'#cbd5e1'), background:statsView==='month'?'#1f4d38':'#fff', color:statsView==='month'?'#fff':'#475569' }}>월간</button>
              <button onClick={() => setStatsView('year')} style={{ padding:'5px 10px', borderRadius:7, fontSize:12, cursor:'pointer', border:'1px solid '+(statsView==='year'?'#1f4d38':'#cbd5e1'), background:statsView==='year'?'#1f4d38':'#fff', color:statsView==='year'?'#fff':'#475569' }}>연간</button>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
            <span style={{ fontSize:12.5, background:'#f1f5f9', borderRadius:999, padding:'4px 10px' }}>전체 {stats.totals?.total||0}</span>
            <span style={{ fontSize:12.5, background:'#f0fdf4', color:'#15803d', borderRadius:999, padding:'4px 10px' }}>승인 {stats.totals?.approved||0}</span>
            <span style={{ fontSize:12.5, background:'#fef2f2', color:'#b91c1c', borderRadius:999, padding:'4px 10px' }}>거절 {stats.totals?.rejected||0}</span>
            <span style={{ fontSize:12.5, background:'#fffbeb', color:'#92600e', borderRadius:999, padding:'4px 10px' }}>대기 {stats.totals?.pending||0}</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'#64748b', marginBottom:6 }}>{statsView==='month'?'월별':'연도별'} 추이</div>
              {((statsView==='month'?stats.monthly:stats.yearly)||[]).map((m) => (
                <div key={m.ym||m.y} style={{ display:'flex', gap:8, fontSize:12.5, padding:'3px 0' }}>
                  <span style={{ width:64, color:'#475569' }}>{m.ym||m.y}</span>
                  <span style={{ flex:1 }}>신청 {m.total} · <span style={{ color:'#15803d' }}>승인 {m.approved}</span> · <span style={{ color:'#b91c1c' }}>거절 {m.rejected}</span></span>
                </div>
              ))}
              {((statsView==='month'?stats.monthly:stats.yearly)||[]).length===0 && <div style={{ fontSize:12.5, color:'#94a3b8' }}>데이터 없음</div>}
            </div>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'#64748b', marginBottom:6 }}>가입 종류 (요금제)</div>
              {(stats.by_plan||[]).map((p) => (
                <div key={p.plan} style={{ display:'flex', fontSize:12.5, padding:'3px 0' }}><span style={{ flex:1, color:'#475569' }}>{p.plan}</span><span style={{ fontWeight:700 }}>{p.cnt}</span></div>
              ))}
              <div style={{ fontSize:12, fontWeight:700, color:'#64748b', margin:'10px 0 6px' }}>결제 주기</div>
              {(stats.by_billing||[]).map((b) => (
                <div key={b.cycle} style={{ display:'flex', fontSize:12.5, padding:'3px 0' }}><span style={{ flex:1, color:'#475569' }}>{b.cycle}</span><span style={{ fontWeight:700 }}>{b.cnt}</span></div>
              ))}
            </div>
          </div>
        </div>
      )}
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
              {selectedRequest && (
                <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid #eee', textAlign:'right' }}>
                  <button onClick={() => handleDeleteRequest(selectedRequest)} disabled={actionLoading} style={{ background:'none', border:'1px solid #fca5a5', color:'#b91c1c', borderRadius:8, padding:'7px 12px', fontSize:12.5, cursor:'pointer' }}>이 신청서 삭제</button>
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
