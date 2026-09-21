import { useState } from 'react'
import { Sparkles, X, Copy, Check } from 'lucide-react'

const DOC_CONFIG = {
  ncr:  { label: '부적합보고서 (NCR)', fields: ['department','product','description','date'] },
  capa: { label: 'CAPA 시정조치',      fields: ['rootCause','assignee','dueDate'] },
  sop:  { label: '표준작업절차서 (SOP)', fields: ['processName','department','isoClause'] },
  risk: { label: '위험 분석 (ISO 14971)', fields: ['product','intendedUse','hazardArea'] },
  complaint: { label: '고객불만 (ISO §8.2.1)', fields: ['type','product','description'] },
  change:    { label: '변경관리 (CCR)',               fields: ['type','target','reason'] },
  supplier:  { label: '공급업체 평가 (§7.4)',      fields: ['name','item','evalType'] },
  roledoc:   { label: '역할·직무기술서',        fields: ['company','productType','dept'] },
}
const FIELD_LABELS = {
  department: '발견/적용 부서', product: '제품/공정명',
  description: '부적합 내용', date: '발견일',
  rootCause: '근본 원인', assignee: '담당자', dueDate: '완료 목표일',
  processName: '프로세스명', isoClause: '적용 ISO 조항',
  intendedUse: '사용 목적', hazardArea: '위험 분야',
  type: '유형/분류', target: '변경 대상', reason: '변경 사유',
  name: '공급업체명', item: '공급 품목', evalType: '평가 유형',
  company: '회사명', productType: '제품 유형', dept: '부서',
}

export default function AIDraftButton({ docType, prefill = {} }) {
  const [open, setOpen] = useState(false)
  const [ctx, setCtx] = useState(prefill)
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [meta, setMeta] = useState(null)
  const cfg = DOC_CONFIG[docType]
  if (!cfg) return null

  async function generate() {
    setError(''); setDraft(''); setLoading(true)
    try {
      // 서버 함수(/api/ai-draft)를 경유한다 — API 키는 서버 환경변수에만 있고
      // 브라우저로 내려오지 않는다 (프로젝트 지침 §11.3 / §22).
      const res = await fetch('/api/ai-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docType, fields: ctx }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.ok) throw new Error(json.message || json.error || 'AI 초안 생성에 실패했습니다.')
      if (json.jobDescription) {
        setDraft('《직무기술서》\n' + json.jobDescription + '\n\n《권한 · 재체》\n' + json.authorityResponsibility)
      } else {
        setDraft(json.draft)
      }
      setMeta(json.meta || null)
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
                {/* §22 AI 거버넌스 — AI 산출물 메타데이터 표시 + 인간 검토 의무 안내 */}
                <div style={{ marginTop:'6px', fontSize:'11.5px', color:'#777', lineHeight:1.5 }}>
                  AI 초안입니다 — 규정·사실 관계를 검토하고 승인해야 기록으로 유효합니다.
                  {meta && <><br/>모델 {meta.model} · 생성 {new Date(meta.generatedAt).toLocaleString('ko-KR')}</>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}