import React, { useMemo } from 'react'
import { FileDown, FileCheck } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import CertGate from '../../components/CertGate'
import { auth } from '../../lib/auth'
import { buildKgmpSections, summarizeKgmpSections } from '../../lib/kgmpProgress'
import { buildApprovedDocumentBundleHtml, downloadHtmlAsPdf } from '../../lib/kgmpDocumentBundle'
import KgmpSectionList from '../../components/KgmpSectionList'

export default function Iso13485Hub() {
  const user = auth.current()
  const downloadPdf = () => downloadHtmlAsPdf(buildApprovedDocumentBundleHtml('iso13485', 'ISO 13485'))

  // profile:'iso13485' — 국내 제조업허가증 같은 KR 인허가 전용 서류는 제외하고
  // (buildKgmpSections 참조) 기술문서·품질시스템·절차서·기록 체크리스트를 국제
  // ISO 13485:2016 인증기관 심사 관점으로 그대로 재사용한다.
  const sections = useMemo(() => buildKgmpSections({ profile: 'iso13485' }), [])
  const { doneCount, totalCount, pct } = summarizeKgmpSections(sections)

  return (
    <AppLayout user={user} title="ISO 13485" subtitle="국제 품질경영시스템(QMS) 인증 신청 및 유지관리 통합 현황">
      <HubBanner icon={FileCheck} title="ISO 13485" subtitle="ISO 13485 요건 현황" color="green" />
      <CertGate certId="iso13485" label="ISO 13485">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto fade-in">
        <div className="mb-5">
          <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--moss)' }}>
            ISO 13485 · QUALITY MANAGEMENT SYSTEM
          </span>
          <div className="font-display text-[26px] mt-1" style={{ color: 'var(--ink)', fontWeight: 500 }}>
            ISO 13485 통합 현황
          </div>
          <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>
            ISO 13485:2016 국제 품질경영시스템 인증기관 심사 및 유지관리 체크리스트입니다.
          </div>
        </div>

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

        <KgmpSectionList sections={sections} keyPrefix="iso13485-" />
      </div>
      </CertGate>
    </AppLayout>
  )
}
