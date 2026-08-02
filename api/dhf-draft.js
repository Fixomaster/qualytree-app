// Vercel Serverless Function — DHF(설계이력파일) 기록 AI 초안 생성 (Anthropic Claude)
//
// 목적: DesignHistoryHub의 "기록 추가"에서, 설계 단계(기록 유형)와 제품 정보를 바탕으로
//       제목·설명 초안을 생성해 "했다~"만 입력하는 문제를 완화한다. 결과는 반드시 사용자가
//       검토·수정 후 저장하며, 자동 저장되지 않는다 (RiskHub의 risk-draft.js와 동일한 패턴).
// - 키는 Vercel 환경변수 ANTHROPIC_API_KEY 로만 보관(프론트/저장소 미노출).
// - itemType은 DesignHistoryHub.jsx의 ITEM_TYPES 고정 값 집합만 허용(환각 방지).
//
// 요청(POST): { productName, itemType, intendedUse, context }
// 응답: { ok, title, description, notes, model } | { ok:false, error, message }

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = process.env.DHF_DRAFT_MODEL || 'claude-sonnet-5'

// DesignHistoryHub.jsx의 ITEM_TYPES와 동일하게 유지할 것
const ITEM_TYPE_GUIDE = {
  input:        { label: '설계 입력', hint: '사용자 요구사항, 의도된 용도, 성능·안전 요구사항, 규제 요구사항 등 설계에 반영해야 할 입력 요건' },
  output:       { label: '설계 출력', hint: '설계 입력을 충족하는 구체적 산출물 — 사양서, 도면, 소프트웨어 명세, 라벨링, 제조 공정 요건 등' },
  review:       { label: '설계 검토', hint: '설계 출력이 설계 입력을 충족하는지에 대한 다기능팀 검토 결과, 발견된 이슈와 조치사항' },
  verification: { label: '설계 검증', hint: '설계 출력이 설계 입력 요건을 충족함을 객관적 증거로 확인한 방법과 결과(시험, 분석, 비교 등)' },
  validation:   { label: '유효성 확인', hint: '실제 사용 조건(또는 이를 시뮬레이션한 조건)에서 제품이 의도된 용도를 충족함을 확인한 방법과 결과' },
  transfer:     { label: '설계 이전', hint: '설계 산출물이 양산 사양으로 정확히 반영되었는지 확인한 절차와 결과(제조 공정 이관 검토 포함)' },
  change:       { label: '설계 변경', hint: '설계 변경의 배경, 변경 전후 비교, 영향평가(위험·성능·규제), 재검증·재밸리데이션 필요 여부' },
}

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
  const productName = (body.productName || '').toString().trim()
  const itemTypeRaw = (body.itemType || '').toString().trim()
  const intendedUse = (body.intendedUse || '').toString().trim()
  const context = (body.context || '').toString().trim()

  const itemType = ITEM_TYPE_GUIDE[itemTypeRaw] ? itemTypeRaw : null
  if (!itemType) {
    res.status(400).json({ ok: false, error: 'bad_type', message: '유효하지 않은 기록 유형입니다.' })
    return
  }
  if (!productName && !intendedUse && !context) {
    res.status(400).json({ ok: false, error: 'empty', message: '제품명, 의도된 용도, 참고 내용 중 하나 이상을 입력하세요.' })
    return
  }

  const guide = ITEM_TYPE_GUIDE[itemType]
  const factLines = [
    productName ? `제품명: ${productName}` : '',
    intendedUse ? `의도된 용도: ${intendedUse}` : '',
    context ? `참고 내용(사용자 입력): ${context}` : '',
    `기록 유형: ${guide.label}`,
  ].filter(Boolean).join('\n')

  const system =
    'You are an ISO 13485 §7.3 설계 및 개발 전문가다. 주어진 제품 정보를 바탕으로 DHF(설계이력파일)의 ' +
    `"${guide.label}" 단계 기록 초안 1건을 작성한다. 이 단계의 성격: ${guide.hint}\n\n` +
    '다음 JSON 형식을 반드시 지킨다:\n' +
    '{"title":"기록 제목(한국어, 20자 내외)","description":"실제 기록 내용(한국어, 3~6문장, 이 단계에서 실제로 확인·수행해야 할 구체적 내용을 서술)","notes":"참고사항(한국어, 1~2문장, 선택)"}\n\n' +
    '규칙:\n' +
    '- description은 "했다/완료함" 같은 형식적 문구가 아니라, 이 제품의 실제 특성에 맞는 구체적 내용(무엇을 어떤 기준으로 확인했는지)을 포함해야 한다.\n' +
    '- 이 제품 유형에 실제로 해당하지 않는 내용(예: 소프트웨어 없는 기구에 소프트웨어 검증)은 만들지 않는다.\n' +
    '- 출력은 오직 JSON 객체 하나만 출력한다. 다른 설명, 코드펜스, 서두 텍스트를 절대 출력하지 않는다.'

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

    // 환각 방지 — 서버에서 값 재검증
    const title = typeof parsed.title === 'string' ? parsed.title.trim() : ''
    const description = typeof parsed.description === 'string' ? parsed.description.trim() : ''
    const notes = typeof parsed.notes === 'string' ? parsed.notes.trim() : ''

    if (!title || !description) {
      res.status(502).json({ ok: false, error: 'empty_result', message: 'AI가 유효한 초안을 생성하지 못했습니다. 내용을 조금 더 구체적으로 입력해 다시 시도해주세요.' })
      return
    }

    res.status(200).json({ ok: true, title, description, notes, model: MODEL })
  } catch (e) {
    res.status(502).json({ ok: false, error: 'upstream', message: String((e && e.message) || e) })
  }
}
