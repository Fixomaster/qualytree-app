import React from 'react'
import { ArrowLeft, Sparkles, User, AlertCircle, CheckCircle2 } from 'lucide-react'
import WhyPanel from '../../components/WhyPanel'
import { STANDARD_ROLES } from '../../lib/regulations'

export default function StepRoles({ data, update, onNext, onBack, companyName }) {
  // data.roles: [{ roleId, personName, email }]
  const roles = data.roles || []

  const upsertRole = (roleId, field, value) => {
    const existing = roles.find((r) => r.roleId === roleId)
    let next
    if (existing) {
      next = roles.map((r) =>
        r.roleId === roleId ? { ...r, [field]: value } : r
      )
    } else {
      next = [...roles, { roleId, [field]: value }]
    }
    update({ ...data, roles: next })
  }

  const getRoleData = (roleId) => roles.find((r) => r.roleId === roleId) || {}

  // 필수 역할 채워졌는지
  const requiredFilled = STANDARD_ROLES.filter((r) => r.required).every((r) => {
    const d = getRoleData(r.id)
    return d.personName && d.email
  })

  return (
    <div className="grid lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 space-y-4">
        <div
          className="rounded-xl px-5 py-3.5 flex items-start gap-3"
          style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}
        >
          <Sparkles size={14} className="mt-0.5" style={{ color: 'var(--moss)' }} />
          <div className="flex-1 text-[13px]" style={{ color: 'var(--ink-soft)' }}>
            마지막 단계입니다. 회사의 핵심 역할을 누가 맡는지 등록해주세요. 한 사람이 여러 역할을
            겸직할 수 있고 (1~30인 회사는 일반적), §13.13.3 보상 통제가 자동 적용됩니다.
          </div>
        </div>

        <div className="space-y-2">
          {STANDARD_ROLES.map((role) => {
            const d = getRoleData(role.id)
            const filled = d.personName && d.email
            return (
              <div
                key={role.id}
                className="p-4 rounded-xl"
                style={{
                  background: filled ? 'var(--leaf-soft)' : 'var(--bg-card)',
                  border: `1px solid ${filled ? 'var(--leaf)' : 'var(--line-strong)'}`,
                }}
              >
                <div className="flex items-baseline justify-between mb-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-[14px]" style={{ color: 'var(--ink)', fontWeight: 600 }}>
                        {role.name}
                      </span>
                      <span
                        className="font-display italic text-[11.5px]"
                        style={{ color: 'var(--ink-mute)' }}
                      >
                        {role.en}
                      </span>
                      {role.required && (
                        <span
                          className="font-mono text-[9px] tracking-wider px-1.5 py-0.5 rounded"
                          style={{
                            background: 'var(--rust-soft)',
                            color: 'var(--rust)',
                            fontWeight: 600,
                          }}
                        >
                          REQUIRED
                        </span>
                      )}
                    </div>
                    {role.ref && (
                      <div
                        className="text-[10.5px] mt-0.5 font-mono"
                        style={{ color: 'var(--ink-mute)' }}
                      >
                        {role.ref}
                      </div>
                    )}
                  </div>
                  {filled && (
                    <CheckCircle2 size={16} style={{ color: 'var(--leaf)' }} />
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={d.personName || ''}
                    onChange={(e) => upsertRole(role.id, 'personName', e.target.value)}
                    placeholder="담당자 이름"
                    className="input-base text-[13px]"
                  />
                  <input
                    type="email"
                    value={d.email || ''}
                    onChange={(e) => upsertRole(role.id, 'email', e.target.value)}
                    placeholder="email@company.com"
                    className="input-base text-[13px]"
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div className="pt-4 flex justify-between">
          <button onClick={onBack} className="btn-ghost">
            <ArrowLeft size={14} />
            이전
          </button>
          <button disabled={!requiredFilled} onClick={onNext} className="btn-primary">
            온보딩 완료 — 대시보드로 →
          </button>
        </div>
      </div>

      <div className="lg:col-span-4 space-y-4">
        <WhyPanel
          title="역할 분리 의무 (SoD) 자동 처리"
          body={
            <>
              ISO 13485·FDA·MDR 모두 검토자와 승인자가 다를 것을 요구합니다. 1~30인 회사에서
              인력이 부족하면 시스템이 <strong>5가지 보상 통제 옵션</strong>을 자동 제안합니다
              (외부 검토자, 시간 분리, 다중 서명 등).
            </>
          }
          refs={[
            'ISO 13485:2016 §5.5',
            'ISO 27001 A.5.3',
            'Project Instructions §13.13.3',
          ]}
        />
      </div>
    </div>
  )
}
