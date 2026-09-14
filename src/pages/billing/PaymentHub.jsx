// src/pages/billing/PaymentHub.jsx — 플랜 선택 및 토스페이먼츠 결제
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import AppLayout from '../../components/AppLayout'
import { CreditCard, Check, Sparkles, RefreshCw } from 'lucide-react'

const PLANS = [
  { key: 'free',       label: '무료',         price: 0,      aiLimit: 10,  color: '#888',    features: ['AI 초안 10회/월', '기본 ISO 허브 전체', '1 사용자', '기본 지원'] },
  { key: 'starter',   label: '스타터',        price: 49000,  aiLimit: 50,  color: '#2980b9', features: ['AI 초안 50회/월', '전체 ISO 허브', '5 사용자', '이메일 지원', 'PDF 출력'] },
  { key: 'pro',        label: '프로',          price: 149000, aiLimit: 200, color: '#8e44ad', features: ['AI 초안 200회/월', '전체 허브 + PDF', '20 사용자', '우선 지원', '감사 추적'] },
  { key: 'enterprise', label: '엔터프라이즈',  price: 490000, aiLimit: 999, color: '#c0392b', features: ['AI 초안 무제한', '전체 기능', '무제한 사용자', '전담 지원', 'Custom 도메인'] },
]

export default function PaymentHub() {
  const [currentPlan, setCurrentPlan] = useState('free')
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
        orderName: `Qualytree ${plan.label} 플랜 1개월`,
        successUrl: `${window.location.origin}/billing/success?plan=${plan.key}&companyId=${companyId}`,
        failUrl: `${window.location.origin}/billing?fail=1`,
      })
    } catch (e) {
      if (e.code !== 'USER_CANCEL') alert('결제 오류: ' + e.message)
    }
    setLoading(false)
  }

  const currentPlanObj = PLANS.find(p => p.key === currentPlan) || PLANS[0]

  return (
    <AppLayout>
      <div style={{ padding: '28px 32px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ink)' }}>
            <CreditCard size={22} style={{ color: 'var(--moss)' }} /> 플랜 및 결제
          </h1>
          <p style={{ color: 'var(--ink-faint)', margin: '6px 0 0', fontSize: 13 }}>
            현재 플랜: <strong style={{ color: currentPlanObj.color }}>{currentPlanObj.label}</strong>
            {expiresAt && ` · 만료일: ${expiresAt.slice(0, 10)}`}
          </p>
        </div>

        {failParam && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca', fontSize: 13, color: '#991b1b' }}>
            결제가 취소되었거나 오류가 발생했습니다. 다시 시도해 주세요.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 }}>
          {PLANS.map(plan => {
            const isActive = plan.key === currentPlan
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
                    {plan.price === 0 ? '무료' : `₩${plan.price.toLocaleString()}`}
                    {plan.price > 0 && <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--ink-faint)' }}>/월</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 2 }}>
                    AI 초안 {plan.aiLimit === 999 ? '무제한' : `${plan.aiLimit}회`}/월
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
