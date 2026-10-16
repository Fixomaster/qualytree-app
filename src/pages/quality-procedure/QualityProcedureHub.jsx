// src/pages/quality-procedure/QualityProcedureHub.jsx
// 품질절차서 — 절차서 제목 > 주제/상세내용, 개정이력(전체 버전 비교), 전체 보기·PDF
// 품질매뉴얼(QualityManualHub)과 같은 구성. 기본정보·품질책임자·조직도 값은 {{토큰}}으로 자동 연동.
import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import RichTextEditor from '../../components/RichTextEditor'
import RichView from '../../components/RichView'
import DocFrontMatter, { fmtDate } from '../../components/DocFrontMatter'
import { auth } from '../../lib/auth'
import { htmlToText } from '../../lib/richText'
import {
  loadProcedures, saveProcedure, deleteProcedure, newProcedure, newItem, loadProcRevisions,
  snapshotAt, getLinkContext, resolveTokens, TOKEN_HELP, isFilled,
} from '../../lib/qualityProcedureState'
import { FileText, Edit3, History, Eye, Printer, Save, Plus, Trash2, ArrowUp, ArrowDown, Check, Link2 } from 'lucide-react'

const TABS = [
  { id: 'write', label: '절차서 작성', icon: Edit3 },
  { id: 'history', label: '개정 이력', icon: History },
  { id: 'view', label: '전체 보기', icon: Eye },
]
const G = '#1a4731'
const btn = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13, color: '#374151' }
const inp = { padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, background: '#fff' }
const depth = (no) => Math.max(0, String(no || '').split('.').filter(Boolean).length - 1)
const norm = (v) => (v || '').replace(/\s+/g, ' ').trim()

function userName() { const s = auth.current(); return s?.user?.name || s?.user?.email || s?.name || s?.email || '' }

// ── 개정 이력: 전체 버전 비교 ────────────────────────────────────────────────
function VersionCompare({ revisions, current }) {
  const sorted = useMemo(() => [...revisions].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)), [revisions])
  const n = sorted.length
  const fmt = (d) => new Date(d).toLocaleString('ko-KR')
  const options = [
    { key: 'current', label: '현재 버전 (최신 전체)' },
    ...sorted.map((r, i) => ({ key: 'r' + i, label: `${fmt(r.created_at)} · ${r.procedure_title} (${r.note || '저장'})` })).reverse(),
    { key: 'empty', label: '최초 (첫 저장 이전)' },
  ]
  const [aKey, setAKey] = useState(n >= 2 ? 'r' + (n - 2) : 'empty')
  const [bKey, setBKey] = useState('current')
  const [onlyChanged, setOnlyChanged] = useState(true)
  const snap = (key) => {
    if (key === 'empty') return {}
    if (key === 'current') { const m = {}; current.forEach(p => { m[p.id] = { title: p.title, items: p.items } }); return m }
    return snapshotAt(sorted, Number(key.slice(1)))
  }
  if (n === 0) return null
  const A = snap(aKey), B = snap(bKey)
  const ids = [...new Set([...current.map(p => p.id), ...Object.keys(A), ...Object.keys(B)])]
  const blocks = ids.map(id => {
    const a = A[id], b = B[id]
    const title = (b || a)?.title || ''
    const itemIds = [...new Set([...(a?.items || []).map(i => i.id), ...(b?.items || []).map(i => i.id)])]
    const rows = itemIds.map(iid => {
      const ia = a?.items.find(i => i.id === iid), ib = b?.items.find(i => i.id === iid)
      let st = 'same'
      if (!ia) st = 'added'; else if (!ib) st = 'removed'
      else if (norm(ia.content) !== norm(ib.content) || ia.topic !== ib.topic || ia.no !== ib.no) st = 'changed'
      if (st === 'same' && !isFilled(ia?.content) && !isFilled(ib?.content)) st = 'none'
      return { ia, ib, st }
    }).filter(r => r.st !== 'none')
    let pst = 'same'
    if (!a && b) pst = 'added'; else if (a && !b) pst = 'removed'
    else if (a?.title !== b?.title || rows.some(r => r.st !== 'same')) pst = 'changed'
    return { id, title, a, b, rows, pst }
  }).filter(x => x.pst !== 'same' || !onlyChanged).filter(x => x.rows.length || x.pst !== 'same')
  const changed = blocks.filter(x => x.pst !== 'same').length
  const badge = { changed: ['변경됨', '#fef3c7', '#92400e'], added: ['신규', '#dcfce7', '#166534'], removed: ['삭제됨', '#fee2e2', '#991b1b'], same: ['동일', '#f3f4f6', '#6b7280'] }
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, marginBottom: 24 }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>전체 버전 비교</div>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>수정되기 전 전체 절차서와 현재(또는 선택한) 전체 절차서를 절차서·주제별로 나란히 비교합니다. 절차서를 저장할 때마다 이력이 쌓입니다.</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: '#6b7280' }}>이전 버전
          <select value={aKey} onChange={e => setAKey(e.target.value)} style={{ ...inp, width: '100%' }}>{options.filter(o => o.key !== 'current').map(o => <option key={o.key} value={o.key}>{o.label}</option>)}</select>
        </label>
        <label style={{ fontSize: 12, color: '#6b7280' }}>비교할 버전
          <select value={bKey} onChange={e => setBKey(e.target.value)} style={{ ...inp, width: '100%' }}>{options.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}</select>
        </label>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, fontSize: 13 }}>
        <span>변경된 절차서 <b>{changed}</b>개</span>
        <label style={{ marginLeft: 'auto', display: 'flex', gap: 6, cursor: 'pointer' }}><input type="checkbox" checked={onlyChanged} onChange={e => setOnlyChanged(e.target.checked)} /> 변경된 절차서만 보기</label>
      </div>
      {blocks.length === 0 ? <div style={{ textAlign: 'center', padding: 24, color: '#9ca3af', fontSize: 13 }}>선택한 두 버전 사이에 변경된 내용이 없습니다.</div> : blocks.map(bl => (
        <div key={bl.id} style={{ border: '1px solid #fcd34d', borderRadius: 10, marginBottom: 14, overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', background: '#fffbeb', borderBottom: '1px solid #e5e7eb' }}>
            <b style={{ fontSize: 14 }}>{bl.a && bl.b && bl.a.title !== bl.b.title ? `${bl.a.title} → ${bl.b.title}` : bl.title}</b>
            <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 999, background: badge[bl.pst][1], color: badge[bl.pst][2], fontWeight: 600 }}>{badge[bl.pst][0]}</span>
          </div>
          {bl.rows.filter(r => !onlyChanged || r.st !== 'same').map(({ ia, ib, st }) => (
            <div key={(ib || ia).id} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, background: '#f9fafb' }}>{(ib || ia).no} {(ib || ia).topic} <span style={{ marginLeft: 6, color: badge[st][2], background: badge[st][1], borderRadius: 999, padding: '0 7px', fontWeight: 600 }}>{badge[st][0]}</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <div style={{ padding: 12, borderRight: '1px solid #e5e7eb', fontSize: 13, background: st === 'changed' || st === 'removed' ? '#fffafa' : '#fff' }}><div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>이전 버전</div><RichView value={ia?.content || ''} empty={<span style={{ color: '#d1d5db' }}>(내용 없음)</span>} /></div>
                <div style={{ padding: 12, fontSize: 13, background: st === 'changed' || st === 'added' ? '#f7fef9' : '#fff' }}><div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>비교 버전</div><RichView value={ib?.content || ''} empty={<span style={{ color: '#d1d5db' }}>(내용 없음)</span>} /></div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export default function QualityProcedureHub() {
  const [sp] = useSearchParams()
  const [tab, setTab] = useState(() => TABS.some(t => t.id === sp.get('tab')) ? sp.get('tab') : 'write')
  const [procs, setProcs] = useState(() => loadProcedures())
  const [revs, setRevs] = useState(() => loadProcRevisions())
  const [selId, setSelId] = useState(() => sp.get('id') || loadProcedures()[0]?.id)
  const [draft, setDraft] = useState(() => { const l = loadProcedures(); const p = l.find(x => x.id === (sp.get('id') || l[0]?.id)); return p ? JSON.parse(JSON.stringify(p)) : null })
  const [dirty, setDirty] = useState(false)
  const [openItem, setOpenItem] = useState(null)
  const [newTitle, setNewTitle] = useState('')
  const [note, setNote] = useState('')
  const [effDate, setEffDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [saved, setSaved] = useState(false)
  const ctx = useMemo(() => getLinkContext(), [tab, procs])

  const refresh = () => { setProcs(loadProcedures()); setRevs(loadProcRevisions()) }
  function select(id) {
    if (dirty && !window.confirm('저장하지 않은 변경 내용이 있습니다. 이동하면 사라집니다. 계속할까요?')) return
    const p = procs.find(x => x.id === id)
    setSelId(id); setDraft(p ? JSON.parse(JSON.stringify(p)) : null); setDirty(false); setOpenItem(null); setNote('')
  }
  const upd = (fn) => { setDraft(d => fn(JSON.parse(JSON.stringify(d)))); setDirty(true) }
  function addProcedure() {
    const t = newTitle.trim(); if (!t) return
    const p = saveProcedure(newProcedure(t), userName(), '절차서 신규 추가')
    setNewTitle(''); refresh(); setSelId(p.id); setDraft(JSON.parse(JSON.stringify(p))); setDirty(false)
  }
  function removeProcedure() {
    if (!draft || !window.confirm(`'${draft.title}' 절차서를 삭제할까요? (개정 이력에는 삭제 기록이 남습니다)`)) return
    deleteProcedure(draft.id, userName()); const l = loadProcedures(); refresh()
    setSelId(l[0]?.id); setDraft(l[0] ? JSON.parse(JSON.stringify(l[0])) : null); setDirty(false)
  }
  function save() {
    if (!draft) return
    const p = saveProcedure(draft, userName(), note.trim() || '저장', effDate)
    refresh(); setDraft(JSON.parse(JSON.stringify(p))); setDirty(false); setNote(''); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }
  function move(i, d) { upd(x => { const j = i + d; if (j < 0 || j >= x.items.length) return x; [x.items[i], x.items[j]] = [x.items[j], x.items[i]]; return x }) }
  function addItem() { const it = newItem('', ''); upd(x => { x.items.push(it); return x }); setOpenItem(it.id) }
  const filled = (p) => p.items.filter(i => isFilled(i.content)).length

  return (
    <AppLayout>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ background: G, borderRadius: 10, padding: 10, display: 'flex' }}><FileText size={22} color="#fff" /></div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>품질절차서</h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>ISO 13485 §4.2.1 · 절차서 제목별 주제·상세내용 작성 및 개정이력 관리</p>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 13 }}>절차서 <b style={{ color: G }}>{procs.length}</b>건 · 작성 중 주제 <b style={{ color: G }}>{procs.reduce((s, p) => s + filled(p), 0)}</b>개</div>
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #e5e7eb' }}>
          {TABS.map(t => { const Icon = t.icon; const a = tab === t.id; return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', border: 'none', borderBottom: a ? `2px solid ${G}` : '2px solid transparent', background: 'none', cursor: 'pointer', color: a ? G : '#6b7280', fontWeight: a ? 700 : 400, fontSize: 14, marginBottom: -1 }}><Icon size={15} />{t.label}</button>
          ) })}
          <button onClick={() => window.print()} style={{ ...btn, border: 'none', marginLeft: 'auto', background: 'none' }}><Printer size={15} />PDF 출력</button>
        </div>

        {tab === 'write' && (
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20 }}>
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, height: 'fit-content' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 8 }}>절차서 제목</div>
              {procs.map(p => (
                <button key={p.id} onClick={() => select(p.id)} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 6, padding: '6px 8px', border: 'none', borderRadius: 6, cursor: 'pointer', textAlign: 'left', fontSize: 13, background: selId === p.id ? '#e8f5ee' : 'none', color: selId === p.id ? G : '#374151', fontWeight: selId === p.id ? 600 : 400 }}>
                  <span style={{ flex: 1 }}>{p.title}</span>
                  {p.items.length > 0 && <span style={{ fontSize: 11, color: '#9ca3af' }}>{filled(p)}/{p.items.length}</span>}
                  {p.items.length > 0 && filled(p) === p.items.length && <Check size={12} color="#22c55e" />}
                </button>
              ))}
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <input value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && addProcedure()} placeholder="새 절차서 제목" style={{ ...inp, flex: 1, minWidth: 0 }} />
                <button onClick={addProcedure} style={{ ...btn, padding: '7px 9px' }} title="절차서 추가"><Plus size={14} /></button>
              </div>
            </div>

            {!draft ? <div style={{ color: '#9ca3af', padding: 40, textAlign: 'center' }}>왼쪽에서 절차서를 선택하거나 새로 추가하세요.</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input value={draft.title} onChange={e => upd(x => { x.title = e.target.value; return x })} style={{ ...inp, fontSize: 17, fontWeight: 700, flex: 1, minWidth: 200 }} />
                  <input type="date" value={effDate} onChange={e => setEffDate(e.target.value)} title="시행일" style={inp} />
                  <input value={note} onChange={e => setNote(e.target.value)} placeholder="개정사유 (예: 신규 제정)" style={{ ...inp, width: 200 }} />
                  <button onClick={save} disabled={!dirty && !saved} style={{ ...btn, background: saved ? '#f0fdf4' : dirty ? G : '#e5e7eb', color: saved ? '#15803d' : dirty ? '#fff' : '#9ca3af', border: 'none', fontWeight: 600 }}>{saved ? <Check size={14} /> : <Save size={14} />}{saved ? '저장됨' : '저장'}</button>
                  <button onClick={removeProcedure} style={{ ...btn, color: '#b91c1c' }} title="절차서 삭제"><Trash2 size={14} /></button>
                </div>
                {draft.updated_at && <div style={{ fontSize: 11, color: '#9ca3af' }}>마지막 저장: {new Date(draft.updated_at).toLocaleString('ko-KR')}{dirty ? ' · 저장하지 않은 변경 있음' : ''}</div>}

                <details style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#1e3a8a' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 600 }}><Link2 size={12} style={{ verticalAlign: -1 }} /> 다른 메뉴 정보 자동 연동 ({'{{회사명}}'} 등을 본문에 넣으면 최신 값으로 표시)</summary>
                  <table style={{ marginTop: 6, borderCollapse: 'collapse' }}><tbody>
                    {TOKEN_HELP.map(([t, d]) => { const v = ctx[t.replace(/[{}]/g, '')]; return <tr key={t}><td style={{ padding: '2px 10px 2px 0', fontFamily: 'monospace' }}>{t}</td><td style={{ padding: '2px 10px 2px 0' }}>{d}</td><td style={{ color: v ? '#166534' : '#b45309' }}>{v || '(미입력)'}</td></tr> })}
                  </tbody></table>
                </details>

                {draft.items.length === 0 && <div style={{ padding: 28, textAlign: 'center', color: '#9ca3af', border: '1px dashed #d1d5db', borderRadius: 10, fontSize: 13 }}>아직 주제가 없습니다. 아래 '주제 추가'로 번호·주제·상세내용을 입력하세요.</div>}
                {draft.items.map((it, i) => {
                  const open = openItem === it.id
                  return (
                    <div key={it.id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff' }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '8px 10px', paddingLeft: 10 + depth(it.no) * 18 }}>
                        <input value={it.no} onChange={e => upd(x => { x.items[i].no = e.target.value; return x })} placeholder="번호" style={{ ...inp, width: 64 }} />
                        <input value={it.topic} onChange={e => upd(x => { x.items[i].topic = e.target.value; return x })} placeholder="주제" style={{ ...inp, flex: 1, fontWeight: 600 }} />
                        {isFilled(it.content) && <Check size={13} color="#22c55e" />}
                        <button style={btn} onClick={() => setOpenItem(open ? null : it.id)}>{open ? '접기' : '상세내용'}</button>
                        <button style={{ ...btn, padding: '6px' }} onClick={() => move(i, -1)}><ArrowUp size={13} /></button>
                        <button style={{ ...btn, padding: '6px' }} onClick={() => move(i, 1)}><ArrowDown size={13} /></button>
                        <button style={{ ...btn, padding: '6px', color: '#b91c1c' }} onClick={() => upd(x => { x.items.splice(i, 1); return x })}><Trash2 size={13} /></button>
                      </div>
                      {open && (
                        <div style={{ padding: '0 10px 10px' }}>
                          <RichTextEditor value={it.content} onChange={v => upd(x => { x.items[i].content = v; return x })} minHeight={220} placeholder={`${it.no} ${it.topic} 상세내용을 입력하세요. 표·그림 붙여넣기 가능, {{회사명}} 같은 연동 토큰 사용 가능`} />
                        </div>
                      )}
                    </div>
                  )
                })}
                <div><button onClick={addItem} style={{ ...btn, borderColor: G, color: G }}><Plus size={14} />주제 추가</button></div>
              </div>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div>
            <VersionCompare key={revs.length} revisions={revs} current={procs} />
            <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 12 }}>총 {revs.length}건의 개정 이력</div>
            {revs.length === 0 ? <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>아직 저장된 개정 이력이 없습니다. 절차서를 작성하고 저장하면 기록됩니다.</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {revs.map(r => (
                  <div key={r.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{ background: '#e8f5ee', color: G, borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>{r.procedure_title}</span>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>{r.note}</span>
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>{new Date(r.created_at).toLocaleString('ko-KR')}</span>
                      <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 'auto' }}>{r.created_by}</span>
                    </div>
                    {r.snapshot && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>주제 {r.snapshot.items.length}개 · 작성 {r.snapshot.items.filter(i => isFilled(i.content)).length}개{' — '}{htmlToText(r.snapshot.items.find(i => isFilled(i.content))?.content || '').slice(0, 80)}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'view' && (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 40 }}>
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <div style={{ fontSize: 11, color: '#6b7280', letterSpacing: 2, marginBottom: 8 }}>ISO 13485 QUALITY PROCEDURES</div>
              <h2 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>품질절차서</h2>
              {ctx['회사명'] && <div style={{ fontSize: 16, color: '#6b7280', marginTop: 8 }}>{ctx['회사명']}</div>}
            </div>
            {(() => {
              const viewProcs = procs.filter(p => p.items.some(i => isFilled(i.content)))
              const sortedRevs = [...revs].filter(r => r.created_at).sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
              const seen = {}
              const rows = sortedRevs.map((r, i) => {
                const first = !seen[r.procedure_id]; seen[r.procedure_id] = true
                return { rev: i === 0 ? '제정(0)' : 'Rev.' + i, date: r.effective_date ? fmtDate(r.effective_date) : fmtDate(r.created_at), reason: r.note && r.note !== '저장' ? r.note : (first ? '신규 제정' : '내용 수정'), content: `${r.procedure_title}: ${r.summary || (r.snapshot ? (first ? '제정' : '개정') : '삭제')}` }
              })
              const toc = []
              procs.forEach((p, idx) => { if (!viewProcs.includes(p)) return
                toc.push({ key: 'qp-' + p.id, no: 'QP-' + String(idx + 1).padStart(2, '0'), title: p.title, depth: 0 })
                p.items.filter(i => isFilled(i.content)).forEach(it => toc.push({ key: 'qpi-' + it.id, no: it.no, title: it.topic, depth: depth(it.no) + 1 })) })
              return <DocFrontMatter docNo="QP" toc={toc} revisions={rows} latest={rows.slice(-1)[0]} />
            })()}
            {procs.filter(p => p.items.some(i => isFilled(i.content))).map((p, pi) => (
              <div key={p.id} id={'qp-' + p.id} style={{ marginBottom: 36, pageBreakInside: 'auto' }}>
                <div style={{ fontSize: 19, fontWeight: 800, borderBottom: `2px solid ${G}`, paddingBottom: 6, marginBottom: 14 }}>QP-{String(procs.indexOf(p) + 1).padStart(2, '0')} {p.title}</div>
                {p.items.filter(i => isFilled(i.content)).map(it => (
                  <div key={it.id} id={'qpi-' + it.id} style={{ marginBottom: 14, paddingLeft: depth(it.no) * 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{it.no} {it.topic}</div>
                    <RichView value={resolveTokens(it.content, ctx)} style={{ fontSize: 14, color: '#374151', lineHeight: 1.8 }} />
                  </div>
                ))}
              </div>
            ))}
            {!procs.some(p => p.items.some(i => isFilled(i.content))) && <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>아직 작성된 절차서 내용이 없습니다.</div>}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
