// src/pages/quality/QualityHub.jsx Ã¢ÂÂ ISO 13485 ÃÂ§8.3 NCRÃÂ·Ã«Â¶ÂÃ¬Â ÂÃ­ÂÂ© ÃªÂ´ÂÃ«Â¦Â¬
import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert, Plus, Search, X, ChevronDown, ChevronUp, Wrench, ClipboardCheck, Trash2 } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { evaluateForCAPA, capa, CAPA_STATUS } from '../../lib/capaState'
import { auth } from '../../lib/auth'

const LS_KEY = 'qualytree.ncrs'
const CNT_KEY = 'qualytree.ncrCounter'

function lsRead() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] } }
function lsWrite(arr) { localStorage.setItem(LS_KEY, JSON.stringify(arr)) }
function nextId() {
  const n = parseInt(localStorage.getItem(CNT_KEY) || '0', 10) + 1
  localStorage.setItem(CNT_KEY, String(n))
  return 'NCR-' + new Date().getFullYear() + '-' + String(n).padStart(4, '0')
}

function getLinkedCapas(ncrId) {
  try {
    const all = JSON.parse(localStorage.getItem('qualytree.capas') || '[]')
    return all.filter(c => Array.isArray(c.sourceNcrIds) && c.sourceNcrIds.includes(ncrId))
  } catch { return [] }
}

const STATUS_LABEL = { investigating: 'Ã¬Â¡Â°Ã¬ÂÂ¬Ã¬Â¤Â', contained: 'ÃªÂ²Â©Ã«Â¦Â¬Ã¬ÂÂÃ«Â£Â', corrected: 'Ã¬ÂÂÃ¬Â ÂÃ¬ÂÂÃ«Â£Â', closed: 'Ã¬Â¢ÂÃªÂ²Â°' }
const STATUS_COLOR = { investigating: '#EAB308', contained: '#3B82F6', corrected: '#8B5CF6', closed: '#22C55E' }
const SEV_COLOR = { Critical: '#DC2626', Major: '#F97316', Minor: '#64748B' }
const SEVERITIES = ['Critical', 'Major', 'Minor']
const SOURCES = ['Ã«ÂÂ´Ã«Â¶ÂÃªÂ²ÂÃ¬ÂÂ¬', 'ÃªÂ³Â ÃªÂ°ÂÃ«Â¶ÂÃ«Â§Â', 'ÃªÂ³ÂµÃªÂ¸ÂÃ¬ÂÂÃ¬Â²Â´', 'ÃªÂ³ÂµÃ¬Â Â', 'ÃªÂ¸Â°Ã­ÂÂ']

export default function QualityHub() {
  const [ncrs, setNcrs] = useState(lsRead)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [form, setForm] = useState({ title: '', severity: 'Major', source: 'Ã«ÂÂ´Ã«Â¶ÂÃªÂ²ÂÃ¬ÂÂ¬', description: '', detectedAt: '', detectedBy: '' })

  function reload() { setNcrs(lsRead()) }

  function save() {
    if (!form.title.trim()) return alert('Ã¬Â ÂÃ«ÂªÂ©Ã¬ÂÂ Ã¬ÂÂÃ«Â Â¥Ã­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ')
    const cur = auth.current()
    const all = lsRead()
    const newRecord = {
      ...form,
      id: nextId(),
      status: 'investigating',
      createdAt: new Date().toISOString(),
      createdByEmail: cur?.email || '',
      createdByName: cur?.name || '',
      containment: '',
      containmentSkipped: false,
      containmentAt: null,
      approvals: [],
    }
    all.unshift(newRecord)
    lsWrite(all)
    const capaT = evaluateForCAPA(newRecord)
    if (capaT) capa.raise({ title: capaT.suggestedTitle, description: capaT.reason, trigger: capaT.trigger, triggerReason: capaT.reason, sourceNcrIds: [newRecord.id] })
    reload()
    setModal(false)
    setExpanded(newRecord.id)
  }

  function updateRecord(id, patch) {
    const all = lsRead().map(r => r.id === id ? { ...r, ...patch } : r)
    lsWrite(all)
    reload()
  }

  function remove(id) {
    if (!confirm('Ã¬ÂÂ­Ã¬Â ÂÃ­ÂÂÃ¬ÂÂÃªÂ²Â Ã¬ÂÂµÃ«ÂÂÃªÂ¹Â?')) return
    lsWrite(lsRead().filter(r => r.id !== id))
    reload()
  }

  const filtered = useMemo(() =>
    ncrs.filter(r => r.title.toLowerCase().includes(search.toLowerCase()) || r.id.includes(search)),
    [ncrs, search])

  const stats = useMemo(() => ({
    total: ncrs.length,
    investigating: ncrs.filter(r => r.status === 'investigating').length,
    contained: ncrs.filter(r => r.status === 'contained').length,
    corrected: ncrs.filter(r => r.status === 'corrected').length,
    closed: ncrs.filter(r => r.status === 'closed').length,
  }), [ncrs])

  const statCard = { background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }
  const btn = (bg, fg = '#fff') => ({ background: bg, color: fg, border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 })
  const inp = { width: '100%', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8, background: 'var(--bg-card)', color: 'var(--ink)', fontSize: 14, boxSizing: 'border-box' }

  return (
    <AppLayout>
      <HubBanner icon={ShieldAlert} title="NCRÃÂ·Ã«Â¶ÂÃ¬Â ÂÃ­ÂÂ© ÃªÂ´ÂÃ«Â¦Â¬" subtitle="ISO 13485 ÃÂ§8.3" color="#DC2626" />

      {/* Tab Nav #181 */}
      <div style={{display:'flex',gap:8,marginBottom:16}}>
        {['ncr','rework','concession','disposal'].map(k=>(
          <button key={k} onClick={()=>setQTab(k)} style={{padding:'6px 14px',borderRadius:8,fontSize:13,fontWeight:qTab===k?600:400,background:qTab===k?'var(--accent)':'var(--surface-2)',color:qTab===k?'#fff':'var(--ink)',border:'1px solid var(--border)',cursor:'pointer'}}>
            {{ncr:'NCR 목록',rework:'재작업 기록',concession:'특채 승인',disposal:'폐기 기록'}[k]||k}
          </button>
        ))}
      </div>
      {qTab === 'ncr' && (<>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 20 }}>
        {[['Ã¬Â ÂÃ¬Â²Â´', stats.total, 'var(--ink)'], ['Ã¬Â¡Â°Ã¬ÂÂ¬Ã¬Â¤Â', stats.investigating, '#EAB308'], ['ÃªÂ²Â©Ã«Â¦Â¬Ã¬ÂÂÃ«Â£Â', stats.contained, '#3B82F6'], ['Ã¬ÂÂÃ¬Â ÂÃ¬ÂÂÃ«Â£Â', stats.corrected, '#8B5CF6'], ['Ã¬Â¢ÂÃªÂ²Â°', stats.closed, '#22C55E']].map(([label, n, color]) => (
          <div key={label} style={statCard}>
            <div style={{ fontSize: 22, fontWeight: 700, color }}>{n}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)' }} />
          <input style={{ ...inp, paddingLeft: 30 }} placeholder="NCR ID Ã«ÂÂÃ«ÂÂ Ã¬Â ÂÃ«ÂªÂ© ÃªÂ²ÂÃ¬ÂÂ" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button style={btn('#DC2626')} onClick={() => { setForm({ title: '', severity: 'Major', source: 'Ã«ÂÂ´Ã«Â¶ÂÃªÂ²ÂÃ¬ÂÂ¬', description: '', detectedAt: '', detectedBy: '' }); setModal(true) }}>
          <Plus size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />Ã«Â¶ÂÃ¬Â ÂÃ­ÂÂ© Ã«ÂÂ±Ã«Â¡Â
        </button>
      </div>

      {/* List */}
      {filtered.length === 0 && <div style={{ textAlign: 'center', color: 'var(--ink-faint)', padding: 40 }}>Ã«ÂÂ±Ã«Â¡ÂÃ«ÂÂ Ã«Â¶ÂÃ¬Â ÂÃ­ÂÂ©Ã¬ÂÂ´ Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤</div>}
      {filtered.map(r => (
        <NcrCard key={r.id} r={r}
          expanded={expanded === r.id}
          onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
          onUpdate={patch => updateRecord(r.id, patch)}
          onRemove={() => remove(r.id)}
          btn={btn} inp={inp} onReload={reload} />
      ))}

      {/* Register Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 28, width: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Ã«Â¶ÂÃ¬Â ÂÃ­ÂÂ© Ã¬ÂÂ ÃªÂ·Â Ã«ÂÂ±Ã«Â¡Â</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setModal(false)}><X size={18} /></button>
            </div>
            {[
              ['Ã¬Â ÂÃ«ÂªÂ©', <input style={inp} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ã«Â¶ÂÃ¬Â ÂÃ­ÂÂ© Ã«ÂÂ´Ã¬ÂÂ© Ã¬ÂÂÃ¬ÂÂ½" />],
              ['Ã¬ÂÂ¬ÃªÂ°ÂÃ«ÂÂ', <select style={inp} value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>{SEVERITIES.map(s => <option key={s}>{s}</option>)}</select>],
              ['Ã«Â°ÂÃ¬ÂÂÃ¬Â¶ÂÃ¬Â²Â', <select style={inp} value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>{SOURCES.map(s => <option key={s}>{s}</option>)}</select>],
              ['Ã«Â°ÂÃªÂ²Â¬Ã¬ÂÂ¼', <input type="date" style={inp} value={form.detectedAt} onChange={e => setForm(f => ({ ...f, detectedAt: e.target.value }))} />],
              ['Ã«Â°ÂÃªÂ²Â¬Ã¬ÂÂ', <input style={inp} value={form.detectedBy} onChange={e => setForm(f => ({ ...f, detectedBy: e.target.value }))} />],
              ['Ã¬ÂÂÃ¬ÂÂ¸Ã«ÂÂ´Ã¬ÂÂ©', <textarea style={{ ...inp, minHeight: 80, resize: 'vertical' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />],
            ].map(([label, el]) => (
              <div key={label} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: 'var(--ink-faint)', display: 'block', marginBottom: 4 }}>{label}</label>
                {el}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button style={btn('transparent', 'var(--ink)')} onClick={() => setModal(false)}>Ã¬Â·Â¨Ã¬ÂÂ</button>
              <button style={btn('#DC2626')} onClick={save}>Ã«ÂÂ±Ã«Â¡Â</button>
            </div>
          </div>
        </div>
      )}
          </>)}
      {qTab === 'rework' && <ReworkTab ncrs={ncrs}/>}
      {qTab === 'concession' && <ConcessionTab ncrs={ncrs}/>}
      {qTab === 'disposal' && <DisposalTab ncrs={ncrs}/>}
    </AppLayout>
  )
}

function NcrCard({ r, expanded, onToggle, onUpdate, onRemove, btn, inp, onReload }) {
  const curUser = auth.current()
  const isApprover = (curUser?.level || 0) >= 3
  const [approveNote, setApproveNote] = useState('')
  const [qTab, setQTab] = useState('ncr')

  const linkedCapas = getLinkedCapas(r.id)
  const capasDone = linkedCapas.length === 0 || linkedCapas.every(c => c.status === CAPA_STATUS.CLOSED)

  function doCorrect() {
    if (!capasDone) return alert('Ã¬ÂÂ°ÃªÂ²Â°Ã«ÂÂ CAPAÃªÂ°Â Ã¬ÂÂÃ¬Â§Â Ã¬ÂÂÃ«Â£ÂÃ«ÂÂÃ¬Â§Â Ã¬ÂÂÃ¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤. CAPAÃÂ·ÃªÂ°ÂÃ¬ÂÂ  Ã«Â©ÂÃ«ÂÂ´Ã¬ÂÂÃ¬ÂÂ CAPAÃ«Â¥Â¼ Ã¬Â¢ÂÃªÂ²Â°Ã­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ.')
    onUpdate({ status: 'corrected', correctedAt: new Date().toISOString() })
  }

  function doApprove() {
    onUpdate({
      status: 'closed',
      closedAt: new Date().toISOString(),
      approvals: [{
        role: 'Ã¬ÂÂ¹Ã¬ÂÂ¸Ã¬ÂÂ',
        name: curUser?.name || 'Ã«Â¯Â¸Ã­ÂÂÃ¬ÂÂ¸',
        email: curUser?.email || '',
        level: curUser?.level || 0,
        note: approveNote,
        signedAt: new Date().toISOString(),
      }],
    })
  }

  const stageBox = (color) => ({ border: `1px solid ${color}`, borderRadius: 10, padding: 14, marginBottom: 12 })
  const stageTitle = (color, text) => <div style={{ fontWeight: 700, fontSize: 13, color, marginBottom: 10 }}>{text}</div>
  const linkBtn = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#EAB308', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600 }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={onToggle}>
        <span style={{ fontSize: 11, fontWeight: 700, color: SEV_COLOR[r.severity] || '#64748B', background: (SEV_COLOR[r.severity] || '#64748B') + '22', padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>{r.severity}</span>
        <span style={{ fontSize: 11, color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}>{r.id}</span>
        <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{r.title}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: STATUS_COLOR[r.status], background: STATUS_COLOR[r.status] + '22', padding: '2px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>{STATUS_LABEL[r.status]}</span>
        {expanded ? <ChevronUp size={16} color="var(--ink-faint)" /> : <ChevronDown size={16} color="var(--ink-faint)" />}
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--line)', padding: 16 }}>
          {/* Meta */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14, fontSize: 13, color: 'var(--ink-faint)' }}>
            <span>Ã¬Â¶ÂÃ¬Â²Â: {r.source}</span>
            <span>Ã«Â°ÂÃªÂ²Â¬Ã¬ÂÂ¼: {r.detectedAt || '-'}</span>
            <span>Ã«Â°ÂÃªÂ²Â¬Ã¬ÂÂ: {r.detectedBy || '-'}</span>
            <span>Ã«ÂÂ±Ã«Â¡ÂÃ¬ÂÂ: {r.createdByName || '-'}</span>
          </div>
          {r.description && (
            <div style={{ fontSize: 13, padding: '10px 12px', background: 'var(--bg)', borderRadius: 8, marginBottom: 14, lineHeight: 1.6 }}>{r.description}</div>
          )}

          {/* Stage 1 Ã¢ÂÂ ÃªÂ²Â©Ã«Â¦Â¬ Ã¬Â¡Â°Ã¬Â¹Â Ã«Â©ÂÃ«ÂÂ´Ã«Â¡Â Ã¬ÂÂ´Ã«ÂÂ */}
          {r.status === 'investigating' && (
            <div style={stageBox('#EAB308')}>
              {stageTitle('#EAB308', 'Ã¢ÂÂ  ÃªÂ²Â©Ã«Â¦Â¬ Ã¬Â¡Â°Ã¬Â¹Â')}
              <p style={{ fontSize: 13, color: 'var(--ink-faint)', margin: '0 0 12px', lineHeight: 1.6 }}>
                ÃªÂ²Â©Ã«Â¦Â¬ Ã¬ÂÂ¬Ã«Â¶Â(ÃªÂ²Â©Ã«Â¦Â¬ Ã¬ÂÂ¤Ã¬ÂÂ / ÃªÂ²Â©Ã«Â¦Â¬ Ã«Â¶ÂÃ­ÂÂÃ¬ÂÂ)Ã«Â¥Â¼ ÃªÂ²Â©Ã«Â¦Â¬ÃªÂ´ÂÃ«Â¦Â¬ Ã«Â©ÂÃ«ÂÂ´Ã¬ÂÂÃ¬ÂÂ ÃªÂ²Â°Ã¬Â ÂÃ­ÂÂ´Ã¬Â£Â¼Ã¬ÂÂ¸Ã¬ÂÂ.
                ÃªÂ²Â°Ã¬Â Â Ã¬ÂÂÃ«Â£Â Ã¬ÂÂ Ã¬ÂÂÃ«ÂÂÃ¬ÂÂ¼Ã«Â¡Â Ã«ÂÂ¤Ã¬ÂÂ Ã«ÂÂ¨ÃªÂ³ÂÃ«Â¡Â Ã¬Â ÂÃ­ÂÂÃ«ÂÂ©Ã«ÂÂÃ«ÂÂ¤.
              </p>
              <Link to={`/containment?ncrId=${r.id}`} style={linkBtn}>ÃªÂ²Â©Ã«Â¦Â¬ÃªÂ´ÂÃ«Â¦Â¬ Ã«Â©ÂÃ«ÂÂ´Ã«Â¡Â Ã¬ÂÂ´Ã«ÂÂ Ã¢ÂÂ</Link>
            </div>
          )}

          {/* Stage 2 Ã¢ÂÂ CAPA Ã­ÂÂÃ¬ÂÂ¸ Ã­ÂÂ Ã¬ÂÂÃ¬Â ÂÃ¬ÂÂÃ«Â£Â */}
          {r.status === 'contained' && (
            <div style={stageBox('#3B82F6')}>
              {stageTitle('#3B82F6', 'Ã¢ÂÂ¡ CAPA Ã¬Â§ÂÃ­ÂÂ Ã­ÂÂÃ¬ÂÂ¸')}
              {r.containmentSkipped
                ? <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 10 }}>ÃªÂ²Â©Ã«Â¦Â¬: Ã«Â¶ÂÃ­ÂÂÃ¬ÂÂ Ã¬Â²ÂÃ«Â¦Â¬Ã«ÂÂ¨ ({r.containmentAt ? r.containmentAt.slice(0,10) : ''})</div>
                : r.containment
                  ? <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 10 }}>ÃªÂ²Â©Ã«Â¦Â¬ Ã¬Â¡Â°Ã¬Â¹Â: {r.containment}</div>
                  : null}
              {linkedCapas.length > 0 ? (
                <div style={{ marginBottom: 10 }}>
                  {linkedCapas.map(c => (
                    <div key={c.id} style={{ fontSize: 13, padding: '6px 10px', background: 'var(--bg)', borderRadius: 6, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                      <span>{c.id} Ã¢ÂÂ {c.title}</span>
                      <span style={{ fontWeight: 600, color: c.status === CAPA_STATUS.CLOSED ? '#22C55E' : '#F97316' }}>{c.status}</span>
                    </div>
                  ))}
                  {!capasDone && (
                    <div style={{ fontSize: 12, color: '#F97316', marginTop: 6 }}>
                      CAPA Ã¬ÂÂÃ«Â£Â Ã­ÂÂ Ã¬ÂÂÃ«ÂÂÃ¬ÂÂ¼Ã«Â¡Â Ã¬ÂÂÃ¬Â ÂÃ¬ÂÂÃ«Â£ÂÃ«Â¡Â Ã¬Â ÂÃ­ÂÂÃ«ÂÂ©Ã«ÂÂÃ«ÂÂ¤.
                      <Link to="/improvement" style={{ marginLeft: 8, color: '#3B82F6', fontWeight: 600 }}>CAPAÃÂ·ÃªÂ°ÂÃ¬ÂÂ  Ã«Â©ÂÃ«ÂÂ´ Ã¢ÂÂ</Link>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 10 }}>Ã¬ÂÂÃ«ÂÂ Ã¬ÂÂÃ¬ÂÂ± CAPA Ã¬ÂÂÃ¬ÂÂ (CriticalÃÂ·Ã«Â°ÂÃ«Â³Âµ Major NCRÃ¬ÂÂ´ Ã¬ÂÂÃ«ÂÂ ÃªÂ²Â½Ã¬ÂÂ° Ã¬Â§ÂÃ¬Â Â Ã¬ÂÂÃ¬Â ÂÃ¬ÂÂÃ«Â£Â ÃªÂ°ÂÃ«ÂÂ¥)</div>
              )}
              <button
                style={btn(capasDone ? '#8B5CF6' : '#CBD5E1', capasDone ? '#fff' : '#94A3B8')}
                onClick={doCorrect}
              >Ã¬ÂÂÃ¬Â ÂÃ¬ÂÂÃ«Â£ÂÃ«Â¡Â Ã¬Â ÂÃ­ÂÂ</button>
            </div>
          )}

          {/* Stage 3 Ã¢ÂÂ Ã¬ÂÂ­Ã­ÂÂ  ÃªÂ¸Â°Ã«Â°Â Ã¬ÂÂ¹Ã¬ÂÂ¸ */}
          {r.status === 'corrected' && (
            <div style={stageBox('#8B5CF6')}>
              {stageTitle('#8B5CF6', 'Ã¢ÂÂ¢ ÃªÂ²ÂÃ­ÂÂ ÃÂ·Ã¬ÂÂ¹Ã¬ÂÂ¸')}
              {isApprover ? (
                <>
                  <div style={{ fontSize: 13, color: 'var(--ink-faint)', marginBottom: 10 }}>
                    Ã¬ÂÂ¹Ã¬ÂÂ¸Ã¬ÂÂ: <strong style={{ color: 'var(--ink)' }}>{curUser?.name}</strong> (Level {curUser?.level})
                  </div>
                  <textarea
                    style={{ ...inp, minHeight: 60, resize: 'vertical', marginBottom: 10 }}
                    placeholder="Ã¬ÂÂ¹Ã¬ÂÂ¸ Ã¬ÂÂÃªÂ²Â¬ (Ã¬ÂÂ Ã­ÂÂ)"
                    value={approveNote}
                    onChange={e => setApproveNote(e.target.value)}
                  />
                  <button style={btn('#22C55E')} onClick={doApprove}>Ã¬ÂÂ¹Ã¬ÂÂ¸Ã­ÂÂÃªÂ³Â  Ã¬Â¢ÂÃªÂ²Â°</button>
                </>
              ) : (
                <div style={{ padding: '12px 14px', background: 'var(--bg)', borderRadius: 8, fontSize: 13 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Ã¬ÂÂ¹Ã¬ÂÂ¸ Ã«ÂÂÃªÂ¸Â° Ã¬Â¤Â</div>
                  <div style={{ color: 'var(--ink-faint)', lineHeight: 1.6 }}>
                    Level 3 Ã¬ÂÂ´Ã¬ÂÂ ÃªÂ´ÂÃ«Â¦Â¬Ã¬ÂÂÃ¬ÂÂ Ã¬ÂÂ¹Ã¬ÂÂ¸Ã¬ÂÂ´ Ã­ÂÂÃ¬ÂÂÃ­ÂÂ©Ã«ÂÂÃ«ÂÂ¤.<br />
                    ÃªÂ´ÂÃ«Â¦Â¬Ã¬ÂÂÃªÂ°Â Ã¬ÂÂ´ NCRÃ¬ÂÂ Ã¬ÂÂ´Ã«Â©Â´ Ã¬ÂÂ¹Ã¬ÂÂ¸ Ã«Â²ÂÃ­ÂÂ¼Ã¬ÂÂ´ Ã­ÂÂÃ¬ÂÂÃ«ÂÂ©Ã«ÂÂÃ«ÂÂ¤.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stage 4 Ã¢ÂÂ Ã¬Â¢ÂÃªÂ²Â° */}
          {r.status === 'closed' && (
            <div style={stageBox('#22C55E')}>
              {stageTitle('#22C55E', 'Ã¢ÂÂ Ã¬Â¢ÂÃªÂ²Â° Ã¬ÂÂÃ«Â£Â')}
              {r.approvals && r.approvals.map(a => (
                <div key={a.role} style={{ fontSize: 13, color: 'var(--ink-faint)', marginBottom: 4 }}>
                  {a.role}: <strong style={{ color: 'var(--ink)' }}>{a.name}</strong>
                  {a.note ? <span> Ã¢ÂÂ {a.note}</span> : null}
                  <span> ({a.signedAt ? a.signedAt.slice(0, 10) : ''})</span>
                </div>
              ))}
              {r.closedAt && <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 6 }}>Ã¬Â¢ÂÃªÂ²Â°Ã¬ÂÂ¼: {r.closedAt.slice(0, 10)}</div>}
            </div>
          )}

          {/* Delete */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <button style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: 12, cursor: 'pointer' }} onClick={onRemove}>Ã¬ÂÂ­Ã¬Â Â</button>
          </div>
        </div>
      )}
    </div>
  )
}


// ââ ì¬ìì(Rework) ê¸°ë¡ í­ âââââââââââââââââââââââââââââââââââââ
const REWORK_KEY = 'qualytree.rework_records'
function ReworkTab({ ncrs = [] }) {
  const [records, setRecords] = React.useState([])
  const [showForm, setShowForm] = React.useState(false)
  const [editId, setEditId] = React.useState(null)
  const EMPTY = { ncrId:'', reworkNo:'', productName:'', lotNo:'', reworkDate:'', operators:'', reworkDesc:'', result:'', inspResult:'í©ê²©', inspBy:'', status:'ìì±ì¤', notes:'' }
  const [form, setForm] = React.useState(EMPTY)

  React.useEffect(()=>{ try { setRecords(JSON.parse(localStorage.getItem(REWORK_KEY)||'[]')) } catch {} },[])
  const persist = list => { try { localStorage.setItem(REWORK_KEY, JSON.stringify(list)) } catch {}; setRecords(list) }
  const setF = (k,v) => setForm(f=>({...f,[k]:v}))
  const save = () => {
    if (!form.reworkNo.trim()) return
    if (editId) persist(records.map(r=>r.id===editId?{...r,...form}:r))
    else persist([...records, {id:Date.now().toString(),...form}])
    setShowForm(false); setEditId(null); setForm(EMPTY)
  }
  const del = id => { if(!window.confirm('ì­ì íìê² ìµëê¹?')) return; persist(records.filter(r=>r.id!==id)) }

  const inp = { width:'100%', padding:'6px 8px', borderRadius:6, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--ink)', fontSize:13 }

  return (
    <div style={{padding:'4px 0'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <span style={{fontSize:13,color:'var(--ink-faint)'}}>{`ì¬ìì ê¸°ë¡ ${records.length}ê±´`}</span>
        <button onClick={()=>{setEditId(null);setForm({...EMPTY,reworkDate:new Date().toISOString().slice(0,10)});setShowForm(true)}} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:8,background:'var(--accent)',color:'#fff',border:'none',cursor:'pointer',fontSize:13,fontWeight:600}}>
          <Wrench size={14}/> ì ê·
        </button>
      </div>

      {showForm && (
        <div style={{background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:12,padding:16,marginBottom:16}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
            <div>
              <div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>ì°ê²° NCR ID</div>
              <select value={form.ncrId} onChange={e=>setF('ncrId',e.target.value)} style={inp}>
                <option value=''>-- ì í --</option>
                {ncrs.map(n=><option key={n.id} value={n.id}>{n.id?.slice(-6)} {n.title}</option>)}
              </select>
            </div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>ì¬ìì ë²í¸</div><input value={form.reworkNo} onChange={e=>setF('reworkNo',e.target.value)} style={inp} placeholder='RW-2026-001'/></div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>ì íëª</div><input value={form.productName} onChange={e=>setF('productName',e.target.value)} style={inp}/></div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>ë¡ë²í¸</div><input value={form.lotNo} onChange={e=>setF('lotNo',e.target.value)} style={inp}/></div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>ì¬ììì¼</div><input type='date' value={form.reworkDate} onChange={e=>setF('reworkDate',e.target.value)} style={inp}/></div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>ììì</div><input value={form.operators} onChange={e=>setF('operators',e.target.value)} style={inp} placeholder='ì±ëª ë³µì ìë ¥'/></div>
            <div style={{gridColumn:'span 2'}}><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>ì¬ìì ë´ì©</div><textarea value={form.reworkDesc} onChange={e=>setF('reworkDesc',e.target.value)} rows={3} style={{...inp,resize:'vertical'}}/></div>
            <div style={{gridColumn:'span 2'}}><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>ì¬ìì ê²°ê³¼</div><textarea value={form.result} onChange={e=>setF('result',e.target.value)} rows={2} style={{...inp,resize:'vertical'}}/></div>
            <div>
              <div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>ê²ì¬ íì </div>
              <select value={form.inspResult} onChange={e=>setF('inspResult',e.target.value)} style={inp}>
                {['í©ê²©','ë¶í©ê²©','ë³´ë¥'].map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>ê²ì¬ì</div><input value={form.inspBy} onChange={e=>setF('inspBy',e.target.value)} style={inp}/></div>
            <div>
              <div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>ìí</div>
              <select value={form.status} onChange={e=>setF('status',e.target.value)} style={inp}>
                {['ìì±ì¤','ìë£','ì¹ì¸'].map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>í¹ì´ì¬í­</div><input value={form.notes} onChange={e=>setF('notes',e.target.value)} style={inp}/></div>
          </div>
          <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
            <button onClick={()=>setShowForm(false)} style={{padding:'6px 14px',borderRadius:8,fontSize:13,background:'var(--surface-2)',border:'1px solid var(--border)',cursor:'pointer'}}>ì·¨ì</button>
            <button onClick={save} style={{padding:'6px 14px',borderRadius:8,fontSize:13,background:'var(--accent)',color:'#fff',border:'none',cursor:'pointer',fontWeight:600}}>ì ì¥</button>
          </div>
        </div>
      )}

      {records.length===0&&!showForm&&(
        <div style={{textAlign:'center',padding:'40px 0',color:'var(--ink-faint)'}}>
          <Wrench size={32} style={{opacity:0.3,marginBottom:8}}/>
          <p style={{fontSize:14}}>ì¬ìì ê¸°ë¡ì´ ììµëë¤</p>
        </div>
      )}

      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {records.map(r=>{
          const statusColor = r.status==='ì¹ì¸'?'#16A34A':r.status==='ìë£'?'#2563EB':'#6B7280'
          const inspColor = r.inspResult==='í©ê²©'?'#16A34A':r.inspResult==='ë¶í©ê²©'?'#DC2626':'#D97706'
          return (
            <div key={r.id} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 14px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                    <span style={{fontSize:14,fontWeight:600}}>{r.reworkNo}</span>
                    <span style={{fontSize:11,padding:'2px 7px',borderRadius:99,background:inspColor+'22',color:inspColor,fontWeight:600}}>{r.inspResult}</span>
                    <span style={{fontSize:11,padding:'2px 7px',borderRadius:99,background:statusColor+'22',color:statusColor,fontWeight:600}}>{r.status}</span>
                  </div>
                  <div style={{fontSize:12,color:'var(--ink-faint)'}}>{r.productName} {r.lotNo&&`Â· ë¡: ${r.lotNo}`} Â· {r.reworkDate} Â· ììì: {r.operators}</div>
                  {r.reworkDesc&&<div style={{fontSize:12,marginTop:4,color:'var(--ink)'}}>{r.reworkDesc.slice(0,80)}{r.reworkDesc.length>80?'â¦':''}</div>}
                </div>
                <div style={{display:'flex',gap:4}}>
                  <button onClick={()=>{setEditId(r.id);setForm({ncrId:r.ncrId,reworkNo:r.reworkNo,productName:r.productName,lotNo:r.lotNo,reworkDate:r.reworkDate,operators:r.operators,reworkDesc:r.reworkDesc,result:r.result,inspResult:r.inspResult,inspBy:r.inspBy,status:r.status,notes:r.notes});setShowForm(true)}} style={{padding:'4px 8px',borderRadius:6,fontSize:12,background:'var(--surface-2)',border:'1px solid var(--border)',cursor:'pointer'}}>í¸ì§</button>
                  <button onClick={()=>del(r.id)} style={{padding:'4px 8px',borderRadius:6,fontSize:12,background:'#FEE2E2',color:'#DC2626',border:'none',cursor:'pointer'}}>ì­ì </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── 특채(Concession) 승인 탭 ──────────────────────────────────
const CONCESSION_KEY = 'qualytree.concession_records'
function ConcessionTab({ ncrs = [] }) {
  const [records, setRecords] = React.useState([])
  const [showForm, setShowForm] = React.useState(false)
  const [editId, setEditId] = React.useState(null)
  const EMPTY = { ncrId:'', concessionNo:'', productName:'', lotNo:'', qty:'', defectDesc:'', justification:'', conditions:'', requestedBy:'', approvedBy:'', approvedDate:'', status:'검토중' }
  const [form, setForm] = React.useState(EMPTY)

  React.useEffect(()=>{ try { setRecords(JSON.parse(localStorage.getItem(CONCESSION_KEY)||'[]')) } catch {} },[])
  const persist = list => { try { localStorage.setItem(CONCESSION_KEY, JSON.stringify(list)) } catch {}; setRecords(list) }
  const setF = (k,v) => setForm(f=>({...f,[k]:v}))
  const save = () => {
    if (!form.concessionNo.trim()) return
    if (editId) persist(records.map(r=>r.id===editId?{...r,...form}:r))
    else persist([...records, {id:Date.now().toString(),...form}])
    setShowForm(false); setEditId(null); setForm(EMPTY)
  }
  const del = id => { if(!window.confirm('삭제?')) return; persist(records.filter(r=>r.id!==id)) }
  const inp = { width:'100%', padding:'6px 8px', borderRadius:6, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--ink)', fontSize:13 }

  const statusColor = s => s==='승인'?'#16A34A':s==='반려'?'#DC2626':'#D97706'

  return (
    <div style={{padding:'4px 0'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <span style={{fontSize:13,color:'var(--ink-faint)'}}>{`특채 기록 ${records.length}건`}</span>
        <button onClick={()=>{setEditId(null);setForm({...EMPTY,approvedDate:new Date().toISOString().slice(0,10)});setShowForm(true)}} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:8,background:'var(--accent)',color:'#fff',border:'none',cursor:'pointer',fontSize:13,fontWeight:600}}>
          <ClipboardCheck size={14}/> 신규
        </button>
      </div>
      {showForm && (
        <div style={{background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:12,padding:16,marginBottom:16}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>연결 NCR ID</div><select value={form.ncrId} onChange={e=>setF('ncrId',e.target.value)} style={inp}><option value=''>-- 선택 --</option>{ncrs.map(n=><option key={n.id} value={n.id}>{n.id?.slice(-6)} {n.title}</option>)}</select></div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>특채 번호</div><input value={form.concessionNo} onChange={e=>setF('concessionNo',e.target.value)} style={inp} placeholder='CON-2026-001'/></div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>제품명</div><input value={form.productName} onChange={e=>setF('productName',e.target.value)} style={inp}/></div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>롯번호 / 수량</div><input value={form.lotNo} onChange={e=>setF('lotNo',e.target.value)} style={{...inp,marginBottom:4}} placeholder='롯번호'/><input value={form.qty} onChange={e=>setF('qty',e.target.value)} style={inp} placeholder='수량(ea)'/></div>
            <div style={{gridColumn:'span 2'}}><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>부적합 내용</div><textarea value={form.defectDesc} onChange={e=>setF('defectDesc',e.target.value)} rows={2} style={{...inp,resize:'vertical'}}/></div>
            <div style={{gridColumn:'span 2'}}><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>특채 타당성 근거</div><textarea value={form.justification} onChange={e=>setF('justification',e.target.value)} rows={3} style={{...inp,resize:'vertical'}}/></div>
            <div style={{gridColumn:'span 2'}}><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>적용 조건 / 제한사항</div><textarea value={form.conditions} onChange={e=>setF('conditions',e.target.value)} rows={2} style={{...inp,resize:'vertical'}}/></div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>요청자</div><input value={form.requestedBy} onChange={e=>setF('requestedBy',e.target.value)} style={inp}/></div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>승인자</div><input value={form.approvedBy} onChange={e=>setF('approvedBy',e.target.value)} style={inp}/></div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>승인일</div><input type='date' value={form.approvedDate} onChange={e=>setF('approvedDate',e.target.value)} style={inp}/></div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>상태</div><select value={form.status} onChange={e=>setF('status',e.target.value)} style={inp}>{['검토중','승인','반려'].map(o=><option key={o}>{o}</option>)}</select></div>
          </div>
          <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
            <button onClick={()=>setShowForm(false)} style={{padding:'6px 14px',borderRadius:8,fontSize:13,background:'var(--surface-2)',border:'1px solid var(--border)',cursor:'pointer'}}>취소</button>
            <button onClick={save} style={{padding:'6px 14px',borderRadius:8,fontSize:13,background:'var(--accent)',color:'#fff',border:'none',cursor:'pointer',fontWeight:600}}>저장</button>
          </div>
        </div>
      )}
      {records.length===0&&!showForm&&(<div style={{textAlign:'center',padding:'40px 0',color:'var(--ink-faint)'}}><ClipboardCheck size={32} style={{opacity:0.3,marginBottom:8}}/><p style={{fontSize:14}}>특채 기록이 없습니다</p></div>)}
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {records.map(r=>(
          <div key={r.id} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 14px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                  <span style={{fontSize:14,fontWeight:600}}>{r.concessionNo}</span>
                  <span style={{fontSize:11,padding:'2px 7px',borderRadius:99,background:statusColor(r.status)+'22',color:statusColor(r.status),fontWeight:600}}>{r.status}</span>
                </div>
                <div style={{fontSize:12,color:'var(--ink-faint)'}}>{r.productName} · {r.approvedDate} · 승인: {r.approvedBy||'미정'}</div>
                {r.justification&&<div style={{fontSize:12,marginTop:4}}>{r.justification.slice(0,80)}{r.justification.length>80?'…':''}</div>}
              </div>
              <div style={{display:'flex',gap:4}}>
                <button onClick={()=>{setEditId(r.id);setForm({ncrId:r.ncrId,concessionNo:r.concessionNo,productName:r.productName,lotNo:r.lotNo,qty:r.qty,defectDesc:r.defectDesc,justification:r.justification,conditions:r.conditions,requestedBy:r.requestedBy,approvedBy:r.approvedBy,approvedDate:r.approvedDate,status:r.status});setShowForm(true)}} style={{padding:'4px 8px',borderRadius:6,fontSize:12,background:'var(--surface-2)',border:'1px solid var(--border)',cursor:'pointer'}}>편집</button>
                <button onClick={()=>del(r.id)} style={{padding:'4px 8px',borderRadius:6,fontSize:12,background:'#FEE2E2',color:'#DC2626',border:'none',cursor:'pointer'}}>삭제</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 불합격품 폐기 기록 탭 ──────────────────────────────────────
const DISPOSAL_KEY = 'qualytree.disposal_records'
function DisposalTab({ ncrs = [] }) {
  const [records, setRecords] = React.useState([])
  const [showForm, setShowForm] = React.useState(false)
  const [editId, setEditId] = React.useState(null)
  const EMPTY = { ncrId:'', disposalNo:'', productName:'', lotNo:'', qty:'', defectReason:'', disposalMethod:'파쇄/분쇄', disposalDate:'', disposedBy:'', witnessedBy:'', status:'예정' }
  const [form, setForm] = React.useState(EMPTY)

  React.useEffect(()=>{ try { setRecords(JSON.parse(localStorage.getItem(DISPOSAL_KEY)||'[]')) } catch {} },[])
  const persist = list => { try { localStorage.setItem(DISPOSAL_KEY, JSON.stringify(list)) } catch {}; setRecords(list) }
  const setF = (k,v) => setForm(f=>({...f,[k]:v}))
  const save = () => {
    if (!form.disposalNo.trim()) return
    if (editId) persist(records.map(r=>r.id===editId?{...r,...form}:r))
    else persist([...records, {id:Date.now().toString(),...form}])
    setShowForm(false); setEditId(null); setForm(EMPTY)
  }
  const del = id => { if(!window.confirm('삭제?')) return; persist(records.filter(r=>r.id!==id)) }
  const inp = { width:'100%', padding:'6px 8px', borderRadius:6, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--ink)', fontSize:13 }
  const statusColor = s => s==='완료'?'#16A34A':s==='진행중'?'#2563EB':'#6B7280'

  return (
    <div style={{padding:'4px 0'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <span style={{fontSize:13,color:'var(--ink-faint)'}}>{`폐기 기록 ${records.length}건`}</span>
        <button onClick={()=>{setEditId(null);setForm({...EMPTY,disposalDate:new Date().toISOString().slice(0,10)});setShowForm(true)}} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:8,background:'#DC2626',color:'#fff',border:'none',cursor:'pointer',fontSize:13,fontWeight:600}}>
          <Trash2 size={14}/> 신규
        </button>
      </div>
      {showForm && (
        <div style={{background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:12,padding:16,marginBottom:16}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>연결 NCR ID</div><select value={form.ncrId} onChange={e=>setF('ncrId',e.target.value)} style={inp}><option value=''>-- 선택 --</option>{ncrs.map(n=><option key={n.id} value={n.id}>{n.id?.slice(-6)} {n.title}</option>)}</select></div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>폐기 번호</div><input value={form.disposalNo} onChange={e=>setF('disposalNo',e.target.value)} style={inp} placeholder='DIS-2026-001'/></div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>제품명</div><input value={form.productName} onChange={e=>setF('productName',e.target.value)} style={inp}/></div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>롯번호 / 수량</div><input value={form.lotNo} onChange={e=>setF('lotNo',e.target.value)} style={{...inp,marginBottom:4}} placeholder='롯번호'/><input value={form.qty} onChange={e=>setF('qty',e.target.value)} style={inp} placeholder='수량(ea)'/></div>
            <div style={{gridColumn:'span 2'}}><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>폐기 사유</div><textarea value={form.defectReason} onChange={e=>setF('defectReason',e.target.value)} rows={2} style={{...inp,resize:'vertical'}}/></div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>폐기 방법</div><select value={form.disposalMethod} onChange={e=>setF('disposalMethod',e.target.value)} style={inp}>{['파쇄/분쇄','소각','매립','전문업체 위탁','기타'].map(o=><option key={o}>{o}</option>)}</select></div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>폐기일</div><input type='date' value={form.disposalDate} onChange={e=>setF('disposalDate',e.target.value)} style={inp}/></div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>처리자</div><input value={form.disposedBy} onChange={e=>setF('disposedBy',e.target.value)} style={inp}/></div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>입회자</div><input value={form.witnessedBy} onChange={e=>setF('witnessedBy',e.target.value)} style={inp}/></div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>상태</div><select value={form.status} onChange={e=>setF('status',e.target.value)} style={inp}>{['예정','진행중','완료'].map(o=><option key={o}>{o}</option>)}</select></div>
          </div>
          <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
            <button onClick={()=>setShowForm(false)} style={{padding:'6px 14px',borderRadius:8,fontSize:13,background:'var(--surface-2)',border:'1px solid var(--border)',cursor:'pointer'}}>취소</button>
            <button onClick={save} style={{padding:'6px 14px',borderRadius:8,fontSize:13,background:'var(--accent)',color:'#fff',border:'none',cursor:'pointer',fontWeight:600}}>저장</button>
          </div>
        </div>
      )}
      {records.length===0&&!showForm&&(<div style={{textAlign:'center',padding:'40px 0',color:'var(--ink-faint)'}}><Trash2 size={32} style={{opacity:0.3,marginBottom:8}}/><p style={{fontSize:14}}>폐기 기록이 없습니다</p></div>)}
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {records.map(r=>(
          <div key={r.id} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 14px',borderLeft:'3px solid #DC2626'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                  <span style={{fontSize:14,fontWeight:600}}>{r.disposalNo}</span>
                  <span style={{fontSize:11,padding:'2px 7px',borderRadius:99,background:statusColor(r.status)+'22',color:statusColor(r.status),fontWeight:600}}>{r.status}</span>
                  <span style={{fontSize:11,color:'var(--ink-faint)'}}>{r.disposalMethod}</span>
                </div>
                <div style={{fontSize:12,color:'var(--ink-faint)'}}>{r.productName} {r.lotNo&&`· 롯: ${r.lotNo}`} · {r.disposalDate} · {r.disposedBy}</div>
              </div>
              <div style={{display:'flex',gap:4}}>
                <button onClick={()=>{setEditId(r.id);setForm({ncrId:r.ncrId,disposalNo:r.disposalNo,productName:r.productName,lotNo:r.lotNo,qty:r.qty,defectReason:r.defectReason,disposalMethod:r.disposalMethod,disposalDate:r.disposalDate,disposedBy:r.disposedBy,witnessedBy:r.witnessedBy,status:r.status});setShowForm(true)}} style={{padding:'4px 8px',borderRadius:6,fontSize:12,background:'var(--surface-2)',border:'1px solid var(--border)',cursor:'pointer'}}>편집</button>
                <button onClick={()=>del(r.id)} style={{padding:'4px 8px',borderRadius:6,fontSize:12,background:'#FEE2E2',color:'#DC2626',border:'none',cursor:'pointer'}}>삭제</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}