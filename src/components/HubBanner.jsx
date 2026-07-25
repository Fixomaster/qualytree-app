// src/components/HubBanner.jsx
// Shared hub banner — gradient header matching DeptHome style
// Props: title, subtitle, icon (lucide component), color, quickActions[], workflow[]
import React from 'react'
import { ChevronRight } from 'lucide-react'

export default function HubBanner({
  title,
  subtitle,
  icon: Icon,
  color = '#6366F1',
  quickActions = [],
  workflow = [],
}) {
  return (
    <div
      className="mb-6 rounded-3xl overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${color}1e 0%, ${color}09 100%)`,
        border: `1px solid ${color}2c`,
      }}
    >
      {/* 헤더 행 */}
      <div className="px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}22` }}
          >
            {Icon && <Icon size={24} style={{ color }} />}
          </div>
          <div>
            <div className="text-[18px] font-bold" style={{ color: 'var(--ink)' }}>
              {title}
            </div>
            <div className="text-[12px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
              {subtitle}
            </div>
          </div>
        </div>

        {quickActions.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {quickActions.map((a, i) => {
              const AI = a.icon
              return (
                <button
                  key={i}
                  onClick={a.onClick}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all"
                  style={{
                    background: a.primary ? color : `${color}18`,
                    color: a.primary ? 'white' : color,
                    border: a.primary ? 'none' : `1px solid ${color}30`,
                    cursor: 'pointer',
                  }}
                >
                  {AI && <AI size={14} />}
                  {a.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* 업무 흐름 */}
      {workflow.length > 0 && (
        <div
          className="px-6 py-3 flex items-center gap-1.5 flex-wrap border-t overflow-x-auto"
          style={{ borderColor: `${color}18`, background: `${color}08` }}
        >
          <span
            className="text-[10.5px] font-bold mr-1 flex-shrink-0"
            style={{ color: `${color}bb` }}
          >
            업무 흐름
          </span>
          {workflow.map((step, i) => (
            <React.Fragment key={i}>
              <span
                className="flex items-center gap-1.5 text-[11.5px] px-2.5 py-1 rounded-full flex-shrink-0"
                style={{ background: `${color}14`, color: 'var(--ink-soft)' }}
              >
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                  style={{ background: color, color: 'white' }}
                >
                  {i + 1}
                </span>
                {step}
              </span>
              {i < workflow.length - 1 && (
                <ChevronRight size={11} style={{ color: `${color}50`, flexShrink: 0 }} />
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  )
}
