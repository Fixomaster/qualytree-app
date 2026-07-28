// src/pages/home/DeptHome.jsx
// 부서별 홈 대시보드 — localStorage 기반 (Supabase 연동 전)
import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle, CheckCircle2, Clock, Plus,
  ChevronRight, RefreshCw, Bell, TrendingUp,
  BarChart2, Workflow, ShieldCheck, Search,
  FileText, Target, Calendar, Users,
  ArrowRight, Zap,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import { deptAuth, DEPT_LIST } from '../../lib/deptAuth'
import { loadContext, computeAllCards, computeOverallScore } from '../../lib/gmpProgress'

// ── localStorage 읽기 헬퍼 ──────────────────────────────────
function lsRead(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    // operations는 { workOrders: [...] } 구조, training은 { sessions: [...] } 구조
    if (key === 'qualytree.operations' && parsed?.workOrders) return parsed.workOrders
    if (key === 'qualytree.training' && parsed?.sessions) return parsed.sessions
    if (Array.isArray(parsed)) return parsed
    return fallback
  } catch { return fallback }
}


// ── 부서별 할 일 집계 ──────────────────────────────────────
function getMyTasks(dept) {
  const tasks = []
  const now = new Date()

  // QUA/MFG/ALL: NCR 오픈 건
  const ncrs = lsRead('qualytree.ncrs')
  ncrs.filter(n => ['open', 'under_review', 'correcting'].includes(n.status)).forEach(n => {
    const urgent = n.severity === 'critical' || n.severity === 'major'
    if (['QUA', 'MFG', 'ALL'].includes(dept) || (dept === 'SAL' && n.source === 'complaint')) {
      tasks.push({
        id: n.id, type: 'ncr', urgent,
        label: `NCR · ${n.title || n.id}`,
        sub: `심각도: ${n.severity || '-'} · 상태: ${n.status}`,
        link: '/quality', color: urgent ? '#EF4444' : '#F59E0B',
        createdAt: n.detectedAt || n.createdAt,
      })
    }
  })

  // QUA/ALL: CAPA 기한 초과·임박
  const capas = lsRead('qualytree.capas')
  capas.filter(c => !['closed', 'verified'].includes(c.status)).forEach(c => {
    const due = c.targetDate ? new Date(c.targetDate) : null
    const overdue = due && due < now
    const soon = due && !overdue && (due - now) < 7 * 86400000
    if (['QUA', 'ALL'].includes(dept) && (overdue || soon)) {
      tasks.push({
        id: c.id, type: 'capa', urgent: overdue,
        label: `CAPA · ${c.title || c.id}`,
        sub: overdue ? `⚠️ 기한 초과 (${c.targetDate})` : `📅 D-${Math.ceil((due - now) / 86400000)} (${c.targetDate})`,
        link: '/quality', color: overdue ? '#EF4444' : '#F59E0B',
        createdAt: c.createdAt,
      })
    }
  })

  // MFG/OPS/ALL: 대기 중 작업지시
  const wos = lsRead('qualytree.operations')
  wos.filter(w => ['pending', 'in_progress'].includes(w.status)).forEach(w => {
    if (['MFG', 'ALL'].includes(dept)) {
      tasks.push({
        id: w.woId || w.id, type: 'wo',
        urgent: w.priority === 'urgent',
        label: `WO · ${w.productName || w.woId}`,
        sub: `로트: ${w.lotNumber || '-'} · ${w.status === 'pending' ? '시작 대기' : '진행 중'}`,
        link: '/operations', color: w.priority === 'urgent' ? '#EF4444' : '#3B82F6',
        createdAt: w.issuedAt || w.createdAt,
      })
    }
  })

  // AUD: 미결 CAR
  const cars = lsRead('qualytree.audit_cars')
  cars.filter(c => c.status === 'open').forEach(c => {
    if (['QUA', 'AUD', 'ALL'].includes(dept)) {
      tasks.push({
        id: c.id, type: 'car', urgent: c.severity === 'major',
        label: `CAR · ${c.finding?.slice(0, 40) || c.id}...`,
        sub: `감사: ${c.auditId || '-'} · 담당: ${c.assignee || '-'}`,
        link: '/audit', color: '#EF4444',
        createdAt: c.createdAt,
      })
    }
  })

  // IMP: 승인 대기 개선 과제
  const imps = lsRead('qualytree.improvements')
  imps.filter(i => i.status === 'idea').forEach(i => {
    if (['IMP', 'QUA', 'MR', 'ALL'].includes(dept)) {
      tasks.push({
        id: i.id, type: 'imp', urgent: i.priority === 'high',
        label: `개선 · ${i.title || i.id}`,
        sub: `우선순위: ${i.priority === 'high' ? '높음' : '보통'} · 승인 대기`,
        link: '/improvement', color: i.priority === 'high' ? '#F59E0B' : '#6B7280',
        createdAt: i.createdAt,
      })
    }
  })

  // MR: 감사 완료 후 종결 대기
  const audits = lsRead('qualytree.audits')
  audits.filter(a => a.status === 'completed').forEach(a => {
    if (['MR', 'QUA', 'AUD', 'ALL'].includes(dept)) {
      tasks.push({
        id: a.id, type: 'audit', urgent: false,
        label: `감사 종결 대기 · ${a.title || a.id}`,
        sub: `감사일: ${a.auditDate || '-'} · 시정조치 확인 필요`,
        link: '/audit', color: '#8B5CF6',
        createdAt: a.createdAt,
      })
    }
  })

  // SAL: 납기임박 수주 (D-7 이내)
  const salOrdersT = lsRead('qms_sal_orders')
  salOrdersT.filter(o => !['납품완료', '취소'].includes(o.status)).forEach(o => {
    const due = o.dueDate ? new Date(o.dueDate) : null
    const days = due && !isNaN(due.getTime()) ? Math.ceil((due - now) / 86400000) : null
    if (days !== null && days <= 7 && ['SAL', 'ALL'].includes(dept)) {
      tasks.push({
        id: o.id, type: 'order', urgent: days < 0,
        label: `수주 · ${o.id} ${o.customer || ''}`,
        sub: days < 0 ? `⚠️ 납기 ${Math.abs(days)}일 초과` : `📅 D-${days} (${o.dueDate})`,
        link: '/sales', color: days < 0 ? '#EF4444' : '#F59E0B',
        createdAt: o.dueDate,
      })
    }
  })

  // PUR: 재고 부족
  const purInvT = lsRead('qms_pur_inventory')
  purInvT.forEach(i => {
    const s = parseFloat(i.stock ?? i.qty ?? 0)
    const m = parseFloat(i.min ?? i.safetyQty ?? 0)
    if (m > 0 && s < m && ['PUR', 'ALL'].includes(dept)) {
      tasks.push({
        id: i.id, type: 'stock', urgent: s <= 0,
        label: `재고부족 · ${i.name || i.id}`,
        sub: `현재 ${i.stock}${i.unit || ''} (최소 ${i.min}${i.unit || ''})`,
        link: '/purchase', color: '#F59E0B',
        createdAt: null,
      })
    }
  })

  // EQP: 교정 초과
  const eqpInstrT = lsRead('qms_eqp_instruments')
  eqpInstrT.forEach(e => {
    const d = e.nextCalib ? new Date(e.nextCalib) : null
    const days = d && !isNaN(d.getTime()) ? Math.ceil((d - now) / 86400000) : null
    if (days !== null && days < 0 && ['EQP', 'ALL'].includes(dept)) {
      tasks.push({
        id: e.id, type: 'cal', urgent: true,
        label: `교정초과 · ${e.name || e.id}`,
        sub: `교정일 ${e.nextCalib} 경과 (${Math.abs(days)}일)`,
        link: '/equipment', color: '#EF4444',
        createdAt: e.nextCalib,
      })
    }
  })

  // 우선순위 정렬: urgent 먼저, 최신 순
  return tasks
    .sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0))
    .slice(0, 8)
}

// ── 부서별 KPI 카드 정의 ─────────────────────────────────
function getDeptKPIs(dept) {
  const ncrs = lsRead('qualytree.ncrs')
  const capas = lsRead('qualytree.capas')
  const wos = lsRead('qualytree.operations')
  const cars = lsRead('qualytree.audit_cars')
  const imps = lsRead('qualytree.improvements')

  // 영업·구매·설비·교육 — 각 Hub가 실제로 쓰는 localStorage 키 (기존 MonitoringHub.jsx와 동일한 규칙)
  const salOrders = lsRead('qms_sal_orders')
  const salComplaints = lsRead('qms_sal_complaints')
  const purOrders = lsRead('qms_pur_orders')
  const purIqc = lsRead('qms_pur_iqc')
  const eqpInstr = lsRead('qms_eqp_instruments')
  const trnSessions = lsRead('qualytree.training')

  const daysUntilLocal = (d) => {
    if (!d) return null
    const t = new Date(d)
    if (isNaN(t.getTime())) return null
    return Math.ceil((t - new Date()) / 86400000)
  }

  const activeOrders = salOrders.filter(o => !['납품완료', '취소'].includes(o.status))
  const openComplaints = salComplaints.filter(c => !['종결', 'CAPA완료'].includes(c.status))
  const pendingPurOrders = purOrders.filter(o => o.status === '발주대기')
  const pendingIqc = purIqc.filter(i => i.status === '검사중')
  const calDue = eqpInstr.filter(e => {
    const d = daysUntilLocal(e.nextCalib)
    return d !== null && d <= 30
  })
  const calOverdue = eqpInstr.filter(e => {
    const d = daysUntilLocal(e.nextCalib)
    return d !== null && d < 0
  })
  const trnUpcoming = trnSessions.filter(s => s.status === '예정')
  const trnDone = trnSessions.filter(s => s.status === '완료')

  const openNcrs = ncrs.filter(n => !['closed'].includes(n.status)).length
  const openCapas = capas.filter(c => !['closed', 'verified'].includes(c.status)).length
  const activeWos = wos.filter(w => ['pending', 'in_progress'].includes(w.status)).length
  const openCars = cars.filter(c => c.status === 'open').length
  const activeImps = imps.filter(i => ['approved', 'in_progress'].includes(i.status)).length

  const BASE = [
    { label: '미결 NCR', value: openNcrs, icon: AlertTriangle, color: openNcrs > 0 ? '#EF4444' : '#10B981', link: '/quality' },
    { label: '진행 중 CAPA', value: openCapas, icon: CheckCircle2, color: openCapas > 3 ? '#F59E0B' : '#10B981', link: '/quality' },
  ]

  const BY_DEPT = {
    SAL: [...BASE,
      { label: '진행 중 주문', value: activeOrders.length, icon: TrendingUp, color: activeOrders.length > 0 ? '#3B82F6' : '#6B7280', link: '/sales' },
      { label: '미결 고객불만', value: openComplaints.length, icon: Users, color: openComplaints.length > 0 ? '#EF4444' : '#10B981', link: '/sales' },
    ],
    MFG: [...BASE,
      { label: '활성 작업지시', value: activeWos, icon: Workflow, color: activeWos > 0 ? '#3B82F6' : '#6B7280', link: '/operations' },
      { label: '진행 중 생산', value: wos.filter(w => w.status === 'in_progress').length, icon: Clock, color: '#F59E0B', link: '/manufacturing' },
    ],
    PUR: [...BASE,
      { label: '발주 대기', value: pendingPurOrders.length, icon: Clock, color: pendingPurOrders.length > 0 ? '#8B5CF6' : '#6B7280', link: '/purchase' },
      { label: '수입검사 대기', value: pendingIqc.length, icon: ShieldCheck, color: pendingIqc.length > 0 ? '#F59E0B' : '#6B7280', link: '/purchase' },
    ],
    QUA: [
      { label: '미결 NCR', value: openNcrs, icon: AlertTriangle, color: openNcrs > 0 ? '#EF4444' : '#10B981', link: '/quality' },
      { label: '진행 중 CAPA', value: openCapas, icon: CheckCircle2, color: '#3B82F6', link: '/quality' },
      { label: '미결 CAR', value: openCars, icon: Search, color: openCars > 0 ? '#EF4444' : '#10B981', link: '/audit' },
      { label: '개선 활동', value: activeImps, icon: TrendingUp, color: '#8B5CF6', link: '/improvement' },
    ],
    EQP: [...BASE,
      { label: '교정 임박', value: calDue.length, icon: Target, color: calDue.length > 0 ? '#F59E0B' : '#6B7280', link: '/equipment' },
      { label: '교정 초과', value: calOverdue.length, icon: AlertTriangle, color: calOverdue.length > 0 ? '#EF4444' : '#10B981', link: '/equipment' },
    ],
    DEV: [...BASE,
      { label: '설계 검토', value: '—', icon: FileText, color: '#8B5CF6', link: '/development', hint: true },
      { label: '밸리데이션', value: '—', icon: CheckCircle2, color: '#3B82F6', link: '/development', hint: true },
    ],
    DOC: [
      { label: '검토 필요 문서', value: '—', icon: FileText, color: '#F59E0B', link: '/documents', hint: true },
      { label: '만료 임박', value: '—', icon: Clock, color: '#EF4444', link: '/documents', hint: true },
      ...BASE,
    ],
    MR: [
      { label: '미결 NCR', value: openNcrs, icon: AlertTriangle, color: openNcrs > 0 ? '#EF4444' : '#10B981', link: '/quality' },
      { label: '미결 CAPA', value: openCapas, icon: CheckCircle2, color: '#3B82F6', link: '/quality' },
      { label: '미결 CAR', value: openCars, icon: Search, color: openCars > 0 ? '#EF4444' : '#10B981', link: '/audit' },
      { label: '개선 과제', value: activeImps, icon: BarChart2, color: '#8B5CF6', link: '/improvement' },
    ],
    TRN: [...BASE,
      { label: '교육 예정', value: trnUpcoming.length, icon: Calendar, color: '#3B82F6', link: '/training' },
      { label: '이수 완료', value: trnDone.length, icon: CheckCircle2, color: '#10B981', link: '/training' },
    ],
    RA: [...BASE,
      { label: '허가 검토', value: '—', icon: FileText, color: '#8B5CF6', link: '/regulatory', hint: true },
      { label: '변경 신고', value: '—', icon: AlertTriangle, color: '#F59E0B', link: '/regulatory', hint: true },
    ],
    AUD: [
      { label: '미결 CAR', value: openCars, icon: Search, color: openCars > 0 ? '#EF4444' : '#10B981', link: '/audit' },
      { label: '진행 중 감사', value: lsRead('qualytree.audits').filter(a => a.status === 'in_progress').length, icon: Clock, color: '#F59E0B', link: '/audit' },
      ...BASE,
    ],
    IMP: [
      { label: '승인 대기', value: imps.filter(i => i.status === 'idea').length, icon: Zap, color: '#F59E0B', link: '/improvement' },
      { label: '진행 중', value: activeImps, icon: TrendingUp, color: '#3B82F6', link: '/improvement' },
      { label: '완료', value: imps.filter(i => i.status === 'done').length, icon: CheckCircle2, color: '#10B981', link: '/improvement' },
      { label: 'NCR 연결', value: openNcrs, icon: AlertTriangle, color: '#EF4444', link: '/quality' },
    ],
    ALL: [
      { label: '미결 NCR', value: openNcrs, icon: AlertTriangle, color: openNcrs > 0 ? '#EF4444' : '#10B981', link: '/quality' },
      { label: '미결 CAPA', value: openCapas, icon: CheckCircle2, color: '#3B82F6', link: '/quality' },
      { label: '활성 작업지시', value: activeWos, icon: Workflow, color: '#F59E0B', link: '/operations' },
      { label: '개선 과제', value: activeImps, icon: BarChart2, color: '#8B5CF6', link: '/improvement' },
    ],
  }
  return BY_DEPT[dept] || BASE
}

// ── 부서별 빠른 실행 버튼 ──────────────────────────────────
const QUICK_ACTIONS = {
  SAL: [
    { label: '주문 등록', link: '/sales', color: '#3B82F6', icon: Plus },
    { label: 'NCR 등록', link: '/quality', color: '#EF4444', icon: AlertTriangle },
    { label: '문서 조회', link: '/documents', color: '#6B7280', icon: FileText },
  ],
  MFG: [
    { label: '작업지시 시작', link: '/operations', color: '#3B82F6', icon: Workflow },
    { label: 'NCR 등록', link: '/quality', color: '#EF4444', icon: AlertTriangle },
    { label: 'EBR 작성', link: '/operations', color: '#8B5CF6', icon: FileText },
  ],
  PUR: [
    { label: '발주 등록', link: '/purchase', color: '#8B5CF6', icon: Plus },
    { label: '수입검사', link: '/purchase', color: '#F59E0B', icon: ShieldCheck },
    { label: 'NCR 등록', link: '/quality', color: '#EF4444', icon: AlertTriangle },
  ],
  QUA: [
    { label: 'NCR 등록', link: '/quality', color: '#EF4444', icon: Plus },
    { label: 'CAPA 처리', link: '/quality', color: '#F59E0B', icon: CheckCircle2 },
    { label: '감사 CAR', link: '/audit', color: '#8B5CF6', icon: Search },
    { label: '개선 등록', link: '/improvement', color: '#10B981', icon: TrendingUp },
  ],
  EQP: [
    { label: '설비 현황', link: '/equipment', color: '#6366F1', icon: Target },
    { label: '교정 기록', link: '/equipment', color: '#F59E0B', icon: Calendar },
    { label: 'NCR 등록', link: '/quality', color: '#EF4444', icon: AlertTriangle },
  ],
  DEV: [
    { label: '설계 문서', link: '/development', color: '#EC4899', icon: FileText },
    { label: '규격 조회', link: '/products', color: '#8B5CF6', icon: Target },
    { label: '인허가', link: '/regulatory', color: '#84CC16', icon: CheckCircle2 },
  ],
  DOC: [
    { label: '문서 조회', link: '/documents', color: '#14B8A6', icon: FileText },
    { label: 'NCR 확인', link: '/quality', color: '#EF4444', icon: AlertTriangle },
  ],
  MR: [
    { label: '경영검토', link: '/management-review', color: '#F97316', icon: BarChart2 },
    { label: '품질 현황', link: '/quality', color: '#EF4444', icon: ShieldCheck },
    { label: '개선 승인', link: '/improvement', color: '#10B981', icon: CheckCircle2 },
    { label: '감사 결과', link: '/audit', color: '#8B5CF6', icon: Search },
  ],
  TRN: [
    { label: '교육 현황', link: '/training', color: '#06B6D4', icon: Users },
    { label: '문서 조회', link: '/documents', color: '#6B7280', icon: FileText },
  ],
  RA: [
    { label: '인허가 현황', link: '/regulatory', color: '#84CC16', icon: FileText },
    { label: 'NCR 확인', link: '/quality', color: '#EF4444', icon: AlertTriangle },
    { label: '품질 트리', link: '/tree', color: '#6B7280', icon: Target },
  ],
  AUD: [
    { label: '감사 등록', link: '/audit', color: '#EF4444', icon: Plus },
    { label: 'CAR 발행', link: '/audit', color: '#F59E0B', icon: AlertTriangle },
    { label: '품질 기록', link: '/quality', color: '#6B7280', icon: FileText },
  ],
  IMP: [
    { label: '과제 등록', link: '/improvement', color: '#6366F1', icon: Plus },
    { label: 'KPI 현황', link: '/improvement', color: '#22D3EE', icon: BarChart2 },
    { label: 'NCR 확인', link: '/quality', color: '#EF4444', icon: AlertTriangle },
  ],
  ALL: [
    { label: 'NCR 등록', link: '/quality', color: '#EF4444', icon: Plus },
    { label: '작업지시', link: '/operations', color: '#3B82F6', icon: Workflow },
    { label: '개선 등록', link: '/improvement', color: '#10B981', icon: TrendingUp },
    { label: '내부감사', link: '/audit', color: '#8B5CF6', icon: Search },
  ],
}

// ── 부서별 업무 흐름 가이드 ───────────────────────────────
const WORKFLOW_GUIDES = {
  SAL: ['수주 접수', '계약·사양 확인', '생산 발주', '납기 관리', '납품·AS'],
  MFG: ['작업지시 수신', '자재 투입', '공정 가공', '공정 검사', '완제품 출하'],
  PUR: ['구매 요청 접수', '공급업체 선정', '발주 등록', '납품·수입검사', '대금 처리'],
  QUA: ['수입검사', '공정 감시', '부적합 처리(NCR)', 'CAPA 실시', '내부감사'],
  EQP: ['설비 현황 파악', '예방 보전', '고장 처리', '교정 실시', '이력 기록'],
  DEV: ['고객 요구사항', '설계 입력', '설계 검토', '설계 검증/밸리데이션', '설계 이관'],
  DOC: ['문서 등록 요청', '검토·승인', '배포·관리', '개정 이력', '기록 보관'],
  MR: ['품질 데이터 수집', '경영검토 계획', '검토 회의', '개선 지시', '실행 추적'],
  TRN: ['교육 계획', '교육 실시', '역량 평가', '기록 보관', '효과 검증'],
  RA: ['규제 분석', '허가 신청', '심사 대응', '변경 관리', '사후 관리'],
  AUD: ['감사 계획', '예비 검토', '감사 실시', 'CAR 발행', '시정조치 추적'],
  IMP: ['개선 발굴', '아이디어 등록', '승인·착수', '실행·검증', '효과 보고'],
  ALL: ['수주', '생산', '검사', 'NCR/CAPA', '경영검토'],
}

// ── 메인 컴포넌트 ─────────────────────────────────────────
export default function DeptHome() {
  const nav = useNavigate()
  const user = auth.current()
  const [dept, setDept] = useState(() => deptAuth.getDepartment() || 'ALL')
  const [, forceRefresh] = useState(0)
  const [now, setNow] = useState(new Date())

  // 부서 변경 이벤트 수신
  useEffect(() => {
    const handler = (e) => { if (e.detail) setDept(e.detail) }
    window.addEventListener('qt-dept-changed', handler)
    return () => window.removeEventListener('qt-dept-changed', handler)
  }, [])

  // 1분마다 시계 갱신
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  const deptInfo = DEPT_LIST.find(d => d.code === dept)
  const tasks = useMemo(() => getMyTasks(dept), [dept])
  const kpis = useMemo(() => getDeptKPIs(dept), [dept])
  const quickActions = QUICK_ACTIONS[dept] || QUICK_ACTIONS['ALL']
  const workflow = WORKFLOW_GUIDES[dept] || WORKFLOW_GUIDES['ALL']

  // 기존 홈(Dashboard.jsx)의 핵심 콘텐츠 — 전사 GMP/RA 준수 현황 요약.
  // 상세 12개 카드 그리드는 /dashboard 에서 그대로 볼 수 있고, 여기서는 요약만 보여준다.
  const gmpCtx = useMemo(() => { try { return loadContext() } catch { return null } }, [])
  const gmpCards = useMemo(() => { try { return gmpCtx ? computeAllCards(gmpCtx) : [] } catch { return [] } }, [gmpCtx])
  const gmpScore = useMemo(() => { try { return gmpCards.length ? computeOverallScore(gmpCards) : null } catch { return null } }, [gmpCards])
  const activeCerts = gmpCtx ? Object.entries(gmpCtx.certifications || {}).filter(([, v]) => v).map(([k]) => k) : []

  const dateStr = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
  const timeStr = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })

  return (
    <AppLayout user={user} title={`${deptInfo?.label || dept} 대시보드`} subtitle="내 할 일 · 알림 · KPI 요약">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto space-y-6">

        {/* 인사 배너 */}
        <div
          className="relative overflow-hidden rounded-2xl p-6"
          style={{
            background: deptInfo ? `linear-gradient(135deg, ${deptInfo.color}18 0%, ${deptInfo.color}08 100%)` : 'var(--bg-card)',
            border: deptInfo ? `1px solid ${deptInfo.color}30` : '1px solid var(--line)',
          }}
        >
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span style={{ fontSize: 28 }}>{deptInfo?.icon || '🏢'}</span>
                <div>
                  <div className="text-[20px] font-bold" style={{ color: 'var(--ink)' }}>
                    안녕하세요, {user?.name || '사용자'}님
                  </div>
                  <div className="text-[13px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
                    {user?.company?.name || 'Qualytree'} · {deptInfo?.label || dept}
                  </div>
                </div>
              </div>
              <div className="mt-3 text-[13px]" style={{ color: 'var(--ink-soft)' }}>
                {tasks.length > 0
                  ? `오늘 처리할 업무가 <strong>${tasks.length}건</strong> 있습니다.`
                  : '오늘은 처리할 긴급 업무가 없습니다. 수고하셨습니다! 🎉'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[20px] font-bold tabular-nums" style={{ color: 'var(--ink)' }}>{timeStr}</div>
              <div className="text-[12px] mt-1" style={{ color: 'var(--ink-faint)' }}>{dateStr}</div>
              <button
                onClick={() => forceRefresh(t => t + 1)}
                className="mt-2 flex items-center gap-1 text-[11px] ml-auto"
                style={{ color: 'var(--ink-faint)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <RefreshCw size={11} /> 새로고침
              </button>
            </div>
          </div>
        </div>

        {/* KPI 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map((kpi, i) => (
            <button
              key={i}
              onClick={() => nav(kpi.link)}
              className="p-4 rounded-2xl text-left transition hover:scale-[1.02]"
              style={{
                background: 'var(--bg-card)',
                border: `1px solid var(--line)`,
                cursor: 'pointer',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>{kpi.label}</span>
                <kpi.icon size={15} style={{ color: kpi.color }} />
              </div>
              <div className="text-[26px] font-bold" style={{ color: kpi.value === '—' ? 'var(--ink-faint)' : kpi.color }}>
                {kpi.value}
              </div>
              {kpi.hint && (
                <div className="text-[10px] mt-1" style={{ color: 'var(--ink-faint)' }}>Supabase 연동 후 자동 집계</div>
              )}
            </button>
          ))}
        </div>

        {/* 메인 2열 레이아웃 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* 내 할 일 (2/3) */}
          <div className="lg:col-span-2">
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}
            >
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
                <div className="flex items-center gap-2">
                  <Bell size={16} style={{ color: 'var(--ink-soft)' }} />
                  <span className="font-semibold text-[14px]" style={{ color: 'var(--ink)' }}>내 할 일</span>
                  {tasks.length > 0 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-bold" style={{ background: '#EF4444', color: '#fff' }}>
                      {tasks.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => nav('/quality')}
                  className="text-[12px] flex items-center gap-1"
                  style={{ color: 'var(--ink-faint)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  전체 보기 <ChevronRight size={13} />
                </button>
              </div>

              {tasks.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <CheckCircle2 size={32} style={{ color: '#10B981', opacity: 0.5, marginBottom: 8 }} />
                  <div className="text-[14px] font-medium" style={{ color: 'var(--ink-soft)' }}>모든 업무 처리 완료</div>
                  <div className="text-[12px] mt-1" style={{ color: 'var(--ink-faint)' }}>새로 발생한 업무가 여기에 표시됩니다</div>
                </div>
              ) : (
                <div className="divide-y" style={{ '--tw-divide-opacity': 1, borderColor: 'var(--line)' }}>
                  {tasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => nav(task.link)}
                      className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-opacity-50 transition"
                      style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-soft)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: task.urgent ? '#EF4444' : task.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {task.urgent && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: '#EF444420', color: '#EF4444' }}>
                              긴급
                            </span>
                          )}
                          <span className="text-[13.5px] font-medium truncate" style={{ color: 'var(--ink)' }}>
                            {task.label}
                          </span>
                        </div>
                        <div className="text-[11.5px] mt-0.5 truncate" style={{ color: 'var(--ink-faint)' }}>
                          {task.sub}
                        </div>
                      </div>
                      <ChevronRight size={14} style={{ color: 'var(--ink-faint)', flexShrink: 0 }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 사이드: 빠른 실행 + 흐름 가이드 (1/3) */}
          <div className="space-y-4">
            {/* 빠른 실행 */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}
            >
              <div className="px-4 py-3.5 flex items-center gap-2" style={{ borderBottom: '1px solid var(--line)' }}>
                <Zap size={15} style={{ color: 'var(--ink-soft)' }} />
                <span className="font-semibold text-[13.5px]" style={{ color: 'var(--ink)' }}>빠른 실행</span>
              </div>
              <div className="p-3 space-y-2">
                {quickActions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => nav(action.link)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition"
                    style={{
                      background: `${action.color}10`,
                      border: `1px solid ${action.color}25`,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = `${action.color}20`}
                    onMouseLeave={e => e.currentTarget.style.background = `${action.color}10`}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${action.color}20` }}
                    >
                      <action.icon size={14} style={{ color: action.color }} />
                    </div>
                    <span className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{action.label}</span>
                    <ArrowRight size={12} style={{ color: 'var(--ink-faint)', marginLeft: 'auto' }} />
                  </button>
                ))}
              </div>
            </div>

            {/* 업무 흐름 가이드 */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}
            >
              <div className="px-4 py-3.5 flex items-center gap-2" style={{ borderBottom: '1px solid var(--line)' }}>
                <Workflow size={15} style={{ color: 'var(--ink-soft)' }} />
                <span className="font-semibold text-[13.5px]" style={{ color: 'var(--ink)' }}>업무 흐름</span>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  {workflow.map((step, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                        style={{
                          background: deptInfo ? `${deptInfo.color}20` : 'var(--bg-soft)',
                          color: deptInfo?.color || 'var(--ink-faint)',
                        }}
                      >
                        {i + 1}
                      </div>
                      <span className="text-[12.5px]" style={{ color: 'var(--ink-soft)' }}>{step}</span>
                      {i < workflow.length - 1 && (
                        <div className="ml-auto">
                          <ChevronRight size={11} style={{ color: 'var(--ink-faint)' }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* GMP·RA 전사 준수 현황 — 상단 KPI 카드와 같은 '현황' 스타일, 왼쪽 정렬 (영역별 상세는 숨김) */}
        {gmpCtx && gmpCards.length > 0 && (
          <div className="flex justify-start pt-1 pb-2">
            <button
              onClick={() => nav('/dashboard')}
              className="p-4 rounded-2xl text-left transition hover:scale-[1.02]"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', cursor: 'pointer', minWidth: 180 }}
            >
              <div className="flex items-center justify-between gap-6 mb-2">
                <span className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>GMP 대시보드</span>
                <ShieldCheck size={15} style={{ color: gmpScore >= 90 ? 'var(--moss)' : gmpScore >= 70 ? 'var(--amber)' : 'var(--rust)' }} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[26px] font-bold tabular-nums" style={{ color: gmpScore >= 90 ? 'var(--moss)' : gmpScore >= 70 ? 'var(--amber)' : 'var(--rust)' }}>{gmpScore}%</span>
                <span className="text-[11px] flex items-center gap-0.5" style={{ color: 'var(--ink-faint)' }}>전체 보기 <ChevronRight size={11} /></span>
              </div>
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
