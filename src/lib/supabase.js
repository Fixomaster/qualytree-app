// src/lib/supabase.js
// Qualytree Supabase 클라이언트 — 모든 백엔드 호출의 단일 진입점
// 환경변수: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (.env.local + Vercel)

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Qualytree] Supabase 환경변수가 설정되지 않았습니다.')
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'OK' : '누락')
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'OK' : '누락')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'qualytree.supabase.auth',
  },
})

// ── 헬퍼: 현재 Supabase 인증 사용자 ─────────────────────────────────
export async function getSupabaseUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) {
    console.error('[Qualytree] getSupabaseUser error:', error)
    return null
  }
  return user
}

// ── 헬퍼: 현재 사용자가 플랫폼 운영자인가? ────────────────────────
export async function isPlatformOperator() {
  const user = await getSupabaseUser()
  if (!user) return false
  const { data, error } = await supabase
    .from('platform_operators')
    .select('id, role')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) {
    console.error('[Qualytree] isPlatformOperator error:', error)
    return false
  }
  return !!data
}

// ── 헬퍼: 현재 사용자의 회사 정보 + 권한 ──────────────────────────
export async function getCompanyMembership() {
  const user = await getSupabaseUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('company_members')
    .select('id, company_id, permission_level, is_admin, status, name, companies:company_id(*)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  if (error) {
    console.error('[Qualytree] getCompanyMembership error:', error)
    return null
  }
  return data
}

// ── 헬퍼: 정식 로그인 ─────────────────────────────────────────────
export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

// ── 헬퍼: 로그아웃 ────────────────────────────────────────────────
export async function signOutSupabase() {
  const { error } = await supabase.auth.signOut()
  return { error }
}
