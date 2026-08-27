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
  Save,, Globe } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'
import { permissions, requirePermission } from '../../lib/permissions'
import { fileStore } from '../../lib/fileStore'
import { onboarding } from '../../lib/onboardingState'
import { mfds } from '../../lib/mfds'
import { resolveCategoryByNo } from '../../lib/mfdsCategory'
import {
  foreignSites,
  gmpCertificates,
  otherAuditReports,
  inspectionSchedules,
  ENTRUSTED_RELATION,
  certStatusOf,
} from '../../lib/foreignManufacturerState'
import CertGate from '../../components/CertGate'

// #4 — 신청서(의료기기 적합성인정등 심사 신청서, 제7조제1항제2호 구비서류) 양식과 동일하게
// "기타 서류" 단일 다중첨부 대신 항목별 개별 서류 슬롯으로 구성한다.
// (제조소 개요/품목목록은 위에서 별도 필드로 이미 관리하고, GMP 적합인정서·실사결과 자료는
//  아래 GMP 적합인정서/타 인증기관 실사자료 섹션에서 별도로 관리하므로 여기서는 제외한다.)
export const FOREIGN_DOC_SLOTS = [
  { key: 'bizLicense', label: '2. 제조(수입)업 허가증 사본' },
  { key: 'orgChart', label: '2-가-2. 조직도' },
  { key: 'employeeCert', label: '2-가-3. 종업원 수 확인자료' },
  { key: 'productListDoc', label: '2-가-4. 제조되는 의료기기 목록' },
  { key: 'cleanroomProcedure', label: '2-다-2. 청정실 관련 절차서' },
  { key: 'monitoringProcedure', label: '2-다-3. 모니터링 및 측정장비 관련 절차서' },
  { key: 'qualityManual', label: '2-라. 품질매뉴얼(품질방침 포함)' },
  { key: 'fgTestProcedure', label: '2-마-1. 완제품시험 관련 절차서' },
  { key: 'fgTestReport', label: '2-마-2. 시험성적서' },
  { key: 'purchaseProcedure', label: '2-바-1. 구매·위탁 절차서' },
  { key: 'supplierList', label: '2-바-2. 주요 공급업체명 및 업무범위' },
  { key: 'productSpec', label: '2-사-1. 제품표준서' },
  { key: 'sterilizationValidation', label: '2-사-2. 멸균 유효성 확인 절차서 (해당 시)' },
  { key: 'standardChecklist', label: '2-아. 별표2 기준 점검표' },
  { key: 'conformityDeclaration', label: '2-자. 별표2 기준 적합선언문' },
  { key: 'siteOverviewTable', label: '3. 제조소 총괄표' },
  { key: 'etc', label: '3. 기타 자료 (통역 동의서, KGMP 적합인정서 사본, 사업자등록증 등)' },
]

export default function ForeignManufacturerHub() {
  const user = auth.current()
  const [searchParams] = useSearchParams()
  const [tick, setTick] = useState(0)
  const refresh = () => setTick((x) => x + 1)
  const [toast, setToast] = useState(null)
  const showToast = (t) => { setToast(t); setTimeout(() => setToast(null), 2400) }

  const sites = foreignSites.getAll()

  // 개선과제 #13 — 수입GMP 진행상황 요약(외국제조소·GMP 적합인정서·통관·이상사례·관리기준서를
  // 한눈에 보는 요약). 각 화면의 localStorage를 그대로 읽어 가볍게 집계만 한다 — 별도
  // 상태 저장소를 새로 만들지 않고 기존 4개 화면의 데이터를 그대로 반영한다.
  const importSummary = (() => {
    const certAll = sites.flatMap((s) => gmpCertificates.getForSite(s.id))
    const certExpiring = certAll.filter((c) => certStatusOf(c.expiryDate) === '만료임박').length
    const certExpired = certAll.filter((c) => certStatusOf(c.expiryDate) === '만료').length
    let clearanceCount = 0
    try { clearanceCount = (JSON.parse(localStorage.getItem('qualytree.import_clearance') || '[]')).length } catch { /* ignore */ }
    let adverseOpen = 0
    try {
      const adv = JSON.parse(localStorage.getItem('qualytree.import_adverse') || '[]')
      adverseOpen = adv.filter((i) => !['closed', 'rejected'].includes(i.status)).length
    } catch { /* ignore */ }
    let imsStatus = null
    try {
      const ims = JSON.parse(localStorage.getItem('qualytree.import_management_standard') || 'null')
      imsStatus = ims?.docStatus || null
    } catch { /* ignore */ }
    return { sitesCount: sites.length, certExpiring, certExpired, clearanceCount, adverseOpen, imsStatus }
  })()
  const IMS_STATUS_LABEL = { draft: '작성중', review: '검토중', approval: '승인대기', approved: '승인완료' }
  const [selId, setSelId] = useState(() => searchParams.get('siteId') || sites[0]?.id || null)
  const sel = sites.find((s) => s.id === selId) || sites[0] || null
  const canEdit = permissions.can('importgmp.site.edit')

  const dueCerts = gmpCertificates.dueOrExpired()
  // 공통 제출 문서·기술문서·품질시스템·절차서·기록 체크리스트 — KGMP통합현황(제조사용)과 같은
  // 로직을 수입사 관점(profile:'importer')으로 계산해 이 화면에 함께 보여준다. 제조소별 GMP
  // 적합인정서 상세는 위 마스터-디테일 UI에서 직접 관리하므로 체크리스트에는 중복 나열하지 않는다.

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
      <HubBanner icon={Globe} title="외국제조소" subtitle="수입GMP 외국제조소 관리" color="blue" />
      <CertGate certId="kgmp_importer" label="외국제조소(수입GMP)">
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

        {/* 개선과제 #13 — 수입GMP 진행상황 요약 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          <a href="#sites" className="p-3 rounded-xl text-center no-underline" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
            <div className="text-[20px] font-bold" style={{ color: 'var(--ink)' }}>{importSummary.sitesCount}</div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>등록 외국제조소</div>
          </a>
          <div className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
            <div className="text-[20px] font-bold" style={{ color: importSummary.certExpired > 0 ? '#DC2626' : importSummary.certExpiring > 0 ? '#D97706' : 'var(--ink)' }}>
              {importSummary.certExpired + importSummary.certExpiring}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>GMP 인정서 만료/임박</div>
          </div>
          <a href="/import-clearance" className="p-3 rounded-xl text-center no-underline" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
            <div className="text-[20px] font-bold" style={{ color: 'var(--ink)' }}>{importSummary.clearanceCount}</div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>수입통관기록</div>
          </a>
          <a href="/import-adverse" className="p-3 rounded-xl text-center no-underline" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
            <div className="text-[20px] font-bold" style={{ color: importSummary.adverseOpen > 0 ? '#D97706' : 'var(--ink)' }}>{importSummary.adverseOpen}</div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>이상사례 진행중</div>
          </a>
          <a href="/import-management-standard" className="p-3 rounded-xl text-center no-underline" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
            <div className="text-[13px] font-bold" style={{ color: 'var(--ink)' }}>{importSummary.imsStatus ? (IMS_STATUS_LABEL[importSummary.imsStatus] || importSummary.imsStatus) : '미작성'}</div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>수입관리기준서</div>
          </a>
        </div>

        {dueCerts.length > 0 && (
          <div className="card-base p-3.5 mb-5 flex items-start gap-2.5" style={{ background: 'var(--amber-soft)' }}>
            <AlertTriangle size={16} style={{ color: 'var(--amber)' }} className="shrink-0 mt-0.5" />
        <div style={{background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:8,padding:'10px 16px',marginBottom:16,display:'flex',gap:10,alignItems:'flex-start'}}>
          <div style={{width:20,height:20,borderRadius:'50%',background:'#16A34A',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0,marginTop:1}}>i</div>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:'#166534',marginBottom:3}}>해외 완제품 제조소 전용</div>
            <div style={{fontSize:12,color:'#14532D',lineHeight:1.6}}>수입 의료기기의 해외 제조소(제품별 GMP 적합인정·실태조사·인증 관리)를 담당합니다. 원부자재·부품 등 국내 공급업체는 <b>공급업체 관리</b> 메뉴에서 관리하세요.</div>
          </div>
        </div>
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
              <SiteDetail key={sel.id} site={sel} canEdit={canEdit} onAction={showToast} onChanged={refresh} onDelete={() => delSite(sel.id)} allSites={sites} />
            ) : (
              <EmptyState icon={Factory} text="왼쪽에서 외국제조소를 선택하거나 추가하세요." />
            )}
          </div>
        </div>

      </div>
      <SiteProductMatrix sites={sites} />
      </CertGate>
    </AppLayout>
  )
}

/* ================================================================
   제조소 상세 — 기본정보 + GMP 적합인정서 + 타 인증기관 실사자료
   ================================================================ */

function SiteProductMatrix({ sites }) {
  const [open, setOpen] = useState(false)
  const rows = sites.flatMap(site =>
    (site.products || []).map(p => ({ siteName: site.name || '(이름 없음)', group: p.group || '', productName: p.name || '', grade: p.grade || '' }))
  )
  return (
    <div className="mt-4 rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3 text-left"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)' }}
      >
        <span className="text-[13.5px] font-bold">제조소-품목 연결 현황</span>
        <span className="flex items-center gap-2">
          <span className="text-[12px] px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-soft)', color: 'var(--ink-mute)' }}>{rows.length}건</span>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>
      {open && (
        rows.length === 0 ? (
          <p className="text-[12px] py-6 text-center" style={{ color: 'var(--ink-faint)' }}>등록된 제조소 또는 품목이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-soft)', borderTop: '1px solid var(--border)' }}>
                  {['외국제조소', '품목군', '품목명', '등급'].map(h => (
                    <th key={h} className="text-left px-4 py-2 font-semibold" style={{ color: 'var(--ink-mute)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="px-4 py-2 font-medium" style={{ color: 'var(--ink)', maxWidth: 180 }}>{r.siteName}</td>
                    <td className="px-4 py-2" style={{ color: 'var(--ink-soft)' }}>{r.group}</td>
                    <td className="px-4 py-2" style={{ color: 'var(--ink)' }}>{r.productName}</td>
                    <td className="px-4 py-2 text-center">
                      {r.grade && <span className="inline-block text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--bg-soft)', color: 'var(--ink-mute)' }}>{r.grade}등급</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}


function SiteDetail({ site, canEdit, onAction, onChanged, onDelete, allSites }) {
  const [form, setForm] = useState(site)
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const dirty = JSON.stringify(form) !== JSON.stringify(site)
  const [pnOpenId, setPnOpenId] = useState(null) // #3 품목명 검색 드롭다운 (열려있는 행 id)

  // #17 — 품목군을 사용자가 직접 타이핑하지 않아도, MFDS 품목분류 데이터로 품목명을 찾아
  // 분류번호 기준 품목군을 자동 생성해준다(RegulatoryHub Step1과 동일한 방식).
  React.useEffect(() => { mfds.load() }, [])
  const autoFillGroup = (id, name) => {
    if (!name || !name.trim()) return
    const hit = mfds.search(name, 1).find((it) => it.name === name.trim()) || mfds.search(name, 1)[0]
    if (!hit) return
    const cat = resolveCategoryByNo(hit.no)
    if (!cat) return
    setForm((f) => ({
      ...f,
      products: (f.products || []).map((row) => (row.id === id && !row.group ? { ...row, group: cat.name } : row)),
    }))
  }

  // 이미 등록된 품목명 — 다른 외국제조소에 등록된 품목 + 회사 제품·공정(ProductsHub)에 등록된 품목을 함께 검색 후보로 사용 (#3, #25 재수정)
  // 제조소를 처음 등록할 때는 다른 제조소 품목이 아직 없어 검색이 비어 보일 수 있으므로, 이미 온보딩에서 등록한 자사 품목도 함께 찾는다.
  const knownProducts = React.useMemo(() => {
    const map = new Map()
    ;(allSites || []).forEach((s) => (s.products || []).forEach((p) => {
      if (p.name && !map.has(p.name)) map.set(p.name, p)
    }))
    const obProducts = (onboarding.load()?.products || [])
    obProducts.forEach((p) => {
      const name = p.itemName || p.name
      if (name && !map.has(name)) map.set(name, { name, group: p.cat1 || '', grade: p.grade ? p.grade + '등급' : '' })
    })
    return Array.from(map.values())
  }, [allSites])

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

  // 품목목록: 품목군/품목명/품목등급 구조화 (#295) — 일반 필드와 동일하게 '변경사항 저장'으로 반영
  const addProductRow = () => {
    if (!canEdit) return
    setForm((f) => ({ ...f, products: [...(f.products || []), { id: Math.random().toString(36).slice(2, 9), group: '', name: '', grade: '1등급' }] }))
  }
  const setProductField = (id, key, val) => {
    setForm((f) => ({ ...f, products: (f.products || []).map((p) => (p.id === id ? { ...p, [key]: val } : p)) }))
  }
  const removeProductRow = (id) => {
    setForm((f) => ({ ...f, products: (f.products || []).filter((p) => p.id !== id) }))
  }

  // #4 — 신청서 구비서류별 개별 슬롯 다중 첨부 (기존 "기타 서류" 단일 버킷 대체)
  const attachSlotFile = async (slotKey, file) => {
    if (!requirePermission('importgmp.site.edit')) return
    const fileId = await fileStore.saveFile(file)
    const cur = { ...(site.docSlotFiles || {}) }
    cur[slotKey] = [...(cur[slotKey] || []), { id: Math.random().toString(36).slice(2, 9), fileId, fileName: file.name }]
    foreignSites.update(site.id, { docSlotFiles: cur })
    setF('docSlotFiles', cur)
    onChanged()
  }
  const removeSlotFile = (slotKey, fid) => {
    if (!requirePermission('importgmp.site.edit')) return
    const cur = { ...(site.docSlotFiles || {}) }
    cur[slotKey] = (cur[slotKey] || []).filter((x) => x.id !== fid)
    foreignSites.update(site.id, { docSlotFiles: cur })
    setF('docSlotFiles', cur)
    onChanged()
  }

  const openFile = async (fileId) => {
    const url = await fileStore.getObjectURL(fileId)
    if (!url) { window.alert('파일을 찾을 수 없습니다.'); return }
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  }

  const missing = []
  if (!site.products || site.products.length === 0) missing.push('품목목록')
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
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="block text-[11.5px] font-medium" style={{ color: 'var(--ink-mute)' }}>품목목록 (품목군 · 품목명 · 품목등급)</span>
            {canEdit && <button type="button" onClick={addProductRow} className="inline-flex items-center gap-1 text-[11.5px] font-medium" style={{ color: 'var(--moss)' }}><Plus size={12} /> 품목 추가</button>}
          </div>
          {(form.products || []).length === 0 ? (
            <div className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>등록된 품목이 없습니다.</div>
          ) : (
            <div className="space-y-2">
              {form.products.map((p, idx) => (
                <div key={p.id} className="grid grid-cols-[1.4fr_1.1fr_0.9fr_auto] gap-2 items-end">
                  <div className="relative">
                    {idx === 0 && <span className="block text-[10.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>품목명 (검색)</span>}
                    <input className="input-base" style={{ padding: '0.4rem 0.6rem', fontSize: 12.5 }}
                      value={p.name}
                      onChange={(v) => { setProductField(p.id, 'name', v.target.value); setPnOpenId(p.id) }}
                      onFocus={() => setPnOpenId(p.id)}
                      onBlur={() => { autoFillGroup(p.id, p.name); setTimeout(() => setPnOpenId((cur) => (cur === p.id ? null : cur)), 150) }}
                      placeholder="예: 금속제인공고관절 — 입력 또는 기존 품목 검색 (품목군 자동 생성)"
                      disabled={!canEdit} />
                    {pnOpenId === p.id && p.name && (() => {
                      const q = p.name.toLowerCase()
                      const hits = knownProducts.filter((kp) => kp.name.toLowerCase().includes(q) && kp.name !== p.name).slice(0, 8)
                      if (hits.length === 0) return null
                      return (
                        <div className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-auto bg-white border border-slate-200 rounded-lg shadow-lg divide-y divide-slate-100">
                          {hits.map((kp) => (
                            <button key={kp.name} type="button"
                              onMouseDown={() => {
                                setForm((f) => ({ ...f, products: (f.products || []).map((row) => (row.id === p.id ? { ...row, name: kp.name, group: kp.group || row.group, grade: kp.grade || row.grade } : row)) }))
                                setPnOpenId(null)
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-emerald-50 text-[12px] text-slate-800">
                              {kp.name} <span className="text-slate-400">· {kp.group || '품목군 미지정'} · {kp.grade || '등급 미지정'}</span>
                            </button>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                  <Field label={idx === 0 ? '품목군' : ''} value={p.group} onChange={(v) => setProductField(p.id, 'group', v)} placeholder="예: 정형용 임플란트" />
                  <SelectField label={idx === 0 ? '품목등급' : ''} value={p.grade} onChange={(v) => setProductField(p.id, 'grade', v)} options={['1등급', '2등급', '3등급', '4등급']} />
                  {canEdit ? (
                    <button type="button" onClick={() => removeProductRow(p.id)} className="mb-1.5" style={{ color: 'var(--rust, #c0392b)' }}><Trash2 size={14} /></button>
                  ) : <span />}
                </div>
              ))}
            </div>
          )}
        </div>
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

        <div className="mt-3">
          <div className="text-[11.5px] font-medium mb-2" style={{ color: 'var(--ink-mute)' }}>
            구비 서류 (의료기기 적합성인정등 심사 신청서 · 제7조제1항제2호 서식 기준)
          </div>
          <div className="space-y-2">
            {FOREIGN_DOC_SLOTS.map((slot) => {
              const files = (form.docSlotFiles || {})[slot.key] || []
              return (
                <div key={slot.key} className="rounded-lg px-2.5 py-2" style={{ background: 'var(--bg-soft)' }}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11.5px]" style={{ color: files.length ? 'var(--ink)' : 'var(--ink-mute)' }}>
                      {files.length > 0 && <span style={{ color: 'var(--moss)' }}>✓ </span>}
                      {slot.label}
                    </span>
                    {canEdit && <FileAttachButton onPick={(f) => attachSlotFile(slot.key, f)} label="첨부" />}
                  </div>
                  {files.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {files.map((f) => (
                        <span key={f.id} className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-[11px]" style={{ background: 'var(--bg-card)', color: 'var(--ink-soft)', border: '1px solid var(--line)' }}>
                          <button type="button" onClick={() => openFile(f.fileId)} className="inline-flex items-center gap-1 hover:underline"><Download size={10} /> {f.fileName}</button>
                          {canEdit && <button type="button" onClick={() => removeSlotFile(slot.key, f.id)} className="opacity-50 hover:opacity-100"><X size={10} /></button>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
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
      <InspectionScheduleCard siteId={site.id} canEdit={canEdit} />
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
const EMPTY_INSP = { scheduledDate: '', conductedDate: '', inspector: '', result: '', findings: '', action: '', notes: '' }

function InspectionScheduleCard({ siteId, canEdit }) {
  const [list, setList] = useState(() => inspectionSchedules.getForSite(siteId))
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_INSP)
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const reload = () => setList(inspectionSchedules.getForSite(siteId))

  const save = () => {
    if (!form.scheduledDate) return
    if (editId) { inspectionSchedules.update(editId, form) }
    else { inspectionSchedules.add(siteId, form) }
    reload(); setAdding(false); setEditId(null); setForm(EMPTY_INSP)
  }

  const del = (id) => { inspectionSchedules.delete(id); reload() }

  const openEdit = (rec) => { setForm({ ...rec }); setEditId(rec.id); setAdding(true) }

  const RESULT_OPTS = ['', '적합', '부적합', '조건부적합', '예정']

  return (
    <div className="mt-6 rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13.5px] font-bold" style={{ color: 'var(--ink)' }}>실태조사 일정</h3>
        {canEdit && !adding && (
          <button onClick={() => { setAdding(true); setEditId(null); setForm(EMPTY_INSP) }}
            className="flex items-center gap-1 text-[12px] px-2.5 py-1 rounded-lg font-semibold"
            style={{ background: 'var(--brand)', color: 'white', border: 'none', cursor: 'pointer' }}>
            <Plus size={12} />일정 추가
          </button>
        )}
      </div>

      {adding && (
        <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--bg-soft)', border: '1px solid var(--border)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <Field label="예정일 *" value={form.scheduledDate} onChange={(v) => setF('scheduledDate', v)} type="date" />
            <Field label="실시일" value={form.conductedDate} onChange={(v) => setF('conductedDate', v)} type="date" />
            <Field label="실태조사자" value={form.inspector} onChange={(v) => setF('inspector', v)} placeholder="담당자 이름" />
            <div>
              <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-mute)' }}>결과</label>
              <select value={form.result} onChange={(e) => setF('result', e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-[12.5px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--ink)' }}>
                {RESULT_OPTS.map(o => <option key={o} value={o}>{o || '선택'}</option>)}
              </select>
            </div>
          </div>
          <TextAreaField label="지적사항" value={form.findings} onChange={(v) => setF('findings', v)} rows={2} />
          <TextAreaField label="시정조치" value={form.action} onChange={(v) => setF('action', v)} rows={2} />
          <TextAreaField label="비고" value={form.notes} onChange={(v) => setF('notes', v)} rows={1} />
          <div className="flex gap-2 mt-3">
            <button onClick={() => { setAdding(false); setEditId(null); setForm(EMPTY_INSP) }}
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold"
              style={{ background: 'var(--bg-card)', color: 'var(--ink-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>취소</button>
            <button onClick={save}
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold"
              style={{ background: 'var(--brand)', color: 'white', border: 'none', cursor: 'pointer' }}>{editId ? '수정' : '저장'}</button>
          </div>
        </div>
      )}

      {list.length === 0 && !adding ? (
        <p className="text-[12px] py-4 text-center" style={{ color: 'var(--ink-faint)' }}>등록된 실태조사 일정이 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {list.map(rec => {
            const resultColor = rec.result === '적합' ? '#065f46' : rec.result === '부적합' ? '#991b1b' : '#92400e'
            const resultBg = rec.result === '적합' ? '#d1fae5' : rec.result === '부적합' ? '#fee2e2' : '#fef3c7'
            return (
              <div key={rec.id} className="flex items-start justify-between gap-3 px-4 py-3 rounded-xl" style={{ background: 'var(--bg-soft)', border: '1px solid var(--border)' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[12.5px] font-semibold" style={{ color: 'var(--ink)' }}>{rec.scheduledDate || '일정 미정'}</span>
                    {rec.conductedDate && <span className="text-[11.5px]" style={{ color: 'var(--ink-mute)' }}>실시: {rec.conductedDate}</span>}
                    {rec.result && <span className="text-[10.5px] px-2 py-0.5 rounded-full font-medium" style={{ background: resultBg, color: resultColor }}>{rec.result}</span>}
                  </div>
                  {rec.inspector && <p className="text-[11.5px]" style={{ color: 'var(--ink-mute)' }}>조사자: {rec.inspector}</p>}
                  {rec.findings && <p className="text-[11.5px] mt-1" style={{ color: 'var(--ink-soft)' }}>지적: {rec.findings}</p>}
                </div>
                {canEdit && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(rec)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mute)', padding: '4px' }}><Edit3 size={13} /></button>
                    <button onClick={() => del(rec.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', padding: '4px' }}><Trash2 size={13} /></button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const EMPTY_REPORT = { issuer: '', certType: 'CE', auditDate: '', expiryDate: '', notes: '' }

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
          <div className="grid sm:grid-cols-2 gap-2">
            <Field label="인증기관" value={form.issuer} onChange={(v) => setF('issuer', v)} placeholder="예: TÜV SÜD" />
            <SelectField label="인증 종류" value={form.certType} onChange={(v) => setF('certType', v)}
              options={[{v:'CE',l:'CE 인증'}, {v:'FDA',l:'FDA 510(k)/PMA'}, {v:'ISO',l:'ISO 13485'}, {v:'기타',l:'기타'}]} />
          </div>
          <div className="grid sm:grid-cols-2 gap-2 mt-2">
            <Field label="심사일" type="date" value={form.auditDate} onChange={(v) => setF('auditDate', v)} />
            <Field label="만료일" type="date" value={form.expiryDate} onChange={(v) => setF('expiryDate', v)} />
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
        {options.map((o) => {
          const v = typeof o === 'object' ? o.v : o
          const l = typeof o === 'object' ? o.l : o
          return <option key={v} value={v}>{l}</option>
        })}
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
