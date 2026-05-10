import React from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Mail, Clock, ArrowLeft } from 'lucide-react'
import Logo from '../../components/Logo'

export default function SignupSuccess() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <header className="px-8 py-6 flex items-center justify-between border-b border-stone-200 bg-white">
        <Link to="/login" className="flex items-center gap-3 text-stone-900">
          <Logo />
          <span className="font-serif text-xl">Qualytree</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-8 py-10">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 size={40} className="text-emerald-800" strokeWidth={1.5} />
          </div>

          <div className="text-xs uppercase tracking-widest text-emerald-800 mb-3">
            QUALYTREE PLATFORM · ACC-002
          </div>
          <h1 className="font-serif text-3xl text-stone-900 mb-4">신청이 접수되었습니다</h1>
          <p className="text-stone-600 mb-8">
            Qualytree 가족이 되어주셔서 감사합니다. 운영팀이 신청 내용을 검토 후 1~3 영업일 내에 회신드립니다.
          </p>

          <div className="bg-white rounded-lg border border-stone-200 p-6 text-left space-y-4 mb-8">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                <Clock size={16} />
              </div>
              <div>
                <div className="font-medium text-stone-900 text-sm">검토 진행 중</div>
                <div className="text-xs text-stone-600 mt-1">
                  운영팀이 회사·관리자 정보를 확인합니다.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-stone-100 text-stone-500 flex items-center justify-center shrink-0">
                <Mail size={16} />
              </div>
              <div>
                <div className="font-medium text-stone-900 text-sm">승인 후 이메일 발송</div>
                <div className="text-xs text-stone-600 mt-1">
                  관리자 이메일로 첫 로그인 안내가 전송됩니다.
                </div>
              </div>
            </div>
          </div>

          <div className="text-xs text-stone-500 mb-4">
            그동안 데모 모드에서 Qualytree를 미리 체험하실 수 있습니다.
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded text-sm"
          >
            <ArrowLeft size={14} /> 로그인 화면으로
          </Link>
        </div>
      </main>
    </div>
  )
}
