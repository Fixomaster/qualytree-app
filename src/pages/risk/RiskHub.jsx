// src/pages/risk/RiskHub.jsx
// ISO 14971 위험관리 허브 — FMEA 위험 등록부 · 위험 매트릭스 · 저감 조치
import React, { useState, useMemo } from 'react'
import {
  AlertTriangle, Plus, Trash2, Search, ShieldAlert,
  ChevronDown, ChevronUp, CheckCircle2, Info,
  TrendingDown, Grid, List, Edit3, X,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'

// ── localStorage ──────────────────────────────────────────────
const LS_KEY = 'qualytree.risks'

function lsRead() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}
function lsWrite(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data))
}

function genId() {
  const y = new Date().getFullYear()
  return `RSK-${y}-${String(Date.now()).slice(-5)}`
}

// ── 심각도 / 발생가능성 정의 ──────────────────────────────────
const SEVERITY = [
  { value: 1, label: '1-경미', desc: '일시적 불편, 자연 회복' },
  { value: 2, label: '2-소', desc: '가역적 상해, 의료 개입 불필요' },
  { value: 3, label: '3-중', desc: '가역적 상해, 의료 개입 필요' },
  { value: 4, label: '4-중대', desc: '비가역적 상해 / 영구 장애' },
  { value: 5, label: '5-치명', desc: '사망 또는 생명 위협' },
]

const PROBABILITY = [
  { value: 1, label: '1-거의없음', desc: '< 1/100,000' },
  { value: 2, label: '2-낮음', desc: '1/100,000 ~ 1/10,000' },
  { value: 3, label: '3-보통', desc: '1/10,000 ~ 1/1,000' },
  { value: 4, label: '4-높음', desc: '1/1,000 ~ 1/100' },
  { value: 5, label: '5-매우높음', desc: '> 1/100' },
]

const CONTROL_TYPES = [
  { value: 'inherent', label: '고유 안전 설계' },
  { value: 'protective', label: '보호 수단' },
  { value: 'information', label: '안전 정보 제공' },
  { value: 'none', label: '미조치' },
]

const RISK_CATEGORIES = [
  '생물학적', '전기적', '에너지', '기계적', '방사선', '소프트웨어',
  '사용 오류', '보관·운반', '생체적합성', '기타',
]

// RPN(위험 우선순위) 기준
function rpnColor(rpn) {
  if (rpn >= 15) return { bg: '#FEE2E2', text: '#991B1B', label: '허용불가' }
  if (rpn >= 8)  return { bg: '#FEF3C7', text: '#92400E', label: '조건부허용' }
  return { bg: '#D1FAE5', text: '#065F46', label: '허용가능' }
}

function matrixColor(s, p) {
  const rpn = s * p
  if (rpn >= 15 || (s >= 4 && p >= 3) || (s === 5 && p >= 2)) return '#EF4444'
  if (rpn >= 8  || (s >= 3 && p >= 3)) return '#F59E0B'
  return '#10B981'
}

// ── 빈 폼 ─────────────────────────────────────────────────────
const emptyForm = () => ({
  id: '', title: '', category: '',
  hazard: '', hazardousSituation: '', harm: '',
  severity: 3, probability: 3,
  controlType: 'protective', controlMeasure: '',
  residualSeverity: 2, residualProbability: 2,
  verified: false, verifiedAt: '', notes: '',
  createdBy: '', createdAt: '',
})

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function RiskHub() {
  const user = auth.current()
  const [risks, setRisks] = useState(() => lsRead())
  const [tab, setTab] = useState('register')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [editId, setEditId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [catFilter, setCatFilter] = useState('all')

  const save = (data) => { setRisks(data); lsWrite(data) }

  const openNew = () => {
    setForm(emptyForm())
    setEditId(null)
    setShowForm(true)
  }

  const openEdit = (r) => {
    setForm({ ...r })
    setEditId(r.id)
    setShowForm(true)
  }

  const submit = () => {
    if (!form.title || !form.harm) return alert('제목과 위해(Harm)는 필수입니다.')
    const now = new Date().toISOString()
    if (editId) {
      const updated = risks.map(r => r.id === editId ? { ...form, id: editId } : r)
      save(updated)
    } else {
      const newR = { ...form, id: genId(), createdAt: now, createdBy: user?.name || '-' }
      save([newR, ...risks])
    }
    setShowForm(false)
    setForm(emptyForm())
    setEditId(null)
  }

  const remove = (id) => {
    if (!confirm('삭제하시겠습니까?')) return
    save(risks.filter(r => r.id !== id))
  }

  const toggleVerify = (id) => {
    const updated = risks.map(r => r.id === id
      ? { ...r, verified: !r.verified, verifiedAt: !r.verified ? new Date().toISOString().slice(0, 10) : '' }
      : r)
    save(updated)
  }

  const fld = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const filtered = useMemo(() => {
    let list = risks
    if (catFilter !== 'all') list = list.filter(r => r.category === catFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r => (r.id + r.title + r.harm + r.hazard).toLowerCase().includes(q))
    }
    return list.sort((a, b) => (b.severity * b.probability) - (a.severity * a.probability))
  }, [risks, search, catFilter])

  const stats = {
    total: risks.length,
    high: risks.filter(r => r.severity * r.probability >= 15).length,
    med: risks.filter(r => { const n = r.severity * r.probability; return n >= 8 && n < 15 }).length,
    low: risks.filter(r => r.severity * r.probability < 8).length,
    verified: risks.filter(r => r.verified).length,
  }

  const TABS = [
    { key: 'register', label: '위험 등록부', icon: List },
    { key: 'matrix',   label: '위험 매트릭스', icon: Grid },
    { key: 'control',  label: '저감 조치 현황', icon: TrendingDown },
  ]

  return (
    <AppLayout user={user} title="위험관리" subtitle="ISO 14971 위험분석 · FMEA · 위험 등록부">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto">

        {/* KPI 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: '총 위험 항목', count: stats.total, color: '#6B7280' },
            { label: '허용불가 (빨강)', count: stats.high, color: '#EF4444' },
            { label: '조건부허용 (노랑)', count: stats.med, color: '#F59E0B' },
            { label: '허용가능 (초록)', count: stats.low, color: '#10B981' },
            { label: '검증 완료', count: stats.verified, color: '#3B82F6' },
          ].map(s => (
            <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="text-[22px] font-bold" style={{ color: s.color }}>{s.count}</div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: 'var(--bg-soft)', width: 'fit-content' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition"
              style={{
                background: tab === t.key ? 'var(--bg-card)' : 'transparent',
                color: tab === t.key ? 'var(--ink)' : 'var(--ink-faint)',
                border: 'none', cursor: 'pointer',
                boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {/* ── 위험 등록부 탭 ── */}
        {tab === 'register' && (
          <>
            <div className="flex gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-[200px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                <Search size={14} style={{ color: 'var(--ink-faint)' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="위험ID · 제목 · 위해 검색..."
                  className="flex-1 text-[13px] outline-none"
                  style={{ background: 'none', border: 'none', color: 'var(--ink)' }}
                />
              </div>
              <select
                value={catFilter}
                onChange={e => setCatFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-[13px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}
              >
                <option value="all">전체 유형</option>
                {RISK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button
                onClick={openNew}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold"
                style={{ background: '#EF4444', color: 'white', border: 'none', cursor: 'pointer' }}
              >
                <Plus size={14} /> 위험 항목 추가
              </button>
            </div>

            {filtered.length === 0 ? (
              <EmptyState onAdd={openNew} />
            ) : (
              <div className="space-y-2">
                {filtered.map(r => (
                  <RiskRow
                    key={r.id}
                    risk={r}
                    expanded={expandedId === r.id}
                    onToggle={() => setExpandedId(expandedId === r.id ? null : r.id)}
                    onEdit={() => openEdit(r)}
                    onDelete={() => remove(r.id)}
                    onVerify={() => toggleVerify(r.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── 위험 매트릭스 탭 ── */}
        {tab === 'matrix' && <RiskMatrix risks={risks} />}

        {/* ── 저감 조치 현황 탭 ── */}
        {tab === 'control' && <ControlStatus risks={risks} onEdit={openEdit} />}

        {/* ISO 안내 */}
        <div className="mt-6 p-4 rounded-2xl" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
          <div className="text-[12.5px] font-semibold mb-1.5" style={{ color: 'var(--ink-soft)' }}>
            📋 ISO 14971:2019 위험관리 프로세스
          </div>
          <div className="text-[12px]" style={{ color: 'var(--ink-faint)', lineHeight: 1.7 }}>
            위험 식별 → 위험 추정(심각도×발생가능성) → 위험 평가(허용기준 비교) → 위험 통제(저감조치) → 잔여위험 평가 → 전체잔여위험 평가 → 위험관리 보고서
          </div>
        </div>
      </div>

      {/* 위험 추가/수정 모달 */}
      {showForm && (
        <RiskForm
          form={form}
          fld={fld}
          editId={editId}
          onSubmit={submit}
          onClose={() => setShowForm(false)}
        />
      )}
    </AppLayout>
  )
}

// ── 위험 행 컴포넌트 ──────────────────────────────────────────
function RiskRow({ risk, expanded, onToggle, onEdit, onDelete, onVerify }) {
  const rpn = risk.severity * risk.probability
  const residualRpn = risk.residualSeverity * risk.residualProbability
  const { bg, text, label } = rpnColor(rpn)

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
      {/* 헤더 행 */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={onToggle}
        style={{ borderBottom: expanded ? '1px solid var(--line)' : 'none' }}
      >
        {/* RPN 배지 */}
        <div
          className="flex-shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center"
          style={{ background: bg }}
        >
          <div className="text-[17px] font-bold leading-none" style={{ color: text }}>{rpn}</div>
          <div className="text-[8px] font-semibold mt-0.5" style={{ color: text }}>RPN</div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[11px]" style={{ color: 'var(--ink-faint)' }}>{risk.id}</span>
            {risk.category && (
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>
                {risk.category}
              </span>
            )}
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: bg, color: text }}
            >
              {label}
            </span>
            {risk.verified && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: '#DBEAFE', color: '#1D4ED8' }}>
                ✓ 검증완료
              </span>
            )}
          </div>
          <div className="text-[13.5px] font-semibold mt-0.5 truncate" style={{ color: 'var(--ink)' }}>
            {risk.title || '(제목 없음)'}
          </div>
          <div className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--ink-faint)' }}>
            위해: {risk.harm || '-'} &nbsp;|&nbsp; 심각도 {risk.severity} × 발생가능성 {risk.probability}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={e => { e.stopPropagation(); onVerify() }}
            title={risk.verified ? '검증 취소' : '검증 완료 처리'}
            className="p-1.5 rounded-lg"
            style={{ background: risk.verified ? '#DBEAFE' : 'var(--bg-soft)', color: risk.verified ? '#1D4ED8' : 'var(--ink-faint)', border: 'none', cursor: 'pointer' }}
          >
            <CheckCircle2 size={14} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onEdit() }}
            className="p-1.5 rounded-lg"
            style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)', border: 'none', cursor: 'pointer' }}
          >
            <Edit3 size={14} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="p-1.5 rounded-lg"
            style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', cursor: 'pointer' }}
          >
            <Trash2 size={13} />
          </button>
          {expanded ? <ChevronUp size={16} style={{ color: 'var(--ink-faint)' }} /> : <ChevronDown size={16} style={{ color: 'var(--ink-faint)' }} />}
        </div>
      </div>

      {/* 확장 상세 */}
      {expanded && (
        <div className="px-4 py-4 grid gap-4 md:grid-cols-2">
          <div>
            <Label>위험요인 (Hazard)</Label>
            <Value>{risk.hazard || '-'}</Value>
            <Label>위험 상황 (Hazardous Situation)</Label>
            <Value>{risk.hazardousSituation || '-'}</Value>
            <Label>위해 (Harm)</Label>
            <Value>{risk.harm || '-'}</Value>
          </div>
          <div>
            <Label>초기 위험 평가</Label>
            <div className="flex gap-3 mb-3">
              <ScoreBox label="심각도" val={risk.severity} />
              <span className="self-center text-[18px] font-bold" style={{ color: 'var(--ink-faint)' }}>×</span>
              <ScoreBox label="발생가능성" val={risk.probability} />
              <span className="self-center text-[18px] font-bold" style={{ color: 'var(--ink-faint)' }}>=</span>
              <ScoreBox label="RPN" val={rpn} color={text} bg={bg} />
            </div>
            <Label>위험 통제 조치</Label>
            <Value>{risk.controlMeasure || '-'} ({CONTROL_TYPES.find(c => c.value === risk.controlType)?.label || '-'})</Value>
            <Label>잔여 위험 (저감 후)</Label>
            <div className="flex gap-3">
              <ScoreBox label="잔여 심각도" val={risk.residualSeverity} />
              <span className="self-center text-[18px] font-bold" style={{ color: 'var(--ink-faint)' }}>×</span>
              <ScoreBox label="잔여 발생가능성" val={risk.residualProbability} />
              <span className="self-center text-[18px] font-bold" style={{ color: 'var(--ink-faint)' }}>=</span>
              <ScoreBox label="잔여 RPN" val={residualRpn} color={rpnColor(residualRpn).text} bg={rpnColor(residualRpn).bg} />
            </div>
          </div>
          {risk.notes && (
            <div className="md:col-span-2">
              <Label>비고</Label>
              <Value>{risk.notes}</Value>
            </div>
          )}
          <div className="md:col-span-2 text-[11px]" style={{ color: 'var(--ink-faint)' }}>
            등록: {risk.createdBy} · {risk.createdAt?.slice(0, 10) || '-'}
            {risk.verified && ` · 검증: ${risk.verifiedAt}`}
          </div>
        </div>
      )}
    </div>
  )
}

function Label({ children }) {
  return <div className="text-[11px] font-semibold mb-1 mt-2.5" style={{ color: 'var(--ink-faint)' }}>{children}</div>
}
function Value({ children }) {
  return <div className="text-[13px] p-2 rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink)', lineHeight: 1.5 }}>{children}</div>
}
function ScoreBox({ label, val, color, bg }) {
  return (
    <div className="flex flex-col items-center" style={{ minWidth: 52 }}>
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-[20px] font-bold"
        style={{ background: bg || 'var(--bg-soft)', color: color || 'var(--ink)' }}
      >{val}</div>
      <div className="text-[9px] mt-1 text-center" style={{ color: 'var(--ink-faint)' }}>{label}</div>
    </div>
  )
}

// ── 위험 매트릭스 ─────────────────────────────────────────────
function RiskMatrix({ risks }) {
  // 각 셀에 해당하는 위험 수 계산
  const cellRisks = {}
  risks.forEach(r => {
    const key = `${r.severity}-${r.probability}`
    if (!cellRisks[key]) cellRisks[key] = []
    cellRisks[key].push(r)
  })

  return (
    <div>
      <div className="mb-4 flex items-center gap-4 flex-wrap">
        {[
          { color: '#EF4444', bg: '#FEE2E2', label: '허용불가 (RPN≥15)' },
          { color: '#F59E0B', bg: '#FEF3C7', label: '조건부 허용 (RPN 8~14)' },
          { color: '#10B981', bg: '#D1FAE5', label: '허용가능 (RPN<8)' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5 text-[12px]">
            <div className="w-4 h-4 rounded" style={{ background: l.bg, border: `2px solid ${l.color}` }} />
            <span style={{ color: 'var(--ink-soft)' }}>{l.label}</span>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: 480 }}>
          {/* Y축 라벨 */}
          <div className="flex items-center mb-1" style={{ paddingLeft: 90 }}>
            {[1,2,3,4,5].map(p => (
              <div key={p} className="flex-1 text-center text-[11px] font-semibold" style={{ color: 'var(--ink-faint)' }}>
                발생가능성 {p}
              </div>
            ))}
          </div>

          {/* 격자 */}
          {[5,4,3,2,1].map(s => (
            <div key={s} className="flex items-center mb-1.5">
              {/* X축 라벨 */}
              <div className="text-[11px] font-semibold text-right pr-2 flex-shrink-0" style={{ width: 88, color: 'var(--ink-faint)' }}>
                심각도 {s}
              </div>
              {[1,2,3,4,5].map(p => {
                const key = `${s}-${p}`
                const items = cellRisks[key] || []
                const color = matrixColor(s, p)
                const rpn = s * p
                const isHigh = rpn >= 15 || (s >= 4 && p >= 3) || (s === 5 && p >= 2)
                const isMed = !isHigh && (rpn >= 8 || (s >= 3 && p >= 3))
                const bg = isHigh ? '#FEE2E2' : isMed ? '#FEF3C7' : '#D1FAE5'

                return (
                  <div
                    key={p}
                    className="flex-1 rounded-xl mx-0.5 flex flex-col items-center justify-center"
                    style={{
                      height: 72,
                      background: bg,
                      border: `2px solid ${items.length > 0 ? color : 'transparent'}`,
                      position: 'relative',
                    }}
                    title={`심각도 ${s} × 발생가능성 ${p} = RPN ${rpn}\n위험 ${items.length}건`}
                  >
                    <div className="text-[10px] font-bold" style={{ color: isHigh ? '#991B1B' : isMed ? '#92400E' : '#065F46' }}>
                      {rpn}
                    </div>
                    {items.length > 0 && (
                      <div
                        className="text-[11px] font-bold mt-0.5 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: color, color: 'white' }}
                      >
                        {items.length}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}

          <div className="text-center text-[11px] mt-2" style={{ color: 'var(--ink-faint)' }}>
            숫자 = RPN · 원 = 등록된 위험 건수
          </div>
        </div>
      </div>

      {/* 고위험 항목 목록 */}
      {risks.filter(r => r.severity * r.probability >= 15).length > 0 && (
        <div className="mt-6">
          <div className="text-[13px] font-bold mb-3 flex items-center gap-2" style={{ color: '#EF4444' }}>
            <AlertTriangle size={15} /> 허용불가 위험 항목 (즉시 조치 필요)
          </div>
          <div className="space-y-2">
            {risks
              .filter(r => r.severity * r.probability >= 15)
              .map(r => (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#EF4444' }}>
                    <span className="text-[14px] font-bold text-white">{r.severity * r.probability}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[11px]" style={{ color: '#991B1B' }}>{r.id}</div>
                    <div className="text-[13px] font-semibold truncate" style={{ color: '#7F1D1D' }}>{r.title}</div>
                    <div className="text-[11px]" style={{ color: '#991B1B' }}>위해: {r.harm}</div>
                  </div>
                  {r.verified && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: '#DBEAFE', color: '#1D4ED8' }}>검증완료</span>
                  )}
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}

// ── 저감 조치 현황 탭 ─────────────────────────────────────────
function ControlStatus({ risks, onEdit }) {
  const byType = CONTROL_TYPES.map(ct => ({
    ...ct,
    items: risks.filter(r => r.controlType === ct.value),
  }))

  const reductionRate = risks.length === 0 ? 0 : Math.round(
    risks.filter(r => {
      const before = r.severity * r.probability
      const after = r.residualSeverity * r.residualProbability
      return after < before
    }).length / risks.length * 100
  )

  const avgReduction = risks.length === 0 ? 0 : Math.round(
    risks.reduce((acc, r) => {
      const before = r.severity * r.probability
      const after = r.residualSeverity * r.residualProbability
      return acc + Math.max(0, before - after)
    }, 0) / risks.length * 10
  ) / 10

  return (
    <div>
      {/* 요약 지표 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[28px] font-bold" style={{ color: '#10B981' }}>{reductionRate}%</div>
          <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>위험 저감 성공률</div>
        </div>
        <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[28px] font-bold" style={{ color: '#3B82F6' }}>{avgReduction}</div>
          <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>평균 RPN 감소</div>
        </div>
        <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[28px] font-bold" style={{ color: '#8B5CF6' }}>{risks.filter(r => r.verified).length}</div>
          <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>검증 완료 항목</div>
        </div>
      </div>

      {/* 조치 유형별 */}
      {byType.map(ct => ct.items.length > 0 && (
        <div key={ct.value} className="mb-5">
          <div className="text-[13px] font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--ink)' }}>
            <TrendingDown size={14} style={{ color: '#10B981' }} />
            {ct.label} ({ct.items.length}건)
          </div>
          <div className="space-y-2">
            {ct.items.map(r => {
              const before = r.severity * r.probability
              const after = r.residualSeverity * r.residualProbability
              const reduced = before - after
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', cursor: 'pointer' }}
                  onClick={() => onEdit(r)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px]" style={{ color: 'var(--ink-faint)' }}>{r.id}</span>
                      <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--ink)' }}>{r.title}</span>
                    </div>
                    <div className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--ink-faint)' }}>
                      {r.controlMeasure || '(저감 조치 미입력)'}
                    </div>
                  </div>
                  {/* RPN 변화 */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-center">
                      <div className="text-[14px] font-bold" style={{ color: rpnColor(before).text }}>{before}</div>
                      <div className="text-[9px]" style={{ color: 'var(--ink-faint)' }}>초기</div>
                    </div>
                    <div className="text-[12px]" style={{ color: reduced > 0 ? '#10B981' : '#EF4444' }}>
                      {reduced > 0 ? `▼${reduced}` : reduced === 0 ? '→' : `▲${Math.abs(reduced)}`}
                    </div>
                    <div className="text-center">
                      <div className="text-[14px] font-bold" style={{ color: rpnColor(after).text }}>{after}</div>
                      <div className="text-[9px]" style={{ color: 'var(--ink-faint)' }}>잔여</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {risks.length === 0 && (
        <div className="text-center py-16" style={{ color: 'var(--ink-faint)' }}>
          <TrendingDown size={40} strokeWidth={1.2} className="mx-auto mb-3 opacity-30" />
          <div>위험 등록부에 항목을 추가하면 저감 조치 현황이 표시됩니다</div>
        </div>
      )}
    </div>
  )
}

// ── 위험 추가/수정 폼 모달 ─────────────────────────────────────
function RiskForm({ form, fld, editId, onSubmit, onClose }) {
  const rpn = form.severity * form.probability
  const resRpn = form.residualSeverity * form.residualProbability

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '32px 16px', overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 20,
          border: '1px solid var(--line)',
          width: '100%', maxWidth: 680,
          boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
          padding: 28,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="text-[16px] font-bold" style={{ color: 'var(--ink)' }}>
            {editId ? '위험 항목 수정' : '위험 항목 추가'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)' }}>
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* 기본 정보 */}
          <Row2>
            <Field label="제목 *">
              <input value={form.title} onChange={e => fld('title', e.target.value)} placeholder="위험 항목 제목..." className="w-full" style={inputStyle} />
            </Field>
            <Field label="위험 유형">
              <select value={form.category} onChange={e => fld('category', e.target.value)} className="w-full" style={inputStyle}>
                <option value="">선택...</option>
                {RISK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </Row2>

          {/* 위험 분석 */}
          <Field label="위험요인 (Hazard) — 위해를 유발할 수 있는 잠재적 원인">
            <input value={form.hazard} onChange={e => fld('hazard', e.target.value)} placeholder="예: 고전압 노출, 소프트웨어 오류..." className="w-full" style={inputStyle} />
          </Field>
          <Field label="위험 상황 (Hazardous Situation) — 위험요인이 발생하는 상황">
            <input value={form.hazardousSituation} onChange={e => fld('hazardousSituation', e.target.value)} placeholder="예: 사용자가 기기 청소 중 전원 미차단..." className="w-full" style={inputStyle} />
          </Field>
          <Field label="위해 (Harm) * — 실제로 발생하는 피해">
            <input value={form.harm} onChange={e => fld('harm', e.target.value)} placeholder="예: 전기 쇼크, 데이터 오류로 인한 오진..." className="w-full" style={inputStyle} />
          </Field>

          {/* 초기 위험 평가 */}
          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-soft)' }}>
            <div className="text-[12px] font-bold mb-3" style={{ color: 'var(--ink-soft)' }}>초기 위험 평가</div>
            <Row2>
              <Field label={`심각도 (Severity): ${form.severity}`}>
                <select value={form.severity} onChange={e => fld('severity', +e.target.value)} className="w-full" style={inputStyle}>
                  {SEVERITY.map(s => <option key={s.value} value={s.value}>{s.label} — {s.desc}</option>)}
                </select>
              </Field>
              <Field label={`발생가능성 (Probability): ${form.probability}`}>
                <select value={form.probability} onChange={e => fld('probability', +e.target.value)} className="w-full" style={inputStyle}>
                  {PROBABILITY.map(p => <option key={p.value} value={p.value}>{p.label} — {p.desc}</option>)}
                </select>
              </Field>
            </Row2>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>RPN =</span>
              <span className="text-[18px] font-bold px-3 py-1 rounded-lg" style={{ background: rpnColor(rpn).bg, color: rpnColor(rpn).text }}>
                {rpn} ({rpnColor(rpn).label})
              </span>
            </div>
          </div>

          {/* 위험 통제 */}
          <Row2>
            <Field label="통제 방법">
              <select value={form.controlType} onChange={e => fld('controlType', e.target.value)} className="w-full" style={inputStyle}>
                {CONTROL_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
            <div /> {/* spacer */}
          </Row2>
          <Field label="위험 통제 조치 내용">
            <textarea value={form.controlMeasure} onChange={e => fld('controlMeasure', e.target.value)} rows={2} placeholder="구체적인 저감 조치 내용..." className="w-full" style={{ ...inputStyle, resize: 'vertical' }} />
          </Field>

          {/* 잔여 위험 평가 */}
          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-soft)' }}>
            <div className="text-[12px] font-bold mb-3" style={{ color: 'var(--ink-soft)' }}>잔여 위험 평가 (저감 조치 후)</div>
            <Row2>
              <Field label={`잔여 심각도: ${form.residualSeverity}`}>
                <select value={form.residualSeverity} onChange={e => fld('residualSeverity', +e.target.value)} className="w-full" style={inputStyle}>
                  {SEVERITY.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </Field>
              <Field label={`잔여 발생가능성: ${form.residualProbability}`}>
                <select value={form.residualProbability} onChange={e => fld('residualProbability', +e.target.value)} className="w-full" style={inputStyle}>
                  {PROBABILITY.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </Field>
            </Row2>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>잔여 RPN =</span>
              <span className="text-[18px] font-bold px-3 py-1 rounded-lg" style={{ background: rpnColor(resRpn).bg, color: rpnColor(resRpn).text }}>
                {resRpn} ({rpnColor(resRpn).label})
              </span>
            </div>
          </div>

          <Field label="비고">
            <textarea value={form.notes} onChange={e => fld('notes', e.target.value)} rows={2} placeholder="추가 메모..." className="w-full" style={{ ...inputStyle, resize: 'vertical' }} />
          </Field>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
            취소
          </button>
          <button onClick={onSubmit} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: '#EF4444', color: 'white', border: 'none', cursor: 'pointer' }}>
            {editId ? '수정 저장' : '위험 항목 등록'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Row2({ children }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
}
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-faint)' }}>{label}</label>
      {children}
    </div>
  )
}
const inputStyle = {
  border: '1px solid var(--line)',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 13,
  color: 'var(--ink)',
  background: 'var(--bg-card)',
  outline: 'none',
}

// ── Empty State ────────────────────────────────────────────────
function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <ShieldAlert size={48} strokeWidth={1} className="mb-3" style={{ color: '#EF4444', opacity: 0.5 }} />
      <div className="text-[16px] font-bold mb-1" style={{ color: 'var(--ink-soft)' }}>위험 항목 없음</div>
      <div className="text-[13px] mb-5" style={{ color: 'var(--ink-faint)' }}>
        ISO 14971에 따라 제품의 위험요인을 식별하고 등록하세요
      </div>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold"
        style={{ background: '#EF4444', color: 'white', border: 'none', cursor: 'pointer' }}
      >
        <Plus size={15} /> 첫 번째 위험 항목 추가
      </button>
      <div className="mt-6 p-4 rounded-xl max-w-md" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
        <div className="text-[12px] font-semibold mb-1" style={{ color: '#92400E' }}>💡 위험 항목 예시</div>
        <div className="text-[12px] text-left space-y-1" style={{ color: '#78350F', lineHeight: 1.6 }}>
          <div>• 전기 충격 (심각도 5 × 발생가능성 2 = RPN 10)</div>
          <div>• 소프트웨어 오류로 인한 오진 (심각도 4 × 발생가능성 3)</div>
          <div>• 부품 이물질 잔류 (심각도 3 × 발생가능성 2)</div>
        </div>
      </div>
    </div>
  )
}
