// src/lib/plans.js
// 구독 플랜 설정 — 운영자가 수정 가능 (localStorage 기반).
// Supabase 복구 후 superadmin 테이블로 영속화 예정.

import { supabase } from './supabase'

const STORE_KEY = 'qualytree.plans'
const CONFIG_KEY = 'plans' // platform_config.key (서버 공유 단일 소스)

// 고객 플랜 단일 소스 (가입·온보딩·운영자 편집이 모두 이걸 사용)
// certs: 플랜에 포함된 인증 id 목록 (CERT_DEFS 참조). 플랜↔인증 연동의 근거.
// 금액은 홈페이지 가입(Signup.jsx) 결제 단계의 실제 요금 모델(2026-09 확정)과 일치시킨다:
// 기본 QMS + 인증 1개 = 월 300만원(VAT 별도), 추가 인증 각 +월 100만원.
// ISO 13485는 KGMP(제조업체) 기본 계약 시 무료 포함. 컨설팅 3종은 담당자 협의(가격 문의형).
export const DEFAULT_PLANS = [
  {
    id: 'kgmp',
    name: '제조업체 기본 (KGMP)',
    monthly: 3000000,
    annualDiscountPct: 0,
    seats: 0,
    certs: ['kgmp', 'iso13485'],
    recommended: true,
    custom: false,
    features: ['ISO 13485 무료 포함 (KGMP 계약업체)', '문서·기록·심사 대응 전 기능', '관리자 + 사용자 계정 무제한', 'VAT 별도 · 월납'],
  },
  {
    id: 'kgmp_importer',
    name: '수입업체 기본 (수입사 GMP)',
    monthly: 3000000,
    annualDiscountPct: 0,
    seats: 0,
    certs: ['kgmp_importer'],
    recommended: false,
    custom: false,
    features: ['외국제조소 등록·GMP 적합인정서 관리', '수입 인허가 제출 문서 자동화', '관리자 + 사용자 계정 무제한', 'VAT 별도 · 월납'],
  },
  {
    id: 'importer_iso',
    name: '수입업체 기본 + ISO 13485',
    monthly: 4000000,
    annualDiscountPct: 0,
    seats: 0,
    certs: ['kgmp_importer', 'iso13485'],
    recommended: false,
    custom: false,
    features: ['수입업체 기본 전체 기능', '+ ISO 13485 국제 품질경영시스템 추가 (+월 100만원)', '외국제조소 등록·GMP 적합인정서 관리'],
  },
  {
    id: 'kgmp_fda',
    name: '제조업체 기본 + FDA QMSR',
    monthly: 4000000,
    annualDiscountPct: 0,
    seats: 0,
    certs: ['kgmp', 'iso13485', 'fda'],
    recommended: false,
    custom: false,
    features: ['제조업체 기본(KGMP + ISO 13485) 전체 기능', '+ FDA QMSR(21 CFR 820) 추가 (+월 100만원)', '510(k)/UDI GUDID 신청 지원'],
  },
  {
    id: 'kgmp_ce',
    name: '제조업체 기본 + EU MDR (CE)',
    monthly: 4000000,
    annualDiscountPct: 0,
    seats: 0,
    certs: ['kgmp', 'iso13485', 'ce'],
    recommended: false,
    custom: false,
    features: ['제조업체 기본(KGMP + ISO 13485) 전체 기능', '+ EU MDR 2017/745 추가 (+월 100만원)', 'PRRC·EUDAMED·NB 신청 지원'],
  },
  {
    id: 'kgmp_fda_ce',
    name: '제조업체 기본 + FDA + CE (글로벌)',
    monthly: 5000000,
    annualDiscountPct: 0,
    seats: 0,
    certs: ['kgmp', 'iso13485', 'fda', 'ce'],
    recommended: false,
    custom: false,
    features: ['제조업체 기본(KGMP + ISO 13485) 전체 기능', '+ FDA QMSR, + EU MDR 동시 추가 (+월 각 100만원)', '글로벌 3대 인증 통합 관리'],
  },
  {
    id: 'consult_setup',
    name: '컨설팅 · 초기 입력·구축',
    monthly: 0,
    annualDiscountPct: 0,
    seats: 0,
    certs: [],
    recommended: false,
    custom: true,
    features: ['초기 기업은 품질체계 설계부터, 기존 기업은 기존 문서·기록 이관과 재구성까지 진행', '제품·기간에 따라 별도 견적 (담당자 협의)'],
  },
  {
    id: 'consult_perftest',
    name: '컨설팅 · 제품 성능테스트',
    monthly: 0,
    annualDiscountPct: 0,
    seats: 0,
    certs: [],
    recommended: false,
    custom: true,
    features: ['적용 표준 선정, 시험소 매칭·견적 비교', '시험 계획과 성적서 검토 지원 (담당자 협의)'],
  },
  {
    id: 'consult_audit',
    name: '컨설팅 · 인증심사 대비',
    monthly: 0,
    annualDiscountPct: 0,
    seats: 0,
    certs: [],
    recommended: false,
    custom: true,
    features: ['KGMP·ISO 13485·NB·FDA 심사 전 모의심사와 부적합 예방', '심사 당일 대응 지원 (담당자 협의)'],
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
