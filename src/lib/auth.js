// Fake auth for demo. Replace with real auth (SSO/OAuth) in production.
// Project Instructions §11.3: 실제 인증은 SSO·MFA 의무
// Level은 lib/permissions.js와 동일 키 정의를 따른다

import { permissions, LEVELS } from './permissions'

const KEY = 'qualytree.auth'

export const auth = {
  signIn(email, name, level = LEVELS.OPERATOR) {
    const session = {
      email,
      name: name || email.split('@')[0],
      level,
      company: null, // populated after onboarding
      signedAt: new Date().toISOString(),
    }
    localStorage.setItem(KEY, JSON.stringify(session))
    permissions.setLevel(level)
    return session
  },

  signOut() {
    localStorage.removeItem(KEY)
  },

  current() {
    try {
      const raw = localStorage.getItem(KEY)
      const session = raw ? JSON.parse(raw) : null
      // 세션과 권한 모듈 동기화 (둘 중 하나만 있으면 다른 쪽 보정)
      if (session && session.level == null) {
        session.level = permissions.currentLevel()
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

  /** 시연·운영용 — 현재 사용자 Level 변경 */
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
}
