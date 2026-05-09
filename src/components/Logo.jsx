import React from 'react'

export default function Logo({ size = 28, showText = true, color = 'var(--moss)' }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
        <path d="M14 24 V8" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M14 13 C14 13 9 12 7 9" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
        <path d="M14 11 C14 11 19 10 21 7" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
        <path d="M14 16 C14 16 10 16 8 14" stroke="var(--leaf)" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M14 18 C14 18 18 18 20 16" stroke="var(--leaf)" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="7" cy="9" r="1.6" fill="var(--amber)" />
        <circle cx="21" cy="7" r="1.6" fill="var(--leaf)" />
        <circle cx="20" cy="16" r="1.4" fill="var(--moss-mid)" />
      </svg>
      {showText && (
        <span
          className="font-display tracking-tight"
          style={{ color: 'var(--ink)', fontSize: size * 0.78, fontWeight: 500 }}
        >
          Qualytree
        </span>
      )}
    </span>
  )
}
