import React, { useState, useMemo } from 'react'
import { ClipboardList, CheckCircle2, XCircle, AlertCircle, MinusCircle,
  BarChart2, Plus, Trash2, CheckSquare, History, Shield, ChevronDown, ChevronRight } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'

const ACCENT = '#16A34A'
const LS_KEY = 'qualytree.gmp_self_inspection_v2'

const CATEGORIES = [
  {
    id: 'doc', label: '문서 및 기록관리',
    items: [
      { id: 'd1', label: '품질매뉴얼이 최신 버전으로 유지되고 있는가?' },
      { id: 'd2', label: '문서 승인 절차(작성, 검토, 승인)가 준수되고 있는가?' },
      { id: 'd3', label: '문서 개정 이력(개정번호, 일자)이 관리되고 있는가?' },
      { id: 'd4', label: '기록 보존 기간 및 보관 장소가 지정되어 있는가?' },
      { id: 'd5', label: '폐기 문서에 대한 통제가 이루어지고 있는가?' },
    ]
  },
  {
    id: 'mgmt', label: '경영 책임',
    items: [
      { id: 'm1', label: '품질방침이 전 직원에게 공표되고 이해되고 있는가?' },
      { id: 'm2', label: '품질목표가 수립되어 있고 정기적으로 검토되는가?' },
      { id: 'm3', label: '경영검토가 연 1회 이상 실시되고 기록되는가?' },
      { id: 'm4', label: '품질관리자(QM)가 지정되어 역할을 수행하는가?' },
      { id: 'm5', label: '고객 불만 및 피드백이 경영진에게 보고되는가?' },
    ]
  },
  {
    id: 'resource', label: '자원 관리',
    items: [
      { id: 'r1', label: '직원 역량(교육, 자격)이 기록 관리되고 있는가?' },
      { id: 'r2', label: '신규 인력에 대한 교육훈련이 실시되는가?' },
      { id: 'r3', label: '작업환경 모니터링 및 관리가 이루어지는가?' },
      { id: 'r4', label: '설비(기계, 설비, 장비)가 정기적으로 유지보수되는가?' },
      { id: 'r5', label: '측정장비의 교정 상태가 최신으로 유지되는가?' },
    ]
  },
  {
    id: 'process', label: '제조 공정',
    items: [
      { id: 'p1', label: '제품 사양서 및 작업 지시서가 최신화되어 있는가?' },
      { id: 'p2', label: '공정 유효성 확인(IQ/OQ/PQ)이 완료되어 있는가?' },
      { id: 'p3', label: '생산 배치 기록(Batch Record)이 완전히 작성되는가?' },
      { id: 'p4', label: '원자재 수입검사가 절차에 따라 수행되는가?' },
      { id: 'p5', label: '작업표준(SOP, 작업지시서)이 현장에 비치되어 있는가?' },
      { id: 'p6', label: '제품 식별 및 추적성이 전 공정에서 유지되는가?' },
      { id: 'p7', label: '부적합품에 대한 격리 및 처리 절차가 준수되는가?' },
      { id: 'p8', label: '멸균(해당 시) 공정이 검증되고 모니터링되는가?' },
    ]
  },
  {
    id: 'quality', label: '품질 보증',
    items: [
      { id: 'q1', label: '내부심사가 계획대로 실시되고 기록되는가?' },
      { id: 'q2', label: '공정검사 및 최종검사 절차가 준수되는가?' },
      { id: 'q3', label: '고객 불만 처리 절차가 수립되어 운영되는가?' },
      { id: 'q4', label: '부적합 제품 처리 절차가 문서화되어 있는가?' },
      { id: 'q5', label: '시정·예방조치(CAPA) 시스템이 운영되고 있는가?' },
      { id: 'q6', label: 'CAPA(시정·예방조치)의 효과성이 검증되는가?' },
      { id: 'q7', label: '공급업체 평가가 주기적으로 실시되는가?' },
      { id: 'q8', label: 'KPI(품질지표)가 수집되고 분석·보고되는가?' },
    ]
  },
]

const INSPECTION_TYPES = ['내부 정기점검', '인증심사 준비', '개선확인 점검', '특별점검']
const STATUS_OPTIONS = [
  { value: 'pass',    label: '적합',    color: '#16A34A', Icon: CheckCircle2 },
  { value: 'fail',    label: '부적합',  color: '#DC2626', Icon: XCircle },
  { value: 'partial', label: '일부적합', color: '#D97706', Icon: AlertCircle },
  { value: 'na',      label: '해당없음', color: '#9CA3AF', Icon: MinusCircle },
]

const ALL_ITEMS = CATEGORIES.flatMap(c => c.items.map(it => ({ ...it, catId: c.id })))
const TOTAL = ALL_ITEMS.length

function load() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch { return {} }
}
function save(data) { localStorage.setItem(LS_KEY, JSON.stringify(data)) }

function calcScore(results) {
  let scored = 0, possible = 0
  ALL_ITEMS.forEach(({ id }) => {
    const s = results[id]?.status
    if (s === 'na') return
    possible++
    if (s === 'pass') scored += 1
    else if (s === 'partial') scored += 0.5
  })
  return possible === 0 ? 0 : Math.round((scored / possible) * 100)
}

function calcCatScore(cat, results) {
  let scored = 0, possible = 0
  cat.items.forEach(({ id }) => {
    const s = results[id]?.status
    if (s === 'na') return
    possible++
    if (s === 'pass') scored += 1
    else if (s === 'partial') scored += 0.5
  })
  return possible === 0 ? null : Math.round((scored / possible) * 100)
}

function scoreColor(pct) {
  if (pct === null || pct === undefined) return '#9CA3AF'
  if (pct >= 90) return '#16A34A'
  if (pct >= 70) return '#D97706'
  return '#DC2626'
}

function newSession(userName) {
  return {
    id: Date.now().toString(),
    date: new Date().toISOString().slice(0, 10),
    type: INSPECTION_TYPES[0],
    inspector: userName || '',
    status: 'draft',
    results: {},
    createdAt: new Date().toISOString(),
  }
}

export default function GmpSelfInspectionHub() {
  const user = auth.current()
  const stored = load()
  const [sessions, setSessions] = useState(() => stored.sessions || [])
  const [activeId, setActiveId] = useState(() => stored.activeId || null)
  const [tab, setTab] = useState(0)
  const [expanded, setExpanded] = useState(() =>
    Object.fromEntries(CATEGORIES.map(c => [c.id, true])))

  const activeSession = sessions.find(s => s.id === activeId) || null

  function persist(newSessions, newActiveId) {
    const aid = newActiveId !== undefined ? newActiveId : activeId
    setSessions(newSessions)
    setActiveId(aid)
    save({ sessions: newSessions, activeId: aid })
  }

  function startNew() {
    const s = newSession(user?.name)
    persist([s, ...sessions], s.id)
    setTab(0)
  }

  function updateActive(patch) {
    persist(sessions.map(s => s.id === activeId ? { ...s, ...patch } : s))
  }

  function setResult(itemId, field, val) {
    const cur = activeSession?.results || {}
    persist(sessions.map(s => s.id === activeId
      ? { ...s, results: { ...cur, [itemId]: { ...cur[itemId], [field]: val } } }
      : s))
  }

  function finalizeSession() {
    const sc = calcScore(activeSession?.results || {})
    persist(sessions.map(s => s.id === activeId
      ? { ...s, status: 'final', score: sc, finalizedAt: new Date().toISOString() }
      : s))
  }

  function deleteSession(id) {
    persist(sessions.filter(s => s.id !== id), activeId === id ? null : undefined)
  }

  function loadSession(id) { persist(sessions, id); setTab(0) }

  const score = useMemo(() => calcScore(activeSession?.results || {}), [activeSession])
  const answered = useMemo(() =>
    ALL_ITEMS.filter(it => activeSession?.results[it.id]?.status).length, [activeSession])
  const failItems = useMemo(() =>
    ALL_ITEMS.filter(it => ['fail', 'partial'].includes(activeSession?.results[it.id]?.status)),
    [activeSession])

  const TABS = ['체크리스트', '결과 요약', `점검 이력 (${sessions.length})`]
  const btnBase = { border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }

  return (
    <AppLayout user={user} title="GMP 자가점검" subtitle="GMP 심사 대비 자가점검 체크리스트">
      <div style={{ padding: '28px 32px', fontFamily: 'inherit' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <Shield size={24} color={ACCENT} />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>GMP 심사 자가점검</h1>
            <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>ISO 13485 / KGMP 기준 · {TOTAL}개 항목</p>
          </div>
          <button onClick={startNew}
            style={{ ...btnBase, marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', background: ACCENT, color: '#fff', fontSize: 13 }}>
            <Plus size={15} /> 새 점검 시작
          </button>
        </div>
        <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', marginBottom: 24 }}>
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)}
              style={{ ...btnBase, padding: '10px 20px', fontSize: 13, background: 'none',
                borderBottom: tab === i ? `2px solid ${ACCENT}` : '2px solid transparent',
                color: tab === i ? ACCENT : '#6B7280', borderRadius: 0 }}>
              {t}
            </button>
          ))}
        </div>
        {tab === 0 && (!activeSession ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#9CA3AF' }}>
            <ClipboardList size={48} style={{ margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontSize: 15, fontWeight: 600 }}>진행 중인 점검이 없습니다</p>
            <p style={{ fontSize: 13 }}>"새 점검 시작" 버튼을 눌러 점검을 시작하세요.</p>
          </div>
        ) : (<>
          <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 10,
            padding: 16, marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
            <div>
              <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>점검일자</label>
              <input type="date" value={activeSession.date}
                disabled={activeSession.status === 'final'}
                onChange={e => updateActive({ date: e.target.value })}
                style={{ padding: '6px 10px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>점검 유형</label>
              <select value={activeSession.type}
                disabled={activeSession.status === 'final'}
                onChange={e => updateActive({ type: e.target.value })}
                style={{ padding: '6px 10px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13 }}>
                {INSPECTION_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>점검자</label>
              <input value={activeSession.inspector}
                disabled={activeSession.status === 'final'}
                onChange={e => updateActive({ inspector: e.target.value })}
                placeholder="점검자 이름"
                style={{ padding: '6px 10px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, width: 130 }} />
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#6B7280' }}>{answered}/{TOTAL} 응답</span>
              <span style={{ padding: '4px 12px', borderRadius: 20, background: scoreColor(score) + '20',
                color: scoreColor(score), fontWeight: 800, fontSize: 16 }}>{score}점</span>
              {activeSession.status === 'draft' ? (
                <button onClick={finalizeSession}
                  style={{ ...btnBase, display: 'flex', alignItems: 'center', gap: 5,
                    padding: '7px 14px', background: '#1D4ED8', color: '#fff', fontSize: 12 }}>
                  <CheckSquare size={14} /> 점검 완료
                </button>
              ) : (
                <span style={{ padding: '4px 10px', borderRadius: 20, background: '#EFF6FF',
                  color: '#1D4ED8', fontSize: 12, fontWeight: 600 }}>✓ 완료됨</span>
              )}
            </div>
          </div>
          {CATEGORIES.map(cat => (
            <div key={cat.id} style={{ marginBottom: 14, border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden' }}>
              <div onClick={() => setExpanded(e => ({ ...e, [cat.id]: !e[cat.id] }))}
                style={{ display: 'flex', alignItems: 'center', padding: '12px 16px',
                  background: '#F9FAFB', cursor: 'pointer', userSelect: 'none' }}>
                {expanded[cat.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span style={{ fontWeight: 700, fontSize: 14, marginLeft: 8 }}>{cat.label}</span>
                <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 6 }}>({cat.items.length}개)</span>
                {(() => { const pct = calcCatScore(cat, activeSession.results); return pct !== null
                  ? <span style={{ marginLeft: 'auto', fontWeight: 700, color: scoreColor(pct) }}>{pct}%</span>
                  : null })()}
              </div>
              {expanded[cat.id] && cat.items.map((item, idx) => {
                const res = activeSession.results[item.id] || {}
                return (
                  <div key={item.id} style={{ padding: '12px 16px', borderTop: '1px solid #F3F4F6',
                    background: idx % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <span style={{ fontSize: 11, color: '#9CA3AF', minWidth: 26, paddingTop: 3 }}>
                        {item.id.toUpperCase()}
                      </span>
                      <span style={{ fontSize: 13, color: '#374151', flex: 1, lineHeight: 1.5 }}>{item.label}</span>
                      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                        {STATUS_OPTIONS.map(({ value, label, color, Icon }) => (
                          <button key={value}
                            disabled={activeSession.status === 'final'}
                            onClick={() => setResult(item.id, 'status', res.status === value ? undefined : value)}
                            title={label}
                            style={{ padding: '5px 9px',
                              border: `1px solid ${res.status === value ? color : '#E5E7EB'}`,
                              background: res.status === value ? color + '18' : '#fff',
                              color: res.status === value ? color : '#9CA3AF',
                              borderRadius: 6, fontSize: 11, fontWeight: 600,
                              cursor: activeSession.status === 'final' ? 'default' : 'pointer',
                              display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'inherit' }}>
                            <Icon size={11} /> {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{ marginTop: 6, marginLeft: 36 }}>
                      <input value={res.memo || ''}
                        disabled={activeSession.status === 'final'}
                        onChange={e => setResult(item.id, 'memo', e.target.value)}
                        placeholder="근거 · 메모 (선택)"
                        style={{ width: '100%', padding: '5px 10px', border: '1px solid #E5E7EB',
                          borderRadius: 6, fontSize: 12, color: '#374151', fontFamily: 'inherit',
                          background: activeSession.status === 'final' ? '#F9FAFB' : '#fff' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </>))}
        {tab === 1 && (!activeSession ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>
            <BarChart2 size={40} style={{ margin: '0 auto 8px', display: 'block' }} />
            <p>점검을 선택하거나 새로 시작하세요.</p>
          </div>
        ) : (<>
          <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: '0 0 150px', background: scoreColor(score) + '12',
              border: `1px solid ${scoreColor(score)}40`, borderRadius: 12, padding: '20px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 52, fontWeight: 800, color: scoreColor(score), lineHeight: 1 }}>{score}</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 6 }}>종합 점수</div>
              <div style={{ fontSize: 12, color: scoreColor(score), fontWeight: 700, marginTop: 4 }}>
                {score >= 90 ? '우수 ✓' : score >= 70 ? '양호' : '개선 필요'}
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { label: '싙 항목', val: TOTAL, c: '#6B7280' },
                { label: '응답 완료', val: answered, c: '#1D4ED8' },
                { label: '적합', val: ALL_ITEMS.filter(it => activeSession.results[it.id]?.status === 'pass').length, c: '#16A34A' },
                { label: '부적합', val: failItems.length, c: '#DC2626' },
                { label: '해당없음', val: ALL_ITEMS.filter(it => activeSession.results[it.id]?.status === 'na').length, c: '#9CA3AF' },
              ].map(({ label, val, c }) => (
                <div key={label} style={{ background: '#F9FAFB', border: '1px solid #E5E7EB',
                  borderRadius: 10, padding: '14px 18px', textAlign: 'center', minWidth: 85 }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: c }}>{val}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>카테고리별 점수</h3>
            {CATEGORIES.map(cat => {
              const pct = calcCatScore(cat, activeSession.results)
              return (
                <div key={cat.id} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}>
                    <span style={{ fontWeight: 600 }}>{cat.label}</span>
                    <span style={{ color: scoreColor(pct), fontWeight: 700 }}>{pct === null ? '-' : pct + '%'}</span>
                  </div>
                  <div style={{ height: 8, background: '#F3F4F6', borderRadius: 4 }}>
                    <div style={{ height: '100%', borderRadius: 4, background: scoreColor(pct),
                      width: (pct || 0) + '%', transition: 'width 0.5s' }} />
                  </div>
                </div>
              )
            })}
          </div>
          {failItems.length > 0 && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#DC2626' }}>
                개선 필요 항목 ({failItems.length}개)
              </h3>
              {failItems.map(item => {
                const res = activeSession.results[item.id] || {}
                const opt = STATUS_OPTIONS.find(o => o.value === res.status)
                return (
                  <div key={item.id} style={{ padding: '10px 14px', background: '#FEF2F2',
                    border: '1px solid #FECACA', borderRadius: 8, marginBottom: 8 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: opt?.color,
                        padding: '2px 8px', background: opt?.color + '20', borderRadius: 10 }}>{opt?.label}</span>
                      <span style={{ fontSize: 13, color: '#374151' }}>{item.label}</span>
                    </div>
                    {res.memo && <p style={{ fontSize: 12, color: '#6B7280', margin: '6px 0 0 0' }}>메모: {res.memo}</p>}
                  </div>
                )
              })}
            </div>
          )}
        </>))}
        {tab === 2 && (sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>
            <History size={40} style={{ margin: '0 auto 8px', display: 'block' }} />
            <p>저장된 점검 이력이 없습니다.</p>
          </div>
        ) : sessions.map(s => {
          const sc = s.score ?? calcScore(s.results)
          const ans = ALL_ITEMS.filter(it => s.results[it.id]?.status).length
          const isActive = s.id === activeId
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 16px',
              border: `1px solid ${isActive ? ACCENT : '#E5E7EB'}`,
              borderRadius: 10, marginBottom: 10, background: isActive ? '#F0FDF4' : '#fff' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{s.date}</span>
                  <span style={{ fontSize: 12, color: '#6B7280', padding: '2px 8px', background: '#F3F4F6', borderRadius: 10 }}>{s.type}</span>
                  <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 10, fontWeight: 600,
                    background: s.status === 'final' ? '#EFF6FF' : '#FFFBEB',
                    color: s.status === 'final' ? '#1D4ED8' : '#D97706' }}>
                    {s.status === 'final' ? '완료' : '진행중'}
                  </span>
                  {isActive && <span style={{ fontSize: 11, color: ACCENT, fontWeight: 700 }}>▶ 현재</span>}
                </div>
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                  점검자: {s.inspector || '-'} · {ans}/{TOTAL} 응답
                  {s.finalizedAt ? ` · 완료: ${s.finalizedAt.slice(0,10)}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {ans > 0 && <span style={{ fontWeight: 800, fontSize: 20, color: scoreColor(sc), minWidth: 60, textAlign: 'right' }}>{sc}점</span>}
                {!isActive && (
                  <button onClick={() => loadSession(s.id)}
                    style={{ ...btnBase, padding: '6px 12px', border: `1px solid ${ACCENT}`,
                      background: '#fff', color: ACCENT, fontSize: 12 }}>
                    불러오기
                  </button>
                )}
                <button onClick={() => { if (window.confirm('이 점검 기록을 삭제할까요?')) deleteSession(s.id) }}
                  style={{ ...btnBase, padding: 7, border: '1px solid #E5E7EB', background: '#fff', color: '#9CA3AF' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        }))}
      </div>
    </AppLayout>
  )
}