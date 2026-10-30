// api/_lib/notify.js — 카카오 알림톡(솔라피) 발송 + 문자 대체발송, 휴대폰 인증번호(서버 저장 없이 서명 토큰)
//
// 환경변수 (Vercel qualytree-app, Production)
//   SOLAPI_API_KEY, SOLAPI_API_SECRET  솔라피 API 키 (Secret)
//   SOLAPI_SENDER                       등록된 발신번호(숫자만) — 알림톡 실패 시 문자 대체발송에 사용
//   SOLAPI_PFID                         카카오 비즈니스 채널 발신프로필 ID (KA… / PF…)
//   SOLAPI_TPL_OTP / SOLAPI_TPL_BANK / SOLAPI_TPL_PAID   카카오 승인된 알림톡 템플릿 ID
// 키·발신번호만 있으면 문자로, 발신프로필·템플릿까지 있으면 알림톡(+문자 대체발송)으로 보낸다.
// 아무것도 없으면 enabled() = false → 결제 화면은 인증 없이 기존처럼 동작.
import crypto from 'node:crypto'

const env = (k) => process.env[k] || ''
export const enabled = () => !!(env('SOLAPI_API_KEY') && env('SOLAPI_API_SECRET') && env('SOLAPI_SENDER'))

// 알림톡 템플릿 문구 — 카카오 검수에 그대로 제출하는 문구와 같아야 한다(변수는 #{…})
export const TEMPLATES = {
  OTP: {
    env: 'SOLAPI_TPL_OTP',
    text: '[퀄리트리] 인증번호 #{인증번호}를 입력해 주세요. (5분 이내)',
  },
  BANK: {
    env: 'SOLAPI_TPL_BANK',
    text: '[퀄리트리] 무통장입금 안내\n\n#{회사명}님, 아래 계좌로 입금해 주시면 확인 후 이용이 시작됩니다.\n\n■ 요금제: #{요금제}\n■ 입금액: #{입금액}원 (부가세 포함)\n■ 입금 계좌: #{은행} #{계좌번호}\n■ 예금주: #{예금주}\n■ 입금자명: #{입금자명}\n■ 주문번호: #{주문번호}\n\n입금자명과 금액이 같아야 빠르게 확인됩니다.',
  },
  PAID: {
    env: 'SOLAPI_TPL_PAID',
    text: '[퀄리트리] 입금 확인 안내\n\n#{회사명}님, #{입금액}원 입금이 확인되어 #{요금제} 이용이 시작되었습니다.\n\n■ 이용 기간: #{시작일} ~ #{종료일}\n■ 주문번호: #{주문번호}',
  },
}

export const normalizePhone = (p) => String(p || '').replace(/\D/g, '')
export const validPhone = (p) => /^01[016789]\d{7,8}$/.test(normalizePhone(p))

function fill(text, vars) {
  return Object.entries(vars).reduce((t, [k, v]) => t.split('#{' + k + '}').join(String(v ?? '')), text)
}

// kind: 'OTP' | 'BANK' | 'PAID', vars: { 인증번호: '123456', ... } (# 없이)
export async function send(kind, to, vars) {
  if (!enabled()) return { ok: false, skipped: true }
  const tpl = TEMPLATES[kind]
  const text = fill(tpl.text, vars)
  const msg = { to: normalizePhone(to), from: normalizePhone(env('SOLAPI_SENDER')), text }
  const templateId = env(tpl.env)
  if (env('SOLAPI_PFID') && templateId) {
    msg.kakaoOptions = {
      pfId: env('SOLAPI_PFID'),
      templateId,
      variables: Object.fromEntries(Object.entries(vars).map(([k, v]) => ['#{' + k + '}', String(v ?? '')])),
      disableSms: false, // 카카오톡 미사용자 등 실패 시 문자로 대체 발송
    }
  }
  try {
    const { SolapiMessageService } = await import('solapi')
    const svc = new SolapiMessageService(env('SOLAPI_API_KEY'), env('SOLAPI_API_SECRET'))
    await svc.send(msg)
    return { ok: true, channel: msg.kakaoOptions ? 'kakao' : 'sms' }
  } catch (e) {
    console.error('[notify] send failed', kind, e?.message || e)
    return { ok: false, error: e?.message || String(e) }
  }
}

// ── 휴대폰 인증번호: 서버에 저장하지 않고 서명 토큰으로 검증 ──────────────
const secret = () => env('OTP_SECRET') || env('SUPABASE_SERVICE_ROLE_KEY')
const sign = (s) => crypto.createHmac('sha256', secret()).update(s).digest('base64url')
const pack = (...parts) => Buffer.from(parts.join('|')).toString('base64url')
const unpack = (t) => { try { return Buffer.from(String(t), 'base64url').toString().split('|') } catch { return [] } }

export function issueOtp(phone) {
  const p = normalizePhone(phone)
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0')
  const exp = Date.now() + 5 * 60 * 1000
  return { code, otpToken: pack(p, exp, sign('otp|' + p + '|' + code + '|' + exp)) }
}

export function verifyOtp(phone, code, otpToken) {
  const p = normalizePhone(phone)
  const [tp, exp, sig] = unpack(otpToken)
  if (!tp || tp !== p) return { error: '휴대폰 번호가 인증 요청과 다릅니다.' }
  if (Date.now() > Number(exp)) return { error: '인증번호가 만료되었습니다. 다시 받아 주세요.' }
  const expect = sign('otp|' + p + '|' + String(code || '').trim() + '|' + exp)
  if (!sig || sig.length !== expect.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) {
    return { error: '인증번호가 맞지 않습니다.' }
  }
  const vexp = Date.now() + 30 * 60 * 1000
  return { verifyToken: pack(p, vexp, sign('verified|' + p + '|' + vexp)) }
}

export function checkVerified(phone, verifyToken) {
  const p = normalizePhone(phone)
  const [tp, exp, sig] = unpack(verifyToken)
  if (!tp || tp !== p || Date.now() > Number(exp)) return false
  const expect = sign('verified|' + p + '|' + exp)
  return !!sig && sig.length === expect.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))
}
