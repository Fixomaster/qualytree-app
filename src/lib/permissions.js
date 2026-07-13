// 권한 시스템 — ISO 13485 §5.5 + 21 CFR Part 11 §11.10(d) + Project Instructions §13.13.3
// 3개 Level 기반 SoD(Segregation of Duties)
const KEY = 'qualytree.userLevel'

export const LEVELS = {
  OPERATOR: 1, // 작업자: 시작·측정·서명
  INSPECTOR: 2, // 검사관·QA: + 검토·재측정 요청
  MANAGER: 3, // 매니저·RA·품질경영대리인: + 정의·발행·삭제
}

export const LEVEL_LABEL = {
  1: { ko: '작업자', en: 'Operator', short: 'OP' },
  2: { ko: '검사관', en: 'Inspector', short: 'INS' },
  3: { ko: '매니저·RA', en: 'Manager / RA', short: 'MGR' },
}

// 액션별 최소 Level 매트릭스
// 모든 화면은 이 매트릭스를 단일 출처로 참조한다
export const PERMISSIONS = {
  // ===== ONB 영역 =====
  'onb.company.edit': LEVELS.MANAGER, // 회사 정보 변경
  'onb.product.edit': LEVELS.MANAGER, // 제품 정보 변경
  'onb.process.addBlock': LEVELS.MANAGER, // 사용자 공정 블록 추가
  'onb.process.deleteBlock': LEVELS.MANAGER, // 사용자 공정 블록 삭제
  'onb.process.addCategory': LEVELS.MANAGER, // 사용자 카테고리 추가
  'onb.process.deleteCategory': LEVELS.MANAGER, // 사용자 카테고리 삭제
  'onb.process.editCanvas': LEVELS.MANAGER, // 공정 순서 정의 (캔버스 편집)
  'onb.regulations.edit': LEVELS.MANAGER, // 다중 규제 변경
  'onb.roles.edit': LEVELS.MANAGER, // 역할 정의
  'onb.license.edit': LEVELS.MANAGER, // 제품별 허가증(인허가 문서) 관리
  'onb.sop.edit': LEVELS.MANAGER, // 작업표준서(SOP) 본문 작성·발효

  // ===== EQP 영역 (설비 · 시험장비 · 교정) =====
  'eq.equipment.edit': LEVELS.MANAGER, // 설비대장·예방보전계획·점검기록 변경
  'eq.testEquipment.edit': LEVELS.MANAGER, // 시험장비대장 변경
  'eq.calibration.edit': LEVELS.MANAGER, // 교정계획·교정성적서 변경

  // ===== OPS 영역 =====
  'ops.workOrder.create': LEVELS.MANAGER, // 새 작업 지시 발행
  'ops.workOrder.cancel': LEVELS.MANAGER, // 작업 지시 취소·보류
  'ops.workOrder.viewQueue': LEVELS.OPERATOR, // 큐 조회
  'ops.stage.start': LEVELS.OPERATOR, // 단계 시작
  'ops.stage.measure': LEVELS.OPERATOR, // 측정값 입력
  'ops.stage.sign': LEVELS.OPERATOR, // 전자서명
  'ops.inspection.defineTemplate': LEVELS.MANAGER, // 검사 항목 템플릿 정의
  'ops.inspection.editTemplate': LEVELS.MANAGER, // 검사 항목 템플릿 수정
  'ops.inspection.deleteTemplate': LEVELS.MANAGER, // 검사 항목 템플릿 삭제
  'ops.stage.addAdHocItem': LEVELS.MANAGER, // 작업 지시별 임시 항목 추가
  'ops.inspection.review': LEVELS.INSPECTOR, // 검사 결과 검토
  'ops.inspection.requestRemeasure': LEVELS.INSPECTOR, // 재측정 요청

  // ===== 향후 영역 (예약) =====
  'qms.ncr.review': LEVELS.INSPECTOR,
  'qms.capa.approve': LEVELS.MANAGER,
  'ra.submission.approve': LEVELS.MANAGER,
}

export const permissions = {
  /** 현재 사용자 Level — 미설정 시 1(작업자) 기본 */
  currentLevel() {
    try {
      const raw = localStorage.getItem(KEY)
      const n = parseInt(raw, 10)
      return n >= 1 && n <= 3 ? n : LEVELS.OPERATOR
    } catch {
      return LEVELS.OPERATOR
    }
  },

  setLevel(level) {
    if (![1, 2, 3].includes(level)) return
    localStorage.setItem(KEY, String(level))
  },

  /** Level n 이상 보유 여부 */
  hasLevel(n) {
    return this.currentLevel() >= n
  },

  /** 액션 키로 권한 확인 */
  can(action) {
    const required = PERMISSIONS[action]
    if (required == null) return true // 정의되지 않은 액션은 통과
    return this.currentLevel() >= required
  },

  /** 액션에 필요한 최소 Level 반환 */
  required(action) {
    return PERMISSIONS[action] ?? LEVELS.OPERATOR
  },

  /** 권한 부족 안내 메시지 */
  denyMessage(action) {
    const need = this.required(action)
    const cur = this.currentLevel()
    return `이 작업은 ${LEVEL_LABEL[need].ko}(Level ${need}) 권한이 필요합니다.\n현재 권한: ${LEVEL_LABEL[cur].ko}(Level ${cur})`
  },
}

/**
 * 권한 부족 시 호출할 수 있는 헬퍼
 * - true: 진행 가능
 * - false: 진행 차단 (alert도 자동 표시)
 */
export function requirePermission(action) {
  if (permissions.can(action)) return true
  alert(permissions.denyMessage(action))
  return false
}
