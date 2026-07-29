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
  let next
  if (idx >= 0) {
    const item = fin[idx]
    const newStock = (parseFloat(item.stock) || 0) + qty
    const min = parseFloat(item.min) || 0
    next = fin.map((f, i) => i === idx ? { ...f, stock: String(newStock), status: newStock < min ? '부족' : '정상' } : f)
  } else {
    const id = `FP-${new Date().toISOString().slice(2,4)}${String(new Date().getMonth()+1).padStart(2,'0')}-${String(Date.now()).slice(-3)}`
    next = [...fin, { id, name, unit: 'EA', stock: String(qty), min: '0', lot: w.lot || '', expiry: '', udi: '', status: '정상' }]
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
