/* ─── 수주 등록 시 완제품재고 확인 → 부족하면 작업지시(WO) 자동 발행 ───
   영업(Sales)의 수주 등록 단계에서는 재고를 직접 차감하지 않는다(실물이
   아직 출하되지 않았으므로). 대신 완제품재고(qms_pur_fin)를 조회만 해서
   부족한 품목이 있으면 생산(Manufacturing)에 작업지시(WO)를 자동 발행한다.
   실제 재고 차감은 영업의 납품(출하) 등록 시점에 deductFinStockForDelivery()
   로 이루어진다 — 그래야 구매자재 화면의 재고 수치가 실제 출하 시점과
   실시간으로 일치한다.
   서로 다른 페이지(라우트)의 localStorage 키를 여기서 직접 읽고 쓴다. */

function readLS(key) {
  try { return JSON.parse(localStorage.getItem(key)) ?? [] } catch { return [] }
}
function writeLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch { /* noop */ }
}
const nid = (p) =>
  `${p}-${new Date().toISOString().slice(2,4)}${String(new Date().getMonth()+1).padStart(2,'0')}-${String(Date.now()).slice(-3)}`

const norm = (s='') => String(s).trim().toLowerCase()

/**
 * order.lineItems([{name, qty, price}, ...])를 순회하며 완제품재고를 "조회만" 한다.
 * 재고가 충분한 품목은 sufficient에, 부족한 품목은 WO를 자동 발행하고 createdWos에 담는다.
 * (재고 자체는 건드리지 않는다 — 차감은 납품 등록 시점에 별도로 처리)
 *
 * @returns {{ sufficient: Array<{name:string, qty:number}>, createdWos: Array<object>, firstWoId: string|null }}
 */
export function fulfillOrderLineItems(order) {
  const fin = readLS('qms_pur_fin')
  const wos = readLS('qms_mfg_wo')

  let woChanged = false
  const sufficient = []
  const createdWos = []

  for (const li of (order.lineItems || [])) {
    const name = (li.name || '').trim()
    const qtyNeeded = parseFloat(li.qty) || 0
    if (!name || qtyNeeded <= 0) continue

    const item = fin.find(f => norm(f.name) === norm(name))
    const stock = item ? (parseFloat(item.stock) || 0) : 0

    if (stock >= qtyNeeded) {
      sufficient.push({ name, qty: qtyNeeded })
    } else {
      // 재고 없음/부족 → 생산 작업지시 자동 발행 (재고는 차감하지 않음)
      const wo = {
        id: nid('WO'),
        so: order.id,
        product: name,
        qty: String(qtyNeeded),
        step: '대기',
        startDate: new Date().toISOString().slice(0,10),
        dueDate: '', // 수주의 접수일과 생산 납기일은 별개 — 생산 화면에서 직접 지정
        assignee: '미배정',
        progress: '0',
        status: '대기',
      }
      wos.push(wo)
      woChanged = true
      createdWos.push(wo)
    }
  }

  if (woChanged) writeLS('qms_mfg_wo', wos)

  return { sufficient, createdWos, firstWoId: createdWos[0]?.id || null }
}

/**
 * 납품(출하) 등록 시점에 실제로 완제품재고를 차감한다.
 * order.lineItems를 기준으로 각 품목 수량만큼 재고를 소진 처리하고,
 * 재고가 마이너스가 되지 않도록 0에서 멈춘다.
 *
 * @returns {{ deducted: Array<{name:string, qty:number}> }}
 */
export function deductFinStockForDelivery(order) {
  if (!order || !Array.isArray(order.lineItems) || order.lineItems.length === 0) return { deducted: [] }
  const fin = readLS('qms_pur_fin')
  const nextFin = fin.map(f => ({ ...f }))
  let changed = false
  const deducted = []

  for (const li of order.lineItems) {
    const name = (li.name || '').trim()
    const qty = parseFloat(li.qty) || 0
    if (!name || qty <= 0) continue
    const idx = nextFin.findIndex(f => norm(f.name) === norm(name))
    if (idx < 0) continue
    const item = nextFin[idx]
    const stock = parseFloat(item.stock) || 0
    const newStock = Math.max(0, stock - qty)
    const min = parseFloat(item.min) || 0
    nextFin[idx] = { ...item, stock: String(newStock), status: newStock < min ? '부족' : '정상' }
    changed = true
    deducted.push({ name, qty })
  }

  if (changed) writeLS('qms_pur_fin', nextFin)
  return { deducted }
}

/**
 * 완제품재고 부족 품목에 대해 생산(Manufacturing)에 재고 보충을 요청한다.
 * 영업(Sales)의 생산요청(qms_sal_prodreqs) 목록에 새 요청을 등록한다.
 * @param {{name:string, stock:string|number, min:string|number}} finItem
 * @returns {{id:string, item:string, qty:string}}
 */
export function requestProductionForFinItem(finItem) {
  const name = (finItem?.name || '').trim()
  if (!name) return null
  const stock = parseFloat(finItem.stock) || 0
  const min = parseFloat(finItem.min) || 0
  const shortfall = Math.max(min - stock, 1)

  const prodReqs = readLS('qms_sal_prodreqs')
  const req = {
    id: nid('PR'),
    so: '',
    item: name,
    qty: String(shortfall),
    dueDate: '',
    priority: '높음',
    status: 'WO대기',
    note: '구매자재 완제품재고 부족 알람 → 재고 요청 (자동 등록)',
  }
  writeLS('qms_sal_prodreqs', [req, ...prodReqs])
  return req
}
