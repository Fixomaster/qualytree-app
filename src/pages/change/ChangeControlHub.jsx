// src/pages/change/ChangeControlHub.jsx
// ISO 13485 §4.1.4 / §7.3.9 변경 관리 — 제품·공정·문서·소프트웨어 변경 요청·영향평가·승인·이행 추적
import React, { useState, useMemo } from 'react'
import {
  Plus, Search, Trash2, X, ChevronDown, ChevronUp, Edit3,
  AlertTriangle, CheckCircle2, Clock, XCircle, RefreshCw,
  FileEdit, Cpu, Package, FileText, GitBranch, TrendingUp,
  ClipboardList, Eye,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'

// ── localStorage ──────────────────────────────────────────────
const LS_KEY = 'qualytree.changes'
function lsR() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] } }
function lsW(d) { localStorage.setItem(LS_KEY, JSON.stringify(d)) }
function genId() { return `CHG-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }

// ── 상수 ─────────────────────────────────────────────────────
const CHANGE_TYPES = [
  { value: 'product',   label: '제품 변경',   icon: Package,  color: '#2563EB', desc: '사양·재료·구성요소 변경' },
  { value: 'process',   label: '공정 변경',   icon: RefreshCw, color: '#059669', desc: '제조·검사 공정 변경' },
  { value: 'document',  label: '문서 변경',   icon: FileText, color: '#D97706', desc: '절차서·작업표준 변경' },
  { value: 'software',  label: '소프트웨어 변경', icon: Cpu,  color: '#7C3AED', desc: 'SW·펌웨어 변경' },
  { value: 'supplier',  label: '공급업체 변경', icon: GitBranch, color: '#DC2626', desc: '소재·부품 공급업체 변경' },
  { value: 'other',     label: '기타',        icon: FileEdit, color: '#6B7280', desc: '기타 변경' },
]

const RISK_LEVELS = [
  { value: 'high',   label: '높음 (High)',   color: '#DC2626', bg: '#FEE2E2' },
  { value: 'medium', label: '중간 (Medium)', color: '#D97706', bg: '#FEF3C7' },
  { value: 'low',    label: '낮음 (Low)',    color: '#059669', bg: '#D1FAE5' },
]

const STATUSES = [
  { value: 'draft',      label: '초안',      color: '#6B7280', bg: '#F3F4F6', icon: FileEdit },
  { value: 'review',     label: '검토 중',   color: '#2563EB', bg: '#DBEAFE', icon: Eye },
  { value: 'approved',   label: '승인',      color: '#059669', bg: '#D1FAE5', icon: CheckCircle2 },
  { value: 'rejected',   label: '반려',      color: '#DC2626', bg: '#FEE2E2', icon: XCircle },
  { value: 'implementing', label: '이행 중', color: '#D97706', bg: '#FEF3C7', icon: RefreshCw },
  { value: 'completed',  label: '완료',      color: '#7C3AED', bg: '#EDE9FE', icon: CheckCircle2 },
  { value: 'cancelled',  label: '취소',      color: '#9CA3AF', bg: '#F9FAFB', icon: XCircle },
]

// 영향 평가 항목
const IMPACT_ITEMS = [
  { key: 'design',       label: '설계/도면 영향' },
  { key: 'validation',   label: '밸리데이션 재수행' },
  { key: 'regulatory',   label: '인허가 변경 필요' },
  { key: 'supplier',     label: '공급업체 영향' },
  { key: 'customer',     label: '고객 통보 필요' },
  { key: 'label',        label: '라벨·포장 변경' },
  { key: 'training',     label: '교육 훈련 필요' },
  { key: 'document',     label: '문서 개정 필요' },
]

const emptyForm = () => ({
  title: '', changeType: 'product', requestedBy: '', requestDate: new Date().toISOString().slice(0,10),
  description: '', reason: '', riskLevel: 'medium',
  impactItems: {}, impactNote: '',
  approver: '', approvedDate: '', approvalNote: '',
  implementedDate: '', implementationNote: '',
  linkedNcr: '', linkedCapa: '', status: 'draft', notes: '',
})

// ── 메인 ─────────────────────────────────────────────────────
export default function ChangeControlHub() {
  const user = auth.current()
  const [records, setRecords] = useState(() => lsR())
  const [tab, setTab]         = useState('list')
  const [search, setSearch]   = useState('')
  const [typeFilter, setTypeFilter]     = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(emptyForm())
  const [editId, setEditId]     = useState(null)
  const [expanded, setExpanded] = useState(null)

  const save = d => { setRecords(d); lsW(d) }
  const openNew  = () => { setForm(emptyForm()); setEditId(null); setShowForm(true) }
  const openEdit = r  => { setForm({ ...r }); setEditId(r.id); setShowForm(true) }
  const remove   = id => { if (!confirm('삭제?')) return; save(records.filter(r => r.id !== id)) }
  const fld      = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const fldImp   = (k, v) => setForm(f => ({ ...f, impactItems: { ...f.impactItems, [k]: v } }))

  const submit = () => {
    if (!form.title || !form.requestedBy)
      return alert('변경 제목과 요청자는 필수입니다.')
    const now = new Date().toISOString()
    if (editId) save(records.map(r => r.id === editId ? { ...form, id: editId } : r))
    else save([{ ...form, id: genId(), createdAt: now, createdBy: user?.name || '-' }, ...records])
    setShowForm(false)
  }

  const updateStatus = (id, newStatus) => {
    save(records.map(r => r.id === id ? { ...r, status: newStatus } : r))
  }

  // 필터
  const filtered = useMemo(() => {
    let list = [...records]
    if (typeFilter !== 'all')   list = list.filter(r => r.changeType === typeFilter)
    if (statusFilter !== 'all') list = list.filter(r => r.status === statusFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r => (r.id + r.title + r.requestedBy + r.description).toLowerCase().includes(q))
    }
    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  }, [records, typeFilter, statusFilter, search])

  // 집계
  const counts = useMemo(() => {
    const c = {}
    STATUSES.forEach(s => { c[s.value] = records.filter(r => r.status === s.value).length })
    return c
  }, [records])

  const pendingApproval = records.filter(r => r.status === 'review').length
  const implementing    = records.filter(r => r.status === 'implementing').length
  const highRisk        = records.filter(r => r.riskLevel === 'high' && !['completed','cancelled','rejected'].includes(r.status)).length

  const TABS = [
    { key: 'list',     label: '변경 목록',   icon: ClipboardList },
    { key: 'analysis', label: '현황 분석',   icon: TrendingUp },
  ]

  return (
    <AppLayout user={user} title="변경 관리" subtitle="ISO 13485 §4.1.4 / §7.3.9 · 제품·공정·문서·SW 변경 요청 · 영향평가 · 승인 · 이행 추적">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto">

        {/* 알림 배너 */}
        {(pendingApproval > 0 || highRisk > 0) && (
          <div className="flex flex-wrap gap-3 mb-5">
            {pendingApproval > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: '#DBEAFE', border: '1px solid #BFDBFE' }}>
                <Eye size={14} style={{ color: '#2563EB' }} />
                <span className="text-[13px] font-semibold" style={{ color: '#1E40AF' }}>승인 대기 {pendingApproval}건</span>
              </div>
            )}
            {highRisk > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}>
                <AlertTriangle size={14} style={{ color: '#DC2626' }} />
                <span className="text-[13px] font-semibold" style={{ color: '#991B1B' }}>고위험 변경 {highRisk}건 진행 중</span>
              </div>
            )}
          </div>
        )}

        <HubBanner
          title="변경 관리"
          subtitle="ISO 13485 §4.1.4 / §7.3.9 · 제품·공정·문서·SW 변경 · 영향평가 · 승인 · 이행 추적"
          icon={RefreshCw}
          color="#2563EB"
          quickActions={[{ label: '변경 요청 등록', icon: Plus, onClick: openNew, primary: true }]}
          workflow={['변경 요청', '영향 평가', '검토', '승인', '이행', '완료 기록']}
        />

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: '전체',      count: records.length,    color: '#6B7280' },
            { label: '승인 대기', count: counts.review || 0, color: '#2563EB' },
            { label: '이행 중',   count: counts.implementing || 0, color: '#D97706' },
            { label: '완료',      count: counts.completed || 0,    color: '#059669' },
            { label: '고위험',    count: highRisk,          color: '#DC2626' },
          ].map(s => (
            <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="text-[22px] font-bold" style={{ color: s.color }}>{s.count}</div>
              <div className="text-[10.5px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: 'var(--bg-soft)', width: 'fit-content' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition"
              style={{ background: tab === t.key ? 'var(--bg-card)' : 'transparent', color: tab === t.key ? 'var(--ink)' : 'var(--ink-faint)', border: 'none', cursor: 'pointer', boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
              <t.icon size={14} />{t.label}
            </button>
          ))}
        </div>

        {/* ── 변경 목록 탭 ── */}
        {tab === 'list' && (
          <>
            <div className="flex gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-[180px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                <Search size={14} style={{ color: 'var(--ink-faint)' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="제목 · ID · 요청자 검색..." className="flex-1 text-[13px] outline-none" style={{ background: 'none', border: 'none', color: 'var(--ink)' }} />
              </div>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 rounded-xl text-[13px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
                <option value="all">전체 유형</option>
                {CHANGE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-xl text-[13px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
                <option value="all">전체 상태</option>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <button onClick={openNew} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold" style={{ background: '#2563EB', color: 'white', border: 'none', cursor: 'pointer' }}>
                <Plus size={14} /> 변경 요청 등록
              </button>
            </div>

            {filtered.length === 0
              ? <ChangeEmpty onAdd={openNew} />
              : <div className="space-y-2">
                  {filtered.map(r => (
                    <ChangeRow key={r.id} record={r}
                      expanded={expanded === r.id}
                      onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
                      onEdit={() => openEdit(r)}
                      onDelete={() => remove(r.id)}
                      onStatusChange={updateStatus}
                    />
                  ))}
                </div>
            }
          </>
        )}

        {/* ── 현황 분석 탭 ── */}
        {tab === 'analysis' && <ChangeAnalysis records={records} counts={counts} />}

      </div>

      {showForm && (
        <ChangeForm form={form} fld={fld} fldImp={fldImp} editId={editId} user={user} onSubmit={submit} onClose={() => setShowForm(false)} />
      )}
    </AppLayout>
  )
}

// ── 변경 요청 행 ──────────────────────────────────────────────
function ChangeRow({ record: r, expanded, onToggle, onEdit, onDelete, onStatusChange }) {
  const ct = CHANGE_TYPES.find(t => t.value === r.changeType) || CHANGE_TYPES[0]
  const st = STATUSES.find(s => s.value === r.status) || STATUSES[0]
  const rl = RISK_LEVELS.find(l => l.value === r.riskLevel) || RISK_LEVELS[1]
  const CTIcon = ct.icon
  const STIcon = st.icon

  // 다음 상태 전환 버튼
  const nextActions = {
    draft:         [{ value: 'review',       label: '검토 요청' }],
    review:        [{ value: 'approved',     label: '승인' }, { value: 'rejected', label: '반려' }],
    approved:      [{ value: 'implementing', label: '이행 시작' }],
    implementing:  [{ value: 'completed',    label: '이행 완료' }],
    rejected:      [{ value: 'draft',        label: '재작성' }],
    completed:     [],
    cancelled:     [],
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: `1px solid ${r.status === 'review' ? '#BFDBFE' : r.riskLevel === 'high' && !['completed','cancelled','rejected'].includes(r.status) ? '#FECACA' : 'var(--line)'}` }}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={onToggle} style={{ borderBottom: expanded ? '1px solid var(--line)' : 'none' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${ct.color}15` }}>
          <CTIcon size={16} style={{ color: ct.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px]" style={{ color: 'var(--ink-faint)' }}>{r.id}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: `${ct.color}15`, color: ct.color }}>{ct.label}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: rl.bg, color: rl.color }}>위험: {rl.label.split(' ')[0]}</span>
          </div>
          <div className="text-[14px] font-semibold mt-0.5 truncate" style={{ color: 'var(--ink)' }}>{r.title}</div>
          <div className="text-[12px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
            요청자: {r.requestedBy} · {r.requestDate}
            {r.approver && ` · 승인자: ${r.approver}`}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* 빠른 상태 전환 버튼 */}
          {(nextActions[r.status] || []).map(a => (
            <button key={a.value} onClick={e => { e.stopPropagation(); onStatusChange(r.id, a.value) }}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold"
              style={{ background: a.value === 'approved' ? '#059669' : a.value === 'rejected' ? '#DC2626' : '#2563EB', color: 'white', border: 'none', cursor: 'pointer' }}>
              {a.label}
            </button>
          ))}
          <button onClick={e => { e.stopPropagation(); onEdit() }} className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)', border: 'none', cursor: 'pointer' }}><Edit3 size={13} /></button>
          <button onClick={e => { e.stopPropagation(); onDelete() }} className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', cursor: 'pointer' }}><Trash2 size={13} /></button>
          {expanded ? <ChevronUp size={16} style={{ color: 'var(--ink-faint)' }} /> : <ChevronDown size={16} style={{ color: 'var(--ink-faint)' }} />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <SL>변경 내용</SL>
            <div className="text-[12.5px] p-2 rounded-lg mb-2" style={{ background: 'var(--bg-soft)', color: 'var(--ink)', lineHeight: 1.6 }}>{r.description || '-'}</div>
            <SL>변경 사유</SL>
            <div className="text-[12.5px] p-2 rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink)', lineHeight: 1.6 }}>{r.reason || '-'}</div>
          </div>
          <div>
            <SL>영향 평가</SL>
            <div className="space-y-1">
              {IMPACT_ITEMS.map(item => (
                <div key={item.key} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                    style={{ background: r.impactItems?.[item.key] ? '#059669' : '#E5E7EB' }}>
                    {r.impactItems?.[item.key] && <span style={{ color: 'white', fontSize: 9, fontWeight: 'bold' }}>✓</span>}
                  </div>
                  <span className="text-[12px]" style={{ color: r.impactItems?.[item.key] ? 'var(--ink)' : 'var(--ink-faint)' }}>{item.label}</span>
                </div>
              ))}
            </div>
            {r.impactNote && <><SL>영향 평가 비고</SL><div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>{r.impactNote}</div></>}
          </div>
          <div>
            {r.approver && (
              <>
                <SL>승인 정보</SL>
                <IR k="승인자"   v={r.approver} />
                <IR k="승인일"   v={r.approvedDate} />
                {r.approvalNote && <IR k="승인 의견" v={r.approvalNote} />}
              </>
            )}
            {r.implementedDate && (
              <>
                <SL>이행 정보</SL>
                <IR k="이행 완료일" v={r.implementedDate} />
                {r.implementationNote && <IR k="이행 내용" v={r.implementationNote} />}
              </>
            )}
            {(r.linkedNcr || r.linkedCapa) && (
              <>
                <SL>연결 기록</SL>
                {r.linkedNcr  && <IR k="NCR"  v={r.linkedNcr} />}
                {r.linkedCapa && <IR k="CAPA" v={r.linkedCapa} />}
              </>
            )}
            {r.notes && <><SL>비고</SL><div className="text-[12px] p-2 rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink)' }}>{r.notes}</div></>}
          </div>
        </div>
      )}
    </div>
  )
}

function SL({ children }) { return <div className="text-[10px] font-bold mb-1 mt-2" style={{ color: 'var(--ink-faint)' }}>{children}</div> }
function IR({ k, v }) {
  return (
    <div className="flex gap-2 mb-0.5">
      <span className="text-[10.5px] flex-shrink-0" style={{ color: 'var(--ink-faint)', minWidth: 64 }}>{k}</span>
      <span className="text-[12px]" style={{ color: 'var(--ink)' }}>{v || '-'}</span>
    </div>
  )
}

// ── 현황 분석 ─────────────────────────────────────────────────
function ChangeAnalysis({ records, counts }) {
  const typeStats = CHANGE_TYPES.map(t => ({
    ...t,
    count: records.filter(r => r.changeType === t.value).length,
  }))

  const riskStats = RISK_LEVELS.map(r => ({
    ...r,
    count: records.filter(rec => rec.riskLevel === r.value).length,
  }))

  const total = records.length || 1

  // 완료율
  const completed = counts.completed || 0
  const nonDraft  = records.filter(r => r.status !== 'draft').length || 1
  const approvalRate = Math.round((completed / (records.length || 1)) * 100)

  // 규제 신고 필요 항목
  const regRequired = records.filter(r => r.impactItems?.regulatory && !['completed','cancelled'].includes(r.status))

  return (
    <div className="space-y-5">
      {/* 규제 신고 경고 */}
      {regRequired.length > 0 && (
        <div className="p-4 rounded-2xl" style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}>
          <div className="text-[13px] font-bold mb-1" style={{ color: '#991B1B' }}>⚠ 규제당국 신고 필요 변경 {regRequired.length}건</div>
          <div className="space-y-1 mt-2">
            {regRequired.map(r => (
              <div key={r.id} className="text-[12px]" style={{ color: '#7F1D1D' }}>
                • {r.id} — {r.title} ({STATUSES.find(s => s.value === r.status)?.label})
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 상태별 */}
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>상태별 현황</div>
          <div className="space-y-2">
            {STATUSES.map(s => {
              const cnt = counts[s.value] || 0
              const pct = Math.round((cnt / total) * 100)
              return (
                <div key={s.value}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[12px] font-semibold" style={{ color: s.color }}>{s.label}</span>
                    <span className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>{cnt}건 ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-soft)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: s.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 유형별 */}
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>유형별 변경 건수</div>
          <div className="space-y-2.5">
            {typeStats.sort((a,b) => b.count - a.count).map(t => {
              const pct = Math.round((t.count / total) * 100)
              const TIcon = t.icon
              return (
                <div key={t.value} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${t.color}15` }}>
                    <TIcon size={13} style={{ color: t.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-[12px] font-medium" style={{ color: 'var(--ink)' }}>{t.label}</span>
                      <span className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>{t.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-soft)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: t.color }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 위험 등급별 */}
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>위험 등급별 분포</div>
          <div className="flex items-end gap-4 justify-around h-[120px]">
            {riskStats.map(r => {
              const pct = Math.max(4, Math.round((r.count / total) * 100))
              return (
                <div key={r.value} className="flex flex-col items-center gap-1.5">
                  <span className="text-[18px] font-bold" style={{ color: r.color }}>{r.count}</span>
                  <div className="w-16 rounded-t-lg transition-all" style={{ height: `${pct}px`, background: r.color, maxHeight: 80, minHeight: 8 }} />
                  <span className="text-[10.5px] font-semibold" style={{ color: r.color }}>{r.label.split(' ')[0]}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* 요약 지표 */}
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>주요 지표</div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: '변경 완료율', value: `${approvalRate}%`, color: '#059669', sub: `${completed}/${records.length}건` },
              { label: '승인 대기', value: counts.review || 0, color: '#2563EB', sub: '검토 필요' },
              { label: '이행 중', value: counts.implementing || 0, color: '#D97706', sub: '진행 중인 변경' },
              { label: '규제 신고', value: regRequired.length, color: '#DC2626', sub: '처리 필요' },
            ].map(m => (
              <div key={m.label} className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-soft)' }}>
                <div className="text-[22px] font-bold" style={{ color: m.color }}>{m.value}</div>
                <div className="text-[11px] font-semibold mt-0.5" style={{ color: 'var(--ink)' }}>{m.label}</div>
                <div className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{m.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 변경 요청 폼 ──────────────────────────────────────────────
function ChangeForm({ form, fld, fldImp, editId, user, onSubmit, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }} onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--line)', width: '100%', maxWidth: 720, boxShadow: '0 24px 64px rgba(0,0,0,0.3)', padding: 28 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="text-[16px] font-bold" style={{ color: 'var(--ink)' }}>{editId ? '변경 요청 수정' : '변경 요청 등록'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)' }}><X size={20} /></button>
        </div>

        <div className="space-y-3">
          {/* 기본 정보 */}
          <F l="변경 제목 *"><input value={form.title} onChange={e => fld('title', e.target.value)} placeholder="변경 사항을 간략히 설명..." style={IS} className="w-full" /></F>

          <R2>
            <F l="변경 유형">
              <select value={form.changeType} onChange={e => fld('changeType', e.target.value)} style={IS} className="w-full">
                {CHANGE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label} — {t.desc}</option>)}
              </select>
            </F>
            <F l="위험 등급">
              <select value={form.riskLevel} onChange={e => fld('riskLevel', e.target.value)} style={IS} className="w-full">
                {RISK_LEVELS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </F>
          </R2>

          <R2>
            <F l="요청자 *"><input value={form.requestedBy} onChange={e => fld('requestedBy', e.target.value)} placeholder={user?.name || '이름'} style={IS} className="w-full" /></F>
            <F l="요청일"><input type="date" value={form.requestDate} onChange={e => fld('requestDate', e.target.value)} style={IS} className="w-full" /></F>
          </R2>

          <F l="변경 내용 (무엇을 어떻게 변경하는지)">
            <textarea value={form.description} onChange={e => fld('description', e.target.value)} rows={3} placeholder="현재 상태 → 변경 후 상태를 구체적으로 기술..." style={{ ...IS, resize: 'vertical' }} className="w-full" />
          </F>
          <F l="변경 사유 (왜 변경이 필요한지)">
            <textarea value={form.reason} onChange={e => fld('reason', e.target.value)} rows={2} placeholder="고객 요청, 품질 문제, 규제 요건 등..." style={{ ...IS, resize: 'vertical' }} className="w-full" />
          </F>

          {/* 영향 평가 */}
          <div className="pt-2" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="text-[12px] font-bold mb-3" style={{ color: 'var(--ink-soft)' }}>영향 평가 (해당 항목 체크)</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
              {IMPACT_ITEMS.map(item => (
                <label key={item.key} className="flex items-center gap-2 p-2 rounded-lg cursor-pointer" style={{ background: form.impactItems?.[item.key] ? '#D1FAE5' : 'var(--bg-soft)', border: `1px solid ${form.impactItems?.[item.key] ? '#A7F3D0' : 'transparent'}` }}>
                  <input type="checkbox" checked={!!form.impactItems?.[item.key]} onChange={e => fldImp(item.key, e.target.checked)} style={{ accentColor: '#059669' }} />
                  <span className="text-[11.5px]" style={{ color: 'var(--ink)' }}>{item.label}</span>
                </label>
              ))}
            </div>
            <F l="영향 평가 비고"><textarea value={form.impactNote} onChange={e => fld('impactNote', e.target.value)} rows={2} placeholder="추가 영향 내용..." style={{ ...IS, resize: 'vertical' }} className="w-full" /></F>
          </div>

          {/* 승인 / 이행 */}
          <div className="pt-2" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="text-[12px] font-bold mb-2" style={{ color: 'var(--ink-soft)' }}>승인 및 이행</div>
          </div>
          <R2>
            <F l="승인자"><input value={form.approver} onChange={e => fld('approver', e.target.value)} placeholder="승인권자 이름" style={IS} className="w-full" /></F>
            <F l="승인일"><input type="date" value={form.approvedDate} onChange={e => fld('approvedDate', e.target.value)} style={IS} className="w-full" /></F>
          </R2>
          <F l="승인 의견"><input value={form.approvalNote} onChange={e => fld('approvalNote', e.target.value)} placeholder="조건부 승인 시 조건 등..." style={IS} className="w-full" /></F>
          <R2>
            <F l="이행 완료일"><input type="date" value={form.implementedDate} onChange={e => fld('implementedDate', e.target.value)} style={IS} className="w-full" /></F>
            <F l="이행 내용 요약"><input value={form.implementationNote} onChange={e => fld('implementationNote', e.target.value)} placeholder="변경 이행 내용 간략히..." style={IS} className="w-full" /></F>
          </R2>

          {/* 연결 기록 */}
          <div className="pt-2" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="text-[12px] font-bold mb-2" style={{ color: 'var(--ink-soft)' }}>연결 기록</div>
          </div>
          <R2>
            <F l="연결 NCR ID"><input value={form.linkedNcr} onChange={e => fld('linkedNcr', e.target.value)} placeholder="예: NCR-2026-00001" style={IS} className="w-full" /></F>
            <F l="연결 CAPA ID"><input value={form.linkedCapa} onChange={e => fld('linkedCapa', e.target.value)} placeholder="예: CPA-2026-00001" style={IS} className="w-full" /></F>
          </R2>

          <R2>
            <F l="상태">
              <select value={form.status} onChange={e => fld('status', e.target.value)} style={IS} className="w-full">
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </F>
            <F l="비고"><input value={form.notes} onChange={e => fld('notes', e.target.value)} placeholder="기타 메모..." style={IS} className="w-full" /></F>
          </R2>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>취소</button>
          <button onClick={onSubmit} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: '#2563EB', color: 'white', border: 'none', cursor: 'pointer' }}>
            {editId ? '수정 저장' : '변경 요청 등록'}
          </button>
        </div>
      </div>
    </div>
  )
}

function R2({ children }) { return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div> }
function F({ l, children }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-faint)' }}>{l}</label>
      {children}
    </div>
  )
}
const IS = { border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--ink)', background: 'var(--bg-card)', outline: 'none' }

function ChangeEmpty({ onAdd }) {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <FileEdit size={48} strokeWidth={1} className="mx-auto mb-3 opacity-30" style={{ color: '#2563EB' }} />
      <div className="text-[16px] font-bold mb-1" style={{ color: 'var(--ink-soft)' }}>변경 요청 없음</div>
      <div className="text-[13px] mb-5" style={{ color: 'var(--ink-faint)' }}>제품·공정·문서 변경 요청을 등록하고 승인·이행을 체계적으로 추적하세요</div>
      <button onClick={onAdd} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: '#2563EB', color: 'white', border: 'none', cursor: 'pointer' }}>
        <Plus size={15} /> 첫 번째 변경 요청 등록
      </button>
    </div>
  )
}
