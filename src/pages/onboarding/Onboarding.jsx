import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2, Users, FileText, ClipboardCheck, UserPlus, CreditCard,
  Check, ChevronLeft, ChevronRight, Plus, Trash2, ShieldCheck, Info, Sparkles, Settings, Search,
} from 'lucide-react'
import { loadPlans, priceFor, won, CERT_DEFS, CERT_LABEL_TO_ID, PLAN_AVAILABLE_CERT_IDS, certMapForPlan, planForCertIds, planById, syncPlansFromServer } from '../../lib/plans'
import { mfds } from '../../lib/mfds'

const STORE_KEY = 'qualytree.onboarding'

// ───────── 시드 데이터 (KGMP 기준 · 품질관리 항목 정리.xlsx 기반) ─────────
const DEFAULT_ORG = [
  { id: 'ceo', name: '대표이사', parentId: null },
  { id: 'rnd', name: '연구개발', parentId: 'ceo' },
  { id: 'ra', name: 'RA', parentId: 'rnd' },
  { id: 'qa', name: 'QA', parentId: 'rnd' },
  { id: 'acc', name: '회계', parentId: 'ceo' },
  { id: 'sales', name: '영업부', parentId: 'ceo' },
  { id: 'sdom', name: '국내영업부', parentId: 'sales' },
  { id: 'sovs', name: '해외영업부', parentId: 'sales' },
  { id: 'mfg', name: '제조부', parentId: 'ceo' },
  { id: 'mct', name: 'MCT사업부', parentId: 'mfg' },
  { id: 'qc', name: 'QC', parentId: 'mfg' },
  { id: 'purch', name: '구매부', parentId: 'ceo' },
]

// 식약처 분류 기반 인허가 업종 (대분류 → 중분류)
const MDCAT = {
  '기구·기계': ['진료용 기기', '수술용 기기', '정형용품', '영상진단장치', '측정·감시장치', '물리치료·재활기기', '안과용 기기', '내시경·광학기기', '기타'],
  '의료용품': ['주사기·주사침', '카테터·튜브', '봉합사·결찰재', '수액·수혈세트', '거즈·드레싱', '콘택트렌즈', '기타'],
  '체외진단의료기기': ['생화학 검사', '면역 검사', '분자진단(NAT)', '혈액·혈당 검사', '자가검사', '기타'],
  '치과재료': ['충전·수복재료', '인상재', '의치·교정재료', '임플란트', '기타'],
  '소프트웨어·디지털(SaMD)': ['진단보조 SW', 'AI 영상분석', '환자 모니터링', '디지털치료기기(DTx)', '기타'],
  '기타': [],
}
const MDCAT1 = Object.keys(MDCAT)

// 요금제는 lib/plans 단일 소스(loadPlans)에서 읽는다 (운영자 /operator/plans 편집 즉시 반영)
const planAmount = (id, cycle) => { const p = planById(id); return p ? (priceFor(p, cycle) || 0) : 0 }
const planName = (id) => (planById(id) || {}).name || id
function readSignup() {
  try { return JSON.parse(localStorage.getItem('qualytree.signup') || '{}') } catch { return {} }
}

// 절차서 시드 — 회사마다 이름·순서가 다르고 추가/제외될 수 있음
const SEED_PROCEDURES = [
  '문서관리 절차서', '기록관리 절차서', '도면관리 절차서', '경영검토 절차서', '교육훈련 절차서',
  '환경관리 절차서', '위험관리 절차서', '고객관리 절차서', '설계개발 절차서', '구매관리 절차서',
  '밸리데이션 절차서', '공정관리 절차서', '제품관리 절차서', '장비관리 절차서', 'UDI 절차서',
  '사용적합성 절차서', '소프트웨어 절차서', '고객불만 절차서', '내부감사 절차서', '검사 및 시험 절차서',
  '부적합품 절차서', '데이터분석 절차서', '시정조치 절차서', '예방조치 절차서', '안전성 정보관리 절차서',
  '프로세스 관리 절차서',
]

// 품질경영매뉴얼 목차 시드 — ISO 13485:2016 / KGMP 조항 구조
const SEED_MANUAL = [
  { c: '0', name: '회사 소개 · 적용 범위' },
  { c: '1', name: '품질방침 및 품질목표' },
  { c: '2', name: '조직도 및 책임과 권한' },
  { c: '3', name: '인용 규격 · 용어와 정의' },
  { c: '4', name: '품질경영시스템 (문서화 요구사항)' },
  { c: '5', name: '경영 책임 (경영검토)' },
  { c: '6', name: '자원 관리 (인적자원·기반시설·작업환경)' },
  { c: '7', name: '제품 실현 (설계·구매·생산·서비스)' },
  { c: '8', name: '측정 · 분석 및 개선' },
]

const STEPS = [
  { key: 'plan', label: '플랜·결제', icon: CreditCard },
  { key: 'info', label: '기본정보·제품·인증', icon: Building2 },
  { key: 'org', label: '조직도', icon: Users },
  { key: 'manual', label: '품질경영매뉴얼', icon: FileText },
  { key: 'procedures', label: '절차서', icon: ClipboardCheck },
  { key: 'accounts', label: '계정 발급', icon: UserPlus },
]

function defaultState() {
  return {
    plan: (() => { const sg = readSignup(); return { id: sg.plan || '', cycle: sg.cycle || 'monthly' } })(),
    company: { name: '', ceo: '', bizNo: '', licenseNo: '', qmRep: '' },
    certs: (() => {
      const sg = readSignup()
      const base = { kgmp: false, iso13485: false, ce: false, fda: false, mdsap: false }
      const plan = planById(sg.plan)
      if (plan) { const cm = certMapForPlan(plan); base.kgmp = cm.kgmp; base.iso13485 = cm.iso13485 }
      else { base.kgmp = true }
      ;(sg.certs || []).forEach((c) => { const id = CERT_LABEL_TO_ID[c]; if (id) base[id] = true })
      return base
    })(),
    products: [],
    departments: DEFAULT_ORG.map((n) => ({ ...n })),
    manual: { mode: '', confirmed: false, chapters: SEED_MANUAL.map((m, i) => ({ id: 'm' + i, c: m.c, name: m.name, included: true, custom: false })) },
    procedures: SEED_PROCEDURES.map((n, i) => ({ id: 'p' + i, name: n, applicable: true, custom: false })),
    members: [],
    done: { plan: false, info: false, org: false, manual: false, procedures: false, accounts: false },
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return defaultState()
    const def = defaultState()
    const saved = JSON.parse(raw)
    return { ...def, ...saved, done: { ...def.done, ...(saved.done || {}) }, plan: { ...def.plan, ...(saved.plan || {}) } }
  } catch {
    return defaultState()
  }
}

const uid = () => Math.random().toString(36).slice(2, 9)

export default function Onboarding() {
  const nav = useNavigate()
  const [state, setState] = useState(loadState)
  const [step, setStep] = useState(0)

  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)) } catch { /* ignore */ }
  }, [state])

  // 서버(Supabase)에서 최신 플랜을 받아 캐시 갱신 후 재렌더 (운영자 편집 전 고객 반영)
  const [, setPlanSync] = useState(0)
  useEffect(() => { syncPlansFromServer().then(() => setPlanSync((x) => x + 1)).catch(() => {}) }, [])

  const patch = (p) => setState((s) => ({ ...s, ...p }))
  // 단계별 최소 입력 검증 — 방문/넘김만으로 '완료' 처리되지 않도록 한다
  const stepValid = (s, key) => {
    if (key === 'plan') return !!(s.plan && s.plan.id)
    if (key === 'info') return !!(s.company?.name?.trim()) && (s.products || []).length > 0
    if (key === 'org') return (s.departments || []).length > 0
    if (key === 'manual') return !!(s.manual?.mode)
    if (key === 'procedures') return (s.procedures || []).some((p) => p.applicable)
    if (key === 'accounts') return (s.members || []).length > 0
    return true
  }
  const markDone = (key) => setState((s) => ({ ...s, done: { ...s.done, [key]: stepValid(s, key) } }))
  const finishOnboarding = () => {
    const done = STEPS.reduce((o, st) => ((o[st.key] = stepValid(state, st.key)), o), {})
    const ns = { ...state, done }
    try { localStorage.setItem(STORE_KEY, JSON.stringify(ns)) } catch { /* ignore */ }
    setState(ns)
    const missing = STEPS.filter((st) => !done[st.key])
    if (missing.length) {
      alert('아직 입력이 완료되지 않은 단계가 있습니다:\n· ' + missing.map((st) => st.label).join('\n· ') + '\n\n해당 단계를 완료한 뒤 다시 시도하세요.')
      setStep(STEPS.findIndex((st) => !done[st.key]))
      return
    }
    nav('/dashboard')
  }

  const doneCount = STEPS.filter((s) => state.done[s.key]).length
  const progress = Math.round((doneCount / STEPS.length) * 100)
  const cur = STEPS[step]

  const goStep = (i) => { markDone(cur.key); setStep(i) }
  const goNext = () => {
    if (step < STEPS.length - 1) { markDone(cur.key); setStep(step + 1) }
    else finishOnboarding()
  }
  const goPrev = () => { if (step > 0) { markDone(cur.key); setStep(step - 1) } }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              온보딩 <span className="text-base font-normal text-slate-500">초기 설정 가이드</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              플랜을 정하고 KGMP 기준으로 회사·제품을 정의하면 필요한 항목이 자동으로 구성됩니다. 단계대로 따라오시면 됩니다.
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">진행률</div>
            <div className="text-3xl font-bold tabular-nums text-emerald-600">{progress}%</div>
          </div>
        </div>

        <div className="h-2 w-full rounded-full bg-slate-200 mb-4 overflow-hidden">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-5">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const active = i === step
            const complete = state.done[s.key]
            return (
              <button
                key={s.key}
                onClick={() => goStep(i)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition ${
                  active ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <span className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                  complete ? 'bg-emerald-500 text-white' : active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {complete ? <Check size={14} /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] text-slate-400">STEP {i + 1}</span>
                  <span className="block text-[12px] font-medium text-slate-700 truncate flex items-center gap-1">
                    <Icon size={12} /> {s.label}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          {cur.key === 'plan' && <StepPlan state={state} patch={patch} />}
          {cur.key === 'info' && <StepInfo state={state} patch={patch} setState={setState} />}
          {cur.key === 'org' && <StepOrg state={state} setState={setState} />}
          {cur.key === 'manual' && <StepManual state={state} patch={patch} />}
          {cur.key === 'procedures' && <StepProcedures state={state} setState={setState} />}
          {cur.key === 'accounts' && <StepAccounts state={state} setState={setState} />}
        </div>

        <div className="flex items-center justify-between mt-5">
          <button
            onClick={goPrev}
            disabled={step === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium disabled:opacity-40 hover:bg-slate-50 transition"
          >
            <ChevronLeft size={16} /> 이전
          </button>
          <div className="text-xs text-slate-400">{step + 1} / {STEPS.length} 단계</div>
          <button
            onClick={goNext}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition"
          >
            {step === STEPS.length - 1 ? '온보딩 완료 · 대시보드로' : '이 단계 완료 · 다음'}
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ───────── STEP 0: 플랜 (가입 선택값 표시 · 수정 가능) ─────────
function StepPlan({ state, patch }) {
  const sel = state.plan || {}
  const sg = readSignup()
  const planId = sel.id || sg.plan || 'bundle'
  const cycle = sel.cycle || sg.cycle || 'monthly'
  const [editing, setEditing] = useState(!planId)
  const choose = (id) => {
    const cm = certMapForPlan(planById(id))
    patch({ plan: { ...sel, id, cycle }, certs: { ...(state.certs || {}), kgmp: cm.kgmp, iso13485: cm.iso13485 } })
  }
  const setCycle = (c) => patch({ plan: { ...sel, id: planId, cycle: c } })
  const amount = planAmount(planId, cycle)

  return (
    <div className="space-y-5">
      <Section title="플랜" desc="가입 신청 시 선택한 요금제입니다. 변경이 필요하면 수정하세요. (실제 결제·청구는 가입 신청 단계에서 진행됩니다)" />
      {!editing ? (
        <div className="flex items-center justify-between flex-wrap gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50">
          <div className="text-[13px] text-slate-700">
            선택한 플랜: <b className="text-slate-900">{planName(planId)}</b> · {cycle === 'annual' ? '연 결제 (15% 할인)' : '월 결제'} · <b className="text-slate-900">{won(amount)}{cycle === 'annual' ? ' / 년' : ' / 월'}</b>
          </div>
          <button onClick={() => setEditing(true)} className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-[13px] font-medium text-slate-700">플랜 수정</button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-[13px]">
            <button onClick={() => setCycle('monthly')} className={`px-3 py-1.5 ${cycle === 'monthly' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-600'}`}>월 결제</button>
            <button onClick={() => setCycle('annual')} className={`px-3 py-1.5 ${cycle === 'annual' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-600'}`}>연 결제 (15% 할인)</button>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {loadPlans().filter((p) => p.id !== 'founding').map((p) => {
              const on = planId === p.id
              return (
                <button key={p.id} onClick={() => choose(p.id)}
                  className={`p-4 rounded-xl border text-left transition ${on ? 'border-emerald-500 ring-2 ring-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                  <div className="text-[15px] font-semibold text-slate-900">{p.name}</div>
                  <div className="mt-1 text-[20px] font-bold text-slate-900 tabular-nums">{won(planAmount(p.id, cycle))}<span className="text-[12px] font-normal text-slate-400"> / {cycle === 'annual' ? '년' : '월'}</span></div>
                </button>
              )
            })}
          </div>
          <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium">선택 완료</button>
        </div>
      )}
      <Banner>플랜 변경은 다음 결제 주기부터 반영됩니다.</Banner>
    </div>
  )
}

// ───────── STEP 1: 기본정보 · 제품 · 인증 ─────────
function StepInfo({ state, patch, setState }) {
  const c = state.company
  const setC = (k, v) => patch({ company: { ...c, [k]: v } })
  const [editCerts, setEditCerts] = useState(false)
  const onbPlans = loadPlans()
  const curPlan = planById(state.plan?.id, onbPlans)
  const cycle = state.plan?.cycle || 'monthly'
  const [planChange, setPlanChange] = useState(null) // {nextPlan,nextCerts,curPrice,nextPrice}
  const toggleCert = (id) => {
    const def = CERT_DEFS.find((c) => c.id === id)
    if (def && !def.planAvailable) {
      alert(def.label + '은(는) 준비중입니다. 도입을 원하시면 운영진에게 별도 문의해 주세요.')
      return
    }
    const nextCerts = { ...state.certs, [id]: !state.certs[id] }
    const onIds = PLAN_AVAILABLE_CERT_IDS.filter((x) => nextCerts[x])
    if (onIds.length === 0) { alert('최소 1개 이상의 인증이 필요합니다.'); return }
    const nextPlan = planForCertIds(onIds, onbPlans)
    if (!nextPlan) { alert('선택한 인증 조합에 맞는 플랜이 없습니다. 운영진에게 문의해 주세요.'); return }
    if (nextPlan.id === state.plan?.id) { patch({ certs: nextCerts }); return }
    setPlanChange({ nextPlan, nextCerts, curPrice: curPlan ? (priceFor(curPlan, cycle) || 0) : 0, nextPrice: priceFor(nextPlan, cycle) || 0 })
  }
  const applyPlanChange = () => {
    patch({ plan: { ...(state.plan || {}), id: planChange.nextPlan.id }, certs: planChange.nextCerts })
    setPlanChange(null)
  }
  const EMPTY = { name: '', itemName: '', grade: '2', cat1: '', cat2: '', etc: '', classNo: '', track: 'N', grp: '', contact: 'none', sterile: false, software: 'none' }
  const [form, setForm] = useState(EMPTY)
  const setF = (k, v) => setForm((ff) => ({ ...ff, [k]: v }))
  // 식약처(MFDS) 분류번호 자동입력
  const [mfdsReady, setMfdsReady] = useState(mfds.isReady())
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  useEffect(() => { mfds.load().then((list) => setMfdsReady((list || []).length > 0)) }, [])
  const onSearch = (v) => { setQ(v); setResults(v.trim() ? mfds.search(v) : []) }
  const pickItem = (it) => {
    setForm((ff) => ({
      ...ff,
      name: ff.name.trim() ? ff.name : it.name,
      itemName: it.name,
      classNo: it.no,
      grade: it.grade || ff.grade,
      track: it.track || 'N',
      grp: it.grp || '',
    }))
    setQ(''); setResults([])
  }
  const saveProduct = () => {
    if (!form.name.trim()) return
    setState((s) => ({ ...s, products: [...s.products, { id: uid(), ...form, name: form.name.trim() }] }))
    setForm(EMPTY)
  }
  const editProduct = (p) => {
    setForm({ ...EMPTY, ...p })
    setState((s) => ({ ...s, products: s.products.filter((x) => x.id !== p.id) }))
  }
  const delProduct = (id) => setState((s) => ({ ...s, products: s.products.filter((p) => p.id !== id) }))

  return (
    <div className="space-y-6">
      <Section title="회사 정보" desc="허가증·사업자등록증 기준으로 입력하세요.">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="회사명" value={c.name} onChange={(v) => setC('name', v)} placeholder="(주)퀄리트리" required />
          <Field label="대표자" value={c.ceo} onChange={(v) => setC('ceo', v)} placeholder="홍길동" />
          <Field label="사업자등록번호" value={c.bizNo} onChange={(v) => setC('bizNo', v)} placeholder="000-00-00000" />
          <Field label="제조업 허가번호" value={c.licenseNo} onChange={(v) => setC('licenseNo', v)} placeholder="제0000호" />
          <Field label="품질관리 책임자" value={c.qmRep} onChange={(v) => setC('qmRep', v)} placeholder="이름" />
        </div>
      </Section>

      <Section title="인증 · 플랜" desc="플랜에 따라 인증이 자동 연동됩니다. 인증을 추가/해제하면 플랜·요금이 함께 바뀌며, 변경 시 확인 창이 표시됩니다.">
        <div className="mb-3 flex items-center justify-between flex-wrap gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-[12.5px]">
          <span className="text-slate-600">현재 플랜 <b className="text-slate-900">{curPlan ? curPlan.name : '미선택'}</b></span>
          <span className="text-slate-700">{curPlan ? (won(priceFor(curPlan, cycle)) + (cycle === 'annual' ? ' / 년' : ' / 월')) : '플랜을 먼저 선택하세요'}</span>
        </div>
        {!editCerts ? (
          <div className="flex flex-wrap items-center gap-2">
            {CERT_DEFS.filter((ct) => state.certs[ct.id]).map((ct) => (
              <span key={ct.id} className="px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[13px] text-emerald-800">{ct.label}</span>
            ))}
            {CERT_DEFS.filter((ct) => state.certs[ct.id]).length === 0 && <span className="text-[12.5px] text-slate-400">선택된 인증이 없습니다</span>}
            <button onClick={() => setEditCerts(true)} className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-[13px] text-slate-700">수정</button>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-2">
              {CERT_DEFS.map((ct) => {
                const on = !!state.certs[ct.id]
                const soon = !ct.planAvailable
                return (
                  <button key={ct.id} onClick={() => toggleCert(ct.id)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition ${on ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:bg-slate-50'} ${soon ? 'opacity-60' : ''}`}>
                    <span className={`w-5 h-5 rounded flex items-center justify-center ${on ? 'bg-emerald-500 text-white' : 'border border-slate-300'}`}>{on && <Check size={13} />}</span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium text-slate-800 flex items-center gap-1.5">{ct.label}{soon && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">준비중</span>}</span>
                      <span className="block text-[11px] text-slate-500">{ct.sub}</span>
                    </span>
                  </button>
                )
              })}
            </div>
            <button onClick={() => setEditCerts(false)} className="mt-2 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[13px]">완료</button>
          </>
        )}
        {planChange && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setPlanChange(null)}>
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-[16px] font-bold text-slate-900 mb-1">플랜 변경 확인</h3>
              <p className="text-[12.5px] text-slate-500 mb-3">인증 구성을 바꾸면 플랜과 요금이 함께 변경됩니다.</p>
              <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 text-[13px] mb-3">
                <div className="flex justify-between px-3 py-2"><span className="text-slate-500">현재</span><span className="text-slate-800">{curPlan ? curPlan.name : '미선택'} · {won(planChange.curPrice)}{cycle === 'annual' ? ' / 년' : ' / 월'}</span></div>
                <div className="flex justify-between px-3 py-2"><span className="text-slate-500">변경 후</span><span className="font-semibold text-slate-900">{planChange.nextPlan.name} · {won(planChange.nextPrice)}{cycle === 'annual' ? ' / 년' : ' / 월'}</span></div>
                <div className="flex justify-between px-3 py-2">
                  <span className="text-slate-500">차액</span>
                  <span className={planChange.nextPrice >= planChange.curPrice ? 'font-bold text-rose-600' : 'font-bold text-emerald-600'}>
                    {planChange.nextPrice >= planChange.curPrice ? '+' : '−'}{won(Math.abs(planChange.nextPrice - planChange.curPrice))} {planChange.nextPrice >= planChange.curPrice ? '(증액)' : '(감액)'}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-sky-50 border border-sky-200 text-[12px] text-sky-800 mb-4">
                <Info size={14} className="shrink-0 mt-0.5" />
                <span>{planChange.nextPrice > planChange.curPrice ? '증액분에 대한 실제 청구는 가입/청구 단계에서 결제로 진행됩니다. 변경은 다음 결제 주기부터 반영됩니다.' : '감액은 다음 결제 주기부터 반영됩니다.'}</span>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setPlanChange(null)} className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm">취소</button>
                <button onClick={applyPlanChange} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium">변경 적용</button>
              </div>
            </div>
          </div>
        )}
      </Section>

      <Section title="제품 등록" desc="식약처 품목 검색으로 분류번호·등급을 자동 입력하거나 직접 입력하세요. '저장'을 누르면 아래 목록에 추가됩니다. 목록에서 항목을 눌러 수정·삭제할 수 있습니다.">
        <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50">
          {/* 식약처 품목 검색 → 분류번호·등급 자동입력 */}
          <div className="relative">
            <div className="flex items-center gap-1.5 text-[11.5px] text-slate-500 mb-1">
              <Search size={12} /> 식약처 품목 검색
              {mfdsReady
                ? <span className="text-emerald-600">· 선택하면 분류번호·등급이 자동 입력됩니다</span>
                : <span className="text-slate-400">· 품목 데이터를 불러오는 중…</span>}
            </div>
            <input className="input-cell" placeholder="품목명으로 검색 (예: 휠체어, 골절합용 나사, 카테터)" value={q} onChange={(e) => onSearch(e.target.value)} />
            {results.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 max-h-60 overflow-auto bg-white border border-slate-200 rounded-lg shadow-lg divide-y divide-slate-100">
                {results.map((it) => (
                  <button key={it.no} type="button" onClick={() => pickItem(it)} className="w-full text-left px-3 py-2 hover:bg-emerald-50 text-[12.5px]">
                    <span className="font-medium text-slate-800">{it.name}</span>
                    <span className="text-slate-400"> · {it.grade}등급</span>
                    <span className="font-mono text-[11px] text-slate-400"> · {it.no}</span>
                    {it.track === 'Y' && <span className="ml-1 text-[10px] px-1 rounded bg-amber-100 text-amber-700">추적관리</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-12 gap-2 items-center">
            <input className="col-span-6 input-cell" placeholder="제품명 (예: 골절합용 나사)" value={form.name} onChange={(e) => setF('name', e.target.value)} />
            <select className="col-span-3 input-cell" value={form.grade} onChange={(e) => setF('grade', e.target.value)}>
              <option value="1">1등급</option><option value="2">2등급</option><option value="3">3등급</option><option value="4">4등급</option>
            </select>
            <input className="col-span-3 input-cell" placeholder="분류번호 (예: A11010.01)" value={form.classNo} onChange={(e) => setF('classNo', e.target.value)} />
          </div>
          <div className="grid grid-cols-12 gap-2 items-center">
            <select className="col-span-4 input-cell" value={form.cat1} onChange={(e) => setF('cat1', e.target.value)}>
              <option value="">대분류 선택</option>
              {MDCAT1.map((cc) => <option key={cc} value={cc}>{cc}</option>)}
            </select>
            <select className="col-span-4 input-cell" value={form.cat2} onChange={(e) => setF('cat2', e.target.value)} disabled={!form.cat1 || form.cat1 === '기타'}>
              <option value="">중분류 선택</option>
              {(MDCAT[form.cat1] || []).map((cc) => <option key={cc} value={cc}>{cc}</option>)}
            </select>
            {(form.cat1 === '기타' || form.cat2 === '기타') ? (
              <input className="col-span-4 input-cell" placeholder="기타 업종 직접 입력" value={form.etc} onChange={(e) => setF('etc', e.target.value)} />
            ) : (
              <div className="col-span-4 text-[11px] text-slate-400 self-center">인허가 업종 분류</div>
            )}
          </div>
          <div className="grid grid-cols-12 gap-2 items-center">
            <select className="col-span-4 input-cell" value={form.contact} onChange={(e) => setF('contact', e.target.value)}>
              <option value="none">신체 비접촉</option>
              <option value="surface">피부·점막 접촉</option>
              <option value="external">체내 통신(혈류 등)</option>
              <option value="implantable">임플란트(이식)</option>
            </select>
            <select className="col-span-4 input-cell" value={form.software} onChange={(e) => setF('software', e.target.value)}>
              <option value="none">SW 없음</option>
              <option value="embedded">내장 SW</option>
              <option value="samd">독립형 SW (SaMD)</option>
            </select>
            <label className="col-span-4 flex items-center gap-2 text-[12px] text-slate-600 px-1">
              <input type="checkbox" checked={form.sterile} onChange={(e) => setF('sterile', e.target.checked)} /> 멸균 제품
            </label>
          </div>
          <div className="flex justify-end">
            <button onClick={saveProduct} disabled={!form.name.trim()} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-[13px] font-medium disabled:opacity-40"><Plus size={15} /> 저장</button>
          </div>
        </div>

        <div className="mt-3">
          <div className="text-[12px] text-slate-500 mb-1.5">저장된 제품 {state.products.length}건</div>
          {state.products.length === 0 ? (
            <div className="text-xs text-slate-400 py-3 text-center border border-dashed border-slate-200 rounded-lg">아직 저장된 제품이 없습니다. 위에서 입력 후 저장하세요.</div>
          ) : (
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
              {state.products.map((p) => {
                const cat = (p.cat1 === '기타' || p.cat2 === '기타') ? (p.etc || '기타') : [p.cat1, p.cat2].filter(Boolean).join(' › ')
                return (
                  <div key={p.id} className="flex items-center gap-2 px-3 py-2 text-[13px]">
                    <button onClick={() => editProduct(p)} className="flex-1 text-left min-w-0">
                      <span className="font-medium text-slate-800">{p.name || '(이름없음)'}</span>
                      <span className="text-slate-400"> · {p.grade}등급</span>
                      {cat && <span className="text-slate-500"> · {cat}</span>}
                      {p.classNo && <span className="text-slate-400"> · {p.classNo}</span>}
                    </button>
                    <span className="text-[10px] text-slate-300 shrink-0">클릭=수정</span>
                    <button onClick={() => delProduct(p.id)} className="text-slate-400 hover:text-rose-600 shrink-0"><Trash2 size={15} /></button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Section>
      <CellStyle />
    </div>
  )
}

// ───────── STEP 2: 조직도 (계층형) ─────────
function StepOrg({ state, setState }) {
  const nodes = state.departments || []
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState(() => (nodes[0] ? nodes[0].id : ''))
  const add = () => {
    const n = name.trim()
    if (!n) return
    setState((s) => ({ ...s, departments: [...s.departments, { id: uid(), name: n, parentId: parentId || null }] }))
    setName('')
  }
  const del = (id) => setState((s) => {
    const toDel = new Set([id])
    let changed = true
    while (changed) {
      changed = false
      s.departments.forEach((d) => { if (d.parentId && toDel.has(d.parentId) && !toDel.has(d.id)) { toDel.add(d.id); changed = true } })
    }
    return { ...s, departments: s.departments.filter((d) => !toDel.has(d.id)) }
  })
  const roots = nodes.filter((d) => !d.parentId)
  const childrenOf = (pid) => nodes.filter((d) => d.parentId === pid)
  const renderNode = (d, depth) => (
    <div key={d.id}>
      <div className="flex items-center gap-2 py-1" style={{ paddingLeft: depth * 22 }}>
        {depth > 0 && <span className="text-slate-300 text-[13px]">└</span>}
        <span className="px-3 py-1.5 rounded-lg bg-violet-50 border border-violet-200 text-[13px] text-violet-800">{d.name}</span>
        <button onClick={() => del(d.id)} className="text-slate-300 hover:text-rose-600"><Trash2 size={13} /></button>
      </div>
      {childrenOf(d.id).map((cc) => renderNode(cc, depth + 1))}
    </div>
  )

  return (
    <Section title="조직도" desc="상위 부서를 선택하고 하위 부서를 추가하세요. 대시보드·권한 매트릭스가 이 조직도 기준으로 구성됩니다.">
      <div className="border border-slate-200 rounded-lg p-3 mb-4 bg-white">
        {roots.length === 0 ? (
          <div className="text-xs text-slate-400 text-center py-3">조직도가 비어 있습니다. 아래에서 최상위 부서부터 추가하세요.</div>
        ) : roots.map((r) => renderNode(r, 0))}
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <select className="input-cell" style={{ maxWidth: 220 }} value={parentId} onChange={(e) => setParentId(e.target.value)}>
          <option value="">최상위 (부모 없음)</option>
          {nodes.map((d) => <option key={d.id} value={d.id}>{d.name} 하위</option>)}
        </select>
        <input className="input-cell" style={{ maxWidth: 240 }} placeholder="부서명 (예: 국내영업부)" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button onClick={add} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-800 text-white text-[13px] shrink-0"><Plus size={14} /> 추가</button>
      </div>
      <CellStyle />
    </Section>
  )
}

// ───────── STEP 3: 품질경영매뉴얼 ─────────
function StepManual({ state, patch }) {
  const m = state.manual || {}
  const [name, setName] = useState('')
  const chapters = Array.isArray(m.chapters) && m.chapters.length
    ? m.chapters
    : SEED_MANUAL.map((s, i) => ({ id: 'm' + i, c: s.c, name: s.name, included: true, custom: false }))
  const set = (k, v) => patch({ manual: { ...m, chapters, [k]: v } })
  const setChapters = (next) => patch({ manual: { ...m, chapters: next } })
  const toggle = (id, v) => setChapters(chapters.map((c) => (c.id === id ? { ...c, included: v } : c)))
  const addCustom = () => {
    const n = name.trim()
    if (!n) return
    setChapters([...chapters, { id: uid(), c: '+', name: n, included: true, custom: true }])
    setName('')
  }
  const del = (id) => setChapters(chapters.filter((c) => c.id !== id))

  const included = chapters.filter((c) => c.included).length
  const certNames = Object.entries(state.certs || {}).filter(([, v]) => v)
    .map(([k]) => ({ kgmp: 'KGMP', iso13485: 'ISO 13485', ce: 'CE MDR', fda: 'FDA', mdsap: 'MDSAP' }[k] || k))
  const ctx = [
    `회사 ${state.company?.name || '미입력'}`,
    `제품 ${(state.products || []).length}개`,
    `부서 ${(state.departments || []).length}개`,
    `인증 ${certNames.length ? certNames.join('·') : '없음'}`,
  ]

  return (
    <Section title="품질경영매뉴얼" desc="ISO 13485 / KGMP 조항 구조로 작성합니다. 시작 방식을 고르고, 우리 회사 매뉴얼에 포함할 장(章)을 구성하세요.">
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        {[
          { id: 'ai', icon: Sparkles, title: 'AI 초안으로 시작', desc: '조직도·제품·인증 정보를 바탕으로 초안을 자동 작성합니다. 검토만 하면 됩니다.' },
          { id: 'manual', icon: FileText, title: '직접 작성', desc: '빈 템플릿에서 직접 작성합니다.' },
        ].map((o) => {
          const Icon = o.icon
          const on = m.mode === o.id
          return (
            <button key={o.id} onClick={() => set('mode', o.id)}
              className={`p-4 rounded-xl border text-left transition ${on ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
              <div className="flex items-center gap-2 mb-1 font-medium text-slate-800"><Icon size={16} className={o.id === 'ai' ? 'text-violet-600' : 'text-slate-500'} /> {o.title}</div>
              <div className="text-[12px] text-slate-500">{o.desc}</div>
            </button>
          )
        })}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="text-[11.5px] text-slate-400 mr-1">초안 참조:</span>
        {ctx.map((t, i) => (
          <span key={i} className="text-[11.5px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{t}</span>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-2 text-[12.5px]">
        <span className="font-medium text-slate-700">매뉴얼 목차</span>
        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">포함 {included}</span>
        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">제외 {chapters.length - included}</span>
      </div>

      <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
        {chapters.map((ch) => (
          <div key={ch.id} className={`flex items-center gap-3 px-3 py-2 ${ch.included ? '' : 'opacity-50'}`}>
            <span className="text-[11px] text-slate-400 w-6 text-center tabular-nums">{ch.c}</span>
            <span className="flex-1 text-[13px] text-slate-800">
              {ch.name}
              {ch.custom && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">추가</span>}
            </span>
            <div className="flex rounded-lg overflow-hidden border border-slate-200 text-[12px]">
              <button onClick={() => toggle(ch.id, true)} className={`px-2.5 py-1 ${ch.included ? 'bg-emerald-500 text-white' : 'bg-white text-slate-500'}`}>포함</button>
              <button onClick={() => toggle(ch.id, false)} className={`px-2.5 py-1 ${!ch.included ? 'bg-slate-500 text-white' : 'bg-white text-slate-500'}`}>제외</button>
            </div>
            {ch.custom && (
              <button onClick={() => del(ch.id)} className="text-slate-300 hover:text-rose-600"><Trash2 size={14} /></button>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2 max-w-md mt-3">
        <input className="input-cell" placeholder="장(章) 직접 추가 (예: 부록 - 멸균 밸리데이션)" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCustom()} />
        <button onClick={addCustom} className="flex items-center gap-1 px-3 rounded-lg bg-slate-800 text-white text-[13px] shrink-0"><Plus size={14} /> 추가</button>
      </div>

      <div className="mt-4"><Banner>여기서 정한 시작 방식과 목차는 온보딩 후 <b>품질 문서</b> 화면(/documents)에서 실제 내용·AI 초안으로 채울 수 있습니다.</Banner></div>
      <CellStyle />
    </Section>
  )
}

// ───────── STEP 4: 절차서 (동적 체크리스트) ─────────
function StepProcedures({ state, setState }) {
  const [name, setName] = useState('')
  const items = state.procedures
  const applicable = items.filter((p) => p.applicable).length
  const setApplicable = (id, v) => setState((s) => ({ ...s, procedures: s.procedures.map((p) => (p.id === id ? { ...p, applicable: v } : p)) }))
  const addCustom = () => {
    const n = name.trim()
    if (!n) return
    setState((s) => ({ ...s, procedures: [...s.procedures, { id: uid(), name: n, applicable: true, custom: true }] }))
    setName('')
  }
  const del = (id) => setState((s) => ({ ...s, procedures: s.procedures.filter((p) => p.id !== id) }))

  return (
    <Section title="절차서 구성" desc="회사마다 이름·순서가 다르고 추가·제외될 수 있습니다. 우리 회사에 해당하는 절차서만 남기세요.">
      <div className="flex items-center gap-3 mb-3 text-[12.5px]">
        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">해당 {applicable}</span>
        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">비해당 {items.length - applicable}</span>
        <span className="text-slate-400">전체 {items.length}건</span>
      </div>

      <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-[420px] overflow-auto">
        {items.map((p, i) => (
          <div key={p.id} className={`flex items-center gap-3 px-3 py-2 ${p.applicable ? '' : 'opacity-50'}`}>
            <span className="text-[11px] text-slate-400 w-6 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
            <span className="flex-1 text-[13px] text-slate-800">
              {p.name}
              {p.custom && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">추가</span>}
            </span>
            <div className="flex rounded-lg overflow-hidden border border-slate-200 text-[12px]">
              <button onClick={() => setApplicable(p.id, true)} className={`px-2.5 py-1 ${p.applicable ? 'bg-emerald-500 text-white' : 'bg-white text-slate-500'}`}>해당</button>
              <button onClick={() => setApplicable(p.id, false)} className={`px-2.5 py-1 ${!p.applicable ? 'bg-slate-500 text-white' : 'bg-white text-slate-500'}`}>비해당</button>
            </div>
            {p.custom && (
              <button onClick={() => del(p.id)} className="text-slate-300 hover:text-rose-600"><Trash2 size={14} /></button>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2 max-w-md mt-3">
        <input className="input-cell" placeholder="절차서 직접 추가 (예: 위탁관리 절차서)" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCustom()} />
        <button onClick={addCustom} className="flex items-center gap-1 px-3 rounded-lg bg-slate-800 text-white text-[13px] shrink-0"><Plus size={14} /> 추가</button>
      </div>
      <CellStyle />
    </Section>
  )
}

// ───────── STEP 5: 계정 발급 ─────────
function StepAccounts({ state, setState }) {
  const seats = Number(state.plan?.seats) || 0 // 0 => 무제한 (플랜에 좌석 제한이 설정된 경우에만 적용)
  const used = state.members.length
  const full = seats > 0 && used >= seats
  const addMember = () => {
    if (full) return
    setState((s) => ({
      ...s, members: [...s.members, { id: uid(), name: '', dept: s.departments[0]?.name || '', role: 'OPERATOR', email: '' }],
    }))
  }
  const setMember = (id, k, v) => setState((s) => ({ ...s, members: s.members.map((m) => (m.id === id ? { ...m, [k]: v } : m)) }))
  const delMember = (id) => setState((s) => ({ ...s, members: s.members.filter((m) => m.id !== id) }))
  return (
    <Section title="구성원 · 계정 발급" desc="구성원을 추가하면 초대와 임시 비밀번호가 발급됩니다. 플랜에 따라 좌석 수가 제한됩니다.">
      <div className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-[12.5px] text-slate-700">
        좌석 사용 <b className="text-slate-900">{used}</b> / {seats > 0 ? seats : '무제한'}
        {full && <span className="text-rose-600">· 좌석이 가득 찼습니다</span>}
      </div>
      <div className="space-y-2">
        {state.members.length === 0 && (
          <div className="text-xs text-slate-400 py-3 text-center border border-dashed border-slate-200 rounded-lg">아직 구성원이 없습니다.</div>
        )}
        {state.members.map((m) => (
          <div key={m.id} className="grid grid-cols-12 gap-2 items-center">
            <input className="col-span-3 input-cell" placeholder="이름" value={m.name} onChange={(e) => setMember(m.id, 'name', e.target.value)} />
            <select className="col-span-3 input-cell" value={m.dept} onChange={(e) => setMember(m.id, 'dept', e.target.value)}>
              {state.departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
            <select className="col-span-2 input-cell" value={m.role} onChange={(e) => setMember(m.id, 'role', e.target.value)}>
              <option value="OPERATOR">작업자</option>
              <option value="INSPECTOR">검사관</option>
              <option value="MANAGER">매니저/RA</option>
            </select>
            <input className="col-span-3 input-cell" placeholder="이메일" value={m.email} onChange={(e) => setMember(m.id, 'email', e.target.value)} />
            <button onClick={() => delMember(m.id)} className="col-span-1 flex justify-center text-slate-400 hover:text-rose-600"><Trash2 size={15} /></button>
          </div>
        ))}
        <button onClick={addMember} disabled={full} className="flex items-center gap-1.5 text-[13px] text-emerald-700 font-medium mt-1 disabled:opacity-40"><Plus size={15} /> 구성원 추가</button>
      </div>
      <CellStyle />
    </Section>
  )
}

// ───────── 공통 ─────────
function Section({ title, desc, children }) {
  return (
    <div>
      <div className="mb-2">
        <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
        {desc && <p className="text-[12px] text-slate-500 mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  )
}

function Field({ label, value, onChange, placeholder, required }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-medium text-slate-600 mb-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      <input
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-emerald-500"
        value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

function Banner({ children }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-sky-50 border border-sky-200 text-[12.5px] text-sky-800">
      <Info size={15} className="shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  )
}

function CellStyle() {
  return <style>{`.input-cell{border:1px solid #e2e8f0;border-radius:8px;padding:7px 10px;font-size:13px;width:100%;background:#fff}.input-cell:focus{outline:none;border-color:#10b981}`}</style>
}
