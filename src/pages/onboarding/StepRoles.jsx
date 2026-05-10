import React, { useMemo, useState } from 'react'
import {
  ArrowLeft,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Plus,
  X,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Info,
} from 'lucide-react'
import WhyPanel from '../../components/WhyPanel'
import {
  STANDARD_ROLES,
  ROLE_CATEGORIES,
  getStandardRole,
  getRolesByCategory,
  validateSoD,
} from '../../lib/standardRoles'
import {
  LEVELS,
  LEVEL_LABEL,
  permissions,
  requirePermission,
} from '../../lib/permissions'

/**
 * StepRoles (ONB-005) — 역할·자격·권한 Level
 *
 * 적용 표준:
 * - ISO 13485:2016 §5.5 (책임·권한·소통), §5.5.2 (품질경영대리인)
 * - 21 CFR 820.20(b)(2) (Management Responsibility)
 * - 21 CFR Part 11 §11.10(d) (시스템 액세스 제한)
 * - Project Instructions §13.13 (거버넌스), §13.13.3 (SoD)
 */
export default function StepRoles({ data, update, onNext, onBack }) {
  const roles = data.roles || []

  const canEdit = permissions.can('onb.roles.edit')
  const [expandedCategories, setExpandedCategories] = useState(
    new Set(['production', 'quality', 'management'])
  )

  /* SoD 실시간 검증 */
  const sodResult = useMemo(() => validateSoD(roles), [roles])

  /* 역할 추가 */
  const addRoleAssignment = (standardRoleId) => {
    if (!requirePermission('onb.roles.edit')) return
    const std = getStandardRole(standardRoleId)
    if (!std) return
    const newRole = {
      id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      standardRoleId,
      personName: '',
      email: '',
      level: std.defaultLevel,
    }
    update({ ...data, roles: [...roles, newRole] })
  }

  const removeRole = (id) => {
    if (!requirePermission('onb.roles.edit')) return
    update({ ...data, roles: roles.filter((r) => r.id !== id) })
  }

  const updateRole = (id, patch) => {
    if (!requirePermission('onb.roles.edit')) return
    update({
      ...data,
      roles: roles.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    })
  }

  const toggleCategory = (catId) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      return next
    })
  }

  /* 진행 가능 여부 */
  const canProceed =
    roles.length > 0 &&
    roles.every(
      (r) => r.personName?.trim() && r.email?.trim() && r.level
    ) &&
    sodResult.violations.length === 0

  const filledCount = roles.filter(
    (r) => r.personName?.trim() && r.email?.trim()
  ).length

  return (
    <div className="grid lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 space-y-4">
        {/* 안내 */}
        <div
          className="rounded-xl px-5 py-3.5 flex items-start gap-3"
          style={{
            background: 'var(--bg-soft)',
            border: '1px solid var(--line)',
          }}
        >
          <Sparkles
            size={14}
            className="mt-0.5"
            style={{ color: 'var(--moss)' }}
          />
          <div
            className="flex-1 text-[13px]"
            style={{ color: 'var(--ink-soft)' }}
          >
            마지막 단계입니다. 회사의 핵심 역할을 누가 맡는지 등록해주세요.
            카테고리에서 표준 역할을 클릭하면 추가되고,{' '}
            <strong>권한 Level이 자동 추천</strong>됩니다. 1~30인 회사는 한 명이
            여러 역할을 겸직할 수 있고, 시스템이 SoD 위반을 실시간 검증합니다.
          </div>
        </div>

        {/* 권한 안내 */}
        {!canEdit && (
          <div
            className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{
              background: 'var(--rust-soft)',
              border: '1px solid var(--rust)',
            }}
          >
            <AlertCircle size={16} style={{ color: 'var(--rust)' }} />
            <div className="text-[12.5px]" style={{ color: 'var(--rust)' }}>
              <strong>매니저(Level 3)</strong> 권한이 필요합니다. 우상단에서
              권한 전환 후 편집할 수 있습니다.
            </div>
          </div>
        )}

        {/* 카테고리별 표준 역할 */}
        {ROLE_CATEGORIES.map((cat) => {
          const stdRoles = getRolesByCategory(cat.id)
          const expanded = expandedCategories.has(cat.id)
          return (
            <div
              key={cat.id}
              className="rounded-xl overflow-hidden"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--line)',
              }}
            >
              <button
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center gap-3 px-4 py-3 transition"
                style={{
                  background: expanded
                    ? `var(--${cat.color}-soft)`
                    : 'transparent',
                }}
              >
                {expanded ? (
                  <ChevronDown
                    size={14}
                    style={{ color: 'var(--ink-mute)' }}
                  />
                ) : (
                  <ChevronRight
                    size={14}
                    style={{ color: 'var(--ink-mute)' }}
                  />
                )}
                <span
                  className="text-[13px]"
                  style={{ color: 'var(--ink)', fontWeight: 600 }}
                >
                  {cat.name}
                </span>
                <span
                  className="font-display italic text-[11px]"
                  style={{ color: 'var(--ink-mute)' }}
                >
                  {cat.en}
                </span>
                <span
                  className="text-[11.5px] ml-1"
                  style={{ color: 'var(--ink-faint)' }}
                >
                  · {cat.desc}
                </span>
                <span
                  className="ml-auto text-[11px]"
                  style={{ color: 'var(--ink-faint)' }}
                >
                  {stdRoles.length}개
                </span>
              </button>
              {expanded && (
                <div
                  className="p-3 grid sm:grid-cols-2 gap-2"
                  style={{ borderTop: '1px solid var(--line)' }}
                >
                  {stdRoles.map((r) => {
                    const usedCount = roles.filter(
                      (a) => a.standardRoleId === r.id
                    ).length
                    return (
                      <button
                        key={r.id}
                        onClick={() => addRoleAssignment(r.id)}
                        disabled={!canEdit}
                        className="text-left rounded-lg px-3 py-2 transition"
                        style={{
                          background: 'var(--bg-soft)',
                          border: '1px solid var(--line)',
                          cursor: canEdit ? 'pointer' : 'not-allowed',
                          opacity: canEdit ? 1 : 0.5,
                        }}
                        title={r.description}
                      >
                        <div className="flex items-center gap-2">
                          <Plus size={11} style={{ color: 'var(--moss)' }} />
                          <span
                            className="text-[12.5px] flex-1"
                            style={{ color: 'var(--ink)' }}
                          >
                            {r.name}
                          </span>
                          <LevelBadge level={r.defaultLevel} />
                          {r.isMandatory && (
                            <span
                              className="font-mono text-[9px] px-1 rounded"
                              style={{
                                background: 'var(--rust-soft)',
                                color: 'var(--rust)',
                                fontWeight: 600,
                              }}
                              title="ISO 13485 §5.5.2 의무직"
                            >
                              REQ
                            </span>
                          )}
                          {usedCount > 0 && (
                            <span
                              className="font-mono text-[9px] px-1 rounded"
                              style={{
                                background: 'var(--leaf-soft)',
                                color: 'var(--moss)',
                              }}
                            >
                              ×{usedCount}
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {/* 배정된 역할 목록 */}
        <div className="pt-2">
          <div
            className="font-mono text-[10.5px] tracking-[0.16em] uppercase mb-2 flex items-center gap-2"
            style={{ color: 'var(--ink-mute)' }}
          >
            ASSIGNMENTS · 배정된 역할 ({roles.length}건)
            {filledCount < roles.length && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{
                  background: 'var(--amber-soft)',
                  color: 'var(--amber)',
                }}
              >
                {roles.length - filledCount}건 미작성
              </span>
            )}
          </div>

          {roles.length === 0 ? (
            <div
              className="rounded-xl p-6 text-center text-[13px]"
              style={{
                background: 'var(--bg-soft)',
                border: '1px dashed var(--line-strong)',
                color: 'var(--ink-mute)',
              }}
            >
              위에서 역할을 추가해주세요.
            </div>
          ) : (
            <div className="space-y-2">
              {roles.map((r) => (
                <RoleAssignmentRow
                  key={r.id}
                  role={r}
                  canEdit={canEdit}
                  onUpdate={(patch) => updateRole(r.id, patch)}
                  onRemove={() => removeRole(r.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* SoD 검증 결과 */}
        <SodPanel result={sodResult} />

        {/* 버튼 */}
        <div className="pt-4 flex justify-between items-center">
          <button onClick={onBack} className="btn-ghost">
            <ArrowLeft size={14} />
            이전
          </button>
          <div className="flex items-center gap-3">
            {!canProceed && roles.length > 0 && (
              <span
                className="text-[12px]"
                style={{ color: 'var(--ink-mute)' }}
              >
                {sodResult.violations.length > 0
                  ? 'SoD 위반 해결 후 진행 가능'
                  : '모든 역할의 이름·이메일·Level을 입력해주세요'}
              </span>
            )}
            <button
              disabled={!canProceed}
              onClick={onNext}
              className="btn-primary"
            >
              온보딩 완료 — 대시보드로 →
            </button>
          </div>
        </div>
      </div>

      {/* 우측 WhyPanel */}
      <div className="lg:col-span-4 space-y-4">
        <WhyPanel
          title="역할·권한 Level 자동 매핑"
          body={
            <>
              <p className="mb-2">
                의료기기 QMS는 <strong>3개 권한 Level</strong>로 SoD를
                보장합니다.
              </p>
              <div className="space-y-1.5 text-[12px]">
                <div className="flex items-start gap-2">
                  <LevelBadge level={1} />
                  <div>
                    <strong>작업자</strong> — 시작·측정·서명
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <LevelBadge level={2} />
                  <div>
                    <strong>검사관</strong> — + 검토·재측정 요청
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <LevelBadge level={3} />
                  <div>
                    <strong>매니저·RA</strong> — + 정의·발행·삭제·승인
                  </div>
                </div>
              </div>
              <p
                className="mt-3 text-[11.5px]"
                style={{ color: 'var(--ink-mute)' }}
              >
                표준 역할을 클릭하면 권장 Level이 자동 설정되며, 회사 사정에
                따라 조정 가능합니다.
              </p>
            </>
          }
          refs={[
            'ISO 13485:2016 §5.5',
            '21 CFR 820.20(b)(2)',
            'Part 11 §11.10(d)',
            'Project Instructions §13.13',
          ]}
        />

        <WhyPanel
          title="SoD 실시간 검증"
          body={
            <>
              한 사람이 정의자(L3)와 측정자(L1)를 동시 보유하면 SoD 위반입니다.
              영세 회사(1~30인)는{' '}
              <strong>5가지 보상 통제(CC-1~5)</strong>로 인력 부족을 보완할 수
              있습니다.
            </>
          }
          refs={[
            'Project Instructions §13.13.3',
            'ISO 27001 A.5.3',
            'ISACA COBIT 보상 통제',
          ]}
        />
      </div>
    </div>
  )
}

/* ================================================================
   RoleAssignmentRow — 배정된 역할 1건
   ================================================================ */
function RoleAssignmentRow({ role, canEdit, onUpdate, onRemove }) {
  const std = getStandardRole(role.standardRoleId)
  if (!std) return null

  const filled = role.personName?.trim() && role.email?.trim()
  const cat = ROLE_CATEGORIES.find((c) => c.id === std.category)

  return (
    <div
      className="p-3 rounded-xl"
      style={{
        background: filled ? 'var(--leaf-soft)' : 'var(--bg-card)',
        border: `1px solid ${filled ? 'var(--leaf)' : 'var(--line-strong)'}`,
      }}
    >
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span
          className="text-[13px]"
          style={{ color: 'var(--ink)', fontWeight: 600 }}
        >
          {std.name}
        </span>
        <span
          className="font-display italic text-[11px]"
          style={{ color: 'var(--ink-mute)' }}
        >
          {std.en}
        </span>
        {cat && (
          <span
            className="font-mono text-[9.5px] px-1.5 py-0.5 rounded"
            style={{
              background: `var(--${cat.color}-soft)`,
              color: `var(--${cat.color})`,
            }}
          >
            {cat.name}
          </span>
        )}
        {std.isMandatory && (
          <span
            className="font-mono text-[9px] px-1 rounded"
            style={{
              background: 'var(--rust-soft)',
              color: 'var(--rust)',
              fontWeight: 600,
            }}
          >
            ISO 13485 의무직
          </span>
        )}
        <button
          onClick={onRemove}
          disabled={!canEdit}
          className="ml-auto p-1 rounded transition"
          style={{
            opacity: canEdit ? 0.6 : 0.3,
            cursor: canEdit ? 'pointer' : 'not-allowed',
          }}
          title="삭제"
        >
          <X size={13} />
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-2">
        <input
          type="text"
          value={role.personName || ''}
          onChange={(e) => onUpdate({ personName: e.target.value })}
          placeholder="담당자 이름"
          disabled={!canEdit}
          className="input-base text-[13px]"
        />
        <input
          type="email"
          value={role.email || ''}
          onChange={(e) => onUpdate({ email: e.target.value })}
          placeholder="email@company.com"
          disabled={!canEdit}
          className="input-base text-[13px]"
        />
        <LevelSelector
          level={role.level || std.defaultLevel}
          minLevel={std.minLevel}
          maxLevel={std.maxLevel}
          onChange={(level) => onUpdate({ level })}
          disabled={!canEdit}
        />
      </div>

      {filled && (
        <div
          className="mt-2 flex items-center gap-2 text-[11px]"
          style={{ color: 'var(--ink-mute)' }}
        >
          <CheckCircle2 size={11} style={{ color: 'var(--moss)' }} />
          {std.description}
        </div>
      )}
    </div>
  )
}

/* ================================================================
   LevelSelector — Level 선택기
   ================================================================ */
function LevelSelector({ level, minLevel, maxLevel, onChange, disabled }) {
  const options = [LEVELS.OPERATOR, LEVELS.INSPECTOR, LEVELS.MANAGER]
  return (
    <div className="flex gap-1">
      {options.map((lv) => {
        const allowed = lv >= minLevel && lv <= maxLevel
        const selected = level === lv
        return (
          <button
            key={lv}
            onClick={() => allowed && !disabled && onChange(lv)}
            disabled={disabled || !allowed}
            className="flex-1 py-1.5 rounded-md text-[11.5px] transition"
            style={{
              background: selected
                ? lv === 3
                  ? 'var(--moss)'
                  : lv === 2
                  ? 'var(--sky)'
                  : 'var(--amber)'
                : allowed
                ? 'var(--bg-soft)'
                : 'transparent',
              color: selected
                ? 'var(--bg)'
                : allowed
                ? 'var(--ink)'
                : 'var(--ink-faint)',
              fontWeight: selected ? 600 : 400,
              cursor: !allowed || disabled ? 'not-allowed' : 'pointer',
              opacity: !allowed ? 0.4 : 1,
            }}
            title={
              allowed
                ? `Level ${lv} - ${LEVEL_LABEL[lv].ko}`
                : '이 역할에서 허용되지 않는 Level'
            }
          >
            L{lv} {LEVEL_LABEL[lv].short}
          </button>
        )
      })}
    </div>
  )
}

/* ================================================================
   LevelBadge — Level 시각 배지
   ================================================================ */
function LevelBadge({ level }) {
  const colors = {
    1: { bg: 'var(--amber-soft)', fg: 'var(--amber)' },
    2: { bg: 'var(--sky-soft)', fg: 'var(--sky)' },
    3: { bg: 'var(--leaf-soft)', fg: 'var(--moss)' },
  }
  const c = colors[level] || colors[1]
  return (
    <span
      className="font-mono text-[9.5px] px-1.5 py-0.5 rounded"
      style={{
        background: c.bg,
        color: c.fg,
        fontWeight: 600,
      }}
      title={`Level ${level} - ${LEVEL_LABEL[level]?.ko}`}
    >
      L{level}
    </span>
  )
}

/* ================================================================
   SodPanel — SoD 검증 결과 표시
   ================================================================ */
function SodPanel({ result }) {
  if (result.violations.length === 0 && result.warnings.length === 0)
    return null

  return (
    <div className="space-y-2">
      {result.violations.length > 0 && (
        <div
          className="rounded-xl p-3"
          style={{
            background: 'var(--rust-soft)',
            border: '1px solid var(--rust)',
          }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <AlertTriangle size={13} style={{ color: 'var(--rust)' }} />
            <span
              className="font-mono text-[10.5px] tracking-[0.16em] uppercase"
              style={{ color: 'var(--rust)', fontWeight: 600 }}
            >
              SoD 위반 — 진행 차단 ({result.violations.length}건)
            </span>
          </div>
          <ul className="space-y-1 ml-1">
            {result.violations.map((v, i) => (
              <li
                key={i}
                className="text-[12px]"
                style={{ color: 'var(--rust)' }}
              >
                • {v.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.warnings.length > 0 && (
        <div
          className="rounded-xl p-3"
          style={{
            background: 'var(--amber-soft)',
            border: '1px solid var(--amber)',
          }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Info size={13} style={{ color: 'var(--amber)' }} />
            <span
              className="font-mono text-[10.5px] tracking-[0.16em] uppercase"
              style={{ color: 'var(--amber)', fontWeight: 600 }}
            >
              경고 ({result.warnings.length}건)
            </span>
          </div>
          <ul className="space-y-1 ml-1">
            {result.warnings.map((w, i) => (
              <li
                key={i}
                className="text-[12px]"
                style={{ color: 'var(--amber)' }}
              >
                • {w.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
