import React from 'react';
import { ChevronRight } from 'lucide-react';

/**
 * HubBanner — 모든 Hub 페이지 상단 대형 그라디언트 배너
 * Props:
 *   title       string   — 허브 제목
 *   subtitle    string   — 설명 (ISO 조항 등)
 *   icon        Component — lucide-react 아이콘 컴포넌트
 *   color       string   — hex 색상 (#059669)
 *   quickActions array   — [{label, icon, onClick, primary}]
 *   workflow    array    — ['단계1', '단계2', ...]
 */
export default function HubBanner({
  title = '',
  subtitle = '',
  icon: Icon,
  color = '#2563EB',
  quickActions = [],
  workflow = [],
}) {
  const hex = color.startsWith('#') ? color : '#2563EB';

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${hex}22 0%, ${hex}0a 100%)`,
        border: `1px solid ${hex}33`,
        borderRadius: '12px',
        padding: '24px 28px',
        marginBottom: '24px',
      }}
    >
      {/* 상단: 아이콘 + 제목 + 부제목 + 액션버튼 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
        {/* 왼쪽 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: 1 }}>
          {Icon && (
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '12px',
                background: `${hex}22`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon size={26} color={hex} />
            </div>
          )}
          <div style={{ flex: 1 }}>
            <h1 style={{
              fontSize: '22px',
              fontWeight: 700,
              color: '#111827',
              margin: 0,
              lineHeight: 1.3,
            }}>
              {title}
            </h1>
            {subtitle && (
              <p style={{
                fontSize: '13px',
                color: '#6B7280',
                margin: '6px 0 0',
                lineHeight: 1.6,
              }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* 오른쪽: 액션 버튼들 */}
        {quickActions.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
            {quickActions.map((action, i) => {
              const ActionIcon = action.icon;
              return (
                <button
                  key={i}
                  onClick={action.onClick}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: action.primary ? 'none' : `1px solid ${hex}44`,
                    background: action.primary ? hex : 'white',
                    color: action.primary ? 'white' : hex,
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  {ActionIcon && <ActionIcon size={15} />}
                  {action.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 하단: 업무 흐름 */}
      {workflow.length > 0 && (
        <div style={{
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: `1px solid ${hex}22`,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '11px', color: '#9CA3AF', marginRight: '4px', fontWeight: 600, whiteSpace: 'nowrap' }}>업무 흐름</span>
          {workflow.map((step, i) => (
            <React.Fragment key={i}>
              <span style={{
                fontSize: '12px',
                color: hex,
                background: `${hex}15`,
                padding: '3px 10px',
                borderRadius: '20px',
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}>
                {step}
              </span>
              {i < workflow.length - 1 && (
                <ChevronRight size={13} color='#D1D5DB' />
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
