// src/pages/flow/ProcessFlow.jsx
// 프로세스 흐름 가시화 — 현재 허브 데이터 연동 버전 (10개 흐름)
import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight, RefreshCw, AlertTriangle, CheckCircle2,
  Clock, Circle, ArrowRight, Zap, Users, BarChart2,
  Package, ShoppingCart, Wrench, FileText, Shield,
  TrendingUp, Activity, Search, Star, Building2,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'

// localStorage 헬퍼
const ls = (key) => {
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}
const count = (key) => ls(key).length

// 10개 흐름 정의
const FLOWS = [
  {
    id: 'order-to-ship',
    label: '수주 → 출하',
    icon: Package,
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
    description: '수주접수부터 제품 출하까지 전체 생산 흐름',
    lanes: ['영업', '생산', '품질', '출하'],
    stages: [
      { id: 's1', name: '견적·수주', lane: '영업', lsKey: 'qms_sal_quotes', route: '/sales', desc: '고객 견적 발행 및 주문 접수' },
      { id: 's2', name: '계약확정', lane: '영업', lsKey: 'qms_sal_orders', route: '/sales', desc: '계약 조건 검토 및 확정' },
      { id: 's3', name: '생산오더', lane: '생산', lsKey: 'qms_sal_prodreqs', route: '/manufacturing', desc: '생산 계획 수립 및 작업지시' },
      { id: 's4', name: '공정진행', lane: '생산', lsKey: 'qms_mfg_wo', route: '/manufacturing', desc: '제조 공정 진행 및 기록' },
      { id: 's5', name: '최종검사', lane: '품질', lsKey: 'qms_mfg_proc', route: '/inspection', desc: '최종 품질 검사 및 승인' },
      { id: 's6', name: '출하', lane: '출하', lsKey: 'qms_sal_deliveries', route: '/sales', desc: '제품 출하 및 추적성 기록' },
    ],
  },
  {
    id: 'purchase-iqc',
    label: '구매 · 수입검사',
    icon: ShoppingCart,
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    description: '구매 요청부터 자재 창고 입고까지',
    lanes: ['구매', '공급업체', '품질(IQC)', '창고'],
    stages: [
      { id: 'p1', name: '구매요청', lane: '구매', lsKey: 'qms_pur_orders', route: '/purchase', desc: '소요 자재 구매 요청' },
      { id: 'p2', name: '공급업체 선정', lane: '공급업체', lsKey: 'qms_pur_avl', route: '/supplier', desc: '승인 업체 목록에서 선정' },
      { id: 'p3', name: '발주', lane: '구매', lsKey: 'qms_pur_orders', route: '/purchase', desc: '발주서 발행 및 전달' },
      { id: 'p4', name: '납품', lane: '공급업체', lsKey: 'qms_pur_iqc', route: '/purchase-verification', desc: '자재 납품 및 인수' },
      { id: 'p5', name: '수입검사', lane: '품질(IQC)', lsKey: 'qms_pur_iqc', route: '/purchase-verification', desc: '입고 수입 품질 검사' },
      { id: 'p6', name: '창고 입고', lane: '창고', lsKey: 'qms_pur_inventory', route: '/purchase', desc: '검사 합격 후 재고 등록' },
    ],
  },
  {
    id: 'quality-capa',
    label: '품질 · 불만 · CAPA',
    icon: Shield,
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
    description: '고객불만 접수부터 CAPA 종결까지',
    lanes: ['영업(접수)', '품질', 'CAPA 담당', '경영'],
    stages: [
      { id: 'q1', name: '불만 접수', lane: '영업(접수)', lsKey: 'qualytree.complaints', route: '/complaint', desc: '고객 불만 접수 및 초기 기록' },
      { id: 'q2', name: '조사·분류', lane: '품질', lsKey: null, route: '/complaint', desc: '불만 내용 조사 및 NCR 여부 판단' },
      { id: 'q3', name: 'NCR 등록', lane: '품질', lsKey: null, route: '/quality', desc: '부적합 보고서 등록' },
      { id: 'q4', name: 'CAPA 수립', lane: 'CAPA 담당', lsKey: null, route: '/improvement', desc: '원인 분석 및 시정 조치 계획' },
      { id: 'q5', name: '조치 실행', lane: 'CAPA 담당', lsKey: null, route: '/improvement', desc: '시정 예방 조치 실행' },
      { id: 'q6', name: '효과성 검증', lane: '품질', lsKey: null, route: '/improvement', desc: '조치 효과성 확인 및 종결' },
    ],
  },
  {
    id: 'internal-audit',
    label: '내부감사',
    icon: Search,
    color: '#0891b2',
    bg: '#ecfeff',
    border: '#a5f3fc',
    description: '내부감사 계획부터 경영검토까지',
    lanes: ['품질(감사팀)', '피감사부서', 'CAPA 담당', '경영'],
    stages: [
      { id: 'a1', name: '감사 계획', lane: '품질(감사팀)', lsKey: null, route: '/audit', desc: '연간 내부감사 계획 수립' },
      { id: 'a2', name: '감사 실시', lane: '품질(감사팀)', lsKey: null, route: '/audit', desc: '체크리스트 기반 감사 진행' },
      { id: 'a3', name: '부적합 발견', lane: '피감사부서', lsKey: null, route: '/audit', desc: '감사 부적합 사항 기록' },
      { id: 'a4', name: '시정 조치', lane: 'CAPA 담당', lsKey: null, route: '/improvement', desc: '부적합 원인 분석 및 조치' },
      { id: 'a5', name: '효과성 확인', lane: '품질(감사팀)', lsKey: null, route: '/improvement', desc: '조치 결과 검증' },
      { id: 'a6', name: '경영검토 보고', lane: '경영', lsKey: null, route: '/mreview', desc: '감사 결과 경영검토 반영' },
    ],
  },
  {
    id: 'improvement',
    label: '개선활동 · CAPA',
    icon: TrendingUp,
    color: '#059669',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    description: '개선 기회 발굴부터 효과 검증까지',
    lanes: ['발생부서', '품질', '담당부서', '경영(보고)'],
    stages: [
      { id: 'i1', name: '개선기회 발굴', lane: '발생부서', lsKey: null, route: '/improvement', desc: '개선 필요 사항 발굴 및 등록' },
      { id: 'i2', name: '원인 분석', lane: '품질', lsKey: null, route: '/improvement', desc: '근본 원인 분석 (5-Why, FTA 등)' },
      { id: 'i3', name: '조치 계획', lane: '담당부서', lsKey: null, route: '/improvement', desc: '조치 계획 수립 및 일정 확정' },
      { id: 'i4', name: '조치 실행', lane: '담당부서', lsKey: null, route: '/improvement', desc: '개선 조치 실행' },
      { id: 'i5', name: '효과성 검증', lane: '품질', lsKey: null, route: '/improvement', desc: '조치 효과 확인 및 재발방지 검증' },
      { id: 'i6', name: '경영보고', lane: '경영(보고)', lsKey: null, route: '/mreview', desc: '개선 실적 경영 보고' },
    ],
  },
  {
    id: 'change-control',
    label: '변경관리',
    icon: RefreshCw,
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    description: '변경 요청부터 문서 업데이트 완료까지',
    lanes: ['요청부서', '품질(검토)', '경영(승인)', '문서관리'],
    stages: [
      { id: 'c1', name: '변경 요청', lane: '요청부서', lsKey: null, route: '/change', desc: '변경 필요 사항 요청서 작성' },
      { id: 'c2', name: '영향 평가', lane: '품질(검토)', lsKey: null, route: '/change', desc: '변경이 품질·안전에 미치는 영향 평가' },
      { id: 'c3', name: '검토·승인', lane: '경영(승인)', lsKey: null, route: '/change', desc: '변경 내용 검토 및 경영 승인' },
      { id: 'c4', name: '변경 실행', lane: '요청부서', lsKey: null, route: '/change', desc: '승인된 변경 사항 실행' },
      { id: 'c5', name: '검증', lane: '품질(검토)', lsKey: null, route: '/change', desc: '변경 후 요구사항 충족 검증' },
      { id: 'c6', name: '문서 업데이트', lane: '문서관리', lsKey: null, route: '/doc-control', desc: '관련 문서·SOP 개정 및 배포' },
    ],
  },
  {
    id: 'design-dev',
    label: '설계개발',
    icon: Zap,
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    description: '설계 입력부터 DHF 완성까지 (ISO 13485 §7.3)',
    lanes: ['개발팀', '품질(검토)', '경영(승인)', '문서(DHF)'],
    stages: [
      { id: 'd1', name: '설계 입력', lane: '개발팀', lsKey: null, route: '/development', desc: '고객 요구사항 기반 설계 입력 정의' },
      { id: 'd2', name: '설계 진행', lane: '개발팀', lsKey: null, route: '/development', desc: '설계·개발 단계별 진행' },
      { id: 'd3', name: '설계 검토', lane: '품질(검토)', lsKey: null, route: '/development', desc: '단계별 설계 검토 회의' },
      { id: 'd4', name: '설계 검증', lane: '개발팀', lsKey: null, route: '/development', desc: '시제품 검증 시험' },
      { id: 'd5', name: '유효성 확인', lane: '품질(검토)', lsKey: null, route: '/development', desc: '최종 용도 충족 유효성 확인' },
      { id: 'd6', name: 'DHF 완성', lane: '문서(DHF)', lsKey: null, route: '/dhf', desc: '설계 이력 파일 최종 완성' },
    ],
  },
  {
    id: 'import-gmp',
    label: '수입 GMP',
    icon: Building2,
    color: '#0e7490',
    bg: '#ecfeff',
    border: '#a5f3fc',
    description: '외국제조소 등록부터 이상사례 보고까지',
    lanes: ['수입 담당', '품질(검사)', '규제(인허가)', '이상사례'],
    stages: [
      { id: 'g1', name: '외국제조소 등록', lane: '규제(인허가)', lsKey: null, route: '/importgmp', desc: '식약처 외국제조소 등록 신청' },
      { id: 'g2', name: '품목 허가', lane: '규제(인허가)', lsKey: null, route: '/importgmp', desc: '수입 의료기기 품목 허가 취득' },
      { id: 'g3', name: '수입 통관', lane: '수입 담당', lsKey: null, route: '/importgmp', desc: '세관 통관 및 식약처 신고' },
      { id: 'g4', name: '수입검사(IQC)', lane: '품질(검사)', lsKey: null, route: '/purchase-verification', desc: '수입 자재 품질 검사' },
      { id: 'g5', name: '재고 등록', lane: '수입 담당', lsKey: null, route: '/importgmp', desc: '합격 제품 재고 등록' },
      { id: 'g6', name: '이상사례 보고', lane: '이상사례', lsKey: null, route: '/importgmp', desc: 'MDR·이상사례 식약처 보고' },
    ],
  },
  {
    id: 'regulatory',
    label: '인허가',
    icon: FileText,
    color: '#be185d',
    bg: '#fdf2f8',
    border: '#fbcfe8',
    description: '기술문서 준비부터 인허가 유지·갱신까지',
    lanes: ['개발팀', '품질(문서)', '규제(신청)', '경영'],
    stages: [
      { id: 'r1', name: '기술문서 준비', lane: '개발팀', lsKey: null, route: '/regulatory', desc: '기술문서·임상 자료 준비' },
      { id: 'r2', name: '인허가 신청', lane: '규제(신청)', lsKey: null, route: '/regulatory', desc: '식약처 품목 허가·신고 신청' },
      { id: 'r3', name: 'GMP 심사', lane: '품질(문서)', lsKey: null, route: '/regulatory', desc: 'GMP 적합성 조사 대응' },
      { id: 'r4', name: '허가 취득', lane: '규제(신청)', lsKey: null, route: '/regulatory', desc: '품목 허가증 취득' },
      { id: 'r5', name: '변경 허가', lane: '규제(신청)', lsKey: null, route: '/regulatory', desc: '허가 사항 변경 신고·허가' },
      { id: 'r6', name: '갱신·유지', lane: '경영', lsKey: null, route: '/regulatory', desc: '허가 갱신 및 사후 관리' },
    ],
  },
  {
    id: 'mgmt-review',
    label: '경영검토',
    icon: Star,
    color: '#4f46e5',
    bg: '#eef2ff',
    border: '#c7d2fe',
    description: '데이터 수집부터 경영검토 실행 및 목표 수립까지',
    lanes: ['각 부서', '품질(분석)', '경영(검토)', '전 부서(이행)'],
    stages: [
      { id: 'm1', name: '데이터 수집', lane: '각 부서', lsKey: null, route: '/quality-dashboard', desc: 'KPI·품질 데이터 취합' },
      { id: 'm2', name: 'KPI 분석', lane: '품질(분석)', lsKey: null, route: '/quality-dashboard', desc: '성과 지표 분석 및 보고서 작성' },
      { id: 'm3', name: '자원 검토', lane: '경영(검토)', lsKey: null, route: '/resource-plan', desc: '인력·설비·예산 적절성 검토' },
      { id: 'm4', name: '경영검토 회의', lane: '경영(검토)', lsKey: null, route: '/mreview', desc: '경영진 주관 품질검토 회의' },
      { id: 'm5', name: '목표 수립', lane: '경영(검토)', lsKey: null, route: '/quality-objectives', desc: '차기 품질 목표 및 방침 수립' },
      { id: 'm6', name: '실행 계획', lane: '전 부서(이행)', lsKey: null, route: '/improvement', desc: '목표 달성 실행 계획 수립·이행' },
    ],
  },
]

const STATUS_COLORS = {
  active: { bg: '#dcfce7', text: '#166534', border: '#86efac', label: '진행중' },
  pending: { bg: '#fef9c3', text: '#713f12', border: '#fde047', label: '대기' },
  empty: { bg: '#f8fafc', text: '#94a3b8', border: '#e2e8f0', label: '데이터 없음' },
}

function getStageStatus(stage) {
  if (!stage.lsKey) return 'empty'
  const n = count(stage.lsKey)
  if (n === 0) return 'empty'
  return 'active'
}

function SwimlaneView({ flow, navigate }) {
  const stagesByLane = useMemo(() => {
    const map = {}
    flow.lanes.forEach(l => { map[l] = [] })
    flow.stages.forEach(s => { if (map[s.lane]) map[s.lane].push(s) })
    return map
  }, [flow])

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: 0 }}>
        <div style={{ width: 120, minWidth: 120, padding: '8px 12px', fontWeight: 700, fontSize: 12, color: '#64748b', borderRight: '1px solid #e2e8f0' }}>담당</div>
        {flow.stages.map((s, i) => (
          <div key={s.id} style={{ flex: 1, minWidth: 120, padding: '8px 4px', textAlign: 'center', fontWeight: 700, fontSize: 11, color: '#475569', borderRight: i < flow.stages.length - 1 ? '1px dashed #e2e8f0' : 'none' }}>
            <span style={{ background: flow.bg, color: flow.color, border: `1px solid ${flow.border}`, borderRadius: 9999, padding: '2px 8px', display: 'inline-block' }}>{i + 1}</span>
            <div style={{ marginTop: 4 }}>{s.name}</div>
          </div>
        ))}
      </div>
      {flow.lanes.map((lane, li) => (
        <div key={lane} style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', minHeight: 80 }}>
          <div style={{ width: 120, minWidth: 120, padding: '12px', fontWeight: 600, fontSize: 12, color: '#334155', borderRight: '1px solid #e2e8f0', background: li % 2 === 0 ? '#f8fafc' : '#fff', display: 'flex', alignItems: 'center' }}>
            <Users size={12} style={{ marginRight: 4, color: '#94a3b8' }} />{lane}
          </div>
          {flow.stages.map((stage, si) => {
            const belongsHere = stage.lane === lane
            const status = belongsHere ? getStageStatus(stage) : null
            const sc = status ? STATUS_COLORS[status] : null
            const cnt = stage.lsKey ? count(stage.lsKey) : null
            return (
              <div key={stage.id} style={{ flex: 1, minWidth: 120, padding: 8, borderRight: si < flow.stages.length - 1 ? '1px dashed #f1f5f9' : 'none', background: li % 2 === 0 ? '#f8fafc' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {belongsHere ? (
                  <button onClick={() => navigate(stage.route)} title={stage.desc}
                    style={{ width: '100%', padding: '8px 6px', borderRadius: 8, cursor: 'pointer', border: `1.5px solid ${sc.border}`, background: sc.bg, color: sc.text, fontSize: 11, fontWeight: 600, textAlign: 'center', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
                    <div>{stage.name}</div>
                    {cnt !== null ? <div style={{ marginTop: 4, fontSize: 18, fontWeight: 800 }}>{cnt}</div> : <div style={{ marginTop: 4, fontSize: 10, color: '#94a3b8' }}>바로가기 →</div>}
                  </button>
                ) : <div style={{ width: '100%', height: 4, background: '#f1f5f9', borderRadius: 2 }} />}
              </div>
            )
          })}
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 0 4px 132px', gap: 0 }}>
        {flow.stages.map((s, i) => (
          <React.Fragment key={s.id}>
            <div style={{ flex: 1, minWidth: 120, textAlign: 'center', fontSize: 10, color: '#94a3b8' }}>{i + 1}. {s.name}</div>
            {i < flow.stages.length - 1 && <ArrowRight size={12} color={flow.color} style={{ flexShrink: 0 }} />}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

function KanbanView({ flow, navigate }) {
  return (
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
      {flow.stages.map((stage, i) => {
        const status = getStageStatus(stage)
        const sc = STATUS_COLORS[status]
        const cnt = stage.lsKey ? count(stage.lsKey) : null
        return (
          <div key={stage.id} style={{ minWidth: 160, flex: 1 }}>
            <div style={{ background: flow.bg, border: `1px solid ${flow.border}`, borderRadius: '8px 8px 0 0', padding: '8px 10px', fontWeight: 700, fontSize: 12, color: flow.color, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{i + 1}. {stage.name}</span>
              {cnt !== null && <span style={{ background: flow.color, color: '#fff', borderRadius: 9999, padding: '1px 7px', fontSize: 11, fontWeight: 800 }}>{cnt}</span>}
            </div>
            <button onClick={() => navigate(stage.route)}
              style={{ width: '100%', border: `1px solid ${sc.border}`, borderTop: 'none', borderRadius: '0 0 8px 8px', background: sc.bg, padding: 12, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 3px 10px rgba(0,0,0,0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '' }}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}><Users size={10} style={{ marginRight: 3, verticalAlign: 'middle' }} />{stage.lane}</div>
              <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.4 }}>{stage.desc}</div>
              <div style={{ marginTop: 8, fontSize: 10, color: flow.color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}><ChevronRight size={10} />허브 바로가기</div>
            </button>
          </div>
        )
      })}
    </div>
  )
}

function SummaryView({ flow, navigate }) {
  const total = flow.stages.reduce((acc, s) => acc + (s.lsKey ? count(s.lsKey) : 0), 0)
  const activeStages = flow.stages.filter(s => s.lsKey && count(s.lsKey) > 0)
  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {[
          { label: '전체 데이터', value: total, icon: BarChart2, color: flow.color },
          { label: '데이터 있는 단계', value: activeStages.length, icon: CheckCircle2, color: '#059669' },
          { label: '전체 단계', value: flow.stages.length, icon: Circle, color: '#64748b' },
        ].map(card => (
          <div key={card.label} style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <card.icon size={24} color={card.color} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: card.color }}>{card.value}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {flow.stages.map((stage, i) => {
          const status = getStageStatus(stage)
          const sc = STATUS_COLORS[status]
          const cnt = stage.lsKey ? count(stage.lsKey) : null
          return (
            <button key={stage.id} onClick={() => navigate(stage.route)}
              style={{ border: `1.5px solid ${sc.border}`, borderRadius: 10, background: sc.bg, padding: 14, textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 3px 10px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <span style={{ background: flow.bg, color: flow.color, border: `1px solid ${flow.border}`, borderRadius: 9999, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>단계 {i + 1}</span>
                {cnt !== null && <span style={{ fontSize: 18, fontWeight: 800, color: sc.text }}>{cnt}</span>}
              </div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', marginBottom: 3 }}>{stage.name}</div>
              <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>{stage.desc}</div>
              <div style={{ marginTop: 6, fontSize: 10, color: '#94a3b8' }}><Users size={9} style={{ marginRight: 2, verticalAlign: 'middle' }} />{stage.lane}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function ProcessFlow() {
  const navigate = useNavigate()
  const [selectedFlow, setSelectedFlow] = useState(FLOWS[0].id)
  const [viewMode, setViewMode] = useState('swimlane')
  const [, forceUpdate] = useState(0)
  const flow = FLOWS.find(f => f.id === selectedFlow) || FLOWS[0]
  const refresh = () => forceUpdate(n => n + 1)

  return (
    <AppLayout>
      <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>
              <Activity size={20} style={{ marginRight: 8, verticalAlign: 'middle', color: '#2563eb' }} />
              프로세스 흐름 현황
            </h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
              업무 흐름별 현황 추적 · 허브 바로가기 · 10개 주요 프로세스
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {[
              { id: 'swimlane', label: '스윔레인', icon: Users },
              { id: 'kanban', label: '칸반', icon: BarChart2 },
              { id: 'summary', label: '요약', icon: Activity },
            ].map(v => (
              <button key={v.id} onClick={() => setViewMode(v.id)} style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: viewMode === v.id ? `1.5px solid ${flow.color}` : '1.5px solid #e2e8f0',
                background: viewMode === v.id ? flow.bg : '#fff',
                color: viewMode === v.id ? flow.color : '#64748b',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <v.icon size={13} />{v.label}
              </button>
            ))}
            <button onClick={refresh} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
              <RefreshCw size={13} />새로고침
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {FLOWS.map(f => {
            const active = f.id === selectedFlow
            return (
              <button key={f.id} onClick={() => setSelectedFlow(f.id)} style={{
                padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 12,
                fontWeight: active ? 700 : 500, display: 'flex', alignItems: 'center', gap: 6,
                border: active ? `2px solid ${f.color}` : '1.5px solid #e2e8f0',
                background: active ? f.bg : '#fff',
                color: active ? f.color : '#475569',
                boxShadow: active ? `0 2px 8px ${f.color}30` : 'none',
                transition: 'all 0.15s',
              }}>
                <f.icon size={14} />{f.label}
              </button>
            )
          })}
        </div>

        <div style={{ background: flow.bg, border: `1.5px solid ${flow.border}`, borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <flow.icon size={20} color={flow.color} />
          <div>
            <span style={{ fontWeight: 700, fontSize: 14, color: flow.color }}>{flow.label}</span>
            <span style={{ fontSize: 12, color: '#64748b', marginLeft: 10 }}>{flow.description}</span>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
          {viewMode === 'swimlane' && <SwimlaneView flow={flow} navigate={navigate} />}
          {viewMode === 'kanban' && <KanbanView flow={flow} navigate={navigate} />}
          {viewMode === 'summary' && <SummaryView flow={flow} navigate={navigate} />}
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>범례:</span>
          {Object.entries(STATUS_COLORS).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: v.bg, border: `1.5px solid ${v.border}` }} />
              <span style={{ fontSize: 11, color: '#64748b' }}>{v.label}</span>
            </div>
          ))}
          <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>숫자 = 해당 허브의 현재 등록 건수 (클릭 시 허브로 이동)</span>
        </div>
      </div>
    </AppLayout>
  )
}
