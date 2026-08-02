// Vercel Serverless Function — ISO 14971 위험관리(FMEA) 항목 AI 초안 생성 (Anthropic Claude)
//
// 목적: 리스크관리(RiskHub) 위험 등록 시, 위험관리 경험이 없는 사용자도 제품/기능을 설명하는
//       짧은 문장만으로 위험요인(Hazard)·위험 상황·위해(Harm)·심각도·발생가능성·통제방법·저감조치
//       초안 여러 건을 받아 검토·수정 후 등록할 수 있게 한다. 모든 결과는 사용자 검토·승인이
//       필수이며, 자동 저장되지 않는다.
// - 키는 Vercel 환경변수 ANTHROPIC_API_KEY 로만 보관(프론트/저장소 미노출).
// - 심각도·발생가능성·위험유형·통제방법은 RiskHub.jsx의 고정 값 집합만 허용(환각 방지).
//
// 요청(POST): { productName, description }
// 응답: { ok, items: [{ category, hazard, hazardousSituation, harm, severity, probability, controlType, controlMeasure }], model }
//       | { ok:false, error, message }

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = process.env.RISK_DRAFT_MODEL || 'claude-sonnet-5'

// RiskHub.jsx와 동일하게 유지할 것
const RISK_CATEGORIES = [
  '생물학적', '전기적', '에너지', '기계적', '방사선', '소프트웨어',
  '사용 오류', '보관·운반', '생체적합성', '기타',
]
const SEVERITY = [
  { value: 1, label: '경미', desc: '일시적 불편, 자연 회복' },
  { value: 2, label: '소', desc: '가역적 상해, 의료 개입 불필요' },
  { value: 3, label: '중', desc: '가역적 상해, 의료 개입 필요' },
  { value: 4, label: '중대', desc: '비가역적 상해 / 영구 장애' },
  { value: 5, label: '치명', desc: '사망 또는 생명 위협' },
]
const PROBABILITY = [
  { value: 1, label: '거의없음', desc: '< 1/100,000' },
  { value: 2, label: '낮음', desc: '1/100,000 ~ 1/10,000' },
  { value: 3, label: '보통', desc: '1/10,000 ~ 1/1,000' },
  { value: 4, label: '높음', desc: '1/1,000 ~ 1/100' },
  { value: 5, label: '매우높음', desc: '> 1/100' },
]
const CONTROL_TYPES = ['inherent', 'protective', 'information', 'none']
const CONTROL_LABEL = { inherent: '고유 안전 설계', protective: '보호 수단', information: '안전 정보 제공', none: '미조치' }

function extractJson(text) {
  const s = (text || '').trim()
  const start = s.indexOf('[')
  const end = s.lastIndexOf(']')
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
  const description = (body.description || '').toString().trim()

  if (!productName && !description) {
    res.status(400).json({ ok: false, error: 'empty', message: '제품명 또는 설명이 없습니다.' })
    return
  }

  const factLines = [
    productName ? `제품명: ${productName}` : '',
    description ? `제품/기능 설명: ${description}` : '',
  ].filter(Boolean).join('\n')

  const system =
    'You are an ISO 14971 의료기기 위험관리(Risk Management) 전문가다. ' +
    '주어진 제품 정보를 바탕으로 이 제품에서 실제로 발생 가능성이 높은 위험 항목(FMEA 관점) 초안을 4~6건 작성한다.\n\n' +
    '각 항목은 다음 형식을 반드시 지킨다:\n' +
    '- category: 아래 목록 중 하나만 사용 — ' + RISK_CATEGORIES.join(', ') + '\n' +
    '- hazard: 위해를 유발할 수 있는 잠재적 원인(Hazard), 한국어 15자 내외\n' +
    '- hazardousSituation: 위험요인이 실제로 발생하는 구체적 상황(Hazardous Situation), 한국어 1문장\n' +
    '- harm: 실제로 발생하는 피해(Harm), 한국어 1문장\n' +
    '- severity: 1~5 정수. 기준 — ' + SEVERITY.map(s => `${s.value}=${s.label}(${s.desc})`).join(' / ') + '\n' +
    '- probability: 1~5 정수. 기준 — ' + PROBABILITY.map(p => `${p.value}=${p.label}(${p.desc})`).join(' / ') + '\n' +
    '- controlType: 아래 중 하나만 — ' + CONTROL_TYPES.map(c => `${c}(${CONTROL_LABEL[c]})`).join(', ') + '\n' +
    '- controlMeasure: 구체적인 저감 조치 내용, 한국어 1~2문장\n\n' +
    '규칙:\n' +
    '- 이 제품 유형에 실제로 해당하지 않는 위험(예: 소프트웨어 없는 기구에 소프트웨어 위험)은 만들지 않는다.\n' +
    '- category/severity/probability/controlType은 반드시 위 지정된 값만 사용한다(다른 값 절대 금지).\n' +
    '- 출력은 오직 JSON 배열 하나만 출력한다. 예: [{"category":"...","hazard":"...","hazardousSituation":"...","harm":"...","severity":3,"probability":2,"controlType":"protective","controlMeasure":"..."}]\n' +
    '- 다른 설명, 코드펜스, 서두 텍스트를 절대 출력하지 않는다.'

  try {
    const r = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1800,
        system,
        messages: [{ role: 'user', content: factLines }],
      }),
    })
    const j = await r.json()
    if (!r.ok) { res.status(502).json({ ok: false, error: 'upstream', message: (j && j.error && j.error.message) || ('HTTP ' + r.status) }); return }
    const raw = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('')
    const parsed = extractJson(raw)

    if (!Array.isArray(parsed)) {
      res.status(502).json({ ok: false, error: 'parse', message: 'AI 응답을 해석할 수 없습니다.' })
      return
    }

    // 환각 방지 — 서버에서 값 재검증 후 유효한 항목만 반환
    const sevValues = SEVERITY.map(s => s.value)
    const probValues = PROBABILITY.map(p => p.value)
    const items = parsed
      .map((it) => {
        if (!it || typeof it !== 'object') return null
        const category = RISK_CATEGORIES.includes(it.category) ? it.category : '기타'
        const hazard = typeof it.hazard === 'string' ? it.hazard.trim() : ''
        const hazardousSituation = typeof it.hazardousSituation === 'string' ? it.hazardousSituation.trim() : ''
        const harm = typeof it.harm === 'string' ? it.harm.trim() : ''
        const severity = sevValues.includes(Number(it.severity)) ? Number(it.severity) : 3
        const probability = probValues.includes(Number(it.probability)) ? Number(it.probability) : 3
        const controlType = CONTROL_TYPES.includes(it.controlType) ? it.controlType : 'none'
        const controlMeasure = typeof it.controlMeasure === 'string' ? it.controlMeasure.trim() : ''
        if (!hazard || !harm) return null
        return { category, hazard, hazardousSituation, harm, severity, probability, controlType, controlMeasure }
      })
      .filter(Boolean)
      .slice(0, 6)

    if (items.length === 0) {
      res.status(502).json({ ok: false, error: 'empty_result', message: 'AI가 유효한 위험 항목을 생성하지 못했습니다. 설명을 조금 더 구체적으로 입력해 다시 시도해주세요.' })
      return
    }

    res.status(200).json({ ok: true, items, model: MODEL })
  } catch (e) {
    res.status(502).json({ ok: false, error: 'upstream', message: String((e && e.message) || e) })
  }
}
