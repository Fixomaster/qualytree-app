import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, Lock, ArrowRight } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import { LEVELS, LEVEL_LABEL, PERMISSIONS } from '../../lib/permissions'

const ROLE_LABEL = { 1: '작업자', 2: '검사관', 3: '매니저' }

const AREA_LABEL = {
  company: '회사·조직',
  onb: '온보딩·제품·문서',
  eq: '설비·교정',
  sup: '공급자',
  ops: '현장 운영',
  audit: '내부심사',
  training: '교육훈련',
  mr: '경영검토',
  qms: '품질(NCR·CAPA)',
  ra: '인허가',
}

function groupPermissions() {
  const groups = {}
  Object.entries(PERMISSIONS).forEach(([key, level]) => {
    const area = key.split('.')[0]
    const label = AREA_LABEL[area] || area
    if (!groups[label]) groups[label] = []
    groups[label].push({ key, level })
  })
  return groups
}

export default function PermissionAdmin() {
  const user = auth.current()
  const curLevel = auth.currentLevel()
  const [ctx, setCtx] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (curLevel < LEVELS.MANAGER) { setLoading(false); return }
    supabase.rpc('manager_context').then(({ data }) => { setCtx(data || null); setLoading(false) })
  }, [curLevel])

  if (curLevel < LEVELS.MANAGER) {
    return (
      <AppLayout user={user} title="권한 관리" subtitle="회사 관리">
        <div className="px-6 lg:px-8 py-16 max-w-[640px] mx-auto text-center fade-in">
          <Lock size={28} style={{ color: 'var(--ink-faint)', margin: '0 auto 12px' }} />
          <div className="text-[16px] font-medium mb-1" style={{ color: 'var(--ink)' }}>매니저 권한이 필요합니다</div>
          <div className="text-[13px]" style={{ color: 'var(--ink-soft)' }}>
            현재 권한: {LEVEL_LABEL[curLevel]?.ko || '알 수 없음'}
          </div>
        </div>
      </AppLayout>
    )
  }

  const members = (ctx && Array.isArray(ctx.members)) ? ctx.members : []
  const groups = groupPermissions()

  return (
    <AppLayout user={user} title="권한 관리" subtitle="3단계 권한(Level) 기준 — 작업자 · 검사관 · 매니저·RA">
      <div className="px-6 lg:px-8 py-6 max-w-[1100px] mx-auto fade-in">

        {/* 권한 레벨 요약 */}
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((lv) => (
            <div key={lv} className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={15} style={{ color: 'var(--moss)' }} />
                <span className="text-[13.5px] font-medium" style={{ color: 'var(--ink)' }}>{LEVEL_LABEL[lv].ko}</span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ color: 'var(--ink-faint)', background: 'var(--bg-soft)' }}>Level {lv}</span>
              </div>
              <div className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>
                {lv === 1 && '공정 시작·측정값 입력·전자서명'}
                {lv === 2 && '작업자 권한 + 검토·재측정 요청·심사·교육 실시'}
                {lv === 3 && '검사관 권한 + 문서 정의·발행·삭제·최종 승인'}
              </div>
            </div>
          ))}
        </div>

        {/* 팀원 현재 권한 */}
        <div className="rounded-xl overflow-hidden mb-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--line)' }}>
            <span className="text-[13.5px] font-medium" style={{ color: 'var(--ink)' }}>팀원 권한 현황</span>
            <Link to="/manager/accounts" className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--moss)' }}>
              계정에서 변경 <ArrowRight size={12} />
            </Link>
          </div>
          {loading ? (
            <div className="px-4 py-6 text-[13px] text-center" style={{ color: 'var(--ink-faint)' }}>불러오는 중...</div>
          ) : members.length === 0 ? (
            <div className="px-4 py-6 text-[13px] text-center" style={{ color: 'var(--ink-faint)' }}>등록된 팀원이 없습니다.</div>
          ) : (
            <table className="w-full text-[13px]">
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} style={{ borderTop: '1px solid var(--line)' }}>
                    <td className="px-4 py-2.5" style={{ color: 'var(--ink)' }}>{m.name}{m.is_admin && ' (관리자)'}</td>
                    <td className="px-4 py-2.5 text-right" style={{ color: 'var(--ink-soft)' }}>
                      {ROLE_LABEL[m.permission_level] || m.permission_level} · Level {m.permission_level}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 액션별 필요 권한 매트릭스 */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
            <span className="text-[13.5px] font-medium" style={{ color: 'var(--ink)' }}>영역별 필요 권한</span>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
            {Object.entries(groups).map(([area, items]) => (
              <div key={area} className="px-4 py-3" style={{ borderTop: '1px solid var(--line)' }}>
                <div className="text-[12px] font-mono uppercase tracking-wide mb-2" style={{ color: 'var(--ink-faint)' }}>{area}</div>
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
                  {items.map(({ key, level }) => (
                    <div key={key} className="flex items-center justify-between text-[12.5px]">
                      <span style={{ color: 'var(--ink-soft)' }}>{key}</span>
                      <span className="font-mono text-[10.5px] px-1.5 py-0.5 rounded shrink-0" style={{ color: 'var(--moss)', background: 'var(--leaf-soft)' }}>
                        {LEVEL_LABEL[level].ko}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
