// src/lib/productLifecycleState.js
// 제품 카드(제품·공정 화면)에 필요한 두 가지 추가 개념의 SSoT:
//   1) 제품 유형 — 기허가(이미 허가번호가 있는 제품) vs 신규(설계 계획부터 시작하는 개발 중 제품)
//   2) 모델(변형) 목록 — 같은 제품 안의 세부 모델(예: 나사 사이즈별 모델코드)
// 기존 productDocs(licenses)와 함께 사용되며, 신규 필드/모듈을 추가할 뿐 기존 데이터 구조는
// 건드리지 않는다.

import { productDocs } from './productDocsState'

// ── 제품 유형 ──
export const PRODUCT_KIND = {
  LICENSED: 'licensed', // 기허가 — 이미 인허가를 받은 제품, 허가정보 입력으로 등록
  NEW: 'new', // 신규 — 개발 중인 제품, 설계 계획(9단계)부터 시작
}

// 레거시 제품(kind 필드가 없는 기존 데이터)은 기허가로 간주한다(하위 호환).
export function productKind(p) {
  return p && p.kind === PRODUCT_KIND.NEW ? PRODUCT_KIND.NEW : PRODUCT_KIND.LICENSED
}

// ── 신규 제품 설계 계획 (ISO 13485 §7.3 설계관리 단계 기준) ──
export const DESIGN_STAGES = [
  '설계 입력 (Design Input)',
  '설계 출력 (Design Output)',
  '설계 검토 (Design Review)',
  '설계 검증 (Design Verification)',
  '설계 밸리데이션 (Design Validation)',
  '위험관리 (ISO 14971)',
  '설계 이관 (Design Transfer)',
  '인허가 신청 준비',
  '제조허가 취득',
]

export function designStepsOf(p) {
  const arr = Array.isArray(p && p.designSteps) ? p.designSteps : []
  return DESIGN_STAGES.map((_, i) => !!arr[i])
}

export function designProgressOf(p) {
  const steps = designStepsOf(p)
  const done = steps.filter(Boolean).length
  const currentIdx = steps.findIndex((s) => !s)
  return {
    done,
    total: DESIGN_STAGES.length,
    pct: Math.round((done / DESIGN_STAGES.length) * 100),
    currentIdx,
    currentLabel: currentIdx === -1 ? '설계 완료 · 허가 신청 대기' : DESIGN_STAGES[currentIdx],
  }
}

// ── 기허가 제품 등록 완료율 ──
// 등급·분류번호·허가번호(+첨부)·모델 등록 여부를 기준으로 간단히 계산한다.
export function licensedProgressOf(product, productKey) {
  const licenses = productDocs.getLicenses(productKey)
  const primary = licenses[0]
  const models = productModels.getForProduct(productKey)
  const checks = [
    !!(product && product.grade),
    !!(product && product.classNo),
    !!(primary && primary.licenseNo),
    !!(primary && primary.fileId),
    models.length > 0,
  ]
  const done = checks.filter(Boolean).length
  return { done, total: checks.length, pct: Math.round((done / checks.length) * 100), primaryLicense: primary || null }
}

// ── 모델(변형) 목록 ──
const MODEL_KEY = 'qualytree.productModels'
const muid = () => Math.random().toString(36).slice(2, 10)

function loadModels() {
  try {
    const raw = localStorage.getItem(MODEL_KEY)
    return Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : []
  } catch {
    return []
  }
}
function saveModels(list) {
  try { localStorage.setItem(MODEL_KEY, JSON.stringify(list)) } catch { /* ignore */ }
}

export const productModels = {
  getAll() {
    return loadModels()
  },
  getForProduct(productKey) {
    return loadModels()
      .filter((m) => m.productKey === (productKey || 'main'))
      .sort((a, b) => (a.code || '').localeCompare(b.code || ''))
  },
  add(productKey, item) {
    const list = loadModels()
    const rec = { id: muid(), productKey: productKey || 'main', code: '', spec: '', createdAt: new Date().toISOString(), ...item }
    list.push(rec)
    saveModels(list)
    return rec
  },
  update(id, patch) {
    const list = loadModels().map((m) => (m.id === id ? { ...m, ...patch } : m))
    saveModels(list)
  },
  remove(id) {
    saveModels(loadModels().filter((m) => m.id !== id))
  },
}
