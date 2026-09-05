import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const DOC_TYPES = [
  { value: 'ncr',  label: '부적합보고서 (NCR)',       fields: ['department','product','description','date'] },
  { value: 'capa', label: 'CAPA 시정·예방조치',        fields: ['rootCause','assignee','dueDate'] },
  { value: 'sop',  label: '표준작업절차서 (SOP)',       fields: ['processName','department','isoClause'] },
  { value: 'risk', label: '위험 분석 (ISO 14971)',      fields: ['product','intendedUse','hazardArea'] },
  { value: 'memo', label: '내부 품질 메모',              fields: ['subject','to','body'] },
]

const FIELD_LABELS = {
  department:   '발견/적용 부서',
  product:      '제품/공정명',
  description:  '부적합 내용',
  date:         '발견일',
  rootCause:    '근본 원인',
  assignee:     '담당자',
  dueDate:      '목표 완료일',
  processName:  '프로세스명',
  isoClause:    '관련 ISO 조항',
  intendedUse:  '의도된 용도',
  hazardArea:   '위험 영역',
  subject:      '제목',
  to:           '수신',
  body:         '내용 요점',
}

export default function AIDraftHub() {
  const [docType,  setDocType]  = useState('ncr')
  const [context,  setContext]  = useState({})
  const [draft,    setDraft]    = useState('')
  const [usage,    setUsage]    = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [copied,   setCopied]   = useState(false)

  const selectedType = DOC_TYPES.find(d => d.value === docType)

  // 이번 달 사용량 미리 로드
  useEffect(() => {
    loadUsage()
  }, [])

  async function loadUsage() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const companyId = session.user?.user_metadata?.company_id || session.user?.id
    if (!companyId) return
    const ym = new Date().toISOString().slice(0, 7)
    const { data } = await supabase
      .from('ai_usage_log')
      .select('count, plan')
      .eq('company_id', companyId)
      .eq('month', ym)
      .single()
    if (data) setUsage({ used: data.count, plan: data.plan })
  }

  async function generate() {
    setError('')
    setDraft('')
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('로그인이 필요합니다.')
      const companyId = session.user?.user_metadata?.company_id || session.user?.id

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-draft`,
        {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ docType, context, companyId }),
        }
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'AI 오류')
      setDraft(json.draft)
      setUsage(json.usage)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleContext(field, value) {
    setContext(prev => ({ ...prev, [field]: value }))
  }

  async function copyDraft() {
    await navigator.clipboard.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const planLimit = { free: 10, starter: 50, pro: 200, enterprise: 999 }
  const limit = planLimit[usage?.plan ?? 'free'] ?? 10
  const usedPct = usage ? Math.min((usage.used / limit) * 100, 100) : 0

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      {/* 헤더 */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a3a2a', margin: 0 }}>
          AI 초안 생성
        </h1>
        <p style={{ color: '#555', marginTop: '6px', fontSize: '14px' }}>
          Claude AI가 ISO 13485 · KGMP 규정에 맞는 품질 문서 초안을 생성합니다.
        </p>
      </div>

      {/* 사용량 표시 */}
      {usage && (
        <div style={{ background: '#f0f7f4', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '13px', color: '#1a3a2a', fontWeight: 600 }}>
            이번 달 사용량
          </span>
          <div style={{ flex: 1, background: '#d4e8df', borderRadius: '99px', height: '8px' }}>
            <div style={{ width: usedPct + '%', background: usedPct >= 90 ? '#c0392b' : '#2ecc71', height: '8px', borderRadius: '99px', transition: 'width .3s' }} />
          </div>
          <span style={{ fontSize: '13px', color: '#333' }}>
            {usage.used} / {limit}회 ({usage.plan ?? 'free'})
          </span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* 왼쪽: 입력 패널 */}
        <div>
          {/* 문서 유형 선택 */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#333' }}>
              문서 유형
            </label>
            <select
              value={docType}
              onChange={e => { setDocType(e.target.value); setContext({}) }}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '14px' }}
            >
              {DOC_TYPES.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          {/* 동적 입력 필드 */}
          {selectedType?.fields.map(field => (
            <div key={field} style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px', color: '#444' }}>
                {FIELD_LABELS[field] ?? field}
              </label>
              {field === 'description' || field === 'body' || field === 'intendedUse' ? (
                <textarea
                  rows={3}
                  value={context[field] ?? ''}
                  onChange={e => handleContext(field, e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }}
                  placeholder={FIELD_LABELS[field]}
                />
              ) : (
                <input
                  type={field === 'date' || field === 'dueDate' ? 'date' : 'text'}
                  value={context[field] ?? ''}
                  onChange={e => handleContext(field, e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                  placeholder={FIELD_LABELS[field]}
                />
              )}
            </div>
          ))}

          {error && (
            <div style={{ background: '#fdecea', border: '1px solid #e74c3c', borderRadius: '6px', padding: '10px 14px', color: '#c0392b', fontSize: '13px', marginBottom: '12px' }}>
              {error}
            </div>
          )}

          <button
            onClick={generate}
            disabled={loading}
            style={{ width: '100%', padding: '12px', background: loading ? '#aaa' : '#1a3a2a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? '생성 중…' : '✦ AI 초안 생성'}
          </button>
        </div>

        {/* 오른쪽: 결과 패널 */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#333' }}>생성된 초안</label>
            {draft && (
              <button
                onClick={copyDraft}
                style={{ fontSize: '12px', padding: '4px 10px', background: copied ? '#2ecc71' : '#eee', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
              >
                {copied ? '복사됨 ✓' : '클립보드 복사'}
              </button>
            )}
          </div>
          <textarea
            readOnly
            value={draft}
            placeholder="AI가 생성한 초안이 여기에 표시됩니다."
            style={{ flex: 1, minHeight: '420px', padding: '12px', border: '1px solid #ccc', borderRadius: '8px', fontSize: '13px', resize: 'vertical', background: draft ? '#fff' : '#fafafa', color: '#222', lineHeight: 1.6 }}
          />
        </div>
      </div>

      {/* SQL 안내 */}
      <details style={{ marginTop: '32px', fontSize: '12px', color: '#888' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Supabase 설정 안내 (관리자용)</summary>
        <pre style={{ background: '#f5f5f5', padding: '12px', borderRadius: '6px', marginTop: '8px', overflow: 'auto' }}>{`-- ai_usage_log 테이블 생성
CREATE TABLE ai_usage_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL,
  month       TEXT NOT NULL,   -- 'YYYY-MM'
  plan        TEXT NOT NULL DEFAULT 'free',
  count       INT  NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (company_id, month)
);
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;
-- Edge Function 배포 후 secrets 설정:
-- supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`}</pre>
      </details>
    </div>
  )
}
