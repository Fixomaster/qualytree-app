// KGMP 통합 현황 — 수입 의료기기 인증(인허가) 신청 및 유지관리에 필요한
// 공통 제출 문서 / 기술문서 / 품질시스템 관련 / 필수 절차서 / 유지 기록을
// 여러 SSoT 모듈(onboarding/company/product/logistics/mreview/capa/training/audit)에서
// 집계하는 순수 함수 모음. KgmpHub.jsx(상세 화면)와 Dashboard.jsx(요약 카드)가 공유한다.

import { onboarding, productKeyOf } from './onboardingState'
import { companyDocs, DOC_CATEGORY } from './companyState'
import { productDocs, TECH_DOC_CATEGORY } from './productDocsState'
// logisticsState.js는 더 이상 사용하지 않음 — 입고·출고는 /purchase-info, 이상사례는 /complaints(MDR)로 이전
import { reviews } from './managementReviewState'
import { capa } from './capaState'
import { sessions as trainingSessions } from './trainingState'
import { audits } from './internalAuditState'

const DOC_KEY = 'qualytree.documents'

// 필수 절차서 — 실제 절차 목록에 없으면 자동 보완(생성)되는 항목
export const KGMP_REQUIRED_NEW_PROCEDURES = ['공급업체관리 절차서', '회수(Recall) 절차서', '변경관리 절차서']

export const KGMP_REQUIRED_PROCEDURES = [
  { label: '문서관리', keywords: ['문서관리'] },
  { label: '기록관리', keywords: ['기록관리'] },
  { label: '교육훈련', keywords: ['교육훈련'] },
  { label: '구매관리', keywords: ['구매관리'] },
  { label: '공급업체관리', keywords: ['공급업체', '공급자관리'] },
  { label: '불만처리', keywords: ['고객불만', '불만처리'] },
  { label: 'CAPA (시정조치 및 예방조치)', keywords: ['시정조치', '예방조치', 'CAPA'] },
  { label: '부적합품관리', keywords: ['부적합품'] },
  { label: '회수(Recall)', keywords: ['회수', 'Recall'] },
  { label: '변경관리', keywords: ['변경관리'] },
  { label: '내부심사', keywords: ['내부심사', '내부감사'] },
  { label: '경영검토', keywords: ['경영검토'] },
]

const norm = (r) => {
  const st = r && r.status
  return (st === 'review' || st === 'pending' || st === 'effective' || st === 'obsolete') ? st : 'draft'
}

function loadDocState() {
  try { return JSON.parse(localStorage.getItem(DOC_KEY) || '{}') } catch { return {} }
}

// 새 워크스페이스(사이드 메뉴로 연결된) 화면들이 실제로 데이터를 저장하는 곳 — 여기서 직접 읽어서
// KGMP 체크리스트 상태에 반영한다(기존 /documents, /company 등 사이드 메뉴에 없는 구 화면은 참조하지 않는다).
const DOC_REGISTER_KEY = 'qualytree.doc_register'       // 문서·규정 › 문서관리 (/document-control)
const QUALITY_MANUAL_KEY = 'qualytree.quality_manual'   // 문서·규정 › 품질매뉴얼 (/quality-manual)
const ORG_ROLES_KEY = 'qualytree.org_roles'             // 교육·인력 › 조직·책임 (/org-responsibility)
const IQC_RECORDS_KEY = 'qualytree.iqc_records'         // 구매·자재 › 구매정보·수입검사 (/purchase-info)
const DISTRIBUTIONS_KEY = 'qualytree.distributions'     // 생산·제조 › 제품추적성관리 (/traceability)

function loadDocRegister() {
  try { return JSON.parse(localStorage.getItem(DOC_REGISTER_KEY) || '[]') } catch { return [] }
}
function saveDocRegister(list) {
  try { localStorage.setItem(DOC_REGISTER_KEY, JSON.stringify(list)) } catch { /* ignore */ }
}
function loadQualityManual() {
  try { return JSON.parse(localStorage.getItem(QUALITY_MANUAL_KEY) || 'null') || {} } catch { return {} }
}
function loadOrgRoles() {
  try { return JSON.parse(localStorage.getItem(ORG_ROLES_KEY) || '[]') } catch { return [] }
}
function loadIqcRecords() {
  try { return JSON.parse(localStorage.getItem(IQC_RECORDS_KEY) || '[]') } catch { return [] }
}
function loadDistributions() {
  try { return JSON.parse(localStorage.getItem(DISTRIBUTIONS_KEY) || '[]') } catch { return [] }
}
const RECEIVING_SHIPPING_KEY = 'qualytree.receiving_shipping'  // 구매·자재 › 구매정보·수입검사 (/purchase-info, 입고·출고 기록 탭)
function loadReceivingShipping() {
  try { return JSON.parse(localStorage.getItem(RECEIVING_SHIPPING_KEY) || '[]') } catch { return [] }
}
// 수주·고객 › 고객불만 관리(/complaints)의 저장소를 직접 읽는다(불만 접수·MDR 판단 등 상세 항목 포함).
// 경영검토(managementReviewState.js)는 더 이상 별도의 고객불만 기록을 두지 않는다.
const COMPLAINT_HUB_KEY = 'qualytree.complaints'
function loadComplaintHubItems() {
  try { return JSON.parse(localStorage.getItem(COMPLAINT_HUB_KEY) || '[]') } catch { return [] }
}

function genDocRegisterId() { return `DOC-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}` }

/** 필수 절차서(SOP) 3종이 문서관리(/document-control) 대장에 아직 없으면 초안으로 자동 등록(멱등). */
export function ensureKgmpProcedures() {
  const docs = loadDocRegister()
  const missing = KGMP_REQUIRED_NEW_PROCEDURES.filter(
    (title) => !docs.some((d) => d.type === 'SOP' && (d.title || '').includes(title.replace(/\s*\(.*?\)\s*/g, '')))
  )
  if (missing.length === 0) return
  const today = new Date().toISOString().slice(0, 10)
  const added = missing.map((title, i) => ({
    id: genDocRegisterId() + '-' + i,
    docNo: 'SOP-AUTO-' + (Date.now() + i),
    title,
    type: 'SOP',
    status: 'draft',
    revision: 'Rev.0',
    issueDate: '', approvedDate: '', reviewDate: '',
    author: '', reviewer: '', approver: '',
    ownerDept: '품질부(QUA)',
    distributionList: [],
    retentionPeriod: '3년',
    relatedStandard: 'KGMP',
    revisionHistory: [],
    notes: 'KGMP 필수 절차서 — 자동 생성됨',
    createdAt: today,
  }))
  saveDocRegister([...added, ...docs])
}

function buildCtx() {
  const ob = onboarding.load() || {}
  const company = ob.company || {}
  const products = (Array.isArray(ob.products) && ob.products.length)
    ? ob.products
    : (ob.product && ob.product.name ? [ob.product] : [])
  const manualChapters = (ob.manual && Array.isArray(ob.manual.chapters)) ? ob.manual.chapters.filter((c) => c.included !== false) : []
  const procedures = Array.isArray(ob.procedures) ? ob.procedures.filter((p) => p.applicable !== false) : []
  const docState = loadDocState()
  const cDocs = companyDocs.load()
  const techDocsAll = products.flatMap((p) => productDocs.getTechDocs(productKeyOf(p)))
  const licensesAll = products.flatMap((p) => productDocs.getLicenses(productKeyOf(p)))
  return {
    company,
    products,
    manualChapters,
    procedures,
    docState,
    companyDocuments: cDocs.documents || [],
    roleDocs: cDocs.roleDocs || [],
    techDocsAll,
    licensesAll,
    capaAll: capa.loadAll(),
    trainingSessions: trainingSessions.getAll(),
    audits: audits.getAll(),
    reviews: reviews.getAll(),
    // 새 워크스페이스(사이드 메뉴 연결) 화면 데이터
    docRegister: loadDocRegister(),
    qualityManual: loadQualityManual(),
    orgRoles: loadOrgRoles(),
    iqcRecords: loadIqcRecords(),
    distributions: loadDistributions(),
    receivingShipping: loadReceivingShipping(),
    complaintHubItems: loadComplaintHubItems(),
  }
}

/**
 * KGMP 섹션·항목 목록을 구성한다. 항목마다 status(done/partial/missing)·detail·editHref를 포함한다.
 * 필요 시 누락된 필수 절차서를 자동 보완한 뒤 최신 데이터로 계산한다.
 */
export function buildKgmpSections({ autoHeal = true, profile = 'manufacturer' } = {}) {
  if (autoHeal) ensureKgmpProcedures()
  const ctx = buildCtx()

  const companyDocItem = (label, category, editHref) => {
    const matches = ctx.companyDocuments.filter((d) => d.category === category)
    const withFile = matches.filter((d) => d.fileId)
    const status = withFile.length > 0 ? 'done' : matches.length > 0 ? 'partial' : 'missing'
    return {
      label,
      status,
      detail: withFile.length > 0
        ? `첨부 ${withFile.length}건 (${withFile.map((d) => d.fileName || d.title || '파일').slice(0, 2).join(', ')}${withFile.length > 2 ? ' 외' : ''})`
        : matches.length > 0 ? '등록됨 · 파일 미첨부' : '미등록',
      editHref,
    }
  }

  const techDocItem = (label, category) => {
    const matches = ctx.techDocsAll.filter((d) => d.category === category)
    const withFile = matches.filter((d) => d.fileId)
    const status = withFile.length > 0 ? 'done' : matches.length > 0 ? 'partial' : 'missing'
    return {
      label,
      status,
      detail: withFile.length > 0 ? `첨부 ${withFile.length}건` : matches.length > 0 ? '등록됨 · 파일 미첨부' : '미등록',
      editHref: '/design-history?tab=techdocs',
    }
  }
  // EMC·전기안전 등 여러 시험 카테고리를 하나의 "시험성적서" 항목으로 묶어서 보여준다
  // (실제 문서 업로드 화면에서는 여전히 개별 시험 종류로 구분 등록한다 — 여기서는 집계만 합친다).
  const techDocItemMulti = (label, categories) => {
    const matches = ctx.techDocsAll.filter((d) => categories.includes(d.category))
    const withFile = matches.filter((d) => d.fileId)
    const status = withFile.length > 0 ? 'done' : matches.length > 0 ? 'partial' : 'missing'
    return {
      label,
      status,
      detail: withFile.length > 0 ? `첨부 ${withFile.length}건` : matches.length > 0 ? '등록됨 · 파일 미첨부' : '미등록',
      editHref: '/design-history?tab=techdocs',
    }
  }

  // 문서·규정 › 문서관리(/document-control)의 대장(qualytree.doc_register)에서 SOP 유형 문서를 찾는다.
  const DOC_STATUS_LABEL = { draft: '초안', review: '검토중', approved: '승인', distributed: '배포', obsolete: '폐기' }
  const procedureItem = (req) => {
    const matched = ctx.docRegister.find((d) => d.type === 'SOP' && req.keywords.some((k) => (d.title || '').includes(k)))
    if (!matched) {
      return { label: req.label + ' 절차서', status: 'missing', detail: '문서관리에 등록되지 않음', editHref: '/document-control' }
    }
    const status = (matched.status === 'approved' || matched.status === 'distributed') ? 'done'
      : matched.status === 'obsolete' ? 'missing' : 'partial'
    return {
      label: matched.title,
      status,
      detail: DOC_STATUS_LABEL[matched.status] || '초안',
      editHref: '/document-control?openName=' + encodeURIComponent(matched.title),
    }
  }

  const recordItem = (label, count, editHref, detailSuffix) => ({
    label,
    status: count > 0 ? 'done' : 'missing',
    detail: count > 0 ? `${count}건 기록됨${detailSuffix ? ' · ' + detailSuffix : ''}` : '기록 없음',
    editHref,
  })

  const companyInfoDone = !!(ctx.company.name && ctx.company.bizNumber)

  const sections = [
    {
      id: 'common',
      title: '공통 제출 문서',
      subtitle: '수입 의료기기 인증(인허가) 시 제출하는 회사·제품 기본 자료',
      items: [
        {
          label: '의료기기 제조업체 정보',
          status: companyInfoDone ? 'done' : 'missing',
          detail: companyInfoDone ? `${ctx.company.name} · 사업자번호 ${ctx.company.bizNumber}` : '회사명·사업자번호 미입력',
          editHref: '/document-control?tab=company',
        },
        companyDocItem('제조소 등록 자료', DOC_CATEGORY.FACILITY_REG, '/document-control?tab=company'),
        companyDocItem('사업자등록증', DOC_CATEGORY.BIZ_REG, '/document-control?tab=company'),
        ...(profile === 'importer'
          ? [
              companyDocItem('수입업 허가증', DOC_CATEGORY.IMPORT_LICENSE, '/document-control?tab=company'),
              companyDocItem('대리인 계약서 (Authorization Letter)', DOC_CATEGORY.AGENT_CONTRACT, '/document-control?tab=company'),
            ]
          : profile === 'iso13485'
          // ISO 13485는 국내 인허가(MFDS) 서류가 아니라 국제 인증기관 심사 대상이라
          // 제조업허가증·수입업허가증 같은 국내 서류는 이 프로필에서는 제외한다.
          ? []
          : [companyDocItem('제조업허가증', DOC_CATEGORY.MFG_LICENSE, '/document-control?tab=company')]),
        techDocItem('제품 카탈로그', TECH_DOC_CATEGORY.CATALOG),
        techDocItem('사용설명서 (IFU)', TECH_DOC_CATEGORY.IFU),
        techDocItem('제품 라벨 (Label)', TECH_DOC_CATEGORY.LABEL),
        techDocItem('제품 사진', TECH_DOC_CATEGORY.PHOTO),
      ],
    },
    {
      id: 'tech',
      title: '기술문서',
      subtitle: '제품별 설계·성능·안전성·임상 관련 기술 자료',
      items: [
        techDocItem('제품 설명서 (Device Description)', TECH_DOC_CATEGORY.DEVICE_DESC),
        techDocItem('설계 및 개발 자료', TECH_DOC_CATEGORY.DESIGN_DEV),
        techDocItem('위험관리 파일 (Risk Management File)', TECH_DOC_CATEGORY.RISK_FILE),
        techDocItem('성능시험 자료', TECH_DOC_CATEGORY.PERFORMANCE),
        techDocItem('안전성 및 유효성 자료', TECH_DOC_CATEGORY.SAFETY_EFFICACY),
        techDocItemMulti('시험성적서 (전기안전 · EMC 등)', [TECH_DOC_CATEGORY.ELECTRICAL_SAFETY, TECH_DOC_CATEGORY.EMC]),
        techDocItem('소프트웨어 검증 자료', TECH_DOC_CATEGORY.SW_VALIDATION),
        techDocItem('사이버보안 문서', TECH_DOC_CATEGORY.CYBERSECURITY),
        techDocItem('생물학적 안전성 평가 (ISO 10993)', TECH_DOC_CATEGORY.BIOCOMPAT),
        techDocItem('멸균 밸리데이션 자료', TECH_DOC_CATEGORY.STERILIZATION_VAL),
        techDocItem('임상평가 자료 또는 임상시험 자료', TECH_DOC_CATEGORY.CLINICAL_EVAL),
      ],
    },
    {
      id: 'qms',
      title: '품질시스템 관련',
      subtitle: '제조소 인증·품질매뉴얼·조직·절차서 현황',
      items: [
        companyDocItem('제조소 GMP 인증서', DOC_CATEGORY.GMP_CERT, '/document-control?tab=company'),
        companyDocItem('ISO 13485 인증서', DOC_CATEGORY.ISO13485_CERT, '/document-control?tab=company'),
        (() => {
          const m = ctx.qualityManual || {}
          const filled = ['scope', 'qualityPolicy'].filter((k) => !!(m[k] && String(m[k]).trim())).length
            + ((m.procedureRefs?.length || 0) > 0 ? 1 : 0)
          const approved = !!(m.approvedBy && m.effectiveDate)
          return {
            label: '품질매뉴얼',
            status: approved ? 'done' : filled > 0 ? 'partial' : 'missing',
            detail: approved ? `발효 (${m.effectiveDate})` : filled > 0 ? '작성 중 · 승인자·유효일 미설정' : '미작성',
            editHref: '/quality-manual',
          }
        })(),
        {
          label: '조직도',
          status: ctx.orgRoles.length > 0 ? 'done' : 'missing',
          detail: ctx.orgRoles.length > 0 ? `역할·책임 ${ctx.orgRoles.length}건 등록` : '역할·책임 미등록',
          editHref: '/org-responsibility',
        },
        {
          label: '주요 절차서 목록',
          status: ctx.docRegister.filter((d) => d.type === 'SOP').length > 0 ? 'done' : 'missing',
          detail: `${ctx.docRegister.filter((d) => d.type === 'SOP').length}건 등록`,
          editHref: '/document-control',
        },
      ],
    },
    {
      id: 'procedures',
      title: '필수 절차서 (유지관리)',
      subtitle: '수입 후 QMS/GMP 유지관리를 위해 항상 최신 상태여야 하는 절차서',
      items: KGMP_REQUIRED_PROCEDURES.map(procedureItem),
    },
    {
      id: 'records',
      title: '유지해야 하는 기록',
      subtitle: '수입검사부터 이상사례까지 — 유지관리 과정에서 지속적으로 쌓이는 기록',
      items: [
        recordItem('수입검사 기록', ctx.iqcRecords.length, '/purchase-info'),
        recordItem('입고 기록', ctx.receivingShipping.filter((r) => r.type === 'in').length, '/purchase-info?tab=inout'),
        recordItem('출고 기록', ctx.receivingShipping.filter((r) => r.type === 'out').length, '/purchase-info?tab=inout'),
        recordItem('유통 기록', ctx.distributions.length, '/traceability'),
        recordItem('고객 불만 기록', ctx.complaintHubItems.length, '/complaints'),
        recordItem('이상사례 보고 기록', ctx.complaintHubItems.filter((c) => c.mdrRequired).length, '/complaints?tab=mdr'),
        recordItem('CAPA 기록', ctx.capaAll.length, '/quality?tab=capa'),
        recordItem('교육훈련 기록', ctx.trainingSessions.length, '/training?tab=session'),
        recordItem('내부심사 기록', ctx.audits.length, '/audit'),
        recordItem('경영검토 기록', ctx.reviews.length, '/management-review?tab=review'),
      ],
    },
  ]

  // 수입업자의 외국제조소별 GMP 적합인정서·시설개요 상세 등록·관리는 여기서 항목으로 나열하지
  // 않는다 — 전용 화면인 "외국제조소 · 수입 GMP"(/foreign-manufacturers)에서 제조소별
  // 마스터-디테일 UI로 직접 관리한다(이 함수는 그 화면에서도 profile:'importer'로 호출되어
  // 공통 제출 문서·기술문서·품질시스템·절차서·기록 체크리스트만 함께 보여준다).

  return sections
}

/** 섹션 목록에서 완료/전체/퍼센트 요약을 계산한다. */
export function summarizeKgmpSections(sections) {
  const allItems = sections.flatMap((s) => s.items)
  const doneCount = allItems.filter((it) => it.status === 'done').length
  const totalCount = allItems.length
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0
  return { doneCount, totalCount, pct }
}

/** 섹션 구성 + 요약을 한 번에 반환하는 편의 함수(대시보드 요약 카드 등에서 사용). */
export function getKgmpStatus(opts) {
  const sections = buildKgmpSections(opts)
  return { sections, ...summarizeKgmpSections(sections) }
}
