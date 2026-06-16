import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2, Users, FileText, ClipboardCheck, UserPlus,
  Check, ChevronLeft, ChevronRight, Plus, Trash2, ShieldCheck, Info, Sparkles,
} from 'lucide-react'

const STORE_KEY = 'qualytree.onboarding'

// ───────── 시드 데이터 (KGMP 기준 · 품질관리 항목 정리.xlsx 기반) ─────────
const CERT_OPTIONS = [
  { id: 'kgmp', label: 'KGMP (의료기기 GMP)', sub: '식약처 · 기본', required: true },
  { id: 'iso13485', label: 'ISO 13485:2016', sub: '품질경영시스템' },
  { id: 'ce', label: 'CE MDR', sub: '유럽 (준비중)' },
  { id: 'fda', label: 'FDA 510(k)', sub: '미국 (준비중)' },
  { id: 'mdsap', label: 'MDSAP', sub: '5개국 단일심사 (준비중)' },
]

const DEFAULT_DEPARTMENTS = ['경영', '품질관리(QA)', '품질검사(QC)', '생산/제조', '자재/구매', '인허가(RA)']

// 절차서 시드 — 회사마다 이름·순서가 다르고 추가/제외될 수 있음
const SEED_PROCEDURES = [
  '문서관리 절차서', '기록관리 절차서', '도면관리 절차서', '경영검토 절차서', '교육훈련 절차서',
  '환경관리 절차서', '위험관리 절차서', '고객관리 절차서', '설계개발 절차서', '구매관리 절차서',
  '밸리데이션 절차서', '공정관리 절차서', '제품관리 절차서', '장비관리 절차서', 'UDI 절차서',
  '사용적합성 절차서', '소프트웨어 절차서', '고객불만 절차서', '내부감사 절차서', '검사 및 시험 절차서',
  '부적합품 절차서', '데이터분석 절차서', '시정조치 절차서', '예방조치 절차서', '안전성 정보관리 절차서',
  '프로세스 관리 절차서',
]

const STEPS = [
  { key: 'info', label: '기본정보·제품·인증', icon: Building2 },
  { key: 'org', label: '조직도', icon: Users },
  { key: 'manual', label: '품질경영매뉴얼', icon: FileText },
  { key: 'procedures', label: '절차서', icon: ClipboardCheck },
  { key: 'accounts', label: '계정 발급', icon: UserPlus },
]

function defaultState() {
  return {
    company: { name: '', ceo: '', bizNo: '', licenseNo: '', qmRep: '' },
    certs: { kgmp: true, iso13485: false, ce: false, fda: false, mdsap: false },
    products: [],
    departments: DEFAULT_DEPARTMENTS.map((n, i) => ({ id: 'd' + i, name: n })),
    manual: { mode: '', confirmed: false },
    procedures: SEED_PROCEDURES.map((n, i) => ({ id: 'p' + i, name: n, applicable: true, custom: false })),
    members: [],
    done: { info: false, org: false, manual: false, procedures: false, accounts: false },
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return defaultState()
    return { ...defaultState(), ...JSON.parse(raw) }
  } catch {
    return defaultState()
  }
}

const uid = () => Math.random().toString(36).slice(2, 9)

export default function Onboarding() {
  const nav = useNavigate()
  const [state, setState] = useState(loadState)
  const [step, setStep] = useState(0)

  // 변경 시 localStorage 저장
  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)) } catch { /* ignore */ }
  }, [state])

  const patch = (p) => setState((s) => ({ ...s, ...p }))
  const markDone = (key) => setState((s) => ({ ...s, done: { ...s.done, [key]: true } }))

  const doneCount = STEPS.filter((s) => state.done[s.key]).length
  const progress = Math.round((doneCount / STEPS.length) * 100)
  const cur = STEPS[step]

  const goNext = () => {
    markDone(cur.key)
    if (step < STEPS.length - 1) setStep(step + 1)
    else nav('/dashboard')
  }
  const goPrev = () => step > 0 && setStep(step - 1)

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-6">
      <div className="max-w-5xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-end justify-between flex-wrap gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              온보딩 <span className="text-base font-normal text-slate-500">초기 설정 가이드</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              KGMP 기준으로 회사·제품을 정의하면 필요한 항목이 자동으로 구성됩니다. 단계대로 따라오시면 됩니다.
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">진행률</div>
            <div className="text-3xl font-bold tabular-nums text-emerald-600">{progress}%</div>
          </div>
        </div>

        {/* 진행 바 */}
        <div className="h-2 w-full rounded-full bg-slate-200 mb-4 overflow-hidden">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
        </div>

        {/* 단계 네비 */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-5">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const active = i === step
            const complete = state.done[s.key]
            return (
              <button
                key={s.key}
                onClick={() => setStep(i)}
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
                  <span className="block text-[12.5px] font-medium text-slate-700 truncate flex items-center gap-1">
                    <Icon size={12} /> {s.label}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        {/* 단계 콘텐츠 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          {cur.key === 'info' && <StepInfo state={state} patch={patch} setState={setState} />}
          {cur.key === 'org' && <StepOrg state={state} setState={setState} />}
          {cur.key === 'manual' && <StepManual state={state} patch={patch} />}
          {cur.key === 'procedures' && <StepProcedures state={state} setState={setState} />}
          {cur.key === 'accounts' && <StepAccounts state={state} setState={setState} />}
        </div>

        {/* 하단 네비 */}
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

// ───────── STEP 1: 기본정보 · 제품 · 인증 ─────────
function StepInfo({ state, patch, setState }) {
  const c = state.company
  const setC = (k, v) => patch({ company: { ...c, [k]: v } })
  const toggleCert = (id) => {
    if (id === 'kgmp') return // 기본 필수
    patch({ certs: { ...state.certs, [id]: !state.certs[id] } })
  }
  const addProduct = () => setState((s) => ({
    ...s, products: [...s.products, { id: uid(), name: '', grade: '2', type: '', classNo: '' }],
  }))
  const setProduct = (id, k, v) => setState((s) => ({
    ...s, products: s.products.map((p) => (p.id === id ? { ...p, [k]: v } : p)),
  }))
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

      <Section title="인증 선택" desc="KGMP가 기본입니다. 추가로 받을 인증을 선택하면 항목이 자동으로 더해집니다.">
        <div className="grid sm:grid-cols-2 gap-2">
          {CERT_OPTIONS.map((ct) => {
            const on = state.certs[ct.id]
            return (
              <button
                key={ct.id}
                onClick={() => toggleCert(ct.id)}
                disabled={ct.required}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition ${
                  on ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                } ${ct.required ? 'cursor-default' : ''}`}
              >
                <span className={`w-5 h-5 rounded flex items-center justify-center ${on ? 'bg-emerald-500 text-white' : 'border border-slate-300'}`}>
                  {on && <Check size={13} />}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-slate-800 flex items-center gap-1.5">
                    {ct.label}
                    {ct.required && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600 text-white">기본</span>}
                  </span>
                  <span className="block text-[11px] text-slate-500">{ct.sub}</span>
                </span>
              </button>
            )
          })}
        </div>
      </Section>

      <Section title="제품 등록" desc="제품과 등급을 먼저 정하면, 그에 맞는 기술문서·절차서 항목이 자동으로 구성됩니다.">
        <div className="space-y-2">
          {state.products.length === 0 && (
            <div className="text-xs text-slate-400 py-3 text-center border border-dashed border-slate-200 rounded-lg">
              아직 등록된 제품이 없습니다. 아래 버튼으로 추가하세요.
            </div>
          )}
          {state.products.map((p) => (
            <div key={p.id} className="grid grid-cols-12 gap-2 items-center">
              <input className="col-span-4 input-cell" placeholder="제품명 (예: 골절합용 나사)" value={p.name} onChange={(e) => setProduct(p.id, 'name', e.target.value)} />
              <select className="col-span-2 input-cell" value={p.grade} onChange={(e) => setProduct(p.id, 'grade', e.target.value)}>
                <option value="1">1등급</option>
                <option value="2">2등급</option>
                <option value="3">3등급</option>
                <option value="4">4등급</option>
              </select>
              <input className="col-span-3 input-cell" placeholder="유형 (예: 인체이식형)" value={p.type} onChange={(e) => setProduct(p.id, 'type', e.target.value)} />
              <input className="col-span-2 input-cell" placeholder="분류번호" value={p.classNo} onChange={(e) => setProduct(p.id, 'classNo', e.target.value)} />
              <button onClick={() => delProduct(p.id)} className="col-span-1 flex justify-center text-slate-400 hover:text-rose-600">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <button onClick={addProduct} className="flex items-center gap-1.5 text-[13px] text-emerald-700 font-medium mt-1">
            <Plus size={15} /> 제품 추가
          </button>
        </div>
      </Section>
      <style>{`.input-cell{border:1px solid #e2e8f0;border-radius:8px;padding:7px 10px;font-size:13px;width:100%;background:#fff}.input-cell:focus{outline:none;border-color:#10b981}`}</style>
    </div>
  )
}

// ───────── STEP 2: 조직도 ─────────
function StepOrg({ state, setState }) {
  const [name, setName] = useState('')
  const add = () => {
    const n = name.trim()
    if (!n) return
    setState((s) => ({ ...s, departments: [...s.departments, { id: uid(), name: n }] }))
    setName('')
  }
  const del = (id) => setState((s) => ({ ...s, departments: s.departments.filter((d) => d.id !== id) }))
  return (
    <Section title="조직도 · 부서" desc="부서를 등록하면 권한 매트릭스와 역할별 대시보드가 이 부서 기준으로 구성됩니다.">
      <div className="flex flex-wrap gap-2 mb-3">
        {state.departments.map((d) => (
          <span key={d.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-200 text-[13px] text-violet-800">
            {d.name}
            <button onClick={() => del(d.id)} className="text-violet-400 hover:text-rose-600"><Trash2 size={13} /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2 max-w-md">
        <input
          className="input-cell" placeholder="부서명 추가 (예: 연구개발)"
          value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button onClick={add} className="flex items-center gap-1 px-3 rounded-lg bg-slate-800 text-white text-[13px] shrink-0"><Plus size={14} /> 추가</button>
      </div>
      <style>{`.input-cell{border:1px solid #e2e8f0;border-radius:8px;padding:7px 10px;font-size:13px;width:100%;background:#fff}.input-cell:focus{outline:none;border-color:#10b981}`}</style>
    </Section>
  )
}

// ───────── STEP 3: 품질경영매뉴얼 ─────────
function StepManual({ state, patch }) {
  const m = state.manual
  const set = (k, v) => patch({ manual: { ...m, [k]: v } })
  return (
    <Section title="품질경영매뉴얼" desc="ISO 13485 / KGMP 조항 구조로 작성합니다. 시작 방식을 선택하세요.">
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        {[
          { id: 'ai', icon: Sparkles, title: 'AI 초안으로 시작', desc: '조직도·제품 정보를 바탕으로 초안을 자동 작성합니다. 검토만 하면 됩니다.' },
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
      <Banner>
        실제 문서 편집기와 AI 초안은 다음 업데이트에서 연결됩니다. 지금은 시작 방식만 선택해 두세요.
      </Banner>
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
      <style>{`.input-cell{border:1px solid #e2e8f0;border-radius:8px;padding:7px 10px;font-size:13px;width:100%;background:#fff}.input-cell:focus{outline:none;border-color:#10b981}`}</style>
    </Section>
  )
}

// ───────── STEP 5: 계정 발급 ─────────
function StepAccounts({ state, setState }) {
  const addMember = () => setState((s) => ({
    ...s, members: [...s.members, { id: uid(), name: '', dept: s.departments[0]?.name || '', role: 'OPERATOR', email: '' }],
  }))
  const setMember = (id, k, v) => setState((s) => ({ ...s, members: s.members.map((m) => (m.id === id ? { ...m, [k]: v } : m)) }))
  const delMember = (id) => setState((s) => ({ ...s, members: s.members.filter((m) => m.id !== id) }))
  return (
    <Section title="구성원 · 계정 발급" desc="구성원을 추가하면 초대와 임시 비밀번호가 발급됩니다. 플랜에 따라 좌석 수가 제한됩니다.">
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
        <button onClick={addMember} className="flex items-center gap-1.5 text-[13px] text-emerald-700 font-medium mt-1"><Plus size={15} /> 구성원 추가</button>
      </div>
      <style>{`.input-cell{border:1px solid #e2e8f0;border-radius:8px;padding:7px 10px;font-size:13px;width:100%;background:#fff}.input-cell:focus{outline:none;border-color:#10b981}`}</style>
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
