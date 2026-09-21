// src/pages/record-master/RecordMasterHub.jsx
// 중앙 기록 대장 — ISO 13485 §4.2.4 품질기록 통합 뷰
// 모든 허브의 localStorage 데이터를 집계해 단일 기록 목록으로 제공
import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, Search, Filter, ExternalLink, Clock,
  AlertTriangle, CheckCircle2, Archive, BarChart2,
  ChevronRight, Calendar, Package, ShieldAlert,
  Wrench, TrendingUp, Users, GitBranch, RefreshCw,
  Layers, Activity, BookOpen, Trash2 } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'

// ── 모듈 정의 ─────────────────────────────────────────────────
// retention: ISO 13485 §4.2.4 보유기간 (년)
const MODULES = [
  {
    id: 'risk', key: 'qualytree.risks', label: '위험관리',
    iso: 'ISO 14971', color: '#EF4444', icon: ShieldAlert,
    route: '/risk', retention: 15,
    getTitle: r => r.title || r.harm || '(제목 없음)',
    getDate:  r => r.createdAt?.slice(0, 10) || '',
    getStatus: r => {
      const rpn = (r.severity || 1) * (r.probability || 1)
      return rpn >= 15 ? '허용불가' : rpn >= 8 ? '조건부허용' : '허용가능'
    },
    statusColor: r => {
      const rpn = (r.severity || 1) * (r.probability || 1)
      return rpn >= 15 ? '#EF4444' : rpn >= 8 ? '#D97706' : '#10B981'
    },
  },
  {
    id: 'audit', key: 'qualytree.audits', label: '내부감사',
    iso: 'ISO 13485 §8.2.2', color: '#6366F1', icon: FileText,
    route: '/audit', retention: 5,
    getTitle: r => r.title || '감사 기록',
    getDate:  r => r.auditDate || r.createdAt?.slice(0, 10) || '',
    getStatus: r => ({ planned:'계획',in_progress:'진행 중',completed:'완료',closed:'종결' }[r.status] || r.status),
    statusColor: r => ({ planned:'#6B7280',in_progress:'#F59E0B',completed:'#3B82F6',closed:'#10B981' }[r.status] || '#6B7280'),
  },
  {
    id: 'car', key: 'qualytree.audit_cars', label: '시정조치 (CAR)',
    iso: 'ISO 13485 §8.2.2', color: '#8B5CF6', icon: AlertTriangle,
    route: '/audit', retention: 5,
    getTitle: r => r.finding || 'CAR 기록',
    getDate:  r => r.createdAt?.slice(0, 10) || '',
    getStatus: r => ({ open:'미처리',in_progress:'조치 중',verified:'검증 완료',closed:'종결' }[r.status] || r.status),
    statusColor: r => ({ open:'#EF4444',in_progress:'#F59E0B',verified:'#3B82F6',closed:'#10B981' }[r.status] || '#6B7280'),
  },
  {
    id: 'improvement', key: 'qualytree.improvements', label: '개선활동',
    iso: 'ISO 13485 §8.5', color: '#10B981', icon: TrendingUp,
    route: '/improvement', retention: 5,
    getTitle: r => r.title || '개선 과제',
    getDate:  r => r.createdAt?.slice(0, 10) || '',
    getStatus: r => ({ idea:'아이디어',approved:'승인됨',in_progress:'진행 중',verify:'효과검증',done:'완료',cancelled:'취소' }[r.status] || r.status),
    statusColor: r => ({ idea:'#6B7280',approved:'#3B82F6',in_progress:'#F59E0B',verify:'#8B5CF6',done:'#10B981',cancelled:'#EF4444' }[r.status] || '#6B7280'),
  },
  {
    id: 'calibration', key: 'qualytree.calibrations', label: '교정관리',
    iso: 'ISO 13485 §7.6', color: '#3B82F6', icon: Wrench,
    route: '/calibration', retention: 10,
    getTitle: r => r.name || '측정장치',
    getDate:  r => r.lastCalDate || r.createdAt?.slice(0, 10) || '',
    getStatus: r => {
      if (!r.nextCalDate) return '미설정'
      const days = Math.ceil((new Date(r.nextCalDate) - new Date()) / 86400000)
      if (days < 0) return '교정 만료'
      if (days <= 30) return `D-${days}`
      return '정상'
    },
    statusColor: r => {
      if (!r.nextCalDate) return '#6B7280'
      const days = Math.ceil((new Date(r.nextCalDate) - new Date()) / 86400000)
      return days < 0 ? '#EF4444' : days <= 30 ? '#D97706' : '#10B981'
    },
  },
  {
    id: 'distribution', key: 'qualytree.distributions', label: '제품배포',
    iso: 'ISO 13485 §7.5.9', color: '#F59E0B', icon: Package,
    route: '/traceability', retention: 10,
    getTitle: r => `${r.productName || '(제품명 없음)'} → ${r.customerName || '-'} (LOT: ${r.lotNo || '-'})`,
    getDate:  r => r.distDate || r.createdAt?.slice(0, 10) || '',
    getStatus: r => ({ sale:'판매',install:'설치',loan:'대여',demo:'데모',service:'서비스',return:'반품' }[r.distType] || r.distType || '-'),
    statusColor: () => '#F59E0B',
  },
  {
    id: 'complaint', key: 'qualytree.complaints', label: '고객불만',
    iso: 'ISO 13485 §8.2.1', color: '#DC2626', icon: Users,
    route: '/complaints', retention: 5,
    getTitle: r => r.title || r.subject || r.description || '고객불만 기록',
    getDate:  r => r.receiptDate || r.createdAt?.slice(0, 10) || '',
    getStatus: r => r.status || '-',
    statusColor: () => '#DC2626',
  },
  {
    id: 'supplier', key: 'qualytree.suppliers', label: '공급업체',
    iso: 'ISO 13485 §7.4.1', color: '#059669', icon: GitBranch,
    route: '/supplier', retention: 5,
    getTitle: r => r.name || r.companyName || '공급업체 기록',
    getDate:  r => r.lastEvalDate || r.createdAt?.slice(0, 10) || '',
    getStatus: r => r.status || r.grade || '-',
    statusColor: () => '#059669',
  },
  {
    id: 'change', key: 'qualytree.changes', label: '변경관리',
    iso: 'ISO 13485 §4.1.4', color: '#D97706', icon: RefreshCw,
    route: '/change-control', retention: 10,
    getTitle: r => r.title || r.changeTitle || '변경 기록',
    getDate:  r => r.createdAt?.slice(0, 10) || r.requestDate || '',
    getStatus: r => r.status || '-',
    statusColor: () => '#D97706',
  },
  {
    id: 'wo', key: 'qms_mfg_wo', label: '작업지시',
    iso: 'ISO 13485 §7.5.1', color: '#64748B', icon: Layers,
    route: '/manufacturing', retention: 5,
    getTitle: r => `${r.id || ''} — ${r.product || '(제품 없음)'}`,
    getDate:  r => r.createdAt?.slice(0, 10) || r.startDate || '',
    getStatus: r => ({ planned:'계획',in_progress:'진행 중',done:'완료',hold:'보류' }[r.status] || r.status || '-'),
    statusColor: r => ({ planned:'#6B7280',in_progress:'#F59E0B',done:'#10B981',hold:'#EF4444' }[r.status] || '#6B7280'),
  },
]

const ISO_RETENTION = {
  risk: 15, calibration: 10, distribution: 10, change: 10, wo: 5,
  audit: 5, car: 5, improvement: 5, complaint: 5, supplier: 5,
}

// ── 유틸 ──────────────────────────────────────────────────────
function readLS(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}

function retentionStatus(dateStr, years) {
  if (!dateStr || !years) return null
  const exp = new Date(dateStr)
  exp.setFullYear(exp.getFullYear() + years)
  const daysLeft = Math.ceil((exp - new Date()) / 86400000)
  if (daysLeft < 0) return { level: 'expired', label: '보유기간 만료', color: '#DC2626', days: daysLeft }
  if (daysLeft <= 365) return { level: 'warning', label: `만료 ${daysLeft}일 전`, color: '#D97706', days: daysLeft }
  return { level: 'ok', label: `${Math.floor(daysLeft / 365)}년 ${daysLeft % 365}일 남음`, color: '#10B981', days: daysLeft }
}

// ── 집계 ──────────────────────────────────────────────────────
function aggregateRecords() {
  const all = []
  MODULES.forEach(mod => {
    const items = readLS(mod.key)
    items.forEach(r => {
      const dateStr = mod.getDate(r)
      all.push({
        _uid:       `${mod.id}::${r.id || Math.random()}`,
        _module:    mod,
        id:         r.id || '-',
        title:      mod.getTitle(r),
        date:       dateStr,
        status:     mod.getStatus(r),
        statusColor: mod.statusColor(r),
        retention:  retentionStatus(dateStr, mod.retention),
        createdBy:  r.createdBy || r.preparedBy || '-',
        raw:        r,
      })
    })
  })
  return all.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
}

// ── 컴포넌트 ──────────────────────────────────────────────────
export default function RecordMasterHub() {
  const nav = useNavigate()
  const user = auth.current()

  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState('all')
  const [retFilter, setRetFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)

  const records = useMemo(() => aggregateRecords(), [])

  const filtered = useMemo(() => {
    let list = records
    if (moduleFilter !== 'all') list = list.filter(r => r._module.id === moduleFilter)
    if (retFilter === 'warning') list = list.filter(r => r.retention?.level === 'warning')
    if (retFilter === 'expired') list = list.filter(r => r.retention?.level === 'expired')
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r._module.label.toLowerCase().includes(q) ||
        (r.status || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [records, moduleFilter, retFilter, search])

  // 모듈별 집계
  const moduleCounts = useMemo(() => {
    const counts = {}
    MODULES.forEach(m => { counts[m.id] = 0 })
    records.forEach(r => { counts[r._module.id] = (counts[r._module.id] || 0) + 1 })
    return counts
  }, [records])

  const retentionStats = useMemo(() => ({
    expired: records.filter(r => r.retention?.level === 'expired').length,
    warning: records.filter(r => r.retention?.level === 'warning').length,
    ok:      records.filter(r => r.retention?.level === 'ok').length,
  }), [records])

  const [disposals, setDisposals] = useState(() => { try { return JSON.parse(localStorage.getItem('qualytree.record_disposals') || '[]') } catch { return [] } })
  const saveDisposals = v => { setDisposals(v); localStorage.setItem('qualytree.record_disposals', JSON.stringify(v)) }
  const EMPTY_DISP = { recordName: '', recordType: '', retentionYears: '', reason: 'period_expired', requestedBy: '', requestedAt: new Date().toISOString().slice(0,10), status: 'requested', approvedBy: '', approvedAt: '', disposedAt: '', notes: '' }
  const [dispForm, setDispForm] = useState({...EMPTY_DISP})
  const [dispAdding, setDispAdding] = useState(false)
  const saveDisp = () => {
    if (!dispForm.recordName.trim()) { alert('기록명을 입력하세요.'); return }
    const item = {...dispForm, id: dispForm.id || Date.now().toString()}
    if (dispForm.id) saveDisposals(disposals.map(d => d.id === item.id ? item : d))
    else saveDisposals([...disposals, item])
    setDispAdding(false); setDispForm({...EMPTY_DISP})
  }
  const delDisp = id => { if (window.confirm('삭제하시겠습니까?')) saveDisposals(disposals.filter(d => d.id !== id)) }
  const approveDisp = id => {
    const u = auth.current()
    saveDisposals(disposals.map(d => d.id === id ? {...d, status: 'approved', approvedBy: u?.name || '관리자', approvedAt: new Date().toISOString().slice(0,10)} : d))
  }
  const completeDisp = id => {
    saveDisposals(disposals.map(d => d.id === id ? {...d, status: 'completed', disposedAt: new Date().toISOString().slice(0,10)} : d))
  }

  const TABS = [
    { key: 'all',       label: '전체 기록',        icon: FileText },
    { key: 'retention', label: '보유기간 관리',     icon: Clock },
    { key: 'stats',     label: '모듈별 현황',       icon: BarChart2 },
    { key: 'disposal',  label: '기록 파기', icon: Trash2 },
  ]

  return (
    <AppLayout user={user} title="중앙 기록 대장" subtitle="ISO 13485 §4.2.4 · 품질기록 통합 현황">
      <HubBanner icon={BookOpen} title="중앙 기록 대장" subtitle="ISO 13485 §4.2.4" color="#6B7280" />
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto space-y-5">

        {/* 헤더 배너 */}
        <div className="rounded-2xl p-5 flex items-center justify-between gap-4"
          style={{ background: 'linear-gradient(135deg, #6366F108, #10B98108)', border: '1px solid var(--line)' }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: '#6366F115' }}>
              <Archive size={22} style={{ color: '#6366F1' }} />
            </div>
            <div>
              <div className="font-bold text-[16px]" style={{ color: 'var(--ink)' }}>품질기록 중앙 대장</div>
              <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>
                ISO 13485 §4.2.4 · 전체 {records.length}건 · {MODULES.length}개 모듈 연동
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>만료 임박 / 만료</div>
            <div className="text-[20px] font-bold" style={{ color: retentionStats.expired + retentionStats.warning > 0 ? '#EF4444' : '#10B981' }}>
              {retentionStats.warning + retentionStats.expired}건
            </div>
          </div>
        </div>

        {/* KPI 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: '전체 기록',     value: records.length,          color: '#6B7280', icon: FileText },
            { label: '보유기간 만료', value: retentionStats.expired,  color: '#EF4444', icon: AlertTriangle },
            { label: '만료 1년 이내', value: retentionStats.warning,  color: '#D97706', icon: Clock },
            { label: '보유기간 정상', value: retentionStats.ok,       color: '#10B981', icon: CheckCircle2 },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>{s.label}</span>
                <s.icon size={14} style={{ color: s.color }} />
              </div>
              <div className="text-[26px] font-bold" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* 탭 */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-soft)', width: 'fit-content' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition"
              style={{
                background: tab === t.key ? 'var(--bg-card)' : 'transparent',
                color: tab === t.key ? 'var(--ink)' : 'var(--ink-faint)',
                border: 'none', cursor: 'pointer',
                boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}>
              <t.icon size={13} />{t.label}
            </button>
          ))}
        </div>

        {/* ── 전체 기록 탭 ── */}
        {tab === 'all' && (
          <div className="space-y-4">
            {/* 필터 */}
            <div className="flex gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-[200px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                <Search size={14} style={{ color: 'var(--ink-faint)' }} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="기록 ID · 제목 · 모듈 · 상태 검색..."
                  className="flex-1 text-[13px] outline-none"
                  style={{ background: 'none', border: 'none', color: 'var(--ink)' }} />
              </div>
              <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-[13px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
                <option value="all">전체 모듈</option>
                {MODULES.map(m => <option key={m.id} value={m.id}>{m.label} ({moduleCounts[m.id] || 0})</option>)}
              </select>
              <select value={retFilter} onChange={e => setRetFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-[13px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
                <option value="all">전체 보유상태</option>
                <option value="expired">만료</option>
                <option value="warning">만료 임박 (1년 이내)</option>
              </select>
            </div>

            {/* 기록 목록 */}
            {filtered.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-1.5">
                {filtered.map(r => (
                  <RecordRow key={r._uid} record={r}
                    expanded={expanded === r._uid}
                    onToggle={() => setExpanded(expanded === r._uid ? null : r._uid)}
                    onNavigate={() => nav(r._module.route)}
                  />
                ))}
              </div>
            )}

            <div className="text-center text-[12px] py-2" style={{ color: 'var(--ink-faint)' }}>
              {filtered.length}건 표시 / 전체 {records.length}건
            </div>
          </div>
        )}

        {/* ── 보유기간 관리 탭 ── */}
        {tab === 'retention' && (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
              <div className="text-[13px] font-bold mb-1" style={{ color: '#92400E' }}>
                📋 ISO 13485 §4.2.4 품질기록 보유 요건
              </div>
              <div className="text-[12px] leading-relaxed" style={{ color: '#78350F' }}>
                품질기록은 해당 의료기기의 제조·출하 후 최소 <strong>2년</strong> 이상 보유해야 하며,
                규제 요건 또는 계약에 따라 더 긴 기간이 적용될 수 있습니다.
                위험관리 파일: <strong>15년</strong> · 교정·추적성 기록: <strong>10년</strong> · 기타 품질기록: <strong>5년</strong>
              </div>
            </div>

            {/* 만료 기록 */}
            {retentionStats.expired > 0 && (
              <Section title="보유기간 만료 기록" color="#EF4444" count={retentionStats.expired}>
                {records.filter(r => r.retention?.level === 'expired').map(r => (
                  <RetentionRow key={r._uid} record={r} onNavigate={() => nav(r._module.route)} />
                ))}
              </Section>
            )}

            {/* 만료 임박 */}
            {retentionStats.warning > 0 && (
              <Section title="만료 임박 (1년 이내)" color="#D97706" count={retentionStats.warning}>
                {records.filter(r => r.retention?.level === 'warning').map(r => (
                  <RetentionRow key={r._uid} record={r} onNavigate={() => nav(r._module.route)} />
                ))}
              </Section>
            )}

            {retentionStats.expired === 0 && retentionStats.warning === 0 && (
              <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                <CheckCircle2 size={36} style={{ color: '#10B981', margin: '0 auto 10px' }} />
                <div className="font-semibold text-[15px]" style={{ color: '#10B981' }}>모든 기록이 보유기간 내에 있습니다</div>
              </div>
            )}

            {/* 모듈별 보유기간 기준 */}
            <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="text-[12px] font-semibold mb-3" style={{ color: 'var(--ink-faint)' }}>모듈별 보유기간 기준</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {MODULES.map(m => (
                  <div key={m.id} className="flex items-center gap-2 p-2 rounded-xl"
                    style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
                    <m.icon size={13} style={{ color: m.color, flexShrink: 0 }} />
                    <div className="min-w-0">
                      <div className="text-[11.5px] font-medium truncate" style={{ color: 'var(--ink)' }}>{m.label}</div>
                      <div className="text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>{m.retention}년</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── 모듈별 현황 탭 ── */}
        {tab === 'stats' && (
          <div className="space-y-3">
            {MODULES.map(m => {
              const count = moduleCounts[m.id] || 0
              const max = Math.max(...Object.values(moduleCounts), 1)
              return (
                <div key={m.id} className="rounded-2xl overflow-hidden"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                  <div className="flex items-center gap-3 p-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${m.color}15` }}>
                      <m.icon size={18} style={{ color: m.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <span className="font-semibold text-[13.5px]" style={{ color: 'var(--ink)' }}>{m.label}</span>
                          <span className="ml-2 text-[11px]" style={{ color: 'var(--ink-faint)' }}>{m.iso}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[16px]" style={{ color: m.color }}>{count}</span>
                          <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>건</span>
                          <button onClick={() => nav(m.route)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11.5px] font-medium"
                            style={{ background: `${m.color}12`, color: m.color, border: 'none', cursor: 'pointer' }}>
                            바로가기 <ExternalLink size={10} />
                          </button>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-soft)' }}>
                        <div className="h-1.5 rounded-full transition-all"
                          style={{ width: `${(count / max) * 100}%`, background: m.color }} />
                      </div>
                      <div className="mt-1 text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>
                        보유기간 {m.retention}년 · 보관 경로: {m.route}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'disposal' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
              <div className="text-[13px] font-bold mb-1" style={{ color: '#991B1B' }}>기록 파기 절차 (ISO 13485 §4.2.4/§4.2.5)</div>
              <div className="text-[12px] leading-relaxed" style={{ color: '#7F1D1D' }}>불필요 기록은 파기 신청 → 관리자 승인 → 파기 완료의 3단계를 거쳐야 합니다. 파기 시 반드시 날짜, 방법, 승인자를 기록해야 합니다.</div>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:13, color:'var(--ink-soft)' }}>파기 신청 {disposals.length}건</span>
              <button onClick={() => { setDispForm({...EMPTY_DISP}); setDispAdding(true) }} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:600, background:'var(--moss)', color:'#fff', border:'none', borderRadius:6, padding:'7px 14px', cursor:'pointer' }}><Trash2 size={14} /> 파기 신청</button>
            </div>
            {dispAdding && (
              <div style={{ background:'var(--bg-soft)', border:'1px solid var(--line)', borderRadius:10, padding:20 }}>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:14 }}>기록 파기 신청서 (§4.2.4)</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                  <div><label style={{ fontSize:11, color:'var(--ink-soft)', display:'block', marginBottom:4 }}>기록명 *</label><input style={{ width:'100%', padding:'7px 10px', border:'1px solid var(--line)', borderRadius:6, fontSize:13 }} value={dispForm.recordName} onChange={e=>setDispForm(f=>({...f,recordName:e.target.value}))} /></div>
                  <div><label style={{ fontSize:11, color:'var(--ink-soft)', display:'block', marginBottom:4 }}>기록 유형</label><input style={{ width:'100%', padding:'7px 10px', border:'1px solid var(--line)', borderRadius:6, fontSize:13 }} value={dispForm.recordType} onChange={e=>setDispForm(f=>({...f,recordType:e.target.value}))} placeholder="예: 품질기획서" /></div>
                  <div><label style={{ fontSize:11, color:'var(--ink-soft)', display:'block', marginBottom:4 }}>보관년한</label><input style={{ width:'100%', padding:'7px 10px', border:'1px solid var(--line)', borderRadius:6, fontSize:13 }} value={dispForm.retentionYears} onChange={e=>setDispForm(f=>({...f,retentionYears:e.target.value}))} placeholder="예: 5년" /></div>
                  <div><label style={{ fontSize:11, color:'var(--ink-soft)', display:'block', marginBottom:4 }}>파기 사유</label>
                    <select style={{ width:'100%', padding:'7px 10px', border:'1px solid var(--line)', borderRadius:6, fontSize:13 }} value={dispForm.reason} onChange={e=>setDispForm(f=>({...f,reason:e.target.value}))}>
                      <option value="period_expired">보관기한 만료</option><option value="superseded">개정대체</option><option value="not_required">해당없음</option><option value="other">기타</option>
                    </select></div>
                  <div><label style={{ fontSize:11, color:'var(--ink-soft)', display:'block', marginBottom:4 }}>신청일</label><input type="date" style={{ width:'100%', padding:'7px 10px', border:'1px solid var(--line)', borderRadius:6, fontSize:13 }} value={dispForm.requestedAt} onChange={e=>setDispForm(f=>({...f,requestedAt:e.target.value}))} /></div>
                  <div><label style={{ fontSize:11, color:'var(--ink-soft)', display:'block', marginBottom:4 }}>신청자</label><input style={{ width:'100%', padding:'7px 10px', border:'1px solid var(--line)', borderRadius:6, fontSize:13 }} value={dispForm.requestedBy} onChange={e=>setDispForm(f=>({...f,requestedBy:e.target.value}))} /></div>
                </div>
                <div style={{ marginBottom:12 }}><label style={{ fontSize:11, color:'var(--ink-soft)', display:'block', marginBottom:4 }}>비고</label><textarea style={{ width:'100%', padding:'7px 10px', border:'1px solid var(--line)', borderRadius:6, fontSize:13, minHeight:60 }} value={dispForm.notes} onChange={e=>setDispForm(f=>({...f,notes:e.target.value}))} /></div>
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={saveDisp} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:600, background:'var(--moss)', color:'#fff', border:'none', borderRadius:6, padding:'7px 16px', cursor:'pointer' }}><Archive size={14} /> 저장</button>
                  <button onClick={() => setDispAdding(false)} style={{ fontSize:13, background:'none', border:'1px solid var(--line)', borderRadius:6, padding:'7px 14px', cursor:'pointer', color:'var(--ink-soft)' }}>취소</button>
                </div>
              </div>
            )}
            {disposals.length === 0 ? (
              <div style={{ textAlign:'center', padding:40, color:'var(--ink-faint)', fontSize:14 }}>파기 신청 기록이 없습니다.</div>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead><tr style={{ borderBottom:'2px solid var(--line)', background:'var(--bg-soft)' }}>
                    {['신청일','기록명','유형','파기사유','신청자','상태','승인/완료',''].map(h=>(
                      <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontWeight:700, fontSize:12, color:'var(--ink-soft)' }}>{h}</th>
                    ))}</tr></thead>
                  <tbody>{disposals.map((d,i) => (
                    <tr key={d.id} style={{ borderBottom:'1px solid var(--line)', background:i%2?'var(--bg-soft)':'var(--bg-card)' }}>
                      <td style={{ padding:'8px 12px', color:'var(--ink-soft)', whiteSpace:'nowrap' }}>{d.requestedAt}</td>
                      <td style={{ padding:'8px 12px', fontWeight:600 }}>{d.recordName}</td>
                      <td style={{ padding:'8px 12px', color:'var(--ink-soft)' }}>{d.recordType}</td>
                      <td style={{ padding:'8px 12px', color:'var(--ink-soft)' }}>{d.reason==='period_expired'?'보관기한만료':d.reason==='superseded'?'개정대체':d.reason==='not_required'?'해당없음':'기타'}</td>
                      <td style={{ padding:'8px 12px', color:'var(--ink-soft)' }}>{d.requestedBy}</td>
                      <td style={{ padding:'8px 12px' }}><span style={{ fontSize:11, fontWeight:700, borderRadius:4, padding:'2px 7px', background:d.status==='completed'?'#D1FAE5':d.status==='approved'?'#EFF6FF':'#FEF3C7', color:d.status==='completed'?'#065F46':d.status==='approved'?'#1D4ED8':'#92400E' }}>{d.status==='requested'?'신청':d.status==='approved'?'승인':'파기완료'}</span></td>
                      <td style={{ padding:'8px 12px', fontSize:11, color:'var(--ink-soft)' }}>{d.approvedBy&&<div>승인:{d.approvedBy}({d.approvedAt})</div>}{d.disposedAt&&<div>파기:{d.disposedAt}</div>}</td>
                      <td style={{ padding:'8px 12px' }}>
                        <div style={{ display:'flex', gap:4 }}>
                          {d.status==='requested'&&<button onClick={()=>approveDisp(d.id)} style={{ fontSize:11, padding:'3px 8px', borderRadius:4, border:'1px solid #BFDBFE', background:'#EFF6FF', cursor:'pointer', color:'#1D4ED8' }}>승인</button>}
                          {d.status==='approved'&&<button onClick={()=>completeDisp(d.id)} style={{ fontSize:11, padding:'3px 8px', borderRadius:4, border:'1px solid #A7F3D0', background:'#D1FAE5', cursor:'pointer', color:'#065F46' }}>파기완료</button>}
                          <button onClick={()=>{setDispForm({...d});setDispAdding(true)}} style={{ fontSize:11, padding:'3px 8px', borderRadius:4, border:'1px solid var(--line)', background:'none', cursor:'pointer', color:'var(--ink-soft)' }}>수정</button>
                          <button onClick={()=>delDisp(d.id)} style={{ fontSize:11, padding:'3px 6px', borderRadius:4, border:'1px solid #FCA5A5', background:'none', cursor:'pointer', color:'#EF4444' }}><Trash2 size={11} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </AppLayout>
  )
}

// ── 기록 행 ───────────────────────────────────────────────────
function RecordRow({ record: r, expanded, onToggle, onNavigate }) {
  const mod = r._module
  const ret = r.retention

  return (
    <div className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
      <div className="flex items-center gap-3 px-4 py-2.5 cursor-pointer" onClick={onToggle}>
        {/* 모듈 아이콘 */}
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${mod.color}15` }}>
          <mod.icon size={14} style={{ color: mod.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
              style={{ background: `${mod.color}15`, color: mod.color }}>{mod.label}</span>
            <span className="font-mono text-[10px]" style={{ color: 'var(--ink-faint)' }}>{r.id}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ background: `${r.statusColor}18`, color: r.statusColor }}>{r.status}</span>
          </div>
          <div className="text-[13px] font-medium truncate mt-0.5" style={{ color: 'var(--ink)' }}>{r.title}</div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 text-right">
          {ret && (
            <span className="text-[10px] px-2 py-0.5 rounded"
              style={{ background: `${ret.color}15`, color: ret.color }}>
              {ret.level === 'expired' ? '만료' : ret.level === 'warning' ? '임박' : ''}
            </span>
          )}
          <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{r.date || '-'}</span>
          <ChevronRight size={13} style={{ color: 'var(--ink-faint)', transform: expanded ? 'rotate(90deg)' : 'none', transition: '0.15s' }} />
        </div>
      </div>

      {expanded && (
        <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--line)', background: 'var(--bg-soft)' }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px] mb-3">
            <InfoPill label="모듈" value={mod.label} />
            <InfoPill label="ISO 조항" value={mod.iso} />
            <InfoPill label="기록일" value={r.date || '-'} />
            <InfoPill label="작성자" value={r.createdBy} />
          </div>
          {ret && (
            <div className="flex items-center gap-2 mb-3 p-2 rounded-lg"
              style={{ background: `${ret.color}10`, border: `1px solid ${ret.color}30` }}>
              <Clock size={12} style={{ color: ret.color }} />
              <span className="text-[11.5px]" style={{ color: ret.color }}>
                보유기간 {mod.retention}년 · {ret.label}
              </span>
            </div>
          )}
          <button onClick={onNavigate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
            style={{ background: `${mod.color}12`, color: mod.color, border: 'none', cursor: 'pointer' }}>
            <ExternalLink size={12} /> {mod.label} 허브로 이동
          </button>
        </div>
      )}
    </div>
  )
}

// ── 보유기간 행 ───────────────────────────────────────────────
function RetentionRow({ record: r, onNavigate }) {
  const mod = r._module
  const ret = r.retention

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl"
      style={{ background: 'var(--bg-card)', border: `1px solid ${ret?.color}30` }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${mod.color}15` }}>
        <mod.icon size={15} style={{ color: mod.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded"
            style={{ background: `${mod.color}15`, color: mod.color }}>{mod.label}</span>
          <span className="font-mono text-[10px]" style={{ color: 'var(--ink-faint)' }}>{r.id}</span>
        </div>
        <div className="text-[13px] font-medium truncate" style={{ color: 'var(--ink)' }}>{r.title}</div>
        <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>기록일: {r.date || '-'} · 보유기간: {mod.retention}년</div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[11px] font-semibold px-2 py-1 rounded-lg"
          style={{ background: `${ret?.color}15`, color: ret?.color }}>{ret?.label}</span>
        <button onClick={onNavigate}
          className="p-1.5 rounded-lg"
          style={{ background: `${mod.color}12`, color: mod.color, border: 'none', cursor: 'pointer' }}>
          <ExternalLink size={13} />
        </button>
      </div>
    </div>
  )
}

// ── 섹션 래퍼 ─────────────────────────────────────────────────
function Section({ title, color, count, children }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${color}30` }}>
      <div className="px-4 py-3 flex items-center gap-2"
        style={{ background: `${color}08`, borderBottom: `1px solid ${color}20` }}>
        <AlertTriangle size={14} style={{ color }} />
        <span className="font-semibold text-[13px]" style={{ color }}>{title}</span>
        <span className="ml-auto text-[12px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${color}20`, color }}>{count}건</span>
      </div>
      <div className="p-3 space-y-2">{children}</div>
    </div>
  )
}

function InfoPill({ label, value }) {
  return (
    <div>
      <div className="text-[10px] mb-0.5" style={{ color: 'var(--ink-faint)' }}>{label}</div>
      <div style={{ color: 'var(--ink)' }}>{value || '-'}</div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-2xl p-16 text-center" style={{ background: 'var(--bg-card)', border: '2px dashed var(--line)' }}>
      <Archive size={36} style={{ color: 'var(--ink-faint)', opacity: 0.4, margin: '0 auto 12px' }} />
      <div className="font-semibold text-[15px] mb-1" style={{ color: 'var(--ink-soft)' }}>기록 없음</div>
      <div className="text-[13px]" style={{ color: 'var(--ink-faint)' }}>각 허브에 데이터를 입력하면 여기에 통합 표시됩니다</div>
    </div>
  )
}
