// src/pages/operator/RegStandardsTab.jsx
// #210 규격·고시 관리 탭 — AI 컨텍스트 관리
// AI 예시문서(1) + 규격·고시(N) PDF 첨부 지원
// 저장소: Supabase ai_contexts 테이블 + regulation-docs 스토리지
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

const AI_DOC_TYPES = {
  ncr:           '부적합 보고서 (NCR)',
  capa:          'CAPA 처리서',
  sop:           '작업표준서/절차서 (SOP)',
  risk:          '위험관리 계획서 (ISO 14971)',
  complaint:     '고객불만 처리서 (ISO §8.2.1)',
  change:        '변경관리 기록서 (CCR)',
  supplier:      '공급업체 평가서 (§7.4)',
  roledoc:       '조직도/직무기술서',
  audit:         '내부심사 보고서 (§8.2.2)',
  calibration:   '교정 성적서 (§7.6)',
  validation:    '공정 유효성확인 (§7.5.6)',
  inspection:    '수입·공정검사 (§8.2.3/8.2.4)',
  manufacturing: '배치제조기록서 (BPR)',
}
const CHAR_WARN = 3000
const BUCKET = 'regulation-docs'

const SETUP_SQL = `-- Supabase SQL Editor에서 실행:
CREATE TABLE IF NOT EXISTS public.ai_contexts (
  doc_type    TEXT PRIMARY KEY,
  example     TEXT DEFAULT '',
  regulations JSONB DEFAULT '[]',
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.ai_contexts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON public.ai_contexts FOR SELECT USING (true);
CREATE POLICY "auth write" ON public.ai_contexts FOR ALL USING (auth.role() = 'authenticated');

-- ※ 스토리지 버킷도 생성 필요:
-- Supabase 대시보드 → Storage → New Bucket
-- 이름: regulation-docs  /  Public: ON`

// 개별 규격 항목 컴포넌트
function RegItem({ reg, idx, onChange, onRemove, onUpload, uploading }) {
  const fileRef = useRef(null)

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const cleanTitle = file.name.replace(/\.pdf$/i, '').replace(/[_\-]/g, ' ')
    await onUpload(file, (url, name) => {
      onChange({ file_url: url, file_name: name, ...(reg.title.trim() ? {} : { title: cleanTitle }) })
    })
    e.target.value = ''
  }

  return (
    <div style={{ border: '1px solid #e0e0e0', borderRadius: 10, padding: 14, marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: '#888', flexShrink: 0 }}>#{idx + 1}</span>
        <input value={reg.title} onChange={e => onChange({ title: e.target.value })}
          placeholder="규격명 (예: ISO 13485 §7.5.1, KGMP 의약품 제조판매 관리 규칙 제16조)"
          style={{ flex: 1, padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
        <button onClick={onRemove}
          style={{ padding: '4px 10px', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, flexShrink: 0 }}>
          삭제
        </button>
      </div>

      {/* PDF 첨부 영역 */}
      <div style={{ marginBottom: 8 }}>
        {reg.file_url ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
            background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6 }}>
            <span style={{ fontSize: 14 }}>📄</span>
            <a href={reg.file_url} target="_blank" rel="noreferrer"
              style={{ fontSize: 12, color: '#15803d', textDecoration: 'none', flex: 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {reg.file_name}
            </a>
            <button onClick={() => onChange({ file_url: '', file_name: '' })}
              style={{ padding: '2px 8px', background: 'none', border: '1px solid #86efac',
                borderRadius: 4, cursor: 'pointer', fontSize: 11, color: '#166534', flexShrink: 0 }}>
              제거
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input ref={fileRef} type="file" accept=".pdf,.hwp,.docx" style={{ display: 'none' }} onChange={handleFileSelect} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              style={{ padding: '5px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1',
                borderRadius: 6, cursor: uploading ? 'not-allowed' : 'pointer', fontSize: 12, color: '#475569' }}>
              {uploading ? '업로드 중...' : '📎 원본 파일 첨부'}
            </button>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>
              PDF · HWP · DOCX 참조용 (파일명이 AI 프롬프트에 참조됩니다)
            </span>
          </div>
        )}
      </div>

      <textarea value={reg.content} onChange={e => onChange({ content: e.target.value })}
        rows={4} placeholder="관련 조항 직접 입력 (선택사항 — 비워두면 파일명만 AI에 참조됩니다)"
        style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 12,
          resize: 'vertical', boxSizing: 'border-box', fontFamily: 'monospace' }} />
      <div style={{ fontSize: 11, color: '#aaa', textAlign: 'right' }}>{(reg.content?.length || 0).toLocaleString()}자</div>
    </div>
  )
}

// 문서 유형별 편집기
function RegContextEditor({ docType, ctx, onChange, onSave, saving, onUpload, uploading }) {
  const totalChars = (ctx.example?.length || 0) +
    (ctx.regulations || []).reduce((a, r) => a + (r.content?.length || 0), 0)

  const addReg = () => onChange({ ...ctx,
    regulations: [...(ctx.regulations || []), { id: Date.now(), title: '', content: '', file_url: '', file_name: '' }] })

  const updateReg = (id, updates) => onChange({ ...ctx,
    regulations: (ctx.regulations || []).map(r => r.id === id ? { ...r, ...updates } : r) })

  const removeReg = (id) => onChange({ ...ctx,
    regulations: (ctx.regulations || []).filter(r => r.id !== id) })

  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#1a1a2e' }}>
        {AI_DOC_TYPES[docType]} 컨텍스트 설정
      </div>

      {totalChars > CHAR_WARN && (
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8,
          padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#856404' }}>
          ⚠️ 입력 텍스트 합계: <strong>{totalChars.toLocaleString()}자</strong>.{'  '}
          이 이상이면 AI 토큰(비용)이 크게 증가합니다.{'  '}
          불필요한 내용은 정리해 주세요.
        </div>
      )}

      {/* 예시 문서 — 텍스트 입력만 지원 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: '#333' }}>예시 문서 양식 (텍스트 입력)</div>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 8, lineHeight: 1.5 }}>
          AI가 이 양식과 유사한 형식·수준으로 초안을 작성합니다.{'  '}
          빈 칸이 포함된 양식의 텍스트 버전을 붙여넣어 주세요.
        </div>
        <textarea value={ctx.example || ''} onChange={e => onChange({ ...ctx, example: e.target.value })}
          rows={7} placeholder="예시 문서 양식 붙여넣기"
          style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 8,
            fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'monospace' }} />
        <div style={{ fontSize: 11, color: '#aaa', textAlign: 'right', marginTop: 2 }}>
          {(ctx.example?.length || 0).toLocaleString()}자
        </div>
      </div>

      {/* 규격·고시 목록 */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>
            참조 규격·고시 ({(ctx.regulations || []).length}개)
          </div>
          <button onClick={addReg}
            style={{ padding: '4px 12px', background: '#1a1a2e', color: '#fff',
              border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>+ 추가</button>
        </div>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 12, lineHeight: 1.5 }}>
          원본 파일 첨부(파일명 AI 참조) 또는 조항 직접 입력 방식으로 관리하세요.{'  '}
          불필요한 규격은 삭제해 토큰 낭비를 줄이세요.
        </div>
        {(ctx.regulations || []).length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: '#aaa', fontSize: 13,
            border: '1px dashed #ddd', borderRadius: 8 }}>
            추가된 규격이 없습니다. 위 + 추가 버튼으로 등록하세요.
          </div>
        )}
        {(ctx.regulations || []).map((reg, idx) => (
          <RegItem key={reg.id} reg={reg} idx={idx}
            onChange={(updates) => updateReg(reg.id, updates)}
            onRemove={() => removeReg(reg.id)}
            onUpload={onUpload}
            uploading={uploading} />
        ))}
      </div>

      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e0e0e0',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 16 }}>
        {totalChars > 0 && (
          <span style={{ fontSize: 12, color: totalChars > CHAR_WARN ? '#dc2626' : '#888' }}>
            텍스트 합계: {totalChars.toLocaleString()}자
            {totalChars > CHAR_WARN && ' ⚠ 초과 주의'}
          </span>
        )}
        <button onClick={onSave} disabled={saving}
          style={{ padding: '8px 20px', background: '#1a3a2a', color: '#fff', border: 'none',
            borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  )
}

// 메인 컴포넌트
export default function RegStandardsTab() {
  const [selType,   setSelType]   = useState('sop')
  const [ctxMap,    setCtxMap]    = useState({})
  const [saving,    setSaving]    = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dbErr,     setDbErr]     = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data, error } = await supabase.from('ai_contexts').select('doc_type, example, regulations')
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) setDbErr('table_missing')
      return
    }
    if (data) {
      const m = {}
      data.forEach(r => {
        m[r.doc_type] = {
          example: r.example || '',
          regulations: Array.isArray(r.regulations)
            ? r.regulations.map(reg => ({ file_url: '', file_name: '', ...reg }))
            : []
        }
      })
      setCtxMap(m)
    }
  }

  async function uploadFile(file, callback) {
    setUploading(true)
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._\-가-힣]/g, '_')
      const path = selType + '/' + Date.now() + '_' + safeName
      const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false })
      if (error) {
        if (error.message?.includes('Bucket not found') || error.statusCode === '404' || error.error === 'Bucket not found') {
          alert('스토리지 버킷이 없습니다.\nSupabase 대시보드 → Storage → New Bucket\n이름: regulation-docs / Public: ON')
        } else {
          alert('업로드 실패: ' + error.message)
        }
        return
      }
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path)
      callback(urlData.publicUrl, file.name)
    } finally {
      setUploading(false)
    }
  }

  async function save(docType) {
    setSaving(true)
    const ctx = ctxMap[docType] || { example: '', regulations: [] }
    const { error } = await supabase.from('ai_contexts').upsert(
      { doc_type: docType, example: ctx.example, regulations: ctx.regulations, updated_at: new Date().toISOString() },
      { onConflict: 'doc_type' }
    )
    setSaving(false)
    if (error) { alert('저장 오류: ' + error.message); return }
    alert('저장되었습니다.')
  }

  const updateCtx = (ctx) => setCtxMap(prev => ({ ...prev, [selType]: ctx }))

  if (dbErr === 'table_missing') {
    return (
      <div>
        <div style={{ padding: '16px 20px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 10, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 15 }}>⚠ Supabase 테이블 생성 필요</div>
          <div style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.6 }}>
            <code>ai_contexts</code> 테이블이 없습니다. Supabase SQL Editor에서 아래 SQL을 실행해 주세요.
          </div>
          <pre style={{ background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 6,
            padding: 12, fontSize: 11, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
            {SETUP_SQL}
          </pre>
        </div>
      </div>
    )
  }

  const ctx = ctxMap[selType] || { example: '', regulations: [] }

  return (
    <div style={{ display: 'flex', gap: 0, minHeight: 500 }}>
      {/* 좌측: 문서 유형 목록 */}
      <div style={{ width: 220, borderRight: '1px solid #e0e0e0', paddingRight: 16, flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#888', marginBottom: 12 }}>문서 유형</div>
        {Object.entries(AI_DOC_TYPES).map(([k, v]) => {
          const c = ctxMap[k]
          const hasContent = c?.example || (c?.regulations || []).some(r => r.content || r.file_url)
          return (
            <button key={k} onClick={() => setSelType(k)}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px',
                marginBottom: 2, borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12,
                background: selType === k ? '#1a1a2e' : 'transparent',
                color: selType === k ? '#fff' : '#444',
                fontWeight: selType === k ? 700 : 400 }}>
              {hasContent ? '✓ ' : ''}{v}
            </button>
          )
        })}
      </div>

      {/* 우측: 편집 영역 */}
      <div style={{ flex: 1, paddingLeft: 24 }}>
        <RegContextEditor
          docType={selType} ctx={ctx} onChange={updateCtx}
          onSave={() => save(selType)} saving={saving}
          onUpload={uploadFile} uploading={uploading} />
      </div>
    </div>
  )
}
