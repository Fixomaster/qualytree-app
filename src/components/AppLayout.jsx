import React from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function AppLayout({ user, title, subtitle, children }) {
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
