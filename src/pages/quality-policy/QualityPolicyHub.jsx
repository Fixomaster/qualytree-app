// src/pages/quality-policy/QualityPolicyHub.jsx
// ISO 13485 §5.3 품질 방침
import React, { useState } from 'react'
import { Edit2, Save, X, Award } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'

// ── 상수 ─────────────────────────────────────────────────────
const LS_KEY_POLICY = 'qualytree.quality_policy'

const DEFAULT_POLICY = {
  statement: '', // 품질 방침 선언문
}

// ── 메인 ─────────────────────────────────────────────────────
export default function QualityPolicyHub() {
  const user = auth.current()
  const canEdit = user?.level >= 2

  const [policy, setPolicy] = useState(() => {
    try { return { ...DEFAULT_POLICY, ...JSON.parse(localStorage.getItem(LS_KEY_POLICY) || '{}') } } catch { return DEFAULT_POLICY }
  })
  const [draft, setDraft] = useState(null)
  const [editing, setEditing] = useState(false)

  function savePolicy() {
    const updated = { ...policy, ...draft }
    setPolicy(updated)
    localStorage.setItem(LS_KEY_POLICY, JSON.stringify(updated))
    setEditing(false)
    setDraft(null)
  }

  function startEdit() { setDraft({ ...policy }); setEditing(true) }
  function cancelEdit() { setEditing(false); setDraft(null) }

  return (
    <AppLayout user={user} title="경영 의지·품질 방침" subtitle="ISO 13485 §5.3 품질 방침">
      <div className="px-6 lg:px-8 py-6 max-w-[900px] mx-auto">

        <div className="flex justify-end mb-4">
          {canEdit && !editing && (
            <button onClick={startEdit}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
              style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
              <Edit2 size={13} /> 편집
            </button>
          )}
          {editing && (
            <div className="flex gap-2">
              <button onClick={savePolicy}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
                style={{ background: 'var(--moss)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                <Save size={13} /> 저장
              </button>
              <button onClick={cancelEdit}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px]"
                style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
                <X size={13} /> 취소
              </button>
            </div>
          )}
        </div>

        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1.5px solid #2563EB30' }}>
          <div className="flex items-center gap-2 mb-4">
            <span style={{ color: '#2563EB' }}><Award size={15} /></span>
            <span className="font-bold text-[14px]" style={{ color: '#2563EB' }}>품질 방침</span>
          </div>
          {editing ? (
            <textarea value={draft.statement || ''} onChange={e => setDraft(d => ({ ...d, statement: e.target.value }))}
              rows={10} placeholder="품질 방침은 조직의 품질에 대한 의도와 방향을 공식적으로 표명한 것으로..."
              className="w-full px-3 py-2 rounded-xl text-[13px] resize-none"
              style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
          ) : (
            policy.statement
              ? <p className="text-[13.5px] whitespace-pre-line" style={{ color: 'var(--ink)' }}>{policy.statement}</p>
              : <p className="text-[12.5px]" style={{ color: 'var(--ink-faint)' }}>품질 방침이 아직 작성되지 않았습니다. 편집 버튼을 눌러 작성하세요.</p>
          )}
        </div>

      </div>
    </AppLayout>
  )
}
