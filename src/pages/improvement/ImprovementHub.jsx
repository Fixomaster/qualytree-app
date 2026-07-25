// src/pages/improvement/ImprovementHub.jsx
// ISO 13485:2016 §8.5 개선활동 허브
import React, { useState, useMemo } from 'react'
import {
  TrendingUp, Plus, BarChart2, CheckCircle2,
  Clock, AlertTriangle, Target, Lightbulb,
  ChevronDown, Users, Calendar, ArrowUpRight,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'

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

const DEPT_KPIS = [
  { id: 'kpi1', dept: 'QUA', metric: '부적합 발생률', target: '월 ≤ 3건', unit: '건/월' },
  { id: 'kpi2', dept: 'MFG', metric: '불량률 (PPM)', target: '≤ 500 PPM', unit: 'PPM' },
  { id: 'kpi3', dept: 'SAL', metric: '고객 만족도', target: '≥ 90%', unit: '%' },
  { id: 'kpi4', dept: 'PUR', metric: '납기 준수율', target: '≥ 95%', unit: '%' },
  { id: 'kpi5', dept: 'EQP', metric: '설비 가동률', target: '≥ 90%', unit: '%' },
  { id: 'kpi6', dept: 'ALL', metric: '교육 이수율', target: '100%', unit: '%' },
  { id: 'kpi7', dept: 'QUA', metric: '시정조치 적기 완료율', target: '≥ 95%', unit: '%' },
  { id: 'kpi8', dept: 'AUD', metric: '내부감사 완료율', target: '100%', unit: '%' },
]

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function save(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) }
function genId() { return `IMP-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }

export default function ImprovementHub() {
  const user = auth.current()
  const [tab, setTab] = useState('list')
  const [items, setItems] = useState(() => load())
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')

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
            { label: 'KPI 목표', icon: BarChart2, onClick: () => setTab('kpi') },
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
            { key: 'kpi', label: 'KPI 목표', icon: BarChart2 },
            { key: 'trend', label: '트렌드', icon: ArrowUpRight },
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
                {['all', ...Object.keys(IMP_STATUS)].map((s) => (
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
                    onEdit={() => { setEditItem(item); setShowForm(true) }}
                    onStatusChange={(s) => handleStatusChange(item.id, s)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'kpi' && <KpiTab kpis={DEPT_KPIS} />}
        {tab === 'trend' && <TrendTab items={items} />}
      </div>
    </AppLayout>
  )
}

/* ── 개선 과제 카드 ── */
function ImprovementCard({ item, onEdit, onStatusChange }) {
  const [open, setOpen] = useState(false)
  const sc = IMP_STATUS_COLOR[item.status] || '#6B7280'
  const pc = IMP_PRIORITY_COLOR[item.priority] || '#6B7280'

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
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

/* ── KPI 탭 ── */
function KpiTab({ kpis }) {
  const [kpiData, setKpiData] = useState(() => {
    try { return JSON.parse(localStorage.getItem('qualytree.kpi_values') || '{}') } catch { return {} }
  })
  const updateKpi = (id, val) => {
    const updated = { ...kpiData, [id]: val }
    setKpiData(updated)
    localStorage.setItem('qualytree.kpi_values', JSON.stringify(updated))
  }

  return (
    <div>
      <div className="text-[14px] font-semibold mb-4" style={{ color: 'var(--ink)' }}>
        부서별 품질 목표 KPI
      </div>
      <div className="space-y-3">
        {kpis.map((kpi) => {
          const current = kpiData[kpi.id] || ''
          return (
            <div key={kpi.id} className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>
                      {kpi.dept}
                    </span>
                    <span className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>{kpi.metric}</span>
                  </div>
                  <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>목표: {kpi.target}</div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={current}
                    onChange={(e) => updateKpi(kpi.id, e.target.value)}
                    placeholder={`실적 (${kpi.unit})`}
                    className="qt-input text-right"
                    style={{ width: 120 }}
                  />
                  <span className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>{kpi.unit}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-4 p-3 rounded-xl text-[12px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>
        💡 KPI 실적 입력 후 경영검토 보고서에 자동 반영됩니다.
      </div>
    </div>
  )
}

/* ── 트렌드 탭 ── */
function TrendTab({ items }) {
  const byType = useMemo(() => {
    const counts = {}
    items.forEach(i => { counts[i.type] = (counts[i.type] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
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
    return <EmptyState icon={BarChart2} title="데이터 없음" desc="개선 과제를 등록하면 트렌드를 확인할 수 있습니다." />
  }

  return (
    <div className="space-y-6">
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
