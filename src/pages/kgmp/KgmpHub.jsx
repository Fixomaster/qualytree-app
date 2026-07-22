import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Factory, ArrowRight, FileDown } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import { buildKgmpSections, summarizeKgmpSections } from '../../lib/kgmpProgress'
import { buildApprovedDocumentBundleHtml, downloadHtmlAsPdf } from '../../lib/kgmpDocumentBundle'
import KgmpSectionList from '../../components/KgmpSectionList'
import CertGate from '../../components/CertGate'

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
      </div>
      </CertGate>
    </AppLayout>
  )
}
