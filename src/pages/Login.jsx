import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowRight, ShieldCheck, Lock, Mail, Loader2, UserCog, Building2 } from 'lucide-react'
import Logo from '../components/Logo'
import { auth } from '../lib/auth'
import { LEVELS, LEVEL_LABEL } from '../lib/permissions'

// 데모 환경 감지 — 데모 이메일/비번 패턴
const DEMO_EMAIL_DEFAULT = 'demo@qualytree.app'
const DEMO_PASSWORD_DEFAULT = 'qualytree123'

function looksLikeDemoCredential(email, password) {
  // 데모 명백 — 이메일이 데모 도메인이고 비번이 데모 비번
  if (email === DEMO_EMAIL_DEFAULT && password === DEMO_PASSWORD_DEFAULT) return true
  if (email.endsWith('@qualytree.app') && password === DEMO_PASSWORD_DEFAULT) return true
  return false
}

export default function Login() {
  const nav = useNavigate()
  const [email, setEmail] = useState(DEMO_EMAIL_DEFAULT)
  const [password, setPassword] = useState(DEMO_PASSWORD_DEFAULT)
  const [name, setName] = useState('Demo User')
  const [level, setLevel] = useState(LEVELS.MANAGER)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setInfo(null)

    if (!email || !password) {
      setError('이메일과 비밀번호를 모두 입력해주세요.')
      return
    }
    if (!email.includes('@')) {
      setError('올바른 이메일 형식이 아닙니다.')
      return
    }

    setLoading(true)

    // 1) 데모 입력값이면 데모 모드로 즉시 통과
    if (looksLikeDemoCredential(email, password)) {
      auth.signInDemo(email, name || 'Demo User', level)
      setLoading(false)
      nav('/dashboard')
      return
    }

    // 2) 정식 입력값 — Supabase auth 시도
    const res = await auth.signInWithPassword(email, password)
    setLoading(false)

    if (!res.ok) {
      // 정식 인증 실패 시 — 데모 fallback 옵션 안내
      setError(
        res.error === 'Invalid login credentials'
          ? '이메일 또는 비밀번호가 일치하지 않습니다. 가입 신청 후 운영팀 승인을 받으셨는지 확인해주세요.'
          : (res.error || '로그인 실패')
      )
      return
    }

    // 3) 인증 성공 — 사용자 종류에 따라 자동 라우팅
    const ctx = res.context
    if (ctx?.kind === 'operator') {
      setInfo('운영자 권한으로 로그인했습니다. 운영자 콘솔로 이동합니다...')
      setTimeout(() => nav('/operator'), 600)
    } else if (ctx?.kind === 'company_member') {
      setInfo(`${ctx.session.company?.name || ''} 로 로그인했습니다.`)
      setTimeout(() => nav('/dashboard'), 600)
    } else if (ctx?.kind === 'orphan') {
      setError('가입은 됐지만 회사 소속이 없습니다. 운영팀에 문의해주세요.')
    } else {
      setError('로그인 후 사용자 정보를 불러오지 못했습니다.')
    }
  }

  return (
    <div className="min-h-screen w-full flex" style={{ background: 'var(--bg)' }}>
      {/* ── 좌측: 로그인 폼 ── */}
      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-12">
            <Logo size={32} />
            <span className="font-serif text-2xl" style={{ color: 'var(--ink)' }}>
              Qualytree
            </span>
          </div>

          <div className="font-mono text-[10px] tracking-[0.2em] uppercase mb-3" style={{ color: 'var(--ink-faint)' }}>
            QUALYTREE PLATFORM · ENT-001
          </div>
          <h1 className="font-serif text-4xl mb-3" style={{ color: 'var(--ink)' }}>
            로그인
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--ink-soft)' }}>
            Qualytree Platform — 의료기기 RA·QMS 통합 SaaS
          </p>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="text-sm block mb-1.5" style={{ color: 'var(--ink-soft)' }}>이메일</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-faint)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border rounded-md text-sm focus:outline-none"
                  style={{
                    borderColor: 'var(--line)',
                    background: 'var(--bg-card)',
                    color: 'var(--ink)',
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <label className="text-sm" style={{ color: 'var(--ink-soft)' }}>이름</label>
                <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>처음 로그인 시에만 입력</span>
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 border rounded-md text-sm focus:outline-none"
                style={{
                  borderColor: 'var(--line)',
                  background: 'var(--bg-card)',
                  color: 'var(--ink)',
                }}
              />
            </div>

            <div>
              <label className="text-sm block mb-1.5" style={{ color: 'var(--ink-soft)' }}>비밀번호</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-faint)' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border rounded-md text-sm focus:outline-none"
                  style={{
                    borderColor: 'var(--line)',
                    background: 'var(--bg-card)',
                    color: 'var(--ink)',
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-2">
                <label className="text-sm flex items-center gap-1" style={{ color: 'var(--ink-soft)' }}>
                  <UserCog size={14} /> 권한 Level
                </label>
                <span className="font-mono text-[10px] tracking-wider" style={{ color: 'var(--ink-faint)' }}>
                  ISO 13485 §5.5 · SoD
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[LEVELS.OPERATOR, LEVELS.INSPECTOR, LEVELS.MANAGER].map((l) => (
                  <button
                    type="button"
                    key={l}
                    onClick={() => setLevel(l)}
                    className="py-2.5 rounded-md border text-center transition"
                    style={{
                      borderColor: level === l ? 'var(--moss)' : 'var(--line)',
                      background: level === l ? 'var(--moss)' : 'var(--bg-card)',
                      color: level === l ? 'var(--bg)' : 'var(--ink-soft)',
                    }}
                  >
                    <div className="font-mono text-[9.5px] tracking-[0.2em] uppercase opacity-80">LV {l}</div>
                    <div className="text-xs mt-0.5">{LEVEL_LABEL[l]}</div>
                  </button>
                ))}
              </div>
              <div className="text-xs mt-2" style={{ color: 'var(--ink-faint)' }}>
                {level === LEVELS.OPERATOR && '작업자: 측정값 입력·서명만 가능. 검사 항목은 매니저가 정의한 템플릿을 따른다.'}
                {level === LEVELS.INSPECTOR && '검사관: 작업자 권한 + 검사 결과 검토·재측정 요청 가능.'}
                {level === LEVELS.MANAGER && '매니저·RA: 모든 권한. 검사 항목·공정·카테고리 정의, 작업 지시 발행, 삭제 가능.'}
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-md text-sm" style={{ background: '#FEE2E2', color: '#991B1B' }}>
                {error}
              </div>
            )}
            {info && (
              <div className="px-4 py-3 rounded-md text-sm" style={{ background: 'var(--leaf-soft)', color: 'var(--moss)' }}>
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-md font-medium transition flex items-center justify-center gap-2"
              style={{
                background: 'var(--moss)',
                color: 'var(--bg)',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> 로그인 중...
                </>
              ) : (
                <>
                  로그인 <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* 구분선 */}
          <div className="my-8 flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase" style={{ color: 'var(--ink-faint)' }}>OR</span>
            <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
          </div>

          {/* SSO 자리 (SOON) */}
          <button
            type="button"
            disabled
            className="w-full py-2.5 rounded-md text-sm border flex items-center justify-center gap-2 mb-2 cursor-not-allowed"
            style={{ borderColor: 'var(--line)', color: 'var(--ink-faint)' }}
          >
            Microsoft 계정으로 로그인
            <span className="font-mono text-[9px] tracking-wider px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-soft)' }}>
              SOON
            </span>
          </button>
          <button
            type="button"
            disabled
            className="w-full py-2.5 rounded-md text-sm border flex items-center justify-center gap-2 cursor-not-allowed"
            style={{ borderColor: 'var(--line)', color: 'var(--ink-faint)' }}
          >
            Google Workspace로 로그인
            <span className="font-mono text-[9px] tracking-wider px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-soft)' }}>
              SOON
            </span>
          </button>

          {/* 회사 가입 신청 */}
          <div className="mt-6 text-sm" style={{ color: 'var(--ink-soft)' }}>
            계정이 없으신가요?{' '}
            <Link to="/signup" className="underline font-medium" style={{ color: 'var(--moss)' }}>
              회사 계정 신청
            </Link>
          </div>

          {/* 데모 안내 */}
          <div className="mt-6 px-4 py-3 rounded-md text-xs" style={{ background: 'var(--leaf-soft)', color: 'var(--moss)' }}>
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase mb-1.5">DEMO MODE</div>
            <div>
              <strong>{DEMO_EMAIL_DEFAULT}</strong> + 비번 <strong>{DEMO_PASSWORD_DEFAULT}</strong> 로 즉시 데모 시작.
              <br />
              본인 이메일·비번을 입력하면 정식 로그인이 시도됩니다 (가입 승인 후 가능).
            </div>
          </div>
        </div>
      </div>

      {/* ── 우측: 마케팅 영역 ── */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12" style={{ background: 'var(--moss)', color: 'var(--bg)' }}>
        <div>
          <div className="font-mono text-[10px] tracking-[0.2em] uppercase opacity-70 mb-3">
            QUALYTREE PLATFORM · ENT-001
          </div>
          <h2 className="font-serif text-5xl leading-tight mb-3">
            품질은<br />
            <em className="font-serif italic">나무처럼 자랍니다.</em>
          </h2>
          <p className="text-sm opacity-80 italic">Quality grows like a tree.</p>
        </div>

        <ul className="space-y-3 text-sm opacity-90">
          <li className="flex gap-2">
            <span>•</span>
            <span>RA 비전공자도 화면 안내만 따라가면 인허가 서류 자동 완성</span>
          </li>
          <li className="flex gap-2">
            <span>•</span>
            <span>담당자가 바뀌어도 5분 안에 인수인계 — 결정 일지 자동 누적</span>
          </li>
          <li className="flex gap-2">
            <span>•</span>
            <span>ISO 13485 + FDA QMSR + KGMP + EU MDR 동시 매핑</span>
          </li>
          <li className="flex gap-2">
            <span>•</span>
            <span>21 CFR Part 11 무결성 + GAMP 5 검증 + BYOK 백업</span>
          </li>
        </ul>

        <div className="font-mono text-[10px] tracking-[0.2em] uppercase opacity-60 flex items-center gap-2">
          <ShieldCheck size={12} />
          21 CFR PART 11 · ISO 27001 · SOC 2 · ISMS-P
        </div>
      </div>
    </div>
  )
}
