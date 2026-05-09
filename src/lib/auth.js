// Fake auth for demo. Replace with real auth (SSO/OAuth) in production.
// Project Instructions §11.3: 실제 인증은 SSO·MFA 의무

const KEY = 'qualytree.auth'

export const auth = {
  signIn(email, name) {
    const session = {
      email,
      name: name || email.split('@')[0],
      company: null, // populated after onboarding
      signedAt: new Date().toISOString(),
    }
    localStorage.setItem(KEY, JSON.stringify(session))
    return session
  },

  signOut() {
    localStorage.removeItem(KEY)
  },

  current() {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? JSON.parse(raw) : null
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
}
