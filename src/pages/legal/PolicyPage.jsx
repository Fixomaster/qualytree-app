// src/pages/legal/PolicyPage.jsx
// 비로그인 상태에서도 열람 가능한 공개 약관/정책 페이지 공용 셸.
// PublicRoute(로그인 시 /home 리다이렉트)로 감싸지 않는다 — 로그인 여부와 무관하게 항상 열람 가능해야 함.
import React from 'react'
import { Link } from 'react-router-dom'
import Logo from '../../components/Logo'
import { LEGAL_UPDATED_AT } from '../../lib/legalContent'

const NAV_LINKS = [
  { to: '/terms', label: '이용약관' },
  { to: '/refund-policy', label: '환불정책' },
  { to: '/privacy', label: '개인정보처리방침' },
  { to: '/pricing', label: '요금제·서비스 안내' },
]

export default function PolicyPage({ title, sections, activePath }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ borderBottom: '1px solid var(--line)', background: 'var(--bg-card)' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="https://qualy-tree.com" style={{ textDecoration: 'none' }}>
            <Logo size={26} />
          </a>
          <Link to="/login" style={{ fontSize: 13, color: 'var(--ink-mute)', textDecoration: 'underline' }}>로그인 / 가입</Link>
        </div>
      </header>

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px 80px' }}>
        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 32 }}>
          {NAV_LINKS.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              style={{
                fontSize: 12.5,
                padding: '6px 12px',
                borderRadius: 999,
                textDecoration: 'none',
                background: activePath === n.to ? 'var(--moss)' : 'var(--bg-soft)',
                color: activePath === n.to ? '#FFFFFF' : 'var(--ink-mute)',
                fontWeight: activePath === n.to ? 600 : 400,
              }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <h1 className="font-display" style={{ fontSize: 28, color: 'var(--ink)', fontWeight: 500, margin: 0 }}>{title}</h1>
        <p style={{ fontSize: 12.5, color: 'var(--ink-faint)', marginTop: 8 }}>최종 개정일: {LEGAL_UPDATED_AT}</p>

        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 28 }}>
          {sections.map((sec, i) => (
            <section key={i}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', margin: '0 0 10px' }}>{sec.title}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {sec.body.map((line, j) => (
                  <p key={j} style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--ink-soft)', margin: 0 }}>{line}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div style={{ marginTop: 56, paddingTop: 24, borderTop: '1px solid var(--line)', fontSize: 12, color: 'var(--ink-faint)' }}>
          주식회사 퀄리트리 (Qualytree Co., Ltd.) · 사업자등록번호 496-81-03944 · contact@qualy-tree.com
        </div>
      </main>
    </div>
  )
}
