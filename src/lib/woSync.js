/* ─── 생산 WO ↔ 영업 수주 상태 자동 연동 ───────────────────────────
   생산(Manufacturing)의 작업지시(WO) 상태가 바뀌면, 해당 WO와 연결된
   영업(Sales)의 수주 상태를 자동으로 함께 갱신한다.
   두 모듈은 서로 다른 페이지(라우트)에서 각자의 localStorage 키를
   사용하므로, 여기서 상대 모듈의 키를 직접 읽고 쓰는 방식으로 연동한다. */

export const WO_STATUS_TO_ORDER_STATUS = {
  '대기':   '생산요청',
  '진행중': '생산중',
  '검사중': '검사중',
  '완료':   '납품대기',
  '취소':   '취소',
}

function readLS(key) {
  try { return JSON.parse(localStorage.getItem(key)) ?? [] } catch { return [] }
}
function writeLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch { /* noop */ }
}

/** 생산 작업지시 전체 목록을 읽어온다 (영업 쪽 WO 선택 드롭다운용). */
export function readManufacturingWos() {
  return readLS('qms_mfg_wo')
}

/** 영업(수동 생산요청 등)에서 새 생산 작업지시(WO)를 직접 발행할 때 쓰는 헬퍼.
 *  생산(Manufacturing)의 qms_mfg_wo 목록에 WO를 추가하고 생성된 WO를 반환한다.
 *  이렇게 발행된 WO는 생산현황(WoView) 화면에 즉시 나타나고, 이후 진행 상태는
 *  syncOrderStatusFromWo/WO_STATUS_TO_PR_STATUS 매핑을 통해 자동으로 되돌아온다. */
export function createManufacturingWo({ so = '', product = '', qty = '' } = {}) {
  const wos = readLS('qms_mfg_wo')
  const id = `WO-${new Date().toISOString().slice(2,4)}${String(new Date().getMonth()+1).padStart(2,'0')}-${String(Date.now()).slice(-3)}`
  const wo = {
    id, so, product, qty: String(qty || ''),
    step: '대기', startDate: new Date().toISOString().slice(0,10), dueDate: '',
    assignee: '미배정', progress: '0', status: '대기',
  }
  writeLS('qms_mfg_wo', [...wos, wo])
  return wo
}

/** WO(woId)의 상태가 woStatus로 바뀌었을 때, 연결된 영업 수주의 상태를 자동 반영한다.
 *  - 이미 납품완료·취소된 수주는 되돌리지 않는다.
 *  - 매핑에 없는 상태는 무시한다. */
export function syncOrderStatusFromWo(woId, woStatus) {
  if (!woId) return
  const mapped = WO_STATUS_TO_ORDER_STATUS[woStatus]
  if (!mapped) return
  const orders = readLS('qms_sal_orders')
  if (!Array.isArray(orders) || orders.length === 0) return
  let changed = false
  const next = orders.map(o => {
    if (o.wo === woId && o.status !== mapped && !['납품완료', '취소'].includes(o.status)) {
      changed = true
      return { ...o, status: mapped }
    }
    return o
  })
  if (changed) writeLS('qms_sal_orders', next)
}

/* ─── 생산 완료 → 완제품재고(qms_pur_fin) 자동 입고 ───────────────
   작업지시(WO)가 '완료' 상태가 되면(=생산·품질 공정을 모두 거쳐 완제품이
   나온 시점), 해당 품목 수량만큼 구매자재의 완제품재고에 자동으로 입고
   반영한다. 이미 반영된 WO(finApplied)는 중복 반영하지 않는다. */
export function addFinStockOnWoComplete(w) {
  if (!w || w.status !== '완료' || w.finApplied) return null
  const qty = parseFloat(w.qty) || 0
  const name = (w.product || '').trim()
  if (qty <= 0 || !name) return null
  const fin = readLS('qms_pur_fin')
  const idx = fin.findIndex(f => (f.name || '').trim().toLowerCase() === name.toLowerCase())
  // 제품추적성관리(LOT 추적)에서 원자재→WO→완제품 계보를 되짚을 수 있도록,
  // 이 WO가 만들어낸 완제품 LOT 이력을 fin 항목의 lots[]에 함께 남긴다.
  const lotEntry = { lot: w.lot || '', qty: String(qty), woId: w.id, so: w.so || '', materialLots: w.materialLots || '', date: new Date().toISOString().slice(0, 10) }
  let next
  if (idx >= 0) {
    const item = fin[idx]
    const newStock = (parseFloat(item.stock) || 0) + qty
    const min = parseFloat(item.min) || 0
    const lots = [...(item.lots || []), lotEntry]
    next = fin.map((f, i) => i === idx ? { ...f, stock: String(newStock), status: newStock < min ? '부족' : '정상', lot: w.lot || f.lot, lots } : f)
  } else {
    const id = `FP-${new Date().toISOString().slice(2,4)}${String(new Date().getMonth()+1).padStart(2,'0')}-${String(Date.now()).slice(-3)}`
    next = [...fin, { id, name, unit: 'EA', stock: String(qty), min: '0', lot: w.lot || '', expiry: '', udi: '', status: '정상', lots: [lotEntry] }]
  }
  writeLS('qms_pur_fin', next)
  return { name, qty }
}

/** WO 목록을 순회하며 새로 '완료'된 항목의 완제품재고 반영을 처리하고,
 *  finApplied 플래그가 갱신된 새 목록을 반환한다. (중복 반영 방지) */
export function syncFinStockFromWoList(list) {
  return list.map(w => {
    if (w.status === '완료' && !w.finApplied) {
      const res = addFinStockOnWoComplete(w)
      if (res) return { ...w, finApplied: true }
    }
    return w
  })
}

/* ─── 생산 완료 → 제품보존·취급(LOT 재고 현황) 자동 등록 ───────────
   작업지시(WO)가 '완료' 상태가 되면, 제품보존·취급 모듈의 LOT 재고 현황
   목록에 해당 완제품 LOT을 자동으로 등록한다. 완제품 LOT 번호가 WO에
   입력되어 있지 않아도(레거시 WO 포함) 최소한의 LOT 재고 항목은 생성해
   생산 완료 시 사용자가 수동으로 다시 입력할 필요가 없도록 한다.
   이미 반영된 WO(presApplied)는 중복 반영하지 않는다. */
const LS_PRESERVATION_LOTS = 'qualytree.preservation_lots'

export function addPreservationLotOnWoComplete(w) {
  if (!w || w.status !== '완료' || w.presApplied) return null
  const qty = parseFloat(w.qty) || 0
  const name = (w.product || '').trim()
  if (qty <= 0 || !name) return null
  const lots = readLS(LS_PRESERVATION_LOTS)
  if (lots.some(l => l.linkedWoId === w.id)) return null
  const id = `PLT-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`
  const today = new Date().toISOString().slice(0, 10)
  const entry = {
    id, productName: name, productCode: '', lotNo: w.lot || '',
    qty: String(qty), manufacturedDate: today, expiryDate: '',
    storageLocation: '', specId: '', linkedDistId: '',
    status: 'in_stock', notes: `작업지시 ${w.id} 생산완료 시 자동 등록`,
    linkedWoId: w.id, createdAt: new Date().toISOString(),
  }
  writeLS(LS_PRESERVATION_LOTS, [entry, ...lots])
  return entry
}

/** WO 목록을 순회하며 새로 '완료'된 항목의 LOT 재고 현황 반영을 처리하고,
 *  presApplied 플래그가 갱신된 새 목록을 반환한다. (중복 반영 방지) */
export function syncPreservationLotsFromWoList(list) {
  return list.map(w => {
    if (w.status === '완료' && !w.presApplied) {
      const res = addPreservationLotOnWoComplete(w)
      if (res) return { ...w, presApplied: true }
    }
    return w
  })
}

/** WO가 '완료'로 바뀔 때 필요한 모든 하위 모듈 자동 반영(완제품재고 +
 *  LOT 재고 현황)을 한 번에 처리하는 통합 헬퍼. ManufacturingHub의 모든
 *  WO 상태 변경 지점에서 이 함수 하나만 호출하면 된다. */
export function syncWoCompletionEffects(list) {
  return syncPreservationLotsFromWoList(syncFinStockFromWoList(list))
}
