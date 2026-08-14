// src/pages/gmp-application/GmpApplicationHub.jsx
// GMP 신청 — GMP 적합인정 심사 신청서(7-4. GMP 접수양식)·기술문서등심사의뢰서 작성에 필요한
// 자료를 한 화면에서 준비.
//
// (#33-40) 이전에는 이 자료들이 설계개발(제품상세)·기본정보(기업정보) 화면에 흩어져 있어
// "설계개발 기본정보에 맞지 않아 보인다"는 지적을 받아 이 화면으로 이관했다.
//
// (260807 2차 피드백 #3-15) 이후 재검토 결과 다음 문제가 확인되어 이번에 함께 정리한다:
//  - #3 과거에 낸 신청 이력을 볼 수가 없었음 → 신청정보 탭에 "신청 이력"(스냅샷 저장/목록) 추가.
//  - #4/#8 "제품 기술문서" 탭이 실은 GMP 적합인정 심사신청서(이 화면의 본래 목적)가 아니라
//    별도 서류인 "의료기기기술문서등심사의뢰서"의 신청내용이어서 GMP신청 내용과 뒤섞여 있었음
//    → 탭을 "기술문서 심사자료(별도 신청서)"로 명확히 구분 표시하고, GMP 적합인정 심사신청서
//    2-가-4 항목인 "제조되는 의료기기" 목록(품목군·품목명·등급·허가번호)을 신청정보 탭에 추가.
//  - #6/#7 공급업체·설비현황은 제조GMP는 공급업체관리·설비관리에서 자동으로 긁어오면 되지만,
//    수입GMP는 자체 제조설비·국내 공급업체가 없는 경우가 많아 직접입력 방식이 필요함
//    → CertGate를 kgmp/kgmp_importer 양쪽에 열고, 수입GMP 인증만 선택된 회사는 직접입력 모드를
//    기본값으로 제공(전환 가능).
//  - #9-14 GMP 접수양식 첨부서류 중 이 화면에 노출되지 않았던 항목(품질문서관리개요 별표2,
//    적합선언문, 평면도, 구비서류명 정리, 품질경영시스템 상호관계, 제조소 총괄표)을
//    "첨부서류 체크리스트" 탭으로 신설.
import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileCheck2, Package, Truck, Wrench, FolderOpen, ClipboardList,
  Plus, ChevronRight, CheckCircle2, Circle, History, Info, Trash2,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import CertGate from '../../components/CertGate'
import { auth } from '../../lib/auth'
import { permissions, requirePermission } from '../../lib/permissions'
import { onboarding, productKeyOf } from '../../lib/onboardingState'
import { productDocs, TECH_DOC_CATEGORY } from '../../lib/productDocsState'
import { getKgmpStatus } from '../../lib/kgmpProgress'
import { foreignSites } from '../../lib/foreignManufacturerState'
import { FOREIGN_DOC_SLOTS } from '../importgmp/ForeignManufacturerHub'

const TABS = [
  { key: 'apply', label: '신청정보', icon: FileCheck2 },
  { key: 'tech', label: '기술문서 심사자료(별도 신청서)', icon: Package },
  { key: 'supplier', label: '공급업체 현황', icon: Truck },
  { key: 'equipment', label: '설비 현황', icon: Wrench },
  { key: 'attachments', label: '첨부서류 체크리스트', icon: ClipboardList },
  { key: 'techdocs', label: '기술문서 심사자료 현황', icon: FolderOpen },
]

function isImporterOnly() {
  const certs = onboarding.load().certs || {}
  return !!certs.kgmp_importer && !certs.kgmp
}

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
      {/* #6/#7 — 제조GMP(kgmp) 또는 수입GMP(kgmp_importer) 인증을 하나라도 선택했으면 접근 가능 */}
      <CertGate certId={['kgmp', 'kgmp_importer']} label="KGMP·수입 GMP">
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

          {tab === 'apply' && <ApplyInfoTab nav={nav} />}
          {tab === 'tech' && <TechDocTab />}
          {tab === 'supplier' && <SupplierSummaryTab nav={nav} />}
          {tab === 'equipment' && <EquipmentSummaryTab nav={nav} />}
          {tab === 'attachments' && <AttachmentsTab nav={nav} />}
          {tab === 'techdocs' && <TechDocsCoverageTab nav={nav} />}
        </div>
      </CertGate>
    </AppLayout>
  )
}

/* ================================================================
   신청 이력 (#3) — localStorage 스냅샷 저장소
   ================================================================ */
const HISTORY_KEY = 'qualytree.gmpApplicationHistory'
function loadHistory() {
  try { const l = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); return Array.isArray(l) ? l : [] } catch { return [] }
}
function saveHistory(list) { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)) }

/* ================================================================
   신청정보 — GMP 접수양식 상단 행정정보 (심사구분·현장조사희망일·접수정보)
   + #3 신청 이력 + #4 제조되는 의료기기(2-가-4) 목록
   ================================================================ */
function ApplyInfoTab({ nav }) {
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
  const [history, setHistory] = useState(loadHistory)

  const save = () => {
    if (!requirePermission('onb.company.edit')) return
    onboarding.updateCompany(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2400)
  }

  // #3 — 현재 작성된 신청정보를 "신청 이력"에 스냅샷으로 남긴다. 실제 접수일·접수번호는
  // 추후 KTL 접수 후 알 수 있으므로 등록 후 편집 가능하게 둔다.
  const registerApplication = () => {
    if (!requirePermission('onb.company.edit')) return
    const entry = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      examTypes: form.gmpExamTypes || [],
      detailTypes: form.gmpDetailTypes || [],
      siteVisitDate: form.gmpSiteVisitDate || '',
      receiptNo: '', receiptDate: '', status: '접수대기',
    }
    const list = [entry, ...history]
    setHistory(list); saveHistory(list)
  }

  const updateHistoryEntry = (id, patch) => {
    const list = history.map((h) => (h.id === id ? { ...h, ...patch } : h))
    setHistory(list); saveHistory(list)
  }
  const deleteHistoryEntry = (id) => {
    if (!window.confirm('이 신청 이력을 삭제할까요?')) return
    const list = history.filter((h) => h.id !== id)
    setHistory(list); saveHistory(list)
  }

  // #4 — GMP 접수양식 2-가-4 "제조되는 의료기기" 목록: 인허가(RegulatoryHub)에 등록된 허가완료
  // 품목을 그대로 끌어와 보여준다. 여기서 직접 입력하지 않는 이유는 인허가 화면이 이미
  // 품목군·품목명·등급·허가번호의 단일 출처(SSoT)이기 때문 — 중복 입력을 막기 위함.
  const licensedProducts = useMemo(() => {
    try {
      const list = JSON.parse(localStorage.getItem('qualytree.gmp_applications') || '[]')
      return (Array.isArray(list) ? list : []).filter((p) => !!p.licenseNo)
    } catch { return [] }
  }, [])

  return (
    <div className="space-y-5">
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
          <div className="flex items-center gap-3 pt-2 flex-wrap" style={{ borderTop: '1px solid var(--line)' }}>
            <button onClick={save} className="btn-primary text-[12.5px]">저장</button>
            <button onClick={registerApplication} className="btn-ghost text-[12.5px] inline-flex items-center gap-1.5">
              <History size={13} /> 이 내용으로 신청 이력 등록
            </button>
            {saved && <span className="text-[12px]" style={{ color: 'var(--moss)' }}>✓ 저장되었습니다</span>}
          </div>
        ) : (
          <div className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>정보 변경은 매니저·RA 권한이 필요합니다.</div>
        )}
      </div>

      {/* #3 — 신청 이력 */}
      <div className="card-base p-4">
        <div className="text-[13.5px] font-semibold mb-1" style={{ color: 'var(--ink)' }}>신청 이력</div>
        <div className="text-[11.5px] mb-3" style={{ color: 'var(--ink-faint)' }}>
          과거에 접수한(또는 접수 예정인) GMP 심사 신청 건 목록입니다. 접수 후 접수번호·접수일·상태를 업데이트하세요.
        </div>
        {history.length === 0 ? (
          <div className="text-[12.5px] py-6 text-center" style={{ color: 'var(--ink-faint)' }}>등록된 신청 이력이 없습니다.</div>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="p-3 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                  <div className="text-[12.5px] font-medium" style={{ color: 'var(--ink)' }}>
                    {new Date(h.createdAt).toLocaleDateString('ko-KR')} 등록 · {(h.examTypes || []).join(', ') || '심사구분 미지정'}
                  </div>
                  <div className="flex items-center gap-2">
                    <select className="input-base text-[11.5px] py-1" value={h.status} onChange={(e) => updateHistoryEntry(h.id, { status: e.target.value })}>
                      {['접수대기', '접수완료', '심사중', '보완요청', '승인완료', '반려'].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button onClick={() => deleteHistoryEntry(h.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626' }}><Trash2 size={13} /></button>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  <input className="input-base text-[11.5px]" placeholder="접수번호" value={h.receiptNo} onChange={(e) => updateHistoryEntry(h.id, { receiptNo: e.target.value })} />
                  <input type="date" className="input-base text-[11.5px]" value={h.receiptDate} onChange={(e) => updateHistoryEntry(h.id, { receiptDate: e.target.value })} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* #4 — 제조되는 의료기기(2-가-4) */}
      <div className="card-base p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>제조되는 의료기기 (GMP 접수양식 2-가-4)</div>
          <button onClick={() => nav('/regulatory')} className="btn-ghost text-[12px] inline-flex items-center gap-1 shrink-0">
            인허가로 이동 <ChevronRight size={13} />
          </button>
        </div>
        <div className="text-[11.5px] mb-3" style={{ color: 'var(--ink-faint)' }}>
          인허가에서 허가 완료된 품목이 자동으로 표시됩니다. 품목군·품목명·등급·허가번호 수정은 인허가 화면에서 하세요.
        </div>
        {licensedProducts.length === 0 ? (
          <div className="text-[12.5px] py-6 text-center" style={{ color: 'var(--ink-faint)' }}>허가 완료된 품목이 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  {['품목군', '품목명', '등급', '허가번호', '구분'].map((h) => (
                    <th key={h} className="text-left py-1.5 pr-3 font-medium" style={{ color: 'var(--ink-mute)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {licensedProducts.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td className="py-1.5 pr-3" style={{ color: 'var(--ink)' }}>{p.categoryName || '-'}</td>
                    <td className="py-1.5 pr-3 font-medium" style={{ color: 'var(--ink)' }}>{p.productName}</td>
                    <td className="py-1.5 pr-3" style={{ color: 'var(--ink-mute)' }}>{p.grade ? p.grade + '등급' : '-'}</td>
                    <td className="py-1.5 pr-3" style={{ color: 'var(--ink-mute)' }}>{p.licenseNo}</td>
                    <td className="py-1.5 pr-3" style={{ color: 'var(--ink-mute)' }}>{p.isImport ? '수입' : '제조'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

/* ================================================================
   기술문서 심사자료(별도 신청서) — 기술문서등심사의뢰서 신청내용(제품 기술설명) + 비교자료
   #8 — 이 자료는 GMP 적합인정 심사신청서와는 별개로 KTL에 제출하는
   "의료기기기술문서등심사의뢰서"에 들어가는 내용이라는 점을 명확히 안내한다.
   ================================================================ */
function TechDocTab() {
  const canEdit = permissions.can('onb.product.edit')
  const ob = onboarding.load()
  const products = ob.products || []
  const [selId, setSelId] = useState(products[0]?.id || null)
  const [tick, setTick] = useState(0)
  const refresh = () => setTick((x) => x + 1)

  const product = useMemo(() => (onboarding.load().products || []).find((p) => p.id === selId) || null, [selId, tick])

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-lg flex items-start gap-2 text-[12px]" style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400e' }}>
        <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        이 탭의 내용은 GMP 적합인정 심사신청서(접수양식)가 아니라, 별도로 제출하는
        <b>&nbsp;의료기기기술문서등심사의뢰서&nbsp;</b>의 "신청내용"입니다. GMP 신청과 기술문서 심사는
        서로 다른 신청 건이며, 여기서 작성한 내용은 기술문서 심사 신청 시 그대로 옮겨 사용합니다.
      </div>
      {products.length === 0 ? (
        <div className="card-base p-10 text-center text-[13px]" style={{ color: 'var(--ink-mute)', borderStyle: 'dashed' }}>
          등록된 제품이 없습니다. 제품·공정 화면에서 제품을 먼저 등록하세요.
        </div>
      ) : (
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
      )}
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
          인허가(RegulatoryHub)의 필요서류목록 중 모양및구조·사용방법·사용시주의사항 관련 항목을 작성할 때도
          이 내용을 그대로 복사해 쓸 수 있습니다.
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
   #6 공급업체 현황 — 제조GMP는 공급업체 관리(SupplierHub)에서 자동 집계,
   수입GMP는 국내 공급업체가 없는 경우가 많아 직접입력 모드를 함께 제공한다.
   ================================================================ */
const MANUAL_SUPPLIER_KEY = 'qualytree.gmpApplication.manualSuppliers'
function loadManualSuppliers() { try { const l = JSON.parse(localStorage.getItem(MANUAL_SUPPLIER_KEY) || '[]'); return Array.isArray(l) ? l : [] } catch { return [] } }
function saveManualSuppliers(l) { localStorage.setItem(MANUAL_SUPPLIER_KEY, JSON.stringify(l)) }

function SupplierSummaryTab({ nav }) {
  const [mode, setMode] = useState(isImporterOnly() ? 'manual' : 'auto')
  const suppliers = useMemo(() => {
    try { const p = JSON.parse(localStorage.getItem('qualytree.suppliers') || 'null'); return Array.isArray(p) ? p : [] } catch { return [] }
  }, [])
  const [manual, setManual] = useState(loadManualSuppliers)
  const addManual = () => { const l = [...manual, { id: Date.now(), name: '', country: '대한민국', scope: '' }]; setManual(l); saveManualSuppliers(l) }
  const updManual = (id, patch) => { const l = manual.map((s) => (s.id === id ? { ...s, ...patch } : s)); setManual(l); saveManualSuppliers(l) }
  const delManual = (id) => { const l = manual.filter((s) => s.id !== id); setManual(l); saveManualSuppliers(l) }

  return (
    <div className="card-base p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <div className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>주요 공급업체 (GMP 접수양식 2-바-1·2)</div>
          <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
            {mode === 'auto'
              ? '공급업체 관리 화면에 등록된 내용이 자동으로 표시됩니다. 국가·관련공정 수정은 공급업체 관리에서 하세요.'
              : '수입GMP처럼 국내 공급업체 관리에 등록하기 애매한 거래처(해외 부자재 공급처 등)를 이 화면에서 직접 입력합니다.'}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
            {[{ k: 'auto', l: '자동 연동' }, { k: 'manual', l: '직접 입력' }].map((m) => (
              <button key={m.k} onClick={() => setMode(m.k)}
                className="px-2.5 py-1 rounded-md text-[11.5px] font-medium"
                style={{ background: mode === m.k ? 'var(--bg-card)' : 'transparent', color: mode === m.k ? 'var(--moss)' : 'var(--ink-mute)' }}>
                {m.l}
              </button>
            ))}
          </div>
          {mode === 'auto' && (
            <button onClick={() => nav('/supplier')} className="btn-ghost text-[12px] inline-flex items-center gap-1 shrink-0">
              공급업체 관리로 이동 <ChevronRight size={13} />
            </button>
          )}
        </div>
      </div>

      {mode === 'auto' ? (
        suppliers.length === 0 ? (
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
        )
      ) : (
        <div className="space-y-2">
          {manual.map((s) => (
            <div key={s.id} className="p-2.5 rounded-lg grid sm:grid-cols-[1fr_140px_1fr_auto] gap-2 items-center" style={{ background: 'var(--bg-soft)' }}>
              <input className="input-base text-[12.5px]" placeholder="업소명" value={s.name} onChange={(e) => updManual(s.id, { name: e.target.value })} />
              <input className="input-base text-[12.5px]" placeholder="국가" value={s.country} onChange={(e) => updManual(s.id, { country: e.target.value })} />
              <input className="input-base text-[12.5px]" placeholder="관련 공정/자재" value={s.scope} onChange={(e) => updManual(s.id, { scope: e.target.value })} />
              <button onClick={() => delManual(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626' }}><Trash2 size={14} /></button>
            </div>
          ))}
          <button onClick={addManual} className="btn-ghost text-[11.5px] inline-flex items-center gap-1"><Plus size={12} /> 공급업체 추가</button>
        </div>
      )}
    </div>
  )
}

/* ================================================================
   #7 설비 현황 — 제조GMP는 설비·교정(EquipmentHub)에서 자동 집계,
   수입GMP는 자체 제조설비가 없는 경우가 많아(보관창고 등) 직접입력 모드를 함께 제공한다.
   ================================================================ */
const MANUAL_EQUIPMENT_KEY = 'qualytree.gmpApplication.manualEquipment'
function loadManualEquipment() { try { const l = JSON.parse(localStorage.getItem(MANUAL_EQUIPMENT_KEY) || '[]'); return Array.isArray(l) ? l : [] } catch { return [] } }
function saveManualEquipment(l) { localStorage.setItem(MANUAL_EQUIPMENT_KEY, JSON.stringify(l)) }

function EquipmentSummaryTab({ nav }) {
  const [mode, setMode] = useState(isImporterOnly() ? 'manual' : 'auto')
  const instruments = useMemo(() => {
    try { const p = JSON.parse(localStorage.getItem('qms_eqp_instruments') || 'null'); return Array.isArray(p) ? p : [] } catch { return [] }
  }, [])
  const [manual, setManual] = useState(loadManualEquipment)
  const addManual = () => { const l = [...manual, { id: Date.now(), name: '', kind: '보관설비', application: '' }]; setManual(l); saveManualEquipment(l) }
  const updManual = (id, patch) => { const l = manual.map((s) => (s.id === id ? { ...s, ...patch } : s)); setManual(l); saveManualEquipment(l) }
  const delManual = (id) => { const l = manual.filter((s) => s.id !== id); setManual(l); saveManualEquipment(l) }

  return (
    <div className="card-base p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <div className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>시설·장비 목록 (GMP 접수양식 2-다-1-2)</div>
          <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
            {mode === 'auto'
              ? '설비·교정 화면에 등록된 내용이 자동으로 표시됩니다. 구분·적용활동 수정은 설비·교정에서 하세요.'
              : '수입GMP처럼 제조설비 대신 보관창고·온습도관리 설비 등을 관리하는 경우 이 화면에서 직접 입력합니다.'}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
            {[{ k: 'auto', l: '자동 연동' }, { k: 'manual', l: '직접 입력' }].map((m) => (
              <button key={m.k} onClick={() => setMode(m.k)}
                className="px-2.5 py-1 rounded-md text-[11.5px] font-medium"
                style={{ background: mode === m.k ? 'var(--bg-card)' : 'transparent', color: mode === m.k ? 'var(--moss)' : 'var(--ink-mute)' }}>
                {m.l}
              </button>
            ))}
          </div>
          {mode === 'auto' && (
            <button onClick={() => nav('/equipment')} className="btn-ghost text-[12px] inline-flex items-center gap-1 shrink-0">
              설비·교정으로 이동 <ChevronRight size={13} />
            </button>
          )}
        </div>
      </div>

      {mode === 'auto' ? (
        instruments.length === 0 ? (
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
        )
      ) : (
        <div className="space-y-2">
          {manual.map((s) => (
            <div key={s.id} className="p-2.5 rounded-lg grid sm:grid-cols-[1fr_140px_1fr_auto] gap-2 items-center" style={{ background: 'var(--bg-soft)' }}>
              <input className="input-base text-[12.5px]" placeholder="설비명" value={s.name} onChange={(e) => updManual(s.id, { name: e.target.value })} />
              <select className="input-base text-[12.5px]" value={s.kind} onChange={(e) => updManual(s.id, { kind: e.target.value })}>
                {['보관설비', '온습도관리', '측정장비', '기타'].map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
              <input className="input-base text-[12.5px]" placeholder="적용활동(용도)" value={s.application} onChange={(e) => updManual(s.id, { application: e.target.value })} />
              <button onClick={() => delManual(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626' }}><Trash2 size={14} /></button>
            </div>
          ))}
          <button onClick={addManual} className="btn-ghost text-[11.5px] inline-flex items-center gap-1"><Plus size={12} /> 설비 추가</button>
        </div>
      )}
    </div>
  )
}

/* ================================================================
   #9-14 첨부서류 체크리스트 — GMP 접수양식에서 이 화면에 아직 노출되지 않았던 항목들.
   ================================================================ */
const CHECKLIST_KEY = 'qualytree.gmpApplication.checklist'
function loadChecklist() { try { return JSON.parse(localStorage.getItem(CHECKLIST_KEY) || '{}') } catch { return {} } }
function saveChecklist(v) { localStorage.setItem(CHECKLIST_KEY, JSON.stringify(v)) }

const REQUIRED_DOC_NAMES = [
  '① GMP 적합인정 심사 신청서', '② 제조소 개요', '③ 종업원수 현황', '④ 조직도',
  '⑤ 제조되는 의료기기 목록', '⑥ GMP/MDSAP 적합인정서 사본(해당 시)', '⑦ 실사결과자료(해당 시)',
  '⑧ 작업소·시험실·보관소 평면도', '⑨ 시설·장비 목록', '⑩ 청정실 관리 절차서',
  '⑪ 모니터링·측정장비 관리 절차서', '⑫ 품질매뉴얼', '⑬ 완제품시험 절차서·시험성적서',
  '⑭ 구매·위탁관리 절차서', '⑮ 주요 공급업체 현황', '⑯ 대표품목 제품표준서', '⑰ 멸균유효성확인 절차서(해당 시)',
  '⑱ 별표2 기준 점검표', '⑲ 기준 적합선언문', '⑳ 사업자등록증 등 기타 첨부서류',
]

const ISO_CLAUSES = [
  { key: '4', label: '4장 품질경영시스템' },
  { key: '5', label: '5장 경영책임' },
  { key: '6', label: '6장 자원관리' },
  { key: '7', label: '7장 제품실현' },
  { key: '8', label: '8장 측정·분석·개선' },
]
const RESP_PARTIES = ['제조의뢰자', '제조자', '수탁업체']

function AttachmentsTab({ nav }) {
  const canEdit = permissions.can('onb.company.edit')
  const [state, setState] = useState(loadChecklist)
  const patch = (p) => { const next = { ...state, ...p }; setState(next); saveChecklist(next) }

  const isImporter = isImporterOnly()
  const kgmpStatus = useMemo(() => getKgmpStatus({ profile: isImporter ? 'importer' : 'manufacturer' }), [isImporter])

  // #18 — 외국제조소에 첨부한 구비서류(FOREIGN_DOC_SLOTS)가 GMP신청 첨부서류 체크리스트에도
  // 반영되어야 한다는 피드백 — 외국제조소별 구비서류 첨부 현황을 여기서도 볼 수 있게 한다.
  const foreignSiteList = useMemo(() => (isImporter ? foreignSites.getAll() : []), [isImporter])

  const docNames = state.docNames || REQUIRED_DOC_NAMES
  const docChecked = state.docChecked || {}
  const toggleDoc = (name) => patch({ docChecked: { ...docChecked, [name]: !docChecked[name] } })

  const matrix = state.matrix || {}
  const setMatrixCell = (clause, party) => patch({ matrix: { ...matrix, [clause]: party } })

  const sites = state.sites || []
  const addSite = () => patch({ sites: [...sites, { id: Date.now(), name: '', certNo: '', validFrom: '', validTo: '', note: '' }] })
  const updSite = (id, p2) => patch({ sites: sites.map((s) => (s.id === id ? { ...s, ...p2 } : s)) })
  const delSite = (id) => patch({ sites: sites.filter((s) => s.id !== id) })

  const doneDocs = docNames.filter((n) => docChecked[n]).length

  return (
    <div className="space-y-5">
      {/* #18 외국제조소 구비서류 현황 (수입GMP 전용) */}
      {isImporter && (
        <div className="card-base p-4">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <div>
              <div className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>외국제조소 구비서류 현황</div>
              <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
                외국제조소·수입 GMP 화면에서 제조소별로 첨부한 구비서류가 여기 자동으로 반영됩니다.
              </div>
            </div>
            <button onClick={() => nav('/foreign-manufacturers')} className="btn-ghost text-[12px] inline-flex items-center gap-1 shrink-0">
              외국제조소 관리로 이동 <ChevronRight size={13} />
            </button>
          </div>
          {foreignSiteList.length === 0 ? (
            <div className="text-[12px] py-4 text-center" style={{ color: 'var(--ink-faint)' }}>등록된 외국제조소가 없습니다.</div>
          ) : (
            <div className="space-y-1.5">
              {foreignSiteList.map((s) => {
                const filled = FOREIGN_DOC_SLOTS.filter((slot) => ((s.docSlotFiles || {})[slot.key] || []).length > 0).length
                return (
                  <div key={s.id} className="p-2.5 rounded-lg flex items-center justify-between" style={{ background: 'var(--bg-soft)' }}>
                    <span className="text-[12.5px] font-medium" style={{ color: 'var(--ink)' }}>{s.name || '(제조소명 미입력)'}</span>
                    <span className="text-[11.5px] font-semibold" style={{ color: 'var(--ink-mute)' }}>{filled}/{FOREIGN_DOC_SLOTS.length} 서류 첨부됨</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* #9 품질문서관리개요 별표2 */}
      <div className="card-base p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>① 품질문서관리개요(별표2 기준 점검표)</div>
            <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
              KGMP 통합현황에서 자동 산출되는 별표2 점검표를 그대로 GMP신청 첨부서류로 사용합니다.
            </div>
          </div>
          <button onClick={() => nav('/kgmp')} className="btn-ghost text-[12px] inline-flex items-center gap-1 shrink-0">
            KGMP 통합현황으로 이동 <ChevronRight size={13} />
          </button>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-soft)' }}>
            <div className="h-full rounded-full" style={{ width: kgmpStatus.pct + '%', background: 'var(--moss)' }} />
          </div>
          <span className="text-[12px] font-semibold shrink-0" style={{ color: 'var(--ink-mute)' }}>{kgmpStatus.doneCount}/{kgmpStatus.totalCount} 항목 ({kgmpStatus.pct}%)</span>
        </div>
      </div>

      {/* #10 적합선언문 */}
      <div className="card-base p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>② 기준 적합선언문</div>
            <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
              KGMP 승인문서 통합 PDF 보기 기능에서 적합선언문을 확인·다운로드할 수 있습니다.
            </div>
          </div>
          <button onClick={() => nav('/kgmp')} className="btn-ghost text-[12px] inline-flex items-center gap-1 shrink-0">
            KGMP 승인문서로 이동 <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* #11 평면도 */}
      <div className="card-base p-4">
        <div className="text-[13.5px] font-semibold mb-1" style={{ color: 'var(--ink)' }}>③ 작업소·시험실·보관소 평면도</div>
        <div className="text-[11.5px] mb-3" style={{ color: 'var(--ink-faint)' }}>
          평면도 파일(이미지·PDF) 보유 여부만 이 화면에서 표시합니다. 실제 파일은 문서관리(회사·인증서류)에 첨부하세요.
        </div>
        <label className="flex items-center gap-2 text-[12.5px] cursor-pointer" style={{ color: 'var(--ink)' }}>
          <input type="checkbox" checked={!!state.floorPlanReady} onChange={(e) => patch({ floorPlanReady: e.target.checked })} disabled={!canEdit} />
          평면도 준비 완료
        </label>
        <button onClick={() => nav('/document-control')} className="btn-ghost text-[12px] inline-flex items-center gap-1 mt-2">
          문서관리(회사·인증서류)로 이동 <ChevronRight size={13} />
        </button>
      </div>

      {/* #12 구비서류명 정리 */}
      <div className="card-base p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>④ 구비서류명 정리</div>
          <span className="text-[12px] font-semibold" style={{ color: 'var(--ink-mute)' }}>{doneDocs}/{docNames.length}</span>
        </div>
        <div className="text-[11.5px] mb-3" style={{ color: 'var(--ink-faint)' }}>
          GMP 접수양식 첨부서류 전체 목록입니다. 준비가 끝난 항목을 체크하세요.
        </div>
        <div className="grid sm:grid-cols-2 gap-1.5">
          {docNames.map((n) => (
            <label key={n} className="flex items-center gap-2 text-[12px] cursor-pointer px-2 py-1.5 rounded-lg" style={{ background: docChecked[n] ? 'var(--leaf-soft)' : 'var(--bg-soft)' }}>
              <input type="checkbox" checked={!!docChecked[n]} onChange={() => toggleDoc(n)} disabled={!canEdit} />
              <span style={{ color: docChecked[n] ? 'var(--moss)' : 'var(--ink)' }}>{n}</span>
            </label>
          ))}
        </div>
      </div>

      {/* #13 품질경영시스템 상호관계 */}
      <div className="card-base p-4">
        <div className="text-[13.5px] font-semibold mb-1" style={{ color: 'var(--ink)' }}>⑤ 품질경영시스템 상호관계표</div>
        <div className="text-[11.5px] mb-3" style={{ color: 'var(--ink-faint)' }}>
          ISO 13485 조항별로 제조의뢰자·제조자·수탁업체 중 누가 책임을 지는지 표시합니다(위탁제조가 없다면 전부 "제조자"로 두면 됩니다).
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                <th className="text-left py-1.5 pr-3 font-medium" style={{ color: 'var(--ink-mute)' }}>ISO 13485 조항</th>
                {RESP_PARTIES.map((p) => <th key={p} className="text-center py-1.5 px-2 font-medium" style={{ color: 'var(--ink-mute)' }}>{p}</th>)}
              </tr>
            </thead>
            <tbody>
              {ISO_CLAUSES.map((c) => (
                <tr key={c.key} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td className="py-1.5 pr-3" style={{ color: 'var(--ink)' }}>{c.label}</td>
                  {RESP_PARTIES.map((p) => (
                    <td key={p} className="text-center py-1.5 px-2">
                      <input type="radio" name={`resp-${c.key}`} checked={matrix[c.key] === p} onChange={() => setMatrixCell(c.key, p)} disabled={!canEdit} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* #14 제조소 총괄표 (선택) */}
      <div className="card-base p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>⑥ 제조소 총괄표 <span className="text-[11px] font-normal" style={{ color: 'var(--ink-faint)' }}>(다수 제조소 일괄신청 시 선택)</span></div>
          {canEdit && <button onClick={addSite} className="btn-ghost text-[11.5px] inline-flex items-center gap-1"><Plus size={12} /> 제조소 추가</button>}
        </div>
        <div className="text-[11.5px] mb-3" style={{ color: 'var(--ink-faint)' }}>제조소가 한 곳뿐이면 작성하지 않아도 됩니다.</div>
        {sites.length === 0 ? (
          <div className="text-[12px] py-4 text-center" style={{ color: 'var(--ink-faint)' }}>등록된 제조소가 없습니다.</div>
        ) : (
          <div className="space-y-2">
            {sites.map((s) => (
              <div key={s.id} className="p-2.5 rounded-lg grid sm:grid-cols-[1fr_140px_120px_120px_1fr_auto] gap-2 items-center" style={{ background: 'var(--bg-soft)' }}>
                <input className="input-base text-[12px]" placeholder="제조소명" value={s.name} onChange={(e) => updSite(s.id, { name: e.target.value })} />
                <input className="input-base text-[12px]" placeholder="인정번호" value={s.certNo} onChange={(e) => updSite(s.id, { certNo: e.target.value })} />
                <input type="date" className="input-base text-[12px]" value={s.validFrom} onChange={(e) => updSite(s.id, { validFrom: e.target.value })} />
                <input type="date" className="input-base text-[12px]" value={s.validTo} onChange={(e) => updSite(s.id, { validTo: e.target.value })} />
                <input className="input-base text-[12px]" placeholder="비고" value={s.note} onChange={(e) => updSite(s.id, { note: e.target.value })} />
                <button onClick={() => delSite(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626' }}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
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
