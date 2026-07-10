// 설비 · 시험장비 · 교정 관리 — ISO 13485 §6.3(기반시설) / §7.6(모니터링·측정장비) / §8.2.6
//
// - 설비대장(equipment) — 예방보전계획(maintenancePlans)·점검기록(inspectionRecords)을 설비별로 연결
// - 시험장비대장(testEquipment) — 측정·시험 장비 마스터
// - 교정계획(calibrationPlans)·교정성적서(calibrationCertificates) — 설비/시험장비 어느 쪽에도 연결 가능
//
// onboardingState.js와 동일한 localStorage 기반 패턴(로드/세이브/시드 없음)을 따른다.

const STORE_KEY = 'qualytree.equipment'

function defaultState() {
  return {
    equipment: [],
    maintenancePlans: [],
    inspectionRecords: [],
    testEquipment: [],
    calibrationPlans: [],
    calibrationCertificates: [],
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return defaultState()
    const def = defaultState()
    const saved = JSON.parse(raw)
    return { ...def, ...saved }
  } catch {
    return defaultState()
  }
}

function save(next) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(next))
  } catch (e) {
    console.error('equipmentState save failed', e)
  }
  return next
}

const uid = () => Math.random().toString(36).slice(2, 10)

export const equipmentStatus = {
  IN_USE: '사용중',
  STANDBY: '대기',
  REPAIR: '수리중',
  RETIRED: '폐기',
}

export const calibrationResult = {
  PASS: '합격',
  CONDITIONAL: '조건부합격',
  FAIL: '불합격',
}

export const equipment = {
  load,
  save,
  defaultState,
  uid,

  // ── 설비대장 ──
  addEquipment(item) {
    const s = load()
    const rec = { id: uid(), name: '', assetNo: '', category: '', manufacturer: '', model: '', serialNo: '', location: '', department: '', owner: '', acquiredDate: '', status: equipmentStatus.IN_USE, notes: '', ...item }
    s.equipment = [...s.equipment, rec]
    save(s)
    return rec
  },
  updateEquipment(id, patch) {
    const s = load()
    s.equipment = s.equipment.map((e) => (e.id === id ? { ...e, ...patch } : e))
    save(s)
    return s
  },
  deleteEquipment(id) {
    const s = load()
    s.equipment = s.equipment.filter((e) => e.id !== id)
    s.maintenancePlans = s.maintenancePlans.filter((p) => p.equipmentId !== id)
    s.inspectionRecords = s.inspectionRecords.filter((r) => r.equipmentId !== id)
    s.calibrationPlans = s.calibrationPlans.filter((c) => !(c.targetType === 'equipment' && c.targetId === id))
    s.calibrationCertificates = s.calibrationCertificates.filter((c) => !(c.targetType === 'equipment' && c.targetId === id))
    save(s)
    return s
  },

  // ── 예방보전계획 (설비당 1건, upsert) ──
  setMaintenancePlan(equipmentId, plan) {
    const s = load()
    const existing = s.maintenancePlans.find((p) => p.equipmentId === equipmentId)
    if (existing) {
      s.maintenancePlans = s.maintenancePlans.map((p) => (p.equipmentId === equipmentId ? { ...p, ...plan } : p))
    } else {
      s.maintenancePlans = [...s.maintenancePlans, { id: uid(), equipmentId, cycleMonths: '', lastDate: '', nextDate: '', method: '', notes: '', ...plan }]
    }
    save(s)
    return s
  },
  getMaintenancePlan(equipmentId) {
    const s = load()
    return s.maintenancePlans.find((p) => p.equipmentId === equipmentId) || null
  },

  // ── 점검기록 (설비당 N건) ──
  addInspectionRecord(equipmentId, rec) {
    const s = load()
    const row = { id: uid(), equipmentId, date: '', inspector: '', result: '양호', notes: '', files: [], ...rec }
    s.inspectionRecords = [...s.inspectionRecords, row]
    save(s)
    return row
  },
  deleteInspectionRecord(id) {
    const s = load()
    s.inspectionRecords = s.inspectionRecords.filter((r) => r.id !== id)
    save(s)
    return s
  },
  getInspectionRecords(equipmentId) {
    const s = load()
    return s.inspectionRecords.filter((r) => r.equipmentId === equipmentId).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  },

  // ── 시험장비대장 ──
  addTestEquipment(item) {
    const s = load()
    const rec = { id: uid(), name: '', assetNo: '', manufacturer: '', model: '', serialNo: '', range: '', accuracy: '', location: '', department: '', owner: '', acquiredDate: '', status: equipmentStatus.IN_USE, notes: '', ...item }
    s.testEquipment = [...s.testEquipment, rec]
    save(s)
    return rec
  },
  updateTestEquipment(id, patch) {
    const s = load()
    s.testEquipment = s.testEquipment.map((e) => (e.id === id ? { ...e, ...patch } : e))
    save(s)
    return s
  },
  deleteTestEquipment(id) {
    const s = load()
    s.testEquipment = s.testEquipment.filter((e) => e.id !== id)
    s.calibrationPlans = s.calibrationPlans.filter((c) => !(c.targetType === 'testEquipment' && c.targetId === id))
    s.calibrationCertificates = s.calibrationCertificates.filter((c) => !(c.targetType === 'testEquipment' && c.targetId === id))
    save(s)
    return s
  },

  // ── 교정계획 (대상당 1건, upsert) ──
  setCalibrationPlan(targetType, targetId, plan) {
    const s = load()
    const existing = s.calibrationPlans.find((p) => p.targetType === targetType && p.targetId === targetId)
    if (existing) {
      s.calibrationPlans = s.calibrationPlans.map((p) => (p.targetType === targetType && p.targetId === targetId ? { ...p, ...plan } : p))
    } else {
      s.calibrationPlans = [...s.calibrationPlans, { id: uid(), targetType, targetId, cycleMonths: '', lastDate: '', nextDate: '', vendor: '', notes: '', ...plan }]
    }
    save(s)
    return s
  },
  getCalibrationPlan(targetType, targetId) {
    const s = load()
    return s.calibrationPlans.find((p) => p.targetType === targetType && p.targetId === targetId) || null
  },

  // ── 교정성적서 (대상당 N건) ──
  addCalibrationCertificate(targetType, targetId, cert) {
    const s = load()
    const row = { id: uid(), targetType, targetId, calDate: '', vendor: '', certNo: '', result: calibrationResult.PASS, validUntil: '', notes: '', files: [], ...cert }
    s.calibrationCertificates = [...s.calibrationCertificates, row]
    save(s)
    return row
  },
  updateCalibrationCertificate(id, patch) {
    const s = load()
    s.calibrationCertificates = s.calibrationCertificates.map((c) => (c.id === id ? { ...c, ...patch } : c))
    save(s)
    return s
  },
  deleteCalibrationCertificate(id) {
    const s = load()
    s.calibrationCertificates = s.calibrationCertificates.filter((c) => c.id !== id)
    save(s)
    return s
  },
  getCalibrationCertificates(targetType, targetId) {
    const s = load()
    return s.calibrationCertificates
      .filter((c) => c.targetType === targetType && c.targetId === targetId)
      .sort((a, b) => (b.calDate || '').localeCompare(a.calDate || ''))
  },

  // ── 통합 대상 목록 (설비 + 시험장비, 교정 탭 선택용) ──
  allCalibrationTargets() {
    const s = load()
    return [
      ...s.equipment.map((e) => ({ targetType: 'equipment', targetId: e.id, name: e.name, assetNo: e.assetNo })),
      ...s.testEquipment.map((e) => ({ targetType: 'testEquipment', targetId: e.id, name: e.name, assetNo: e.assetNo })),
    ]
  },
}

export default equipment
