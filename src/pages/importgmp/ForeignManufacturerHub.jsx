import React, { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Factory,
  ShieldCheck,
  FileSearch,
  Plus,
  Trash2,
  Paperclip,
  Download,
  X,
  AlertTriangle,
  Save,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import { permissions, requirePermission } from '../../lib/permissions'
import { fileStore } from '../../lib/fileStore'
import {
  foreignSites,
  gmpCertificates,
  otherAuditReports,
  ENTRUSTED_RELATION,
  certStatusOf,
} from '../../lib/foreignManufacturerState'

export default function ForeignManufacturerHub() {
  const user = auth.current()
  const [searchParams] = useSearchParams()
  const [tick, setTick] = useState(0)
  const refresh = () => setTick((x) => x + 1)
  const [toast, setToast] = useState(null)
  const showToast = (t) => { setToast(t); setTimeout(() => setToast(null), 2400) }

  const sites = foreignSites.getAll()
  const [selId, setSelId] = useState(() => searchParams.get('siteId') || sites[0]?.id || null)
  const sel = sites.find((s) => s.id === selId) || sites[0] || null
  const canEdit = permissions.can('importgmp.site.edit')

  const dueCerts = gmpCertificates.dueOrExpired()

  const addSite = () => {
    if (!requirePermission('importgmp.site.edit')) return
    const rec = foreignSites.add({ name: '새 외국제조소' })
    setSelId(rec.id)
    refresh()
    showToast('외국제조소가 등록되었습니다.')
  }

  const delSite = (id) => {
    if (!requirePermission('importgmp.site.edit')) return
    if (!window.confirm('이 외국제조소와 관련 GMP 인정서·실사자료를 모두 삭제할까요?')) return
    foreignSites.delete(id)
    const next = foreignSites.getAll()
    setSelId(next[0]?.id || null)
    refresh()
    showToast('삭제되었습니다.')
  }

  return (
    <AppLayout user={user} title="외국제조소 · 수입 GMP" subtitle="수입업자 GMP 심사 대응 — 외국제조소 등록 / GMP 적합인정서 / 타 인증기관 실사자료">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto fade-in">
        {toast && (
          <div className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-lg text-[13px] flex items-center gap-2 fade-in" style={{ background: 'var(--moss)', color: 'var(--bg)', boxShadow: '0 6px 20px rgba(15,26,20,0.18)', fontWeight: 500 }}>
            ✓ {toast}
          </div>
        )}

        <div className="mb-5">
          <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--moss)' }}>
            IMPORT-GMP · FOREIGN MANUFACTURER REGISTRY
          </span>
          <div className="font-display text-[26px] mt-1" style={{ color: 'var(--ink)', fontWeight: 500 }}>
            외국제조소 · 수입 GMP
          </div>
          <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>
            수입업자는 자기 사업장이 아니라 제품을 만드는 외국제조소가 GMP 심사 대상입니다. 제조소별로 개요·GMP 적합인정서·타 인증기관 실사자료를 등록·관리합니다.
          </div>
        </div>

        {dueCerts.length > 0 && (
          <div className="card-base p-3.5 mb-5 flex items-start gap-2.5" style={{ background: 'var(--amber-soft)' }}>
            <AlertTriangle size={16} style={{ color: 'var(--amber)' }} className="shrink-0 mt-0.5" />
            <div className="text-[12.5px]" style={{ color: 'var(--ink)' }}>
              <b>GMP 적합인정서 {dueCerts.length}건</b>이 만료되었거나 90일 이내 만료 예정입니다. 정기갱신심사는 유효기한 만료일 90일 전까지 신청해야 합니다.
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-5 gap-3">
          <div className="md:col-span-2 space-y-2">
            {canEdit && (
              <button onClick={addSite} className="btn-ghost text-[12px] w-full justify-center">
                <Plus size={12} /> 외국제조소 추가
              </button>
            )}
            {sites.length === 0 && <EmptyState icon={Factory} text="등록된 외국제조소가 없습니다." />}
            {sites.map((s) => {
              const certs = gmpCertificates.getForSite(s.id)
              const latestStatus = certs[0] ? certStatusOf(certs[0].expiryDate) : null
              const tone = latestStatus === '만료' ? 'rose' : latestStatus === '만료임박' ? 'amber' : latestStatus === '유효' ? 'emerald' : 'slate'
              const active = s.id === (sel?.id)
              return (
                <button
                  key={s.id}
                  onClick={() => setSelId(s.id)}
                  className="card-base p-3.5 w-full text-left block"
                  style={active ? { borderColor: 'var(--moss)', background: 'var(--leaf-soft)' } : undefined}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{s.name || '(이름없음)'}</span>
                    {latestStatus && <Badge text={'GMP ' + latestStatus} tone={tone} />}
                    {certs.length === 0 && <Badge text="GMP 인정서 없음" tone="rose" />}
                  </div>
                  <div className="text-[11.5px] mt-1" style={{ color: 'var(--ink-mute)' }}>{s.address || '주소 미입력'}</div>
                </button>
              )
            })}
          </div>

          <div className="md:col-span-3">
            {sel ? (
              <SiteDetail key={sel.id} site={sel} canEdit={canEdit} onAction={showToast} onChanged={refresh} onDelete={() => delSite(sel.id)} />
            ) : (
              <EmptyState icon={Factory} text="왼쪽에서 외국제조소를 선택하거나 추가하세요." />
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

/* ================================================================
   제조소 상세 — 기본정보 + GMP 적합인정서 + 타 인증기관 실사자료
   ================================================================ */
function SiteDetail({ site, canEdit, onAction, onChanged, onDelete }) {
  const [form, setForm] = useState(site)
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const dirty = JSON.stringify(form) !== JSON.stringify(site)

  const save = () => {
    if (!requirePermission('importgmp.site.edit')) return
    foreignSites.update(site.id, form)
    onChanged()
    onAction('제조소 정보가 저장되었습니다.')
  }

  const attachFacilityFile = async (file) => {
    if (!requirePermission('importgmp.site.edit')) return
    const fileId = await fileStore.saveFile(file)
    foreignSites.update(site.id, { facilityFileId: fileId, facilityFileName: file.name })
    onChanged()
  }
  const removeFacilityFile = () => {
    if (!requirePermission('importgmp.site.edit')) return
    foreignSites.update(site.id, { facilityFileId: null, facilityFileName: '' })
    onChanged()
  }
  const openFile = async (fileId) => {
    const url = await fileStore.getObjectURL(fileId)
    if (!url) { window.alert('파일을 찾을 수 없습니다.'); return }
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  }

  const missing = []
  if (!site.productList) missing.push('품목목록')
  if (!site.facilityFileId) missing.push('시설개요(평면도·장비목록)')

  return (
    <div className="space-y-4">
      <div className="card-base p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>제조소 개요</div>
          {canEdit && <button onClick={onDelete} className="text-[12px] inline-flex items-center gap-1" style={{ color: 'var(--rust, #c0392b)' }}><Trash2 size={13} /> 삭제</button>}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="제조소 명칭" value={form.name} onChange={(v) => setF('name', v)} className="sm:col-span-2" />
          <Field label="주소" value={form.address} onChange={(v) => setF('address', v)} className="sm:col-span-2" />
          <Field label="종업원 수" value={form.employeeCount} onChange={(v) => setF('employeeCount', v)} placeholder="제조·품질 관련 총 인원" />
          <SelectField label="위탁제조 관계" value={form.entrustedRelation} onChange={(v) => setF('entrustedRelation', v)} options={Object.values(ENTRUSTED_RELATION)} />
          {form.entrustedRelation !== ENTRUSTED_RELATION.NONE && (
            <Field label="상대 제조소명 (제조의뢰자/제조자)" value={form.relatedSiteName} onChange={(v) => setF('relatedSiteName', v)} className="sm:col-span-2" />
          )}
        </div>
        <TextAreaField label="품목목록 (품목명·등급)" value={form.productList} onChange={(v) => setF('productList', v)} placeholder="이 제조소에서 제조되는 의료기기 품목명·등급을 입력하세요." className="mt-3" />
        <TextAreaField label="비고" value={form.notes} onChange={(v) => setF('notes', v)} className="mt-3" />

        <div className="mt-3">
          <div className="text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>시설개요 (평면도·장비목록)</div>
          {form.facilityFileId ? (
            <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-[11.5px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
              <button type="button" onClick={() => openFile(form.facilityFileId)} className="inline-flex items-center gap-1 hover:underline"><Download size={11} /> {form.facilityFileName || '첨부파일'}</button>
              {canEdit && <button type="button" onClick={removeFacilityFile} className="opacity-50 hover:opacity-100"><X size={11} /></button>}
            </span>
          ) : canEdit ? (
            <FileAttachButton onPick={attachFacilityFile} label="시설개요 파일 첨부 (5MB 이하)" />
          ) : (
            <span className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>첨부 파일 없음</span>
          )}
        </div>

        {canEdit && (
          <div className="flex justify-end mt-3">
            <button onClick={save} disabled={!dirty} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: 12.5 }}><Save size={13} /> 변경사항 저장</button>
          </div>
        )}
      </div>

      {missing.length > 0 && (
        <div className="card-base p-3.5" style={{ background: 'var(--amber-soft)' }}>
          <div className="flex items-start gap-2">
            <AlertTriangle size={15} style={{ color: 'var(--amber)' }} className="shrink-0 mt-0.5" />
            <div className="text-[12px]" style={{ color: 'var(--ink)' }}>
              아직 등록되지 않은 필수 항목: <b>{missing.join(', ')}</b>
            </div>
          </div>
        </div>
      )}

      <GmpCertificatesCard siteId={site.id} canEdit={canEdit} onAction={onAction} />
      <OtherAuditReportsCard siteId={site.id} canEdit={canEdit} onAction={onAction} />
    </div>
  )
}

/* ================================================================
   GMP 적합인정서 (제조소당 N건)
   ================================================================ */
const EMPTY_CERT = { certNo: '', issuedDate: '', expiryDate: '', notes: '' }

function GmpCertificatesCard({ siteId, canEdit, onAction }) {
  const [list, setList] = useState(() => gmpCertificates.getForSite(siteId))
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY_CERT)
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const [busyId, setBusyId] = useState(null)

  const add = () => {
    if (!requirePermission('importgmp.cert.edit')) return
    if (!form.expiryDate) { alert('유효기한을 입력하세요.'); return }
    gmpCertificates.add(siteId, form)
    setList(gmpCertificates.getForSite(siteId))
    setForm(EMPTY_CERT)
    setAdding(false)
    onAction('GMP 적합인정서가 등록되었습니다.')
  }

  const del = (id) => {
    if (!requirePermission('importgmp.cert.edit')) return
    if (!window.confirm('이 GMP 적합인정서를 삭제할까요?')) return
    gmpCertificates.delete(id)
    setList(gmpCertificates.getForSite(siteId))
  }

  const attach = async (id, file) => {
    if (!requirePermission('importgmp.cert.edit')) return
    setBusyId(id)
    try {
      const fileId = await fileStore.saveFile(file)
      gmpCertificates.update(id, { fileId, fileName: file.name })
      setList(gmpCertificates.getForSite(siteId))
    } finally {
      setBusyId(null)
    }
  }
  const openFile = async (fileId) => {
    const url = await fileStore.getObjectURL(fileId)
    if (!url) { window.alert('파일을 찾을 수 없습니다.'); return }
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  }

  return (
    <div className="card-base p-4">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck size={14} style={{ color: 'var(--moss)' }} />
        <div className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>GMP 적합인정서 ({list.length}건)</div>
      </div>
      <div className="text-[11.5px] mb-3" style={{ color: 'var(--ink-mute)' }}>유효기간 3년 — 만료일 90일 전까지 정기갱신심사를 신청해야 합니다.</div>

      {canEdit && !adding && (
        <button onClick={() => setAdding(true)} className="btn-ghost text-[12px] mb-2"><Plus size={12} /> 적합인정서 등록</button>
      )}
      {adding && (
        <div className="rounded-lg p-3 mb-3" style={{ background: 'var(--bg-soft)' }}>
          <div className="grid sm:grid-cols-3 gap-2">
            <Field label="인정서 번호" value={form.certNo} onChange={(v) => setF('certNo', v)} />
            <Field label="발급일" type="date" value={form.issuedDate} onChange={(v) => setF('issuedDate', v)} />
            <Field label="유효기한" type="date" value={form.expiryDate} onChange={(v) => setF('expiryDate', v)} />
          </div>
          <TextAreaField label="비고" value={form.notes} onChange={(v) => setF('notes', v)} className="mt-2" />
          <div className="flex gap-2 mt-2">
            <button onClick={add} className="btn-primary text-[12.5px]" style={{ padding: '0.45rem 0.9rem' }}>저장</button>
            <button onClick={() => { setAdding(false); setForm(EMPTY_CERT) }} className="btn-ghost text-[12.5px]">취소</button>
          </div>
        </div>
      )}

      {list.length === 0 && !adding && <div className="text-[12px] text-center py-4" style={{ color: 'var(--ink-faint)' }}>등록된 GMP 적합인정서가 없습니다.</div>}

      <div className="space-y-2">
        {list.map((c) => {
          const st = certStatusOf(c.expiryDate)
          const tone = st === '만료' ? 'rose' : st === '만료임박' ? 'amber' : st === '유효' ? 'emerald' : 'slate'
          return (
            <div key={c.id} className="p-3 rounded-lg border" style={{ borderColor: 'var(--line)' }}>
              <div className="flex items-center justify-between">
                <div className="text-[12.5px]" style={{ color: 'var(--ink)' }}>
                  <b>{c.certNo || '(번호 미입력)'}</b> · 발급 {c.issuedDate || '—'} · 만료 {c.expiryDate || '—'} {st && <Badge text={st} tone={tone} />}
                </div>
                {canEdit && <button onClick={() => del(c.id)} className="text-slate-300 hover:text-rose-600"><Trash2 size={14} /></button>}
              </div>
              {c.notes && <div className="text-[12px] mt-1" style={{ color: 'var(--ink-mute)' }}>{c.notes}</div>}
              <div className="mt-1.5">
                {c.fileId ? (
                  <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-[11.5px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
                    <button type="button" onClick={() => openFile(c.fileId)} className="inline-flex items-center gap-1 hover:underline"><Download size={11} /> {c.fileName || '첨부파일'}</button>
                  </span>
                ) : canEdit ? (
                  <FileAttachButton busy={busyId === c.id} onPick={(f) => attach(c.id, f)} label="인정서 파일 첨부" />
                ) : (
                  <span className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>첨부 파일 없음</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ================================================================
   타 인증기관 실사자료 (제조소당 N건)
   ================================================================ */
const EMPTY_REPORT = { issuer: '', auditType: '', auditDate: '', notes: '' }

function OtherAuditReportsCard({ siteId, canEdit, onAction }) {
  const [list, setList] = useState(() => otherAuditReports.getForSite(siteId))
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY_REPORT)
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const [busyId, setBusyId] = useState(null)

  const add = () => {
    if (!requirePermission('importgmp.cert.edit')) return
    if (!form.issuer.trim()) { alert('인증기관명을 입력하세요.'); return }
    otherAuditReports.add(siteId, form)
    setList(otherAuditReports.getForSite(siteId))
    setForm(EMPTY_REPORT)
    setAdding(false)
    onAction('실사자료가 등록되었습니다.')
  }

  const del = (id) => {
    if (!requirePermission('importgmp.cert.edit')) return
    if (!window.confirm('이 실사자료를 삭제할까요?')) return
    otherAuditReports.delete(id)
    setList(otherAuditReports.getForSite(siteId))
  }

  const attach = async (id, file) => {
    if (!requirePermission('importgmp.cert.edit')) return
    setBusyId(id)
    try {
      const fileId = await fileStore.saveFile(file)
      otherAuditReports.update(id, { resultFileId: fileId, resultFileName: file.name })
      setList(otherAuditReports.getForSite(siteId))
    } finally {
      setBusyId(null)
    }
  }
  const openFile = async (fileId) => {
    const url = await fileStore.getObjectURL(fileId)
    if (!url) { window.alert('파일을 찾을 수 없습니다.'); return }
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  }

  return (
    <div className="card-base p-4">
      <div className="flex items-center gap-2 mb-1">
        <FileSearch size={14} style={{ color: 'var(--moss)' }} />
        <div className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>타 인증기관 실사자료 ({list.length}건)</div>
      </div>
      <div className="text-[11.5px] mb-3" style={{ color: 'var(--ink-mute)' }}>최근 3년 이내 다른 품질시스템 인증기관으로부터 받은 실사 결과가 있는 경우 등록합니다. (선택)</div>

      {canEdit && !adding && (
        <button onClick={() => setAdding(true)} className="btn-ghost text-[12px] mb-2"><Plus size={12} /> 실사자료 등록</button>
      )}
      {adding && (
        <div className="rounded-lg p-3 mb-3" style={{ background: 'var(--bg-soft)' }}>
          <div className="grid sm:grid-cols-3 gap-2">
            <Field label="인증기관" value={form.issuer} onChange={(v) => setF('issuer', v)} placeholder="예: TÜV SÜD" />
            <Field label="실사 유형" value={form.auditType} onChange={(v) => setF('auditType', v)} placeholder="예: ISO 13485 정기심사" />
            <Field label="실사일" type="date" value={form.auditDate} onChange={(v) => setF('auditDate', v)} />
          </div>
          <TextAreaField label="비고" value={form.notes} onChange={(v) => setF('notes', v)} className="mt-2" />
          <div className="flex gap-2 mt-2">
            <button onClick={add} className="btn-primary text-[12.5px]" style={{ padding: '0.45rem 0.9rem' }}>저장</button>
            <button onClick={() => { setAdding(false); setForm(EMPTY_REPORT) }} className="btn-ghost text-[12.5px]">취소</button>
          </div>
        </div>
      )}

      {list.length === 0 && !adding && <div className="text-[12px] text-center py-4" style={{ color: 'var(--ink-faint)' }}>등록된 실사자료가 없습니다.</div>}

      <div className="space-y-2">
        {list.map((r) => (
          <div key={r.id} className="p-3 rounded-lg border" style={{ borderColor: 'var(--line)' }}>
            <div className="flex items-center justify-between">
              <div className="text-[12.5px]" style={{ color: 'var(--ink)' }}>
                <b>{r.issuer}</b> · {r.auditType || '유형 미입력'} · {r.auditDate || '날짜 미입력'}
              </div>
              {canEdit && <button onClick={() => del(r.id)} className="text-slate-300 hover:text-rose-600"><Trash2 size={14} /></button>}
            </div>
            {r.notes && <div className="text-[12px] mt-1" style={{ color: 'var(--ink-mute)' }}>{r.notes}</div>}
            <div className="mt-1.5">
              {r.resultFileId ? (
                <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-[11.5px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
                  <button type="button" onClick={() => openFile(r.resultFileId)} className="inline-flex items-center gap-1 hover:underline"><Download size={11} /> {r.resultFileName || '첨부파일'}</button>
                </span>
              ) : canEdit ? (
                <FileAttachButton busy={busyId === r.id} onPick={(f) => attach(r.id, f)} label="실사보고서 파일 첨부" />
              ) : (
                <span className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>첨부 파일 없음</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ================================================================
   공통 UI
   ================================================================ */
function FileAttachButton({ busy, onPick, label }) {
  const ref = useRef(null)
  return (
    <>
      <input ref={ref} type="file" className="hidden" onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) onPick(f) }} />
      <button type="button" onClick={() => ref.current && ref.current.click()} disabled={busy} className="inline-flex items-center gap-1 text-[11.5px] font-medium" style={{ color: 'var(--moss)' }}>
        <Paperclip size={12} /> {busy ? '업로드 중…' : (label || '파일 첨부 (5MB 이하)')}
      </button>
    </>
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
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  )
}

function TextAreaField({ label, value, onChange, placeholder, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>{label}</span>
      <textarea className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13, minHeight: 60 }} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
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
  return <span className="text-[10.5px] px-1.5 py-0.5 rounded font-semibold ml-1.5" style={{ background: c.bg, color: c.fg }}>{text}</span>
}
