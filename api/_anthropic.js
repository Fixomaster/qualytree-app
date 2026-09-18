// api/_anthropic.js — Anthropic API 호출 공통 헬퍼 (서버 전용)
//
// 보안 원칙 (프로젝트 지침 §11.3, 21 CFR Part 11.10):
//  - API 키는 Vercel 환경변수 ANTHROPIC_API_KEY 로만 보관한다.
//    저장소·프론트엔드 번들에 키를 넣지 않는다 (이 저장소는 공개 저장소).
//  - 브라우저에서 api.anthropic.com 을 직접 호출하지 않는다. 반드시 이 서버
//    함수를 경유한다 (키 노출 방지 + 사용량 통제).
//
// 모델: 기본값은 환경변수로 덮어쓸 수 있고, 모델 ID가 잘못되었거나 조직에
// 제공되지 않는 경우 FALLBACKS 순서로 자동 재시도한다.
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const FALLBACKS = ['claude-haiku-4-5-20251001', 'claude-sonnet-5']

export function hasKey() {
  return !!process.env.ANTHROPIC_API_KEY
}

export function noKeyResponse(res) {
  return res.status(503).json({
    ok: false,
    error: 'no_key',
    message:
      'AI 기능이 아직 연결되지 않았습니다. 운영자가 Vercel 환경변수 ANTHROPIC_API_KEY 를 설정하면 바로 사용할 수 있습니다.',
  })
}

/**
 * Anthropic Messages API 호출.
 * @param {object} o
 * @param {string} o.prompt      사용자 프롬프트
 * @param {string} [o.system]    시스템 프롬프트
 * @param {string} [o.model]     모델 ID (없으면 기본값 → 실패 시 FALLBACKS)
 * @param {number} [o.maxTokens] 기본 1500
 * @param {number} [o.temperature]
 * @returns {Promise<{text:string, model:string, usage:object}>}
 * @throws {Error} err.status(HTTP 상태), err.code('no_key'|'upstream'|'network')
 */
export async function callAnthropic({ prompt, system, model, maxTokens = 1500, temperature }) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    const e = new Error('ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.')
    e.code = 'no_key'
    e.status = 503
    throw e
  }

  const candidates = []
  for (const m of [model, ...FALLBACKS]) if (m && !candidates.includes(m)) candidates.push(m)

  let lastErr = null
  for (const m of candidates) {
    let response
    try {
      response = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: m,
          max_tokens: maxTokens,
          ...(temperature != null ? { temperature } : {}),
          ...(system ? { system } : {}),
          messages: [{ role: 'user', content: prompt }],
        }),
      })
    } catch (e) {
      lastErr = Object.assign(new Error('AI 서버에 연결할 수 없습니다: ' + e.message), { code: 'network', status: 502 })
      continue
    }

    if (response.ok) {
      const data = await response.json()
      const text = (data.content || []).map((b) => b.text || '').join('').trim()
      return { text, model: data.model || m, usage: data.usage || {} }
    }

    const body = await response.text()
    // 모델 ID 문제(404 not_found)면 다음 후보로 재시도, 그 외는 즉시 중단
    const retriable = response.status === 404 || /model/i.test(body) && response.status === 400
    lastErr = Object.assign(new Error(friendly(response.status, body)), {
      code: 'upstream',
      status: response.status === 401 || response.status === 403 ? 502 : response.status,
      detail: body.slice(0, 300),
    })
    if (!retriable) break
  }
  throw lastErr || Object.assign(new Error('AI 호출 실패'), { code: 'upstream', status: 502 })
}

function friendly(status, body) {
  if (status === 401 || status === 403) return 'AI API 키가 유효하지 않습니다. 운영자에게 문의하세요.'
  if (status === 429) return 'AI 요청이 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.'
  if (status === 529 || status === 503) return 'AI 서버가 혼잡합니다. 잠시 후 다시 시도해 주세요.'
  if (/credit balance|billing/i.test(body)) return 'AI 사용 크레딧이 부족합니다. 운영자에게 문의하세요.'
  return 'AI 초안 생성에 실패했습니다 (' + status + ').'
}

/** 서버 함수에서 공통으로 쓰는 에러 응답 */
export function errorResponse(res, e) {
  const status = e.status || 500
  return res.status(status).json({
    ok: false,
    error: e.code || 'error',
    message: e.code === 'no_key' ? noKeyMessage : e.message,
    ...(e.detail ? { detail: e.detail } : {}),
  })
}

const noKeyMessage =
  'AI 기능이 아직 연결되지 않았습니다. 운영자가 Vercel 환경변수 ANTHROPIC_API_KEY 를 설정하면 바로 사용할 수 있습니다.'
