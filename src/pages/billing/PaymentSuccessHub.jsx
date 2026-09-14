// src/pages/billing/PaymentSuccessHub.jsx — 토스페이먼츠 결제 성공 리디렉션 처리
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import { CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'

export default function PaymentSuccessHub() {
  const [params] = useSearchParams()
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')
  const [planLabel, setPlanLabel] = useState('')

  const PLAN_LABELS = { free: '무료', starter: '스타터', pro: '프로', enterprise: '엔터프라이즈' }

  useEffect(() => {
    async function confirm() {
      const paymentKey = params.get('paymentKey')
      const orderId    = params.get('orderId')
      const amount     = params.get('amount')
      const plan       = params.get('plan')
      const companyId  = params.get('companyId')

      if (!paymentKey || !orderId || !amount) {
        setStatus('error')
        setMessage('결제 정보가 올바르지 않습니다. 결제가 취소됐거나 URL이 잘못되었습니다.')
        return
      }

      setPlanLabel(PLAN_LABELS[plan] || plan)

      try {
        const res = await fetch('/api/payments/toss-confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentKey, orderId, amount: Number(amount), companyId, plan }),
        })
        const data = await res.json()
        if (data.ok) {
          setStatus('success')
          setMessage(`${PLAN_LABELS[plan] || plan} 플랜으로 업그레이드 완료!`)
        } else {
          setStatus('error')
          setMessage(data.error || '결제 승인 중 오류가 발생했습니다.')
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
              <p style={{ color: 'var(--ink-faint)', fontSize: 15, margin: 0 }}>결제 승인 처리 중…</p>
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
