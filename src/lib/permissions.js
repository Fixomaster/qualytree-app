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
  // ===== ORG 영역 (회사·조직 문서) =====
  'company.docs.edit': LEVELS.MANAGER, // 회사문서함 (사업자등록증·제조업허가증·평면도·사진)
  'company.roledoc.edit': LEVELS.MANAGER, // 부서별 직무기술서·권한책임서
  'company.qm.edit': LEVELS.MANAGER, // 품질책임자 지정 정보 입력
  'company.qm.approve': LEVELS.MANAGER, // 품질책임자 지정 승인

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

  // ===== SUP 영역 (공급자관리) =====
  'sup.supplier.edit': LEVELS.MANAGER, // 공급자대장 변경
  'sup.evaluation.edit': LEVELS.MANAGER, // 공급자 평가·재평가 기록 변경

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

  // ===== AUD 영역 (내부심사) =====
  'audit.plan.edit': LEVELS.INSPECTOR, // 심사 계획 작성·수정
  'audit.plan.approve': LEVELS.MANAGER, // 심사 계획 승인 (체크리스트 자동 발행)
  'audit.checklist.edit': LEVELS.INSPECTOR, // 체크리스트 결과 입력
  'audit.report.edit': LEVELS.INSPECTOR, // 심사 보고서 작성
  'audit.report.approve': LEVELS.MANAGER, // 심사 보고서 승인 (심사 완료)
  'audit.finding.edit': LEVELS.INSPECTOR, // 시정조치 등록·CAPA 연계·종결

  // ===== TRN 영역 (교육훈련) =====
  'training.plan.edit': LEVELS.INSPECTOR, // 연간교육계획 작성
  'training.plan.approve': LEVELS.MANAGER, // 연간교육계획 승인
  'training.material.edit': LEVELS.INSPECTOR, // 교육자료 등록
  'training.session.edit': LEVELS.INSPECTOR, // 교육 실시·평가·참석기록
  'training.competency.edit': LEVELS.INSPECTOR, // 직원 역량평가·자격(자격증/면허) 관리

  // ===== MR 영역 (경영검토) =====
  'mr.review.edit': LEVELS.INSPECTOR, // 경영검토 준비(자료 집계·결정사항 작성)
  'mr.review.approve': LEVELS.MANAGER, // 경영검토 승인
  'mr.objective.edit': LEVELS.MANAGER, // 품질목표 등록·수정

  // ===== LOG 영역 (입출고·유통·이상사례) =====
  'logistics.edit': LEVELS.INSPECTOR, // 수입검사·입고·출고·유통기록, 이상사례 보고 입력

  // ===== IMPORT-GMP 영역 (외국제조소·GMP적합인정서·타기관실사자료) =====
  'importgmp.site.edit': LEVELS.INSPECTOR, // 외국제조소 등록·수정
  'importgmp.cert.edit': LEVELS.INSPECTOR, // GMP 적합인정서·타인증기관 실사자료 등록

  // ===== 향후 영역 (예약) =====
  'qms.ncr.review': LEVELS.INSPECTOR,
  'qms.ncr.investigate': LEVELS.INSPECTOR, // NCR 조사보고서 작성·수정
  'qms.capa.edit': LEVELS.INSPECTOR, // CAPA 원인분석·시정·예방·효과검증 기록
  'qms.capa.approve': LEVELS.MANAGER, // CAPA 최종 승인·종결
  'qms.quarantine.dispose': LEVELS.INSPECTOR, // 격리 항목 처분 (재검사 진행/폐기/특채/출하가능)
  'qms.quarantine.reworkApprove': LEVELS.MANAGER, // 격리 항목을 '재작업'으로 처분 — 매니저 승인 필요
  'qms.ccr.impactAssessment.edit': LEVELS.INSPECTOR, // CCR 영향평가서 작성·수정
  'qms.ccr.approve': LEVELS.MANAGER, // CCR 변경 승인/반려
  'qms.ccr.implement': LEVELS.INSPECTOR, // CCR 이행완료 처리
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
