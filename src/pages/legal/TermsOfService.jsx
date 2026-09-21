import React from 'react'
import PolicyPage from './PolicyPage'
import { TERMS_SECTIONS } from '../../lib/legalContent'

export default function TermsOfService() {
  return <PolicyPage title="이용약관" sections={TERMS_SECTIONS} activePath="/terms" />
}
