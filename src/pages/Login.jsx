import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ShieldCheck, Lock, Mail, Loader2 } from 'lucide-react'
import Logo from '../components/Logo'
import { auth } from '../lib/auth'

export default function Login() {
  const nav = useNavigate()
  const [email, setEmail] = useState('demo@qualytree.app')
  const [password, setPassword] = useState('qualytree123')
  const [name, setName] = useState('Demo User')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!email || !password) {
      setError('이메일과 비밀번호를 모두 입력해주세요.')
      return
    }
    if (!email.includes('@')) {
      setError('올바른 이메일 형식이 아닙니다.')
      return
    }

    setLoading(true)
    // Simulate auth delay (real implementation: SSO/OAuth + MFA per §11.3)
    await new Promise((r) => setTimeout(r, 600))

    auth.signIn(email, name)
    setLoading(false)
    nav('/dashboard')
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* Left: form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px] fade-in">
          <Logo size={32} />

          <h1
            className="font-display mt-12 leading-tight"
            style={{ fontSize: 36, fontWeight: 480, color: 'var(--ink)' }}
          >
            로그인
          </h1>
          <p className="mt-2 text-[14px]" style={{ color: 'var(--ink-mute)' }}>
            Qualytree Platform — 의료기기 RA·QMS 통합 SaaS
          </p>

          <form onSubmit={onSubmit} className="mt-10 space-y-4">
            <Field
              label="이메일"
              icon={Mail}
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@company.com"
              autoFocus
            />
            <Field
              label="이름"
              type="text"
              value={name}
              onChange={setName}
              placeholder="홍길동"
              hint="처음 로그인 시에만 입력"
            />
            <Field
              label="비밀번호"
              icon={Lock}
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
            />

            {error && (
              <div
                className="px-3 py-2 rounded-lg text-[13px]"
                style={{
                  background: 'var(--rust-soft)',
                  color: 'var(--rust)',
                  border: '1px solid rgba(139,58,31,0.2)',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center"
              style={{ marginTop: 16 }}
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  로그인 중…
                </>
              ) : (
                <>
                  로그인 <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-8">
            <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
            <span
              className="font-mono text-[10px] tracking-[0.18em] uppercase"
              style={{ color: 'var(--ink-faint)' }}
            >
              OR
            </span>
            <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
          </div>

          <div className="space-y-2">
            <SsoButton label="Microsoft 계정으로 로그인" disabled />
            <SsoButton label="Google Workspace로 로그인" disabled />
          </div>

          <p className="mt-8 text-[12px]" style={{ color: 'var(--ink-mute)' }}>
            계정이 없으신가요?{' '}
            <a className="underline" style={{ color: 'var(--moss)' }} href="#">
              회사 계정 신청
            </a>
          </p>

          {/* Demo notice */}
          <div
            className="mt-12 p-3.5 rounded-xl text-[12px] leading-relaxed"
            style={{
              background: 'var(--amber-soft)',
              border: '1px solid rgba(200,119,45,0.30)',
              color: 'var(--ink-soft)',
            }}
          >
            <div className="flex items-center gap-1.5 mb-1.5 font-medium" style={{ color: 'var(--rust)' }}>
              <span className="font-mono text-[10px] tracking-wider">DEMO MODE</span>
            </div>
            현재 데모 환경입니다. 어떤 이메일·비밀번호든 입력하면 로그인됩니다.
            실제 인증(SSO/OAuth + MFA)은 Project Instructions §11.3에 따라 별도 구현됩니다.
          </div>
        </div>
      </div>

      {/* Right: feature panel */}
      <div
        className="hidden lg:flex flex-col justify-between flex-1 p-12 relative overflow-hidden"
        style={{ background: 'var(--moss)', color: 'var(--bg)' }}
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              'radial-gradient(600px 300px at 100% 0%, var(--leaf), transparent 60%), radial-gradient(500px 280px at 0% 100%, var(--amber), transparent 60%)',
          }}
        />

        <div className="relative">
          <div
            className="font-mono text-[10.5px] tracking-[0.22em] uppercase"
            style={{ color: 'var(--amber-soft)' }}
          >
            QUALYTREE PLATFORM · ENT-001
          </div>
        </div>

        <div className="relative max-w-[420px]">
          <div
            className="font-display leading-[1.05]"
            style={{ fontSize: 'clamp(36px, 3.6vw, 52px)', fontWeight: 380 }}
          >
            품질은
            <br />
            <em style={{ fontWeight: 320 }}>나무처럼</em> 자랍니다.
          </div>
          <div
            className="font-display italic mt-3"
            style={{ fontSize: 19, color: 'rgba(248,244,236,0.72)', fontWeight: 300 }}
          >
            Quality grows like a tree.
          </div>

          <ul className="mt-10 space-y-3 text-[14px]" style={{ color: 'rgba(248,244,236,0.86)' }}>
            <Bullet text="RA 비전공자도 화면 안내만 따라가면 인허가 서류 자동 완성" />
            <Bullet text="담당자가 바뀌어도 5분 안에 인수인계 — 결정 일지 자동 누적" />
            <Bullet text="ISO 13485 + FDA QMSR + KGMP + EU MDR 동시 매핑" />
            <Bullet text="21 CFR Part 11 무결성 + GAMP 5 검증 + BYOK 백업" />
          </ul>
        </div>

        <div
          className="relative font-mono text-[10.5px] tracking-[0.16em] flex items-center gap-2"
          style={{ color: 'rgba(248,244,236,0.55)' }}
        >
          <ShieldCheck size={13} />
          <span>21 CFR PART 11 · ISO 27001 · SOC 2 · ISMS-P</span>
        </div>
      </div>
    </div>
  )
}

function Field({ label, icon: Icon, type = 'text', value, onChange, placeholder, hint, autoFocus }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label
          className="text-[12.5px]"
          style={{ color: 'var(--ink-soft)', fontWeight: 500 }}
        >
          {label}
        </label>
        {hint && (
          <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>
            {hint}
          </span>
        )}
      </div>
      <div className="relative">
        {Icon && (
          <Icon
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--ink-faint)' }}
          />
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="input-base"
          style={{ paddingLeft: Icon ? 36 : undefined }}
        />
      </div>
    </div>
  )
}

function SsoButton({ label, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="w-full text-[13.5px] py-2.5 rounded-lg flex items-center justify-center gap-2 transition"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--line-strong)',
        color: 'var(--ink)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
      {disabled && (
        <span
          className="font-mono text-[9.5px] tracking-wider px-1.5 py-0.5 rounded"
          style={{ background: 'var(--bg-soft)', color: 'var(--ink-faint)' }}
        >
          SOON
        </span>
      )}
    </button>
  )
}

function Bullet({ text }) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        className="mt-1.5 w-1 h-1 rounded-full shrink-0"
        style={{ background: 'var(--amber-soft)' }}
      />
      <span>{text}</span>
    </li>
  )
}
