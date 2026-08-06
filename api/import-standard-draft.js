// Vercel Serverless Function — 수입관리기준서 섹션별 AI 초안 생성 (Anthropic Claude)
//
// 목적: ImportManagementStandardHub.jsx 편집 모달에서, 섹션별(목적·조직·외국제조소 관리 등)로
//       회사 정보를 바탕으로 초안 문구를 생성해 빈 섹션을 그대로 두는 문제를 완화한다.
//       결과는 반드시 사용자가 검토·수정 후 저장하며 자동 저장되지 않는다 (dhf-draft.js와 동일 패턴).
//
// 요청(POST): { sectionLabel, companyName, context }
// 응답: { ok, content, model } | { ok:false, error, message }

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = process.env.IMS_DRAFT_MODEL || 'claude-sonnet-5'

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'method' }); return }
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) { res.status(500).json({ ok: false, error: 'no_key', message: 'ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.' }); return }

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  if (!body || typeof body !== 'object') body = {}
  const sectionLabel = (body.sectionLabel || '').toString().trim()
  const companyName = (body.companyName || '').toString().trim()
  const context = (body.context || '').toString().trim()

  if (!sectionLabel) {
    res.status(400).json({ ok: false, error: 'bad_section', message: '섹션 정보가 없습니다.' })
    return
  }

  const factLines = [
    companyName ? `회사명: ${companyName}` : '',
    context ? `참고 내용(사용자 입력): ${context}` : '',
    `작성할 섹션: ${sectionLabel}`,
  ].filter(Boolean).join('\n')

  const system =
    'You are a Korean medical device import GMP (수입관리기준서) compliance expert familiar with 「의료기기법 시행규칙」과 수입 의료기기 GMP 심사 세부운영 가이드라인. ' +
    `주어진 정보를 바탕으로 수입관리기준서의 "${sectionLabel}" 섹션 본문 초안 1건을 작성한다.\n\n` +
    '다음 JSON 형식을 반드시 지킨다:\n' +
    '{"content":"실제 절차 문구(한국어, 4~8문장 또는 번호 매긴 절차 목록, 이 섹션에서 실제로 규정해야 할 구체적 절차·기준·책임을 서술)"}\n\n' +
    '규칙:\n' +
    '- 형식적인 문구가 아니라, 실제 심사에서 확인 가능한 구체적 절차와 기준(누가, 무엇을, 언제, 어떤 기준으로)을 포함해야 한다.\n' +
    '- 회사명이 주어지면 자연스럽게 반영하되, 지어낸 조직 부서명이나 담당자 이름은 사용하지 않는다.\n' +
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
        max_tokens: 900,
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
