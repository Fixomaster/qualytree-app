// src/pages/operator/RegStandardsTab.jsx
// #210 규격·고시 관리 탭 — 슈퍼관리자 전용
// AI 버튼별 예시(1) + 규격·고시(N) 컨텍스트 설정
// 저장소: Supabase ai_contexts 테이블
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const AI_DOC_TYPES = {
  ncr:           '부적합품 (NCR)',
  capa:          'CAPA 조치',
  sop:           '표준작업절차서 (SOP)',
  risk:          '위험 관리 (ISO 14971)',
  complaint:     '고객불만 (ISO §8.2.1)',
  change:        '변경관리 (CCR)',
  supplier:      '공급업체 평가 (§7.4)',
  roledoc:       '조직책임문서',
  audit:         '심사 결과 (§8.2.2)',
  calibration:   '교정 성적서 (§7.6)',
  validation:    '공정 유효성확인 (§7.5.6)',
  inspection:    '공정검사 (§8.2.3/8.2.4)',
  manufacturing: '배치기록서 (BPR)',
}
const CHAR_WARN = 3000

const SETUP_SQL = `-- Supabase SQL 에디터에서 실행하세요:
CREATE TABLE IF NOT EXISTS public.ai_contexts (
  doc_type    TEXT PRIMARY KEY,
  example     TEXT DEFAULT '',
  regulations JSONB DEFAULT '[]',
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
-- 전체 사용자 읽기 허용 (AI 버튼에서 코드를 읽음)
ALTER TABLE public.ai_contexts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON public.ai_contexts FOR SELECT USING (true);
CREATE POLICY "auth write" ON public.ai_contexts FOR ALL USING (auth.role() = 'authenticated');`

// 단일 규격 아이템 에디터
function RegItem({ reg, idx, onChange, onRemove }) {
  return (
    <div style={{ border: '1px solid #e0e0e0', borderRadius: 10, padding: 14, marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: '#888', flexShrink: 0 }}>#{idx + 1}</span>
        <input value={reg.title} onChange={e => onChange('title', e.target.value)}
          placeholder="규격명 (예: ISO 13485 §7.5.1, KGMP 의약품 제조관리기준 제16조)"
          style={{ flex: 1, padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
        <button onClick={onRemove}
          style={{ padding: '4px 10px', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, flexShrink: 0 }}>
          삭제
        </button>
      </div>
      <textarea value={reg.content} onChange={e => onChange('content', e.target.value)}
        rows={5} placeholder="규격·고시 본문 내용을 붙여넣으세요…"
        style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 12,
          resize: 'vertical', boxSizing: 'border-box', fontFamily: 'monospace' }} />
      <div style={{ fontSize: 11, color: '#aaa', textAlign: 'right' }}>{(reg.content?.length || 0).toLocaleString()}자</div>
    </div>
  )
}

// 뺄우 컨텍스트 에디터
function RegContextEditor({ docType, ctx, onChange, onSave, saving }) {
  const totalChars = (ctx.example?.length || 0) +
    (ctx.regulations || []).reduce((a, r) => a + (r.content?.length || 0), 0)

  const addReg = () => onChange({ ...ctx,
    regulations: [...(ctx.regulations || []), { id: Date.now(), title: '', content: '' }] })

  const updateReg = (id, field, val) => onChange({ ...ctx,
    regulations: ctx.regulations.map(r => r.id === id ? { ...r, [field]: val } : r) })

  const removeReg = (id) => onChange({ ...ctx,
    regulations: ctx.regulations.filter(r => r.id !== id) })

  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#1a1a2e' }}>
        {AI_DOC_TYPES[docType]} 컨텍스트 설정
      </div>

      {totalChars > CHAR_WARN && (
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8,
          padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#856404' }}>
          ⚠️ 현재 입력된 콘텐츠: <strong>{totalChars.toLocaleString()}자</strong>.{'  '}
          너무 많은 내용은 AI 사용량(토큰)을 크게 증가시킵니다.{'  '}
          필요 없는 규격은 삭제해 주세요.
        </div>
      )}

      {/* 예시 서류 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: '#333' }}>📄 예시 문서 (선택)</div>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 8, lineHeight: 1.5 }}>
          AI가 이 예시와 유사한 형식·수준으로 초안을 작성합니다.{'  '}
          잘 작성된 대표 문서를 한 건 붙여 넣어 주세요.
        </div>
        <textarea value={ctx.example || ''} onChange={e => onChange({ ...ctx, example: e.target.value })}
          rows={7} placeholder="예시 문서 내용을 붙여넣으세요…"
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
            📋 적용 규격·고시 ({(ctx.regulations || []).length}건)
          </div>
          <button onClick={addReg}
            style={{ padding: '4px 12px', background: '#1a1a2e', color: '#fff',
              border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>+ 추가</button>
        </div>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 12, lineHeight: 1.5 }}>
          규격 내용이 많아질수록 AI 사용량(토큰)이 증가합니다.{'  '}
          코에 필요한 항목만 남경두고 나머지는 삭제해 주세요.
        </div>
        {(ctx.regulations || []).length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: '#aaa', fontSize: 13,
            border: '1px dashed #ddd', borderRadius: 8 }}>
            적용할 규격·고시가 없습니다. 위 + 추가 버튼을 눌러 입력하세요.
          </div>
        )}
        {(ctx.regulations || []).map((reg, idx) => (
          <RegItem key={reg.id} reg={reg} idx={idx}
            onChange={(f, v) => updateReg(reg.id, f, v)}
            onRemove={() => removeReg(reg.id)} />
        ))}
      </div>

      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e0e0e0',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 16 }}>
        {totalChars > 0 && (
          <span style={{ fontSize: 12, color: totalChars > CHAR_WARN ? '#dc2626' : '#888' }}>
            연동 콘텐츠 합계: {totalChars.toLocaleString()}자
            {totalChars > CHAR_WARN && ' ⚠️ 사용량 증가'}
          </span>
        )}
        <button onClick={onSave} disabled={saving}
          style={{ padding: '8px 20px', background: '#1a3a2a', color: '#fff', border: 'none',
            borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
          {saving ? '저장 중…' : '💾 저장'}
        </button>
      </div>
    </div>
  )
}

// 메인 컴포넌트
export default function RegStandardsTab() {
  const [selType, setSelType] = useState('sop')
  const [ctxMap,  setCtxMap]  = useState({})
  const [saving,  setSaving]  = useState(false)
  const [dbErr,   setDbErr]   = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data, error } = await supabase.from('ai_contexts').select('doc_type, example, regulations')
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        setDbErr('table_missing')
      }
      return
    }
    if (data) {
      const m = {}
      data.forEach(r => { m[r.doc_type] = { example: r.example || '', regulations: Array.isArray(r.regulations) ? r.regulations : [] } })
      setCtxMap(m)
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
    if (error) { alert('저장 실패: ' + error.message); return }
    alert('저장되었습니다.')
  }

  const updateCtx = (ctx) => setCtxMap(prev => ({ ...prev, [selType]: ctx }))

  // Supabase 테이블 미생성 안내
  if (dbErr === 'table_missing') {
    return (
      <div>
        <div style={{ padding: '16px 20px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 10, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 15 }}>
            ⚠️ Supabase 테이블 설정 필요
          </div>
          <div style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.6 }}>
            <code>ai_contexts</code> 테이블이 없습니다.
            Supabase 대시보드 → SQL Editor에서 아래 SQL을 실행해 주세요.
          </div>
          <pre style={{ background: '#1a1a2e', color: '#7ec8e3', padding: 16, borderRadius: 8,
            fontSize: 12, overflow: 'auto', lineHeight: 1.5, fontFamily: 'monospace' }}>
            {SETUP_SQL}
          </pre>
          <button onClick={() => { setDbErr(null); load() }}
            style={{ marginTop: 12, padding: '6px 16px', background: '#1a1a2e', color: '#fff',
              border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
            재시도
          </button>
        </div>
      </div>
    )
  }

  const hasCtx = (k) => !!(ctxMap[k]?.example || (ctxMap[k]?.regulations?.length ?? 0) > 0)

  return (
    <div style={{ display: 'flex', gap: 24, minHeight: 560 }}>
      {/* 왼쪽: AI 버튼 유형 목록 */}
      <div style={{ width: 210, flexShrink: 0, borderRight: '1px solid #e0e0e0', paddingRight: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#888', marginBottom: 10, letterSpacing: 0.5 }}>
          AI 버튼 유형
        </div>
        {Object.entries(AI_DOC_TYPES).map(([k, label]) => (
          <button key={k} onClick={() => setSelType(k)}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px',
              border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12.5, marginBottom: 2,
              background: selType === k ? '#1a1a2e' : 'transparent',
              color: selType === k ? '#fff' : '#333',
              fontWeight: selType === k ? 700 : 400 }}>
            {hasCtx(k) && <span style={{ color: selType === k ? '#7ec8e3' : '#16a34a', marginRight: 4 }}>●</span>}
            {label}
          </button>
        ))}
        <div style={{ marginTop: 16, fontSize: 11, color: '#aaa', lineHeight: 1.5 }}>
          ● 컨텍스트 설정됨
        </div>
      </div>
      {/* 오른쪽: 컨텍스트 에디터 */}
      <div style={{ flex: 1 }}>
        <RegContextEditor
          docType={selType}
          ctx={ctxMap[selType] || { example: '', regulations: [] }}
          onChange={updateCtx}
          onSave={() => save(selType)}
          saving={saving}
        />
      </div>
    </div>
  )
}
