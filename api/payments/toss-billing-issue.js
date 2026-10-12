// api/payments/toss-billing-issue.js — 빌링키 발급 + 첫 결제 실행 서버 API
// 1) authKey + customerKey로 빌링키 발급 (POST /v1/billing/authorizations/issue)
// 2) 빌링키로 첫 결제 실행 (POST /v1/billing/{billingKey})
// 3) payments 테이블에 결제 기록 저장
// 4) subscriptions 테이블에 플랜 + 빌링키 + 만료일 업데이트
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { authKey, customerKey, companyId, plan, amount } = req.body
  if (!authKey || !customerKey) {
    return res.status(400).json({ ok: false, error: '필수 값 누락 (authKey, customerKey)' })
  }
  if (!amount || amount <= 0) {
    return res.status(400).json({ ok: false, error: '결제 금액이 올바르지 않습니다.' })
  }

  const secretKey = process.env.TOSS_SECRET_KEY
  if (!secretKey) return res.status(500).json({ ok: false, error: 'TOSS_SECRET_KEY not set' })

  const authHeader = 'Basic ' + Buffer.from(secretKey + ':').toString('base64')

  // 1. 빌링키 발급
  const issueRes = await fetch('https://api.tosspayments.com/v1/billing/authorizations/issue', {
    method: 'POST',
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ authKey, customerKey }),
  })
  const issueData = await issueRes.json()
  if (!issueRes.ok) {
    return res.status(400).json({ ok: false, error: issueData.message || '빌링키 발급 실패', code: issueData.code })
  }
  const billingKey = issueData.billingKey

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // 2. 첫 번째 결제 실행
  const orderId = 'QT-BILL-' + (companyId || 'guest').slice(0, 8) + '-' + Date.now()
  const orderName = 'Qualytree ' + (plan || '') + ' 구독 (VAT 별도)'
  const billingRes = await fetch('https://api.tosspayments.com/v1/billing/' + billingKey, {
    method: 'POST',
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerKey, amount, orderId, orderName }),
  })
  const billingData = await billingRes.json()
  if (!billingRes.ok) {
    // 빌링키는 발급됐으나 결제 실패 — 구독 테이블에 빌링키는 저장하되 결제 미완으로 처리
    return res.status(400).json({ ok: false, error: billingData.message || '첫 결제 실패', code: billingData.code })
  }

  // 3. 결제 기록 저장
  await supabase.from('payments').insert({
    company_id: companyId ?? null,
    payment_key: billingData.paymentKey,
    order_id: orderId,
    amount,
    plan: plan ?? null,
    method: billingData.method ?? '카드',
    status: 'paid',
    raw: billingData,
    created_at: new Date().toISOString(),
  })

  // 4. 구독 업데이트 (billingKey + customerKey 저장 — subscriptions 테이블에 해당 컬럼 필요)
  if (companyId && plan) {
    const expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + 1)
    // billing_key, customer_key 컬럼이 없으면 해당 필드를 제외하고 기본 upsert 수행
    const { error: upsertErr } = await supabase.from('subscriptions').upsert({
      company_id: companyId,
      plan,
      billing_key: billingKey,
      customer_key: customerKey,
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id' })

    if (upsertErr) {
      // billing_key/customer_key 컬럼 없는 경우 폴백
      await supabase.from('subscriptions').upsert({
        company_id: companyId,
        plan,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'company_id' })
    }
  }

  return res.status(200).json({ ok: true, plan, amount, paymentKey: billingData.paymentKey })
}
