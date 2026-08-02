// Vercel Serverless Function — 내부감사 체크리스트 항목 상세내용(점검 가이드) AI 초안 생성
//
// 목적: AuditHub의 감사 체크리스트 항목(ISO 13485 조항 + 항목명)만으로는 실제 감사원이
//       무엇을 확인해야 하는지 알기 어렵다. 조항·항목명을 근거로 "이 조항에서 통상적으로
//       확인하는 절차·기록·인터뷰 포인트" 가이드 문구 초안을 생성해, 감사원이 검토·수정 후
//       사용하게 한다(자동 저장 없음, 사용자 확인 필수).
// - 키는 Vercel 환경변수 ANTHROPIC_API_KEY 로만 보관.
// - 회사 고유 데이터는 입력에 없으므로, 모델은 일반적인 ISO 13485 감사 관행 가이드만 생성한다
//   (특정 회사 사실을 지어내지 않도록 프롬프트로 제약).
//
// 요청(POST): { iso, item, standard }
// 응답: { ok, detail, model } | { ok:false, error, message }

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = process.env.CHECKLIST_DETAIL_MODEL || 'claude-sonnet-5'

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'method' }); return }
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) { res.status(500).json({ ok: false, error: 'no_key', message: 'ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.' }); return }

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  if (!body || typeof body !== 'object') body = {}
  const iso = (body.iso || '').toString().trim()
  const item = (body.item || '').toString().trim()
  const standard = (body.standard || 'ISO 13485:2016').toString().trim()

  if (!iso || !item) {
    res.status(400).json({ ok: false, error: 'empty', message: '조항 번호 또는 항목명이 없습니다.' })
    return
  }

  const system =
    `You are an ${standard} 내부심사원 교육 전문가다. ` +
    '주어진 감사 체크리스트 항목(조항 번호 + 항목명)에 대해, 실제 내부감사에서 감사원이 ' +
    '무엇을 확인해야 하는지 안내하는 짧은 점검 가이드를 작성한다.\n\n' +
    '규칙:\n' +
    '- 일반적으로 이 조항에서 확인하는 절차서/기록/문서 종류, 인터뷰 확인 포인트, 흔한 부적합 사례를 3~5개 항목으로 간결하게 제시한다.\n' +
    '- 특정 회사의 실제 데이터·수치·문서명을 지어내지 않는다 (일반적인 감사 실무 기준만 서술).\n' +
    '- 한국어로 작성하고, 전체 200자 내외로 간결하게 작성한다.\n' +
    '- 출력은 순수 텍스트만 출력한다. 코드펜스, JSON, 서두 인사말 없이 본문만 출력한다.'

  const userMsg = `조항: ${iso}\n항목: ${item}`

  try {
    const r = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        system,
        messages: [{ role: 'user', content: userMsg }],
      }),
    })
    const j = await r.json()
    if (!r.ok) { res.status(502).json({ ok: false, error: 'upstream', message: (j && j.error && j.error.message) || ('HTTP ' + r.status) }); return }
    const raw = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim()

    if (!raw) {
      res.status(502).json({ ok: false, error: 'empty_result', message: 'AI가 상세내용을 생성하지 못했습니다.' })
      return
    }

    res.status(200).json({ ok: true, detail: raw, model: MODEL })
  } catch (e) {
    res.status(502).json({ ok: false, error: 'upstream', message: String((e && e.message) || e) })
  }
}
