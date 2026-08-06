// 외국제조소(수입 의료기기) 관리 — 수입업자 GMP 심사 대응
// ISO 13485 §4.1.5(외주 관리) / KGMP 제6조 / 「수입의료기기 외국제조원 GMP 심사 세부운영 가이드라인」
//
// 국내 제조업자는 자기 제조소가 직접 GMP 심사를 받지만, 수입업자는 원칙적으로
// "외국제조원"이 심사 대상이며 수입업자는 그 제조소에 대한 GMP 심사를 신청·관리하는
// 주체 역할을 한다. 이 모듈은 그 외국제조소 단위 관리대장을 담당한다.
//
// - sites(외국제조소 등록) — 제조소 개요·시설개요·품목목록·위탁제조관계
// - gmpCertificates(GMP 적합인정서, 제조소당 N건) — 유효기간 3년, 정기갱신 대상
// - otherAuditReports(타 인증기관 실사결과 자료, 제조소당 N건) — 최근 3년 이내 실사 자료
//
// equipmentState.js / supplierState.js와 동일한 localStorage 기반 패턴을 따른다.

const STORE_KEY = 'qualytree.foreignManufacturers'

function defaultState() {
  return {
    sites: [],
    gmpCertificates: [],
    otherAuditReports: [],
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
    console.error('foreignManufacturerState save failed', e)
  }
  return next
}

const uid = () => Math.random().toString(36).slice(2, 10)

export const ENTRUSTED_RELATION = {
  NONE: '해당없음',
  CONSIGNOR: '제조의뢰자 (Owner)',
  CONSIGNEE: '제조자 (수탁 제조소)',
}

// 허가증/인증서 만료 상태 판정 — productDocsState.licenseStatusOf와 동일 규칙(90일 이내 만료임박)
export function certStatusOf(expiryDate) {
  if (!expiryDate) return null
  const today = new Date()
  const exp = new Date(expiryDate)
  const diffDays = Math.round((exp - today) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return '만료'
  if (diffDays <= 90) return '만료임박'
  return '유효'
}

export const foreignSites = {
  add(item) {
    const s = load()
    const rec = {
      id: uid(),
      name: '',
      address: '',
      employeeCount: '',
      productList: '',
      products: [], // 품목목록 구조화: [{ id, group(품목군), name(품목명), grade(품목등급) }]
      facilityFileId: null,
      facilityFileName: '',
      otherFiles: [], // 기타 서류 다중 첨부(레거시, #4 이후 신규 등록은 docSlotFiles 사용): [{ id, fileId, fileName }]
      docSlotFiles: {}, // #4 신청서 구비서류별 개별 슬롯: { [slotKey]: [{ id, fileId, fileName }] } — FOREIGN_DOC_SLOTS 참조
      entrustedRelation: ENTRUSTED_RELATION.NONE,
      relatedSiteName: '',
      notes: '',
      ...item,
    }
    s.sites = [...s.sites, rec]
    save(s)
    return rec
  },
  update(id, patch) {
    const s = load()
    s.sites = s.sites.map((x) => (x.id === id ? { ...x, ...patch } : x))
    save(s)
    return s
  },
  delete(id) {
    const s = load()
    s.sites = s.sites.filter((x) => x.id !== id)
    s.gmpCertificates = s.gmpCertificates.filter((c) => c.siteId !== id)
    s.otherAuditReports = s.otherAuditReports.filter((r) => r.siteId !== id)
    save(s)
    return s
  },
  getAll() {
    return load().sites
  },
  findById(id) {
    return load().sites.find((x) => x.id === id) || null
  },
}

export const gmpCertificates = {
  add(siteId, item) {
    const s = load()
    const rec = {
      id: uid(),
      siteId,
      certNo: '',
      issuedDate: '',
      expiryDate: '',
      fileId: null,
      fileName: '',
      notes: '',
      ...item,
    }
    s.gmpCertificates = [...s.gmpCertificates, rec]
    save(s)
    return rec
  },
  update(id, patch) {
    const s = load()
    s.gmpCertificates = s.gmpCertificates.map((c) => (c.id === id ? { ...c, ...patch } : c))
    save(s)
    return s
  },
  delete(id) {
    const s = load()
    s.gmpCertificates = s.gmpCertificates.filter((c) => c.id !== id)
    save(s)
    return s
  },
  getForSite(siteId) {
    return load().gmpCertificates.filter((c) => c.siteId === siteId).sort((a, b) => (b.expiryDate || '').localeCompare(a.expiryDate || ''))
  },
  getAll() {
    return load().gmpCertificates
  },
  /** 만료됨/만료임박(90일 이내) 인증서 — 대시보드·KGMP 요약용 */
  dueOrExpired() {
    return load().gmpCertificates.filter((c) => {
      const st = certStatusOf(c.expiryDate)
      return st === '만료' || st === '만료임박'
    })
  },
}

export const otherAuditReports = {
  add(siteId, item) {
    const s = load()
    const rec = {
      id: uid(),
      siteId,
      issuer: '',
      auditType: '',
      auditDate: '',
      resultFileId: null,
      resultFileName: '',
      notes: '',
      ...item,
    }
    s.otherAuditReports = [...s.otherAuditReports, rec]
    save(s)
    return rec
  },
  update(id, patch) {
    const s = load()
    s.otherAuditReports = s.otherAuditReports.map((r) => (r.id === id ? { ...r, ...patch } : r))
    save(s)
    return s
  },
  delete(id) {
    const s = load()
    s.otherAuditReports = s.otherAuditReports.filter((r) => r.id !== id)
    save(s)
    return s
  },
  getForSite(siteId) {
    return load().otherAuditReports.filter((r) => r.siteId === siteId).sort((a, b) => (b.auditDate || '').localeCompare(a.auditDate || ''))
  },
  getAll() {
    return load().otherAuditReports
  },
}
