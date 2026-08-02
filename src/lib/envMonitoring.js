// src/lib/envMonitoring.js
// 작업환경(§6.4)·청결오염(§7.5.2) 모니터링 데이터 공용 유틸.
// 실제 측정 기록 입력은 생산제조 > 청결·오염 관리(CleanlinessHub)에서 이루어지고,
// 품질검사 > 작업환경관리(WorkEnvHub)와 품질 KPI 대시보드는 이 데이터를 읽기 전용으로 조회한다.
// (기존에 WorkEnvHub가 별도로 쓰던 qualytree.env_logs 는 과거 이력 데이터로서 계속 병합 표시한다.)

export const LS_ZONES        = 'qualytree.env_zones'
export const LS_LEGACY_LOGS  = 'qualytree.env_logs'
export const LS_CLEAN_RECS   = 'qualytree.cleanliness_records'

function lsR(k) { try { return JSON.parse(localStorage.getItem(k) || '[]') } catch { return [] } }

// ISO 14644-1 §Annex: 청정도 등급별 파티클(≥0.5μm) 상한(개/m³) 참고값.
// 구역 등급 선택 시 자동으로 파티클 상한을 채워주기 위한 표 — 필요 시 수동 재입력 가능.
export const CLEAN_CLASS_PARTICLE_LIMIT = {
  ISO5: 3520,
  ISO6: 35200,
  ISO7: 352000,
  ISO8: 3520000,
  CDA: null,
  none: null,
}

// 압력 단위 변환 (Pa ↔ mmH2O). 표준중력 기준 1 mmH2O = 9.80665 Pa.
export const PA_PER_MMH2O = 9.80665
export function paToMmH2O(pa) { return pa === '' || pa === null || pa === undefined || isNaN(pa) ? '' : Math.round((Number(pa) / PA_PER_MMH2O) * 100) / 100 }
export function mmH2OToPa(mm) { return mm === '' || mm === null || mm === undefined || isNaN(mm) ? '' : Math.round(Number(mm) * PA_PER_MMH2O * 100) / 100 }

export function getZones() { return lsR(LS_ZONES) }

// 이탈 판정 — WorkEnvHub 구역 허용범위 기준으로 온도/습도/파티클/차압 이탈 여부를 계산한다.
export function calcDeviations(log, zone) {
  if (!zone) return []
  const devs = []
  const t = parseFloat(log.temp)
  if (log.temp !== '' && log.temp != null && !isNaN(t) && (t < zone.tempMin || t > zone.tempMax))
    devs.push({ param: '온도', value: `${t}°C`, limit: `${zone.tempMin}~${zone.tempMax}°C` })
  const h = parseFloat(log.humidity)
  if (log.humidity !== '' && log.humidity != null && !isNaN(h) && (h < zone.humMin || h > zone.humMax))
    devs.push({ param: '습도', value: `${h}%RH`, limit: `${zone.humMin}~${zone.humMax}%RH` })
  const p = parseFloat(log.particle)
  if (log.particle !== '' && log.particle != null && !isNaN(p) && zone.partMax && p > zone.partMax)
    devs.push({ param: '파티클', value: `${p.toLocaleString()}개/m³`, limit: `≤${Number(zone.partMax).toLocaleString()}개/m³` })
  const pr = parseFloat(log.pressure)
  if (log.pressure !== '' && log.pressure != null && !isNaN(pr) && (pr < zone.pressMin || pr > zone.pressMax))
    devs.push({ param: '차압', value: `${pr}Pa`, limit: `${zone.pressMin}~${zone.pressMax}Pa` })
  return devs
}

// 생산(청결·오염관리) 기록 + 과거 이력(env_logs)을 병합해 하나의 모니터링 기록 목록으로 반환.
export function getMergedEnvLogs() {
  const zones = getZones()
  const zoneById = Object.fromEntries(zones.map(z => [z.id, z]))

  const legacy = lsR(LS_LEGACY_LOGS).map(l => ({
    id: l.id,
    zoneId: l.zoneId || '',
    measuredAt: l.measuredAt || l.createdAt || '',
    measuredBy: l.measuredBy || '-',
    temp: l.temp, humidity: l.humidity, particle: l.particle, pressure: l.pressure,
    notes: l.notes || '',
    source: 'legacy',
  }))

  const fromClean = lsR(LS_CLEAN_RECS)
    .filter(r => r.temperature || r.humidity || r.pressureDiff || r.particleResult)
    .map(r => ({
      id: r.id,
      zoneId: r.zoneId || '',
      measuredAt: r.date || r.createdAt || '',
      measuredBy: '생산(청결·오염 관리)',
      temp: r.temperature, humidity: r.humidity,
      particle: r.particleResult, pressure: r.pressureDiff,
      notes: r.notes || '',
      source: 'cleanliness',
    }))

  const merged = [...fromClean, ...legacy].map(l => ({
    ...l,
    deviations: calcDeviations(l, zoneById[l.zoneId]),
  }))

  return merged.sort((a, b) => (b.measuredAt || '').localeCompare(a.measuredAt || ''))
}
