// src/pages/preservation/PreservationHub.jsx
// ISO 13485 §7.5.11 제품 보존·취급 + §7.5.2 제품 청결
import React, { useState, useMemo } from 'react'
import {
  X, Save, Edit2, Trash2, Package, Thermometer,
  AlertTriangle, CheckCircle2, Clock, XCircle, Archive,
  Droplets, Sun, Wind, BarChart2, Link2,
  Package2, ArrowUpRight,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'
import { onboarding } from '../../lib/onboardingState'
import { STORAGE_CONDITIONS, derivePreservationSpecs } from '../../lib/preservationSpecConstants'

// ── 상수 ─────────────────────────────────────────────────────
const LS_LOTS   = 'qualytree.preservation_lots'    // LOT별 유효기간 재고

function lotId()   { return `PLT-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }
function todayStr(){ return new Date().toISOString().slice(0, 10) }
function daysDiff(d){ return d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null }

const EMPTY_LOT = {
  productName: '', productCode: '', lotNo: '', qty: '',
  manufacturedDate: todayStr(), expiryDate: '', storageLocation: '',
  specId: '', linkedDistId: '', status: 'in_stock',  // in_stock | quarantine | released | expired | disposed
  notes: '',
}

const LOT_STATUSES = {
  in_stock:   { label: '재고',   color: '#2563EB', bg: '#EFF6FF' },
  quarantine: { label: '격리',   color: '#D97706', bg: '#FEF3C7' },
  released:   { label: '출하',   color: '#059669', bg: '#D1FAE5' },
  expired:    { label: '만료',   color: '#DC2626', bg: '#FEE2E2' },
  disposed:   { label: '폐기',   color: '#9CA3AF', bg: '#F3F4F6' },
}

// ── 메인 ─────────────────────────────────────────────────────
export default function PreservationHub() {
  const user = auth.current()
  const canEdit = user?.level >= 2
  const nav = useNavigate()

  // 보존 사양은 제품 개발 화면(ProductsHub)에서 입력하는 값을 읽기 전용으로 파생합니다 (SSoT).
  const specs = useMemo(() => derivePreservationSpecs(onboarding.load()?.products || []), [])
  const [lots,   setLots]   = useState(() => { try { return JSON.parse(localStorage.getItem(LS_LOTS)   || '[]') } catch { return [] } })

  const [tab, setTab] = useState('lots')   // lots | specs | analysis

  // LOT 상태
  const [showLotForm, setShowLotForm] = useState(false)
  const [lotForm, setLotForm] = useState(EMPTY_LOT)
  const [editLotId, setEditLotId] = useState(null)
  const [lotFilter, setLotFilter] = useState('all')
  const [lotSearch, setLotSearch] = useState('')

  function saveLots(l)   { setLots(l);   localStorage.setItem(LS_LOTS,   JSON.stringify(l)) }

  // ── LOT CRUD ─────────────────────────────────────────────
  function submitLot() {
    if (!lotForm.productName.trim()) return alert('제품명을 입력하세요.')
    if (!lotForm.lotNo.trim()) return alert('LOT 번호를 입력하세요.')
    const next = editLotId
      ? lots.map(l => l.id === editLotId ? { ...l, ...lotForm } : l)
      : [{ id: lotId(), createdAt: todayStr(), ...lotForm }, ...lots]
    saveLots(next)
    setShowLotForm(false); setLotForm(EMPTY_LOT); setEditLotId(null)
  }

  function quickLotStatus(id, status) {
    saveLots(lots.map(l => l.id === id ? { ...l, status } : l))
  }

  // ── 필터 ─────────────────────────────────────────────────
  const filteredLots = useMemo(() => lots.filter(l => {
    if (lotFilter !== 'all' && l.status !== lotFilter) return false
    if (lotSearch && !l.productName.toLowerCase().includes(lotSearch.toLowerCase())
      && !l.lotNo.toLowerCase().includes(lotSearch.toLowerCase())) return false
    return true
  }), [lots, lotFilter, lotSearch])

  // ── 분석 ─────────────────────────────────────────────────
  const analysis = useMemo(() => {
    const expiring30  = lots.filter(l => { const d = daysDiff(l.expiryDate); return d !== null && d >= 0 && d <= 30 && l.status === 'in_stock' })
    const expiring90  = lots.filter(l => { const d = daysDiff(l.expiryDate); return d !== null && d > 30 && d <= 90 && l.status === 'in_stock' })
    const expired     = lots.filter(l => { const d = daysDiff(l.expiryDate); return d !== null && d < 0 && l.status === 'in_stock' })
    const quarantine  = lots.filter(l => l.status === 'quarantine')
    const statusCount = {}
    Object.keys(LOT_STATUSES).forEach(k => { statusCount[k] = lots.filter(l => l.status === k).length })
    return { expiring30, expiring90, expired, quarantine, statusCount }
  }, [lots])


  const openNew = () => { setTab('lots'); setLotForm(EMPTY_LOT); setEditLotId(null); setShowLotForm(true) }

  return (
    <AppLayout user={user} title="제품 보존·취급 관리" subtitle="ISO 13485 §7.5.11 보존 · §7.5.2 청결 · 유효기간 추적">
      <div className="px-6 lg:px-8 py-6 max-w-[1400px] mx-auto">

        <HubBanner
          title="제품 보존·취급 관리"
          subtitle="ISO 13485 §7.5.11 · 보관 조건 · LOT 유효기간 추적"
          icon={Package2}
          color="#8B5CF6"
          workflow={['보존 사양 설정','LOT 재고 등록','환경·조건 확인','유효기간 추적']}
        />

        <div className="mb-5 p-3 rounded-2xl flex items-center justify-between" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
          <div className="text-[12.5px]" style={{ color: '#1E3A8A' }}>출하 전 점검 · 완제품 재고 · 배포이력은 재고·출고관리 화면으로 이동했습니다.</div>
          <button onClick={() => nav('/inventory')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12.5px] font-bold"
            style={{ background: '#fff', border: '1px solid #BFDBFE', color: '#2563EB', cursor: 'pointer' }}>
            재고·출고관리 이동 <ArrowUpRight size={13} />
          </button>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <Kpi label="재고 LOT" value={analysis.statusCount.in_stock || 0} />
          <Kpi label="만료 임박 (30일)" value={analysis.expiring30.length} warn={analysis.expiring30.length > 0} />
          <Kpi label="유효기간 초과" value={analysis.expired.length} bad={analysis.expired.length > 0} />
          <Kpi label="격리 재고" value={analysis.quarantine.length} warn={analysis.quarantine.length > 0} />
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-soft)' }}>
          {[
            { key: 'lots',     label: `LOT 재고 현황 (${lots.length})` },
            { key: 'specs',    label: `보존 사양 (${specs.length})` },
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

        {/* ── LOT 재고 현황 탭 ── */}
        {tab === 'lots' && (
          <div>
            <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                <input value={lotSearch} onChange={e => setLotSearch(e.target.value)}
                  placeholder="제품명 / LOT 검색..."
                  className="px-3 py-1.5 rounded-xl text-[13px]"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', width: 200 }} />
                <select value={lotFilter} onChange={e => setLotFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl text-[13px]"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                  <option value="all">전체 상태</option>
                  {Object.entries(LOT_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className="text-[11.5px] px-1" style={{ color: 'var(--ink-faint)' }}>ℹ 작업지시(WO) 생산완료 시 자동 등록됩니다. 목록의 항목을 눌러 상세 정보를 수정하세요.</div>
            </div>

            {showLotForm && (
              <LotForm form={lotForm} setForm={setLotForm} specs={specs} onSave={submitLot}
                onCancel={() => { setShowLotForm(false); setLotForm(EMPTY_LOT); setEditLotId(null) }}
                isEdit={!!editLotId} />
            )}

            {filteredLots.length === 0 ? (
              <Empty icon={Archive} text="등록된 LOT가 없습니다." />
            ) : (
              <div className="space-y-3">
                {filteredLots.map(lot => {
                  const sm = LOT_STATUSES[lot.status] || LOT_STATUSES.in_stock
                  const d = daysDiff(lot.expiryDate)
                  const isExpired = d !== null && d < 0
                  const isNear30  = d !== null && d >= 0 && d <= 30
                  const isNear90  = d !== null && d > 30 && d <= 90
                  const spec = specs.find(s => s.id === lot.specId)
                  const storCond = STORAGE_CONDITIONS.find(c => c.key === spec?.storageCondition)

                  return (
                    <div key={lot.id} className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: `1.5px solid ${isExpired ? '#FECACA' : isNear30 ? '#FDE68A' : 'var(--line)'}` }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-[11px] font-mono" style={{ color: 'var(--ink-faint)' }}>{lot.id}</span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
                            {isExpired && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#FEE2E2', color: '#DC2626' }}>⚠ 유효기간 초과</span>}
                            {isNear30  && !isExpired && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: '#D97706' }}>D-{d}</span>}
                            {isNear90  && !isNear30 && <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: '#EFF6FF', color: '#2563EB' }}>D-{d}</span>}
                            {storCond && <span className="text-[11px]">{storCond.icon} {storCond.label}</span>}
                          </div>
                          <div className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>{lot.productName}</div>
                          <div className="flex gap-3 text-[12px] flex-wrap mt-0.5" style={{ color: 'var(--ink-faint)' }}>
                            <span>LOT: <strong style={{ color: 'var(--ink)' }}>{lot.lotNo}</strong></span>
                            {lot.productCode && <span>코드: {lot.productCode}</span>}
                            <span>수량: {lot.qty || '-'}</span>
                            {lot.storageLocation && <span>위치: {lot.storageLocation}</span>}
                          </div>
                          <div className="flex gap-3 text-[11.5px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
                            <span>제조: {lot.manufacturedDate}</span>
                            {lot.expiryDate && <span style={{ color: isExpired ? '#DC2626' : isNear30 ? '#D97706' : 'var(--ink-faint)', fontWeight: isExpired || isNear30 ? 700 : 400 }}>유효: {lot.expiryDate}</span>}
                          </div>
                          {(lot.linkedDistId) && (
                            <div className="text-[11px] mt-1 flex items-center gap-1" style={{ color: '#7C3AED' }}>
                              <Link2 size={10} /> 추적성 {lot.linkedDistId}
                            </div>
                          )}
                        </div>
                        {canEdit && (
                          <div className="flex gap-1 flex-shrink-0 flex-col items-end">
                            <div className="flex gap-1">
                              <button onClick={() => { setLotForm({ ...EMPTY_LOT, ...lot }); setEditLotId(lot.id); setShowLotForm(true) }}
                                className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                                <Edit2 size={12} style={{ color: 'var(--ink-soft)' }} />
                              </button>
                              <button onClick={() => saveLots(lots.filter(l => l.id !== lot.id))}
                                className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', border: '1px solid #FECACA', cursor: 'pointer' }}>
                                <Trash2 size={12} style={{ color: '#DC2626' }} />
                              </button>
                            </div>
                            <div className="flex gap-1 mt-1">
                              {lot.status === 'in_stock' && <QuickBtn label="격리" color="#D97706" onClick={() => quickLotStatus(lot.id, 'quarantine')} />}
                              {lot.status === 'in_stock' && <QuickBtn label="출하" color="#059669" onClick={() => quickLotStatus(lot.id, 'released')} />}
                              {lot.status === 'in_stock' && isExpired && <QuickBtn label="폐기" color="#DC2626" onClick={() => quickLotStatus(lot.id, 'disposed')} />}
                              {lot.status === 'quarantine' && <QuickBtn label="해제" color="#2563EB" onClick={() => quickLotStatus(lot.id, 'in_stock')} />}
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

        {/* ── 보존 사양 탭 (제품 개발 화면 입력값을 읽기 전용으로 표시) ── */}
        {tab === 'specs' && (
          <div>
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <div className="text-[13px]" style={{ color: 'var(--ink-soft)' }}>제품별 보존·취급 조건 및 포장 사양 — 제품 개발 화면에서 입력합니다.</div>
              <button onClick={() => nav('/products?tab=product')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12.5px] font-bold"
                style={{ background: '#fff', border: '1px solid #BFDBFE', color: '#2563EB', cursor: 'pointer' }}>
                제품 개발에서 사양 입력 <ArrowUpRight size={13} />
              </button>
            </div>

            {specs.length === 0 ? (
              <Empty icon={Package} text="보존 사양이 활성화된 제품이 없습니다. 제품 개발 화면에서 입력하세요." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {specs.map(spec => {
                  const cond = STORAGE_CONDITIONS.find(c => c.key === spec.storageCondition)
                  return (
                    <div key={spec.id} className="p-4 rounded-2xl cursor-pointer" onClick={() => nav('/products?tab=product' + (spec.productId ? '&productId=' + encodeURIComponent(spec.productId) : '') + '&detailTab=info')}
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>{spec.productName}</div>
                          <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{spec.productCode} · {spec.deviceClass}</div>
                        </div>
                        <ArrowUpRight size={14} style={{ color: 'var(--ink-faint)' }} />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[12px]">
                        <InfoRow icon="🌡️" label="보관 조건" value={`${cond?.icon || ''} ${cond?.label || spec.storageCondition}`} />
                        {(spec.tempMin || spec.tempMax) && <InfoRow icon="🌡️" label="온도" value={`${spec.tempMin || '-'}~${spec.tempMax || '-'}℃`} />}
                        {(spec.humMin || spec.humMax) && <InfoRow icon="💧" label="습도" value={`${spec.humMin || '-'}~${spec.humMax || '-'}%RH`} />}
                        <InfoRow icon="⏱" label="유효기간" value={`${spec.shelfLifeMonths}개월`} />
                        <InfoRow icon="🧪" label="멸균" value={spec.sterility} />
                        {spec.lightSensitive && <InfoRow icon="🌑" label="차광" value="필요" />}
                        {spec.shockSensitive && <InfoRow icon="⚠" label="충격" value="취약 — 주의" />}
                        {spec.stackLimit && <InfoRow icon="📦" label="적재 한계" value={spec.stackLimit} />}
                      </div>
                      {spec.cleanlinessReq && (
                        <div className="mt-2 px-2 py-1 rounded-lg text-[11.5px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
                          청결 요구사항: {spec.cleanlinessReq}
                        </div>
                      )}
                      {spec.handlingInstructions && (
                        <div className="mt-1 px-2 py-1 rounded-lg text-[11.5px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
                          취급 지침: {spec.handlingInstructions}
                        </div>
                      )}
                      {(spec.pkgCheckItems || []).length > 0 && (
                        <div className="mt-1 px-2 py-1 rounded-lg text-[11.5px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
                          출하 전 점검 항목 {spec.pkgCheckItems.length}건 지정됨
                        </div>
                      )}
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
              {Object.entries(LOT_STATUSES).map(([k, v]) => (
                <Kpi key={k} label={v.label} value={analysis.statusCount[k] || 0}
                  bad={k === 'expired' && (analysis.statusCount[k] || 0) > 0}
                  warn={k === 'quarantine' && (analysis.statusCount[k] || 0) > 0} />
              ))}
            </div>

            {analysis.expired.length > 0 && (
              <AlertSection color="#DC2626" title={`유효기간 초과 재고 LOT (${analysis.expired.length}건)`} bg="#FEF2F2" border="#FECACA">
                {analysis.expired.map(l => (
                  <div key={l.id} className="text-[12px] py-1" style={{ color: '#7F1D1D' }}>• {l.lotNo} — {l.productName} (만료: {l.expiryDate})</div>
                ))}
              </AlertSection>
            )}

            {analysis.expiring30.length > 0 && (
              <AlertSection color="#D97706" title={`30일 내 만료 임박 LOT (${analysis.expiring30.length}건)`} bg="#FFFBEB" border="#FDE68A">
                {analysis.expiring30.map(l => {
                  const d = daysDiff(l.expiryDate)
                  return (
                    <div key={l.id} className="text-[12px] py-1" style={{ color: '#78350F' }}>• {l.lotNo} — {l.productName} · D-{d} · 위치: {l.storageLocation || '-'}</div>
                  )
                })}
              </AlertSection>
            )}

            {analysis.expiring90.length > 0 && (
              <AlertSection color="#2563EB" title={`90일 내 만료 예정 LOT (${analysis.expiring90.length}건)`} bg="#EFF6FF" border="#BFDBFE">
                {analysis.expiring90.map(l => {
                  const d = daysDiff(l.expiryDate)
                  return (
                    <div key={l.id} className="text-[12px] py-1" style={{ color: '#1E3A8A' }}>• {l.lotNo} — {l.productName} · D-{d}</div>
                  )
                })}
              </AlertSection>
            )}

          </div>
        )}
      </div>
    </AppLayout>
  )
}


// ── LOT 폼 ───────────────────────────────────────────────────
function LotForm({ form, setForm, specs, onSave, onCancel, isEdit }) {
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const selectedSpec = specs.find(s => s.id === form.specId)
  return (
    <div className="mb-5 p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>{isEdit ? 'LOT 수정' : 'LOT 등록'}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <Field label="제품명 *" value={form.productName} onChange={v => F('productName', v)} />
        <Field label="제품 코드" value={form.productCode} onChange={v => F('productCode', v)} />
        <Field label="LOT 번호 *" value={form.lotNo} onChange={v => F('lotNo', v)} />
        <Field label="수량" value={form.qty} onChange={v => F('qty', v)} />
        <Field label="제조일" type="date" value={form.manufacturedDate} onChange={v => F('manufacturedDate', v)} />
        <Field label="유효기간" type="date" value={form.expiryDate} onChange={v => F('expiryDate', v)} />
        <Field label="보관 위치" value={form.storageLocation} onChange={v => F('storageLocation', v)} placeholder="창고 A-3" />
        <FieldSelect label="보존 사양 연결" value={form.specId} onChange={v => {
          const s = specs.find(x => x.id === v)
          setForm(f => ({ ...f, specId: v, productName: s ? s.productName : f.productName, productCode: s ? s.productCode : f.productCode }))
        }} options={[{ value: '', label: '선택 안 함' }, ...specs.map(s => ({ value: s.id, label: `${s.productName} (${s.productCode})` }))]} />
        <FieldSelect label="상태" value={form.status} onChange={v => F('status', v)}
          options={Object.entries(LOT_STATUSES).map(([k, v]) => ({ value: k, label: v.label }))} />
        <Field label="연결 추적성 ID" value={form.linkedDistId} onChange={v => F('linkedDistId', v)} placeholder="DST-xxxx" />
      </div>
      {selectedSpec && (
        <div className="mb-3 px-3 py-2 rounded-xl text-[12px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
          ?? 보존 조건: {STORAGE_CONDITIONS.find(c => c.key === selectedSpec.storageCondition)?.label} · 유효기간 {selectedSpec.shelfLifeMonths}개월
          {selectedSpec.tempMin && ` · 온도 ${selectedSpec.tempMin}~${selectedSpec.tempMax}℃`}
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

// ── 출하 전 점검 폼 ───────────────────────────────────────────
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

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-1.5">
      <span>{icon}</span>
      <span style={{ color: 'var(--ink-faint)' }}>{label}:</span>
      <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{value}</span>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder, list, listOptions }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} list={list}
        className="w-full px-3 py-1.5 rounded-xl text-[13px]"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
      {list && listOptions && <datalist id={list}>{listOptions.map(n => <option key={n} value={n} />)}</datalist>}
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
