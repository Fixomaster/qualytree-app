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
//   1) 로그인 + 회사 소속 확인 후 initCloudSync(company)가 1회 호출된다.
//   2) company_data 테이블(기존 스키마: company_id/data_type/data_key/payload)에서
//      data_type='localStorage_sync'인 그 회사의 모든 행을 가져와 localStorage에
//      반영한다(원격이 있으면 원격이 우선). data_type을 고정 상수로 써서, 이 테이블을
//      다른 용도로 이미/앞으로 쓰더라도 서로 데이터가 섞이지 않게 한다.
//   3) 로컬에만 있고 원격에는 아직 없는 키(이번 마이그레이션 이전부터 이 브라우저에
//      쌓여있던 데이터)는 그대로 원격에 최초 업로드(seed)한다.
//   4) 이후 localStorage.setItem을 가로채, 동기화 대상 키가 바뀔 때마다 800ms
//      디바운스 후 Supabase에 upsert한다.
//   5) 창이 다시 포커스를 받으면(다른 기기/사용자가 그 사이 저장했을 수 있으므로)
//      편집 중이 아닌 키에 한해 원격 값을 다시 당겨온다.
//
// 제외 키: 인증 토큰, 로그인 세션, 화면 내비게이션 상태 등 "이 브라우저에만
// 의미 있는" 값은 동기화하지 않는다. (EXCLUDE_KEYS 참고)

import { supabase, getSupabaseUser } from './supabase'

const TABLE = 'company_data'
// 기존에 이 테이블은 company_id+data_type+data_key 3중 유니크 제약으로 이미 만들어져
// 있었다(다른 목적으로 미리 준비된 것으로 보이며 프론트엔드에서 실제로 쓰는 곳은 없었음).
// localStorage 동기화 용도임을 구분하기 위한 고정 data_type 값.
const DATA_TYPE = 'localStorage_sync'
const DEBOUNCE_MS = 800

// 회사 데이터가 아니라 "이 브라우저/이 세션에만" 의미 있는 값 — 동기화 제외
const EXCLUDE_KEYS = new Set([
  'qualytree.auth',            // 데모/캐시 세션 (Supabase auth가 진짜 SSoT)
  'qualytree.supabase.auth',   // Supabase SDK 자체 토큰 저장소
  'qualytree.pendingJoin',     // 회사 가입 진행 중 임시 상태
  'qualytree.signup',          // 로그인 전 가입 폼 임시 저장
  'qualytree.dept',            // 현재 선택된 부서 화면 (내비게이션 상태)
  'qualytree.product_id',      // 현재 선택된 제품 ID (내비게이션 상태)
  'qualytree.userLevel',       // 사용자별 권한 캐시 (company_members가 SSoT)
  'qualytree.plans',           // 요금제 캐시 (platform_config가 SSoT, #89 참고)
  'userToggles',               // 화면 표시 개인 취향 토글
])

function isSyncableKey(key) {
  if (!key) return false
  if (EXCLUDE_KEYS.has(key)) return false
  if (key.startsWith('qualytree.')) return true
  if (key.startsWith('qms_')) return true
  if (key === 'qt_menu_perms') return true
  return false
}

let originalSetItem = null
let originalRemoveItem = null
let patched = false
let currentCompanyId = null
let currentUserId = null
let currentUserName = null
const pendingTimers = new Map() // key -> timeout id
const inFlightKeys = new Set()  // 키가 현재 로컬 편집(디바운스 대기) 중이면 원격 재수신으로 덮어쓰지 않기 위함

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

async function pushKey(key) {
  inFlightKeys.delete(key)
  if (!currentCompanyId) return
  let raw
  try { raw = originalGetItem(key) } catch { return }
  if (raw == null) return
  const { value } = safeParse(raw)
  try {
    await supabase.from(TABLE).upsert(
      {
        company_id: currentCompanyId,
        data_type: DATA_TYPE,
        data_key: key,
        payload: value,
      },
      { onConflict: 'company_id,data_type,data_key' }
    )
  } catch (e) {
    console.warn('[cloudSync] push 실패:', key, String(e?.message || e))
  }
}

function schedulePush(key) {
  if (!isSyncableKey(key) || !currentCompanyId) return
  inFlightKeys.add(key)
  const existing = pendingTimers.get(key)
  if (existing) clearTimeout(existing)
  const t = setTimeout(() => {
    pendingTimers.delete(key)
    pushKey(key)
  }, DEBOUNCE_MS)
  pendingTimers.set(key, t)
}

function flushPending() {
  for (const [key, t] of pendingTimers) {
    clearTimeout(t)
    pushKey(key)
  }
  pendingTimers.clear()
}

function originalGetItem(key) {
  try { return window.localStorage.getItem(key) } catch { return null }
}

function patchStorage() {
  if (patched) return
  originalSetItem = window.localStorage.setItem.bind(window.localStorage)
  originalRemoveItem = window.localStorage.removeItem.bind(window.localStorage)

  window.localStorage.setItem = function (key, val) {
    originalSetItem(key, val)
    if (isSyncableKey(key)) schedulePush(key)
  }
  window.localStorage.removeItem = function (key) {
    originalRemoveItem(key)
    if (isSyncableKey(key) && currentCompanyId) {
      supabase.from(TABLE).delete()
        .eq('company_id', currentCompanyId)
        .eq('data_type', DATA_TYPE)
        .eq('data_key', key)
        .then(() => {}, () => {})
    }
  }
  patched = true

  window.addEventListener('beforeunload', flushPending)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPending()
    else if (document.visibilityState === 'visible') pullRemote({ skipInFlight: true })
  })
}

async function pullRemote({ skipInFlight } = {}) {
  if (!currentCompanyId) return
  const { data, error } = await supabase
    .from(TABLE)
    .select('data_key, payload')
    .eq('company_id', currentCompanyId)
    .eq('data_type', DATA_TYPE)
  if (error) {
    console.warn('[cloudSync] pull 실패:', String(error?.message || error))
    return
  }
  for (const row of data || []) {
    if (skipInFlight && inFlightKeys.has(row.data_key)) continue
    try {
      originalSetItem(row.data_key, valueToRaw(row.payload))
    } catch { /* ignore */ }
  }
  return data || []
}

async function seedMissingLocalKeys(remoteRows) {
  const remoteKeys = new Set((remoteRows || []).map(r => r.data_key))
  const toSeed = []
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i)
    if (isSyncableKey(key) && !remoteKeys.has(key)) toSeed.push(key)
  }
  for (const key of toSeed) {
    await pushKey(key)
  }
}

let initializedFor = null

// 로그인 + 회사 소속 확인 후 1회(회사가 바뀌면 재)호출
export async function initCloudSync(companyId) {
  if (!companyId) return
  if (initializedFor === companyId) return
  initializedFor = companyId
  currentCompanyId = companyId
  try {
    const user = await getSupabaseUser()
    currentUserId = user?.id || null
    currentUserName = user?.user_metadata?.name || user?.email || null
  } catch { /* ignore */ }

  patchStorage()
  try {
    const remoteRows = await pullRemote()
    await seedMissingLocalKeys(remoteRows)
  } catch (e) {
    console.warn('[cloudSync] 초기화 중 오류:', String(e?.message || e))
  }
}

// 로그아웃 시 호출 — 다음 로그인 때 다시 초기화되도록 리셋
export function resetCloudSync() {
  flushPending()
  initializedFor = null
  currentCompanyId = null
  currentUserId = null
  currentUserName = null
}

export const _internal = { isSyncableKey, EXCLUDE_KEYS }
