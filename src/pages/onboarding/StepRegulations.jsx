import React, { useMemo } from 'react'
import { ArrowLeft, Globe2, ShieldCheck, AlertCircle } from 'lucide-react'
import WhyPanel from '../../components/WhyPanel'
import { REGULATIONS } from '../../lib/regulations'

const MARKETS = [
  { id: 'korea', name: '한국', recommends: ['kgmp'] },
  { id: 'us', name: '미국', recommends: ['fda-510k', 'fda-qmsr'] },
  { id: 'eu', name: '유럽 (EU)', recommends: ['mdr'] },
  { id: 'japan', name: '일본', recommends: ['pmda'] },
  { id: 'china', name: '중국', recommends: ['nmpa'] },
  { id: 'multi', name: 'MDSAP 5개국', recommends: ['mdsap'], desc: '미국·캐나다·호주·브라질·일본 단일 심사' },
]

export default function StepRegulations({ data, update, onNext, onBack }) {
  // data.targetMarkets, data.regulations
  const targetMarkets = data.targetMarkets || []
  const regulations = data.regulations || ['iso-13485']

  const toggleMarket = (mid) => {
    const exists = targetMarkets.includes(mid)
    const nextMarkets = exists
      ? targetMarkets.filter((m) => m !== mid)
      : [...targetMarkets, mid]

    // 자동 추천 인증 추가
    const market = MARKETS.find((m) => m.id === mid)
    let nextRegs = [...regulations]
    if (!exists && market) {
      market.recommends.forEach((r) => {
        if (!nextRegs.includes(r)) nextRegs.push(r)
      })
    }
    update({ ...data, targetMarkets: nextMarkets, regulations: nextRegs })
  }

  const toggleReg = (rid) => {
    if (rid === 'iso-13485') return // 항상 포함
    const exists = regulations.includes(rid)
    const nextRegs = exists
      ? regulations.filter((r) => r !== rid)
      : [...regulations, rid]
    update({ ...data, regulations: nextRegs })
  }

  // 자동 매핑 결과
  const summary = useMemo(() => {
    const selected = REGULATIONS.filter((r) => regulations.includes(r.id))
    const overlapping = []
    if (regulations.includes('iso-13485') && regulations.includes('fda-qmsr')) {
      overlapping.push({
        a: 'ISO 13485:2016',
        b: 'FDA QMSR (2026.2.2)',
        note: '대부분 동일. 한 번 입력 → 양쪽 양식 동시 발행',
      })
    }
    if (regulations.includes('iso-13485') && regulations.includes('kgmp')) {
      overlapping.push({
        a: 'ISO 13485:2016',
        b: 'KGMP',
        note: 'KGMP는 ISO 13485 기반 + 한국 추가 요구',
      })
    }
    return { selected, overlapping }
  }, [regulations])

  const canProceed = targetMarkets.length > 0

  return (
    <div className="grid lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 space-y-6">
        {/* Step 1: 진출 시장 선택 */}
        <div>
          <SectionLabel num="1" text="진출하려는 시장을 모두 선택해주세요" />
          <div className="mt-3 grid sm:grid-cols-2 gap-2">
            {MARKETS.map((m) => (
              <button
                key={m.id}
                onClick={() => toggleMarket(m.id)}
                className="text-left p-3.5 rounded-xl transition flex items-start gap-3"
                style={{
                  background: targetMarkets.includes(m.id)
                    ? 'var(--leaf-soft)'
                    : 'var(--bg-card)',
                  border: `1px solid ${
                    targetMarkets.includes(m.id) ? 'var(--leaf)' : 'var(--line-strong)'
                  }`,
                }}
              >
                <span
                  className="mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0"
                  style={{
                    background: targetMarkets.includes(m.id) ? 'var(--leaf)' : 'transparent',
                    border: `1.5px solid ${
                      targetMarkets.includes(m.id) ? 'var(--leaf)' : 'var(--line-strong)'
                    }`,
                  }}
                >
                  {targetMarkets.includes(m.id) && (
                    <span style={{ color: 'var(--bg)', fontSize: 11, fontWeight: 700 }}>✓</span>
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Globe2 size={13} style={{ color: 'var(--ink-mute)' }} />
                    <span className="text-[14px]" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                      {m.name}
                    </span>
                  </div>
                  {m.desc && (
                    <div className="text-[11.5px] mt-1 ml-5" style={{ color: 'var(--ink-mute)' }}>
                      {m.desc}
                    </div>
                  )}
                  <div
                    className="text-[10.5px] mt-1 ml-5 font-mono"
                    style={{ color: 'var(--moss)' }}
                  >
                    → {m.recommends.join(', ')}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: 적용될 인증 (자동 + 수정 가능) */}
        <div>
          <SectionLabel
            num="2"
            text="적용될 인증·규제 (자동 추가 — 수정 가능)"
            hint="시장 선택에 따라 자동 추천. 필요 시 수동 추가 가능"
          />
          <div className="mt-3 space-y-2">
            {REGULATIONS.map((r) => {
              const checked = regulations.includes(r.id)
              const locked = r.id === 'iso-13485'
              return (
                <button
                  key={r.id}
                  onClick={() => !locked && toggleReg(r.id)}
                  disabled={locked}
                  className="w-full text-left p-3 rounded-xl transition flex items-start gap-3"
                  style={{
                    background: checked ? 'var(--leaf-soft)' : 'var(--bg-card)',
                    border: `1px solid ${checked ? 'var(--leaf)' : 'var(--line-strong)'}`,
                    cursor: locked ? 'default' : 'pointer',
                  }}
                >
                  <span
                    className="mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0"
                    style={{
                      background: checked ? 'var(--leaf)' : 'transparent',
                      border: `1.5px solid ${checked ? 'var(--leaf)' : 'var(--line-strong)'}`,
                    }}
                  >
                    {checked && (
                      <span style={{ color: 'var(--bg)', fontSize: 11, fontWeight: 700 }}>✓</span>
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-[13.5px]" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                        {r.name}
                      </span>
                      <span className="text-[11px]" style={{ color: 'var(--ink-mute)' }}>
                        {r.region}
                      </span>
                      {locked && (
                        <span
                          className="font-mono text-[9px] tracking-wider px-1.5 py-0.5 rounded"
                          style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}
                        >
                          REQUIRED
                        </span>
                      )}
                    </div>
                    <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>
                      {r.desc}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="pt-4 flex justify-between">
          <button onClick={onBack} className="btn-ghost">
            <ArrowLeft size={14} />
            이전
          </button>
          <button disabled={!canProceed} onClick={onNext} className="btn-primary">
            다음 — 역할·자격 →
          </button>
        </div>
      </div>

      <div className="lg:col-span-4 space-y-4">
        <WhyPanel
          title="다중 규제 동시 매핑"
          body={
            <>
              여러 시장에 진출하시면 인증마다 비슷하지만 다른 양식을 요구합니다. Qualytree는
              <strong> 한 번 입력하면 모든 양식을 동시에 발행</strong>합니다. 공통·차이·충돌
              항목은 자동으로 식별됩니다.
            </>
          }
          refs={[
            'ISO 13485:2016 → KGMP·FDA QMSR 일관 적용',
            'MDSAP → 5개국 단일 심사',
            'Project Instructions §13.16',
          ]}
        />

        {/* Live overlap analysis */}
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--line)',
          }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <ShieldCheck size={13} style={{ color: 'var(--moss)' }} />
            <span
              className="font-mono text-[10px] tracking-[0.18em] uppercase"
              style={{ color: 'var(--moss)' }}
            >
              선택된 인증 — {summary.selected.length}개
            </span>
          </div>
          <ul className="space-y-1">
            {summary.selected.map((s) => (
              <li
                key={s.id}
                className="text-[12px] flex items-baseline gap-2"
                style={{ color: 'var(--ink)' }}
              >
                <span style={{ color: 'var(--moss)' }}>·</span>
                <span style={{ fontWeight: 500 }}>{s.name}</span>
              </li>
            ))}
          </ul>

          {summary.overlapping.length > 0 && (
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
              <div
                className="font-mono text-[9.5px] tracking-[0.18em] uppercase mb-2"
                style={{ color: 'var(--ink-mute)' }}
              >
                자동 통합 가능
              </div>
              {summary.overlapping.map((o, i) => (
                <div key={i} className="text-[11.5px] mb-2" style={{ color: 'var(--ink-soft)' }}>
                  <div style={{ fontWeight: 500, color: 'var(--ink)' }}>
                    {o.a} ↔ {o.b}
                  </div>
                  <div className="mt-0.5">{o.note}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ num, text, hint }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span
          className="w-5 h-5 rounded-full flex items-center justify-center font-mono text-[11px]"
          style={{ background: 'var(--moss)', color: 'var(--bg)', fontWeight: 600 }}
        >
          {num}
        </span>
        <span className="text-[14px]" style={{ color: 'var(--ink)', fontWeight: 500 }}>
          {text}
        </span>
      </div>
      {hint && (
        <div className="text-[11.5px] mt-1 ml-7" style={{ color: 'var(--ink-mute)' }}>
          {hint}
        </div>
      )}
    </div>
  )
}
