// src/pages/quality-policy/QualityPolicyHub.jsx
// ISO 13485 §5.3 품질 방침 / §5.4.1 품질 목표 (통합 — #360)
import React, { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Edit2, Save, X, Award, Target } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import { QualityObjectivesPanel } from '../quality-objectives/QualityObjectivesHub'

// ── 상수 ─────────────────────────────────────────────────────
const LS_KEY_POLICY = 'qualytree.quality_policy'

const DEFAULT_POLICY = {
  statement: '', // 품질 방침 선언문
}

const TABS = [
  { key: 'policy', label: '품질 방침', icon: Award },
  { key: 'objectives', label: '품질 목표', icon: Target },
]

// ── 메인 ─────────────────────────────────────────────────────
export default function QualityPolicyHub() {
  const user = auth.current()
  const canEdit = user?.level >= 2
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = TABS.some(t => t.key === searchParams.get('tab')) ? searchParams.get('tab') : 'policy'
  const [tab, setTab] = useState(initialTab)
  const changeTab = (k) => { setTab(k); setSearchParams(k === 'policy' ? {} : { tab: k }, { replace: true }) }

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
    <AppLayout user={user} title="경영 의지·품질 방침" subtitle="ISO 13485 §5.3 품질 방침 / §5.4.1 품질 목표">
      <div className="px-6 lg:px-8 py-6 max-w-[1400px] mx-auto">

        {/* 탭 — #360: 품질목표를 품질방침 메뉴로 통합 */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-soft)' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => changeTab(t.key)}
              className="px-4 py-1.5 rounded-lg text-[13px] font-semibold transition flex items-center gap-1.5"
              style={{
                background: tab === t.key ? 'var(--bg-card)' : 'transparent',
                color: tab === t.key ? 'var(--moss)' : 'var(--ink-soft)',
                boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                border: 'none', cursor: 'pointer',
              }}>
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'policy' && (
          <div className="max-w-[900px]">
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

            <div className="mt-4 p-4 rounded-2xl text-[12.5px]" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF' }}>
              품질 목표는 위 품질 방침에 근거하여 설정합니다. <button onClick={() => changeTab('objectives')} className="underline font-semibold" style={{ background: 'none', border: 'none', color: '#1E40AF', cursor: 'pointer' }}>품질 목표 탭</button>에서 관리하세요.
            </div>
          </div>
        )}

        {tab === 'objectives' && <QualityObjectivesPanel />}

      </div>
    </AppLayout>
  )
}
