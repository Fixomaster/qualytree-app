// api/ai-draft.js — Vercel Serverless Function
// 범용 AI 초안 생성 API — ISO 13485 QMS 문서 지원
// POST { docType, fields } → { ok, draft, model }
// 환경변수: ANTHROPIC_API_KEY (Vercel 대시보드에서 설정)

import { callAnthropic, errorResponse } from './_anthropic.js'

const MODEL = process.env.AI_DRAFT_MODEL || 'claude-haiku-4-5-20251001'

const DOC_PROMPTS = {
  sop: (f) => `당신은 ISO 13485 품질경영시스템 전문가입니다.
다음 정보를 바탕으로 작업표준서(SOP) 초안을 한국어로 작성하세요.

제목: ${f.title}
목적: ${f.purpose}
적용 부서: ${f.dept}
관련 ISO 조항: ${f.iso || '해당 조항 기재'}

다음 항목을 포함하여 SOP를 작성하세요:
1. 목적 (2-3문장)
2. 적용 범위
3. 책임 및 권한
4. 절차 (단계별, 5-8단계)
5. 관련 문서 및 기록
6. 변경이력 안내

간결하고 실용적으로 작성하세요.`,

  capa: (f) => `ISO 13485 품질 전문가로서 CAPA(시정·예방조치) 보고서 초안을 작성하세요.

부적합 유형: ${f.type}
발생 부서: ${f.dept}
문제 현상: ${f.description}

다음을 포함하세요:
1. 근본원인 분석 (5Why 또는 특성요인도 방법론 활용, 3-5가지 가능 원인 나열)
2. 즉각 시정조치 (containment)
3. 재발방지 조치 (3-5가지 구체적 조치)
4. 유효성 확인 방법
5. 완료 예상 기간`,

  risk: (f) => `ISO 14971 위험관리 전문가로서 위험 평가 초안을 작성하세요.

제품명: ${f.product}
위험 상황: ${f.hazard}
의도된 용도: ${f.use}

다음을 포함하세요:
1. 위험 식별 및 원인
2. 위험 상황 시나리오
3. 심각도 평가 (1-5) 및 근거
4. 발생 가능성 평가 (1-5) 및 근거
5. 초기 위험 등급 (S×P)
6. 위험 완화 방안 (3가지 이상)
7. 잔류 위험 평가`,

  complaint: (f) => `ISO 13485 §8.2.1 고객불만 처리 전문가로서 불만 조사 보고서 초안을 작성하세요.

불만 유형: ${f.type}
제품명: ${f.product}
고객 진술: ${f.description}

다음을 포함하세요:
1. 불만 요약
2. 초기 평가 (의료기기 위해성 여부 포함)
3. 조사 방법
4. 원인 분석
5. 시정조치 방향
6. 규제 기관 보고 필요 여부 판단`,

  change: (f) => `ISO 13485 §4.1.4 변경관리 전문가로서 변경요청서(CCR) 초안을 작성하세요.

변경 유형: ${f.type}
변경 대상: ${f.target}
변경 이유: ${f.reason}

다음을 포함하세요:
1. 변경 내용 상세 기술
2. 변경 필요성 및 기대 효과
3. 영향 평가 (품질/안전/규제 측면)
4. 유효성 확인 방법
5. 관련 문서 갱신 목록`,

  supplier: (f) => `ISO 13485 §7.4 공급업체 관리 전문가로서 공급업체 평가 보고서 초안을 작성하세요.

공급업체명: ${f.name}
공급 품목: ${f.item}
평가 유형: ${f.evalType}

다음을 포함하세요:
1. 공급업체 개요
2. 품질 시스템 평가 (인증 현황)
3. 납기 및 가격 경쟁력
4. 주요 발견사항
5. 합격/조건부합격/불합격 판정 및 근거
6. 향후 관리 계획`,

  ncr: (f) => `ISO 13485 §8.3 부적합 관리 전문가로서 부적합보고서(NCR) 초안을 한국어로 작성하세요.

발견 부서: ${f.department || f.dept || '미기재'}
제품/공정: ${f.product || '미기재'}
부적합 내용: ${f.description || '미기재'}
발견일: ${f.date || '미기재'}

다음을 포함하세요:
1. 부적합 요약 (사실만, 1-2문장)
2. 발견 경위 및 해당 검사 단계
3. 영향 범위 (같은 로트·이후 공정 포함 여부, 격리 필요성)
4. 임시 조치(containment)
5. 처리 방향 제안 (재작업 / 특별채택 / 폐기 중 근거와 함께)
6. CAPA 발의 필요성 판단
ISO 13485 조항 근거를 괄호로 함께 적으세요.`,

  qm: (f) => `ISO 13485 품질매뉴얼 전문가로서 품질매뉴얼 해당 섹션 초안을 작성하세요.

ISO 조항: ${f.section}
회사명: ${f.company || '당사'}
제품 유형: ${f.productType}

해당 ISO 13485 조항에 따라 회사의 QMS 방침·절차·범위를 포괄하는 품질매뉴얼 섹션을 작성하세요.
400-600자 분량의 전문적이고 규제 적합한 내용으로 작성하세요.`,
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const { docType, fields } = req.body || {}
  if (!docType || !DOC_PROMPTS[docType]) {
    return res.status(400).json({ ok: false, error: '지원하지 않는 문서 유형입니다.' })
  }

  const prompt = DOC_PROMPTS[docType](fields || {})

  try {
    const r = await callAnthropic({ prompt, model: MODEL, maxTokens: 1500 })
    return res.status(200).json({
      ok: true,
      draft: r.text,
      model: r.model,
      // §22 AI 거버넌스 — AI 산출물 메타데이터 (모델·생성일시·문서유형)
      meta: { model: r.model, generatedAt: new Date().toISOString(), docType, usage: r.usage },
    })
  } catch (e) {
    return errorResponse(res, e)
  }
}
