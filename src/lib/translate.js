// 한→영 번역 클라이언트 — /api/translate (Anthropic 프록시) 호출
// glossary: [{ ko, en }] 규제 용어집(문서 용어사전과 동일 소스 권장)
export async function translateToEn(text, glossary) {
  const r = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, glossary: glossary || [] }),
  })
  let j
  try { j = await r.json() } catch { throw new Error('서버 응답을 해석할 수 없습니다.') }
  if (!j.ok) throw new Error(j.message || '번역에 실패했습니다.')
  return j.text
}

export default { translateToEn }
