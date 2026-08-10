// src/components/AppLayout.jsx
import React, { useEffect } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { deptAuth } from '../lib/deptAuth'

// #301: 부서 선택 정보는 localStorage(브라우저 캐시)에만 저장되어, 캐시를 삭제하면
// 홈 대시보드 진입 시마다 매번 부서 선택 화면이 강제로 뜨는 문제가 있었다(요청: 삭제).
// 강제 모달 팝업을 제거하고, 미선택 상태이면 조용히 '전체 보기'(ALL)로 기본 설정한다.
// (#374 — 이제 deptAuth.setDepartment()가 company_members.last_dept에도 함께 저장하고,
// ProtectedRoute가 로그인 시 이 기기에 로컬 선택이 없으면 그 값을 이어받으므로, 다른
// 기기·브라우저로 로그인해도 마지막 선택한 부서가 유지된다.)
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
