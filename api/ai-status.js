// api/ai-status.js — AI 연결 상태 확인 (키 값은 절대 반환하지 않는다)
// GET /api/ai-status            → { ok, configured, model, keyHint }
// GET /api/ai-status?ping=1     → 실제 Anthropic 호출 1회로 키·모델 유효성 확인
//
// 운영자가 Vercel 환경변수 ANTHROPIC_API_KEY 를 설정했는지, 그 키로 호출이
// 실제 성공하는지 브라우저에서 바로 확인할 수 있게 하는 진단용 엔드포인트다.
import { callAnthropic } from './_anthropic.js'

export default async function handler(req, res) {
  const key = process.env.ANTHROPIC_API_KEY || ''
  const configured = !!key
  const model = process.env.AI_DRAFT_MODEL || 'claude-haiku-4-5-20251001'
  // 키 자체는 노출하지 않고, 설정 여부 확인용으로 앞 8자리만 (sk-ant-a…) 표시
  const keyHint = configured ? key.slice(0, 8) + '…(' + key.length + '자)' : null

  if (!configured) {
    return res.status(200).json({
      ok: true,
      configured: false,
      model,
      keyHint: null,
      message: 'ANTHROPIC_API_KEY 가 설정되지 않았습니다. Vercel → Settings → Environment Variables 에 추가하고 재배포하세요.',
    })
  }

  if (!req.query || req.query.ping !== '1') {
    return res.status(200).json({ ok: true, configured: true, model, keyHint, message: 'AI 키가 설정되어 있습니다.' })
  }

  try {
    const r = await callAnthropic({ prompt: 'OK 라고만 답하세요.', maxTokens: 16, model })
    return res.status(200).json({
      ok: true,
      configured: true,
      ping: 'success',
      model: r.model,
      keyHint,
      reply: r.text.slice(0, 40),
      message: 'AI 호출 성공 — 문서 생성 기능을 사용할 수 있습니다.',
    })
  } catch (e) {
    return res.status(200).json({
      ok: false,
      configured: true,
      ping: 'failed',
      model,
      keyHint,
      error: e.code || 'error',
      message: e.message,
      ...(e.detail ? { detail: e.detail } : {}),
    })
  }
}
