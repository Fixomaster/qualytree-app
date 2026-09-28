// src/pages/notices/NoticeHub.jsx
// ë´ë¶ ê³µì§Â·ìë¦¼ ê´ë¦¬ íë¸ â ISO 13485 Â§5.5.3 ë´ë¶ ì»¤ë®¤ëì¼ì´ì
// localStorage ê¸°ë° (ì¶í Supabase ë§ì´ê·¸ë ì´ì ìì )
import React, { useState, useMemo, useEffect } from 'react'
import {
  Bell, Plus, Edit2, Trash2, Pin, Eye, EyeOff,
  AlertTriangle, Info, Zap, X, Shield, Megaphone,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'
import { supabase } from '../../lib/supabaseClient'
let _sbCidNot = null
import { DEPT_LIST } from '../../lib/deptAuth'

const NS_NOTICES = 'qualytree.notices'
const NS_AUTHORS = 'qualytree.notice_authors'
function loadNotices() { try { return JSON.parse(localStorage.getItem(NS_NOTICES) || '[]') } catch { return [] } }
function saveNotices(list) {
  localStorage.setItem(NS_NOTICES, JSON.stringify(list))
  if (_sbCidNot) {
    supabase.from('company_data').upsert({
      company_id: _sbCidNot, data_type: 'localStorage_sync',
      data_key: NS_NOTICES, payload: list
    }, { onConflict: 'company_id,data_type,data_key' })
  }
}
function loadAuthors() { try { return JSON.parse(localStorage.getItem(NS_AUTHORS) || '[]') } catch { return [] } }
function saveAuthors(list) {
  localStorage.setItem(NS_AUTHORS, JSON.stringify(list))
  if (_sbCidNot) {
    supabase.from('company_data').upsert({
      company_id: _sbCidNot, data_type: 'localStorage_sync',
      data_key: NS_AUTHORS, payload: list
    }, { onConflict: 'company_id,data_type,data_key' })
  }
}

const NOTICE_TYPES = [
  { value: 'info',    label: 'ì¼ë° ê³µì§', color: '#3B82F6', bg: '#EFF6FF', icon: Info },
  { value: 'warning', label: 'ì£¼ì ì¬í­', color: '#F59E0B', bg: '#FFFBEB', icon: AlertTriangle },
  { value: 'urgent',  label: 'ê¸´ê¸ ê³µì§', color: '#EF4444', bg: '#FEF2F2', icon: Zap },
]
const typeOf = (v) => NOTICE_TYPES.find(t => t.value === v) || NOTICE_TYPES[0]
const NOTICE_CATEGORIES = [
  { value: 'general', label: 'ì¼ë°', color: '#6B7280' },
  { value: 'quality', label: 'íì§ì´ì', color: '#DC2626' },
]
const catOf = (v) => NOTICE_CATEGORIES.find(c => c.value === v) || NOTICE_CATEGORIES[0]
function newId() { return 'NTC-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,5).toUpperCase() }
const EMPTY_FORM = { title: '', content: '', type: 'info', category: 'general', isPinned: false, isActive: true, targetDepts: ['ALL'], expiresAt: '' }

function NoticeCard({ notice, onEdit, onDelete, onToggleActive, onTogglePin, canEdit }) {
  const t = typeOf(notice.type)
  const Icon = t.icon
  const expired = notice.expiresAt && new Date(notice.expiresAt) < new Date()
  return (
    <div className="rounded-xl p-4 transition"
      style={{ background: 'var(--bg-card)', border: `1px solid ${notice.isPinned ? t.color + '40' : 'var(--line)'}`, opacity: (!notice.isActive || expired) ? 0.55 : 1 }}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: t.bg }}>
          <Icon size={15} style={{ color: t.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            {notice.isPinned && <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: '#10B98120', color: '#10B981' }}>ð ê³ ì </span>}
            {!notice.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>ë¹íì±</span>}
            {expired && <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: '#EF444420', color: '#EF4444' }}>ë§ë£</span>}
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: t.bg, color: t.color }}>{t.label}</span>
            <span className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>{notice.title}</span>
          </div>
          <div className="text-[12.5px] mt-1" style={{ color: 'var(--ink-soft)', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{notice.content}</div>
          <div className="flex items-center gap-3 mt-2 flex-wrap text-[11px]" style={{ color: 'var(--ink-faint)' }}>
            <span>{notice.authorName || '-'} Â· {notice.createdAt?.slice(0, 10) || '-'}</span>
            {notice.expiresAt && <span style={{ color: expired ? '#EF4444' : 'var(--ink-faint)' }}>ë§ë£: {notice.expiresAt}</span>}
            <span>ëì: {notice.targetDepts?.join(', ') || 'ì ì²´'}</span>
          </div>
        </div>
        {canEdit && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => onTogglePin(notice)} title={notice.isPinned ? 'ê³ ì  í´ì ' : 'ìë¨ ê³ ì '} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-soft)', border: 'none', cursor: 'pointer' }}>
              <Pin size={12} style={{ color: notice.isPinned ? '#10B981' : 'var(--ink-faint)' }} />
            </button>
            <button onClick={() => onToggleActive(notice)} title={notice.isActive ? 'ë¹íì±í' : 'íì±í'} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-soft)', border: 'none', cursor: 'pointer' }}>
              {notice.isActive ? <Eye size={12} style={{ color: 'var(--moss)' }} /> : <EyeOff size={12} style={{ color: 'var(--ink-faint)' }} />}
            </button>
            <button onClick={() => onEdit(notice)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-soft)', border: 'none', cursor: 'pointer' }}>
              <Edit2 size={12} style={{ color: 'var(--ink-soft)' }} />
            </button>
            <button onClick={() => onDelete(notice.id)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-soft)', border: 'none', cursor: 'pointer' }}>
              <Trash2 size={12} style={{ color: '#EF4444' }} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function NoticeFormModal({ notice, onClose, onSave }) {
  const [form, setForm] = useState(notice ? { ...notice } : { ...EMPTY_FORM })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const allDepts = [{ code: 'ALL', label: 'ì ì²´' }, ...(DEPT_LIST || [])]
  const toggleDept = (code) => {
    if (code === 'ALL') { set('targetDepts', ['ALL']); return }
    const cur = (form.targetDepts || []).filter(d => d !== 'ALL')
    if (cur.includes(code)) { const next = cur.filter(d => d !== code); set('targetDepts', next.length ? next : ['ALL']) }
    else { set('targetDepts', [...cur, code]) }
  }
  const canSave = form.title.trim() && form.content.trim()
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
          <span className="font-semibold text-[15px]" style={{ color: 'var(--ink)' }}>{notice ? 'ê³µì§ ìì ' : 'ê³µì§ ìì±'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} style={{ color: 'var(--ink-faint)' }} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-mono mb-1.5" style={{ color: 'var(--ink-faint)' }}>ê³µì§ ì í</label>
            <div className="flex gap-2">
              {NOTICE_TYPES.map(t => (
                <button key={t.value} onClick={() => set('type', t.value)} className="flex-1 py-2 rounded-lg text-[12px] font-medium transition"
                  style={{ background: form.type === t.value ? t.bg : 'var(--bg-soft)', color: form.type === t.value ? t.color : 'var(--ink-soft)', border: form.type === t.value ? `1.5px solid ${t.color}` : '1.5px solid var(--line)', cursor: 'pointer' }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono mb-1.5" style={{ color: 'var(--ink-faint)' }}>ì¹´íê³ ë¦¬</label>
            <div className="flex gap-2">
              {NOTICE_CATEGORIES.map(c => (
                <button key={c.value} type="button" onClick={() => set('category', c.value)} className="flex-1 py-2 rounded-lg text-[12px] font-medium transition"
                  style={{ background: form.category === c.value ? c.color + '18' : 'var(--bg-soft)', color: form.category === c.value ? c.color : 'var(--ink-soft)', border: form.category === c.value ? `1.5px solid ${c.color}` : '1.5px solid var(--line)', cursor: 'pointer' }}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono mb-1.5" style={{ color: 'var(--ink-faint)' }}>ì ëª© *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="ê³µì§ ì ëª©ì ìë ¥íì¸ì" className="w-full px-3 py-2 rounded-lg text-[13.5px]" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', outline: 'none' }} />
          </div>
          <div>
            <label className="block text-[11px] font-mono mb-1.5" style={{ color: 'var(--ink-faint)' }}>ë´ì© *</label>
            <textarea value={form.content} onChange={e => set('content', e.target.value)} placeholder="ê³µì§ ë´ì©ì ìë ¥íì¸ì" rows={5} className="w-full px-3 py-2 rounded-lg text-[13.5px]" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', outline: 'none', resize: 'vertical' }} />
          </div>
          <div>
            <label className="block text-[11px] font-mono mb-1.5" style={{ color: 'var(--ink-faint)' }}>ëì ë¶ì</label>
            <div className="flex flex-wrap gap-1.5">
              {allDepts.map(d => {
                const sel = (form.targetDepts || []).includes(d.code)
                return <button key={d.code} onClick={() => toggleDept(d.code)} className="text-[11px] px-2.5 py-1 rounded-lg transition" style={{ background: sel ? 'var(--moss)' : 'var(--bg-soft)', color: sel ? '#fff' : 'var(--ink-soft)', border: sel ? '1.5px solid var(--moss)' : '1.5px solid var(--line)', cursor: 'pointer', fontWeight: sel ? 600 : 400 }}>{d.label}</button>
              })}
            </div>
          </div>
          <div className="flex gap-5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.isPinned} onChange={e => set('isPinned', e.target.checked)} />
              <span className="text-[13px]" style={{ color: 'var(--ink-soft)' }}>ð ìë¨ ê³ ì </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} />
              <span className="text-[13px]" style={{ color: 'var(--ink-soft)' }}>ê³µê° íì</span>
            </label>
          </div>
          <div>
            <label className="block text-[11px] font-mono mb-1.5" style={{ color: 'var(--ink-faint)' }}>ë§ë£ì¼ (ì í)</label>
            <input type="date" value={form.expiresAt || ''} onChange={e => set('expiresAt', e.target.value)} className="px-3 py-2 rounded-lg text-[13.5px]" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', outline: 'none' }} />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4" style={{ borderTop: '1px solid var(--line)' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-[13px]" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer', color: 'var(--ink-soft)' }}>ì·¨ì</button>
          <button onClick={() => canSave && onSave(form)} className="px-5 py-2 rounded-lg text-[13px] font-medium" style={{ background: canSave ? 'var(--moss)' : 'var(--bg-soft)', color: canSave ? '#fff' : 'var(--ink-faint)', border: 'none', cursor: canSave ? 'pointer' : 'not-allowed' }}>ì ì¥</button>
        </div>
      </div>
    </div>
  )
}

// ì¨ë³´ë© STEP6(ê³ì  ë°ê¸)ìì ë±ë¡í êµ¬ì±ì ëª©ë¡ â ì´ë©ì¼ì´ ìë êµ¬ì±ìë§ ì í ê°ë¥
function loadOnboardingMembers() {
  try {
    const raw = localStorage.getItem('qualytree.onboarding')
    if (!raw) return []
    const ob = JSON.parse(raw)
    return (ob.members || []).filter(m => m.name && m.email)
  } catch { return [] }
}

function AuthorPanel({ authors, onUpdate }) {
  const members = loadOnboardingMembers()
  const [pick, setPick] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [email, setEmail] = useState('')
  const available = members.filter(m => !authors.includes(m.email.trim().toLowerCase()))
  const nameFor = (e) => { const m = members.find(mm => mm.email.trim().toLowerCase() === e); return m ? `${m.name} (${m.dept || '-'} Â· ${m.role === 'MANAGER' ? 'ë§¤ëì /RA' : m.role === 'INSPECTOR' ? 'ê²ì¬ê´' : 'ììì'})` : e }
  const addFromList = () => {
    const m = available.find(mm => mm.id === pick)
    if (!m) return
    const e = m.email.trim().toLowerCase()
    if (authors.includes(e)) return
    onUpdate([...authors, e]); setPick('')
  }
  const addManual = () => { const e = email.trim().toLowerCase(); if (!e || authors.includes(e)) return; onUpdate([...authors, e]); setEmail('') }
  return (
    <div className="space-y-3">
      <p className="text-[12.5px]" style={{ color: 'var(--ink-soft)' }}>ê´ë¦¬ì ì¸ì ê³µì§ë¥¼ ìì±í  ì ìë ì¬ëì, ì¨ë³´ë©ìì ë±ë¡í êµ¬ì±ì ì¤ìì ì íí´ ì¶ê°íì¸ì.</p>
      {members.length === 0 ? (
        <div className="text-[12px] px-3 py-2 rounded-lg" style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}>
          ì¨ë³´ë©(ê³ì  ë°ê¸ ë¨ê³)ì ë±ë¡ë êµ¬ì±ìì´ ììµëë¤. ì¨ë³´ë©ìì ì´ë©ì¼ê³¼ í¨ê» êµ¬ì±ìì ë¨¼ì  ë±ë¡íë©´ ì¬ê¸°ì ì´ë¦ì¼ë¡ ì íí  ì ììµëë¤.
        </div>
      ) : (
        <div className="flex gap-2">
          <select value={pick} onChange={e => setPick(e.target.value)} className="flex-1 px-3 py-2 rounded-lg text-[13px]" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', outline: 'none' }}>
            <option value="">êµ¬ì±ì ì í...</option>
            {available.map(m => <option key={m.id} value={m.id}>{m.name} ({m.dept || '-'} Â· {m.role === 'MANAGER' ? 'ë§¤ëì /RA' : m.role === 'INSPECTOR' ? 'ê²ì¬ê´' : 'ììì'})</option>)}
          </select>
          <button onClick={addFromList} disabled={!pick} className="px-4 py-2 rounded-lg text-[13px] font-medium disabled:opacity-40" style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: pick ? 'pointer' : 'not-allowed' }}>ì¶ê°</button>
        </div>
      )}
      <button onClick={() => setShowManual(v => !v)} className="text-[11.5px]" style={{ background: 'none', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', textDecoration: 'underline' }}>
        {showManual ? 'ì´ë©ì¼ ì§ì  ì¶ê° ë«ê¸°' : 'êµ¬ì±ì ëª©ë¡ì ìë ê²½ì° ì´ë©ì¼ë¡ ì§ì  ì¶ê°'}
      </button>
      {showManual && (
        <div className="flex gap-2">
          <input value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && addManual()} placeholder="ì´ë©ì¼ ìë ¥ í Enter ëë ì¶ê° í´ë¦­" className="flex-1 px-3 py-2 rounded-lg text-[13px]" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', outline: 'none' }} />
          <button onClick={addManual} className="px-4 py-2 rounded-lg text-[13px] font-medium" style={{ background: 'var(--bg-soft)', color: 'var(--ink)', border: '1px solid var(--line)', cursor: 'pointer' }}>ì¶ê°</button>
        </div>
      )}
      {authors.length === 0 ? (
        <div className="text-[12.5px] text-center py-4" style={{ color: 'var(--ink-faint)' }}>ì¶ê° ìì± ê¶íìê° ììµëë¤</div>
      ) : (
        <div className="space-y-1.5">
          {authors.map(e => (
            <div key={e} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
              <span className="text-[13px]" style={{ color: 'var(--ink)' }}>{nameFor(e)}</span>
              <button onClick={() => onUpdate(authors.filter(a => a !== e))} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={13} style={{ color: '#EF4444' }} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function NoticeHub() {
  const user = auth.current()
  const companyId = user?.company_id
  const userEmail = user?.email || ''
  const isAdmin = auth.identityKind() === 'operator' || user?.isCompanyAdmin === true
  const [notices, setNotices] = useState(loadNotices)
  const [authors, setAuthors] = useState(loadAuthors)
  const [showSettings, setShowSettings] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [filterType, setFilterType] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [searchQ, setSearchQ] = useState('')
  useEffect(() => { _sbCidNot = companyId }, [companyId])
  useEffect(() => {
    if (!companyId) return
    supabase.from('company_data')
      .select('payload')
      .eq('company_id', companyId)
      .eq('data_type', 'localStorage_sync')
      .eq('data_key', NS_NOTICES)
      .maybeSingle()
      .then(({ data: sbData }) => {
        if (sbData?.payload) {
          setNotices(sbData.payload)
        }
      })
  }, [companyId])
  useEffect(() => {
    if (!companyId) return
    supabase.from('company_data')
      .select('payload')
      .eq('company_id', companyId)
      .eq('data_type', 'localStorage_sync')
      .eq('data_key', NS_AUTHORS)
      .maybeSingle()
      .then(({ data: sbData }) => {
        if (sbData?.payload) {
          setAuthors(sbData.payload)
        }
      })
  }, [companyId])
  const canEdit = isAdmin || authors.includes(userEmail.toLowerCase())
  const persist = (list) => { setNotices(list); saveNotices(list) }
  const persistAuthors = (list) => { setAuthors(list); saveAuthors(list) }
  const handleSave = (form) => {
    if (editTarget) { persist(notices.map(n => n.id === editTarget.id ? { ...n, ...form, updatedAt: new Date().toISOString() } : n)) }
    else { persist([{ ...form, id: newId(), authorName: user?.name || userEmail, authorEmail: userEmail, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), readBy: [] }, ...notices]) }
    setShowForm(false); setEditTarget(null)
  }
  const handleDelete = (id) => { if (!window.confirm('ì´ ê³µì§ë¥¼ ì­ì í ê¹ì?')) return; persist(notices.filter(n => n.id !== id)) }
  const handleEdit = (notice) => { setEditTarget(notice); setShowForm(true) }
  const handleToggleActive = (notice) => persist(notices.map(n => n.id === notice.id ? { ...n, isActive: !n.isActive, updatedAt: new Date().toISOString() } : n))
  const handleTogglePin = (notice) => persist(notices.map(n => n.id === notice.id ? { ...n, isPinned: !n.isPinned, updatedAt: new Date().toISOString() } : n))
  const filtered = useMemo(() => {
    let list = [...notices]
    if (filterType !== 'all') list = list.filter(n => n.type === filterType)
    if (searchQ.trim()) { const q = searchQ.toLowerCase(); list = list.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)) }
    return list.sort((a, b) => { if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1; return new Date(b.createdAt) - new Date(a.createdAt) })
    if (filterCategory !== 'all') list = list.filter(n => (n.category || 'general') === filterCategory)
  }, [notices, filterType, filterCategory, searchQ])
  const activeCount = notices.filter(n => n.isActive && (!n.expiresAt || new Date(n.expiresAt) >= new Date())).length

  return (
    <AppLayout user={user} title="ê³µì§ì¬í­" subtitle="ISO 13485 Â§5.5.3 ë´ë¶ ì»¤ë®¤ëì¼ì´ì">
      <HubBanner icon={Bell} title="ê³µì§ì¬í­" subtitle="ISO 13485 Â§5.5.3 ë´ë¶ ì»¤ë®¤ëì¼ì´ì" color="#4F46E5" />
      <div className="px-6 lg:px-8 py-6 max-w-[960px] mx-auto space-y-5">
        <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #3B82F608, #10B98108)', border: '1px solid var(--line)' }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#3B82F615' }}><Megaphone size={20} style={{ color: '#3B82F6' }} /></div>
              <div>
                <div className="font-bold text-[16px]" style={{ color: 'var(--ink)' }}>ë´ë¶ ê³µì§Â·ìë¦¼</div>
                <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>íì± ê³µì§ {activeCount}ê±´ Â· ISO 13485 Â§5.5.3</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && <button onClick={() => setShowSettings(v => !v)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px]" style={{ background: showSettings ? 'var(--moss)' : 'var(--bg-soft)', color: showSettings ? '#fff' : 'var(--ink-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}><Shield size={13} /> ê¶í ê´ë¦¬</button>}
              {canEdit && <button onClick={() => { setEditTarget(null); setShowForm(true) }} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium" style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}><Plus size={14} /> ê³µì§ ìì±</button>}
            </div>
          </div>
        </div>

        {showSettings && isAdmin && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
            <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--line)' }}><Shield size={15} style={{ color: 'var(--ink-soft)' }} /><span className="font-semibold text-[14px]" style={{ color: 'var(--ink)' }}>ê³µì§ ìì± ê¶í ê´ë¦¬</span></div>
            <div className="p-5"><AuthorPanel authors={authors} onUpdate={persistAuthors} /></div>
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1.5">
            {[['all', 'ì ì²´'], ...NOTICE_TYPES.map(t => [t.value, t.label])].map(([v, l]) => (
              <button key={v} onClick={() => setFilterType(v)} className="text-[12px] px-3 py-1.5 rounded-lg transition" style={{ background: filterType === v ? 'var(--moss)' : 'var(--bg-soft)', color: filterType === v ? '#fff' : 'var(--ink-soft)', border: filterType === v ? '1.5px solid var(--moss)' : '1.5px solid var(--line)', cursor: 'pointer', fontWeight: filterType === v ? 600 : 400 }}>{l}</button>
            ))}
          </div>
          <div className="flex gap-1.5">
            {[['all', 'ì ì²´'], ...NOTICE_CATEGORIES.map(c => [c.value, c.label])].map(([v, l]) => (
              <button key={v} onClick={() => setFilterCategory(v)} className="text-[12px] px-3 py-1.5 rounded-lg transition" style={{ background: filterCategory === v ? 'var(--amber)' : 'var(--bg-soft)', color: filterCategory === v ? '#fff' : 'var(--ink-soft)', border: filterCategory === v ? '1.5px solid var(--amber)' : '1.5px solid var(--line)', cursor: 'pointer', fontWeight: filterCategory === v ? 600 : 400 }}>{l}</button>
            ))}
          </div>
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="ì ëª©Â·ë´ì© ê²ì..." className="px-3 py-1.5 rounded-lg text-[12.5px]" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', outline: 'none', minWidth: 180 }} />
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl flex flex-col items-center py-16" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
            <Bell size={36} style={{ color: 'var(--ink-faint)', opacity: 0.4, marginBottom: 12 }} />
            <div className="text-[14px] font-medium" style={{ color: 'var(--ink-soft)' }}>{searchQ || filterType !== 'all' ? 'ê²ì ê²°ê³¼ê° ììµëë¤' : 'ë±ë¡ë ê³µì§ê° ììµëë¤'}</div>
            {canEdit && !searchQ && filterType === 'all' && <button onClick={() => { setEditTarget(null); setShowForm(true) }} className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px]" style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}><Plus size={14} /> ì²« ê³µì§ ìì±</button>}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(n => <NoticeCard key={n.id} notice={n} onEdit={handleEdit} onDelete={handleDelete} onToggleActive={handleToggleActive} onTogglePin={handleTogglePin} canEdit={canEdit} />)}
          </div>
        )}
      </div>
      {showForm && <NoticeFormModal notice={editTarget} onClose={() => { setShowForm(false); setEditTarget(null) }} onSave={handleSave} />}
    </AppLayout>
  )
}
