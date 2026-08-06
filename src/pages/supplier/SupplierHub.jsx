// src/pages/supplier/SupplierHub.jsx
// ISO 13485 §7.4.1 공급업체 관리 — ASL · 평가 · 수입검사(IQC)
import React, { useState, useMemo } from 'react'
import {
  Plus, Search, Edit3, Trash2, Star, StarOff,
  ChevronDown, ChevronUp, X, CheckCircle2,
  AlertTriangle, ShoppingCart, ClipboardCheck,
  TrendingUp, Building2, Package, Settings, Info, Bell,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'
import {
  loadCriteria, saveCriteria, loadPolicy, savePolicy,
  newCriterion, newLevel, maxTotal, gradeFromPct, statusFromPct,
  nextReevalDate, scoreFromSelections, syncCriteriaToProcedureDoc,
} from '../../lib/supplierEvalCriteria'
import { commitChange, CHANGE_ACTIONS } from '../../lib/changeControl'
import { eid, ENTITY_TYPES } from '../../lib/entityRegistry'

// ── localStorage ──────────────────────────────────────────────
const LS_SUP  = 'qualytree.suppliers'
const LS_EVAL = 'qualytree.supplier_evals'

function lsR(key, fb = []) {
  try { const p = JSON.parse(localStorage.getItem(key) || 'null'); return Array.isArray(p) ? p : fb } catch { return fb }
}
function lsW(key, data) { localStorage.setItem(key, JSON.stringify(data)) }

function genId(prefix) {
  return `${prefix}-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`
}

// ── 상수 ─────────────────────────────────────────────────────
const CATEGORIES = ['원자재', '부품·반제품', '완제품', '소모품', '설비·장비', '서비스·외주', '포장재', '기타']
const GRADES     = [
  { value: 'A', label: 'A등급 — 우수', color: '#059669', bg: '#D1FAE5' },
  { value: 'B', label: 'B등급 — 양호', color: '#2563EB', bg: '#DBEAFE' },
  { value: 'C', label: 'C등급 — 보통', color: '#D97706', bg: '#FEF3C7' },
  { value: 'D', label: 'D등급 — 미흡', color: '#DC2626', bg: '#FEE2E2' },
]
const EVAL_STATUS = {
  approved:    { label: '승인',      color: '#059669', bg: '#D1FAE5' },
  conditional: { label: '조건부 승인', color: '#D97706', bg: '#FEF3C7' },
  rejected:    { label: '반려',      color: '#DC2626', bg: '#FEE2E2' },
  suspended:   { label: '정지',      color: '#DC2626', bg: '#FEE2E2' },
  pending:     { label: '심사 대기',  color: '#6B7280', bg: '#F3F4F6' },
}
const COMMON_CERTS = ['ISO 13485', 'ISO 9001', 'KGMP', 'CE 인증', 'FDA 등록', 'MDSAP', 'KC 인증', 'RoHS']
// 2-바-2 서식(주요 공급업체명·업무범위) 대응 — 관련 공정/자재를 자유텍스트가 아닌 태그로 구조화
const SUPPLY_SCOPE_TAGS = ['원자재 공급', '가공', '세척', '조립', '검사', '멸균', '포장·라벨링', '물류·배송', '기타']
const COUNTRIES = ['대한민국', '중국', '미국', '일본', '독일', '베트남', '대만', '기타']
const emptySupplier = () => ({
  name: '', code: '', category: '',
  contact: '', phone: '', email: '', address: '', country: '대한민국',
  items: '', scopeTags: [], certifications: [], notes: '',
  grade: '', status: 'pending',
})
const emptyEval = () => ({
  supplierId: '', supplierName: '', year: new Date().getFullYear(), seq: 1,
  selections: {}, // { [criterionId]: levelIndex }
  conclusion: '', evaluatedBy: '', evaluatedAt: new Date().toISOString().slice(0, 10),
  isInitial: false,
})

function certArray(sup) {
  if (Array.isArray(sup.certifications)) return sup.certifications
  if (sup.certifications) return String(sup.certifications).split(',').map(s => s.trim()).filter(Boolean)
  return []
}


// ── 메인 ─────────────────────────────────────────────────────
export default function SupplierHub() {
  const user = auth.current()
  const [suppliers, setSuppliers] = useState(() => lsR(LS_SUP))
  const [evals,     setEvals]     = useState(() => lsR(LS_EVAL))
  const [criteria,  setCriteria]  = useState(() => loadCriteria())
  const [policy,    setPolicy]    = useState(() => loadPolicy())
  const [tab,       setTab]       = useState('asl')
  const [search,    setSearch]    = useState('')
  const [approvedOnly, setApprovedOnly] = useState(false)
  const [catFilter, setCatFilter] = useState('all')
  const [modal,     setModal]     = useState(null) // 'supplier'|'iqc'|'eval'|'criteria'
  const [form,      setForm]      = useState({})
  const [editId,    setEditId]    = useState(null)
  const [expanded,  setExpanded]  = useState(null)

  // 저장
  const saveSup  = d => { setSuppliers(d); lsW(LS_SUP, d) }
  const saveEval = d => { setEvals(d);      lsW(LS_EVAL, d) }

  // 공급업체의 "현재" 등급·상태는 가장 최근(연도→회차순) 평가 결과를 그대로 반영한다.
  // (평가를 새로 추가하든 기존 평가를 삭제하든 항상 최신 평가 기준으로 재계산 — 과거엔 신규 평가 때만 반영되어
  //  재평가 결과가 낮게 나와도 업체 목록엔 이전 상태가 남는 문제가 있었다)
  const latestEvalOf = (supplierId, list) =>
    (list || evals).filter(e => e.supplierId === supplierId).sort((a, b) => (b.year - a.year) || ((b.seq || 1) - (a.seq || 1)))[0]

  const recomputeSupplierFromEvals = (supplierId, nextEvals, supplierList) => {
    const latest = latestEvalOf(supplierId, nextEvals)
    const base = supplierList || suppliers
    if (latest) return base.map(s => s.id === supplierId ? { ...s, grade: latest.grade, status: latest.status } : s)
    return base.map(s => s.id === supplierId ? { ...s, grade: '', status: 'pending' } : s)
  }

  // 공급업체 CRUD
  const openNewSup = () => { setForm(emptySupplier()); setEditId(null); setModal('supplier') }
  const openEditSup = s => { setForm({ ...s }); setEditId(s.id); setModal('supplier') }
  const submitSup = () => {
    if (!form.name) return alert('공급업체명 필수')
    if (editId) {
      const before = suppliers.find(s => s.id === editId) || null
      const after = { ...form, id: editId }
      saveSup(suppliers.map(s => s.id === editId ? after : s))
      commitChange({
        targetEid: eid(ENTITY_TYPES.SUPPLIER, editId),
        action: CHANGE_ACTIONS.UPDATE,
        before, after,
        reason: '공급업체 정보 수정',
      })
      setModal(null)
      return
    }
    const rec = { ...form, id: genId('SUP'), code: genId('SUP'), createdAt: new Date().toISOString() }
    saveSup([rec, ...suppliers])
    commitChange({
      targetEid: eid(ENTITY_TYPES.SUPPLIER, rec.id),
      action: CHANGE_ACTIONS.CREATE,
      before: null, after: rec,
      reason: '신규 공급업체 등록',
    })
    // 신규 등록 시 등급·상태는 아직 없음 — 바로 업체평가(최초 심사)로 넘어가서 등급을 매긴다
    setForm({ ...emptyEval(), supplierId: rec.id, supplierName: rec.name, evaluatedBy: user?.name || '', isInitial: true })
    setEditId(null)
    setModal('eval')
  }
  const removeSup = id => { if (!confirm('삭제?')) return; saveSup(suppliers.filter(s => s.id !== id)) }

  // 평가 CRUD
  const openNewEval = (sup) => {
    setForm({ ...emptyEval(), supplierId: sup?.id || '', supplierName: sup?.name || '', evaluatedBy: user?.name || '' })
    setEditId(null); setModal('eval')
  }
  const submitEval = () => {
    if (!form.supplierName) return alert('공급업체 필수')
    const selections = criteria.map(c => {
      const li = form.selections?.[c.id]
      const lvl = li != null ? (c.levels || [])[li] : null
      return {
        criterionId: c.id, criterionName: c.name, levelIndex: li != null ? li : null,
        levelLabel: lvl ? lvl.label : null, levelScore: lvl ? lvl.score : 0,
        levelDesc: lvl ? lvl.desc : '', maxScore: c.maxScore,
      }
    })
    if (selections.some(s => s.levelIndex == null)) return alert('모든 평가 항목에 대해 근거(등급)를 선택하세요.')
    const { total, max, pct } = scoreFromSelections(selections, criteria)
    const grade = gradeFromPct(pct)
    const status = statusFromPct(pct, policy)
    const seq = editId
      ? (form.seq || 1)
      : (evals.filter(e => e.supplierId === form.supplierId && e.year === form.year).length + 1)
    const record = { ...form, id: editId || genId('EVL'), selections, total, max, pct, grade, status, seq, updatedAt: new Date().toISOString() }
    if (!editId) record.createdAt = new Date().toISOString()
    const nextEvals = editId ? evals.map(e => e.id === editId ? record : e) : [record, ...evals]
    saveEval(nextEvals)
    saveSup(recomputeSupplierFromEvals(form.supplierId, nextEvals))
    setModal(null)
  }
  const removeEval = id => {
    if (!confirm('삭제?')) return
    const ev = evals.find(e => e.id === id)
    const nextEvals = evals.filter(e => e.id !== id)
    saveEval(nextEvals)
    if (ev) saveSup(recomputeSupplierFromEvals(ev.supplierId, nextEvals))
  }

  const fld = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const fldSelect = (criterionId, levelIndex) => setForm(f => ({ ...f, selections: { ...f.selections, [criterionId]: levelIndex } }))

  // 평가 기준·정책
  const submitCriteria = (nextCriteria, nextPolicy) => {
    saveCriteria(nextCriteria); setCriteria(nextCriteria)
    savePolicy(nextPolicy); setPolicy(nextPolicy)
    syncCriteriaToProcedureDoc(nextCriteria, nextPolicy, user?.name)
    setModal(null)
    alert('평가 기준이 저장되었습니다. 문서·규정 › 문서관리의 "공급업체 평가관리 절차서"가 자동으로 개정되었습니다.')
  }

  // 필터
  const filteredSup = useMemo(() => {
    let list = suppliers
    if (catFilter !== 'all') list = list.filter(s => s.category === catFilter)
    if (approvedOnly) list = list.filter(s => s.status === 'approved')
    if (search) { const q = search.toLowerCase(); list = list.filter(s => (s.name + s.code + s.items).toLowerCase().includes(q)) }
    return list.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  }, [suppliers, search, catFilter, approvedOnly])

  // 등급별 재평가 주기(policy.reevalYears)에 도달했거나 임박한(alertDaysBefore 이내) 공급업체 — 재평가 알림
  const todayStr = new Date().toISOString().slice(0, 10)
  const reevalAlerts = useMemo(() => suppliers.map(s => {
    const last = latestEvalOf(s.id, evals)
    if (!last) return null
    const due = nextReevalDate(last.evaluatedAt, last.grade, policy)
    if (!due) return null
    const daysLeft = Math.round((new Date(due) - new Date(todayStr)) / 86400000)
    if (daysLeft > policy.alertDaysBefore) return null
    return { supplier: s, lastEval: last, due, daysLeft }
  }).filter(Boolean).sort((a, b) => a.daysLeft - b.daysLeft), [suppliers, evals, policy, todayStr])

  const stats = {
    total: suppliers.length,
    approved: suppliers.filter(s => s.status === 'approved').length,
    gradeA: suppliers.filter(s => s.grade === 'A').length,
    evalDue: reevalAlerts.length,
  }

  const TABS = [
    { key: 'asl',  label: '공급업체 목록', icon: Building2 },
    { key: 'eval', label: '공급업체 평가',  icon: TrendingUp },
  ]

  return (
    <AppLayout user={user} title="공급업체 관리" subtitle="ISO 13485 §7.4.1 · 승인 공급업체 목록 · 수입검사 · 공급업체 평가">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto">

        <HubBanner
          title="공급업체 관리"
          subtitle="ISO 13485 §7.4.1 · 승인 공급업체 목록(ASL) · 수입검사(IQC) · 공급업체 평가"
          icon={Building2}
          color="#059669"
          quickActions={[{ label: '공급업체 등록', icon: Plus, onClick: openNewSup, primary: true }]}
          workflow={['공급업체 등록', '초기 평가', '승인 등록', '정기 재평가', 'IQC 실시', '이력 관리']}
        />

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: '총 공급업체', count: stats.total,    color: '#6B7280' },
            { label: '승인 업체',   count: stats.approved, color: '#059669' },
            { label: 'A등급',       count: stats.gradeA,   color: '#2563EB' },
            { label: '평가 필요',   count: stats.evalDue,  color: '#D97706' },
          ].map(s => (
            <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="text-[20px] font-bold" style={{ color: s.color }}>{s.count}</div>
              <div className="text-[10.5px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl overflow-x-auto" style={{ background: 'var(--bg-soft)', width: 'fit-content' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition flex-shrink-0"
              style={{ background: tab === t.key ? 'var(--bg-card)' : 'transparent', color: tab === t.key ? 'var(--ink)' : 'var(--ink-faint)', border: 'none', cursor: 'pointer', boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
              <t.icon size={14} />{t.label}
            </button>
          ))}
        </div>

        {/* ── ASL 탭 ── */}
        {tab === 'asl' && (
          <>
            {reevalAlerts.length > 0 && (
              <div className="mb-4 p-3 rounded-xl" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Bell size={14} style={{ color: '#92400E' }} />
                  <span className="text-[12.5px] font-bold" style={{ color: '#92400E' }}>재평가 알림 {reevalAlerts.length}건</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {reevalAlerts.map(a => (
                    <span key={a.supplier.id} className="text-[11.5px] px-2 py-1 rounded-lg" style={{ background: 'white', color: '#92400E', border: '1px solid #FDE68A' }}>
                      {a.supplier.name} ({a.lastEval.grade}등급) — 재평가 예정일 {a.due}{a.daysLeft < 0 ? ` (${-a.daysLeft}일 경과)` : a.daysLeft === 0 ? ' (오늘)' : ` (D-${a.daysLeft})`}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-[180px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                <Search size={14} style={{ color: 'var(--ink-faint)' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="업체명 · 코드 · 품목 검색..." className="flex-1 text-[13px] outline-none" style={{ background: 'none', border: 'none', color: 'var(--ink)' }} />
              </div>
              <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="px-3 py-2 rounded-xl text-[13px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
                <option value="all">전체 분류</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] cursor-pointer" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                <input type="checkbox" checked={approvedOnly} onChange={e => setApprovedOnly(e.target.checked)} className="accent-green-600" />
                승인된 업체만 보기
              </label>
              <button onClick={openNewSup} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold" style={{ background: '#059669', color: 'white', border: 'none', cursor: 'pointer' }}>
                <Plus size={14} /> 공급업체 등록
              </button>
            </div>

            {filteredSup.length === 0
              ? <SupEmpty onAdd={openNewSup} />
              : <div className="space-y-2">
                  {filteredSup.map(s => (
                    <SupRow key={s.id} sup={s}
                      lastEval={latestEvalOf(s.id, evals)}
                      policy={policy}
                      expanded={expanded === s.id}
                      onToggle={() => setExpanded(expanded === s.id ? null : s.id)}
                      onEdit={() => openEditSup(s)}
                      onDelete={() => removeSup(s.id)}
                      onAddEval={() => openNewEval(s)}
                    />
                  ))}
                </div>
            }
          </>
        )}

        {/* ── 평가 탭 ── */}
        {tab === 'eval' && (
          <>
            <div className="flex justify-between items-center mb-4 gap-2 flex-wrap">
              <div className="text-[13px]" style={{ color: 'var(--ink-faint)' }}>연간 공급업체 평가 (ISO 13485 §7.4.1) · 판정: {policy.approveMin}%↑ 승인 · {policy.conditionalMin}~{policy.approveMin - 1}% 조건부 승인 · {policy.conditionalMin}%↓ 반려</div>
              <div className="flex gap-2">
                <button onClick={() => setModal('criteria')} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold" style={{ background: 'var(--bg-card)', color: 'var(--ink)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                  <Settings size={14} /> 평가 기준 관리
                </button>
                <button onClick={() => openNewEval(null)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold" style={{ background: '#F59E0B', color: 'white', border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} /> 평가 추가
                </button>
              </div>
            </div>
            <EvalList evals={evals} suppliers={suppliers} onRemove={removeEval} />
          </>
        )}

      </div>

      {/* 모달들 */}
      {modal === 'supplier' && <SupForm form={form} fld={fld} editId={editId} onSubmit={submitSup} onClose={() => setModal(null)} />}
      {modal === 'eval'     && <EvalForm form={form} fld={fld} fldSelect={fldSelect} suppliers={suppliers} criteria={criteria} policy={policy} onSubmit={submitEval} onClose={() => setModal(null)} />}
      {modal === 'criteria' && <CriteriaManager criteria={criteria} policy={policy} onSubmit={submitCriteria} onClose={() => setModal(null)} />}
    </AppLayout>
  )
}

// ── 공급업체 행 ───────────────────────────────────────────────
function SupRow({ sup, lastEval, policy, expanded, onToggle, onEdit, onDelete, onAddEval }) {
  const gradeInfo = GRADES.find(g => g.value === sup.grade) || { color: '#9CA3AF', bg: '#F3F4F6' }
  const statusInfo = EVAL_STATUS[sup.status] || EVAL_STATUS.pending
  const statusColor = statusInfo.color
  const nextReeval = lastEval ? nextReevalDate(lastEval.evaluatedAt, lastEval.grade, policy) : null
  const isOverdue = nextReeval && nextReeval < new Date().toISOString().slice(0, 10)

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={onToggle} style={{ borderBottom: expanded ? '1px solid var(--line)' : 'none' }}>
        {/* 등급 배지 */}
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-[22px] font-black" style={{ background: gradeInfo.bg, color: gradeInfo.color }}>
          {sup.grade || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {sup.code && <span className="font-mono text-[10px]" style={{ color: 'var(--ink-faint)' }}>{sup.code}</span>}
            {sup.category && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>{sup.category}</span>}
            {sup.country && sup.country !== '대한민국' && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#EFF6FF', color: '#2563EB' }}>{sup.country}</span>}
            {(sup.scopeTags || []).map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#F0FDF4', color: '#059669' }}>{t}</span>)}
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ color: statusColor, background: `${statusColor}15` }}>
              {statusInfo.label}
            </span>
          </div>
          <div className="text-[14px] font-semibold mt-0.5 truncate" style={{ color: 'var(--ink)' }}>{sup.name}</div>
          <div className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--ink-faint)' }}>
            {sup.items || '공급 품목 미기재'} · 최근 심사 {lastEval ? `${lastEval.year}-${lastEval.seq || 1} (${lastEval.evaluatedAt})` : '미실시'}{nextReeval ? <span style={isOverdue ? { color: '#DC2626', fontWeight: 600 } : undefined}>{` · 차기 심사 예정 ${nextReeval}${isOverdue ? ' (기한 경과)' : ''}`}</span> : ''}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={e => { e.stopPropagation(); onEdit() }} className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)', border: 'none', cursor: 'pointer' }}><Edit3 size={13} /></button>
          <button onClick={e => { e.stopPropagation(); onDelete() }} className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', cursor: 'pointer' }}><Trash2 size={13} /></button>
          {expanded ? <ChevronUp size={16} style={{ color: 'var(--ink-faint)' }} /> : <ChevronDown size={16} style={{ color: 'var(--ink-faint)' }} />}
        </div>
      </div>
      {expanded && (
        <div className="px-4 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <SL>기본 정보</SL>
            {[['담당자', sup.contact], ['전화', sup.phone], ['이메일', sup.email], ['주소', sup.address]].map(([k, v]) => (
              <div key={k} className="flex gap-2 mb-1">
                <span className="text-[11px] w-16 flex-shrink-0" style={{ color: 'var(--ink-faint)' }}>{k}</span>
                <span className="text-[12px]" style={{ color: 'var(--ink)' }}>{v || '-'}</span>
              </div>
            ))}
          </div>
          <div>
            <SL>공급 품목 및 인증</SL>
            <div className="text-[12px] mb-2" style={{ color: 'var(--ink)' }}>{sup.items || '-'}</div>
            <SL>보유 인증</SL>
            <div className="flex flex-wrap gap-1">
              {certArray(sup).length > 0
                ? certArray(sup).map(c => <span key={c} className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: '#EFF6FF', color: '#2563EB' }}>{c}</span>)
                : <span className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>-</span>}
            </div>
          </div>
          {sup.notes && <div className="md:col-span-2"><SL>비고</SL><div className="text-[12px] p-2 rounded-lg" style={{ background: 'var(--bg-soft)' }}>{sup.notes}</div></div>}
          <div className="md:col-span-2 flex gap-2">
            <button onClick={onAddEval} className="px-3 py-1.5 rounded-lg text-[12px] font-medium" style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', cursor: 'pointer' }}>
              ★ 평가 추가
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SL({ children }) { return <div className="text-[10.5px] font-bold mb-1 mt-1" style={{ color: 'var(--ink-faint)' }}>{children}</div> }

// ── 평가 목록 ─────────────────────────────────────────────────
function EvalList({ evals, suppliers, onRemove }) {
  if (evals.length === 0) {
    return (
      <div className="text-center py-20" style={{ color: 'var(--ink-faint)' }}>
        <TrendingUp size={40} strokeWidth={1.2} className="mx-auto mb-3 opacity-30" />
        <div>연간 공급업체 평가를 실시하고 기록을 추가하세요</div>
        <div className="text-[12px] mt-1">ISO 13485은 공급업체를 정기적으로 평가하고 기록을 유지할 것을 요구합니다</div>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {[...evals].sort((a, b) => b.year - a.year || (b.seq || 1) - (a.seq || 1) || a.supplierName.localeCompare(b.supplierName, 'ko')).map(ev => {
        const gradeInfo = GRADES.find(g => g.value === ev.grade) || GRADES[1]
        const statusInfo = EVAL_STATUS[ev.status] || EVAL_STATUS.pending
        const pct = ev.pct ?? (ev.max ? Math.round((ev.total / ev.max) * 100) : 0)
        return (
          <div key={ev.id} className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-[22px] font-black flex-shrink-0" style={{ background: gradeInfo.bg, color: gradeInfo.color }}>{ev.grade}</div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>{ev.supplierName}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ color: statusInfo.color, background: `${statusInfo.color}15` }}>{statusInfo.label}</span>
                  </div>
                  <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>
                    {ev.year}-{ev.seq || 1}차 평가 · 종합 {ev.total ?? '-'}/{ev.max ?? '-'}점 ({pct}%) · 평가자: {ev.evaluatedBy} · {ev.evaluatedAt}
                  </div>
                </div>
              </div>
              <button onClick={() => onRemove(ev.id)} className="p-1.5 rounded-lg flex-shrink-0" style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', cursor: 'pointer' }}><Trash2 size={13} /></button>
            </div>
            {Array.isArray(ev.selections) && ev.selections.length > 0 && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                {ev.selections.map(s => (
                  <div key={s.criterionId} className="p-2 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11.5px] font-semibold" style={{ color: 'var(--ink)' }}>{s.criterionName}</span>
                      <span className="text-[12px] font-bold" style={{ color: s.levelScore >= s.maxScore * 0.75 ? '#059669' : s.levelScore >= s.maxScore * 0.5 ? '#D97706' : '#DC2626' }}>
                        {s.levelLabel} {s.levelScore}/{s.maxScore}점
                      </span>
                    </div>
                    {s.levelDesc && <div className="text-[10.5px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>근거: {s.levelDesc}</div>}
                  </div>
                ))}
              </div>
            )}
            {ev.conclusion && <div className="mt-2 text-[12px] p-2 rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>{ev.conclusion}</div>}
          </div>
        )
      })}
    </div>
  )
}

// ── 폼 모달: 공급업체 ──────────────────────────────────────────
function avlSupplierNames() {
  try {
    const raw = localStorage.getItem('qms_pur_avl')
    if (!raw) return []
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list.map(a => a.name).filter(Boolean) : []
  } catch { return [] }
}

function CertPicker({ value, onChange }) {
  const list = Array.isArray(value) ? value : []
  const [custom, setCustom] = useState('')
  const toggle = c => { onChange(list.includes(c) ? list.filter(x => x !== c) : [...list, c]) }
  const addCustom = () => {
    const v = custom.trim()
    if (!v) return
    if (!list.includes(v)) onChange([...list, v])
    setCustom('')
  }
  return (
    <div>
      <div className="text-[10.5px] mb-1.5" style={{ color: 'var(--ink-faint)' }}>기본 목록에서 선택하거나 직접 입력하세요 (복수 선택 가능)</div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {COMMON_CERTS.map(c => (
          <button key={c} type="button" onClick={() => toggle(c)}
            className="px-2.5 py-1 rounded-lg text-[11.5px] font-medium transition"
            style={{
              background: list.includes(c) ? '#D1FAE5' : 'var(--bg-soft)',
              color: list.includes(c) ? '#059669' : 'var(--ink-faint)',
              border: `1px solid ${list.includes(c) ? '#6EE7B7' : 'var(--line)'}`,
              cursor: 'pointer',
            }}>
            {list.includes(c) ? '✓ ' : ''}{c}
          </button>
        ))}
      </div>
      <div className="flex gap-2 mb-2">
        <input value={custom} onChange={e => setCustom(e.target.value)} placeholder="목록에 없는 인증서 직접 입력..."
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
          style={IS} className="flex-1" />
        <button type="button" onClick={addCustom} className="px-3 rounded-lg text-[12px] font-semibold" style={{ background: 'var(--bg-soft)', color: 'var(--ink)', border: '1px solid var(--line)', cursor: 'pointer' }}>추가</button>
      </div>
      {list.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {list.map(c => (
            <span key={c} className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium" style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>
              {c}
              <button type="button" onClick={() => onChange(list.filter(x => x !== c))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563EB', lineHeight: 1, fontSize: 13 }}>×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function SupForm({ form, fld, editId, onSubmit, onClose }) {
  return (
    <Modal title={editId ? '공급업체 수정' : '공급업체 등록'} onClose={onClose} onSubmit={onSubmit} submitColor="#059669" submitLabel={editId ? '수정 저장' : '공급업체 등록 → 최초 심사 진행'}>
      <F label="업체명 *">
        <input value={form.name} onChange={e => fld('name', e.target.value)} placeholder="예: (주)한국부품" style={IS} className="w-full" list="sup-avl-name-list" />
        <datalist id="sup-avl-name-list">{avlSupplierNames().map(n => <option key={n} value={n} />)}</datalist>
      </F>
      <F label="분류">
        <select value={form.category} onChange={e => fld('category', e.target.value)} style={IS} className="w-full">
          <option value="">선택...</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </F>
      <R2>
        <F label="담당자"><input value={form.contact} onChange={e => fld('contact', e.target.value)} placeholder="담당자명" style={IS} className="w-full" /></F>
        <F label="전화"><input value={form.phone} onChange={e => fld('phone', e.target.value)} placeholder="02-0000-0000" style={IS} className="w-full" /></F>
      </R2>
      <F label="이메일"><input value={form.email} onChange={e => fld('email', e.target.value)} placeholder="contact@supplier.com" style={IS} className="w-full" /></F>
      <R2>
        <F label="주소"><input value={form.address} onChange={e => fld('address', e.target.value)} placeholder="서울시..." style={IS} className="w-full" /></F>
        <F label="국가">
          <select value={form.country || '대한민국'} onChange={e => fld('country', e.target.value)} style={IS} className="w-full">
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </F>
      </R2>
      <F label="공급 품목 (쉼표 구분)"><input value={form.items} onChange={e => fld('items', e.target.value)} placeholder="예: PCB, 커넥터, 전원모듈" style={IS} className="w-full" /></F>
      <F label="관련 공정/자재 (GMP 신청서 2-바-2 서식 대응 — 해당 공정 모두 선택)">
        <div className="flex flex-wrap gap-1.5">
          {SUPPLY_SCOPE_TAGS.map(tag => {
            const on = (form.scopeTags || []).includes(tag)
            return (
              <button key={tag} type="button"
                onClick={() => fld('scopeTags', on ? (form.scopeTags || []).filter(t => t !== tag) : [...(form.scopeTags || []), tag])}
                className="text-[11.5px] px-2.5 py-1 rounded-full"
                style={{ border: '1px solid ' + (on ? '#059669' : '#E5E7EB'), background: on ? '#D1FAE5' : '#fff', color: on ? '#059669' : '#6B7280', cursor: 'pointer' }}>
                {tag}
              </button>
            )
          })}
        </div>
      </F>
      <F label="보유 인증"><CertPicker value={form.certifications} onChange={v => fld('certifications', v)} /></F>
      {!editId && (
        <div className="text-[11.5px] p-3 rounded-xl" style={{ background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0' }}>
          등급 · 심사일 · 승인 상태는 여기서 입력하지 않습니다. 등록을 완료하면 바로 이어지는 업체평가(최초 심사)에서 자동으로 결정됩니다.
        </div>
      )}
      <F label="비고"><textarea value={form.notes} onChange={e => fld('notes', e.target.value)} rows={2} style={{ ...IS, resize: 'vertical' }} className="w-full" /></F>
    </Modal>
  )
}

// ── 폼 모달: 평가 ────────────────────────────────────────────
function EvalForm({ form, fld, fldSelect, suppliers, criteria, policy, onSubmit, onClose }) {
  const selections = criteria.map(c => {
    const li = form.selections?.[c.id]
    const lvl = li != null ? (c.levels || [])[li] : null
    return { criterionId: c.id, criterionName: c.name, levelIndex: li != null ? li : null, levelScore: lvl ? lvl.score : 0, maxScore: c.maxScore }
  })
  const answeredCount = selections.filter(s => s.levelIndex != null).length
  const { total, max, pct } = scoreFromSelections(selections, criteria)
  const grade = gradeFromPct(pct)
  const status = statusFromPct(pct, policy)
  const statusInfo = EVAL_STATUS[status] || EVAL_STATUS.pending
  const gradeInfo = GRADES.find(g => g.value === grade) || GRADES[1]
  const allAnswered = answeredCount === criteria.length
  return (
    <Modal title={form.isInitial ? '업체평가 (최초 심사)' : '공급업체 평가'} onClose={onClose} onSubmit={onSubmit} submitColor="#F59E0B" submitLabel={form.isInitial ? '최초 심사 저장 · 등급 확정' : '평가 저장'}>
      {form.isInitial && (
        <div className="text-[12px] p-3 rounded-xl" style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}>
          신규 등록된 업체입니다. 이 최초 심사 결과에 따라 등급과 승인 상태가 자동으로 결정됩니다.
        </div>
      )}
      <R2>
        {form.isInitial ? (
          <F label="공급업체"><div style={{ ...IS, background: 'var(--bg-soft)' }} className="w-full">{form.supplierName}</div></F>
        ) : (
          <F label="공급업체">
            <select value={form.supplierId} onChange={e => {
              const s = suppliers.find(s => s.id === e.target.value)
              fld('supplierId', e.target.value)
              if (s) fld('supplierName', s.name)
            }} style={IS} className="w-full">
              <option value="">선택...</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </F>
        )}
        <F label="평가 연도"><input type="number" value={form.year} onChange={e => fld('year', +e.target.value)} min="2020" max="2030" style={IS} className="w-full" /></F>
      </R2>
      <div className="text-[11px] p-2.5 rounded-lg" style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
        각 항목마다 <b>왜 그 점수를 주는지 근거(등급)</b>를 선택하세요. 임의로 점수를 매기지 않고, 근거에 해당하는 등급을 고르면 배점이 자동 반영됩니다.
      </div>
      <div className="space-y-3">
        {criteria.map(c => {
          const li = form.selections?.[c.id]
          return (
            <div key={c.id} className="p-3 rounded-xl" style={{ background: 'var(--bg-soft)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12.5px] font-bold" style={{ color: 'var(--ink)' }}>{c.name}</span>
                <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>배점 {c.maxScore}점</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {(c.levels || []).map((lvl, i) => (
                  <label key={i} className="flex items-start gap-2 p-2 rounded-lg cursor-pointer transition"
                    style={{ background: li === i ? '#FEF3C7' : 'var(--bg-card)', border: `1px solid ${li === i ? '#F59E0B' : 'var(--line)'}` }}>
                    <input type="radio" name={`crit-${c.id}`} checked={li === i} onChange={() => fldSelect(c.id, i)} className="mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11.5px] font-semibold" style={{ color: 'var(--ink)' }}>{lvl.label}</span>
                        <span className="text-[11px] font-bold" style={{ color: '#D97706' }}>{lvl.score}점</span>
                      </div>
                      {lvl.desc && <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{lvl.desc}</div>}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <div className="p-4 rounded-xl" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[12px] font-bold" style={{ color: 'var(--ink)' }}>종합 점수: {total}/{max}점 ({pct}%)</span>
          <span className="text-[13px] font-black px-3 py-1 rounded-lg" style={{ background: gradeInfo.bg, color: gradeInfo.color }}>{grade}등급</span>
          <span className="text-[12px] font-bold px-3 py-1 rounded-lg" style={{ background: statusInfo.bg, color: statusInfo.color }}>{statusInfo.label}</span>
          {!allAnswered && <span className="text-[11px] font-semibold" style={{ color: '#DC2626' }}>{criteria.length - answeredCount}개 항목 미평가 — 모든 항목의 근거를 선택해야 저장할 수 있습니다</span>}
        </div>
      </div>
      <R2>
        <F label="평가자"><input value={form.evaluatedBy} onChange={e => fld('evaluatedBy', e.target.value)} style={IS} className="w-full" /></F>
        <F label="평가일"><input type="date" value={form.evaluatedAt} onChange={e => fld('evaluatedAt', e.target.value)} style={IS} className="w-full" /></F>
      </R2>
      <F label="종합 의견"><textarea value={form.conclusion} onChange={e => fld('conclusion', e.target.value)} rows={3} style={{ ...IS, resize: 'vertical' }} className="w-full" placeholder="공급업체 평가 종합 의견 및 향후 방향..." /></F>
    </Modal>
  )
}

// ── 폼 모달: 평가 기준 관리 ────────────────────────────────────
function CriteriaManager({ criteria, policy, onSubmit, onClose }) {
  const [list, setList] = useState(() => criteria.map(c => ({ ...c, levels: c.levels.map(l => ({ ...l })) })))
  const [pol, setPol] = useState(() => ({ ...policy, reevalYears: { ...policy.reevalYears } }))

  const updCrit = (idx, patch) => setList(l => l.map((c, i) => i === idx ? { ...c, ...patch } : c))
  const updLevel = (ci, li, patch) => setList(l => l.map((c, i) => i === ci ? { ...c, levels: c.levels.map((lv, j) => j === li ? { ...lv, ...patch } : lv) } : c))
  const addLevel = ci => setList(l => l.map((c, i) => i === ci ? { ...c, levels: [...c.levels, newLevel()] } : c))
  const removeLevel = (ci, li) => setList(l => l.map((c, i) => i === ci ? { ...c, levels: c.levels.filter((_, j) => j !== li) } : c))
  const addCriterion = () => setList(l => [...l, newCriterion()])
  const removeCriterion = idx => setList(l => l.filter((_, i) => i !== idx))

  const total = maxTotal(list)
  const valid = list.length > 0 && list.every(c => c.name.trim() && c.levels.length > 0)

  return (
    <Modal title="평가 기준 관리" onClose={onClose} onSubmit={() => valid && onSubmit(list, pol)} submitColor="#059669" submitLabel="저장 → 절차서 자동 개정">
      <div className="text-[11.5px] p-3 rounded-xl" style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
        여기서 정한 평가 항목·배점·근거(루브릭)가 실제 "공급업체 평가" 화면의 평가 기준으로 사용됩니다.
        저장하면 문서·규정 › 문서관리의 <b>"공급업체 평가관리 절차서"</b>가 자동으로 개정(리비전 증가)됩니다.
      </div>

      <div className="space-y-3">
        {list.map((c, ci) => (
          <div key={c.id} className="p-3 rounded-xl" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
            <div className="flex items-center gap-2 mb-2">
              <input value={c.name} onChange={e => updCrit(ci, { name: e.target.value })} placeholder="평가 항목명 (예: 납기 준수율)" style={IS} className="flex-1" />
              <input type="number" value={c.maxScore} onChange={e => updCrit(ci, { maxScore: +e.target.value })} style={{ ...IS, width: 72 }} />
              <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>점</span>
              <button onClick={() => removeCriterion(ci)} className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', cursor: 'pointer' }}><Trash2 size={13} /></button>
            </div>
            <div className="space-y-1.5">
              {c.levels.map((lvl, li) => (
                <div key={li} className="flex items-center gap-1.5">
                  <input value={lvl.label} onChange={e => updLevel(ci, li, { label: e.target.value })} placeholder="등급명(우수/양호..)" style={{ ...IS, width: 90 }} />
                  <input type="number" value={lvl.score} onChange={e => updLevel(ci, li, { score: +e.target.value })} style={{ ...IS, width: 60 }} />
                  <input value={lvl.desc} onChange={e => updLevel(ci, li, { desc: e.target.value })} placeholder="이 점수를 주는 근거(설명)" style={IS} className="flex-1" />
                  <button onClick={() => removeLevel(ci, li)} className="p-1 rounded" style={{ background: 'none', color: '#DC2626', border: 'none', cursor: 'pointer' }}><X size={13} /></button>
                </div>
              ))}
              <button onClick={() => addLevel(ci)} className="text-[11px] font-semibold px-2 py-1 rounded-lg" style={{ background: 'var(--bg-card)', color: 'var(--ink-faint)', border: '1px solid var(--line)', cursor: 'pointer' }}>+ 근거 등급 추가</button>
            </div>
          </div>
        ))}
        <button onClick={addCriterion} className="w-full py-2 rounded-xl text-[12.5px] font-semibold" style={{ background: 'var(--bg-soft)', color: 'var(--ink)', border: '1px dashed var(--line)', cursor: 'pointer' }}>+ 평가 항목 추가</button>
      </div>

      <div className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>총 배점: {total}점 (종합 점수는 취득점수 ÷ 총배점 × 100%로 환산됩니다)</div>

      <div className="p-3 rounded-xl" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
        <div className="text-[12px] font-bold mb-2" style={{ color: 'var(--ink)' }}>판정 정책</div>
        <R2>
          <F label="승인 기준 (이 %(퍼센트) 이상)"><input type="number" value={pol.approveMin} onChange={e => setPol(p => ({ ...p, approveMin: +e.target.value }))} style={IS} className="w-full" /></F>
          <F label="조건부 승인 기준 (이 %(퍼센트) 이상)"><input type="number" value={pol.conditionalMin} onChange={e => setPol(p => ({ ...p, conditionalMin: +e.target.value }))} style={IS} className="w-full" /></F>
        </R2>
        <div className="text-[11px] mt-1" style={{ color: 'var(--ink-faint)' }}>
          {pol.approveMin}%↑ 승인 · {pol.conditionalMin}~{pol.approveMin - 1}% 조건부 승인 · {pol.conditionalMin}% 미만 반려
        </div>
        <div className="text-[12px] font-bold mt-3 mb-2" style={{ color: 'var(--ink)' }}>등급별 재평가 주기 (년)</div>
        <div className="grid grid-cols-4 gap-2">
          {['A', 'B', 'C', 'D'].map(g => (
            <F key={g} label={`${g}등급`}>
              <input type="number" min="1" value={pol.reevalYears[g] || 1} onChange={e => setPol(p => ({ ...p, reevalYears: { ...p.reevalYears, [g]: +e.target.value } }))} style={IS} className="w-full" />
            </F>
          ))}
        </div>
        <F label="재평가 예정일 며칠 전부터 알림 표시">
          <input type="number" value={pol.alertDaysBefore} onChange={e => setPol(p => ({ ...p, alertDaysBefore: +e.target.value }))} style={IS} className="w-full" />
        </F>
      </div>
      {!valid && <div className="text-[11.5px] font-semibold" style={{ color: '#DC2626' }}>모든 평가 항목에 이름과 근거 등급이 최소 1개 이상 있어야 저장할 수 있습니다.</div>}
    </Modal>
  )
}

// ── 공통 컴포넌트 ─────────────────────────────────────────────
function Modal({ title, children, onClose, onSubmit, submitColor, submitLabel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px', overflowY: 'auto' }} onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--line)', width: '100%', maxWidth: 640, boxShadow: '0 24px 64px rgba(0,0,0,0.3)', padding: 28 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="text-[16px] font-bold" style={{ color: 'var(--ink)' }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)' }}><X size={20} /></button>
        </div>
        <div className="space-y-3">{children}</div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>취소</button>
          <button onClick={onSubmit} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: submitColor, color: 'white', border: 'none', cursor: 'pointer' }}>{submitLabel}</button>
        </div>
      </div>
    </div>
  )
}
function R2({ children }) { return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div> }
function F({ label, children }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-faint)' }}>{label}</label>
      {children}
    </div>
  )
}
const IS = { border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--ink)', background: 'var(--bg-card)', outline: 'none' }

function SupEmpty({ onAdd }) {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <Building2 size={48} strokeWidth={1} className="mx-auto mb-3 opacity-30" style={{ color: '#059669' }} />
      <div className="text-[16px] font-bold mb-1" style={{ color: 'var(--ink-soft)' }}>승인 공급업체 없음</div>
      <div className="text-[13px] mb-5" style={{ color: 'var(--ink-faint)' }}>ISO 13485 §7.4.1에 따라 승인 공급업체 목록(ASL)을 관리하세요</div>
      <button onClick={onAdd} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: '#059669', color: 'white', border: 'none', cursor: 'pointer' }}>
        <Plus size={15} /> 첫 번째 공급업체 등록
      </button>
    </div>
  )
}
