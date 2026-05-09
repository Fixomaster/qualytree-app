// 카테고리 관리: 빌트인 6개 + 사용자 정의 카테고리 통합
// 빌트인은 processBlocks.js의 PROCESS_CATEGORIES, 사용자 정의는 localStorage

import { PROCESS_CATEGORIES as BUILTIN_CATEGORIES } from './processBlocks'

const KEY = 'qualytree.customCategories'

// 사용자가 카테고리 만들 때 고를 수 있는 아이콘 풀
// (StepProcess의 CATEGORY_ICONS 매핑과 동일한 키 사용)
export const CATEGORY_ICON_OPTIONS = [
  { id: 'Cog', label: '톱니바퀴 (가공)' },
  { id: 'Droplets', label: '물방울 (세척·도금)' },
  { id: 'Puzzle', label: '퍼즐 (조립)' },
  { id: 'Search', label: '돋보기 (검사)' },
  { id: 'Sparkles', label: '반짝임 (멸균·표면처리)' },
  { id: 'Package', label: '상자 (포장·물류)' },
  { id: 'FlaskConical', label: '플라스크 (시험·연구)' },
  { id: 'Wrench', label: '렌치 (수리·교정)' },
  { id: 'Truck', label: '트럭 (입출고)' },
  { id: 'Layers', label: '레이어 (적층·코팅)' },
]

export function loadCustomCategories() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveCustomCategories(arr) {
  localStorage.setItem(KEY, JSON.stringify(arr))
}

// 빌트인 + 사용자 — 화면에 보여줄 통합 카테고리 목록
export function getAllCategories(customCategories) {
  const builtin = BUILTIN_CATEGORIES.map((c) => ({ ...c, isBuiltin: true }))
  const custom = customCategories.map((c) => ({ ...c, isBuiltin: false }))
  return [...builtin, ...custom]
}

export function isBuiltinCategory(id) {
  return BUILTIN_CATEGORIES.some((c) => c.id === id)
}
