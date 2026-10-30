// api/email-verify.js — 가입 신청 시 관리자 이메일 인증번호 (로그인 전 사용)
// action 'config' → { enabled }  /  'send' { email } → { otpToken }  /  'verify' { email, code, otpToken } → { verifyToken }
// 인증번호는 서버에 저장하지 않고 서명 토큰(5분)으로 검증한다(api/_lib/notify.js). 발송은 Resend(api/_lib/mail.js).
import * as mail from './_lib/mail.js'
import { issueOtp, verifyOtp } from './_lib/notify.js'

// 같은 서버 인스턴스 안에서의 간단한 남용 방지(주소당 60초에 1통)
const lastSent = new Map()

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { action, email, code, otpToken } = req.body || {}
  if (action === 'config') return res.status(200).json({ ok: true, enabled: mail.enabled() })
  if (!mail.enabled()) return res.status(503).json({ ok: false, error: '이메일 인증이 아직 설정되지 않았습니다.' })
  if (!mail.validEmail(email)) return res.status(400).json({ ok: false, error: '이메일 주소를 확인해 주세요.' })
  const key = String(email).trim().toLowerCase()

  if (action === 'send') {
    const prev = lastSent.get(key) || 0
    if (Date.now() - prev < 60 * 1000) return res.status(429).json({ ok: false, error: '1분 뒤에 다시 받아 주세요.' })
    const { code: c, otpToken: t } = issueOtp(key)
    const r = await mail.send(key, '[퀄리트리] 가입 이메일 인증번호 ' + c, '가입 이메일 인증번호', [['인증번호', c]],
      'Qualytree 도입 신청 화면에 위 인증번호를 입력해 주세요. 5분 동안 유효합니다. 본인이 신청하지 않았다면 이 메일을 무시해 주세요.')
    if (!r.ok) return res.status(502).json({ ok: false, error: '인증 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.' })
    lastSent.set(key, Date.now())
    return res.status(200).json({ ok: true, otpToken: t })
  }
  if (action === 'verify') {
    const v = verifyOtp(key, code, otpToken)
    if (v.error) return res.status(400).json({ ok: false, error: v.error })
    return res.status(200).json({ ok: true, verifyToken: v.verifyToken })
  }
  return res.status(400).json({ ok: false, error: '알 수 없는 요청' })
}
