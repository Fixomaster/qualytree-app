// src/pages/billing/PaymentHub.jsx — 플랜 선택 및 토스페이먼츠 결제
// 요금은 사이드바 "플랜·요금 관리"(lib/plans.js)와 동일한 단일 소스를 사용한다 —
// 홈페이지 가입 결제 단계(Signup.jsx, 2026-09 확정 요금 모델: 기본 월 300만원 + 추가 인증 월 100만원)와 일치.
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import AppLayout from '../../components/AppLayout'
import { CreditCard, Check, Sparkles, RefreshCw } from 'lucide-react'
import { loadPlans, priceFor, won as fmtWon } from '../../lib/plans'

const PLAN_COLORS = ['#2980b9', '#16a34a', '#8e44ad', '#c0392b', '#0d9488', '#b45309']

export default function PaymentHub() {
  const PLANS = useMemo(() => {
    const all = loadPlans().filter((p) => !p.custom)
    return all.map((p, i) => ({
      key: p.name,
      id: p.id,
      label: p.name,
      price: priceFor(p, 'monthly') ?? 0,
      color: PLAN_COLORS[i % PLAN_COLORS.length],
      features: p.features || [],
    }))
  }, [])
  const [currentPlan, setCurrentPlan] = useState(null)
  const [companyId, setCompanyId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sdkLoaded, setSdkLoaded] = useState(false)
  const [expiresAt, setExpiresAt] = useState(null)
  const urlParams = new URLSearchParams(window.location.search)
  const failParam = urlParams.get('fail')

  useEffect(() => {
    if (!document.getElementById('toss-sdk')) {
      const script = document.createElement('script')
      script.id = 'toss-sdk'
      script.src = 'https://js.tosspayments.com/v1/payment'
      script.onload = () => setSdkLoaded(true)
      document.head.appendChild(script)
    } else if (window.TossPayments) setSdkLoaded(true)

    async function loadPlan() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single()
      if (!profile?.company_id) return
      setCompanyId(profile.company_id)
      const { data: sub } = await supabase.from('subscriptions').select('plan, expires_at').eq('company_id', profile.company_id).single()
      if (sub?.plan) setCurrentPlan(sub.plan)
      if (sub?.expires_at) setExpiresAt(sub.expires_at)
      // 구 요금제(free/starter/pro/enterprise)로 저장된 값은 새 인증 기반 플랜 목록에 없으므로
      // "계약된 플랜 없음"으로 처리한다 — 아래 currentPlanObj가 null이면 안내 카드를 보여준다.
    }
    loadPlan()
  }, [])

  async function handleCheckout(plan) {
    if (!sdkLoaded || plan.price === 0) return
    setLoading(true)
    try {
      const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY || 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq'
      const tossPayments = window.TossPayments(clientKey)
      const orderId = `QT-${(companyId || 'guest').slice(0, 8)}-${Date.now()}`
      await tossPayments.requestPayment('카드', {
        amount: plan.price,
        orderId,
        orderName: `Qualytree ${plan.label} 1개월 (VAT 별도)`,
        successUrl: `${window.location.origin}/billing/success?plan=${plan.id}&companyId=${companyId}`,
        failUrl: `${window.location.origin}/billing?fail=1`,
      })
    } catch (e) {
      if (e.code !== 'USER_CANCEL') alert('결제 오류: ' + e.message)
    }
    setLoading(false)
  }

  const currentPlanObj = PLANS.find(p => p.id === currentPlan) || null

  return (
    <AppLayout>
      <div style={{ padding: '28px 32px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ink)' }}>
            <CreditCard size={22} style={{ color: 'var(--moss)' }} /> 플랜 및 결제
          </h1>
          <p style={{ color: 'var(--ink-faint)', margin: '6px 0 0', fontSize: 13 }}>
            현재 플랜: <strong style={{ color: currentPlanObj?.color || 'var(--ink-faint)' }}>{currentPlanObj?.label || '계약된 플랜 없음'}</strong>
            {expiresAt && ` · 만료일: ${expiresAt.slice(0, 10)}`}
          </p>
          <p style={{ color: 'var(--ink-faint)', margin: '2px 0 0', fontSize: 12 }}>
            모든 금액은 VAT 별도이며, 아래 플랜은 홈페이지 가입 결제 화면과 동일한 요금입니다.
          </p>
        </div>

        {failParam && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca', fontSize: 13, color: '#991b1b' }}>
            결제가 취소되었거나 오류가 발생했습니다. 다시 시도해 주세요.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 }}>
          {PLANS.map(plan => {
            const isActive = plan.id === currentPlan
            return (
              <div key={plan.key} style={{
                border: `2px solid ${isActive ? plan.color : 'var(--line)'}`,
                borderRadius: 16, padding: 24, background: 'var(--surface)',
                display: 'flex', flexDirection: 'column', gap: 14,
                boxShadow: isActive ? `0 0 0 4px ${plan.color}18` : 'none',
                position: 'relative',
              }}>
                {isActive && (
                  <div style={{ position: 'absolute', top: 12, right: 12, background: plan.color, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>현재</div>
                )}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: plan.color, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>{plan.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink)' }}>
                    {plan.price === 0 ? '문의' : fmtWon(plan.price)}
                    {plan.price > 0 && <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--ink-faint)' }}>/월</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 2 }}>
                    VAT 별도 · 월납
                  </div>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, color: 'var(--ink)' }}>
                      <Check size={13} style={{ color: plan.color, flexShrink: 0, marginTop: 2 }} /> {f}
                    </li>
                  ))}
                </ul>

                {isActive ? (
                  <div style={{ textAlign: 'center', padding: '9px', background: `${plan.color}14`, color: plan.color, borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                    현재 이용 중
                  </div>
                ) : plan.price === 0 ? (
                  <div style={{ textAlign: 'center', padding: '9px', background: 'var(--bg)', color: 'var(--ink-faint)', borderRadius: 8, fontSize: 13 }}>
                    기본 플랜
                  </div>
                ) : (
                  <button onClick={() => handleCheckout(plan)} disabled={loading || !sdkLoaded}
                    style={{
                      padding: '10px', background: plan.color, color: '#fff', border: 'none',
                      borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      opacity: loading || !sdkLoaded ? 0.7 : 1
                    }}>
                    {loading ? <><RefreshCw size={14} /> 처리 중…</> : <><Sparkles size={14} /> 업그레이드</>}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: 28, padding: 20, background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--line)', fontSize: 12, color: 'var(--ink-faint)', lineHeight: 1.7 }}>
          <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--ink)', fontSize: 13 }}>결제 안내</div>
          결제는 <strong>토스페이먼츠</strong>로 안전하게 처리됩니다. 신용카드, 체크카드, 계좌이체를 지원합니다.
          구독은 자동 갱신되지 않으며, 결제 시마다 1개월 이용권이 발급됩니다.
          환불 및 결제 문의: <a href="mailto:leesh@morehcompany.com" style={{ color: 'var(--moss)' }}>leesh@morehcompany.com</a>
        </div>
      </div>
    </AppLayout>
  )
}
