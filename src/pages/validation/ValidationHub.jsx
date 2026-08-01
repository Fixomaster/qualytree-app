// src/pages/validation/ValidationHub.jsx
// ISO 13485 §7.5.6 공정 유효성 확인 — VMP · IQ/OQ/PQ · 재밸리데이션 관리
import React, { useState, useMemo } from 'react'
import {
  Plus, Search, Trash2, X, Edit3, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Clock, AlertTriangle, FlaskConical,
  BarChart2, RefreshCw, CalendarClock, FileCheck, Settings,
  BadgeCheck, Cpu,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'

// ── localStorage ──────────────────────────────────────────────
const LS_KEY = 'qualytree.validations'
function lsR() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] } }
function lsW(d) { localStorage.setItem(LS_KEY, JSON.stringify(d)) }
function genId() { return `VAL-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }

// 날짜 유틸
function addMonths(dateStr, m) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    d.setMonth(d.getMonth() + m)
    return d.toISOString().slice(0, 10)
  } catch { return '' }
}
function daysDiff(dateStr) {
  if (!dateStr) return null
  const diff = new Date(dateStr) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// ── 상수 ─────────────────────────────────────────────────────
const VAL_TYPES = [
  { value: 'process',  label: '제조 공정',    color: '#2563EB', icon: Settings,    desc: '일반 제조·조립 공정' },
  { value: 'sterile',  label: '멸균 공정',    color: '#DC2626', icon: FlaskConical, desc: 'EO·오토클레이브·방사선 등' },
  { value: 'software', label: 'SW 밸리데이션', color: '#7C3AED', icon: Cpu,          desc: '소프트웨어·펌웨어 검증' },
  { value: 'cleaning', label: '세척 공정',    color: '#059669', icon: RefreshCw,    desc: '재사용 기기 세척 유효성' },
  { value: 'packaging',label: '포장 공정',    color: '#D97706', icon: FileCheck,    desc: '포장·실링 유효성 확인' },
  { value: 'other',    label: '기타',         color: '#6B7280', icon: BadgeCheck,   desc: '기타 특수 공정' },
]

const VAL_STATUSES = [
  { value: 'planned',    label: '계획',      color: '#6B7280', bg: '#F3F4F6' },
  { value: 'iq',         label: 'IQ 진행',   color: '#2563EB', bg: '#DBEAFE' },
  { value: 'oq',         label: 'OQ 진행',   color: '#7C3AED', bg: '#EDE9FE' },
  { value: 'pq',         label: 'PQ 진행',   color: '#D97706', bg: '#FEF3C7' },
  { value: 'validated',  label: '유효성 확인 완료', color: '#059669', bg: '#D1FAE5' },
  { value: 'reval_due',  label: '재밸리데이션 예정', color: '#F97316', bg: '#FFEDD5' },
  { value: 'failed',     label: '불합격',    color: '#DC2626', bg: '#FEE2E2' },
  { value: 'cancelled',  label: '취소',      color: '#9CA3AF', bg: '#F9FAFB' },
]

const REVAL_INTERVALS = [
  { value: 12,  label: '1년' },
  { value: 24,  label: '2년' },
  { value: 36,  label: '3년' },
  { value: 60,  label: '5년' },
  { value: 0,   label: '미설정' },
]

// IQ/OQ/PQ 기본 체크 항목
const IQ_DEFAULTS = ['설비 사양 검토', '설치 도면/배치도 확인', '공급업체 문서 검토', '계측기 교정 확인', '유틸리티 연결 확인', '알람·안전장치 확인']
const OQ_DEFAULTS = ['운전 범위 확인 (하한)', '운전 범위 확인 (상한)', '반복성 시험', '프로세스 파라미터 검증', '공차 이탈 시 알람 확인']
const PQ_DEFAULTS = ['정상 조건 성능 시험', '최악 조건(Worst-Case) 시험', '반복 재현성 시험(3런)', '제품 품질 기준 충족 확인', '장기 안정성 확인']

const emptyPhase = (defaults) => defaults.map(name => ({ name, acceptance: '', result: '', pass: null }))

const emptyForm = () => ({
  title: '', valType: 'process', processName: '', equipment: '',
  planDate: new Date().toISOString().slice(0, 10),
  responsiblePerson: '', status: 'planned',
  revalIntervalMonths: 24,
  // IQ
  iqStartDate: '', iqEndDate: '', iqVerdict: null,
  iqItems: emptyPhase(IQ_DEFAULTS), iqConclusion: '',
  // OQ
  oqStartDate: '', oqEndDate: '', oqVerdict: null,
  oqItems: emptyPhase(OQ_DEFAULTS), oqConclusion: '',
  // PQ
  pqStartDate: '', pqEndDate: '', pqVerdict: null,
  pqItems: emptyPhase(PQ_DEFAULTS), pqConclusion: '',
  // 완료
  validatedDate: '', nextRevalDate: '',
  linkedChangeId: '', notes: '',
})

// ── 메인 ─────────────────────────────────────────────────────
export default function ValidationHub({ embedded = false, role = 'production' } = {}) {
  const user = auth.current()
  const canRequest = role === 'quality'
  const [records, setRecords] = useState(() => lsR())
  const [tab, setTab]     = useState('list')
  const [search, setSearch]       = useState('')
  const [typeFilter, setTypeFilter]   = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(emptyForm())
  const [editId, setEditId]     = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [activePhase, setActivePhase] = useState({})   // id → 'iq'|'oq'|'pq'

  const save = d => { setRecords(d); lsW(d) }

  const openNew  = () => { setForm(emptyForm()); setEditId(null); setShowForm(true) }
  const openEdit = r  => { setForm({ ...r }); setEditId(r.id); setShowForm(true) }
  const remove   = id => { if (!confirm('삭제?')) return; save(records.filter(r => r.id !== id)) }
  const fld  = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // 단계별 항목 업데이트
  const updPhaseItem = (phase, i, k, v) => setForm(f => {
    const items = [...(f[`${phase}Items`] || [])]
    items[i] = { ...items[i], [k]: v }
    const allDone  = items.every(it => it.pass !== null && it.pass !== undefined)
    const anyFail  = items.some(it => it.pass === false || it.pass === 'false')
    const verdict  = allDone ? (anyFail ? false : true) : null
    return { ...f, [`${phase}Items`]: items, [`${phase}Verdict`]: verdict }
  })

  // 완료 시 재밸리데이션 날짜 자동 계산
  const handleValidatedDate = (v) => {
    const nextDate = form.revalIntervalMonths > 0 ? addMonths(v, form.revalIntervalMonths) : ''
    setForm(f => ({ ...f, validatedDate: v, nextRevalDate: nextDate,
      status: v ? 'validated' : f.status }))
  }

  const submit = () => {
    if (!form.title || !form.responsiblePerson)
      return alert('밸리데이션 제목과 담당자는 필수입니다.')
    const now = new Date().toISOString()
    if (editId) save(records.map(r => r.id === editId ? { ...form, id: editId } : r))
    else save([{ ...form, id: genId(), createdAt: now, createdBy: user?.name || '-' }, ...records])
    setShowForm(false)
  }

  // 필터
  const filtered = useMemo(() => {
    let list = [...records]
    if (typeFilter !== 'all')   list = list.filter(r => r.valType === typeFilter)
    if (statusFilter !== 'all') list = list.filter(r => r.status === statusFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r => (r.id + r.title + r.processName + r.responsiblePerson).toLowerCase().includes(q))
    }
    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  }, [records, typeFilter, statusFilter, search])

  // 집계
  const validated     = records.filter(r => r.status === 'validated').length
  const revalDue      = records.filter(r => {
    if (!r.nextRevalDate) return false
    const d = daysDiff(r.nextRevalDate)
    return d !== null && d <= 90
  })
  const overdue       = revalDue.filter(r => daysDiff(r.nextRevalDate) < 0)
  const inProgress    = records.filter(r => ['iq','oq','pq'].includes(r.status)).length

  const TABS = canRequest ? [
    { key: 'list',     label: '밸리데이션 목록', icon: FlaskConical },
    { key: 'schedule', label: '재밸리데이션 일정', icon: CalendarClock },
    { key: 'analysis', label: '현황 분석',       icon: BarChart2 },
  ] : [
    { key: 'list',     label: '밸리데이션 실행 목록', icon: FlaskConical },
  ]

  const body = (
    <div className={embedded ? '' : 'px-6 lg:px-8 py-6 max-w-[1280px] mx-auto'}>

        {/* 긴급 알림 */}
        {overdue.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-3" style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}>
            <AlertTriangle size={14} style={{ color: '#DC2626' }} />
            <span className="text-[13px] font-semibold" style={{ color: '#991B1B' }}>
              재밸리데이션 기한 초과 {overdue.length}건 — 즉시 조치 필요
            </span>
          </div>
        )}
        {revalDue.length > overdue.length && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-5" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
            <Clock size={14} style={{ color: '#D97706' }} />
            <span className="text-[13px] font-semibold" style={{ color: '#92400E' }}>
              재밸리데이션 90일 이내 {revalDue.length - overdue.length}건
            </span>
          </div>
        )}

        {!canRequest && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-5" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
            <FlaskConical size={14} style={{ color: '#2563EB' }} />
            <span className="text-[12.5px]" style={{ color: '#1E40AF' }}>
              새 밸리데이션 요청 등록·재밸리데이션 일정·현황 분석은 품질·검사 &gt; NCR·부적합 화면의 "밸리데이션" 탭에서 관리합니다. 이 화면에서는 품질에서 요청한 항목의 IQ/OQ/PQ 실행 결과만 입력합니다.
            </span>
          </div>
        )}

        {!embedded && (
          <HubBanner
            title="공정 유효성 확인"
            subtitle="ISO 13485 §7.5.6 · IQ/OQ/PQ 공정 밸리데이션 · 재검증 주기 관리"
            icon={FlaskConical}
            color="#7C3AED"
            quickActions={canRequest ? [{ label: '검증 프로젝트 등록', icon: Plus, onClick: openNew, primary: true }] : []}
            workflow={['검증 계획(품질)', '프로토콜 작성(품질)', 'IQ/OQ/PQ 실행(생산)', '결과 검토(품질)', '보고서 승인(품질)', '주기적 재검증(품질)']}
          />
        )}

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: '전체',         count: records.length,    color: '#6B7280' },
            { label: '진행 중',      count: inProgress,        color: '#2563EB' },
            { label: '유효성 확인 완료', count: validated,     color: '#059669' },
            { label: '90일 내 재밸리', count: revalDue.length, color: '#D97706' },
            { label: '기한 초과',    count: overdue.length,    color: overdue.length > 0 ? '#DC2626' : '#059669' },
          ].map(s => (
            <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="text-[22px] font-bold" style={{ color: s.color }}>{s.count}</div>
              <div className="text-[10px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: 'var(--bg-soft)', width: 'fit-content' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition"
              style={{ background: tab === t.key ? 'var(--bg-card)' : 'transparent', color: tab === t.key ? 'var(--ink)' : 'var(--ink-faint)', border: 'none', cursor: 'pointer', boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
              <t.icon size={14} />{t.label}
            </button>
          ))}
        </div>

        {/* ── 목록 탭 ── */}
        {tab === 'list' && (
          <>
            <div className="flex gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-[160px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                <Search size={14} style={{ color: 'var(--ink-faint)' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="제목·공정명·담당자 검색..." className="flex-1 text-[13px] outline-none" style={{ background: 'none', border: 'none', color: 'var(--ink)' }} />
              </div>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={SEL}>
                <option value="all">전체 유형</option>
                {VAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={SEL}>
                <option value="all">전체 상태</option>
                {VAL_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              {canRequest && (
                <button onClick={openNew} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold" style={{ background: '#2563EB', color: 'white', border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} /> 밸리데이션 추가
                </button>
              )}
            </div>

            {filtered.length === 0
              ? <ValEmpty onAdd={openNew} canRequest={canRequest} />
              : <div className="space-y-2">
                  {filtered.map(r => (
                    <ValRow key={r.id} record={r}
                      expanded={expanded === r.id}
                      activePhase={activePhase[r.id] || 'iq'}
                      onSetPhase={p => setActivePhase(ap => ({ ...ap, [r.id]: p }))}
                      onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
                      onEdit={() => openEdit(r)}
                      onDelete={() => remove(r.id)}
                    />
                  ))}
                </div>
            }
          </>
        )}

        {/* ── 재밸리데이션 일정 탭 (품질 전용) ── */}
        {canRequest && tab === 'schedule' && <RevalSchedule records={records} />}

        {/* ── 현황 분석 탭 (품질 전용) ── */}
        {canRequest && tab === 'analysis' && <ValAnalysis records={records} />}

      {showForm && (
        <ValForm form={form} fld={fld} updPhaseItem={updPhaseItem}
          handleValidatedDate={handleValidatedDate}
          editId={editId} user={user} onSubmit={submit} onClose={() => setShowForm(false)} />
      )}
    </div>
  )

  if (embedded) return body

  return (
    <AppLayout user={user} title="공정 유효성 확인" subtitle="ISO 13485 §7.5.6 · VMP · IQ/OQ/PQ · 재밸리데이션 일정 관리">
      {body}
    </AppLayout>
  )
}

// ── 밸리데이션 행 ─────────────────────────────────────────────
function ValRow({ record: r, expanded, activePhase, onSetPhase, onToggle, onEdit, onDelete }) {
  const vt = VAL_TYPES.find(t => t.value === r.valType) || VAL_TYPES[0]
  const st = VAL_STATUSES.find(s => s.value === r.status) || VAL_STATUSES[0]
  const VTIcon = vt.icon
  const daysLeft = r.nextRevalDate ? daysDiff(r.nextRevalDate) : null

  const phases = [
    { key: 'iq', label: 'IQ', items: r.iqItems || [], verdict: r.iqVerdict },
    { key: 'oq', label: 'OQ', items: r.oqItems || [], verdict: r.oqVerdict },
    { key: 'pq', label: 'PQ', items: r.pqItems || [], verdict: r.pqVerdict },
  ]

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: `1px solid ${r.status === 'failed' ? '#FECACA' : daysLeft !== null && daysLeft < 0 ? '#FED7AA' : 'var(--line)'}` }}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={onToggle} style={{ borderBottom: expanded ? '1px solid var(--line)' : 'none' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${vt.color}15` }}>
          <VTIcon size={16} style={{ color: vt.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px]" style={{ color: 'var(--ink-faint)' }}>{r.id}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: `${vt.color}15`, color: vt.color }}>{vt.label}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
            {/* IQ/OQ/PQ 미니 배지 */}
            {phases.map(p => (
              <span key={p.key} className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                style={{ background: p.verdict === true ? '#D1FAE5' : p.verdict === false ? '#FEE2E2' : '#F3F4F6',
                         color: p.verdict === true ? '#059669' : p.verdict === false ? '#DC2626' : '#6B7280' }}>
                {p.label}: {p.verdict === true ? '✓' : p.verdict === false ? '✗' : `${p.items.filter(i => i.pass === true || i.pass === 'true').length}/${p.items.length}`}
              </span>
            ))}
          </div>
          <div className="text-[14px] font-semibold mt-0.5 truncate" style={{ color: 'var(--ink)' }}>{r.title}</div>
          <div className="text-[12px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
            {r.processName} · 담당: {r.responsiblePerson}
            {r.validatedDate && ` · 완료: ${r.validatedDate}`}
            {daysLeft !== null && (
              <span style={{ color: daysLeft < 0 ? '#DC2626' : daysLeft <= 30 ? '#D97706' : '#6B7280', fontWeight: 600 }}>
                {' · '}재밸리: {daysLeft < 0 ? `${Math.abs(daysLeft)}일 초과` : `${daysLeft}일 후`}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={e => { e.stopPropagation(); onEdit() }} className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)', border: 'none', cursor: 'pointer' }}><Edit3 size={13} /></button>
          <button onClick={e => { e.stopPropagation(); onDelete() }} className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', cursor: 'pointer' }}><Trash2 size={13} /></button>
          {expanded ? <ChevronUp size={16} style={{ color: 'var(--ink-faint)' }} /> : <ChevronDown size={16} style={{ color: 'var(--ink-faint)' }} />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 py-4">
          {/* IQ/OQ/PQ 탭 */}
          <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ background: 'var(--bg-soft)', width: 'fit-content' }}>
            {phases.map(p => (
              <button key={p.key} onClick={() => onSetPhase(p.key)}
                className="px-3 py-1.5 rounded-md text-[12px] font-bold transition"
                style={{ background: activePhase === p.key ? 'var(--bg-card)' : 'transparent',
                         color: p.verdict === true ? '#059669' : p.verdict === false ? '#DC2626' : (activePhase === p.key ? 'var(--ink)' : 'var(--ink-faint)'),
                         border: 'none', cursor: 'pointer' }}>
                {p.label} {p.verdict === true ? '✓' : p.verdict === false ? '✗' : ''}
              </button>
            ))}
          </div>

          {/* 선택된 단계 항목 */}
          {phases.filter(p => p.key === activePhase).map(p => (
            <div key={p.key}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                {p.items.map((item, i) => {
                  const ok = item.pass === true || item.pass === 'true'
                  const ng = item.pass === false || item.pass === 'false'
                  return (
                    <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl" style={{ background: ok ? '#D1FAE5' : ng ? '#FEE2E2' : 'var(--bg-soft)' }}>
                      <span style={{ fontSize: 14, color: ok ? '#059669' : ng ? '#DC2626' : '#9CA3AF', flexShrink: 0 }}>
                        {ok ? '✓' : ng ? '✗' : '○'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>{item.name}</div>
                        {item.acceptance && <div className="text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>기준: {item.acceptance}</div>}
                        {item.result && <div className="text-[10.5px]" style={{ color: 'var(--ink)' }}>결과: {item.result}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
              {r[`${p.key}Conclusion`] && (
                <div className="p-3 rounded-xl" style={{ background: 'var(--bg-soft)' }}>
                  <div className="text-[11px] font-bold mb-1" style={{ color: 'var(--ink-faint)' }}>{p.label} 결론</div>
                  <div className="text-[12.5px]" style={{ color: 'var(--ink)' }}>{r[`${p.key}Conclusion`]}</div>
                </div>
              )}
            </div>
          ))}

          {/* 요약 */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div>
              <SL>계획일</SL>
              <div className="text-[12px]" style={{ color: 'var(--ink)' }}>{r.planDate || '-'}</div>
            </div>
            <div>
              <SL>완료일</SL>
              <div className="text-[12px]" style={{ color: 'var(--ink)' }}>{r.validatedDate || '-'}</div>
            </div>
            <div>
              <SL>재밸리데이션</SL>
              <div className="text-[12px]" style={{ color: daysLeft !== null && daysLeft < 0 ? '#DC2626' : 'var(--ink)' }}>
                {r.nextRevalDate || '미설정'}
              </div>
            </div>
          </div>
          {r.notes && (
            <div className="mt-3 p-3 rounded-xl" style={{ background: 'var(--bg-soft)' }}>
              <div className="text-[11px] font-bold mb-1" style={{ color: 'var(--ink-faint)' }}>비고</div>
              <div className="text-[12px]" style={{ color: 'var(--ink)' }}>{r.notes}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── 재밸리데이션 일정 탭 ─────────────────────────────────────
function RevalSchedule({ records }) {
  const withReval = records.filter(r => r.nextRevalDate).sort((a, b) => a.nextRevalDate.localeCompare(b.nextRevalDate))
  const withoutReval = records.filter(r => r.status === 'validated' && !r.nextRevalDate)

  const getUrgency = (dateStr) => {
    const d = daysDiff(dateStr)
    if (d === null) return null
    if (d < 0)   return { label: `${Math.abs(d)}일 초과`, color: '#DC2626', bg: '#FEE2E2' }
    if (d <= 30)  return { label: `${d}일 후`, color: '#DC2626', bg: '#FEE2E2' }
    if (d <= 90)  return { label: `${d}일 후`, color: '#D97706', bg: '#FEF3C7' }
    return { label: `${d}일 후`, color: '#059669', bg: '#D1FAE5' }
  }

  return (
    <div>
      <div className="text-[13px] font-bold mb-4" style={{ color: 'var(--ink)' }}>재밸리데이션 예정 목록</div>
      {withReval.length === 0 && withoutReval.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--ink-faint)' }}>
          <CalendarClock size={36} strokeWidth={1} className="mx-auto mb-2 opacity-30" />
          <div>재밸리데이션 일정이 없습니다</div>
        </div>
      ) : (
        <div className="space-y-2">
          {withReval.map(r => {
            const vt = VAL_TYPES.find(t => t.value === r.valType) || VAL_TYPES[0]
            const urg = getUrgency(r.nextRevalDate)
            const VTIcon = vt.icon
            return (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: 'var(--bg-card)', border: `1px solid ${urg?.color === '#DC2626' ? '#FECACA' : 'var(--line)'}` }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${vt.color}15` }}>
                  <VTIcon size={15} style={{ color: vt.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--ink)' }}>{r.title}</div>
                  <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{r.processName} · 담당: {r.responsiblePerson}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-[12px] font-bold" style={{ color: 'var(--ink)' }}>{r.nextRevalDate}</div>
                  {urg && (
                    <div className="text-[10.5px] px-2 py-0.5 rounded-full mt-0.5 font-bold" style={{ background: urg.bg, color: urg.color }}>
                      {urg.label}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          {withoutReval.map(r => {
            const vt = VAL_TYPES.find(t => t.value === r.valType) || VAL_TYPES[0]
            const VTIcon = vt.icon
            return (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-2xl opacity-60" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${vt.color}15` }}>
                  <VTIcon size={15} style={{ color: vt.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--ink)' }}>{r.title}</div>
                  <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>완료됨 · 재밸리데이션 일정 미설정</div>
                </div>
                <span className="text-[11px]" style={{ color: '#9CA3AF' }}>일정 없음</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── 현황 분석 ─────────────────────────────────────────────────
function ValAnalysis({ records }) {
  const total = records.length || 1
  const byType = VAL_TYPES.map(t => ({
    ...t,
    count: records.filter(r => r.valType === t.value).length,
    validated: records.filter(r => r.valType === t.value && r.status === 'validated').length,
  }))
  const byStatus = VAL_STATUSES.map(s => ({
    ...s,
    count: records.filter(r => r.status === s.value).length,
  }))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>상태별 현황</div>
          <div className="space-y-2">
            {byStatus.filter(s => s.count > 0).map(s => (
              <div key={s.value}>
                <div className="flex justify-between mb-1">
                  <span className="text-[12px] font-semibold" style={{ color: s.color }}>{s.label}</span>
                  <span className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>{s.count}건 ({Math.round(s.count/total*100)}%)</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-soft)' }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.round(s.count/total*100)}%`, background: s.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>유형별 건수 및 완료율</div>
          <div className="space-y-3">
            {byType.sort((a, b) => b.count - a.count).filter(t => t.count > 0).map(t => {
              const rate = t.count ? Math.round((t.validated / t.count) * 100) : 0
              const TIcon = t.icon
              return (
                <div key={t.value} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${t.color}15` }}>
                    <TIcon size={13} style={{ color: t.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-[12px]" style={{ color: 'var(--ink)' }}>{t.label}</span>
                      <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{t.validated}/{t.count} 완료 ({rate}%)</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-soft)' }}>
                      <div className="h-full rounded-full" style={{ width: `${rate}%`, background: t.color }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 밸리데이션 폼 ─────────────────────────────────────────────
function ValForm({ form, fld, updPhaseItem, handleValidatedDate, editId, user, onSubmit, onClose }) {
  const [formTab, setFormTab] = useState('basic')

  const FTABS = [
    { key: 'basic', label: '기본 정보' },
    { key: 'iq',    label: 'IQ' },
    { key: 'oq',    label: 'OQ' },
    { key: 'pq',    label: 'PQ' },
    { key: 'result', label: '완료/재밸리' },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }} onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--line)', width: '100%', maxWidth: 760, boxShadow: '0 24px 64px rgba(0,0,0,0.3)', padding: 28 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-[16px] font-bold" style={{ color: 'var(--ink)' }}>{editId ? '밸리데이션 수정' : '밸리데이션 추가'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)' }}><X size={20} /></button>
        </div>

        {/* 폼 탭 */}
        <div className="flex gap-1 mb-5 p-1 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
          {FTABS.map(t => (
            <button key={t.key} onClick={() => setFormTab(t.key)}
              className="flex-1 py-1.5 rounded-md text-[12px] font-semibold transition"
              style={{ background: formTab === t.key ? 'var(--bg-card)' : 'transparent', color: formTab === t.key ? 'var(--ink)' : 'var(--ink-faint)', border: 'none', cursor: 'pointer' }}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="space-y-3" style={{ minHeight: 280 }}>
          {formTab === 'basic' && (
            <>
              <F l="밸리데이션 제목 *"><input value={form.title} onChange={e => fld('title', e.target.value)} placeholder="예: EO 멸균 공정 밸리데이션" style={IS} className="w-full" /></F>
              <R2>
                <F l="유형">
                  <select value={form.valType} onChange={e => fld('valType', e.target.value)} style={IS} className="w-full">
                    {VAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label} — {t.desc}</option>)}
                  </select>
                </F>
                <F l="상태">
                  <select value={form.status} onChange={e => fld('status', e.target.value)} style={IS} className="w-full">
                    {VAL_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </F>
              </R2>
              <R2>
                <F l="공정명/장비명"><input value={form.processName} onChange={e => fld('processName', e.target.value)} placeholder="예: EO 멸균기 #1" style={IS} className="w-full" /></F>
                <F l="담당자 *"><input value={form.responsiblePerson} onChange={e => fld('responsiblePerson', e.target.value)} placeholder={user?.name || '담당자 이름'} style={IS} className="w-full" /></F>
              </R2>
              <R2>
                <F l="계획일"><input type="date" value={form.planDate} onChange={e => fld('planDate', e.target.value)} style={IS} className="w-full" /></F>
                <F l="재밸리데이션 주기">
                  <select value={form.revalIntervalMonths} onChange={e => fld('revalIntervalMonths', parseInt(e.target.value))} style={IS} className="w-full">
                    {REVAL_INTERVALS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </F>
              </R2>
              <F l="연결 변경 ID (변경 관리 연동)"><input value={form.linkedChangeId} onChange={e => fld('linkedChangeId', e.target.value)} placeholder="CHG-2026-00001" style={IS} className="w-full" /></F>
            </>
          )}

          {['iq', 'oq', 'pq'].includes(formTab) && (
            <PhaseFormSection phase={formTab} form={form} fld={fld} updPhaseItem={updPhaseItem} />
          )}

          {formTab === 'result' && (
            <>
              <div className="p-4 rounded-xl mb-2" style={{ background: '#D1FAE5', border: '1px solid #A7F3D0' }}>
                <div className="text-[12px] font-bold mb-1" style={{ color: '#065F46' }}>유효성 확인 완료 처리</div>
                <div className="text-[11.5px]" style={{ color: '#047857' }}>완료일을 입력하면 상태가 자동으로 "유효성 확인 완료"로 변경되고 재밸리데이션 일정이 계산됩니다.</div>
              </div>
              <R2>
                <F l="유효성 확인 완료일">
                  <input type="date" value={form.validatedDate} onChange={e => handleValidatedDate(e.target.value)} style={IS} className="w-full" />
                </F>
                <F l="재밸리데이션 예정일 (자동 계산)">
                  <input type="date" value={form.nextRevalDate} onChange={e => fld('nextRevalDate', e.target.value)} style={IS} className="w-full" />
                </F>
              </R2>
              <F l="비고"><textarea value={form.notes} onChange={e => fld('notes', e.target.value)} rows={3} placeholder="특이사항, 조건부 합격 내용 등..." style={{ ...IS, resize: 'vertical' }} className="w-full" /></F>
            </>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>취소</button>
          <button onClick={onSubmit} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: '#2563EB', color: 'white', border: 'none', cursor: 'pointer' }}>
            {editId ? '수정 저장' : '밸리데이션 등록'}
          </button>
        </div>
      </div>
    </div>
  )
}

// IQ/OQ/PQ 단계 폼 섹션
function PhaseFormSection({ phase, form, fld, updPhaseItem }) {
  const labelMap = { iq: 'IQ — 설치 적격성 평가', oq: 'OQ — 운전 적격성 평가', pq: 'PQ — 성능 적격성 평가' }
  const items = form[`${phase}Items`] || []
  const verdict = form[`${phase}Verdict`]

  return (
    <>
      <div className="p-3 rounded-xl mb-2" style={{ background: 'var(--bg-soft)' }}>
        <div className="text-[13px] font-bold" style={{ color: 'var(--ink)' }}>{labelMap[phase]}</div>
      </div>
      <R2>
        <F l="시작일"><input type="date" value={form[`${phase}StartDate`]} onChange={e => fld(`${phase}StartDate`, e.target.value)} style={IS} className="w-full" /></F>
        <F l="종료일"><input type="date" value={form[`${phase}EndDate`]}   onChange={e => fld(`${phase}EndDate`,   e.target.value)} style={IS} className="w-full" /></F>
      </R2>
      <div className="text-[11.5px] font-bold mb-2" style={{ color: 'var(--ink-soft)' }}>
        체크 항목 {items.filter(i => i.pass === true || i.pass === 'true').length}/{items.length} 합격
        {verdict === true && <span style={{ color: '#059669', marginLeft: 8 }}>→ 전체 합격 ✓</span>}
        {verdict === false && <span style={{ color: '#DC2626', marginLeft: 8 }}>→ 불합격 항목 있음 ✗</span>}
      </div>
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {items.map((item, i) => {
          const ok = item.pass === true || item.pass === 'true'
          const ng = item.pass === false || item.pass === 'false'
          return (
            <div key={i} className="p-2.5 rounded-xl" style={{ background: ok ? '#D1FAE5' : ng ? '#FEE2E2' : 'var(--bg-soft)' }}>
              <div className="text-[12px] font-semibold mb-1.5" style={{ color: 'var(--ink)' }}>{i+1}. {item.name}</div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="text-[10px] mb-0.5" style={{ color: 'var(--ink-faint)' }}>합격 기준</div>
                  <input value={item.acceptance} onChange={e => updPhaseItem(phase, i, 'acceptance', e.target.value)}
                    placeholder="기준값..." style={{ ...IS, fontSize: 11, padding: '4px 8px' }} className="w-full" />
                </div>
                <div>
                  <div className="text-[10px] mb-0.5" style={{ color: 'var(--ink-faint)' }}>측정/확인 결과</div>
                  <input value={item.result} onChange={e => updPhaseItem(phase, i, 'result', e.target.value)}
                    placeholder="결과값..." style={{ ...IS, fontSize: 11, padding: '4px 8px' }} className="w-full" />
                </div>
                <div>
                  <div className="text-[10px] mb-0.5" style={{ color: 'var(--ink-faint)' }}>판정</div>
                  <select value={item.pass === null || item.pass === undefined ? '' : String(item.pass)}
                    onChange={e => updPhaseItem(phase, i, 'pass', e.target.value === '' ? null : e.target.value === 'true')}
                    style={{ ...IS, fontSize: 11, padding: '4px 8px', fontWeight: 600,
                      color: ok ? '#059669' : ng ? '#DC2626' : 'var(--ink-faint)' }} className="w-full">
                    <option value="">-</option>
                    <option value="true">합격</option>
                    <option value="false">불합격</option>
                  </select>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <F l="결론 / 종합 의견">
        <textarea value={form[`${phase}Conclusion`]} onChange={e => fld(`${phase}Conclusion`, e.target.value)}
          rows={2} placeholder={`${phase.toUpperCase()} 종합 결론...`} style={{ ...IS, resize: 'vertical' }} className="w-full" />
      </F>
    </>
  )
}

function SL({ children }) { return <div className="text-[10px] font-bold mb-0.5" style={{ color: 'var(--ink-faint)' }}>{children}</div> }
function R2({ children }) { return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div> }
function F({ l, children }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-faint)' }}>{l}</label>
      {children}
    </div>
  )
}
const IS  = { border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--ink)', background: 'var(--bg-card)', outline: 'none' }
const SEL = { border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px', fontSize: 13, color: 'var(--ink)', background: 'var(--bg-card)', outline: 'none', cursor: 'pointer' }

function ValEmpty({ onAdd, canRequest }) {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <FlaskConical size={48} strokeWidth={1} className="mx-auto mb-3 opacity-30" style={{ color: '#2563EB' }} />
      <div className="text-[16px] font-bold mb-1" style={{ color: 'var(--ink-soft)' }}>밸리데이션 기록 없음</div>
      <div className="text-[13px] mb-5" style={{ color: 'var(--ink-faint)' }}>
        {canRequest
          ? '제조 공정, 멸균, 포장 등 특수 공정의 유효성 확인을 기록하고 IQ/OQ/PQ 단계를 추적하세요'
          : '품질에서 요청한 밸리데이션 항목이 없습니다. 새 요청은 품질·검사 화면에서 등록합니다.'}
      </div>
      {canRequest && (
        <button onClick={onAdd} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: '#2563EB', color: 'white', border: 'none', cursor: 'pointer' }}>
          <Plus size={15} /> 첫 번째 밸리데이션 등록
        </button>
      )}
    </div>
  )
}
