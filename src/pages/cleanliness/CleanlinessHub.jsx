// src/pages/cleanliness/CleanlinessHub.jsx
// ISO 13485 §7.5.2 — 청결 및 오염 관리
import React, { useState, useMemo } from 'react'
import {
  Plus, Save, Edit2, Trash2, CheckCircle2, AlertTriangle,
  Wind, Shield, FlaskConical, ClipboardList, BarChart2,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'

const LS_SPECS  = 'qualytree.cleanliness_specs'
const LS_RECS   = 'qualytree.cleanliness_records'
const LS_PLAN   = 'qualytree.cleanliness_plan'

// §7.5.2 청결 요구사항 적용 조건
const APPLIES_WHEN = {
  supplied_clean:    '청결 상태로 공급되는 제품',
  cleaned_before:    '사용 전 세척이 필요한 제품',
  contamination_ctl: '오염에 민감한 제품',
  sterile_prep:      '멸균 전 청결 준비 필요',
}

// 청결도 등급 (클린룸 기준)
const CLEAN_CLASSES = [
  'ISO Class 1', 'ISO Class 2', 'ISO Class 3', 'ISO Class 4', 'ISO Class 5',
  'ISO Class 6', 'ISO Class 7', 'ISO Class 8', 'ISO Class 9',
  'Class 100 (ISO 5)', 'Class 10,000 (ISO 7)', 'Class 100,000 (ISO 8)',
  '일반 작업장', '해당 없음',
]

// 세척 방법
const CLEANING_METHODS = [
  '순수(DI) 세척', '초음파 세척', '알코올 와이핑', '에어 블로잉',
  '멸균 생리식염수 세척', 'IPA 세척', '세제 세척 후 수세',
  '질소 퍼징', '자동 세척기 (WFI)', '기타',
]

// 오염 유형
const CONTAMINATION_TYPES = [
  '미립자 (파티클)', '미생물', '화학물질', '정전기 (ESD)',
  '교차 오염', '중금속', '발열원', '기타',
]

// 모니터링 빈도
const MONITOR_FREQS = ['매 배치', '매일', '매주', '매월', '분기별', '수시']

function today() { return new Date().toISOString().slice(0, 10) }
function genId()  { return 'CL-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-5) }

const EMPTY_SPEC = {
  productName: '', productCode: '',
  appliesWhen: 'supplied_clean',
  cleanClass: 'ISO Class 7',
  cleaningMethod: '순수(DI) 세척',
  contaminationTypes: [],
  particleLimit: '',       // 미립자 한도 (개/m³)
  microbialLimit: '',      // 미생물 한도
  chemicalLimit: '',       // 화학 잔류 한도
  cleaningProcedureRef: '', // 세척 SOP 참조
  validationRef: '',        // 밸리데이션 보고서 참조
  inspectionMethod: '',    // 청결도 검사 방법
  acceptanceCriteria: '',  // 합격 기준
  frequency: '매 배치',
  responsible: '',
  notes: '',
  status: 'active',
}

const EMPTY_RECORD = {
  specId: '',
  date: today(),
  lotNo: '',
  result: 'pass',    // pass | fail | conditional
  particleResult: '',
  microbialResult: '',
  inspector: '',
  notes: '',
  deviationRef: '',
}

const DEFAULT_PLAN = {
  revision: 'Rev.0', issueDate: '', approvedBy: '',
  scope: '',
  contaminationRiskAssessment: '',
  environmentReqs: '',
  monitoringPlan: '',
  cleaningValidationSummary: '',
  revisionHistory: [],
}

export default function CleanlinessHub() {
  const user = auth.current()
  const canEdit = user?.level >= 2

  const [specs, setSpecs] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_SPECS) || '[]') } catch { return [] }
  })
  const [records, setRecords] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_RECS) || '[]') } catch { return [] }
  })
  const [plan, setPlan] = useState(() => {
    try { return { ...DEFAULT_PLAN, ...JSON.parse(localStorage.getItem(LS_PLAN) || '{}') } } catch { return DEFAULT_PLAN }
  })

  const [tab, setTab] = useState('specs')
  const [showSpecForm, setShowSpecForm] = useState(false)
  const [specForm, setSpecForm] = useState(EMPTY_SPEC)
  const [editSpecId, setEditSpecId] = useState(null)
  const [showRecForm, setShowRecForm] = useState(false)
  const [recForm, setRecForm] = useState(EMPTY_RECORD)
  const [editRecId, setEditRecId] = useState(null)
  const [editingPlan, setEditingPlan] = useState(false)
  const [planDraft, setPlanDraft] = useState(null)

  function saveSpecs(list) { setSpecs(list); localStorage.setItem(LS_SPECS, JSON.stringify(list)) }
  function saveRecs(list)  { setRecords(list); localStorage.setItem(LS_RECS, JSON.stringify(list)) }
  function savePlan(p)     { setPlan(p); localStorage.setItem(LS_PLAN, JSON.stringify(p)) }

  function submitSpec() {
    if (!specForm.productName.trim()) return alert('제품명을 입력하세요.')
    let updated
    if (editSpecId) {
      updated = specs.map(s => s.id === editSpecId ? { ...s, ...specForm } : s)
    } else {
      updated = [{ id: genId(), createdAt: today(), ...specForm }, ...specs]
    }
    saveSpecs(updated)
    setShowSpecForm(false); setSpecForm(EMPTY_SPEC); setEditSpecId(null)
  }

  function submitRecord() {
    if (!recForm.date) return alert('일자를 입력하세요.')
    let updated
    if (editRecId) {
      updated = records.map(r => r.id === editRecId ? { ...r, ...recForm } : r)
    } else {
      updated = [{ id: genId(), createdAt: today(), ...recForm }, ...records]
    }
    saveRecs(updated)
    setShowRecForm(false); setRecForm(EMPTY_RECORD); setEditRecId(null)
  }

  const SF = (k, v) => setSpecForm(f => ({ ...f, [k]: v }))
  const RF = (k, v) => setRecForm(f => ({ ...f, [k]: v }))
  const DP = (k, v) => setPlanDraft(d => ({ ...d, [k]: v }))

  function toggleContamType(type) {
    const cur = specForm.contaminationTypes || []
    SF('contaminationTypes', cur.includes(type) ? cur.filter(t => t !== type) : [...cur, type])
  }

  const analysis = useMemo(() => {
    const passCount = records.filter(r => r.result === 'pass').length
    const failCount = records.filter(r => r.result === 'fail').length
    const condCount = records.filter(r => r.result === 'conditional').length
    const passRate = records.length ? Math.round((passCount / records.length) * 100) : 0
    const byClass = {}
    CLEAN_CLASSES.forEach(c => { byClass[c] = specs.filter(s => s.cleanClass === c).length })
    return { passCount, failCount, condCount, passRate, byClass }
  }, [specs, records])

  const RESULT_STYLES = {
    pass:        { label: '합격',     color: '#059669', bg: '#D1FAE5' },
    fail:        { label: '불합격',   color: '#DC2626', bg: '#FEE2E2' },
    conditional: { label: '조건부',   color: '#D97706', bg: '#FEF3C7' },
  }

  return (
    <AppLayout user={user} title="제품 청결·오염 관리" subtitle="ISO 13485 §7.5.2 — 청결 요구사항 및 오염 관리">
      <div className="px-6 lg:px-8 py-6 max-w-[1600px] mx-auto">

        {/* §7.5.2 안내 배너 */}
        <div className="mb-4 p-3 rounded-xl text-[12.5px]" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
          <span className="font-bold" style={{ color: '#1E40AF' }}>§7.5.2 적용 조건: </span>
          <span style={{ color: '#1E40AF' }}>
            청결 상태로 공급되는 제품 · 사용 전 세척이 필요한 제품 · 오염에 민감한 제품 제조 시 청결도 요구사항을 문서화해야 합니다.
          </span>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-soft)' }}>
          {[
            { key: 'specs',   label: '청결도 사양 (' + specs.length + ')' },
            { key: 'records', label: '모니터링 기록 (' + records.length + ')' },
            { key: 'plan',    label: '관리 계획' },
            { key: 'analysis',label: '현황 분석' },
          ].map(function(t) { return (
            <button key={t.key} onClick={function() { setTab(t.key) }}
              className="px-4 py-1.5 rounded-lg text-[13px] font-semibold transition"
              style={{
                background: tab === t.key ? 'var(--bg-card)' : 'transparent',
                color: tab === t.key ? 'var(--moss)' : 'var(--ink-soft)',
                boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                border: 'none', cursor: 'pointer',
              }}>
              {t.label}
            </button>
          )})}
        </div>

        {/* ── 청결도 사양 탭 ── */}
        {tab === 'specs' && (
          <div>
            <div className="flex gap-2 mb-4 items-center">
              {canEdit && (
                <button onClick={function() { setSpecForm(EMPTY_SPEC); setEditSpecId(null); setShowSpecForm(true) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold ml-auto"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} /> 사양 등록
                </button>
              )}
            </div>

            {showSpecForm && (
              <SpecForm form={specForm} SF={SF} onSave={submitSpec}
                onCancel={function() { setShowSpecForm(false); setSpecForm(EMPTY_SPEC); setEditSpecId(null) }}
                isEdit={!!editSpecId} toggleContamType={toggleContamType} />
            )}

            <div className="space-y-3">
              {specs.length === 0 && (
                <div className="text-center py-16 text-[13px]" style={{ color: 'var(--ink-faint)' }}>
                  청결도 사양을 등록하세요.
                </div>
              )}
              {specs.map(function(spec) {
                const aw = APPLIES_WHEN[spec.appliesWhen] || spec.appliesWhen
                return (
                  <div key={spec.id} className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-[14px]" style={{ color: 'var(--ink)' }}>{spec.productName}</span>
                          {spec.productCode && <span className="font-mono text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>{spec.productCode}</span>}
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#EDE9FE', color: '#7C3AED' }}>{spec.cleanClass}</span>
                        </div>
                        <div className="flex gap-3 flex-wrap text-[12px]" style={{ color: 'var(--ink-soft)' }}>
                          <span>{aw}</span>
                          <span>세척: {spec.cleaningMethod}</span>
                          <span>빈도: {spec.frequency}</span>
                          {spec.responsible && <span>담당: {spec.responsible}</span>}
                        </div>
                        {(spec.contaminationTypes || []).length > 0 && (
                          <div className="flex gap-1 flex-wrap mt-1">
                            {spec.contaminationTypes.map(function(ct) { return (
                              <span key={ct} className="text-[10.5px] px-2 py-0.5 rounded-full" style={{ background: '#FEE2E2', color: '#DC2626' }}>{ct}</span>
                            )})}
                          </div>
                        )}
                        {(!spec.acceptanceCriteria || !spec.cleaningProcedureRef) && (
                          <div className="mt-1 text-[11px]" style={{ color: '#D97706' }}>
                            {!spec.acceptanceCriteria && '⚠ 합격 기준 미입력 '}
                            {!spec.cleaningProcedureRef && '⚠ 세척 SOP 참조 미입력'}
                          </div>
                        )}
                      </div>
                      {canEdit && (
                        <div className="flex gap-1 shrink-0">
                          <button onClick={function() { setSpecForm({ ...EMPTY_SPEC, ...spec }); setEditSpecId(spec.id); setShowSpecForm(true) }}
                            className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                            <Edit2 size={12} style={{ color: 'var(--ink-soft)' }} />
                          </button>
                          <button onClick={function() { if(window.confirm('삭제하시겠습니까?')) saveSpecs(specs.filter(function(s) { return s.id !== spec.id })) }}
                            className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', border: '1px solid #FECACA', cursor: 'pointer' }}>
                            <Trash2 size={12} style={{ color: '#DC2626' }} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── 모니터링 기록 탭 ── */}
        {tab === 'records' && (
          <div>
            <div className="flex gap-2 mb-4 items-center">
              {canEdit && (
                <button onClick={function() { setRecForm(EMPTY_RECORD); setEditRecId(null); setShowRecForm(true) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold ml-auto"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} /> 기록 등록
                </button>
              )}
            </div>

            {showRecForm && (
              <RecordForm form={recForm} RF={RF} specs={specs} onSave={submitRecord}
                onCancel={function() { setShowRecForm(false); setRecForm(EMPTY_RECORD); setEditRecId(null) }}
                isEdit={!!editRecId} RESULT_STYLES={RESULT_STYLES} />
            )}

            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
              <table className="w-full text-[12px]">
                <thead>
                  <tr style={{ background: 'var(--bg-soft)' }}>
                    {['일자', '제품/사양', '로트 번호', '결과', '미립자', '미생물', '검사자', '비고', ''].map(function(h) { return (
                      <th key={h} className="px-2 py-2 text-left font-semibold" style={{ color: 'var(--ink-soft)' }}>{h}</th>
                    )})}
                  </tr>
                </thead>
                <tbody>
                  {records.length === 0 && (
                    <tr><td colSpan={9} className="text-center py-12" style={{ color: 'var(--ink-faint)' }}>모니터링 기록이 없습니다.</td></tr>
                  )}
                  {records.map(function(rec, idx) {
                    var rs = RESULT_STYLES[rec.result] || RESULT_STYLES.pass
                    var specName = (specs.find(function(s) { return s.id === rec.specId }) || {}).productName || '—'
                    return (
                      <tr key={rec.id} style={{ background: idx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-soft)', borderTop: '1px solid var(--line)' }}>
                        <td className="px-2 py-2" style={{ color: 'var(--ink)' }}>{rec.date}</td>
                        <td className="px-2 py-2" style={{ color: 'var(--ink-soft)' }}>{specName}</td>
                        <td className="px-2 py-2 font-mono text-[11px]" style={{ color: 'var(--ink-soft)' }}>{rec.lotNo || '—'}</td>
                        <td className="px-2 py-2">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: rs.bg, color: rs.color }}>{rs.label}</span>
                        </td>
                        <td className="px-2 py-2" style={{ color: 'var(--ink-soft)' }}>{rec.particleResult || '—'}</td>
                        <td className="px-2 py-2" style={{ color: 'var(--ink-soft)' }}>{rec.microbialResult || '—'}</td>
                        <td className="px-2 py-2" style={{ color: 'var(--ink-soft)' }}>{rec.inspector || '—'}</td>
                        <td className="px-2 py-2 text-[11.5px]" style={{ color: 'var(--ink-soft)' }}>{rec.notes || '—'}</td>
                        <td className="px-2 py-2">
                          {canEdit && (
                            <div className="flex gap-1">
                              <button onClick={function() { setRecForm({ ...EMPTY_RECORD, ...rec }); setEditRecId(rec.id); setShowRecForm(true) }}
                                className="p-1 rounded" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                                <Edit2 size={10} style={{ color: 'var(--ink-soft)' }} />
                              </button>
                              <button onClick={function() { if(window.confirm('삭제?')) saveRecs(records.filter(function(r) { return r.id !== rec.id })) }}
                                className="p-1 rounded" style={{ background: '#FEE2E2', border: 'none', cursor: 'pointer' }}>
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

        {/* ── 관리 계획 탭 ── */}
        {tab === 'plan' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              {!editingPlan && canEdit && (
                <button onClick={function() { setPlanDraft({ ...plan }); setEditingPlan(true) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Edit2 size={13} /> 편집
                </button>
              )}
              {editingPlan && (
                <div className="flex gap-2">
                  <button onClick={function() { savePlan(planDraft); setEditingPlan(false); setPlanDraft(null) }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
                    style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                    <Save size={13} /> 저장
                  </button>
                  <button onClick={function() { setEditingPlan(false); setPlanDraft(null) }}
                    className="px-4 py-2 rounded-xl text-[13px]"
                    style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>취소</button>
                </div>
              )}
            </div>

            {[
              { key: 'scope', label: '§7.5.2 적용 범위', ph: '본 절차는 청결 상태로 공급되는 모든 의료기기에 적용됩니다...' },
              { key: 'contaminationRiskAssessment', label: '오염 위험 평가', ph: '미립자, 미생물, 화학 오염물질에 대한 위험 평가 요약...' },
              { key: 'environmentReqs', label: '환경 요구사항 (§6.4 연계)', ph: '클린룸 Class, 온도·습도, 환기 횟수, 복장 규정...' },
              { key: 'monitoringPlan', label: '모니터링 계획', ph: '파티클 카운터 주기, 미생물 낙하균 측정, 표면 오염 검사...' },
              { key: 'cleaningValidationSummary', label: '세척 밸리데이션 요약', ph: 'VAL-xxxx 참조, IQ/OQ/PQ 완료, 재밸리데이션 주기...' },
            ].map(function(field) { return (
              <div key={field.key} className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                <div className="text-[12.5px] font-bold mb-2" style={{ color: 'var(--ink)' }}>{field.label}</div>
                {editingPlan ? (
                  <textarea value={planDraft[field.key] || ''} onChange={function(e) { DP(field.key, e.target.value) }}
                    rows={3} placeholder={field.ph}
                    className="w-full px-3 py-2 rounded-xl text-[13px] resize-none"
                    style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
                ) : (
                  plan[field.key]
                    ? <p className="text-[13px] whitespace-pre-line" style={{ color: 'var(--ink)' }}>{plan[field.key]}</p>
                    : <p className="text-[12.5px]" style={{ color: 'var(--ink-faint)' }}>{field.ph}</p>
                )}
              </div>
            )})}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { key: 'revision', label: '개정 번호', type: 'text' },
                { key: 'issueDate', label: '발행일', type: 'date' },
                { key: 'approvedBy', label: '승인자', type: 'text' },
              ].map(function(f) { return (
                <div key={f.key} className="p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                  <div className="text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{f.label}</div>
                  {editingPlan ? (
                    <input type={f.type} value={planDraft[f.key] || ''} onChange={function(e) { DP(f.key, e.target.value) }}
                      className="w-full px-2 py-1 rounded-lg text-[13px]"
                      style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
                  ) : (
                    <p className="text-[13px]" style={{ color: 'var(--ink)' }}>{plan[f.key] || '—'}</p>
                  )}
                </div>
              )})}
            </div>
          </div>
        )}

        {/* ── 분석 탭 ── */}
        {tab === 'analysis' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: '등록 제품 사양', value: specs.length, color: '#2563EB', bg: '#DBEAFE' },
                { label: '모니터링 기록', value: records.length, color: '#7C3AED', bg: '#EDE9FE' },
                { label: '합격 건수', value: analysis.passCount, color: '#059669', bg: '#D1FAE5' },
                { label: '불합격 건수', value: analysis.failCount, color: analysis.failCount > 0 ? '#DC2626' : '#059669', bg: analysis.failCount > 0 ? '#FEE2E2' : '#D1FAE5' },
              ].map(function(c) { return (
                <div key={c.label} className="p-4 rounded-2xl text-center" style={{ background: c.bg, border: '1px solid ' + c.color + '30' }}>
                  <div className="text-[26px] font-bold" style={{ color: c.color }}>{c.value}</div>
                  <div className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>{c.label}</div>
                </div>
              )})}
            </div>

            {records.length > 0 && (
              <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>
                  합격률: {analysis.passRate}%
                </div>
                <div className="flex h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-soft)' }}>
                  {analysis.passCount > 0 && (
                    <div style={{ width: (analysis.passCount / records.length * 100) + '%', background: '#059669' }} />
                  )}
                  {analysis.condCount > 0 && (
                    <div style={{ width: (analysis.condCount / records.length * 100) + '%', background: '#D97706' }} />
                  )}
                  {analysis.failCount > 0 && (
                    <div style={{ width: (analysis.failCount / records.length * 100) + '%', background: '#DC2626' }} />
                  )}
                </div>
                <div className="flex gap-4 mt-2 text-[12px]" style={{ color: 'var(--ink-soft)' }}>
                  <span style={{ color: '#059669' }}>■ 합격 {analysis.passCount}</span>
                  <span style={{ color: '#D97706' }}>■ 조건부 {analysis.condCount}</span>
                  <span style={{ color: '#DC2626' }}>■ 불합격 {analysis.failCount}</span>
                </div>
              </div>
            )}

            {/* 미비 항목 */}
            {specs.filter(function(s) { return !s.acceptanceCriteria || !s.cleaningProcedureRef }).length > 0 && (
              <div className="p-4 rounded-2xl" style={{ background: '#FEF3C7', border: '1px solid #FCD34D' }}>
                <div className="text-[13px] font-bold mb-2" style={{ color: '#92400E' }}>⚠ 청결도 사양 미비 항목</div>
                {specs.filter(function(s) { return !s.acceptanceCriteria || !s.cleaningProcedureRef }).map(function(s) { return (
                  <div key={s.id} className="text-[12px]" style={{ color: '#92400E' }}>
                    {s.productName} —
                    {!s.acceptanceCriteria ? ' 합격 기준 미입력' : ''}
                    {!s.cleaningProcedureRef ? ' SOP 참조 미입력' : ''}
                  </div>
                )})}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

// ── 사양 등록 폼 ─────────────────────────────────────────────
function SpecForm({ form, SF, onSave, onCancel, isEdit, toggleContamType }) {
  return (
    <div className="mb-5 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>
        {isEdit ? '청결도 사양 수정' : '청결도 사양 등록 (§7.5.2)'}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <F label="제품명 *" value={form.productName} onChange={function(v) { SF('productName', v) }} />
        <F label="제품 코드" value={form.productCode} onChange={function(v) { SF('productCode', v) }} />
        <div>
          <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>§7.5.2 적용 조건</label>
          <select value={form.appliesWhen} onChange={function(e) { SF('appliesWhen', e.target.value) }}
            className="w-full px-3 py-1.5 rounded-xl text-[13px]"
            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
            {Object.entries(APPLIES_WHEN).map(function([k,v]) { return <option key={k} value={k}>{v}</option> })}
          </select>
        </div>
        <div>
          <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>청결도 등급</label>
          <select value={form.cleanClass} onChange={function(e) { SF('cleanClass', e.target.value) }}
            className="w-full px-3 py-1.5 rounded-xl text-[13px]"
            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
            {CLEAN_CLASSES.map(function(c) { return <option key={c} value={c}>{c}</option> })}
          </select>
        </div>
        <div>
          <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>세척 방법</label>
          <select value={form.cleaningMethod} onChange={function(e) { SF('cleaningMethod', e.target.value) }}
            className="w-full px-3 py-1.5 rounded-xl text-[13px]"
            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
            {CLEANING_METHODS.map(function(m) { return <option key={m} value={m}>{m}</option> })}
          </select>
        </div>
        <div>
          <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>모니터링 빈도</label>
          <select value={form.frequency} onChange={function(e) { SF('frequency', e.target.value) }}
            className="w-full px-3 py-1.5 rounded-xl text-[13px]"
            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
            {MONITOR_FREQS.map(function(f) { return <option key={f} value={f}>{f}</option> })}
          </select>
        </div>
        <F label="미립자 한도" value={form.particleLimit} onChange={function(v) { SF('particleLimit', v) }} placeholder="≤ 352,000개/m³" />
        <F label="미생물 한도" value={form.microbialLimit} onChange={function(v) { SF('microbialLimit', v) }} placeholder="≤ 100 CFU/m³" />
        <F label="화학 잔류 한도" value={form.chemicalLimit} onChange={function(v) { SF('chemicalLimit', v) }} placeholder="≤ 10 µg/cm²" />
        <F label="합격 기준 *" value={form.acceptanceCriteria} onChange={function(v) { SF('acceptanceCriteria', v) }} placeholder="파티클 카운트 기준치 이하..." />
        <F label="세척 SOP 참조 *" value={form.cleaningProcedureRef} onChange={function(v) { SF('cleaningProcedureRef', v) }} placeholder="SOP-CLN-001" />
        <F label="밸리데이션 참조" value={form.validationRef} onChange={function(v) { SF('validationRef', v) }} placeholder="VAL-CLN-001" />
        <F label="검사 방법" value={form.inspectionMethod} onChange={function(v) { SF('inspectionMethod', v) }} placeholder="파티클 카운터 측정..." />
        <F label="담당자" value={form.responsible} onChange={function(v) { SF('responsible', v) }} />
      </div>

      <div className="mb-3">
        <label className="block text-[11.5px] font-semibold mb-1.5" style={{ color: 'var(--ink-soft)' }}>오염 유형 (해당 항목 선택)</label>
        <div className="flex flex-wrap gap-2">
          {CONTAMINATION_TYPES.map(function(ct) {
            var selected = (form.contaminationTypes || []).includes(ct)
            return (
              <button key={ct} type="button" onClick={function() { toggleContamType(ct) }}
                className="px-3 py-1 rounded-full text-[12px] font-semibold transition"
                style={{
                  background: selected ? '#FEE2E2' : 'var(--bg-soft)',
                  color: selected ? '#DC2626' : 'var(--ink-soft)',
                  border: selected ? '1px solid #FECACA' : '1px solid var(--line)',
                  cursor: 'pointer',
                }}>
                {ct}
              </button>
            )
          })}
        </div>
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

// ── 모니터링 기록 폼 ─────────────────────────────────────────
function RecordForm({ form, RF, specs, onSave, onCancel, isEdit, RESULT_STYLES }) {
  return (
    <div className="mb-5 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>
        {isEdit ? '기록 수정' : '모니터링 기록 등록'}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <div>
          <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>청결도 사양</label>
          <select value={form.specId} onChange={function(e) { RF('specId', e.target.value) }}
            className="w-full px-3 py-1.5 rounded-xl text-[13px]"
            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
            <option value="">-- 사양 선택 --</option>
            {specs.map(function(s) { return <option key={s.id} value={s.id}>{s.productName}</option> })}
          </select>
        </div>
        <F label="일자" type="date" value={form.date} onChange={function(v) { RF('date', v) }} />
        <F label="로트 번호" value={form.lotNo} onChange={function(v) { RF('lotNo', v) }} />
        <div>
          <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>결과</label>
          <select value={form.result} onChange={function(e) { RF('result', e.target.value) }}
            className="w-full px-3 py-1.5 rounded-xl text-[13px]"
            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
            {Object.entries(RESULT_STYLES).map(function([k,v]) { return <option key={k} value={k}>{v.label}</option> })}
          </select>
        </div>
        <F label="미립자 측정값" value={form.particleResult} onChange={function(v) { RF('particleResult', v) }} placeholder="12,500개/m³" />
        <F label="미생물 측정값" value={form.microbialResult} onChange={function(v) { RF('microbialResult', v) }} placeholder="3 CFU/m³" />
        <F label="검사자" value={form.inspector} onChange={function(v) { RF('inspector', v) }} />
        <F label="일탈 참조 번호" value={form.deviationRef} onChange={function(v) { RF('deviationRef', v) }} placeholder="DEV-2026-001" />
        <F label="비고" value={form.notes} onChange={function(v) { RF('notes', v) }} />
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

function F({ label, value, onChange, type, placeholder }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <input type={type || 'text'} value={value || ''} onChange={function(e) { onChange(e.target.value) }} placeholder={placeholder}
        className="w-full px-3 py-1.5 rounded-xl text-[13px]"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
    </div>
  )
}
