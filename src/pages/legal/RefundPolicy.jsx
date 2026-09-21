import React from 'react'
import PolicyPage from './PolicyPage'
import { REFUND_POLICY_SECTIONS } from '../../lib/legalContent'

export default function RefundPolicy() {
  return <PolicyPage title="환불정책" sections={REFUND_POLICY_SECTIONS} activePath="/refund-policy" />
}
