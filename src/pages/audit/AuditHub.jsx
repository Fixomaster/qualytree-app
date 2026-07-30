// src/pages/audit/AuditHub.jsx
// ISO 13485:2016 §8.2.2 내부감사 허브
import React, { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Search, Plus, ChevronRight, CheckCircle2,
  Clock, AlertTriangle, Calendar, Users,
  FileText, BarChart2, ClipboardList, XCircle,
  ChevronDown, Download, Filter,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'

const STORAGE_KEY = 'qualytree.audits'
const CAR_KEY = 'qualytree.audit_cars'

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
  const [showCARForm, setShowCARForm] = useState(false)
  const [selectedAudit, setSelectedAudit] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [, forceRefresh] = useState(0)

  const reload = () => {
    setAudits(loadAudits())
    setCARs(loadCARs())
  }

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

  return (
    <AppLayout user={user} title="내부감사" subtitle="ISO 13485 §8.2.2 · 내부감사 계획·실시·시정조치">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto">

        {/* 배너 */}
        <HubBanner
          title="내부감사"
          subtitle="ISO 13485 §8.2.2 · 내부감사 계획 · 실시 · 시정조치"
          icon={ClipboardList}
          color="#6366F1"
          quickActions={[
            { label: '감사 등록', icon: Plus, onClick: () => { setTab('audits'); setShowForm(true) }, primary: true },
            { label: 'CAR 발행', icon: AlertTriangle, onClick: () => { setTab('cars'); setShowCARForm(true) } },
          ]}
          workflow={['감사 계획수립', '감사팀 구성', '감사 실시', 'CAR 발행', '시정조치', '종결']}
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

        {/* 탭 */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: 'var(--bg-soft)', width: 'fit-content' }}>
          {[
            { key: 'audits', label: '감사 계획·실시', icon: Search },
            { key: 'cars', label: '시정조치 요청 (CAR)', icon: AlertTriangle },
            { key: 'checklist', label: '체크리스트', icon: ClipboardList },
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
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            showForm={showForm}
            setShowForm={setShowForm}
            selectedAudit={selectedAudit}
            setSelectedAudit={setSelectedAudit}
            highlightAuditId={highlightAuditId}
            onSave={(form) => {
              const updated = selectedAudit
                ? audits.map(a => a.id === selectedAudit.id ? { ...a, ...form, updatedAt: new Date().toISOString() } : a)
                : [...audits, {
                    ...form,
                    id: genId('AUD'),
                    status: AUDIT_STATUS.PLANNED,
                    createdAt: new Date().toISOString(),
                    createdBy: user?.name || 'Unknown',
                    findings: [],
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
          />
        )}

        {tab === 'cars' && (
          <CARsTab
            cars={cars}
            showCARForm={showCARForm}
            setShowCARForm={setShowCARForm}
            highlightCarId={highlightCarId}
            onSave={(form) => {
              const updated = [...cars, {
                ...form,
                id: genId('CAR'),
                status: CAR_STATUS.OPEN,
                createdAt: new Date().toISOString(),
                createdBy: user?.name || 'Unknown',
              }]
              saveCARs(updated)
              setCARs(updated)
              setShowCARForm(false)
            }}
            onStatusChange={(id, status) => {
              const updated = cars.map(c => c.id === id ? { ...c, status, updatedAt: new Date().toISOString() } : c)
              saveCARs(updated)
              setCARs(updated)
            }}
          />
        )}

        {tab === 'checklist' && <ChecklistTab />}
      </div>
    </AppLayout>
  )
}

/* ── 감사 목록 탭 ── */
function AuditsTab({ audits, filterStatus, setFilterStatus, showForm, setShowForm, selectedAudit, setSelectedAudit, highlightAuditId, onSave, onStatusChange }) {
  const [form, setForm] = useState({
    title: '', scope: '', auditDate: '', auditor: '', auditee: '',
    type: 'internal', standard: 'ISO 13485',
  })

  const startEdit = (audit) => {
    setSelectedAudit(audit)
    setForm({ title: audit.title, scope: audit.scope || '', auditDate: audit.auditDate || '', auditor: audit.auditor || '', auditee: audit.auditee || '', type: audit.type || 'internal', standard: audit.standard || 'ISO 13485' })
    setShowForm(true)
  }

  const resetForm = () => {
    setSelectedAudit(null)
    setForm({ title: '', scope: '', auditDate: '', auditor: '', auditee: '', type: 'internal', standard: 'ISO 13485' })
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
          onSubmit={() => onSave(form)}
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
              highlight={highlightAuditId === audit.id}
              onEdit={() => startEdit(audit)}
              onStatusChange={(status) => onStatusChange(audit.id, status)}
            />
          ))}
        </div>
      )}
    </>
  )
}

function AuditCard({ audit, highlight, onEdit, onStatusChange }) {
  const [open, setOpen] = useState(() => !!highlight)
  const cardRef = React.useRef(null)
  const statusColor = AUDIT_STATUS_COLOR[audit.status] || '#6B7280'

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
              <ActionBtn color="#F59E0B" onClick={() => onStatusChange(AUDIT_STATUS.IN_PROGRESS)}>감사 시작</ActionBtn>
            )}
            {audit.status === AUDIT_STATUS.IN_PROGRESS && (
              <ActionBtn color="#3B82F6" onClick={() => onStatusChange(AUDIT_STATUS.COMPLETED)}>감사 완료</ActionBtn>
            )}
            {audit.status === AUDIT_STATUS.COMPLETED && (
              <ActionBtn color="#10B981" onClick={() => onStatusChange(AUDIT_STATUS.CLOSED)}>감사 종결</ActionBtn>
            )}
            <ActionBtn color="#6B7280" onClick={onEdit}>수정</ActionBtn>
          </div>
          {audit.findings && audit.findings.length > 0 && (
            <div className="mt-3">
              <div className="text-[12px] font-semibold mb-2" style={{ color: 'var(--ink-soft)' }}>부적합 사항</div>
              {audit.findings.map((f, i) => (
                <div key={i} className="text-[12px] p-2 rounded-lg mb-1" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
                  {f}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AuditForm({ form, setForm, isEdit, onSubmit, onCancel }) {
  const f = (k) => ({ value: form[k], onChange: (e) => setForm(p => ({ ...p, [k]: e.target.value })) })
  return (
    <div className="mb-5 p-5 rounded-2xl" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>
        {isEdit ? '감사 수정' : '내부감사 등록'}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="감사명 *" required>
          <input {...f('title')} placeholder="예: 생산부 정기 내부감사 2026-Q3" className="qt-input" />
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
        <FormField label="감사일">
          <input type="date" {...f('auditDate')} className="qt-input" />
        </FormField>
        <FormField label="감사원">
          <input {...f('auditor')} placeholder="감사원 이름" className="qt-input" />
        </FormField>
        <FormField label="피감사 부서">
          <input {...f('auditee')} placeholder="예: 생산부" className="qt-input" />
        </FormField>
      </div>
      <div className="flex justify-end gap-3 mt-4">
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-[13px]" style={{ background: 'var(--bg)', color: 'var(--ink-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>취소</button>
        <button
          onClick={onSubmit}
          disabled={!form.title}
          className="px-5 py-2 rounded-xl text-[13px] font-semibold"
          style={{ background: form.title ? '#6366F1' : 'var(--bg-soft)', color: form.title ? '#fff' : 'var(--ink-faint)', border: 'none', cursor: form.title ? 'pointer' : 'not-allowed' }}
        >
          {isEdit ? '저장' : '등록'}
        </button>
      </div>
    </div>
  )
}

/* ── CAR 탭 ── */
function CARsTab({ cars, showCARForm, setShowCARForm, highlightCarId, onSave, onStatusChange }) {
  const [form, setForm] = useState({ auditId: '', finding: '', requirement: '', assignee: '', dueDate: '', severity: 'major' })
  const f = (k) => ({ value: form[k], onChange: (e) => setForm(p => ({ ...p, [k]: e.target.value })) })

  React.useEffect(() => {
    if (!highlightCarId) return
    const el = document.getElementById(`car-${highlightCarId}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlightCarId, cars])

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div className="text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>
          시정조치 요청 (CAR) — Corrective Action Request
        </div>
        <button
          onClick={() => setShowCARForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold"
          style={{ background: '#EF4444', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          <Plus size={15} /> CAR 발행
        </button>
      </div>

      {showCARForm && (
        <div className="mb-5 p-5 rounded-2xl" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
          <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>CAR 발행</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="관련 감사 ID">
              <input {...f('auditId')} placeholder="예: AUD-2026-12345" className="qt-input" />
            </FormField>
            <FormField label="부적합 심각도">
              <select {...f('severity')} className="qt-input">
                <option value="major">중요 부적합 (Major)</option>
                <option value="minor">경미한 부적합 (Minor)</option>
                <option value="observation">관찰 사항 (Observation)</option>
              </select>
            </FormField>
            <FormField label="부적합 내용 *" colSpan>
              <textarea {...f('finding')} rows={3} placeholder="부적합 사항을 구체적으로 기술하세요" className="qt-input" style={{ resize: 'vertical' }} />
            </FormField>
            <FormField label="관련 요건 (ISO 조항)">
              <input {...f('requirement')} placeholder="예: ISO 13485 §7.4.1" className="qt-input" />
            </FormField>
            <FormField label="담당자">
              <input {...f('assignee')} placeholder="조치 담당자" className="qt-input" />
            </FormField>
            <FormField label="완료 목표일">
              <input type="date" {...f('dueDate')} className="qt-input" />
            </FormField>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setShowCARForm(false)} className="px-4 py-2 rounded-xl text-[13px]" style={{ background: 'var(--bg)', color: 'var(--ink-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>취소</button>
            <button
              onClick={() => { if (form.finding) onSave(form) }}
              disabled={!form.finding}
              className="px-5 py-2 rounded-xl text-[13px] font-semibold"
              style={{ background: form.finding ? '#EF4444' : 'var(--bg-soft)', color: form.finding ? '#fff' : 'var(--ink-faint)', border: 'none', cursor: form.finding ? 'pointer' : 'not-allowed' }}
            >
              CAR 발행
            </button>
          </div>
        </div>
      )}

      {cars.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="발행된 CAR 없음" desc="감사에서 부적합 사항 발견 시 CAR을 발행하세요." />
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
                    {car.requirement && <div className="text-[12px] mt-1" style={{ color: 'var(--ink-faint)' }}>요건: {car.requirement}</div>}
                    <div className="flex gap-4 mt-2 text-[12px]" style={{ color: 'var(--ink-faint)' }}>
                      {car.assignee && <span>👤 {car.assignee}</span>}
                      {car.dueDate && <span>📅 목표: {car.dueDate}</span>}
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

/* ── 체크리스트 탭 ── */
function ChecklistTab() {
  const [checks, setChecks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('qualytree.audit_checklist') || '{}') } catch { return {} }
  })
  const toggle = (iso, val) => {
    const updated = { ...checks, [iso]: val }
    setChecks(updated)
    localStorage.setItem('qualytree.audit_checklist', JSON.stringify(updated))
  }
  const done = AUDIT_CHECKLIST.filter(c => checks[c.iso] === 'ok').length

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>ISO 13485 감사 체크리스트</div>
          <div className="text-[12px] mt-1" style={{ color: 'var(--ink-faint)' }}>
            적합: {done}/{AUDIT_CHECKLIST.length} 항목
          </div>
        </div>
        <div className="w-32 h-2 rounded-full" style={{ background: 'var(--bg-soft)' }}>
          <div className="h-2 rounded-full transition-all" style={{ width: `${(done / AUDIT_CHECKLIST.length) * 100}%`, background: '#10B981' }} />
        </div>
      </div>
      <div className="space-y-2">
        {AUDIT_CHECKLIST.map((c) => {
          const val = checks[c.iso] || 'pending'
          return (
            <div key={c.iso} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <span className="font-mono text-[11px] font-bold w-14 flex-shrink-0" style={{ color: 'var(--ink-faint)' }}>§{c.iso}</span>
              <span className="flex-1 text-[13px]" style={{ color: 'var(--ink)' }}>{c.item}</span>
              <div className="flex gap-2">
                {[
                  { val: 'ok', label: '적합', color: '#10B981' },
                  { val: 'nc', label: '부적합', color: '#EF4444' },
                  { val: 'na', label: 'N/A', color: '#6B7280' },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    onClick={() => toggle(c.iso, val === opt.val ? 'pending' : opt.val)}
                    className="text-[11px] px-2.5 py-1 rounded-lg font-medium transition"
                    style={{
                      background: val === opt.val ? opt.color : 'var(--bg-soft)',
                      color: val === opt.val ? '#fff' : 'var(--ink-faint)',
                      border: 'none', cursor: 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
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
