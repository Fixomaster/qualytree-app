// src/pages/preservation/PreservationHub.jsx
// ISO 13485 §7.5.11 제품 보존·취급 + §7.5.2 제품 청결
import React, { useState, useMemo } from 'react'
import {
  Plus, X, Save, Edit2, Trash2, Package, Thermometer,
  AlertTriangle, CheckCircle2, Clock, XCircle, Archive,
  Droplets, Sun, Wind, BarChart2, Link2, ClipboardList,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'

// ── 상수 ─────────────────────────────────────────────────────
const LS_SPECS  = 'qualytree.preservation_specs'   // 제품별 보존 사양
const LS_LOTS   = 'qualytree.preservation_lots'    // LOT별 유효기간 재고
const LS_CHECKS = 'qualytree.preservation_checks'  // 출하 전 점검 기록

const STORAGE_CONDITIONS = [
  { key: 'room',   label: '실온 (1~30℃)',     icon: '🏠' },
  { key: 'cool',   label: '냉장 (2~8℃)',      icon: '❄️' },
  { key: 'frozen', label: '냉동 (-18℃ 이하)', icon: '🧊' },
  { key: 'dry',    label: '건조 보관',          icon: '☁️' },
  { key: 'dark',   label: '차광 보관',          icon: '🌑' },
  { key: 'other',  label: '기타 조건',          icon: '📋' },
]

const STERILITY = ['비멸균', '멸균 (EO)', '멸균 (감마선)', '멸균 (전자선)', '멸균 (증기)', '멸균 (기타)']
const PACKAGING_TYPES = ['단위 포장', '내포장', '외포장', '운송 포장']
const CHECK_VERDICTS = {
  pass:    { label: '적합',   color: '#059669', bg: '#D1FAE5' },
  fail:    { label: '부적합', color: '#DC2626', bg: '#FEE2E2' },
  pending: { label: '점검 중', color: '#D97706', bg: '#FEF3C7' },
}

const DEFAULT_CHECK_ITEMS = [
  '포장 외관 이상 없음 (찢김·오염·파손)',
  '라벨 정보 정확 (품목명·LOT·유효기간)',
  '보존 조건 부합 여부 확인',
  '유효기간 30일 이상 잔여',
  '멸균 인디케이터 정상 (해당 시)',
  '수량 일치 확인',
]

function specId()  { return `PSP-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }
function lotId()   { return `PLT-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }
function chkId()   { return `PCK-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }
function todayStr(){ return new Date().toISOString().slice(0, 10) }
function daysDiff(d){ return d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null }

const EMPTY_SPEC = {
  productName: '', productCode: '', deviceClass: 'Class II',
  storageCondition: 'room', tempMin: '', tempMax: '', humMin: '', humMax: '',
  lightSensitive: false, shockSensitive: false, stackLimit: '',
  shelfLifeMonths: 12, sterility: '비멸균',
  packagingType: '단위 포장', packagingSpec: '',
  cleanlinessReq: '', handlingInstructions: '',
  linkedEnvZoneId: '', notes: '',
}

const EMPTY_LOT = {
  productName: '', productCode: '', lotNo: '', qty: '',
  manufacturedDate: todayStr(), expiryDate: '', storageLocation: '',
  specId: '', linkedDistId: '', status: 'in_stock',  // in_stock | quarantine | released | expired | disposed
  notes: '',
}

const EMPTY_CHECK = {
  lotId: '', productName: '', lotNo: '', qty: '', destinationCustomer: '',
  checkedBy: '', checkedDate: todayStr(),
  checkItems: DEFAULT_CHECK_ITEMS.map(name => ({ name, result: null })),  // null | pass | fail
  verdict: 'pending', notes: '', linkedDistId: '',
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

  const [specs,  setSpecs]  = useState(() => { try { return JSON.parse(localStorage.getItem(LS_SPECS)  || '[]') } catch { return [] } })
  const [lots,   setLots]   = useState(() => { try { return JSON.parse(localStorage.getItem(LS_LOTS)   || '[]') } catch { return [] } })
  const [checks, setChecks] = useState(() => { try { return JSON.parse(localStorage.getItem(LS_CHECKS) || '[]') } catch { return [] } })

  const [tab, setTab] = useState('lots')   // lots | specs | checks | analysis

  // Spec 상태
  const [showSpecForm, setShowSpecForm] = useState(false)
  const [specForm, setSpecForm] = useState(EMPTY_SPEC)
  const [editSpecId, setEditSpecId] = useState(null)

  // LOT 상태
  const [showLotForm, setShowLotForm] = useState(false)
  const [lotForm, setLotForm] = useState(EMPTY_LOT)
  const [editLotId, setEditLotId] = useState(null)
  const [lotFilter, setLotFilter] = useState('all')
  const [lotSearch, setLotSearch] = useState('')

  // Check 상태
  const [showChkForm, setShowChkForm] = useState(false)
  const [chkForm, setChkForm] = useState(EMPTY_CHECK)
  const [editChkId, setEditChkId] = useState(null)

  function saveSpecs(l)  { setSpecs(l);  localStorage.setItem(LS_SPECS,  JSON.stringify(l)) }
  function saveLots(l)   { setLots(l);   localStorage.setItem(LS_LOTS,   JSON.stringify(l)) }
  function saveChecks(l) { setChecks(l); localStorage.setItem(LS_CHECKS, JSON.stringify(l)) }

  // ── Spec CRUD ─────────────────────────────────────────────
  function submitSpec() {
    if (!specForm.productName.trim()) return alert('제품명을 입력하세요.')
    const next = editSpecId
      ? specs.map(s => s.id === editSpecId ? { ...s, ...specForm } : s)
      : [{ id: specId(), createdAt: todayStr(), ...specForm }, ...specs]
    saveSpecs(next)
    setShowSpecForm(false); setSpecForm(EMPTY_SPEC); setEditSpecId(null)
  }

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

  // ── Check CRUD ────────────────────────────────────────────
  function submitChk() {
    if (!chkForm.productName.trim()) return alert('제품명을 입력하세요.')
    const passCount = chkForm.checkItems.filter(i => i.result === 'pass').length
    const failCount = chkForm.checkItems.filter(i => i.result === 'fail').length
    const verdict = failCount > 0 ? 'fail' : passCount === chkForm.checkItems.length ? 'pass' : 'pending'
    const next = editChkId
      ? checks.map(c => c.id === editChkId ? { ...c, ...chkForm, verdict } : c)
      : [{ id: chkId(), createdAt: todayStr(), ...chkForm, verdict }, ...checks]
    saveChecks(next)
    setShowChkForm(false); setChkForm(EMPTY_CHECK); setEditChkId(null)
  }

  function toggleCheckItem(idx, result) {
    setChkForm(f => {
      const items = [...f.checkItems]
      items[idx] = { ...items[idx], result: items[idx].result === result ? null : result }
      return { ...f, checkItems: items }
    })
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
    const checkFails  = checks.filter(c => c.verdict === 'fail')
    const statusCount = {}
    Object.keys(LOT_STATUSES).forEach(k => { statusCount[k] = lots.filter(l => l.status === k).length })
    return { expiring30, expiring90, expired, quarantine, checkFails, statusCount }
  }, [lots, checks])

  const totalAlerts = analysis.expired.length + analysis.expiring30.length + analysis.checkFails.length + analysis.quarantine.length

  return (
    <AppLayout user={user} title="제품 보존·취급 관리" subtitle="ISO 13485 §7.5.11 보존 · §7.5.2 청결 · 유효기간 추적">
      <div className="px-6 lg:px-8 py-6 max-w-[1400px] mx-auto">

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
            { key: 'checks',   label: `출하 전 점검 (${checks.length})` },
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
              {canEdit && (
                <button onClick={() => { setLotForm(EMPTY_LOT); setEditLotId(null); setShowLotForm(true) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} /> LOT 등록
                </button>
              )}
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

        {/* ── 출하 전 점검 탭 ── */}
        {tab === 'checks' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="text-[13px]" style={{ color: 'var(--ink-soft)' }}>출하·사용 전 보존 상태 점검 기록</div>
              {canEdit && (
                <button onClick={() => { setChkForm(EMPTY_CHECK); setEditChkId(null); setShowChkForm(true) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} /> 점검 기록 등록
                </button>
              )}
            </div>

            {showChkForm && (
              <CheckForm form={chkForm} setForm={setChkForm} lots={lots} onSave={submitChk}
                onCancel={() => { setShowChkForm(false); setChkForm(EMPTY_CHECK); setEditChkId(null) }}
                isEdit={!!editChkId} toggleItem={toggleCheckItem} />
            )}

            {checks.length === 0 ? (
              <Empty icon={ClipboardList} text="출하 전 점검 기록이 없습니다." />
            ) : (
              <div className="space-y-3">
                {checks.map(chk => {
                  const vm = CHECK_VERDICTS[chk.verdict] || CHECK_VERDICTS.pending
                  const passCount = chk.checkItems.filter(i => i.result === 'pass').length
                  const failCount = chk.checkItems.filter(i => i.result === 'fail').length
                  return (
                    <div key={chk.id} className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: `1.5px solid ${chk.verdict === 'fail' ? '#FECACA' : 'var(--line)'}` }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] font-mono" style={{ color: 'var(--ink-faint)' }}>{chk.id}</span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: vm.bg, color: vm.color }}>{vm.label}</span>
                          </div>
                          <div className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>{chk.productName}</div>
                          <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>
                            LOT: {chk.lotNo || '-'} · 수량: {chk.qty || '-'} · 고객: {chk.destinationCustomer || '-'}
                          </div>
                          <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
                            점검일: {chk.checkedDate} · 점검자: {chk.checkedBy || '-'}
                          </div>
                          <div className="flex gap-2 mt-1 text-[11px]">
                            <span style={{ color: '#059669' }}>적합 {passCount}항목</span>
                            {failCount > 0 && <span style={{ color: '#DC2626' }}>부적합 {failCount}항목</span>}
                          </div>
                        </div>
                        {canEdit && (
                          <div className="flex gap-1">
                            <button onClick={() => { setChkForm({ ...EMPTY_CHECK, ...chk }); setEditChkId(chk.id); setShowChkForm(true) }}
                              className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                              <Edit2 size={12} style={{ color: 'var(--ink-soft)' }} />
                            </button>
                            <button onClick={() => saveChecks(checks.filter(c => c.id !== chk.id))}
                              className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', border: '1px solid #FECACA', cursor: 'pointer' }}>
                              <Trash2 size={12} style={{ color: '#DC2626' }} />
                            </button>
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

        {/* ── 보존 사양 탭 ── */}
        {tab === 'specs' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="text-[13px]" style={{ color: 'var(--ink-soft)' }}>제품별 보존·취급 조건 및 포장 사양</div>
              {canEdit && (
                <button onClick={() => { setSpecForm(EMPTY_SPEC); setEditSpecId(null); setShowSpecForm(true) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} /> 사양 등록
                </button>
              )}
            </div>

            {showSpecForm && (
              <SpecForm form={specForm} setForm={setSpecForm} onSave={submitSpec}
                onCancel={() => { setShowSpecForm(false); setSpecForm(EMPTY_SPEC); setEditSpecId(null) }}
                isEdit={!!editSpecId} />
            )}

            {specs.length === 0 ? (
              <Empty icon={Package} text="등록된 보존 사양이 없습니다." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {specs.map(spec => {
                  const cond = STORAGE_CONDITIONS.find(c => c.key === spec.storageCondition)
                  return (
                    <div key={spec.id} className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>{spec.productName}</div>
                          <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{spec.productCode} · {spec.deviceClass}</div>
                        </div>
                        {canEdit && (
                          <div className="flex gap-1">
                            <button onClick={() => { setSpecForm({ ...EMPTY_SPEC, ...spec }); setEditSpecId(spec.id); setShowSpecForm(true) }}
                              className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                              <Edit2 size={12} style={{ color: 'var(--ink-soft)' }} />
                            </button>
                            <button onClick={() => saveSpecs(specs.filter(s => s.id !== spec.id))}
                              className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', border: '1px solid #FECACA', cursor: 'pointer' }}>
                              <Trash2 size={12} style={{ color: '#DC2626' }} />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[12px]">
                        <InfoRow icon="📦" label="보관 조건" value={`${cond?.icon || ''} ${cond?.label || spec.storageCondition}`} />
                        {(spec.tempMin || spec.tempMax) && <InfoRow icon="🌡" label="온도" value={`${spec.tempMin || '-'}~${spec.tempMax || '-'}℃`} />}
                        {(spec.humMin || spec.humMax) && <InfoRow icon="💧" label="습도" value={`${spec.humMin || '-'}~${spec.humMax || '-'}%RH`} />}
                        <InfoRow icon="⏱" label="유효기간" value={`${spec.shelfLifeMonths}개월`} />
                        <InfoRow icon="🧪" label="멸균" value={spec.sterility} />
                        {spec.lightSensitive && <InfoRow icon="🌑" label="차광" value="필요" />}
                        {spec.shockSensitive && <InfoRow icon="⚠" label="충격" value="취약 — 주의" />}
                        {spec.stackLimit && <InfoRow icon="📐" label="적재 한계" value={spec.stackLimit} />}
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

            {analysis.checkFails.length > 0 && (
              <AlertSection color="#DC2626" title={`출하 전 점검 부적합 (${analysis.checkFails.length}건)`} bg="#FEF2F2" border="#FECACA">
                {analysis.checkFails.map(c => (
                  <div key={c.id} className="text-[12px] py-1" style={{ color: '#7F1D1D' }}>• {c.id} — {c.productName} · LOT {c.lotNo} · {c.checkedDate}</div>
                ))}
              </AlertSection>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

// ── 보존 사양 폼 ─────────────────────────────────────────────
function SpecForm({ form, setForm, onSave, onCancel, isEdit }) {
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="mb-5 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>{isEdit ? '보존 사양 수정' : '보존 사양 등록'}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <Field label="제품명 *" value={form.productName} onChange={v => F('productName', v)} />
        <Field label="제품 코드" value={form.productCode} onChange={v => F('productCode', v)} />
        <Field label="기기 등급" value={form.deviceClass} onChange={v => F('deviceClass', v)} />
        <FieldSelect label="보관 조건" value={form.storageCondition} onChange={v => F('storageCondition', v)}
          options={STORAGE_CONDITIONS.map(c => ({ value: c.key, label: `${c.icon} ${c.label}` }))} />
        <Field label="온도 최소 (℃)" value={form.tempMin} onChange={v => F('tempMin', v)} />
        <Field label="온도 최대 (℃)" value={form.tempMax} onChange={v => F('tempMax', v)} />
        <Field label="습도 최소 (%RH)" value={form.humMin} onChange={v => F('humMin', v)} />
        <Field label="습도 최대 (%RH)" value={form.humMax} onChange={v => F('humMax', v)} />
        <Field label="유효기간 (개월)" value={form.shelfLifeMonths} onChange={v => F('shelfLifeMonths', v)} />
        <FieldSelect label="멸균 방법" value={form.sterility} onChange={v => F('sterility', v)}
          options={STERILITY.map(s => ({ value: s, label: s }))} />
        <FieldSelect label="포장 유형" value={form.packagingType} onChange={v => F('packagingType', v)}
          options={PACKAGING_TYPES.map(p => ({ value: p, label: p }))} />
        <Field label="적재 한계" value={form.stackLimit} onChange={v => F('stackLimit', v)} placeholder="예: 5단 이하" />
        <Field label="연결 환경 구역 ID" value={form.linkedEnvZoneId} onChange={v => F('linkedEnvZoneId', v)} placeholder="ZON-xxxx" />
      </div>
      <div className="flex gap-4 mb-3">
        <label className="flex items-center gap-2 text-[12.5px] cursor-pointer">
          <input type="checkbox" checked={form.lightSensitive} onChange={e => F('lightSensitive', e.target.checked)} />
          <span style={{ color: 'var(--ink)' }}>차광 보관 필요</span>
        </label>
        <label className="flex items-center gap-2 text-[12.5px] cursor-pointer">
          <input type="checkbox" checked={form.shockSensitive} onChange={e => F('shockSensitive', e.target.checked)} />
          <span style={{ color: 'var(--ink)' }}>충격 취약</span>
        </label>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <FieldArea label="포장 사양" value={form.packagingSpec} onChange={v => F('packagingSpec', v)} rows={2} />
        <FieldArea label="청결 요구사항 (§7.5.2)" value={form.cleanlinessReq} onChange={v => F('cleanlinessReq', v)} rows={2} />
        <FieldArea label="취급 지침" value={form.handlingInstructions} onChange={v => F('handlingInstructions', v)} rows={2} />
        <FieldArea label="비고" value={form.notes} onChange={v => F('notes', v)} rows={2} />
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
          style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
          <Save size={13} /> 저장
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-[13px]"
          style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>취소</button>
      </div>
    </div>
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
          📋 보존 조건: {STORAGE_CONDITIONS.find(c => c.key === selectedSpec.storageCondition)?.label} · 유효기간 {selectedSpec.shelfLifeMonths}개월
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
function CheckForm({ form, setForm, lots, onSave, onCancel, isEdit, toggleItem }) {
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const [newItem, setNewItem] = useState('')

  function addItem() {
    if (!newItem.trim()) return
    setForm(f => ({ ...f, checkItems: [...f.checkItems, { name: newItem.trim(), result: null }] }))
    setNewItem('')
  }
  function removeItem(i) { setForm(f => ({ ...f, checkItems: f.checkItems.filter((_, idx) => idx !== i) })) }

  return (
    <div className="mb-5 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>{isEdit ? '점검 기록 수정' : '출하 전 점검 등록'}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <Field label="제품명 *" value={form.productName} onChange={v => F('productName', v)} />
        <Field label="LOT 번호" value={form.lotNo} onChange={v => F('lotNo', v)} />
        <Field label="출하 수량" value={form.qty} onChange={v => F('qty', v)} />
        <Field label="출하처 고객" value={form.destinationCustomer} onChange={v => F('destinationCustomer', v)} />
        <Field label="점검일" type="date" value={form.checkedDate} onChange={v => F('checkedDate', v)} />
        <Field label="점검자" value={form.checkedBy} onChange={v => F('checkedBy', v)} />
        <Field label="연결 추적성 ID" value={form.linkedDistId} onChange={v => F('linkedDistId', v)} placeholder="DST-xxxx" />
      </div>

      {/* 점검 항목 */}
      <div className="mb-3">
        <div className="text-[12px] font-bold mb-2" style={{ color: 'var(--ink-soft)' }}>점검 항목 (각 항목을 적합/부적합으로 체크)</div>
        <div className="space-y-1.5 mb-2">
          {form.checkItems.map((item, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
              <span className="text-[12px] flex-1" style={{ color: 'var(--ink)' }}>{item.name}</span>
              <button onClick={() => toggleItem(i, 'pass')}
                className="px-2 py-0.5 rounded-md text-[11px] font-bold"
                style={{ background: item.result === 'pass' ? '#D1FAE5' : 'var(--bg-card)', color: item.result === 'pass' ? '#059669' : 'var(--ink-faint)', border: `1px solid ${item.result === 'pass' ? '#059669' : 'var(--line)'}`, cursor: 'pointer' }}>
                적합
              </button>
              <button onClick={() => toggleItem(i, 'fail')}
                className="px-2 py-0.5 rounded-md text-[11px] font-bold"
                style={{ background: item.result === 'fail' ? '#FEE2E2' : 'var(--bg-card)', color: item.result === 'fail' ? '#DC2626' : 'var(--ink-faint)', border: `1px solid ${item.result === 'fail' ? '#DC2626' : 'var(--line)'}`, cursor: 'pointer' }}>
                부적합
              </button>
              <button onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)' }}><X size={12} /></button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="점검 항목 추가..."
            className="flex-1 px-3 py-1.5 rounded-xl text-[12px]"
            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}
            onKeyDown={e => e.key === 'Enter' && addItem()} />
          <button onClick={addItem} className="px-3 py-1.5 rounded-xl text-[12px] font-bold"
            style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>추가</button>
        </div>
      </div>
      <FieldArea label="비고 / 특이사항" value={form.notes} onChange={v => F('notes', v)} rows={2} />
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

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-1.5">
      <span>{icon}</span>
      <span style={{ color: 'var(--ink-faint)' }}>{label}:</span>
      <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{value}</span>
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
