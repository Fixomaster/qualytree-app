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
