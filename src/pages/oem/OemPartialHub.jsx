import React, { useState, useEffect } from 'react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import { Share2, Plus, Pencil, Trash2, X, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'

const ACCENT = '#D97706'
const ACCENT_SOFT = '#FFFBEB'
const LS_KEY = 'qualytree.oem_partial'

const PROC_STATUS_MAP = {
  active: { label: '진행', color: '#2563EB', bg: '#EFF6FF' },
  suspended: { label: '일시중단', color: '#D97706', bg: '#FFFBEB' },
  ended: { label: '종료', color: '#6B7280', bg: '#F3F4F6' },
}
const CONTRACT_STATUS_MAP = {
  valid: { label: '유효', color: '#16A34A', bg: '#F0FDF4' },
  expiring: { label: '만료임박', color: '#D97706', bg: '#FFFBEB' },
  expired: { label: '만료', color: '#DC2626', bg: '#FEF2F2' },
}
const AUDIT_MAP = {
  scheduled: { label: '예정', color: '#2563EB', bg: '#EFF6FF' },
  done: { label: '완료', color: '#16A34A', bg: '#F0FDF4' },
  overdue: { label: '지연', color: '#DC2626', bg: '#FEF2F2' },
}

function load() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {} } catch { return {} }
}
function save(d) { localStorage.setItem(LS_KEY, JSON.stringify(d)) }

function StatusBadge({ map, val }) {
  const m = map[val] || { label: val, color: '#6B7280', bg: '#F3F4F6' }
  return <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, color: m.color, background: m.bg, fontWeight: 600 }}>{m.label}</span>
}
function Field({ label, children }) {
  return (
    <AppLayout user={user} title="OEM 일부위탁">
      <div style={{ marginBottom: 14 }}><label style={{ display: 'block', fontSize: 12, color: '#6B7280', marginBottom: 4 }}>{label}</label>{children}</div>
    </AppLayout>
  )
}
function Btn({ onClick, children, variant = 'primary' }) {
  const styles = {
    primary: { background: ACCENT, color: '#fff', border: 'none' },
    ghost: { background: 'transparent', color: ACCENT, border: '1px solid ' + ACCENT },
  }
  return <button onClick={onClick} style={{ ...styles[variant], padding: '8px 18px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>{children}</button>
}
function IconBtn({ onClick, children, danger }) {
  return <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', color: danger ? '#DC2626' : '#6B7280', padding: '4px 6px' }}>{children}</button>
}
function Empty({ label }) {
  return <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF', fontSize: 14 }}>{label}</div>
}
function SectionBox({ title, children, action }) {
  return <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '20px', marginBottom: 16 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <span style={{ fontWeight: 700, fontSize: 15 }}>{title}</span>
      {action}
    </div>
    {children}
  </div>
}

function Modal({ title, onClose, onSave, children }) {
  return <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 480, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <span style={{ fontWeight: 700, fontSize: 16 }}>{title}</span>
        <IconBtn onClick={onClose}><X size={18} /></IconBtn>
      </div>
      {children}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
        <Btn variant="ghost" onClick={onClose}>취소</Btn>
        <Btn onClick={onSave}>저장</Btn>
      </div>
    </div>
  </div>
}

const PROC_EMPTY = { name: '', contractor: '', scope: '', ratio: '', type: '', startDate: '', status: 'active', note: '' }

function ProcessTab({ data, onChange }) {
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(PROC_EMPTY)
  const procs = data.processes || []

  function openAdd() { setForm(PROC_EMPTY); setModal('add') }
  function openEdit(p) { setForm(p); setModal('edit') }
  function save() {
    const id = form.id || Date.now().toString()
    const item = { ...form, id }
    const next = modal === 'add' ? [...procs, item] : procs.map(p => p.id === item.id ? item : p)
    onChange({ ...data, processes: next })
    setModal(null)
  }
  function del(id) { if (confirm('삭제하시겠습니까?')) onChange({ ...data, processes: procs.filter(p => p.id !== id) }) }
  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  return <SectionBox title="공정 위탁현황" action={<Btn onClick={openAdd}><Plus size={14} /> 추가</Btn>}>
    {procs.length === 0 ? <Empty label="등록된 위탁 공정이 없습니다" /> :
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ borderBottom: '2px solid #E5E7EB' }}>
          {['공정명', '위탁업체', '위탁범위', '비율(%)', '유형', '시작일', '상태', ''].map(h =>
            <th key={h} style={{ padding: '8px 6px', textAlign: 'left', color: '#6B7280', fontWeight: 600 }}>{h}</th>)}
        </tr></thead>
        <tbody>{procs.map(p => <tr key={p.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
          <td style={{ padding: '8px 6px' }}>{p.name}</td>
          <td style={{ padding: '8px 6px' }}>{p.contractor}</td>
          <td style={{ padding: '8px 6px' }}>{p.scope}</td>
          <td style={{ padding: '8px 6px' }}>{p.ratio}</td>
          <td style={{ padding: '8px 6px' }}>{p.type}</td>
          <td style={{ padding: '8px 6px' }}>{p.startDate}</td>
          <td style={{ padding: '8px 6px' }}><StatusBadge map={PROC_STATUS_MAP} val={p.status} /></td>
          <td style={{ padding: '8px 6px', display: 'flex', gap: 4 }}>
            <IconBtn onClick={() => openEdit(p)}><Pencil size={14} /></IconBtn>
            <IconBtn onClick={() => del(p.id)} danger><Trash2 size={14} /></IconBtn>
          </td>
        </tr>)}</tbody>
      </table>
    }
    {modal && <Modal title={modal === 'add' ? '공정 추가' : '공정 수정'} onClose={() => setModal(null)} onSave={save}>
      <Field label="공정명"><input value={form.name} onChange={e => f('name', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="위탁업체"><input value={form.contractor} onChange={e => f('contractor', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="위탁범위"><input value={form.scope} onChange={e => f('scope', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="위탁비율(%)"><input type="number" value={form.ratio} onChange={e => f('ratio', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="위탁유형"><input value={form.type} onChange={e => f('type', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="시작일"><input type="date" value={form.startDate} onChange={e => f('startDate', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="상태"><select value={form.status} onChange={e => f('status', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }}>
        <option value="active">진행</option><option value="suspended">일시중단</option><option value="ended">종료</option>
      </select></Field>
      <Field label="비고"><textarea value={form.note} onChange={e => f('note', e.target.value)} rows={3} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
    </Modal>}
  </SectionBox>
}

const CONTRACT_EMPTY = { name: '', contractor: '', startDate: '', endDate: '', status: 'valid', note: '' }

function ContractTab({ data, onChange }) {
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(CONTRACT_EMPTY)
  const contracts = data.contracts || []
  const today = new Date()

  function getStatus(endDate) {
    if (!endDate) return 'valid'
    const end = new Date(endDate)
    const diff = (end - today) / (1000 * 60 * 60 * 24)
    if (diff < 0) return 'expired'
    if (diff < 90) return 'expiring'
    return 'valid'
  }

  function openAdd() { setForm(CONTRACT_EMPTY); setModal('add') }
  function openEdit(c) { setForm(c); setModal('edit') }
  function save() {
    const id = form.id || Date.now().toString()
    const item = { ...form, id, status: getStatus(form.endDate) }
    const next = modal === 'add' ? [...contracts, item] : contracts.map(c => c.id === item.id ? item : c)
    onChange({ ...data, contracts: next })
    setModal(null)
  }
  function del(id) { if (confirm('삭제하시겠습니까?')) onChange({ ...data, contracts: contracts.filter(c => c.id !== id) }) }
  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  return <SectionBox title="계약서 관리" action={<Btn onClick={openAdd}><Plus size={14} /> 추가</Btn>}>
    {contracts.length === 0 ? <Empty label="등록된 계약서가 없습니다" /> :
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ borderBottom: '2px solid #E5E7EB' }}>
          {['계약명', '위탁업체', '시작일', '종료일', '상태', '비고', ''].map(h =>
            <th key={h} style={{ padding: '8px 6px', textAlign: 'left', color: '#6B7280', fontWeight: 600 }}>{h}</th>)}
        </tr></thead>
        <tbody>{contracts.map(c => <tr key={c.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
          <td style={{ padding: '8px 6px' }}>{c.name}</td>
          <td style={{ padding: '8px 6px' }}>{c.contractor}</td>
          <td style={{ padding: '8px 6px' }}>{c.startDate}</td>
          <td style={{ padding: '8px 6px' }}>{c.endDate}</td>
          <td style={{ padding: '8px 6px' }}><StatusBadge map={CONTRACT_STATUS_MAP} val={c.status} /></td>
          <td style={{ padding: '8px 6px' }}>{c.note}</td>
          <td style={{ padding: '8px 6px', display: 'flex', gap: 4 }}>
            <IconBtn onClick={() => openEdit(c)}><Pencil size={14} /></IconBtn>
            <IconBtn onClick={() => del(c.id)} danger><Trash2 size={14} /></IconBtn>
          </td>
        </tr>)}</tbody>
      </table>
    }
    {modal && <Modal title={modal === 'add' ? '계약 추가' : '계약 수정'} onClose={() => setModal(null)} onSave={save}>
      <Field label="계약명"><input value={form.name} onChange={e => f('name', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="위탁업체"><input value={form.contractor} onChange={e => f('contractor', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="시작일"><input type="date" value={form.startDate} onChange={e => f('startDate', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="종료일"><input type="date" value={form.endDate} onChange={e => f('endDate', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="비고"><textarea value={form.note} onChange={e => f('note', e.target.value)} rows={3} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
    </Modal>}
  </SectionBox>
}

const AUDIT_EMPTY = { title: '', contractor: '', date: '', status: 'scheduled', findings: '', note: '' }

function AuditTab({ data, onChange }) {
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(AUDIT_EMPTY)
  const audits = data.audits || []
  const today = new Date()

  function getAuditStatus(a) {
    if (a.status === 'done') return 'done'
    if (a.date && new Date(a.date) < today) return 'overdue'
    return 'scheduled'
  }

  function openAdd() { setForm(AUDIT_EMPTY); setModal('add') }
  function openEdit(a) { setForm(a); setModal('edit') }
  function save() {
    const id = form.id || Date.now().toString()
    const item = { ...form, id }
    const next = modal === 'add' ? [...audits, item] : audits.map(a => a.id === item.id ? item : a)
    onChange({ ...data, audits: next })
    setModal(null)
  }
  function del(id) { if (confirm('삭제하시겠습니까?')) onChange({ ...data, audits: audits.filter(a => a.id !== id) }) }
  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  return <SectionBox title="감사 일정" action={<Btn onClick={openAdd}><Plus size={14} /> 추가</Btn>}>
    {audits.length === 0 ? <Empty label="등록된 감사 일정이 없습니다" /> :
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ borderBottom: '2px solid #E5E7EB' }}>
          {['감사명', '위탁업체', '감사일', '상태', '주요발견', ''].map(h =>
            <th key={h} style={{ padding: '8px 6px', textAlign: 'left', color: '#6B7280', fontWeight: 600 }}>{h}</th>)}
        </tr></thead>
        <tbody>{audits.map(a => { const st = getAuditStatus(a); return <tr key={a.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
          <td style={{ padding: '8px 6px' }}>{a.title}</td>
          <td style={{ padding: '8px 6px' }}>{a.contractor}</td>
          <td style={{ padding: '8px 6px' }}>{a.date}</td>
          <td style={{ padding: '8px 6px' }}><StatusBadge map={AUDIT_MAP} val={st} /></td>
          <td style={{ padding: '8px 6px' }}>{a.findings}</td>
          <td style={{ padding: '8px 6px', display: 'flex', gap: 4 }}>
            <IconBtn onClick={() => openEdit(a)}><Pencil size={14} /></IconBtn>
            <IconBtn onClick={() => del(a.id)} danger><Trash2 size={14} /></IconBtn>
          </td>
        </tr>})}</tbody>
      </table>
    }
    {modal && <Modal title={modal === 'add' ? '감사 추가' : '감사 수정'} onClose={() => setModal(null)} onSave={save}>
      <Field label="감사명"><input value={form.title} onChange={e => f('title', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="위탁업체"><input value={form.contractor} onChange={e => f('contractor', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="감사일"><input type="date" value={form.date} onChange={e => f('date', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="상태"><select value={form.status} onChange={e => f('status', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }}>
        <option value="scheduled">예정</option><option value="done">완료</option>
      </select></Field>
      <Field label="주요발견사항"><textarea value={form.findings} onChange={e => f('findings', e.target.value)} rows={3} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
    </Modal>}
  </SectionBox>
}

const QA_EMPTY = { title: '', contractor: '', signDate: '', scope: '', status: 'valid', note: '' }

function QualityAgreementTab({ data, onChange }) {
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(QA_EMPTY)
  const qas = data.qualityAgreements || []

  function openAdd() { setForm(QA_EMPTY); setModal('add') }
  function openEdit(q) { setForm(q); setModal('edit') }
  function save() {
    const id = form.id || Date.now().toString()
    const item = { ...form, id }
    const next = modal === 'add' ? [...qas, item] : qas.map(q => q.id === item.id ? item : q)
    onChange({ ...data, qualityAgreements: next })
    setModal(null)
  }
  function del(id) { if (confirm('삭제하시겠습니까?')) onChange({ ...data, qualityAgreements: qas.filter(q => q.id !== id) }) }
  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  return <SectionBox title="품질 협약" action={<Btn onClick={openAdd}><Plus size={14} /> 추가</Btn>}>
    {qas.length === 0 ? <Empty label="등록된 품질 협약이 없습니다" /> :
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ borderBottom: '2px solid #E5E7EB' }}>
          {['협약명', '위탁업체', '체결일', '협약범위', '상태', ''].map(h =>
            <th key={h} style={{ padding: '8px 6px', textAlign: 'left', color: '#6B7280', fontWeight: 600 }}>{h}</th>)}
        </tr></thead>
        <tbody>{qas.map(q => <tr key={q.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
          <td style={{ padding: '8px 6px' }}>{q.title}</td>
          <td style={{ padding: '8px 6px' }}>{q.contractor}</td>
          <td style={{ padding: '8px 6px' }}>{q.signDate}</td>
          <td style={{ padding: '8px 6px' }}>{q.scope}</td>
          <td style={{ padding: '8px 6px' }}><StatusBadge map={CONTRACT_STATUS_MAP} val={q.status} /></td>
          <td style={{ padding: '8px 6px', display: 'flex', gap: 4 }}>
            <IconBtn onClick={() => openEdit(q)}><Pencil size={14} /></IconBtn>
            <IconBtn onClick={() => del(q.id)} danger><Trash2 size={14} /></IconBtn>
          </td>
        </tr>)}</tbody>
      </table>
    }
    {modal && <Modal title={modal === 'add' ? '협약 추가' : '협약 수정'} onClose={() => setModal(null)} onSave={save}>
      <Field label="협약명"><input value={form.title} onChange={e => f('title', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="위탁업체"><input value={form.contractor} onChange={e => f('contractor', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="체결일"><input type="date" value={form.signDate} onChange={e => f('signDate', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="협약범위"><textarea value={form.scope} onChange={e => f('scope', e.target.value)} rows={3} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="상태"><select value={form.status} onChange={e => f('status', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }}>
        <option value="valid">유효</option><option value="expiring">만료임박</option><option value="expired">만료</option>
      </select></Field>
    </Modal>}
  </SectionBox>
}

const TABS = ['개요', '공정 위탁현황', '계약서', '품질 협약', '감사 일정']

export default function OemPartialHub() {
  const user = auth.current()
  const [tab, setTab] = useState(0)
  const [data, setData] = useState(() => load())

  function handleChange(next) { setData(next); save(next) }

  const procs = data.processes || []
  const contracts = data.contracts || []
  const expiringContracts = contracts.filter(c => c.status === 'expiring' || c.status === 'expired')
  const audits = data.audits || []

  return <div style={{ padding: '28px 32px', fontFamily: 'inherit' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
      <Share2 size={24} color={ACCENT} />
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>OEM 일부공정위탁 관리</h1>
        <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>일부공정 위탁 계약, 품질협약 및 감사 현황 관리</p>
      </div>
    </div>

    {expiringContracts.length > 0 && <div style={{ background: '#FFFBEB', border: '1px solid #F59E0B', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
      <AlertTriangle size={16} color="#D97706" />
      <span style={{ fontSize: 13, color: '#92400E' }}>만료임박·만료 계약 {expiringContracts.length}건 — 계약 갱신을 검토하세요</span>
    </div>}

    <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #E5E7EB', marginBottom: 24 }}>
      {TABS.map((t, i) => <button key={t} onClick={() => setTab(i)} style={{ padding: '8px 18px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === i ? 700 : 500, color: tab === i ? ACCENT : '#6B7280', borderBottom: tab === i ? '2px solid ' + ACCENT : '2px solid transparent', marginBottom: -2 }}>{t}</button>)}
    </div>

    {tab === 0 && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16 }}>
      {[
        { label: '위탁 공정 수', value: procs.length, color: ACCENT },
        { label: '활성 공정', value: procs.filter(p => p.status === 'active').length, color: '#16A34A' },
        { label: '계약서 수', value: contracts.length, color: '#2563EB' },
        { label: '만료임박 계약', value: expiringContracts.length, color: '#DC2626' },
        { label: '감사 일정', value: audits.length, color: '#7C3AED' },
      ].map(s => <div key={s.label} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
        <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>{s.label}</div>
      </div>)}
    </div>}
    {tab === 1 && <ProcessTab data={data} onChange={handleChange} />}
    {tab === 2 && <ContractTab data={data} onChange={handleChange} />}
    {tab === 3 && <QualityAgreementTab data={data} onChange={handleChange} />}
    {tab === 4 && <AuditTab data={data} onChange={handleChange} />}
  </div>
}
