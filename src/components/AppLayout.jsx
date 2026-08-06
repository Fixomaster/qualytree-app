// src/components/AppLayout.jsx
import React, { useEffect } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { deptAuth } from '../lib/deptAuth'

// #301: 부서 선택 정보는 localStorage(브라우저 캐시)에만 저장되어, 캐시를 삭제하면
// 홈 대시보드 진입 시마다 매번 부서 선택 화면이 강제로 뜨는 문제가 있었다(요청: 삭제).
// 강제 모달 팝업을 제거하고, 미선택 상태이면 조용히 '전체 보기'(ALL)로 기본 설정한다.
// (근본 원인은 부서 선택이 서버(Supabase)가 아닌 로컬 캐시 기반이라는 점 — 계정 간
// 영구적으로 공유·유지하려면 추후 Supabase 사용자 프로필에 저장하는 방식으로 이전 필요.)
export default function AppLayout({ user, title, subtitle, children }) {
  useEffect(() => {
    if (!deptAuth.getDepartment()) {
      deptAuth.setDepartment('ALL')
    }
  }, [])

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <TopBar user={user} title={title} subtitle={subtitle} />
        <main>{children}</main>
      </div>
    </div>
  )
}
