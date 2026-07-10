// Vercel Serverless Function — AI 기반 의료기기 인허가 업종(대분류·중분류) 추천 (Anthropic Claude)
//
// 목적: 온보딩 "제품 등록"에서 제품명(및 특성)을 입력하면 사전 정의된 MDCAT 분류표 안에서
//       가장 가까운 대분류·중분류를 AI가 추천한다. 최종 선택은 항상 사용자가 검토·수정할 수 있다.
// - 키는 Vercel 환경변수 ANTHROPIC_API_KEY 로만 보관(프론트/저장소 미노출).
// - 분류는 아래 MDCAT 표에 정의된 값만 허용(환각 방지) — 서버에서 결과를 검증 후 반환.
//
// 요청(POST): { name, itemName?, contact?, software?, sterile?, grade? }
// 응답: { ok, cat1, cat2, confidence } | { ok:false, error, message }

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = process.env.CLASSIFY_MODEL || 'claude-haiku-4-5-20251001'

// Onboarding.jsx의 MDCAT 표와 동일하게 유지할 것 (식약처 분류 기반 인허가 업종: 대분류 → 중분류)
const MDCAT = {
  '기구·기계': ['진료용 기기', '수술용 기기', '정형용품', '영상진단장치', '측정·감시장치', '물리치료·재활기기', '안과용 기기', '내시경·광학기기', '기타'],
  '의료용품': ['주사기·주사침', '카테터·튜브', '봉합사·결찰재', '수액·수혈세트', '거즈·드레싱', '콘택트렌즈', '기타'],
  '체외진단의료기기': ['생화학 검사', '면역 검사', '분자진단(NAT)', '혈액·혈당 검사', '자가검사', '기타'],
  '치과재료': ['충전·수복재료', '인상재', '의치·교정재료', '임플란트', '기타'],
  '소프트웨어·디지털(SaMD)': ['진단보조 SW', 'AI 영상분석', '환자 모니터링', '디지털치료기기(DTx)', '기타'],
  '기타': [],
}
const MDCAT1 = Object.keys(MDCAT)

const CONTACT_LABEL = { none: '신체 비접촉', surface: '피부·점막 접촉', external: '체내 통신(혈류 등)', implantable: '임플란트(이식)' }
const SW_LABEL = { none: 'SW 없음', embedded: '내장 SW', samd: '독립형 SW (SaMD)' }

function buildTaxonomyText() {
  return MDCAT1.map((c1) => `- ${c1}: ${(MDCAT[c1] || []).join(', ') || '(하위분류 없음)'}`).join('\n')
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
  const name = (body.name || '').toString().trim()
  const itemName = (body.itemName || '').toString().trim()
  const contact = CONTACT_LABEL[body.contact] || ''
  const software = SW_LABEL[body.software] || ''
  const sterile = !!body.sterile
  const grade = (body.grade || '').toString().trim()

  if (!name) { res.status(400).json({ ok: false, error: 'empty', message: '분류할 제품명이 없습니다.' }); return }

  const factLines = [
    `제품명: ${name}`,
    itemName && itemName !== name ? `식약처 품목명: ${itemName}` : '',
    grade ? `등급: ${grade}등급` : '',
    contact ? `인체 접촉: ${contact}` : '',
    software ? `소프트웨어: ${software}` : '',
    sterile ? '멸균 제품: 예' : '',
  ].filter(Boolean).join('\n')

  const system =
    'You are a Korean medical device regulatory classification assistant (KGMP/MFDS 인허가 업종 분류). ' +
    '아래 대분류→중분류 표에 있는 값만 사용해서 주어진 제품에 가장 알맞은 대분류·중분류 하나씩을 고르시오.\n\n' +
    '[분류표]\n' + buildTaxonomyText() + '\n\n' +
    '규칙:\n' +
    '- 반드시 위 표에 실제로 존재하는 대분류 문자열과, 그 대분류 하위의 중분류 문자열만 사용한다.\n' +
    '- 뚜렷하게 맞는 중분류가 없으면 해당 대분류의 "기타"를 사용한다.\n' +
    '- 대분류 자체가 애매하면 대분류를 "기타"로 하고 cat2는 빈 문자열로 한다.\n' +
    '- 출력은 오직 JSON 하나만: {"cat1":"...","cat2":"...","confidence":"high"|"medium"|"low"}\n' +
    '- 다른 설명, 코드펜스, 서두 텍스트를 절대 출력하지 않는다.'

  try {
    const r = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 200,
        system,
        messages: [{ role: 'user', content: factLines }],
      }),
    })
    const j = await r.json()
    if (!r.ok) { res.status(502).json({ ok: false, error: 'upstream', message: (j && j.error && j.error.message) || ('HTTP ' + r.status) }); return }
    const raw = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('')
    const parsed = extractJson(raw)

    // 환각 방지 — 분류표에 실제로 있는 값인지 서버에서 재검증
    let cat1 = parsed && typeof parsed.cat1 === 'string' ? parsed.cat1.trim() : ''
    let cat2 = parsed && typeof parsed.cat2 === 'string' ? parsed.cat2.trim() : ''
    let confidence = parsed && ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'low'
    if (!MDCAT1.includes(cat1)) { cat1 = '기타'; cat2 = ''; confidence = 'low' }
    else if (cat2 && !(MDCAT[cat1] || []).includes(cat2)) { cat2 = '' }

    res.status(200).json({ ok: true, cat1, cat2, confidence, model: MODEL })
  } catch (e) {
    res.status(502).json({ ok: false, error: 'upstream', message: String((e && e.message) || e) })
  }
}
