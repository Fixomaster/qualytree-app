import React from 'react'
import { isHtml, sanitizeHtml } from '../lib/richText'

const CSS = '.qt-richview table{border-collapse:collapse;max-width:100%}.qt-richview td,.qt-richview th{border:1px solid #9aa5a0;padding:4px 6px;vertical-align:top}.qt-richview img{max-width:100%;height:auto}.qt-richview ul{list-style:disc;padding-left:1.4em}.qt-richview ol{list-style:decimal;padding-left:1.4em}'

// 저장된 본문 표시용 — HTML(표·그림 포함)이면 정제 후 렌더링, 일반 텍스트면 줄바꿈 유지.
export default function RichView({ value, className, style, empty }) {
  if (!value) return empty || null
  if (isHtml(value)) {
    return (
      <div className={'qt-richview ' + (className || '')} style={style}>
        <style>{CSS}</style>
        <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }} />
      </div>
    )
  }
  return <div className={className} style={{ whiteSpace: 'pre-wrap', ...(style || {}) }}>{value}</div>
}
