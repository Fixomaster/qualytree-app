/**
 * Qualytree — 카드별 자동 생성 문서 라이브러리
 *
 * 각 카드 영역에서 시스템이 SSoT 데이터로부터 자동 생성할 수 있는 문서 목록.
 * 특허 P13 (다중 인증 시스템 동시 자동 문서 생성·배포)의 가시화 구현.
 *
 * 각 문서:
 *   - id, name: 문서 식별자·이름
 *   - description: 문서 설명
 *   - regulations: 적용 규제·표준
 *   - sources: 어느 SSoT 항목에서 데이터를 가져오는지 (QLP 양방향 링크)
 *   - mode: 'template' | 'autofill' | 'ai_draft' | 'guided'
 *     - template: 양식만 발행 (수기 작성용)
 *     - autofill: SSoT 데이터로 자동 채움 (검토만 필요)
 *     - ai_draft: AI 초안 (검토·승인 필수, §22 메타데이터 첨부)
 *     - guided: 객관식 선택지 기반 가이드 작성
 *   - readyWhen: (ctx) => boolean — 생성 가능 조건
 *   - markets: ['FDA', 'EU_MDR', 'KGMP', ...] — 적용 시장
 *
 * Phase A: 라이브러리 가시화 + 양식 다운로드만 동작
 * Phase B: 실제 SSoT 데이터로 자동 채움 + AI 초안 + 결정일지 메타데이터 첨부
 */

// 문서 생성 모드 상수
export const DOC_MODE = {
  TEMPLATE: 'template',
  AUTOFILL: 'autofill',
  AI_DRAFT: 'ai_draft',
  GUIDED: 'guided',
};

// 카드 ID별 문서 목록
export const CARD_DOCUMENTS = {
  // ① QMS
  qms: [
    { id: 'quality_manual', name: '품질매뉴얼', description: 'QMS 적용범위·면제사유·프로세스 맵·조직도 참조 포함',
      regulations: [{ s: 'ISO 13485', c: '§4.2.2' }, { s: 'KGMP', c: '제5조' }],
      sources: ['qmsManual', 'orgChart', 'qualityPolicy'], mode: DOC_MODE.AUTOFILL,
      readyWhen: ctx => ctx.procedures.qmsManual?.status === 'approved', markets: ['ALL'] },
    { id: 'quality_policy', name: '품질방침', description: '최고경영자 승인·공표일·게시 증빙',
      regulations: [{ s: 'ISO 13485', c: '§5.3' }, { s: 'FDA QMSR', c: '§820.20(a)' }],
      sources: ['qualityPolicy'], mode: DOC_MODE.GUIDED,
      readyWhen: () => true, markets: ['ALL'] },
    { id: 'quality_objectives', name: '품질목표 보고서', description: '목표·측정값·분기별 추이',
      regulations: [{ s: 'ISO 13485', c: '§5.4.1' }],
      sources: ['qualityObjectives', 'decisionLog'], mode: DOC_MODE.AUTOFILL,
      readyWhen: ctx => (ctx.procedures.qualityObjectives ?? []).length > 0, markets: ['ALL'] },
    { id: 'org_chart', name: '조직도·R&R 매트릭스', description: '부서별 책임권한 매트릭스',
      regulations: [{ s: 'ISO 13485', c: '§5.5.1' }, { s: 'FDA QMSR', c: '§820.20(b)(1)' }],
      sources: ['orgChart', 'qmsRoles'], mode: DOC_MODE.AUTOFILL,
      readyWhen: ctx => ctx.procedures.orgChart?.complete, markets: ['ALL'] },
    { id: 'mgmt_review_report', name: '경영검토 보고서', description: 'ISO 13485 §5.6 입력·출력 항목 자동 집계',
      regulations: [{ s: 'ISO 13485', c: '§5.6' }, { s: 'FDA QMSR', c: '§820.20(c)' }],
      sources: ['decisionLog', 'capaTracking', 'auditFindings', 'pmsData'], mode: DOC_MODE.AI_DRAFT,
      readyWhen: ctx => ctx.procedures.management_review?.status === 'effective', markets: ['ALL'] },
    { id: 'doc_control_sop', name: '문서관리 절차서', description: '작성·검토·승인·배포·개정·폐기',
      regulations: [{ s: 'ISO 13485', c: '§4.2.4' }, { s: 'FDA QMSR', c: '§820.40' }],
      sources: ['document_control'], mode: DOC_MODE.TEMPLATE,
      readyWhen: () => true, markets: ['ALL'] },
  ],

  // ② 설계
  design: [
    { id: 'design_dev_plan', name: '설계·개발 계획서 (DDP)', description: '단계·책임·인터페이스·검증 전략·게이트',
      regulations: [{ s: 'ISO 13485', c: '§7.3.2' }, { s: 'FDA QMSR', c: '§820.30(b)' }],
      sources: ['designDevPlan', 'products'], mode: DOC_MODE.GUIDED,
      readyWhen: () => true, markets: ['ALL'] },
    { id: 'dhf_index', name: 'DHF 인덱스 (양방향 연결망)', description: '설계입력·출력·검토·검증·밸리데이션·이전·변경 전체 인덱스 (특허2)',
      regulations: [{ s: 'ISO 13485', c: '§7.3.10' }, { s: 'FDA QMSR', c: '§820.30(j)' }],
      sources: ['designInputs', 'designOutputs', 'designReviews', 'designVerification', 'designValidation', 'designTransfer', 'designChanges'],
      mode: DOC_MODE.AUTOFILL,
      readyWhen: ctx => ctx.procedures.dhf?.indexed, markets: ['ISO13485', 'FDA', 'KGMP'] },
    { id: 'design_review_minutes', name: '설계검토 회의록', description: '독립 검토자 포함 회의록 + 결정사항',
      regulations: [{ s: 'ISO 13485', c: '§7.3.5' }],
      sources: ['designReviews', 'decisionLog'], mode: DOC_MODE.AUTOFILL,
      readyWhen: () => true, markets: ['ALL'] },
    { id: 'vv_report', name: 'V&V 보고서 (검증·밸리데이션)', description: '설계입력↔출력 추적성 매트릭스 + 검증·밸리데이션 결과',
      regulations: [{ s: 'ISO 13485', c: '§7.3.6+§7.3.7' }, { s: 'EU MDR', c: 'Annex II §6.1' }],
      sources: ['designVerification', 'designValidation', 'designInputs', 'designOutputs'],
      mode: DOC_MODE.AUTOFILL,
      readyWhen: ctx => ctx.procedures.designVerification?.coverage === 1, markets: ['ALL'] },
    { id: 'design_transfer_checklist', name: '설계 이전 체크리스트', description: '생산 부서 인수 + 서명',
      regulations: [{ s: 'ISO 13485', c: '§7.3.8' }, { s: 'FDA QMSR', c: '§820.30(h)' }],
      sources: ['designTransfer'], mode: DOC_MODE.TEMPLATE,
      readyWhen: () => true, markets: ['ALL'] },
    { id: 'ecn', name: 'ECN (Engineering Change Notice)', description: '설계 변경 통보서 + 영향평가 + CCR 연동',
      regulations: [{ s: 'ISO 13485', c: '§7.3.9' }, { s: 'FDA QMSR', c: '§820.30(i)' }],
      sources: ['designChanges', 'ccrLog'], mode: DOC_MODE.GUIDED,
      readyWhen: () => true, markets: ['ALL'] },
  ],

  // ③ 공급자
  supplier: [
    { id: 'supplier_eval_form', name: '공급자 평가서', description: '신규 공급자 평가 (능력·성능·QMS·위험 비례)',
      regulations: [{ s: 'ISO 13485', c: '§7.4.1' }, { s: 'FDA QMSR', c: '§820.50(a)(1)' }],
      sources: ['suppliers'], mode: DOC_MODE.GUIDED,
      readyWhen: () => true, markets: ['ALL'] },
    { id: 'asl', name: '승인 공급자 목록 (ASL)', description: '승인일·유효기간·범위·위험등급',
      regulations: [{ s: 'ISO 13485', c: '§7.4.1' }, { s: 'KGMP', c: '제22조' }],
      sources: ['approvedSupplierList', 'suppliers'], mode: DOC_MODE.AUTOFILL,
      readyWhen: ctx => (ctx.procedures.approvedSupplierList ?? []).length > 0, markets: ['ALL'] },
    { id: 'scar_form', name: 'SCAR 양식', description: '공급자 시정조치 요청 (NCR 자동 발의 시)',
      regulations: [{ s: 'ISO 13485', c: '§8.5.2+§7.4' }, { s: 'FDA QMSR', c: '§820.50+§820.100' }],
      sources: ['scarRecords'], mode: DOC_MODE.AUTOFILL,
      readyWhen: () => true, markets: ['ALL'] },
    { id: 'supplier_audit_report', name: '공급자 심사 보고서', description: 'Critical 공급자 3년 1회',
      regulations: [{ s: 'EU MDR', c: 'Annex IX §2.2.4' }, { s: 'ISO 13485', c: '§7.4.1(d)' }],
      sources: ['suppliers', 'auditFindings'], mode: DOC_MODE.AI_DRAFT,
      readyWhen: ctx => (ctx.personnel?.criticalSuppliers ?? []).length > 0, markets: ['EU_MDR', 'ISO13485'] },
    { id: 'sqr_report', name: 'SQR 리포트', description: 'IQC 합격률·납기·SCAR·인증 종합 자동 산출',
      regulations: [{ s: 'ISO 13485', c: '§8.4' }],
      sources: ['suppliers', 'iqcRecords', 'scarRecords'], mode: DOC_MODE.AUTOFILL,
      readyWhen: () => true, markets: ['ALL'] },
  ],

  // ④ 제조
  manufacturing: [
    { id: 'production_plan', name: '생산 계획', description: '제품군별 수요·자원·검사·기록 계획',
      regulations: [{ s: 'ISO 13485', c: '§7.5.1' }, { s: 'FDA QMSR', c: '§820.70(a)' }],
      sources: ['productionPlan'], mode: DOC_MODE.TEMPLATE,
      readyWhen: () => true, markets: ['ALL'] },
    { id: 'sop', name: 'SOP (제품×공정 매트릭스)', description: '②설계 출력·M2 공정정의에서 자동 발행',
      regulations: [{ s: 'ISO 13485', c: '§7.5.1' }],
      sources: ['sopMatrix', 'products', 'processBlocks'], mode: DOC_MODE.AUTOFILL,
      readyWhen: ctx => ctx.procedures.sopMatrix?.coverage > 0, markets: ['ALL'] },
    { id: 'work_order', name: '작업지시서 (WO)', description: 'eBR과 자동 연동, SOP 기반',
      regulations: [{ s: 'ISO 13485', c: '§7.5.1' }, { s: 'FDA QMSR', c: '§820.184' }],
      sources: ['workOrders', 'sopMatrix'], mode: DOC_MODE.AUTOFILL,
      readyWhen: () => true, markets: ['ALL'] },
    { id: 'ebr_dhr', name: 'eBR/DHR (전자 배치 기록)', description: 'Project Instructions §13.7 + 부록 E 보관기간 적용',
      regulations: [{ s: 'ISO 13485', c: '§4.2.5' }, { s: 'FDA QMSR', c: '§820.184' }],
      sources: ['batchRecords', 'measurements', 'inspections'], mode: DOC_MODE.AUTOFILL,
      readyWhen: () => true, markets: ['ALL'] },
    { id: 'env_monitoring_log', name: '환경모니터링 일지', description: '청정실 입자·미생물·온습도·차압 (해당 시)',
      regulations: [{ s: 'ISO 14644', c: '전체' }, { s: 'ISO 13485', c: '§6.4' }],
      sources: ['envMonitoring'], mode: DOC_MODE.AUTOFILL,
      readyWhen: ctx => ctx.products?.hasCleanRoom, markets: ['ALL'] },
    { id: 'process_validation', name: '공정 밸리데이션 보고서 (IQ/OQ/PQ)', description: '특수공정 — 멸균·용접·접착·열처리·CNC 등',
      regulations: [{ s: 'ISO 13485', c: '§7.5.6' }, { s: 'FDA QMSR', c: '§820.70(i)' }],
      sources: ['specialProcesses', 'validationRuns'], mode: DOC_MODE.AI_DRAFT,
      readyWhen: ctx => (ctx.procedures.specialProcesses ?? []).length > 0, markets: ['ALL'] },
  ],

  // ⑤ QC
  qc: [
    { id: 'equipment_list', name: '설비 목록', description: '설비명·자산번호·분류·제조사/모델·위치·부서·관리자·상태 (기반시설대장)',
      regulations: [{ s: 'ISO 13485', c: '§6.3' }, { s: 'FDA QMSR', c: '§820.70(g)' }],
      sources: ['equipmentList'], mode: DOC_MODE.AUTOFILL,
      readyWhen: ctx => (ctx.procedures.equipmentList ?? []).length > 0, markets: ['ALL'] },
    { id: 'test_equipment_list', name: '시험장비 목록', description: '측정범위·정확도·다음 교정일 포함 시험장비대장',
      regulations: [{ s: 'ISO 13485', c: '§7.6' }, { s: 'FDA QMSR', c: '§820.72(a)' }],
      sources: ['measurementEquipment'], mode: DOC_MODE.AUTOFILL,
      readyWhen: ctx => (ctx.procedures.measurementEquipment ?? []).length > 0, markets: ['ALL'] },
    { id: 'calibration_register', name: '교정 관리대장', description: '설비·시험장비 통합 — 교정계획(주기·차기일) + 교정성적서 이력',
      regulations: [{ s: 'ISO 13485', c: '§7.6' }, { s: 'FDA QMSR', c: '§820.72(b)' }, { s: 'KGMP', c: '제12조' }],
      sources: ['calibrationPlans', 'calibrationCertificates'], mode: DOC_MODE.AUTOFILL,
      readyWhen: ctx => ctx.procedures.calibrationCertificates === true || (ctx.procedures.calibrationPlanCount ?? 0) > 0, markets: ['ALL'] },
    { id: 'iqc_report', name: 'IQC 검사 성적서', description: '입고검사 결과 + CoA/CoC 자동 비교',
      regulations: [{ s: 'ISO 13485', c: '§7.4.3' }, { s: 'FDA QMSR', c: '§820.80(b)' }],
      sources: ['iqcRecords'], mode: DOC_MODE.AUTOFILL,
      readyWhen: () => true, markets: ['ALL'] },
    { id: 'ipi_lai_report', name: 'IPI/LAI 검사 성적서', description: '공정·출하 검사 결과 + 측정값',
      regulations: [{ s: 'ISO 13485', c: '§8.2.6' }, { s: 'FDA QMSR', c: '§820.80(c)+§820.80(d)' }],
      sources: ['inspectionRecords'], mode: DOC_MODE.AUTOFILL,
      readyWhen: () => true, markets: ['ALL'] },
    { id: 'spc_chart', name: 'SPC 관리도', description: 'Cp/Cpk·이상 트리거 + Trend Analysis',
      regulations: [{ s: 'ISO 13485', c: '§8.4' }, { s: 'FDA QMSR', c: '§820.250' }],
      sources: ['measurements', 'specs'], mode: DOC_MODE.AUTOFILL,
      readyWhen: ctx => ctx.manufacturing?.spcApplicable, markets: ['ALL'] },
    { id: 'msa_report', name: 'MSA 보고서 (Gage R&R)', description: 'AIAG MSA 4th Ed. 기준 자동 분석',
      regulations: [{ s: 'AIAG MSA 4th', c: '전체' }, { s: 'ISO 13485', c: '§7.6' }],
      sources: ['msaStudies'], mode: DOC_MODE.AI_DRAFT,
      readyWhen: ctx => ctx.procedures.msa?.complete, markets: ['ALL'] },
  ],

  // ⑥ NCR/CAPA
  ncr_capa: [
    { id: 'ncr_form', name: 'NCR 양식', description: '부적합 식별·격리·평가·처분',
      regulations: [{ s: 'ISO 13485', c: '§8.3' }, { s: 'FDA QMSR', c: '§820.90' }],
      sources: ['ncrRecords'], mode: DOC_MODE.GUIDED,
      readyWhen: () => true, markets: ['ALL'] },
    { id: 'capa_form', name: 'CAPA 양식', description: '시정조치 7단계 + 근본원인 분석 + 효과성 검증',
      regulations: [{ s: 'ISO 13485', c: '§8.5.2' }, { s: 'FDA QMSR', c: '§820.100(a)' }],
      sources: ['capaRecords'], mode: DOC_MODE.GUIDED,
      readyWhen: () => true, markets: ['ALL'] },
    { id: 'mrb_minutes', name: 'MRB 회의록', description: '재작업/수락/특별승인/폐기 처분 결정',
      regulations: [{ s: 'ISO 13485', c: '§8.3.2' }, { s: 'FDA QMSR', c: '§820.90(b)' }],
      sources: ['mrbDecisions'], mode: DOC_MODE.AUTOFILL,
      readyWhen: () => true, markets: ['ALL'] },
    { id: '8d_report', name: '8D 보고서', description: '8단계 문제해결 보고서 (Ford 8D)',
      regulations: [{ s: 'Industry Best Practice', c: '8D' }],
      sources: ['capaRecords'], mode: DOC_MODE.AI_DRAFT,
      readyWhen: () => true, markets: ['ALL'] },
    { id: 'trend_analysis_report', name: '트렌드 분석 보고서', description: 'NCR 분류별 트렌드 + 경영검토 자동 입력',
      regulations: [{ s: 'ISO 13485', c: '§8.4' }, { s: 'FDA QMSR', c: '§820.100(a)(1)' }],
      sources: ['ncrRecords', 'capaRecords'], mode: DOC_MODE.AUTOFILL,
      readyWhen: () => true, markets: ['ALL'] },
  ],

  // ⑦ 내부심사
  internal_audit: [
    { id: 'annual_audit_plan', name: '연간 내부심사 계획', description: '12개 카드 영역 100% 커버 매트릭스',
      regulations: [{ s: 'ISO 13485', c: '§8.2.4' }, { s: 'FDA QMSR', c: '§820.22' }],
      sources: ['internalAuditPlan'], mode: DOC_MODE.GUIDED,
      readyWhen: () => true, markets: ['ALL'] },
    { id: 'audit_checklist', name: '심사 체크리스트', description: '각 카드의 필수/선택/검증 항목 자동 변환',
      regulations: [{ s: 'ISO 13485', c: '§8.2.4' }],
      sources: ['gmpCards'], mode: DOC_MODE.AUTOFILL,
      readyWhen: () => true, markets: ['ALL'] },
    { id: 'audit_report', name: '심사 보고서', description: '관찰·부적합·OFI 분류 + 증거 + 후속조치',
      regulations: [{ s: 'ISO 13485', c: '§8.2.4+§4.2.5' }, { s: 'FDA QMSR', c: '§820.180' }],
      sources: ['auditFindings'], mode: DOC_MODE.AUTOFILL,
      readyWhen: () => true, markets: ['ALL'] },
    { id: 'followup_tracker', name: '후속조치 추적표', description: 'Major NC → CAPA 자동 연동 + 마감 카운트다운',
      regulations: [{ s: 'ISO 13485', c: '§8.2.4+§8.5.2' }],
      sources: ['auditFindings', 'capaRecords'], mode: DOC_MODE.AUTOFILL,
      readyWhen: () => true, markets: ['ALL'] },
  ],

  // ⑧ 교육
  training: [
    { id: 'competence_matrix', name: '역량 매트릭스', description: '역할별 학력·교육·경험·기량 요구사항',
      regulations: [{ s: 'ISO 13485', c: '§6.2' }, { s: 'FDA QMSR', c: '§820.25(a)' }],
      sources: ['competenceMatrix', 'qmsRoles'], mode: DOC_MODE.AUTOFILL,
      readyWhen: ctx => ctx.procedures.competenceMatrix?.coverage === 1, markets: ['ALL'] },
    { id: 'training_plan', name: '교육·훈련 계획', description: '역할별·신규/정기/특별 교육 12개월 일정',
      regulations: [{ s: 'ISO 13485', c: '§6.2' }],
      sources: ['trainingPlan'], mode: DOC_MODE.GUIDED,
      readyWhen: () => true, markets: ['ALL'] },
    { id: 'training_certificate', name: '교육 이수증', description: '출석·시험 결과·강사·일시·콘텐츠 버전',
      regulations: [{ s: 'ISO 13485', c: '§4.2.5+§6.2' }],
      sources: ['trainingRecords'], mode: DOC_MODE.AUTOFILL,
      readyWhen: () => true, markets: ['ALL'] },
    { id: 'qualification_cert', name: '자격 인증서', description: '검사원·청정실·SoD 역할별 자격 증명',
      regulations: [{ s: 'ISO 13485', c: '§6.2' }, { s: '21 CFR Part 11', c: '§11.10(d)' }],
      sources: ['personnelRecords', 'qualifications'], mode: DOC_MODE.AUTOFILL,
      readyWhen: () => true, markets: ['ALL'] },
  ],

  // ⑨ 인허가
  regulatory: [
    { id: 'sted', name: 'STED (Summary Technical Documentation)', description: 'IMDRF 표준 양식 + 다중 인증 동시 (특허 P13)',
      regulations: [{ s: 'IMDRF STED', c: '전체' }, { s: 'EU MDR', c: 'Annex II' }],
      sources: ['products', 'designDevPlan', 'dhf', 'clinicalEvaluationPlan', 'pmsPlan'],
      mode: DOC_MODE.AI_DRAFT,
      readyWhen: ctx => (ctx.products?.list?.length ?? 0) > 0, markets: ['EU_MDR', 'ISO13485', 'KGMP'] },
    { id: 'tech_doc', name: 'Technical Documentation (MDR Annex II/III)', description: 'EU MDR 적합성 평가용 — Annex II·III 전체 양식',
      regulations: [{ s: 'EU MDR', c: 'Annex II+III' }],
      sources: ['products', 'dhf', 'cerTemplates', 'pmsPlan', 'rmf'],
      mode: DOC_MODE.AI_DRAFT,
      readyWhen: ctx => ctx.certifications?.euMdr, markets: ['EU_MDR'] },
    { id: '510k_summary', name: '510(k) Summary', description: 'FDA Class II 신청 — eSTAR 전자 제출 양식',
      regulations: [{ s: '21 CFR 807 Subpart E', c: '전체' }, { s: 'FDA eSTAR', c: '2023~' }],
      sources: ['products', 'dhf', 'clinicalEvaluationPlan'],
      mode: DOC_MODE.AI_DRAFT,
      readyWhen: ctx => ctx.certifications?.fdaQmsr, markets: ['FDA'] },
    { id: 'estar_package', name: 'eSTAR 패키지', description: 'FDA 510(k) 전자 제출 ZIP 패키지',
      regulations: [{ s: 'FDA eSTAR', c: '2023~' }],
      sources: ['products', 'dhf', '510kSummary'],
      mode: DOC_MODE.AUTOFILL,
      readyWhen: ctx => ctx.certifications?.fdaQmsr, markets: ['FDA'] },
    { id: 'nb_submission_package', name: 'NB 제출 패키지', description: 'EU 인증기관 제출 — Technical Doc + QMS 증빙',
      regulations: [{ s: 'EU MDR', c: 'Annex IX' }],
      sources: ['products', 'dhf', 'qmsManual', 'pmsPlan'],
      mode: DOC_MODE.AUTOFILL,
      readyWhen: ctx => ctx.certifications?.euMdr, markets: ['EU_MDR'] },
    { id: 'mfds_application', name: 'MFDS 신청서', description: '한국 식약처 — 의료기기 통합정보시스템 양식',
      regulations: [{ s: '의료기기법', c: '§6' }],
      sources: ['products', 'qmsManual', 'kgmpDocs'],
      mode: DOC_MODE.AUTOFILL,
      readyWhen: ctx => ctx.certifications?.kgmp, markets: ['KGMP'] },
  ],

  // ⑩ UDI
  udi: [
    { id: 'udi_di_registry', name: 'UDI-DI 등록표', description: '모델·버전별 UDI-DI 마스터 데이터',
      regulations: [{ s: '21 CFR 830', c: '전체' }, { s: 'EU MDR', c: 'Article 27.3' }],
      sources: ['udiDi', 'products'], mode: DOC_MODE.AUTOFILL,
      readyWhen: ctx => (ctx.procedures.udiDi ?? []).length > 0, markets: ['FDA', 'EU_MDR', 'KGMP'] },
    { id: 'label_design', name: '라벨 시안', description: '시장별·인증별 라벨 양식 (HRI + AIDC 동시)',
      regulations: [{ s: '21 CFR 801', c: '전체' }, { s: 'EU MDR', c: 'Annex VI Part C' }],
      sources: ['labelTemplates', 'udiDi', 'products'], mode: DOC_MODE.AUTOFILL,
      readyWhen: ctx => ctx.procedures.labelTemplates?.coverage === 1, markets: ['ALL'] },
    { id: 'gudid_submission', name: 'GUDID 제출 양식', description: 'FDA ESG XML + HL7 SPL 표준',
      regulations: [{ s: '21 CFR 830 Subpart E', c: 'GUDID' }, { s: 'HL7 SPL', c: '전체' }],
      sources: ['udiDi', 'products'], mode: DOC_MODE.AUTOFILL,
      readyWhen: ctx => ctx.certifications?.fdaQmsr, markets: ['FDA'] },
    { id: 'eudamed_submission', name: 'EUDAMED UDI Module 제출', description: 'EU UDI 데이터베이스 등록',
      regulations: [{ s: 'EU MDR', c: 'Article 28' }],
      sources: ['udiDi', 'products'], mode: DOC_MODE.AUTOFILL,
      readyWhen: ctx => ctx.certifications?.euMdr, markets: ['EU_MDR'] },
    { id: 'implant_card', name: 'Implant Card (환자 카드)', description: '임플란트 — 환자에게 제공하는 정보 카드',
      regulations: [{ s: 'EU MDR', c: 'Article 18' }],
      sources: ['udiDi', 'products', 'implantInfo'], mode: DOC_MODE.AUTOFILL,
      readyWhen: ctx => ctx.products?.hasImplant && ctx.certifications?.euMdr, markets: ['EU_MDR'] },
  ],

  // ⑪ PMS
  pms: [
    { id: 'pms_plan', name: 'PMS 계획서', description: '제품별·인증별 — MDR Annex III §1.1(a) 6대 요소',
      regulations: [{ s: 'EU MDR', c: 'Annex III' }, { s: 'ISO 13485', c: '§8.2.1' }, { s: 'ISO/TR 20416', c: '전체' }],
      sources: ['pmsPlan', 'products'], mode: DOC_MODE.GUIDED,
      readyWhen: ctx => (ctx.products?.list ?? []).some(p => p.marketed), markets: ['ALL'] },
    { id: 'fda_mdr_report', name: 'FDA Form 3500A (MDR)', description: 'FDA 의료기기 보고서 — 30일 마감',
      regulations: [{ s: '21 CFR 803', c: '전체' }],
      sources: ['complaintRecords', 'vigilanceCases'], mode: DOC_MODE.AUTOFILL,
      readyWhen: ctx => ctx.certifications?.fdaQmsr, markets: ['FDA'] },
    { id: 'mir', name: 'MIR (Manufacturer Incident Report)', description: 'EU MDR Vigilance — 사망/중대상해 2·10일',
      regulations: [{ s: 'EU MDR', c: 'Article 87' }],
      sources: ['complaintRecords', 'vigilanceCases'], mode: DOC_MODE.AUTOFILL,
      readyWhen: ctx => ctx.certifications?.euMdr, markets: ['EU_MDR'] },
    { id: 'mfds_adverse_report', name: 'MFDS 부작용 보고서', description: '한국 — 사망 7일/기타 30일',
      regulations: [{ s: '의료기기법', c: '§31의5' }],
      sources: ['complaintRecords', 'vigilanceCases'], mode: DOC_MODE.AUTOFILL,
      readyWhen: ctx => ctx.certifications?.kgmp, markets: ['KGMP'] },
    { id: 'psur', name: 'PSUR (Periodic Safety Update Report)', description: 'Class IIa 2년 / IIb·III 1년 — MDCG 2022-21',
      regulations: [{ s: 'EU MDR', c: 'Article 86' }, { s: 'MDCG 2022-21', c: '전체' }],
      sources: ['pmsPlan', 'complaintRecords', 'vigilanceCases', 'pmcfData', 'rmf'],
      mode: DOC_MODE.AI_DRAFT,
      readyWhen: ctx => ctx.certifications?.euMdr && ctx.products?.hasClassIIa_plus, markets: ['EU_MDR'] },
    { id: 'trend_report_mdr', name: 'Trend Report (MDR §88)', description: '유의미한 빈도/심각도 증가 — 15일 이상 평가 후',
      regulations: [{ s: 'EU MDR', c: 'Article 88' }],
      sources: ['complaintRecords', 'signalDetection'],
      mode: DOC_MODE.AI_DRAFT,
      readyWhen: ctx => ctx.certifications?.euMdr, markets: ['EU_MDR'] },
    { id: 'fsca_notice', name: 'FSCA 통지문', description: '현장 안전 시정조치 — UDI 단위 자동 영향 범위',
      regulations: [{ s: 'EU MDR', c: 'Article 87' }, { s: '21 CFR 806', c: '전체' }],
      sources: ['fscaCases', 'udiDi'],
      mode: DOC_MODE.AI_DRAFT,
      readyWhen: () => true, markets: ['ALL'] },
  ],

  // ⑫ 임상평가
  clinical: [
    { id: 'cep', name: 'CEP (Clinical Evaluation Plan)', description: '제품별 — MDR Annex XIV Part A §1',
      regulations: [{ s: 'EU MDR', c: 'Article 61.3 + Annex XIV' }, { s: 'MDCG 2020-13', c: '전체' }],
      sources: ['clinicalEvaluationPlan', 'products', 'designInputs'], mode: DOC_MODE.GUIDED,
      readyWhen: () => true, markets: ['EU_MDR', 'KGMP'] },
    { id: 'cer', name: 'CER (Clinical Evaluation Report)', description: 'MDCG 2020-13 양식 + 다중 인증 동시 (특허 P13)',
      regulations: [{ s: 'EU MDR', c: 'Article 61.12 + Annex XIV' }, { s: 'MEDDEV 2.7/1 Rev.4', c: '전체' }],
      sources: ['clinicalDataSources', 'equivalenceAssessment', 'literatureReview', 'clinicalInvestigation', 'pmcfData', 'rmf'],
      mode: DOC_MODE.AI_DRAFT,
      readyWhen: ctx => (ctx.procedures.clinicalEvaluationPlan ?? []).length > 0, markets: ['EU_MDR'] },
    { id: 'equivalence_justification', name: '동등성 평가서 (3축)', description: '기술·생물학·임상 동등성 자동 비교 (MDCG 2020-5)',
      regulations: [{ s: 'EU MDR', c: 'Article 61.4' }, { s: 'MDCG 2020-5', c: '전체' }],
      sources: ['equivalenceAssessment', 'products'], mode: DOC_MODE.AI_DRAFT,
      readyWhen: () => true, markets: ['EU_MDR'] },
    { id: 'pmcf_report', name: 'PMCF 평가 보고서', description: '시판후 임상 추적 — CER·PSUR 자동 환류 (특허 P15)',
      regulations: [{ s: 'EU MDR', c: 'Annex XIV Part B' }],
      sources: ['pmcfData', 'pmsPlan', 'rmf'], mode: DOC_MODE.AI_DRAFT,
      readyWhen: ctx => ctx.certifications?.euMdr, markets: ['EU_MDR'] },
    { id: 'risk_benefit_analysis', name: '위험-이익 분석서', description: 'ISO 14971 §10 + RMF 자동 환류',
      regulations: [{ s: 'EU MDR', c: 'Annex I §1+§8' }, { s: 'ISO 14971', c: '§10' }],
      sources: ['riskBenefitAnalysis', 'rmf', 'pmsData', 'clinicalDataSources'],
      mode: DOC_MODE.AI_DRAFT,
      readyWhen: () => true, markets: ['ALL'] },
    { id: 'clinical_investigation_protocol', name: '임상시험 프로토콜', description: 'ISO 14155 GCP 준수 + IRB 제출용 (필요 시)',
      regulations: [{ s: 'ISO 14155', c: '전체' }, { s: 'EU MDR', c: 'Article 62~82' }],
      sources: ['clinicalInvestigation', 'cep'], mode: DOC_MODE.GUIDED,
      readyWhen: ctx => ctx.products?.anyProductRequiresClinicalTrial, markets: ['EU_MDR', 'FDA', 'KGMP'] },
  ],
};

/**
 * 문서가 생성 가능한 상태인지 평가
 */
export function isDocumentReady(doc, ctx) {
  try {
    return doc.readyWhen(ctx);
  } catch {
    return false;
  }
}

/**
 * 카드별 문서 라이브러리 가져오기
 */
export function getCardDocuments(cardId) {
  return CARD_DOCUMENTS[cardId] ?? [];
}

/**
 * 카드별 문서 생성 가능 비율 (KPI 위젯용)
 */
export function getCardDocReadiness(cardId, ctx) {
  const docs = getCardDocuments(cardId);
  if (docs.length === 0) return { total: 0, ready: 0, percent: 0 };
  const ready = docs.filter(d => isDocumentReady(d, ctx)).length;
  return { total: docs.length, ready, percent: Math.round((ready / docs.length) * 100) };
}

// 모드별 라벨·색상
export const MODE_META = {
  [DOC_MODE.TEMPLATE]: { label: '양식 발행', color: 'slate', desc: '빈 양식을 다운로드해 수기 작성' },
  [DOC_MODE.AUTOFILL]: { label: '자동 채움', color: 'emerald', desc: 'SSoT 데이터로 자동 채워짐, 검토만' },
  [DOC_MODE.AI_DRAFT]: { label: 'AI 초안', color: 'violet', desc: 'AI 초안 생성 + 인간 검토·승인 필수 (§22 메타데이터 첨부)' },
  [DOC_MODE.GUIDED]: { label: '가이드 작성', color: 'sky', desc: '객관식 선택지 기반 단계별 작성' },
};

export default {
  CARD_DOCUMENTS,
  DOC_MODE,
  MODE_META,
  isDocumentReady,
  getCardDocuments,
  getCardDocReadiness,
};
