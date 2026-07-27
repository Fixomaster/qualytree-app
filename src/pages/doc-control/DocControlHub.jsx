// src/pages/doc-control/DocControlHub.jsx
// ISO 13485 §4.2.3 문서 관리 + §4.2.4 기록 관리
import React, { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Plus, Save, Edit2, Trash2, FileText, History,
  Users, BarChart2, AlertTriangle, CheckCircle2,
  Clock, Download, Eye, RotateCcw, Link2,
  BookOpen, ClipboardList, Archive,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'
import { companyDocs, DOC_CATEGORY } from '../../lib/companyState'
import { onboarding } from '../../lib/onboardingState'
import { fileStore } from '../../lib/fileStore'
import { Paperclip, X, Building2 } from 'lucide-react'

// ── 상수 ─────────────────────────────────────────────────────
const LS_KEY_DOCS = 'qualytree.doc_register'
const LS_KEY_RECS = 'qualytree.doc_records'

const DOC_TYPES = {
  QM:   { label: '품질 매뉴얼',   badge: 'QM',  color: '#7C3AED', bg: '#EDE9FE' },
  SOP:  { label: '표준작업절차서', badge: 'SOP', color: '#2563EB', bg: '#DBEAFE' },
  WI:   { label: '작업지시서',    badge: 'WI',  color: '#0891B2', bg: '#CFFAFE' },
  FORM: { label: '서식',          badge: 'FM',  color: '#059669', bg: '#D1FAE5' },
  SPEC: { label: '사양서',        badge: 'SP',  color: '#D97706', bg: '#FEF3C7' },
  PLAN: { label: '계획서',        badge: 'PL',  color: '#DC2626', bg: '#FEE2E2' },
  REPT: { label: '보고서',        badge: 'RP',  color: '#9CA3AF', bg: '#F3F4F6' },
  OTHER:{ label: '기타',          badge: 'OT',  color: '#6B7280', bg: '#F9FAFB' },
}

const DOC_STATUSES = {
  draft:       { label: '초안',    color: '#6366F1', bg: '#EEF2FF' },
  review:      { label: '검토 중', color: '#D97706', bg: '#FEF3C7' },
  approved:    { label: '승인',    color: '#059669', bg: '#D1FAE5' },
  distributed: { label: '배포',    color: '#2563EB', bg: '#DBEAFE' },
  obsolete:    { label: '폐기',    color: '#9CA3AF', bg: '#F3F4F6' },
}

const DEPT_CODES = ['SAL','MFG','PUR','QUA','EQP','DEV','DOC','MR','TRN','RA','AUD','IMP','ALL']

const RETENTION_PERIODS = ['1년', '2년', '3년', '5년', '7년', '10년', '영구 보존']

const DOC_DEPTS = ['품질부(QUA)', '생산부(MFG)', '개발부(DEV)', '영업부(SAL)', '구매부(PUR)', '설비부(EQP)', '문서관리(DOC)', '경영검토(MR)', '인허가(RA)', '전 부서']

function genDocId() { return `DOC-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }
function genRecId() { return `REC-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }
function today() { return new Date().toISOString().slice(0, 10) }

const EMPTY_DOC = {
  docNo: '', title: '', type: 'SOP', status: 'draft',
  revision: 'Rev.0', issueDate: '', approvedDate: '', reviewDate: '',
  author: '', reviewer: '', approver: '',
  ownerDept: '품질부(QUA)',
  distributionList: [],
  retentionPeriod: '3년',
  relatedStandard: '',   // e.g. ISO 13485 §7.5.3
  linkedHubId: '',
  supersededBy: '', supersedes: '',
  scope: '', purpose: '',
  revisionHistory: [],
  notes: '',
}

const EMPTY_REC = {
  recNo: '', title: '', type: 'FORM', status: 'approved',
  formNo: '', revision: 'Rev.0', issueDate: '',
  ownerDept: '품질부(QUA)', retentionPeriod: '3년',
  retentionLocation: '', protectionMethod: '',
  disposalMethod: '파쇄', relatedDocNo: '',
  notes: '',
}

// ── 회사·인증서류 패널 (KGMP §6 — 회사 기본정보 + 인허가 제출용 회사 서류) ──────
const COMPANY_DOC_LIST = [
  DOC_CATEGORY.FACILITY_REG,
  DOC_CATEGORY.BIZ_REG,
  DOC_CATEGORY.MFG_LICENSE,
  DOC_CATEGORY.IMPORT_LICENSE,
  DOC_CATEGORY.AGENT_CONTRACT,
  DOC_CATEGORY.GMP_CERT,
  DOC_CATEGORY.ISO13485_CERT,
]

function CompanyDocsPanel({ canEdit }) {
  const [company, setCompany] = useState(() => onboarding.load().company || {})
  const [docs, setDocs] = useState(() => companyDocs.load().documents || [])
  const [busyCat, setBusyCat] = useState(null)

  function saveCompanyField(field, value) {
    const next = { ...company, [field]: value }
    setCompany(next)
    const s = onboarding.load()
    onboarding.save({ ...s, company: next })
  }

  async function attach(category, file) {
    if (!file) return
    setBusyCat(category)
    try {
      const fileId = await fileStore.saveFile(file)
      const existing = docs.find((d) => d.category === category)
      let next
      if (existing) {
        companyDocs.updateDocument(existing.id, { fileId, fileName: file.name })
      } else {
        companyDocs.addDocument({ category, title: category, fileId, fileName: file.name })
      }
      next = companyDocs.load().documents
      setDocs(next)
    } catch (e) {
      alert(e.message || '파일 첨부에 실패했습니다.')
    } finally {
      setBusyCat(null)
    }
  }

  function removeFile(category) {
    const existing = docs.find((d) => d.category === category)
    if (!existing) return
    companyDocs.updateDocument(existing.id, { fileId: null, fileName: '' })
    setDocs(companyDocs.load().documents)
  }

  return (
    <div className="max-w-3xl">
      <div className="rounded-2xl p-4 mb-4" style={{ border: '1px solid var(--line)', background: 'var(--bg-card)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Building2 size={16} style={{ color: 'var(--moss)' }} />
          <div className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>회사 기본 정보</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-[12px]" style={{ color: 'var(--ink-mute)' }}>
            회사명
            <input
              type="text"
              disabled={!canEdit}
              value={company.name || ''}
              onChange={(e) => saveCompanyField('name', e.target.value)}
              className="w-full mt-1 px-3 py-1.5 rounded-lg text-[13px]"
              style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)' }}
            />
          </label>
          <label className="text-[12px]" style={{ color: 'var(--ink-mute)' }}>
            사업자등록번호
            <input
              type="text"
              disabled={!canEdit}
              value={company.bizNumber || ''}
              onChange={(e) => saveCompanyField('bizNumber', e.target.value)}
              className="w-full mt-1 px-3 py-1.5 rounded-lg text-[13px]"
              style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)' }}
            />
          </label>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
        {COMPANY_DOC_LIST.map((category, i) => {
          const doc = docs.find((d) => d.category === category)
          return (
            <div
              key={category}
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderTop: i === 0 ? 'none' : '1px solid var(--line)', background: 'var(--bg-card)' }}
            >
              <span className="text-[12.5px] font-medium flex-1 min-w-0" style={{ color: 'var(--ink)' }}>{category}</span>
              {doc?.fileId ? (
                <>
                  <span className="text-[11.5px] truncate max-w-[220px]" style={{ color: 'var(--moss)' }}>{doc.fileName || '첨부됨'}</span>
                  {canEdit && (
                    <button type="button" onClick={() => removeFile(category)} className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center" style={{ color: 'var(--ink-faint)' }} title="첨부 제거">
                      <X size={13} />
                    </button>
                  )}
                </>
              ) : (
                <span className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>미등록</span>
              )}
              {canEdit && (
                <label className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-medium cursor-pointer" style={{ background: 'var(--leaf-soft)', color: 'var(--moss)' }}>
                  <Paperclip size={12} />
                  {busyCat === category ? '업로드 중...' : doc?.fileId ? '재첨부' : '첨부'}
                  <input type="file" className="hidden" disabled={busyCat === category}
                    onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; attach(category, f) }} />
                </label>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── 메인 ─────────────────────────────────────────────────────
export default function DocControlHub() {
  const user = auth.current()
  const canEdit = user?.level >= 2
  const [searchParams] = useSearchParams()

  const [docs, setDocs] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY_DOCS) || '[]') } catch { return [] }
  })
  const [recs, setRecs] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY_RECS) || '[]') } catch { return [] }
  })

  const [tab, setTab] = useState(() => searchParams.get('tab') || 'docs')    // company | docs | records | analysis
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_DOC)
  const [editId, setEditId] = useState(null)
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterDept, setFilterDept] = useState('all')
  const [searchQ, setSearchQ] = useState(() => searchParams.get('openName') || '')
  const [showDetail, setShowDetail] = useState(null)

  // 기록 관리
  const [recForm, setRecForm] = useState(EMPTY_REC)
  const [recEditId, setRecEditId] = useState(null)
  const [showRecForm, setShowRecForm] = useState(false)

  function saveDocs(list) { setDocs(list); localStorage.setItem(LS_KEY_DOCS, JSON.stringify(list)) }
  function saveRecs(list) { setRecs(list); localStorage.setItem(LS_KEY_RECS, JSON.stringify(list)) }

  function submitDoc() {
    if (!form.title.trim()) return alert('문서 제목을 입력하세요.')
    if (!form.docNo.trim()) return alert('문서 번호를 입력하세요.')
    const isEdit = !!editId
    const next = isEdit
      ? docs.map(d => d.id === editId ? { ...d, ...form } : d)
      : [{ id: genDocId(), createdAt: today(), revisionHistory: [], ...form }, ...docs]
    saveDocs(next)
    setShowForm(false); setForm(EMPTY_DOC); setEditId(null)
  }

  function deleteDoc(id) {
    if (!confirm('문서를 삭제하시겠습니까?')) return
    saveDocs(docs.filter(d => d.id !== id))
    if (showDetail === id) setShowDetail(null)
  }

  function quickDocStatus(id, status) {
    const upd = { status }
    if (status === 'approved') upd.approvedDate = today()
    if (status === 'distributed') upd.issueDate = today()
    saveDocs(docs.map(d => d.id === id ? { ...d, ...upd } : d))
  }

  function addRevision(docId, revNote) {
    if (!revNote.trim()) return
    const entry = { rev: form.revision || 'Rev.?', date: today(), note: revNote, by: user?.name || '' }
    saveDocs(docs.map(d => {
      if (d.id !== docId) return d
      return { ...d, revisionHistory: [...(d.revisionHistory || []), entry] }
    }))
  }

  function submitRec() {
    if (!recForm.title.trim()) return alert('기록명을 입력하세요.')
    const next = recEditId
      ? recs.map(r => r.id === recEditId ? { ...r, ...recForm } : r)
      : [{ id: genRecId(), createdAt: today(), ...recForm }, ...recs]
    saveRecs(next)
    setShowRecForm(false); setRecForm(EMPTY_REC); setRecEditId(null)
  }

  function deleteRec(id) {
    if (!confirm('기록 항목을 삭제하시겠습니까?')) return
    saveRecs(recs.filter(r => r.id !== id))
  }

  // 필터링
  const filteredDocs = useMemo(() => docs.filter(d => {
    if (filterType !== 'all' && d.type !== filterType) return false
    if (filterStatus !== 'all' && d.status !== filterStatus) return false
    if (filterDept !== 'all' && d.ownerDept !== filterDept) return false
    if (searchQ && !(d.title.toLowerCase().includes(searchQ.toLowerCase()) || d.docNo.toLowerCase().includes(searchQ.toLowerCase()))) return false
    return true
  }), [docs, filterType, filterStatus, filterDept, searchQ])

  // 분석 데이터
  const analysis = useMemo(() => {
    const byType = {}
    Object.keys(DOC_TYPES).forEach(k => { byType[k] = docs.filter(d => d.type === k).length })
    const byStatus = {}
    Object.keys(DOC_STATUSES).forEach(k => { byStatus[k] = docs.filter(d => d.status === k).length })
    const pendingReview = docs.filter(d => {
      if (!d.reviewDate || d.status === 'obsolete') return false
      return new Date(d.reviewDate) <= new Date()
    })
    const draftDocs = docs.filter(d => d.status === 'draft' || d.status === 'review')
    const recsByDept = {}
    recs.forEach(r => { recsByDept[r.ownerDept] = (recsByDept[r.ownerDept] || 0) + 1 })
    return { byType, byStatus, pendingReview, draftDocs, recsByDept }
  }, [docs, recs])

  const detailDoc = docs.find(d => d.id === showDetail)

  return (
    <AppLayout user={user} title="문서 관리" subtitle="ISO 13485 §4.2.3 문서 관리 / §4.2.4 기록 관리">
      <div className="px-6 lg:px-8 py-6 max-w-[1400px] mx-auto">

        {/* 탭 */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-soft)' }}>
          {[
            { key: 'company',  label: '회사·인증서류' },
            { key: 'docs',     label: `문서 대장 (${docs.length})` },
            { key: 'records',  label: `기록 목록 (${recs.length})` },
            { key: 'analysis', label: '현황 분석' },
          ].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setShowDetail(null) }}
              className="px-4 py-1.5 rounded-lg text-[13px] font-semibold transition"
              style={{
                background: tab === t.key ? 'var(--bg-card)' : 'transparent',
                color: tab === t.key ? 'var(--moss)' : 'var(--ink-soft)',
                boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                border: 'none', cursor: 'pointer',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── 회사·인증서류 ── */}
        {tab === 'company' && <CompanyDocsPanel canEdit={canEdit} />}

        {/* ── 문서 대장 ── */}
        {tab === 'docs' && !detailDoc && (
          <div>
            {/* 검색·필터 */}
            <div className="flex flex-wrap gap-2 mb-4 items-center">
              <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="문서번호·제목 검색..."
                className="px-3 py-1.5 rounded-xl text-[13px] flex-1 min-w-[160px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-[13px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                <option value="all">전체 유형</option>
                {Object.entries(DOC_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-[13px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                <option value="all">전체 상태</option>
                {Object.entries(DOC_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              {canEdit && (
                <button onClick={() => { setForm(EMPTY_DOC); setEditId(null); setShowForm(true) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold ml-auto"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} /> 문서 등록
                </button>
              )}
            </div>

            {showForm && (
              <DocForm form={form} setForm={setForm} onSave={submitDoc}
                onCancel={() => { setShowForm(false); setForm(EMPTY_DOC); setEditId(null) }}
                isEdit={!!editId} />
            )}

            {/* 검토 기한 경보 */}
            {analysis.pendingReview.length > 0 && (
              <div className="mb-4 p-3 rounded-xl flex items-center gap-2 text-[12.5px] flex-wrap"
                style={{ background: '#FEF3C7', border: '1px solid #FDE68A', color: '#92400E' }}>
                <AlertTriangle size={14} />
                정기 검토 기한 도래: {analysis.pendingReview.map(d => (
                  <span key={d.id} className="font-bold cursor-pointer underline mx-1" onClick={() => setShowDetail(d.id)}>{d.docNo}</span>
                ))}
              </div>
            )}

            {/* 문서 목록 테이블 */}
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr style={{ background: 'var(--bg-soft)' }}>
                    {['문서번호', '유형', '제목', '개정', '상태', '작성 부서', '승인일', '검토 예정일', ''].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--ink-soft)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredDocs.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-12" style={{ color: 'var(--ink-faint)' }}>등록된 문서가 없습니다.</td></tr>
                  ) : filteredDocs.map((doc, i) => {
                    const tp = DOC_TYPES[doc.type] || DOC_TYPES.OTHER
                    const st = DOC_STATUSES[doc.status] || DOC_STATUSES.draft
                    const reviewOverdue = doc.reviewDate && new Date(doc.reviewDate) <= new Date() && doc.status !== 'obsolete'
                    return (
                      <tr key={doc.id} className="transition cursor-pointer"
                        style={{ background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-soft)', borderTop: '1px solid var(--line)' }}
                        onClick={() => setShowDetail(doc.id)}>
                        <td className="px-3 py-2 font-mono font-semibold" style={{ color: 'var(--moss)' }}>{doc.docNo}</td>
                        <td className="px-3 py-2">
                          <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: tp.bg, color: tp.color }}>{tp.badge}</span>
                        </td>
                        <td className="px-3 py-2 font-semibold" style={{ color: 'var(--ink)' }}>{doc.title}</td>
                        <td className="px-3 py-2 font-mono text-[11.5px]" style={{ color: 'var(--ink-soft)' }}>{doc.revision}</td>
                        <td className="px-3 py-2">
                          <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                        </td>
                        <td className="px-3 py-2" style={{ color: 'var(--ink-soft)' }}>{doc.ownerDept}</td>
                        <td className="px-3 py-2" style={{ color: 'var(--ink-soft)' }}>{doc.approvedDate || '-'}</td>
                        <td className="px-3 py-2" style={{ color: reviewOverdue ? '#DC2626' : 'var(--ink-soft)', fontWeight: reviewOverdue ? 700 : 400 }}>
                          {doc.reviewDate || '-'}{reviewOverdue && ' ⚠'}
                        </td>
                        <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                          {canEdit && (
                            <div className="flex gap-1">
                              {doc.status === 'draft' && <QuickBtn label="검토" color="#D97706" onClick={() => quickDocStatus(doc.id, 'review')} />}
                              {doc.status === 'review' && <QuickBtn label="승인" color="#059669" onClick={() => quickDocStatus(doc.id, 'approved')} />}
                              {doc.status === 'approved' && <QuickBtn label="배포" color="#2563EB" onClick={() => quickDocStatus(doc.id, 'distributed')} />}
                              {doc.status !== 'obsolete' && <QuickBtn label="폐기" color="#9CA3AF" onClick={() => quickDocStatus(doc.id, 'obsolete')} />}
                              <button onClick={() => { setForm({ ...EMPTY_DOC, ...doc }); setEditId(doc.id); setShowForm(true) }}
                                className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                                <Edit2 size={11} style={{ color: 'var(--ink-soft)' }} />
                              </button>
                              <button onClick={() => deleteDoc(doc.id)}
                                className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', border: '1px solid #FECACA', cursor: 'pointer' }}>
                                <Trash2 size={11} style={{ color: '#DC2626' }} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 문서 상세 ── */}
        {tab === 'docs' && detailDoc && (
          <DocDetail doc={detailDoc} canEdit={canEdit}
            onBack={() => setShowDetail(null)} onEdit={() => { setForm({ ...EMPTY_DOC, ...detailDoc }); setEditId(detailDoc.id); setShowForm(true); setShowDetail(null) }}
            onDelete={() => deleteDoc(detailDoc.id)} />
        )}

        {/* ── 기록 목록 ── */}
        {tab === 'records' && (
          <div>
            <div className="flex justify-end mb-4">
              {canEdit && (
                <button onClick={() => { setRecForm(EMPTY_REC); setRecEditId(null); setShowRecForm(true) }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
                  style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Plus size={14} /> 기록 등록
                </button>
              )}
            </div>

            {showRecForm && (
              <RecordForm form={recForm} setForm={setRecForm} onSave={submitRec}
                onCancel={() => { setShowRecForm(false); setRecForm(EMPTY_REC); setRecEditId(null) }}
                isEdit={!!recEditId} />
            )}

            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr style={{ background: 'var(--bg-soft)' }}>
                    {['기록명', '서식번호', '개정', '관리 부서', '보존 기간', '보존 장소', '폐기 방법', ''].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--ink-soft)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recs.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-12" style={{ color: 'var(--ink-faint)' }}>등록된 기록이 없습니다.</td></tr>
                  ) : recs.map((rec, i) => (
                    <tr key={rec.id} style={{ background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-soft)', borderTop: '1px solid var(--line)' }}>
                      <td className="px-3 py-2 font-semibold" style={{ color: 'var(--ink)' }}>{rec.title}</td>
                      <td className="px-3 py-2 font-mono text-[11.5px]" style={{ color: 'var(--moss)' }}>{rec.formNo || '-'}</td>
                      <td className="px-3 py-2 font-mono text-[11.5px]" style={{ color: 'var(--ink-soft)' }}>{rec.revision}</td>
                      <td className="px-3 py-2" style={{ color: 'var(--ink-soft)' }}>{rec.ownerDept}</td>
                      <td className="px-3 py-2">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#EEF2FF', color: '#6366F1' }}>{rec.retentionPeriod}</span>
                      </td>
                      <td className="px-3 py-2" style={{ color: 'var(--ink-soft)' }}>{rec.retentionLocation || '-'}</td>
                      <td className="px-3 py-2" style={{ color: 'var(--ink-soft)' }}>{rec.disposalMethod || '-'}</td>
                      <td className="px-3 py-2">
                        {canEdit && (
                          <div className="flex gap-1">
                            <button onClick={() => { setRecForm({ ...EMPTY_REC, ...rec }); setRecEditId(rec.id); setShowRecForm(true) }}
                              className="p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                              <Edit2 size={11} style={{ color: 'var(--ink-soft)' }} />
                            </button>
                            <button onClick={() => deleteRec(rec.id)}
                              className="p-1.5 rounded-lg" style={{ background: '#FEE2E2', border: '1px solid #FECACA', cursor: 'pointer' }}>
                              <Trash2 size={11} style={{ color: '#DC2626' }} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 분석 탭 ── */}
        {tab === 'analysis' && (
          <AnalysisView analysis={analysis} docs={docs} recs={recs} setShowDetail={setShowDetail} setTab={setTab} />
        )}
      </div>
    </AppLayout>
  )
}

// ── 문서 상세 뷰 ─────────────────────────────────────────────
function DocDetail({ doc, canEdit, onBack, onEdit, onDelete }) {
  const tp = DOC_TYPES[doc.type] || DOC_TYPES.OTHER
  const st = DOC_STATUSES[doc.status] || DOC_STATUSES.draft

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 mb-4 text-[13px]"
        style={{ background: 'none', border: 'none', color: 'var(--moss)', cursor: 'pointer' }}>
        ← 목록으로
      </button>

      <div className="p-5 rounded-2xl mb-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: tp.bg, color: tp.color }}>{tp.label}</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
              <span className="text-[11px] font-mono" style={{ color: 'var(--ink-faint)' }}>{doc.revision}</span>
            </div>
            <div className="text-[11px] font-mono font-bold" style={{ color: 'var(--moss)' }}>{doc.docNo}</div>
            <div className="text-[20px] font-bold" style={{ color: 'var(--ink)' }}>{doc.title}</div>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <button onClick={onEdit} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12px]"
                style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
                <Edit2 size={12} /> 수정
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: '작성자', value: doc.author || '-' },
            { label: '검토자', value: doc.reviewer || '-' },
            { label: '승인자', value: doc.approver || '-' },
            { label: '관리 부서', value: doc.ownerDept },
            { label: '발행일', value: doc.issueDate || '-' },
            { label: '승인일', value: doc.approvedDate || '-' },
            { label: '정기검토일', value: doc.reviewDate || '-' },
            { label: '보존 기간', value: doc.retentionPeriod },
          ].map(({ label, value }) => (
            <div key={label} className="p-2 rounded-xl" style={{ background: 'var(--bg-soft)' }}>
              <div className="text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>{label}</div>
              <div className="text-[12.5px] font-semibold" style={{ color: 'var(--ink)' }}>{value}</div>
            </div>
          ))}
        </div>

        {doc.relatedStandard && (
          <div className="mb-3 p-2.5 rounded-xl text-[12px]" style={{ background: '#EFF6FF', color: '#1E40AF' }}>
            <span className="font-bold">관련 규격: </span>{doc.relatedStandard}
          </div>
        )}
        {doc.scope && (
          <div className="mb-2 p-2.5 rounded-xl text-[12.5px]" style={{ background: 'var(--bg-soft)' }}>
            <span className="font-bold" style={{ color: 'var(--ink)' }}>적용 범위: </span>
            <span style={{ color: 'var(--ink-soft)' }}>{doc.scope}</span>
          </div>
        )}
        {doc.purpose && (
          <div className="mb-2 p-2.5 rounded-xl text-[12.5px]" style={{ background: 'var(--bg-soft)' }}>
            <span className="font-bold" style={{ color: 'var(--ink)' }}>목적: </span>
            <span style={{ color: 'var(--ink-soft)' }}>{doc.purpose}</span>
          </div>
        )}

        {/* 배포 목록 */}
        {doc.distributionList && doc.distributionList.length > 0 && (
          <div className="mb-2">
            <div className="text-[12px] font-bold mb-1.5" style={{ color: 'var(--ink)' }}>배포 목록</div>
            <div className="flex flex-wrap gap-1.5">
              {doc.distributionList.map(d => (
                <span key={d} className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: '#DBEAFE', color: '#1E40AF' }}>{d}</span>
              ))}
            </div>
          </div>
        )}

        {(doc.supersedes || doc.supersededBy) && (
          <div className="flex gap-4 mt-2 text-[12px]" style={{ color: 'var(--ink-faint)' }}>
            {doc.supersedes && <span>대체 문서: <strong style={{ color: 'var(--ink)' }}>{doc.supersedes}</strong></span>}
            {doc.supersededBy && <span>대체됨: <strong style={{ color: '#DC2626' }}>{doc.supersededBy}</strong></span>}
          </div>
        )}
      </div>

      {/* 개정 이력 */}
      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
        <div className="text-[13px] font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--ink)' }}>
          <History size={14} /> 개정 이력 ({(doc.revisionHistory || []).length}건)
        </div>
        {(doc.revisionHistory || []).length === 0 ? (
          <div className="text-center py-6 text-[13px]" style={{ color: 'var(--ink-faint)' }}>개정 이력 없음</div>
        ) : (
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: 'var(--bg-soft)' }}>
                {['개정 번호', '일자', '담당자', '개정 내용'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--ink-soft)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...(doc.revisionHistory || [])].reverse().map((r, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--line)' }}>
                  <td className="px-3 py-2 font-mono font-bold" style={{ color: 'var(--moss)' }}>{r.rev}</td>
                  <td className="px-3 py-2" style={{ color: 'var(--ink-soft)' }}>{r.date}</td>
                  <td className="px-3 py-2" style={{ color: 'var(--ink-soft)' }}>{r.by || '-'}</td>
                  <td className="px-3 py-2" style={{ color: 'var(--ink)' }}>{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── 분석 ─────────────────────────────────────────────────────
function AnalysisView({ analysis, docs, recs, setShowDetail, setTab }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(DOC_STATUSES).map(([k, v]) => (
          <div key={k} className="p-4 rounded-2xl text-center" style={{ background: v.bg, border: `1px solid ${v.color}40` }}>
            <div className="text-[26px] font-bold" style={{ color: v.color }}>{analysis.byStatus[k] || 0}</div>
            <div className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>{v.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(DOC_TYPES).slice(0, 4).map(([k, v]) => (
          <div key={k} className="p-4 rounded-2xl text-center" style={{ background: v.bg, border: `1px solid ${v.color}30` }}>
            <div className="text-[24px] font-bold" style={{ color: v.color }}>{analysis.byType[k] || 0}</div>
            <div className="text-[11.5px]" style={{ color: 'var(--ink-soft)' }}>{v.label}</div>
          </div>
        ))}
      </div>

      {analysis.pendingReview.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <div className="text-[13px] font-bold mb-3" style={{ color: '#92400E' }}>⏰ 정기 검토 기한 도래 ({analysis.pendingReview.length}건)</div>
          <div className="space-y-1.5">
            {analysis.pendingReview.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-2.5 rounded-xl cursor-pointer"
                style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}
                onClick={() => { setTab('docs'); setShowDetail(doc.id) }}>
                <div>
                  <span className="font-mono font-bold text-[11.5px]" style={{ color: '#78350F' }}>{doc.docNo}</span>
                  <span className="ml-2 text-[12px]" style={{ color: '#92400E' }}>{doc.title}</span>
                </div>
                <span className="text-[11px]" style={{ color: '#D97706' }}>검토일: {doc.reviewDate}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>문서 유형별 현황</div>
          {Object.entries(DOC_TYPES).map(([k, v]) => (
            <div key={k} className="flex items-center gap-3 mb-1.5">
              <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full w-10 text-center" style={{ background: v.bg, color: v.color }}>{v.badge}</span>
              <span className="text-[12px] flex-1" style={{ color: 'var(--ink-soft)' }}>{v.label}</span>
              <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--bg-soft)' }}>
                <div className="h-2 rounded-full" style={{ width: `${docs.length ? ((analysis.byType[k] || 0) / docs.length) * 100 : 0}%`, background: v.color }} />
              </div>
              <span className="text-[12px] font-bold w-5 text-right" style={{ color: v.color }}>{analysis.byType[k] || 0}</span>
            </div>
          ))}
        </div>

        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>기록 현황</div>
          <div className="text-center py-4">
            <div className="text-[36px] font-bold" style={{ color: 'var(--moss)' }}>{recs.length}</div>
            <div className="text-[13px]" style={{ color: 'var(--ink-faint)' }}>등록된 기록 양식</div>
          </div>
          <div className="space-y-1">
            {Object.entries(analysis.recsByDept).slice(0, 5).map(([dept, cnt]) => (
              <div key={dept} className="flex justify-between text-[12px]" style={{ color: 'var(--ink-soft)' }}>
                <span>{dept}</span><span className="font-bold" style={{ color: 'var(--ink)' }}>{cnt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 폼 ───────────────────────────────────────────────────────
function DocForm({ form, setForm, onSave, onCancel, isEdit }) {
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleDist = (dept) => {
    const list = form.distributionList || []
    F('distributionList', list.includes(dept) ? list.filter(d => d !== dept) : [...list, dept])
  }
  return (
    <div className="mb-6 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>{isEdit ? '문서 수정' : '문서 등록'}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <Field label="문서 번호 *" value={form.docNo} onChange={v => F('docNo', v)} placeholder="QUA-SOP-001" />
        <Field label="제목 *" value={form.title} onChange={v => F('title', v)} />
        <FieldSelect label="유형" value={form.type} onChange={v => F('type', v)}
          options={Object.entries(DOC_TYPES).map(([k, v]) => ({ value: k, label: v.label }))} />
        <FieldSelect label="상태" value={form.status} onChange={v => F('status', v)}
          options={Object.entries(DOC_STATUSES).map(([k, v]) => ({ value: k, label: v.label }))} />
        <Field label="개정 번호" value={form.revision} onChange={v => F('revision', v)} placeholder="Rev.0" />
        <FieldSelect label="관리 부서" value={form.ownerDept} onChange={v => F('ownerDept', v)}
          options={DOC_DEPTS.map(d => ({ value: d, label: d }))} />
        <Field label="작성자" value={form.author} onChange={v => F('author', v)} />
        <Field label="검토자" value={form.reviewer} onChange={v => F('reviewer', v)} />
        <Field label="승인자" value={form.approver} onChange={v => F('approver', v)} />
        <Field label="발행일" type="date" value={form.issueDate} onChange={v => F('issueDate', v)} />
        <Field label="승인일" type="date" value={form.approvedDate} onChange={v => F('approvedDate', v)} />
        <Field label="정기 검토 예정일" type="date" value={form.reviewDate} onChange={v => F('reviewDate', v)} />
        <FieldSelect label="보존 기간" value={form.retentionPeriod} onChange={v => F('retentionPeriod', v)}
          options={RETENTION_PERIODS.map(r => ({ value: r, label: r }))} />
        <Field label="관련 규격 (e.g. ISO 13485 §7.5)" value={form.relatedStandard} onChange={v => F('relatedStandard', v)} />
        <Field label="대체 문서 번호" value={form.supersedes} onChange={v => F('supersedes', v)} placeholder="이전 문서 번호" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <FieldArea label="목적" value={form.purpose} onChange={v => F('purpose', v)} rows={2} />
        <FieldArea label="적용 범위" value={form.scope} onChange={v => F('scope', v)} rows={2} />
        <FieldArea label="비고" value={form.notes} onChange={v => F('notes', v)} rows={2} />
      </div>
      {/* 배포 목록 */}
      <div className="mb-4">
        <div className="text-[11.5px] font-semibold mb-2" style={{ color: 'var(--ink-soft)' }}>배포 목록 (다중 선택)</div>
        <div className="flex flex-wrap gap-1.5">
          {DOC_DEPTS.map(dept => {
            const sel = (form.distributionList || []).includes(dept)
            return (
              <button key={dept} onClick={() => toggleDist(dept)}
                className="px-2.5 py-1 rounded-xl text-[11px] font-semibold"
                style={{ background: sel ? 'var(--moss)' : 'var(--bg-soft)', color: sel ? '#fff' : 'var(--ink-soft)', border: `1px solid ${sel ? 'var(--moss)' : 'var(--line)'}`, cursor: 'pointer' }}>
                {dept}
              </button>
            )
          })}
        </div>
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

function RecordForm({ form, setForm, onSave, onCancel, isEdit }) {
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="mb-6 p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--moss)' }}>
      <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>{isEdit ? '기록 수정' : '기록 등록 (§4.2.4)'}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <Field label="기록명 *" value={form.title} onChange={v => F('title', v)} />
        <Field label="서식 번호" value={form.formNo} onChange={v => F('formNo', v)} placeholder="QF-001" />
        <Field label="개정 번호" value={form.revision} onChange={v => F('revision', v)} placeholder="Rev.0" />
        <FieldSelect label="관리 부서" value={form.ownerDept} onChange={v => F('ownerDept', v)}
          options={DOC_DEPTS.map(d => ({ value: d, label: d }))} />
        <FieldSelect label="보존 기간" value={form.retentionPeriod} onChange={v => F('retentionPeriod', v)}
          options={RETENTION_PERIODS.map(r => ({ value: r, label: r }))} />
        <Field label="발행일" type="date" value={form.issueDate} onChange={v => F('issueDate', v)} />
        <Field label="보존 장소" value={form.retentionLocation} onChange={v => F('retentionLocation', v)} placeholder="품질부 서버 / 문서함" />
        <FieldSelect label="폐기 방법" value={form.disposalMethod} onChange={v => F('disposalMethod', v)}
          options={['파쇄', '소각', '전자 삭제', '기타'].map(v => ({ value: v, label: v }))} />
        <Field label="보호 방법" value={form.protectionMethod} onChange={v => F('protectionMethod', v)} placeholder="접근 제한 / 암호화" />
        <Field label="관련 문서 번호" value={form.relatedDocNo} onChange={v => F('relatedDocNo', v)} />
      </div>
      <div className="mb-3"><FieldArea label="비고" value={form.notes} onChange={v => F('notes', v)} rows={2} /></div>
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

// ── 공통 ─────────────────────────────────────────────────────
function QuickBtn({ label, color, onClick }) {
  return (
    <button onClick={onClick} className="px-2 py-0.5 rounded text-[10.5px] font-bold"
      style={{ background: `${color}15`, border: `1px solid ${color}40`, color, cursor: 'pointer' }}>
      {label}
    </button>
  )
}
function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-1.5 rounded-xl text-[13px]"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
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
