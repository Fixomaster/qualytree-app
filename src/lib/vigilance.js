/**
 * Vigilance / Post-Market Surveillance (RA-003)
 *
 * 적용 표준:
 * - Project Instructions §17 시판후 감시·Vigilance·PSUR
 * - ISO 13485:2016 §8.2.1 (피드백), §8.2.3 (보고·당국 통보)
 * - ISO/TR 20416:2020 (Post-market surveillance for manufacturers)
 * - 21 CFR 803 (FDA Medical Device Reporting)
 * - 21 CFR 806 (Reports of Corrections and Removals)
 * - MDR (EU) 2017/745 Article 83~92, MDCG 2020-7
 * - 의료기기법 §31의5 (시판후 추적관리)
 *
 * 데이터 구조:
 *   localStorage('qualytree.vigilanceCases') = [
 *     {
 *       id: "VIG-2026-0001",
 *       productId: "MRUHP-8H",
 *       productName: "ULNA Hook Plate",
 *       sourceType: "complaint" | "literature" | "competitor" | "field" | "internal",
 *       harmType: "death" | "serious_injury" | "device_malfunction" | "no_harm",
 *       receivedAt,
 *       location: "Korea" | "USA" | "Europe" | ...,
 *       reporterContact: "...",
 *       description: "...",
 *       deviceUdiDi: "...",  // 영향 받은 UDI-DI
 *
 *       reportability: {
 *         assessed: boolean,
 *         decisions: {
 *           FDA_MDR:   "reportable" | "not-reportable" | "pending",
 *           MDR_Vigilance: "reportable" | "not-reportable" | "pending",
 *           MFDS:      "reportable" | "not-reportable" | "pending",
 *         },
 *         deadlines: {
 *           FDA_MDR: ISO date,
 *           MDR_Vigilance: ISO date,
 *           MFDS: ISO date,
 *         }
 *       },
 *
 *       reports: [
 *         { id, jurisdiction, formType, status, submittedAt, deadline }
 *       ],
 *
 *       linkedNcrId: "NCR-...",  // 자동 연결된 NCR
 *       investigationStatus: "open" | "investigating" | "rca_done" | "closed",
 *       capaIds: [...],
 *       status: "open" | "investigating" | "reported" | "closed",
 *       createdBy, createdAt
 *     }
 *   ]
 */

import { commitChange, CHANGE_ACTIONS } from './changeControl'
import { ENTITY_TYPES, eid } from './entityRegistry'
import { addLink } from './linkage'
import { auth } from './auth'

const KEY = 'qualytree.vigilanceCases'
const COUNTER_KEY = 'qualytree.vigilanceCounter'

export const SOURCE_TYPES = {
  complaint: { ko: '고객 클레임', en: 'Customer Complaint' },
  literature: { ko: '문헌 모니터링', en: 'Literature' },
  competitor: { ko: '경쟁사 사고 정보', en: 'Competitor Incident' },
  field: { ko: '현장 보고', en: 'Field Report' },
  internal: { ko: '내부 발견', en: 'Internal Finding' },
}

export const HARM_TYPES = {
  death: { ko: '사망', en: 'Death', severity: 4, color: 'rust' },
  serious_injury: { ko: '중대상해', en: 'Serious Injury', severity: 3, color: 'rust' },
  device_malfunction: { ko: '기기 결함 (잠재 위해)', en: 'Device Malfunction', severity: 2, color: 'amber' },
  no_harm: { ko: '위해 없음', en: 'No Harm', severity: 1, color: 'leaf' },
}

/* Reportability 마감 시한 (시간 단위) — 적용 표준에서 직접 도출 */
export const REPORT_DEADLINES = {
  FDA_MDR: {
    death: 30 * 24,           // 30일 (21 CFR 803.50)
    serious_injury: 30 * 24,  // 30일
    device_malfunction: 30 * 24,  // 30일 (재발 시 5일 — 별도 처리)
    no_harm: null,
  },
  MDR_Vigilance: {
    death: 2 * 24,            // 2일 — Serious Public Health Threat 시 즉시
    serious_injury: 10 * 24,  // 10일
    device_malfunction: 15 * 24,  // 15일
    no_harm: null,
  },
  MFDS: {
    death: 7 * 24,            // 7일
    serious_injury: 30 * 24,  // 30일
    device_malfunction: 30 * 24,
    no_harm: null,
  },
}

export const REPORT_FORMS = {
  FDA_MDR: { ko: 'FDA Form 3500A (MDR)', en: 'FDA Form 3500A' },
  MDR_Vigilance: { ko: 'EU MIR (Manufacturer Incident Report)', en: 'MIR' },
  MFDS: { ko: '의료기기 부작용 보고', en: 'MFDS Adverse Event Report' },
}

export const VIG_STATUS = {
  open: { ko: '접수', tone: 'sky' },
  investigating: { ko: '조사 중', tone: 'amber' },
  reported: { ko: '보고됨', tone: 'leaf' },
  closed: { ko: '종결', tone: 'ink-mute' },
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

function nextVigId() {
  const counter = parseInt(localStorage.getItem(COUNTER_KEY) || '0', 10) + 1
  localStorage.setItem(COUNTER_KEY, String(counter))
  const year = new Date().getFullYear()
  return `VIG-${year}-${String(counter).padStart(4, '0')}`
}

/**
 * Reportability 자동 1차 판정 (AI 보조 시뮬레이션)
 * — 실제 시스템에서는 PRRC가 최종 승인
 */
function autoAssessReportability(harmType, sourceType, locations) {
  const decisions = {}
  const deadlines = {}
  const now = Date.now()

  ;['FDA_MDR', 'MDR_Vigilance', 'MFDS'].forEach((jurisdiction) => {
    const deadlineHours = REPORT_DEADLINES[jurisdiction]?.[harmType]

    // 적용 가능 여부 판단 (간단 규칙)
    let applicable = false
    if (jurisdiction === 'FDA_MDR' && locations?.includes('USA')) applicable = true
    if (jurisdiction === 'MDR_Vigilance' && locations?.includes('Europe')) applicable = true
    if (jurisdiction === 'MFDS' && locations?.includes('Korea')) applicable = true
    if (!applicable && (harmType === 'death' || harmType === 'serious_injury')) {
      // 중대 위해는 모든 시장 적용 (예방적)
      applicable = true
    }

    if (!applicable) {
      decisions[jurisdiction] = 'not-applicable'
      deadlines[jurisdiction] = null
    } else if (deadlineHours == null) {
      // 위해 없음 — 보고 대상 아님
      decisions[jurisdiction] = 'not-reportable'
      deadlines[jurisdiction] = null
    } else {
      decisions[jurisdiction] = 'pending'  // 인간 최종 승인 필요
      deadlines[jurisdiction] = new Date(now + deadlineHours * 60 * 60 * 1000).toISOString()
    }
  })

  return { decisions, deadlines, assessed: true }
}

/* ================================================================
   API
   ================================================================ */
export const vigilance = {
  loadAll,

  findById(id) {
    return loadAll().find((v) => v.id === id) || null
  },

  /**
   * 클레임/사고 접수 (RA-003 — 자동 1차 Reportability 판정)
   */
  raise(input) {
    const {
      productId,
      productName,
      sourceType = 'complaint',
      harmType = 'no_harm',
      location,
      locations = [location].filter(Boolean),
      reporterContact = '',
      description = '',
      deviceUdiDi = null,
    } = input

    if (!productId || !harmType) {
      throw new Error('vigilance.raise: productId + harmType 필수')
    }

    const cur = auth.current()
    const id = nextVigId()
    const reportability = autoAssessReportability(harmType, sourceType, locations)

    const record = {
      id,
      productId,
      productName: productName || productId,
      sourceType,
      harmType,
      receivedAt: new Date().toISOString(),
      location: location || (locations[0] || ''),
      locations,
      reporterContact,
      description,
      deviceUdiDi,
      reportability,
      reports: [],
      investigationStatus: 'open',
      capaIds: [],
      status: 'open',
      createdBy: cur?.name,
      createdAt: new Date().toISOString(),
    }

    const all = loadAll()
    all.push(record)
    saveAll(all)

    // CCR + 양방향 연결
    const vigEid = eid('vigilanceCase', id)
    commitChange({
      targetEid: vigEid,
      action: CHANGE_ACTIONS.CREATE,
      after: record,
      reason: `${SOURCE_TYPES[sourceType]?.ko} 접수 — ${HARM_TYPES[harmType]?.ko} (${productName})`,
    })
    addLink(vigEid, eid(ENTITY_TYPES.PRODUCT, productId), 'forProduct')

    return record
  },

  /**
   * Reportability 인간 최종 승인 (PRRC가 판정)
   * decision: { FDA_MDR: 'reportable'|'not-reportable', ... }
   */
  approveReportability(vigId, decisions, approverName) {
    const all = loadAll()
    const idx = all.findIndex((v) => v.id === vigId)
    if (idx === -1) return null
    const before = { ...all[idx] }
    all[idx] = {
      ...all[idx],
      reportability: {
        ...all[idx].reportability,
        decisions: { ...all[idx].reportability.decisions, ...decisions },
        approvedBy: approverName || auth.current()?.name,
        approvedAt: new Date().toISOString(),
      },
      investigationStatus: 'investigating',
      status: 'investigating',
    }
    saveAll(all)
    commitChange({
      targetEid: eid('vigilanceCase', vigId),
      action: CHANGE_ACTIONS.UPDATE,
      before,
      after: all[idx],
      reason: `Reportability 최종 판정 — ${Object.entries(decisions)
        .map(([k, v]) => `${k}:${v}`)
        .join(', ')}`,
    })
    return all[idx]
  },

  /**
   * 정식 보고서 제출 표시
   */
  markReported(vigId, jurisdiction, formType, externalRefNumber) {
    const all = loadAll()
    const idx = all.findIndex((v) => v.id === vigId)
    if (idx === -1) return null
    const before = { ...all[idx] }
    const now = new Date().toISOString()
    const reportEntry = {
      id: `RPT-${vigId}-${jurisdiction}`,
      jurisdiction,
      formType,
      status: 'submitted',
      submittedAt: now,
      externalRefNumber,
      deadline: all[idx].reportability.deadlines[jurisdiction],
    }
    const newReports = [...(all[idx].reports || []), reportEntry]
    const allReportable = Object.entries(all[idx].reportability.decisions)
      .filter(([_, d]) => d === 'reportable')
      .every(([j, _]) => newReports.some((r) => r.jurisdiction === j))

    all[idx] = {
      ...all[idx],
      reports: newReports,
      status: allReportable ? 'reported' : all[idx].status,
    }
    saveAll(all)
    commitChange({
      targetEid: eid('vigilanceCase', vigId),
      action: CHANGE_ACTIONS.UPDATE,
      before,
      after: all[idx],
      reason: `${jurisdiction} 정식 보고서 제출 (${formType})${
        externalRefNumber ? ` — 참조 ${externalRefNumber}` : ''
      }`,
    })
    return all[idx]
  },

  /**
   * 종결 (조사·CAPA 완료 후)
   */
  close(vigId, summary) {
    const all = loadAll()
    const idx = all.findIndex((v) => v.id === vigId)
    if (idx === -1) return null
    const before = { ...all[idx] }
    all[idx] = {
      ...all[idx],
      status: 'closed',
      investigationStatus: 'closed',
      closedAt: new Date().toISOString(),
      closingSummary: summary || '',
    }
    saveAll(all)
    commitChange({
      targetEid: eid('vigilanceCase', vigId),
      action: CHANGE_ACTIONS.UPDATE,
      before,
      after: all[idx],
      reason: `Vigilance 케이스 종결 — ${summary || '조사·CAPA 완료'}`,
    })
    return all[idx]
  },

  /**
   * 마감 임박 보고서
   */
  upcomingReportDeadlines(daysAhead = 7) {
    const all = loadAll()
    const now = Date.now()
    const cutoff = now + daysAhead * 24 * 60 * 60 * 1000
    const out = []
    all.forEach((v) => {
      if (v.status === 'closed' || v.status === 'reported') return
      Object.entries(v.reportability?.decisions || {}).forEach(
        ([jurisdiction, decision]) => {
          if (decision !== 'reportable' && decision !== 'pending') return
          // 이미 보고된 경우 제외
          if (v.reports?.some((r) => r.jurisdiction === jurisdiction)) return
          const deadlineStr = v.reportability.deadlines?.[jurisdiction]
          if (!deadlineStr) return
          const deadline = new Date(deadlineStr).getTime()
          if (deadline <= cutoff) {
            const hoursLeft = Math.ceil((deadline - now) / (60 * 60 * 1000))
            out.push({
              vig: v,
              jurisdiction,
              decision,
              deadline: deadlineStr,
              hoursLeft,
              isOverdue: hoursLeft < 0,
            })
          }
        }
      )
    })
    return out.sort((a, b) => a.hoursLeft - b.hoursLeft)
  },
}
