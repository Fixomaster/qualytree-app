// src/pages/guides/GuideHub.jsx — 사용 안내(가이드 투어) 모음
// 가입 이후(로그인 상태)에서만 보이는 화면. 투어 본문은 public/tours/<slug>/ 정적 페이지를 iframe으로 표시한다.
import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PlayCircle, ArrowLeft } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'

export const TOURS = [
  { slug: 'onboarding',     code: 'ONB-001',  title: '온보딩 5단계',           dur: '1:34' },
  { slug: 'documents',      code: 'DOC-001',  title: '품질문서 작성과 승인',    dur: '1:45' },
  { slug: 'inspection',     code: 'OPS-001',  title: '검사 단계 입력',          dur: '1:42' },
  { slug: 'change-control', code: 'EDIT-001', title: '입력값 수정과 변경관리',  dur: '1:38' },
]

export default function GuideHub() {
  const user = auth.current()
  const { slug } = useParams()
  const nav = useNavigate()
  const tour = TOURS.find((t) => t.slug === slug)

  if (tour) {
    return (
      <AppLayout user={user} title={`사용 안내 · ${tour.title}`} subtitle={tour.code}>
        <div className="px-4 lg:px-6 pt-4">
          <button onClick={() => nav('/guides')} className="inline-flex items-center gap-1.5 text-[13px] mb-3" style={{ color: 'var(--ink-mute)' }}>
            <ArrowLeft size={15} /> 사용 안내 목록
          </button>
        </div>
        <iframe
          title={tour.title}
          src={`/guide-tours/${tour.slug}/index.html`}
          style={{ width: '100%', height: 'calc(100vh - 140px)', border: 0, background: 'var(--bg)' }}
          allowFullScreen
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout user={user} title="사용 안내" subtitle="실제 화면을 따라가는 1~2분 안내 영상">
      <div className="px-6 lg:px-8 py-6 max-w-[1080px] mx-auto">
        <div className="mb-5">
          <div className="font-bold text-[16px]" style={{ color: 'var(--ink)' }}>가이드 투어</div>
          <div className="text-[12.5px]" style={{ color: 'var(--ink-faint)' }}>누르면 바로 재생됩니다. 화면을 클릭하면 멈추고, 아래 단계 목록으로 원하는 단계로 건너뛸 수 있습니다.</div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {TOURS.map((t) => (
            <button key={t.slug} onClick={() => nav(`/guides/${t.slug}`)} className="text-left group">
              <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '16 / 9', background: '#0b1a14', boxShadow: '0 10px 30px rgba(6,20,14,0.18)' }}>
                <img src={`/guide-tours/thumbs/${t.slug}.jpg`} alt="" className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="w-14 h-14 rounded-full flex items-center justify-center transition group-hover:scale-105" style={{ background: 'rgba(255,255,255,0.92)', boxShadow: '0 6px 20px rgba(0,0,0,0.35)' }}>
                    <PlayCircle size={30} style={{ color: 'var(--moss)' }} />
                  </span>
                </div>
                <span className="absolute right-2.5 bottom-2.5 font-mono text-[11px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.62)', color: '#fff' }}>{t.dur}</span>
              </div>
              <div className="flex items-baseline gap-2.5 mt-2.5 px-0.5">
                <span className="font-mono text-[11px] tracking-wider" style={{ color: 'var(--amber)' }}>{t.code}</span>
                <span className="font-semibold text-[15px]" style={{ color: 'var(--ink)' }}>{t.title}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
