// src/pages/JoinCompany.jsx
// 직원 셀프 가입(B방식) — 사업자등록번호로 소속 회사를 자동 매칭하여
// 가입 신청을 넣는다. 관리자가 계정을 미리 만들어주지 않아도 되며,
// 신청은 기존 MemberAdmin.jsx의 "승인대기" 큐에 그대로 노출된다.
//
// 흐름:
//  1) 사업자등록번호 입력 → find_company_by_business_number RPC로 회사명 미리 확인
//  2) 이름·이메일·비밀번호 입력 → supabase.auth.signUp()으로 인증 계정 생성
//  3) 즉시 세션이 생기면(이메일 확인 비활성 프로젝트) request_company_join RPC 바로 호출
//     세션이 없으면(이메일 확인 필요) 신청 의도를 localStorage에 남겨두고,
//     이메일 확인 후 처음 로그인할 때 auth.js가 자동으로 이어서 신청을 완료한다.
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Building2, Loader2, ArrowRight, User, Mail, Lock, CheckCircle2 } from 'lucide-react'
import Logo from '../components/Logo'
import { supabase } from '../lib/supabase'
import { PENDING_JOIN_KEY } from '../lib/auth'

export default function JoinCompany() {
  const nav = useNavigate()
  const [step, setStep] = useState(1) // 1: 사업자번호 확인, 2: 가입정보, 3: 완료
  const [bizNo, setBizNo] = useState('')
  const [checking, setChecking] = useState(false)
  const [company, setCompany] = useState(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false)

  const checkCompany = async (e) => {
    e?.preventDefault?.()
    setError('')
    if (!bizNo.trim()) { setError('사업자등록번호를 입력해주세요.'); return }
    setChecking(true)
    const { data, error: rpcErr } = await supabase.rpc('find_company_by_business_number', { p_business_number: bizNo.trim() })
    setChecking(false)
    if (rpcErr || !data) { setError((rpcErr && rpcErr.message) || '일치하는 회사를 찾을 수 없습니다.'); return }
    setCompany(data)
    setStep(2)
  }

  const submit = async (e) => {
    e?.preventDefault?.()
    setError('')
    if (!name.trim()) { setError('이름을 입력해주세요.'); return }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('올바른 이메일을 입력해주세요.'); return }
    if (!password || password.length < 6) { setError('비밀번호는 6자 이상이어야 합니다.'); return }
    if (password !== password2) { setError('비밀번호가 일치하지 않습니다.'); return }

    setBusy(true)
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    })
    if (signUpErr) {
      setBusy(false)
      setError(signUpErr.message === 'User already registered'
        ? '이미 가입된 이메일입니다. 로그인해주세요.'
        : ('가입 실패: ' + signUpErr.message))
      return
    }

    // 이메일 확인이 켜져 있으면 signUp 직후 세션이 없다 — 이 경우 회사 가입 신청은
    // 이메일 확인 후 첫 로그인 시점에 auth.js가 대신 처리하도록 예약해둔다.
    if (!signUpData.session) {
      try {
        localStorage.setItem(PENDING_JOIN_KEY, JSON.stringify({ businessNumber: bizNo.trim(), name: name.trim() }))
      } catch { /* ignore */ }
      setNeedsEmailConfirm(true)
      setBusy(false)
      setStep(3)
      return
    }

    const { data: joinData, error: joinErr } = await supabase.rpc('request_company_join', {
      p_business_number: bizNo.trim(),
      p_name: name.trim(),
    })
    setBusy(false)
    if (joinErr) { setError(joinErr.message || '가입 신청 처리 중 오류가 발생했습니다.'); return }
    setStep(3)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400, background: 'var(--bg-card)', border: '1px solid var(--line-strong)', borderRadius: 14, padding: 28 }}>
        <Logo size={24} />
        <h1 className="font-display mt-4" style={{ fontSize: 22, color: 'var(--ink)' }}>직원 가입 신청</h1>
        <p className="mt-1.5 text-[13px]" style={{ color: 'var(--ink-mute)' }}>
          우리 회사가 이미 Qualytree를 사용 중이라면, 사업자등록번호로 소속을 확인하고 가입을 신청하세요.
        </p>

        {step === 1 && (
          <form onSubmit={checkCompany} className="mt-5 space-y-3">
            <F label="회사 사업자등록번호" icon={Building2} value={bizNo} onChange={setBizNo} placeholder="123-45-67890" autoFocus />
            {error && <ErrBox>{error}</ErrBox>}
            <button type="submit" disabled={checking} className="btn-primary w-full justify-center" style={{ marginTop: 6 }}>
              {checking ? (<><Loader2 size={15} className="animate-spin" /> 확인 중…</>) : (<>회사 확인 <ArrowRight size={15} /></>)}
            </button>
            <div className="text-center text-[12.5px] mt-2" style={{ color: 'var(--ink-mute)' }}>
              <Link to="/login" className="underline" style={{ color: 'var(--moss)' }}>로그인으로 돌아가기</Link>
              {'  ·  '}
              <Link to="/signup" className="underline" style={{ color: 'var(--moss)' }}>신규 회사 계정 신청</Link>
            </div>
          </form>
        )}

        {step === 2 && company && (
          <form onSubmit={submit} className="mt-5 space-y-3">
            <div className="px-3 py-2.5 rounded-lg text-[13px] flex items-center gap-2" style={{ background: 'var(--leaf-soft)', color: 'var(--moss)' }}>
              <CheckCircle2 size={15} /> <b>{company.company_name}</b> 소속으로 가입을 신청합니다.
            </div>
            <F label="이름" icon={User} value={name} onChange={setName} placeholder="홍길동" autoFocus />
            <F label="이메일" icon={Mail} type="email" value={email} onChange={setEmail} placeholder="you@company.com" />
            <F label="비밀번호" icon={Lock} type="password" value={password} onChange={setPassword} placeholder="6자 이상" />
            <F label="비밀번호 확인" icon={Lock} type="password" value={password2} onChange={setPassword2} placeholder="다시 입력" />
            {error && <ErrBox>{error}</ErrBox>}
            <p className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>
              신청 후 회사 관리자가 승인하면 로그인할 수 있습니다 (로그인 화면 &gt; 작업자 탭에서 사업자번호·이름·비밀번호로 로그인).
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setStep(1); setError('') }} className="text-[12.5px] px-3" style={{ color: 'var(--ink-faint)', background: 'none', border: 'none', cursor: 'pointer' }}>← 이전</button>
              <button type="submit" disabled={busy} className="btn-primary flex-1 justify-center">
                {busy ? (<><Loader2 size={15} className="animate-spin" /> 신청 중…</>) : '가입 신청'}
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <div className="mt-6 text-center">
            <CheckCircle2 size={36} style={{ color: 'var(--moss)', margin: '0 auto' }} />
            {needsEmailConfirm ? (
              <>
                <p className="mt-3 text-[14px]" style={{ color: 'var(--ink)' }}>가입 확인 이메일을 보냈습니다.</p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed" style={{ color: 'var(--ink-mute)' }}>
                  메일함에서 확인 링크를 클릭한 뒤 로그인하면, <b>{company?.company_name}</b> 가입 신청이 자동으로 접수됩니다.
                </p>
              </>
            ) : (
              <>
                <p className="mt-3 text-[14px]" style={{ color: 'var(--ink)' }}><b>{company?.company_name}</b> 가입 신청이 접수되었습니다.</p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed" style={{ color: 'var(--ink-mute)' }}>
                  회사 관리자의 승인 후 로그인할 수 있습니다. 승인은 관리자의 계정 관리 화면에서 이루어집니다.
                </p>
              </>
            )}
            <button onClick={() => nav('/login')} className="btn-primary w-full justify-center mt-5">로그인 화면으로</button>
          </div>
        )}
      </div>
    </div>
  )
}

function F({ label, icon: Icon, type = 'text', value, onChange, placeholder, autoFocus }) {
  return (
    <div>
      <label className="text-[12px] block mb-1" style={{ color: 'var(--ink-soft)', fontWeight: 500 }}>{label}</label>
      <div className="relative">
        {Icon && <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-faint)' }} />}
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus}
          className="input-base" style={{ paddingLeft: Icon ? 36 : undefined, paddingTop: 8, paddingBottom: 8 }} />
      </div>
    </div>
  )
}

function ErrBox({ children }) {
  return (
    <div className="px-3 py-2 rounded-lg text-[13px]" style={{ background: 'var(--rust-soft)', color: 'var(--rust)', border: '1px solid rgba(139,58,31,0.2)' }}>
      {children}
    </div>
  )
}
