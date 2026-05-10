/**
 * Qualytree Regulation Mapping — 규제 매핑 카탈로그
 *
 * 모든 데이터 필드, 사용자 액션, 자동 생성 문서에 적용되는 규제 조항을
 * 단일 카탈로그로 관리한다. 화면·PDF·심사 모드는 이 카탈로그를 참조하여
 * 항상 최신 조항을 표시한다.
 *
 * 적용 원칙:
 * - Project Instructions §3 규제 정확성: 조항 번호 + 최신 개정 연도 명시
 * - Project Instructions §22.4 투명성: 모든 자동 결정에 근거 조항 첨부
 * - Project Instructions §11.5 21 CFR Part 11: 모든 변경에 감사 추적
 */

/* ================================================================
   적용 표준·법령 마스터 카탈로그
   ================================================================ */
export const STANDARDS = {
  // QMS 표준
  ISO_13485: {
    code: 'ISO 13485:2016',
    title: 'Medical devices — Quality management systems',
    region: 'International',
  },
  FDA_QMSR: {
    code: '21 CFR 820 (QMSR, eff. 2026.2.2)',
    title: 'Quality Management System Regulation',
    region: 'USA',
  },
  KGMP: {
    code: '의료기기 제조 및 품질관리 기준 (KGMP)',
    title: 'Korea Good Manufacturing Practice for Medical Devices',
    region: 'Korea',
  },
  MDR: {
    code: 'Regulation (EU) 2017/745 (MDR)',
    title: 'Medical Device Regulation',
    region: 'EU',
  },
  // 위험관리·검증
  ISO_14971: {
    code: 'ISO 14971:2019',
    title: 'Application of risk management to medical devices',
    region: 'International',
  },
  // 전자기록
  PART_11: {
    code: '21 CFR Part 11',
    title: 'Electronic Records; Electronic Signatures',
    region: 'USA',
  },
  ANNEX_11: {
    code: 'EU GMP Annex 11',
    title: 'Computerised Systems',
    region: 'EU',
  },
  // CSV
  GAMP_5: {
    code: 'GAMP 5 (2nd Edition)',
    title: 'Good Automated Manufacturing Practice',
    region: 'International',
  },
  // 측정·검사
  AIAG_MSA: {
    code: 'AIAG MSA 4th Edition',
    title: 'Measurement Systems Analysis',
    region: 'International',
  },
  ISO_2859: {
    code: 'ISO 2859-1',
    title: 'Sampling procedures for inspection by attributes',
    region: 'International',
  },
  // 정보보안
  ISO_27001: {
    code: 'ISO/IEC 27001:2022',
    title: 'Information security management systems',
    region: 'International',
  },
  // AI 거버넌스
  EU_AI_ACT: {
    code: 'Regulation (EU) 2024/1689 (AI Act)',
    title: 'AI Act',
    region: 'EU',
  },
  ISO_42001: {
    code: 'ISO/IEC 42001:2023',
    title: 'AI Management System',
    region: 'International',
  },
}

/* ================================================================
   엔티티 타입별 규제 매핑
   각 엔티티의 핵심 필드·액션이 어느 규제 조항을 충족하는지
   ================================================================ */

export const ENTITY_REGULATIONS = {
  /* ---------- 검사 항목 템플릿 ---------- */
  inspectionTemplate: {
    entity: '검사 항목 (Inspection Template)',
    purpose: '제품·공정의 측정 기준 정의',
    fields: {
      label: [
        { std: 'ISO_13485', clause: '§7.5.6', desc: '생산·서비스 제공 모니터링 항목 식별' },
        { std: 'FDA_QMSR', clause: '§820.72', desc: '검사·측정·시험 장비의 식별' },
      ],
      specMin: [
        { std: 'ISO_13485', clause: '§7.5.6', desc: '제품 적합성 기준' },
        { std: 'FDA_QMSR', clause: '§820.72(b)', desc: '검사 기준 설정' },
        { std: 'ISO_14971', clause: '§7.1', desc: '위험 통제 기준' },
      ],
      specMax: [
        { std: 'ISO_13485', clause: '§7.5.6', desc: '제품 적합성 기준' },
        { std: 'FDA_QMSR', clause: '§820.72(b)', desc: '검사 기준 설정' },
      ],
      criticality: [
        { std: 'ISO_14971', clause: '§5.4', desc: '위험 분석 — 심각도 평가' },
        { std: 'FDA_QMSR', clause: '§820.30(g)', desc: '설계 검증 위험 평가' },
      ],
      method: [
        { std: 'ISO_13485', clause: '§7.6', desc: '모니터링·측정 자원의 관리' },
        { std: 'AIAG_MSA', clause: '§I-3', desc: '측정 시스템 분석' },
      ],
    },
    actions: {
      create: [
        { std: 'ISO_13485', clause: '§4.2.4', desc: '문서 관리 — 신규 발행' },
        { std: 'PART_11', clause: '§11.10(e)', desc: '감사 추적 — 생성 기록' },
      ],
      update: [
        { std: 'ISO_13485', clause: '§4.2.4', desc: '문서 관리 — 변경 통제' },
        { std: 'FDA_QMSR', clause: '§820.40(b)', desc: '문서 변경' },
        { std: 'PART_11', clause: '§11.10(e)', desc: '감사 추적 — 변경 기록' },
      ],
      delete: [
        { std: 'ISO_13485', clause: '§4.2.5', desc: '기록 관리 — 폐기 통제' },
        { std: 'PART_11', clause: '§11.10(e)', desc: '감사 추적 — 삭제 기록' },
      ],
    },
  },

  /* ---------- 공정 블록 ---------- */
  processBlock: {
    entity: '공정 블록 (Process Block)',
    purpose: '제조 공정의 기본 단위',
    fields: {
      name: [
        { std: 'ISO_13485', clause: '§7.5.1', desc: '생산·서비스 제공의 통제' },
        { std: 'FDA_QMSR', clause: '§820.70', desc: '생산·공정 통제' },
      ],
      sopAuto: [
        { std: 'ISO_13485', clause: '§4.2.4', desc: '문서 관리' },
        { std: 'KGMP', clause: '제15조', desc: 'SOP 수립·운영' },
      ],
      standards: [
        { std: 'ISO_13485', clause: '§7.5.6', desc: '생산·서비스 제공의 유효성 확인' },
      ],
      risks: [
        { std: 'ISO_14971', clause: '§5.4', desc: '위해 식별' },
      ],
    },
    actions: {
      create: [
        { std: 'ISO_13485', clause: '§7.5.1', desc: '공정 정의·통제' },
      ],
      update: [
        { std: 'FDA_QMSR', clause: '§820.40(b)', desc: '문서 변경' },
        { std: 'PART_11', clause: '§11.10(e)', desc: '감사 추적' },
      ],
    },
  },

  /* ---------- 작업 지시 (Work Order) ---------- */
  workOrder: {
    entity: '작업 지시 (Work Order)',
    purpose: '특정 로트의 제조 지시',
    fields: {
      lotNumber: [
        { std: 'ISO_13485', clause: '§7.5.8', desc: '식별 — 일의적 식별' },
        { std: 'FDA_QMSR', clause: '§820.65', desc: '추적성' },
        { std: 'MDR', clause: 'Article 27', desc: 'UDI 추적' },
      ],
      quantity: [
        { std: 'ISO_13485', clause: '§7.5.1', desc: '생산 통제' },
      ],
    },
    actions: {
      create: [
        { std: 'ISO_13485', clause: '§7.5.1', desc: '생산 지시 발행' },
        { std: 'KGMP', clause: '제16조', desc: '제조 지시·기록서' },
      ],
      complete: [
        { std: 'ISO_13485', clause: '§7.5.1', desc: '생산 통제 — 완료 기록' },
      ],
    },
  },

  /* ---------- eBR 단계 (Stage) ---------- */
  stage: {
    entity: 'eBR 단계 (Electronic Batch Record Stage)',
    purpose: '공정의 단일 단계 실행 기록',
    fields: {
      measurements: [
        { std: 'ISO_13485', clause: '§8.2.4', desc: '제품 모니터링·측정' },
        { std: 'FDA_QMSR', clause: '§820.80', desc: '수입·공정·완성품 검사' },
        { std: 'PART_11', clause: '§11.10(b)', desc: 'ALCOA+ 데이터 무결성' },
      ],
      operatorSignature: [
        { std: 'PART_11', clause: '§11.50', desc: '서명 표시' },
        { std: 'PART_11', clause: '§11.70', desc: '서명-기록 연결' },
        { std: 'ANNEX_11', clause: '§14', desc: '전자 서명' },
      ],
    },
    actions: {
      start: [
        { std: 'ISO_13485', clause: '§7.5.1', desc: '생산 단계 시작' },
        { std: 'PART_11', clause: '§11.10(e)', desc: '시작 시각·작업자 기록' },
      ],
      sign: [
        { std: 'PART_11', clause: '§11.50/§11.70', desc: '전자 서명 + 기록 연결' },
        { std: 'ISO_13485', clause: '§4.2.5', desc: '기록 관리' },
        { std: 'ANNEX_11', clause: '§14', desc: '전자 서명' },
      ],
    },
  },

  /* ---------- CCR (Configuration Change Record) ---------- */
  changeRecord: {
    entity: '구성 변경 기록 (CCR)',
    purpose: '모든 정의·구성 변경의 추적',
    fields: {
      reason: [
        { std: 'ISO_13485', clause: '§4.2.4', desc: '문서 변경 사유 기록' },
      ],
      approvedBy: [
        { std: 'ISO_13485', clause: '§5.5', desc: '책임·권한 — 승인자' },
        { std: 'PART_11', clause: '§11.10(d)', desc: '권한 통제' },
      ],
    },
    actions: {
      create: [
        { std: 'ISO_13485', clause: '§4.2.4', desc: '변경 통제' },
        { std: 'FDA_QMSR', clause: '§820.40(b)', desc: '문서 변경 통제' },
        { std: 'PART_11', clause: '§11.10(e)', desc: '감사 추적' },
      ],
    },
  },

  /* ---------- NCR / CAPA ---------- */
  ncr: {
    entity: '부적합 보고서 (NCR)',
    purpose: '부적합품·이상 사항 보고',
    actions: {
      create: [
        { std: 'ISO_13485', clause: '§8.3', desc: '부적합 제품의 통제' },
        { std: 'FDA_QMSR', clause: '§820.90', desc: '부적합 제품' },
      ],
    },
  },
  capa: {
    entity: '시정·예방조치 (CAPA)',
    purpose: '근본 원인 분석 + 시정·예방',
    actions: {
      create: [
        { std: 'ISO_13485', clause: '§8.5.2/§8.5.3', desc: '시정·예방조치' },
        { std: 'FDA_QMSR', clause: '§820.100', desc: 'CAPA' },
      ],
    },
  },

  /* ---------- 사용자 권한 ---------- */
  userRole: {
    entity: '사용자 권한 (User Role)',
    purpose: '역할 기반 액세스 통제',
    fields: {
      level: [
        { std: 'ISO_13485', clause: '§5.5', desc: '책임·권한·소통' },
        { std: 'PART_11', clause: '§11.10(d)', desc: '시스템 액세스 제한' },
        { std: 'ISO_27001', clause: 'A.5.15/A.5.18', desc: '액세스 통제' },
      ],
    },
  },
}

/* ================================================================
   API
   ================================================================ */

/**
 * 엔티티 + 필드의 적용 규제 조회
 * @param {string} entityType - 'inspectionTemplate', 'workOrder', ...
 * @param {string} fieldName - 'specMin', 'measurements', ...
 * @returns {Array} [{ std, clause, desc }, ...]
 */
export function getFieldRegulations(entityType, fieldName) {
  const entity = ENTITY_REGULATIONS[entityType]
  if (!entity || !entity.fields) return []
  return entity.fields[fieldName] || []
}

/**
 * 엔티티 + 액션의 적용 규제 조회
 * @param {string} entityType - 'inspectionTemplate', 'workOrder', ...
 * @param {string} actionName - 'create', 'update', 'delete', 'sign', ...
 * @returns {Array} [{ std, clause, desc }, ...]
 */
export function getActionRegulations(entityType, actionName) {
  const entity = ENTITY_REGULATIONS[entityType]
  if (!entity || !entity.actions) return []
  return entity.actions[actionName] || []
}

/**
 * 표준 코드로 전체 정보 조회
 * @param {string} stdKey - 'ISO_13485', 'PART_11', ...
 * @returns {Object} { code, title, region }
 */
export function getStandard(stdKey) {
  return STANDARDS[stdKey] || null
}

/**
 * 규제 인용 표시 형식 (UI/PDF용)
 * @param {Array} regs - [{ std, clause, desc }]
 * @returns {string} "ISO 13485:2016 §7.5.6, 21 CFR 820.72(b)"
 */
export function formatCitations(regs) {
  if (!regs || regs.length === 0) return ''
  return regs
    .map((r) => {
      const s = STANDARDS[r.std]
      if (!s) return r.clause
      // Code에 §가 이미 포함된 경우는 clause만, 아니면 결합
      const codePart = s.code.replace(/\s*\(.*?\)\s*/, '') // 괄호 안 부연 제거
      return `${codePart} ${r.clause}`
    })
    .join(', ')
}

/**
 * 자동 생성 문서 끝에 첨부할 "준수 규제" 섹션 데이터
 * @param {string} entityType
 * @param {Array<string>} actions - 이 문서가 다루는 액션들
 * @returns {Object} { byStandard: {ISO_13485: [...], ...}, all: [...] }
 */
export function buildComplianceFooter(entityType, actions = ['create']) {
  const entity = ENTITY_REGULATIONS[entityType]
  if (!entity) return { byStandard: {}, all: [] }

  const all = []
  // 모든 필드 + 모든 지정 액션의 규제를 수집
  if (entity.fields) {
    Object.values(entity.fields).forEach((regs) => all.push(...regs))
  }
  actions.forEach((act) => {
    if (entity.actions && entity.actions[act]) {
      all.push(...entity.actions[act])
    }
  })

  // 표준별 그룹핑 + 중복 제거
  const byStandard = {}
  all.forEach((r) => {
    if (!byStandard[r.std]) byStandard[r.std] = new Set()
    byStandard[r.std].add(r.clause)
  })
  // Set → Array
  Object.keys(byStandard).forEach((k) => {
    byStandard[k] = [...byStandard[k]].map((clause) => ({ clause }))
  })

  return { byStandard, all }
}
