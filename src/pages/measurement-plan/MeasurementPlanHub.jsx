// src/pages/measurement-plan/MeasurementPlanHub.jsx
// ISO 13485 §8.1 — 측정, 분석 및 개선의 계획
import React, { useState, useMemo } from 'react'
import {
  Edit2, Save, X, Plus, Trash2, CheckCircle2, AlertTriangle,
  BarChart2, Target, Cpu, TrendingUp, ClipboardList, ChevronUp, ChevronDown,
  BarChart3,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'

// ── 상수 ─────────────────────────────────────────────────────
const LS_KEY_PLAN  = 'qualytree.measurement_plan'
const LS_KEY_ITEMS = 'qualytree.measurement_items'

// 측정 카테고리 (§8.1 요구사항 기반)
const MEASURE_CATEGORIES = {
  product:    { label: '제품 적합성',    color: '#2563EB', bg: '#DBEAFE', clause: '§8.2.3/8.2.4' },
  process:    { label: '공정 모니터링',  color: '#7C3AED', bg: '#EDE9FE', clause: '§8.2.3' },
  customer:   { label: '고객 만족',      color: '#059669', bg: '#D1FAE5', clause: '§8.2.1' },
  audit:      { label: '내부 감사',      color: '#D97706', bg: '#FEF3C7', clause: '§8.2.2' },
  qms:        { label: 'QMS 성과',       color: '#DC2626', bg: '#FEE2E2', clause: '§8.2/8.4' },
  supplier:   { label: '공급업체 성과',  color: '#0891B2', bg: '#CFFAFE', clause: '§7.4' },
  equipment:  { label: '설비·교정',      color: '#6366F1', bg: '#E0E7FF', clause: '§7.6' },
  risk:       { label: '위험 관리',      color: '#EA580C', bg: '#FFEDD5', clause: 'ISO14971' },
  improvement:{ label: '개선 활동',      color: '#16A34A', bg: '#DCFCE7', clause: '§8.5' },
}

// 통계적 기법
const STAT_METHODS = [
  'SPC (통계적 공정 관리)', 'AQL 샘플링', '관리도 (Control Chart)',
  '산점도 (Scatter Diagram)', '파레토 분석', '히스토그램', 'Cpk/Ppk 공정 능력',
  '트렌드 분석', '기초 통계 (평균·표준편차)', 'N/A (해당 없음)',
]

// 빈도
const FREQUENCIES = ['매일', '매주', '매월', '분기별', '반기별', '연 1회', '배치별', '수시', '기타']

function today() { return new Date().toISOString().slice(0, 10) }
function genId()  { return `MP-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }

// §8.1 계획 문서 기본값
const DEFAULT_PLAN = {
  revision: 'Rev.0', issueDate: '', approvedBy: '', reviewDate: '',
  scope: '',          // 계획 적용 범위
  objectives: '',     // 측정·분석·개선의 목적
  improvementApproach: '', // 개선 접근 방법 (§8.5.1)
  statisticalRationale: '', // 통계적 기법 선택 근거
  revisionHistory: [],
}

const EMPTY_ITEM = {
  seq: 1,
  category: 'product',
  measurementObject: '',   // 측정 대상
  indicator: '',           // 측정 지표/KPI
  method: '',              // 측정 방법
  statisticalMethod: 'N/A (해당 없음)',
  frequency: '매월',
  responsible: '',
  recordLocation: '',      // 기록 위치 (어떤 허브)
  isoClause: '',           // ISO 13485 조항
  linkedHubPath: '',       // 연결 허브 경로
  acceptanceCriteria: '',  // 합격/목표 기준
  notes: '',
}

export default function MeasurementPlanHub() {
  const user = auth.current()
  const canEdit = user?.level >= 2

  // 계획 문서 (단일)
  const [plan, setPlan] = useState(() => {
    try { return { ...DEFAULT_PLAN, ...JSON.parse(localStorage.getItem(LS_KEY_PLAN) || '{}') } } catch { return DEFAULT_PLAN }
  })
  const [draft, setDraft] = useState(null)
  const [editing, setEditing] = useState(false)

  // 측정 항목 목록
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY_ITEMS) || '[]') } catch { return [] }
  })
  const [showItemForm, setShowItemForm] = useState(false)
  const [itemForm, setItemForm] = useState(EMPTY_ITEM)
  const [editItemId, setEditItemId] = useState(null)
  const [filterCat, setFilterCat] = useState('all')

  const [tab, setTab] = useState('plan') // plan | items | analysis

  function savePlan() {
    const updated = { ...draft }
    setPlan(updated)
    localStorage.setItem(LS_KEY_PLAN, JSON.stringify(updated))
    setEditing(false); setDraft(null)
  }
  function startEdit() { setDraft({ ...plan }); setEditing(true) }
  function cancelEdit() { setEditing(false); setDraft(null) }
  const D = (k, v) => setDraft(d => ({ ...d, [k]: v }))

  function saveItems(list) { setItems(list); localStorage.setItem(LS_KEY_ITEMS, JSON.stringify(list)) }

  function submitItem() {
    if (!itemForm.measurementObject.trim()) return alert('측정 대상을 입력하세요.')
    let updated
    if (editItemId) {
      updated = items.map(it => it.id === editItemId ? { ...it, ...itemForm } : it)
    } else {
      const seq = items.length + 1
      updated = [...items, { id: genId(), createdAt: today(), ...itemForm, seq }]
    }
    saveItems(updated)
    setShowItemForm(false); setItemForm(EMPTY_ITEM); setEditItemId(null)
  }

  function deleteItem(id) {
    if (!confirm('삭제하시겠습니까?')) return
    saveItems(items.filter(it => it.id !== id).map((it, i) => ({ ...it, seq: i + 1 })))
  }

  function moveItem(id, dir) {
    const arr = [...items]
    const idx = arr.findIndex(it => it.id === id)
    if (dir === 'up' && idx > 0) [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
    if (dir === 'down' && idx < arr.length - 1) [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
    saveItems(arr.map((it, i) => ({ ...it, seq: i + 1 })))
  }

  const IF = (k, v) => setItemForm(f => ({ ...f, [k]: v }))

  const filteredItems = useMemo(() =>
    items.filter(it => filterCat === 'all' || it.category === filterCat),
    [items, filterCat])

  // 완성도
  const completeness = useMemo(() => {
    const coveredCats = new Set(items.map(it => it.category))
    const checks = [
      { label: '계획 범위 기술', ok: !!plan.scope },
      { label: '측정 목적 기술', ok: !!plan.objectives },
      { label: '개선 접근 방법', ok: !!plan.improvementApproach },
      { label: '제품 적합성 측정 항목', ok: coveredCats.has('product') },
      { label: '고객 만족 측정 항목', ok: coveredCats.has('customer') },
      { label: '내부 감사 항목', ok: coveredCats.has('audit') },
      { label: 'QMS 성과 측정 항목', ok: coveredCats.has('qms') },
      { label: '총 측정 항목 ≥ 5개', ok: items.length >= 5 },
    ]
    const done = checks.filter(c => c.ok).length
    return { checks, done, total: checks.length, pct: Math.round((done / checks.length) * 100) }
  }, [plan, items])

  const analysis = useMemo(() => {
    const byCat = {}
    Object.keys(MEASURE_CATEGORIES).forEach(k => { byCat[k] = items.filter(it => it.category === k).length })
    const byFreq = {}
    FREQUENCIES.forEach(f => { byFreq[f] = items.filter(it => it.frequency === f).length })
    const missingCriteria = items.filter(it => !it.acceptanceCriteria)
    return { byCat, byFreq, missingCriteria }
  }, [items])

  return (
    <AppLayout user={user} title="측정·분석·개선 계획" subtitle="ISO 13485 §8.1 — 측정·모니터링·분석·개선 활동의 계획">
      <div className="px-6 lg:px-8 py-6 max-w-[1600px] mx-auto">

        {/* 완성도 배지 */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[12px] font-bold"
            style={{ background: completeness.pct >= 80 ? '#D1FAE5' : '#FEF3C7', color: completeness.pct >= 80 ? '#065F46' : '#92400E' }}>
            {completeness.pct >= 80 ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
            §8.1 이행 {completeness.pct}% ({completeness.done}/{completeness.total})
          </div>
          {completeness.checks.filter(c => !c.ok).slice(0, 2).map(c => (
            <span key={c.label} className="px-2 py-1 rounded-lg text-[11px]" style={{ background: '#FEE2E2', color: '#DC2626' }}>미완: {c.label}</span>
          ))}
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-soft)' }}>
          {[
            { key: 'plan',     label: '§8.1 계획 문서' },
            { key: 'items',    label: `측정 항목 (${items.length})` },
            { key: 'analysis', label: '현황 분석' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="px-4 py-1.5 rounded-lg text-[13px] font-semibold transition"
              style={{
                background: tab === t.key ? 'var(--bg-card)' : 'transparent',
                color: tab === t.key ? 'var(--moss)' : 'var(--ink-soft)',
                boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                border: 'none', cursor: 'pointer',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── 계획 문서 탭 ── */}
        {tab === 'plan' && (
          <div className="space-y-4">
            {canEdit && !editing && (
              <div className="flex justify-end">
                <button onClick={startEdit} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Edit2 size={13} /> 편집
                </button>
              </div>
            )}
            {editing && (
              <div className="flex gap-2 justify-end">
                <button onClick={savePlan} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Save size={13} /> 저장
                </button>
                <button onClick={cancelEdit} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px]"
                  style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
                  <X size={13} /> 취소
                </button>
              </div>
            )}

            {/* 기본 정보 */}
            <PlanSection icon={<ClipboardList size={15} />} title="계획 기본 정보" accent="#2563EB">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <PF label="개정 번호" value={editing ? draft.revision : plan.revision} onChange={v => D('revision', v)} editing={editing} />
                <PF label="발행일" type="date" value={editing ? draft.issueDate : plan.issueDate} onChange={v => D('issueDate', v)} editing={editing} />
                <PF label="승인자" value={editing ? draft.approvedBy : plan.approvedBy} onChange={v => D('approvedBy', v)} editing={editing} />
                <PF label="차기 검토일" type="date" value={editing ? draft.reviewDate : plan.reviewDate} onChange={v => D('reviewDate', v)} editing={editing} />
              </div>
            </PlanSection>

            {/* §8.1 핵심 계획 내용 */}
            <PlanSection icon={<Target size={15} />} title="§8.1 측정·분석·개선 계획" accent="#7C3AED">
              <div className="space-y-4">
                <PF label="적용 범위" value={editing ? draft.scope : plan.scope} onChange={v => D('scope', v)} editing={editing} multiline rows={2}
                  placeholder="본 계획은 당사 QMS의 모든 측정·분석·개선 활동에 적용된다..." />
                <PF label="목적 및 의도" value={editing ? draft.objectives : plan.objectives} onChange={v => D('objectives', v)} editing={editing} multiline rows={3}
                  placeholder="측정·분석·개선 활동의 목적: (a) 제품 적합성 실증, (b) QMS 적합성 보장, (c) 효과성 지속적 개선..." />
                <PF label="§8.1 통계적 기법 선택 근거" value={editing ? draft.statisticalRationale : plan.statisticalRationale} onChange={v => D('statisticalRationale', v)} editing={editing} multiline rows={2}
                  placeholder="AQL 샘플링: 수입검사 적용 (KS Q ISO 2859-1), SPC: 핵심 공정 파라미터 관리, 기초 통계: 고객 만족도 및 불만 추세 분석..." />
                <PF label="§8.5.1 지속적 개선 접근 방법" value={editing ? draft.improvementApproach : plan.improvementApproach} onChange={v => D('improvementApproach', v)} editing={editing} multiline rows={2}
                  placeholder="품질 방침·목표 검토, CAPA, 내부감사 결과, 경영검토를 통한 개선 기회 식별 및 실행..." />
              </div>
            </PlanSection>

            {/* 개정 이력 */}
            <PlanSection icon={<TrendingUp size={15} />} title="개정 이력" accent="#6B7280">
              {editing ? (
                <RevisionEditor list={draft.revisionHistory || []} onChange={v => D('revisionHistory', v)} />
              ) : (
                (plan.revisionHistory || []).length === 0
                  ? <p className="text-[12.5px]" style={{ color: 'var(--ink-faint)' }}>개정 이력이 없습니다.</p>
                  : <table className="w-full text-[12px]">
                      <thead><tr style={{ background: 'var(--bg-soft)' }}>
                        {['개정', '일자', '내용', '작성자'].map(h => (
                          <th key={h} className="px-3 py-2 text-left" style={{ color: 'var(--ink-soft)' }}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>{(plan.revisionHistory || []).map((r, i) => (
                        <tr key={i} style={{ borderTop: '1px solid var(--line)' }}>
                          <td className="px-3 py-2">{r.rev}</td><td className="px-3 py-2">{r.date}</td>
                          <td className="px-3 py-2">{r.desc}</td><td className="px-3 py-2">{r.by}</td>
                        </tr>
                      ))}</tbody>
                    </table>
              )}
            </PlanSection>
          </div>
        )}

        {/* ── 측정 항목 탭 ── */}
        {tab === 'items' && (
          <div>
            <div className="flex gap-2 mb-4 flex-wrap items-center">
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-[13px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                <option value="all">전체 카테고리</option>
                {Object.entries(MEASURE_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              {canEdit && (
                <button onClick={() => { setItemForm({ ...EMPTY_ITEM, seq: items.length + 1 }); setEditItemId(null); setShowItemForm(true) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold ml-auto"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} /> 측정 항목 추가
                </button>
              )}
            </div>

            {showItemForm && (
              <ItemForm form={itemForm} IF={IF} onSave={submitItem}
                onCancel={() => { setShowItemForm(false); setItemForm(EMPTY_ITEM); setEditItemId(null) }}
                isEdit={!!editItemId} />
            )}

            {/* 테이블 */}
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
              <table className="w-full text-[12px]">
                <thead>
                  <tr style={{ background: 'var(--bg-soft)' }}>
                    {['#', '카테고리', '측정 대상', '지표/KPI', '방법', '통계 기법', '빈도', '담당', '기준', ''].map(h => (
                      <th key={h} className="px-2 py-2 text-left font-semibold" style={{ color: 'var(--ink-soft)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 && (
                    <tr><td colSpan={10} className="text-center py-12" style={{ color: 'var(--ink-faint)' }}>측정 항목을 추가하세요.</td></tr>
                  )}
                  {filteredItems.map((it, idx) => {
                    const cat = MEASURE_CATEGORIES[it.category] || MEASURE_CATEGORIES.product
                    const missingCrit = !it.acceptanceCriteria
                    return (
                      <tr key={it.id} style={{ background: idx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-soft)', borderTop: '1px solid var(--line)' }}>
                        <td className="px-2 py-2 font-bold text-center" style={{ color: 'var(--ink-soft)' }}>{it.seq}</td>
                        <td className="px-2 py-2">
                          <span className="text-[10.5px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap"
                            style={{ background: cat.bg, color: cat.color }}>{cat.label}</span>
                          {it.isoClause && <div className="text-[10px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{it.isoClause}</div>}
                        </td>
                        <td className="px-2 py-2">
                          <div className="font-semibold" style={{ color: 'var(--ink)' }}>{it.measurementObject}</div>
                          {it.recordLocation && <div className="text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>기록: {it.recordLocation}</div>}
                        </td>
                        <td className="px-2 py-2" style={{ color: 'var(--ink-soft)' }}>{it.indicator || '-'}</td>
                        <td className="px-2 py-2" style={{ color: 'var(--ink-soft)' }}>{it.method || '-'}</td>
                        <td className="px-2 py-2 text-[10.5px]" style={{ color: 'var(--ink-soft)' }}>{it.statisticalMethod}</td>
                        <td className="px-2 py-2" style={{ color: 'var(--ink-soft)' }}>{it.frequency}</td>
                        <td className="px-2 py-2" style={{ color: 'var(--ink-soft)' }}>{it.responsible || '-'}</td>
                        <td className="px-2 py-2">
                          {missingCrit
                            ? <span className="text-[10.5px] text-red-500">⚠ 미설정</span>
                            : <span className="text-[11px]" style={{ color: 'var(--ink)' }}>{it.acceptanceCriteria}</span>}
                        </td>
                        <td className="px-2 py-2">
                          {canEdit && (
                            <div className="flex gap-1">
                              <button onClick={() => moveItem(it.id, 'up')} disabled={idx === 0} className="p-0.5 rounded"
                                style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer', opacity: idx === 0 ? 0.3 : 1 }}>
                                <ChevronUp size={10} />
                              </button>
                              <button onClick={() => moveItem(it.id, 'down')} disabled={idx === filteredItems.length - 1} className="p-0.5 rounded"
                                style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer', opacity: idx === filteredItems.length - 1 ? 0.3 : 1 }}>
                                <ChevronDown size={10} />
                              </button>
                              <button onClick={() => { setItemForm({ ...EMPTY_ITEM, ...it }); setEditItemId(it.id); setShowItemForm(true) }}
                                className="p-1 rounded" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                                <Edit2 size={10} style={{ color: 'var(--ink-soft)' }} />
                              </button>
                              <button onClick={() => deleteItem(it.id)} className="p-1 rounded"
                                style={{ background: '#FEE2E2', border: 'none', cursor: 'pointer' }}>
                                <Trash2 size={10} style={{ color: '#DC2626' }} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 분석 탭 ── */}
        {tab === 'analysis' && (
          <div className="space-y-5">
            {/* 완성도 */}
            <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>§8.1 이행 완성도</div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-2.5 rounded-full" style={{ background: 'var(--bg-soft)' }}>
                  <div className="h-2.5 rounded-full" style={{ width: `${completeness.pct}%`, background: completeness.pct >= 80 ? 'var(--moss)' : '#F59E0B' }} />
                </div>
                <span className="font-bold" style={{ color: 'var(--moss)' }}>{completeness.pct}%</span>
              </div>
              {completeness.checks.map(c => (
                <div key={c.label} className="flex items-center gap-2 py-0.5">
                  <span style={{ color: c.ok ? '#059669' : '#DC2626', fontSize: 13 }}>{c.ok ? '✓' : '✗'}</span>
                  <span className="text-[12.5px]" style={{ color: 'var(--ink)' }}>{c.label}</span>
                </div>
              ))}
            </div>

            {/* 카테고리별 */}
            <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>카테고리별 측정 항목 ({items.length}개 총)</div>
              {Object.entries(MEASURE_CATEGORIES).map(([k, v]) => (
                <div key={k} className="flex items-center gap-3 mb-2">
                  <span className="text-[11.5px] w-24 shrink-0" style={{ color: 'var(--ink-soft)' }}>{v.label}</span>
                  <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--bg-soft)' }}>
                    <div className="h-2 rounded-full" style={{
                      width: items.length ? `${((analysis.byCat[k] || 0) / items.length) * 100}%` : '0%',
                      background: v.color,
                    }} />
                  </div>
                  <span className="text-[11.5px] font-bold w-5 text-right" style={{ color: 'var(--ink)' }}>{analysis.byCat[k] || 0}</span>
                  <span className="text-[10.5px] w-16" style={{ color: 'var(--ink-faint)' }}>{v.clause}</span>
                </div>
              ))}
            </div>

            {/* 미설정 목표 기준 경고 */}
            {analysis.missingCriteria.length > 0 && (
              <div className="p-4 rounded-2xl" style={{ background: '#FEF3C7', border: '1px solid #FCD34D' }}>
                <div className="text-[13px] font-bold mb-1" style={{ color: '#92400E' }}>⚠ 합격/목표 기준 미설정 항목 ({analysis.missingCriteria.length}개)</div>
                {analysis.missingCriteria.map(it => {
                  const cat = MEASURE_CATEGORIES[it.category] || {}
                  return (
                    <div key={it.id} className="text-[12px]" style={{ color: '#92400E' }}>
                      {it.seq}. {it.measurementObject} ({cat.label})
                    </div>
                  )
                })}
              </div>
            )}

            {/* 빈도별 분포 */}
            <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>측정 빈도 분포</div>
              <div className="flex flex-wrap gap-2">
                {FREQUENCIES.filter(f => analysis.byFreq[f] > 0).map(f => (
                  <span key={f} className="px-3 py-1.5 rounded-xl text-[12px] font-semibold"
                    style={{ background: 'var(--bg-soft)', color: 'var(--ink)' }}>
                    {f}: <strong>{analysis.byFreq[f]}</strong>건
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

// ── 측정 항목 등록 폼 ─────────────────────────────────────────
function ItemForm({ form, IF, onSave, onCancel, isEdit }) {
  return (
    <div className="mb-5 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>{isEdit ? '측정 항목 수정' : '측정 항목 추가'}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <div>
          <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>카테고리</label>
          <select value={form.category} onChange={e => IF('category', e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl text-[13px]"
            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
            {Object.entries(MEASURE_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <SF label="측정 대상 *" value={form.measurementObject} onChange={v => IF('measurementObject', v)} placeholder="제품 치수, 고객 만족도..." />
        <SF label="측정 지표/KPI" value={form.indicator} onChange={v => IF('indicator', v)} placeholder="불합격률, 점수, 건수..." />
        <SF label="측정 방법" value={form.method} onChange={v => IF('method', v)} placeholder="육안 검사, 설문, 기록 검토..." />
        <div>
          <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>통계적 기법</label>
          <select value={form.statisticalMethod} onChange={e => IF('statisticalMethod', e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl text-[13px]"
            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
            {STAT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>빈도</label>
          <select value={form.frequency} onChange={e => IF('frequency', e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl text-[13px]"
            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
            {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <SF label="담당자" value={form.responsible} onChange={v => IF('responsible', v)} />
        <SF label="기록 위치 (허브명)" value={form.recordLocation} onChange={v => IF('recordLocation', v)} placeholder="검사 관리 허브, KPI 대시보드..." />
        <SF label="ISO 13485 조항" value={form.isoClause} onChange={v => IF('isoClause', v)} placeholder="§8.2.3, §7.4.3..." />
        <SF label="목표/합격 기준" value={form.acceptanceCriteria} onChange={v => IF('acceptanceCriteria', v)} placeholder="불합격률 ≤ 1%, 점수 ≥ 85점..." />
        <SF label="연결 허브 경로" value={form.linkedHubPath} onChange={v => IF('linkedHubPath', v)} placeholder="/inspection, /quality-dashboard..." />
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

// ── 공통 컴포넌트 ─────────────────────────────────────────────
function PlanSection({ icon, title, accent, children }) {
  return (
    <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: `1.5px solid ${accent}30` }}>
      <div className="flex items-center gap-2 mb-4">
        <span style={{ color: accent }}>{icon}</span>
        <span className="font-bold text-[14px]" style={{ color: accent }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

function PF({ label, value, onChange, editing, type = 'text', multiline, rows = 2, placeholder }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      {editing ? (
        multiline
          ? <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
              className="w-full px-3 py-1.5 rounded-xl text-[13px] resize-none"
              style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
          : <input type={type} value={value || ''} onChange={e => onChange(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl text-[13px]"
              style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
      ) : (
        value
          ? <p className="text-[13px] whitespace-pre-line" style={{ color: 'var(--ink)' }}>{value}</p>
          : <p className="text-[12.5px]" style={{ color: 'var(--ink-faint)' }}>{placeholder || '—'}</p>
      )}
    </div>
  )
}

function SF({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-1.5 rounded-xl text-[13px]"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
    </div>
  )
}

function RevisionEditor({ list, onChange }) {
  const [row, setRow] = useState({ rev: '', date: today(), desc: '', by: '' })
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        {[['rev', '개정 번호'], ['date', '일자'], ['desc', '개정 내용'], ['by', '작성자']].map(([k, l]) => (
          <input key={k} type={k === 'date' ? 'date' : 'text'} value={row[k]}
            onChange={e => setRow(r => ({ ...r, [k]: e.target.value }))} placeholder={l}
            className="px-2 py-1 rounded-lg text-[12.5px]"
            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
        ))}
      </div>
      <button onClick={() => { if (row.rev.trim()) { onChange([...list, { ...row }]); setRow({ rev: '', date: today(), desc: '', by: '' }) } }}
        className="px-3 py-1 rounded-lg text-[12px] font-semibold mb-3"
        style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--moss)', cursor: 'pointer' }}>+ 이력 추가</button>
      {list.length > 0 && (
        <table className="w-full text-[12px]">
          <thead><tr style={{ background: 'var(--bg-soft)' }}>
            {['개정', '일자', '내용', '작성자', ''].map(h => (
              <th key={h} className="px-2 py-1.5 text-left" style={{ color: 'var(--ink-soft)' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{list.map((r, i) => (
            <tr key={i} style={{ borderTop: '1px solid var(--line)' }}>
              <td className="px-2 py-1.5">{r.rev}</td>
              <td className="px-2 py-1.5">{r.date}</td>
              <td className="px-2 py-1.5">{r.desc}</td>
              <td className="px-2 py-1.5">{r.by}</td>
              <td className="px-2 py-1.5">
                <button onClick={() => onChange(list.filter((_, j) => j !== i))}
                  className="p-1 rounded" style={{ background: '#FEE2E2', border: 'none', cursor: 'pointer' }}>
                  <Trash2 size={10} style={{ color: '#DC2626' }} />
                </button>
              </td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  )
}
