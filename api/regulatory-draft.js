// Vercel Serverless Function — 인허가 신규신청 "필요 서류 목록" 항목별 AI 초안 생성 (Anthropic Claude)
//
// 목적: RegulatoryHub Step3(필요 서류 목록)에서, 각 서류 항목(예: 사용목적에 관한 자료,
//       성능에 관한 자료 등)에 대해 제품 정보를 바탕으로 메모/초안 문구를 생성해
//       빈 메모칸을 그대로 제출하는 문제를 완화한다. 결과는 반드시 사용자가 검토·수정
//       후 사용하며 자동 저장되지 않는다 (dhf-draft.js와 동일한 패턴).
//
// 요청(POST): { productName, productCode, grade, docLabel, context }
// 응답: { ok, content, model } | { ok:false, error, message }

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = process.env.REG_DRAFT_MODEL || 'claude-sonnet-5'

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'method' }); return }
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) { res.status(500).json({ ok: false, error: 'no_key', message: 'ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.' }); return }

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  if (!body || typeof body !== 'object') body = {}
  const productName = (body.productName || '').toString().trim()
  const productCode = (body.productCode || '').toString().trim()
  const grade = (body.grade || '').toString().trim()
  const docLabel = (body.docLabel || '').toString().trim()
  const context = (body.context || '').toString().trim()

  if (!docLabel) {
    res.status(400).json({ ok: false, error: 'bad_doc', message: '서류 항목 정보가 없습니다.' })
    return
  }
  if (!productName && !context) {
    res.status(400).json({ ok: false, error: 'empty', message: '품목명 또는 참고 내용 중 하나 이상을 입력하세요.' })
    return
  }

  const factLines = [
    productName ? `품목명: ${productName}` : '',
    productCode ? `분류번호: ${productCode}` : '',
    grade ? `등급: ${grade}등급` : '',
    context ? `참고 내용(사용자 입력): ${context}` : '',
    `작성할 서류: ${docLabel}`,
  ].filter(Boolean).join('\n')

  const system =
    'You are a Korean medical device regulatory affairs (인허가) expert familiar with MFDS 의료기기 허가·신고·심사 규정. ' +
    `주어진 품목 정보를 바탕으로 "${docLabel}"에 들어갈 준비 메모/초안 문구 1건을 작성한다.\n\n` +
    '다음 JSON 형식을 반드시 지킨다:\n' +
    '{"content":"실제 메모/초안 내용(한국어, 3~6문장, 이 서류에 실제로 포함되어야 할 구체적 내용과 준비 시 확인할 사항을 서술)"}\n\n' +
    '규칙:\n' +
    '- 형식적인 문구가 아니라, 이 품목의 실제 특성에 맞는 구체적 내용(어떤 근거자료가 필요하고 무엇을 확인해야 하는지)을 포함해야 한다.\n' +
    '- 이 품목 유형에 실제로 해당하지 않는 내용은 만들지 않는다.\n' +
    '- 출력은 오직 JSON 객체 하나만 출력한다. 다른 설명, 코드펜스, 서두 텍스트를 절대 출력하지 않는다.'

  function extractJson(text) {
    const s = (text || '').trim()
    const start = s.indexOf('{')
    const end = s.lastIndexOf('}')
    if (start === -1 || end === -1 || end < start) return null
    try { return JSON.parse(s.slice(start, end + 1)) } catch { return null }
  }

  try {
    const r = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        system,
        messages: [{ role: 'user', content: factLines }],
      }),
    })
    const j = await r.json()
    if (!r.ok) { res.status(502).json({ ok: false, error: 'upstream', message: (j && j.error && j.error.message) || ('HTTP ' + r.status) }); return }
    const raw = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('')
    const parsed = extractJson(raw)

    if (!parsed || typeof parsed !== 'object') {
      res.status(502).json({ ok: false, error: 'parse', message: 'AI 응답을 해석할 수 없습니다.' })
      return
    }

    const content = typeof parsed.content === 'string' ? parsed.content.trim() : ''
    if (!content) {
      res.status(502).json({ ok: false, error: 'empty_result', message: 'AI가 유효한 초안을 생성하지 못했습니다. 내용을 조금 더 구체적으로 입력해 다시 시도해주세요.' })
      return
    }

    res.status(200).json({ ok: true, content, model: MODEL })
  } catch (e) {
    res.status(502).json({ ok: false, error: 'upstream', message: String((e && e.message) || e) })
  }
}
