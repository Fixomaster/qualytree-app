import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Factory, ArrowRight, FileDown, FileCheck2 } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import { buildKgmpSections, summarizeKgmpSections } from '../../lib/kgmpProgress'
import { buildApprovedDocumentBundleHtml, downloadHtmlAsPdf } from '../../lib/kgmpDocumentBundle'
import KgmpSectionList from '../../components/KgmpSectionList'
import CertGate from '../../components/CertGate'

const KGMP_CATS = [
  { title: "품질경영 시스템", items: ["품질방침·목표 수립 및 문서화", "품질매뉴얼 작성 및 최신 유지", "경영검토 연 1회 이상 실시 및 기록"] },
  { title: "문서·기록 관리", items: ["문서 승인·배포·개정 절차 수립", "기록 보관기간 설정 및 관리", "외부 출처 문서(고시, 규격) 관리"] },
  { title: "인적자원·교육", items: ["직무별 자격요건 및 교육훈련 계획 수립", "교육훈련 효과성 평가 및 기록", "역량·자격 증빙서류 관리"] },
  { title: "인프라·작업환경", items: ["제조환경 모니터링(온도·습도 등) 기록", "방충·이물 방지 관리 절차 및 기록", "설비 정기 유지보수 계획 및 기록"] },
  { title: "제품 실현·생산", items: ["작업지시서·배치(Batch) 기록 관리", "공정별 검사 기준 설정 및 기록", "부적합 제품 식별·격리·처분 절차"] },
  { title: "구매·공급업체", items: ["공급업체 평가·승인 절차 및 기록", "수입검사 기준 및 기록", "구매 사양서 작성 및 관리"] },
  { title: "식별·추적성", items: ["제품·원자재 LOT 번호 부여 및 추적", "시험 상태 식별(합격/불합격/검사중) 관리"] },
  { title: "교정·계측", items: ["교정 계획 수립 및 교정 기록 보관", "교정 불합격 장비 격리 및 재교정 조치"] },
  { title: "내부감사", items: ["연 1회 이상 내부 감사 실시", "감사 결과 시정조치 연계 및 완료 확인"] },
  { title: "개선·불만관리", items: ["부적합 보고 및 CAPA 절차 수립", "고객 불만 접수·처리·완료 기록", "이상사례 발생 시 식약처 보고"] },
]

function KgmpChecklist() {
  const [chk, setChk] = useState(() => { try { return JSON.parse(localStorage.getItem("qualytree.kgmp.checklist") || "{}") } catch { return {} } })
  const toggle = k => { const n={...chk,[k]:!chk[k]}; setChk(n); localStorage.setItem("qualytree.kgmp.checklist",JSON.stringify(n)) }
  const total = KGMP_CATS.reduce((s,c)=>s+c.items.length,0)
  const done = Object.values(chk).filter(Boolean).length
  const pct = total ? Math.round(done/total*100) : 0
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[14px] font-semibold" style={{color:"var(--ink)"}}>KGMP 핵심 의무사항 체크리스트</h2>
        <span className="text-[12px]" style={{color:"var(--ink-mute)"}}>{done}/{total} ({pct}%)</span>
      </div>
      <div className="w-full rounded-full h-2 mb-4" style={{background:"var(--border)"}}>
        <div className="h-2 rounded-full transition-all" style={{width:pct+"%",background:"var(--brand)"}} />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {KGMP_CATS.map((cat,ci) => {
          const catDone = cat.items.filter((_,ii)=>chk[ci+"-"+ii]).length
          return (
            <div key={ci} className="rounded-xl p-4" style={{background:"var(--bg-card)",border:"1px solid var(--border)"}}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12.5px] font-semibold" style={{color:"var(--ink)"}}>{cat.title}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full" style={{background:catDone===cat.items.length?"#d1fae5":"var(--bg-soft)",color:catDone===cat.items.length?"#065f46":"var(--ink-mute)"}}>{catDone}/{cat.items.length}</span>
              </div>
              <ul className="space-y-1.5">
                {cat.items.map((item,ii) => {
                  const key=ci+"-"+ii
                  return (
                    <li key={ii} className="flex items-start gap-2 cursor-pointer" onClick={()=>toggle(key)}>
                      <span className="mt-0.5 shrink-0 w-4 h-4 rounded border flex items-center justify-center text-[10px] font-bold"
                        style={{background:chk[key]?"var(--brand)":"transparent",borderColor:chk[key]?"var(--brand)":"var(--border)",color:"#fff"}}>
                        {chk[key] ? "v" : ""}
                      </span>
                      <span className="text-[12px] leading-snug" style={{color:chk[key]?"var(--ink-mute)":"var(--ink)",textDecoration:chk[key]?"line-through":"none"}}>{item}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function KgmpHub() {
  const user = auth.current()
  const nav = useNavigate()
  const downloadPdf = () => downloadHtmlAsPdf(buildApprovedDocumentBundleHtml('manufacturer', 'KGMP'))

  // buildKgmpSections()는 호출 시 누락된 필수 절차서(공급업체관리·회수·변경관리)를 자동 보완한다.
  // 이 화면은 국내제조사(자기 제조소가 GMP 심사 대상) 전용이다 — 수입사는 별도의
  // "외국제조소 · 수입 GMP" 화면에서 확인한다(제품을 만드는 외국제조소가 심사 대상이므로 체크리스트
  // 구성 자체가 다르다).
  const sections = useMemo(() => buildKgmpSections({}), [])
  const { doneCount, totalCount, pct } = summarizeKgmpSections(sections)

  return (
    <AppLayout user={user} title="KGMP" subtitle="국내 제조업체 GMP 인증(인허가) 신청 및 유지관리 통합 현황">
      <CertGate certId="kgmp" label="KGMP">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto fade-in">
        <div className="mb-5">
          <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--moss)' }}>
            KGMP · MANUFACTURER REGISTRATION & MAINTENANCE
          </span>
          <div className="font-display text-[26px] mt-1" style={{ color: 'var(--ink)', fontWeight: 500 }}>
            KGMP 통합 현황
          </div>
          <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>
            국내제조사 기준 GMP 인증(인허가) 신청·유지관리 체크리스트입니다 — 자기 제조소 전체가 심사 대상입니다.
          </div>
        </div>

        <button
          onClick={() => nav('/foreign-manufacturers')}
          className="card-base p-3.5 mb-5 w-full flex items-center gap-3 text-left hover:opacity-90 transition"
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--leaf-soft)', color: 'var(--moss)' }}>
            <Factory size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>수입사이신가요?</div>
            <div className="text-[11.5px]" style={{ color: 'var(--ink-mute)' }}>수입업자는 자기 사업장이 아니라 제품을 만드는 외국제조소가 GMP 심사 대상입니다 — 전용 화면 "외국제조소 · 수입 GMP"에서 확인하세요.</div>
          </div>
          <ArrowRight size={16} style={{ color: 'var(--ink-faint)' }} className="shrink-0" />
        </button>

        <button
          onClick={() => nav('/gmp-application')}
          className="card-base p-3.5 mb-5 w-full flex items-center gap-3 text-left hover:opacity-90 transition"
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--leaf-soft)', color: 'var(--moss)' }}>
            <FileCheck2 size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>GMP 신청서 작성 준비</div>
            <div className="text-[11.5px]" style={{ color: 'var(--ink-mute)' }}>GMP 접수양식·기술문서등심사의뢰서에 필요한 신청정보·제품 기술문서·공급업체·설비·기술문서 현황을 한 화면에서 확인하세요.</div>
          </div>
          <ArrowRight size={16} style={{ color: 'var(--ink-faint)' }} className="shrink-0" />
        </button>

        <div className="card-base p-4 mb-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--leaf-soft)', color: 'var(--moss)' }}>
            <span className="text-[15px] font-bold tabular-nums">{pct}%</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] font-medium" style={{ color: 'var(--ink)' }}>전체 {totalCount}개 항목 중 {doneCount}개 완료</div>
            <div className="mt-1.5 h-1.5 rounded-full w-full" style={{ background: 'var(--bg-soft)' }}>
              <div className="h-1.5 rounded-full" style={{ width: pct + '%', background: 'var(--moss)' }} />
            </div>
          </div>
          <button onClick={downloadPdf} className="btn-primary text-[12.5px] shrink-0"><FileDown size={14} /> 승인 문서 통합 PDF</button>
        </div>

        <KgmpSectionList sections={sections} />
        <KgmpChecklist />
      </div>
      </CertGate>
    </AppLayout>
  )
}
