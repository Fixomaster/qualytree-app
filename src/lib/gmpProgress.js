/**
 * Qualytree — GMP/RA 12개 카드 진행률 계산 라이브러리
 *
 * 설계 원칙:
 *  - 순수 함수: localStorage 의존 X, 입력 → 출력만
 *  - 데이터 어댑터 분리: Phase B PostgreSQL 전환 시 readStorage()만 교체
 *  - 조건부 활성화: 회사·제품·인증 속성에 따라 자동 필수/선택/N/A 결정
 *  - 진행률 공식: 필수 × 0.6 + 선택 × 0.3 + 검증 × 0.1 (특허2 청구항 1(c))
 *  - 모든 항목에 규제 매핑(citation) 첨부 — QLP 4대 원칙
 *
 * 사용:
 *   import { computeAllCards, computeCardProgress, loadContext } from '@/lib/gmpProgress';
 *   const ctx = loadContext();           // localStorage → context 객체
 *   const cards = computeAllCards(ctx);  // 12개 카드 진행률
 *
 * Phase B 전환:
 *   loadContext()를 fetch('/api/context') 등으로 교체 → 다른 모든 로직 불변
 */

// ============================================================================
// 1. 상수 — 진행률 공식 가중치 (특허2 청구항 1(c))
// ============================================================================
export const WEIGHTS = {
  required: 0.6,
  optional: 0.3,
  verification: 0.1,
};

// 항목 상태
export const STATUS = {
  REQUIRED: 'required',         // 필수 (법정 의무)
  OPTIONAL: 'optional',         // 선택 (운영 성숙도)
  VERIFICATION: 'verification', // 검증 (시스템 작동 증거)
  NA: 'na',                     // 적용 불가 (활성화 조건 미충족)
};

// 충족 판정
export const FULFILLMENT = {
  MET: 'met',           // 충족
  PARTIAL: 'partial',   // 부분 충족 (가중치 0.5 적용)
  UNMET: 'unmet',       // 미충족
};

// ============================================================================
// 2. 컨텍스트 어댑터 — localStorage 읽기 (Phase B에서 교체할 유일한 함수)
// ============================================================================

/**
 * 회사·제품·인증 속성 + 모든 SSoT 엔티티를 단일 컨텍스트 객체로 로드
 * Phase B에서는 이 함수만 fetch('/api/context')로 교체
 */
// 절차서/문서 이름(한글) → procExists 키 매핑 (문서 발효 시 해당 키 충족 처리) — (가)
const PROC_KEYMAP = [
  [/문서관리/, ['document_control']],
  [/기록관리/, ['record_control']],
  [/경영검토/, ['management_review']],
  [/교육|훈련|자격/, ['awareness_training', 'training_effectiveness']],
  [/환경|위생/, ['personnel_hygiene']],
  [/계약|고객관리/, ['customer_legal_requirements', 'customer_notification']],
  [/고객불만|불만/, ['complaint_handling']],
  [/설계|개발/, ['design_change_control']],
  [/구매|공급/, ['supplier_evaluation', 'supplier_reevaluation', 'supplier_change', 'scar']],
  [/공정관리|제조/, ['manufacturing_change']],
  [/식별|추적/, ['product_identification', 'traceability']],
  [/자재|제품관리|보관|취급/, ['preservation', 'incoming_inspection', 'iqc']],
  [/시설|설비|장비|교정/, ['calibration']],
  [/내부감사|내부심사/, ['internal_audit']],
  [/시험|검사/, ['incoming_inspection', 'iqc', 'ipi', 'lai', 'inspection_status']],
  [/부적합/, ['nonconformance', 'mrb', 'concession', 'rework', 'post_delivery_nc']],
  [/데이터분석/, ['data_analysis']],
  [/시정/, ['corrective_action', 'effectiveness_check']],
  [/예방/, ['preventive_action']],
  [/안전성|시판후|감시|부작용/, ['vigilance_reporting', 'signal_detection', 'pms_data_analysis', 'reportability_decision', 'oos_response', 'oot_response']],
  [/UDI/, ['udi_lifecycle', 'udi_db_sync', 'label_printing', 'labeling']],
]

// 실제 앱 데이터(문서 발효·온보딩·운영기록)를 평가 입력으로 변환 — (가)+(나)
function bridgeFromApp(ob, rawProcedures, rawDecisionLog, rawCcrLog, safe) {
  const docs = safe('qualytree.documents', {}) || {};
  const nameById = {};
  (ob.manual?.chapters || []).forEach(c => { nameById['M-' + c.id] = c.name; });
  (ob.procedures || []).forEach(p => { nameById['P-' + p.id] = p.name; });
  const effectiveNames = Object.entries(docs)
    .filter(([, r]) => r && r.status === 'effective')
    .map(([id]) => nameById[id] || '')
    .filter(Boolean);

  const dproc = {};
  PROC_KEYMAP.forEach(([re, keys]) => {
    if (effectiveNames.some(n => re.test(n))) keys.forEach(k => { dproc[k] = { status: 'effective' }; });
  });
  if (dproc.record_control) dproc.record_control = { status: 'effective', retentionMatrix: true };

  const manEff = (cnum) => (ob.manual?.chapters || []).some(c => String(c.c) === String(cnum) && docs['M-' + c.id]?.status === 'effective');
  if (manEff('0') || manEff('4')) dproc.qmsManual = { status: 'approved', exclusionsJustified: true };
  if (manEff('1')) { dproc.qualityPolicy = { approved: true }; dproc.qualityObjectives = [{ measurable: true }]; }
  if (manEff('2') || (ob.departments || []).length) {
    dproc.orgChart = { complete: true };
    dproc.qmsRoles = { management_representative: { appointed: true }, prrc: { appointed: true } };
  }

  // 운영기록 (나)
  const changeRecords = safe('qualytree.changeRecords', []) || [];
  const ncrs = safe('qualytree.ncrs', []) || [];
  const capas = safe('qualytree.capas', []) || [];
  const tsOf = (r) => r.performedAt || r.at || r.timestamp || r.createdAt || r.date || new Date().toISOString();
  const dccr = (Array.isArray(changeRecords) ? changeRecords : []).map(r => ({ category: r.category || 'qms', timestamp: tsOf(r) }));
  const dlog = [];
  if (effectiveNames.some(n => /경영검토/.test(n))) dlog.push({ type: 'management_review_meeting', timestamp: new Date().toISOString() });
  if (changeRecords.length || ncrs.length || capas.length) dlog.push({ type: 'qms_decision', timestamp: new Date().toISOString() });
  if (Array.isArray(capas) && capas.length) { dproc.capaTracking = { active: true }; if (dproc.corrective_action) dproc.corrective_action = { status: 'effective' }; }

  return {
    procedures: { ...dproc, ...(rawProcedures || {}) },       // 명시 저장값이 우선
    decisionLog: [...dlog, ...(Array.isArray(rawDecisionLog) ? rawDecisionLog : [])],
    ccrLog: [...dccr, ...(Array.isArray(rawCcrLog) ? rawCcrLog : [])],
  };
}

export function loadContext() {
  const safe = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };

  const onboarding = safe('onboarding', {});
  const ob = safe('qualytree.onboarding', {});           // 실제 온보딩 저장소
  const obCerts = ob.certs || {};                         // { kgmp, iso13485, ce, fda, mdsap } 불리언
  const members = Array.isArray(ob.members) ? ob.members : [];
  const products = (Array.isArray(ob.products) && ob.products.length) ? ob.products : safe('products', []);
  const certs = safe('certifications', []);               // 레거시 호환
  const certOn = (k, tag) => obCerts[k] === true || certs.includes(tag);
  const procedures = safe('procedures', {});
  const decisionLog = safe('decisionLog', []);
  const ccrLog = safe('ccrLog', []);
  const userToggles = safe('userToggles', {});
  const _bridge = bridgeFromApp(ob, procedures, decisionLog, ccrLog, safe);

  return {
    // 회사 속성 (①QMS C 활성화 트리거)
    company: {
      employeeCount: onboarding.employeeCount ?? members.length ?? 0,
      sites: onboarding.sites ?? [],
      multiSite: (onboarding.sites?.length ?? 0) > 1,
      usesOutsourcedProcess: onboarding.outsourcing?.uses ?? null, // null | true | false
      usesConsultants: onboarding.consultants?.uses ?? false,
      usesCMO: onboarding.cmo?.uses ?? false,
      compensatingControls: onboarding.compensatingControls ?? [],
    },

    // 인증 선택 (대부분 C 활성화 트리거)
    certifications: {
      iso13485: certOn('iso13485', 'ISO13485'),
      fdaQmsr: certOn('fda', 'FDA_QMSR'),
      kgmp: certOn('kgmp', 'KGMP'),
      euMdr: certOn('ce', 'EU_MDR'),
      pmda: certOn('pmda', 'PMDA'),
      nmpa: certOn('nmpa', 'NMPA'),
      mdsap: certOn('mdsap', 'MDSAP'),
    },

    // 제품 속성 집계 (조건부 트리거)
    products: {
      list: products,
      hasImplant: products.some(p => p.category === 'implant' || p.implant === true || p.contact === 'implantable' || /임플란트/.test(p.cat2 || '')),
      hasSterile: products.some(p => p.sterile === true),
      hasCleanRoom: products.some(p => p.cleanRoom === true || p.sterile === true),
      hasSoftware: products.some(p => p.hasSoftware === true || (p.software && p.software !== 'none') || /(소프트웨어|SaMD|SW)/i.test(p.cat1 || '')),
      hasAI: products.some(p => p.aiMl === true || /AI/i.test((p.cat1 || '') + (p.cat2 || ''))),
      hasNetworking: products.some(p => p.networkConnected === true),
      hasInstallation: products.some(p => p.requiresInstallation === true),
      hasServicing: products.some(p => p.requiresServicing === true),
      hasPatientContact: products.some(p => p.patientContact === true || (p.contact && p.contact !== 'none')),
      hasUserInterface: products.some(p => p.hasUserInterface !== false), // 기본값 true
      hasClassIII: products.some(p => p.fdaClass === 'III' || p.grade === '4'),
      hasClassIIa_plus: products.some(p => ['IIa', 'IIb', 'III'].includes(p.mdrClass) || ['3', '4'].includes(String(p.grade))),
      hasFDAClassI_DesignExempt: products.some(p => p.fdaClass === 'I' && p.designControlExempt === true),
      anyProductRequiresClinicalTrial: products.some(p => p.requiresClinicalTrial === true),
      koreaPostMarketTrackingMandatory: products.some(p => p.koreaPostMarketTracking === true || p.track === 'Y'),
      hasReceivingInspection: true, // 거의 모든 회사 해당
    },

    // 제조 속성
    manufacturing: {
      ownSterilization: onboarding.sterilization === 'in_house',
      outsourcedSterilization: onboarding.sterilization === 'outsourced',
      automationUsed: onboarding.automation ?? false,
      hasSpecialProcesses: (onboarding.specialProcesses?.length ?? 0) > 0,
      hasCustomTooling: onboarding.customTooling ?? false,
      hasOwnTestLab: onboarding.testLab === 'in_house',
      usesExternalTestLab: onboarding.testLab === 'external' || onboarding.testLab === 'both',
      measurementSoftware: onboarding.measurementSoftware ?? false,
      spcApplicable: onboarding.productionType === 'volume',
    },

    // 인력
    personnel: {
      hasForeignWorkers: onboarding.foreignWorkers ?? false,
      criticalSuppliers: onboarding.criticalSuppliers ?? [],
      singleSourceCritical: onboarding.singleSourceCritical ?? false,
    },

    // SSoT 엔티티 — 문서 발효·운영기록 브리지 적용 (가)+(나)
    procedures: _bridge.procedures,
    decisionLog: _bridge.decisionLog,
    ccrLog: _bridge.ccrLog,

    // 사용자 토글 (옵션 검증 항목)
    toggles: userToggles,
  };
}

// ============================================================================
// 3. 헬퍼 — 조건부·검증 평가 유틸
// ============================================================================

/** 결정일지에서 특정 이벤트가 N일 이내에 발생했는지 */
function hasRecentEvent(decisionLog, eventType, withinDays) {
  const cutoff = Date.now() - withinDays * 24 * 60 * 60 * 1000;
  return decisionLog.some(e => e.type === eventType && new Date(e.timestamp).getTime() >= cutoff);
}

/** 절차서가 존재하고 발효 상태인지 */
function procExists(procedures, key) {
  return procedures[key]?.status === 'effective';
}

/** 엔티티 배열이 ≥ N건인지 */
function hasAtLeast(arr, n) {
  return Array.isArray(arr) && arr.length >= n;
}

// ============================================================================
// 4. 항목 정의 — 12개 카드 × 약 280개 항목
// ============================================================================
// 각 항목 구조:
//   {
//     id, label, status: 'required'|'optional'|'verification',
//     citations: [{ standard, clause }, ...],
//     condition?: (ctx) => boolean | 'required' | 'optional' | 'na',  // 조건부 항목만
//     evaluate: (ctx) => 'met' | 'partial' | 'unmet',
//     togglable?: boolean,
//   }

// ----- ①QMS 카드 -----
const CARD_01_QMS = {
  id: 'qms',
  index: 1,
  row: 1,
  title: 'QMS',
  level: 3, // 필요 권한 Level (3=Manager/RA)
  items: [
    // 필수 F1~F8
    { id: 'F1', label: '품질매뉴얼 (면제사유 §1.2 명시 포함)', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§4.2.2' }, { standard: 'KGMP', clause: '제5조' }],
      evaluate: ctx => ctx.procedures.qmsManual?.status === 'approved' && ctx.procedures.qmsManual?.exclusionsJustified ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F2', label: '품질방침 공표', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§5.3' }, { standard: 'FDA QMSR', clause: '§820.20(a)' }],
      evaluate: ctx => ctx.procedures.qualityPolicy?.approved ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F3', label: '품질목표 (측정 기준)', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§5.4.1' }],
      evaluate: ctx => hasAtLeast(ctx.procedures.qualityObjectives, 1) ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F4', label: '조직도·R&R 매트릭스', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§5.5.1' }, { standard: 'FDA QMSR', clause: '§820.20(b)(1)' }],
      evaluate: ctx => ctx.procedures.orgChart?.complete ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F5', label: '품질경영대리인(QMR) 임명', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§5.5.2' }, { standard: 'FDA QMSR', clause: '§820.20(b)(3)' }],
      evaluate: ctx => ctx.procedures.qmsRoles?.management_representative?.appointed ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F6', label: '문서관리 절차', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§4.2.4' }, { standard: 'FDA QMSR', clause: '§820.40' }],
      evaluate: ctx => procExists(ctx.procedures, 'document_control') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F7', label: '기록관리 절차 (부록 E 보관기간 적용)', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§4.2.5' }, { standard: 'FDA QMSR', clause: '§820.180' }],
      evaluate: ctx => procExists(ctx.procedures, 'record_control') && ctx.procedures.record_control?.retentionMatrix ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F8', label: '경영검토 절차 수립', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§5.6' }, { standard: 'FDA QMSR', clause: '§820.20(c)' }],
      evaluate: ctx => procExists(ctx.procedures, 'management_review') ? FULFILLMENT.MET : FULFILLMENT.UNMET },

    // 조건부 C1~C4
    { id: 'C1', label: 'PRRC 임명 (EU MDR)', citations: [{ standard: 'EU MDR', clause: 'Article 15' }],
      condition: ctx => ctx.certifications.euMdr ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.qmsRoles?.prrc?.appointed ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C2', label: '외주 프로세스 식별 (사용·미사용 양자택일 선언)', citations: [{ standard: 'ISO 13485', clause: '§4.1.5' }],
      condition: () => STATUS.REQUIRED, // 항상 필수
      evaluate: ctx => {
        const decided = ctx.company.usesOutsourcedProcess !== null;
        if (!decided) return FULFILLMENT.UNMET;
        if (ctx.company.usesOutsourcedProcess === false) return FULFILLMENT.MET; // 미사용 선언만으로 충족
        return ctx.procedures.outsourcedProcesses?.controlled ? FULFILLMENT.MET : FULFILLMENT.PARTIAL;
      } },
    { id: 'C3', label: '작업환경·오염관리 기준', citations: [{ standard: 'ISO 13485', clause: '§6.4' }, { standard: 'FDA QMSR', clause: '§820.70(c)' }],
      condition: ctx => (ctx.products.hasCleanRoom || ctx.products.hasSterile || ctx.products.hasImplant) ? STATUS.REQUIRED : STATUS.OPTIONAL,
      evaluate: ctx => ctx.procedures.workEnvironment?.criteriaDefined ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C4', label: '의료기기 파일 인덱스', citations: [{ standard: 'ISO 13485', clause: '§4.2.3' }, { standard: 'KGMP', clause: '제13조' }],
      condition: ctx => (ctx.certifications.iso13485 || ctx.certifications.kgmp) ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.medicalDeviceFile?.indexed ? FULFILLMENT.MET : FULFILLMENT.UNMET },

    // 선택 O1~O5
    { id: 'O1', label: '자원 제공 책임 명시', status: STATUS.OPTIONAL,
      citations: [{ standard: 'ISO 13485', clause: '§6.1' }],
      evaluate: ctx => ctx.procedures.resourceProvisionPlan ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'O2', label: 'QMS 기획 — 변경 시 무결성 절차', status: STATUS.OPTIONAL,
      citations: [{ standard: 'ISO 13485', clause: '§5.4.2' }],
      evaluate: ctx => procExists(ctx.procedures, 'qms_change_integrity') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'O3', label: '인프라 관리 계획', status: STATUS.OPTIONAL,
      citations: [{ standard: 'ISO 13485', clause: '§6.3' }],
      evaluate: ctx => ctx.procedures.infrastructurePlan ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'O4', label: '내부의사소통 체계', status: STATUS.OPTIONAL,
      citations: [{ standard: 'ISO 13485', clause: '§5.5.3' }],
      evaluate: ctx => ctx.procedures.commPlan ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'O5', label: '고객·법규 요구사항 식별 절차', status: STATUS.OPTIONAL,
      citations: [{ standard: 'ISO 13485', clause: '§5.2' }],
      evaluate: ctx => procExists(ctx.procedures, 'customer_legal_requirements') ? FULFILLMENT.MET : FULFILLMENT.UNMET },

    // 검증 V1~V3 + 옵션 V4
    { id: 'V1', label: '경영검토 최근 12개월 내 실시', status: STATUS.VERIFICATION,
      citations: [{ standard: 'ISO 13485', clause: '§5.6.1' }, { standard: 'FDA QMSR', clause: '§820.20(c)' }],
      evaluate: ctx => hasRecentEvent(ctx.decisionLog, 'management_review_meeting', 365) ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'V2', label: '품질목표 분기별 측정값 기록', status: STATUS.VERIFICATION,
      citations: [{ standard: 'ISO 13485', clause: '§5.4.1' }],
      evaluate: ctx => {
        const objectives = ctx.procedures.qualityObjectives ?? [];
        if (objectives.length === 0) return FULFILLMENT.UNMET;
        const allHaveRecent = objectives.every(o => o.measurements?.some(m => Date.now() - new Date(m.date).getTime() < 90 * 24 * 60 * 60 * 1000));
        return allHaveRecent ? FULFILLMENT.MET : FULFILLMENT.UNMET;
      } },
    { id: 'V3', label: 'QMS 관련 CCR 최근 12개월 ≥ 1건', status: STATUS.VERIFICATION,
      citations: [{ standard: 'ISO 13485', clause: '§4.2.4' }, { standard: 'FDA QMSR', clause: '§820.40' }],
      evaluate: ctx => ctx.ccrLog.some(c => c.category === 'qms' && Date.now() - new Date(c.timestamp).getTime() < 365 * 24 * 60 * 60 * 1000) ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'V4-opt', label: '결정일지 최근 30일 QMS 핵심 결정 ≥ 1건', status: STATUS.VERIFICATION,
      citations: [{ standard: 'Project Instructions', clause: '§8.3.1' }],
      togglable: true,
      evaluate: ctx => hasRecentEvent(ctx.decisionLog, 'qms_decision', 30) ? FULFILLMENT.MET : FULFILLMENT.UNMET },
  ],
};

// ----- ②설계 카드 -----
const CARD_02_DESIGN = {
  id: 'design',
  index: 2,
  row: 1,
  title: '설계관리',
  level: 3,
  // 카드 전체 N/A 조건: FDA 단일 + Class I 면제
  cardLevelCondition: ctx => {
    const onlyFDA = ctx.certifications.fdaQmsr && !ctx.certifications.iso13485 && !ctx.certifications.kgmp && !ctx.certifications.euMdr;
    if (onlyFDA && ctx.products.hasFDAClassI_DesignExempt && ctx.products.list.every(p => p.fdaClass === 'I' && p.designControlExempt)) {
      return 'na';
    }
    return 'active';
  },
  items: [
    { id: 'F1', label: '설계·개발 계획서 (DDP)', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§7.3.2' }, { standard: 'FDA QMSR', clause: '§820.30(b)' }],
      evaluate: ctx => ctx.procedures.designDevPlan?.status === 'approved' ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F2', label: '설계입력 (5개 카테고리 이상)', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§7.3.3' }, { standard: 'EU MDR', clause: 'Annex I GSPR' }],
      evaluate: ctx => hasAtLeast(ctx.procedures.designInputs, 5) ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F3', label: '설계출력 (입력 대응 추적성)', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§7.3.4' }, { standard: 'FDA QMSR', clause: '§820.30(d)' }],
      evaluate: ctx => ctx.procedures.designOutputs?.traceabilityComplete ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F4', label: '설계검토 (독립 검토자 포함)', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§7.3.5' }],
      evaluate: ctx => hasAtLeast(ctx.procedures.designReviews, 1) ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F5', label: '설계검증 (V&V Verification)', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§7.3.6' }, { standard: 'FDA QMSR', clause: '§820.30(f)' }],
      evaluate: ctx => ctx.procedures.designVerification?.coverage === 1 ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F6', label: '설계밸리데이션 (V&V Validation)', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§7.3.7' }, { standard: 'EU MDR', clause: 'Annex II §6.1' }],
      evaluate: ctx => ctx.procedures.designValidation?.complete ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F7', label: '설계 이전 (Design Transfer)', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§7.3.8' }],
      evaluate: ctx => ctx.procedures.designTransfer?.complete ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F8', label: '설계 변경 통제 (ECN/CCR)', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§7.3.9' }, { standard: 'FDA QMSR', clause: '§820.30(i)' }],
      evaluate: ctx => procExists(ctx.procedures, 'design_change_control') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F9', label: 'DHF 인덱스 (양방향 연결망)', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§7.3.10' }, { standard: 'FDA QMSR', clause: '§820.30(j)' }],
      evaluate: ctx => ctx.procedures.dhf?.indexed ? FULFILLMENT.MET : FULFILLMENT.UNMET },

    // 조건부 C1~C7
    { id: 'C1', label: 'SW 수명주기 (IEC 62304)', citations: [{ standard: 'IEC 62304', clause: '전체' }],
      condition: ctx => ctx.products.hasSoftware ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.swLifecycle?.compliant ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C2', label: '사용적합성 평가 (IEC 62366-1)', citations: [{ standard: 'IEC 62366-1', clause: '전체' }, { standard: 'EU MDR', clause: 'Annex I §5' }],
      condition: ctx => ctx.products.hasUserInterface ? STATUS.REQUIRED : STATUS.OPTIONAL,
      evaluate: ctx => ctx.procedures.usability?.complete ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C3', label: '생체적합성 평가 (ISO 10993)', citations: [{ standard: 'ISO 10993-1', clause: '전체' }, { standard: 'EU MDR', clause: 'Annex I §10' }],
      condition: ctx => ctx.products.hasPatientContact ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.biocompatibility?.complete ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C4', label: '임상평가 입력 연결 (⑫와 양방향)', citations: [{ standard: 'EU MDR', clause: 'Article 61' }],
      condition: ctx => (ctx.certifications.euMdr || ctx.products.anyProductRequiresClinicalTrial) ? STATUS.REQUIRED : STATUS.OPTIONAL,
      evaluate: ctx => ctx.procedures.clinicalEvaluationLink?.linked ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C5', label: '사이버보안 위험관리 (IEC 81001-5-1)', citations: [{ standard: 'IEC 81001-5-1', clause: '전체' }],
      condition: ctx => ctx.products.hasNetworking ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.cybersecurity?.complete ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C6', label: 'AI/ML PCCP 사전등록', citations: [{ standard: 'FDA PCCP Guidance', clause: '2024' }, { standard: 'EU AI Act', clause: 'Article 15' }],
      condition: ctx => ctx.products.hasAI ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.pccp?.registered ? FULFILLMENT.MET : FULFILLMENT.UNMET },

    // 선택 O1~O4
    { id: 'O1', label: '설계 단계별 마일스톤·게이트 기준', status: STATUS.OPTIONAL,
      citations: [{ standard: 'ISO 13485', clause: '§7.3.2' }],
      evaluate: ctx => ctx.procedures.designStageGates ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'O2', label: '외부 설계 위탁 통제', status: STATUS.OPTIONAL,
      citations: [{ standard: 'ISO 13485', clause: '§7.4' }],
      evaluate: ctx => ctx.procedures.designOutsourcingContracts ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'O3', label: '표준화 부품·디자인 라이브러리', status: STATUS.OPTIONAL,
      citations: [{ standard: 'ISO 13485', clause: '§7.3.3' }],
      evaluate: ctx => ctx.procedures.designLibrary ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'O4', label: '설계 보조 도구 검증 (CAD·시뮬레이션 SW)', status: STATUS.OPTIONAL,
      citations: [{ standard: 'ISO 13485', clause: '§4.1.6' }],
      evaluate: ctx => ctx.procedures.designToolValidation ? FULFILLMENT.MET : FULFILLMENT.UNMET },

    // 검증 V1~V3
    { id: 'V1', label: '활성 프로젝트 단계별 설계검토 ≥ 1건', status: STATUS.VERIFICATION,
      citations: [{ standard: 'ISO 13485', clause: '§7.3.5' }],
      evaluate: ctx => hasRecentEvent(ctx.decisionLog, 'design_review', 365) ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'V2', label: '설계입력↔출력 추적성 매트릭스 완전성', status: STATUS.VERIFICATION,
      citations: [{ standard: 'Patent 2', clause: 'Claim 1(b)' }],
      evaluate: ctx => ctx.procedures.designOutputs?.traceabilityComplete && ctx.procedures.designOutputs?.gapCount === 0 ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'V3', label: 'DHF 최근 12개월 내 갱신', status: STATUS.VERIFICATION,
      citations: [{ standard: 'ISO 13485', clause: '§7.3.10' }],
      evaluate: ctx => ctx.ccrLog.some(c => c.category === 'design' && Date.now() - new Date(c.timestamp).getTime() < 365 * 24 * 60 * 60 * 1000) ? FULFILLMENT.MET : FULFILLMENT.UNMET },
  ],
};

// ----- ③공급자관리 카드 -----
const CARD_03_SUPPLIER = {
  id: 'supplier',
  index: 3,
  row: 1,
  title: '공급자관리',
  level: 3,
  items: [
    { id: 'F1', label: '공급자·계약자·컨설턴트 평가·선정 절차', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§7.4.1' }, { standard: 'FDA QMSR', clause: '§820.50(a)(1)' }],
      evaluate: ctx => procExists(ctx.procedures, 'supplier_evaluation') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F2', label: '공급자 위험 등급 분류 (Critical/Major/Minor)', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§7.4.1(d)' }],
      evaluate: ctx => (ctx.procedures.suppliers ?? []).every(s => s.riskClass) ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F3', label: '승인 공급자 목록 (ASL) 유지', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§7.4.1' }, { standard: 'KGMP', clause: '제22조' }],
      evaluate: ctx => hasAtLeast(ctx.procedures.approvedSupplierList, 0) ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F4', label: '구매 정보 정의', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§7.4.2' }, { standard: 'FDA QMSR', clause: '§820.50(b)' }],
      evaluate: ctx => ctx.procedures.purchasingInfo?.template ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F5', label: '입고 검증 절차 (IQC)', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§7.4.3' }, { standard: 'FDA QMSR', clause: '§820.80(b)' }],
      evaluate: ctx => procExists(ctx.procedures, 'incoming_inspection') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F6', label: '공급자 재평가 주기·기준', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§7.4.1' }],
      evaluate: ctx => procExists(ctx.procedures, 'supplier_reevaluation') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F7', label: '공급자 변경 통제 (강화 검사 자동)', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§7.4.1' }],
      evaluate: ctx => procExists(ctx.procedures, 'supplier_change') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F8', label: 'SCAR 절차 (⑥과 양방향)', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§8.5.2 + §7.4' }],
      evaluate: ctx => procExists(ctx.procedures, 'scar') ? FULFILLMENT.MET : FULFILLMENT.UNMET },

    { id: 'C1', label: 'Critical 공급자 현장 심사 (3년 1회)', citations: [{ standard: 'EU MDR', clause: 'Annex IX §2.2.4' }],
      condition: ctx => ctx.personnel.criticalSuppliers.length > 0 ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.personnel.criticalSuppliers.every(s => s.lastOnSiteAudit && Date.now() - new Date(s.lastOnSiteAudit).getTime() < 3 * 365 * 24 * 60 * 60 * 1000) ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C2', label: '멸균 위탁 공급자 특별 통제', citations: [{ standard: 'ISO 11135/11137/17665', clause: '전체' }, { standard: 'FDA QMSR', clause: '§820.75' }],
      condition: ctx => ctx.manufacturing.outsourcedSterilization ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.sterilizationOutsourcing?.controlled ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C3', label: '위탁제조(CMO) 통제', citations: [{ standard: 'KGMP', clause: '제6조' }, { standard: 'ISO 13485', clause: '§4.1.5' }],
      condition: ctx => ctx.company.usesCMO ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.cmoControl?.contracted ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C4', label: '단일 공급자 위험 평가·완화 계획', citations: [{ standard: 'ISO 13485', clause: '§7.4.1(d)' }],
      condition: ctx => ctx.personnel.singleSourceCritical ? STATUS.REQUIRED : STATUS.OPTIONAL,
      evaluate: ctx => ctx.procedures.singleSourceRiskPlan ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C5', label: '컨설턴트·외부 자문 통제', citations: [{ standard: 'FDA QMSR', clause: '§820.50' }],
      condition: ctx => ctx.company.usesConsultants ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.consultantControl?.contracted ? FULFILLMENT.MET : FULFILLMENT.UNMET },

    { id: 'O1', label: 'SQR 자동 산출', status: STATUS.OPTIONAL,
      citations: [{ standard: 'ISO 13485', clause: '§8.4' }],
      evaluate: ctx => ctx.procedures.sqrAutomation ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'O2', label: '공급자 자가평가서 (SAQ) 수집', status: STATUS.OPTIONAL,
      citations: [{ standard: 'ISO 13485', clause: '§7.4.1' }],
      evaluate: ctx => ctx.procedures.supplierSAQ ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'O3', label: '공급자 다변화 전략', status: STATUS.OPTIONAL,
      citations: [{ standard: 'ISO 13485', clause: '§6.1' }],
      evaluate: ctx => ctx.procedures.supplierDiversification ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'O4', label: '공급자 포털 (양방향 교환)', status: STATUS.OPTIONAL,
      citations: [{ standard: 'Industry Best Practice', clause: '—' }],
      evaluate: ctx => ctx.procedures.supplierPortal ? FULFILLMENT.MET : FULFILLMENT.UNMET },

    { id: 'V1', label: 'Critical 공급자 재평가 최근 12개월', status: STATUS.VERIFICATION,
      citations: [{ standard: 'EU MDR', clause: 'Annex IX §2.2.4' }],
      evaluate: ctx => ctx.personnel.criticalSuppliers.length === 0 ? FULFILLMENT.MET : ctx.personnel.criticalSuppliers.every(s => s.lastReevaluation && Date.now() - new Date(s.lastReevaluation).getTime() < 365 * 24 * 60 * 60 * 1000) ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'V2', label: 'IQC·납기 분기별 기록', status: STATUS.VERIFICATION,
      citations: [{ standard: 'ISO 13485', clause: '§8.4' }],
      evaluate: ctx => hasRecentEvent(ctx.decisionLog, 'iqc_record', 90) ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'V3', label: 'SCAR 응답 마감 추적', status: STATUS.VERIFICATION,
      citations: [{ standard: 'ISO 13485', clause: '§7.4 + §8.5.2' }],
      evaluate: ctx => ctx.procedures.scarTracking?.overdueCount === 0 ? FULFILLMENT.MET : FULFILLMENT.UNMET },
  ],
};

// ----- ④제조 카드 -----
const CARD_04_MANUFACTURING = {
  id: 'manufacturing',
  index: 4,
  row: 1,
  title: '제조',
  level: 3,
  items: [
    { id: 'F1', label: '생산·서비스 제공 계획', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§7.5.1' }, { standard: 'FDA QMSR', clause: '§820.70(a)' }],
      evaluate: ctx => ctx.procedures.productionPlan ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F2', label: '제품별 SOP (제품×공정 매트릭스 100% 커버)', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§7.5.1' }],
      evaluate: ctx => ctx.procedures.sopMatrix?.coverage === 1 ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F3', label: '작업환경 통제 기준·모니터링', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§6.4.1' }, { standard: 'FDA QMSR', clause: '§820.70(c)' }],
      evaluate: ctx => ctx.procedures.workEnvControls?.defined ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F4', label: '제품 식별 절차', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§7.5.8' }, { standard: 'FDA QMSR', clause: '§820.60' }],
      evaluate: ctx => procExists(ctx.procedures, 'product_identification') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F5', label: '추적성 절차', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§7.5.9' }, { standard: 'EU MDR', clause: 'Article 25' }],
      evaluate: ctx => procExists(ctx.procedures, 'traceability') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F6', label: '제품 보존·취급·보관 절차', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§7.5.11' }],
      evaluate: ctx => procExists(ctx.procedures, 'preservation') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F7', label: '라벨링·포장 통제 절차', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§7.5.5' }, { standard: 'EU MDR', clause: 'Annex I §23' }],
      evaluate: ctx => procExists(ctx.procedures, 'labeling') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F8', label: '제조공정 변경 통제 (CCR + 재밸리데이션)', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§7.5.6' }, { standard: 'FDA QMSR', clause: '§820.70(b)' }],
      evaluate: ctx => procExists(ctx.procedures, 'manufacturing_change') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F9', label: '작업자 위생·작업복 절차', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§6.4' }, { standard: 'FDA QMSR', clause: '§820.70(d)' }],
      evaluate: ctx => procExists(ctx.procedures, 'personnel_hygiene') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F10', label: '제조 기록 (eBR/DHR) 구조 정의', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§4.2.5' }, { standard: 'FDA QMSR', clause: '§820.184' }],
      evaluate: ctx => ctx.procedures.dhrTemplate ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F11', label: '특수공정 식별', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§7.5.6' }],
      evaluate: ctx => Array.isArray(ctx.procedures.specialProcesses) ? FULFILLMENT.MET : FULFILLMENT.UNMET },

    { id: 'C1', label: '멸균 공정 밸리데이션 (자체 멸균)', citations: [{ standard: 'ISO 11135/11137/17665', clause: '전체' }],
      condition: ctx => ctx.manufacturing.ownSterilization ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.sterilizationValidation?.iqOqPq ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C2', label: '청정실 환경모니터링', citations: [{ standard: 'ISO 14644', clause: '전체' }],
      condition: ctx => ctx.products.hasCleanRoom ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.cleanRoomMonitoring?.active ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C3', label: '특수공정 밸리데이션 (용접·접착·열처리 등)', citations: [{ standard: 'ISO 13485', clause: '§7.5.6' }],
      condition: ctx => ctx.manufacturing.hasSpecialProcesses ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => (ctx.procedures.specialProcesses ?? []).every(p => p.validated) ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C4', label: '자동화 공정 SW 검증 (CSV)', citations: [{ standard: 'FDA QMSR', clause: '§820.70(i)' }],
      condition: ctx => ctx.manufacturing.automationUsed ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.automationCSV?.validated ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C5', label: 'Class III 자동화 정보 기록', citations: [{ standard: 'FDA QMSR', clause: '§820.70(h)' }],
      condition: ctx => (ctx.certifications.fdaQmsr && ctx.products.hasClassIII && ctx.manufacturing.automationUsed) ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.classIIIAutomationRecords ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C6', label: '설치 절차·검증 기준', citations: [{ standard: 'ISO 13485', clause: '§7.5.3' }],
      condition: ctx => ctx.products.hasInstallation ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => procExists(ctx.procedures, 'installation') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C7', label: '서비스 절차·서비스 보고서', citations: [{ standard: 'ISO 13485', clause: '§7.5.4' }],
      condition: ctx => ctx.products.hasServicing ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => procExists(ctx.procedures, 'servicing') ? FULFILLMENT.MET : FULFILLMENT.UNMET },

    { id: 'O1', label: '고객 자산 통제', status: STATUS.OPTIONAL,
      citations: [{ standard: 'ISO 13485', clause: '§7.5.10' }],
      evaluate: ctx => ctx.procedures.customerProperty ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'O2', label: '작업장 5S·시각관리', status: STATUS.OPTIONAL,
      citations: [{ standard: 'Industry Best Practice', clause: '—' }],
      evaluate: ctx => ctx.procedures.fiveS ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'O3', label: '생산 능력 계획', status: STATUS.OPTIONAL,
      citations: [{ standard: 'ISO 13485', clause: '§6.1' }],
      evaluate: ctx => ctx.procedures.capacityPlanning ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'O4', label: '재공품(WIP) 관리', status: STATUS.OPTIONAL,
      citations: [{ standard: 'ISO 13485', clause: '§7.5.11' }],
      evaluate: ctx => ctx.procedures.wipManagement ? FULFILLMENT.MET : FULFILLMENT.UNMET },

    { id: 'V1', label: '활성 제품 100% SOP + 12개월 내 검토', status: STATUS.VERIFICATION,
      citations: [{ standard: 'ISO 13485', clause: '§7.5.1' }],
      evaluate: ctx => ctx.procedures.sopMatrix?.coverage === 1 && ctx.procedures.sopMatrix?.recentReviewCount > 0 ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'V2', label: '활성 특수공정 100% 유효 밸리데이션 상태', status: STATUS.VERIFICATION,
      citations: [{ standard: 'ISO 13485', clause: '§7.5.6' }],
      evaluate: ctx => (ctx.procedures.specialProcesses ?? []).every(p => p.validated && (!p.expiryDate || new Date(p.expiryDate).getTime() > Date.now())) ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'V3', label: '환경모니터링 최근 주기 내 기록', status: STATUS.VERIFICATION,
      citations: [{ standard: 'ISO 13485', clause: '§6.4' }],
      evaluate: ctx => !ctx.products.hasCleanRoom ? FULFILLMENT.MET : hasRecentEvent(ctx.decisionLog, 'env_monitoring', 7) ? FULFILLMENT.MET : FULFILLMENT.UNMET },
  ],
};

// ----- ⑤QC 카드 -----
const CARD_05_QC = {
  id: 'qc',
  index: 5,
  row: 1,
  title: 'QC',
  level: 3,
  items: [
    { id: 'F1', label: '측정장비 마스터 등록부', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§7.6' }, { standard: 'FDA QMSR', clause: '§820.72(a)' }],
      evaluate: ctx => hasAtLeast(ctx.procedures.measurementEquipment, 1) ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F2', label: '교정 절차·주기·만료 차단', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§7.6' }, { standard: 'FDA QMSR', clause: '§820.72(b)' }],
      evaluate: ctx => procExists(ctx.procedures, 'calibration') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F3', label: '교정 성적서 디지털 보관', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§7.6' }],
      evaluate: ctx => ctx.procedures.calibrationCertificates ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F4', label: 'OOT 영향 분석 절차 (특허 P11 위험구간 추적)', status: STATUS.REQUIRED,
      citations: [{ standard: 'FDA QMSR', clause: '§820.72(b)(3)' }],
      evaluate: ctx => procExists(ctx.procedures, 'oot_response') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F5', label: '입고 검사 (IQC) 절차·기준', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§7.4.3' }, { standard: 'FDA QMSR', clause: '§820.80(b)' }],
      evaluate: ctx => procExists(ctx.procedures, 'iqc') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F6', label: '공정 검사 (IPI/FAI) 절차·기준 (Manager/Operator 분리)', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§8.2.6' }],
      evaluate: ctx => procExists(ctx.procedures, 'ipi') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F7', label: '출하 검사 (LAI) + 출하 승인 권한 분리', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§8.2.6' }],
      evaluate: ctx => procExists(ctx.procedures, 'lai') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F8', label: '검사 상태 식별', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§7.5.8' }, { standard: 'FDA QMSR', clause: '§820.86' }],
      evaluate: ctx => procExists(ctx.procedures, 'inspection_status') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F9', label: '검사 기록 양식·필수 정보', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§4.2.5' }],
      evaluate: ctx => ctx.procedures.inspectionRecordTemplate ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F10', label: '샘플링 계획 정당화 (통계 표준 인용)', status: STATUS.REQUIRED,
      citations: [{ standard: 'FDA QMSR', clause: '§820.250(b)' }],
      evaluate: ctx => hasAtLeast(ctx.procedures.samplingPlans, 1) && ctx.procedures.samplingPlans.every(p => p.statisticalBasis) ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F11', label: 'OOS 대응 절차 (특허 P11)', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§8.3' }],
      evaluate: ctx => procExists(ctx.procedures, 'oos_response') ? FULFILLMENT.MET : FULFILLMENT.UNMET },

    { id: 'C1', label: 'SPC (통계적 공정관리)', citations: [{ standard: 'FDA QMSR', clause: '§820.250' }],
      condition: ctx => ctx.manufacturing.spcApplicable ? STATUS.REQUIRED : STATUS.OPTIONAL,
      evaluate: ctx => ctx.procedures.spcImplemented ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C2', label: 'MSA (Gage R&R)', citations: [{ standard: 'AIAG MSA 4th', clause: '전체' }],
      condition: ctx => ctx.manufacturing.spcApplicable ? STATUS.REQUIRED : STATUS.OPTIONAL,
      evaluate: ctx => ctx.procedures.msa?.complete ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C3', label: '외부 시험 위탁 (시험소 등록)', citations: [{ standard: 'ISO 13485', clause: '§7.4 + §7.6' }],
      condition: ctx => ctx.manufacturing.usesExternalTestLab ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.externalTestLab?.registered ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C4', label: '도구·치공구·게이지 관리', citations: [{ standard: 'ISO 13485', clause: '§7.6' }],
      condition: ctx => ctx.manufacturing.hasCustomTooling ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.toolingControl ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C5', label: '시험실 환경 통제', citations: [{ standard: 'ISO/IEC 17025', clause: '전체' }],
      condition: ctx => ctx.manufacturing.hasOwnTestLab ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.testLabEnvControl ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C6', label: '측정 SW 검증', citations: [{ standard: 'FDA QMSR', clause: '§820.70(i)' }],
      condition: ctx => ctx.manufacturing.measurementSoftware ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.measurementSWValidation ? FULFILLMENT.MET : FULFILLMENT.UNMET },

    { id: 'O1', label: '검사원 자격 인증 절차', status: STATUS.OPTIONAL,
      citations: [{ standard: 'ISO 13485', clause: '§6.2' }],
      evaluate: ctx => ctx.procedures.inspectorQualification ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'O2', label: '검사 KPI 모니터링', status: STATUS.OPTIONAL,
      citations: [{ standard: 'ISO 13485', clause: '§8.4' }],
      evaluate: ctx => ctx.procedures.inspectionKPI ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'O3', label: 'Skip Lot / Reduced Inspection 정책', status: STATUS.OPTIONAL,
      citations: [{ standard: 'ISO 2859-1', clause: '전체' }],
      evaluate: ctx => ctx.procedures.skipLotPolicy ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'O4', label: '측정값 자동 캡처 비율', status: STATUS.OPTIONAL,
      citations: [{ standard: 'Project Instructions', clause: '§13.4' }],
      evaluate: ctx => (ctx.procedures.autoCapureRatio ?? 0) > 0.5 ? FULFILLMENT.MET : FULFILLMENT.PARTIAL },

    { id: 'V1', label: '활성 측정장비 100% 유효 교정 (만료 0건)', status: STATUS.VERIFICATION,
      citations: [{ standard: 'ISO 13485', clause: '§7.6' }],
      evaluate: ctx => (ctx.procedures.measurementEquipment ?? []).every(e => e.nextCalibrationDate && new Date(e.nextCalibrationDate).getTime() > Date.now()) ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'V2', label: '제품·공정 100% 검사 기준 정의', status: STATUS.VERIFICATION,
      citations: [{ standard: 'ISO 13485', clause: '§8.2.6' }],
      evaluate: ctx => ctx.procedures.inspectionCriteriaMatrix?.coverage === 1 ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'V3', label: 'OOS/OOT 시 위험구간 추적 100% 작동 (특허 P11)', status: STATUS.VERIFICATION,
      citations: [{ standard: 'Patent P11', clause: 'Suspect Period Tracking' }],
      evaluate: ctx => !hasRecentEvent(ctx.decisionLog, 'oos_event', 365) ? FULFILLMENT.MET : hasRecentEvent(ctx.decisionLog, 'suspect_period_recheck', 365) ? FULFILLMENT.MET : FULFILLMENT.UNMET },
  ],
};

// ----- ⑥NCR/CAPA 카드 -----
const CARD_06_NCR = {
  id: 'ncr_capa',
  index: 6,
  row: 1,
  title: 'NCR/CAPA',
  level: 3,
  items: [
    { id: 'F1', label: '부적합 식별·격리 절차', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§8.3.1' }, { standard: 'FDA QMSR', clause: '§820.90(a)' }],
      evaluate: ctx => procExists(ctx.procedures, 'nonconformance') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F2', label: '부적합 분류·평가', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§8.3.1' }],
      evaluate: ctx => ctx.procedures.ncrClassification ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F3', label: 'MRB 처분 + 권한 분리', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§8.3.2' }, { standard: 'FDA QMSR', clause: '§820.90(b)' }],
      evaluate: ctx => procExists(ctx.procedures, 'mrb') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F4', label: '재작업 절차 + 재검증', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§8.3.4' }],
      evaluate: ctx => procExists(ctx.procedures, 'rework') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F5', label: '특별승인(Concession) 절차', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§8.3.2' }],
      evaluate: ctx => procExists(ctx.procedures, 'concession') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F6', label: '시판후 부적합 처리 절차', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§8.3.3' }, { standard: 'EU MDR', clause: 'Article 87' }],
      evaluate: ctx => procExists(ctx.procedures, 'post_delivery_nc') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F7', label: '위험구간 자동 추적 (특허 P11)', status: STATUS.REQUIRED,
      citations: [{ standard: 'Patent P11', clause: 'Suspect Period Tracking' }],
      evaluate: ctx => ctx.procedures.suspectPeriodTracking?.active ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F8', label: '시정조치(CA) 7단계 절차', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§8.5.2' }, { standard: 'FDA QMSR', clause: '§820.100(a)' }],
      evaluate: ctx => procExists(ctx.procedures, 'corrective_action') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F9', label: '예방조치(PA) 절차', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§8.5.3' }],
      evaluate: ctx => procExists(ctx.procedures, 'preventive_action') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F10', label: '효과성 검증 절차', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§8.5.2(d)' }, { standard: 'FDA QMSR', clause: '§820.100(a)(4)' }],
      evaluate: ctx => procExists(ctx.procedures, 'effectiveness_check') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F11', label: '데이터 분석 절차 + 트렌드 임계값', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§8.4' }, { standard: 'FDA QMSR', clause: '§820.100(a)(1)' }],
      evaluate: ctx => procExists(ctx.procedures, 'data_analysis') ? FULFILLMENT.MET : FULFILLMENT.UNMET },

    { id: 'C1', label: 'SCAR 자동 발의 (③과 양방향)', citations: [{ standard: 'ISO 13485', clause: '§8.5.2 + §7.4' }],
      condition: ctx => (ctx.procedures.suppliers ?? []).length > 0 ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.scarAutoTrigger ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C2', label: 'FSCA·리콜 절차', citations: [{ standard: 'FDA QMSR', clause: '§820.198 + 21 CFR 806' }, { standard: 'EU MDR', clause: 'Article 87' }],
      condition: ctx => ctx.certifications.iso13485 || ctx.certifications.fdaQmsr || ctx.certifications.euMdr || ctx.certifications.kgmp ? STATUS.REQUIRED : STATUS.OPTIONAL,
      evaluate: ctx => procExists(ctx.procedures, 'fsca_recall') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C3', label: '고객 통지 의무', citations: [{ standard: 'ISO 13485', clause: '§8.3.2 + §8.3.3' }],
      condition: () => STATUS.REQUIRED,
      evaluate: ctx => procExists(ctx.procedures, 'customer_notification') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C4', label: '외주 공정 부적합 별도 처리', citations: [{ standard: 'ISO 13485', clause: '§4.1.5 + §7.4' }],
      condition: ctx => ctx.company.usesOutsourcedProcess === true ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.outsourcedNCR ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C5', label: 'AI 의사결정 NCR 별도 추적', citations: [{ standard: 'EU AI Act', clause: 'Article 14' }],
      condition: ctx => ctx.products.hasAI ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.aiDecisionNCRTracking ? FULFILLMENT.MET : FULFILLMENT.UNMET },

    { id: 'O1', label: 'RCA 도구 표준화', status: STATUS.OPTIONAL,
      citations: [{ standard: 'ISO 13485', clause: '§8.5.2' }],
      evaluate: ctx => ctx.procedures.rcaTools ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'O2', label: 'CAPA 처리 시간 KPI', status: STATUS.OPTIONAL,
      citations: [{ standard: 'ISO 13485', clause: '§8.4' }],
      evaluate: ctx => ctx.procedures.capaKPI ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'O3', label: 'NCR 분류별 트렌드 대시보드', status: STATUS.OPTIONAL,
      citations: [{ standard: 'ISO 13485', clause: '§8.4' }],
      evaluate: ctx => ctx.procedures.ncrTrendDashboard ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'O4', label: 'Lessons Learned DB', status: STATUS.OPTIONAL,
      citations: [{ standard: 'Industry Best Practice', clause: '—' }],
      evaluate: ctx => ctx.procedures.lessonsLearnedDB ? FULFILLMENT.MET : FULFILLMENT.UNMET },

    { id: 'V1', label: '발의 CAPA 마감 추적 (만료 0건)', status: STATUS.VERIFICATION,
      citations: [{ standard: 'ISO 13485', clause: '§8.5' }],
      evaluate: ctx => (ctx.procedures.capaTracking?.overdueCount ?? 0) === 0 ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'V2', label: '효과성 검증 완료 비율 (미실시 0건)', status: STATUS.VERIFICATION,
      citations: [{ standard: 'ISO 13485', clause: '§8.5.2(d)' }],
      evaluate: ctx => (ctx.procedures.capaTracking?.missingEffectivenessCount ?? 0) === 0 ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'V3', label: 'NCR/CAPA 데이터의 경영검토 입력', status: STATUS.VERIFICATION,
      citations: [{ standard: 'FDA QMSR', clause: '§820.100(a)(7)' }, { standard: 'ISO 13485', clause: '§5.6.2' }],
      evaluate: ctx => ctx.decisionLog.some(e => e.type === 'management_review_meeting' && e.attachments?.includes('capa_stats')) ? FULFILLMENT.MET : FULFILLMENT.UNMET },
  ],
};

// ----- ⑦내부심사 카드 -----
const CARD_07_AUDIT = {
  id: 'internal_audit',
  index: 7,
  row: 1,
  title: '내부심사',
  level: 3,
  items: [
    { id: 'F1', label: '내부심사 절차 (6대 요소 완비)', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§8.2.4' }, { standard: 'FDA QMSR', clause: '§820.22' }],
      evaluate: ctx => procExists(ctx.procedures, 'internal_audit') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F2', label: '연간 내부심사 계획 (12개 카드 영역 100% 커버)', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§8.2.4' }],
      evaluate: ctx => ctx.procedures.internalAuditPlan?.coverage === 1 ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F3', label: '심사원 자격 기준·임명', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§8.2.4' }],
      evaluate: ctx => ctx.procedures.auditorQualifications ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F4', label: '심사원 독립성 강제 (SoD)', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§8.2.4' }],
      evaluate: ctx => ctx.procedures.auditorIndependence?.enforced ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F5', label: '심사 체크리스트 (카드별 자동 발행)', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§8.2.4' }],
      evaluate: ctx => ctx.procedures.auditChecklists ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F6', label: '심사 결과 기록 (분류 + 증거)', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§8.2.4 + §4.2.5' }],
      evaluate: ctx => ctx.procedures.auditFindingsTemplate ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F7', label: '부적합 후속조치 자동 연동 (⑥과 양방향)', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§8.2.4 + §8.5.2' }],
      evaluate: ctx => ctx.procedures.auditFindingToCapa ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F8', label: '후속조치 효과성 검증', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§8.2.4' }],
      evaluate: ctx => ctx.procedures.auditFollowupEffectiveness ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F9', label: '경영검토 입력 (내부심사 결과·CAPA 진행·반복 부적합)', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§5.6.2 + §8.2.4' }],
      evaluate: ctx => ctx.decisionLog.some(e => e.type === 'management_review_meeting' && e.attachments?.includes('audit_results')) ? FULFILLMENT.MET : FULFILLMENT.UNMET },

    { id: 'C1', label: '외주 공정·위탁제조 심사', citations: [{ standard: 'ISO 13485', clause: '§4.1.5 + §7.4' }],
      condition: ctx => (ctx.company.usesOutsourcedProcess === true || ctx.company.usesCMO || ctx.manufacturing.outsourcedSterilization || ctx.manufacturing.usesExternalTestLab) ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.outsourcedAuditPlan ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C2', label: '다중 사이트 심사 매트릭스', citations: [{ standard: 'ISO 13485', clause: '§4.1' }],
      condition: ctx => ctx.company.multiSite ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.multiSiteAuditMatrix ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C3', label: '보상통제 적용 영역 별도 심사 강화', citations: [{ standard: 'ISO 13485', clause: '§5.5 + §8.2.4' }],
      condition: ctx => ctx.company.compensatingControls.length > 0 ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.compensatingControlAudit ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C4', label: 'MDSAP 통합 심사 대응', citations: [{ standard: 'MDSAP Audit Approach', clause: '전체' }],
      condition: ctx => ctx.certifications.mdsap ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.mdsapAuditMatrix ? FULFILLMENT.MET : FULFILLMENT.UNMET },

    { id: 'O1', label: '외부 심사원 활용 (CC-4)', status: STATUS.OPTIONAL,
      citations: [{ standard: 'ISO 13485', clause: '§8.2.4' }],
      evaluate: ctx => ctx.procedures.externalAuditors ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'O2', label: '심사 결과 트렌드 분석', status: STATUS.OPTIONAL,
      citations: [{ standard: 'ISO 13485', clause: '§8.4' }],
      evaluate: ctx => ctx.procedures.auditTrendAnalysis ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'O3', label: 'Mock Audit (NB 사전 모의)', status: STATUS.OPTIONAL,
      citations: [{ standard: 'ISO 13485', clause: '§8.2.4' }],
      evaluate: ctx => ctx.procedures.mockAudit ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'O4', label: '무작위/심층 심사 정책', status: STATUS.OPTIONAL,
      citations: [{ standard: 'EU MDR', clause: 'Annex IX §3.4' }],
      evaluate: ctx => ctx.procedures.unannouncedAuditPolicy ? FULFILLMENT.MET : FULFILLMENT.UNMET },

    { id: 'V1', label: '연간 심사 계획 100% 실행', status: STATUS.VERIFICATION,
      citations: [{ standard: 'ISO 13485', clause: '§8.2.4' }],
      evaluate: ctx => (ctx.procedures.internalAuditPlan?.executionRate ?? 0) === 1 ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'V2', label: '부적합 후속조치 마감 추적', status: STATUS.VERIFICATION,
      citations: [{ standard: 'ISO 13485', clause: '§8.2.4' }],
      evaluate: ctx => (ctx.procedures.auditFollowup?.overdueCount ?? 0) === 0 ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'V3', label: '12개월 내 모든 QMS 프로세스 영역 ≥ 1회 커버', status: STATUS.VERIFICATION,
      citations: [{ standard: 'ISO 13485', clause: '§8.2.4' }],
      evaluate: ctx => (ctx.procedures.internalAuditPlan?.recentCoverage ?? 0) === 1 ? FULFILLMENT.MET : FULFILLMENT.UNMET },
  ],
};

// ----- ⑧교육 카드 -----
const CARD_08_TRAINING = {
  id: 'training',
  index: 8,
  row: 1,
  title: '교육',
  level: 3,
  items: [
    { id: 'F1', label: '역할별 역량 요구사항 매트릭스', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§6.2' }, { standard: 'FDA QMSR', clause: '§820.25(a)' }],
      evaluate: ctx => ctx.procedures.competenceMatrix?.coverage === 1 ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F2', label: '인원별 자격 기록', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§4.2.5 + §6.2' }],
      evaluate: ctx => hasAtLeast(ctx.procedures.personnelRecords, 1) ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F3', label: '교육·훈련 계획', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§6.2' }],
      evaluate: ctx => ctx.procedures.trainingPlan ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F4', label: '교육 콘텐츠 라이브러리', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§6.2' }],
      evaluate: ctx => ctx.procedures.trainingContent ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F5', label: '교육 효과성 평가 절차', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§6.2' }, { standard: 'FDA QMSR', clause: '§820.25(b)(2)' }],
      evaluate: ctx => procExists(ctx.procedures, 'training_effectiveness') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F6', label: '인식(Awareness) 훈련 절차', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§6.2' }, { standard: 'FDA QMSR', clause: '§820.25(b)(1)' }],
      evaluate: ctx => procExists(ctx.procedures, 'awareness_training') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F7', label: 'SOP·CCR 발효 시 재교육 자동 트리거', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§6.2 + §7.5.6' }],
      evaluate: ctx => ctx.procedures.retrainingAutoTrigger ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F8', label: '자격 만료·갱신 사이클', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§6.2' }],
      evaluate: ctx => ctx.procedures.qualificationExpiry ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F9', label: '교육 기록 (양식·증빙·콘텐츠 버전)', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§4.2.5' }, { standard: 'FDA QMSR', clause: '§820.25(b)(2)' }],
      evaluate: ctx => ctx.procedures.trainingRecords ? FULFILLMENT.MET : FULFILLMENT.UNMET },

    { id: 'C1', label: 'PRRC 자격 요건 충족', citations: [{ standard: 'EU MDR', clause: 'Article 15' }],
      condition: ctx => ctx.certifications.euMdr ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.prrcQualified ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C2', label: '청정실·멸균실 작업자 자격', citations: [{ standard: 'ISO 14644', clause: '전체' }],
      condition: ctx => (ctx.products.hasCleanRoom || ctx.products.hasSterile) ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.cleanRoomQualification ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C3', label: '검사원 자격 (시력·MSA·검사 항목별)', citations: [{ standard: 'ISO 13485', clause: '§6.2' }],
      condition: () => STATUS.REQUIRED,
      evaluate: ctx => ctx.procedures.inspectorQualificationActive ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C4', label: 'SoD 역할 자격 강제 (Operator/Inspector/Manager·RA)', citations: [{ standard: 'ISO 13485', clause: '§5.5 + §6.2' }, { standard: '21 CFR Part 11', clause: '§11.10(d)' }],
      condition: () => STATUS.REQUIRED,
      evaluate: ctx => ctx.procedures.sodRoleQualification ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C5', label: '외국인 작업자 언어 능력 자격', citations: [{ standard: 'Project Instructions', clause: '§13.3.5' }],
      condition: ctx => ctx.personnel.hasForeignWorkers ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.foreignWorkerLanguage ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C6', label: 'PRAI 자격·임명', citations: [{ standard: 'EU AI Act', clause: 'Article 26' }],
      condition: ctx => ctx.products.hasAI ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.praiAppointed ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C7', label: '보상통제 외부 검토자/자문 자격', citations: [{ standard: 'ISO 13485', clause: '§5.5 + §6.2 + §7.4' }],
      condition: ctx => ctx.company.compensatingControls.length > 0 ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.externalReviewerQualified ? FULFILLMENT.MET : FULFILLMENT.UNMET },

    { id: 'O1', label: 'Train-the-Trainer', status: STATUS.OPTIONAL,
      citations: [{ standard: 'ISO 13485', clause: '§6.2' }],
      evaluate: ctx => ctx.procedures.trainTheTrainer ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'O2', label: '교육 이수율 KPI 모니터링', status: STATUS.OPTIONAL,
      citations: [{ standard: 'ISO 13485', clause: '§8.4' }],
      evaluate: ctx => ctx.procedures.trainingKPI ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'O3', label: '외부 교육 인정 절차', status: STATUS.OPTIONAL,
      citations: [{ standard: 'ISO 13485', clause: '§6.2' }],
      evaluate: ctx => ctx.procedures.externalTrainingRecognition ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'O4', label: '교육 콘텐츠 다국어 번역본', status: STATUS.OPTIONAL,
      citations: [{ standard: 'Project Instructions', clause: '§13.3.5' }],
      evaluate: ctx => ctx.procedures.trainingTranslation ? FULFILLMENT.MET : FULFILLMENT.UNMET },

    { id: 'V1', label: '활성 인원 100% 자격 충족', status: STATUS.VERIFICATION,
      citations: [{ standard: 'ISO 13485', clause: '§6.2' }],
      evaluate: ctx => (ctx.procedures.competenceMatrix?.fulfillmentRate ?? 0) === 1 ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'V2', label: 'SOP·CCR 발효 후 영향 작업자 100% 재교육 이수', status: STATUS.VERIFICATION,
      citations: [{ standard: 'FDA QMSR', clause: '§820.25(b) + §820.70(b)' }],
      evaluate: ctx => (ctx.procedures.retrainingCompletion?.missingCount ?? 0) === 0 ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'V3', label: '자격 만료 임박·만료 인원 0건', status: STATUS.VERIFICATION,
      citations: [{ standard: 'ISO 13485', clause: '§6.2' }],
      evaluate: ctx => (ctx.procedures.qualificationExpiry?.expiredCount ?? 0) === 0 ? FULFILLMENT.MET : FULFILLMENT.UNMET },
  ],
};

// ----- ⑨인허가신청 카드 -----
const CARD_09_REGULATORY = {
  id: 'regulatory',
  index: 9,
  row: 2,
  title: '인허가신청',
  level: 3,
  items: [
    { id: 'F1', label: '인증 프로젝트 등록', status: STATUS.REQUIRED,
      citations: [{ standard: 'Project Instructions', clause: '§12.3' }],
      evaluate: ctx => hasAtLeast(ctx.procedures.regulatoryProjects, 1) ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F2', label: '제품 등급 분류 결정 (시장×인증 매트릭스)', status: STATUS.REQUIRED,
      citations: [{ standard: '의료기기법', clause: '§6' }, { standard: '21 CFR 860', clause: '전체' }, { standard: 'EU MDR', clause: 'Annex VIII' }],
      evaluate: ctx => ctx.procedures.productClassificationMatrix?.complete ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F3', label: '적용 표준·필요 시험 자동 도출', status: STATUS.REQUIRED,
      citations: [{ standard: 'Project Instructions', clause: '§7 + §12.3' }],
      evaluate: ctx => ctx.procedures.applicableStandards?.coverage === 1 ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F4', label: '신청 패키지 자동 생성 (특허 P13)', status: STATUS.REQUIRED,
      citations: [{ standard: 'Patent P13', clause: 'Multi-Cert Auto Document' }],
      evaluate: ctx => ctx.procedures.submissionPackageTemplates ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F5', label: '신청 전 완성도 검증 (특허 P2)', status: STATUS.REQUIRED,
      citations: [{ standard: 'Patent 2', clause: 'Claim 1(b)' }],
      evaluate: ctx => ctx.procedures.completenessGate?.active ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F6', label: '제출 채널·방식 정의 (Stage 1~4)', status: STATUS.REQUIRED,
      citations: [{ standard: 'Project Instructions', clause: '§12.3' }],
      evaluate: ctx => ctx.procedures.submissionChannels ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F7', label: '보완·반려 통지 자동 수신·분류', status: STATUS.REQUIRED,
      citations: [{ standard: 'Project Instructions', clause: '§12.4' }],
      evaluate: ctx => ctx.procedures.regulatoryNoticesChannel?.active ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F8', label: '보완 응답 절차 (마감 카운트다운)', status: STATUS.REQUIRED,
      citations: [{ standard: 'Project Instructions', clause: '§12.4' }],
      evaluate: ctx => procExists(ctx.procedures, 'deficiency_response') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F9', label: '변경 통지/변경 허가 판단 절차 (Significant Change)', status: STATUS.REQUIRED,
      citations: [{ standard: 'EU MDR', clause: 'Article 120 + MDCG 2020-3' }, { standard: 'FDA', clause: '510(k) Modification Guidance' }],
      evaluate: ctx => procExists(ctx.procedures, 'significant_change_eval') ? FULFILLMENT.MET : FULFILLMENT.UNMET },

    { id: 'C1', label: 'FDA 510(k) eSTAR 전자 제출', citations: [{ standard: '21 CFR 807 Subpart E', clause: '전체' }],
      condition: ctx => (ctx.certifications.fdaQmsr && ctx.products.list.some(p => p.fdaClass === 'II' && p.fdaPath === '510k')) ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.fda510kPackage ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C2', label: 'PMA/De Novo/HDE 신청', citations: [{ standard: '21 CFR 814', clause: '전체' }],
      condition: ctx => ctx.products.list.some(p => ['PMA', 'DeNovo', 'HDE'].includes(p.fdaPath)) ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.fdaPmaDeNovoHde ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C3', label: 'MDR 적합성 평가 신청 (NB 매칭)', citations: [{ standard: 'EU MDR', clause: 'Annex IX·X·XI' }],
      condition: ctx => (ctx.certifications.euMdr && ctx.products.hasClassIIa_plus) ? STATUS.REQUIRED : ctx.certifications.euMdr ? STATUS.OPTIONAL : STATUS.NA,
      evaluate: ctx => ctx.procedures.mdrConformityAssessment ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C4', label: 'KGMP 신청·갱신·변경', citations: [{ standard: '의료기기법', clause: '§6' }],
      condition: ctx => ctx.certifications.kgmp ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.kgmpApplication ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C5', label: 'PMDA·NMPA·기타 다국가 신청', citations: [{ standard: 'PMDA/NMPA', clause: '각국 법령' }],
      condition: ctx => (ctx.certifications.pmda || ctx.certifications.nmpa) ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.multiCountryApplication ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C6', label: 'MDSAP 통합 신청', citations: [{ standard: 'MDSAP Audit Approach', clause: '전체' }],
      condition: ctx => ctx.certifications.mdsap ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.mdsapIntegratedSubmission ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C7', label: 'AI/ML SaMD PCCP 사전 등록', citations: [{ standard: 'FDA PCCP Guidance', clause: '2024' }],
      condition: ctx => (ctx.certifications.fdaQmsr && ctx.products.hasAI) ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.pccpRegistered ? FULFILLMENT.MET : FULFILLMENT.UNMET },

    { id: 'O1', label: 'Pre-Submission / Q-Sub 활용', status: STATUS.OPTIONAL,
      citations: [{ standard: 'FDA Q-Sub Program', clause: '—' }],
      evaluate: ctx => ctx.procedures.preSubmissionMeeting ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'O2', label: 'NB Pre-Audit / 사전 적합성 평가', status: STATUS.OPTIONAL,
      citations: [{ standard: 'NB 모범 절차', clause: '—' }],
      evaluate: ctx => ctx.procedures.nbPreAudit ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'O3', label: '신청 일정 KPI 모니터링', status: STATUS.OPTIONAL,
      citations: [{ standard: 'Project Instructions', clause: '§8.4' }],
      evaluate: ctx => ctx.procedures.applicationKPI ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'O4', label: '경쟁 제품 인증 이력 분석', status: STATUS.OPTIONAL,
      citations: [{ standard: 'Project Instructions', clause: '§10' }],
      evaluate: ctx => ctx.procedures.competitorRegHistory ? FULFILLMENT.MET : FULFILLMENT.UNMET },

    { id: 'V1', label: '신청 전 완성도 100% 통과 (누락 0건)', status: STATUS.VERIFICATION,
      citations: [{ standard: 'Patent 2', clause: 'Claim 1(b)' }],
      evaluate: ctx => (ctx.procedures.regulatoryProjects ?? []).every(p => !p.submitted || p.completenessScore === 1) ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'V2', label: '보완 통지 응답 마감 추적', status: STATUS.VERIFICATION,
      citations: [{ standard: 'Project Instructions', clause: '§12.4' }],
      evaluate: ctx => (ctx.procedures.regulatoryNoticesChannel?.overdueCount ?? 0) === 0 ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'V3', label: '인증서 유효기간·갱신 임박 추적', status: STATUS.VERIFICATION,
      citations: [{ standard: 'EU MDR', clause: '재인증 5년' }],
      evaluate: ctx => (ctx.procedures.regulatoryProjects ?? []).every(p => !p.certExpiry || (new Date(p.certExpiry).getTime() - Date.now()) > 365 * 24 * 60 * 60 * 1000 || p.renewalInitiated) ? FULFILLMENT.MET : FULFILLMENT.UNMET },
  ],
};

// ----- ⑩UDI 카드 -----
const CARD_10_UDI = {
  id: 'udi',
  index: 10,
  row: 2,
  title: 'UDI',
  level: 3,
  items: [
    { id: 'F1', label: '발급 기관 선택·등록', status: STATUS.REQUIRED,
      citations: [{ standard: '21 CFR 830.20', clause: '전체' }, { standard: 'EU MDR', clause: 'Article 27.2' }],
      evaluate: ctx => ctx.procedures.udiIssuingAgency ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F2', label: 'UDI-DI 마스터 데이터', status: STATUS.REQUIRED,
      citations: [{ standard: '21 CFR 830', clause: '전체' }, { standard: 'EU MDR', clause: 'Article 27.3' }],
      evaluate: ctx => hasAtLeast(ctx.procedures.udiDi, 1) ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F3', label: 'UDI-PI 자동 생성 규칙', status: STATUS.REQUIRED,
      citations: [{ standard: 'EU MDR', clause: 'Annex VI Part C' }],
      evaluate: ctx => ctx.procedures.udiPiRules ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F4', label: '라벨 양식 라이브러리 (시장×인증 매트릭스)', status: STATUS.REQUIRED,
      citations: [{ standard: '21 CFR 801', clause: '전체' }, { standard: 'EU MDR', clause: 'Annex VI Part C' }],
      evaluate: ctx => ctx.procedures.labelTemplates?.coverage === 1 ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F5', label: '바코드 인쇄 품질 자동 검증', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO/IEC 15415/15416', clause: '전체' }],
      evaluate: ctx => ctx.procedures.barcodeVerification?.active ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F6', label: '라벨 인쇄 통제 절차', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§7.5.5' }, { standard: 'FDA QMSR', clause: '§820.120' }],
      evaluate: ctx => procExists(ctx.procedures, 'label_printing') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F7', label: 'UDI 라이프사이클 이벤트 절차', status: STATUS.REQUIRED,
      citations: [{ standard: '21 CFR 830.50', clause: '전체' }, { standard: 'EU MDR', clause: 'Article 27.4' }],
      evaluate: ctx => procExists(ctx.procedures, 'udi_lifecycle') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F8', label: 'UDI 외부 DB 동기화 절차', status: STATUS.REQUIRED,
      citations: [{ standard: '21 CFR 830.300', clause: '전체' }, { standard: 'EU MDR', clause: 'Article 28' }],
      evaluate: ctx => procExists(ctx.procedures, 'udi_db_sync') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F9', label: '다국어 라벨 자동 생성', status: STATUS.REQUIRED,
      citations: [{ standard: 'EU MDR', clause: 'Article 10(11) + Annex I §23' }],
      evaluate: ctx => ctx.procedures.labelTranslations ? FULFILLMENT.MET : FULFILLMENT.UNMET },

    { id: 'C1', label: 'GUDID 제출 (FDA)', citations: [{ standard: '21 CFR 830 Subpart E', clause: '전체' }],
      condition: ctx => ctx.certifications.fdaQmsr ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.gudidSubmission?.active ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C2', label: 'EUDAMED UDI Module 등록', citations: [{ standard: 'EU MDR', clause: 'Article 28' }],
      condition: ctx => ctx.certifications.euMdr ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.eudamedRegistered ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C3', label: 'MFDS UDI 시스템 등록', citations: [{ standard: '의료기기 표시·기재사항 고시', clause: '전체' }],
      condition: ctx => ctx.certifications.kgmp ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.mfdsUdiRegistered ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C4', label: 'PMDA/NMPA UDI 등록', citations: [{ standard: 'J-MDN / NMPA UDI', clause: '—' }],
      condition: ctx => (ctx.certifications.pmda || ctx.certifications.nmpa) ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.pmdaNmpaUdi ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C5', label: '임플란트 UDI 특별 처리 (Implant Card)', citations: [{ standard: 'EU MDR', clause: 'Article 18' }],
      condition: ctx => ctx.products.hasImplant ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.implantCard ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C6', label: 'SW UDI (SW 버전 → UDI-PI)', citations: [{ standard: 'EU MDR', clause: 'Article 27 (SW)' }],
      condition: ctx => ctx.products.hasSoftware ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.softwareUdi ? FULFILLMENT.MET : FULFILLMENT.UNMET },

    { id: 'O1', label: 'DI/PI 자동 부여 통합 (CAD·BOM 연동)', status: STATUS.OPTIONAL,
      citations: [{ standard: 'Project Instructions', clause: '§16.3' }],
      evaluate: ctx => ctx.procedures.udiAutoAssignment ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'O2', label: 'RFID·NFC 추가 식별 기술', status: STATUS.OPTIONAL,
      citations: [{ standard: 'ISO/IEC 15459', clause: '—' }],
      evaluate: ctx => ctx.procedures.rfidNfc ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'O3', label: 'UDI 분석 대시보드', status: STATUS.OPTIONAL,
      citations: [{ standard: 'Project Instructions', clause: '§17 + §16.6' }],
      evaluate: ctx => ctx.procedures.udiDashboard ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'O4', label: 'UDI 발급 비용 추적', status: STATUS.OPTIONAL,
      citations: [{ standard: 'Project Instructions', clause: '§16.8' }],
      evaluate: ctx => ctx.procedures.udiCostTracking ? FULFILLMENT.MET : FULFILLMENT.UNMET },

    { id: 'V1', label: '활성 제품 100% UDI-DI 발급·등록', status: STATUS.VERIFICATION,
      citations: [{ standard: '21 CFR 830', clause: '전체' }, { standard: 'EU MDR', clause: 'Article 27' }],
      evaluate: ctx => ctx.products.list.every(p => !p.udiRequired || p.udiDi) ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'V2', label: '라벨 인쇄 100% 바코드 등급 검증', status: STATUS.VERIFICATION,
      citations: [{ standard: 'ISO/IEC 15415/15416', clause: '전체' }],
      evaluate: ctx => (ctx.procedures.barcodeVerification?.failureCount ?? 0) === 0 ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'V3', label: '외부 DB 동기화 마감 추적 (만료 0건)', status: STATUS.VERIFICATION,
      citations: [{ standard: '21 CFR 830', clause: 'GUDID 10일' }],
      evaluate: ctx => (ctx.procedures.udiDbSync?.overdueCount ?? 0) === 0 ? FULFILLMENT.MET : FULFILLMENT.UNMET },
  ],
};

// ----- ⑪PMS 카드 -----
const CARD_11_PMS = {
  id: 'pms',
  index: 11,
  row: 2,
  title: 'PMS',
  level: 3,
  items: [
    { id: 'F1', label: 'PMS 계획서 (제품별·인증별)', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§8.2.1' }, { standard: 'EU MDR', clause: 'Annex III' }],
      evaluate: ctx => hasAtLeast(ctx.procedures.pmsPlan, 1) ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F2', label: '고객 불만 처리 절차', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§8.2.2' }, { standard: 'FDA QMSR', clause: '§820.198' }],
      evaluate: ctx => procExists(ctx.procedures, 'complaint_handling') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F3', label: 'Vigilance·이상사례 보고 절차', status: STATUS.REQUIRED,
      citations: [{ standard: '21 CFR 803', clause: '전체' }, { standard: 'EU MDR', clause: 'Article 87' }],
      evaluate: ctx => procExists(ctx.procedures, 'vigilance_reporting') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F4', label: 'Reportability 판정 절차 (AI 1차 + 인간 최종)', status: STATUS.REQUIRED,
      citations: [{ standard: '21 CFR 803', clause: '전체' }, { standard: 'EU MDR', clause: 'Article 87' }],
      evaluate: ctx => procExists(ctx.procedures, 'reportability_decision') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F5', label: '정식 보고서 자동 생성·제출', status: STATUS.REQUIRED,
      citations: [{ standard: '21 CFR 803', clause: '전체' }, { standard: 'EU MDR', clause: 'Article 87' }],
      evaluate: ctx => ctx.procedures.vigilanceSubmissionTemplates ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F6', label: '신호 감지 절차 (임계값 + AI 보조)', status: STATUS.REQUIRED,
      citations: [{ standard: 'EU MDR', clause: 'Article 88' }],
      evaluate: ctx => procExists(ctx.procedures, 'signal_detection') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F7', label: '시판후 신호 → 위험관리·CAPA 자동 환류 (특허 P15)', status: STATUS.REQUIRED,
      citations: [{ standard: 'Patent P15', clause: 'Closed-Loop PMS' }, { standard: 'ISO 14971', clause: '§10' }],
      evaluate: ctx => ctx.procedures.pmsClosedLoop?.active ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F8', label: 'FSCA·리콜 절차', status: STATUS.REQUIRED,
      citations: [{ standard: 'EU MDR', clause: 'Article 87' }, { standard: '21 CFR 806', clause: '전체' }],
      evaluate: ctx => procExists(ctx.procedures, 'fsca_recall') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F9', label: '문헌 검토 절차', status: STATUS.REQUIRED,
      citations: [{ standard: 'EU MDR', clause: 'Annex III §1.1(a)' }],
      evaluate: ctx => procExists(ctx.procedures, 'literature_review') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F10', label: '데이터 분석·트렌드 보고 절차', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§8.4' }, { standard: 'EU MDR', clause: 'Article 83' }],
      evaluate: ctx => procExists(ctx.procedures, 'pms_data_analysis') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F11', label: '시판후 기록 보존 (부록 E 매트릭스)', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§4.2.5' }, { standard: 'EU MDR', clause: 'Article 10(8)' }],
      evaluate: ctx => ctx.procedures.pmsRecords?.retentionMatrixApplied ? FULFILLMENT.MET : FULFILLMENT.UNMET },

    { id: 'C1', label: 'PSUR (Class별 주기)', citations: [{ standard: 'EU MDR', clause: 'Article 86' }],
      condition: ctx => (ctx.certifications.euMdr && ctx.products.hasClassIIa_plus) ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.psurGenerated ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C2', label: 'PMCF (⑫와 양방향)', citations: [{ standard: 'EU MDR', clause: 'Annex XIV Part B' }],
      condition: ctx => ctx.certifications.euMdr ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.pmcfPlan ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C3', label: 'PRRC Reportability 최종 승인 게이트', citations: [{ standard: 'EU MDR', clause: 'Article 15' }],
      condition: ctx => ctx.certifications.euMdr ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.prrcReportabilityGate ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C4', label: 'FDA 5일 보고 (재발 시 사망·중대상해 가능성)', citations: [{ standard: '21 CFR 803.53', clause: '전체' }],
      condition: ctx => ctx.certifications.fdaQmsr ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.fda5DayReport ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C5', label: 'Trend Report (MDR §88)', citations: [{ standard: 'EU MDR', clause: 'Article 88' }],
      condition: ctx => ctx.certifications.euMdr ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.trendReport ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C6', label: '시판후 추적관리 의무 (한국)', citations: [{ standard: '의료기기법', clause: '§31의5' }],
      condition: ctx => (ctx.certifications.kgmp && ctx.products.koreaPostMarketTrackingMandatory) ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.koreaPostMarketTracking ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C7', label: 'AI 의료기기 시판후 모니터링', citations: [{ standard: 'EU AI Act', clause: 'Article 72' }],
      condition: ctx => ctx.products.hasAI ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.aiPostMarketMonitoring ? FULFILLMENT.MET : FULFILLMENT.UNMET },

    { id: 'O1', label: '시판후 임상 데이터 통합', status: STATUS.OPTIONAL,
      citations: [{ standard: 'ISO 14155', clause: '—' }],
      evaluate: ctx => ctx.procedures.postMarketClinicalData ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'O2', label: '익명화 시판후 데이터 산업 벤치마크', status: STATUS.OPTIONAL,
      citations: [{ standard: 'Project Instructions', clause: '§5 + §17.8' }],
      evaluate: ctx => ctx.procedures.anonymizedBenchmark ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'O3', label: 'PMS 데이터 대시보드', status: STATUS.OPTIONAL,
      citations: [{ standard: 'Project Instructions', clause: '§17.6' }],
      evaluate: ctx => ctx.procedures.pmsDashboard ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'O4', label: '위기 대응 플레이북', status: STATUS.OPTIONAL,
      citations: [{ standard: 'Project Instructions', clause: '§17.8' }],
      evaluate: ctx => ctx.procedures.crisisPlaybook ? FULFILLMENT.MET : FULFILLMENT.UNMET },

    { id: 'V1', label: '활성 제품 100% PMS 계획 보유', status: STATUS.VERIFICATION,
      citations: [{ standard: 'EU MDR', clause: 'Annex III' }, { standard: 'ISO 13485', clause: '§8.2.1' }],
      evaluate: ctx => ctx.products.list.every(p => !p.marketed || ctx.procedures.pmsPlan?.some(pl => pl.productId === p.id)) ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'V2', label: '모든 보고 마감 추적 (만료 0건)', status: STATUS.VERIFICATION,
      citations: [{ standard: '21 CFR 803', clause: '마감' }, { standard: 'EU MDR', clause: 'Article 87' }],
      evaluate: ctx => (ctx.procedures.vigilanceTracking?.overdueCount ?? 0) === 0 ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'V3', label: '신호 감지 → 위험관리·CAPA 환류 100% 작동 (특허 P15)', status: STATUS.VERIFICATION,
      citations: [{ standard: 'Patent P15', clause: 'Closed-Loop PMS' }],
      evaluate: ctx => (ctx.procedures.pmsClosedLoop?.unprocessedSignals ?? 0) === 0 ? FULFILLMENT.MET : FULFILLMENT.UNMET },
  ],
};

// ----- ⑫임상평가 카드 -----
const CARD_12_CLINICAL = {
  id: 'clinical',
  index: 12,
  row: 2,
  title: '임상평가',
  level: 3,
  items: [
    { id: 'F1', label: '임상평가 계획서 (CEP)', status: STATUS.REQUIRED,
      citations: [{ standard: 'EU MDR', clause: 'Article 61.3 + Annex XIV Part A §1' }],
      evaluate: ctx => hasAtLeast(ctx.procedures.clinicalEvaluationPlan, 1) ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F2', label: '문헌 검토 절차 (PICO + 자동 수집)', status: STATUS.REQUIRED,
      citations: [{ standard: 'MEDDEV 2.7/1 Rev.4', clause: '전체' }],
      evaluate: ctx => procExists(ctx.procedures, 'literature_review_clinical') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F3', label: '임상 데이터 식별·평가 (Quality Assessment)', status: STATUS.REQUIRED,
      citations: [{ standard: 'MDCG 2020-13', clause: '전체' }],
      evaluate: ctx => ctx.procedures.clinicalDataSources?.assessmentComplete ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F4', label: '동등성 평가 절차 (3축)', status: STATUS.REQUIRED,
      citations: [{ standard: 'EU MDR', clause: 'Article 61.4 + MDCG 2020-5' }],
      evaluate: ctx => ctx.procedures.equivalenceAssessment ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F5', label: '임상시험 결정 게이트', status: STATUS.REQUIRED,
      citations: [{ standard: 'EU MDR', clause: 'Article 61.4·61.6' }],
      evaluate: ctx => procExists(ctx.procedures, 'clinical_investigation_decision') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F6', label: 'CER 자동 초안 생성 (특허 P13)', status: STATUS.REQUIRED,
      citations: [{ standard: 'EU MDR', clause: 'Article 61.12 + Annex XIV' }],
      evaluate: ctx => ctx.procedures.cerTemplates ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F7', label: '위험-이익 분석 (RMF 자동 환류)', status: STATUS.REQUIRED,
      citations: [{ standard: 'EU MDR', clause: 'Annex I §1·§8' }, { standard: 'ISO 14971', clause: '§10' }],
      evaluate: ctx => ctx.procedures.riskBenefitAnalysis ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F8', label: 'CER 갱신 절차 (Class별 주기)', status: STATUS.REQUIRED,
      citations: [{ standard: 'EU MDR', clause: 'Article 61.11' }],
      evaluate: ctx => procExists(ctx.procedures, 'cer_update') ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'F9', label: '임상 데이터 기록 보존 (부록 E)', status: STATUS.REQUIRED,
      citations: [{ standard: 'ISO 13485', clause: '§4.2.5' }, { standard: 'EU MDR', clause: 'Article 10(8)' }],
      evaluate: ctx => ctx.procedures.clinicalRecords?.retentionMatrixApplied ? FULFILLMENT.MET : FULFILLMENT.UNMET },

    { id: 'C1', label: '임상시험 실행 (GCP)', citations: [{ standard: 'ISO 14155', clause: '전체' }, { standard: 'EU MDR', clause: 'Article 62~82' }],
      condition: ctx => ctx.products.anyProductRequiresClinicalTrial ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.clinicalInvestigation?.gcpCompliant ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C2', label: 'PMCF 계획·실행', citations: [{ standard: 'EU MDR', clause: 'Annex XIV Part B' }],
      condition: ctx => ctx.certifications.euMdr ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.pmcfImplemented ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C3', label: '임플란트·Class III 강화 임상 의무', citations: [{ standard: 'EU MDR', clause: 'Article 61.4' }],
      condition: ctx => (ctx.certifications.euMdr && (ctx.products.hasImplant || ctx.products.hasClassIII)) ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.classIIIOwnClinical ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C4', label: '510(k) Substantial Equivalence 비교', citations: [{ standard: '21 CFR 807 Subpart E', clause: '전체' }],
      condition: ctx => (ctx.certifications.fdaQmsr && ctx.products.list.some(p => p.fdaPath === '510k')) ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.fda510kSE ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C5', label: 'PMA 임상 데이터', citations: [{ standard: '21 CFR 814', clause: '전체' }],
      condition: ctx => (ctx.certifications.fdaQmsr && ctx.products.list.some(p => p.fdaPath === 'PMA')) ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.pmaClinical ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C6', label: 'SaMD 임상평가 특칙 (3계층)', citations: [{ standard: 'MDCG 2020-1', clause: '전체' }, { standard: 'IMDRF SaMD', clause: 'WG/N41' }],
      condition: ctx => ctx.products.hasSoftware ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.samdClinicalEvaluation ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C7', label: 'AI/ML SaMD 임상 평가 강화', citations: [{ standard: 'EU AI Act', clause: 'Article 15' }, { standard: 'FDA AI/ML Action Plan', clause: '—' }],
      condition: ctx => ctx.products.hasAI ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.aiClinicalEvaluation ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'C8', label: 'KGCP·KGMP 임상시험 (한국 내)', citations: [{ standard: '의료기기법', clause: '§10' }, { standard: 'KGCP', clause: '전체' }],
      condition: ctx => (ctx.certifications.kgmp && ctx.products.anyProductRequiresClinicalTrial) ? STATUS.REQUIRED : STATUS.NA,
      evaluate: ctx => ctx.procedures.kgcpCompliant ? FULFILLMENT.MET : FULFILLMENT.UNMET },

    { id: 'O1', label: 'KOL 자문위원 풀', status: STATUS.OPTIONAL,
      citations: [{ standard: 'Project Instructions', clause: '§19.7 + §10' }],
      evaluate: ctx => ctx.procedures.kolPool ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'O2', label: '익명화 임상 데이터베이스 자산화', status: STATUS.OPTIONAL,
      citations: [{ standard: 'Project Instructions', clause: '§5 + §19.7' }],
      evaluate: ctx => ctx.procedures.anonymizedClinicalDb ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'O3', label: '경쟁 제품 임상 사례 분석', status: STATUS.OPTIONAL,
      citations: [{ standard: 'EU MDR', clause: 'Annex III §1.1(a)' }],
      evaluate: ctx => ctx.procedures.competitorClinicalAnalysis ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'O4', label: 'Pre-Submission 임상 데이터 적정성 협의', status: STATUS.OPTIONAL,
      citations: [{ standard: 'Project Instructions', clause: '§12.3' }],
      evaluate: ctx => ctx.procedures.clinicalPreSubmission ? FULFILLMENT.MET : FULFILLMENT.UNMET },

    { id: 'V1', label: '활성 인증 제품 100% 유효 CER 보유', status: STATUS.VERIFICATION,
      citations: [{ standard: 'EU MDR', clause: 'Article 61.11' }],
      evaluate: ctx => ctx.products.list.every(p => !p.marketed || !p.cerRequired || (p.cerExpiry && new Date(p.cerExpiry).getTime() > Date.now())) ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'V2', label: 'PMCF 데이터의 CER 자동 환류 (특허 P15)', status: STATUS.VERIFICATION,
      citations: [{ standard: 'Patent P15', clause: 'Closed-Loop' }],
      evaluate: ctx => !ctx.certifications.euMdr ? FULFILLMENT.MET : (ctx.procedures.pmcfImplemented && ctx.procedures.cerAutoUpdateActive) ? FULFILLMENT.MET : FULFILLMENT.UNMET },
    { id: 'V3', label: '임상시험 SAE 보고 마감 추적', status: STATUS.VERIFICATION,
      citations: [{ standard: 'ISO 14155', clause: '§6.4' }, { standard: 'EU MDR', clause: 'Article 80' }],
      evaluate: ctx => !ctx.products.anyProductRequiresClinicalTrial ? FULFILLMENT.MET : (ctx.procedures.saeTracking?.overdueCount ?? 0) === 0 ? FULFILLMENT.MET : FULFILLMENT.UNMET },
  ],
};

// ============================================================================
// 5. 카드 레지스트리
// ============================================================================
export const CARDS = [
  CARD_01_QMS,
  CARD_02_DESIGN,
  CARD_03_SUPPLIER,
  CARD_04_MANUFACTURING,
  CARD_05_QC,
  CARD_06_NCR,
  CARD_07_AUDIT,
  CARD_08_TRAINING,
  CARD_09_REGULATORY,
  CARD_10_UDI,
  CARD_11_PMS,
  CARD_12_CLINICAL,
];

// ============================================================================
// 6. 핵심 — 진행률 계산 순수 함수
// ============================================================================

/**
 * 한 항목의 실제 상태 결정 — 조건부 항목은 동적으로 평가
 */
// citation 표준 → 인증 키 분류 (일반 표준은 null = 항상 적용)
function citationCertKey(standard) {
  const s = String(standard || '');
  if (/EU MDR|EUDAMED|MDCG|MEDDEV|EU AI Act|2017\/745|\bMDR\b/i.test(s)) return 'euMdr';
  if (/FDA|21 CFR|GUDID|510\(k\)|\bPMA\b|QMSR|\bQSR\b/i.test(s)) return 'fdaQmsr';
  if (/PMDA|J-MDN|J-UDI|Pharmaceutical Affairs/i.test(s)) return 'pmda';
  if (/NMPA/i.test(s)) return 'nmpa';
  if (/KGMP|MFDS|식약처|의료기기법|의료기기 표시|고시|KGCP|별표/i.test(s)) return 'kgmp';
  if (/ISO 13485/i.test(s)) return 'iso13485';
  return null;
}
// 선택한 인증(또는 일반 표준)에 해당하는 인용인가
export function isCitationApplicable(citation, certs) {
  const k = citationCertKey(citation && citation.standard);
  if (!k) return true;
  return !!(certs && certs[k]);
}
// 고정 항목이 선택 인증에 적용되는가 (인용이 전부 비선택 인증이면 false)
export function itemCertApplicable(item, certs) {
  if (!item || !Array.isArray(item.citations) || item.citations.length === 0) return true;
  return item.citations.some(c => isCitationApplicable(c, certs));
}

function resolveItemStatus(item, ctx) {
  if (item.condition) {
    const result = item.condition(ctx);
    return result; // 'required' | 'optional' | 'na'
  }
  // 조건 없는 고정 항목: 선택한 인증에 해당하는 인용이 하나도 없으면 N/A
  if (!itemCertApplicable(item, ctx.certifications)) return STATUS.NA;
  return item.status;
}

/**
 * 충족 점수 변환 (met=1.0, partial=0.5, unmet=0.0)
 */
function fulfillmentScore(f) {
  if (f === FULFILLMENT.MET) return 1.0;
  if (f === FULFILLMENT.PARTIAL) return 0.5;
  return 0.0;
}

/**
 * 한 카드의 진행률 계산
 * @returns {{ percent, required, optional, verification, na, items, naReason? }}
 */
export function computeCardProgress(card, ctx) {
  // 카드 전체 N/A 체크
  if (card.cardLevelCondition) {
    const cardStatus = card.cardLevelCondition(ctx);
    if (cardStatus === 'na') {
      return {
        cardId: card.id,
        cardIndex: card.index,
        cardTitle: card.title,
        cardRow: card.row,
        level: card.level,
        percent: null,
        na: true,
        naReason: 'FDA 단일 인증 + Class I 설계관리 면제',
        required: { total: 0, met: 0, score: 0 },
        optional: { total: 0, met: 0, score: 0 },
        verification: { total: 0, met: 0, score: 0 },
        items: card.items.map(item => ({ ...item, resolvedStatus: STATUS.NA, fulfillment: FULFILLMENT.UNMET })),
      };
    }
  }

  const buckets = {
    required: { total: 0, score: 0, met: 0 },
    optional: { total: 0, score: 0, met: 0 },
    verification: { total: 0, score: 0, met: 0 },
  };

  const resolvedItems = card.items.map(item => {
    const resolvedStatus = resolveItemStatus(item, ctx);
    // 토글 가능 항목이고 사용자가 OFF로 토글한 경우 N/A 처리
    const togglePath = `${card.id}.${item.id}`;
    if (item.togglable && ctx.toggles?.[togglePath] === false) {
      return { ...item, resolvedStatus: STATUS.NA, fulfillment: FULFILLMENT.UNMET };
    }
    if (resolvedStatus === STATUS.NA) {
      return { ...item, resolvedStatus, fulfillment: FULFILLMENT.UNMET };
    }
    const fulfillment = item.evaluate(ctx);
    const score = fulfillmentScore(fulfillment);
    const bucket = buckets[resolvedStatus];
    if (bucket) {
      bucket.total += 1;
      bucket.score += score;
      if (fulfillment === FULFILLMENT.MET) bucket.met += 1;
    }
    return { ...item, resolvedStatus, fulfillment };
  });

  const reqRate = buckets.required.total === 0 ? 1 : buckets.required.score / buckets.required.total;
  const optRate = buckets.optional.total === 0 ? 1 : buckets.optional.score / buckets.optional.total;
  const verRate = buckets.verification.total === 0 ? 1 : buckets.verification.score / buckets.verification.total;

  // 필수 분모 0 — 카드 자체가 의미 없음 (정상 케이스에서 발생 안 함)
  // 필수가 있고 선택/검증이 없으면 누락된 가중치를 필수가 흡수
  let weight_required = WEIGHTS.required;
  let weight_optional = WEIGHTS.optional;
  let weight_verification = WEIGHTS.verification;
  if (buckets.optional.total === 0) {
    weight_required += weight_optional / 2;
    weight_verification += weight_optional / 2;
    weight_optional = 0;
  }
  if (buckets.verification.total === 0) {
    weight_required += weight_verification;
    weight_verification = 0;
  }

  const percent = Math.round((reqRate * weight_required + optRate * weight_optional + verRate * weight_verification) * 100);

  return {
    cardId: card.id,
    cardIndex: card.index,
    cardTitle: card.title,
    cardRow: card.row,
    level: card.level,
    percent,
    na: false,
    required: buckets.required,
    optional: buckets.optional,
    verification: buckets.verification,
    items: resolvedItems,
  };
}

/**
 * 12개 카드 전체 진행률 계산
 */
export function computeAllCards(ctx) {
  return CARDS.map(card => computeCardProgress(card, ctx));
}

/**
 * 전사 GMP 종합 점수 (N/A 카드 제외)
 */
export function computeOverallScore(cards) {
  const valid = cards.filter(c => !c.na && c.percent !== null);
  if (valid.length === 0) return 0;
  return Math.round(valid.reduce((sum, c) => sum + c.percent, 0) / valid.length);
}

// ============================================================================
// 7. 권한 가시성 — Level 미충족 카드는 회색 + "권한 필요" 라벨
// ============================================================================

/**
 * 사용자의 권한 Level이 카드 요구 Level을 충족하는지
 * Level: 1=Operator, 2=Inspector, 3=Manager/RA
 */
export function userCanAccessCard(card, userLevel) {
  return userLevel >= card.level;
}

// ============================================================================
// 8. 디폴트 export — 메인 진입점
// ============================================================================
export default {
  loadContext,
  computeAllCards,
  computeCardProgress,
  computeOverallScore,
  userCanAccessCard,
  CARDS,
  WEIGHTS,
  STATUS,
  FULFILLMENT,
};
