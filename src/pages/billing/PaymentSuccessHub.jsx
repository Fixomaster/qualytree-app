// src/pages/billing/PaymentSuccessHub.jsx — 빌링 카드 등록 성공 후 처리
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
  const [paid, setPaid] = useState(null)

  const planLabelFor = (id) => planById(id)?.name || id

  useEffect(() => {
    async function confirm() {
      const authKey     = params.get('authKey')
      const customerKey = params.get('customerKey')
      const plan        = params.get('plan')
      const companyId   = params.get('companyId')
      if (!authKey || !customerKey) {
        setStatus('error')
        setMessage('카드 등록 정보가 올바르지 않습니다.')
        return
      }
      setPlanLabel(planLabelFor(plan))
      try {
        const res = await fetch('/api/payments/toss-billing-issue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ authKey, customerKey, companyId, plan }),
        })
        const data = await res.json()
        if (data.ok) {
          setStatus('success')
          setMessage(planLabelFor(plan) + ' 플랜으로 업그레이드 완료!')
          setPaid({ supply: data.supply, vat: data.vat, total: data.amount })
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
      <style>{"@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }"}</style>
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          {status === 'loading' && (
            <>
              <RefreshCw size={48} style={{ color: 'var(--moss)', animation: 'spin 1s linear infinite', marginBottom: 20 }} />
              <p style={{ fontSize: 16, color: 'var(--ink)' }}>빌링키 발급 및 첫 결제 처리 중…</p>
              <p style={{ fontSize: 13, color: 'var(--ink-faint)', marginTop: 8 }}>잠시만 기다려 주세요.</p>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle size={56} style={{ color: '#16a34a', marginBottom: 20 }} />
              <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', margin: '0 0 12px' }}>구독 완료!</h2>
              <p style={{ fontSize: 15, color: 'var(--ink)', marginBottom: 16 }}>{message}</p>
              {paid && paid.total > 0 && (
                <div style={{ margin: '0 auto 24px', maxWidth: 300, padding: '12px 16px', border: '1px solid var(--line)', borderRadius: 10, fontSize: 14, color: 'var(--ink)', display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 6, textAlign: 'left' }}>
                  <span style={{ color: 'var(--ink-faint)' }}>공급가액</span><span>₩{Number(paid.supply).toLocaleString('ko-KR')}</span>
                  <span style={{ color: 'var(--ink-faint)' }}>부가세 (10%)</span><span>₩{Number(paid.vat).toLocaleString('ko-KR')}</span>
                  <span style={{ fontWeight: 700, borderTop: '1px solid var(--line)', paddingTop: 6 }}>결제금액 (부가세 포함)</span>
                  <span style={{ fontWeight: 700, borderTop: '1px solid var(--line)', paddingTop: 6 }}>₩{Number(paid.total).toLocaleString('ko-KR')}</span>
                </div>
              )}
              <a href="/dashboard" style={{
                display: 'inline-block', padding: '12px 28px', background: 'var(--moss)',
                color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 15
              }}>대시보드로 이동</a>
            </>
          )}
          {status === 'error' && (
            <>
              <AlertCircle size={56} style={{ color: '#dc2626', marginBottom: 20 }} />
              <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', margin: '0 0 12px' }}>오류 발생</h2>
              <p style={{ fontSize: 14, color: '#dc2626', marginBottom: 24 }}>{message}</p>
              <a href="/billing" style={{
                display: 'inline-block', padding: '12px 28px', background: 'var(--moss)',
                color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 15
              }}>다시 시도</a>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
