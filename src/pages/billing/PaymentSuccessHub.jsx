// src/pages/billing/PaymentSuccessHub.jsx — 빌링 카드 등록 성공 후 처리
// authKey + customerKey를 받아 /api/payments/toss-billing-issue 호출
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import { CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { planById } from '../../lib/plans'

export default function PaymentSuccessHub() {
  const [params] = useSearchParams()
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')
  const [planLabel, setPlanLabel] = useState('')

  const planLabelFor = (id) => planById(id)?.name || id

  useEffect(() => {
    async function confirm() {
      // 빌링 성공 리다이렉트 파라미터: authKey, customerKey (토스페이먼츠 제공)
      // + plan, companyId, amount (우리가 successUrl에 포함한 값)
      const authKey     = params.get('authKey')
      const customerKey = params.get('customerKey')
      const plan        = params.get('plan')
      const companyId   = params.get('companyId')
      const amount      = params.get('amount')

      if (!authKey || !customerKey) {
        setStatus('error')
        setMessage('카드 등록 정보가 올바르지 않습니다. 결제가 취소되었거나 URL이 잘못되었습니다.')
        return
      }

      setPlanLabel(planLabelFor(plan))

      try {
        const res = await fetch('/api/payments/toss-billing-issue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ authKey, customerKey, companyId, plan, amount: Number(amount) }),
        })
        const data = await res.json()
        if (data.ok) {
          setStatus('success')
          setMessage(`${planLabelFor(plan)} 플랜으로 업그레이드 완료!`)
        } else {
          setStatus('error')
          setMessage(data.error || '빌링키 발급 또는 첫 결제 중 오류가 발생했습니다.')
        }
      } catch (e) {
        setStatus('error')
        setMessage('서버 오류: ' + e.message)
      }
    }
    confirm()
  }, [])

  return (
    <AppLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 480 }}>
        <div style={{ textAlign: 'center', padding: '48px 32px', maxWidth: 400 }}>

          {status === 'loading' && (
            <>
              <RefreshCw size={44} style={{ color: 'var(--moss)', marginBottom: 16, animation: 'spin 1s linear infinite' }} />
              <p style={{ color: 'var(--ink-faint)', fontSize: 15, margin: 0 }}>빌링키 발급 및 첫 결제 처리 중…</p>
              <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle size={52} style={{ color: '#27ae60', marginBottom: 20 }} />
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 10px', color: 'var(--ink)' }}>결제 완료!</h2>
              <p style={{ color: 'var(--ink-faint)', margin: '0 0 28px', fontSize: 14 }}>{message}</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <a href="/billing"
                  style={{ padding: '10px 22px', background: 'var(--moss)', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
                  플랜 확인
                </a>
                <a href="/home"
                  style={{ padding: '10px 22px', background: 'var(--surface)', color: 'var(--ink)', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 14, border: '1px solid var(--line)' }}>
                  홈으로
                </a>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <AlertCircle size={52} style={{ color: '#e74c3c', marginBottom: 20 }} />
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 10px', color: 'var(--ink)' }}>결제 오류</h2>
              <p style={{ color: 'var(--ink-faint)', margin: '0 0 28px', fontSize: 14 }}>{message}</p>
              <a href="/billing"
                style={{ display: 'inline-block', padding: '10px 24px', background: '#e74c3c', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
                다시 시도
              </a>
            </>
          )}

        </div>
      </div>
    </AppLayout>
  )
}
