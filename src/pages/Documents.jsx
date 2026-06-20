import React, { useState, useEffect } from 'react'
import AppLayout from '../components/AppLayout'
import { auth } from '../lib/auth'
import { FileText, ClipboardCheck, BookOpen, ChevronDown, ChevronRight, Check, Info, Sparkles } from 'lucide-react'

const OB_KEY = 'qualytree.onboarding'
const DOC_KEY = 'qualytree.documents'
const KGMP = '식약처 고시 「의료기기 제조 및 품질관리 기준」(별표2, 최신 개정본 확인)'

const GLOSSARY = [
  { t: '품질매뉴얼', en: 'Quality Manual', d: '품질경영시스템의 최상위 문서. 적용범위·제외사유·문서구조·프로세스 상호작용을 담습니다. (ISO 13485 §4.2.2)' },
  { t: '절차서', en: 'Procedure / SOP', d: '특정 업무를 누가·언제·어떻게 수행하는지 단계별로 정한 문서. 매뉴얼보다 구체적입니다.' },
  { t: 'SOP', en: 'Standard Operating Procedure', d: '표준작업절차. 절차서의 영문 표현으로, 반복 업무의 표준 방법을 글로 고정한 것입니다.' },
  { t: '부적합 (NC)', en: 'Nonconformance', d: '제품·공정·시스템이 정해진 요구사항(규격·절차)을 만족하지 못한 상태.' },
  { t: 'NCR', en: 'Nonconformance Report', d: '부적합 보고서. 무엇이·왜 벗어났는지 기록하고 처리(폐기·재작업·특채)를 결정하는 문서. (ISO 13485 §8.3)' },
  { t: 'CAPA', en: 'Corrective & Preventive Action', d: '시정 및 예방 조치. 근본원인을 찾아 재발을 막고(시정·§8.5.2) 비슷한 문제를 미리 막는(예방·§8.5.3) 활동.' },
  { t: '시정조치', en: 'Corrective Action', d: '이미 발생한 문제의 원인을 제거해 재발을 막는 조치. (ISO 13485 §8.5.2)' },
  { t: '예방조치', en: 'Preventive Action', d: '발생 가능성이 있는 문제를 사전에 막는 조치. (ISO 13485 §8.5.3)' },
  { t: '격리', en: 'Quarantine', d: '부적합(의심) 제품을 정상품과 분리·보관해 잘못 사용·출고되지 않도록 막아두는 것.' },
  { t: 'KGMP', en: 'Korea GMP', d: '의료기기 제조 및 품질관리 기준(식약처 고시). ISO 13485:2016 구조(§4~§8)를 채택하고 있습니다.' },
]

// ── 회사 컨텍스트 ──
function getCtx() {
  let ob = {}
  try { ob = JSON.parse(localStorage.getItem(OB_KEY) || '{}') } catch { /* */ }
  const c = ob.company || {}
  const certMap = { kgmp: 'KGMP', iso13485: 'ISO 13485', ce: 'CE MDR', fda: 'FDA QMSR', mdsap: 'MDSAP' }
  const certs = Object.entries(ob.certs || {}).filter(([, v]) => v).map(([k]) => certMap[k] || k)
  return {
    name: c.name || '(회사명)', ceo: c.ceo || '(대표이사)', qmRep: c.qmRep || '(품질책임자)',
    certs, products: ob.products || [], depts: ob.departments || [],
  }
}
const certText = (ctx) => (ctx.certs.length ? ctx.certs.join(', ') : 'KGMP / ISO 13485')
const prodList = (ctx) => (ctx.products.length ? ctx.products.map((p) => `   · ${p.name}${p.grade ? ` (${p.grade}등급)` : ''}${p.classNo ? ` [분류 ${p.classNo}]` : ''}`).join('\n') : '   · (등록된 제품 없음 — 제품 등록 후 갱신)')
const deptList = (ctx) => (ctx.depts.length ? ctx.depts.map((d) => `   · ${d.name}`).join('\n') : '   · (조직 정보 없음)')

function hdr(title, iso, kgmp) {
  return `${title}\n근거: ISO 13485:2016 ${iso}  /  KGMP ${KGMP} ${kgmp}\n※ AI가 생성한 기본 초안입니다. 최신 고시 원문(law.go.kr · mfds.go.kr)과 대조하여 회사 실정에 맞게 검토·확정하세요.\n${'─'.repeat(44)}\n`
}

// ── 품질매뉴얼 장별 초안 ──
function genManual(c, name, ctx) {
  const co = ctx.name
  switch (String(c)) {
    case '0': return hdr(`[0. ${name}]`, '§4.1, §4.2.2', '§4.1, §4.2.2') +
      `1. 회사 개요\n   - 회사명: ${co}\n   - 대표이사: ${ctx.ceo}\n   - 품질책임자: ${ctx.qmRep}\n\n2. 적용 범위 (Scope)\n   본 품질경영시스템은 ${co}가 수행하는 의료기기의 설계·개발·제조·판매 활동에 적용한다.\n   적용 제품:\n${prodList(ctx)}\n\n3. 적용 표준 / 인증\n   ${certText(ctx)}\n\n4. 제외 및 비적용 (ISO 13485 §4.2.2 — 제외 시 사유 명시 필수)\n   - 예) 설계·개발(§7.3): 해당/비해당 및 사유 [작성]\n   - 비적용 조항은 §6·§7·§8 범위에서만 가능하며 각각 사유를 기재한다.\n`
    case '1': return hdr(`[1. ${name}]`, '§5.3(품질방침), §5.4.1(품질목표)', '§5.3, §5.4.1') +
      `1. 품질방침\n   ${co}는 환자와 고객의 안전을 최우선으로 하고, 의료기기법 및 ${certText(ctx)} 요구사항을 준수하며, 품질경영시스템의 지속적 개선을 통해 신뢰받는 의료기기를 제공한다. 본 방침은 전 임직원에게 전달·이해되며 정기적으로 적절성을 검토한다.\n\n2. 품질목표 (측정 가능하게 설정 — 예시)\n   - 출하 부적합률 [목표]% 이하\n   - 고객 불만 처리 기한 준수율 [목표]% 이상\n   - 내부감사 지적사항 시정조치 완료율 100%\n   품질목표는 매년 경영검토(§5.6)에서 검토·갱신한다.\n`
    case '2': return hdr(`[2. ${name}]`, '§5.5.1(책임과 권한), §5.5.2(경영대리인)', '§5.5') +
      `1. 조직도\n   대표이사(${ctx.ceo}) 산하 조직:\n${deptList(ctx)}\n\n2. 책임과 권한\n   - 대표이사: 품질경영시스템 수립·자원 제공·경영검토 주관 (§5.1)\n   - 품질책임자/경영대리인(${ctx.qmRep}): QMS의 수립·유지 보장, 법규 적합성 보증, 경영진 보고, 규제기관 연락 창구 (§5.5.2)\n   - 각 부서장: 담당 업무의 품질 확보 및 절차 준수\n   ※ 의료기기법상 '품질책임자'의 직무·자격 요건을 함께 반영할 것.\n`
    case '3': return hdr(`[3. ${name}]`, '§2(인용규격), §3(용어와 정의)', '§2, §3') +
      `1. 인용 규격\n   - ${KGMP}\n   - ISO 13485:2016 의료기기 품질경영시스템\n   - ISO 14971 위험관리${ctx.certs.includes('FDA QMSR') ? '\n   - 21 CFR Part 820 (US QMSR)' : ''}${ctx.certs.includes('CE MDR') ? '\n   - EU MDR 2017/745' : ''}\n\n2. 용어와 정의\n   - 의료기기, 부적합, 시정조치, 예방조치, 위험, 밸리데이션 등은 인용 규격의 정의를 따른다.\n`
    case '4': return hdr(`[4. ${name}]`, '§4.1, §4.2(문서화 요구사항)', '§4.1, §4.2') +
      `1. 일반 요구사항 (§4.1)\n   ${co}는 본 기준에 따라 QMS를 문서화·실행·유지하고 효과성을 지속적으로 개선한다. 프로세스, 순서 및 상호작용을 파악·관리한다.\n\n2. 문서화 구조 (§4.2.1) — 4단계\n   1단계 품질매뉴얼 → 2단계 절차서 → 3단계 지침/작업표준 → 4단계 양식·기록\n\n3. 의료기기 파일 (§4.2.3)\n   제품(군)별로 사양·제조·검사·설치·서비스 문서를 파일로 유지한다.\n\n4. 문서관리(§4.2.4) 및 기록관리(§4.2.5)\n   별도 「문서관리 절차서」·「기록관리 절차서」에 따른다.\n`
    case '5': return hdr(`[5. ${name}]`, '§5.1~§5.6 (특히 §5.6 경영검토)', '§5') +
      `1. 경영 의지 (§5.1) / 고객 중심 (§5.2)\n2. 품질방침(§5.3) 및 기획(§5.4)\n3. 책임·권한·의사소통 (§5.5)\n4. 경영검토 (§5.6)\n   - 주기: 연 [N]회 이상\n   - 입력: 감사결과, 고객피드백/불만, 공정·제품 적합성, 부적합·CAPA 현황, 이전 조치 후속, 변경, 개선 권고, 법규 변경\n   - 출력: QMS 개선, 제품 개선, 자원 필요사항, 법규 대응\n`
    case '6': return hdr(`[6. ${name}]`, '§6.1~§6.4 (인적자원·기반시설·작업환경/오염관리)', '§6') +
      `1. 자원 제공 (§6.1)\n2. 인적자원 (§6.2): 직무별 역량 기준·교육훈련·평가 → 「교육훈련 절차서」\n3. 기반시설 (§6.3): 건물·설비·장비·유틸리티 관리 → 「장비관리 절차서」\n4. 작업환경 및 오염관리 (§6.4): 청정도·복장·위생, 멸균/무균 제품 시 오염관리(§6.4.2)\n`
    case '7': return hdr(`[7. ${name}]`, '§7.1~§7.6 (기획·고객·설계개발·구매·생산·모니터링장치)', '§7') +
      `대상 제품:\n${prodList(ctx)}\n\n1. 제품실현 기획 (§7.1) — 위험관리(ISO 14971) 포함\n2. 고객 관련 프로세스 (§7.2)\n3. 설계 및 개발 (§7.3) — 해당 시 → 「설계개발 절차서」\n4. 구매 (§7.4) — 공급자 평가 → 「구매관리 절차서」\n5. 생산 및 서비스 제공 (§7.5) — 공정관리·밸리데이션(§7.5.6)·식별/추적성(§7.5.8~9)·보존(§7.5.11)\n6. 모니터링 및 측정장치 관리 (§7.6) — 교정\n`
    case '8': return hdr(`[8. ${name}]`, '§8.1~§8.5 (피드백·불만·내부감사·부적합·데이터분석·CAPA)', '§8') +
      `1. 일반 (§8.1)\n2. 모니터링 및 측정 (§8.2): 피드백(§8.2.1)·불만처리(§8.2.2)·규제기관 보고(§8.2.3)·내부감사(§8.2.4)\n3. 부적합 제품 관리 (§8.3) → 「부적합품 절차서」\n4. 데이터 분석 (§8.4)\n5. 개선 (§8.5): 시정조치(§8.5.2)·예방조치(§8.5.3) → 「시정조치/예방조치 절차서」\n`
    default: return hdr(`[${name}]`, '해당 조항 확인', '해당 조항 확인') +
      `1. 목적\n   본 장의 목적을 기재한다.\n\n2. 적용 범위\n   ${co}의 관련 활동에 적용한다.\n\n3. 세부 내용\n   [작성]\n`
  }
}

// ── 절차서 초안 (키워드→조항 매핑) ──
const PCLAUSE = [
  [/문서/, '§4.2.4', 'KGMP §4.2.4'], [/기록/, '§4.2.5', 'KGMP §4.2.5'],
  [/경영검토|경영 검토/, '§5.6', 'KGMP §5.6'], [/교육|훈련|역량|인적/, '§6.2', 'KGMP §6.2'],
  [/장비|설비|시설|기반/, '§6.3', 'KGMP §6.3'], [/작업환경|환경관리|오염|청정/, '§6.4', 'KGMP §6.4'],
  [/위험|리스크/, '§7.1 (ISO 14971 연계)', 'KGMP §7.1'], [/불만|고객/, '§7.2 / §8.2.1~2', 'KGMP §7.2/§8.2'],
  [/설계|개발/, '§7.3', 'KGMP §7.3'], [/구매/, '§7.4', 'KGMP §7.4'],
  [/멸균/, '§7.5.7', 'KGMP §7.5.7'], [/밸리데이션|유효성/, '§7.5.6', 'KGMP §7.5.6'],
  [/공정|생산|제조|프로세스/, '§7.5.1', 'KGMP §7.5'], [/식별|추적|UDI/, '§7.5.8~9 / 의료기기법 UDI', 'KGMP §7.5.8'],
  [/보존|취급|포장|보관/, '§7.5.11', 'KGMP §7.5.11'], [/검사|시험|측정장치|모니터링/, '§7.6 / §8.2.6', 'KGMP §7.6'],
  [/내부감사|내부심사/, '§8.2.4', 'KGMP §8.2.4'], [/부적합/, '§8.3', 'KGMP §8.3'],
  [/데이터/, '§8.4', 'KGMP §8.4'], [/시정/, '§8.5.2', 'KGMP §8.5.2'], [/예방/, '§8.5.3', 'KGMP §8.5.3'],
  [/안전성|시판후|감시|부작용/, '§8.2.3 / 의료기기법 부작용보고', 'KGMP §8.2.3'],
  [/소프트웨어/, '§4.1.6 / §7.5.6', 'KGMP §4.1.6'], [/사용적합성/, '§7.3 (IEC 62366-1)', 'KGMP §7.3'],
]
function genProc(name, ctx) {
  const m = PCLAUSE.find(([re]) => re.test(name))
  const iso = m ? m[1] : '해당 조항 확인'
  const kgmp = m ? ('별표2 ' + m[2].replace('KGMP ', '')) : '별표2 해당 조항'
  const base = name.replace(/\s*절차서$/, '')
  return hdr(`[${name}]`, iso, kgmp) +
    `1. 목적\n   본 절차는 ${ctx.name}의 ${base} 업무를 표준화하여 ${certText(ctx)} 요구사항에 적합하게 수행함을 목적으로 한다.\n\n` +
    `2. 적용 범위\n   ${ctx.name}의 ${base} 관련 모든 활동에 적용한다.\n\n` +
    `3. 용어의 정의\n   - (필요한 용어를 정의한다)\n\n` +
    `4. 책임과 권한\n   - 품질책임자(${ctx.qmRep}): 본 절차의 수립·개정 및 이행 감독\n   - 해당 부서장: 절차 준수 및 기록 유지\n\n` +
    `5. 업무 절차\n   5.1 [단계 1 — 입력/조건]\n   5.2 [단계 2 — 수행/판정]\n   5.3 [단계 3 — 승인/기록]\n\n` +
    `6. 관련 기록 및 양식\n   - [양식번호 / 기록명 기재]  (보관기간은 「기록관리 절차서」 따름)\n\n` +
    `7. 개정 이력\n   Rev.0  최초 제정  ${new Date().toISOString().slice(0, 10)}\n`
}

export default function Documents() {
  const user = auth.current()
  const ob = (() => { try { return JSON.parse(localStorage.getItem(OB_KEY) || '{}') } catch { return {} } })()
  const ctx = getCtx()
  const manualChapters = (ob.manual && Array.isArray(ob.manual.chapters)) ? ob.manual.chapters.filter((c) => c.included !== false) : []
  const procedures = Array.isArray(ob.procedures) ? ob.procedures.filter((p) => p.applicable !== false) : []

  const [docs, setDocs] = useState(() => { try { return JSON.parse(localStorage.getItem(DOC_KEY) || '{}') } catch { return {} } })
  useEffect(() => { try { localStorage.setItem(DOC_KEY, JSON.stringify(docs)) } catch { /* */ } }, [docs])

  const [tab, setTab] = useState('manual')
  const [openId, setOpenId] = useState(null)

  const setContent = (id, v) => setDocs((d) => ({ ...d, [id]: { ...(d[id] || {}), content: v, updatedAt: Date.now() } }))
  const toggleDone = (id) => setDocs((d) => ({ ...d, [id]: { ...(d[id] || {}), status: (d[id]?.status === 'done' ? 'draft' : 'done'), updatedAt: Date.now() } }))

  const items = tab === 'manual'
    ? manualChapters.map((c) => ({ id: 'M-' + c.id, label: (c.c ? c.c + '. ' : '') + c.name, c: c.c, name: c.name, kind: 'manual' }))
    : tab === 'procedures'
      ? procedures.map((p) => ({ id: 'P-' + p.id, label: p.name, name: p.name, kind: 'proc' }))
      : []
  const doneCount = items.filter((it) => docs[it.id]?.status === 'done').length

  const draftFor = (it) => (it.kind === 'manual' ? genManual(it.c, it.name, ctx) : genProc(it.name, ctx))
  const genOne = (it) => {
    if (docs[it.id]?.content && !window.confirm('이미 작성된 내용이 있습니다. AI 초안으로 덮어쓸까요?')) return
    setContent(it.id, draftFor(it)); setOpenId(it.id)
  }
  const genAllEmpty = () => {
    const targets = items.filter((it) => !docs[it.id]?.content)
    if (targets.length === 0) { window.alert('비어있는 항목이 없습니다. (이미 작성된 항목은 덮어쓰지 않습니다)'); return }
    if (!window.confirm(`비어있는 ${targets.length}개 항목에 AI 기본 초안을 생성합니다. 진행할까요?`)) return
    setDocs((d) => { const n = { ...d }; targets.forEach((it) => { n[it.id] = { ...(n[it.id] || {}), content: draftFor(it), updatedAt: Date.now() } }); return n })
  }

  const tabs = [
    { k: 'manual', label: '품질매뉴얼', icon: FileText, n: manualChapters.length },
    { k: 'procedures', label: '절차서', icon: ClipboardCheck, n: procedures.length },
    { k: 'glossary', label: '용어 사전', icon: BookOpen },
  ]

  return (
    <AppLayout user={user} title="품질 문서" subtitle="품질매뉴얼 · 절차서 작성">
      <div className="px-6 py-6 max-w-5xl mx-auto">
        <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-sky-50 border border-sky-200 text-[12.5px] text-sky-800">
          <Info size={15} className="shrink-0 mt-0.5" />
          <span>온보딩에서 고른 <b>매뉴얼 목차</b>와 <b>절차서</b>가 항목으로 나타납니다. <b>AI 초안 생성</b>을 누르면 ISO 13485 / KGMP 조항 구조에 맞춘 기본 초안이 회사 정보와 함께 채워집니다. 초안은 <b>근거 조항</b>이 표기되며, 반드시 최신 고시 원문과 대조해 확정하세요. 작성하면 자동 저장됩니다.</span>
        </div>

        <div className="flex gap-2 mb-4">
          {tabs.map((tb) => {
            const Icon = tb.icon
            const on = tab === tb.k
            return (
              <button key={tb.k} onClick={() => setTab(tb.k)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[13px] font-medium transition ${on ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                <Icon size={15} /> {tb.label}{typeof tb.n === 'number' && <span className="text-[11px] text-slate-400">({tb.n})</span>}
              </button>
            )
          })}
        </div>

        {tab === 'glossary' && (
          <div className="grid gap-2">
            {GLOSSARY.map((g) => (
              <div key={g.t} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="text-[13.5px] font-semibold text-slate-800">{g.t} <span className="text-[11px] font-normal text-slate-400">{g.en}</span></div>
                <div className="text-[12.5px] text-slate-600 mt-1 leading-relaxed">{g.d}</div>
              </div>
            ))}
          </div>
        )}

        {(tab === 'manual' || tab === 'procedures') && (
          <>
            {items.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-200 rounded-lg text-[13px] text-slate-400">
                온보딩에서 {tab === 'manual' ? '매뉴얼 목차를 구성' : '절차서를 선택'}하면 여기에 나타납니다.
              </div>
            ) : (
              <>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-[12.5px] text-slate-500">작성 완료 <b className="text-emerald-700">{doneCount}</b> / {items.length}</div>
                  <button onClick={genAllEmpty} className="flex items-center gap-1.5 text-[12.5px] font-medium px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700">
                    <Sparkles size={14} /> 비어있는 항목 AI 초안 일괄 생성
                  </button>
                </div>
                <div className="grid gap-2">
                  {items.map((it) => {
                    const rec = docs[it.id] || {}
                    const open = openId === it.id
                    const done = rec.status === 'done'
                    return (
                      <div key={it.id} className={`rounded-lg border bg-white ${done ? 'border-emerald-200' : 'border-slate-200'}`}>
                        <button onClick={() => setOpenId(open ? null : it.id)} className="w-full flex items-center gap-2 px-3 py-2.5 text-left">
                          {open ? <ChevronDown size={15} className="text-slate-400" /> : <ChevronRight size={15} className="text-slate-400" />}
                          <span className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold ${done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>{done ? <Check size={12} /> : ''}</span>
                          <span className="flex-1 text-[13px] font-medium text-slate-800">{it.label}</span>
                          {rec.content ? <span className="text-[10.5px] text-slate-400">{done ? '완료' : '작성중'}</span> : <span className="text-[10.5px] text-slate-300">미작성</span>}
                        </button>
                        {open && (
                          <div className="px-3 pb-3">
                            <div className="flex justify-end mb-2">
                              <button onClick={() => genOne(it)} className="flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-lg border border-violet-300 text-violet-700 hover:bg-violet-50">
                                <Sparkles size={13} /> AI 초안 생성
                              </button>
                            </div>
                            <textarea
                              value={rec.content || ''}
                              onChange={(e) => setContent(it.id, e.target.value)}
                              placeholder={'내용을 직접 작성하거나, 위 "AI 초안 생성"으로 기본 초안을 채운 뒤 수정하세요.'}
                              rows={14}
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[12.5px] leading-relaxed focus:outline-none focus:border-emerald-500 resize-y font-mono"
                            />
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[11px] text-slate-400">{rec.updatedAt ? '자동 저장됨' : '작성하면 자동 저장됩니다'}</span>
                              <button onClick={() => toggleDone(it.id)} className={`text-[12px] font-medium px-3 py-1.5 rounded-lg ${done ? 'border border-slate-300 text-slate-600 hover:bg-slate-50' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>{done ? '완료 취소' : '작성 완료로 표시'}</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}
