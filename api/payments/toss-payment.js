// api/payments/toss-payment.js — 통장 결제(가상계좌·무통장입금) 서버 API (2026-10-30)
//
// action 'order'        (로그인 필요) 주문 생성. 금액은 서버가 요금제에서 계산(VAT 포함)해 payments 에 pending 으로 저장.
//                        method 'VIRTUAL_ACCOUNT' → 토스 결제창에 넘길 orderId·금액 반환
//                        method 'BANK'            → 회사 입금 계좌·입금액·입금자명 안내 반환(운영자가 입금 확인)
// action 'confirm'      (로그인 필요) 토스 가상계좌 발급 승인 — 저장된 주문 금액과 대조 후 /v1/payments/confirm
// action 'bank-confirm' (운영자만)  무통장입금 확인 → 결제 완료 처리 + 구독 활성화
// kind=webhook          토스 웹훅(/api/webhooks/toss → 이 함수). 가상계좌 입금 시 토스에 결제 상태를 직접 조회해
//                        DONE 이면 결제 완료 + 구독 활성화. 항상 200 을 바로 돌려준다(토스 재시도 정책).
//
// 가상계좌는 일반결제 상점(MID)의 키를 쓴다(자동결제 bill_ 상점과 다름):
//   서버 TOSS_PAYMENT_SECRET_KEY, 브라우저 VITE_TOSS_PAYMENT_CLIENT_KEY
import { TOSS, serverPlan, authorize, whoIs, tossHeaders, supabaseAdmin, activateSubscription } from '../_lib/billingCommon.js'
import { BANK_ACCOUNT } from '../../src/lib/bankAccount.js'
import * as notify from '../_lib/notify.js'
import * as mail from '../_lib/mail.js'

const fmt = (n) => Number(n || 0).toLocaleString('ko-KR')
const ymd = (d) => new Date(d).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })

const secretKey = () => process.env.TOSS_PAYMENT_SECRET_KEY || ''

async function markPaid(supabase, row, extra = {}) {
  if (row.status === 'paid') return
  await supabase.from('payments').update({ status: 'paid', ...extra }).eq('id', row.id)
  const v = { id: row.plan, amount: Number(row.amount) }
  if (row.plan !== 'test') await activateSubscription(supabase, row.company_id, v)
  const start = new Date(); const end = new Date(); end.setMonth(end.getMonth() + 1)
  const vars = {
    회사명: row.raw?.companyName || '', 입금액: fmt(row.amount), 요금제: row.raw?.planName || row.plan,
    시작일: ymd(start), 종료일: ymd(end), 주문번호: row.order_id,
  }
  if (row.raw?.email) {
    await mail.send(row.raw.email, '[퀄리트리] 입금이 확인되어 이용이 시작되었습니다', '입금 확인 안내', [
      ['회사', vars.회사명], ['요금제', vars.요금제], ['입금액', vars.입금액 + '원 (부가세 포함)'],
      ['이용 기간', vars.시작일 + ' ~ ' + vars.종료일], ['주문번호', vars.주문번호],
    ])
  }
  if (row.raw?.phone) await notify.send('PAID', row.raw.phone, vars)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const supabase = await supabaseAdmin()
  if (!supabase) return res.status(500).json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY not set' })

  // ── 토스 웹훅 ─────────────────────────────────────────────────────────
  if (req.query?.kind === 'webhook') {
    try {
      const b = req.body || {}
      const orderId = b.orderId || b.data?.orderId
      if (orderId && secretKey()) {
        const r = await fetch(TOSS + '/v1/payments/orders/' + encodeURIComponent(orderId), { headers: tossHeaders(secretKey()) })
        const pay = await r.json().catch(() => ({}))
        const { data: row } = await supabase.from('payments').select('*').eq('order_id', orderId).maybeSingle()
        if (r.ok && row) {
          if (pay.status === 'DONE' && Number(pay.totalAmount) === Number(row.amount)) {
            await markPaid(supabase, row, { payment_key: pay.paymentKey, raw: pay })
          } else if (['CANCELED', 'ABORTED', 'EXPIRED'].includes(pay.status) && row.status === 'pending') {
            await supabase.from('payments').update({ status: 'failed', fail_reason: pay.status, raw: pay }).eq('id', row.id)
          }
        }
      }
    } catch (e) { console.error('[toss webhook]', e) }
    return res.status(200).send('ok')
  }

  const body = req.body || {}
  const action = body.action

  // ── 화면 설정: 이메일 인증·카카오톡 안내 사용 여부 ─────────────────────
  if (action === 'config') return res.status(200).json({ ok: true, emailOtp: mail.enabled(), kakao: notify.enabled() })

  // ── 이메일 인증번호 발송·확인 (로그인 필요) ────────────────────────────
  if (action === 'otp-send' || action === 'otp-verify') {
    const me = await whoIs(supabase, req)
    if (me.error) return res.status(401).json({ ok: false, error: me.error })
    if (!mail.enabled()) return res.status(503).json({ ok: false, error: '이메일 인증이 아직 설정되지 않았습니다.' })
    if (!mail.validEmail(body.email)) return res.status(400).json({ ok: false, error: '이메일 주소를 확인해 주세요.' })
    if (action === 'otp-send') {
      const { code, otpToken } = notify.issueOtp(body.email)
      const r = await mail.send(body.email, '[퀄리트리] 이메일 인증번호 ' + code, '이메일 인증번호',
        [['인증번호', code]], '결제 화면에 위 인증번호를 입력해 주세요. 5분 동안 유효합니다. 본인이 요청하지 않았다면 이 메일을 무시해 주세요.')
      if (!r.ok) return res.status(502).json({ ok: false, error: '인증 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.' })
      return res.status(200).json({ ok: true, otpToken })
    }
    const v = notify.verifyOtp(body.email, body.code, body.otpToken)
    if (v.error) return res.status(400).json({ ok: false, error: v.error })
    return res.status(200).json({ ok: true, verifyToken: v.verifyToken })
  }

  // ── 무통장입금 확인 (운영자) ──────────────────────────────────────────
  if (action === 'bank-confirm') {
    const me = await whoIs(supabase, req)
    if (me.error) return res.status(401).json({ ok: false, error: me.error })
    if (!me.operator) return res.status(403).json({ ok: false, error: '운영자만 입금 확인을 할 수 있습니다.' })
    const { data: row } = await supabase.from('payments').select('*').eq('order_id', body.orderId).maybeSingle()
    if (!row) return res.status(404).json({ ok: false, error: '주문을 찾을 수 없습니다.' })
    if (row.method !== '무통장입금') return res.status(400).json({ ok: false, error: '무통장입금 주문이 아닙니다.' })
    await markPaid(supabase, row, { raw: { ...(row.raw || {}), confirmedBy: me.uid, confirmedAt: new Date().toISOString() } })
    return res.status(200).json({ ok: true })
  }

  const { companyId, plan } = body
  if (!companyId || !plan) return res.status(400).json({ ok: false, error: '필수 값 누락 (companyId, plan)' })
  const { data: company } = await supabase.from('companies').select('id, name').eq('id', companyId).maybeSingle()
  if (!company) return res.status(400).json({ ok: false, error: '등록된 회사가 아닙니다.' })
  const denied = await authorize(supabase, req, companyId)
  if (denied) return res.status(401).json({ ok: false, error: denied })
  const p = await serverPlan(supabase, plan)
  if (!p) return res.status(400).json({ ok: false, error: '결제할 수 없는 요금제입니다.' })
  const price = { supply: p.supply, vat: p.vat, total: p.amount }

  // ── 주문 생성 ─────────────────────────────────────────────────────────
  if (action === 'order') {
    const method = body.method
    if (method === 'VIRTUAL_ACCOUNT' && !secretKey()) {
      return res.status(503).json({ ok: false, error: '가상계좌 결제가 아직 설정되지 않았습니다. 다른 결제 방법을 선택해 주세요.' })
    }
    if (method === 'BANK' && !(BANK_ACCOUNT.bank && BANK_ACCOUNT.number)) {
      return res.status(503).json({ ok: false, error: '무통장입금 계좌가 아직 등록되지 않았습니다. 다른 결제 방법을 선택해 주세요.' })
    }
    if (!['VIRTUAL_ACCOUNT', 'BANK'].includes(method)) return res.status(400).json({ ok: false, error: '결제 방법이 올바르지 않습니다.' })
    const depositor = String(body.depositor || '').trim().slice(0, 40)
    if (method === 'BANK' && !depositor) return res.status(400).json({ ok: false, error: '입금자명을 입력해 주세요.' })
    const email = String(body.email || '').trim().toLowerCase()
    if (method === 'BANK' && mail.enabled() && !notify.checkVerified(email, body.verifyToken)) {
      return res.status(400).json({ ok: false, error: '이메일 인증을 먼저 완료해 주세요.', code: 'EMAIL_NOT_VERIFIED' })
    }
    // 카카오톡 안내용 휴대폰(선택) — 알림톡 설정이 켜져 있고 형식이 맞을 때만 저장
    const phone = notify.enabled() && notify.validPhone(body.phone) ? notify.normalizePhone(body.phone) : ''

    const orderId = (method === 'BANK' ? 'QT-BANK-' : 'QT-VA-') + companyId.replace(/-/g, '').slice(0, 8) + '-' + Date.now()
    const orderName = 'Qualytree ' + p.name + ' 1개월 이용'
    const { error } = await supabase.from('payments').insert({
      company_id: companyId, order_id: orderId, amount: p.amount, plan: p.id, status: 'pending',
      method: method === 'BANK' ? '무통장입금' : '가상계좌',
      raw: { supply: p.supply, vat: p.vat, depositor: depositor || null, companyName: company.name, planName: p.name, email: email || null, phone: phone || null },
      created_at: new Date().toISOString(),
    })
    if (error) { console.error('[toss-payment] order save failed', error); return res.status(500).json({ ok: false, error: '주문을 저장하지 못했습니다.' }) }
    const notified = { email: false, kakao: false }
    if (method === 'BANK') {
      if (email && mail.enabled()) {
        const r = await mail.send(email, '[퀄리트리] 무통장입금 안내 — ' + fmt(p.amount) + '원', '무통장입금 안내', [
          ['회사', company.name || ''], ['요금제', p.name], ['입금액', fmt(p.amount) + '원 (부가세 포함)'],
          ['입금 계좌', BANK_ACCOUNT.bank + ' ' + BANK_ACCOUNT.number], ['예금주', BANK_ACCOUNT.holder],
          ['입금자명', depositor], ['주문번호', orderId],
        ], '입금자명과 금액이 같아야 빠르게 확인됩니다. 입금이 확인되면 이용이 시작되고 다시 안내드립니다.')
        notified.email = !!r.ok
      }
      if (phone) {
        const r = await notify.send('BANK', phone, {
          회사명: company.name || '', 요금제: p.name, 입금액: fmt(p.amount), 은행: BANK_ACCOUNT.bank,
          계좌번호: BANK_ACCOUNT.number, 예금주: BANK_ACCOUNT.holder, 입금자명: depositor, 주문번호: orderId,
        })
        notified.kakao = !!r.ok
      }
    }
    return res.status(200).json({
      ok: true, orderId, orderName, price, planName: p.name,
      bank: method === 'BANK' ? { ...BANK_ACCOUNT, depositor } : undefined, notified,
    })
  }

  // ── 가상계좌 발급 승인 ────────────────────────────────────────────────
  if (action === 'confirm') {
    const { paymentKey, orderId } = body
    const amount = Number(body.amount)
    if (!paymentKey || !orderId) return res.status(400).json({ ok: false, error: '결제 정보가 올바르지 않습니다.' })
    const { data: row } = await supabase.from('payments').select('*').eq('order_id', orderId).eq('company_id', companyId).maybeSingle()
    if (!row) return res.status(404).json({ ok: false, error: '주문을 찾을 수 없습니다.' })
    if (Number(row.amount) !== amount) return res.status(400).json({ ok: false, error: '결제 금액이 주문과 다릅니다.', code: 'AMOUNT_MISMATCH' })

    const r = await fetch(TOSS + '/v1/payments/confirm', {
      method: 'POST', headers: tossHeaders(secretKey()), body: JSON.stringify({ paymentKey, orderId, amount }),
    })
    const pay = await r.json().catch(() => ({}))
    if (!r.ok) {
      await supabase.from('payments').update({ status: 'failed', fail_reason: pay.code || 'CONFIRM_FAILED', raw: { ...(row.raw || {}), confirm: pay } }).eq('id', row.id)
      return res.status(400).json({ ok: false, error: pay.message || '가상계좌 발급 실패', code: pay.code })
    }
    await supabase.from('payments').update({ payment_key: pay.paymentKey, raw: { ...(row.raw || {}), confirm: pay } }).eq('id', row.id)
    if (pay.status === 'DONE') await markPaid(supabase, row)
    const va = pay.virtualAccount || {}
    return res.status(200).json({
      ok: true, price, planName: p.name, status: pay.status,
      account: { bankCode: va.bankCode, accountNumber: va.accountNumber, customerName: va.customerName, dueDate: va.dueDate },
    })
  }

  return res.status(400).json({ ok: false, error: '알 수 없는 요청' })
}
