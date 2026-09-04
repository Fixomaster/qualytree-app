import React, { useState, useEffect } from 'react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import { Share2, Plus, Pencil, Trash2, X, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'

const ACCENT = '#D97706'
const ACCENT_SOFT = '#FFFBEB'
const LS_KEY = 'qualytree.oem_partial'

const PROC_STATUS_MAP = {
  active: { label: 'ì§í', color: '#2563EB', bg: '#EFF6FF' },
  suspended: { label: 'ì¼ìì¤ë¨', color: '#D97706', bg: '#FFFBEB' },
  ended: { label: 'ì¢ë£', color: '#6B7280', bg: '#F3F4F6' },
}
const CONTRACT_STATUS_MAP = {
  valid: { label: 'ì í¨', color: '#16A34A', bg: '#F0FDF4' },
  expiring: { label: 'ë§ë£ìë°', color: '#D97706', bg: '#FFFBEB' },
  expired: { label: 'ë§ë£', color: '#DC2626', bg: '#FEF2F2' },
}
const AUDIT_MAP = {
  scheduled: { label: 'ìì ', color: '#2563EB', bg: '#EFF6FF' },
  done: { label: 'ìë£', color: '#16A34A', bg: '#F0FDF4' },
  overdue: { label: 'ì§ì°', color: '#DC2626', bg: '#FEF2F2' },
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
  return <div style={{ marginBottom: 14 }}><label style={{ display: 'block', fontSize: 12, color: '#6B7280', marginBottom: 4 }}>{label}</label>{children}</div>
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
        <Btn variant="ghost" onClick={onClose}>ì·¨ì</Btn>
        <Btn onClick={onSave}>ì ì¥</Btn>
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
  function del(id) { if (confirm('ì­ì íìê² ìµëê¹?')) onChange({ ...data, processes: procs.filter(p => p.id !== id) }) }
  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  return <SectionBox title="ê³µì  ìííí©" action={<Btn onClick={openAdd}><Plus size={14} /> ì¶ê°</Btn>}>
    {procs.length === 0 ? <Empty label="ë±ë¡ë ìí ê³µì ì´ ììµëë¤" /> :
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ borderBottom: '2px solid #E5E7EB' }}>
          {['ê³µì ëª', 'ìíìì²´', 'ìíë²ì', 'ë¹ì¨(%)', 'ì í', 'ììì¼', 'ìí', ''].map(h =>
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
    {modal && <Modal title={modal === 'add' ? 'ê³µì  ì¶ê°' : 'ê³µì  ìì '} onClose={() => setModal(null)} onSave={save}>
      <Field label="ê³µì ëª"><input value={form.name} onChange={e => f('name', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="ìíìì²´"><input value={form.contractor} onChange={e => f('contractor', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="ìíë²ì"><input value={form.scope} onChange={e => f('scope', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="ìíë¹ì¨(%)"><input type="number" value={form.ratio} onChange={e => f('ratio', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="ìíì í"><input value={form.type} onChange={e => f('type', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="ììì¼"><input type="date" value={form.startDate} onChange={e => f('startDate', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="ìí"><select value={form.status} onChange={e => f('status', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }}>
        <option value="active">ì§í</option><option value="suspended">ì¼ìì¤ë¨</option><option value="ended">ì¢ë£</option>
      </select></Field>
      <Field label="ë¹ê³ "><textarea value={form.note} onChange={e => f('note', e.target.value)} rows={3} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
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
  function del(id) { if (confirm('ì­ì íìê² ìµëê¹?')) onChange({ ...data, contracts: contracts.filter(c => c.id !== id) }) }
  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  return <SectionBox title="ê³ì½ì ê´ë¦¬" action={<Btn onClick={openAdd}><Plus size={14} /> ì¶ê°</Btn>}>
    {contracts.length === 0 ? <Empty label="ë±ë¡ë ê³ì½ìê° ììµëë¤" /> :
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ borderBottom: '2px solid #E5E7EB' }}>
          {['ê³ì½ëª', 'ìíìì²´', 'ììì¼', 'ì¢ë£ì¼', 'ìí', 'ë¹ê³ ', ''].map(h =>
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
    {modal && <Modal title={modal === 'add' ? 'ê³ì½ ì¶ê°' : 'ê³ì½ ìì '} onClose={() => setModal(null)} onSave={save}>
      <Field label="ê³ì½ëª"><input value={form.name} onChange={e => f('name', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="ìíìì²´"><input value={form.contractor} onChange={e => f('contractor', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="ììì¼"><input type="date" value={form.startDate} onChange={e => f('startDate', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="ì¢ë£ì¼"><input type="date" value={form.endDate} onChange={e => f('endDate', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="ë¹ê³ "><textarea value={form.note} onChange={e => f('note', e.target.value)} rows={3} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
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
  function del(id) { if (confirm('ì­ì íìê² ìµëê¹?')) onChange({ ...data, audits: audits.filter(a => a.id !== id) }) }
  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  return <SectionBox title="ê°ì¬ ì¼ì " action={<Btn onClick={openAdd}><Plus size={14} /> ì¶ê°</Btn>}>
    {audits.length === 0 ? <Empty label="ë±ë¡ë ê°ì¬ ì¼ì ì´ ììµëë¤" /> :
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ borderBottom: '2px solid #E5E7EB' }}>
          {['ê°ì¬ëª', 'ìíìì²´', 'ê°ì¬ì¼', 'ìí', 'ì£¼ìë°ê²¬', ''].map(h =>
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
    {modal && <Modal title={modal === 'add' ? 'ê°ì¬ ì¶ê°' : 'ê°ì¬ ìì '} onClose={() => setModal(null)} onSave={save}>
      <Field label="ê°ì¬ëª"><input value={form.title} onChange={e => f('title', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="ìíìì²´"><input value={form.contractor} onChange={e => f('contractor', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="ê°ì¬ì¼"><input type="date" value={form.date} onChange={e => f('date', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="ìí"><select value={form.status} onChange={e => f('status', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }}>
        <option value="scheduled">ìì </option><option value="done">ìë£</option>
      </select></Field>
      <Field label="ì£¼ìë°ê²¬ì¬í­"><textarea value={form.findings} onChange={e => f('findings', e.target.value)} rows={3} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
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
  function del(id) { if (confirm('ì­ì íìê² ìµëê¹?')) onChange({ ...data, qualityAgreements: qas.filter(q => q.id !== id) }) }
  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  return <SectionBox title="íì§ íì½" action={<Btn onClick={openAdd}><Plus size={14} /> ì¶ê°</Btn>}>
    {qas.length === 0 ? <Empty label="ë±ë¡ë íì§ íì½ì´ ììµëë¤" /> :
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ borderBottom: '2px solid #E5E7EB' }}>
          {['íì½ëª', 'ìíìì²´', 'ì²´ê²°ì¼', 'íì½ë²ì', 'ìí', ''].map(h =>
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
    {modal && <Modal title={modal === 'add' ? 'íì½ ì¶ê°' : 'íì½ ìì '} onClose={() => setModal(null)} onSave={save}>
      <Field label="íì½ëª"><input value={form.title} onChange={e => f('title', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="ìíìì²´"><input value={form.contractor} onChange={e => f('contractor', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="ì²´ê²°ì¼"><input type="date" value={form.signDate} onChange={e => f('signDate', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="íì½ë²ì"><textarea value={form.scope} onChange={e => f('scope', e.target.value)} rows={3} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="ìí"><select value={form.status} onChange={e => f('status', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }}>
        <option value="valid">ì í¨</option><option value="expiring">ë§ë£ìë°</option><option value="expired">ë§ë£</option>
      </select></Field>
    </Modal>}
  </SectionBox>
}

const TABS = ['ê°ì', 'ê³µì  ìííí©', 'ê³ì½ì', 'íì§ íì½', 'ê°ì¬ ì¼ì ', 'ê³µì  ì¤ì ']

function SetupTab({ data, onChange }) {
  const LS_KEY_SETUP = 'qualytree.oem_partial_setup'
  const DEFAULT_PROCS = [
    { id: 1, name: 'ììì¬ ìê³  ê²ì¬', type: 'self', contractor: '' },
    { id: 2, name: 'ê°ê³µÂ·ì±í', type: 'self', contractor: '' },
    { id: 3, name: 'ì¡°ë¦½', type: 'self', contractor: '' },
    { id: 4, name: 'ì¸ì²', type: 'self', contractor: '' },
    { id: 5, name: 'ë©¸ê· ', type: 'self', contractor: '' },
    { id: 6, name: 'ê³µì  ê²ì¬', type: 'self', contractor: '' },
    { id: 7, name: 'ìµì¢ ê²ì¬', type: 'self', contractor: '' },
    { id: 8, name: 'í¬ì¥Â·ë¼ë²¨ë§', type: 'self', contractor: '' },
  ]
  const [procs, setProcs] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY_SETUP) || 'null') || DEFAULT_PROCS } catch { return DEFAULT_PROCS }
  })
  const [saved, setSaved] = React.useState(false)

  const toggle = (id) => setProcs(ps => ps.map(p => p.id === id ? { ...p, type: p.type === 'self' ? 'outsource' : 'self', contractor: p.type === 'self' ? p.contractor : '' } : p))
  const setContractor = (id, v) => setProcs(ps => ps.map(p => p.id === id ? { ...p, contractor: v } : p))

  const save = () => {
    localStorage.setItem(LS_KEY_SETUP, JSON.stringify(procs))
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const selfColor = '#D1FAE5'; const selfText = '#065F46'
  const outColor = '#FEE2E2'; const outText = '#991B1B'

  return (
    <div style={{ padding: '4px 0 48px' }}>
      <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>
        ê° ê³µì ë³ ìì²´ìì° / ìí ì¬ë¶ë¥¼ ì¤ì íì¸ì. ìí ì í ì ìíìì²´ëªì ìë ¥í  ì ììµëë¤.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {procs.map(p => (
          <div key={p.id} style={{ border: '1px solid', borderColor: p.type === 'outsource' ? '#FECACA' : '#D1FAE5', borderRadius: 10, padding: '14px 16px', background: p.type === 'outsource' ? '#FFF7F7' : '#F0FDF4' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: p.type === 'outsource' ? 10 : 0 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>{p.name}</span>
              <button onClick={() => toggle(p.id)} style={{ padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: p.type === 'outsource' ? outColor : selfColor, color: p.type === 'outsource' ? outText : selfText }}>
                {p.type === 'outsource' ? 'ìí' : 'ìì²´'}
              </button>
            </div>
            {p.type === 'outsource' && (
              <input value={p.contractor} onChange={e => setContractor(p.id, e.target.value)} placeholder="ìíìì²´ëª" style={{ width: '100%', border: '1px solid #FECACA', borderRadius: 6, padding: '6px 10px', fontSize: 12, boxSizing: 'border-box', outline: 'none' }} />
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
        <button onClick={save} style={{ padding: '8px 22px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>ì ì¥</button>
        {saved && <span style={{ color: '#16A34A', fontSize: 13 }}>â ì ì¥ëììµëë¤</span>}
      </div>
      <div style={{ marginTop: 28, borderTop: '1px solid #E5E7EB', paddingTop: 20 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', marginBottom: 12 }}>ê³µì  ìí íí© ìì½</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {procs.map(p => (
            <span key={p.id} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: p.type === 'outsource' ? outColor : selfColor, color: p.type === 'outsource' ? outText : selfText }}>
              {p.name} Â· {p.type === 'outsource' ? (p.contractor || 'ìí') : 'ìì²´'}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function OemPartialHub() {
  const user = auth.current()
  const [tab, setTab] = useState(0)
  const [data, setData] = useState(() => load())

  function handleChange(next) { setData(next); save(next) }

  const procs = data.processes || []
  const contracts = data.contracts || []
  const expiringContracts = contracts.filter(c => c.status === 'expiring' || c.status === 'expired')
  const audits = data.audits || []

  return (
    <AppLayout user={user} title="OEM ì¼ë¶ìí">
      <div style={{ padding: '28px 32px', fontFamily: 'inherit' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
      <Share2 size={24} color={ACCENT} />
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>OEM ì¼ë¶ê³µì ìí ê´ë¦¬</h1>
        <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>ì¼ë¶ê³µì  ìí ê³ì½, íì§íì½ ë° ê°ì¬ íí© ê´ë¦¬</p>
      </div>
    </div>

    {expiringContracts.length > 0 && <div style={{ background: '#FFFBEB', border: '1px solid #F59E0B', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
      <AlertTriangle size={16} color="#D97706" />
      <span style={{ fontSize: 13, color: '#92400E' }}>ë§ë£ìë°Â·ë§ë£ ê³ì½ {expiringContracts.length}ê±´ â ê³ì½ ê°±ì ì ê²í íì¸ì</span>
    </div>}

    <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #E5E7EB', marginBottom: 24 }}>
      {TABS.map((t, i) => <button key={t} onClick={() => setTab(i)} style={{ padding: '8px 18px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === i ? 700 : 500, color: tab === i ? ACCENT : '#6B7280', borderBottom: tab === i ? '2px solid ' + ACCENT : '2px solid transparent', marginBottom: -2 }}>{t}</button>)}
    </div>

    {tab === 0 && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16 }}>
      {[
        { label: 'ìí ê³µì  ì', value: procs.length, color: ACCENT },
        { label: 'íì± ê³µì ', value: procs.filter(p => p.status === 'active').length, color: '#16A34A' },
        { label: 'ê³ì½ì ì', value: contracts.length, color: '#2563EB' },
        { label: 'ë§ë£ìë° ê³ì½', value: expiringContracts.length, color: '#DC2626' },
        { label: 'ê°ì¬ ì¼ì ', value: audits.length, color: '#7C3AED' },
      ].map(s => <div key={s.label} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
        <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>{s.label}</div>
      </div>)}
    </div>}
    {tab === 1 && <ProcessTab data={data} onChange={handleChange} />}
    {tab === 2 && <ContractTab data={data} onChange={handleChange} />}
    {tab === 3 && <QualityAgreementTab data={data} onChange={handleChange} />}
    {tab === 4 && <AuditTab data={data} onChange={handleChange} />}
  
          {tab === 5 && <SetupTab data={data} onChange={d => { setData(d); save(d) }} />}</div>
    </AppLayout>
  )
}
