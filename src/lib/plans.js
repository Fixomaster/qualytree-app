// src/lib/plans.js
// 구독 플랜 설정 — 운영자가 수정 가능 (localStorage 기반).
// Supabase 복구 후 superadmin 테이블로 영속화 예정.

const STORE_KEY = 'qualytree.plans'

export const DEFAULT_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    monthly: 99000,
    annualDiscountPct: 20,
    seats: 5,
    recommended: false,
    custom: false,
    features: ['QMS 문서 (AI 초안)', 'GMP 기록 전체', '데이터 이전 (셀프)'],
  },
  {
    id: 'pro',
    name: 'Professional',
    monthly: 249000,
    annualDiscountPct: 20,
    seats: 20,
    recommended: true,
    custom: false,
    features: ['Starter 전체', '인허가 기술문서', 'GMP 심사관 열람'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthly: 0,
    annualDiscountPct: 0,
    seats: 0, // 0 = 무제한
    recommended: false,
    custom: true, // 가격 문의형
    features: ['Professional 전체', '데이터 이전 (대행)', 'CE/FDA 모듈(예정)', '전담 컨설턴트', 'SLA 보장'],
  },
]

export function loadPlans() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      if (Array.isArray(p) && p.length) return p
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
