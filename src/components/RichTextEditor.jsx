import React, { useRef, useEffect } from 'react'
import { Bold, Italic, List, Table as TableIcon, Image as ImageIcon, RemoveFormatting } from 'lucide-react'
import { sanitizeHtml, toHtml, imageFileToDataUrl } from '../lib/richText'

// 서식 편집기 — 외부 문서(Word·Excel·웹·PDF)를 복사해 붙여넣으면 표·그림·서식이 원본 그대로 유지된다.
// value: 일반 텍스트 또는 HTML 문자열 / onChange(html)
export default function RichTextEditor({ value, onChange, readOnly, placeholder, minHeight = 260 }) {
  const ref = useRef(null)
  const last = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (value !== last.current) { el.innerHTML = sanitizeHtml(toHtml(value || '')); last.current = value }
  }, [value])

  const emit = () => {
    const el = ref.current; if (!el) return
    const html = el.innerHTML === '<br>' ? '' : el.innerHTML
    last.current = html; onChange && onChange(html)
  }
  const exec = (cmd, arg) => { ref.current && ref.current.focus(); document.execCommand(cmd, false, arg); emit() }
  const insertHtml = (h) => { ref.current && ref.current.focus(); document.execCommand('insertHTML', false, h); emit() }

  const onPaste = async (e) => {
    if (readOnly) return
    const cd = e.clipboardData; if (!cd) return
    const html = cd.getData('text/html')
    const files = Array.from(cd.files || []).filter(f => /^image\//.test(f.type))
    e.preventDefault()
    if (html) {
      let clean = sanitizeHtml(html.replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, '').replace(/<o:p>[\s\S]*?<\/o:p>/gi, ''))
      // Word/Excel은 그림을 로컬 경로(file:)로 넣기 때문에 정제 시 제거됨 → 클립보드에 이미지 파일이 있으면 함께 삽입
      insertHtml(clean)
      for (const f of files) insertHtml('<img src="' + (await imageFileToDataUrl(f)) + '" alt="">')
      return
    }
    if (files.length) { for (const f of files) insertHtml('<img src="' + (await imageFileToDataUrl(f)) + '" alt="">'); return }
    const text = cd.getData('text/plain')
    if (text) insertHtml(toHtml(text))
  }
  const onDrop = async (e) => {
    if (readOnly) return
    const files = Array.from((e.dataTransfer && e.dataTransfer.files) || []).filter(f => /^image\//.test(f.type))
    if (!files.length) return
    e.preventDefault()
    for (const f of files) insertHtml('<img src="' + (await imageFileToDataUrl(f)) + '" alt="">')
  }
  const addTable = () => {
    const r = parseInt(window.prompt('행 수', '3') || '0', 10), c = parseInt(window.prompt('열 수', '3') || '0', 10)
    if (!r || !c) return
    const cell = '<td><br></td>'
    insertHtml('<table border="1"><tbody>' + ('<tr>' + cell.repeat(c) + '</tr>').repeat(r) + '</tbody></table><p><br></p>')
  }
  const pickImg = async (e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) insertHtml('<img src="' + (await imageFileToDataUrl(f)) + '" alt="">') }

  const btn = 'p-1.5 rounded hover:bg-slate-100 text-slate-600'
  return (
    <div className={`rounded-lg border ${readOnly ? 'border-slate-200 bg-slate-50' : 'border-slate-200 focus-within:border-emerald-500'}`}>
      <style>{'.qt-rich table{border-collapse:collapse;max-width:100%}.qt-rich td,.qt-rich th{border:1px solid #9aa5a0;padding:4px 6px;vertical-align:top;min-width:30px}.qt-rich img{max-width:100%;height:auto}.qt-rich:empty:before{content:attr(data-placeholder);color:#94a3b8}.qt-rich ul{list-style:disc;padding-left:1.4em}.qt-rich ol{list-style:decimal;padding-left:1.4em}'}</style>
      {!readOnly && (
        <div className="flex items-center gap-0.5 px-2 py-1 border-b border-slate-200 bg-slate-50 rounded-t-lg">
          <button type="button" className={btn} title="굵게" onMouseDown={e => e.preventDefault()} onClick={() => exec('bold')}><Bold size={14} /></button>
          <button type="button" className={btn} title="기울임" onMouseDown={e => e.preventDefault()} onClick={() => exec('italic')}><Italic size={14} /></button>
          <button type="button" className={btn} title="글머리 기호" onMouseDown={e => e.preventDefault()} onClick={() => exec('insertUnorderedList')}><List size={14} /></button>
          <button type="button" className={btn} title="표 삽입" onMouseDown={e => e.preventDefault()} onClick={addTable}><TableIcon size={14} /></button>
          <button type="button" className={btn} title="그림 삽입" onMouseDown={e => e.preventDefault()} onClick={() => fileRef.current && fileRef.current.click()}><ImageIcon size={14} /></button>
          <button type="button" className={btn} title="서식 지우기" onMouseDown={e => e.preventDefault()} onClick={() => exec('removeFormat')}><RemoveFormatting size={14} /></button>
          <span className="ml-2 text-[11px] text-slate-400">Word·Excel·웹 문서를 복사해 붙여넣으면 표·그림이 그대로 유지됩니다</span>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickImg} />
        </div>
      )}
      <div
        ref={ref}
        className="qt-rich px-3 py-2 text-[12.5px] leading-relaxed focus:outline-none overflow-auto"
        style={{ minHeight, maxHeight: 640 }}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        data-placeholder={placeholder || ''}
        onInput={emit}
        onBlur={emit}
        onPaste={onPaste}
        onDrop={onDrop}
      />
    </div>
  )
}
