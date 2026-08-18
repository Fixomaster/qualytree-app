// src/components/AppLayout.jsx
import React, { useEffect } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import GlobalSearch from './GlobalSearch'
import { deptAuth } from '../lib/deptAuth'

// #301: ë¶ì ì í ì ë³´ë localStorage(ë¸ë¼ì°ì  ìºì)ìë§ ì ì¥ëì´, ìºìë¥¼ ì­ì íë©´
// í ëìë³´ë ì§ì ìë§ë¤ ë§¤ë² ë¶ì ì í íë©´ì´ ê°ì ë¡ ë¨ë ë¬¸ì ê° ììë¤(ìì²­: ì­ì ).
// ê°ì  ëª¨ë¬ íìì ì ê±°íê³ , ë¯¸ì í ìíì´ë©´ ì¡°ì©í 'ì ì²´ ë³´ê¸°'(ALL)ë¡ ê¸°ë³¸ ì¤ì íë¤.
// (#374 â deptAuth.ensureDepartment()ë¥¼ ê±°ì³ì ê¸°ë³¸ê°ì ì íë¤. ìì ìë ì¬ê¸°ì ë°ë¡
// setDepartment('ALL')ì ëê¸°ì ì¼ë¡ í¸ì¶íëë°, ê·¸ë¬ë©´ ì´ í¨ê³¼ê° í­ì ìê²©
// last_dept ì¡°í(ë¤í¸ìí¬, ë¹ëê¸°)ë³´ë¤ ë¨¼ì  ëëë²ë ¤ì ë¤ë¥¸ ê¸°ê¸°ë¡ ë¡ê·¸ì¸í´ë ì ë
// ì ì¥í´ë ë¶ìë¥¼ ì´ì´ë°ì§ ëª»íë ê²½ì ì¡°ê±´ì´ ììë¤. ensureDepartmentë ë¡ì»¬ì ê°ì´
// ìì ëë§ ìê²©ì ë¨¼ì  íì¸íê³ , ê·¸ëë ìì ë ìµì¢ì ì¼ë¡ ALLë¡ ê¸°ë³¸ ì¤ì íë¤.)
export default function AppLayout({ user, title, subtitle, children }) {
  useEffect(() => {
    deptAuth.ensureDepartment()
  }, [])

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <TopBar user={user} title={title} subtitle={subtitle} />
        <GlobalSearch />
        <main>{children}</main>
      </div>
    </div>
  )
}
