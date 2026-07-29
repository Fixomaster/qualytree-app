// src/pages/supplier/SupplierHub.jsx
// ISO 13485 §7.4.1 공급업체 관리 — ASL · 평가 · 수입검사(IQC)
import React, { useState, useMemo } from 'react'
import {
  Plus, Search, Edit3, Trash2, Star, StarOff,
  ChevronDown, ChevronUp, X, CheckCircle2,
  AlertTriangle, ShoppingCart, ClipboardCheck,
  TrendingUp, Building2, Package,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'

// ── localStorage ──────────────────────────────────────────────
const LS_SUP  = 'qualytree.suppliers'
const LS_IQC  = 'qualytree.iqc'
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
  { value: 'C', label: 'C등급 — 보통 (조건부 승인)', color: '#D97706', bg: '#FEF3C7' },
  { value: 'D', label: 'D등급 — 미흡 (승인 정지)', color: '#DC2626', bg: '#FEE2E2' },
]
const COMMON_CERTS = ['ISO 13485', 'ISO 9001', 'KGMP', 'CE 인증', 'FDA 등록', 'MDSAP', 'KC 인증', 'RoHS']
const IQC_RESULTS = [
  { value: 'pass',    label: '합격',    color: '#059669', bg: '#D1FAE5' },
  { value: 'fail',    label: '불합격',  color: '#DC2626', bg: '#FEE2E2' },
  { value: 'waiver',  label: '특채',    color: '#D97706', bg: '#FEF3C7' },
  { value: 'pending', label: '검사 중', color: '#6B7280', bg: '#F3F4F6' },
]
const EVAL_ITEMS = [
  '납기 준수율', '품질 합격률', '가격 경쟁력', '품질시스템 수준', '대응성·서비스',
]

const emptySupplier = () => ({
  name: '', code: '', category: '',
  contact: '', phone: '', email: '', address: '',
  items: '', certifications: [], notes: '',
  grade: '', status: 'pending',
})
const emptyIqc = () => ({
  supplierId: '', supplierName: '', itemName: '', lotNo: '',
  qty: '', receivedAt: new Date().toISOString().slice(0, 10),
  inspector: '', result: 'pending', failReason: '', notes: '',
})
const emptyEval = () => ({
  supplierId: '', supplierName: '', year: new Date().getFullYear(),
  scores: { '납기 준수율': 0, '품질 합격률': 0, '가격 경쟁력': 0, '품질시스템 수준': 0, '대응성·서비스': 0 },
  grade: 'B', conclusion: '', evaluatedBy: '', evaluatedAt: new Date().toISOString().slice(0, 10),
  isInitial: false,
})

function statusFromGrade(g) {
  if (g === 'D') return 'suspended'
  if (g === 'C') return 'conditional'
  return 'approved'
}
function addMonths(dateStr, months) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}
function certArray(sup) {
  if (Array.isArray(sup.certifications)) return sup.certifications
  if (sup.certifications) return String(sup.certifications).split(',').map(s => s.trim()).filter(Boolean)
  return []
}

function calcGrade(scores) {
  const vals = Object.values(scores)
  if (!vals.length) return 'B'
  const avg = vals.reduce((a, b) => a + +b, 0) / vals.length
  if (avg >= 90) return 'A'
  if (avg >= 75) return 'B'
  if (avg >= 60) return 'C'
  return 'D'
}

// ── 메인 ─────────────────────────────────────────────────────
export default function SupplierHub() {
  const user = auth.current()
  const [suppliers, setSuppliers] = useState(() => lsR(LS_SUP))
  const [iqcs,      setIqcs]      = useState(() => lsR(LS_IQC))
  const [evals,     setEvals]     = useState(() => lsR(LS_EVAL))
  const [tab,       setTab]       = useState('asl')
  const [search,    setSearch]    = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [modal,     setModal]     = useState(null) // 'supplier'|'iqc'|'eval'
  const [form,      setForm]      = useState({})
  const [editId,    setEditId]    = useState(null)
  const [expanded,  setExpanded]  = useState(null)

  // 저장
  const saveSup  = d => { setSuppliers(d); lsW(LS_SUP, d) }
  const saveIqc  = d => { setIqcs(d);      lsW(LS_IQC, d) }
  const saveEval = d => { setEvals(d);      lsW(LS_EVAL, d) }

  // 공급업체 CRUD
  const openNewSup = () => { setForm(emptySupplier()); setEditId(null); setModal('supplier') }
  const openEditSup = s => { setForm({ ...s }); setEditId(s.id); setModal('supplier') }
  const submitSup = () => {
    if (!form.name) return alert('공급업체명 필수')
    if (editId) {
      saveSup(suppliers.map(s => s.id === editId ? { ...form, id: editId } : s))
      setModal(null)
      return
    }
    const rec = { ...form, id: genId('SUP'), createdAt: new Date().toISOString() }
    saveSup([rec, ...suppliers])
    // 신규 등록 시 등급·상태는 아직 없음 — 바로 업체평가(최초 심사)로 넘어가서 등급을 매긴다
    setForm({ ...emptyEval(), supplierId: rec.id, supplierName: rec.name, evaluatedBy: user?.name || '', isInitial: true })
    setEditId(null)
    setModal('eval')
  }
  const removeSup = id => { if (!confirm('삭제?')) return; saveSup(suppliers.filter(s => s.id !== id)) }

  // IQC CRUD
  const openNewIqc = (sup) => {
    setForm({ ...emptyIqc(), supplierId: sup?.id || '', supplierName: sup?.name || '', inspector: user?.name || '' })
    setEditId(null); setModal('iqc')
  }
  const submitIqc = () => {
    if (!form.itemName) return alert('품목명 필수')
    if (editId) saveIqc(iqcs.map(i => i.id === editId ? { ...form, id: editId } : i))
    else saveIqc([{ ...form, id: genId('IQC'), createdAt: new Date().toISOString() }, ...iqcs])
    setModal(null)
  }
  const removeIqc = id => { if (!confirm('삭제?')) return; saveIqc(iqcs.filter(i => i.id !== id)) }

  // 평가 CRUD
  const openNewEval = (sup) => {
    setForm({ ...emptyEval(), supplierId: sup?.id || '', supplierName: sup?.name || '', evaluatedBy: user?.name || '' })
    setEditId(null); setModal('eval')
  }
  const submitEval = () => {
    if (!form.supplierName) return alert('공급업체 필수')
    const grade = calcGrade(form.scores)
    const status = statusFromGrade(grade)
    const record = { ...form, id: genId('EVL'), grade, createdAt: new Date().toISOString() }
    if (editId) saveEval(evals.map(e => e.id === editId ? { ...record, id: editId } : e))
    else { saveEval([record, ...evals]); saveSup(suppliers.map(s => s.id === form.supplierId ? { ...s, grade, status } : s)) }
    setModal(null)
  }

  const fld = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const fldScore = (item, v) => setForm(f => ({ ...f, scores: { ...f.scores, [item]: v } }))

  // 필터
  const filteredSup = useMemo(() => {
    let list = suppliers
    if (catFilter !== 'all') list = list.filter(s => s.category === catFilter)
    if (search) { const q = search.toLowerCase(); list = list.filter(s => (s.name + s.code + s.items).toLowerCase().includes(q)) }
    return list.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  }, [suppliers, search, catFilter])

  const filteredIqc = useMemo(() => {
    if (!search) return iqcs
    const q = search.toLowerCase()
    return iqcs.filter(i => (i.supplierName + i.itemName + i.lotNo).toLowerCase().includes(q))
  }, [iqcs, search])

  const stats = {
    total: suppliers.length,
    approved: suppliers.filter(s => s.status === 'approved').length,
    gradeA: suppliers.filter(s => s.grade === 'A').length,
    iqcThis: iqcs.filter(i => i.receivedAt?.startsWith(new Date().toISOString().slice(0, 7))).length,
    iqcFail: iqcs.filter(i => i.result === 'fail').length,
    evalDue: suppliers.filter(s => {
      const lastEval = evals.filter(e => e.supplierId === s.id).sort((a, b) => b.year - a.year)[0]
      return !lastEval || lastEval.year < new Date().getFullYear()
    }).length,
  }

  const TABS = [
    { key: 'asl',  label: '승인 공급업체 목록 (ASL)', icon: Building2 },
    { key: 'iqc',  label: '수입검사 기록 (IQC)',       icon: ClipboardCheck },
    { key: 'eval', label: '공급업체 평가',              icon: TrendingUp },
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
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          {[
            { label: '총 공급업체', count: stats.total,    color: '#6B7280' },
            { label: '승인 업체',   count: stats.approved, color: '#059669' },
            { label: 'A등급',       count: stats.gradeA,   color: '#2563EB' },
            { label: '이번 달 IQC', count: stats.iqcThis,  color: '#8B5CF6' },
            { label: 'IQC 불합격',  count: stats.iqcFail,  color: '#DC2626' },
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
            <div className="flex gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-[180px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                <Search size={14} style={{ color: 'var(--ink-faint)' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="업체명 · 코드 · 품목 검색..." className="flex-1 text-[13px] outline-none" style={{ background: 'none', border: 'none', color: 'var(--ink)' }} />
              </div>
              <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="px-3 py-2 rounded-xl text-[13px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
                <option value="all">전체 분류</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={openNewSup} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold" style={{ background: '#059669', color: 'white', border: 'none', cursor: 'pointer' }}>
                <Plus size={14} /> 공급업체 등록
              </button>
            </div>

            {filteredSup.length === 0
              ? <SupEmpty onAdd={openNewSup} />
              : <div className="space-y-2">
                  {filteredSup.map(s => (
                    <SupRow key={s.id} sup={s}
                      iqcCount={iqcs.filter(i => i.supplierId === s.id).length}
                      lastEval={evals.filter(e => e.supplierId === s.id).sort((a, b) => b.year - a.year)[0]}
                      expanded={expanded === s.id}
                      onToggle={() => setExpanded(expanded === s.id ? null : s.id)}
                      onEdit={() => openEditSup(s)}
                      onDelete={() => removeSup(s.id)}
                      onAddIqc={() => openNewIqc(s)}
                      onAddEval={() => openNewEval(s)}
                    />
                  ))}
                </div>
            }
          </>
        )}

        {/* ── IQC 탭 ── */}
        {tab === 'iqc' && (
          <>
            <div className="flex gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-[180px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                <Search size={14} style={{ color: 'var(--ink-faint)' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="업체명 · 품목 · LOT 검색..." className="flex-1 text-[13px] outline-none" style={{ background: 'none', border: 'none', color: 'var(--ink)' }} />
              </div>
              <button onClick={() => openNewIqc(null)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold" style={{ background: '#8B5CF6', color: 'white', border: 'none', cursor: 'pointer' }}>
                <Plus size={14} /> IQC 기록 추가
              </button>
            </div>
            {filteredIqc.length === 0
              ? <div className="text-center py-20" style={{ color: 'var(--ink-faint)' }}><ClipboardCheck size={40} strokeWidth={1.2} className="mx-auto mb-3 opacity-30" /><div>수입검사 기록이 없습니다</div></div>
              : <IqcTable iqcs={filteredIqc} onRemove={removeIqc} />
            }
          </>
        )}

        {/* ── 평가 탭 ── */}
        {tab === 'eval' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <div className="text-[13px]" style={{ color: 'var(--ink-faint)' }}>연간 공급업체 평가 (ISO 13485 §7.4.1)</div>
              <button onClick={() => openNewEval(null)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold" style={{ background: '#F59E0B', color: 'white', border: 'none', cursor: 'pointer' }}>
                <Plus size={14} /> 평가 추가
              </button>
            </div>
            <EvalList evals={evals} suppliers={suppliers} onRemove={id => { if (!confirm('삭제?')) return; saveEval(evals.filter(e => e.id !== id)) }} />
          </>
        )}

      </div>

      {/* 모달들 */}
      {modal === 'supplier' && <SupForm form={form} fld={fld} editId={editId} onSubmit={submitSup} onClose={() => setModal(null)} />}
      {modal === 'iqc'      && <IqcForm form={form} fld={fld} suppliers={suppliers} editId={editId} onSubmit={submitIqc} onClose={() => setModal(null)} />}
      {modal === 'eval'     && <EvalForm form={form} fld={fld} fldScore={fldScore} suppliers={suppliers} onSubmit={submitEval} onClose={() => setModal(null)} />}
    </AppLayout>
  )
}

// ── 공급업체 행 ───────────────────────────────────────────────
function SupRow({ sup, iqcCount, lastEval, expanded, onToggle, onEdit, onDelete, onAddIqc, onAddEval }) {
  const gradeInfo = GRADES.find(g => g.value === sup.grade) || { color: '#9CA3AF', bg: '#F3F4F6' }
  const statusColor = sup.status === 'approved' ? '#059669' : sup.status === 'conditional' ? '#D97706' : sup.status === 'pending' ? '#6B7280' : '#DC2626'
  const nextReeval = lastEval ? addMonths(lastEval.evaluatedAt, 12) : null

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
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ color: statusColor, background: `${statusColor}15` }}>
              {sup.status === 'approved' ? '승인' : sup.status === 'conditional' ? '조건부 승인' : sup.status === 'pending' ? '심사 대기' : '정지'}
            </span>
          </div>
          <div className="text-[14px] font-semibold mt-0.5 truncate" style={{ color: 'var(--ink)' }}>{sup.name}</div>
          <div className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--ink-faint)' }}>
            {sup.items || '공급 품목 미기재'} · IQC {iqcCount}건 · 최근 심사 {lastEval ? `${lastEval.evaluatedAt || lastEval.year}` : '미실시'}{nextReeval ? ` · 차기 심사 예정 ${nextReeval}` : ''}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={e => { e.stopPropagation(); onAddIqc() }} title="IQC 추가" className="p-1.5 rounded-lg text-[11px] font-medium" style={{ background: '#EDE9FE', color: '#7C3AED', border: 'none', cursor: 'pointer' }}>IQC</button>
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

// ── IQC 테이블 ────────────────────────────────────────────────
function IqcTable({ iqcs, onRemove }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
      <div className="grid gap-3 px-4 py-2.5 text-[11px] font-semibold" style={{ gridTemplateColumns: '100px 1fr 100px 80px 80px 70px 60px', color: 'var(--ink-faint)', borderBottom: '1px solid var(--line)', background: 'var(--bg-soft)' }}>
        <span>IQC 번호</span><span>공급업체 / 품목명</span><span>LOT 번호</span><span>수량</span><span>수입일</span><span>결과</span><span className="text-right">삭제</span>
      </div>
      {iqcs.map((i, idx) => {
        const res = IQC_RESULTS.find(r => r.value === i.result) || IQC_RESULTS[3]
        return (
          <div key={i.id} className="grid gap-3 px-4 py-3 items-center" style={{ gridTemplateColumns: '100px 1fr 100px 80px 80px 70px 60px', borderBottom: idx < iqcs.length - 1 ? '1px solid var(--line)' : 'none' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-soft)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            <span className="font-mono text-[11px]" style={{ color: 'var(--ink-faint)' }}>{i.id}</span>
            <div>
              <div className="text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>{i.supplierName || '-'}</div>
              <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{i.itemName}</div>
            </div>
            <span className="font-mono text-[11px]" style={{ color: 'var(--ink-faint)' }}>{i.lotNo || '-'}</span>
            <span className="text-[12px]" style={{ color: 'var(--ink)' }}>{i.qty || '-'}</span>
            <span className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>{i.receivedAt || '-'}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: res.bg, color: res.color }}>{res.label}</span>
            <div className="flex justify-end">
              <button onClick={() => onRemove(i.id)} className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', cursor: 'pointer' }}><Trash2 size={12} /></button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

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
      {evals.sort((a, b) => b.year - a.year || a.supplierName.localeCompare(b.supplierName, 'ko')).map(ev => {
        const gradeInfo = GRADES.find(g => g.value === ev.grade) || GRADES[1]
        const avg = Math.round(Object.values(ev.scores || {}).reduce((a, b) => a + +b, 0) / EVAL_ITEMS.length)
        return (
          <div key={ev.id} className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-[22px] font-black flex-shrink-0" style={{ background: gradeInfo.bg, color: gradeInfo.color }}>{ev.grade}</div>
                <div>
                  <div className="text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>{ev.supplierName}</div>
                  <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>{ev.year}년도 평가 · 종합 {avg}점 · 평가자: {ev.evaluatedBy}</div>
                </div>
              </div>
              <button onClick={() => onRemove(ev.id)} className="p-1.5 rounded-lg flex-shrink-0" style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', cursor: 'pointer' }}><Trash2 size={13} /></button>
            </div>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {EVAL_ITEMS.map(item => (
                <div key={item} className="text-center p-2 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
                  <div className="text-[16px] font-bold" style={{ color: +ev.scores?.[item] >= 80 ? '#059669' : +ev.scores?.[item] >= 60 ? '#D97706' : '#DC2626' }}>
                    {ev.scores?.[item] ?? '-'}
                  </div>
                  <div className="text-[9px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{item}</div>
                </div>
              ))}
            </div>
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
      <R2>
        <F label="업체명 *">
          <input value={form.name} onChange={e => fld('name', e.target.value)} placeholder="예: (주)한국부품" style={IS} className="w-full" list="sup-avl-name-list" />
          <datalist id="sup-avl-name-list">{avlSupplierNames().map(n => <option key={n} value={n} />)}</datalist>
        </F>
        <F label="업체 코드"><input value={form.code} onChange={e => fld('code', e.target.value)} placeholder="예: SUP-001" style={IS} className="w-full" /></F>
      </R2>
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
      <F label="주소"><input value={form.address} onChange={e => fld('address', e.target.value)} placeholder="서울시..." style={IS} className="w-full" /></F>
      <F label="공급 품목 (쉼표 구분)"><input value={form.items} onChange={e => fld('items', e.target.value)} placeholder="예: PCB, 커넥터, 전원모듈" style={IS} className="w-full" /></F>
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

// ── 폼 모달: IQC ─────────────────────────────────────────────
function IqcForm({ form, fld, suppliers, onSubmit, onClose }) {
  return (
    <Modal title="수입검사 기록 추가" onClose={onClose} onSubmit={onSubmit} submitColor="#8B5CF6" submitLabel="IQC 기록 저장">
      <R2>
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
        <F label="수입일"><input type="date" value={form.receivedAt} onChange={e => fld('receivedAt', e.target.value)} style={IS} className="w-full" /></F>
      </R2>
      <R2>
        <F label="품목명 *"><input value={form.itemName} onChange={e => fld('itemName', e.target.value)} placeholder="예: PCB 어셈블리" style={IS} className="w-full" /></F>
        <F label="LOT 번호"><input value={form.lotNo} onChange={e => fld('lotNo', e.target.value)} placeholder="예: LOT-2026-0001" style={IS} className="w-full" /></F>
      </R2>
      <R2>
        <F label="수량"><input value={form.qty} onChange={e => fld('qty', e.target.value)} placeholder="예: 100 EA" style={IS} className="w-full" /></F>
        <F label="검사자"><input value={form.inspector} onChange={e => fld('inspector', e.target.value)} style={IS} className="w-full" /></F>
      </R2>
      <F label="검사 결과">
        <select value={form.result} onChange={e => fld('result', e.target.value)} style={IS} className="w-full">
          {IQC_RESULTS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </F>
      {form.result === 'fail' && <F label="불합격 사유"><textarea value={form.failReason} onChange={e => fld('failReason', e.target.value)} rows={2} style={{ ...IS, resize: 'vertical' }} className="w-full" placeholder="불합격 원인 및 처리 방법..." /></F>}
      <F label="비고"><textarea value={form.notes} onChange={e => fld('notes', e.target.value)} rows={2} style={{ ...IS, resize: 'vertical' }} className="w-full" /></F>
    </Modal>
  )
}

// ── 폼 모달: 평가 ────────────────────────────────────────────
function EvalForm({ form, fld, fldScore, suppliers, onSubmit, onClose }) {
  const avg = Math.round(Object.values(form.scores || {}).reduce((a, b) => a + +b, 0) / EVAL_ITEMS.length)
  const grade = calcGrade(form.scores)
  const gradeInfo = GRADES.find(g => g.value === grade) || GRADES[1]
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
      <div className="p-4 rounded-xl" style={{ background: 'var(--bg-soft)' }}>
        <div className="text-[12px] font-bold mb-3" style={{ color: 'var(--ink-soft)' }}>평가 항목 (0~100점)</div>
        {EVAL_ITEMS.map(item => (
          <div key={item} className="flex items-center gap-3 mb-2">
            <span className="text-[12px] w-28 flex-shrink-0" style={{ color: 'var(--ink)' }}>{item}</span>
            <input type="range" min="0" max="100" step="5" value={form.scores?.[item] || 0} onChange={e => fldScore(item, +e.target.value)} className="flex-1" />
            <span className="text-[13px] font-bold w-8 text-right" style={{ color: +form.scores?.[item] >= 80 ? '#059669' : +form.scores?.[item] >= 60 ? '#D97706' : '#DC2626' }}>
              {form.scores?.[item] || 0}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
          <span className="text-[12px] font-bold" style={{ color: 'var(--ink)' }}>종합 평균: {avg}점</span>
          <span className="text-[13px] font-black px-3 py-1 rounded-lg" style={{ background: gradeInfo.bg, color: gradeInfo.color }}>
            {grade}등급
          </span>
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
