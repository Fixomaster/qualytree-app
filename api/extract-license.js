// Vercel Serverless Function — 허가증 PDF 텍스트에서 인허가 핵심 정보 + 모델 목록 자동 추출 (Anthropic Claude)
//
// 목적: "기허가 제품 등록" 화면에서 허가증 PDF를 업로드하면(클라이언트에서 pdf.js로 텍스트만 추출해 전송),
//       AI가 품목명/분류번호/등급/허가번호/허가일과 모델(변형) 목록을 구조화하여 반환한다.
//       추출 결과는 항상 사용자가 폼에서 검토·수정할 수 있으며, 저장 여부는 사용자의 "등록 완료" 클릭으로 결정된다.
// - 키는 Vercel 환경변수 ANTHROPIC_API_KEY 로만 보관(프론트/저장소 미노출).
//
// 요청(POST): { text: string }  — PDF에서 추출한 원문 텍스트(클라이언트에서 pdf.js로 파싱)
// 응답: { ok, itemName, classNo, grade, licenseNo, issueDate, models:[{code,name}] } | { ok:false, error, message }

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = process.env.EXTRACT_MODEL || process.env.CLASSIFY_MODEL || 'claude-haiku-4-5-20251001'
const MAX_TEXT_CHARS = 12000

function extractJson(text) {
  const s = (text || '').trim()
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) return null
  try { return JSON.parse(s.slice(start, end + 1)) } catch { return null }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'method' }); return }
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) { res.status(500).json({ ok: false, error: 'no_key', message: 'ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.' }); return }

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  if (!body || typeof body !== 'object') body = {}
  const text = (body.text || '').toString().trim().slice(0, MAX_TEXT_CHARS)

  if (!text) { res.status(400).json({ ok: false, error: 'empty', message: 'PDF에서 텍스트를 추출하지 못했습니다.' }); return }

  const system =
    'You are a Korean medical device regulatory assistant. 아래는 식약처(MFDS) 의료기기 제조/수입 허가증(신고증) PDF에서 추출한 원문 텍스트다. ' +
    '이 텍스트에서 다음 정보를 찾아 JSON으로만 응답하라.\n\n' +
    '필드:\n' +
    '- itemName: 품목명 (예: "금속제 골고정용 나사")\n' +
    '- classNo: 품목(분류)번호 (예: "A11010.01")\n' +
    '- grade: 등급 — "1"|"2"|"3"|"4" 중 하나의 문자열(숫자만). 문서에 "3등급" 등으로 표기되어 있으면 숫자만 추출.\n' +
    '- licenseNo: 허가(신고)번호 (예: "제허 2024-00123호")\n' +
    '- issueDate: 허가일자 — YYYY-MM-DD 형식으로 변환(원문이 "2024년 3월 15일"이면 "2024-03-15"). 없으면 빈 문자열.\n' +
    '- models: 모델명/모델코드 목록 배열. 각 항목은 {"code":"모델코드 또는 규격", "name":"모델명(있으면)"}. ' +
    '문서에 별표(별첨) 모델 목록 표가 있으면 그 안의 모든 행을 빠짐없이 포함한다. 모델 구분이 없으면 빈 배열.\n\n' +
    '규칙:\n' +
    '- 문서에 없는 값은 절대 추측하지 말고 빈 문자열("") 또는 빈 배열([])로 둔다.\n' +
    '- 출력은 오직 JSON 객체 하나만: {"itemName":"","classNo":"","grade":"","licenseNo":"","issueDate":"","models":[{"code":"","name":""}]}\n' +
    '- 다른 설명, 코드펜스, 서두 텍스트를 절대 출력하지 않는다.'

  try {
    const r = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        system,
        messages: [{ role: 'user', content: text }],
      }),
    })
    const j = await r.json()
    if (!r.ok) { res.status(502).json({ ok: false, error: 'upstream', message: (j && j.error && j.error.message) || ('HTTP ' + r.status) }); return }
    const raw = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('')
    const parsed = extractJson(raw)
    if (!parsed) { res.status(502).json({ ok: false, error: 'parse', message: 'AI 응답을 해석하지 못했습니다.' }); return }

    const grade = ['1', '2', '3', '4'].includes(String(parsed.grade || '').trim()) ? String(parsed.grade).trim() : ''
    const models = Array.isArray(parsed.models)
      ? parsed.models
          .filter((m) => m && (m.code || m.name))
          .map((m) => ({ code: (m.code || '').toString().trim(), name: (m.name || '').toString().trim() }))
      : []

    res.status(200).json({
      ok: true,
      itemName: (parsed.itemName || '').toString().trim(),
      classNo: (parsed.classNo || '').toString().trim(),
      grade,
      licenseNo: (parsed.licenseNo || '').toString().trim(),
      issueDate: (parsed.issueDate || '').toString().trim(),
      models,
      model: MODEL,
    })
  } catch (e) {
    res.status(502).json({ ok: false, error: 'upstream', message: String((e && e.message) || e) })
  }
}
