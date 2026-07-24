// src/components/AppLayout.jsx
import React, { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import DeptSelectModal from './DeptSelectModal'
import { deptAuth } from '../lib/deptAuth'

export default function AppLayout({ user, title, subtitle, children }) {
  const [showDeptModal, setShowDeptModal] = useState(false)

  useEffect(() => {
    // 부서 미선택 시 모달 표시 (첫 로그인)
    if (!deptAuth.getDepartment()) {
      setShowDeptModal(true)
    }

    // 다른 컴포넌트에서 모달을 열고 싶을 때 (선택적)
    const handler = (e) => {
      if (e.detail === null) setShowDeptModal(true)
    }
    window.addEventListener('qt-dept-changed', handler)
    return () => window.removeEventListener('qt-dept-changed', handler)
  }, [])

  const handleDeptSelect = (dept) => {
    deptAuth.setDepartment(dept)
    setShowDeptModal(false)
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <TopBar user={user} title={title} subtitle={subtitle} />
        <main>{children}</main>
      </div>

      {showDeptModal && (
        <DeptSelectModal onSelect={handleDeptSelect} />
      )}
    </div>
  )
}
