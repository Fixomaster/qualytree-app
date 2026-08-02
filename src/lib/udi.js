/**
 * UDI Lifecycle — Unique Device Identification (RA-002)
 *
 * 적용 표준:
 * - Project Instructions §16 UDI 라이프사이클 관리
 * - 21 CFR 830 (FDA UDI Rule)
 * - MDR (EU) 2017/745 Article 27~29, Annex VI
 * - MFDS 의료기기 표시·기재사항 고시
 * - IMDRF UDI System Application Guide
 * - ISO/IEC 15459 (Unique Identification)
 * - GS1 General Specifications, HIBCC LIC/PIC
 *
 * 데이터 구조:
 *   localStorage('qualytree.udiRecords') = [
 *     {
 *       id: "UDI-2026-0001",
 *       udiDi: "0089012345678901234",      // 발급된 UDI-DI (모델 단위 정적)
 *       issuingAgency: "GS1" | "HIBCC" | "ICCBBA",
 *       productId: "MRUHP-8H",
 *       productName: "ULNA Hook Plate",
 *       udiPi: {                           // 동적 PI 구성 (활성 옵션)
 *         lot: true,
 *         serial: false,
 *         manufactureDate: true,
 *         expiryDate: true,
 *         softwareVersion: false
 *       },
 *       labelFormat: "GS1-128" | "QR" | "Data Matrix",
 *       externalDbStatus: {
 *         GUDID: "synced" | "pending" | "error" | "not-applicable",
 *         EUDAMED: "synced" | "pending" | "error" | "not-applicable",
 *         MFDS:   "synced" | "pending" | "error" | "not-applicable",
 *       },
 *       lastSyncedAt: { GUDID, EUDAMED, MFDS },
 *       status: "active" | "discontinued" | "draft",
 *       createdBy, createdAt, lastUpdated
 *     }
 *   ]
 */

import { commitChange, CHANGE_ACTIONS } from './changeControl'
import { ENTITY_TYPES, eid } from './entityRegistry'
import { addLink } from './linkage'
import { auth } from './auth'

const KEY = 'qualytree.udiRecords'
const COUNTER_KEY = 'qualytree.udiCounter'

export const ISSUING_AGENCIES = {
  GS1: { ko: 'GS1', desc: 'Global Standards 1', diLength: 14, prefix: '00' },
  HIBCC: { ko: 'HIBCC', desc: 'Health Industry Business Communications Council', diLength: 14 },
  ICCBBA: { ko: 'ICCBBA', desc: '인체조직·혈액 등', diLength: 16 },
}

export const LABEL_FORMATS = {
  'GS1-128': { ko: 'GS1-128 바코드', desc: '1D 바코드' },
  QR: { ko: 'QR 코드', desc: '2D 코드 — 모바일 스캔 친화' },
  'Data Matrix': { ko: 'Data Matrix', desc: '2D 코드 — 작은 면적' },
}

export const EXTERNAL_DBS = {
  GUDID: { ko: 'GUDID (FDA)', country: '🇺🇸', regulator: 'FDA' },
  EUDAMED: { ko: 'EUDAMED (EU)', country: '🇪🇺', regulator: 'EU MDR' },
  MFDS: { ko: 'MFDS UDI System', country: '🇰🇷', regulator: 'MFDS' },
}

export const DB_SYNC_STATUS = {
  synced: { ko: '동기화됨', tone: 'leaf' },
  pending: { ko: '동기화 중', tone: 'amber' },
  error: { ko: '오류', tone: 'rust' },
  'not-applicable': { ko: '해당 없음', tone: 'ink-mute' },
}

/* ================================================================
   Storage
   ================================================================ */
function loadAll() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveAll(arr) {
  localStorage.setItem(KEY, JSON.stringify(arr))
}

function nextUdiId() {
  const counter = parseInt(localStorage.getItem(COUNTER_KEY) || '0', 10) + 1
  localStorage.setItem(COUNTER_KEY, String(counter))
  const year = new Date().getFullYear()
  return `UDI-${year}-${String(counter).padStart(4, '0')}`
}

/**
 * UDI-DI 자동 생성 — 시뮬레이션 (실제로는 발급 기관 API 사용)
 * GS1 GTIN-14 기준 가짜 식별자 생성
 */
function generateMockUdiDi(agency, productId) {
  if (agency === 'GS1') {
    // GTIN-14: 패키지 지시자(1) + 회사 prefix(7) + 제품번호(5) + 체크섬(1)
    const productHash = productId
      .split('')
      .reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) >>> 0, 0)
    const productNum = String(productHash % 100000).padStart(5, '0')
      const di = `0` + `8901234` + productNum  // 0 + GS1 회사 prefix + 제품번호 = 13자리
    // 체크섬 계산 (GS1 mod 10)
    let sum = 0
    for (let i = 0; i < 13; i++) {
      sum += parseInt(di[i], 10) * (i % 2 === 0 ? 3 : 1)
    }
    const check = (10 - (sum % 10)) % 10
    return di + String(check)
  }
  if (agency === 'HIBCC') {
    return `+H${productId.slice(0, 4).padEnd(4, '0').toUpperCase()}${Date.now().toString().slice(-7)}`
  }
  return `${agency}-${productId}-${Date.now().toString().slice(-8)}`
}

/* ================================================================
   API
   ================================================================ */
export const udi = {
  loadAll,

  findById(id) {
    return loadAll().find((u) => u.id === id) || null
  },

  findByProductId(productId) {
    return loadAll().filter((u) => u.productId === productId)
  },

  /**
   * UDI-DI 신규 발급
   */
  issue(input) {
    const {
      productId,
      productName,
      modelName = '',            // #320: 허가증 내 모델목록에서 선택한 모델명
      certificateNumber = '',    // #320: 연동된 허가증(신청·통지 승인) 번호
      issuingAgency = 'GS1',
      udiPi = {
        lot: true,
        serial: false,
        manufactureDate: true,
        expiryDate: true,
        softwareVersion: false,
      },
      labelFormat = 'GS1-128',
      applicableMarkets = ['MFDS'],  // 한국 우선
    } = input

    if (!productId) throw new Error('udi.issue: productId 필수')

    const id = nextUdiId()
    const udiDi = generateMockUdiDi(issuingAgency, productId)
    const cur = auth.current()

    const externalDbStatus = {
      GUDID: applicableMarkets.includes('FDA') ? 'pending' : 'not-applicable',
      EUDAMED: applicableMarkets.includes('MDR') ? 'pending' : 'not-applicable',
      MFDS: applicableMarkets.includes('MFDS') ? 'pending' : 'not-applicable',
    }

    const record = {
      id,
      udiDi,
      issuingAgency,
      productId,
      productName: productName || productId,
      modelName,
      certificateNumber,
      udiPi,
      labelFormat,
      externalDbStatus,
      lastSyncedAt: { GUDID: null, EUDAMED: null, MFDS: null },
      status: 'active',
      piBatches: [],
      createdBy: cur?.name,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    }
    const all = loadAll()
    all.push(record)
    saveAll(all)

    // CCR + 양방향 연결
    const udiEid = eid('udiRecord', id)
    commitChange({
      targetEid: udiEid,
      action: CHANGE_ACTIONS.CREATE,
      after: record,
      reason: `${ISSUING_AGENCIES[issuingAgency]?.ko} ${udiDi} UDI-DI 신규 발급 — ${productName}`,
    })
    addLink(udiEid, eid(ENTITY_TYPES.PRODUCT, productId), 'forProduct')

    return record
  },

  /**
   * 외부 DB 동기화 시뮬레이션 (실제로는 GUDID/EUDAMED/MFDS API 호출)
   */
  syncToExternal(udiId, dbName) {
    const all = loadAll()
    const idx = all.findIndex((u) => u.id === udiId)
    if (idx === -1) return null
    const before = { ...all[idx] }

    // 90% 성공 시뮬레이션
    const success = Math.random() > 0.1
    all[idx] = {
      ...all[idx],
      externalDbStatus: {
        ...all[idx].externalDbStatus,
        [dbName]: success ? 'synced' : 'error',
      },
      lastSyncedAt: {
        ...all[idx].lastSyncedAt,
        [dbName]: new Date().toISOString(),
      },
      lastUpdated: new Date().toISOString(),
    }
    saveAll(all)
    commitChange({
      targetEid: eid('udiRecord', udiId),
      action: CHANGE_ACTIONS.UPDATE,
      before,
      after: all[idx],
      reason: `${EXTERNAL_DBS[dbName]?.ko} 동기화 ${success ? '성공' : '실패'}`,
    })
    return { record: all[idx], success }
  },

  /**
   * 단종 처리
   */
  discontinue(udiId, reason) {
    const all = loadAll()
    const idx = all.findIndex((u) => u.id === udiId)
    if (idx === -1) return null
    const before = { ...all[idx] }
    all[idx] = {
      ...all[idx],
      status: 'discontinued',
      discontinuedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    }
    saveAll(all)
    commitChange({
      targetEid: eid('udiRecord', udiId),
      action: CHANGE_ACTIONS.UPDATE,
      before,
      after: all[idx],
      reason: `UDI-DI 단종 처리 — ${reason || '시판 중단'}`,
    })
    return all[idx]
  },

  /**
   * #320: UDI-DI 발급 완료(status: 'active') 후에만 PI(로트·제조일자·유효기한 등) 배치를
   * 대량 입력할 수 있도록 함. 엑셀에서 복사한 탭/쉼표 구분 텍스트를 그대로 붙여넣어 파싱한다.
   * rows: [{ lot, manufactureDate, expiryDate, serial, qty }]
   */
  addPiBatch(udiId, rows) {
    const all = loadAll()
    const idx = all.findIndex((u) => u.id === udiId)
    if (idx === -1) throw new Error('udi.addPiBatch: UDI-DI를 찾을 수 없습니다')
    if (all[idx].status !== 'active') throw new Error('UDI-DI 발급이 완료(활성)된 이후에만 PI 배치를 입력할 수 있습니다')
    const before = { ...all[idx] }
    const batch = (all[idx].piBatches || [])
    const stamped = rows.map((r, i) => ({
      id: `${udiId}-PI-${batch.length + i + 1}`,
      lot: r.lot || '',
      manufactureDate: r.manufactureDate || '',
      expiryDate: r.expiryDate || '',
      serial: r.serial || '',
      qty: r.qty || '',
      addedAt: new Date().toISOString(),
    }))
    all[idx] = { ...all[idx], piBatches: [...batch, ...stamped], lastUpdated: new Date().toISOString() }
    saveAll(all)
    commitChange({
      targetEid: eid('udiRecord', udiId),
      action: CHANGE_ACTIONS.UPDATE,
      before,
      after: all[idx],
      reason: `PI 배치 ${stamped.length}건 일괄 입력 (엑셀 붙여넣기)`,
    })
    return all[idx]
  },

  getPiBatch(udiId) {
    return this.findById(udiId)?.piBatches || []
  },

  /**
   * 라벨 미리보기 텍스트 (시각용)
   */
  getLabelPreview(udiId) {
    const u = this.findById(udiId)
    if (!u) return null
    const piParts = []
    if (u.udiPi.lot) piParts.push(`(10)L${Date.now().toString().slice(-6)}`)
    if (u.udiPi.serial) piParts.push(`(21)SN${Math.floor(Math.random() * 100000)}`)
    if (u.udiPi.manufactureDate) {
      const d = new Date()
      piParts.push(`(11)${d.getFullYear().toString().slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`)
    }
    if (u.udiPi.expiryDate) {
      const exp = new Date()
      exp.setFullYear(exp.getFullYear() + 3)
      piParts.push(`(17)${exp.getFullYear().toString().slice(2)}${String(exp.getMonth() + 1).padStart(2, '0')}${String(exp.getDate()).padStart(2, '0')}`)
    }
    return {
      hri: `(01)${u.udiDi} ${piParts.join(' ')}`,
      di: u.udiDi,
      pi: piParts,
      format: u.labelFormat,
    }
  },
}
