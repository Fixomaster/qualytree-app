// src/pages/SignupSuccess.jsx
// Stage 2/4 — 신청 완료 안내

import { useLocation, Link } from 'react-router-dom'

export default function SignupSuccess() {
  const location = useLocation()
  const state = location.state || {}
  const companyName = typeof state.companyName === 'string' ? state.companyName : ''
  const adminEmail = typeof state.adminEmail === 'string' ? state.adminEmail : ''

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.icon}>✓</div>
        <div style={styles.brand}>Qualytree</div>
        <h1 style={styles.title}>신청이 접수되었습니다</h1>

        {companyName && (
          <div style={styles.summary}>
            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>회사명</span>
              <span style={styles.summaryValue}>{companyName}</span>
            </div>
            {adminEmail && (
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>관리자 메일</span>
                <span style={styles.summaryValue}>{adminEmail}</span>
              </div>
            )}
          </div>
        )}

        <div style={styles.description}>
          운영팀의 검토 후 <strong>1~2영업일 내</strong> 위 이메일로<br />
          승인 안내와 임시 비밀번호가 발송됩니다.
        </div>

        <Link to="/login" style={styles.button}>로그인 화면으로</Link>

        <div style={styles.footer}>
          문의: <a href="mailto:support@qualytree.io" style={styles.mail}>support@qualytree.io</a>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh', background: '#f5f5f4',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '40px 16px',
    fontFamily: 'Pretendard, -apple-system, sans-serif',
  },
  card: {
    width: '100%', maxWidth: 480, background: '#fff',
    borderRadius: 16, padding: '48px 36px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
    textAlign: 'center',
  },
  icon: {
    width: 64, height: 64, borderRadius: '50%',
    background: '#dcfce7', color: '#15803d',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 32, fontWeight: 700,
    margin: '0 auto 20px',
  },
  brand: {
    fontFamily: 'Fraunces, serif',
    fontSize: 22, fontWeight: 600, color: '#1c1917',
    letterSpacing: '-0.02em',
  },
  title: {
    fontSize: 20, fontWeight: 600, color: '#1c1917',
    margin: '12px 0 20px',
  },
  summary: {
    background: '#fafaf9', borderRadius: 10,
    padding: '14px 18px', margin: '0 0 20px',
    textAlign: 'left',
  },
  summaryRow: {
    display: 'flex', justifyContent: 'space-between',
    fontSize: 13, padding: '4px 0',
  },
  summaryLabel: { color: '#78716c' },
  summaryValue: { color: '#1c1917', fontWeight: 500 },
  description: {
    fontSize: 14, color: '#57534e', lineHeight: 1.7,
    marginBottom: 28,
  },
  button: {
    display: 'inline-block',
    padding: '12px 32px', background: '#1c1917', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500,
    textDecoration: 'none',
  },
  footer: {
    marginTop: 28, paddingTop: 20, borderTop: '1px solid #f5f5f4',
    fontSize: 12, color: '#a8a29e',
  },
  mail: { color: '#78716c', textDecoration: 'underline' },
}