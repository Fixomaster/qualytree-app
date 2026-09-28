// src/pages/quality/QualityHub.jsx â ISO 13485 Â§8.3 NCRÂ·ë¶ì í© ê´ë¦¬
import React, { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert, Plus, Search, X, ChevronDown, ChevronUp, Wrench, ClipboardCheck, Trash2 } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { evaluateForCAPA, capa, CAPA_STATUS } from '../../lib/capaState'
import { auth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'

const LS_KEY = 'qualytree.ncrs'
const CNT_KEY = 'qualytree.ncrCounter'
let _sbCidQual = null

function lsRead() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] } }
function lsWrite(arr) {
  localStorage.setItem(LS_KEY, JSON.stringify(arr))
  if (_sbCidQual) {
    supabase.from('company_data').upsert({
      company_id: _sbCidQual, data_type: 'localStorage_sync', data_key: LS_KEY, payload: arr,
    }, { onConflict: 'company_id,data_type,data_key' }).catch(console.error)
  }
}
function nextId() {
  const n = parseInt(localStorage.getItem(CNT_KEY) || '0', 10) + 1
  localStorage.setItem(CNT_KEY, String(n))
  if (_sbCidQual) {
    supabase.from('company_data').upsert({
      company_id: _sbCidQual, data_type: 'localStorage_sync', data_key: CNT_KEY, payload: n,
    }, { onConflict: 'company_id,data_type,data_key' }).catch(console.error)
  }
  return 'NCR-' + new Date().getFullYear() + '-' + String(n).padStart(4, '0')
}

function getLinkedCapas(ncrId) {
  try {
    const all = JSON.parse(localStorage.getItem('qualytree.capas') || '[]')
    return all.filter(c => Array.isArray(c.sourceNcrIds) && c.sourceNcrIds.includes(ncrId))
  } catch { return [] }
}

const STATUS_LABEL = { open: 'ì ì', investigating: 'ì¡°ì¬ì¤', contained: 'ê²©ë¦¬ìë£', corrected: 'ìì ìë£', closed: 'ì¢ê²°' }
const STATUS_COLOR = { open: '#DC2626', investigating: '#EAB308', contained: '#3B82F6', corrected: '#8B5CF6', closed: '#22C55E' }
const SOURCE_TYPE_LABEL = { oos: 'ê³µì ê²ì¬ OOS (ìë ë°ì)', inspectionStage: 'ê²ì¬ ë¨ê³ OOS (ìë ë°ì)', iqc: 'ììê²ì¬', manual: 'ìë ë±ë¡' }
// ncr.raise()ë sourceë¥¼ ê°ì²´({ type, woId, stageEid, templateId })ë¡ ì ì¥íë¯ë¡ ë¬¸ìì´ë¡ ìì½
function sourceText(src) {
  if (src == null || src === '') return '-'
  if (typeof src === 'string') return src
  if (typeof src !== 'object') return String(src)
  const parts = [src.label || SOURCE_TYPE_LABEL[src.type] || src.type || '']
  if (src.woId) parts.push(`WO ${src.woId}`)
  if (src.stageType) parts.push(String(src.stageType))
  if (src.stageEid) parts.push(String(src.stageEid).split(':').pop())
  if (src.measurementValue !== undefined && src.measurementValue !== '') parts.push(`ì¸¡ì ê° ${src.measurementValue}`)
  return parts.filter(Boolean).join(' Â· ') || '-'
}
// ncr.transition()ì containmentë¥¼ ê°ì²´({ quarantineId, quarantineCount, isolatedAt, isolatedBy })ë¡ ì ì¥
function containmentText(c) {
  if (c == null || c === '') return ''
  if (typeof c === 'string') return c
  if (typeof c !== 'object') return String(c)
  const parts = []
  if (c.description || c.note) parts.push(c.description || c.note)
  if (c.quarantineCount != null) parts.push(`ê²©ë¦¬ ${c.quarantineCount}ê±´`)
  if (c.quarantineId) parts.push(`ê²©ë¦¬ ID ${c.quarantineId}`)
  if (c.isolatedBy) parts.push(`ê²©ë¦¬ì ${c.isolatedBy}`)
  if (c.isolatedAt) parts.push(String(c.isolatedAt).slice(0, 10))
  return parts.join(' Â· ') || 'ê²©ë¦¬ ì¡°ì¹ ìë£'
}
const SEV_COLOR = { Critical: '#DC2626', Major: '#F97316', Minor: '#64748B' }
const SEVERITIES = ['Critical', 'Major', 'Minor']
const SOURCES = ['ë´ë¶ê²ì¬', 'ê³ ê°ë¶ë§', 'ê³µê¸ìì²´', 'ê³µì ', 'ê¸°í']

export default function QualityHub() {
  const [ncrs, setNcrs] = useState(lsRead)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [form, setForm] = useState({ title: '', severity: 'Major', source: 'ë´ë¶ê²ì¬', description: '', detectedAt: '', detectedBy: '' })

  const [qTab, setQTab] = useState('ncr')
  function reload() { setNcrs(lsRead()) }
  const user = auth.current()
  const companyId = user?.company?.id ?? null
  useEffect(() => { _sbCidQual = companyId }, [companyId])
  useEffect(() => {
    if (!companyId) return
    Promise.all([
      supabase.from('company_data').select('payload')
        .eq('company_id', companyId).eq('data_type', 'localStorage_sync').eq('data_key', LS_KEY)
        .maybeSingle(),
      supabase.from('company_data').select('payload')
        .eq('company_id', companyId).eq('data_type', 'localStorage_sync').eq('data_key', CNT_KEY)
        .maybeSingle(),
    ]).then(([{ data: ncrRow }, { data: cntRow }]) => {
      if (ncrRow?.payload != null) {
        localStorage.setItem(LS_KEY, JSON.stringify(ncrRow.payload))
        setNcrs(ncrRow.payload)
      }
      if (cntRow?.payload != null) {
        localStorage.setItem(CNT_KEY, String(cntRow.payload))
      }
    })
  }, [companyId])


  function save() {
    if (!form.title.trim()) return alert('ì ëª©ì ìë ¥íì¸ì')
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
    if (!confirm('ì­ì íìê² ìµëê¹?')) return
    lsWrite(lsRead().filter(r => r.id !== id))
    reload()
  }

  const filtered = useMemo(() =>
    ncrs.filter(r => r.title.toLowerCase().includes(search.toLowerCase()) || r.id.includes(search)),
    [ncrs, search])

  const stats = useMemo(() => ({
    total: ncrs.length,
    investigating: ncrs.filter(r => r.status === 'investigating' || r.status === 'open').length,
    contained: ncrs.filter(r => r.status === 'contained').length,
    corrected: ncrs.filter(r => r.status === 'corrected').length,
    closed: ncrs.filter(r => r.status === 'closed').length,
  }), [ncrs])

  const statCard = { background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }
  const btn = (bg, fg = '#fff') => ({ background: bg, color: fg, border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 })
  const inp = { width: '100%', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8, background: 'var(--bg-card)', color: 'var(--ink)', fontSize: 14, boxSizing: 'border-box' }

  return (
    <AppLayout>
      <HubBanner icon={ShieldAlert} title="NCRÂ·ë¶ì í© ê´ë¦¬" subtitle="ISO 13485 Â§8.3" color="#DC2626" />

      {/* Tab Nav #181 */}
      <div style={{display:'flex',gap:8,marginBottom:16}}>
        {['ncr','rework','concession','disposal'].map(k=>(
          <button key={k} onClick={()=>setQTab(k)} style={{padding:'6px 14px',borderRadius:8,fontSize:13,fontWeight:qTab===k?600:400,background:qTab===k?'var(--accent)':'var(--surface-2)',color:qTab===k?'#fff':'var(--ink)',border:'1px solid var(--border)',cursor:'pointer'}}>
            {{ncr:'NCR ëª©ë¡',rework:'ì¬ìì ê¸°ë¡',concession:'í¹ì± ì¹ì¸',disposal:'íê¸° ê¸°ë¡'}[k]||k}
          </button>
        ))}
      </div>
      {qTab === 'ncr' && (<>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 20 }}>
        {[['ì ì²´', stats.total, 'var(--ink)'], ['ì¡°ì¬ì¤', stats.investigating, '#EAB308'], ['ê²©ë¦¬ìë£', stats.contained, '#3B82F6'], ['ìì ìë£', stats.corrected, '#8B5CF6'], ['ì¢ê²°', stats.closed, '#22C55E']].map(([label, n, color]) => (
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
          <input style={{ ...inp, paddingLeft: 30 }} placeholder="NCR ID ëë ì ëª© ê²ì" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button style={btn('#DC2626')} onClick={() => { setForm({ title: '', severity: 'Major', source: 'ë´ë¶ê²ì¬', description: '', detectedAt: '', detectedBy: '' }); setModal(true) }}>
          <Plus size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />ë¶ì í© ë±ë¡
        </button>
      </div>

      {/* List */}
      {filtered.length === 0 && <div style={{ textAlign: 'center', color: 'var(--ink-faint)', padding: 40 }}>ë±ë¡ë ë¶ì í©ì´ ììµëë¤</div>}
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
              <h3 style={{ margin: 0, fontSize: 16 }}>ë¶ì í© ì ê· ë±ë¡</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setModal(false)}><X size={18} /></button>
            </div>
            {[
              ['ì ëª©', <input style={inp} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="ë¶ì í© ë´ì© ìì½" />],
              ['ì¬ê°ë', <select style={inp} value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>{SEVERITIES.map(s => <option key={s}>{s}</option>)}</select>],
              ['ë°ìì¶ì²', <select style={inp} value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>{SOURCES.map(s => <option key={s}>{s}</option>)}</select>],
              ['ë°ê²¬ì¼', <input type="date" style={inp} value={form.detectedAt} onChange={e => setForm(f => ({ ...f, detectedAt: e.target.value }))} />],
              ['ë°ê²¬ì', <input style={inp} value={form.detectedBy} onChange={e => setForm(f => ({ ...f, detectedBy: e.target.value }))} />],
              ['ìì¸ë´ì©', <textarea style={{ ...inp, minHeight: 80, resize: 'vertical' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />],
            ].map(([label, el]) => (
              <div key={label} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: 'var(--ink-faint)', display: 'block', marginBottom: 4 }}>{label}</label>
                {el}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button style={btn('transparent', 'var(--ink)')} onClick={() => setModal(false)}>ì·¨ì</button>
              <button style={btn('#DC2626')} onClick={save}>ë±ë¡</button>
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
    if (!capasDone) return alert('ì°ê²°ë CAPAê° ìì§ ìë£ëì§ ìììµëë¤. CAPAÂ·ê°ì  ë©ë´ìì CAPAë¥¼ ì¢ê²°íì¸ì.')
    onUpdate({ status: 'corrected', correctedAt: new Date().toISOString() })
  }

  function doApprove() {
    onUpdate({
      status: 'closed',
      closedAt: new Date().toISOString(),
      approvals: [{
        role: 'ì¹ì¸ì',
        name: curUser?.name || 'ë¯¸íì¸',
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
        <span style={{ fontSize: 11, fontWeight: 600, color: STATUS_COLOR[r.status] || '#64748B', background: (STATUS_COLOR[r.status] || '#64748B') + '22', padding: '2px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>{STATUS_LABEL[r.status] || r.status || '-'}</span>
        {expanded ? <ChevronUp size={16} color="var(--ink-faint)" /> : <ChevronDown size={16} color="var(--ink-faint)" />}
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--line)', padding: 16 }}>
          {/* Meta */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14, fontSize: 13, color: 'var(--ink-faint)' }}>
            <span>ì¶ì²: {sourceText(r.source)}</span>
            <span>ë°ê²¬ì¼: {r.detectedAt || '-'}</span>
            <span>ë°ê²¬ì: {r.detectedBy || '-'}</span>
            <span>ë±ë¡ì: {r.createdByName || '-'}</span>
          </div>
          {r.description && (
            <div style={{ fontSize: 13, padding: '10px 12px', background: 'var(--bg)', borderRadius: 8, marginBottom: 14, lineHeight: 1.6 }}>{r.description}</div>
          )}

          {/* Stage 1 â ê²©ë¦¬ ì¡°ì¹ ë©ë´ë¡ ì´ë (open = ì ì ì§í, investigating = ì¡°ì¬ ì¤) */}
          {(r.status === 'open' || r.status === 'investigating') && (
            <div style={stageBox('#EAB308')}>
              {stageTitle('#EAB308', 'â  ê²©ë¦¬ ì¡°ì¹')}
              <p style={{ fontSize: 13, color: 'var(--ink-faint)', margin: '0 0 12px', lineHeight: 1.6 }}>
                ê²©ë¦¬ ì¬ë¶(ê²©ë¦¬ ì¤ì / ê²©ë¦¬ ë¶íì)ë¥¼ ê²©ë¦¬ê´ë¦¬ ë©ë´ìì ê²°ì í´ì£¼ì¸ì.
                ê²°ì  ìë£ ì ìëì¼ë¡ ë¤ì ë¨ê³ë¡ ì íë©ëë¤.
              </p>
              <Link to={`/containment?ncrId=${r.id}`} style={linkBtn}>ê²©ë¦¬ê´ë¦¬ ë©ë´ë¡ ì´ë â</Link>
            </div>
          )}

          {/* Stage 2 â CAPA íì¸ í ìì ìë£ */}
          {r.status === 'contained' && (
            <div style={stageBox('#3B82F6')}>
              {stageTitle('#3B82F6', 'â¡ CAPA ì§í íì¸')}
              {r.containmentSkipped
                ? <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 10 }}>ê²©ë¦¬: ë¶íì ì²ë¦¬ë¨ ({r.containmentAt ? r.containmentAt.slice(0,10) : ''})</div>
                : r.containment
                  ? <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 10 }}>ê²©ë¦¬ ì¡°ì¹: {containmentText(r.containment)}</div>
                  : null}
              {linkedCapas.length > 0 ? (
                <div style={{ marginBottom: 10 }}>
                  {linkedCapas.map(c => (
                    <div key={c.id} style={{ fontSize: 13, padding: '6px 10px', background: 'var(--bg)', borderRadius: 6, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                      <span>{c.id} â {c.title}</span>
                      <span style={{ fontWeight: 600, color: c.status === CAPA_STATUS.CLOSED ? '#22C55E' : '#F97316' }}>{c.status}</span>
                    </div>
                  ))}
                  {!capasDone && (
                    <div style={{ fontSize: 12, color: '#F97316', marginTop: 6 }}>
                      CAPA ìë£ í ìëì¼ë¡ ìì ìë£ë¡ ì íë©ëë¤.
                      <Link to="/improvement" style={{ marginLeft: 8, color: '#3B82F6', fontWeight: 600 }}>CAPAÂ·ê°ì  ë©ë´ â</Link>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 10 }}>ìë ìì± CAPA ìì (CriticalÂ·ë°ë³µ Major NCRì´ ìë ê²½ì° ì§ì  ìì ìë£ ê°ë¥)</div>
              )}
              <button
                style={btn(capasDone ? '#8B5CF6' : '#CBD5E1', capasDone ? '#fff' : '#94A3B8')}
                onClick={doCorrect}
              >ìì ìë£ë¡ ì í</button>
            </div>
          )}

          {/* Stage 3 â ì­í  ê¸°ë° ì¹ì¸ */}
          {r.status === 'corrected' && (
            <div style={stageBox('#8B5CF6')}>
              {stageTitle('#8B5CF6', 'â¢ ê²í Â·ì¹ì¸')}
              {isApprover ? (
                <>
                  <div style={{ fontSize: 13, color: 'var(--ink-faint)', marginBottom: 10 }}>
                    ì¹ì¸ì: <strong style={{ color: 'var(--ink)' }}>{curUser?.name}</strong> (Level {curUser?.level})
                  </div>
                  <textarea
                    style={{ ...inp, minHeight: 60, resize: 'vertical', marginBottom: 10 }}
                    placeholder="ì¹ì¸ ìê²¬ (ì í)"
                    value={approveNote}
                    onChange={e => setApproveNote(e.target.value)}
                  />
                  <button style={btn('#22C55E')} onClick={doApprove}>ì¹ì¸íê³  ì¢ê²°</button>
                </>
              ) : (
                <div style={{ padding: '12px 14px', background: 'var(--bg)', borderRadius: 8, fontSize: 13 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>ì¹ì¸ ëê¸° ì¤</div>
                  <div style={{ color: 'var(--ink-faint)', lineHeight: 1.6 }}>
                    Level 3 ì´ì ê´ë¦¬ìì ì¹ì¸ì´ íìí©ëë¤.<br />
                    ê´ë¦¬ìê° ì´ NCRì ì´ë©´ ì¹ì¸ ë²í¼ì´ íìë©ëë¤.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stage 4 â ì¢ê²° */}
          {r.status === 'closed' && (
            <div style={stageBox('#22C55E')}>
              {stageTitle('#22C55E', 'â ì¢ê²° ìë£')}
              {r.approvals && r.approvals.map(a => (
                <div key={a.role} style={{ fontSize: 13, color: 'var(--ink-faint)', marginBottom: 4 }}>
                  {a.role}: <strong style={{ color: 'var(--ink)' }}>{a.name}</strong>
                  {a.note ? <span> â {a.note}</span> : null}
                  <span> ({a.signedAt ? a.signedAt.slice(0, 10) : ''})</span>
                </div>
              ))}
              {r.closedAt && <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 6 }}>ì¢ê²°ì¼: {r.closedAt.slice(0, 10)}</div>}
            </div>
          )}

          {/* Delete */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <button style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: 12, cursor: 'pointer' }} onClick={onRemove}>ì­ì </button>
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

// ââ í¹ì±(Concession) ì¹ì¸ í­ ââââââââââââââââââââââââââââââââââ
const CONCESSION_KEY = 'qualytree.concession_records'
function ConcessionTab({ ncrs = [] }) {
  const [records, setRecords] = React.useState([])
  const [showForm, setShowForm] = React.useState(false)
  const [editId, setEditId] = React.useState(null)
  const EMPTY = { ncrId:'', concessionNo:'', productName:'', lotNo:'', qty:'', defectDesc:'', justification:'', conditions:'', requestedBy:'', approvedBy:'', approvedDate:'', status:'ê²í ì¤' }
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
  const del = id => { if(!window.confirm('ì­ì ?')) return; persist(records.filter(r=>r.id!==id)) }
  const inp = { width:'100%', padding:'6px 8px', borderRadius:6, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--ink)', fontSize:13 }

  const statusColor = s => s==='ì¹ì¸'?'#16A34A':s==='ë°ë ¤'?'#DC2626':'#D97706'

  return (
    <div style={{padding:'4px 0'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <span style={{fontSize:13,color:'var(--ink-faint)'}}>{`í¹ì± ê¸°ë¡ ${records.length}ê±´`}</span>
        <button onClick={()=>{setEditId(null);setForm({...EMPTY,approvedDate:new Date().toISOString().slice(0,10)});setShowForm(true)}} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:8,background:'var(--accent)',color:'#fff',border:'none',cursor:'pointer',fontSize:13,fontWeight:600}}>
          <ClipboardCheck size={14}/> ì ê·
        </button>
      </div>
      {showForm && (
        <div style={{background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:12,padding:16,marginBottom:16}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>ì°ê²° NCR ID</div><select value={form.ncrId} onChange={e=>setF('ncrId',e.target.value)} style={inp}><option value=''>-- ì í --</option>{ncrs.map(n=><option key={n.id} value={n.id}>{n.id?.slice(-6)} {n.title}</option>)}</select></div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>í¹ì± ë²í¸</div><input value={form.concessionNo} onChange={e=>setF('concessionNo',e.target.value)} style={inp} placeholder='CON-2026-001'/></div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>ì íëª</div><input value={form.productName} onChange={e=>setF('productName',e.target.value)} style={inp}/></div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>ë¡¯ë²í¸ / ìë</div><input value={form.lotNo} onChange={e=>setF('lotNo',e.target.value)} style={{...inp,marginBottom:4}} placeholder='ë¡¯ë²í¸'/><input value={form.qty} onChange={e=>setF('qty',e.target.value)} style={inp} placeholder='ìë(ea)'/></div>
            <div style={{gridColumn:'span 2'}}><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>ë¶ì í© ë´ì©</div><textarea value={form.defectDesc} onChange={e=>setF('defectDesc',e.target.value)} rows={2} style={{...inp,resize:'vertical'}}/></div>
            <div style={{gridColumn:'span 2'}}><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>í¹ì± íë¹ì± ê·¼ê±°</div><textarea value={form.justification} onChange={e=>setF('justification',e.target.value)} rows={3} style={{...inp,resize:'vertical'}}/></div>
            <div style={{gridColumn:'span 2'}}><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>ì ì© ì¡°ê±´ / ì íì¬í­</div><textarea value={form.conditions} onChange={e=>setF('conditions',e.target.value)} rows={2} style={{...inp,resize:'vertical'}}/></div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>ìì²­ì</div><input value={form.requestedBy} onChange={e=>setF('requestedBy',e.target.value)} style={inp}/></div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>ì¹ì¸ì</div><input value={form.approvedBy} onChange={e=>setF('approvedBy',e.target.value)} style={inp}/></div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>ì¹ì¸ì¼</div><input type='date' value={form.approvedDate} onChange={e=>setF('approvedDate',e.target.value)} style={inp}/></div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>ìí</div><select value={form.status} onChange={e=>setF('status',e.target.value)} style={inp}>{['ê²í ì¤','ì¹ì¸','ë°ë ¤'].map(o=><option key={o}>{o}</option>)}</select></div>
          </div>
          <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
            <button onClick={()=>setShowForm(false)} style={{padding:'6px 14px',borderRadius:8,fontSize:13,background:'var(--surface-2)',border:'1px solid var(--border)',cursor:'pointer'}}>ì·¨ì</button>
            <button onClick={save} style={{padding:'6px 14px',borderRadius:8,fontSize:13,background:'var(--accent)',color:'#fff',border:'none',cursor:'pointer',fontWeight:600}}>ì ì¥</button>
          </div>
        </div>
      )}
      {records.length===0&&!showForm&&(<div style={{textAlign:'center',padding:'40px 0',color:'var(--ink-faint)'}}><ClipboardCheck size={32} style={{opacity:0.3,marginBottom:8}}/><p style={{fontSize:14}}>í¹ì± ê¸°ë¡ì´ ììµëë¤</p></div>)}
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {records.map(r=>(
          <div key={r.id} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 14px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                  <span style={{fontSize:14,fontWeight:600}}>{r.concessionNo}</span>
                  <span style={{fontSize:11,padding:'2px 7px',borderRadius:99,background:statusColor(r.status)+'22',color:statusColor(r.status),fontWeight:600}}>{r.status}</span>
                </div>
                <div style={{fontSize:12,color:'var(--ink-faint)'}}>{r.productName} Â· {r.approvedDate} Â· ì¹ì¸: {r.approvedBy||'ë¯¸ì '}</div>
                {r.justification&&<div style={{fontSize:12,marginTop:4}}>{r.justification.slice(0,80)}{r.justification.length>80?'â¦':''}</div>}
              </div>
              <div style={{display:'flex',gap:4}}>
                <button onClick={()=>{setEditId(r.id);setForm({ncrId:r.ncrId,concessionNo:r.concessionNo,productName:r.productName,lotNo:r.lotNo,qty:r.qty,defectDesc:r.defectDesc,justification:r.justification,conditions:r.conditions,requestedBy:r.requestedBy,approvedBy:r.approvedBy,approvedDate:r.approvedDate,status:r.status});setShowForm(true)}} style={{padding:'4px 8px',borderRadius:6,fontSize:12,background:'var(--surface-2)',border:'1px solid var(--border)',cursor:'pointer'}}>í¸ì§</button>
                <button onClick={()=>del(r.id)} style={{padding:'4px 8px',borderRadius:6,fontSize:12,background:'#FEE2E2',color:'#DC2626',border:'none',cursor:'pointer'}}>ì­ì </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ââ ë¶í©ê²©í íê¸° ê¸°ë¡ í­ ââââââââââââââââââââââââââââââââââââââ
const DISPOSAL_KEY = 'qualytree.disposal_records'
function DisposalTab({ ncrs = [] }) {
  const [records, setRecords] = React.useState([])
  const [showForm, setShowForm] = React.useState(false)
  const [editId, setEditId] = React.useState(null)
  const EMPTY = { ncrId:'', disposalNo:'', productName:'', lotNo:'', qty:'', defectReason:'', disposalMethod:'íì/ë¶ì', disposalDate:'', disposedBy:'', witnessedBy:'', status:'ìì ' }
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
  const del = id => { if(!window.confirm('ì­ì ?')) return; persist(records.filter(r=>r.id!==id)) }
  const inp = { width:'100%', padding:'6px 8px', borderRadius:6, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--ink)', fontSize:13 }
  const statusColor = s => s==='ìë£'?'#16A34A':s==='ì§íì¤'?'#2563EB':'#6B7280'

  return (
    <div style={{padding:'4px 0'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <span style={{fontSize:13,color:'var(--ink-faint)'}}>{`íê¸° ê¸°ë¡ ${records.length}ê±´`}</span>
        <button onClick={()=>{setEditId(null);setForm({...EMPTY,disposalDate:new Date().toISOString().slice(0,10)});setShowForm(true)}} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:8,background:'#DC2626',color:'#fff',border:'none',cursor:'pointer',fontSize:13,fontWeight:600}}>
          <Trash2 size={14}/> ì ê·
        </button>
      </div>
      {showForm && (
        <div style={{background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:12,padding:16,marginBottom:16}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>ì°ê²° NCR ID</div><select value={form.ncrId} onChange={e=>setF('ncrId',e.target.value)} style={inp}><option value=''>-- ì í --</option>{ncrs.map(n=><option key={n.id} value={n.id}>{n.id?.slice(-6)} {n.title}</option>)}</select></div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>íê¸° ë²í¸</div><input value={form.disposalNo} onChange={e=>setF('disposalNo',e.target.value)} style={inp} placeholder='DIS-2026-001'/></div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>ì íëª</div><input value={form.productName} onChange={e=>setF('productName',e.target.value)} style={inp}/></div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>ë¡¯ë²í¸ / ìë</div><input value={form.lotNo} onChange={e=>setF('lotNo',e.target.value)} style={{...inp,marginBottom:4}} placeholder='ë¡¯ë²í¸'/><input value={form.qty} onChange={e=>setF('qty',e.target.value)} style={inp} placeholder='ìë(ea)'/></div>
            <div style={{gridColumn:'span 2'}}><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>íê¸° ì¬ì </div><textarea value={form.defectReason} onChange={e=>setF('defectReason',e.target.value)} rows={2} style={{...inp,resize:'vertical'}}/></div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>íê¸° ë°©ë²</div><select value={form.disposalMethod} onChange={e=>setF('disposalMethod',e.target.value)} style={inp}>{['íì/ë¶ì','ìê°','ë§¤ë¦½','ì ë¬¸ìì²´ ìí','ê¸°í'].map(o=><option key={o}>{o}</option>)}</select></div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>íê¸°ì¼</div><input type='date' value={form.disposalDate} onChange={e=>setF('disposalDate',e.target.value)} style={inp}/></div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>ì²ë¦¬ì</div><input value={form.disposedBy} onChange={e=>setF('disposedBy',e.target.value)} style={inp}/></div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>ìíì</div><input value={form.witnessedBy} onChange={e=>setF('witnessedBy',e.target.value)} style={inp}/></div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>ìí</div><select value={form.status} onChange={e=>setF('status',e.target.value)} style={inp}>{['ìì ','ì§íì¤','ìë£'].map(o=><option key={o}>{o}</option>)}</select></div>
          </div>
          <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
            <button onClick={()=>setShowForm(false)} style={{padding:'6px 14px',borderRadius:8,fontSize:13,background:'var(--surface-2)',border:'1px solid var(--border)',cursor:'pointer'}}>ì·¨ì</button>
            <button onClick={save} style={{padding:'6px 14px',borderRadius:8,fontSize:13,background:'var(--accent)',color:'#fff',border:'none',cursor:'pointer',fontWeight:600}}>ì ì¥</button>
          </div>
        </div>
      )}
      {records.length===0&&!showForm&&(<div style={{textAlign:'center',padding:'40px 0',color:'var(--ink-faint)'}}><Trash2 size={32} style={{opacity:0.3,marginBottom:8}}/><p style={{fontSize:14}}>íê¸° ê¸°ë¡ì´ ììµëë¤</p></div>)}
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
                <div style={{fontSize:12,color:'var(--ink-faint)'}}>{r.productName} {r.lotNo&&`Â· ë¡¯: ${r.lotNo}`} Â· {r.disposalDate} Â· {r.disposedBy}</div>
              </div>
              <div style={{display:'flex',gap:4}}>
                <button onClick={()=>{setEditId(r.id);setForm({ncrId:r.ncrId,disposalNo:r.disposalNo,productName:r.productName,lotNo:r.lotNo,qty:r.qty,defectReason:r.defectReason,disposalMethod:r.disposalMethod,disposalDate:r.disposalDate,disposedBy:r.disposedBy,witnessedBy:r.witnessedBy,status:r.status});setShowForm(true)}} style={{padding:'4px 8px',borderRadius:6,fontSize:12,background:'var(--surface-2)',border:'1px solid var(--border)',cursor:'pointer'}}>í¸ì§</button>
                <button onClick={()=>del(r.id)} style={{padding:'4px 8px',borderRadius:6,fontSize:12,background:'#FEE2E2',color:'#DC2626',border:'none',cursor:'pointer'}}>ì­ì </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}