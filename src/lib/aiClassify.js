// AI 인허가 업종(대분류·중분류) 자동 분류 — 클라이언트 헬퍼
//
// 서버(/api/classify)에 제품명·특성을 보내면, MDCAT 분류표 안에서
// Claude가 가장 알맞은 대분류·중분류를 추천한다. 실패해도 화면을 막지 않고
// 조용히 null을 반환한다 — 호출부는 수동 선택으로 폴백한다.

export async function classifyProduct({ name, itemName, contact, software, sterile, grade } = {}) {
  const trimmed = (name || '').toString().trim()
  if (trimmed.length < 2) return null
  try {
    const r = await fetch('/api/classify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: trimmed, itemName, contact, software, sterile, grade }),
    })
    const j = await r.json()
    if (!r.ok || !j || !j.ok) return null
    if (!j.cat1) return null
    return { cat1: j.cat1, cat2: j.cat2 || '', confidence: j.confidence || 'low' }
  } catch {
    return null
  }
}

export default { classifyProduct }
