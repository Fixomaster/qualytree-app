// src/pages/customer-property/CustomerPropertyHub.jsx
// ISO 13485 §7.5.10 고객재산(Customer Property) 관리
// 고객이 제공한 지급자재·부품, 금형·지그·전용공구, 수리·서비스 위탁 기기, 지적재산·기밀정보,
// 개인정보 등을 식별·검증·보호하고, 손상·분실·사용부적합 시 고객에게 통보한 기록을 관리한다.
import React, { useState, useMemo } from 'react'
import {
  Save, Edit2, Trash2, Handshake, PackageCheck, ShieldAlert,
  Archive, AlertTriangle, CheckCircle2, Search,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'

// ── 상수 ─────────────────────────────────────────────────────
const LS_ASSETS = 'qualytree.customer_property'

function assetId() { return `CP-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }
function todayStr() { return new Date().toISOString().slice(0, 10) }

const ASSET_TYPES = {
  material: { label: '지급 자재·부품', icon: '📦' },
  tooling:  { label: '금형·지그·전용공구', icon: '🛠' },
  device:   { label: '고객 기기 (수리·서비스 위탁)', icon: '⚙️' },
  ip:       { label: '지적재산·기밀정보', icon: '📄' },
  personal: { label: '개인정보(건강정보 포함)', icon: '🔒' },
  other:    { label: '기타', icon: '📋' },
}

const ASSET_STATUSES = {
  received: { label: '접수 확인', color: '#2563EB', bg: '#EFF6FF' },
  in_use:   { label: '보관·사용 중', color: '#7C3AED', bg: '#F5F3FF' },
  returned: { label: '반환 완료', color: '#059669', bg: '#D1FAE5' },
  damaged:  { label: '손상', color: '#D97706', bg: '#FEF3C7' },
  lost:     { label: '분실', color: '#DC2626', bg: '#FEE2E2' },
  disposed: { label: '폐기(고객합의)', color: '#9CA3AF', bg: '#F3F4F6' },
}

const EMPTY_ASSET = {
  assetType: 'material', assetName: '', customerName: '', spec: '', qty: '',
  receivedDate: todayStr(), storageLocation: '', relatedOrderNo: '',
  status: 'received', returnedDate: '',
  incidentDate: '', incidentDesc: '',
  customerNotified: false, notifiedDate: '', correctiveAction: '',
  notes: '',
}

// ── 메인 ─────────────────────────────────────────────────────
export default function CustomerPropertyHub() {
  const user = auth.current()
  const canEdit = user?.level >= 2

  const [assets, setAssets] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_ASSETS) || '[]') } catch { return [] }
  })
  const [tab, setTab] = useState('assets')   // assets | analysis
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_ASSET)
  const [editId, setEditId] = useState(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  function save(list) { setAssets(list); localStorage.setItem(LS_ASSETS, JSON.stringify(list)) }

  function submit() {
    if (!form.assetName.trim()) return alert('자산명을 입력하세요.')
    if (!form.customerName.trim()) return alert('고객사명을 입력하세요.')
    if ((form.status === 'damaged' || form.status === 'lost') && !form.customerNotified) {
      if (!confirm('손상/분실 상태인데 고객 통보가 체크되어 있지 않습니다. §7.5.10에 따라 고객에게 통보 후 기록해야 합니다. 계속 저장하시겠습니까?')) return
    }
    const next = editId
      ? assets.map(a => a.id === editId ? { ...a, ...form } : a)
      : [{ id: assetId(), createdAt: todayStr(), ...form }, ...assets]
    save(next)
    setShowForm(false); setForm(EMPTY_ASSET); setEditId(null)
  }

  function quickStatus(id, status) {
    save(assets.map(a => a.id === id ? { ...a, status, ...(status === 'returned' ? { returnedDate: todayStr() } : {}) } : a))
  }

  const filtered = useMemo(() => assets.filter(a => {
    if (filter !== 'all' && a.status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!a.assetName.toLowerCase().includes(q) && !a.customerName.toLowerCase().includes(q)) return false
    }
    return true
  }), [assets, filter, search])

  const analysis = useMemo(() => {
    const byStatus = {}
    Object.keys(ASSET_STATUSES).forEach(k => { byStatus[k] = assets.filter(a => a.status === k).length })
    const needsReport = assets.filter(a => (a.status === 'damaged' || a.status === 'lost') && !a.customerNotified)
    const byType = {}
    Object.keys(ASSET_TYPES).forEach(k => { byType[k] = assets.filter(a => a.assetType === k).length })
    return { byStatus, needsReport, byType }
  }, [assets])

  const openNew = () => { setTab('assets'); setForm(EMPTY_ASSET); setEditId(null); setShowForm(true) }

  return (
    <AppLayout user={user} title="고객자산관리" subtitle="ISO 13485 §7.5.10 · 고객재산 식별·검증·보호 · 손상·분실 고객 통보">
      <div className="px-6 lg:px-8 py-6 max-w-[1400px] mx-auto">

        <HubBanner
          title="고객자산관리"
          subtitle="ISO 13485 §7.5.10 · 고객이 제공한 자재·공구·기기·정보의 식별·보호 및 이상 발생 시 고객 통보"
          icon={Handshake}
          color="#0D9488"
          quickActions={canEdit ? [{ label: '고객자산 등록', icon: PackageCheck, onClick: openNew, primary: true }] : []}
          workflow={['자산 접수·식별', '보관·사용', '상태 점검', '손상·분실 시 고객 통보', '반환·정산']}
        />

        {analysis.needsReport.length > 0 && (
          <div className="mb-5 p-4 rounded-2xl flex items-start gap-3" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
            <ShieldAlert size={18} style={{ color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
            <div>
              <div className="text-[13px] font-bold" style={{ color: '#7F1D1D' }}>고객 통보가 필요한 손상·분실 자산 {analysis.needsReport.length}건</div>
              <div className="text-[12px] mt-0.5" style={{ color: '#991B1B' }}>
                §7.5.10에 따라 고객재산이 손상·분실되거나 사용에 부적합한 것으로 판명되면 고객에게 통보하고 기록을 유지해야 합니다.
                {' '}{analysis.needsReport.map(a => a.assetName).join(', ')}
              </div>
            </div>
          </div>
        )}

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <Kpi label="전체 고객자산" value={assets.length} />
          <Kpi label="보관·사용 중" value={analysis.byStatus.in_use || 0} />
          <Kpi label="손상·분실 (통보필요)" value={analysis.needsReport.length} bad={analysis.needsReport.length > 0} />
          <Kpi label="반환 완료" value={analysis.byStatus.returned || 0} good />
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-soft)' }}>
          {[
            { key: 'assets',   label: `고객자산 현황 (${assets.length})` },
            { key: 'analysis', label: '현황 분석' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="px-4 py-1.5 rounded-lg text-[13px] font-semibold transition"
              style={{
                background: tab === t.key ? 'var(--bg-card)' : 'transparent',
                color: tab === t.key ? 'var(--moss)' : 'var(--ink-soft)',
                boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                border: 'none', cursor: 'pointer',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── 고객자산 현황 탭 ── */}
        {tab === 'assets' && (
          <div>
            <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
              <div className="flex gap-2 flex-wrap items-center">
                <div className="relative">
                  <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)' }} />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="자산명 / 고객사 검색..."
                    className="pl-7 pr-3 py-1.5 rounded-xl text-[13px]"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', width: 200 }} />
                </div>
                <select value={filter} onChange={e => setFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl text-[13px]"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                  <option value="all">전체 상태</option>
                  {Object.entries(ASSET_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              {!canEdit && <div className="text-[11.5px] px-1" style={{ color: 'var(--ink-faint)' }}>조회 권한만 있습니다.</div>}
            </div>

            {showForm && (
              <AssetForm form={form} setForm={setForm} onSave={submit}
                onCancel={() => { setShowForm(false); setForm(EMPTY_ASSET); setEditId(null) }}
                isEdit={!!editId} />
            )}

            {filtered.length === 0 ? (
              <Empty icon={Archive} text="등록된 고객자산이 없습니다." />
            ) : (
              <div className="space-y-3">
                {filtered.map(a => {
                  const sm = ASSET_STATUSES[a.status] || ASSET_STATUSES.received
                  const type = ASSET_TYPES[a.assetType] || ASSET_TYPES.other
                  const needsReport = (a.status === 'damaged' || a.status === 'lost') && !a.customerNotified
                  return (
                    <div key={a.id} className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: `1.5px solid ${needsReport ? '#FECACA' : 'var(--line)'}` }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-[11px] font-mono" style={{ color: 'var(--ink-faint)' }}>{a.id}</span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
                            <span className="text-[11px]">{type.icon} {type.label}</span>
                            {needsReport && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#FEE2E2', color: '#DC2626' }}>⚠ 고객 통보 필요</span>}
                            {a.customerNotified && (a.status === 'damaged' || a.status === 'lost') && (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#EFF6FF', color: '#2563EB' }}>통보완료 {a.notifiedDate}</span>
                            )}
                          </div>
                          <div className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>{a.assetName}</div>
                          <div className="flex gap-3 text-[12px] flex-wrap mt-0.5" style={{ color: 'var(--ink-faint)' }}>
                            <span>고객사: <strong style={{ color: 'var(--ink)' }}>{a.customerName}</strong></span>
                            {a.spec && <span>규격: {a.spec}</span>}
                            <span>수량: {a.qty || '-'}</span>
                            {a.storageLocation && <span>보관위치: {a.storageLocation}</span>}
                            {a.relatedOrderNo && <span>관련 수주: {a.relatedOrderNo}</span>}
                          </div>
                          <div className="flex gap-3 text-[11.5px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
                            <span>접수일: {a.receivedDate}</span>
                            {a.returnedDate && <span>반환일: {a.returnedDate}</span>}
                          </div>
                          {(a.status === 'damaged' || a.status === 'lost') && (a.incidentDesc || a.incidentDate) && (
                            <div className="mt-2 px-2.5 py-1.5 rounded-lg text-[11.5px]" style={{ background: '#FEF3C7', color: '#78350F' }}>
                              {a.incidentDate && <span className="font-semibold">발생일 {a.incidentDate} · </span>}
                              {a.incidentDesc}
                              {a.correctiveAction && <div className="mt-0.5">시정조치: {a.correctiveAction}</div>}
                            </div>
                          )}
                          {a.notes && <div className="mt-1 text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>비고: {a.notes}</div>}
                        </div>
                        {canEdit && (
                          <div className="flex gap-1 flex-shrink-0 flex-col items-end">
                            <div className="flex gap-1">
                              <button onClick={() => { setForm({ ...EMPTY_ASSET, ...a }); setEditId(a.id); setShowForm(true) }}
                                className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                                <Edit2 size={12} style={{ color: 'var(--ink-soft)' }} />
                              </button>
                              <button onClick={() => { if (confirm('삭제하시겠습니까?')) save(assets.filter(x => x.id !== a.id)) }}
                                className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', border: '1px solid #FECACA', cursor: 'pointer' }}>
                                <Trash2 size={12} style={{ color: '#DC2626' }} />
                              </button>
                            </div>
                            <div className="flex gap-1 mt-1 flex-wrap justify-end" style={{ maxWidth: 160 }}>
                              {a.status !== 'returned' && <QuickBtn label="반환완료" color="#059669" onClick={() => quickStatus(a.id, 'returned')} />}
                              {a.status === 'received' && <QuickBtn label="사용중" color="#7C3AED" onClick={() => quickStatus(a.id, 'in_use')} />}
                              {(a.status === 'received' || a.status === 'in_use') && <QuickBtn label="손상" color="#D97706" onClick={() => quickStatus(a.id, 'damaged')} />}
                              {(a.status === 'received' || a.status === 'in_use') && <QuickBtn label="분실" color="#DC2626" onClick={() => quickStatus(a.id, 'lost')} />}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── 현황 분석 탭 ── */}
        {tab === 'analysis' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(ASSET_STATUSES).map(([k, v]) => (
                <Kpi key={k} label={v.label} value={analysis.byStatus[k] || 0}
                  bad={(k === 'damaged' || k === 'lost') && (analysis.byStatus[k] || 0) > 0} />
              ))}
            </div>

            <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>자산 유형별 현황</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(ASSET_TYPES).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: 'var(--bg-soft)' }}>
                    <span className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>{v.icon} {v.label}</span>
                    <span className="text-[13px] font-bold" style={{ color: 'var(--ink)' }}>{analysis.byType[k] || 0}</span>
                  </div>
                ))}
              </div>
            </div>

            {analysis.needsReport.length > 0 ? (
              <AlertSection color="#DC2626" title={`고객 통보 필요 (${analysis.needsReport.length}건)`} bg="#FEF2F2" border="#FECACA">
                {analysis.needsReport.map(a => (
                  <div key={a.id} className="text-[12px] py-1" style={{ color: '#7F1D1D' }}>
                    • {a.assetName} ({a.customerName}) — {ASSET_STATUSES[a.status]?.label} {a.incidentDate ? `· 발생일 ${a.incidentDate}` : ''}
                  </div>
                ))}
              </AlertSection>
            ) : (
              <div className="p-5 rounded-2xl flex items-center gap-3" style={{ background: '#D1FAE5', border: '1px solid #A7F3D0' }}>
                <CheckCircle2 size={18} style={{ color: '#059669' }} />
                <div className="text-[13px]" style={{ color: '#065F46' }}>고객 통보가 밀린 손상·분실 자산이 없습니다.</div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

// ── 고객자산 등록/수정 폼 ─────────────────────────────────────
function AssetForm({ form, setForm, onSave, onCancel, isEdit }) {
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const isIncident = form.status === 'damaged' || form.status === 'lost'
  return (
    <div className="mb-5 p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>{isEdit ? '고객자산 수정' : '고객자산 등록'}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <FieldSelect label="자산 유형 *" value={form.assetType} onChange={v => F('assetType', v)}
          options={Object.entries(ASSET_TYPES).map(([k, v]) => ({ value: k, label: `${v.icon} ${v.label}` }))} />
        <Field label="자산명 *" value={form.assetName} onChange={v => F('assetName', v)} placeholder="예: 고객 지급 금형 A-1" />
        <Field label="고객사명 *" value={form.customerName} onChange={v => F('customerName', v)} />
        <Field label="규격·사양" value={form.spec} onChange={v => F('spec', v)} />
        <Field label="수량" value={form.qty} onChange={v => F('qty', v)} />
        <Field label="접수일" type="date" value={form.receivedDate} onChange={v => F('receivedDate', v)} />
        <Field label="보관 위치" value={form.storageLocation} onChange={v => F('storageLocation', v)} placeholder="창고 B-2" />
        <Field label="관련 수주·작업지시 번호" value={form.relatedOrderNo} onChange={v => F('relatedOrderNo', v)} placeholder="SO-2406-012" />
        <FieldSelect label="상태" value={form.status} onChange={v => F('status', v)}
          options={Object.entries(ASSET_STATUSES).map(([k, v]) => ({ value: k, label: v.label }))} />
        {form.status === 'returned' && <Field label="반환일" type="date" value={form.returnedDate} onChange={v => F('returnedDate', v)} />}
      </div>

      {isIncident && (
        <div className="mb-3 p-3 rounded-xl" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
          <div className="text-[12px] font-bold mb-2" style={{ color: '#78350F' }}>
            ⚠ §7.5.10 — 손상·분실·사용 부적합 발생 시 고객에게 통보하고 기록을 유지해야 합니다.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
            <Field label="발생일" type="date" value={form.incidentDate} onChange={v => F('incidentDate', v)} />
            <label className="flex items-center gap-2 text-[12.5px] font-semibold" style={{ color: '#78350F' }}>
              <input type="checkbox" checked={!!form.customerNotified} onChange={e => F('customerNotified', e.target.checked)} />
              고객 통보 완료
            </label>
            {form.customerNotified && <Field label="통보일" type="date" value={form.notifiedDate} onChange={v => F('notifiedDate', v)} />}
          </div>
          <FieldArea label="발생 경위" value={form.incidentDesc} onChange={v => F('incidentDesc', v)} rows={2} />
          <div className="mt-2">
            <FieldArea label="시정조치" value={form.correctiveAction} onChange={v => F('correctiveAction', v)} rows={2} />
          </div>
        </div>
      )}

      <FieldArea label="비고" value={form.notes} onChange={v => F('notes', v)} rows={2} />
      <div className="flex gap-2 mt-3">
        <button onClick={onSave} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
          style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}><Save size={13} /> 저장</button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-[13px]"
          style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>취소</button>
      </div>
    </div>
  )
}

// ── 공용 컴포넌트 ─────────────────────────────────────────────
function Kpi({ label, value, good, warn, bad }) {
  const color  = bad ? '#DC2626' : warn ? '#D97706' : good ? '#059669' : 'var(--ink)'
  const bg     = bad ? '#FEE2E2' : warn ? '#FEF3C7' : good ? '#D1FAE5' : 'var(--bg-card)'
  const border = bad ? '#FECACA' : warn ? '#FDE68A' : good ? '#A7F3D0' : 'var(--line)'
  return (
    <div className="p-4 rounded-2xl text-center" style={{ background: bg, border: `1px solid ${border}` }}>
      <div className="text-[26px] font-bold" style={{ color }}>{value}</div>
      <div className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>{label}</div>
    </div>
  )
}

function QuickBtn({ label, color, onClick }) {
  return (
    <button onClick={onClick} className="px-2 py-0.5 rounded-lg text-[11px] font-bold"
      style={{ background: `${color}15`, border: `1px solid ${color}40`, color, cursor: 'pointer' }}>
      {label}
    </button>
  )
}

function Empty({ icon: Icon, text }) {
  return (
    <div className="text-center py-20" style={{ color: 'var(--ink-faint)' }}>
      <Icon size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
      <div className="text-[14px]">{text}</div>
    </div>
  )
}

function AlertSection({ color, title, bg, border, children }) {
  return (
    <div className="p-5 rounded-2xl" style={{ background: bg, border: `1px solid ${border}` }}>
      <div className="text-[13px] font-bold mb-2" style={{ color }}>{title}</div>
      {children}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-1.5 rounded-xl text-[13px]"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
    </div>
  )
}
function FieldSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <select value={value || ''} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-1.5 rounded-xl text-[13px]"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
function FieldArea({ label, value, onChange, rows = 3 }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows}
        className="w-full px-3 py-1.5 rounded-xl text-[13px] resize-none"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
    </div>
  )
}
