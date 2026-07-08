import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PackageSearch,
  Workflow,
  FlaskConical,
  Edit3,
  Plus,
  Trash2,
  ChevronRight,
  Search,
  AlertCircle,
  GitBranch,
  History,
  ArrowRight,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import { permissions, requirePermission, LEVEL_LABEL } from '../../lib/permissions'
import { onboarding } from '../../lib/onboardingState'
import { PROCESS_BLOCKS, PROCESS_CATEGORIES } from '../../lib/processBlocks'
import { inspectionTemplates, CRITICALITY_OPTIONS } from '../../lib/inspectionTemplates'
import { commitChange, CHANGE_ACTIONS, getRecordsForEntity } from '../../lib/changeControl'
import { ENTITY_TYPES, eid } from '../../lib/entityRegistry'

const CUSTOM_BLOCK_KEY = 'qualytree.customBlocks'

function loadCustomBlocks() {
  try {
    const raw = localStorage.getItem(CUSTOM_BLOCK_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

// 식약처 분류 기반 인허가 업종 (대분류 → 중분류)
const MDCAT = {
  '기구·기계': ['진료용 기기', '수술용 기기', '정형용품', '영상진단장치', '측정·감시장치', '물리치료·재활기기', '안과용 기기', '내시경·광학기기', '기타'],
  '의료용품': ['주사기·주사침', '카테터·튜브', '봉합사·결찰재', '수액·수혈세트', '거즈·드레싱', '콘택트렌즈', '기타'],
  '체외진단의료기기': ['생화학 검사', '면역 검사', '분자진단(NAT)', '혈액·혈당 검사', '자가검사', '기타'],
  '치과재료': ['충전·수복재료', '인상재', '의치·교정재료', '임플란트', '기타'],
  '소프트웨어·디지털(SaMD)': ['진단보조 SW', 'AI 영상분석', '환자 모니터링', '디지털치료기기(DTx)', '기타'],
  '기타': [],
}
const MDCAT1 = Object.keys(MDCAT)

/**
 * PROD-001 제품 라이브러리 (메인)
 *   - 탭 1: 제품 마스터 (PROD-001)
 *   - 탭 2: 공정 라이브러리 (PROD-002)
 *   - 탭 3: 검사 항목 마스터 (PROD-003)
 *
 * 적용 표준:
 * - ISO 13485:2016 §4.2.4 (문서 관리), §7.3 (설계 개발)
 * - 21 CFR 820.30 (Design Controls), §820.40 (Document Controls)
 * - Project Instructions §9 SSoT, §13.15 구성 관리
 */
const DEFAULT_CHAIN = [
  { blockId: 'visual-inspection', customName: '수입검사(IQC)' },
  { blockId: 'manual-assembly', customName: '주공정' },
  { blockId: 'cmm-inspection', customName: '공정검사(IPQC)' },
  { blockId: 'functional-test', customName: '최종검사(OQC)' },
  { blockId: 'primary-packaging', customName: '포장' },
  { blockId: 'labeling', customName: '라벨링' },
]

export default function ProductsHub() {
  const nav = useNavigate()
  const user = auth.current()

  const [tab, setTab] = useState('product') // product | process | inspection
  const [toast, setToast] = useState(null)

  const showToast = (text) => {
    setToast(text)
    setTimeout(() => setToast(null), 2400)
  }

  // 온보딩 데이터에서 회사·제품 추출 (다중 제품 지원)
  const ob = onboarding.load() || {}
  const company = ob.company
  const products = (Array.isArray(ob.products) && ob.products.length)
    ? ob.products
    : (ob.product && ob.product.name ? [ob.product] : [])
  const [selId, setSelId] = useState(null)
  const product = products.find((p) => (p.id || 'main') === selId) || products[0] || null
  const processes = ob.processes || []

  const hasOnboarding = !!(company?.name) || products.length > 0
  const canEditProduct = permissions.can('onb.product.edit')
  const [addingProduct, setAddingProduct] = useState(false)

  return (
    <AppLayout
      user={user}
      title="제품 · 공정"
      subtitle="제품 마스터 / 공정 라이브러리 / 검사 항목"
    >
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto fade-in">
        {/* Toast */}
        {toast && (
          <div
            className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-lg text-[13px] flex items-center gap-2 fade-in"
            style={{
              background: 'var(--moss)',
              color: 'var(--bg)',
              boxShadow: '0 6px 20px rgba(15,26,20,0.18)',
              fontWeight: 500,
            }}
          >
            ✓ {toast}
          </div>
        )}

        {/* 헤더 */}
        <div className="mb-5">
          <span
            className="font-mono text-[10px] tracking-[0.18em] uppercase"
            style={{ color: 'var(--moss)' }}
          >
            PROD · PRODUCT & PROCESS LIBRARY
          </span>
          <div
            className="font-display text-[26px] mt-1"
            style={{ color: 'var(--ink)', fontWeight: 500 }}
          >
            제품·공정 마스터
          </div>
          <div
            className="text-[12.5px] mt-0.5"
            style={{ color: 'var(--ink-mute)' }}
          >
            ISO 13485 §4.2.4 / 21 CFR 820.30 / 820.40 — 모든 변경은 CCR 자동 발의
          </div>
        </div>

        {/* 온보딩 미완 안내 */}
        {!hasOnboarding && (
          <div
            className="card-base p-6 mb-5 text-center"
            style={{ borderStyle: 'dashed' }}
          >
            <PackageSearch
              size={32}
              style={{ color: 'var(--ink-faint)', margin: '0 auto' }}
              strokeWidth={1.4}
            />
            <div className="mt-3 text-[14px]" style={{ color: 'var(--ink)' }}>
              회사·제품 정보가 아직 등록되지 않았습니다
            </div>
            <div
              className="mt-1 text-[12px]"
              style={{ color: 'var(--ink-mute)' }}
            >
              온보딩을 먼저 완료하시거나 데모 데이터를 채워보세요.
            </div>
            <button
              onClick={() => nav('/onboarding')}
              className="btn-primary mt-3"
            >
              온보딩 시작 <ArrowRight size={13} />
            </button>
          </div>
        )}

        {hasOnboarding && (
          <>
            {/* 탭 */}
            <div className="flex gap-1 mb-5 overflow-x-auto">
              <TabButton
                active={tab === 'product'}
                onClick={() => setTab('product')}
                icon={PackageSearch}
                label="제품"
                en="PROD-001"
                count={products.length}
              />
              <TabButton
                active={tab === 'process'}
                onClick={() => setTab('process')}
                icon={Workflow}
                label="공정"
                en="PROD-002"
                count={processes.length}
              />
              <TabButton
                active={tab === 'inspection'}
                onClick={() => setTab('inspection')}
                icon={FlaskConical}
                label="검사 항목"
                en="PROD-003"
                count={countAllTemplates()}
              />
            </div>

            {/* 탭 내용 */}
            {tab === 'product' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  {products.length > 1 ? (
                    <div className="flex gap-1.5 flex-wrap">
                      {products.map((p) => {
                        const on = (p.id || 'main') === (product?.id || 'main')
                        return (
                          <button
                            key={p.id || 'main'}
                            onClick={() => { setSelId(p.id || 'main'); setAddingProduct(false) }}
                            className="px-3 py-1.5 rounded-lg text-[12.5px] transition"
                            style={{
                              background: on ? 'var(--moss)' : 'var(--bg-soft)',
                              color: on ? 'var(--bg)' : 'var(--ink-mute)',
                            }}
                          >
                            {p.name || '(이름없음)'}{p.grade ? ' · ' + p.grade + '등급' : ''}
                          </button>
                        )
                      })}
                    </div>
                  ) : <div />}
                  {canEditProduct && !addingProduct && (
                    <button onClick={() => setAddingProduct(true)} className="btn-ghost text-[12px]">
                      <Plus size={12} /> 제품 추가
                    </button>
                  )}
                </div>
                {addingProduct && (
                  <AddProductPanel
                    onCancel={() => setAddingProduct(false)}
                    onSaved={() => {
                      setAddingProduct(false)
                      showToast('제품이 추가되었습니다 · CCR 자동 발의')
                      setTimeout(() => window.location.reload(), 600)
                    }}
                  />
                )}
                {!addingProduct && (
                  product ? (
                    <ProductPanel key={product?.id || 'main'} product={product} company={company} onAction={showToast} />
                  ) : (
                    <div className="card-base p-6 text-center" style={{ borderStyle: 'dashed' }}>
                      <PackageSearch size={28} style={{ color: 'var(--ink-faint)', margin: '0 auto' }} strokeWidth={1.4} />
                      <div className="mt-3 text-[13.5px]" style={{ color: 'var(--ink)' }}>등록된 제품이 없습니다</div>
                      <div className="mt-1 text-[12px]" style={{ color: 'var(--ink-mute)' }}>위의 '제품 추가' 버튼으로 첫 제품을 등록하세요.</div>
                    </div>
                  )
                )}
              </div>
            )}
            {tab === 'process' && (
              <ProcessPanel onAction={showToast} />
            )}
            {tab === 'inspection' && (
              <InspectionPanel onAction={showToast} />
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}

function countAllTemplates() {
  const all = inspectionTemplates.loadAll()
  return Object.values(all).reduce((sum, list) => sum + list.length, 0)
}

/* ================================================================
   TabButton
   ================================================================ */
function TabButton({ active, onClick, icon: Icon, label, en, count }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2.5 rounded-t-lg flex items-center gap-2 text-[13px] transition shrink-0"
      style={{
        background: active ? 'var(--bg-card)' : 'transparent',
        borderBottom: active
          ? '2px solid var(--moss)'
          : '2px solid transparent',
        color: active ? 'var(--ink)' : 'var(--ink-mute)',
        fontWeight: active ? 500 : 400,
      }}
    >
      <Icon size={14} />
      <span>{label}</span>
      <span
        className="font-mono text-[10px] px-1.5 py-0.5 rounded"
        style={{
          background: active ? 'var(--leaf-soft)' : 'var(--bg-soft)',
          color: active ? 'var(--moss)' : 'var(--ink-faint)',
        }}
      >
        {count}
      </span>
      <span
        className="font-mono text-[9.5px] tracking-wider"
        style={{ color: 'var(--ink-faint)' }}
      >
        {en}
      </span>
    </button>
  )
}

/* ================================================================
   PROD-001 제품 패널
   ================================================================ */
function AddProductPanel({ onCancel, onSaved }) {
  const EMPTY = { name: '', itemName: '', grade: '2', classNo: '', cat1: '', cat2: '', etc: '', contact: 'none', software: 'none', track: 'N', modelNumber: '', intendedUse: '' }
  const [form, setForm] = useState(EMPTY)
  const [reason, setReason] = useState('')
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const save = () => {
    if (!form.name.trim()) {
      alert('제품명은 필수입니다.')
      return
    }
    if (!reason.trim()) {
      alert('추가 사유는 필수입니다 (CCR — ISO 13485 §4.2.4).')
      return
    }
    const newProduct = { ...form, id: 'prod-' + Date.now(), name: form.name.trim() }

    const ob = onboarding.load()
    const list = Array.isArray(ob.products) ? ob.products.slice() : []
    list.push(newProduct)
    onboarding.save({ ...ob, products: list })

    commitChange({
      targetEid: eid(ENTITY_TYPES.PRODUCT, newProduct.id),
      action: CHANGE_ACTIONS.CREATE,
      before: null,
      after: newProduct,
      reason: reason.trim(),
    })

    onSaved(newProduct)
  }

  return (
    <div className="card-base p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <span
          className="font-mono text-[10px] tracking-[0.18em] uppercase"
          style={{ color: 'var(--moss)' }}
        >
          PRODUCT MASTER · 신규 등록
        </span>
        <button onClick={onCancel} className="btn-ghost text-[12px]">
          취소
        </button>
      </div>

      <div
        className="grid md:grid-cols-2 gap-4 pt-3"
        style={{ borderTop: '1px solid var(--line)' }}
      >
        <FieldEdit label="제품명" value={form.name} onChange={(v) => setF('name', v)} placeholder="예: 골절합용 나사" required />
        <FieldEdit label="품목명 (식약처)" value={form.itemName} onChange={(v) => setF('itemName', v)} placeholder="식약처 품목명" />
        <FieldEdit label="모델 번호" value={form.modelNumber} onChange={(v) => setF('modelNumber', v)} />
        <FieldEdit label="분류번호" value={form.classNo} onChange={(v) => setF('classNo', v)} placeholder="예: A11010.01" />
        <SelectEdit label="등급 (Class)" value={form.grade} onChange={(v) => setF('grade', v)} options={[['1', '1등급'], ['2', '2등급'], ['3', '3등급'], ['4', '4등급']]} />
        <SelectEdit label="추적관리 대상" value={form.track} onChange={(v) => setF('track', v)} options={[['N', '비대상'], ['Y', '대상 (Y)']]} />
        <SelectEdit label="인허가 업종 (대분류)" value={form.cat1} onChange={(v) => setF('cat1', v)} options={[['', '선택 안 함'], ...MDCAT1.map((cc) => [cc, cc])]} />
        <SelectEdit label="인허가 업종 (중분류)" value={form.cat2} onChange={(v) => setF('cat2', v)} disabled={!form.cat1 || form.cat1 === '기타'} options={[['', '선택 안 함'], ...(MDCAT[form.cat1] || []).map((cc) => [cc, cc])]} />
        {(form.cat1 === '기타' || form.cat2 === '기타') && (
          <FieldEdit label="기타 업종 직접 입력" value={form.etc} onChange={(v) => setF('etc', v)} />
        )}
        <SelectEdit label="신체 접촉" value={form.contact} onChange={(v) => setF('contact', v)} options={[['none', '신체 비접촉'], ['surface', '피부·점막 접촉 (Surface)'], ['external', '외부 통신 (External Communicating)'], ['implantable', '임플란트 (Implantable)']]} />
        <SelectEdit label="소프트웨어" value={form.software} onChange={(v) => setF('software', v)} options={[['none', 'SW 없음'], ['embedded', '내장 SW'], ['samd', '독립형 SW (SaMD)']]} />
        <FieldEdit label="의도된 사용" value={form.intendedUse} onChange={(v) => setF('intendedUse', v)} multiline />
      </div>

      <div className="pt-3">
        <FieldEdit
          label="추가 사유 (CCR 필수 — ISO 13485 §4.2.4)"
          value={reason}
          onChange={setReason}
          placeholder="예: 신규 라인업 출시 / 제품 포트폴리오 확장"
          required
        />
      </div>

      <div className="flex justify-end gap-2 pt-3">
        <button onClick={onCancel} className="btn-ghost">
          취소
        </button>
        <button onClick={save} className="btn-primary">
          추가 · CCR 발의
        </button>
      </div>

      <ComplianceFooter
        regs={['ISO 13485 §7.3', '21 CFR 820.30', 'MDR Annex II']}
      />
    </div>
  )
}

function SelectEdit({ label, value, onChange, options, disabled }) {
  return (
    <div>
      <label
        className="font-mono text-[10px] tracking-[0.16em] uppercase"
        style={{ color: 'var(--ink-mute)' }}
      >
        {label}
      </label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="input-base mt-1 w-full text-[13px]"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </div>
  )
}

function ProductPanel({ product, company, onAction }) {
  const canEdit = permissions.can('onb.product.edit')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(null)
  const [reason, setReason] = useState('')

  const productEid = eid(
    ENTITY_TYPES.PRODUCT,
    product?.id || product?.classNo || product?.modelNumber || 'main'
  )

  const ccrs = useMemo(
    () => getRecordsForEntity(productEid),
    [productEid, editing]
  )

  const startEdit = () => {
    if (!requirePermission('onb.product.edit')) return
    setDraft({ ...product })
    setReason('')
    setEditing(true)
  }

  const cancelEdit = () => {
    setEditing(false)
    setDraft(null)
    setReason('')
  }

  const saveEdit = () => {
    if (!reason.trim()) {
      alert('변경 사유는 필수입니다 (CCR — ISO 13485 §4.2.4).')
      return
    }
    const before = { ...product }
    const next = { ...product, ...draft }

    // 온보딩 상태 업데이트 (제품 배열에서 해당 제품만 갱신)
    const ob = onboarding.load()
    const list = Array.isArray(ob.products) ? ob.products.slice() : []
    const idx = list.findIndex((p) => (p.id || 'main') === (product.id || 'main'))
    if (idx >= 0) list[idx] = next
    else list.push(next.id ? next : { ...next, id: 'main' })
    onboarding.save({ ...ob, products: list })

    // CCR 자동 발의
    commitChange({
      targetEid: productEid,
      action: CHANGE_ACTIONS.UPDATE,
      before,
      after: next,
      reason: reason.trim(),
    })

    setEditing(false)
    setDraft(null)
    setReason('')
    onAction('제품 정보 수정 · CCR 자동 발의')
    setTimeout(() => window.location.reload(), 600)
  }

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      {/* 좌: 제품 카드 */}
      <div className="lg:col-span-2">
        <div className="card-base p-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <span
                className="font-mono text-[10px] tracking-[0.18em] uppercase"
                style={{ color: 'var(--moss)' }}
              >
                PRODUCT MASTER · {productEid}
              </span>
              <div
                className="font-display text-[22px] mt-1 leading-tight"
                style={{ color: 'var(--ink)', fontWeight: 500 }}
              >
                {product.name}
              </div>
              <div
                className="font-mono text-[12px] mt-0.5"
                style={{ color: 'var(--ink-mute)' }}
              >
                {[product.classNo, company?.name].filter(Boolean).join(' · ')}
              </div>
            </div>
            {!editing && canEdit && (
              <button onClick={startEdit} className="btn-ghost text-[12px]">
                <Edit3 size={12} /> 수정
              </button>
            )}
          </div>

          {!editing ? (
            <>
              <div
                className="grid md:grid-cols-2 gap-4 pt-3"
                style={{ borderTop: '1px solid var(--line)' }}
              >
                <Field label="품목명 (식약처)" value={product.itemName || product.name || '-'} />
                <Field label="분류번호" value={product.classNo || '-'} />
                <Field
                  label="등급 (Class)"
                  value={
                    product.grade
                      ? `${product.grade}등급`
                      : product.classification
                      ? `Class ${product.classification}`
                      : '미분류'
                  }
                />
                <Field
                  label="인허가 업종"
                  value={
                    [product.cat1, product.cat2].filter(Boolean).join(' › ') ||
                    product.etc ||
                    '-'
                  }
                />
                <Field
                  label="신체 접촉"
                  value={CONTACT_LABELS[product.contact] || '-'}
                />
                <Field
                  label="소프트웨어"
                  value={SW_LABELS[product.software] || product.software || '-'}
                />
                <Field
                  label="추적관리 대상"
                  value={product.track === 'Y' ? '대상 (Y)' : '비대상'}
                />
                {product.intendedUse && (
                  <Field label="의도된 사용" value={product.intendedUse} />
                )}
              </div>
            </>
          ) : (
            <div
              className="space-y-3 pt-3"
              style={{ borderTop: '1px solid var(--line)' }}
            >
              <FieldEdit
                label="제품명"
                value={draft.name}
                onChange={(v) => setDraft({ ...draft, name: v })}
              />
              <FieldEdit
                label="모델 번호"
                value={draft.modelNumber}
                onChange={(v) => setDraft({ ...draft, modelNumber: v })}
              />
              <FieldEdit
                label="의도된 사용"
                value={draft.intendedUse}
                onChange={(v) => setDraft({ ...draft, intendedUse: v })}
                multiline
              />
              <FieldEdit
                label="분류 (예: IIa, IIb, III)"
                value={draft.classification || ''}
                onChange={(v) => setDraft({ ...draft, classification: v })}
              />
              <FieldEdit
                label="변경 사유 (CCR 필수 — ISO 13485 §4.2.4)"
                value={reason}
                onChange={setReason}
                placeholder="예: 임상 평가 결과 의도된 사용 명확화 / 모델 번호 글로벌 표기 통일"
                required
              />

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={cancelEdit} className="btn-ghost">
                  취소
                </button>
                <button onClick={saveEdit} className="btn-primary">
                  저장 · CCR 발의
                </button>
              </div>
            </div>
          )}

          <ComplianceFooter
            regs={['ISO 13485 §7.3', '21 CFR 820.30', 'MDR Annex II']}
          />
        </div>
      </div>

      {/* 우: 변경 이력 */}
      <div className="lg:col-span-1">
        <ChangeHistoryPanel ccrs={ccrs} />
      </div>
    </div>
  )
}

const CONTACT_LABELS = {
  none: '신체 비접촉',
  surface: '피부·점막 접촉 (Surface)',
  external: '외부 통신 (External Communicating)',
  implantable: '임플란트 (Implantable)',
}

const SW_LABELS = {
  none: 'SW 없음',
  embedded: '내장 SW',
  samd: '독립형 SW (SaMD)',
}

/* ================================================================
   PROD-002 공정 패널
   ================================================================ */
function ProcessPanel({ onAction }) {
  const allBlocks = useMemo(() => [...PROCESS_BLOCKS, ...loadCustomBlocks()], [])
  const findBlock = (id) => allBlocks.find((b) => b.id === id)
  const [list, setList] = useState(() => {
    const ob = onboarding.load()
    return (ob.processes || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0))
  })
  const [picking, setPicking] = useState(false)
  const [q, setQ] = useState('')

  const persist = (next) => {
    const ordered = next.map((p, i) => ({ ...p, order: i + 1 }))
    setList(ordered)
    const ob = onboarding.load()
    onboarding.save({ ...ob, processes: ordered })
    onAction && onAction('공정 순서가 저장되었습니다')
  }
  const addBlock = (b) => { persist([...list, { id: 'p' + Date.now(), blockId: b.id, order: list.length + 1 }]); setPicking(false); setQ('') }
  const del = (id) => persist(list.filter((p) => p.id !== id))
  const move = (i, dir) => { const j = i + dir; if (j < 0 || j >= list.length) return; const n = list.slice(); const t = n[i]; n[i] = n[j]; n[j] = t; persist(n) }
  const loadDefault = () => { if (list.length && !window.confirm('현재 공정을 기본 6단계 체인으로 대체할까요?')) return; persist(DEFAULT_CHAIN.map((b, i) => ({ id: 'p' + Date.now() + '-' + i, blockId: b.blockId, order: i + 1, customName: b.customName }))) }

  const stats = useMemo(() => {
    const S = { sop: new Set(), insp: new Set(), std: new Set(), risk: new Set() }
    list.forEach((p) => { const b = findBlock(p.blockId); if (!b) return; b.sopAuto?.forEach((x) => S.sop.add(x)); b.inspections?.forEach((x) => S.insp.add(x)); b.standards?.forEach((x) => S.std.add(x)); b.risks?.forEach((x) => S.risk.add(x)) })
    return { sops: S.sop.size, inspections: S.insp.size, standards: S.std.size, risks: S.risk.size }
  }, [list]) // eslint-disable-line

  const blockChoices = allBlocks.filter((b) => !q || (b.name || '').toLowerCase().includes(q.toLowerCase()) || (b.en || '').toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-4 gap-3">
        <StatCard label="SOP 자동" value={stats.sops} hint="자동 매핑된 표준작업" />
        <StatCard label="검사 항목 (자동)" value={stats.inspections} hint="블록별 매핑" />
        <StatCard label="표준" value={stats.standards} hint="ISO/FDA 인용 조항" />
        <StatCard label="위험 ID" value={stats.risks} hint="ISO 14971 항목" />
      </div>

      <div className="card-base p-3">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
          <div className="text-[13px]" style={{ color: 'var(--ink)' }}>제조·검사 공정 순서 ({list.length}단계)</div>
          <div className="flex gap-2">
            <button onClick={loadDefault} className="btn-ghost text-[12px]">기본 공정체인 불러오기</button>
            <button onClick={() => setPicking((v) => !v)} className="btn-primary text-[12px]" style={{ background: 'var(--rust)' }}>+ 공정 추가</button>
          </div>
        </div>
        <div className="text-[11.5px] mb-2" style={{ color: 'var(--ink-mute)' }}>여기서 정의한 순서대로 작업 지시 단계가 발급됩니다. 진행 중 작업 지시는 발급 시점 스냅샷이 유지됩니다(시간 잠금).</div>
        {picking && (
          <div className="rounded-md p-2" style={{ background: 'var(--bg-soft)' }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="공정 블록 검색…" className="w-full bg-transparent outline-none text-[12.5px] mb-2 px-1" />
            <div className="grid sm:grid-cols-2 gap-1.5 max-h-64 overflow-auto">
              {blockChoices.map((b) => {
                const cat = PROCESS_CATEGORIES.find((c) => c.id === b.category)
                return (
                  <button key={b.id} onClick={() => addBlock(b)} className="text-left px-2.5 py-1.5 rounded-md text-[12px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                    <span style={{ color: 'var(--ink)' }}>{b.name}</span>
                    {cat && <span className="ml-1.5" style={{ color: 'var(--ink-faint)' }}>· {cat.name}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {list.length === 0 ? (
          <div className="card-base p-6 text-center text-[13px]" style={{ color: 'var(--ink-mute)', borderStyle: 'dashed' }}>
            등록된 공정이 없습니다. "기본 공정체인 불러오기" 또는 "공정 추가"로 시작하세요.
          </div>
        ) : (
          list.map((p, idx) => {
            const block = findBlock(p.blockId)
            const cat = block && PROCESS_CATEGORIES.find((c) => c.id === block.category)
            return (
              <div key={p.id || idx} className="card-base p-3 flex items-center gap-3">
                <span className="font-mono text-[12px] w-6 text-center" style={{ color: 'var(--rust)' }}>{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] truncate" style={{ color: 'var(--ink)' }}>{p.customName || block?.name || p.blockId}{p.customName && block ? ' · ' + block.name : ''}</div>
                  {cat && <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{cat.name}{block?.standards?.length ? ' · ' + block.standards.join(', ') : ''}</div>}
                </div>
                <button onClick={() => move(idx, -1)} disabled={idx === 0} className="px-2 py-1 rounded-md text-[13px] disabled:opacity-30" style={{ border: '1px solid var(--line)' }}>▲</button>
                <button onClick={() => move(idx, 1)} disabled={idx === list.length - 1} className="px-2 py-1 rounded-md text-[13px] disabled:opacity-30" style={{ border: '1px solid var(--line)' }}>▼</button>
                <button onClick={() => del(p.id)} className="px-2 py-1 rounded-md text-[12px]" style={{ color: 'var(--rust)', border: '1px solid var(--line)' }}>삭제</button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function ProcessRow({ index, process, block, category }) {
  const [expanded, setExpanded] = useState(false)
  const blockEid = eid(ENTITY_TYPES.PROCESS_BLOCK, block.id)
  const tplCount = inspectionTemplates.forBlock(block.id).length

  return (
    <div className="card-base p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 text-left"
      >
        <span
          className="font-mono text-[11px] w-6 h-6 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: 'var(--bg-soft)',
            color: 'var(--ink-mute)',
          }}
        >
          {index}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span
              className="text-[14px]"
              style={{ color: 'var(--ink)', fontWeight: 500 }}
            >
              {process.customName || block.name}
            </span>
            <span
              className="font-display italic text-[11.5px]"
              style={{ color: 'var(--ink-mute)' }}
            >
              {block.en}
            </span>
            {category && (
              <span
                className="font-mono text-[9.5px] px-1.5 py-0.5 rounded"
                style={{
                  background: `var(--${category.color}-soft)`,
                  color: `var(--${category.color})`,
                }}
              >
                {category.name}
              </span>
            )}
            {block.isSpecialProcess && (
              <span
                className="font-mono text-[9px] px-1 rounded"
                style={{
                  background: 'var(--rust-soft)',
                  color: 'var(--rust)',
                  fontWeight: 600,
                }}
                title="특수공정 (ISO 13485 §7.5.6)"
              >
                SPECIAL
              </span>
            )}
            <span
              className="font-mono text-[10px] ml-auto"
              style={{ color: 'var(--ink-faint)' }}
            >
              {tplCount}개 검사 항목
            </span>
          </div>
          <div
            className="text-[12px] mt-0.5"
            style={{ color: 'var(--ink-mute)' }}
          >
            {block.desc}
          </div>
        </div>
        <ChevronRight
          size={14}
          style={{
            color: 'var(--ink-faint)',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        />
      </button>

      {expanded && (
        <div
          className="mt-3 pt-3 grid md:grid-cols-2 gap-4"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          <ChipBlock
            title="자동 SOP"
            items={block.sopAuto || []}
            color="moss"
          />
          <ChipBlock
            title="자동 검사"
            items={block.inspections || []}
            color="sky"
          />
          <ChipBlock
            title="적용 표준"
            items={block.standards || []}
            color="ink"
            mono
          />
          <ChipBlock
            title="위험"
            items={block.risks || []}
            color="rust"
          />
        </div>
      )}
    </div>
  )
}

function ChipBlock({ title, items, color, mono }) {
  if (!items || items.length === 0) return null
  const TONES = {
    moss: { bg: 'var(--leaf-soft)', fg: 'var(--moss)' },
    sky: { bg: 'var(--sky-soft)', fg: 'var(--sky)' },
    rust: { bg: 'var(--rust-soft)', fg: 'var(--rust)' },
    ink: { bg: 'var(--bg-soft)', fg: 'var(--ink)' },
  }
  const t = TONES[color] || TONES.ink
  return (
    <div>
      <div
        className="font-mono text-[10px] tracking-[0.16em] uppercase mb-1.5"
        style={{ color: 'var(--ink-faint)' }}
      >
        {title}
      </div>
      <div className="flex flex-wrap gap-1">
        {items.map((i, idx) => (
          <span
            key={idx}
            className={mono ? 'font-mono text-[10.5px]' : 'text-[11.5px]'}
            style={{
              background: t.bg,
              color: t.fg,
              padding: '2px 8px',
              borderRadius: 4,
            }}
          >
            {i}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ================================================================
   PROD-003 검사 항목 마스터
   ================================================================ */
function InspectionPanel({ onAction }) {
  const allBlocks = useMemo(
    () => [...PROCESS_BLOCKS, ...loadCustomBlocks()],
    []
  )
  const findBlock = (id) => allBlocks.find((b) => b.id === id)

  // 모든 블록 × 모든 템플릿 통합 조회
  const ob = onboarding.load() || {}
  const usedBlockIds = new Set((ob.processes || []).map((p) => p.blockId))

  const allTemplates = useMemo(() => {
    const map = inspectionTemplates.loadAll()
    const out = []
    Object.entries(map).forEach(([blockId, list]) => {
      const block = findBlock(blockId)
      if (!block) return
      list.forEach((t) => {
        out.push({
          ...t,
          blockId,
          blockName: block.name,
          inUse: usedBlockIds.has(blockId),
        })
      })
    })
    return out
  }, [allBlocks])

  const [search, setSearch] = useState('')
  const [filterCriticality, setFilterCriticality] = useState('all')

  const filtered = allTemplates.filter((t) => {
    if (search) {
      const q = search.toLowerCase()
      if (
        !t.label?.toLowerCase().includes(q) &&
        !t.blockName?.toLowerCase().includes(q)
      )
        return false
    }
    if (filterCriticality !== 'all' && t.criticality !== filterCriticality)
      return false
    return true
  })

  // 통계
  const stats = useMemo(() => {
    const counts = { Critical: 0, Major: 0, Minor: 0 }
    allTemplates.forEach((t) => {
      if (counts[t.criticality] !== undefined) counts[t.criticality]++
    })
    return counts
  }, [allTemplates])

  return (
    <div className="space-y-4">
      {/* 통계 */}
      <div className="grid md:grid-cols-3 gap-3">
        <StatCard
          label="Critical 검사 항목"
          value={stats.Critical}
          hint="안전·필수 성능"
          tone="rust"
        />
        <StatCard
          label="Major 검사 항목"
          value={stats.Major}
          hint="주요 품질"
          tone="amber"
        />
        <StatCard
          label="Minor 검사 항목"
          value={stats.Minor}
          hint="외관·일반"
          tone="ink-mute"
        />
      </div>

      {/* 필터 */}
      <div className="card-base p-3 flex items-center gap-2 flex-wrap">
        <div
          className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-md"
          style={{ background: 'var(--bg-soft)' }}
        >
          <Search size={13} style={{ color: 'var(--ink-faint)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="검사 항목·공정 검색…"
            className="bg-transparent outline-none text-[12.5px] flex-1"
          />
        </div>
        <div className="flex gap-1">
          {[
            { id: 'all', label: '전체' },
            { id: 'Critical', label: 'Critical' },
            { id: 'Major', label: 'Major' },
            { id: 'Minor', label: 'Minor' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterCriticality(f.id)}
              className="text-[11.5px] px-2.5 py-1 rounded-md transition"
              style={{
                background:
                  filterCriticality === f.id ? 'var(--moss)' : 'var(--bg-soft)',
                color:
                  filterCriticality === f.id ? 'var(--bg)' : 'var(--ink-mute)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 안내 */}
      <div
        className="rounded-lg p-3 flex items-start gap-2 text-[12px]"
        style={{
          background: 'var(--bg-soft)',
          color: 'var(--ink-mute)',
        }}
      >
        <AlertCircle
          size={13}
          style={{ color: 'var(--ink-mute)', marginTop: 2 }}
        />
        <div>
          검사 항목의 신규 정의·수정·삭제는 <strong>eBR 화면(작업 지시
          진행 중)</strong> 또는 <strong>온보딩 ONB-003</strong>에서
          이루어집니다. 본 화면은 통합 조회·감사 추적을 위한 마스터 뷰입니다. 모든 변경은 CCR 자동 발의되며 진행 중 작업 지시는 시간 잠금됩니다.
        </div>
      </div>

      {/* 목록 */}
      {filtered.length === 0 ? (
        <div
          className="card-base p-6 text-center text-[13px]"
          style={{ color: 'var(--ink-mute)', borderStyle: 'dashed' }}
        >
          {allTemplates.length === 0
            ? '정의된 검사 항목이 없습니다. eBR 화면에서 매니저가 추가할 수 있습니다.'
            : '검색·필터 결과 없음'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <InspectionTemplateRow key={t.id} template={t} />
          ))}
        </div>
      )}
    </div>
  )
}

function InspectionTemplateRow({ template }) {
  const sevColor = {
    Critical: 'var(--rust)',
    Major: 'var(--amber)',
    Minor: 'var(--ink-mute)',
  }[template.criticality]

  const tplEid = eid(ENTITY_TYPES.INSPECTION_TEMPLATE, template.id)
  const ccrCount = getRecordsForEntity(tplEid).length

  return (
    <div
      className="card-base p-3.5"
      style={{ borderLeft: `3px solid ${sevColor}` }}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="font-mono text-[10px] tracking-wider px-1.5 py-0.5 rounded uppercase"
          style={{
            background: sevColor,
            color: 'var(--bg)',
            fontWeight: 500,
          }}
        >
          {template.criticality}
        </span>
        <span className="text-[14px]" style={{ color: 'var(--ink)', fontWeight: 500 }}>
          {template.label}
        </span>
        {template.unit && (
          <span
            className="font-mono text-[11px]"
            style={{ color: 'var(--ink-mute)' }}
          >
            ({template.unit})
          </span>
        )}
        <span
          className="text-[11.5px]"
          style={{ color: 'var(--ink-mute)' }}
        >
          ← {template.blockName}
        </span>
        {template.inUse ? (
          <span
            className="font-mono text-[9.5px] px-1.5 py-0.5 rounded ml-auto"
            style={{
              background: 'var(--leaf-soft)',
              color: 'var(--moss)',
            }}
          >
            현재 사용 중
          </span>
        ) : (
          <span
            className="font-mono text-[9.5px] px-1.5 py-0.5 rounded ml-auto"
            style={{
              background: 'var(--bg-soft)',
              color: 'var(--ink-faint)',
            }}
          >
            라이브러리
          </span>
        )}
      </div>
      <div
        className="font-mono text-[11px] mt-1.5 flex items-center gap-3 flex-wrap"
        style={{ color: 'var(--ink-faint)' }}
      >
        <span>
          규격: {template.specMin}~{template.specMax}
          {template.unit ? ' ' + template.unit : ''}
        </span>
        {template.specNominal !== '' && template.specNominal != null && (
          <span>공칭: {template.specNominal}</span>
        )}
        {template.method && <span>방법: {template.method}</span>}
        <span>v{template.version || 1}</span>
        {ccrCount > 0 && (
          <span style={{ color: 'var(--amber)' }}>
            <History size={9} style={{ display: 'inline' }} /> CCR {ccrCount}건
          </span>
        )}
      </div>
    </div>
  )
}

/* ================================================================
   변경 이력 패널 (CCR)
   ================================================================ */
function ChangeHistoryPanel({ ccrs }) {
  return (
    <div className="card-base p-4">
      <div className="flex items-center gap-2 mb-3">
        <GitBranch size={13} style={{ color: 'var(--moss)' }} />
        <span
          className="font-mono text-[10px] tracking-[0.16em] uppercase"
          style={{ color: 'var(--ink-mute)' }}
        >
          CHANGE HISTORY · 변경 이력
        </span>
        <span
          className="font-mono text-[10px] px-1.5 py-0.5 rounded ml-auto"
          style={{
            background: 'var(--leaf-soft)',
            color: 'var(--moss)',
            fontWeight: 500,
          }}
        >
          {ccrs.length}
        </span>
      </div>

      {ccrs.length === 0 ? (
        <div
          className="text-[12px] text-center py-4 rounded"
          style={{
            background: 'var(--bg-soft)',
            color: 'var(--ink-faint)',
          }}
        >
          변경 이력 없음
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {ccrs
            .slice()
            .reverse()
            .slice(0, 20)
            .map((r) => (
              <div
                key={r.id}
                className="rounded-md p-2.5 text-[11.5px]"
                style={{ background: 'var(--bg-soft)' }}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                    style={{
                      background:
                        r.action === 'CREATE'
                          ? 'var(--leaf-soft)'
                          : r.action === 'DELETE'
                          ? 'var(--rust-soft)'
                          : 'var(--amber-soft)',
                      color:
                        r.action === 'CREATE'
                          ? 'var(--moss)'
                          : r.action === 'DELETE'
                          ? 'var(--rust)'
                          : 'var(--amber)',
                    }}
                  >
                    {r.action}
                  </span>
                  <span
                    className="font-mono text-[10px]"
                    style={{ color: 'var(--ink-faint)' }}
                  >
                    {r.id}
                  </span>
                </div>
                <div
                  className="mt-1"
                  style={{ color: 'var(--ink)' }}
                >
                  {r.reason}
                </div>
                <div
                  className="font-mono text-[10px] mt-1"
                  style={{ color: 'var(--ink-faint)' }}
                >
                  {new Date(r.performedAt).toLocaleString('ko-KR')} ·{' '}
                  {r.performedBy.name} ({r.performedBy.levelLabel})
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

/* ================================================================
   부속 컴포넌트
   ================================================================ */
function StatCard({ label, value, hint, tone = 'moss' }) {
  const tones = {
    moss: { bg: 'var(--leaf-soft)', fg: 'var(--moss)' },
    rust: { bg: 'var(--rust-soft)', fg: 'var(--rust)' },
    amber: { bg: 'var(--amber-soft)', fg: 'var(--amber)' },
    'ink-mute': { bg: 'var(--bg-soft)', fg: 'var(--ink-mute)' },
  }
  const t = tones[tone] || tones.moss
  return (
    <div className="card-base p-3.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[11.5px]" style={{ color: 'var(--ink-mute)' }}>
          {label}
        </span>
        <span
          className="font-display text-[24px]"
          style={{ color: t.fg, fontWeight: 500 }}
        >
          {value}
        </span>
      </div>
      {hint && (
        <div
          className="text-[10.5px] mt-0.5"
          style={{ color: 'var(--ink-faint)' }}
        >
          {hint}
        </div>
      )}
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <div
        className="font-mono text-[10px] tracking-[0.16em] uppercase"
        style={{ color: 'var(--ink-faint)' }}
      >
        {label}
      </div>
      <div className="mt-0.5 text-[13px]" style={{ color: 'var(--ink)' }}>
        {value}
      </div>
    </div>
  )
}

function FieldEdit({
  label,
  value,
  onChange,
  multiline,
  placeholder,
  required,
}) {
  return (
    <div>
      <label
        className="font-mono text-[10px] tracking-[0.16em] uppercase"
        style={{ color: required ? 'var(--rust)' : 'var(--ink-mute)' }}
      >
        {label}
        {required && ' *'}
      </label>
      {multiline ? (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="input-base mt-1 w-full text-[13px]"
          rows={2}
        />
      ) : (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="input-base mt-1 w-full text-[13px]"
        />
      )}
    </div>
  )
}

function ComplianceFooter({ regs }) {
  return (
    <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
      <div
        className="font-mono text-[10px] tracking-[0.16em] uppercase mb-1.5"
        style={{ color: 'var(--ink-faint)' }}
      >
        REGULATORY MAPPING
      </div>
      <div className="flex flex-wrap gap-1">
        {regs.map((r, i) => (
          <span
            key={i}
            className="font-mono text-[10px] px-1.5 py-0.5 rounded"
            style={{ background: 'var(--leaf-soft)', color: 'var(--moss)' }}
          >
            {r}
          </span>
        ))}
      </div>
    </div>
  )
}
