// src/pages/quality-objectives/QualityObjectivesHub.jsx
// ISO 13485 §5.4.1 품질 목표 / §5.4.2 QMS 기획
import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Save, Edit2, Trash2, Target, TrendingUp,
  TrendingDown, Minus, AlertTriangle, CheckCircle2,
  BarChart2, Calendar, Link2, ChevronDown, ChevronUp,
  RefreshCw, Award, ExternalLink,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'
import { LS_KEY, OBJ_STATUSES, calcRate, autoStatus, LINKED_KPI_OPTIONS, computeLinkedActual } from '../../lib/qualityObjectivesState'
import { buildSnapshot } from '../../lib/managementReviewState'

// ── 상수 ─────────────────────────────────────────────────────
const LS_KEY_POLICY = 'qualytree.quality_policy'

const PERIODS = ['월간', '분기', '반기', '연간']
const YEARS = ['2023', '2024', '2025', '2026', '2027']

const DEPT_LIST = [
  '전사', '품질부(QUA)', '생산부(MFG)', '영업부(SAL)',
  '구매부(PUR)', '설비부(EQP)', '개발부(DEV)', '경영검토(MR)',
  '교육훈련(TRN)', '인허가(RA)', '내부감사(AUD)',
]

const KPI_UNIT_PRESETS = [
  '%', 'ppm', '건', '일', '시간', '점', '개', '명', '회', '기타',
]

const CATEGORIES = [
  '제품 품질', '고객 만족', '공정 효율', '공급업체 관리', '인적 자원',
  '법규 준수', '지속적 개선', '위험 관리', '기타',
]

function genId() { return `QO-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }
function today() { return new Date().toISOString().slice(0, 10) }

const EMPTY_FORM = {
  title: '', category: '제품 품질', dept: '품질부(QUA)',
  period: '연간', year: String(new Date().getFullYear()),
  startDate: today(), endDate: '',
  kpiName: '', unit: '%', direction: 'higher',
  baselineValue: '', targetValue: '', actualValue: '',
  status: 'not_started', autoCalc: true,
  linkedKpiId: '',
  linkedKpi: 'other',   // #364: 연동 KPI 선택 — 'other'가 아니면 실적값을 실제 데이터에서 자동으로 불러옴
  description: '', actions: '',
  notes: '',
  actuals: [],   // monthly/quarterly actuals [{date, value, note}]
}

// ── 메인 ─────────────────────────────────────────────────────
export default function QualityObjectivesHub() {
  const user = auth.current()
  return (
    <AppLayout user={user} title="품질 목표 관리" subtitle="ISO 13485 §5.4.1 품질 목표 / §5.4.2 QMS 기획">
      <QualityObjectivesPanel />
    </AppLayout>
  )
}

// #360: 품질방침과 메뉴 통합 — QualityPolicyHub(경영의지·품질방침) 탭 안에서도 렌더링되도록
// AppLayout 없이 내용만 export. /quality-objectives 라우트(딥링크 하위호환)는 위 래퍼가 담당.
export function QualityObjectivesPanel() {
  const canEdit = auth.current()?.level >= 2

  const [objectives, setObjectives] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
  })

  const [tab, setTab] = useState('list')    // list | detail | analysis
  const [selectedId, setSelectedId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [filterDept, setFilterDept] = useState('all')
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()))
  const [filterStatus, setFilterStatus] = useState('all')
  const [showActualForm, setShowActualForm] = useState(false)
  const [actualForm, setActualForm] = useState({ date: today(), value: '', note: '' })

  function save(list) { setObjectives(list); localStorage.setItem(LS_KEY, JSON.stringify(list)) }

  function submitObj() {
    if (!form.title.trim()) return alert('목표명을 입력하세요.')
    if (!form.targetValue) return alert('목표값을 입력하세요.')
    const computed = { ...form }
    if (form.autoCalc) computed.status = autoStatus(computed)
    const next = editId
      ? objectives.map(o => o.id === editId ? { ...o, ...computed } : o)
      : [{ id: genId(), createdAt: today(), actuals: [], ...computed }, ...objectives]
    save(next)
    setShowForm(false); setForm(EMPTY_FORM); setEditId(null)
  }

  function deleteObj(id) {
    if (!confirm('품질 목표를 삭제하시겠습니까?')) return
    save(objectives.filter(o => o.id !== id))
    if (selectedId === id) { setSelectedId(null); setTab('list') }
  }

  function addActual(objId) {
    if (!actualForm.value) return alert('실적값을 입력하세요.')
    const entry = { ...actualForm, id: Date.now() }
    const next = objectives.map(o => {
      if (o.id !== objId) return o
      const updated = { ...o, actuals: [...(o.actuals || []), entry], actualValue: actualForm.value }
      if (updated.autoCalc) updated.status = autoStatus(updated)
      return updated
    })
    save(next)
    setActualForm({ date: today(), value: '', note: '' })
    setShowActualForm(false)
  }

  const selected = objectives.find(o => o.id === selectedId)

  const filtered = useMemo(() => objectives.filter(o => {
    if (filterDept !== 'all' && o.dept !== filterDept) return false
    if (filterYear !== 'all' && o.year !== filterYear) return false
    if (filterStatus !== 'all') {
      const st = o.autoCalc ? autoStatus(o) : (o.status || 'not_started')
      if (st !== filterStatus) return false
    }
    return true
  }), [objectives, filterDept, filterYear, filterStatus])

  // 분석
  const analysis = useMemo(() => {
    const yr = objectives.filter(o => o.year === filterYear)
    const byStatus = {}
    Object.keys(OBJ_STATUSES).forEach(k => {
      byStatus[k] = yr.filter(o => (o.autoCalc ? autoStatus(o) : o.status) === k).length
    })
    const byDept = {}
    yr.forEach(o => { byDept[o.dept] = (byDept[o.dept] || 0) + 1 })
    const achieved = yr.filter(o => (o.autoCalc ? autoStatus(o) : o.status) === 'achieved').length
    const total = yr.length
    const achieveRate = total > 0 ? Math.round((achieved / total) * 100) : null
    const missed = yr.filter(o => (o.autoCalc ? autoStatus(o) : o.status) === 'missed')
    const atRisk = yr.filter(o => (o.autoCalc ? autoStatus(o) : o.status) === 'at_risk')
    return { byStatus, byDept, achieved, total, achieveRate, missed, atRisk }
  }, [objectives, filterYear])

  return (
      <div className="px-6 lg:px-8 py-6 max-w-[1400px] mx-auto">

        {/* 탭 */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-soft)' }}>
          {[
            { key: 'list',     label: `목표 목록 (${objectives.length})` },
            { key: 'analysis', label: '달성 현황' },
          ].map(t => (
            <button key={t.key} onClick={() => !t.disabled && setTab(t.key)} disabled={t.disabled}
              className="px-4 py-1.5 rounded-lg text-[13px] font-semibold transition"
              style={{
                background: tab === t.key ? 'var(--bg-card)' : 'transparent',
                color: t.disabled ? 'var(--ink-faint)' : tab === t.key ? 'var(--moss)' : 'var(--ink-soft)',
                boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                border: 'none', cursor: t.disabled ? 'not-allowed' : 'pointer',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── 목록 탭 ── */}
        {tab === 'list' && (
          <div>
            {/* 필터 */}
            <div className="flex flex-wrap gap-2 mb-4 items-center">
              <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-[13px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                <option value="all">전체 연도</option>
                {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
              </select>
              <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-[13px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                <option value="all">전체 부서</option>
                {DEPT_LIST.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-[13px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                <option value="all">전체 상태</option>
                {Object.entries(OBJ_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              {canEdit && (
                <button onClick={() => { setForm(EMPTY_FORM); setEditId(null); setShowForm(true) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold ml-auto"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} /> 품질 목표 등록
                </button>
              )}
            </div>

            {showForm && (
              <ObjForm form={form} setForm={setForm} onSave={submitObj}
                onCancel={() => { setShowForm(false); setForm(EMPTY_FORM); setEditId(null) }}
                isEdit={!!editId} />
            )}

            {/* 경보 */}
            {(analysis.missed.length > 0 || analysis.atRisk.length > 0) && tab === 'list' && (
              <div className="mb-4 space-y-2">
                {analysis.missed.length > 0 && (
                  <div className="p-3 rounded-xl text-[12.5px] flex items-center gap-2 flex-wrap"
                    style={{ background: '#FEE2E2', border: '1px solid #FECACA', color: '#991B1B' }}>
                    <AlertTriangle size={14} />
                    미달성 목표 {analysis.missed.length}건:
                    {analysis.missed.slice(0, 3).map(o => (
                      <span key={o.id} className="font-bold cursor-pointer underline" onClick={() => { setSelectedId(o.id); setTab('detail') }}>{o.title}</span>
                    ))}
                  </div>
                )}
                {analysis.atRisk.length > 0 && (
                  <div className="p-3 rounded-xl text-[12.5px] flex items-center gap-2 flex-wrap"
                    style={{ background: '#FEF3C7', border: '1px solid #FDE68A', color: '#92400E' }}>
                    <AlertTriangle size={14} />
                    위험 목표 {analysis.atRisk.length}건:
                    {analysis.atRisk.slice(0, 3).map(o => (
                      <span key={o.id} className="font-bold cursor-pointer underline" onClick={() => { setSelectedId(o.id); setTab('detail') }}>{o.title}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {filtered.length === 0 ? (
              <div className="text-center py-20" style={{ color: 'var(--ink-faint)' }}>
                <Target size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <div className="text-[14px]">등록된 품질 목표가 없습니다.</div>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(obj => {
                  const effStatus = obj.autoCalc ? autoStatus(obj) : (obj.status || 'not_started')
                  const sm = OBJ_STATUSES[effStatus] || OBJ_STATUSES.not_started
                  const rate = calcRate(obj)
                  const isHigher = obj.direction !== 'lower'
                  return (
                    <div key={obj.id} className="p-4 rounded-2xl cursor-pointer transition"
                      style={{ background: 'var(--bg-card)', border: '1.5px solid var(--line)' }}
                      onClick={() => { setSelectedId(obj.id); setTab('detail') }}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-[11px] font-mono" style={{ color: 'var(--ink-faint)' }}>{obj.id}</span>
                            <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
                            <span className="text-[10.5px] px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>{obj.dept} · {obj.year}년 · {obj.period}</span>
                          </div>
                          <div className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>{obj.title}</div>
                          <div className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>{obj.kpiName} · {obj.category}</div>
                        </div>

                        {/* KPI 수치 */}
                        <div className="text-right shrink-0">
                          <div className="flex items-center gap-2 justify-end mb-1">
                            <span className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>목표: <strong style={{ color: 'var(--ink)' }}>{obj.targetValue}{obj.unit}</strong></span>
                            {obj.actualValue && (
                              <span className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>실적: <strong style={{ color: sm.color }}>{obj.actualValue}{obj.unit}</strong></span>
                            )}
                          </div>
                          {rate !== null && (
                            <div className="flex items-center gap-1 justify-end">
                              {rate >= 100
                                ? <TrendingUp size={12} style={{ color: '#059669' }} />
                                : rate < 60
                                ? <TrendingDown size={12} style={{ color: '#DC2626' }} />
                                : <Minus size={12} style={{ color: '#D97706' }} />}
                              <span className="text-[13px] font-bold" style={{ color: sm.color }}>{rate}%</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 진행바 */}
                      {rate !== null && (
                        <div className="mt-2">
                          <div className="h-2 rounded-full" style={{ background: 'var(--bg-soft)' }}>
                            <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(rate, 100)}%`, background: sm.color }} />
                          </div>
                        </div>
                      )}

                      {canEdit && (
                        <div className="flex gap-1 mt-3 flex-wrap" onClick={e => e.stopPropagation()}>
                          <button onClick={() => { setForm({ ...EMPTY_FORM, ...obj }); setEditId(obj.id); setShowForm(true) }}
                            className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                            <Edit2 size={12} style={{ color: 'var(--ink-soft)' }} />
                          </button>
                          <button onClick={() => deleteObj(obj.id)}
                            className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', border: '1px solid #FECACA', cursor: 'pointer' }}>
                            <Trash2 size={12} style={{ color: '#DC2626' }} />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── 상세 탭 ── */}
        {tab === 'detail' && selected && (
          <DetailView
            obj={selected} canEdit={canEdit}
            showActualForm={showActualForm} setShowActualForm={setShowActualForm}
            actualForm={actualForm} setActualForm={setActualForm}
            addActual={addActual} autoStatus={autoStatus} calcRate={calcRate}
          />
        )}

        {/* ── 분석 탭 ── */}
        {tab === 'analysis' && (
          <AnalysisView analysis={analysis} filterYear={filterYear}
            objectives={objectives} setSelectedId={setSelectedId} setTab={setTab}
            autoStatus={autoStatus} calcRate={calcRate} />
        )}
      </div>
  )
}

// ── 상세 뷰 ──────────────────────────────────────────────────
function DetailView({ obj, canEdit, showActualForm, setShowActualForm, actualForm, setActualForm, addActual, autoStatus, calcRate }) {
  const effStatus = obj.autoCalc ? autoStatus(obj) : (obj.status || 'not_started')
  const sm = OBJ_STATUSES[effStatus] || OBJ_STATUSES.not_started
  const rate = calcRate(obj)

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[12px] font-mono" style={{ color: 'var(--ink-faint)' }}>{obj.id}</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
              {obj.autoCalc && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>자동 산정</span>}
            </div>
            <div className="text-[20px] font-bold" style={{ color: 'var(--ink)' }}>{obj.title}</div>
            <div className="text-[13px]" style={{ color: 'var(--ink-soft)' }}>{obj.dept} · {obj.category} · {obj.year}년 {obj.period}</div>
          </div>

          {/* 대형 KPI 수치 */}
          <div className="text-center p-4 rounded-2xl" style={{ background: sm.bg, minWidth: 120 }}>
            <div className="text-[11px] mb-1" style={{ color: sm.color }}>{obj.kpiName || 'KPI'}</div>
            {rate !== null ? (
              <>
                <div className="text-[28px] font-black" style={{ color: sm.color }}>{rate}%</div>
                <div className="text-[11px]" style={{ color: sm.color }}>달성률</div>
              </>
            ) : (
              <div className="text-[20px] font-bold" style={{ color: sm.color }}>-</div>
            )}
          </div>
        </div>

        {/* 메타 그리드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          {[
            { label: '기준값 (Baseline)', value: obj.baselineValue ? `${obj.baselineValue}${obj.unit}` : '-' },
            { label: '목표값', value: `${obj.targetValue}${obj.unit}` },
            { label: '최근 실적', value: obj.actualValue ? `${obj.actualValue}${obj.unit}` : '-' },
            { label: '방향', value: obj.direction === 'lower' ? '↓ 낮을수록 좋음' : '↑ 높을수록 좋음' },
            { label: '시작일', value: obj.startDate || '-' },
            { label: '종료일', value: obj.endDate || '-' },
          ].map(({ label, value }) => (
            <div key={label} className="p-2 rounded-xl" style={{ background: 'var(--bg-soft)' }}>
              <div className="text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>{label}</div>
              <div className="text-[12.5px] font-semibold" style={{ color: 'var(--ink)' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* 진행바 */}
        {rate !== null && (
          <div className="mb-3">
            <div className="flex justify-between text-[12px] mb-1" style={{ color: 'var(--ink-soft)' }}>
              <span>달성률</span>
              <span className="font-bold" style={{ color: sm.color }}>{rate}%</span>
            </div>
            <div className="h-3 rounded-full" style={{ background: 'var(--bg-soft)' }}>
              <div className="h-3 rounded-full transition-all" style={{ width: `${Math.min(rate, 100)}%`, background: sm.color }} />
            </div>
          </div>
        )}

        {/* 링크 */}
        {obj.linkedKpiId && (
          <div className="flex gap-2 flex-wrap mb-2">
            <LinkChip label={`KPI: ${obj.linkedKpiId}`} color="#2563EB" />
          </div>
        )}

        {obj.description && (
          <div className="mt-2 p-3 rounded-xl text-[12.5px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
            <span className="font-bold" style={{ color: 'var(--ink)' }}>목표 설명: </span>{obj.description}
          </div>
        )}
        {obj.actions && (
          <div className="mt-2 p-3 rounded-xl text-[12.5px]" style={{ background: '#EFF6FF', color: '#1E40AF' }}>
            <span className="font-bold">달성 방안: </span>{obj.actions}
          </div>
        )}

        {canEdit && (
          <button onClick={() => setShowActualForm(!showActualForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold mt-3"
            style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
            <RefreshCw size={13} /> 실적 입력
          </button>
        )}
      </div>

      {/* 실적 입력 폼 */}
      {showActualForm && canEdit && (
        <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
          <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>실적 입력</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>측정일</label>
              <input type="date" value={actualForm.date} onChange={e => setActualForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-1.5 rounded-xl text-[13px]"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>실적값 ({obj.unit}) *</label>
              <input type="number" value={actualForm.value} onChange={e => setActualForm(f => ({ ...f, value: e.target.value }))}
                placeholder={`목표: ${obj.targetValue}${obj.unit}`}
                className="w-full px-3 py-1.5 rounded-xl text-[13px]"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>비고</label>
              <input type="text" value={actualForm.note} onChange={e => setActualForm(f => ({ ...f, note: e.target.value }))}
                className="w-full px-3 py-1.5 rounded-xl text-[13px]"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => addActual(obj.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
              style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
              <Save size={13} /> 저장
            </button>
            <button onClick={() => setShowActualForm(false)}
              className="px-4 py-2 rounded-xl text-[13px]"
              style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>취소</button>
          </div>
        </div>
      )}

      {/* 실적 이력 */}
      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>실적 이력 ({(obj.actuals || []).length}건)</div>
        {(obj.actuals || []).length === 0 ? (
          <div className="text-center py-6 text-[13px]" style={{ color: 'var(--ink-faint)' }}>실적 이력이 없습니다.</div>
        ) : (
          <table className="w-full text-[12.5px]">
            <thead>
              <tr style={{ background: 'var(--bg-soft)' }}>
                {['측정일', '실적값', '달성률', '비고'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--ink-soft)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...(obj.actuals || [])].reverse().map((a, i) => {
                const tmpObj = { ...obj, actualValue: a.value }
                const r = calcRate(tmpObj)
                const statusKey = r !== null ? (r >= 100 ? 'achieved' : r >= 80 ? 'on_track' : r >= 60 ? 'at_risk' : 'missed') : 'not_started'
                const sm2 = OBJ_STATUSES[statusKey]
                return (
                  <tr key={a.id || i} style={{ borderTop: '1px solid var(--line)' }}>
                    <td className="px-3 py-2" style={{ color: 'var(--ink-soft)' }}>{a.date}</td>
                    <td className="px-3 py-2 font-bold" style={{ color: 'var(--ink)' }}>{a.value}{obj.unit}</td>
                    <td className="px-3 py-2">
                      {r !== null && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: sm2.bg, color: sm2.color }}>{r}%</span>}
                    </td>
                    <td className="px-3 py-2" style={{ color: 'var(--ink-soft)' }}>{a.note || '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── 분석 탭 ──────────────────────────────────────────────────
function AnalysisView({ analysis, filterYear, objectives, setSelectedId, setTab, autoStatus, calcRate }) {
  const yr = objectives.filter(o => o.year === filterYear)

  return (
    <div className="space-y-5">
      {/* 전체 달성률 */}
      {analysis.total > 0 && (
        <div className="p-6 rounded-2xl text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[13px] mb-1" style={{ color: 'var(--ink-faint)' }}>{filterYear}년 전체 목표 달성률</div>
          <div className="text-[48px] font-black" style={{ color: analysis.achieveRate >= 80 ? '#059669' : analysis.achieveRate >= 60 ? '#D97706' : '#DC2626' }}>
            {analysis.achieveRate}%
          </div>
          <div className="text-[13px]" style={{ color: 'var(--ink-soft)' }}>{analysis.achieved}/{analysis.total}개 목표 달성</div>
          <div className="h-3 rounded-full mt-3" style={{ background: 'var(--bg-soft)' }}>
            <div className="h-3 rounded-full" style={{ width: `${analysis.achieveRate}%`, background: analysis.achieveRate >= 80 ? '#059669' : analysis.achieveRate >= 60 ? '#D97706' : '#DC2626' }} />
          </div>
        </div>
      )}

      {/* 상태별 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(OBJ_STATUSES).map(([k, v]) => (
          <div key={k} className="p-4 rounded-2xl text-center" style={{ background: v.bg, border: `1px solid ${v.color}40` }}>
            <div className="text-[26px] font-bold" style={{ color: v.color }}>{analysis.byStatus[k] || 0}</div>
            <div className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>{v.label}</div>
          </div>
        ))}
      </div>

      {/* 미달성·위험 목표 */}
      {[
        { list: analysis.missed, title: '미달성 목표', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
        { list: analysis.atRisk, title: '위험 목표', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
      ].map(({ list, title, color, bg, border }) => list.length > 0 && (
        <div key={title} className="p-5 rounded-2xl" style={{ background: bg, border: `1px solid ${border}` }}>
          <div className="text-[13px] font-bold mb-3" style={{ color }}>{title} ({list.length}건)</div>
          <div className="space-y-2">
            {list.map(obj => {
              const rate = calcRate(obj)
              return (
                <div key={obj.id} className="flex items-center justify-between p-2.5 rounded-xl cursor-pointer"
                  style={{ background: bg, border: `1px solid ${border}` }}
                  onClick={() => { setSelectedId(obj.id); setTab('detail') }}>
                  <div>
                    <div className="text-[12px] font-bold" style={{ color }}>{obj.title}</div>
                    <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{obj.dept} · 목표: {obj.targetValue}{obj.unit}</div>
                  </div>
                  <div className="text-right">
                    {rate !== null && <div className="text-[13px] font-bold" style={{ color }}>{rate}%</div>}
                    <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{obj.actualValue ? `실적: ${obj.actualValue}${obj.unit}` : '실적 미입력'}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* 부서별 목표 수 */}
      {Object.keys(analysis.byDept).length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>부서별 품질 목표 수</div>
          {Object.entries(analysis.byDept).sort(([, a], [, b]) => b - a).map(([dept, cnt]) => (
            <div key={dept} className="flex items-center gap-3 mb-2">
              <span className="text-[12px] w-32 shrink-0" style={{ color: 'var(--ink-soft)' }}>{dept}</span>
              <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--bg-soft)' }}>
                <div className="h-2 rounded-full" style={{ width: `${(cnt / analysis.total) * 100}%`, background: 'var(--moss)' }} />
              </div>
              <span className="text-[12px] font-bold w-4" style={{ color: 'var(--ink)' }}>{cnt}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 폼 ───────────────────────────────────────────────────────
function ObjForm({ form, setForm, onSave, onCancel, isEdit }) {
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const navigate = useNavigate()
  const policy = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY_POLICY) || '{}') } catch { return {} }
  }, [])
  const kpiSnapshot = useMemo(() => { try { return buildSnapshot().kpi } catch { return null } }, [])
  const isLinked = form.linkedKpi && form.linkedKpi !== 'other'

  // #364: 연동 KPI 선택 시 KPI명·단위·방향을 자동 지정하고 실적값을 실제 데이터에서 불러온다.
  // '기타'를 선택하면 기존과 동일하게 전부 직접 입력.
  function onLinkedKpiChange(id) {
    F('linkedKpi', id)
    if (id === 'other') return
    const opt = LINKED_KPI_OPTIONS.find(o => o.id === id)
    if (!opt) return
    setForm(f => ({
      ...f,
      linkedKpi: id,
      kpiName: opt.label,
      unit: opt.unit,
      direction: opt.direction,
      actualValue: String(computeLinkedActual(id, kpiSnapshot)),
    }))
  }
  function refreshLinkedActual() {
    if (!isLinked) return
    F('actualValue', String(computeLinkedActual(form.linkedKpi, kpiSnapshot)))
  }
  return (
    <div className="mb-6 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>{isEdit ? '품질 목표 수정' : '품질 목표 등록'}</div>

      {/* 품질 방침 참고 */}
      <div className="mb-4 p-4 rounded-2xl" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 text-[12.5px] font-bold" style={{ color: '#1E40AF' }}>
            <Award size={13} /> 품질 방침 (§5.3) — 참고하여 작성하세요
          </div>
          <button onClick={() => navigate('/management-commitment')}
            className="flex items-center gap-1 text-[11.5px] font-semibold"
            style={{ background: 'none', border: 'none', color: '#1E40AF', cursor: 'pointer' }}>
            방침 페이지로 이동 <ExternalLink size={11} />
          </button>
        </div>
        {policy.statement
          ? <p className="text-[12.5px] whitespace-pre-line" style={{ color: '#1E40AF' }}>{policy.statement}</p>
          : <p className="text-[12px]" style={{ color: '#1E40AF' }}>아직 품질 방침이 작성되지 않았습니다. 경영 의지·품질 방침 메뉴에서 먼저 작성하세요.</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <Field label="목표명 *" value={form.title} onChange={v => F('title', v)} />
        <FieldSelect label="카테고리" value={form.category} onChange={v => F('category', v)}
          options={CATEGORIES.map(c => ({ value: c, label: c }))} />
        <FieldSelect label="부서" value={form.dept} onChange={v => F('dept', v)}
          options={DEPT_LIST.map(d => ({ value: d, label: d }))} />
        <FieldSelect label="연도" value={form.year} onChange={v => F('year', v)}
          options={YEARS.map(y => ({ value: y, label: `${y}년` }))} />
        <FieldSelect label="주기" value={form.period} onChange={v => F('period', v)}
          options={PERIODS.map(p => ({ value: p, label: p }))} />
        <FieldSelect label="연동 KPI" value={form.linkedKpi || 'other'} onChange={onLinkedKpiChange}
          options={LINKED_KPI_OPTIONS.map(o => ({ value: o.id, label: o.label }))} />
        <Field label="KPI 명칭" value={form.kpiName} onChange={v => F('kpiName', v)} placeholder="검사 합격률" disabled={isLinked} />
        <FieldSelect label="단위" value={form.unit} onChange={v => F('unit', v)}
          options={KPI_UNIT_PRESETS.map(u => ({ value: u, label: u }))} disabled={isLinked} />
        <FieldSelect label="방향" value={form.direction} onChange={v => F('direction', v)}
          options={[{ value: 'higher', label: '↑ 높을수록 좋음' }, { value: 'lower', label: '↓ 낮을수록 좋음' }]} disabled={isLinked} />
        <Field label="기준값 (Baseline)" value={form.baselineValue} onChange={v => F('baselineValue', v)} type="number" />
        <Field label="목표값 *" value={form.targetValue} onChange={v => F('targetValue', v)} type="number" />
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11.5px] font-semibold" style={{ color: 'var(--ink-soft)' }}>현재 실적값</label>
            {isLinked && <button type="button" onClick={refreshLinkedActual} className="text-[10.5px] font-semibold" style={{ background: 'none', border: 'none', color: 'var(--moss)', cursor: 'pointer' }}>실적 자동 불러오기</button>}
          </div>
          <input type="number" value={form.actualValue || ''} onChange={e => F('actualValue', e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl text-[13px]"
            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
          {isLinked && <div className="text-[10.5px] mt-1" style={{ color: 'var(--ink-faint)' }}>실제 데이터(경영검토 KPI 자동집계)에서 불러온 값입니다. 필요 시 수정 가능합니다.</div>}
        </div>
        <div className="flex items-center gap-3 pt-5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.autoCalc !== false}
              onChange={e => F('autoCalc', e.target.checked)} className="accent-green-500" />
            <span className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>상태 자동 산정</span>
          </label>
        </div>
        {!form.autoCalc && (
          <FieldSelect label="상태" value={form.status} onChange={v => F('status', v)}
            options={Object.entries(OBJ_STATUSES).map(([k, v]) => ({ value: k, label: v.label }))} />
        )}
        <Field label="시작일" type="date" value={form.startDate} onChange={v => F('startDate', v)} />
        <Field label="종료일" type="date" value={form.endDate} onChange={v => F('endDate', v)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <FieldArea label="목표 설명" value={form.description} onChange={v => F('description', v)} rows={2} />
        <FieldArea label="달성 방안" value={form.actions} onChange={v => F('actions', v)} rows={2} />
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
          style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
          <Save size={13} /> 저장
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-[13px]"
          style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>취소</button>
      </div>
    </div>
  )
}

function LinkChip({ label, color }) {
  return (
    <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: color + '15', color, border: `1px solid ${color}40` }}>
      <Link2 size={9} /> {label}
    </span>
  )
}
function Field({ label, value, onChange, type = 'text', placeholder, disabled = false }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
        className="w-full px-3 py-1.5 rounded-xl text-[13px]"
        style={{ background: disabled ? 'var(--bg-soft)' : 'var(--bg)', border: '1px solid var(--line)', color: disabled ? 'var(--ink-faint)' : 'var(--ink)' }} />
    </div>
  )
}
function FieldSelect({ label, value, onChange, options, disabled = false }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <select value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled}
        className="w-full px-3 py-1.5 rounded-xl text-[13px]"
        style={{ background: disabled ? 'var(--bg-soft)' : 'var(--bg)', border: '1px solid var(--line)', color: disabled ? 'var(--ink-faint)' : 'var(--ink)' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
function FieldArea({ label, value, onChange, rows = 3 }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows}
        className="w-full px-3 py-1.5 rounded-xl text-[13px] resize-none"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
    </div>
  )
}
