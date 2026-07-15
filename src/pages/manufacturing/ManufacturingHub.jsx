import React from 'react'
import {
  Cog, ClipboardList, FileText, CheckSquare,
  AlertTriangle, BarChart2, Wrench, Activity,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'

const SUB_MENUS = [
  { id: 'work-orders', icon: ClipboardList, label: '작업지시 관리', desc: '발행주체 구분 (영업요청/재고알람/자동) · WO 발행', iso: '§7.5.1', status: 'coming' },
  { id: 'process-record', icon: FileText, label: '공정 기록 입력', desc: '공정 순차 기록 · 파라미터·서명 관리', iso: '§7.5.3', status: 'coming' },
  { id: 'process-history', icon: Activity, label: '공정이력카드', desc: '자동 생성 공정이력카드 · Lot 단위', iso: '§7.5.3', status: 'coming' },
  { id: 'inspection', icon: CheckSquare, label: '검사 기록', desc: '수입·공정·제품검사 3탭 · 측정값 관리', iso: '§7.4.3, §7.5.1', status: 'coming' },
  { id: 'defect', icon: AlertTriangle, label: '불량·부적합 처리', desc: '불량 처리 · NCR 자동 발의 연동', iso: '§8.3', status: 'coming' },
  { id: 'output', icon: BarChart2, label: '생산 실적', desc: '완료 WO 수율·생산량 통계', iso: '§8.2', status: 'coming' },
  { id: 'equipment', icon: Wrench, label: '설비·측정장비 연동', desc: '설비 현황 · 측정장비 교정 상태 연동', iso: '§7.6', status: 'coming' },
  { id: 'flow', icon: Cog, label: '생산 흐름 요약', desc: '수주→WO→공정→검사→출고 흐름', iso: '—', status: 'coming' },
]

const SUMMARY = [
  { label: '진행중 WO', value: '3건' },
  { label: '이번달 생산', value: '1,248EA' },
  { label: '평균 수율', value: '98.6%' },
  { label: '미결 NCR', value: '1건', warn: true },
]

export default function ManufacturingHub() {
  const user = auth.current()

  return (
    <AppLayout user={user} title="생산" subtitle="작업지시 · 공정기록 · 검사 · 실적">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto fade-in">
        <div className="mb-5">
          <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--moss)' }}>
            MFG · MANUFACTURING  ·  ISO 13485 §7.5
          </span>
          <div className="font-display text-[26px] mt-1" style={{ color: 'var(--ink)', fontWeight: 500 }}>생산</div>
          <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>생산 및 서비스 제공 관리 · 추적성 · 검사 기록</div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {SUMMARY.map((s) => (
            <div key={s.label} className="card-base p-4">
              <div className="text-[12px] mb-1" style={{ color: 'var(--ink-mute)' }}>{s.label}</div>
              <div className="font-display text-[24px]"
                style={{ color: s.warn ? 'var(--rust)' : 'var(--moss)', fontWeight: 600 }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SUB_MENUS.map((menu) => (
            <div key={menu.id} className="card-base p-4 opacity-80 cursor-default">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--leaf-soft)' }}>
                  <menu.icon size={18} style={{ color: 'var(--moss)' }} strokeWidth={1.7} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[9px] tracking-wider px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>{menu.iso}</span>
                  <span className="font-mono text-[9px] tracking-wider px-1.5 py-0.5 rounded"
                    style={{ background: '#fef3c7', color: '#92400e' }}>SOON</span>
                </div>
              </div>
              <div className="text-[13.5px] font-medium" style={{ color: 'var(--ink)' }}>{menu.label}</div>
              <div className="text-[12px] mt-1" style={{ color: 'var(--ink-mute)' }}>{menu.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
