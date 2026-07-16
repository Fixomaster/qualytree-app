import React from 'react'
import { Link } from 'react-router-dom'
import { Building2, Users, ShieldCheck, ArrowRight, Lock } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import { LEVELS, LEVEL_LABEL } from '../../lib/permissions'

const CARDS = [
  {
    to: '/company',
    icon: Building2,
    title: '회사 정보',
    desc: '사업자등록증·제조업허가증 등 회사문서함, 조직도, 품질책임자 지정을 관리합니다.',
  },
  {
    to: '/manager/accounts',
    icon: Users,
    title: '사용자 관리',
    desc: '작업자·검사관 계정을 발급하고 승인·정지·비밀번호 재발급 등 계정 상태를 관리합니다.',
  },
  {
    to: '/admin/permissions',
    icon: ShieldCheck,
    title: '권한 관리',
    desc: '작업자·검사관·매니저 3단계 권한별로 어떤 작업이 가능한지 확인하고, 팀원의 현재 권한 등급을 조회합니다.',
  },
]

export default function AdminHub() {
  const user = auth.current()
  const level = auth.currentLevel()

  if (level < LEVELS.MANAGER) {
    return (
      <AppLayout user={user} title="관리자" subtitle="회사 관리">
        <div className="px-6 lg:px-8 py-16 max-w-[640px] mx-auto text-center fade-in">
          <Lock size={28} style={{ color: 'var(--ink-faint)', margin: '0 auto 12px' }} />
          <div className="text-[16px] font-medium mb-1" style={{ color: 'var(--ink)' }}>매니저 권한이 필요합니다</div>
          <div className="text-[13px]" style={{ color: 'var(--ink-soft)' }}>
            현재 권한: {LEVEL_LABEL[level]?.ko || '알 수 없음'} · 회사 관리 화면은 매니저·RA 권한(Level 3) 이상만 접근할 수 있습니다.
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout user={user} title="관리자" subtitle="회사 정보 · 사용자 관리 · 권한 관리">
      <div className="px-6 lg:px-8 py-6 max-w-[1000px] mx-auto fade-in">
        <div className="grid sm:grid-cols-3 gap-4">
          {CARDS.map((c) => {
            const Icon = c.icon
            return (
              <Link
                key={c.to}
                to={c.to}
                className="group block rounded-xl p-5 transition"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: 'var(--leaf-soft)', color: 'var(--moss)' }}
                >
                  <Icon size={18} strokeWidth={1.8} />
                </div>
                <div className="flex items-center gap-1.5 text-[14.5px] font-medium mb-1.5" style={{ color: 'var(--ink)' }}>
                  {c.title}
                  <ArrowRight size={13} className="opacity-0 group-hover:opacity-100 transition" style={{ color: 'var(--moss)' }} />
                </div>
                <div className="text-[12.5px] leading-relaxed" style={{ color: 'var(--ink-soft)' }}>{c.desc}</div>
              </Link>
            )
          })}
        </div>
      </div>
    </AppLayout>
  )
}
