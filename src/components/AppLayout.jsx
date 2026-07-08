import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function AppLayout({ user, title, subtitle, children }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('returnTo')
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <TopBar user={user} title={title} subtitle={subtitle} />
        {returnTo && (
          <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-2 flex items-center justify-between">
            <span className="text-sm text-indigo-700">저장이 완료되었다면 원래 보던 GMP 항목으로 돌아가서 충족 여부를 다시 확인할 수 있어요.</span>
            <button onClick={() => navigate(returnTo)} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 whitespace-nowrap ml-4">← GMP 항목으로 돌아가기</button>
          </div>
        )}
        <main>{children}</main>
      </div>
    </div>
  )
}
