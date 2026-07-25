// src/pages/product-id/ProductIdHub.jsx
// ISO 13485 §7.5.8 — 제품 식별 및 검사 상태 관리
import React, { useState, useMemo } from 'react'
import {
  Plus, Save, Edit2, Trash2, Tag, Package,
  CheckCircle2, XCircle, Clock, AlertTriangle,
  BarChart2, Link2, Layers, QrCode, ShieldCheck,
  ArrowRight, RefreshCw,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'

// ── 상수 ─────────────────────────────────────────────────────
const LS_KEY = 'qualytree.product_id'

// 검사 상태 (§7.5.8 핵심 — 검사 통과 여부 명확히 식별)
const INSPECT_STATUSES = {
  pending:   { label: '검사 대기',  color: '#9CA3AF', bg: '#F3F4F6', icon: Clock },
  pass:      { label: '합격',       color: '#059669', bg: '#D1FAE5', icon: CheckCircle2 },
  fail:      { label: '불합격',     color: '#DC2626', bg: '#FEE2E2', icon: XCircle },
  quarantine:{ label: '격리',       color: '#D97706', bg: '#FEF3C7', icon: AlertTriangle },
  released:  { label: '출하 승인',  color: '#2563EB', bg: '#DBEAFE', icon: ShieldCheck },
  in_process:{ label: '공정 중',    color: '#7C3AED', bg: '#EDE9FE', icon: RefreshCw },
}

// 식별 방법
const ID_METHODS = [
  '라벨 (Label)', '스티커 (Sticker)', '바코드', 'QR 코드',
  'UDI (Unique Device Identification)', '각인·마킹',
  '전자 기록 (ERP/MES)', '컨테이너 표시', '색상 코드', '기타',
]

// 제품 위치 (공정 단계)
const PROCESS_STAGES = [
  '입고 검사 (IQC)',
  '원자재 창고',
  '공정 투입',
  '반제품 (WIP)',
  '공정 검사',
  '최종 검사',
  '완제품 창고',
  '포장',
  '격리 구역',
  '출하 준비',
  '출하 완료',
]

const DEVICE_CLASSES = ['Class I', 'Class II', 'Class IIa', 'Class IIb', 'Class III', '미분류']

function genId() { return `PID-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }
function today() { return new Date().toISOString().slice(0, 10) }

const EMPTY_FORM = {
  productName: '', productCode: '', deviceClass: 'Class II',
  lotNo: '', serialNo: '', qty: '',
  idMethod: '라벨 (Label)',
  labelContent: '',       // 라벨에 표시되는 내용
  udi: '', udiDI: '', udiPI: '',   // UDI 구성
  inspectStatus: 'pending',
  currentStage: '입고 검사 (IQC)',
  inspectedBy: '', inspectedDate: '',
  linkedIqcId: '', linkedInspId: '', linkedDistId: '', linkedLotId: '',
  manufacturingDate: '', expiryDate: '',
  sterileLot: false, sterileMethod: '',
  notes: '',
  statusHistory: [],
}

// ── 메인 ─────────────────────────────────────────────────────
export default function ProductIdHub() {
  const user = auth.current()
  const canEdit = user?.level >= 2

  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
  })

  const [tab, setTab] = useState('list')   // list | board | analysis
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterStage, setFilterStage] = useState('all')
  const [searchQ, setSearchQ] = useState('')

  function save(list) { setItems(list); localStorage.setItem(LS_KEY, JSON.stringify(list)) }

  function submitItem() {
    if (!form.productName.trim()) return alert('제품명을 입력하세요.')
    if (!form.lotNo.trim() && !form.serialNo.trim()) return alert('로트번호 또는 시리얼번호를 입력하세요.')
    const now = { id: genId(), createdAt: today(), statusHistory: [], ...form }
    const isEdit = !!editId
    const next = isEdit
      ? items.map(i => i.id === editId ? { ...i, ...form } : i)
      : [now, ...items]
    save(next)
    setShowForm(false); setForm(EMPTY_FORM); setEditId(null)
  }

  function deleteItem(id) {
    if (!confirm('제품 식별 기록을 삭제하시겠습니까?')) return
    save(items.filter(i => i.id !== id))
  }

  function quickStatus(id, inspectStatus, stage) {
    const entry = {
      date: today(), inspectStatus, stage: stage || items.find(i => i.id === id)?.currentStage,
      by: user?.name || '',
    }
    save(items.map(i => {
      if (i.id !== id) return i
      return {
        ...i, inspectStatus,
        currentStage: stage || i.currentStage,
        inspectedDate: today(),
        inspectedBy: user?.name || i.inspectedBy,
        statusHistory: [...(i.statusHistory || []), entry],
      }
    }))
  }

  function advanceStage(id) {
    const item = items.find(i => i.id === id)
    if (!item) return
    const idx = PROCESS_STAGES.indexOf(item.currentStage)
    if (idx < 0 || idx >= PROCESS_STAGES.length - 1) return
    const nextStage = PROCESS_STAGES[idx + 1]
    quickStatus(id, item.inspectStatus, nextStage)
  }

  const filtered = useMemo(() => items.filter(i => {
    if (filterStatus !== 'all' && i.inspectStatus !== filterStatus) return false
    if (filterStage !== 'all' && i.currentStage !== filterStage) return false
    if (searchQ) {
      const q = searchQ.toLowerCase()
      if (!(i.productName.toLowerCase().includes(q) || (i.lotNo || '').toLowerCase().includes(q) || (i.serialNo || '').toLowerCase().includes(q) || (i.productCode || '').toLowerCase().includes(q))) return false
    }
    return true
  }), [items, filterStatus, filterStage, searchQ])

  // 분석
  const analysis = useMemo(() => {
    const byStatus = {}
    Object.keys(INSPECT_STATUSES).forEach(k => { byStatus[k] = items.filter(i => i.inspectStatus === k).length })
    const byStage = {}
    PROCESS_STAGES.forEach(s => { byStage[s] = items.filter(i => i.currentStage === s).length })
    const quarantine = items.filter(i => i.inspectStatus === 'quarantine' || i.inspectStatus === 'fail')
    const udiItems = items.filter(i => i.udi || i.udiDI)
    return { byStatus, byStage, quarantine, udiItems }
  }, [items])

  // 공정 보드 — 스테이지별 그룹화
  const boardGroups = useMemo(() => {
    const g = {}
    PROCESS_STAGES.forEach(s => { g[s] = items.filter(i => i.currentStage === s) })
    return g
  }, [items])

  return (
    <AppLayout user={user} title="제품 식별 및 상태 관리" subtitle="ISO 13485 §7.5.8 — 제품 식별·검사 상태 표시·UDI">
      <div className="px-6 lg:px-8 py-6 max-w-[1600px] mx-auto">

        {/* 탭 */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-soft)' }}>
          {[
            { key: 'list',     label: `식별 목록 (${items.length})` },
            { key: 'board',    label: '공정 현황판' },
            { key: 'analysis', label: '분석' },
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
            {/* 검색·필터 */}
            <div className="flex flex-wrap gap-2 mb-4 items-center">
              <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="제품명·로트·시리얼 검색..."
                className="px-3 py-1.5 rounded-xl text-[13px] flex-1 min-w-[160px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-[13px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                <option value="all">전체 상태</option>
                {Object.entries(INSPECT_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select value={filterStage} onChange={e => setFilterStage(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-[13px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                <option value="all">전체 공정</option>
                {PROCESS_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {canEdit && (
                <button onClick={() => { setForm(EMPTY_FORM); setEditId(null); setShowForm(true) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} /> 식별 등록
                </button>
              )}
            </div>

            {showForm && (
              <ItemForm form={form} setForm={setForm} onSave={submitItem}
                onCancel={() => { setShowForm(false); setForm(EMPTY_FORM); setEditId(null) }}
                isEdit={!!editId} />
            )}

            {/* 격리·불합격 경보 */}
            {analysis.quarantine.length > 0 && (
              <div className="mb-4 p-3 rounded-xl text-[12.5px] flex items-center gap-2 flex-wrap"
                style={{ background: '#FEE2E2', border: '1px solid #FECACA', color: '#991B1B' }}>
                <AlertTriangle size={14} />
                격리/불합격 {analysis.quarantine.length}건 조치 필요:
                {analysis.quarantine.slice(0, 3).map(i => (
                  <span key={i.id} className="font-bold">{i.productName} {i.lotNo}</span>
                ))}
              </div>
            )}

            {/* 목록 테이블 */}
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr style={{ background: 'var(--bg-soft)' }}>
                    {['ID', '제품명', '로트/S/N', '식별방법', '검사 상태', '현재 공정', '검사일', '연결', ''].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--ink-soft)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-12" style={{ color: 'var(--ink-faint)' }}>등록된 제품 식별 기록이 없습니다.</td></tr>
                  ) : filtered.map((item, idx) => {
                    const st = INSPECT_STATUSES[item.inspectStatus] || INSPECT_STATUSES.pending
                    const Icon = st.icon
                    return (
                      <tr key={item.id} style={{ background: idx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-soft)', borderTop: '1px solid var(--line)' }}>
                        <td className="px-3 py-2 font-mono text-[11px]" style={{ color: 'var(--ink-faint)' }}>{item.id}</td>
                        <td className="px-3 py-2">
                          <div className="font-semibold" style={{ color: 'var(--ink)' }}>{item.productName}</div>
                          <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{item.productCode} · {item.deviceClass}</div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-mono" style={{ color: 'var(--ink)' }}>{item.lotNo || '-'}</div>
                          {item.serialNo && <div className="text-[11px] font-mono" style={{ color: 'var(--ink-faint)' }}>S/N: {item.serialNo}</div>}
                          {item.qty && <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>수량: {item.qty}</div>}
                        </td>
                        <td className="px-3 py-2 text-[11.5px]" style={{ color: 'var(--ink-soft)' }}>
                          {item.idMethod}
                          {item.udi && <div className="text-[10.5px] font-mono mt-0.5" style={{ color: '#2563EB' }}>UDI: {item.udi}</div>}
                        </td>
                        <td className="px-3 py-2">
                          <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full w-fit"
                            style={{ background: st.bg, color: st.color }}>
                            <Icon size={10} /> {st.label}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[11.5px]" style={{ color: 'var(--ink-soft)' }}>
                          {item.currentStage}
                          {canEdit && (
                            <button onClick={() => advanceStage(item.id)}
                              className="ml-1 p-0.5 rounded" title="다음 공정으로"
                              style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                              <ArrowRight size={10} style={{ color: 'var(--moss)' }} />
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-2 text-[11.5px]" style={{ color: 'var(--ink-soft)' }}>{item.inspectedDate || '-'}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1 flex-wrap">
                            {item.linkedIqcId && <LinkChip label="IQC" color="#2563EB" />}
                            {item.linkedInspId && <LinkChip label="검사" color="#059669" />}
                            {item.linkedDistId && <LinkChip label="출하" color="#D97706" />}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {canEdit && (
                            <div className="flex gap-1 flex-wrap">
                              {item.inspectStatus === 'pending' && <QuickBtn label="합격" color="#059669" onClick={() => quickStatus(item.id, 'pass')} />}
                              {item.inspectStatus === 'pending' && <QuickBtn label="불합격" color="#DC2626" onClick={() => quickStatus(item.id, 'fail')} />}
                              {item.inspectStatus === 'fail' && <QuickBtn label="격리" color="#D97706" onClick={() => quickStatus(item.id, 'quarantine')} />}
                              {item.inspectStatus === 'pass' && <QuickBtn label="출하승인" color="#2563EB" onClick={() => quickStatus(item.id, 'released')} />}
                              <button onClick={() => { setForm({ ...EMPTY_FORM, ...item }); setEditId(item.id); setShowForm(true) }}
                                className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                                <Edit2 size={11} style={{ color: 'var(--ink-soft)' }} />
                              </button>
                              <button onClick={() => deleteItem(item.id)}
                                className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', border: '1px solid #FECACA', cursor: 'pointer' }}>
                                <Trash2 size={11} style={{ color: '#DC2626' }} />
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

        {/* ── 공정 현황판 ── */}
        {tab === 'board' && (
          <div>
            <div className="text-[13px] mb-4" style={{ color: 'var(--ink-soft)' }}>
              제품·로트의 현재 공정 단계별 현황 — 각 카드의 <strong>→</strong> 버튼으로 다음 공정으로 이동
            </div>
            <div className="flex gap-3 overflow-x-auto pb-4">
              {PROCESS_STAGES.map(stage => {
                const stageItems = boardGroups[stage] || []
                const hasAlerts = stageItems.some(i => i.inspectStatus === 'fail' || i.inspectStatus === 'quarantine')
                return (
                  <div key={stage} className="shrink-0 rounded-2xl p-3" style={{ width: 200, background: 'var(--bg-soft)', border: `1.5px solid ${hasAlerts ? '#FECACA' : 'var(--line)'}` }}>
                    <div className="text-[11.5px] font-bold mb-2 pb-2" style={{ color: 'var(--ink)', borderBottom: '1px solid var(--line)' }}>
                      {stage}
                      <span className="ml-1 text-[10.5px] font-normal px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-card)', color: 'var(--ink-faint)' }}>{stageItems.length}</span>
                    </div>
                    <div className="space-y-2">
                      {stageItems.map(item => {
                        const st = INSPECT_STATUSES[item.inspectStatus] || INSPECT_STATUSES.pending
                        const Icon = st.icon
                        return (
                          <div key={item.id} className="p-2 rounded-xl" style={{ background: 'var(--bg-card)', border: `1px solid ${st.color}40` }}>
                            <div className="text-[11px] font-bold" style={{ color: 'var(--ink)' }}>{item.productName}</div>
                            <div className="text-[10px] font-mono" style={{ color: 'var(--ink-faint)' }}>{item.lotNo || item.serialNo}</div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="flex items-center gap-0.5 text-[10px] font-bold" style={{ color: st.color }}>
                                <Icon size={9} /> {st.label}
                              </span>
                              {canEdit && (
                                <button onClick={() => advanceStage(item.id)} title="다음 공정"
                                  className="p-0.5 rounded" style={{ background: st.bg, border: 'none', cursor: 'pointer' }}>
                                  <ArrowRight size={10} style={{ color: st.color }} />
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                      {stageItems.length === 0 && (
                        <div className="text-center py-3 text-[11px]" style={{ color: 'var(--ink-faint)' }}>없음</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── 분석 탭 ── */}
        {tab === 'analysis' && (
          <AnalysisView analysis={analysis} items={items} />
        )}
      </div>
    </AppLayout>
  )
}

// ── 분석 뷰 ──────────────────────────────────────────────────
function AnalysisView({ analysis, items }) {
  return (
    <div className="space-y-5">
      {/* 검사 상태 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(INSPECT_STATUSES).map(([k, v]) => {
          const Icon = v.icon
          return (
            <div key={k} className="p-4 rounded-2xl text-center" style={{ background: v.bg, border: `1px solid ${v.color}40` }}>
              <Icon size={18} style={{ color: v.color, margin: '0 auto 6px' }} />
              <div className="text-[24px] font-bold" style={{ color: v.color }}>{analysis.byStatus[k] || 0}</div>
              <div className="text-[11.5px]" style={{ color: 'var(--ink-soft)' }}>{v.label}</div>
            </div>
          )
        })}
      </div>

      {/* 격리·불합격 상세 */}
      {analysis.quarantine.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
          <div className="text-[13px] font-bold mb-3" style={{ color: '#DC2626' }}>⚠ 격리/불합격 처리 필요 ({analysis.quarantine.length}건)</div>
          <div className="space-y-2">
            {analysis.quarantine.map(item => {
              const st = INSPECT_STATUSES[item.inspectStatus]
              return (
                <div key={item.id} className="flex items-center justify-between p-2.5 rounded-xl"
                  style={{ background: '#FFF5F5', border: '1px solid #FECACA' }}>
                  <div>
                    <div className="text-[12px] font-bold" style={{ color: '#991B1B' }}>{item.productName}</div>
                    <div className="text-[11px]" style={{ color: '#DC2626' }}>로트: {item.lotNo || '-'} · {item.currentStage}</div>
                  </div>
                  <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* UDI 등록 현황 */}
      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>UDI 등록 현황</div>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 rounded-xl" style={{ background: '#DBEAFE' }}>
            <div className="text-[28px] font-bold" style={{ color: '#2563EB' }}>{analysis.udiItems.length}</div>
            <div className="text-[12px]" style={{ color: '#1E40AF' }}>UDI 등록 제품</div>
          </div>
          <div className="text-center p-4 rounded-xl" style={{ background: 'var(--bg-soft)' }}>
            <div className="text-[28px] font-bold" style={{ color: 'var(--ink-soft)' }}>{items.length - analysis.udiItems.length}</div>
            <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>UDI 미등록</div>
          </div>
        </div>
      </div>

      {/* 공정별 현황 */}
      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>공정별 재고 현황</div>
        {PROCESS_STAGES.filter(s => (analysis.byStage[s] || 0) > 0).map(stage => (
          <div key={stage} className="flex items-center gap-3 mb-2">
            <span className="text-[12px] flex-1" style={{ color: 'var(--ink-soft)' }}>{stage}</span>
            <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--bg-soft)' }}>
              <div className="h-2 rounded-full" style={{ width: `${items.length ? ((analysis.byStage[stage] || 0) / items.length) * 100 : 0}%`, background: 'var(--moss)' }} />
            </div>
            <span className="text-[12px] font-bold w-5 text-right" style={{ color: 'var(--ink)' }}>{analysis.byStage[stage] || 0}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 등록 폼 ──────────────────────────────────────────────────
function ItemForm({ form, setForm, onSave, onCancel, isEdit }) {
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="mb-6 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>{isEdit ? '제품 식별 수정' : '제품 식별 등록 (§7.5.8)'}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <Field label="제품명 *" value={form.productName} onChange={v => F('productName', v)} />
        <Field label="제품 코드" value={form.productCode} onChange={v => F('productCode', v)} />
        <FieldSelect label="기기 등급" value={form.deviceClass} onChange={v => F('deviceClass', v)}
          options={DEVICE_CLASSES.map(c => ({ value: c, label: c }))} />
        <Field label="로트 번호" value={form.lotNo} onChange={v => F('lotNo', v)} placeholder="LOT-2026-001" />
        <Field label="시리얼 번호 (S/N)" value={form.serialNo} onChange={v => F('serialNo', v)} />
        <Field label="수량" value={form.qty} onChange={v => F('qty', v)} type="number" />
        <FieldSelect label="식별 방법" value={form.idMethod} onChange={v => F('idMethod', v)}
          options={ID_METHODS.map(m => ({ value: m, label: m }))} />
        <FieldSelect label="검사 상태 *" value={form.inspectStatus} onChange={v => F('inspectStatus', v)}
          options={Object.entries(INSPECT_STATUSES).map(([k, v]) => ({ value: k, label: v.label }))} />
        <FieldSelect label="현재 공정 단계" value={form.currentStage} onChange={v => F('currentStage', v)}
          options={PROCESS_STAGES.map(s => ({ value: s, label: s }))} />
        <Field label="검사일" type="date" value={form.inspectedDate} onChange={v => F('inspectedDate', v)} />
        <Field label="검사자" value={form.inspectedBy} onChange={v => F('inspectedBy', v)} />
        <Field label="제조일" type="date" value={form.manufacturingDate} onChange={v => F('manufacturingDate', v)} />
        <Field label="유효기간" type="date" value={form.expiryDate} onChange={v => F('expiryDate', v)} />
        <Field label="UDI (전체)" value={form.udi} onChange={v => F('udi', v)} placeholder="(01)08806123456789..." />
        <Field label="UDI-DI (기기 식별자)" value={form.udiDI} onChange={v => F('udiDI', v)} />
        <Field label="UDI-PI (생산 식별자)" value={form.udiPI} onChange={v => F('udiPI', v)} />
        <Field label="연결 IQC ID" value={form.linkedIqcId} onChange={v => F('linkedIqcId', v)} placeholder="IQC-xxxx" />
        <Field label="연결 검사 ID" value={form.linkedInspId} onChange={v => F('linkedInspId', v)} placeholder="INS-xxxx" />
        <Field label="연결 출하 ID" value={form.linkedDistId} onChange={v => F('linkedDistId', v)} placeholder="DIST-xxxx" />
      </div>
      <div className="mb-3 flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer text-[12.5px]" style={{ color: 'var(--ink-soft)' }}>
          <input type="checkbox" checked={!!form.sterileLot} onChange={e => F('sterileLot', e.target.checked)} className="accent-green-500" />
          멸균 로트
        </label>
        {form.sterileLot && (
          <input type="text" value={form.sterileMethod || ''} onChange={e => F('sterileMethod', e.target.value)}
            placeholder="멸균 방법 (EO/감마선/증기...)"
            className="flex-1 px-3 py-1.5 rounded-xl text-[13px]"
            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
        )}
      </div>
      <div className="mb-3">
        <FieldArea label="라벨 표시 내용" value={form.labelContent} onChange={v => F('labelContent', v)} rows={2} />
      </div>
      <div className="mb-4"><FieldArea label="비고" value={form.notes} onChange={v => F('notes', v)} rows={2} /></div>
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

// ── 공통 ─────────────────────────────────────────────────────
function QuickBtn({ label, color, onClick }) {
  return (
    <button onClick={onClick} className="px-2 py-0.5 rounded text-[10.5px] font-bold"
      style={{ background: `${color}15`, border: `1px solid ${color}40`, color, cursor: 'pointer' }}>
      {label}
    </button>
  )
}
function LinkChip({ label, color }) {
  return (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
      style={{ background: color + '20', color }}>
      {label}
    </span>
  )
}
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
