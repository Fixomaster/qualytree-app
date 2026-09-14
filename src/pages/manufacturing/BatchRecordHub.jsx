// src/pages/manufacturing/BatchRecordHub.jsx
// 생산현황 — 작업지시 → 배치기록서 연결 및 실적 기록 (ISO 13485 §7.5.1)
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import AppLayout from '../../components/AppLayout'
import { ClipboardList, Plus, ChevronDown, ChevronRight, Check } from 'lucide-react'

const STATUS_COLORS = {
  draft:       { bg: '#f3f4f6', text: '#6b7280', label: '임시저장' },
  in_progress: { bg: '#eff6ff', text: '#2563eb', label: '생산 중' },
  completed:   { bg: '#f0fdf4', text: '#16a34a', label: '완료' },
  rejected:    { bg: '#fef2f2', text: '#dc2626', label: '불합격' },
  on_hold:     { bg: '#fef9c3', text: '#ca8a04', label: '보류' },
}

const EMPTY_WO = { product_name: '', lot_number: '', planned_qty: '', planned_date: '', notes: '' }
const EMPTY_BR = { actual_qty: '', actual_date: '', operator: '', yield_pct: '', status: 'in_progress', deviations: '', inspector: '', inspection_result: 'pass' }

export default function BatchRecordHub() {
  const [workOrders, setWorkOrders] = useState([])
  const [batchRecords, setBatchRecords] = useState({})
  const [loading, setLoading] = useState(false)
  const [showWOForm, setShowWOForm] = useState(false)
  const [woForm, setWoForm] = useState(EMPTY_WO)
  const [expandedWO, setExpandedWO] = useState(null)
  const [showBRForm, setShowBRForm] = useState(null)
  const [brForm, setBrForm] = useState(EMPTY_BR)
  const [tab, setTab] = useState('active')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const { data: wos } = await supabase.from('work_orders').select('*').order('created_at', { ascending: false })
    const { data: brs } = await supabase.from('batch_records').select('*').order('created_at', { ascending: false })
    setWorkOrders(wos ?? [])
    if (brs) {
      const map = {}
      brs.forEach(br => { if (!map[br.work_order_id]) map[br.work_order_id] = []; map[br.work_order_id].push(br) })
      setBatchRecords(map)
    }
    setLoading(false)
  }

  async function submitWorkOrder(e) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('work_orders').insert({ ...woForm, planned_qty: Number(woForm.planned_qty), status: 'draft', created_by: user?.email, created_at: new Date().toISOString() })
    setWoForm(EMPTY_WO); setShowWOForm(false); fetchAll()
  }

  async function updateWOStatus(id, status) {
    await supabase.from('work_orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    fetchAll()
  }

  async function submitBatchRecord(e, workOrderId) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('batch_records').insert({ work_order_id: workOrderId, ...brForm, actual_qty: Number(brForm.actual_qty), yield_pct: Number(brForm.yield_pct), created_by: user?.email, created_at: new Date().toISOString() })
    if (brForm.status === 'completed') {
      await supabase.from('work_orders').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', workOrderId)
    }
    setBrForm(EMPTY_BR); setShowBRForm(null); fetchAll()
  }

  const filteredWOs = workOrders.filter(wo => {
    if (tab === 'active') return ['draft', 'in_progress', 'on_hold'].includes(wo.status)
    if (tab === 'completed') return ['completed', 'rejected'].includes(wo.status)
    return true
  })

  const inProgressCount = workOrders.filter(w => w.status === 'in_progress').length
  const completionRate = workOrders.length ? Math.round(workOrders.filter(w => w.status === 'completed').length / workOrders.length * 100) : 0
  const totalQty = workOrders.filter(w => w.status === 'completed').reduce((a, w) => a + (w.planned_qty || 0), 0)

  return (
    <AppLayout>
      <div style={{ padding: '24px 28px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 21, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <ClipboardList size={21} style={{ color: 'var(--moss)' }} /> 작업지시·배치기록서
            </h1>
            <p style={{ color: 'var(--ink-faint)', margin: '3px 0 0', fontSize: 13 }}>ISO 13485 §7.5.1 — 생산 및 서비스 제공 관리</p>
          </div>
          <button onClick={() => setShowWOForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: 'var(--moss)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            <Plus size={14} /> 작업지시 생성
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: '전체 작업지시', value: workOrders.length + '건' },
            { label: '생산 중', value: inProgressCount + '건', highlight: inProgressCount > 0 },
            { label: '완료율', value: completionRate + '%' },
            { label: '완료 생산량', value: totalQty.toLocaleString() + '개' },
          ].map(k => (
            <div key={k.label} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: '14px 18px' }}>
              <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: k.highlight ? 'var(--moss)' : 'var(--ink)' }}>{k.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          {[['active','진행 중'], ['completed','완료·불합격'], ['all','전체']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{ padding: '6px 16px', borderRadius: 6, background: tab === key ? 'var(--moss)' : 'var(--surface)', color: tab === key ? '#fff' : 'var(--ink)', cursor: 'pointer', fontSize: 13, fontWeight: tab === key ? 600 : 400, border: '1px solid', borderColor: tab === key ? 'var(--moss)' : 'var(--line)' }}>
              {label}
            </button>
          ))}
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-faint)' }}>불러오는 중…</div>}

        {!loading && filteredWOs.map(wo => {
          const st = STATUS_COLORS[wo.status] || STATUS_COLORS.draft
          const records = batchRecords[wo.id] || []
          const isExp = expandedWO === wo.id
          return (
            <div key={wo.id} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', cursor: 'pointer' }}
                onClick={() => setExpandedWO(isExp ? null : wo.id)}>
                <span style={{ color: 'var(--ink-faint)' }}>{isExp ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{wo.product_name}</span>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--ink-faint)' }}>LOT: {wo.lot_number}</span>
                    <span style={{ background: st.bg, color: st.text, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>{st.label}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 3 }}>
                    계획 수량: {wo.planned_qty?.toLocaleString()}개 · 계획일: {wo.planned_date} · 배치기록 {records.length}건
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                  {wo.status === 'draft' && (
                    <button onClick={() => updateWOStatus(wo.id, 'in_progress')} style={{ padding: '5px 12px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>생산 시작</button>
                  )}
                  {wo.status === 'in_progress' && (
                    <button onClick={() => setShowBRForm(wo.id)} style={{ padding: '5px 12px', background: 'var(--moss)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>+ 배치기록</button>
                  )}
                </div>
              </div>

              {isExp && (
                <div style={{ borderTop: '1px solid var(--line)', padding: '16px 18px', background: 'var(--bg)' }}>
                  {records.length === 0 ? (
                    <div style={{ color: 'var(--ink-faint)', fontSize: 13, padding: '8px 0' }}>배치기록 없음</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr>
                          {['실적일','실 생산량','수율','담당자','검사원','검사결과','상태','편차사항'].map(h => (
                            <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--ink-faint)', borderBottom: '1px solid var(--line)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {records.map((br, i) => {
                          const brSt = STATUS_COLORS[br.status] || STATUS_COLORS.draft
                          return (
                            <tr key={br.id || i}>
                              <td style={{ padding: '7px 10px' }}>{br.actual_date}</td>
                              <td style={{ padding: '7px 10px' }}>{br.actual_qty?.toLocaleString()}개</td>
                              <td style={{ padding: '7px 10px' }}>{br.yield_pct}%</td>
                              <td style={{ padding: '7px 10px', color: 'var(--ink-faint)' }}>{br.operator}</td>
                              <td style={{ padding: '7px 10px', color: 'var(--ink-faint)' }}>{br.inspector}</td>
                              <td style={{ padding: '7px 10px' }}>
                                <span style={{ color: br.inspection_result === 'pass' ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{br.inspection_result === 'pass' ? '합격' : '불합격'}</span>
                              </td>
                              <td style={{ padding: '7px 10px' }}>
                                <span style={{ background: brSt.bg, color: brSt.text, fontSize: 11, padding: '2px 7px', borderRadius: 99 }}>{brSt.label}</span>
                              </td>
                              <td style={{ padding: '7px 10px', color: 'var(--ink-faint)', fontSize: 12 }}>{br.deviations || '-'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}

                  {showBRForm === wo.id && (
                    <form onSubmit={e => submitBatchRecord(e, wo.id)} style={{ marginTop: 16, padding: 16, background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--line)' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>배치기록 입력</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 10 }}>
                        {[
                          { key: 'actual_date', label: '실적일', type: 'date' },
                          { key: 'actual_qty', label: '실 생산량', type: 'number', placeholder: '개' },
                          { key: 'yield_pct', label: '수율 (%)', type: 'number', placeholder: '0-100' },
                          { key: 'operator', label: '담당자', type: 'text' },
                          { key: 'inspector', label: '검사원', type: 'text' },
                        ].map(f => (
                          <div key={f.key}>
                            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-faint)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                            <input type={f.type} required placeholder={f.placeholder} value={brForm[f.key] || ''} onChange={e => setBrForm(p => ({ ...p, [f.key]: e.target.value }))}
                              style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--line)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
                          </div>
                        ))}
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-faint)', display: 'block', marginBottom: 4 }}>검사결과</label>
                          <select value={brForm.inspection_result} onChange={e => setBrForm(p => ({ ...p, inspection_result: e.target.value }))} style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--line)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}>
                            <option value="pass">합격</option><option value="fail">불합격</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-faint)', display: 'block', marginBottom: 4 }}>상태</label>
                          <select value={brForm.status} onChange={e => setBrForm(p => ({ ...p, status: e.target.value }))} style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--line)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}>
                            <option value="in_progress">생산 중</option><option value="completed">완료</option><option value="on_hold">보류</option>
                          </select>
                        </div>
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-faint)', display: 'block', marginBottom: 4 }}>편차사항 (이상 발생 시)</label>
                        <textarea rows={2} value={brForm.deviations} onChange={e => setBrForm(p => ({ ...p, deviations: e.target.value }))} style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--line)', borderRadius: 6, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="submit" style={{ padding: '7px 18px', background: 'var(--moss)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>저장</button>
                        <button type="button" onClick={() => setShowBRForm(null)} style={{ padding: '7px 14px', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>취소</button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {!loading && filteredWOs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--ink-faint)', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--line)' }}>
            <ClipboardList size={36} strokeWidth={1} style={{ opacity: .3, marginBottom: 12 }} />
            <div style={{ fontSize: 14 }}>작업지시가 없습니다</div>
          </div>
        )}

        {showWOForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 28, width: 480, maxWidth: '90vw' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>작업지시 생성</h3>
              <form onSubmit={submitWorkOrder}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  {[
                    { key: 'product_name', label: '제품명', type: 'text', placeholder: '예: 혈당측정기 HG-100' },
                    { key: 'lot_number', label: 'LOT 번호', type: 'text', placeholder: '예: 2026-09-001' },
                    { key: 'planned_qty', label: '계획 수량 (개)', type: 'number', placeholder: '500' },
                    { key: 'planned_date', label: '계획 완료일', type: 'date' },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-faint)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                      <input type={f.type} required placeholder={f.placeholder} value={woForm[f.key] || ''} onChange={e => setWoForm(p => ({ ...p, [f.key]: e.target.value }))} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-faint)', display: 'block', marginBottom: 4 }}>비고</label>
                  <textarea rows={2} value={woForm.notes} onChange={e => setWoForm(p => ({ ...p, notes: e.target.value }))} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 6, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowWOForm(false)} style={{ padding: '8px 18px', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>취소</button>
                  <button type="submit" style={{ padding: '8px 20px', background: 'var(--moss)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>생성</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
