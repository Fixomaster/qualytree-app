// src/components/DeptSelectModal.jsx
// 로그인 후 첫 화면: 부서 선택 모달
import React, { useState } from 'react'
import { DEPT_LIST } from '../lib/deptAuth'
import { auth } from '../lib/auth'

export default function DeptSelectModal({ onSelect }) {
  const [hovered, setHovered] = useState(null)
  const user = auth.current()

  // 관리자는 ALL 포함, 일반 사용자는 전부 표시
  const depts = DEPT_LIST

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 20,
          border: '1px solid var(--line)',
          maxWidth: 760,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        }}
      >
        {/* 헤더 */}
        <div style={{ padding: '28px 28px 20px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'var(--leaf-soft)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
              }}
            >
              🏢
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
                안녕하세요{user?.name ? `, ${user.name}님` : ''}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-faint)', marginTop: 2 }}>
                {user?.company?.name || 'Qualytree'} · 소속 부서를 선택하세요
              </div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 10, lineHeight: 1.6 }}>
            선택한 부서에 맞는 메뉴만 표시됩니다. 언제든지 사이드바 하단에서 변경할 수 있습니다.
          </p>
        </div>

        {/* 부서 그리드 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 10,
            padding: 20,
          }}
        >
          {depts.map((dept) => (
            <DeptCard
              key={dept.code}
              dept={dept}
              isHovered={hovered === dept.code}
              onMouseEnter={() => setHovered(dept.code)}
              onMouseLeave={() => setHovered(null)}
              onSelect={onSelect}
            />
          ))}
        </div>

        {/* 안내 */}
        <div
          style={{
            padding: '12px 20px 20px',
            textAlign: 'center',
            fontSize: 12,
            color: 'var(--ink-faint)',
          }}
        >
          부서를 모르는 경우 <strong style={{ color: 'var(--ink-soft)' }}>관리자에게 문의</strong>하거나{' '}
          <button
            onClick={() => onSelect('ALL')}
            style={{
              background: 'none', border: 'none',
              color: 'var(--moss)', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, textDecoration: 'underline',
              padding: 0,
            }}
          >
            전체 메뉴로 시작
          </button>
          하세요.
        </div>
      </div>
    </div>
  )
}

function DeptCard({ dept, isHovered, onMouseEnter, onMouseLeave, onSelect }) {
  return (
    <button
      onClick={() => onSelect(dept.code)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 6,
        padding: '14px 14px 12px',
        borderRadius: 14,
        border: `1.5px solid ${isHovered ? dept.color : 'var(--line)'}`,
        background: isHovered
          ? `${dept.color}12`
          : 'var(--bg-soft)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        textAlign: 'left',
        width: '100%',
        transform: isHovered ? 'translateY(-1px)' : 'none',
        boxShadow: isHovered ? `0 4px 16px ${dept.color}20` : 'none',
      }}
    >
      {/* 아이콘 */}
      <div
        style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${dept.color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
          transition: 'all 0.15s',
          transform: isHovered ? 'scale(1.1)' : 'none',
        }}
      >
        {dept.icon}
      </div>

      {/* 라벨 */}
      <div>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 700,
            color: isHovered ? dept.color : 'var(--ink)',
            transition: 'color 0.15s',
            lineHeight: 1.2,
          }}
        >
          {dept.label}
        </div>
        <div
          style={{
            fontSize: 10.5,
            color: 'var(--ink-faint)',
            marginTop: 3,
            lineHeight: 1.4,
          }}
        >
          {dept.desc}
        </div>
      </div>

      {/* 부서 코드 뱃지 */}
      <div
        style={{
          marginTop: 'auto',
          fontSize: 9,
          fontFamily: 'monospace',
          letterSpacing: '0.12em',
          padding: '2px 6px',
          borderRadius: 4,
          background: isHovered ? `${dept.color}20` : 'var(--bg)',
          color: isHovered ? dept.color : 'var(--ink-faint)',
          fontWeight: 600,
          transition: 'all 0.15s',
          border: `1px solid ${isHovered ? `${dept.color}30` : 'var(--line)'}`,
        }}
      >
        {dept.code}
      </div>
    </button>
  )
}
