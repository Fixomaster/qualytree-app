/**
 * Qualytree Entity Registry — SSoT 엔티티 등록부
 *
 * 모든 도메인 엔티티(검사 항목, 공정 블록, 제품, 작업 지시, 사용자 등)의
 * 마스터 위치(localStorage 키)와 CRUD 어댑터를 한 곳에서 관리한다.
 * linkage·changeControl 모듈은 항상 이 등록부를 통해 엔티티에 접근하므로,
 * "마스터 데이터가 두 군데에 존재"하는 SSoT 원칙 위반을 시스템적으로 차단한다.
 *
 * 적용 원칙:
 * - Project Instructions §9 Zero-Gap Linking: 단일 마스터 + 양방향 연결
 * - Project Instructions §13.15 구성 관리: 모든 엔티티의 정의·변경 추적
 *
 * 엔티티 식별자(EID): "<type>:<id>" 형식
 *   예: "inspectionTemplate:tpl-1736512345"
 *       "processBlock:cnc-milling"
 *       "workOrder:WO-2026-0001"
 */

import { inspectionTemplates } from './inspectionTemplates'
import { PROCESS_BLOCKS } from './processBlocks'
import { operations } from './operationsState'
import { onboarding } from './onboardingState'
import { auth } from './auth'

const CUSTOM_BLOCK_KEY = 'qualytree.customBlocks'
const CUSTOM_CATEGORY_KEY = 'qualytree.customCategories'

function loadCustomBlocks() {
  try {
    const raw = localStorage.getItem(CUSTOM_BLOCK_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/* ================================================================
   엔티티 타입 카탈로그
   ================================================================ */
export const ENTITY_TYPES = {
  INSPECTION_TEMPLATE: 'inspectionTemplate',
  PROCESS_BLOCK: 'processBlock',
  PRODUCT: 'product',
  WORK_ORDER: 'workOrder',
  STAGE: 'stage',
  USER_ROLE: 'userRole',
  REGULATION_SET: 'regulationSet',
  NCR: 'ncr',
  CAPA: 'capa',
  CHANGE_RECORD: 'changeRecord',
  // 향후 추가
  SOP_DOCUMENT: 'sopDocument',
  TECHNICAL_DOCUMENT: 'technicalDocument',
  DHF: 'dhf',
  DMR: 'dmr',
  RISK_FILE: 'riskFile',
  UDI_RECORD: 'udiRecord',
}

/* ================================================================
   엔티티 어댑터
   각 타입의 마스터 데이터에 접근하는 표준 인터페이스
   { findById, findAll, exists, getDisplayName }
   변이가 필요한 경우(create/update/delete)는 changeControl을 거쳐서 함
   ================================================================ */

const adapters = {
  /* ---------- 검사 항목 템플릿 ---------- */
  [ENTITY_TYPES.INSPECTION_TEMPLATE]: {
    findById(id) {
      // id 형식이 "blockId:tplId"가 아닌 단순 tplId일 수 있어 양쪽 지원
      if (id.includes(':')) {
        const [blockId, tplId] = id.split(':')
        return inspectionTemplates.forBlock(blockId).find((t) => t.id === tplId)
      }
      // 모든 블록 순회
      const all = inspectionTemplates.loadAll()
      for (const blockId of Object.keys(all)) {
        const found = all[blockId].find((t) => t.id === id)
        if (found) return { ...found, _blockId: blockId }
      }
      return null
    },
    findAll() {
      const all = inspectionTemplates.loadAll()
      const out = []
      Object.entries(all).forEach(([blockId, list]) => {
        list.forEach((t) => out.push({ ...t, _blockId: blockId }))
      })
      return out
    },
    exists(id) {
      return !!this.findById(id)
    },
    getDisplayName(entity) {
      return entity?.label || `검사 항목 ${entity?.id}`
    },
    getOwnerKey(entity) {
      return entity?._blockId || null // 어느 공정 블록에 속하는지
    },
  },

  /* ---------- 공정 블록 ---------- */
  [ENTITY_TYPES.PROCESS_BLOCK]: {
    findById(id) {
      const builtin = PROCESS_BLOCKS.find((b) => b.id === id)
      if (builtin) return { ...builtin, _isBuiltin: true }
      const custom = loadCustomBlocks().find((b) => b.id === id)
      if (custom) return { ...custom, _isBuiltin: false }
      return null
    },
    findAll() {
      return [
        ...PROCESS_BLOCKS.map((b) => ({ ...b, _isBuiltin: true })),
        ...loadCustomBlocks().map((b) => ({ ...b, _isBuiltin: false })),
      ]
    },
    exists(id) {
      return !!this.findById(id)
    },
    getDisplayName(entity) {
      return entity?.name || `공정 블록 ${entity?.id}`
    },
    getOwnerKey(entity) {
      return entity?.category || null
    },
  },

  /* ---------- 제품 (ONB-002에서 정의) ---------- */
  [ENTITY_TYPES.PRODUCT]: {
    findById(id) {
      const data = onboarding.getData()
      const products = data?.products || []
      return products.find((p) => p.id === id) || null
    },
    findAll() {
      const data = onboarding.getData()
      return data?.products || []
    },
    exists(id) {
      return !!this.findById(id)
    },
    getDisplayName(entity) {
      return entity?.name || `제품 ${entity?.id}`
    },
    getOwnerKey() {
      return null
    },
  },

  /* ---------- 작업 지시 ---------- */
  [ENTITY_TYPES.WORK_ORDER]: {
    findById(id) {
      return operations.getWorkOrder(id) || null
    },
    findAll() {
      return operations.load().workOrders || []
    },
    exists(id) {
      return !!this.findById(id)
    },
    getDisplayName(entity) {
      return entity ? `${entity.id} (${entity.productName} · ${entity.lotNumber})` : ''
    },
    getOwnerKey(entity) {
      return entity?.productId || null
    },
  },

  /* ---------- eBR 단계 (Stage) ---------- */
  [ENTITY_TYPES.STAGE]: {
    findById(id) {
      // id 형식: "WO-XXX:STAGE-YYY"
      const [woId, stageId] = id.split(':')
      const wo = operations.getWorkOrder(woId)
      if (!wo) return null
      const stage = wo.stages.find((s) => s.stageId === stageId)
      return stage ? { ...stage, _woId: woId } : null
    },
    findAll() {
      const wos = operations.load().workOrders || []
      const out = []
      wos.forEach((wo) => {
        wo.stages.forEach((s) => out.push({ ...s, _woId: wo.id }))
      })
      return out
    },
    exists(id) {
      return !!this.findById(id)
    },
    getDisplayName(entity) {
      return entity ? `Stage ${entity.order} (${entity.stageId})` : ''
    },
    getOwnerKey(entity) {
      return entity?._woId || null
    },
  },

  /* ---------- 사용자 권한 ---------- */
  [ENTITY_TYPES.USER_ROLE]: {
    findById(id) {
      // id = email 또는 user.name
      const cur = auth.current()
      if (cur && (cur.email === id || cur.name === id)) return cur
      return null
    },
    findAll() {
      const cur = auth.current()
      return cur ? [cur] : []
    },
    exists(id) {
      return !!this.findById(id)
    },
    getDisplayName(entity) {
      return entity?.name || entity?.email || ''
    },
    getOwnerKey() {
      return null
    },
  },

  /* ---------- 규제 세트 (ONB-004) ---------- */
  [ENTITY_TYPES.REGULATION_SET]: {
    findById(id) {
      const data = onboarding.getData()
      const regs = data?.regulations || []
      return regs.includes(id) ? { id, name: id } : null
    },
    findAll() {
      const data = onboarding.getData()
      return (data?.regulations || []).map((id) => ({ id, name: id }))
    },
    exists(id) {
      return !!this.findById(id)
    },
    getDisplayName(entity) {
      return entity?.name || entity?.id || ''
    },
    getOwnerKey() {
      return null
    },
  },

  /* ---------- NCR / CAPA / Change Record / 향후 엔티티 ---------- */
  // 일반 placeholder — localStorage 기반 단순 어댑터
  ...['ncr', 'capa', 'changeRecord', 'sopDocument', 'technicalDocument', 'dhf', 'dmr', 'riskFile', 'udiRecord'].reduce(
    (acc, type) => {
      const KEY = `qualytree.${type}s`
      acc[type] = {
        _key: KEY,
        load() {
          try {
            const raw = localStorage.getItem(KEY)
            return raw ? JSON.parse(raw) : []
          } catch {
            return []
          }
        },
        save(arr) {
          localStorage.setItem(KEY, JSON.stringify(arr))
        },
        findById(id) {
          return this.load().find((e) => e.id === id) || null
        },
        findAll() {
          return this.load()
        },
        exists(id) {
          return !!this.findById(id)
        },
        getDisplayName(entity) {
          return entity?.title || entity?.name || entity?.id || ''
        },
        getOwnerKey() {
          return null
        },
      }
      return acc
    },
    {}
  ),
}

/* ================================================================
   API
   ================================================================ */

/**
 * EID(엔티티 식별자) 생성
 * @param {string} type - ENTITY_TYPES 중 하나
 * @param {string} id
 * @returns {string} "type:id"
 */
export function eid(type, id) {
  return `${type}:${id}`
}

/**
 * EID 파싱
 * @param {string} eidStr
 * @returns {{ type, id } | null}
 */
export function parseEid(eidStr) {
  if (!eidStr || typeof eidStr !== 'string') return null
  const idx = eidStr.indexOf(':')
  if (idx < 0) return null
  return {
    type: eidStr.slice(0, idx),
    id: eidStr.slice(idx + 1),
  }
}

/**
 * 엔티티 조회
 * @param {string} eidStr
 * @returns {Object | null}
 */
export function findEntity(eidStr) {
  const p = parseEid(eidStr)
  if (!p) return null
  const adapter = adapters[p.type]
  if (!adapter) return null
  return adapter.findById(p.id)
}

/**
 * 엔티티 존재 확인
 */
export function entityExists(eidStr) {
  return !!findEntity(eidStr)
}

/**
 * 엔티티 표시 이름
 */
export function getEntityDisplayName(eidStr) {
  const p = parseEid(eidStr)
  if (!p) return eidStr
  const adapter = adapters[p.type]
  if (!adapter) return p.id
  const entity = adapter.findById(p.id)
  return adapter.getDisplayName(entity)
}

/**
 * 특정 타입의 모든 엔티티 조회
 */
export function findAllByType(type) {
  const adapter = adapters[type]
  return adapter ? adapter.findAll() : []
}

/**
 * 어댑터 직접 접근 (변이 시 사용 — changeControl이 호출)
 */
export function getAdapter(type) {
  return adapters[type] || null
}

/**
 * 등록된 모든 엔티티 타입 + 카운트
 */
export function getRegistry() {
  const out = {}
  Object.values(ENTITY_TYPES).forEach((type) => {
    const adapter = adapters[type]
    if (adapter && typeof adapter.findAll === 'function') {
      try {
        out[type] = adapter.findAll().length
      } catch {
        out[type] = 0
      }
    } else {
      out[type] = 0
    }
  })
  return out
}
