import React, { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Building2,
  IdCard,
  Users,
  BadgeCheck,
  Plus,
  Trash2,
  Paperclip,
  Download,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import { permissions, requirePermission } from '../../lib/permissions'
import { companyDocs, DOC_CATEGORY, QM_STATUS } from '../../lib/companyState'
import { onboarding } from '../../lib/onboardingState'
import { fileStore } from '../../lib/fileStore'
import OrgChartDiagram from '../../components/OrgChartDiagram'
import { saveOrgChartImage, loadOrgChartImage } from '../../lib/orgChartImage'

export default function CompanyHub() {
  const user = auth.current()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState(() => searchParams.get('tab') || 'profile') // profile | docs | org | qm
  const [tick, setTick] = useState(0)
  const refresh = () => setTick((x) => x + 1)
  const [toast, setToast] = useState(null)
  const showToast = (t) => { setToast(t); setTimeout(() => setToast(null), 2400) }

  const s = companyDocs.load()
  const ob = onboarding.load()
  const departments = ob?.departments || []
  const company = ob?.company || {}
  const qm = s.qualityManager
  const profileDone = !!(company.name && company.bizNumber && company.ceo)

  return (
    <AppLayout user={user} title="기본정보" subtitle="기업정보 / 회사문서함 / 조직도(직무기술서·권한책임서) / 품질책임자 지정">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto fade-in">
        {toast && (
          <div className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-lg text-[13px] flex items-center gap-2 fade-in"
            style={{ background: 'var(--moss)', color: 'var(--bg)', boxShadow: '0 6px 20px rgba(15,26,20,0.18)', fontWeight: 500 }}>
            ✓ {toast}
          </div>
        )}

        <div className="mb-5">
          <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--moss)' }}>ORG · BASIC INFO</span>
          <div className="font-display text-[26px] mt-1" style={{ color: 'var(--ink)', fontWeight: 500 }}>기본정보</div>
          <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>
            의료기기 제조업체 정보, 사업자등록증·대리인계약서·제조소등록자료·수입업허가증·제조소GMP인증서·ISO 13485 인증서, 조직도, 품질책임자 지정을 한 곳에서 관리합니다.
            여기 입력한 정보는 품질문서·인허가 대시보드 등 관련 화면에 자동으로 반영됩니다.
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <StatCard label="기업정보" value={profileDone ? '입력완료' : '미입력'} hint="회사명·사업자번호·대표자" icon={IdCard} tone={profileDone ? undefined : 'amber'} />
          <StatCard label="회사 문서" value={`${Object.values(DOC_CATEGORY).filter((cat) => s.documents.some((d) => d.category === cat)).length} / ${Object.values(DOC_CATEGORY).length}`} hint="필수 항목 등록 현황" icon={Building2} tone={Object.values(DOC_CATEGORY).every((cat) => s.documents.some((d) => d.category === cat)) ? undefined : 'amber'} />
          <StatCard label="부서" value={departments.length} hint="직무기술서 대상" icon={Users} />
          <StatCard label="품질책임자" value={qm?.status === QM_STATUS.APPROVED ? '승인완료' : qm ? '지정대기' : '미지정'} hint="제조관리자 지정 상태" icon={BadgeCheck} tone={qm?.status === QM_STATUS.APPROVED ? undefined : 'amber'} />
        </div>

        <div className="flex gap-1 mb-5 overflow-x-auto" style={{ borderBottom: '1px solid var(--line)' }}>
          <TabButton active={tab === 'profile'} onClick={() => setTab('profile')} icon={IdCard} label="기업정보" en="COMPANY PROFILE" count={null} />
          <TabButton active={tab === 'docs'} onClick={() => setTab('docs')} icon={Building2} label="회사문서함" en="COMPANY DOCS" count={s.documents.length} />
          <TabButton active={tab === 'org'} onClick={() => setTab('org')} icon={Users} label="조직도 · 직무기술서" en="ORG & JOB DESC" count={departments.length} />
          <TabButton active={tab === 'qm'} onClick={() => setTab('qm')} icon={BadgeCheck} label="품질책임자 지정" en="QM APPOINTMENT" count={null} />
        </div>

        {tab === 'profile' && <ProfileTab key={'profile' + tick} company={company} onAction={showToast} refresh={refresh} />}
        {tab === 'docs' && <CompanyDocsTab key={tick} onAction={showToast} refresh={refresh} />}
        {tab === 'org' && <OrgTab key={'org' + tick} departments={departments} onAction={showToast} refresh={refresh} />}
        {tab === 'qm' && <QmTab key={'qm' + tick} qm={qm} onAction={showToast} refresh={refresh} />}
      </div>
    </AppLayout>
  )
}

/* ================================================================
   공통 UI
   ================================================================ */
function StatCard({ label, value, hint, icon: Icon, tone }) {
  return (
    <div className="card-base p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: tone === 'amber' ? 'var(--amber-soft)' : 'var(--leaf-soft)', color: tone === 'amber' ? 'var(--amber)' : 'var(--moss)' }}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <div className="text-[11.5px]" style={{ color: 'var(--ink-mute)' }}>{label}</div>
        <div className="text-[20px] font-bold tabular-nums" style={{ color: 'var(--ink)' }}>{value}</div>
        <div className="text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>{hint}</div>
      </div>
    </div>
  )
}
function TabButton({ active, onClick, icon: Icon, label, en, count }) {
  return (
    <button onClick={onClick} className="px-4 py-2.5 rounded-t-lg flex items-center gap-2 text-[13px] transition shrink-0"
      style={{ background: active ? 'var(--bg-card)' : 'transparent', borderBottom: active ? '2px solid var(--moss)' : '2px solid transparent', color: active ? 'var(--ink)' : 'var(--ink-mute)', fontWeight: active ? 500 : 400 }}>
      <Icon size={14} />
      <span>{label}</span>
      {count != null && <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: active ? 'var(--leaf-soft)' : 'var(--bg-soft)', color: active ? 'var(--moss)' : 'var(--ink-faint)' }}>{count}</span>}
      <span className="font-mono text-[9.5px] tracking-wider" style={{ color: 'var(--ink-faint)' }}>{en}</span>
    </button>
  )
}
function Field({ label, value, onChange, placeholder, type = 'text', className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>{label}</span>
      <input type={type} className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13 }} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}
function SelectField({ label, value, onChange, options, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>{label}</span>
      <select className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13 }} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
    </label>
  )
}
function TextAreaField({ label, value, onChange, placeholder, minHeight = 70, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>{label}</span>
      <textarea className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13, minHeight }} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}
function EmptyState({ icon: Icon, text }) {
  return (
    <div className="card-base p-8 text-center" style={{ borderStyle: 'dashed' }}>
      <Icon size={28} style={{ color: 'var(--ink-faint)', margin: '0 auto' }} strokeWidth={1.4} />
      <div className="mt-2 text-[13px]" style={{ color: 'var(--ink-mute)' }}>{text}</div>
    </div>
  )
}
function Badge({ text, tone = 'slate' }) {
  const map = {
    emerald: { bg: 'var(--leaf-soft)', fg: 'var(--moss)' },
    amber: { bg: 'var(--amber-soft)', fg: 'var(--amber)' },
    rose: { bg: '#fdecec', fg: '#c0392b' },
    slate: { bg: 'var(--bg-soft)', fg: 'var(--ink-mute)' },
  }
  const c = map[tone] || map.slate
  return <span className="text-[10.5px] px-1.5 py-0.5 rounded font-semibold" style={{ background: c.bg, color: c.fg }}>{text}</span>
}
function SingleFileAttach({ fileId, fileName, onAttach, onRemove, canEdit, label }) {
  const ref = useRef(null)
  const [busy, setBusy] = useState(false)
  const openFile = async () => {
    const url = await fileStore.getObjectURL(fileId)
    if (!url) { window.alert('파일을 찾을 수 없습니다.'); return }
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  }
  const pick = async (e) => {
    const f = e.target.files && e.target.files[0]
    e.target.value = ''
    if (!f) return
    setBusy(true)
    try {
      await onAttach(f)
    } catch (err) {
      window.alert((err && err.message) || String(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div>
      <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>{label}</span>
      {fileId ? (
        <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-[11.5px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
          <button type="button" onClick={openFile} className="inline-flex items-center gap-1 hover:underline"><Download size={11} /> {fileName || '첨부파일'}</button>
          {canEdit && <button type="button" onClick={onRemove} className="opacity-50 hover:opacity-100"><X size={11} /></button>}
        </span>
      ) : canEdit ? (
        <>
          <input ref={ref} type="file" className="hidden" onChange={pick} />
          <button type="button" onClick={() => ref.current && ref.current.click()} disabled={busy} className="inline-flex items-center gap-1 text-[11.5px] font-medium" style={{ color: 'var(--moss)' }}>
            <Paperclip size={12} /> {busy ? '업로드 중…' : '파일 첨부 (5MB 이하)'}
          </button>
        </>
      ) : (
        <span className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>첨부 파일 없음</span>
      )}
    </div>
  )
}

/* ================================================================
   기업정보 — 의료기기 제조업체 기본정보 (onboarding.company 와 연동)
   ================================================================ */
function ProfileTab({ company, onAction, refresh }) {
  const canEdit = permissions.can('onb.company.edit')
  const [form, setForm] = useState({
    name: '', bizNumber: '', ceo: '', address: '', site: '', phone: '', email: '', employeeCount: '',
    ...company,
  })
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const dirty = Object.keys(form).some((k) => (form[k] || '') !== (company[k] || ''))

  const save = () => {
    if (!requirePermission('onb.company.edit')) return
    if (!form.name.trim()) { window.alert('회사명을 입력하세요.'); return }
    onboarding.updateCompany(form)
    onAction('기업정보가 저장되었습니다. 관련 품질문서·인허가 화면에 자동으로 반영됩니다.')
    refresh()
  }

  return (
    <div className="card-base p-4 space-y-4">
      <div>
        <div className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>의료기기 제조업체 정보</div>
        <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>
          여기 입력한 회사명·사업자등록번호·대표자·주소는 품질매뉴얼·통합 문서·KGMP 대시보드 등에서 그대로 사용됩니다.
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="회사명 (상호) *" value={form.name} onChange={(v) => setF('name', v)} placeholder="예: 큐엘트리 주식회사" />
        <Field label="사업자등록번호" value={form.bizNumber} onChange={(v) => setF('bizNumber', v)} placeholder="000-00-00000" />
        <Field label="대표자 (대표이사)" value={form.ceo} onChange={(v) => setF('ceo', v)} />
        <Field label="직원 수" value={form.employeeCount} onChange={(v) => setF('employeeCount', v)} />
        <Field label="본사 주소" value={form.address} onChange={(v) => setF('address', v)} className="sm:col-span-2" />
        <Field label="제조소 주소 (본사와 다른 경우)" value={form.site} onChange={(v) => setF('site', v)} className="sm:col-span-2" />
        <Field label="전화번호" value={form.phone} onChange={(v) => setF('phone', v)} placeholder="02-0000-0000" />
        <Field label="대표 이메일" type="email" value={form.email} onChange={(v) => setF('email', v)} />
      </div>
      {canEdit && (
        <div className="flex justify-end pt-2" style={{ borderTop: '1px solid var(--line)' }}>
          <button onClick={save} disabled={!dirty} className="btn-primary text-[12.5px] disabled:opacity-50">기업정보 저장</button>
        </div>
      )}
      {!canEdit && (
        <div className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>기업정보 변경은 매니저·RA 권한이 필요합니다.</div>
      )}
    </div>
  )
}

/* ================================================================
   회사문서함 — 필수 문서 항목을 고정 목록으로 표시하고 등록 여부를 확인
   ================================================================ */
const CATEGORY_ORDER = Object.values(DOC_CATEGORY)
const CATEGORY_HINT = {
  [DOC_CATEGORY.BIZ_REG]: '관할 세무서 발급 사업자등록증 사본',
  [DOC_CATEGORY.MFG_LICENSE]: '제조업허가증 (해당 시)',
  [DOC_CATEGORY.FACILITY_PLAN]: '제조소 평면도 (작업구역·보관구역 표시)',
  [DOC_CATEGORY.FACILITY_PHOTO]: '제조소 외관·내부 사진',
  [DOC_CATEGORY.FACILITY_REG]: '제조소 등록 확인 자료',
  [DOC_CATEGORY.IMPORT_LICENSE]: '수입업 허가증 (수입업자인 경우)',
  [DOC_CATEGORY.AGENT_CONTRACT]: '해외 제조사 대리인 지정 계약서 (Authorization Letter)',
  [DOC_CATEGORY.GMP_CERT]: '제조소 GMP 적합인정서/인증서',
  [DOC_CATEGORY.ISO13485_CERT]: 'ISO 13485 인증서',
}
const EMPTY_DOC_FOR = (category) => ({ category, title: '', issuer: '', issueDate: '', expiryDate: '', notes: '' })

function CompanyDocsTab({ onAction, refresh }) {
  const canEdit = permissions.can('company.docs.edit')
  const [list, setList] = useState(() => companyDocs.getDocuments())

  const save = (form) => {
    if (!requirePermission('company.docs.edit')) return false
    if (!form.title.trim()) { window.alert('문서명을 입력하세요.'); return false }
    companyDocs.addDocument(form)
    setList(companyDocs.getDocuments())
    onAction('문서가 등록되었습니다.')
    refresh()
    return true
  }
  const del = (id) => {
    if (!requirePermission('company.docs.edit')) return
    if (!window.confirm('이 문서를 삭제할까요?')) return
    companyDocs.deleteDocument(id)
    setList(companyDocs.getDocuments())
    onAction('문서가 삭제되었습니다.')
    refresh()
  }
  const attach = async (id, file) => {
    const fileId = await fileStore.saveFile(file)
    companyDocs.updateDocument(id, { fileId, fileName: file.name })
    setList(companyDocs.getDocuments())
  }
  const removeFile = (id) => {
    if (!requirePermission('company.docs.edit')) return
    companyDocs.updateDocument(id, { fileId: null, fileName: '' })
    setList(companyDocs.getDocuments())
    refresh()
  }

  const byCategory = {}
  list.forEach((d) => { (byCategory[d.category] = byCategory[d.category] || []).push(d) })
  const registeredCount = CATEGORY_ORDER.filter((cat) => (byCategory[cat] || []).length > 0).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-[12px]" style={{ color: 'var(--ink-mute)' }}>
          아래 항목별로 문서를 등록·보관합니다. (ISO 13485 §4.1, §6.3)
        </div>
        <Badge text={`${registeredCount} / ${CATEGORY_ORDER.length} 항목 등록됨`} tone={registeredCount === CATEGORY_ORDER.length ? 'emerald' : 'amber'} />
      </div>
      {CATEGORY_ORDER.map((cat) => (
        <DocCategoryCard
          key={cat}
          category={cat}
          hint={CATEGORY_HINT[cat]}
          docs={byCategory[cat] || []}
          canEdit={canEdit}
          onSave={save}
          onDelete={del}
          onAttach={attach}
          onRemoveFile={removeFile}
        />
      ))}
    </div>
  )
}

function DocCategoryCard({ category, hint, docs, canEdit, onSave, onDelete, onAttach, onRemoveFile }) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(() => EMPTY_DOC_FOR(category))
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const registered = docs.length > 0

  const submit = () => {
    const ok = onSave(form)
    if (ok) { setForm(EMPTY_DOC_FOR(category)); setAdding(false) }
  }

  return (
    <div className="card-base p-4" style={{ borderColor: registered ? 'var(--line)' : 'var(--amber)' }}>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{category}</div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{hint}</div>
        </div>
        <Badge text={registered ? `등록됨 · ${docs.length}건` : '미등록'} tone={registered ? 'emerald' : 'amber'} />
      </div>

      {docs.length > 0 && (
        <div className="space-y-2 mt-2">
          {docs.map((d) => (
            <div key={d.id} className="p-3 rounded-lg border flex items-start justify-between gap-3 flex-wrap" style={{ borderColor: 'var(--line)' }}>
              <div className="min-w-0">
                <div className="text-[12.5px] font-medium" style={{ color: 'var(--ink)' }}>{d.title}</div>
                <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>{d.issuer || '발급기관 미입력'} · 발급 {d.issueDate || '—'}{d.expiryDate ? ` · 만료 ${d.expiryDate}` : ''}</div>
                <div className="mt-1.5"><SingleFileAttach fileId={d.fileId} fileName={d.fileName} onAttach={(f) => onAttach(d.id, f)} onRemove={() => onRemoveFile(d.id)} canEdit={canEdit} label="" /></div>
              </div>
              {canEdit && <button onClick={() => onDelete(d.id)} className="text-slate-300 hover:text-rose-600 shrink-0"><Trash2 size={14} /></button>}
            </div>
          ))}
        </div>
      )}

      {canEdit && !adding && (
        <button onClick={() => setAdding(true)} className="btn-ghost text-[12px] mt-2"><Plus size={12} /> {registered ? '문서 추가' : '문서 등록'}</button>
      )}
      {adding && (
        <div className="rounded-lg p-3 mt-2 space-y-3" style={{ background: 'var(--bg-soft)' }}>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="문서명" value={form.title} onChange={(v) => setF('title', v)} placeholder={`예: ${category}`} />
            <Field label="발급기관" value={form.issuer} onChange={(v) => setF('issuer', v)} />
            <Field label="발급일" type="date" value={form.issueDate} onChange={(v) => setF('issueDate', v)} />
            <Field label="유효기한" type="date" value={form.expiryDate} onChange={(v) => setF('expiryDate', v)} placeholder="해당 시" />
          </div>
          <TextAreaField label="비고" value={form.notes} onChange={(v) => setF('notes', v)} />
          <div className="flex gap-2">
            <button onClick={submit} className="btn-primary text-[12.5px]">저장</button>
            <button onClick={() => { setAdding(false); setForm(EMPTY_DOC_FOR(category)) }} className="btn-ghost text-[12.5px]">취소</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ================================================================
   조직도 · 직무기술서 · 권한책임서 — 부서별
   ================================================================ */
function OrgTab({ departments, onAction, refresh }) {
  const canEdit = permissions.can('company.roledoc.edit')
  const [selId, setSelId] = useState(departments[0]?.id || null)
  const sel = departments.find((d) => d.id === selId) || null
  const chartRef = useRef(null)
  const [capturing, setCapturing] = useState(false)
  const savedImg = loadOrgChartImage()
  const captureChart = async () => {
    setCapturing(true)
    try {
      const dataUrl = chartRef.current && (await chartRef.current.captureDataUrl())
      if (!dataUrl) throw new Error('캡처할 조직도가 없습니다.')
      saveOrgChartImage(dataUrl)
      onAction('조직도 이미지가 저장되었습니다. 품질문서의 "조직도" 챕터에 그대로 반영됩니다.')
      refresh()
    } catch (e) {
      window.alert('캡처 실패: ' + ((e && e.message) || e))
    }
    setCapturing(false)
  }

  if (departments.length === 0) {
    return <EmptyState icon={Users} text="등록된 부서가 없습니다. 온보딩의 조직도 단계에서 부서를 먼저 등록하세요." />
  }

  return (
    <div className="space-y-5">
      <div className="card-base p-3">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="text-[12px] font-medium" style={{ color: 'var(--ink-mute)' }}>조직도</div>
          <div className="flex items-center gap-2">
            {savedImg && <span className="text-[10.5px]" style={{ color: 'var(--ink-mute)' }}>최근 저장 {new Date(savedImg.capturedAt).toLocaleString('ko-KR')}</span>}
            <button onClick={captureChart} disabled={capturing} className="btn-primary text-[12px] px-3 py-1.5 disabled:opacity-50">
              {capturing ? '캡처 중…' : '조직도 이미지로 저장 → 품질문서 반영'}
            </button>
          </div>
        </div>
        <OrgChartDiagram ref={chartRef} departments={departments} />
      </div>
      <div className="grid lg:grid-cols-[280px_1fr] gap-5">
      <div className="space-y-1.5">
        {departments.map((d) => {
          const rd = companyDocs.getRoleDoc(d.id)
          const filled = rd && (rd.jobDescription || rd.authorityResponsibility)
          return (
            <button key={d.id} onClick={() => setSelId(d.id)} className="w-full text-left px-3 py-2.5 rounded-lg border flex items-center justify-between gap-2 transition"
              style={{ borderColor: d.id === selId ? 'var(--moss)' : 'var(--line)', background: d.id === selId ? 'var(--leaf-soft)' : 'var(--bg-card)' }}>
              <span className="text-[13px]" style={{ color: 'var(--ink)' }}>{d.name}</span>
              {filled ? <Badge text="작성됨" tone="emerald" /> : <Badge text="미작성" tone="slate" />}
            </button>
          )
        })}
      </div>
      <div>
        {sel ? <RoleDocForm key={sel.id} dept={sel} canEdit={canEdit} onAction={onAction} refresh={refresh} /> : <EmptyState icon={Users} text="왼쪽에서 부서를 선택하세요." />}
      </div>
      </div>
    </div>
  )
}

function RoleDocForm({ dept, canEdit, onAction, refresh }) {
  const existing = companyDocs.getRoleDoc(dept.id) || { jobDescription: '', authorityResponsibility: '' }
  const [jobDescription, setJobDescription] = useState(existing.jobDescription)
  const [authorityResponsibility, setAuthorityResponsibility] = useState(existing.authorityResponsibility)
  const dirty = jobDescription !== existing.jobDescription || authorityResponsibility !== existing.authorityResponsibility

  const save = () => {
    if (!requirePermission('company.roledoc.edit')) return
    companyDocs.upsertRoleDoc(dept.id, dept.name, { jobDescription, authorityResponsibility })
    onAction('직무기술서·권한책임서가 저장되었습니다.')
    refresh()
  }

  return (
    <div className="card-base p-4 space-y-3">
      <div className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>{dept.name} — 직무기술서 · 권한책임서</div>
      <TextAreaField label="직무기술서" value={jobDescription} onChange={setJobDescription} minHeight={120} placeholder="담당 업무·필요 자격·보고체계 등을 기술하세요." />
      <TextAreaField label="권한 및 책임서" value={authorityResponsibility} onChange={setAuthorityResponsibility} minHeight={120} placeholder="의사결정 권한 범위·품질 관련 책임 사항을 기술하세요. (ISO 13485 §5.5.1)" />
      {canEdit && (
        <div className="flex justify-end"><button onClick={save} disabled={!dirty} className="btn-primary text-[12.5px]">저장</button></div>
      )}
    </div>
  )
}

/* ================================================================
   품질책임자 지정 — 제조관리자 자격증 + 임명장, 승인 절차
   ================================================================ */
function QmTab({ qm, onAction, refresh }) {
  const canEdit = permissions.can('company.qm.edit')
  const canApprove = permissions.can('company.qm.approve')
  const cur = qm || { name: '', title: '', appointedDate: '', certFileId: null, certFileName: '', letterFileId: null, letterFileName: '', status: QM_STATUS.DRAFT }
  const [form, setForm] = useState(cur)
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const save = () => {
    if (!requirePermission('company.qm.edit')) return
    companyDocs.setQualityManager(form)
    if (form.name) onboarding.updateCompany({ qmRep: form.name }) // 문서 생성 시 참조하는 품질책임자명과 동기화
    onAction('품질책임자 지정 정보가 저장되었습니다.')
    refresh()
  }

  const attachCert = async (file) => {
    const fileId = await fileStore.saveFile(file)
    companyDocs.setQualityManager({ ...form, certFileId: fileId, certFileName: file.name })
    onAction('제조관리자 자격증이 첨부되었습니다.')
    refresh()
  }
  const attachLetter = async (file) => {
    const fileId = await fileStore.saveFile(file)
    companyDocs.setQualityManager({ ...form, letterFileId: fileId, letterFileName: file.name })
    onAction('임명장이 첨부되었습니다.')
    refresh()
  }

  const approve = () => {
    if (!requirePermission('company.qm.approve')) return
    const approver = auth.current()
    try {
      companyDocs.approveQualityManager(approver?.name || '승인자')
      if (qm?.name) onboarding.updateCompany({ qmRep: qm.name })
      onAction('품질책임자 지정이 승인되었습니다.')
      refresh()
    } catch (e) {
      window.alert((e && e.message) || String(e))
    }
  }

  return (
    <div className="card-base p-4 space-y-3">
      <div className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>품질책임자(제조관리자) 지정</div>
      <div className="text-[11.5px]" style={{ color: 'var(--ink-mute)' }}>KGMP 제6조 / ISO 13485 §5.5.2 — 제조관리자 자격증과 임명장을 첨부해야 승인할 수 있습니다.</div>

      {qm?.status === QM_STATUS.APPROVED && (
        <div className="text-[12px] p-2.5 rounded-lg" style={{ background: 'var(--leaf-soft)', color: 'var(--moss)' }}>
          <CheckCircle2 size={13} className="inline mr-1" /> {qm.approvedBy} 승인 · {qm.approvedAt ? new Date(qm.approvedAt).toLocaleString('ko-KR') : ''}
        </div>
      )}
      {qm && qm.status !== QM_STATUS.APPROVED && (
        <div className="text-[12px] p-2.5 rounded-lg flex items-center gap-1.5" style={{ background: 'var(--amber-soft)', color: 'var(--amber)' }}>
          <AlertCircle size={13} /> 승인 대기 중입니다.
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="성명" value={form.name} onChange={(v) => setF('name', v)} />
        <Field label="직위" value={form.title} onChange={(v) => setF('title', v)} placeholder="예: 품질경영팀장" />
        <Field label="지정일" type="date" value={form.appointedDate} onChange={(v) => setF('appointedDate', v)} />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <SingleFileAttach label="제조관리자 자격증" fileId={form.certFileId} fileName={form.certFileName} onAttach={attachCert} onRemove={() => { companyDocs.setQualityManager({ ...form, certFileId: null, certFileName: '' }); refresh() }} canEdit={canEdit} />
        <SingleFileAttach label="임명장" fileId={form.letterFileId} fileName={form.letterFileName} onAttach={attachLetter} onRemove={() => { companyDocs.setQualityManager({ ...form, letterFileId: null, letterFileName: '' }); refresh() }} canEdit={canEdit} />
      </div>

      <div className="flex justify-end gap-2 pt-2" style={{ borderTop: '1px solid var(--line)' }}>
        {canEdit && <button onClick={save} className="btn-ghost text-[12.5px]">정보 저장</button>}
        {canApprove && <button onClick={approve} className="btn-primary text-[12.5px]"><CheckCircle2 size={14} /> 지정 승인</button>}
      </div>
    </div>
  )
}
