// api/payments/toss-billing-issue.js — 빌링키 발급 + 첫 결제 실행 서버 API
// 순서(라이브 전환 대비 2026-10-30 재작성):
//  0) 금액은 서버가 요금제에서 직접 계산한다 — 브라우저 주소의 amount 는 신뢰하지 않음(변조 시 1원 결제 방지)
//     요금표는 VAT 별도(공급가액) → 실제 청구액 = 공급가액 + 부가세 10% (2026-10-30 대표 결정)
//  1) authKey + customerKey로 빌링키 발급 (POST /v1/billing/authorizations/issue)
//  2) 빌링키를 먼저 구독 테이블에 저장 — 빌링키는 재조회가 불가하므로 저장 실패 시 결제하지 않고 중단
//  3) 빌링키로 첫 결제 실행 (POST /v1/billing/{billingKey})
//  4) 결제 기록 저장 + 구독 활성화(만료일 +1개월)
import { DEFAULT_PLANS, withVat } from '../../src/lib/planDefaults.js'

const TOSS = 'https://api.tosspayments.com'

function supabaseAdmin(createClient) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

// 운영자 콘솔에서 바꾼 요금제(platform_config.plans)가 있으면 그것을, 없으면 기본 요금제를 쓴다.
async function serverPlan(supabase, planId) {
  let list = DEFAULT_PLANS
  try {
    const { data } = await supabase.from('platform_config').select('value').eq('key', 'plans').maybeSingle()
    if (Array.isArray(data?.value) && data.value.length) list = data.value
  } catch { /* 기본 요금제 사용 */ }
  const p = list.find((x) => x && x.id === planId) || DEFAULT_PLANS.find((x) => x.id === planId)
  if (!p || p.custom || !(Number(p.monthly) > 0)) return null
  const v = withVat(p.monthly)
  return { id: p.id, name: p.name, supply: v.supply, vat: v.vat, amount: v.total }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { authKey, customerKey, companyId, plan } = req.body || {}
  if (!authKey || !customerKey || !companyId || !plan) {
    return res.status(400).json({ ok: false, error: '필수 값 누락 (authKey, customerKey, companyId, plan)' })
  }
  // 결제창은 customerKey = 회사 id 로 호출된다(PaymentHub). 다르면 다른 회사로 결제를 붙이려는 요청.
  if (customerKey !== companyId) {
    return res.status(400).json({ ok: false, error: '회사 정보가 일치하지 않습니다.' })
  }

  const secretKey = process.env.TOSS_SECRET_KEY
  if (!secretKey) return res.status(500).json({ ok: false, error: 'TOSS_SECRET_KEY not set' })

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = supabaseAdmin(createClient)
  if (!supabase) return res.status(500).json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY not set' })

  const { data: company } = await supabase.from('companies').select('id').eq('id', companyId).maybeSingle()
  if (!company) return res.status(400).json({ ok: false, error: '등록된 회사가 아닙니다.' })

  const p = await serverPlan(supabase, plan)
  if (!p) return res.status(400).json({ ok: false, error: '결제할 수 없는 요금제입니다.' })

  const authHeader = 'Basic ' + Buffer.from(secretKey + ':').toString('base64')

  // 1. 빌링키 발급
  const issueRes = await fetch(TOSS + '/v1/billing/authorizations/issue', {
    method: 'POST',
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ authKey, customerKey }),
  })
  const issueData = await issueRes.json().catch(() => ({}))
  if (!issueRes.ok || !issueData.billingKey) {
    return res.status(400).json({ ok: false, error: issueData.message || '빌링키 발급 실패', code: issueData.code })
  }
  const billingKey = issueData.billingKey

  // 2. 빌링키 먼저 저장 — 실패하면 결제하지 않는다(돈만 빠지고 기록이 없는 상황 방지)
  const now = new Date().toISOString()
  const { error: keyErr } = await supabase.from('subscriptions').upsert({
    company_id: companyId,
    billing_key: billingKey,
    customer_key: customerKey,
    billing_status: 'card_registered',
    updated_at: now,
  }, { onConflict: 'company_id' })
  if (keyErr) {
    console.error('[toss-billing-issue] billing key save failed', keyErr)
    return res.status(500).json({ ok: false, error: '카드 등록 정보를 저장하지 못해 결제를 진행하지 않았습니다. 운영팀에 문의해 주세요.', code: 'SAVE_FAILED' })
  }

  // 3. 첫 결제
  const orderId = 'QT-BILL-' + companyId.replace(/-/g, '').slice(0, 8) + '-' + Date.now()
  const orderName = 'Qualytree ' + p.name + ' 월 구독'
  const billingRes = await fetch(TOSS + '/v1/billing/' + encodeURIComponent(billingKey), {
    method: 'POST',
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerKey, amount: p.amount, orderId, orderName }),
  })
  const billingData = await billingRes.json().catch(() => ({}))

  if (!billingRes.ok) {
    await supabase.from('payments').insert({
      company_id: companyId, order_id: orderId, amount: p.amount, plan: p.id,
      status: 'failed', fail_reason: billingData.code || 'UNKNOWN', raw: billingData, created_at: now,
    })
    return res.status(400).json({ ok: false, error: billingData.message || '첫 결제 실패', code: billingData.code })
  }

  // 4. 결제 기록 + 구독 활성화
  const { error: payErr } = await supabase.from('payments').insert({
    company_id: companyId,
    payment_key: billingData.paymentKey,
    order_id: orderId,
    amount: p.amount,
    plan: p.id,
    method: billingData.method ?? '카드',
    status: 'paid',
    raw: billingData,
    created_at: now,
  })
  if (payErr) console.error('[toss-billing-issue] payment record save failed', orderId, payErr)

  const expiresAt = new Date()
  expiresAt.setMonth(expiresAt.getMonth() + 1)
  const { error: subErr } = await supabase.from('subscriptions').upsert({
    company_id: companyId,
    plan: p.id,
    amount: p.amount,
    billing_status: 'active',
    expires_at: expiresAt.toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'company_id' })
  if (subErr) console.error('[toss-billing-issue] subscription activate failed', orderId, subErr)

  return res.status(200).json({
    ok: true, plan: p.id, supply: p.supply, vat: p.vat, amount: p.amount, paymentKey: billingData.paymentKey, orderId,
    warning: payErr || subErr ? '결제는 완료됐으나 기록 저장 중 문제가 있었습니다. 운영팀이 확인합니다.' : undefined,
  })
}
