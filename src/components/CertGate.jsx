import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { onboarding } from '../lib/onboardingState'

/**
 * 가입/온보딩에서 선택하지 않은 인증의 전용 화면(KGMP, 외국제조소 등)은
 * 사이드바에서 숨기는 것만으로는 직접 URL 접근을 막지 못한다.
 * 이 컴포넌트는 페이지 최상단에서 선택 여부를 다시 검증해 실제 입력·저장을
 * 막아준다 (사이드바 게이팅과 같은 onboarding.certs를 단일 출처로 사용).
 */
// #6/#7 — GMP신청 화면처럼 제조GMP·수입GMP 양쪽에서 함께 쓰는 화면은 인증 하나만으로
// 게이트를 걸면 수입GMP만 선택한 회사는 아예 화면에 들어가지 못하는 문제가 있었다.
// certId에 배열을 넘기면 그 중 하나라도 선택돼 있으면 통과시킨다(하위호환: 단일 문자열도 그대로 지원).
export default function CertGate({ certId, label, children }) {
  const nav = useNavigate()
  const certs = onboarding.load().certs || {}
  const ids = Array.isArray(certId) ? certId : [certId]

  if (ids.some((id) => certs[id])) return children

  return (
    <div className="px-6 lg:px-8 py-16 max-w-[560px] mx-auto text-center fade-in">
      <Lock size={26} style={{ color: 'var(--ink-faint)', margin: '0 auto 12px' }} />
      <div className="text-[15.5px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
        {label} 인증이 선택되어 있지 않습니다
      </div>
      <div className="text-[12.5px] leading-relaxed mb-4" style={{ color: 'var(--ink-soft)' }}>
        가입 시 선택한 인증에 {label}이(가) 포함되어 있지 않아 이 화면의 입력·저장 기능을 사용할 수 없습니다.
        온보딩에서 인증을 추가하면 이용할 수 있습니다.
      </div>
      <button
        onClick={() => nav('/onboarding')}
        className="px-4 py-2 rounded-lg text-[13px] font-medium"
        style={{ background: 'var(--moss)', color: 'var(--bg)' }}
      >
        온보딩에서 인증 추가하기
      </button>
    </div>
  )
}
