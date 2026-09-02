import React, { useState, useEffect, useCallback } from 'react'
import { Share2, Plus, Pencil, Trash2, X, AlertTriangle } from 'lucide-react'

const ACCENT = '#D97706'
const ACCENT_SOFT = '#FFFBEB'
const KEY = 'qualytree.oem_partial'

const TABS = ['개요', '공정 위탁현황', '계약서', '품질 협약', '감사 일정']
const PROCESS_TYPES = ['가공', '조립', '검사', '포장', '멸균', '기타']
const STATUS_OPTS = ['진행중', '완료', '계획중', '일시중단']
const CONTRACT_STATUS = ['유효', '만료', '갱신중', '해지']
const AUDIT_RESULTS = ['적합', '부적합', '조건부 적합', '미실시']

const SectionBox = ({ title, children, action }) => (
  <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111827' }}>{title}</h3>
      {action}
    </div>
    {children}
  </div>
)

const StatusBadge = ({ val, map }) => {
  const cfg = map?.[val] ?? { color: '#6b7280', bg: '#f3f4f6' }
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg }}>{val || '—'}</span>
  )
}

const Field = ({ label, value, type = 'text', onChange, required, options }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
      {label}{required && <span style={{ color: ACCENT }}> *</span>}
    </label>
    {type === 'select' ? (
      <select value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, background: '#fff' }}>
        <option value="">선택</option>
        {options?.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    ) : type === 'textarea' ? (
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
    ) : (
      <input type={type} value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
    )}
  </div>
)

const Modal = ({ title, onClose, children }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
    <div style={{ background: '#fff', borderRadius: 16, padding: '28px 28px 20px', width: '100%', maxWidth: 520, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#6b7280' }}><X size={20} /></button>
      </div>
      {children}
    </div>
  </div>
)

const ModalFooter = ({ onCancel, onSave }) => (
  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
    <button onClick={onCancel} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 13 }}>취소</button>
    <button onClick={onSave} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>저장</button>
  </div>
)

const Btn = ({ onClick, children, size = 'md' }) => (
  <button onClick={onClick} style={{ background: ACCENT, color: '#fff', border: 'none', padding: size === 'sm' ? '5px 12px' : '8px 16px', fontSize: size === 'sm' ? 12 : 13, borderRadius: 8, cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
    {children}
  </button>
)

const IconBtn = ({ onClick, icon: Icon, color = '#ef4444' }) => (
  <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', color, padding: 4, borderRadius: 6 }}><Icon size={14} /></button>
)

const Empty = ({ msg }) => (
  <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 14 }}>{msg || '데이터가 없습니다.'}</div>
)

const PROC_STATUS_MAP = {
  '진행중': { color: '#059669', bg: '#d1fae5' },
  '완료': { color: '#1d4ed8', bg: '#dbeafe' },
  '계획중': { color: '#d97706', bg: '#fef3c7' },
  '일시중단': { color: '#6b7280', bg: '#f3f4f6' },
}
const CONTRACT_STATUS_MAP = {
  '유효': { color: '#059669', bg: '#d1fae5' },
  '만료': { color: '#ef4444', bg: '#fee2e2' },
  '갱신중': { color: '#d97706', bg: '#fef3c7' },
  '해지': { color: '#6b7280', bg: '#f3f4f6' },
}
const AUDIT_MAP = {
  '적합': { color: '#059669', bg: '#d1fae5' },
  '부적합': { color: '#ef4444', bg: '#fee2e2' },
  '조건부 적합': { color: '#d97706', bg: '#fef3c7' },
  '미실시': { color: '#6b7280', bg: '#f3f4f6' },
}

let _uid = 1
const uid = () => Date.now() + '_' + (_uid++)

export default function OemPartialHub() {
  const [tab, setTab] = useState(0)
  const [data, setData] = useState({ processes: [], contracts: [], qualityAgreements: [], audits: [] })
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})

  useEffect(() => {
    try { const s = localStorage.getItem(KEY); if (s) setData(JSON.parse(s)) } catch {}
  }, [])

  const save = useCallback(d => {
    setData(d)
    try { localStorage.setItem(KEY, JSON.stringify(d)) } catch {}
  }, [])

  const setF = k => v => setForm(f => ({ ...f, [k]: v }))

  const openProcessModal = item => {
    setForm(item ? { ...item } : { name: '', contractor: '', scope: '', ratio: '', type: '', startDate: '', status: '진행중', note: '' })
    setModal({ type: 'process', item })
  }
  const saveProcess = () => {
    if (!form.name || !form.contractor) { alert('공정명과 위탁사는 필수입니다.'); return }
    const entry = { ...form, id: form.id || uid() }
    const list = data.processes.filter(p => p.id !== entry.id)
    save({ ...data, processes: modal.item ? [...list, entry] : [...data.processes, entry] })
    setModal(null)
  }
  const delProcess = id => {
    if (!confirm('삭제하시겠습니까?')) return
    save({ ...data, processes: data.processes.filter(p => p.id !== id) })
  }

  const openContractModal = item => {
    setForm(item ? { ...item } : { processRef: '', contractor: '', docNo: '', signedDate: '', expiryDate: '', status: '유효', note: '' })
    setModal({ type: 'contract', item })
  }
  const saveContract = () => {
    if (!form.contractor || !form.docNo) { alert('위탁사와 문서번호는 필수입니다.'); return }
    const entry = { ...form, id: form.id || uid() }
    const list = data.contracts.filter(c => c.id !== entry.id)
    save({ ...data, contracts: modal.item ? [...list, entry] : [...data.contracts, entry] })
    setModal(null)
  }
  const delContract = id => {
    if (!confirm('삭제하시겠습니까?')) return
    save({ ...data, contracts: data.contracts.filter(c => c.id !== id) })
  }
  const openQaModal = item => {
    setForm(item ? { ...item } : { processRef: '', contractor: '', docNo: '', version: '1.0', approvedDate: '', status: '유효', note: '' })
    setModal({ type: 'qa', item })
  }
  const saveQa = () => {
    if (!form.contractor || !form.docNo) { alert('위탁사와 문서번호는 필수입니다.'); return }
    const entry = { ...form, id: form.id || uid() }
    const list = data.qualityAgreements.filter(q => q.id !== entry.id)
    save({ ...data, qualityAgreements: modal.item ? [...list, entry] : [...data.qualityAgreements, entry] })
    setModal(null)
  }
  const delQa = id => {
    if (!confirm('삭제하시겠습니까?')) return
