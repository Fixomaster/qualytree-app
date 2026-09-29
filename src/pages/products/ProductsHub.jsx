import React, { useMemo, useState, useEffect } from 'react'
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
import { supabase } from '../../lib/supabaseClient'
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
let _sbCidPr = null

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
    if (_sbCidPr) supabase.from('company_data').upsert({company_id: _sbCidPr, data_type: 'localStorage_sync', data_key: CUSTOM_BLOCK_KEY, payload: blocks}, {onConflict: 'company_id,data_type,data_key'})
  } catch {}
}

// Ã¬ÂÂÃ¬ÂÂ½Ã¬Â²Â Ã«Â¶ÂÃ«Â¥Â ÃªÂ¸Â°Ã«Â°Â Ã¬ÂÂ¸Ã­ÂÂÃªÂ°Â Ã¬ÂÂÃ¬Â¢Â (Ã«ÂÂÃ«Â¶ÂÃ«Â¥Â Ã¢ÂÂ Ã¬Â¤ÂÃ«Â¶ÂÃ«Â¥Â)
const MDCAT = {
  'ÃªÂ¸Â°ÃªÂµÂ¬ÃÂ·ÃªÂ¸Â°ÃªÂ³Â': ['Ã¬Â§ÂÃ«Â£ÂÃ¬ÂÂ© ÃªÂ¸Â°ÃªÂ¸Â°', 'Ã¬ÂÂÃ¬ÂÂ Ã¬ÂÂ© ÃªÂ¸Â°ÃªÂ¸Â°', 'Ã¬Â ÂÃ­ÂÂÃ¬ÂÂ©Ã­ÂÂ', 'Ã¬ÂÂÃ¬ÂÂÃ¬Â§ÂÃ«ÂÂ¨Ã¬ÂÂ¥Ã¬Â¹Â', 'Ã¬Â¸Â¡Ã¬Â ÂÃÂ·ÃªÂ°ÂÃ¬ÂÂÃ¬ÂÂ¥Ã¬Â¹Â', 'Ã«Â¬Â¼Ã«Â¦Â¬Ã¬Â¹ÂÃ«Â£ÂÃÂ·Ã¬ÂÂ¬Ã­ÂÂÃªÂ¸Â°ÃªÂ¸Â°', 'Ã¬ÂÂÃªÂ³Â¼Ã¬ÂÂ© ÃªÂ¸Â°ÃªÂ¸Â°', 'Ã«ÂÂ´Ã¬ÂÂÃªÂ²Â½ÃÂ·ÃªÂ´ÂÃ­ÂÂÃªÂ¸Â°ÃªÂ¸Â°', 'ÃªÂ¸Â°Ã­ÂÂ'],
  'Ã¬ÂÂÃ«Â£ÂÃ¬ÂÂ©Ã­ÂÂ': ['Ã¬Â£Â¼Ã¬ÂÂ¬ÃªÂ¸Â°ÃÂ·Ã¬Â£Â¼Ã¬ÂÂ¬Ã¬Â¹Â¨', 'Ã¬Â¹Â´Ã­ÂÂÃ­ÂÂ°ÃÂ·Ã­ÂÂÃ«Â¸Â', 'Ã«Â´ÂÃ­ÂÂ©Ã¬ÂÂ¬ÃÂ·ÃªÂ²Â°Ã¬Â°Â°Ã¬ÂÂ¬', 'Ã¬ÂÂÃ¬ÂÂ¡ÃÂ·Ã¬ÂÂÃ­ÂÂÃ¬ÂÂ¸Ã­ÂÂ¸', 'ÃªÂ±Â°Ã¬Â¦ÂÃÂ·Ã«ÂÂÃ«Â ÂÃ¬ÂÂ±', 'Ã¬Â½ÂÃ­ÂÂÃ­ÂÂ¸Ã«Â ÂÃ¬Â¦Â', 'ÃªÂ¸Â°Ã­ÂÂ'],
  'Ã¬Â²Â´Ã¬ÂÂ¸Ã¬Â§ÂÃ«ÂÂ¨Ã¬ÂÂÃ«Â£ÂÃªÂ¸Â°ÃªÂ¸Â°': ['Ã¬ÂÂÃ­ÂÂÃ­ÂÂ ÃªÂ²ÂÃ¬ÂÂ¬', 'Ã«Â©Â´Ã¬ÂÂ­ ÃªÂ²ÂÃ¬ÂÂ¬', 'Ã«Â¶ÂÃ¬ÂÂÃ¬Â§ÂÃ«ÂÂ¨(NAT)', 'Ã­ÂÂÃ¬ÂÂ¡ÃÂ·Ã­ÂÂÃ«ÂÂ¹ ÃªÂ²ÂÃ¬ÂÂ¬', 'Ã¬ÂÂÃªÂ°ÂÃªÂ²ÂÃ¬ÂÂ¬', 'ÃªÂ¸Â°Ã­ÂÂ'],
  'Ã¬Â¹ÂÃªÂ³Â¼Ã¬ÂÂ¬Ã«Â£Â': ['Ã¬Â¶Â©Ã¬Â ÂÃÂ·Ã¬ÂÂÃ«Â³ÂµÃ¬ÂÂ¬Ã«Â£Â', 'Ã¬ÂÂ¸Ã¬ÂÂÃ¬ÂÂ¬', 'Ã¬ÂÂÃ¬Â¹ÂÃÂ·ÃªÂµÂÃ¬Â ÂÃ¬ÂÂ¬Ã«Â£Â', 'Ã¬ÂÂÃ­ÂÂÃ«ÂÂÃ­ÂÂ¸', 'ÃªÂ¸Â°Ã­ÂÂ'],
  'Ã¬ÂÂÃ­ÂÂÃ­ÂÂ¸Ã¬ÂÂ¨Ã¬ÂÂ´ÃÂ·Ã«ÂÂÃ¬Â§ÂÃ­ÂÂ¸(SaMD)': ['Ã¬Â§ÂÃ«ÂÂ¨Ã«Â³Â´Ã¬Â¡Â° SW', 'AI Ã¬ÂÂÃ¬ÂÂÃ«Â¶ÂÃ¬ÂÂ', 'Ã­ÂÂÃ¬ÂÂ Ã«ÂªÂ¨Ã«ÂÂÃ­ÂÂ°Ã«Â§Â', 'Ã«ÂÂÃ¬Â§ÂÃ­ÂÂ¸Ã¬Â¹ÂÃ«Â£ÂÃªÂ¸Â°ÃªÂ¸Â°(DTx)', 'ÃªÂ¸Â°Ã­ÂÂ'],
  'ÃªÂ¸Â°Ã­ÂÂ': [],
}
const MDCAT1 = Object.keys(MDCAT)

/**
 * PROD-001 Ã¬Â ÂÃ­ÂÂ Ã«ÂÂ¼Ã¬ÂÂ´Ã«Â¸ÂÃ«ÂÂ¬Ã«Â¦Â¬ (Ã«Â©ÂÃ¬ÂÂ¸)
 *   - Ã­ÂÂ­ 1: Ã¬Â ÂÃ­ÂÂ Ã«Â§ÂÃ¬ÂÂ¤Ã­ÂÂ° (PROD-001)
 *   - Ã­ÂÂ­ 2: ÃªÂ³ÂµÃ¬Â Â Ã«ÂÂ¼Ã¬ÂÂ´Ã«Â¸ÂÃ«ÂÂ¬Ã«Â¦Â¬ (PROD-002)
 *   - Ã­ÂÂ­ 3: ÃªÂ²ÂÃ¬ÂÂ¬ Ã­ÂÂ­Ã«ÂªÂ© Ã«Â§ÂÃ¬ÂÂ¤Ã­ÂÂ° (PROD-003)
 *
 * Ã¬Â ÂÃ¬ÂÂ© Ã­ÂÂÃ¬Â¤Â:
 * - ISO 13485:2016 ÃÂ§4.2.4 (Ã«Â¬Â¸Ã¬ÂÂ ÃªÂ´ÂÃ«Â¦Â¬), ÃÂ§7.3 (Ã¬ÂÂ¤ÃªÂ³Â ÃªÂ°ÂÃ«Â°Â)
 * - 21 CFR 820.30 (Design Controls), ÃÂ§820.40 (Document Controls)
 * - Project Instructions ÃÂ§9 SSoT, ÃÂ§13.15 ÃªÂµÂ¬Ã¬ÂÂ± ÃªÂ´ÂÃ«Â¦Â¬
 */
const DEFAULT_CHAIN = [
  { blockId: 'visual-inspection', customName: 'Ã¬ÂÂÃ¬ÂÂÃªÂ²ÂÃ¬ÂÂ¬(IQC)' },
  { blockId: 'manual-assembly', customName: 'Ã¬Â£Â¼ÃªÂ³ÂµÃ¬Â Â' },
  { blockId: 'cmm-inspection', customName: 'ÃªÂ³ÂµÃ¬Â ÂÃªÂ²ÂÃ¬ÂÂ¬(IPQC)' },
  { blockId: 'functional-test', customName: 'Ã¬ÂµÂÃ¬Â¢ÂÃªÂ²ÂÃ¬ÂÂ¬(OQC)' },
  { blockId: 'primary-packaging', customName: 'Ã­ÂÂ¬Ã¬ÂÂ¥' },
  { blockId: 'labeling', customName: 'Ã«ÂÂ¼Ã«Â²Â¨Ã«Â§Â' },
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

  // Ã¬ÂÂ¨Ã«Â³Â´Ã«ÂÂ© Ã«ÂÂ°Ã¬ÂÂ´Ã­ÂÂ°Ã¬ÂÂÃ¬ÂÂ Ã­ÂÂÃ¬ÂÂ¬ÃÂ·Ã¬Â ÂÃ­ÂÂ Ã¬Â¶ÂÃ¬Â¶Â (Ã«ÂÂ¤Ã¬Â¤Â Ã¬Â ÂÃ­ÂÂ Ã¬Â§ÂÃ¬ÂÂ)
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
  // Ã¬Â ÂÃ­ÂÂ Ã­ÂÂ­ Ã¬Â ÂÃ¬ÂÂ©: Ã¬Â¹Â´Ã«ÂÂ ÃªÂ·Â¸Ã«Â¦Â¬Ã«ÂÂ(Ã«ÂªÂ©Ã«Â¡Â) Ã¢ÂÂ Ã¬ÂÂÃ¬ÂÂ¸(ÃªÂ¸Â°Ã«Â³Â¸Ã¬Â ÂÃ«Â³Â´/Ã«ÂªÂ¨Ã«ÂÂ¸ Ã«ÂªÂ©Ã«Â¡Â/Ã¬ÂÂ¤ÃªÂ³Â ÃªÂ³ÂÃ­ÂÂ) Ã¬Â ÂÃ­ÂÂ
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
      title="Ã¬Â ÂÃ­ÂÂ ÃÂ· ÃªÂ³ÂµÃ¬Â Â"
      subtitle="Ã­ÂÂÃªÂ°ÂÃ¬Â¦Â Ã«ÂÂ¨Ã¬ÂÂ Ã­ÂÂµÃ­ÂÂ© ÃªÂ´ÂÃ«Â¦Â¬ ÃÂ· Ã¬ÂÂ¤ÃªÂ³ÂÃªÂ°ÂÃ«Â°Â Ã¬Â ÂÃ¬Â£Â¼ÃªÂ¸Â°"
    >
      <HubBanner icon={PackageSearch} title="Ã¬Â ÂÃ­ÂÂ ÃªÂ´ÂÃ«Â¦Â¬" subtitle="Ã¬Â ÂÃ­ÂÂ Ã«ÂÂ±Ã«Â¡Â Ã«Â°Â ÃªÂ´ÂÃ«Â¦Â¬" color="#475569" />
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
            Ã¢ÂÂ {toast}
          </div>
        )}

        {/* Ã­ÂÂ¤Ã«ÂÂ */}
        <div className="mb-5">
          <span
            className="font-mono text-[10px] tracking-[0.18em] uppercase"
            style={{ color: 'var(--moss)' }}
          >
            PROD ÃÂ· PRODUCT & PROCESS LIBRARY
          </span>
          <div
            className="font-display text-[26px] mt-1"
            style={{ color: 'var(--ink)', fontWeight: 500 }}
          >
            Ã¬Â ÂÃ­ÂÂÃÂ·ÃªÂ³ÂµÃ¬Â Â Ã«Â§ÂÃ¬ÂÂ¤Ã­ÂÂ°
          </div>
          <div
            className="text-[12.5px] mt-0.5"
            style={{ color: 'var(--ink-mute)' }}
          >
            ISO 13485 ÃÂ§4.2.4 / 21 CFR 820.30 / 820.40 Ã¢ÂÂ Ã«ÂªÂ¨Ã«ÂÂ  Ã«Â³ÂÃªÂ²Â½Ã¬ÂÂ CCR Ã¬ÂÂÃ«ÂÂ Ã«Â°ÂÃ¬ÂÂ
          </div>
        </div>

        {/* Ã¬ÂÂ¨Ã«Â³Â´Ã«ÂÂ© Ã«Â¯Â¸Ã¬ÂÂ Ã¬ÂÂÃ«ÂÂ´ */}
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
              Ã­ÂÂÃ¬ÂÂ¬ÃÂ·Ã¬Â ÂÃ­ÂÂ Ã¬Â ÂÃ«Â³Â´ÃªÂ°Â Ã¬ÂÂÃ¬Â§Â Ã«ÂÂ±Ã«Â¡ÂÃ«ÂÂÃ¬Â§Â Ã¬ÂÂÃ¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤
            </div>
            <div
              className="mt-1 text-[12px]"
              style={{ color: 'var(--ink-mute)' }}
            >
              Ã¬ÂÂ¨Ã«Â³Â´Ã«ÂÂ©Ã¬ÂÂ Ã«Â¨Â¼Ã¬Â Â Ã¬ÂÂÃ«Â£ÂÃ­ÂÂÃ¬ÂÂÃªÂ±Â°Ã«ÂÂ Ã«ÂÂ°Ã«ÂªÂ¨ Ã«ÂÂ°Ã¬ÂÂ´Ã­ÂÂ°Ã«Â¥Â¼ Ã¬Â±ÂÃ¬ÂÂÃ«Â³Â´Ã¬ÂÂ¸Ã¬ÂÂ.
            </div>
            <button
              onClick={() => nav('/onboarding')}
              className="btn-primary mt-3"
            >
              Ã¬ÂÂ¨Ã«Â³Â´Ã«ÂÂ© Ã¬ÂÂÃ¬ÂÂ <ArrowRight size={13} />
            </button>
          </div>
        )}

        {hasOnboarding && (
          <>
            
            {/* Ã­ÂÂ­ Ã«ÂÂ´Ã¬ÂÂ© */}
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
                      showToast(productKind(p) === PRODUCT_KIND.NEW ? 'Ã¬ÂÂ ÃªÂ·Â Ã¬Â ÂÃ­ÂÂÃ¬ÂÂ´ Ã«ÂÂ±Ã«Â¡ÂÃ«ÂÂÃ¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤ ÃÂ· Ã¬ÂÂ¤ÃªÂ³Â ÃªÂ³ÂÃ­ÂÂÃ¬ÂÂ Ã¬ÂÂÃ¬ÂÂÃ­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ ÃÂ· CCR Ã¬ÂÂÃ«ÂÂ Ã«Â°ÂÃ¬ÂÂ' : 'Ã¬Â ÂÃ­ÂÂÃ¬ÂÂ´ Ã«ÂÂ±Ã«Â¡ÂÃ«ÂÂÃ¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤ ÃÂ· CCR Ã¬ÂÂÃ«ÂÂ Ã«Â°ÂÃ¬ÂÂ')
                      setTimeout(() => window.location.reload(), 600)
                    }}
                  />
                )}
                {productView === 'detail' && !addingProduct && (
                  product ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <button onClick={() => setProductView('grid')} className="btn-ghost text-[12px]">
                          <ChevronLeft size={13} /> Ã¬Â ÂÃ­ÂÂ Ã«ÂªÂ©Ã«Â¡ÂÃ¬ÂÂ¼Ã«Â¡Â
                        </button>
                        <div className="flex gap-1 rounded-lg p-1 flex-wrap" style={{ background: 'var(--bg-soft)' }}>
                          <DetailTabBtn active={detailTab === 'info'} onClick={() => setDetailTab('info')} label="ÃªÂ¸Â°Ã«Â³Â¸Ã¬Â ÂÃ«Â³Â´" />
                          <DetailTabBtn active={detailTab === 'models'} onClick={() => setDetailTab('models')} label="Ã«ÂªÂ¨Ã«ÂÂ¸ Ã«ÂªÂ©Ã«Â¡Â" count={productModels.getForProduct(productKeyOf(product)).length} />
                          {productKind(product) === PRODUCT_KIND.NEW && (
                            <DetailTabBtn active={detailTab === 'design'} onClick={() => setDetailTab('design')} label="Ã¬ÂÂ¤ÃªÂ³Â ÃªÂ³ÂÃ­ÂÂ" />
                          )}
                          <DetailTabBtn active={detailTab === 'customer-req'} onClick={() => setDetailTab('customer-req')} label="ÃªÂ³Â ÃªÂ°ÂÃ¬ÂÂÃªÂµÂ¬Ã¬ÂÂ¬Ã­ÂÂ­" />
                          <DetailTabBtn active={detailTab === 'dhf'} onClick={() => setDetailTab('dhf')} label="DHF" />
                          <DetailTabBtn active={detailTab === 'dmr'} onClick={() => setDetailTab('dmr')} label="DMR" />
                          <DetailTabBtn active={detailTab === 'risk'} onClick={() => setDetailTab('risk')} label="Ã¬ÂÂÃ­ÂÂÃªÂ´ÂÃ«Â¦Â¬" />
                          <DetailTabBtn active={detailTab === 'validation'} onClick={() => setDetailTab('validation')} label="Ã«Â°Â¸Ã«Â¦Â¬Ã«ÂÂ°Ã¬ÂÂ´Ã¬ÂÂ" />
                          <DetailTabBtn active={detailTab === 'pcp'} onClick={() => setDetailTab('pcp')} label="Ã¬ÂÂÃ¬ÂÂ°Ã¬Â ÂÃ¬ÂÂ´ÃªÂ³ÂÃ­ÂÂ" />
                        <DetailTabBtn active={detailTab === 'process'} onClick={() => setDetailTab('process')} label="ÃªÂ³ÂµÃ¬Â Â" />
                        <DetailTabBtn active={detailTab === 'inspection'} onClick={() => setDetailTab('inspection')} label="ÃªÂ²ÂÃ¬ÂÂ¬Ã­ÂÂ­Ã«ÂªÂ©" />
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
                      <div className="mt-3 text-[13.5px]" style={{ color: 'var(--ink)' }}>Ã«ÂÂ±Ã«Â¡ÂÃ«ÂÂ Ã¬Â ÂÃ­ÂÂÃ¬ÂÂ´ Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤</div>
                      <div className="mt-1 text-[12px]" style={{ color: 'var(--ink-mute)' }}>'Ã¬Â ÂÃ­ÂÂ Ã«ÂÂ±Ã«Â¡Â' Ã«Â²ÂÃ­ÂÂ¼Ã¬ÂÂ¼Ã«Â¡Â Ã¬Â²Â« Ã¬Â ÂÃ­ÂÂÃ¬ÂÂ Ã«ÂÂ±Ã«Â¡ÂÃ­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ.</div>
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
   PROD-001 Ã¬Â ÂÃ­ÂÂ Ã­ÂÂ¨Ã«ÂÂ
   ================================================================ */

/* ================================================================
   Ã¬Â ÂÃ­ÂÂ Ã¬Â¹Â´Ã«ÂÂ ÃªÂ·Â¸Ã«Â¦Â¬Ã«ÂÂ Ã¢ÂÂ Ã¬Â ÂÃ­ÂÂ Ã­ÂÂ­ ÃªÂ¸Â°Ã«Â³Â¸ Ã­ÂÂÃ«Â©Â´ (ÃªÂ¸Â°Ã­ÂÂÃªÂ°Â/Ã¬ÂÂ ÃªÂ·Â Ã¬Â¹Â´Ã«ÂÂ + Ã­ÂÂÃ¬ÂÂ´Ã¬Â§ÂÃ«ÂÂ¤Ã¬ÂÂ´Ã¬ÂÂ)
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
          <span>ÃªÂ¸Â°Ã­ÂÂÃªÂ°Â Ã¬Â ÂÃ­ÂÂÃ¬ÂÂ Ã­ÂÂÃªÂ°Â Ã¬Â ÂÃ«Â³Â´ Ã¬ÂÂÃ«Â Â¥Ã¬ÂÂ¼Ã«Â¡Â Ã«ÂÂ±Ã«Â¡ÂÃ­ÂÂÃªÂ³Â , Ã¬ÂÂ ÃªÂ·Â ÃªÂ°ÂÃ«Â°Â Ã¬Â ÂÃ­ÂÂÃ¬ÂÂ Ã¬ÂÂ¤ÃªÂ³Â ÃªÂ³ÂÃ­ÂÂÃ«Â¶ÂÃ­ÂÂ° Ã¬ÂÂÃ¬ÂÂÃ­ÂÂ©Ã«ÂÂÃ«ÂÂ¤.</span>
        </div>
        {canEdit && (
          <button onClick={onAdd} className="btn-primary text-[12.5px] shrink-0">
            <Plus size={13} /> Ã¬Â ÂÃ­ÂÂ Ã«ÂÂ±Ã«Â¡Â
          </button>
        )}
      </div>

      {products.length === 0 ? (
        <div className="card-base p-8 text-center" style={{ borderStyle: 'dashed' }}>
          <PackageSearch size={28} style={{ color: 'var(--ink-faint)', margin: '0 auto' }} strokeWidth={1.4} />
          <div className="mt-3 text-[13.5px]" style={{ color: 'var(--ink)' }}>Ã«ÂÂ±Ã«Â¡ÂÃ«ÂÂ Ã¬Â ÂÃ­ÂÂÃ¬ÂÂ´ Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤</div>
          <div className="mt-1 text-[12px]" style={{ color: 'var(--ink-mute)' }}>'Ã¬Â ÂÃ­ÂÂ Ã«ÂÂ±Ã«Â¡Â' Ã«Â²ÂÃ­ÂÂ¼Ã¬ÂÂ¼Ã«Â¡Â Ã¬Â²Â« Ã¬Â ÂÃ­ÂÂÃ¬ÂÂ Ã«ÂÂ±Ã«Â¡ÂÃ­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ.</div>
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
                <ChevronLeft size={13} /> Ã¬ÂÂ´Ã¬Â Â
              </button>
              <span className="font-mono text-[12px]" style={{ color: 'var(--ink-mute)' }}>{page + 1} / {totalPages}</span>
              <button onClick={() => setPage((x) => Math.min(totalPages - 1, x + 1))} disabled={page >= totalPages - 1} className="btn-ghost text-[12px] disabled:opacity-30">
                Ã«ÂÂ¤Ã¬ÂÂ <ChevronRight size={13} />
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
          {isNew ? 'Ã¬ÂÂ ÃªÂ·Â' : 'ÃªÂ¸Â°Ã­ÂÂÃªÂ°Â'}
        </span>
        <div className="text-[15px] font-semibold leading-tight" style={{ color: 'var(--ink)' }}>{product.name || '(Ã¬ÂÂ´Ã«Â¦ÂÃ¬ÂÂÃ¬ÂÂ)'}</div>
        <div className="font-mono text-[11px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>{product.classNo || product.itemName || '\u2014'}</div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-[11.5px] pt-2" style={{ borderTop: '1px solid var(--line)' }}>
        <div>
          <div className="font-mono text-[9.5px] tracking-wide uppercase" style={{ color: 'var(--ink-faint)' }}>Ã«ÂÂ±ÃªÂ¸Â</div>
          <div className="mt-0.5" style={{ color: 'var(--ink)' }}>{product.grade ? product.grade + 'Ã«ÂÂ±ÃªÂ¸Â' : (isNew ? '3Ã«ÂÂ±ÃªÂ¸Â Ã¬ÂÂÃ¬Â Â' : '\uBBF8\uBD84\uB958')}</div>
        </div>
        <div>
          <div className="font-mono text-[9.5px] tracking-wide uppercase" style={{ color: 'var(--ink-faint)' }}>Ã­ÂÂÃªÂ°ÂÃ«Â²ÂÃ­ÂÂ¸</div>
          <div className="mt-0.5 truncate" style={{ color: 'var(--ink)' }}>{isNew ? 'Ã¬ÂÂ¤ÃªÂ³Â Ã¬Â§ÂÃ­ÂÂÃ¬Â¤Â' : (licProg.primaryLicense?.licenseNo || 'Ã«Â¯Â¸Ã«ÂÂ±Ã«Â¡Â')}</div>
        </div>
        <div>
          <div className="font-mono text-[9.5px] tracking-wide uppercase" style={{ color: 'var(--ink-faint)' }}>Ã«ÂªÂ¨Ã«ÂÂ¸ Ã¬ÂÂ</div>
          <div className="mt-0.5" style={{ color: 'var(--ink)' }}>{isNew ? 'ÃªÂ°ÂÃ«Â°ÂÃ¬Â¤Â' : (models.length ? models.length + 'ÃªÂ°Â' : '0ÃªÂ°Â')}</div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span style={{ color: 'var(--ink-mute)' }}>{isNew ? 'Ã¬ÂÂ¤ÃªÂ³Â Ã¬Â§ÂÃ­ÂÂÃ«Â¥Â ' : 'Ã«ÂÂ±Ã«Â¡Â Ã¬ÂÂÃ«Â£Â'}</span>
          <span className="font-mono font-medium" style={{ color: isNew ? 'var(--amber)' : 'var(--moss)' }}>{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full w-full" style={{ background: 'var(--bg-soft)' }}>
          <div className="h-1.5 rounded-full" style={{ width: pct + '%', background: isNew ? 'var(--amber)' : 'var(--moss)' }} />
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => onOpen(product, 'models')} className="btn-ghost text-[12px] flex-1 justify-center">
          Ã«ÂªÂ¨Ã«ÂÂ¸ Ã«ÂªÂ©Ã«Â¡Â <ArrowRight size={12} />
        </button>
        {isNew ? (
          <button onClick={() => onOpen(product, 'dhf')} className="text-[12px] font-medium px-3 py-1.5 rounded-lg flex-1 flex items-center justify-center gap-1" style={{ background: 'var(--amber-soft)', color: 'var(--amber)' }}>
            Ã¬ÂÂ¤ÃªÂ³Â ÃªÂ³ÂÃ¬ÂÂ <ArrowRight size={12} />
          </button>
        ) : (
          <button onClick={() => onOpen(product, 'info')} className="btn-primary text-[12px] flex-1 justify-center">
            Ã¬ÂÂ¤ÃªÂ³Â Ã«Â³ÂÃªÂ²Â½ <ArrowRight size={12} />
          </button>
        )}
      </div>

      {isNew ? (
        <div className="rounded-lg px-3 py-2" style={{ background: 'var(--amber-soft)' }}>
          <div className="font-mono text-[9.5px] tracking-wide uppercase" style={{ color: 'var(--amber)' }}>Ã­ÂÂÃ¬ÂÂ¬ Ã«ÂÂ¨ÃªÂ³Â</div>
          <div className="text-[12.5px] font-medium mt-0.5" style={{ color: 'var(--ink)' }}>{desProg.currentLabel}</div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>{desProg.done} / {desProg.total} Ã«ÂÂ¨ÃªÂ³Â Ã¬ÂÂÃ«Â£Â</div>
        </div>
      ) : (
        <div className="rounded-lg p-2" style={{ background: 'var(--bg-soft)' }}>
          <div className="font-mono text-[9.5px] tracking-wide uppercase mb-1" style={{ color: 'var(--ink-faint)' }}>Ã«ÂªÂ¨Ã«ÂÂ¸ Ã«ÂªÂ©Ã«Â¡Â Ã«Â¯Â¸Ã«Â¦Â¬Ã«Â³Â´ÃªÂ¸Â°</div>
          {models.length === 0 ? (
            <div className="text-[11.5px] py-1" style={{ color: 'var(--ink-faint)' }}>Ã«ÂÂ±Ã«Â¡ÂÃ«ÂÂ Ã«ÂªÂ¨Ã«ÂÂ¸Ã¬ÂÂ´ Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤.</div>
          ) : (
            <div className="space-y-0.5">
              {models.slice(0, 3).map((m) => (
                <div key={m.id} className="flex items-center gap-2 text-[11.5px]">
                  <span className="font-mono shrink-0" style={{ color: 'var(--moss)' }}>{m.code || '(Ã¬Â½ÂÃ«ÂÂÃ¬ÂÂÃ¬ÂÂ)'}</span>
                  <span className="truncate" style={{ color: 'var(--ink-mute)' }}>{m.spec}</span>
                </div>
              ))}
              {models.length > 3 && <div className="text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>+{models.length - 3}ÃªÂ°Â Ã«ÂÂ</div>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ================================================================
   Ã«ÂªÂ¨Ã«ÂÂ¸(Ã«Â³ÂÃ­ÂÂ) Ã«ÂªÂ©Ã«Â¡Â Ã­ÂÂ¨Ã«ÂÂ
   ================================================================ */
function ModelListPanel({ product, onAction }) {
  const key = productKeyOf(product)
  const canEdit = permissions.can('onb.product.edit')
  const [models, setModels] = useState(() => productModels.getForProduct(key))
  const [code, setCode] = useState('')
  const [spec, setSpec] = useState('')

  const refresh = () => setModels(productModels.getForProduct(key))

  const add = () => {
    if (!code.trim()) { alert('Ã«ÂªÂ¨Ã«ÂÂ¸Ã¬Â½ÂÃ«ÂÂÃ«ÂÂ Ã­ÂÂÃ¬ÂÂÃ¬ÂÂÃ«ÂÂÃ«ÂÂ¤.'); return }
    productModels.add(key, { code: code.trim(), spec: spec.trim() })
    setCode(''); setSpec('')
    refresh()
    onAction('Ã«ÂªÂ¨Ã«ÂÂ¸Ã¬ÂÂ´ Ã¬Â¶ÂÃªÂ°ÂÃ«ÂÂÃ¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤.')
  }

  const del = (id) => {
    if (!window.confirm('Ã¬ÂÂ´ Ã«ÂªÂ¨Ã«ÂÂ¸Ã¬ÂÂ Ã¬ÂÂ­Ã¬Â ÂÃ­ÂÂ ÃªÂ¹ÂÃ¬ÂÂ?')) return
    productModels.remove(id)
    refresh()
    onAction('Ã«ÂªÂ¨Ã«ÂÂ¸Ã¬ÂÂ´ Ã¬ÂÂ­Ã¬Â ÂÃ«ÂÂÃ¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤.')
  }

  return (
    <div className="card-base p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--moss)' }}>
          MODEL LIST ÃÂ· {product.name}
        </span>
        <span className="font-mono text-[11px] px-2 py-0.5 rounded" style={{ background: 'var(--bg-soft)', color: 'var(--ink-mute)' }}>
          {models.length}ÃªÂ°Â Ã«ÂªÂ¨Ã«ÂÂ¸
        </span>
      </div>

      {canEdit && (
        <div className="grid md:grid-cols-[1fr_2fr_auto] gap-2 pb-3 mb-3" style={{ borderBottom: '1px solid var(--line)' }}>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ã«ÂªÂ¨Ã«ÂÂ¸Ã¬Â½ÂÃ«ÂÂ (Ã¬ÂÂ: PA-SCS-3522)" className="input-base text-[13px]" />
          <input value={spec} onChange={(e) => setSpec(e.target.value)} placeholder="ÃªÂ·ÂÃªÂ²Â©/Ã¬ÂÂ¤Ã«ÂªÂ (Ã¬ÂÂ: SCS M3.5x22mm)" className="input-base text-[13px]" onKeyDown={(e) => e.key === 'Enter' && add()} />
          <button onClick={add} className="btn-primary text-[12.5px]"><Plus size={13} /> Ã¬Â¶ÂÃªÂ°Â</button>
        </div>
      )}

      {models.length === 0 ? (
        <div className="text-center py-8 text-[12.5px]" style={{ color: 'var(--ink-faint)' }}>Ã«ÂÂ±Ã«Â¡ÂÃ«ÂÂ Ã«ÂªÂ¨Ã«ÂÂ¸Ã¬ÂÂ´ Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤.</div>
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
      <ComplianceFooter regs={['ISO 13485 ÃÂ§7.5.8 (Ã¬ÂÂÃ«Â³Â)', '21 CFR 820.60']} />
    </div>
  )
}

/* ================================================================
   Ã¬ÂÂ¤ÃªÂ³Â ÃªÂ³ÂÃ­ÂÂ Ã­ÂÂ¨Ã«ÂÂ (Ã¬ÂÂ ÃªÂ·Â Ã¬Â ÂÃ­ÂÂ ÃÂ· 9Ã«ÂÂ¨ÃªÂ³Â Ã¬ÂÂ¤ÃªÂ³ÂÃªÂ´ÂÃ«Â¦Â¬ Ã¬Â²Â´Ã­ÂÂ¬Ã«Â¦Â¬Ã¬ÂÂ¤Ã­ÂÂ¸)
   ================================================================ */
const STAGE_REQUIRED_DOCS = [
  ['Ã¬ÂÂ¤ÃªÂ³Â Ã¬ÂÂÃ«Â Â¥ Ã«ÂªÂÃ¬ÂÂ¸Ã¬ÂÂ', 'Ã¬ÂÂ¬Ã¬ÂÂ©Ã¬ÂÂ Ã¬ÂÂÃªÂµÂ¬Ã¬ÂÂ¬Ã­ÂÂ­ Ã«Â¬Â¸Ã¬ÂÂ (URS)', 'Ã«Â²ÂÃ¬Â ÂÃÂ·ÃªÂ·ÂÃ¬Â Â Ã¬ÂÂÃªÂµÂ¬Ã¬ÂÂ¬Ã­ÂÂ­ Ã«ÂªÂ©Ã«Â¡Â'],
  ['Ã¬ÂÂ¤ÃªÂ³Â Ã¬Â¶ÂÃ«Â Â¥ Ã«ÂÂÃ«Â©Â´ Ã«Â°Â Ã¬ÂÂ¬Ã¬ÂÂÃ¬ÂÂ', 'Ã¬Â ÂÃ¬Â¡Â° Ã¬Â§ÂÃ¬ÂÂÃ¬ÂÂ Ã¬Â´ÂÃ¬ÂÂ (WI/BOM)', 'ÃªÂ²ÂÃ¬ÂÂ¬ÃÂ·Ã¬ÂÂÃ­ÂÂ Ã¬Â ÂÃ¬Â°Â¨Ã¬ÂÂ'],
  ['Ã¬ÂÂ¤ÃªÂ³Â ÃªÂ²ÂÃ­ÂÂ  Ã­ÂÂÃ¬ÂÂÃ«Â¡Â', 'ÃªÂ²ÂÃ­ÂÂ  Ã¬Â°Â¸Ã¬ÂÂÃ¬ÂÂ Ã¬ÂÂÃ«ÂªÂÃ«Â¶Â', 'Ã¬Â¡Â°Ã¬Â¹ÂÃ¬ÂÂ¬Ã­ÂÂ­ Ã¬Â¶ÂÃ¬Â Â Ã«ÂªÂ©Ã«Â¡Â'],
  ['ÃªÂ²ÂÃ¬Â¦Â ÃªÂ³ÂÃ­ÂÂÃ¬ÂÂ (Verification Plan)', 'ÃªÂ²ÂÃ¬Â¦Â Ã­ÂÂÃ«Â¡ÂÃ­ÂÂ Ã¬Â½Â', 'ÃªÂ²ÂÃ¬Â¦Â ÃªÂ²Â°ÃªÂ³Â¼ Ã«Â³Â´ÃªÂ³Â Ã¬ÂÂ'],
  ['Ã«Â°Â¸Ã«Â¦Â¬Ã«ÂÂ°Ã¬ÂÂ´Ã¬ÂÂ ÃªÂ³ÂÃ­ÂÂÃ¬ÂÂ', 'Ã¬ÂÂÃ¬ÂÂ Ã­ÂÂÃªÂ°Â Ã«Â³Â´ÃªÂ³Â Ã¬ÂÂ (CER)', 'Ã«Â°Â¸Ã«Â¦Â¬Ã«ÂÂ°Ã¬ÂÂ´Ã¬ÂÂ ÃªÂ²Â°ÃªÂ³Â¼ Ã«Â³Â´ÃªÂ³Â Ã¬ÂÂ'],
  ['Ã¬ÂÂÃ­ÂÂÃ«Â¶ÂÃ¬ÂÂÃ¬ÂÂ (ISO 14971)', 'Ã¬ÂÂÃ­ÂÂ ÃªÂ´ÂÃ«Â¦Â¬ ÃªÂ³ÂÃ­ÂÂÃ¬ÂÂ (RMP)', 'Ã¬ÂÂÃ¬ÂÂ¬ Ã¬ÂÂÃ­ÂÂ Ã¬ÂÂÃ¬ÂÂ©Ã¬ÂÂ± Ã­ÂÂÃªÂ°ÂÃ¬ÂÂ'],
  ['Ã¬ÂÂ´ÃªÂ´Â Ã¬Â²Â´Ã­ÂÂ¬Ã«Â¦Â¬Ã¬ÂÂ¤Ã­ÂÂ¸', 'DMR (Device Master Record)', 'Ã¬Â ÂÃ¬Â¡Â° ÃªÂ°ÂÃ«ÂÂ¥Ã¬ÂÂ± ÃªÂ²ÂÃ­ÂÂ Ã¬ÂÂ'],
  ['Ã¬ÂÂ¸Ã­ÂÂÃªÂ°Â Ã¬ÂÂ Ã¬Â²Â­ Ã­ÂÂ¨Ã­ÂÂ¤Ã¬Â§Â', 'ÃªÂ¸Â°Ã¬ÂÂ Ã«Â¬Â¸Ã¬ÂÂ (Technical File)', 'ÃªÂ·ÂÃ¬Â Â Ã¬Â ÂÃ«ÂÂµ Ã«Â¬Â¸Ã¬ÂÂ'],
  ['Ã­ÂÂÃªÂ°ÂÃ¬Â¦Â Ã¬ÂÂ¬Ã«Â³Â¸', 'Ã¬Â ÂÃ¬Â¡Â°Ã­ÂÂÃªÂ°Â Ã¬Â¡Â°ÃªÂ±Â´ ÃªÂ²ÂÃ­ÂÂ Ã¬ÂÂ', 'Ã¬ÂÂ¸Ã­ÂÂÃªÂ°Â Ã¬ÂÂ Ã¬Â§Â ÃªÂ³ÂÃ­ÂÂÃ¬ÂÂ'],
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
      reason: (next[idx] ? DESIGN_STAGES[idx] + ' Ã¬ÂÂÃ«Â£Â' : DESIGN_STAGES[idx] + ' Ã¬ÂÂ¬ÃªÂ°Â'),
    })

    onAction(next[idx] ? DESIGN_STAGES[idx] + ' Ã¬ÂÂÃ«Â£Â Ã¬Â²ÂÃ«Â¦Â¬Ã«ÂÂÃ¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤.' : DESIGN_STAGES[idx] + ' Ã«Â¥Â¼ Ã«ÂÂ¤Ã¬ÂÂ Ã¬Â§ÂÃ­ÂÂÃ¬Â¤ÂÃ¬ÂÂ¼Ã«Â¡Â Ã«ÂÂÃ«ÂÂÃ«Â Â¸Ã¬ÂÂµÃ«ÂÂÃ«ÂÂ¤.')
    setTimeout(() => window.location.reload(), 500)
  }

  return (
    <div className="card-base p-5">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--amber)' }}>
          DESIGN PLAN ÃÂ· {product.name}
        </span>
        <span className="font-mono text-[11px] px-2 py-0.5 rounded" style={{ background: 'var(--amber-soft)', color: 'var(--amber)' }}>
          {progress.done} / {progress.total} Ã«ÂÂ¨ÃªÂ³Â Ã¬ÂÂÃ«Â£Â ({progress.pct}%)
        </span>
      </div>
      <div className="text-[11.5px] mb-4" style={{ color: 'var(--ink-mute)' }}>ISO 13485 ÃÂ§7.3 Ã¬ÂÂ¤ÃªÂ³Â Ã«Â°Â ÃªÂ°ÂÃ«Â°Â Ã¢ÂÂ Ã«ÂÂ¨ÃªÂ³ÂÃ«Â¥Â¼ Ã¬ÂÂÃ¬ÂÂÃ«ÂÂÃ«Â¡Â Ã¬ÂÂÃ«Â£ÂÃ­ÂÂÃ«Â©Â° Ã¬Â§ÂÃ­ÂÂÃ­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ. Ã¬ÂÂÃ«Â£Â Ã¬Â²ÂÃ«Â¦Â¬Ã«Â§ÂÃ«ÂÂ¤ CCRÃ¬ÂÂ´ Ã¬ÂÂÃ«ÂÂ Ã«Â°ÂÃ¬ÂÂÃ«ÂÂ©Ã«ÂÂÃ«ÂÂ¤.</div>

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
              {current && <span className="font-mono text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--amber)', color: '#fff' }}>Ã¬Â§ÂÃ­ÂÂÃ¬Â¤Â</span>}
            </button>
          )
        })}
      </div>

        {progress.currentIdx >= 0 && progress.currentIdx < STAGE_REQUIRED_DOCS.length && (
          <div className="mt-3 rounded-lg p-3" style={{ background: 'var(--bg-soft)', borderLeft: '3px solid var(--amber)' }}>
            <div className="font-mono text-[9px] tracking-widest uppercase mb-2" style={{ color: 'var(--amber)' }}>
              ISO 13485 ÃÂ§7.3 ÃÂ· Ã­ÂÂÃ¬ÂÂ¬ Ã«ÂÂ¨ÃªÂ³Â Ã­ÂÂÃ¬ÂÂ Ã¬ÂÂÃªÂ±Â´
            </div>
            <div className="flex flex-col gap-1">
              {STAGE_REQUIRED_DOCS[progress.currentIdx].map((doc, di) => (
                <div key={di} className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--ink-mute)' }}>
                  <span style={{ color: 'var(--amber)', fontWeight: 700 }}>ÃÂ·</span> {doc}
                </div>
              ))}
            </div>
          </div>
        )}
      {progress.done === progress.total && (
        <div className="mt-4 flex items-start gap-2 p-3 rounded-lg" style={{ background: 'var(--leaf-soft)' }}>
          <Sparkles size={15} style={{ color: 'var(--moss)' }} className="shrink-0 mt-0.5" />
          <div className="text-[12.5px]" style={{ color: 'var(--ink)' }}>
            Ã¬ÂÂ¤ÃªÂ³Â ÃªÂ³ÂÃ­ÂÂ 9Ã«ÂÂ¨ÃªÂ³ÂÃªÂ°Â Ã«ÂªÂ¨Ã«ÂÂ Ã¬ÂÂÃ«Â£ÂÃ«ÂÂÃ¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤. Ã­ÂÂÃªÂ°Â Ã¬ÂÂ Ã¬Â²Â­Ã¬ÂÂ Ã¬Â§ÂÃ­ÂÂÃ­ÂÂ Ã«ÂÂ¤, 'Ã«ÂªÂ¨Ã«ÂÂ¸ Ã«ÂªÂ©Ã«Â¡Â'ÃªÂ³Â¼ 'Ã«Â¬Â¸Ã¬ÂÂ' Ã­ÂÂ­Ã¬ÂÂÃ¬ÂÂ Ã­ÂÂÃªÂ°ÂÃ¬Â ÂÃ«Â³Â´ÃÂ·Ã«ÂªÂ¨Ã«ÂÂ¸Ã¬ÂÂ Ã«ÂÂ±Ã«Â¡ÂÃ­ÂÂÃ«Â©Â´ ÃªÂ¸Â°Ã­ÂÂÃªÂ°Â Ã¬Â ÂÃ­ÂÂÃ¬ÂÂ¼Ã«Â¡Â Ã¬Â ÂÃ­ÂÂÃ­ÂÂ  Ã¬ÂÂ Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤.
          </div>
        </div>
      )}
      <ComplianceFooter regs={['ISO 13485 ÃÂ§7.3', '21 CFR 820.30', 'ISO 14971']} />
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
        setExtractNote('PDFÃ¬ÂÂÃ¬ÂÂ Ã¬ÂÂÃ«ÂÂÃ¬ÂÂ¼Ã«Â¡Â Ã¬Â¶ÂÃ¬Â¶ÂÃ­ÂÂÃ¬Â§Â Ã«ÂªÂ»Ã­ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤ Ã¢ÂÂ Ã¬ÂÂÃ«ÂÂ Ã­ÂÂ­Ã«ÂªÂ©Ã¬ÂÂ Ã¬Â§ÂÃ¬Â Â Ã¬ÂÂÃ«Â Â¥Ã­ÂÂ´Ã¬Â£Â¼Ã¬ÂÂ¸Ã¬ÂÂ.')
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
        setExtractNote(`AI Ã¬Â¶ÂÃ¬Â¶Â Ã¬ÂÂÃ«Â£Â ÃÂ· Ã«ÂªÂ¨Ã«ÂÂ¸ ${r.models ? r.models.length : 0}ÃªÂ°Â Ã¢ÂÂ Ã¬ÂÂÃ«ÂÂ Ã«ÂÂ´Ã¬ÂÂ©Ã¬ÂÂ ÃªÂ²ÂÃ­ÂÂ  Ã­ÂÂ Ã¬ÂÂÃ¬Â ÂÃ­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ.`)
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
      if (!form.name.trim()) { alert('Ã¬Â ÂÃ­ÂÂÃ«ÂªÂÃ¬ÂÂ Ã­ÂÂÃ¬ÂÂÃ¬ÂÂÃ«ÂÂÃ«ÂÂ¤.'); return }
    } else {
      if (!form.licenseNo.trim()) { alert('Ã­ÂÂÃªÂ°ÂÃ«Â²ÂÃ­ÂÂ¸Ã«ÂÂ Ã­ÂÂÃ¬ÂÂÃ¬ÂÂÃ«ÂÂÃ«ÂÂ¤.'); return }
      if (!form.itemName.trim()) { alert('Ã­ÂÂÃ«ÂªÂ©Ã«ÂªÂÃ¬ÂÂ Ã­ÂÂÃ¬ÂÂÃ¬ÂÂÃ«ÂÂÃ«ÂÂ¤.'); return }
      if (!form.classNo.trim()) { alert('Ã¬ÂÂÃ¬ÂÂ½Ã¬Â²Â Ã«Â¶ÂÃ«Â¥ÂÃ«Â²ÂÃ­ÂÂ¸Ã«ÂÂ Ã­ÂÂÃ¬ÂÂÃ¬ÂÂÃ«ÂÂÃ«ÂÂ¤.'); return }
    }
    const autoReason = !isNew && form.licenseNo.trim() ? `Ã­ÂÂÃªÂ°ÂÃ«Â²ÂÃ­ÂÂ¸ ${form.licenseNo.trim()} ÃªÂ¸Â°Ã¬Â¤Â Ã¬ÂÂ ÃªÂ·Â Ã«ÂÂ±Ã«Â¡Â` : ''
    const finalReason = reason.trim() || autoReason
    if (!finalReason) {
      alert((isNew ? 'Ã«ÂÂ±Ã«Â¡Â' : 'Ã¬Â¶ÂÃªÂ°Â') + ' Ã¬ÂÂ¬Ã¬ÂÂ Ã«ÂÂ Ã­ÂÂÃ¬ÂÂÃ¬ÂÂÃ«ÂÂÃ«ÂÂ¤ (CCR Ã¢ÂÂ ISO 13485 ÃÂ§4.2.4).')
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
            PROD ÃÂ· Ã¬Â ÂÃ­ÂÂ Ã«ÂÂ±Ã«Â¡Â ÃÂ· {isNew ? 'Ã¬ÂÂ ÃªÂ·Â' : 'ÃªÂ¸Â°Ã­ÂÂÃªÂ°Â'}
          </span>
          <div className="mt-0.5 text-[12px]" style={{ color: 'var(--ink-faint)' }}>
            Ã¬Â ÂÃ­ÂÂÃÂ·ÃªÂ³ÂµÃ¬Â Â <ChevronRight size={11} className="inline align-[-1px]" /> Ã¬Â ÂÃ­ÂÂ Ã«ÂÂ±Ã«Â¡Â <ChevronRight size={11} className="inline align-[-1px]" /> {isNew ? 'Ã¬ÂÂ ÃªÂ·Â ÃªÂ°ÂÃ«Â°Â Ã¬Â ÂÃ­ÂÂ Ã«ÂÂ±Ã«Â¡Â' : 'ÃªÂ¸Â°Ã­ÂÂÃªÂ°Â Ã¬Â ÂÃ­ÂÂ Ã«ÂÂ±Ã«Â¡Â'}
          </div>
        </div>
        <button onClick={onCancel} className="btn-ghost text-[12px]">Ã¬Â·Â¨Ã¬ÂÂ</button>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setKind(PRODUCT_KIND.LICENSED)}
          className="flex-1 px-3 py-2.5 rounded-lg text-[13px] font-medium text-left transition"
          style={!isNew ? { background: 'var(--leaf-soft)', color: 'var(--moss)', border: '1.5px solid var(--moss)' } : { background: 'var(--bg-soft)', color: 'var(--ink-mute)', border: '1.5px solid transparent' }}
        >
          ÃªÂ¸Â°Ã­ÂÂÃªÂ°Â Ã¬Â ÂÃ­ÂÂ
          <div className="text-[11px] font-normal mt-0.5" style={{ color: 'var(--ink-mute)' }}>Ã¬ÂÂ´Ã«Â¯Â¸ Ã­ÂÂÃªÂ°ÂÃ«Â¥Â¼ Ã«Â°ÂÃ¬ÂÂ Ã¬Â ÂÃ­ÂÂ Ã¢ÂÂ Ã­ÂÂÃªÂ°ÂÃ¬Â¦Â PDFÃ«Â¡Â Ã¬ÂÂÃ«ÂÂ Ã«ÂÂ±Ã«Â¡Â</div>
        </button>
        <button
          type="button"
          onClick={() => setKind(PRODUCT_KIND.NEW)}
          className="flex-1 px-3 py-2.5 rounded-lg text-[13px] font-medium text-left transition"
          style={isNew ? { background: 'var(--amber-soft)', color: 'var(--amber)', border: '1.5px solid var(--amber)' } : { background: 'var(--bg-soft)', color: 'var(--ink-mute)', border: '1.5px solid transparent' }}
        >
          Ã¬ÂÂ ÃªÂ·Â ÃªÂ°ÂÃ«Â°Â Ã¬Â ÂÃ­ÂÂ
          <div className="text-[11px] font-normal mt-0.5" style={{ color: 'var(--ink-mute)' }}>Ã¬ÂÂÃ¬Â§Â Ã­ÂÂÃªÂ°ÂÃªÂ°Â Ã¬ÂÂÃ«ÂÂ ÃªÂ°ÂÃ«Â°Â Ã¬Â¤Â Ã¬Â ÂÃ­ÂÂ Ã¢ÂÂ Ã¬ÂÂ¤ÃªÂ³Â ÃªÂ³ÂÃ­ÂÂÃ«Â¶ÂÃ­ÂÂ° Ã¬ÂÂÃ¬ÂÂ</div>
        </button>
      </div>

      {isNew ? (
        <div className="grid md:grid-cols-2 gap-4 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
          <FieldEdit label="Ã¬Â ÂÃ­ÂÂÃ«ÂªÂ" value={form.name} onChange={(v) => setF('name', v)} placeholder="Ã¬ÂÂ: Ã¬ÂÂ ÃªÂ·Â Ã¬ÂÂÃ¬ÂÂ´Ã¬ÂÂ´ Ã¬Â ÂÃ­ÂÂ" required />
          <FieldEdit label="Ã­ÂÂÃ«ÂªÂ©Ã«ÂªÂ (Ã¬ÂÂÃ¬ÂÂ½Ã¬Â²Â, Ã¬ÂÂÃ¬Â Â)" value={form.itemName} onChange={(v) => setF('itemName', v)} placeholder="Ã¬ÂÂÃ¬Â Â Ã­ÂÂÃ«ÂªÂ©Ã«ÂªÂ (Ã«Â¯Â¸Ã­ÂÂÃ¬Â Â Ã¬ÂÂ Ã«Â¹ÂÃ¬ÂÂÃ«ÂÂÃ¬ÂÂ¸Ã¬ÂÂ)" />
          <MdcatCardPicker label="Ã¬ÂÂÃ«Â£ÂÃªÂ¸Â°ÃªÂ¸Â° Ã«ÂÂÃ«Â¶ÂÃ«Â¥Â Ã¬ÂÂ Ã­ÂÂ" value={form.cat1} onChange={(v) => setF('cat1', v)} options={[['', 'Ã¬ÂÂ Ã­ÂÂ Ã¬ÂÂ Ã­ÂÂ¨'], ...MDCAT1.map((cc) => [cc, cc])]} />
          <MdcatCardPicker label="Ã¬Â¤ÂÃ«Â¶ÂÃ«Â¥Â Ã¬ÂÂ Ã­ÂÂ" value={form.cat2} onChange={(v) => setF('cat2', v)} disabled={!form.cat1 || form.cat1 === 'ÃªÂ¸Â°Ã­ÂÂ'} options={[['', 'Ã¬ÂÂ Ã­ÂÂ Ã¬ÂÂ Ã­ÂÂ¨'], ...(MDCAT[form.cat1] || []).map((cc) => [cc, cc])]} />
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
                {extracting ? 'AIÃªÂ°Â Ã­ÂÂÃªÂ°ÂÃ¬Â¦ÂÃ¬ÂÂ Ã«Â¶ÂÃ¬ÂÂÃ­ÂÂÃ«ÂÂ Ã¬Â¤ÂÃ¢ÂÂ¦' : 'Ã­ÂÂÃªÂ°ÂÃ¬Â¦Â PDF Ã¬ÂÂÃ«Â¡ÂÃ«ÂÂ'}
              </span>
              <span className="text-[11.5px]" style={{ color: 'var(--ink-mute)' }}>
                Ã¬ÂÂÃ«Â¡ÂÃ«ÂÂÃ­ÂÂÃ«Â©Â´ AIÃªÂ°Â Ã­ÂÂÃ«ÂªÂ©Ã«ÂªÂ ÃÂ· Ã«Â¶ÂÃ«Â¥ÂÃ«Â²ÂÃ­ÂÂ¸ ÃÂ· Ã«ÂÂ±ÃªÂ¸Â ÃÂ· Ã­ÂÂÃªÂ°ÂÃ«Â²ÂÃ­ÂÂ¸ ÃÂ· Ã­ÂÂÃªÂ°ÂÃ¬ÂÂ¼ÃªÂ³Â¼ Ã«ÂªÂ¨Ã«ÂÂ¸ Ã«ÂªÂ©Ã«Â¡ÂÃ¬ÂÂ Ã¬ÂÂÃ«ÂÂÃ¬ÂÂ¼Ã«Â¡Â Ã¬Â±ÂÃ¬ÂÂÃ«ÂÂÃ«ÂÂ¤
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
            <FieldEdit label="Ã­ÂÂÃªÂ°ÂÃ«Â²ÂÃ­ÂÂ¸" value={form.licenseNo} onChange={(v) => setF('licenseNo', v)} placeholder="Ã¬ÂÂ: Ã¬Â ÂÃ­ÂÂ 2024-00123" required />
            <FieldEdit
              label="Ã­ÂÂÃ«ÂªÂ©Ã«ÂªÂ (Ã¬ÂÂÃ¬ÂÂ½Ã¬Â²Â)"
              value={form.itemName}
              onChange={(v) => { setF('itemName', v); if (!form.name.trim()) setF('name', v) }}
              placeholder="Ã¬ÂÂÃ¬ÂÂ½Ã¬Â²Â Ã­ÂÂÃ«ÂªÂ©Ã«ÂªÂ"
              required
            />
            <FieldEdit label="Ã¬ÂÂÃ¬ÂÂ½Ã¬Â²Â Ã«Â¶ÂÃ«Â¥ÂÃ«Â²ÂÃ­ÂÂ¸" value={form.classNo} onChange={(v) => setF('classNo', v)} placeholder="Ã¬ÂÂ: A11010.01" required />
            <MdcatCardPicker label="Ã«ÂÂ±ÃªÂ¸Â Ã¬ÂÂ Ã­ÂÂ (Class)" value={form.grade} onChange={(v) => setF('grade', v)} options={[['1', '1Ã«ÂÂ±ÃªÂ¸Â'], ['2', '2Ã«ÂÂ±ÃªÂ¸Â'], ['3', '3Ã«ÂÂ±ÃªÂ¸Â'], ['4', '4Ã«ÂÂ±ÃªÂ¸Â']]} />
            <FieldEdit label="Ã­ÂÂÃªÂ°ÂÃ¬ÂÂ¼" value={form.issueDate} onChange={(v) => setF('issueDate', v)} type="date" />
            <FieldEdit label="Ã¬Â ÂÃ­ÂÂÃ«ÂªÂ (Ã«ÂÂ´Ã«Â¶Â ÃªÂ´ÂÃ«Â¦Â¬Ã«ÂªÂ, Ã¬ÂÂ Ã­ÂÂ)" value={form.name} onChange={(v) => setF('name', v)} placeholder="Ã«Â¹ÂÃ¬ÂÂÃ«ÂÂÃ«Â©Â´ Ã­ÂÂÃ«ÂªÂ©Ã«ÂªÂÃ¬ÂÂ Ã¬ÂÂ¬Ã¬ÂÂ©Ã­ÂÂ©Ã«ÂÂÃ«ÂÂ¤" />
          </div>

          <details className="text-[12.5px]">
            <summary className="cursor-pointer select-none" style={{ color: 'var(--ink-mute)' }}>Ã¬Â¶ÂÃªÂ°Â Ã­ÂÂ­Ã«ÂªÂ© (Ã«ÂªÂ¨Ã«ÂÂ¸Ã«Â²ÂÃ­ÂÂ¸ ÃÂ· Ã¬ÂÂÃ¬Â¢Â ÃÂ· Ã¬Â ÂÃ¬Â´Â ÃÂ· SW Ã«ÂÂ±) Ã¢ÂÂ Ã­ÂÂÃ¬ÂÂ Ã¬ÂÂ Ã­ÂÂ¼Ã¬Â¹ÂÃªÂ¸Â°</summary>
            <div className="grid md:grid-cols-2 gap-4 pt-3">
              <FieldEdit label="Ã«ÂªÂ¨Ã«ÂÂ¸ Ã«Â²ÂÃ­ÂÂ¸" value={form.modelNumber} onChange={(v) => setF('modelNumber', v)} />
              <SelectEdit label="Ã¬Â¶ÂÃ¬Â ÂÃªÂ´ÂÃ«Â¦Â¬ Ã«ÂÂÃ¬ÂÂ" value={form.track} onChange={(v) => setF('track', v)} options={[['N', 'Ã«Â¹ÂÃ«ÂÂÃ¬ÂÂ'], ['Y', 'Ã«ÂÂÃ¬ÂÂ (Y)']]} />
              <SelectEdit label="Ã¬ÂÂ¸Ã­ÂÂÃªÂ°Â Ã¬ÂÂÃ¬Â¢Â (Ã«ÂÂÃ«Â¶ÂÃ«Â¥Â)" value={form.cat1} onChange={(v) => setF('cat1', v)} options={[['', 'Ã¬ÂÂ Ã­ÂÂ Ã¬ÂÂ Ã­ÂÂ¨'], ...MDCAT1.map((cc) => [cc, cc])]} />
              <SelectEdit label="Ã¬ÂÂ¸Ã­ÂÂÃªÂ°Â Ã¬ÂÂÃ¬Â¢Â (Ã¬Â¤ÂÃ«Â¶ÂÃ«Â¥Â)" value={form.cat2} onChange={(v) => setF('cat2', v)} disabled={!form.cat1 || form.cat1 === 'ÃªÂ¸Â°Ã­ÂÂ'} options={[['', 'Ã¬ÂÂ Ã­ÂÂ Ã¬ÂÂ Ã­ÂÂ¨'], ...(MDCAT[form.cat1] || []).map((cc) => [cc, cc])]} />
              {(form.cat1 === 'ÃªÂ¸Â°Ã­ÂÂ' || form.cat2 === 'ÃªÂ¸Â°Ã­ÂÂ') && (
                <FieldEdit label="ÃªÂ¸Â°Ã­ÂÂ Ã¬ÂÂÃ¬Â¢Â Ã¬Â§ÂÃ¬Â Â Ã¬ÂÂÃ«Â Â¥" value={form.etc} onChange={(v) => setF('etc', v)} />
              )}
              <SelectEdit label="Ã¬ÂÂ Ã¬Â²Â´ Ã¬Â ÂÃ¬Â´Â" value={form.contact} onChange={(v) => setF('contact', v)} options={[['none', 'Ã¬ÂÂ Ã¬Â²Â´ Ã«Â¹ÂÃ¬Â ÂÃ¬Â´Â'], ['surface', 'Ã­ÂÂ¼Ã«Â¶ÂÃÂ·Ã¬Â ÂÃ«Â§Â Ã¬Â ÂÃ¬Â´Â (Surface)'], ['external', 'Ã¬ÂÂ¸Ã«Â¶Â Ã­ÂÂµÃ¬ÂÂ  (External Communicating)'], ['implantable', 'Ã¬ÂÂÃ­ÂÂÃ«ÂÂÃ­ÂÂ¸ (Implantable)']]} />
              <SelectEdit label="Ã¬ÂÂÃ­ÂÂÃ­ÂÂ¸Ã¬ÂÂ¨Ã¬ÂÂ´" value={form.software} onChange={(v) => setF('software', v)} options={[['none', 'SW Ã¬ÂÂÃ¬ÂÂ'], ['embedded', 'Ã«ÂÂ´Ã¬ÂÂ¥ SW'], ['samd', 'Ã«ÂÂÃ«Â¦Â½Ã­ÂÂ SW (SaMD)']]} />
              <FieldEdit label="Ã¬ÂÂÃ«ÂÂÃ«ÂÂ Ã¬ÂÂ¬Ã¬ÂÂ©" value={form.intendedUse} onChange={(v) => setF('intendedUse', v)} multiline />
            </div>
          </details>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12.5px] font-medium" style={{ color: 'var(--ink)' }}>
                Ã«ÂªÂ¨Ã«ÂÂ¸ Ã«ÂªÂ©Ã«Â¡Â{draftModels.length > 0 ? ` (${draftModels.length}ÃªÂ°Â)` : ''}
              </span>
              <button type="button" onClick={addDraftModel} className="btn-ghost text-[11.5px]"><Plus size={12} /> Ã­ÂÂ Ã¬Â¶ÂÃªÂ°Â</button>
            </div>
            {draftModels.length === 0 ? (
              <div className="text-center py-6 text-[12px] rounded-lg" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>
                PDFÃ«Â¥Â¼ Ã¬ÂÂÃ«Â¡ÂÃ«ÂÂÃ­ÂÂÃ«Â©Â´ Ã«ÂªÂ¨Ã«ÂÂ¸ Ã«ÂªÂ©Ã«Â¡ÂÃ¬ÂÂ´ Ã¬ÂÂÃ«ÂÂÃ¬ÂÂ¼Ã«Â¡Â Ã¬Â±ÂÃ¬ÂÂÃ¬Â§ÂÃ«ÂÂÃ«ÂÂ¤. Ã¬Â§ÂÃ¬Â Â Ã¬Â¶ÂÃªÂ°ÂÃ­ÂÂ  Ã¬ÂÂÃ«ÂÂ Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤.
              </div>
            ) : (
              <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--line)' }}>
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-3 py-1.5 text-[10.5px] font-mono uppercase tracking-wide" style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}>
                  <span>Ã«ÂªÂ¨Ã«ÂÂ¸ Ã¬Â½ÂÃ«ÂÂ</span>
                  <span>Ã«ÂªÂ¨Ã«ÂÂ¸Ã«ÂªÂ / Ã«Â¹ÂÃªÂ³Â </span>
                  <span></span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {draftModels.map((m) => (
                    <div key={m.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 px-3 py-1.5 items-center" style={{ borderTop: '1px solid var(--line)' }}>
                      <input value={m.code} onChange={(e) => updateDraftModel(m.id, { code: e.target.value })} className="input-base text-[12.5px] font-mono" placeholder="Ã«ÂªÂ¨Ã«ÂÂ¸Ã¬Â½ÂÃ«ÂÂ" />
                      <input value={m.name} onChange={(e) => updateDraftModel(m.id, { name: e.target.value })} className="input-base text-[12.5px]" placeholder="Ã«ÂªÂ¨Ã«ÂÂ¸Ã«ÂªÂ / ÃªÂ·ÂÃªÂ²Â©" />
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
          label={(isNew ? 'Ã«ÂÂ±Ã«Â¡Â' : 'Ã¬Â¶ÂÃªÂ°Â') + ' Ã¬ÂÂ¬Ã¬ÂÂ  (CCR Ã¢ÂÂ ISO 13485 ÃÂ§4.2.4)' + (!isNew ? ' ÃÂ· Ã«Â¹ÂÃ¬ÂÂÃ«ÂÂÃ«Â©Â´ Ã­ÂÂÃªÂ°ÂÃ«Â²ÂÃ­ÂÂ¸ ÃªÂ¸Â°Ã¬Â¤ÂÃ¬ÂÂ¼Ã«Â¡Â Ã¬ÂÂÃ«ÂÂ ÃªÂ¸Â°Ã«Â¡Â' : '')}
          value={reason}
          onChange={setReason}
          placeholder={isNew ? 'Ã¬ÂÂ: Ã¬ÂÂ ÃªÂ·Â Ã«ÂÂ¼Ã¬ÂÂ¸Ã¬ÂÂ Ã¬Â¶ÂÃ¬ÂÂ / Ã¬Â ÂÃ­ÂÂ Ã­ÂÂ¬Ã­ÂÂ¸Ã­ÂÂ´Ã«Â¦Â¬Ã¬ÂÂ¤ Ã­ÂÂÃ¬ÂÂ¥' : 'Ã«Â¹ÂÃ¬ÂÂÃ«ÂÂÃ«Â©Â´ Ã¬ÂÂÃ«ÂÂ ÃªÂ¸Â°Ã«Â¡ÂÃ«ÂÂ©Ã«ÂÂÃ«ÂÂ¤ (Ã¬Â§ÂÃ¬Â Â Ã¬ÂÂÃ«Â Â¥ ÃªÂ°ÂÃ«ÂÂ¥)'}
          required={isNew}
        />
      </div>

      <div className="flex justify-end gap-2 pt-3">
        <button onClick={onCancel} className="btn-ghost">Ã¢ÂÂ Ã¬ÂÂ´Ã¬Â Â</button>
        <button onClick={save} className="btn-primary">{isNew ? 'Ã¬ÂÂ¤ÃªÂ³Â ÃªÂ³ÂÃ­ÂÂ Ã¬ÂÂÃ¬ÂÂ' : 'Ã«ÂÂ±Ã«Â¡Â Ã¬ÂÂÃ«Â£Â'} ÃÂ· CCR Ã«Â°ÂÃ¬ÂÂ</button>
      </div>

      <ComplianceFooter regs={['ISO 13485 ÃÂ§7.3', '21 CFR 820.30', 'MDR Annex II']} />
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
      {value && <div className="mt-1 font-mono text-[9px]" style={{ color: 'var(--moss)' }}>Ã¢ÂÂ {value} Ã¬ÂÂ Ã­ÂÂÃ«ÂÂ¨</div>}
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

  // Ã¬ÂÂÃ­ÂÂ°Ã­ÂÂ° IDÃ«ÂÂ Ã¬Â ÂÃ¬ÂÂ¥ Ã¬Â ÂÃ­ÂÂ Ã«ÂÂÃ¬ÂÂ¼Ã­ÂÂ´Ã¬ÂÂ¼ CCR Ã¬ÂÂ´Ã«Â Â¥Ã¬ÂÂ´ Ã¬ÂÂ´Ã¬ÂÂ´Ã¬Â§ÂÃ«ÂÂ¤ (id Ã¬ÂÂÃ«ÂÂ ÃªÂµÂ¬Ã­ÂÂ Ã«Â ÂÃ¬Â½ÂÃ«ÂÂÃ«ÂÂ modelNumberÃ«Â¡Â ÃªÂ³Â Ã¬Â Â)
  const productId = product?.id || product?.classNo || product?.modelNumber || 'main'
  const productEid = eid(ENTITY_TYPES.PRODUCT, productId)

  const ccrs = useMemo(
    () => getRecordsForEntity(productEid),
    [productEid, editing]
  )

  // #32 Ã¬ÂÂ¬Ã¬ÂÂÃ¬Â Â Ã¢ÂÂ Ã¬ÂÂ°Ã«ÂÂÃ«Â³Â Ã¬ÂÂÃ¬ÂÂ°ÃÂ·Ã¬ÂÂÃ¬ÂÂÃ¬ÂÂ¤Ã¬Â Â(#Ã¢ÂÂ¥)Ã¬ÂÂ KMDIA(Ã¬ÂÂÃ«Â£ÂÃªÂ¸Â°ÃªÂ¸Â°Ã¬ÂÂ°Ã¬ÂÂÃ¬Â ÂÃ«Â³Â´Ã¬ÂÂÃ¬ÂÂ¤Ã­ÂÂ)Ã¬ÂÂ Ã«Â³ÂÃ«ÂÂ Ã«Â³Â´ÃªÂ³Â Ã­ÂÂÃ«ÂÂ
  // Ã¬ÂÂ¬Ã­ÂÂ­Ã¬ÂÂ´Ã«Â©Â° Ã¬ÂÂ´ Ã­ÂÂÃ«Â©Â´(Ã¬ÂÂ¤ÃªÂ³ÂÃªÂ°ÂÃ«Â°Â/Ã¬Â ÂÃ­ÂÂÃ¬ÂÂÃ¬ÂÂ¸) Ã¬ÂÂÃ¬Â¹ÂÃ«ÂÂ Ã«Â§ÂÃ¬Â§Â Ã¬ÂÂÃ«ÂÂÃ«ÂÂ¤Ã«ÂÂ Ã¬Â§ÂÃ¬Â ÂÃ¬ÂÂ Ã«ÂÂ°Ã«ÂÂ¼ Ã¬ÂÂ­Ã¬Â ÂÃ­ÂÂÃ«ÂÂ¤.
  // (GMP Ã¬ÂÂ Ã¬Â²Â­ ÃªÂ´ÂÃ«Â Â¨ Ã¬ÂÂÃ«Â£ÂÃ«ÂÂ Ã«Â³ÂÃ«ÂÂ "GMP Ã¬ÂÂ Ã¬Â²Â­" Ã«Â©ÂÃ«ÂÂ´Ã¬ÂÂÃ¬ÂÂ Ã­ÂÂµÃ­ÂÂ© ÃªÂ´ÂÃ«Â¦Â¬Ã­ÂÂÃ«ÂÂ¤.)

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
      alert('Ã«Â³ÂÃªÂ²Â½ Ã¬ÂÂ¬Ã¬ÂÂ Ã«ÂÂ Ã­ÂÂÃ¬ÂÂÃ¬ÂÂÃ«ÂÂÃ«ÂÂ¤ (CCR Ã¢ÂÂ ISO 13485 ÃÂ§4.2.4).')
      return
    }
    const before = { ...product }
    const next = { ...product, ...draft, id: productId }

    // Ã¬ÂÂ¨Ã«Â³Â´Ã«ÂÂ© Ã¬ÂÂÃ­ÂÂ Ã¬ÂÂÃ«ÂÂ°Ã¬ÂÂ´Ã­ÂÂ¸ (Ã¬Â ÂÃ­ÂÂ Ã«Â°Â°Ã¬ÂÂ´Ã¬ÂÂÃ¬ÂÂ Ã­ÂÂ´Ã«ÂÂ¹ Ã¬Â ÂÃ­ÂÂÃ«Â§Â ÃªÂ°Â±Ã¬ÂÂ )
    const ob = onboarding.load()
    const list = Array.isArray(ob.products) ? ob.products.slice() : []
    const idx = list.findIndex((p) => (p.id || p.modelNumber || 'main') === productId)
    if (idx >= 0) list[idx] = next
    else list.push(next)
    onboarding.save({ ...ob, products: list })

    // CCR Ã¬ÂÂÃ«ÂÂ Ã«Â°ÂÃ¬ÂÂ
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
    onAction('Ã¬Â ÂÃ­ÂÂ Ã¬Â ÂÃ«Â³Â´ Ã¬ÂÂÃ¬Â Â ÃÂ· CCR Ã¬ÂÂÃ«ÂÂ Ã«Â°ÂÃ¬ÂÂ')
    setTimeout(() => window.location.reload(), 600)
  }

  const doDelete = () => {
    if (!deleteReason.trim()) {
      alert('Ã¬ÂÂ­Ã¬Â Â Ã¬ÂÂ¬Ã¬ÂÂ Ã«ÂÂ Ã­ÂÂÃ¬ÂÂÃ¬ÂÂÃ«ÂÂÃ«ÂÂ¤ (Ã¬ÂÂ: Ã­ÂÂÃªÂ°ÂÃ¬Â·Â¨Ã¬ÂÂ, Ã¬ÂÂÃ«ÂªÂ»Ã¬ÂÂÃ«Â Â¥ Ã«ÂÂ±).')
      return
    }
    const ob = onboarding.load()
    const list = Array.isArray(ob.products) ? ob.products.slice() : []
    const nextList = list.filter((p) => (p.id || 'main') !== (product.id || 'main'))
    onboarding.save({ ...ob, products: nextList })

    // CCR Ã¬ÂÂÃ«ÂÂ Ã«Â°ÂÃ¬ÂÂ (Ã¬ÂÂ­Ã¬Â Â Ã¬ÂÂ´Ã«Â Â¥ Ã«Â³Â´Ã¬Â¡Â´)
    commitChange({
      targetEid: productEid,
      action: CHANGE_ACTIONS.DELETE,
      before: { ...product },
      after: null,
      reason: deleteReason.trim(),
    })

    setShowDeleteModal(false)
    setDeleteReason('')
    onAction('Ã¬Â ÂÃ­ÂÂÃ¬ÂÂ´ Ã¬ÂÂ­Ã¬Â ÂÃ«ÂÂÃ¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤ ÃÂ· CCR Ã¬ÂÂÃ«ÂÂ Ã«Â°ÂÃ¬ÂÂ')
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
      {/* Ã¬Â¢Â: Ã¬Â ÂÃ­ÂÂ Ã¬Â¹Â´Ã«ÂÂ */}
      <div className="lg:col-span-2">
        <div className="card-base p-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <span
                className="font-mono text-[10px] tracking-[0.18em] uppercase"
                style={{ color: 'var(--moss)' }}
              >
                PRODUCT MASTER ÃÂ· {productEid}
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
                {[product.classNo, company?.name].filter(Boolean).join(' ÃÂ· ')}
              </div>
            </div>
            {!editing && canEdit && (
              <div className="flex items-center gap-2">
                <button onClick={startEdit} className="btn-ghost text-[12px]">
                  <Edit3 size={12} /> Ã¬ÂÂÃ¬Â Â
                </button>
                <button onClick={() => setShowDeleteModal(true)} className="btn-ghost text-[12px]" style={{ color: '#DC2626' }}>
                  <Trash2 size={12} /> Ã¬ÂÂ­Ã¬Â Â
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
                <Field label="Ã­ÂÂÃ«ÂªÂ©Ã«ÂªÂ (Ã¬ÂÂÃ¬ÂÂ½Ã¬Â²Â)" value={product.itemName || product.name || '-'} />
                <Field label="Ã«Â¶ÂÃ«Â¥ÂÃ«Â²ÂÃ­ÂÂ¸" value={product.classNo || '-'} />
                <Field
                  label="Ã«ÂÂ±ÃªÂ¸Â (Class)"
                  value={
                    product.grade
                      ? `${product.grade}Ã«ÂÂ±ÃªÂ¸Â`
                      : product.classification
                      ? `Class ${product.classification}`
                      : 'Ã«Â¯Â¸Ã«Â¶ÂÃ«Â¥Â'
                  }
                />
                <Field
                  label="Ã¬ÂÂ¸Ã­ÂÂÃªÂ°Â Ã¬ÂÂÃ¬Â¢Â"
                  value={
                    [product.cat1, product.cat2].filter(Boolean).join(' Ã¢ÂÂº ') ||
                    product.etc ||
                    '-'
                  }
                />
                <Field
                  label="Ã¬ÂÂ Ã¬Â²Â´ Ã¬Â ÂÃ¬Â´Â"
                  value={CONTACT_LABELS[product.contact] || '-'}
                />
                <Field
                  label="Ã¬ÂÂÃ­ÂÂÃ­ÂÂ¸Ã¬ÂÂ¨Ã¬ÂÂ´"
                  value={SW_LABELS[product.software] || product.software || '-'}
                />
                <Field
                  label="Ã¬Â¶ÂÃ¬Â ÂÃªÂ´ÂÃ«Â¦Â¬ Ã«ÂÂÃ¬ÂÂ"
                  value={product.track === 'Y' ? 'Ã«ÂÂÃ¬ÂÂ (Y)' : 'Ã«Â¹ÂÃ«ÂÂÃ¬ÂÂ'}
                />
                {product.intendedUse && (
                  <Field label="Ã¬ÂÂÃ«ÂÂÃ«ÂÂ Ã¬ÂÂ¬Ã¬ÂÂ©" value={product.intendedUse} />
                )}
              </div>

              {product.sterileEnabled && (
                <div className="pt-3 mt-3" style={{ borderTop: '1px dashed var(--line)' }}>
                  <div className="text-[11.5px] font-bold mb-2 flex items-center gap-1.5" style={{ color: 'var(--moss)' }}>
                    Ã«Â©Â¸ÃªÂ·Â  Ã«Â°Â©Ã«Â²Â Ã¬ÂÂ¬Ã¬ÂÂ (ISO 13485 ÃÂ§7.5.7)
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full" style={{
                      background: (SPEC_STATUSES.find(s => s.value === (product.sterileStatus || 'not_validated')) || {}).color + '22',
                      color: (SPEC_STATUSES.find(s => s.value === (product.sterileStatus || 'not_validated')) || {}).color,
                    }}>
                      {(SPEC_STATUSES.find(s => s.value === (product.sterileStatus || 'not_validated')) || {}).label}
                    </span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Ã«Â©Â¸ÃªÂ·Â  Ã«Â°Â©Ã«Â²Â" value={product.sterileMethod || '-'} />
                    <Field label="SAL Ã«ÂªÂ©Ã­ÂÂ" value={product.salTarget || '-'} />
                    <Field label="Ã¬ÂÂ¬Ã¬ÂÂ´Ã­ÂÂ´ Ã¬ÂÂ¨Ã«ÂÂ / Ã¬ÂÂÃªÂ°Â / Ã¬ÂÂÃ«Â Â¥" value={[
                      product.cycleTemp && (product.cycleTemp + 'Ã¢ÂÂ'),
                      product.cycleTime && (product.cycleTime + 'Ã«Â¶Â'),
                      product.cyclePressure && (product.cyclePressure + ' bar'),
                    ].filter(Boolean).join(' / ') || '-'} />
                    <Field label="Ã¬ÂÂ Ã«ÂÂ (Ã«Â°Â©Ã¬ÂÂ¬Ã¬ÂÂ )" value={product.cycleDose || '-'} />
                    <Field label="Ã«Â°Â¸Ã«Â¦Â¬Ã«ÂÂ°Ã¬ÂÂ´Ã¬ÂÂ Ã¬Â°Â¸Ã¬Â¡Â°" value={product.validationRef || '-'} />
                    <Field label="Ã­ÂÂ¬Ã¬ÂÂ¥ Ã«Â°Â¸Ã«Â¦Â¬Ã«ÂÂ°Ã¬ÂÂ´Ã¬ÂÂ Ã¬Â°Â¸Ã¬Â¡Â°" value={product.packagingRef || '-'} />
                    <Field label="Ã«Â°ÂÃ¬ÂÂ´Ã¬ÂÂ¤Ã«Â²ÂÃ«ÂÂ  Ã­ÂÂÃ«ÂÂ / Ã¬ÂÂÃ­ÂÂÃ«Â²Â" value={[product.bioburdenLimit, product.bioburdenMethod].filter(Boolean).join(' / ') || '-'} />
                    <Field label="Ã«Â©Â¸ÃªÂ·Â  Ã¬ÂÂ Ã­ÂÂ¨ÃªÂ¸Â°ÃªÂ°Â" value={product.expiryMonths ? product.expiryMonths + 'ÃªÂ°ÂÃ¬ÂÂ' : '-'} />
                    <Field label="Ã«Â©Â¸ÃªÂ·Â Ã¬ÂÂ± Ã¬ÂÂÃ­ÂÂ" value={product.sterilityTestRequired !== false ? 'Ã­ÂÂÃ¬ÂÂ (ISO 11737-2)' : 'Ã­ÂÂ´Ã«ÂÂ¹ Ã¬ÂÂÃ¬ÂÂ'} />
                    <Field label="Ã¬ÂÂ¬Ã¬Â²ÂÃ«Â¦Â¬ Ã­ÂÂÃ¬ÂÂ©" value={product.reprocessingAllowed ? 'Ã¬ÂÂ (Ã¬Â£Â¼Ã¬ÂÂ)' : 'Ã«ÂÂ¨Ã­ÂÂÃ¬ÂÂ© (Ã¬ÂÂ¬Ã¬Â²ÂÃ«Â¦Â¬ ÃªÂ¸ÂÃ¬Â§Â)'} />
                  </div>
                  {product.sterileNotes && (
                    <div className="mt-3">
                      <Field label="Ã«Â¹ÂÃªÂ³Â " value={product.sterileNotes} />
                    </div>
                  )}
                </div>
              )}

              {product.cleanEnabled && (
                <div className="pt-3 mt-3" style={{ borderTop: '1px dashed var(--line)' }}>
                  <div className="text-[11.5px] font-bold mb-2 flex items-center gap-1.5" style={{ color: 'var(--moss)' }}>
                    Ã¬Â²Â­ÃªÂ²Â°Ã«ÂÂ Ã¬ÂÂ¬Ã¬ÂÂ (ISO 13485 ÃÂ§7.5.2)
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full" style={{
                      background: (CLEAN_STATUSES.find(s => s.value === (product.cleanStatus || 'not_validated')) || {}).color + '22',
                      color: (CLEAN_STATUSES.find(s => s.value === (product.cleanStatus || 'not_validated')) || {}).color,
                    }}>
                      {(CLEAN_STATUSES.find(s => s.value === (product.cleanStatus || 'not_validated')) || {}).label}
                    </span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Ã¬Â ÂÃ¬ÂÂ© Ã¬Â¡Â°ÃªÂ±Â´" value={CLEAN_APPLIES_WHEN[product.cleanAppliesWhen] || '-'} />
                    <Field label="Ã¬Â²Â­ÃªÂ²Â°Ã«ÂÂ Ã«ÂÂ±ÃªÂ¸Â" value={product.cleanClass || '-'} />
                    <Field label="Ã¬ÂÂ¸Ã¬Â²Â Ã«Â°Â©Ã«Â²Â" value={product.cleaningMethod || '-'} />
                    <Field label="Ã«ÂªÂ¨Ã«ÂÂÃ­ÂÂ°Ã«Â§Â Ã«Â¹ÂÃ«ÂÂ" value={product.cleanFrequency || '-'} />
                    <Field label="Ã¬ÂÂ¤Ã¬ÂÂ¼ Ã¬ÂÂ Ã­ÂÂ" value={(product.contaminationTypes || []).join(', ') || '-'} />
                    <Field label="Ã«Â¯Â¸Ã«Â¦Â½Ã¬ÂÂ Ã­ÂÂÃ«ÂÂ / Ã«Â¯Â¸Ã¬ÂÂÃ«Â¬Â¼ Ã­ÂÂÃ«ÂÂ" value={[product.particleLimit, product.microbialLimit].filter(Boolean).join(' / ') || '-'} />
                    <Field label="Ã­ÂÂÃ­ÂÂ Ã¬ÂÂÃ«Â¥Â Ã­ÂÂÃ«ÂÂ" value={product.chemicalLimit || '-'} />
                    <Field label="Ã¬ÂÂ¸Ã¬Â²Â SOP Ã¬Â°Â¸Ã¬Â¡Â°" value={product.cleaningProcedureRef || '-'} />
                    <Field label="Ã«Â°Â¸Ã«Â¦Â¬Ã«ÂÂ°Ã¬ÂÂ´Ã¬ÂÂ Ã¬Â°Â¸Ã¬Â¡Â°" value={product.cleanValidationRef || '-'} />
                    <Field label="Ã¬Â²Â­ÃªÂ²Â°Ã«ÂÂ ÃªÂ²ÂÃ¬ÂÂ¬ Ã«Â°Â©Ã«Â²Â" value={product.inspectionMethod || '-'} />
                    <Field label="Ã­ÂÂ©ÃªÂ²Â© ÃªÂ¸Â°Ã¬Â¤Â" value={product.acceptanceCriteria || '-'} />
                    <Field label="Ã«ÂÂ´Ã«ÂÂ¹" value={product.cleanResponsible || '-'} />
                  </div>
                  {product.cleanNotes && (
                    <div className="mt-3">
                      <Field label="Ã«Â¹ÂÃªÂ³Â " value={product.cleanNotes} />
                    </div>
                  )}
                </div>
              )}

              {product.preserveEnabled && (
                <div className="pt-3 mt-3" style={{ borderTop: '1px dashed var(--line)' }}>
                  <div className="text-[11.5px] font-bold mb-2" style={{ color: 'var(--moss)' }}>
                    Ã«Â³Â´Ã¬Â¡Â´ Ã¬ÂÂ¬Ã¬ÂÂ (ISO 13485 ÃÂ§7.5.11)
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Ã«Â³Â´ÃªÂ´Â Ã¬Â¡Â°ÃªÂ±Â´" value={(STORAGE_CONDITIONS.find(c => c.key === (product.storageCondition || 'room')) || {}).label || '-'} />
                    <Field label="Ã¬ÂÂ¨Ã«ÂÂ / Ã¬ÂÂµÃ«ÂÂ Ã«Â²ÂÃ¬ÂÂ" value={[
                      (product.tempMin || product.tempMax) && `${product.tempMin || '-'}~${product.tempMax || '-'}Ã¢ÂÂ`,
                      (product.humMin || product.humMax) && `${product.humMin || '-'}~${product.humMax || '-'}%RH`,
                    ].filter(Boolean).join(' / ') || '-'} />
                    <Field label="Ã¬ÂÂ Ã­ÂÂ¨ÃªÂ¸Â°ÃªÂ°Â" value={product.shelfLifeMonths ? product.shelfLifeMonths + 'ÃªÂ°ÂÃ¬ÂÂ' : '-'} />
                    <Field label="Ã«Â©Â¸ÃªÂ·Â  Ã«Â°Â©Ã«Â²Â" value={product.preserveSterility || '-'} />
                    <Field label="Ã­ÂÂ¬Ã¬ÂÂ¥ Ã¬ÂÂ Ã­ÂÂ / Ã¬ÂÂ¬Ã¬ÂÂ" value={[product.packagingType, product.packagingSpec].filter(Boolean).join(' / ') || '-'} />
                    <Field label="Ã¬Â ÂÃ¬ÂÂ¬ Ã­ÂÂÃªÂ³Â" value={product.stackLimit || '-'} />
                    <Field label="Ã¬Â°Â¨ÃªÂ´Â / Ã¬Â¶Â©ÃªÂ²Â© Ã¬Â·Â¨Ã¬ÂÂ½" value={[product.lightSensitive && 'Ã¬Â°Â¨ÃªÂ´Â Ã­ÂÂÃ¬ÂÂ', product.shockSensitive && 'Ã¬Â¶Â©ÃªÂ²Â© Ã¬Â·Â¨Ã¬ÂÂ½'].filter(Boolean).join(' ÃÂ· ') || 'Ã­ÂÂ´Ã«ÂÂ¹ Ã¬ÂÂÃ¬ÂÂ'} />
                    <Field label="Ã¬ÂÂ°ÃªÂ²Â° Ã­ÂÂÃªÂ²Â½ ÃªÂµÂ¬Ã¬ÂÂ­ ID" value={product.linkedEnvZoneId || '-'} />
                    <Field label="Ã¬Â²Â­ÃªÂ²Â° Ã¬ÂÂÃªÂµÂ¬Ã¬ÂÂ¬Ã­ÂÂ­" value={product.cleanlinessReq || '-'} />
                    <Field label="Ã¬Â·Â¨ÃªÂ¸Â Ã¬Â§ÂÃ¬Â¹Â¨" value={product.handlingInstructions || '-'} />
                  </div>
                  {(product.pkgCheckItems || []).length > 0 && (
                    <div className="mt-3">
                      <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>Ã¬Â¶ÂÃ­ÂÂ Ã¬Â Â Ã­ÂÂ¬Ã¬ÂÂ¥ÃÂ·Ã«Â³Â´Ã¬Â¡Â´ Ã¬Â ÂÃªÂ²Â Ã­ÂÂ­Ã«ÂªÂ©</label>
                      <div className="mt-1 grid md:grid-cols-2 gap-1.5">
                        {product.pkgCheckItems.map((ci, i) => (
                          <div key={i} className="flex gap-2 text-[12px] p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
                            <span style={{ color: 'var(--ink-faint)', minWidth: 16 }}>{i + 1}.</span>
                            <span style={{ color: 'var(--ink)' }}>{ci.name}</span>
                            {ci.spec && <span style={{ color: 'var(--ink-faint)' }}>Ã¢ÂÂ {ci.spec}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {product.preserveNotes && (
                    <div className="mt-3">
                      <Field label="Ã«Â¹ÂÃªÂ³Â " value={product.preserveNotes} />
                    </div>
                  )}
                </div>
              )}

              {(product.installCheckItems || []).length > 0 && (
                <div className="pt-3 mt-3" style={{ borderTop: '1px dashed var(--line)' }}>
                  <div className="text-[11.5px] font-bold mb-2" style={{ color: 'var(--moss)' }}>
                    Ã¬ÂÂ¤Ã¬Â¹Â Ã¬Â²Â´Ã­ÂÂ¬Ã«Â¦Â¬Ã¬ÂÂ¤Ã­ÂÂ¸ (ISO 13485 ÃÂ§7.5.3 Ã¢ÂÂ Ã¬ÂÂ¤Ã¬Â¹ÂÃÂ·Ã¬ÂÂÃ«Â¹ÂÃ¬ÂÂ¤ Ã­ÂÂÃ«Â©Â´Ã¬ÂÂÃ¬ÂÂ Ã¬ÂÂ¬Ã¬ÂÂ©)
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
                    ÃªÂ²ÂÃ¬ÂÂ¬ ÃªÂ¸Â°Ã¬Â¤ÂÃ¬ÂÂ (ISO 13485 ÃÂ§8.2.4 Ã¬ÂµÂÃ¬Â¢ÂÃªÂ²ÂÃ¬ÂÂ¬)
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="ÃªÂ¸Â°Ã¬Â¤ÂÃ¬ÂÂ Ã¬ÂÂ´Ã«Â¦Â" value={product.inspStdName} />
                    <Field label="Ã«Â²ÂÃ¬Â Â / Ã¬ÂÂÃ­ÂÂÃ¬ÂÂ¼" value={[product.inspStdVersion || '1.0', product.inspStdEffectiveDate].filter(Boolean).join(' ÃÂ· ')} />
                    <Field label="ÃªÂ²ÂÃ¬ÂÂ¬ Ã¬ÂÂ Ã­ÂÂ" value={(INSP_TYPES.find((t) => t.value === (product.inspStdType || 'fqc')) || {}).label || '-'} />
                    <Field label="AQL Ã¬ÂÂÃ¬Â¤Â" value={product.inspStdAqlLevel || '-'} />
                    <Field label="Ã­ÂÂ©ÃªÂ²Â© / Ã«Â¶ÂÃ­ÂÂ©ÃªÂ²Â© Ã¬ÂÂÃ«ÂÂ" value={[product.inspStdAcceptQty, product.inspStdRejectQty].filter(Boolean).join(' / ') || '-'} />
                  </div>
                  {(product.inspStdCheckItems || []).length > 0 && (
                    <div className="mt-3">
                      <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>ÃªÂ²ÂÃ¬ÂÂ¬ Ã­ÂÂ­Ã«ÂªÂ©</label>
                      <div className="mt-1 grid md:grid-cols-2 gap-1.5">
                        {product.inspStdCheckItems.map((ci, i) => (
                          <div key={i} className="flex gap-2 text-[12px] p-1.5 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
                            <span style={{ color: 'var(--ink-faint)', minWidth: 16 }}>{i + 1}.</span>
                            <span style={{ color: 'var(--ink)' }}>{ci.name}</span>
                            {ci.spec && <span style={{ color: 'var(--ink-faint)' }}>Ã¢ÂÂ {ci.spec}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {product.inspStdNotes && (
                    <div className="mt-3">
                      <Field label="Ã«Â¹ÂÃªÂ³Â " value={product.inspStdNotes} />
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
                label="Ã¬Â ÂÃ­ÂÂÃ«ÂªÂ"
                value={draft.name}
                onChange={(v) => setDraft({ ...draft, name: v })}
              />
              <FieldEdit
                label="Ã«ÂªÂ¨Ã«ÂÂ¸ Ã«Â²ÂÃ­ÂÂ¸"
                value={draft.modelNumber}
                onChange={(v) => setDraft({ ...draft, modelNumber: v })}
              />
              <FieldEdit
                label="Ã¬ÂÂÃ«ÂÂÃ«ÂÂ Ã¬ÂÂ¬Ã¬ÂÂ©"
                value={draft.intendedUse}
                onChange={(v) => setDraft({ ...draft, intendedUse: v })}
                multiline
              />
              <FieldEdit
                label="Ã«Â¶ÂÃ«Â¥Â (Ã¬ÂÂ: IIa, IIb, III)"
                value={draft.classification || ''}
                onChange={(v) => setDraft({ ...draft, classification: v })}
              />

              <div className="pt-3 mt-1" style={{ borderTop: '1px dashed var(--line)' }}>
                <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>
                  Ã¬Â ÂÃ­ÂÂ ÃªÂ¸Â°Ã¬ÂÂ Ã¬ÂÂ¤Ã«ÂªÂÃÂ·Ã«Â¹ÂÃªÂµÂÃ¬ÂÂÃ«Â£Â(ÃªÂ¸Â°Ã¬ÂÂ Ã«Â¬Â¸Ã¬ÂÂÃ«ÂÂ±Ã¬ÂÂ¬Ã¬ÂÂ¬Ã¬ÂÂÃ«Â¢Â°Ã¬ÂÂ Ã¬ÂÂ Ã¬Â²Â­Ã«ÂÂ´Ã¬ÂÂ©)Ã«ÂÂ{' '}
                  <a href="/gmp-application?tab=tech" className="underline" style={{ color: 'var(--moss)' }}>GMP Ã¬ÂÂ Ã¬Â²Â­</a> Ã­ÂÂÃ«Â©Â´Ã¬ÂÂÃ¬ÂÂ Ã¬ÂÂÃ¬ÂÂ±ÃÂ·ÃªÂ´ÂÃ«Â¦Â¬Ã­ÂÂ©Ã«ÂÂÃ«ÂÂ¤.
                </div>
              </div>

              <div className="pt-3 mt-1" style={{ borderTop: '1px dashed var(--line)' }}>
                <label className="flex items-center gap-2 text-[12.5px] cursor-pointer" style={{ color: 'var(--ink)' }}>
                  <input
                    type="checkbox"
                    checked={!!draft.sterileEnabled}
                    onChange={(e) => setDraft({ ...draft, sterileEnabled: e.target.checked })}
                  />
                  Ã¬ÂÂ´ Ã¬Â ÂÃ­ÂÂÃ¬ÂÂ Ã«Â©Â¸ÃªÂ·Â  Ã¬ÂÂÃ«Â£ÂÃªÂ¸Â°ÃªÂ¸Â°Ã¬ÂÂÃ«ÂÂÃ«ÂÂ¤ (ISO 13485 ÃÂ§7.5.7 Ã¬ÂÂ¬Ã¬ÂÂ Ã¬ÂÂÃ«Â Â¥)
                </label>

                {draft.sterileEnabled && (
                  <div className="mt-3 space-y-3 p-3 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>Ã«Â©Â¸ÃªÂ·Â  Ã«Â°Â©Ã«Â²Â</label>
                        <select className="input-base mt-1 w-full text-[13px]" value={draft.sterileMethod || STERILE_METHODS[0]} onChange={(e) => setDraft({ ...draft, sterileMethod: e.target.value })}>
                          {STERILE_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>SAL Ã«ÂªÂ©Ã­ÂÂ</label>
                        <select className="input-base mt-1 w-full text-[13px]" value={draft.salTarget || SAL_LEVELS[0]} onChange={(e) => setDraft({ ...draft, salTarget: e.target.value })}>
                          {SAL_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <FieldEdit label="Ã¬ÂÂ¬Ã¬ÂÂ´Ã­ÂÂ´ Ã¬ÂÂ¨Ã«ÂÂ (Ã¢ÂÂ)" value={draft.cycleTemp} onChange={(v) => setDraft({ ...draft, cycleTemp: v })} placeholder="121" />
                      <FieldEdit label="Ã¬ÂÂ¬Ã¬ÂÂ´Ã­ÂÂ´ Ã¬ÂÂÃªÂ°Â (Ã«Â¶Â)" value={draft.cycleTime} onChange={(v) => setDraft({ ...draft, cycleTime: v })} placeholder="15" />
                      <FieldEdit label="Ã¬ÂÂ¬Ã¬ÂÂ´Ã­ÂÂ´ Ã¬ÂÂÃ«Â Â¥ (bar)" value={draft.cyclePressure} onChange={(v) => setDraft({ ...draft, cyclePressure: v })} placeholder="2.1" />
                      <FieldEdit label="Ã¬ÂÂ Ã«ÂÂ (kGy)" value={draft.cycleDose} onChange={(v) => setDraft({ ...draft, cycleDose: v })} placeholder="25 (Ã«Â°Â©Ã¬ÂÂ¬Ã¬ÂÂ )" />
                    </div>

                    <div className="grid md:grid-cols-2 gap-3">
                      <FieldEdit label="Ã«Â°Â¸Ã«Â¦Â¬Ã«ÂÂ°Ã¬ÂÂ´Ã¬ÂÂ Ã¬Â°Â¸Ã¬Â¡Â° Ã«Â²ÂÃ­ÂÂ¸" value={draft.validationRef} onChange={(v) => setDraft({ ...draft, validationRef: v })} placeholder="VLD-2024-001" />
                      <FieldEdit label="Ã­ÂÂ¬Ã¬ÂÂ¥ Ã«Â°Â¸Ã«Â¦Â¬Ã«ÂÂ°Ã¬ÂÂ´Ã¬ÂÂ Ã¬Â°Â¸Ã¬Â¡Â°" value={draft.packagingRef} onChange={(v) => setDraft({ ...draft, packagingRef: v })} placeholder="PKG-VAL-001" />
                      <FieldEdit label="Ã«Â°ÂÃ¬ÂÂ´Ã¬ÂÂ¤Ã«Â²ÂÃ«ÂÂ  Ã­ÂÂÃ«ÂÂ (CFU/ÃªÂ°Â)" value={draft.bioburdenLimit} onChange={(v) => setDraft({ ...draft, bioburdenLimit: v })} placeholder="Ã¢ÂÂ¤ 100" />
                      <div>
                        <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>Ã«Â°ÂÃ¬ÂÂ´Ã¬ÂÂ¤Ã«Â²ÂÃ«ÂÂ  Ã¬ÂÂÃ­ÂÂÃ«Â²Â</label>
                        <select className="input-base mt-1 w-full text-[13px]" value={draft.bioburdenMethod || BIOBURDEN_METHODS[0]} onChange={(e) => setDraft({ ...draft, bioburdenMethod: e.target.value })}>
                          {BIOBURDEN_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <FieldEdit label="Ã«Â©Â¸ÃªÂ·Â  Ã¬ÂÂ Ã­ÂÂ¨ÃªÂ¸Â°ÃªÂ°Â (ÃªÂ°ÂÃ¬ÂÂ)" value={draft.expiryMonths} onChange={(v) => setDraft({ ...draft, expiryMonths: v })} placeholder="24" />
                      <div>
                        <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>Ã«Â°Â¸Ã«Â¦Â¬Ã«ÂÂ°Ã¬ÂÂ´Ã¬ÂÂ Ã¬ÂÂÃ­ÂÂ</label>
                        <select className="input-base mt-1 w-full text-[13px]" value={draft.sterileStatus || 'not_validated'} onChange={(e) => setDraft({ ...draft, sterileStatus: e.target.value })}>
                          {SPEC_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-5">
                      <label className="flex items-center gap-2 text-[12.5px] cursor-pointer" style={{ color: 'var(--ink)' }}>
                        <input type="checkbox" checked={draft.sterilityTestRequired !== false} onChange={(e) => setDraft({ ...draft, sterilityTestRequired: e.target.checked })} />
                        Ã«Â©Â¸ÃªÂ·Â Ã¬ÂÂ± Ã¬ÂÂÃ­ÂÂ Ã­ÂÂÃ¬ÂÂ (ISO 11737-2)
                      </label>
                      <label className="flex items-center gap-2 text-[12.5px] cursor-pointer" style={{ color: 'var(--ink)' }}>
                        <input type="checkbox" checked={!!draft.reprocessingAllowed} onChange={(e) => setDraft({ ...draft, reprocessingAllowed: e.target.checked })} />
                        Ã¬ÂÂ¬Ã¬Â²ÂÃ«Â¦Â¬ Ã­ÂÂÃ¬ÂÂ© (Ã«ÂÂ¨Ã­ÂÂÃ¬ÂÂ©Ã¬ÂÂ´ Ã¬ÂÂÃ«ÂÂ ÃªÂ²Â½Ã¬ÂÂ°)
                      </label>
                    </div>

                    <FieldEdit label="Ã«Â©Â¸ÃªÂ·Â  Ã¬ÂÂ¬Ã¬ÂÂ Ã«Â¹ÂÃªÂ³Â " value={draft.sterileNotes} onChange={(v) => setDraft({ ...draft, sterileNotes: v })} multiline placeholder="Ã¬Â¶ÂÃªÂ°Â Ã¬ÂÂÃªÂµÂ¬Ã¬ÂÂ¬Ã­ÂÂ­ Ã«ÂÂÃ«ÂÂ Ã­ÂÂ¹Ã¬ÂÂ´Ã¬ÂÂ¬Ã­ÂÂ­" />
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
                  Ã¬ÂÂ´ Ã¬Â ÂÃ­ÂÂÃ¬ÂÂ Ã¬Â²Â­ÃªÂ²Â°Ã«ÂÂÃÂ·Ã¬ÂÂ¤Ã¬ÂÂ¼ ÃªÂ´ÂÃ«Â¦Â¬ Ã¬ÂÂÃªÂµÂ¬Ã¬ÂÂ¬Ã­ÂÂ­Ã¬ÂÂ´ Ã¬Â ÂÃ¬ÂÂ©Ã«ÂÂ©Ã«ÂÂÃ«ÂÂ¤ (ISO 13485 ÃÂ§7.5.2 Ã¬ÂÂ¬Ã¬ÂÂ Ã¬ÂÂÃ«Â Â¥)
                </label>

                {draft.cleanEnabled && (
                  <div className="mt-3 space-y-3 p-3 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>Ã¬Â ÂÃ¬ÂÂ© Ã¬Â¡Â°ÃªÂ±Â´</label>
                        <select className="input-base mt-1 w-full text-[13px]" value={draft.cleanAppliesWhen || 'supplied_clean'} onChange={(e) => setDraft({ ...draft, cleanAppliesWhen: e.target.value })}>
                          {Object.entries(CLEAN_APPLIES_WHEN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>Ã¬Â²Â­ÃªÂ²Â°Ã«ÂÂ Ã«ÂÂ±ÃªÂ¸Â</label>
                        <select className="input-base mt-1 w-full text-[13px]" value={draft.cleanClass || CLEAN_CLASSES[6]} onChange={(e) => setDraft({ ...draft, cleanClass: e.target.value })}>
                          {CLEAN_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>Ã¬ÂÂ¸Ã¬Â²Â Ã«Â°Â©Ã«Â²Â</label>
                        <select className="input-base mt-1 w-full text-[13px]" value={draft.cleaningMethod || CLEANING_METHODS[0]} onChange={(e) => setDraft({ ...draft, cleaningMethod: e.target.value })}>
                          {CLEANING_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>Ã«ÂªÂ¨Ã«ÂÂÃ­ÂÂ°Ã«Â§Â Ã«Â¹ÂÃ«ÂÂ</label>
                        <select className="input-base mt-1 w-full text-[13px]" value={draft.cleanFrequency || MONITOR_FREQS[0]} onChange={(e) => setDraft({ ...draft, cleanFrequency: e.target.value })}>
                          {MONITOR_FREQS.map((f) => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>Ã¬ÂÂ¤Ã¬ÂÂ¼ Ã¬ÂÂ Ã­ÂÂ (Ã«Â³ÂµÃ¬ÂÂ Ã¬ÂÂ Ã­ÂÂ)</label>
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
                      <FieldEdit label="Ã«Â¯Â¸Ã«Â¦Â½Ã¬ÂÂ Ã­ÂÂÃ«ÂÂ (ÃªÂ°Â/Ã£ÂÂ¥)" value={draft.particleLimit} onChange={(v) => setDraft({ ...draft, particleLimit: v })} placeholder="12,500" />
                      <FieldEdit label="Ã«Â¯Â¸Ã¬ÂÂÃ«Â¬Â¼ Ã­ÂÂÃ«ÂÂ (CFU/Ã£ÂÂ¥)" value={draft.microbialLimit} onChange={(v) => setDraft({ ...draft, microbialLimit: v })} placeholder="3" />
                      <FieldEdit label="Ã­ÂÂÃ­ÂÂ Ã¬ÂÂÃ«Â¥Â Ã­ÂÂÃ«ÂÂ" value={draft.chemicalLimit} onChange={(v) => setDraft({ ...draft, chemicalLimit: v })} placeholder="" />
                    </div>

                    <div className="grid md:grid-cols-2 gap-3">
                      <FieldEdit label="Ã¬ÂÂ¸Ã¬Â²Â SOP Ã¬Â°Â¸Ã¬Â¡Â°" value={draft.cleaningProcedureRef} onChange={(v) => setDraft({ ...draft, cleaningProcedureRef: v })} placeholder="SOP-CL-001" />
                      <FieldEdit label="Ã«Â°Â¸Ã«Â¦Â¬Ã«ÂÂ°Ã¬ÂÂ´Ã¬ÂÂ Ã¬Â°Â¸Ã¬Â¡Â° Ã«Â²ÂÃ­ÂÂ¸ (Ã¬ÂÂÃ¬ÂÂ¼Ã«Â©Â´ Ã¬Â ÂÃªÂ¸Â° Ã¬Â¸Â¡Ã¬Â ÂÃªÂ°Â Ã«ÂÂÃ¬Â²Â´)" value={draft.cleanValidationRef} onChange={(v) => setDraft({ ...draft, cleanValidationRef: v })} placeholder="VLD-2024-CL-001" />
                      <FieldEdit label="Ã¬Â²Â­ÃªÂ²Â°Ã«ÂÂ ÃªÂ²ÂÃ¬ÂÂ¬ Ã«Â°Â©Ã«Â²Â" value={draft.inspectionMethod} onChange={(v) => setDraft({ ...draft, inspectionMethod: v })} placeholder="Ã­ÂÂÃ­ÂÂ°Ã­ÂÂ´ Ã¬Â¹Â´Ã¬ÂÂ´Ã­ÂÂ° Ã¬Â¸Â¡Ã¬Â Â" />
                      <FieldEdit label="Ã­ÂÂ©ÃªÂ²Â© ÃªÂ¸Â°Ã¬Â¤Â" value={draft.acceptanceCriteria} onChange={(v) => setDraft({ ...draft, acceptanceCriteria: v })} placeholder="" />
                      <FieldEdit label="Ã«ÂÂ´Ã«ÂÂ¹" value={draft.cleanResponsible} onChange={(v) => setDraft({ ...draft, cleanResponsible: v })} placeholder="Ã¬ÂÂÃ¬ÂÂ°Ã­ÂÂ" />
                      <div>
                        <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>Ã¬ÂÂÃ­ÂÂ</label>
                        <select className="input-base mt-1 w-full text-[13px]" value={draft.cleanStatus || 'not_validated'} onChange={(e) => setDraft({ ...draft, cleanStatus: e.target.value })}>
                          {CLEAN_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </div>
                    </div>

                    <FieldEdit label="Ã¬Â²Â­ÃªÂ²Â°Ã«ÂÂ Ã¬ÂÂ¬Ã¬ÂÂ Ã«Â¹ÂÃªÂ³Â " value={draft.cleanNotes} onChange={(v) => setDraft({ ...draft, cleanNotes: v })} multiline placeholder="Ã¬Â¶ÂÃªÂ°Â Ã¬ÂÂÃªÂµÂ¬Ã¬ÂÂ¬Ã­ÂÂ­ Ã«ÂÂÃ«ÂÂ Ã­ÂÂ¹Ã¬ÂÂ´Ã¬ÂÂ¬Ã­ÂÂ­" />
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
                  Ã¬ÂÂ´ Ã¬Â ÂÃ­ÂÂÃ¬ÂÂ Ã«Â³Â´Ã¬Â¡Â´ÃÂ·Ã¬Â·Â¨ÃªÂ¸Â Ã¬ÂÂ¬Ã¬ÂÂÃ¬ÂÂ´ Ã¬Â ÂÃ¬ÂÂ©Ã«ÂÂ©Ã«ÂÂÃ«ÂÂ¤ (ISO 13485 ÃÂ§7.5.11 Ã¬ÂÂ¬Ã¬ÂÂ Ã¬ÂÂÃ«Â Â¥)
                </label>

                {draft.preserveEnabled && (
                  <div className="mt-3 space-y-3 p-3 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>Ã«Â³Â´ÃªÂ´Â Ã¬Â¡Â°ÃªÂ±Â´</label>
                        <select className="input-base mt-1 w-full text-[13px]" value={draft.storageCondition || 'room'} onChange={(e) => setDraft({ ...draft, storageCondition: e.target.value })}>
                          {STORAGE_CONDITIONS.map((c) => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>Ã«Â©Â¸ÃªÂ·Â  Ã«Â°Â©Ã«Â²Â</label>
                        <select className="input-base mt-1 w-full text-[13px]" value={draft.preserveSterility || STERILITY[0]} onChange={(e) => setDraft({ ...draft, preserveSterility: e.target.value })}>
                          {STERILITY.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <FieldEdit label="Ã¬ÂÂ¨Ã«ÂÂ Ã¬ÂµÂÃ¬ÂÂ (Ã¢ÂÂ)" value={draft.tempMin} onChange={(v) => setDraft({ ...draft, tempMin: v })} placeholder="1" />
                      <FieldEdit label="Ã¬ÂÂ¨Ã«ÂÂ Ã¬ÂµÂÃ«ÂÂ (Ã¢ÂÂ)" value={draft.tempMax} onChange={(v) => setDraft({ ...draft, tempMax: v })} placeholder="30" />
                      <FieldEdit label="Ã¬ÂÂµÃ«ÂÂ Ã¬ÂµÂÃ¬ÂÂ (%RH)" value={draft.humMin} onChange={(v) => setDraft({ ...draft, humMin: v })} placeholder="" />
                      <FieldEdit label="Ã¬ÂÂµÃ«ÂÂ Ã¬ÂµÂÃ«ÂÂ (%RH)" value={draft.humMax} onChange={(v) => setDraft({ ...draft, humMax: v })} placeholder="" />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <FieldEdit label="Ã¬ÂÂ Ã­ÂÂ¨ÃªÂ¸Â°ÃªÂ°Â (ÃªÂ°ÂÃ¬ÂÂ)" value={draft.shelfLifeMonths} onChange={(v) => setDraft({ ...draft, shelfLifeMonths: v })} placeholder="12" />
                      <div>
                        <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>Ã­ÂÂ¬Ã¬ÂÂ¥ Ã¬ÂÂ Ã­ÂÂ</label>
                        <select className="input-base mt-1 w-full text-[13px]" value={draft.packagingType || PACKAGING_TYPES[0]} onChange={(e) => setDraft({ ...draft, packagingType: e.target.value })}>
                          {PACKAGING_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <FieldEdit label="Ã¬Â ÂÃ¬ÂÂ¬ Ã­ÂÂÃªÂ³Â" value={draft.stackLimit} onChange={(v) => setDraft({ ...draft, stackLimit: v })} placeholder="5Ã«ÂÂ¨ Ã¬ÂÂ´Ã­ÂÂ" />
                      <FieldEdit label="Ã¬ÂÂ°ÃªÂ²Â° Ã­ÂÂÃªÂ²Â½ ÃªÂµÂ¬Ã¬ÂÂ­ ID" value={draft.linkedEnvZoneId} onChange={(v) => setDraft({ ...draft, linkedEnvZoneId: v })} placeholder="ZON-xxxx" />
                    </div>

                    <div className="flex gap-5">
                      <label className="flex items-center gap-2 text-[12.5px] cursor-pointer" style={{ color: 'var(--ink)' }}>
                        <input type="checkbox" checked={!!draft.lightSensitive} onChange={(e) => setDraft({ ...draft, lightSensitive: e.target.checked })} />
                        Ã¬Â°Â¨ÃªÂ´Â Ã«Â³Â´ÃªÂ´Â Ã­ÂÂÃ¬ÂÂ
                      </label>
                      <label className="flex items-center gap-2 text-[12.5px] cursor-pointer" style={{ color: 'var(--ink)' }}>
                        <input type="checkbox" checked={!!draft.shockSensitive} onChange={(e) => setDraft({ ...draft, shockSensitive: e.target.checked })} />
                        Ã¬Â¶Â©ÃªÂ²Â© Ã¬Â·Â¨Ã¬ÂÂ½
                      </label>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3">
                      <FieldEdit label="Ã­ÂÂ¬Ã¬ÂÂ¥ Ã¬ÂÂ¬Ã¬ÂÂ" value={draft.packagingSpec} onChange={(v) => setDraft({ ...draft, packagingSpec: v })} multiline placeholder="Ã¬ÂÂ: PE Ã­ÂÂÃ¬ÂÂ°Ã¬Â¹Â Ã¬ÂÂ´Ã¬Â¤Â Ã«Â°ÂÃ«Â´Â" />
                      <FieldEdit label="Ã¬Â²Â­ÃªÂ²Â° Ã¬ÂÂÃªÂµÂ¬Ã¬ÂÂ¬Ã­ÂÂ­" value={draft.cleanlinessReq} onChange={(v) => setDraft({ ...draft, cleanlinessReq: v })} multiline placeholder="ÃÂ§7.5.2 Ã¬Â°Â¸Ã¬Â¡Â°" />
                      <FieldEdit label="Ã¬Â·Â¨ÃªÂ¸Â Ã¬Â§ÂÃ¬Â¹Â¨" value={draft.handlingInstructions} onChange={(v) => setDraft({ ...draft, handlingInstructions: v })} multiline placeholder="" />
                      <FieldEdit label="Ã«Â³Â´Ã¬Â¡Â´ Ã¬ÂÂ¬Ã¬ÂÂ Ã«Â¹ÂÃªÂ³Â " value={draft.preserveNotes} onChange={(v) => setDraft({ ...draft, preserveNotes: v })} multiline placeholder="Ã¬Â¶ÂÃªÂ°Â Ã¬ÂÂÃªÂµÂ¬Ã¬ÂÂ¬Ã­ÂÂ­ Ã«ÂÂÃ«ÂÂ Ã­ÂÂ¹Ã¬ÂÂ´Ã¬ÂÂ¬Ã­ÂÂ­" />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>Ã¬Â¶ÂÃ­ÂÂ Ã¬Â Â Ã­ÂÂ¬Ã¬ÂÂ¥ÃÂ·Ã«Â³Â´Ã¬Â¡Â´ Ã¬Â ÂÃªÂ²Â Ã­ÂÂ­Ã«ÂªÂ©</label>
                        <button type="button" onClick={addPkgItem} className="text-[11px] px-2.5 py-1 rounded-lg font-semibold" style={{ background: '#D1FAE5', color: '#059669', border: 'none', cursor: 'pointer' }}>+ Ã­ÂÂ­Ã«ÂªÂ© Ã¬Â¶ÂÃªÂ°Â</button>
                      </div>
                      <div className="space-y-2">
                        {(draft.pkgCheckItems || []).map((ci, i) => (
                          <div key={i} className="grid gap-2 items-center" style={{ gridTemplateColumns: '1fr 1fr 32px' }}>
                            <input value={ci.name} onChange={(e) => updPkgItem(i, 'name', e.target.value)} placeholder="Ã¬Â ÂÃªÂ²Â Ã­ÂÂ­Ã«ÂªÂ©Ã«ÂªÂ" className="input-base text-[12px]" />
                            <input value={ci.spec} onChange={(e) => updPkgItem(i, 'spec', e.target.value)} placeholder="ÃªÂ¸Â°Ã¬Â¤Â/Ã­ÂÂÃ¬ÂÂ© Ã«Â²ÂÃ¬ÂÂ" className="input-base text-[12px]" />
                            <button type="button" onClick={() => delPkgItem(i)} style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: 6, padding: '6px', cursor: 'pointer' }}><Trash2 size={12} /></button>
                          </div>
                        ))}
                        {(draft.pkgCheckItems || []).length === 0 && (
                          <div className="text-[12px] text-center py-3" style={{ color: 'var(--ink-faint)', background: 'var(--bg-card)', borderRadius: 8 }}>+ Ã«Â²ÂÃ­ÂÂ¼Ã¬ÂÂ¼Ã«Â¡Â Ã¬Â ÂÃªÂ²Â Ã­ÂÂ­Ã«ÂªÂ©Ã¬ÂÂ Ã¬Â¶ÂÃªÂ°ÂÃ­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ (Ã«Â¯Â¸Ã¬ÂÂÃ«Â Â¥ Ã¬ÂÂ ÃªÂ¸Â°Ã«Â³Â¸ Ã­ÂÂ­Ã«ÂªÂ© Ã¬ÂÂ¬Ã¬ÂÂ©)</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 mt-1" style={{ borderTop: '1px dashed var(--line)' }}>
                <div className="text-[12.5px] font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                  Ã¬ÂÂ¤Ã¬Â¹Â Ã¬Â²Â´Ã­ÂÂ¬Ã«Â¦Â¬Ã¬ÂÂ¤Ã­ÂÂ¸ (ISO 13485 ÃÂ§7.5.3 Ã¢ÂÂ Ã¬ÂÂ¤Ã¬Â¹ÂÃÂ·Ã¬ÂÂÃ«Â¹ÂÃ¬ÂÂ¤ Ã­ÂÂÃ«Â©Â´Ã¬ÂÂÃ¬ÂÂ Ã¬ÂÂ¬Ã¬ÂÂ©)
                </div>
                <div className="space-y-3 p-3 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>Ã¬Â²Â´Ã­ÂÂ¬ Ã­ÂÂ­Ã«ÂªÂ©</label>
                    <button type="button" onClick={addInstallItem} className="text-[11px] px-2.5 py-1 rounded-lg font-semibold" style={{ background: '#D1FAE5', color: '#059669', border: 'none', cursor: 'pointer' }}>+ Ã­ÂÂ­Ã«ÂªÂ© Ã¬Â¶ÂÃªÂ°Â</button>
                  </div>
                  <div className="space-y-2">
                    {(draft.installCheckItems || []).map((ci, i) => (
                      <div key={i} className="grid gap-2 items-center" style={{ gridTemplateColumns: '1fr 32px' }}>
                        <input value={ci.name} onChange={(e) => updInstallItem(i, e.target.value)} placeholder="Ã¬ÂÂ¤Ã¬Â¹Â Ã¬Â ÂÃªÂ²Â Ã­ÂÂ­Ã«ÂªÂ©Ã«ÂªÂ" className="input-base text-[12px]" />
                        <button type="button" onClick={() => delInstallItem(i)} style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: 6, padding: '6px', cursor: 'pointer' }}><Trash2 size={12} /></button>
                      </div>
                    ))}
                    {(draft.installCheckItems || []).length === 0 && (
                      <div className="text-[12px] text-center py-3" style={{ color: 'var(--ink-faint)', background: 'var(--bg-card)', borderRadius: 8 }}>+ Ã«Â²ÂÃ­ÂÂ¼Ã¬ÂÂ¼Ã«Â¡Â Ã­ÂÂ­Ã«ÂªÂ©Ã¬ÂÂ Ã¬Â¶ÂÃªÂ°ÂÃ­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ (Ã«Â¯Â¸Ã¬ÂÂÃ«Â Â¥ Ã¬ÂÂ ÃªÂ¸Â°Ã«Â³Â¸ Ã¬ÂÂ¤Ã¬Â¹Â Ã¬Â²Â´Ã­ÂÂ¬Ã«Â¦Â¬Ã¬ÂÂ¤Ã­ÂÂ¸ Ã¬ÂÂ¬Ã¬ÂÂ©)</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-1" style={{ borderTop: '1px dashed var(--line)' }}>
                <div className="text-[12.5px] font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                  ÃªÂ²ÂÃ¬ÂÂ¬ ÃªÂ¸Â°Ã¬Â¤ÂÃ¬ÂÂ (ISO 13485 ÃÂ§8.2.4 Ã¬ÂµÂÃ¬Â¢ÂÃªÂ²ÂÃ¬ÂÂ¬ Ã¢ÂÂ ÃªÂ°ÂÃ«Â°Â Ã¬ÂÂ¤ÃªÂ³ÂÃ«ÂÂ¨ÃªÂ³Â Ã¬ÂÂÃ¬ÂÂ±)
                </div>
                <div className="space-y-3 p-3 rounded-lg" style={{ background: 'var(--bg-soft)' }}>
                  <div className="grid md:grid-cols-2 gap-3">
                    <FieldEdit label="ÃªÂ¸Â°Ã¬Â¤ÂÃ¬ÂÂ Ã¬ÂÂ´Ã«Â¦Â" value={draft.inspStdName} onChange={(v) => setDraft({ ...draft, inspStdName: v })} placeholder="Ã¬ÂÂ: Ã¬ÂÂÃ¬Â ÂÃ­ÂÂ Ã¬ÂµÂÃ¬Â¢ÂÃªÂ²ÂÃ¬ÂÂ¬ ÃªÂ¸Â°Ã¬Â¤ÂÃ¬ÂÂ" />
                    <FieldEdit label="Ã«Â²ÂÃ¬Â Â" value={draft.inspStdVersion} onChange={(v) => setDraft({ ...draft, inspStdVersion: v })} placeholder="1.0" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>ÃªÂ²ÂÃ¬ÂÂ¬ Ã¬ÂÂ Ã­ÂÂ</label>
                      <select className="input-base mt-1 w-full text-[13px]" value={draft.inspStdType || 'fqc'} onChange={(e) => setDraft({ ...draft, inspStdType: e.target.value })}>
                        {INSP_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <FieldEdit label="Ã¬ÂÂÃ­ÂÂÃ¬ÂÂ¼" type="date" value={draft.inspStdEffectiveDate} onChange={(v) => setDraft({ ...draft, inspStdEffectiveDate: v })} />
                    <FieldEdit label="AQL Ã¬ÂÂÃ¬Â¤Â" value={draft.inspStdAqlLevel} onChange={(v) => setDraft({ ...draft, inspStdAqlLevel: v })} placeholder="0.65" />
                    <FieldEdit label="Ã­ÂÂ©ÃªÂ²Â© / Ã«Â¶ÂÃ­ÂÂ©ÃªÂ²Â© Ã¬ÂÂÃ«ÂÂ" value={draft.inspStdAcceptQty} onChange={(v) => setDraft({ ...draft, inspStdAcceptQty: v })} placeholder="Ac 0" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-mute)' }}>ÃªÂ²ÂÃ¬ÂÂ¬ Ã­ÂÂ­Ã«ÂªÂ©</label>
                      <button type="button" onClick={addInspItem} className="text-[11px] px-2.5 py-1 rounded-lg font-semibold" style={{ background: '#D1FAE5', color: '#059669', border: 'none', cursor: 'pointer' }}>+ Ã­ÂÂ­Ã«ÂªÂ© Ã¬Â¶ÂÃªÂ°Â</button>
                    </div>
                    <div className="space-y-2">
                      {(draft.inspStdCheckItems || []).map((ci, i) => (
                        <div key={i} className="grid gap-2 items-center" style={{ gridTemplateColumns: '1fr 1fr 1fr 32px' }}>
                          <input value={ci.name} onChange={(e) => updInspItem(i, 'name', e.target.value)} placeholder="ÃªÂ²ÂÃ¬ÂÂ¬ Ã­ÂÂ­Ã«ÂªÂ©Ã«ÂªÂ" className="input-base text-[12px]" />
                          <input value={ci.spec} onChange={(e) => updInspItem(i, 'spec', e.target.value)} placeholder="ÃªÂ¸Â°Ã¬Â¤Â/Ã­ÂÂÃ¬ÂÂ© Ã«Â²ÂÃ¬ÂÂ" className="input-base text-[12px]" />
                          <input value={ci.method} onChange={(e) => updInspItem(i, 'method', e.target.value)} placeholder="ÃªÂ²ÂÃ¬ÂÂ¬ Ã«Â°Â©Ã«Â²Â" className="input-base text-[12px]" />
                          <button type="button" onClick={() => delInspItem(i)} style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: 6, padding: '6px', cursor: 'pointer' }}><Trash2 size={12} /></button>
                        </div>
                      ))}
                      {(draft.inspStdCheckItems || []).length === 0 && (
                        <div className="text-[12px] text-center py-3" style={{ color: 'var(--ink-faint)', background: 'var(--bg-card)', borderRadius: 8 }}>+ Ã«Â²ÂÃ­ÂÂ¼Ã¬ÂÂ¼Ã«Â¡Â ÃªÂ²ÂÃ¬ÂÂ¬ Ã­ÂÂ­Ã«ÂªÂ©Ã¬ÂÂ Ã¬Â¶ÂÃªÂ°ÂÃ­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ</div>
                      )}
                    </div>
                  </div>

                  <FieldEdit label="ÃªÂ²ÂÃ¬ÂÂ¬ ÃªÂ¸Â°Ã¬Â¤ÂÃ¬ÂÂ Ã«Â¹ÂÃªÂ³Â " value={draft.inspStdNotes} onChange={(v) => setDraft({ ...draft, inspStdNotes: v })} multiline placeholder="Ã¬Â¶ÂÃªÂ°Â Ã¬Â°Â¸ÃªÂ³Â Ã¬ÂÂ¬Ã­ÂÂ­" />
                </div>
              </div>

              <FieldEdit
                label="Ã«Â³ÂÃªÂ²Â½ Ã¬ÂÂ¬Ã¬ÂÂ  (CCR Ã­ÂÂÃ¬ÂÂ Ã¢ÂÂ ISO 13485 ÃÂ§4.2.4)"
                value={reason}
                onChange={setReason}
                placeholder="Ã¬ÂÂ: Ã¬ÂÂÃ¬ÂÂ Ã­ÂÂÃªÂ°Â ÃªÂ²Â°ÃªÂ³Â¼ Ã¬ÂÂÃ«ÂÂÃ«ÂÂ Ã¬ÂÂ¬Ã¬ÂÂ© Ã«ÂªÂÃ­ÂÂÃ­ÂÂ / Ã«ÂªÂ¨Ã«ÂÂ¸ Ã«Â²ÂÃ­ÂÂ¸ ÃªÂ¸ÂÃ«Â¡ÂÃ«Â²Â Ã­ÂÂÃªÂ¸Â° Ã­ÂÂµÃ¬ÂÂ¼"
                required
              />

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={cancelEdit} className="btn-ghost">
                  Ã¬Â·Â¨Ã¬ÂÂ
                </button>
                <button onClick={saveEdit} className="btn-primary">
                  Ã¬Â ÂÃ¬ÂÂ¥ ÃÂ· CCR Ã«Â°ÂÃ¬ÂÂ
                </button>
              </div>
            </div>
          )}

          <ComplianceFooter
            regs={['ISO 13485 ÃÂ§7.3', '21 CFR 820.30', 'MDR Annex II']}
          />
        </div>
      </div>

      {/* Ã¬ÂÂ°: Ã«Â³ÂÃªÂ²Â½ Ã¬ÂÂ´Ã«Â Â¥ */}
      <div className="lg:col-span-1">
        <ChangeHistoryPanel ccrs={ccrs} onNavigateTo={() => navigate('/change-control')} />
      </div>

      {/* Ã¬ÂÂ­Ã¬Â Â Ã­ÂÂÃ¬ÂÂ¸ Ã«ÂªÂ¨Ã«ÂÂ¬ */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="card-base p-5 w-full max-w-[420px]" style={{ background: 'var(--bg-card)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Trash2 size={16} style={{ color: '#DC2626' }} />
              <div className="font-display text-[16px]" style={{ color: 'var(--ink)' }}>Ã¬Â ÂÃ­ÂÂ Ã¬ÂÂ­Ã¬Â Â</div>
            </div>
            <div className="text-[12.5px] mb-3" style={{ color: 'var(--ink-mute)' }}>
              '{product.name}' Ã¬Â ÂÃ­ÂÂÃ¬ÂÂ Ã¬ÂÂ­Ã¬Â ÂÃ­ÂÂ©Ã«ÂÂÃ«ÂÂ¤. Ã¬ÂÂ´ Ã¬ÂÂÃ¬ÂÂÃ¬ÂÂ Ã«ÂÂÃ«ÂÂÃ«Â¦Â´ Ã¬ÂÂ Ã¬ÂÂÃ¬ÂÂ¼Ã«Â©Â°, Ã¬ÂÂ­Ã¬Â Â Ã¬ÂÂ¬Ã¬ÂÂ Ã«ÂÂ CCR(Ã«Â³ÂÃªÂ²Â½ÃªÂ´ÂÃ«Â¦Â¬)Ã«Â¡Â Ã¬ÂÂÃ«ÂÂ Ã«Â°ÂÃ¬ÂÂÃ«ÂÂÃ¬ÂÂ´ Ã¬ÂÂ´Ã«Â Â¥Ã¬ÂÂ Ã«Â³Â´Ã¬Â¡Â´Ã«ÂÂ©Ã«ÂÂÃ«ÂÂ¤.
            </div>
            <FieldEdit
              label="Ã¬ÂÂ­Ã¬Â Â Ã¬ÂÂ¬Ã¬ÂÂ  (Ã­ÂÂÃ¬ÂÂ)"
              value={deleteReason}
              onChange={setDeleteReason}
              placeholder="Ã¬ÂÂ: Ã­ÂÂÃªÂ°ÂÃ¬Â·Â¨Ã¬ÂÂ, Ã¬ÂÂÃ«ÂªÂ»Ã¬ÂÂÃ«Â Â¥, Ã¬Â¤ÂÃ«Â³ÂµÃ«ÂÂ±Ã«Â¡Â Ã«ÂÂ±"
              required
            />
            <div className="flex justify-end gap-2 pt-3">
              <button onClick={() => { setShowDeleteModal(false); setDeleteReason('') }} className="btn-ghost">
                Ã¬Â·Â¨Ã¬ÂÂ
              </button>
              <button onClick={doDelete} className="btn-primary" style={{ background: '#DC2626' }}>
                Ã¬ÂÂ­Ã¬Â Â Ã­ÂÂÃ¬Â Â
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const CONTACT_LABELS = {
  none: 'Ã¬ÂÂ Ã¬Â²Â´ Ã«Â¹ÂÃ¬Â ÂÃ¬Â´Â',
  surface: 'Ã­ÂÂ¼Ã«Â¶ÂÃÂ·Ã¬Â ÂÃ«Â§Â Ã¬Â ÂÃ¬Â´Â (Surface)',
  external: 'Ã¬ÂÂ¸Ã«Â¶Â Ã­ÂÂµÃ¬ÂÂ  (External Communicating)',
  implantable: 'Ã¬ÂÂÃ­ÂÂÃ«ÂÂÃ­ÂÂ¸ (Implantable)',
}

const SW_LABELS = {
  none: 'SW Ã¬ÂÂÃ¬ÂÂ',
  embedded: 'Ã«ÂÂ´Ã¬ÂÂ¥ SW',
  samd: 'Ã«ÂÂÃ«Â¦Â½Ã­ÂÂ SW (SaMD)',
}

/* ================================================================
   PROD-002 ÃªÂ³ÂµÃ¬Â Â Ã­ÂÂ¨Ã«ÂÂ
   ================================================================ */
function ProcessPanel({ product, products, selId, setSelId, onAction }) {
  const productKey = productKeyOf(product)
  const user = auth.current()
  const companyId = user?.company_id
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
  useEffect(() => { _sbCidPr = companyId || null }, [companyId])
  useEffect(() => {
    if (!companyId) return
    supabase.from('company_data').select('payload')
      .eq('company_id', companyId).eq('data_type', 'localStorage_sync')
      .eq('data_key', CUSTOM_BLOCK_KEY).maybeSingle()
      .then(({ data: sbData }) => { if (sbData?.payload) setCustomList(sbData.payload) })
  }, [companyId])

  const persist = (next) => {
    const ordered = next.map((p, i) => ({ ...p, order: i + 1 }))
    setList(ordered)
    const ob = onboarding.load()
    onboarding.save(setProductProcesses(ob, productKey, ordered))
    onAction && onAction('ÃªÂ³ÂµÃ¬Â Â Ã¬ÂÂÃ¬ÂÂÃªÂ°Â Ã¬Â ÂÃ¬ÂÂ¥Ã«ÂÂÃ¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤')
  }
  const addBlock = (b) => { persist([...list, { id: 'p' + Date.now(), blockId: b.id, order: list.length + 1 }]); setPicking(false); setQ('') }
  const addCustomBlock = () => {
    const name = q.trim()
    if (!name) return
    if (!requirePermission('onb.process.addBlock')) return
    const nb = { id: 'custom-' + Date.now(), name, en: '', category: customCat || undefined, desc: 'Ã¬ÂÂ¬Ã¬ÂÂ©Ã¬ÂÂ Ã¬Â ÂÃ¬ÂÂ ÃªÂ³ÂµÃ¬Â Â', custom: true, sopAuto: [], inspections: [], standards: [], risks: [] }
    const nextCustom = [...customList, nb]
    setCustomList(nextCustom)
    saveCustomBlocks(nextCustom)
    addBlock(nb)
    setCustomCat('')
  }
  const del = (id) => persist(list.filter((p) => p.id !== id))
  const move = (i, dir) => { const j = i + dir; if (j < 0 || j >= list.length) return; const n = list.slice(); const t = n[i]; n[i] = n[j]; n[j] = t; persist(n) }
  const loadDefault = () => { if (list.length && !window.confirm('Ã­ÂÂÃ¬ÂÂ¬ ÃªÂ³ÂµÃ¬Â ÂÃ¬ÂÂ ÃªÂ¸Â°Ã«Â³Â¸ 6Ã«ÂÂ¨ÃªÂ³Â Ã¬Â²Â´Ã¬ÂÂ¸Ã¬ÂÂ¼Ã«Â¡Â Ã«ÂÂÃ¬Â²Â´Ã­ÂÂ ÃªÂ¹ÂÃ¬ÂÂ?')) return; persist(DEFAULT_CHAIN.map((b, i) => ({ id: 'p' + Date.now() + '-' + i, blockId: b.blockId, order: i + 1, customName: b.customName }))) }

  const stats = useMemo(() => {
    const S = { sop: new Set(), insp: new Set(), std: new Set(), risk: new Set() }
    list.forEach((p) => { const b = findBlock(p.blockId); if (!b) return; b.sopAuto?.forEach((x) => S.sop.add(x)); b.inspections?.forEach((x) => S.insp.add(x)); b.standards?.forEach((x) => S.std.add(x)); b.risks?.forEach((x) => S.risk.add(x)) })
    return { sops: S.sop.size, inspections: S.insp.size, standards: S.std.size, risks: S.risk.size }
  }, [list]) // eslint-disable-line

  const blockChoices = allBlocks.filter((b) => !q || (b.name || '').toLowerCase().includes(q.toLowerCase()) || (b.en || '').toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-4 gap-3">
        <StatCard label="SOP Ã¬ÂÂÃ«ÂÂ" value={stats.sops} hint="Ã¬ÂÂÃ«ÂÂ Ã«Â§Â¤Ã­ÂÂÃ«ÂÂ Ã­ÂÂÃ¬Â¤ÂÃ¬ÂÂÃ¬ÂÂ" />
        <StatCard label="ÃªÂ²ÂÃ¬ÂÂ¬ Ã­ÂÂ­Ã«ÂªÂ© (Ã¬ÂÂÃ«ÂÂ)" value={stats.inspections} hint="Ã«Â¸ÂÃ«Â¡ÂÃ«Â³Â Ã«Â§Â¤Ã­ÂÂ" />
        <StatCard label="Ã­ÂÂÃ¬Â¤Â" value={stats.standards} hint="ISO/FDA Ã¬ÂÂ¸Ã¬ÂÂ© Ã¬Â¡Â°Ã­ÂÂ­" />
        <StatCard label="Ã¬ÂÂÃ­ÂÂ ID" value={stats.risks} hint="ISO 14971 Ã­ÂÂ­Ã«ÂªÂ©" />
      </div>

      {Array.isArray(products) && products.length > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11.5px] mr-1" style={{ color: 'var(--ink-mute)' }}>Ã¬Â ÂÃ­ÂÂÃ«Â³Â ÃªÂ³ÂµÃ¬Â Â:</span>
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
                {p.name || '(Ã¬ÂÂ´Ã«Â¦ÂÃ¬ÂÂÃ¬ÂÂ)'}
              </button>
            )
          })}
        </div>
      )}

      <div className="card-base p-3">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
          <div className="text-[13px]" style={{ color: 'var(--ink)' }}>{product?.name ? `${product.name} ÃÂ· ` : ''}Ã¬Â ÂÃ¬Â¡Â°ÃÂ·ÃªÂ²ÂÃ¬ÂÂ¬ ÃªÂ³ÂµÃ¬Â Â Ã¬ÂÂÃ¬ÂÂ ({list.length}Ã«ÂÂ¨ÃªÂ³Â)</div>
          <div className="flex gap-2">
            <button onClick={loadDefault} className="btn-ghost text-[12px]">ÃªÂ¸Â°Ã«Â³Â¸ ÃªÂ³ÂµÃ¬Â ÂÃ¬Â²Â´Ã¬ÂÂ¸ Ã«Â¶ÂÃ«ÂÂ¬Ã¬ÂÂ¤ÃªÂ¸Â°</button>
            <button onClick={() => setPicking((v) => !v)} className="btn-primary text-[12px]" style={{ background: 'var(--rust)' }}>+ ÃªÂ³ÂµÃ¬Â Â Ã¬Â¶ÂÃªÂ°Â</button>
          </div>
        </div>
        <div className="text-[11.5px] mb-2" style={{ color: 'var(--ink-mute)' }}>Ã¬Â ÂÃ­ÂÂÃ«Â§ÂÃ«ÂÂ¤ Ã¬ÂÂÃ«Â¡Â Ã«ÂÂ¤Ã«Â¥Â¸ ÃªÂ³ÂµÃ¬Â ÂÃ¬ÂÂ Ã¬Â ÂÃ¬ÂÂÃ­ÂÂ  Ã¬ÂÂ Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤. Ã¬ÂÂ¬ÃªÂ¸Â°Ã¬ÂÂ Ã¬Â ÂÃ¬ÂÂÃ­ÂÂ Ã¬ÂÂÃ¬ÂÂÃ«ÂÂÃ«Â¡Â (Ã¬ÂÂ Ã­ÂÂÃ«ÂÂ Ã¬Â ÂÃ­ÂÂÃ¬ÂÂ) Ã¬ÂÂÃ¬ÂÂ Ã¬Â§ÂÃ¬ÂÂ Ã«ÂÂ¨ÃªÂ³ÂÃªÂ°Â Ã«Â°ÂÃªÂ¸ÂÃ«ÂÂ©Ã«ÂÂÃ«ÂÂ¤. Ã¬Â§ÂÃ­ÂÂ Ã¬Â¤Â Ã¬ÂÂÃ¬ÂÂ Ã¬Â§ÂÃ¬ÂÂÃ«ÂÂ Ã«Â°ÂÃªÂ¸Â Ã¬ÂÂÃ¬Â Â Ã¬ÂÂ¤Ã«ÂÂÃ¬ÂÂ·Ã¬ÂÂ´ Ã¬ÂÂ Ã¬Â§ÂÃ«ÂÂ©Ã«ÂÂÃ«ÂÂ¤(Ã¬ÂÂÃªÂ°Â Ã¬ÂÂ ÃªÂ¸Â).</div>
        {picking && (
          <div className="rounded-md p-2" style={{ background: 'var(--bg-soft)' }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ÃªÂ³ÂµÃ¬Â Â Ã«Â¸ÂÃ«Â¡Â ÃªÂ²ÂÃ¬ÂÂÃ¢ÂÂ¦ (Ã«ÂªÂ©Ã«Â¡ÂÃ¬ÂÂ Ã¬ÂÂÃ¬ÂÂ¼Ã«Â©Â´ Ã¬ÂÂÃ«ÂÂÃ¬ÂÂÃ¬ÂÂ Ã¬Â§ÂÃ¬Â Â Ã¬Â¶ÂÃªÂ°Â)" className="w-full bg-transparent outline-none text-[12.5px] mb-2 px-1" />
            <div className="grid sm:grid-cols-2 gap-1.5 max-h-64 overflow-auto">
              {blockChoices.map((b) => {
                const cat = PROCESS_CATEGORIES.find((c) => c.id === b.category)
                return (
                  <button key={b.id} onClick={() => addBlock(b)} className="text-left px-2.5 py-1.5 rounded-md text-[12px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
                    <span style={{ color: 'var(--ink)' }}>{b.name}</span>
                    {b.custom && <span className="ml-1.5 text-[10px] px-1 rounded" style={{ background: 'var(--leaf-soft)', color: 'var(--moss)' }}>Ã¬Â§ÂÃ¬Â Â Ã¬Â¶ÂÃªÂ°Â</span>}
                    {cat && <span className="ml-1.5" style={{ color: 'var(--ink-faint)' }}>ÃÂ· {cat.name}</span>}
                  </button>
                )
              })}
            </div>
            {blockChoices.length === 0 && q.trim() && (
              <div className="text-[11.5px] mt-2 px-1" style={{ color: 'var(--ink-mute)' }}>'{q.trim()}' ÃªÂ²ÂÃ¬ÂÂ ÃªÂ²Â°ÃªÂ³Â¼ÃªÂ°Â Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤. Ã¬ÂÂÃ«ÂÂÃ¬ÂÂÃ¬ÂÂ Ã«ÂªÂ©Ã«Â¡ÂÃ¬ÂÂ Ã¬ÂÂÃ«ÂÂ ÃªÂ³ÂµÃ¬Â ÂÃ¬ÂÂ¼Ã«Â¡Â Ã¬Â§ÂÃ¬Â Â Ã¬Â¶ÂÃªÂ°ÂÃ­ÂÂ  Ã¬ÂÂ Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤.</div>
            )}
            <div className="mt-2 pt-2 flex items-center gap-1.5 flex-wrap" style={{ borderTop: '1px solid var(--line)' }}>
              <select value={customCat} onChange={(e) => setCustomCat(e.target.value)} className="input-base text-[12px]" style={{ width: 'auto', padding: '5px 8px' }}>
                <option value="">Ã«Â¶ÂÃ«Â¥Â Ã¬ÂÂ Ã­ÂÂ Ã¬ÂÂ Ã­ÂÂ¨</option>
                {PROCESS_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button onClick={addCustomBlock} disabled={!q.trim()} className="btn-primary text-[12px] disabled:opacity-40" style={{ padding: '5px 10px' }}>
                + '{q.trim() || 'Ã¢ÂÂ¦'}' Ã«ÂªÂ©Ã«Â¡ÂÃ¬ÂÂ Ã¬ÂÂÃ«ÂÂ ÃªÂ³ÂµÃ¬Â ÂÃ¬ÂÂ¼Ã«Â¡Â Ã¬Â¶ÂÃªÂ°Â
              </button>
            </div>
          </div>
        )}
      </div>

      {!product && (
        <div className="card-base p-3 text-[12px]" style={{ color: 'var(--rust)', background: 'var(--rust-soft)', borderStyle: 'dashed' }}>
          Ã«ÂÂ±Ã«Â¡ÂÃ«ÂÂ Ã¬Â ÂÃ­ÂÂÃ¬ÂÂ´ Ã¬ÂÂÃ¬ÂÂ´ ÃªÂ¸Â°Ã«Â³Â¸(ÃªÂ³ÂµÃ¬ÂÂ©) ÃªÂ³ÂµÃ¬Â Â Ã«ÂªÂ©Ã«Â¡ÂÃ¬ÂÂ Ã­ÂÂ¸Ã¬Â§ÂÃ­ÂÂÃªÂ³Â  Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤. 'Ã¬Â ÂÃ­ÂÂ' Ã­ÂÂ­Ã¬ÂÂÃ¬ÂÂ Ã¬Â ÂÃ­ÂÂÃ¬ÂÂ Ã¬Â¶ÂÃªÂ°ÂÃ­ÂÂÃ«Â©Â´ Ã¬Â ÂÃ­ÂÂÃ«Â³ÂÃ«Â¡Â Ã«ÂÂ¤Ã«Â¥Â¸ ÃªÂ³ÂµÃ¬Â ÂÃ¬ÂÂ Ã¬Â ÂÃ¬ÂÂÃ­ÂÂ  Ã¬ÂÂ Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤.
        </div>
      )}

      <div className="space-y-2">
        {list.length === 0 ? (
          <div className="card-base p-6 text-center text-[13px]" style={{ color: 'var(--ink-mute)', borderStyle: 'dashed' }}>
            Ã«ÂÂ±Ã«Â¡ÂÃ«ÂÂ ÃªÂ³ÂµÃ¬Â ÂÃ¬ÂÂ´ Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤. "ÃªÂ¸Â°Ã«Â³Â¸ ÃªÂ³ÂµÃ¬Â ÂÃ¬Â²Â´Ã¬ÂÂ¸ Ã«Â¶ÂÃ«ÂÂ¬Ã¬ÂÂ¤ÃªÂ¸Â°" Ã«ÂÂÃ«ÂÂ "ÃªÂ³ÂµÃ¬Â Â Ã¬Â¶ÂÃªÂ°Â"Ã«Â¡Â Ã¬ÂÂÃ¬ÂÂÃ­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ.
          </div>
        ) : (
          list.map((p, idx) => {
            const block = findBlock(p.blockId)
            const cat = block && PROCESS_CATEGORIES.find((c) => c.id === block.category)
            return (
              <div key={p.id || idx} className="card-base p-3 flex items-center gap-3">
                <span className="font-mono text-[12px] w-6 text-center" style={{ color: 'var(--rust)' }}>{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] truncate" style={{ color: 'var(--ink)' }}>{p.customName || block?.name || p.blockId}{p.customName && block ? ' ÃÂ· ' + block.name : ''}</div>
                  {cat && <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{cat.name}{block?.standards?.length ? ' ÃÂ· ' + block.standards.join(', ') : ''}</div>}
                </div>
                <button onClick={() => move(idx, -1)} disabled={idx === 0} className="px-2 py-1 rounded-md text-[13px] disabled:opacity-30" style={{ border: '1px solid var(--line)' }}>Ã¢ÂÂ²</button>
                <button onClick={() => move(idx, 1)} disabled={idx === list.length - 1} className="px-2 py-1 rounded-md text-[13px] disabled:opacity-30" style={{ border: '1px solid var(--line)' }}>Ã¢ÂÂ¼</button>
                <button onClick={() => del(p.id)} className="px-2 py-1 rounded-md text-[12px]" style={{ color: 'var(--rust)', border: '1px solid var(--line)' }}>Ã¬ÂÂ­Ã¬Â Â</button>
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
                title="Ã­ÂÂ¹Ã¬ÂÂÃªÂ³ÂµÃ¬Â Â (ISO 13485 ÃÂ§7.5.6)"
              >
                SPECIAL
              </span>
            )}
            <span
              className="font-mono text-[10px] ml-auto"
              style={{ color: 'var(--ink-faint)' }}
            >
              {tplCount}ÃªÂ°Â ÃªÂ²ÂÃ¬ÂÂ¬ Ã­ÂÂ­Ã«ÂªÂ©
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
            title="Ã¬ÂÂÃ«ÂÂ SOP"
            items={block.sopAuto || []}
            color="moss"
          />
          <ChipBlock
            title="Ã¬ÂÂÃ«ÂÂ ÃªÂ²ÂÃ¬ÂÂ¬"
            items={block.inspections || []}
            color="sky"
          />
          <ChipBlock
            title="Ã¬Â ÂÃ¬ÂÂ© Ã­ÂÂÃ¬Â¤Â"
            items={block.standards || []}
            color="ink"
            mono
          />
          <ChipBlock
            title="Ã¬ÂÂÃ­ÂÂ"
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
   PROD-003 ÃªÂ²ÂÃ¬ÂÂ¬ Ã­ÂÂ­Ã«ÂªÂ© Ã«Â§ÂÃ¬ÂÂ¤Ã­ÂÂ°
   ================================================================ */
function InspectionPanel({ onAction }) {
  const allBlocks = useMemo(
    () => [...PROCESS_BLOCKS, ...loadCustomBlocks()],
    []
  )
  const findBlock = (id) => allBlocks.find((b) => b.id === id)

  // Ã«ÂªÂ¨Ã«ÂÂ  Ã«Â¸ÂÃ«Â¡Â ÃÂ Ã«ÂªÂ¨Ã«ÂÂ  Ã­ÂÂÃ­ÂÂÃ«Â¦Â¿ Ã­ÂÂµÃ­ÂÂ© Ã¬Â¡Â°Ã­ÂÂ
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

  // Ã­ÂÂµÃªÂ³Â
  const stats = useMemo(() => {
    const counts = { Critical: 0, Major: 0, Minor: 0 }
    allTemplates.forEach((t) => {
      if (counts[t.criticality] !== undefined) counts[t.criticality]++
    })
    return counts
  }, [allTemplates])

  return (
    <div className="space-y-4">
      {/* Ã­ÂÂµÃªÂ³Â */}
      <div className="grid md:grid-cols-3 gap-3">
        <StatCard
          label="Critical ÃªÂ²ÂÃ¬ÂÂ¬ Ã­ÂÂ­Ã«ÂªÂ©"
          value={stats.Critical}
          hint="Ã¬ÂÂÃ¬Â ÂÃÂ·Ã­ÂÂÃ¬ÂÂ Ã¬ÂÂ±Ã«ÂÂ¥"
          tone="rust"
        />
        <StatCard
          label="Major ÃªÂ²ÂÃ¬ÂÂ¬ Ã­ÂÂ­Ã«ÂªÂ©"
          value={stats.Major}
          hint="Ã¬Â£Â¼Ã¬ÂÂ Ã­ÂÂÃ¬Â§Â"
          tone="amber"
        />
        <StatCard
          label="Minor ÃªÂ²ÂÃ¬ÂÂ¬ Ã­ÂÂ­Ã«ÂªÂ©"
          value={stats.Minor}
          hint="Ã¬ÂÂ¸ÃªÂ´ÂÃÂ·Ã¬ÂÂ¼Ã«Â°Â"
          tone="ink-mute"
        />
      </div>

      {/* Ã­ÂÂÃ­ÂÂ° */}
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
            placeholder="ÃªÂ²ÂÃ¬ÂÂ¬ Ã­ÂÂ­Ã«ÂªÂ©ÃÂ·ÃªÂ³ÂµÃ¬Â Â ÃªÂ²ÂÃ¬ÂÂÃ¢ÂÂ¦"
            className="bg-transparent outline-none text-[12.5px] flex-1"
          />
        </div>
        <div className="flex gap-1">
          {[
            { id: 'all', label: 'Ã¬Â ÂÃ¬Â²Â´' },
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

      {/* Ã¬ÂÂÃ«ÂÂ´ */}
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
          ÃªÂ²ÂÃ¬ÂÂ¬ Ã­ÂÂ­Ã«ÂªÂ©Ã¬ÂÂ Ã¬ÂÂ ÃªÂ·Â Ã¬Â ÂÃ¬ÂÂÃÂ·Ã¬ÂÂÃ¬Â ÂÃÂ·Ã¬ÂÂ­Ã¬Â ÂÃ«ÂÂ <strong>eBR Ã­ÂÂÃ«Â©Â´(Ã¬ÂÂÃ¬ÂÂ Ã¬Â§ÂÃ¬ÂÂ
          Ã¬Â§ÂÃ­ÂÂ Ã¬Â¤Â)</strong> Ã«ÂÂÃ«ÂÂ <strong>Ã¬ÂÂ¨Ã«Â³Â´Ã«ÂÂ© ONB-003</strong>Ã¬ÂÂÃ¬ÂÂ
          Ã¬ÂÂ´Ã«Â£Â¨Ã¬ÂÂ´Ã¬Â§ÂÃ«ÂÂÃ«ÂÂ¤. Ã«Â³Â¸ Ã­ÂÂÃ«Â©Â´Ã¬ÂÂ Ã­ÂÂµÃ­ÂÂ© Ã¬Â¡Â°Ã­ÂÂÃÂ·ÃªÂ°ÂÃ¬ÂÂ¬ Ã¬Â¶ÂÃ¬Â ÂÃ¬ÂÂ Ã¬ÂÂÃ­ÂÂ Ã«Â§ÂÃ¬ÂÂ¤Ã­ÂÂ° Ã«Â·Â°Ã¬ÂÂÃ«ÂÂÃ«ÂÂ¤. Ã«ÂªÂ¨Ã«ÂÂ  Ã«Â³ÂÃªÂ²Â½Ã¬ÂÂ CCR Ã¬ÂÂÃ«ÂÂ Ã«Â°ÂÃ¬ÂÂÃ«ÂÂÃ«Â©Â° Ã¬Â§ÂÃ­ÂÂ Ã¬Â¤Â Ã¬ÂÂÃ¬ÂÂ Ã¬Â§ÂÃ¬ÂÂÃ«ÂÂ Ã¬ÂÂÃªÂ°Â Ã¬ÂÂ ÃªÂ¸ÂÃ«ÂÂ©Ã«ÂÂÃ«ÂÂ¤.
        </div>
      </div>

      {/* Ã«ÂªÂ©Ã«Â¡Â */}
      {filtered.length === 0 ? (
        <div
          className="card-base p-6 text-center text-[13px]"
          style={{ color: 'var(--ink-mute)', borderStyle: 'dashed' }}
        >
          {allTemplates.length === 0
            ? 'Ã¬Â ÂÃ¬ÂÂÃ«ÂÂ ÃªÂ²ÂÃ¬ÂÂ¬ Ã­ÂÂ­Ã«ÂªÂ©Ã¬ÂÂ´ Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤. eBR Ã­ÂÂÃ«Â©Â´Ã¬ÂÂÃ¬ÂÂ Ã«Â§Â¤Ã«ÂÂÃ¬Â ÂÃªÂ°Â Ã¬Â¶ÂÃªÂ°ÂÃ­ÂÂ  Ã¬ÂÂ Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤.'
            : 'ÃªÂ²ÂÃ¬ÂÂÃÂ·Ã­ÂÂÃ­ÂÂ° ÃªÂ²Â°ÃªÂ³Â¼ Ã¬ÂÂÃ¬ÂÂ'}
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
          Ã¢ÂÂ {template.blockName}
        </span>
        {template.inUse ? (
          <span
            className="font-mono text-[9.5px] px-1.5 py-0.5 rounded ml-auto"
            style={{
              background: 'var(--leaf-soft)',
              color: 'var(--moss)',
            }}
          >
            Ã­ÂÂÃ¬ÂÂ¬ Ã¬ÂÂ¬Ã¬ÂÂ© Ã¬Â¤Â
          </span>
        ) : (
          <span
            className="font-mono text-[9.5px] px-1.5 py-0.5 rounded ml-auto"
            style={{
              background: 'var(--bg-soft)',
              color: 'var(--ink-faint)',
            }}
          >
            Ã«ÂÂ¼Ã¬ÂÂ´Ã«Â¸ÂÃ«ÂÂ¬Ã«Â¦Â¬
          </span>
        )}
      </div>
      <div
        className="font-mono text-[11px] mt-1.5 flex items-center gap-3 flex-wrap"
        style={{ color: 'var(--ink-faint)' }}
      >
        <span>
          ÃªÂ·ÂÃªÂ²Â©: {template.specMin}~{template.specMax}
          {template.unit ? ' ' + template.unit : ''}
        </span>
        {template.specNominal !== '' && template.specNominal != null && (
          <span>ÃªÂ³ÂµÃ¬Â¹Â­: {template.specNominal}</span>
        )}
        {template.method && <span>Ã«Â°Â©Ã«Â²Â: {template.method}</span>}
        <span>v{template.version || 1}</span>
        {ccrCount > 0 && (
          <span style={{ color: 'var(--amber)' }}>
            <History size={9} style={{ display: 'inline' }} /> CCR {ccrCount}ÃªÂ±Â´
          </span>
        )}
      </div>
    </div>
  )
}

/* ================================================================
   Ã«Â³ÂÃªÂ²Â½ Ã¬ÂÂ´Ã«Â Â¥ Ã­ÂÂ¨Ã«ÂÂ (CCR)
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
          CHANGE HISTORY ÃÂ· Ã«Â³ÂÃªÂ²Â½ Ã¬ÂÂ´Ã«Â Â¥
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
          <button onClick={onNavigateTo} className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ background: 'var(--bg-soft)', color: 'var(--moss)', border: '1px solid var(--line)', cursor: 'pointer' }}>Ã¬ÂÂ¤ÃªÂ³ÂÃ«Â³ÂÃªÂ²Â½ Ã«Â°ÂÃ«Â¡ÂÃªÂ°ÂÃªÂ¸Â° Ã¢ÂÂ</button>
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
          Ã«Â³ÂÃªÂ²Â½ Ã¬ÂÂ´Ã«Â Â¥ Ã¬ÂÂÃ¬ÂÂ
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
                  {new Date(r.performedAt).toLocaleString('ko-KR')} ÃÂ·{' '}
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
   Ã«Â¶ÂÃ¬ÂÂ Ã¬Â»Â´Ã­ÂÂ¬Ã«ÂÂÃ­ÂÂ¸
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
