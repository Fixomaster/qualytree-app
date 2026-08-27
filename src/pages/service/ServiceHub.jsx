// src/pages/service/ServiceHub.jsx
// ISO 13485 §7.5.3 설치 활동 / §7.5.4 서비스 활동
import React, { useState, useMemo } from 'react'
import {
  Plus, X, Save, Edit2, Trash2, Wrench, MapPin,
  CheckCircle2, Clock, AlertTriangle, XCircle,
  Package, Link2, ClipboardList, BarChart2, User,
  ChevronDown, ChevronUp, FileText, Tool,
  Headphones,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'
import { onboarding } from '../../lib/onboardingState'

// ── 상수 ─────────────────────────────────────────────────────
const LS_INST = 'qualytree.installations'
const LS_SVC  = 'qualytree.services'
const LS_DIST = 'qualytree.distributions'   // 추적성관리 배포이력 (읽기 전용 참조 — S/N 자동조회)

const INST_STATUSES = {
  scheduled:  { label: '예정',     color: '#6366F1', bg: '#EEF2FF' },
  in_progress:{ label: '진행 중',  color: '#D97706', bg: '#FEF3C7' },
  completed:  { label: '완료',     color: '#059669', bg: '#D1FAE5' },
  failed:     { label: '실패',     color: '#DC2626', bg: '#FEE2E2' },
  cancelled:  { label: '취소',     color: '#9CA3AF', bg: '#F3F4F6' },
}

const SVC_TYPES = {
  preventive:  { label: '예방 정비 (PM)', color: '#2563EB' },
  corrective:  { label: '수리 (CM)',      color: '#DC2626' },
  inspection:  { label: '정기 점검',     color: '#059669' },
  upgrade:     { label: '업그레이드',    color: '#7C3AED' },
  calibration: { label: '교정',          color: '#D97706' },
  other:       { label: '기타',          color: '#6B7280' },
}

const SVC_STATUSES = {
  open:       { label: '접수',     color: '#6366F1', bg: '#EEF2FF' },
  dispatched: { label: '출동',     color: '#D97706', bg: '#FEF3C7' },
  in_progress:{ label: '처리 중', color: '#2563EB', bg: '#EFF6FF' },
  completed:  { label: '완료',     color: '#059669', bg: '#D1FAE5' },
  pending:    { label: '보류',     color: '#9CA3AF', bg: '#F3F4F6' },
  cancelled:  { label: '취소',     color: '#EF4444', bg: '#FEE2E2' },
}

const DEFAULT_INSTALL_CHECKS = [
  '설치 위치 및 환경 확인 (온도·습도·전원)',
  '장비 외관 및 포장 상태 점검',
  '전원 연결 및 기동 테스트',
  '기능 검증 (사양서 기준)',
  '안전 장치 작동 확인',
  '사용자 교육 실시',
  '설치 확인서 서명 취득',
]

function genInstId() { return `INS-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }
function genSvcId()  { return `SVC-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }
function todayStr()  { return new Date().toISOString().slice(0, 10) }
function daysDiff(d) { return Math.ceil((new Date(d) - new Date()) / 86400000) }

// 추적성관리(TraceabilityHub)의 배포이력에서 시리얼 번호로 제품·고객 정보를 조회한다.
// 별도 입력 없이 S/N 하나로 제품명/코드/고객명/연락처/주소가 자동으로 채워지도록 하는 SSoT 조회.
function findDistBySerial(sn) {
  if (!sn || !sn.trim()) return null
  try {
    const list = JSON.parse(localStorage.getItem(LS_DIST) || '[]')
    const s = sn.trim().toLowerCase()
    return list.find(d => (d.serialNos || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean).includes(s)) || null
  } catch { return null }
}

// 설치 기록에서도 S/N으로 고객·주소를 보완 조회할 수 있도록 (배포이력에 없는 레거시 건 대비)
function findInstBySerial(sn) {
  if (!sn || !sn.trim()) return null
  try {
    const list = JSON.parse(localStorage.getItem(LS_INST) || '[]')
    const s = sn.trim().toLowerCase()
    return list.find(i => (i.serialNo || '').trim().toLowerCase() === s) || null
  } catch { return null }
}

// 제품 개발 화면(ProductsHub)에서 제품별로 지정한 설치 체크리스트가 있으면 그것을 쓰고,
// 없으면 기본 체크리스트를 사용한다 (SSoT: 제품 레코드의 installCheckItems).
function productInstallChecklist(productName) {
  try {
    const products = onboarding.load()?.products || []
    const p = products.find(pr => (pr.name || pr.itemName || '') === productName)
    const items = (p?.installCheckItems || []).map(i => i.name).filter(Boolean)
    return items.length > 0 ? items : DEFAULT_INSTALL_CHECKS
  } catch { return DEFAULT_INSTALL_CHECKS }
}

const EMPTY_INST = {
  productName: '', productCode: '', serialNo: '',
  customerName: '', customerCode: '',
  installAddress: '', installDate: todayStr(),
  status: 'scheduled',
  checkItems: [],
  verdict: 'pending',  // pending | pass | fail
  customerSignature: false, notes: '',
}

const EMPTY_SVC = {
  productName: '', productCode: '', serialNo: '',
  customerName: '', customerContact: '', customerAddress: '',
  svcType: 'corrective', status: 'open',
  reportedDate: todayStr(), symptom: '',
  assignedEngineer: '', causeAnalysis: '', actionTaken: '',
  partsReplaced: '', customerFeedback: '', followUpNeeded: false,
  notes: '',
}

// ── 메인 ─────────────────────────────────────────────────────
export default function ServiceHub() {
  const user = auth.current()
  const canEdit = user?.level >= 2

  const [installations, setInstallations] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_INST) || '[]') } catch { return [] }
  })
  const [services, setServices] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_SVC) || '[]') } catch { return [] }
  })

  const [tab, setTab]             = useState('install')  // install | service | device | analysis
  const [showInstForm, setShowInstForm] = useState(false)
  const [instForm, setInstForm]   = useState(EMPTY_INST)
  const [editInstId, setEditInstId] = useState(null)
  const [expandedInst, setExpandedInst] = useState(null)

  const [showSvcForm, setShowSvcForm] = useState(false)
  const [svcForm, setSvcForm]     = useState(EMPTY_SVC)
  const [editSvcId, setEditSvcId] = useState(null)
  const [expandedSvc, setExpandedSvc] = useState(null)
  const [svcOnsiteDraft, setSvcOnsiteDraft] = useState(null)

  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType]     = useState('all')
  const [search, setSearch]             = useState('')
  const [deviceSearch, setDeviceSearch] = useState('')

  function saveInst(list) { setInstallations(list); localStorage.setItem(LS_INST, JSON.stringify(list)) }
  function saveSvc(list)  { setServices(list);       localStorage.setItem(LS_SVC,  JSON.stringify(list)) }

  // ── 설치 CRUD ─────────────────────────────────────────────
  function submitInst() {
    if (!instForm.productName.trim()) return alert('제품명을 입력하세요.')
    // 신규 등록 시에는 체크리스트를 입력받지 않고, 제품 개발 화면에서 지정한(또는 기본) 체크리스트를
    // 자동으로 부여한 뒤 '예정' 상태로 등록한다 — 실제 점검은 등록 후 카드 클릭으로 진행한다.
    const checkItems = editInstId
      ? (instForm.checkItems || [])
      : productInstallChecklist(instForm.productName).map(name => ({ name, done: false }))
    const doneCount = checkItems.filter(c => c.done).length
    const verdict = checkItems.length > 0 && doneCount === checkItems.length ? 'pass' : doneCount === 0 ? 'pending' : 'partial'
    const status = editInstId ? (verdict === 'pass' ? 'completed' : verdict === 'partial' ? 'in_progress' : 'scheduled') : 'scheduled'
    const record = { ...instForm, checkItems, verdict, status, updatedAt: todayStr() }
    let next
    if (editInstId) {
      next = installations.map(i => i.id === editInstId ? { ...i, ...record } : i)
    } else {
      next = [{ id: genInstId(), createdAt: todayStr(), ...record }, ...installations]
    }
    saveInst(next)
    setShowInstForm(false); setInstForm(EMPTY_INST); setEditInstId(null)
  }

  function deleteInst(id) {
    if (!confirm('설치 기록을 삭제하시겠습니까?')) return
    saveInst(installations.filter(i => i.id !== id))
  }

  // 목록 카드에서 직접 체크리스트 항목을 체크/해제한다. 전체 항목이 체크되면 자동으로 '완료'로 전환된다.
  function toggleInstCheckItem(instId, idx) {
    const next = installations.map(i => {
      if (i.id !== instId) return i
      const items = [...(i.checkItems || [])]
      items[idx] = { ...items[idx], done: !items[idx].done }
      const doneCount = items.filter(c => c.done).length
      const verdict = items.length > 0 && doneCount === items.length ? 'pass' : doneCount === 0 ? 'pending' : 'partial'
      const status = verdict === 'pass' ? 'completed' : verdict === 'partial' ? 'in_progress' : 'scheduled'
      return { ...i, checkItems: items, verdict, status, updatedAt: todayStr() }
    })
    saveInst(next)
  }

  function quickStatus(id, status) {
    saveInst(installations.map(i => i.id === id ? { ...i, status, updatedAt: todayStr() } : i))
  }

  // ── 서비스 CRUD ───────────────────────────────────────────
  function submitSvc() {
    if (!svcForm.productName.trim()) return alert('제품명을 입력하세요.')
    let next
    if (editSvcId) {
      next = services.map(s => s.id === editSvcId ? { ...s, ...svcForm, updatedAt: todayStr() } : s)
    } else {
      // 신규 접수는 항상 '접수' 상태로 시작한다 — 이후 상태는 출동/완료 버튼으로만 전환된다.
      next = [{ id: genSvcId(), createdAt: todayStr(), ...svcForm, status: 'open' }, ...services]
    }
    saveSvc(next)
    setShowSvcForm(false); setSvcForm(EMPTY_SVC); setEditSvcId(null)
  }

  function deleteSvc(id) {
    if (!confirm('서비스 기록을 삭제하시겠습니까?')) return
    saveSvc(services.filter(s => s.id !== id))
  }

  function quickSvcStatus(id, status) {
    // 출동 처리 시 로그인한 담당자를 담당 엔지니어로 자동 등록한다.
    saveSvc(services.map(s => s.id === id
      ? { ...s, status, updatedAt: todayStr(), ...(status === 'dispatched' ? { assignedEngineer: user?.name || s.assignedEngineer || '' } : {}) }
      : s))
  }

  // 목록 카드에서 현장 조치 내용을 입력·저장한다. complete가 true면 동시에 '완료'로 전환한다.
  function saveSvcOnsite(id, fields, complete) {
    saveSvc(services.map(s => s.id === id
      ? { ...s, ...fields, updatedAt: todayStr(), ...(complete ? { status: 'completed' } : {}) }
      : s))
  }

  // ── 필터 ─────────────────────────────────────────────────
  const filteredInst = useMemo(() => installations.filter(i => {
    if (filterStatus !== 'all' && i.status !== filterStatus) return false
    if (search && !i.productName.toLowerCase().includes(search.toLowerCase())
      && !i.customerName?.toLowerCase().includes(search.toLowerCase())
      && !i.serialNo?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [installations, filterStatus, search])

  const filteredSvc = useMemo(() => services.filter(s => {
    if (filterStatus !== 'all' && s.status !== filterStatus) return false
    if (filterType !== 'all' && s.svcType !== filterType) return false
    if (search && !s.productName.toLowerCase().includes(search.toLowerCase())
      && !s.customerName?.toLowerCase().includes(search.toLowerCase())
      && !s.serialNo?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [services, filterStatus, filterType, search])

  // 장비별 이력 (S/N 우선, 없으면 제품코드 · 제품명으로 그룹화하여 누락 방지)
  const deviceKey = (r) => {
    if (r.serialNo && r.serialNo.trim()) return `SN:${r.serialNo.trim()}`
    if (r.productCode && r.productCode.trim()) return `PC:${r.productCode.trim()}`
    return `PN:${(r.productName || '미지정').trim()}`
  }
  const deviceMap = useMemo(() => {
    const m = {}
    installations.forEach(i => {
      const key = deviceKey(i)
      if (!m[key]) m[key] = { key, serialNo: i.serialNo || '', productName: i.productName, productCode: i.productCode, installs: [], services: [] }
      m[key].installs.push(i)
    })
    services.forEach(s => {
      const key = deviceKey(s)
      if (!m[key]) m[key] = { key, serialNo: s.serialNo || '', productName: s.productName, productCode: s.productCode, installs: [], services: [] }
      m[key].services.push(s)
    })
    return Object.values(m).filter(d =>
      !deviceSearch ||
      (d.serialNo && d.serialNo.toLowerCase().includes(deviceSearch.toLowerCase())) ||
      (d.productName || '').toLowerCase().includes(deviceSearch.toLowerCase()) ||
      (d.productCode || '').toLowerCase().includes(deviceSearch.toLowerCase())
    )
  }, [installations, services, deviceSearch])

  // 분석
  const analysis = useMemo(() => {
    const openSvc = services.filter(s => !['completed', 'cancelled'].includes(s.status))
    const instOk = installations.filter(i => i.status === 'completed' && i.verdict === 'pass').length
    const instFail = installations.filter(i => i.verdict === 'fail').length
    const svcByType = {}
    Object.keys(SVC_TYPES).forEach(k => { svcByType[k] = services.filter(s => s.svcType === k).length })
    return { openSvc, instOk, instFail, svcByType }
  }, [installations, services])

  // 월별 · 연도별 현황
  const periodStats = useMemo(() => {
    const monthly = {}
    const yearly = {}
    const bump = (map, key, field) => {
      if (!key) return
      if (!map[key]) map[key] = { key, instCount: 0, svcCount: 0, svcCompletedCount: 0 }
      map[key][field] += 1
    }
    installations.forEach(i => {
      if (!i.installDate) return
      bump(monthly, i.installDate.slice(0, 7), 'instCount')
      bump(yearly, i.installDate.slice(0, 4), 'instCount')
    })
    services.forEach(s => {
      if (!s.reportedDate) return
      bump(monthly, s.reportedDate.slice(0, 7), 'svcCount')
      bump(yearly, s.reportedDate.slice(0, 4), 'svcCount')
      if (s.status === 'completed') {
        bump(monthly, s.reportedDate.slice(0, 7), 'svcCompletedCount')
        bump(yearly, s.reportedDate.slice(0, 4), 'svcCompletedCount')
      }
    })
    const toSorted = (map) => Object.values(map).sort((a, b) => b.key.localeCompare(a.key))
    return { monthly: toSorted(monthly), yearly: toSorted(yearly) }
  }, [installations, services])

  return (
    <AppLayout user={user} title="설치·서비스 관리" subtitle="ISO 13485 §7.5.3 설치 활동 · §7.5.4 서비스 활동">
      <div className="px-6 lg:px-8 py-6 max-w-[1400px] mx-auto">

        {/* KPI 요약 */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <Kpi label="설치 완료" value={installations.filter(i => i.status === 'completed').length} good />
          <Kpi label="서비스 미결" value={analysis.openSvc.length} warn={analysis.openSvc.length > 0} />
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-soft)' }}>
          {[
            { key: 'install',  label: `설치 기록 (${installations.length})` },
            { key: 'service',  label: `서비스 기록 (${services.length})` },
            { key: 'device',   label: '장비별 이력' },
            { key: 'analysis', label: '현황 분석' },
          ].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setFilterStatus('all'); setFilterType('all'); setSearch('') }}
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

        {/* ── 설치 기록 탭 ── */}
        {tab === 'install' && (
          <div>
            <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="제품 / 고객 / S/N 검색..."
                  className="px-3 py-1.5 rounded-xl text-[13px]"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', width: 200 }} />
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  className="px-3 py-1.5 rounded-xl text-[13px]"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                  <option value="all">전체 상태</option>
                  {Object.entries(INST_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              {canEdit && (
                <button onClick={() => { setInstForm(EMPTY_INST); setEditInstId(null); setShowInstForm(true) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} /> 설치 기록 등록
                </button>
              )}
            </div>

            {showInstForm && (
              <InstallForm form={instForm} setForm={setInstForm} onSave={submitInst}
                onCancel={() => { setShowInstForm(false); setInstForm(EMPTY_INST); setEditInstId(null) }}
                isEdit={!!editInstId} />
            )}

            {filteredInst.length === 0 ? (
              <Empty icon={MapPin} text="설치 기록이 없습니다." />
            ) : (
              <div className="space-y-3">
                {filteredInst.map(inst => {
                  const sm = INST_STATUSES[inst.status] || INST_STATUSES.scheduled
                  const doneCount = (inst.checkItems || []).filter(c => c.done).length
                  const totalCheck = (inst.checkItems || []).length
                  const isExpanded = expandedInst === inst.id
                  return (
                    <div key={inst.id} className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', cursor: 'pointer' }}
                      onClick={() => setExpandedInst(isExpanded ? null : inst.id)}>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-[11px] font-mono" style={{ color: 'var(--ink-faint)' }}>{inst.id}</span>
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
                              {inst.verdict === 'pass' && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#D1FAE5', color: '#059669' }}>✓ 설치 적합</span>}
                              {inst.verdict === 'fail' && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#FEE2E2', color: '#DC2626' }}>✗ 설치 부적합</span>}
                            </div>
                            <div className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>{inst.productName}</div>
                            <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>
                              {inst.productCode && `${inst.productCode} · `}S/N: {inst.serialNo || '-'} · 고객: {inst.customerName || '-'}
                            </div>
                            <div className="flex gap-4 mt-1 text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>
                              <span>설치일: {inst.installDate}</span>
                              {inst.installedBy && <span>담당: {inst.installedBy}</span>}
                              {inst.installAddress && <span>위치: {inst.installAddress}</span>}
                            </div>
                            {totalCheck > 0 && (
                              <div className="mt-2 flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--bg-soft)' }}>
                                  <div className="h-1.5 rounded-full" style={{ width: `${(doneCount / totalCheck) * 100}%`, background: doneCount === totalCheck ? '#059669' : '#D97706' }} />
                                </div>
                                <span className="text-[11px]" style={{ color: 'var(--ink-soft)' }}>체크리스트 {doneCount}/{totalCheck}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1 flex-shrink-0 flex-col items-end" onClick={e => e.stopPropagation()}>
                            {canEdit && (
                              <div className="flex gap-1">
                                <button onClick={() => { setInstForm({ ...EMPTY_INST, ...inst }); setEditInstId(inst.id); setShowInstForm(true) }}
                                  className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                                  <Edit2 size={12} style={{ color: 'var(--ink-soft)' }} />
                                </button>
                                <button onClick={() => deleteInst(inst.id)}
                                  className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', border: '1px solid #FECACA', cursor: 'pointer' }}>
                                  <Trash2 size={12} style={{ color: '#DC2626' }} />
                                </button>
                              </div>
                            )}
                            <button onClick={() => setExpandedInst(isExpanded ? null : inst.id)}
                              className="flex items-center gap-1 text-[11px] mt-1"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)' }}>
                              체크리스트 {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                          </div>
                        </div>

                        {/* 체크리스트 펼침 — 카드를 눌러 열고, 항목을 눌러 바로 체크한다 (전체 체크 시 자동 완료) */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: '1px solid var(--line)' }} onClick={e => e.stopPropagation()}>
                            {(inst.checkItems || []).map((item, i) => (
                              <div key={i} className="flex items-center gap-2" style={{ cursor: canEdit ? 'pointer' : 'default' }}
                                onClick={() => canEdit && toggleInstCheckItem(inst.id, i)}>
                                <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                                  style={{ background: item.done ? '#D1FAE5' : 'var(--bg-soft)', border: `1.5px solid ${item.done ? '#059669' : 'var(--line)'}` }}>
                                  {item.done && <CheckCircle2 size={10} style={{ color: '#059669' }} />}
                                </div>
                                <span className="text-[12px]" style={{ color: item.done ? 'var(--ink-faint)' : 'var(--ink)', textDecoration: item.done ? 'line-through' : 'none' }}>{item.name}</span>
                              </div>
                            ))}
                            {inst.notes && <div className="text-[12px] mt-2 p-2 rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>{inst.notes}</div>}
                            {inst.linkedDistId && <div className="text-[11px] flex items-center gap-1" style={{ color: '#7C3AED' }}><Link2 size={10} /> 추적성 {inst.linkedDistId}</div>}
                            {inst.linkedComplaintId && <div className="text-[11px] flex items-center gap-1" style={{ color: '#DC2626' }}><Link2 size={10} /> 불만 {inst.linkedComplaintId}</div>}
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

        {/* ── 서비스 기록 탭 ── */}
        {tab === 'service' && (
          <div>
            <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="제품 / 고객 / S/N 검색..."
                  className="px-3 py-1.5 rounded-xl text-[13px]"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', width: 200 }} />
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  className="px-3 py-1.5 rounded-xl text-[13px]"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                  <option value="all">전체 상태</option>
                  {Object.entries(SVC_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <select value={filterType} onChange={e => setFilterType(e.target.value)}
                  className="px-3 py-1.5 rounded-xl text-[13px]"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                  <option value="all">전체 유형</option>
                  {Object.entries(SVC_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              {canEdit && (
                <button onClick={() => { setSvcForm(EMPTY_SVC); setEditSvcId(null); setShowSvcForm(true) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} /> 서비스 기록 등록
                </button>
              )}
            </div>

            {showSvcForm && (
              <ServiceForm form={svcForm} setForm={setSvcForm} onSave={submitSvc}
                onCancel={() => { setShowSvcForm(false); setSvcForm(EMPTY_SVC); setEditSvcId(null) }}
                isEdit={!!editSvcId} />
            )}

            {filteredSvc.length === 0 ? (
              <Empty icon={Wrench} text="서비스 기록이 없습니다." />
            ) : (
              <div className="space-y-3">
                {filteredSvc.map(svc => {
                  const sm = SVC_STATUSES[svc.status] || SVC_STATUSES.open
                  const typeInfo = SVC_TYPES[svc.svcType] || SVC_TYPES.other
                  const isExpanded = expandedSvc === svc.id
                  const draft = isExpanded ? (svcOnsiteDraft || {}) : {}
                  function openOnsite() {
                    if (isExpanded) { setExpandedSvc(null); setSvcOnsiteDraft(null); return }
                    setExpandedSvc(svc.id)
                    setSvcOnsiteDraft({
                      causeAnalysis: svc.causeAnalysis || '', actionTaken: svc.actionTaken || '',
                      partsReplaced: svc.partsReplaced || '', customerFeedback: svc.customerFeedback || '',
                      followUpNeeded: !!svc.followUpNeeded,
                    })
                  }
                  const D = (k, v) => setSvcOnsiteDraft(d => ({ ...d, [k]: v }))
                  return (
                    <div key={svc.id} className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--line)', cursor: 'pointer' }}
                      onClick={openOnsite}>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-[11px] font-mono" style={{ color: 'var(--ink-faint)' }}>{svc.id}</span>
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
                              <span className="text-[11px] font-semibold" style={{ color: typeInfo.color }}>{typeInfo.label}</span>
                              {svc.followUpNeeded && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: '#D97706' }}>⚠ 후속조치 필요</span>}
                            </div>
                            <div className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>{svc.productName}</div>
                            <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>
                              {svc.productCode && `${svc.productCode} · `}S/N: {svc.serialNo || '-'} · 고객: {svc.customerName || '-'}
                            </div>
                            {svc.symptom && <div className="text-[12px] mt-1" style={{ color: 'var(--ink-soft)' }}>증상: {svc.symptom}</div>}
                            <div className="flex gap-3 mt-1 text-[11px]" style={{ color: 'var(--ink-faint)' }}>
                              <span>접수: {svc.reportedDate}</span>
                              {svc.assignedEngineer && <span>담당 엔지니어: {svc.assignedEngineer}</span>}
                            </div>
                          </div>
                          {canEdit && (
                            <div className="flex gap-1 flex-shrink-0 flex-wrap justify-end" onClick={e => e.stopPropagation()}>
                              {svc.status === 'open' && <QuickBtn label="출동" color="#D97706" onClick={() => quickSvcStatus(svc.id, 'dispatched')} />}
                              {['open','dispatched','in_progress'].includes(svc.status) && <QuickBtn label="완료" color="#059669" onClick={() => quickSvcStatus(svc.id, 'completed')} />}
                              <button onClick={() => { setSvcForm({ ...EMPTY_SVC, ...svc }); setEditSvcId(svc.id); setShowSvcForm(true) }}
                                className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                                <Edit2 size={12} style={{ color: 'var(--ink-soft)' }} />
                              </button>
                              <button onClick={() => deleteSvc(svc.id)}
                                className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', border: '1px solid #FECACA', cursor: 'pointer' }}>
                                <Trash2 size={12} style={{ color: '#DC2626' }} />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* 현장 입력 — 카드를 눌러 펼치고, 원인분석·조치내용·교체부품·고객피드백·후속조치필요를 입력한다 */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 space-y-2" style={{ borderTop: '1px solid var(--line)' }} onClick={e => e.stopPropagation()}>
                            <div className="text-[11px] font-bold" style={{ color: 'var(--ink-soft)' }}>현장 조치 입력</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <FieldArea label="원인 분석" value={draft.causeAnalysis} onChange={v => D('causeAnalysis', v)} rows={2} />
                              <FieldArea label="조치 내용" value={draft.actionTaken} onChange={v => D('actionTaken', v)} rows={2} />
                              <Field label="교체 부품" value={draft.partsReplaced} onChange={v => D('partsReplaced', v)} placeholder="교체한 부품이 있으면 입력" />
                              <FieldArea label="고객 피드백" value={draft.customerFeedback} onChange={v => D('customerFeedback', v)} rows={2} />
                            </div>
                            <label className="flex items-center gap-2 text-[12px] cursor-pointer" style={{ color: 'var(--ink)' }}>
                              <input type="checkbox" checked={!!draft.followUpNeeded} onChange={e => D('followUpNeeded', e.target.checked)} />
                              후속 조치 필요
                            </label>
                            {canEdit && (
                              <div className="flex gap-2 pt-1">
                                <button onClick={() => { saveSvcOnsite(svc.id, svcOnsiteDraft, false); setExpandedSvc(null); setSvcOnsiteDraft(null) }}
                                  className="px-3 py-1.5 rounded-xl text-[12px] font-semibold"
                                  style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>저장</button>
                                <button onClick={() => { saveSvcOnsite(svc.id, svcOnsiteDraft, true); setExpandedSvc(null); setSvcOnsiteDraft(null) }}
                                  className="px-3 py-1.5 rounded-xl text-[12px] font-bold"
                                  style={{ background: '#059669', color: '#fff', border: 'none', cursor: 'pointer' }}>저장 후 완료</button>
                              </div>
                            )}
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

        {/* ── 장비별 이력 탭 ── */}
        {tab === 'device' && (
          <div>
            <div className="mb-4">
              <input value={deviceSearch} onChange={e => setDeviceSearch(e.target.value)}
                placeholder="S/N 또는 제품명 검색..."
                className="px-3 py-1.5 rounded-xl text-[13px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', width: 260 }} />
            </div>
            {deviceMap.length === 0 ? (
              <Empty icon={Package} text="설치·서비스 기록이 없습니다." />
            ) : (
              <div className="space-y-4">
                {deviceMap.map(dev => (
                  <div key={dev.key} className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-soft)' }}>
                        <Package size={16} style={{ color: 'var(--moss)' }} />
                      </div>
                      <div>
                        <div className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>{dev.productName}</div>
                        <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{dev.productCode ? `${dev.productCode} · ` : ''}S/N: {dev.serialNo || '미등록'}</div>
                      </div>
                      <div className="ml-auto flex gap-2">
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: '#EFF6FF', color: '#2563EB' }}>설치 {dev.installs.length}건</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: '#FEF3C7', color: '#D97706' }}>서비스 {dev.services.length}건</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {[...dev.installs.map(i => ({ type: 'install', date: i.installDate, id: i.id, desc: `설치 — ${i.customerName || '-'} / ${i.installAddress || '-'}`, status: INST_STATUSES[i.status] })),
                        ...dev.services.map(s => ({ type: 'service', date: s.reportedDate, id: s.id, desc: `${SVC_TYPES[s.svcType]?.label || '서비스'} — ${s.symptom || '-'}`, status: SVC_STATUSES[s.status] }))
                      ].sort((a, b) => b.date.localeCompare(a.date)).map(item => (
                        <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg text-[12px]"
                          style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.status?.color || '#9CA3AF' }} />
                          <span style={{ color: 'var(--ink-faint)', flexShrink: 0 }}>{item.date}</span>
                          <span style={{ color: 'var(--ink)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.desc}</span>
                          <span className="font-semibold px-1.5 py-0.5 rounded-md text-[10px]" style={{ background: item.status?.bg, color: item.status?.color, flexShrink: 0 }}>{item.status?.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 현황 분석 탭 ── */}
        {tab === 'analysis' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi label="전체 설치" value={installations.length} />
              <Kpi label="설치 완료" value={analysis.instOk} good={analysis.instOk > 0} />
              <Kpi label="전체 서비스" value={services.length} />
              <Kpi label="미결 서비스" value={analysis.openSvc.length} warn={analysis.openSvc.length > 0} />
            </div>

            {/* 서비스 유형별 */}
            <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>서비스 유형별 현황</div>
              <div className="space-y-2">
                {Object.entries(SVC_TYPES).map(([k, v]) => {
                  const cnt = analysis.svcByType[k] || 0
                  const max = Math.max(...Object.values(analysis.svcByType), 1)
                  return (
                    <div key={k} className="flex items-center gap-3">
                      <span className="text-[12px] w-28 flex-shrink-0 font-semibold" style={{ color: v.color }}>{v.label}</span>
                      <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ background: 'var(--bg-soft)' }}>
                        <div className="h-4 rounded-full" style={{ width: `${(cnt / max) * 100}%`, background: v.color, minWidth: cnt > 0 ? 12 : 0 }} />
                      </div>
                      <span className="text-[12px] font-bold w-5 text-right" style={{ color: 'var(--ink)' }}>{cnt}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 월별 현황 */}
            <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>월별 현황</div>
              {periodStats.monthly.length === 0 ? (
                <div className="text-[12px] py-4 text-center" style={{ color: 'var(--ink-faint)' }}>설치·서비스 기록을 등록하면 월별 현황이 표시됩니다.</div>
              ) : (
                <div className="space-y-2">
                  {periodStats.monthly.map(m => (
                    <div key={m.key} className="flex items-center gap-3 flex-wrap p-2 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
                      <span className="text-[12.5px] font-mono font-bold w-20 flex-shrink-0" style={{ color: 'var(--ink)' }}>{m.key}</span>
                      <div className="flex gap-2 flex-wrap">
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: '#EFF6FF', color: '#2563EB' }}>설치 {m.instCount}건</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: '#FEF3C7', color: '#D97706' }}>서비스 {m.svcCount}건</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: '#ECFDF5', color: '#059669' }}>완료 {m.svcCompletedCount}건</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 연도별 현황 */}
            <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>연도별 현황</div>
              {periodStats.yearly.length === 0 ? (
                <div className="text-[12px] py-4 text-center" style={{ color: 'var(--ink-faint)' }}>설치·서비스 기록을 등록하면 연도별 현황이 표시됩니다.</div>
              ) : (
                <div className="space-y-2">
                  {periodStats.yearly.map(y => (
                    <div key={y.key} className="flex items-center gap-3 flex-wrap p-2 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
                      <span className="text-[12.5px] font-mono font-bold w-14 flex-shrink-0" style={{ color: 'var(--ink)' }}>{y.key}</span>
                      <div className="flex gap-2 flex-wrap">
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: '#EFF6FF', color: '#2563EB' }}>설치 {y.instCount}건</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: '#FEF3C7', color: '#D97706' }}>서비스 {y.svcCount}건</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: '#ECFDF5', color: '#059669' }}>완료 {y.svcCompletedCount}건</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </AppLayout>
  )
}

// ── 설치 폼 ──────────────────────────────────────────────────
function InstallForm({ form, setForm, onSave, onCancel, isEdit }) {
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // 시리얼 번호 입력 후 포커스를 벗어나면 배포이력(추적성관리)에서 제품·고객 정보를 자동으로 채운다.
  function fillBySerial() {
    const sn = form.serialNo
    const dist = findDistBySerial(sn)
    const inst = !dist && findInstBySerial(sn)
    const src2 = dist || inst
    if (!src2) return
    setForm(f => ({
      ...f,
      productName: src2.productName || f.productName,
      productCode: src2.productCode || f.productCode,
      customerName: src2.customerName || f.customerName,
      installAddress: src2.customerAddress || src2.installAddress || f.installAddress,
    }))
  }

  return (
    <div className="mb-5 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>{isEdit ? '설치 기록 수정' : '설치 기록 등록'}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <Field label="시리얼 번호 (S/N)" value={form.serialNo} onChange={v => F('serialNo', v)} onBlur={fillBySerial} placeholder="S/N 입력 시 제품·고객 자동 조회" />
        <Field label="제품명 *" value={form.productName} onChange={v => F('productName', v)} />
        <Field label="제품 코드" value={form.productCode} onChange={v => F('productCode', v)} />
        <Field label="고객명" value={form.customerName} onChange={v => F('customerName', v)} list="inst-customer-list" listOptions={salesCustomerNames()} />
        <Field label="설치 주소" value={form.installAddress} onChange={v => F('installAddress', v)} />
        <Field label="설치일" type="date" value={form.installDate} onChange={v => F('installDate', v)} />
      </div>
      {!isEdit && (
        <div className="mb-4 text-[11px] px-2.5 py-2 rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>
          ℹ 등록 시 상태는 '예정'으로 자동 설정되며, 설치 체크리스트는 제품 개발 화면에 지정된 항목(없으면 기본 항목)으로 자동 부여됩니다. 등록 후 목록에서 카드를 눌러 체크리스트를 진행하세요 — 전체 완료 시 자동으로 '완료' 상태가 됩니다.
        </div>
      )}

      <FieldArea label="비고" value={form.notes} onChange={v => F('notes', v)} rows={2} />
      <div className="flex gap-2 mt-3">
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

// ── 서비스 폼 ─────────────────────────────────────────────────
function ServiceForm({ form, setForm, onSave, onCancel, isEdit }) {
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // 시리얼 번호 입력 후 포커스를 벗어나면 배포이력(추적성관리)에서 제품·고객 정보를 자동으로 채운다.
  function fillBySerial() {
    const sn = form.serialNo
    const dist = findDistBySerial(sn)
    if (!dist) return
    setForm(f => ({
      ...f,
      productName: dist.productName || f.productName,
      productCode: dist.productCode || f.productCode,
      customerName: dist.customerName || f.customerName,
      customerContact: dist.customerContact || f.customerContact,
      customerAddress: dist.customerAddress || f.customerAddress,
    }))
  }

  return (
    <div className="mb-5 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>{isEdit ? '서비스 기록 수정' : '서비스 기록 등록'}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <Field label="시리얼 번호" value={form.serialNo} onChange={v => F('serialNo', v)} onBlur={fillBySerial} placeholder="S/N 입력 시 제품·고객 자동 조회" />
        <Field label="제품명 *" value={form.productName} onChange={v => F('productName', v)} />
        <Field label="제품 코드" value={form.productCode} onChange={v => F('productCode', v)} />
        <Field label="고객명" value={form.customerName} onChange={v => F('customerName', v)} />
        <Field label="고객 연락처" value={form.customerContact} onChange={v => F('customerContact', v)} />
        <Field label="고객 주소" value={form.customerAddress} onChange={v => F('customerAddress', v)} />
        <FieldSelect label="서비스 유형" value={form.svcType} onChange={v => F('svcType', v)}
          options={Object.entries(SVC_TYPES).map(([k, v]) => ({ value: k, label: v.label }))} />
        <Field label="접수일" type="date" value={form.reportedDate} onChange={v => F('reportedDate', v)} />
      </div>
      {!isEdit && (
        <div className="mb-4 text-[11px] px-2.5 py-2 rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>
          ℹ 접수 시 상태는 '접수'로 자동 설정됩니다. 이후 상태는 목록의 출동/완료 버튼으로만 전환되며, 출동 처리 시 로그인 계정이 담당 엔지니어로 자동 등록됩니다.
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <FieldArea label="증상 / 불만 내용" value={form.symptom} onChange={v => F('symptom', v)} rows={2} />
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

// ── 공용 컴포넌트 ─────────────────────────────────────────────
function Kpi({ label, value, good, warn, bad }) {
  const color = bad ? '#DC2626' : warn ? '#D97706' : good ? '#059669' : 'var(--ink)'
  const bg    = bad ? '#FEE2E2' : warn ? '#FEF3C7' : good ? '#D1FAE5' : 'var(--bg-card)'
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
    <button onClick={onClick} className="px-2 py-1 rounded-lg text-[11px] font-bold"
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

function Field({ label, value, onChange, onBlur, type = 'text', placeholder, list, listOptions }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} onBlur={onBlur} placeholder={placeholder} list={list}
        className="w-full px-3 py-1.5 rounded-xl text-[13px]"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
      {list && listOptions && <datalist id={list}>{listOptions.map(n => <option key={n} value={n} />)}</datalist>}
    </div>
  )
}
/* 영업(고객사 관리)에 등록된 고객명 — 설치·서비스 화면에서도 동일하게 검색·선택할 수 있도록 재사용 */
function salesCustomerNames() {
  try {
    const raw = localStorage.getItem('qms_sal_customers')
    if (!raw) return []
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list.map(c => c.name).filter(Boolean) : []
  } catch { return [] }
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
      <HubBanner title="설치·서비스 관리" subtitle="ISO 13485 §7.5.3 설치 활동 · §7.5.4 서비스 활동" icon={Wrench} color="#0891B2" workflow={['설치 의뢰 접수', '현장 출동', '설치 완료', '서비스 기록', '고객 확인']} />
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows}
        className="w-full px-3 py-1.5 rounded-xl text-[13px] resize-none"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
    </div>
  )
}
