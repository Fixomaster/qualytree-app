// src/lib/plans.js
// 구독 플랜 설정 — 운영자가 수정 가능 (localStorage 기반).
// Supabase 복구 후 superadmin 테이블로 영속화 예정.

import { supabase } from './supabase'

const STORE_KEY = 'qualytree.plans'
const CONFIG_KEY = 'plans' // platform_config.key (서버 공유 단일 소스)

// 고객 플랜 단일 소스 (가입·온보딩·운영자 편집이 모두 이걸 사용)
// certs: 플랜에 포함된 인증 id 목록 (CERT_DEFS 참조). 플랜↔인증 연동의 근거.
export const DEFAULT_PLANS = [
  {
    id: 'kgmp',
    name: 'KGMP only',
    monthly: 250000,
    annualDiscountPct: 15,
    seats: 5,
    certs: ['kgmp'],
    recommended: false,
    custom: false,
    features: ['KGMP 품질시스템 전체', 'GMP 기록·전자배치기록', '문서 AI 초안'],
  },
  {
    id: 'kgmp_importer',
    name: '수입사 GMP',
    monthly: 150000,
    annualDiscountPct: 15,
    seats: 5,
    // 수입사는 자기 제조소가 아니라 외국제조소가 GMP 심사 대상이므로 KGMP(국내제조사) 화면은
    // 필요 없다 — kgmp_importer만 켠다. 국내 제조도 함께 하는 회사는 온보딩에서 KGMP를
    // 별도로 추가하면 된다(KgmpHub 상단 안내 참조).
    certs: ['kgmp_importer'],
    recommended: false,
    custom: false,
    features: ['외국제조소 등록·GMP 적합인정서 관리', '수입 인허가 제출 문서 자동화', '문서 AI 초안'],
  },
  {
    id: 'fda',
    name: 'FDA QMSR only',
    monthly: 350000,
    annualDiscountPct: 15,
    seats: 5,
    certs: ['fda'],
    recommended: false,
    custom: false,
    features: ['FDA QMSR(21 CFR 820) 품질시스템', '510(k)/UDI GUDID 신청 지원', '문서 AI 초안'],
  },
  {
    id: 'ce',
    name: 'CE MDR only',
    monthly: 380000,
    annualDiscountPct: 15,
    seats: 5,
    certs: ['ce'],
    recommended: false,
    custom: false,
    features: ['EU MDR 2017/745 품질시스템', 'PRRC·EUDAMED·NB 신청 지원', '문서 AI 초안'],
  },
  {
    id: 'iso',
    name: 'ISO 13485 only',
    monthly: 320000,
    annualDiscountPct: 15,
    seats: 5,
    certs: ['iso13485'],
    recommended: false,
    custom: false,
    features: ['ISO 13485 QMS 전체', 'GMP 기록·전자배치기록', '문서 AI 초안'],
  },
  {
    id: 'bundle',
    name: 'KGMP + ISO 13485',
    monthly: 500000,
    annualDiscountPct: 15,
    seats: 10,
    certs: ['kgmp', 'iso13485'],
    recommended: true,
    custom: false,
    features: ['KGMP + ISO 13485 통합 매핑', '인허가 기술문서', 'GMP 심사관 열람 모드'],
  },
  {
    id: 'importer_iso',
    name: '수입사 GMP + ISO 13485',
    monthly: 400000,
    annualDiscountPct: 15,
    seats: 10,
    certs: ['kgmp_importer', 'iso13485'],
    recommended: false,
    custom: false,
    features: ['외국제조소 등록·GMP 적합인정서 관리', 'ISO 13485 QMS 통합 매핑', '수입 인허가 제출 문서 자동화'],
  },
  {
    id: 'kgmp_importer_iso',
    name: 'KGMP + 수입사 GMP + ISO 13485',
    monthly: 600000,
    annualDiscountPct: 15,
    seats: 15,
    certs: ['kgmp', 'kgmp_importer', 'iso13485'],
    recommended: false,
    custom: false,
    features: ['국내제조 KGMP + 수입 GMP 동시 지원', 'ISO 13485 QMS 통합 매핑', '인허가 기술문서·GMP 심사관 열람 모드'],
  },
  {
    id: 'founding',
    name: 'Founding (베타 무료)',
    monthly: 0,
    annualDiscountPct: 0,
    seats: 10,
    certs: ['kgmp', 'iso13485'],
    recommended: false,
    custom: false,
    features: ['베타 기간 무료', '법인 설립 후 첫 청구', '전 기능 체험'],
  },
]

// 인증 정의 — 플랜에 편입 가능한 인증(planAvailable)과 준비중 인증 구분
export const CERT_DEFS = [
  { id: 'kgmp', label: 'KGMP (의료기기 GMP)', sub: '식약처 · 국내 제조사', planAvailable: true },
  { id: 'kgmp_importer', label: '수입사 GMP', sub: '식약처 · 외국제조소(수입GMP)', planAvailable: true },
  { id: 'iso13485', label: 'ISO 13485:2016', sub: '국제 품질경영시스템', planAvailable: true },
  { id: 'fda', label: 'FDA QMSR', sub: '미국 · 21 CFR 820', planAvailable: true },
  { id: 'ce', label: 'CE MDR', sub: '유럽 · 2017/745', planAvailable: true },
  { id: 'mdsap', label: 'MDSAP', sub: '5개국 단일심사 (준비중)', planAvailable: false },
]

// 가입(Signup) 저장값 등에서 쓰는 라벨 → id 매핑
export const CERT_LABEL_TO_ID = {
  'KGMP': 'kgmp',
  '수입사 GMP': 'kgmp_importer',
  'ISO 13485': 'iso13485',
  'ISO 13485:2016': 'iso13485',
  'FDA QMSR': 'fda',
  'FDA 510(k)': 'fda',
  'EU MDR': 'ce',
  'CE MDR': 'ce',
  'MDSAP': 'mdsap',
}
export const PLAN_AVAILABLE_CERT_IDS = CERT_DEFS.filter((c) => c.planAvailable).map((c) => c.id)

// 캐시(로컬/서버)에 저장된 플랜 목록에 새 기본 플랜(예: 수입사 GMP 추가)이 누락된 경우
// 자동으로 병합해준다. 운영자가 편집한 기존 플랜은 그대로 두고, id가 없는 것만 추가.
function mergeMissingDefaults(list) {
  if (!Array.isArray(list)) return list
  const ids = new Set(list.map((x) => x.id))
  const missing = DEFAULT_PLANS.filter((d) => !ids.has(d.id)).map((d) => ({ ...d, features: [...d.features] }))
  return missing.length ? [...list, ...missing] : list
}

export function loadPlans() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      // certs 필드가 있는 신모델만 사용(구 starter/pro/enterprise 저장본은 무시하고 기본값으로 마이그레이션)
      if (Array.isArray(p) && p.length && p.every((x) => Array.isArray(x.certs))) return mergeMissingDefaults(p)
    }
  } catch { /* ignore */ }
  return DEFAULT_PLANS.map((p) => ({ ...p, features: [...p.features] }))
}

export function savePlans(plans) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(plans)) } catch { /* ignore */ }
}

export function resetPlans() {
  try { localStorage.removeItem(STORE_KEY) } catch { /* ignore */ }
}

// 주기별 결제 금액 (custom 플랜은 null = 문의)
export function priceFor(plan, cycle) {
  if (!plan || plan.custom) return null
  if (cycle === 'annual') {
    return Math.round(plan.monthly * 12 * (1 - (plan.annualDiscountPct || 0) / 100))
  }
  return plan.monthly
}

export function won(n) {
  return n == null ? '문의' : '₩' + Number(n).toLocaleString('ko-KR')
}

export function seatLabel(plan) {
  if (!plan) return '-'
  return plan.seats > 0 ? `${plan.seats}명` : '무제한'
}

// ── 플랜 ↔ 인증 연동 헬퍼 ──────────────────────────────────────────────

// 플랜이 포함하는 인증을 불리언 맵으로 (모든 CERT_DEFS 키 포함; 준비중은 false)
export function certMapForPlan(plan) {
  const on = new Set((plan && plan.certs) || [])
  const m = {}
  CERT_DEFS.forEach((c) => { m[c.id] = on.has(c.id) })
  return m
}

// 켜진 인증 id 집합에 정확히 부합하는 플랜 찾기(플랜편입 가능 인증 기준). 없으면 null
export function planForCertIds(idsOn, plans) {
  const avail = new Set(PLAN_AVAILABLE_CERT_IDS)
  const want = new Set((idsOn || []).filter((id) => avail.has(id)))
  const list = plans || loadPlans()
  return (
    list.find((p) => {
      const pc = (p.certs || []).filter((id) => avail.has(id))
      return pc.length === want.size && pc.every((id) => want.has(id))
    }) || null
  )
}

export function planById(id, plans) {
  return (plans || loadPlans()).find((p) => p.id === id) || null
}

// ── 서버(Supabase) 공유 — 운영자 편집을 전 고객에게 반영 ──────────────
// 저장 구조: platform_config(key='plans', value=jsonb 플랜배열)
// localStorage는 즉시 렌더용 캐시. 서버가 단일 소스(전 고객 공유).

function validPlans(p) { return Array.isArray(p) && p.length && p.every((x) => x && Array.isArray(x.certs)) }

export async function fetchPlansFromServer() {
  try {
    const { data, error } = await supabase.from('platform_config').select('value').eq('key', CONFIG_KEY).maybeSingle()
    if (error || !data) return null
    return validPlans(data.value) ? data.value : null
  } catch { return null }
}

// 서버에서 받아 캐시에 반영하고 반환. 실패 시 기존 캐시/기본값.
export async function syncPlansFromServer() {
  const server = await fetchPlansFromServer()
  if (server) {
    const merged = mergeMissingDefaults(server)
    try { localStorage.setItem(STORE_KEY, JSON.stringify(merged)) } catch { /* ignore */ }
    return merged
  }
  return loadPlans()
}

// 운영자 저장: 서버 upsert(+로컬 캐시). 성공 여부 반환.
export async function savePlansToServer(plans) {
  try {
    savePlans(plans)
    const { error } = await supabase
      .from('platform_config')
      .upsert({ key: CONFIG_KEY, value: plans, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    return !error
  } catch { return false }
}
