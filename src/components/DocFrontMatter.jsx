// 전체 보기 공통 머리말 — 목차 + 개정이력표(개정번호·시행일·개정사유·개정내용)
import React from 'react'

const th = { border: '1px solid #9aa5a0', padding: '6px 8px', background: '#f3f4f6', fontSize: 12, textAlign: 'center' }
const td = { border: '1px solid #9aa5a0', padding: '6px 8px', fontSize: 12, verticalAlign: 'top' }

export const fmtDate = (v) => {
  if (!v) return ''
  const d = new Date(v); if (isNaN(d)) return String(v)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** toc: [{ key, no, title, depth }]  revisions: [{ rev, date, reason, content }] (오래된 순) */
export default function DocFrontMatter({ toc = [], revisions = [], docNo = '', latest }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', fontSize: 13, color: '#374151', marginBottom: 28 }}>
        {docNo && <span>문서번호: <b>{docNo}</b></span>}
        <span>현재 개정: <b>{latest ? latest.rev : '-'}</b></span>
        <span>시행일: <b>{latest ? latest.date : '-'}</b></span>
      </div>

      <div style={{ fontSize: 17, fontWeight: 800, borderBottom: '2px solid #1a4731', paddingBottom: 6, marginBottom: 10 }}>개정 이력</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 28 }}>
        <thead><tr>
          <th style={{ ...th, width: 70 }}>개정번호</th><th style={{ ...th, width: 90 }}>시행일</th><th style={{ ...th, width: '28%' }}>개정사유</th><th style={th}>개정내용</th>
        </tr></thead>
        <tbody>
          {revisions.length === 0 ? (
            <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: '#9ca3af' }}>저장된 개정 이력이 없습니다.</td></tr>
          ) : [...revisions].reverse().map((r, i) => (
            <tr key={i}>
              <td style={{ ...td, textAlign: 'center' }}>{r.rev}</td>
              <td style={{ ...td, textAlign: 'center', whiteSpace: 'nowrap' }}>{r.date}</td>
              <td style={td}>{r.reason}</td>
              <td style={td}>{r.content}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ fontSize: 17, fontWeight: 800, borderBottom: '2px solid #1a4731', paddingBottom: 6, marginBottom: 10 }}>목 차</div>
      <div style={{ columnCount: toc.length > 18 ? 2 : 1, columnGap: 32, fontSize: 13, lineHeight: 1.9 }}>
        {toc.length === 0 ? <div style={{ color: '#9ca3af' }}>작성된 항목이 없습니다.</div> : toc.map(t => (
          <div key={t.key} style={{ paddingLeft: (t.depth || 0) * 16, breakInside: 'avoid' }}>
            <a href={'#' + t.key} style={{ color: '#111827', textDecoration: 'none', fontWeight: t.depth ? 400 : 700 }}>{t.no} {t.title}</a>
          </div>
        ))}
      </div>
      <div style={{ borderBottom: '1px solid #e5e7eb', marginTop: 24 }} />
    </div>
  )
}
