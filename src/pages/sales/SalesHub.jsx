import React, { useState } from 'react'
import {
  TrendingUp, Users, ShoppingCart, ClipboardList,
  FileText, MessageSquare, Truck, BarChart2,
  Plus, ChevronRight, Clock,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'

const SUB_MENUS = [
  { id: 'customers', icon: Users, label: '고객사 관리', desc: '고객사 등록 및 계약 이력 관리', iso: '§7.2.1', status: 'coming' },
  { id: 'market', icon: TrendingUp, label: '시장조사·고객요구', desc: '시장조사 결과 및 고객 요구사항 등록', iso: '§7.2.1', status: 'coming' },
  { id: 'orders', icon: ClipboardList, label: '수주 관리', desc: '수주 목록 · D-day · 생산 연동', iso: '§7.2.2', status: 'coming' },
  { id: 'order-detail', icon: FileText, label: '수주 상세 (전표)', desc: '수주 전표 상세 · 얈목별 납기 추적', iso: '§7.2.2', status: 'coming' },
  { id: 'quotes', icon: FileText, label: '견적 관리', desc: '견적서 발행 및 이력 관리', iso: '§7.2.2', status: 'coming' },
  { id: 'complaints', icon: MessageSquare, label: '고객 불만 관리', desc: '고객 불만 접수 · CAPA 연동', iso: '§8.2.1', status: 'coming' },
  { id: 'delivery', icon: Truck, label: '납품 이력', desc: '납품 완료 이력 · UDI·Lot 추적', iso: '§7.2.3', status: 'coming' },
  { id: 'performance', icon: BarChart2, label: '영업 실적', desc: '월/분기별 영업 실적 통계', iso: '§8.2', status: 'coming' },
  { id: 'prod-req', icon: ShoppingCart, label: '생산 요청', desc: '영업 기반 생산 요청 발행', iso: '—', status: 'coming' },
]

const SUMMARY = [
  { label: '이달 수주', value: '12건', sub: '전월 대비 +2건' },
  { label: '납기 임박', value: '3건', sub: 'D-7 이내', warn: true },
  { label: '미결 고객 불만', value: '3건', sub: 'CAPA 진행중', warn: true },
  { label: '이달 납품', value: '8건', sub: '납기준수율 91.7%' },
]

export default function SalesHub() {
  const user = auth.current()

  return (
    <AppLayout user={user} title="영업" subtitle="고객관리 · 수주 · 납품 · 고객불만">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto fade-in">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--moss)' }}>
              SAL · SALES  ·  ISO 13485 §7.2 · §8.2.1
            </span>
            <div className="font-display text-[26px] mt-1" style={{ color: 'var(--ink)', fontWeight: 500 }}>
              영업
            </div>
            <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>
              고객 관련 프로세스 · 수주에서 납품까지
            </div>
          </div>
        </div>

        {/* 요약 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {SUMMARY.map((s) => (
            <div key={s.label} className="card-base p-4">
              <div className="text-[12px] mb-1" style={{ color: 'var(--ink-mute)' }}>{s.label}</div>
              <div className="font-display text-[24px]"
                style={{ color: s.warn ? 'var(--rust)' : 'var(--moss)', fontWeight: 600 }}>{s.value}</div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* 서브 메뉴 그리드 */}
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

        <div className="mt-6 p-4 rounded-xl" style={{ background: 'var(--leaf-soft)', border: '1px solid var(--moss)' }}>
          <div className="text-[13px] font-medium mb-1" style={{ color: 'var(--moss)' }}>영업 모듈 개발 예정</div>
          <div className="text-[12.5px]" style={{ color: 'var(--ink-mute)' }}>
            ISO 13485 §7.2 고객 관련 프로세스 전체를 커버합니다.
            수주 관리, 납기 추적, 고객 불만 처리(§8.2.1)까지 연동됩니다.
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
