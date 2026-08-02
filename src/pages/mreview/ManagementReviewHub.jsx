import React, { useState, useRef } from 'react'
import {
  ClipboardList,
  Plus,
  Trash2,
  CheckCircle2,
  ChevronRight,
  Gauge,
  FileText,
  Paperclip,
  Download,
  X,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import HubBanner from '../../components/HubBanner'
import { permissions, requirePermission } from '../../lib/permissions'
import { fileStore } from '../../lib/fileStore'
import {
  reviews,
  REVIEW_STATUS,
} from '../../lib/managementReviewState'

export default function ManagementReviewHub() {
  const user = auth.current()
  const [tick, setTick] = useState(0)
  const refresh = () => setTick((x) => x + 1)
  const [toast, setToast] = useState(null)
  const showToast = (t) => { setToast(t); setTimeout(() => setToast(null), 2400) }

  const allReviews = reviews.getAll()

  return (
    <AppLayout user={user} title="경영검토" subtitle="품질목표 / 경영검토 기록">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto fade-in">
        {toast && (
          <div className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-lg text-[13px] flex items-center gap-2 fade-in"
            style={{ background: 'var(--moss)', color: 'var(--bg)', boxShadow: '0 6px 20px rgba(15,26,20,0.18)', fontWeight: 500 }}>
            ✓ {toast}
          </div>
        )}

        <HubBanner
          title="경영검토"
          subtitle="ISO 13485 §5.6 / FDA QMSR §820.20(c) — KPI·품질목표·CAPA현황 자동집계"
          icon={ClipboardList}
          color="#6366F1"
          workflow={['KPI 집계', '품질목표 검토', '실행항목 수립', '승인·기록']}
        />

        
        
        <ReviewTab key={tick} reviewList={allReviews} onAction={showToast} refresh={refresh} />
      </div>
    </AppLayout>
  )
}

/* ================================================================ 공통 UI ================================================================ */
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
function TextAreaField({ label, value, onChange, placeholder, minHeight = 80, className = '', disabled = false }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>{label}</span>
      <textarea className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13, minHeight }} value={value} placeholder={placeholder} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
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
    slate: { bg: 'var(--bg-soft)', fg: 'var(--ink-mute)' },
  }
  const c = map[tone] || map.slate
  return <span className="text-[10.5px] px-1.5 py-0.5 rounded font-semibold" style={{ background: c.bg, color: c.fg }}>{text}</span>
}

/* ================================================================ 경영검토 기록 ================================================================ */
function ReviewTab({ reviewList, onAction, refresh }) {
  const canEdit = permissions.can('mr.review.edit')
  const [selId, setSelId] = useState(reviewList[0]?.id || null)
  const sel = reviewList.find((r) => r.id === selId) || null
  const [adding, setAdding] = useState(false)
  const EMPTY = { period: '', meetingDate: '', attendees: '', agenda: '' }
  const [form, setForm] = useState(EMPTY)
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const create = () => {
    if (!requirePermission('mr.review.edit')) return
    if (!form.period.trim()) { window.alert('검토 대상 기간을 입력하세요.'); return }
    const rec = reviews.create(form)
    setSelId(rec.id)
    setForm(EMPTY)
    setAdding(false)
    onAction('경영검토가 생성되었습니다 · KPI·품질목표·CAPA현황이 자동 집계되었습니다.')
    refresh()
  }
  const del = (id) => {
    if (!requirePermission('mr.review.edit')) return
    if (!window.confirm('이 경영검토 기록을 삭제할까요?')) return
    reviews.delete(id)
    setSelId(null)
    refresh()
  }

  return (
    <div className="grid lg:grid-cols-[300px_1fr] gap-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[12.5px] font-medium" style={{ color: 'var(--ink)' }}>경영검토 목록 ({reviewList.length}건)</div>
          {canEdit && <button onClick={() => setAdding((v) => !v)} className="inline-flex items-center gap-1 text-[12px] font-medium" style={{ color: 'var(--moss)' }}><Plus size={13} /> 새 경영검토</button>}
        </div>
        {adding && canEdit && (
          <div className="card-base p-3 mb-3 space-y-2">
            <Field label="검토 대상 기간" value={form.period} onChange={(v) => setF('period', v)} placeholder="예: 2026년 상반기" />
            <Field label="회의일" type="date" value={form.meetingDate} onChange={(v) => setF('meetingDate', v)} />
            <Field label="참석자" value={form.attendees} onChange={(v) => setF('attendees', v)} placeholder="쉼표로 구분" />
            <TextAreaField label="안건" value={form.agenda} onChange={(v) => setF('agenda', v)} placeholder="예: 1) QMS 적절성 검토 2) 품질목표 실적 3) CAPA 현황" minHeight={60} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setAdding(false)} className="btn-ghost" style={{ padding: '0.4rem 0.8rem', fontSize: 12.5 }}>취소</button>
              <button onClick={create} className="btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: 12.5 }}>생성 · 자동집계</button>
            </div>
          </div>
        )}
        <div className="space-y-1.5">
          {reviewList.map((r) => (
            <button key={r.id} onClick={() => setSelId(r.id)} className="w-full text-left px-3 py-2.5 rounded-lg border flex items-center gap-2 transition"
              style={{ borderColor: r.id === selId ? 'var(--moss)' : 'var(--line)', background: r.id === selId ? 'var(--leaf-soft)' : 'var(--bg-card)' }}>
              <ClipboardList size={14} style={{ color: 'var(--moss)' }} />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium truncate" style={{ color: 'var(--ink)' }}>{r.period}</span>
                <span className="block text-[11px]" style={{ color: 'var(--ink-faint)' }}>{r.meetingDate || '일정 미정'} · {r.status}</span>
              </span>
              <ChevronRight size={14} style={{ color: 'var(--ink-faint)' }} />
            </button>
          ))}
          {reviewList.length === 0 && !adding && <EmptyState icon={ClipboardList} text="등록된 경영검토가 없습니다." />}
        </div>
      </div>
      <div>
        {sel ? <ReviewDetail review={sel} onAction={onAction} refresh={refresh} onDelete={() => del(sel.id)} /> : <EmptyState icon={ClipboardList} text="왼쪽에서 경영검토를 선택하거나 새로 생성하세요." />}
      </div>
    </div>
  )
}

function ReviewDetail({ review, onAction, refresh, onDelete }) {
  const canEdit = permissions.can('mr.review.edit') && review.status === REVIEW_STATUS.DRAFT
  const canApprove = permissions.can('mr.review.approve') && review.status === REVIEW_STATUS.DRAFT
  const [agenda, setAgenda] = useState(review.agenda || '')
  const [decisions, setDecisions] = useState(review.decisions)
  const [actionForm, setActionForm] = useState({ description: '', owner: '', dueDate: '' })
  const setAF = (k, v) => setActionForm((f) => ({ ...f, [k]: v }))
  const k = review.snapshot.kpi
  const minutesFiles = review.minutesFiles || []

  const saveMinutes = () => {
    if (!requirePermission('mr.review.edit')) return
    const cur = auth.current()
    reviews.update(review.id, { agenda, decisions, preparedBy: cur?.name || '', preparedAt: new Date().toISOString() })
    onAction('회의록이 저장되었습니다.')
    refresh()
  }
  const attachMinutesFile = async (file) => {
    const fileId = await fileStore.saveFile(file)
    reviews.attachMinutesFile(review.id, { fileId, fileName: file.name })
    onAction('회의록 파일이 첨부·보관되었습니다.')
    refresh()
  }
  const removeMinutesFile = (minutesFileId) => {
    if (!requirePermission('mr.review.edit')) return
    if (!window.confirm('이 첨부파일을 삭제할까요?')) return
    reviews.removeMinutesFile(review.id, minutesFileId)
    refresh()
  }
  const addAction = () => {
    if (!requirePermission('mr.review.edit')) return
    if (!actionForm.description.trim()) { window.alert('실행 항목을 입력하세요.'); return }
    reviews.addActionItem(review.id, actionForm)
    setActionForm({ description: '', owner: '', dueDate: '' })
    onAction('실행 항목이 추가되었습니다.')
    refresh()
  }
  const approve = () => {
    if (!requirePermission('mr.review.approve')) return
    const cur = auth.current()
    reviews.approve(review.id, cur?.name || '승인자')
    onAction('경영검토가 승인되었습니다.')
    refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge text={review.status} tone={review.status === REVIEW_STATUS.APPROVED ? 'emerald' : 'slate'} />
        {canEdit && <button onClick={onDelete} className="text-[12px] inline-flex items-center gap-1" style={{ color: 'var(--rust)' }}><Trash2 size={13} /> 삭제</button>}
      </div>

      <div className="card-base p-4">
        <div className="text-[13.5px] font-semibold mb-3" style={{ color: 'var(--ink)' }}><Gauge size={14} className="inline mr-1.5" />KPI 자동 집계 ({new Date(review.snapshot.generatedAt).toLocaleString('ko-KR')} 기준)</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <MiniStat label="NCR 진행중" value={k.ncrOpen} />
          <MiniStat label="CAPA 진행중" value={k.capaOpen} tone="amber" />
          <MiniStat label="CAPA 종결" value={k.capaClosed} tone="emerald" />
          <MiniStat label="교정 기한초과" value={k.calibrationOverdue} tone={k.calibrationOverdue > 0 ? 'amber' : undefined} />
          <MiniStat label="공급자 재평가 도래" value={k.supplierReevalDue} tone={k.supplierReevalDue > 0 ? 'amber' : undefined} />
          <MiniStat label="내부심사 미종결" value={k.auditOpenFindings} tone={k.auditOpenFindings > 0 ? 'amber' : undefined} />
          <MiniStat label="교육 이수율" value={k.trainingCompliance == null ? '—' : k.trainingCompliance + '%'} />
        </div>
      </div>

      {review.snapshot.qualityObjectivesSnapshot.length > 0 && (
        <div className="card-base p-4">
          <div className="text-[13px] font-semibold mb-2" style={{ color: 'var(--ink)' }}>품질목표 스냅샷</div>
          <div className="space-y-1">
            {review.snapshot.qualityObjectivesSnapshot.map((o) => {
              const tone = o.statusKey === 'achieved' || o.statusKey === 'on_track' ? 'emerald' : o.statusKey === 'missed' ? 'rose' : o.statusKey === 'at_risk' ? 'amber' : 'slate'
              return (
                <div key={o.id} className="text-[12px]" style={{ color: 'var(--ink-mute)' }}>{o.objective} — 목표 {o.target}{o.unit} · 실적 {o.actual || '—'}{o.unit} · <Badge text={o.status} tone={tone} /></div>
              )
            })}
          </div>
        </div>
      )}

      <div className="card-base p-4 space-y-3">
        <div className="text-[13px] font-semibold flex items-center gap-1.5" style={{ color: 'var(--ink)' }}><FileText size={14} /> 회의록</div>
        <TextAreaField label="안건" value={agenda} onChange={setAgenda} minHeight={60} placeholder="예: 1) QMS 적절성 검토 2) 품질목표 실적 3) CAPA 현황" disabled={!canEdit} />
        <TextAreaField label="논의 내용·결정사항" value={decisions} onChange={setDecisions} minHeight={120} placeholder="QMS 적절성·효과성 평가, 자원 필요성, 개선 필요사항 등 (ISO 13485 §5.6.3)" disabled={!canEdit} />
        {canEdit && <div className="flex justify-end"><button onClick={saveMinutes} className="btn-ghost text-[12.5px]">회의록 저장</button></div>}

        <div className="pt-2" style={{ borderTop: '1px solid var(--line)' }}>
          <div className="text-[11.5px] font-medium mb-1.5" style={{ color: 'var(--ink-mute)' }}>첨부·보관 파일 (서명본·스캔본 등, 5MB 이하)</div>
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {minutesFiles.map((m) => (
              <MinutesFileChip key={m.id} file={m} canEdit={canEdit} onRemove={() => removeMinutesFile(m.id)} />
            ))}
            {minutesFiles.length === 0 && <span className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>첨부된 파일이 없습니다.</span>}
          </div>
          {canEdit && <MinutesFileUploadButton onUpload={attachMinutesFile} />}
        </div>
      </div>

      <div className="card-base p-4">
        <div className="text-[13px] font-semibold mb-2" style={{ color: 'var(--ink)' }}>실행 항목 ({review.actionItems.length})</div>
        <div className="space-y-1.5 mb-2">
          {review.actionItems.map((a) => (
            <div key={a.id} className="p-2.5 rounded-lg text-[12px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink)' }}>{a.description} — 담당 {a.owner || '—'} · 기한 {a.dueDate || '—'}</div>
          ))}
          {review.actionItems.length === 0 && <div className="text-[12px] text-center py-2" style={{ color: 'var(--ink-faint)' }}>등록된 실행 항목이 없습니다.</div>}
        </div>
        {canEdit && (
          <div className="grid sm:grid-cols-3 gap-2">
            <Field label="실행 항목" value={actionForm.description} onChange={(v) => setAF('description', v)} className="sm:col-span-1" />
            <Field label="담당자" value={actionForm.owner} onChange={(v) => setAF('owner', v)} />
            <Field label="기한" type="date" value={actionForm.dueDate} onChange={(v) => setAF('dueDate', v)} />
          </div>
        )}
        {canEdit && <div className="flex justify-end mt-2"><button onClick={addAction} className="btn-ghost text-[12.5px]"><Plus size={13} /> 추가</button></div>}
      </div>

      {review.status === REVIEW_STATUS.DRAFT ? (
        canApprove && <div className="flex justify-end"><button onClick={approve} className="btn-primary text-[12.5px]"><CheckCircle2 size={14} /> 경영검토 승인</button></div>
      ) : (
        <div className="text-[12px]" style={{ color: 'var(--moss)' }}><CheckCircle2 size={13} className="inline mr-1" /> {review.approvedBy} 승인 · {review.approvedAt ? new Date(review.approvedAt).toLocaleString('ko-KR') : ''}</div>
      )}
    </div>
  )
}
function MiniStat({ label, value, tone }) {
  const map = { amber: 'var(--amber)', emerald: 'var(--moss)' }
  return (
    <div className="rounded-lg py-2" style={{ background: 'var(--bg-soft)' }}>
      <div className="text-[16px] font-bold tabular-nums" style={{ color: map[tone] || 'var(--ink)' }}>{value}</div>
      <div className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{label}</div>
    </div>
  )
}
function MinutesFileChip({ file, canEdit, onRemove }) {
  const open = async () => {
    const url = await fileStore.getObjectURL(file.fileId)
    if (!url) { window.alert('파일을 찾을 수 없습니다.'); return }
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  }
  return (
    <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-[11.5px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
      <button type="button" onClick={open} className="inline-flex items-center gap-1 hover:underline"><Download size={11} /> {file.fileName || '첨부파일'}</button>
      {canEdit && <button type="button" onClick={onRemove} className="opacity-50 hover:opacity-100"><X size={11} /></button>}
    </span>
  )
}
function MinutesFileUploadButton({ onUpload }) {
  const ref = useRef(null)
  const [busy, setBusy] = useState(false)
  const pick = async (e) => {
    const f = e.target.files && e.target.files[0]
    e.target.value = ''
    if (!f) return
    setBusy(true)
    try {
      await onUpload(f)
    } catch (err) {
      window.alert((err && err.message) || String(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <input ref={ref} type="file" className="hidden" onChange={pick} />
      <button type="button" onClick={() => ref.current && ref.current.click()} disabled={busy} className="inline-flex items-center gap-1 text-[11.5px] font-medium" style={{ color: 'var(--moss)' }}>
        <Paperclip size={12} /> {busy ? '업로드 중…' : '파일 첨부'}
      </button>
    </>
  )
}

