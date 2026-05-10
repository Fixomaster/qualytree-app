/**
 * Qualytree Linkage — 양방향 연결망
 *
 * 모든 엔티티 간의 forward/backward 연결을 자동 추적한다.
 * 엔티티 A가 B를 인용·참조·포함하면, 시스템이 자동으로 다음 두 인덱스를 갱신한다:
 *   - forward(A) → [B, ...] : A가 영향을 주는 대상
 *   - backward(B) → [A, ...] : B를 인용하는 대상
 *
 * 이 인덱스는 changeControl이 영향 분석 보고서를 생성할 때 사용된다.
 *
 * 적용 원칙:
 * - Project Instructions §9 Zero-Gap Linking: 양방향 연결, 누락 방지
 * - Project Instructions §13.15 변경 영향 분석
 * - Project Instructions §17.6 시판후 신호 → 위험관리·CAPA 자동 환류
 *
 * 데이터 구조:
 *   localStorage('qualytree.linkage') = {
 *     forward: { "<eid>": [{ to, kind, since }, ...] },
 *     backward: { "<eid>": [{ from, kind, since }, ...] }
 *   }
 */

import { eid, parseEid, entityExists } from './entityRegistry'

const KEY = 'qualytree.linkage'

/* ================================================================
   연결 종류 (Link Kind)
   ================================================================ */
export const LINK_KINDS = {
  // 검사 항목 ↔ 사용처
  CITED_BY_STAGE: 'citedByStage', // 검사 항목이 eBR 단계에서 사용됨
  CITED_BY_SOP: 'citedBySop', // 검사 항목이 SOP에서 인용됨
  CITED_BY_DMR: 'citedByDmr',
  CITED_BY_TECH_DOC: 'citedByTechDoc',
  CITED_BY_FMEA: 'citedByFmea',
  // 공정 블록 ↔ 검사 항목
  HAS_INSPECTION_TEMPLATE: 'hasInspectionTemplate',
  // 작업 지시 ↔ 단계
  HAS_STAGE: 'hasStage',
  // 작업 지시 ↔ 제품
  FOR_PRODUCT: 'forProduct',
  // 단계 ↔ 공정 블록
  EXECUTES_BLOCK: 'executesBlock',
  // CCR ↔ 영향 받는 엔티티
  CHANGED: 'changed',
  IMPACTS: 'impacts',
  // NCR ↔ 단계
  RAISED_FROM_STAGE: 'raisedFromStage',
  // CAPA ↔ NCR
  ADDRESSES_NCR: 'addressesNcr',
  // 위험관리
  IDENTIFIED_RISK: 'identifiedRisk',
  CONTROLLED_BY: 'controlledBy',
}

const KIND_LABELS = {
  citedByStage: '단계에서 사용',
  citedBySop: 'SOP에서 인용',
  citedByDmr: 'DMR에서 인용',
  citedByTechDoc: '기술문서에서 인용',
  citedByFmea: 'FMEA에서 인용',
  hasInspectionTemplate: '검사 항목 포함',
  hasStage: '단계 포함',
  forProduct: '제품 대상',
  executesBlock: '공정 블록 실행',
  changed: '변경됨',
  impacts: '영향 받음',
  raisedFromStage: '단계에서 발의',
  addressesNcr: 'NCR 대응',
  identifiedRisk: '식별된 위험',
  controlledBy: '통제됨',
}

export function getKindLabel(kind) {
  return KIND_LABELS[kind] || kind
}

/* ================================================================
   Storage
   ================================================================ */
function load() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : { forward: {}, backward: {} }
  } catch {
    return { forward: {}, backward: {} }
  }
}

function save(state) {
  localStorage.setItem(KEY, JSON.stringify(state))
}

/* ================================================================
   API
   ================================================================ */

/**
 * 연결 추가 (양방향 동시 갱신)
 * @param {string} fromEid - 출발 엔티티 EID
 * @param {string} toEid - 도착 엔티티 EID
 * @param {string} kind - LINK_KINDS 중 하나
 */
export function addLink(fromEid, toEid, kind) {
  if (!fromEid || !toEid || fromEid === toEid) return
  const state = load()
  const since = new Date().toISOString()

  // forward
  if (!state.forward[fromEid]) state.forward[fromEid] = []
  const fwExists = state.forward[fromEid].some(
    (l) => l.to === toEid && l.kind === kind
  )
  if (!fwExists) {
    state.forward[fromEid].push({ to: toEid, kind, since })
  }

  // backward
  if (!state.backward[toEid]) state.backward[toEid] = []
  const bwExists = state.backward[toEid].some(
    (l) => l.from === fromEid && l.kind === kind
  )
  if (!bwExists) {
    state.backward[toEid].push({ from: fromEid, kind, since })
  }

  save(state)
}

/**
 * 연결 제거 (양방향 동시 정리)
 */
export function removeLink(fromEid, toEid, kind = null) {
  const state = load()

  if (state.forward[fromEid]) {
    state.forward[fromEid] = state.forward[fromEid].filter(
      (l) => !(l.to === toEid && (kind == null || l.kind === kind))
    )
    if (state.forward[fromEid].length === 0) delete state.forward[fromEid]
  }

  if (state.backward[toEid]) {
    state.backward[toEid] = state.backward[toEid].filter(
      (l) => !(l.from === fromEid && (kind == null || l.kind === kind))
    )
    if (state.backward[toEid].length === 0) delete state.backward[toEid]
  }

  save(state)
}

/**
 * 엔티티가 영향을 주는 대상 (forward 인용 대상)
 * @param {string} entityEid
 * @returns {Array} [{ to, kind, since }, ...]
 */
export function getForwardLinks(entityEid) {
  const state = load()
  return state.forward[entityEid] || []
}

/**
 * 엔티티를 인용·참조하는 대상 (backward — 영향 분석에 핵심)
 * @param {string} entityEid
 * @returns {Array} [{ from, kind, since }, ...]
 */
export function getBackwardLinks(entityEid) {
  const state = load()
  return state.backward[entityEid] || []
}

/**
 * 엔티티 변경·삭제 시 영향 받는 모든 대상 (재귀 — 추후 확장 가능)
 * 1단계 backward만 우선 반환 (대부분의 의사결정에 충분)
 */
export function getImpactedEntities(entityEid) {
  const backLinks = getBackwardLinks(entityEid)
  return backLinks.map((l) => ({
    eid: l.from,
    kind: l.kind,
    kindLabel: getKindLabel(l.kind),
    since: l.since,
    exists: entityExists(l.from),
  }))
}

/**
 * 엔티티 삭제 시 모든 연결 정리
 */
export function purgeLinksFor(entityEid) {
  const state = load()

  // 이 엔티티가 출발인 forward 링크 → 각 도착의 backward에서도 제거
  const forwards = state.forward[entityEid] || []
  forwards.forEach((l) => {
    if (state.backward[l.to]) {
      state.backward[l.to] = state.backward[l.to].filter(
        (b) => b.from !== entityEid
      )
      if (state.backward[l.to].length === 0) delete state.backward[l.to]
    }
  })
  delete state.forward[entityEid]

  // 이 엔티티가 도착인 backward 링크 → 각 출발의 forward에서도 제거
  const backwards = state.backward[entityEid] || []
  backwards.forEach((l) => {
    if (state.forward[l.from]) {
      state.forward[l.from] = state.forward[l.from].filter(
        (f) => f.to !== entityEid
      )
      if (state.forward[l.from].length === 0) delete state.forward[l.from]
    }
  })
  delete state.backward[entityEid]

  save(state)
}

/**
 * 일관성 검증 — 끊어진 링크(Dangling Reference) 탐지
 * forward/backward에 있지만 실제 엔티티가 존재하지 않는 항목 찾기
 */
export function validateLinkage() {
  const state = load()
  const dangling = []

  Object.entries(state.forward).forEach(([fromEid, links]) => {
    if (!entityExists(fromEid)) {
      dangling.push({ side: 'forward', eid: fromEid, reason: 'source missing' })
    }
    links.forEach((l) => {
      if (!entityExists(l.to)) {
        dangling.push({
          side: 'forward',
          eid: l.to,
          reason: 'target missing',
          fromEid,
        })
      }
    })
  })

  return {
    forwardCount: Object.keys(state.forward).length,
    backwardCount: Object.keys(state.backward).length,
    dangling,
  }
}

/**
 * 디버그·시각화용 — 전체 연결망 dump
 */
export function dumpAll() {
  return load()
}
