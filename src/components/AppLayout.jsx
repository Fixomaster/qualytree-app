// src/components/AppLayout.jsx
import React, { useEffect } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { deptAuth } from '../lib/deptAuth'

// #301: 부서 선택 정보는 localStorage(브라우저 캐시)에만 저장되어, 캐시를 삭제하면
// 홈 대시보드 진입 시마다 매번 부서 선택 화면이 강제로 뜨는 문제가 있었다(요청: 삭제).
// 강제 모달 팝업을 제거하고, 미선택 상태이면 조용히 '전체 보기'(ALL)로 기본 설정한다.
// (#374 — deptAuth.ensureDepartment()를 거쳐서 기본값을 정한다. 예전에는 여기서 바로
// setDepartment('ALL')을 동기적으로 호출했는데, 그러면 이 효과가 항상 원격
// last_dept 조회(네트워크, 비동기)보다 먼저 끝나버려서 다른 기기로 로그인해도 절대
// 저장해둔 부서를 이어받지 못하는 경쟁 조건이 있었다. ensureDepartment는 로컬에 값이
// 없을 때만 원격을 먼저 확인하고, 그래도 없을 때 최종적으로 ALL로 기본 설정한다.)
export default function AppLayout({ user, title, subtitle, children }) {
  useEffect(() => {
    deptAuth.ensureDepartment()
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
