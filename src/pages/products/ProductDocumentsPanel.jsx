import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileCheck2,
  ClipboardList,
  ListChecks,
  Plus,
  Trash2,
  Edit3,
  Download,
  Paperclip,
  X,
  ArrowRight,
  AlertCircle,
  Save,
} from 'lucide-react'
import { permissions, requirePermission } from '../../lib/permissions'
import { fileStore } from '../../lib/fileStore'
import { productDocs, MARKETS, wiStatus } from '../../lib/productDocsState'
import { onboarding, productKeyOf, getProductProcesses } from '../../lib/onboardingState'
import { getBlock } from '../../lib/processBlocks'
import { operations } from '../../lib/operationsState'

const CUSTOM_BLOCK_KEY = 'qualytree.customBlocks'
function loadCustomBlocks() {
  try {
    const raw = localStorage.getItem(CUSTOM_BLOCK_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}
function findAnyBlock(blockId) {
  return getBlock(blockId) || loadCustomBlocks().find((b) => b.id === blockId) || null
}

/* ================================================================
   HTML → PDF (브라우저 인쇄) — 신규 의존성 없이 GMPSection.jsx와 동일 패턴
   ================================================================ */
function escHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function downloadAsPdf(html) {
  const w = window.open('', '_blank')
  if (!w) { window.alert('팝업이 차단되었습니다. 팝업을 허용한 뒤 다시 시도하세요.'); return }
  const withPrint = html.replace('</body>', "<script>window.onload=function(){setTimeout(function(){window.print()},350)}<\/script></body>")
  w.document.write(withPrint)
  w.document.close()
}
function wrapDoc(title, inner) {
  return "<html><head><meta charset='utf-8'><title>" + escHtml(title) + "</title></head><body style='font-family:sans-serif;padding:24px;max-width:760px;margin:0 auto'>" + inner + '</body></html>'
}

/* ================================================================
   공통 입력 UI (EquipmentHub.jsx와 동일 스타일)
   ================================================================ */
function Field({ label, value, onChange, placeholder, type = 'text', className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>{label}</span>
      <input
        type={type}
        className="input-base"
        style={{ padding: '0.5rem 0.7rem', fontSize: 13 }}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
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
function TextAreaField({ label, value, onChange, placeholder, minHeight = 60, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>{label}</span>
      <textarea
        className="input-base"
        style={{ padding: '0.5rem 0.7rem', fontSize: 13, minHeight }}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
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
function SubTab({ active, onClick, icon: Icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2.5 rounded-t-lg flex items-center gap-2 text-[13px] transition shrink-0"
      style={{
        background: active ? 'var(--bg-card)' : 'transparent',
        borderBottom: active ? '2px solid var(--moss)' : '2px solid transparent',
        color: active ? 'var(--ink)' : 'var(--ink-mute)',
        fontWeight: active ? 500 : 400,
      }}
    >
      <Icon size={14} />
      <span>{label}</span>
      {count != null && (
        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: active ? 'var(--leaf-soft)' : 'var(--bg-soft)', color: active ? 'var(--moss)' : 'var(--ink-faint)' }}>
          {count}
        </span>
      )}
    </button>
  )
}

/* ================================================================
   메인 — 제품 상세 화면에서 허가증 · 작업표준서 · 제조기록을 한 곳에서
   ================================================================ */
export default function ProductDocumentsPanel({ product, onAction }) {
  const [sub, setSub] = useState('license')
  const [tick, setTick] = useState(0)
  const refresh = () => setTick((x) => x + 1)

  if (!product) {
    return <EmptyState icon={AlertCircle} text="제품을 먼저 선택하세요." />
  }
  const productKey = productKeyOf(product)

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto" style={{ borderBottom: '1px solid var(--line)' }}>
        <SubTab active={sub === 'license'} onClick={() => setSub('license')} icon={FileCheck2} label="허가증" count={productDocs.getLicenses(productKey).length} />
        <SubTab active={sub === 'sop'} onClick={() => setSub('sop')} icon={ClipboardList} label="작업표준서" />
        <SubTab active={sub === 'record'} onClick={() => setSub('record')} icon={ListChecks} label="제조기록" />
      </div>
      {sub === 'license' && <LicenseSection key={'lic' + tick} product={product} productKey={productKey} onAction={onAction} refresh={refresh} />}
      {sub === 'sop' && <SopSection key={'sop' + tick} product={product} productKey={productKey} onAction={onAction} refresh={refresh} />}
      {sub === 'record' && <RecordSection product={product} />}
    </div>
  )
}

/* ================================================================
   허가증 — 제품 × 시장(KGMP/FDA/CE 등)별 실제 발급 인허가 문서
   ================================================================ */
const EMPTY_LICENSE = { market: 'KGMP', licenseNo: '', issuer: '', issueDate: '', expiryDate: '', notes: '' }

function LicenseSection({ product, productKey, onAction, refresh }) {
  const canEdit = permissions.can('onb.license.edit')
  const [list, setList] = useState(() => productDocs.getLicenses(productKey))
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY_LICENSE)
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const [busyId, setBusyId] = useState(null)

  const save = () => {
    if (!requirePermission('onb.license.edit')) return
    if (!form.licenseNo.trim()) return
    productDocs.addLicense(productKey, { ...form, productName: product.name || '' })
    setList(productDocs.getLicenses(productKey))
    setForm(EMPTY_LICENSE)
    setAdding(false)
    onAction('허가증이 등록되었습니다.')
    refresh()
  }

  const del = (id) => {
    if (!requirePermission('onb.license.edit')) return
    if (!window.confirm('이 허가증을 삭제할까요?')) return
    productDocs.deleteLicense(id)
    setList(productDocs.getLicenses(productKey))
    onAction('허가증이 삭제되었습니다.')
    refresh()
  }

  const attach = async (id, file) => {
    if (!requirePermission('onb.license.edit')) return
    setBusyId(id)
    try {
      const fileId = await fileStore.saveFile(file)
      productDocs.updateLicense(id, { fileId, fileName: file.name })
      setList(productDocs.getLicenses(productKey))
    } catch (e) {
      window.alert((e && e.message) || String(e))
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

  const removeFile = (id) => {
    if (!requirePermission('onb.license.edit')) return
    productDocs.updateLicense(id, { fileId: null, fileName: '' })
    setList(productDocs.getLicenses(productKey))
    refresh()
  }

  return (
    <div className="space-y-3">
      <div className="text-[12px]" style={{ color: 'var(--ink-mute)' }}>
        {product.name || '(이름없음)'} — 시장별 인허가 문서(허가증·인증서)를 등록·관리합니다. (ISO 13485 §4.2.3)
      </div>

      {canEdit && !adding && (
        <button onClick={() => setAdding(true)} className="btn-ghost text-[12px]">
          <Plus size={12} /> 허가증 추가
        </button>
      )}

      {adding && (
        <div className="card-base p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="시장" value={form.market} onChange={(v) => setF('market', v)} options={MARKETS.map((m) => ({ value: m.id, label: m.label }))} />
            <Field label="허가(인증) 번호" value={form.licenseNo} onChange={(v) => setF('licenseNo', v)} placeholder="예: 제인허-2024-000123호" />
            <Field label="발급기관" value={form.issuer} onChange={(v) => setF('issuer', v)} placeholder="예: 식품의약품안전처" />
            <Field label="발급일" value={form.issueDate} onChange={(v) => setF('issueDate', v)} type="date" />
            <Field label="유효기한" value={form.expiryDate} onChange={(v) => setF('expiryDate', v)} type="date" />
          </div>
          <TextAreaField label="비고" value={form.notes} onChange={(v) => setF('notes', v)} placeholder="선택 입력" />
          <div className="flex gap-2">
            <button onClick={save} className="btn-primary text-[12.5px]"><Save size={13} /> 저장</button>
            <button onClick={() => { setAdding(false); setForm(EMPTY_LICENSE) }} className="btn-ghost text-[12.5px]">취소</button>
          </div>
        </div>
      )}

      {list.length === 0 && !adding && <EmptyState icon={FileCheck2} text="등록된 허가증이 없습니다." />}

      {list.length > 0 && (
        <div className="space-y-2">
          {list.map((l) => {
            const st = productDocs.licenseStatusOf(l.expiryDate)
            const tone = st === '만료' ? 'rose' : st === '만료임박' ? 'amber' : st === '유효' ? 'emerald' : 'slate'
            const marketLabel = (MARKETS.find((m) => m.id === l.market) || {}).label || l.market
            return (
              <div key={l.id} className="card-base p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge text={marketLabel} tone="slate" />
                      {st && <Badge text={st} tone={tone} />}
                      <span className="text-[13.5px] font-medium" style={{ color: 'var(--ink)' }}>{l.licenseNo || '(번호 미입력)'}</span>
                    </div>
                    <div className="text-[11.5px] mt-1" style={{ color: 'var(--ink-mute)' }}>
                      {l.issuer || '발급기관 미입력'} · 발급 {l.issueDate || '—'} · 만료 {l.expiryDate || '—'}
                    </div>
                    {l.notes && <div className="text-[11.5px] mt-1" style={{ color: 'var(--ink-faint)' }}>{l.notes}</div>}
                    <div className="mt-2">
                      {l.fileId ? (
                        <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-[11.5px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
                          <button type="button" onClick={() => openFile(l.fileId)} className="inline-flex items-center gap-1 hover:underline"><Download size={11} /> {l.fileName || '첨부파일'}</button>
                          {canEdit && <button type="button" onClick={() => removeFile(l.id)} className="opacity-50 hover:opacity-100"><X size={11} /></button>}
                        </span>
                      ) : canEdit ? (
                        <FileAttachButton busy={busyId === l.id} onPick={(f) => attach(l.id, f)} />
                      ) : (
                        <span className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>첨부 파일 없음</span>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <button onClick={() => del(l.id)} className="shrink-0 opacity-50 hover:opacity-100" title="삭제">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FileAttachButton({ busy, onPick }) {
  const ref = useRef(null)
  return (
    <>
      <input ref={ref} type="file" className="hidden" onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) onPick(f) }} />
      <button type="button" onClick={() => ref.current && ref.current.click()} disabled={busy} className="inline-flex items-center gap-1 text-[11.5px] font-medium" style={{ color: 'var(--moss)' }}>
        <Paperclip size={12} /> {busy ? '업로드 중…' : '허가증 파일 첨부 (5MB 이하)'}
      </button>
    </>
  )
}

/* ================================================================
   작업표준서 — 제품×공정에서 자동 매핑된 SOP에 실제 본문 작성·발효
   ================================================================ */
function SopSection({ product, productKey, onAction, refresh }) {
  const canEdit = permissions.can('onb.sop.edit')
  const ob = onboarding.load()
  const productProcesses = getProductProcesses(ob, productKey)

  const sops = []
  const seen = new Set()
  productProcesses
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .forEach((pp) => {
      const block = findAnyBlock(pp.blockId)
      const names = (block && block.sopAuto) || []
      names.forEach((n) => {
        if (!seen.has(n)) {
          seen.add(n)
          sops.push({ name: n, blockId: pp.blockId, blockName: pp.customName || (block && block.name) || pp.blockId })
        }
      })
    })

  const [editingName, setEditingName] = useState(null)
  const [draft, setDraft] = useState('')
  const [draftStatus, setDraftStatus] = useState(wiStatus.DRAFT)

  const startEdit = (sop) => {
    if (!requirePermission('onb.sop.edit')) return
    const wi = productDocs.findWorkInstruction(productKey, sop.name)
    setEditingName(sop.name)
    setDraft(wi?.content || '')
    setDraftStatus(wi?.status || wiStatus.DRAFT)
  }

  const saveEdit = (sop) => {
    const wi = productDocs.findWorkInstruction(productKey, sop.name)
    if (wi) {
      productDocs.updateWorkInstruction(wi.id, { content: draft, status: draftStatus, blockId: sop.blockId })
    } else {
      productDocs.addWorkInstruction(productKey, { sopName: sop.name, blockId: sop.blockId, content: draft, status: draftStatus })
    }
    setEditingName(null)
    onAction('작업표준서가 저장되었습니다.')
    refresh()
  }

  const downloadPdf = (sop, wi) => {
    const meta = "<div style='font-family:sans-serif;font-size:11pt;color:#555;margin:6px 0 14px'>" +
      '공정: ' + escHtml(sop.blockName) + ' &nbsp;|&nbsp; 상태: ' + escHtml(wi.status) + ' &nbsp;|&nbsp; Rev.' + (wi.rev || 0) + '</div>'
    const body = "<div style='font-size:11pt;line-height:1.7;white-space:pre-wrap'>" + escHtml(wi.content || '(내용 없음)') + '</div>'
    const html = wrapDoc(sop.name, "<h1 style='font-size:16pt;border-bottom:2px solid #333;padding-bottom:6px'>" + escHtml(sop.name) + '</h1>' + meta + body)
    downloadAsPdf(html)
  }

  if (sops.length === 0) {
    return <EmptyState icon={ClipboardList} text="이 제품에 정의된 공정이 없어 필요한 SOP가 없습니다. 공정 탭에서 공정을 먼저 추가하세요." />
  }

  return (
    <div className="space-y-2">
      <div className="text-[12px] mb-1" style={{ color: 'var(--ink-mute)' }}>
        공정 정의에서 자동 매핑된 작업표준서 목록입니다. (ISO 13485 §7.5.1)
      </div>
      {sops.map((sop) => {
        const wi = productDocs.findWorkInstruction(productKey, sop.name)
        const isEditing = editingName === sop.name
        const tone = wi?.status === wiStatus.EFFECTIVE ? 'emerald' : wi?.status === wiStatus.REVIEW ? 'amber' : 'slate'
        return (
          <div key={sop.name} className="card-base p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13.5px] font-medium" style={{ color: 'var(--ink)' }}>{sop.name}</span>
                  {wi ? <Badge text={wi.status + ' Rev.' + (wi.rev || 0)} tone={tone} /> : <Badge text="미작성" tone="rose" />}
                </div>
                <div className="text-[11.5px] mt-1" style={{ color: 'var(--ink-mute)' }}>공정: {sop.blockName}</div>
                {wi && !isEditing && wi.content && (
                  <div className="text-[11.5px] mt-1.5 line-clamp-2" style={{ color: 'var(--ink-faint)' }}>{wi.content.slice(0, 140)}{wi.content.length > 140 ? '…' : ''}</div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                {wi && <button onClick={() => downloadPdf(sop, wi)} className="btn-ghost text-[11.5px]"><Download size={12} /> PDF</button>}
                {canEdit && !isEditing && <button onClick={() => startEdit(sop)} className="btn-ghost text-[11.5px]"><Edit3 size={12} /> {wi ? '편집' : '작성'}</button>}
              </div>
            </div>
            {isEditing && (
              <div className="mt-3 space-y-2" style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                <TextAreaField label="작업표준서 본문" value={draft} onChange={setDraft} minHeight={140} placeholder="작업 목적·범위·절차·주의사항·기록 방법 등을 입력하세요." />
                <SelectField label="상태" value={draftStatus} onChange={setDraftStatus} options={Object.values(wiStatus)} />
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(sop)} className="btn-primary text-[12.5px]"><Save size={13} /> 저장</button>
                  <button onClick={() => setEditingName(null)} className="btn-ghost text-[12.5px]">취소</button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ================================================================
   제조기록 — 이 제품으로 발행된 작업지시서(eBR) 목록
   ================================================================ */
function labelForWo(s) {
  return { pending: '대기', in_progress: '진행 중', completed: '완료', on_hold: '보류' }[s] || s
}
function toneForWo(s) {
  return { pending: 'amber', in_progress: 'slate', completed: 'emerald', on_hold: 'rose' }[s] || 'slate'
}

function RecordSection({ product }) {
  const nav = useNavigate()
  const opState = operations.load()
  const wos = opState.workOrders
    .filter((wo) => wo.productName === product.name || (product.modelNumber && wo.productModel === product.modelNumber))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))

  if (wos.length === 0) {
    return <EmptyState icon={ListChecks} text="이 제품으로 발행된 작업지시서(제조기록)가 없습니다. Operations에서 작업지시를 발행하면 여기에 표시됩니다." />
  }

  return (
    <div className="space-y-2">
      <div className="text-[12px] mb-1" style={{ color: 'var(--ink-mute)' }}>
        이 제품으로 발행된 작업지시서(WO)와 전자배치기록(eBR)입니다. (ISO 13485 §4.2.5, FDA QMSR §820.184)
      </div>
      {wos.map((wo) => {
        const total = wo.stages?.length || 0
        const done = (wo.stages || []).filter((s) => s.status === 'completed').length
        return (
          <div key={wo.id} className="card-base p-3.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[12.5px]" style={{ color: 'var(--ink)' }}>{wo.id}</span>
                <Badge text={labelForWo(wo.status)} tone={toneForWo(wo.status)} />
              </div>
              <div className="text-[11.5px] mt-1" style={{ color: 'var(--ink-mute)' }}>
                LOT {wo.lotNumber || '—'} · 공정 {done}/{total} 완료 · 생성 {wo.createdAt ? wo.createdAt.slice(0, 10) : '—'}
              </div>
            </div>
            <button onClick={() => nav('/operations/' + wo.id + '/ebr')} className="btn-primary text-[12px] shrink-0">
              eBR 보기 <ArrowRight size={13} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
