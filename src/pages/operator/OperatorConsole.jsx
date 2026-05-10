import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Shield, Building2, Inbox, CheckCircle2, XCircle, Clock,
  AlertCircle, Loader2, RefreshCw, LogOut,
} from 'lucide-react'
import Logo from '../../components/Logo'
import { auth } from '../../lib/auth'
import { supabase, isPlatformOperator } from '../../lib/supabase'

const PLAN_LABELS = {
  starter: 'Starter (1~10인)',
  standard: 'Standard (11~30인)',
  professional: 'Professional (31인+)',
  enterprise: 'Enterprise',
}

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function OperatorConsole() {
  const nav = useNavigate()
  const [authChecked, setAuthChecked] = useState(false)
  const [isOp, setIsOp] = useState(false)

  const [tab, setTab] = useState('pending')
  const [requests, setRequests] = useState([])
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionInProgress, setActionInProgress] = useState(null)
  const [error, setError] = useState(null)
  const [confirmReject, setConfirmReject] = useState(null)

  useEffect(() => {
    (async () => {
      const op = await isPlatformOperator()
      setIsOp(op)
      setAuthChecked(true)
      if (!op) {
        setTimeout(() => nav('/dashboard'), 4000)
      }
    })()
  }, [nav])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [reqRes, compRes] = await Promise.all([
        supabase
          .from('signup_requests')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('companies')
          .select('*')
          .order('created_at', { ascending: false }),
      ])
      if (reqRes.error) throw reqRes.error
      if (compRes.error) throw compRes.error
      setRequests(reqRes.data || [])
      setCompanies(compRes.data || [])
    } catch (e) {
      setError(e.message || '데이터 조회 중 오류')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOp) loadData()
  }, [isOp])

  const handleApprove = async (req) => {
    if (!confirm(`'${req.company_name}' 회사를 승인하시겠습니까?\n\n승인 시 회사가 즉시 생성되고, 관리자 계정 초대가 진행됩니다 (다음 단계에서 자동화).`)) return

    setActionInProgress(req.id)
    setError(null)
    try {
      const baseSeats = req.desired_plan === 'starter' ? 5
                      : req.desired_plan === 'standard' ? 10
                      : req.desired_plan === 'professional' ? 20 : 5

      const { data: opRow } = await supabase
        .from('platform_operators').select('id').limit(1).maybeSingle()

      const { data: newCompany, error: cErr } = await supabase
        .from('companies')
        .insert({
          name: req.company_name,
          business_number: req.business_number,
          representative: req.representative,
          industry: req.industry,
          employee_count_band: req.employee_count_band,
          status: 'active',
          plan_code: req.desired_plan,
          billing_cycle: req.desired_billing_cycle || 'monthly',
          base_seats: baseSeats,
          base_certifications: req.desired_certifications || ['KGMP'],
          is_founding_customer: true,
          founding_until: new Date(Date.now() + 1000 * 60 * 60 * 24 * 180).toISOString(),
          approved_at: new Date().toISOString(),
          approved_by: opRow?.id || null,
        })
        .select()
        .single()
      if (cErr) throw cErr

      const { error: rErr } = await supabase
        .from('signup_requests')
        .update({
          status: 'approved',
          processed_at: new Date().toISOString(),
          processed_by: opRow?.id || null,
          company_id: newCompany.id,
        })
        .eq('id', req.id)
      if (rErr) throw rErr

      await loadData()
      alert(`✓ '${req.company_name}' 승인 완료. 회사가 'pending' 상태에서 'active'로 전환됐습니다.\n\n다음 단계 (Step 3-3-D)에서 관리자 자동 초대 + 이메일 발송이 추가될 예정입니다.`)
    } catch (e) {
      setError(e.message || '승인 처리 중 오류')
    } finally {
      setActionInProgress(null)
    }
  }

  const handleReject = async (req, reason) => {
    setActionInProgress(req.id)
    setError(null)
    try {
      const { data: opRow } = await supabase
        .from('platform_operators').select('id').limit(1).maybeSingle()

      const { error: rErr } = await supabase
        .from('signup_requests')
        .update({
          status: 'rejected',
          rejection_reason: reason || '운영팀 검토 결과 반려',
          processed_at: new Date().toISOString(),
          processed_by: opRow?.id || null,
        })
        .eq('id', req.id)
      if (rErr) throw rErr

      await loadData()
      setConfirmReject(null)
    } catch (e) {
      setError(e.message || '반려 처리 중 오류')
    } finally {
      setActionInProgress(null)
    }
  }

  const handleSignOut = async () => {
    auth.signOut()
    nav('/login')
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-stone-400" />
      </div>
    )
  }

  if (!isOp) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-8">
        <div className="max-w-md text-center">
          <Shield size={48} className="mx-auto text-stone-400 mb-4" />
          <h1 className="font-serif text-2xl text-stone-900 mb-2">접근 권한이 없습니다</h1>
          <p className="text-sm text-stone-600 mb-6">
            이 페이지는 Qualytree 플랫폼 운영자만 접근할 수 있습니다. 잠시 후 자동으로 대시보드로 이동합니다.
          </p>
          <Link to="/dashboard" className="text-sm text-emerald-800 underline">대시보드로 즉시 이동</Link>
        </div>
      </div>
    )
  }

  const pending = requests.filter((r) => r.status === 'pending')
  const approved = requests.filter((r) => r.status === 'approved')
  const rejected = requests.filter((r) => r.status === 'rejected')
  const activeCompanies = companies.filter((c) => c.status === 'active')

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-stone-900 text-white px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <div className="font-serif text-lg">Qualytree</div>
              <div className="text-xs text-stone-400 uppercase tracking-wider">Platform Operator Console</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-xs text-stone-300 hover:text-white">
              일반 대시보드 →
            </Link>
            <button
              onClick={handleSignOut}
              className="text-xs text-stone-300 hover:text-white inline-flex items-center gap-1"
            >
              <LogOut size={14} /> 로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="text-xs uppercase tracking-widest text-emerald-800 mb-1">
              QUALYTREE PLATFORM · OPS-CONSOLE-001
            </div>
            <h1 className="font-serif text-3xl text-stone-900">운영자 콘솔</h1>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3 py-1.5 text-xs text-stone-700 border border-stone-300 rounded inline-flex items-center gap-1 hover:bg-white"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> 새로고침
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <button
            onClick={() => setTab('pending')}
            className={
              'p-4 rounded-lg border text-left transition ' +
              (tab === 'pending'
                ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-300'
                : 'border-stone-200 bg-white hover:border-stone-300')
            }
          >
            <div className="flex items-center justify-between mb-1">
              <Clock size={16} className="text-amber-600" />
              <span className="font-serif text-xl text-stone-900">{pending.length}</span>
            </div>
            <div className="text-xs text-stone-600">검토 대기</div>
          </button>
          <button
            onClick={() => setTab('approved')}
            className={
              'p-4 rounded-lg border text-left transition ' +
              (tab === 'approved'
                ? 'border-emerald-700 bg-emerald-50 ring-1 ring-emerald-300'
                : 'border-stone-200 bg-white hover:border-stone-300')
            }
          >
            <div className="flex items-center justify-between mb-1">
              <CheckCircle2 size={16} className="text-emerald-700" />
              <span className="font-serif text-xl text-stone-900">{approved.length}</span>
            </div>
            <div className="text-xs text-stone-600">승인 완료</div>
          </button>
          <button
            onClick={() => setTab('rejected')}
            className={
              'p-4 rounded-lg border text-left transition ' +
              (tab === 'rejected'
                ? 'border-stone-500 bg-stone-100'
                : 'border-stone-200 bg-white hover:border-stone-300')
            }
          >
            <div className="flex items-center justify-between mb-1">
              <XCircle size={16} className="text-stone-500" />
              <span className="font-serif text-xl text-stone-900">{rejected.length}</span>
            </div>
            <div className="text-xs text-stone-600">반려</div>
          </button>
          <button
            onClick={() => setTab('companies')}
            className={
              'p-4 rounded-lg border text-left transition ' +
              (tab === 'companies'
                ? 'border-emerald-800 bg-emerald-50 ring-1 ring-emerald-400'
                : 'border-stone-200 bg-white hover:border-stone-300')
            }
          >
            <div className="flex items-center justify-between mb-1">
              <Building2 size={16} className="text-emerald-800" />
              <span className="font-serif text-xl text-stone-900">{activeCompanies.length}</span>
            </div>
            <div className="text-xs text-stone-600">활성 회사</div>
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-white rounded-lg border border-stone-200">
          <div className="px-6 py-4 border-b border-stone-200">
            <h2 className="font-medium text-stone-900">
              {tab === 'pending' && '검토 대기 중인 가입 신청'}
              {tab === 'approved' && '승인 완료된 신청'}
              {tab === 'rejected' && '반려된 신청'}
              {tab === 'companies' && '활성 회사 목록'}
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-stone-400">
              <Loader2 size={32} className="animate-spin mx-auto mb-2" />
              <div className="text-sm">불러오는 중...</div>
            </div>
          ) : tab === 'pending' ? (
            pending.length === 0 ? (
              <div className="p-12 text-center text-stone-500">
                <Inbox size={32} className="mx-auto mb-2 text-stone-400" />
                <div className="text-sm">검토 대기 중인 신청이 없습니다.</div>
              </div>
            ) : (
              <div className="divide-y divide-stone-200">
                {pending.map((req) => (
                  <div key={req.id} className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-stone-900">{req.company_name}</span>
                          <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded">
                            {PLAN_LABELS[req.desired_plan] || req.desired_plan}
                          </span>
                          {req.desired_billing_cycle === 'annual' && (
                            <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">연납</span>
                          )}
                        </div>
                        <div className="text-xs text-stone-600 mb-2 grid grid-cols-2 gap-x-4 gap-y-1">
                          <div>대표: <span className="text-stone-900">{req.representative || '—'}</span></div>
                          <div>분야: <span className="text-stone-900">{req.industry || '—'}</span></div>
                          <div>사업자번호: <span className="text-stone-900">{req.business_number || '—'}</span></div>
                          <div>인원: <span className="text-stone-900">{req.employee_count_band}</span></div>
                          <div>관리자: <span className="text-stone-900">{req.admin_name}</span></div>
                          <div>이메일: <span className="text-stone-900">{req.admin_email}</span></div>
                          <div>전화: <span className="text-stone-900">{req.admin_phone || '—'}</span></div>
                          <div>인증: <span className="text-stone-900">{(req.desired_certifications || []).join(', ')}</span></div>
                        </div>
                        <div className="text-xs text-stone-500">
                          신청일: {fmtDate(req.created_at)}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          onClick={() => handleApprove(req)}
                          disabled={actionInProgress === req.id}
                          className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs rounded inline-flex items-center justify-center gap-1 disabled:opacity-60"
                        >
                          {actionInProgress === req.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                          승인
                        </button>
                        <button
                          onClick={() => setConfirmReject(req)}
                          disabled={actionInProgress === req.id}
                          className="px-4 py-1.5 border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs rounded inline-flex items-center justify-center gap-1"
                        >
                          <XCircle size={12} /> 반려
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : tab === 'approved' ? (
            approved.length === 0 ? (
              <div className="p-12 text-center text-stone-500">
                <CheckCircle2 size={32} className="mx-auto mb-2 text-stone-400" />
                <div className="text-sm">승인된 신청이 없습니다.</div>
              </div>
            ) : (
              <div className="divide-y divide-stone-200">
                {approved.map((req) => (
                  <div key={req.id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-stone-900">{req.company_name}</span>
                      <span className="ml-2 text-xs text-stone-500">{PLAN_LABELS[req.desired_plan]}</span>
                    </div>
                    <div className="text-xs text-stone-500">
                      승인: {fmtDate(req.processed_at)}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : tab === 'rejected' ? (
            rejected.length === 0 ? (
              <div className="p-12 text-center text-stone-500">
                <XCircle size={32} className="mx-auto mb-2 text-stone-400" />
                <div className="text-sm">반려된 신청이 없습니다.</div>
              </div>
            ) : (
              <div className="divide-y divide-stone-200">
                {rejected.map((req) => (
                  <div key={req.id} className="px-6 py-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-stone-900">{req.company_name}</span>
                      <span className="text-xs text-stone-500">{fmtDate(req.processed_at)}</span>
                    </div>
                    {req.rejection_reason && (
                      <div className="text-xs text-stone-600 italic">사유: {req.rejection_reason}</div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : tab === 'companies' ? (
            activeCompanies.length === 0 ? (
              <div className="p-12 text-center text-stone-500">
                <Building2 size={32} className="mx-auto mb-2 text-stone-400" />
                <div className="text-sm">활성 회사가 없습니다.</div>
              </div>
            ) : (
              <div className="divide-y divide-stone-200">
                {activeCompanies.map((c) => (
                  <div key={c.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-stone-900">{c.name}</span>
                        <span className="text-xs px-2 py-0.5 bg-stone-100 rounded">
                          {PLAN_LABELS[c.plan_code]}
                        </span>
                        {c.is_founding_customer && (
                          <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">Founding</span>
                        )}
                      </div>
                      <div className="text-xs text-stone-600">
                        {c.industry} · {c.employee_count_band} · 시트 {c.base_seats + (c.extra_seats || 0)}개
                      </div>
                    </div>
                    <div className="text-xs text-stone-500">
                      가입: {fmtDate(c.approved_at || c.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : null}
        </div>
      </main>

      {confirmReject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="font-medium text-stone-900 mb-2">'{confirmReject.company_name}' 신청 반려</h3>
            <p className="text-sm text-stone-600 mb-4">반려 사유를 입력해주세요. 신청자에게 안내됩니다.</p>
            <textarea
              id="reject-reason"
              rows="3"
              className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-emerald-700"
              placeholder="예: 사업자등록번호 확인 불가"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmReject(null)}
                className="px-4 py-1.5 text-stone-700 hover:bg-stone-100 rounded text-sm"
              >
                취소
              </button>
              <button
                onClick={() => {
                  const reason = document.getElementById('reject-reason').value
                  handleReject(confirmReject, reason)
                }}
                className="px-4 py-1.5 bg-stone-800 hover:bg-stone-900 text-white rounded text-sm"
              >
                반려 확정
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
