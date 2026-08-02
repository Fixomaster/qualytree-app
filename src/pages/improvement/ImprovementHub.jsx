// src/pages/improvement/ImprovementHub.jsx
// ISO 13485:2016 §8.5 개선활동 허브
import React, { useState, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  TrendingUp, Plus, BarChart2, CheckCircle2,
  Clock, AlertTriangle, Target, Lightbulb,
  ChevronDown, Users, Calendar, ArrowUpRight, ShieldCheck,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'
import { capa, CAPA_STATUS_LABEL } from '../../lib/capaState'
import { permissions } from '../../lib/permissions'

const STORAGE_KEY = 'qualytree.improvements'

const IMP_STATUS = {
  IDEA:      'idea',
  APPROVED:  'approved',
  IN_PROG:   'in_progress',
  VERIFY:    'verify',
  DONE:      'done',
  CANCELLED: 'cancelled',
}

const IMP_STATUS_LABEL = {
  idea:      '아이디어',
  approved:  '승인됨',
  in_progress: '진행 중',
  verify:    '효과 검증',
  done:      '완료',
  cancelled: '취소',
}

const IMP_STATUS_COLOR = {
  idea:      '#6B7280',
  approved:  '#3B82F6',
  in_progress: '#F59E0B',
  verify:    '#8B5CF6',
  done:      '#10B981',
  cancelled: '#EF4444',
}

const IMP_TYPE = {
  process:   '프로세스 개선',
  quality:   '품질 개선',
  safety:    '안전 개선',
  cost:      '비용 절감',
  delivery:  '납기 개선',
  morale:    '업무 환경',
  preventive:'예방 조치',
}

const IMP_PRIORITY = { high: '높음', medium: '보통', low: '낮음' }
const IMP_PRIORITY_COLOR = { high: '#EF4444', medium: '#F59E0B', low: '#6B7280' }

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function save(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) }
function genId() { return `IMP-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }

export default function ImprovementHub() {
  const user = auth.current()
  const [searchParams] = useSearchParams()
  const highlightId = searchParams.get('id')
  const [tab, setTab] = useState(() => (searchParams.get('capaId') ? 'capa' : (searchParams.get('tab') || 'list')))
  const [items, setItems] = useState(() => load())
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [selectedCapaId, setSelectedCapaId] = useState(() => searchParams.get('capaId') || null)
  const [capaRefresh, setCapaRefresh] = useState(0)
  const allCapas = useMemo(() => capa.loadAll(), [capaRefresh])

  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter(i => ['approved', 'in_progress'].includes(i.status)).length,
    done: items.filter(i => i.status === 'done').length,
    idea: items.filter(i => i.status === 'idea').length,
    highPriority: items.filter(i => i.priority === 'high' && i.status !== 'done' && i.status !== 'cancelled').length,
  }), [items])

  const filtered = useMemo(() => {
    let arr = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    if (filterStatus !== 'all') arr = arr.filter(i => i.status === filterStatus)
    if (filterType !== 'all') arr = arr.filter(i => i.type === filterType)
    return arr
  }, [items, filterStatus, filterType])

  const handleSave = (form) => {
    const updated = editItem
      ? items.map(i => i.id === editItem.id ? { ...i, ...form, updatedAt: new Date().toISOString() } : i)
      : [...items, {
          ...form,
          id: genId(),
          status: IMP_STATUS.IDEA,
          createdAt: new Date().toISOString(),
          createdBy: user?.name || 'Unknown',
        }]
    save(updated)
    setItems(updated)
    setShowForm(false)
    setEditItem(null)
  }

  const handleStatusChange = (id, status) => {
    const updated = items.map(i => i.id === id
      ? { ...i, status, updatedAt: new Date().toISOString(), ...(status === 'done' ? { completedAt: new Date().toISOString() } : {}) }
      : i)
    save(updated)
    setItems(updated)
  }

  return (
    <AppLayout user={user} title="개선활동" subtitle="ISO 13485 §8.5 · 개선 과제 관리 · KPI 추적">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto">

        {/* 배너 */}
        <HubBanner
          title="개선활동"
          subtitle="ISO 13485 §8.5 · 개선 과제 관리 · KPI 추적 · 트렌드 분석"
          icon={TrendingUp}
          color="#10B981"
          quickActions={[
            { label: '과제 등록', icon: Plus, onClick: () => { setEditItem(null); setShowForm(true) }, primary: true },
          ]}
          workflow={['아이디어 제안', '과제 승인', '실행 계획', '개선 실시', '효과 검증', '완료 공유']}
        />

        {/* KPI 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: '전체 과제', value: stats.total, icon: Target, color: '#6366F1' },
            { label: '진행 중', value: stats.active, icon: Clock, color: '#F59E0B' },
            { label: '완료', value: stats.done, icon: CheckCircle2, color: '#10B981' },
            { label: '긴급 과제', value: stats.highPriority, icon: AlertTriangle, color: '#EF4444', urgent: stats.highPriority > 0 },
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
            { key: 'list', label: '개선 과제', icon: TrendingUp },
            { key: 'capa', label: 'CAPA (NCR연계)', icon: ShieldCheck },
            { key: 'trend', label: '현황분석', icon: ArrowUpRight },
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
              <Icon size={14} />{label}
            </button>
          ))}
        </div>

        {/* 과제 목록 탭 */}
        {tab === 'list' && (
          <>
            <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
              <div className="flex flex-wrap gap-2">
                {['all', ...Object.values(IMP_STATUS)].map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition"
                    style={{
                      background: filterStatus === s ? '#10B981' : 'var(--bg-soft)',
                      color: filterStatus === s ? '#fff' : 'var(--ink-soft)',
                      border: 'none', cursor: 'pointer',
                    }}
                  >
                    {s === 'all' ? '전체' : IMP_STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setEditItem(null); setShowForm(true) }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold"
                style={{ background: '#10B981', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                <Plus size={15} /> 과제 등록
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mb-5">
              <button
                onClick={() => setFilterType('all')}
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium"
                style={{ background: filterType === 'all' ? '#10B981' : 'var(--bg-soft)', color: filterType === 'all' ? '#fff' : 'var(--ink-faint)', border: 'none', cursor: 'pointer' }}
              >
                전체 유형
              </button>
              {Object.entries(IMP_TYPE).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setFilterType(k)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium"
                  style={{ background: filterType === k ? '#10B981' : 'var(--bg-soft)', color: filterType === k ? '#fff' : 'var(--ink-faint)', border: 'none', cursor: 'pointer' }}
                >
                  {v}
                </button>
              ))}
            </div>

            {showForm && (
              <ImprovementForm
                initial={editItem}
                onSave={handleSave}
                onCancel={() => { setShowForm(false); setEditItem(null) }}
              />
            )}

            {filtered.length === 0 ? (
              <EmptyState
                icon={Lightbulb}
                title="등록된 개선 과제 없음"
                desc="프로세스 개선, 비용 절감, 품질 향상 등 개선 아이디어를 등록하세요."
              />
            ) : (
              <div className="space-y-3">
                {filtered.map((item) => (
                  <ImprovementCard
                    key={item.id}
                    item={item}
                    highlight={highlightId === item.id}
                    onEdit={() => { setEditItem(item); setShowForm(true) }}
                    onStatusChange={(s) => handleStatusChange(item.id, s)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'capa' && (
          <CapaList
            capas={allCapas}
            selectedId={selectedCapaId}
            onSelect={setSelectedCapaId}
            onChanged={() => setCapaRefresh((t) => t + 1)}
          />
        )}
        {tab === 'trend' && <TrendTab items={items} />}
      </div>
    </AppLayout>
  )
}

/* ── 개선 과제 카드 ── */
function ImprovementCard({ item, highlight, onEdit, onStatusChange }) {
  const [open, setOpen] = useState(() => !!highlight)
  const cardRef = React.useRef(null)
  const sc = IMP_STATUS_COLOR[item.status] || '#6B7280'
  const pc = IMP_PRIORITY_COLOR[item.priority] || '#6B7280'

  React.useEffect(() => {
    if (highlight && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlight])

  return (
    <div ref={cardRef} className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: highlight ? '2px solid var(--moss)' : '1px solid var(--line)', boxShadow: highlight ? '0 0 0 3px var(--leaf-soft)' : 'none' }}>
      <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: pc }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[11px] font-bold" style={{ color: 'var(--ink-faint)' }}>{item.id}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: `${pc}20`, color: pc }}>
                {IMP_PRIORITY[item.priority] || '보통'}
              </span>
              {item.type && (
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>
                  {IMP_TYPE[item.type] || item.type}
                </span>
              )}
            </div>
            <div className="text-[14px] font-semibold mt-0.5 truncate" style={{ color: 'var(--ink)' }}>{item.title}</div>
            <div className="flex gap-3 mt-1 text-[12px]" style={{ color: 'var(--ink-faint)' }}>
              {item.assignee && <span>👤 {item.assignee}</span>}
              {item.dueDate && <span>📅 {item.dueDate}</span>}
              {item.dept && <span>🏢 {item.dept}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: `${sc}20`, color: sc }}>
            {IMP_STATUS_LABEL[item.status]}
          </span>
          <ChevronDown size={15} style={{ color: 'var(--ink-faint)', transform: open ? 'rotate(180deg)' : 'none', transition: '0.15s' }} />
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: 'var(--line)' }}>
          {item.description && (
            <div className="pt-4 text-[13px] leading-relaxed" style={{ color: 'var(--ink-soft)' }}>{item.description}</div>
          )}
          <div className="pt-3 flex flex-wrap gap-2">
            {item.status === 'idea' && <ActionBtn color="#3B82F6" onClick={() => onStatusChange('approved')}>승인</ActionBtn>}
            {item.status === 'approved' && <ActionBtn color="#F59E0B" onClick={() => onStatusChange('in_progress')}>시작</ActionBtn>}
            {item.status === 'in_progress' && <ActionBtn color="#8B5CF6" onClick={() => onStatusChange('verify')}>효과 검증</ActionBtn>}
            {item.status === 'verify' && <ActionBtn color="#10B981" onClick={() => onStatusChange('done')}>완료 처리</ActionBtn>}
            {!['done', 'cancelled'].includes(item.status) && (
              <ActionBtn color="#EF4444" onClick={() => onStatusChange('cancelled')}>취소</ActionBtn>
            )}
            <ActionBtn color="#6B7280" onClick={onEdit}>수정</ActionBtn>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── 개선 과제 폼 ── */
function ImprovementForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: initial?.title || '',
    description: initial?.description || '',
    type: initial?.type || 'process',
    priority: initial?.priority || 'medium',
    dept: initial?.dept || '',
    assignee: initial?.assignee || '',
    dueDate: initial?.dueDate || '',
    expectedEffect: initial?.expectedEffect || '',
  })
  const f = (k) => ({ value: form[k], onChange: (e) => setForm(p => ({ ...p, [k]: e.target.value })) })

  return (
    <div className="mb-5 p-5 rounded-2xl" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>
        {initial ? '과제 수정' : '개선 과제 등록'}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="과제명 *" colSpan>
          <input {...f('title')} placeholder="개선 과제명을 입력하세요" className="qt-input" />
        </FormField>
        <FormField label="개선 유형">
          <select {...f('type')} className="qt-input">
            {Object.entries(IMP_TYPE).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </FormField>
        <FormField label="우선순위">
          <select {...f('priority')} className="qt-input">
            {Object.entries(IMP_PRIORITY).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </FormField>
        <FormField label="관련 부서">
          <input {...f('dept')} placeholder="예: 생산부" className="qt-input" />
        </FormField>
        <FormField label="담당자">
          <input {...f('assignee')} placeholder="과제 담당자" className="qt-input" />
        </FormField>
        <FormField label="완료 목표일">
          <input type="date" {...f('dueDate')} className="qt-input" />
        </FormField>
        <FormField label="과제 내용" colSpan>
          <textarea {...f('description')} rows={3} placeholder="현황, 문제점, 개선 방향을 기술하세요" className="qt-input" style={{ resize: 'vertical' }} />
        </FormField>
        <FormField label="기대 효과" colSpan>
          <input {...f('expectedEffect')} placeholder="예: 불량률 20% 감소, 납기 단축 3일" className="qt-input" />
        </FormField>
      </div>
      <div className="flex justify-end gap-3 mt-4">
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-[13px]" style={{ background: 'var(--bg)', color: 'var(--ink-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>취소</button>
        <button
          onClick={() => { if (form.title) onSave(form) }}
          disabled={!form.title}
          className="px-5 py-2 rounded-xl text-[13px] font-semibold"
          style={{ background: form.title ? '#10B981' : 'var(--bg-soft)', color: form.title ? '#fff' : 'var(--ink-faint)', border: 'none', cursor: form.title ? 'pointer' : 'not-allowed' }}
        >
          {initial ? '저장' : '등록'}
        </button>
      </div>
    </div>
  )
}

/* ── 현황분석 탭 ── */
function TrendTab({ items }) {
  const byType = useMemo(() => {
    const counts = {}
    items.forEach(i => { counts[i.type] = (counts[i.type] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [items])

  const byStatus = useMemo(() => {
    const counts = {}
    items.forEach(i => { counts[i.status] = (counts[i.status] || 0) + 1 })
    return Object.keys(IMP_STATUS_LABEL).map(s => [s, counts[s] || 0]).filter(([, c]) => c > 0)
  }, [items])

  const byMonth = useMemo(() => {
    const counts = {}
    items.forEach(i => {
      const month = i.createdAt?.slice(0, 7) || '알 수 없음'
      counts[month] = (counts[month] || 0) + 1
    })
    return Object.entries(counts).sort()
  }, [items])

  const completed = items.filter(i => i.status === 'done')
  const completionRate = items.length > 0 ? Math.round((completed.length / items.length) * 100) : 0

  if (items.length === 0) {
    return <EmptyState icon={BarChart2} title="데이터 없음" desc="개선 과제를 등록하면 현황을 확인할 수 있습니다." />
  }

  return (
    <div className="space-y-6">
      <div className="p-3.5 rounded-xl text-[11.5px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>
        부서별 품질목표 KPI 설정·실적 추적은 <Link to="/quality-objectives" className="underline" style={{ color: 'var(--moss, #10B981)' }}>품질목표</Link> 메뉴(경영·전략)에서 관리하세요.
      </div>
      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>전체 완료율</div>
          <div className="text-[24px] font-bold" style={{ color: '#10B981' }}>{completionRate}%</div>
        </div>
        <div className="h-3 rounded-full" style={{ background: 'var(--bg-soft)' }}>
          <div className="h-3 rounded-full transition-all" style={{ width: `${completionRate}%`, background: '#10B981' }} />
        </div>
        <div className="flex justify-between mt-2 text-[12px]" style={{ color: 'var(--ink-faint)' }}>
          <span>완료: {completed.length}건</span>
          <span>전체: {items.length}건</span>
        </div>
      </div>

      {byStatus.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[14px] font-semibold mb-4" style={{ color: 'var(--ink)' }}>상태별 현황</div>
          <div className="flex flex-wrap gap-2">
            {byStatus.map(([status, count]) => (
              <span
                key={status}
                className="text-[12px] px-3 py-1.5 rounded-lg font-medium"
                style={{ background: `${IMP_STATUS_COLOR[status] || '#6B7280'}18`, color: IMP_STATUS_COLOR[status] || '#6B7280' }}
              >
                {IMP_STATUS_LABEL[status] || status} {count}건
              </span>
            ))}
          </div>
        </div>
      )}

      {byType.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[14px] font-semibold mb-4" style={{ color: 'var(--ink)' }}>유형별 분포</div>
          <div className="space-y-3">
            {byType.map(([type, count]) => {
              const pct = Math.round((count / items.length) * 100)
              return (
                <div key={type}>
                  <div className="flex justify-between text-[12px] mb-1">
                    <span style={{ color: 'var(--ink-soft)' }}>{IMP_TYPE[type] || type}</span>
                    <span style={{ color: 'var(--ink-faint)' }}>{count}건 ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: 'var(--bg-soft)' }}>
                    <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: '#10B981' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {byMonth.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[14px] font-semibold mb-4" style={{ color: 'var(--ink)' }}>월별 등록 추이</div>
          <div className="space-y-2">
            {byMonth.slice(-6).map(([month, count]) => {
              const max = Math.max(...byMonth.map(([, c]) => c))
              return (
                <div key={month} className="flex items-center gap-3">
                  <span className="text-[12px] w-20 flex-shrink-0" style={{ color: 'var(--ink-faint)' }}>{month}</span>
                  <div className="flex-1 h-6 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
                    <div className="h-6 rounded-lg flex items-center pl-2" style={{ width: `${(count / max) * 100}%`, background: '#10B98120' }}>
                      <span className="text-[11px] font-medium" style={{ color: '#10B981' }}>{count}건</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── 공통 컴포넌트 ── */
function ActionBtn({ color, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-[12px] font-medium"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30`, cursor: 'pointer' }}
    >
      {children}
    </button>
  )
}

function FormField({ label, children, colSpan }) {
  return (
    <div className={colSpan ? 'md:col-span-2' : ''}>
      <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      {children}
    </div>
  )
}

function EmptyState({ icon: Icon, title, desc }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon size={40} strokeWidth={1.2} className="mb-3" style={{ color: 'var(--ink-faint)', opacity: 0.35 }} />
      <div className="text-[15px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{title}</div>
      <div className="text-[13px] max-w-xs" style={{ color: 'var(--ink-faint)' }}>{desc}</div>
    </div>
  )
}


/* ================================================================
   CAPA (NCR 연계) — QualityHub에서 이관 (ISO 13485 §8.5.2/§8.5.3)
   ================================================================ */
function CapaList({ capas, selectedId, onSelect, onChanged }) {
  const selected = selectedId ? capas.find((c) => c.id === selectedId) : null

  if (capas.length === 0) {
    return (
      <div
        className="card-base p-10 text-center text-[13px]"
        style={{ color: 'var(--ink-mute)', borderStyle: 'dashed' }}
      >
        <ShieldCheck
          size={28}
          style={{ color: 'var(--ink-faint)', margin: '0 auto' }}
          strokeWidth={1.4}
        />
        <div className="mt-3">발의된 CAPA가 없습니다.</div>
        <div className="mt-1 text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>
          Critical NCR 발의 시 또는 같은 항목 Major NCR 3건 누적 시 자동 후보로 등록됩니다.
        </div>
      </div>
    )
  }

  return (
    <div className="grid lg:grid-cols-12 gap-4">
      <div className="lg:col-span-5">
        <div className="card-base p-3">
          <div className="font-mono text-[10px] tracking-[0.16em] uppercase px-2 mb-2" style={{ color: 'var(--ink-mute)' }}>
            CAPA · {capas.length}건
          </div>
          <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
            {capas.map((c) => {
              const status = CAPA_STATUS_LABEL[c.status]
              const sel = c.id === selectedId
              return (
                <button
                  key={c.id}
                  onClick={() => onSelect(c.id)}
                  className="w-full text-left p-3 rounded-lg border transition"
                  style={{ borderColor: sel ? 'var(--moss)' : 'var(--line)', background: sel ? 'var(--leaf-soft)' : 'var(--bg-card)' }}
                >
                  <div className="flex items-center justify-between flex-wrap gap-1.5">
                    <span className="font-mono text-[11px]" style={{ color: 'var(--moss)', fontWeight: 500 }}>{c.id}</span>
                    <span className="tag" style={{ background: `var(--${status.tone}-soft)`, color: `var(--${status.tone})` }}>{status.ko}</span>
                  </div>
                  <div className="text-[13px] mt-1" style={{ color: 'var(--ink)', fontWeight: 500 }}>{c.title}</div>
                  <div className="font-mono text-[10px] mt-1" style={{ color: 'var(--ink-faint)' }}>{new Date(c.raisedAt).toLocaleDateString('ko-KR')} · {c.raisedBy}</div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
      <div className="lg:col-span-7">
        {selected ? (
          <CapaDetail capaRecord={selected} onChanged={onChanged} />
        ) : (
          <div className="card-base p-10 text-center text-[13px]" style={{ color: 'var(--ink-mute)', borderStyle: 'dashed' }}>
            좌측에서 CAPA를 선택하세요
          </div>
        )}
      </div>
    </div>
  )
}

/* ================================================================
   CAPA 상세 — 근본원인분석 → 시정조치 → 예방조치 → 효과성검증 → 승인·종결
   ================================================================ */
const CAPA_STAGE_ORDER = ['open', 'rca', 'corrective', 'preventive', 'verification', 'closed']

function CapaDetail({ capaRecord, onChanged }) {
  const canEdit = permissions.can('qms.capa.edit')
  const canApprove = permissions.can('qms.capa.approve')
  const stageIdx = CAPA_STAGE_ORDER.indexOf(capaRecord.status)

  const [rca, setRca] = useState(capaRecord.rootCause || { method: '', cause: '', evidence: '' })
  const [corrective, setCorrective] = useState(capaRecord.correctiveAction || { action: '', owner: '', dueDate: '', completedDate: '' })
  const [preventive, setPreventive] = useState(capaRecord.preventiveAction || { action: '', owner: '', dueDate: '' })
  const [verification, setVerification] = useState(capaRecord.verification || { method: '', result: '효과있음', verifiedBy: '', verifiedDate: '' })

  const saveStage = (stageKey, data, nextStatus) => {
    if (!canEdit) { alert('CAPA 기록은 검사관(Level 2) 이상 권한이 필요합니다.'); return }
    capa.updateStage(capaRecord.id, { [stageKey]: data }, nextStatus)
    onChanged()
  }

  const closeCapa = () => {
    if (!canApprove) { alert('CAPA 승인·종결은 매니저(Level 3) 권한이 필요합니다.'); return }
    const reason = prompt('종결 승인 사유 (효과성검증 결과 기준):', '효과성 검증 완료 — 종결 승인')
    if (reason == null) return
    capa.updateStage(capaRecord.id, {}, 'closed', { reason: reason.trim() || '종결' })
    onChanged()
  }

  const status = CAPA_STATUS_LABEL[capaRecord.status]

  return (
    <div className="card-base p-5 fade-in space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--moss)' }}>{capaRecord.id}</span>
          <div className="font-display text-[20px] mt-1 leading-tight" style={{ color: 'var(--ink)', fontWeight: 500 }}>{capaRecord.title}</div>
        </div>
        <span className="tag" style={{ background: `var(--${status.tone}-soft)`, color: `var(--${status.tone})` }}>{status.ko}</span>
      </div>
      <div className="text-[12.5px]" style={{ color: 'var(--ink-mute)' }}>{capaRecord.description || capaRecord.triggerReason}</div>

      {/* 근본원인분석 */}
      <CapaStageCard title="① 근본원인분석 (RCA)" citation="ISO 13485 §8.5.2" active={stageIdx <= 1} done={stageIdx > 1} locked={stageIdx < 0}>
        <SelectFieldQ label="분석 기법" value={rca.method} onChange={(v) => setRca((r) => ({ ...r, method: v }))} options={['', '5-Why', '피쉬본(어골도)', 'FMEA', '기타']} disabled={!canEdit || stageIdx > 1} />
        <TextAreaFieldQ label="근본원인" value={rca.cause} onChange={(v) => setRca((r) => ({ ...r, cause: v }))} disabled={!canEdit || stageIdx > 1} />
        <TextAreaFieldQ label="근거·증거" value={rca.evidence} onChange={(v) => setRca((r) => ({ ...r, evidence: v }))} disabled={!canEdit || stageIdx > 1} />
        {canEdit && stageIdx <= 1 && (
          <div className="flex justify-end"><button onClick={() => saveStage('rootCause', rca, 'rca')} className="btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: 12.5 }}>저장 · 다음 단계로</button></div>
        )}
      </CapaStageCard>

      {/* 시정조치 */}
      <CapaStageCard title="② 시정조치" citation="ISO 13485 §8.5.2" active={stageIdx >= 1 && stageIdx <= 2} done={stageIdx > 2} locked={stageIdx < 1}>
        <TextAreaFieldQ label="시정조치 내용" value={corrective.action} onChange={(v) => setCorrective((c) => ({ ...c, action: v }))} disabled={!canEdit || stageIdx > 2} />
        <div className="grid sm:grid-cols-3 gap-2">
          <FieldQ label="담당자" value={corrective.owner} onChange={(v) => setCorrective((c) => ({ ...c, owner: v }))} disabled={!canEdit || stageIdx > 2} />
          <FieldQ label="완료 기한" type="date" value={corrective.dueDate} onChange={(v) => setCorrective((c) => ({ ...c, dueDate: v }))} disabled={!canEdit || stageIdx > 2} />
          <FieldQ label="완료일" type="date" value={corrective.completedDate} onChange={(v) => setCorrective((c) => ({ ...c, completedDate: v }))} disabled={!canEdit || stageIdx > 2} />
        </div>
        {canEdit && stageIdx >= 1 && stageIdx <= 2 && (
          <div className="flex justify-end"><button onClick={() => saveStage('correctiveAction', corrective, 'corrective')} className="btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: 12.5 }}>저장 · 다음 단계로</button></div>
        )}
      </CapaStageCard>

      {/* 예방조치 */}
      <CapaStageCard title="③ 예방조치" citation="ISO 13485 §8.5.3" active={stageIdx >= 2 && stageIdx <= 3} done={stageIdx > 3} locked={stageIdx < 2}>
        <TextAreaFieldQ label="예방조치 내용" value={preventive.action} onChange={(v) => setPreventive((p) => ({ ...p, action: v }))} disabled={!canEdit || stageIdx > 3} />
        <div className="grid sm:grid-cols-2 gap-2">
          <FieldQ label="담당자" value={preventive.owner} onChange={(v) => setPreventive((p) => ({ ...p, owner: v }))} disabled={!canEdit || stageIdx > 3} />
          <FieldQ label="완료 기한" type="date" value={preventive.dueDate} onChange={(v) => setPreventive((p) => ({ ...p, dueDate: v }))} disabled={!canEdit || stageIdx > 3} />
        </div>
        {canEdit && stageIdx >= 2 && stageIdx <= 3 && (
          <div className="flex justify-end"><button onClick={() => saveStage('preventiveAction', preventive, 'preventive')} className="btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: 12.5 }}>저장 · 다음 단계로</button></div>
        )}
      </CapaStageCard>

      {/* 효과성검증 */}
      <CapaStageCard title="④ 효과성검증" citation="ISO 13485 §8.5.2(f)" active={stageIdx >= 3 && stageIdx <= 4} done={stageIdx > 4} locked={stageIdx < 3}>
        <TextAreaFieldQ label="검증 방법" value={verification.method} onChange={(v) => setVerification((x) => ({ ...x, method: v }))} disabled={!canEdit || stageIdx > 4} />
        <div className="grid sm:grid-cols-3 gap-2">
          <SelectFieldQ label="검증 결과" value={verification.result} onChange={(v) => setVerification((x) => ({ ...x, result: v }))} options={['효과있음', '불충분 · 재조치 필요']} disabled={!canEdit || stageIdx > 4} />
          <FieldQ label="검증자" value={verification.verifiedBy} onChange={(v) => setVerification((x) => ({ ...x, verifiedBy: v }))} disabled={!canEdit || stageIdx > 4} />
          <FieldQ label="검증일" type="date" value={verification.verifiedDate} onChange={(v) => setVerification((x) => ({ ...x, verifiedDate: v }))} disabled={!canEdit || stageIdx > 4} />
        </div>
        {canEdit && stageIdx >= 3 && stageIdx <= 4 && (
          <div className="flex justify-end"><button onClick={() => saveStage('verification', verification, 'verification')} className="btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: 12.5 }}>저장 · 승인 대기로</button></div>
        )}
      </CapaStageCard>

      {/* 승인·종결 */}
      <CapaStageCard title="⑤ 승인 · 종결" citation="ISO 13485 §8.5.2 (매니저 승인)" active={stageIdx === 4} done={stageIdx === 5} locked={stageIdx < 4}>
        {stageIdx === 5 ? (
          <div className="text-[12.5px]" style={{ color: 'var(--moss)' }}>
            <CheckCircle2 size={14} className="inline mr-1" />
            {capaRecord.closure?.by} 승인 · {capaRecord.closure?.closedAt ? new Date(capaRecord.closure.closedAt).toLocaleString('ko-KR') : ''} — {capaRecord.closure?.reason}
          </div>
        ) : stageIdx === 4 ? (
          canApprove ? (
            <div className="flex justify-end"><button onClick={closeCapa} className="btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: 12.5 }}><CheckCircle2 size={13} /> 승인 및 종결</button></div>
          ) : (
            <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>효과성검증까지 완료되었습니다. 매니저(Level 3) 승인을 기다리는 중입니다.</div>
          )
        ) : (
          <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>이전 단계를 먼저 완료하세요.</div>
        )}
      </CapaStageCard>
    </div>
  )
}

function CapaStageCard({ title, citation, active, done, locked, children }) {
  return (
    <div className="rounded-lg p-3.5" style={{ background: locked ? 'var(--bg-soft)' : active ? 'var(--leaf-soft)' : 'var(--bg-card)', border: '1px solid var(--line)', opacity: locked ? 0.55 : 1 }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[12.5px] font-semibold" style={{ color: 'var(--ink)' }}>{title}</div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9.5px]" style={{ color: 'var(--ink-faint)' }}>{citation}</span>
          {done && <CheckCircle2 size={14} style={{ color: 'var(--moss)' }} />}
        </div>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function FieldQ({ label, value, onChange, placeholder, type = 'text', disabled }) {
  return (
    <label className="block">
      <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>{label}</span>
      <input type={type} className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13 }} value={value} placeholder={placeholder} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}
function SelectFieldQ({ label, value, onChange, options, disabled }) {
  return (
    <label className="block">
      <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>{label}</span>
      <select className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13 }} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{o || '(선택)'}</option>)}
      </select>
    </label>
  )
}
function TextAreaFieldQ({ label, value, onChange, disabled }) {
  return (
    <label className="block">
      <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>{label}</span>
      <textarea className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13, minHeight: 60 }} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}
