// src/pages/Signup.jsx
// Stage 2/4 — 회원가입 신청 (2단계 폼, 운영자 승인 대기)
// Project Instructions §11.3 / §21 고객 도입 워크플로우 정합
//
// 안전 원칙:
//  - 마운트 시 DB 조회 0건 (RLS 차단 차단)
//  - 모든 에러는 문자열로만 state에 저장 (React error #31 차단)
//  - 제출 버튼 외에는 어떤 비동기 호출도 없음

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { auth } from '../lib/auth'

const PLANS = [
  { code: 'starter',      label: 'Starter',      desc: '1~10인 · 5시트 · KGMP 1' },
  { code: 'standard',     label: 'Standard',     desc: '11~30인 · 10시트 · KGMP 1' },
  { code: 'professional', label: 'Professional', desc: '31인+ · 20시트 · 인증 2' },
  { code: 'founding',     label: 'Founding',     desc: '베타 무료 (법인 설립 후 첫 청구)' },
]

const EMPLOYEE_BANDS = [
  { code: '1-10',  label: '1~10명' },
  { code: '11-30', label: '11~30명' },
  { code: '31-50', label: '31~50명' },
  { code: '51+',   label: '51명 이상' },
]

const CERTS = ['KGMP', 'ISO 13485', 'FDA QMSR', 'EU MDR', 'MDSAP']

export default function Signup() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Step 1 — 회사 정보
  const [companyName, setCompanyName] = useState('')
  const [businessNumber, setBusinessNumber] = useState('')
  const [representative, setRepresentative] = useState('')
  const [industry, setIndustry] = useState('')
  const [employeeCountBand, setEmployeeCountBand] = useState('1-10')

  // Step 2 — 플랜·관리자
  const [desiredPlan, setDesiredPlan] = useState('founding')
  const [desiredBillingCycle, setDesiredBillingCycle] = useState('monthly')
  const [desiredCertifications, setDesiredCertifications] = useState(['KGMP'])
  const [adminEmail, setAdminEmail] = useState('')
  const [adminName, setAdminName] = useState('')
  const [adminPhone, setAdminPhone] = useState('')

  const validateStep1 = () => {
    if (!companyName.trim()) return '회사명을 입력해주세요.'
    if (!employeeCountBand) return '직원 수 구간을 선택해주세요.'
    return ''
  }

  const validateStep2 = () => {
    if (!desiredPlan) return '희망 플랜을 선택해주세요.'
    if (!adminEmail.trim()) return '관리자 이메일을 입력해주세요.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) return '이메일 형식이 올바르지 않습니다.'
    if (!adminName.trim()) return '관리자 이름을 입력해주세요.'
    if (desiredCertifications.length === 0) return '희망 인증을 최소 1개 선택해주세요.'
    return ''
  }

  const handleNext = () => {
    const msg = validateStep1()
    if (msg) { setError(msg); return }
    setError('')
    setStep(2)
  }

  const handleBack = () => {
    setError('')
    setStep(1)
  }

  const toggleCert = (cert) => {
    setDesiredCertifications((prev) =>
      prev.includes(cert) ? prev.filter((c) => c !== cert) : [...prev, cert]
    )
  }

  const handleSubmit = async () => {
    const msg = validateStep2()
    if (msg) { setError(msg); return }

    setSubmitting(true)
    setError('')

    const result = await auth.signUpRequest({
      companyName: companyName.trim(),
      businessNumber: businessNumber.trim(),
      representative: representative.trim(),
      industry: industry.trim(),
      employeeCountBand,
      desiredPlan,
      desiredBillingCycle,
      desiredCertifications,
      adminEmail: adminEmail.trim().toLowerCase(),
      adminName: adminName.trim(),
      adminPhone: adminPhone.trim(),
    })

    setSubmitting(false)

    if (!result.ok) {
      setError(typeof result.error === 'string' ? result.error : '신청 처리에 실패했습니다.')
      return
    }

    navigate('/signup/success', {
      state: {
        companyName: companyName.trim(),
        adminEmail: adminEmail.trim().toLowerCase(),
      },
    })
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.brand}>Qualytree</div>
          <div style={styles.subtitle}>도입 신청</div>
        </div>

        <div style={styles.stepIndicator}>
          <div style={{ ...styles.stepDot, ...(step >= 1 ? styles.stepActive : {}) }}>1</div>
          <div style={styles.stepLine} />
          <div style={{ ...styles.stepDot, ...(step >= 2 ? styles.stepActive : {}) }}>2</div>
        </div>
        <div style={styles.stepLabels}>
          <div style={step === 1 ? styles.stepLabelActive : styles.stepLabel}>회사 정보</div>
          <div style={step === 2 ? styles.stepLabelActive : styles.stepLabel}>플랜 · 관리자</div>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {step === 1 && (
          <div style={styles.form}>
            <Field label="회사명 *">
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="예: 모레컴퍼니"
                style={styles.input}
                autoFocus
              />
            </Field>
            <Field label="사업자등록번호">
              <input
                type="text"
                value={businessNumber}
                onChange={(e) => setBusinessNumber(e.target.value)}
                placeholder="000-00-00000"
                style={styles.input}
              />
            </Field>
            <Field label="대표자명">
              <input
                type="text"
                value={representative}
                onChange={(e) => setRepresentative(e.target.value)}
                style={styles.input}
              />
            </Field>
            <Field label="업종">
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="예: 의료기기 제조"
                style={styles.input}
              />
            </Field>
            <Field label="직원 수 구간 *">
              <select
                value={employeeCountBand}
                onChange={(e) => setEmployeeCountBand(e.target.value)}
                style={styles.input}
              >
                {EMPLOYEE_BANDS.map((b) => (
                  <option key={b.code} value={b.code}>{b.label}</option>
                ))}
              </select>
            </Field>

            <div style={styles.actions}>
              <Link to="/login" style={styles.linkButton}>로그인으로 돌아가기</Link>
              <button onClick={handleNext} style={styles.primaryButton}>다음 →</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={styles.form}>
            <Field label="희망 플랜 *">
              <div style={styles.planGrid}>
                {PLANS.map((p) => (
                  <div
                    key={p.code}
                    onClick={() => setDesiredPlan(p.code)}
                    style={{
                      ...styles.planCard,
                      ...(desiredPlan === p.code ? styles.planCardActive : {}),
                    }}
                  >
                    <div style={styles.planLabel}>{p.label}</div>
                    <div style={styles.planDesc}>{p.desc}</div>
                  </div>
                ))}
              </div>
            </Field>

            <Field label="결제 주기">
              <div style={styles.radioRow}>
                <label style={styles.radioLabel}>
                  <input
                    type="radio"
                    name="cycle"
                    value="monthly"
                    checked={desiredBillingCycle === 'monthly'}
                    onChange={(e) => setDesiredBillingCycle(e.target.value)}
                  /> 월납
                </label>
                <label style={styles.radioLabel}>
                  <input
                    type="radio"
                    name="cycle"
                    value="annual"
                    checked={desiredBillingCycle === 'annual'}
                    onChange={(e) => setDesiredBillingCycle(e.target.value)}
                  /> 연납 (20% 할인)
                </label>
              </div>
            </Field>

            <Field label="희망 인증 * (복수 선택 가능)">
              <div style={styles.certRow}>
                {CERTS.map((c) => (
                  <label key={c} style={styles.certChip}>
                    <input
                      type="checkbox"
                      checked={desiredCertifications.includes(c)}
                      onChange={() => toggleCert(c)}
                    /> {c}
                  </label>
                ))}
              </div>
            </Field>

            <div style={styles.divider} />

            <Field label="관리자 이메일 *">
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@company.com"
                style={styles.input}
              />
            </Field>
            <Field label="관리자 이름 *">
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                style={styles.input}
              />
            </Field>
            <Field label="관리자 연락처">
              <input
                type="tel"
                value={adminPhone}
                onChange={(e) => setAdminPhone(e.target.value)}
                placeholder="010-0000-0000"
                style={styles.input}
              />
            </Field>

            <div style={styles.actions}>
              <button onClick={handleBack} style={styles.linkButton} disabled={submitting}>
                ← 이전
              </button>
              <button
                onClick={handleSubmit}
                style={styles.primaryButton}
                disabled={submitting}
              >
                {submitting ? '신청 중...' : '신청 제출'}
              </button>
            </div>
          </div>
        )}

        <div style={styles.footer}>
          신청 후 운영팀의 검토를 거쳐 1~2영업일 내 승인 안내 메일이 발송됩니다.
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={styles.field}>
      <div style={styles.fieldLabel}>{label}</div>
      {children}
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f5f5f4',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '40px 16px',
    fontFamily: 'Pretendard, -apple-system, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: 560,
    background: '#fff',
    borderRadius: 16,
    padding: '40px 36px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
  },
  header: { textAlign: 'center', marginBottom: 28 },
  brand: {
    fontFamily: 'Fraunces, serif',
    fontSize: 28,
    fontWeight: 600,
    color: '#1c1917',
    letterSpacing: '-0.02em',
  },
  subtitle: { fontSize: 14, color: '#78716c', marginTop: 4 },
  stepIndicator: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
  stepDot: {
    width: 28, height: 28, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#e7e5e4', color: '#a8a29e', fontSize: 13, fontWeight: 600,
  },
  stepActive: { background: '#1c1917', color: '#fff' },
  stepLine: { width: 60, height: 2, background: '#e7e5e4' },
  stepLabels: {
    display: 'flex', justifyContent: 'center', gap: 56,
    fontSize: 12, marginTop: 6, marginBottom: 24,
  },
  stepLabel: { color: '#a8a29e' },
  stepLabelActive: { color: '#1c1917', fontWeight: 600 },
  error: {
    padding: '10px 14px', background: '#fef2f2', color: '#991b1b',
    borderRadius: 8, fontSize: 13, marginBottom: 16,
    border: '1px solid #fecaca',
  },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldLabel: { fontSize: 13, color: '#44403c', fontWeight: 500 },
  input: {
    padding: '10px 12px', border: '1px solid #d6d3d1', borderRadius: 8,
    fontSize: 14, fontFamily: 'inherit', outline: 'none',
  },
  divider: { height: 1, background: '#e7e5e4', margin: '8px 0' },
  planGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  planCard: {
    padding: 12, border: '1px solid #d6d3d1', borderRadius: 8,
    cursor: 'pointer', transition: 'all 0.15s',
  },
  planCardActive: {
    border: '2px solid #1c1917', background: '#fafaf9',
    padding: 11,
  },
  planLabel: { fontSize: 14, fontWeight: 600, color: '#1c1917' },
  planDesc: { fontSize: 11, color: '#78716c', marginTop: 4 },
  radioRow: { display: 'flex', gap: 24 },
  radioLabel: { fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' },
  certRow: { display: 'flex', flexWrap: 'wrap', gap: 12 },
  certChip: {
    fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
    padding: '6px 10px', background: '#f5f5f4', borderRadius: 6,
    cursor: 'pointer',
  },
  actions: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 12,
  },
  primaryButton: {
    padding: '10px 20px', background: '#1c1917', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500,
    cursor: 'pointer',
  },
  linkButton: {
    padding: '10px 16px', background: 'transparent', color: '#78716c',
    border: 'none', fontSize: 13, cursor: 'pointer', textDecoration: 'none',
  },
  footer: {
    marginTop: 24, paddingTop: 16, borderTop: '1px solid #f5f5f4',
    fontSize: 12, color: '#a8a29e', textAlign: 'center', lineHeight: 1.6,
  },
}