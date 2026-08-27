// src/pages/notices/NoticeHub.jsx
// 내부 공지·알림 관리 허브 — ISO 13485 §5.5.3 내부 커뮤니케이션
// localStorage 기반 (추후 Supabase 마이그레이션 예정)
import React, { useState, useMemo } from 'react'
import {
  Bell, Plus, Edit2, Trash2, Pin, Eye, EyeOff,
  AlertTriangle, Info, Zap, X, Shield, Megaphone,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'
import { DEPT_LIST } from '../../lib/deptAuth'

const NS_NOTICES = 'qualytree.notices'
const NS_AUTHORS = 'qualytree.notice_authors'
function loadNotices() { try { return JSON.parse(localStorage.getItem(NS_NOTICES) || '[]') } catch { return [] } }
function saveNotices(list) { localStorage.setItem(NS_NOTICES, JSON.stringify(list)) }
function loadAuthors() { try { return JSON.parse(localStorage.getItem(NS_AUTHORS) || '[]') } catch { return [] } }
function saveAuthors(list) { localStorage.setItem(NS_AUTHORS, JSON.stringify(list)) }

const NOTICE_TYPES = [
  { value: 'info',    label: '일반 공지', color: '#3B82F6', bg: '#EFF6FF', icon: Info },
  { value: 'warning', label: '주의 사항', color: '#F59E0B', bg: '#FFFBEB', icon: AlertTriangle },
  { value: 'urgent',  label: '긴급 공지', color: '#EF4444', bg: '#FEF2F2', icon: Zap },
]
const typeOf = (v) => NOTICE_TYPES.find(t => t.value === v) || NOTICE_TYPES[0]
function newId() { return 'NTC-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,5).toUpperCase() }
const EMPTY_FORM = { title: '', content: '', type: 'info', isPinned: false, isActive: true, targetDepts: ['ALL'], expiresAt: '' }

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
            {notice.isPinned && <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: '#10B98120', color: '#10B981' }}>📌 고정</span>}
            {!notice.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>비활성</span>}
            {expired && <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: '#EF444420', color: '#EF4444' }}>만료</span>}
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: t.bg, color: t.color }}>{t.label}</span>
            <span className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>{notice.title}</span>
          </div>
          <div className="text-[12.5px] mt-1" style={{ color: 'var(--ink-soft)', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{notice.content}</div>
          <div className="flex items-center gap-3 mt-2 flex-wrap text-[11px]" style={{ color: 'var(--ink-faint)' }}>
            <span>{notice.authorName || '-'} · {notice.createdAt?.slice(0, 10) || '-'}</span>
            {notice.expiresAt && <span style={{ color: expired ? '#EF4444' : 'var(--ink-faint)' }}>만료: {notice.expiresAt}</span>}
            <span>대상: {notice.targetDepts?.join(', ') || '전체'}</span>
          </div>
        </div>
        {canEdit && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => onTogglePin(notice)} title={notice.isPinned ? '고정 해제' : '상단 고정'} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-soft)', border: 'none', cursor: 'pointer' }}>
              <Pin size={12} style={{ color: notice.isPinned ? '#10B981' : 'var(--ink-faint)' }} />
            </button>
            <button onClick={() => onToggleActive(notice)} title={notice.isActive ? '비활성화' : '활성화'} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-soft)', border: 'none', cursor: 'pointer' }}>
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
  const allDepts = [{ code: 'ALL', label: '전체' }, ...(DEPT_LIST || [])]
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
          <span className="font-semibold text-[15px]" style={{ color: 'var(--ink)' }}>{notice ? '공지 수정' : '공지 작성'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} style={{ color: 'var(--ink-faint)' }} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-mono mb-1.5" style={{ color: 'var(--ink-faint)' }}>공지 유형</label>
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
            <label className="block text-[11px] font-mono mb-1.5" style={{ color: 'var(--ink-faint)' }}>제목 *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="공지 제목을 입력하세요" className="w-full px-3 py-2 rounded-lg text-[13.5px]" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', outline: 'none' }} />
          </div>
          <div>
            <label className="block text-[11px] font-mono mb-1.5" style={{ color: 'var(--ink-faint)' }}>내용 *</label>
            <textarea value={form.content} onChange={e => set('content', e.target.value)} placeholder="공지 내용을 입력하세요" rows={5} className="w-full px-3 py-2 rounded-lg text-[13.5px]" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', outline: 'none', resize: 'vertical' }} />
          </div>
          <div>
            <label className="block text-[11px] font-mono mb-1.5" style={{ color: 'var(--ink-faint)' }}>대상 부서</label>
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
              <span className="text-[13px]" style={{ color: 'var(--ink-soft)' }}>📌 상단 고정</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} />
              <span className="text-[13px]" style={{ color: 'var(--ink-soft)' }}>공개 표시</span>
            </label>
          </div>
          <div>
            <label className="block text-[11px] font-mono mb-1.5" style={{ color: 'var(--ink-faint)' }}>만료일 (선택)</label>
            <input type="date" value={form.expiresAt || ''} onChange={e => set('expiresAt', e.target.value)} className="px-3 py-2 rounded-lg text-[13.5px]" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', outline: 'none' }} />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4" style={{ borderTop: '1px solid var(--line)' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-[13px]" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer', color: 'var(--ink-soft)' }}>취소</button>
          <button onClick={() => canSave && onSave(form)} className="px-5 py-2 rounded-lg text-[13px] font-medium" style={{ background: canSave ? 'var(--moss)' : 'var(--bg-soft)', color: canSave ? '#fff' : 'var(--ink-faint)', border: 'none', cursor: canSave ? 'pointer' : 'not-allowed' }}>저장</button>
        </div>
      </div>
    </div>
  )
}

// 온보딩 STEP6(계정 발급)에서 등록한 구성원 목록 — 이메일이 있는 구성원만 선택 가능
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
  const nameFor = (e) => { const m = members.find(mm => mm.email.trim().toLowerCase() === e); return m ? `${m.name} (${m.dept || '-'} · ${m.role === 'MANAGER' ? '매니저/RA' : m.role === 'INSPECTOR' ? '검사관' : '작업자'})` : e }
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
      <p className="text-[12.5px]" style={{ color: 'var(--ink-soft)' }}>관리자 외에 공지를 작성할 수 있는 사람을, 온보딩에서 등록한 구성원 중에서 선택해 추가하세요.</p>
      {members.length === 0 ? (
        <div className="text-[12px] px-3 py-2 rounded-lg" style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}>
          온보딩(계정 발급 단계)에 등록된 구성원이 없습니다. 온보딩에서 이메일과 함께 구성원을 먼저 등록하면 여기서 이름으로 선택할 수 있습니다.
        </div>
      ) : (
        <div className="flex gap-2">
          <select value={pick} onChange={e => setPick(e.target.value)} className="flex-1 px-3 py-2 rounded-lg text-[13px]" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', outline: 'none' }}>
            <option value="">구성원 선택...</option>
            {available.map(m => <option key={m.id} value={m.id}>{m.name} ({m.dept || '-'} · {m.role === 'MANAGER' ? '매니저/RA' : m.role === 'INSPECTOR' ? '검사관' : '작업자'})</option>)}
          </select>
          <button onClick={addFromList} disabled={!pick} className="px-4 py-2 rounded-lg text-[13px] font-medium disabled:opacity-40" style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: pick ? 'pointer' : 'not-allowed' }}>추가</button>
        </div>
      )}
      <button onClick={() => setShowManual(v => !v)} className="text-[11.5px]" style={{ background: 'none', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', textDecoration: 'underline' }}>
        {showManual ? '이메일 직접 추가 닫기' : '구성원 목록에 없는 경우 이메일로 직접 추가'}
      </button>
      {showManual && (
        <div className="flex gap-2">
          <input value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && addManual()} placeholder="이메일 입력 후 Enter 또는 추가 클릭" className="flex-1 px-3 py-2 rounded-lg text-[13px]" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', outline: 'none' }} />
          <button onClick={addManual} className="px-4 py-2 rounded-lg text-[13px] font-medium" style={{ background: 'var(--bg-soft)', color: 'var(--ink)', border: '1px solid var(--line)', cursor: 'pointer' }}>추가</button>
        </div>
      )}
      {authors.length === 0 ? (
        <div className="text-[12.5px] text-center py-4" style={{ color: 'var(--ink-faint)' }}>추가 작성 권한자가 없습니다</div>
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
  const userEmail = user?.email || ''
  const isAdmin = auth.identityKind() === 'operator' || user?.isCompanyAdmin === true
  const [notices, setNotices] = useState(loadNotices)
  const [authors, setAuthors] = useState(loadAuthors)
  const [showSettings, setShowSettings] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [filterType, setFilterType] = useState('all')
  const [searchQ, setSearchQ] = useState('')
  const canEdit = isAdmin || authors.includes(userEmail.toLowerCase())
  const persist = (list) => { setNotices(list); saveNotices(list) }
  const persistAuthors = (list) => { setAuthors(list); saveAuthors(list) }
  const handleSave = (form) => {
    if (editTarget) { persist(notices.map(n => n.id === editTarget.id ? { ...n, ...form, updatedAt: new Date().toISOString() } : n)) }
    else { persist([{ ...form, id: newId(), authorName: user?.name || userEmail, authorEmail: userEmail, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), readBy: [] }, ...notices]) }
    setShowForm(false); setEditTarget(null)
  }
  const handleDelete = (id) => { if (!window.confirm('이 공지를 삭제할까요?')) return; persist(notices.filter(n => n.id !== id)) }
  const handleEdit = (notice) => { setEditTarget(notice); setShowForm(true) }
  const handleToggleActive = (notice) => persist(notices.map(n => n.id === notice.id ? { ...n, isActive: !n.isActive, updatedAt: new Date().toISOString() } : n))
  const handleTogglePin = (notice) => persist(notices.map(n => n.id === notice.id ? { ...n, isPinned: !n.isPinned, updatedAt: new Date().toISOString() } : n))
  const filtered = useMemo(() => {
    let list = [...notices]
    if (filterType !== 'all') list = list.filter(n => n.type === filterType)
    if (searchQ.trim()) { const q = searchQ.toLowerCase(); list = list.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)) }
    return list.sort((a, b) => { if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1; return new Date(b.createdAt) - new Date(a.createdAt) })
  }, [notices, filterType, searchQ])
  const activeCount = notices.filter(n => n.isActive && (!n.expiresAt || new Date(n.expiresAt) >= new Date())).length

  return (
    <AppLayout user={user} title="공지사항" subtitle="ISO 13485 §5.5.3 내부 커뮤니케이션">
      <HubBanner icon={Bell} title="공지사항" subtitle="ISO 13485 §5.5.3 내부 커뮤니케이션" color="indigo" />
      <div className="px-6 lg:px-8 py-6 max-w-[960px] mx-auto space-y-5">
        <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #3B82F608, #10B98108)', border: '1px solid var(--line)' }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#3B82F615' }}><Megaphone size={20} style={{ color: '#3B82F6' }} /></div>
              <div>
                <div className="font-bold text-[16px]" style={{ color: 'var(--ink)' }}>내부 공지·알림</div>
                <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>활성 공지 {activeCount}건 · ISO 13485 §5.5.3</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && <button onClick={() => setShowSettings(v => !v)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px]" style={{ background: showSettings ? 'var(--moss)' : 'var(--bg-soft)', color: showSettings ? '#fff' : 'var(--ink-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}><Shield size={13} /> 권한 관리</button>}
              {canEdit && <button onClick={() => { setEditTarget(null); setShowForm(true) }} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium" style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}><Plus size={14} /> 공지 작성</button>}
            </div>
          </div>
        </div>

        {showSettings && isAdmin && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
            <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--line)' }}><Shield size={15} style={{ color: 'var(--ink-soft)' }} /><span className="font-semibold text-[14px]" style={{ color: 'var(--ink)' }}>공지 작성 권한 관리</span></div>
            <div className="p-5"><AuthorPanel authors={authors} onUpdate={persistAuthors} /></div>
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1.5">
            {[['all', '전체'], ...NOTICE_TYPES.map(t => [t.value, t.label])].map(([v, l]) => (
              <button key={v} onClick={() => setFilterType(v)} className="text-[12px] px-3 py-1.5 rounded-lg transition" style={{ background: filterType === v ? 'var(--moss)' : 'var(--bg-soft)', color: filterType === v ? '#fff' : 'var(--ink-soft)', border: filterType === v ? '1.5px solid var(--moss)' : '1.5px solid var(--line)', cursor: 'pointer', fontWeight: filterType === v ? 600 : 400 }}>{l}</button>
            ))}
          </div>
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="제목·내용 검색..." className="px-3 py-1.5 rounded-lg text-[12.5px]" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', outline: 'none', minWidth: 180 }} />
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl flex flex-col items-center py-16" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
            <Bell size={36} style={{ color: 'var(--ink-faint)', opacity: 0.4, marginBottom: 12 }} />
            <div className="text-[14px] font-medium" style={{ color: 'var(--ink-soft)' }}>{searchQ || filterType !== 'all' ? '검색 결과가 없습니다' : '등록된 공지가 없습니다'}</div>
            {canEdit && !searchQ && filterType === 'all' && <button onClick={() => { setEditTarget(null); setShowForm(true) }} className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px]" style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}><Plus size={14} /> 첫 공지 작성</button>}
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
