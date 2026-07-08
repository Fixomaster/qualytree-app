// src/lib/auth.js
// Qualytree 통합 인증 — 데모 mock + Supabase 정식 (Stage 1 안전화 + Stage 2 RPC)
// Project Instructions §11.3 / §22.5 준수

import { permissions, LEVELS } from './permissions'
import {
  supabase,
  getSupabaseUser,
  isPlatformOperator, getPlatformOperatorProfile,
  getCompanyMembership,
  signInWithEmail,
  signOutSupabase,
} from './supabase'

const KEY = 'qualytree.auth'

// ───────── 내부 안전 헬퍼: 절대 throw 하지 않음 ─────────

async function safeUser() {
  try {
    return await getSupabaseUser()
  } catch (e) {
    console.warn('[auth] getSupabaseUser soft-failed:', String(e?.message || e))
    return null
  }
}

async function safeIsOperator() {
  try {
    const v = await isPlatformOperator()
    return v === true
  } catch (e) {
    console.warn('[auth] isPlatformOperator soft-failed:', String(e?.message || e))
    return false
  }
}

async function safeOperatorProfile() { try { return await getPlatformOperatorProfile() } catch (e) { console.warn('[auth] getPlatformOperatorProfile soft-failed:', String(e?.message || e)); return null } } async function safeMembership() {
  try {
    const m = await getCompanyMembership()
    return m && typeof m === 'object' ? m : null
  } catch (e) {
    console.warn('[auth] getCompanyMembership soft-failed:', String(e?.message || e))
    return null
  }
}

function errMsg(error, fallback) {
  if (!error) return fallback
  if (typeof error === 'string') return error
  if (typeof error.message === 'string' && error.message) return error.message
  try { return String(error) } catch { return fallback }
}

export const auth = {
  // ───────── 데모 mock auth ─────────
  signIn(email, name, level = LEVELS.OPERATOR) {
    return this.signInDemo(email, name, level)
  },

  signInDemo(email, name, level = LEVELS.OPERATOR) {
    const session = {
      email,
      name: name || email.split('@')[0],
      level,
      company: null,
      signedAt: new Date().toISOString(),
      identityKind: 'demo',
    }
    localStorage.setItem(KEY, JSON.stringify(session))
    permissions.setLevel(level)
    return session
  },

  signOut() {
    localStorage.removeItem(KEY)
    try {
      signOutSupabase().catch(() => {})
    } catch { /* ignore */ }
  },

  current() {
    try {
      const raw = localStorage.getItem(KEY)
      const session = raw ? JSON.parse(raw) : null
      if (session && session.level == null) {
        session.level = permissions.currentLevel()
      }
      if (session && !session.identityKind) {
        session.identityKind = 'demo'
      }
      return session
    } catch {
      return null
    }
  },

  isSignedIn() {
    return !!this.current()
  },

  updateCompany(company) {
    const cur = this.current()
    if (!cur) return null
    const updated = { ...cur, company }
    localStorage.setItem(KEY, JSON.stringify(updated))
    return updated
  },

  setLevel(level) {
    const cur = this.current()
    if (!cur) return null
    const updated = { ...cur, level }
    localStorage.setItem(KEY, JSON.stringify(updated))
    permissions.setLevel(level)
    return updated
  },

  currentLevel() {
    return this.current()?.level ?? permissions.currentLevel()
  },

  // ───────── Supabase 정식 인증 ─────────

  async signInWithPassword(email, password) {
    let data, error
    try {
      const r = await signInWithEmail(email, password)
      data = r?.data
      error = r?.error
    } catch (e) {
      return { ok: false, error: errMsg(e, '로그인 실패') }
    }
    if (error) {
      return { ok: false, error: errMsg(error, '로그인 실패') }
    }
    let ctx = null
    try {
      ctx = await this.refreshFromSupabase()
    } catch (e) {
      console.warn('[auth] refresh after signIn soft-failed:', String(e?.message || e))
      ctx = null
    }
    return { ok: true, context: ctx }
  },

  async refreshFromSupabase() {
    const user = await safeUser()
    if (!user) return null

    const opProfile = await safeOperatorProfile()
    if (opProfile) {
      const session = {
        email: user.email,
        name: opProfile.name || user.email?.split('@')[0] || 'Operator',
        level: LEVELS.MANAGER,
        company: null,
        signedAt: new Date().toISOString(),
        identityKind: 'operator',
        userId: user.id,
      }
      localStorage.setItem(KEY, JSON.stringify(session))
      permissions.setLevel(LEVELS.MANAGER)
      return { kind: 'operator', session }
    }

    const membership = await safeMembership()
    if (membership) {
      const level = membership.permission_level === 3 ? LEVELS.MANAGER
                  : membership.permission_level === 2 ? LEVELS.INSPECTOR
                  : LEVELS.OPERATOR
      const session = {
        email: user.email,
        name: membership.name || user.email?.split('@')[0],
        level,
        company: membership.companies
          ? {
              id: membership.companies.id,
              name: membership.companies.name,
              plan: membership.companies.plan_code,
            }
          : null,
        signedAt: new Date().toISOString(),
        identityKind: 'company_member',
        isCompanyAdmin: !!membership.is_admin,
        userId: user.id,
        memberId: membership.id,
        permissionLevel: membership.permission_level,
      }
      localStorage.setItem(KEY, JSON.stringify(session))
      permissions.setLevel(level)
      return { kind: 'company_member', session }
    }

    const session = {
      email: user.email,
      name: user.email?.split('@')[0] || 'User',
      level: LEVELS.OPERATOR,
      company: null,
      signedAt: new Date().toISOString(),
      identityKind: 'orphan',
      userId: user.id,
    }
    localStorage.setItem(KEY, JSON.stringify(session))
    permissions.setLevel(LEVELS.OPERATOR)
    return { kind: 'orphan', session }
  },

  async signUpRequest(payload) {
    try {
      const { data, error } = await supabase.rpc('submit_signup_request', {
        p_company_name: payload.companyName,
        p_business_number: payload.businessNumber || '',
        p_representative: payload.representative || '',
        p_industry: payload.industry || '',
        p_employee_count_band: payload.employeeCountBand,
        p_desired_plan: payload.desiredPlan,
        p_desired_billing_cycle: payload.desiredBillingCycle || 'monthly',
        p_desired_certifications: payload.desiredCertifications || ['KGMP'],
        p_admin_email: payload.adminEmail,
        p_admin_name: payload.adminName,
        p_admin_phone: payload.adminPhone || '',
      })
      if (error) {
        return { ok: false, error: errMsg(error, '신청 실패') }
      }
      return { ok: true, request: { id: data } }
    } catch (e) {
      return { ok: false, error: errMsg(e, '신청 실패') }
    }
  },

  identityKind() {
    return this.current()?.identityKind || null
  },
}

// ───────── onAuthStateChange 구독 ─────────

if (typeof window !== 'undefined') {
  try {
    supabase.auth.onAuthStateChange((event, session) => {
      try {
        if (event === 'SIGNED_OUT') {
          try {
            const cur = JSON.parse(localStorage.getItem(KEY) || 'null')
            if (cur && cur.identityKind !== 'demo') {
              localStorage.removeItem(KEY)
            }
          } catch { /* ignore */ }
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          auth.refreshFromSupabase().catch((e) => {
            console.warn('[auth] refresh after', event, 'soft-failed:', String(e?.message || e))
          })
        }
      } catch (e) {
        console.warn('[auth] onAuthStateChange callback threw:', String(e?.message || e))
      }
    })
  } catch (e) {
    console.warn('[auth] failed to subscribe onAuthStateChange:', String(e?.message || e))
  }
}
