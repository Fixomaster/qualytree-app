/**
 * SuperAdminHub.jsx — 슈퍼관리자 콘솔
 * 접근: /operator (슈퍼관리자 계정만)
 * 탭: 회사 목록 | 구독 관리 | 결제 내역 | 플랜 설정
 */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

const PLANS = [
  { key: 'free',       label: '무료',         price: 0,      aiLimit: 10,  color: '#888' },
  { key: 'starter',    label: '스타터',        price: 49000,  aiLimit: 50,  color: '#2980b9' },
  { key: 'pro',        label: '프로',          price: 149000, aiLimit: 200, color: '#8e44ad' },
  { key: 'enterprise', label: '엔터프라이즈',   price: 490000, aiLimit: 999, color: '#c0392b' },
]

const TABS = ['회사 목록', '구독 관리', '결제 내역', '플랜 설정']

export default function SuperAdminHub() {
  const [tab,       setTab]       = useState(0)
  const [companies, setCompanies] = useState([])
  const [subs,      setSubs]      = useState([])
  const [payments,  setPayments]  = useState([])
  const [loading,   setLoading]   = useState(false)
  const [search,    setSearch]    = useState('')
  const [editSub,   setEditSub]   = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: cos }, { data: subData }, { data: payData }] = await Promise.all([
      supabase.from('companies').select('id, name, created_at, company_type').order('created_at', { ascending: false }),
      supabase.from('subscriptions').select('*').order('updated_at', { ascending: false }),
      supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(100),
    ])
    setCompanies(cos ?? [])
    setSubs(subData ?? [])
    setPayments(payData ?? [])
    setLoading(false)
  }

  async function updatePlan(companyId, plan) {
    await supabase.from('subscriptions').upsert({
      company_id: companyId, plan, updated_at: new Date().toISOString()
    }, { onConflict: 'company_id' })
    await supabase.from('ai_usage_log').update({ plan })
      .eq('company_id', companyId).eq('month', new Date().toISOString().slice(0,7))
    setEditSub(null)
    fetchAll()
  }

  const filteredCos = companies.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  )

  const subMap = Object.fromEntries(subs.map(s => [s.company_id, s]))
  const ym = new Date().toISOString().slice(0,7)

  const totalRevenue = payments.filter(p => p.status === 'paid' && p.created_at?.startsWith(ym))
    .reduce((a, p) => a + (p.amount ?? 0), 0)
  const paidCount = subs.filter(s => s.plan !== 'free').length

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#1a1a2e', color: '#fff', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ fontSize: '20px', fontWeight: 800 }}>⚙ Qualytree 운영자 콘솔</span>
        <span style={{ fontSize: '12px', opacity: .6, marginLeft: 'auto' }}>슈퍼관리자 전용</span>
      </div>
      <div style={{ display: 'flex', gap: '16px', padding: '20px 32px 0' }}>
        {[
          { label: '전체 회사', value: companies.length + '개' },
          { label: '유료 구독', value: paidCount + '개' },
          { label: '이번 달 결제', value: totalRevenue.toLocaleString() + '원' },
          { label: '무료 플랜', value: (companies.length - paidCount) + '개' },
        ].map(k => (
          <div key={k.label} style={{ flex: 1, background: '#fff', borderRadius: '10px', padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
            <div style={{ fontSize: '12px', color: '#888' }}>{k.label}</div>
            <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px' }}>{k.value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '4px', padding: '20px 32px 0' }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{ padding: '8px 20px', border: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontWeight: tab === i ? 700 : 400, background: tab === i ? '#fff' : '#e0e0e0', color: tab === i ? '#1a1a2e' : '#666', fontSize: '14px' }}>
            {t}
          </button>
        ))}
      </div>
      <div style={{ background: '#fff', margin: '0 32px', borderRadius: '0 8px 8px 8px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,.08)', minHeight: '400px' }}>
        {loading && <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>불러오는 중…</div>}
        {!loading && tab === 0 && (
          <>
            <div style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="회사 검색…"
                style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }} />
              <button onClick={fetchAll} style={{ padding: '8px 16px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>새로고침</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  {['회사명', '유형', '플랜', 'AI 사용', '가입일', '플랜 변경'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid #e0e0e0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCos.map(co => {
                  const sub = subMap[co.id]
                  const plan = PLANS.find(p => p.key === (sub?.plan ?? 'free')) ?? PLANS[0]
                  return (
                    <tr key={co.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{co.name ?? '-'}</td>
                      <td style={{ padding: '10px 12px', color: '#666' }}>{co.company_type ?? '-'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ background: plan.color + '22', color: plan.color, padding: '2px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 700 }}>
                          {plan.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#666' }}>{sub?.ai_used ?? '-'} / {plan.aiLimit}</td>
                      <td style={{ padding: '10px 12px', color: '#888', fontSize: '12px' }}>{co.created_at?.slice(0,10)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <select defaultValue={sub?.plan ?? 'free'} onChange={e => updatePlan(co.id, e.target.value)}
                          style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}>
                          {PLANS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                        </select>
                      </td>
                    </tr>
                  )
                })}
                {filteredCos.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#aaa' }}>검색 결과 없음</td></tr>
                )}
              </tbody>
            </table>
          </>
        )}
        {!loading && tab === 1 && (
          <div>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {PLANS.map(plan => {
                const count = subs.filter(s => s.plan === plan.key).length
                return (
                  <div key={plan.key} style={{ flex: '1 1 200px', border: '2px solid ' + plan.color, borderRadius: '12px', padding: '20px' }}>
                    <div style={{ fontSize: '14px', color: plan.color, fontWeight: 700 }}>{plan.label}</div>
                    <div style={{ fontSize: '32px', fontWeight: 800, margin: '8px 0' }}>{count}</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>{plan.price.toLocaleString()}원/월 · AI {plan.aiLimit}회</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        {!loading && tab === 2 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                {['결제일', '회사 ID', '금액', '플랜', '상태', '결제키'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid #e0e0e0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '10px 12px', fontSize: '12px' }}>{p.created_at?.slice(0,16)}</td>
                  <td style={{ padding: '10px 12px', fontSize: '11px', color: '#888' }}>{p.company_id?.slice(0,8)}…</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{(p.amount ?? 0).toLocaleString()}원</td>
                  <td style={{ padding: '10px 12px' }}>{p.plan}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ color: p.status === 'paid' ? '#27ae60' : '#e74c3c', fontWeight: 600 }}>{p.status}</span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '11px', color: '#aaa' }}>{p.payment_key?.slice(0,20)}…</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#aaa' }}>결제 내역 없음</td></tr>
              )}
            </tbody>
          </table>
        )}
        {!loading && tab === 3 && (
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>플랜 단가 및 AI 한도</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '16px' }}>
              {PLANS.map(plan => (
                <div key={plan.key} style={{ border: '1px solid #e0e0e0', borderRadius: '10px', padding: '20px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: plan.color, marginBottom: '12px' }}>{plan.label}</div>
                  <div style={{ fontSize: '14px', color: '#444' }}>
                    <div>월 구독료: <strong>{plan.price.toLocaleString()}원</strong></div>
                    <div>AI 초안 한도: <strong>{plan.aiLimit}회/월</strong></div>
                  </div>
                  <div style={{ marginTop: '12px', fontSize: '12px', color: '#888' }}>
                    플랜 단가 변경은 코드(SuperAdminHub.jsx → PLANS)에서 수정하세요.
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
