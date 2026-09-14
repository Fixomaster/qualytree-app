// api/payments/toss-confirm.js — 토스페이먼츠 서버사이드 결제 승인 API
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { paymentKey, orderId, amount, companyId, plan } = req.body
  if (!paymentKey || !orderId || !amount) {
    return res.status(400).json({ ok: false, error: '필수 값 누락 (paymentKey, orderId, amount)' })
  }

  const secretKey = process.env.TOSS_SECRET_KEY
  if (!secretKey) return res.status(500).json({ ok: false, error: 'TOSS_SECRET_KEY not set' })

  // 1. Toss Payments API로 결제 승인
  const tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(secretKey + ':').toString('base64'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  })
  const tossData = await tossRes.json()

  if (!tossRes.ok) {
    return res.status(400).json({ ok: false, error: tossData.message || '토스 결제 승인 실패', code: tossData.code })
  }

  // 2. Supabase에 결제 기록 저장
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  await supabase.from('payments').insert({
    company_id: companyId ?? null,
    payment_key: tossData.paymentKey,
    order_id: orderId,
    amount,
    plan: plan ?? null,
    method: tossData.method,
    status: 'paid',
    raw: tossData,
    created_at: new Date().toISOString(),
  })

  // 3. 구독 플랜 업데이트
  if (companyId && plan) {
    const expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + 1)
    await supabase.from('subscriptions').upsert({
      company_id: companyId,
      plan,
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id' })
  }

  return res.status(200).json({ ok: true, paymentKey: tossData.paymentKey, plan, amount })
}
