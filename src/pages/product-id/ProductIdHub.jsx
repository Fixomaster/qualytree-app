// src/pages/product-id/ProductIdHub.jsx â Â§7.5.8 ì íìë³Â·ì¶ì  ëìë³´ë
// ì½ê¸° ì ì©: ê° íë¸ìì ìë ¥ë ë°ì´í°ë¥¼ í ëë¡ ì í ìì¹Â·ìíë¥¼ ìë íì
import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Package, ShoppingCart, Wrench, FlaskConical, Truck,
  CheckCircle2, XCircle, AlertTriangle, Clock, ShieldCheck, RefreshCw,
  ChevronDown, ChevronUp, ArrowRight, Search, Tag } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
let _sbCidPid = null

const PID_KEY  = 'qualytree.product_id'
const NCR_KEY  = 'qualytree.ncrs'
const QUAR_KEY = 'qualytree.quarantineItems'

function loadItems(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}

const INSP_CFG = {
  pending:    { label: 'ê²ì¬ ëê¸°',  color: '#9CA3AF', bg: '#F3F4F6', icon: Clock },
  pass:       { label: 'í©ê²©',       color: '#059669', bg: '#D1FAE5', icon: CheckCircle2 },
  fail:       { label: 'ë¶í©ê²©',     color: '#DC2626', bg: '#FEE2E2', icon: XCircle },
  quarantine: { label: 'ê²©ë¦¬',       color: '#D97706', bg: '#FEF3C7', icon: AlertTriangle },
  released:   { label: 'ì¶í ì¹ì¸',  color: '#2563EB', bg: '#DBEAFE', icon: ShieldCheck },
  in_process: { label: 'ê³µì  ì¤',    color: '#7C3AED', bg: '#EDE9FE', icon: RefreshCw },
}

const PHASES = [
  {
    id: 'purchase', label: 'êµ¬ë§¤ / ìê³ ', icon: ShoppingCart,
    color: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC',
    route: '/purchase', hint: 'êµ¬ë§¤ìì¬ íë¸ë¡ ì´ë',
    stages: ['ìê³  ê²ì¬ (IQC)', 'ììì¬ ì°½ê³ '],
  },
  {
    id: 'manufacturing', label: 'ìì°', icon: Wrench,
    color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE',
    route: '/manufacturing', hint: 'ìì° íë¸ë¡ ì´ë',
    stages: ['ê³µì  í¬ì', 'ë°ì í (WIP)', 'ê³µì  ê²ì¬'],
  },
  {
    id: 'inspection', label: 'ê²ì¬ / íì§', icon: FlaskConical,
    color: '#D97706', bg: '#FFFBEB', border: '#FDE68A',
    route: '/inspection', hint: 'ê²ì¬ íë¸ë¡ ì´ë',
    stages: ['ìµì¢ ê²ì¬', 'ìì í ì°½ê³ ', 'í¬ì¥', 'ê²©ë¦¬ êµ¬ì­'],
  },
  {
    id: 'shipping', label: 'ì¶í', icon: Truck,
    color: '#059669', bg: '#ECFDF5', border: '#A7F3D0',
    route: '/sales', hint: 'ìì íë¸ë¡ ì´ë',
    stages: ['ì¶í ì¤ë¹', 'ì¶í ìë£'],
  },
]

function Bdg({ bg, color, children }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 9999, background: bg, color }}>
      {children}
    </span>
  )
}

function ProductCard({ item, hasNcr, hasQuar, expanded, onToggle }) {
  const insp = INSP_CFG[item.inspectStatus] || INSP_CFG.pending
  const InspIcon = insp.icon
  return (
    <div style={{ background: '#fff', border: `1px solid ${hasNcr || hasQuar ? '#FCA5A5' : '#E5E7EB'}`,
      borderRadius: 10, overflow: 'hidden', marginBottom: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', cursor: 'pointer' }}
        onClick={onToggle}>
        <InspIcon size={14} color={insp.color} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.productName || '(ì´ë¦ ìì)'}
          </p>
          <p style={{ fontSize: 11, color: '#6B7280', margin: '2px 0 0' }}>
            {item.lotNo ? `LOT: ${item.lotNo}` : item.serialNo ? `S/N: ${item.serialNo}` : item.productCode || ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
          <Bdg bg={insp.bg} color={insp.color}>{insp.label}</Bdg>
          {hasNcr && <Bdg bg="#FEF2F2" color="#DC2626">NCR</Bdg>}
          {hasQuar && <Bdg bg="#FEF3C7" color="#D97706">ê²©ë¦¬</Bdg>}
          {expanded ? <ChevronUp size={14} color="#9CA3AF" /> : <ChevronDown size={14} color="#9CA3AF" />}
        </div>
      </div>
      {expanded && (
        <div style={{ padding: '0 12px 10px', borderTop: '1px solid #F3F4F6', fontSize: 12, color: '#6B7280' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
            {item.deviceClass && <span>ë±ê¸: {item.deviceClass}</span>}
            {item.qty && <span>ìë: {item.qty}</span>}
            {item.currentStage && <span>ìì¹: {item.currentStage}</span>}
            {item.inspectedDate && <span>ê²ì¬ì¼: {item.inspectedDate}</span>}
            {item.expiryDate && <span>ì í¨ê¸°í: {item.expiryDate}</span>}
          </div>
          {item.notes && (
            <p style={{ marginTop: 6, color: '#374151', fontStyle: 'italic' }}>{item.notes}</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function ProductIdHub() {
  const user = auth.current()
  const companyId = user?.company_id
  const navigate = useNavigate()
  const [tick, setTick] = useState(0)
  const [showUdiUpload, setShowUdiUpload] = useState(false)
  const [udiLookupDi, setUdiLookupDi] = useState('')
  const [udiLookupResult, setUdiLookupResult] = useState(null)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [viewMode, setViewMode] = useState('board')
  const [collapsedPhase, setCollapsedPhase] = useState({})

  const allItems = useMemo(() => loadItems(PID_KEY), [tick])
  const ncrItems = useMemo(() => loadItems(NCR_KEY), [tick])
  const quarItems = useMemo(() => loadItems(QUAR_KEY), [tick])
  useEffect(() => { _sbCidPid = companyId || null }, [companyId])
  useEffect(() => {
    if (!companyId) return
    Promise.all([PID_KEY, NCR_KEY, QUAR_KEY].map(k =>
      supabase.from('company_data').select('payload')
        .eq('company_id', companyId).eq('data_type', 'localStorage_sync')
        .eq('data_key', k).maybeSingle()
        .then(({ data: sbData }) => { if (sbData?.payload) localStorage.setItem(k, JSON.stringify(sbData.payload)) })
    )).then(() => setTick(t => t + 1))
  }, [companyId])

  const ncrLots = useMemo(() => new Set(ncrItems.map(n => n.productLot).filter(Boolean)), [ncrItems])
  const quarLots = useMemo(() => new Set(quarItems.map(q => q.lotNumber).filter(Boolean)), [quarItems])

  const filtered = useMemo(() => allItems.filter(i => {
    if (!search) return true
    const q = search.toLowerCase()
    return (i.productName || '').toLowerCase().includes(q) ||
      (i.lotNo || '').toLowerCase().includes(q) ||
      (i.productCode || '').toLowerCase().includes(q)
  }), [allItems, search])

  const bySta = useMemo(() => {
    const r = {}
    Object.keys(INSP_CFG).forEach(k => { r[k] = 0 })
    filtered.forEach(i => { if (i.inspectStatus in r) r[i.inspectStatus]++ })
    return r
  }, [filtered])

  const inputSt = {
    padding: '7px 10px', border: '1px solid #D1D5DB', borderRadius: 8,
    fontSize: 13, outline: 'none', boxSizing: 'border-box',
  }

  return (
    <AppLayout>
      <HubBanner icon={Tag} title="ì í ìë³Â·ìí" subtitle="ISO 13485 Â§7.5.8 ì í ìë³ ë° ìí" color="#7C3AED" />
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>

                <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          <button onClick={()=>setShowUdiUpload(true)} style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 12px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:8, fontSize:13, cursor:'pointer' }}>
            CSV ìë¡ë
          </button>
          <a href="https://udiportal.mfds.go.kr" target="_blank" rel="noopener noreferrer" style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 12px', background:'#f3f4f6', color:'#374151', border:'1px solid #d1d5db', borderRadius:8, fontSize:13, cursor:'pointer', textDecoration:'none' }}>
            ìì½ì² UDIDS ì¡°í â
          </a>
        </div>
        {/* í¤ë */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0 }}>
              ì í ìë³ Â· ìí ì¶ì 
            </h1>
            <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>
              ISO 13485 Â§7.5.8 â êµ¬ë§¤ â ìì° â ê²ì¬ â ì¶í íë¦ìì ê° ì íì ìì¹ì ìíë¥¼ ìë íìí©ëë¤.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>
              ì´ {allItems.length}ê°{ncrItems.length > 0 ? ` | NCR ${ncrItems.length}ê±´` : ''}
            </span>
            <button onClick={() => setTick(t => t + 1)}
              style={{ padding: 7, background: '#fff', border: '1px solid #E5E7EB',
                borderRadius: 8, cursor: 'pointer', color: '#6B7280' }}>
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* íë¦ ìì½ ë° */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderRadius: 12, overflow: 'hidden',
          border: '1px solid #E5E7EB' }}>
          {PHASES.map((ph, idx) => {
            const cnt = filtered.filter(i =>
              ph.stages.includes(i.currentStage || 'ìê³  ê²ì¬ (IQC)')
            ).length
            const Icon = ph.icon
            return (
              <div key={ph.id} onClick={() => navigate(ph.route)}
                style={{ flex: 1, background: cnt > 0 ? ph.bg : '#F9FAFB', padding: '12px 14px',
                  cursor: 'pointer', borderRight: idx < 3 ? '1px solid #E5E7EB' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Icon size={14} color={ph.color} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: ph.color }}>{ph.label}</span>
                  {idx < 3 && <ArrowRight size={11} color="#D1D5DB" style={{ marginLeft: 'auto' }} />}
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: cnt > 0 ? ph.color : '#D1D5DB' }}>{cnt}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF' }}>ê±´</div>
              </div>
            )
          })}
        </div>

        {/* í­ + ê²ì */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 16, gap: 8 }}>
          <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #E5E7EB' }}>
            {[['board', 'íë¦ ë³´ë'], ['analysis', 'íí© ë¶ì']].map(([v, l]) => (
              <button key={v} onClick={() => setViewMode(v)}
                style={{ padding: '7px 14px', border: 'none', background: 'transparent',
                  fontSize: 13, fontWeight: viewMode === v ? 700 : 400,
                  color: viewMode === v ? '#1B4332' : '#6B7280', cursor: 'pointer',
                  borderBottom: viewMode === v ? '2px solid #1B4332' : '2px solid transparent',
                  marginBottom: -1 }}>
                {l}
              </button>
            ))}
          </div>
          {viewMode === 'board' && (
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 9, top: '50%',
                transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="ì íëª, LOT, ì½ë"
                style={{ ...inputSt, paddingLeft: 28, width: 180 }} />
            </div>
          )}
        </div>

        {/* íë¦ ë³´ë */}
        {viewMode === 'board' && (
          allItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>
              <Package size={40} style={{ margin: '0 auto 12px', opacity: .4 }} />
              <p style={{ fontSize: 14, margin: 0 }}>ë±ë¡ë ì íì´ ììµëë¤.</p>
              <p style={{ fontSize: 12, margin: '8px 0 16px', color: '#D1D5DB' }}>
                ê° íë¸ìì ì íÂ·LOTì ë±ë¡íë©´ ì¬ê¸°ì ìëì¼ë¡ íìë©ëë¤.
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {PHASES.map(ph => {
                  const Icon = ph.icon
                  return (
                    <button key={ph.id} onClick={() => navigate(ph.route)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px',
                        background: ph.bg, color: ph.color, border: `1px solid ${ph.border}`,
                        borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                      <Icon size={13} /> {ph.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {PHASES.map(ph => {
                const items = filtered.filter(i =>
                  ph.stages.includes(i.currentStage || 'ìê³  ê²ì¬ (IQC)')
                )
                const Icon = ph.icon
                const collapsed = collapsedPhase[ph.id]
                return (
                  <div key={ph.id} style={{ background: ph.bg, border: `1px solid ${ph.border}`,
                    borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 12px 8px', borderBottom: `1px solid ${ph.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Icon size={15} color={ph.color} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: ph.color }}>{ph.label}</span>
                          <span style={{ fontSize: 11, background: ph.color, color: '#fff',
                            borderRadius: 9999, padding: '1px 6px', fontWeight: 700 }}>{items.length}</span>
                        </div>
                        <button onClick={() => setCollapsedPhase(s => ({ ...s, [ph.id]: !s[ph.id] }))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                          {collapsed ? <ChevronDown size={14} color={ph.color} />
                            : <ChevronUp size={14} color={ph.color} />}
                        </button>
                      </div>
                      <button onClick={() => navigate(ph.route)}
                        style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'none',
                          border: 'none', cursor: 'pointer', color: ph.color, fontSize: 11,
                          marginTop: 4, padding: 0, opacity: .75 }}>
                        <ArrowRight size={11} />{ph.hint}
                      </button>
                    </div>
                    {!collapsed && (
                      <div style={{ padding: 8, minHeight: 60 }}>
                        {items.length === 0 ? (
                          <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', padding: '12px 0' }}>
                            í´ë¹ ë¨ê³ ìì
                          </p>
                        ) : items.map(item => (
                          <ProductCard key={item.id} item={item}
                            hasNcr={ncrLots.has(item.lotNo)}
                            hasQuar={quarLots.has(item.lotNo)}
                            expanded={expandedId === item.id}
                            onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* íí© ë¶ì */}
        {viewMode === 'analysis' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 14 }}>ê²ì¬ ìí ë¶í¬</h3>
              {allItems.length === 0
                ? <p style={{ color: '#9CA3AF', fontSize: 13 }}>ë°ì´í° ìì</p>
                : (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {Object.entries(INSP_CFG).map(([k, v]) => (
                      <div key={k} style={{ flex: '1 1 90px', background: v.bg, borderRadius: 10,
                        padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: v.color }}>{bySta[k] || 0}</div>
                        <div style={{ fontSize: 11, color: v.color, marginTop: 2 }}>{v.label}</div>
                      </div>
                    ))}
                  </div>
                )}
            </div>

            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 14 }}>ê³µì  ë¨ê³ë³ ë¶í¬</h3>
              {allItems.length === 0
                ? <p style={{ color: '#9CA3AF', fontSize: 13 }}>ë°ì´í° ìì</p>
                : PHASES.map(ph => {
                  const cnt = allItems.filter(i => ph.stages.includes(i.currentStage || 'ìê³  ê²ì¬ (IQC)')).length
                  const pct = allItems.length ? (cnt / allItems.length) * 100 : 0
                  const Icon = ph.icon
                  return (
                    <div key={ph.id} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Icon size={13} color={ph.color} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{ph.label}</span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: ph.color }}>{cnt}ê±´</span>
                      </div>
                      <div style={{ height: 8, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: ph.color,
                          borderRadius: 4, transition: 'width .4s' }} />
                      </div>
                    </div>
                  )
                })}
            </div>

            {(ncrItems.length > 0 || quarItems.length > 0) && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: 20 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#DC2626', marginBottom: 12 }}>
                  ì£¼ì í­ëª© (NCR Â· ê²©ë¦¬ ì°ê³)
                </h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, background: '#fff', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#DC2626' }}>{ncrItems.length}</div>
                    <div style={{ fontSize: 11, color: '#DC2626' }}>ë¯¸ê²° NCR</div>
                  </div>
                  <div style={{ flex: 1, background: '#fff', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#D97706' }}>{quarItems.length}</div>
                    <div style={{ fontSize: 11, color: '#D97706' }}>ê²©ë¦¬ ì í</div>
                  </div>
                </div>
                <button onClick={() => navigate('/quality')}
                  style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 5,
                    background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626',
                    fontSize: 12, padding: 0, fontWeight: 600 }}>
                  <ArrowRight size={12} />NCR Â· ë¶ì í© íë¸ë¡ ì´ë
                </button>
              </div>
            )}
          </div>
        )}

      </div>
          {showUdiUpload && (
        <UdiCsvImportModal onClose={()=>setShowUdiUpload(false)} onImport={(rows)=>{
          try {
            const existing = JSON.parse(localStorage.getItem('qualytree.product_id')||'[]')
            const merged = [...existing]
            rows.forEach(r=>{ if(!merged.find(e=>e.udi===r.udi)) merged.push({id:Date.now().toString()+Math.random(),createdAt:new Date().toISOString(),...r}) })
            localStorage.setItem('qualytree.product_id', JSON.stringify(merged))
    if (_sbCidPid) supabase.from('company_data').upsert({company_id: _sbCidPid, data_type: 'localStorage_sync', data_key: PID_KEY, payload: merged},{onConflict:'company_id,data_type,data_key'})
            setTick(n=>n+1)
            setShowUdiUpload(false)
          } catch(e){ alert('ì¤ë¥: '+e.message) }
        }} />
      )}
    </AppLayout>
  )
}


// ââ UDI CSV ìë¡ë ëª¨ë¬ ââââââââââââââââââââââââââââââââââââââââââââ
function UdiCsvImportModal({ onClose, onImport }) {
  const [csvText, setCsvText] = React.useState('')
  const [preview, setPreview] = React.useState([])
  const [error, setError] = React.useState('')

  const COLS = ['udi','productName','modelNumber','lotNumber','expiryDate','quantity']

  const parseCsv = (text) => {
    try {
      const lines = text.trim().split('\n').filter(l=>l.trim())
      if (lines.length < 2) { setError('ì´ í¤ëë¥¼ í¬í¨íì¬ 2ì¤ ì´ì ìë ¥íì¸ì'); setPreview([]); return }
      const headers = lines[0].split(',').map(h=>h.trim())
      const rows = lines.slice(1).map(line => {
        const vals = line.split(',').map(v=>v.trim())
        const obj = {}
        headers.forEach((h,i) => { obj[h] = vals[i] || '' })
        return obj
      })
      setPreview(rows)
      setError('')
    } catch(e) { setError(e.message) }
  }

  const handleText = (v) => { setCsvText(v); parseCsv(v) }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background:'rgba(0,0,0,0.4)' }} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4" style={{ background:'var(--surface)' }}>
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-[16px] font-bold">UDI CSV ìë¡ë</h2>
            <p className="text-[12px]" style={{ color:'var(--ink-faint)' }}>í¤ë: udi, productName, modelNumber, lotNumber, expiryDate, quantity</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ background:'var(--surface-2)' }}>â</button>
        </div>

        <div className="space-y-2">
          <label className="text-[12px] font-medium">CSV ë°ì´í° ë¶ì¬ë£ê¸°</label>
          <textarea
            value={csvText}
            onChange={e=>handleText(e.target.value)}
            rows={8}
            placeholder={"udi,productName,modelNumber,lotNumber,expiryDate,quantity\n01-12345678-1-1,ì íA,M-001,LOT001,2027-12-31,100"}
            className="w-full border rounded-lg px-3 py-2 text-[13px] font-mono"
            style={{ borderColor:'var(--border)', background:'var(--surface)', resize:'vertical' }}
          />
          {error && <p className="text-[12px]" style={{ color:'#dc2626' }}>{error}</p>}
        </div>

        {preview.length > 0 && (
          <div>
            <p className="text-[12px] font-medium mb-1">ë¯¸ë¦¬ë³´ê¸° ({preview.length}ê±´)</p>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]" style={{ borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'var(--surface-2)' }}>
                    {Object.keys(preview[0]).map(k=><th key={k} className="px-2 py-1 text-left border" style={{ borderColor:'var(--border)' }}>{k}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0,5).map((r,i)=>(
                    <tr key={i}>
                      {Object.values(r).map((v,j)=><td key={j} className="px-2 py-1 border" style={{ borderColor:'var(--border)' }}>{v}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 5 && <p className="text-[11px] mt-1" style={{ color:'var(--ink-faint)' }}>ì¸ {preview.length-5}ê±´ ì¶ê°</p>}
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-[13px]" style={{ background:'var(--surface-2)', border:'1px solid var(--border)' }}>ì·¨ì</button>
          <button
            onClick={()=>{ if(preview.length>0) onImport(preview); else alert('ë°ì´í°ë¥¼ ìë ¥íì¸ì') }}
            className="px-3 py-1.5 rounded-lg text-[13px] font-medium"
            style={{ background:'var(--accent)', color:'#fff' }}
          >ê°ì ¸ì¤ê¸° ({preview.length}ê±´)</button>
        </div>
      </div>
    </div>
  )
}