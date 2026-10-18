// src/lib/cloudSync.js
// Qualytree localStorage → Supabase 동기화 엔진
//
// 배경: 인허가/GMP/수주/구매/품질/생산/설계/문서/교육/경영전략 등 실제 업무 데이터
// 100개 이상 화면이 전부 localStorage만 사용해왔다. 화면 하나하나를 Supabase 호출로
// 다시 쓰는 대신, localStorage 자체를 회사 단위 Supabase 테이블(company_data)과
// 투명하게 동기화시켜 기존 화면 코드를 건드리지 않고도 실제 멀티유저 백엔드로
// 전환한다.
//
// 동작 방식:
//   1) 앱이 뜨자마자 localStorage.setItem/getItem/removeItem을 가로챈다. 동기화 대상 키가
//      바뀌면 "아직 서버에 안 올라간 키(dirty)" 목록에 기록해 둔다(브라우저에 영구 보관).
//   2) 로그인 + 회사 소속 확인 후 initCloudSync(company)가 호출된다. 보호된 화면은 이
//      초기화가 끝날 때까지 그려지지 않는다(App.jsx ProtectedRoute) — 서버 데이터가 도착하기
//      전에 빈 화면이 그려지고, 그 빈 상태가 서버 데이터를 덮어쓰는 일을 막기 위함.
//   3) 이 브라우저가 마지막으로 동기화한 회사와 다른 회사로 로그인하면, 이전 회사의 로컬
//      데이터를 먼저 지운다(다른 회사 데이터가 섞이거나 업로드되는 것 방지).
//   4) company_data(data_type='localStorage_sync')에서 그 회사의 모든 행을 받아 localStorage에
//      반영한다(원격 우선). 단, 지난 세션에서 저장했지만 서버로 못 올라간 키(dirty)는 로컬 값을
//      유지하고 곧바로 서버에 올린다(로그아웃 직전·창 닫기 직전 입력 유실 방지).
//   5) 이후 동기화 대상 키가 바뀔 때마다 800ms 디바운스 후 Supabase에 저장한다. 같은 키의
//      저장은 순서대로 하나씩 처리하고, 실패하면 자동 재시도한다.
//   6) 로그아웃 시 대기 중인 저장을 모두 끝낸 뒤에 Supabase 세션을 종료한다(auth.signOut).
//   7) 브라우저 저장 용량(약 5MB)을 넘는 값은 메모리에 보관해 서버 저장·화면 표시는 계속되게 한다.
//
// 제외 키: 인증 토큰, 로그인 세션, 화면 내비게이션 상태 등 "이 브라우저에만
// 의미 있는" 값은 동기화하지 않는다. (EXCLUDE_KEYS 참고)

import { supabase } from './supabase'

const TABLE = 'company_data'
const DATA_TYPE = 'localStorage_sync'
const DEBOUNCE_MS = 800
const RETRY_DELAYS_MS = [2000, 5000, 15000, 30000, 60000]
const PULL_TIMEOUT_MS = 20000
const FLUSH_TIMEOUT_MS = 6000

// 이 브라우저 전용 동기화 메타데이터(동기화 대상 아님)
const META_COMPANY_KEY = 'qt_sync_company' // 마지막으로 동기화한 회사 id
const META_DIRTY_KEY = 'qt_sync_dirty'     // { key: 마지막 로컬 수정 시각(ms) } — 서버 미반영 키

// 회사 데이터가 아니라 "이 브라우저/이 세션에만" 의미 있는 값 — 동기화 제외
const EXCLUDE_KEYS = new Set([
  'qualytree.auth',            // 데모/캐시 세션 (Supabase auth가 진짜 SSoT)
  'qualytree.supabase.auth',   // Supabase SDK 자체 토큰 저장소
  'qualytree.pendingJoin',     // 회사 가입 진행 중 임시 상태
  'qualytree.signup',          // 로그인 전 가입 폼 임시 저장
  'qualytree.dept',            // 현재 선택된 부서 화면 (내비게이션 상태)
  'qualytree.userLevel',       // 사용자별 권한 캐시 (company_members가 SSoT)
  'qualytree.plans',           // 요금제 캐시 (platform_config가 SSoT, #89 참고)
  'qualytree.viewingAs',       // 운영자 회사 전환 상태
  'userToggles',               // 화면 표시 개인 취향 토글
])

// qualytree.* / qms_* 이외의 이름을 쓰는 회사 공용 데이터
const EXTRA_SYNC_KEYS = new Set([
  'qt_menu_perms',       // 메뉴 권한
  'qt_dept_menu_perms',  // 부서별 메뉴 권한
  'qt_user_dept',        // 사용자 → 부서 매핑
  'qt_approval_hubs',    // 결재 사용 화면 설정
  'qt_approvals',        // 결재 기록(로컬 폴백)
])

function isSyncableKey(key) {
  if (!key) return false
  if (EXCLUDE_KEYS.has(key)) return false
  if (key.startsWith('qualytree.')) return true
  if (key.startsWith('qms_')) return true
  if (EXTRA_SYNC_KEYS.has(key)) return true
  return false
}


let originalSetItem = null
let originalGetItem = null
let originalRemoveItem = null
let patched = false
let currentCompanyId = null
let initializedFor = null
let initPromise = null
let initPromiseFor = null

const pendingTimers = new Map()   // key -> 디바운스 timeout id
const pushChains = new Map()      // key -> 진행 중인 push Promise (키별 순차 처리)
const retryTimers = new Map()     // key -> 재시도 timeout id
const retryCounts = new Map()     // key -> 재시도 횟수
const versionCache = new Map()    // key -> 마지막으로 확인한 원격 version (#375 낙관적 잠금)
const lastSyncedRaw = new Map()   // key -> 서버와 일치하는 것으로 확인된 raw 문자열(동일 값 재전송 생략)
const overlay = new Map()         // key -> 용량 초과로 localStorage에 못 넣은 raw 값
const superseded = new Map()      // key -> Set(서버에서 이미 다른 값으로 바뀐 예전 raw들)

function setSynced(key, raw) {
  const prev = lastSyncedRaw.get(key)
  if (prev != null && prev !== raw) {
    let set = superseded.get(key)
    if (!set) { set = new Set(); superseded.set(key, set) }
    set.add(prev)
    if (set.size > 8) set.delete(set.values().next().value)
  }
  lastSyncedRaw.set(key, raw)
}

function rawGet(key) {
  if (overlay.has(key)) return overlay.get(key)
  try { return originalGetItem ? originalGetItem(key) : window.localStorage.getItem(key) } catch { return null }
}

function rawSet(key, raw) {
  try {
    (originalSetItem || window.localStorage.setItem.bind(window.localStorage))(key, raw)
    overlay.delete(key)
  } catch (e) {
    if (isSyncableKey(key)) {
      // 브라우저 저장 용량 초과 — 메모리에 보관(서버 저장·현재 탭 표시는 유지)
      overlay.set(key, raw)
      try { (originalRemoveItem || window.localStorage.removeItem.bind(window.localStorage))(key) } catch { /* ignore */ }
      console.warn('[cloudSync] 브라우저 저장 용량 초과 — 메모리 보관 후 서버 저장:', key)
    } else {
      throw e
    }
  }
}

function rawRemove(key) {
  overlay.delete(key)
  try { (originalRemoveItem || window.localStorage.removeItem.bind(window.localStorage))(key) } catch { /* ignore */ }
}

// ── dirty(서버 미반영) 목록 — 이 브라우저에 영구 보관 ─────────────────────────
function readDirty() {
  try { return JSON.parse(rawGet(META_DIRTY_KEY) || '{}') || {} } catch { return {} }
}
function writeDirty(d) {
  try { rawSet(META_DIRTY_KEY, JSON.stringify(d)) } catch { /* ignore */ }
}
function markDirty(key) {
  const d = readDirty(); d[key] = Date.now(); writeDirty(d)
}
function clearDirty(key, onlyIfNotAfter) {
  const d = readDirty()
  if (!(key in d)) return
  if (onlyIfNotAfter != null && d[key] > onlyIfNotAfter) return
  delete d[key]; writeDirty(d)
}

function safeParse(raw) {
  if (raw == null) return { value: null, nonJson: false }
  try {
    return { value: JSON.parse(raw), nonJson: false }
  } catch {
    return { value: { __rawText: raw }, nonJson: true }
  }
}

function valueToRaw(value) {
  if (value && typeof value === 'object' && value.__rawText != null && Object.keys(value).length === 1) {
    return String(value.__rawText)
  }
  return JSON.stringify(value)
}

function stripNulBytes(value) {
  if (typeof value === 'string') {
    return value.indexOf('\u0000') === -1 ? value : value.split('\u0000').join('')
  }
  if (Array.isArray(value)) return value.map(stripNulBytes)
  if (value && typeof value === 'object') {
    const out = {}
    for (const k of Object.keys(value)) out[k] = stripNulBytes(value[k])
    return out
  }
  return value
}

// ── 상태 노출(로딩 표시·화면 차단용) ─────────────────────────────────────────
// 'idle' | 'syncing' | 'done' | 'error'
let syncStatus = 'idle'
const statusListeners = new Set()
function setSyncStatus(s) {
  syncStatus = s
  statusListeners.forEach((fn) => { try { fn(s) } catch { /* ignore */ } })
}
export function getSyncStatus() { return syncStatus }
export function subscribeSyncStatus(fn) {
  statusListeners.add(fn)
  return () => statusListeners.delete(fn)
}
function refreshErrorStatus() {
  if (syncStatus !== 'done' && syncStatus !== 'error') return
  const failing = retryTimers.size > 0
  if (failing && syncStatus !== 'error') setSyncStatus('error')
  else if (!failing && syncStatus === 'error' && initializedFor) setSyncStatus('done')
}

async function refetchRow(companyId, key) {
  try {
    const { data } = await supabase
      .from(TABLE)
      .select('payload, version')
      .eq('company_id', companyId)
      .eq('data_type', DATA_TYPE)
      .eq('data_key', key)
      .maybeSingle()
    return data || null
  } catch {
    return null
  }
}

// 키 하나를 서버에 저장한다. 성공 true / 실패 false(재시도 대상) / 충돌 'conflict'.
async function pushKeyOnce(companyId, key) {
  const raw = rawGet(key)
  if (raw == null) { clearDirty(key); return true }
  if (lastSyncedRaw.get(key) === raw) { clearDirty(key); return true }
  const startedAt = Date.now()
  const { value } = safeParse(raw)
  const cleanValue = stripNulBytes(value)

  try {
    if (!versionCache.has(key)) {
      const { error: insErr } = await supabase.from(TABLE).insert({
        company_id: companyId,
        data_type: DATA_TYPE,
        data_key: key,
        payload: cleanValue,
        version: 1,
      })
      if (!insErr) {
        versionCache.set(key, 1)
        setSynced(key, raw)
        clearDirty(key, startedAt)
        console.info('[cloudSync] push 성공(신규):', key)
        return true
      }
      if (insErr.code !== '23505') {
        console.warn('[cloudSync] push 실패:', key, insErr.message, insErr.code, insErr.details, insErr.hint)
        return false
      }
      // 이미 원격에 행이 있음 — 버전 확인 후 CAS 경로로
      const row = await refetchRow(companyId, key)
      if (!row) return false
      versionCache.set(key, row.version)
    }

    const baseVersion = versionCache.get(key)
    const { data: updated, error } = await supabase
      .from(TABLE)
      .update({ payload: cleanValue, version: baseVersion + 1 })
      .eq('company_id', companyId)
      .eq('data_type', DATA_TYPE)
      .eq('data_key', key)
      .eq('version', baseVersion)
      .select('version')

    if (error) {
      console.warn('[cloudSync] push 실패:', key, error.message, error.code, error.details, error.hint)
      return false
    }
    if (!updated || updated.length === 0) {
      // 충돌: 그 사이 다른 사람(다른 기기·사용자)이 먼저 저장했다. 원격 버전을 받아 캐시를 갱신하고,
      // 이 브라우저의 최신 입력을 그 위에 다시 저장한다(마지막 저장 우선 — 사용자가 방금 입력한 값 보존).
      console.warn('[cloudSync] 충돌 감지(다른 사용자가 먼저 저장) — 최신 버전 기준으로 다시 저장:', key)
      const fresh = await refetchRow(companyId, key)
      if (!fresh) { versionCache.delete(key); return 'conflict' } // 다른 사람이 행을 지움 → 새로 저장
      versionCache.set(key, fresh.version)
      return 'conflict'
    }
    versionCache.set(key, updated[0].version)
    setSynced(key, raw)
    clearDirty(key, startedAt)
    console.info('[cloudSync] push 성공:', key)
    return true
  } catch (e) {
    console.warn('[cloudSync] push 예외:', key, String(e?.message || e))
    return false
  }
}

function pushKey(key) {
  const companyId = currentCompanyId
  // 초기 불러오기가 끝나기 전에는 올리지 않는다(불러오기 전 로컬 값이 서버를 덮어쓰는 것 방지)
  if (!companyId || initializedFor !== companyId) return Promise.resolve(false)
  const prev = pushChains.get(key) || Promise.resolve()
  const run = prev.then(async () => {
    if (currentCompanyId !== companyId || initializedFor !== companyId) return false
    let r = await pushKeyOnce(companyId, key)
    if (r === 'conflict') r = await pushKeyOnce(companyId, key)
    if (r === true) {
      retryCounts.delete(key)
      const t = retryTimers.get(key); if (t) { clearTimeout(t); retryTimers.delete(key) }
    } else {
      scheduleRetry(key, companyId)
    }
    refreshErrorStatus()
    return r === true
  })
  const tracked = run.finally(() => { if (pushChains.get(key) === tracked) pushChains.delete(key) })
  pushChains.set(key, tracked)
  return tracked
}

function scheduleRetry(key, companyId) {
  if (retryTimers.has(key)) return
  const n = retryCounts.get(key) || 0
  const delay = RETRY_DELAYS_MS[Math.min(n, RETRY_DELAYS_MS.length - 1)]
  retryCounts.set(key, n + 1)
  const t = setTimeout(() => {
    retryTimers.delete(key)
    if (currentCompanyId === companyId) pushKey(key)
  }, delay)
  retryTimers.set(key, t)
}

function schedulePush(key) {
  if (!isSyncableKey(key) || !currentCompanyId || initializedFor !== currentCompanyId) return
  const existing = pendingTimers.get(key)
  if (existing) clearTimeout(existing)
  const t = setTimeout(() => {
    pendingTimers.delete(key)
    pushKey(key)
  }, DEBOUNCE_MS)
  pendingTimers.set(key, t)
}

function flushPending() {
  const ps = []
  for (const [key, t] of pendingTimers) {
    clearTimeout(t)
    ps.push(pushKey(key))
  }
  pendingTimers.clear()
  for (const [key, t] of retryTimers) {
    clearTimeout(t)
    retryTimers.delete(key)
    ps.push(pushKey(key))
  }
  for (const p of pushChains.values()) ps.push(p)
  return Promise.allSettled(ps)
}

function onLocalWrite(key) {
  if (!isSyncableKey(key)) return
  // 동기화가 시작된(서버 데이터를 받은) 상태에서의 수정만 "서버 미반영"으로 기록한다.
  // 로그인 전·불러오기 전의 쓰기(데모, 운영자 회사보기, 초기 기본값)는 서버 값을 이기지 못한다.
  if (currentCompanyId && initializedFor === currentCompanyId) markDirty(key)
  schedulePush(key)
}

function patchStorage() {
  if (patched || typeof window === 'undefined' || !window.localStorage) return
  const ls = window.localStorage
  originalSetItem = ls.setItem.bind(ls)
  originalGetItem = ls.getItem.bind(ls)
  originalRemoveItem = ls.removeItem.bind(ls)

  ls.setItem = function (key, val) {
    key = String(key)
    if (isSyncableKey(key)) {
      const raw = String(val)
      // 화면들이 열릴 때 서버에서 따로 받아온 "예전 서버 값"을 다시 써 넣는 경우가 있다.
      // 아직 서버로 못 올린 새 입력이 있는데 그 예전 값이 도착하면, 새 입력을 지키기 위해 무시한다.
      // (사용자 조작 중의 쓰기는 window.event가 있어 그대로 반영된다)
      const stale = (lastSyncedRaw.get(key) === raw && (isBusy(key) || key in readDirty())) || !!superseded.get(key)?.has(raw)
      if (initializedFor && stale && raw !== rawGet(key) && !(typeof window !== 'undefined' && window.event)) {
        console.info('[cloudSync] 예전 서버 값 재기록 무시(미전송 입력 보호):', key)
        return
      }
      rawSet(key, raw)
      onLocalWrite(key)
    } else {
      originalSetItem(key, val)
    }
  }
  ls.getItem = function (key) {
    key = String(key)
    if (overlay.has(key)) return overlay.get(key)
    return originalGetItem(key)
  }
  ls.removeItem = function (key) {
    key = String(key)
    rawRemove(key)
    if (isSyncableKey(key)) {
      const t = pendingTimers.get(key); if (t) { clearTimeout(t); pendingTimers.delete(key) }
      clearDirty(key)
      lastSyncedRaw.delete(key)
      superseded.delete(key)
      if (currentCompanyId && initializedFor === currentCompanyId) {
        const companyId = currentCompanyId
        const prev = pushChains.get(key) || Promise.resolve()
        const run = prev.then(async () => {
          versionCache.delete(key)
          try {
            await supabase.from(TABLE).delete()
              .eq('company_id', companyId)
              .eq('data_type', DATA_TYPE)
              .eq('data_key', key)
          } catch { /* ignore */ }
        })
        const tracked = run.finally(() => { if (pushChains.get(key) === tracked) pushChains.delete(key) })
        pushChains.set(key, tracked)
      }
    }
  }
  patched = true

  window.addEventListener('beforeunload', () => { flushPending() })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPending()
    else if (document.visibilityState === 'visible' && initializedFor) pullRemote({ refresh: true })
  })
}

// 앱 로드 즉시 가로채기 설치(로그인 전후 모든 쓰기를 dirty 추적)
patchStorage()

function isBusy(key) {
  return pendingTimers.has(key) || pushChains.has(key) || retryTimers.has(key)
}

async function fetchAllRows(companyId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('data_key, payload, version')
    .eq('company_id', companyId)
    .eq('data_type', DATA_TYPE)
  if (error) throw new Error(String(error?.message || error))
  return data || []
}

// refresh=false: 초기 로드 — dirty(지난 세션 미반영) 키를 제외하고 원격 값으로 로컬을 채운다.
// refresh=true : 창 복귀 시 — 로컬 편집·전송 중이 아닌 키 중 원격이 더 새것만 반영한다.
async function pullRemote({ refresh = false, keepLocal = null } = {}) {
  const companyId = currentCompanyId
  if (!companyId) return []
  let rows
  try {
    rows = await fetchAllRows(companyId)
  } catch (e) {
    if (refresh) { console.warn('[cloudSync] pull 실패:', e.message); return [] }
    throw e
  }
  if (currentCompanyId !== companyId) return []
  const dirtyNow = readDirty()
  for (const row of rows) {
    const key = row.data_key
    if (!isSyncableKey(key)) continue
    const cached = versionCache.get(key)
    if (refresh) {
      if (isBusy(key) || key in dirtyNow) continue
      if (cached != null && row.version <= cached) continue
    } else if (keepLocal && keepLocal.has(key)) {
      versionCache.set(key, row.version)
      setSynced(key, valueToRaw(row.payload)) // 서버의 (예전) 값 — 재기록 보호 판단용
      continue
    }
    versionCache.set(key, row.version)
    const raw = valueToRaw(row.payload)
    try { rawSet(key, raw) } catch { /* ignore */ }
    setSynced(key, raw)
    if (!refresh) clearDirty(key)
  }
  return rows
}

function withTimeout(p, ms) {
  return Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ])
}


export function isSyncReadyFor(companyId) {
  return !!companyId && initializedFor === companyId
}

async function doInit(companyId) {
  const initStartedAt = Date.now()
  setSyncStatus('syncing')

  // 로그인 세션이 실제로 살아 있어야 한다 — 만료된 세션으로 조회하면 권한 정책 때문에 "빈 회사"로
  // 보이고, 그 상태에서 올린 예전 로컬 값이 나중에 서버 데이터를 덮어쓴다.
  const { data: sess } = await supabase.auth.getSession()
  if (!sess?.session) throw new Error('no_session')

  // (3) 다른 회사로 로그인 — 이전 회사의 로컬 데이터 정리
  const lastCompany = rawGet(META_COMPANY_KEY)
  if (lastCompany && lastCompany !== companyId) {
    const toRemove = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (isSyncableKey(k)) toRemove.push(k)
    }
    toRemove.forEach(rawRemove)
    for (const k of [...overlay.keys()]) overlay.delete(k)
    writeDirty({})
    console.info('[cloudSync] 다른 회사 로그인 — 이전 회사 로컬 데이터 정리:', toRemove.length)
  }

  // 지난 동기화 세션에서 수정됐지만 서버로 못 올라간 키 → 로컬 값 유지 후 업로드
  const dirty = readDirty()
  const keepLocal = new Set(
    Object.entries(dirty)
      .filter(([k, ts]) => typeof ts === 'number' && ts < initStartedAt && isSyncableKey(k) && rawGet(k) != null)
      .map(([k]) => k)
  )

  currentCompanyId = companyId
  versionCache.clear()
  lastSyncedRaw.clear()
  superseded.clear()

  const remoteRows = await withTimeout(pullRemote({ keepLocal }), PULL_TIMEOUT_MS)
  console.info('[cloudSync] 원격에서 받아온 행 수:', remoteRows.length, '/ 로컬 우선 키:', keepLocal.size)

  // 서버에 없는 로컬 키(이전부터 이 브라우저에만 있던 데이터)와 dirty 키 업로드
  const remoteKeys = new Set(remoteRows.map((r) => r.data_key))
  const toPush = new Set(keepLocal)
  if (!lastCompany || lastCompany === companyId) {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (isSyncableKey(k) && !remoteKeys.has(k)) toPush.add(k)
    }
    for (const k of overlay.keys()) if (!remoteKeys.has(k)) toPush.add(k)
  }
  rawSet(META_COMPANY_KEY, companyId)
  initializedFor = companyId
  setSyncStatus('done')
  // 업로드는 화면 표시를 막지 않고 백그라운드로 진행
  for (const k of toPush) pushKey(k)
  console.info('[cloudSync] 초기화 완료, 업로드 대상:', toPush.size)
  return true
}

// 로그인 + 회사 소속 확인 후 호출. 같은 회사에 대해 여러 번 불러도 한 번만 실행되고,
// 진행 중이면 같은 Promise를 돌려준다. 성공 true / 실패 false.
export function initCloudSync(companyId) {
  if (!companyId) return Promise.resolve(false)
  if (initializedFor === companyId) return Promise.resolve(true)
  if (initPromise && initPromiseFor === companyId) return initPromise
  initPromiseFor = companyId
  initPromise = doInit(companyId)
    .catch((e) => {
      console.warn('[cloudSync] 초기화 실패:', String(e?.message || e))
      if (initializedFor !== companyId) currentCompanyId = null
      setSyncStatus('error')
      return false
    })
    .finally(() => { initPromise = null; initPromiseFor = null })
  return initPromise
}

// 로그아웃 시 호출 — 대기 중인 저장을 끝까지 보낸 뒤(최대 FLUSH_TIMEOUT_MS) 리셋한다.
// 반환된 Promise가 끝난 다음에 Supabase 세션을 종료해야 마지막 저장이 인증된 상태로 나간다.
export async function resetCloudSync() {
  try { await withTimeout(flushPending(), FLUSH_TIMEOUT_MS) } catch { /* 남은 키는 dirty로 남아 다음 로그인 때 업로드 */ }
  for (const t of retryTimers.values()) clearTimeout(t)
  retryTimers.clear()
  retryCounts.clear()
  initializedFor = null
  currentCompanyId = null
  versionCache.clear()
  lastSyncedRaw.clear()
  superseded.clear()
  setSyncStatus('idle')
}

export const _internal = { isSyncableKey, EXCLUDE_KEYS, readDirty, flushPending }
