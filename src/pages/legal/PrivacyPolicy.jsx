import React from 'react'
import PolicyPage from './PolicyPage'
import { PRIVACY_SECTIONS } from '../../lib/legalContent'

export default function PrivacyPolicy() {
  return <PolicyPage title="개인정보처리방침" sections={PRIVACY_SECTIONS} activePath="/privacy" />
}
