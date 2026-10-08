// 서식 있는 본문(HTML) 처리 — 외부 문서(Word/Excel/웹)를 붙여넣을 때 표·그림·서식을 그대로 유지하기 위한 공용 유틸.
// 본문은 문자열로 저장한다: 기존 일반 텍스트 문서는 그대로, 서식 문서는 정제된 HTML 문자열.
const ALLOWED = new Set(['P','BR','B','STRONG','I','EM','U','S','SUB','SUP','H1','H2','H3','H4','H5','H6','UL','OL','LI','TABLE','THEAD','TBODY','TFOOT','TR','TH','TD','COLGROUP','COL','CAPTION','IMG','A','DIV','SPAN','BLOCKQUOTE','PRE','CODE','HR'])
const DROP_WITH_CONTENT = new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','FORM','INPUT','BUTTON','LINK','META','TITLE','HEAD','SVG','NOSCRIPT','TEMPLATE'])
const ATTRS = { A: ['href'], IMG: ['src', 'alt', 'width', 'height'], TD: ['colspan', 'rowspan', 'align', 'valign', 'width'], TH: ['colspan', 'rowspan', 'align', 'valign', 'width'], TABLE: ['border', 'cellpadding', 'cellspacing', 'width'], COL: ['width'] }
const STYLE_OK = ['font-weight', 'font-style', 'text-decoration', 'text-align', 'vertical-align', 'color', 'background-color', 'background', 'width', 'height', 'border', 'border-top', 'border-bottom', 'border-left', 'border-right', 'border-collapse', 'padding', 'font-size', 'white-space']

export function isHtml(s) { return typeof s === 'string' && /<(p|br|div|table|img|ul|ol|h[1-6]|span|b|strong|i|em)[\s>/]/i.test(s) }
export function escapeHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }
// 일반 텍스트 → 편집기용 HTML (줄바꿈 보존)
export function toHtml(s) { return isHtml(s) ? s : escapeHtml(s || '').replace(/\n/g, '<br>') }

function cleanStyle(st) {
  return String(st || '').split(';').map(x => x.trim()).filter(Boolean).filter(x => {
    const k = x.split(':')[0].trim().toLowerCase()
    const v = x.slice(x.indexOf(':') + 1).toLowerCase()
    return STYLE_OK.includes(k) && !/url\(|expression|javascript/.test(v)
  }).join(';')
}
function safeUrl(u, isImg) {
  const v = String(u || '').trim()
  if (/^(https?:|mailto:)/i.test(v)) return v
  if (isImg && /^data:image\/(png|jpe?g|gif|webp|bmp);base64,/i.test(v)) return v
  return ''
}

// 외부 HTML 정제: 허용 태그·속성만 남기고 스크립트/이벤트 제거. 표·이미지·서식은 유지.
export function sanitizeHtml(html) {
  if (!html) return ''
  const doc = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html')
  const walk = (node) => {
    Array.from(node.childNodes).forEach((ch) => {
      if (ch.nodeType === 8) { ch.remove(); return }
      if (ch.nodeType !== 1) return
      const tag = ch.tagName
      if (DROP_WITH_CONTENT.has(tag)) { ch.remove(); return }
      if (!ALLOWED.has(tag)) { walk(ch); while (ch.firstChild) node.insertBefore(ch.firstChild, ch); ch.remove(); return }
      const keep = ATTRS[tag] || []
      Array.from(ch.attributes).forEach((a) => {
        const n = a.name.toLowerCase()
        if (n === 'style') { const s = cleanStyle(a.value); s ? ch.setAttribute('style', s) : ch.removeAttribute('style'); return }
        if (!keep.includes(n)) ch.removeAttribute(a.name)
      })
      if (tag === 'A') { const h = safeUrl(ch.getAttribute('href')); h ? (ch.setAttribute('href', h), ch.setAttribute('target', '_blank'), ch.setAttribute('rel', 'noopener noreferrer')) : ch.removeAttribute('href') }
      if (tag === 'IMG') { const s = safeUrl(ch.getAttribute('src'), true); if (!s) { ch.remove(); return } ch.setAttribute('src', s) }
      walk(ch)
    })
  }
  walk(doc.body)
  return doc.body.innerHTML
}

// 번역·AI 입력용: HTML → 텍스트 (표는 행 단위 " | " 구분)
export function htmlToText(s) {
  if (!isHtml(s)) return s || ''
  const doc = new DOMParser().parseFromString('<body>' + s + '</body>', 'text/html')
  doc.querySelectorAll('img').forEach(i => i.replaceWith(doc.createTextNode('[그림]')))
  doc.querySelectorAll('tr').forEach(tr => { tr.appendChild(doc.createTextNode('\n')); tr.querySelectorAll('td,th').forEach((c, i, a) => { if (i < a.length - 1) c.appendChild(doc.createTextNode(' | ')) }) })
  doc.querySelectorAll('br').forEach(b => b.replaceWith(doc.createTextNode('\n')))
  doc.querySelectorAll('p,div,li,h1,h2,h3,h4,h5,h6').forEach(b => b.appendChild(doc.createTextNode('\n')))
  return (doc.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim()
}

// 이미지 파일 → 축소된 data URL (저장 용량 절감)
export function imageFileToDataUrl(file, maxW = 1200, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onerror = () => reject(new Error('이미지를 읽지 못했습니다.'))
    fr.onload = () => {
      if (/gif|svg/i.test(file.type)) return resolve(String(fr.result))
      const im = new Image()
      im.onerror = () => resolve(String(fr.result))
      im.onload = () => {
        const sc = Math.min(1, maxW / im.width)
        const c = document.createElement('canvas'); c.width = Math.round(im.width * sc); c.height = Math.round(im.height * sc)
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height)
        resolve(c.toDataURL('image/jpeg', quality))
      }
      im.src = String(fr.result)
    }
    fr.readAsDataURL(file)
  })
}

// 본문 표시/내보내기 공통 스타일 (표 테두리 보이게)
export const RICH_CSS = 'table{border-collapse:collapse;max-width:100%}td,th{border:1px solid #9aa5a0;padding:4px 6px;vertical-align:top}img{max-width:100%;height:auto}'
