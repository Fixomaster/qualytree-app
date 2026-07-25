// src/pages/service/ServiceHub.jsx
// ISO 13485 §7.5.3 설치 활동 / §7.5.4 서비스 활동
import React, { useState, useMemo } from 'react'
import {
  Plus, X, Save, Edit2, Trash2, Wrench, MapPin,
  CheckCircle2, Clock, AlertTriangle, XCircle,
  Package, Link2, ClipboardList, BarChart2, User,
  ChevronDown, ChevronUp, FileText, Tool,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'

// ── 상수 ─────────────────────────────────────────────────────
const LS_INST = 'qualytree.installations'
const LS_SVC  = 'qualytree.services'

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

const EMPTY_INST = {
  productName: '', productCode: '', serialNo: '', lotNo: '',
  customerName: '', customerCode: '', customerContact: '',
  installAddress: '', installDate: todayStr(), installedBy: '',
  status: 'scheduled', linkedDistId: '', linkedComplaintId: '',
  checkItems: DEFAULT_INSTALL_CHECKS.map(name => ({ name, done: false })),
  verdict: 'pending',  // pending | pass | fail
  customerSignature: false, notes: '',
}

const EMPTY_SVC = {
  productName: '', productCode: '', serialNo: '',
  customerName: '', customerContact: '', customerAddress: '',
  svcType: 'corrective', status: 'open',
  reportedDate: todayStr(), dispatchedDate: '', completedDate: '',
  assignedTo: '', symptom: '', causeAnalysis: '', actionTaken: '',
  partsReplaced: '', nextSvcDate: '',
  linkedInstId: '', linkedComplaintId: '', linkedCalId: '',
  followUpRequired: false, followUpNote: '',
  customerFeedback: '', notes: '',
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

  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType]     = useState('all')
  const [search, setSearch]             = useState('')
  const [deviceSearch, setDeviceSearch] = useState('')

  function saveInst(list) { setInstallations(list); localStorage.setItem(LS_INST, JSON.stringify(list)) }
  function saveSvc(list)  { setServices(list);       localStorage.setItem(LS_SVC,  JSON.stringify(list)) }

  // ── 설치 CRUD ─────────────────────────────────────────────
  function submitInst() {
    if (!instForm.productName.trim()) return alert('제품명을 입력하세요.')
    const doneCount = instForm.checkItems.filter(c => c.done).length
    const verdict = doneCount === instForm.checkItems.length ? 'pass' : doneCount === 0 ? 'pending' : 'partial'
    const record = { ...instForm, verdict, updatedAt: todayStr() }
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

  function toggleCheck(idx) {
    setInstForm(f => {
      const items = [...f.checkItems]
      items[idx] = { ...items[idx], done: !items[idx].done }
      return { ...f, checkItems: items }
    })
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
      next = [{ id: genSvcId(), createdAt: todayStr(), ...svcForm }, ...services]
    }
    saveSvc(next)
    setShowSvcForm(false); setSvcForm(EMPTY_SVC); setEditSvcId(null)
  }

  function deleteSvc(id) {
    if (!confirm('서비스 기록을 삭제하시겠습니까?')) return
    saveSvc(services.filter(s => s.id !== id))
  }

  function quickSvcStatus(id, status) {
    const update = { status, updatedAt: todayStr() }
    if (status === 'completed') update.completedDate = todayStr()
    if (status === 'dispatched') update.dispatchedDate = todayStr()
    saveSvc(services.map(s => s.id === id ? { ...s, ...update } : s))
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

  // 장비별 이력 (serialNo 기준)
  const deviceMap = useMemo(() => {
    const m = {}
    installations.forEach(i => {
      if (!i.serialNo) return
      if (!m[i.serialNo]) m[i.serialNo] = { serialNo: i.serialNo, productName: i.productName, productCode: i.productCode, installs: [], services: [] }
      m[i.serialNo].installs.push(i)
    })
    services.forEach(s => {
      if (!s.serialNo) return
      if (!m[s.serialNo]) m[s.serialNo] = { serialNo: s.serialNo, productName: s.productName, productCode: s.productCode, installs: [], services: [] }
      m[s.serialNo].services.push(s)
    })
    return Object.values(m).filter(d =>
      !deviceSearch || d.serialNo.toLowerCase().includes(deviceSearch.toLowerCase()) ||
      d.productName.toLowerCase().includes(deviceSearch.toLowerCase())
    )
  }, [installations, services, deviceSearch])

  // 분석
  const analysis = useMemo(() => {
    const openSvc = services.filter(s => !['completed', 'cancelled'].includes(s.status))
    const followUp = services.filter(s => s.followUpRequired && s.status !== 'completed')
    const overdueSvc = services.filter(s => s.nextSvcDate && daysDiff(s.nextSvcDate) < 0)
    const instOk = installations.filter(i => i.status === 'completed' && i.verdict === 'pass').length
    const instFail = installations.filter(i => i.verdict === 'fail').length
    const svcByType = {}
    Object.keys(SVC_TYPES).forEach(k => { svcByType[k] = services.filter(s => s.svcType === k).length })
    return { openSvc, followUp, overdueSvc, instOk, instFail, svcByType }
  }, [installations, services])

  return (
    <AppLayout user={user} title="설치·서비스 관리" subtitle="ISO 13485 §7.5.3 설치 활동 · §7.5.4 서비스 활동">
      <div className="px-6 lg:px-8 py-6 max-w-[1400px] mx-auto">

        {/* KPI 요약 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <Kpi label="설치 완료" value={installations.filter(i => i.status === 'completed').length} good />
          <Kpi label="서비스 미결" value={analysis.openSvc.length} warn={analysis.openSvc.length > 0} />
          <Kpi label="후속 조치 필요" value={analysis.followUp.length} bad={analysis.followUp.length > 0} />
          <Kpi label="차기 점검 초과" value={analysis.overdueSvc.length} bad={analysis.overdueSvc.length > 0} />
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
                isEdit={!!editInstId} toggleCheck={toggleCheck} />
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
                    <div key={inst.id} className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
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
                          <div className="flex gap-1 flex-shrink-0 flex-col items-end">
                            {canEdit && (
                              <div className="flex gap-1">
                                {inst.status === 'scheduled' && (
                                  <QuickBtn label="완료" color="#059669" onClick={() => quickStatus(inst.id, 'completed')} />
                                )}
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

                        {/* 체크리스트 펼침 */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: '1px solid var(--line)' }}>
                            {(inst.checkItems || []).map((item, i) => (
                              <div key={i} className="flex items-center gap-2">
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
                  return (
                    <div key={svc.id} className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: `1.5px solid ${svc.followUpRequired && svc.status !== 'completed' ? '#FDE68A' : 'var(--line)'}` }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-[11px] font-mono" style={{ color: 'var(--ink-faint)' }}>{svc.id}</span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
                            <span className="text-[11px] font-semibold" style={{ color: typeInfo.color }}>{typeInfo.label}</span>
                            {svc.followUpRequired && svc.status !== 'completed' && (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: '#D97706' }}>후속 조치 필요</span>
                            )}
                          </div>
                          <div className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>{svc.productName}</div>
                          <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>
                            {svc.productCode && `${svc.productCode} · `}S/N: {svc.serialNo || '-'} · 고객: {svc.customerName || '-'}
                          </div>
                          {svc.symptom && <div className="text-[12px] mt-1" style={{ color: 'var(--ink-soft)' }}>증상: {svc.symptom}</div>}
                          {svc.actionTaken && <div className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>조치: {svc.actionTaken}</div>}
                          <div className="flex gap-3 mt-1 text-[11px]" style={{ color: 'var(--ink-faint)' }}>
                            <span>접수: {svc.reportedDate}</span>
                            {svc.completedDate && <span>완료: {svc.completedDate}</span>}
                            {svc.assignedTo && <span>담당: {svc.assignedTo}</span>}
                            {svc.nextSvcDate && (
                              <span style={{ color: daysDiff(svc.nextSvcDate) < 0 ? '#DC2626' : daysDiff(svc.nextSvcDate) <= 30 ? '#D97706' : 'var(--ink-faint)' }}>
                                다음 점검: {svc.nextSvcDate}
                              </span>
                            )}
                          </div>
                          {(svc.linkedInstId || svc.linkedComplaintId || svc.linkedCalId) && (
                            <div className="flex gap-2 mt-1 flex-wrap">
                              {svc.linkedInstId && <span className="text-[11px] flex items-center gap-1" style={{ color: '#2563EB' }}><Link2 size={10} /> 설치 {svc.linkedInstId}</span>}
                              {svc.linkedComplaintId && <span className="text-[11px] flex items-center gap-1" style={{ color: '#DC2626' }}><Link2 size={10} /> 불만 {svc.linkedComplaintId}</span>}
                              {svc.linkedCalId && <span className="text-[11px] flex items-center gap-1" style={{ color: '#7C3AED' }}><Link2 size={10} /> 교정 {svc.linkedCalId}</span>}
                            </div>
                          )}
                        </div>
                        {canEdit && (
                          <div className="flex gap-1 flex-shrink-0 flex-wrap justify-end">
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
              <Empty icon={Package} text="S/N이 등록된 장비 기록이 없습니다." />
            ) : (
              <div className="space-y-4">
                {deviceMap.map(dev => (
                  <div key={dev.serialNo} className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-soft)' }}>
                        <Package size={16} style={{ color: 'var(--moss)' }} />
                      </div>
                      <div>
                        <div className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>{dev.productName}</div>
                        <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{dev.productCode} · S/N: {dev.serialNo}</div>
                      </div>
                      <div className="ml-auto flex gap-2">
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: '#EFF6FF', color: '#2563EB' }}>설치 {dev.installs.length}건</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: '#FEF3C7', color: '#D97706' }}>서비스 {dev.services.length}건</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {[...dev.installs.map(i => ({ type: 'install', date: i.installDate, id: i.id, desc: `설치 — ${i.customerName || '-'} / ${i.installAddress || '-'}`, status: INST_STATUSES[i.status] })),
                        ...dev.services.map(s => ({ type: 'service', date: s.reportedDate, id: s.id, desc: `${SVC_TYPES[s.svcType]?.label || '서비스'} — ${s.symptom || s.actionTaken || '-'}`, status: SVC_STATUSES[s.status] }))
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

            {/* 후속 조치 + 차기 점검 초과 */}
            {analysis.followUp.length > 0 && (
              <div className="p-5 rounded-2xl" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                <div className="text-[13px] font-bold mb-2" style={{ color: '#92400E' }}>⚠ 후속 조치 미완료 ({analysis.followUp.length}건)</div>
                {analysis.followUp.slice(0, 5).map(s => (
                  <div key={s.id} className="text-[12px] py-1" style={{ color: '#78350F' }}>• {s.id} — {s.productName} / {s.customerName} {s.followUpNote && `— ${s.followUpNote}`}</div>
                ))}
              </div>
            )}
            {analysis.overdueSvc.length > 0 && (
              <div className="p-5 rounded-2xl" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                <div className="text-[13px] font-bold mb-2" style={{ color: '#991B1B' }}>차기 점검일 초과 ({analysis.overdueSvc.length}건)</div>
                {analysis.overdueSvc.slice(0, 5).map(s => (
                  <div key={s.id} className="text-[12px] py-1" style={{ color: '#7F1D1D' }}>• {s.id} — {s.productName} · 예정일 {s.nextSvcDate}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

// ── 설치 폼 ──────────────────────────────────────────────────
function InstallForm({ form, setForm, onSave, onCancel, isEdit, toggleCheck }) {
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const [newCheck, setNewCheck] = useState('')

  function addCheck() {
    if (!newCheck.trim()) return
    setForm(f => ({ ...f, checkItems: [...(f.checkItems || []), { name: newCheck.trim(), done: false }] }))
    setNewCheck('')
  }
  function removeCheck(i) {
    setForm(f => ({ ...f, checkItems: f.checkItems.filter((_, idx) => idx !== i) }))
  }

  return (
    <div className="mb-5 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>{isEdit ? '설치 기록 수정' : '설치 기록 등록'}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <Field label="제품명 *" value={form.productName} onChange={v => F('productName', v)} />
        <Field label="제품 코드" value={form.productCode} onChange={v => F('productCode', v)} />
        <Field label="시리얼 번호 (S/N)" value={form.serialNo} onChange={v => F('serialNo', v)} />
        <Field label="LOT 번호" value={form.lotNo} onChange={v => F('lotNo', v)} />
        <Field label="고객명" value={form.customerName} onChange={v => F('customerName', v)} />
        <Field label="고객 연락처" value={form.customerContact} onChange={v => F('customerContact', v)} />
        <Field label="설치 주소" value={form.installAddress} onChange={v => F('installAddress', v)} />
        <Field label="설치일" type="date" value={form.installDate} onChange={v => F('installDate', v)} />
        <Field label="설치 담당자" value={form.installedBy} onChange={v => F('installedBy', v)} />
        <FieldSelect label="상태" value={form.status} onChange={v => F('status', v)}
          options={Object.entries(INST_STATUSES).map(([k, v]) => ({ value: k, label: v.label }))} />
        <Field label="연결 배포 ID (추적성)" value={form.linkedDistId} onChange={v => F('linkedDistId', v)} placeholder="DST-xxxx" />
        <Field label="연결 불만 ID" value={form.linkedComplaintId} onChange={v => F('linkedComplaintId', v)} placeholder="CMP-xxxx" />
      </div>

      {/* 체크리스트 */}
      <div className="mb-4">
        <div className="text-[12px] font-bold mb-2" style={{ color: 'var(--ink-soft)' }}>설치 체크리스트</div>
        <div className="space-y-1.5 mb-2">
          {(form.checkItems || []).map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="checkbox" checked={item.done} onChange={() => toggleCheck(i)} className="w-4 h-4 rounded" />
              <span className="text-[12px] flex-1" style={{ color: 'var(--ink)', textDecoration: item.done ? 'line-through' : 'none', opacity: item.done ? 0.5 : 1 }}>{item.name}</span>
              <button onClick={() => removeCheck(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626' }}><X size={12} /></button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newCheck} onChange={e => setNewCheck(e.target.value)} placeholder="체크 항목 추가..."
            className="flex-1 px-3 py-1.5 rounded-xl text-[12px]"
            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}
            onKeyDown={e => e.key === 'Enter' && addCheck()} />
          <button onClick={addCheck} className="px-3 py-1.5 rounded-xl text-[12px] font-bold"
            style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>추가</button>
        </div>
      </div>

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
  return (
    <div className="mb-5 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>{isEdit ? '서비스 기록 수정' : '서비스 기록 등록'}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <Field label="제품명 *" value={form.productName} onChange={v => F('productName', v)} />
        <Field label="제품 코드" value={form.productCode} onChange={v => F('productCode', v)} />
        <Field label="시리얼 번호" value={form.serialNo} onChange={v => F('serialNo', v)} />
        <Field label="고객명" value={form.customerName} onChange={v => F('customerName', v)} />
        <Field label="고객 연락처" value={form.customerContact} onChange={v => F('customerContact', v)} />
        <Field label="고객 주소" value={form.customerAddress} onChange={v => F('customerAddress', v)} />
        <FieldSelect label="서비스 유형" value={form.svcType} onChange={v => F('svcType', v)}
          options={Object.entries(SVC_TYPES).map(([k, v]) => ({ value: k, label: v.label }))} />
        <FieldSelect label="상태" value={form.status} onChange={v => F('status', v)}
          options={Object.entries(SVC_STATUSES).map(([k, v]) => ({ value: k, label: v.label }))} />
        <Field label="접수일" type="date" value={form.reportedDate} onChange={v => F('reportedDate', v)} />
        <Field label="출동일" type="date" value={form.dispatchedDate} onChange={v => F('dispatchedDate', v)} />
        <Field label="완료일" type="date" value={form.completedDate} onChange={v => F('completedDate', v)} />
        <Field label="담당 엔지니어" value={form.assignedTo} onChange={v => F('assignedTo', v)} />
        <Field label="차기 점검 예정일" type="date" value={form.nextSvcDate} onChange={v => F('nextSvcDate', v)} />
        <Field label="연결 설치 ID" value={form.linkedInstId} onChange={v => F('linkedInstId', v)} placeholder="INS-xxxx" />
        <Field label="연결 불만 ID" value={form.linkedComplaintId} onChange={v => F('linkedComplaintId', v)} placeholder="CMP-xxxx" />
        <Field label="연결 교정 ID" value={form.linkedCalId} onChange={v => F('linkedCalId', v)} placeholder="CAL-xxxx" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <FieldArea label="증상 / 불만 내용" value={form.symptom} onChange={v => F('symptom', v)} rows={2} />
        <FieldArea label="원인 분석" value={form.causeAnalysis} onChange={v => F('causeAnalysis', v)} rows={2} />
        <FieldArea label="조치 내용" value={form.actionTaken} onChange={v => F('actionTaken', v)} rows={2} />
        <FieldArea label="교체 부품" value={form.partsReplaced} onChange={v => F('partsReplaced', v)} rows={2} />
        <FieldArea label="고객 피드백" value={form.customerFeedback} onChange={v => F('customerFeedback', v)} rows={2} />
        <FieldArea label="비고" value={form.notes} onChange={v => F('notes', v)} rows={2} />
      </div>
      <div className="flex items-center gap-2 mb-3">
        <input type="checkbox" id="followUp" checked={form.followUpRequired} onChange={e => F('followUpRequired', e.target.checked)} />
        <label htmlFor="followUp" className="text-[12.5px] font-semibold" style={{ color: '#D97706', cursor: 'pointer' }}>후속 조치 필요</label>
        {form.followUpRequired && (
          <input value={form.followUpNote} onChange={e => F('followUpNote', e.target.value)} placeholder="후속 조치 내용..."
            className="flex-1 px-3 py-1.5 rounded-xl text-[12px]"
            style={{ background: 'var(--bg)', border: '1px solid #FDE68A', color: 'var(--ink)' }} />
        )}
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
