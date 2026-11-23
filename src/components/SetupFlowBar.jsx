// src/components/SetupFlowBar.jsx — 화면 상단 "진행 안내 띠"
import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSetupFlow, STATUS_COLOR } from '../lib/setupFlow'

const HIDE_KEY = 'qualytree.setup_bar_hidden'

export default function SetupFlowBar() {
  const flow = useSetupFlow()
  const loc = useLocation()
  const nav = useNavigate()
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem(HIDE_KEY) === '1' } catch { return false } })
  if (!flow.length) return null

  const idx = flow.findIndex(s => loc.pathname === s.to || loc.pathname.startsWith(s.to + '/'))
  if (idx < 0) return null // 단계에 속한 화면에서만 표시
  const step = flow[idx]
  const prev = flow[idx - 1]
  const next = flow[idx + 1]
  const doneCount = flow.filter(s => s.done).length
  const pct = Math.round((doneCount / flow.length) * 100)

  if (hidden) {
    return (
      <div style={{ padding: '4px 24px', background: 'var(--bg-soft)', borderBottom: '1px solid var(--line)', fontSize: 11.5, color: 'var(--ink-soft)' }}>
        <button onClick={() => { try { localStorage.removeItem(HIDE_KEY) } catch {} setHidden(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--moss)', fontSize: 11.5 }}>
          ▸ 진행 안내 보기 ({doneCount}/{flow.length} 완료)
        </button>
      </div>
    )
  }

  const btn = { padding: '5px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', border: '1px solid var(--line)', background: '#fff', color: 'var(--ink)' }
  return (
    <div style={{ background: 'var(--leaf-soft)', borderBottom: '1px solid var(--leaf)', padding: '10px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ width: 26, height: 26, borderRadius: 13, background: STATUS_COLOR[step.done ? 'done' : 'doing'], color: '#fff', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {step.done ? '✓' : step.no}
        </span>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--moss)' }}>
            {step.no}/{flow.length} 단계 · {step.title}
            {step.recurring && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 500, color: '#b45f06', background: '#fff3e0', borderRadius: 10, padding: '1px 8px' }}>🔁 지속 입력: {step.recurring}</span>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
            {step.desc}{next && <> 다음은 <b>{next.title}</b>입니다.</>}
          </div>
        </div>
        <div style={{ width: 90, height: 5, background: 'var(--line)', borderRadius: 3, overflow: 'hidden' }} title={`${pct}% 완료`}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--moss)' }} />
        </div>
        {prev && <button style={btn} onClick={() => nav(prev.to)}>← {prev.title}</button>}
        {next && <button style={{ ...btn, background: 'var(--moss)', color: '#fff', border: 'none' }} onClick={() => nav(next.to)}>다음: {next.title} →</button>}
        <button onClick={() => { try { localStorage.setItem(HIDE_KEY, '1') } catch {} setHidden(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 12 }} title="접기">✕</button>
      </div>
    </div>
  )
}
