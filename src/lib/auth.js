// src/lib/auth.js
// Qualytree 통합 인증 — 데모 mock auth + Supabase 정식 인증
// Project Instructions §11.3 준수: 정식 사용은 Supabase Auth, 데모는 그대로 유지

import { permissions, LEVELS } from './permissions'
import {
  supabase,
  getSupabaseUser,
  isPlatformOperator,
  getCompanyMembership,
  signInWithEmail,
  signOutSupabase,
} from './supabase'

const KEY = 'qualytree.auth'

export const auth = {
  // ───────── 데모 mock auth (기존 — 그대로 유지) ─────────
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
    signOutSupabase().catch(() => {})
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

  // ───────── Supabase 정식 인증 (신규) ─────────

  async signInWithPassword(email, password) {
    const { data, error } = await signInWithEmail(email, password)
    if (error) {
      return { ok: false, error: error.message || '로그인 실패' }
    }
    const ctx = await this.refreshFromSupabase()
    return { ok: true, context: ctx }
  },

  async refreshFromSupabase() {
    const user = await getSupabaseUser()
    if (!user) return null

    const isOp = await isPlatformOperator()
    if (isOp) {
      const session = {
        email: user.email,
        name: user.email?.split('@')[0] || 'Operator',
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

    const membership = await getCompanyMembership()
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
    return { kind: 'orphan', session }
  },

  async signUpRequest({
    companyName,
    businessNumber,
    representative,
    industry,
    employeeCountBand,
    desiredPlan,
    desiredBillingCycle = 'monthly',
    desiredCertifications = ['KGMP'],
    adminEmail,
    adminName,
    adminPhone,
  }) {
    const { data, error } = await supabase
      .from('signup_requests')
      .insert({
        company_name: companyName,
        business_number: businessNumber || null,
        representative: representative || null,
        industry: industry || null,
        employee_count_band: employeeCountBand,
        desired_plan: desiredPlan,
        desired_billing_cycle: desiredBillingCycle,
        desired_certifications: desiredCertifications,
        admin_email: adminEmail,
        admin_name: adminName,
        admin_phone: adminPhone || null,
      })
      .select()
      .maybeSingle()
    if (error) {
      return { ok: false, error: error.message || '신청 실패' }
    }
    return { ok: true, request: data }
  },

  identityKind() {
    return this.current()?.identityKind || null
  },
}

if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      try {
        const cur = JSON.parse(localStorage.getItem(KEY) || 'null')
        if (cur && cur.identityKind !== 'demo') {
          localStorage.removeItem(KEY)
        }
      } catch {}
    } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      auth.refreshFromSupabase().catch(() => {})
    }
  })
}
