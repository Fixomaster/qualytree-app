// src/pages/quality-policy/QualityPolicyHub.jsx
// ISO 13485 §5.1 경영의지 / §5.3 품질방침 — 경영자 서명 + 검토 이력 추가
import React, { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Edit2, Save, X, Award, Target, ShieldCheck, PenTool, History } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'
import { QualityObjectivesPanel } from '../quality-objectives/QualityObjectivesHub'

const LS_KEY_POLICY = 'qualytree.quality_policy'
const LS_KEY_SIGS = 'qualytree.qp_signatures'
const LS_KEY_HISTORY = 'qualytree.qp_review_history'

const DEFAULT_POLICY = { statement: '', revision: '', effectiveDate: '' }

const TABS = [
  { key: 'policy', label: '품질방침', icon: Award },
  { key: 'objectives', label: '품질목표', icon: Target },
  { key: 'signature', label: '경영자 서명', icon: PenTool },
  { key: 'history', label: '검토 이력', icon: History },
]

export default function QualityPolicyHub() {
  const user = auth.current()
  const canEdit = user?.level >= 2
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = TABS.some(t => t.key === searchParams.get('tab')) ? searchParams.get('tab') : 'policy'
  const [tab, setTab] = useState(initialTab)
  function changeTab(key) { setTab(key); setSearchParams({ tab: key }) }

  const [policy, setPolicy] = useState(() => {
    try { return { ...DEFAULT_POLICY, ...JSON.parse(localStorage.getItem(LS_KEY_POLICY) || '{}') } } catch { return DEFAULT_POLICY }
  })
  const [draft, setDraft] = useState(null)
  const [editing, setEditing] = useState(false)

  const [signatures, setSignatures] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY_SIGS) || '[]') } catch { return [] }
  })
  const [newSig, setNewSig] = useState({ name: '', position: '', date: new Date().toISOString().slice(0,10), comment: '' })

  const [reviewHistory, setReviewHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY_HISTORY) || '[]') } catch { return [] }
  })
  const [newReview, setNewReview] = useState({ date: new Date().toISOString().slice(0,10), reviewer: '', result: '', action: '' })

  function savePolicy() {
    const updated = { ...policy, ...draft }
    setPolicy(updated); localStorage.setItem(LS_KEY_POLICY, JSON.stringify(updated))
    setEditing(false); setDraft(null)
  }
  function startEdit() { setDraft({ ...policy }); setEditing(true) }
  function cancelEdit() { setEditing(false); setDraft(null) }

  function addSignature() {
    if (!newSig.name || !newSig.date) return
    const updated = [...signatures, { ...newSig, id: Date.now() }]
    setSignatures(updated); localStorage.setItem(LS_KEY_SIGS, JSON.stringify(updated))
    setNewSig({ name: '', position: '', date: new Date().toISOString().slice(0,10), comment: '' })
  }
  function removeSig(id) {
    const updated = signatures.filter(s => s.id !== id)
    setSignatures(updated); localStorage.setItem(LS_KEY_SIGS, JSON.stringify(updated))
  }

  function addReview() {
    if (!newReview.reviewer || !newReview.date) return
    const updated = [...reviewHistory, { ...newReview, id: Date.now() }]
    setReviewHistory(updated); localStorage.setItem(LS_KEY_HISTORY, JSON.stringify(updated))
    setNewReview({ date: new Date().toISOString().slice(0,10), reviewer: '', result: '', action: '' })
  }
  function removeReview(id) {
    const updated = reviewHistory.filter(r => r.id !== id)
    setReviewHistory(updated); localStorage.setItem(LS_KEY_HISTORY, JSON.stringify(updated))
  }

  const inputStyle = { background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)', borderRadius: 12, padding: '6px 12px', fontSize: 13, width: '100%', boxSizing: 'border-box' }
  const btnPrimary = { background: 'var(--moss)', color: '#fff', border: 'none', borderRadius: 12, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }
  const btnSoft = { background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', borderRadius: 12, padding: '8px 16px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }

  return (
    <AppLayout>
      <HubBanner title="경영의지 · 품질방침" subtitle="ISO 13485 §5.1 / §5.3 — 품질방침 선언, 경영자 서명 및 검토 이력 관리" icon="🏆" />
      <div className="px-6 lg:px-8 py-6 max-w-[1400px] mx-auto">

        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-soft)' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => changeTab(t.key)}
              className="px-4 py-1.5 rounded-lg text-[13px] font-semibold transition flex items-center gap-1.5"
              style={{ background: tab === t.key ? 'var(--bg-card)' : 'transparent', color: tab === t.key ? 'var(--moss)' : 'var(--ink-soft)', boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,.08)' : 'none', border: 'none', cursor: 'pointer' }}>
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'policy' && (
          <div className="max-w-[900px]">
            <div className="flex justify-end mb-4">
              {canEdit && !editing && (
                <button onClick={startEdit} style={btnPrimary}><Edit2 size={13} /> 편집</button>
              )}
              {editing && (
                <div className="flex gap-2">
                  <button onClick={savePolicy} style={btnPrimary}><Save size={13} /> 저장</button>
                  <button onClick={cancelEdit} style={btnSoft}><X size={13} /> 취소</button>
                </div>
              )}
            </div>
            <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid #2563EB30' }}>
              <div className="flex items-center gap-2 mb-4">
                <span style={{ color: '#2563EB' }}><Award size={15} /></span>
                <span className="font-bold text-[14px]" style={{ color: '#2563EB' }}>품질방침 선언문</span>
              </div>
              {editing ? (
                <textarea value={draft.statement || ''} onChange={e => setDraft(d => ({ ...d, statement: e.target.value }))}
                  rows={6} placeholder="품질방침을 입력하세요"
                  style={{ ...inputStyle, resize: 'none' }} />
              ) : (
                policy.statement
                  ? <p className="text-[13.5px] whitespace-pre-line" style={{ color: 'var(--ink)' }}>{policy.statement}</p>
                  : <p className="text-[13px] italic" style={{ color: 'var(--ink-soft)' }}>품질방침을 입력하세요.</p>
              )}
            </div>
            {editing && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>개정번호</label>
                  <input value={draft.revision || ''} onChange={e => setDraft(d => ({ ...d, revision: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>시행일</label>
                  <input type="date" value={draft.effectiveDate || ''} onChange={e => setDraft(d => ({ ...d, effectiveDate: e.target.value }))} style={inputStyle} />
                </div>
              </div>
            )}
            <div className="mt-4 p-4 rounded-2xl text-[12.5px]" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF' }}>
              ISO 13485 §5.3: 최고경영자는 품질방침이 조직의 목적에 적합하고, QMS 요구사항 준수 및 효과성 유지 의지를 포함하며, 측정가능한 품질목표 수립의 틀을 제공하고, 전달·이해되며 주기적으로 검토됨을 보장해야 합니다.
            </div>
          </div>
        )}

        {tab === 'objectives' && <QualityObjectivesPanel />}

        {tab === 'signature' && (
          <div className="max-w-[900px]">
            <div className="p-4 rounded-2xl text-[12.5px] mb-5" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534' }}>
              ISO 13485 §5.1: 최고경영자는 QMS의 개발·실행·효과성 유지에 대한 의지의 증거를 제공해야 합니다. 경영자 전자서명은 이 의지의 공식 기록입니다.
            </div>
            {canEdit && (
              <div className="p-4 rounded-2xl mb-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                <h3 className="font-bold text-[13px] mb-3">서명 추가</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div><label className="block text-[12px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>성명 *</label><input value={newSig.name} onChange={e => setNewSig(s => ({ ...s, name: e.target.value }))} placeholder="홍길동" style={inputStyle} /></div>
                  <div><label className="block text-[12px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>직위</label><input value={newSig.position} onChange={e => setNewSig(s => ({ ...s, position: e.target.value }))} placeholder="대표이사" style={inputStyle} /></div>
                  <div><label className="block text-[12px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>서명일 *</label><input type="date" value={newSig.date} onChange={e => setNewSig(s => ({ ...s, date: e.target.value }))} style={inputStyle} /></div>
                  <div><label className="block text-[12px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>비고</label><input value={newSig.comment} onChange={e => setNewSig(s => ({ ...s, comment: e.target.value }))} placeholder="최초 서명" style={inputStyle} /></div>
                </div>
                <button onClick={addSignature} style={btnPrimary}><PenTool size={13} /> 서명 등록</button>
              </div>
            )}
            {signatures.length === 0 ? (
              <p className="text-center py-8 text-[13px]" style={{ color: 'var(--ink-soft)' }}>등록된 서명이 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {signatures.map(s => (
                  <div key={s.id} className="p-4 rounded-2xl flex justify-between items-start" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <ShieldCheck size={14} color="#16a34a" />
                        <span className="font-bold text-[13px]">{s.name}</span>
                        {s.position && <span className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>({s.position})</span>}
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: '#DCFCE7', color: '#166534' }}>서명 완료</span>
                      </div>
                      <div className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>서명일: {s.date}{s.comment ? ' · ' + s.comment : ''}</div>
                    </div>
                    {canEdit && <button onClick={() => removeSig(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}><X size={14} /></button>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="max-w-[900px]">
            <div className="p-4 rounded-2xl text-[12.5px] mb-5" style={{ background: '#FEF3C7', border: '1px solid #FDE68A', color: '#92400E' }}>
              ISO 13485 §5.3: 품질방침은 지속적 적절성을 위해 주기적으로 검토되어야 합니다. 검토 이력을 기록하세요.
            </div>
            {canEdit && (
              <div className="p-4 rounded-2xl mb-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                <h3 className="font-bold text-[13px] mb-3">검토 이력 추가</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div><label className="block text-[12px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>검토일 *</label><input type="date" value={newReview.date} onChange={e => setNewReview(r => ({ ...r, date: e.target.value }))} style={inputStyle} /></div>
                  <div><label className="block text-[12px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>검토자 *</label><input value={newReview.reviewer} onChange={e => setNewReview(r => ({ ...r, reviewer: e.target.value }))} placeholder="홍길동 대표이사" style={inputStyle} /></div>
                  <div><label className="block text-[12px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>검토 결과</label>
                    <select value={newReview.result} onChange={e => setNewReview(r => ({ ...r, result: e.target.value }))} style={inputStyle}>
                      <option value="">선택</option>
                      <option value="적절">적절 (유지)</option>
                      <option value="보완필요">보완 필요</option>
                      <option value="개정">개정 필요</option>
                    </select>
                  </div>
                  <div><label className="block text-[12px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>후속 조치</label><input value={newReview.action} onChange={e => setNewReview(r => ({ ...r, action: e.target.value }))} placeholder="현행 유지 또는 개정 내용" style={inputStyle} /></div>
                </div>
                <button onClick={addReview} style={btnPrimary}><History size={13} /> 이력 등록</button>
              </div>
            )}
            {reviewHistory.length === 0 ? (
              <p className="text-center py-8 text-[13px]" style={{ color: 'var(--ink-soft)' }}>검토 이력이 없습니다.</p>
            ) : (
              <table className="w-full text-[12.5px] border-collapse">
                <thead>
                  <tr style={{ background: 'var(--bg-soft)' }}>
                    {['검토일','검토자','결과','후속 조치',''].map(h => <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--ink-soft)', borderBottom: '1px solid var(--line)' }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {reviewHistory.map(rv => (
                    <tr key={rv.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td className="px-3 py-2">{rv.date}</td>
                      <td className="px-3 py-2">{rv.reviewer}</td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                          style={{ background: rv.result === '적절' ? '#DCFCE7' : rv.result === '보완필요' ? '#FEF3C7' : '#FEE2E2', color: rv.result === '적절' ? '#166534' : rv.result === '보완필요' ? '#92400E' : '#991B1B' }}>
                          {rv.result || '-'}
                        </span>
                      </td>
                      <td className="px-3 py-2">{rv.action || '-'}</td>
                      <td className="px-3 py-2 text-right">{canEdit && <button onClick={() => removeReview(rv.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}><X size={12} /></button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>
    </AppLayout>
  )
}
