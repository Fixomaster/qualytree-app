// api/payments/toss-billing-issue.js — 토스 자동결제(빌링) 서버 API
//
// 2026-10-30 구조 변경(대표 지시): 「카드 등록」과 「결제」를 분리한다.
//   action 'issue'  : 카드 등록창 완료 후 빌링키 발급·저장만 한다(결제 없음). 등록된 카드사·카드번호(마스킹)와
//                     결제 예정 금액(공급가액·부가세·합계)을 돌려줘 화면에서 확인 후 결제 여부를 고르게 한다.
//   action 'charge' : 사용자가 「결제하기」를 눌렀을 때 저장된 빌링키로 결제한다.
//   plan 'test'     : 1,000원(+부가세 100원) 시험 결제 — 결제 직후 자동 취소(환불)하고 요금제는 바꾸지 않는다.
//
// 공통 규칙
//  - 로그인한 사용자(Supabase 세션)가 그 회사 소속(company_members)이거나 운영자일 때만 처리한다.
//  - 금액은 서버가 요금제에서 직접 계산한다(브라우저 값 신뢰 안 함). 요금표는 VAT 별도 → 청구액 = 공급가액 + 10%.
//  - 빌링키는 재조회가 불가하므로 저장에 실패하면 그 뒤 단계로 가지 않는다.
import { TOSS, serverPlan, authorize, tossHeaders, supabaseAdmin, activateSubscription } from '../_lib/billingCommon.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const body = req.body || {}
  const action = body.action || 'issue'
  const { companyId, plan } = body
  if (!companyId || !plan) return res.status(400).json({ ok: false, error: '필수 값 누락 (companyId, plan)' })

  const secretKey = process.env.TOSS_SECRET_KEY
  if (!secretKey) return res.status(500).json({ ok: false, error: 'TOSS_SECRET_KEY not set' })

  const supabase = await supabaseAdmin()
  if (!supabase) return res.status(500).json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY not set' })

  const { data: company } = await supabase.from('companies').select('id').eq('id', companyId).maybeSingle()
  if (!company) return res.status(400).json({ ok: false, error: '등록된 회사가 아닙니다.' })

  const denied = await authorize(supabase, req, companyId)
  if (denied) return res.status(401).json({ ok: false, error: denied })

  const p = await serverPlan(supabase, plan)
  if (!p) return res.status(400).json({ ok: false, error: '결제할 수 없는 요금제입니다.' })
  const price = { supply: p.supply, vat: p.vat, total: p.amount }

  // ── 1단계: 카드 등록(빌링키 발급·저장) — 결제하지 않는다 ─────────────────
  if (action === 'issue') {
    const { authKey, customerKey } = body
    if (!authKey || !customerKey) return res.status(400).json({ ok: false, error: '카드 등록 정보가 올바르지 않습니다.' })
    if (customerKey !== companyId) return res.status(400).json({ ok: false, error: '회사 정보가 일치하지 않습니다.' })

    const issueRes = await fetch(TOSS + '/v1/billing/authorizations/issue', {
      method: 'POST', headers: tossHeaders(secretKey), body: JSON.stringify({ authKey, customerKey }),
    })
    const issueData = await issueRes.json().catch(() => ({}))
    if (!issueRes.ok || !issueData.billingKey) {
      return res.status(400).json({ ok: false, stage: 'issue', error: issueData.message || '카드 등록 실패', code: issueData.code })
    }

    const { error: keyErr } = await supabase.from('subscriptions').upsert({
      company_id: companyId,
      billing_key: issueData.billingKey,
      customer_key: customerKey,
      billing_status: 'card_registered',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id' })
    if (keyErr) {
      console.error('[billing] billing key save failed', keyErr)
      return res.status(500).json({ ok: false, stage: 'issue', error: '카드 등록 정보를 저장하지 못했습니다. 운영팀에 문의해 주세요.', code: 'SAVE_FAILED' })
    }

    return res.status(200).json({
      ok: true, stage: 'issue', plan: p.id, planName: p.name, test: p.test, price,
      card: {
        company: issueData.cardCompany || issueData.card?.issuerCode || '',
        number: issueData.cardNumber || issueData.card?.number || '',
        type: issueData.card?.cardType || '',
        owner: issueData.card?.ownerType || '',
      },
    })
  }

  // ── 2단계: 사용자가 「결제하기」를 눌렀을 때 결제 ────────────────────────
  if (action === 'charge') {
    const { data: sub } = await supabase.from('subscriptions')
      .select('billing_key, customer_key').eq('company_id', companyId).maybeSingle()
    if (!sub?.billing_key) return res.status(400).json({ ok: false, stage: 'charge', error: '등록된 카드가 없습니다. 카드를 먼저 등록해 주세요.' })

    const now = new Date().toISOString()
    const orderId = (p.test ? 'QT-TEST-' : 'QT-BILL-') + companyId.replace(/-/g, '').slice(0, 8) + '-' + Date.now()
    const orderName = 'Qualytree ' + p.name + (p.test ? '' : ' 월 구독')
    const payRes = await fetch(TOSS + '/v1/billing/' + encodeURIComponent(sub.billing_key), {
      method: 'POST', headers: tossHeaders(secretKey),
      body: JSON.stringify({ customerKey: sub.customer_key || companyId, amount: p.amount, orderId, orderName }),
    })
    const payData = await payRes.json().catch(() => ({}))

    if (!payRes.ok) {
      await supabase.from('payments').insert({
        company_id: companyId, order_id: orderId, amount: p.amount, plan: p.id,
        status: 'failed', fail_reason: payData.code || 'UNKNOWN', raw: payData, created_at: now,
      })
      return res.status(400).json({ ok: false, stage: 'charge', error: payData.message || '결제 실패', code: payData.code, price })
    }

    // 시험 결제: 바로 취소(환불)하고 요금제는 바꾸지 않는다
    if (p.test) {
      const cancelRes = await fetch(TOSS + '/v1/payments/' + encodeURIComponent(payData.paymentKey) + '/cancel', {
        method: 'POST', headers: tossHeaders(secretKey), body: JSON.stringify({ cancelReason: '퀄리트리 시험 결제 자동 취소' }),
      })
      const cancelData = await cancelRes.json().catch(() => ({}))
      await supabase.from('payments').insert({
        company_id: companyId, payment_key: payData.paymentKey, order_id: orderId, amount: p.amount, plan: p.id,
        method: payData.method ?? '카드', status: cancelRes.ok ? 'refunded' : 'paid',
        fail_reason: cancelRes.ok ? null : 'TEST_CANCEL_FAILED:' + (cancelData.code || ''), raw: payData, created_at: now,
      })
      return res.status(200).json({
        ok: true, stage: 'charge', test: true, refunded: cancelRes.ok, price, orderId,
        warning: cancelRes.ok ? undefined : '시험 결제는 됐지만 자동 취소에 실패했습니다. 토스 상점관리자에서 취소해 주세요.',
      })
    }

    const { error: payErr } = await supabase.from('payments').insert({
      company_id: companyId, payment_key: payData.paymentKey, order_id: orderId, amount: p.amount, plan: p.id,
      method: payData.method ?? '카드', status: 'paid', raw: payData, created_at: now,
    })
    if (payErr) console.error('[billing] payment record save failed', orderId, payErr)

    const { error: subErr } = await activateSubscription(supabase, companyId, p)
    if (subErr) console.error('[billing] subscription activate failed', orderId, subErr)

    return res.status(200).json({
      ok: true, stage: 'charge', test: false, plan: p.id, price, paymentKey: payData.paymentKey, orderId,
      warning: payErr || subErr ? '결제는 완료됐으나 기록 저장 중 문제가 있었습니다. 운영팀이 확인합니다.' : undefined,
    })
  }

  return res.status(400).json({ ok: false, error: '알 수 없는 요청' })
}
