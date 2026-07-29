// src/lib/traceability.js
// 제품추적성관리(LOT 추적) — 원자재 LOT → 작업지시(WO) → 완제품 LOT → 납품/배포 → 고객
// 까지의 전체 계보를, 여러 모듈(구매자재·생산·영업)의 localStorage 데이터를 조인하여 구성한다.
// 각 모듈은 서로 다른 페이지에서 각자의 키를 쓰므로, 여기서 직접 읽어 연결한다.

function readLS(key, fallback = []) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v } catch { return fallback }
}

export function loadMaterials() { return readLS('qms_pur_inventory') }
export function loadWos() { return readLS('qms_mfg_wo') }
export function loadFin() { return readLS('qms_pur_fin') }
export function loadOrders() { return readLS('qms_sal_orders') }
export function loadDeliveries() { return readLS('qms_sal_deliveries') }
export function loadDistributions() { return readLS('qualytree.distributions') }

const norm = (s) => String(s || '').trim().toLowerCase()
const splitLots = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean)
const firstQty = (s) => (String(s || '').match(/\d+/) || [])[0] || ''

/** 원자재 LOT 색인: 모든 자재의 입고이력(receipts)을 LOT 단위로 펼침 */
export function materialLotIndex(materials) {
  const list = materials || loadMaterials()
  const out = []
  list.forEach((m) => {
    const receipts = Array.isArray(m.receipts) && m.receipts.length
      ? m.receipts
      : (m.lot ? [{ id: `${m.id}-cur`, lot: m.lot, qty: m.stock, date: '', certNo: '', poId: '', poVendor: '' }] : [])
    receipts.forEach((r) => {
      if (!r.lot) return
      out.push({ materialId: m.id, materialName: m.name, lot: r.lot, qty: r.qty, date: r.date, certNo: r.certNo, poId: r.poId, poVendor: r.poVendor })
    })
  })
  return out
}

function findMaterialByLot(matIndex, lot) {
  return matIndex.find((m) => norm(m.lot) === norm(lot)) || null
}

function findFinByLot(finList, lot) {
  if (!lot) return null
  for (const f of finList) {
    if (norm(f.lot) === norm(lot)) return f
    if ((f.lots || []).some((l) => norm(l.lot) === norm(lot))) return f
  }
  return null
}

/**
 * 모든 연결 가능한 체인을 하나의 평평한(조인된) 목록으로 구성한다.
 * 각 행(row)은 원자재 LOT ~ 고객까지의 한 경로를 나타내며,
 * 데이터가 일부만 존재해도(예: 아직 납품 전) 가능한 구간까지 채워서 반환한다.
 * 어느 모듈에서 시작하든(원자재/WO/완제품LOT/SO/납품/고객) 검색·피벗이 가능하도록
 * 연결되지 않은 항목도 독립된 행으로 포함시킨다.
 */
export function buildChainRows() {
  const materials = loadMaterials()
  const wos = loadWos()
  const fin = loadFin()
  const orders = loadOrders()
  const deliveries = loadDeliveries()
  const dists = loadDistributions()
  const matIndex = materialLotIndex(materials)

  const rows = []
  const usedMaterialLots = new Set()
  const usedDeliveryIds = new Set()
  const usedDistIds = new Set()

  wos.forEach((w) => {
    const matLots = splitLots(w.materialLots)
    const order = orders.find((o) => o.wo === w.id) || null
    const dels = deliveries.filter((d) =>
      (w.lot && norm(d.lot) === norm(w.lot)) ||
      (w.so && norm(d.so) === norm(w.so)) ||
      (order && norm(d.so) === norm(order.id))
    )
    const distRecs = dists.filter((d) =>
      (w.lot && norm(d.lotNo) === norm(w.lot)) ||
      (d.woId && norm(d.woId) === norm(w.id))
    )
    dels.forEach((d) => usedDeliveryIds.add(d.id))
    distRecs.forEach((d) => usedDistIds.add(d.id))

    const materialRows = matLots.length
      ? matLots.map((lot) => {
          const mat = findMaterialByLot(matIndex, lot)
          usedMaterialLots.add(norm(lot))
          return mat || { materialId: '', materialName: '(미등록 LOT)', lot, qty: '', date: '', poVendor: '' }
        })
      : [null]

    const custRows = [
      ...dels.map((d) => ({ kind: 'delivery', id: d.id, customer: d.customer, date: d.date, qty: firstQty(d.items), so: d.so })),
      ...distRecs.map((d) => ({ kind: 'distribution', id: d.id, customer: d.customerName, date: d.distDate, qty: d.qty, contact: d.customerContact, address: d.customerAddress, distType: d.distType })),
    ]
    const custIter = custRows.length ? custRows : [null]

    materialRows.forEach((mat) => {
      custIter.forEach((cust) => {
        rows.push({
          materialId: mat?.materialId || '', materialName: mat?.materialName || '', materialLot: mat?.lot || '', materialDate: mat?.date || '', materialVendor: mat?.poVendor || '',
          woId: w.id, woProduct: w.product, woStatus: w.status, woDue: w.dueDate, so: w.so || order?.id || '',
          finLot: w.lot || '', finProduct: w.product,
          deliveryId: cust?.kind === 'delivery' ? cust.id : '', deliveryDate: cust?.kind === 'delivery' ? cust.date : '',
          distId: cust?.kind === 'distribution' ? cust.id : '', distType: cust?.distType || '',
          customer: cust?.customer || '', customerContact: cust?.contact || '', customerAddress: cust?.address || '',
          qty: cust?.qty || w.qty || '',
          date: cust?.date || w.dueDate || '',
        })
      })
    })
  })

  // 어떤 WO와도 연결되지 않은 원자재 LOT(미사용 입고) — 검색 커버리지를 위해 별도 행으로 포함
  matIndex.forEach((mat) => {
    if (usedMaterialLots.has(norm(mat.lot))) return
    rows.push({
      materialId: mat.materialId, materialName: mat.materialName, materialLot: mat.lot, materialDate: mat.date, materialVendor: mat.poVendor,
      woId: '', woProduct: '', woStatus: '', woDue: '', so: '',
      finLot: '', finProduct: '',
      deliveryId: '', deliveryDate: '', distId: '', distType: '',
      customer: '', customerContact: '', customerAddress: '',
      qty: mat.qty || '', date: mat.date || '',
    })
  })

  // WO와 연결되지 않은 납품/배포 기록도 마찬가지로 포함
  deliveries.forEach((d) => {
    if (usedDeliveryIds.has(d.id)) return
    rows.push({
      materialId: '', materialName: '', materialLot: '', materialDate: '', materialVendor: '',
      woId: '', woProduct: '', woStatus: '', woDue: '', so: d.so || '',
      finLot: d.lot || '', finProduct: (d.items || '').replace(/\s*\d+\s*EA.*$/, '').trim(),
      deliveryId: d.id, deliveryDate: d.date, distId: '', distType: '',
      customer: d.customer, customerContact: '', customerAddress: '',
      qty: firstQty(d.items), date: d.date,
    })
  })
  dists.forEach((d) => {
    if (usedDistIds.has(d.id)) return
    rows.push({
      materialId: '', materialName: '', materialLot: '', materialDate: '', materialVendor: '',
      woId: d.woId || '', woProduct: '', woStatus: '', woDue: '', so: '',
      finLot: d.lotNo || '', finProduct: d.productName || '',
      deliveryId: '', deliveryDate: '', distId: d.id, distType: d.distType,
      customer: d.customerName, customerContact: d.customerContact, customerAddress: d.customerAddress,
      qty: d.qty || '', date: d.distDate,
    })
  })

  return rows
}

/** 텍스트 검색: 행의 모든 필드를 대상으로 */
export function searchChainRows(rows, query) {
  const q = norm(query)
  if (!q) return rows
  return rows.filter((r) => Object.values(r).some((v) => v != null && norm(v).includes(q)))
}

/** 특정 엔티티(어떤 항목이든)를 클릭했을 때, 그 값을 공유하는 모든 행만 남긴다 (연동/피벗) */
export function pivotChainRows(rows, field, value) {
  if (!value) return rows
  return rows.filter((r) => norm(r[field]) === norm(value))
}

export const SORTS = {
  date: { label: '날짜순', key: (r) => r.date || r.deliveryDate || r.materialDate || '' },
  material: { label: '원자재순', key: (r) => r.materialName || '' },
  wo: { label: 'WO순', key: (r) => r.woId || '' },
  finLot: { label: '완제품LOT순', key: (r) => r.finLot || '' },
  customer: { label: '고객순', key: (r) => r.customer || '' },
}

export function sortChainRows(rows, sortKey, dir = 'asc') {
  const s = SORTS[sortKey] || SORTS.date
  const arr = [...rows].sort((a, b) => String(s.key(a)).localeCompare(String(s.key(b))))
  return dir === 'desc' ? arr.reverse() : arr
}
