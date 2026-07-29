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
} from 'lucide-react'
import {
  STERILE_METHODS, SAL_LEVELS, BIOBURDEN_METHODS, SPEC_STATUSES, deriveSterileSpecs,
} from '../../lib/sterileSpecConstants'
import { printSterileBatchCert } from '../../lib/pdfPrint'

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
    else setDraft(d => ({ ...d, specId: '' }))
  }

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
            <Field label="멸균 사양 연결">
              <select style={sel} value={draft.specId} onChange={onSpecChange}>
                <option value="">— 직접 입력 —</option>
                {specs.map(s => <option key={s.id} value={s.id}>{s.productName}</option>)}
              </select>
            </Field>
            <Field label="배치/로트 번호" required>
              <input style={inp} value={draft.batchNo} onChange={upd('batchNo')} placeholder="예: LOT-2024-001" />
            </Field>
            <Field label="멸균 일자">
              <input type="date" style={inp} value={draft.date} onChange={upd('date')} />
            </Field>
            <Field label="제품명">
              <input style={inp} value={draft.productName} onChange={upd('productName')} placeholder="제품명" />
            </Field>
            <Field label="로트 번호">
              <input style={inp} value={draft.lotNo} onChange={upd('lotNo')} placeholder="생산 로트" />
            </Field>
            <Field label="멸균 방법">
              <select style={sel} value={draft.sterileMethod} onChange={upd('sterileMethod')}>
                {STERILE_METHODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </Field>
          </div>

          <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8, padding: 14, marginBottom: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: 'var(--ink-soft)' }}>실측 사이클 파라미터</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
              <Field label="온도 (℃)">
                <input style={inp} value={draft.actualTemp} onChange={upd('actualTemp')} />
              </Field>
              <Field label="시간 (분)">
                <input style={inp} value={draft.actualTime} onChange={upd('actualTime')} />
              </Field>
              <Field label="압력 (bar)">
                <input style={inp} value={draft.actualPressure} onChange={upd('actualPressure')} />
              </Field>
              <Field label="선량 (kGy)">
                <input style={inp} value={draft.actualDose} onChange={upd('actualDose')} />
              </Field>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
            <Field label="바이오버든 결과 (CFU/개)">
              <input style={inp} value={draft.bioburdenResult} onChange={upd('bioburdenResult')} placeholder="예: 12" />
            </Field>
            <Field label="달성 SAL">
              <input style={inp} value={draft.salAchieved} onChange={upd('salAchieved')} placeholder="예: 10⁻⁶" />
            </Field>
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

  const src = editing ? draft : policy

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>멸균 의료기기 특별 요구사항 정책</div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>ISO 13485 §7.5.7 — 재처리 제한 · 라벨링 · 유효기간 추적</div>
        </div>
        {canEdit && !editing && (
          <button onClick={() => { setDraft({ ...policy }); setEditing(true) }} style={{
            fontSize: 13, background: 'none', border: '1px solid var(--line)',
            borderRadius: 6, padding: '7px 14px', cursor: 'pointer', color: 'var(--ink-soft)',
          }}>편집</button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-faint)' }}>개정번호</div>
          {editing
            ? <input style={inp} value={draft.revision} onChange={upd('revision')} />
            : <div style={{ fontSize: 14, color: 'var(--ink)', marginTop: 3 }}>{src.revision || '—'}</div>}
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-faint)' }}>발행일</div>
          {editing
            ? <input type="date" style={inp} value={draft.issueDate} onChange={upd('issueDate')} />
            : <div style={{ fontSize: 14, color: 'var(--ink)', marginTop: 3 }}>{src.issueDate || '—'}</div>}
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-faint)' }}>승인자</div>
          {editing
            ? <input style={inp} value={draft.approvedBy} onChange={upd('approvedBy')} />
            : <div style={{ fontSize: 14, color: 'var(--ink)', marginTop: 3 }}>{src.approvedBy || '—'}</div>}
        </div>
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
          {editing
            ? <textarea style={textarea} value={draft[key]} onChange={upd(key)} placeholder={ph} />
            : <div style={{
                fontSize: 13, color: src[key] ? 'var(--ink)' : 'var(--ink-faint)',
                lineHeight: 1.6, background: 'var(--bg-soft)', borderRadius: 6, padding: 10, minHeight: 48,
              }}>
                {src[key] || <em>미입력</em>}
              </div>}
        </div>
      ))}

      {/* 개정 이력 */}
      <div style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>개정 이력</div>
          {editing && (
            <button onClick={addRev} style={{
              fontSize: 12, background: 'none', border: '1px solid var(--line)',
              borderRadius: 5, padding: '3px 10px', cursor: 'pointer', color: 'var(--ink-soft)',
            }}>+ 추가</button>
          )}
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
            {(src.revisionHistory || []).map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '6px 10px' }}>
                  {editing ? <input style={{ ...inp, padding: '3px 6px' }} value={r.date} onChange={e => updRev(i, 'date', e.target.value)} /> : r.date}
                </td>
                <td style={{ padding: '6px 10px' }}>
                  {editing ? <input style={{ ...inp, padding: '3px 6px' }} value={r.revision} onChange={e => updRev(i, 'revision', e.target.value)} /> : r.revision}
                </td>
                <td style={{ padding: '6px 10px' }}>
                  {editing ? <input style={{ ...inp, padding: '3px 6px' }} value={r.by} onChange={e => updRev(i, 'by', e.target.value)} /> : r.by}
                </td>
                <td style={{ padding: '6px 10px' }}>
                  {editing ? <input style={{ ...inp, padding: '3px 6px' }} value={r.summary} onChange={e => updRev(i, 'summary', e.target.value)} /> : r.summary}
                </td>
                <td style={{ padding: '6px 10px' }}>
                  {editing && <button onClick={() => delRev(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}><Trash2 size={13} /></button>}
                </td>
              </tr>
            ))}
            {(src.revisionHistory || []).length === 0 && (
              <tr><td colSpan={5} style={{ padding: '12px 10px', color: 'var(--ink-faint)', fontSize: 13 }}>개정 이력 없음</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
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
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════
//  TAB 4 — 현황 분석
// ══════════════════════════════════════════════════════
function AnalysisTab({ specs, batches, compl }) {
  const { checks, done, total, pct } = compl

  // 배치 결과 집계
  const passCount  = batches.filter(b => b.result === 'pass').length
  const failCount  = batches.filter(b => b.result === 'fail').length
  const condCount  = batches.filter(b => b.result === 'conditional').length
  const passRate   = batches.length > 0 ? Math.round((passCount / batches.length) * 100) : 0

  // 멸균 방법 분포
  const methodMap = {}
  specs.forEach(s => { methodMap[s.sterileMethod] = (methodMap[s.sterileMethod] || 0) + 1 })

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 완전성 */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>§7.5.7 충족도 체크리스트</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: pct >= 80 ? 'var(--moss)' : pct >= 50 ? '#F59E0B' : '#EF4444' }}>{pct}%</div>
          <div style={{ flex: 1 }}>
            <div style={{ height: 10, borderRadius: 5, background: 'var(--line)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: pct >= 80 ? 'var(--moss)' : pct >= 50 ? '#F59E0B' : '#EF4444', borderRadius: 5 }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>{done} / {total} 항목 충족</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {checks.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              {c.done
                ? <CheckCircle size={15} style={{ color: '#10B981', flexShrink: 0 }} />
                : <XCircle    size={15} style={{ color: '#EF4444', flexShrink: 0 }} />}
              <span style={{ color: c.done ? 'var(--ink)' : 'var(--ink-soft)' }}>{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 배치 합격률 */}
      {batches.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>멸균 배치 합격률</div>
          <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
            {[
              { label: '합격', value: passCount,  color: '#10B981' },
              { label: '불합격', value: failCount, color: '#EF4444' },
              { label: '조건부', value: condCount, color: '#F59E0B' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{label}</div>
              </div>
            ))}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: passRate >= 95 ? '#10B981' : '#F59E0B' }}>{passRate}%</div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>합격률</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: '합격',   count: passCount, color: '#10B981' },
              { label: '불합격', count: failCount, color: '#EF4444' },
              { label: '조건부', count: condCount, color: '#F59E0B' },
            ].map(({ label, count, color }) => (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 12 }}>
                  <span style={{ color }}>{label}</span>
                  <span style={{ color: 'var(--ink-soft)' }}>{count}건</span>
                </div>
                {bar(count, batches.length, color)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 멸균 방법 분포 */}
      {specs.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>멸균 방법별 제품 수</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(methodMap).map(([method, count]) => (
              <div key={method}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 12 }}>
                  <span style={{ color: 'var(--ink-soft)' }}>{method}</span>
                  <span style={{ color: 'var(--ink)' }}>{count}개</span>
                </div>
                {bar(count, specs.length, 'var(--moss)')}
              </div>
            ))}
          </div>
        </div>
      )}

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
