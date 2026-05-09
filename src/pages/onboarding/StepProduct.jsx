import React, { useMemo } from 'react'
import WhyPanel from '../../components/WhyPanel'
import {
  DEVICE_CONTACT_TYPES,
  DEVICE_USES_ELECTRICITY,
  DEVICE_HAS_SOFTWARE,
  classifyDevice,
} from '../../lib/regulations'
import { ArrowLeft, Sparkles } from 'lucide-react'

export default function StepProduct({ data, update, onNext, onBack }) {
  const set = (key, value) => update({ ...data, [key]: value })

  // 자동 등급 분류 (실시간)
  const classification = useMemo(() => {
    if (!data.contact) return null
    return classifyDevice({
      contact: data.contact,
      electricity: data.electricity,
      software: data.software,
    })
  }, [data.contact, data.electricity, data.software])

  // 분류 결과를 데이터에 저장
  React.useEffect(() => {
    if (classification && JSON.stringify(classification) !== JSON.stringify(data.classification)) {
      update({ ...data, classification })
    }
  }, [classification])

  const canProceed = data.name && data.modelNumber && data.contact

  return (
    <div className="grid lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="제품명" required>
            <input
              type="text"
              value={data.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="예: TitanLock 골절 고정판"
              className="input-base"
            />
          </Field>
          <Field label="모델 번호" required>
            <input
              type="text"
              value={data.modelNumber}
              onChange={(e) => set('modelNumber', e.target.value)}
              placeholder="예: TL-2024-A"
              className="input-base"
            />
          </Field>
        </div>

        <Field label="의도된 사용 (Intended Use)" hint="자유롭게 설명. 나중에 더 다듬을 수 있어요">
          <textarea
            value={data.intendedUse}
            onChange={(e) => set('intendedUse', e.target.value)}
            placeholder="예: 골절된 장골에 영구 삽입되어 골 유합을 보조하는 임플란트"
            rows={3}
            className="input-base resize-none"
          />
        </Field>

        <Field
          label="제품이 환자 신체와 어떻게 접촉하나요?"
          required
          hint="가장 가까운 항목 하나만"
        >
          <div className="space-y-2">
            {DEVICE_CONTACT_TYPES.map((c) => (
              <RadioRow
                key={c.id}
                checked={data.contact === c.id}
                onClick={() => set('contact', c.id)}
                label={c.label}
                en={c.en}
                hint={c.hint}
              />
            ))}
          </div>
        </Field>

        <Field label="전기를 사용하나요?" hint="IEC 60601-1 적용 여부 결정">
          <div className="grid sm:grid-cols-3 gap-2">
            {DEVICE_USES_ELECTRICITY.map((e) => (
              <PickOne
                key={e.id}
                checked={data.electricity === e.id}
                onClick={() => set('electricity', e.id)}
                label={e.label}
                impact={e.impact}
              />
            ))}
          </div>
        </Field>

        <Field label="소프트웨어가 포함되나요?" hint="IEC 62304 적용 여부 결정">
          <div className="grid sm:grid-cols-3 gap-2">
            {DEVICE_HAS_SOFTWARE.map((s) => (
              <PickOne
                key={s.id}
                checked={data.software === s.id}
                onClick={() => set('software', s.id)}
                label={s.label}
                impact={s.impact}
              />
            ))}
          </div>
        </Field>

        <div className="pt-4 flex justify-between">
          <button
            onClick={onBack}
            className="btn-ghost"
          >
            <ArrowLeft size={14} />
            이전
          </button>
          <button
            disabled={!canProceed}
            onClick={onNext}
            className="btn-primary"
          >
            다음 — 공정 정의 →
          </button>
        </div>
      </div>

      <div className="lg:col-span-4 space-y-4">
        <WhyPanel
          title="제품 등급은 모든 인허가의 출발점"
          body={
            <>
              환자 접촉·전기·SW 답변만으로 시스템이 자동으로 <strong>FDA / MDR / KGMP 등급</strong>을
              계산하고, 어떤 시험(생체적합성·전기안전성 등)이 필요한지를 결정합니다.
              <br />
              <br />
              직접 계산하지 않으셔도 됩니다 — 답하시는 즉시 우측 패널에 결과가 표시됩니다.
            </>
          }
          refs={[
            'MDR Annex VIII (분류 규칙)',
            'FDA 21 CFR 860 (Classification)',
            'ISO 14971:2019 (위험 등급)',
          ]}
        />

        {/* Live classification result */}
        {classification && (
          <div
            className="rounded-2xl p-5 fade-in"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--line)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={13} style={{ color: 'var(--amber)' }} />
              <span
                className="font-mono text-[10px] tracking-[0.18em] uppercase"
                style={{ color: 'var(--amber)' }}
              >
                AUTO CLASSIFICATION
              </span>
            </div>
            <div className="font-display text-[15px] leading-tight" style={{ fontWeight: 500 }}>
              자동 분류 결과
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <ClassPill label="FDA" cls={classification.fdaClass} />
              <ClassPill label="MDR" cls={classification.mdrClass} />
              <ClassPill label="MFDS" cls={classification.kmfdsClass} />
            </div>
            {classification.reasoning.length > 0 && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
                <div
                  className="font-mono text-[9.5px] tracking-[0.18em] uppercase mb-1.5"
                  style={{ color: 'var(--ink-mute)' }}
                >
                  근거
                </div>
                <ul className="space-y-1">
                  {classification.reasoning.map((r, i) => (
                    <li
                      key={i}
                      className="text-[11.5px]"
                      style={{ color: 'var(--ink-soft)' }}
                    >
                      • {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, required, hint, children }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-[13px]" style={{ color: 'var(--ink-soft)', fontWeight: 500 }}>
          {label}
          {required && (
            <span className="ml-1" style={{ color: 'var(--rust)' }}>
              *
            </span>
          )}
        </label>
        {hint && (
          <span className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

function RadioRow({ checked, onClick, label, en, hint }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-3 rounded-xl transition flex items-start gap-3"
      style={{
        background: checked ? 'var(--leaf-soft)' : 'var(--bg-card)',
        border: `1px solid ${checked ? 'var(--leaf)' : 'var(--line-strong)'}`,
      }}
    >
      <span
        className="mt-1 w-4 h-4 rounded-full flex items-center justify-center shrink-0"
        style={{
          background: checked ? 'var(--leaf)' : 'transparent',
          border: `1.5px solid ${checked ? 'var(--leaf)' : 'var(--line-strong)'}`,
        }}
      >
        {checked && (
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--bg)' }}
          />
        )}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[13.5px]" style={{ color: 'var(--ink)', fontWeight: 500 }}>
            {label}
          </span>
          <span className="text-[11px] font-display italic" style={{ color: 'var(--ink-mute)' }}>
            {en}
          </span>
        </div>
        {hint && (
          <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>
            {hint}
          </div>
        )}
      </div>
    </button>
  )
}

function PickOne({ checked, onClick, label, impact }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left p-3 rounded-xl transition"
      style={{
        background: checked ? 'var(--leaf-soft)' : 'var(--bg-card)',
        border: `1px solid ${checked ? 'var(--leaf)' : 'var(--line-strong)'}`,
      }}
    >
      <div className="text-[13px]" style={{ color: 'var(--ink)', fontWeight: 500 }}>
        {label}
      </div>
      {impact && (
        <div className="text-[11px] mt-1 font-mono" style={{ color: 'var(--moss)' }}>
          → {impact}
        </div>
      )}
    </button>
  )
}

function ClassPill({ label, cls }) {
  const tone =
    cls === 'III' || cls === '4'
      ? 'rust'
      : cls === 'IIb' || cls === '3'
      ? 'amber'
      : cls === 'II' || cls === 'IIa' || cls === '2'
      ? 'leaf'
      : 'moss'
  const colors = {
    rust: { bg: 'var(--rust-soft)', text: 'var(--rust)' },
    amber: { bg: 'var(--amber-soft)', text: 'var(--amber)' },
    leaf: { bg: 'var(--leaf-soft)', text: 'var(--moss)' },
    moss: { bg: 'var(--bg-soft)', text: 'var(--ink-mute)' },
  }
  return (
    <div
      className="text-center py-2 px-2 rounded-lg"
      style={{ background: colors[tone].bg }}
    >
      <div
        className="font-mono text-[9.5px] tracking-wider"
        style={{ color: colors[tone].text, opacity: 0.7 }}
      >
        {label}
      </div>
      <div
        className="font-display text-[18px] mt-0.5"
        style={{ color: colors[tone].text, fontWeight: 600 }}
      >
        {cls}
      </div>
    </div>
  )
}
