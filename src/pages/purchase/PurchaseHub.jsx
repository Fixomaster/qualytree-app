import React from 'react'
import {
  Package, Users, ShoppingBag, FileText,
  ClipboardList, BarChart2, CheckSquare, Box, Layers,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'

const SUB_MENUS = [
  { id: 'avl', icon: Users, label: '공급자 관리 (AVL)', desc: '승인 공급자 목록 · 등급 관리', iso: '§7.4.1', status: 'coming' },
  { id: 'po', icon: ShoppingBag, label: '발주 관리', desc: '발주 목록 · 납기 추적', iso: '§7.4.2', status: 'coming' },
  { id: 'po-create', icon: FileText, label: '발주서 작성', desc: '발주서 생성 · 공급자 자동 연동', iso: '§7.4.2', status: 'coming' },
  { id: 'incoming', icon: ClipboardList, label: '입고 예정 현황', desc: '입고 예정일 · 수입검사 대기 현황', iso: '§7.4.3', status: 'coming' },
  { id: 'stock', icon: Package, label: '재고 현황 (원자재)', desc: '원자재·포장재 재고 · 안전재고 알람', iso: '§7.4', status: 'coming' },
  { id: 'supplier-eval', icon: BarChart2, label: '공급자 평가', desc: '연간 공급자 평가 · 등급 산정', iso: '§7.4.1', status: 'coming' },
  { id: 'iqc', icon: CheckSquare, label: '수입검사 연동', desc: '생산 수입검사 결과 연동', iso: '§7.4.3', status: 'coming' },
  { id: 'finished', icon: Box, label: '완제품 재고 (규격별)', desc: '완제품 재고 · 안전재고 알람', iso: '§7.5.3, §7.5.5', status: 'coming' },
  { id: 'lot-udi', icon: Layers, label: 'Lot·UDI 상세', desc: 'Lot 이력 · UDI 조회 · 추적성', iso: '§7.5.3', status: 'coming' },
]

const SUMMARY = [
  { label: '재고 부족 자재', value: '2품목', warn: true },
  { label: '발주 대기', value: '1건', warn: true },
  { label: '입고 예정 (7일)', value: '3건' },
  { label: '공급자 C등급', value: '1개', warn: true },
]

export default function PurchaseHub() {
  const user = auth.current()

  return (
    <AppLayout user={user} title="구매자재" subtitle="공급자 관리 · 발주 · 재고 · 수입검사">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto fade-in">
        <div className="mb-5">
          <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--moss)' }}>
            PUR · PURCHASE & MATERIALS  ·  ISO 13485 §7.4
          </span>
          <div className="font-display text-[26px] mt-1" style={{ color: 'var(--ink)', fontWeight: 500 }}>구매자재</div>
          <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>구매 프로세스 · 공급자 관리 · 재고 추적</div>
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
