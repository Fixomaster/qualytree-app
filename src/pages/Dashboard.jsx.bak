import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Sparkles,
  Calendar,
  FileText,
  GitCommit,
  CheckCircle2,
  PackageSearch,
  ShieldCheck,
  Workflow,
  TrendingUp,
  AlertCircle,
  RotateCcw,
} from 'lucide-react'
import AppLayout from '../components/AppLayout'
import { auth } from '../lib/auth'
import { onboarding } from '../lib/onboardingState'
import { PROCESS_BLOCKS } from '../lib/processBlocks'
import { REGULATIONS } from '../lib/regulations'

// 사용자 정의 블록도 합산할 수 있도록 가져오기
const CUSTOM_BLOCK_KEY = 'qualytree.customBlocks'
function loadCustomBlocks() {
  try {
    const raw = localStorage.getItem(CUSTOM_BLOCK_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export default function Dashboard() {
  const nav = useNavigate()
  const user = auth.current()
  const onbState = onboarding.load()

  // hasCompany: 회사 정보가 채워져 있고 온보딩 1단계 이상 완료
  const hasCompany = !!(user?.company && onbState.company?.name)

  return (
    <AppLayout
      user={user}
      title={`안녕하세요, ${user?.name || ''}님`}
      subtitle={
        hasCompany
          ? onbState.company.name
          : '품질 시스템을 시작할 준비가 되었습니다'
      }
    >
      <div className="px-6 lg:px-8 py-8 max-w-[1280px] mx-auto">
        {hasCompany ? (
          <ActiveDashboard state={onbState} onReset={() => {
            if (confirm('온보딩 데이터를 모두 지우고 처음부터 다시 시작할까요?')) {
              onboarding.reset()
              auth.updateCompany(null)
              localStorage.removeItem('qualytree.customBlocks')
              localStorage.removeItem('qualytree.customCategories')
              window.location.reload()
            }
          }} onContinue={() => nav('/onboarding')} />
        ) : (
          <FirstTimeDashboard onStart={() => nav('/onboarding')} />
        )}
      </div>
    </AppLayout>
  )
}

/* ============================================================
   첫 진입 — 회사 등록 전
   ============================================================ */
function FirstTimeDashboard({ onStart }) {
  return (
    <div className="fade-in">
      <div
        className="relative rounded-[20px] overflow-hidden p-8 lg:p-10"
        style={{ background: 'var(--moss)', color: 'var(--bg)' }}
      >
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background:
              'radial-gradient(500px 240px at 100% 0%, var(--leaf), transparent 60%), radial-gradient(400px 220px at 0% 100%, var(--amber), transparent 60%)',
          }}
        />
        <div className="relative grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7">
            <div
              className="font-mono text-[10.5px] tracking-[0.22em] uppercase mb-3"
              style={{ color: 'var(--amber-soft)' }}
            >
              ⏱ 5분이면 시작됩니다
            </div>
            <h1
              className="font-display leading-[1.05]"
              style={{ fontSize: 'clamp(28px, 3.4vw, 40px)', fontWeight: 420 }}
            >
              회사·제품·공정을 한 번 입력하면,<br />
              인증별 서류가 자동으로 따라옵니다.
            </h1>
            <p
              className="mt-4 text-[14.5px] leading-relaxed"
              style={{ color: 'rgba(248,244,236,0.82)', maxWidth: 560 }}
            >
              5단계 가이드에 따라 객관식으로 답하시면, ISO 13485 · KGMP · FDA QMSR ·
              EU MDR 양식이 동시에 채워지기 시작합니다. RA 전공이 아니어도 됩니다.
            </p>
            <button
              onClick={onStart}
              className="btn-primary mt-7"
              style={{ background: 'var(--bg)', color: 'var(--moss)' }}
            >
              온보딩 시작하기 <ArrowRight size={15} />
            </button>
          </div>

          <div className="lg:col-span-5">
            <div
              className="rounded-2xl p-5 backdrop-blur"
              style={{
                background: 'rgba(248,244,236,0.08)',
                border: '1px solid rgba(248,244,236,0.16)',
              }}
            >
              <div
                className="font-mono text-[10px] tracking-[0.22em] uppercase mb-3"
                style={{ color: 'var(--amber-soft)' }}
              >
                ONBOARDING · 5 STEPS
              </div>
              <ol className="space-y-2.5 text-[13px]">
                {[
                  ['회사 등록', '법인·사이트·인증 보유 현황'],
                  ['제품 등록', '제품 분류·의도된 사용'],
                  ['공정 정의', '드래그·드롭으로 공정 순서 구성'],
                  ['다중 규제 선택', 'FDA·MDR·KGMP 동시 매핑'],
                  ['역할·자격', '담당자 배정 + Skill Matrix'],
                ].map(([t, s], i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span
                      className="font-mono text-[11px] mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: 'var(--amber)',
                        color: 'var(--ink)',
                        fontWeight: 600,
                      }}
                    >
                      {i + 1}
                    </span>
                    <div>
                      <div style={{ fontWeight: 500 }}>{t}</div>
                      <div style={{ color: 'rgba(248,244,236,0.62)', fontSize: 12 }}>
                        {s}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 grid md:grid-cols-3 gap-4">
        {[
          {
            tag: 'NO RA EXPERTISE',
            t: 'RA 비전공자도 OK',
            s: '객관식 + 보조설명 중심. "왜 이걸 입력하는지" 화면에서 즉시 보입니다.',
          },
          {
            tag: 'BIDIRECTIONAL',
            t: '구조적 무결한 연결',
            s: '한 번 입력 → 모든 인증 양식·문서·시험에 양방향 자동 연결.',
          },
          {
            tag: 'DECISION LOG',
            t: '5분 인수인계',
            s: '결정 일지 자동 누적. 담당자 교체에도 컨텍스트 유실 없음.',
          },
        ].map((c, i) => (
          <div key={i} className="card-base p-5">
            <div
              className="font-mono text-[10px] tracking-[0.18em] uppercase"
              style={{ color: 'var(--amber)' }}
            >
              {c.tag}
            </div>
            <div
              className="mt-2 font-display text-[18px] leading-tight"
              style={{ color: 'var(--ink)', fontWeight: 500 }}
            >
              {c.t}
            </div>
            <div
              className="mt-2 text-[13px] leading-relaxed"
              style={{ color: 'var(--ink-soft)' }}
            >
              {c.s}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ============================================================
   활성 대시보드 — 사용자 입력 데이터 기반
   ============================================================ */
function ActiveDashboard({ state, onReset, onContinue }) {
  const nav = useNavigate()

  // 모든 블록(빌트인 + 사용자 정의)
  const allBlocks = useMemo(
    () => [...PROCESS_BLOCKS, ...loadCustomBlocks()],
    []
  )
  const findBlock = (id) => allBlocks.find((b) => b.id === id)

  // ---- 통계 계산 ----
  const productCount = state.product?.name ? 1 : 0
  const processCount = (state.processes || []).length

  const selectedRegs = useMemo(
    () =>
      REGULATIONS.filter((r) => (state.regulations || []).includes(r.id)),
    [state.regulations]
  )
  const regCount = selectedRegs.length

  // 온보딩 완성도 — completedSteps 기준
  const completion = Math.round(
    (((state.completedSteps || []).length) / 5) * 100
  )

  // 공정 → 자동 매핑 카운트
  const mapping = useMemo(() => {
    const sopSet = new Set()
    const inspectionSet = new Set()
    const standardSet = new Set()
    const riskSet = new Set()
    let specialProcessCount = 0
    ;(state.processes || []).forEach((p) => {
      const block = findBlock(p.blockId)
      if (!block) return
      block.sopAuto?.forEach((s) => sopSet.add(s))
      block.inspections?.forEach((i) => inspectionSet.add(i))
      block.standards?.forEach((s) => standardSet.add(s))
      block.risks?.forEach((r) => riskSet.add(r))
      if (block.isSpecialProcess) specialProcessCount++
    })
    return {
      sops: Array.from(sopSet),
      inspections: Array.from(inspectionSet),
      standards: Array.from(standardSet),
      risks: Array.from(riskSet),
      specialProcessCount,
    }
  }, [state.processes, allBlocks])

  // 자동 결정 일지 — 온보딩 진행 자체를 일지로
  const decisionLog = useMemo(() => {
    const items = []
    const ts = state.finishedAt
      ? new Date(state.finishedAt).toLocaleString('ko-KR', {
          dateStyle: 'short',
          timeStyle: 'short',
        })
      : '방금'

    if (state.completedSteps?.includes(5) && state.roles?.length > 0) {
      items.push({
        t: `핵심 역할 ${state.roles.length}개 배정 완료`,
        by: `${ts} · 시스템`,
        linkedTo: 'ONB-005',
      })
    }
    if (state.completedSteps?.includes(4) && regCount > 0) {
      items.push({
        t: `진출 규제 ${regCount}개 매핑: ${selectedRegs
          .map((r) => r.name.split(':')[0])
          .slice(0, 3)
          .join(', ')}${regCount > 3 ? ` 외 ${regCount - 3}` : ''}`,
        by: `${ts} · 시스템`,
        linkedTo: 'ONB-004',
      })
    }
    if (state.completedSteps?.includes(3) && processCount > 0) {
      items.push({
        t: `공정 순서 ${processCount}단계 정의${
          mapping.specialProcessCount > 0
            ? ` (특별공정 ${mapping.specialProcessCount}개)`
            : ''
        }`,
        by: `${ts} · 시스템`,
        linkedTo: 'ONB-003',
      })
    }
    if (state.completedSteps?.includes(2) && state.product?.name) {
      const cls = state.product.classification
      items.push({
        t: `제품 등록: ${state.product.name}${
          cls
            ? ` (FDA Class ${cls.fdaClass} · MDR ${cls.mdrClass})`
            : ''
        }`,
        by: `${ts} · 시스템`,
        linkedTo: 'ONB-002',
      })
    }
    if (state.completedSteps?.includes(1) && state.company?.name) {
      items.push({
        t: `회사 등록: ${state.company.name}`,
        by: `${ts} · 시스템`,
        linkedTo: 'ONB-001',
      })
    }
    return items
  }, [state, regCount, selectedRegs, processCount, mapping])

  // 임박 일정 — 온보딩 결과로부터 자동 발의된 다음 작업
  const upcoming = useMemo(() => {
    const items = []
    if (mapping.specialProcessCount > 0) {
      items.push({
        date: '다음',
        t: `특별공정 밸리데이션 ${mapping.specialProcessCount}건 (IQ/OQ/PQ)`,
        tag: 'OPS',
      })
    }
    if (mapping.sops.length > 0) {
      items.push({
        date: '다음',
        t: `SOP 작성 ${mapping.sops.length}건`,
        tag: 'QMS',
      })
    }
    selectedRegs.forEach((r) => {
      if (r.id !== 'iso-13485') {
        items.push({
          date: '예정',
          t: `${r.name} 신청 패키지 준비`,
          tag: 'RA',
        })
      }
    })
    return items.slice(0, 5)
  }, [mapping, selectedRegs])

  return (
    <div className="fade-in">
      {/* Top stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          label="제품"
          value={String(productCount)}
          delta={state.product?.name || '—'}
          icon={PackageSearch}
          tone="moss"
        />
        <Stat
          label="진출 규제"
          value={String(regCount)}
          delta={
            selectedRegs.length > 0
              ? selectedRegs
                  .map((r) => r.name.split(':')[0].replace('FDA ', ''))
                  .slice(0, 3)
                  .join(' · ')
              : '—'
          }
          icon={ShieldCheck}
          tone="amber"
        />
        <Stat
          label="공정 단계"
          value={String(processCount)}
          delta={
            mapping.specialProcessCount > 0
              ? `특별공정 ${mapping.specialProcessCount}`
              : '특별공정 0'
          }
          icon={Workflow}
          tone="leaf"
        />
        <Stat
          label="온보딩 완성도"
          value={`${completion}%`}
          delta={
            completion === 100
              ? '✓ 온보딩 완료'
              : `${state.step || 1}/5 단계 진행 중`
          }
          icon={TrendingUp}
          tone={completion === 100 ? 'leaf' : 'amber'}
        />
      </div>

      <div className="mt-8 grid lg:grid-cols-3 gap-4">
        {/* 진행 중인 인증 */}
        <div className="lg:col-span-2 card-base p-5">
          <SectionHeader
            title="진출 규제 — 매핑 현황"
            subtitle="온보딩에서 선택한 인증·규제. 추가 작성을 위해서는 각 영역으로 이동"
          />
          {selectedRegs.length === 0 ? (
            <EmptyHint
              text="아직 진출 규제가 선택되지 않았습니다."
              onAction={onContinue}
              actionLabel="온보딩 4단계로 이동"
            />
          ) : (
            <div className="mt-4 space-y-3">
              {selectedRegs.map((r) => (
                <RegRow key={r.id} reg={r} completion={completion} />
              ))}
            </div>
          )}
        </div>

        {/* Side: schedule + log */}
        <div className="space-y-4">
          <div className="card-base p-5">
            <SectionHeader title="다음 작업" icon={Calendar} />
            {upcoming.length === 0 ? (
              <EmptyHint text="공정과 규제를 입력하면 다음 작업이 자동으로 발의됩니다." compact />
            ) : (
              <ul className="mt-3 space-y-2.5 text-[13px]">
                {upcoming.map((u, i) => (
                  <Schedule key={i} {...u} />
                ))}
              </ul>
            )}
          </div>

          <div className="card-base p-5">
            <SectionHeader title="결정 일지" icon={GitCommit} />
            {decisionLog.length === 0 ? (
              <EmptyHint
                text="아직 기록된 결정이 없습니다."
                compact
              />
            ) : (
              <ul className="mt-3 space-y-3 text-[13px]">
                {decisionLog.map((d, i) => (
                  <LogItem key={i} {...d} />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* 자동 매핑 결과 요약 */}
      {processCount > 0 && (
        <div className="mt-8 grid sm:grid-cols-3 gap-3">
          <MapStat
            icon={FileText}
            label="자동 매핑 SOP"
            count={mapping.sops.length}
            sample={mapping.sops[0]}
          />
          <MapStat
            icon={CheckCircle2}
            label="자동 매핑 검사"
            count={mapping.inspections.length}
            sample={mapping.inspections[0]}
          />
          <MapStat
            icon={ShieldCheck}
            label="적용 표준"
            count={mapping.standards.length}
            sample={mapping.standards[0]}
          />
        </div>
      )}

      {/* Quality Tree — 사용자 입력 기반 */}
      <div className="mt-8 card-base p-6">
        <SectionHeader
          title={`Quality Tree — ${state.product?.name || '제품 미등록'}`}
          subtitle="제품·인증·문서·위험 항목이 한 그루의 트리로. 곧 클릭해서 탐색 가능."
        />
        <QualityTreeViz
          productName={state.product?.name || 'Product'}
          regs={selectedRegs}
          processCount={processCount}
          riskCount={mapping.risks.length}
        />
      </div>

      {/* 온보딩 다시 / 데이터 초기화 */}
      <div className="mt-10 flex flex-wrap gap-3 justify-end">
        <button
          onClick={onContinue}
          className="btn-ghost text-[13px]"
        >
          <RotateCcw size={13} />
          온보딩 수정하기
        </button>
        <button
          onClick={onReset}
          className="btn-ghost text-[13px]"
          style={{ color: 'var(--rust)', borderColor: 'rgba(139,58,31,0.3)' }}
        >
          데이터 모두 지우고 처음부터
        </button>
      </div>
    </div>
  )
}

/* ============================================================
   Sub-components
   ============================================================ */

function SectionHeader({ title, subtitle, icon: Icon }) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <div className="flex items-center gap-2">
          {Icon && (
            <Icon size={15} style={{ color: 'var(--moss)' }} strokeWidth={1.7} />
          )}
          <div
            className="font-display text-[16px]"
            style={{ color: 'var(--ink)', fontWeight: 500 }}
          >
            {title}
          </div>
        </div>
        {subtitle && (
          <div className="mt-1 text-[12px]" style={{ color: 'var(--ink-mute)' }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, delta, tone = 'moss', icon: Icon }) {
  const toneMap = {
    moss: 'var(--moss)',
    leaf: 'var(--leaf)',
    amber: 'var(--amber)',
    rust: 'var(--rust)',
  }
  return (
    <div className="card-base p-5">
      <div className="flex items-center justify-between">
        <div className="text-[12px]" style={{ color: 'var(--ink-mute)' }}>
          {label}
        </div>
        {Icon && (
          <Icon
            size={14}
            style={{ color: toneMap[tone], opacity: 0.5 }}
            strokeWidth={1.6}
          />
        )}
      </div>
      <div
        className="mt-1.5 font-display"
        style={{
          fontSize: 30,
          fontWeight: 460,
          color: 'var(--ink)',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {delta && (
        <div
          className="mt-2 text-[11.5px] truncate"
          style={{ color: toneMap[tone] }}
          title={delta}
        >
          {delta}
        </div>
      )}
    </div>
  )
}

function RegRow({ reg, completion }) {
  return (
    <div className="flex items-center gap-4 py-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <div
            className="text-[13.5px] truncate"
            style={{ fontWeight: 500 }}
          >
            {reg.name}
          </div>
          <div
            className="font-mono text-[11px] shrink-0"
            style={{ color: 'var(--ink-mute)' }}
          >
            {reg.region}
          </div>
        </div>
        <div
          className="mt-2 h-1.5 rounded-full overflow-hidden"
          style={{ background: 'var(--bg-soft)' }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${completion}%`,
              background:
                completion === 100
                  ? 'linear-gradient(90deg, var(--leaf), var(--moss-mid))'
                  : 'var(--amber)',
            }}
          />
        </div>
      </div>
      <div className="w-20 text-right">
        <div
          className="font-mono text-[12px]"
          style={{ color: 'var(--moss)' }}
        >
          온보딩 {completion}%
        </div>
        <div
          className="font-mono text-[10px] mt-0.5"
          style={{ color: 'var(--ink-faint)' }}
        >
          후속 작업 대기
        </div>
      </div>
    </div>
  )
}

function Schedule({ date, t, tag }) {
  return (
    <li className="flex items-start gap-3">
      <div
        className="w-12 shrink-0 font-mono text-[10.5px] uppercase tracking-wider"
        style={{ color: 'var(--ink-faint)' }}
      >
        {date}
      </div>
      <div className="flex-1 min-w-0">
        <div className="leading-snug" style={{ color: 'var(--ink)' }}>
          {t}
        </div>
      </div>
      <span
        className="tag"
        style={{ background: 'var(--bg-soft)', color: 'var(--ink-mute)' }}
      >
        {tag}
      </span>
    </li>
  )
}

function LogItem({ t, by, linkedTo }) {
  return (
    <li className="flex items-start gap-3">
      <div className="mt-1.5">
        <CheckCircle2
          size={13}
          style={{ color: 'var(--leaf)' }}
          strokeWidth={2}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="leading-snug"
          style={{ color: 'var(--ink)' }}
        >
          {t}
        </div>
        <div
          className="mt-0.5 flex items-center gap-2 text-[11px]"
          style={{ color: 'var(--ink-mute)' }}
        >
          <span className="truncate">{by}</span>
          {linkedTo && (
            <>
              <span>·</span>
              <span className="font-mono shrink-0">{linkedTo}</span>
            </>
          )}
        </div>
      </div>
    </li>
  )
}

function MapStat({ icon: Icon, label, count, sample }) {
  return (
    <div className="card-base p-4">
      <div className="flex items-center gap-2">
        <Icon size={13} style={{ color: 'var(--moss)' }} strokeWidth={1.7} />
        <span
          className="font-mono text-[10px] tracking-[0.16em] uppercase"
          style={{ color: 'var(--ink-mute)' }}
        >
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-2 mt-1.5">
        <span
          className="font-display"
          style={{ fontSize: 24, fontWeight: 500, color: 'var(--ink)' }}
        >
          {count}
        </span>
        {sample && (
          <span
            className="text-[11.5px] truncate"
            style={{ color: 'var(--ink-mute)' }}
          >
            예: {sample}
          </span>
        )}
      </div>
    </div>
  )
}

function EmptyHint({ text, onAction, actionLabel, compact }) {
  return (
    <div
      className={`mt-${compact ? 3 : 4} px-4 py-${compact ? 3 : 6} rounded-xl text-center`}
      style={{
        background: 'var(--bg-soft)',
        border: '1px dashed var(--line-strong)',
      }}
    >
      <div
        className="text-[12.5px]"
        style={{ color: 'var(--ink-mute)' }}
      >
        {text}
      </div>
      {onAction && actionLabel && (
        <button
          onClick={onAction}
          className="mt-2 text-[12px] underline"
          style={{ color: 'var(--moss)' }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

function QualityTreeViz({ productName, regs, processCount, riskCount }) {
  // 가지 4개 — 사용자 데이터 기반
  const branches = [
    {
      x: 100,
      label: 'DHF',
      en: 'Design',
      sub: '자동 발행',
    },
    {
      x: 230,
      label: 'DMR',
      en: '제조 기준',
      sub: `공정 ${processCount}`,
    },
    {
      x: 370,
      label: 'Risk',
      en: '위험관리',
      sub: `${riskCount}건`,
    },
    {
      x: 500,
      label: 'CAPA',
      en: '시정조치',
      sub: '대기',
    },
  ]

  // 제품 이름은 너무 길면 자르기
  const displayName =
    productName && productName.length > 12
      ? productName.slice(0, 12) + '…'
      : productName || 'Product'

  return (
    <div
      className="mt-4 rounded-2xl p-8 flex items-center justify-center"
      style={{
        background:
          'linear-gradient(135deg, var(--bg-soft), var(--bg))',
        border: '1px dashed var(--line-strong)',
        minHeight: 280,
      }}
    >
      <svg viewBox="0 0 600 260" className="w-full max-w-[560px]" fill="none">
        <line
          x1="300"
          y1="20"
          x2="300"
          y2="240"
          stroke="var(--line-strong)"
          strokeDasharray="3 4"
        />

        {/* Root: 제품 이름 */}
        <rect x="220" y="14" width="160" height="32" rx="16" fill="var(--moss)" />
        <text
          x="300"
          y="35"
          textAnchor="middle"
          fontFamily="Fraunces, serif"
          fontSize="13"
          fill="var(--bg)"
          fontWeight="500"
        >
          {displayName}
        </text>

        {/* 가지 4개 */}
        {branches.map((b, i) => (
          <g key={i}>
            <path
              d={`M 300 46 Q ${300} 100 ${b.x} 140`}
              stroke="var(--line-strong)"
              strokeWidth="1"
              fill="none"
            />
            <rect
              x={b.x - 42}
              y="140"
              width="84"
              height="50"
              rx="12"
              fill="var(--bg-card)"
              stroke="var(--line-strong)"
            />
            <text
              x={b.x}
              y="158"
              textAnchor="middle"
              fontFamily="Fraunces, serif"
              fontSize="13"
              fill="var(--moss)"
              fontWeight="500"
            >
              {b.label}
            </text>
            <text
              x={b.x}
              y="172"
              textAnchor="middle"
              fontFamily="JetBrains Mono, monospace"
              fontSize="9"
              fill="var(--ink-mute)"
            >
              {b.en}
            </text>
            <text
              x={b.x}
              y="184"
              textAnchor="middle"
              fontFamily="JetBrains Mono, monospace"
              fontSize="9"
              fill="var(--amber)"
              fontWeight="500"
            >
              {b.sub}
            </text>
          </g>
        ))}

        {/* 인증 라벨 — 선택한 규제 수 */}
        <text
          x="300"
          y="220"
          textAnchor="middle"
          fontFamily="JetBrains Mono, monospace"
          fontSize="10"
          fill="var(--ink-mute)"
          letterSpacing="2"
        >
          {regs.length > 0
            ? regs
                .map((r) => r.name.split(':')[0].replace('FDA ', ''))
                .slice(0, 4)
                .join(' · ')
                .toUpperCase()
            : 'NO REGULATIONS SELECTED'}
        </text>
        <text
          x="300"
          y="238"
          textAnchor="middle"
          fontFamily="JetBrains Mono, monospace"
          fontSize="9"
          fill="var(--ink-faint)"
          letterSpacing="2"
        >
          ALL NODES ARE BIDIRECTIONALLY LINKED
        </text>
      </svg>
    </div>
  )
}
