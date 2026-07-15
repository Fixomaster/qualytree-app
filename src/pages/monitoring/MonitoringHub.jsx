import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart2, TrendingUp, TrendingDown, Minus,
  Package, AlertTriangle, ShieldCheck, Wrench,
  ChevronRight, Clock, ArrowLeft, Activity,
  CheckCircle, XCircle, AlertCircle, Users,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'

/* ─────────────────────────────────────────────
   샘플 데이터 (pptx 기준)
───────────────────────────────────────────── */
const KPI_DATA = {
  indicators: [
    { id: 'defect', label: '제품 불량률', value: '1.4%', target: '≤2.0%', ok: true, trend: 'down', unit: '%' },
    { id: 'delivery', label: '납기 준수율', value: '91.7%', target: '≥95%', ok: false, trend: 'down', unit: '%' },
    { id: 'complaint', label: '고객 불만', value: '3건', target: '≤2건', ok: false, trend: 'up', unit: '건' },
    { id: 'capa', label: 'CAPA 완료율', value: '80%', target: '≥90%', ok: false, trend: 'up', unit: '%' },
    { id: 'incoming', label: '수입검사 합격률', value: '97.8%', target: '≥95%', ok: true, trend: 'stable', unit: '%' },
    { id: 'audit', label: '내부감사 지적', value: '6건', target: '전년 대비 감소', ok: true, trend: 'down', unit: '건' },
  ],
  monthly: [
    { month: '1월', defect: 1.8, delivery: 96, complaint: 1, incoming: 98 },
    { month: '2월', defect: 1.6, delivery: 95, complaint: 0, incoming: 99 },
    { month: '3월', defect: 1.5, delivery: 93, complaint: 2, incoming: 98 },
    { month: '4월', defect: 1.2, delivery: 92, complaint: 1, incoming: 97 },
    { month: '5월', defect: 1.5, delivery: 90, complaint: 1, incoming: 98 },
    { month: '6월', defect: 1.4, delivery: 92, complaint: 3, incoming: 98 },
  ],
}

const PRODUCTION_DATA = {
  summary: { activeWO: 3, monthlyOutput: 1248, avgYield: 98.6, openNCR: 1 },
  activeOrders: [
    { wo: 'WO-2406-018', source: '영업요청', product: 'SCS M3.5×22mm', lot: 'LOT-2406-047', qty: 200, stage: '③ 아노다이징', progress: 60, status: '진행중' },
    { wo: 'WO-2406-017', source: '영업요청', product: 'SCS M4.0×24mm', lot: 'LOT-2406-046', qty: 300, stage: '① CNC 가공', progress: 20, status: '진행중' },
    { wo: 'WO-2406-016', source: '재고알람', product: 'BPL 3홀', lot: 'LOT-2406-045', qty: 50, stage: '대기', progress: 0, status: '대기' },
  ],
  monthlyResults: [
    { wo: 'WO-2406-014', product: 'SCS M3.5×22mm', planned: 150, produced: 148, defect: 2, yield: '98.7%', onTime: true, ncr: 1, note: '재작업 2EA' },
    { wo: 'WO-2406-013', product: 'SCS M4.0×22mm', planned: 200, produced: 200, defect: 0, yield: '100%', onTime: true, ncr: 0, note: '' },
    { wo: 'WO-2406-012', product: 'BPL 4홀', planned: 80, produced: 76, defect: 4, yield: '95%', onTime: false, ncr: 1, note: '납기 지연 2일' },
  ],
}

const INVENTORY_DATA = {
  alerts: ['Ti-6Al-4V ELI 바 (8EA — 안전재고 10EA 미달)', 'SCS M3.5×22mm 완제품 (45EA — 안전재고 50EA 미달)'],
  materials: [
    { code: 'RM-001', name: 'Ti-6Al-4V ELI 바 3파이', type: '원자재', stock: 8, safety: 10, level: 53, lastIn: '24-06-17', action: '발주필요' },
    { code: 'PKG-001', name: 'PP 멸균 봉투 소형', type: '포장재', stock: 380, safety: 500, level: 48, lastIn: '24-06-15', action: '발주점' },
    { code: 'PKG-010', name: '외부 박스 (10개입)', type: '포장재', stock: 145, safety: 50, level: 100, lastIn: '24-06-08', action: '' },
  ],
  finished: [
    { code: 'PA-SCS-3522', name: 'SCS M3.5×22mm', stock: 45, safety: 50, level: 56, lastIn: '24-06-17', action: '부족' },
    { code: 'PA-SCS-3524', name: 'SCS M3.5×24mm', stock: 132, safety: 50, level: 100, lastIn: '24-06-17', action: '' },
    { code: 'PA-BPL-3H', name: 'BPL 골절합용판 3홀', stock: 28, safety: 10, level: 100, lastIn: '24-05-30', action: '' },
  ],
}

const SALES_DATA = {
  summary: { orders: 12, urgent: 3, delivered: 8, complaints: 3 },
  orders: [
    { so: 'SO-2406-012', customer: '㈜부산의료원', items: 'SCS M3.5×22mm 외 2종', dueDate: '24-06-25', dday: 'D-3', wo: 'WO-2406-018', status: '납기임박' },
    { so: 'SO-2406-011', customer: '서울대병원', items: 'BPL 3홀', dueDate: '24-06-28', dday: 'D-6', wo: 'WO 대기', status: '출고요청' },
    { so: 'SO-2406-010', customer: '㈜메디라인', items: 'SCS M4.0×24mm', dueDate: '24-07-05', dday: 'D-13', wo: 'WO-2406-017', status: '확인완료' },
    { so: 'SO-2406-008', customer: '㈜오쏘코리아', items: 'BPL 4홀', dueDate: '24-06-20', dday: '완료', wo: '완료', status: '출고완료' },
  ],
  complaints: [
    { id: 'CMP-2406-003', date: '24-06-18', customer: '서울대병원', content: '멸균 봉투 파손', severity: '중간', deadline: '24-06-25', capa: 'CA-2406-006', status: '처리중' },
  ],
}

const QUALITY_DATA = {
  summary: { openNCR: 2, activeCapa: 2, auditOpen: 1, closedThisMonth: 3 },
  ncrs: [
    { id: 'NCR-2406-005', date: '24-06-21', source: '생산불량', content: '헤드 직경 치수 불량 2EA', severity: '중간', capa: 'CA-2406-007', deadline: '24-07-05', status: 'CAPA 진행중' },
    { id: 'NCR-2406-004', date: '24-06-18', source: '고객불만', content: '멸균 봉투 파손 — 부산의료원', severity: '높음', capa: 'CA-2406-006', deadline: '24-06-28', status: 'CAPA 진행중' },
  ],
  audit: { id: 'AU-2406-003', content: '생산 공정 기록 누락 1건', ncr: 'NCR-2406-001', deadline: '24-07-15' },
  monthly: { ncrRaised: 5, ncrClosed: 3, capaRate: '60%', capaTarget: '90%' },
}

const EQUIPMENT_DATA = {
  alerts: ['교정 만료 임박: 마이크로미터 #003 (D-5)', '교정 만료 사용제한: 표면조도계 #001', '인허가 변경 진행: 1건'],
  instruments: [
    { name: '마이크로미터', num: '#001~#002', expire: '24-12-10', dday: 'D-172', status: '사용가능' },
    { name: '마이크로미터', num: '#003', expire: '24-06-26', dday: 'D-5', status: '교정임박' },
    { name: '표면조도계', num: '#001', expire: '(만료)', dday: 'D+103', status: '사용제한' },
    { name: '버니어캘리퍼스·경도계', num: '각 #001', expire: '25-01~02', dday: 'D-200↑', status: '사용가능' },
  ],
  licenses: [
    { id: '제허 2024-00123', product: '골절합용나사', date: '24-01-15', change: '변경 진행중 (M4.5×28 추가)', docs: '완비', status: '유효·변경중' },
    { id: '제허 2024-00456', product: '골절합용판', date: '24-03-10', change: '없음', docs: '완비', status: '유효' },
    { id: '—', product: '신규 와이어 제품', date: '—', change: '—', docs: '작성중', status: '개발중 (35%)' },
  ],
}

/* ─────────────────────────────────────────────
   유틸 컴포넌트
───────────────────────────────────────────── */
function Badge({ text, tone }) {
  const colors = {
    red: { bg: 'var(--rust-soft)', fg: 'var(--rust)' },
    green: { bg: 'var(--leaf-soft)', fg: 'var(--moss)' },
    amber: { bg: '#fff7ed', fg: '#b45309' },
    gray: { bg: 'var(--bg-soft)', fg: 'var(--ink-mute)' },
    blue: { bg: '#eff6ff', fg: '#1d4ed8' },
  }
  const c = colors[tone] || colors.gray
  return (
    <span className="font-mono text-[10px] tracking-wider px-1.5 py-0.5 rounded"
      style={{ background: c.bg, color: c.fg, fontWeight: 500 }}>
      {text}
    </span>
  )
}

function StatCard({ icon: Icon, label, value, sub, tone, onClick }) {
  const toneMap = {
    green: 'var(--moss)', red: 'var(--rust)', amber: '#b45309', blue: '#1d4ed8', gray: 'var(--ink-mute)',
  }
  const fg = toneMap[tone] || toneMap.gray
  return (
    <button onClick={onClick}
      className="card-base p-4 text-left hover:shadow-md transition w-full">
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${fg}15` }}>
          <Icon size={17} style={{ color: fg }} strokeWidth={1.7} />
        </div>
        <span className="font-display text-[28px]" style={{ color: fg, fontWeight: 500 }}>{value}</span>
      </div>
      <div className="text-[12.5px]" style={{ color: 'var(--ink-mute)' }}>{label}</div>
      {sub && <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{sub}</div>}
    </button>
  )
}

function SectionTitle({ children, breadcrumb }) {
  return (
    <div className="mb-5">
      {breadcrumb && (
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-1" style={{ color: 'var(--ink-faint)' }}>
          모니터링 / {breadcrumb}
        </div>
      )}
      <h2 className="font-display text-[22px]" style={{ color: 'var(--ink)', fontWeight: 500 }}>{children}</h2>
    </div>
  )
}

function ProgressBar({ value, max = 100, tone = 'green' }) {
  const pct = Math.min((value / max) * 100, 100)
  const colors = { green: 'var(--moss)', red: 'var(--rust)', amber: '#b45309' }
  const color = pct < 50 ? colors.red : pct < 80 ? colors.amber : colors.green
  return (
    <div className="h-1.5 w-full rounded-full" style={{ background: 'var(--bg-soft)' }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

/* ─────────────────────────────────────────────
   서브 뷰들
───────────────────────────────────────────── */
function MonHome({ onNavigate }) {
  const cards = [
    { id: 'kpi', icon: BarChart2, label: '전체 KPI 현황', desc: '6개 핵심 품질 지표 · 목표 대비 달성률', role: '경영진·품질', tone: 'blue' },
    { id: 'production', icon: Activity, label: '생산 현황', desc: '작업지시·수율·불량률 · 공정별 실시간', role: '생산·경영진', tone: 'green' },
    { id: 'inventory', icon: Package, label: '재고 현황', desc: '원자재·완제품 재고 · UDI·Lot 통합', role: '구매자재·생산·영업', tone: 'amber' },
    { id: 'sales', icon: TrendingUp, label: '영업·납품 현황', desc: '수주·납기·고객불만 · 납기 준수율', role: '영업·경영진', tone: 'green' },
    { id: 'quality', icon: AlertTriangle, label: '품질 이슈 현황', desc: 'NCR·CAPA·감사 · 미결 이슈 통합', role: '품질·경영진', tone: 'red' },
    { id: 'equipment', icon: Wrench, label: '설비·인허가 현황', desc: '교정 만료·허가 현황 · 설계 진행 단계', role: '품질·개발', tone: 'amber' },
  ]

  const alerts = [
    { text: '납기 임박 D-3 (SO-2406-012)', tone: 'red' },
    { text: '교정 만료 사용제한 (표면조도계 #001)', tone: 'amber' },
    { text: '원자재 재고 부족 (RM-001 8EA)', tone: 'amber' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--moss)' }}>
            MON · MONITORING
          </span>
          <div className="font-display text-[26px] mt-1" style={{ color: 'var(--ink)', fontWeight: 500 }}>
            모니터링
          </div>
          <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>
            전부서 통합 현황 · 읽기 전용 · 역할별 권한 제어
          </div>
        </div>
      </div>

      {/* 즉시 조치 알람 */}
      <div className="mb-5 rounded-lg p-3 flex items-start gap-3" style={{ background: '#fff7ed', border: '1px solid #fb923c' }}>
        <AlertCircle size={16} style={{ color: '#ea580c', marginTop: 1, flexShrink: 0 }} />
        <div className="text-[12.5px]" style={{ color: '#c2410c' }}>
          <span className="font-semibold">즉시 조치 필요: </span>
          {alerts.map((a, i) => (
            <span key={i}>{a.text}{i < alerts.length - 1 ? ' · ' : ''}</span>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map((card) => (
          <button key={card.id} onClick={() => onNavigate(card.id)}
            className="card-base p-4 text-left hover:shadow-md transition group">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--leaf-soft)' }}>
                <card.icon size={18} style={{ color: 'var(--moss)' }} strokeWidth={1.7} />
              </div>
              <ChevronRight size={15} style={{ color: 'var(--ink-faint)' }}
                className="mt-1 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="text-[14px] font-medium" style={{ color: 'var(--ink)' }}>{card.label}</div>
            <div className="text-[12px] mt-1" style={{ color: 'var(--ink-mute)' }}>{card.desc}</div>
            <div className="mt-2">
              <span className="font-mono text-[9.5px] tracking-wider px-1.5 py-0.5 rounded"
                style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>
                👁 {card.role}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function KpiView() {
  const { indicators, monthly } = KPI_DATA
  return (
    <div>
      <SectionTitle breadcrumb="전체 KPI 현황">전체 KPI 현황</SectionTitle>
      <div className="text-[11.5px] mb-4" style={{ color: 'var(--ink-faint)' }}>6개 핵심 품질 지표 · 2024 Q2 기준</div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        {indicators.map((ind) => (
          <div key={ind.id} className="card-base p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[12.5px]" style={{ color: 'var(--ink-mute)' }}>{ind.label}</div>
              {ind.ok
                ? <CheckCircle size={14} style={{ color: 'var(--moss)' }} />
                : <XCircle size={14} style={{ color: 'var(--rust)' }} />}
            </div>
            <div className="font-display text-[28px]" style={{ color: ind.ok ? 'var(--moss)' : 'var(--rust)', fontWeight: 600 }}>
              {ind.value}
            </div>
            <div className="text-[11px] mt-1 flex items-center gap-1.5" style={{ color: 'var(--ink-faint)' }}>
              <span>목표 {ind.target}</span>
              {ind.trend === 'down' && <TrendingDown size={11} style={{ color: 'var(--moss)' }} />}
              {ind.trend === 'up' && <TrendingUp size={11} style={{ color: 'var(--rust)' }} />}
              {ind.trend === 'stable' && <Minus size={11} style={{ color: 'var(--ink-faint)' }} />}
              <span style={{ color: ind.ok ? 'var(--moss)' : 'var(--rust)', fontWeight: 500 }}>
                {ind.ok ? '달성' : '미달'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="card-base p-4">
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-3" style={{ color: 'var(--ink-faint)' }}>
          월별 핵심 지표 트렌드 (2024)  ·  ▲ 악화  ▼ 개선  → 유지
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['지표', '1월', '2월', '3월', '4월', '5월', '6월', '추세', '목표', '판정'].map((h) => (
                  <th key={h} className="pb-2 text-left font-medium px-2 first:pl-0" style={{ color: 'var(--ink-faint)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['불량률(%)', ...monthly.map((m) => m.defect), '▼ 개선중', '≤2.0%', true],
                ['납기준수율(%)', ...monthly.map((m) => m.delivery), '▲ 주의', '≥95%', false],
                ['고객불만(건)', ...monthly.map((m) => m.complaint), '▲ 악화', '≤2건', false],
                ['수입검사합격률(%)', ...monthly.map((m) => m.incoming), '→ 안정', '≥95%', true],
              ].map(([label, ...rest]) => {
                const ok = rest[rest.length - 1]
                const values = rest.slice(0, 6)
                const trend = rest[6]; const target = rest[7]
                return (
                  <tr key={label} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td className="py-2 font-medium" style={{ color: 'var(--ink)' }}>{label}</td>
                    {values.map((v, i) => (
                      <td key={i} className="py-2 px-2 tabular-nums" style={{ color: 'var(--ink-mute)' }}>{v}</td>
                    ))}
                    <td className="py-2 px-2" style={{ color: trend.startsWith('▲') ? 'var(--rust)' : trend.startsWith('▼') ? 'var(--moss)' : 'var(--ink-faint)' }}>{trend}</td>
                    <td className="py-2 px-2" style={{ color: 'var(--ink-faint)' }}>{target}</td>
                    <td className="py-2 px-2">
                      <span style={{ color: ok ? 'var(--moss)' : 'var(--rust)', fontWeight: 500 }}>
                        {ok ? '✓ 달성' : '개선필요'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ProductionView() {
  const { summary, activeOrders, monthlyResults } = PRODUCTION_DATA
  return (
    <div>
      <SectionTitle breadcrumb="생산 현황">생산 현황</SectionTitle>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: '진행중 WO', value: summary.activeWO + '건', tone: 'green' },
          { label: '이번달 생산', value: summary.monthlyOutput.toLocaleString() + 'EA', tone: 'green' },
          { label: '평균 수율', value: summary.avgYield + '%', tone: 'green' },
          { label: '미결 NCR', value: summary.openNCR + '건', tone: 'red' },
        ].map((s) => (
          <div key={s.label} className="card-base p-4">
            <div className="text-[12px] mb-1" style={{ color: 'var(--ink-mute)' }}>{s.label}</div>
            <div className="font-display text-[24px]"
              style={{ color: s.tone === 'red' ? 'var(--rust)' : 'var(--moss)', fontWeight: 600 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card-base p-4 mb-4">
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-3" style={{ color: 'var(--ink-faint)' }}>진행중 작업지시</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['WO 번호', '발행주체', '제품명', 'Lot 번호', '계획수량', '현재 공정', '진행률', '상태'].map((h) => (
                  <th key={h} className="pb-2 text-left font-medium px-2 first:pl-0" style={{ color: 'var(--ink-faint)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeOrders.map((wo) => (
                <tr key={wo.wo} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td className="py-2 font-mono text-[11.5px]" style={{ color: 'var(--moss)' }}>{wo.wo}</td>
                  <td className="py-2 px-2" style={{ color: 'var(--ink-mute)' }}>{wo.source}</td>
                  <td className="py-2 px-2" style={{ color: 'var(--ink)' }}>{wo.product}</td>
                  <td className="py-2 px-2 font-mono text-[11px]" style={{ color: 'var(--ink-faint)' }}>{wo.lot}</td>
                  <td className="py-2 px-2 text-right" style={{ color: 'var(--ink)' }}>{wo.qty}EA</td>
                  <td className="py-2 px-2" style={{ color: 'var(--ink-mute)' }}>{wo.stage}</td>
                  <td className="py-2 px-2" style={{ minWidth: 80 }}>
                    <div className="flex items-center gap-2">
                      <ProgressBar value={wo.progress} />
                      <span className="text-[11px] tabular-nums" style={{ color: 'var(--ink-faint)' }}>{wo.progress}%</span>
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <Badge text={wo.status} tone={wo.status === '대기' ? 'gray' : 'green'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card-base p-4">
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-3" style={{ color: 'var(--ink-faint)' }}>이번달 WO 수율 현황</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['WO 번호', '제품명', '계획', '생산', '불량', '수율', '납기준수', 'NCR', '비고'].map((h) => (
                  <th key={h} className="pb-2 text-left font-medium px-2 first:pl-0" style={{ color: 'var(--ink-faint)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthlyResults.map((r) => (
                <tr key={r.wo} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td className="py-2 font-mono text-[11.5px]" style={{ color: 'var(--moss)' }}>{r.wo}</td>
                  <td className="py-2 px-2" style={{ color: 'var(--ink)' }}>{r.product}</td>
                  <td className="py-2 px-2 text-right tabular-nums" style={{ color: 'var(--ink-mute)' }}>{r.planned}</td>
                  <td className="py-2 px-2 text-right tabular-nums" style={{ color: 'var(--ink)' }}>{r.produced}</td>
                  <td className="py-2 px-2 text-right tabular-nums" style={{ color: r.defect > 0 ? 'var(--rust)' : 'var(--ink-mute)' }}>{r.defect || '—'}</td>
                  <td className="py-2 px-2 tabular-nums font-medium" style={{ color: parseFloat(r.yield) < 97 ? 'var(--rust)' : 'var(--moss)' }}>{r.yield}</td>
                  <td className="py-2 px-2">{r.onTime ? <span style={{ color: 'var(--moss)' }}>✓</span> : <span style={{ color: 'var(--rust)' }}>✗</span>}</td>
                  <td className="py-2 px-2" style={{ color: r.ncr > 0 ? 'var(--rust)' : 'var(--ink-faint)' }}>{r.ncr > 0 ? r.ncr + '건' : '—'}</td>
                  <td className="py-2 px-2 text-[11px]" style={{ color: 'var(--ink-faint)' }}>{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function InventoryView() {
  const { alerts, materials, finished } = INVENTORY_DATA
  return (
    <div>
      <SectionTitle breadcrumb="재고 현황">재고 현황</SectionTitle>

      {alerts.length > 0 && (
        <div className="mb-4 rounded-lg p-3" style={{ background: 'var(--rust-soft)', border: '1px solid var(--rust)' }}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} style={{ color: 'var(--rust)' }} />
            <span className="font-mono text-[10px] tracking-[0.14em] uppercase font-semibold" style={{ color: 'var(--rust)' }}>발주 필요</span>
          </div>
          {alerts.map((a, i) => (
            <div key={i} className="text-[12.5px]" style={{ color: 'var(--rust)' }}>• {a}</div>
          ))}
        </div>
      )}

      <div className="card-base p-4 mb-4">
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-3" style={{ color: 'var(--ink-faint)' }}>원자재·포장재 ★</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['자재 코드', '자재명', '구분', '현재고', '안전재고', '재고수준', '최근 입고', '조치'].map((h) => (
                  <th key={h} className="pb-2 text-left font-medium px-2 first:pl-0" style={{ color: 'var(--ink-faint)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {materials.map((m) => (
                <tr key={m.code} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td className="py-2 font-mono text-[11px]" style={{ color: 'var(--moss)' }}>{m.code}</td>
                  <td className="py-2 px-2" style={{ color: 'var(--ink)' }}>{m.name}</td>
                  <td className="py-2 px-2"><Badge text={m.type} tone="gray" /></td>
                  <td className="py-2 px-2 text-right tabular-nums" style={{ color: m.level < 60 ? 'var(--rust)' : 'var(--ink)' }}>{m.stock}EA</td>
                  <td className="py-2 px-2 text-right tabular-nums" style={{ color: 'var(--ink-faint)' }}>{m.safety}EA</td>
                  <td className="py-2 px-2" style={{ minWidth: 80 }}>
                    <div className="flex items-center gap-2">
                      <ProgressBar value={m.level} />
                      <span className="text-[11px] tabular-nums" style={{ color: 'var(--ink-faint)' }}>{m.level}%</span>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-[11px]" style={{ color: 'var(--ink-faint)' }}>{m.lastIn}</td>
                  <td className="py-2 px-2">
                    {m.action && <Badge text={m.action} tone={m.action === '발주필요' ? 'red' : m.action === '발주점' ? 'amber' : 'gray'} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card-base p-4">
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-3" style={{ color: 'var(--ink-faint)' }}>완제품 (규격별)</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['제품 코드', '제품명', '현재고', '안전재고', '재고수준', '최근 입고', '조치'].map((h) => (
                  <th key={h} className="pb-2 text-left font-medium px-2 first:pl-0" style={{ color: 'var(--ink-faint)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {finished.map((f) => (
                <tr key={f.code} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td className="py-2 font-mono text-[11px]" style={{ color: 'var(--moss)' }}>{f.code}</td>
                  <td className="py-2 px-2" style={{ color: 'var(--ink)' }}>{f.name}</td>
                  <td className="py-2 px-2 text-right tabular-nums" style={{ color: f.level < 70 ? 'var(--rust)' : 'var(--ink)' }}>{f.stock}EA</td>
                  <td className="py-2 px-2 text-right tabular-nums" style={{ color: 'var(--ink-faint)' }}>{f.safety}EA</td>
                  <td className="py-2 px-2" style={{ minWidth: 80 }}>
                    <div className="flex items-center gap-2">
                      <ProgressBar value={f.level} />
                      <span className="text-[11px] tabular-nums" style={{ color: 'var(--ink-faint)' }}>{f.level}%</span>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-[11px]" style={{ color: 'var(--ink-faint)' }}>{f.lastIn}</td>
                  <td className="py-2 px-2">
                    {f.action && <Badge text={f.action} tone={f.action === '부족' ? 'red' : 'gray'} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SalesView() {
  const { summary, orders, complaints } = SALES_DATA
  const statusTone = (s) => {
    if (s === '납기임박') return 'red'
    if (s === '출고완료') return 'green'
    if (s === '출고요청') return 'amber'
    return 'gray'
  }
  return (
    <div>
      <SectionTitle breadcrumb="영업·납품 현황">영업·납품 현황</SectionTitle>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: '이번달 수주', value: summary.orders + '건', red: false },
          { label: '납기 임박', value: summary.urgent + '건', red: true },
          { label: '이번달 납품', value: summary.delivered + '건', red: false },
          { label: '고객 불만', value: summary.complaints + '건', red: true },
        ].map((s) => (
          <div key={s.label} className="card-base p-4">
            <div className="text-[12px] mb-1" style={{ color: 'var(--ink-mute)' }}>{s.label}</div>
            <div className="font-display text-[24px]"
              style={{ color: s.red && s.value !== '0건' ? 'var(--rust)' : 'var(--moss)', fontWeight: 600 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card-base p-4 mb-4">
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-3" style={{ color: 'var(--ink-faint)' }}>수주·납기 현황</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['수주번호', '고객사', '품목 요약', '납기일', 'D-day', '생산연동', '상태'].map((h) => (
                  <th key={h} className="pb-2 text-left font-medium px-2 first:pl-0" style={{ color: 'var(--ink-faint)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.so} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td className="py-2 font-mono text-[11.5px]" style={{ color: 'var(--moss)' }}>{o.so}</td>
                  <td className="py-2 px-2 font-medium" style={{ color: 'var(--ink)' }}>{o.customer}</td>
                  <td className="py-2 px-2" style={{ color: 'var(--ink-mute)' }}>{o.items}</td>
                  <td className="py-2 px-2 font-mono text-[11px]" style={{ color: 'var(--ink-faint)' }}>{o.dueDate}</td>
                  <td className="py-2 px-2 font-medium"
                    style={{ color: o.dday.startsWith('D-') && parseInt(o.dday.slice(2)) <= 5 ? 'var(--rust)' : 'var(--ink-mute)' }}>
                    {o.dday}
                  </td>
                  <td className="py-2 px-2 font-mono text-[11px]" style={{ color: 'var(--ink-faint)' }}>{o.wo}</td>
                  <td className="py-2 px-2"><Badge text={o.status} tone={statusTone(o.status)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card-base p-4">
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-3" style={{ color: 'var(--ink-faint)' }}>미결 고객 불만 현황</div>
        {complaints.map((c) => (
          <div key={c.id} className="flex items-center gap-4 text-[12.5px] py-2" style={{ borderBottom: '1px solid var(--line)' }}>
            <span className="font-mono text-[11px]" style={{ color: 'var(--rust)' }}>{c.id}</span>
            <span style={{ color: 'var(--ink-faint)' }}>{c.date}</span>
            <span style={{ color: 'var(--ink)' }}>{c.customer}</span>
            <span style={{ color: 'var(--ink-mute)' }}>{c.content}</span>
            <Badge text={c.severity} tone="amber" />
            <span style={{ color: 'var(--ink-faint)' }}>기한 {c.deadline}</span>
            <span className="font-mono text-[11px]" style={{ color: 'var(--moss)' }}>{c.capa}</span>
            <Badge text={c.status} tone="amber" />
          </div>
        ))}
      </div>
    </div>
  )
}

function QualityView() {
  const { summary, ncrs, audit, monthly } = QUALITY_DATA
  return (
    <div>
      <SectionTitle breadcrumb="품질 이슈 현황">품질 이슈 현황</SectionTitle>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: '미결 NCR', value: summary.openNCR + '건', red: true },
          { label: '진행중 CAPA', value: summary.activeCapa + '건', red: true },
          { label: '감사 지적 미결', value: summary.auditOpen + '건', red: false },
          { label: '이번달 종결', value: summary.closedThisMonth + '건', red: false },
        ].map((s) => (
          <div key={s.label} className="card-base p-4">
            <div className="text-[12px] mb-1" style={{ color: 'var(--ink-mute)' }}>{s.label}</div>
            <div className="font-display text-[24px]"
              style={{ color: s.red ? 'var(--rust)' : 'var(--moss)', fontWeight: 600 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card-base p-4 mb-4">
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-3" style={{ color: 'var(--ink-faint)' }}>미결 NCR·CAPA 현황</div>
        {ncrs.map((n) => (
          <div key={n.id} className="rounded-lg p-3 mb-2"
            style={{ background: n.severity === '높음' ? 'var(--rust-soft)' : 'var(--bg-soft)', border: '1px solid var(--line)' }}>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-[11.5px] font-medium" style={{ color: 'var(--rust)' }}>{n.id}</span>
              <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{n.date}</span>
              <Badge text={n.source} tone={n.source === '고객불만' ? 'red' : 'amber'} />
              <span style={{ color: 'var(--ink)' }}>{n.content}</span>
              <Badge text={n.severity === '높음' ? '높음' : '중간'} tone={n.severity === '높음' ? 'red' : 'amber'} />
            </div>
            <div className="mt-2 flex items-center gap-3 text-[11.5px]" style={{ color: 'var(--ink-mute)' }}>
              <span>CAPA: <span className="font-mono" style={{ color: 'var(--moss)' }}>{n.capa}</span></span>
              <span>종결 기한: {n.deadline}</span>
              <Badge text={n.status} tone="amber" />
            </div>
          </div>
        ))}
      </div>

      <div className="card-base p-3 mb-4 flex items-start gap-3"
        style={{ background: '#fff7ed', border: '1px solid #fb923c' }}>
        <AlertCircle size={14} style={{ color: '#ea580c', marginTop: 2 }} />
        <div className="text-[12.5px]" style={{ color: '#92400e' }}>
          <span className="font-semibold">내부감사 미결 지적 · </span>
          {audit.id} · {audit.content} · {audit.ncr} 연동 · 종결 기한: {audit.deadline}
        </div>
      </div>

      <div className="card-base p-4">
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-3" style={{ color: 'var(--ink-faint)' }}>이번달 품질 현황 요약</div>
        <div className="grid sm:grid-cols-2 gap-3 text-[12.5px]">
          {[
            { label: 'NCR 발생', value: `${monthly.ncrRaised}건 (종결 ${monthly.ncrClosed} · 진행중 ${monthly.ncrRaised - monthly.ncrClosed})`, sub: '전월 대비 +1건' },
            { label: 'CAPA 완료율', value: `${monthly.capaRate}`, sub: `목표 ${monthly.capaTarget} 대비 미달`, warn: true },
            { label: '내부감사', value: 'Q2 감사 진행중 — 지적 2건' },
            { label: '이달 종결', value: `NCR ${monthly.ncrClosed}건 / CAPA ${monthly.ncrClosed}건 종결`, sub: '전월 대비 개선' },
          ].map((item) => (
            <div key={item.label} className="rounded-lg p-3" style={{ background: 'var(--bg-soft)' }}>
              <div className="font-medium" style={{ color: 'var(--ink)' }}>{item.label}</div>
              <div className="mt-0.5" style={{ color: item.warn ? 'var(--rust)' : 'var(--ink-mute)' }}>{item.value}</div>
              {item.sub && <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{item.sub}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function EquipmentView() {
  const { alerts, instruments, licenses } = EQUIPMENT_DATA
  const statusTone = (s) => {
    if (s === '사용제한') return 'red'
    if (s === '교정임박') return 'amber'
    return 'green'
  }
  return (
    <div>
      <SectionTitle breadcrumb="설비·인허가 현황">설비·인허가 현황</SectionTitle>

      <div className="mb-4 rounded-lg p-3" style={{ background: '#fff7ed', border: '1px solid #fb923c' }}>
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle size={14} style={{ color: '#ea580c' }} />
          <span className="font-mono text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#ea580c' }}>주의</span>
        </div>
        {alerts.map((a, i) => (
          <div key={i} className="text-[12.5px]" style={{ color: '#92400e' }}>• {a}</div>
        ))}
      </div>

      <div className="card-base p-4 mb-4">
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-3" style={{ color: 'var(--ink-faint)' }}>설비·측정장비 교정 현황</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['장비명', '번호', '만료일', 'D-day', '상태'].map((h) => (
                  <th key={h} className="pb-2 text-left font-medium px-2 first:pl-0" style={{ color: 'var(--ink-faint)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {instruments.map((inst, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td className="py-2 font-medium" style={{ color: 'var(--ink)' }}>{inst.name}</td>
                  <td className="py-2 px-2 font-mono text-[11px]" style={{ color: 'var(--ink-faint)' }}>{inst.num}</td>
                  <td className="py-2 px-2 font-mono text-[11px]" style={{ color: 'var(--ink-faint)' }}>{inst.expire}</td>
                  <td className="py-2 px-2 font-medium"
                    style={{ color: inst.status === '사용제한' ? 'var(--rust)' : inst.status === '교정임박' ? '#b45309' : 'var(--moss)' }}>
                    {inst.dday}
                  </td>
                  <td className="py-2 px-2"><Badge text={inst.status} tone={statusTone(inst.status)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card-base p-4">
        <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-3" style={{ color: 'var(--ink-faint)' }}>인허가 진행 현황</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['허가번호', '제품명', '허가일', '변경허가', '기술문서', '상태'].map((h) => (
                  <th key={h} className="pb-2 text-left font-medium px-2 first:pl-0" style={{ color: 'var(--ink-faint)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {licenses.map((lic, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td className="py-2 font-mono text-[11px]" style={{ color: 'var(--moss)' }}>{lic.id}</td>
                  <td className="py-2 px-2 font-medium" style={{ color: 'var(--ink)' }}>{lic.product}</td>
                  <td className="py-2 px-2 font-mono text-[11px]" style={{ color: 'var(--ink-faint)' }}>{lic.date}</td>
                  <td className="py-2 px-2 text-[11.5px]" style={{ color: 'var(--ink-mute)' }}>{lic.change}</td>
                  <td className="py-2 px-2"><Badge text={lic.docs} tone={lic.docs === '완비' ? 'green' : 'amber'} /></td>
                  <td className="py-2 px-2">
                    <Badge text={lic.status}
                      tone={lic.status.includes('개발중') ? 'gray' : lic.status.includes('변경') ? 'amber' : 'green'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ExecutiveView({ onNavigate }) {
  const blocks = [
    {
      icon: ShieldCheck, label: '🛡 품질', color: 'var(--moss)', items: [
        { label: '불량률', value: '1.4%', ok: true, sub: '목표 ≤2.0%' },
        { label: 'CAPA완료율', value: '80%', ok: false, sub: '목표 ≥90%' },
        { label: 'NCR 미결', value: '2건', ok: false },
      ],
    },
    {
      icon: TrendingUp, label: '♟ 영업', color: '#1d4ed8', items: [
        { label: '이달 수주', value: '12건', ok: true },
        { label: '납기준수율', value: '91.7%', ok: false, sub: '목표 ≥95%' },
        { label: '고객불만', value: '3건 미결', ok: false },
      ],
    },
    {
      icon: Activity, label: '⚙ 생산', color: '#7c3aed', items: [
        { label: '진행WO', value: '3건', ok: true },
        { label: '평균수율', value: '98.6%', ok: true },
        { label: 'NCR 미결', value: '1건', ok: false },
      ],
    },
    {
      icon: Package, label: '📦 구매자재', color: '#b45309', items: [
        { label: '재고부족', value: '2품목', ok: false },
        { label: '발주대기', value: '1건', ok: false },
        { label: '공급자C등급', value: '1개', ok: false },
      ],
    },
    {
      icon: Users, label: '◈ 개발', color: '#0284c7', items: [
        { label: '설계진행', value: '2건', ok: true },
        { label: '위험관리갱신', value: 'D-45', ok: true },
        { label: '인허가변경', value: '1건', ok: true },
      ],
    },
    {
      icon: Wrench, label: '△ 설비·교정', color: '#0f766e', items: [
        { label: '교정임박', value: 'D-5', ok: false },
        { label: '사용제한', value: '1대', ok: false },
        { label: '정상장비', value: '4대 ✓', ok: true },
      ],
    },
  ]

  const urgentAlerts = [
    { text: '납기 임박 D-3 (SO-2406-012)', id: 'sales' },
    { text: '교정 만료 사용제한 (표면조도계 #001)', id: 'equipment' },
    { text: '원자재 재고 부족 (RM-001 8EA)', id: 'inventory' },
  ]

  const periods = ['오늘', '이번 주', '이번 달', '이번 분기']
  const [period, setPeriod] = useState('이번 달')

  return (
    <div>
      <SectionTitle breadcrumb="경영진 요약 뷰">경영진 요약 뷰</SectionTitle>

      <div className="flex gap-2 mb-4">
        {periods.map((p) => (
          <button key={p} onClick={() => setPeriod(p)}
            className="text-[12px] px-3 py-1.5 rounded-lg border transition"
            style={{
              background: period === p ? 'var(--moss)' : 'var(--bg-card)',
              color: period === p ? 'var(--bg)' : 'var(--ink-mute)',
              borderColor: period === p ? 'var(--moss)' : 'var(--line)',
            }}>
            {p}
          </button>
        ))}
      </div>

      <div className="mb-4 rounded-lg p-3" style={{ background: 'var(--rust-soft)', border: '1px solid var(--rust)' }}>
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={14} style={{ color: 'var(--rust)' }} />
          <span className="font-mono text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--rust)' }}>즉시 조치 필요</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {urgentAlerts.map((a) => (
            <button key={a.id} onClick={() => onNavigate(a.id)}
              className="text-[12px] px-2.5 py-1 rounded-lg flex items-center gap-1.5 hover:opacity-80 transition"
              style={{ background: 'var(--rust)', color: 'var(--bg)' }}>
              {a.text} <ChevronRight size={11} />
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {blocks.map((block) => (
          <div key={block.label} className="card-base p-4">
            <div className="flex items-center gap-2 mb-3">
              <block.icon size={15} style={{ color: block.color }} strokeWidth={1.7} />
              <span className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{block.label}</span>
            </div>
            <div className="space-y-2">
              {block.items.map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-[12px]" style={{ color: 'var(--ink-mute)' }}>{item.label}</span>
                  <div className="text-right">
                    <span className="text-[13px] font-medium" style={{ color: item.ok ? 'var(--moss)' : 'var(--rust)' }}>
                      {item.value}
                    </span>
                    {item.sub && <div className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{item.sub}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   메인 MonitoringHub
───────────────────────────────────────────── */
export default function MonitoringHub() {
  const user = auth.current()
  const [view, setView] = useState('home')

  const viewMap = {
    home: <MonHome onNavigate={setView} />,
    kpi: <KpiView />,
    production: <ProductionView />,
    inventory: <InventoryView />,
    sales: <SalesView />,
    quality: <QualityView />,
    equipment: <EquipmentView />,
    executive: <ExecutiveView onNavigate={setView} />,
  }

  return (
    <AppLayout user={user} title="모니터링" subtitle="전부서 통합 현황 · 읽기 전용">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto fade-in">
        {view !== 'home' && (
          <button onClick={() => setView('home')}
            className="flex items-center gap-1.5 mb-5 text-[13px] hover:underline"
            style={{ color: 'var(--moss)' }}>
            <ArrowLeft size={14} /> 모니터링 홈
          </button>
        )}

        {/* 서브 탭 네비게이션 */}
        {view !== 'home' && (
          <div className="flex gap-1 flex-wrap mb-5">
            {[
              { id: 'kpi', label: '전체 KPI' },
              { id: 'production', label: '생산 현황' },
              { id: 'inventory', label: '재고 현황' },
              { id: 'sales', label: '영업·납품' },
              { id: 'quality', label: '품질 이슈' },
              { id: 'equipment', label: '설비·인허가' },
              { id: 'executive', label: '경영진 요약' },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setView(tab.id)}
                className="text-[12px] px-3 py-1.5 rounded-lg border transition"
                style={{
                  background: view === tab.id ? 'var(--moss)' : 'var(--bg-card)',
                  color: view === tab.id ? 'var(--bg)' : 'var(--ink-mute)',
                  borderColor: view === tab.id ? 'var(--moss)' : 'var(--line)',
                }}>
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {viewMap[view] || viewMap.home}
      </div>
    </AppLayout>
  )
}
