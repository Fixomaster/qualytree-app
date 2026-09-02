import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { onboarding } from '../lib/onboardingState'
import { supabase, getCompanyMembership } from '../lib/supabase'

const CompanyProfileContext = createContext(null)

export function CompanyProfileProvider({ children }) {
  const [profile, setProfile] = useState(() => {
    try { return onboarding.load().company || {} } catch { return {} }
  })
  const [companyId, setCompanyId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const local = onboarding.load().company || {}
        if (!cancelled) setProfile(local)

        const membership = await getCompanyMembership()
        if (!membership?.company_id || cancelled) { setLoading(false); return }
        if (!cancelled) setCompanyId(membership.company_id)

        const { data, error } = await supabase
          .from('company_data')
          .select('payload')
          .eq('company_id', membership.company_id)
          .eq('data_type', 'company_profile')
          .eq('data_key', 'master')
          .maybeSingle()

        if (!error && data?.payload && !cancelled) {
          const merged = { ...local, ...data.payload }
          setProfile(merged)
          try { onboarding.updateCompany(merged) } catch {}
        }
      } catch (e) {
        console.warn('[CompanyProfile] init error', e)
      }
      if (!cancelled) setLoading(false)
    }
    init()
    return () => { cancelled = true }
  }, [])

  const saveProfile = useCallback(async (updates) => {
    const next = { ...profile, ...updates }
    setProfile(next)
    try { onboarding.updateCompany(next) } catch {}
    if (companyId) {
      try {
        await supabase.from('company_data').upsert({
          company_id: companyId,
          data_type: 'company_profile',
          data_key: 'master',
          payload: next,
          version: Date.now(),
        }, { onConflict: 'company_id,data_type,data_key' })
      } catch (e) {
        console.warn('[CompanyProfile] save error', e)
      }
    }
    return next
  }, [profile, companyId])

  return (
    <CompanyProfileContext.Provider value={{ profile, saveProfile, loading, companyId }}>
      {children}
    </CompanyProfileContext.Provider>
  )
}

export function useCompanyProfile() {
  const ctx = useContext(CompanyProfileContext)
  if (!ctx) {
    // Provider 밖에서 호출된 경우 graceful fallback
    console.warn('[useCompanyProfile] called outside CompanyProfileProvider')
    return { profile: {}, saveProfile: async () => {}, loading: false, companyId: null }
  }
  return ctx
}
