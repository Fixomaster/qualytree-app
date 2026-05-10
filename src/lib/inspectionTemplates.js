// 검사 항목 템플릿 — 공정 블록별 회사 고유 검사 규격
// 매니저가 정의 → 작업자는 측정값만 입력
// 템플릿 변경 시 §13.15 CCR(Configuration Change Record) 자동 등록 후보
const KEY = 'qualytree.inspectionTemplates'

/**
 * 데이터 구조:
 * {
 *   "cnc-milling": [
 *     {
 *       id: "tpl-1",
 *       label: "치수 A",
 *       unit: "mm",
 *       specMin: 19.95,
 *       specMax: 20.05,
 *       specNominal: 20.00,
 *       criticality: "Critical" | "Major" | "Minor",
 *       method: "CMM" | "버니어" | ...,
 *       sourceInspection: "치수 검사 (CMM)",  // 어느 자동 매핑 항목에서 시작했는지
 *       version: 1,
 *       definedBy: "홍길동",
 *       definedAt: "2026-05-10T10:00:00Z",
 *     }
 *   ],
 *   "ultrasonic-clean": [...]
 * }
 */

export const CRITICALITY = {
  CRITICAL: 'Critical',
  MAJOR: 'Major',
  MINOR: 'Minor',
}

export const CRITICALITY_OPTIONS = [
  { value: 'Critical', label: 'Critical', desc: '안전·필수 성능 직접 영향' },
  { value: 'Major', label: 'Major', desc: '주요 품질 특성' },
  { value: 'Minor', label: 'Minor', desc: '외관·일반 특성' },
]

export const inspectionTemplates = {
  loadAll() {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  },

  saveAll(map) {
    localStorage.setItem(KEY, JSON.stringify(map))
  },

  /** 특정 공정 블록의 검사 항목 템플릿 목록 */
  forBlock(blockId) {
    const all = this.loadAll()
    return all[blockId] || []
  },

  /** 새 템플릿 추가 */
  add(blockId, template, definedBy) {
    const all = this.loadAll()
    if (!all[blockId]) all[blockId] = []
    const newTpl = {
      id: `tpl-${Date.now()}`,
      version: 1,
      definedBy: definedBy || '매니저',
      definedAt: new Date().toISOString(),
      ...template,
    }
    all[blockId].push(newTpl)
    this.saveAll(all)
    return newTpl
  },

  /** 기존 템플릿 수정 — 버전 +1 */
  update(blockId, tplId, patch, definedBy) {
    const all = this.loadAll()
    const list = all[blockId] || []
    const idx = list.findIndex((t) => t.id === tplId)
    if (idx === -1) return null
    list[idx] = {
      ...list[idx],
      ...patch,
      version: (list[idx].version || 1) + 1,
      definedBy: definedBy || list[idx].definedBy,
      definedAt: new Date().toISOString(),
    }
    all[blockId] = list
    this.saveAll(all)
    return list[idx]
  },

  remove(blockId, tplId) {
    const all = this.loadAll()
    const list = all[blockId] || []
    all[blockId] = list.filter((t) => t.id !== tplId)
    this.saveAll(all)
  },

  /**
   * WO 발급 시 사용 — 템플릿 스냅샷 (시간 잠금)
   * 진행 중 WO는 발급 시점 템플릿을 영구 보존
   */
  snapshotForBlock(blockId) {
    return this.forBlock(blockId).map((t) => ({ ...t }))
  },

  /**
   * 자동 매핑 항목으로부터 단일 템플릿 시드 생성 (매니저 첫 등록 편의)
   * 매니저가 "치수 검사 (CMM)" 자동 매핑 항목을 보고 한 번 클릭하면
   * 빈 규격 템플릿이 생성되어 매니저가 specMin/specMax만 채우도록 유도
   */
  seedFromAutoMapping(blockId, sourceInspection, definedBy) {
    return this.add(
      blockId,
      {
        label: sourceInspection,
        unit: '',
        specMin: '',
        specMax: '',
        specNominal: '',
        criticality: CRITICALITY.MAJOR,
        method: '',
        sourceInspection,
      },
      definedBy
    )
  },
}

/**
 * 측정값이 규격에 적합한지 자동 판정
 * @param {number|string} value
 * @param {object} template
 * @returns {'pass' | 'fail' | 'unknown'}
 */
export function evalAgainstSpec(value, template) {
  const v = parseFloat(value)
  if (Number.isNaN(v)) return 'unknown'
  const min = template.specMin === '' ? null : parseFloat(template.specMin)
  const max = template.specMax === '' ? null : parseFloat(template.specMax)
  if (min == null && max == null) return 'unknown' // 규격 미정의
  if (min != null && v < min) return 'fail'
  if (max != null && v > max) return 'fail'
  return 'pass'
}
