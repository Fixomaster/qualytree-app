// 식약처(MFDS) 의료기기 분류번호 — 프론트엔드 클라이언트
//
// - /api/mfds (서버리스 프록시)에서 전체 품목 분류표를 받아 localStorage에 캐시.
// - 분류표는 자주 바뀌지 않으므로 30일 캐시. 검색은 전부 로컬(즉시).
// - API/키 미설정 등 실패 시 빈 배열 → 호출부는 수동입력으로 폴백.
//
// 항목: { no(분류번호), grade(등급 1~4), name(품목명), track(추적관리 Y/N), grp(품목군) }

const CACHE_KEY = 'qualytree.mfdsClassifications'
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30일

let MEM = null // 메모리 캐시 [{no,grade,name,track,grp}]
let loadingPromise = null

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const obj = JSON.parse(raw)
    if (!obj || !Array.isArray(obj.items)) return null
    if (Date.now() - (obj.fetchedAt || 0) > CACHE_TTL_MS) return obj // 만료돼도 일단 반환(백그라운드 갱신)
    return obj
  } catch {
    return null
  }
}

function writeCache(items) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), items }))
  } catch { /* quota 등 무시 */ }
}

async function fetchFromServer() {
  const r = await fetch('/api/mfds')
  const j = await r.json()
  if (!j.ok || !Array.isArray(j.items)) throw new Error(j.message || 'MFDS load failed')
  return j.items
}

export const mfds = {
  // 분류표 로드(캐시 우선). 반환: 항목 배열
  async load({ force = false } = {}) {
    if (MEM && !force) return MEM
    const cached = readCache()
    const fresh = cached && Date.now() - (cached.fetchedAt || 0) <= CACHE_TTL_MS
    if (cached && fresh && !force) {
      MEM = cached.items
      return MEM
    }
    if (loadingPromise && !force) return loadingPromise
    loadingPromise = (async () => {
      try {
        const items = await fetchFromServer()
        MEM = items
        writeCache(items)
        return items
      } catch (e) {
        // 실패 시 만료 캐시라도 사용
        if (cached && Array.isArray(cached.items)) { MEM = cached.items; return MEM }
        MEM = []
        return MEM
      } finally {
        loadingPromise = null
      }
    })()
    return loadingPromise
  },

  // 동기 검색(이미 로드된 메모리/캐시 기준). q로 품목명·분류번호 부분일치, 최대 limit개
  search(q, limit = 30) {
    const list = MEM || (readCache() || {}).items || []
    const s = (q || '').trim().toLowerCase()
    if (!s) return []
    const starts = []
    const includes = []
    for (const it of list) {
      const name = (it.name || '').toLowerCase()
      const no = (it.no || '').toLowerCase()
      if (name.startsWith(s) || no.startsWith(s)) starts.push(it)
      else if (name.includes(s) || no.includes(s)) includes.push(it)
      if (starts.length >= limit) break
    }
    return starts.concat(includes).slice(0, limit)
  },

  // 분류번호로 단건 조회
  findByNo(no) {
    const list = MEM || (readCache() || {}).items || []
    return list.find((it) => it.no === no) || null
  },

  isReady() {
    return !!(MEM && MEM.length) || !!((readCache() || {}).items || []).length
  },
}

export default mfds
