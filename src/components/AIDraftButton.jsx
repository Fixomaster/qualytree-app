import { useState } from 'react'
import { Sparkles, X, Copy, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'

const DOC_CONFIG = {
  ncr:  { label: '\ubd80\uc801\ud569\ubcf4\uace0\uc11c (NCR)', fields: ['department','product','description','date'] },
  capa: { label: 'CAPA \uc2dc\uc815\uc870\uce58',      fields: ['rootCause','assignee','dueDate'] },
  sop:  { label: '\ud45c\uc900\uc791\uc5c5\uc808\ucc28\uc11c (SOP)', fields: ['processName','department','isoClause'] },
  risk: { label: '\uc704\ud5d8 \ubd84\uc11d (ISO 14971)', fields: ['product','intendedUse','hazardArea'] },
}
const FIELD_LABELS = {
  department: '\ubc1c\uacac/\uc801\uc6a9 \ubd80\uc11c', product: '\uc81c\ud488/\uacf5\uc815\uba85',
  description: '\ubd80\uc801\ud569 \ub0b4\uc6a9', date: '\ubc1c\uacac\uc77c',
  rootCause: '\uadfc\ubcf8 \uc6d0\uc778', assignee: '\ub2f4\ub2f9\uc790', dueDate: '\uc644\ub8cc \ubaa9\ud45c\uc77c',
  processName: '\ud504\ub85c\uc138\uc2a4\uba85', isoClause: '\uc801\uc6a9 ISO \uc870\ud56d',
  intendedUse: '\uc0ac\uc6a9 \ubaa9\uc801', hazardArea: '\uc704\ud5d8 \ubd84\uc57c',
}

export default function AIDraftButton({ docType, prefill = {} }) {
  const [open, setOpen] = useState(false)
  const [ctx, setCtx] = useState(prefill)
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const cfg = DOC_CONFIG[docType]
  if (!cfg) return null

  async function generate() {
    setError(''); setDraft(''); setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('\ub85c\uadf8\uc778 \ud544\uc694')
      const companyId = session.user?.user_metadata?.company_id || session.user?.id
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ docType, context: ctx, companyId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'AI \uc624\ub958')
      setDraft(json.draft)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  function copyDraft() {
    navigator.clipboard.writeText(draft).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
  }

  return (
    <>
      <button onClick={() => setOpen(true)} title="AI \ucd08\uc548 \uc0dd\uc131"
        style={{ display:'inline-flex', alignItems:'center', gap:'5px', padding:'5px 11px',
          background:'linear-gradient(135deg,#1a3a2a,#2d6a4a)', color:'#fff',
          border:'none', borderRadius:'7px', fontSize:'12px', fontWeight:600, cursor:'pointer', flexShrink:0 }}>
        <Sparkles size={12} strokeWidth={2} /> AI \ucd08\uc548
      </button>

      {open && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:2000,
          display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
          <div style={{ background:'#fff', borderRadius:'16px', padding:'28px', width:'100%', maxWidth:'540px',
            maxHeight:'90vh', overflow:'auto', position:'relative', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <button onClick={() => setOpen(false)}
              style={{ position:'absolute', top:16, right:16, background:'none', border:'none', cursor:'pointer', color:'#888' }}>
              <X size={18} />
            </button>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'20px' }}>
              <Sparkles size={18} style={{ color:'#2d6a4a' }} />
              <h3 style={{ margin:0, fontSize:'16px', fontWeight:700, color:'#1a3a2a' }}>AI \ucd08\uc548 — {cfg.label}</h3>
            </div>
            {cfg.fields.map(f => (
              <div key={f} style={{ marginBottom:'12px' }}>
                <label style={{ display:'block', fontSize:'12px', fontWeight:600, marginBottom:'4px', color:'#555' }}>
                  {FIELD_LABELS[f] || f}
                </label>
                {f === 'description' || f === 'rootCause' ? (
                  <textarea value={ctx[f] || ''} onChange={e => setCtx(p => ({...p, [f]: e.target.value}))}
                    rows={3} style={{ width:'100%', padding:'7px 10px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'13px', resize:'vertical', boxSizing:'border-box' }} />
                ) : (
                  <input value={ctx[f] || ''} onChange={e => setCtx(p => ({...p, [f]: e.target.value}))}
                    style={{ width:'100%', padding:'7px 10px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'13px', boxSizing:'border-box' }} />
                )}
              </div>
            ))}
            {error && <div style={{ background:'#fef2f2', color:'#b91c1c', padding:'8px 12px', borderRadius:'6px', fontSize:'13px', marginBottom:'12px' }}>{error}</div>}
            <button onClick={generate} disabled={loading}
              style={{ width:'100%', padding:'10px', background:'#1a3a2a', color:'#fff', border:'none',
                borderRadius:'8px', fontSize:'14px', fontWeight:600, cursor:'pointer', marginBottom:'14px', opacity: loading ? 0.7 : 1 }}>
              {loading ? '\uc0dd\uc131 \uc911...' : '\u2728 AI \ucd08\uc548 \uc0dd\uc131'}
            </button>
            {draft && (
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
                  <span style={{ fontSize:'12px', fontWeight:600, color:'#555' }}>\uc0dd\uc131\ub41c \ucd08\uc548</span>
                  <button onClick={copyDraft} style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'4px 10px', background:'#f0f7f4', border:'none', borderRadius:'6px', fontSize:'12px', cursor:'pointer', color:'#2d6a4a', fontWeight:600 }}>
                    {copied ? <><Check size={12}/> \ubcf5\uc0ac\ub428</> : <><Copy size={12}/> \ubcf5\uc0ac</>}
                  </button>
                </div>
                <textarea readOnly value={draft} rows={8}
                  style={{ width:'100%', padding:'12px', border:'1px solid #ddd', borderRadius:'8px', fontSize:'13px', resize:'vertical', boxSizing:'border-box', background:'#fafafa' }} />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}