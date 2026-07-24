/* ─── 수주 등록 시 완제품재고 자동 출고 / 부족 시 작업지시(WO) 자동 발행 ───
   영업(Sales)의 수주 등록 단계에서, 각 품목에 대해 구매자재(Purchase)의
   완제품재고(qms_pur_fin)를 확인하여:
     - 재고가 충분하면 그만큼 재고를 차감(출고 처리)한다.
     - 재고가 없거나 부족하면 생산(Manufacturing)에 작업지시(WO)를 자동 발행한다.
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
 * order.lineItems([{name, qty, price}, ...])를 순회하며 완제품재고를 확인,
 * 재고가 충분하면 출고(차감)하고, 부족하면 WO를 자동 발행한다.
 *
 * @returns {{ shipped: Array<{name:string, qty:number}>, createdWos: Array<object>, firstWoId: string|null }}
 */
export function fulfillOrderLineItems(order) {
  const fin = readLS('qms_pur_fin')
  const wos = readLS('qms_mfg_wo')

  const nextFin = fin.map(f => ({ ...f }))
  let finChanged = false
  let woChanged = false
  const shipped = []
  const createdWos = []

  for (const li of (order.lineItems || [])) {
    const name = (li.name || '').trim()
    const qtyNeeded = parseFloat(li.qty) || 0
    if (!name || qtyNeeded <= 0) continue

    const idx = nextFin.findIndex(f => norm(f.name) === norm(name))
    const item = idx >= 0 ? nextFin[idx] : null
    const stock = item ? (parseFloat(item.stock) || 0) : 0

    if (item && stock >= qtyNeeded) {
      // 재고 충분 → 출고 처리 (차감)
      const newStock = stock - qtyNeeded
      const min = parseFloat(item.min) || 0
      nextFin[idx] = { ...item, stock: String(newStock), status: newStock < min ? '부족' : '정상' }
      finChanged = true
      shipped.push({ name, qty: qtyNeeded })
    } else {
      // 재고 없음/부족 → 생산 작업지시 자동 발행
      const wo = {
        id: nid('WO'),
        so: order.id,
        product: name,
        qty: String(qtyNeeded),
        step: '대기',
        startDate: new Date().toISOString().slice(0,10),
        dueDate: order.dueDate || '',
        assignee: '미배정',
        progress: '0',
        status: '대기',
      }
      wos.push(wo)
      woChanged = true
      createdWos.push(wo)
      // 일부 재고가 있었다면 그만큼은 우선 소진 처리
      if (item && stock > 0) {
        nextFin[idx] = { ...item, stock: '0', status: '부족' }
        finChanged = true
      }
    }
  }

  if (finChanged) writeLS('qms_pur_fin', nextFin)
  if (woChanged) writeLS('qms_mfg_wo', wos)

  return { shipped, createdWos, firstWoId: createdWos[0]?.id || null }
}
