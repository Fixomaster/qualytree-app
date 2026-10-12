// src/components/AppLayout.jsx
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { deptAuth } from '../lib/deptAuth'
import { auth } from '../lib/auth'

// #301: 부서 선택 정보는 localStorage(브라우저 캐시)에만 저장되어, 캐시를 삭제하면
// 홈 대시보드 진입 시마다 매번 부서 선택 화면이 강제로 뜨는 문제가 있었다(요청: 삭제).
// 강제 모달 팝업을 제거하고, 미선택 상태이면 조용히 '전체 보기'(ALL)로 기본 설정한다.
// (#374 — deptAuth.ensureDepartment()를 거쳐서 기본값을 정한다. 예전에는 여기서 바로
// setDepartment('ALL')을 동기적으로 호출했는데, 그러면 이 효과가 항상 원격
// last_dept 조회(네트워크, 비동기)보다 먼저 끝나버려서 다른 기기로 로그인해도 절대
// 저장해둔 부서를 이어받지 못하는 경쟁 조건이 있었다. ensureDepartment는 로컬에 값이
// 없을 때만 원격을 먼저 확인하고, 그래도 없을 때 최종적으로 ALL로 기본 설정한다.)
export default function AppLayout({ user: userProp, title, subtitle, children }) {
  useEffect(() => {
    deptAuth.ensureDepartment()
  }, [])

  // user prop 없으면 auth.current() fallback
  const user = userProp ?? auth.current()

  const [viewingAs, setViewingAs] = useState(() => auth.viewingAs())
  useEffect(() => {
    const h = () => setViewingAs(auth.viewingAs())
    window.addEventListener('qualytree:viewAsChanged', h)
    return () => window.removeEventListener('qualytree:viewAsChanged', h)
  }, [])
  const navigate = useNavigate()
  const exitViewAs = () => { auth.exitViewAs(); navigate('/operator') }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <TopBar user={user} title={title} subtitle={subtitle} />
        {viewingAs && (
          <div style={{ background:'#1c1917', color:'#fff', padding:'8px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:13 }}>
            <span>🏢 <b>{viewingAs.name}</b> 계정으로 접속 중 — 슈퍼관리자 뷰</span>
            <button onClick={exitViewAs} style={{ background:'#fff', color:'#1c1917', border:'none', borderRadius:6, padding:'4px 12px', fontSize:12, fontWeight:600, cursor:'pointer' }}>나가기 ×</button>
          </div>
        )}
        <main>{children}</main>
        <footer style={{borderTop:'1px solid #e8e5de',background:'#fafaf8',padding:'20px 24px',fontSize:12,color:'#999',marginTop:'auto'}}>
          <div style={{display:'flex',gap:16,marginBottom:10,flexWrap:'wrap'}}>
            <a href="https://qualy-tree.com/terms" target="_blank" rel="noopener noreferrer" style={{color:'#666',textDecoration:'none'}}>이용약관</a>
            <a href="https://qualy-tree.com/privacy" target="_blank" rel="noopener noreferrer" style={{color:'#666',textDecoration:'none',fontWeight:600}}>개인정보처리방침</a>
            <a href="https://qualy-tree.com/refund-policy" target="_blank" rel="noopener noreferrer" style={{color:'#666',textDecoration:'none'}}>환불정책</a>
            <a href="https://qualy-tree.com/pricing" target="_blank" rel="noopener noreferrer" style={{color:'#666',textDecoration:'none'}}>요금제·서비스 안내</a>
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:'4px 20px',marginBottom:6}}>
            <span><b style={{color:'#666',fontWeight:600}}>상호명</b> 주식회사 퀄리트리</span>
            <span><b style={{color:'#666',fontWeight:600}}>대표자명</b> 이경혁</span>
            <span><b style={{color:'#666',fontWeight:600}}>사업장 주소</b> 경기도 여주시 세종대왕면 양화로 738, 3층 301호</span>
            <span><b style={{color:'#666',fontWeight:600}}>사업자등록번호</b> 496-81-03944</span>
            <span><b style={{color:'#666',fontWeight:600}}>연락처</b> 010-3116-5997</span>
            <span><b style={{color:'#666',fontWeight:600}}>이메일</b> contact@qualy-tree.com</span>
          </div>
          <div>© 2026 QUALYTREE CO., LTD. — QUALITY GROWS LIKE A TREE.</div>
        </footer>
      </div>
    </div>
  )
}
