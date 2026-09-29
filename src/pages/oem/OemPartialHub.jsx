import React, { useState, useEffect } from 'react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import { supabase } from '../../lib/supabaseClient'
import { Share2, Plus, Pencil, Trash2, X, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
let _sbCidOemP = null

const ACCENT = '#D97706'
const ACCENT_SOFT = '#FFFBEB'
const LS_KEY = 'qualytree.oem_partial'

const PROC_STATUS_MAP = {
  active: { label: 'Ã¬Â§ÂÃ­ÂÂ', color: '#2563EB', bg: '#EFF6FF' },
  suspended: { label: 'Ã¬ÂÂ¼Ã¬ÂÂÃ¬Â¤ÂÃ«ÂÂ¨', color: '#D97706', bg: '#FFFBEB' },
  ended: { label: 'Ã¬Â¢ÂÃ«Â£Â', color: '#6B7280', bg: '#F3F4F6' },
}
const CONTRACT_STATUS_MAP = {
  valid: { label: 'Ã¬ÂÂ Ã­ÂÂ¨', color: '#16A34A', bg: '#F0FDF4' },
  expiring: { label: 'Ã«Â§ÂÃ«Â£ÂÃ¬ÂÂÃ«Â°Â', color: '#D97706', bg: '#FFFBEB' },
  expired: { label: 'Ã«Â§ÂÃ«Â£Â', color: '#DC2626', bg: '#FEF2F2' },
}
const AUDIT_MAP = {
  scheduled: { label: 'Ã¬ÂÂÃ¬Â Â', color: '#2563EB', bg: '#EFF6FF' },
  done: { label: 'Ã¬ÂÂÃ«Â£Â', color: '#16A34A', bg: '#F0FDF4' },
  overdue: { label: 'Ã¬Â§ÂÃ¬ÂÂ°', color: '#DC2626', bg: '#FEF2F2' },
}

function load() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {} } catch { return {} }
}
function save(d) {
  localStorage.setItem(LS_KEY, JSON.stringify(d))
  if (_sbCidOemP) {
    supabase.from('company_data').upsert({
      company_id: _sbCidOemP, data_type: 'localStorage_sync',
      data_key: LS_KEY, payload: d
    }, { onConflict: 'company_id,data_type,data_key' })
  }
}

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
        <Btn variant="ghost" onClick={onClose}>Ã¬Â·Â¨Ã¬ÂÂ</Btn>
        <Btn onClick={onSave}>Ã¬Â ÂÃ¬ÂÂ¥</Btn>
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
  function del(id) { if (confirm('Ã¬ÂÂ­Ã¬Â ÂÃ­ÂÂÃ¬ÂÂÃªÂ²Â Ã¬ÂÂµÃ«ÂÂÃªÂ¹Â?')) onChange({ ...data, processes: procs.filter(p => p.id !== id) }) }
  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  return <SectionBox title="ÃªÂ³ÂµÃ¬Â Â Ã¬ÂÂÃ­ÂÂÃ­ÂÂÃ­ÂÂ©" action={<Btn onClick={openAdd}><Plus size={14} /> Ã¬Â¶ÂÃªÂ°Â</Btn>}>
    {procs.length === 0 ? <Empty label="Ã«ÂÂ±Ã«Â¡ÂÃ«ÂÂ Ã¬ÂÂÃ­ÂÂ ÃªÂ³ÂµÃ¬Â ÂÃ¬ÂÂ´ Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤" /> :
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ borderBottom: '2px solid #E5E7EB' }}>
          {['ÃªÂ³ÂµÃ¬Â ÂÃ«ÂªÂ', 'Ã¬ÂÂÃ­ÂÂÃ¬ÂÂÃ¬Â²Â´', 'Ã¬ÂÂÃ­ÂÂÃ«Â²ÂÃ¬ÂÂ', 'Ã«Â¹ÂÃ¬ÂÂ¨(%)', 'Ã¬ÂÂ Ã­ÂÂ', 'Ã¬ÂÂÃ¬ÂÂÃ¬ÂÂ¼', 'Ã¬ÂÂÃ­ÂÂ', ''].map(h =>
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
    {modal && <Modal title={modal === 'add' ? 'ÃªÂ³ÂµÃ¬Â Â Ã¬Â¶ÂÃªÂ°Â' : 'ÃªÂ³ÂµÃ¬Â Â Ã¬ÂÂÃ¬Â Â'} onClose={() => setModal(null)} onSave={save}>
      <Field label="ÃªÂ³ÂµÃ¬Â ÂÃ«ÂªÂ"><input value={form.name} onChange={e => f('name', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="Ã¬ÂÂÃ­ÂÂÃ¬ÂÂÃ¬Â²Â´"><input value={form.contractor} onChange={e => f('contractor', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="Ã¬ÂÂÃ­ÂÂÃ«Â²ÂÃ¬ÂÂ"><input value={form.scope} onChange={e => f('scope', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="Ã¬ÂÂÃ­ÂÂÃ«Â¹ÂÃ¬ÂÂ¨(%)"><input type="number" value={form.ratio} onChange={e => f('ratio', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="Ã¬ÂÂÃ­ÂÂÃ¬ÂÂ Ã­ÂÂ"><input value={form.type} onChange={e => f('type', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="Ã¬ÂÂÃ¬ÂÂÃ¬ÂÂ¼"><input type="date" value={form.startDate} onChange={e => f('startDate', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="Ã¬ÂÂÃ­ÂÂ"><select value={form.status} onChange={e => f('status', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }}>
        <option value="active">Ã¬Â§ÂÃ­ÂÂ</option><option value="suspended">Ã¬ÂÂ¼Ã¬ÂÂÃ¬Â¤ÂÃ«ÂÂ¨</option><option value="ended">Ã¬Â¢ÂÃ«Â£Â</option>
      </select></Field>
      <Field label="Ã«Â¹ÂÃªÂ³Â "><textarea value={form.note} onChange={e => f('note', e.target.value)} rows={3} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
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
  function del(id) { if (confirm('Ã¬ÂÂ­Ã¬Â ÂÃ­ÂÂÃ¬ÂÂÃªÂ²Â Ã¬ÂÂµÃ«ÂÂÃªÂ¹Â?')) onChange({ ...data, contracts: contracts.filter(c => c.id !== id) }) }
  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  return <SectionBox title="ÃªÂ³ÂÃ¬ÂÂ½Ã¬ÂÂ ÃªÂ´ÂÃ«Â¦Â¬" action={<Btn onClick={openAdd}><Plus size={14} /> Ã¬Â¶ÂÃªÂ°Â</Btn>}>
    {contracts.length === 0 ? <Empty label="Ã«ÂÂ±Ã«Â¡ÂÃ«ÂÂ ÃªÂ³ÂÃ¬ÂÂ½Ã¬ÂÂÃªÂ°Â Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤" /> :
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ borderBottom: '2px solid #E5E7EB' }}>
          {['ÃªÂ³ÂÃ¬ÂÂ½Ã«ÂªÂ', 'Ã¬ÂÂÃ­ÂÂÃ¬ÂÂÃ¬Â²Â´', 'Ã¬ÂÂÃ¬ÂÂÃ¬ÂÂ¼', 'Ã¬Â¢ÂÃ«Â£ÂÃ¬ÂÂ¼', 'Ã¬ÂÂÃ­ÂÂ', 'Ã«Â¹ÂÃªÂ³Â ', ''].map(h =>
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
    {modal && <Modal title={modal === 'add' ? 'ÃªÂ³ÂÃ¬ÂÂ½ Ã¬Â¶ÂÃªÂ°Â' : 'ÃªÂ³ÂÃ¬ÂÂ½ Ã¬ÂÂÃ¬Â Â'} onClose={() => setModal(null)} onSave={save}>
      <Field label="ÃªÂ³ÂÃ¬ÂÂ½Ã«ÂªÂ"><input value={form.name} onChange={e => f('name', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="Ã¬ÂÂÃ­ÂÂÃ¬ÂÂÃ¬Â²Â´"><input value={form.contractor} onChange={e => f('contractor', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="Ã¬ÂÂÃ¬ÂÂÃ¬ÂÂ¼"><input type="date" value={form.startDate} onChange={e => f('startDate', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="Ã¬Â¢ÂÃ«Â£ÂÃ¬ÂÂ¼"><input type="date" value={form.endDate} onChange={e => f('endDate', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="Ã«Â¹ÂÃªÂ³Â "><textarea value={form.note} onChange={e => f('note', e.target.value)} rows={3} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
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
  function del(id) { if (confirm('Ã¬ÂÂ­Ã¬Â ÂÃ­ÂÂÃ¬ÂÂÃªÂ²Â Ã¬ÂÂµÃ«ÂÂÃªÂ¹Â?')) onChange({ ...data, audits: audits.filter(a => a.id !== id) }) }
  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  return <SectionBox title="ÃªÂ°ÂÃ¬ÂÂ¬ Ã¬ÂÂ¼Ã¬Â Â" action={<Btn onClick={openAdd}><Plus size={14} /> Ã¬Â¶ÂÃªÂ°Â</Btn>}>
    {audits.length === 0 ? <Empty label="Ã«ÂÂ±Ã«Â¡ÂÃ«ÂÂ ÃªÂ°ÂÃ¬ÂÂ¬ Ã¬ÂÂ¼Ã¬Â ÂÃ¬ÂÂ´ Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤" /> :
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ borderBottom: '2px solid #E5E7EB' }}>
          {['ÃªÂ°ÂÃ¬ÂÂ¬Ã«ÂªÂ', 'Ã¬ÂÂÃ­ÂÂÃ¬ÂÂÃ¬Â²Â´', 'ÃªÂ°ÂÃ¬ÂÂ¬Ã¬ÂÂ¼', 'Ã¬ÂÂÃ­ÂÂ', 'Ã¬Â£Â¼Ã¬ÂÂÃ«Â°ÂÃªÂ²Â¬', ''].map(h =>
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
    {modal && <Modal title={modal === 'add' ? 'ÃªÂ°ÂÃ¬ÂÂ¬ Ã¬Â¶ÂÃªÂ°Â' : 'ÃªÂ°ÂÃ¬ÂÂ¬ Ã¬ÂÂÃ¬Â Â'} onClose={() => setModal(null)} onSave={save}>
      <Field label="ÃªÂ°ÂÃ¬ÂÂ¬Ã«ÂªÂ"><input value={form.title} onChange={e => f('title', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="Ã¬ÂÂÃ­ÂÂÃ¬ÂÂÃ¬Â²Â´"><input value={form.contractor} onChange={e => f('contractor', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="ÃªÂ°ÂÃ¬ÂÂ¬Ã¬ÂÂ¼"><input type="date" value={form.date} onChange={e => f('date', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="Ã¬ÂÂÃ­ÂÂ"><select value={form.status} onChange={e => f('status', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }}>
        <option value="scheduled">Ã¬ÂÂÃ¬Â Â</option><option value="done">Ã¬ÂÂÃ«Â£Â</option>
      </select></Field>
      <Field label="Ã¬Â£Â¼Ã¬ÂÂÃ«Â°ÂÃªÂ²Â¬Ã¬ÂÂ¬Ã­ÂÂ­"><textarea value={form.findings} onChange={e => f('findings', e.target.value)} rows={3} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
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
  function del(id) { if (confirm('Ã¬ÂÂ­Ã¬Â ÂÃ­ÂÂÃ¬ÂÂÃªÂ²Â Ã¬ÂÂµÃ«ÂÂÃªÂ¹Â?')) onChange({ ...data, qualityAgreements: qas.filter(q => q.id !== id) }) }
  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  return <SectionBox title="Ã­ÂÂÃ¬Â§Â Ã­ÂÂÃ¬ÂÂ½" action={<Btn onClick={openAdd}><Plus size={14} /> Ã¬Â¶ÂÃªÂ°Â</Btn>}>
    {qas.length === 0 ? <Empty label="Ã«ÂÂ±Ã«Â¡ÂÃ«ÂÂ Ã­ÂÂÃ¬Â§Â Ã­ÂÂÃ¬ÂÂ½Ã¬ÂÂ´ Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤" /> :
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ borderBottom: '2px solid #E5E7EB' }}>
          {['Ã­ÂÂÃ¬ÂÂ½Ã«ÂªÂ', 'Ã¬ÂÂÃ­ÂÂÃ¬ÂÂÃ¬Â²Â´', 'Ã¬Â²Â´ÃªÂ²Â°Ã¬ÂÂ¼', 'Ã­ÂÂÃ¬ÂÂ½Ã«Â²ÂÃ¬ÂÂ', 'Ã¬ÂÂÃ­ÂÂ', ''].map(h =>
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
    {modal && <Modal title={modal === 'add' ? 'Ã­ÂÂÃ¬ÂÂ½ Ã¬Â¶ÂÃªÂ°Â' : 'Ã­ÂÂÃ¬ÂÂ½ Ã¬ÂÂÃ¬Â Â'} onClose={() => setModal(null)} onSave={save}>
      <Field label="Ã­ÂÂÃ¬ÂÂ½Ã«ÂªÂ"><input value={form.title} onChange={e => f('title', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="Ã¬ÂÂÃ­ÂÂÃ¬ÂÂÃ¬Â²Â´"><input value={form.contractor} onChange={e => f('contractor', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="Ã¬Â²Â´ÃªÂ²Â°Ã¬ÂÂ¼"><input type="date" value={form.signDate} onChange={e => f('signDate', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="Ã­ÂÂÃ¬ÂÂ½Ã«Â²ÂÃ¬ÂÂ"><textarea value={form.scope} onChange={e => f('scope', e.target.value)} rows={3} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }} /></Field>
      <Field label="Ã¬ÂÂÃ­ÂÂ"><select value={form.status} onChange={e => f('status', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }}>
        <option value="valid">Ã¬ÂÂ Ã­ÂÂ¨</option><option value="expiring">Ã«Â§ÂÃ«Â£ÂÃ¬ÂÂÃ«Â°Â</option><option value="expired">Ã«Â§ÂÃ«Â£Â</option>
      </select></Field>
    </Modal>}
  </SectionBox>
}

const TABS = ['ÃªÂ°ÂÃ¬ÂÂ', 'ÃªÂ³ÂµÃ¬Â Â Ã¬ÂÂÃ­ÂÂÃ­ÂÂÃ­ÂÂ©', 'ÃªÂ³ÂÃ¬ÂÂ½Ã¬ÂÂ', 'Ã­ÂÂÃ¬Â§Â Ã­ÂÂÃ¬ÂÂ½', 'ÃªÂ°ÂÃ¬ÂÂ¬ Ã¬ÂÂ¼Ã¬Â Â', 'ÃªÂ³ÂµÃ¬Â Â Ã¬ÂÂ¤Ã¬Â Â']

function SetupTab({ data, onChange }) {
  const LS_KEY_SETUP = 'qualytree.oem_partial_setup'
  const user = auth.current()
  const companyId = user?.company_id
  const DEFAULT_PROCS = [
    { id: 1, name: 'Ã¬ÂÂÃ¬ÂÂÃ¬ÂÂ¬ Ã¬ÂÂÃªÂ³Â  ÃªÂ²ÂÃ¬ÂÂ¬', type: 'self', contractor: '' },
    { id: 2, name: 'ÃªÂ°ÂÃªÂ³ÂµÃÂ·Ã¬ÂÂ±Ã­ÂÂ', type: 'self', contractor: '' },
    { id: 3, name: 'Ã¬Â¡Â°Ã«Â¦Â½', type: 'self', contractor: '' },
    { id: 4, name: 'Ã¬ÂÂ¸Ã¬Â²Â', type: 'self', contractor: '' },
    { id: 5, name: 'Ã«Â©Â¸ÃªÂ·Â ', type: 'self', contractor: '' },
    { id: 6, name: 'ÃªÂ³ÂµÃ¬Â Â ÃªÂ²ÂÃ¬ÂÂ¬', type: 'self', contractor: '' },
    { id: 7, name: 'Ã¬ÂµÂÃ¬Â¢Â ÃªÂ²ÂÃ¬ÂÂ¬', type: 'self', contractor: '' },
    { id: 8, name: 'Ã­ÂÂ¬Ã¬ÂÂ¥ÃÂ·Ã«ÂÂ¼Ã«Â²Â¨Ã«Â§Â', type: 'self', contractor: '' },
  ]
  const [procs, setProcs] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY_SETUP) || 'null') || DEFAULT_PROCS } catch { return DEFAULT_PROCS }
  })
  const [saved, setSaved] = React.useState(false)
  useEffect(() => { _sbCidOemP = companyId }, [companyId])
  useEffect(() => {
    if (!companyId) return
    supabase.from('company_data')
      .select('payload')
      .eq('company_id', companyId)
      .eq('data_type', 'localStorage_sync')
      .eq('data_key', LS_KEY_SETUP)
      .maybeSingle()
      .then(({ data: sbData }) => {
        if (sbData?.payload) {
          setProcs(sbData.payload)
        }
      })
  }, [companyId])

  const toggle = (id) => setProcs(ps => ps.map(p => p.id === id ? { ...p, type: p.type === 'self' ? 'outsource' : 'self', contractor: p.type === 'self' ? p.contractor : '' } : p))
  const setContractor = (id, v) => setProcs(ps => ps.map(p => p.id === id ? { ...p, contractor: v } : p))

  const save = () => {
    localStorage.setItem(LS_KEY_SETUP, JSON.stringify(procs))
    if (_sbCidOemP) {
      supabase.from('company_data').upsert({
        company_id: _sbCidOemP, data_type: 'localStorage_sync',
        data_key: LS_KEY_SETUP, payload: procs
      }, { onConflict: 'company_id,data_type,data_key' })
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const selfColor = '#D1FAE5'; const selfText = '#065F46'
  const outColor = '#FEE2E2'; const outText = '#991B1B'

  return (
    <div style={{ padding: '4px 0 48px' }}>
      <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>
        ÃªÂ°Â ÃªÂ³ÂµÃ¬Â ÂÃ«Â³Â Ã¬ÂÂÃ¬Â²Â´Ã¬ÂÂÃ¬ÂÂ° / Ã¬ÂÂÃ­ÂÂ Ã¬ÂÂ¬Ã«Â¶ÂÃ«Â¥Â¼ Ã¬ÂÂ¤Ã¬Â ÂÃ­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ. Ã¬ÂÂÃ­ÂÂ Ã¬ÂÂ Ã­ÂÂ Ã¬ÂÂ Ã¬ÂÂÃ­ÂÂÃ¬ÂÂÃ¬Â²Â´Ã«ÂªÂÃ¬ÂÂ Ã¬ÂÂÃ«Â Â¥Ã­ÂÂ  Ã¬ÂÂ Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {procs.map(p => (
          <div key={p.id} style={{ border: '1px solid', borderColor: p.type === 'outsource' ? '#FECACA' : '#D1FAE5', borderRadius: 10, padding: '14px 16px', background: p.type === 'outsource' ? '#FFF7F7' : '#F0FDF4' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: p.type === 'outsource' ? 10 : 0 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>{p.name}</span>
              <button onClick={() => toggle(p.id)} style={{ padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: p.type === 'outsource' ? outColor : selfColor, color: p.type === 'outsource' ? outText : selfText }}>
                {p.type === 'outsource' ? 'Ã¬ÂÂÃ­ÂÂ' : 'Ã¬ÂÂÃ¬Â²Â´'}
              </button>
            </div>
            {p.type === 'outsource' && (
              <input value={p.contractor} onChange={e => setContractor(p.id, e.target.value)} placeholder="Ã¬ÂÂÃ­ÂÂÃ¬ÂÂÃ¬Â²Â´Ã«ÂªÂ" style={{ width: '100%', border: '1px solid #FECACA', borderRadius: 6, padding: '6px 10px', fontSize: 12, boxSizing: 'border-box', outline: 'none' }} />
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
        <button onClick={save} style={{ padding: '8px 22px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Ã¬Â ÂÃ¬ÂÂ¥</button>
        {saved && <span style={{ color: '#16A34A', fontSize: 13 }}>Ã¢ÂÂ Ã¬Â ÂÃ¬ÂÂ¥Ã«ÂÂÃ¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤</span>}
      </div>
      <div style={{ marginTop: 28, borderTop: '1px solid #E5E7EB', paddingTop: 20 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', marginBottom: 12 }}>ÃªÂ³ÂµÃ¬Â Â Ã¬ÂÂÃ­ÂÂ Ã­ÂÂÃ­ÂÂ© Ã¬ÂÂÃ¬ÂÂ½</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {procs.map(p => (
            <span key={p.id} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: p.type === 'outsource' ? outColor : selfColor, color: p.type === 'outsource' ? outText : selfText }}>
              {p.name} ÃÂ· {p.type === 'outsource' ? (p.contractor || 'Ã¬ÂÂÃ­ÂÂ') : 'Ã¬ÂÂÃ¬Â²Â´'}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function OemPartialHub() {
  const user = auth.current()
  const companyId = user?.company_id
  const [tab, setTab] = useState(0)
  const [data, setData] = useState(() => load())
  useEffect(() => { _sbCidOemP = companyId }, [companyId])
  useEffect(() => {
    if (!companyId) return
    supabase.from('company_data')
      .select('payload')
      .eq('company_id', companyId)
      .eq('data_type', 'localStorage_sync')
      .eq('data_key', LS_KEY)
      .maybeSingle()
      .then(({ data: sbData }) => {
        if (sbData?.payload) {
          setData(sbData.payload)
        }
      })
  }, [companyId])

  function handleChange(next) { setData(next); save(next) }

  const procs = data.processes || []
  const contracts = data.contracts || []
  const expiringContracts = contracts.filter(c => c.status === 'expiring' || c.status === 'expired')
  const audits = data.audits || []

  return (
    <AppLayout user={user} title="OEM Ã¬ÂÂ¼Ã«Â¶ÂÃ¬ÂÂÃ­ÂÂ">
      <div style={{ padding: '28px 32px', fontFamily: 'inherit' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
      <Share2 size={24} color={ACCENT} />
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>OEM Ã¬ÂÂ¼Ã«Â¶ÂÃªÂ³ÂµÃ¬Â ÂÃ¬ÂÂÃ­ÂÂ ÃªÂ´ÂÃ«Â¦Â¬</h1>
        <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>Ã¬ÂÂ¼Ã«Â¶ÂÃªÂ³ÂµÃ¬Â Â Ã¬ÂÂÃ­ÂÂ ÃªÂ³ÂÃ¬ÂÂ½, Ã­ÂÂÃ¬Â§ÂÃ­ÂÂÃ¬ÂÂ½ Ã«Â°Â ÃªÂ°ÂÃ¬ÂÂ¬ Ã­ÂÂÃ­ÂÂ© ÃªÂ´ÂÃ«Â¦Â¬</p>
      </div>
    </div>

    {expiringContracts.length > 0 && <div style={{ background: '#FFFBEB', border: '1px solid #F59E0B', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
      <AlertTriangle size={16} color="#D97706" />
      <span style={{ fontSize: 13, color: '#92400E' }}>Ã«Â§ÂÃ«Â£ÂÃ¬ÂÂÃ«Â°ÂÃÂ·Ã«Â§ÂÃ«Â£Â ÃªÂ³ÂÃ¬ÂÂ½ {expiringContracts.length}ÃªÂ±Â´ Ã¢ÂÂ ÃªÂ³ÂÃ¬ÂÂ½ ÃªÂ°Â±Ã¬ÂÂ Ã¬ÂÂ ÃªÂ²ÂÃ­ÂÂ Ã­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ</span>
    </div>}

    <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #E5E7EB', marginBottom: 24 }}>
      {TABS.map((t, i) => <button key={t} onClick={() => setTab(i)} style={{ padding: '8px 18px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === i ? 700 : 500, color: tab === i ? ACCENT : '#6B7280', borderBottom: tab === i ? '2px solid ' + ACCENT : '2px solid transparent', marginBottom: -2 }}>{t}</button>)}
    </div>

    {tab === 0 && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16 }}>
      {[
        { label: 'Ã¬ÂÂÃ­ÂÂ ÃªÂ³ÂµÃ¬Â Â Ã¬ÂÂ', value: procs.length, color: ACCENT },
        { label: 'Ã­ÂÂÃ¬ÂÂ± ÃªÂ³ÂµÃ¬Â Â', value: procs.filter(p => p.status === 'active').length, color: '#16A34A' },
        { label: 'ÃªÂ³ÂÃ¬ÂÂ½Ã¬ÂÂ Ã¬ÂÂ', value: contracts.length, color: '#2563EB' },
        { label: 'Ã«Â§ÂÃ«Â£ÂÃ¬ÂÂÃ«Â°Â ÃªÂ³ÂÃ¬ÂÂ½', value: expiringContracts.length, color: '#DC2626' },
        { label: 'ÃªÂ°ÂÃ¬ÂÂ¬ Ã¬ÂÂ¼Ã¬Â Â', value: audits.length, color: '#7C3AED' },
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
