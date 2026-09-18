// src/components/GuideBanner.jsx — 사용 안내(가이드 투어) 바로가기 배너
// 로그인 후 "안내 영상을 어디서 보는지" 바로 찾을 수 있도록 홈·대시보드 상단에 표시한다.
// 사용자가 '다시 보지 않기'를 누르면 localStorage(qt.guideBanner)에 저장되어 더 이상 표시되지 않는다.
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlayCircle, X } from 'lucide-react'

const TOURS = [
  { slug: 'onboarding', title: '온보딩 5단계', dur: '1:34' },
  { slug: 'documents', title: '품질문서 작성과 승인', dur: '1:45' },
  { slug: 'inspection', title: '검사 단계 입력', dur: '1:42' },
  { slug: 'change-control', title: '입력값 수정과 변경관리', dur: '1:38' },
]

export default function GuideBanner() {
  const nav = useNavigate()
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem('qt.guideBanner') === 'off' } catch { return false }
  })
  if (hidden) return null
  return (
    <div className="mb-5 rounded-xl border p-4" style={{ background: 'var(--leaf-soft)', borderColor: 'var(--leaf)' }}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <PlayCircle size={18} strokeWidth={1.9} style={{ color: 'var(--moss)' }} />
          <h3 className="text-[14px] font-semibold" style={{ color: 'var(--moss)' }}>
            사용 안내 영상 — 실제 화면을 따라가며 4편
          </h3>
        </div>
        <button
          type="button"
          aria-label="배너 닫기"
          className="inline-flex items-center gap-1 text-[11.5px]"
          style={{ color: 'var(--ink-mute)', background: 'none', border: 'none' }}
          onClick={() => { try { localStorage.setItem('qt.guideBanner', 'off') } catch {} setHidden(true) }}
        >
          다시 보지 않기 <X size={13} />
        </button>
      </div>
      <p className="text-[12.5px] mb-3" style={{ color: 'var(--ink-soft)' }}>
        입력한 값이 어디에 저장되고 어느 문서로 이어지는지 화면 그대로 보여줍니다. 나중에 다시 볼 때는 왼쪽 메뉴의 <b>사용 안내</b> 또는 화면 오른쪽 위 <b>사용 안내</b> 버튼을 누르세요.
      </p>
      <div className="flex flex-wrap gap-2">
        {TOURS.map((t) => (
          <button
            key={t.slug}
            type="button"
            onClick={() => nav('/guides/' + t.slug)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12.5px] transition"
            style={{ background: '#fff', color: 'var(--ink)', border: '1px solid var(--leaf)' }}
          >
            <PlayCircle size={14} strokeWidth={1.9} style={{ color: 'var(--moss)' }} />
            {t.title}
            <span className="font-mono text-[11px]" style={{ color: 'var(--ink-mute)' }}>{t.dur}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
