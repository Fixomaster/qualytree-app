// src/pages/change/ChangeControlHub.jsx
// ISO 13485 Â§4.1.4 / Â§7.3.9 ë³ê²½ ê´ë¦¬ â ì íÂ·ê³µì Â·ë¬¸ìÂ·ê³µê¸ìì²´ ë³ê²½ì ìí¥íê°Â·ì¹ì¸Â·ì´í ì¶ì 
//
// v2 ì¬ì¤ê³: ì´ íë©´ìì ë³ê²½ì "ìë ë±ë¡"íì§ ìëë¤.
// ì í(ê°ë°Â·ì¤ê³), ë¬¸ì(ë¬¸ìê´ë¦¬), ê³µê¸ìì²´(ê³µê¸ìì²´ê´ë¦¬) ë± ìì² íë©´ìì ì ë³´ê°
// ìì ë  ëë§ë¤ lib/changeControl.jsê° ìëì¼ë¡ CCR(ë³ê²½ê¸°ë¡)ì ë¨ê¸°ê³ ,
// ì´ íë©´ì ê·¸ CCR ëª©ë¡ì ë¶ë¬ì ìí¥íê° â ì¹ì¸/ë°ë ¤ â ì´íìë£ ì¬ì¬ë§ ìííë¤.
// ê¸°ë³¸ì ë³´(ì ëª©Â·ì íÂ·ìì²­ìÂ·ì¼ìÂ·ë´ì©Â·ì¬ì )ë ìì² ìí°í°ì ìíë¯ë¡ ì¬ê¸°ì ìê¸° ìë ¥íì§ ìëë¤.
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

// ââ ëì ìí°í° ì í ë©í (ìì² íë©´ìì ìë ê¸°ë¡ëë targetTypeë§ ì´ íë©´ì ë¸ì¶) ââ
const TARGET_META = {
  product:      { label: 'ì í ë³ê²½',     icon: Package,   color: '#2563EB', hubPath: '/products',          hubLabel: 'ê°ë°Â·ì¤ê³' },
  processBlock: { label: 'ê³µì  ë³ê²½',     icon: RefreshCw, color: '#059669', hubPath: '/manufacturing',      hubLabel: 'ìì°íí©' },
  document:     { label: 'ë¬¸ì ë³ê²½',     icon: FileText,  color: '#D97706', hubPath: '/document-control',   hubLabel: 'ë¬¸ìê´ë¦¬' },
  supplier:     { label: 'ê³µê¸ìì²´ ë³ê²½', icon: GitBranch, color: '#DC2626', hubPath: '/supplier',           hubLabel: 'ê³µê¸ìì²´ê´ë¦¬' },
}

const ACTION_LABEL = { CREATE: 'ì ê· ë±ë¡', UPDATE: 'ì ë³´ ìì ', DELETE: 'ì­ì ' }

const STATUS_META = {
  [REVIEW_STATUS.PENDING_IMPACT]:   { label: 'ìí¥íê° ëê¸°', color: '#6B7280', bg: '#F3F4F6', icon: FileEdit },
  [REVIEW_STATUS.PENDING_APPROVAL]: { label: 'ì¹ì¸ ëê¸°',     color: '#2563EB', bg: '#DBEAFE', icon: Eye },
  [REVIEW_STATUS.APPROVED]:         { label: 'ì¹ì¸(ì´íëê¸°)', color: '#059669', bg: '#D1FAE5', icon: CheckCircle2 },
  [REVIEW_STATUS.REJECTED]:         { label: 'ë°ë ¤',          color: '#DC2626', bg: '#FEE2E2', icon: XCircle },
  [REVIEW_STATUS.COMPLETED]:        { label: 'ì´í ìë£',      color: '#7C3AED', bg: '#EDE9FE', icon: CheckCircle2 },
}

const RISK_META = {
  [IMPACT_RISK_LEVEL.HIGH]:   { color: '#DC2626', bg: '#FEE2E2' },
  [IMPACT_RISK_LEVEL.MEDIUM]: { color: '#D97706', bg: '#FEF3C7' },
  [IMPACT_RISK_LEVEL.LOW]:    { color: '#059669', bg: '#D1FAE5' },
}

// ââ ë©ì¸ âââââââââââââââââââââââââââââââââââââââââââââââââââââ
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
    { key: 'list', label: 'ë³ê²½ ëª©ë¡', icon: ClipboardList },
    { key: 'analysis', label: 'íí© ë¶ì', icon: TrendingUp },
  ]

  return (
    <AppLayout user={user} title="ë³ê²½ ê´ë¦¬" subtitle="ISO 13485 Â§4.1.4 / Â§7.3.9 Â· ì íÂ·ê³µì Â·ë¬¸ìÂ·ê³µê¸ìì²´ ë³ê²½ ìí¥íê° Â· ì¹ì¸ Â· ì´í ì¶ì ">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto">

        {(counts[REVIEW_STATUS.PENDING_APPROVAL] > 0 || highRisk > 0) && (
          <div className="flex flex-wrap gap-3 mb-5">
            {counts[REVIEW_STATUS.PENDING_APPROVAL] > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: '#DBEAFE', border: '1px solid #BFDBFE' }}>
                <Eye size={14} style={{ color: '#2563EB' }} />
                <span className="text-[13px] font-semibold" style={{ color: '#1E40AF' }}>ì¹ì¸ ëê¸° {counts[REVIEW_STATUS.PENDING_APPROVAL]}ê±´</span>
              </div>
            )}
            {highRisk > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}>
                <AlertTriangle size={14} style={{ color: '#DC2626' }} />
                <span className="text-[13px] font-semibold" style={{ color: '#991B1B' }}>ê³ ìí ë³ê²½ {highRisk}ê±´ ì§í ì¤</span>
              </div>
            )}
          </div>
        )}

        <HubBanner
          title="ë³ê²½ ê´ë¦¬"
          subtitle="ì íÂ·ë¬¸ìÂ·ê³µê¸ìì²´ íë©´ìì ì ë³´ê° ìì ëë©´ ìë ëª©ë¡ì ìëì¼ë¡ ëíë©ëë¤ Â· ìí¥íê° â ì¹ì¸/ë°ë ¤ â ì´íìë£ ìì¼ë¡ ì²ë¦¬íì¸ì"
          icon={RefreshCw}
          color="#2563EB"
          workflow={['ìì² íë©´ìì ë³ê²½(ìëê¸°ë¡)', 'ìí¥ íê°', 'ì¹ì¸/ë°ë ¤', 'ì´í ìë£']}
        />

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'ì ì²´', count: ccrs.length, color: '#6B7280' },
            { label: 'ìí¥íê° ëê¸°', count: counts[REVIEW_STATUS.PENDING_IMPACT] || 0, color: '#6B7280' },
            { label: 'ì¹ì¸ ëê¸°', count: counts[REVIEW_STATUS.PENDING_APPROVAL] || 0, color: '#2563EB' },
            { label: 'ì´í ìë£', count: counts[REVIEW_STATUS.COMPLETED] || 0, color: '#7C3AED' },
            { label: 'ê³ ìí', count: highRisk, color: '#DC2626' },
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
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ëìëª Â· CCR ID Â· ì¬ì  ê²ì..." className="flex-1 text-[13px] outline-none" style={{ background: 'none', border: 'none', color: 'var(--ink)' }} />
              </div>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 rounded-xl text-[13px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
                <option value="all">ì ì²´ ì í</option>
                {Object.entries(TARGET_META).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-xl text-[13px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
                <option value="all">ì ì²´ ìí</option>
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

// ââ ë³ê²½ í­ëª© í ââââââââââââââââââââââââââââââââââââââââââââââ
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
    if (!iaForm.content?.trim()) return alert('ìí¥íê° ë´ì©ì ìë ¥íì¸ì.')
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
    if (!confirm('ì´ ë³ê²½ì ë°ë ¤íìê² ìµëê¹?')) return
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
              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: (RISK_META[ia.riskLevel] || {}).bg, color: (RISK_META[ia.riskLevel] || {}).color }}>ìí: {ia.riskLevel}</span>
            )}
          </div>
          <div className="text-[14px] font-semibold mt-0.5 truncate" style={{ color: 'var(--ink)' }}>{entityName}</div>
          <div className="text-[12px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
            {r.performedBy?.name || '-'} Â· {(r.performedAt || '').slice(0, 16).replace('T', ' ')}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <SIcon size={16} style={{ color: sm.color }} />
          {expanded ? <ChevronUp size={16} style={{ color: 'var(--ink-faint)' }} /> : <ChevronDown size={16} style={{ color: 'var(--ink-faint)' }} />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* ê¸°ë³¸ì ë³´ â ìì² ìí°í°ìì ìëì¼ë¡ ê°ì ¸ì¨ ê° (ìê¸° ìë ¥ ìì) */}
          <div>
            <SL>ë³ê²½ ì ë³´ (ìë ê¸°ë¡)</SL>
            <IR k="ëì" v={entityName} />
            <IR k="ì²ë¦¬" v={ACTION_LABEL[r.action] || r.action} />
            <IR k="ì¬ì " v={r.reason} />
            {diffKeys.length > 0 && (
              <>
                <SL>ë³ê²½ë íë</SL>
                <div className="space-y-1">
                  {diffKeys.slice(0, 8).map((k) => (
                    <div key={k} className="text-[11.5px] p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink)' }}>
                      <span className="font-semibold">{k}</span>: {String(r.diff[k]?.from ?? '-')} â {String(r.diff[k]?.to ?? '-')}
                    </div>
                  ))}
                </div>
              </>
            )}
            {r.regulations?.length > 0 && (
              <>
                <SL>ê´ë ¨ ê·ì </SL>
                <div className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>
                  {r.regulations.map((rg, i) => <div key={i}>â¢ {rg.std} {rg.clause} {rg.desc || ''}</div>)}
                </div>
              </>
            )}
          </div>

          {/* ìí¥íê° */}
          <div>
            <SL>ìí¥ íê°</SL>
            {canEditIa ? (
              <div className="space-y-2">
                <select value={iaForm.riskLevel} onChange={(e) => setIaForm((f) => ({ ...f, riskLevel: e.target.value }))} style={IS} className="w-full">
                  {Object.values(IMPACT_RISK_LEVEL).map((v) => <option key={v} value={v}>ìíë: {v}</option>)}
                </select>
                <input value={iaForm.affectedAreas} onChange={(e) => setIaForm((f) => ({ ...f, affectedAreas: e.target.value }))} placeholder="ìí¥ ë²ì (ì: ì¤ê³Â·ë°¸ë¦¬ë°ì´ìÂ·ì¸íê°...)" style={IS} className="w-full" />
                <textarea value={iaForm.content} onChange={(e) => setIaForm((f) => ({ ...f, content: e.target.value }))} rows={3} placeholder="ìí¥íê° ë´ì©..." style={{ ...IS, resize: 'vertical' }} className="w-full" />
                <textarea value={iaForm.conclusion} onChange={(e) => setIaForm((f) => ({ ...f, conclusion: e.target.value }))} rows={2} placeholder="ê²°ë¡  (ì¡°ì¹ íì ì¬ë¶ ë±)..." style={{ ...IS, resize: 'vertical' }} className="w-full" />
                <button onClick={saveImpact} className="w-full py-2 rounded-lg text-[12.5px] font-semibold" style={{ background: '#2563EB', color: 'white', border: 'none', cursor: 'pointer' }}>
                  ìí¥íê° ì ì¥ {review.status === REVIEW_STATUS.PENDING_IMPACT ? 'â ì¹ì¸ ìì²­' : '(ì¬ì ì¥)'}
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <IR k="ìíë" v={ia?.riskLevel} />
                <IR k="ìí¥ ë²ì" v={ia?.affectedAreas} />
                <div className="text-[11.5px] p-2 rounded-lg mt-1" style={{ background: 'var(--bg-soft)', color: 'var(--ink)', lineHeight: 1.6 }}>{ia?.content || '-'}</div>
                {ia?.conclusion && <div className="text-[11px] mt-1" style={{ color: 'var(--ink-faint)' }}>ê²°ë¡ : {ia.conclusion}</div>}
              </div>
            )}
          </div>

          {/* ì¹ì¸ / ì´í */}
          <div>
            <SL>ì¹ì¸ Â· ì´í</SL>
            {review.status === REVIEW_STATUS.PENDING_IMPACT && (
              <div className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>ìí¥íê°ë¥¼ ë¨¼ì  ìì±í´ì¼ ì¹ì¸ ì ì°¨ë¥¼ ì§íí  ì ììµëë¤.</div>
            )}
            {canApprove && (
              <div className="space-y-2">
                <input value={approvalNote} onChange={(e) => setApprovalNote(e.target.value)} placeholder="ì¹ì¸/ë°ë ¤ ìê²¬ (ì í)" style={IS} className="w-full" />
                <div className="flex gap-2">
                  <button onClick={doApprove} className="flex-1 py-2 rounded-lg text-[12.5px] font-semibold" style={{ background: '#059669', color: 'white', border: 'none', cursor: 'pointer' }}>ì¹ì¸ ({user_display()})</button>
                  <button onClick={doReject} className="flex-1 py-2 rounded-lg text-[12.5px] font-semibold" style={{ background: '#DC2626', color: 'white', border: 'none', cursor: 'pointer' }}>ë°ë ¤</button>
                </div>
              </div>
            )}
            {review.status === REVIEW_STATUS.REJECTED && (
              <div className="space-y-2">
                <IR k="ë°ë ¤ì" v={review.rejectedBy} />
                <IR k="ë°ë ¤ì¼ì" v={(review.rejectedAt || '').slice(0, 16).replace('T', ' ')} />
                {review.rejectionNote && <IR k="ë°ë ¤ ìê²¬" v={review.rejectionNote} />}
                <button onClick={doReopen} className="w-full py-2 rounded-lg text-[12.5px] font-semibold" style={{ background: 'var(--bg-soft)', color: 'var(--ink)', border: '1px solid var(--line)', cursor: 'pointer' }}>ìí¥íê° ì¬ìì± ìì²­</button>
              </div>
            )}
            {(review.status === REVIEW_STATUS.APPROVED || review.status === REVIEW_STATUS.COMPLETED) && (
              <>
                <IR k="ì¹ì¸ì" v={review.approvedBy} />
                <IR k="ì¹ì¸ì¼ì" v={(review.approvedAt || '').slice(0, 16).replace('T', ' ')} />
                {review.approvalNote && <IR k="ì¹ì¸ ìê²¬" v={review.approvalNote} />}
              </>
            )}
            {canImplement && (
              <div className="space-y-2 mt-2">
                <input value={implNote} onChange={(e) => setImplNote(e.target.value)} placeholder="ì´í ë´ì© ìì½ (ì í)" style={IS} className="w-full" />
                <button onClick={doComplete} className="w-full py-2 rounded-lg text-[12.5px] font-semibold" style={{ background: '#7C3AED', color: 'white', border: 'none', cursor: 'pointer' }}>ì´í ìë£ (ìë£ì¼ ìë ê¸°ë¡)</button>
              </div>
            )}
            {review.status === REVIEW_STATUS.COMPLETED && (
              <>
                <SL>ì´í ì ë³´</SL>
                <IR k="ì´íì" v={review.implementedBy} />
                <IR k="ìë£ì¼ì" v={(review.implementedAt || '').slice(0, 16).replace('T', ' ')} />
                {review.implementationNote && <IR k="ì´í ë´ì©" v={review.implementationNote} />}
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
  return u?.name || 'ë¡ê·¸ì¸ ì¬ì©ì'
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

// ââ íí© ë¶ì âââââââââââââââââââââââââââââââââââââââââââââââââ
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
          <div className="text-[13px] font-bold mb-1" style={{ color: '#991B1B' }}>â  ê·ì  ê´ë ¨ ë³ê²½ (ë¯¸ìë£) {regRequired.length}ê±´</div>
          <div className="space-y-1 mt-2">
            {regRequired.slice(0, 10).map((r) => (
              <div key={r.id} className="text-[12px]" style={{ color: '#7F1D1D' }}>
                â¢ {r.id} â {getEntityDisplayName(r.targetEid)} ({STATUS_META[getReview(r.id).status]?.label})
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>ì¬ì¬ ìíë³ íí©</div>
          <div className="space-y-2">
            {Object.entries(STATUS_META).map(([k, s]) => {
              const cnt = counts[k] || 0
              const pct = Math.round((cnt / total) * 100)
              return (
                <div key={k}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[12px] font-semibold" style={{ color: s.color }}>{s.label}</span>
                    <span className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>{cnt}ê±´ ({pct}%)</span>
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
          <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>ì íë³ ë³ê²½ ê±´ì</div>
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
              <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>ìì§ ê¸°ë¡ë ë³ê²½ì´ ììµëë¤.</div>
            )}
          </div>
        </div>

        <div className="p-5 rounded-2xl md:col-span-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>ì£¼ì ì§í</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'ì´í ìë£ì¨', value: `${completionRate}%`, color: '#7C3AED', sub: `${completedCt}/${ccrs.length}ê±´` },
              { label: 'ìí¥íê° ëê¸°', value: counts[REVIEW_STATUS.PENDING_IMPACT] || 0, color: '#6B7280', sub: 'ìì± íì' },
              { label: 'ì¹ì¸ ëê¸°', value: counts[REVIEW_STATUS.PENDING_APPROVAL] || 0, color: '#2563EB', sub: 'ì¬ì¬ íì' },
              { label: 'ì´í ëê¸°', value: counts[REVIEW_STATUS.APPROVED] || 0, color: '#059669', sub: 'ì¹ì¸ ìë£' },
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
        {hasAny ? 'ì¡°ê±´ì ë§ë ë³ê²½ í­ëª©ì´ ììµëë¤' : 'ê¸°ë¡ë ë³ê²½ì´ ììµëë¤'}
      </div>
      <div className="text-[13px]" style={{ color: 'var(--ink-faint)' }}>
        {hasAny
          ? 'ê²ìì´ë íí°ë¥¼ ì¡°ì í´ë³´ì¸ì.'
          : 'ê°ë°Â·ì¤ê³(ì í), ë¬¸ìê´ë¦¬, ê³µê¸ìì²´ê´ë¦¬ íë©´ìì ì ë³´ë¥¼ ë±ë¡Â·ìì íë©´ ì¬ê¸°ì ìëì¼ë¡ ëíë©ëë¤.'}
      </div>
    </div>
  )
}
