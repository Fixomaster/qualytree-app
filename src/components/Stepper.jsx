import React from 'react'
import { Check } from 'lucide-react'

const STEPS = [
  { num: 1, label: '회사', tag: 'ONB-001' },
  { num: 2, label: '제품', tag: 'ONB-002' },
  { num: 3, label: '공정', tag: 'ONB-003', star: true },
  { num: 4, label: '다중 규제', tag: 'ONB-004' },
  { num: 5, label: '역할·자격', tag: 'ONB-005' },
]

export default function Stepper({ current, completed = [] }) {
  return (
    <div className="flex items-center justify-between gap-2 max-w-[840px] mx-auto mb-8">
      {STEPS.map((s, i) => {
        const isActive = s.num === current
        const isDone = completed.includes(s.num)
        const isPast = s.num < current
        return (
          <React.Fragment key={s.num}>
            <div className="flex flex-col items-center gap-1.5 min-w-0 flex-1">
              <div
                className="flex items-center justify-center rounded-full text-[12px] font-medium transition-all"
                style={{
                  width: isActive ? 36 : 28,
                  height: isActive ? 36 : 28,
                  background: isDone
                    ? 'var(--leaf)'
                    : isActive
                    ? 'var(--moss)'
                    : isPast
                    ? 'var(--moss-mid)'
                    : 'var(--bg-soft)',
                  color: isDone || isActive || isPast ? 'var(--bg)' : 'var(--ink-faint)',
                  border: isActive ? '3px solid var(--leaf-soft)' : 'none',
                }}
              >
                {isDone ? <Check size={14} strokeWidth={2.5} /> : s.num}
              </div>
              <div className="text-center min-w-0 w-full px-1">
                <div
                  className="text-[12px] truncate"
                  style={{
                    color: isActive ? 'var(--ink)' : 'var(--ink-mute)',
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {s.label}
                  {s.star && (
                    <span className="ml-0.5" style={{ color: 'var(--amber)' }}>
                      ⭐
                    </span>
                  )}
                </div>
                <div
                  className="font-mono text-[9px] tracking-wider"
                  style={{ color: 'var(--ink-faint)' }}
                >
                  {s.tag}
                </div>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="h-px flex-1 -mt-7"
                style={{
                  background: completed.includes(s.num) ? 'var(--leaf)' : 'var(--line-strong)',
                  minWidth: 20,
                  maxWidth: 60,
                }}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
