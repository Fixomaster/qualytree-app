import React from 'react'
import WhyPanel from '../../components/WhyPanel'
import { Building2, MapPin, Users, ShieldCheck } from 'lucide-react'

const CERT_OPTIONS = [
  { id: 'iso-13485', label: 'ISO 13485:2016', desc: '의료기기 QMS' },
  { id: 'iso-9001', label: 'ISO 9001:2015', desc: '일반 QMS' },
  { id: 'kgmp', label: 'KGMP', desc: '한국 GMP' },
  { id: 'mdsap', label: 'MDSAP', desc: '5개국 단일 심사' },
  { id: 'fda-reg', label: 'FDA Registration', desc: '미국 시설 등록' },
  { id: 'mdr-ce', label: 'CE MDR', desc: 'EU 적합성 평가' },
  { id: 'iso-27001', label: 'ISO 27001', desc: '정보보안' },
  { id: 'none', label: '아직 없음', desc: '신규 회사 또는 신규 분야' },
]

const SIZE_OPTIONS = [
  { id: '1-10', label: '1~10명' },
  { id: '11-30', label: '11~30명' },
  { id: '31-100', label: '31~100명' },
  { id: '101-300', label: '101~300명' },
  { id: '300+', label: '300명 이상' },
]

export default function StepCompany({ data, update, onNext }) {
  const set = (key, value) => update({ ...data, [key]: value })

  const toggleCert = (id) => {
    const exists = data.existingCerts.includes(id)
    let next = exists
      ? data.existingCerts.filter((c) => c !== id)
      : [...data.existingCerts, id]
    // "없음" 선택 시 다른 항목 모두 해제
    if (id === 'none' && !exists) next = ['none']
    if (id !== 'none') next = next.filter((c) => c !== 'none')
    update({ ...data, existingCerts: next })
  }

  const canProceed = data.name && data.bizNumber && data.site

  return (
    <div className="grid lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 space-y-5">
        <Field label="회사명" required>
          <input
            type="text"
            value={data.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="(주)퀄리트리메디컬"
            className="input-base"
          />
        </Field>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="사업자등록번호" required>
            <input
              type="text"
              value={data.bizNumber}
              onChange={(e) => set('bizNumber', e.target.value)}
              placeholder="000-00-00000"
              className="input-base"
            />
          </Field>
          <Field label="대표 사이트(공장)" required hint="제조 공장 위치">
            <input
              type="text"
              value={data.site}
              onChange={(e) => set('site', e.target.value)}
              placeholder="본사 / 인천 1공장 등"
              className="input-base"
            />
          </Field>
        </div>

        <Field label="회사 주소">
          <input
            type="text"
            value={data.address}
            onChange={(e) => set('address', e.target.value)}
            placeholder="서울특별시 …"
            className="input-base"
          />
        </Field>

        <Field label="직원 수" hint="ISO 13485 §6.2 인적자원 평가 기준">
          <div className="grid grid-cols-5 gap-2">
            {SIZE_OPTIONS.map((s) => (
              <RadioBtn
                key={s.id}
                checked={data.employeeCount === s.id}
                onClick={() => set('employeeCount', s.id)}
                label={s.label}
              />
            ))}
          </div>
        </Field>

        <Field
          label="현재 보유한 인증 (해당하는 항목 모두 선택)"
          hint="이미 받은 인증이 있으면 알려주세요. 없어도 OK."
        >
          <div className="grid sm:grid-cols-2 gap-2">
            {CERT_OPTIONS.map((c) => (
              <CheckCard
                key={c.id}
                checked={data.existingCerts.includes(c.id)}
                onClick={() => toggleCert(c.id)}
                label={c.label}
                desc={c.desc}
              />
            ))}
          </div>
        </Field>

        <div className="pt-4 flex justify-end">
          <button
            disabled={!canProceed}
            onClick={onNext}
            className="btn-primary"
          >
            다음 — 제품 등록 →
          </button>
        </div>
      </div>

      <div className="lg:col-span-4">
        <WhyPanel
          title="회사 정보로 무엇이 결정되나요?"
          body={
            <>
              회사·사이트·직원 수는 <strong>인증 단위(certificate scope)</strong>를 결정합니다.
              이 입력으로 ISO 13485 등록 범위, MDSAP·KGMP 다중 사이트 적용 여부,
              13.13.3 SoD 보상 통제 옵션이 자동으로 결정됩니다.
              <br />
              <br />
              보유 인증 정보는 갭 분석과 자동 매핑의 시작점이 됩니다.
            </>
          }
          refs={[
            'ISO 13485:2016 §4.1.6',
            'MDSAP Multi-Site Approach',
            'Project Instructions §11.3.5',
          ]}
        />
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

function RadioBtn({ checked, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-2 rounded-lg text-[12.5px] transition"
      style={{
        background: checked ? 'var(--moss)' : 'var(--bg-card)',
        color: checked ? 'var(--bg)' : 'var(--ink)',
        border: `1px solid ${checked ? 'var(--moss)' : 'var(--line-strong)'}`,
        fontWeight: checked ? 500 : 400,
      }}
    >
      {label}
    </button>
  )
}

function CheckCard({ checked, onClick, label, desc }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left p-3 rounded-xl transition flex items-start gap-2.5"
      style={{
        background: checked ? 'var(--leaf-soft)' : 'var(--bg-card)',
        border: `1px solid ${checked ? 'var(--leaf)' : 'var(--line-strong)'}`,
      }}
    >
      <span
        className="mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0"
        style={{
          background: checked ? 'var(--leaf)' : 'transparent',
          border: `1.5px solid ${checked ? 'var(--leaf)' : 'var(--line-strong)'}`,
        }}
      >
        {checked && <span style={{ color: 'var(--bg)', fontSize: 11, fontWeight: 700 }}>✓</span>}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px]" style={{ color: 'var(--ink)', fontWeight: 500 }}>
          {label}
        </div>
        <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>
          {desc}
        </div>
      </div>
    </button>
  )
}
