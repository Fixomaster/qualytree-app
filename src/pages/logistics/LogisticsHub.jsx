import React, { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Truck,
  PackageCheck,
  PackageOpen,
  Route,
  AlertOctagon,
  Plus,
  Trash2,
  Save,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'
import { permissions, requirePermission } from '../../lib/permissions'
import { logs, adverseEvents, LOG_TYPE, AE_STATUS } from '../../lib/logisticsState'

const LOG_TYPE_LIST = Object.values(LOG_TYPE)
const LOG_ICON = {
  [LOG_TYPE.IMPORT_INSPECTION]: PackageCheck,
  [LOG_TYPE.RECEIVING]: PackageOpen,
  [LOG_TYPE.SHIPPING]: Truck,
  [LOG_TYPE.DISTRIBUTION]: Route,
}

export default function LogisticsHub() {
  const user = auth.current()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState(() => searchParams.get('tab') || 'logs')
  const [tick, setTick] = useState(0)
  const refresh = () => setTick((x) => x + 1)
  const [toast, setToast] = useState(null)
  const showToast = (t) => { setToast(t); setTimeout(() => setToast(null), 2400) }

  const allLogs = logs.getAll()
  const allAe = adverseEvents.getAll()
  const openAe = allAe.filter((a) => a.status !== AE_STATUS.CLOSED)

  return (
    <AppLayout user={user} title="입출고·유통관리" subtitle="수입검사 / 입고 / 출고 / 유통기록 · 이상사례 보고">
      <HubBanner icon={Truck} title="물류 관리" subtitle="물류·재고 관리" color="#EA580C" />
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
            LOG · IMPORT / DISTRIBUTION RECORDS
          </span>
          <div className="font-display text-[26px] mt-1" style={{ color: 'var(--ink)', fontWeight: 500 }}>
            입출고·유통관리
          </div>
          <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>
            KGMP 수입 후 유지관리 — 수입검사·입고·출고·유통기록과 이상사례 보고 기록을 관리합니다.
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <StatCard label="전체 기록" value={allLogs.length} hint="수입검사·입고·출고·유통 합계" icon={PackageCheck} />
          <StatCard label="이상사례 보고" value={allAe.length} hint="누적 등록 건수" icon={AlertOctagon} />
          <StatCard label="조사중·미종결" value={openAe.length} hint="조사중 + 보고완료" icon={AlertOctagon} tone={openAe.length > 0 ? 'amber' : undefined} />
        </div>

        <div className="flex gap-1 mb-5 overflow-x-auto" style={{ borderBottom: '1px solid var(--line)' }}>
          <TabButton active={tab === 'logs'} onClick={() => setTab('logs')} icon={Truck} label="수입검사·입고·출고·유통기록" en="LOGS" count={allLogs.length} />
          <TabButton active={tab === 'ae'} onClick={() => setTab('ae')} icon={AlertOctagon} label="이상사례 보고" en="ADVERSE EVENTS" count={allAe.length} />
        </div>

        {tab === 'logs' && <LogsTab key={'logs' + tick} onAction={showToast} refresh={refresh} />}
        {tab === 'ae' && <AeTab key={'ae' + tick} onAction={showToast} refresh={refresh} />}
      </div>
    </AppLayout>
  )
}

/* ================================================================
   수입검사·입고·출고·유통기록
   ================================================================ */
const EMPTY_LOG = { type: LOG_TYPE.IMPORT_INSPECTION, date: '', productName: '', lotNo: '', qty: '', partner: '', result: '', notes: '' }

function LogsTab({ onAction, refresh }) {
  const canEdit = permissions.can('logistics.edit')
  const [filter, setFilter] = useState('ALL')
  const [list, setList] = useState(() => logs.getAll())
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY_LOG)
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const save = () => {
    if (!requirePermission('logistics.edit')) return
    if (!form.productName.trim()) return
    logs.add(form)
    setList(logs.getAll())
    setForm(EMPTY_LOG)
    setAdding(false)
    onAction('기록이 등록되었습니다.')
    refresh()
  }

  const del = (id) => {
    if (!requirePermission('logistics.edit')) return
    if (!window.confirm('이 기록을 삭제할까요?')) return
    logs.delete(id)
    setList(logs.getAll())
    onAction('기록이 삭제되었습니다.')
    refresh()
  }

  const shown = filter === 'ALL' ? list : list.filter((l) => l.type === filter)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        <FilterChip active={filter === 'ALL'} onClick={() => setFilter('ALL')} label="전체" count={list.length} />
        {LOG_TYPE_LIST.map((t) => (
          <FilterChip key={t} active={filter === t} onClick={() => setFilter(t)} label={t} count={list.filter((l) => l.type === t).length} />
        ))}
      </div>

      {canEdit && !adding && (
        <button onClick={() => setAdding(true)} className="btn-ghost text-[12px]">
          <Plus size={12} /> 기록 추가
        </button>
      )}

      {adding && (
        <div className="card-base p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <SelectField label="구분" value={form.type} onChange={(v) => setF('type', v)} options={LOG_TYPE_LIST} />
            <Field label="일자" value={form.date} onChange={(v) => setF('date', v)} type="date" />
            <Field label="제품명" value={form.productName} onChange={(v) => setF('productName', v)} placeholder="제품명" />
            <Field label="LOT No." value={form.lotNo} onChange={(v) => setF('lotNo', v)} placeholder="예: L2026-0713" />
            <Field label="수량" value={form.qty} onChange={(v) => setF('qty', v)} placeholder="예: 50" />
            <Field label="거래처(공급자/고객)" value={form.partner} onChange={(v) => setF('partner', v)} placeholder="공급자 또는 고객사명" />
            <Field label="결과/상태" value={form.result} onChange={(v) => setF('result', v)} placeholder="예: 적합, 완료" />
          </div>
          <TextAreaField label="비고" value={form.notes} onChange={(v) => setF('notes', v)} placeholder="선택 입력" />
          <div className="flex gap-2">
            <button onClick={save} className="btn-primary text-[12.5px]"><Save size={13} /> 저장</button>
            <button onClick={() => { setAdding(false); setForm(EMPTY_LOG) }} className="btn-ghost text-[12.5px]">취소</button>
          </div>
        </div>
      )}

      {shown.length === 0 && !adding && <EmptyState icon={Truck} text="등록된 기록이 없습니다." />}

      {shown.length > 0 && (
        <div className="space-y-2">
          {shown.map((l) => {
            const Icon = LOG_ICON[l.type] || Truck
            return (
              <div key={l.id} className="card-base p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--leaf-soft)', color: 'var(--moss)' }}>
                      <Icon size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge text={l.type} tone="slate" />
                        <span className="text-[13.5px] font-medium" style={{ color: 'var(--ink)' }}>{l.productName || '(제품명 미입력)'}</span>
                      </div>
                      <div className="text-[11.5px] mt-1" style={{ color: 'var(--ink-mute)' }}>
                        {l.date || '일자 미입력'} · LOT {l.lotNo || '—'} · 수량 {l.qty || '—'} · {l.partner || '거래처 미입력'}
                      </div>
                      {l.result && <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-soft)' }}>결과: {l.result}</div>}
                      {l.notes && <div className="text-[11.5px] mt-1" style={{ color: 'var(--ink-faint)' }}>{l.notes}</div>}
                    </div>
                  </div>
                  {canEdit && (
                    <button onClick={() => del(l.id)} className="shrink-0 opacity-50 hover:opacity-100" title="삭제">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ================================================================
   이상사례 보고
   ================================================================ */
const EMPTY_AE = { date: '', productName: '', lotNo: '', description: '', severity: '', reporter: '', status: AE_STATUS.OPEN, actionTaken: '', reportedTo: '', reportedDate: '' }

function AeTab({ onAction, refresh }) {
  const canEdit = permissions.can('logistics.edit')
  const [list, setList] = useState(() => adverseEvents.getAll())
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY_AE)
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const save = () => {
    if (!requirePermission('logistics.edit')) return
    if (!form.description.trim()) return
    adverseEvents.add(form)
    setList(adverseEvents.getAll())
    setForm(EMPTY_AE)
    setAdding(false)
    onAction('이상사례가 등록되었습니다.')
    refresh()
  }

  const del = (id) => {
    if (!requirePermission('logistics.edit')) return
    if (!window.confirm('이 이상사례 기록을 삭제할까요?')) return
    adverseEvents.delete(id)
    setList(adverseEvents.getAll())
    onAction('이상사례 기록이 삭제되었습니다.')
    refresh()
  }

  const setStatus = (id, status) => {
    if (!requirePermission('logistics.edit')) return
    adverseEvents.update(id, { status })
    setList(adverseEvents.getAll())
    refresh()
  }

  return (
    <div className="space-y-3">
      {canEdit && !adding && (
        <button onClick={() => setAdding(true)} className="btn-ghost text-[12px]">
          <Plus size={12} /> 이상사례 등록
        </button>
      )}

      {adding && (
        <div className="card-base p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Field label="발생일" value={form.date} onChange={(v) => setF('date', v)} type="date" />
            <Field label="제품명" value={form.productName} onChange={(v) => setF('productName', v)} placeholder="제품명" />
            <Field label="LOT No." value={form.lotNo} onChange={(v) => setF('lotNo', v)} placeholder="예: L2026-0713" />
            <Field label="심각도" value={form.severity} onChange={(v) => setF('severity', v)} placeholder="예: 경미/중대" />
            <Field label="보고자" value={form.reporter} onChange={(v) => setF('reporter', v)} placeholder="보고자명" />
            <SelectField label="상태" value={form.status} onChange={(v) => setF('status', v)} options={Object.values(AE_STATUS)} />
          </div>
          <TextAreaField label="사례 내용" value={form.description} onChange={(v) => setF('description', v)} placeholder="발생 경위 및 증상을 입력하세요" />
          <TextAreaField label="조치 내용" value={form.actionTaken} onChange={(v) => setF('actionTaken', v)} placeholder="선택 입력" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="보고처(규제기관 등)" value={form.reportedTo} onChange={(v) => setF('reportedTo', v)} placeholder="예: 식품의약품안전처" />
            <Field label="보고일" value={form.reportedDate} onChange={(v) => setF('reportedDate', v)} type="date" />
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="btn-primary text-[12.5px]"><Save size={13} /> 저장</button>
            <button onClick={() => { setAdding(false); setForm(EMPTY_AE) }} className="btn-ghost text-[12.5px]">취소</button>
          </div>
        </div>
      )}

      {list.length === 0 && !adding && <EmptyState icon={AlertOctagon} text="등록된 이상사례가 없습니다." />}

      {list.length > 0 && (
        <div className="space-y-2">
          {list.map((a) => {
            const tone = a.status === AE_STATUS.CLOSED ? 'emerald' : a.status === AE_STATUS.REPORTED ? 'amber' : 'rose'
            return (
              <div key={a.id} className="card-base p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge text={a.status} tone={tone} />
                      <span className="text-[13.5px] font-medium" style={{ color: 'var(--ink)' }}>{a.productName || '(제품명 미입력)'}</span>
                      <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{a.date || '발생일 미입력'}</span>
                    </div>
                    <div className="text-[12px] mt-1" style={{ color: 'var(--ink-soft)' }}>{a.description}</div>
                    {a.actionTaken && <div className="text-[11.5px] mt-1" style={{ color: 'var(--ink-faint)' }}>조치: {a.actionTaken}</div>}
                    {a.reportedTo && <div className="text-[11.5px] mt-1" style={{ color: 'var(--ink-faint)' }}>보고처: {a.reportedTo} ({a.reportedDate || '—'})</div>}
                    {canEdit && (
                      <div className="flex gap-1.5 mt-2">
                        {Object.values(AE_STATUS).map((st) => (
                          <button
                            key={st}
                            onClick={() => setStatus(a.id, st)}
                            className="text-[10.5px] px-2 py-1 rounded-full"
                            style={{
                              background: a.status === st ? 'var(--moss)' : 'var(--bg-soft)',
                              color: a.status === st ? 'var(--bg)' : 'var(--ink-mute)',
                              fontWeight: a.status === st ? 600 : 400,
                            }}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {canEdit && (
                    <button onClick={() => del(a.id)} className="shrink-0 opacity-50 hover:opacity-100" title="삭제">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
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

function FilterChip({ active, onClick, label, count }) {
  return (
    <button
      onClick={onClick}
      className="text-[11.5px] px-2.5 py-1 rounded-full"
      style={{
        background: active ? 'var(--moss)' : 'var(--bg-soft)',
        color: active ? 'var(--bg)' : 'var(--ink-mute)',
        fontWeight: active ? 600 : 400,
      }}
    >
      {label} <span className="opacity-70">{count}</span>
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
