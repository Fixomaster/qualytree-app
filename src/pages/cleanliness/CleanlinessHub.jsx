// src/pages/cleanliness/CleanlinessHub.jsx
// ISO 13485 §7.5.2 — 청결 및 오염 관리
import React, { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Plus, Save, Edit2, Trash2, CheckCircle2, AlertTriangle,
  Wind, Shield, FlaskConical, ClipboardList, BarChart2, Printer, X, ExternalLink,
  ChevronDown, ChevronUp, Thermometer, Droplets, Activity,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'
import { printCleanlinessCert } from '../../lib/pdfPrint'
import { onboarding } from '../../lib/onboardingState'
import { deriveCleanlinessSpecs } from '../../lib/cleanlinessSpecConstants'
import { getZones, paToMmH2O, mmH2OToPa } from '../../lib/envMonitoring'

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
  '미립자 (파티클)', '미생물', '이물 (Foreign Matter)', '화학물질', '정전기 (ESD)',
  '교차 오염', '중금속', '발열원', '기타',
]

// 모니터링 빈도
const MONITOR_FREQS = ['매 배치', '매일', '매주', '매월', '분기별', '수시']

function today() { return new Date().toISOString().slice(0, 10) }
function genId()  { return 'CL-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-5) }

// 등록된 청결도 사양(SSoT)을 기반으로 관리 계획 본문을 자동 생성
function buildAutoPlanContent(specs) {
  if (!specs || specs.length === 0) {
    return {
      scope: '청결 상태로 공급되는 제품 · 사용 전 세척이 필요한 제품 · 오염에 민감한 제품 제조 시 적용됩니다. (청결도 사양을 등록하면 대상 제품 목록이 자동 반영됩니다.)',
      contaminationRiskAssessment: '',
      environmentReqs: '',
      monitoringPlan: '',
      cleaningValidationSummary: '',
    }
  }
  const productNames = specs.map(function(s) { return s.productName }).filter(Boolean)
  const classCount = {}
  specs.forEach(function(s) { classCount[s.cleanClass] = (classCount[s.cleanClass] || 0) + 1 })
  const classSummary = Object.entries(classCount).map(function([k, v]) { return k + '(' + v + '개 제품)' }).join(', ')
  const methodSet = Array.from(new Set(specs.map(function(s) { return s.cleaningMethod }).filter(Boolean)))
  const freqSet = Array.from(new Set(specs.map(function(s) { return s.frequency }).filter(Boolean)))
  const contamTypeCount = {}
  specs.forEach(function(s) { (s.contaminationTypes || []).forEach(function(t) { contamTypeCount[t] = (contamTypeCount[t] || 0) + 1 }) })
  const contamEntries = Object.entries(contamTypeCount)
  const contamSummary = contamEntries.length
    ? contamEntries.map(function([k, v]) { return k + '(' + v + '건)' }).join(', ')
    : '등록된 오염 유형 없음'

  const scope = '본 절차는 등록된 ' + specs.length + '개 제품(' + productNames.join(', ') + ')의 §7.5.2 청결 요구사항 및 오염 관리에 적용됩니다.'
  const contaminationRiskAssessment = '등록된 청결도 사양 기준 주요 오염 위험 유형: ' + contamSummary + '. 제품별 세부 관리 방안은 청결도 사양에서 개별 관리됩니다.'
  const environmentReqs = '클린룸 등급: ' + (classSummary || '미지정') + '. 세척 방법: ' + (methodSet.join(', ') || '미지정') + '. 모니터링 빈도: ' + (freqSet.join(', ') || '미지정') + '. (§6.4 작업환경 요구사항과 연계 관리 — 환경관리 절차서 참조)'
  const monitoringPlan = '등록된 제품별 청결도 사양의 모니터링 빈도(' + (freqSet.join(', ') || '미지정') + ')에 따라 미립자·미생물(및 필요 시 온도·습도·차압) 측정을 수행하며, 측정 결과는 모니터링 기록에 등록하고 성적서로 관리합니다.'
  const cleaningValidationSummary = specs.map(function(s) {
    return s.productName + ': ' + (s.validationRef ? s.validationRef + ' (밸리데이션 완료)' : '밸리데이션 미실시')
  }).join('\n')

  return { scope, contaminationRiskAssessment, environmentReqs, monitoringPlan, cleaningValidationSummary }
}

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
  zoneId: '',        // 측정 구역(작업환경관리 구역 참조) — 구역이 1개뿐이면 자동 선택
  date: today(),
  lotNo: '',
  result: 'pass',    // pass | fail | conditional
  particleResult: '',
  microbialResult: '',
  foreignMatterResult: '',
  temperature: '',
  humidity: '',
  pressureDiff: '',
  notes: '',
}

const DEFAULT_PLAN = {
  revision: 'Rev.0', issueDate: '', approvedBy: '',
  scope: '',
  contaminationRiskAssessment: '',
  environmentReqs: '',
  monitoringPlan: '',
  cleaningValidationSummary: '',
  pestControl: '',
  revisionHistory: [],
}

export default function CleanlinessHub() {
  const user = auth.current()
  const canEdit = user?.level >= 2
  const nav = useNavigate()

  // 청결도 사양은 제품·공정 화면(제품 개발)에서 입력된 제품 레코드로부터 파생된다 (SSoT).
  const specs = useMemo(() => deriveCleanlinessSpecs(onboarding.load()?.products || []), [])
  const goToProduct = (productId) => nav('/products?tab=product&productId=' + encodeURIComponent(productId) + '&detailTab=info')
  const goToProducts = () => nav('/products?tab=product')
  // 측정 구역(온도·습도·파티클·차압 허용범위)은 품질검사 > 작업환경관리에서 관리한다 (SSoT).
  const zones = useMemo(() => getZones(), [])
  const goToWorkEnv = () => nav('/workenv?tab=zones')

  const [records, setRecords] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_RECS) || '[]') } catch { return [] }
  })
  const [plan, setPlan] = useState(() => {
    try { return { ...DEFAULT_PLAN, ...JSON.parse(localStorage.getItem(LS_PLAN) || '{}') } } catch { return DEFAULT_PLAN }
  })

  const [searchParams] = useSearchParams()
  const initialTab = ['specs','records','plan','analysis'].includes(searchParams.get('tab')) ? searchParams.get('tab') : 'specs'
  const [tab, setTab] = useState(initialTab)
  const [showRecForm, setShowRecForm] = useState(false)
  const [recForm, setRecForm] = useState(EMPTY_RECORD)
  const [editRecId, setEditRecId] = useState(null)
  const [expandedRec, setExpandedRec] = useState(null)
  const [valRow, setValRow] = useState(null)

  function saveRecs(list)  { setRecords(list); localStorage.setItem(LS_RECS, JSON.stringify(list)) }
  function savePlan(p)     { setPlan(p); localStorage.setItem(LS_PLAN, JSON.stringify(p)) }

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

  const RF = (k, v) => setRecForm(f => ({ ...f, [k]: v }))

  const analysis = useMemo(() => {
    const passCount = records.filter(r => r.result === 'pass').length
    const failCount = records.filter(r => r.result === 'fail').length
    const condCount = records.filter(r => r.result === 'conditional').length
    const passRate = records.length ? Math.round((passCount / records.length) * 100) : 0
    const byClass = {}
    CLEAN_CLASSES.forEach(c => { byClass[c] = specs.filter(s => s.cleanClass === c).length })

    const monthlyMap = {}
    records.forEach(r => {
      const m = (r.date || '').slice(0, 7) || '미상'
      if (!monthlyMap[m]) monthlyMap[m] = { total: 0, pass: 0 }
      monthlyMap[m].total += 1
      if (r.result === 'pass') monthlyMap[m].pass += 1
    })
    const monthly = Object.keys(monthlyMap).sort().reverse().map(m => ({
      month: m,
      total: monthlyMap[m].total,
      pass: monthlyMap[m].pass,
      passRate: monthlyMap[m].total ? Math.round((monthlyMap[m].pass / monthlyMap[m].total) * 100) : 0,
    }))

    return { passCount, failCount, condCount, passRate, byClass, monthly }
  }, [specs, records])

  const RESULT_STYLES = {
    pass:        { label: '합격',     color: '#059669', bg: '#D1FAE5' },
    fail:        { label: '불합격',   color: '#DC2626', bg: '#FEE2E2' },
    conditional: { label: '조건부',   color: '#D97706', bg: '#FEF3C7' },
  }

  return (
    <AppLayout user={user} title="제품 청결·오염 관리" subtitle="ISO 13485 §7.5.2 — 청결 요구사항 및 오염 관리">
      <HubBanner title="제품 청결·오염 관리" subtitle="ISO 13485 §7.5.2 — 청결 요건·오염 관리·환경 모니터링" icon={Wind} color="#0891B2" />
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

        {/* ── 청결도 사양 탭 (제품 개발 화면에서 파생, 읽기 전용) ── */}
        {tab === 'specs' && (
          <div>
            <div className="flex gap-2 mb-4 items-center justify-between flex-wrap">
              <span className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>
                제품·공정 &gt; 제품 개발 화면에서 입력한 청결도 사양이 여기 자동 반영됩니다.
              </span>
              {canEdit && (
                <button onClick={goToProducts}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <ExternalLink size={14} /> 제품 개발에서 사양 입력
                </button>
              )}
            </div>

            <div className="space-y-3">
              {specs.length === 0 && (
                <div className="text-center py-16 text-[13px]" style={{ color: 'var(--ink-faint)' }}>
                  등록된 청결도 사양이 없습니다.
                  <div className="text-[12px] mt-1.5">제품·공정 &gt; 제품 개발 화면에서 제품을 "청결도·오염 관리 대상"으로 설정하고 사양을 입력하세요.</div>
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
                      {canEdit && spec.productId && (
                        <button onClick={function() { goToProduct(spec.productId) }}
                          className="flex items-center gap-1 shrink-0 text-[11.5px] px-2.5 py-1.5 rounded-lg"
                          style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink-soft)', cursor: 'pointer' }}>
                          <ExternalLink size={12} /> 제품 개발에서 관리
                        </button>
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
              <span className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>카드 클릭 시 상세·성적서 확인</span>
              {canEdit && (
                <button onClick={function() { setRecForm({ ...EMPTY_RECORD, zoneId: zones.length === 1 ? zones[0].id : '' }); setEditRecId(null); setShowRecForm(true) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold ml-auto"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} /> 기록 등록
                </button>
              )}
            </div>

            {showRecForm && (
              <RecordForm form={recForm} RF={RF} specs={specs} zones={zones} goToWorkEnv={goToWorkEnv} onSave={submitRecord}
                onCancel={function() { setShowRecForm(false); setRecForm(EMPTY_RECORD); setEditRecId(null) }}
                isEdit={!!editRecId} RESULT_STYLES={RESULT_STYLES} />
            )}

            {records.length === 0 ? (
              <div className="text-center py-16 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                <ClipboardList size={40} strokeWidth={1} className="mx-auto mb-3 opacity-30" />
                <div className="text-[13px]" style={{ color: 'var(--ink-faint)' }}>모니터링 기록이 없습니다.</div>
              </div>
            ) : (
              <div className="space-y-2">
                {records.map(function(rec) {
                  var spec = specs.find(function(s) { return s.id === rec.specId }) || {}
                  return (
                    <RecordCard key={rec.id} rec={rec} spec={spec} zone={zones.find(function(z) { return z.id === rec.zoneId })} canEdit={canEdit}
                      expanded={expandedRec === rec.id}
                      onToggle={function() { setExpandedRec(expandedRec === rec.id ? null : rec.id) }}
                      onEdit={function() { setRecForm({ ...EMPTY_RECORD, ...rec }); setEditRecId(rec.id); setShowRecForm(true) }}
                      onDelete={function() { if (window.confirm('삭제?')) saveRecs(records.filter(function(r) { return r.id !== rec.id })) }}
                      onPrint={function() { printCleanlinessCert(rec, spec) }}
                      RESULT_STYLES={RESULT_STYLES} />
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── 관리 계획 탭 ── */}
        {tab === 'plan' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center gap-2 flex-wrap">
              <span className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>
                관리 계획 본문은 청결도 사양(SSoT) 등록 내용을 기반으로 자동 생성됩니다. 수기 편집은 지원하지 않습니다 — 제품·공정 화면에서 사양을 갱신한 뒤 아래 버튼으로 다시 생성하세요.
              </span>
              {canEdit && (
                <button onClick={function() { savePlan({ ...plan, ...buildAutoPlanContent(specs) }) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
                  style={{ background: '#EDE9FE', color: '#7C3AED', border: '1px solid #DDD6FE', cursor: 'pointer' }}>
                  <Wind size={13} /> 사양 기반 자동 생성
                </button>
              )}
            </div>

            {[
              { key: 'scope', label: '§7.5.2 적용 범위', ph: '사양 기반 자동 생성 버튼을 눌러 청결도 사양(SSoT) 기반 내용을 생성하세요.' },
              { key: 'contaminationRiskAssessment', label: '오염 위험 평가', ph: '사양 기반 자동 생성 버튼을 눌러 생성하세요.' },
              { key: 'environmentReqs', label: '환경 요구사항 (§6.4 연계)', ph: '사양 기반 자동 생성 버튼을 눌러 생성하세요.' },
              { key: 'monitoringPlan', label: '모니터링 계획', ph: '사양 기반 자동 생성 버튼을 눌러 생성하세요.' },
              { key: 'cleaningValidationSummary', label: '세척 밸리데이션 요약', ph: '사양 기반 자동 생성 버튼을 눌러 생성하세요.' },
            ].map(function(field) { return (
              <div key={field.key} className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                <div className="text-[12.5px] font-bold mb-2" style={{ color: 'var(--ink)' }}>{field.label}</div>
                {plan[field.key]
                  ? <p className="text-[13px] whitespace-pre-line" style={{ color: 'var(--ink)' }}>{plan[field.key]}</p>
                  : <p className="text-[12.5px]" style={{ color: 'var(--ink-faint)' }}>{field.ph}</p>}
              </div>
            )})}

            <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="text-[12.5px] font-bold mb-2" style={{ color: 'var(--ink)' }}>방충·방서 관리 (이물 유입 예방)</div>
              <div className="text-[11px] mb-2" style={{ color: 'var(--ink-faint)' }}>
                제조소 방충·방서 트랩(포집기) 설치 현황, 점검 주기, 서식 흔적 발견 시 조치 절차 등을 기재합니다 — §7.5.2 이물(Foreign Matter) 오염 관리의 일부입니다.
              </div>
              {canEdit ? (
                <textarea
                  value={plan.pestControl || ''}
                  onChange={function(e) { savePlan({ ...plan, pestControl: e.target.value }) }}
                  placeholder={'예: 제조소 내 방충등 O개·트랩(포집기) O개 설치, 월 1회 정기 점검 및 결과 기록. 방역업체(위탁 시 업체명) 분기 1회 방제 실시. 트랩에서 서식 흔적 발견 시 즉시 방제 조치 후 청결오염관리 기록에 등록.'}
                  className="w-full px-3 py-2 rounded-lg text-[13px] whitespace-pre-line"
                  style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)', minHeight: 90 }}
                />
              ) : (
                plan.pestControl
                  ? <p className="text-[13px] whitespace-pre-line" style={{ color: 'var(--ink)' }}>{plan.pestControl}</p>
                  : <p className="text-[12.5px]" style={{ color: 'var(--ink-faint)' }}>등록된 내용이 없습니다.</p>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { key: 'revision', label: '개정 번호', type: 'text' },
                { key: 'issueDate', label: '발행일', type: 'date' },
                { key: 'approvedBy', label: '승인자', type: 'text' },
              ].map(function(f) { return (
                <div key={f.key} className="p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                  <div className="text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{f.label}</div>
                  {canEdit ? (
                    <input type={f.type} value={plan[f.key] || ''} onChange={function(e) { savePlan({ ...plan, [f.key]: e.target.value }) }}
                      className="w-full px-2 py-1 rounded-lg text-[13px]"
                      style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
                  ) : (
                    <p className="text-[13px]" style={{ color: 'var(--ink)' }}>{plan[f.key] || '—'}</p>
                  )}
                </div>
              )})}
            </div>

            <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="text-[12.5px] font-bold mb-3" style={{ color: 'var(--ink)' }}>
                제품별 밸리데이션 현황 ({specs.length}) {specs.length > 0 && <span className="font-normal" style={{ color: 'var(--ink-faint)' }}>· 행 클릭 시 밸리데이션 조건 확인</span>}
              </div>
              {specs.length === 0 ? (
                <p className="text-[12.5px]" style={{ color: 'var(--ink-faint)' }}>청결도 사양을 등록하면 제품별 밸리데이션 현황이 여기에 표시됩니다.</p>
              ) : (
                <div className="space-y-2">
                  {specs.map(function(s) { return (
                    <div key={s.id} onClick={function() { setValRow(s) }} className="flex items-center justify-between gap-3 p-3 rounded-xl cursor-pointer"
                      style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', transition: 'background 0.1s' }}
                      onMouseEnter={function(e) { e.currentTarget.style.background = '#EDE9FE' }}
                      onMouseLeave={function(e) { e.currentTarget.style.background = 'var(--bg-soft)' }}>
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="font-bold text-[13px]" style={{ color: 'var(--ink)' }}>{s.productName}</span>
                        {s.productCode && <span className="font-mono text-[11px]" style={{ color: 'var(--ink-faint)' }}>{s.productCode}</span>}
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#EDE9FE', color: '#7C3AED' }}>{s.cleanClass}</span>
                      </div>
                      <span className="text-[11.5px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: s.validationRef ? '#D1FAE5' : '#FEE2E2', color: s.validationRef ? '#059669' : '#DC2626' }}>
                        {s.validationRef ? '밸리데이션 완료' : '밸리데이션 미실시'}
                      </span>
                    </div>
                  )})}
                </div>
              )}
            </div>

            {valRow && (
              <CertModal title="밸리데이션 조건 확인" onClose={function() { setValRow(null) }}>
                <ValidationDetail spec={valRow} onClose={function() { setValRow(null) }} />
              </CertModal>
            )}
          </div>
        )}

        {/* ── 분석 탭 ── */}
        {tab === 'analysis' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
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

            <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>월별 모니터링 현황</div>
              {analysis.monthly.length === 0 ? (
                <p className="text-[12.5px]" style={{ color: 'var(--ink-faint)' }}>모니터링 기록을 등록하면 월별 현황이 표시됩니다.</p>
              ) : (
                <div className="space-y-2">
                  {analysis.monthly.map(function(m) { return (
                    <div key={m.month} className="flex items-center justify-between gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-soft)' }}>
                      <span className="font-mono text-[12.5px] font-bold" style={{ color: 'var(--ink)' }}>{m.month}</span>
                      <div className="flex-1 mx-3 h-2 rounded-full overflow-hidden" style={{ background: 'var(--line)' }}>
                        <div style={{ width: m.passRate + '%', height: '100%', background: m.passRate >= 90 ? '#059669' : m.passRate >= 70 ? '#D97706' : '#DC2626' }} />
                      </div>
                      <span className="text-[12.5px] whitespace-nowrap" style={{ color: 'var(--ink-soft)' }}>
                        {m.total}건 · 합격률 {m.passRate}%
                      </span>
                    </div>
                  )})}
                </div>
              )}
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
function RecordForm({ form, RF, specs, zones, goToWorkEnv, onSave, onCancel, isEdit, RESULT_STYLES }) {
  const [pressUnit, setPressUnit] = React.useState('Pa')
  const selectedSpec = specs.find(function(s) { return s.id === form.specId })
  // 선택된 사양에 밸리데이션 참조가 있으면 미립자/미생물 측정값은 밸리데이션으로 대체되므로 입력칸을 숨긴다. (#173)
  const validationSubstituted = !!(selectedSpec && selectedSpec.validationRef)
  const pressDisplay = pressUnit === 'Pa' ? form.pressureDiff : paToMmH2O(form.pressureDiff)
  const onPressChange = function(v) { RF('pressureDiff', pressUnit === 'Pa' ? v : mmH2OToPa(parseFloat(v))) }
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
        <div>
          <label className="flex items-center justify-between text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>
            <span>측정 구역</span>
            {zones.length === 0 && (
              <button type="button" onClick={goToWorkEnv} className="text-[10px] font-bold" style={{ color: 'var(--moss)', background: 'none', border: 'none', cursor: 'pointer' }}>+ 구역 등록</button>
            )}
          </label>
          <select value={form.zoneId} onChange={function(e) { RF('zoneId', e.target.value) }}
            className="w-full px-3 py-1.5 rounded-xl text-[13px]"
            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
            <option value="">{zones.length === 0 ? '등록된 구역 없음' : '-- 구역 선택 --'}</option>
            {zones.map(function(z) { return <option key={z.id} value={z.id}>{z.name}</option> })}
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
        {!validationSubstituted && (
          <>
            <div>
              <F label="미립자 측정값 (선택)" value={form.particleResult} onChange={function(v) { RF('particleResult', v) }} placeholder="12,500개/m³" />
              <div className="text-[10px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>밸리데이션으로 대체 가능 — 필요 시에만 입력</div>
            </div>
            <F label="미생물 측정값" value={form.microbialResult} onChange={function(v) { RF('microbialResult', v) }} placeholder="3 CFU/m³" />
          </>
        )}
        <F label="이물 검사 결과" value={form.foreignMatterResult} onChange={function(v) { RF('foreignMatterResult', v) }} placeholder="예: 육안 검사 이상없음 / 이물 2건 검출" />
        <F label="온도 (℃)" value={form.temperature} onChange={function(v) { RF('temperature', v) }} placeholder="22.5" />
        <F label="습도 (%RH)" value={form.humidity} onChange={function(v) { RF('humidity', v) }} placeholder="45" />
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11.5px] font-semibold" style={{ color: 'var(--ink-soft)' }}>차압</label>
            <button type="button" onClick={function() { setPressUnit(function(u) { return u === 'Pa' ? 'mmH2O' : 'Pa' }) }}
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink-soft)', cursor: 'pointer' }}>
              {pressUnit === 'Pa' ? 'Pa → mmH₂O' : 'mmH₂O → Pa'}
            </button>
          </div>
          <input value={pressDisplay} onChange={function(e) { onPressChange(e.target.value) }} placeholder={pressUnit === 'Pa' ? '15' : '1.53'}
            className="w-full px-3 py-1.5 rounded-xl text-[13px]" style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
        </div>
        <F label="비고" value={form.notes} onChange={function(v) { RF('notes', v) }} />
      </div>
      {validationSubstituted && (
        <div className="mb-3 text-[11px] px-2.5 py-2 rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>
          ℹ 이 제품은 밸리데이션 참조({selectedSpec.validationRef})가 등록되어 있어 미립자·미생물 측정값이 밸리데이션 결과로 대체됩니다.
        </div>
      )}
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

// ── 모니터링 기록 카드 (작업환경관리 스타일) ───────────────────
function RecordCard({ rec, spec, zone, expanded, onToggle, onEdit, onDelete, onPrint, RESULT_STYLES, canEdit }) {
  const rs = RESULT_STYLES[rec.result] || RESULT_STYLES.pass
  const isFail = rec.result === 'fail'
  const params = [
    { label: '미립자', value: rec.particleResult, icon: Wind, color: '#8B5CF6', always: false },
    { label: '미생물', value: rec.microbialResult, icon: FlaskConical, color: '#7C3AED', always: false },
    { label: '이물', value: rec.foreignMatterResult, icon: AlertTriangle, color: '#DC2626', always: true },
    { label: '온도', value: rec.temperature ? rec.temperature + '℃' : '', icon: Thermometer, color: '#EF4444', always: false },
    { label: '습도', value: rec.humidity ? rec.humidity + '%' : '', icon: Droplets, color: '#3B82F6', always: false },
    { label: '차압', value: rec.pressureDiff ? rec.pressureDiff + 'Pa' : '', icon: Activity, color: '#059669', always: false },
  ].filter(function(p) { return p.value || p.always })
    .map(function(p) { return p.value ? p : Object.assign({}, p, { value: '미입력', faded: true }) })

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid ' + (isFail ? '#FECACA' : 'var(--line)') }}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={onToggle} style={{ borderBottom: expanded ? '1px solid var(--line)' : 'none' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: rs.bg }}>
          {isFail ? <AlertTriangle size={16} style={{ color: rs.color }} /> : <CheckCircle2 size={16} style={{ color: rs.color }} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px]" style={{ color: 'var(--ink-faint)' }}>{rec.id}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: '#EDE9FE', color: '#7C3AED' }}>{spec.productName || '—'}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: rs.bg, color: rs.color }}>{rs.label}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {params.length === 0
              ? <span className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>측정값 없음</span>
              : params.map(function(p) {
                  var PIcon = p.icon
                  return (
                    <span key={p.label} className="text-[12px] flex items-center gap-1" style={{ color: p.faded ? 'var(--ink-faint)' : 'var(--ink)' }}>
                      <PIcon size={11} style={{ color: p.faded ? 'var(--ink-faint)' : p.color }} />{p.faded ? p.label + ' 미입력' : p.value}
                    </span>
                  )
                })}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
            {rec.date}{rec.lotNo ? ' · LOT ' + rec.lotNo : ''}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {canEdit && (
            <>
              <button onClick={function(e) { e.stopPropagation(); onEdit() }} className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)', border: 'none', cursor: 'pointer' }}><Edit2 size={13} /></button>
              <button onClick={function(e) { e.stopPropagation(); onDelete() }} className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', cursor: 'pointer' }}><Trash2 size={13} /></button>
            </>
          )}
          {expanded ? <ChevronUp size={16} style={{ color: 'var(--ink-faint)' }} /> : <ChevronDown size={16} style={{ color: 'var(--ink-faint)' }} />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 py-4" onClick={function(e) { e.stopPropagation() }}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 mb-3">
            {[
              ['제품 코드', spec.productCode],
              ['청결도 등급', spec.cleanClass],
              ['측정 구역', zone ? zone.name : null],
              ['미립자 측정값', rec.particleResult],
              ['미생물 측정값', rec.microbialResult],
              ['이물 검사 결과', rec.foreignMatterResult],
              ['온도', rec.temperature ? rec.temperature + ' ℃' : ''],
              ['습도', rec.humidity ? rec.humidity + ' %RH' : ''],
              ['차압', rec.pressureDiff ? rec.pressureDiff + ' Pa' : ''],
              ['비고', rec.notes],
            ].map(function(pair) { return (
              <div key={pair[0]} className="py-0.5">
                <div className="text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>{pair[0]}</div>
                <div className="text-[12.5px]" style={{ color: 'var(--ink)' }}>{pair[1] || '—'}</div>
              </div>
            )})}
          </div>
          <button onClick={onPrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold"
            style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
            <Printer size={12} /> 성적서 인쇄
          </button>
        </div>
      )}
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

// ── 모니터링 기록 성적서 모달 ─────────────────────────────────
function CertModal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={function(e) { if (e.target === e.currentTarget) onClose() }}>
      <div className="rounded-2xl p-6 w-full max-w-lg max-h-[92vh] overflow-y-auto"
        style={{ background: 'var(--bg-card)', boxShadow: '0 24px 64px rgba(0,0,0,0.18)', border: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[15px] font-bold" style={{ color: 'var(--ink)' }}>{title || '모니터링 성적서'}</h3>
          <button onClick={onClose} style={{ color: 'var(--ink-faint)', background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function CleanlinessCertificate({ rec, specs, onClose }) {
  const spec = specs.find(function(s) { return s.id === rec.specId }) || {}
  const rs = { pass: '합격', fail: '불합격', conditional: '조건부' }[rec.result] || rec.result
  const Row = function({ label, value }) {
    return (
      <div className="grid grid-cols-3 gap-2 py-1.5" style={{ borderBottom: '1px solid var(--line)' }}>
        <span className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>{label}</span>
        <span className="col-span-2 text-[12.5px]" style={{ color: 'var(--ink)' }}>{value || '—'}</span>
      </div>
    )
  }
  return (
    <div className="space-y-1">
      <div className="text-center mb-3">
        <div className="text-[15px] font-bold" style={{ color: 'var(--ink)' }}>청결·오염 모니터링 성적서</div>
        <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>Cleanliness Monitoring Certificate · ISO 13485 §7.5.2</div>
      </div>
      <Row label="기록 ID" value={rec.id} />
      <Row label="일자" value={rec.date} />
      <Row label="제품/사양" value={spec.productName} />
      <Row label="로트 번호" value={rec.lotNo} />
      <Row label="결과" value={rs} />
      <Row label="미립자 측정값" value={rec.particleResult} />
      <Row label="미생물 측정값" value={rec.microbialResult} />
      <Row label="이물 검사 결과" value={rec.foreignMatterResult} />
      <Row label="온도" value={rec.temperature ? rec.temperature + ' ℃' : ''} />
      <Row label="습도" value={rec.humidity ? rec.humidity + ' %RH' : ''} />
      <Row label="차압" value={rec.pressureDiff ? rec.pressureDiff + ' Pa' : ''} />
      <Row label="비고" value={rec.notes} />
      <div className="flex gap-2 pt-4">
        <button onClick={function() { printCleanlinessCert(rec, spec) }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold"
          style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
          <Printer size={13} /> 인쇄
        </button>
        <button onClick={onClose} className="px-4 py-2 rounded-xl text-[13px]"
          style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>닫기</button>
      </div>
    </div>
  )
}

// ── 제품별 밸리데이션 조건 상세 ───────────────────────────────
function ValidationDetail({ spec, onClose }) {
  const aw = APPLIES_WHEN[spec.appliesWhen] || spec.appliesWhen
  const Row = function({ label, value }) {
    return (
      <div className="grid grid-cols-3 gap-2 py-1.5" style={{ borderBottom: '1px solid var(--line)' }}>
        <span className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>{label}</span>
        <span className="col-span-2 text-[12.5px]" style={{ color: 'var(--ink)' }}>{value || '—'}</span>
      </div>
    )
  }
  return (
    <div className="space-y-1">
      <div className="text-center mb-3">
        <div className="text-[15px] font-bold" style={{ color: 'var(--ink)' }}>{spec.productName}</div>
        <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>제품별 밸리데이션 조건 · ISO 13485 §7.5.2</div>
      </div>
      <Row label="제품 코드" value={spec.productCode} />
      <Row label="적용 조건" value={aw} />
      <Row label="청결도 등급" value={spec.cleanClass} />
      <Row label="세척 방법" value={spec.cleaningMethod} />
      <Row label="미립자 한도" value={spec.particleLimit} />
      <Row label="미생물 한도" value={spec.microbialLimit} />
      <Row label="화학 잔류 한도" value={spec.chemicalLimit} />
      <Row label="검사 방법" value={spec.inspectionMethod} />
      <Row label="합격 기준" value={spec.acceptanceCriteria} />
      <Row label="세척 SOP 참조" value={spec.cleaningProcedureRef} />
      <Row label="밸리데이션 참조" value={spec.validationRef} />
      <Row label="모니터링 빈도" value={spec.frequency} />
      <Row label="담당자" value={spec.responsible} />
      <div className="flex gap-2 pt-4">
        <button onClick={onClose} className="px-4 py-2 rounded-xl text-[13px]"
          style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>닫기</button>
      </div>
    </div>
  )
}
