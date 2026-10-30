// src/pages/billing/PaymentHub.jsx — 플랜 선택 및 토스페이먼츠 v2 빌링(정기결제) 연동
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { auth } from '../../lib/auth'
import AppLayout from '../../components/AppLayout'
import { CreditCard, Check, Sparkles, RefreshCw } from 'lucide-react'
import { loadPlans, priceFor, won as fmtWon } from '../../lib/plans'
import { withVat } from '../../lib/planDefaults'

const PLAN_COLORS = ['#2980b9', '#16a34a', '#8e44ad', '#c0392b', '#0d9488', '#b45309']

export default function PaymentHub() {
  const PLANS = useMemo(() => {
    const all = loadPlans().filter((p) => !p.custom)
    const list = all.map((p, i) => ({
      key: p.name,
      id: p.id,
      label: p.name,
      price: priceFor(p, 'monthly') ?? 0,
      color: PLAN_COLORS[i % PLAN_COLORS.length],
      features: p.features || [],
    }))
    // ?test=1 로 들어오면 1,000원(+부가세) 시험 결제 카드를 맨 앞에 보여준다 — 결제 직후 자동 취소, 요금제 변경 없음
    if (new URLSearchParams(window.location.search).get('test') === '1') {
      list.unshift({ key: 'test', id: 'test', label: '시험 결제 (자동 환불)', price: 1000, color: '#64748b',
        features: ['실제 카드로 1,100원(부가세 포함) 결제', '결제 직후 자동 취소(환불)', '요금제는 바뀌지 않음'] })
    }
    return list
  }, [])
  const [currentPlan, setCurrentPlan] = useState(null)
  const [companyId, setCompanyId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingId, setLoadingId] = useState(null)
  const [sdkLoaded, setSdkLoaded] = useState(false)
  const [expiresAt, setExpiresAt] = useState(null)
  const urlParams = new URLSearchParams(window.location.search)
  const failParam = urlParams.get('fail')

  useEffect(() => {
    // 토스페이먼츠 SDK v2 로드
    if (!document.getElementById('toss-sdk')) {
      const script = document.createElement('script')
      script.id = 'toss-sdk'
      script.src = 'https://js.tosspayments.com/v2/standard'
      script.onload = () => setSdkLoaded(true)
      document.head.appendChild(script)
    } else if (window.TossPayments) setSdkLoaded(true)

    async function loadPlan() {
      // 1순위: auth.current()에서 company.id 가져오기
      const session = auth.current()
      const cid = session?.company?.id || null
      if (cid) {
        setCompanyId(cid)
      } else {
        // 2순위: Supabase auth user → company_members 조회
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: member } = await supabase
              .from('company_members')
              .select('company_id')
              .eq('user_id', user.id)
              .single()
            if (member?.company_id) setCompanyId(member.company_id)
          }
        } catch (e) {
          console.warn('[PaymentHub] company_id 조회 실패:', e)
        }
      }

      // 현재 구독 플랜 조회
      const finalCid = cid || auth.current()?.company?.id
      if (finalCid) {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('plan, expires_at')
          .eq('company_id', finalCid)
          .single()
        if (sub?.plan) setCurrentPlan(sub.plan)
        if (sub?.expires_at) setExpiresAt(sub.expires_at)
      }
    }
    loadPlan()
  }, [])

  async function handleCheckout(plan) {
    if (!sdkLoaded || plan.price === 0) return
    const cid = companyId || auth.current()?.company?.id
    if (!cid) { alert('회사 정보를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.'); return }
    setLoading(true); setLoadingId(plan.id)
    try {
      // 클라이언트 키는 Vercel 환경변수 VITE_TOSS_CLIENT_KEY(빌링 상점 MID bill_qualyudon)에서만 읽는다.
      // 운영(Production)에서 키가 빠졌는데 테스트 키로 조용히 열리면 실제 고객이 테스트 결제창을 보게 되므로,
      // 테스트 키 기본값은 미리보기·개발 환경에서만 쓴다.
      const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY || (import.meta.env.PROD ? '' : 'test_ck_mBZ1gQ4YVXbGoe2NRnz68l2KPoqN')
      if (!clientKey) { alert('결제 설정이 완료되지 않았습니다. 운영팀에 문의해 주세요.'); setLoading(false); setLoadingId(null); return }
      const tossPayments = window.TossPayments(clientKey)
      const payment = tossPayments.payment({ customerKey: cid })
      await payment.requestBillingAuth({
        method: 'CARD',
        successUrl: window.location.origin + '/billing/success?plan=' + plan.id + '&companyId=' + cid,
        failUrl: window.location.origin + '/billing?fail=1',
      })
    } catch (e) {
      if (e.code !== 'USER_CANCEL') alert('카드 등록 오류: ' + e.message)
    }
    setLoading(false); setLoadingId(null)
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
            {expiresAt && ' · 만료일: ' + expiresAt.slice(0, 10)}
          </p>
          <p style={{ color: 'var(--ink-faint)', margin: '2px 0 0', fontSize: 12 }}>
            요금은 VAT 별도이며, 결제 시 부가세 10%가 더해진 금액으로 청구됩니다. 카드를 한 번 등록하면 매월 자동 결제됩니다.
          </p>
        </div>

        {failParam && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca', fontSize: 13, color: '#991b1b' }}>
            카드 등록이 취소되었거나 오류가 발생했습니다. 다시 시도해 주세요.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 }}>
          {PLANS.map(plan => {
            const isActive = plan.id === currentPlan
            return (
              <div key={plan.key} style={{
                border: '2px solid ' + (isActive ? plan.color : 'var(--line)'),
                borderRadius: 16, padding: 24, background: 'var(--surface)',
                display: 'flex', flexDirection: 'column', gap: 14,
                boxShadow: isActive ? '0 0 0 4px ' + plan.color + '18' : 'none',
                position: 'relative',
              }}>
                {isActive && (
                  <div style={{ position: 'absolute', top: 12, right: 12, background: plan.color, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>현재</div>
                )}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: plan.color, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>{plan.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink)' }}>
                    {plan.price === 0 ? '무료' : fmtWon(plan.price)}
                    {plan.price > 0 && <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--ink-faint)' }}>/월</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 2 }}>VAT 별도 · 자동결제</div>
                  {plan.price > 0 && (() => { const v = withVat(plan.price); return (
                    <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--bg)', borderRadius: 8, fontSize: 12, color: 'var(--ink)', display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 3 }}>
                      <span style={{ color: 'var(--ink-faint)' }}>공급가액</span><span>{fmtWon(v.supply)}</span>
                      <span style={{ color: 'var(--ink-faint)' }}>부가세 (10%)</span><span>{fmtWon(v.vat)}</span>
                      <span style={{ fontWeight: 700, borderTop: '1px solid var(--line)', paddingTop: 3 }}>월 결제금액</span>
                      <span style={{ fontWeight: 700, borderTop: '1px solid var(--line)', paddingTop: 3 }}>{fmtWon(v.total)}</span>
                    </div>
                  ) })()}
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, color: 'var(--ink)' }}>
                      <Check size={13} style={{ color: plan.color, flexShrink: 0, marginTop: 2 }} /> {f}
                    </li>
                  ))}
                </ul>

                {isActive ? (
                  <div style={{ textAlign: 'center', padding: '9px', background: plan.color + '14', color: plan.color, borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
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
                    {loadingId === plan.id ? <><RefreshCw size={14} /> 처리 중…</> : <><Sparkles size={14} /> {plan.id === 'test' ? '카드 등록 · 시험 결제' : '카드 등록'}</>}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: 28, padding: 20, background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--line)', fontSize: 12, color: 'var(--ink-faint)', lineHeight: 1.7 }}>
          <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--ink)', fontSize: 13 }}>결제 안내</div>
          결제는 <strong>토스페이먼츠</strong>로 안전하게 처리됩니다. 국내에서 발급한 신용·체크카드를 지원합니다.
          표시된 요금은 부가세 별도이며, 실제 카드 결제는 부가세 10%를 더한 금액(월 결제금액)으로 청구됩니다.
          카드를 먼저 등록한 뒤, 등록된 카드와 결제 금액을 확인하고 「결제하기」를 눌러야 결제됩니다. 이후 매월 자동 결제되며, 구독을 해지하지 않는 한 매월 자동 갱신되며, 결제 시마다 1개월 이용권이 발급됩니다.
          환불 및 결제 문의: <a href="mailto:contact@qualy-tree.com" style={{ color: 'var(--moss)' }}>contact@qualy-tree.com</a>
        </div>
      </div>
    </AppLayout>
  )
}
