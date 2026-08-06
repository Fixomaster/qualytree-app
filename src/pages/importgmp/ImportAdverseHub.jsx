// src/pages/importgmp/ImportAdverseHub.jsx
// 의료기기법 §30조 — 수입 의료기기 이상사례 보고. ComplaintHub.jsx(고객불만관리)와 동일한
// 구조(접수→조사→규제보고→종결, 자동 상태산정, 승인자 검증 종결)를 따른다. (#298)
import React, { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Plus, Search, Edit3, Trash2, ChevronDown, ChevronUp,
  X, AlertTriangle, CheckCircle2, MessageSquare,
  FileWarning, BarChart2, List, AlertOctagon,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import CertGate from '../../components/CertGate'
import { auth } from '../../lib/auth'
import { companyDocs } from '../../lib/companyState'
import { onboarding } from '../../lib/onboardingState'

// 수입 품목 허가현황에 등록된 품목명 — 이상사례의 '제품명'은 자유 입력이 아니라
// 등록된 수입 품목 기준으로 검색해서 선택하도록 한다.
function importProductNames() {
  try {
    const raw = localStorage.getItem('qualytree.import_products')
    if (!raw) return []
    const list = JSON.parse(raw)
    return Array.isArray(list) ? [...new Set(list.map(p => p.productName).filter(Boolean))] : []
  } catch { return [] }
}

const LS_KEY = 'qualytree.import_adverse'
function lsR() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] } }
function lsW(d) { localStorage.setItem(LS_KEY, JSON.stringify(d)) }
function genId() { return `IAE-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }

const REPORT_TYPE_OPTIONS = ['의무보고', '자발보고']

const SEVERITIES = [
  { value: 'critical', label: '심각 — 사망/중상해', color: '#991B1B', bg: '#FEE2E2' },
  { value: 'major',    label: '중요 — 의료적 처치 필요', color: '#DC2626', bg: '#FEE2E2' },
  { value: 'minor',    label: '경미 — 경미한 상해/불편', color: '#D97706', bg: '#FEF3C7' },
  { value: 'none',     label: '해당없음 — 부상 없음', color: '#059669', bg: '#D1FAE5' },
]

const STATUSES = [
  { value: 'received',      label: '접수',       color: '#6B7280', bg: '#F3F4F6' },
  { value: 'investigating', label: '조사 중',    color: '#2563EB', bg: '#DBEAFE' },
  { value: 'reporting',     label: '규제 보고',  color: '#7C3AED', bg: '#EDE9FE' },
  { value: 'resolving',     label: '처리 중',    color: '#D97706', bg: '#FEF3C7' },
  { value: 'closed',        label: '종결',       color: '#059669', bg: '#D1FAE5' },
  { value: 'rejected',      label: '반려',       color: '#9CA3AF', bg: '#F3F4F6' },
]

// MFDS 보고 판단 기준 안내
const MDR_GUIDE = [
  '사망 또는 심각한 부상을 초래했거나 초래할 가능성이 있는 경우',
  '제품의 기능 불량, 변질 또는 부적절한 라벨링으로 인해 발생한 경우',
  '동일 이상사례가 반복되어 안전 리스크가 있다고 판단되는 경우',
  '시정조치(Recall) 또는 현장 수정(FSC)이 필요한 경우',
]

// 처리 상태는 임의 선택이 아니라 작성된 내용(조사결과·근본원인·시정조치·MFDS보고 등)에 따라
// 자동으로 진행된다. 반려/종결(승인)만 사람이 직접 결정하는 종결 상태로 취급한다.
function deriveAdverseStatus(f) {
  if (f.status === 'closed' || f.status === 'rejected') return f.status
  const hasInvestigation = !!(f.investigation && f.investigation.trim())
  const hasRootCause = !!(f.rootCause && f.rootCause.trim())
  const hasCorrective = !!(f.corrective && f.corrective.trim())
  if (f.reportType === '의무보고' && !f.reportDate && (hasInvestigation || hasRootCause || hasCorrective)) return 'reporting'
  if (hasCorrective) return 'resolving'
  if (hasInvestigation || hasRootCause) return 'investigating'
  return 'received'
}
// 종결 승인 가능 여부 — 조사·근본원인·시정조치가 모두 작성되고(의무보고 시 보고까지 완료) 아직 종결 전인 경우.
function readyToClose(item) {
  if (['closed', 'rejected'].includes(item.status)) return false
  const ok = !!(item.investigation?.trim() && item.rootCause?.trim() && item.corrective?.trim())
  if (!ok) return false
  if (item.reportType === '의무보고' && !item.reportDate) return false
  return true
}

const emptyForm = () => ({
  productName: '', incidentDate: new Date().toISOString().slice(0, 10),
  reportDate: '', reportNo: '', reportType: '의무보고', severity: 'none',
  description: '', immediateAction: '',
  assignee: '', dueDate: '', status: 'received',
  investigation: '', rootCause: '', corrective: '', followup: '',
  closedDate: '', notes: '',
})

// ── 메인 ─────────────────────────────────────────────────────
export default function ImportAdverseHub() {
  const user = auth.current()
  const [searchParams] = useSearchParams()
  const [items, setItems] = useState(() => lsR())
  const [tab, setTab] = useState(() => searchParams.get('tab') || 'list')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sevFilter, setSevFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [editId, setEditId] = useState(null)
  const [expanded, setExpanded] = useState(null)

  const save = d => { setItems(d); lsW(d) }

  const openNew = () => { setForm({ ...emptyForm(), assignee: user?.name || '' }); setEditId(null); setShowForm(true) }
  const openEdit = item => { setForm({ ...item }); setEditId(item.id); setShowForm(true) }

  const submit = () => {
    if (!form.productName || !form.description) return alert('제품명과 이상사례 내용은 필수입니다.')
    if (!form.incidentDate) return alert('발생일을 입력하세요.')
    const now = new Date().toISOString()
    const withStatus = { ...form, status: deriveAdverseStatus(form) }
    if (editId) {
      save(items.map(i => i.id === editId ? { ...withStatus, id: editId } : i))
    } else {
      save([{ ...withStatus, id: genId(), createdAt: now, createdBy: user?.name || '-' }, ...items])
    }
    setShowForm(false)
  }

  const remove = id => { if (!confirm('삭제하시겠습니까?')) return; save(items.filter(i => i.id !== id)) }
  const fld = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // 종결은 상태값 하나 바꾸는 것으로 끝나지 않고, 기본정보에 등록된 품질책임자 또는
  // 대표이사 본인만 승인자 성명을 입력해 검토·승인해야 종결 처리된다.
  const approveClose = id => {
    const item = items.find(i => i.id === id)
    if (!item || !readyToClose(item)) return
    const qmName = ((companyDocs.getQualityManager() || {}).name || '').trim()
    const ceoName = ((onboarding.load().company || {}).ceo || '').trim()
    if (!qmName && !ceoName) {
      alert('기본정보에 품질책임자 또는 대표이사가 등록되어 있지 않습니다. 먼저 기본정보에서 등록하세요.')
      return
    }
    const who = [qmName && `품질책임자(${qmName})`, ceoName && `대표이사(${ceoName})`].filter(Boolean).join(' 또는 ')
    const input = window.prompt(`이상사례 종결 승인 — ${who} 본인만 승인할 수 있습니다.\n승인자 성명을 입력하세요:`, '')
    if (input === null) return
    const approver = input.trim()
    if (!approver) { alert('승인자 성명을 입력해야 합니다.'); return }
    if (approver !== qmName && approver !== ceoName) {
      alert('입력한 이름이 등록된 품질책임자 또는 대표이사와 일치하지 않아 승인할 수 없습니다.')
      return
    }
    save(items.map(i => i.id === id ? { ...i, status: 'closed', closedDate: new Date().toISOString().slice(0, 10), approvedBy: approver } : i))
  }
  const rejectItem = id => {
    if (!confirm('이 이상사례를 반려 처리하시겠습니까?')) return
    save(items.map(i => i.id === id ? { ...i, status: 'rejected' } : i))
  }

  const filtered = useMemo(() => {
    let list = [...items]
    if (statusFilter !== 'all') list = list.filter(i => i.status === statusFilter)
    if (sevFilter !== 'all') list = list.filter(i => i.severity === sevFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(i => (i.id + i.productName + i.description + (i.reportNo || '')).toLowerCase().includes(q))
    }
    return list.sort((a, b) => (b.createdAt || b.incidentDate || '').localeCompare(a.createdAt || a.incidentDate || ''))
  }, [items, search, statusFilter, sevFilter])

  const stats = {
    total: items.length,
    open: items.filter(i => !['closed', 'rejected'].includes(i.status)).length,
    mandatory: items.filter(i => i.reportType === '의무보고').length,
    critical: items.filter(i => ['critical', 'major'].includes(i.severity)).length,
    closed: items.filter(i => i.status === 'closed').length,
    thisMonth: items.filter(i => i.incidentDate?.startsWith(new Date().toISOString().slice(0, 7))).length,
  }

  const TABS = [
    { key: 'list', label: '이상사례 목록', icon: List },
    { key: 'stats', label: '현황 분석', icon: BarChart2 },
    { key: 'mdr', label: 'MFDS 보고 현황', icon: FileWarning },
  ]

  return (
    <AppLayout user={user} title="이상사례 보고" subtitle="의료기기법 §30조 · 수입 의료기기 이상사례 MFDS 보고 이력 관리">
      <CertGate certId="kgmp_importer" label="수입 GMP">
        <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto">

          <HubBanner
            title="이상사례 보고"
            subtitle="의료기기법 §30조 · 이상사례 접수 · 조사 · 시정조치 · MFDS 규제 보고"
            icon={AlertOctagon}
            color="#EF4444"
            quickActions={[{ label: '이상사례 등록', icon: Plus, onClick: openNew, primary: true }]}
            workflow={['이상사례 인지', '초기 평가', '조사', '시정조치', 'MFDS 보고', '종결']}
          />

          {/* KPI */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
            {[
              { label: '총 접수', count: stats.total, color: '#6B7280' },
              { label: '처리 중', count: stats.open, color: '#2563EB' },
              { label: '심각/중요', count: stats.critical, color: '#DC2626' },
              { label: '의무보고', count: stats.mandatory, color: '#7C3AED' },
              { label: '이번 달', count: stats.thisMonth, color: '#D97706' },
              { label: '종결', count: stats.closed, color: '#059669' },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                <div className="text-[20px] font-bold" style={{ color: s.color }}>{s.count}</div>
                <div className="text-[10.5px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* MFDS 미보고 경고 */}
          {items.filter(i => i.reportType === '의무보고' && !i.reportDate && i.status !== 'closed').length > 0 && (
            <div className="flex items-center gap-3 p-4 rounded-2xl mb-5" style={{ background: '#EDE9FE', border: '1px solid #C4B5FD' }}>
              <FileWarning size={18} style={{ color: '#7C3AED', flexShrink: 0 }} />
              <div>
                <div className="text-[13px] font-bold" style={{ color: '#4C1D95' }}>
                  MFDS 규제 보고 미완료 {items.filter(i => i.reportType === '의무보고' && !i.reportDate && i.status !== 'closed').length}건
                </div>
                <div className="text-[12px]" style={{ color: '#6D28D9' }}>식약처 이상사례 보고 기한을 확인하세요 (사망/중상해: 즉시, 기타: 30일 이내)</div>
              </div>
            </div>
          )}

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

          {/* ── 목록 탭 ── */}
          {tab === 'list' && (
            <>
              <div className="flex gap-3 mb-4 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-[180px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                  <Search size={14} style={{ color: 'var(--ink-faint)' }} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="제품명 · 번호 · 내용 검색..." className="flex-1 text-[13px] outline-none" style={{ background: 'none', border: 'none', color: 'var(--ink)' }} />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-xl text-[13px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
                  <option value="all">전체 상태</option>
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <select value={sevFilter} onChange={e => setSevFilter(e.target.value)} className="px-3 py-2 rounded-xl text-[13px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
                  <option value="all">전체 심각도</option>
                  {SEVERITIES.map(s => <option key={s.value} value={s.value}>{s.label.split(' — ')[0]}</option>)}
                </select>
                <button onClick={openNew} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold" style={{ background: '#DC2626', color: 'white', border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} /> 이상사례 등록
                </button>
              </div>

              {filtered.length === 0
                ? <EmptyState onAdd={openNew} />
                : <div className="space-y-2">
                    {filtered.map(item => (
                      <AdverseRow key={item.id} item={item}
                        expanded={expanded === item.id}
                        onToggle={() => setExpanded(expanded === item.id ? null : item.id)}
                        onEdit={() => openEdit(item)}
                        onDelete={() => remove(item.id)}
                        onApproveClose={() => approveClose(item.id)}
                        onReject={() => rejectItem(item.id)}
                      />
                    ))}
                  </div>
              }
            </>
          )}

          {/* ── 현황 분석 탭 ── */}
          {tab === 'stats' && <StatsView items={items} />}

          {/* ── MFDS 보고 현황 탭 ── */}
          {tab === 'mdr' && <MdrView items={items} onEdit={openEdit} />}

        </div>

        {showForm && <AdverseForm form={form} fld={fld} editId={editId} onSubmit={submit} onClose={() => setShowForm(false)} />}
      </CertGate>
    </AppLayout>
  )
}

// ── 이상사례 행 컴포넌트 ──────────────────────────────────────
function AdverseRow({ item, expanded, onToggle, onEdit, onDelete, onApproveClose, onReject }) {
  const st = STATUSES.find(s => s.value === item.status) || STATUSES[0]
  const canClose = readyToClose(item)
  const canReject = !['closed', 'rejected'].includes(item.status)
  const sev = SEVERITIES.find(s => s.value === item.severity) || SEVERITIES[3]

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={onToggle} style={{ borderBottom: expanded ? '1px solid var(--line)' : 'none' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: sev.bg }}>
          {['critical', 'major'].includes(item.severity)
            ? <AlertTriangle size={16} style={{ color: sev.color }} />
            : <MessageSquare size={16} style={{ color: sev.color }} />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px]" style={{ color: 'var(--ink-faint)' }}>{item.id}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: sev.bg, color: sev.color }}>{sev.label.split(' — ')[0]}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-soft)', color: 'var(--ink-mute)' }}>{item.reportType}</span>
            {item.reportType === '의무보고' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: '#EDE9FE', color: '#7C3AED' }}>
                {item.reportDate ? '✓ 보고완료' : '⚠ 보고필요'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>{item.productName}</span>
          </div>
          <div className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--ink-faint)' }}>{item.description}</div>
        </div>

        <div className="text-right flex-shrink-0 mr-1">
          <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>발생일</div>
          <div className="text-[12px] font-medium" style={{ color: 'var(--ink)' }}>{item.incidentDate || '-'}</div>
          {item.dueDate && (
            <div className="text-[11px]" style={{ color: daysUntil(item.dueDate) < 0 ? '#DC2626' : 'var(--ink-faint)' }}>
              마감 {item.dueDate}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {canClose && (
            <button onClick={e => { e.stopPropagation(); onApproveClose() }} className="px-2 py-1 rounded-lg text-[10.5px] font-bold" style={{ background: '#D1FAE5', color: '#059669', border: '1px solid #A7F3D0', cursor: 'pointer' }}>종결 승인</button>
          )}
          {canReject && (
            <button onClick={e => { e.stopPropagation(); onReject() }} className="px-2 py-1 rounded-lg text-[10.5px] font-bold" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)', border: '1px solid var(--line)', cursor: 'pointer' }}>반려</button>
          )}
          <button onClick={e => { e.stopPropagation(); onEdit() }} className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)', border: 'none', cursor: 'pointer' }}><Edit3 size={13} /></button>
          <button onClick={e => { e.stopPropagation(); onDelete() }} className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', cursor: 'pointer' }}><Trash2 size={13} /></button>
          {expanded ? <ChevronUp size={16} style={{ color: 'var(--ink-faint)' }} /> : <ChevronDown size={16} style={{ color: 'var(--ink-faint)' }} />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 py-4 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <SL>제품 정보</SL>
            <InfoRow k="제품명" v={item.productName} />
            <InfoRow k="발생일" v={item.incidentDate} />
            <InfoRow k="보고 유형" v={item.reportType} />
          </div>
          <div>
            <SL>이상사례 내용</SL>
            <div className="text-[12.5px] p-2 rounded-lg mb-3" style={{ background: 'var(--bg-soft)', color: 'var(--ink)', lineHeight: 1.6 }}>{item.description}</div>
            {item.immediateAction && <>
              <SL>즉각 조치</SL>
              <div className="text-[12px] p-2 rounded-lg mb-2" style={{ background: 'var(--bg-soft)', color: 'var(--ink)' }}>{item.immediateAction}</div>
            </>}
            <SL>조사 및 처리</SL>
            <InfoRow k="담당자" v={item.assignee} />
            <InfoRow k="마감일" v={item.dueDate} />
          </div>
          {(item.investigation || item.rootCause || item.corrective) && (
            <div className="md:col-span-2">
              <SL>조사 결과 / 근본 원인 / 시정 조치</SL>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[['조사 결과', item.investigation], ['근본 원인', item.rootCause], ['시정 조치', item.corrective]].map(([k, v]) => v && (
                  <div key={k}>
                    <div className="text-[10px] font-bold mb-1" style={{ color: 'var(--ink-faint)' }}>{k}</div>
                    <div className="text-[12px] p-2 rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink)', lineHeight: 1.5 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {item.followup && (
            <div className="md:col-span-2">
              <SL>후속 조치</SL>
              <div className="text-[12px] p-2 rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink)' }}>{item.followup}</div>
            </div>
          )}
          {item.reportType === '의무보고' && (
            <div className="md:col-span-2 p-3 rounded-xl" style={{ background: '#EDE9FE', border: '1px solid #C4B5FD' }}>
              <div className="text-[12px] font-bold mb-1" style={{ color: '#4C1D95' }}>🏛 MFDS 규제 보고 정보</div>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <InfoRow k="보고일" v={item.reportDate || '(미보고)'} />
                <InfoRow k="접수 번호" v={item.reportNo || '-'} />
              </div>
            </div>
          )}
          <div className="md:col-span-2 text-[11px]" style={{ color: 'var(--ink-faint)' }}>
            등록: {item.createdBy} · {item.createdAt?.slice(0, 10) || '-'}
            {item.closedDate && ` · 종결: ${item.closedDate}${item.approvedBy ? ` (승인: ${item.approvedBy})` : ''}`}
          </div>
        </div>
      )}
    </div>
  )
}

function SL({ children }) { return <div className="text-[10.5px] font-bold mb-1 mt-2" style={{ color: 'var(--ink-faint)' }}>{children}</div> }
function InfoRow({ k, v }) {
  return (
    <div className="flex gap-2 mb-1">
      <span className="text-[11px] flex-shrink-0 w-16" style={{ color: 'var(--ink-faint)' }}>{k}</span>
      <span className="text-[12px]" style={{ color: 'var(--ink)' }}>{v || '-'}</span>
    </div>
  )
}
function daysUntil(d) { return d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null }

// ── 현황 분석 ─────────────────────────────────────────────────
function StatsView({ items }) {
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i)
    const key = d.toISOString().slice(0, 7)
    months.push({ key, label: `${d.getMonth() + 1}월`, count: items.filter(item => item.incidentDate?.startsWith(key)).length })
  }
  const maxMonth = Math.max(...months.map(m => m.count), 1)

  const byStatus = STATUSES.map(s => ({ ...s, count: items.filter(i => i.status === s.value).length }))
  const closeRate = items.length === 0 ? 0 : Math.round(items.filter(i => i.status === 'closed').length / items.length * 100)

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="text-[13px] font-bold mb-4" style={{ color: 'var(--ink)' }}>월별 접수 추이</div>
        <div className="flex items-end gap-2 h-32">
          {months.map(m => (
            <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
              <div className="text-[11px] font-bold" style={{ color: 'var(--ink-soft)' }}>{m.count || ''}</div>
              <div className="w-full rounded-t-lg" style={{ height: `${(m.count / maxMonth) * 100}%`, minHeight: 4, background: m.count > 0 ? '#DC2626' : 'var(--bg-soft)', transition: 'height 0.3s' }} />
              <div className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="text-[13px] font-bold mb-4" style={{ color: 'var(--ink)' }}>처리 현황</div>
        <div className="space-y-2">
          {byStatus.filter(s => s.count > 0).map(s => (
            <div key={s.value} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <div className="text-[12px] w-16" style={{ color: 'var(--ink)' }}>{s.label}</div>
              <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: 'var(--bg-soft)' }}>
                <div className="h-full rounded-full" style={{ width: `${(s.count / items.length) * 100}%`, background: s.color, transition: 'width 0.3s' }} />
              </div>
              <div className="text-[12px] font-bold w-6 text-right" style={{ color: 'var(--ink)' }}>{s.count}</div>
            </div>
          ))}
          {items.length === 0 && <div className="text-[12px] text-center py-4" style={{ color: 'var(--ink-faint)' }}>데이터 없음</div>}
        </div>
        <div className="mt-3 pt-3 flex items-center gap-2" style={{ borderTop: '1px solid var(--line)' }}>
          <CheckCircle2 size={14} style={{ color: '#059669' }} />
          <span className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>종결률</span>
          <span className="text-[16px] font-bold" style={{ color: '#059669' }}>{closeRate}%</span>
        </div>
      </div>

      <div className="p-5 rounded-2xl md:col-span-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="text-[13px] font-bold mb-4" style={{ color: 'var(--ink)' }}>심각도 분포</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SEVERITIES.map(s => {
            const cnt = items.filter(i => i.severity === s.value).length
            return (
              <div key={s.value} className="p-3 rounded-xl text-center" style={{ background: s.bg }}>
                <div className="text-[22px] font-bold" style={{ color: s.color }}>{cnt}</div>
                <div className="text-[10px] mt-0.5" style={{ color: s.color, opacity: 0.8 }}>{s.label.split(' — ')[0]}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── MFDS 보고 현황 탭 ──────────────────────────────────────────
function MdrView({ items, onEdit }) {
  const mdrItems = items.filter(i => i.reportType === '의무보고')

  return (
    <div>
      <div className="p-4 rounded-2xl mb-5" style={{ background: '#EDE9FE', border: '1px solid #C4B5FD' }}>
        <div className="text-[13px] font-bold mb-2" style={{ color: '#4C1D95' }}>🏛 MFDS(의료기기 이상사례) 의무보고 판단 기준</div>
        <div className="space-y-1">
          {MDR_GUIDE.map((g, i) => (
            <div key={i} className="flex items-start gap-2 text-[12px]" style={{ color: '#5B21B6' }}>
              <span className="flex-shrink-0 font-bold">{i + 1}.</span>
              <span>{g}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 text-[11px]" style={{ color: '#7C3AED' }}>
          ※ 식약처 보고 기한: 사망/중상해 → 즉시(인지 후 24h 이내) ~ 30일 이내 / 기타 → 30일 이내
        </div>
      </div>

      {mdrItems.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--ink-faint)' }}>
          <FileWarning size={40} strokeWidth={1.2} className="mx-auto mb-3 opacity-30" />
          <div>의무보고 대상 이상사례가 없습니다</div>
        </div>
      ) : (
        <div className="space-y-3">
          {mdrItems.filter(i => !i.reportDate).length > 0 && (
            <div>
              <div className="text-[12px] font-bold mb-2 flex items-center gap-2" style={{ color: '#DC2626' }}>
                <AlertTriangle size={13} /> 미보고 ({mdrItems.filter(i => !i.reportDate).length}건)
              </div>
              {mdrItems.filter(i => !i.reportDate).map(item => <MdrRow key={item.id} item={item} onEdit={onEdit} />)}
            </div>
          )}
          {mdrItems.filter(i => i.reportDate).length > 0 && (
            <div>
              <div className="text-[12px] font-bold mb-2 flex items-center gap-2" style={{ color: '#059669' }}>
                <CheckCircle2 size={13} /> 보고 완료 ({mdrItems.filter(i => i.reportDate).length}건)
              </div>
              {mdrItems.filter(i => i.reportDate).map(item => <MdrRow key={item.id} item={item} onEdit={onEdit} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MdrRow({ item, onEdit }) {
  const done = !!item.reportDate
  const sev = SEVERITIES.find(s => s.value === item.severity) || SEVERITIES[3]
  const incidentDays = item.incidentDate ? Math.ceil((new Date() - new Date(item.incidentDate)) / 86400000) : 0

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl cursor-pointer" style={{ background: done ? '#F0FDF4' : '#FEF3C7', border: `1px solid ${done ? '#BBF7D0' : '#FDE68A'}` }} onClick={() => onEdit(item)}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: done ? '#D1FAE5' : '#FEE2E2' }}>
        {done ? <CheckCircle2 size={18} style={{ color: '#059669' }} /> : <AlertTriangle size={18} style={{ color: '#DC2626' }} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[10px]" style={{ color: 'var(--ink-faint)' }}>{item.id}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: sev.bg, color: sev.color }}>{sev.label.split(' — ')[0]}</span>
        </div>
        <div className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{item.productName || '-'}</div>
        <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>발생 {item.incidentDate} ({incidentDays}일 경과)</div>
      </div>
      <div className="text-right flex-shrink-0">
        {done ? (
          <>
            <div className="text-[11px] font-bold" style={{ color: '#059669' }}>보고 완료</div>
            <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{item.reportDate}</div>
            <div className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>접수번호: {item.reportNo || '-'}</div>
          </>
        ) : (
          <>
            <div className="text-[11px] font-bold" style={{ color: '#DC2626' }}>미보고</div>
            <div className="text-[11px]" style={{ color: '#D97706' }}>{incidentDays}일 경과</div>
            <div className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>클릭하여 보고 정보 입력</div>
          </>
        )}
      </div>
    </div>
  )
}

// ── 이상사례 등록/수정 폼 모달 ────────────────────────────────
function AdverseForm({ form, fld, editId, onSubmit, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px', overflowY: 'auto' }} onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--line)', width: '100%', maxWidth: 700, boxShadow: '0 24px 64px rgba(0,0,0,0.3)', padding: 28 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="text-[16px] font-bold" style={{ color: 'var(--ink)' }}>{editId ? '이상사례 수정' : '이상사례 등록'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)' }}><X size={20} /></button>
        </div>

        <div className="space-y-3">
          <R2>
            <F l="제품명 * (등록 품목 검색)">
              <input value={form.productName} onChange={e => fld('productName', e.target.value)} style={IS} className="w-full" list="adverse-product-list" placeholder="제품명 입력 또는 검색..." />
              <datalist id="adverse-product-list">{importProductNames().map(n => <option key={n} value={n} />)}</datalist>
            </F>
            <F l="발생일 *"><input type="date" value={form.incidentDate} onChange={e => fld('incidentDate', e.target.value)} style={IS} className="w-full" /></F>
          </R2>
          <R2>
            <F l="보고 유형">
              <select value={form.reportType} onChange={e => fld('reportType', e.target.value)} style={IS} className="w-full">
                {REPORT_TYPE_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </F>
            <F l="보고번호 (식약처 접수번호)"><input value={form.reportNo} onChange={e => fld('reportNo', e.target.value)} style={IS} className="w-full" /></F>
          </R2>

          <F l="심각도 (부상·피해 수준)">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {SEVERITIES.map(s => (
                <button key={s.value} type="button" onClick={() => fld('severity', s.value)}
                  className="p-2 rounded-xl text-[11px] font-semibold text-center transition"
                  style={{ background: form.severity === s.value ? s.bg : 'var(--bg-soft)', color: form.severity === s.value ? s.color : 'var(--ink-faint)', border: `2px solid ${form.severity === s.value ? s.color : 'transparent'}`, cursor: 'pointer' }}>
                  {s.label.split(' — ')[0]}<div style={{ fontSize: 9, fontWeight: 400, marginTop: 2 }}>{s.label.split(' — ')[1]}</div>
                </button>
              ))}
            </div>
          </F>

          <F l="이상사례 내용 *"><textarea value={form.description} onChange={e => fld('description', e.target.value)} rows={3} placeholder="발생 경위, 증상, 관련 환자/사용자 정보 등을 기재합니다." style={{ ...IS, resize: 'vertical' }} className="w-full" /></F>
          <F l="즉각 조치 (현장 조치 등)"><textarea value={form.immediateAction} onChange={e => fld('immediateAction', e.target.value)} rows={2} style={{ ...IS, resize: 'vertical' }} className="w-full" /></F>

          <R2>
            <F l="담당자"><input value={form.assignee} onChange={e => fld('assignee', e.target.value)} style={IS} className="w-full" /></F>
            <F l="처리 마감일"><input type="date" value={form.dueDate} onChange={e => fld('dueDate', e.target.value)} style={IS} className="w-full" /></F>
          </R2>

          {editId && (
            <>
              {form.reportType === '의무보고' && (
                <div className="p-4 rounded-xl" style={{ background: '#EDE9FE', border: '1px solid #C4B5FD' }}>
                  <div className="text-[13px] font-semibold mb-2" style={{ color: '#4C1D95' }}>MFDS 규제 보고 정보</div>
                  <R2>
                    <F l="보고일"><input type="date" value={form.reportDate} onChange={e => fld('reportDate', e.target.value)} style={IS} className="w-full" /></F>
                    <F l="식약처 접수 번호"><input value={form.reportNo} onChange={e => fld('reportNo', e.target.value)} placeholder="접수 번호" style={IS} className="w-full" /></F>
                  </R2>
                </div>
              )}

              <div className="text-[11.5px] font-bold pt-1" style={{ color: 'var(--ink-faint)' }}>진행 상황 (접수 후 조사·처리 진행에 따라 입력)</div>
              <F l="조사 결과"><textarea value={form.investigation} onChange={e => fld('investigation', e.target.value)} rows={2} style={{ ...IS, resize: 'vertical' }} className="w-full" /></F>
              <R2>
                <F l="근본 원인"><textarea value={form.rootCause} onChange={e => fld('rootCause', e.target.value)} rows={2} style={{ ...IS, resize: 'vertical' }} className="w-full" /></F>
                <F l="시정 조치"><textarea value={form.corrective} onChange={e => fld('corrective', e.target.value)} rows={2} style={{ ...IS, resize: 'vertical' }} className="w-full" /></F>
              </R2>
              <F l="후속 조치 (제품 회수, CAPA 연계 등)"><textarea value={form.followup} onChange={e => fld('followup', e.target.value)} rows={2} style={{ ...IS, resize: 'vertical' }} className="w-full" /></F>

              {(() => {
                const computed = STATUSES.find(s => s.value === deriveAdverseStatus(form)) || STATUSES[0]
                return (
                  <div className="p-3 rounded-xl flex items-center justify-between" style={{ background: computed.bg, border: `1px solid ${computed.color}40` }}>
                    <span className="text-[12px]" style={{ color: computed.color }}>처리 상태 (작성 내용 기준 자동 산정)</span>
                    <span className="text-[12.5px] font-bold" style={{ color: computed.color }}>{computed.label}</span>
                  </div>
                )
              })()}
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input type="checkbox" checked={form.status === 'rejected'} onChange={e => fld('status', e.target.checked ? 'rejected' : 'received')} style={{ width: 15, height: 15 }} />
                <span className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>이 이상사례를 반려 처리합니다 (근거 없음 등)</span>
              </label>
            </>
          )}
          <F l="비고"><textarea value={form.notes} onChange={e => fld('notes', e.target.value)} rows={2} style={{ ...IS, resize: 'vertical' }} className="w-full" /></F>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>취소</button>
          <button onClick={onSubmit} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: '#DC2626', color: 'white', border: 'none', cursor: 'pointer' }}>
            {editId ? '수정 저장' : '이상사례 등록'}
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
const IS = { border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--ink)', background: 'var(--bg-card)', outline: 'none', width: '100%' }

function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <AlertOctagon size={48} strokeWidth={1} className="mx-auto mb-3 opacity-30" style={{ color: '#DC2626' }} />
      <div className="text-[16px] font-bold mb-1" style={{ color: 'var(--ink-soft)' }}>등록된 이상사례 없음</div>
      <div className="text-[13px] mb-5" style={{ color: 'var(--ink-faint)' }}>이상사례를 등록하고 체계적으로 처리하세요</div>
      <button onClick={onAdd} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold" style={{ background: '#DC2626', color: 'white', border: 'none', cursor: 'pointer' }}>
        <Plus size={15} /> 첫 번째 이상사례 등록
      </button>
    </div>
  )
}
