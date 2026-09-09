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

const BIZ_TYPES = ['제조', '수입', '제조 + 수입', '위탁제조 (OEM/ODM)', '유통·판매', '기타']
const SECTORS = ['의료기기 (기구·기계)', '의료기기 (의료용품)', '체외진단의료기기', '치과재료', '소프트웨어·디지털 (SaMD)', '재생의료·조직공학', '기타']
const EMPLOYEE_BANDS = [
  { code: '1-10',  label: '1~10명' },
  { code: '11-30', label: '11~30명' },
  { code: '31-50', label: '31~50명' },
  { code: '51+',   label: '51명 이상' },
]

// ---- 요금 모델 (2026-09 확정) -------------------------------------------------
// 기본 QMS + 인증 1개 = 월 300만원 (VAT 별도). 추가 인증 각 +100만원/월.
// ISO 13485는 KGMP(제조업체) 계약 시 무료 포함. 수입업체 기본도 월 300만원.
// 컨설팅(초기 입력·구축 / 제품 성능테스트 / 인증심사 대비)은 제품·기간에 따라 상이 → 담당자 협의.
const BASE_MONTHLY = 3000000
const EXTRA_MONTHLY = 1000000
const BASE_PLANS = [
  { code: 'kgmp', label: '제조업체 기본', sub: '기본 QMS + KGMP', certs: ['KGMP'],
    lines: ['ISO 13485 무료 포함 (KGMP 계약업체)', '문서·기록·심사 대응 전 기능', '관리자 + 사용자 계정'] },
  { code: 'kgmp_importer', label: '수입업체 기본', sub: '기본 QMS + 수입사 GMP', certs: ['수입사 GMP'],
    lines: ['외국제조소 등록·GMP 적합인정 관리', '수입 인허가 제출 문서 자동화', '관리자 + 사용자 계정'] },
]
const EXTRA_CERTS = [
  { code: 'ISO 13485', note: '제조업체 기본에는 무료 포함' },
  { code: 'FDA QMSR', note: '미국' },
  { code: 'EU MDR', note: '유럽 CE' },
  { code: 'MDSAP', note: '5개국 단일심사' },
  { code: 'ANVISA', note: '브라질' },
  { code: 'PMDA', note: '일본' },
  { code: 'NMPA', note: '중국' },
  { code: 'TGA', note: '호주' },
  { code: 'Health Canada', note: '캐나다' },
  { code: '기타 인증', note: '담당자 협의' },
]
const CONSULTING = [
  { code: 'setup', label: '초기 입력·구축 컨설팅', desc: '초기 기업은 품질체계 설계부터, 기존 기업은 기존 문서·기록 이관과 재구성까지 함께 진행합니다.' },
  { code: 'perftest', label: '제품 성능테스트 컨설팅', desc: '적용 표준 선정, 시험소 매칭·견적 비교, 시험 계획과 성적서 검토를 지원합니다.' },
  { code: 'audit', label: '인증심사 대비 컨설팅', desc: 'KGMP·ISO 13485·NB·FDA 심사 전 모의심사와 부적합 예방, 심사 당일 대응을 지원합니다.' },
]

// ---- 약관·동의 (LGL-ONB-001 v0.1 기준, 화면 요약본) --------------------------------
// 전문 페이지 게시 전까지 요약본을 화면에서 펼쳐 보여주고, 동의 시점·버전을 함께 기록한다.
const CONSENT_VERSION = '2026.09'
const CONSENT_ITEMS = [
  { id: 'A1', group: '필수', required: true, version: CONSENT_VERSION,
    title: '서비스 이용약관 동의',
    body: ['Qualytree는 의료기기 품질관리(eQMS)·인허가 문서 작성을 지원하는 클라우드 서비스입니다.',
      '계정은 회사(법인·개인사업자) 단위로 발급되며, 관리자는 사용자 계정을 발급·회수할 책임을 집니다.',
      '서비스 이용 중 발생한 계정 정보의 관리 책임은 고객에게 있으며, 계정 공유·양도는 금지됩니다.',
      '운영팀은 서비스 안정을 위해 사전 공지 후 점검을 실시할 수 있으며, 긴급 보안 조치는 사후 통지합니다.'] },
  { id: 'A2', group: '필수', required: true, version: CONSENT_VERSION,
    title: '의료기기 규제 책임 안내 (부속서 R) 동의',
    body: ['인허가·품질시스템에 대한 법적 책임은 제조업자·수입업자인 고객에게 있으며, Qualytree는 이를 대신하거나 인증 취득을 보장하지 않습니다.',
      'AI가 자동 생성한 문서·판정은 "초안"입니다. 검토·승인·서명은 고객의 자격 보유자가 수행해야 하며, 승인 전 문서는 규제 제출용으로 사용할 수 없습니다.',
      '시판후 보고(이상사례·리콜) 등 법정 기한이 있는 의무는 시스템 알림과 무관하게 고객이 기한을 준수해야 합니다.',
      '규제 개정 정보·자동 매핑은 참고 자료이며, 최종 적용 여부는 고객이 규제 원문으로 확인해야 합니다.',
      '시스템 도입 후 고객사 QMS에 Qualytree를 등록(공급자 평가·소프트웨어 검증)하는 절차는 고객 책임이며, 운영팀은 검증 패키지를 제공합니다.'] },
  { id: 'A3', group: '필수', required: true, version: CONSENT_VERSION,
    title: '요금·결제·환불 정책 동의',
    body: ['요금은 월 단위로 청구되며 표시 금액은 부가가치세(VAT) 별도입니다. 기본 요금제 월 300만원, 추가 인증 각 월 100만원.',
      '결제 수단 등록 시 매월 자동 결제되며, 해지 신청은 해지 희망일 이전 청구 주기 내에 해야 합니다. 이미 청구된 월 요금은 일할 환불되지 않습니다.',
      '미납 시 신규 입력·문서 생성이 제한되지만, 이미 저장된 기록의 열람·반출은 법정 보관 의무를 위해 계속 허용됩니다.',
      '컨설팅 비용은 제품·기간에 따라 별도 견적으로 확정되며, 본 신청만으로 컨설팅 계약이 성립하지 않습니다.',
      '요금 변경 시 최소 30일 전 관리자 이메일로 안내합니다.'] },
  { id: 'A5', group: '필수', required: true, version: CONSENT_VERSION,
    title: '데이터 관리·보관·폐기 정책 확인',
    body: ['고객이 입력한 품질 기록·문서의 소유권은 고객에게 있으며, Qualytree는 서비스 제공 목적 범위에서만 처리합니다.',
      '기록은 ISO 13485 §4.2.5·21 CFR 820.180·MDR Article 10(8) 기준으로 감사 추적과 함께 보관되며, 전자서명·감사 추적은 21 CFR Part 11 수준으로 관리됩니다.',
      '계약 해지 후 90일 동안 전체 데이터를 표준 형식(PDF·CSV·JSON)으로 반출할 수 있습니다. 반출 기간 종료 후 안전 폐기(NIST SP 800-88)하고 파기 증명서를 발행합니다.',
      '고객이 법정 보관(최대 15년)을 위해 보관 연장을 요청하면 별도 보관 요금으로 계속 보관합니다.',
      '데이터는 국내 리전에 암호화(전송·저장)되어 보관되며, 일일 백업과 재해복구 절차가 적용됩니다.'] },
  { id: 'A4', group: '필수', required: true, version: CONSENT_VERSION,
    title: '대리권한 확인',
    body: ['본인은 위 회사를 대표하여 본 서비스 계약을 체결하고 관리자 계정을 개설할 권한이 있음을 확인합니다.',
      '권한이 없는 상태로 신청한 경우 신청은 무효 처리될 수 있으며, 회사의 확인 요청이 있으면 운영팀이 사업자등록증·위임장 등 증빙을 요청할 수 있습니다.'] },
  { id: 'B1', group: '필수', required: true, version: CONSENT_VERSION,
    title: '개인정보 수집·이용 동의',
    body: ['수집 항목: 관리자 이름·이메일·연락처, 회사명·사업자등록번호·대표자명·개업연월일.',
      '이용 목적: 가입 심사·사업자 진위확인, 계정 발급, 청구·결제, 서비스 공지 및 장애·보안 안내.',
      '보유 기간: 회원 탈퇴(계약 종료) 후 관련 법령(전자상거래법 5년, 국세기본법 5년)이 정한 기간까지 보관 후 파기.',
      '동의를 거부할 수 있으나, 거부 시 서비스 가입이 제한됩니다.'] },
  { id: 'B4', group: '필수', required: true, version: CONSENT_VERSION,
    title: '만 14세 이상 확인',
    body: ['본인은 만 14세 이상이며, 회사 업무 목적으로 본 서비스를 이용합니다.'] },
  { id: 'C1', group: '선택', required: false, version: CONSENT_VERSION,
    title: '규제 소식·제품 안내 수신 (이메일)',
    body: ['규제 개정 요약, 신규 기능, 웨비나·세미나 안내를 관리자 이메일로 받습니다. 언제든 수신 거부할 수 있습니다.'] },
  { id: 'C2', group: '선택', required: false, version: CONSENT_VERSION,
    title: '익명화 벤치마크 데이터 활용',
    body: ['회사·제품·개인을 식별할 수 없도록 처리(k-익명성 5 이상)한 통계만 산업 벤치마크 리포트에 활용합니다. 임상·환자 데이터는 항상 제외되며, 언제든 철회할 수 있습니다.'] },
  { id: 'C3', group: '선택', required: false, version: CONSENT_VERSION,
    title: '도입 사례·레퍼런스 활용',
    body: ['회사명과 로고를 도입 고객 목록에 표기하는 데 동의합니다. 사례 내용 공개는 별도 확인 후에만 진행합니다.'] },
]

const PORTONE_STORE_ID = import.meta.env.VITE_PORTONE_STORE_ID
const PORTONE_CHANNEL_KEY = import.meta.env.VITE_PORTONE_CHANNEL_KEY
const PORTONE_READY = Boolean(PORTONE_STORE_ID && PORTONE_CHANNEL_KEY)

const won = (n) => Number(n).toLocaleString('ko-KR')
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
  const [industry, setIndustry] = useState('')          // 저장용: 아래 세 항목을 합쳐서 구성
  const [bizType, setBizType] = useState('')            // 사업 형태: 제조 / 수입 / 제조+수입 / 위탁제조(OEM) / 기타
  const [sector, setSector] = useState('')              // 업종(대분류)
  const [productItems, setProductItems] = useState('')  // 구체적 품목
  const [employeeCountBand, setEmployeeCountBand] = useState('1-10')

  // Step 1 — 사업자 진위확인 (국세청). 확인 전에는 나머지 회사 정보 입력이 잠긴다.
  const [startDate, setStartDate] = useState('')          // 개업일자 YYYYMMDD
  const [bizVerify, setBizVerify] = useState({ state: 'idle', msg: '', status: '' }) // idle|checking|ok|fail|unavailable
  const bizLocked = !(bizVerify.state === 'ok' || bizVerify.state === 'unavailable')
  const resetBizVerify = () => { if (bizVerify.state !== 'idle') setBizVerify({ state: 'idle', msg: '', status: '' }) }
  // 입력 자동 서식: 사업자등록번호 000-00-00000, 개업연월일 YYYY-MM-DD (저장·조회 시에는 숫자만 사용)
  const fmtBizNo = (v) => { const d = String(v || '').replace(/\D/g, '').slice(0, 10); return d.length > 5 ? `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}` : d.length > 3 ? `${d.slice(0, 3)}-${d.slice(3)}` : d }
  const fmtDate = (v) => { const d = String(v || '').replace(/\D/g, '').slice(0, 8); return d.length > 6 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}` : d.length > 4 ? `${d.slice(0, 4)}-${d.slice(4)}` : d }

  const verifyBusiness = async () => {
    const b_no = businessNumber.replace(/\D/g, '')
    const start_dt = startDate.replace(/\D/g, '')
    if (!companyName.trim()) { setError('회사명(상호)을 입력해주세요.'); return }
    if (b_no.length !== 10) { setError('사업자등록번호 10자리를 입력해주세요.'); return }
    if (!representative.trim()) { setError('대표자명을 입력해주세요.'); return }
    if (start_dt.length !== 8) { setError('개업연월일을 8자리(YYYY-MM-DD)로 입력해주세요. 사업자등록증의 "개업연월일" 항목 기준입니다.'); return }
    setError('')
    setBizVerify({ state: 'checking', msg: '국세청에 확인 중…', status: '' })
    try {
      const r = await fetch('/api/verify-business', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ b_no, p_nm: representative.trim(), start_dt, b_nm: companyName.trim() }),
      })
      const j = await r.json().catch(() => null)
      if (!j) { setBizVerify({ state: 'fail', msg: '확인 서버 응답이 없습니다. 잠시 후 다시 시도해주세요.', status: '' }); return }
      if (!j.ok && j.error === 'not_configured') {
        setBizVerify({ state: 'unavailable', msg: '사업자 확인 서비스가 준비 중입니다. 입력하신 정보는 운영팀이 사업자등록증으로 직접 확인합니다.', status: '' })
        return
      }
      if (!j.ok) { setBizVerify({ state: 'fail', msg: j.message || '확인에 실패했습니다.', status: '' }); return }
      if (!j.valid) {
        setBizVerify({ state: 'fail', msg: `국세청 등록 정보와 일치하지 않습니다${j.validMsg ? ` (국세청 응답: ${j.validMsg})` : ''}. 보낸 값 — 번호 ${b_no.slice(0,3)}-${b_no.slice(3,5)}-${b_no.slice(5)} / 대표자 "${representative.trim()}" / 개업연월일 ${start_dt.slice(0,4)}-${start_dt.slice(4,6)}-${start_dt.slice(6)}. 사업자등록증의 "개업연월일" 항목(등록일·발급일 아님)과 대표자 성명 표기를 그대로 맞춰 주세요. 공동대표는 그중 1인만 입력합니다.`, status: '' })
        return
      }
      if (j.status && j.status !== '계속사업자') {
        setBizVerify({ state: 'fail', msg: `국세청 기준 현재 상태가 "${j.status}"입니다. 영업 중인 사업자만 가입할 수 있습니다.`, status: j.status })
        return
      }
      setBizVerify({ state: 'ok', msg: `확인되었습니다 · ${j.status || '계속사업자'}${j.taxType ? ' · ' + j.taxType : ''}`, status: j.status })
    } catch (e) {
      setBizVerify({ state: 'fail', msg: '확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', status: '' })
    }
  }

  // Step 2 — 요금제·관리자·동의
  // 요금 모델(2026-09): 기본 QMS + 인증 1개(KGMP 또는 수입사 GMP) = 월 300만원(VAT 별도),
  // 추가 인증 각 +100만원/월, ISO 13485는 KGMP 계약 시 무료 포함. 컨설팅은 별도 협의.
  const [desiredPlan, setDesiredPlan] = useState('')            // 'kgmp' (제조) | 'kgmp_importer' (수입)
  const [desiredBillingCycle] = useState('monthly')             // 월 청구 고정
  const [extraCerts, setExtraCerts] = useState([])              // 추가 인증 (각 +100만원/월)
  const [consultInterest, setConsultInterest] = useState([])    // 컨설팅 관심 항목 (담당자 협의)
  const [consents, setConsents] = useState({})                  // { [id]: true }
  const [openConsent, setOpenConsent] = useState('')            // 펼쳐진 동의 항목 id
  const [adminEmail, setAdminEmail] = useState('')
  const [adminName, setAdminName] = useState('')
  const [adminPhone, setAdminPhone] = useState('')

  // 사업 형태에 따라 기본 플랜 자동 제안 (수입 → 수입업체 기본, 그 외 → 제조업체 기본)
  const planForBiz = bizType === '수입' ? 'kgmp_importer' : 'kgmp'
  const effectivePlan = desiredPlan || planForBiz
  const base = BASE_PLANS.find((p) => p.code === effectivePlan) || BASE_PLANS[0]
  // ISO 13485: 제조업체(KGMP) 계약은 무료 포함, 수입업체는 추가 인증으로 취급
  const isoIncluded = effectivePlan === 'kgmp'
  const billableExtras = extraCerts.filter((c) => !(c === 'ISO 13485' && isoIncluded))
  const quoteAmount = BASE_MONTHLY + billableExtras.length * EXTRA_MONTHLY
  const quoteUnit = '원 / 월 (VAT 별도)'
  const desiredCertifications = Array.from(new Set([...base.certs, ...(isoIncluded ? ['ISO 13485'] : []), ...extraCerts]))
  const requiredConsentsOk = CONSENT_ITEMS.filter((c) => c.required).every((c) => consents[c.id])
  const allConsentsOn = CONSENT_ITEMS.every((c) => consents[c.id])

  // Step 3 — 결제
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [paying, setPaying] = useState(false)
  const [payNotice, setPayNotice] = useState('')
  const [vaInfo, setVaInfo] = useState(null)

  const validateStep1 = () => {
    if (!companyName.trim()) return '회사명을 입력해주세요.'
    if (!businessNumber.trim()) return '사업자등록번호를 입력해주세요.'
    if (!representative.trim()) return '대표자명을 입력해주세요.'
    if (bizLocked) return '먼저 [사업자 확인]을 눌러 국세청 등록 정보와 일치하는지 확인해주세요.'
    if (!bizType) return '사업 형태를 선택해주세요.'
    if (!sector) return '업종을 선택해주세요.'
    if (!productItems.trim()) return '구체적 품목을 입력해주세요.'
    if (!employeeCountBand) return '직원 수 구간을 선택해주세요.'
    return ''
  }

  const validateStep2 = () => {
    if (!effectivePlan) return '기본 요금제를 선택해주세요.'
    if (!adminEmail.trim()) return '관리자 이메일을 입력해주세요.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) return '이메일 형식이 올바르지 않습니다.'
    if (!adminName.trim()) return '관리자 이름을 입력해주세요.'
    if (!adminPhone.trim()) return '관리자 연락처를 입력해주세요.'
    if (!requiredConsentsOk) return '필수 약관·동의 항목에 모두 동의해주세요.'
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

  const toggleIn = (setter) => (v) => setter((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))
  const toggleExtra = toggleIn(setExtraCerts)
  const toggleConsult = toggleIn(setConsultInterest)
  const setConsent = (id, on) => setConsents((prev) => ({ ...prev, [id]: on }))
  const setAllConsents = (on) => setConsents(Object.fromEntries(CONSENT_ITEMS.map((c) => [c.id, on])))

  // 동의 기록 (버전·일시·플랜·컨설팅 관심). 서버 동의 로그 테이블 연결 전까지 브라우저와 성공 화면에 보존.
  const consentRecord = () => ({
    at: new Date().toISOString(),
    items: CONSENT_ITEMS.map((c) => ({ id: c.id, version: c.version, required: c.required, agreed: Boolean(consents[c.id]) })),
    plan: effectivePlan,
    extraCerts,
    consultInterest,
    quoteMonthly: quoteAmount,
  })

  const submitSignup = async (paymentMeta = {}) => {
    const msg = validateStep2()
    if (msg) { setError(msg); setStep(2); return }

    setSubmitting(true)
    setError('')

    const result = await auth.signUpRequest({
      companyName: companyName.trim(),
      businessNumber: businessNumber.trim(),
      representative: representative.trim(),
      industry: [bizType, sector, productItems.trim()].filter(Boolean).join(' | ') || industry.trim(),
      employeeCountBand,
      desiredPlan: effectivePlan,
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

    try {
      localStorage.setItem('qualytree.signup', JSON.stringify({ plan: effectivePlan, cycle: desiredBillingCycle, certs: desiredCertifications }))
      localStorage.setItem('qualytree.signup.consent', JSON.stringify(consentRecord()))
    } catch (e) {}
    navigate('/signup/success', {
      state: {
        companyName: companyName.trim(),
        adminEmail: adminEmail.trim().toLowerCase(),
        plan: effectivePlan,
        payment: paymentMeta,
        consent: consentRecord(),
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
        issueName: `Qualytree ${base.label} 정기결제`,
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
            plan: effectivePlan,
            cycle: desiredBillingCycle,
            amount: quoteAmount,
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
    setPaying(true); setPayNotice(''); setError('')
    try {
      const PortOne = await loadPortOne()
      const res = await PortOne.requestPayment({
        storeId: PORTONE_STORE_ID,
        channelKey: PORTONE_CHANNEL_KEY,
        paymentId: randomId(),
        orderName: `Qualytree ${base.label} (${desiredBillingCycle === 'annual' ? '연납' : '월납'})`,
        totalAmount: quoteAmount,
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
            <div style={styles.verifyBox}>
              <div style={styles.verifyTitle}>1. 사업자 확인 <span style={styles.verifyHint}>국세청 등록 정보와 대조합니다 — 사업자등록증을 준비해주세요</span></div>
              <Field label="회사명 (상호) *">
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => { setCompanyName(e.target.value); resetBizVerify() }}
                  placeholder="사업자등록증 기재 상호"
                  style={styles.input}
                  autoFocus
                />
              </Field>
              <Field label="사업자등록번호 *">
                <input
                  type="text"
                  inputMode="numeric"
                  value={businessNumber}
                  onChange={(e) => { setBusinessNumber(fmtBizNo(e.target.value)); resetBizVerify() }}
                  placeholder="000-00-00000"
                  maxLength={12}
                  style={styles.input}
                />
              </Field>
              <div style={styles.row2}>
                <Field label="대표자명 *">
                  <input
                    type="text"
                    value={representative}
                    onChange={(e) => { setRepresentative(e.target.value); resetBizVerify() }}
                    placeholder="사업자등록증 기재 대표자"
                    style={styles.input}
                  />
                </Field>
                <Field label="개업연월일 * (사업자등록증 '개업연월일' 항목)">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={startDate}
                    onChange={(e) => { setStartDate(fmtDate(e.target.value)); resetBizVerify() }}
                    placeholder="YYYY-MM-DD"
                    maxLength={10}
                    style={styles.input}
                  />
                </Field>
              </div>
              <div style={styles.verifyRow}>
                <button
                  type="button"
                  onClick={verifyBusiness}
                  disabled={bizVerify.state === 'checking' || bizVerify.state === 'ok'}
                  style={{ ...styles.verifyBtn, ...(bizVerify.state === 'ok' ? styles.verifyBtnDone : {}) }}
                >
                  {bizVerify.state === 'checking' ? '확인 중…' : bizVerify.state === 'ok' ? '확인 완료 ✓' : '사업자 확인'}
                </button>
                {bizVerify.msg && (
                  <div style={bizVerify.state === 'ok' ? styles.verifyOk : bizVerify.state === 'fail' ? styles.verifyFail : styles.verifyNote}>
                    {bizVerify.msg}
                  </div>
                )}
              </div>
            </div>

            <div style={{ ...styles.lockedWrap, ...(bizLocked ? styles.lockedOn : {}) }}>
              <div style={styles.verifyTitle}>2. 회사 정보 {bizLocked && <span style={styles.verifyHint}>사업자 확인 후 입력할 수 있습니다</span>}</div>
              <Field label="사업 형태 *">
                <select value={bizType} onChange={(e) => setBizType(e.target.value)} style={styles.input} disabled={bizLocked}>
                  <option value="">선택</option>
                  {BIZ_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="업종 *">
                <select value={sector} onChange={(e) => setSector(e.target.value)} style={styles.input} disabled={bizLocked}>
                  <option value="">선택</option>
                  {SECTORS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="구체적 품목 *">
                <input
                  type="text"
                  value={productItems}
                  onChange={(e) => setProductItems(e.target.value)}
                  placeholder="예: 척추 고정용 임플란트, 골절 고정용 플레이트·스크류"
                  style={styles.input}
                  disabled={bizLocked}
                />
              </Field>
            <Field label="직원 수 구간 *">
              <select
                value={employeeCountBand}
                onChange={(e) => setEmployeeCountBand(e.target.value)}
                style={styles.input}
                disabled={bizLocked}
              >
                {EMPLOYEE_BANDS.map((b) => (
                  <option key={b.code} value={b.code}>{b.label}</option>
                ))}
              </select>
            </Field>
            </div>

            <div style={styles.actions}>
              <Link to="/login" style={styles.linkButton}>로그인으로 돌아가기</Link>
              <button onClick={handleNext} style={styles.primaryButton}>다음 →</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={styles.form}>
            {/* 1. 기본 요금제 */}
            <div style={styles.secHead}>
              <div style={styles.secTitle}>1. 기본 요금제 <span style={styles.secHint}>기본 QMS + 인증 1개 · 월 청구 · VAT 별도</span></div>
            </div>
            <div style={styles.planGrid}>
              {BASE_PLANS.map((p) => {
                const on = effectivePlan === p.code
                return (
                  <div key={p.code} onClick={() => setDesiredPlan(p.code)} style={{ ...styles.planCard, ...(on ? styles.planCardActive : {}) }}>
                    <div style={styles.planTop}>
                      <div>
                        <div style={styles.planLabel}>{p.label}</div>
                        <div style={styles.planSub}>{p.sub}</div>
                      </div>
                      <div style={styles.planPrice}>월 {won(BASE_MONTHLY)}원<span style={styles.planVat}>VAT 별도</span></div>
                    </div>
                    <ul style={styles.planList}>{p.lines.map((l) => <li key={l}>{l}</li>)}</ul>
                    {on && bizType && (p.code === planForBiz) && <div style={styles.planAuto}>입력하신 사업 형태({bizType})에 맞춰 선택되었습니다</div>}
                  </div>
                )
              })}
            </div>

            {/* 2. 추가 인증 */}
            <div style={styles.secHead}>
              <div style={styles.secTitle}>2. 추가 인증 <span style={styles.secHint}>각 +월 {won(EXTRA_MONTHLY)}원 · 필요한 만큼 선택</span></div>
            </div>
            <div style={styles.certRow}>
              {EXTRA_CERTS.map((c) => {
                const on = extraCerts.includes(c.code)
                const free = c.code === 'ISO 13485' && isoIncluded
                return (
                  <label key={c.code} style={{ ...styles.certChip, ...(on || free ? styles.certChipOn : {}), ...(free ? styles.certChipFree : {}) }}>
                    <input type="checkbox" checked={on || free} disabled={free} onChange={() => toggleExtra(c.code)} />
                    <span>
                      <b>{c.code}</b>
                      <span style={styles.certNote}>{free ? '기본 포함 · 무료' : c.note}</span>
                    </span>
                  </label>
                )
              })}
            </div>

            <div style={styles.sumCard}>
              <div style={styles.sumRow}><span>{base.label} ({base.sub}{isoIncluded ? ' + ISO 13485' : ''})</span><b>{won(BASE_MONTHLY)}원</b></div>
              {billableExtras.map((c) => (
                <div key={c} style={styles.sumRow}><span>추가 인증 · {c}</span><b>+{won(EXTRA_MONTHLY)}원</b></div>
              ))}
              <div style={styles.sumTotal}>
                <span>월 이용료 <span style={styles.sumVat}>VAT 별도</span></span>
                <b>{won(quoteAmount)}원 / 월</b>
              </div>
            </div>

            {/* 3. 컨설팅 */}
            <div style={styles.secHead}>
              <div style={styles.secTitle}>3. 컨설팅 <span style={styles.secHint}>제품·기간에 따라 상이 — 담당자와 협의 후 별도 견적</span></div>
            </div>
            <div style={styles.consultGrid}>
              {CONSULTING.map((c) => {
                const on = consultInterest.includes(c.code)
                return (
                  <label key={c.code} style={{ ...styles.consultCard, ...(on ? styles.consultCardOn : {}) }}>
                    <div style={styles.consultTop}>
                      <input type="checkbox" checked={on} onChange={() => toggleConsult(c.code)} />
                      <span style={styles.consultLabel}>{c.label}</span>
                      <span style={styles.consultTag}>협의</span>
                    </div>
                    <div style={styles.consultDesc}>{c.desc}</div>
                  </label>
                )
              })}
            </div>
            <div style={styles.consultNote}>체크한 항목은 신청 접수 후 담당자가 연락드려 범위·기간·비용을 협의합니다. 본 신청만으로 컨설팅 계약이 성립하지는 않습니다.</div>

            <div style={styles.divider} />

            {/* 4. 관리자 */}
            <div style={styles.secHead}>
              <div style={styles.secTitle}>4. 관리자 정보 <span style={styles.secHint}>승인 안내·청구서·보안 알림을 받는 대표 계정</span></div>
            </div>
            <div style={styles.row2}>
              <Field label="관리자 이름 *">
                <input type="text" value={adminName} onChange={(e) => setAdminName(e.target.value)} style={styles.input} />
              </Field>
              <Field label="관리자 연락처 *">
                <input type="tel" value={adminPhone} onChange={(e) => setAdminPhone(e.target.value)} placeholder="010-0000-0000" style={styles.input} />
              </Field>
            </div>
            <Field label="관리자 이메일 *">
              <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@company.com" style={styles.input} />
            </Field>

            <div style={styles.divider} />

            {/* 5. 약관·동의 */}
            <div style={styles.secHead}>
              <div style={styles.secTitle}>5. 약관 및 동의 <span style={styles.secHint}>필수 항목에 모두 동의해야 결제로 진행할 수 있습니다</span></div>
            </div>
            <label style={styles.consentAll}>
              <input type="checkbox" checked={allConsentsOn} onChange={(e) => setAllConsents(e.target.checked)} />
              <span>전체 동의 <span style={styles.consentAllHint}>(선택 항목 포함)</span></span>
            </label>
            <div style={styles.consentList}>
              {['필수', '선택'].map((g) => (
                <div key={g}>
                  <div style={styles.consentGroup}>{g === '필수' ? '필수 동의' : '선택 동의'}</div>
                  {CONSENT_ITEMS.filter((c) => c.group === g).map((c) => {
                    const open = openConsent === c.id
                    return (
                      <div key={c.id} style={styles.consentItem}>
                        <div style={styles.consentHead}>
                          <label style={styles.consentLabel}>
                            <input type="checkbox" checked={Boolean(consents[c.id])} onChange={(e) => setConsent(c.id, e.target.checked)} />
                            <span><span style={c.required ? styles.reqTag : styles.optTag}>{c.required ? '필수' : '선택'}</span>{c.title}</span>
                          </label>
                          <button type="button" onClick={() => setOpenConsent(open ? '' : c.id)} style={styles.consentToggle}>{open ? '접기' : '내용 보기'}</button>
                        </div>
                        {open && (
                          <ul style={styles.consentBody}>{c.body.map((line, i) => <li key={i}>{line}</li>)}</ul>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
            <div style={styles.consentFoot}>
              동의 일시·버전(v{CONSENT_VERSION})은 신청 기록과 함께 보관됩니다. 약관 전문은 승인 안내 메일과 관리자 화면에서 다시 확인할 수 있으며, 개인정보 관련 문의는 contact@qualy-tree.com 으로 연락 주세요.
            </div>

            <div style={styles.actions}>
              <button onClick={handleBack} style={styles.linkButton} disabled={submitting}>← 이전</button>
              <button onClick={handleToStep3} style={{ ...styles.primaryButton, ...(requiredConsentsOk ? {} : styles.primaryButtonOff) }}>결제로 →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={styles.form}>
            <div style={styles.sumCard}>
              <div style={styles.sumRow}><span>요금제</span><b>{base.label} · {base.sub}{isoIncluded ? ' + ISO 13485' : ''}</b></div>
              {billableExtras.length > 0 && <div style={styles.sumRow}><span>추가 인증</span><b>{billableExtras.join(', ')}</b></div>}
              {consultInterest.length > 0 && <div style={styles.sumRow}><span>컨설팅 (협의)</span><b>{consultInterest.map((k) => (CONSULTING.find((c) => c.code === k) || {}).label).join(', ')}</b></div>}
              <div style={styles.sumRow}><span>결제 주기</span><b>월납</b></div>
              <div style={styles.sumTotal}>
                <span>월 이용료</span>
                <b>{won(quoteAmount)} {quoteUnit}</b>
              </div>
            </div>

            {payNotice && <div style={styles.error}>{payNotice}</div>}

            {effectivePlan === 'founding' ? (
              <div style={styles.payInfo}>
                Founding(베타 무료) 플랜은 결제 없이 바로 시작됩니다. 정식 청구는 법인 설립 후 별도 안내드립니다.
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
              {effectivePlan === 'founding' ? (
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
  verifyBox: { border: '1px solid #d6e5dc', background: '#f4faf6', borderRadius: 12, padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 },
  verifyTitle: { fontSize: 13.5, fontWeight: 600, color: '#1c1917', display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 8 },
  verifyHint: { fontSize: 12, fontWeight: 400, color: '#78716c' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  verifyRow: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  verifyBtn: { border: 'none', background: '#16352b', color: '#fff', padding: '10px 16px', borderRadius: 9, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  verifyBtnDone: { background: '#0E7A4F', cursor: 'default' },
  verifyOk: { fontSize: 13, color: '#1c4532', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 9, padding: '8px 12px', flex: 1, minWidth: 200 },
  verifyFail: { fontSize: 13, color: '#7f1d1d', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 9, padding: '8px 12px', flex: 1, minWidth: 200 },
  verifyNote: { fontSize: 13, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 9, padding: '8px 12px', flex: 1, minWidth: 200 },
  lockedWrap: { display: 'flex', flexDirection: 'column', gap: 16, transition: 'opacity .2s' },
  lockedOn: { opacity: 0.45, pointerEvents: 'none' },
  sumCard: { border: '1px solid #e7e5e4', borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10, background: '#fafaf9' },
  sumRow: { display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#44403c' },
  sumTotal: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid #e7e5e4', paddingTop: 12, marginTop: 2, fontSize: 15, color: '#1c1917', fontWeight: 600 },
  payTabs: { display: 'flex', gap: 8, background: '#f5f5f4', borderRadius: 10, padding: 4 },
  payTab: { flex: 1, border: 'none', background: 'none', padding: '10px', borderRadius: 7, fontSize: 13, fontWeight: 600, color: '#78716c', cursor: 'pointer', fontFamily: 'inherit' },
  payTabOn: { background: '#fff', color: '#1c1917', boxShadow: '0 1px 3px rgba(0,0,0,0.12)' },
  payInfo: { fontSize: 13, color: '#57534e', lineHeight: 1.5, background: '#f6f8f6', border: '1px solid #e7e5e4', borderRadius: 9, padding: '12px 14px' },
  notice: { fontSize: 12.5, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 9, padding: '10px 13px', lineHeight: 1.5 },
  vaBox: { fontSize: 13, color: '#1c4532', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 9, padding: '12px 14px', lineHeight: 1.5 },
  cardWide: { maxWidth: 820 },
  secHead: { marginTop: 4 },
  secTitle: { fontSize: 14, fontWeight: 600, color: '#1c1917', display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 8 },
  secHint: { fontSize: 12, fontWeight: 400, color: '#78716c' },
  planGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 },
  planCard: { padding: 14, border: '1px solid #d6d3d1', borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s', background: '#fff' },
  planCardActive: { border: '2px solid #0E7A4F', background: '#f4faf6', padding: 13 },
  planTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  planLabel: { fontSize: 15, fontWeight: 700, color: '#1c1917' },
  planSub: { fontSize: 12, color: '#57534e', marginTop: 2 },
  planPrice: { fontSize: 14, fontWeight: 700, color: '#0E7A4F', textAlign: 'right', whiteSpace: 'nowrap', display: 'flex', flexDirection: 'column' },
  planVat: { fontSize: 10.5, fontWeight: 500, color: '#78716c' },
  planList: { margin: '10px 0 0', paddingLeft: 18, fontSize: 12.5, color: '#44403c', lineHeight: 1.7 },
  planAuto: { marginTop: 8, fontSize: 11.5, color: '#0E7A4F' },
  certRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  certChip: { fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f5f5f4', border: '1px solid #e7e5e4', borderRadius: 8, cursor: 'pointer' },
  certChipOn: { background: '#f4faf6', border: '1px solid #0E7A4F' },
  certChipFree: { cursor: 'default', opacity: 0.85 },
  certNote: { display: 'block', fontSize: 11, color: '#78716c' },
  sumVat: { fontSize: 11.5, fontWeight: 400, color: '#78716c', marginLeft: 6 },
  consultGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 },
  consultCard: { display: 'block', padding: 12, border: '1px solid #e7e5e4', borderRadius: 10, cursor: 'pointer', background: '#fff' },
  consultCardOn: { border: '1px solid #0E7A4F', background: '#f4faf6' },
  consultTop: { display: 'flex', alignItems: 'center', gap: 8 },
  consultLabel: { fontSize: 13.5, fontWeight: 600, color: '#1c1917', flex: 1 },
  consultTag: { fontSize: 11, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 999, padding: '1px 8px' },
  consultDesc: { fontSize: 12, color: '#57534e', lineHeight: 1.55, marginTop: 6 },
  consultNote: { fontSize: 12, color: '#78716c', lineHeight: 1.5 },
  consentAll: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: '#1c1917', padding: '10px 12px', background: '#f5f5f4', borderRadius: 8, cursor: 'pointer' },
  consentAllHint: { fontSize: 12, fontWeight: 400, color: '#78716c' },
  consentList: { display: 'flex', flexDirection: 'column', gap: 10 },
  consentGroup: { fontSize: 12, fontWeight: 600, color: '#78716c', margin: '4px 0 6px', letterSpacing: '0.02em' },
  consentItem: { border: '1px solid #e7e5e4', borderRadius: 8, padding: '8px 12px', marginBottom: 6 },
  consentHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  consentLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: '#1c1917', cursor: 'pointer', flex: 1 },
  reqTag: { fontSize: 11, color: '#0E7A4F', fontWeight: 700, marginRight: 6 },
  optTag: { fontSize: 11, color: '#a8a29e', fontWeight: 600, marginRight: 6 },
  consentToggle: { border: 'none', background: 'none', color: '#78716c', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', whiteSpace: 'nowrap' },
  consentBody: { margin: '8px 0 2px', paddingLeft: 18, fontSize: 12.5, color: '#44403c', lineHeight: 1.65 },
  consentFoot: { fontSize: 11.5, color: '#a8a29e', lineHeight: 1.55 },
  primaryButtonOff: { opacity: 0.45 },
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
