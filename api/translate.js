// Vercel Serverless Function — 한→영 규제문서 번역 프록시 (Anthropic Claude)
//
// 목적: 품질매뉴얼·절차서를 ISO 13485/KGMP/FDA/MDR 심사용 영문으로 번역.
// - 키는 Vercel 환경변수 ANTHROPIC_API_KEY 로만 보관(프론트/저장소 미노출).
// - 용어집(glossary)을 시스템 프롬프트에 주입해 규제 용어 일관성 확보.
// - 무저장: Anthropic API는 입력을 학습에 사용하지 않음.
//
// 요청(POST): { text: string, glossary?: [{ ko, en }] }
// 응답: { ok, text } | { ok:false, error, message }

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = process.env.TRANSLATE_MODEL || 'claude-haiku-4-5-20251001'

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'method' }); return }
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) { res.status(500).json({ ok: false, error: 'no_key', message: 'ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.' }); return }

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  if (!body || typeof body !== 'object') body = {}
  const text = (body.text || '').toString()
  const glossary = Array.isArray(body.glossary) ? body.glossary : []
  if (!text.trim()) { res.status(400).json({ ok: false, error: 'empty', message: '번역할 내용이 없습니다.' }); return }

  const glossLines = glossary
    .filter((g) => g && g.ko && g.en)
    .map((g) => `- ${g.ko} → ${g.en}`)
    .join('\n')

  const system =
    'You are a professional translator for medical device regulatory and quality management system (QMS) documents (ISO 13485, KGMP, FDA QMSR, EU MDR). ' +
    "Translate the user's Korean document into clear, formal English suitable for a notified body / regulatory submission.\n" +
    'Rules:\n' +
    '- Preserve the original structure EXACTLY: headings, numbering, indentation, line breaks, separators, tables, and clause references (e.g., "ISO 13485:2016 §7.5.6", "21 CFR 820.30").\n' +
    '- Do NOT add, remove, summarize, or comment. Translate faithfully and completely.\n' +
    '- Use standard regulatory/QMS terminology. Apply this glossary EXACTLY whenever a term appears:\n' +
    (glossLines || '(no glossary provided)') + '\n' +
    '- Keep proper nouns, company names, codes, numbers, dates, and clause citations unchanged.\n' +
    '- Output ONLY the translated English text. No preamble, no notes, no markdown code fences.'

  try {
    const r = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: 8192, system, messages: [{ role: 'user', content: text }] }),
    })
    const j = await r.json()
    if (!r.ok) { res.status(502).json({ ok: false, error: 'upstream', message: (j && j.error && j.error.message) || ('HTTP ' + r.status) }); return }
    const out = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim()
    res.status(200).json({ ok: true, text: out, model: MODEL })
  } catch (e) {
    res.status(502).json({ ok: false, error: 'upstream', message: String((e && e.message) || e) })
  }
}
