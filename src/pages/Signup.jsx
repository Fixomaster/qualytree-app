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
import { supabase } from '../lib/supabase'

const PLANS = [
  { code: 'kgmp',     label: 'KGMP only',         desc: '국내 GMP 품질시스템 · 월 250,000원~' },
  { code: 'iso',      label: 'ISO 13485 only',    desc: '국제 QMS 표준 · 월 320,000원~' },
  { code: 'bundle',   label: 'KGMP + ISO 13485',  desc: '통합 운영 · 15% OFF · 월 500,000원~' },
  { code: 'founding', label: 'Founding (베타 무료)', desc: '베타 무료 (법인 설립 후 첫 청구)' },
]

const EMPLOYEE_BANDS = [
  { code: '1-10',  label: '1~10명' },
  { code: '11-30', label: '11~30명' },
  { code: '31-50', label: '31~50명' },
  { code: '51+',   label: '51명 이상' },
]

const CERTS = ['KGMP', 'ISO 13485', 'FDA QMSR', 'EU MDR', 'MDSAP']

// 요금제 가격 (계산기 모똸 기준)
const PLAN_PRICE = { kgmp: 250000, iso: 320000, bundle: 500000, founding: 0 }
const ANNUAL_DISCOUNT = 0.15
const PORTONE_STORE_ID = import.meta.env.VITE_PORTONE_STORE_ID
const PORTONE_CHANNEL_KEY = import.meta.env.VITE_PORTONE_CHANNEL_KEY
const PORTONE_READY = Boolean(PORTONE_STORE_ID && PORTONE_CHANNEL_KEY)

const won = (n) => Number(n).toLocaleString('ko-KR')
function priceFor(plan, cycle) {
  const m = PLAN_PRICE[plan] ?? 0
  if (m === 0) return { amount: 0, unit: '무료', monthlyEq: 0 }
  if (cycle === 'annual') {
    const annual = Math.round(m * 12 * (1 - ANNUAL_DISCOUNT))
    return { amount: annual, unit: '원 / 년', monthlyEq: Math.round(annual / 12) }
  }
  return { amount: m, unit: '원 / 월', monthlyEq: m }
}
function planLabel(code) {
  return (PLANS.find((p) => p.code === code) || {}).label || code
}
let _portoneLoading = null
function loadPortOne() {
  if (typeof window !== 'undefined' && window.PortOne) return Promise.resolve(window.PortOne)
  if (_portoneLoading) return _portoneLoading
  _portoneLoading = new Promise((resolve, reject) => {
    const sc = document.createElement('script')
    sc.src = 'https://cdn.portone.io/v2/browser-sdk.js'
    sc.onload = () => resolve(window.PortOne)
    sc.onerror = () => reject(new Error('결제 모듈을 불러오지 못했습니다.'))
    document.head.appendChild(sc)
  })
  return _portoneLoading
}
const randomId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2))

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

  // Step 3 — 결제
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [paying, setPaying] = useState(false)
  const [payNotice, setPayNotice] = useState('')
  const [vaInfo, setVaInfo] = useState(null)

  const validateStep1 = () => {
    if (!companyName.trim()) return '회사명을 입력해주세요.'
    if (!employeeCountBand) return '직원 수 구간을 선택해주세요.'
    return ''
  }

  const validateStep2 = () => {
    if (!desiredPlan) return '희망 플랜을 선탙해주세요.'
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
    setPayNotice('')
    setStep((prev) => (prev > 1 ? prev - 1 : 1))
  }

  const toggleCert = (cert) => {
    setDesiredCertifications((prev) =>
      prev.includes(cert) ? prev.filter((c) => c !== cert) : [...prev, cert]
    )
  }

  const submitSignup = async (paymentMeta = {}) => {
    const msg = validateStep2()
    if (msg) { setError(msg); setStep(2); return }

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
    setPaying(false)

    if (!result.ok) {
      setError(typeof result.error === 'string' ? result.error : '신청 처리에 실패했습니다.')
      return
    }

    navigate('/signup/success', {
      state: {
        companyName: companyName.trim(),
        adminEmail: adminEmail.trim().toLowerCase(),
        plan: desiredPlan,
        payment: paymentMeta,
      },
    })
  }

  const handleToStep3 = () => {
    const msg = validateStep2()
    if (msg) { setError(msg); return }
    setError('')
    setPayNotice('')
    setStep(3)
  }

  const payWithCard = async () => {
    if (!PORTONE_READY) { setPayNotice('결제 모듈이 아직 설정되지 않았습니다. 관리자에게 문의하세요.'); return }
    setPaying(true); setPayNotice(''); setError('')
    try {
      const PortOne = await loadPortOne()
      const res = await PortOne.requestIssueBillingKey({
        storeId: PORTONE_STORE_ID,
        channelKey: PORTONE_CHANNEL_KEY,
        billingKeyMethod: 'CARD',
        issueId: randomId(),
        issueName: `Qualytree ${planLabel(desiredPlan)} 정기결제`,
        customer: {
          customerId: adminEmail.trim().toLowerCase(),
          fullName: adminName.trim(),
          email: adminEmail.trim().toLowerCase(),
          phoneNumber: adminPhone.trim(),
        },
      })
      if (res && res.code) { setPayNotice('카드 등록 실패: ' + (res.message || res.code)); setPaying(false); return }
      try {
        await supabase.functions.invoke('billing-register', {
          body: {
            billingKey: res.billingKey,
            plan: desiredPlan,
            cycle: desiredBillingCycle,
            amount: priceFor(desiredPlan, desiredBillingCycle).amount,
            company: companyName.trim(),
            admin: { name: adminName.trim(), email: adminEmail.trim().toLowerCase(), phone: adminPhone.trim() },
          },
        })
      } catch (_) { /* 백엔드 미배포 시 무시 */ }
      await submitSignup({ method: 'card', billingKey: res.billingKey })
    } catch (e) {
      setPayNotice(String((e && e.message) || e)); setPaying(false)
    }
  }

  const payWithTransfer = async () => {
    if (!PORTONE_READY) { setPayNotice('결제 모듈이 아직 설정되지 않았습니다. 관리자에게 문의하세요.'); return }
    const p = priceFor(desiredPlan, desiredBillingCycle)
    setPaying(true); setPayNotice(''); setError('')
    try {
      const PortOne = await loadPortOne()
      const res = await PortOne.requestPayment({
        storeId: PORTONE_STORE_ID,
        channelKey: PORTONE_CHANNEL_KEY,
        paymentId: randomId(),
        orderName: `Qualytree ${planLabel(desiredPlan)} (${desiredBillingCycle === 'annual' ? '연납' : '월납'})`,
        totalAmount: p.amount,
        currency: 'CURRENCY_KRW',
        payMethod: 'VIRTUAL_ACCOUNT',
        virtualAccount: { accountExpiry: { validHours: 72 } },
        customer: {
          customerId: adminEmail.trim().toLowerCase(),
          fullName: adminName.trim(),
          email: adminEmail.trim().toLowerCase(),
          phoneNumber: adminPhone.trim(),
        },
      })
      if (res && res.code) { setPayNotice('가상계좌 발급 실패: ' + (res.message || res.code)); setPaying(false); return }
      setVaInfo({ paymentId: res.paymentId })
      await submitSignup({ method: 'transfer', paymentId: res.paymentId })
    } catch (e) {
      setPayNotice(String((e && e.message) || e)); setPaying(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={{ ...styles.card, ...(step === 2 ? styles.cardWide : {}) }}>
        <div style={styles.header}>
          <div style={styles.brand}>Qualytree</div>
          <div style={styles.subtitle}>도입 신청</div>
        </div>

        <div style={styles.stepIndicator}>
          <div style={{ ...styles.stepDot, ...(step >= 1 ? styles.stepActive : {}) }}>1</div>
          <div style={styles.stepLine} />
          <div style={{ ...styles.stepDot, ...(step >= 2 ? styles.stepActive : {}) }}>2</div>
          <div style={styles.stepLine} />
          <div style={{ ...styles.stepDot, ...(step >= 3 ? styles.stepActive : {}) }}>3</div>
        </div>
        <div style={styles.stepLabels}>
          <div style={step === 1 ? styles.stepLabelActive : styles.stepLabel}>회사 정보</div>
          <div style={step === 2 ? styles.stepLabelActive : styles.stepLabel}>요금제 · 관리자</div>
          <div style={step === 3 ? styles.stepLabelActive : styles.stepLabel}>결제</div>
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
            <div style={styles.calcWrap}>
              <div style={styles.calcHead}>
                <span style={styles.calcTitle}>요금제 선택</span>
                <span style={styles.calcHint}>구성을 바꿔보며 예상 견적을 확인한 뒤, 아래에서 희망 플랜을 선택하세요.</span>
              </div>
              <iframe
                src="/pricing-calculator.html"
                title="Qualytree 요금 계산기"
                style={styles.calcFrame}
              />
            </div>

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
                  /> 연납 (15% 할인)
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
                onClick={handleToStep3}
                style={styles.primaryButton}
              >
                결제로 →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={styles.form}>
            <div style={styles.sumCard}>
              <div style={styles.sumRow}><span>요금제</span><b>{planLabel(desiredPlan)}</b></div>
              <div style={styles.sumRow}><span>결제 주기</span><b>{desiredBillingCycle === 'annual' ? '연납 (15% 할인)' : '월납'}</b></div>
              <div style={styles.sumTotal}>
                <span>결제 금액</span>
                <b>
                  {priceFor(desiredPlan, desiredBillingCycle).amount === 0
                    ? '무료'
                    : won(priceFor(desiredPlan, desiredBillingCycle).amount) + ' ' + priceFor(desiredPlan, desiredBillingCycle).unit}
                </b>
              </div>
            </div>

            {payNotice && <div style={styles.error}>{payNotice}</div>}

            {desiredPlan === 'founding' ? (
              <div style={styles.payInfo}>
                Founding(베타 무료) 플랜은 결제 없이 바로 시작됩니다. 정식 청구는 법인 설립 후 변도 안내드립니다.
              </div>
            ) : (
              <>
                <div style={styles.payTabs}>
                  <button onClick={() => setPaymentMethod('card')} style={{ ...styles.payTab, ...(paymentMethod === 'card' ? styles.payTabOn : {}) }}>카드 정기결제</button>
                  <button onClick={() => setPaymentMethod('transfer')} style={{ ...styles.payTab, ...(paymentMethod === 'transfer' ? styles.payTabOn : {}) }}>계좌이체 (가상계좌)</button>
                </div>
                {paymentMethod === 'card' ? (
                  <div style={styles.payInfo}>카드를 등록하면 매월 자동으로 결제되고, 결제 즉시 서비스가 활성화됩니다. 결제 실패·카드 변경 시 자동 정지되며 담당자에게 이메일·문자로 안내됩니다.</div>
                ) : (
                  <div style={styles.payInfo}>전용 가상계좌를 발급해 드립니다. 입금이 확인되면 자동으로 서비스가 시작됩니다(또는 관리자 승인 후 시작).</div>
                )}
                {!PORTONE_READY && (
                  <div style={styles.notice}>※ 결제 모듈(PortOne) 키가 아직 설정되지 않았습니다. 설정 전에는 아래 "신청 접수"로 진행되며, 관리자 승인 후 활성화됩니다.</div>
                )}
                {vaInfo && (
                  <div style={styles.vaBox}>가상계좌가 발급되었습니다. 입금 후 자동으로 활성화됩니다. (결제번호: {vaInfo.paymentId})</div>
                )}
              </>
            )}

            <div style={styles.actions}>
              <button onClick={handleBack} style={styles.linkButton} disabled={paying || submitting}>← 이전</button>
              {desiredPlan === 'founding' ? (
                <button onClick={() => submitSignup({ method: 'free' })} style={styles.primaryButton} disabled={submitting}>{submitting ? '처리 중...' : '무료로 시작'}</button>
              ) : !PORTONE_READY ? (
                <button onClick={() => submitSignup({ method: 'pending' })} style={styles.primaryButton} disabled={submitting}>{submitting ? '접수 중...' : '신청 접수'}</button>
              ) : paymentMethod === 'card' ? (
                <button onClick={payWithCard} style={styles.primaryButton} disabled={paying}>{paying ? '진행 중...' : '카드 등록하고 시작'}</button>
              ) : (
                <button onClick={payWithTransfer} style={styles.primaryButton} disabled={paying}>{paying ? '발급 중...' : '가상계좌 발급'}</button>
              )}
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
    display: 'flex', justifyContent: 'center', gap: 36,
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
  sumCard: { border: '1px solid #e7e5e4', borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10, background: '#fafaf9' },
  sumRow: { display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#44403c' },
  sumTotal: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid #e7e5e4', paddingTop: 12, marginTop: 2, fontSize: 15, color: '#1c1917', fontWeight: 600 },
  payTabs: { display: 'flex', gap: 8, background: '#f5f5f4', borderRadius: 10, padding: 4 },
  payTab: { flex: 1, border: 'none', background: 'none', padding: '10px', borderRadius: 7, fontSize: 13, fontWeight: 600, color: '#78716c', cursor: 'pointer', fontFamily: 'inherit' },
  payTabOn: { background: '#fff', color: '#1c1917', boxShadow: '0 1px 3px rgba(0,0,0,0.12)' },
  payInfo: { fontSize: 13, color: '#57534e', lineHeight: 1.5, background: '#f6f8f6', border: '1px solid #e7e5e4', borderRadius: 9, padding: '12px 14px' },
  notice: { fontSize: 12.5, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 9, padding: '10px 13px', lineHeight: 1.5 },
  vaBox: { fontSize: 13, color: '#1c4532', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 9, padding: '12px 14px', lineHeight: 1.5 },
  cardWide: { maxWidth: 960 },
  calcWrap: {
    border: '1px solid #e7e5e4', borderRadius: 12, overflow: 'hidden',
    background: '#f6f8f6', marginBottom: 4,
  },
  calcHead: {
    display: 'flex', flexDirection: 'column', gap: 2,
    padding: '12px 16px', borderBottom: '1px solid #e7e5e4', background: '#fff',
  },
  calcTitle: { fontSize: 14, fontWeight: 600, color: '#16352b' },
  calcHint: { fontSize: 12, color: '#78716c' },
  calcFrame: {
    width: '100%', height: 880, border: 'none', display: 'block', background: '#f6f8f6',
  },
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