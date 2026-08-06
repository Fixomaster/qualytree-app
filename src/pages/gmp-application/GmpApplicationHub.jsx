// src/pages/gmp-application/GmpApplicationHub.jsx
// GMP 신청 — GMP 접수양식·기술문서등심사의뢰서 작성에 필요한 자료를 한 화면에서 준비.
// (#33-40) 이전에는 이 자료들이 설계개발(제품상세)·기본정보(기업정보) 화면에 흩어져 있어
// "설계개발 기본정보에 맞지 않아 보인다"는 지적을 받았다. 신청서 작성용 입력은 이 화면으로
// 옮기고, 공급업체·설비·기술문서처럼 원래 자기 화면이 있는 자료는 그 화면의 입력을 그대로
// 유지한 채 여기서는 자동으로 모아서(긁어와서) 보여주기만 한다.
import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileCheck2, Package, Truck, Wrench, FolderOpen,
  Plus, ChevronRight, CheckCircle2, Circle,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import CertGate from '../../components/CertGate'
import { auth } from '../../lib/auth'
import { permissions, requirePermission } from '../../lib/permissions'
import { onboarding, productKeyOf } from '../../lib/onboardingState'
import { productDocs, TECH_DOC_CATEGORY } from '../../lib/productDocsState'

const TABS = [
  { key: 'apply', label: '신청정보', icon: FileCheck2 },
  { key: 'tech', label: '제품 기술문서', icon: Package },
  { key: 'supplier', label: '공급업체 현황', icon: Truck },
  { key: 'equipment', label: '설비 현황', icon: Wrench },
  { key: 'techdocs', label: '기술문서 심사자료 현황', icon: FolderOpen },
]

function Field({ label, value, onChange, placeholder, type = 'text', className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>{label}</span>
      <input
        type={type}
        className="input-base w-full"
        value={value || ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

function ChipMultiField({ label, value, onChange, options }) {
  const list = Array.isArray(value) ? value : []
  const toggle = (opt) => onChange(list.includes(opt) ? list.filter((v) => v !== opt) : [...list, opt])
  return (
    <div>
      <span className="block text-[11.5px] font-medium mb-1.5" style={{ color: 'var(--ink-mute)' }}>{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = list.includes(opt)
          return (
            <button key={opt} type="button" onClick={() => toggle(opt)}
              className="px-2.5 py-1 rounded-full text-[11.5px] font-medium transition"
              style={{
                border: active ? '1px solid var(--moss)' : '1px solid var(--line)',
                background: active ? 'var(--leaf-soft)' : 'transparent',
                color: active ? 'var(--moss)' : 'var(--ink-mute)',
              }}>
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function GmpApplicationHub() {
  const user = auth.current()
  const nav = useNavigate()
  const [tab, setTab] = useState('apply')

  return (
    <AppLayout user={user} title="GMP 신청" subtitle="GMP 적합인정 심사 신청서·기술문서등심사의뢰서 작성 준비 자료를 한 화면에서 관리합니다.">
      <CertGate certId="kgmp" label="KGMP">
        <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto fade-in">
          <div className="mb-5">
            <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--moss)' }}>
              GMP APPLICATION PREPARATION
            </span>
            <div className="font-display text-[26px] mt-1" style={{ color: 'var(--ink)', fontWeight: 500 }}>GMP 신청</div>
            <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>
              GMP 접수양식·의료기기기술문서등심사의뢰서 작성에 필요한 신청정보·제품 기술문서를 여기서 직접 입력하고,
              공급업체·설비·기술문서 자료는 각 담당 화면의 최신 등록 내용을 자동으로 모아 보여줍니다.
            </div>
          </div>

          <div className="flex gap-1.5 mb-5 flex-wrap">
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-medium transition"
                style={{
                  background: tab === t.key ? 'var(--bg-card)' : 'transparent',
                  color: tab === t.key ? 'var(--moss)' : 'var(--ink-soft)',
                  boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                }}>
                <t.icon size={14} /> {t.label}
              </button>
            ))}
          </div>

          {tab === 'apply' && <ApplyInfoTab />}
          {tab === 'tech' && <TechDocTab />}
          {tab === 'supplier' && <SupplierSummaryTab nav={nav} />}
          {tab === 'equipment' && <EquipmentSummaryTab nav={nav} />}
          {tab === 'techdocs' && <TechDocsCoverageTab nav={nav} />}
        </div>
      </CertGate>
    </AppLayout>
  )
}

/* ================================================================
   신청정보 — GMP 접수양식 상단 행정정보 (심사구분·현장조사희망일·접수정보)
   원래 기본정보(기업정보) 화면에 있었으나 "설계개발/기업정보에 맞지 않는다"는 지적에 따라 이관.
   ================================================================ */
function ApplyInfoTab() {
  const canEdit = permissions.can('onb.company.edit')
  const ob = onboarding.load()
  const company = ob.company || {}
  const [form, setForm] = useState({
    gmpExamTypes: [], gmpDetailTypes: [], gmpSiteVisitDate: '', gmpRiskSite: false,
    gmpSubmitContactName: '', gmpSubmitContactPhone: '', gmpInvoiceEmail: '', gmpSubmitContactEmail: '',
    ...company,
  })
  const [saved, setSaved] = useState(false)
  const setF = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setSaved(false) }

  const save = () => {
    if (!requirePermission('onb.company.edit')) return
    onboarding.updateCompany(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2400)
  }

  return (
    <div className="card-base p-4 space-y-4 max-w-[720px]">
      <div>
        <div className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>GMP 심사 신청 정보</div>
        <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
          GMP 적합성인정 심사 신청서(7-4. GMP 접수양식) 상단 행정정보입니다 — 신청서 작성 시 그대로 사용됩니다.
        </div>
      </div>
      <div className="space-y-3">
        <ChipMultiField label="심사구분 (해당 항목 모두 선택)" value={form.gmpExamTypes} onChange={(v) => setF('gmpExamTypes', v)}
          options={['최초심사', '정기심사', '변경심사', '추가심사']} />
        <ChipMultiField label="특이유형 (해당 시)" value={form.gmpDetailTypes} onChange={(v) => setF('gmpDetailTypes', v)}
          options={['1등급', '임상시험용', '수출용', '융복합', '공동심사프로그램', '우수제조소']} />
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="현장조사 희망일" type="date" value={form.gmpSiteVisitDate} onChange={(v) => setF('gmpSiteVisitDate', v)} />
          <label className="flex items-center gap-2 text-[12.5px] mt-5 cursor-pointer" style={{ color: 'var(--ink)' }}>
            <input type="checkbox" checked={!!form.gmpRiskSite} onChange={(e) => setF('gmpRiskSite', e.target.checked)} />
            위해우려제조소 해당
          </label>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="접수 담당자 성명" value={form.gmpSubmitContactName} onChange={(v) => setF('gmpSubmitContactName', v)} />
          <Field label="접수 담당자 연락처" value={form.gmpSubmitContactPhone} onChange={(v) => setF('gmpSubmitContactPhone', v)} placeholder="010-0000-0000" />
          <Field label="계산서 발행 이메일" type="email" value={form.gmpInvoiceEmail} onChange={(v) => setF('gmpInvoiceEmail', v)} />
          <Field label="접수 담당자 이메일" type="email" value={form.gmpSubmitContactEmail} onChange={(v) => setF('gmpSubmitContactEmail', v)} />
        </div>
      </div>
      {canEdit ? (
        <div className="flex items-center gap-3 pt-2" style={{ borderTop: '1px solid var(--line)' }}>
          <button onClick={save} className="btn-primary text-[12.5px]">저장</button>
          {saved && <span className="text-[12px]" style={{ color: 'var(--moss)' }}>✓ 저장되었습니다</span>}
        </div>
      ) : (
        <div className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>정보 변경은 매니저·RA 권한이 필요합니다.</div>
      )}
    </div>
  )
}

/* ================================================================
   제품 기술문서 — 기술문서등심사의뢰서 신청내용(제품 기술설명) + 비교자료
   원래 제품·공정(설계개발) 제품상세 화면에 있었으나 위와 같은 이유로 이관.
   ================================================================ */
function TechDocTab() {
  const canEdit = permissions.can('onb.product.edit')
  const ob = onboarding.load()
  const products = ob.products || []
  const [selId, setSelId] = useState(products[0]?.id || null)
  const [tick, setTick] = useState(0)
  const refresh = () => setTick((x) => x + 1)

  const product = useMemo(() => (onboarding.load().products || []).find((p) => p.id === selId) || null, [selId, tick])

  if (products.length === 0) {
    return (
      <div className="card-base p-10 text-center text-[13px]" style={{ color: 'var(--ink-mute)', borderStyle: 'dashed' }}>
        등록된 제품이 없습니다. 제품·공정 화면에서 제품을 먼저 등록하세요.
      </div>
    )
  }

  return (
    <div className="grid md:grid-cols-[220px_1fr] gap-4">
      <div className="card-base p-2 space-y-0.5 h-fit">
        {products.map((p) => (
          <button key={p.id} onClick={() => setSelId(p.id)}
            className="w-full text-left px-3 py-2 rounded-lg text-[12.5px] transition"
            style={{
              background: selId === p.id ? 'var(--leaf-soft)' : 'transparent',
              color: selId === p.id ? 'var(--moss)' : 'var(--ink)',
              fontWeight: selId === p.id ? 600 : 400,
            }}>
            {p.itemName || p.name || '(품목명 미입력)'}
          </button>
        ))}
      </div>
      {product && <TechDocForm key={product.id} product={product} canEdit={canEdit} onSaved={refresh} />}
    </div>
  )
}

function TechDocForm({ product, canEdit, onSaved }) {
  const [draft, setDraft] = useState({
    techShape: '', techRawMaterial: '', techMfgMethod: '', techUsageMethod: '',
    techUsageWarning: '', techStorage: '', techUsagePeriod: '',
    compareRecords: [],
    ...product,
  })
  const [saved, setSaved] = useState(false)
  const setF = (k, v) => { setDraft((d) => ({ ...d, [k]: v })); setSaved(false) }

  const addCompareRow = () => setDraft((d) => ({ ...d, compareRecords: [...(d.compareRecords || []), { name: '', licenseNo: '', similarity: '', difference: '' }] }))
  const updCompareRow = (i, k, v) => setDraft((d) => {
    const rows = [...(d.compareRecords || [])]
    rows[i] = { ...rows[i], [k]: v }
    return { ...d, compareRecords: rows }
  })
  const delCompareRow = (i) => setDraft((d) => {
    const rows = [...(d.compareRecords || [])]
    rows.splice(i, 1)
    return { ...d, compareRecords: rows }
  })

  const save = () => {
    if (!requirePermission('onb.product.edit')) return
    const ob = onboarding.load()
    const nextProducts = (ob.products || []).map((p) => (p.id === product.id ? { ...p, ...draft } : p))
    onboarding.save({ ...ob, products: nextProducts })
    setSaved(true)
    onSaved && onSaved()
    setTimeout(() => setSaved(false), 2400)
  }

  return (
    <div className="card-base p-4 space-y-4">
      <div>
        <div className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>{product.itemName || product.name}</div>
        <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
          기술문서등심사의뢰서 신청내용(4-1) — 최초 기술문서 심사 시 그대로 옮겨 사용할 수 있습니다.
        </div>
      </div>
      <div className="grid gap-3">
        <TextArea label="모양 및 구조 (외형·작용원리·치수·특성)" value={draft.techShape} onChange={(v) => setF('techShape', v)} canEdit={canEdit} />
        <TextArea label="원재료" value={draft.techRawMaterial} onChange={(v) => setF('techRawMaterial', v)} canEdit={canEdit} />
        <TextArea label="제조방법" value={draft.techMfgMethod} onChange={(v) => setF('techMfgMethod', v)} canEdit={canEdit} />
        <TextArea label="사용방법" value={draft.techUsageMethod} onChange={(v) => setF('techUsageMethod', v)} canEdit={canEdit} />
        <TextArea label="사용시 주의사항" value={draft.techUsageWarning} onChange={(v) => setF('techUsageWarning', v)} canEdit={canEdit} />
        <div className="grid sm:grid-cols-2 gap-3">
          {canEdit ? (
            <>
              <Field label="저장방법" value={draft.techStorage} onChange={(v) => setF('techStorage', v)} />
              <Field label="사용기한" value={draft.techUsagePeriod} onChange={(v) => setF('techUsagePeriod', v)} placeholder="예: 제조일로부터 3년" />
            </>
          ) : (
            <>
              <ReadRow label="저장방법" value={draft.techStorage} />
              <ReadRow label="사용기한" value={draft.techUsagePeriod} />
            </>
          )}
        </div>
      </div>

      <div className="pt-3" style={{ borderTop: '1px dashed var(--line)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[12.5px] font-semibold" style={{ color: 'var(--ink)' }}>이미 허가·인증받은 제품과 비교한 자료 (기술문서심사 필수항목)</div>
          {canEdit && (
            <button type="button" onClick={addCompareRow} className="btn-ghost text-[11.5px]"><Plus size={11} /> 비교 항목 추가</button>
          )}
        </div>
        <div className="space-y-2">
          {(draft.compareRecords || []).map((c, i) => (
            <div key={i} className="p-2.5 rounded-lg space-y-1.5" style={{ background: 'var(--bg-soft)' }}>
              {canEdit ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <input className="input-base text-[12.5px]" placeholder="비교대상 제품명" value={c.name} onChange={(e) => updCompareRow(i, 'name', e.target.value)} />
                    <input className="input-base text-[12.5px]" placeholder="허가번호" value={c.licenseNo} onChange={(e) => updCompareRow(i, 'licenseNo', e.target.value)} />
                  </div>
                  <input className="input-base text-[12.5px] w-full" placeholder="유사점" value={c.similarity} onChange={(e) => updCompareRow(i, 'similarity', e.target.value)} />
                  <input className="input-base text-[12.5px] w-full" placeholder="차이점" value={c.difference} onChange={(e) => updCompareRow(i, 'difference', e.target.value)} />
                  <button type="button" onClick={() => delCompareRow(i)} className="text-[11px]" style={{ color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer' }}>삭제</button>
                </>
              ) : (
                <div className="text-[12.5px]" style={{ color: 'var(--ink)' }}>
                  {c.name} {c.licenseNo && `· ${c.licenseNo}`} {c.similarity && `· 유사점: ${c.similarity}`} {c.difference && `· 차이점: ${c.difference}`}
                </div>
              )}
            </div>
          ))}
          {(draft.compareRecords || []).length === 0 && (
            <div className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>등록된 비교 항목이 없습니다.</div>
          )}
        </div>
      </div>

      {canEdit ? (
        <div className="flex items-center gap-3 pt-2" style={{ borderTop: '1px solid var(--line)' }}>
          <button onClick={save} className="btn-primary text-[12.5px]">저장</button>
          {saved && <span className="text-[12px]" style={{ color: 'var(--moss)' }}>✓ 저장되었습니다</span>}
        </div>
      ) : (
        <div className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>정보 변경은 매니저·RA 권한이 필요합니다.</div>
      )}
    </div>
  )
}

function TextArea({ label, value, onChange, canEdit }) {
  if (!canEdit) return <ReadRow label={label} value={value} multiline />
  return (
    <label className="block">
      <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>{label}</span>
      <textarea className="input-base w-full" style={{ minHeight: 64 }} value={value || ''} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

function ReadRow({ label, value, multiline }) {
  return (
    <div>
      <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>{label}</span>
      <div className="text-[13px]" style={{ color: value ? 'var(--ink)' : 'var(--ink-faint)', whiteSpace: multiline ? 'pre-line' : 'normal' }}>
        {value || '미입력'}
      </div>
    </div>
  )
}

/* ================================================================
   공급업체 현황 — 공급업체 관리(SupplierHub)에 이미 등록된 국가·관련활동을 자동 집계
   ================================================================ */
function SupplierSummaryTab({ nav }) {
  const suppliers = useMemo(() => {
    try { const p = JSON.parse(localStorage.getItem('qualytree.suppliers') || 'null'); return Array.isArray(p) ? p : [] } catch { return [] }
  }, [])

  return (
    <div className="card-base p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>주요 공급업체 (GMP 접수양식 2-바-1·2)</div>
          <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>공급업체 관리 화면에 등록된 내용이 자동으로 표시됩니다. 국가·관련공정 수정은 공급업체 관리에서 하세요.</div>
        </div>
        <button onClick={() => nav('/supplier')} className="btn-ghost text-[12px] inline-flex items-center gap-1 shrink-0">
          공급업체 관리로 이동 <ChevronRight size={13} />
        </button>
      </div>
      {suppliers.length === 0 ? (
        <div className="text-[12.5px] py-8 text-center" style={{ color: 'var(--ink-faint)' }}>등록된 공급업체가 없습니다.</div>
      ) : (
        <div className="space-y-2">
          {suppliers.map((s) => (
            <div key={s.id || s.name} className="p-3 rounded-lg flex items-center gap-3 flex-wrap" style={{ background: 'var(--bg-soft)' }}>
              <div className="font-medium text-[13px] flex-1 min-w-[140px]" style={{ color: 'var(--ink)' }}>{s.name}</div>
              <span className="text-[11.5px] px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-card)', color: 'var(--ink-mute)' }}>{s.country || '대한민국'}</span>
              {(s.scopeTags || []).map((t) => (
                <span key={t} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'var(--leaf-soft)', color: 'var(--moss)' }}>{t}</span>
              ))}
              {(s.scopeTags || []).length === 0 && <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>관련 공정/자재 미입력</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ================================================================
   설비 현황 — 설비·교정(EquipmentHub)에 등록된 구분·적용활동을 자동 집계
   ================================================================ */
function EquipmentSummaryTab({ nav }) {
  const instruments = useMemo(() => {
    try { const p = JSON.parse(localStorage.getItem('qms_eqp_instruments') || 'null'); return Array.isArray(p) ? p : [] } catch { return [] }
  }, [])

  return (
    <div className="card-base p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>시설·장비 목록 (GMP 접수양식 2-다-1-2)</div>
          <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>설비·교정 화면에 등록된 내용이 자동으로 표시됩니다. 구분·적용활동 수정은 설비·교정에서 하세요.</div>
        </div>
        <button onClick={() => nav('/equipment')} className="btn-ghost text-[12px] inline-flex items-center gap-1 shrink-0">
          설비·교정으로 이동 <ChevronRight size={13} />
        </button>
      </div>
      {instruments.length === 0 ? (
        <div className="text-[12.5px] py-8 text-center" style={{ color: 'var(--ink-faint)' }}>등록된 설비가 없습니다.</div>
      ) : (
        <div className="space-y-2">
          {instruments.map((i) => (
            <div key={i.id} className="p-3 rounded-lg flex items-center gap-3 flex-wrap" style={{ background: 'var(--bg-soft)' }}>
              <div className="font-medium text-[13px] flex-1 min-w-[140px]" style={{ color: 'var(--ink)' }}>{i.name}</div>
              <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: i.kind === '측정장비' ? '#DBEAFE' : 'var(--bg-card)', color: i.kind === '측정장비' ? '#1D4ED8' : 'var(--ink-mute)' }}>{i.kind || '제조설비'}</span>
              <span className="text-[12px]" style={{ color: i.application ? 'var(--ink-mute)' : 'var(--ink-faint)' }}>{i.application || '적용활동 미입력'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ================================================================
   기술문서 심사자료 현황 — 제품별 DHF 기술문서 탭에 첨부된 카테고리 커버리지
   ================================================================ */
function TechDocsCoverageTab({ nav }) {
  const ob = onboarding.load()
  const products = ob.products || []
  const categories = Object.values(TECH_DOC_CATEGORY)

  return (
    <div className="card-base p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>기술문서 심사자료 현황</div>
          <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>설계·개발 DHF 기술문서 탭에 등록된 자료를 제품별로 모아 보여줍니다. 자료 등록·수정은 DHF에서 하세요.</div>
        </div>
        <button onClick={() => nav('/design-history?tab=techdocs')} className="btn-ghost text-[12px] inline-flex items-center gap-1 shrink-0">
          DHF 기술문서로 이동 <ChevronRight size={13} />
        </button>
      </div>
      {products.length === 0 ? (
        <div className="text-[12.5px] py-8 text-center" style={{ color: 'var(--ink-faint)' }}>등록된 제품이 없습니다.</div>
      ) : (
        <div className="space-y-3">
          {products.map((p) => {
            const key = productKeyOf(p)
            const docs = productDocs.getTechDocs(key)
            const haveCats = new Set(docs.map((d) => d.category))
            const doneCount = categories.filter((c) => haveCats.has(c)).length
            return (
              <div key={p.id} className="p-3 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-[13px]" style={{ color: 'var(--ink)' }}>{p.itemName || p.name}</div>
                  <span className="text-[11.5px] font-semibold" style={{ color: 'var(--ink-mute)' }}>{doneCount}/{categories.length} 카테고리</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((c) => {
                    const has = haveCats.has(c)
                    return (
                      <span key={c} className="inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-full"
                        style={{ background: has ? 'var(--leaf-soft)' : 'var(--bg-card)', color: has ? 'var(--moss)' : 'var(--ink-faint)' }}>
                        {has ? <CheckCircle2 size={10} /> : <Circle size={10} />} {c}
                      </span>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
