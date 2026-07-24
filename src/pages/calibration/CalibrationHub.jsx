// src/pages/calibration/CalibrationHub.jsx
// ISO 13485 §7.6 측정장치 교정 관리 허브
import React, { useState, useMemo } from 'react'
import {
  Plus, Search, Edit3, Trash2, AlertTriangle,
  CheckCircle2, Clock, ChevronDown, ChevronUp,
  X, Wrench, BarChart2, List, Calendar,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'

// ── localStorage ──────────────────────────────────────────────
const LS_KEY = 'qualytree.calibrations'

function lsRead() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}
function lsWrite(data) { localStorage.setItem(LS_KEY, JSON.stringify(data)) }

function genId() {
  const y = new Date().getFullYear()
  return `CAL-${y}-${String(Date.now()).slice(-5)}`
}

// ── 날짜 유틸 ────────────────────────────────────────────────
function addMonths(dateStr, months) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = new Date(dateStr) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function urgencyInfo(nextDate) {
  const days = daysUntil(nextDate)
  if (days === null) return { color: '#6B7280', bg: '#F3F4F6', label: '미설정', level: 0 }
  if (days < 0)   return { color: '#DC2626', bg: '#FEE2E2', label: `${Math.abs(days)}일 초과`, level: 3 }
  if (days <= 30) return { color: '#D97706', bg: '#FEF3C7', label: `D-${days}`, level: 2 }
  if (days <= 90) return { color: '#2563EB', bg: '#DBEAFE', label: `D-${days}`, level: 1 }
  return { color: '#059669', bg: '#D1FAE5', label: `D-${days}`, level: 0 }
}

// ── 상수 ─────────────────────────────────────────────────────
const INTERVALS = [
  { value: 3,  label: '3개월' },
  { value: 6,  label: '6개월' },
  { value: 12, label: '12개월 (연 1회)' },
  { value: 24, label: '24개월 (2년마다)' },
  { value: 36, label: '36개월 (3년마다)' },
]

const CATEGORIES = [
  '길이·치수', '무게·힘', '압력·진공', '온도·습도',
  '전기·전자', '유량·속도', '광학·색채', '시간·주파수', '기타',
]

const LOCATIONS = ['생산라인 A', '생산라인 B', '품질검사실', '연구소', '창고', '사무실', '외부 (고객사)']

const STATUS_OPTIONS = [
  { value: 'active',    label: '사용 중',    color: '#059669', bg: '#D1FAE5' },
  { value: 'expired',   label: '교정 만료',  color: '#DC2626', bg: '#FEE2E2' },
  { value: 'calibrating', label: '교정 진행 중', color: '#D97706', bg: '#FEF3C7' },
  { value: 'retired',   label: '폐기',       color: '#6B7280', bg: '#F3F4F6' },
]

const emptyForm = () => ({
  assetId: '', name: '', model: '', manufacturer: '', serial: '',
  category: '', location: '', interval: 12,
  lastCalDate: '', nextCalDate: '',
  calBody: '', calCertNo: '', calResult: 'pass',
  status: 'active', notes: '',
  createdBy: '', createdAt: '',
})

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function CalibrationHub() {
  const user = auth.current()
  const [items, setItems] = useState(() => lsRead())
  const [tab, setTab] = useState('list')
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [urgFilter, setUrgFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [editId, setEditId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  const save = (data) => { setItems(data); lsWrite(data) }

  const openNew = () => {
    setForm(emptyForm())
    setEditId(null)
    setShowForm(true)
  }

  const openEdit = (item) => {
    setForm({ ...item })
    setEditId(item.id)
    setShowForm(true)
  }

  const submit = () => {
    if (!form.name) return alert('장비명은 필수입니다.')
    const now = new Date().toISOString()
    if (editId) {
      save(items.map(i => i.id === editId ? { ...form, id: editId } : i))
    } else {
      save([{ ...form, id: genId(), createdAt: now, createdBy: user?.name || '-' }, ...items])
    }
    setShowForm(false)
    setEditId(null)
  }

  const remove = (id) => {
    if (!confirm('삭제하시겠습니까?')) return
    save(items.filter(i => i.id !== id))
  }

  const fld = (k, v) => setForm(f => {
    const next = { ...f, [k]: v }
    // 최종 교정일 변경 시 다음 교정일 자동 계산
    if (k === 'lastCalDate' || k === 'interval') {
      next.nextCalDate = addMonths(
        k === 'lastCalDate' ? v : f.lastCalDate,
        k === 'interval' ? v : f.interval
      )
    }
    return next
  })

  // 필터링 + 정렬
  const filtered = useMemo(() => {
    let list = [...items]
    if (catFilter !== 'all') list = list.filter(i => i.category === catFilter)
    if (urgFilter === 'overdue') list = list.filter(i => daysUntil(i.nextCalDate) < 0)
    if (urgFilter === 'soon')    list = list.filter(i => { const d = daysUntil(i.nextCalDate); return d !== null && d >= 0 && d <= 30 })
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(i => (i.id + i.name + i.model + i.assetId + i.serial).toLowerCase().includes(q))
    }
    // 긴급도 순 정렬
    return list.sort((a, b) => {
      const da = daysUntil(a.nextCalDate) ?? 9999
      const db = daysUntil(b.nextCalDate) ?? 9999
      return da - db
    })
  }, [items, search, catFilter, urgFilter])

  const stats = useMemo(() => ({
    total:      items.length,
    overdue:    items.filter(i => daysUntil(i.nextCalDate) < 0).length,
    soon:       items.filter(i => { const d = daysUntil(i.nextCalDate); return d !== null && d >= 0 && d <= 30 }).length,
    ok:         items.filter(i => { const d = daysUntil(i.nextCalDate); return d !== null && d > 30 }).length,
    retired:    items.filter(i => i.status === 'retired').length,
  }), [items])

  const TABS = [
    { key: 'list',     label: '장비 목록',      icon: List },
    { key: 'schedule', label: '교정 일정',       icon: Calendar },
    { key: 'stats',    label: '현황 분석',       icon: BarChart2 },
  ]

  return (
    <AppLayout user={user} title="교정 관리" subtitle="ISO 13485 §7.6 · 측정장치 교정 주기 관리 · 교정 기록">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto">

        {/* KPI 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: '총 측정장치', count: stats.total,   color: '#6B7280' },
            { label: '교정 만료',   count: stats.overdue, color: '#DC2626' },
            { label: '30일 이내',   count: stats.soon,    color: '#D97706' },
            { label: '교정 양호',   count: stats.ok,      color: '#059669' },
            { label: '폐기',        count: stats.retired, color: '#9CA3AF' },
          ].map(s => (
            <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="text-[22px] font-bold" style={{ color: s.color }}>{s.count}</div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* 만료 긴급 알림 */}
        {stats.overdue > 0 && (
          <div className="flex items-center gap-3 p-4 rounded-2xl mb-5" style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}>
            <AlertTriangle size={18} style={{ color: '#DC2626', flexShrink: 0 }} />
            <div className="text-[13px] font-semibold" style={{ color: '#7F1D1D' }}>
              교정 만료 장비 {stats.overdue}건 — 즉시 교정 필요!
            </div>
          </div>
        )}

        {/* 탭 */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: 'var(--bg-soft)', width: 'fit-content' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition"
              style={{
                background: tab === t.key ? 'var(--bg-card)' : 'transparent',
                color: tab === t.key ? 'var(--ink)' : 'var(--ink-faint)',
                border: 'none', cursor: 'pointer',
                boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {/* ── 장비 목록 탭 ── */}
        {tab === 'list' && (
          <>
            <div className="flex gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-[180px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                <Search size={14} style={{ color: 'var(--ink-faint)' }} />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="장비명 · 관리번호 · 시리얼 검색..."
                  className="flex-1 text-[13px] outline-none"
                  style={{ background: 'none', border: 'none', color: 'var(--ink)' }}
                />
              </div>
              <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="px-3 py-2 rounded-xl text-[13px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
                <option value="all">전체 유형</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={urgFilter} onChange={e => setUrgFilter(e.target.value)} className="px-3 py-2 rounded-xl text-[13px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
                <option value="all">전체 상태</option>
                <option value="overdue">만료된 것만</option>
                <option value="soon">30일 이내</option>
              </select>
              <button
                onClick={openNew}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold"
                style={{ background: '#6366F1', color: 'white', border: 'none', cursor: 'pointer' }}
              >
                <Plus size={14} /> 장비 등록
              </button>
            </div>

            {filtered.length === 0 ? (
              <EmptyState onAdd={openNew} />
            ) : (
              <div className="space-y-2">
                {filtered.filter(i => i.status !== 'retired').map(item => (
                  <CalItem
                    key={item.id}
                    item={item}
                    expanded={expandedId === item.id}
                    onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    onEdit={() => openEdit(item)}
                    onDelete={() => remove(item.id)}
                  />
                ))}
                {filtered.filter(i => i.status === 'retired').length > 0 && (
                  <div className="mt-4">
                    <div className="text-[11px] font-semibold mb-2 px-1" style={{ color: 'var(--ink-faint)' }}>폐기 장비</div>
                    {filtered.filter(i => i.status === 'retired').map(item => (
                      <CalItem key={item.id} item={item} expanded={expandedId === item.id} onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)} onEdit={() => openEdit(item)} onDelete={() => remove(item.id)} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── 교정 일정 탭 ── */}
        {tab === 'schedule' && <ScheduleView items={items} />}

        {/* ── 현황 분석 탭 ── */}
        {tab === 'stats' && <StatsView items={items} />}

        {/* ISO 안내 */}
        <div className="mt-6 p-4 rounded-2xl" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
          <div className="text-[12.5px] font-semibold mb-1.5" style={{ color: 'var(--ink-soft)' }}>
            📐 ISO 13485 §7.6 요건
          </div>
          <div className="text-[12px]" style={{ color: 'var(--ink-faint)', lineHeight: 1.7 }}>
            측정·모니터링 장치는 ① 교정 주기와 방법 수립 ② 추적 가능한 국가 표준에 따른 교정 ③ 교정 상태 식별 ④ 교정 기록 유지 ⑤ 교정 결과 부적합 시 이전 측정 결과 유효성 평가
          </div>
        </div>
      </div>

      {showForm && <CalForm form={form} fld={fld} editId={editId} onSubmit={submit} onClose={() => setShowForm(false)} />}
    </AppLayout>
  )
}

// ── 장비 행 ───────────────────────────────────────────────────
function CalItem({ item, expanded, onToggle, onEdit, onDelete }) {
  const urg = urgencyInfo(item.nextCalDate)
  const stInfo = STATUS_OPTIONS.find(s => s.value === item.status) || STATUS_OPTIONS[0]

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={onToggle} style={{ borderBottom: expanded ? '1px solid var(--line)' : 'none' }}>
        {/* 긴급도 배지 */}
        <div className="w-16 flex-shrink-0 text-center py-1.5 rounded-xl" style={{ background: urg.bg }}>
          <div className="text-[11px] font-bold" style={{ color: urg.color }}>{urg.label}</div>
          <div className="text-[9px] mt-0.5" style={{ color: urg.color, opacity: 0.75 }}>교정일</div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px]" style={{ color: 'var(--ink-faint)' }}>{item.id}</span>
            {item.assetId && <span className="font-mono text-[10px]" style={{ color: 'var(--ink-faint)' }}>[{item.assetId}]</span>}
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: stInfo.bg, color: stInfo.color, fontWeight: 600 }}>{stInfo.label}</span>
            {item.category && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>{item.category}</span>}
          </div>
          <div className="text-[14px] font-semibold mt-0.5 truncate" style={{ color: 'var(--ink)' }}>{item.name}</div>
          <div className="text-[12px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
            {item.model && `${item.model} · `}{item.location || '-'} · 교정주기 {INTERVALS.find(i => i.value === item.interval)?.label || `${item.interval}개월`}
          </div>
        </div>

        <div className="text-right flex-shrink-0 mr-2">
          <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>다음 교정일</div>
          <div className="text-[13px] font-bold" style={{ color: urg.color }}>{item.nextCalDate || '-'}</div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={e => { e.stopPropagation(); onEdit() }} className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)', border: 'none', cursor: 'pointer' }}>
            <Edit3 size={14} />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete() }} className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', cursor: 'pointer' }}>
            <Trash2 size={13} />
          </button>
          {expanded ? <ChevronUp size={16} style={{ color: 'var(--ink-faint)' }} /> : <ChevronDown size={16} style={{ color: 'var(--ink-faint)' }} />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <SLabel>장비 정보</SLabel>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              {[
                ['제조사', item.manufacturer],
                ['모델명', item.model],
                ['시리얼 번호', item.serial],
                ['설치 위치', item.location],
                ['관리 번호', item.assetId],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td style={{ padding: '3px 8px 3px 0', color: 'var(--ink-faint)', whiteSpace: 'nowrap', width: 80 }}>{k}</td>
                  <td style={{ padding: '3px 0', color: 'var(--ink)' }}>{v || '-'}</td>
                </tr>
              ))}
            </table>
          </div>
          <div>
            <SLabel>최근 교정 정보</SLabel>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              {[
                ['최종 교정일', item.lastCalDate],
                ['다음 교정일', item.nextCalDate],
                ['교정 기관', item.calBody],
                ['성적서 번호', item.calCertNo],
                ['교정 결과', item.calResult === 'pass' ? '✓ 합격' : '✗ 불합격'],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td style={{ padding: '3px 8px 3px 0', color: 'var(--ink-faint)', whiteSpace: 'nowrap', width: 85 }}>{k}</td>
                  <td style={{ padding: '3px 0', color: 'var(--ink)', fontWeight: k === '교정 결과' ? 700 : 400 }}>{v || '-'}</td>
                </tr>
              ))}
            </table>
          </div>
          {item.notes && (
            <div className="md:col-span-2">
              <SLabel>비고</SLabel>
              <div className="text-[12px] p-2 rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink)' }}>{item.notes}</div>
            </div>
          )}
          <div className="md:col-span-2 text-[11px]" style={{ color: 'var(--ink-faint)' }}>
            등록: {item.createdBy} · {item.createdAt?.slice(0, 10) || '-'}
          </div>
        </div>
      )}
    </div>
  )
}

function SLabel({ children }) {
  return <div className="text-[11px] font-bold mb-2" style={{ color: 'var(--ink-faint)' }}>{children}</div>
}

// ── 교정 일정 타임라인 ────────────────────────────────────────
function ScheduleView({ items }) {
  const active = items.filter(i => i.status !== 'retired' && i.nextCalDate)
  const sorted = [...active].sort((a, b) => a.nextCalDate.localeCompare(b.nextCalDate))

  // 월별로 그룹화
  const byMonth = {}
  sorted.forEach(item => {
    const month = item.nextCalDate.slice(0, 7) // YYYY-MM
    if (!byMonth[month]) byMonth[month] = []
    byMonth[month].push(item)
  })

  if (sorted.length === 0) {
    return (
      <div className="text-center py-20" style={{ color: 'var(--ink-faint)' }}>
        <Calendar size={40} strokeWidth={1.2} className="mx-auto mb-3 opacity-30" />
        <div>장비를 등록하고 교정일을 입력하면 일정이 표시됩니다</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {Object.entries(byMonth).map(([month, monthItems]) => {
        const [y, m] = month.split('-')
        const monthLabel = `${y}년 ${+m}월`
        return (
          <div key={month}>
            <div className="flex items-center gap-3 mb-2">
              <div className="text-[13px] font-bold px-3 py-1 rounded-full" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
                📅 {monthLabel}
              </div>
              <div className="h-px flex-1" style={{ background: 'var(--line)' }} />
              <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>{monthItems.length}건</div>
            </div>
            <div className="space-y-2 ml-4">
              {monthItems.map(item => {
                const urg = urgencyInfo(item.nextCalDate)
                return (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: `1px solid ${urg.color}30` }}>
                    <div className="w-12 text-center py-1 rounded-lg flex-shrink-0" style={{ background: urg.bg }}>
                      <div className="text-[11px] font-bold" style={{ color: urg.color }}>{urg.label}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--ink)' }}>{item.name}</div>
                      <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{item.nextCalDate} · {item.calBody || '교정기관 미지정'}</div>
                    </div>
                    <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{item.location}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── 현황 분석 탭 ─────────────────────────────────────────────
function StatsView({ items }) {
  const active = items.filter(i => i.status !== 'retired')
  const byCat = {}
  CATEGORIES.forEach(c => { byCat[c] = items.filter(i => i.category === c).length })
  const maxCat = Math.max(...Object.values(byCat), 1)

  const byLoc = {}
  active.forEach(i => {
    const loc = i.location || '미지정'
    byLoc[loc] = (byLoc[loc] || 0) + 1
  })

  const complianceRate = active.length === 0 ? 0
    : Math.round(active.filter(i => daysUntil(i.nextCalDate) >= 0).length / active.length * 100)

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {/* 교정 준수율 */}
      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="text-[13px] font-bold mb-4" style={{ color: 'var(--ink)' }}>교정 준수율</div>
        <div className="flex items-center justify-center">
          <div className="relative w-36 h-36">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="var(--line)" strokeWidth="10" />
              <circle
                cx="50" cy="50" r="40" fill="none"
                stroke={complianceRate >= 90 ? '#10B981' : complianceRate >= 70 ? '#F59E0B' : '#EF4444'}
                strokeWidth="10"
                strokeDasharray={`${complianceRate * 2.513} 251.3`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-[28px] font-bold" style={{ color: complianceRate >= 90 ? '#10B981' : complianceRate >= 70 ? '#F59E0B' : '#EF4444' }}>
                {complianceRate}%
              </div>
              <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>준수율</div>
            </div>
          </div>
        </div>
        <div className="mt-3 text-center text-[12px]" style={{ color: 'var(--ink-faint)' }}>
          {active.filter(i => daysUntil(i.nextCalDate) >= 0).length} / {active.length} 장비 교정 유효
        </div>
      </div>

      {/* 유형별 분포 */}
      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="text-[13px] font-bold mb-4" style={{ color: 'var(--ink)' }}>유형별 장비 수</div>
        <div className="space-y-2">
          {CATEGORIES.filter(c => byCat[c] > 0).map(c => (
            <div key={c} className="flex items-center gap-2">
              <div className="text-[11px] w-20 flex-shrink-0" style={{ color: 'var(--ink-soft)' }}>{c}</div>
              <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: 'var(--bg-soft)' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(byCat[c] / maxCat) * 100}%`, background: '#6366F1', transition: 'width 0.3s' }}
                />
              </div>
              <div className="text-[11px] font-bold w-5 text-right" style={{ color: 'var(--ink)' }}>{byCat[c]}</div>
            </div>
          ))}
          {Object.values(byCat).every(v => v === 0) && (
            <div className="text-[12px] text-center py-4" style={{ color: 'var(--ink-faint)' }}>장비를 등록하면 분포가 표시됩니다</div>
          )}
        </div>
      </div>

      {/* 위치별 분포 */}
      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="text-[13px] font-bold mb-4" style={{ color: 'var(--ink)' }}>위치별 장비 현황</div>
        {Object.keys(byLoc).length === 0 ? (
          <div className="text-[12px] text-center py-4" style={{ color: 'var(--ink-faint)' }}>등록된 장비 없음</div>
        ) : (
          <div className="space-y-2">
            {Object.entries(byLoc).sort((a, b) => b[1] - a[1]).map(([loc, cnt]) => (
              <div key={loc} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
                <span className="text-[12px]" style={{ color: 'var(--ink)' }}>{loc}</span>
                <span className="text-[12px] font-bold px-2 py-0.5 rounded" style={{ background: '#6366F115', color: '#6366F1' }}>{cnt}대</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 이번 달 교정 예정 */}
      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="text-[13px] font-bold mb-4" style={{ color: 'var(--ink)' }}>이번 달 교정 예정</div>
        {(() => {
          const thisMonth = new Date().toISOString().slice(0, 7)
          const thisMonthItems = active.filter(i => i.nextCalDate?.startsWith(thisMonth))
          return thisMonthItems.length === 0 ? (
            <div className="text-[12px] text-center py-4" style={{ color: 'var(--ink-faint)' }}>이번 달 교정 예정 없음</div>
          ) : (
            <div className="space-y-2">
              {thisMonthItems.map(i => {
                const urg = urgencyInfo(i.nextCalDate)
                return (
                  <div key={i.id} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: urg.bg }}>
                    <div className="text-[11px] font-bold w-16" style={{ color: urg.color }}>{i.nextCalDate.slice(5)}</div>
                    <div className="text-[12px] truncate" style={{ color: 'var(--ink)' }}>{i.name}</div>
                  </div>
                )
              })}
            </div>
          )
        })()}
      </div>
    </div>
  )
}

// ── 장비 등록/수정 폼 모달 ────────────────────────────────────
function CalForm({ form, fld, editId, onSubmit, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px', overflowY: 'auto' }} onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--line)', width: '100%', maxWidth: 660, boxShadow: '0 24px 64px rgba(0,0,0,0.3)', padding: 28 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="text-[16px] font-bold" style={{ color: 'var(--ink)' }}>{editId ? '장비 정보 수정' : '측정장치 등록'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)' }}><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <Row2>
            <FField label="장비명 *">
              <input value={form.name} onChange={e => fld('name', e.target.value)} placeholder="예: 버니어 캘리퍼스" className="w-full" style={IS} />
            </FField>
            <FField label="관리 번호 (자산 번호)">
              <input value={form.assetId} onChange={e => fld('assetId', e.target.value)} placeholder="예: EQP-001" className="w-full" style={IS} />
            </FField>
          </Row2>
          <Row2>
            <FField label="제조사">
              <input value={form.manufacturer} onChange={e => fld('manufacturer', e.target.value)} placeholder="예: Mitutoyo" className="w-full" style={IS} />
            </FField>
            <FField label="모델명">
              <input value={form.model} onChange={e => fld('model', e.target.value)} placeholder="예: 530-119" className="w-full" style={IS} />
            </FField>
          </Row2>
          <Row2>
            <FField label="시리얼 번호">
              <input value={form.serial} onChange={e => fld('serial', e.target.value)} placeholder="시리얼 번호" className="w-full" style={IS} />
            </FField>
            <FField label="유형">
              <select value={form.category} onChange={e => fld('category', e.target.value)} className="w-full" style={IS}>
                <option value="">선택...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FField>
          </Row2>
          <Row2>
            <FField label="설치 위치">
              <select value={form.location} onChange={e => fld('location', e.target.value)} className="w-full" style={IS}>
                <option value="">선택...</option>
                {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </FField>
            <FField label="교정 주기">
              <select value={form.interval} onChange={e => fld('interval', +e.target.value)} className="w-full" style={IS}>
                {INTERVALS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
              </select>
            </FField>
          </Row2>

          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-soft)' }}>
            <div className="text-[12px] font-bold mb-3" style={{ color: 'var(--ink-soft)' }}>최근 교정 정보</div>
            <Row2>
              <FField label="최종 교정일 (입력 시 다음 교정일 자동 계산)">
                <input type="date" value={form.lastCalDate} onChange={e => fld('lastCalDate', e.target.value)} className="w-full" style={IS} />
              </FField>
              <FField label="다음 교정일 (자동 계산)">
                <input type="date" value={form.nextCalDate} onChange={e => fld('nextCalDate', e.target.value)} className="w-full" style={{ ...IS, background: form.lastCalDate ? '#F0FDF4' : 'var(--bg-card)' }} />
              </FField>
            </Row2>
            <Row2>
              <FField label="교정 기관">
                <input value={form.calBody} onChange={e => fld('calBody', e.target.value)} placeholder="예: 한국교정연구원" className="w-full" style={IS} />
              </FField>
              <FField label="교정 성적서 번호">
                <input value={form.calCertNo} onChange={e => fld('calCertNo', e.target.value)} placeholder="예: KCL-2026-00123" className="w-full" style={IS} />
              </FField>
            </Row2>
            <Row2>
              <FField label="교정 결과">
                <select value={form.calResult} onChange={e => fld('calResult', e.target.value)} className="w-full" style={IS}>
                  <option value="pass">✓ 합격</option>
                  <option value="fail">✗ 불합격 (수리/폐기 필요)</option>
                </select>
              </FField>
              <FField label="상태">
                <select value={form.status} onChange={e => fld('status', e.target.value)} className="w-full" style={IS}>
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </FField>
            </Row2>
          </div>

          <FField label="비고">
            <textarea value={form.notes} onChange={e => fld('notes', e.target.value)} rows={2} placeholder="특이사항..." className="w-full" style={{ ...IS, resize: 'vertical' }} />
          </FField>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>취소</button>
          <button onClick={onSubmit} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: '#6366F1', color: 'white', border: 'none', cursor: 'pointer' }}>
            {editId ? '수정 저장' : '장비 등록'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Row2({ children }) { return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div> }
function FField({ label, children }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-faint)' }}>{label}</label>
      {children}
    </div>
  )
}
const IS = { border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--ink)', background: 'var(--bg-card)', outline: 'none' }

function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <Wrench size={48} strokeWidth={1} className="mx-auto mb-3 opacity-30" style={{ color: '#6366F1' }} />
      <div className="text-[16px] font-bold mb-1" style={{ color: 'var(--ink-soft)' }}>등록된 측정장치 없음</div>
      <div className="text-[13px] mb-5" style={{ color: 'var(--ink-faint)' }}>버니어 캘리퍼스, 마이크로미터, 온도계 등 교정이 필요한 장비를 등록하세요</div>
      <button onClick={onAdd} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: '#6366F1', color: 'white', border: 'none', cursor: 'pointer' }}>
        <Plus size={15} /> 첫 번째 장비 등록
      </button>
    </div>
  )
}
