import React, { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import {
  PackageSearch,
  Workflow,
  FlaskConical,
  Edit3,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Search,
  AlertCircle,
  GitBranch,
  History,
  ArrowRight,
  FileText,
  Layers,
  CheckCircle2,
  Circle,
  Sparkles,
  Upload,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'
import { permissions, requirePermission, LEVEL_LABEL } from '../../lib/permissions'
import { onboarding, getProductProcesses, setProductProcesses, productKeyOf, getAllUsedBlockIds } from '../../lib/onboardingState'
import { PROCESS_BLOCKS, PROCESS_CATEGORIES } from '../../lib/processBlocks'
import { inspectionTemplates, CRITICALITY_OPTIONS } from '../../lib/inspectionTemplates'
import { commitChange, CHANGE_ACTIONS, getRecordsForEntity } from '../../lib/changeControl'
import { ENTITY_TYPES, eid } from '../../lib/entityRegistry'
import ProductDocumentsPanel from './ProductDocumentsPanel'
import { productDocs } from '../../lib/productDocsState'
import {
  PRODUCT_KIND,
  productKind,
  DESIGN_STAGES,
  designStepsOf,
  designProgressOf,
  licensedProgressOf,
  productModels,
} from '../../lib/productLifecycleState'
import { extractLicenseFromPdf } from '../../lib/licenseExtract'
import { STERILE_METHODS, SAL_LEVELS, BIOBURDEN_METHODS, SPEC_STATUSES } from '../../lib/sterileSpecConstants'
import { CLEAN_CLASSES, CLEANING_METHODS, CONTAMINATION_TYPES, MONITOR_FREQS, CLEAN_STATUSES, CLEAN_APPLIES_WHEN } from '../../lib/cleanlinessSpecConstants'
import { STORAGE_CONDITIONS, STERILITY, PACKAGING_TYPES } from '../../lib/preservationSpecConstants'
import { INSP_TYPES } from '../../lib/inspectionStandardConstants'
import CustomerReqHub from '../customer-req/CustomerReqHub'
import DesignHistoryHub from '../dhf/DesignHistoryHub'
import DeviceFileHub from '../device-file/DeviceFileHub'
import RiskHub from '../risk/RiskHub'
import ValidationHub from '../validation/ValidationHub'
import ProductionControlHub from '../production-control/ProductionControlHub'

const CUSTOM_BLOCK_KEY = 'qualytree.customBlocks'

function loadCustomBlocks() {
  try {
    const raw = localStorage.getItem(CUSTOM_BLOCK_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveCustomBlocks(blocks) {
  try {
    localStorage.setItem(CUSTOM_BLOCK_KEY, JSON.stringify(blocks))
  } catch {}
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

  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState(() => searchParams.get('tab') || 'product') // product | process | inspection
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
  const deepLinkProductId = searchParams.get('productId')
  const [selId, setSelId] = useState(deepLinkProductId || null)
  const product = products.find((p) => (p.id || 'main') === selId) || products[0] || null
  const processes = ob.processes || []

  const hasOnboarding = !!(company?.name) || products.length > 0
  const canEditProduct = permissions.can('onb.product.edit')
  const [addingProduct, setAddingProduct] = useState(false)
  // 제품 탭 전용: 카드 그리드(목록) ↔ 상세(기본정보/모델 목록/설계 계획) 전환
  const [productView, setProductView] = useState(deepLinkProductId ? 'detail' : 'grid') // grid | detail
  const [detailTab, setDetailTab] = useState(searchParams.get('detailTab') || 'info') // info | models | design
  const openProduct = (p, tabName) => {
    setSelId(p.id || 'main')
    setDetailTab(tabName || 'info')
    setProductView('detail')
    setAddingProduct(false)
  }

  return (
    <AppLayout
      user={user}
      title="제품 · 공정"
      subtitle="허가증 단위 통합 관리 · 설계개발 전주기"
    >
      <HubBanner icon={PackageSearch} title="제품 관리" subtitle="제품 등록 및 관리" color="#475569" />
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
            
            {/* 탭 내용 */}
            {tab === 'product' && (
              <div className="space-y-3">
                {productView === 'grid' && !addingProduct && (
                  <ProductCardGrid
                    products={products}
                    onOpen={openProduct}
                    canEdit={canEditProduct}
                    onAdd={() => setAddingProduct(true)}
                  />
                )}
                {addingProduct && (
                  <AddProductPanel
                    onCancel={() => setAddingProduct(false)}
                    onSaved={(p) => {
                      setAddingProduct(false)
                      showToast(productKind(p) === PRODUCT_KIND.NEW ? '신규 제품이 등록되었습니다 · 설계 계획을 시작하세요 · CCR 자동 발의' : '제품이 등록되었습니다 · CCR 자동 발의')
                      setTimeout(() => window.location.reload(), 600)
                    }}
                  />
                )}
                {productView === 'detail' && !addingProduct && (
                  product ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <button onClick={() => setProductView('grid')} className="btn-ghost text-[12px]">
                          <ChevronLeft size={13} /> 제품 목록으로
                        </button>
                        <div className="flex gap-1 rounded-lg p-1 flex-wrap" style={{ background: 'var(--bg-soft)' }}>
                          <DetailTabBtn active={detailTab === 'info'} onClick={() => setDetailTab('info')} label="기본정보" />
                          <DetailTabBtn active={detailTab === 'models'} onClick={() => setDetailTab('models')} label="모델 목록" count={productModels.getForProduct(productKeyOf(product)).length} />
                          {productKind(product) === PRODUCT_KIND.NEW && (
                            <DetailTabBtn active={detailTab === 'design'} onClick={() => setDetailTab('design')} label="설계 계획" />
                          )}
                          <DetailTabBtn active={detailTab === 'customer-req'} onClick={() => setDetailTab('customer-req')} label="고객요구사항" />
                          <DetailTabBtn active={detailTab === 'dhf'} onClick={() => setDetailTab('dhf')} label="DHF" />
                          <DetailTabBtn active={detailTab === 'dmr'} onClick={() => setDetailTab('dmr')} label="DMR" />
                          <DetailTabBtn active={detailTab === 'risk'} onClick={() => setDetailTab('risk')} label="위험관리" />
                          <DetailTabBtn active={detailTab === 'validation'} onClick={() => setDetailTab('validation')} label="밸리데이션" />
                          <DetailTabBtn active={detailTab === 'pcp'} onClick={() => setDetailTab('pcp')} label="생산제어계획" />
                        <DetailTabBtn active={detailTab === 'process'} onClick={() => setDetailTab('process')} label="공정" />
                        <DetailTabBtn active={detailTab === 'inspection'} onClick={() => setDetailTab('inspection')} label="검사항목" />
                        </div>
                      </div>
                      {detailTab === 'info' && <ProductPanel key={product?.id || 'main'} product={product} company={company} onAction={showToast} onDeleted={() => { setProductView('grid'); setTimeout(() => window.location.reload(), 400) }} />}
                      {detailTab === 'models' && <ModelListPanel key={'models-' + (product?.id || 'main')} product={product} onAction={showToast} />}
                      {detailTab === 'design' && productKind(product) === PRODUCT_KIND.NEW && (
                        <DesignStagePanel key={'design-' + (product?.id || 'main')} product={product} onAction={showToast} />
                      )}
                      {detailTab === 'customer-req' && (
                        <CustomerReqHub key={'creq-' + productKeyOf(product)} embedded productKey={productKeyOf(product)} productLabel={product.name} />
                      )}
                      {detailTab === 'dhf' && (
                        <DesignHistoryHub key={'dhf-' + productKeyOf(product)} embedded productKey={productKeyOf(product)} productLabel={product.name} />
                      )}
                      {detailTab === 'dmr' && (
                        <DeviceFileHub key={'dmr-' + productKeyOf(product)} embedded productKey={productKeyOf(product)} productLabel={product.name} />
                      )}
                      {detailTab === 'risk' && (
                        <RiskHub key={'risk-' + productKeyOf(product)} embedded productKey={productKeyOf(product)} productLabel={product.name} />
                      )}
                      {detailTab === 'validation' && (
                        <ValidationHub key={'val-' + productKeyOf(product)} embedded role="quality" productKey={productKeyOf(product)} productLabel={product.name} />
                      )}
                      {detailTab === 'pcp' && (
                        <ProductionControlHub key={'pcp-' + productKeyOf(product)} embedded productKey={productKeyOf(product)} productLabel={product.name} />
                      )}
                      {detailTab === 'process' && (
                        <ProcessPanel key={'proc-' + productKeyOf(product)} product={product} products={products} selId={selId} setSelId={setSelId} onAction={showToast} />
                      )}
                      {detailTab === 'inspection' && (
                        <InspectionPanel key={'ins-' + productKeyOf(product)} product={product} products={products} selId={selId} setSelId={setSelId} onAction={showToast} />
                      )}
                    </div>
                  ) : (
                    <div className="card-base p-6 text-center" style={{ borderStyle: 'dashed' }}>
                      <PackageSearch size={28} style={{ color: 'var(--ink-faint)', margin: '0 auto' }} strokeWidth={1.4} />
                      <div className="mt-3 text-[13.5px]" style={{ color: 'var(--ink)' }}>등록된 제품이 없습니다</div>
                      <div className="mt-1 text-[12px]" style={{ color: 'var(--ink-mute)' }}>'제품 등록' 버튼으로 첫 제품을 등록하세요.</div>
                    </div>
                  )
                )}
              </div>
            )}
            {tab === 'process' && (
              <ProcessPanel key={productKeyOf(product)} product={product} products={products} selId={selId} setSelId={setSelId} onAction={showToast} />
            )}
            {tab === 'inspection' && (
              <InspectionPanel onAction={showToast} />
            )}
            {tab === 'documents' && (
              <ProductDocumentsPanel key={product?.id || 'main'} product={product} onAction={showToast} initialSub={searchParams.get('docSub')} />
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

/* ================================================================
   제품 카드 그리드 — 제품 탭 기본 화면 (기허가/신규 카드 + 페이지네이션)
   ================================================================ */
function DetailTabBtn({ active, onClick, label, count }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-md text-[12.5px] font-medium transition flex items-center gap-1.5"
      style={active ? { background: 'var(--bg-card)', color: 'var(--ink)', boxShadow: '0 1px 3px rgba(15,26,20,0.12)' } : { color: 'var(--ink-mute)' }}
    >
      {label}
      {typeof count === 'number' && (
        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: active ? 'var(--leaf-soft)' : 'var(--bg-soft)', color: active ? 'var(--moss)' : 'var(--ink-faint)' }}>
          {count}
        </span>
      )}
    </button>
  )
}

const PRODUCT_PAGE_SIZE = 9

function ProductCardGrid({ products, onOpen, canEdit, onAdd }) {
  const [page, setPage] = useState(0)
  const totalPages = Math.max(1, Math.ceil(products.length / PRODUCT_PAGE_SIZE))
  const pageItems = products.slice(page * PRODUCT_PAGE_SIZE, page * PRODUCT_PAGE_SIZE + PRODUCT_PAGE_SIZE)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-start gap-2 text-[12px] px-3 py-2 rounded-lg flex-1 min-w-[280px]" style={{ background: 'var(--leaf-soft)', color: 'var(--moss)' }}>
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>기허가 제품은 허가 정보 입력으로 등록하고, 신규 개발 제품은 설계 계획부터 시작합니다.</span>
        </div>
        {canEdit && (
          <button onClick={onAdd} className="btn-primary text-[12.5px] shrink-0">
            <Plus size={13} /> 제품 등록
          </button>
        )}
      </div>

      {products.length === 0 ? (
        <div className="card-base p-8 text-center" style={{ borderStyle: 'dashed' }}>
          <PackageSearch size={28} style={{ color: 'var(--ink-faint)', margin: '0 auto' }} strokeWidth={1.4} />
          <div className="mt-3 text-[13.5px]" style={{ color: 'var(--ink)' }}>등록된 제품이 없습니다</div>
          <div className="mt-1 text-[12px]" style={{ color: 'var(--ink-mute)' }}>'제품 등록' 버튼으로 첫 제품을 등록하세요.</div>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pageItems.map((p) => (
              <ProductCard key={p.id || p.name} product={p} onOpen={onOpen} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button onClick={() => setPage((x) => Math.max(0, x - 1))} disabled={page === 0} className="btn-ghost text-[12px] disabled:opacity-30">
                <ChevronLeft size={13} /> 이전
              </button>
              <span className="font-mono text-[12px]" style={{ color: 'var(--ink-mute)' }}>{page + 1} / {totalPages}</span>
              <button onClick={() => setPage((x) => Math.min(totalPages - 1, x + 1))} disabled={page >= totalPages - 1} className="btn-ghost text-[12px] disabled:opacity-30">
                다음 <ChevronRight size={13} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ProductCard({ product, onOpen }) {
  const key = productKeyOf(product)
  const kind = productKind(product)
  const isNew = kind === PRODUCT_KIND.NEW
  const models = productModels.getForProduct(key)

  const licProg = !isNew ? licensedProgressOf(product, key) : null
  const desProg = isNew ? designProgressOf(product) : null
  const pct = isNew ? desProg.pct : licProg.pct

  return (
    <div className="card-base p-4 flex flex-col gap-3" style={isNew ? { borderColor: 'var(--amber)' } : undefined}>
      <div>
        <span
          className="inline-block text-[10.5px] font-medium px-2 py-0.5 rounded-full mb-2"
          style={isNew ? { background: 'var(--amber-soft)', color: 'var(--amber)' } : { background: 'var(--leaf-soft)', color: 'var(--moss)' }}
        >
          {isNew ? '신규' : '기허가'}
        </span>
        <div className="text-[15px] font-semibold leading-tight" style={{ color: 'var(--ink)' }}>{product.name || '(이름없음)'}</div>
        <div className="font-mono text-[11px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>{product.classNo || product.itemName || '\u2014'}</div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-[11.5px] pt-2" style={{ borderTop: '1px solid var(--line)' }}>
        <div>
          <div className="font-mono text-[9.5px] tracking-wide uppercase" style={{ color: 'var(--ink-faint)' }}>등급</div>
          <div className="mt-0.5" style={{ color: 'var(--ink)' }}>{product.grade ? product.grade + '등급' : (isNew ? '3등급 예정' : '\uBBF8\uBD84\uB958')}</div>
        </div>
        <div>
          <div className="font-mono text-[9.5px] tracking-wide uppercase" style={{ color: 'var(--ink-faint)' }}>허가번호</div>
          <div className="mt-0.5 truncate" style={{ color: 'var(--ink)' }}>{isNew ? '설계 진행중' : (licProg.primaryLicense?.licenseNo || '미등록')}</div>
        </div>
        <div>
          <div className="font-mono text-[9.5px] tracking-wide uppercase" style={{ color: 'var(--ink-faint)' }}>모델 수</div>
          <div className="mt-0.5" style={{ color: 'var(--ink)' }}>{isNew ? '개발중' : (models.length ? models.length + '개' : '0개')}</div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span style={{ color: 'var(--ink-mute)' }}>{isNew ? '설계 진행률' : '등록 완료'}</span>
          <span className="font-mono font-medium" style={{ color: isNew ? 'var(--amber)' : 'var(--moss)' }}>{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full w-full" style={{ background: 'var(--bg-soft)' }}>
          <div className="h-1.5 rounded-full" style={{ width: pct + '%', background: isNew ? 'var(--amber)' : 'var(--moss)' }} />
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => onOpen(product, 'models')} className="btn-ghost text-[12px] flex-1 justify-center">
          모델 목록 <ArrowRight size={12} />
        </button>
        {isNew ? (
          <button onClick={() => onOpen(product, 'dhf')} className="text-[12px] font-medium px-3 py-1.5 rounded-lg flex-1 flex items-center justify-center gap-1" style={{ background: 'var(--amber-soft)', color: 'var(--amber)' }}>
            설계 계속 <ArrowRight size={12} />
          </button>
        ) : (
          <button onClick={() => onOpen(product, 'info')} className="btn-primary text-[12px] flex-1 justify-center">
            설계 변경 <ArrowRight size={12} />
          </button>
        )}
      </div>

      {isNew ? (
        <div className="rounded-lg px-3 py-2" style={{ background: 'var(--amber-soft)' }}>
          <div className="font-mono text-[9.5px] tracking-wide uppercase" style={{ color: 'var(--amber)' }}>현재 단계</div>
          <div className="text-[12.5px] font-medium mt-0.5" style={{ color: 'var(--ink)' }}>{desProg.currentLabel}</div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>{desProg.done} / {desProg.total} 단계 완료</div>
        </div>
      ) : (
        <div className="rounded-lg p-2" style={{ background: 'var(--bg-soft)' }}>
          <div className="font-mono text-[9.5px] tracking-wide uppercase mb-1" style={{ color: 'var(--ink-faint)' }}>모델 목록 미리보기</div>
          {models.length === 0 ? (
            <div className="text-[11.5px] py-1" style={{ color: 'var(--ink-faint)' }}>등록된 모델이 없습니다.</div>
          ) : (
            <div className="space-y-0.5">
              {models.slice(0, 3).map((m) => (
                <div key={m.id} className="flex items-center gap-2 text-[11.5px]">
                  <span className="font-mono shrink-0" style={{ color: 'var(--moss)' }}>{m.code || '(코드없음)'}</span>
                  <span className="truncate" style={{ color: 'var(--ink-mute)' }}>{m.spec}</span>
                </div>
              ))}
              {models.length > 3 && <div className="text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>+{models.length - 3}개 더</div>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ================================================================
   모델(변형) 목록 패널
   ================================================================ */
function ModelListPanel({ product, onAction }) {
  const key = productKeyOf(product)
  const canEdit = permissions.can('onb.product.edit')
  const [models, setModels] = useState(() => productModels.getForProduct(key))
  const [code, setCode] = useState('')
  const [spec, setSpec] = useState('')

  const refresh = () => setModels(productModels.getForProduct(key))

  const add = () => {
    if (!code.trim()) { alert('모델코드는 필수입니다.'); return }
    productModels.add(key, { code: code.trim(), spec: spec.trim() })
    setCode(''); setSpec('')
    refresh()
    onAction('모델이 추가되었습니다.')
  }

  const del = (id) => {
    if (!window.confirm('이 모델을 삭제할까요?')) return
    productModels.remove(id)
    refresh()
    onAction('모델이 삭제되었습니다.')
  }

  return (
    <div className="card-base p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--moss)' }}>
          MODEL LIST · {product.name}
        </span>
        <span className="font-mono text-[11px] px-2 py-0.5 rounded" style={{ background: 'var(--bg-soft)', color: 'var(--ink-mute)' }}>
          {models.length}개 모델
        </span>
      </div>

      {canEdit && (
        <div className="grid md:grid-cols-[1fr_2fr_auto] gap-2 pb-3 mb-3" style={{ borderBottom: '1px solid var(--line)' }}>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="모델코드 (예: PA-SCS-3522)" className="input-base text-[13px]" />
          <input value={spec} onChange={(e) => setSpec(e.target.value)} placeholder="규격/설명 (예: SCS M3.5x22mm)" className="input-base text-[13px]" onKeyDown={(e) => e.key === 'Enter' && add()} />
          <button onClick={add} className="btn-primary text-[12.5px]"><Plus size={13} /> 추가</button>
        </div>
      )}

      {models.length === 0 ? (
        <div className="text-center py-8 text-[12.5px]" style={{ color: 'var(--ink-faint)' }}>등록된 모델이 없습니다.</div>
      ) : (
        <div className="space-y-1.5">
          {models.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
              <span className="font-mono text-[12.5px] font-medium shrink-0" style={{ color: 'var(--moss)' }}>{m.code}</span>
              <span className="text-[12.5px] flex-1 min-w-0 truncate" style={{ color: 'var(--ink-mute)' }}>{m.spec}</span>
              {canEdit && (
                <button onClick={() => del(m.id)} className="shrink-0" style={{ color: 'var(--ink-faint)' }}>
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <ComplianceFooter regs={['ISO 13485 §7.5.8 (식별)', '21 CFR 820.60']} />
    </div>
  )
}

/* ================================================================
   설계 계획 패널 (신규 제품 · 9단계 설계관리 체크리스트)
   ================================================================ */
const STAGE_REQUIRED_DOCS = [
  ['설계 입력 명세서', '사용자 요구사항 문서 (URS)', '법적·규제 요구사항 목록'],
  ['설계 출력 도면 및 사양서', '제조 지시서 초안 (WI/BOM)', '검사·시험 절차서'],
  ['설계 검토 회의록', '검토 참석자 서명부', '조치사항 추적 목록'],
  ['검증 계획서 (Verification Plan)', '검증 프로토콜', '검증 결과 보고서'],
  ['밸리데이션 계획서', '임상 평가 보고서 (CER)', '밸리데이션 결과 보고서'],
  ['위험분석서 (ISO 14971)', '위험 관리 계획서 (RMP)', '잔여 위험 수용성 평가서'],
  ['이관 체크리스트', 'DMR (Device Master Record)', '제조 가능성 검토서'],
  ['인허가 신청 패키지', '기술문서 (Technical File)', '규제 전략 문서'],
  ['허가증 사본', '제조허가 조건 검토서', '인허가 유지 계획서'],
]

function DesignStagePanel({ product, onAction }) {
  const canEdit = permissions.can('onb.product.edit')
  const steps = designStepsOf(product)
  const progress = designProgressOf(product)

  const toggleStep = (idx) => {
    if (!requirePermission('onb.product.edit')) return
    const next = steps.map((s, i) => (i === idx ? !s : s))
    const before = { ...product }
    const after = { ...product, designSteps: next }

    const ob = onboarding.load()
    const list = Array.isArray(ob.products) ? ob.products.slice() : []
    const pidx = list.findIndex((p) => (p.id || 'main') === (product.id || 'main'))
    if (pidx >= 0) list[pidx] = after
    onboarding.save({ ...ob, products: list })

    commitChange({
      targetEid: eid(ENTITY_TYPES.PRODUCT, product.id || product.classNo || 'main'),
      action: CHANGE_ACTIONS.UPDATE,
      before,
      after,
      reason: (next[idx] ? DESIGN_STAGES[idx] + ' 완료' : DESIGN_STAGES[idx] + ' 재개'),
    })

    onAction(next[idx] ? DESIGN_STAGES[idx] + ' 완료 처리되었습니다.' : DESIGN_STAGES[idx] + ' 를 다시 진행중으로 되돌렸습니다.')
    setTimeout(() => window.location.reload(), 500)
  }

  return (
    <div className="card-base p-5">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--amber)' }}>
          DESIGN PLAN · {product.name}
        </span>
        <span className="font-mono text-[11px] px-2 py-0.5 rounded" style={{ background: 'var(--amber-soft)', color: 'var(--amber)' }}>
          {progress.done} / {progress.total} 단계 완료 ({progress.pct}%)
        </span>
      </div>
      <div className="text-[11.5px] mb-4" style={{ color: 'var(--ink-mute)' }}>ISO 13485 §7.3 설계 및 개발 — 단계를 순서대로 완료하며 진행하세요. 완료 처리마다 CCR이 자동 발의됩니다.</div>

      <div className="space-y-1.5">
        {DESIGN_STAGES.map((label, i) => {
          const done = steps[i]
          const current = !done && steps.slice(0, i).every(Boolean)
          return (
            <button
              key={label}
              onClick={() => canEdit && toggleStep(i)}
              disabled={!canEdit}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition disabled:cursor-default"
              style={{ background: current ? 'var(--amber-soft)' : 'var(--bg-soft)' }}
            >
              {done ? <CheckCircle2 size={17} style={{ color: 'var(--moss)' }} className="shrink-0" /> : <Circle size={17} style={{ color: current ? 'var(--amber)' : 'var(--ink-faint)' }} className="shrink-0" />}
              <span className="text-[13px] flex-1" style={{ color: done ? 'var(--ink-mute)' : 'var(--ink)', textDecoration: done ? 'line-through' : 'none' }}>
                {i + 1}. {label}
              </span>
              {current && <span className="font-mono text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--amber)', color: '#fff' }}>진행중</span>}
            </button>
          )
        })}
      </div>

        {progress.currentIdx >= 0 && progress.currentIdx < STAGE_REQUIRED_DOCS.length && (
          <div className="mt-3 rounded-lg p-3" style={{ background: 'var(--bg-soft)', borderLeft: '3px solid var(--amber)' }}>
            <div className="font-mono text-[9px] tracking-widest uppercase mb-2" style={{ color: 'var(--amber)' }}>
              ISO 13485 §7.3 · 현재 단계 필수 요건
            </div>
            <div className="flex flex-col gap-1">
              {STAGE_REQUIRED_DOCS[progress.currentIdx].map((doc, di) => (
                <div key={di} className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--ink-mute)' }}>
                  <span style={{ color: 'var(--amber)', fontWeight: 700 }}>·</span> {doc}
                </div>
              ))}
            </div>
          </div>
        )}
      {progress.done === progress.total && (
        <div className="mt-4 flex items-start gap-2 p-3 rounded-lg" style={{ background: 'var(--leaf-soft)' }}>
          <Sparkles size={15} style={{ color: 'var(--moss)' }} className="shrink-0 mt-0.5" />
          <div className="text-[12.5px]" style={{ color: 'var(--ink)' }}>
            설계 계획 9단계가 모두 완료되었습니다. 허가 신청을 진행한 뒤, '모델 목록'과 '문서' 탭에서 허가정보·모델을 등록하면 기허가 제품으로 전환할 수 있습니다.
          </div>
        </div>
      )}
      <ComplianceFooter regs={['ISO 13485 §7.3', '21 CFR 820.30', 'ISO 14971']} />
    </div>
  )
}

function AddProductPanel({ onCancel, onSaved }) {
  const EMPTY = { name: '', itemName: '', grade: '2', classNo: '', cat1: '', cat2: '', etc: '', contact: 'none', software: 'none', track: 'N', modelNumber: '', intendedUse: '', licenseNo: '', issueDate: '' }
  const [kind, setKind] = useState(PRODUCT_KIND.LICENSED)
  const [form, setForm] = useState(EMPTY)
  const [reason, setReason] = useState('')
  const [draftModels, setDraftModels] = useState([])
  const [extracting, setExtracting] = useState(false)
  const [extractedFileName, setExtractedFileName] = useState('')
  const [extractNote, setExtractNote] = useState('')
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const isNew = kind === PRODUCT_KIND.NEW
  const mkId = () => 'd' + Math.random().toString(36).slice(2, 9)

  const onPdfSelected = async (file) => {
    if (!file) return
    setExtracting(true)
    setExtractNote('')
    try {
      const r = await extractLicenseFromPdf(file)
      if (!r) {
        setExtractNote('PDF에서 자동으로 추출하지 못했습니다 — 아래 항목을 직접 입력해주세요.')
      } else {
        setForm((f) => ({
          ...f,
          itemName: r.itemName || f.itemName,
          classNo: r.classNo || f.classNo,
          grade: r.grade || f.grade,
          licenseNo: r.licenseNo || f.licenseNo,
          issueDate: r.issueDate || f.issueDate,
        }))
        if (r.models && r.models.length) {
          setDraftModels(r.models.map((m) => ({ id: mkId(), code: m.code || '', name: m.name || '' })))
        }
        setExtractNote(`AI 추출 완료 · 모델 ${r.models ? r.models.length : 0}개 — 아래 내용을 검토 후 수정하세요.`)
      }
    } finally {
      setExtractedFileName(file.name)
      setExtracting(false)
    }
  }

  const addDraftModel = () => setDraftModels((list) => [...list, { id: mkId(), code: '', name: '' }])
  const updateDraftModel = (id, patch) => setDraftModels((list) => list.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  const removeDraftModel = (id) => setDraftModels((list) => list.filter((m) => m.id !== id))

  const save = () => {
    if (isNew) {
      if (!form.name.trim()) { alert('제품명은 필수입니다.'); return }
    } else {
      if (!form.licenseNo.trim()) { alert('허가번호는 필수입니다.'); return }
      if (!form.itemName.trim()) { alert('품목명은 필수입니다.'); return }
      if (!form.classNo.trim()) { alert('식약처 분류번호는 필수입니다.'); return }
    }
    const autoReason = !isNew && form.licenseNo.trim() ? `허가번호 ${form.licenseNo.trim()} 기준 신규 등록` : ''
    const finalReason = reason.trim() || autoReason
    if (!finalReason) {
      alert((isNew ? '등록' : '추가') + ' 사유는 필수입니다 (CCR — ISO 13485 §4.2.4).')
      return
    }

    const productId = 'prod-' + Date.now()
    const productName = isNew ? form.name.trim() : (form.name.trim() || form.itemName.trim())
    const newProduct = isNew
      ? { name: productName, itemName: form.itemName, classNo: form.classNo, cat1: form.cat1, cat2: form.cat2, id: productId, kind: PRODUCT_KIND.NEW, designSteps: DESIGN_STAGES.map(() => false) }
      : {
          name: productName,
          itemName: form.itemName,
          classNo: form.classNo,
          grade: form.grade,
          cat1: form.cat1,
          cat2: form.cat2,
          etc: form.etc,
          contact: form.contact,
          software: form.software,
          track: form.track,
          modelNumber: form.modelNumber,
          intendedUse: form.intendedUse,
          id: productId,
          kind: PRODUCT_KIND.LICENSED,
        }

    const ob = onboarding.load()
    const list = Array.isArray(ob.products) ? ob.products.slice() : []
    list.push(newProduct)
    onboarding.save({ ...ob, products: list })

    if (!isNew && form.licenseNo.trim()) {
      productDocs.addLicense(productKeyOf(newProduct), {
        licenseNo: form.licenseNo.trim(),
        productName: newProduct.name,
        issueDate: form.issueDate.trim(),
      })
    }
    if (!isNew && draftModels.length) {
      const key = productKeyOf(newProduct)
      draftModels
        .filter((m) => m.code.trim() || m.name.trim())
        .forEach((m) => productModels.add(key, { code: m.code.trim(), spec: m.name.trim() }))
    }

    commitChange({
      targetEid: eid(ENTITY_TYPES.PRODUCT, newProduct.id),
      action: CHANGE_ACTIONS.CREATE,
      before: null,
      after: newProduct,
      reason: finalReason,
    })

    onSaved(newProduct)
  }

  return (
    <div className="card-base p-5">
      <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
        <div>
          <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--moss)' }}>
            PROD · 제품 등록 · {isNew ? '신규' : '기허가'}
          </span>
          <div className="mt-0.5 text-[12px]" style={{ color: 'var(--ink-faint)' }}>
            제품·공정 <ChevronRight size={11} className="inline align-[-1px]" /> 제품 등록 <ChevronRight size={11} className="inline align-[-1px]" /> {isNew ? '신규 개발 제품 등록' : '기허가 제품 등록'}
          </div>
        </div>
        <button onClick={onCancel} className="btn-ghost text-[12px]">취소</button>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setKind(PRODUCT_KIND.LICENSED)}
          className="flex-1 px-3 py-2.5 rounded-lg text-[13px] font-medium text-left transition"
          style={!isNew ? { background: 'var(--leaf-soft)', color: 'var(--moss)', border: '1.5px solid var(--moss)' } : { background: 'var(--bg-soft)', color: 'var(--ink-mute)', border: '1.5px solid transparent' }}
        >
          기허가 제품
          <div className="text-[11px] font-normal mt-0.5" style={{ color: 'var(--ink-mute)' }}>이미 허가를 받은 제품 — 허가증 PDF로 자동 등록</div>
        </button>
        <button
          type="button"
          onClick={() => setKind(PRODUCT_KIND.NEW)}
          className="flex-1 px-3 py-2.5 rounded-lg text-[13px] font-medium text-left transition"
          style={isNew ? { background: 'var(--amber-soft)', color: 'var(--amber)', border: '1.5px solid var(--amber)' } : { background: 'var(--bg-soft)', color: 'var(--ink-mute)', border: '1.5px solid transparent' }}
        >
          신규 개발 제품
          <div className="text-[11px] font-normal mt-0.5" style={{ color: 'var(--ink-mute)' }}>아직 허가가 없는 개발 중 제품 — 설계 계획부터 시작</div>
        </button>
      </div>

      {isNew ? (
        <div className="grid md:grid-cols-2 gap-4 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
          <FieldEdit label="제품명" value={form.name} onChange={(v) => setF('name', v)} placeholder="예: 신규 와이어 제품" required />
          <FieldEdit label="품목명 (식약처, 예정)" value={form.itemName} onChange={(v) => setF('itemName', v)} placeholder="예정 품목명 (미확정 시 비워두세요)" />
          <MdcatCardPicker label="의료기기 대분류 선택" value={form.cat1} onChange={(v) => setF('cat1', v)} options={[['', '선택 안 함'], ...MDCAT1.map((cc) => [cc, cc])]} />
          <MdcatCardPicker label="중분류 선택" value={form.cat2} onChange={(v) => setF('cat2', v)} disabled={!form.cat1 || form.cat1 === '기타'} options={[['', '선택 안 함'], ...(MDCAT[form.cat1] || []).map((cc) => [cc, cc])]} />
        </div>
      ) : (
        <div className="space-y-4 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
          <div className="rounded-xl p-4 text-center" style={{ border: '1.5px dashed var(--line)', background: 'var(--bg-soft)' }}>
            <input
              id="license-pdf-input"
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => onPdfSelected(e.target.files && e.target.files[0])}
            />
            <label htmlFor="license-pdf-input" className="cursor-pointer inline-flex flex-col items-center gap-1.5">
              <Upload size={22} style={{ color: 'var(--moss)' }} />
              <span className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>
                {extracting ? 'AI가 허가증을 분석하는 중…' : '허가증 PDF 업로드'}
              </span>
              <span className="text-[11.5px]" style={{ color: 'var(--ink-mute)' }}>
                업로드하면 AI가 품목명 · 분류번호 · 등급 · 허가번호 · 허가일과 모델 목록을 자동으로 채웁니다
              </span>
            </label>
            {extractedFileName && (
              <div className="mt-2 text-[11.5px] font-mono" style={{ color: 'var(--ink-mute)' }}>{extractedFileName}</div>
            )}
            {extractNote && (
              <div className="mt-2 text-[11.5px] inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: 'var(--leaf-soft)', color: 'var(--moss)' }}>
                <Sparkles size={12} /> {extractNote}
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <FieldEdit label="허가번호" value={form.licenseNo} onChange={(v) => setF('licenseNo', v)} placeholder="예: 제허 2024-00123" required />
            <FieldEdit
              label="품목명 (식약처)"
              value={form.itemName}
              onChange={(v) => { setF('itemName', v); if (!form.name.trim()) setF('name', v) }}
              placeholder="식약처 품목명"
              required
            />
            <FieldEdit label="식약처 분류번호" value={form.classNo} onChange={(v) => setF('classNo', v)} placeholder="예: A11010.01" required />
            <MdcatCardPicker label="등급 선택 (Class)" value={form.grade} onChange={(v) => setF('grade', v)} options={[['1', '1등급'], ['2', '2등급'], ['3', '3등급'], ['4', '4등급']]} />
            <FieldEdit label="허가일" value={form.issueDate} onChange={(v) => setF('issueDate', v)} type="date" />
            <FieldEdit label="제품명 (내부 관리명, 선택)" value={form.name} onChange={(v) => setF('name', v)} placeholder="비워두면 품목명을 사용합니다" />
          </div>

          <details className="text-[12.5px]">
            <summary className="cursor-pointer select-none" style={{ color: 'var(--ink-mute)' }}>추가 항목 (모델번호 · 업종 · 접촉 · SW 등) — 필요 시 펼치기</summary>
            <div className="grid md:grid-cols-2 gap-4 pt-3">
              <FieldEdit label="모델 번호" value={form.modelNumber} onChange={(v) => setF('modelNumber', v)} />
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
          </details>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12.5px] font-medium" style={{ color: 'var(--ink)' }}>
                모델 목록{draftModels.length > 0 ? ` (${draftModels.length}개)` : ''}
              </span>
              <button type="button" onClick={addDraftModel} className="btn-ghost text-[11.5px]"><Plus size={12} /> 행 추가</button>
            </div>
            {draftModels.length === 0 ? (
              <div className="text-center py-6 text-[12px] rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>
                PDF를 업로드하면 모델 목록이 자동으로 채워집니다. 직접 추가할 수도 있습니다.
              </div>
            ) : (
              <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--line)' }}>
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-3 py-1.5 text-[10.5px] font-mono uppercase tracking-wide" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>
                  <span>모델 코드</span>
                  <span>모델명 / 비고</span>
                  <span></span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {draftModels.map((m) => (
                    <div key={m.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 px-3 py-1.5 items-center" style={{ borderTop: '1px solid var(--line)' }}>
                      <input value={m.code} onChange={(e) => updateDraftModel(m.id, { code: e.target.value })} className="input-base text-[12.5px] font-mono" placeholder="모델코드" />
                      <input value={m.name} onChange={(e) => updateDraftModel(m.id, { name: e.target.value })} className="input-base text-[12.5px]" placeholder="모델명 / 규격" />
                      <button onClick={() => removeDraftModel(m.id)} style={{ color: 'var(--ink-faint)' }}><Trash2 size={13} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="pt-3">
        <FieldEdit
          label={(isNew ? '등록' : '추가') + ' 사유 (CCR — ISO 13485 §4.2.4)' + (!isNew ? ' · 비워두면 허가번호 기준으로 자동 기록' : '')}
          value={reason}
          onChange={setReason}
          placeholder={isNew ? '예: 신규 라인업 출시 / 제품 포트폴리오 확장' : '비워두면 자동 기록됩니다 (직접 입력 가능)'}
          required={isNew}
        />
      </div>

      <div className="flex justify-end gap-2 pt-3">
        <button onClick={onCancel} className="btn-ghost">← 이전</button>
        <button onClick={save} className="btn-primary">{isNew ? '설계 계획 시작' : '등록 완료'} · CCR 발의</button>
      </div>

      <ComplianceFooter regs={['ISO 13485 §7.3', '21 CFR 820.30', 'MDR Annex II']} />
    </div>
  )
}

function MdcatCardPicker({ label, value, onChange, options, disabled, cols = 3 }) {
  return (
    <div>
      <div className="font-mono text-[10px] mb-2" style={{ color: 'var(--ink-mute)' }}>{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.filter(o => o[0]).map(([val, display]) => (
          <button key={val} type="button" disabled={disabled} onClick={() => onChange(val)}
            className="text-[11px] px-2.5 py-1.5 rounded-lg transition-all"
            style={{ background: value === val ? 'var(--moss)' : 'var(--bg-soft)', color: value === val ? '#fff' : 'var(--ink)', border: value === val ? '1.5px solid var(--moss)' : '1.5px solid var(--line)', opacity: disabled ? 0.45 : 1, cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: value === val ? 600 : 400 }}
          >{display}</button>
        ))}
      </div>
      {value && <div className="mt-1 font-mono text-[9px]" style={{ color: 'var(--moss)' }}>✓ {value} 선택됨</div>}
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

function ProductPanel({ product, company, onAction, onDeleted }) {
  const canEdit = permissions.can('onb.product.edit')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(null)
  const [reason, setReason] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')

  const productEid = eid(
    ENTITY_TYPES.PRODUCT,
    product?.id || product?.classNo || product?.modelNumber || 'main'
  )

  const ccrs = useMemo(
    () => getRecordsForEntity(productEid),
    [productEid, editing]
  )

  // #32 재수정 — 연도별 생산·수입실적(#⑥)은 KMDIA(의료기기산업정보시스템)에 별도 보고하는
  // 사항이며 이 화면(설계개발/제품상세) 위치도 맞지 않는다는 지적에 따라 삭제한다.
  // (GMP 신청 관련 자료는 별도 "GMP 신청" 메뉴에서 통합 관리한다.)

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

  const doDelete = () => {
    if (!deleteReason.trim()) {
      alert('삭제 사유는 필수입니다 (예: 허가취소, 잘못입력 등).')
      return
    }
    const ob = onboarding.load()
    const list = Array.isArray(ob.products) ? ob.products.slice() : []
    const nextList = list.filter((p) => (p.id || 'main') !== (product.id || 'main'))
    onboarding.save({ ...ob, products: nextList })

    // CCR 자동 발의 (삭제 이력 보존)
    commitChange({
      targetEid: productEid,
      action: CHANGE_ACTIONS.DELETE,
      before: { ...product },
      after: null,
      reason: deleteReason.trim(),
    })

    setShowDeleteModal(false)
    setDeleteReason('')
    onAction('제품이 삭제되었습니다 · CCR 자동 발의')
    if (onDeleted) onDeleted()
  }

  const addInspItem = () => setDraft((d) => ({ ...d, inspStdCheckItems: [...(d.inspStdCheckItems || []), { name: '', spec: '', method: '' }] }))
  const updInspItem = (i, k, v) => setDraft((d) => {
    const items = [...(d.inspStdCheckItems || [])]
    items[i] = { ...items[i], [k]: v }
    return { ...d, inspStdCheckItems: items }
  })
  const delInspItem = (i) => setDraft((d) => {
    const items = [...(d.inspStdCheckItems || [])]
    items.splice(i, 1)
    return { ...d, inspStdCheckItems: items }
  })

  const addPkgItem = () => setDraft((d) => ({ ...d, pkgCheckItems: [...(d.pkgCheckItems || []), { name: '', spec: '' }] }))

  const updPkgItem = (i, k, v) => setDraft((d) => {
    const items = [...(d.pkgCheckItems || [])]
    items[i] = { ...items[i], [k]: v }
    return { ...d, pkgCheckItems: items }
  })
  const delPkgItem = (i) => setDraft((d) => {
    const items = [...(d.pkgCheckItems || [])]
    items.splice(i, 1)
    return { ...d, pkgCheckItems: items }
  })

  const addInstallItem = () => setDraft((d) => ({ ...d, installCheckItems: [...(d.installCheckItems || []), { name: '' }] }))
  const updInstallItem = (i, v) => setDraft((d) => {
    const items = [...(d.installCheckItems || [])]
    items[i] = { ...items[i], name: v }
    return { ...d, installCheckItems: items }
  })
  const delInstallItem = (i) => setDraft((d) => {
    const items = [...(d.installCheckItems || [])]
    items.splice(i, 1)
    return { ...d, installCheckItems: items }
  })

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
              <div className="flex items-center gap-2">
                <button onClick={startEdit} className="btn-ghost text-[12px]">
                  <Edit3 size={12} /> 수정
                </button>
                <button onClick={() => setShowDeleteModal(true)} className="btn-ghost text-[12px]" style={{ color: '#DC2626' }}>
                  <Trash2 size={12} /> 삭제
                </button>
              </div>
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

              {product.sterileEnabled && (
                <div className="pt-3 mt-3" style={{ borderTop: '1px dashed var(--line)' }}>
                  <div className="text-[11.5px] font-bold mb-2 flex items-center gap-1.5" style={{ color: 'var(--moss)' }}>
                    멸균 방법 사양 (ISO 13485 §7.5.7)
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full" style={{
                      background: (SPEC_STATUSES.find(s => s.value === (product.sterileStatus || 'not_validated')) || {}).color + '22',
                      color: (SPEC_STATUSES.find(s => s.value === (product.sterileStatus || 'not_validated')) || {}).color,
                    }}>
                      {(SPEC_STATUSES.find(s => s.value === (product.sterileStatus || 'not_validated')) || {}).label}
                    </span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="멸균 방법" value={product.sterileMethod || '-'} />
                    <Field label="SAL 목표" value={product.salTarget || '-'} />
                    <Field label="사이클 온도 / 시간 / 압력" value={[
                      product.cycleTemp && (product.cycleTemp + '℃'),
                      product.cycleTime && (product.cycleTime + '분'),
                      product.cyclePressure && (product.cyclePressure + ' bar'),
                    ].filter(Boolean).join(' / ') || '-'} />
                    <Field label="선량 (방사선)" value={product.cycleDose || '-'} />
                    <Field label="밸리데이션 참조" value={product.validationRef || '-'} />
                    <Field label="포장 밸리데이션 참조" value={product.packagingRef || '-'} />
                    <Field label="바이오버든 한도 / 시험법" value={[product.bioburdenLimit, product.bioburdenMethod].filter(Boolean).join(' / ') || '-'} />
                    <Field label="멸균 유효기간" value={product.expiryMonths ? product.expiryMonths + '개월' : '-'} />
                    <Field label="멸균성 시험" value={product.sterilityTestRequired !== false ? '필요 (ISO 11737-2)' : '해당 없음'} />
                    <Field label="재처리 허용" value={product.reprocessingAllowed ? '예 (주의)' : '단회용 (재처리 금지)'} />
                  </div>
                  {product.sterileNotes && (
                    <div className="mt-3">
                      <Field label="비고" value={product.sterileNotes} />
                    </div>
                  )}
                </div>
              )}

              {product.cleanEnabled && (
                <div className="pt-3 mt-3" style={{ borderTop: '1px dashed var(--line)' }}>
                  <div className="text-[11.5px] font-bold mb-2 flex items-center gap-1.5" style={{ color: 'var(--moss)' }}>
                    청결도 사양 (ISO 13485 §7.5.2)
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full" style={{
                      background: (CLEAN_STATUSES.find(s => s.value === (product.cleanStatus || 'not_validated')) || {}).color + '22',
                      color: (CLEAN_STATUSES.find(s => s.value === (product.cleanStatus || 'not_validated')) || {}).color,
                    }}>
                      {(CLEAN_STATUSES.find(s => s.value === (product.cleanStatus || 'not_validated')) || {}).label}
                    </span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="적용 조건" value={CLEAN_APPLIES_WHEN[product.cleanAppliesWhen] || '-'} />
                    <Field label="청결도 등급" value={product.cleanClass || '-'} />
                    <Field label="세척 방법" value={product.cleaningMethod || '-'} />
                    <Field label="모니터링 빈도" value={product.cleanFrequency || '-'} />
                    <Field label="오염 유형" value={(product.contaminationTypes || []).join(', ') || '-'} />
                    <Field label="미립자 한도 / 미생물 한도" value={[product.particleLimit, product.microbialLimit].filter(Boolean).join(' / ') || '-'} />
                    <Field label="화학 잔류 한도" value={product.chemicalLimit || '-'} />
                    <Field label="세척 SOP 참조" value={product.cleaningProcedureRef || '-'} />
                    <Field label="밸리데이션 참조" value={product.cleanValidationRef || '-'} />
                    <Field label="청결도 검사 방법" value={product.inspectionMethod || '-'} />
                    <Field label="합격 기준" value={product.acceptanceCriteria || '-'} />
                    <Field label="담당" value={product.cleanResponsible || '-'} />
                  </div>
                  {product.cleanNotes && (
                    <div className="mt-3">
                      <Field label="비고" value={product.cleanNotes} />
                    </div>
                  )}
                </div>
              )}

              {product.preserveEnabled && (
                <div className="pt-3 mt-3" style={{ borderTop: '1px dashed var(--line)' }}>
                  <div className="text-[11.5px] font-bold mb-2" style={{ color: 'var(--moss)' }}>
                    보존 사양 (ISO 13485 §7.5.11)
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="보관 조건" value={(STORAGE_CONDITIONS.find(c => c.key === (product.storageCondition || 'room')) || {}).label || '-'} />
                    <Field label="온도 / 습도 범위" value={[
                      (product.tempMin || product.tempMax) && `${product.tempMin || '-'}~${product.tempMax || '-'}℃`,
                      (product.humMin || product.humMax) && `${product.humMin || '-'}~${product.humMax || '-'}%RH`,
                    ].filter(Boolean).join(' / ') || '-'} />
                    <Field label="유효기간" value={product.shelfLifeMonths ? product.shelfLifeMonths + '개월' : '-'} />
                    <Field label="멸균 방법" value={product.preserveSterility || '-'} />
                    <Field label="포장 유형 / 사양" value={[product.packagingType, product.packagingSpec].filter(Boolean).join(' / ') || '-'} />
                    <Field label="적재 한계" value={product.stackLimit || '-'} />
                    <Field label="차광 / 충격 취약" value={[product.lightSensitive && '차광 필요', product.shockSensitive && '충격 취약'].filter(Boolean).join(' · ') || '해당 없음'} />
                    <Field label="연결 환경 구역 ID" value={product.linkedEnvZoneId || '-'} />
                    <Field label="청결 요구사항" value={product.cleanlinessReq || '-'} />
                    <Field label="취급 지침" value={product.handlingInstructions || '-'} />
                  </div>
                  {(product.pkgCheckItems || []).length > 0 && (
                    <div className="mt-3">
                      <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>출하 전 포장·보존 점검 항목</label>
                      <div className="mt-1 grid md:grid-cols-2 gap-1.5">
                        {product.pkgCheckItems.map((ci, i) => (
                          <div key={i} className="flex gap-2 text-[12px] p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
                            <span style={{ color: 'var(--ink-faint)', minWidth: 16 }}>{i + 1}.</span>
                            <span style={{ color: 'var(--ink)' }}>{ci.name}</span>
                            {ci.spec && <span style={{ color: 'var(--ink-faint)' }}>— {ci.spec}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {product.preserveNotes && (
                    <div className="mt-3">
                      <Field label="비고" value={product.preserveNotes} />
                    </div>
                  )}
                </div>
              )}

              {(product.installCheckItems || []).length > 0 && (
                <div className="pt-3 mt-3" style={{ borderTop: '1px dashed var(--line)' }}>
                  <div className="text-[11.5px] font-bold mb-2" style={{ color: 'var(--moss)' }}>
                    설치 체크리스트 (ISO 13485 §7.5.3 — 설치·서비스 화면에서 사용)
                  </div>
                  <div className="grid md:grid-cols-2 gap-1.5">
                    {product.installCheckItems.map((ci, i) => (
                      <div key={i} className="flex gap-2 text-[12px] p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
                        <span style={{ color: 'var(--ink-faint)', minWidth: 16 }}>{i + 1}.</span>
                        <span style={{ color: 'var(--ink)' }}>{ci.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {product.inspStdName && (
                <div className="pt-3 mt-3" style={{ borderTop: '1px dashed var(--line)' }}>
                  <div className="text-[11.5px] font-bold mb-2" style={{ color: 'var(--moss)' }}>
                    검사 기준서 (ISO 13485 §8.2.4 최종검사)
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="기준서 이름" value={product.inspStdName} />
                    <Field label="버전 / 시행일" value={[product.inspStdVersion || '1.0', product.inspStdEffectiveDate].filter(Boolean).join(' · ')} />
                    <Field label="검사 유형" value={(INSP_TYPES.find((t) => t.value === (product.inspStdType || 'fqc')) || {}).label || '-'} />
                    <Field label="AQL 수준" value={product.inspStdAqlLevel || '-'} />
                    <Field label="합격 / 불합격 수량" value={[product.inspStdAcceptQty, product.inspStdRejectQty].filter(Boolean).join(' / ') || '-'} />
                  </div>
                  {(product.inspStdCheckItems || []).length > 0 && (
                    <div className="mt-3">
                      <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>검사 항목</label>
                      <div className="mt-1 grid md:grid-cols-2 gap-1.5">
                        {product.inspStdCheckItems.map((ci, i) => (
                          <div key={i} className="flex gap-2 text-[12px] p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
                            <span style={{ color: 'var(--ink-faint)', minWidth: 16 }}>{i + 1}.</span>
                            <span style={{ color: 'var(--ink)' }}>{ci.name}</span>
                            {ci.spec && <span style={{ color: 'var(--ink-faint)' }}>— {ci.spec}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {product.inspStdNotes && (
                    <div className="mt-3">
                      <Field label="비고" value={product.inspStdNotes} />
                    </div>
                  )}
                </div>
              )}
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

              <div className="pt-3 mt-1" style={{ borderTop: '1px dashed var(--line)' }}>
                <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>
                  제품 기술설명·비교자료(기술문서등심사의뢰서 신청내용)는{' '}
                  <a href="/gmp-application?tab=tech" className="underline" style={{ color: 'var(--moss)' }}>GMP 신청</a> 화면에서 작성·관리합니다.
                </div>
              </div>

              <div className="pt-3 mt-1" style={{ borderTop: '1px dashed var(--line)' }}>
                <label className="flex items-center gap-2 text-[12.5px] cursor-pointer" style={{ color: 'var(--ink)' }}>
                  <input
                    type="checkbox"
                    checked={!!draft.sterileEnabled}
                    onChange={(e) => setDraft({ ...draft, sterileEnabled: e.target.checked })}
                  />
                  이 제품은 멸균 의료기기입니다 (ISO 13485 §7.5.7 사양 입력)
                </label>

                {draft.sterileEnabled && (
                  <div className="mt-3 space-y-3 p-3 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>멸균 방법</label>
                        <select className="input-base mt-1 w-full text-[13px]" value={draft.sterileMethod || STERILE_METHODS[0]} onChange={(e) => setDraft({ ...draft, sterileMethod: e.target.value })}>
                          {STERILE_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>SAL 목표</label>
                        <select className="input-base mt-1 w-full text-[13px]" value={draft.salTarget || SAL_LEVELS[0]} onChange={(e) => setDraft({ ...draft, salTarget: e.target.value })}>
                          {SAL_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <FieldEdit label="사이클 온도 (℃)" value={draft.cycleTemp} onChange={(v) => setDraft({ ...draft, cycleTemp: v })} placeholder="121" />
                      <FieldEdit label="사이클 시간 (분)" value={draft.cycleTime} onChange={(v) => setDraft({ ...draft, cycleTime: v })} placeholder="15" />
                      <FieldEdit label="사이클 압력 (bar)" value={draft.cyclePressure} onChange={(v) => setDraft({ ...draft, cyclePressure: v })} placeholder="2.1" />
                      <FieldEdit label="선량 (kGy)" value={draft.cycleDose} onChange={(v) => setDraft({ ...draft, cycleDose: v })} placeholder="25 (방사선)" />
                    </div>

                    <div className="grid md:grid-cols-2 gap-3">
                      <FieldEdit label="밸리데이션 참조 번호" value={draft.validationRef} onChange={(v) => setDraft({ ...draft, validationRef: v })} placeholder="VLD-2024-001" />
                      <FieldEdit label="포장 밸리데이션 참조" value={draft.packagingRef} onChange={(v) => setDraft({ ...draft, packagingRef: v })} placeholder="PKG-VAL-001" />
                      <FieldEdit label="바이오버든 한도 (CFU/개)" value={draft.bioburdenLimit} onChange={(v) => setDraft({ ...draft, bioburdenLimit: v })} placeholder="≤ 100" />
                      <div>
                        <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>바이오버든 시험법</label>
                        <select className="input-base mt-1 w-full text-[13px]" value={draft.bioburdenMethod || BIOBURDEN_METHODS[0]} onChange={(e) => setDraft({ ...draft, bioburdenMethod: e.target.value })}>
                          {BIOBURDEN_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <FieldEdit label="멸균 유효기간 (개월)" value={draft.expiryMonths} onChange={(v) => setDraft({ ...draft, expiryMonths: v })} placeholder="24" />
                      <div>
                        <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>밸리데이션 상태</label>
                        <select className="input-base mt-1 w-full text-[13px]" value={draft.sterileStatus || 'not_validated'} onChange={(e) => setDraft({ ...draft, sterileStatus: e.target.value })}>
                          {SPEC_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-5">
                      <label className="flex items-center gap-2 text-[12.5px] cursor-pointer" style={{ color: 'var(--ink)' }}>
                        <input type="checkbox" checked={draft.sterilityTestRequired !== false} onChange={(e) => setDraft({ ...draft, sterilityTestRequired: e.target.checked })} />
                        멸균성 시험 필요 (ISO 11737-2)
                      </label>
                      <label className="flex items-center gap-2 text-[12.5px] cursor-pointer" style={{ color: 'var(--ink)' }}>
                        <input type="checkbox" checked={!!draft.reprocessingAllowed} onChange={(e) => setDraft({ ...draft, reprocessingAllowed: e.target.checked })} />
                        재처리 허용 (단회용이 아닌 경우)
                      </label>
                    </div>

                    <FieldEdit label="멸균 사양 비고" value={draft.sterileNotes} onChange={(v) => setDraft({ ...draft, sterileNotes: v })} multiline placeholder="추가 요구사항 또는 특이사항" />
                  </div>
                )}
              </div>

              <div className="pt-3 mt-1" style={{ borderTop: '1px dashed var(--line)' }}>
                <label className="flex items-center gap-2 text-[12.5px] cursor-pointer" style={{ color: 'var(--ink)' }}>
                  <input
                    type="checkbox"
                    checked={!!draft.cleanEnabled}
                    onChange={(e) => setDraft({ ...draft, cleanEnabled: e.target.checked })}
                  />
                  이 제품은 청결도·오염 관리 요구사항이 적용됩니다 (ISO 13485 §7.5.2 사양 입력)
                </label>

                {draft.cleanEnabled && (
                  <div className="mt-3 space-y-3 p-3 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>적용 조건</label>
                        <select className="input-base mt-1 w-full text-[13px]" value={draft.cleanAppliesWhen || 'supplied_clean'} onChange={(e) => setDraft({ ...draft, cleanAppliesWhen: e.target.value })}>
                          {Object.entries(CLEAN_APPLIES_WHEN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>청결도 등급</label>
                        <select className="input-base mt-1 w-full text-[13px]" value={draft.cleanClass || CLEAN_CLASSES[6]} onChange={(e) => setDraft({ ...draft, cleanClass: e.target.value })}>
                          {CLEAN_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>세척 방법</label>
                        <select className="input-base mt-1 w-full text-[13px]" value={draft.cleaningMethod || CLEANING_METHODS[0]} onChange={(e) => setDraft({ ...draft, cleaningMethod: e.target.value })}>
                          {CLEANING_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>모니터링 빈도</label>
                        <select className="input-base mt-1 w-full text-[13px]" value={draft.cleanFrequency || MONITOR_FREQS[0]} onChange={(e) => setDraft({ ...draft, cleanFrequency: e.target.value })}>
                          {MONITOR_FREQS.map((f) => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>오염 유형 (복수 선택)</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {CONTAMINATION_TYPES.map((t) => {
                          const active = (draft.contaminationTypes || []).includes(t)
                          return (
                            <button key={t} type="button" onClick={() => {
                              const cur = draft.contaminationTypes || []
                              setDraft({ ...draft, contaminationTypes: active ? cur.filter((x) => x !== t) : [...cur, t] })
                            }} className="px-2.5 py-1 rounded-full text-[11.5px]" style={{
                              background: active ? 'var(--moss)' : 'var(--bg-card)',
                              color: active ? '#fff' : 'var(--ink-soft)',
                              border: '1px solid ' + (active ? 'var(--moss)' : 'var(--line)'), cursor: 'pointer',
                            }}>{t}</button>
                          )
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <FieldEdit label="미립자 한도 (개/㎥)" value={draft.particleLimit} onChange={(v) => setDraft({ ...draft, particleLimit: v })} placeholder="12,500" />
                      <FieldEdit label="미생물 한도 (CFU/㎥)" value={draft.microbialLimit} onChange={(v) => setDraft({ ...draft, microbialLimit: v })} placeholder="3" />
                      <FieldEdit label="화학 잔류 한도" value={draft.chemicalLimit} onChange={(v) => setDraft({ ...draft, chemicalLimit: v })} placeholder="" />
                    </div>

                    <div className="grid md:grid-cols-2 gap-3">
                      <FieldEdit label="세척 SOP 참조" value={draft.cleaningProcedureRef} onChange={(v) => setDraft({ ...draft, cleaningProcedureRef: v })} placeholder="SOP-CL-001" />
                      <FieldEdit label="밸리데이션 참조 번호 (있으면 정기 측정값 대체)" value={draft.cleanValidationRef} onChange={(v) => setDraft({ ...draft, cleanValidationRef: v })} placeholder="VLD-2024-CL-001" />
                      <FieldEdit label="청결도 검사 방법" value={draft.inspectionMethod} onChange={(v) => setDraft({ ...draft, inspectionMethod: v })} placeholder="파티클 카운터 측정" />
                      <FieldEdit label="합격 기준" value={draft.acceptanceCriteria} onChange={(v) => setDraft({ ...draft, acceptanceCriteria: v })} placeholder="" />
                      <FieldEdit label="담당" value={draft.cleanResponsible} onChange={(v) => setDraft({ ...draft, cleanResponsible: v })} placeholder="생산팀" />
                      <div>
                        <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>상태</label>
                        <select className="input-base mt-1 w-full text-[13px]" value={draft.cleanStatus || 'not_validated'} onChange={(e) => setDraft({ ...draft, cleanStatus: e.target.value })}>
                          {CLEAN_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </div>
                    </div>

                    <FieldEdit label="청결도 사양 비고" value={draft.cleanNotes} onChange={(v) => setDraft({ ...draft, cleanNotes: v })} multiline placeholder="추가 요구사항 또는 특이사항" />
                  </div>
                )}
              </div>

              <div className="pt-3 mt-1" style={{ borderTop: '1px dashed var(--line)' }}>
                <label className="flex items-center gap-2 text-[12.5px] cursor-pointer" style={{ color: 'var(--ink)' }}>
                  <input
                    type="checkbox"
                    checked={!!draft.preserveEnabled}
                    onChange={(e) => setDraft({ ...draft, preserveEnabled: e.target.checked })}
                  />
                  이 제품은 보존·취급 사양이 적용됩니다 (ISO 13485 §7.5.11 사양 입력)
                </label>

                {draft.preserveEnabled && (
                  <div className="mt-3 space-y-3 p-3 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>보관 조건</label>
                        <select className="input-base mt-1 w-full text-[13px]" value={draft.storageCondition || 'room'} onChange={(e) => setDraft({ ...draft, storageCondition: e.target.value })}>
                          {STORAGE_CONDITIONS.map((c) => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>멸균 방법</label>
                        <select className="input-base mt-1 w-full text-[13px]" value={draft.preserveSterility || STERILITY[0]} onChange={(e) => setDraft({ ...draft, preserveSterility: e.target.value })}>
                          {STERILITY.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <FieldEdit label="온도 최소 (℃)" value={draft.tempMin} onChange={(v) => setDraft({ ...draft, tempMin: v })} placeholder="1" />
                      <FieldEdit label="온도 최대 (℃)" value={draft.tempMax} onChange={(v) => setDraft({ ...draft, tempMax: v })} placeholder="30" />
                      <FieldEdit label="습도 최소 (%RH)" value={draft.humMin} onChange={(v) => setDraft({ ...draft, humMin: v })} placeholder="" />
                      <FieldEdit label="습도 최대 (%RH)" value={draft.humMax} onChange={(v) => setDraft({ ...draft, humMax: v })} placeholder="" />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <FieldEdit label="유효기간 (개월)" value={draft.shelfLifeMonths} onChange={(v) => setDraft({ ...draft, shelfLifeMonths: v })} placeholder="12" />
                      <div>
                        <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>포장 유형</label>
                        <select className="input-base mt-1 w-full text-[13px]" value={draft.packagingType || PACKAGING_TYPES[0]} onChange={(e) => setDraft({ ...draft, packagingType: e.target.value })}>
                          {PACKAGING_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <FieldEdit label="적재 한계" value={draft.stackLimit} onChange={(v) => setDraft({ ...draft, stackLimit: v })} placeholder="5단 이하" />
                      <FieldEdit label="연결 환경 구역 ID" value={draft.linkedEnvZoneId} onChange={(v) => setDraft({ ...draft, linkedEnvZoneId: v })} placeholder="ZON-xxxx" />
                    </div>

                    <div className="flex gap-5">
                      <label className="flex items-center gap-2 text-[12.5px] cursor-pointer" style={{ color: 'var(--ink)' }}>
                        <input type="checkbox" checked={!!draft.lightSensitive} onChange={(e) => setDraft({ ...draft, lightSensitive: e.target.checked })} />
                        차광 보관 필요
                      </label>
                      <label className="flex items-center gap-2 text-[12.5px] cursor-pointer" style={{ color: 'var(--ink)' }}>
                        <input type="checkbox" checked={!!draft.shockSensitive} onChange={(e) => setDraft({ ...draft, shockSensitive: e.target.checked })} />
                        충격 취약
                      </label>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3">
                      <FieldEdit label="포장 사양" value={draft.packagingSpec} onChange={(v) => setDraft({ ...draft, packagingSpec: v })} multiline placeholder="예: PE 파우치 이중 밀봉" />
                      <FieldEdit label="청결 요구사항" value={draft.cleanlinessReq} onChange={(v) => setDraft({ ...draft, cleanlinessReq: v })} multiline placeholder="§7.5.2 참조" />
                      <FieldEdit label="취급 지침" value={draft.handlingInstructions} onChange={(v) => setDraft({ ...draft, handlingInstructions: v })} multiline placeholder="" />
                      <FieldEdit label="보존 사양 비고" value={draft.preserveNotes} onChange={(v) => setDraft({ ...draft, preserveNotes: v })} multiline placeholder="추가 요구사항 또는 특이사항" />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>출하 전 포장·보존 점검 항목</label>
                        <button type="button" onClick={addPkgItem} className="text-[11px] px-2.5 py-1 rounded-lg font-semibold" style={{ background: '#D1FAE5', color: '#059669', border: 'none', cursor: 'pointer' }}>+ 항목 추가</button>
                      </div>
                      <div className="space-y-2">
                        {(draft.pkgCheckItems || []).map((ci, i) => (
                          <div key={i} className="grid gap-2 items-center" style={{ gridTemplateColumns: '1fr 1fr 32px' }}>
                            <input value={ci.name} onChange={(e) => updPkgItem(i, 'name', e.target.value)} placeholder="점검 항목명" className="input-base text-[12px]" />
                            <input value={ci.spec} onChange={(e) => updPkgItem(i, 'spec', e.target.value)} placeholder="기준/허용 범위" className="input-base text-[12px]" />
                            <button type="button" onClick={() => delPkgItem(i)} style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: 6, padding: '6px', cursor: 'pointer' }}><Trash2 size={12} /></button>
                          </div>
                        ))}
                        {(draft.pkgCheckItems || []).length === 0 && (
                          <div className="text-[12px] text-center py-3" style={{ color: 'var(--ink-faint)', background: 'var(--bg-card)', borderRadius: 8 }}>+ 버튼으로 점검 항목을 추가하세요 (미입력 시 기본 항목 사용)</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 mt-1" style={{ borderTop: '1px dashed var(--line)' }}>
                <div className="text-[12.5px] font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                  설치 체크리스트 (ISO 13485 §7.5.3 — 설치·서비스 화면에서 사용)
                </div>
                <div className="space-y-3 p-3 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>체크 항목</label>
                    <button type="button" onClick={addInstallItem} className="text-[11px] px-2.5 py-1 rounded-lg font-semibold" style={{ background: '#D1FAE5', color: '#059669', border: 'none', cursor: 'pointer' }}>+ 항목 추가</button>
                  </div>
                  <div className="space-y-2">
                    {(draft.installCheckItems || []).map((ci, i) => (
                      <div key={i} className="grid gap-2 items-center" style={{ gridTemplateColumns: '1fr 32px' }}>
                        <input value={ci.name} onChange={(e) => updInstallItem(i, e.target.value)} placeholder="설치 점검 항목명" className="input-base text-[12px]" />
                        <button type="button" onClick={() => delInstallItem(i)} style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: 6, padding: '6px', cursor: 'pointer' }}><Trash2 size={12} /></button>
                      </div>
                    ))}
                    {(draft.installCheckItems || []).length === 0 && (
                      <div className="text-[12px] text-center py-3" style={{ color: 'var(--ink-faint)', background: 'var(--bg-card)', borderRadius: 8 }}>+ 버튼으로 항목을 추가하세요 (미입력 시 기본 설치 체크리스트 사용)</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-1" style={{ borderTop: '1px dashed var(--line)' }}>
                <div className="text-[12.5px] font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                  검사 기준서 (ISO 13485 §8.2.4 최종검사 — 개발 설계단계 작성)
                </div>
                <div className="space-y-3 p-3 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
                  <div className="grid md:grid-cols-2 gap-3">
                    <FieldEdit label="기준서 이름" value={draft.inspStdName} onChange={(v) => setDraft({ ...draft, inspStdName: v })} placeholder="예: 완제품 최종검사 기준서" />
                    <FieldEdit label="버전" value={draft.inspStdVersion} onChange={(v) => setDraft({ ...draft, inspStdVersion: v })} placeholder="1.0" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>검사 유형</label>
                      <select className="input-base mt-1 w-full text-[13px]" value={draft.inspStdType || 'fqc'} onChange={(e) => setDraft({ ...draft, inspStdType: e.target.value })}>
                        {INSP_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <FieldEdit label="시행일" type="date" value={draft.inspStdEffectiveDate} onChange={(v) => setDraft({ ...draft, inspStdEffectiveDate: v })} />
                    <FieldEdit label="AQL 수준" value={draft.inspStdAqlLevel} onChange={(v) => setDraft({ ...draft, inspStdAqlLevel: v })} placeholder="0.65" />
                    <FieldEdit label="합격 / 불합격 수량" value={draft.inspStdAcceptQty} onChange={(v) => setDraft({ ...draft, inspStdAcceptQty: v })} placeholder="Ac 0" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>검사 항목</label>
                      <button type="button" onClick={addInspItem} className="text-[11px] px-2.5 py-1 rounded-lg font-semibold" style={{ background: '#D1FAE5', color: '#059669', border: 'none', cursor: 'pointer' }}>+ 항목 추가</button>
                    </div>
                    <div className="space-y-2">
                      {(draft.inspStdCheckItems || []).map((ci, i) => (
                        <div key={i} className="grid gap-2 items-center" style={{ gridTemplateColumns: '1fr 1fr 1fr 32px' }}>
                          <input value={ci.name} onChange={(e) => updInspItem(i, 'name', e.target.value)} placeholder="검사 항목명" className="input-base text-[12px]" />
                          <input value={ci.spec} onChange={(e) => updInspItem(i, 'spec', e.target.value)} placeholder="기준/허용 범위" className="input-base text-[12px]" />
                          <input value={ci.method} onChange={(e) => updInspItem(i, 'method', e.target.value)} placeholder="검사 방법" className="input-base text-[12px]" />
                          <button type="button" onClick={() => delInspItem(i)} style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: 6, padding: '6px', cursor: 'pointer' }}><Trash2 size={12} /></button>
                        </div>
                      ))}
                      {(draft.inspStdCheckItems || []).length === 0 && (
                        <div className="text-[12px] text-center py-3" style={{ color: 'var(--ink-faint)', background: 'var(--bg-card)', borderRadius: 8 }}>+ 버튼으로 검사 항목을 추가하세요</div>
                      )}
                    </div>
                  </div>

                  <FieldEdit label="검사 기준서 비고" value={draft.inspStdNotes} onChange={(v) => setDraft({ ...draft, inspStdNotes: v })} multiline placeholder="추가 참고사항" />
                </div>
              </div>

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
        <ChangeHistoryPanel ccrs={ccrs} onNavigateTo={() => navigate('/change-control')} />
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="card-base p-5 w-full max-w-[420px]" style={{ background: 'var(--bg-card)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Trash2 size={16} style={{ color: '#DC2626' }} />
              <div className="font-display text-[16px]" style={{ color: 'var(--ink)' }}>제품 삭제</div>
            </div>
            <div className="text-[12.5px] mb-3" style={{ color: 'var(--ink-mute)' }}>
              '{product.name}' 제품을 삭제합니다. 이 작업은 되돌릴 수 없으며, 삭제 사유는 CCR(변경관리)로 자동 발의되어 이력에 보존됩니다.
            </div>
            <FieldEdit
              label="삭제 사유 (필수)"
              value={deleteReason}
              onChange={setDeleteReason}
              placeholder="예: 허가취소, 잘못입력, 중복등록 등"
              required
            />
            <div className="flex justify-end gap-2 pt-3">
              <button onClick={() => { setShowDeleteModal(false); setDeleteReason('') }} className="btn-ghost">
                취소
              </button>
              <button onClick={doDelete} className="btn-primary" style={{ background: '#DC2626' }}>
                삭제 확정
              </button>
            </div>
          </div>
        </div>
      )}
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
function ProcessPanel({ product, products, selId, setSelId, onAction }) {
  const productKey = productKeyOf(product)
  const [customList, setCustomList] = useState(() => loadCustomBlocks())
  const [customCat, setCustomCat] = useState('')
  const allBlocks = useMemo(() => [...PROCESS_BLOCKS, ...customList], [customList])
  const findBlock = (id) => allBlocks.find((b) => b.id === id)
  const [list, setList] = useState(() => {
    const ob = onboarding.load()
    return getProductProcesses(ob, productKey).slice().sort((a, b) => (a.order || 0) - (b.order || 0))
  })
  const [picking, setPicking] = useState(false)
  const [q, setQ] = useState('')

  const persist = (next) => {
    const ordered = next.map((p, i) => ({ ...p, order: i + 1 }))
    setList(ordered)
    const ob = onboarding.load()
    onboarding.save(setProductProcesses(ob, productKey, ordered))
    onAction && onAction('공정 순서가 저장되었습니다')
  }
  const addBlock = (b) => { persist([...list, { id: 'p' + Date.now(), blockId: b.id, order: list.length + 1 }]); setPicking(false); setQ('') }
  const addCustomBlock = () => {
    const name = q.trim()
    if (!name) return
    if (!requirePermission('onb.process.addBlock')) return
    const nb = { id: 'custom-' + Date.now(), name, en: '', category: customCat || undefined, desc: '사용자 정의 공정', custom: true, sopAuto: [], inspections: [], standards: [], risks: [] }
    const nextCustom = [...customList, nb]
    setCustomList(nextCustom)
    saveCustomBlocks(nextCustom)
    addBlock(nb)
    setCustomCat('')
  }
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

      {Array.isArray(products) && products.length > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11.5px] mr-1" style={{ color: 'var(--ink-mute)' }}>제품별 공정:</span>
          {products.map((p) => {
            const on = (p.id || 'main') === (product?.id || 'main')
            return (
              <button
                key={p.id || 'main'}
                onClick={() => setSelId && setSelId(p.id || 'main')}
                className="px-3 py-1.5 rounded-lg text-[12.5px] transition"
                style={{
                  background: on ? 'var(--moss)' : 'var(--bg-soft)',
                  color: on ? 'var(--bg)' : 'var(--ink-mute)',
                }}
              >
                {p.name || '(이름없음)'}
              </button>
            )
          })}
        </div>
      )}

      <div className="card-base p-3">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
          <div className="text-[13px]" style={{ color: 'var(--ink)' }}>{product?.name ? `${product.name} · ` : ''}제조·검사 공정 순서 ({list.length}단계)</div>
          <div className="flex gap-2">
            <button onClick={loadDefault} className="btn-ghost text-[12px]">기본 공정체인 불러오기</button>
            <button onClick={() => setPicking((v) => !v)} className="btn-primary text-[12px]" style={{ background: 'var(--rust)' }}>+ 공정 추가</button>
          </div>
        </div>
        <div className="text-[11.5px] mb-2" style={{ color: 'var(--ink-mute)' }}>제품마다 서로 다른 공정을 정의할 수 있습니다. 여기서 정의한 순서대로 (선택된 제품의) 작업 지시 단계가 발급됩니다. 진행 중 작업 지시는 발급 시점 스냅샷이 유지됩니다(시간 잠금).</div>
        {picking && (
          <div className="rounded-md p-2" style={{ background: 'var(--bg-soft)' }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="공정 블록 검색… (목록에 없으면 아래에서 직접 추가)" className="w-full bg-transparent outline-none text-[12.5px] mb-2 px-1" />
            <div className="grid sm:grid-cols-2 gap-1.5 max-h-64 overflow-auto">
              {blockChoices.map((b) => {
                const cat = PROCESS_CATEGORIES.find((c) => c.id === b.category)
                return (
                  <button key={b.id} onClick={() => addBlock(b)} className="text-left px-2.5 py-1.5 rounded-md text-[12px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                    <span style={{ color: 'var(--ink)' }}>{b.name}</span>
                    {b.custom && <span className="ml-1.5 text-[10px] px-1 rounded" style={{ background: 'var(--leaf-soft)', color: 'var(--moss)' }}>직접 추가</span>}
                    {cat && <span className="ml-1.5" style={{ color: 'var(--ink-faint)' }}>· {cat.name}</span>}
                  </button>
                )
              })}
            </div>
            {blockChoices.length === 0 && q.trim() && (
              <div className="text-[11.5px] mt-2 px-1" style={{ color: 'var(--ink-mute)' }}>'{q.trim()}' 검색 결과가 없습니다. 아래에서 목록에 없는 공정으로 직접 추가할 수 있습니다.</div>
            )}
            <div className="mt-2 pt-2 flex items-center gap-1.5 flex-wrap" style={{ borderTop: '1px solid var(--line)' }}>
              <select value={customCat} onChange={(e) => setCustomCat(e.target.value)} className="input-base text-[12px]" style={{ width: 'auto', padding: '5px 8px' }}>
                <option value="">분류 선택 안 함</option>
                {PROCESS_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button onClick={addCustomBlock} disabled={!q.trim()} className="btn-primary text-[12px] disabled:opacity-40" style={{ padding: '5px 10px' }}>
                + '{q.trim() || '…'}' 목록에 없는 공정으로 추가
              </button>
            </div>
          </div>
        )}
      </div>

      {!product && (
        <div className="card-base p-3 text-[12px]" style={{ color: 'var(--rust)', background: 'var(--rust-soft)', borderStyle: 'dashed' }}>
          등록된 제품이 없어 기본(공용) 공정 목록을 편집하고 있습니다. '제품' 탭에서 제품을 추가하면 제품별로 다른 공정을 정의할 수 있습니다.
        </div>
      )}

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
  const usedBlockIds = getAllUsedBlockIds(ob)

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
function ChangeHistoryPanel({ ccrs, onNavigateTo }) {
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
        {onNavigateTo && (
          <button onClick={onNavigateTo} className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ background: 'var(--bg-soft)', color: 'var(--moss)', border: '1px solid var(--line)', cursor: 'pointer' }}>설계변경 바로가기 →</button>
        )}
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
  type,
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
          type={type || 'text'}
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
