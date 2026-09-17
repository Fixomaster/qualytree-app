import { useState } from 'react'
import { Sparkles, X, Copy, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'

const DOC_CONFIG = {
  ncr:  { label: '부적합보고서 (NCR)', fields: ['department','product','description','date'] },
  capa: { label: 'CAPA 시정조치',      fields: ['rootCause','assignee','dueDate'] },
  sop:  { label: '표준작업절차서 (SOP)', fields: ['processName','department','isoClause'] },
  risk: { label: '위험 분석 (ISO 14971)', fields: ['product','intendedUse','hazardArea'] },
}
const FIELD_LABELS = {
  department: '발견/적용 부서', product: '제품/공정명',
  description: '부적합 내용', date: '발견일',
  rootCause: '근본 원인', assignee: '담당자', dueDate: '완료 목표일',
  processName: '프로세스명', isoClause: '적용 ISO 조항',
  intendedUse: '사용 목적', hazardArea: '위험 분야',
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
      if (!session) throw new Error('로그인 필요')
      const companyId = session.user?.user_metadata?.company_id || session.user?.id
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ docType, context: ctx, companyId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'AI 오류')
      setDraft(json.draft)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  function copyDraft() {
    navigator.clipboard.writeText(draft).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
  }

  return (
    <>
      <button onClick={() => setOpen(true)} title="AI 초안 생성"
        style={{ display:'inline-flex', alignItems:'center', gap:'5px', padding:'5px 11px',
          background:'linear-gradient(135deg,#1a3a2a,#2d6a4a)', color:'#fff',
          border:'none', borderRadius:'7px', fontSize:'12px', fontWeight:600, cursor:'pointer', flexShrink:0 }}>
        <Sparkles size={12} strokeWidth={2} /> AI 초안
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
              <h3 style={{ margin:0, fontSize:'16px', fontWeight:700, color:'#1a3a2a' }}>AI 초안 — {cfg.label}</h3>
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
              {loading ? '생성 중...' : '✨ AI 초안 생성'}
            </button>
            {draft && (
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
                  <span style={{ fontSize:'12px', fontWeight:600, color:'#555' }}>생성된 초안</span>
                  <button onClick={copyDraft} style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'4px 10px', background:'#f0f7f4', border:'none', borderRadius:'6px', fontSize:'12px', cursor:'pointer', color:'#2d6a4a', fontWeight:600 }}>
                    {copied ? <><Check size={12}/> 복사됨</> : <><Copy size={12}/> 복사</>}
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