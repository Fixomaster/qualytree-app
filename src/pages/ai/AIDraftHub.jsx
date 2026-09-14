// src/pages/ai/AIDraftHub.jsx
// AI 초안 생성 허브 — ISO 13485 QMS 문서 자동 초안
import React, { useState } from 'react'
import { Sparkles, Copy, Check, FileText, AlertCircle } from 'lucide-react'
import AppLayout from '../../components/AppLayout'

const DOC_TYPES = [
  { key: 'sop', label: '작업표준서 (SOP)', iso: '§4.2.4', fields: [
    { key: 'title', label: 'SOP 제목', placeholder: '예: 원자재 수입검사 절차' },
    { key: 'purpose', label: '목적 (한 줄)', placeholder: '예: 수입 원자재의 품질 적합성을 확인하기 위함' },
    { key: 'dept', label: '담당 부서', placeholder: '예: 구매팀, 품질팀' },
    { key: 'iso', label: '관련 ISO 조항', placeholder: '예: §7.4.3' },
  ]},
  { key: 'capa', label: 'CAPA 보고서', iso: '§8.5.2/8.5.3', fields: [
    { key: 'type', label: '부적합 유형', placeholder: '예: 공정 부적합, 고객불만, 내부심사' },
    { key: 'dept', label: '발생 부서', placeholder: '예: 생산부' },
    { key: 'description', label: '문제 현상 (구체적으로)', placeholder: '예: A라인 조립 불량률 3% 초과, 규격은 1% 이하' },
  ]},
  { key: 'risk', label: '위험 평가서', iso: 'ISO 14971', fields: [
    { key: 'product', label: '제품명', placeholder: '예: 혈당 측정기 HG-100' },
    { key: 'hazard', label: '위험 상황', placeholder: '예: 측정값 오류로 인한 잘못된 인슐린 투여' },
    { key: 'use', label: '의도된 용도', placeholder: '예: 가정에서 당뇨 환자가 혈당을 자가 측정' },
  ]},
  { key: 'complaint', label: '고객불만 조사보고서', iso: '§8.2.1', fields: [
    { key: 'type', label: '불만 유형', placeholder: '예: 제품 오작동, 포장 불량' },
    { key: 'product', label: '해당 제품', placeholder: '예: 혈압계 BP-200 Lot.2024-05' },
    { key: 'description', label: '고객 진술 요약', placeholder: '예: 사용 3일 만에 화면이 표시되지 않음' },
  ]},
  { key: 'change', label: '변경요청서 (CCR)', iso: '§4.1.4', fields: [
    { key: 'type', label: '변경 유형', placeholder: '예: 설계변경, 공정변경, 원자재 변경' },
    { key: 'target', label: '변경 대상', placeholder: '예: 제품 A의 전원 회로 설계' },
    { key: 'reason', label: '변경 이유', placeholder: '예: 부품 단종으로 인한 대체 부품 채택 필요' },
  ]},
  { key: 'supplier', label: '공급업체 평가보고서', iso: '§7.4.1', fields: [
    { key: 'name', label: '공급업체명', placeholder: '예: (주)ABC 전자' },
    { key: 'item', label: '공급 품목', placeholder: '예: PCB 기판, 전원 모듈' },
    { key: 'evalType', label: '평가 유형', placeholder: '예: 신규 등록, 정기 평가, 실사' },
  ]},
  { key: 'qm', label: '품질매뉴얼 섹션', iso: '§4.2.2', fields: [
    { key: 'section', label: 'ISO 조항', placeholder: '예: §7.1 제품 실현 기획' },
    { key: 'company', label: '회사명', placeholder: '예: (주)모어컴퍼니' },
    { key: 'productType', label: '의료기기 유형', placeholder: '예: 2등급 혈당측정기' },
  ]},
]

export default function AIDraftHub() {
  const [selectedType, setSelectedType] = useState(null)
  const [fieldValues, setFieldValues] = useState({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  const docType = DOC_TYPES.find(d => d.key === selectedType)
  const allFilled = docType?.fields.every(f => fieldValues[f.key]?.trim())

  const handleGenerate = async () => {
    if (!selectedType) return
    setLoading(true); setResult(null); setError(null)
    try {
      const res = await fetch('/api/ai-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docType: selectedType, fields: fieldValues }),
      })
      const data = await res.json()
      if (data.ok) setResult(data.draft)
      else setError(data.error || '생성 실패. ANTHROPIC_API_KEY가 Vercel 환경변수에 설정되어 있는지 확인하세요.')
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(result || '')
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <AppLayout>
      <div style={{ padding: '24px', maxWidth: 920, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Sparkles size={22} style={{ color: 'var(--moss)' }} />
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>AI 초안 생성</h1>
          </div>
          <p style={{ color: 'var(--ink-faint)', margin: 0, fontSize: 13 }}>
            ISO 13485 GMP 문서를 AI로 초안 생성합니다. 결과는 반드시 검토·수정 후 사용하세요.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, alignItems: 'start' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>문서 유형</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {DOC_TYPES.map(dt => (
                <button key={dt.key} onClick={() => { setSelectedType(dt.key); setFieldValues({}); setResult(null); setError(null) }}
                  style={{ textAlign: 'left', padding: '10px 14px', borderRadius: 8, border: '1px solid',
                    borderColor: selectedType === dt.key ? 'var(--moss)' : 'var(--line)',
                    background: selectedType === dt.key ? 'rgba(60,130,90,0.08)' : 'var(--surface)', cursor: 'pointer' }}>
                  <div style={{ fontSize: 13, fontWeight: selectedType === dt.key ? 600 : 400, color: selectedType === dt.key ? 'var(--moss)' : 'var(--ink)' }}>{dt.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>{dt.iso}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            {!selectedType ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--ink-faint)', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--line)' }}>
                <Sparkles size={36} strokeWidth={1} style={{ opacity: 0.3, marginBottom: 12 }} />
                <p style={{ fontSize: 13 }}>좌측에서 생성할 문서 유형을 선택하세요</p>
              </div>
            ) : (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 24 }}>
                <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={16} style={{ color: 'var(--moss)' }} /> {docType.label}
                  <span style={{ fontSize: 12, color: 'var(--ink-faint)', fontWeight: 400 }}>{docType.iso}</span>
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                  {docType.fields.map(f => (
                    <div key={f.key}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-faint)', marginBottom: 4 }}>{f.label}</label>
                      <input type="text" placeholder={f.placeholder} value={fieldValues[f.key] || ''}
                        onChange={e => setFieldValues(p => ({ ...p, [f.key]: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                    </div>
                  ))}
                </div>
                <button onClick={handleGenerate} disabled={loading || !allFilled}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px',
                    background: allFilled && !loading ? 'var(--moss)' : 'var(--line)',
                    color: allFilled && !loading ? '#fff' : 'var(--ink-faint)',
                    border: 'none', borderRadius: 8, cursor: allFilled && !loading ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 600 }}>
                  <Sparkles size={15} /> {loading ? 'AI 생성 중...' : 'AI 초안 생성'}
                </button>
                {error && (
                  <div style={{ marginTop: 16, padding: '12px 16px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca', display: 'flex', gap: 8 }}>
                    <AlertCircle size={16} style={{ color: '#dc2626', flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 13, color: '#991b1b' }}>{error}</span>
                  </div>
                )}
                {result && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>생성된 초안</span>
                      <button onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
                        background: copied ? '#f0fdf4' : 'var(--bg)', border: '1px solid var(--line)', borderRadius: 6, cursor: 'pointer', fontSize: 12,
                        color: copied ? '#059669' : 'var(--ink)' }}>
                        {copied ? <><Check size={12} /> 복사됨</> : <><Copy size={12} /> 복사</>}
                      </button>
                    </div>
                    <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8, padding: 16,
                      fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: 480, overflowY: 'auto' }}>
                      {result}
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 8 }}>
                      ⚠️ AI가 생성한 초안입니다. 반드시 검토·수정 후 공식 기록으로 저장하세요.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
