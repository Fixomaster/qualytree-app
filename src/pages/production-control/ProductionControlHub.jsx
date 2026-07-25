// src/pages/production-control/ProductionControlHub.jsx
// ISO 13485 §7.5.1 — 생산 및 서비스 제공 관리 (생산 제어 계획)
import React, { useState, useMemo } from 'react'
import {
  Plus, Save, Edit2, Trash2, Layers, CheckCircle2,
  AlertTriangle, ClipboardList, ChevronUp, ChevronDown,
  Package, BarChart2, Cpu, ArrowRight, GripVertical,
  Factory,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'

// ── 상수 ─────────────────────────────────────────────────────
const LS_KEY = 'qualytree.production_control'

// 제어 계획 상태
const PCP_STATUSES = {
  draft:    { label: '초안',   color: '#9CA3AF', bg: '#F3F4F6' },
  review:   { label: '검토',   color: '#D97706', bg: '#FEF3C7' },
  approved: { label: '승인',   color: '#059669', bg: '#D1FAE5' },
  obsolete: { label: '폐기',   color: '#6B7280', bg: '#F3F4F6' },
}

// §7.5.1 공정 유형
const PROCESS_TYPES = [
  '수입 검사', '원자재 준비', '절단·가공', '성형·조립', '용접·접합',
  '코팅·표면처리', '멸균', '포장', '라벨링', '최종 검사', '출하 검사',
  '세척·세정', '소프트웨어 설치', '교정·점검', '기타',
]

// 관리 방법
const CONTROL_METHODS = [
  '육안 검사', '치수 측정', '기능 시험', '전기 시험', '성능 시험',
  '작업 지시서 준수', '공정 파라미터 모니터링', '통계적 공정 관리 (SPC)',
  '방법 유효성 확인', '설비 교정 확인', '온도/습도 모니터링', '기타',
]

// 기록 유형
const RECORD_TYPES = [
  '배치 기록 (EBR)', '검사 기록', '장비 로그', '교정 기록',
  '환경 모니터링 기록', '일탈 기록', '작업 지시서', '기타',
]

function genPcpId() { return `PCP-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }
function genStepId() { return `STEP-${String(Date.now()).slice(-6)}` }
function today()    { return new Date().toISOString().slice(0, 10) }

const EMPTY_STEP = {
  id: '', seq: 1, processType: '조립', stepName: '', wiNo: '',
  equipment: '', materials: '',
  controlParams: '',    // 관리 파라미터 (온도, 압력, 시간 등)
  controlMethod: '육안 검사',
  acceptanceCriteria: '',
  samplePlan: '',       // 샘플링 계획
  frequency: '매 로트',
  recordType: '배치 기록 (EBR)',
  responsible: '',
  linkedValidationId: '', linkedEquipmentId: '',
  specialProcess: false, // 특수 공정 여부 (§7.5.6)
  notes: '',
}

const EMPTY_PCP = {
  pcpNo: '', revision: 'Rev.0', status: 'draft',
  productName: '', productCode: '', deviceClass: 'Class II',
  preparedBy: '', reviewedBy: '', approvedBy: '',
  issueDate: today(), reviewDate: '',
  scope: '',            // 적용 범위
  releaseCriteria: '',  // 출하 기준 §7.5.1(f)
  environmentReqs: '',  // 환경 요구사항 §7.5.1(e)
  monitoringPlan: '',   // 모니터링 계획 §7.5.1(g)
  linkedDmrId: '', linkedDhfId: '', linkedValidationId: '',
  steps: [],            // 공정 단계 목록
  notes: '',
}

// ── 메인 ─────────────────────────────────────────────────────
export default function ProductionControlHub() {
  const user = auth.current()
  const canEdit = user?.level >= 2

  const [pcps, setPcps] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
  })
  const [tab, setTab] = useState('list')   // list | detail | analysis
  const [selectedId, setSelectedId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_PCP)
  const [editId, setEditId] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')

  function save(list) { setPcps(list); localStorage.setItem(LS_KEY, JSON.stringify(list)) }

  function submitPcp() {
    if (!form.productName.trim()) return alert('제품명을 입력하세요.')
    const isEdit = !!editId
    const obj = isEdit
      ? pcps.map(p => p.id === editId ? { ...p, ...form } : p)
      : [{ id: genPcpId(), createdAt: today(), ...form, pcpNo: form.pcpNo || genPcpId(), steps: form.steps || [] }, ...pcps]
    save(obj)
    setShowForm(false); setForm(EMPTY_PCP); setEditId(null)
  }

  function deletePcp(id) {
    if (!confirm('생산 제어 계획을 삭제하시겠습니까?')) return
    save(pcps.filter(p => p.id !== id))
    if (selectedId === id) { setSelectedId(null); setTab('list') }
  }

  const selectedPcp = pcps.find(p => p.id === selectedId)

  const filtered = useMemo(() => pcps.filter(p => filterStatus === 'all' || p.status === filterStatus), [pcps, filterStatus])

  const analysis = useMemo(() => {
    const byStatus = {}
    Object.keys(PCP_STATUSES).forEach(k => { byStatus[k] = pcps.filter(p => p.status === k).length })
    const totalSteps = pcps.reduce((acc, p) => acc + (p.steps?.length || 0), 0)
    const specialSteps = pcps.reduce((acc, p) => acc + (p.steps?.filter(s => s.specialProcess)?.length || 0), 0)
    const missingCriteria = pcps.filter(p => (p.steps || []).some(s => !s.acceptanceCriteria))
    return { byStatus, totalSteps, specialSteps, missingCriteria }
  }, [pcps])

  const F = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // 공정 단계 편집 (폼 내에서)
  function addStep() {
    const seq = (form.steps?.length || 0) + 1
    F('steps', [...(form.steps || []), { ...EMPTY_STEP, id: genStepId(), seq }])
  }
  function updateStep(id, field, value) {
    F('steps', form.steps.map(s => s.id === id ? { ...s, [field]: value } : s))
  }
  function removeStep(id) { F('steps', form.steps.filter(s => s.id !== id)) }
  function moveStep(id, dir) {
    const steps = [...(form.steps || [])]
    const idx = steps.findIndex(s => s.id === id)
    if (dir === 'up' && idx > 0) [steps[idx - 1], steps[idx]] = [steps[idx], steps[idx - 1]]
    if (dir === 'down' && idx < steps.length - 1) [steps[idx], steps[idx + 1]] = [steps[idx + 1], steps[idx]]
    F('steps', steps.map((s, i) => ({ ...s, seq: i + 1 })))
  }

  // 상세 뷰에서 단계 인라인 편집
  const [editingStepId, setEditingStepId] = useState(null)
  const [stepDraft, setStepDraft] = useState(null)

  function saveStepInline(pcpId) {
    save(pcps.map(p => {
      if (p.id !== pcpId) return p
      return { ...p, steps: p.steps.map(s => s.id === editingStepId ? { ...s, ...stepDraft } : s) }
    }))
    setEditingStepId(null); setStepDraft(null)
  }

  return (
    <AppLayout user={user} title="생산 제어 계획" subtitle="ISO 13485 §7.5.1 — 공정 단계별 관리 항목·합격 기준·출하 기준">
      <div className="px-6 lg:px-8 py-6 max-w-[1600px] mx-auto">

        {/* 탭 */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-soft)' }}>
          {[
            { key: 'list',     label: `PCP 목록 (${pcps.length})` },
            { key: 'detail',   label: selectedPcp ? `공정표: ${selectedPcp.productName}` : '공정 상세' },
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

        {/* ── 목록 탭 ── */}
        {tab === 'list' && (
          <div>
            <div className="flex flex-wrap gap-2 mb-4 items-center">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-[13px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                <option value="all">전체 상태</option>
                {Object.entries(PCP_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              {canEdit && (
                <button onClick={() => { setForm(EMPTY_PCP); setEditId(null); setShowForm(true) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold ml-auto"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} /> PCP 등록
                </button>
              )}
            </div>

            {showForm && (
              <PcpForm form={form} F={F} onSave={submitPcp}
                onCancel={() => { setShowForm(false); setForm(EMPTY_PCP); setEditId(null) }}
                isEdit={!!editId} addStep={addStep} updateStep={updateStep} removeStep={removeStep} moveStep={moveStep} />
            )}

            <div className="space-y-3">
              {filtered.length === 0 && (
                <div className="text-center py-16 text-[13px]" style={{ color: 'var(--ink-faint)' }}>등록된 생산 제어 계획이 없습니다.</div>
              )}
              {filtered.map(pcp => {
                const st = PCP_STATUSES[pcp.status] || PCP_STATUSES.draft
                const steps = pcp.steps || []
                const specialCount = steps.filter(s => s.specialProcess).length
                const missingCrit = steps.filter(s => !s.acceptanceCriteria).length
                return (
                  <div key={pcp.id} className="p-4 rounded-2xl cursor-pointer"
                    style={{ background: 'var(--bg-card)', border: `1.5px solid ${selectedId === pcp.id ? 'var(--moss)' : 'var(--line)'}` }}
                    onClick={() => { setSelectedId(pcp.id); setTab('detail') }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-[14px]" style={{ color: 'var(--ink)' }}>{pcp.productName}</span>
                          <span className="font-mono text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>{pcp.pcpNo}</span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                          <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{pcp.revision}</span>
                        </div>
                        <div className="flex gap-3 flex-wrap text-[12px]" style={{ color: 'var(--ink-soft)' }}>
                          <span>공정 단계: <strong>{steps.length}</strong>개</span>
                          {specialCount > 0 && <span style={{ color: '#7C3AED' }}>특수 공정: {specialCount}개</span>}
                          {missingCrit > 0 && <span style={{ color: '#DC2626' }}>⚠ 합격 기준 미등록: {missingCrit}개</span>}
                          {pcp.approvedBy && <span>승인자: {pcp.approvedBy}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        {canEdit && (
                          <>
                            <button onClick={() => { setForm({ ...EMPTY_PCP, ...pcp }); setEditId(pcp.id); setShowForm(true); setTab('list') }}
                              className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                              <Edit2 size={12} style={{ color: 'var(--ink-soft)' }} />
                            </button>
                            <button onClick={() => deletePcp(pcp.id)}
                              className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', border: '1px solid #FECACA', cursor: 'pointer' }}>
                              <Trash2 size={12} style={{ color: '#DC2626' }} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── 공정 상세 탭 ── */}
        {tab === 'detail' && !selectedPcp && (
          <div className="text-center py-16 text-[13px]" style={{ color: 'var(--ink-faint)' }}>목록에서 PCP를 선택하세요.</div>
        )}
        {tab === 'detail' && selectedPcp && (
          <PcpDetailView pcp={selectedPcp} canEdit={canEdit}
            editingStepId={editingStepId} stepDraft={stepDraft}
            setEditingStepId={setEditingStepId} setStepDraft={setStepDraft}
            onSaveStep={() => saveStepInline(selectedPcp.id)}
            onAddStep={() => {
              const seq = (selectedPcp.steps?.length || 0) + 1
              const newStep = { ...EMPTY_STEP, id: genStepId(), seq }
              save(pcps.map(p => p.id === selectedPcp.id ? { ...p, steps: [...(p.steps || []), newStep] } : p))
            }}
            onDeleteStep={(stepId) => {
              save(pcps.map(p => p.id === selectedPcp.id ? { ...p, steps: p.steps.filter(s => s.id !== stepId).map((s, i) => ({ ...s, seq: i + 1 })) } : p))
            }} />
        )}

        {/* ── 분석 탭 ── */}
        {tab === 'analysis' && <AnalysisView analysis={analysis} pcps={pcps} />}
      </div>
    </AppLayout>
  )
}

// ── PCP 상세 뷰 ───────────────────────────────────────────────
function PcpDetailView({ pcp, canEdit, editingStepId, stepDraft, setEditingStepId, setStepDraft, onSaveStep, onAddStep, onDeleteStep }) {
  const steps = pcp.steps || []
  const st = PCP_STATUSES[pcp.status] || PCP_STATUSES.draft

  return (
    <div className="space-y-5">
      {/* PCP 헤더 */}
      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div>
            <div className="font-bold text-[16px]" style={{ color: 'var(--ink)' }}>{pcp.productName}</div>
            <div className="text-[12.5px]" style={{ color: 'var(--ink-soft)' }}>
              {pcp.pcpNo} · {pcp.revision} ·
              <span className="ml-1 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px]">
          {[['작성자', pcp.preparedBy], ['검토자', pcp.reviewedBy], ['승인자', pcp.approvedBy], ['유효일', pcp.issueDate]].map(([l, v]) =>
            v && <div key={l}><span style={{ color: 'var(--ink-faint)' }}>{l}: </span><span style={{ color: 'var(--ink)' }}>{v}</span></div>
          )}
        </div>
        {pcp.releaseCriteria && (
          <div className="mt-3 p-3 rounded-xl text-[12.5px]" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
            <span className="font-bold" style={{ color: '#1E40AF' }}>§7.5.1(f) 출하 기준: </span>
            <span style={{ color: '#1E40AF' }}>{pcp.releaseCriteria}</span>
          </div>
        )}
      </div>

      {/* 공정 단계 테이블 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[13px] font-bold" style={{ color: 'var(--ink)' }}>공정 단계 ({steps.length}개)</div>
          {canEdit && (
            <button onClick={onAddStep} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12px] font-semibold"
              style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--moss)', cursor: 'pointer' }}>
              <Plus size={12} /> 단계 추가
            </button>
          )}
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: 'var(--bg-soft)' }}>
                {['#', '공정 단계', '관리 파라미터', '관리 방법', '합격 기준', '빈도', '기록', '담당', ''].map(h => (
                  <th key={h} className="px-2 py-2 text-left font-semibold" style={{ color: 'var(--ink-soft)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {steps.length === 0 && (
                <tr><td colSpan={9} className="text-center py-10" style={{ color: 'var(--ink-faint)' }}>공정 단계를 추가하세요.</td></tr>
              )}
              {steps.map((step, idx) => {
                const isEditing = editingStepId === step.id
                const d = isEditing ? stepDraft : step
                const missingCrit = !step.acceptanceCriteria
                return (
                  <tr key={step.id} style={{ background: idx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-soft)', borderTop: '1px solid var(--line)' }}>
                    <td className="px-2 py-2 text-center font-bold" style={{ color: 'var(--ink-soft)' }}>
                      <div className="flex items-center gap-0.5">
                        {step.specialProcess && <span title="특수 공정" style={{ color: '#7C3AED', fontSize: 11 }}>★</span>}
                        {step.seq}
                      </div>
                    </td>
                    {isEditing ? (
                      <>
                        <td className="px-2 py-1.5">
                          <input value={d.stepName} onChange={e => setStepDraft(s => ({ ...s, stepName: e.target.value }))}
                            className="w-full px-2 py-1 rounded text-[12px]"
                            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={d.controlParams} onChange={e => setStepDraft(s => ({ ...s, controlParams: e.target.value }))}
                            placeholder="온도, 압력, 시간..."
                            className="w-full px-2 py-1 rounded text-[12px]"
                            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
                        </td>
                        <td className="px-2 py-1.5">
                          <select value={d.controlMethod} onChange={e => setStepDraft(s => ({ ...s, controlMethod: e.target.value }))}
                            className="w-full px-2 py-1 rounded text-[12px]"
                            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                            {CONTROL_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={d.acceptanceCriteria} onChange={e => setStepDraft(s => ({ ...s, acceptanceCriteria: e.target.value }))}
                            placeholder="합격 기준..."
                            className="w-full px-2 py-1 rounded text-[12px]"
                            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={d.frequency} onChange={e => setStepDraft(s => ({ ...s, frequency: e.target.value }))}
                            className="w-24 px-2 py-1 rounded text-[12px]"
                            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
                        </td>
                        <td className="px-2 py-1.5">
                          <select value={d.recordType} onChange={e => setStepDraft(s => ({ ...s, recordType: e.target.value }))}
                            className="w-full px-2 py-1 rounded text-[12px]"
                            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                            {RECORD_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={d.responsible} onChange={e => setStepDraft(s => ({ ...s, responsible: e.target.value }))}
                            className="w-20 px-2 py-1 rounded text-[12px]"
                            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="flex gap-1">
                            <button onClick={onSaveStep} className="px-2 py-0.5 rounded text-[11px] font-bold"
                              style={{ background: '#D1FAE5', color: '#059669', border: 'none', cursor: 'pointer' }}>저장</button>
                            <button onClick={() => { setEditingStepId(null); setStepDraft(null) }}
                              className="px-2 py-0.5 rounded text-[11px]"
                              style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink-soft)', cursor: 'pointer' }}>취소</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-2 py-2">
                          <div className="font-semibold" style={{ color: 'var(--ink)' }}>{step.stepName || '-'}</div>
                          {step.wiNo && <div className="text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>WI: {step.wiNo}</div>}
                          {step.processType && <div className="text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>{step.processType}</div>}
                        </td>
                        <td className="px-2 py-2" style={{ color: 'var(--ink-soft)' }}>{step.controlParams || '-'}</td>
                        <td className="px-2 py-2" style={{ color: 'var(--ink-soft)' }}>{step.controlMethod}</td>
                        <td className="px-2 py-2">
                          {missingCrit
                            ? <span className="text-[11px] text-red-500">⚠ 미등록</span>
                            : <span style={{ color: 'var(--ink)' }}>{step.acceptanceCriteria}</span>}
                        </td>
                        <td className="px-2 py-2" style={{ color: 'var(--ink-soft)' }}>{step.frequency || '-'}</td>
                        <td className="px-2 py-2 text-[11px]" style={{ color: 'var(--ink-soft)' }}>{step.recordType}</td>
                        <td className="px-2 py-2" style={{ color: 'var(--ink-soft)' }}>{step.responsible || '-'}</td>
                        <td className="px-2 py-2">
                          {canEdit && (
                            <div className="flex gap-1">
                              <button onClick={() => { setEditingStepId(step.id); setStepDraft({ ...step }) }}
                                className="p-1 rounded" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                                <Edit2 size={10} style={{ color: 'var(--ink-soft)' }} />
                              </button>
                              <button onClick={() => onDeleteStep(step.id)}
                                className="p-1 rounded" style={{ background: '#FEE2E2', border: 'none', cursor: 'pointer' }}>
                                <Trash2 size={10} style={{ color: '#DC2626' }} />
                              </button>
                            </div>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {steps.some(s => s.specialProcess) && (
          <div className="mt-2 text-[11.5px]" style={{ color: '#7C3AED' }}>
            ★ 특수 공정 (§7.5.6) — 결과를 검사로 완전히 확인할 수 없어 유효성 확인이 필요한 공정
          </div>
        )}
      </div>

      {/* 추가 정보 */}
      {(pcp.environmentReqs || pcp.monitoringPlan) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pcp.environmentReqs && (
            <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="text-[12.5px] font-bold mb-1" style={{ color: 'var(--ink)' }}>§7.5.1(e) 환경 요구사항</div>
              <p className="text-[12.5px] whitespace-pre-line" style={{ color: 'var(--ink-soft)' }}>{pcp.environmentReqs}</p>
            </div>
          )}
          {pcp.monitoringPlan && (
            <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="text-[12.5px] font-bold mb-1" style={{ color: 'var(--ink)' }}>§7.5.1(g) 모니터링 계획</div>
              <p className="text-[12.5px] whitespace-pre-line" style={{ color: 'var(--ink-soft)' }}>{pcp.monitoringPlan}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── PCP 등록 폼 ───────────────────────────────────────────────
function PcpForm({ form, F, onSave, onCancel, isEdit, addStep, updateStep, removeStep, moveStep }) {
  return (
    <div className="mb-5 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>{isEdit ? 'PCP 수정' : '생산 제어 계획 등록 (§7.5.1)'}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <Field label="제품명 *" value={form.productName} onChange={v => F('productName', v)} />
        <Field label="제품 코드" value={form.productCode} onChange={v => F('productCode', v)} />
        <Field label="PCP 번호" value={form.pcpNo} onChange={v => F('pcpNo', v)} placeholder="자동 생성" />
        <Field label="개정 번호" value={form.revision} onChange={v => F('revision', v)} placeholder="Rev.0" />
        <FieldSelect label="상태" value={form.status} onChange={v => F('status', v)}
          options={Object.entries(PCP_STATUSES).map(([k, v]) => ({ value: k, label: v.label }))} />
        <Field label="유효일" type="date" value={form.issueDate} onChange={v => F('issueDate', v)} />
        <Field label="작성자" value={form.preparedBy} onChange={v => F('preparedBy', v)} />
        <Field label="검토자" value={form.reviewedBy} onChange={v => F('reviewedBy', v)} />
        <Field label="승인자" value={form.approvedBy} onChange={v => F('approvedBy', v)} />
        <Field label="연결 DMR ID" value={form.linkedDmrId} onChange={v => F('linkedDmrId', v)} placeholder="DMR-xxxx" />
        <Field label="연결 DHF ID" value={form.linkedDhfId} onChange={v => F('linkedDhfId', v)} placeholder="DHF-xxxx" />
        <Field label="연결 밸리데이션 ID" value={form.linkedValidationId} onChange={v => F('linkedValidationId', v)} placeholder="VAL-xxxx" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <FieldArea label="§7.5.1(f) 출하 기준" value={form.releaseCriteria} onChange={v => F('releaseCriteria', v)} rows={2}
          placeholder="모든 공정 단계 합격, 최종 검사 합격, 배치 기록 완결..." />
        <FieldArea label="§7.5.1(e) 환경 요구사항" value={form.environmentReqs} onChange={v => F('environmentReqs', v)} rows={2}
          placeholder="클린룸 Class 10000, 온도 20±5°C, 습도 40~60%..." />
        <FieldArea label="§7.5.1(g) 모니터링 계획" value={form.monitoringPlan} onChange={v => F('monitoringPlan', v)} rows={2} />
        <FieldArea label="비고" value={form.notes} onChange={v => F('notes', v)} rows={2} />
      </div>

      {/* 공정 단계 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[13px] font-bold" style={{ color: 'var(--ink)' }}>공정 단계</div>
          <button onClick={addStep} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12px] font-semibold"
            style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--moss)', cursor: 'pointer' }}>
            <Plus size={12} /> 단계 추가
          </button>
        </div>
        {(form.steps || []).length === 0 ? (
          <div className="text-center py-6 text-[13px]" style={{ color: 'var(--ink-faint)' }}>공정 단계를 추가하세요.</div>
        ) : (form.steps || []).map((step, idx) => (
          <div key={step.id} className="mb-2 p-3 rounded-xl" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-bold text-[12px] w-5 text-center" style={{ color: 'var(--moss)' }}>{step.seq}</span>
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                <input value={step.stepName} onChange={e => updateStep(step.id, 'stepName', e.target.value)}
                  placeholder="단계 이름 *"
                  className="px-2 py-1 rounded-lg text-[12.5px]"
                  style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
                <select value={step.processType} onChange={e => updateStep(step.id, 'processType', e.target.value)}
                  className="px-2 py-1 rounded-lg text-[12.5px]"
                  style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                  {PROCESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input value={step.acceptanceCriteria} onChange={e => updateStep(step.id, 'acceptanceCriteria', e.target.value)}
                  placeholder="합격 기준 *"
                  className="px-2 py-1 rounded-lg text-[12.5px]"
                  style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
                <input value={step.responsible} onChange={e => updateStep(step.id, 'responsible', e.target.value)}
                  placeholder="담당자"
                  className="px-2 py-1 rounded-lg text-[12.5px]"
                  style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => moveStep(step.id, 'up')} disabled={idx === 0} className="p-1 rounded"
                  style={{ background: 'var(--bg)', border: '1px solid var(--line)', cursor: 'pointer', opacity: idx === 0 ? 0.3 : 1 }}>
                  <ChevronUp size={11} style={{ color: 'var(--ink-soft)' }} />
                </button>
                <button onClick={() => moveStep(step.id, 'down')} disabled={idx === (form.steps.length - 1)} className="p-1 rounded"
                  style={{ background: 'var(--bg)', border: '1px solid var(--line)', cursor: 'pointer', opacity: idx === (form.steps.length - 1) ? 0.3 : 1 }}>
                  <ChevronDown size={11} style={{ color: 'var(--ink-soft)' }} />
                </button>
                <button onClick={() => removeStep(step.id)} className="p-1 rounded"
                  style={{ background: '#FEE2E2', border: 'none', cursor: 'pointer' }}>
                  <Trash2 size={11} style={{ color: '#DC2626' }} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 ml-7">
              <input value={step.controlParams} onChange={e => updateStep(step.id, 'controlParams', e.target.value)}
                placeholder="관리 파라미터"
                className="px-2 py-1 rounded-lg text-[12px]"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
              <select value={step.controlMethod} onChange={e => updateStep(step.id, 'controlMethod', e.target.value)}
                className="px-2 py-1 rounded-lg text-[12px]"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                {CONTROL_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <input value={step.frequency} onChange={e => updateStep(step.id, 'frequency', e.target.value)}
                placeholder="빈도 (매 로트)"
                className="px-2 py-1 rounded-lg text-[12px]"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
              <label className="flex items-center gap-1.5 text-[12px] cursor-pointer" style={{ color: '#7C3AED' }}>
                <input type="checkbox" checked={!!step.specialProcess} onChange={e => updateStep(step.id, 'specialProcess', e.target.checked)}
                  className="accent-violet-600 w-3.5 h-3.5" />
                특수 공정
              </label>
            </div>
          </div>
        ))}
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

// ── 분석 뷰 ──────────────────────────────────────────────────
function AnalysisView({ analysis, pcps }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: '총 PCP', value: pcps.length, color: '#2563EB', bg: '#DBEAFE' },
          { label: '총 공정 단계', value: analysis.totalSteps, color: '#7C3AED', bg: '#EDE9FE' },
          { label: '특수 공정', value: analysis.specialSteps, color: '#D97706', bg: '#FEF3C7' },
          { label: '기준 미등록 PCP', value: analysis.missingCriteria.length, color: analysis.missingCriteria.length > 0 ? '#DC2626' : '#059669', bg: analysis.missingCriteria.length > 0 ? '#FEE2E2' : '#D1FAE5' },
        ].map(c => (
          <div key={c.label} className="p-4 rounded-2xl text-center" style={{ background: c.bg, border: `1px solid ${c.color}30` }}>
            <div className="text-[26px] font-bold" style={{ color: c.color }}>{c.value}</div>
            <div className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>PCP 상태별 분포</div>
        {Object.entries(PCP_STATUSES).map(([k, v]) => (
          <div key={k} className="flex items-center gap-3 mb-2">
            <span className="text-[12px] w-20" style={{ color: 'var(--ink-soft)' }}>{v.label}</span>
            <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--bg-soft)' }}>
              <div className="h-2 rounded-full" style={{ width: pcps.length ? `${((analysis.byStatus[k] || 0) / pcps.length) * 100}%` : '0%', background: v.color }} />
            </div>
            <span className="text-[12px] font-bold w-5 text-right" style={{ color: 'var(--ink)' }}>{analysis.byStatus[k] || 0}</span>
          </div>
        ))}
      </div>

      {analysis.missingCriteria.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: '#FEF3C7', border: '1px solid #FCD34D' }}>
          <div className="text-[13px] font-bold mb-2" style={{ color: '#92400E' }}>⚠ 합격 기준 미등록 PCP</div>
          {analysis.missingCriteria.map(p => (
            <div key={p.id} className="text-[12.5px] mb-1" style={{ color: '#92400E' }}>
              {p.productName} — {p.steps?.filter(s => !s.acceptanceCriteria).map(s => s.stepName || `단계${s.seq}`).join(', ')}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 공통 ─────────────────────────────────────────────────────
function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-1.5 rounded-xl text-[13px]"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
    </div>
  )
}
function FieldSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <select value={value || ''} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-1.5 rounded-xl text-[13px]"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
function FieldArea({ label, value, onChange, rows = 3, placeholder }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
        className="w-full px-3 py-1.5 rounded-xl text-[13px] resize-none"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
    </div>
  )
}
