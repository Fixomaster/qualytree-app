import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileCheck2,
  FolderOpen,
  ShieldCheck,
  BookOpen,
  Archive,
  CheckCircle2,
  Circle,
  MinusCircle,
  ChevronDown,
  ChevronRight,
  Edit3,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import { buildKgmpSections, summarizeKgmpSections } from '../../lib/kgmpProgress'

const SECTION_ICON = {
  common: FileCheck2,
  tech: FolderOpen,
  qms: ShieldCheck,
  procedures: BookOpen,
  records: Archive,
}

export default function KgmpHub() {
  const user = auth.current()
  const nav = useNavigate()
  const [tick, setTick] = useState(0)
  const [openKey, setOpenKey] = useState(null)

  // buildKgmpSections()는 호출 시 누락된 필수 절차서(공급업체관리·회수·변경관리)를 자동 보완한다.
  const sections = useMemo(() => buildKgmpSections(), [tick])
  const { doneCount, totalCount, pct } = summarizeKgmpSections(sections)

  return (
    <AppLayout user={user} title="KGMP" subtitle="수입 의료기기 인증(인허가) 신청 및 유지관리 통합 현황">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto fade-in">
        <div className="mb-5">
          <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--moss)' }}>
            KGMP · IMPORT REGISTRATION & MAINTENANCE
          </span>
          <div className="font-display text-[26px] mt-1" style={{ color: 'var(--ink)', fontWeight: 500 }}>
            KGMP 통합 현황
          </div>
          <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>
            수입 의료기기 인증(인허가) 시 필요한 공통 제출 문서·기술문서·품질시스템 자료와, 수입 후 유지관리에 필요한 절차서·기록을 한 곳에서 확인합니다.
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
        </div>

        <div className="space-y-6">
          {sections.map((sec) => {
            const secDone = sec.items.filter((it) => it.status === 'done').length
            const SecIcon = SECTION_ICON[sec.id] || FileCheck2
            return (
              <div key={sec.id}>
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--leaf-soft)', color: 'var(--moss)' }}>
                    <SecIcon size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[14.5px] font-semibold" style={{ color: 'var(--ink)' }}>{sec.title}</div>
                    <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{sec.subtitle}</div>
                  </div>
                  <span className="ml-auto font-mono text-[11px] px-2 py-0.5 rounded shrink-0" style={{ background: 'var(--bg-soft)', color: 'var(--ink-mute)' }}>
                    {secDone} / {sec.items.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {sec.items.map((it, i) => {
                    const key = sec.id + '-' + i
                    const open = openKey === key
                    return (
                      <div key={key} className="card-base overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setOpenKey(open ? null : key)}
                          className="w-full flex items-center gap-2.5 p-3 text-left"
                        >
                          <StatusIcon status={it.status} />
                          <span className="text-[12.5px] font-medium flex-1 min-w-0 truncate" style={{ color: 'var(--ink)' }}>{it.label}</span>
                          {open ? <ChevronDown size={14} style={{ color: 'var(--ink-faint)' }} /> : <ChevronRight size={14} style={{ color: 'var(--ink-faint)' }} />}
                        </button>
                        {open && (
                          <div className="px-3 pb-3 pt-0.5" style={{ borderTop: '1px solid var(--line)' }}>
                            <div className="text-[11.5px] mt-2" style={{ color: 'var(--ink-mute)' }}>{it.detail}</div>
                            <button
                              type="button"
                              onClick={() => nav(it.editHref)}
                              className="btn-ghost text-[11.5px] mt-2.5"
                            >
                              <Edit3 size={11} /> 수정하러 가기
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AppLayout>
  )
}

function StatusIcon({ status }) {
  if (status === 'done') return <CheckCircle2 size={16} style={{ color: 'var(--moss)' }} className="shrink-0" />
  if (status === 'partial') return <MinusCircle size={16} style={{ color: 'var(--amber)' }} className="shrink-0" />
  return <Circle size={16} style={{ color: 'var(--ink-faint)' }} className="shrink-0" />
}
