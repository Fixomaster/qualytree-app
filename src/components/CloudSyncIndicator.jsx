// src/components/CloudSyncIndicator.jsx
// 개선과제 #6 — "cloudSync 초기화 시점 UI 표시": 로그인 후 Supabase와 동기화하는
// 동안 화면 우하단에 작은 로딩 표시를 띄운다. 동기화가 끝나면 잠깐 완료 표시 후
// 자동으로 사라진다. 실패해도 화면을 막지 않으므로 에러 표시도 조용히(자동 사라짐).
import React, { useEffect, useState, useRef } from 'react'
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { getSyncStatus, subscribeSyncStatus } from '../lib/cloudSync'

export default function CloudSyncIndicator() {
  const [status, setStatus] = useState(() => getSyncStatus())
  const [visible, setVisible] = useState(false)
  const hideTimer = useRef(null)

  useEffect(() => {
    const unsub = subscribeSyncStatus((s) => {
      setStatus(s)
      if (s === 'syncing') {
        setVisible(true)
        if (hideTimer.current) clearTimeout(hideTimer.current)
      } else if (s === 'done' || s === 'error') {
        setVisible(true)
        if (hideTimer.current) clearTimeout(hideTimer.current)
        hideTimer.current = setTimeout(() => setVisible(false), 1800)
      }
    })
    return () => { unsub(); if (hideTimer.current) clearTimeout(hideTimer.current) }
  }, [])

  if (!visible) return null

  const cfg = {
    syncing: { icon: Loader2, spin: true,  bg: '#EFF6FF', border: '#BFDBFE', color: '#1D4ED8', text: '회사 데이터 동기화 중...' },
    done:    { icon: CheckCircle2, spin: false, bg: '#ECFDF5', border: '#A7F3D0', color: '#047857', text: '동기화 완료' },
    error:   { icon: AlertTriangle, spin: false, bg: '#FEF2F2', border: '#FECACA', color: '#B91C1C', text: '동기화 지연 중 (오프라인처럼 계속 사용 가능)' },
  }[status] || null
  if (!cfg) return null
  const Icon = cfg.icon

  return (
    <div
      style={{
        position: 'fixed', right: 18, bottom: 18, zIndex: 9999,
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '9px 14px', borderRadius: 999,
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
        fontSize: 12.5, fontWeight: 600, color: cfg.color,
        transition: 'opacity 0.2s',
      }}
    >
      <Icon size={14} style={cfg.spin ? { animation: 'qt-spin 1s linear infinite' } : undefined} />
      <span>{cfg.text}</span>
      <style>{'@keyframes qt-spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }'}</style>
    </div>
  )
}
