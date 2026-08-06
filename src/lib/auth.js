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
export const PENDING_JOIN_KEY = 'qualytree.pendingJoin'

// 페이지 로드 시 SIGNED_IN·TOKEN_REFRESHED 이벤트가 거의 동시에 여러 번 발생하면
// refreshFromSupabase()가 병렬로 여러 번 실행되면서 서로의 localStorage 쓰기를
// 덮어쓰는 경쟁 상태가 생길 수 있다. 모듈 로드 시점에 한 번만 읽어 캐시해두면
// 이후 호출들이 전부 같은 값을 참조하므로 경쟁 상태 없이 일관되게 override가 유지된다.
let _cachedNameOverride = null
try {
  const boot = JSON.parse(localStorage.getItem(KEY) || 'null')
  if (boot && boot.nameOverride && boot.name && boot.userId) {
    _cachedNameOverride = { userId: boot.userId, name: boot.name }
  }
} catch { /* ignore */ }

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

  // 프로필 설정에서 이름을 바꾼 뒤 refreshFromSupabase()가 백엔드 원본값(platform_operators.name /
  // company_members.name)으로 즉시 덮어써버리는 문제가 있었다 — 이름 변경 전용 백엔드 RPC가 아직 없어서다.
  // 같은 userId로 로컬에 nameOverride가 남아있으면 그 값을 우선한다(이 브라우저 한정 지속 — 다른 기기·
  // 관리자 화면에는 반영되지 않으니 완전한 서버 동기화가 필요하면 백엔드에 프로필 갱신 RPC를 추가해야 한다).
  _localNameOverride(userId) {
    if (_cachedNameOverride && _cachedNameOverride.userId === userId) return _cachedNameOverride.name
    return null
  },

  async refreshFromSupabase() {
    const user = await safeUser()
    if (!user) return null

    const opProfile = await safeOperatorProfile()
    if (opProfile) {
      const overrideName = this._localNameOverride(user.id)
      const session = {
        email: user.email,
        name: overrideName || opProfile.name || user.email?.split('@')[0] || 'Operator',
        level: LEVELS.MANAGER,
        company: null,
        signedAt: new Date().toISOString(),
        identityKind: 'operator',
        userId: user.id,
        ...(overrideName ? { nameOverride: true } : {}),
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
      const overrideName = this._localNameOverride(user.id)
      const session = {
        email: user.email,
        name: overrideName || membership.name || user.email?.split('@')[0],
        level,
        ...(overrideName ? { nameOverride: true } : {}),
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

    // 이메일 확인이 필요한 프로젝트에서는 JoinCompany.jsx가 회사 가입 신청을 바로 넣지 못하고
    // localStorage에 예약해둔다 — 신원 미확인 상태(operator도 company_member도 아닌 'orphan')로
    // 로그인이 확인되는 첫 순간이 바로 그 예약을 이어서 처리할 시점이다. 실패해도(이미 신청됨 등)
    // 로그인 자체는 막지 않고 orphan 세션으로 계속 진행한다.
    let pendingJoin = null
    try { pendingJoin = JSON.parse(localStorage.getItem(PENDING_JOIN_KEY) || 'null') } catch { pendingJoin = null }
    if (pendingJoin && pendingJoin.businessNumber && pendingJoin.name) {
      try {
        const { error: joinErr } = await supabase.rpc('request_company_join', {
          p_business_number: pendingJoin.businessNumber,
          p_name: pendingJoin.name,
        })
        if (!joinErr) {
          localStorage.removeItem(PENDING_JOIN_KEY)
          // 신청이 막 반영됐을 수 있으니 이번 호출 안에서는 orphan으로 두고,
          // 다음 refreshFromSupabase(다음 로그인/새로고침)에서 정상적으로 company_member로 승격된다.
        } else {
          console.warn('[auth] pending company join soft-failed:', String(joinErr?.message || joinErr))
        }
      } catch (e) {
        console.warn('[auth] pending company join threw:', String(e?.message || e))
      }
    }

    const orphanOverride = this._localNameOverride(user.id)
    const session = {
      email: user.email,
      name: orphanOverride || user.email?.split('@')[0] || 'User',
      level: LEVELS.OPERATOR,
      company: null,
      signedAt: new Date().toISOString(),
      identityKind: 'orphan',
      userId: user.id,
      ...(orphanOverride ? { nameOverride: true } : {}),
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
