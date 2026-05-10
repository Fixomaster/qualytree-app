/**
 * 표준 역할 카탈로그 — 의료기기 QMS 빈출 역할
 *
 * 적용 표준:
 * - ISO 13485:2016 §5.5 (책임·권한·소통)
 * - 21 CFR 820.20(b)(2) (Management Responsibility)
 * - Project Instructions §13.13 (거버넌스), §13.13.3 (SoD)
 *
 * 사용:
 *   ONB-005에서 사용자가 역할을 선택하면 defaultLevel이 자동 추천된다.
 *   사용자는 추천 Level을 그대로 채택하거나, 회사 사정에 맞게 조정할 수 있다.
 *   조정 시 SoD 제약(예: 작업자 Level인데 매니저 권한 부여)이 위반되면 경고.
 */

import { LEVELS } from './permissions'

export const STANDARD_ROLES = [
  // ===== Level 1 — 생산·시험 실무 =====
  {
    id: 'role.operator.production',
    name: '생산 작업자',
    en: 'Production Operator',
    defaultLevel: LEVELS.OPERATOR,
    category: 'production',
    description: '제조 공정 단계 시작·측정값 입력·전자서명 (eBR 기록)',
    typicalActions: [
      'ops.stage.start',
      'ops.stage.measure',
      'ops.stage.sign',
    ],
    minLevel: LEVELS.OPERATOR,
    maxLevel: LEVELS.OPERATOR,
  },
  {
    id: 'role.operator.assembly',
    name: '조립 작업자',
    en: 'Assembly Operator',
    defaultLevel: LEVELS.OPERATOR,
    category: 'production',
    description: '부품 조립·체결 작업 + 1차 자가검사',
    typicalActions: ['ops.stage.start', 'ops.stage.measure', 'ops.stage.sign'],
    minLevel: LEVELS.OPERATOR,
    maxLevel: LEVELS.OPERATOR,
  },
  {
    id: 'role.operator.cleanroom',
    name: '청정실 작업자',
    en: 'Cleanroom Operator',
    defaultLevel: LEVELS.OPERATOR,
    category: 'production',
    description: '청정실 환경에서의 멸균·포장 작업',
    typicalActions: ['ops.stage.start', 'ops.stage.measure', 'ops.stage.sign'],
    minLevel: LEVELS.OPERATOR,
    maxLevel: LEVELS.OPERATOR,
  },

  // ===== Level 2 — 검사·QA =====
  {
    id: 'role.inspector.iqc',
    name: '수입검사 검사관 (IQC)',
    en: 'Incoming QC Inspector',
    defaultLevel: LEVELS.INSPECTOR,
    category: 'quality',
    description: '입고 자재 검사·CoA 검증·공급자 부적합 1차 평가',
    typicalActions: [
      'ops.inspection.review',
      'ops.inspection.requestRemeasure',
      'qms.ncr.review',
    ],
    minLevel: LEVELS.INSPECTOR,
    maxLevel: LEVELS.MANAGER,
  },
  {
    id: 'role.inspector.ipi',
    name: '공정검사 검사관 (IPI)',
    en: 'In-Process Inspector',
    defaultLevel: LEVELS.INSPECTOR,
    category: 'quality',
    description: '공정 중 측정값 검토·재측정 요청·NCR 1차 평가',
    typicalActions: [
      'ops.inspection.review',
      'ops.inspection.requestRemeasure',
      'qms.ncr.review',
    ],
    minLevel: LEVELS.INSPECTOR,
    maxLevel: LEVELS.MANAGER,
  },
  {
    id: 'role.inspector.lai',
    name: '출하검사 검사관 (LAI)',
    en: 'Final/Last Article Inspector',
    defaultLevel: LEVELS.INSPECTOR,
    category: 'quality',
    description: '완성품 최종 검사·출하 적합성 판정',
    typicalActions: [
      'ops.inspection.review',
      'ops.inspection.requestRemeasure',
      'qms.ncr.review',
    ],
    minLevel: LEVELS.INSPECTOR,
    maxLevel: LEVELS.MANAGER,
  },
  {
    id: 'role.qa.specialist',
    name: 'QA 스페셜리스트',
    en: 'QA Specialist',
    defaultLevel: LEVELS.INSPECTOR,
    category: 'quality',
    description: '내부심사 보조·문서 검토·CAPA 보조',
    typicalActions: ['ops.inspection.review', 'qms.ncr.review'],
    minLevel: LEVELS.INSPECTOR,
    maxLevel: LEVELS.MANAGER,
  },

  // ===== Level 3 — 관리·승인 =====
  {
    id: 'role.qa.manager',
    name: '품질경영대리인',
    en: 'Quality Management Representative',
    defaultLevel: LEVELS.MANAGER,
    category: 'management',
    description:
      '경영자 위임 품질 책임자. 모든 정의·승인·발행·CAPA 종결 권한. ISO 13485 §5.5.2 의무직.',
    typicalActions: [
      'ops.inspection.defineTemplate',
      'ops.workOrder.create',
      'qms.capa.approve',
      'ra.submission.approve',
    ],
    minLevel: LEVELS.MANAGER,
    maxLevel: LEVELS.MANAGER,
    isMandatory: true, // ISO 13485 의무 역할
  },
  {
    id: 'role.ra.manager',
    name: 'RA 책임자',
    en: 'Regulatory Affairs Manager',
    defaultLevel: LEVELS.MANAGER,
    category: 'management',
    description:
      '인허가 신청·보완·통지 대응. 다국가 인증 매핑 결정. PRRC(MDR Article 15) 겸임 가능.',
    typicalActions: ['ra.submission.approve', 'ops.inspection.defineTemplate'],
    minLevel: LEVELS.MANAGER,
    maxLevel: LEVELS.MANAGER,
  },
  {
    id: 'role.production.manager',
    name: '생산 매니저',
    en: 'Production Manager',
    defaultLevel: LEVELS.MANAGER,
    category: 'management',
    description: '작업 지시 발행·생산 일정·공정 정의 변경',
    typicalActions: [
      'ops.workOrder.create',
      'ops.workOrder.cancel',
      'ops.inspection.defineTemplate',
    ],
    minLevel: LEVELS.MANAGER,
    maxLevel: LEVELS.MANAGER,
  },
  {
    id: 'role.prrc',
    name: 'PRRC (MDR Article 15)',
    en: 'Person Responsible for Regulatory Compliance',
    defaultLevel: LEVELS.MANAGER,
    category: 'management',
    description: 'EU MDR 제15조 의무직. 적합성 평가·시판후 감시·Vigilance 보고 책임.',
    typicalActions: ['ra.submission.approve', 'qms.capa.approve'],
    minLevel: LEVELS.MANAGER,
    maxLevel: LEVELS.MANAGER,
  },
  {
    id: 'role.prai',
    name: 'PRAI (AI 책임자)',
    en: 'Person Responsible for AI',
    defaultLevel: LEVELS.MANAGER,
    category: 'management',
    description:
      'EU AI Act + 한국 AI 기본법 대응. AI 모델 카드·데이터 카드·인간 감독 게이트 책임.',
    typicalActions: ['qms.capa.approve'],
    minLevel: LEVELS.MANAGER,
    maxLevel: LEVELS.MANAGER,
  },
]

export const ROLE_CATEGORIES = [
  {
    id: 'production',
    name: '생산',
    en: 'Production',
    color: 'amber',
    desc: '제조 공정 직접 수행',
  },
  {
    id: 'quality',
    name: '품질·검사',
    en: 'Quality / Inspection',
    color: 'sky',
    desc: '검사·검토·NCR 평가',
  },
  {
    id: 'management',
    name: '관리·승인',
    en: 'Management / Approval',
    color: 'moss',
    desc: '정의·발행·승인·종결',
  },
]

/**
 * 표준 역할 ID로 카탈로그 항목 조회
 */
export function getStandardRole(id) {
  return STANDARD_ROLES.find((r) => r.id === id) || null
}

/**
 * 카테고리별 역할 목록
 */
export function getRolesByCategory(categoryId) {
  return STANDARD_ROLES.filter((r) => r.category === categoryId)
}

/**
 * SoD 검증 — 역할별 Level 매핑이 SoD 원칙을 위반하는지 확인
 *
 * 검증 규칙:
 * 1. 동일인이 매니저(L3)와 작업자(L1)를 동시에 가지면 SoD 위반 (한 명이 정의자 + 측정자가 됨)
 * 2. 동일인에게 Critical 검사 정의권 + 같은 항목 측정 서명권을 동시 부여 시 위반
 * 3. ISO 13485 의무직(품질경영대리인 등)이 미배정 시 경고
 *
 * @param {Array} roleAssignments - [{ standardRoleId, personName, email, level, ... }]
 * @returns {{ violations: [...], warnings: [...] }}
 */
export function validateSoD(roleAssignments) {
  const violations = []
  const warnings = []

  if (!Array.isArray(roleAssignments) || roleAssignments.length === 0) {
    return { violations, warnings }
  }

  // 사람별로 그룹핑 (이메일 기준, 없으면 이름)
  const byPerson = {}
  roleAssignments.forEach((r, idx) => {
    const key = r.email?.trim() || r.personName?.trim() || `unnamed-${idx}`
    if (!byPerson[key]) byPerson[key] = []
    byPerson[key].push(r)
  })

  // 검증 1: 동일인이 L3 + L1을 동시 보유
  Object.entries(byPerson).forEach(([key, roles]) => {
    const levels = new Set(roles.map((r) => r.level))
    if (levels.has(LEVELS.MANAGER) && levels.has(LEVELS.OPERATOR)) {
      violations.push({
        kind: 'sod-conflict',
        person: key,
        message: `${roles[0].personName || key}: 매니저(L3)와 작업자(L1) 권한을 동시 보유 — SoD 위반 (정의자가 측정자가 됨)`,
        severity: 'critical',
      })
    }
  })

  // 검증 2: ISO 13485 §5.5.2 의무직(품질경영대리인) 미배정 경고
  const hasQmsRep = roleAssignments.some(
    (r) => r.standardRoleId === 'role.qa.manager'
  )
  if (!hasQmsRep) {
    warnings.push({
      kind: 'mandatory-role-missing',
      message:
        'ISO 13485 §5.5.2: 품질경영대리인은 의무직입니다. 1명 이상 지정해주세요. (또는 보상 통제 §13.13.3 CC-1~5 적용)',
      severity: 'warning',
    })
  }

  // 검증 3: 1인 다역(영세 회사) — 정보성
  Object.entries(byPerson).forEach(([key, roles]) => {
    if (roles.length >= 3) {
      warnings.push({
        kind: 'multi-role',
        person: key,
        message: `${roles[0].personName || key}: ${roles.length}개 역할을 동시 보유. 영세 제조사인 경우 §13.13.3 보상 통제(CC-1~5) 채택 권장.`,
        severity: 'info',
      })
    }
  })

  return { violations, warnings }
}
