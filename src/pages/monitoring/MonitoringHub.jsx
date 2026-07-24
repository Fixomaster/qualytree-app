import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart2, TrendingUp, TrendingDown, Minus,
  Package, AlertTriangle, ShieldCheck, Wrench,
  ChevronRight, Clock, Activity, CheckCircle,
  XCircle, AlertCircle, RefreshCw, Layers,
  ArrowRight, FileText, Users, Zap,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'

/* ─── localStorage 헬퍼 ─────────────────────── */
function readLS(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}

/* ─── 날짜 유틸 ─────────────────────────────── */
function parseDateStr(s) {
  if (!s) return null
  // 지원: 'YY-MM-DD', 'YYYY-MM-DD', '24-06-15', '2024-06-15'
  const clean = s.replace(/\./g, '-').trim()
  const parts = clean.split('-')
  if (parts.length < 3) return null
  let [y, m, d] = parts
  if (y.length === 2) y = '20' + y
  return new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`)
}

function daysUntil(dateStr) {
  const d = parseDateStr(dateStr)
  if (!d || isNaN(d)) return null
  return Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24))
}

/* ─── 공통 UI ───────────────────────────────── */
function Badge({ label, color = 'gray' }) {
  const colors = {
    red:    'bg-red-100 text-red-700',
    orange: 'bg-orange-100 text-orange-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    green:  'bg-green-100 text-green-700',
    blue:   'bg-blue-100 text-blue-700',
    gray:   'bg-gray-100 text-gray-600',
    purple: 'bg-purple-100 text-purple-700',
  }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.gray}`}>{label}</span>
}

function KpiCard({ label, value, sub, ok, icon: Icon, color }) {
  const borderColor = ok === true ? 'border-l-green-400' : ok === false ? 'border-l-red-400' : 'border-l-blue-400'
  return (
    <div className={`bg-white rounded-xl border border-gray-100 border-l-4 ${borderColor} p-4 shadow-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-800">{value ?? '—'}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        {Icon && <Icon className={`w-5 h-5 mt-1 ${color || 'text-gray-300'}`} />}
      </div>
    </div>
  )
}

function SectionCard({ title, children, empty, action, onAction }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        {action && <button onClick={onAction} className="text-xs text-blue-500 hover:text-blue-700">{action}</button>}
      </div>
      {empty
        ? <div className="py-8 text-center text-xs text-gray-400">데이터 없음</div>
        : <div>{children}</div>}
    </div>
  )
}

function Row({ left, right, badge, color, sub }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
      <div>
        <p className="text-sm text-gray-700">{left}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
      <div className="flex items-center gap-2">
        {badge && <Badge label={badge} color={color} />}
        {right && <span className="text-xs text-gray-500">{right}</span>}
      </div>
    </div>
  )
}

function AlertRow({ icon: Icon, msg, color }) {
  const colors = { red: 'text-red-500 bg-red-50', orange: 'text-orange-500 bg-orange-50', yellow: 'text-yellow-600 bg-yellow-50', blue: 'text-blue-500 bg-blue-50' }
  return (
    <div className={`flex items-start gap-2 px-3 py-2 rounded-lg mb-1.5 ${colors[color] || colors.blue}`}>
      <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
      <p className="text-xs">{msg}</p>
    </div>
  )
}

/* ─── 데이터 집계 ────────────────────────────── */
function useMonitorData() {
  return useMemo(() => {
    // 각 Hub의 localStorage 키 읽기
    const salOrders     = readLS('qms_sal_orders')
    const salComplaints = readLS('qms_sal_complaints')
    const salDeliveries = readLS('qms_sal_deliveries')
    const purOrders     = readLS('qms_pur_orders')
    const purInventory  = readLS('qms_pur_inventory')
    const purIqc        = readLS('qms_pur_iqc')
    const purIncoming   = readLS('qms_pur_incoming')
    const mfgWo         = readLS('qms_mfg_wo')
    const mfgNcr        = readLS('qms_mfg_ncr')
    const mfgInspect    = readLS('qms_mfg_inspect')
    const eqpInstr      = readLS('qms_eqp_instruments')
    const eqpHistory    = readLS('qms_eqp_history')
    const devPlans      = readLS('qms_dev_plans')

    const today = new Date()
    const in30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

    // ── 영업
    const activeOrders   = salOrders.filter(o => !['납품완료','출하완료','취소'].includes(o.status))
    const openComplaints = salComplaints.filter(c => !['종결','CAPA완료'].includes(c.status))
    const urgentOrders   = salOrders.filter(o => {
      const days = daysUntil(o.dueDate)
      return days !== null && days <= 7 && !['납품완료','출하완료','취소'].includes(o.status)
    })

    // ── 구매·자재
    const lowStock = purInventory.filter(i => {
      const s = parseFloat(i.stock ?? i.qty ?? 0)
      const m = parseFloat(i.min ?? i.safetyQty ?? 0)
      return m > 0 && s < m
    })
    const iqcPending  = purIqc.filter(i => ['대기','검사중','보류'].includes(i.status))
    const incomingSoon = purIncoming.filter(i => {
      const days = daysUntil(i.eta ?? i.dueDate)
      return days !== null && days >= 0 && days <= 7
    })

    // ── 생산
    const activeWo = mfgWo.filter(w => ['진행중','대기','시작전'].includes(w.status))
    const openNcr  = mfgNcr.filter(n => !['완료','종결','처리완료'].includes(n.status))
    const overdueWo = mfgWo.filter(w => {
      const days = daysUntil(w.dueDate)
      return days !== null && days < 0 && !['완료','종결'].includes(w.status)
    })

    // 불량률 계산 (검사 기록 기반)
    const totalInspected = mfgInspect.reduce((s, i) => s + (parseFloat(i.qty ?? i.total ?? 0)), 0)
    const totalDefect    = mfgInspect.reduce((s, i) => s + (parseFloat(i.defect ?? i.nc ?? i.reject ?? 0)), 0)
    const defectRate     = totalInspected > 0 ? (totalDefect / totalInspected * 100) : null

    // ── 설비·교정
    const calDue = eqpInstr.filter(e => {
      const days = daysUntil(e.nextCalib ?? e.calibDue)
      return days !== null && days <= 30
    })
    const calOverdue = eqpInstr.filter(e => {
      const days = daysUntil(e.nextCalib ?? e.calibDue)
      return days !== null && days < 0
    })
    const restricted = eqpInstr.filter(e => e.status === '사용제한' || e.status === '폐기')

    // ── 개발
    const activePlans = devPlans.filter(p => !['완료','취소'].includes(p.status))

    // ── 전체 알림 목록
    const alerts = []
    openComplaints.forEach(c => alerts.push({ type: 'complaint', color: 'red',
      msg: `[고객불만] ${c.customer} — ${c.content?.substring(0,30)}` }))
    openNcr.forEach(n => alerts.push({ type: 'ncr', color: 'orange',
      msg: `[NCR] ${n.id} — ${n.desc?.substring(0,30) ?? n.step}` }))
    lowStock.forEach(i => alerts.push({ type: 'stock', color: 'yellow',
      msg: `[재고부족] ${i.name} — 현재 ${i.stock}${i.unit ?? ''} (최소 ${i.min}${i.unit ?? ''})` }))
    calOverdue.forEach(e => alerts.push({ type: 'cal', color: 'red',
      msg: `[교정초과] ${e.name} — 교정일 ${e.nextCalib ?? e.calibDue} 경과` }))
    urgentOrders.forEach(o => alerts.push({ type: 'order', color: 'orange',
      msg: `[납기임박] ${o.id} ${o.customer} — D-${daysUntil(o.dueDate)}일` }))
    overdueWo.forEach(w => alerts.push({ type: 'wo', color: 'red',
      msg: `[WO지연] ${w.id} ${w.product} — 납기 ${Math.abs(daysUntil(w.dueDate))}일 초과` }))
    iqcPending.forEach(i => alerts.push({ type: 'iqc', color: 'blue',
      msg: `[IQC대기] ${i.items} (${i.vendor}) — 검사 대기 중` }))

    return {
      sal:  { orders: salOrders, complaints: salComplaints, deliveries: salDeliveries,
              activeOrders, openComplaints, urgentOrders },
      pur:  { orders: purOrders, inventory: purInventory, iqc: purIqc, incoming: purIncoming,
              lowStock, iqcPending, incomingSoon },
      mfg:  { wo: mfgWo, ncr: mfgNcr, inspect: mfgInspect,
              activeWo, openNcr, overdueWo, defectRate },
      eqp:  { instruments: eqpInstr, history: eqpHistory,
              calDue, calOverdue, restricted, total: eqpInstr.length },
      dev:  { plans: devPlans, activePlans },
      alerts,
    }
  }, [])
}

/* ─── 홈(대시보드) 뷰 ────────────────────────── */
function HomeView({ data, setView }) {
  const { sal, pur, mfg, eqp, dev, alerts } = data

  const kpis = [
    { label: '진행중 수주', value: sal.activeOrders.length + '건',
      sub: `납기임박 ${sal.urgentOrders.length}건`, ok: sal.urgentOrders.length === 0,
      icon: FileText, color: 'text-blue-400' },
    { label: '미결 고객불만', value: sal.openComplaints.length + '건',
      sub: `목표 ≤2건`, ok: sal.openComplaints.length <= 2,
      icon: AlertCircle, color: 'text-red-400' },
    { label: '진행중 WO', value: mfg.activeWo.length + '건',
      sub: `지연 ${mfg.overdueWo.length}건`, ok: mfg.overdueWo.length === 0,
      icon: Activity, color: 'text-purple-400' },
    { label: '교정 임박', value: eqp.calDue.length + '개',
      sub: `초과 ${eqp.calOverdue.length}개`, ok: eqp.calOverdue.length === 0,
      icon: Wrench, color: 'text-orange-400' },
    { label: '재고 부족', value: pur.lowStock.length + '개',
      sub: `IQC 대기 ${pur.iqcPending.length}건`, ok: pur.lowStock.length === 0,
      icon: Package, color: 'text-yellow-500' },
    { label: '미결 NCR', value: mfg.openNcr.length + '건',
      sub: mfg.defectRate !== null ? `불량률 ${mfg.defectRate.toFixed(1)}%` : '검사기록 없음',
      ok: mfg.openNcr.length === 0,
      icon: XCircle, color: 'text-red-400' },
  ]

  const moduleCards = [
    { id: 'sales',    icon: FileText,     label: '영업',      desc: `수주 ${sal.orders.length}건 · 불만 ${sal.complaints.length}건`,   color: 'blue' },
    { id: 'purchase', icon: Package,      label: '구매자재',  desc: `재고 ${pur.inventory.length}품목 · 부족 ${pur.lowStock.length}개`, color: 'yellow' },
    { id: 'mfg',      icon: Activity,    label: '생산',      desc: `WO ${mfg.wo.length}건 · NCR ${mfg.ncr.length}건`,               color: 'purple' },
    { id: 'equip',    icon: Wrench,       label: '설비·교정', desc: `기기 ${eqp.total}개 · 교정임박 ${eqp.calDue.length}개`,          color: 'orange' },
  ]
  const colorMap = { blue: 'bg-blue-50 border-blue-100', yellow: 'bg-yellow-50 border-yellow-100',
                     purple: 'bg-purple-50 border-purple-100', orange: 'bg-orange-50 border-orange-100' }
  const iconColorMap = { blue: 'text-blue-500', yellow: 'text-yellow-600', purple: 'text-purple-500', orange: 'text-orange-500' }

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        {kpis.map((k, i) => <KpiCard key={i} {...k} />)}
      </div>

      {/* 알림 */}
      {alerts.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">⚡ 조치 필요 ({alerts.length}건)</p>
          <div>
            {alerts.slice(0, 8).map((a, i) => (
              <AlertRow key={i}
                icon={a.color === 'red' ? XCircle : a.color === 'orange' ? AlertTriangle : a.color === 'yellow' ? AlertCircle : Clock}
                msg={a.msg} color={a.color} />
            ))}
            {alerts.length > 8 && <p className="text-xs text-gray-400 text-center mt-1">외 {alerts.length - 8}건 더 있음</p>}
          </div>
        </div>
      )}

      {alerts.length === 0 && (
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <div>
            <p className="text-sm font-semibold text-green-700">모든 지표 정상</p>
            <p className="text-xs text-green-600">조치가 필요한 항목이 없습니다.</p>
          </div>
        </div>
      )}

      {/* 모듈 카드 */}
      <div className="grid grid-cols-2 gap-3">
        {moduleCards.map(m => (
          <button key={m.id} onClick={() => setView(m.id)}
            className={`flex items-start gap-3 p-3 rounded-xl border text-left transition hover:shadow-md ${colorMap[m.color]}`}>
            <m.icon className={`w-5 h-5 mt-0.5 ${iconColorMap[m.color]}`} />
            <div>
              <p className="text-sm font-semibold text-gray-700">{m.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─── 영업 뷰 ───────────────────────────────── */
function SalesView({ data }) {
  const { orders, complaints, deliveries, activeOrders, openComplaints, urgentOrders } = data
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="진행중 수주" value={activeOrders.length + '건'} icon={FileText} color="text-blue-400" />
        <KpiCard label="납기임박" value={urgentOrders.length + '건'} ok={urgentOrders.length === 0} icon={Clock} color="text-orange-400" />
        <KpiCard label="미결 불만" value={openComplaints.length + '건'} ok={openComplaints.length <= 2} icon={AlertCircle} color="text-red-400" />
      </div>

      <SectionCard title="수주 현황" empty={orders.length === 0}>
        {activeOrders.length === 0
          ? <div className="py-6 text-center text-xs text-gray-400">진행중인 수주가 없습니다.</div>
          : activeOrders.slice(0, 10).map(o => {
              const days = daysUntil(o.dueDate)
              const color = days !== null && days <= 3 ? 'red' : days !== null && days <= 7 ? 'orange' : 'blue'
              return <Row key={o.id} left={`${o.id}`} sub={`${o.customer} · ${o.items}`}
                badge={o.status} color={color} right={days !== null ? `D-${days}` : o.dueDate} />
            })}
      </SectionCard>

      <SectionCard title="미결 고객불만" empty={openComplaints.length === 0}>
        {openComplaints.map(c => (
          <Row key={c.id} left={c.id} sub={`${c.customer} — ${c.content?.substring(0,35)}`}
            badge={c.status} color={c.severity === '심각' ? 'red' : c.severity === '중요' ? 'orange' : 'yellow'} />
        ))}
      </SectionCard>

      <SectionCard title="최근 납품" empty={deliveries.length === 0}>
        {deliveries.slice(0, 5).map(d => (
          <Row key={d.id} left={d.id} sub={d.customer ?? d.order}
            badge={d.status} color={d.status === '완료' ? 'green' : 'blue'} right={d.date ?? d.deliveryDate} />
        ))}
      </SectionCard>
    </div>
  )
}

/* ─── 구매자재 뷰 ───────────────────────────── */
function PurchaseView({ data }) {
  const { orders, inventory, iqc, lowStock, iqcPending, incomingSoon } = data
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="재고 부족" value={lowStock.length + '품목'} ok={lowStock.length === 0} icon={Package} color="text-yellow-500" />
        <KpiCard label="IQC 대기" value={iqcPending.length + '건'} ok={iqcPending.length === 0} icon={CheckCircle} color="text-blue-400" />
        <KpiCard label="입고 예정(7일)" value={incomingSoon.length + '건'} icon={Layers} color="text-purple-400" />
      </div>

      <SectionCard title="재고 부족 자재" empty={lowStock.length === 0}>
        {lowStock.map(i => (
          <Row key={i.id} left={i.name} sub={`현재고 ${i.stock}${i.unit ?? ''} / 최소 ${i.min}${i.unit ?? ''}`}
            badge="부족" color="red" right={i.location} />
        ))}
      </SectionCard>

      <SectionCard title="IQC 대기" empty={iqcPending.length === 0}>
        {iqcPending.map(i => (
          <Row key={i.id} left={i.items} sub={`${i.vendor} · ${i.qty}`}
            badge={i.status} color="orange" right={i.date} />
        ))}
      </SectionCard>

      <SectionCard title="진행중 발주" empty={orders.filter(o=>!['완료','취소'].includes(o.status)).length === 0}>
        {orders.filter(o=>!['완료','취소'].includes(o.status)).slice(0,8).map(o => (
          <Row key={o.id} left={o.id} sub={`${o.vendor} · ${o.items}`}
            badge={o.status} color="blue" right={o.eta ?? o.dueDate} />
        ))}
      </SectionCard>
    </div>
  )
}

/* ─── 생산 뷰 ───────────────────────────────── */
function ManufacturingView({ data }) {
  const { wo, ncr, activeWo, openNcr, overdueWo, defectRate } = data
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="진행중 WO" value={activeWo.length + '건'} icon={Activity} color="text-purple-400" />
        <KpiCard label="WO 지연" value={overdueWo.length + '건'} ok={overdueWo.length === 0} icon={Clock} color="text-red-400" />
        <KpiCard label="미결 NCR" value={openNcr.length + '건'} ok={openNcr.length === 0} icon={XCircle} color="text-orange-400" />
      </div>

      {defectRate !== null && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500">불량률 (검사 기록 기준)</p>
          <p className="text-2xl font-bold mt-1" style={{color: defectRate > 2 ? '#ef4444' : '#16a34a'}}>
            {defectRate.toFixed(2)}%
          </p>
          <p className="text-xs text-gray-400 mt-0.5">목표: ≤2.0%</p>
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{
              width: `${Math.min(defectRate / 4 * 100, 100)}%`,
              backgroundColor: defectRate > 2 ? '#ef4444' : '#16a34a'
            }}/>
          </div>
        </div>
      )}

      <SectionCard title="진행중 작업지시 (WO)" empty={activeWo.length === 0}>
        {activeWo.map(w => {
          const days = daysUntil(w.dueDate)
          return (
            <Row key={w.id} left={w.id} sub={`${w.product} ${w.qty}EA · ${w.step ?? w.status}`}
              badge={days !== null && days < 0 ? '지연' : w.status}
              color={days !== null && days < 0 ? 'red' : days !== null && days <= 3 ? 'orange' : 'blue'}
              right={`D-${days ?? '?'}`} />
          )
        })}
      </SectionCard>

      <SectionCard title="미결 부적합 (NCR)" empty={openNcr.length === 0}>
        {openNcr.map(n => (
          <Row key={n.id} left={n.id} sub={`${n.step ?? ''} — ${n.desc?.substring(0,35)}`}
            badge={n.severity ?? n.status}
            color={n.severity === '심각' ? 'red' : n.severity === '중요' ? 'orange' : 'yellow'} />
        ))}
      </SectionCard>
    </div>
  )
}

/* ─── 설비·교정 뷰 ──────────────────────────── */
function EquipmentView({ data }) {
  const { instruments, calDue, calOverdue, restricted, total } = data
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="전체 기기" value={total + '개'} icon={Wrench} color="text-gray-400" />
        <KpiCard label="교정 임박(30일)" value={calDue.length + '개'} ok={calDue.length === 0} icon={Clock} color="text-orange-400" />
        <KpiCard label="교정 초과" value={calOverdue.length + '개'} ok={calOverdue.length === 0} icon={AlertTriangle} color="text-red-400" />
      </div>

      <SectionCard title="교정 초과 / 임박 기기" empty={calDue.length === 0 && calOverdue.length === 0}>
        {[...calOverdue, ...calDue.filter(e => !calOverdue.includes(e))].map(e => {
          const days = daysUntil(e.nextCalib ?? e.calibDue)
          const overdue = days !== null && days < 0
          return (
            <Row key={e.id} left={e.name} sub={`S/N ${e.serial ?? '—'} · ${e.location ?? ''}`}
              badge={overdue ? '초과' : `D-${days}`}
              color={overdue ? 'red' : days <= 7 ? 'orange' : 'yellow'}
              right={e.nextCalib ?? e.calibDue} />
          )
        })}
      </SectionCard>

      <SectionCard title="사용제한 기기" empty={restricted.length === 0}>
        {restricted.map(e => (
          <Row key={e.id} left={e.name} sub={`${e.model ?? ''} · S/N ${e.serial ?? ''}`}
            badge={e.status} color="red" right={e.location} />
        ))}
      </SectionCard>

      <SectionCard title="전체 기기 현황" empty={instruments.length === 0}>
        {instruments.slice(0, 10).map(e => {
          const days = daysUntil(e.nextCalib ?? e.calibDue)
          return (
            <Row key={e.id} left={e.name} sub={`${e.range ?? ''} · ${e.location ?? ''}`}
              badge={e.status ?? '사용가능'}
              color={e.status === '사용제한' ? 'red' : days !== null && days < 0 ? 'red' : days !== null && days <= 30 ? 'orange' : 'green'}
              right={e.nextCalib ?? e.calibDue} />
          )
        })}
      </SectionCard>
    </div>
  )
}

/* ─── 메인 컴포넌트 ─────────────────────────── */
export default function MonitoringHub() {
  const [view, setView] = useState('home')
  const navigate = useNavigate()
  const user = auth.current()
  const data = useMonitorData()

  const tabs = [
    { id: 'home',     label: '대시보드' },
    { id: 'sales',    label: '영업' },
    { id: 'purchase', label: '구매자재' },
    { id: 'mfg',      label: '생산' },
    { id: 'equip',    label: '설비·교정' },
  ]

  const viewMap = {
    home:     <HomeView data={data} setView={setView} />,
    sales:    <SalesView data={data.sal} />,
    purchase: <PurchaseView data={data.pur} />,
    mfg:      <ManufacturingView data={data.mfg} />,
    equip:    <EquipmentView data={data.eqp} />,
  }

  // 전체 알림 수 계산
  const alertCount = data.alerts.length

  return (
    <AppLayout>
      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
              <BarChart2 className="w-3.5 h-3.5" />
              MON · ISO 13485 §8.2.3 / §8.4
            </div>
            <h1 className="text-xl font-bold text-gray-800">모니터링</h1>
            <p className="text-xs text-gray-500 mt-0.5">전사 KPI 실시간 집계 · {user?.name ?? user?.email}</p>
          </div>
          <button onClick={() => window.location.reload()}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 p-2">
            <RefreshCw className="w-3.5 h-3.5" /> 새로고침
          </button>
        </div>

        {/* 탭 */}
        <div className="flex gap-0.5 bg-gray-100 p-1 rounded-xl overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setView(t.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${view === t.id ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.label}
              {t.id === 'home' && alertCount > 0 &&
                <span className="ml-1 bg-red-500 text-white text-[10px] rounded-full px-1">{alertCount}</span>}
            </button>
          ))}
        </div>

        {/* 뷰 */}
        {viewMap[view] ?? viewMap.home}
      </div>
    </AppLayout>
  )
}
