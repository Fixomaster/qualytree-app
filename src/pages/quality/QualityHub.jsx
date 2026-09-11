// src/pages/quality/QualityHub.jsx â ISO 13485 Â§8.3 NCRÂ·ë¶ì í© ê´ë¦¬
import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert, Plus, Search, X, ChevronDown, ChevronUp, Wrench } from 'lucide-react'
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

const STATUS_LABEL = { investigating: 'ì¡°ì¬ì¤', contained: 'ê²©ë¦¬ìë£', corrected: 'ìì ìë£', closed: 'ì¢ê²°' }
const STATUS_COLOR = { investigating: '#EAB308', contained: '#3B82F6', corrected: '#8B5CF6', closed: '#22C55E' }
const SEV_COLOR = { Critical: '#DC2626', Major: '#F97316', Minor: '#64748B' }
const SEVERITIES = ['Critical', 'Major', 'Minor']
const SOURCES = ['ë´ë¶ê²ì¬', 'ê³ ê°ë¶ë§', 'ê³µê¸ìì²´', 'ê³µì ', 'ê¸°í']

export default function QualityHub() {
  const [ncrs, setNcrs] = useState(lsRead)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [form, setForm] = useState({ title: '', severity: 'Major', source: 'ë´ë¶ê²ì¬', description: '', detectedAt: '', detectedBy: '' })

  function reload() { setNcrs(lsRead()) }

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
      <HubBanner icon={ShieldAlert} title="NCRÂ·ë¶ì í© ê´ë¦¬" subtitle="ISO 13485 Â§8.3" color="#DC2626" />

      {/* Tab Nav #181 */}
      <div style={{display:'flex',gap:8,marginBottom:16}}>
        {['ncr','rework'].map(k=>(
          <button key={k} onClick={()=>setQTab(k)} style={{padding:'6px 14px',borderRadius:8,fontSize:13,fontWeight:qTab===k?600:400,background:qTab===k?'var(--accent)':'var(--surface-2)',color:qTab===k?'#fff':'var(--ink)',border:'1px solid var(--border)',cursor:'pointer'}}>
            {k==='ncr'?'NCR 목록':'재작업 기록'}
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
        <span style={{ fontSize: 11, fontWeight: 600, color: STATUS_COLOR[r.status], background: STATUS_COLOR[r.status] + '22', padding: '2px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>{STATUS_LABEL[r.status]}</span>
        {expanded ? <ChevronUp size={16} color="var(--ink-faint)" /> : <ChevronDown size={16} color="var(--ink-faint)" />}
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--line)', padding: 16 }}>
          {/* Meta */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14, fontSize: 13, color: 'var(--ink-faint)' }}>
            <span>ì¶ì²: {r.source}</span>
            <span>ë°ê²¬ì¼: {r.detectedAt || '-'}</span>
            <span>ë°ê²¬ì: {r.detectedBy || '-'}</span>
            <span>ë±ë¡ì: {r.createdByName || '-'}</span>
          </div>
          {r.description && (
            <div style={{ fontSize: 13, padding: '10px 12px', background: 'var(--bg)', borderRadius: 8, marginBottom: 14, lineHeight: 1.6 }}>{r.description}</div>
          )}

          {/* Stage 1 â ê²©ë¦¬ ì¡°ì¹ ë©ë´ë¡ ì´ë */}
          {r.status === 'investigating' && (
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
                  ? <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 10 }}>ê²©ë¦¬ ì¡°ì¹: {r.containment}</div>
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


// ── 재작업(Rework) 기록 탭 ─────────────────────────────────────
const REWORK_KEY = 'qualytree.rework_records'
function ReworkTab({ ncrs = [] }) {
  const [records, setRecords] = React.useState([])
  const [showForm, setShowForm] = React.useState(false)
  const [editId, setEditId] = React.useState(null)
  const EMPTY = { ncrId:'', reworkNo:'', productName:'', lotNo:'', reworkDate:'', operators:'', reworkDesc:'', result:'', inspResult:'합격', inspBy:'', status:'작성중', notes:'' }
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
  const del = id => { if(!window.confirm('삭제하시겠습니깊?')) return; persist(records.filter(r=>r.id!==id)) }

  const inp = { width:'100%', padding:'6px 8px', borderRadius:6, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--ink)', fontSize:13 }

  return (
    <div style={{padding:'4px 0'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <span style={{fontSize:13,color:'var(--ink-faint)'}}>{`재작업 기록 ${records.length}건`}</span>
        <button onClick={()=>{setEditId(null);setForm({...EMPTY,reworkDate:new Date().toISOString().slice(0,10)});setShowForm(true)}} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:8,background:'var(--accent)',color:'#fff',border:'none',cursor:'pointer',fontSize:13,fontWeight:600}}>
          <Wrench size={14}/> 신규
        </button>
      </div>

      {showForm && (
        <div style={{background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:12,padding:16,marginBottom:16}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
            <div>
              <div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>연결 NCR ID</div>
              <select value={form.ncrId} onChange={e=>setF('ncrId',e.target.value)} style={inp}>
                <option value=''>-- 선택 --</option>
                {ncrs.map(n=><option key={n.id} value={n.id}>{n.id?.slice(-6)} {n.title}</option>)}
              </select>
            </div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>재작업 번호</div><input value={form.reworkNo} onChange={e=>setF('reworkNo',e.target.value)} style={inp} placeholder='RW-2026-001'/></div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>제품명</div><input value={form.productName} onChange={e=>setF('productName',e.target.value)} style={inp}/></div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>롟번호</div><input value={form.lotNo} onChange={e=>setF('lotNo',e.target.value)} style={inp}/></div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>재작업일</div><input type='date' value={form.reworkDate} onChange={e=>setF('reworkDate',e.target.value)} style={inp}/></div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>작업자</div><input value={form.operators} onChange={e=>setF('operators',e.target.value)} style={inp} placeholder='성명 복수 입력'/></div>
            <div style={{gridColumn:'span 2'}}><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>재작업 내용</div><textarea value={form.reworkDesc} onChange={e=>setF('reworkDesc',e.target.value)} rows={3} style={{...inp,resize:'vertical'}}/></div>
            <div style={{gridColumn:'span 2'}}><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>재작업 결과</div><textarea value={form.result} onChange={e=>setF('result',e.target.value)} rows={2} style={{...inp,resize:'vertical'}}/></div>
            <div>
              <div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>검사 판정</div>
              <select value={form.inspResult} onChange={e=>setF('inspResult',e.target.value)} style={inp}>
                {['합격','불합격','보류'].map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>검사자</div><input value={form.inspBy} onChange={e=>setF('inspBy',e.target.value)} style={inp}/></div>
            <div>
              <div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>상태</div>
              <select value={form.status} onChange={e=>setF('status',e.target.value)} style={inp}>
                {['작성중','완료','승인'].map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
            <div><div style={{fontSize:12,color:'var(--ink-faint)',marginBottom:4}}>특이사항</div><input value={form.notes} onChange={e=>setF('notes',e.target.value)} style={inp}/></div>
          </div>
          <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
            <button onClick={()=>setShowForm(false)} style={{padding:'6px 14px',borderRadius:8,fontSize:13,background:'var(--surface-2)',border:'1px solid var(--border)',cursor:'pointer'}}>취소</button>
            <button onClick={save} style={{padding:'6px 14px',borderRadius:8,fontSize:13,background:'var(--accent)',color:'#fff',border:'none',cursor:'pointer',fontWeight:600}}>저장</button>
          </div>
        </div>
      )}

      {records.length===0&&!showForm&&(
        <div style={{textAlign:'center',padding:'40px 0',color:'var(--ink-faint)'}}>
          <Wrench size={32} style={{opacity:0.3,marginBottom:8}}/>
          <p style={{fontSize:14}}>재작업 기록이 없습니다</p>
        </div>
      )}

      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {records.map(r=>{
          const statusColor = r.status==='승인'?'#16A34A':r.status==='완료'?'#2563EB':'#6B7280'
          const inspColor = r.inspResult==='합격'?'#16A34A':r.inspResult==='불합격'?'#DC2626':'#D97706'
          return (
            <div key={r.id} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 14px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                    <span style={{fontSize:14,fontWeight:600}}>{r.reworkNo}</span>
                    <span style={{fontSize:11,padding:'2px 7px',borderRadius:99,background:inspColor+'22',color:inspColor,fontWeight:600}}>{r.inspResult}</span>
                    <span style={{fontSize:11,padding:'2px 7px',borderRadius:99,background:statusColor+'22',color:statusColor,fontWeight:600}}>{r.status}</span>
                  </div>
                  <div style={{fontSize:12,color:'var(--ink-faint)'}}>{r.productName} {r.lotNo&&`· 롟: ${r.lotNo}`} · {r.reworkDate} · 작업자: {r.operators}</div>
                  {r.reworkDesc&&<div style={{fontSize:12,marginTop:4,color:'var(--ink)'}}>{r.reworkDesc.slice(0,80)}{r.reworkDesc.length>80?'…':''}</div>}
                </div>
                <div style={{display:'flex',gap:4}}>
                  <button onClick={()=>{setEditId(r.id);setForm({ncrId:r.ncrId,reworkNo:r.reworkNo,productName:r.productName,lotNo:r.lotNo,reworkDate:r.reworkDate,operators:r.operators,reworkDesc:r.reworkDesc,result:r.result,inspResult:r.inspResult,inspBy:r.inspBy,status:r.status,notes:r.notes});setShowForm(true)}} style={{padding:'4px 8px',borderRadius:6,fontSize:12,background:'var(--surface-2)',border:'1px solid var(--border)',cursor:'pointer'}}>편집</button>
                  <button onClick={()=>del(r.id)} style={{padding:'4px 8px',borderRadius:6,fontSize:12,background:'#FEE2E2',color:'#DC2626',border:'none',cursor:'pointer'}}>삭제</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}