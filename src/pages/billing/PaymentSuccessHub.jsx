// src/pages/billing/PaymentSuccessHub.jsx — 카드 등록 완료 → 결제 확인 → 결제
// 2026-10-30: 카드 등록과 결제를 분리. 카드 등록만으로는 결제하지 않고, 등록된 카드와 결제 금액을
// 보여준 뒤 사용자가 「결제하기」를 눌러야 결제한다. plan=test 는 1,000원(+VAT) 시험 결제 후 자동 환불.
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import { CheckCircle, AlertCircle, RefreshCw, CreditCard } from 'lucide-react'
import { planById } from '../../lib/plans'
import { supabase } from '../../lib/supabase'

const won = (n) => '₩' + Number(n || 0).toLocaleString('ko-KR')

async function callBilling(body) {
  let token = ''
  try { token = (await supabase.auth.getSession()).data?.session?.access_token || '' } catch { /* noop */ }
  const res = await fetch('/api/payments/toss-billing-issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: JSON.stringify(body),
  })
  return res.json().catch(() => ({ ok: false, error: '서버 응답을 읽지 못했습니다.' }))
}

function PriceBox({ price, totalLabel }) {
  if (!price) return null
  return (
    <div style={{ margin: '0 auto 20px', maxWidth: 320, padding: '12px 16px', border: '1px solid var(--line)', borderRadius: 10, fontSize: 14, color: 'var(--ink)', display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 6, textAlign: 'left' }}>
      <span style={{ color: 'var(--ink-faint)' }}>공급가액</span><span>{won(price.supply)}</span>
      <span style={{ color: 'var(--ink-faint)' }}>부가세 (10%)</span><span>{won(price.vat)}</span>
      <span style={{ fontWeight: 700, borderTop: '1px solid var(--line)', paddingTop: 6 }}>{totalLabel}</span>
      <span style={{ fontWeight: 700, borderTop: '1px solid var(--line)', paddingTop: 6 }}>{won(price.total)}</span>
    </div>
  )
}

const btn = (bg, fg = '#fff') => ({
  display: 'inline-block', padding: '12px 24px', background: bg, color: fg, border: bg === 'transparent' ? '1px solid var(--line)' : 'none',
  borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 15, cursor: 'pointer',
})

export default function PaymentSuccessHub() {
  const [params] = useSearchParams()
  const plan = params.get('plan')
  const companyId = params.get('companyId')
  // issuing → registered(결제 확인 대기) → charging → paid | error
  const [status, setStatus] = useState('issuing')
  const [info, setInfo] = useState(null)   // issue 응답(card, price, planName, test)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const started = useRef(false)

  const planName = info?.planName || planById(plan)?.name || plan

  useEffect(() => {
    if (started.current) return
    started.current = true
    const authKey = params.get('authKey')
    const customerKey = params.get('customerKey')
    if (!authKey || !customerKey || !companyId || !plan) {
      setStatus('error'); setError('카드 등록 정보가 올바르지 않습니다.'); return
    }
    callBilling({ action: 'issue', authKey, customerKey, companyId, plan }).then((d) => {
      if (d.ok) { setInfo(d); setStatus('registered') }
      else { setStatus('error'); setError(d.error || '카드 등록 중 오류가 발생했습니다.') }
      // 새로고침 시 같은 authKey로 다시 발급하지 않도록 주소에서 일회용 값을 지운다
      try { window.history.replaceState(null, '', '/billing/success?plan=' + encodeURIComponent(plan) + '&companyId=' + encodeURIComponent(companyId) + '&registered=1') } catch { /* noop */ }
    }).catch((e) => { setStatus('error'); setError('서버 오류: ' + e.message) })
  }, [])

  async function charge() {
    setStatus('charging')
    const d = await callBilling({ action: 'charge', companyId, plan })
    if (d.ok) { setResult(d); setStatus('paid') }
    else { setStatus('error'); setError(d.error || '결제 중 오류가 발생했습니다.') }
  }

  const isTest = info?.test || plan === 'test'

  return (
    <AppLayout>
      <style>{'@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }'}</style>
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ textAlign: 'center', maxWidth: 440, width: '100%' }}>
          {(status === 'issuing' || status === 'charging') && (
            <>
              <RefreshCw size={48} style={{ color: 'var(--moss)', animation: 'spin 1s linear infinite', marginBottom: 20 }} />
              <p style={{ fontSize: 16, color: 'var(--ink)' }}>{status === 'issuing' ? '카드를 등록하는 중…' : '결제하는 중…'}</p>
              <p style={{ fontSize: 13, color: 'var(--ink-faint)', marginTop: 8 }}>잠시만 기다려 주세요.</p>
            </>
          )}

          {status === 'registered' && info && (
            <>
              <CreditCard size={52} style={{ color: 'var(--moss)', marginBottom: 16 }} />
              <h2 style={{ fontSize: 21, fontWeight: 700, color: 'var(--ink)', margin: '0 0 6px' }}>카드가 등록되었습니다</h2>
              <p style={{ fontSize: 14, color: 'var(--ink-faint)', margin: '0 0 18px' }}>아직 결제되지 않았습니다. 아래 내용을 확인하고 결제 여부를 선택하세요.</p>
              <div style={{ margin: '0 auto 14px', maxWidth: 320, padding: '12px 16px', background: 'var(--bg)', borderRadius: 10, fontSize: 14, color: 'var(--ink)', display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 6, textAlign: 'left' }}>
                <span style={{ color: 'var(--ink-faint)' }}>카드사</span><span>{info.card?.company || '-'}</span>
                <span style={{ color: 'var(--ink-faint)' }}>카드번호</span><span>{info.card?.number || '-'}</span>
                <span style={{ color: 'var(--ink-faint)' }}>요금제</span><span>{planName}</span>
              </div>
              <PriceBox price={info.price} totalLabel={isTest ? '시험 결제금액' : '결제금액 (부가세 포함)'} />
              {isTest
                ? <p style={{ fontSize: 13, color: 'var(--ink-faint)', margin: '0 0 18px' }}>시험 결제는 결제 직후 자동으로 취소(환불)되며 요금제는 바뀌지 않습니다.</p>
                : <p style={{ fontSize: 13, color: 'var(--ink-faint)', margin: '0 0 18px' }}>결제하면 오늘부터 1개월 이용이 시작되고, 이후 매월 같은 금액이 이 카드로 결제됩니다.</p>}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={charge} style={btn('var(--moss)')}>{won(info.price?.total)} 결제하기</button>
                <a href="/billing" style={btn('transparent', 'var(--ink)')}>나중에 결제</a>
              </div>
            </>
          )}

          {status === 'paid' && result && (
            <>
              <CheckCircle size={56} style={{ color: '#16a34a', marginBottom: 20 }} />
              <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', margin: '0 0 12px' }}>
                {result.test ? (result.refunded ? '시험 결제 완료 · 자동 취소됨' : '시험 결제 완료') : '결제 완료'}
              </h2>
              <p style={{ fontSize: 15, color: 'var(--ink)', marginBottom: 16 }}>
                {result.test ? '결제와 취소가 모두 정상 처리되었습니다.' : planName + ' 플랜 이용이 시작되었습니다.'}
              </p>
              <PriceBox price={result.price} totalLabel={result.test ? '시험 결제금액' : '결제금액 (부가세 포함)'} />
              {result.warning && <p style={{ fontSize: 13, color: '#b45309', marginBottom: 16 }}>{result.warning}</p>}
              <a href={result.test ? '/billing' : '/home'} style={btn('var(--moss)')}>{result.test ? '플랜 및 결제로' : '홈으로 이동'}</a>
            </>
          )}

          {status === 'error' && (
            <>
              <AlertCircle size={56} style={{ color: '#dc2626', marginBottom: 20 }} />
              <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', margin: '0 0 12px' }}>{info ? '결제 실패' : '카드 등록 실패'}</h2>
              <p style={{ fontSize: 14, color: '#dc2626', marginBottom: 8 }}>{error}</p>
              {info && <p style={{ fontSize: 13, color: 'var(--ink-faint)', marginBottom: 20 }}>카드는 등록되어 있습니다. 결제되지 않았으니 다른 카드로 다시 등록하거나 카드사에 문의해 주세요.</p>}
              <a href="/billing" style={btn('var(--moss)')}>플랜 및 결제로</a>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
