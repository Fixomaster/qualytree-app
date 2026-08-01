import React, { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  GraduationCap,
  Users,
  Plus,
  Trash2,
  Paperclip,
  Download,
  CheckCircle2,
  ChevronRight,
  X,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import { permissions, requirePermission } from '../../lib/permissions'
import { plans, sessions, employees, PLAN_STATUS, QUALIFICATION_RESULT } from '../../lib/trainingState'
import { fileStore } from '../../lib/fileStore'

export default function TrainingHub() {
  const user = auth.current()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState(() => searchParams.get('tab') || 'plan') // plan | session
  const [tick, setTick] = useState(0)
  const refresh = () => setTick((x) => x + 1)
  const [toast, setToast] = useState(null)
  const showToast = (t) => { setToast(t); setTimeout(() => setToast(null), 2400) }

  const allPlans = plans.getAll()
  const allSessions = sessions.getAll()
  const compliance = sessions.complianceRate()

  return (
    <AppLayout user={user} title="교육훈련" subtitle="연간교육계획 / 교육자료 / 교육 실시·평가·참석기록">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto fade-in">
        {toast && (
          <div className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-lg text-[13px] flex items-center gap-2 fade-in"
            style={{ background: 'var(--moss)', color: 'var(--bg)', boxShadow: '0 6px 20px rgba(15,26,20,0.18)', fontWeight: 500 }}>
            ✓ {toast}
          </div>
        )}

        <div className="mb-5">
          <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--moss)' }}>TRN · TRAINING</span>
          <div className="font-display text-[26px] mt-1" style={{ color: 'var(--ink)', fontWeight: 500 }}>교육훈련</div>
          <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>
            ISO 13485 §6.2 / FDA QMSR §820.25 — 연간계획 승인부터 교육자료·참석기록·평가까지 관리합니다.
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-5">
          <StatCard label="연간계획" value={allPlans.length} hint="등록 연도 수" icon={GraduationCap} />
          <StatCard label="교육 이수율" value={compliance == null ? '—' : compliance + '%'} hint="완료 세션 기준 합격률" icon={Users} tone={compliance != null && compliance < 80 ? 'amber' : undefined} />
        </div>

        <div className="flex gap-1 mb-5 overflow-x-auto" style={{ borderBottom: '1px solid var(--line)' }}>
          <TabButton active={tab === 'plan'} onClick={() => setTab('plan')} icon={GraduationCap} label="연간교육계획" en="ANNUAL PLAN" count={allPlans.length} />
          <TabButton active={tab === 'session'} onClick={() => setTab('session')} icon={Users} label="교육 · 평가 · 참석기록" en="SESSIONS" count={allSessions.length} />
        </div>

        {tab === 'plan' && <PlanTab key={tick} plans={allPlans} onAction={showToast} refresh={refresh} />}
        {tab === 'session' && <SessionTab key={tick} sessions={allSessions} onAction={showToast} refresh={refresh} />}
      </div>
    </AppLayout>
  )
}

/* ================================================================
   공통 UI
   ================================================================ */
function StatCard({ label, value, hint, icon: Icon, tone }) {
  return (
    <div className="card-base p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: tone === 'amber' ? 'var(--amber-soft)' : 'var(--leaf-soft)', color: tone === 'amber' ? 'var(--amber)' : 'var(--moss)' }}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <div className="text-[11.5px]" style={{ color: 'var(--ink-mute)' }}>{label}</div>
        <div className="text-[20px] font-bold tabular-nums" style={{ color: 'var(--ink)' }}>{value}</div>
        <div className="text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>{hint}</div>
      </div>
    </div>
  )
}
function TabButton({ active, onClick, icon: Icon, label, en, count }) {
  return (
    <button onClick={onClick} className="px-4 py-2.5 rounded-t-lg flex items-center gap-2 text-[13px] transition shrink-0"
      style={{ background: active ? 'var(--bg-card)' : 'transparent', borderBottom: active ? '2px solid var(--moss)' : '2px solid transparent', color: active ? 'var(--ink)' : 'var(--ink-mute)', fontWeight: active ? 500 : 400 }}>
      <Icon size={14} />
      <span>{label}</span>
      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: active ? 'var(--leaf-soft)' : 'var(--bg-soft)', color: active ? 'var(--moss)' : 'var(--ink-faint)' }}>{count}</span>
      <span className="font-mono text-[9.5px] tracking-wider" style={{ color: 'var(--ink-faint)' }}>{en}</span>
    </button>
  )
}
function Field({ label, value, onChange, placeholder, type = 'text', className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>{label}</span>
      <input type={type} className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13 }} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}
function SelectField({ label, value, onChange, options, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>{label}</span>
      <select className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13 }} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
    </label>
  )
}
function EmptyState({ icon: Icon, text }) {
  return (
    <div className="card-base p-8 text-center" style={{ borderStyle: 'dashed' }}>
      <Icon size={28} style={{ color: 'var(--ink-faint)', margin: '0 auto' }} strokeWidth={1.4} />
      <div className="mt-2 text-[13px]" style={{ color: 'var(--ink-mute)' }}>{text}</div>
    </div>
  )
}
function Badge({ text, tone = 'slate' }) {
  const map = {
    emerald: { bg: 'var(--leaf-soft)', fg: 'var(--moss)' },
    amber: { bg: 'var(--amber-soft)', fg: 'var(--amber)' },
    rose: { bg: '#fdecec', fg: '#c0392b' },
    sky: { bg: '#dbeafe', fg: '#1d4ed8' },
    slate: { bg: 'var(--bg-soft)', fg: 'var(--ink-mute)' },
  }
  const c = map[tone] || map.slate
  return <span className="text-[10.5px] px-1.5 py-0.5 rounded font-semibold" style={{ background: c.bg, color: c.fg }}>{text}</span>
}

/* ================================================================
   연간교육계획
   ================================================================ */
function PlanTab({ plans: allPlans, onAction, refresh }) {
  const canEdit = permissions.can('training.plan.edit')
  const canApprove = permissions.can('training.plan.approve')
  const existingYears = allPlans.map((p) => p.year)
  // 현재 연도가 이미 존재하면(가장 흔한 케이스) 다음 빈 연도를 기본값으로 제안 —
  // 기본값이 기존 연도와 충돌해 '생성'을 눌러도 조용히 실패하는 것처럼 보이던 문제 수정.
  const suggestedYear = existingYears.length ? Math.max(...existingYears) + 1 : new Date().getFullYear()
  const [newYear, setNewYear] = useState(suggestedYear)
  const yearTaken = existingYears.includes(Number(newYear))

  const create = () => {
    if (!requirePermission('training.plan.edit')) return
    try {
      plans.add(Number(newYear))
      onAction(`${newYear}년 계획이 생성되었습니다.`)
      refresh()
    } catch (e) {
      window.alert((e && e.message) || String(e))
    }
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div>
          <div className="flex items-center gap-2">
            <Field label="연도" type="number" value={newYear} onChange={setNewYear} className="w-32" />
            <button onClick={create} disabled={yearTaken} className="btn-primary text-[12.5px] mt-5" style={yearTaken ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}><Plus size={13} /> 연간계획 생성</button>
          </div>
          {yearTaken && (
            <div className="text-[11.5px] mt-1.5" style={{ color: 'var(--rust)' }}>{newYear}년 계획이 이미 존재합니다. 다른 연도를 입력하세요.</div>
          )}
        </div>
      )}
      {allPlans.length === 0 && <EmptyState icon={GraduationCap} text="등록된 연간교육계획이 없습니다." />}
      {allPlans.map((p) => (
        <PlanCard key={p.id} plan={p} canEdit={canEdit} canApprove={canApprove} onAction={onAction} refresh={refresh} />
      ))}
    </div>
  )
}

const QUARTER_OPTIONS = ['Q1', 'Q2', 'Q3', 'Q4']
const TRAINING_KIND_OPTIONS = ['내부교육', '외부교육']

function sortPlanItems(items) {
  return items.slice().sort((a, b) => {
    const qa = QUARTER_OPTIONS.indexOf(a.quarter)
    const qb = QUARTER_OPTIONS.indexOf(b.quarter)
    if (qa !== qb) return qa - qb
    return (a.plannedDate || '').localeCompare(b.plannedDate || '')
  })
}

function PlanCard({ plan, canEdit, canApprove, onAction, refresh }) {
  const EMPTY = { topic: '', targetRole: '', quarter: 'Q1', plannedDate: '', trainingKind: '내부교육' }
  const [form, setForm] = useState(EMPTY)
  const [kindFilter, setKindFilter] = useState('all')
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const editable = canEdit && plan.status === PLAN_STATUS.DRAFT

  const addItem = () => {
    if (!requirePermission('training.plan.edit')) return
    if (!form.topic.trim()) { window.alert('교육 주제를 입력하세요.'); return }
    plans.addItem(plan.id, form)
    setForm(EMPTY)
    onAction('교육 항목이 추가되었습니다.')
    refresh()
  }
  const removeItem = (itemId) => {
    if (!requirePermission('training.plan.edit')) return
    plans.removeItem(plan.id, itemId)
    refresh()
  }
  const approve = () => {
    if (!requirePermission('training.plan.approve')) return
    const cur = auth.current()
    plans.approve(plan.id, cur?.name || '승인자')
    onAction(`${plan.year}년 계획이 승인되었습니다.`)
    refresh()
  }

  const sortedItems = sortPlanItems(plan.items).filter((it) => kindFilter === 'all' || (it.trainingKind || '내부교육') === kindFilter)
  const internalCount = plan.items.filter((it) => (it.trainingKind || '내부교육') === '내부교육').length
  const externalCount = plan.items.filter((it) => it.trainingKind === '외부교육').length

  return (
    <div className="card-base p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>{plan.year}텄 교육계획</div>
        <Badge text={plan.status} tone={plan.status === PLAN_STATUS.APPROVED ? 'emerald' : 'slate'} />
      </div>

      {plan.items.length > 0 && (
        <div className="flex items-center gap-1.5 mb-2.5">
          <button onClick={() => setKindFilter('all')} className="text-[11px] px-2.5 py-1 rounded-full transition"
            style={{ background: kindFilter === 'all' ? 'var(--ink)' : 'var(--bg-soft)', color: kindFilter === 'all' ? '#fff' : 'var(--ink-mute)' }}>
            전체 {plan.items.length}
          </button>
          <button onClick={() => setKindFilter('내부교육')} className="text-[11px] px-2.5 py-1 rounded-full transition"
            style={{ background: kindFilter === '내부교육' ? 'var(--moss)' : 'var(--bg-soft)', color: kindFilter === '내부교육' ? '#fff' : 'var(--ink-mute)' }}>
            내부교육 {internalCount}
          </button>
          <button onClick={() => setKindFilter('외부교육')} className="text-[11px] px-2.5 py-1 rounded-full transition"
            style={{ background: kindFilter === '외부교육' ? '#2563EB' : 'var(--bg-soft)', color: kindFilter === '외부교육' ? '#fff' : 'var(--ink-mute)' }}>
            외부교육 {externalCount}
          </button>
        </div>
      )}

      <div className="space-y-1.5 mb-3">
        {sortedItems.map((it) => (
          <div key={it.id} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
            <div className="text-[12.5px]" style={{ color: 'var(--ink)' }}>
              <b>{it.quarter}</b> · {it.topic}{' '}
              <Badge text={it.trainingKind || '내부교육'} tone={(it.trainingKind || '내부교육') === '외부교육' ? 'sky' : 'emerald'} />
              <span style={{ color: 'var(--ink-faint)' }}> · 대상 {it.targetRole || '전체'}{it.plannedDate ? ` · ${it.plannedDate}` : ''}</span>
            </div>
            {editable && <button onClick={() => removeItem(it.id)} className="text-slate-300 hover:text-rose-600"><Trash2 size={13} /></button>}
          </div>
        ))}
        {plan.items.length === 0 && <div className="text-[12px] text-center py-3" style={{ color: 'var(--ink-faint)' }}>등록된 교육 항목이 없습니다.</div>}
        {plan.items.length > 0 && sortedItems.length === 0 && <div className="text-[12px] text-center py-3" style={{ color: 'var(--ink-faint)' }}>해당 구분의 교육 항목이 없습니다.</div>}
      </div>

      {editable && (
        <div className="rounded-lg p-3 mb-2" style={{ background: 'var(--bg-soft)' }}>
          <div className="grid sm:grid-cols-4 gap-2">
            <Field label="교육 주제" value={form.topic} onChange={(v) => setF('topic', v)} className="sm:col-span-2" />
            <SelectField label="분기" value={form.quarter} onChange={(v) => setF('quarter', v)} options={QUARTER_OPTIONS} />
            <Field label="예정일" type="date" value={form.plannedDate} onChange={(v) => setF('plannedDate', v)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-2 mt-2">
            <Field label="대상" value={form.targetRole} onChange={(v) => setF('targetRole', v)} placeholder="예: 전체 / 품질팀 / 신입" />
            <SelectField label="구분" value={form.trainingKind} onChange={(v) => setF('trainingKind', v)} options={TRAINING_KIND_OPTIONS} />
          </div>
          <div className="flex justify-end mt-2"><button onClick={addItem} className="btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: 12.5 }}><Plus size={13} /> 항목 추가</button></div>
        </div>
      )}

      {plan.status === PLAN_STATUS.DRAFT ? (
        canApprove && <div className="flex justify-end"><button onClick={approve} disabled={plan.items.length === 0} className="btn-primary text-[12.5px]"><CheckCircle2 size={14} /> 계획 승인</button></div>
      ) : (
        <div className="text-[12px]" style={{ color: 'var(--moss)' }}><CheckCircle2 size={13} className="inline mr-1" /> {plan.approvedBy} 승인 · {plan.approvedAt ? new Date(plan.approvedAt).toLocaleString('ko-KR') : ''}</div>
      )}
    </div>
  )
}

/* ================================================================
   교육자료
   ================================================================ */
// 홆페이지(qualy-tree.com)에 표기된 대응 규제·표준과 백서 주제 — 교육자료 등록 시 빠른 선택용 추천값
const SUGGESTED_CATEGORIES = ['ISO 13485:2016', 'FDA QMSR', 'EU MDR', 'KGMP', '21 CFR Part 11', 'GAMP 5']
const SUGGESTED_TITLES = [
  'MDR 전환 가이드',
  'KGMP↔QMSR 매핑표',
  'ISO 13485 신규 입사자 기초교육',
  '21 CFR Part 11 전자기록·전자서명 교육',
]

/* ================================================================
   교육 · 평가 · 참석기록
   ================================================================ */
function SessionTab({ sessions: allSessions, onAction, refresh }) {
  const canEdit = permissions.can('training.session.edit')
  const [selId, setSelId] = useState(allSessions[0]?.id || null)
  const sel = allSessions.find((s) => s.id === selId) || null
  const EMPTY = { topic: '', date: '', instructor: '', evaluationMethod: '', status: '예정' }
  const [form, setForm] = useState(EMPTY)
  const [adding, setAdding] = useState(allSessions.length === 0)
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const create = () => {
    if (!requirePermission('training.session.edit')) return
    if (!form.topic.trim()) { window.alert('교육 주제를 입력하세요.'); return }
    const rec = sessions.add(form)
    setSelId(rec.id)
    setForm(EMPTY)
    setAdding(false)
    onAction('교육이 등록되었습니다.')
    refresh()
  }
  const del = (id) => {
    if (!requirePermission('training.session.edit')) return
    if (!window.confirm('이 교육 기록을 삭제할까요?')) return
    sessions.delete(id)
    setSelId(null)
    onAction('교육 기록이 삭제되었습니다.')
    refresh()
  }

  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[12.5px] font-medium" style={{ color: 'var(--ink)' }}>교육 목록 ({allSessions.length}건)</div>
          {canEdit && <button onClick={() => setAdding((v) => !v)} className="inline-flex items-center gap-1 text-[12px] font-medium" style={{ color: 'var(--moss)' }}><Plus size={13} /> 교육 등록</button>}
        </div>
        {adding && canEdit && (
          <div className="card-base p-3 mb-3 space-y-2">
            <Field label="주제" value={form.topic} onChange={(v) => setF('topic', v)} />
            <Field label="일시" type="date" value={form.date} onChange={(v) => setF('date', v)} />
            <Field label="강사" value={form.instructor} onChange={(v) => setF('instructor', v)} />
            <SelectField label="평가 방법" value={form.evaluationMethod} onChange={(v) => setF('evaluationMethod', v)} options={['필기시험', '실습평가', '구술평가', '현장관찰평가', '설문·만족도평가']} />
            <SelectField label="상태" value={form.status} onChange={(v) => setF('status', v)} options={['예정', '완료']} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setAdding(false)} className="btn-ghost" style={{ padding: '0.4rem 0.8rem', fontSize: 12.5 }}>취소</button>
              <button onClick={create} className="btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: 12.5 }}>저장</button>
            </div>
          </div>
        )}
        <div className="space-y-1.5">
          {allSessions.map((s) => (
            <button key={s.id} onClick={() => setSelId(s.id)} className="w-full text-left px-3 py-2.5 rounded-lg border flex items-center gap-2 transition"
              style={{ borderColor: s.id === selId ? 'var(--moss)' : 'var(--line)', background: s.id === selId ? 'var(--leaf-soft)' : 'var(--bg-card)' }}>
              <Users size={14} style={{ color: 'var(--moss)' }} />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium truncate" style={{ color: 'var(--ink)' }}>{s.topic}</span>
                <span className="block text-[11px]" style={{ color: 'var(--ink-faint)' }}>{s.date || '일정 미정'} · {s.status} · 참석 {s.attendees.length}명</span>
              </span>
              <ChevronRight size={14} style={{ color: 'var(--ink-faint)' }} />
            </button>
          ))}
          {allSessions.length === 0 && !adding && <EmptyState icon={Users} text="등록된 교육이 없습니다." />}
        </div>
      </div>
      <div>
        {sel ? <SessionDetailPanel session={sel} canEdit={canEdit} onAction={onAction} onDelete={() => del(sel.id)} refresh={refresh} /> : <EmptyState icon={Users} text="좌측에서 교육을 선택하세요." />}
      </div>
    </div>
  )
}

function SessionDetailPanel({ session, canEdit, onAction, onDelete, refresh }) {
  const [status, setStatus] = useState(session.status)
  const [attForm, setAttForm] = useState({ name: '', dept: '', score: '', passed: true })
  const setAF = (k, v) => setAttForm((f) => ({ ...f, [k]: v }))
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  const saveStatus = (v) => {
    if (!requirePermission('training.session.edit')) return
    sessions.update(session.id, { status: v })
    setStatus(v)
    onAction('교육 상태가 저장되었습니다.')
    refresh()
  }

  const uploadAttachment = async (e) => {
    const f = e.target.files && e.target.files[0]
    e.target.value = ''
    if (!f) return
    if (!requirePermission('training.session.edit')) return
    setUploading(true)
    try {
      const fileId = await fileStore.saveFile(f)
      sessions.addAttachment(session.id, { fileId, fileName: f.name })
      onAction('교육 자료가 첨부되었습니다.')
      refresh()
    } catch (err) {
      window.alert((err && err.message) || String(err))
    } finally {
      setUploading(false)
    }
  }
  const openAttachment = async (fileId) => {
    const url = await fileStore.getObjectURL(fileId)
    if (!url) { window.alert('파일을 찾을 수 없습니다.'); return }
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  }
  const removeAttachment = (attachmentId) => {
    if (!requirePermission('training.session.edit')) return
    sessions.removeAttachment(session.id, attachmentId)
    onAction('첨부파일이 삭제되었습니다.')
    refresh()
  }

  const addAttendee = () => {
    if (!requirePermission('training.session.edit')) return
    if (!attForm.name.trim()) { window.alert('참석자 성명을 입력하세요.'); return }
    sessions.addAttendee(session.id, attForm)
    setAttForm({ name: '', dept: '', score: '', passed: true })
    onAction('참석기록이 저장되었습니다.')
    refresh()
  }
  const removeAttendee = (id) => {
    if (!requirePermission('training.session.edit')) return
    sessions.removeAttendee(session.id, id)
    refresh()
  }

  return (
    <div className="space-y-4">
      <div className="card-base p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>{session.topic}</div>
          {canEdit && <button onClick={onDelete} className="text-[12px] inline-flex items-center gap-1" style={{ color: 'var(--rust)' }}><Trash2 size={13} /> 삭제</button>}
        </div>
        <div className="text-[12px]" style={{ color: 'var(--ink-mute)' }}>일시 {session.date || '—'} · 강사 {session.instructor || '—'} · 평가방법 {session.evaluationMethod || '—'}</div>
        {canEdit && (
          <div className="mt-2">
            <SelectField label="상태" value={status} onChange={saveStatus} options={['예정', '완료']} className="max-w-[160px]" />
          </div>
        )}
      </div>

      <div className="card-base p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>교육 자료 첨부 ({(session.attachments || []).length}건)</div>
          {canEdit && (
            <>
              <input ref={fileRef} type="file" className="hidden" onChange={uploadAttachment} />
              <button onClick={() => fileRef.current && fileRef.current.click()} disabled={uploading} className="btn-ghost text-[12px]">
                <Paperclip size={12} /> {uploading ? '업로드 중…' : '파일 첨부'}
              </button>
            </>
          )}
        </div>
        {(session.attachments || []).length === 0 ? (
          <div className="text-[12px] text-center py-3" style={{ color: 'var(--ink-faint)' }}>완료 시 수료증·서명부·발표자료 등을 첨부하세요.</div>
        ) : (
          <div className="space-y-1.5">
            {(session.attachments || []).map((a) => (
              <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
                <button onClick={() => openAttachment(a.fileId)} className="inline-flex items-center gap-1.5 text-[12.5px] min-w-0" style={{ color: 'var(--ink)' }}>
                  <Download size={12} style={{ color: 'var(--moss)' }} /> <span className="truncate">{a.fileName}</span>
                </button>
                {canEdit && <button onClick={() => removeAttachment(a.id)} className="text-slate-300 hover:text-rose-600 shrink-0"><Trash2 size={13} /></button>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card-base p-4">
        <div className="text-[13.5px] font-semibold mb-2" style={{ color: 'var(--ink)' }}>참석기록 · 교육평가 ({session.attendees.length}명)</div>
        {canEdit && (
          <div className="rounded-lg p-3 mb-3" style={{ background: 'var(--bg-soft)' }}>
            <div className="grid sm:grid-cols-4 gap-2">
              <Field label="성명" value={attForm.name} onChange={(v) => setAF('name', v)} />
              <Field label="부서" value={attForm.dept} onChange={(v) => setAF('dept', v)} />
              <Field label="점수/평가" value={attForm.score} onChange={(v) => setAF('score', v)} placeholder="예: 92 또는 우수" />
              <SelectField label="합격 여부" value={attForm.passed ? 'pass' : 'fail'} onChange={(v) => setAF('passed', v === 'pass')} options={[{ value: 'pass', label: '합격' }, { value: 'fail', label: '불합격' }]} />
            </div>
            <div className="flex justify-end mt-2"><button onClick={addAttendee} className="btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: 12.5 }}><Plus size={13} /> 참석기록 추가</button></div>
          </div>
        )}
        <div className="space-y-1.5">
          {session.attendees.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
              <div className="text-[12.5px]" style={{ color: 'var(--ink)' }}>
                {a.name} <span style={{ color: 'var(--ink-faint)' }}>· {a.dept || '부서 미기록'} · {a.score || '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge text={a.passed ? '합격' : '불합격'} tone={a.passed ? 'emerald' : 'rose'} />
                {canEdit && <button onClick={() => removeAttendee(a.id)} className="text-slate-300 hover:text-rose-600"><X size={13} /></button>}
              </div>
            </div>
          ))}
          {session.attendees.length === 0 && <div className="text-[12px] text-center py-3" style={{ color: 'var(--ink-faint)' }}>참석기록이 없습니다.</div>}
        </div>
      </div>
    </div>
  )
}

/* ================================================================
   직원 역량평가 · 자격관리 (ISO 13485 §6.2)
   ================================================================ */
function EmployeeDetail({ employee, canEdit, onAction, onDelete, refresh }) {
  const [form, setForm] = useState({ dept: employee.dept, position: employee.position, hireDate: employee.hireDate, requiredCompetency: employee.requiredCompetency })
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const [certForm, setCertForm] = useState({ name: '', issuer: '', number: '', issuedAt: '', expiresAt: '' })
  const setCF = (k, v) => setCertForm((f) => ({ ...f, [k]: v }))
  const certFileRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [evalForm, setEvalForm] = useState({ date: new Date().toISOString().slice(0, 10), evaluator: '', method: '', result: QUALIFICATION_RESULT.QUALIFIED, notes: '' })
  const setEF = (k, v) => setEvalForm((f) => ({ ...f, [k]: v }))

  const saveProfile = () => {
    if (!requirePermission('training.competency.edit')) return
    employees.update(employee.id, form)
    onAction('직원 정보가 저장되었습니다.')
    refresh()
  }

  const uploadCert = async (e) => {
    const f = e.target.files && e.target.files[0]
    e.target.value = ''
    if (!f) return
    if (!certForm.name.trim()) { window.alert('자격증/면허명을 먼저 입력하세요.'); return }
    setBusy(true)
    try {
      const fileId = await fileStore.saveFile(f)
      employees.addCertification(employee.id, { ...certForm, fileId, fileName: f.name })
      setCertForm({ name: '', issuer: '', number: '', issuedAt: '', expiresAt: '' })
      onAction('자격증이 등록되었습니다.')
      refresh()
    } catch (err) {
      window.alert((err && err.message) || String(err))
    } finally {
      setBusy(false)
    }
  }
  const addCertNoFile = () => {
    if (!requirePermission('training.competency.edit')) return
    if (!certForm.name.trim()) { window.alert('자격증/면허명을 입력하세요.'); return }
    employees.addCertification(employee.id, certForm)
    setCertForm({ name: '', issuer: '', number: '', issuedAt: '', expiresAt: '' })
    onAction('자격증이 등록되었습니다.')
    refresh()
  }
  const removeCert = (id) => {
    if (!requirePermission('training.competency.edit')) return
    employees.removeCertification(employee.id, id)
    refresh()
  }
  const openCertFile = async (fileId) => {
    const url = await fileStore.getObjectURL(fileId)
    if (!url) { window.alert('파일을 찾을 수 없습니다.'); return }
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  }

  const addEval = () => {
    if (!requirePermission('training.competency.edit')) return
    employees.addEvaluation(employee.id, evalForm)
    setEvalForm({ date: new Date().toISOString().slice(0, 10), evaluator: '', method: '', result: QUALIFICATION_RESULT.QUALIFIED, notes: '' })
    onAction('역량평가 기록이 저장되었습니다.')
    refresh()
  }
  const removeEval = (id) => {
    if (!requirePermission('training.competency.edit')) return
    employees.removeEvaluation(employee.id, id)
    refresh()
  }

  const today = new Date()
  const isExpiringSoon = (dateStr) => {
    if (!dateStr) return false
    const d = new Date(dateStr)
    const diffDays = (d - today) / 86400000
    return diffDays >= 0 && diffDays <= 60
  }
  const isExpired = (dateStr) => !!dateStr && new Date(dateStr) < today

  return (
    <div className="space-y-4">
      <div className="card-base p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>{employee.name}</div>
          {canEdit && <button onClick={onDelete} className="text-[12px] inline-flex items-center gap-1" style={{ color: 'var(--rust)' }}><Trash2 size={13} /> 삭제</button>}
        </div>
        {canEdit ? (
          <>
            <div className="grid sm:grid-cols-3 gap-2">
              <Field label="부서" value={form.dept} onChange={(v) => setF('dept', v)} />
              <Field label="직책/직무" value={form.position} onChange={(v) => setF('position', v)} />
              <Field label="입사일" type="date" value={form.hireDate} onChange={(v) => setF('hireDate', v)} />
            </div>
            <Field label="필요 역량·자격 요건" value={form.requiredCompetency} onChange={(v) => setF('requiredCompetency', v)} className="mt-2" placeholder="예: 품질경영시스템 내부심사원 자격, 전기안전 시험 자격 등" />
            <div className="flex justify-end mt-2"><button onClick={saveProfile} className="btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: 12.5 }}>정보 저장</button></div>
          </>
        ) : (
          <div className="text-[12px]" style={{ color: 'var(--ink-mute)' }}>{employee.dept || '—'} · {employee.position || '—'} · 필요 역량: {employee.requiredCompetency || '—'}</div>
        )}
      </div>

      <div className="card-base p-4">
        <div className="text-[13.5px] font-semibold mb-2" style={{ color: 'var(--ink)' }}>자격증 · 면허 ({(employee.certifications || []).length}건)</div>
        {canEdit && (
          <div className="rounded-lg p-3 mb-3" style={{ background: 'var(--bg-soft)' }}>
            <div className="grid sm:grid-cols-4 gap-2">
              <Field label="자격증/면허명" value={certForm.name} onChange={(v) => setCF('name', v)} className="sm:col-span-2" />
              <Field label="발급기관" value={certForm.issuer} onChange={(v) => setCF('issuer', v)} />
              <Field label="자격번호" value={certForm.number} onChange={(v) => setCF('number', v)} />
            </div>
            <div className="grid sm:grid-cols-2 gap-2 mt-2">
              <Field label="발급일" type="date" value={certForm.issuedAt} onChange={(v) => setCF('issuedAt', v)} />
              <Field label="유효기한" type="date" value={certForm.expiresAt} onChange={(v) => setCF('expiresAt', v)} />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input ref={certFileRef} type="file" className="hidden" onChange={uploadCert} />
              <button onClick={() => certFileRef.current && certFileRef.current.click()} disabled={busy} className="btn-ghost text-[12px]"><Paperclip size={12} /> {busy ? '업로드 중…' : '파일첨부하며 등록'}</button>
              <button onClick={addCertNoFile} className="btn-primary text-[12px]" style={{ padding: '0.35rem 0.8rem' }}><Plus size={12} /> 파일없이 등록</button>
            </div>
          </div>
        )}
        <div className="space-y-1.5">
          {(employee.certifications || []).map((c) => (
            <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg gap-2" style={{ background: 'var(--bg-soft)' }}>
              <div className="text-[12.5px] min-w-0 flex items-center gap-1.5 flex-wrap" style={{ color: 'var(--ink)' }}>
                <span className="font-medium">{c.name}</span>
                <span style={{ color: 'var(--ink-faint)' }}>· {c.issuer || '발급기관 미기록'}{c.expiresAt ? ` · 유효기한 ${c.expiresAt}` : ''}</span>
                {isExpired(c.expiresAt) && <Badge text="만료" tone="rose" />}
                {!isExpired(c.expiresAt) && isExpiringSoon(c.expiresAt) && <Badge text="만료임박" tone="amber" />}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {c.fileId && <button onClick={() => openCertFile(c.fileId)} className="btn-ghost text-[11px]"><Download size={11} /> {c.fileName}</button>}
                {canEdit && <button onClick={() => removeCert(c.id)} className="text-slate-300 hover:text-rose-600"><X size={13} /></button>}
              </div>
            </div>
          ))}
          {(employee.certifications || []).length === 0 && <div className="text-[12px] text-center py-3" style={{ color: 'var(--ink-faint)' }}>등록된 자격증·면허가 없습니다.</div>}
        </div>
      </div>

      <div className="card-base p-4">
        <div className="text-[13.5px] font-semibold mb-2" style={{ color: 'var(--ink)' }}>역량평가 이력 ({(employee.evaluations || []).length}건)</div>
        {canEdit && (
          <div className="rounded-lg p-3 mb-3" style={{ background: 'var(--bg-soft)' }}>
            <div className="grid sm:grid-cols-4 gap-2">
              <Field label="평가일" type="date" value={evalForm.date} onChange={(v) => setEF('date', v)} />
              <Field label="평가자" value={evalForm.evaluator} onChange={(v) => setEF('evaluator', v)} />
              <Field label="평가방법" value={evalForm.method} onChange={(v) => setEF('method', v)} placeholder="예: 필기 / 실기 / OJT관찰" />
              <SelectField label="평가결과" value={evalForm.result} onChange={(v) => setEF('result', v)} options={Object.values(QUALIFICATION_RESULT)} />
            </div>
            <Field label="비고" value={evalForm.notes} onChange={(v) => setEF('notes', v)} className="mt-2" placeholder="평가 근거·특이사항" />
            <div className="flex justify-end mt-2"><button onClick={addEval} className="btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: 12.5 }}><Plus size={13} /> 평가 기록 추가</button></div>
          </div>
        )}
        <div className="space-y-1.5">
          {(employee.evaluations || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((v) => (
            <div key={v.id} className="flex items-center justify-between p-2.5 rounded-lg gap-2" style={{ background: 'var(--bg-soft)' }}>
              <div className="text-[12.5px] min-w-0" style={{ color: 'var(--ink)' }}>
                {v.date} · {v.method || '평가방법 미기록'} <span style={{ color: 'var(--ink-faint)' }}>· 평가자 {v.evaluator || '—'}{v.notes ? ` · ${v.notes}` : ''}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge text={v.result} tone={v.result === QUALIFICATION_RESULT.QUALIFIED ? 'emerald' : v.result === QUALIFICATION_RESULT.CONDITIONAL ? 'amber' : 'rose'} />
                {canEdit && <button onClick={() => removeEval(v.id)} className="text-slate-300 hover:text-rose-600"><X size={13} /></button>}
              </div>
            </div>
          ))}
          {(employee.evaluations || []).length === 0 && <div className="text-[12px] text-center py-3" style={{ color: 'var(--ink-faint)' }}>등록된 평가 기록이 없습니다.</div>}
        </div>
      </div>
    </div>
  )
}
