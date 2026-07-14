import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileCheck2,
  FolderOpen,
  ShieldCheck,
  BookOpen,
  Archive,
  Factory,
  CheckCircle2,
  Circle,
  MinusCircle,
  ChevronDown,
  ChevronRight,
  Edit3,
} from 'lucide-react'

const SECTION_ICON = {
  common: FileCheck2,
  tech: FolderOpen,
  qms: ShieldCheck,
  procedures: BookOpen,
  records: Archive,
  importer: Factory,
}

// KGMP 체크리스트 섹션·항목 렌더링 — KgmpHub(제조사)와 ForeignManufacturerHub(수입사)가 공유한다.
// sections: buildKgmpSections()의 반환값. keyPrefix: 같은 화면에 여러 목록을 함께 둘 때 open-key 충돌 방지용.
export default function KgmpSectionList({ sections, keyPrefix = '' }) {
  const nav = useNavigate()
  const [openKey, setOpenKey] = useState(null)
  return (
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
                const key = keyPrefix + sec.id + '-' + i
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
  )
}

export function StatusIcon({ status }) {
  if (status === 'done') return <CheckCircle2 size={16} style={{ color: 'var(--moss)' }} className="shrink-0" />
  if (status === 'partial') return <MinusCircle size={16} style={{ color: 'var(--amber)' }} className="shrink-0" />
  return <Circle size={16} style={{ color: 'var(--ink-faint)' }} className="shrink-0" />
}
