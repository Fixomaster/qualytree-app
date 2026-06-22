// Vercel Serverless Function — 식약처(MFDS) 의료기기 분류번호 프록시
//
// 목적:
//   - 공공데이터포털 「의료기기 분류번호」 OpenAPI(data.go.kr/15073892)를 서버측에서 호출.
//   - 브라우저 직접 호출은 http(혼합콘텐츠)+CORS로 불가하므로 프록시가 대신 호출한다.
//   - 서비스키는 Vercel 환경변수 MFDS_API_KEY 로만 보관 → 프론트 번들/공개 저장소에 노출 안 됨.
//
// 응답: { ok, fetchedAt, count, items: [{ no, grade, name, track, grp }] }
//   no   = 분류번호(MDEQ_CLSF_NO)   예: A19010.01
//   grade= 등급(CLSF_NO_GRAD_CD)    예: "1".."4"
//   name = 품목명(CLSF_NO_KOR_NM)   예: 수동식 휠체어
//   track= 추적관리대상(Y/N)
//   grp  = 품목군코드(PRDGR_CD)
//
// 등록 가능한 "품목(leaf)"만 반환한다(PRDLST_DIVS_CD === '품목' && grade 1~4).
//
// 적용 표준 참고: Project Instructions §16 UDI/§3 규제정확성, MFDS 의료기기 품목분류 고시

const BASE =
  'https://apis.data.go.kr/1471000/MdeqClsfNoService01/getMdeqClsfNoInqInq01'
const PAGE_SIZE = 500 // API 최대치

// 워밍된 람다 동안 재사용(분류번호 표는 자주 안 바뀜)
let CACHE = null // { fetchedAt, items }
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 // 24h

async function fetchPage(key, pageNo) {
  const url =
    `${BASE}?serviceKey=${encodeURIComponent(key)}` +
    `&type=json&numOfRows=${PAGE_SIZE}&pageNo=${pageNo}`
  const r = await fetch(url)
  if (!r.ok) throw new Error('MFDS HTTP ' + r.status)
  const j = await r.json()
  const header = j.header || (j.response && j.response.header) || {}
  if (header.resultCode && header.resultCode !== '00') {
    throw new Error('MFDS ' + header.resultCode + ': ' + (header.resultMsg || ''))
  }
  const body = j.body || (j.response && j.response.body) || {}
  let items = body.items || []
  if (!Array.isArray(items)) items = items ? [items] : []
  return { items, totalCount: Number(body.totalCount || 0) }
}

function toCompact(rows) {
  const out = []
  for (const r of rows) {
    const grade = String(r.CLSF_NO_GRAD_CD || '').trim()
    const divs = String(r.PRDLST_DIVS_CD || '').trim()
    // 등록 가능한 품목(leaf)만: 품목 구분 + 실제 등급(1~4)
    if (divs !== '품목') continue
    if (!['1', '2', '3', '4'].includes(grade)) continue
    out.push({
      no: r.MDEQ_CLSF_NO,
      grade,
      name: r.CLSF_NO_KOR_NM || '',
      track: r.TRCK_MNG_TRGT_YN || 'N',
      grp: r.PRDGR_CD || '',
    })
  }
  // 품목명 가나다 정렬
  out.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'))
  return out
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800')

  const key = process.env.MFDS_API_KEY
  if (!key) {
    res.status(500).json({ ok: false, error: 'no_key', message: 'MFDS_API_KEY 환경변수가 설정되지 않았습니다.' })
    return
  }

  // 캐시 히트
  if (CACHE && Date.now() - CACHE.fetchedAt < CACHE_TTL_MS) {
    res.status(200).json({ ok: true, cached: true, fetchedAt: CACHE.fetchedAt, count: CACHE.items.length, items: CACHE.items })
    return
  }

  try {
    // 1페이지로 totalCount 파악
    const first = await fetchPage(key, 1)
    const total = first.totalCount || first.items.length
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

    let all = first.items.slice()
    if (pages > 1) {
      const rest = await Promise.all(
        Array.from({ length: pages - 1 }, (_, i) => fetchPage(key, i + 2))
      )
      rest.forEach((p) => { all = all.concat(p.items) })
    }

    const items = toCompact(all)
    CACHE = { fetchedAt: Date.now(), items }
    res.status(200).json({ ok: true, cached: false, fetchedAt: CACHE.fetchedAt, count: items.length, items })
  } catch (e) {
    // 캐시가 있으면 폴백
    if (CACHE) {
      res.status(200).json({ ok: true, cached: true, stale: true, fetchedAt: CACHE.fetchedAt, count: CACHE.items.length, items: CACHE.items })
      return
    }
    res.status(502).json({ ok: false, error: 'upstream', message: String(e && e.message || e) })
  }
}
