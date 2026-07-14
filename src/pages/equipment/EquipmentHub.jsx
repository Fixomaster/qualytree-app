import React, { useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Wrench,
  Gauge,
  ShieldCheck,
  Plus,
  Trash2,
  Paperclip,
  Download,
  ChevronRight,
  AlertCircle,
  Calendar,
  X,
  Search,
  History,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import { permissions, requirePermission } from '../../lib/permissions'
import { equipment, equipmentStatus, calibrationResult } from '../../lib/equipmentState'
import { fileStore } from '../../lib/fileStore'

export default function EquipmentHub() {
  const user = auth.current()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState(() => searchParams.get('tab') || 'equipment') // equipment | testEquipment | calibration
  const [tick, setTick] = useState(0)
  const refresh = () => setTick((x) => x + 1)
  const [toast, setToast] = useState(null)
  const showToast = (t) => { setToast(t); setTimeout(() => setToast(null), 2400) }

  const s = equipment.load()

  return (
    <AppLayout user={user} title="설비 · 교정" subtitle="설비대장 / 시험장비대장 / 교정 관리">
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
            EQP · EQUIPMENT & CALIBRATION LIBRARY
          </span>
          <div className="font-display text-[26px] mt-1" style={{ color: 'var(--ink)', fontWeight: 500 }}>
            설비 · 교정 관리
          </div>
          <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>
            ISO 13485 §6.3 (기반시설) / §7.6 (모니터링·측정장비 관리) — 설비·시험장비·교정 이력을 한 곳에서 관리합니다.
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <StatCard label="설비" value={s.equipment.length} hint="설비대장 등록 건수" icon={Wrench} />
          <StatCard label="시험장비" value={s.testEquipment.length} hint="시험장비대장 등록 건수" icon={Gauge} />
          <StatCard label="교정성적서" value={s.calibrationCertificates.length} hint="누적 교정 이력" icon={ShieldCheck} />
        </div>

        <div className="flex gap-1 mb-5 overflow-x-auto" style={{ borderBottom: '1px solid var(--line)' }}>
          <TabButton active={tab === 'equipment'} onClick={() => setTab('equipment')} icon={Wrench} label="설비대장" en="EQUIPMENT" count={s.equipment.length} />
          <TabButton active={tab === 'testEquipment'} onClick={() => setTab('testEquipment')} icon={Gauge} label="시험장비대장" en="TEST EQUIPMENT" count={s.testEquipment.length} />
          <TabButton active={tab === 'calibration'} onClick={() => setTab('calibration')} icon={ShieldCheck} label="Calibration" en="교정계획 · 교정성적서" count={s.calibrationCertificates.length + s.calibrationPlans.length} />
        </div>

        {tab === 'equipment' && <EquipmentTab key={tick} onAction={showToast} refresh={refresh} />}
        {tab === 'testEquipment' && <TestEquipmentTab key={'te' + tick} onAction={showToast} refresh={refresh} />}
        {tab === 'calibration' && <CalibrationTab key={'cal' + tick} onAction={showToast} refresh={refresh} />}
      </div>
    </AppLayout>
  )
}

/* ================================================================
   공통 UI
   ================================================================ */
function StatCard({ label, value, hint, icon: Icon }) {
  return (
    <div className="card-base p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--leaf-soft)', color: 'var(--moss)' }}>
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

/** 첨부 파일 목록 + 업로드 버튼. record.files = [{fileId,name,size}] */
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
      alert('파일을 여는 중 오류가 발생했습니다: ' + ((e && e.message) || e))
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

/* ================================================================
   설비대장 탭 — 설비 목록 + 선택 상세(기본정보 · 예방보전계획 · 점검기록)
   ================================================================ */
const EQUIPMENT_STATUS_OPTIONS = Object.values(equipmentStatus)

function EquipmentTab({ onAction, refresh }) {
  const canEdit = permissions.can('eq.equipment.edit')
  const [list, setList] = useState(() => equipment.load().equipment)
  const [selId, setSelId] = useState(list[0]?.id || null)
  const [adding, setAdding] = useState(list.length === 0)
  const sel = list.find((e) => e.id === selId) || null

  const EMPTY = { name: '', assetNo: '', category: '', manufacturer: '', model: '', serialNo: '', location: '', department: '', owner: '', acquiredDate: '', status: equipmentStatus.IN_USE, notes: '' }
  const [form, setForm] = useState(EMPTY)
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const saveNew = () => {
    if (!requirePermission('eq.equipment.edit')) return
    if (!form.name.trim()) return
    const rec = equipment.addEquipment(form)
    setList(equipment.load().equipment)
    setSelId(rec.id)
    setForm(EMPTY)
    setAdding(false)
    onAction('설비가 등록되었습니다.')
    refresh()
  }

  const del = (id) => {
    if (!requirePermission('eq.equipment.edit')) return
    if (!window.confirm('이 설비와 연결된 예방보전계획·점검기록·교정 이력이 함께 삭제됩니다. 계속할까요?')) return
    equipment.deleteEquipment(id)
    const next = equipment.load().equipment
    setList(next)
    setSelId(next[0]?.id || null)
    onAction('설비가 삭제되었습니다.')
    refresh()
  }

  return (
    <div className="grid lg:grid-cols-[340px_1fr] gap-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[12.5px] font-medium" style={{ color: 'var(--ink)' }}>설비 목록 ({list.length}건)</div>
          {canEdit && (
            <button onClick={() => { setAdding((v) => !v); setForm(EMPTY) }} className="inline-flex items-center gap-1 text-[12px] font-medium" style={{ color: 'var(--moss)' }}>
              <Plus size={13} /> 설비 추가
            </button>
          )}
        </div>

        {adding && canEdit && (
          <div className="card-base p-3 mb-3 space-y-2">
            <Field label="설비명 *" value={form.name} onChange={(v) => setF('name', v)} placeholder="예: 사출성형기 #1" />
            <Field label="관리번호" value={form.assetNo} onChange={(v) => setF('assetNo', v)} placeholder="예: EQ-2026-001" />
            <Field label="설비 분류" value={form.category} onChange={(v) => setF('category', v)} placeholder="예: 성형설비" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setAdding(false)} className="btn-ghost" style={{ padding: '0.4rem 0.8rem', fontSize: 12.5 }}>취소</button>
              <button onClick={saveNew} disabled={!form.name.trim()} className="btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: 12.5 }}>
                <Plus size={13} /> 저장
              </button>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          {list.map((e) => (
            <button
              key={e.id}
              onClick={() => setSelId(e.id)}
              className="w-full text-left px-3 py-2.5 rounded-lg border flex items-center gap-2 transition"
              style={{
                borderColor: e.id === selId ? 'var(--moss)' : 'var(--line)',
                background: e.id === selId ? 'var(--leaf-soft)' : 'var(--bg-card)',
              }}
            >
              <Wrench size={14} style={{ color: 'var(--moss)' }} />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium truncate" style={{ color: 'var(--ink)' }}>{e.name || '(이름없음)'}</span>
                <span className="block text-[11px]" style={{ color: 'var(--ink-faint)' }}>{e.assetNo || '관리번호 미입력'} · {e.status}</span>
              </span>
              <ChevronRight size={14} style={{ color: 'var(--ink-faint)' }} />
            </button>
          ))}
          {list.length === 0 && !adding && <EmptyState icon={Wrench} text="등록된 설비가 없습니다." />}
        </div>
      </div>

      <div>
        {sel ? (
          <EquipmentDetail key={sel.id} item={sel} canEdit={canEdit} onAction={onAction}
            onChanged={() => { setList(equipment.load().equipment) }}
            onDelete={() => del(sel.id)} />
        ) : (
          <EmptyState icon={Wrench} text="왼쪽에서 설비를 선택하거나 새로 등록하세요." />
        )}
      </div>
    </div>
  )
}

function EquipmentDetail({ item, canEdit, onAction, onChanged, onDelete }) {
  const [form, setForm] = useState(item)
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const dirty = JSON.stringify(form) !== JSON.stringify(item)

  const save = () => {
    if (!requirePermission('eq.equipment.edit')) return
    equipment.updateEquipment(item.id, form)
    onChanged()
    onAction('설비 정보가 저장되었습니다.')
  }

  return (
    <div className="space-y-4">
      <div className="card-base p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>설비대장 · 기본 정보</div>
          {canEdit && <button onClick={onDelete} className="text-[12px] inline-flex items-center gap-1" style={{ color: 'var(--rust)' }}><Trash2 size={13} /> 설비 삭제</button>}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="설비명" value={form.name} onChange={(v) => setF('name', v)} />
          <Field label="관리번호" value={form.assetNo} onChange={(v) => setF('assetNo', v)} />
          <Field label="설비 분류" value={form.category} onChange={(v) => setF('category', v)} />
          <Field label="제조사" value={form.manufacturer} onChange={(v) => setF('manufacturer', v)} />
          <Field label="모델명" value={form.model} onChange={(v) => setF('model', v)} />
          <Field label="일련번호" value={form.serialNo} onChange={(v) => setF('serialNo', v)} />
          <Field label="설치 위치" value={form.location} onChange={(v) => setF('location', v)} />
          <Field label="관리 부서" value={form.department} onChange={(v) => setF('department', v)} />
          <Field label="담당자" value={form.owner} onChange={(v) => setF('owner', v)} />
          <Field label="취득일" type="date" value={form.acquiredDate} onChange={(v) => setF('acquiredDate', v)} />
          <SelectField label="상태" value={form.status} onChange={(v) => setF('status', v)} options={EQUIPMENT_STATUS_OPTIONS} />
        </div>
        <TextAreaField label="비고" value={form.notes} onChange={(v) => setF('notes', v)} className="mt-3" />
        {canEdit && (
          <div className="flex justify-end mt-3">
            <button onClick={save} disabled={!dirty} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: 12.5 }}>변경사항 저장</button>
          </div>
        )}
      </div>

      <EquipmentHistoryCard equipmentId={item.id} />
      <MaintenancePlanCard equipmentId={item.id} canEdit={canEdit} onAction={onAction} />
      <InspectionRecordsCard equipmentId={item.id} canEdit={canEdit} onAction={onAction} />
    </div>
  )
}

/* ================================================================
   설비이력 — 점검기록·예방보전계획·교정이력을 하나의 타임라인으로 통합
   ================================================================ */
function EquipmentHistoryCard({ equipmentId }) {
  const [open, setOpen] = useState(true)
  const plan = equipment.getMaintenancePlan(equipmentId)
  const inspections = equipment.getInspectionRecords(equipmentId)
  const certs = equipment.getCalibrationCertificates('equipment', equipmentId)

  const events = []
  inspections.forEach((r) => events.push({
    date: r.date, kind: '점검기록', tone: r.result === '불량' ? 'var(--rust)' : r.result === '주의' ? 'var(--amber)' : 'var(--moss)',
    summary: `${r.inspector || '점검자 미기록'} · 결과 ${r.result}`, notes: r.notes,
  }))
  certs.forEach((c) => events.push({
    date: c.calDate, kind: '교정이력', tone: c.result === calibrationResult.FAIL ? 'var(--rust)' : c.result === calibrationResult.CONDITIONAL ? 'var(--amber)' : 'var(--moss)',
    summary: `${c.vendor || '교정기관 미기록'}${c.certNo ? ' · ' + c.certNo : ''} · 판정 ${c.result}${c.validUntil ? ` (유효기한 ${c.validUntil})` : ''}`, notes: c.notes,
  }))
  if (plan && (plan.lastDate || plan.nextDate)) {
    if (plan.lastDate) events.push({ date: plan.lastDate, kind: '예방보전', tone: 'var(--moss)', summary: `최근 수행 · ${plan.method || '방법 미기록'}`, notes: plan.notes })
    if (plan.nextDate) events.push({ date: plan.nextDate, kind: '예방보전 (예정)', tone: 'var(--amber)', summary: `다음 예정 · 주기 ${plan.cycleMonths || '?'}개월`, notes: '' })
  }
  events.sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  return (
    <div className="card-base p-4">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History size={15} style={{ color: 'var(--moss)' }} />
          <span className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>설비이력 통합보기 ({events.length}건)</span>
        </div>
        <ChevronRight size={16} style={{ color: 'var(--ink-faint)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
      </button>
      {open && (
        <>
          <div className="text-[11.5px] mt-1 mb-3" style={{ color: 'var(--ink-mute)' }}>점검기록 · 예방보전계획 · 교정성적서를 하나의 타임라인으로 모아 보여줍니다.</div>
          {events.length === 0 ? (
            <div className="text-[12px] text-center py-4" style={{ color: 'var(--ink-faint)' }}>아직 이력이 없습니다.</div>
          ) : (
            <div className="space-y-2">
              {events.map((e, i) => (
                <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
                  <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: e.tone }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono" style={{ color: 'var(--ink-faint)' }}>{e.date || '날짜 미기록'}</span>
                      <span className="text-[10.5px] px-1.5 py-0.5 rounded font-semibold" style={{ background: 'var(--bg-card)', color: e.tone }}>{e.kind}</span>
                    </div>
                    <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink)' }}>{e.summary}</div>
                    {e.notes && <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>{e.notes}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function MaintenancePlanCard({ equipmentId, canEdit, onAction }) {
  const EMPTY = { cycleMonths: '', lastDate: '', nextDate: '', method: '', notes: '' }
  const [plan, setPlan] = useState(() => equipment.getMaintenancePlan(equipmentId) || EMPTY)
  const setP = (k, v) => setPlan((p) => ({ ...p, [k]: v }))

  const save = () => {
    if (!requirePermission('eq.equipment.edit')) return
    equipment.setMaintenancePlan(equipmentId, plan)
    onAction('예방보전계획이 저장되었습니다.')
  }

  return (
    <div className="card-base p-4">
      <div className="text-[13.5px] font-semibold mb-1" style={{ color: 'var(--ink)' }}>예방보전계획</div>
      <div className="text-[11.5px] mb-3" style={{ color: 'var(--ink-mute)' }}>ISO 13485 §6.3 — 설비 예방정비 주기 및 다음 예정일을 관리합니다.</div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="점검 주기 (개월)" type="number" value={plan.cycleMonths} onChange={(v) => setP('cycleMonths', v)} placeholder="예: 6" />
        <Field label="점검 방법" value={plan.method} onChange={(v) => setP('method', v)} placeholder="예: 윤활유 교체·정밀도 점검" />
        <Field label="최근 수행일" type="date" value={plan.lastDate} onChange={(v) => setP('lastDate', v)} />
        <Field label="다음 예정일" type="date" value={plan.nextDate} onChange={(v) => setP('nextDate', v)} />
      </div>
      <TextAreaField label="비고" value={plan.notes} onChange={(v) => setP('notes', v)} className="mt-3" />
      {canEdit && (
        <div className="flex justify-end mt-3">
          <button onClick={save} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: 12.5 }}>계획 저장</button>
        </div>
      )}
    </div>
  )
}

function InspectionRecordsCard({ equipmentId, canEdit, onAction }) {
  const [records, setRecords] = useState(() => equipment.getInspectionRecords(equipmentId))
  const EMPTY = { date: '', inspector: '', result: '양호', notes: '' }
  const [form, setForm] = useState(EMPTY)
  const [pendingFiles, setPendingFiles] = useState([]) // {fileId,name,size} — 저장 전 임시 첨부
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const addFileToPending = async (file) => {
    const fileId = await fileStore.saveFile(file)
    setPendingFiles((f) => [...f, { fileId, name: file.name, size: file.size }])
  }
  const removePendingFile = (fileId) => setPendingFiles((f) => f.filter((x) => x.fileId !== fileId))

  const add = () => {
    if (!requirePermission('eq.equipment.edit')) return
    if (!form.date) { alert('점검읽을 입력하세요.'); return }
    equipment.addInspectionRecord(equipmentId, { ...form, files: pendingFiles })
    setRecords(equipment.getInspectionRecords(equipmentId))
    setForm(EMPTY)
    setPendingFiles([])
    onAction('점검기록이 추가되었습니다.')
  }

  const del = (id) => {
    if (!requirePermission('eq.equipment.edit')) return
    equipment.deleteInspectionRecord(id)
    setRecords(equipment.getInspectionRecords(equipmentId))
  }

  return (
    <div className="card-base p-4">
      <div className="text-[13.5px] font-semibold mb-1" style={{ color: 'var(--ink)' }}>점검기록 ({records.length}건)</div>
      <div className="text-[11.5px] mb-3" style={{ color: 'var(--ink-mute)' }}>ISO 13485 §7.5 — 일상·정기 점검 결과와 근거 파일을 기록합니다.</div>

      {canEdit && (
        <div className="rounded-lg p-3 mb-3" style={{ background: 'var(--bg-soft)' }}>
          <div className="grid sm:grid-cols-3 gap-2">
            <Field label="점검일" type="date" value={form.date} onChange={(v) => setF('date', v)} />
            <Field label="점검자" value={form.inspector} onChange={(v) => setF('inspector', v)} />
            <SelectField label="결과" value={form.result} onChange={(v) => setF('result', v)} options={['양호', '주의', '불량']} />
          </div>
          <TextAreaField label="비고" value={form.notes} onChange={(v) => setF('notes', v)} className="mt-2" />
          <div className="mt-2">
            <FileAttachList files={pendingFiles} onAdd={addFileToPending} onRemove={removePendingFile} canEdit />
          </div>
          <div className="flex justify-end mt-2">
            <button onClick={add} className="btn-primary" style={{ padding: '0.45rem 0.9rem', fontSize: 12.5 }}><Plus size={13} /> 점검기록 추가</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {records.map((r) => (
          <div key={r.id} className="p-3 rounded-lg border" style={{ borderColor: 'var(--line)' }}>
            <div className="flex items-center justify-between">
              <div className="text-[12.5px]" style={{ color: 'var(--ink)' }}>
                <Calendar size={12} className="inline mr-1" style={{ color: 'var(--ink-faint)' }} />
                <b>{r.date || '날짜 미기록'}</b> · {r.inspector || '점검자 미기록'} ·{' '}
                <span style={{ color: r.result === '불량' ? 'var(--rust)' : r.result === '주의' ? 'var(--amber)' : 'var(--moss)' }}>{r.result}</span>
              </div>
              {canEdit && <button onClick={() => del(r.id)} className="text-slate-300 hover:text-rose-600"><Trash2 size={14} /></button>}
            </div>
            {r.notes && <div className="text-[12px] mt-1" style={{ color: 'var(--ink-mute)' }}>{r.notes}</div>}
            {r.files && r.files.length > 0 && <div className="mt-1.5"><FileAttachList files={r.files} canEdit={false} /></div>}
          </div>
        ))}
        {records.length === 0 && <div className="text-[12px] text-center py-4" style={{ color: 'var(--ink-faint)' }}>아직 점검기록이 없습니다.</div>}
      </div>
    </div>
  )
}

/* ================================================================
   시험장비대장 탭
   ================================================================ */
function TestEquipmentTab({ onAction, refresh }) {
  const canEdit = permissions.can('eq.testEquipment.edit')
  const [list, setList] = useState(() => equipment.load().testEquipment)
  const [editingId, setEditingId] = useState(null)
  const EMPTY = { name: '', assetNo: '', manufacturer: '', model: '', serialNo: '', range: '', accuracy: '', location: '', department: '', owner: '', acquiredDate: '', status: equipmentStatus.IN_USE, notes: '' }
  const [form, setForm] = useState(EMPTY)
  const [adding, setAdding] = useState(false)
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const startAdd = () => { setForm(EMPTY); setEditingId(null); setAdding(true) }
  const startEdit = (item) => { setForm(item); setEditingId(item.id); setAdding(true) }
  const cancel = () => { setAdding(false); setEditingId(null); setForm(EMPTY) }

  const save = () => {
    if (!requirePermission('eq.testEquipment.edit')) return
    if (!form.name.trim()) return
    if (editingId) {
      equipment.updateTestEquipment(editingId, form)
      onAction('시험장비 정보가 저장되었습니다.')
    } else {
      equipment.addTestEquipment(form)
      onAction('시험장비가 등록되었습니다.')
    }
    setList(equipment.load().testEquipment)
    cancel()
    refresh()
  }

  const del = (id) => {
    if (!requirePermission('eq.testEquipment.edit')) return
    if (!window.confirm('이 시험장비와 연결된 교정 이력이 함께 삭제됩니다. 계속할까요?')) return
    equipment.deleteTestEquipment(id)
    setList(equipment.load().testEquipment)
    onAction('시험장비가 삭제되었습니다.')
    refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[12.5px] font-medium" style={{ color: 'var(--ink)' }}>시험장비대장 ({list.length}건)</div>
        {canEdit && !adding && (
          <button onClick={startAdd} className="btn-primary" style={{ padding: '0.45rem 0.9rem', fontSize: 12.5 }}><Plus size={13} /> 시험장비 추가</button>
        )}
      </div>

      {adding && canEdit && (
        <div className="card-base p-4 mb-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="장비명 *" value={form.name} onChange={(v) => setF('name', v)} placeholder="예: 디지털 캘리퍼스" />
            <Field label="관리번호" value={form.assetNo} onChange={(v) => setF('assetNo', v)} placeholder="예: TE-2026-001" />
            <Field label="제조사" value={form.manufacturer} onChange={(v) => setF('manufacturer', v)} />
            <Field label="모델명" value={form.model} onChange={(v) => setF('model', v)} />
            <Field label="일련번호" value={form.serialNn} onChange={(v) => setF('serialNo', v)} />
            <Field label="측정 범위" value={form.range} onChange={(v) => setF('range', v)} placeholder="예: 0~150mm" />
            <Field label="정밀도/정확도" value={form.accuracy} onChange={(v) => setF('accuracy', v)} placeholder="예: ±0.02mm" />
            <Field label="보관 위치" value={form.location} onChange={(v) => setF('location', v)} />
            <Field label="관리 부서" value={form.department} onChange={(v) => setF('department', v)} />
            <Field label="담당자" value={form.owner} onChange={(v) => setF('owner', v)} />
            <Field label="취득일" type="date" value={form.acquiredDate} onChange={(v) => setF('acquiredDate', v)} />
            <SelectField label="상태" value={form.status} onChange={(v) => setF('status', v)} options={EQUIPMENT_STATUS_OPTIONS} />
          </div>
          <TextAreaField label="비고" value={form.notes} onChange={(v) => setF('notes', v)} className="mt-3" />
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={cancel} className="btn-ghost" style={{ padding: '0.5rem 1rem', fontSize: 12.5 }}>취소</button>
            <button onClick={save} disabled={!form.name.trim()} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: 12.5 }}>{editingId ? '수정 저장' : '저장'}</button>
          </div>
        </div>
      )}

      {list.length === 0 && !adding ? (
        <EmptyState icon={Gauge} text="등록된 시험장비가 없습니다." />
      ) : (
        <div className="card-base divide-y" style={{ borderColor: 'var(--line)' }}>
          {list.map((e) => (
            <div key={e.id} className="flex items-center gap-3 px-4 py-3">
              <Gauge size={16} style={{ color: 'var(--moss)' }} />
              <button onClick={() => startEdit(e)} className="flex-1 text-left min-w-0">
                <span className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{e.name || '(이름없음)'}</span>
                <span className="text-[11.5px] ml-2" style={{ color: 'var(--ink-faint)' }}>{e.assetNo || '관리번호 미입력'} · {e.range || '측정범위 미입력'} · {e.status}</span>
              </button>
              {canEdit && <button onClick={() => del(e.id)} className="text-slate-300 hover:text-rose-600"><Trash2 size={15} /></button>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ================================================================
   Calibration 탭 — 교정계획 · 교정성적서 (설비/시험장비 공용 대상 선택)
   ================================================================ */
function CalibrationTab({ onAction, refresh }) {
  const canEdit = permissions.can('eq.calibration.edit')
  const targets = equipment.allCalibrationTargets()
  const [targetKey, setTargetKey] = useState(targets[0] ? `${targets[0].targetType}:${targets[0].targetId}` : '')
  const [targetType, targetId] = targetKey ? targetKey.split(':') : [null, null]
  const target = targets.find((t) => t.targetType === targetType && t.targetId === targetId) || null

  if (targets.length === 0) {
    return <EmptyState icon={ShieldCheck} text="교정을 등록하려면 먼저 설비대장 또는 시험장비대장에 항목을 추가하세요." />
  }

  return (
    <div>
      <div className="mb-4 max-w-sm">
        <SelectField
          label="교정 대상 선택"
          value={targetKey}
          onChange={setTargetKey}
          options={targets.map((t) => ({ value: `${t.targetType}:${t.targetId}`, label: `${t.targetType === 'equipment' ? '[설비] ' : '[시험장비] '}${t.name || '(이름없음)'}${t.assetNo ? ' · ' + t.assetNo : ''}` }))}
        />
      </div>

      {target && (
        <div className="space-y-4">
          <CalibrationPlanCard key={targetKey + '-plan'} targetType={targetType} targetId={targetId} canEdit={canEdit} onAction={onAction} />
          <CalibrationCertificatesCard key={targetKey + '-cert'} targetType={targetType} targetId={targetId} canEdit={canEdit} onAction={onAction} />
        </div>
      )}
    </div>
  )
}

function CalibrationPlanCard({ targetType, targetId, canEdit, onAction }) {
  const EMPTY = { cycleMonths: '', lastDate: '', nextDate: '', vendor: '', notes: '' }
  const [plan, setPlan] = useState(() => equipment.getCalibrationPlan(targetType, targetId) || EMPTY)
  const setP = (k, v) => setPlan((p) => ({ ...p, [k]: v }))

  const save = () => {
    if (!requirePermission('eq.calibration.edit')) return
    equipment.setCalibrationPlan(targetType, targetId, plan)
    onAction('교정계획이 저장되었습니다.')
  }

  return (
    <div className="card-base p-4">
      <div className="text-[13.5px] font-semibold mb-1" style={{ color: 'var(--ink)' }}>교정계획</div>
      <div className="text-[11.5px] mb-3" style={{ color: 'var(--ink-mute)' }}>ISO 13485 §7.6 — 측정 정확도를 보증하기 위한 교정 주기·다음 예정일을 관리합니다.</div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="교정 주기 (개월)" type="number" value={plan.cycleMonths} onChange={(v) => setP('cycleMonths', v)} placeholder="예: 12" />
        <Field label="교정기관" value={plan.vendor} onChange={(v) => setP('vendor', v)} placeholder="예: 한국표준과학연구원" />
        <Field label="최근 교정일" type="date" value={plan.lastDate} onChange={(v) => setP('lastDate', v)} />
        <Field label="다음 교정 예정일" type="date" value={plan.nextDate} onChange={(v) => setP('nextDate', v)} />
      </div>
      <TextAreaField label="비고" value={plan.notes} onChange={(v) => setP('notes', v)} className="mt-3" />
      {canEdit && (
        <div className="flex justify-end mt-3">
          <button onClick={save} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: 12.5 }}>계획 저장</button>
        </div>
      )}
    </div>
  )
}

function CalibrationCertificatesCard({ targetType, targetId, canEdit, onAction }) {
  const [certs, setCerts] = useState(() => equipment.getCalibrationCertificates(targetType, targetId))
  const EMPTY = { calDate: '', vendor: '', certNo: '', result: calibrationResult.PASS, validUntil: '', notes: '' }
  const [form, setForm] = useState(EMPTY)
  const [pendingFiles, setPendingFiles] = useState([])
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const addFileToPending = async (file) => {
    const fileId = await fileStore.saveFile(file)
    setPendingFiles((f) => [...f, { fileId, name: file.name, size: file.size }])
  }
  const removePendingFile = (fileId) => setPendingFiles((f) => f.filter((x) => x.fileId !== fileId))

  const add = () => {
    if (!requirePermission('eq.calibration.edit')) return
    if (!form.calDate) { alert('교정일자를 입력하세요.'); return }
    equipment.addCalibrationCertificate(targetType, targetId, { ...form, files: pendingFiles })
    setCerts(equipment.getCalibrationCertificates(targetType, targetId))
    setForm(EMPTY)
    setPendingFiles([])
    onAction('교정성적서가 등록되었습니다.')
  }

  const del = (id) => {
    if (!requirePermission('eq.calibration.edit')) return
    equipment.deleteCalibrationCertificate(id)
    setCerts(equipment.getCalibrationCertificates(targetType, targetId))
  }

  const resultColor = (r) => (r === calibrationResult.FAIL ? 'var(--rust)' : r === calibrationResult.CONDITIONAL ? 'var(--amber)' : 'var(--moss)')

  return (
    <div className="card-base p-4">
      <div className="text-[13.5px] font-semibold mb-1" style={{ color: 'var(--ink)' }}>교정성적서 ({certs.length}건)</div>
      <div className="text-[11.5px] mb-3" style={{ color: 'var(--ink-mute)' }}>교정기관에서 발급한 성적서 파일을 함께 첨부해 보관합니다.</div>

      {canEdit && (
        <div className="rounded-lg p-3 mb-3" style={{ background: 'var(--bg-soft)' }}>
          <div className="grid sm:grid-cols-3 gap-2">
            <Field label="교정일자" type="date" value={form.calDate} onChange={(v) => setF('calDate', v)} />
            <Field label="교정기관" value={form.vendor} onChange={(v) => setF('vendor', v)} />
            <Field label="성적서 번호" value={form.certNo} onChange={(v) => setF('certNo', v)} />
            <Field label="유효기한" type="date" value={form.validUntil} onChange={(v) => setF('validUntil', v)} />
            <SelectField label="판정" value={form.result} onChange={(v) => setF('result', v)} options={Object.values(calibrationResult)} />
          </div>
          <TextAreaField label="비고" value={form.notes} onChange={(v) => setF('notes', v)} className="mt-2" />
          <div className="mt-2">
            <FileAttachList files={pendingFiles} onAdd={addFileToPending} onRemove={removePendingFile} canEdit />
          </div>
          <div className="flex justify-end mt-2">
            <button onClick={add} className="btn-primary" style={{ padding: '0.45rem 0.9rem', fontSize: 12.5 }}><Plus size={13} /> 교정성적서 등록</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {certs.map((c) => (
          <div key={c.id} className="p-3 rounded-lg border" style={{ borderColor: 'var(--line)' }}>
            <div className="flex items-center justify-between">
              <div className="text-[12.5px]" style={{ color: 'var(--ink)' }}>
                <Calendar size={12} className="inline mr-1" style={{ color: 'var(--ink-faint)' }} />
                <b>{c.calDate || '날짜 미기록'}</b> · {c.vendor || '교정기관 미기록'} {c.certNo && <>· {c.certNo}</>} ·{' '}
                <span style={{ color: resultColor(c.result) }}>{c.result}</span>
                {c.validUntil && <span className="ml-1" style={{ color: 'var(--ink-faint)' }}>(유효기한 {c.validUntil})</span>}
              </div>
              {canEdit && <button onClick={() => del(c.id)} className="text-slate-300 hover:text-rose-600"><Trash2 size={14} /></button>}
            </div>
            {c.notes && <div className="text-[12px] mt-1" style={{ color: 'var(--ink-mute)' }}>{c.notes}</div>}
            {c.files && c.files.length > 0 && <div className="mt-1.5"><FileAttachList files={c.files} canEdit={false} /></div>}
          </div>
        ))}
        {certs.length === 0 && <div className="text-[12px] text-center py-4" style={{ color: 'var(--ink-faint)' }}>아직 교정성적서가 없습니다.</div>}
      </div>
    </div>
  )
}
