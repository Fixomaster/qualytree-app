import React, { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Truck,
  ShieldCheck,
  Plus,
  Trash2,
  Paperclip,
  Download,
  ChevronRight,
  Calendar,
  X,
  AlertTriangle,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import { permissions, requirePermission } from '../../lib/permissions'
import { suppliers, riskClass, supplierStatus, evalType, evalResult, DEFAULT_REEVAL_MONTHS } from '../../lib/supplierState'
import { fileStore } from '../../lib/fileStore'

export default function SupplierHub() {
  const user = auth.current()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState(() => searchParams.get('tab') || 'supplier') // supplier | asl
  const [tick, setTick] = useState(0)
  const refresh = () => setTick((x) => x + 1)
  const [toast, setToast] = useState(null)
  const showToast = (t) => { setToast(t); setTimeout(() => setToast(null), 2400) }

  const s = suppliers.load()
  const approved = suppliers.approvedSuppliers()
  const due = suppliers.dueForReeval(60)

  return (
    <AppLayout user={user} title="공급자관리" subtitle="공급자대장 / 평가·재평가 / 승인공급자목록(ASL)">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto fade-in">
        {toast && (
          <div
            className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-lg text-[13px] flex items-center gap-2 fade-in"
            style={{ background: 'var(--moss)', color: 'var(--bg)', boxShadow: '0 6px 20px rgba(15,26,20,0.18)', fontWeight: 500 }}
          >
            ✓ {toast}
          </div>
        )}

        <div className="mb-5">
          <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--moss)' }}>
            SUP · SUPPLIER MANAGEMENT
          </span>
          <div className="font-display text-[26px] mt-1" style={{ color: 'var(--ink)', fontWeight: 500 }}>
            공급자관리
          </div>
          <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>
            ISO 13485 §7.4.1 (평가·선정·재평가) / KGMP 제22조 — 공급자 평가·재평가 기록과 승인공급자목록을 관리합니다.
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <StatCard label="공급자" value={s.suppliers.length} hint="공급자대장 등록 건수" icon={Truck} />
          <StatCard label="승인 공급자" value={approved.length} hint="ASL 등재 건수" icon={ShieldCheck} />
          <StatCard label="재평가 임박·만료" value={due.length} hint="60일 이내 도래" icon={AlertTriangle} tone={due.length > 0 ? 'amber' : undefined} />
        </div>

        <div className="flex gap-1 mb-5 overflow-x-auto" style={{ borderBottom: '1px solid var(--line)' }}>
          <TabButton active={tab === 'supplier'} onClick={() => setTab('supplier')} icon={Truck} label="공급자대장 · 평가" en="SUPPLIER & EVALUATION" count={s.suppliers.length} />
          <TabButton active={tab === 'asl'} onClick={() => setTab('asl')} icon={ShieldCheck} label="승인 공급자 목록" en="ASL" count={approved.length} />
        </div>

        {tab === 'supplier' && <SupplierTab key={tick} onAction={showToast} refresh={refresh} />}
        {tab === 'asl' && <AslTab key={'asl' + tick} />}
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
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: tone === 'amber' ? 'var(--amber-soft)' : 'var(--leaf-soft)', color: tone === 'amber' ? 'var(--amber)' : 'var(--moss)' }}
      >
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
    <button
      onClick={onClick}
      className="px-4 py-2.5 rounded-t-lg flex items-center gap-2 text-[13px] transition shrink-0"
      style={{
        background: active ? 'var(--bg-card)' : 'transparent',
        borderBottom: active ? '2px solid var(--moss)' : '2px solid transparent',
        color: active ? 'var(--ink)' : 'var(--ink-mute)',
        fontWeight: active ? 500 : 400,
      }}
    >
      <Icon size={14} />
      <span>{label}</span>
      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: active ? 'var(--leaf-soft)' : 'var(--bg-soft)', color: active ? 'var(--moss)' : 'var(--ink-faint)' }}>
        {count}
      </span>
      <span className="font-mono text-[9.5px] tracking-wider" style={{ color: 'var(--ink-faint)' }}>{en}</span>
    </button>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>{label}</span>
      <input
        type={type}
        className="input-base"
        style={{ padding: '0.5rem 0.7rem', fontSize: 13 }}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
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

function TextAreaField({ label, value, onChange, placeholder, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>{label}</span>
      <textarea
        className="input-base"
        style={{ padding: '0.5rem 0.7rem', fontSize: 13, minHeight: 60 }}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

function FileAttachList({ files, onAdd, onRemove, canEdit }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)

  const openFile = async (fileId) => {
    try {
      const url = await fileStore.getObjectURL(fileId)
      if (!url) { alert('파일을 찾을 수 없습니다.'); return }
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 30000)
    } catch (e) {
      alert((e && e.message) || String(e))
    }
  }

  const handlePick = async (e) => {
    const f = e.target.files && e.target.files[0]
    e.target.value = ''
    if (!f) return
    setBusy(true)
    try {
      await onAdd(f)
    } catch (err) {
      alert((err && err.message) || String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {(files || []).map((f) => (
          <span key={f.fileId} className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-[11.5px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
            <button type="button" onClick={() => openFile(f.fileId)} className="inline-flex items-center gap-1 hover:underline" title="다운로드/열기">
              <Download size={11} /> {f.name}
            </button>
            {canEdit && (
              <button type="button" onClick={() => onRemove(f.fileId)} className="opacity-50 hover:opacity-100">
                <X size={11} />
              </button>
            )}
          </span>
        ))}
        {(!files || files.length === 0) && <span className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>첨부 파일 없음</span>}
      </div>
      {canEdit && (
        <div className="mt-1.5">
          <input ref={inputRef} type="file" className="hidden" onChange={handlePick} />
          <button type="button" onClick={() => inputRef.current && inputRef.current.click()} disabled={busy} className="inline-flex items-center gap-1 text-[11.5px] font-medium" style={{ color: 'var(--moss)' }}>
            <Paperclip size={12} /> {busy ? '업로드 중…' : '파일 첨부 (5MB 이하)'}
          </button>
        </div>
      )}
    </div>
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

function statusTone(status) {
  if (status === supplierStatus.APPROVED) return 'emerald'
  if (status === supplierStatus.CONDITIONAL) return 'amber'
  if (status === supplierStatus.SUSPENDED) return 'rose'
  return 'slate'
}

/* ================================================================
   공급자대장 탭 — 목록 + 선택 상세(기본정보 · 평가·재평가 기록)
   ================================================================ */
const RISK_OPTIONS = Object.values(riskClass)
const STATUS_OPTIONS = Object.values(supplierStatus)

function SupplierTab({ onAction, refresh }) {
  const canEdit = permissions.can('sup.supplier.edit')
  const [list, setList] = useState(() => suppliers.getSuppliers())
  const [selId, setSelId] = useState(list[0]?.id || null)
  const [adding, setAdding] = useState(list.length === 0)
  const sel = list.find((s) => s.id === selId) || null

  const EMPTY = { name: '', bizNo: '', category: '', scope: '', contact: '', riskClass: riskClass.MAJOR, status: supplierStatus.HOLD, notes: '' }
  const [form, setForm] = useState(EMPTY)
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const saveNew = () => {
    if (!requirePermission('sup.supplier.edit')) return
    if (!form.name.trim()) return
    const rec = suppliers.addSupplier(form)
    setList(suppliers.getSuppliers())
    setSelId(rec.id)
    setForm(EMPTY)
    setAdding(false)
    onAction('공급자가 등록되었습니다.')
    refresh()
  }

  const del = (id) => {
    if (!requirePermission('sup.supplier.edit')) return
    if (!window.confirm('이 공급자와 연결된 평가·재평가 기록이 함께 삭제됩니다. 계속할까요?')) return
    suppliers.deleteSupplier(id)
    const next = suppliers.getSuppliers()
    setList(next)
    setSelId(next[0]?.id || null)
    onAction('공급자가 삭제되었습니다.')
    refresh()
  }

  return (
    <div className="grid lg:grid-cols-[340px_1fr] gap-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[12.5px] font-medium" style={{ color: 'var(--ink)' }}>공급자 목록 ({list.length}건)</div>
          {canEdit && (
            <button onClick={() => { setAdding((v) => !v); setForm(EMPTY) }} className="inline-flex items-center gap-1 text-[12px] font-medium" style={{ color: 'var(--moss)' }}>
              <Plus size={13} /> 공급자 추가
            </button>
          )}
        </div>

        {adding && canEdit && (
          <div className="card-base p-3 mb-3 space-y-2">
            <Field label="공급자명 *" value={form.name} onChange={(v) => setF('name', v)} placeholder="예: (주)한국정밀부품" />
            <Field label="사업자등록번호" value={form.bizNo} onChange={(v) => setF('bizNo', v)} placeholder="예: 123-45-67890" />
            <Field label="공급 범위" value={form.scope} onChange={(v) => setF('scope', v)} placeholder="예: 원자재·부품 가공" />
            <SelectField label="위험등급" value={form.riskClass} onChange={(v) => setF('riskClass', v)} options={RISK_OPTIONS} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setAdding(false)} className="btn-ghost" style={{ padding: '0.4rem 0.8rem', fontSize: 12.5 }}>취소</button>
              <button onClick={saveNew} disabled={!form.name.trim()} className="btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: 12.5 }}>
                <Plus size={13} /> 저장
              </button>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          {list.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelId(s.id)}
              className="w-full text-left px-3 py-2.5 rounded-lg border flex items-center gap-2 transition"
              style={{
                borderColor: s.id === selId ? 'var(--moss)' : 'var(--line)',
                background: s.id === selId ? 'var(--leaf-soft)' : 'var(--bg-card)',
              }}
            >
              <Truck size={14} style={{ color: 'var(--moss)' }} />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium truncate" style={{ color: 'var(--ink)' }}>{s.name || '(이름없음)'}</span>
                <span className="block text-[11px]" style={{ color: 'var(--ink-faint)' }}>{s.riskClass} · {s.status}</span>
              </span>
              <ChevronRight size={14} style={{ color: 'var(--ink-faint)' }} />
            </button>
          ))}
          {list.length === 0 && !adding && <EmptyState icon={Truck} text="등록된 공급자가 없습니다." />}
        </div>
      </div>

      <div>
        {sel ? (
          <SupplierDetail key={sel.id} item={sel} canEdit={canEdit} onAction={onAction}
            onChanged={() => setList(suppliers.getSuppliers())}
            onDelete={() => del(sel.id)} />
        ) : (
          <EmptyState icon={Truck} text="왼쪽에서 공급자를 선택하거나 새로 등록하세요." />
        )}
      </div>
    </div>
  )
}

function SupplierDetail({ item, canEdit, onAction, onChanged, onDelete }) {
  const [form, setForm] = useState(item)
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const dirty = JSON.stringify(form) !== JSON.stringify(item)

  const save = () => {
    if (!requirePermission('sup.supplier.edit')) return
    suppliers.updateSupplier(item.id, form)
    onChanged()
    onAction('공급자 정보가 저장되었습니다.')
  }

  return (
    <div className="space-y-4">
      <div className="card-base p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>공급자대장 · 기본 정보</div>
          {canEdit && <button onClick={onDelete} className="text-[12px] inline-flex items-center gap-1" style={{ color: 'var(--rust)' }}><Trash2 size={13} /> 공급자 삭제</button>}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="공급자명" value={form.name} onChange={(v) => setF('name', v)} />
          <Field label="사업자등록번호" value={form.bizNo} onChange={(v) => setF('bizNo', v)} />
          <Field label="분류" value={form.category} onChange={(v) => setF('category', v)} placeholder="예: 원자재/부품/멸균위탁/CMO" />
          <Field label="공급 범위" value={form.scope} onChange={(v) => setF('scope', v)} />
          <Field label="담당 연락처" value={form.contact} onChange={(v) => setF('contact', v)} />
          <SelectField label="위험등급" value={form.riskClass} onChange={(v) => setF('riskClass', v)} options={RISK_OPTIONS} />
          <SelectField label="승인 상태" value={form.status} onChange={(v) => setF('status', v)} options={STATUS_OPTIONS} />
          <Field label="승인일" type="date" value={form.approvedDate} onChange={(v) => setF('approvedDate', v)} />
          <Field label="차기 재평가일" type="date" value={form.nextReevalDate} onChange={(v) => setF('nextReevalDate', v)} />
        </div>
        <div className="text-[11px] mt-2" style={{ color: 'var(--ink-faint)' }}>
          위험등급 기본 재평가 주기: Critical {DEFAULT_REEVAL_MONTHS.Critical}개월 · Major {DEFAULT_REEVAL_MONTHS.Major}개월 · Minor {DEFAULT_REEVAL_MONTHS.Minor}개월 — 평가 기록 저장 시 자동 계산됩니다.
        </div>
        <TextAreaField label="비고" value={form.notes} onChange={(v) => setF('notes', v)} className="mt-3" />
        {canEdit && (
          <div className="flex justify-end mt-3">
            <button onClick={save} disabled={!dirty} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: 12.5 }}>변경사항 저장</button>
          </div>
        )}
      </div>

      <EvaluationsCard supplierId={item.id} canEdit={canEdit} onAction={onAction} onChanged={onChanged} />
    </div>
  )
}

/* ================================================================
   평가·재평가 기록 — 신규평가/정기재평가/수시평가, 결과에 따라 승인상태 자동 갱신
   ================================================================ */
const EVAL_TYPE_OPTIONS = Object.values(evalType)
const EVAL_RESULT_OPTIONS = Object.values(evalResult)

function EvaluationsCard({ supplierId, canEdit, onAction, onChanged }) {
  const [records, setRecords] = useState(() => suppliers.getEvaluations(supplierId))
  const EMPTY = { date: new Date().toISOString().slice(0, 10), type: evalType.INITIAL, evaluator: '', result: evalResult.PASS, score: '', findings: '', notes: '' }
  const [form, setForm] = useState(EMPTY)
  const [pendingFiles, setPendingFiles] = useState([])
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const addFileToPending = async (file) => {
    const fileId = await fileStore.saveFile(file)
    setPendingFiles((f) => [...f, { fileId, name: file.name, size: file.size }])
  }
  const removePendingFile = (fileId) => setPendingFiles((f) => f.filter((x) => x.fileId !== fileId))

  const add = () => {
    if (!requirePermission('sup.evaluation.edit')) return
    if (!form.date) { alert('평가일을 입력하세요.'); return }
    suppliers.addEvaluation(supplierId, { ...form, files: pendingFiles })
    setRecords(suppliers.getEvaluations(supplierId))
    setForm(EMPTY)
    setPendingFiles([])
    onAction('평가 기록이 추가되었습니다 · 승인 상태·차기 재평가일 자동 갱신')
    onChanged()
  }

  const del = (id) => {
    if (!requirePermission('sup.evaluation.edit')) return
    suppliers.deleteEvaluation(id)
    setRecords(suppliers.getEvaluations(supplierId))
  }

  return (
    <div className="card-base p-4">
      <div className="text-[13.5px] font-semibold mb-1" style={{ color: 'var(--ink)' }}>평가·재평가 기록 ({records.length}건)</div>
      <div className="text-[11.5px] mb-3" style={{ color: 'var(--ink-mute)' }}>ISO 13485 §7.4.1 — 신규평가·정기재평가·수시평가 기록. 저장 시 공급자 승인 상태와 차기 재평가일이 자동 갱신됩니다.</div>

      {canEdit && (
        <div className="rounded-lg p-3 mb-3" style={{ background: 'var(--bg-soft)' }}>
          <div className="grid sm:grid-cols-3 gap-2">
            <Field label="평가일" type="date" value={form.date} onChange={(v) => setF('date', v)} />
            <SelectField label="평가 종류" value={form.type} onChange={(v) => setF('type', v)} options={EVAL_TYPE_OPTIONS} />
            <Field label="평가자" value={form.evaluator} onChange={(v) => setF('evaluator', v)} />
            <SelectField label="결과" value={form.result} onChange={(v) => setF('result', v)} options={EVAL_RESULT_OPTIONS} />
            <Field label="점수" value={form.score} onChange={(v) => setF('score', v)} placeholder="예: 92/100" />
          </div>
          <TextAreaField label="주요 지적사항" value={form.findings} onChange={(v) => setF('findings', v)} className="mt-2" placeholder="발견사항·개선요구사항 등" />
          <TextAreaField label="비고" value={form.notes} onChange={(v) => setF('notes', v)} className="mt-2" />
          <div className="mt-2">
            <FileAttachList files={pendingFiles} onAdd={addFileToPending} onRemove={removePendingFile} canEdit />
          </div>
          <div className="flex justify-end mt-2">
            <button onClick={add} className="btn-primary" style={{ padding: '0.45rem 0.9rem', fontSize: 12.5 }}><Plus size={13} /> 평가 기록 추가</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {records.map((r) => (
          <div key={r.id} className="p-3 rounded-lg border" style={{ borderColor: 'var(--line)' }}>
            <div className="flex items-center justify-between flex-wrap gap-1.5">
              <div className="text-[12.5px]" style={{ color: 'var(--ink)' }}>
                <Calendar size={12} className="inline mr-1" style={{ color: 'var(--ink-faint)' }} />
                <b>{r.date || '날짜 미기록'}</b> · {r.type} · {r.evaluator || '평가자 미기록'}
              </div>
              <div className="flex items-center gap-2">
                <Badge text={r.result} tone={r.result === evalResult.PASS ? 'emerald' : r.result === evalResult.CONDITIONAL ? 'amber' : 'rose'} />
                {canEdit && <button onClick={() => del(r.id)} className="text-slate-300 hover:text-rose-600"><Trash2 size={14} /></button>}
              </div>
            </div>
            {r.score && <div className="text-[12px] mt-1" style={{ color: 'var(--ink-mute)' }}>점수: {r.score}</div>}
            {r.findings && <div className="text-[12px] mt-1" style={{ color: 'var(--ink-mute)' }}>지적사항: {r.findings}</div>}
            {r.notes && <div className="text-[12px] mt-1" style={{ color: 'var(--ink-faint)' }}>{r.notes}</div>}
            {r.files && r.files.length > 0 && <div className="mt-1.5"><FileAttachList files={r.files} canEdit={false} /></div>}
          </div>
        ))}
        {records.length === 0 && <div className="text-[12px] text-center py-4" style={{ color: 'var(--ink-faint)' }}>아직 평가 기록이 없습니다.</div>}
      </div>
    </div>
  )
}

/* ================================================================
   승인 공급자 목록 (ASL) — 승인/조건부승인 상태만, 읽기 전용 + PDF 다운로드
   ================================================================ */
function escHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function downloadAsPdf(html) {
  const w = window.open('', '_blank')
  if (!w) { window.alert('팝업이 차단되었습니다. 팝업을 허용한 뒤 다시 시도하세요.'); return }
  const withPrint = html.replace('</body>', "<script>window.onload=function(){setTimeout(function(){window.print()},350)}<\/script></body>")
  w.document.write(withPrint)
  w.document.close()
}

function AslTab() {
  const list = suppliers.approvedSuppliers()

  const exportPdf = () => {
    const headers = ['공급자명', '사업자번호', '공급범위', '위험등급', '승인상태', '승인일', '차기재평가일']
    const rows = list.map((s) => [s.name, s.bizNo, s.scope, s.riskClass, s.status, s.approvedDate, s.nextReevalDate])
    const thead = '<tr>' + headers.map((h) => "<th style='border:1px solid #ccc;padding:6px 8px;background:#f3f4f6;text-align:left;font-size:10pt'>" + escHtml(h) + '</th>').join('') + '</tr>'
    const tbody = rows.map((r) => '<tr>' + r.map((c) => "<td style='border:1px solid #ddd;padding:6px 8px;font-size:10pt'>" + escHtml(c ?? '') + '</td>').join('') + '</tr>').join('')
    const table = "<table style='border-collapse:collapse;width:100%;margin:10px 0 20px'><thead>" + thead + '</thead><tbody>' + tbody + '</tbody></table>'
    const today = new Date().toISOString().slice(0, 10)
    const meta = "<div style='font-family:sans-serif;font-size:11pt;color:#555;margin:6px 0 14px'>총 " + list.length + '건 · 생성일 ' + today + '</div>'
    const html = "<html><head><meta charset='utf-8'><title>승인 공급자 목록</title></head><body style='font-family:sans-serif;padding:24px;max-width:900px;margin:0 auto'>" +
      "<h1 style='font-size:16pt;border-bottom:2px solid #333;padding-bottom:6px'>승인 공급자 목록 (ASL)</h1>" + meta + table + '</body></html>'
    downloadAsPdf(html)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-[12px]" style={{ color: 'var(--ink-mute)' }}>
          승인·조건부승인 상태인 공급자만 표시됩니다. (ISO 13485 §7.4.1, KGMP 제22조)
        </div>
        {list.length > 0 && (
          <button onClick={exportPdf} className="btn-primary text-[12px]"><Download size={13} /> PDF 다운로드</button>
        )}
      </div>

      {list.length === 0 ? (
        <EmptyState icon={ShieldCheck} text="승인된 공급자가 없습니다. 공급자대장에서 평가 기록을 추가하면 자동으로 여기에 반영됩니다." />
      ) : (
        <div className="card-base overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['공급자명', '공급범위', '위험등급', '상태', '승인일', '차기재평가일'].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 font-medium" style={{ color: 'var(--ink-mute)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td className="px-3 py-2.5" style={{ color: 'var(--ink)' }}>{s.name}</td>
                  <td className="px-3 py-2.5" style={{ color: 'var(--ink-mute)' }}>{s.scope || '—'}</td>
                  <td className="px-3 py-2.5" style={{ color: 'var(--ink-mute)' }}>{s.riskClass}</td>
                  <td className="px-3 py-2.5"><Badge text={s.status} tone={statusTone(s.status)} /></td>
                  <td className="px-3 py-2.5" style={{ color: 'var(--ink-mute)' }}>{s.approvedDate || '—'}</td>
                  <td className="px-3 py-2.5" style={{ color: 'var(--ink-mute)' }}>{s.nextReevalDate || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
