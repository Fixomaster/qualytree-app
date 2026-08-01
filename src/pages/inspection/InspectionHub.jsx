// src/pages/inspection/InspectionHub.jsx
// ISO 13485 §8.2.3 공정 중 검사 / §8.2.4 최종 제품 검사 관리
import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, Trash2, X, ChevronDown, ChevronUp, Edit3,
  CheckCircle2, XCircle, AlertTriangle, ClipboardList,
  TrendingUp, Microscope, FlaskConical, Package, BarChart2,
  FileWarning, BadgeCheck, ExternalLink,
  ClipboardCheck,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'
import { onboarding } from '../../lib/onboardingState'
import { INSP_TYPES, deriveInspectionStandards } from '../../lib/inspectionStandardConstants'

// ── localStorage ──────────────────────────────────────────────
const LS_INS = 'qualytree.inspections'
function lsR(k) { try { return JSON.parse(localStorage.getItem(k) || '[]') } catch { return [] } }
function lsW(k, d) { localStorage.setItem(k, JSON.stringify(d)) }
function genInsId() { return `INS-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }

// ── 상수 ─────────────────────────────────────────────────────

const VERDICTS = [
  { value: 'pass',        label: '합격',     color: '#059669', bg: '#D1FAE5', icon: CheckCircle2 },
  { value: 'conditional', label: '조건부합격', color: '#D97706', bg: '#FEF3C7', icon: AlertTriangle },
  { value: 'fail',        label: '불합격',   color: '#DC2626', bg: '#FEE2E2', icon: XCircle },
  { value: 'pending',     label: '검사 중',  color: '#6B7280', bg: '#F3F4F6', icon: ClipboardList },
]

const PROCESS_STEPS = ['원자재 입고', '절단/가공', '성형/조립', '용접/접합', '표면처리', '검교정', '포장', '최종검사', '출하']

// 표준 검사기준서가 없는 제품에 적용할 기본 최종검사 항목
const DEFAULT_FQC_CHECKLIST = ['외관 검사', '치수/규격 확인', '기능 동작 시험', '표시사항(라벨) 확인', '포장 상태 확인']

// 검사 항목 판정 상태(구버전 boolean 값과 신버전 3단계 문자열 값을 모두 지원)
function ciState(ci) {
  if (ci.ok === true || ci.ok === 'true' || ci.ok === 'pass') return 'pass'
  if (ci.ok === false || ci.ok === 'false' || ci.ok === 'fail') return 'fail'
  if (ci.ok === 'conditional') return 'conditional'
  return null
}
function loadWos() {
  try { return JSON.parse(localStorage.getItem('qms_mfg_wo') || '[]') } catch { return [] }
}
function loadProcRecords() {
  try { return JSON.parse(localStorage.getItem('qms_mfg_proc') || '[]') } catch { return [] }
}

const emptyForm = () => ({
  inspType: 'ipc', productName: '', productCode: '', lotNo: '', woId: '',
  sampleSize: '', inspectedQty: '', defectQty: '',
  inspDate: new Date().toISOString().slice(0, 10),
  inspector: '', processStep: '', standardId: '',
  checkItems: [],          // [{ name, spec, result, ok }]
  verdict: 'pending', conditionNote: '', ncrId: '',
  notes: '',
})

// ── 메인 ─────────────────────────────────────────────────────
export default function InspectionHub() {
  const user = auth.current()
  const [records, setRecords] = useState(() => lsR(LS_INS))
  const [tab, setTab] = useState('records')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [verdictFilter, setVerdictFilter] = useState('all')
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState(emptyForm())
  const [editId, setEditId]       = useState(null)
  const [expanded, setExpanded]   = useState(null)
  const navigate = useNavigate()

  // 검사 기준서 — 제품 개발(설계단계)에서 작성한 값을 그대로 파생 조회 (SSoT: 제품 레코드)
  const standards = useMemo(() => deriveInspectionStandards(onboarding.load()?.products || []), [])
  const goToProduct  = (productId) => navigate('/products?tab=product&productId=' + encodeURIComponent(productId) + '&detailTab=info')
  const goToProducts = () => navigate('/products?tab=product')

  // 생산 완료 → 최종검사 대기 목록 (WO 상태가 '완료'이고 아직 최종검사 기록이 없는 작업지시)
  const wos = useMemo(() => loadWos(), [])
  const procRecords = useMemo(() => loadProcRecords(), [])
  const waitingWos = useMemo(
    () => wos.filter(w => w.status === '완료' && !records.some(r => r.woId === w.id)),
    [wos, records]
  )

  function openFinal(w) {
    const std = standards.find(s => (s.productName || '').trim() === (w.product || '').trim())
    const items = std && (std.checkItems || []).length
      ? std.checkItems.map(ci => ({ name: ci.name, spec: ci.spec, result: '', ok: null }))
      : DEFAULT_FQC_CHECKLIST.map(name => ({ name, spec: '', result: '', ok: null }))
    setForm({
      ...emptyForm(),
      inspType: 'fqc',
      productName: w.product,
      productCode: std?.productCode || '',
      woId: w.id,
      inspDate: new Date().toISOString().slice(0, 10),
      inspector: user?.name || '',
      processStep: '최종검사',
      standardId: std?.id || '',
      checkItems: items,
    })
    setEditId(null)
    setShowForm(true)
  }

  const saveRec = d => { setRecords(d); lsW(LS_INS, d) }

  const openNew      = () => { setForm(emptyForm()); setEditId(null); setShowForm(true) }
  const openEdit     = r  => { setForm({ ...r, checkItems: r.checkItems || [] }); setEditId(r.id); setShowForm(true) }
  const removeRec    = id => { if (!confirm('삭제?')) return; saveRec(records.filter(r => r.id !== id)) }
  const fld          = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // 검사 항목 관리 (폼 내)
  const addCheckItem  = () => setForm(f => ({ ...f, checkItems: [...(f.checkItems || []), { name: '', spec: '', result: '', ok: null }] }))
  const updCheckItem  = (i, k, v) => setForm(f => {
    const items = [...(f.checkItems || [])]
    items[i] = { ...items[i], [k]: v }
    // 전체 항목 입력값에 따라 합격/조건부합격/불합격/판정대기 자동 산출 (#229)
    const states = items.map(ciState)
    const allDone = items.length > 0 && states.every(s => s !== null)
    const anyFail = states.some(s => s === 'fail')
    const anyCond = states.some(s => s === 'conditional')
    const verdict = allDone ? (anyFail ? 'fail' : anyCond ? 'conditional' : 'pass') : 'pending'
    return { ...f, checkItems: items, verdict }
  })
  const delCheckItem  = i => setForm(f => { const c = [...(f.checkItems||[])]; c.splice(i,1); return { ...f, checkItems: c } })

  // 기준서 적용 — 검사 항목 자동 채우기
  const applyStandard = stdId => {
    const std = standards.find(s => s.id === stdId)
    if (!std) return
    const items = (std.checkItems || []).map(ci => ({ name: ci.name, spec: ci.spec, result: '', ok: null }))
    setForm(f => ({ ...f, standardId: stdId, checkItems: items }))
  }

  const submitRec = () => {
    if (!form.productName || !form.inspector)
      return alert('제품명과 검사자는 필수입니다.')
    const now = new Date().toISOString()
    const defectRate = form.inspectedQty && form.defectQty
      ? ((parseInt(form.defectQty) / parseInt(form.inspectedQty)) * 100).toFixed(1)
      : null
    if (editId) saveRec(records.map(r => r.id === editId ? { ...form, id: editId, defectRate } : r))
    else saveRec([{ ...form, id: genInsId(), createdAt: now, createdBy: user?.name || '-', defectRate }, ...records])
    setShowForm(false)
  }

  // 필터링
  const filtered = useMemo(() => {
    let list = [...records]
    if (typeFilter !== 'all')    list = list.filter(r => r.inspType === typeFilter)
    if (verdictFilter !== 'all') list = list.filter(r => r.verdict === verdictFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r => (r.id + r.productName + r.lotNo + r.woId + r.inspector).toLowerCase().includes(q))
    }
    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  }, [records, typeFilter, verdictFilter, search])

  // 집계
  const total    = records.length
  const passRate = total ? Math.round((records.filter(r => r.verdict === 'pass').length / total) * 100) : 0
  const fails    = records.filter(r => r.verdict === 'fail')
  const pending  = records.filter(r => r.verdict === 'pending').length
  const failedNoNcr = fails.filter(r => !r.ncrId).length
  const conditionals = records.filter(r => r.verdict === 'conditional')

  const TABS = [
    { key: 'records',    label: '검사 기록',   icon: ClipboardList },
    { key: 'analysis',   label: '현황 분석',   icon: BarChart2 },
    { key: 'standards',  label: '검사 기준서', icon: FileWarning },
  ]

  return (
    <AppLayout user={user} title="검사 관리" subtitle="ISO 13485 §8.2.3 공정 중 검사 · §8.2.4 최종 검사 · 합격/불합격 판정 · NCR 연동">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto">

        {/* 알림 배너 */}
        {failedNoNcr > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-5" style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}>
            <XCircle size={14} style={{ color: '#DC2626' }} />
            <span className="text-[13px] font-semibold" style={{ color: '#991B1B' }}>
              불합격 {failedNoNcr}건 — NCR 미등록 (품질허브에서 NCR 등록 필요)
            </span>
          </div>
        )}

        {conditionals.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-5" style={{ background: '#FEF3C7', border: '1px solid #FCD34D' }}>
            <AlertTriangle size={14} style={{ color: '#D97706' }} />
            <span className="text-[13px] font-semibold" style={{ color: '#92400E' }}>
              조건부합격 {conditionals.length}건 — 품질책임자 확인 및 조건 이행 필요
            </span>
          </div>
        )}

        <HubBanner
          title="검사 관리"
          subtitle="ISO 13485 §8.2.3/§8.2.4 · 공정검사 · 최종검사 · 합격판정 · 검사 기록 유지"
          icon={ClipboardCheck}
          color="#0EA5E9"
          workflow={['생산 완료', '최종검사 대기', '검사 진행', '합격/불합격/조건부 판정', '기록 보관', '출하 승인']}
        />

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: '전체 검사',   count: total,      color: '#6B7280' },
            { label: '합격',        count: records.filter(r => r.verdict === 'pass').length, color: '#059669' },
            { label: '불합격',      count: fails.length,  color: '#DC2626' },
            { label: '검사 중',     count: pending,       color: '#2563EB' },
            { label: '합격률',      count: `${passRate}%`, color: passRate >= 95 ? '#059669' : passRate >= 80 ? '#D97706' : '#DC2626' },
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

        {/* ── 검사 기록 탭 ── */}
        {tab === 'records' && (
          <>
            {waitingWos.length > 0 && (
              <div className="mb-5">
                <div className="text-[12px] font-bold mb-2 flex items-center gap-1.5" style={{ color: 'var(--ink-soft)' }}>
                  <BadgeCheck size={13} style={{ color: '#059669' }} /> 최종검사 대기 ({waitingWos.length}) — 생산이 완료된 작업지시입니다. 클릭하여 검사를 시작하세요.
                </div>
                <div className="space-y-2">
                  {waitingWos.map(w => (
                    <div key={w.id} onClick={() => openFinal(w)} className="flex items-center justify-between gap-3 p-3 rounded-xl cursor-pointer transition"
                      style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                      <div>
                        <div className="text-[13px] font-bold" style={{ color: 'var(--ink)' }}>{w.product}</div>
                        <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{w.id} · 수량 {w.qty} · 완료일 {w.dueDate || '-'}</div>
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: '#059669', color: '#fff' }}>검사 시작 →</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-[180px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                <Search size={14} style={{ color: 'var(--ink-faint)' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="제품명 · LOT · 검사자 검색..." className="flex-1 text-[13px] outline-none" style={{ background: 'none', border: 'none', color: 'var(--ink)' }} />
              </div>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 rounded-xl text-[13px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
                <option value="all">전체 유형</option>
                {INSP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <select value={verdictFilter} onChange={e => setVerdictFilter(e.target.value)} className="px-3 py-2 rounded-xl text-[13px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
                <option value="all">전체 판정</option>
                {VERDICTS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>

            {filtered.length === 0
              ? <InsEmpty />
              : <div className="space-y-2">
                  {filtered.map(r => (
                    <InsRow key={r.id} record={r} standards={standards}
                      expanded={expanded === r.id}
                      onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
                      onEdit={() => openEdit(r)}
                      onDelete={() => removeRec(r.id)}
                    />
                  ))}
                </div>
            }
          </>
        )}

        {/* ── 현황 분석 탭 ── */}
        {tab === 'analysis' && <InsAnalysis records={records} procRecords={procRecords} />}

        {/* ── 검사 기준서 탭 ── */}
        {tab === 'standards' && (
          <StdTab standards={standards} goToProduct={goToProduct} goToProducts={goToProducts} />
        )}

      </div>

      {showForm && (
        <InsForm form={form} fld={fld} updCheckItem={updCheckItem}
          editId={editId} standards={standards}
          user={user} onSubmit={submitRec} onClose={() => setShowForm(false)} />
      )}
    </AppLayout>
  )
}

// ── 검사 기록 행 ──────────────────────────────────────────────
function InsRow({ record: r, standards, expanded, onToggle, onEdit, onDelete }) {
  const it = INSP_TYPES.find(t => t.value === r.inspType) || INSP_TYPES[0]
  const vd = VERDICTS.find(v => v.value === r.verdict) || VERDICTS[3]
  const VIcon = vd.icon
  const ITIcon = it.icon
  const std = standards?.find(s => s.id === r.standardId)
  const passItems = (r.checkItems || []).filter(c => ciState(c) === 'pass').length
  const totalItems = (r.checkItems || []).length

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: `1px solid ${r.verdict === 'fail' ? '#FECACA' : 'var(--line)'}` }}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={onToggle} style={{ borderBottom: expanded ? '1px solid var(--line)' : 'none' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${it.color}15` }}>
          <ITIcon size={16} style={{ color: it.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px]" style={{ color: 'var(--ink-faint)' }}>{r.id}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${it.color}15`, color: it.color }}>{it.short}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1" style={{ background: vd.bg, color: vd.color }}>
              <VIcon size={10} />{vd.label}
            </span>
            {r.defectRate > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#FEF3C7', color: '#D97706' }}>불량률 {r.defectRate}%</span>
            )}
          </div>
          <div className="text-[14px] font-semibold mt-0.5 truncate" style={{ color: 'var(--ink)' }}>
            {r.productName}
            {r.lotNo && <span className="text-[12px] font-normal ml-1" style={{ color: 'var(--ink-faint)' }}>LOT: {r.lotNo}</span>}
          </div>
          <div className="text-[12px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
            {r.inspDate} · 검사자: {r.inspector}
            {r.processStep && ` · ${r.processStep}`}
            {totalItems > 0 && ` · 검사항목 ${passItems}/${totalItems} 합격`}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={e => { e.stopPropagation(); onEdit() }} className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)', border: 'none', cursor: 'pointer' }}><Edit3 size={13} /></button>
          <button onClick={e => { e.stopPropagation(); onDelete() }} className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', cursor: 'pointer' }}><Trash2 size={13} /></button>
          {expanded ? <ChevronUp size={16} style={{ color: 'var(--ink-faint)' }} /> : <ChevronDown size={16} style={{ color: 'var(--ink-faint)' }} />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <SL>제품·로트 정보</SL>
            <IR k="제품명"    v={r.productName} />
            <IR k="제품 코드" v={r.productCode} />
            <IR k="LOT 번호"  v={r.lotNo} />
            <IR k="작업지시"  v={r.woId || '-'} />
            <IR k="공정 단계" v={r.processStep || '-'} />
            <SL>샘플링</SL>
            <IR k="검사 수량" v={r.inspectedQty} />
            <IR k="불량 수량" v={r.defectQty || '0'} />
            <IR k="불량률"    v={r.defectRate != null ? `${r.defectRate}%` : '-'} />
            {std && <><SL>적용 기준서</SL><div className="text-[12px]" style={{ color: 'var(--ink)' }}>{std.name} (v{std.version})</div></>}
          </div>
          <div>
            <SL>검사 항목 ({(r.checkItems||[]).length}개)</SL>
            {(r.checkItems || []).length === 0 && <div className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>항목 없음</div>}
            <div className="space-y-1">
              {(r.checkItems || []).map((ci, i) => {
                const st = ciState(ci)
                const bg = st === 'pass' ? '#D1FAE5' : st === 'fail' ? '#FEE2E2' : st === 'conditional' ? '#FEF3C7' : 'var(--bg-soft)'
                const color = st === 'pass' ? '#059669' : st === 'fail' ? '#DC2626' : st === 'conditional' ? '#D97706' : '#9CA3AF'
                const mark = st === 'pass' ? '✓' : st === 'fail' ? '✗' : st === 'conditional' ? '△' : '○'
                return (
                  <div key={i} className="flex items-center gap-2 p-1.5 rounded-lg" style={{ background: bg }}>
                    <span style={{ color, fontSize: 13 }}>{mark}</span>
                    <span className="text-[12px] flex-1" style={{ color: 'var(--ink)' }}>{ci.name}</span>
                    <span className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{ci.result || ci.spec}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div>
            <SL>판정 결과</SL>
            <div className="p-3 rounded-xl mb-2" style={{ background: VERDICTS.find(v => v.value === r.verdict)?.bg || '#F3F4F6' }}>
              <div className="text-[14px] font-bold" style={{ color: VERDICTS.find(v => v.value === r.verdict)?.color || '#6B7280' }}>
                {VERDICTS.find(v => v.value === r.verdict)?.label || r.verdict}
              </div>
              {r.conditionNote && <div className="text-[12px] mt-1" style={{ color: 'var(--ink)' }}>{r.conditionNote}</div>}
            </div>
            {r.verdict === 'fail' && (
              <>
                <SL>연결 NCR</SL>
                <div className="text-[12px]" style={{ color: r.ncrId ? '#DC2626' : 'var(--ink-faint)' }}>
                  {r.ncrId || '⚠ NCR 미등록 — 품질허브에서 등록 필요'}
                </div>
              </>
            )}
            {r.notes && <><SL>비고</SL><div className="text-[12px] p-2 rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink)' }}>{r.notes}</div></>}
          </div>
        </div>
      )}
    </div>
  )
}

// ── 현황 분석 ─────────────────────────────────────────────────
function InsAnalysis({ records, procRecords }) {
  // 공정 중 검사(IPC)는 생산현황의 공정기록에서 직접 판정되므로(#231), 현황 분석에서도
  // 공정기록 데이터를 함께 집계하여 유형별 검사 현황에 반영한다.
  const ipcTotal = (procRecords || []).length
  const ipcPass  = (procRecords || []).filter(p => p.result === '합격').length
  const ipcFail  = (procRecords || []).filter(p => p.result === '불합격').length

  const byType = INSP_TYPES.map(t => {
    if (t.value === 'ipc') {
      return { ...t, total: ipcTotal, pass: ipcPass, fail: ipcFail }
    }
    return {
      ...t,
      total: records.filter(r => r.inspType === t.value).length,
      pass:  records.filter(r => r.inspType === t.value && r.verdict === 'pass').length,
      fail:  records.filter(r => r.inspType === t.value && r.verdict === 'fail').length,
    }
  })

  // 월별 불량률
  const monthly = {}
  records.forEach(r => {
    const m = (r.inspDate || r.createdAt || '').slice(0, 7)
    if (!m) return
    if (!monthly[m]) monthly[m] = { total: 0, fail: 0 }
    monthly[m].total++
    if (r.verdict === 'fail') monthly[m].fail++
  })
  const monthKeys = Object.keys(monthly).sort().slice(-6)

  // 최근 불합격 목록
  const recentFails = records.filter(r => r.verdict === 'fail').sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 5)

  return (
    <div className="space-y-5">
      {/* 유형별 합격률 */}
      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>유형별 검사 현황</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {byType.map(t => {
            const rate = t.total ? Math.round((t.pass / t.total) * 100) : null
            const TIcon = t.icon
            return (
              <div key={t.value} className="p-4 rounded-xl text-center" style={{ background: 'var(--bg-soft)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: `${t.color}15` }}>
                  <TIcon size={18} style={{ color: t.color }} />
                </div>
                <div className="text-[12px] font-bold mb-1" style={{ color: 'var(--ink)' }}>{t.short}</div>
                <div className="text-[22px] font-bold" style={{ color: rate === null ? '#9CA3AF' : rate >= 95 ? '#059669' : rate >= 80 ? '#D97706' : '#DC2626' }}>
                  {rate !== null ? `${rate}%` : '-'}
                </div>
                <div className="text-[10.5px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>합격률 · {t.total}건</div>
                <div className="flex justify-center gap-2 mt-1 text-[10px]">
                  <span style={{ color: '#059669' }}>합격 {t.pass}</span>
                  <span style={{ color: '#DC2626' }}>불합 {t.fail}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 월별 추이 */}
      {monthKeys.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>월별 검사 건수 및 불합격 추이</div>
          <div className="flex items-end gap-3 h-[120px]">
            {monthKeys.map(m => {
              const d = monthly[m]
              const h = Math.max(8, Math.round((d.total / Math.max(...monthKeys.map(k => monthly[k].total))) * 100))
              const fh = d.total ? Math.round((d.fail / d.total) * h) : 0
              return (
                <div key={m} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{d.total}건</div>
                  <div className="w-full rounded-t-lg overflow-hidden flex flex-col justify-end" style={{ height: `${h}px`, background: '#D1FAE5' }}>
                    {fh > 0 && <div className="w-full" style={{ height: `${fh}px`, background: '#DC2626' }} />}
                  </div>
                  <div className="text-[9px]" style={{ color: 'var(--ink-faint)' }}>{m.slice(5)}</div>
                </div>
              )
            })}
          </div>
          <div className="flex gap-4 mt-2 text-[11px]">
            <span className="flex items-center gap-1"><span style={{ display:'inline-block',width:10,height:10,background:'#D1FAE5',borderRadius:2 }}></span>합격</span>
            <span className="flex items-center gap-1"><span style={{ display:'inline-block',width:10,height:10,background:'#DC2626',borderRadius:2 }}></span>불합격</span>
          </div>
        </div>
      )}

      {/* 최근 불합격 */}
      {recentFails.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[14px] font-bold mb-3" style={{ color: 'var(--ink)' }}>최근 불합격 현황</div>
          <div className="space-y-2">
            {recentFails.map(r => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#FEE2E2' }}>
                <XCircle size={14} style={{ color: '#DC2626' }} />
                <div className="flex-1">
                  <div className="text-[12.5px] font-semibold" style={{ color: '#7F1D1D' }}>{r.productName} · LOT {r.lotNo || '-'}</div>
                  <div className="text-[11px]" style={{ color: '#991B1B' }}>{r.inspDate} · {r.inspector} · {INSP_TYPES.find(t=>t.value===r.inspType)?.short}</div>
                </div>
                <div className="text-[11px] font-bold" style={{ color: r.ncrId ? '#059669' : '#DC2626' }}>
                  {r.ncrId ? `NCR: ${r.ncrId}` : 'NCR 미등록'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── 검사 기준서 탭 ────────────────────────────────────────────
function StdTab({ standards, goToProduct, goToProducts }) {
  const [detail, setDetail] = useState(null)
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-[13px]" style={{ color: 'var(--ink-faint)' }}>검사 기준서는 제품·공정 &gt; 제품 개발(설계단계)에서 작성합니다. 목록을 클릭하면 상세 내용을 볼 수 있습니다.</div>
        <button onClick={goToProducts} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold" style={{ background: '#059669', color: 'white', border: 'none', cursor: 'pointer' }}>
          <ExternalLink size={14} /> 제품 개발에서 작성
        </button>
      </div>
      {standards.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--ink-faint)' }}>
          <FileWarning size={40} strokeWidth={1} className="mx-auto mb-3 opacity-30" />
          <div>등록된 검사 기준서가 없습니다.</div>
          <div className="text-[12px] mt-1">제품 개발 화면에서 제품별 검사 기준서를 작성하세요.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {standards.map(s => {
            const it = INSP_TYPES.find(t => t.value === s.inspType) || INSP_TYPES[1]
            return (
              <div key={s.id} onClick={() => setDetail(s)} className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[10px]" style={{ color: 'var(--ink-faint)' }}>{s.id}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${it.color}15`, color: it.color }}>{it.short}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>v{s.version}</span>
                    </div>
                    <div className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>{s.name}</div>
                    <div className="text-[12px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
                      제품: {s.productName} · 제품 코드: {s.productCode || '-'} · 시행일: {s.effectiveDate || '-'} · 검사 항목 {(s.checkItems||[]).length}개
                    </div>
                  </div>
                  <ChevronDown size={16} style={{ color: 'var(--ink-faint)', transform: 'rotate(-90deg)' }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
      {detail && <StdDetailModal std={detail} onGoToProduct={goToProduct} onClose={() => setDetail(null)} />}
    </div>
  )
}

// ── 검사 기준서 상세 (조회 전용) ────────────────────────────────
function StdDetailModal({ std, onGoToProduct, onClose }) {
  const it = INSP_TYPES.find(t => t.value === std.inspType) || INSP_TYPES[1]
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }} onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--line)', width: '100%', maxWidth: 640, boxShadow: '0 24px 64px rgba(0,0,0,0.3)', padding: 28 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${it.color}15`, color: it.color }}>{it.short}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>v{std.version}</span>
            </div>
            <div className="text-[16px] font-bold" style={{ color: 'var(--ink)' }}>{std.name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)' }}><X size={20} /></button>
        </div>

        <div className="space-y-2 mb-4">
          <IR k="적용 제품" v={std.productName} />
          <IR k="제품 코드" v={std.productCode || '-'} />
          <IR k="검사 유형" v={it.label} />
          <IR k="시행일" v={std.effectiveDate || '-'} />
          <IR k="AQL 수준" v={std.aqlLevel || '-'} />
          <IR k="합격/불합격 수량" v={[std.acceptQty, std.rejectQty].filter(Boolean).join(' / ') || '-'} />
        </div>

        <SL>검사 항목</SL>
        {(std.checkItems || []).length === 0 ? (
          <div className="text-[12px] text-center py-3" style={{ color: 'var(--ink-faint)', background: 'var(--bg-soft)', borderRadius: 8 }}>등록된 검사 항목이 없습니다.</div>
        ) : (
          <div className="space-y-1.5">
            {std.checkItems.map((ci, i) => (
              <div key={i} className="flex gap-2 text-[12px] p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
                <span style={{ color: 'var(--ink-faint)', minWidth: 16 }}>{i + 1}.</span>
                <span style={{ color: 'var(--ink)', flex: 1 }}>{ci.name}</span>
                {ci.spec && <span style={{ color: 'var(--ink-faint)' }}>{ci.spec}</span>}
                {ci.method && <span style={{ color: 'var(--ink-faint)' }}>· {ci.method}</span>}
              </div>
            ))}
          </div>
        )}

        {std.notes && (
          <div className="mt-4">
            <SL>비고</SL>
            <div className="text-[12.5px]" style={{ color: 'var(--ink)' }}>{std.notes}</div>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>닫기</button>
          {std.productId && (
            <button onClick={() => onGoToProduct(std.productId)} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-1.5" style={{ background: '#059669', color: 'white', border: 'none', cursor: 'pointer' }}>
              <ExternalLink size={13} /> 제품 개발에서 수정
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 검사 기록 폼 ──────────────────────────────────────────────
function InsForm({ form, fld, updCheckItem, editId, standards, user, onSubmit, onClose }) {
  const std = standards.find(s => s.id === form.standardId)
  const vd = VERDICTS.find(v => v.value === form.verdict) || VERDICTS[3]
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }} onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--line)', width: '100%', maxWidth: 720, boxShadow: '0 24px 64px rgba(0,0,0,0.3)', padding: 28 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="text-[16px] font-bold" style={{ color: 'var(--ink)' }}>{editId ? '최종검사 기록 수정' : '최종검사 진행'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)' }}><X size={20} /></button>
        </div>

        <div className="space-y-3">
          {/* 제품·로트·검사자 정보 — 작업지시(WO) 클릭 시 자동 반영, 수정 불가 (#225,#226,#227) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-soft)' }}>
            <IR k="제품명" v={form.productName} />
            <IR k="제품 코드" v={form.productCode} />
            <IR k="연결 작업지시" v={form.woId} />
            <IR k="공정 단계" v={form.processStep || '최종검사'} />
            <IR k="검사일" v={form.inspDate} />
            <IR k="검사자" v={form.inspector || user?.name} />
            <IR k="적용 기준서" v={std ? `${std.name} (v${std.version})` : '기본 최종검사 항목'} />
          </div>

          {/* 검사 항목 — 검사기준서(SSoT)로 자동 생성, 결과 입력만 가능 (#224,#228) */}
          <div className="pt-2" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="text-[12px] font-bold mb-2" style={{ color: 'var(--ink-soft)' }}>검사 항목 ({(form.checkItems || []).length}개)</div>
            <div className="space-y-2">
              {(form.checkItems || []).map((ci, i) => (
                <div key={i} className="grid gap-2 items-center" style={{ gridTemplateColumns: '1fr 1fr 96px' }}>
                  <div className="text-[12.5px] px-1" style={{ color: 'var(--ink)' }}>{ci.name}</div>
                  <input value={ci.result} onChange={e => updCheckItem(i, 'result', e.target.value)} placeholder="측정값 / 기준치" style={{ ...IS, fontSize: 12 }} />
                  <select value={ci.ok === null || ci.ok === undefined || ci.ok === '' ? '' : ciState(ci) || ''} onChange={e => updCheckItem(i, 'ok', e.target.value === '' ? null : e.target.value)} style={{ ...IS, fontSize: 12 }}>
                    <option value="">-</option>
                    <option value="pass">합격</option>
                    <option value="conditional">조건부</option>
                    <option value="fail">불합격</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* 판정 — 검사 항목 결과에 따라 자동 산출 (#229) */}
          <div className="pt-2" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="text-[12px] font-bold mb-2" style={{ color: 'var(--ink-soft)' }}>최종 판정 (자동)</div>
            <div className="p-3 rounded-xl flex items-center gap-2" style={{ background: vd.bg }}>
              <vd.icon size={16} style={{ color: vd.color }} />
              <span className="text-[14px] font-bold" style={{ color: vd.color }}>{form.verdict === 'pending' ? '검사 항목 입력 대기' : vd.label}</span>
            </div>
          </div>
          {form.verdict === 'fail' && (
            <F l="연결 NCR ID"><input value={form.ncrId} onChange={e => fld('ncrId', e.target.value)} placeholder="NCR-2026-00001" style={IS} className="w-full" /></F>
          )}
          {form.verdict === 'conditional' && (
            <F l="조건부 합격 조건 (품질책임자 확인 필요)"><textarea value={form.conditionNote} onChange={e => fld('conditionNote', e.target.value)} rows={2} placeholder="허용 조건 및 후속 조치..." style={{ ...IS, resize: 'vertical' }} className="w-full" /></F>
          )}
          <F l="비고"><textarea value={form.notes} onChange={e => fld('notes', e.target.value)} rows={2} style={{ ...IS, resize: 'vertical' }} className="w-full" /></F>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>취소</button>
          <button onClick={onSubmit} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: '#2563EB', color: 'white', border: 'none', cursor: 'pointer' }}>
            {editId ? '수정 저장' : '검사 결과 저장'}
          </button>
        </div>
      </div>
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

function InsEmpty() {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <Microscope size={48} strokeWidth={1} className="mx-auto mb-3 opacity-30" style={{ color: '#2563EB' }} />
      <div className="text-[16px] font-bold mb-1" style={{ color: 'var(--ink-soft)' }}>검사 기록 없음</div>
      <div className="text-[13px]" style={{ color: 'var(--ink-faint)' }}>생산에서 작업지시가 완료되면 이곳에 최종검사 대기 항목이 자동으로 표시됩니다.</div>
    </div>
  )
}
