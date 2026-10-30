// api/_lib/mail.js — 결제 관련 이메일 발송(Resend). 무료 구간: 월 3,000통·일 100통.
// 환경변수: RESEND_API_KEY (Secret), MAIL_FROM (선택, 기본 'Qualytree <noreply@qualy-tree.com>')
// 발신 도메인(qualy-tree.com)은 Resend 에서 DNS 인증이 되어 있어야 고객에게 발송된다.
const env = (k) => process.env[k] || ''
export const enabled = () => !!env('RESEND_API_KEY')
export const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '').trim())

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

function layout(title, rows, note) {
  const tr = rows.map(([k, v]) => `<tr><td style="padding:6px 12px;color:#64748b;white-space:nowrap">${esc(k)}</td><td style="padding:6px 12px;font-weight:600;color:#0f172a">${esc(v)}</td></tr>`).join('')
  return `<div style="font-family:-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a">
  <div style="font-size:18px;font-weight:700;color:#1f4d3a;margin-bottom:4px">Qualytree</div>
  <div style="font-size:16px;font-weight:700;margin:16px 0 12px">${esc(title)}</div>
  ${rows.length ? `<table style="border-collapse:collapse;width:100%;background:#f8fafc;border-radius:8px">${tr}</table>` : ''}
  ${note ? `<p style="font-size:13px;color:#475569;line-height:1.6;margin-top:14px">${note}</p>` : ''}
  <p style="font-size:11px;color:#94a3b8;margin-top:24px">주식회사 퀄리트리 · 문의 contact@qualy-tree.com</p></div>`
}

export async function send(to, subject, title, rows, note) {
  if (!enabled()) return { ok: false, skipped: true }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env('RESEND_API_KEY'), 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env('MAIL_FROM') || 'Qualytree <noreply@qualy-tree.com>', to: [String(to).trim()], subject, html: layout(title, rows, note) }),
    })
    if (!r.ok) { console.error('[mail] send failed', r.status, await r.text().catch(() => '')); return { ok: false } }
    return { ok: true }
  } catch (e) { console.error('[mail] send error', e?.message || e); return { ok: false } }
}
