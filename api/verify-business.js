// Vercel Serverless Function — 사업자등록정보 진위확인 (국세청 / 공공데이터포털)
//
// 목적: 가입 신청 1단계에서 입력한 사업자등록번호·대표자명·개업일자가 국세청에 등록된 정보와
//       일치하는지, 그리고 현재 영업 중(계속사업자)인지 확인한다. 확인 전에는 나머지 회사 정보를
//       입력할 수 없도록 프론트에서 게이트한다.
// - 키는 Vercel 환경변수 NTS_SERVICE_KEY 로만 보관 (공공데이터포털 "국세청_사업자등록정보
//   진위확인 및 상태조회 서비스" 활용신청 후 발급되는 일반 인증키(Decoding)).
// - 키가 없으면 { ok:false, error:'not_configured' } 를 반환하고, 프론트는 "확인 서비스 준비 중"
//   상태로 운영팀 수동 검토 경로를 안내한다 (가입 자체는 막지 않음).
//
// 요청(POST): { b_no: '1234567890', p_nm: '홍길동', start_dt: '20200101', b_nm?: '회사명' }
// 응답: { ok:true, valid:true|false, status:'계속사업자'|'휴업자'|'폐업자'|'', taxType, validMsg }
//       | { ok:false, error, message }

const NTS_VALIDATE = 'https://api.odcloud.kr/api/nts-businessman/v1/validate'

function digits(s) { return String(s || '').replace(/\D/g, '') }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' })
    return
  }
  const key = process.env.NTS_SERVICE_KEY
  if (!key) {
    res.status(200).json({ ok: false, error: 'not_configured', message: '사업자 확인 서비스가 아직 설정되지 않았습니다.' })
    return
  }

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  const b_no = digits(body?.b_no)
  const start_dt = digits(body?.start_dt)
  const p_nm = String(body?.p_nm || '').trim()
  const b_nm = String(body?.b_nm || '').trim()

  if (b_no.length !== 10) { res.status(400).json({ ok: false, error: 'bad_b_no', message: '사업자등록번호는 숫자 10자리입니다.' }); return }
  if (start_dt.length !== 8) { res.status(400).json({ ok: false, error: 'bad_start_dt', message: '개업일자는 YYYYMMDD 8자리입니다.' }); return }
  if (!p_nm) { res.status(400).json({ ok: false, error: 'bad_p_nm', message: '대표자명을 입력해주세요.' }); return }

  try {
    const r = await fetch(`${NTS_VALIDATE}?serviceKey=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ businesses: [{ b_no, start_dt, p_nm, ...(b_nm ? { b_nm } : {}) }] }),
    })
    const j = await r.json().catch(() => null)
    if (!r.ok || !j || !Array.isArray(j.data) || !j.data[0]) {
      res.status(502).json({ ok: false, error: 'upstream', message: '국세청 조회에 실패했습니다. 잠시 후 다시 시도해주세요.' })
      return
    }
    const d = j.data[0]
    const valid = d.valid === '01'
    const st = d.status || {}
    res.status(200).json({
      ok: true,
      valid,
      validMsg: d.valid_msg || '',
      status: st.b_stt || '',
      statusCode: st.b_stt_cd || '',
      taxType: st.tax_type || '',
      endDt: st.end_dt || '',
      checkedAt: new Date().toISOString(),
    })
  } catch (e) {
    res.status(502).json({ ok: false, error: 'upstream', message: '국세청 조회 중 오류가 발생했습니다.' })
  }
}
