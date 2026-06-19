import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowRight, ShieldCheck, Lock, Mail, Loader2, User, Hash, KeyRound } from 'lucide-react'
import Logo from '../components/Logo'
import { auth } from '../lib/auth'
import { supabase } from '../lib/supabase'

export default function Login() {
  const nav = useNavigate()
  const [mode, setMode] = useState('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [bizNo, setBizNo] = useState('')
  const [wname, setWname] = useState('')
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const [error, setError] = useState(null)
  const [resetMsg, setResetMsg] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null); setResetMsg('')
    setLoading(true)
    try {
      if (mode === 'worker') {
        if (!bizNo.trim() || !wname.trim() || !password) { setError('사업자번호·이름·비밀번호를 모두 입력해주세요.'); setLoading(false); return }
        const { data, error: rpcErr } = await supabase.rpc('member_login_email', { p_business_number: bizNo, p_name: wname.trim() })
        if (rpcErr || !data) { setError('일치하는 계정이 없습니다. 사업자번호·이름·비밀번호를 확인해주세요.'); setLoading(false); return }
        const res = await auth.signInWithPassword(data, password)
        setLoading(false)
        if (!res || !res.ok) { setError('비밀번호가 올바르지 않거나 비활성 계정입니다.'); return }
        nav('/dashboard'); return
      }
      if (!email || !password) { setError('이메일과 비밀번호를 모두 입력해주세요.'); setLoading(false); return }
      if (!email.includes('@')) { setError('올바른 이메일 형식이 아닙니다.'); setLoading(false); return }
      const res = await auth.signInWithPassword(email, password)
      setLoading(false)
      if (!res || !res.ok) { setError((res && res.error) || '로그인에 실패했습니다. 이메일·비밀번호를 확인해주세요.'); return }
      nav('/dashboard')
    } catch (e2) {
      setLoading(false)
      setError('로그인 처리 중 오류: ' + String((e2 && e2.message) || e2))
    }
  }

  const onForgot = async () => {
    setError(null); setResetMsg('')
    if (!email || !email.includes('@')) { setError('재설정 메일을 받을 이메일을 먼저 입력해주세요.'); return }
    try {
      const { error: rErr } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/login' })
      if (rErr) { setError('재설정 메일 발송 실패: ' + (rErr.message || '')); return }
      setResetMsg('비밀번호 재설정 메일을 보냈습니다. 메일함을 확인하세요.')
    } catch (e3) {
      setError('재설정 메일 발송 실패: ' + String((e3 && e3.message) || e3))
    }
  }

  const onDemo = () => {
    setError(null)
    setDemoLoading(true)
    try {
      auth.signIn('demo@qualytree.app', 'Demo User', 3)
      nav('/dashboard')
    } catch (e4) {
      setDemoLoading(false)
      setError('데모 로그인 실패: ' + String((e4 && e4.message) || e4))
    }
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

          {/* 모드 전환 */}
          <div className="mt-5 grid grid-cols-2 gap-1.5 p-1 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line-strong)' }}>
            {[['email', '회사관리자 · 운영자'], ['worker', '작업자']].map(([k, lbl]) => (
              <button key={k} type="button" onClick={() => { setMode(k); setError(null); setResetMsg('') }}
                className="py-1.5 rounded-lg text-[12.5px] transition"
                style={{ background: mode === k ? 'var(--moss)' : 'transparent', color: mode === k ? 'var(--bg)' : 'var(--ink-soft)', fontWeight: mode === k ? 600 : 400, cursor: 'pointer' }}>
                {lbl}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="mt-3 space-y-3">
            {mode === 'email' ? (
              <>
                <Field label="이메일" icon={Mail} type="email" value={email} onChange={setEmail} placeholder="you@company.com" autoFocus />
                <Field label="비밀번호" icon={Lock} type="password" value={password} onChange={setPassword} placeholder="••••••••" />
              </>
            ) : (
              <>
                <Field label="사업자등록번호" icon={Hash} type="text" value={bizNo} onChange={setBizNo} placeholder="123-45-67890" autoFocus />
                <Field label="이름" icon={User} type="text" value={wname} onChange={setWname} placeholder="홍길동" />
                <Field label="비밀번호" icon={Lock} type="password" value={password} onChange={setPassword} placeholder="••••••••" />
                <p className="text-[11px]" style={{ color: 'var(--ink-mute)' }}>작업자·검사관은 회사 관리자가 발급한 사업자번호·이름·비밀번호로 로그인합니다.</p>
              </>
            )}

            {error && (
              <div className="px-3 py-2 rounded-lg text-[13px]" style={{ background: 'var(--rust-soft)', color: 'var(--rust)', border: '1px solid rgba(139,58,31,0.2)' }}>
                {error}
              </div>
            )}
            {resetMsg && (
              <div className="px-3 py-2 rounded-lg text-[13px]" style={{ background: '#e8f3ea', color: '#3c6e46', border: '1px solid rgba(60,110,70,0.25)' }}>
                {resetMsg}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center" style={{ marginTop: 10 }}>
              {loading ? (<><Loader2 size={15} className="animate-spin" /> 로그인 중…</>) : (<>로그인 <ArrowRight size={15} /></>)}
            </button>

            {mode === 'email' && (
              <button type="button" onClick={onForgot} className="w-full flex items-center justify-center gap-1 text-[12px] mt-1" style={{ color: 'var(--ink-faint)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <KeyRound size={12} /> 비밀번호를 잊으셨나요?
              </button>
            )}
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

              {/* 데모 둘러보기 */}
              <button
                type="button"
                onClick={onDemo}
                disabled={demoLoading}
                className="mt-5 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12.5px] transition"
                style={{
                  background: 'var(--amber-soft)',
                  border: '1px solid rgba(200,119,45,0.30)',
                  color: 'var(--ink-soft)',
                  cursor: 'pointer',
                }}
              >
                {demoLoading ? '데모 준비 중…' : '계정 없이 데모로 둘러보기 →'}
              </button>
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

        {/* 나무 SVG — homepage HeroTree와 동일 (진녹색 배경에 맞게 색상 반전) */}
        <div
          className="absolute pointer-events-none"
          style={{ top: '50%', right: 0, transform: 'translateY(-50%)', width: '62%', opacity: 0.95, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg
            viewBox="0 0 520 560"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
          >
            {/* ground line */}
            <line
              x1="40"
              y1="510"
              x2="480"
              y2="510"
              stroke="rgba(248,244,236,0.35)"
              strokeWidth="1"
              strokeDasharray="2 4"
            />

            {/* trunk */}
            <path
              d="M260 510 C 256 460, 256 410, 260 360 S 264 240, 260 130"
              stroke="rgba(248,244,236,0.85)"
              strokeWidth="2.2"
              strokeLinecap="round"
              className="draw-line"
            />

            {/* branches L */}
            <path
              d="M260 380 C 220 372, 180 362, 140 340"
              stroke="rgba(248,244,236,0.85)"
              strokeWidth="1.7"
              strokeLinecap="round"
              className="draw-line"
              style={{ animationDelay: '0.2s' }}
            />
            <path
              d="M260 310 C 215 304, 170 296, 130 280"
              stroke="rgba(248,244,236,0.85)"
              strokeWidth="1.6"
              strokeLinecap="round"
              className="draw-line"
              style={{ animationDelay: '0.4s' }}
            />
            <path
              d="M260 240 C 220 232, 180 220, 145 198"
              stroke="rgba(248,244,236,0.85)"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="draw-line"
              style={{ animationDelay: '0.6s' }}
            />
            <path
              d="M260 175 C 230 165, 200 155, 175 140"
              stroke="rgba(248,244,236,0.85)"
              strokeWidth="1.4"
              strokeLinecap="round"
              className="draw-line"
              style={{ animationDelay: '0.8s' }}
            />

            {/* branches R */}
            <path
              d="M260 360 C 305 352, 350 340, 390 318"
              stroke="rgba(248,244,236,0.85)"
              strokeWidth="1.7"
              strokeLinecap="round"
              className="draw-line"
              style={{ animationDelay: '0.3s' }}
            />
            <path
              d="M260 285 C 305 280, 350 270, 395 252"
              stroke="rgba(248,244,236,0.85)"
              strokeWidth="1.6"
              strokeLinecap="round"
              className="draw-line"
              style={{ animationDelay: '0.5s' }}
            />
            <path
              d="M260 215 C 300 205, 345 192, 380 170"
              stroke="rgba(248,244,236,0.85)"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="draw-line"
              style={{ animationDelay: '0.7s' }}
            />
            <path
              d="M260 150 C 295 140, 330 132, 360 122"
              stroke="rgba(248,244,236,0.85)"
              strokeWidth="1.4"
              strokeLinecap="round"
              className="draw-line"
              style={{ animationDelay: '0.9s' }}
            />

            {/* nodes (leaves) — homepage와 동일 좌표, 흰 배경 + 색 stroke */}
            {[
              { x: 140, y: 340, label: 'DHF', c: 'var(--leaf)', d: 1.0 },
              { x: 130, y: 280, label: 'DMR', c: 'rgba(248,244,236,0.85)', d: 1.1 },
              { x: 145, y: 198, label: 'CAPA', c: 'var(--amber)', d: 1.2 },
              { x: 175, y: 140, label: '510(k)', c: 'var(--leaf)', d: 1.3 },
              { x: 390, y: 318, label: 'SOP', c: 'rgba(248,244,236,0.85)', d: 1.05 },
              { x: 395, y: 252, label: 'Risk', c: 'var(--amber)', d: 1.15 },
              { x: 380, y: 170, label: 'MDR', c: 'var(--leaf)', d: 1.25 },
              { x: 360, y: 122, label: 'KGMP', c: 'rgba(248,244,236,0.85)', d: 1.35 },
              { x: 260, y: 130, label: 'QMS', c: 'var(--amber)', d: 0.9 },
            ].map((n, i) => (
              <g key={i} className="leaf-in" style={{ animationDelay: `${n.d}s` }}>
                <circle cx={n.x} cy={n.y} r="14" fill="var(--moss)" />
                <circle
                  cx={n.x}
                  cy={n.y}
                  r="13"
                  fill="none"
                  stroke={n.c}
                  strokeWidth="1.4"
                />
                <text
                  x={n.x}
                  y={n.y + 3.5}
                  textAnchor="middle"
                  fontFamily="ui-monospace, monospace"
                  fontSize="9"
                  fill="var(--bg)"
                  fontWeight="500"
                >
                  {n.label}
                </text>
              </g>
            ))}

            {/* root hint */}
            <path
              d="M260 510 C 240 530, 215 542, 195 548"
              stroke="rgba(248,244,236,0.5)"
              strokeWidth="1.2"
              strokeLinecap="round"
              fill="none"
              strokeDasharray="2 3"
            />
            <path
              d="M260 510 C 280 530, 305 542, 325 548"
              stroke="rgba(248,244,236,0.5)"
              strokeWidth="1.2"
              strokeLinecap="round"
              fill="none"
              strokeDasharray="2 3"
            />

            {/* annotation R — ISO 14971 risk node */}
            <g className="leaf-in" style={{ animationDelay: '1.5s', transformOrigin: 'center' }}>
              <line
                x1="416"
                y1="252"
                x2="478"
                y2="252"
                stroke="rgba(248,244,236,0.5)"
                strokeWidth="1"
              />
              <text
                x="482"
                y="248"
                fontFamily="ui-monospace, monospace"
                fontSize="9"
                fill="rgba(248,244,236,0.75)"
                letterSpacing="1"
              >
                ISO 14971
              </text>
              <text
                x="482"
                y="260"
                fontFamily="ui-monospace, monospace"
                fontSize="9"
                fill="rgba(248,244,236,0.75)"
                letterSpacing="1"
              >
                risk node
              </text>
            </g>

            {/* annotation L — DHF */}
            <g className="leaf-in" style={{ animationDelay: '1.7s' }}>
              <line
                x1="42"
                y1="340"
                x2="125"
                y2="340"
                stroke="rgba(248,244,236,0.5)"
                strokeWidth="1"
              />
              <text
                x="42"
                y="334"
                fontFamily="ui-monospace, monospace"
                fontSize="9"
                fill="rgba(248,244,236,0.75)"
                letterSpacing="1"
              >
                DESIGN HISTORY
              </text>
              <text
                x="42"
                y="346"
                fontFamily="ui-monospace, monospace"
                fontSize="9"
                fill="rgba(248,244,236,0.75)"
                letterSpacing="1"
              >
                21 CFR 820.30
              </text>
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

      {/* 나무 가지·잎 애니메이션 — homepage와 동일 */}
      <style>{`
        @keyframes drawLine {
          from { stroke-dashoffset: 1200; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes leafIn {
          from { opacity: 0; transform: scale(0.6); }
          to   { opacity: 1; transform: scale(1); }
        }
        .draw-line   { stroke-dasharray: 1200; animation: drawLine 2.4s ease-out forwards; }
        .leaf-in     { animation: leafIn .8s cubic-bezier(.2,.8,.2,1) both; transform-box: fill-box; transform-origin: center; }
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
