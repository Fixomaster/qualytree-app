import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Save, RotateCcw, ArrowLeft, Check } from 'lucide-react'
import { loadPlans, savePlans, resetPlans, DEFAULT_PLANS, priceFor, won } from '../../lib/plans'
import { isPlatformOperator } from '../../lib/supabase'

const uid = () => 'plan_' + Math.random().toString(36).slice(2, 8)

export default function PlanAdmin() {
  const nav = useNavigate()
  const [plans, setPlans] = useState(loadPlans)
  const [saved, setSaved] = useState(false)
  const [authState, setAuthState] = useState('checking')
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const op = await isPlatformOperator()
        if (alive) setAuthState(op === true ? 'ok' : 'denied')
      } catch {
        if (alive) setAuthState('denied')
      }
    })()
    return () => { alive = false }
  }, [])

  const setPlan = (id, k, v) => {
    setSaved(false)
    setPlans((ps) => ps.map((p) => (p.id === id ? { ...p, [k]: v } : p)))
  }
  const setFeatures = (id, text) => setPlan(id, 'features', text.split('\n').map((s) => s.trim()).filter(Boolean))
  const addPlan = () => {
    setSaved(false)
    setPlans((ps) => [...ps, { id: uid(), name: '새 플랜', monthly: 0, annualDiscountPct: 0, seats: 1, recommended: false, custom: false, features: [] }])
  }
  const delPlan = (id) => { setSaved(false); setPlans((ps) => ps.filter((p) => p.id !== id)) }
  const onSave = () => { savePlans(plans); setSaved(true) }
  const onReset = () => { resetPlans(); setPlans(DEFAULT_PLANS.map((p) => ({ ...p, features: [...p.features] }))); setSaved(false) }

  if (authState === 'checking') {
    return <div className="min-h-screen grid place-items-center text-slate-500">권한 확인 중…</div>
  }
  if (authState === 'denied') {
    return (
      <div className="min-h-screen grid place-items-center px-6">
        <div className="text-center">
          <p className="text-slate-700 mb-3">운영자 권한이 필요합니다.</p>
          <button onClick={() => nav('/operator')} className="text-emerald-700 text-sm">운영자 로그인 →</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-6">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => nav('/dashboard')} className="flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-800 mb-3">
          <ArrowLeft size={15} /> 대시보드로
        </button>

        <div className="flex items-end justify-between flex-wrap gap-3 mb-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              플랜·요금 관리 <span className="text-base font-normal text-slate-500">운영자</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              여기서 수정한 플랜·금액·좌석 수는 고객의 온보딩 "플랜·결제" 단계에 즉시 반영됩니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onReset} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-600 text-sm hover:bg-slate-50">
              <RotateCcw size={14} /> 기본값 복원
            </button>
            <button onClick={onSave} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium">
              {saved ? <Check size={15} /> : <Save size={15} />} {saved ? '저장됨' : '저장'}
            </button>
          </div>
        </div>

        <div className="space-y-3 mt-4">
          {plans.map((p) => (
            <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <input
                  className="text-[15px] font-semibold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none"
                  value={p.name} onChange={(e) => setPlan(p.id, 'name', e.target.value)}
                />
                <button onClick={() => delPlan(p.id)} className="text-slate-300 hover:text-rose-600"><Trash2 size={16} /></button>
              </div>

              <div className="grid sm:grid-cols-4 gap-3 mb-3">
                <NumField label="월정액 (원)" value={p.monthly} disabled={p.custom} onChange={(v) => setPlan(p.id, 'monthly', v)} />
                <NumField label="연간 할인 (%)" value={p.annualDiscountPct} disabled={p.custom} onChange={(v) => setPlan(p.id, 'annualDiscountPct', v)} />
                <NumField label="좌석 수 (0=무제한)" value={p.seats} onChange={(v) => setPlan(p.id, 'seats', v)} />
                <div className="flex items-end gap-3 pb-1">
                  <label className="flex items-center gap-1.5 text-[12.5px] text-slate-600">
                    <input type="checkbox" checked={!!p.recommended} onChange={(e) => setPlan(p.id, 'recommended', e.target.checked)} /> 추천
                  </label>
                  <label className="flex items-center gap-1.5 text-[12.5px] text-slate-600">
                    <input type="checkbox" checked={!!p.custom} onChange={(e) => setPlan(p.id, 'custom', e.target.checked)} /> 가격 문의형
                  </label>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-[12px] font-medium text-slate-600 mb-1">포함 기능 (한 줄에 하나)</span>
                  <textarea
                    rows={4}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-emerald-500"
                    value={(p.features || []).join('\n')} onChange={(e) => setFeatures(p.id, e.target.value)}
                  />
                </label>
                <div className="text-[12.5px] text-slate-600">
                  <div className="font-medium text-slate-700 mb-1">미리보기</div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div>월 결제: <b className="text-slate-900">{won(priceFor(p, 'monthly'))}</b></div>
                    <div>연 결제: <b className="text-slate-900">{won(priceFor(p, 'annual'))}</b>{!p.custom && p.annualDiscountPct > 0 && <span className="text-emerald-700"> ({p.annualDiscountPct}% 할인)</span>}</div>
                    <div>좌석: <b className="text-slate-900">{p.seats > 0 ? p.seats + '명' : '무제한'}</b></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={addPlan} className="flex items-center gap-1.5 text-[13px] text-emerald-700 font-medium mt-4">
          <Plus size={15} /> 플랜 추가
        </button>
      </div>
    </div>
  )
}

function NumField({ label, value, onChange, disabled }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-medium text-slate-600 mb-1">{label}</span>
      <input
        type="number" disabled={disabled} value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
      />
    </label>
  )
}
