import React, { useState, useEffect } from 'react'
import AppLayout from '../components/AppLayout'
import { auth } from '../lib/auth'
import { FileText, ClipboardCheck, BookOpen, ChevronDown, ChevronRight, Check, Info } from 'lucide-react'

const OB_KEY = 'qualytree.onboarding'
const DOC_KEY = 'qualytree.documents'

const GLOSSARY = [
  { t: '품질매뉴얼', en: 'Quality Manual', d: '품질경영시스템의 최상위 문서. 회사 소개·품질방침·조직·각 프로세스 개요를 담아 "우리 회사는 이렇게 품질을 관리한다"를 선언합니다.' },
  { t: '절차서', en: 'Procedure / SOP', d: '특정 업무를 누가·언제·어떻게 수행하는지 단계별로 정한 문서. 매뉴얼보다 구체적입니다. (예: 문서관리 절차서, 부적합품 절차서)' },
  { t: 'SOP', en: 'Standard Operating Procedure', d: '표준작업절차. 절차서의 영문 표현으로, 반복 업무의 표준 방법을 글로 고정한 것입니다.' },
  { t: '부적합 (NC)', en: 'Nonconformance', d: '제품·공정·시스템이 정해진 요구사항(규격·절차)을 만족하지 못한 상태. 한마디로 "기준에서 벗어남"입니다.' },
  { t: 'NCR', en: 'Nonconformance Report', d: '부적합 보고서. 부적합이 발견됐을 때 무엇이·어디서·왜 벗어났는지 기록하고 처리 방법(폐기·재작업·특채 등)을 결정하는 문서입니다.' },
  { t: 'CAPA', en: 'Corrective & Preventive Action', d: '시정 및 예방 조치. 부적합의 근본원인을 찾아 다시 생기지 않게 고치고(시정), 비슷한 문제를 미리 막는(예방) 활동입니다.' },
  { t: '시정조치', en: 'Corrective Action', d: '이미 발생한 문제의 원인을 제거해 재발을 막는 조치.' },
  { t: '예방조치', en: 'Preventive Action', d: '아직 발생하지 않았지만 가능성이 있는 문제를 사전에 막는 조치.' },
  { t: '격리', en: 'Quarantine', d: '부적합(의심) 제품을 정상품과 분리·보관해 잘못 사용·출고되지 않도록 막아두는 것.' },
]

export default function Documents() {
  const user = auth.current()
  const ob = (() => { try { return JSON.parse(localStorage.getItem(OB_KEY) || '{}') } catch { return {} } })()
  const manualChapters = (ob.manual && Array.isArray(ob.manual.chapters)) ? ob.manual.chapters.filter((c) => c.included !== false) : []
  const procedures = Array.isArray(ob.procedures) ? ob.procedures.filter((p) => p.applicable !== false) : []

  const [docs, setDocs] = useState(() => { try { return JSON.parse(localStorage.getItem(DOC_KEY) || '{}') } catch { return {} } })
  useEffect(() => { try { localStorage.setItem(DOC_KEY, JSON.stringify(docs)) } catch { /* ignore */ } }, [docs])

  const [tab, setTab] = useState('manual')
  const [openId, setOpenId] = useState(null)

  const setContent = (id, v) => setDocs((d) => ({ ...d, [id]: { ...(d[id] || {}), content: v, updatedAt: Date.now() } }))
  const toggleDone = (id) => setDocs((d) => ({ ...d, [id]: { ...(d[id] || {}), status: (d[id]?.status === 'done' ? 'draft' : 'done'), updatedAt: Date.now() } }))

  const items = tab === 'manual'
    ? manualChapters.map((c) => ({ id: 'M-' + c.id, label: (c.c ? c.c + '. ' : '') + c.name }))
    : tab === 'procedures'
      ? procedures.map((p) => ({ id: 'P-' + p.id, label: p.name }))
      : []
  const doneCount = items.filter((it) => docs[it.id]?.status === 'done').length

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
          <span>온보딩에서 고른 <b>매뉴얼 목차</b>와 <b>절차서</b>가 아래에 항목으로 나타납니다. 각 항목을 펼쳐 내용을 작성하면 자동 저장되고, 다 쓰면 <b>완료</b>로 표시하세요. 용어가 헷갈리면 <b>용어 사전</b> 탭을 참고하세요.</span>
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
                <div className="mb-2 text-[12.5px] text-slate-500">작성 완료 <b className="text-emerald-700">{doneCount}</b> / {items.length}</div>
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
                            <textarea
                              value={rec.content || ''}
                              onChange={(e) => setContent(it.id, e.target.value)}
                              placeholder={tab === 'manual' ? '이 장(章)에 들어갈 내용을 작성하세요. (목적·범위·책임·세부 내용 등)' : '이 절차의 목적·적용범위·책임·수행 순서·관련 기록을 작성하세요.'}
                              rows={10}
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] leading-relaxed focus:outline-none focus:border-emerald-500 resize-y"
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
