// src/pages/customer-req/CustomerReqHub.jsx
// ISO 13485 §7.2 — 고객 관련 프로세스 (요구사항 결정·검토·커뮤니케이션)
import React, { useState, useMemo } from 'react'
import {
  Plus, Save, Edit2, Trash2, FileText, Link2,
  CheckCircle2, Clock, AlertTriangle, MessageSquare,
  ClipboardList, BarChart2, ChevronDown, ChevronUp,
  User, Phone, Mail, Package,
  Users,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'
import { useSearchParams } from 'react-router-dom'
import { onboarding, productKeyOf } from '../../lib/onboardingState'
import { productModels } from '../../lib/productLifecycleState'
import { companyDocs } from '../../lib/companyState'

// ── 상수 ─────────────────────────────────────────────────────
const LS_KEY = 'qualytree.customer_reqs'

function salesCustomerNames() {
  try {
    const raw = localStorage.getItem('qms_sal_customers')
    if (!raw) return []
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list.map(c => c.name).filter(Boolean) : []
  } catch { return [] }
}

// 기존 허가 제품 목록(모델·코드) — 제품명 검색 시 매칭되면 제품 코드를 자동으로 채운다.
function licensedProducts() {
  try {
    const ob = onboarding.load()
    const products = (Array.isArray(ob.products) && ob.products.length)
      ? ob.products
      : (ob.product && ob.product.name ? [ob.product] : [])
    return productModels.getAll()
      .map(m => {
        const p = products.find(pp => productKeyOf(pp) === m.productKey)
        return { name: (p && p.name) || '', code: m.code || m.spec || '' }
      })
      .filter(m => m.name && m.code)
  } catch { return [] }
}

const REQ_STATUSES = {
  captured:  { label: '접수',    color: '#6366F1', bg: '#EEF2FF' },
  reviewing: { label: '검토 중', color: '#D97706', bg: '#FEF3C7' },
  accepted:  { label: '수락',    color: '#059669', bg: '#D1FAE5' },
  rejected:  { label: '반려',    color: '#DC2626', bg: '#FEE2E2' },
  closed:    { label: '완료',    color: '#9CA3AF', bg: '#F3F4F6' },
}

const REQ_TYPES = [
  '제품 사양 요구사항',
  '납기·납품 조건',
  '인도 후 활동 (설치·서비스·교육)',
  '법적·규제 요구사항',
  '포장·라벨링 요구사항',
  '품질보증·시험성적서',
  '고객 지급 자재·설비',
  '추가 요구사항 (미명시)',
]

const COMM_TYPES = [
  '이메일', '전화', '미팅', '공문', '견적서 검토', '계약서', '기타',
]

const REVIEW_ITEMS = [
  '요구사항이 충분히 명확하게 정의되었는가?',
  '문서로 명시되지 않은 요구사항이 파악되었는가?',
  '고객이 명시하지 않았으나 의도된 사용에 필요한 요건이 반영되었는가?',
  '법적·규제 요건이 충족 가능한가?',
  '이전 계약·주문과 차이가 있을 경우 검토되었는가?',
  '현재 생산 능력으로 이행 가능한가?',
  '납기 일정이 현실적인가?',
  '필요 문서(성적서, 인증서 등) 제공 가능한가?',
]

function genId() { return `CR-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }
function today() { return new Date().toISOString().slice(0, 10) }

const EMPTY_FORM = {
  customerName: '', customerCode: '', contactPerson: '', contactPhone: '', contactEmail: '',
  productKey: '', productName: '', productCode: '', orderNo: '',
  inquiryDate: today(), reviewDate: '', acceptedDate: '',
  status: 'captured',
  requirements: REQ_TYPES.map(t => ({ type: t, content: '', applicable: true, updatedBy: '', updatedAt: '' })),
  reviewItems: REVIEW_ITEMS.map(text => ({ text, result: null, note: '' })),
  reviewMisc: '',
  reviewedBy: '', approvedBy: '',
  linkedSalesId: '', linkedQualityPlanId: '', linkedDhfId: '',
  notes: '',
  communications: [],
}

// #39: 담당자가 요구사항 내용을 작성한 것 자체를 확인 완료로 간주한다(별도 확인 체크박스 불필요).
function requirementsReady(rec) {
  return (rec.requirements || []).every(r => r.applicable === false || (r.content && r.content.trim()))
}

// ── 메인 ─────────────────────────────────────────────────────
export default function CustomerReqHub({ embedded = false, productKey: scopeProductKey = null, productLabel = '' } = {}) {
  const user = auth.current()
  const canEdit = user?.level >= 2
  const [searchParams] = useSearchParams()
  // #306: 제품공정(ProductsHub)에 임베드될 때는 해당 제품(productKey)의 요구사항만 노출한다.
  const scopeKey = scopeProductKey || searchParams.get('productId') || null

  const [records, setRecords] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
  })

  const [tab, setTab] = useState('list')        // list | detail | analysis
  const [selectedId, setSelectedId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [commForm, setCommForm] = useState({ date: today(), type: '이메일', summary: '', by: '' })
  const [showCommForm, setShowCommForm] = useState(false)

  function save(list) { setRecords(list); localStorage.setItem(LS_KEY, JSON.stringify(list)) }

  function submitRecord() {
    if (!form.customerName.trim()) return alert('고객사명을 입력하세요.')
    if (!form.productName.trim()) return alert('제품명을 입력하세요.')
    const next = editId
      ? records.map(r => r.id === editId ? { ...r, ...form } : r)
      : [{ id: genId(), createdAt: today(), ...form }, ...records]
    save(next)
    setShowForm(false); setForm(EMPTY_FORM); setEditId(null)
  }

  function deleteRecord(id) {
    if (!confirm('고객 요구사항 기록을 삭제하시겠습니까?')) return
    save(records.filter(r => r.id !== id))
    if (selectedId === id) { setSelectedId(null); setTab('list') }
  }

  function quickStatus(id, status) {
    // #46: 요구사항 각 항목이 (해당없음 체크 또는) 담당자 입력+확인까지 완료되어야 검토를 시작할 수 있다.
    if (status === 'reviewing') {
      const rec = records.find(r => r.id === id)
      if (rec && !requirementsReady(rec)) {
        alert('모든 요구사항 항목의 내용을 입력(또는 해당없음 체크)하고 담당자 확인까지 완료해야 검토를 요청할 수 있습니다.')
        return
      }
    }
    const upd = { status }
    if (status === 'accepted') upd.acceptedDate = today()
    if (status === 'reviewing') upd.reviewDate = today()
    save(records.map(r => r.id === id ? { ...r, ...upd } : r))
    // 선택된 기록이 업데이트되는 경우 즉시 반영
    if (selectedId === id) {
      setSelectedId(id)
    }
  }

  // 검토 완료(종결)는 상태 버튼 한 번으로 끝나지 않고, 기본정보에 등록된
  // 품질책임자 또는 대표이사 본인만 승인자 성명을 입력해 승인해야 완료 처리된다.
  function completeReview(id) {
    const rec = records.find(r => r.id === id)
    if (!rec) return
    if (rec.status !== 'accepted') return
    if (!reviewPassed(rec)) {
      alert('모든 검토 항목이 통과 또는 해당없음으로 완료되어야 승인할 수 있습니다.')
      return
    }
    const qmName = ((companyDocs.getQualityManager() || {}).name || '').trim()
    const ceoName = ((onboarding.load().company || {}).ceo || '').trim()
    if (!qmName && !ceoName) {
      alert('기본정보에 품질책임자 또는 대표이사가 등록되어 있지 않습니다. 먼저 기본정보에서 등록하세요.')
      return
    }
    const who = [qmName && `품질책임자(${qmName})`, ceoName && `대표이사(${ceoName})`].filter(Boolean).join(' 또는 ')
    const input = window.prompt(`검토 완료 승인 — ${who} 본인만 승인할 수 있습니다.\n승인자 성명을 입력하세요:`, '')
    if (input === null) return
    const approver = input.trim()
    if (!approver) { alert('승인자 성명을 입력해야 합니다.'); return }
    if (approver !== qmName && approver !== ceoName) {
      alert('입력한 이름이 등록된 품질책임자 또는 대표이사와 일치하지 않아 승인할 수 없습니다.')
      return
    }
    save(records.map(r => r.id === id ? { ...r, status: 'closed', approvedBy: approver, approvedDate: today() } : r))
    if (selectedId === id) setSelectedId(id)
  }

  function updateReviewItem(recId, idx, field, value) {
    const next = records.map(r => {
      if (r.id !== recId) return r
      const items = [...(r.reviewItems || [])]
      items[idx] = { ...items[idx], [field]: value }
      return { ...r, reviewItems: items }
    })
    save(next)
  }

  function updateRequirement(recId, idx, field, value) {
    const next = records.map(r => {
      if (r.id !== recId) return r
      const reqs = [...(r.requirements || [])]
      reqs[idx] = { ...reqs[idx], [field]: value }
      return { ...r, requirements: reqs }
    })
    save(next)
  }

  // #37/#38 — 요구사항 내용은 "저장" 버튼을 눌러야 확정 반영되고(입력 중 상태와 구분되어 저장 여부를
  // 명확히 알 수 있음), 담당자는 별도 입력 없이 저장을 누른 로그인 사용자로 자동 기록된다.
  function saveRequirementContent(recId, idx, content) {
    const who = user?.name || user?.email || '(알 수 없음)'
    const next = records.map(r => {
      if (r.id !== recId) return r
      const reqs = [...(r.requirements || [])]
      reqs[idx] = { ...reqs[idx], content, updatedBy: who, updatedAt: today() }
      return { ...r, requirements: reqs }
    })
    save(next)
  }

  // #49: 검토 체크리스트에 정형화되지 않은 기타 사항을 자유롭게 기록할 수 있게 한다.
  function updateReviewMisc(recId, value) {
    save(records.map(r => r.id === recId ? { ...r, reviewMisc: value } : r))
  }

  function addCommunication(recId) {
    if (!commForm.summary.trim()) return alert('내용을 입력하세요.')
    const entry = { ...commForm, id: Date.now() }
    const next = records.map(r => {
      if (r.id !== recId) return r
      return { ...r, communications: [...(r.communications || []), entry] }
    })
    save(next)
    setCommForm({ date: today(), type: '이메일', summary: '', by: '' })
    setShowCommForm(false)
  }

  function deleteComm(recId, commId) {
    const next = records.map(r => {
      if (r.id !== recId) return r
      return { ...r, communications: (r.communications || []).filter(c => c.id !== commId) }
    })
    save(next)
  }

  const selected = records.find(r => r.id === selectedId)

  const scopedRecords = scopeKey ? records.filter(r => r.productKey === scopeKey) : records

  const filteredRecords = useMemo(() => scopedRecords.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false
    return true
  }), [scopedRecords, filterStatus])

  function reviewPassed(rec) {
    return (rec.reviewItems || []).every(i => i.result === 'pass' || i.result === 'na')
  }

  // 분석
  const analysis = useMemo(() => {
    const byStatus = {}
    Object.keys(REQ_STATUSES).forEach(k => { byStatus[k] = scopedRecords.filter(r => r.status === k).length })
    const pendingReview = scopedRecords.filter(r => r.status === 'captured' || r.status === 'reviewing')
    const recentComms = scopedRecords.flatMap(r =>
      (r.communications || []).map(c => ({ ...c, recId: r.id, customerName: r.customerName, productName: r.productName }))
    ).sort((a, b) => (b.date > a.date ? 1 : -1)).slice(0, 5)
    return { byStatus, pendingReview, recentComms }
  }, [scopedRecords])

  const body = (
    <div className={embedded ? '' : 'px-6 lg:px-8 py-6 max-w-[1400px] mx-auto'}>

        {/* 탭 */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-soft)' }}>
          {[
            { key: 'list',     label: `현황 분석 (${scopedRecords.length})` },
            { key: 'detail',   label: '상세 검토', disabled: !selectedId },
          ].map(t => (
            <button key={t.key} onClick={() => !t.disabled && setTab(t.key)} disabled={t.disabled}
              className="px-4 py-1.5 rounded-lg text-[13px] font-semibold transition"
              style={{
                background: tab === t.key ? 'var(--bg-card)' : 'transparent',
                color: t.disabled ? 'var(--ink-faint)' : tab === t.key ? 'var(--moss)' : 'var(--ink-soft)',
                boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                border: 'none', cursor: t.disabled ? 'not-allowed' : 'pointer',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── 목록 탭 ── */}
        {tab === 'list' && (
          <div>
            <AnalysisView analysis={analysis} setSelectedId={setSelectedId} setTab={setTab} />
            <div className="flex flex-wrap gap-3 mb-4 mt-5 items-center justify-between">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-[13px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                <option value="all">전체 상태</option>
                {Object.entries(REQ_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              {canEdit && (
                <button onClick={() => { setForm({ ...EMPTY_FORM, productKey: scopeKey || '', productName: scopeKey ? productLabel : '' }); setEditId(null); setShowForm(true) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} /> 신규 요구사항 등록
                </button>
              )}
            </div>

            {showForm && (
              <RecordForm form={form} setForm={setForm} onSave={submitRecord}
                onCancel={() => { setShowForm(false); setForm(EMPTY_FORM); setEditId(null) }}
                isEdit={!!editId} />
            )}

            {filteredRecords.length === 0 ? (
              <div className="text-center py-20" style={{ color: 'var(--ink-faint)' }}>
                <ClipboardList size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <div className="text-[14px]">등록된 고객 요구사항이 없습니다.</div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRecords.map(rec => {
                  const sm = REQ_STATUSES[rec.status] || REQ_STATUSES.captured
                  const passed = reviewPassed(rec)
                  return (
                    <div key={rec.id} className="p-4 rounded-2xl cursor-pointer transition"
                      style={{ background: 'var(--bg-card)', border: '1.5px solid var(--line)' }}
                      onClick={() => { setSelectedId(rec.id); setTab('detail') }}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-[11px] font-mono" style={{ color: 'var(--ink-faint)' }}>{rec.id}</span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
                            {rec.status === 'accepted' && passed && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: '#D1FAE5', color: '#059669' }}>검토 통과</span>
                            )}
                          </div>
                          <div className="text-[15px] font-bold" style={{ color: 'var(--ink)' }}>{rec.customerName}</div>
                          <div className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>{rec.productName} {rec.productCode ? `(${rec.productCode})` : ''}</div>
                          <div className="text-[11.5px] mt-1" style={{ color: 'var(--ink-faint)' }}>
                            접수: {rec.inquiryDate}
                            {rec.contactPerson && ` · 담당: ${rec.contactPerson}`}
                            {rec.orderNo && ` · 주문번호: ${rec.orderNo}`}
                          </div>
                        </div>

                        {(rec.communications || []).length > 0 && (
                          <div className="text-[10.5px] flex items-center gap-1 shrink-0" style={{ color: '#2563EB' }}>
                            <MessageSquare size={9} /> {rec.communications.length}건
                          </div>
                        )}
                      </div>

                      {canEdit && (
                        <div className="flex gap-1 mt-3 flex-wrap" onClick={e => e.stopPropagation()}>
                          {rec.status === 'captured' && (requirementsReady(rec)
                            ? <QuickBtn label="검토 시작" color="#D97706" onClick={() => quickStatus(rec.id, 'reviewing')} />
                            : <span className="text-[10.5px] px-2 py-1 rounded-lg" style={{background:'var(--bg-soft)',color:'var(--ink-faint)'}}>요구사항 입력·담당자확인 필요</span>)}
                          {rec.status === 'reviewing' && <QuickBtn label="수락" color="#059669" onClick={() => quickStatus(rec.id, 'accepted')} />}
                          {rec.status === 'reviewing' && <QuickBtn label="반려" color="#DC2626" onClick={() => quickStatus(rec.id, 'rejected')} />}
                          {rec.status === 'accepted'  && <QuickBtn label="완료(승인)" color="#9CA3AF" onClick={() => completeReview(rec.id)} />}
                          <button onClick={() => { setForm({ ...EMPTY_FORM, ...rec }); setEditId(rec.id); setShowForm(true) }}
                            className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                            <Edit2 size={12} style={{ color: 'var(--ink-soft)' }} />
                          </button>
                          <button onClick={() => deleteRecord(rec.id)}
                            className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', border: '1px solid #FECACA', cursor: 'pointer' }}>
                            <Trash2 size={12} style={{ color: '#DC2626' }} />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── 상세 탭 ── */}
        {tab === 'detail' && selected && (
          <DetailView
            rec={selected} canEdit={canEdit}
            updateReviewItem={updateReviewItem} updateRequirement={updateRequirement} updateReviewMisc={updateReviewMisc}
            saveRequirementContent={saveRequirementContent}
            commForm={commForm} setCommForm={setCommForm}
            showCommForm={showCommForm} setShowCommForm={setShowCommForm}
            addCommunication={addCommunication} deleteComm={deleteComm}
            quickStatus={quickStatus} completeReview={completeReview} reviewPassed={reviewPassed}
          />
        )}

    </div>
  )

  if (embedded) return body

  return (
    <AppLayout user={user} title="고객 요구사항 검토" subtitle="ISO 13485 §7.2 — 요구사항 결정·검토·커뮤니케이션">
      <HubBanner title="고객 요구사항 검토" subtitle="ISO 13485 §7.2 — 고객 요구사항 파악·계약 검토·소통" icon={Users} color="#2563EB" />
      {body}
    </AppLayout>
  )
}

// ── 상세 뷰 ──────────────────────────────────────────────────
function DetailView({ rec, canEdit, updateReviewItem, updateRequirement, updateReviewMisc, saveRequirementContent,
  commForm, setCommForm, showCommForm, setShowCommForm, addCommunication, deleteComm,
  quickStatus, completeReview, reviewPassed }) {
  const sm = REQ_STATUSES[rec.status] || REQ_STATUSES.captured
  const passed = reviewPassed(rec)
  const reviewReady = requirementsReady(rec)
  const [openSec, setOpenSec] = useState({ reqs: true, review: true, comms: true })
  const toggle = k => setOpenSec(s => ({ ...s, [k]: !s[k] }))

  return (
    <div className="space-y-4">
      {/* 헤더 카드 */}
      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[12px] font-mono" style={{ color: 'var(--ink-faint)' }}>{rec.id}</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
              {passed && rec.status === 'accepted' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: '#D1FAE5', color: '#059669' }}>검토 통과</span>
              )}
            </div>
            <div className="text-[20px] font-bold" style={{ color: 'var(--ink)' }}>{rec.customerName}</div>
            <div className="text-[13px]" style={{ color: 'var(--ink-soft)' }}>{rec.productName} {rec.productCode ? `(${rec.productCode})` : ''}</div>
          </div>
          <div className="text-right text-[12px] space-y-0.5" style={{ color: 'var(--ink-faint)' }}>
            {rec.contactPerson && <div className="flex items-center gap-1 justify-end"><User size={10} />{rec.contactPerson}</div>}
            {rec.contactPhone && <div className="flex items-center gap-1 justify-end"><Phone size={10} />{rec.contactPhone}</div>}
            {rec.contactEmail && <div className="flex items-center gap-1 justify-end"><Mail size={10} />{rec.contactEmail}</div>}
          </div>
        </div>

        {/* 날짜·담당 메타 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          {[
            { label: '접수일', value: rec.inquiryDate },
            { label: '검토일', value: rec.reviewDate || '-' },
            { label: '수락일', value: rec.acceptedDate || '-' },
            { label: '주문번호', value: rec.orderNo || '-' },
          ].map(({ label, value }) => (
            <div key={label} className="p-2 rounded-xl" style={{ background: 'var(--bg-soft)' }}>
              <div className="text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>{label}</div>
              <div className="text-[12.5px] font-semibold" style={{ color: 'var(--ink)' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* 연결 링크 */}
        {(rec.linkedSalesId || rec.linkedQualityPlanId || rec.linkedDhfId) && (
          <div className="flex gap-2 flex-wrap mb-2">
            {rec.linkedSalesId && <LinkChip label={`영업: ${rec.linkedSalesId}`} color="#2563EB" />}
            {rec.linkedQualityPlanId && <LinkChip label={`QP: ${rec.linkedQualityPlanId}`} color="#7C3AED" />}
            {rec.linkedDhfId && <LinkChip label={`DHF: ${rec.linkedDhfId}`} color="#EC4899" />}
          </div>
        )}

        {rec.notes && (
          <div className="p-3 rounded-xl text-[12.5px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
            {rec.notes}
          </div>
        )}

        {/* 빠른 상태 변경 */}
        {canEdit && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {rec.status === 'captured' && (reviewReady
              ? <QuickBtn label="검토 시작" color="#D97706" onClick={() => quickStatus(rec.id, 'reviewing')} />
              : <span className="text-[11.5px] px-2 py-1.5 rounded-lg" style={{background:'var(--bg-soft)',color:'var(--ink-faint)'}}>모든 요구사항 입력·담당자확인 완료 시 검토 시작 가능</span>)}
            {rec.status === 'reviewing' && <QuickBtn label="수락" color="#059669" onClick={() => quickStatus(rec.id, 'accepted')} />}
            {rec.status === 'reviewing' && <QuickBtn label="반려" color="#DC2626" onClick={() => quickStatus(rec.id, 'rejected')} />}
            {rec.status === 'accepted'  && <QuickBtn label="완료(승인)" color="#9CA3AF" onClick={() => completeReview(rec.id)} />}
          </div>
        )}
      </div>

      {/* §7.2.1 요구사항 섹션 */}
      <SectionCard title="§7.2.1 요구사항 결정" open={openSec.reqs} onToggle={() => toggle('reqs')}>
        <div className="space-y-3">
          {(rec.requirements || []).map((req, i) => (
            <RequirementRow key={i} req={req} idx={i} recId={rec.id} canEdit={canEdit}
              updateRequirement={updateRequirement} saveRequirementContent={saveRequirementContent} />
          ))}
        </div>
      </SectionCard>

      {/* §7.2.2 계약 전 검토 섹션 */}
      <SectionCard title="§7.2.2 요구사항 검토 체크리스트" open={openSec.review} onToggle={() => toggle('review')}>
        <div className="mb-3 p-3 rounded-xl text-[12px]" style={{ background: '#EFF6FF', color: '#1E40AF' }}>
          💡 수주·계약 전에 모든 항목을 검토하고 통과/해당없음으로 표시해야 합니다.
        </div>
        <div className="space-y-2">
          {(rec.reviewItems || []).map((item, i) => {
            const resultColor = item.result === 'pass' ? '#059669' : item.result === 'fail' ? '#DC2626' : item.result === 'na' ? '#9CA3AF' : '#D97706'
            return (
              <div key={i} className="p-3 rounded-xl" style={{ background: 'var(--bg-soft)', border: `1px solid ${item.result ? resultColor + '40' : 'var(--line)'}` }}>
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="text-[12.5px] font-semibold mb-1.5" style={{ color: 'var(--ink)' }}>{item.text}</div>
                    {canEdit && (
                      <input type="text" value={item.note || ''} placeholder="비고 (선택)"
                        onChange={e => updateReviewItem(rec.id, i, 'note', e.target.value)}
                        className="w-full px-2 py-1 rounded-lg text-[11.5px]"
                        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
                    )}
                    {!canEdit && item.note && (
                      <div className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>{item.note}</div>
                    )}
                  </div>
                  {canEdit ? (
                    <div className="flex gap-1 shrink-0 mt-0.5">
                      {[
                        { v: 'pass', label: '통과', c: '#059669' },
                        { v: 'fail', label: '미통과', c: '#DC2626' },
                        { v: 'na',   label: 'N/A',    c: '#9CA3AF' },
                      ].map(({ v, label, c }) => (
                        <button key={v} onClick={() => updateReviewItem(rec.id, i, 'result', item.result === v ? null : v)}
                          className="px-2 py-0.5 rounded-lg text-[10.5px] font-bold"
                          style={{
                            background: item.result === v ? c : 'var(--bg)',
                            color: item.result === v ? '#fff' : c,
                            border: `1px solid ${c}60`, cursor: 'pointer',
                          }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: resultColor + '20', color: resultColor }}>
                      {item.result === 'pass' ? '통과' : item.result === 'fail' ? '미통과' : item.result === 'na' ? 'N/A' : '미검토'}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-3">
          <div className="text-[11px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>기타 사항</div>
          {canEdit ? (
            <textarea value={rec.reviewMisc || ''} rows={2} placeholder="체크리스트에 없는 기타 검토 의견을 입력하세요"
              onChange={e => updateReviewMisc(rec.id, e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg text-[12.5px] resize-none"
              style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
          ) : (
            <div className="text-[12px] p-2 rounded-lg" style={{ background: 'var(--bg-soft)', color: rec.reviewMisc ? 'var(--ink-soft)' : 'var(--ink-faint)' }}>
              {rec.reviewMisc || '기타 사항 없음'}
            </div>
          )}
        </div>
        {(rec.reviewedBy || rec.approvedBy) && (
          <div className="mt-3 flex gap-4 flex-wrap text-[12px]" style={{ color: 'var(--ink-faint)' }}>
            {rec.reviewedBy && <span>검토자: <strong style={{ color: 'var(--ink)' }}>{rec.reviewedBy}</strong></span>}
            {rec.approvedBy && <span>승인자: <strong style={{ color: 'var(--ink)' }}>{rec.approvedBy}</strong>{rec.approvedDate ? ` (${rec.approvedDate})` : ''}</span>}
          </div>
        )}
      </SectionCard>

      {/* §7.2.3 커뮤니케이션 섹션 */}
      <SectionCard title={`§7.2.3 고객 커뮤니케이션 (${(rec.communications || []).length}건)`}
        open={openSec.comms} onToggle={() => toggle('comms')}>
        {canEdit && !showCommForm && (
          <button onClick={() => setShowCommForm(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[12.5px] font-semibold mb-3"
            style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--moss)', cursor: 'pointer' }}>
            <Plus size={13} /> 커뮤니케이션 기록 추가
          </button>
        )}
        {showCommForm && (
          <div className="p-4 rounded-xl mb-3" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>일자</label>
                <input type="date" value={commForm.date} onChange={e => setCommForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-2 py-1 rounded-lg text-[12px]"
                  style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>유형</label>
                <select value={commForm.type} onChange={e => setCommForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full px-2 py-1 rounded-lg text-[12px]"
                  style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                  {COMM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>담당자</label>
                <input type="text" value={commForm.by} onChange={e => setCommForm(f => ({ ...f, by: e.target.value }))} placeholder="이름"
                  className="w-full px-2 py-1 rounded-lg text-[12px]"
                  style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>내용 *</label>
              <textarea value={commForm.summary} onChange={e => setCommForm(f => ({ ...f, summary: e.target.value }))}
                rows={2} placeholder="커뮤니케이션 내용 요약..."
                className="w-full px-3 py-1.5 rounded-lg text-[12.5px] resize-none"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => addCommunication(rec.id)}
                className="px-3 py-1.5 rounded-lg text-[12px] font-bold"
                style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>저장</button>
              <button onClick={() => setShowCommForm(false)}
                className="px-3 py-1.5 rounded-lg text-[12px]"
                style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>취소</button>
            </div>
          </div>
        )}
        <div className="space-y-2">
          {(rec.communications || []).slice().reverse().map(c => (
            <div key={c.id} className="flex items-start gap-3 p-3 rounded-xl"
              style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
              <MessageSquare size={14} style={{ color: '#2563EB', marginTop: 2, flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: '#DBEAFE', color: '#1E40AF' }}>{c.type}</span>
                  <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{c.date}</span>
                  {c.by && <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>· {c.by}</span>}
                </div>
                <div className="text-[12.5px]" style={{ color: 'var(--ink)' }}>{c.summary}</div>
              </div>
              {canEdit && (
                <button onClick={() => deleteComm(rec.id, c.id)}
                  className="p-1 rounded-lg shrink-0" style={{ background: '#FEE2E2', border: '1px solid #FECACA', cursor: 'pointer' }}>
                  <Trash2 size={10} style={{ color: '#DC2626' }} />
                </button>
              )}
            </div>
          ))}
          {(rec.communications || []).length === 0 && (
            <div className="text-center py-6 text-[13px]" style={{ color: 'var(--ink-faint)' }}>커뮤니케이션 기록 없음</div>
          )}
        </div>
      </SectionCard>
    </div>
  )
}

// ── 분석 탭 ──────────────────────────────────────────────────
function AnalysisView({ analysis, setSelectedId, setTab }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(REQ_STATUSES).map(([k, v]) => (
          <div key={k} className="p-4 rounded-2xl text-center" style={{ background: v.bg, border: `1px solid ${v.color}40` }}>
            <div className="text-[26px] font-bold" style={{ color: v.color }}>{analysis.byStatus[k] || 0}</div>
            <div className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>{v.label}</div>
          </div>
        ))}
      </div>

      {analysis.pendingReview.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <div className="text-[13px] font-bold mb-3" style={{ color: '#92400E' }}>⏳ 검토 대기 중 ({analysis.pendingReview.length}건)</div>
          <div className="space-y-1.5">
            {analysis.pendingReview.map(rec => {
              const sm = REQ_STATUSES[rec.status]
              return (
                <div key={rec.id} className="flex items-center justify-between p-2.5 rounded-xl cursor-pointer"
                  style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}
                  onClick={() => { setSelectedId(rec.id); setTab('detail') }}>
                  <div>
                    <span className="text-[12px] font-bold" style={{ color: '#78350F' }}>{rec.customerName}</span>
                    <span className="ml-2 text-[12px]" style={{ color: '#D97706' }}>{rec.productName}</span>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {analysis.recentComms.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>최근 고객 커뮤니케이션</div>
          <div className="space-y-2">
            {analysis.recentComms.map((c, i) => (
              <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl cursor-pointer"
                style={{ background: 'var(--bg-soft)' }}
                onClick={() => { setSelectedId(c.recId); setTab('detail') }}>
                <MessageSquare size={13} style={{ color: '#2563EB', marginTop: 2 }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{c.date} · {c.type} · {c.customerName} / {c.productName}</div>
                  <div className="text-[12.5px] truncate" style={{ color: 'var(--ink)' }}>{c.summary}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── 폼 ───────────────────────────────────────────────────────
function RecordForm({ form, setForm, onSave, onCancel, isEdit }) {
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="mb-6 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>
        {isEdit ? '고객 요구사항 수정' : '고객 요구사항 신규 등록'}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <Field label="고객사명 *" value={form.customerName} onChange={v => F('customerName', v)} list="customerreq-customer-list" listOptions={salesCustomerNames()} />
        <Field label="담당자명" value={form.contactPerson} onChange={v => F('contactPerson', v)} />
        <Field label="연락처" value={form.contactPhone} onChange={v => F('contactPhone', v)} />
        <Field label="이메일" value={form.contactEmail} onChange={v => F('contactEmail', v)} />
        <Field label="제품명 * (기존 허가 제품 검색)" value={form.productName}
          onChange={v => {
            F('productName', v)
            const match = licensedProducts().find(p => p.name === v)
            if (match) F('productCode', match.code)
          }}
          list="customerreq-product-list" listOptions={licensedProducts().map(p => p.name)} />
        <Field label="제품 코드 (기존 허가 제품 선택 시 자동)" value={form.productCode} onChange={v => F('productCode', v)} />
        <Field label="접수일" type="date" value={form.inquiryDate} onChange={v => F('inquiryDate', v)} />
      </div>
      <div className="mb-3">
        <FieldArea label="비고" value={form.notes} onChange={v => F('notes', v)} rows={2} />
      </div>
      <div className="p-3 rounded-xl mb-4 text-[12px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
        💡 저장 후 <strong>상세 검토</strong> 탭에서 요구사항 내용과 검토 체크리스트를 작성하세요.
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
          style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
          <Save size={13} /> 저장
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-[13px]"
          style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>취소</button>
      </div>
    </div>
  )
}

// ── 공통 컴포넌트 ─────────────────────────────────────────────
// #37/#38/#39 — 요구사항 항목 한 줄. 내용은 "저장" 버튼을 눌러야 확정 반영되어 저장 여부를
// 명확히 알 수 있고(#37), 담당자는 저장한 로그인 사용자로 자동 기록되며(#38), 내용을 저장한 것
// 자체가 확인 완료를 의미하므로 별도 확인 체크박스는 없다(#39).
function RequirementRow({ req, idx, recId, canEdit, updateRequirement, saveRequirementContent }) {
  const [draft, setDraft] = useState(req.content || '')
  const [savedFlash, setSavedFlash] = useState(false)
  const dirty = draft !== (req.content || '')

  const doSave = () => {
    saveRequirementContent(recId, idx, draft)
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1600)
  }

  return (
    <div className="p-3 rounded-xl" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12.5px] font-semibold" style={{ color: 'var(--ink)' }}>{req.type}</span>
        {canEdit && (
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={req.applicable !== false}
              onChange={e => updateRequirement(recId, idx, 'applicable', e.target.checked)}
              className="accent-green-500" />
            <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>해당</span>
          </label>
        )}
      </div>
      {req.applicable !== false ? (
        canEdit ? (
          <>
            <textarea value={draft} rows={2} placeholder="요구사항 내용 입력..."
              onChange={e => setDraft(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg text-[12.5px] resize-none"
              style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
            <div className="flex items-center gap-2 mt-1.5">
              <button onClick={doSave} disabled={!dirty}
                className="px-3 py-1 rounded-lg text-[11.5px] font-bold"
                style={{
                  background: dirty ? 'var(--moss)' : 'var(--bg-soft)',
                  color: dirty ? '#fff' : 'var(--ink-faint)',
                  border: dirty ? 'none' : '1px solid var(--line)',
                  cursor: dirty ? 'pointer' : 'not-allowed',
                }}><Save size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />저장</button>
              {savedFlash && <span className="text-[11px] font-semibold" style={{ color: '#059669' }}>✓ 저장됨</span>}
              {!savedFlash && req.updatedBy && (
                <span className="text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>최종 저장: {req.updatedBy} · {req.updatedAt}</span>
              )}
            </div>
          </>
        ) : (
          <div className="text-[12.5px]" style={{ color: req.content ? 'var(--ink-soft)' : 'var(--ink-faint)' }}>
            {req.content || '내용 없음'}
          </div>
        )
      ) : (
        <div className="text-[11.5px] italic" style={{ color: 'var(--ink-faint)' }}>해당 없음 (N/A)</div>
      )}
    </div>
  )
}

function SectionCard({ title, open, onToggle, children }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
      <button onClick={onToggle} className="w-full flex items-center justify-between p-4"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
        <span className="text-[13px] font-bold" style={{ color: 'var(--ink)' }}>{title}</span>
        {open ? <ChevronUp size={14} style={{ color: 'var(--ink-faint)' }} /> : <ChevronDown size={14} style={{ color: 'var(--ink-faint)' }} />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

function QuickBtn({ label, color, onClick }) {
  return (
    <button onClick={onClick} className="px-2 py-1 rounded-lg text-[11px] font-bold"
      style={{ background: `${color}15`, border: `1px solid ${color}40`, color, cursor: 'pointer' }}>
      {label}
    </button>
  )
}

function LinkChip({ label, color }) {
  return (
    <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: color + '15', color, border: `1px solid ${color}40` }}>
      <Link2 size={9} /> {label}
    </span>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder, list, listOptions }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} list={list}
        className="w-full px-3 py-1.5 rounded-xl text-[13px]"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
      {list && listOptions && <datalist id={list}>{listOptions.map(n => <option key={n} value={n} />)}</datalist>}
    </div>
  )
}
function FieldSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <select value={value || ''} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-1.5 rounded-xl text-[13px]"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
function FieldArea({ label, value, onChange, rows = 3 }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows}
        className="w-full px-3 py-1.5 rounded-xl text-[13px] resize-none"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
    </div>
  )
}
