// api/_lib/billingCommon.js — 결제 서버 함수 공통 도구 (밑줄 폴더라 Vercel 함수로 배포되지 않음)
import { DEFAULT_PLANS, withVat } from '../../src/lib/planDefaults.js'

export const TOSS = 'https://api.tosspayments.com'
export const TEST_PLAN = { id: 'test', name: '시험 결제 (자동 환불)', monthly: 1000 }

export async function supabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(url, key, { auth: { persistSession: false } })
}

// 운영자 콘솔에서 바꾼 요금제(platform_config.plans)가 있으면 그것을, 없으면 기본 요금제. 금액은 VAT 포함으로 계산.
export async function serverPlan(supabase, planId) {
  if (planId === TEST_PLAN.id) {
    const v = withVat(TEST_PLAN.monthly)
    return { id: TEST_PLAN.id, name: TEST_PLAN.name, supply: v.supply, vat: v.vat, amount: v.total, test: true }
  }
  let list = DEFAULT_PLANS
  try {
    const { data } = await supabase.from('platform_config').select('value').eq('key', 'plans').maybeSingle()
    if (Array.isArray(data?.value) && data.value.length) list = data.value
  } catch { /* 기본 요금제 사용 */ }
  const p = list.find((x) => x && x.id === planId) || DEFAULT_PLANS.find((x) => x.id === planId)
  if (!p || p.custom || !(Number(p.monthly) > 0)) return null
  const v = withVat(p.monthly)
  return { id: p.id, name: p.name, supply: v.supply, vat: v.vat, amount: v.total, test: false }
}

// 로그인 사용자 확인. 반환: { uid, operator } 또는 { error }
export async function whoIs(supabase, req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return { error: '로그인이 필요합니다.' }
  const { data: u, error } = await supabase.auth.getUser(token)
  const uid = u?.user?.id
  if (error || !uid) return { error: '로그인이 만료되었습니다. 다시 로그인해 주세요.' }
  const { data: op } = await supabase.from('platform_operators').select('user_id').eq('user_id', uid).limit(1)
  return { uid, operator: !!(op && op.length) }
}

// 요청자가 이 회사 소속(또는 운영자)인지 확인. 문제 없으면 null, 있으면 오류 문구
export async function authorize(supabase, req, companyId) {
  const me = await whoIs(supabase, req)
  if (me.error) return me.error
  if (me.operator) return null
  const { data: m } = await supabase.from('company_members').select('company_id')
    .eq('user_id', me.uid).eq('company_id', companyId).limit(1)
  return m && m.length ? null : '이 회사의 결제 권한이 없습니다.'
}

export const tossHeaders = (secretKey) => ({
  Authorization: 'Basic ' + Buffer.from(secretKey + ':').toString('base64'),
  'Content-Type': 'application/json',
})

// 결제 완료 시 구독 활성화(1개월)
export async function activateSubscription(supabase, companyId, p) {
  const expiresAt = new Date(); expiresAt.setMonth(expiresAt.getMonth() + 1)
  return supabase.from('subscriptions').upsert({
    company_id: companyId, plan: p.id, amount: p.amount, billing_status: 'active',
    expires_at: expiresAt.toISOString(), updated_at: new Date().toISOString(),
  }, { onConflict: 'company_id' })
}
