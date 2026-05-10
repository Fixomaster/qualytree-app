import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ArrowRight, ArrowLeft, Building2, FileText, UserCog,
  CheckCircle2, Loader2, Sparkles, AlertCircle,
} from 'lucide-react'
import Logo from '../../components/Logo'
import { auth } from '../../lib/auth'

const PLANS = {
  starter: {
    code: 'starter',
    label: 'Starter',
    band: '1~10인',
    bandKey: '1-10',
    monthlyKRW: 1000000,
    baseSeats: 5,
    baseCerts: ['KGMP'],
    desc: '1~10인 영세·중소 제조사를 위한 출발점. KGMP 1개 인증 포함.',
  },
  standard: {
    code: 'standard',
    label: 'Standard',
    band: '11~30인',
    bandKey: '11-30',
    monthlyKRW: 2000000,
    baseSeats: 10,
    baseCerts: ['KGMP'],
    desc: '11~30인 성장기 제조사용. 검사·NCR·시판후 완전 자동화.',
  },
  professional: {
    code: 'professional',
    label: 'Professional',
    band: '31인+',
    bandKey: '31-100',
    monthlyKRW: 5000000,
    baseSeats: 20,
    baseCerts: ['KGMP', 'ISO 13485'],
    desc: '31인 이상 / 다중 인증 글로벌 진출 제조사용. 인증 2개 기본 포함.',
  },
}

const EXTRA_CERTS = ['ISO 13485', 'FDA QMSR', 'EU MDR', 'IVDR', 'MDSAP', 'NMPA', 'PMDA']

const INDUSTRIES = [
  '정형외과 임플란트', '체외진단(IVD)', '치과', '심혈관·스텐트',
  '재활·물리치료', '미용·피부', '전자의료기기', 'SaMD·디지털 헬스',
  '재생의료·조직', '기타',
]

function fmtKRW(n) {
  return new Intl.NumberFormat('ko-KR').format(n) + '원'
}

function calcMonthly(plan, extraSeats, extraCerts) {
  return plan.monthlyKRW + extraSeats * 100000 + extraCerts.length * 500000
}

function calcAnnual(monthly) {
  return Math.round(monthly * 12 * 0.8)
}

export default function Signup() {
  const nav = useNavigate()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // Step 1 — 회사 정보
  const [companyName, setCompanyName] = useState('')
  const [businessNumber, setBusinessNumber] = useState('')
  const [representative, setRepresentative] = useState('')
  const [industry, setIndustry] = useState('정형외과 임플란트')
  const [bandKey, setBandKey] = useState('1-10')

  // Step 2 — 플랜
  const [planCode, setPlanCode] = useState('starter')
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [extraSeats, setExtraSeats] = useState(0)
  const [extraCerts, setExtraCerts] = useState([])

  // Step 3 — 관리자 정보
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPhone, setAdminPhone] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)

  const plan = PLANS[planCode]
  const monthly = calcMonthly(plan, extraSeats, extraCerts)
  const annual = calcAnnual(monthly)
  const displayPrice = billingCycle === 'annual' ? annual : monthly
  const displayLabel = billingCycle === 'annual' ? '/ 연 (20% 할인)' : '/ 월'

  const toggleExtraCert = (c) => {
    setExtraCerts((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    )
  }

  const goNext = () => {
    setError(null)
    if (step === 1) {
      if (!companyName.trim()) return setError('회사명을 입력해주세요.')
      if (!representative.trim()) return setError('대표자명을 입력해주세요.')
      setStep(2)
    } else if (step === 2) {
      setStep(3)
    }
  }

  const goPrev = () => {
    setError(null)
    setStep((s) => Math.max(1, s - 1))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!adminName.trim()) return setError('관리자 이름을 입력해주세요.')
    if (!adminEmail.trim() || !adminEmail.includes('@')) return setError('관리자 이메일을 정확히 입력해주세요.')
    if (!agreeTerms) return setError('약관에 동의해주세요.')

    setSubmitting(true)
    const res = await auth.signUpRequest({
      companyName,
      businessNumber,
      representative,
      industry,
      employeeCountBand: bandKey,
      desiredPlan: planCode,
      desiredBillingCycle: billingCycle,
      desiredCertifications: [...plan.baseCerts, ...extraCerts],
      adminEmail,
      adminName,
      adminPhone,
    })
    setSubmitting(false)

    if (!res.ok) {
      setError(res.error || '신청 중 오류가 발생했습니다.')
      return
    }
    nav('/signup-success')
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* 상단 — 로고 + 로그인 링크 */}
      <header className="px-8 py-6 flex items-center justify-between border-b border-stone-200 bg-white">
        <Link to="/login" className="flex items-center gap-3 text-stone-900">
          <Logo />
          <span className="font-serif text-xl">Qualytree</span>
        </Link>
        <Link
          to="/login"
          className="text-sm text-stone-600 hover:text-stone-900 inline-flex items-center gap-1"
        >
          <ArrowLeft size={14} /> 로그인으로
        </Link>
      </header>

      <main className="flex-1 px-8 py-10 max-w-3xl mx-auto w-full">
        {/* 진행 단계 표시 */}
        <div className="mb-10">
          <div className="text-xs uppercase tracking-widest text-emerald-800 mb-2">
            QUALYTREE PLATFORM · ACC-001 · 회사 계정 신청
          </div>
          <h1 className="font-serif text-3xl text-stone-900 mb-2">새 회사 등록 신청</h1>
          <p className="text-stone-600 text-sm">
            신청 후 1~3 영업일 내 운영팀이 검토·승인합니다. 승인되면 관리자 이메일로 첫 로그인 안내가 전달됩니다.
          </p>

          {/* Step indicator */}
          <div className="mt-6 flex items-center gap-2 text-xs">
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <div
                  className={
                    'w-8 h-8 rounded-full flex items-center justify-center font-medium ' +
                    (step >= s
                      ? 'bg-emerald-800 text-white'
                      : 'bg-stone-200 text-stone-500')
                  }
                >
                  {step > s ? <CheckCircle2 size={14} /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={
                      'flex-1 h-px ' + (step > s ? 'bg-emerald-800' : 'bg-stone-300')
                    }
                  />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-3 text-xs text-stone-600">
            <div className={step === 1 ? 'text-stone-900 font-medium' : ''}>1. 회사 정보</div>
            <div className={'text-center ' + (step === 2 ? 'text-stone-900 font-medium' : '')}>
              2. 플랜 선택
            </div>
            <div className={'text-right ' + (step === 3 ? 'text-stone-900 font-medium' : '')}>
              3. 관리자 정보
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="bg-white rounded-lg border border-stone-200 p-8">
          {/* ── Step 1 — 회사 정보 ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-2 text-emerald-800">
                <Building2 size={18} />
                <h2 className="font-medium">회사 정보</h2>
              </div>

              <div>
                <label className="text-sm text-stone-700 block mb-1">회사명 *</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="(주)메디플렉스"
                  className="w-full px-4 py-2.5 border border-stone-300 rounded focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-stone-700 block mb-1">사업자등록번호</label>
                  <input
                    type="text"
                    value={businessNumber}
                    onChange={(e) => setBusinessNumber(e.target.value)}
                    placeholder="000-00-00000"
                    className="w-full px-4 py-2.5 border border-stone-300 rounded focus:outline-none focus:border-emerald-700"
                  />
                </div>
                <div>
                  <label className="text-sm text-stone-700 block mb-1">대표자 *</label>
                  <input
                    type="text"
                    value={representative}
                    onChange={(e) => setRepresentative(e.target.value)}
                    placeholder="홍길동"
                    className="w-full px-4 py-2.5 border border-stone-300 rounded focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-stone-700 block mb-1">의료기기 분야</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full px-4 py-2.5 border border-stone-300 rounded focus:outline-none focus:border-emerald-700 bg-white"
                >
                  {INDUSTRIES.map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-stone-700 block mb-2">인원 규모</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { key: '1-10', label: '1~10인' },
                    { key: '11-30', label: '11~30인' },
                    { key: '31-100', label: '31~100인' },
                    { key: '100+', label: '100인+' },
                  ].map((b) => (
                    <button
                      key={b.key}
                      type="button"
                      onClick={() => {
                        setBandKey(b.key)
                        if (b.key === '1-10') setPlanCode('starter')
                        else if (b.key === '11-30') setPlanCode('standard')
                        else setPlanCode('professional')
                      }}
                      className={
                        'px-3 py-2 rounded border text-sm transition ' +
                        (bandKey === b.key
                          ? 'border-emerald-800 bg-emerald-50 text-emerald-900'
                          : 'border-stone-300 text-stone-700 hover:border-stone-400')
                      }
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2 — 플랜 선택 ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-2 text-emerald-800">
                <Sparkles size={18} />
                <h2 className="font-medium">플랜 선택</h2>
              </div>

              <div className="grid gap-3">
                {Object.values(PLANS).map((p) => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => setPlanCode(p.code)}
                    className={
                      'p-4 rounded-lg border text-left transition ' +
                      (planCode === p.code
                        ? 'border-emerald-800 bg-emerald-50 ring-1 ring-emerald-800'
                        : 'border-stone-300 hover:border-stone-400')
                    }
                  >
                    <div className="flex items-baseline justify-between mb-1">
                      <div className="font-medium text-stone-900">
                        {p.label} <span className="text-xs text-stone-500 ml-1">{p.band}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-serif text-lg text-stone-900">{fmtKRW(p.monthlyKRW)}</span>
                        <span className="text-xs text-stone-500 ml-1">/ 월</span>
                      </div>
                    </div>
                    <div className="text-xs text-stone-600 mb-1">{p.desc}</div>
                    <div className="text-xs text-stone-500">
                      기본 {p.baseSeats}시트 · 기본 인증 {p.baseCerts.join(', ')}
                    </div>
                  </button>
                ))}
              </div>

              {/* 결제 주기 */}
              <div>
                <label className="text-sm text-stone-700 block mb-2">결제 주기</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={
                      'px-4 py-3 rounded border text-sm transition ' +
                      (billingCycle === 'monthly'
                        ? 'border-emerald-800 bg-emerald-50 text-emerald-900'
                        : 'border-stone-300 text-stone-700 hover:border-stone-400')
                    }
                  >
                    <div className="font-medium">월납</div>
                    <div className="text-xs text-stone-500 mt-0.5">매월 결제</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('annual')}
                    className={
                      'px-4 py-3 rounded border text-sm transition relative ' +
                      (billingCycle === 'annual'
                        ? 'border-emerald-800 bg-emerald-50 text-emerald-900'
                        : 'border-stone-300 text-stone-700 hover:border-stone-400')
                    }
                  >
                    <div className="font-medium">연납 <span className="ml-1 text-xs bg-emerald-800 text-white px-1.5 py-0.5 rounded">20% 할인</span></div>
                    <div className="text-xs text-stone-500 mt-0.5">연 1회 일괄</div>
                  </button>
                </div>
              </div>

              {/* 추가 시트 */}
              <div>
                <label className="text-sm text-stone-700 block mb-1">
                  추가 시트 <span className="text-xs text-stone-500">(기본 {plan.baseSeats}시트 외 / +10만원/시트)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={extraSeats}
                  onChange={(e) => setExtraSeats(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-4 py-2.5 border border-stone-300 rounded focus:outline-none focus:border-emerald-700"
                />
              </div>

              {/* 추가 인증 */}
              <div>
                <label className="text-sm text-stone-700 block mb-2">
                  추가 인증 <span className="text-xs text-stone-500">(+50만원/인증)</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {EXTRA_CERTS.filter((c) => !plan.baseCerts.includes(c)).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleExtraCert(c)}
                      className={
                        'px-2 py-2 rounded border text-xs transition ' +
                        (extraCerts.includes(c)
                          ? 'border-emerald-800 bg-emerald-50 text-emerald-900'
                          : 'border-stone-300 text-stone-700 hover:border-stone-400')
                      }
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* 가격 요약 */}
              <div className="bg-stone-50 rounded-lg p-4 border border-stone-200">
                <div className="text-xs text-stone-500 uppercase tracking-wider mb-2">예상 청구액</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-stone-700">
                    <span>{plan.label} 기본료</span>
                    <span>{fmtKRW(plan.monthlyKRW)}</span>
                  </div>
                  {extraSeats > 0 && (
                    <div className="flex justify-between text-stone-700">
                      <span>추가 시트 {extraSeats}명</span>
                      <span>{fmtKRW(extraSeats * 100000)}</span>
                    </div>
                  )}
                  {extraCerts.length > 0 && (
                    <div className="flex justify-between text-stone-700">
                      <span>추가 인증 {extraCerts.length}개</span>
                      <span>{fmtKRW(extraCerts.length * 500000)}</span>
                    </div>
                  )}
                  {billingCycle === 'annual' && (
                    <div className="flex justify-between text-emerald-800 text-xs">
                      <span>연납 20% 할인</span>
                      <span>−{fmtKRW(monthly * 12 - annual)}</span>
                    </div>
                  )}
                  <div className="border-t border-stone-300 mt-2 pt-2 flex justify-between font-medium text-stone-900">
                    <span>합계 (부가세 별도)</span>
                    <span className="font-serif text-lg">
                      {fmtKRW(displayPrice)} <span className="text-xs text-stone-500">{displayLabel}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3 — 관리자 정보 ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-2 text-emerald-800">
                <UserCog size={18} />
                <h2 className="font-medium">회사 관리자 정보</h2>
              </div>
              <p className="text-xs text-stone-600">
                회사 관리자는 직원 계정 추가·시트 관리·결제 관리를 담당합니다. 보통 RA·QA 책임자 또는 대표자가 맡습니다.
              </p>

              <div>
                <label className="text-sm text-stone-700 block mb-1">관리자 이름 *</label>
                <input
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="홍길동"
                  className="w-full px-4 py-2.5 border border-stone-300 rounded focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="text-sm text-stone-700 block mb-1">관리자 이메일 *</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@yourcompany.co.kr"
                  className="w-full px-4 py-2.5 border border-stone-300 rounded focus:outline-none focus:border-emerald-700"
                />
                <div className="text-xs text-stone-500 mt-1">
                  승인 시 이 이메일로 첫 로그인 안내가 전송됩니다.
                </div>
              </div>

              <div>
                <label className="text-sm text-stone-700 block mb-1">관리자 전화번호</label>
                <input
                  type="tel"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  placeholder="010-0000-0000"
                  className="w-full px-4 py-2.5 border border-stone-300 rounded focus:outline-none focus:border-emerald-700"
                />
              </div>

              <label className="flex items-start gap-2 mt-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-xs text-stone-700">
                  Qualytree 이용약관·개인정보 처리방침에 동의합니다. <br />
                  <span className="text-stone-500">
                    Founding Customer 베타 기간 동안은 무료로 제공되며, 법인 설립 후 첫 청구가 시작됩니다.
                  </span>
                </span>
              </label>
            </div>
          )}

          {/* 에러 표시 */}
          {error && (
            <div className="mt-5 px-4 py-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 네비게이션 버튼 */}
          <div className="mt-8 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={goPrev}
                className="px-4 py-2.5 text-stone-700 hover:text-stone-900 inline-flex items-center gap-1"
              >
                <ArrowLeft size={14} /> 이전
              </button>
            ) : (
              <div />
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={goNext}
                className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded inline-flex items-center gap-2"
              >
                다음 <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded inline-flex items-center gap-2 disabled:opacity-60"
              >
                {submitting ? <><Loader2 size={14} className="animate-spin" /> 신청 중...</> : <>가입 신청 <ArrowRight size={14} /></>}
              </button>
            )}
          </div>
        </form>

        <div className="text-center mt-6 text-xs text-stone-500">
          <Link to="/login" className="underline hover:text-stone-800">로그인 화면으로 돌아가기</Link>
        </div>
      </main>
    </div>
  )
}
