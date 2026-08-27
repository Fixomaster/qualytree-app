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
  Sparkles,
  Printer,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import { permissions, requirePermission } from '../../lib/permissions'
import { companyDocs, DOC_CATEGORY, QM_STATUS, QM_REQUIREMENTS } from '../../lib/companyState'
import { onboarding } from '../../lib/onboardingState'
import { fileStore } from '../../lib/fileStore'
import OrgChartDiagram from '../../components/OrgChartDiagram'
import { saveOrgChartImage, loadOrgChartImage } from '../../lib/orgChartImage'
import { printQmAppointmentLetter } from '../../lib/pdfPrint'

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
    <AppLayout user={user} title="ê¸°ë³¸ì ë³´" subtitle="ê¸°ìì ë³´ / íì¬ë¬¸ìí¨ / ì¡°ì§ë(ì§ë¬´ê¸°ì ìÂ·ê¶íì±ìì) / íì§ì±ìì ì§ì ">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto fade-in">
        {toast && (
          <div className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-lg text-[13px] flex items-center gap-2 fade-in"
            style={{ background: 'var(--moss)', color: 'var(--bg)', boxShadow: '0 6px 20px rgba(15,26,20,0.18)', fontWeight: 500 }}>
            â {toast}
          </div>
        )}

        <div className="mb-5">
          <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--moss)' }}>ORG Â· BASIC INFO</span>
          <div className="font-display text-[26px] mt-1" style={{ color: 'var(--ink)', fontWeight: 500 }}>ê¸°ë³¸ì ë³´</div>
          <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>
            ìë£ê¸°ê¸° ì ì¡°ìì²´ ì ë³´, ì¬ììë±ë¡ì¦Â·ëë¦¬ì¸ê³ì½ìÂ·ì ì¡°ìë±ë¡ìë£Â·ìììíê°ì¦Â·ì ì¡°ìGMPì¸ì¦ìÂ·ISO 13485 ì¸ì¦ì, ì¡°ì§ë, íì§ì±ìì ì§ì ì í ê³³ìì ê´ë¦¬í©ëë¤.
            ì¬ê¸° ìë ¥í ì ë³´ë íì§ë¬¸ìÂ·ì¸íê° ëìë³´ë ë± ê´ë ¨ íë©´ì ìëì¼ë¡ ë°ìë©ëë¤.
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <StatCard label="ê¸°ìì ë³´" value={profileDone ? 'ìë ¥ìë£' : 'ë¯¸ìë ¥'} hint="íì¬ëªÂ·ì¬ììë²í¸Â·ëíì" icon={IdCard} tone={profileDone ? undefined : 'amber'} />
          <StatCard label="íì¬ ë¬¸ì" value={`${Object.values(DOC_CATEGORY).filter((cat) => s.documents.some((d) => d.category === cat) || (s.naCategories || []).includes(cat)).length} / ${Object.values(DOC_CATEGORY).length}`} hint="íì í­ëª© ë±ë¡ íí© (í´ë¹ìì í¬í¨)" icon={Building2} tone={Object.values(DOC_CATEGORY).every((cat) => s.documents.some((d) => d.category === cat) || (s.naCategories || []).includes(cat)) ? undefined : 'amber'} />
          <StatCard label="ë¶ì" value={departments.length} hint="ì§ë¬´ê¸°ì ì ëì" icon={Users} />
          <StatCard label="íì§ì±ìì" value={qm?.status === QM_STATUS.APPROVED ? 'ì¹ì¸ìë£' : qm ? 'ì§ì ëê¸°' : 'ë¯¸ì§ì '} hint="ì ì¡°ê´ë¦¬ì ì§ì  ìí" icon={BadgeCheck} tone={qm?.status === QM_STATUS.APPROVED ? undefined : 'amber'} />
        </div>

        <div className="flex gap-1 mb-5 overflow-x-auto" style={{ borderBottom: '1px solid var(--line)' }}>
          <TabButton active={tab === 'profile'} onClick={() => setTab('profile')} icon={IdCard} label="ê¸°ìì ë³´" en="COMPANY PROFILE" count={null} />
          <TabButton active={tab === 'docs'} onClick={() => setTab('docs')} icon={Building2} label="íì¬ë¬¸ìí¨" en="COMPANY DOCS" count={s.documents.length} />
          <TabButton active={tab === 'org'} onClick={() => setTab('org')} icon={Users} label="ì¡°ì§ë Â· ì§ë¬´ê¸°ì ì" en="ORG & JOB DESC" count={departments.length} />
          <TabButton active={tab === 'qm'} onClick={() => setTab('qm')} icon={BadgeCheck} label="íì§ì±ìì ì§ì " en="QM APPOINTMENT" count={null} />
        </div>

        {tab === 'profile' && <ProfileTab key={'profile' + tick} company={company} members={ob?.members || []} onAction={showToast} refresh={refresh} />}
        {tab === 'docs' && <CompanyDocsTab key={tick} onAction={showToast} refresh={refresh} />}
        {tab === 'org' && <OrgTab key={'org' + tick} departments={departments} onAction={showToast} refresh={refresh} />}
        {tab === 'qm' && <QmTab key={'qm' + tick} qm={qm} onAction={showToast} refresh={refresh} />}
      </div>
    </AppLayout>
  )
}

/* ================================================================
   ê³µíµ UI
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
function ChipMultiField({ label, value, onChange, options, className = '' }) {
  const list = Array.isArray(value) ? value : []
  const toggle = (opt) => onChange(list.includes(opt) ? list.filter((v) => v !== opt) : [...list, opt])
  return (
    <div className={className}>
      <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const on = list.includes(opt)
          return (
            <button key={opt} type="button" onClick={() => toggle(opt)}
              className="text-[11.5px] px-2.5 py-1 rounded-full"
              style={{ border: '1px solid ' + (on ? 'var(--moss)' : 'var(--line-strong)'), background: on ? 'var(--leaf-soft)' : 'var(--bg-card)', color: on ? 'var(--moss)' : 'var(--ink-mute)', cursor: 'pointer' }}>
              {opt}
            </button>
          )
        })}
      </div>
    </div>
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
    if (!url) { window.alert('íì¼ì ì°¾ì ì ììµëë¤.'); return }
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
          <button type="button" onClick={openFile} className="inline-flex items-center gap-1 hover:underline"><Download size={11} /> {fileName || 'ì²¨ë¶íì¼'}</button>
          {canEdit && <button type="button" onClick={onRemove} className="opacity-50 hover:opacity-100"><X size={11} /></button>}
        </span>
      ) : canEdit ? (
        <>
          <input ref={ref} type="file" className="hidden" onChange={pick} />
          <button type="button" onClick={() => ref.current && ref.current.click()} disabled={busy} className="inline-flex items-center gap-1 text-[11.5px] font-medium" style={{ color: 'var(--moss)' }}>
            <Paperclip size={12} /> {busy ? 'ìë¡ë ì¤â¦' : 'íì¼ ì²¨ë¶ (5MB ì´í)'}
          </button>
        </>
      ) : (
        <span className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>ì²¨ë¶ íì¼ ìì</span>
      )}
    </div>
  )
}

/* ================================================================
   ê¸°ìì ë³´ â ìë£ê¸°ê¸° ì ì¡°ìì²´ ê¸°ë³¸ì ë³´ (onboarding.company ì ì°ë)
   ================================================================ */
function ProfileTab({ company, members, onAction, refresh }) {
  const canEdit = permissions.can('onb.company.edit')
  // #10 ì§ì ì ê¸°ë³¸ê° â ì¨ë³´ë©(ê³ì  ë°ê¸ ë¨ê³)ìì ë±ë¡í êµ¬ì±ì ìë¥¼ ê¸°ë³¸ê°ì¼ë¡ ì±ìì£¼ë,
  // íì¬ê° ì§ì  ìë ¥/ìì í ê°ì´ ìì¼ë©´ ê·¸ ê°ì ê·¸ëë¡ ì¡´ì¤íë¤(ìë ì±ìì ìµì´ 1íë¿).
  const memberCount = (members || []).length
  const [form, setForm] = useState({
    name: '', bizNumber: '', licenseNo: '', ceo: '', address: '', site: '', phone: '', email: '',
    employeeCount: company.employeeCount || (memberCount > 0 ? String(memberCount) : ''),
    ...company,
  })
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const dirty = Object.keys(form).some((k) => {
    const a = form[k]
    const b = company[k]
    if (Array.isArray(a) || Array.isArray(b)) return JSON.stringify(a || []) !== JSON.stringify(b || [])
    if (typeof a === 'boolean' || typeof b === 'boolean') return !!a !== !!b
    return (a || '') !== (b || '')
  })

  const save = () => {
    if (!requirePermission('onb.company.edit')) return
    if (!form.name.trim()) { window.alert('íì¬ëªì ìë ¥íì¸ì.'); return }
    onboarding.updateCompany(form)
    onAction('ê¸°ìì ë³´ê° ì ì¥ëììµëë¤. ê´ë ¨ íì§ë¬¸ìÂ·ì¸íê° íë©´ì ìëì¼ë¡ ë°ìë©ëë¤.')
    refresh()
  }

  return (
    <div className="card-base p-4 space-y-4">
      <div>
        <div className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>ìë£ê¸°ê¸° ì ì¡°ìì²´ ì ë³´</div>
        <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>
          ì¬ê¸° ìë ¥í íì¬ëªÂ·ì¬ììë±ë¡ë²í¸Â·ëíìÂ·ì£¼ìë íì§ë§¤ë´ì¼Â·íµí© ë¬¸ìÂ·KGMP ëìë³´ë ë±ìì ê·¸ëë¡ ì¬ì©ë©ëë¤.
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="íì¬ëª (ìí¸) *" value={form.name} onChange={(v) => setF('name', v)} placeholder="ì: íìí¸ë¦¬ ì£¼ìíì¬" />
        <Field label="ì¬ììë±ë¡ë²í¸" value={form.bizNumber} onChange={(v) => setF('bizNumber', v)} placeholder="000-00-00000" />
        <Field label="ì ì¡°ì íê°ë²í¸" value={form.licenseNo} onChange={(v) => setF('licenseNo', v)} placeholder="ì 0000í¸" />
        <Field label="ëíì (ëíì´ì¬)" value={form.ceo} onChange={(v) => setF('ceo', v)} />
        <div>
          <Field label="ì§ì ì" value={form.employeeCount} onChange={(v) => setF('employeeCount', v)} />
          {memberCount > 0 && <div className="text-[10.5px] mt-1" style={{ color: 'var(--ink-faint)' }}>ì¨ë³´ë©ì ë±ë¡ë êµ¬ì±ì {memberCount}ëª ê¸°ì¤ ê¸°ë³¸ê° â ì§ì  ìì í  ì ììµëë¤.</div>}
        </div>
        <Field label="ë³¸ì¬ ì£¼ì" value={form.address} onChange={(v) => setF('address', v)} className="sm:col-span-2" />
        <Field label="ì ì¡°ì ì£¼ì (ë³¸ì¬ì ë¤ë¥¸ ê²½ì°)" value={form.site} onChange={(v) => setF('site', v)} className="sm:col-span-2" />
        <Field label="ì íë²í¸" value={form.phone} onChange={(v) => setF('phone', v)} placeholder="02-0000-0000" />
        <Field label="ëí ì´ë©ì¼" type="email" value={form.email} onChange={(v) => setF('email', v)} />
      </div>

      <div className="pt-3 mt-1" style={{ borderTop: '1px dashed var(--line)' }}>
        <div className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>
          GMP ì í©ì±ì¸ì  ì¬ì¬ ì ì²­ì(ì¬ì¬êµ¬ë¶Â·íì¥ì¡°ì¬ í¬ë§ì¼ ë± ì ì²­ì ë³´)ì ì íë³ ê¸°ì ë¬¸ìë{' '}
          <a href="/gmp-application" className="underline" style={{ color: 'var(--moss)' }}>GMP ì ì²­</a> íë©´ìì ìì±Â·ê´ë¦¬í©ëë¤.
        </div>
      </div>

      {canEdit && (
        <div className="flex justify-end pt-2" style={{ borderTop: '1px solid var(--line)' }}>
          <button onClick={save} disabled={!dirty} className="btn-primary text-[12.5px] disabled:opacity-50">ê¸°ìì ë³´ ì ì¥</button>
        </div>
      )}
      {!canEdit && (
        <div className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>ê¸°ìì ë³´ ë³ê²½ì ë§¤ëì Â·RA ê¶íì´ íìí©ëë¤.</div>
      )}
    </div>
  )
}

/* ================================================================
   íì¬ë¬¸ìí¨ â íì ë¬¸ì í­ëª©ì ê³ ì  ëª©ë¡ì¼ë¡ íìíê³  ë±ë¡ ì¬ë¶ë¥¼ íì¸
   ================================================================ */
const CATEGORY_ORDER = Object.values(DOC_CATEGORY)
const CATEGORY_HINT = {
  [DOC_CATEGORY.BIZ_REG]: 'ê´í  ì¸ë¬´ì ë°ê¸ ì¬ììë±ë¡ì¦ ì¬ë³¸',
  [DOC_CATEGORY.MFG_LICENSE]: 'ì ì¡°ìíê°ì¦ (í´ë¹ ì)',
  [DOC_CATEGORY.FACILITY_PLAN]: 'ì ì¡°ì íë©´ë (ììêµ¬ì­Â·ë³´ê´êµ¬ì­ íì)',
  [DOC_CATEGORY.FACILITY_PHOTO]: 'ì ì¡°ì ì¸ê´Â·ë´ë¶ ì¬ì§',
  [DOC_CATEGORY.FACILITY_REG]: 'ì ì¡°ì ë±ë¡ íì¸ ìë£',
  [DOC_CATEGORY.IMPORT_LICENSE]: 'ììì íê°ì¦ (ììììì¸ ê²½ì°)',
  [DOC_CATEGORY.AGENT_CONTRACT]: 'í´ì¸ ì ì¡°ì¬ ëë¦¬ì¸ ì§ì  ê³ì½ì (Authorization Letter)',
  [DOC_CATEGORY.GMP_CERT]: 'ì ì¡°ì GMP ì í©ì¸ì ì/ì¸ì¦ì',
  [DOC_CATEGORY.ISO13485_CERT]: 'ISO 13485 ì¸ì¦ì',
}
const EMPTY_DOC_FOR = (category) => ({ category, title: '', issuer: '', issueDate: '', expiryDate: '', notes: '' })

function CompanyDocsTab({ onAction, refresh }) {
  const canEdit = permissions.can('company.docs.edit')
  const [list, setList] = useState(() => companyDocs.getDocuments())
  const [naList, setNaList] = useState(() => companyDocs.load().naCategories || [])

  const toggleNA = (category) => {
    if (!requirePermission('company.docs.edit')) return
    companyDocs.toggleNA(category)
    setNaList(companyDocs.load().naCategories || [])
    refresh()
  }

  const save = (form) => {
    if (!requirePermission('company.docs.edit')) return false
    if (!form.title.trim()) { window.alert('ë¬¸ìëªì ìë ¥íì¸ì.'); return false }
    companyDocs.addDocument(form)
    setList(companyDocs.getDocuments())
    onAction('ë¬¸ìê° ë±ë¡ëììµëë¤.')
    refresh()
    return true
  }
  const del = (id) => {
    if (!requirePermission('company.docs.edit')) return
    if (!window.confirm('ì´ ë¬¸ìë¥¼ ì­ì í ê¹ì?')) return
    companyDocs.deleteDocument(id)
    setList(companyDocs.getDocuments())
    onAction('ë¬¸ìê° ì­ì ëììµëë¤.')
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
  const registeredCount = CATEGORY_ORDER.filter((cat) => (byCategory[cat] || []).length > 0 || naList.includes(cat)).length
  const customDocs = list.filter((d) => !CATEGORY_ORDER.includes(d.category))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-[12px]" style={{ color: 'var(--ink-mute)' }}>
          ìë í­ëª©ë³ë¡ ë¬¸ìë¥¼ ë±ë¡Â·ë³´ê´í©ëë¤. (ISO 13485 Â§4.1, Â§6.3)
        </div>
        <Badge text={`${registeredCount} / ${CATEGORY_ORDER.length} í­ëª© ë±ë¡ë¨`} tone={registeredCount === CATEGORY_ORDER.length ? 'emerald' : 'amber'} />
      </div>
      {CATEGORY_ORDER.map((cat) => (
        <DocCategoryCard
          key={cat}
          category={cat}
          hint={CATEGORY_HINT[cat]}
          docs={byCategory[cat] || []}
          na={naList.includes(cat)}
          onToggleNA={() => toggleNA(cat)}
          canEdit={canEdit}
          onSave={save}
          onDelete={del}
          onAttach={attach}
          onRemoveFile={removeFile}
        />
      ))}
      <CustomDocsSection
        docs={customDocs}
        canEdit={canEdit}
        onSave={save}
        onDelete={del}
        onAttach={attach}
        onRemoveFile={removeFile}
      />
    </div>
  )
}

/* ââ ì¶ê° ë¬¸ì â ê³ ì  9ê° í­ëª© ì¸ íì¬ê° íìì ë°ë¼ ìì ë¡­ê² ë±ë¡íë ë¬¸ì ââ */
const EMPTY_CUSTOM_DOC = { category: '', title: '', issuer: '', issueDate: '', expiryDate: '', notes: '' }

function CustomDocsSection({ docs, canEdit, onSave, onDelete, onAttach, onRemoveFile }) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY_CUSTOM_DOC)
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const submit = () => {
    if (!form.category.trim()) { window.alert('ë¬¸ì êµ¬ë¶ì ìë ¥íì¸ì.'); return }
    const ok = onSave(form)
    if (ok) { setForm(EMPTY_CUSTOM_DOC); setAdding(false) }
  }

  return (
    <div className="card-base p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>ì¶ê° ë¬¸ì</div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>ì 9ê° í­ëª© ì¸ì íì¬ì íìí ë¬¸ìë¥¼ ìì ë¡­ê² ë±ë¡í©ëë¤. (ì: íì§ê²½ììì¤í ì¸ì¦ì, íê²½ì¸ì¦ì, í¹íì¦ ë±)</div>
        </div>
        {docs.length > 0 && <Badge text={`${docs.length}ê±´`} tone="emerald" />}
      </div>

      {docs.length > 0 && (
        <div className="space-y-2 mt-2">
          {docs.map((d) => (
            <div key={d.id} className="p-3 rounded-lg border flex items-start justify-between gap-3 flex-wrap" style={{ borderColor: 'var(--line)' }}>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge text={d.category} tone="slate" />
                  <span className="text-[12.5px] font-medium" style={{ color: 'var(--ink)' }}>{d.title}</span>
                </div>
                <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>{d.issuer || 'ë°ê¸ê¸°ê´ ë¯¸ìë ¥'} Â· ë°ê¸ {d.issueDate || 'â'}{d.expiryDate ? ` Â· ë§ë£ ${d.expiryDate}` : ''}</div>
                <div className="mt-1.5"><SingleFileAttach fileId={d.fileId} fileName={d.fileName} onAttach={(f) => onAttach(d.id, f)} onRemove={() => onRemoveFile(d.id)} canEdit={canEdit} label="" /></div>
              </div>
              {canEdit && <button onClick={() => onDelete(d.id)} className="text-slate-300 hover:text-rose-600 shrink-0"><Trash2 size={14} /></button>}
            </div>
          ))}
        </div>
      )}

      {canEdit && !adding && (
        <button onClick={() => setAdding(true)} className="btn-ghost text-[12px] mt-2"><Plus size={12} /> ë¬¸ì ì¶ê°</button>
      )}
      {adding && (
        <div className="rounded-lg p-3 mt-2 space-y-3" style={{ background: 'var(--bg-soft)' }}>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="ë¬¸ì êµ¬ë¶ *" value={form.category} onChange={(v) => setF('category', v)} placeholder="ì: íì§ê²½ììì¤í ì¸ì¦ì" />
            <Field label="ë¬¸ìëª" value={form.title} onChange={(v) => setF('title', v)} placeholder="ì: QMS ì¸ì¦ì (2026)" />
            <Field label="ë°ê¸ê¸°ê´" value={form.issuer} onChange={(v) => setF('issuer', v)} />
            <Field label="ë°ê¸ì¼" type="date" value={form.issueDate} onChange={(v) => setF('issueDate', v)} />
            <Field label="ì í¨ê¸°í" type="date" value={form.expiryDate} onChange={(v) => setF('expiryDate', v)} placeholder="í´ë¹ ì" />
          </div>
          <TextAreaField label="ë¹ê³ " value={form.notes} onChange={(v) => setF('notes', v)} />
          <div className="flex gap-2">
            <button onClick={submit} className="btn-primary text-[12.5px]">ì ì¥</button>
            <button onClick={() => { setAdding(false); setForm(EMPTY_CUSTOM_DOC) }} className="btn-ghost text-[12.5px]">ì·¨ì</button>
          </div>
        </div>
      )}
    </div>
  )
}

function DocCategoryCard({ category, hint, docs, na, onToggleNA, canEdit, onSave, onDelete, onAttach, onRemoveFile }) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(() => EMPTY_DOC_FOR(category))
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const registered = docs.length > 0

  const submit = () => {
    const ok = onSave(form)
    if (ok) { setForm(EMPTY_DOC_FOR(category)); setAdding(false) }
  }

  return (
    <div className="card-base p-4" style={{ borderColor: na ? 'var(--line)' : registered ? 'var(--line)' : 'var(--amber)', opacity: na ? 0.7 : 1 }}>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{category}</div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{hint}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <label className="flex items-center gap-1 text-[10.5px] cursor-pointer select-none" style={{ color: 'var(--ink-mute)' }}>
            <input type="checkbox" checked={!!na} onChange={onToggleNA} disabled={!canEdit} style={{ accentColor: 'var(--ink-mute)' }} />
            í´ë¹ ìì
          </label>
          <Badge text={na ? 'í´ë¹ìì' : registered ? `ë±ë¡ë¨ Â· ${docs.length}ê±´` : 'ë¯¸ë±ë¡'} tone={na ? 'slate' : registered ? 'emerald' : 'amber'} />
        </div>
      </div>

      {na && (
        <div className="text-[11.5px] mb-2" style={{ color: 'var(--ink-faint)' }}>
          ì°ë¦¬ íì¬ ìí(ì ì¡°ì/ììì ë±)ì í´ë¹íì§ ìë ë¬¸ìë¡ íìíìµëë¤. ì²´í¬ë¥¼ í´ì íë©´ ë¤ì ë±ë¡í  ì ììµëë¤.
        </div>
      )}

      {!na && docs.length > 0 && (
        <div className="space-y-2 mt-2">
          {docs.map((d) => (
            <div key={d.id} className="p-3 rounded-lg border flex items-start justify-between gap-3 flex-wrap" style={{ borderColor: 'var(--line)' }}>
              <div className="min-w-0">
                <div className="text-[12.5px] font-medium" style={{ color: 'var(--ink)' }}>{d.title}</div>
                <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>{d.issuer || 'ë°ê¸ê¸°ê´ ë¯¸ìë ¥'} Â· ë°ê¸ {d.issueDate || 'â'}{d.expiryDate ? ` Â· ë§ë£ ${d.expiryDate}` : ''}</div>
                <div className="mt-1.5"><SingleFileAttach fileId={d.fileId} fileName={d.fileName} onAttach={(f) => onAttach(d.id, f)} onRemove={() => onRemoveFile(d.id)} canEdit={canEdit} label="" /></div>
              </div>
              {canEdit && <button onClick={() => onDelete(d.id)} className="text-slate-300 hover:text-rose-600 shrink-0"><Trash2 size={14} /></button>}
            </div>
          ))}
        </div>
      )}

      {canEdit && !adding && !na && (
        <button onClick={() => setAdding(true)} className="btn-ghost text-[12px] mt-2"><Plus size={12} /> {registered ? 'ë¬¸ì ì¶ê°' : 'ë¬¸ì ë±ë¡'}</button>
      )}
      {adding && !na && (
        <div className="rounded-lg p-3 mt-2 space-y-3" style={{ background: 'var(--bg-soft)' }}>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="ë¬¸ìëª" value={form.title} onChange={(v) => setF('title', v)} placeholder={`ì: ${category}`} />
            <Field label="ë°ê¸ê¸°ê´" value={form.issuer} onChange={(v) => setF('issuer', v)} />
            <Field label="ë°ê¸ì¼" type="date" value={form.issueDate} onChange={(v) => setF('issueDate', v)} />
            <Field label="ì í¨ê¸°í" type="date" value={form.expiryDate} onChange={(v) => setF('expiryDate', v)} placeholder="í´ë¹ ì" />
          </div>
          <TextAreaField label="ë¹ê³ " value={form.notes} onChange={(v) => setF('notes', v)} />
          <div className="flex gap-2">
            <button onClick={submit} className="btn-primary text-[12.5px]">ì ì¥</button>
            <button onClick={() => { setAdding(false); setForm(EMPTY_DOC_FOR(category)) }} className="btn-ghost text-[12.5px]">ì·¨ì</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ================================================================
   ì¡°ì§ë Â· ì§ë¬´ê¸°ì ì Â· ê¶íì±ìì â ë¶ìë³
   ================================================================ */
function OrgTab({ departments, onAction, refresh }) {
  const canEdit = permissions.can('company.roledoc.edit')
  const [selId, setSelId] = useState(departments[0]?.id || null)
  const sel = departments.find((d) => d.id === selId) || null
  const chartRef = useRef(null)
  const visibleDepts = React.useMemo(() => {
    const childIds = new Set(departments.map(x => x.parentId).filter(Boolean))
    return departments.filter(d => !childIds.has(d.id) || !d.parentId)
  }, [departments])
  const [capturing, setCapturing] = useState(false)
  const savedImg = loadOrgChartImage()
  const captureChart = async () => {
    setCapturing(true)
    try {
      const dataUrl = chartRef.current && (await chartRef.current.captureDataUrl())
      if (!dataUrl) throw new Error('ìº¡ì²í  ì¡°ì§ëê° ììµëë¤.')
      saveOrgChartImage(dataUrl)
      onAction('ì¡°ì§ë ì´ë¯¸ì§ê° ì ì¥ëììµëë¤. íì§ë¬¸ìì "ì¡°ì§ë" ì±í°ì ê·¸ëë¡ ë°ìë©ëë¤.')
      refresh()
    } catch (e) {
      window.alert('ìº¡ì² ì¤í¨: ' + ((e && e.message) || e))
    }
    setCapturing(false)
  }

  if (departments.length === 0) {
    return <EmptyState icon={Users} text="ë±ë¡ë ë¶ìê° ììµëë¤. ì¨ë³´ë©ì ì¡°ì§ë ë¨ê³ìì ë¶ìë¥¼ ë¨¼ì  ë±ë¡íì¸ì." />
  }

  return (
    <div className="space-y-5">
      <div className="card-base p-3">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="text-[12px] font-medium" style={{ color: 'var(--ink-mute)' }}>ì¡°ì§ë</div>
          <div className="flex items-center gap-2">
            {savedImg && <span className="text-[10.5px]" style={{ color: 'var(--ink-mute)' }}>ìµê·¼ ì ì¥ {new Date(savedImg.capturedAt).toLocaleString('ko-KR')}</span>}
            <button onClick={captureChart} disabled={capturing} className="btn-primary text-[12px] px-3 py-1.5 disabled:opacity-50">
              {capturing ? 'ìº¡ì² ì¤â¦' : 'ì¡°ì§ë ì´ë¯¸ì§ë¡ ì ì¥ â íì§ë¬¸ì ë°ì'}
            </button>
          </div>
        </div>
        <OrgChartDiagram ref={chartRef} departments={departments} />
      </div>
      <div className="grid lg:grid-cols-[280px_1fr] gap-5">
      <div className="space-y-1.5">
        {visibleDepts.map((d) => {
          const rd = companyDocs.getRoleDoc(d.id)
          const filled = rd && (rd.jobDescription || rd.authorityResponsibility)
          return (
            <button key={d.id} onClick={() => setSelId(d.id)} className="w-full text-left px-3 py-2.5 rounded-lg border flex items-center justify-between gap-2 transition"
              style={{ borderColor: d.id === selId ? 'var(--moss)' : 'var(--line)', background: d.id === selId ? 'var(--leaf-soft)' : 'var(--bg-card)' }}>
              <span className="text-[13px]" style={{ color: 'var(--ink)' }}>{d.name}</span>
              {filled ? <Badge text="ìì±ë¨" tone="emerald" /> : <Badge text="ë¯¸ìì±" tone="slate" />}
            </button>
          )
        })}
      </div>
      <div>
        {sel ? <RoleDocForm key={sel.id} dept={sel} canEdit={canEdit} onAction={onAction} refresh={refresh} /> : <EmptyState icon={Users} text="ì¼ìª½ìì ë¶ìë¥¼ ì ííì¸ì." />}
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
    onAction('ì§ë¬´ê¸°ì ìÂ·ê¶íì±ììê° ì ì¥ëììµëë¤.')
    refresh()
  }

  return (
    <div className="card-base p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>{dept.name} â ì§ë¬´ê¸°ì ì Â· ê¶íì±ìì</div>
        {/* #16 AI ì´ì ìì± â ì¶í ì ì© ìì . ì¡°ì§ëÂ·ì íÂ·ì¸ì¦ ì ë³´ë¥¼ ë°íì¼ë¡ ì´ìì ìë ìì±íë ê¸°ë¥ì
            ë¤ë¥¸ íë©´(íì§ë§¤ë´ì¼ STEP4)ì ì´ë¯¸ ì ì©ë í¨í´ì ì´ íë©´ìë íì¥í  ìì ì´ë©°, ì°ì  ì§ìì ë§ ë§ë ¨í´ëë¤. */}
        <button type="button" disabled title="ì¡°ì§ëÂ·ë¶ì ì ë³´ë¥¼ ë°íì¼ë¡ ì´ìì ìë ìì±íë ê¸°ë¥ì ì¤ë¹ ì¤ìëë¤."
          className="inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-1.5 rounded-lg opacity-50 cursor-not-allowed"
          style={{ border: '1px solid var(--line)', color: 'var(--ink-faint)' }}>
          <Sparkles size={12} /> AI ì´ì ìì± (ì¤ë¹ ì¤)
        </button>
      </div>
      <TextAreaField label="ì§ë¬´ê¸°ì ì" value={jobDescription} onChange={setJobDescription} minHeight={120} placeholder="ë´ë¹ ìë¬´Â·íì ìê²©Â·ë³´ê³ ì²´ê³ ë±ì ê¸°ì íì¸ì." />
      <TextAreaField label="ê¶í ë° ì±ìì" value={authorityResponsibility} onChange={setAuthorityResponsibility} minHeight={120} placeholder="ìì¬ê²°ì  ê¶í ë²ìÂ·íì§ ê´ë ¨ ì±ì ì¬í­ì ê¸°ì íì¸ì. (ISO 13485 Â§5.5.1)" />
      {canEdit && (
        <div className="flex justify-end"><button onClick={save} disabled={!dirty} className="btn-primary text-[12.5px]">ì ì¥</button></div>
      )}
    </div>
  )
}

/* ================================================================
   íì§ì±ìì ì§ì  â ì ì¡°ê´ë¦¬ì ìê²©ì¦ + ìëªì¥, ì¹ì¸ ì ì°¨
   ================================================================ */
function QmTab({ qm, onAction, refresh }) {
  const canEdit = permissions.can('company.qm.edit')
  const canApprove = permissions.can('company.qm.approve')
  const cur = qm || { name: '', title: '', appointedDate: '', requirements: [], status: QM_STATUS.DRAFT }
  const [form, setForm] = useState(cur)
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const reqSet = new Set(form.requirements || [])
  const toggleReq = (id) => {
    const next = new Set(form.requirements || [])
    if (next.has(id)) next.delete(id); else next.add(id)
    setF('requirements', [...next])
  }
  const allReqChecked = QM_REQUIREMENTS.every((r) => reqSet.has(r.id))

  const save = () => {
    if (!requirePermission('company.qm.edit')) return
    companyDocs.setQualityManager(form)
    if (form.name) onboarding.updateCompany({ qmRep: form.name }) // ë¬¸ì ìì± ì ì°¸ì¡°íë íì§ì±ììëªê³¼ ëê¸°í
    onAction('íì§ì±ìì ì§ì  ì ë³´ê° ì ì¥ëììµëë¤.')
    refresh()
  }

  const approve = () => {
    if (!requirePermission('company.qm.approve')) return
    // ì¹ì¸ ì ì íë©´ì ìë ¥ë ìµì  ê°(ì±ëªÂ·ìê±´ ì²´í¬)ì ë¨¼ì  ì ì¥í´ ì¹ì¸ ë¡ì§ì´ ì°¸ì¡°íëë¡ íë¤.
    companyDocs.setQualityManager(form)
    const approver = auth.current()
    try {
      const saved = companyDocs.approveQualityManager(approver?.name || 'ì¹ì¸ì')
      if (form.name) onboarding.updateCompany({ qmRep: form.name })
      onAction('íì§ì±ìì ì§ì ì´ ì¹ì¸ëììµëë¤. ìëªì¥ì ìë ìì±í©ëë¤.')
      refresh()
      // #19 ì¹ì¸ í ìëªì¥ ìë ë°ê¸ â ë³ë íì¼ ì²¨ë¶ ìì´ ì§ì Â·ì¹ì¸ ì ë³´ë¡ ì¦ì ì¸ìì© ìëªì¥ì ìì±íë¤.
      if (saved?.qualityManager) printQmAppointmentLetter(saved.qualityManager)
    } catch (e) {
      window.alert((e && e.message) || String(e))
    }
  }

  const reissueLetter = () => {
    if (qm) printQmAppointmentLetter(qm)
  }

  return (
    <div className="card-base p-4 space-y-3">
      <div className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>íì§ì±ìì(ì ì¡°ê´ë¦¬ì) ì§ì </div>
      <div className="text-[11.5px]" style={{ color: 'var(--ink-mute)' }}>KGMP ì 6ì¡° / ISO 13485 Â§5.5.2 â ìê²© ìê±´ 4ê° í­ëª©ì ëª¨ë íì¸Â·ì²´í¬í´ì¼ ì¹ì¸í  ì ììµëë¤.</div>

      {qm?.status === QM_STATUS.APPROVED && (
        <div className="text-[12px] p-2.5 rounded-lg flex items-center justify-between gap-2 flex-wrap" style={{ background: 'var(--leaf-soft)', color: 'var(--moss)' }}>
          <span><CheckCircle2 size={13} className="inline mr-1" /> {qm.approvedBy} ì¹ì¸ Â· {qm.approvedAt ? new Date(qm.approvedAt).toLocaleString('ko-KR') : ''}</span>
          <button onClick={reissueLetter} className="inline-flex items-center gap-1 text-[11.5px] font-medium px-2 py-1 rounded-md" style={{ background: '#fff', border: '1px solid var(--moss)', color: 'var(--moss)' }}>
            <Printer size={12} /> ìëªì¥ ë¤ì ë³´ê¸°
          </button>
        </div>
      )}
      {qm && qm.status !== QM_STATUS.APPROVED && (
        <div className="text-[12px] p-2.5 rounded-lg flex items-center gap-1.5" style={{ background: 'var(--amber-soft)', color: 'var(--amber)' }}>
          <AlertCircle size={13} /> ì¹ì¸ ëê¸° ì¤ìëë¤.
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="ì±ëª" value={form.name} onChange={(v) => setF('name', v)} />
        <Field label="ì§ì" value={form.title} onChange={(v) => setF('title', v)} placeholder="ì: íì§ê²½ìíì¥" />
        <Field label="ì§ì ì¼" type="date" value={form.appointedDate} onChange={(v) => setF('appointedDate', v)} />
      </div>

      <div className="rounded-lg p-3" style={{ background: 'var(--bg-soft)' }}>
        <div className="text-[12px] font-semibold mb-2" style={{ color: 'var(--ink)' }}>íì§ì±ìì ìê²© ìê±´ íì¸ (ìë£ê¸°ê¸°ë² ìíê·ì¹ [ë³í9])</div>
        <div className="space-y-2">
          {QM_REQUIREMENTS.map((r) => (
            <label key={r.id} className="flex items-start gap-2 cursor-pointer select-none">
              <input type="checkbox" className="mt-0.5" checked={reqSet.has(r.id)} onChange={() => toggleReq(r.id)} disabled={!canEdit} />
              <span className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>{r.label}</span>
            </label>
          ))}
        </div>
        {!allReqChecked && (
          <div className="text-[11px] mt-2" style={{ color: 'var(--ink-faint)' }}>4ê° í­ëª©ì ëª¨ë ì²´í¬í´ì¼ ì§ì  ì¹ì¸ì´ ê°ë¥í©ëë¤.</div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2" style={{ borderTop: '1px solid var(--line)' }}>
        {canEdit && <button onClick={save} className="btn-ghost text-[12.5px]">ì ë³´ ì ì¥</button>}
        {canApprove && <button onClick={approve} disabled={!form.name?.trim() || !allReqChecked} className="btn-primary text-[12.5px] disabled:opacity-40"><CheckCircle2 size={14} /> ì§ì  ì¹ì¸ Â· ìëªì¥ ë°ê¸</button>}
      </div>
    </div>
  )
}
