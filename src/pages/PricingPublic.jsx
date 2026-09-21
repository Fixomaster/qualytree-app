// src/pages/PricingPublic.jsx
// 비로그인 상태에서도 열람 가능한 공개 서비스/요금제 안내 페이지.
// 토스페이먼츠 결제모듈 심사 회신의 "① 상품/서비스 확인 가능한 URL", "③ 상세 내용",
// "④ 단건 결제기준 최고가" 항목의 근거 페이지 — src/lib/plans.js DEFAULT_PLANS(실제 요금제 SSoT)를 그대로 노출.
import React from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import { DEFAULT_PLANS, won } from '../lib/plans'

const FIXED_PLANS = DEFAULT_PLANS.filter((p) => !p.custom)
const CONSULT_PLANS = DEFAULT_PLANS.filter((p) => p.custom)
const MAX_PRICE = Math.max(...FIXED_PLANS.map((p) => p.monthly))

export default function PricingPublic() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ borderBottom: '1px solid var(--line)', background: 'var(--bg-card)' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="https://qualy-tree.com" style={{ textDecoration: 'none' }}>
            <Logo size={26} />
          </a>
          <Link to="/login" style={{ fontSize: 13, color: 'var(--ink-mute)', textDecoration: 'underline' }}>로그인 / 가입</Link>
        </div>
      </header>

      <main style={{ maxWidth: 1040, margin: '0 auto', padding: '48px 24px 80px' }}>
        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 32 }}>
          {[['/terms', '이용약관'], ['/refund-policy', '환불정책'], ['/privacy', '개인정보처리방침'], ['/pricing', '요금제·서비스 안내']].map(([to, label]) => (
            <Link key={to} to={to} style={{
              fontSize: 12.5, padding: '6px 12px', borderRadius: 999, textDecoration: 'none',
              background: to === '/pricing' ? 'var(--moss)' : 'var(--bg-soft)',
              color: to === '/pricing' ? '#FFFFFF' : 'var(--ink-mute)',
              fontWeight: to === '/pricing' ? 600 : 400,
            }}>{label}</Link>
          ))}
        </nav>

        <h1 className="font-display" style={{ fontSize: 28, color: 'var(--ink)', fontWeight: 500, margin: 0 }}>서비스 및 요금제 안내</h1>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--ink-soft)', marginTop: 14, maxWidth: 680 }}>
          Qualytree는 의료기기 제조업자·수입업자를 위한 인허가(KGMP·FDA QMSR·EU MDR 등)·품질경영시스템(eQMS) 클라우드 서비스입니다.
          제품 제조에 필요한 사항을 입력하면 AI가 인허가 문서 초안을 자동 생성하고, KGMP·FDA·CE 등 인증에 필요한 기술 문서를
          정해진 항목(숫치) 입력만으로 자동 업데이트·관리합니다. 서비스는 회사(사업자) 단위 구독으로 제공되며, 아래 요금제 중
          선택한 항목이 매월 정기결제(자동갱신)됩니다.
        </p>

        <div style={{ marginTop: 20, padding: '14px 16px', background: 'var(--bg-soft)', borderRadius: 10, fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.7 }}>
          <b>결제 및 서비스 제공 기간</b> — 모든 요금제는 월 단위 정기결제(구독)이며, 1회 결제는 결제일로부터 1개월 서비스 제공에 대한
          대가입니다. 고객이 해지하지 않는 한 매월 자동 갱신되며, 해지 시 다음 결제 주기부터 결제가 중단됩니다.
          자세한 내용은 <Link to="/refund-policy" style={{ color: 'var(--moss)', textDecoration: 'underline' }}>환불정책</Link>을 참고하세요.
          단건 결제 기준 최고가는 <b>{won(MAX_PRICE)}(VAT 별도)</b>입니다.
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', margin: '40px 0 16px' }}>고정 요금제 (월 구독)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {FIXED_PLANS.map((p) => (
            <div key={p.id} style={{
              border: p.recommended ? '1.5px solid var(--moss)' : '1px solid var(--line)',
              borderRadius: 12, padding: 20, background: 'var(--bg-card)',
            }}>
              {p.recommended && (
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--moss)', marginBottom: 8 }}>추천</div>
              )}
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{p.name}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', marginTop: 8 }}>
                {won(p.monthly)} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--ink-faint)' }}>/ 월 · VAT 별도</span>
              </div>
              <ul style={{ marginTop: 14, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {p.features.map((f, i) => (
                  <li key={i} style={{ fontSize: 12.5, color: 'var(--ink-mute)', lineHeight: 1.5 }}>· {f}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', margin: '40px 0 16px' }}>컨설팅 (별도 견적)</h2>
        <p style={{ fontSize: 13, color: 'var(--ink-mute)', marginBottom: 16 }}>아래 컨설팅 항목은 제품·기간에 따라 별도 견적으로 확정되며, 본 페이지의 요금제 결제만으로 컨설팅 계약이 성립하지 않습니다.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {CONSULT_PLANS.map((p) => (
            <div key={p.id} style={{ border: '1px dashed var(--line-strong)', borderRadius: 12, padding: 20, background: 'var(--bg-soft)' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{p.name}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-mute)', marginTop: 8 }}>담당자 협의 (견적제)</div>
              <ul style={{ marginTop: 14, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {p.features.map((f, i) => (
                  <li key={i} style={{ fontSize: 12.5, color: 'var(--ink-mute)', lineHeight: 1.5 }}>· {f}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 56, paddingTop: 24, borderTop: '1px solid var(--line)', fontSize: 12, color: 'var(--ink-faint)' }}>
          주식회사 퀄리트리 (Qualytree Co., Ltd.) · 사업자등록번호 496-81-03944 · contact@qualy-tree.com
        </div>
      </main>
    </div>
  )
}
