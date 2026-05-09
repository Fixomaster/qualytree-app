import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import Stepper from '../../components/Stepper'
import { auth } from '../../lib/auth'
import { onboarding } from '../../lib/onboardingState'

import StepCompany from './StepCompany'
import StepProduct from './StepProduct'
import StepProcess from './StepProcess'
import StepRegulations from './StepRegulations'
import StepRoles from './StepRoles'

const STEP_TITLES = {
  1: { title: '회사 등록', subtitle: '법인·사이트·인증 보유 현황을 알려주세요' },
  2: { title: '제품 등록', subtitle: '제품 분류와 의도된 사용 — 객관식으로 답하시면 자동 분류됩니다' },
  3: {
    title: '공정 정의 ⭐',
    subtitle: '왼쪽 블록 라이브러리에서 공정을 가운데로 끌어 순서를 만드세요',
  },
  4: { title: '다중 규제 매핑', subtitle: '진출 시장을 선택하면 인증이 자동 추천됩니다' },
  5: { title: '역할·자격', subtitle: '핵심 역할을 누가 맡는지 등록해주세요' },
}

export default function Onboarding() {
  const nav = useNavigate()
  const user = auth.current()
  const [state, setState] = useState(() => onboarding.load())

  useEffect(() => {
    onboarding.save(state)
  }, [state])

  const update = (newState) => setState(newState)

  const goNext = () => {
    const completed = state.completedSteps.includes(state.step)
      ? state.completedSteps
      : [...state.completedSteps, state.step]

    if (state.step === 5) {
      // Finish
      const finished = {
        ...state,
        completedSteps: completed,
        finishedAt: new Date().toISOString(),
      }
      onboarding.save(finished)
      // Mark company on auth session
      auth.updateCompany({
        name: state.company.name,
        bizNumber: state.company.bizNumber,
        primaryProduct: state.product.name,
      })
      nav('/dashboard')
    } else {
      setState({ ...state, step: state.step + 1, completedSteps: completed })
    }
  }

  const goBack = () => {
    if (state.step > 1) setState({ ...state, step: state.step - 1 })
    else nav('/dashboard')
  }

  const goToStep = (n) => {
    if (n <= Math.max(...state.completedSteps, 0) + 1) {
      setState({ ...state, step: n })
    }
  }

  const meta = STEP_TITLES[state.step]

  return (
    <AppLayout user={user} title={`온보딩 — ${meta.title}`} subtitle={meta.subtitle}>
      <div className="px-6 lg:px-8 py-7 max-w-[1280px] mx-auto fade-in">
        <button
          onClick={() => nav('/dashboard')}
          className="inline-flex items-center gap-1.5 text-[13px] mb-5 hover:opacity-70 transition"
          style={{ color: 'var(--ink-mute)' }}
        >
          <ArrowLeft size={14} />
          대시보드
        </button>

        <Stepper current={state.step} completed={state.completedSteps} onJump={goToStep} />

        <div className="mt-2">
          {state.step === 1 && (
            <StepCompany
              data={state.company}
              update={(d) => update({ ...state, company: d })}
              onNext={goNext}
            />
          )}
          {state.step === 2 && (
            <StepProduct
              data={state.product}
              update={(d) => update({ ...state, product: d })}
              onNext={goNext}
              onBack={goBack}
            />
          )}
          {state.step === 3 && (
            <StepProcess
              data={state}
              update={update}
              onNext={goNext}
              onBack={goBack}
            />
          )}
          {state.step === 4 && (
            <StepRegulations
              data={state}
              update={update}
              onNext={goNext}
              onBack={goBack}
            />
          )}
          {state.step === 5 && (
            <StepRoles
              data={state}
              update={update}
              onNext={goNext}
              onBack={goBack}
              companyName={state.company.name}
            />
          )}
        </div>
      </div>
    </AppLayout>
  )
}
