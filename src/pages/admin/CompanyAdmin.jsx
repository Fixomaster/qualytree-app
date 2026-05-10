import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Building2, Users, FileText, CreditCard, Plus, Trash2, Edit3,
  CheckCircle2, AlertCircle, Loader2, RefreshCw, Sparkles,
  TrendingUp, Calendar, Mail, Shield, ChevronRight,
} from 'lucide-react'
import Logo from '../../components/Logo'
import { auth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'

const PLAN_PRICING = {
  starter:      { label: 'Starter',      band: '1~10인',  monthlyKRW: 1000000, baseSeats: 5,  baseCertCount: 1 },
  standard:     { label: 'Standard',     band: '11~30인', monthlyKRW: 2000000, baseSeats: 10, baseCertCount: 1 },
  professional: { label: 'Professional', band: '31인+',   monthlyKRW: 5000000, baseSeats: 20, baseCertCount: 2 },
}

const EXTRA_CERTS = ['ISO 13485', 'FDA QMSR', 'EU MDR', 'IVDR', 'MDSAP', 'NMPA', 'PMDA']

const LEVEL_LABEL = { 1: '작업자', 2: '검사관', 3: '매니저·RA' }

function fmtKRW(n) {
  if (!n) return '0원'
  return new Intl.NumberFormat('ko-KR').format(n) + '원'
}

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function calcMonthly(planCode, extraSeats, extraCertsCount) {
  const p = PLAN_PRICING[planCode]
  if (!p) return 0
  return p.monthlyKRW + extraSeats * 100000 + extraCertsCount * 500000
}

export default function CompanyAdmin() {
  const nav = useNavigate()
  const [authChecked, setAuthChecked] = useState(false)
  const [session, setSession] = useState(null)
  const [tab, setTab] = useState('billing')

  const [company, setCompany] = useState(null)
  const [members, setMembers] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [savingPlan, setSavingPlan] = useState(false)

  // 권한 체크
  useEffect(() => {
    (async () => {
      const ctx = await auth.refreshFromSupabase()
      if (!ctx || (ctx.kind !== 'company_member' || !ctx.session?.isCompanyAdmin)) {
        setAuthChecked(true)
        setTimeout(() => nav('/dashboard'), 4000)
        return
      }
      setSession(ctx.session)
      setAuthChecked(true)
    })()
  }, [nav])

  const loadData = async () => {
    if (!session?.company?.id) return
    setLoading(true)
    setError(null)
    try {
      const [cRes, mRes, iRes, aRes] = await Promise.all([
        supabase.from('companies').select('*').eq('id', session.company.id).maybeSingle(),
        supabase.from('company_members').select('*').eq('company_id', session.company.id).order('created_at'),
        supabase.from('invoices').select('*').eq('company_id', session.company.id).order('created_at', { ascending: false }),
        supabase.from('audit_logs').select('*').eq('company_id', session.company.id).order('created_at', { ascending: false }).limit(50),
      ])
      if (cRes.error) throw cRes.error
      setCompany(cRes.data)
      setMembers(mRes.data || [])
      setInvoices(iRes.data || [])
      setAuditLogs(aRes.data || [])
    } catch (e) {
      setError(e.message || '데이터 조회 중 오류')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session?.company?.id) loadData()
  }, [session])

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-stone-400" />
      </div>
    )
  }

  if (!session || !session.isCompanyAdmin) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-8">
        <div className="max-w-md text-center">
          <Shield size={48} className="mx-auto text-stone-400 mb-4" />
          <h1 className="font-serif text-2xl text-stone-900 mb-2">회사 관리자 권한이 필요합니다</h1>
          <p className="text-sm text-stone-600 mb-6">
            이 페이지는 회사 관리자(Company Admin)만 접근할 수 있습니다. 잠시 후 대시보드로 이동합니다.
          </p>
          <Link to="/dashboard" className="text-sm text-emerald-800 underline">대시보드로 즉시 이동</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <div className="font-serif text-lg text-stone-900">{company?.name || '—'}</div>
              <div className="text-xs text-stone-500 uppercase tracking-wider">회사 관리자 콘솔</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-stone-500">{session.email}</span>
            <Link to="/dashboard" className="text-xs text-emerald-800 hover:text-emerald-900 inline-flex items-center gap-1">
              일반 대시보드 <ChevronRight size={12} />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="text-xs uppercase tracking-widest text-emerald-800 mb-1">
              QUALYTREE PLATFORM · ADMIN-001
            </div>
            <h1 className="font-serif text-3xl text-stone-900">회사 관리자</h1>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3 py-1.5 text-xs text-stone-700 border border-stone-300 rounded inline-flex items-center gap-1 hover:bg-white"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> 새로고침
          </button>
        </div>

        {/* 탭 */}
        <div className="border-b border-stone-200 mb-6 flex gap-1">
          {[
            { key: 'billing', label: '결제·플랜', icon: CreditCard },
            { key: 'users', label: '직원 관리', icon: Users },
            { key: 'audit', label: '감사 추적', icon: FileText },
          ].map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={
                  'px-4 py-2.5 text-sm border-b-2 inline-flex items-center gap-2 -mb-px ' +
                  (tab === t.key
                    ? 'border-emerald-800 text-emerald-900 font-medium'
                    : 'border-transparent text-stone-600 hover:text-stone-900')
                }
              >
                <Icon size={14} /> {t.label}
              </button>
            )
          })}
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg border border-stone-200 p-12 text-center">
            <Loader2 size={32} className="animate-spin mx-auto text-stone-400 mb-2" />
            <div className="text-sm text-stone-500">불러오는 중...</div>
          </div>
        ) : (
          <>
            {tab === 'billing' && company && (
              <BillingTab
                company={company}
                invoices={invoices}
                onReload={loadData}
                savingPlan={savingPlan}
                setSavingPlan={setSavingPlan}
                setError={setError}
              />
            )}
            {tab === 'users' && (
              <UsersTab
                company={company}
                members={members}
                onReload={loadData}
                setError={setError}
              />
            )}
            {tab === 'audit' && (
              <AuditTab auditLogs={auditLogs} />
            )}
          </>
        )}
      </main>
    </div>
  )
}

// ─── Billing Tab ──────────────────────────────────────────────────
function BillingTab({ company, invoices, onReload, savingPlan, setSavingPlan, setError }) {
  const [extraSeats, setExtraSeats] = useState(company.extra_seats || 0)
  const [extraCerts, setExtraCerts] = useState(company.extra_certifications || [])
  const [billingCycle, setBillingCycle] = useState(company.billing_cycle || 'monthly')

  const planCode = company.plan_code
  const plan = PLAN_PRICING[planCode] || PLAN_PRICING.starter
  const monthly = calcMonthly(planCode, extraSeats, extraCerts.length)
  const annual = Math.round(monthly * 12 * 0.8)
  const displayPrice = billingCycle === 'annual' ? annual : monthly
  const isFounding = company.is_founding_customer && (!company.founding_until || new Date(company.founding_until) > new Date())

  const dirty = extraSeats !== (company.extra_seats || 0)
              || JSON.stringify(extraCerts.sort()) !== JSON.stringify((company.extra_certifications || []).sort())
              || billingCycle !== (company.billing_cycle || 'monthly')

  const toggleCert = (c) => {
    setExtraCerts((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])
  }

  const onSave = async () => {
    if (!confirm('변경사항을 적용하시겠습니까?\n\n시트·인증·결제 주기 변경 시 다음 청구분부터 새 가격이 적용됩니다.')) return
    setSavingPlan(true)
    setError(null)
    try {
      const { error: e } = await supabase
        .from('companies')
        .update({
          extra_seats: extraSeats,
          extra_certifications: extraCerts,
          billing_cycle: billingCycle,
        })
        .eq('id', company.id)
      if (e) throw e
      await onReload()
      alert('✓ 변경 저장 완료')
    } catch (e) {
      setError(e.message)
    } finally {
      setSavingPlan(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Founding 안내 */}
      {isFounding && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3">
          <Sparkles size={18} className="text-emerald-700 mt-0.5" />
          <div>
            <div className="font-medium text-emerald-900 mb-1 text-sm">Founding Customer 베타 무료 기간</div>
            <div className="text-xs text-emerald-800">
              정식 청구는 {fmtDate(company.founding_until)}부터 시작됩니다. 그 전까지는 시스템을 무료로 자유롭게 사용하실 수 있습니다.
            </div>
          </div>
        </div>
      )}

      {/* 플랜 + 가격 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-white rounded-lg border border-stone-200 p-6">
          <h2 className="font-medium text-stone-900 mb-4">현재 플랜</h2>

          <div className="border border-emerald-300 bg-emerald-50/50 rounded-lg p-4 mb-5">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="font-medium text-stone-900">{plan.label}</div>
                <div className="text-xs text-stone-600">{plan.band} · 기본 시트 {plan.baseSeats}명 · 기본 인증 {plan.baseCertCount}개</div>
              </div>
              <div className="text-right">
                <span className="font-serif text-xl text-stone-900">{fmtKRW(plan.monthlyKRW)}</span>
                <span className="text-xs text-stone-500"> / 월 (기본료)</span>
              </div>
            </div>
          </div>

          {/* 결제 주기 */}
          <div className="mb-5">
            <label className="text-sm text-stone-700 block mb-2">결제 주기</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={
                  'px-4 py-3 rounded border text-sm transition ' +
                  (billingCycle === 'monthly'
                    ? 'border-emerald-800 bg-emerald-50 text-emerald-900'
                    : 'border-stone-300 text-stone-700 hover:border-stone-400')
                }
              >
                <div className="font-medium">월납</div>
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={
                  'px-4 py-3 rounded border text-sm transition ' +
                  (billingCycle === 'annual'
                    ? 'border-emerald-800 bg-emerald-50 text-emerald-900'
                    : 'border-stone-300 text-stone-700 hover:border-stone-400')
                }
              >
                <div className="font-medium">연납 <span className="ml-1 text-xs bg-emerald-800 text-white px-1.5 py-0.5 rounded">20% 할인</span></div>
              </button>
            </div>
          </div>

          {/* 추가 시트 */}
          <div className="mb-5">
            <label className="text-sm text-stone-700 block mb-1">
              추가 시트 <span className="text-xs text-stone-500">(기본 {plan.baseSeats}시트 외 / +10만원/시트)</span>
            </label>
            <input
              type="number"
              min="0"
              max="500"
              value={extraSeats}
              onChange={(e) => setExtraSeats(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-4 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-emerald-700"
            />
            <div className="text-xs text-stone-500 mt-1">
              총 {plan.baseSeats + extraSeats}시트 사용 가능
            </div>
          </div>

          {/* 추가 인증 */}
          <div className="mb-5">
            <label className="text-sm text-stone-700 block mb-2">
              추가 인증 <span className="text-xs text-stone-500">(+50만원/인증)</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {EXTRA_CERTS.filter((c) => !(company.base_certifications || []).includes(c)).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCert(c)}
                  className={
                    'px-2 py-2 rounded border text-xs transition ' +
                    (extraCerts.includes(c)
                      ? 'border-emerald-800 bg-emerald-50 text-emerald-900'
                      : 'border-stone-300 text-stone-700 hover:border-stone-400')
                  }
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {dirty && (
            <button
              onClick={onSave}
              disabled={savingPlan}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-sm rounded inline-flex items-center gap-2 disabled:opacity-60"
            >
              {savingPlan ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              변경사항 저장
            </button>
          )}
        </div>

        {/* 가격 요약 */}
        <div className="bg-white rounded-lg border border-stone-200 p-6">
          <h2 className="font-medium text-stone-900 mb-4">예상 청구액</h2>

          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between text-stone-700">
              <span>{plan.label} 기본료</span>
              <span>{fmtKRW(plan.monthlyKRW)}</span>
            </div>
            {extraSeats > 0 && (
              <div className="flex justify-between text-stone-700">
                <span>추가 시트 {extraSeats}명</span>
                <span>{fmtKRW(extraSeats * 100000)}</span>
              </div>
            )}
            {extraCerts.length > 0 && (
              <div className="flex justify-between text-stone-700">
                <span>추가 인증 {extraCerts.length}개</span>
                <span>{fmtKRW(extraCerts.length * 500000)}</span>
              </div>
            )}
            {billingCycle === 'annual' && (
              <div className="flex justify-between text-emerald-800 text-xs">
                <span>연납 20% 할인</span>
                <span>−{fmtKRW(monthly * 12 - annual)}</span>
              </div>
            )}
          </div>

          <div className="border-t border-stone-300 pt-3">
            <div className="text-xs text-stone-500 mb-1">합계 (부가세 별도)</div>
            <div className="font-serif text-2xl text-stone-900">{fmtKRW(displayPrice)}</div>
            <div className="text-xs text-stone-500">
              {billingCycle === 'annual' ? '/ 연' : '/ 월'}
              {isFounding && <span className="ml-2 text-emerald-700">· Founding 무료</span>}
            </div>
          </div>
        </div>
      </div>

      {/* 청구 이력 */}
      <div className="bg-white rounded-lg border border-stone-200">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <h2 className="font-medium text-stone-900">청구 이력</h2>
          <span className="text-xs text-stone-500">{invoices.length}건</span>
        </div>
        {invoices.length === 0 ? (
          <div className="p-12 text-center text-stone-500">
            <Calendar size={28} className="mx-auto mb-2 text-stone-400" />
            <div className="text-sm">아직 청구 이력이 없습니다.</div>
            <div className="text-xs text-stone-400 mt-1">Founding 베타 종료 후 첫 청구가 시작됩니다.</div>
          </div>
        ) : (
          <div className="divide-y divide-stone-200">
            {invoices.map((inv) => (
              <div key={inv.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-stone-900 text-sm">{inv.invoice_number}</div>
                  <div className="text-xs text-stone-500">
                    {fmtDate(inv.billing_period_start)} ~ {fmtDate(inv.billing_period_end)} · {inv.billing_cycle === 'annual' ? '연납' : '월납'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-serif text-lg text-stone-900">{fmtKRW(inv.total)}</div>
                  <div className={
                    'text-xs ' + (
                      inv.status === 'paid' ? 'text-emerald-700'
                      : inv.status === 'overdue' ? 'text-red-700'
                      : 'text-stone-500'
                    )
                  }>
                    {inv.status === 'paid' ? '결제 완료' : inv.status === 'overdue' ? '연체' : inv.status === 'waived' ? '면제' : '대기'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Users Tab ────────────────────────────────────────────────────
function UsersTab({ company, members, onReload, setError }) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newLevel, setNewLevel] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  const totalSeats = (company?.base_seats || 0) + (company?.extra_seats || 0)
  const usedSeats = members.filter((m) => m.status !== 'suspended').length
  const seatsLeft = totalSeats - usedSeats

  const onAdd = async () => {
    if (!newName.trim() || !newEmail.trim()) {
      setError('이름과 이메일을 입력해주세요.')
      return
    }
    if (seatsLeft <= 0) {
      setError('사용 가능한 시트가 없습니다. Billing 탭에서 시트를 추가하세요.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      // 주의: 실제 Supabase Auth 사용자 생성은 운영자 또는 admin API 권한 필요
      // 베타 단계에서는 invited 상태로 등록만, 실제 가입은 운영팀이 별도 처리
      alert(`${newName}님 직원 추가는 베타 단계에서 운영팀이 직접 처리합니다.\n\n[다음 단계 — Step 3-4]\n• 회사 관리자가 직접 직원 초대 이메일 발송\n• 초대 링크로 직원 자가 등록\n• Supabase Edge Function으로 자동화\n\n현재 시트 사용 현황만 미리 표시됩니다.`)
      setAdding(false)
      setNewName('')
      setNewEmail('')
      setNewLevel(1)
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 시트 사용 현황 */}
      <div className="bg-white rounded-lg border border-stone-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-stone-900">시트 사용 현황</h2>
          <span className="text-xs text-stone-500">{usedSeats} / {totalSeats}</span>
        </div>
        <div className="h-3 bg-stone-200 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-emerald-700 transition-all"
            style={{ width: `${Math.min(100, (usedSeats / totalSeats) * 100)}%` }}
          />
        </div>
        <div className="text-xs text-stone-600">
          기본 {company?.base_seats}시트 + 추가 {company?.extra_seats || 0}시트 = 총 {totalSeats}시트 ·
          사용 가능 <span className="text-stone-900 font-medium">{seatsLeft}시트</span>
        </div>
      </div>

      {/* 직원 목록 */}
      <div className="bg-white rounded-lg border border-stone-200">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <h2 className="font-medium text-stone-900">직원 목록</h2>
          <button
            onClick={() => setAdding(true)}
            disabled={seatsLeft <= 0}
            className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs rounded inline-flex items-center gap-1 disabled:opacity-50"
          >
            <Plus size={12} /> 직원 추가
          </button>
        </div>

        {/* 직원 추가 폼 */}
        {adding && (
          <div className="px-6 py-4 bg-emerald-50/50 border-b border-stone-200">
            <div className="grid grid-cols-3 gap-3 mb-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="이름"
                className="px-3 py-2 border border-stone-300 rounded text-sm"
              />
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="이메일"
                className="px-3 py-2 border border-stone-300 rounded text-sm"
              />
              <select
                value={newLevel}
                onChange={(e) => setNewLevel(parseInt(e.target.value))}
                className="px-3 py-2 border border-stone-300 rounded text-sm bg-white"
              >
                <option value={1}>{LEVEL_LABEL[1]}</option>
                <option value={2}>{LEVEL_LABEL[2]}</option>
                <option value={3}>{LEVEL_LABEL[3]}</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setAdding(false); setNewName(''); setNewEmail('') }}
                className="px-3 py-1.5 text-stone-700 hover:bg-stone-100 rounded text-xs"
              >
                취소
              </button>
              <button
                onClick={onAdd}
                disabled={submitting}
                className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs rounded inline-flex items-center gap-1 disabled:opacity-60"
              >
                {submitting ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                추가
              </button>
            </div>
          </div>
        )}

        {members.length === 0 ? (
          <div className="p-12 text-center text-stone-500">
            <Users size={28} className="mx-auto mb-2 text-stone-400" />
            <div className="text-sm">아직 등록된 직원이 없습니다.</div>
            <div className="text-xs text-stone-400 mt-1">관리자 본인이 첫 직원으로 자동 등록됩니다 (다음 단계에서 자동화).</div>
          </div>
        ) : (
          <div className="divide-y divide-stone-200">
            {members.map((m) => (
              <div key={m.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 font-medium">
                    {(m.name || m.email).slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-stone-900 text-sm">{m.name || m.email}</span>
                      {m.is_admin && <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">Admin</span>}
                    </div>
                    <div className="text-xs text-stone-500">{m.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-stone-600">{LEVEL_LABEL[m.permission_level]}</span>
                  <span className={
                    'text-xs px-2 py-0.5 rounded ' + (
                      m.status === 'active' ? 'bg-emerald-50 text-emerald-700'
                      : m.status === 'invited' ? 'bg-amber-50 text-amber-700'
                      : 'bg-stone-100 text-stone-500'
                    )
                  }>
                    {m.status === 'active' ? '활성' : m.status === 'invited' ? '초대됨' : '비활성'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Audit Tab ────────────────────────────────────────────────────
function AuditTab({ auditLogs }) {
  return (
    <div className="bg-white rounded-lg border border-stone-200">
      <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
        <div>
          <h2 className="font-medium text-stone-900">감사 추적 (Audit Trail)</h2>
          <div className="text-xs text-stone-500 mt-0.5">21 CFR Part 11 §11.10(e) · 최근 50건</div>
        </div>
      </div>
      {auditLogs.length === 0 ? (
        <div className="p-12 text-center text-stone-500">
          <FileText size={28} className="mx-auto mb-2 text-stone-400" />
          <div className="text-sm">감사 기록이 없습니다.</div>
        </div>
      ) : (
        <div className="divide-y divide-stone-200">
          {auditLogs.map((log) => (
            <div key={log.id} className="px-6 py-3 grid grid-cols-12 gap-3 items-center text-sm">
              <div className="col-span-3 text-xs text-stone-500">{fmtDate(log.created_at)} {new Date(log.created_at).toTimeString().slice(0, 5)}</div>
              <div className="col-span-3 text-stone-700">{log.user_email || '시스템'}</div>
              <div className="col-span-3 text-stone-900">{log.action}</div>
              <div className="col-span-3 text-stone-500 text-xs truncate">{log.entity_type}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
