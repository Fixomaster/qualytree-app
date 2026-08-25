// src/pages/change/ChangeControlHub.jsx
// ISO 13485 §4.1.4 / §7.3.9 변경 관리 — 제품·공정·문서·공급업체 변경의 영향평가·승인·이행 추적
//
// v2 재설계: 이 화면에서 변경을 "수동 등록"하지 않는다.
// 제품(개발·설계), 문서(문서관리), 공급업체(공급업체관리) 등 원천 화면에서 정보가
// 수정될 때마다 lib/changeControl.js가 자동으로 CCR(변경기록)을 남기고,
// 이 화면은 그 CCR 목록을 불러와 영향평가 → 승인/반려 → 이행완료 심사만 수행한다.
// 기본정보(제목·유형·요청자·일자·내용·사유)는 원천 엔티티에 속하므로 여기서 수기 입력하지 않는다.
import React, { useState, useMemo } from 'react'
import {
  Search, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, XCircle,
  RefreshCw, FileEdit, Package, FileText, GitBranch, TrendingUp,
  ClipboardList, Eye, Clock,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'
import { requirePermission } from '../../lib/permissions'
import { getAllRecords, impactAssessments, IMPACT_RISK_LEVEL } from '../../lib/changeControl'
import { getEntityDisplayName } from '../../lib/entityRegistry'
import { changeReview, REVIEW_STATUS } from '../../lib/changeReview'

// ── 대상 엔티티 유형 메타 (원천 화면에서 자동 기록되는 targetType만 이 화면에 노출) ──
const TARGET_META = {
  product:      { label: '제품 변경',     icon: Package,   color: '#2563EB', hubPath: '/products',          hubLabel: '개발·설계' },
  processBlock: { label: '공정 변경',     icon: RefreshCw, color: '#059669', hubPath: '/manufacturing',      hubLabel: '생산현황' },
  document:     { label: '문서 변경',     icon: FileText,  color: '#D97706', hubPath: '/document-control',   hubLabel: '문서관리' },
  supplier:     { label: '공급업체 변경', icon: GitBranch, color: '#DC2626', hubPath: '/supplier',           hubLabel: '공급업체관리' },
}

const ACTION_LABEL = { CREATE: '신규 등록', UPDATE: '정보 수정', DELETE: '삭제' }

const STATUS_META = {
  [REVIEW_STATUS.PENDING_IMPACT]:   { label: '영향평가 대기', color: '#6B7280', bg: '#F3F4F6', icon: FileEdit },
  [REVIEW_STATUS.PENDING_APPROVAL]: { label: '승인 대기',     color: '#2563EB', bg: '#DBEAFE', icon: Eye },
  [REVIEW_STATUS.APPROVED]:         { label: '승인(이행대기)', color: '#059669', bg: '#D1FAE5', icon: CheckCircle2 },
  [REVIEW_STATUS.REJECTED]:         { label: '반려',          color: '#DC2626', bg: '#FEE2E2', icon: XCircle },
  [REVIEW_STATUS.COMPLETED]:        { label: '이행 완료',      color: '#7C3AED', bg: '#EDE9FE', icon: CheckCircle2 },
}

const RISK_META = {
  [IMPACT_RISK_LEVEL.HIGH]:   { color: '#DC2626', bg: '#FEE2E2' },
  [IMPACT_RISK_LEVEL.MEDIUM]: { color: '#D97706', bg: '#FEF3C7' },
  [IMPACT_RISK_LEVEL.LOW]:    { color: '#059669', bg: '#D1FAE5' },
}

// ── 메인 ─────────────────────────────────────────────────────
export default function ChangeControlHub() {
  const user = auth.current()
  const [refresh, setRefresh] = useState(0)
  const bump = () => setRefresh((t) => t + 1)

  const ccrs = useMemo(() => {
    return getAllRecords()
      .filter((r) => TARGET_META[r.targetType])
      .sort((a, b) => (b.performedAt || '').localeCompare(a.performedAt || ''))
  }, [refresh])

  const reviewMap = useMemo(() => {
    const m = {}
    changeReview.getAll().forEach((r) => { m[r.ccrId] = r })
    return m
  }, [refresh])
  const getReview = (ccrId) => reviewMap[ccrId] || { ccrId, status: REVIEW_STATUS.PENDING_IMPACT }

  const iaMap = useMemo(() => {
    const m = {}
    impactAssessments.getAll().forEach((a) => { m[a.ccrId] = a })
    return m
  }, [refresh])

  const [tab, setTab] = useState('list')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)

  const filtered = useMemo(() => {
    let list = ccrs
    if (typeFilter !== 'all') list = list.filter((r) => r.targetType === typeFilter)
    if (statusFilter !== 'all') list = list.filter((r) => getReview(r.id).status === statusFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((r) => {
        const name = getEntityDisplayName(r.targetEid) || ''
        return (r.id + name + (r.reason || '')).toLowerCase().includes(q)
      })
    }
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ccrs, typeFilter, statusFilter, search, reviewMap])

  const counts = useMemo(() => {
    const c = {}
    Object.keys(STATUS_META).forEach((s) => { c[s] = 0 })
    ccrs.forEach((r) => { const st = getReview(r.id).status; c[st] = (c[st] || 0) + 1 })
    return c
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ccrs, reviewMap])

  const highRisk = useMemo(() => ccrs.filter((r) => {
    const rv = getReview(r.id).status
    return iaMap[r.id]?.riskLevel === IMPACT_RISK_LEVEL.HIGH && rv !== REVIEW_STATUS.COMPLETED
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }).length, [ccrs, iaMap, reviewMap])

  const TABS = [
    { key: 'list', label: '변경 목록', icon: ClipboardList },
    { key: 'analysis', label: '현황 분석', icon: TrendingUp },
  ]

  return (
    <AppLayout user={user} title="변경 관리" subtitle="ISO 13485 §4.1.4 / §7.3.9 · 제품·공정·문서·공급업체 변경 영향평가 · 승인 · 이행 추적">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto">

        {(counts[REVIEW_STATUS.PENDING_APPROVAL] > 0 || highRisk > 0) && (
          <div className="flex flex-wrap gap-3 mb-5">
            {counts[REVIEW_STATUS.PENDING_APPROVAL] > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: '#DBEAFE', border: '1px solid #BFDBFE' }}>
                <Eye size={14} style={{ color: '#2563EB' }} />
                <span className="text-[13px] font-semibold" style={{ color: '#1E40AF' }}>승인 대기 {counts[REVIEW_STATUS.PENDING_APPROVAL]}건</span>
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
          subtitle="제품·문서·공급업체 화면에서 정보가 수정되면 아래 목록에 자동으로 나타납니다 · 영향평가 → 승인/반려 → 이행완료 순으로 처리하세요"
          icon={RefreshCw}
          color="#2563EB"
          workflow={['원천 화면에서 변경(자동기록)', '영향 평가', '승인/반려', '이행 완료']}
        />

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: '전체', count: ccrs.length, color: '#6B7280' },
            { label: '영향평가 대기', count: counts[REVIEW_STATUS.PENDING_IMPACT] || 0, color: '#6B7280' },
            { label: '승인 대기', count: counts[REVIEW_STATUS.PENDING_APPROVAL] || 0, color: '#2563EB' },
            { label: '이행 완료', count: counts[REVIEW_STATUS.COMPLETED] || 0, color: '#7C3AED' },
            { label: '고위험', count: highRisk, color: '#DC2626' },
          ].map((s) => (
            <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="text-[22px] font-bold" style={{ color: s.color }}>{s.count}</div>
              <div className="text-[10.5px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: 'var(--bg-soft)', width: 'fit-content' }}>
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition"
              style={{ background: tab === t.key ? 'var(--bg-card)' : 'transparent', color: tab === t.key ? 'var(--ink)' : 'var(--ink-faint)', border: 'none', cursor: 'pointer', boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
              <t.icon size={14} />{t.label}
            </button>
          ))}
        </div>

        {tab === 'list' && (
          <>
            <div className="flex gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-[180px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                <Search size={14} style={{ color: 'var(--ink-faint)' }} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="대상명 · CCR ID · 사유 검색..." className="flex-1 text-[13px] outline-none" style={{ background: 'none', border: 'none', color: 'var(--ink)' }} />
              </div>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 rounded-xl text-[13px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
                <option value="all">전체 유형</option>
                {Object.entries(TARGET_META).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-xl text-[13px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
                <option value="all">전체 상태</option>
                {Object.entries(STATUS_META).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
              </select>
            </div>

            {filtered.length === 0
              ? <ChangeEmpty hasAny={ccrs.length > 0} />
              : <div className="space-y-2">
                  {filtered.map((r) => (
                    <ChangeRow key={r.id} ccr={r}
                      review={getReview(r.id)}
                      ia={iaMap[r.id]}
                      expanded={expanded === r.id}
                      onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
                      onChanged={bump}
                    />
                  ))}
                </div>
            }
          </>
        )}

        {tab === 'analysis' && <ChangeAnalysis ccrs={ccrs} counts={counts} iaMap={iaMap} getReview={getReview} />}

      </div>
    </AppLayout>
  )
}

// ── 변경 항목 행 ──────────────────────────────────────────────
function ChangeRow({ ccr: r, review, ia, expanded, onToggle, onChanged }) {
  const tm = TARGET_META[r.targetType] || TARGET_META.product
  const sm = STATUS_META[review.status] || STATUS_META[REVIEW_STATUS.PENDING_IMPACT]
  const TIcon = tm.icon
  const SIcon = sm.icon
  const entityName = getEntityDisplayName(r.targetEid) || r.targetEid

  const [iaForm, setIaForm] = useState(() => ia || { riskLevel: IMPACT_RISK_LEVEL.LOW, affectedAreas: '', content: '', conclusion: '' })
  const [implNote, setImplNote] = useState('')
  const [approvalNote, setApprovalNote] = useState('')

  const canEditIa = review.status === REVIEW_STATUS.PENDING_IMPACT || review.status === REVIEW_STATUS.PENDING_APPROVAL
  const isSelfApproval = !!review.requestedByEmail && user?.email === review.requestedByEmail
  const canApprove = review.status === REVIEW_STATUS.PENDING_APPROVAL && !isSelfApproval
  const canImplement = review.status === REVIEW_STATUS.APPROVED

  const saveImpact = () => {
    if (!requirePermission('qms.ccr.impactAssessment.edit')) return
    if (!iaForm.content?.trim()) return alert('영향평가 내용을 입력하세요.')
    impactAssessments.upsert(r.id, iaForm)
    changeReview.submitImpact(r.id)
    onChanged()
  }
  const doApprove = () => {
    if (!requirePermission('qms.ccr.approve')) return
    changeReview.approve(r.id, approvalNote)
    onChanged()
  }
  const doReject = () => {
    if (!requirePermission('qms.ccr.approve')) return
    if (!confirm('이 변경을 반려하시겠습니까?')) return
    changeReview.reject(r.id, approvalNote)
    onChanged()
  }
  const doReopen = () => {
    changeReview.reopen(r.id)
    onChanged()
  }
  const doComplete = () => {
    if (!requirePermission('qms.ccr.implement')) return
    changeReview.complete(r.id, implNote)
    onChanged()
  }

  const diffKeys = Object.keys(r.diff || {}).filter((k) => k !== '_all')

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: `1px solid ${review.status === REVIEW_STATUS.PENDING_APPROVAL ? '#BFDBFE' : ia?.riskLevel === IMPACT_RISK_LEVEL.HIGH && review.status !== REVIEW_STATUS.COMPLETED ? '#FECACA' : 'var(--line)'}` }}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={onToggle} style={{ borderBottom: expanded ? '1px solid var(--line)' : 'none' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${tm.color}15` }}>
          <TIcon size={16} style={{ color: tm.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px]" style={{ color: 'var(--ink-faint)' }}>{r.id}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: `${tm.color}15`, color: tm.color }}>{tm.label}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: '#F3F4F6', color: '#4B5563' }}>{ACTION_LABEL[r.action] || r.action}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
            {ia?.riskLevel && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: (RISK_META[ia.riskLevel] || {}).bg, color: (RISK_META[ia.riskLevel] || {}).color }}>위험: {ia.riskLevel}</span>
            )}
          </div>
          <div className="text-[14px] font-semibold mt-0.5 truncate" style={{ color: 'var(--ink)' }}>{entityName}</div>
          <div className="text-[12px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
            {r.performedBy?.name || '-'} · {(r.performedAt || '').slice(0, 16).replace('T', ' ')}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <SIcon size={16} style={{ color: sm.color }} />
          {expanded ? <ChevronUp size={16} style={{ color: 'var(--ink-faint)' }} /> : <ChevronDown size={16} style={{ color: 'var(--ink-faint)' }} />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 기본정보 — 원천 엔티티에서 자동으로 가져온 값 (수기 입력 없음) */}
          <div>
            <SL>변경 정보 (자동 기록)</SL>
            <IR k="대상" v={entityName} />
            <IR k="처리" v={ACTION_LABEL[r.action] || r.action} />
            <IR k="사유" v={r.reason} />
            {diffKeys.length > 0 && (
              <>
                <SL>변경된 필드</SL>
                <div className="space-y-1">
                  {diffKeys.slice(0, 8).map((k) => (
                    <div key={k} className="text-[11.5px] p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink)' }}>
                      <span className="font-semibold">{k}</span>: {String(r.diff[k]?.from ?? '-')} → {String(r.diff[k]?.to ?? '-')}
                    </div>
                  ))}
                </div>
              </>
            )}
            {r.regulations?.length > 0 && (
              <>
                <SL>관련 규제</SL>
                <div className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>
                  {r.regulations.map((rg, i) => <div key={i}>• {rg.std} {rg.clause} {rg.desc || ''}</div>)}
                </div>
              </>
            )}
          </div>

          {/* 영향평가 */}
          <div>
            <SL>영향 평가</SL>
            {canEditIa ? (
              <div className="space-y-2">
                <select value={iaForm.riskLevel} onChange={(e) => setIaForm((f) => ({ ...f, riskLevel: e.target.value }))} style={IS} className="w-full">
                  {Object.values(IMPACT_RISK_LEVEL).map((v) => <option key={v} value={v}>위험도: {v}</option>)}
                </select>
                <input value={iaForm.affectedAreas} onChange={(e) => setIaForm((f) => ({ ...f, affectedAreas: e.target.value }))} placeholder="영향 범위 (예: 설계·밸리데이션·인허가...)" style={IS} className="w-full" />
                <textarea value={iaForm.content} onChange={(e) => setIaForm((f) => ({ ...f, content: e.target.value }))} rows={3} placeholder="영향평가 내용..." style={{ ...IS, resize: 'vertical' }} className="w-full" />
                <textarea value={iaForm.conclusion} onChange={(e) => setIaForm((f) => ({ ...f, conclusion: e.target.value }))} rows={2} placeholder="결론 (조치 필요 여부 등)..." style={{ ...IS, resize: 'vertical' }} className="w-full" />
                <button onClick={saveImpact} className="w-full py-2 rounded-lg text-[12.5px] font-semibold" style={{ background: '#2563EB', color: 'white', border: 'none', cursor: 'pointer' }}>
                  영향평가 저장 {review.status === REVIEW_STATUS.PENDING_IMPACT ? '→ 승인 요청' : '(재저장)'}
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <IR k="위험도" v={ia?.riskLevel} />
                <IR k="영향 범위" v={ia?.affectedAreas} />
                <div className="text-[11.5px] p-2 rounded-lg mt-1" style={{ background: 'var(--bg-soft)', color: 'var(--ink)', lineHeight: 1.6 }}>{ia?.content || '-'}</div>
                {ia?.conclusion && <div className="text-[11px] mt-1" style={{ color: 'var(--ink-faint)' }}>결론: {ia.conclusion}</div>}
              </div>
            )}
          </div>

          {/* 승인 / 이행 */}
          <div>
            <SL>승인 · 이행</SL>
            {review.status === REVIEW_STATUS.PENDING_IMPACT && (
              <div className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>영향평가를 먼저 작성해야 승인 절차를 진행할 수 있습니다.</div>
            )}
            {canApprove && (
              <div className="space-y-2">
                <input value={approvalNote} onChange={(e) => setApprovalNote(e.target.value)} placeholder="승인/반려 의견 (선택)" style={IS} className="w-full" />
                <div className="flex gap-2">
                  <button onClick={doApprove} className="flex-1 py-2 rounded-lg text-[12.5px] font-semibold" style={{ background: '#059669', color: 'white', border: 'none', cursor: 'pointer' }}>승인 ({user_display()})</button>
                  <button onClick={doReject} className="flex-1 py-2 rounded-lg text-[12.5px] font-semibold" style={{ background: '#DC2626', color: 'white', border: 'none', cursor: 'pointer' }}>반려</button>
                </div>
              </div>
            )}
            {review.status === REVIEW_STATUS.REJECTED && (
              <div className="space-y-2">
                <IR k="반려자" v={review.rejectedBy} />
                <IR k="반려일시" v={(review.rejectedAt || '').slice(0, 16).replace('T', ' ')} />
                {review.rejectionNote && <IR k="반려 의견" v={review.rejectionNote} />}
                <button onClick={doReopen} className="w-full py-2 rounded-lg text-[12.5px] font-semibold" style={{ background: 'var(--bg-soft)', color: 'var(--ink)', border: '1px solid var(--line)', cursor: 'pointer' }}>영향평가 재작성 요청</button>
              </div>
            )}
            {(review.status === REVIEW_STATUS.APPROVED || review.status === REVIEW_STATUS.COMPLETED) && (
              <>
                <IR k="승인자" v={review.approvedBy} />
                <IR k="승인일시" v={(review.approvedAt || '').slice(0, 16).replace('T', ' ')} />
                {review.approvalNote && <IR k="승인 의견" v={review.approvalNote} />}
              </>
            )}
            {canImplement && (
              <div className="space-y-2 mt-2">
                <input value={implNote} onChange={(e) => setImplNote(e.target.value)} placeholder="이행 내용 요약 (선택)" style={IS} className="w-full" />
                <button onClick={doComplete} className="w-full py-2 rounded-lg text-[12.5px] font-semibold" style={{ background: '#7C3AED', color: 'white', border: 'none', cursor: 'pointer' }}>이행 완료 (완료일 자동 기록)</button>
              </div>
            )}
            {review.status === REVIEW_STATUS.COMPLETED && (
              <>
                <SL>이행 정보</SL>
                <IR k="이행자" v={review.implementedBy} />
                <IR k="완료일시" v={(review.implementedAt || '').slice(0, 16).replace('T', ' ')} />
                {review.implementationNote && <IR k="이행 내용" v={review.implementationNote} />}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function user_display() {
  const u = auth.current()
  return u?.name || '로그인 사용자'
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
const IS = { border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--ink)', background: 'var(--bg-card)', outline: 'none' }

// ── 현황 분석 ─────────────────────────────────────────────────
function ChangeAnalysis({ ccrs, counts, iaMap, getReview }) {
  const typeStats = Object.entries(TARGET_META).map(([k, t]) => ({
    ...t, value: k,
    count: ccrs.filter((r) => r.targetType === k).length,
  }))

  const total = ccrs.length || 1
  const completedCt = counts[REVIEW_STATUS.COMPLETED] || 0
  const completionRate = Math.round((completedCt / total) * 100)

  const regRequired = ccrs.filter((r) => (r.regulations || []).length > 0 && getReview(r.id).status !== REVIEW_STATUS.COMPLETED)

  return (
    <div className="space-y-5">
      {regRequired.length > 0 && (
        <div className="p-4 rounded-2xl" style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}>
          <div className="text-[13px] font-bold mb-1" style={{ color: '#991B1B' }}>⚠ 규제 관련 변경 (미완료) {regRequired.length}건</div>
          <div className="space-y-1 mt-2">
            {regRequired.slice(0, 10).map((r) => (
              <div key={r.id} className="text-[12px]" style={{ color: '#7F1D1D' }}>
                • {r.id} — {getEntityDisplayName(r.targetEid)} ({STATUS_META[getReview(r.id).status]?.label})
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>심사 상태별 현황</div>
          <div className="space-y-2">
            {Object.entries(STATUS_META).map(([k, s]) => {
              const cnt = counts[k] || 0
              const pct = Math.round((cnt / total) * 100)
              return (
                <div key={k}>
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

        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>유형별 변경 건수</div>
          <div className="space-y-2.5">
            {typeStats.sort((a, b) => b.count - a.count).map((t) => {
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
            {typeStats.every((t) => t.count === 0) && (
              <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>아직 기록된 변경이 없습니다.</div>
            )}
          </div>
        </div>

        <div className="p-5 rounded-2xl md:col-span-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>주요 지표</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: '이행 완료율', value: `${completionRate}%`, color: '#7C3AED', sub: `${completedCt}/${ccrs.length}건` },
              { label: '영향평가 대기', value: counts[REVIEW_STATUS.PENDING_IMPACT] || 0, color: '#6B7280', sub: '작성 필요' },
              { label: '승인 대기', value: counts[REVIEW_STATUS.PENDING_APPROVAL] || 0, color: '#2563EB', sub: '심사 필요' },
              { label: '이행 대기', value: counts[REVIEW_STATUS.APPROVED] || 0, color: '#059669', sub: '승인 완료' },
            ].map((m) => (
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

function ChangeEmpty({ hasAny }) {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <FileEdit size={48} strokeWidth={1} className="mx-auto mb-3 opacity-30" style={{ color: '#2563EB' }} />
      <div className="text-[16px] font-bold mb-1" style={{ color: 'var(--ink-soft)' }}>
        {hasAny ? '조건에 맞는 변경 항목이 없습니다' : '기록된 변경이 없습니다'}
      </div>
      <div className="text-[13px]" style={{ color: 'var(--ink-faint)' }}>
        {hasAny
          ? '검색어나 필터를 조정해보세요.'
          : '개발·설계(제품), 문서관리, 공급업체관리 화면에서 정보를 등록·수정하면 여기에 자동으로 나타납니다.'}
      </div>
    </div>
  )
}
