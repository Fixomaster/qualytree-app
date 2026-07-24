// src/pages/flow/ProcessFlow.jsx
// 프로세스 흐름 가시화 — 부서 간 업무 흐름 + 진행 현황 추적 보드
import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight, RefreshCw, AlertTriangle, CheckCircle2,
  Clock, Circle, ArrowRight, Zap, Users, BarChart2,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'

// ── localStorage 읽기 ─────────────────────────────────────────
function lsRead(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const p = JSON.parse(raw)
    if (key === 'qualytree.operations' && p?.workOrders) return p.workOrders
    return Array.isArray(p) ? p : fallback
  } catch { return fallback }
}

// ── 프로세스 정의 ─────────────────────────────────────────────
// 각 프로세스는 swimlane 행(dept)과 열(stage)로 구성
const PROCESSES = [
  {
    id: 'production',
    label: '생산 오더 흐름',
    icon: '🏭',
    color: '#F59E0B',
    desc: '수주 → 생산발주 → 공정 → 검사 → 출하',
    lanes: [
      {
        dept: 'SAL', label: '영업', color: '#3B82F6', icon: '📊',
        stages: ['수주 접수', '계약 확정', '생산 발주'],
        link: '/sales',
      },
      {
        dept: 'MFG', label: '생산', color: '#F59E0B', icon: '🏭',
        stages: ['WO 발행', '자재 투입', '공정 생산', '생산 완료'],
        link: '/manufacturing',
      },
      {
        dept: 'QUA', label: '품질', color: '#10B981', icon: '🔍',
        stages: ['공정 검사', '최종 검사', '합격 판정'],
        link: '/quality',
      },
      {
        dept: 'SAL', label: '영업 (출하)', color: '#3B82F6', icon: '📦',
        stages: ['출하 준비', '납품 완료'],
        link: '/sales',
      },
    ],
    getCards: () => {
      const wos = lsRead('qualytree.operations')
      return wos.map(w => ({
        id: w.woId || w.id,
        title: w.productName || w.woId || '작업지시',
        sub: `Lot: ${w.lotNumber || '-'} · 수량: ${w.quantity || '-'}`,
        status: w.status,
        stage: w.status === 'pending' ? 1 : w.status === 'in_progress' ? 3 : w.status === 'completed' ? 6 : 7,
        urgent: w.priority === 'urgent',
        link: '/operations',
        color: w.status === 'completed' ? '#10B981' : w.status === 'in_progress' ? '#F59E0B' : '#6B7280',
      }))
    },
    stages: ['수주 접수', '계약 확정', 'WO 발행', '자재 투입', '공정 생산', '공정 검사', '최종 검사', '납품 완료'],
  },
  {
    id: 'purchase',
    label: '구매 · 수입검사 흐름',
    icon: '🛒',
    color: '#8B5CF6',
    desc: '구매요청 → 발주 → 입고 → 수입검사 → 불출',
    lanes: [
      {
        dept: 'SAL/MFG', label: '요청 부서', color: '#6B7280', icon: '📋',
        stages: ['구매 요청'],
        link: '/purchase',
      },
      {
        dept: 'PUR', label: '구매', color: '#8B5CF6', icon: '🛒',
        stages: ['공급업체 선정', '발주 등록', '납기 관리', '입고 확인'],
        link: '/purchase',
      },
      {
        dept: 'QUA', label: '품질 (수입검사)', color: '#10B981', icon: '🔍',
        stages: ['수입검사 실시', '합격 → 불출', '불합격 → NCR'],
        link: '/quality',
      },
    ],
    getCards: () => [],  // PUR 데이터는 Supabase 연동 후
    stages: ['구매 요청', '공급업체 선정', '발주 등록', '입고', '수입검사', '불출/반품'],
  },
  {
    id: 'quality',
    label: '품질 관리 흐름',
    icon: '🔍',
    color: '#10B981',
    desc: '부적합 발생 → NCR → 원인분석 → CAPA → 시정조치 → 종결',
    lanes: [
      {
        dept: 'ALL', label: '발생 부서', color: '#6B7280', icon: '⚠️',
        stages: ['부적합 발생'],
        link: '/quality',
      },
      {
        dept: 'QUA', label: '품질', color: '#10B981', icon: '🔍',
        stages: ['NCR 등록', '원인 분석', 'CAPA 발행', '시정조치 실시', '효과 검증', 'NCR 종결'],
        link: '/quality',
      },
      {
        dept: 'MR', label: '경영검토', color: '#F97316', icon: '👔',
        stages: ['데이터 분석', '경영검토 보고'],
        link: '/management-review',
      },
    ],
    getCards: () => {
      const ncrs = lsRead('qualytree.ncrs')
      const capas = lsRead('qualytree.capas')
      const ncr_cards = ncrs.map(n => ({
        id: n.id, title: `NCR · ${n.title || n.id}`,
        sub: `심각도: ${n.severity || '-'}`,
        status: n.status,
        stage: n.status === 'open' ? 1 : n.status === 'under_review' ? 2 : n.status === 'correcting' ? 4 : 6,
        urgent: n.severity === 'critical' || n.severity === 'major',
        link: '/quality',
        color: n.severity === 'critical' ? '#EF4444' : n.severity === 'major' ? '#F59E0B' : '#6B7280',
      }))
      return ncr_cards
    },
    stages: ['부적합 발생', 'NCR 등록', '원인분석', 'CAPA 발행', '시정조치', '효과검증', '종결'],
  },
  {
    id: 'improvement',
    label: '개선활동 흐름',
    icon: '📈',
    color: '#6366F1',
    desc: '아이디어 발굴 → 승인 → 실행 → 검증 → 완료 → 경영검토',
    lanes: [
      {
        dept: 'ALL', label: '전 부서', color: '#6B7280', icon: '💡',
        stages: ['아이디어 등록'],
        link: '/improvement',
      },
      {
        dept: 'MR', label: '경영검토', color: '#F97316', icon: '👔',
        stages: ['승인 검토', '승인'],
        link: '/improvement',
      },
      {
        dept: 'ALL', label: '담당 부서', color: '#6366F1', icon: '📈',
        stages: ['실행 착수', '실행 완료', '효과 검증'],
        link: '/improvement',
      },
      {
        dept: 'MR', label: '경영 (보고)', color: '#F97316', icon: '📊',
        stages: ['효과 보고', '과제 종결'],
        link: '/improvement',
      },
    ],
    getCards: () => {
      const imps = lsRead('qualytree.improvements')
      return imps.map(i => ({
        id: i.id, title: i.title || i.id,
        sub: `유형: ${i.type || '-'} · 담당: ${i.assignee || '-'}`,
        status: i.status,
        stage: i.status === 'idea' ? 0 : i.status === 'approved' ? 2 : i.status === 'in_progress' ? 3 : i.status === 'verify' ? 5 : 6,
        urgent: i.priority === 'high',
        link: '/improvement',
        color: i.status === 'done' ? '#10B981' : i.status === 'in_progress' ? '#6366F1' : '#6B7280',
      }))
    },
    stages: ['아이디어', '승인 대기', '승인됨', '실행 중', '완료', '효과검증', '종결'],
  },
  {
    id: 'audit',
    label: '내부감사 흐름',
    icon: '🔎',
    color: '#EF4444',
    desc: '감사 계획 → 실시 → 부적합 발견 → CAR → 시정조치 → 종결',
    lanes: [
      {
        dept: 'QUA/AUD', label: '품질 / 감사', color: '#EF4444', icon: '🔎',
        stages: ['감사 계획', '사전 검토', '감사 실시', 'CAR 발행'],
        link: '/audit',
      },
      {
        dept: 'ALL', label: '피감사 부서', color: '#6B7280', icon: '🏢',
        stages: ['시정조치 실시', '효과 검증'],
        link: '/audit',
      },
      {
        dept: 'QUA', label: '품질 (종결)', color: '#10B981', icon: '✅',
        stages: ['검증 확인', '감사 종결'],
        link: '/audit',
      },
    ],
    getCards: () => {
      const audits = lsRead('qualytree.audits')
      return audits.map(a => ({
        id: a.id, title: a.title || a.id,
        sub: `감사일: ${a.auditDate || '-'} · 감사원: ${a.auditor || '-'}`,
        status: a.status,
        stage: a.status === 'planned' ? 0 : a.status === 'in_progress' ? 2 : a.status === 'completed' ? 4 : 6,
        urgent: false,
        link: '/audit',
        color: a.status === 'closed' ? '#10B981' : a.status === 'in_progress' ? '#EF4444' : '#6B7280',
      }))
    },
    stages: ['감사 계획', '사전 검토', '감사 실시', 'CAR 발행', '시정조치', '효과검증', '종결'],
  },
]

// ── 상태 아이콘 ───────────────────────────────────────────────
function StatusDot({ status, urgent, size = 8 }) {
  const color = urgent ? '#EF4444'
    : status === 'completed' || status === 'closed' || status === 'done' ? '#10B981'
    : status === 'in_progress' || status === 'in_progress' ? '#F59E0B'
    : '#6B7280'
  return <span style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
}

// ── 카드 컴포넌트 ─────────────────────────────────────────────
function FlowCard({ card, nav }) {
  return (
    <button
      onClick={() => nav(card.link)}
      className="w-full text-left p-2.5 rounded-xl transition mb-2"
      style={{
        background: `${card.color}10`,
        border: `1px solid ${card.color}30`,
        cursor: 'pointer',
      }}
      onMouseEnter={e => e.currentTarget.style.background = `${card.color}22`}
      onMouseLeave={e => e.currentTarget.style.background = `${card.color}10`}
    >
      <div className="flex items-center gap-2 mb-1">
        <StatusDot status={card.status} urgent={card.urgent} />
        <span className="text-[11.5px] font-semibold truncate" style={{ color: 'var(--ink)' }}>{card.title}</span>
        {card.urgent && <span className="text-[9px] px-1.5 rounded font-bold flex-shrink-0" style={{ background: '#EF444420', color: '#EF4444' }}>긴급</span>}
      </div>
      <div className="text-[10.5px] truncate" style={{ color: 'var(--ink-faint)' }}>{card.sub}</div>
    </button>
  )
}

// ── 진행 상태 바 ──────────────────────────────────────────────
function StageProgressBar({ stages, cards, color }) {
  const counts = stages.map((_, i) => cards.filter(c => c.stage === i).length)
  const total = cards.length

  return (
    <div className="space-y-1">
      {stages.map((stage, i) => {
        const count = counts[i]
        const pct = total > 0 ? (count / total) * 100 : 0
        return (
          <div key={i} className="flex items-center gap-2">
            <div className="text-[11px] w-24 text-right flex-shrink-0 truncate" style={{ color: 'var(--ink-faint)' }}>{stage}</div>
            <div className="flex-1 h-4 rounded-lg relative overflow-hidden" style={{ background: 'var(--bg-soft)' }}>
              <div
                className="h-4 rounded-lg flex items-center px-2 transition-all"
                style={{ width: `${Math.max(pct, count > 0 ? 8 : 0)}%`, background: count > 0 ? `${color}80` : 'transparent' }}
              />
              {count > 0 && (
                <div className="absolute inset-0 flex items-center px-2">
                  <span className="text-[10px] font-bold" style={{ color }}>{count}건</span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── 스윔레인 다이어그램 ──────────────────────────────────────
function SwimlaneDiagram({ process, cards, nav }) {
  const allStages = process.stages
  const stageWidth = Math.max(100, Math.floor(900 / allStages.length))

  return (
    <div className="overflow-x-auto pb-3">
      <div style={{ minWidth: allStages.length * stageWidth + 100 }}>
        {/* 스테이지 헤더 */}
        <div className="flex mb-3 ml-28">
          {allStages.map((stage, i) => {
            const count = cards.filter(c => c.stage === i).length
            return (
              <div
                key={i}
                className="flex-1 text-center px-1 py-2 mx-0.5 rounded-xl"
                style={{
                  minWidth: stageWidth,
                  background: count > 0 ? `${process.color}12` : 'var(--bg-soft)',
                  border: `1px solid ${count > 0 ? process.color + '30' : 'var(--line)'}`,
                }}
              >
                <div className="text-[11.5px] font-semibold truncate" style={{ color: count > 0 ? process.color : 'var(--ink-faint)' }}>
                  {stage}
                </div>
                {count > 0 && (
                  <div className="text-[10px] mt-0.5" style={{ color: process.color }}>
                    {count}건
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* 레인 행 */}
        {process.lanes.map((lane, li) => {
          // 이 lane의 stage 범위 찾기
          const laneStart = (() => {
            let s = 0
            for (let l = 0; l < li; l++) s += process.lanes[l].stages.length
            return s
          })()
          const laneEnd = laneStart + lane.stages.length

          const laneCards = cards.filter(c => c.stage >= laneStart && c.stage < laneEnd)

          return (
            <div key={li} className="flex mb-2 items-stretch">
              {/* 부서 라벨 */}
              <div
                className="w-28 flex-shrink-0 flex items-center justify-center rounded-xl mr-1 py-2 px-2 text-center"
                style={{
                  background: `${lane.color}12`,
                  border: `1px solid ${lane.color}30`,
                }}
              >
                <div>
                  <div style={{ fontSize: 16 }}>{lane.icon}</div>
                  <div className="text-[10px] font-bold mt-0.5" style={{ color: lane.color }}>{lane.label}</div>
                  <div className="font-mono text-[9px]" style={{ color: 'var(--ink-faint)' }}>{lane.dept}</div>
                </div>
              </div>

              {/* 스테이지 셀 */}
              {allStages.map((_, si) => {
                const inLane = si >= laneStart && si < laneEnd
                const stageCards = cards.filter(c => c.stage === si)

                return (
                  <div
                    key={si}
                    className="flex-1 mx-0.5 rounded-xl p-2 min-h-[70px]"
                    style={{
                      minWidth: stageWidth,
                      background: inLane
                        ? stageCards.length > 0 ? `${lane.color}08` : `${lane.color}04`
                        : 'transparent',
                      border: inLane
                        ? `1px dashed ${lane.color}${stageCards.length > 0 ? '50' : '20'}`
                        : '1px solid transparent',
                    }}
                  >
                    {inLane && stageCards.map(card => (
                      <FlowCard key={card.id} card={card} nav={nav} />
                    ))}
                    {inLane && stageCards.length === 0 && (
                      <div className="flex items-center justify-center h-full min-h-[50px]">
                        <span style={{ color: `${lane.color}40`, fontSize: 20 }}>·</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── 통계 요약 ─────────────────────────────────────────────────
function ProcessStats({ process, cards }) {
  const done = cards.filter(c => c.stage === process.stages.length - 1).length
  const urgent = cards.filter(c => c.urgent).length
  const active = cards.filter(c => c.stage > 0 && c.stage < process.stages.length - 1).length

  return (
    <div className="grid grid-cols-4 gap-3 mb-5">
      {[
        { label: '전체', value: cards.length, color: '#6366F1', icon: Circle },
        { label: '진행 중', value: active, color: '#F59E0B', icon: Clock },
        { label: '긴급', value: urgent, color: '#EF4444', icon: AlertTriangle },
        { label: '완료', value: done, color: '#10B981', icon: CheckCircle2 },
      ].map(s => (
        <div key={s.label} className="p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="flex justify-between mb-1">
            <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{s.label}</span>
            <s.icon size={13} style={{ color: s.color }} />
          </div>
          <div className="text-[22px] font-bold" style={{ color: s.value > 0 && s.label === '긴급' ? '#EF4444' : 'var(--ink)' }}>
            {s.value}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function ProcessFlow() {
  const nav = useNavigate()
  const user = auth.current()
  const [activeProcess, setActiveProcess] = useState('production')
  const [view, setView] = useState('swimlane') // swimlane | kanban | timeline
  const [, forceRefresh] = useState(0)

  const process = PROCESSES.find(p => p.id === activeProcess) || PROCESSES[0]
  const cards = useMemo(() => process.getCards(), [activeProcess])

  return (
    <AppLayout user={user} title="프로세스 흐름" subtitle="부서 간 업무 흐름 · 진행상태 추적 보드">
      <div className="px-6 lg:px-8 py-6 max-w-[1400px] mx-auto">

        {/* 프로세스 선택 */}
        <div className="flex flex-wrap gap-2 mb-6">
          {PROCESSES.map(p => (
            <button
              key={p.id}
              onClick={() => setActiveProcess(p.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium transition"
              style={{
                background: activeProcess === p.id ? p.color : 'var(--bg-card)',
                color: activeProcess === p.id ? '#fff' : 'var(--ink-soft)',
                border: `1px solid ${activeProcess === p.id ? p.color : 'var(--line)'}`,
                cursor: 'pointer',
                boxShadow: activeProcess === p.id ? `0 4px 16px ${p.color}40` : 'none',
              }}
            >
              <span style={{ fontSize: 15 }}>{p.icon}</span>
              {p.label}
            </button>
          ))}

          <button
            onClick={() => forceRefresh(t => t + 1)}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px]"
            style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)', border: '1px solid var(--line)', cursor: 'pointer' }}
          >
            <RefreshCw size={13} /> 새로고침
          </button>
        </div>

        {/* 프로세스 설명 */}
        <div
          className="flex items-center gap-3 p-4 rounded-2xl mb-5"
          style={{
            background: `${process.color}10`,
            border: `1px solid ${process.color}25`,
          }}
        >
          <span style={{ fontSize: 24 }}>{process.icon}</span>
          <div className="flex-1">
            <div className="font-semibold text-[15px]" style={{ color: 'var(--ink)' }}>{process.label}</div>
            <div className="text-[12px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
              {process.stages.map((s, i) => (
                <span key={i}>
                  {s}
                  {i < process.stages.length - 1 && (
                    <ArrowRight size={10} style={{ display: 'inline', margin: '0 4px', verticalAlign: 'middle' }} />
                  )}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users size={14} style={{ color: process.color }} />
            <span className="text-[12px] font-medium" style={{ color: process.color }}>
              {process.lanes.map(l => l.dept).join(' → ')}
            </span>
          </div>
        </div>

        {/* 통계 */}
        <ProcessStats process={process} cards={cards} />

        {/* 뷰 전환 */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-soft)' }}>
            {[
              { key: 'swimlane', label: '스윔레인' },
              { key: 'kanban', label: '칸반 보드' },
              { key: 'progress', label: '단계 현황' },
            ].map(v => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className="px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition"
                style={{
                  background: view === v.key ? 'var(--bg-card)' : 'transparent',
                  color: view === v.key ? 'var(--ink)' : 'var(--ink-faint)',
                  border: 'none', cursor: 'pointer',
                  boxShadow: view === v.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
          <span className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>
            {cards.length === 0 ? '데이터 없음 — 실제 업무 데이터 입력 시 자동 표시' : `${cards.length}건 진행 중`}
          </span>
        </div>

        {/* 스윔레인 뷰 */}
        {view === 'swimlane' && (
          <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
            {cards.length === 0 ? (
              <EmptyState process={process} />
            ) : (
              <SwimlaneDiagram process={process} cards={cards} nav={nav} />
            )}
          </div>
        )}

        {/* 칸반 뷰 */}
        {view === 'kanban' && (
          <div className="overflow-x-auto pb-3">
            <div className="flex gap-3" style={{ minWidth: process.stages.length * 200 }}>
              {process.stages.map((stage, i) => {
                const stageCards = cards.filter(c => c.stage === i)
                return (
                  <div key={i} className="flex-shrink-0" style={{ width: 200 }}>
                    <div
                      className="px-3 py-2 rounded-xl mb-2 text-center"
                      style={{
                        background: stageCards.length > 0 ? `${process.color}15` : 'var(--bg-soft)',
                        border: `1px solid ${stageCards.length > 0 ? process.color + '30' : 'var(--line)'}`,
                      }}
                    >
                      <div className="text-[12px] font-semibold" style={{ color: stageCards.length > 0 ? process.color : 'var(--ink-faint)' }}>
                        {stage}
                      </div>
                      {stageCards.length > 0 && (
                        <div className="text-[10px] font-bold" style={{ color: process.color }}>{stageCards.length}건</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {stageCards.map(card => (
                        <button
                          key={card.id}
                          onClick={() => nav(card.link)}
                          className="w-full text-left p-3 rounded-xl transition"
                          style={{ background: 'var(--bg-card)', border: `1px solid ${card.color}30`, cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background = `${card.color}08`}
                          onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <StatusDot status={card.status} urgent={card.urgent} />
                            {card.urgent && <span className="text-[9px] px-1 rounded font-bold" style={{ background: '#EF444420', color: '#EF4444' }}>긴급</span>}
                          </div>
                          <div className="text-[12.5px] font-semibold truncate" style={{ color: 'var(--ink)' }}>{card.title}</div>
                          <div className="text-[11px] mt-1 truncate" style={{ color: 'var(--ink-faint)' }}>{card.sub}</div>
                        </button>
                      ))}
                      {stageCards.length === 0 && (
                        <div className="h-16 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-soft)', border: '1px dashed var(--line)' }}>
                          <span style={{ color: 'var(--ink-faint)', fontSize: 20 }}>·</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 단계 현황 뷰 */}
        {view === 'progress' && (
          <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
            {cards.length === 0 ? (
              <EmptyState process={process} />
            ) : (
              <div>
                <div className="text-[13px] font-semibold mb-4" style={{ color: 'var(--ink)' }}>
                  단계별 진행 현황
                </div>
                <StageProgressBar stages={process.stages} cards={cards} color={process.color} />

                <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--line)' }}>
                  <div className="text-[13px] font-semibold mb-3" style={{ color: 'var(--ink)' }}>긴급 항목</div>
                  {cards.filter(c => c.urgent).length === 0 ? (
                    <div className="text-[13px]" style={{ color: 'var(--ink-faint)' }}>긴급 항목 없음</div>
                  ) : (
                    cards.filter(c => c.urgent).map(card => (
                      <FlowCard key={card.id} card={card} nav={nav} />
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 부서 흐름 안내 */}
        <div className="mt-6 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Zap size={15} style={{ color: 'var(--ink-soft)' }} />
            <span className="text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>
              {process.label} — 부서 역할 안내
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            {process.lanes.map((lane, i) => (
              <button
                key={i}
                onClick={() => nav(lane.link)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl transition"
                style={{
                  background: `${lane.color}10`,
                  border: `1px solid ${lane.color}25`,
                  cursor: 'pointer',
                }}
                onMouseEnter={e => e.currentTarget.style.background = `${lane.color}20`}
                onMouseLeave={e => e.currentTarget.style.background = `${lane.color}10`}
              >
                <span style={{ fontSize: 15 }}>{lane.icon}</span>
                <div className="text-left">
                  <div className="text-[12px] font-bold" style={{ color: lane.color }}>{lane.label}</div>
                  <div className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{lane.stages.join(' · ')}</div>
                </div>
                <ChevronRight size={12} style={{ color: 'var(--ink-faint)', marginLeft: 4 }} />
              </button>
            ))}
          </div>
        </div>

      </div>
    </AppLayout>
  )
}

/* ── Empty State ── */
function EmptyState({ process }) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.4 }}>{process.icon}</div>
      <div className="text-[15px] font-semibold mb-2" style={{ color: 'var(--ink-soft)' }}>
        진행 중인 {process.label.split(' ')[0]} 데이터 없음
      </div>
      <div className="text-[13px] max-w-sm" style={{ color: 'var(--ink-faint)', lineHeight: 1.6 }}>
        업무 데이터를 해당 허브에 입력하면 이곳에서 흐름을 추적할 수 있습니다.
        <br />
        <span className="font-medium" style={{ color: 'var(--ink-soft)' }}>예: 작업지시 발행 → 생산 흐름에 자동 표시</span>
      </div>
      <div className="mt-4 flex gap-2 flex-wrap justify-center text-[12px]" style={{ color: 'var(--ink-faint)' }}>
        {process.stages.map((s, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className="px-2 py-1 rounded-lg" style={{ background: 'var(--bg-soft)' }}>{s}</span>
            {i < process.stages.length - 1 && <ArrowRight size={10} />}
          </span>
        ))}
      </div>
    </div>
  )
}
