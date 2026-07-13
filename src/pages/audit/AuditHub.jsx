import React, { useState } from 'react'
import {
  ClipboardCheck,
  ListChecks,
  FileText,
  Wrench,
  Plus,
  Trash2,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import { permissions, requirePermission } from '../../lib/permissions'
import { audits, checklist, findings, AUDIT_STATUS, FINDING_CLASS, FINDING_STATUS, CHECKLIST_RESULT } from '../../lib/internalAuditState'
import { CARDS } from '../../lib/gmpProgress'
import { capa, CAPA_STATUS, CAPA_STATUS_LABEL } from '../../lib/capaState'

export default function AuditHub() {
  const user = auth.current()
  const [tick, setTick] = useState(0)
  const refresh = () => setTick((x) => x + 1)
  const [toast, setToast] = useState(null)
  const showToast = (t) => { setToast(t); setTimeout(() => setToast(null), 2400) }

  const list = audits.getAll()
  const [selId, setSelId] = useState(list[0]?.id || null)
  const sel = list.find((a) => a.id === selId) || null
  const [adding, setAdding] = useState(list.length === 0)

  const allFindings = findings.getAll()
  const openFindings = allFindings.filter((f) => f.status !== FINDING_STATUS.CLOSED)
  const inProgressCount = list.filter((a) => a.status !== AUDIT_STATUS.COMPLETED).length

  const canEditPlan = permissions.can('audit.plan.edit')

  const EMPTY = { title: '', scope: '', cardIds: [], plannedDate: '', leadAuditor: '', auditors: '' }
  const [form, setForm] = useState(EMPTY)
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const toggleCard = (cardId) => setForm((f) => ({ ...f, cardIds: f.cardIds.includes(cardId) ? f.cardIds.filter((c) => c !== cardId) : [...f.cardIds, cardId] }))

  const createAudit = () => {
    if (!requirePermission('audit.plan.edit')) return
    if (!form.title.trim() || form.cardIds.length === 0) { window.alert('심사명과 심사 대상 카드를 입력하세요.'); return }
    const rec = audits.add(form)
    setSelId(rec.id)
    setForm(EMPTY)
    setAdding(false)
    showToast('내부심사 계획이 생성되었습니다.')
    refresh()
  }

  const delAudit = (id) => {
    if (!requirePermission('audit.plan.edit')) return
    if (!window.confirm('이 심사와 관련된 체크리스트·시정조치가 함께 삭제됩니다. 계속할까요?')) return
    audits.delete(id)
    const next = audits.getAll()
    setSelId(next[0]?.id || null)
    showToast('심사가 삭제되었습니다.')
    refresh()
  }

  return (
    <AppLayout user={user} title="내부심사" subtitle="계획 / 체크리스트 / 보고서 / 시정조치">
      <div className="px-6 lg:px-8 py-6 max-w-[1400px] mx-auto fade-in">
        {toast && (
          <div className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-lg text-[13px] flex items-center gap-2 fade-in"
            style={{ background: 'var(--moss)', color: 'var(--bg)', boxShadow: '0 6px 20px rgba(15,26,20,0.18)', fontWeight: 500 }}>
            ✓ {toast}
          </div>
        )}

        <div className="mb-5">
          <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--moss)' }}>AUD · INTERNAL AUDIT</span>
          <div className="font-display text-[26px] mt-1" style={{ color: 'var(--ink)', fontWeight: 500 }}>내부심사</div>
          <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>
            ISO 13485 §8.2.4 / FDA QMSR §820.22 — 계획 승인 → 체크리스트 → 보고서 승인 → 시정조치 종결까지 한 흐름으로 관리합니다.
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <StatCard label="전체 심사" value={list.length} hint="누적 발행 건수" icon={ClipboardCheck} />
          <StatCard label="진행 중" value={inProgressCount} hint="완료되지 않은 심사" icon={ListChecks} />
          <StatCard label="미종결 시정조치" value={openFindings.length} hint="Major/Minor/관찰 포함" icon={AlertTriangle} tone={openFindings.length > 0 ? 'amber' : undefined} />
        </div>

        <div className="grid lg:grid-cols-[320px_1fr] gap-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[12.5px] font-medium" style={{ color: 'var(--ink)' }}>심사 목록 ({list.length}건)</div>
              {canEditPlan && (
                <button onClick={() => { setAdding((v) => !v); setForm(EMPTY) }} className="inline-flex items-center gap-1 text-[12px] font-medium" style={{ color: 'var(--moss)' }}>
                  <Plus size={13} /> 심사 추가
                </button>
              )}
            </div>

            {adding && canEditPlan && (
              <div className="card-base p-3 mb-3 space-y-2">
                <Field label="심사명 *" value={form.title} onChange={(v) => setF('title', v)} placeholder="예: 2026년 정기 내부심사 1차" />
                <Field label="심사 범위·목적" value={form.scope} onChange={(v) => setF('scope', v)} placeholder="예: 설계·제조·QC 프로세스" />
                <Field label="예정일" type="date" value={form.plannedDate} onChange={(v) => setF('plannedDate', v)} />
                <Field label="리드 심사원" value={form.leadAuditor} onChange={(v) => setF('leadAuditor', v)} />
                <Field label="심사원(팀원)" value={form.auditors} onChange={(v) => setF('auditors', v)} placeholder="쉼표로 구분" />
                <div>
                  <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>심사 대상 카드 *</span>
                  <div className="flex flex-wrap gap-1.5">
                    {CARDS.map((c) => (
                      <button key={c.id} type="button" onClick={() => toggleCard(c.id)}
                        className="px-2 py-1 rounded text-[11px] border"
                        style={{ borderColor: form.cardIds.includes(c.id) ? 'var(--moss)' : 'var(--line)', background: form.cardIds.includes(c.id) ? 'var(--leaf-soft)' : 'transparent', color: form.cardIds.includes(c.id) ? 'var(--moss)' : 'var(--ink-mute)' }}>
                        {c.index}. {c.title}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setAdding(false)} className="btn-ghost" style={{ padding: '0.4rem 0.8rem', fontSize: 12.5 }}>취소</button>
                  <button onClick={createAudit} className="btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: 12.5 }}><Plus size={13} /> 생성</button>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              {list.map((a) => (
                <button key={a.id} onClick={() => setSelId(a.id)} className="w-full text-left px-3 py-2.5 rounded-lg border flex items-center gap-2 transition"
                  style={{ borderColor: a.id === selId ? 'var(--moss)' : 'var(--line)', background: a.id === selId ? 'var(--leaf-soft)' : 'var(--bg-card)' }}>
                  <ClipboardCheck size={14} style={{ color: 'var(--moss)' }} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium truncate" style={{ color: 'var(--ink)' }}>{a.title || '(제목없음)'}</span>
                    <span className="block text-[11px]" style={{ color: 'var(--ink-faint)' }}>{a.id} · {a.status}</span>
                  </span>
                  <ChevronRight size={14} style={{ color: 'var(--ink-faint)' }} />
                </button>
              ))}
              {list.length === 0 && !adding && <EmptyState icon={ClipboardCheck} text="등록된 내부심사가 없습니다." />}
            </div>
          </div>

          <div>
            {sel ? (
              <AuditDetail key={sel.id} audit={sel} onAction={showToast} refresh={refresh} onDelete={() => delAudit(sel.id)} />
            ) : (
              <EmptyState icon={ClipboardCheck} text="왼쪽에서 심사를 선택하거나 새로 등록하세요." />
            )}
          </div>
        </div>
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
function TextAreaField({ label, value, onChange, placeholder, minHeight = 70, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>{label}</span>
      <textarea className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13, minHeight }} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
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
function auditStatusTone(status) {
  if (status === AUDIT_STATUS.COMPLETED) return 'emerald'
  if (status === AUDIT_STATUS.PLANNING) return 'slate'
  return 'amber'
}
function SubTab({ active, onClick, icon: Icon, label, badge }) {
  return (
    <button onClick={onClick} className="px-4 py-2.5 rounded-t-lg flex items-center gap-2 text-[13px] transition shrink-0"
      style={{ background: active ? 'var(--bg-card)' : 'transparent', borderBottom: active ? '2px solid var(--moss)' : '2px solid transparent', color: active ? 'var(--ink)' : 'var(--ink-mute)', fontWeight: active ? 500 : 400 }}>
      <Icon size={14} />
      <span>{label}</span>
      {badge != null && <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: active ? 'var(--leaf-soft)' : 'var(--bg-soft)', color: active ? 'var(--moss)' : 'var(--ink-faint)' }}>{badge}</span>}
    </button>
  )
}

/* ================================================================
   심사 상세 — 계획 / 체크리스트 / 보고서 / 시정조치
   ================================================================ */
function AuditDetail({ audit, onAction, refresh, onDelete }) {
  const [sub, setSub] = useState('plan')
  const rows = checklist.getForAudit(audit.id)
  const fnds = findings.getForAudit(audit.id)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[12px]" style={{ color: 'var(--moss)' }}>{audit.id}</span>
          <Badge text={audit.status} tone={auditStatusTone(audit.status)} />
        </div>
        {permissions.can('audit.plan.edit') && audit.status === AUDIT_STATUS.PLANNING && (
          <button onClick={onDelete} className="text-[12px] inline-flex items-center gap-1" style={{ color: 'var(--rust)' }}><Trash2 size={13} /> 심사 삭제</button>
        )}
      </div>

      <div className="flex gap-1 overflow-x-auto" style={{ borderBottom: '1px solid var(--line)' }}>
        <SubTab active={sub === 'plan'} onClick={() => setSub('plan')} icon={ClipboardCheck} label="계획" />
        <SubTab active={sub === 'checklist'} onClick={() => setSub('checklist')} icon={ListChecks} label="체크리스트" badge={rows.length} />
        <SubTab active={sub === 'report'} onClick={() => setSub('report')} icon={FileText} label="보고서" />
        <SubTab active={sub === 'findings'} onClick={() => setSub('findings')} icon={Wrench} label="시정조치" badge={fnds.filter((f) => f.status !== FINDING_STATUS.CLOSED).length} />
      </div>

      {sub === 'plan' && <PlanTab audit={audit} onAction={onAction} refresh={refresh} />}
      {sub === 'checklist' && <ChecklistTab audit={audit} rows={rows} onAction={onAction} refresh={refresh} />}
      {sub === 'report' && <ReportTab audit={audit} rows={rows} fnds={fnds} onAction={onAction} refresh={refresh} />}
      {sub === 'findings' && <FindingsTab audit={audit} fnds={fnds} onAction={onAction} refresh={refresh} />}
    </div>
  )
}

/* ---------------- 계획 ---------------- */
function PlanTab({ audit, onAction, refresh }) {
  const canEdit = permissions.can('audit.plan.edit') && audit.status === AUDIT_STATUS.PLANNING
  const canApprove = permissions.can('audit.plan.approve')
  const [form, setForm] = useState(audit)
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const dirty = JSON.stringify(form) !== JSON.stringify(audit)

  const save = () => {
    if (!requirePermission('audit.plan.edit')) return
    audits.update(audit.id, form)
    onAction('계획이 저장되었습니다.')
    refresh()
  }

  const approve = () => {
    if (!requirePermission('audit.plan.approve')) return
    const cur = auth.current()
    try {
      audits.approvePlan(audit.id, cur?.name || '승인자')
      onAction('계획이 승인되었습니다 · 체크리스트가 자동 발행되었습니다.')
      refresh()
    } catch (e) {
      window.alert((e && e.message) || String(e))
    }
  }

  return (
    <div className="card-base p-4 space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="심사명" value={form.title} onChange={(v) => setF('title', v)} className={!canEdit ? 'opacity-70 pointer-events-none' : ''} />
        <Field label="예정일" type="date" value={form.plannedDate} onChange={(v) => setF('plannedDate', v)} className={!canEdit ? 'opacity-70 pointer-events-none' : ''} />
        <Field label="리드 심사원" value={form.leadAuditor} onChange={(v) => setF('leadAuditor', v)} className={!canEdit ? 'opacity-70 pointer-events-none' : ''} />
        <Field label="심사원(팀원)" value={form.auditors} onChange={(v) => setF('auditors', v)} className={!canEdit ? 'opacity-70 pointer-events-none' : ''} />
      </div>
      <TextAreaField label="심사 범위·목적" value={form.scope} onChange={(v) => setF('scope', v)} />
      <div>
        <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>심사 대상 카드</span>
        <div className="flex flex-wrap gap-1.5">
          {audit.cardIds.map((cid) => {
            const c = CARDS.find((x) => x.id === cid)
            return <Badge key={cid} text={c ? `${c.index}. ${c.title}` : cid} tone="slate" />
          })}
        </div>
      </div>

      {audit.status === AUDIT_STATUS.PLANNING ? (
        <div className="flex justify-end gap-2 pt-2" style={{ borderTop: '1px solid var(--line)' }}>
          {canEdit && <button onClick={save} disabled={!dirty} className="btn-ghost text-[12.5px]">변경사항 저장</button>}
          {canApprove && <button onClick={approve} className="btn-primary text-[12.5px]"><CheckCircle2 size={14} /> 계획 승인 · 체크리스트 발행</button>}
        </div>
      ) : (
        <div className="text-[12px] pt-2" style={{ borderTop: '1px solid var(--line)', color: 'var(--moss)' }}>
          <CheckCircle2 size={13} className="inline mr-1" /> {audit.planApprovedAt ? new Date(audit.planApprovedAt).toLocaleString('ko-KR') : ''} · {audit.planApprovedBy} 승인
        </div>
      )}
    </div>
  )
}

/* ---------------- 체크리스트 ---------------- */
const RESULT_OPTIONS = ['', ...Object.values(CHECKLIST_RESULT)]

function ChecklistTab({ audit, rows, onAction, refresh }) {
  const canEdit = permissions.can('audit.checklist.edit') && audit.status !== AUDIT_STATUS.PLANNING && audit.status !== AUDIT_STATUS.COMPLETED

  if (audit.status === AUDIT_STATUS.PLANNING) {
    return <EmptyState icon={ListChecks} text="계획이 승인되면 체크리스트가 자동 발행됩니다." />
  }

  const byCard = {}
  rows.forEach((r) => { (byCard[r.cardId] = byCard[r.cardId] || []).push(r) })

  const setResult = (row, patch) => {
    if (!requirePermission('audit.checklist.edit')) return
    const cur = auth.current()
    checklist.setResult(row.id, { ...patch, checkedBy: cur?.name || '' })
    onAction('체크리스트 결과가 저장되었습니다.')
    refresh()
  }

  return (
    <div className="space-y-4">
      {Object.entries(byCard).map(([cardId, items]) => (
        <div key={cardId} className="card-base p-4">
          <div className="text-[13.5px] font-semibold mb-2" style={{ color: 'var(--ink)' }}>{items[0].cardTitle}</div>
          <div className="space-y-2">
            {items.map((r) => (
              <ChecklistRow key={r.id} row={r} canEdit={canEdit} onSave={(patch) => setResult(r, patch)} />
            ))}
          </div>
        </div>
      ))}
      {rows.length === 0 && <EmptyState icon={ListChecks} text="발행된 체크리스트 항목이 없습니다." />}
    </div>
  )
}

function ChecklistRow({ row, canEdit, onSave }) {
  const [result, setResultV] = useState(row.result)
  const [evidence, setEvidence] = useState(row.evidence)
  const [notes, setNotes] = useState(row.notes)
  const dirty = result !== row.result || evidence !== row.evidence || notes !== row.notes
  const tone = row.result === CHECKLIST_RESULT.MET ? 'emerald' : row.result === CHECKLIST_RESULT.UNMET ? 'rose' : row.result === CHECKLIST_RESULT.PARTIAL ? 'amber' : 'slate'

  return (
    <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--line)' }}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="text-[12.5px]" style={{ color: 'var(--ink)' }}>{row.label}</div>
        <div className="flex items-center gap-1.5 shrink-0">
          {row.result && <Badge text={row.result} tone={tone} />}
          <span className="text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>시스템 참고: {row.systemFulfillment}</span>
        </div>
      </div>
      {canEdit ? (
        <div className="grid sm:grid-cols-3 gap-2 mt-2">
          <SelectField label="심사 결과" value={result} onChange={setResultV} options={RESULT_OPTIONS.map((o) => o || '(미평가)')} />
          <Field label="증거" value={evidence} onChange={setEvidence} placeholder="근거 기록·문서 번호 등" className="sm:col-span-1" />
          <Field label="비고" value={notes} onChange={setNotes} className="sm:col-span-1" />
        </div>
      ) : (
        (row.evidence || row.notes) && <div className="text-[11.5px] mt-1" style={{ color: 'var(--ink-mute)' }}>{row.evidence} {row.notes}</div>
      )}
      {canEdit && dirty && (
        <div className="flex justify-end mt-2">
          <button onClick={() => onSave({ result: result === '(미평가)' ? '' : result, evidence, notes })} className="btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: 12 }}>저장</button>
        </div>
      )}
    </div>
  )
}

/* ---------------- 보고서 ---------------- */
function ReportTab({ audit, rows, fnds, onAction, refresh }) {
  const canDraft = permissions.can('audit.report.edit') && audit.status === AUDIT_STATUS.IN_PROGRESS
  const canApprove = permissions.can('audit.report.approve') && audit.status === AUDIT_STATUS.REPORT_DRAFT
  const [overview, setOverview] = useState(audit.report?.overview || '')
  const [conclusion, setConclusion] = useState(audit.report?.conclusion || '')

  if (audit.status === AUDIT_STATUS.PLANNING) {
    return <EmptyState icon={FileText} text="계획 승인 후 체크리스트를 진행하면 보고서를 작성할 수 있습니다." />
  }

  const draft = () => {
    if (!requirePermission('audit.report.edit')) return
    const cur = auth.current()
    audits.draftReport(audit.id, { overview, conclusion, preparedBy: cur?.name || '' })
    onAction('보고서 초안이 저장되었습니다.')
    refresh()
  }

  const approve = () => {
    if (!requirePermission('audit.report.approve')) return
    const cur = auth.current()
    audits.approveReport(audit.id, cur?.name || '승인자')
    onAction('보고서가 승인되었습니다 · 심사가 완료되었습니다.')
    refresh()
  }

  const unmet = rows.filter((r) => r.result === CHECKLIST_RESULT.UNMET).length
  const partial = rows.filter((r) => r.result === CHECKLIST_RESULT.PARTIAL).length
  const unchecked = rows.filter((r) => !r.result).length

  return (
    <div className="card-base p-4 space-y-3">
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
        <MiniStat label="전체" value={rows.length} />
        <MiniStat label="미충족" value={unmet} tone="rose" />
        <MiniStat label="부분충족" value={partial} tone="amber" />
        <MiniStat label="미평가" value={unchecked} tone="slate" />
        <MiniStat label="시정조치" value={fnds.length} tone="amber" />
      </div>

      {audit.status === AUDIT_STATUS.IN_PROGRESS && (
        <>
          {unchecked > 0 && <div className="text-[11.5px]" style={{ color: 'var(--amber)' }}><AlertTriangle size={12} className="inline mr-1" />아직 평가되지 않은 항목이 {unchecked}건 있습니다. 보고서는 작성할 수 있으나 확인을 권장합니다.</div>}
          <TextAreaField label="심사 개요" value={overview} onChange={setOverview} minHeight={90} placeholder="심사 목적·범위·방법·수행 경과" />
          <TextAreaField label="결론·종합 의견" value={conclusion} onChange={setConclusion} minHeight={90} placeholder="종합 판정 및 권고사항" />
          {canDraft && (
            <div className="flex justify-end"><button onClick={draft} className="btn-primary text-[12.5px]"><FileText size={13} /> 보고서 작성</button></div>
          )}
        </>
      )}

      {(audit.status === AUDIT_STATUS.REPORT_DRAFT || audit.status === AUDIT_STATUS.COMPLETED) && audit.report && (
        <>
          <div className="text-[12.5px] whitespace-pre-wrap" style={{ color: 'var(--ink)' }}><b>개요</b><br />{audit.report.overview}</div>
          <div className="text-[12.5px] whitespace-pre-wrap" style={{ color: 'var(--ink)' }}><b>결론</b><br />{audit.report.conclusion}</div>
          <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>작성: {audit.report.preparedBy} · {audit.report.preparedAt ? new Date(audit.report.preparedAt).toLocaleString('ko-KR') : ''}</div>
          {audit.status === AUDIT_STATUS.REPORT_DRAFT && canApprove && (
            <div className="flex justify-end pt-2" style={{ borderTop: '1px solid var(--line)' }}>
              <button onClick={approve} className="btn-primary text-[12.5px]"><CheckCircle2 size={14} /> 보고서 승인 · 심사 완료</button>
            </div>
          )}
          {audit.status === AUDIT_STATUS.COMPLETED && (
            <div className="text-[12px]" style={{ color: 'var(--moss)' }}><CheckCircle2 size={13} className="inline mr-1" /> {audit.report.approvedBy} 승인 · {audit.report.approvedAt ? new Date(audit.report.approvedAt).toLocaleString('ko-KR') : ''}</div>
          )}
        </>
      )}
    </div>
  )
}
function MiniStat({ label, value, tone = 'slate' }) {
  const map = { rose: 'var(--rust)', amber: 'var(--amber)', slate: 'var(--ink-mute)' }
  return (
    <div className="rounded-lg py-2" style={{ background: 'var(--bg-soft)' }}>
      <div className="text-[16px] font-bold tabular-nums" style={{ color: map[tone] || 'var(--ink)' }}>{value}</div>
      <div className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{label}</div>
    </div>
  )
}

/* ---------------- 시정조치 ---------------- */
const FINDING_CLASS_OPTIONS = Object.values(FINDING_CLASS)

function FindingsTab({ audit, fnds, onAction, refresh }) {
  const canEdit = permissions.can('audit.finding.edit')
  const EMPTY = { cardId: audit.cardIds[0] || '', classification: FINDING_CLASS.MINOR, description: '', evidence: '', dueDate: '' }
  const [form, setForm] = useState(EMPTY)
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const add = () => {
    if (!requirePermission('audit.finding.edit')) return
    if (!form.description.trim()) { window.alert('시정조치 내용을 입력하세요.'); return }
    findings.add(audit.id, form)
    setForm(EMPTY)
    onAction('시정조치가 등록되었습니다.')
    refresh()
  }

  const raiseCapa = (f) => {
    if (!requirePermission('audit.finding.edit')) return
    const rec = capa.raise({
      title: `내부심사 ${audit.id} 시정조치 — ${f.description.slice(0, 40)}`,
      description: f.description,
      trigger: 'audit-finding',
      triggerReason: `내부심사 ${audit.id} · ${f.classification} 지적사항 (증거: ${f.evidence || '—'})`,
    })
    findings.linkCapa(f.id, rec.id)
    onAction('CAPA가 발의되었습니다 · CAPA 메뉴에서 원인분석·시정·예방·효과검증을 진행하세요.')
    refresh()
  }

  const closeDirect = (f) => {
    if (!requirePermission('audit.finding.edit')) return
    if (!window.confirm('CAPA 연계 없이 직접 종결하시겠습니까? (Minor/관찰 항목에 한해 권장)')) return
    findings.close(f.id)
    onAction('시정조치가 종결되었습니다.')
    refresh()
  }

  const closeAfterCapa = (f) => {
    if (!requirePermission('audit.finding.edit')) return
    findings.close(f.id)
    onAction('시정조치가 종결되었습니다.')
    refresh()
  }

  const delFinding = (id) => {
    if (!requirePermission('audit.finding.edit')) return
    findings.delete(id)
    refresh()
  }

  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="card-base p-4 space-y-2">
          <div className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>시정조치 등록</div>
          <div className="grid sm:grid-cols-3 gap-2">
            <SelectField label="관련 카드" value={form.cardId} onChange={(v) => setF('cardId', v)} options={audit.cardIds.map((cid) => { const c = CARDS.find((x) => x.id === cid); return { value: cid, label: c ? c.title : cid } })} />
            <SelectField label="분류" value={form.classification} onChange={(v) => setF('classification', v)} options={FINDING_CLASS_OPTIONS} />
            <Field label="조치 기한" type="date" value={form.dueDate} onChange={(v) => setF('dueDate', v)} />
          </div>
          <TextAreaField label="지적사항 내용" value={form.description} onChange={(v) => setF('description', v)} placeholder="부적합 내용을 구체적으로 기술" />
          <Field label="증거" value={form.evidence} onChange={(v) => setF('evidence', v)} placeholder="근거 기록·문서 번호 등" />
          <div className="flex justify-end"><button onClick={add} className="btn-primary text-[12.5px]"><Plus size={13} /> 등록</button></div>
        </div>
      )}

      <div className="space-y-2">
        {fnds.map((f) => {
          const linkedCapa = f.capaId ? capa.findById(f.capaId) : null
          const tone = f.classification === FINDING_CLASS.MAJOR ? 'rose' : f.classification === FINDING_CLASS.MINOR ? 'amber' : 'slate'
          return (
            <div key={f.id} className="card-base p-3.5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge text={f.classification} tone={tone} />
                    <Badge text={f.status} tone={f.status === FINDING_STATUS.CLOSED ? 'emerald' : 'slate'} />
                    {f.dueDate && <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>기한 {f.dueDate}</span>}
                  </div>
                  <div className="text-[12.5px] mt-1" style={{ color: 'var(--ink)' }}>{f.description}</div>
                  {f.evidence && <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>증거: {f.evidence}</div>}
                  {linkedCapa && (
                    <div className="text-[11.5px] mt-1.5">
                      연계 CAPA: <span className="font-mono">{linkedCapa.id}</span> ·{' '}
                      <Badge text={CAPA_STATUS_LABEL[linkedCapa.status]?.ko || linkedCapa.status} tone={linkedCapa.status === CAPA_STATUS.CLOSED ? 'emerald' : 'amber'} />
                    </div>
                  )}
                </div>
                {canEdit && f.status !== FINDING_STATUS.CLOSED && (
                  <div className="flex gap-2 shrink-0 flex-wrap">
                    {!f.capaId && <button onClick={() => raiseCapa(f)} className="btn-ghost text-[11.5px]"><ArrowRight size={12} /> CAPA 발의</button>}
                    {!f.capaId && <button onClick={() => closeDirect(f)} className="btn-ghost text-[11.5px]">직접 종결</button>}
                    {f.capaId && linkedCapa?.status === CAPA_STATUS.CLOSED && <button onClick={() => closeAfterCapa(f)} className="btn-primary text-[11.5px]"><CheckCircle2 size={12} /> 종결</button>}
                    {f.capaId && linkedCapa?.status !== CAPA_STATUS.CLOSED && <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>CAPA 종결 후 이곳에서 종결 가능</span>}
                    <button onClick={() => delFinding(f.id)} className="text-slate-300 hover:text-rose-600"><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {fnds.length === 0 && <EmptyState icon={Wrench} text="등록된 시정조치가 없습니다." />}
      </div>
    </div>
  )
}
