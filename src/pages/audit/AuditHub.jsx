// src/pages/audit/AuditHub.jsx
// ISO 13485:2016 §8.2.2 내부감사 허브
//
// v2 재설계: 체크리스트를 감사 전체에서 공유하는 전역 탭이 아니라, 감사 1건마다 독립적으로
// 소유하는 데이터로 전환. 감사 등록 시 체크리스트 항목을 선택해 붙이고(감사등록↔체크리스트
// 연동), "감사 시작" 클릭 시 그 체크리스트를 점검하는 팝업이 뜨며, 항목을 "부적합"으로 표시하면
// 그 자리에서 바로 CAR(시정조치요청)을 발행한다(관련감사ID·관련요건은 자동 연결 — 수기 입력 없음).
// 모든 CAR이 종결되어야 감사를 종결할 수 있도록 게이팅한다.
import React, { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Search, Plus, ChevronRight, CheckCircle2,
  Clock, AlertTriangle, Calendar, Users,
  FileText, BarChart2, ClipboardList, XCircle,
  ChevronDown, Download, Filter, X, Sparkles, Loader2, Lock,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'
import { loadOrgDepts } from '../../lib/orgDepts'

const STORAGE_KEY = 'qualytree.audits'
const CAR_KEY = 'qualytree.audit_cars'

function composeAuditTitle(f) {
  const parts = [f.auditType || '정기', f.auditee, f.auditYear].filter(Boolean)
  return parts.join(' · ')
}

const AUDIT_STATUS = {
  PLANNED:     'planned',
  IN_PROGRESS: 'in_progress',
  COMPLETED:   'completed',
  CLOSED:      'closed',
}

const AUDIT_STATUS_LABEL = {
  planned:     '계획',
  in_progress: '진행 중',
  completed:   '완료 (시정조치 대기)',
  closed:      '종결',
}

const AUDIT_STATUS_COLOR = {
  planned:     '#6B7280',
  in_progress: '#F59E0B',
  completed:   '#3B82F6',
  closed:      '#10B981',
}

const CAR_STATUS = {
  OPEN:     'open',
  PROGRESS: 'in_progress',
  VERIFIED: 'verified',
  CLOSED:   'closed',
}
const CAR_STATUS_LABEL = { open: '미처리', in_progress: '조치 중', verified: '검증 완료', closed: '종결' }
const CAR_STATUS_COLOR = { open: '#EF4444', in_progress: '#F59E0B', verified: '#3B82F6', closed: '#10B981' }

const AUDIT_CHECKLIST = [
  { iso: '4.1', item: '품질경영시스템 일반 요건' },
  { iso: '4.2', item: '문서화 요건 (매뉴얼·절차·기록)' },
  { iso: '5.1', item: '경영진 책임 및 의지' },
  { iso: '5.4', item: '품질목표 및 계획' },
  { iso: '6.2', item: '인적 자원 (교육·역량)' },
  { iso: '6.3', item: '기반구조 (설비·환경)' },
  { iso: '7.2', item: '고객 관련 프로세스 (요구사항)' },
  { iso: '7.3', item: '설계 및 개발' },
  { iso: '7.4', item: '구매 (공급업체 관리)' },
  { iso: '7.5', item: '생산 및 서비스 제공' },
  { iso: '7.6', item: '모니터링 및 측정장치 관리' },
  { iso: '8.2.1', item: '고객만족 모니터링' },
  { iso: '8.2.4', item: '제품 모니터링 및 측정' },
  { iso: '8.3', item: '부적합 제품 관리' },
  { iso: '8.4', item: '데이터 분석' },
  { iso: '8.5', item: '개선 (CAPA)' },
]

function loadAudits() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function saveAudits(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}
function loadCARs() {
  try { return JSON.parse(localStorage.getItem(CAR_KEY) || '[]') } catch { return [] }
}
function saveCARs(data) {
  localStorage.setItem(CAR_KEY, JSON.stringify(data))
}
function genId(prefix) {
  return `${prefix}-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`
}

export default function AuditHub() {
  const user = auth.current()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState(() => searchParams.get('tab') || 'audits')
  const highlightCarId = searchParams.get('carId')
  const highlightAuditId = searchParams.get('auditId')
  const [audits, setAudits] = useState(() => loadAudits())
  const [cars, setCARs] = useState(() => loadCARs())
  const [showForm, setShowForm] = useState(false)
  const [selectedAudit, setSelectedAudit] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [checklistAuditId, setChecklistAuditId] = useState(highlightAuditId || null)

  const stats = useMemo(() => ({
    total: audits.length,
    planned: audits.filter(a => a.status === AUDIT_STATUS.PLANNED).length,
    inProgress: audits.filter(a => a.status === AUDIT_STATUS.IN_PROGRESS).length,
    completed: audits.filter(a => a.status === AUDIT_STATUS.COMPLETED).length,
    carOpen: cars.filter(c => c.status === CAR_STATUS.OPEN).length,
    carTotal: cars.length,
  }), [audits, cars])

  const filteredAudits = useMemo(() => {
    let arr = [...audits].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    if (filterStatus !== 'all') arr = arr.filter(a => a.status === filterStatus)
    return arr
  }, [audits, filterStatus])

  const updateAuditChecklist = (auditId, newChecklist) => {
    const updated = audits.map(a => a.id === auditId ? { ...a, checklist: newChecklist } : a)
    saveAudits(updated)
    setAudits(updated)
  }

  const issueCarFromChecklist = ({ auditId, iso, itemLabel, severity, finding }) => {
    const car = {
      id: genId('CAR'),
      auditId,
      requirement: iso,
      finding: finding || `${itemLabel} — 체크리스트 부적합`,
      severity: severity || 'major',
      status: CAR_STATUS.OPEN,
      createdAt: new Date().toISOString(),
      createdBy: user?.name || 'Unknown',
    }
    const updated = [...cars, car]
    saveCARs(updated)
    setCARs(updated)
    return car.id
  }

  const checklistAudit = audits.find(a => a.id === checklistAuditId) || null

  return (
    <AppLayout user={user} title="내부감사" subtitle="ISO 13485 §8.2.2 · 내부감사 계획·실시·시정조치">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto">

        {/* 배너 */}
        <HubBanner
          title="내부감사"
          subtitle="감사 등록 시 체크리스트가 함께 생성되고, 감사 시작 시 점검 팝업이 뜹니다 · 부적합 항목은 그 자리에서 CAR이 자동 발행됩니다"
          icon={ClipboardList}
          color="#6366F1"
          quickActions={[
            { label: '감사 등록', icon: Plus, onClick: () => { setTab('audits'); setShowForm(true) }, primary: true },
          ]}
          workflow={['감사 계획수립(체크리스트 선택)', '감사 시작(체크리스트 점검)', '부적합→CAR 자동발행', '시정조치 완료', '감사 종결']}
        />

        {/* KPI 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: '계획된 감사', value: stats.planned, icon: Calendar, color: '#6B7280' },
            { label: '진행 중', value: stats.inProgress, icon: Clock, color: '#F59E0B' },
            { label: '완료', value: stats.completed, icon: CheckCircle2, color: '#3B82F6' },
            { label: '미결 CAR', value: stats.carOpen, icon: AlertTriangle, color: '#EF4444', urgent: stats.carOpen > 0 },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="p-4 rounded-2xl"
              style={{
                background: 'var(--bg-card)',
                border: `1px solid ${kpi.urgent ? '#EF444440' : 'var(--line)'}`,
                boxShadow: kpi.urgent ? '0 0 0 2px #EF444420' : 'none',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>{kpi.label}</span>
                <kpi.icon size={15} style={{ color: kpi.color }} />
              </div>
              <div className="text-[26px] font-bold" style={{ color: kpi.urgent ? '#EF4444' : 'var(--ink)' }}>
                {kpi.value}
              </div>
            </div>
          ))}
        </div>

        {/* 탭 (체크리스트 탭 삭제 — 감사별로 통합됨) */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: 'var(--bg-soft)', width: 'fit-content' }}>
          {[
            { key: 'audits', label: '감사 계획·실시', icon: Search },
            { key: 'cars', label: 'CAR 현황', icon: AlertTriangle },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition"
              style={{
                background: tab === key ? 'var(--bg-card)' : 'transparent',
                color: tab === key ? 'var(--ink)' : 'var(--ink-faint)',
                boxShadow: tab === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                border: 'none', cursor: 'pointer',
              }}
            >
              <Icon size={14} />
              {label}
              {key === 'cars' && stats.carOpen > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: '#EF4444', color: '#fff' }}>
                  {stats.carOpen}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 'audits' && (
          <AuditsTab
            audits={filteredAudits}
            cars={cars}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            showForm={showForm}
            setShowForm={setShowForm}
            selectedAudit={selectedAudit}
            setSelectedAudit={setSelectedAudit}
            highlightAuditId={highlightAuditId}
            onSave={(form) => {
              const { checklistIso, ...rest } = form
              const updated = selectedAudit
                ? audits.map(a => a.id === selectedAudit.id ? { ...a, ...rest, updatedAt: new Date().toISOString() } : a)
                : [...audits, {
                    ...rest,
                    id: genId('AUD'),
                    status: AUDIT_STATUS.PLANNED,
                    createdAt: new Date().toISOString(),
                    createdBy: user?.name || 'Unknown',
                    findings: [],
                    checklist: (checklistIso || []).map((iso) => {
                      const tpl = AUDIT_CHECKLIST.find((c) => c.iso === iso)
                      return { iso, item: tpl?.item || iso, detail: '', result: 'pending', note: '', carId: null }
                    }),
                  }]
              saveAudits(updated)
              setAudits(updated)
              setShowForm(false)
              setSelectedAudit(null)
            }}
            onStatusChange={(id, status) => {
              const updated = audits.map(a => a.id === id ? { ...a, status, updatedAt: new Date().toISOString() } : a)
              saveAudits(updated)
              setAudits(updated)
            }}
            onOpenChecklist={(id) => setChecklistAuditId(id)}
          />
        )}

        {tab === 'cars' && (
          <CARsTab
            cars={cars}
            highlightCarId={highlightCarId}
            onStatusChange={(id, status) => {
              const updated = cars.map(c => c.id === id ? { ...c, status, updatedAt: new Date().toISOString() } : c)
              saveCARs(updated)
              setCARs(updated)
            }}
          />
        )}
      </div>

      {checklistAudit && (
        <ChecklistPopup
          audit={checklistAudit}
          cars={cars}
          onClose={() => setChecklistAuditId(null)}
          onUpdateChecklist={updateAuditChecklist}
          onIssueCar={issueCarFromChecklist}
        />
      )}
    </AppLayout>
  )
}

/* ── 감사 목록 탭 ── */
function AuditsTab({ audits, cars, filterStatus, setFilterStatus, showForm, setShowForm, selectedAudit, setSelectedAudit, highlightAuditId, onSave, onStatusChange, onOpenChecklist }) {
  const [form, setForm] = useState({
    title: '', scope: '', auditDate: '', auditor: '', auditee: '',
    type: 'internal', standard: 'ISO 13485', auditType: '정기', auditYear: String(new Date().getFullYear()),
    checklistIso: AUDIT_CHECKLIST.map((c) => c.iso),
  })

  const startEdit = (audit) => {
    setSelectedAudit(audit)
    setForm({
      title: audit.title, scope: audit.scope || '', auditDate: audit.auditDate || '', auditor: audit.auditor || '',
      auditee: audit.auditee || '', type: audit.type || 'internal', standard: audit.standard || 'ISO 13485',
      auditType: audit.auditType || '정기', auditYear: audit.auditYear || String(new Date().getFullYear()),
      checklistIso: AUDIT_CHECKLIST.map((c) => c.iso),
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setSelectedAudit(null)
    setForm({
      title: '', scope: '', auditDate: '', auditor: '', auditee: '', type: 'internal', standard: 'ISO 13485',
      auditType: '정기', auditYear: String(new Date().getFullYear()), checklistIso: AUDIT_CHECKLIST.map((c) => c.iso),
    })
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {['all', ...Object.values(AUDIT_STATUS)].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition"
              style={{
                background: filterStatus === s ? '#6366F1' : 'var(--bg-soft)',
                color: filterStatus === s ? '#fff' : 'var(--ink-soft)',
                border: 'none', cursor: 'pointer',
              }}
            >
              {s === 'all' ? '전체' : AUDIT_STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold"
          style={{ background: '#6366F1', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          <Plus size={15} />
          감사 등록
        </button>
      </div>

      {showForm && (
        <AuditForm
          form={form}
          setForm={setForm}
          isEdit={!!selectedAudit}
          onSubmit={() => onSave({ ...form, title: composeAuditTitle(form) })}
          onCancel={() => { setShowForm(false); resetForm() }}
        />
      )}

      {audits.length === 0 ? (
        <EmptyState
          icon={Search}
          title="등록된 감사가 없습니다"
          desc="내부감사 계획을 등록하고 ISO 13485 준수 현황을 관리하세요."
        />
      ) : (
        <div className="space-y-3">
          {audits.map((audit) => (
            <AuditCard
              key={audit.id}
              audit={audit}
              cars={cars}
              highlight={highlightAuditId === audit.id}
              onEdit={() => startEdit(audit)}
              onStatusChange={(status) => onStatusChange(audit.id, status)}
              onOpenChecklist={() => onOpenChecklist(audit.id)}
              onStartAudit={() => { onStatusChange(audit.id, AUDIT_STATUS.IN_PROGRESS); onOpenChecklist(audit.id) }}
            />
          ))}
        </div>
      )}
    </>
  )
}

function AuditCard({ audit, cars, highlight, onEdit, onStatusChange, onOpenChecklist, onStartAudit }) {
  const [open, setOpen] = useState(() => !!highlight)
  const cardRef = React.useRef(null)
  const statusColor = AUDIT_STATUS_COLOR[audit.status] || '#6B7280'
  const relatedCars = cars.filter((c) => c.auditId === audit.id)
  const openCars = relatedCars.filter((c) => c.status !== CAR_STATUS.CLOSED)
  const checklist = audit.checklist || []
  const checklistDone = checklist.filter((it) => it.result && it.result !== 'pending').length

  React.useEffect(() => {
    if (highlight && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlight])

  return (
    <div
      ref={cardRef}
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--bg-card)', border: highlight ? '2px solid var(--moss)' : '1px solid var(--line)', boxShadow: highlight ? '0 0 0 3px var(--leaf-soft)' : 'none' }}
    >
      <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusColor }} />
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold truncate" style={{ color: 'var(--ink)' }}>
              {audit.id} · {audit.title}
            </div>
            <div className="flex items-center gap-3 mt-1 text-[12px]" style={{ color: 'var(--ink-faint)' }}>
              {audit.auditDate && <span>📅 {audit.auditDate}</span>}
              {audit.auditor && <span>👤 {audit.auditor}</span>}
              {audit.scope && <span className="truncate max-w-[200px]">📋 {audit.scope}</span>}
              {checklist.length > 0 && <span>✅ 체크리스트 {checklistDone}/{checklist.length}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className="text-[11px] font-medium px-2.5 py-1 rounded-full"
            style={{ background: `${statusColor}20`, color: statusColor }}
          >
            {AUDIT_STATUS_LABEL[audit.status]}
          </span>
          <ChevronDown size={15} style={{ color: 'var(--ink-faint)', transform: open ? 'rotate(180deg)' : 'none', transition: '0.15s' }} />
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: 'var(--line)' }}>
          <div className="pt-4 flex flex-wrap gap-2">
            {audit.status === AUDIT_STATUS.PLANNED && (
              <ActionBtn color="#F59E0B" onClick={onStartAudit}>감사 시작 (체크리스트 열기)</ActionBtn>
            )}
            {audit.status === AUDIT_STATUS.IN_PROGRESS && (
              <>
                <ActionBtn color="#6366F1" onClick={onOpenChecklist}>체크리스트 보기</ActionBtn>
                <ActionBtn color="#3B82F6" onClick={() => onStatusChange(AUDIT_STATUS.COMPLETED)}>감사 완료</ActionBtn>
              </>
            )}
            {audit.status === AUDIT_STATUS.COMPLETED && (
              openCars.length > 0 ? (
                <span
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
                  style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}
                >
                  <Lock size={12} /> 시정조치 대기 중 ({openCars.length}건) — 모두 종결해야 감사 종결 가능
                </span>
              ) : (
                <ActionBtn color="#10B981" onClick={() => onStatusChange(AUDIT_STATUS.CLOSED)}>감사 종결</ActionBtn>
              )
            )}
            <ActionBtn color="#6B7280" onClick={onEdit}>수정</ActionBtn>
          </div>
          {relatedCars.length > 0 && (
            <div className="mt-3">
              <div className="text-[12px] font-semibold mb-2" style={{ color: 'var(--ink-soft)' }}>발행된 CAR ({relatedCars.length}건)</div>
              <div className="flex flex-wrap gap-1.5">
                {relatedCars.map((c) => (
                  <span key={c.id} className="text-[11px] px-2 py-1 rounded-lg" style={{ background: `${CAR_STATUS_COLOR[c.status]}18`, color: CAR_STATUS_COLOR[c.status] }}>
                    {c.id} · {CAR_STATUS_LABEL[c.status]}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AuditForm({ form, setForm, isEdit, onSubmit, onCancel }) {
  const f = (k) => ({ value: form[k], onChange: (e) => setForm(p => ({ ...p, [k]: e.target.value })) })
  const depts = React.useMemo(() => loadOrgDepts(), [])
  const canSubmit = !!form.auditType && !!form.auditee
  const toggleChecklistIso = (iso) => {
    setForm((p) => {
      const has = (p.checklistIso || []).includes(iso)
      return { ...p, checklistIso: has ? p.checklistIso.filter((x) => x !== iso) : [...(p.checklistIso || []), iso] }
    })
  }
  return (
    <div className="mb-5 p-5 rounded-2xl" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>
        {isEdit ? '감사 수정' : '내부감사 등록'}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="감사종류 *" required>
          <select {...f('auditType')} className="qt-input">
            <option value="정기">정기</option>
            <option value="불시">불시</option>
          </select>
        </FormField>
        <FormField label="감사연도">
          <input {...f('auditYear')} placeholder="예: 2026" className="qt-input" />
        </FormField>
        <FormField label="감사 유형">
          <select {...f('type')} className="qt-input">
            <option value="internal">내부감사</option>
            <option value="supplier">공급업체 감사</option>
            <option value="certification">인증 심사</option>
          </select>
        </FormField>
        <FormField label="감사 범위">
          <input {...f('scope')} placeholder="예: 생산부 전체, 구매 프로세스" className="qt-input" />
        </FormField>
        <FormField label="감사 기준">
          <input {...f('standard')} placeholder="예: ISO 13485:2016" className="qt-input" />
        </FormField>
        <FormField label="감사예정일">
          <input type="datetime-local" {...f('auditDate')} className="qt-input" />
        </FormField>
        <FormField label="감사원">
          <input {...f('auditor')} placeholder="감사원 이름" className="qt-input" />
        </FormField>
        <FormField label="피감사 부서 *" required>
          <select {...f('auditee')} className="qt-input">
            <option value="">선택</option>
            {depts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </FormField>
      </div>

      {!isEdit && (
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
          <div className="text-[12px] font-bold mb-1" style={{ color: 'var(--ink-soft)' }}>
            감사 체크리스트 ({(form.checklistIso || []).length}/{AUDIT_CHECKLIST.length}개 선택됨)
          </div>
          <div className="text-[11px] mb-2" style={{ color: 'var(--ink-faint)' }}>
            이번 감사 범위에 해당하지 않는 항목은 체크 해제하세요. 등록 후 이 체크리스트로 감사를 진행합니다.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[220px] overflow-y-auto p-1">
            {AUDIT_CHECKLIST.map((c) => {
              const checked = (form.checklistIso || []).includes(c.iso)
              return (
                <label key={c.iso} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer text-[12px]" style={{ background: checked ? 'var(--bg-card)' : 'transparent', border: '1px solid ' + (checked ? 'var(--line)' : 'transparent') }}>
                  <input type="checkbox" checked={checked} onChange={() => toggleChecklistIso(c.iso)} />
                  <span className="font-mono" style={{ color: 'var(--ink-faint)' }}>§{c.iso}</span>
                  <span style={{ color: 'var(--ink)' }}>{c.item}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 mt-4">
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-[13px]" style={{ background: 'var(--bg)', color: 'var(--ink-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>취소</button>
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className="px-5 py-2 rounded-xl text-[13px] font-semibold"
          style={{ background: canSubmit ? '#6366F1' : 'var(--bg-soft)', color: canSubmit ? '#fff' : 'var(--ink-faint)', border: 'none', cursor: canSubmit ? 'pointer' : 'not-allowed' }}
        >
          {isEdit ? '저장' : '등록'}
        </button>
      </div>
    </div>
  )
}

/* ── 체크리스트 점검 팝업 (감사별 소유, 감사 시작 시 자동으로 뜸) ── */
function ChecklistPopup({ audit, cars, onClose, onUpdateChecklist, onIssueCar }) {
  const [items, setItems] = useState(() => audit.checklist || [])
  const [aiLoading, setAiLoading] = useState({})
  const [carDraft, setCarDraft] = useState({})

  const persist = (next) => {
    setItems(next)
    onUpdateChecklist(audit.id, next)
  }

  const setResult = (iso, result) => {
    const target = items.find((it) => it.iso === iso)
    const next = items.map((it) => it.iso === iso ? { ...it, result } : it)
    persist(next)
    if (result === 'nc' && target && !target.carId) {
      setCarDraft((d) => ({ ...d, [iso]: { severity: 'major', finding: `${target.item} — 부적합 확인` } }))
    } else {
      setCarDraft((d) => { const c = { ...d }; delete c[iso]; return c })
    }
  }

  const setDetail = (iso, detail) => persist(items.map((it) => it.iso === iso ? { ...it, detail } : it))
  const setNote = (iso, note) => persist(items.map((it) => it.iso === iso ? { ...it, note } : it))

  const generateDetail = async (iso, itemLabel) => {
    setAiLoading((l) => ({ ...l, [iso]: true }))
    try {
      const res = await fetch('/api/checklist-detail', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ iso, item: itemLabel, standard: audit.standard }),
      })
      const data = await res.json()
      if (data.ok) setDetail(iso, data.detail)
      else alert(data.message || 'AI 생성에 실패했습니다.')
    } catch {
      alert('AI 생성 중 오류가 발생했습니다.')
    } finally {
      setAiLoading((l) => ({ ...l, [iso]: false }))
    }
  }

  const issueCar = (iso) => {
    const it = items.find((x) => x.iso === iso)
    const draft = carDraft[iso] || {}
    const carId = onIssueCar({ auditId: audit.id, iso, itemLabel: it.item, severity: draft.severity || 'major', finding: draft.finding || it.item })
    persist(items.map((x) => x.iso === iso ? { ...x, carId } : x))
  }

  const doneCount = items.filter((it) => it.result && it.result !== 'pending').length

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }} onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--line)', width: '100%', maxWidth: 800, boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
          <div>
            <div className="text-[15px] font-bold" style={{ color: 'var(--ink)' }}>체크리스트 점검 — {audit.title}</div>
            <div className="text-[12px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{doneCount}/{items.length} 항목 점검 완료</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)' }}><X size={20} /></button>
        </div>

        <div className="px-6 py-4 space-y-3" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
          {items.length === 0 && (
            <div className="text-[13px] text-center py-8" style={{ color: 'var(--ink-faint)' }}>이 감사에 연결된 체크리스트 항목이 없습니다.</div>
          )}
          {items.map((it) => {
            const linkedCar = it.carId ? cars.find((c) => c.id === it.carId) : null
            const draft = carDraft[it.iso] || {}
            return (
              <div key={it.iso} className="p-3.5 rounded-xl" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-[11px] font-bold" style={{ color: 'var(--ink-faint)' }}>§{it.iso}</span>
                  <span className="text-[13px] font-medium flex-1" style={{ color: 'var(--ink)' }}>{it.item}</span>
                  <div className="flex gap-1.5">
                    {[
                      { val: 'ok', label: '적합', color: '#10B981' },
                      { val: 'nc', label: '부적합', color: '#EF4444' },
                      { val: 'na', label: 'N/A', color: '#6B7280' },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        onClick={() => setResult(it.iso, it.result === opt.val ? 'pending' : opt.val)}
                        className="text-[11px] px-2.5 py-1 rounded-lg font-medium transition"
                        style={{
                          background: it.result === opt.val ? opt.color : 'var(--bg-card)',
                          color: it.result === opt.val ? '#fff' : 'var(--ink-faint)',
                          border: '1px solid ' + (it.result === opt.val ? opt.color : 'var(--line)'),
                          cursor: 'pointer',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 mb-2">
                  <textarea
                    value={it.detail || ''}
                    onChange={(e) => setDetail(it.iso, e.target.value)}
                    rows={2}
                    placeholder="상세내용 — 이 조항에서 확인할 절차·기록·인터뷰 포인트를 입력하거나 AI 생성을 사용하세요"
                    className="flex-1 text-[12px] p-2 rounded-lg"
                    style={{ border: '1px solid var(--line)', background: 'var(--bg-card)', color: 'var(--ink)', resize: 'vertical' }}
                  />
                  <button
                    onClick={() => generateDetail(it.iso, it.item)}
                    disabled={!!aiLoading[it.iso]}
                    className="flex items-center gap-1 px-3 rounded-lg text-[11px] font-semibold flex-shrink-0"
                    style={{ background: '#7C3AED18', color: '#7C3AED', border: '1px solid #7C3AED30', cursor: aiLoading[it.iso] ? 'default' : 'pointer' }}
                  >
                    {aiLoading[it.iso] ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    AI 생성
                  </button>
                </div>

                <input
                  value={it.note || ''}
                  onChange={(e) => setNote(it.iso, e.target.value)}
                  placeholder="점검 비고 (선택)"
                  className="w-full text-[12px] p-2 rounded-lg"
                  style={{ border: '1px solid var(--line)', background: 'var(--bg-card)', color: 'var(--ink)' }}
                />

                {it.result === 'nc' && (
                  linkedCar ? (
                    <div className="mt-2 flex items-center gap-2 text-[12px] px-2.5 py-1.5 rounded-lg" style={{ background: `${CAR_STATUS_COLOR[linkedCar.status]}15`, color: CAR_STATUS_COLOR[linkedCar.status] }}>
                      <AlertTriangle size={13} /> CAR 발행됨: {linkedCar.id} · {CAR_STATUS_LABEL[linkedCar.status]}
                    </div>
                  ) : (
                    <div className="mt-2 p-2.5 rounded-lg space-y-2" style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}>
                      <div className="text-[11px] font-semibold" style={{ color: '#991B1B' }}>부적합 — CAR 발행</div>
                      <select
                        value={draft.severity || 'major'}
                        onChange={(e) => setCarDraft((d) => ({ ...d, [it.iso]: { ...d[it.iso], severity: e.target.value } }))}
                        className="w-full text-[12px] p-1.5 rounded-lg"
                        style={{ border: '1px solid #FECACA', background: 'var(--bg-card)', color: 'var(--ink)' }}
                      >
                        <option value="major">중요 부적합 (Major)</option>
                        <option value="minor">경미한 부적합 (Minor)</option>
                        <option value="observation">관찰 사항 (Observation)</option>
                      </select>
                      <textarea
                        value={draft.finding ?? `${it.item} — 부적합 확인`}
                        onChange={(e) => setCarDraft((d) => ({ ...d, [it.iso]: { ...d[it.iso], finding: e.target.value } }))}
                        rows={2}
                        placeholder="부적합 내용을 구체적으로 기술하세요"
                        className="w-full text-[12px] p-2 rounded-lg"
                        style={{ border: '1px solid #FECACA', background: 'var(--bg-card)', color: 'var(--ink)', resize: 'vertical' }}
                      />
                      <button
                        onClick={() => issueCar(it.iso)}
                        className="px-3 py-1.5 rounded-lg text-[11.5px] font-semibold"
                        style={{ background: '#DC2626', color: '#fff', border: 'none', cursor: 'pointer' }}
                      >
                        CAR 발행 (관련감사·관련요건 자동 연결)
                      </button>
                    </div>
                  )
                )}
              </div>
            )
          })}
        </div>

        <div className="flex justify-end px-6 py-4" style={{ borderTop: '1px solid var(--line)' }}>
          <button onClick={onClose} className="px-5 py-2 rounded-xl text-[13px] font-semibold" style={{ background: '#6366F1', color: '#fff', border: 'none', cursor: 'pointer' }}>닫기</button>
        </div>
      </div>
    </div>
  )
}

/* ── CAR 탭 (읽기·상태추적 전용 — 발행은 체크리스트 부적합에서만) ── */
function CARsTab({ cars, highlightCarId, onStatusChange }) {
  React.useEffect(() => {
    if (!highlightCarId) return
    const el = document.getElementById(`car-${highlightCarId}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlightCarId, cars])

  return (
    <>
      <div className="mb-4">
        <div className="text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>
          시정조치 요청 (CAR) 현황 — Corrective Action Request
        </div>
        <div className="text-[12px] mt-1" style={{ color: 'var(--ink-faint)' }}>
          CAR은 감사 체크리스트에서 항목을 "부적합"으로 표시할 때 자동 발행됩니다. 여기서는 진행 상태만 추적합니다.
        </div>
      </div>

      {cars.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="발행된 CAR 없음" desc="감사 체크리스트에서 부적합 항목을 표시하면 CAR이 자동으로 발행됩니다." />
      ) : (
        <div className="space-y-3">
          {[...cars].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((car) => {
            const sc = CAR_STATUS_COLOR[car.status] || '#6B7280'
            const severityColor = car.severity === 'major' ? '#EF4444' : car.severity === 'minor' ? '#F59E0B' : '#6B7280'
            const severityLabel = car.severity === 'major' ? 'Major' : car.severity === 'minor' ? 'Minor' : 'Obs.'
            const isHighlighted = car.id === highlightCarId
            return (
              <div key={car.id} id={`car-${car.id}`} className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: isHighlighted ? '2px solid var(--moss)' : '1px solid var(--line)', boxShadow: isHighlighted ? '0 0 0 3px var(--leaf-soft)' : 'none' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[11px] font-bold" style={{ color: 'var(--ink-faint)' }}>{car.id}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${severityColor}20`, color: severityColor }}>{severityLabel}</span>
                    </div>
                    <div className="text-[13.5px] font-medium" style={{ color: 'var(--ink)' }}>{car.finding}</div>
                    <div className="flex gap-4 mt-2 text-[12px]" style={{ color: 'var(--ink-faint)' }}>
                      {car.auditId && <span>🔗 감사: {car.auditId}</span>}
                      {car.requirement && <span>📋 요건: §{car.requirement}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: `${sc}20`, color: sc }}>{CAR_STATUS_LABEL[car.status]}</span>
                    {car.status !== CAR_STATUS.CLOSED && (
                      <select
                        value={car.status}
                        onChange={(e) => onStatusChange(car.id, e.target.value)}
                        className="text-[11px] px-2 py-1 rounded-lg border"
                        style={{ borderColor: 'var(--line)', background: 'var(--bg)', color: 'var(--ink-soft)', cursor: 'pointer' }}
                      >
                        {Object.entries(CAR_STATUS_LABEL).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

/* ── 공통 컴포넌트 ── */
function ActionBtn({ color, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30`, cursor: 'pointer' }}
    >
      {children}
    </button>
  )
}

function FormField({ label, children, colSpan, required }) {
  return (
    <div className={colSpan ? 'md:col-span-2' : ''}>
      <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink-soft)' }}>
        {label}{required && <span style={{ color: '#EF4444' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

function EmptyState({ icon: Icon, title, desc }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center" style={{ color: 'var(--ink-faint)' }}>
      <Icon size={40} strokeWidth={1.2} className="mb-3" style={{ opacity: 0.35 }} />
      <div className="text-[15px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{title}</div>
      <div className="text-[13px] max-w-xs">{desc}</div>
    </div>
  )
}
