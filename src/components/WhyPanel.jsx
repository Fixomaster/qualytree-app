import React from 'react'
import { Info, BookOpen, ExternalLink } from 'lucide-react'

/**
 * "왜 이걸 묻는지" 패널.
 * Project Instructions §3 UX 원칙: "왜 이걸 입력해야 하는가",
 * "이게 어떤 서류의 어느 항목이 되는가"를 화면에서 즉시 보여준다.
 */
export default function WhyPanel({ title, body, refs = [], tone = 'leaf' }) {
  const accent = tone === 'amber' ? 'var(--amber)' : 'var(--leaf)'
  const bg = tone === 'amber' ? 'var(--amber-soft)' : 'var(--leaf-soft)'

  return (
    <div
      className="rounded-2xl p-5 sticky top-[88px]"
      style={{
        background: bg,
        border: `1px solid ${accent}`,
        opacity: 0.95,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Info size={14} style={{ color: accent }} />
        <span
          className="font-mono text-[10px] tracking-[0.18em] uppercase"
          style={{ color: accent }}
        >
          왜 이걸 묻는지
        </span>
      </div>
      <div className="font-display text-[16px] leading-tight" style={{ color: 'var(--ink)', fontWeight: 500 }}>
        {title}
      </div>
      <div className="mt-2.5 text-[13px] leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
        {body}
      </div>
      {refs.length > 0 && (
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(20,58,44,0.12)' }}>
          <div
            className="font-mono text-[9.5px] tracking-[0.18em] uppercase mb-2"
            style={{ color: 'var(--ink-mute)' }}
          >
            <BookOpen size={11} className="inline mr-1" />
            연결되는 서류·조항
          </div>
          <ul className="space-y-1">
            {refs.map((r, i) => (
              <li
                key={i}
                className="text-[11.5px] flex items-start gap-1.5"
                style={{ color: 'var(--ink-soft)' }}
              >
                <span style={{ color: accent }}>→</span>
                <span className="font-mono">{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
