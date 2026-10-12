// AI 초안 생성 통합 함수 — Vercel Hobby 서버리스 함수 12개 한도 대응 (2026-10-12)
// 기존 주소(/api/risk-draft 등)는 vercel.json rewrite로 /api/drafts?kind=… 에 연결되므로 화면 코드는 그대로 둔다.
import risk from '../lib/drafts/risk.js'
import dhf from '../lib/drafts/dhf.js'
import regulatory from '../lib/drafts/regulatory.js'
import importStandard from '../lib/drafts/import-standard.js'

export const config = { maxDuration: 60 }

const HANDLERS = { risk, dhf, regulatory, 'import-standard': importStandard }

export default async function handler(req, res) {
  let kind = req.query && req.query.kind
  if (!kind) {
    try { kind = new URL(req.url, 'http://localhost').searchParams.get('kind') } catch (e) { kind = null }
  }
  const h = HANDLERS[kind]
  if (!h) {
    res.status(404).json({ error: 'unknown_draft_kind', kind: kind || null })
    return
  }
  return h(req, res)
}
