// KGMP 통합 현황 — 수입 의료기기 인증(인허가) 신청 및 유지관리에 필요한
// 공통 제출 문서 / 기술문서 / 품질시스템 관련 / 필수 절차서 / 유지 기록을
// 여러 SSoT 모듈(onboarding/company/product/logistics/mreview/capa/training/audit)에서
// 집계하는 순수 함수 모음. KgmpHub.jsx(상세 화면)와 Dashboard.jsx(요약 카드)가 공유한다.

import { onboarding, productKeyOf } from './onboardingState'
import { companyDocs, DOC_CATEGORY } from './companyState'
import { productDocs, TECH_DOC_CATEGORY } from './productDocsState'
import { logs as logisticsLogs, adverseEvents, LOG_TYPE } from './logisticsState'
import { complaints, reviews } from './managementReviewState'
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

/** 필수 절차서 중 아직 실제 절차 목록에 없는 항목을 자동 보완(멱등). */
export function ensureKgmpProcedures() {
  onboarding.ensureProcedures(KGMP_REQUIRED_NEW_PROCEDURES)
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
    logs: logisticsLogs.getAll(),
    adverseEvents: adverseEvents.getAll(),
    complaints: complaints.getAll(),
    capaAll: capa.loadAll(),
    trainingSessions: trainingSessions.getAll(),
    audits: audits.getAll(),
    reviews: reviews.getAll(),
  }
}

/**
 * KGMP 섹션·항목 목록을 구성한다. 항목마다 status(done/partial/missing)·detail·editHref를 포함한다.
 * 필요 시 누락된 필수 절차서를 자동 보완한 뒤 최신 데이터로 계산한다.
 */
export function buildKgmpSections({ autoHeal = true } = {}) {
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
      editHref: '/products?tab=documents&docSub=tech',
    }
  }

  const procedureItem = (req) => {
    const matched = ctx.procedures.find((p) => req.keywords.some((k) => (p.name || '').includes(k)))
    if (!matched) {
      return { label: req.label + ' 절차서', status: 'missing', detail: '절차 목록에 없음', editHref: '/documents?tab=procedures' }
    }
    const rec = ctx.docState['P-' + matched.id] || {}
    const st = norm(rec)
    const status = st === 'effective' ? 'done' : (st === 'draft' && !rec.content) ? 'missing' : 'partial'
    return {
      label: matched.name,
      status,
      detail: st === 'effective' ? '발효' : st === 'review' ? '검토중' : st === 'pending' ? '승인대기' : st === 'obsolete' ? '폐기' : rec.content ? '작성중' : '미작성',
      editHref: '/documents?tab=procedures&openName=' + encodeURIComponent(matched.name),
    }
  }

  const recordItem = (label, count, editHref, detailSuffix) => ({
    label,
    status: count > 0 ? 'done' : 'missing',
    detail: count > 0 ? `${count}건 기록됨${detailSuffix ? ' · ' + detailSuffix : ''}` : '기록 없음',
    editHref,
  })

  const companyInfoDone = !!(ctx.company.name && ctx.company.bizNumber)

  return [
    {
      id: 'common',
      title: '공통 제출 문서',
      subtitle: '수입 의료기기 인증(인허가) 시 제출하는 회사·제품 기본 자료',
      items: [
        {
          label: '의료기기 제조업체 정보',
          status: companyInfoDone ? 'done' : 'missing',
          detail: companyInfoDone ? `${ctx.company.name} · 사업자번호 ${ctx.company.bizNumber}` : '회사명·사업자번호 미입력',
          editHref: '/onboarding?returnTo=' + encodeURIComponent('/kgmp'),
        },
        companyDocItem('제조소 등록 자료', DOC_CATEGORY.FACILITY_REG, '/company?tab=docs'),
        companyDocItem('사업자등록증', DOC_CATEGORY.BIZ_REG, '/company?tab=docs'),
        companyDocItem('수입업 허가증', DOC_CATEGORY.IMPORT_LICENSE, '/company?tab=docs'),
        companyDocItem('대리인 계약서 (Authorization Letter)', DOC_CATEGORY.AGENT_CONTRACT, '/company?tab=docs'),
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
        techDocItem('전기안전 시험성적서 (IEC 60601 시리즈)', TECH_DOC_CATEGORY.ELECTRICAL_SAFETY),
        techDocItem('EMC 시험성적서 (IEC 60601-1-2)', TECH_DOC_CATEGORY.EMC),
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
        companyDocItem('제조소 GMP 인증서', DOC_CATEGORY.GMP_CERT, '/company?tab=docs'),
        companyDocItem('ISO 13485 인증서', DOC_CATEGORY.ISO13485_CERT, '/company?tab=docs'),
        (() => {
          const eff = ctx.manualChapters.filter((c) => norm(ctx.docState['M-' + c.id] || {}) === 'effective').length
          return {
            label: '품질매뉴얼',
            status: eff > 0 ? 'done' : ctx.manualChapters.length > 0 ? 'partial' : 'missing',
            detail: `${eff} / ${ctx.manualChapters.length}장 발효`,
            editHref: '/documents?tab=manual',
          }
        })(),
        {
          label: '조직도',
          status: ctx.roleDocs.length > 0 ? 'done' : 'missing',
          detail: ctx.roleDocs.length > 0 ? `부서 ${ctx.roleDocs.length}건 직무기술서 등록` : '조직도·직무기술서 미등록',
          editHref: '/company?tab=org',
        },
        {
          label: '주요 절차서 목록',
          status: ctx.procedures.length > 0 ? 'done' : 'missing',
          detail: `${ctx.procedures.length}건 등록`,
          editHref: '/documents?tab=procedures',
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
        recordItem('수입검사 기록', ctx.logs.filter((l) => l.type === LOG_TYPE.IMPORT_INSPECTION).length, '/logistics?tab=logs'),
        recordItem('입고 기록', ctx.logs.filter((l) => l.type === LOG_TYPE.RECEIVING).length, '/logistics?tab=logs'),
        recordItem('출고 기록', ctx.logs.filter((l) => l.type === LOG_TYPE.SHIPPING).length, '/logistics?tab=logs'),
        recordItem('유통 기록', ctx.logs.filter((l) => l.type === LOG_TYPE.DISTRIBUTION).length, '/logistics?tab=logs'),
        recordItem('고객 불만 기록', ctx.complaints.length, '/management-review?tab=complaint'),
        recordItem('이상사례 보고 기록', ctx.adverseEvents.length, '/logistics?tab=ae'),
        recordItem('CAPA 기록', ctx.capaAll.length, '/quality?tab=capa'),
        recordItem('교육훈련 기록', ctx.trainingSessions.length, '/training?tab=session'),
        recordItem('내부심사 기록', ctx.audits.length, '/audit'),
        recordItem('경영검토 기록', ctx.reviews.length, '/management-review?tab=review'),
      ],
    },
  ]
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
