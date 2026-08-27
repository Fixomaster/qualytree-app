// src/pages/sterile-control/SterileControlHub.jsx
// ISO 13485 §7.5.7 — 멸균 의료기기 특별 요구사항
import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../../lib/auth'
import { onboarding } from '../../lib/onboardingState'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import {
  Beaker, CheckCircle, AlertTriangle, PlusCircle,
  ChevronDown, ChevronUp, Trash2, Save, XCircle,
  BarChart2, FileText, ClipboardList, ShieldCheck, ExternalLink,
  Edit2, Printer,
} from 'lucide-react'
import {
  STERILE_METHODS, SAL_LEVELS, BIOBURDEN_METHODS, SPEC_STATUSES, deriveSterileSpecs,
} from '../../lib/sterileSpecConstants'
import { printSterileBatchCert, printSterilizationProcedure } from '../../lib/pdfPrint'

// ─── 상수 ──────────────────────────────────────────────
// 멸균 방법 사양(STERILE_METHODS 등)은 제품·공정 화면에서 입력되어
// 제품 레코드 자체가 SSoT가 되므로, 여기서는 별도 저장소 없이
// sterileSpecConstants.js를 통해 파생(derive)한다.
const BATCHES_KEY = 'qualytree.sterile_batches'
const POLICY_KEY  = 'qualytree.sterile_policy'

const BATCH_RESULTS = [
  { value: 'pass',        label: '합격',       color: '#10B981' },
  { value: 'fail',        label: '불합격',     color: '#EF4444' },
  { value: 'conditional', label: '조건부 합격', color: '#F59E0B' },
]

const EMPTY_BATCH = {
  specId: '', batchNo: '', date: new Date().toISOString().slice(0, 10),
  productName: '', lotNo: '', sterileMethod: STERILE_METHODS[0],
  actualTemp: '', actualTime: '', actualPressure: '', actualDose: '',
  bioburdenResult: '', salAchieved: '',
  result: 'pass', notes: '',
}

// 멸균 방법에 따라 실측 사이클 파라미터 중 실제로 의미 있는 항목만 입력받는다. (#190)
const CYCLE_PARAMS_BY_METHOD = {
  'EO (에틸렌옥사이드)':            ['temp', 'time', 'pressure'],
  '감마선 (Gamma Radiation)':      ['dose'],
  'E-beam (전자빔)':                ['dose'],
  '고압증기멸균 (Autoclave)':       ['temp', 'time', 'pressure'],
  '건열 멸균 (Dry Heat)':           ['temp', 'time'],
  '과산화수소 플라즈마 (H₂O₂ Plasma)': ['temp', 'time'],
  'X선 방사선':                     ['dose'],
}
function cycleParamsFor(method) { return CYCLE_PARAMS_BY_METHOD[method] || ['temp', 'time', 'pressure', 'dose'] }

// 배치/로트 번호로 생산중인 WO를 조회해 어떤 제품인지 자동 연결한다. (#188)
function findWoByLot(lot) {
  if (!lot || !lot.trim()) return null
  try {
    const wos = JSON.parse(localStorage.getItem('qms_mfg_wo') || '[]')
    return (Array.isArray(wos) ? wos : []).find(w => w.lot && w.lot.trim().toLowerCase() === lot.trim().toLowerCase()) || null
  } catch { return null }
}

const DEFAULT_POLICY = {
  revision: 'A', issueDate: '', approvedBy: '',
  scope: '',
  reprocessingPolicy: '',
  singleUseStatement: '',
  labelingReqs: '',
  expiryTrackingMethod: '',
  postMarketMonitoring: '',
  revisionHistory: [],
}

// ─── 헬퍼 ──────────────────────────────────────────────
function genBatchId() { return `SB-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }

function lsGet(key, def) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def } catch { return def }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

function StatusBadge({ value, options }) {
  const opt = options.find(o => o.value === value) || options[0]
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, borderRadius: 4, padding: '2px 7px',
      background: opt.color + '22', color: opt.color,
    }}>{opt.label}</span>
  )
}

function Field({ label, required, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)' }}>
        {label}{required && <span style={{ color: '#EF4444' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

const inp = {
  background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 6,
  padding: '6px 10px', color: 'var(--ink)', fontSize: 13, width: '100%', boxSizing: 'border-box',
}
const textarea = { ...inp, resize: 'vertical', minHeight: 72, fontFamily: 'inherit' }
const sel      = { ...inp, cursor: 'pointer' }

// ─── 완전성 체커 ─────────────────────────────────────
function useCompleteness(specs, batches, policy) {
  const checks = [
    { label: '멸균 방법 사양 최소 1건', done: specs.length > 0 },
    { label: '모든 사양에 SAL 목표 설정', done: specs.length > 0 && specs.every(s => s.salTarget) },
    { label: '모든 사양에 밸리데이션 참조 입력', done: specs.length > 0 && specs.every(s => s.validationRef) },
    { label: '모든 사양에 포장 참조 입력', done: specs.length > 0 && specs.every(s => s.packagingRef) },
    { label: '멸균 배치 기록 최소 1건', done: batches.length > 0 },
    { label: '재처리 정책 문서 작성', done: !!(policy.reprocessingPolicy && policy.singleUseStatement) },
    { label: '라벨링 요구사항 문서화', done: !!policy.labelingReqs },
    { label: '유효기간 추적 방법 정의', done: !!policy.expiryTrackingMethod },
  ]
  const done  = checks.filter(c => c.done).length
  const total = checks.length
  const pct   = Math.round((done / total) * 100)
  return { checks, done, total, pct }
}

// ─── 탭 버튼 ─────────────────────────────────────────
function TabBar({ tabs, active, onSelect }) {
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--line)', marginBottom: 20 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onSelect(t.id)} style={{
          padding: '8px 16px', fontSize: 13, fontWeight: active === t.id ? 700 : 400,
          color: active === t.id ? 'var(--moss)' : 'var(--ink-soft)',
          borderBottom: active === t.id ? '2px solid var(--moss)' : '2px solid transparent',
          background: 'none', border: 'none', borderRadius: '6px 6px 0 0',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {t.icon && <t.icon size={14} />}{t.label}
        </button>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════
//  TAB 1 — 멸균 방법 사양 (읽기 전용 · 제품·공정 화면에서 입력)
// ══════════════════════════════════════════════════════
function SpecTab({ specs, canEdit, onNavigateToProduct, onNavigateToProducts }) {
  const [selected, setSelected] = useState(null)

  return (
    <div>
      {/* 상단 안내 */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 14, gap: 12, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
          총 {specs.length}건의 제품 멸균 사양 · 제품·공정 &gt; 제품 개발 화면에서 입력한 내용이 여기 자동 반영됩니다
        </span>
        {canEdit && (
          <button onClick={onNavigateToProducts} style={{
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
            background: 'var(--moss)', color: '#fff', border: 'none', borderRadius: 6,
            padding: '7px 14px', cursor: 'pointer',
          }}>
            <ExternalLink size={14} /> 제품 개발에서 사양 입력
          </button>
        )}
      </div>

      {/* 목록 테이블 */}
      {specs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--ink-faint)', fontSize: 14 }}>
          등록된 멸균 방법 사양이 없습니다.
          <div style={{ fontSize: 12.5, marginTop: 6 }}>
            제품·공정 &gt; 제품 개발 화면에서 제품을 "멸균 의료기기"로 설정하고 사양을 입력하세요.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {specs.map(s => (
            <div key={s.id} style={{
              background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10,
              overflow: 'hidden',
            }}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' }}
                onClick={() => setSelected(selected === s.id ? null : s.id)}
              >
                <Beaker size={16} style={{ color: 'var(--moss)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{s.productName}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                    {s.productCode && <span style={{ marginRight: 10 }}>코드: {s.productCode}</span>}
                    <span style={{ marginRight: 10 }}>방법: {s.sterileMethod}</span>
                    <span>SAL: {s.salTarget}</span>
                  </div>
                </div>
                <StatusBadge value={s.status} options={SPEC_STATUSES} />
                {canEdit && s.productId && (
                  <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => onNavigateToProduct(s.productId)} style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      fontSize: 12, padding: '4px 10px', borderRadius: 5,
                      border: '1px solid var(--line)', background: 'none', cursor: 'pointer', color: 'var(--ink-soft)',
                    }}>
                      <ExternalLink size={12} /> 제품 개발에서 관리
                    </button>
                  </div>
                )}
                {selected === s.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>

              {/* 상세 펼치기 */}
              {selected === s.id && (
                <div style={{ borderTop: '1px solid var(--line)', padding: '14px 16px', background: 'var(--bg-soft)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, fontSize: 13 }}>
                    <InfoRow label="바이오버든 한도"     value={s.bioburdenLimit || '\u2014'} />
                    <InfoRow label="바이오버든 시험법"   value={s.bioburdenMethod} />
                    <InfoRow label="멸균 유효기간"       value={s.expiryMonths ? `${s.expiryMonths}개월` : '\u2014'} />
                    <InfoRow label="사이클 온도"         value={s.cycleTemp ? `${s.cycleTemp}℃` : '\u2014'} />
                    <InfoRow label="사이클 시간"         value={s.cycleTime ? `${s.cycleTime}분` : '\u2014'} />
                    <InfoRow label="사이클 압력"         value={s.cyclePressure ? `${s.cyclePressure} bar` : '\u2014'} />
                    <InfoRow label="선량"                value={s.cycleDose || '\u2014'} />
                    <InfoRow label="밸리데이션 참조"     value={s.validationRef || '\u2014'} />
                    <InfoRow label="포장 밸리데이션"     value={s.packagingRef || '\u2014'} />
                    <InfoRow label="멸균성 시험 필요"    value={s.sterilityTestRequired ? '예' : '아니오'} />
                    <InfoRow label="재처리 허용"         value={s.reprocessingAllowed ? '예 (주의)' : '단회용 (재처리 금지)'} />
                    {s.notes && <div style={{ gridColumn: '1/-1' }}><InfoRow label="비고" value={s.notes} /></div>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-faint)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--ink)' }}>{value}</div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
//  TAB 2 — 멸균 배치 기록
// ══════════════════════════════════════════════════════
function BatchTab({ batches, setBatches, specs, canEdit }) {
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [draft,    setDraft]    = useState(EMPTY_BATCH)
  const [certRow,  setCertRow]  = useState(null)

  const openNew = () => {
    const base = specs.length > 0
      ? { ...EMPTY_BATCH, specId: specs[0].id, productName: specs[0].productName, sterileMethod: specs[0].sterileMethod }
      : { ...EMPTY_BATCH }
    setDraft(base)
    setEditing(null)
    setShowForm(true)
  }
  const openEdit = b => { setDraft({ ...b }); setEditing(b.id); setShowForm(true) }
  const save = () => {
    if (!draft.batchNo) return
    if (editing) {
      setBatches(batches.map(b => b.id === editing ? { ...draft, id: editing } : b))
    } else {
      setBatches([...batches, { ...draft, id: genBatchId() }])
    }
    setShowForm(false)
  }
  const del = id => {
    if (!window.confirm('삭제하시겠습니까?')) return
    setBatches(batches.filter(b => b.id !== id))
  }
  const upd = k => e => setDraft(d => ({ ...d, [k]: e.target.value }))
  const onSpecChange = e => {
    const s = specs.find(x => x.id === e.target.value)
    if (s) setDraft(d => ({ ...d, specId: s.id, productName: s.productName, sterileMethod: s.sterileMethod }))
    else setDraft(d => ({ ...d, specId: '', productName: '' }))
  }
  // 배치/로트 번호 입력 시 생산중인 WO를 조회해 제품을 자동 특정한다. (#188)
  const onBatchNoBlur = () => {
    const wo = findWoByLot(draft.batchNo)
    if (!wo) return
    const s = specs.find(x => x.productName === wo.product)
    setDraft(d => ({
      ...d,
      productName: wo.product || d.productName,
      lotNo: wo.lot || d.lotNo,
      ...(s ? { specId: s.id, sterileMethod: s.sterileMethod } : {}),
    }))
  }

  const selectedSpec = specs.find(s => s.id === draft.specId)
  const cycleParams = cycleParamsFor(draft.sterileMethod)
  const validationSubstituted = !!(selectedSpec && selectedSpec.validationRef)

  const resultColor = v => BATCH_RESULTS.find(r => r.value === v)?.color || '#6B7280'

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>총 {batches.length}건의 멸균 배치 기록 · 행 클릭 시 성적서 확인</span>
        {canEdit && (
          <button onClick={openNew} style={{
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
            background: 'var(--moss)', color: '#fff', border: 'none', borderRadius: 6,
            padding: '7px 14px', cursor: 'pointer',
          }}>
            <PlusCircle size={15} /> 배치 기록 추가
          </button>
        )}
      </div>

      {showForm && (
        <div style={{
          background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 10, padding: 20, marginBottom: 20,
        }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>
            {editing ? '배치 기록 수정' : '새 멸균 배치 기록'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
            <Field label="배치/로트 번호" required>
              <input style={inp} value={draft.batchNo} onChange={upd('batchNo')} onBlur={onBatchNoBlur} placeholder="예: LOT-2024-001 (입력 시 생산중 WO에서 제품 자동조회)" />
            </Field>
            <Field label="멸균 일자">
              <input type="date" style={inp} value={draft.date} onChange={upd('date')} />
            </Field>
            <Field label="멸균 사양 연결 (제품 특정)">
              <select style={sel} value={draft.specId} onChange={onSpecChange}>
                <option value="">— 선택 —</option>
                {specs.map(s => <option key={s.id} value={s.id}>{s.productName}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <Field label="제품 (자동 특정됨)">
              <div style={{ ...inp, display: 'flex', alignItems: 'center', background: 'var(--bg-soft)', color: draft.productName ? 'var(--ink)' : 'var(--ink-faint)' }}>
                {draft.productName || '배치번호 입력 또는 멸균 사양 선택 시 자동 표시'}
              </div>
            </Field>
            <Field label="멸균 방법 (사양 연결 기준)">
              <div style={{ ...inp, display: 'flex', alignItems: 'center', background: 'var(--bg-soft)', color: 'var(--ink)' }}>
                {draft.sterileMethod}
              </div>
            </Field>
          </div>

          <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8, padding: 14, marginBottom: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: 'var(--ink-soft)' }}>실측 사이클 파라미터 (멸균 방법에 따라 입력 항목이 달라집니다)</div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cycleParams.length}, 1fr)`, gap: 10 }}>
              {cycleParams.includes('temp') && (
                <Field label="온도 (℃)">
                  <input style={inp} value={draft.actualTemp} onChange={upd('actualTemp')} />
                </Field>
              )}
              {cycleParams.includes('time') && (
                <Field label="시간 (분)">
                  <input style={inp} value={draft.actualTime} onChange={upd('actualTime')} />
                </Field>
              )}
              {cycleParams.includes('pressure') && (
                <Field label="압력 (bar)">
                  <input style={inp} value={draft.actualPressure} onChange={upd('actualPressure')} />
                </Field>
              )}
              {cycleParams.includes('dose') && (
                <Field label="선량 (kGy)">
                  <input style={inp} value={draft.actualDose} onChange={upd('actualDose')} />
                </Field>
              )}
            </div>
          </div>

          {!validationSubstituted && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <Field label="바이오버든 결과 (CFU/개)">
                <input style={inp} value={draft.bioburdenResult} onChange={upd('bioburdenResult')} placeholder="예: 12" />
              </Field>
              <Field label="달성 SAL">
                <input style={inp} value={draft.salAchieved} onChange={upd('salAchieved')} placeholder="예: 10⁻⁶" />
              </Field>
            </div>
          )}
          {validationSubstituted && (
            <div style={{ fontSize: 11.5, padding: '8px 12px', borderRadius: 8, background: 'var(--bg-soft)', color: 'var(--ink-faint)', marginBottom: 14 }}>
              ℹ 이 제품은 밸리데이션 참조({selectedSpec.validationRef})가 등록되어 있어 바이오버든·SAL 결과는 밸리데이션 결과로 대체됩니다.
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14, marginBottom: 14 }}>
            <Field label="합/불 판정" required>
              <select style={sel} value={draft.result} onChange={upd('result')}>
                {BATCH_RESULTS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </Field>
          </div>

          <Field label="비고">
            <textarea style={textarea} value={draft.notes} onChange={upd('notes')} />
          </Field>

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={save} style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
              background: 'var(--moss)', color: '#fff', border: 'none', borderRadius: 6,
              padding: '7px 16px', cursor: 'pointer',
            }}>
              <Save size={14} /> 저장
            </button>
            <button onClick={() => setShowForm(false)} style={{
              fontSize: 13, background: 'none', border: '1px solid var(--line)',
              borderRadius: 6, padding: '7px 14px', cursor: 'pointer', color: 'var(--ink-soft)',
            }}>취소</button>
          </div>
        </div>
      )}

      {batches.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--ink-faint)', fontSize: 14 }}>
          등록된 멸균 배치 기록이 없습니다.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--line)', background: 'var(--bg-soft)' }}>
                {['배치번호', '일자', '제품명', '멸균방법', '바이오버든', 'SAL', '판정', ''].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, fontSize: 12, color: 'var(--ink-soft)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {batches.map((b, i) => (
                <tr key={b.id} onClick={() => setCertRow(b)} style={{ borderBottom: '1px solid var(--line)', background: i % 2 ? 'var(--bg-soft)' : 'var(--bg-card)', cursor: 'pointer' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--ink)' }}>{b.batchNo}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--ink-soft)' }}>{b.date}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--ink)' }}>{b.productName || '—'}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--ink-soft)', fontSize: 12 }}>{b.sterileMethod}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--ink-soft)' }}>{b.bioburdenResult || '—'}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--ink-soft)' }}>{b.salAchieved || '—'}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, borderRadius: 4, padding: '2px 7px',
                      background: resultColor(b.result) + '22', color: resultColor(b.result),
                    }}>
                      {BATCH_RESULTS.find(r => r.value === b.result)?.label || b.result}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px' }} onClick={e => e.stopPropagation()}>
                    {canEdit && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(b)} style={{
                          fontSize: 11, padding: '3px 8px', borderRadius: 4,
                          border: '1px solid var(--line)', background: 'none', cursor: 'pointer', color: 'var(--ink-soft)',
                        }}>수정</button>
                        <button onClick={() => del(b.id)} style={{
                          fontSize: 11, padding: '3px 6px', borderRadius: 4,
                          border: '1px solid #FCA5A5', background: 'none', cursor: 'pointer', color: '#EF4444',
                        }}><Trash2 size={11} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {certRow && (
        <SterileModal title="멸균 배치 성적서" onClose={() => setCertRow(null)}>
          <BatchCertificate batch={certRow} specs={specs} onClose={() => setCertRow(null)} />
        </SterileModal>
      )}
    </div>
  )
}

function SterileModal({ title, onClose, children }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.45)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--bg-card)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 520,
        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.18)', border: '1px solid var(--line)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)' }}>
            <XCircle size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function BatchCertificate({ batch, specs, onClose }) {
  const spec = specs.find(s => s.id === batch.specId)
  const Row = ({ label, value }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
      <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>{label}</span>
      <span style={{ fontSize: 12.5, color: 'var(--ink)' }}>{value || '—'}</span>
    </div>
  )
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>멸균 배치 성적서</div>
        <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Sterilization Batch Certificate · ISO 13485 §7.5.7</div>
      </div>
      <Row label="배치/로트 번호" value={batch.batchNo} />
      <Row label="멸균 일자" value={batch.date} />
      <Row label="제품명" value={batch.productName} />
      <Row label="생산 로트" value={batch.lotNo} />
      <Row label="멸균 방법" value={batch.sterileMethod} />
      <Row label="연결된 사양" value={spec ? `${spec.productName} (SAL ${spec.salTarget})` : '— (직접 입력)'} />
      <Row label="실측 온도" value={batch.actualTemp ? `${batch.actualTemp}℃` : ''} />
      <Row label="실측 시간" value={batch.actualTime ? `${batch.actualTime}분` : ''} />
      <Row label="실측 압력" value={batch.actualPressure ? `${batch.actualPressure} bar` : ''} />
      <Row label="실측 선량" value={batch.actualDose} />
      <Row label="바이오버든 결과" value={batch.bioburdenResult ? `${batch.bioburdenResult} CFU/개` : ''} />
      <Row label="달성 SAL" value={batch.salAchieved} />
      <Row label="합/불 판정" value={BATCH_RESULTS.find(r => r.value === batch.result)?.label || batch.result} />
      <Row label="비고" value={batch.notes} />
      <div style={{ display: 'flex', gap: 10, paddingTop: 16 }}>
        <button onClick={() => printSterileBatchCert(batch, spec)} style={{
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
          background: 'var(--moss)', color: '#fff', border: 'none', borderRadius: 6,
          padding: '7px 16px', cursor: 'pointer',
        }}>
          <FileText size={14} /> 인쇄
        </button>
        <button onClick={onClose} style={{
          fontSize: 13, background: 'none', border: '1px solid var(--line)',
          borderRadius: 6, padding: '7px 14px', cursor: 'pointer', color: 'var(--ink-soft)',
        }}>닫기</button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
//  TAB 3 — 재처리·라벨링 정책 문서
// ══════════════════════════════════════════════════════
function PolicyTab({ policy, setPolicy, canEdit }) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(policy)
  const upd = k => e => setDraft(d => ({ ...d, [k]: e.target.value }))
  const save = () => { setPolicy(draft); setEditing(false) }
  const openEdit = () => { setDraft({ ...policy }); setEditing(true) }

  // 개정 이력 추가
  const addRev = () => {
    const row = { date: new Date().toISOString().slice(0, 10), revision: '', by: '', summary: '' }
    setDraft(d => ({ ...d, revisionHistory: [...(d.revisionHistory || []), row] }))
  }
  const updRev = (i, k, v) => {
    const h = [...draft.revisionHistory]
    h[i] = { ...h[i], [k]: v }
    setDraft(d => ({ ...d, revisionHistory: h }))
  }
  const delRev = i => setDraft(d => ({ ...d, revisionHistory: d.revisionHistory.filter((_, j) => j !== i) }))

  const SECTIONS = [
    { key: 'scope',               label: '1. 적용 범위' },
    { key: 'singleUseStatement',  label: '2. 단회 사용 명시 (§7.5.7 필수)' },
    { key: 'reprocessingPolicy',  label: '3. 재처리 정책 (재처리 허용 제품의 경우)' },
    { key: 'labelingReqs',        label: '4. 라벨링 요구사항' },
    { key: 'expiryTrackingMethod',label: '5. 유효기간 추적 방법' },
    { key: 'postMarketMonitoring',label: '6. 시판 후 멸균 모니터링' },
  ]

  return (
    <div>
      {/* 문서 헤더 — 읽기 전용 뷰 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>멸균관리 절차서</div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
            Sterilization Management Procedure · ISO 13485 §7.5.7 — 재처리 제한 · 라벨링 · 유효기간 추적
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => printSterilizationProcedure(policy)} style={{
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
            background: 'none', border: '1px solid var(--line)',
            borderRadius: 6, padding: '7px 14px', cursor: 'pointer', color: 'var(--ink-soft)',
          }}><FileText size={14} /> 인쇄</button>
          {canEdit && (
            <button onClick={openEdit} style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
              background: 'var(--moss)', color: '#fff', border: 'none',
              borderRadius: 6, padding: '7px 14px', cursor: 'pointer',
            }}><Edit2 size={13} /> 절차서 편집</button>
          )}
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 16, padding: '8px 12px', background: 'var(--bg-soft)', borderRadius: 6 }}>
        이 화면은 멸균관리 절차서 내용을 조회 전용으로 표시합니다. 절차서가 수정되면 이 화면에도 즉시 동일한 내용이 반영됩니다.
      </div>

      {/* 문서 메타 정보 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-faint)' }}>개정번호</div>
          <div style={{ fontSize: 14, color: 'var(--ink)', marginTop: 3 }}>{policy.revision || '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-faint)' }}>발행일</div>
          <div style={{ fontSize: 14, color: 'var(--ink)', marginTop: 3 }}>{policy.issueDate || '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-faint)' }}>승인자</div>
          <div style={{ fontSize: 14, color: 'var(--ink)', marginTop: 3 }}>{policy.approvedBy || '—'}</div>
        </div>
      </div>

      {/* 문서 본문 — 읽기 전용 */}
      {SECTIONS.map(({ key, label }) => (
        <div key={key} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 5 }}>{label}</div>
          <div style={{
            fontSize: 13, color: policy[key] ? 'var(--ink)' : 'var(--ink-faint)',
            lineHeight: 1.6, background: 'var(--bg-soft)', borderRadius: 6, padding: 10, minHeight: 48, whiteSpace: 'pre-line',
          }}>
            {policy[key] || <em>미입력</em>}
          </div>
        </div>
      ))}

      {/* 개정 이력 — 읽기 전용 */}
      <div style={{ marginTop: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>개정 이력</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)', background: 'var(--bg-soft)' }}>
              {['날짜', '개정번호', '작성자', '내용 요약'].map(h => (
                <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--ink-soft)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(policy.revisionHistory || []).map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '6px 10px' }}>{r.date}</td>
                <td style={{ padding: '6px 10px' }}>{r.revision}</td>
                <td style={{ padding: '6px 10px' }}>{r.by}</td>
                <td style={{ padding: '6px 10px' }}>{r.summary}</td>
              </tr>
            ))}
            {(policy.revisionHistory || []).length === 0 && (
              <tr><td colSpan={4} style={{ padding: '12px 10px', color: 'var(--ink-faint)', fontSize: 13 }}>개정 이력 없음</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 편집 모달 — 저장 즉시 위 조회 화면에 반영됨 (동일 데이터 소스) */}
      {editing && (
        <SterileModal title="멸균관리 절차서 편집" onClose={() => setEditing(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
            <Field label="개정번호">
              <input style={inp} value={draft.revision} onChange={upd('revision')} />
            </Field>
            <Field label="발행일">
              <input type="date" style={inp} value={draft.issueDate} onChange={upd('issueDate')} />
            </Field>
            <Field label="승인자">
              <input style={inp} value={draft.approvedBy} onChange={upd('approvedBy')} />
            </Field>
          </div>

          {[
            { key: 'scope',               label: '적용 범위', ph: '이 정책이 적용되는 멸균 의료기기 제품군 기술' },
            { key: 'singleUseStatement',  label: '단회 사용 명시 (§7.5.7 필수)', ph: '모든 멸균 의료기기는 단회 사용 제품으로 재처리를 금지한다. 단, ...' },
            { key: 'reprocessingPolicy',  label: '재처리 정책 (재처리 허용 제품의 경우)', ph: '재처리 허용 제품이 없는 경우 "해당 없음" 기재' },
            { key: 'labelingReqs',        label: '라벨링 요구사항', ph: '멸균 상태 표시, 유효기간, 로트번호, 단회용 기호(↺ 금지) 등 ISO 15223 기호 사용 내역' },
            { key: 'expiryTrackingMethod',label: '유효기간 추적 방법', ph: '제품별 멸균 유효기간 설정 근거 및 추적 시스템 기술' },
            { key: 'postMarketMonitoring',label: '시판 후 멸균 모니터링', ph: '시판 후 멸균 유지 확인, 포장 완전성 모니터링 방법 기술' },
          ].map(({ key, label, ph }) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 5 }}>{label}</div>
              <textarea style={textarea} value={draft[key]} onChange={upd(key)} placeholder={ph} />
            </div>
          ))}

          {/* 개정 이력 편집 */}
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>개정 이력</div>
              <button onClick={addRev} style={{
                fontSize: 12, background: 'none', border: '1px solid var(--line)',
                borderRadius: 5, padding: '3px 10px', cursor: 'pointer', color: 'var(--ink-soft)',
              }}>+ 추가</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)', background: 'var(--bg-soft)' }}>
                  {['날짜', '개정번호', '작성자', '내용 요약', ''].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--ink-soft)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(draft.revisionHistory || []).map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '6px 10px' }}>
                      <input style={{ ...inp, padding: '3px 6px' }} value={r.date} onChange={e => updRev(i, 'date', e.target.value)} />
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <input style={{ ...inp, padding: '3px 6px' }} value={r.revision} onChange={e => updRev(i, 'revision', e.target.value)} />
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <input style={{ ...inp, padding: '3px 6px' }} value={r.by} onChange={e => updRev(i, 'by', e.target.value)} />
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <input style={{ ...inp, padding: '3px 6px' }} value={r.summary} onChange={e => updRev(i, 'summary', e.target.value)} />
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <button onClick={() => delRev(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
                {(draft.revisionHistory || []).length === 0 && (
                  <tr><td colSpan={5} style={{ padding: '12px 10px', color: 'var(--ink-faint)', fontSize: 13 }}>개정 이력 없음</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button onClick={save} style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
              background: 'var(--moss)', color: '#fff', border: 'none', borderRadius: 6,
              padding: '7px 16px', cursor: 'pointer',
            }}>
              <Save size={14} /> 저장
            </button>
            <button onClick={() => setEditing(false)} style={{
              fontSize: 13, background: 'none', border: '1px solid var(--line)',
              borderRadius: 6, padding: '7px 14px', cursor: 'pointer', color: 'var(--ink-soft)',
            }}>취소</button>
          </div>
        </SterileModal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════
//  TAB 4 — 현황 분석
// ══════════════════════════════════════════════════════
function AnalysisTab({ specs, batches, compl }) {
  // 배치 결과 집계 (전체)
  const passCount  = batches.filter(b => b.result === 'pass').length
  const failCount  = batches.filter(b => b.result === 'fail').length
  const condCount  = batches.filter(b => b.result === 'conditional').length

  // 밸리데이션 상태 분포
  const statusMap = {}
  SPEC_STATUSES.forEach(s => { statusMap[s.value] = 0 })
  specs.forEach(s => { statusMap[s.status] = (statusMap[s.status] || 0) + 1 })

  // 경고
  const warnings = []
  if (specs.some(s => !s.validationRef)) warnings.push('밸리데이션 참조가 없는 사양이 있습니다.')
  if (specs.some(s => !s.packagingRef))  warnings.push('포장 밸리데이션 참조가 없는 사양이 있습니다.')
  if (specs.some(s => !s.expiryMonths)) warnings.push('멸균 유효기간이 설정되지 않은 사양이 있습니다.')
  if (failCount > 0) warnings.push(`불합격 배치 ${failCount}건이 있습니다.`)

  const bar = (val, max, color) => (
    <div style={{ height: 12, borderRadius: 6, background: 'var(--line)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${max > 0 ? (val / max) * 100 : 0}%`, background: color, borderRadius: 6 }} />
    </div>
  )

  // 월별 멸균 배치 합격률 + 월별 멸균방법별 제품 수 (batches 기준 집계)
  const monthly = useMemo(() => {
    const map = {}
    batches.forEach(b => {
      const m = (b.date || '').slice(0, 7) || '미상'
      if (!map[m]) map[m] = { total: 0, pass: 0, fail: 0, cond: 0, methods: {} }
      map[m].total += 1
      if (b.result === 'pass') map[m].pass += 1
      else if (b.result === 'fail') map[m].fail += 1
      else if (b.result === 'conditional') map[m].cond += 1
      const method = b.sterileMethod || '미지정'
      if (!map[m].methods[method]) map[m].methods[method] = new Set()
      if (b.productName) map[m].methods[method].add(b.productName)
    })
    return Object.keys(map).sort().reverse().map(m => {
      const d = map[m]
      return {
        month: m,
        total: d.total, pass: d.pass, fail: d.fail, cond: d.cond,
        passRate: d.total ? Math.round((d.pass / d.total) * 100) : 0,
        methodCounts: Object.entries(d.methods)
          .map(([method, set]) => ({ method, count: set.size }))
          .sort((a, b) => b.count - a.count),
      }
    })
  }, [batches])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 월별 멸균 배치 합격률 */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>월별 멸균 배치 합격률</div>
        {monthly.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--ink-faint)', fontSize: 13 }}>
            멸균 배치 기록을 등록하면 월별 합격률이 표시됩니다.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {monthly.map(m => (
              <div key={m.month} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--bg-soft)', borderRadius: 8 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', minWidth: 64 }}>{m.month}</span>
                <div style={{ flex: 1 }}>{bar(m.pass, m.total, m.passRate >= 95 ? '#10B981' : m.passRate >= 80 ? '#F59E0B' : '#EF4444')}</div>
                <span style={{ fontSize: 12.5, color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>{m.total}건 · 합격률 {m.passRate}%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 월별 멸균방법별 제품 수 */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>월별 멸균방법별 제품 수</div>
        {monthly.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--ink-faint)', fontSize: 13 }}>
            멸균 배치 기록을 등록하면 월별 멸균방법별 제품 수가 표시됩니다.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {monthly.map(m => (
              <div key={m.month}>
                <div style={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>{m.month}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {m.methodCounts.map(({ method, count }) => (
                    <span key={method} style={{
                      fontSize: 12, padding: '4px 10px', borderRadius: 999,
                      background: '#EDE9FE', color: '#7C3AED', fontWeight: 600,
                    }}>{method} · {count}개</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 밸리데이션 상태 */}
      {specs.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>밸리데이션 상태 현황</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {SPEC_STATUSES.map(s => (
              <div key={s.value} style={{
                background: s.color + '18', border: `1px solid ${s.color}44`, borderRadius: 8, padding: '10px 16px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{statusMap[s.value] || 0}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 경고 */}
      {warnings.length > 0 && (
        <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#92400E', marginBottom: 8 }}>
            <AlertTriangle size={16} /> 개선 필요 항목
          </div>
          {warnings.map((w, i) => (
            <div key={i} style={{ fontSize: 13, color: '#78350F', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span>•</span> {w}
            </div>
          ))}
        </div>
      )}

      {specs.length === 0 && batches.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--ink-faint)', fontSize: 14 }}>
          사양 및 배치 기록을 등록하면 분석 결과가 표시됩니다.
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════
//  MAIN HUB
// ══════════════════════════════════════════════════════
export default function SterileControlHub() {
  const user    = auth.current()
  const canEdit = (user?.level || 0) >= 2
  const nav = useNavigate()

  // 멸균 방법 사양은 제품·공정 화면(제품 개발)에서 입력된 제품 레코드로부터 파생된다 (SSoT).
  const specs = useMemo(() => deriveSterileSpecs(onboarding.load()?.products || []), [])
  const [batches,  setBatchesRaw] = useState(() => lsGet(BATCHES_KEY, []))
  const [policy,   setPolicyRaw]  = useState(() => lsGet(POLICY_KEY,  DEFAULT_POLICY))
  const [tab,      setTab]        = useState('specs')

  const setBatches = v => { setBatchesRaw(v); lsSet(BATCHES_KEY, v) }
  const setPolicy  = v => { setPolicyRaw(v);  lsSet(POLICY_KEY,  v) }

  const goToProduct = (productId) => nav('/products?tab=product&productId=' + encodeURIComponent(productId) + '&detailTab=info')
  const goToProducts = () => nav('/products?tab=product')

  const compl = useCompleteness(specs, batches, policy)

  const TABS = [
    { id: 'specs',   label: '멸균 방법 사양',    icon: Beaker },
    { id: 'batches', label: '멸균 배치 기록',    icon: ClipboardList },
    { id: 'policy',  label: '재처리·라벨링 정책', icon: FileText },
    { id: 'analysis',label: '현황 분석',          icon: BarChart2 },
  ]

  return (
    <AppLayout user={user} title="멸균 의료기기 관리" subtitle="ISO 13485 §7.5.7 — 멸균 방법 · 배치 기록 · 재처리 정책">
      <HubBanner title="멸균 의료기기 관리" subtitle="ISO 13485 §7.5.7 — 멸균 방법·배치 기록·재처리 정책" icon={ShieldCheck} color="#7C3AED" workflow={['멸균 사양 수립', '배치 기록', '방법 검증', '출하 판정', '유효기간 관리']} />
      {/* §7.5.7 정보 배너 */}
      <div style={{
        background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
        border: '1px solid #BFDBFE', borderRadius: 10, padding: '12px 16px',
        marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 12,
      }}>
        <ShieldCheck size={20} style={{ color: '#2563EB', flexShrink: 0, marginTop: 1 }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1E40AF' }}>ISO 13485 §7.5.7 — 멸균 의료기기 특별 요구사항</div>
          <div style={{ fontSize: 12, color: '#3B82F6', marginTop: 2 }}>
            멸균 의료기기 제조 시 멸균 방법 밸리데이션 기록 유지 · SAL 달성 확인 · 단회 사용 표시 · 멸균 유효기간 라벨 표기 의무
          </div>
        </div>
        {/* 완전성 뱃지 */}
        <div style={{
          marginLeft: 'auto', flexShrink: 0,
          background: compl.pct >= 80 ? '#D1FAE5' : compl.pct >= 50 ? '#FEF3C7' : '#FEE2E2',
          color:      compl.pct >= 80 ? '#065F46' : compl.pct >= 50 ? '#92400E'  : '#991B1B',
          border: '1px solid ' + (compl.pct >= 80 ? '#6EE7B7' : compl.pct >= 50 ? '#FCD34D' : '#FCA5A5'),
          borderRadius: 8, padding: '6px 14px', fontWeight: 700, fontSize: 14, textAlign: 'center', minWidth: 80,
        }}>
          {compl.pct}%
          <div style={{ fontSize: 10, fontWeight: 400 }}>{compl.done}/{compl.total}</div>
        </div>
      </div>

      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--line)',
        borderRadius: 12, padding: 24,
      }}>
        <TabBar tabs={TABS} active={tab} onSelect={setTab} />

        {tab === 'specs'    && <SpecTab     specs={specs}   canEdit={canEdit} onNavigateToProduct={goToProduct} onNavigateToProducts={goToProducts} />}
        {tab === 'batches'  && <BatchTab    batches={batches} setBatches={setBatches} specs={specs} canEdit={canEdit} />}
        {tab === 'policy'   && <PolicyTab   policy={policy} setPolicy={setPolicy}  canEdit={canEdit} />}
        {tab === 'analysis' && <AnalysisTab specs={specs}   batches={batches}      compl={compl} />}
      </div>
    </AppLayout>
  )
}
