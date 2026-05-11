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

          {/* 회사 신청 / 운영자 콘솔 */}
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

        {/* 나무 SVG — Outline-only Tree (몸통·가지 윤곽만) */}
        <div
          className="absolute pointer-events-none"
          style={{ top: 0, right: 0, bottom: 0, width: '65%', opacity: 0.95, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg
            viewBox="0 0 400 600"
            preserveAspectRatio="xMidYMid meet"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: '100%', height: '100%', overflow: 'visible' }}
          >
            <defs>
              <radialGradient id="canopyGlow" cx="50%" cy="40%" r="50%">
                <stop offset="0%" stopColor="rgba(248,244,236,0.06)" />
                <stop offset="100%" stopColor="rgba(248,244,236,0)" />
              </radialGradient>
            </defs>

            {/* 수관 글로우 */}
            <circle cx="200" cy="220" r="200" fill="url(#canopyGlow)" />

            {/* 지면(뿌리) — 점선 */}
            <line x1="100" y1="555" x2="300" y2="555" stroke="rgba(248,244,236,0.45)" strokeWidth="1" strokeDasharray="2 4" />

            {/* === 나무 실루엣 (outline only) === */}
            {/* 화분/베이스 (선택적 — 안정감) */}
            <path
              d="M 165 555 L 170 540 L 230 540 L 235 555 Z"
              stroke="rgba(248,244,236,0.65)"
              strokeWidth="2"
              fill="none"
              strokeLinejoin="round"
            />

            {/* 줄기 윤곽선 — 위로 갈수록 가늘어지는 두꺼운 trunk */}
            <path
              d="M 178 540
                 C 175 480, 172 420, 178 360
                 C 180 320, 178 280, 185 230
                 L 188 220
                 M 222 540
                 C 225 480, 228 420, 222 360
                 C 220 320, 222 280, 215 230
                 L 212 220"
              stroke="rgba(248,244,236,0.75)"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* 줄기 상단 연결부 (양쪽 줄기가 만나는 부분) */}
            <path
              d="M 185 230 Q 200 220, 215 230"
              stroke="rgba(248,244,236,0.75)"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />

            {/* === 가지 윤곽선 — 두꺼운 stroke로 실루엣 느낌 === */}
            {/* 중앙 위쪽 가지 (QMS 방향) */}
            <path
              d="M 200 225 C 198 180, 200 130, 200 90"
              stroke="rgba(248,244,236,0.7)"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />

            {/* 좌측 상단 가지 (510k) */}
            <path
              d="M 195 230 C 175 200, 160 170, 138 140"
              stroke="rgba(248,244,236,0.7)"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />

            {/* 우측 상단 가지 (KGMP) */}
            <path
              d="M 205 230 C 225 200, 245 170, 262 140"
              stroke="rgba(248,244,236,0.7)"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />

            {/* 좌측 중단 가지 (CAPA) */}
            <path
              d="M 190 250 C 160 240, 130 220, 105 210"
              stroke="rgba(248,244,236,0.65)"
              strokeWidth="2.8"
              fill="none"
              strokeLinecap="round"
            />

            {/* 우측 중단 가지 (MDR) */}
            <path
              d="M 210 250 C 240 240, 270 220, 295 210"
              stroke="rgba(248,244,236,0.65)"
              strokeWidth="2.8"
              fill="none"
              strokeLinecap="round"
            />

            {/* 좌측 중하단 가지 (DMR) */}
            <path
              d="M 185 290 C 155 295, 130 305, 120 315"
              stroke="rgba(248,244,236,0.6)"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />

            {/* 우측 중하단 가지 (Risk) */}
            <path
              d="M 215 290 C 245 295, 270 305, 280 315"
              stroke="rgba(248,244,236,0.6)"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />

            {/* 좌측 하단 가지 (SOP) */}
            <path
              d="M 185 350 C 175 365, 168 375, 162 385"
              stroke="rgba(248,244,236,0.55)"
              strokeWidth="2.2"
              fill="none"
              strokeLinecap="round"
            />

            {/* 우측 하단 가지 (DHF) */}
            <path
              d="M 215 350 C 225 365, 232 375, 238 385"
              stroke="rgba(248,244,236,0.55)"
              strokeWidth="2.2"
              fill="none"
              strokeLinecap="round"
            />

            {/* 추가 잔가지 (장식용 — 풍성하게) */}
            <path d="M 175 200 C 165 195, 155 195, 148 198" stroke="rgba(248,244,236,0.35)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M 225 200 C 235 195, 245 195, 252 198" stroke="rgba(248,244,236,0.35)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M 175 290 C 165 292, 158 295, 152 300" stroke="rgba(248,244,236,0.35)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M 225 290 C 235 292, 242 295, 248 300" stroke="rgba(248,244,236,0.35)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M 200 380 C 192 388, 188 395, 185 402" stroke="rgba(248,244,236,0.35)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M 200 380 C 208 388, 212 395, 215 402" stroke="rgba(248,244,236,0.35)" strokeWidth="1.5" fill="none" strokeLinecap="round" />

            {/* === 인증 잎 9개 (가지 끝에 자리) === */}
            <g className="leaf leaf-1">
              <circle cx="200" cy="90" r="34" fill="var(--amber)" stroke="var(--moss)" strokeWidth="2"/>
              <text x="200" y="96" textAnchor="middle" fontSize="14" fontFamily="ui-monospace, monospace" fill="var(--bg)" fontWeight="700">QMS</text>
            </g>
            <g className="leaf leaf-2">
              <circle cx="138" cy="140" r="30" fill="rgba(248,244,236,0.95)" stroke="var(--moss)" strokeWidth="1.5"/>
              <text x="138" y="145" textAnchor="middle" fontSize="12" fontFamily="ui-monospace, monospace" fill="var(--moss)" fontWeight="600">510(k)</text>
            </g>
            <g className="leaf leaf-3">
              <circle cx="262" cy="140" r="30" fill="rgba(248,244,236,0.95)" stroke="var(--moss)" strokeWidth="1.5"/>
              <text x="262" y="145" textAnchor="middle" fontSize="12" fontFamily="ui-monospace, monospace" fill="var(--moss)" fontWeight="600">KGMP</text>
            </g>
            <g className="leaf leaf-4">
              <circle cx="105" cy="210" r="28" fill="var(--amber)" stroke="var(--moss)" strokeWidth="1.5"/>
              <text x="105" y="215" textAnchor="middle" fontSize="11" fontFamily="ui-monospace, monospace" fill="var(--bg)" fontWeight="600">CAPA</text>
            </g>
            <g className="leaf leaf-5">
              <circle cx="295" cy="210" r="28" fill="rgba(248,244,236,0.95)" stroke="var(--moss)" strokeWidth="1.5"/>
              <text x="295" y="215" textAnchor="middle" fontSize="11" fontFamily="ui-monospace, monospace" fill="var(--moss)" fontWeight="600">MDR</text>
            </g>
            <g className="leaf leaf-6">
              <circle cx="120" cy="315" r="28" fill="rgba(248,244,236,0.95)" stroke="var(--moss)" strokeWidth="1.5"/>
              <text x="120" y="320" textAnchor="middle" fontSize="11" fontFamily="ui-monospace, monospace" fill="var(--moss)" fontWeight="600">DMR</text>
            </g>
            <g className="leaf leaf-7">
              <circle cx="280" cy="315" r="28" fill="var(--amber)" stroke="var(--moss)" strokeWidth="1.5"/>
              <text x="280" y="320" textAnchor="middle" fontSize="11" fontFamily="ui-monospace, monospace" fill="var(--bg)" fontWeight="600">Risk</text>
            </g>
            <g className="leaf leaf-8">
              <circle cx="162" cy="385" r="26" fill="rgba(248,244,236,0.95)" stroke="var(--moss)" strokeWidth="1.5"/>
              <text x="162" y="390" textAnchor="middle" fontSize="11" fontFamily="ui-monospace, monospace" fill="var(--moss)" fontWeight="600">SOP</text>
            </g>
            <g className="leaf leaf-9">
              <circle cx="238" cy="385" r="26" fill="rgba(248,244,236,0.95)" stroke="var(--moss)" strokeWidth="1.5"/>
              <text x="238" y="390" textAnchor="middle" fontSize="11" fontFamily="ui-monospace, monospace" fill="var(--moss)" fontWeight="600">DHF</text>
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

        {/* 카피·불릿 */}
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