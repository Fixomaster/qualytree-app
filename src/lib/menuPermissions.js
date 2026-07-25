// src/lib/menuPermissions.js
// 사이드바 도메인 메뉴 노출 권한 — localStorage 기반 (per-user per-domain)

const STORAGE_KEY = 'qt_menu_perms'

export const DOMAIN_KEYS = [
  '수주·고객', '구매·자재', '생산·제조', '품질·검사',
  '설계·개발', '문서·규정', '설비·교정', '교육·인력', '경영·전략',
]

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
  catch { return {} }
}
function save(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) }
  catch { /* ignore */ }
}

export const menuPermissions = {
  DOMAIN_KEYS,

  getForUser(userId) {
    if (!userId) return null
    return load()[userId] ?? null
  },

  getAllowedDomains(userId) {
    const perms = this.getForUser(userId)
    if (!perms) return DOMAIN_KEYS
    return DOMAIN_KEYS.filter(k => perms[k] !== false)
  },

  toggle(userId, domainKey, visible) {
    if (!userId) return
    const all = load()
    if (!all[userId]) all[userId] = {}
    all[userId][domainKey] = visible
    save(all)
  },

  reset(userId) {
    if (!userId) return
    const all = load()
    delete all[userId]
    save(all)
  },
}
