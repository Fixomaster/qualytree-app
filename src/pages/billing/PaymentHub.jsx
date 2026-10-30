// src/pages/billing/PaymentHub.jsx — 플랜 선택 및 토스페이먼츠 v2 빌링(정기결제) 연동
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { auth } from '../../lib/auth'
import AppLayout from '../../components/AppLayout'
import { CreditCard, Check, Sparkles, RefreshCw } from 'lucide-react'
import { loadPlans, priceFor, won as fmtWon } from '../../lib/plans'
import { withVat } from '../../lib/planDefaults'
import { BANK_ACCOUNT } from '../../lib/bankAccount'

// 가상계좌는 일반결제 상점(MID)의 클라이언트 키 — 자동결제(bill_) 상점 키와 다르다
const VA_CLIENT_KEY = import.meta.env.VITE_TOSS_PAYMENT_CLIENT_KEY || ''
const BANK_READY = !!(BANK_ACCOUNT.bank && BANK_ACCOUNT.number)

async function callPayment(body) {
  let token = ''
  try { token = (await supabase.auth.getSession()).data?.session?.access_token || '' } catch { /* noop */ }
  const res = await fetch('/api/payments/toss-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: JSON.stringify(body),
  })
  return res.json().catch(() => ({ ok: false, error: '서버 응답을 읽지 못했습니다.' }))
}

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
  const [chooser, setChooser] = useState(null)        // 결제 방법 선택 중인 플랜
  const [method, setMethod] = useState('CARD')
  const [depositor, setDepositor] = useState('')
  const [bankOrder, setBankOrder] = useState(null)    // 무통장입금 주문 결과(입금 안내)
  const [chooserMsg, setChooserMsg] = useState('')
  // 무통장입금 휴대폰 인증(알림톡/문자). otpOn=false 면 인증 없이 진행(발송 설정 전)
  const [otpOn, setOtpOn] = useState(false)
  const [phone, setPhone] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpToken, setOtpToken] = useState('')
  const [verifyToken, setVerifyToken] = useState('')
  const [otpBusy, setOtpBusy] = useState(false)
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

  function openChooser(plan) {
    setChooser(plan); setMethod('CARD'); setDepositor(''); setBankOrder(null); setChooserMsg('')
    setPhone(''); setOtpCode(''); setOtpToken(''); setVerifyToken('')
    callPayment({ action: 'config' }).then((d) => setOtpOn(!!d.otp)).catch(() => setOtpOn(false))
  }

  async function sendOtp() {
    setChooserMsg(''); setOtpBusy(true)
    const d = await callPayment({ action: 'otp-send', phone })
    setOtpBusy(false)
    if (d.ok) { setOtpToken(d.otpToken); setVerifyToken(''); setOtpCode(''); setChooserMsg('') }
    else setChooserMsg(d.error || '인증번호를 보내지 못했습니다.')
  }

  async function checkOtp() {
    setChooserMsg(''); setOtpBusy(true)
    const d = await callPayment({ action: 'otp-verify', phone, code: otpCode, otpToken })
    setOtpBusy(false)
    if (d.ok) setVerifyToken(d.verifyToken); else setChooserMsg(d.error || '인증에 실패했습니다.')
  }

  async function proceed() {
    const plan = chooser
    const cid = companyId || auth.current()?.company?.id
    if (!cid) { setChooserMsg('회사 정보를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.'); return }
    setChooserMsg('')
    if (method === 'CARD') { setChooser(null); return handleCheckout(plan) }
    if (method === 'BANK') {
      if (!depositor.trim()) { setChooserMsg('입금자명을 입력해 주세요.'); return }
      if (otpOn && !verifyToken) { setChooserMsg('휴대폰 인증을 먼저 완료해 주세요.'); return }
      setLoading(true)
      const d = await callPayment({ action: 'order', method: 'BANK', companyId: cid, plan: plan.id, depositor, phone, verifyToken })
      setLoading(false)
      if (d.ok) setBankOrder(d); else setChooserMsg(d.error || '주문을 만들지 못했습니다.')
      return
    }
    // 가상계좌: 서버에서 주문(금액)을 먼저 만들고 토스 결제창으로 계좌 발급
    if (!sdkLoaded || !window.TossPayments) { setChooserMsg('결제 모듈을 불러오는 중입니다. 잠시 후 다시 시도해 주세요.'); return }
    setLoading(true)
    const d = await callPayment({ action: 'order', method: 'VIRTUAL_ACCOUNT', companyId: cid, plan: plan.id })
    if (!d.ok) { setLoading(false); setChooserMsg(d.error || '주문을 만들지 못했습니다.'); return }
    try {
      const payment = window.TossPayments(VA_CLIENT_KEY).payment({ customerKey: cid })
      await payment.requestPayment({
        method: 'VIRTUAL_ACCOUNT',
        amount: { currency: 'KRW', value: d.price.total },
        orderId: d.orderId,
        orderName: d.orderName,
        successUrl: window.location.origin + '/billing/success?type=va&plan=' + plan.id + '&companyId=' + cid,
        failUrl: window.location.origin + '/billing?fail=1',
        virtualAccount: { validHours: 72 },
      })
    } catch (e) {
      if (e.code !== 'USER_CANCEL') setChooserMsg('가상계좌 발급 오류: ' + e.message)
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
            {expiresAt && ' · 만료일: ' + expiresAt.slice(0, 10)}
          </p>
          <p style={{ color: 'var(--ink-faint)', margin: '2px 0 0', fontSize: 12 }}>
            요금은 VAT 별도이며, 결제 시 부가세 10%가 더해진 금액으로 청구됩니다. 결제 방법은 카드 자동결제·가상계좌·무통장입금 중에서 고를 수 있습니다.
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
                  <button onClick={() => openChooser(plan)} disabled={loading || !sdkLoaded}
                    style={{
                      padding: '10px', background: plan.color, color: '#fff', border: 'none',
                      borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      opacity: loading || !sdkLoaded ? 0.7 : 1
                    }}>
                    {loadingId === plan.id ? <><RefreshCw size={14} /> 처리 중…</> : <><Sparkles size={14} /> {plan.id === 'test' ? '시험 결제' : '결제하기'}</>}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: 28, padding: 20, background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--line)', fontSize: 12, color: 'var(--ink-faint)', lineHeight: 1.7 }}>
          <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--ink)', fontSize: 13 }}>결제 안내</div>
          결제는 <strong>토스페이먼츠</strong>로 안전하게 처리됩니다. 국내에서 발급한 신용·체크카드, 가상계좌, 무통장입금을 지원합니다.
          가상계좌·무통장입금은 1개월분씩 결제하며, 입금이 확인되면 이용이 시작됩니다(가상계좌는 자동, 무통장입금은 운영팀 확인 후).
          표시된 요금은 부가세 별도이며, 실제 카드 결제는 부가세 10%를 더한 금액(월 결제금액)으로 청구됩니다.
          카드를 먼저 등록한 뒤, 등록된 카드와 결제 금액을 확인하고 「결제하기」를 눌러야 결제됩니다. 이후 매월 자동 결제되며, 구독을 해지하지 않는 한 매월 자동 갱신되며, 결제 시마다 1개월 이용권이 발급됩니다.
          환불 및 결제 문의: <a href="mailto:contact@qualy-tree.com" style={{ color: 'var(--moss)' }}>contact@qualy-tree.com</a>
        </div>
        {chooser && (() => { const v = withVat(chooser.price); const opt = (id, title, desc, disabled) => (
          <label key={id} style={{ display: 'flex', gap: 10, padding: '12px 14px', border: '1.5px solid ' + (method === id ? 'var(--moss)' : 'var(--line)'), borderRadius: 10, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, background: method === id ? '#f0fdf4' : '#ffffff' }}>
            <input type="radio" name="paymethod" checked={method === id} disabled={disabled} onChange={() => setMethod(id)} style={{ marginTop: 3 }} />
            <span><span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{title}</span>{disabled && <span style={{ fontSize: 11, marginLeft: 6, color: 'var(--ink-faint)' }}>준비 중</span>}
              <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)', marginTop: 2 }}>{desc}</span></span>
          </label>)
          return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }} onClick={() => !loading && setChooser(null)}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: '#ffffff', borderRadius: 14, width: '100%', maxWidth: 460, padding: 24, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>{chooser.label}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 4, fontSize: 13, color: 'var(--ink)', padding: '10px 12px', background: 'var(--bg)', borderRadius: 8, margin: '10px 0 16px' }}>
                <span style={{ color: 'var(--ink-faint)' }}>공급가액</span><span>{fmtWon(v.supply)}</span>
                <span style={{ color: 'var(--ink-faint)' }}>부가세 (10%)</span><span>{fmtWon(v.vat)}</span>
                <span style={{ fontWeight: 700 }}>결제금액 (부가세 포함)</span><span style={{ fontWeight: 700 }}>{fmtWon(v.total)}</span>
              </div>
              {bankOrder ? (
                <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.8 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>아래 계좌로 입금해 주세요</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 14, padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 8 }}>
                    <span style={{ color: 'var(--ink-faint)' }}>은행</span><span>{bankOrder.bank.bank}</span>
                    <span style={{ color: 'var(--ink-faint)' }}>계좌번호</span><span style={{ fontWeight: 700 }}>{bankOrder.bank.number}</span>
                    <span style={{ color: 'var(--ink-faint)' }}>예금주</span><span>{bankOrder.bank.holder}</span>
                    <span style={{ color: 'var(--ink-faint)' }}>입금액</span><span style={{ fontWeight: 700 }}>{fmtWon(bankOrder.price.total)}</span>
                    <span style={{ color: 'var(--ink-faint)' }}>입금자명</span><span>{bankOrder.bank.depositor}</span>
                    <span style={{ color: 'var(--ink-faint)' }}>주문번호</span><span style={{ fontSize: 12 }}>{bankOrder.orderId}</span>
                  </div>
                  {bankOrder.notified && <div style={{ fontSize: 12, color: '#16a34a', marginTop: 8 }}>✓ 같은 안내를 인증한 휴대폰으로 보내드렸습니다.</div>}
                  <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 8 }}>입금자명과 금액이 같아야 빠르게 확인됩니다. 운영팀이 입금을 확인하면 이용이 시작되고 메일로 안내드립니다.</div>
                  <button onClick={() => setChooser(null)} style={{ marginTop: 16, width: '100%', padding: 12, background: 'var(--moss)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>확인</button>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>결제 방법</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {opt('CARD', '카드 자동결제', '카드를 등록하고 확인 후 결제 · 이후 매월 자동 결제', false)}
                    {chooser.id !== 'test' && opt('VIRTUAL_ACCOUNT', '가상계좌 (계좌이체)', '전용 계좌를 발급받아 입금 · 입금 즉시 자동으로 이용 시작 · 1개월분', !VA_CLIENT_KEY)}
                    {chooser.id !== 'test' && opt('BANK', '무통장입금', '회사 계좌로 직접 송금 · 운영팀 입금 확인 후 이용 시작 · 1개월분', !BANK_READY)}
                  </div>
                  {method === 'BANK' && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 4 }}>입금자명</div>
                      <input value={depositor} onChange={(e) => setDepositor(e.target.value)} placeholder="통장에 찍힐 입금자명 (예: 주식회사OO)" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                      {otpOn && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 4 }}>담당자 휴대폰 인증 <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>· 입금 안내를 카카오톡으로 보내드립니다</span></div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <input value={phone} onChange={(e) => { setPhone(e.target.value); setOtpToken(''); setVerifyToken('') }} disabled={!!verifyToken} inputMode="numeric" placeholder="휴대폰 번호 (- 없이)" style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 14 }} />
                            <button onClick={sendOtp} disabled={otpBusy || !!verifyToken || phone.replace(/\D/g, '').length < 10} style={{ padding: '0 12px', border: '1px solid var(--moss)', color: 'var(--moss)', background: '#fff', borderRadius: 8, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>{otpToken ? '다시 받기' : '인증번호 받기'}</button>
                          </div>
                          {otpToken && !verifyToken && (
                            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                              <input value={otpCode} onChange={(e) => setOtpCode(e.target.value)} inputMode="numeric" maxLength={6} placeholder="인증번호 6자리 (5분 이내)" style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 14 }} />
                              <button onClick={checkOtp} disabled={otpBusy || otpCode.length < 6} style={{ padding: '0 14px', background: 'var(--moss)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>확인</button>
                            </div>
                          )}
                          {verifyToken && <div style={{ marginTop: 6, fontSize: 12, color: '#16a34a' }}>✓ 휴대폰 인증 완료</div>}
                        </div>
                      )}
                    </div>
                  )}
                  {chooserMsg && <div style={{ marginTop: 10, fontSize: 13, color: '#dc2626' }}>{chooserMsg}</div>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                    <button onClick={() => setChooser(null)} disabled={loading} style={{ flex: 1, padding: 12, background: 'transparent', border: '1px solid var(--line)', borderRadius: 8, cursor: 'pointer', color: 'var(--ink)' }}>취소</button>
                    <button onClick={proceed} disabled={loading} style={{ flex: 2, padding: 12, background: 'var(--moss)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
                      {loading ? '처리 중…' : method === 'CARD' ? '카드 등록하기' : method === 'VIRTUAL_ACCOUNT' ? '가상계좌 발급받기' : '입금 안내 받기'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>) })()}
      </div>
    </AppLayout>
  )
}
