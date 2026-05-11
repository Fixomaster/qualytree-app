import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowRight, ShieldCheck, Lock, Mail, Loader2, UserCog } from 'lucide-react'
import Logo from '../components/Logo'
import { auth } from '../lib/auth'
import { LEVELS, LEVEL_LABEL } from '../lib/permissions'

export default function Login() {
  const nav = useNavigate()
  const [email, setEmail] = useState('demo@qualytree.app')
  const [password, setPassword] = useState('qualytree123')
  const [name, setName] = useState('Demo User')
  const [level, setLevel] = useState(LEVELS.MANAGER)
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
    await new Promise((r) => setTimeout(r, 600))
    auth.signIn(email, name, level)
    setLoading(false)
    nav('/dashboard')
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* Left: form */}
      <div className="flex-1 flex items-center justify-center px-6 py-8" style={{ minHeight: '100vh' }}>
        <div className="w-full max-w-[400px] fade-in">
          <Logo size={28} />

          <h1
            className="font-display mt-6 leading-tight"
            style={{ fontSize: 30, fontWeight: 480, color: 'var(--ink)' }}
          >
            로그인
          </h1>
          <p className="mt-1.5 text-[13px]" style={{ color: 'var(--ink-mute)' }}>
            Qualytree Platform — 의료기기 RA·QMS 통합 SaaS
          </p>

          <form onSubmit={onSubmit} className="mt-5 space-y-3">
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

            {/* 권한 Level 선택 */}
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <label
                  className="text-[12px] flex items-center gap-1.5"
                  style={{ color: 'var(--ink-soft)', fontWeight: 500 }}
                >
                  <UserCog size={12} />
                  권한 Level
                </label>
                <span className="text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>
                  ISO 13485 §5.5 · SoD
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[LEVELS.OPERATOR, LEVELS.INSPECTOR, LEVELS.MANAGER].map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => setLevel(lv)}
                    className="py-1.5 px-1.5 rounded-lg text-center transition"
                    style={{
                      background: level === lv ? 'var(--moss)' : 'var(--bg-card)',
                      color: level === lv ? 'var(--bg)' : 'var(--ink)',
                      border: `1px solid ${
                        level === lv ? 'var(--moss)' : 'var(--line-strong)'
                      }`,
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      className="font-mono text-[9px] tracking-[0.16em] uppercase"
                      style={{
                        color: level === lv ? 'var(--amber-soft)' : 'var(--ink-faint)',
                      }}
                    >
                      Lv {lv}
                    </div>
                    <div
                      className="text-[12px] mt-0.5"
                      style={{ fontWeight: level === lv ? 500 : 400 }}
                    >
                      {LEVEL_LABEL[lv].ko}
                    </div>
                  </button>
                ))}
              </div>
              <div
                className="text-[11px] mt-1 leading-snug"
                style={{ color: 'var(--ink-mute)' }}
              >
                {level === LEVELS.OPERATOR &&
                  '현장 작업: 단계 시작·측정값 입력·전자서명. 정의·발행 불가.'}
                {level === LEVELS.INSPECTOR &&
                  '검사관·QA: 작업자 권한 + 검사 결과 검토·재측정 요청.'}
                {level === LEVELS.MANAGER &&
                  '매니저·RA: 모든 권한. 정의·발행·삭제 가능.'}
              </div>
            </div>

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
              style={{ marginTop: 10 }}
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

          {/* 회사 신청 / 운영자 콘솔 링크 — 로그인 버튼 바로 아래 */}
          <div className="mt-4 flex items-center justify-between text-[12.5px]">
            <span style={{ color: 'var(--ink-mute)' }}>
              계정이 없으신가요?{' '}
              <Link to="/signup" className="underline" style={{ color: 'var(--moss)', fontWeight: 500 }}>
                회사 계정 신청
              </Link>
            </span>
            <Link to="/operator" style={{ color: 'var(--ink-faint)' }}>
              운영자 콘솔 →
            </Link>
          </div>

          {/* Demo notice */}
          <div
            className="mt-5 p-2.5 rounded-xl text-[11.5px] leading-snug"
            style={{
              background: 'var(--amber-soft)',
              border: '1px solid rgba(200,119,45,0.30)',
              color: 'var(--ink-soft)',
            }}
          >
            <div className="flex items-center gap-1.5 mb-1 font-medium" style={{ color: 'var(--rust)' }}>
              <span className="font-mono text-[9.5px] tracking-wider">DEMO MODE</span>
            </div>
            데모 환경입니다. 어떤 이메일·비밀번호든 입력하면 로그인됩니다.
          </div>
        </div>
      </div>

      {/* Right: feature panel */}
      <div
        className="hidden lg:flex flex-col justify-between flex-1 p-10 relative overflow-hidden"
        style={{ background: 'var(--moss)', color: 'var(--bg)', minHeight: '100vh', maxHeight: '100vh' }}
      >
        {/* 배경 그라디언트 */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              'radial-gradient(600px 300px at 100% 0%, var(--leaf), transparent 60%), radial-gradient(500px 280px at 0% 100%, var(--amber), transparent 60%)',
          }}
        />

        {/* 나무 SVG — 우측 패널 전체 배경으로 크게 */}
        <div
          className="absolute pointer-events-none"
          style={{ top: 0, right: 0, bottom: 0, width: '60%', opacity: 0.75 }}
        >
          <svg
            viewBox="0 0 400 800"
            preserveAspectRatio="xMidYMid meet"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: '100%', height: '100%', overflow: 'visible' }}
          >
            {/* 줄기 — 길게 */}
            <line x1="200" y1="80" x2="200" y2="720" stroke="rgba(248,244,236,0.40)" strokeWidth="2.5" strokeLinecap="round" />

            {/* 가지 */}
            <line x1="200" y1="140" x2="120" y2="120" stroke="rgba(248,244,236,0.25)" strokeWidth="1.5" />
            <line x1="200" y1="140" x2="270" y2="100" stroke="rgba(248,244,236,0.25)" strokeWidth="1.5" />
            <line x1="200" y1="220" x2="290" y2="200" stroke="rgba(248,244,236,0.25)" strokeWidth="1.5" />
            <line x1="200" y1="320" x2="115" y2="320" stroke="rgba(248,244,236,0.25)" strokeWidth="1.5" />
            <line x1="200" y1="320" x2="300" y2="340" stroke="rgba(248,244,236,0.25)" strokeWidth="1.5" />
            <line x1="200" y1="450" x2="120" y2="460" stroke="rgba(248,244,236,0.25)" strokeWidth="1.5" />
            <line x1="200" y1="560" x2="290" y2="560" stroke="rgba(248,244,236,0.25)" strokeWidth="1.5" />
            <line x1="200" y1="660" x2="125" y2="660" stroke="rgba(248,244,236,0.25)" strokeWidth="1.5" />

            {/* 잎 — 큰 사이즈 */}
            <g className="leaf leaf-1">
              <circle cx="120" cy="120" r="34" fill="rgba(248,244,236,0.92)" stroke="var(--moss)" strokeWidth="1.5"/>
              <text x="120" y="125" textAnchor="middle" fontSize="14" fontFamily="ui-monospace, monospace" fill="var(--moss)">510(k)</text>
            </g>
            <g className="leaf leaf-2">
              <circle cx="200" cy="65" r="34" fill="var(--amber)" stroke="var(--moss)" strokeWidth="1.5"/>
              <text x="200" y="70" textAnchor="middle" fontSize="14" fontFamily="ui-monospace, monospace" fill="var(--bg)" fontWeight="600">QMS</text>
            </g>
            <g className="leaf leaf-3">
              <circle cx="270" cy="100" r="34" fill="rgba(248,244,236,0.92)" stroke="var(--moss)" strokeWidth="1.5"/>
              <text x="270" y="105" textAnchor="middle" fontSize="14" fontFamily="ui-monospace, monospace" fill="var(--moss)">KGMP</text>
            </g>
            <g className="leaf leaf-4">
              <circle cx="290" cy="200" r="34" fill="rgba(248,244,236,0.92)" stroke="var(--moss)" strokeWidth="1.5"/>
              <text x="290" y="205" textAnchor="middle" fontSize="14" fontFamily="ui-monospace, monospace" fill="var(--moss)">MDR</text>
            </g>
            <g className="leaf leaf-5">
              <circle cx="115" cy="320" r="34" fill="var(--amber)" stroke="var(--moss)" strokeWidth="1.5"/>
              <text x="115" y="325" textAnchor="middle" fontSize="14" fontFamily="ui-monospace, monospace" fill="var(--bg)" fontWeight="600">CAPA</text>
            </g>
            <g className="leaf leaf-6">
              <circle cx="300" cy="340" r="34" fill="var(--amber)" stroke="var(--moss)" strokeWidth="1.5"/>
              <text x="300" y="345" textAnchor="middle" fontSize="14" fontFamily="ui-monospace, monospace" fill="var(--bg)" fontWeight="600">Risk</text>
            </g>
            <g className="leaf leaf-7">
              <circle cx="120" cy="460" r="34" fill="rgba(248,244,236,0.92)" stroke="var(--moss)" strokeWidth="1.5"/>
              <text x="120" y="465" textAnchor="middle" fontSize="14" fontFamily="ui-monospace, monospace" fill="var(--moss)">DMR</text>
            </g>
            <g className="leaf leaf-8">
              <circle cx="290" cy="560" r="34" fill="rgba(248,244,236,0.92)" stroke="var(--moss)" strokeWidth="1.5"/>
              <text x="290" y="565" textAnchor="middle" fontSize="14" fontFamily="ui-monospace, monospace" fill="var(--moss)">SOP</text>
            </g>
            <g className="leaf leaf-9">
              <circle cx="125" cy="660" r="34" fill="rgba(248,244,236,0.92)" stroke="var(--moss)" strokeWidth="1.5"/>
              <text x="125" y="665" textAnchor="middle" fontSize="14" fontFamily="ui-monospace, monospace" fill="var(--moss)">DHF</text>
            </g>
          </svg>
        </div>

        {/* 상단 라벨 */}
        <div className="relative">
          <div
            className="font-mono text-[10px] tracking-[0.22em] uppercase"
            style={{ color: 'var(--amber-soft)' }}
          >
            QUALYTREE PLATFORM · ENT-001
          </div>
        </div>

        {/* 카피·불릿 — 나무가 우측에 있으니 좌측 정렬 */}
        <div className="relative max-w-[380px]">
          <div
            className="font-display leading-[1.05]"
            style={{ fontSize: 'clamp(28px, 2.8vw, 40px)', fontWeight: 380 }}
          >
            품질은
            <br />
            <em style={{ fontWeight: 320 }}>나무처럼</em> 자랍니다.
          </div>
          <div
            className="font-display italic mt-2"
            style={{ fontSize: 16, color: 'rgba(248,244,236,0.72)', fontWeight: 300 }}
          >
            Quality grows like a tree.
          </div>

          <ul className="mt-6 space-y-2 text-[12.5px]" style={{ color: 'rgba(248,244,236,0.86)' }}>
            <Bullet text="RA 비전공자도 화면 안내만 따라가면 인허가 서류 자동 완성" />
            <Bullet text="담당자가 바뀌어도 5분 안에 인수인계 — 결정 일지 자동 누적" />
            <Bullet text="ISO 13485 + FDA QMSR + KGMP + EU MDR 동시 매핑" />
            <Bullet text="21 CFR Part 11 무결성 + GAMP 5 검증 + BYOK 백업" />
          </ul>
        </div>

        {/* 하단 인증 마크 */}
        <div
          className="relative font-mono text-[10px] tracking-[0.16em] flex items-center gap-2"
          style={{ color: 'rgba(248,244,236,0.55)' }}
        >
          <ShieldCheck size={12} />
          <span>21 CFR PART 11 · ISO 27001 · SOC 2 · ISMS-P</span>
        </div>
      </div>

      {/* 잎 페이드인 애니메이션 */}
      <style>{`
        .leaf {
          opacity: 0;
          animation: leafFadeIn 0.6s ease-out forwards;
        }
        .leaf-1 { animation-delay: 0.4s; }
        .leaf-2 { animation-delay: 0.8s; }
        .leaf-3 { animation-delay: 1.2s; }
        .leaf-4 { animation-delay: 1.6s; }
        .leaf-5 { animation-delay: 2.0s; }
        .leaf-6 { animation-delay: 2.4s; }
        .leaf-7 { animation-delay: 2.8s; }
        .leaf-8 { animation-delay: 3.2s; }
        .leaf-9 { animation-delay: 3.6s; }
        @keyframes leafFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function Field({ label, icon: Icon, type = 'text', value, onChange, placeholder, hint, autoFocus }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-[12px]" style={{ color: 'var(--ink-soft)', fontWeight: 500 }}>
          {label}
        </label>
        {hint && (
          <span className="text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>
            {hint}
          </span>
        )}
      </div>
      <div className="relative">
        {Icon && (
          <Icon
            size={14}
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
          style={{ paddingLeft: Icon ? 36 : undefined, paddingTop: 8, paddingBottom: 8 }}
        />
      </div>
    </div>
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