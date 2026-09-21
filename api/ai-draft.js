// api/ai-draft.js — Vercel Serverless Function
// 범용 AI 초안 생성 API — ISO 13485 QMS 문서 지원
// POST { docType, fields } → { ok, draft, model }
// 환경변수: ANTHROPIC_API_KEY (Vercel 대시보드에서 설정)

import { callAnthropic, callAnthropicJson, errorResponse } from '../lib/aiClient.js'

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

  mdr: (f) => `의료기기 시판후 안전관리(Vigilance) 전문가로서 이상사례 보고서(MDR) 초안을 한국어로 작성하세요.

제품명: ${f.productName || '미기재'}
발생일: ${f.incidentDate || '미기재'}
현재까지 파악된 사고 개요: ${f.summary || '미기재'}
환자 영향(파악된 경우): ${f.outcome || '미기재'}

출력은 JSON 객체 하나로만, 다음 키를 채웁니다.
- "eventDescription": 사고 경위를 [발생일]·[발생 장소]·[사고 경위]·[기기 상태] 순서로 정리. 추정은 '확인 필요'로 표기. 300~450자
- "cause": 임시 원인 분석 — 제조 공정 / 설계 / 사용자 오류 / 환경 요인 관점으로 각 1~2문장
- "corrective": 즉시 조치와 후속 조치(조사 계획, 유사 로트 확인, CAPA 발의 여부) 200~350자
- "reportType": "즉시보고" | "7일보고" | "15일보고" | "30일보고" 중 하나 (사망·중대상해 여부 기준)
- "reportTypeReason": 위 분류의 근거를 의료기기법 시행규칙·MDR 기준으로 1~2문장

규칙: 주어지지 않은 사실(시리얼번호, 환자 정보 등)은 만들지 않고 '확인 필요'로 남깁니다.`,

  roledoc: (f) => `ISO 13485 §5.5.1 조직·책임 전문가로서 아래 부서(직위)의 직무기술서와 권한·책임서 초안을 한국어로 작성하세요.

회사: ${f.company || '당사'}
제품 유형: ${f.productType || '의료기기'}
부서·직위: ${f.dept}
조직 구성(참고): ${f.orgTree || '미기재'}
품질책임자: ${f.qmRep || '미지정'}

출력은 JSON 객체 하나로만, 다음 두 키를 채웁니다.
- "jobDescription": 담당 업무(5~7개 항목), 필요 자격·역량, 보고 체계를 문장형으로. 300~450자.
- "authorityResponsibility": 의사결정 권한 범위와 품질 관련 책임을 ISO 13485 조항 근거(예: §7.4, §8.2.2)와 함께. 250~400자.

규칙: 사람 이름·직원 수 등 주어지지 않은 사실은 만들지 않습니다. 의료기기 제조사 QMS 문서 어투로 작성합니다.`,

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
  audit: (f) => `ISO 13485 §8.2.2 내부 감사 결과 보고서를 작성하라.

감사 범위: ${f.scope || '전체 QMS'}
감사 대상 부서: ${f.dept || '전 부서'}
ISO 조항: ${f.clause || 'ISO 13485 전체'}

아래 형식으로 작성:
1. 감사 개요 (일시, 감사원, 방법)
2. 주요 발견 사항 (적합, 관찰 사항, 부적합 사항)
3. 부적합 사항 상세 (ISO 조항 참조)
4. 권고 사항
5. 결론 및 후속 조치 요청`,

  calibration: (f) => `ISO 13485 §7.6 측정 장비 교정 기록 및 성적서를 작성하라.

장비명: ${f.equipment || '옵속'}
교정 방법: ${f.method || '외부 공인기관 위탁'}
교정 결과: ${f.result || '합격'}

다음을 작성:
1. 장비 식별 정보 (모델, 일련번호, 위치)
2. 교정 저용 범위 및 승인 기준
3. 교정 결과 요약 (주요 측정치, 불확도)
4. 합격/불합격 판정 근거
5. 다음 교정 예정일`,

  validation: (f) => `ISO 13485 §7.5.6 공정 유효성 확인(IQ/OQ/PQ) 요약 보고서를 작성하라.

대상 공정: ${f.process || '생산 공정'}
평가 유형: ${f.validationType || 'IQ + OQ + PQ'}
수용 기준: ${f.criteria || '규격서 기준'}

다음을 작성:
1. 유효성 확인 의도 및 범위
2. IQ(설치 적격성) 결과 요약
3. OQ(운전 적격성) 결과 요약
4. PQ(성능 적격성) 결과 및 수용 기준 대비 평가
5. 결론 (합격/불합격) 및 재유효성확인 계획`,

  inspection: (f) => `ISO 13485 §8.2.3/8.2.4 검사 기록서를 작성하라.

제품/자재: ${f.product || '옵속'}
코드/LOT: ${f.lot || '옵속'}
검사 결과: ${f.result || '합격'}

다음을 작성:
1. 검사 항목 목록 및 판정 기준
2. 각 항목별 측정값 및 승인 기준 대비 평가
3. 부적합 사항 (해당시)
4. 판정 결과 (합격/불합격/특체 승인)
5. 검사자 서명 및 승인자 확인`,

  manufacturing: (f) => `ISO 13485 §7.5 출시 승인/배치기록서(BPR) 듀문서 초안을 작성하라.

제품명: ${f.product || '옵속'}
LOT 번호: ${f.lot || '옵속'}
공정 단계: ${f.stage || '전체 공정'}

아래를 작성:
1. 배치 기본 정보 (수량, 일정, 작업자)
2. 주요 공정별 결과 기록
3. 공정 내 결함 및 처리
4. 환경 조건 실적 (온도, 습도 등)
5. 출하 판정 및 승인`,

}

export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  // GET = 연결 상태 확인 (키 값은 절대 반환하지 않는다)
  //   GET /api/ai-draft          → 키 설정 여부
  //   GET /api/ai-draft?ping=1   → 실제 Anthropic 호출 1회로 키·모델 검증
  if (req.method === 'GET') return status(req, res)

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const { docType, fields } = req.body || {}
  if (!docType || !DOC_PROMPTS[docType]) {
    return res.status(400).json({ ok: false, error: '지원하지 않는 문서 유형입니다.' })
  }

  const prompt = DOC_PROMPTS[docType](fields || {})

  // 두 필드를 구조화해 받아야 하는 유형은 JSON 경로로 호출한다
  if (docType === 'roledoc' || docType === 'mdr') {
    try {
      const r = await callAnthropicJson({ prompt, model: MODEL, maxTokens: 2500, expect: 'object' })
      const d = r.data || {}
      const pick = (k) => (typeof d[k] === 'string' ? d[k].trim() : '')
      const fieldsOut = docType === 'roledoc'
        ? { jobDescription: pick('jobDescription'), authorityResponsibility: pick('authorityResponsibility') }
        : { eventDescription: pick('eventDescription'), cause: pick('cause'), corrective: pick('corrective'),
            reportType: pick('reportType'), reportTypeReason: pick('reportTypeReason') }
      if (!Object.values(fieldsOut).some(Boolean)) {
        return res.status(502).json({ ok: false, error: 'empty_result', message: 'AI가 유효한 초안을 생성하지 못했습니다. 다시 시도해 주세요.' })
      }
      return res.status(200).json({
        ok: true, ...fieldsOut, model: r.model,
        meta: { model: r.model, generatedAt: new Date().toISOString(), docType, usage: r.usage },
      })
    } catch (e) { return errorResponse(res, e) }
  }

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

async function status(req, res) {
  const key = process.env.ANTHROPIC_API_KEY || ''
  const keyHint = key ? key.slice(0, 8) + '…(' + key.length + '자)' : null
  if (!key) {
    return res.status(200).json({
      ok: true, configured: false, model: MODEL,
      message: 'ANTHROPIC_API_KEY 가 설정되지 않았습니다. Vercel → Settings → Environment Variables 에 추가하고 재배포하세요.',
    })
  }
  if (!req.query || req.query.ping !== '1') {
    return res.status(200).json({ ok: true, configured: true, model: MODEL, keyHint, message: 'AI 키가 설정되어 있습니다. ?ping=1 을 붙이면 실제 호출로 검증합니다.' })
  }
  try {
    const r = await callAnthropic({ prompt: 'OK 라고만 답하세요.', maxTokens: 16, model: MODEL })
    return res.status(200).json({ ok: true, configured: true, ping: 'success', model: r.model, keyHint, reply: r.text.slice(0, 40), message: 'AI 호출 성공 — 문서 생성 기능을 사용할 수 있습니다.' })
  } catch (e) {
    return res.status(200).json({ ok: false, configured: true, ping: 'failed', model: MODEL, keyHint, error: e.code || 'error', message: e.message, ...(e.detail ? { detail: e.detail } : {}) })
  }
}
