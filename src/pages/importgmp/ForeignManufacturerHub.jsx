import React, { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Factory,
  ShieldCheck,
  FileSearch,
  Plus,
  Trash2,
  Paperclip,
  Download,
  X,
  AlertTriangle,
  Save,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import { permissions, requirePermission } from '../../lib/permissions'
import { fileStore } from '../../lib/fileStore'
import { onboarding } from '../../lib/onboardingState'
import { mfds } from '../../lib/mfds'
import { resolveCategoryByNo } from '../../lib/mfdsCategory'
import {
  foreignSites,
  gmpCertificates,
  otherAuditReports,
  inspectionSchedules,
  ENTRUSTED_RELATION,
  certStatusOf,
} from '../../lib/foreignManufacturerState'
import CertGate from '../../components/CertGate'

// #4 Ã¢ÂÂ Ã¬ÂÂ Ã¬Â²Â­Ã¬ÂÂ(Ã¬ÂÂÃ«Â£ÂÃªÂ¸Â°ÃªÂ¸Â° Ã¬Â ÂÃ­ÂÂ©Ã¬ÂÂ±Ã¬ÂÂ¸Ã¬Â ÂÃ«ÂÂ± Ã¬ÂÂ¬Ã¬ÂÂ¬ Ã¬ÂÂ Ã¬Â²Â­Ã¬ÂÂ, Ã¬Â Â7Ã¬Â¡Â°Ã¬Â Â1Ã­ÂÂ­Ã¬Â Â2Ã­ÂÂ¸ ÃªÂµÂ¬Ã«Â¹ÂÃ¬ÂÂÃ«Â¥Â) Ã¬ÂÂÃ¬ÂÂÃªÂ³Â¼ Ã«ÂÂÃ¬ÂÂ¼Ã­ÂÂÃªÂ²Â
// "ÃªÂ¸Â°Ã­ÂÂ Ã¬ÂÂÃ«Â¥Â" Ã«ÂÂ¨Ã¬ÂÂ¼ Ã«ÂÂ¤Ã¬Â¤ÂÃ¬Â²Â¨Ã«Â¶Â Ã«ÂÂÃ¬ÂÂ  Ã­ÂÂ­Ã«ÂªÂ©Ã«Â³Â ÃªÂ°ÂÃ«Â³Â Ã¬ÂÂÃ«Â¥Â Ã¬ÂÂ¬Ã«Â¡Â¯Ã¬ÂÂ¼Ã«Â¡Â ÃªÂµÂ¬Ã¬ÂÂ±Ã­ÂÂÃ«ÂÂ¤.
// (Ã¬Â ÂÃ¬Â¡Â°Ã¬ÂÂ ÃªÂ°ÂÃ¬ÂÂ/Ã­ÂÂÃ«ÂªÂ©Ã«ÂªÂ©Ã«Â¡ÂÃ¬ÂÂ Ã¬ÂÂÃ¬ÂÂÃ¬ÂÂ Ã«Â³ÂÃ«ÂÂ Ã­ÂÂÃ«ÂÂÃ«Â¡Â Ã¬ÂÂ´Ã«Â¯Â¸ ÃªÂ´ÂÃ«Â¦Â¬Ã­ÂÂÃªÂ³Â , GMP Ã¬Â ÂÃ­ÂÂ©Ã¬ÂÂ¸Ã¬Â ÂÃ¬ÂÂÃÂ·Ã¬ÂÂ¤Ã¬ÂÂ¬ÃªÂ²Â°ÃªÂ³Â¼ Ã¬ÂÂÃ«Â£ÂÃ«ÂÂ
//  Ã¬ÂÂÃ«ÂÂ GMP Ã¬Â ÂÃ­ÂÂ©Ã¬ÂÂ¸Ã¬Â ÂÃ¬ÂÂ/Ã­ÂÂ Ã¬ÂÂ¸Ã¬Â¦ÂÃªÂ¸Â°ÃªÂ´Â Ã¬ÂÂ¤Ã¬ÂÂ¬Ã¬ÂÂÃ«Â£Â Ã¬ÂÂ¹Ã¬ÂÂÃ¬ÂÂÃ¬ÂÂ Ã«Â³ÂÃ«ÂÂÃ«Â¡Â ÃªÂ´ÂÃ«Â¦Â¬Ã­ÂÂÃ«Â¯ÂÃ«Â¡Â Ã¬ÂÂ¬ÃªÂ¸Â°Ã¬ÂÂÃ«ÂÂ Ã¬Â ÂÃ¬ÂÂ¸Ã­ÂÂÃ«ÂÂ¤.)
export const FOREIGN_DOC_SLOTS = [
  { key: 'bizLicense', label: '2. Ã¬Â ÂÃ¬Â¡Â°(Ã¬ÂÂÃ¬ÂÂ)Ã¬ÂÂ Ã­ÂÂÃªÂ°ÂÃ¬Â¦Â Ã¬ÂÂ¬Ã«Â³Â¸' },
  { key: 'orgChart', label: '2-ÃªÂ°Â-2. Ã¬Â¡Â°Ã¬Â§ÂÃ«ÂÂ' },
  { key: 'employeeCert', label: '2-ÃªÂ°Â-3. Ã¬Â¢ÂÃ¬ÂÂÃ¬ÂÂ Ã¬ÂÂ Ã­ÂÂÃ¬ÂÂ¸Ã¬ÂÂÃ«Â£Â' },
  { key: 'productListDoc', label: '2-ÃªÂ°Â-4. Ã¬Â ÂÃ¬Â¡Â°Ã«ÂÂÃ«ÂÂ Ã¬ÂÂÃ«Â£ÂÃªÂ¸Â°ÃªÂ¸Â° Ã«ÂªÂ©Ã«Â¡Â' },
  { key: 'cleanroomProcedure', label: '2-Ã«ÂÂ¤-2. Ã¬Â²Â­Ã¬Â ÂÃ¬ÂÂ¤ ÃªÂ´ÂÃ«Â Â¨ Ã¬Â ÂÃ¬Â°Â¨Ã¬ÂÂ' },
  { key: 'monitoringProcedure', label: '2-Ã«ÂÂ¤-3. Ã«ÂªÂ¨Ã«ÂÂÃ­ÂÂ°Ã«Â§Â Ã«Â°Â Ã¬Â¸Â¡Ã¬Â ÂÃ¬ÂÂ¥Ã«Â¹Â ÃªÂ´ÂÃ«Â Â¨ Ã¬Â ÂÃ¬Â°Â¨Ã¬ÂÂ' },
  { key: 'qualityManual', label: '2-Ã«ÂÂ¼. Ã­ÂÂÃ¬Â§ÂÃ«Â§Â¤Ã«ÂÂ´Ã¬ÂÂ¼(Ã­ÂÂÃ¬Â§ÂÃ«Â°Â©Ã¬Â¹Â¨ Ã­ÂÂ¬Ã­ÂÂ¨)' },
  { key: 'fgTestProcedure', label: '2-Ã«Â§Â-1. Ã¬ÂÂÃ¬Â ÂÃ­ÂÂÃ¬ÂÂÃ­ÂÂ ÃªÂ´ÂÃ«Â Â¨ Ã¬Â ÂÃ¬Â°Â¨Ã¬ÂÂ' },
  { key: 'fgTestReport', label: '2-Ã«Â§Â-2. Ã¬ÂÂÃ­ÂÂÃ¬ÂÂ±Ã¬Â ÂÃ¬ÂÂ' },
  { key: 'purchaseProcedure', label: '2-Ã«Â°Â-1. ÃªÂµÂ¬Ã«Â§Â¤ÃÂ·Ã¬ÂÂÃ­ÂÂ Ã¬Â ÂÃ¬Â°Â¨Ã¬ÂÂ' },
  { key: 'supplierList', label: '2-Ã«Â°Â-2. Ã¬Â£Â¼Ã¬ÂÂ ÃªÂ³ÂµÃªÂ¸ÂÃ¬ÂÂÃ¬Â²Â´Ã«ÂªÂ Ã«Â°Â Ã¬ÂÂÃ«Â¬Â´Ã«Â²ÂÃ¬ÂÂ' },
  { key: 'productSpec', label: '2-Ã¬ÂÂ¬-1. Ã¬Â ÂÃ­ÂÂÃ­ÂÂÃ¬Â¤ÂÃ¬ÂÂ' },
  { key: 'sterilizationValidation', label: '2-Ã¬ÂÂ¬-2. Ã«Â©Â¸ÃªÂ·Â  Ã¬ÂÂ Ã­ÂÂ¨Ã¬ÂÂ± Ã­ÂÂÃ¬ÂÂ¸ Ã¬Â ÂÃ¬Â°Â¨Ã¬ÂÂ (Ã­ÂÂ´Ã«ÂÂ¹ Ã¬ÂÂ)' },
  { key: 'standardChecklist', label: '2-Ã¬ÂÂ. Ã«Â³ÂÃ­ÂÂ2 ÃªÂ¸Â°Ã¬Â¤Â Ã¬Â ÂÃªÂ²ÂÃ­ÂÂ' },
  { key: 'conformityDeclaration', label: '2-Ã¬ÂÂ. Ã«Â³ÂÃ­ÂÂ2 ÃªÂ¸Â°Ã¬Â¤Â Ã¬Â ÂÃ­ÂÂ©Ã¬ÂÂ Ã¬ÂÂ¸Ã«Â¬Â¸' },
  { key: 'siteOverviewTable', label: '3. Ã¬Â ÂÃ¬Â¡Â°Ã¬ÂÂ Ã¬Â´ÂÃªÂ´ÂÃ­ÂÂ' },
  { key: 'etc', label: '3. ÃªÂ¸Â°Ã­ÂÂ Ã¬ÂÂÃ«Â£Â (Ã­ÂÂµÃ¬ÂÂ­ Ã«ÂÂÃ¬ÂÂÃ¬ÂÂ, KGMP Ã¬Â ÂÃ­ÂÂ©Ã¬ÂÂ¸Ã¬Â ÂÃ¬ÂÂ Ã¬ÂÂ¬Ã«Â³Â¸, Ã¬ÂÂ¬Ã¬ÂÂÃ¬ÂÂÃ«ÂÂ±Ã«Â¡ÂÃ¬Â¦Â Ã«ÂÂ±)' },
]

export default function ForeignManufacturerHub() {
  const user = auth.current()
  const [searchParams] = useSearchParams()
  const [tick, setTick] = useState(0)
  const refresh = () => setTick((x) => x + 1)
  const [toast, setToast] = useState(null)
  const showToast = (t) => { setToast(t); setTimeout(() => setToast(null), 2400) }

  const sites = foreignSites.getAll()

  // ÃªÂ°ÂÃ¬ÂÂ ÃªÂ³Â¼Ã¬Â Â #13 Ã¢ÂÂ Ã¬ÂÂÃ¬ÂÂGMP Ã¬Â§ÂÃ­ÂÂÃ¬ÂÂÃ­ÂÂ© Ã¬ÂÂÃ¬ÂÂ½(Ã¬ÂÂ¸ÃªÂµÂ­Ã¬Â ÂÃ¬Â¡Â°Ã¬ÂÂÃÂ·GMP Ã¬Â ÂÃ­ÂÂ©Ã¬ÂÂ¸Ã¬Â ÂÃ¬ÂÂÃÂ·Ã­ÂÂµÃªÂ´ÂÃÂ·Ã¬ÂÂ´Ã¬ÂÂÃ¬ÂÂ¬Ã«Â¡ÂÃÂ·ÃªÂ´ÂÃ«Â¦Â¬ÃªÂ¸Â°Ã¬Â¤ÂÃ¬ÂÂÃ«Â¥Â¼
  // Ã­ÂÂÃ«ÂÂÃ¬ÂÂ Ã«Â³Â´Ã«ÂÂ Ã¬ÂÂÃ¬ÂÂ½). ÃªÂ°Â Ã­ÂÂÃ«Â©Â´Ã¬ÂÂ localStorageÃ«Â¥Â¼ ÃªÂ·Â¸Ã«ÂÂÃ«Â¡Â Ã¬ÂÂ½Ã¬ÂÂ´ ÃªÂ°ÂÃ«Â³ÂÃªÂ²Â Ã¬Â§ÂÃªÂ³ÂÃ«Â§Â Ã­ÂÂÃ«ÂÂ¤ Ã¢ÂÂ Ã«Â³ÂÃ«ÂÂ
  // Ã¬ÂÂÃ­ÂÂ Ã¬Â ÂÃ¬ÂÂ¥Ã¬ÂÂÃ«Â¥Â¼ Ã¬ÂÂÃ«Â¡Â Ã«Â§ÂÃ«ÂÂ¤Ã¬Â§Â Ã¬ÂÂÃªÂ³Â  ÃªÂ¸Â°Ã¬Â¡Â´ 4ÃªÂ°Â Ã­ÂÂÃ«Â©Â´Ã¬ÂÂ Ã«ÂÂ°Ã¬ÂÂ´Ã­ÂÂ°Ã«Â¥Â¼ ÃªÂ·Â¸Ã«ÂÂÃ«Â¡Â Ã«Â°ÂÃ¬ÂÂÃ­ÂÂÃ«ÂÂ¤.
  const importSummary = (() => {
    const certAll = sites.flatMap((s) => gmpCertificates.getForSite(s.id))
    const certExpiring = certAll.filter((c) => certStatusOf(c.expiryDate) === 'Ã«Â§ÂÃ«Â£ÂÃ¬ÂÂÃ«Â°Â').length
    const certExpired = certAll.filter((c) => certStatusOf(c.expiryDate) === 'Ã«Â§ÂÃ«Â£Â').length
    let clearanceCount = 0
    try { clearanceCount = (JSON.parse(localStorage.getItem('qualytree.import_clearance') || '[]')).length } catch { /* ignore */ }
    let adverseOpen = 0
    try {
      const adv = JSON.parse(localStorage.getItem('qualytree.import_adverse') || '[]')
      adverseOpen = adv.filter((i) => !['closed', 'rejected'].includes(i.status)).length
    } catch { /* ignore */ }
    let imsStatus = null
    try {
      const ims = JSON.parse(localStorage.getItem('qualytree.import_management_standard') || 'null')
      imsStatus = ims?.docStatus || null
    } catch { /* ignore */ }
    return { sitesCount: sites.length, certExpiring, certExpired, clearanceCount, adverseOpen, imsStatus }
  })()
  const IMS_STATUS_LABEL = { draft: 'Ã¬ÂÂÃ¬ÂÂ±Ã¬Â¤Â', review: 'ÃªÂ²ÂÃ­ÂÂ Ã¬Â¤Â', approval: 'Ã¬ÂÂ¹Ã¬ÂÂ¸Ã«ÂÂÃªÂ¸Â°', approved: 'Ã¬ÂÂ¹Ã¬ÂÂ¸Ã¬ÂÂÃ«Â£Â' }
  const [selId, setSelId] = useState(() => searchParams.get('siteId') || sites[0]?.id || null)
  const sel = sites.find((s) => s.id === selId) || sites[0] || null
  const canEdit = permissions.can('importgmp.site.edit')

  const dueCerts = gmpCertificates.dueOrExpired()
  // ÃªÂ³ÂµÃ­ÂÂµ Ã¬Â ÂÃ¬Â¶Â Ã«Â¬Â¸Ã¬ÂÂÃÂ·ÃªÂ¸Â°Ã¬ÂÂ Ã«Â¬Â¸Ã¬ÂÂÃÂ·Ã­ÂÂÃ¬Â§ÂÃ¬ÂÂÃ¬ÂÂ¤Ã­ÂÂÃÂ·Ã¬Â ÂÃ¬Â°Â¨Ã¬ÂÂÃÂ·ÃªÂ¸Â°Ã«Â¡Â Ã¬Â²Â´Ã­ÂÂ¬Ã«Â¦Â¬Ã¬ÂÂ¤Ã­ÂÂ¸ Ã¢ÂÂ KGMPÃ­ÂÂµÃ­ÂÂ©Ã­ÂÂÃ­ÂÂ©(Ã¬Â ÂÃ¬Â¡Â°Ã¬ÂÂ¬Ã¬ÂÂ©)ÃªÂ³Â¼ ÃªÂ°ÂÃ¬ÂÂ
  // Ã«Â¡ÂÃ¬Â§ÂÃ¬ÂÂ Ã¬ÂÂÃ¬ÂÂÃ¬ÂÂ¬ ÃªÂ´ÂÃ¬Â Â(profile:'importer')Ã¬ÂÂ¼Ã«Â¡Â ÃªÂ³ÂÃ¬ÂÂ°Ã­ÂÂ´ Ã¬ÂÂ´ Ã­ÂÂÃ«Â©Â´Ã¬ÂÂ Ã­ÂÂ¨ÃªÂ»Â Ã«Â³Â´Ã¬ÂÂ¬Ã¬Â¤ÂÃ«ÂÂ¤. Ã¬Â ÂÃ¬Â¡Â°Ã¬ÂÂÃ«Â³Â GMP
  // Ã¬Â ÂÃ­ÂÂ©Ã¬ÂÂ¸Ã¬Â ÂÃ¬ÂÂ Ã¬ÂÂÃ¬ÂÂ¸Ã«ÂÂ Ã¬ÂÂ Ã«Â§ÂÃ¬ÂÂ¤Ã­ÂÂ°-Ã«ÂÂÃ­ÂÂÃ¬ÂÂ¼ UIÃ¬ÂÂÃ¬ÂÂ Ã¬Â§ÂÃ¬Â Â ÃªÂ´ÂÃ«Â¦Â¬Ã­ÂÂÃ«Â¯ÂÃ«Â¡Â Ã¬Â²Â´Ã­ÂÂ¬Ã«Â¦Â¬Ã¬ÂÂ¤Ã­ÂÂ¸Ã¬ÂÂÃ«ÂÂ Ã¬Â¤ÂÃ«Â³Âµ Ã«ÂÂÃ¬ÂÂ´Ã­ÂÂÃ¬Â§Â Ã¬ÂÂÃ«ÂÂÃ«ÂÂ¤.

  const addSite = () => {
    if (!requirePermission('importgmp.site.edit')) return
    const rec = foreignSites.add({ name: 'Ã¬ÂÂ Ã¬ÂÂ¸ÃªÂµÂ­Ã¬Â ÂÃ¬Â¡Â°Ã¬ÂÂ' })
    setSelId(rec.id)
    refresh()
    showToast('Ã¬ÂÂ¸ÃªÂµÂ­Ã¬Â ÂÃ¬Â¡Â°Ã¬ÂÂÃªÂ°Â Ã«ÂÂ±Ã«Â¡ÂÃ«ÂÂÃ¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤.')
  }

  const delSite = (id) => {
    if (!requirePermission('importgmp.site.edit')) return
    if (!window.confirm('Ã¬ÂÂ´ Ã¬ÂÂ¸ÃªÂµÂ­Ã¬Â ÂÃ¬Â¡Â°Ã¬ÂÂÃ¬ÂÂ ÃªÂ´ÂÃ«Â Â¨ GMP Ã¬ÂÂ¸Ã¬Â ÂÃ¬ÂÂÃÂ·Ã¬ÂÂ¤Ã¬ÂÂ¬Ã¬ÂÂÃ«Â£ÂÃ«Â¥Â¼ Ã«ÂªÂ¨Ã«ÂÂ Ã¬ÂÂ­Ã¬Â ÂÃ­ÂÂ ÃªÂ¹ÂÃ¬ÂÂ?')) return
    foreignSites.delete(id)
    const next = foreignSites.getAll()
    setSelId(next[0]?.id || null)
    refresh()
    showToast('Ã¬ÂÂ­Ã¬Â ÂÃ«ÂÂÃ¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤.')
  }

  return (
    <AppLayout user={user} title="Ã¬ÂÂ¸ÃªÂµÂ­Ã¬Â ÂÃ¬Â¡Â°Ã¬ÂÂ ÃÂ· Ã¬ÂÂÃ¬ÂÂ GMP" subtitle="Ã¬ÂÂÃ¬ÂÂÃ¬ÂÂÃ¬ÂÂ GMP Ã¬ÂÂ¬Ã¬ÂÂ¬ Ã«ÂÂÃ¬ÂÂ Ã¢ÂÂ Ã¬ÂÂ¸ÃªÂµÂ­Ã¬Â ÂÃ¬Â¡Â°Ã¬ÂÂ Ã«ÂÂ±Ã«Â¡Â / GMP Ã¬Â ÂÃ­ÂÂ©Ã¬ÂÂ¸Ã¬Â ÂÃ¬ÂÂ / Ã­ÂÂ Ã¬ÂÂ¸Ã¬Â¦ÂÃªÂ¸Â°ÃªÂ´Â Ã¬ÂÂ¤Ã¬ÂÂ¬Ã¬ÂÂÃ«Â£Â">
      <CertGate certId="kgmp_importer" label="Ã¬ÂÂ¸ÃªÂµÂ­Ã¬Â ÂÃ¬Â¡Â°Ã¬ÂÂ(Ã¬ÂÂÃ¬ÂÂGMP)">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto fade-in">
        {toast && (
          <div className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-lg text-[13px] flex items-center gap-2 fade-in" style={{ background: 'var(--moss)', color: 'var(--bg)', boxShadow: '0 6px 20px rgba(15,26,20,0.18)', fontWeight: 500 }}>
            Ã¢ÂÂ {toast}
          </div>
        )}

        <div className="mb-5">
          <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--moss)' }}>
            IMPORT-GMP ÃÂ· FOREIGN MANUFACTURER REGISTRY
          </span>
          <div className="font-display text-[26px] mt-1" style={{ color: 'var(--ink)', fontWeight: 500 }}>
            Ã¬ÂÂ¸ÃªÂµÂ­Ã¬Â ÂÃ¬Â¡Â°Ã¬ÂÂ ÃÂ· Ã¬ÂÂÃ¬ÂÂ GMP
          </div>
          <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>
            Ã¬ÂÂÃ¬ÂÂÃ¬ÂÂÃ¬ÂÂÃ«ÂÂ Ã¬ÂÂÃªÂ¸Â° Ã¬ÂÂ¬Ã¬ÂÂÃ¬ÂÂ¥Ã¬ÂÂ´ Ã¬ÂÂÃ«ÂÂÃ«ÂÂ¼ Ã¬Â ÂÃ­ÂÂÃ¬ÂÂ Ã«Â§ÂÃ«ÂÂÃ«ÂÂ Ã¬ÂÂ¸ÃªÂµÂ­Ã¬Â ÂÃ¬Â¡Â°Ã¬ÂÂÃªÂ°Â GMP Ã¬ÂÂ¬Ã¬ÂÂ¬ Ã«ÂÂÃ¬ÂÂÃ¬ÂÂÃ«ÂÂÃ«ÂÂ¤. Ã¬Â ÂÃ¬Â¡Â°Ã¬ÂÂÃ«Â³ÂÃ«Â¡Â ÃªÂ°ÂÃ¬ÂÂÃÂ·GMP Ã¬Â ÂÃ­ÂÂ©Ã¬ÂÂ¸Ã¬Â ÂÃ¬ÂÂÃÂ·Ã­ÂÂ Ã¬ÂÂ¸Ã¬Â¦ÂÃªÂ¸Â°ÃªÂ´Â Ã¬ÂÂ¤Ã¬ÂÂ¬Ã¬ÂÂÃ«Â£ÂÃ«Â¥Â¼ Ã«ÂÂ±Ã«Â¡ÂÃÂ·ÃªÂ´ÂÃ«Â¦Â¬Ã­ÂÂ©Ã«ÂÂÃ«ÂÂ¤.
          </div>
        </div>

        {/* ÃªÂ°ÂÃ¬ÂÂ ÃªÂ³Â¼Ã¬Â Â #13 Ã¢ÂÂ Ã¬ÂÂÃ¬ÂÂGMP Ã¬Â§ÂÃ­ÂÂÃ¬ÂÂÃ­ÂÂ© Ã¬ÂÂÃ¬ÂÂ½ */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          <a href="#sites" className="p-3 rounded-xl text-center no-underline" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
            <div className="text-[20px] font-bold" style={{ color: 'var(--ink)' }}>{importSummary.sitesCount}</div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>Ã«ÂÂ±Ã«Â¡Â Ã¬ÂÂ¸ÃªÂµÂ­Ã¬Â ÂÃ¬Â¡Â°Ã¬ÂÂ</div>
          </a>
          <div className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
            <div className="text-[20px] font-bold" style={{ color: importSummary.certExpired > 0 ? '#DC2626' : importSummary.certExpiring > 0 ? '#D97706' : 'var(--ink)' }}>
              {importSummary.certExpired + importSummary.certExpiring}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>GMP Ã¬ÂÂ¸Ã¬Â ÂÃ¬ÂÂ Ã«Â§ÂÃ«Â£Â/Ã¬ÂÂÃ«Â°Â</div>
          </div>
          <a href="/import-clearance" className="p-3 rounded-xl text-center no-underline" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
            <div className="text-[20px] font-bold" style={{ color: 'var(--ink)' }}>{importSummary.clearanceCount}</div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>Ã¬ÂÂÃ¬ÂÂÃ­ÂÂµÃªÂ´ÂÃªÂ¸Â°Ã«Â¡Â</div>
          </a>
          <a href="/import-adverse" className="p-3 rounded-xl text-center no-underline" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
            <div className="text-[20px] font-bold" style={{ color: importSummary.adverseOpen > 0 ? '#D97706' : 'var(--ink)' }}>{importSummary.adverseOpen}</div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>Ã¬ÂÂ´Ã¬ÂÂÃ¬ÂÂ¬Ã«Â¡Â Ã¬Â§ÂÃ­ÂÂÃ¬Â¤Â</div>
          </a>
          <a href="/import-management-standard" className="p-3 rounded-xl text-center no-underline" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
            <div className="text-[13px] font-bold" style={{ color: 'var(--ink)' }}>{importSummary.imsStatus ? (IMS_STATUS_LABEL[importSummary.imsStatus] || importSummary.imsStatus) : 'Ã«Â¯Â¸Ã¬ÂÂÃ¬ÂÂ±'}</div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>Ã¬ÂÂÃ¬ÂÂÃªÂ´ÂÃ«Â¦Â¬ÃªÂ¸Â°Ã¬Â¤ÂÃ¬ÂÂ</div>
          </a>
        </div>

        {dueCerts.length > 0 && (
          <div className="card-base p-3.5 mb-5 flex items-start gap-2.5" style={{ background: 'var(--amber-soft)' }}>
            <AlertTriangle size={16} style={{ color: 'var(--amber)' }} className="shrink-0 mt-0.5" />
        <div style={{background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:8,padding:'10px 16px',marginBottom:16,display:'flex',gap:10,alignItems:'flex-start'}}>
          <div style={{width:20,height:20,borderRadius:'50%',background:'#16A34A',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0,marginTop:1}}>i</div>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:'#166534',marginBottom:3}}>Ã­ÂÂ´Ã¬ÂÂ¸ Ã¬ÂÂÃ¬Â ÂÃ­ÂÂ Ã¬Â ÂÃ¬Â¡Â°Ã¬ÂÂ Ã¬Â ÂÃ¬ÂÂ©</div>
            <div style={{fontSize:12,color:'#14532D',lineHeight:1.6}}>Ã¬ÂÂÃ¬ÂÂ Ã¬ÂÂÃ«Â£ÂÃªÂ¸Â°ÃªÂ¸Â°Ã¬ÂÂ Ã­ÂÂ´Ã¬ÂÂ¸ Ã¬Â ÂÃ¬Â¡Â°Ã¬ÂÂ(Ã¬Â ÂÃ­ÂÂÃ«Â³Â GMP Ã¬Â ÂÃ­ÂÂ©Ã¬ÂÂ¸Ã¬Â ÂÃÂ·Ã¬ÂÂ¤Ã­ÂÂÃ¬Â¡Â°Ã¬ÂÂ¬ÃÂ·Ã¬ÂÂ¸Ã¬Â¦Â ÃªÂ´ÂÃ«Â¦Â¬)Ã«Â¥Â¼ Ã«ÂÂ´Ã«ÂÂ¹Ã­ÂÂ©Ã«ÂÂÃ«ÂÂ¤. Ã¬ÂÂÃ«Â¶ÂÃ¬ÂÂÃ¬ÂÂ¬ÃÂ·Ã«Â¶ÂÃ­ÂÂ Ã«ÂÂ± ÃªÂµÂ­Ã«ÂÂ´ ÃªÂ³ÂµÃªÂ¸ÂÃ¬ÂÂÃ¬Â²Â´Ã«ÂÂ <b>ÃªÂ³ÂµÃªÂ¸ÂÃ¬ÂÂÃ¬Â²Â´ ÃªÂ´ÂÃ«Â¦Â¬</b> Ã«Â©ÂÃ«ÂÂ´Ã¬ÂÂÃ¬ÂÂ ÃªÂ´ÂÃ«Â¦Â¬Ã­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ.</div>
          </div>
        </div>
            <div className="text-[12.5px]" style={{ color: 'var(--ink)' }}>
              <b>GMP Ã¬Â ÂÃ­ÂÂ©Ã¬ÂÂ¸Ã¬Â ÂÃ¬ÂÂ {dueCerts.length}ÃªÂ±Â´</b>Ã¬ÂÂ´ Ã«Â§ÂÃ«Â£ÂÃ«ÂÂÃ¬ÂÂÃªÂ±Â°Ã«ÂÂ 90Ã¬ÂÂ¼ Ã¬ÂÂ´Ã«ÂÂ´ Ã«Â§ÂÃ«Â£Â Ã¬ÂÂÃ¬Â ÂÃ¬ÂÂÃ«ÂÂÃ«ÂÂ¤. Ã¬Â ÂÃªÂ¸Â°ÃªÂ°Â±Ã¬ÂÂ Ã¬ÂÂ¬Ã¬ÂÂ¬Ã«ÂÂ Ã¬ÂÂ Ã­ÂÂ¨ÃªÂ¸Â°Ã­ÂÂ Ã«Â§ÂÃ«Â£ÂÃ¬ÂÂ¼ 90Ã¬ÂÂ¼ Ã¬Â ÂÃªÂ¹ÂÃ¬Â§Â Ã¬ÂÂ Ã¬Â²Â­Ã­ÂÂ´Ã¬ÂÂ¼ Ã­ÂÂ©Ã«ÂÂÃ«ÂÂ¤.
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-5 gap-3">
          <div className="md:col-span-2 space-y-2">
            {canEdit && (
              <button onClick={addSite} className="btn-ghost text-[12px] w-full justify-center">
                <Plus size={12} /> Ã¬ÂÂ¸ÃªÂµÂ­Ã¬Â ÂÃ¬Â¡Â°Ã¬ÂÂ Ã¬Â¶ÂÃªÂ°Â
              </button>
            )}
            {sites.length === 0 && <EmptyState icon={Factory} text="Ã«ÂÂ±Ã«Â¡ÂÃ«ÂÂ Ã¬ÂÂ¸ÃªÂµÂ­Ã¬Â ÂÃ¬Â¡Â°Ã¬ÂÂÃªÂ°Â Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤." />}
            {sites.map((s) => {
              const certs = gmpCertificates.getForSite(s.id)
              const latestStatus = certs[0] ? certStatusOf(certs[0].expiryDate) : null
              const tone = latestStatus === 'Ã«Â§ÂÃ«Â£Â' ? 'rose' : latestStatus === 'Ã«Â§ÂÃ«Â£ÂÃ¬ÂÂÃ«Â°Â' ? 'amber' : latestStatus === 'Ã¬ÂÂ Ã­ÂÂ¨' ? 'emerald' : 'slate'
              const active = s.id === (sel?.id)
              return (
                <button
                  key={s.id}
                  onClick={() => setSelId(s.id)}
                  className="card-base p-3.5 w-full text-left block"
                  style={active ? { borderColor: 'var(--moss)', background: 'var(--leaf-soft)' } : undefined}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{s.name || '(Ã¬ÂÂ´Ã«Â¦ÂÃ¬ÂÂÃ¬ÂÂ)'}</span>
                    {latestStatus && <Badge text={'GMP ' + latestStatus} tone={tone} />}
                    {certs.length === 0 && <Badge text="GMP Ã¬ÂÂ¸Ã¬Â ÂÃ¬ÂÂ Ã¬ÂÂÃ¬ÂÂ" tone="rose" />}
                  </div>
                  <div className="text-[11.5px] mt-1" style={{ color: 'var(--ink-mute)' }}>{s.address || 'Ã¬Â£Â¼Ã¬ÂÂ Ã«Â¯Â¸Ã¬ÂÂÃ«Â Â¥'}</div>
                </button>
              )
            })}
          </div>

          <div className="md:col-span-3">
            {sel ? (
              <SiteDetail key={sel.id} site={sel} canEdit={canEdit} onAction={showToast} onChanged={refresh} onDelete={() => delSite(sel.id)} allSites={sites} />
            ) : (
              <EmptyState icon={Factory} text="Ã¬ÂÂ¼Ã¬ÂªÂ½Ã¬ÂÂÃ¬ÂÂ Ã¬ÂÂ¸ÃªÂµÂ­Ã¬Â ÂÃ¬Â¡Â°Ã¬ÂÂÃ«Â¥Â¼ Ã¬ÂÂ Ã­ÂÂÃ­ÂÂÃªÂ±Â°Ã«ÂÂ Ã¬Â¶ÂÃªÂ°ÂÃ­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ." />
            )}
          </div>
        </div>

      </div>
      <SiteProductMatrix sites={sites} />
      </CertGate>
    </AppLayout>
  )
}

/* ================================================================
   Ã¬Â ÂÃ¬Â¡Â°Ã¬ÂÂ Ã¬ÂÂÃ¬ÂÂ¸ Ã¢ÂÂ ÃªÂ¸Â°Ã«Â³Â¸Ã¬Â ÂÃ«Â³Â´ + GMP Ã¬Â ÂÃ­ÂÂ©Ã¬ÂÂ¸Ã¬Â ÂÃ¬ÂÂ + Ã­ÂÂ Ã¬ÂÂ¸Ã¬Â¦ÂÃªÂ¸Â°ÃªÂ´Â Ã¬ÂÂ¤Ã¬ÂÂ¬Ã¬ÂÂÃ«Â£Â
   ================================================================ */

function SiteProductMatrix({ sites }) {
  const [open, setOpen] = useState(false)
  const rows = sites.flatMap(site =>
    (site.products || []).map(p => ({ siteName: site.name || '(Ã¬ÂÂ´Ã«Â¦Â Ã¬ÂÂÃ¬ÂÂ)', group: p.group || '', productName: p.name || '', grade: p.grade || '' }))
  )
  return (
    <div className="mt-4 rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3 text-left"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)' }}
      >
        <span className="text-[13.5px] font-bold">Ã¬Â ÂÃ¬Â¡Â°Ã¬ÂÂ-Ã­ÂÂÃ«ÂªÂ© Ã¬ÂÂ°ÃªÂ²Â° Ã­ÂÂÃ­ÂÂ©</span>
        <span className="flex items-center gap-2">
          <span className="text-[12px] px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-soft)', color: 'var(--ink-mute)' }}>{rows.length}ÃªÂ±Â´</span>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>
      {open && (
        rows.length === 0 ? (
          <p className="text-[12px] py-6 text-center" style={{ color: 'var(--ink-faint)' }}>Ã«ÂÂ±Ã«Â¡ÂÃ«ÂÂ Ã¬Â ÂÃ¬Â¡Â°Ã¬ÂÂ Ã«ÂÂÃ«ÂÂ Ã­ÂÂÃ«ÂªÂ©Ã¬ÂÂ´ Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-soft)', borderTop: '1px solid var(--border)' }}>
                  {['Ã¬ÂÂ¸ÃªÂµÂ­Ã¬Â ÂÃ¬Â¡Â°Ã¬ÂÂ', 'Ã­ÂÂÃ«ÂªÂ©ÃªÂµÂ°', 'Ã­ÂÂÃ«ÂªÂ©Ã«ÂªÂ', 'Ã«ÂÂ±ÃªÂ¸Â'].map(h => (
                    <th key={h} className="text-left px-4 py-2 font-semibold" style={{ color: 'var(--ink-mute)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="px-4 py-2 font-medium" style={{ color: 'var(--ink)', maxWidth: 180 }}>{r.siteName}</td>
                    <td className="px-4 py-2" style={{ color: 'var(--ink-soft)' }}>{r.group}</td>
                    <td className="px-4 py-2" style={{ color: 'var(--ink)' }}>{r.productName}</td>
                    <td className="px-4 py-2 text-center">
                      {r.grade && <span className="inline-block text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--bg-soft)', color: 'var(--ink-mute)' }}>{r.grade}Ã«ÂÂ±ÃªÂ¸Â</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}


function SiteDetail({ site, canEdit, onAction, onChanged, onDelete, allSites }) {
  const [form, setForm] = useState(site)
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const dirty = JSON.stringify(form) !== JSON.stringify(site)
  const [pnOpenId, setPnOpenId] = useState(null) // #3 Ã­ÂÂÃ«ÂªÂ©Ã«ÂªÂ ÃªÂ²ÂÃ¬ÂÂ Ã«ÂÂÃ«Â¡Â­Ã«ÂÂ¤Ã¬ÂÂ´ (Ã¬ÂÂ´Ã«Â Â¤Ã¬ÂÂÃ«ÂÂ Ã­ÂÂ id)

  // #17 Ã¢ÂÂ Ã­ÂÂÃ«ÂªÂ©ÃªÂµÂ°Ã¬ÂÂ Ã¬ÂÂ¬Ã¬ÂÂ©Ã¬ÂÂÃªÂ°Â Ã¬Â§ÂÃ¬Â Â Ã­ÂÂÃ¬ÂÂ´Ã­ÂÂÃ­ÂÂÃ¬Â§Â Ã¬ÂÂÃ¬ÂÂÃ«ÂÂ, MFDS Ã­ÂÂÃ«ÂªÂ©Ã«Â¶ÂÃ«Â¥Â Ã«ÂÂ°Ã¬ÂÂ´Ã­ÂÂ°Ã«Â¡Â Ã­ÂÂÃ«ÂªÂ©Ã«ÂªÂÃ¬ÂÂ Ã¬Â°Â¾Ã¬ÂÂ
  // Ã«Â¶ÂÃ«Â¥ÂÃ«Â²ÂÃ­ÂÂ¸ ÃªÂ¸Â°Ã¬Â¤Â Ã­ÂÂÃ«ÂªÂ©ÃªÂµÂ°Ã¬ÂÂ Ã¬ÂÂÃ«ÂÂ Ã¬ÂÂÃ¬ÂÂ±Ã­ÂÂ´Ã¬Â¤ÂÃ«ÂÂ¤(RegulatoryHub Step1ÃªÂ³Â¼ Ã«ÂÂÃ¬ÂÂ¼Ã­ÂÂ Ã«Â°Â©Ã¬ÂÂ).
  React.useEffect(() => { mfds.load() }, [])
  const autoFillGroup = (id, name) => {
    if (!name || !name.trim()) return
    const hit = mfds.search(name, 1).find((it) => it.name === name.trim()) || mfds.search(name, 1)[0]
    if (!hit) return
    const cat = resolveCategoryByNo(hit.no)
    if (!cat) return
    setForm((f) => ({
      ...f,
      products: (f.products || []).map((row) => (row.id === id && !row.group ? { ...row, group: cat.name } : row)),
    }))
  }

  // Ã¬ÂÂ´Ã«Â¯Â¸ Ã«ÂÂ±Ã«Â¡ÂÃ«ÂÂ Ã­ÂÂÃ«ÂªÂ©Ã«ÂªÂ Ã¢ÂÂ Ã«ÂÂ¤Ã«Â¥Â¸ Ã¬ÂÂ¸ÃªÂµÂ­Ã¬Â ÂÃ¬Â¡Â°Ã¬ÂÂÃ¬ÂÂ Ã«ÂÂ±Ã«Â¡ÂÃ«ÂÂ Ã­ÂÂÃ«ÂªÂ© + Ã­ÂÂÃ¬ÂÂ¬ Ã¬Â ÂÃ­ÂÂÃÂ·ÃªÂ³ÂµÃ¬Â Â(ProductsHub)Ã¬ÂÂ Ã«ÂÂ±Ã«Â¡ÂÃ«ÂÂ Ã­ÂÂÃ«ÂªÂ©Ã¬ÂÂ Ã­ÂÂ¨ÃªÂ»Â ÃªÂ²ÂÃ¬ÂÂ Ã­ÂÂÃ«Â³Â´Ã«Â¡Â Ã¬ÂÂ¬Ã¬ÂÂ© (#3, #25 Ã¬ÂÂ¬Ã¬ÂÂÃ¬Â Â)
  // Ã¬Â ÂÃ¬Â¡Â°Ã¬ÂÂÃ«Â¥Â¼ Ã¬Â²ÂÃ¬ÂÂ Ã«ÂÂ±Ã«Â¡ÂÃ­ÂÂ  Ã«ÂÂÃ«ÂÂ Ã«ÂÂ¤Ã«Â¥Â¸ Ã¬Â ÂÃ¬Â¡Â°Ã¬ÂÂ Ã­ÂÂÃ«ÂªÂ©Ã¬ÂÂ´ Ã¬ÂÂÃ¬Â§Â Ã¬ÂÂÃ¬ÂÂ´ ÃªÂ²ÂÃ¬ÂÂÃ¬ÂÂ´ Ã«Â¹ÂÃ¬ÂÂ´ Ã«Â³Â´Ã¬ÂÂ¼ Ã¬ÂÂ Ã¬ÂÂÃ¬ÂÂ¼Ã«Â¯ÂÃ«Â¡Â, Ã¬ÂÂ´Ã«Â¯Â¸ Ã¬ÂÂ¨Ã«Â³Â´Ã«ÂÂ©Ã¬ÂÂÃ¬ÂÂ Ã«ÂÂ±Ã«Â¡ÂÃ­ÂÂ Ã¬ÂÂÃ¬ÂÂ¬ Ã­ÂÂÃ«ÂªÂ©Ã«ÂÂ Ã­ÂÂ¨ÃªÂ»Â Ã¬Â°Â¾Ã«ÂÂÃ«ÂÂ¤.
  const knownProducts = React.useMemo(() => {
    const map = new Map()
    ;(allSites || []).forEach((s) => (s.products || []).forEach((p) => {
      if (p.name && !map.has(p.name)) map.set(p.name, p)
    }))
    const obProducts = (onboarding.load()?.products || [])
    obProducts.forEach((p) => {
      const name = p.itemName || p.name
      if (name && !map.has(name)) map.set(name, { name, group: p.cat1 || '', grade: p.grade ? p.grade + 'Ã«ÂÂ±ÃªÂ¸Â' : '' })
    })
    return Array.from(map.values())
  }, [allSites])

  const save = () => {
    if (!requirePermission('importgmp.site.edit')) return
    foreignSites.update(site.id, form)
    onChanged()
    onAction('Ã¬Â ÂÃ¬Â¡Â°Ã¬ÂÂ Ã¬Â ÂÃ«Â³Â´ÃªÂ°Â Ã¬Â ÂÃ¬ÂÂ¥Ã«ÂÂÃ¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤.')
  }

  const attachFacilityFile = async (file) => {
    if (!requirePermission('importgmp.site.edit')) return
    const fileId = await fileStore.saveFile(file)
    foreignSites.update(site.id, { facilityFileId: fileId, facilityFileName: file.name })
    onChanged()
  }
  const removeFacilityFile = () => {
    if (!requirePermission('importgmp.site.edit')) return
    foreignSites.update(site.id, { facilityFileId: null, facilityFileName: '' })
    onChanged()
  }

  // Ã­ÂÂÃ«ÂªÂ©Ã«ÂªÂ©Ã«Â¡Â: Ã­ÂÂÃ«ÂªÂ©ÃªÂµÂ°/Ã­ÂÂÃ«ÂªÂ©Ã«ÂªÂ/Ã­ÂÂÃ«ÂªÂ©Ã«ÂÂ±ÃªÂ¸Â ÃªÂµÂ¬Ã¬Â¡Â°Ã­ÂÂ (#295) Ã¢ÂÂ Ã¬ÂÂ¼Ã«Â°Â Ã­ÂÂÃ«ÂÂÃ¬ÂÂ Ã«ÂÂÃ¬ÂÂ¼Ã­ÂÂÃªÂ²Â 'Ã«Â³ÂÃªÂ²Â½Ã¬ÂÂ¬Ã­ÂÂ­ Ã¬Â ÂÃ¬ÂÂ¥'Ã¬ÂÂ¼Ã«Â¡Â Ã«Â°ÂÃ¬ÂÂ
  const addProductRow = () => {
    if (!canEdit) return
    setForm((f) => ({ ...f, products: [...(f.products || []), { id: Math.random().toString(36).slice(2, 9), group: '', name: '', grade: '1Ã«ÂÂ±ÃªÂ¸Â' }] }))
  }
  const setProductField = (id, key, val) => {
    setForm((f) => ({ ...f, products: (f.products || []).map((p) => (p.id === id ? { ...p, [key]: val } : p)) }))
  }
  const removeProductRow = (id) => {
    setForm((f) => ({ ...f, products: (f.products || []).filter((p) => p.id !== id) }))
  }

  // #4 Ã¢ÂÂ Ã¬ÂÂ Ã¬Â²Â­Ã¬ÂÂ ÃªÂµÂ¬Ã«Â¹ÂÃ¬ÂÂÃ«Â¥ÂÃ«Â³Â ÃªÂ°ÂÃ«Â³Â Ã¬ÂÂ¬Ã«Â¡Â¯ Ã«ÂÂ¤Ã¬Â¤Â Ã¬Â²Â¨Ã«Â¶Â (ÃªÂ¸Â°Ã¬Â¡Â´ "ÃªÂ¸Â°Ã­ÂÂ Ã¬ÂÂÃ«Â¥Â" Ã«ÂÂ¨Ã¬ÂÂ¼ Ã«Â²ÂÃ­ÂÂ· Ã«ÂÂÃ¬Â²Â´)
  const attachSlotFile = async (slotKey, file) => {
    if (!requirePermission('importgmp.site.edit')) return
    const fileId = await fileStore.saveFile(file)
    const cur = { ...(site.docSlotFiles || {}) }
    cur[slotKey] = [...(cur[slotKey] || []), { id: Math.random().toString(36).slice(2, 9), fileId, fileName: file.name }]
    foreignSites.update(site.id, { docSlotFiles: cur })
    setF('docSlotFiles', cur)
    onChanged()
  }
  const removeSlotFile = (slotKey, fid) => {
    if (!requirePermission('importgmp.site.edit')) return
    const cur = { ...(site.docSlotFiles || {}) }
    cur[slotKey] = (cur[slotKey] || []).filter((x) => x.id !== fid)
    foreignSites.update(site.id, { docSlotFiles: cur })
    setF('docSlotFiles', cur)
    onChanged()
  }

  const openFile = async (fileId) => {
    const url = await fileStore.getObjectURL(fileId)
    if (!url) { window.alert('Ã­ÂÂÃ¬ÂÂ¼Ã¬ÂÂ Ã¬Â°Â¾Ã¬ÂÂ Ã¬ÂÂ Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤.'); return }
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  }

  const missing = []
  if (!site.products || site.products.length === 0) missing.push('Ã­ÂÂÃ«ÂªÂ©Ã«ÂªÂ©Ã«Â¡Â')
  if (!site.facilityFileId) missing.push('Ã¬ÂÂÃ¬ÂÂ¤ÃªÂ°ÂÃ¬ÂÂ(Ã­ÂÂÃ«Â©Â´Ã«ÂÂÃÂ·Ã¬ÂÂ¥Ã«Â¹ÂÃ«ÂªÂ©Ã«Â¡Â)')

  return (
    <div className="space-y-4">
      <div className="card-base p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>Ã¬Â ÂÃ¬Â¡Â°Ã¬ÂÂ ÃªÂ°ÂÃ¬ÂÂ</div>
          {canEdit && <button onClick={onDelete} className="text-[12px] inline-flex items-center gap-1" style={{ color: 'var(--rust, #c0392b)' }}><Trash2 size={13} /> Ã¬ÂÂ­Ã¬Â Â</button>}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Ã¬Â ÂÃ¬Â¡Â°Ã¬ÂÂ Ã«ÂªÂÃ¬Â¹Â­" value={form.name} onChange={(v) => setF('name', v)} className="sm:col-span-2" />
          <Field label="Ã¬Â£Â¼Ã¬ÂÂ" value={form.address} onChange={(v) => setF('address', v)} className="sm:col-span-2" />
          <Field label="Ã¬Â¢ÂÃ¬ÂÂÃ¬ÂÂ Ã¬ÂÂ" value={form.employeeCount} onChange={(v) => setF('employeeCount', v)} placeholder="Ã¬Â ÂÃ¬Â¡Â°ÃÂ·Ã­ÂÂÃ¬Â§Â ÃªÂ´ÂÃ«Â Â¨ Ã¬Â´Â Ã¬ÂÂ¸Ã¬ÂÂ" />
          <SelectField label="Ã¬ÂÂÃ­ÂÂÃ¬Â ÂÃ¬Â¡Â° ÃªÂ´ÂÃªÂ³Â" value={form.entrustedRelation} onChange={(v) => setF('entrustedRelation', v)} options={Object.values(ENTRUSTED_RELATION)} />
          {form.entrustedRelation !== ENTRUSTED_RELATION.NONE && (
            <Field label="Ã¬ÂÂÃ«ÂÂ Ã¬Â ÂÃ¬Â¡Â°Ã¬ÂÂÃ«ÂªÂ (Ã¬Â ÂÃ¬Â¡Â°Ã¬ÂÂÃ«Â¢Â°Ã¬ÂÂ/Ã¬Â ÂÃ¬Â¡Â°Ã¬ÂÂ)" value={form.relatedSiteName} onChange={(v) => setF('relatedSiteName', v)} className="sm:col-span-2" />
          )}
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="block text-[11.5px] font-medium" style={{ color: 'var(--ink-mute)' }}>Ã­ÂÂÃ«ÂªÂ©Ã«ÂªÂ©Ã«Â¡Â (Ã­ÂÂÃ«ÂªÂ©ÃªÂµÂ° ÃÂ· Ã­ÂÂÃ«ÂªÂ©Ã«ÂªÂ ÃÂ· Ã­ÂÂÃ«ÂªÂ©Ã«ÂÂ±ÃªÂ¸Â)</span>
            {canEdit && <button type="button" onClick={addProductRow} className="inline-flex items-center gap-1 text-[11.5px] font-medium" style={{ color: 'var(--moss)' }}><Plus size={12} /> Ã­ÂÂÃ«ÂªÂ© Ã¬Â¶ÂÃªÂ°Â</button>}
          </div>
          {(form.products || []).length === 0 ? (
            <div className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>Ã«ÂÂ±Ã«Â¡ÂÃ«ÂÂ Ã­ÂÂÃ«ÂªÂ©Ã¬ÂÂ´ Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤.</div>
          ) : (
            <div className="space-y-2">
              {form.products.map((p, idx) => (
                <div key={p.id} className="grid grid-cols-[1.4fr_1.1fr_0.9fr_auto] gap-2 items-end">
                  <div className="relative">
                    {idx === 0 && <span className="block text-[10.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>Ã­ÂÂÃ«ÂªÂ©Ã«ÂªÂ (ÃªÂ²ÂÃ¬ÂÂ)</span>}
                    <input className="input-base" style={{ padding: '0.4rem 0.6rem', fontSize: 12.5 }}
                      value={p.name}
                      onChange={(v) => { setProductField(p.id, 'name', v.target.value); setPnOpenId(p.id) }}
                      onFocus={() => setPnOpenId(p.id)}
                      onBlur={() => { autoFillGroup(p.id, p.name); setTimeout(() => setPnOpenId((cur) => (cur === p.id ? null : cur)), 150) }}
                      placeholder="Ã¬ÂÂ: ÃªÂ¸ÂÃ¬ÂÂÃ¬Â ÂÃ¬ÂÂ¸ÃªÂ³ÂµÃªÂ³Â ÃªÂ´ÂÃ¬Â Â Ã¢ÂÂ Ã¬ÂÂÃ«Â Â¥ Ã«ÂÂÃ«ÂÂ ÃªÂ¸Â°Ã¬Â¡Â´ Ã­ÂÂÃ«ÂªÂ© ÃªÂ²ÂÃ¬ÂÂ (Ã­ÂÂÃ«ÂªÂ©ÃªÂµÂ° Ã¬ÂÂÃ«ÂÂ Ã¬ÂÂÃ¬ÂÂ±)"
                      disabled={!canEdit} />
                    {pnOpenId === p.id && p.name && (() => {
                      const q = p.name.toLowerCase()
                      const hits = knownProducts.filter((kp) => kp.name.toLowerCase().includes(q) && kp.name !== p.name).slice(0, 8)
                      if (hits.length === 0) return null
                      return (
                        <div className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-auto bg-white border border-slate-200 rounded-lg shadow-lg divide-y divide-slate-100">
                          {hits.map((kp) => (
                            <button key={kp.name} type="button"
                              onMouseDown={() => {
                                setForm((f) => ({ ...f, products: (f.products || []).map((row) => (row.id === p.id ? { ...row, name: kp.name, group: kp.group || row.group, grade: kp.grade || row.grade } : row)) }))
                                setPnOpenId(null)
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-emerald-50 text-[12px] text-slate-800">
                              {kp.name} <span className="text-slate-400">ÃÂ· {kp.group || 'Ã­ÂÂÃ«ÂªÂ©ÃªÂµÂ° Ã«Â¯Â¸Ã¬Â§ÂÃ¬Â Â'} ÃÂ· {kp.grade || 'Ã«ÂÂ±ÃªÂ¸Â Ã«Â¯Â¸Ã¬Â§ÂÃ¬Â Â'}</span>
                            </button>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                  <Field label={idx === 0 ? 'Ã­ÂÂÃ«ÂªÂ©ÃªÂµÂ°' : ''} value={p.group} onChange={(v) => setProductField(p.id, 'group', v)} placeholder="Ã¬ÂÂ: Ã¬Â ÂÃ­ÂÂÃ¬ÂÂ© Ã¬ÂÂÃ­ÂÂÃ«ÂÂÃ­ÂÂ¸" />
                  <SelectField label={idx === 0 ? 'Ã­ÂÂÃ«ÂªÂ©Ã«ÂÂ±ÃªÂ¸Â' : ''} value={p.grade} onChange={(v) => setProductField(p.id, 'grade', v)} options={['1Ã«ÂÂ±ÃªÂ¸Â', '2Ã«ÂÂ±ÃªÂ¸Â', '3Ã«ÂÂ±ÃªÂ¸Â', '4Ã«ÂÂ±ÃªÂ¸Â']} />
                  {canEdit ? (
                    <button type="button" onClick={() => removeProductRow(p.id)} className="mb-1.5" style={{ color: 'var(--rust, #c0392b)' }}><Trash2 size={14} /></button>
                  ) : <span />}
                </div>
              ))}
            </div>
          )}
        </div>
        <TextAreaField label="Ã«Â¹ÂÃªÂ³Â " value={form.notes} onChange={(v) => setF('notes', v)} className="mt-3" />

        <div className="mt-3">
          <div className="text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>Ã¬ÂÂÃ¬ÂÂ¤ÃªÂ°ÂÃ¬ÂÂ (Ã­ÂÂÃ«Â©Â´Ã«ÂÂÃÂ·Ã¬ÂÂ¥Ã«Â¹ÂÃ«ÂªÂ©Ã«Â¡Â)</div>
          {form.facilityFileId ? (
            <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-[11.5px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
              <button type="button" onClick={() => openFile(form.facilityFileId)} className="inline-flex items-center gap-1 hover:underline"><Download size={11} /> {form.facilityFileName || 'Ã¬Â²Â¨Ã«Â¶ÂÃ­ÂÂÃ¬ÂÂ¼'}</button>
              {canEdit && <button type="button" onClick={removeFacilityFile} className="opacity-50 hover:opacity-100"><X size={11} /></button>}
            </span>
          ) : canEdit ? (
            <FileAttachButton onPick={attachFacilityFile} label="Ã¬ÂÂÃ¬ÂÂ¤ÃªÂ°ÂÃ¬ÂÂ Ã­ÂÂÃ¬ÂÂ¼ Ã¬Â²Â¨Ã«Â¶Â (5MB Ã¬ÂÂ´Ã­ÂÂ)" />
          ) : (
            <span className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>Ã¬Â²Â¨Ã«Â¶Â Ã­ÂÂÃ¬ÂÂ¼ Ã¬ÂÂÃ¬ÂÂ</span>
          )}
        </div>

        <div className="mt-3">
          <div className="text-[11.5px] font-medium mb-2" style={{ color: 'var(--ink-mute)' }}>
            ÃªÂµÂ¬Ã«Â¹Â Ã¬ÂÂÃ«Â¥Â (Ã¬ÂÂÃ«Â£ÂÃªÂ¸Â°ÃªÂ¸Â° Ã¬Â ÂÃ­ÂÂ©Ã¬ÂÂ±Ã¬ÂÂ¸Ã¬Â ÂÃ«ÂÂ± Ã¬ÂÂ¬Ã¬ÂÂ¬ Ã¬ÂÂ Ã¬Â²Â­Ã¬ÂÂ ÃÂ· Ã¬Â Â7Ã¬Â¡Â°Ã¬Â Â1Ã­ÂÂ­Ã¬Â Â2Ã­ÂÂ¸ Ã¬ÂÂÃ¬ÂÂ ÃªÂ¸Â°Ã¬Â¤Â)
          </div>
          <div className="space-y-2">
            {FOREIGN_DOC_SLOTS.map((slot) => {
              const files = (form.docSlotFiles || {})[slot.key] || []
              return (
                <div key={slot.key} className="rounded-lg px-2.5 py-2" style={{ background: 'var(--bg-soft)' }}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11.5px]" style={{ color: files.length ? 'var(--ink)' : 'var(--ink-mute)' }}>
                      {files.length > 0 && <span style={{ color: 'var(--moss)' }}>Ã¢ÂÂ </span>}
                      {slot.label}
                    </span>
                    {canEdit && <FileAttachButton onPick={(f) => attachSlotFile(slot.key, f)} label="Ã¬Â²Â¨Ã«Â¶Â" />}
                  </div>
                  {files.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {files.map((f) => (
                        <span key={f.id} className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-[11px]" style={{ background: 'var(--bg-card)', color: 'var(--ink-soft)', border: '1px solid var(--line)' }}>
                          <button type="button" onClick={() => openFile(f.fileId)} className="inline-flex items-center gap-1 hover:underline"><Download size={10} /> {f.fileName}</button>
                          {canEdit && <button type="button" onClick={() => removeSlotFile(slot.key, f.id)} className="opacity-50 hover:opacity-100"><X size={10} /></button>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {canEdit && (
          <div className="flex justify-end mt-3">
            <button onClick={save} disabled={!dirty} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: 12.5 }}><Save size={13} /> Ã«Â³ÂÃªÂ²Â½Ã¬ÂÂ¬Ã­ÂÂ­ Ã¬Â ÂÃ¬ÂÂ¥</button>
          </div>
        )}
      </div>

      {missing.length > 0 && (
        <div className="card-base p-3.5" style={{ background: 'var(--amber-soft)' }}>
          <div className="flex items-start gap-2">
            <AlertTriangle size={15} style={{ color: 'var(--amber)' }} className="shrink-0 mt-0.5" />
            <div className="text-[12px]" style={{ color: 'var(--ink)' }}>
              Ã¬ÂÂÃ¬Â§Â Ã«ÂÂ±Ã«Â¡ÂÃ«ÂÂÃ¬Â§Â Ã¬ÂÂÃ¬ÂÂ Ã­ÂÂÃ¬ÂÂ Ã­ÂÂ­Ã«ÂªÂ©: <b>{missing.join(', ')}</b>
            </div>
          </div>
        </div>
      )}

      <GmpCertificatesCard siteId={site.id} canEdit={canEdit} onAction={onAction} />
      <OtherAuditReportsCard siteId={site.id} canEdit={canEdit} onAction={onAction} />
      <InspectionScheduleCard siteId={site.id} canEdit={canEdit} />
    </div>
  )
}

/* ================================================================
   GMP Ã¬Â ÂÃ­ÂÂ©Ã¬ÂÂ¸Ã¬Â ÂÃ¬ÂÂ (Ã¬Â ÂÃ¬Â¡Â°Ã¬ÂÂÃ«ÂÂ¹ NÃªÂ±Â´)
   ================================================================ */
const EMPTY_CERT = { certNo: '', issuedDate: '', expiryDate: '', notes: '' }

function GmpCertificatesCard({ siteId, canEdit, onAction }) {
  const [list, setList] = useState(() => gmpCertificates.getForSite(siteId))
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY_CERT)
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const [busyId, setBusyId] = useState(null)

  const add = () => {
    if (!requirePermission('importgmp.cert.edit')) return
    if (!form.expiryDate) { alert('Ã¬ÂÂ Ã­ÂÂ¨ÃªÂ¸Â°Ã­ÂÂÃ¬ÂÂ Ã¬ÂÂÃ«Â Â¥Ã­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ.'); return }
    gmpCertificates.add(siteId, form)
    setList(gmpCertificates.getForSite(siteId))
    setForm(EMPTY_CERT)
    setAdding(false)
    onAction('GMP Ã¬Â ÂÃ­ÂÂ©Ã¬ÂÂ¸Ã¬Â ÂÃ¬ÂÂÃªÂ°Â Ã«ÂÂ±Ã«Â¡ÂÃ«ÂÂÃ¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤.')
  }

  const del = (id) => {
    if (!requirePermission('importgmp.cert.edit')) return
    if (!window.confirm('Ã¬ÂÂ´ GMP Ã¬Â ÂÃ­ÂÂ©Ã¬ÂÂ¸Ã¬Â ÂÃ¬ÂÂÃ«Â¥Â¼ Ã¬ÂÂ­Ã¬Â ÂÃ­ÂÂ ÃªÂ¹ÂÃ¬ÂÂ?')) return
    gmpCertificates.delete(id)
    setList(gmpCertificates.getForSite(siteId))
  }

  const attach = async (id, file) => {
    if (!requirePermission('importgmp.cert.edit')) return
    setBusyId(id)
    try {
      const fileId = await fileStore.saveFile(file)
      gmpCertificates.update(id, { fileId, fileName: file.name })
      setList(gmpCertificates.getForSite(siteId))
    } finally {
      setBusyId(null)
    }
  }
  const openFile = async (fileId) => {
    const url = await fileStore.getObjectURL(fileId)
    if (!url) { window.alert('Ã­ÂÂÃ¬ÂÂ¼Ã¬ÂÂ Ã¬Â°Â¾Ã¬ÂÂ Ã¬ÂÂ Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤.'); return }
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  }

  return (
    <div className="card-base p-4">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck size={14} style={{ color: 'var(--moss)' }} />
        <div className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>GMP Ã¬Â ÂÃ­ÂÂ©Ã¬ÂÂ¸Ã¬Â ÂÃ¬ÂÂ ({list.length}ÃªÂ±Â´)</div>
      </div>
      <div className="text-[11.5px] mb-3" style={{ color: 'var(--ink-mute)' }}>Ã¬ÂÂ Ã­ÂÂ¨ÃªÂ¸Â°ÃªÂ°Â 3Ã«ÂÂ Ã¢ÂÂ Ã«Â§ÂÃ«Â£ÂÃ¬ÂÂ¼ 90Ã¬ÂÂ¼ Ã¬Â ÂÃªÂ¹ÂÃ¬Â§Â Ã¬Â ÂÃªÂ¸Â°ÃªÂ°Â±Ã¬ÂÂ Ã¬ÂÂ¬Ã¬ÂÂ¬Ã«Â¥Â¼ Ã¬ÂÂ Ã¬Â²Â­Ã­ÂÂ´Ã¬ÂÂ¼ Ã­ÂÂ©Ã«ÂÂÃ«ÂÂ¤.</div>

      {canEdit && !adding && (
        <button onClick={() => setAdding(true)} className="btn-ghost text-[12px] mb-2"><Plus size={12} /> Ã¬Â ÂÃ­ÂÂ©Ã¬ÂÂ¸Ã¬Â ÂÃ¬ÂÂ Ã«ÂÂ±Ã«Â¡Â</button>
      )}
      {adding && (
        <div className="rounded-lg p-3 mb-3" style={{ background: 'var(--bg-soft)' }}>
          <div className="grid sm:grid-cols-3 gap-2">
            <Field label="Ã¬ÂÂ¸Ã¬Â ÂÃ¬ÂÂ Ã«Â²ÂÃ­ÂÂ¸" value={form.certNo} onChange={(v) => setF('certNo', v)} />
            <Field label="Ã«Â°ÂÃªÂ¸ÂÃ¬ÂÂ¼" type="date" value={form.issuedDate} onChange={(v) => setF('issuedDate', v)} />
            <Field label="Ã¬ÂÂ Ã­ÂÂ¨ÃªÂ¸Â°Ã­ÂÂ" type="date" value={form.expiryDate} onChange={(v) => setF('expiryDate', v)} />
          </div>
          <TextAreaField label="Ã«Â¹ÂÃªÂ³Â " value={form.notes} onChange={(v) => setF('notes', v)} className="mt-2" />
          <div className="flex gap-2 mt-2">
            <button onClick={add} className="btn-primary text-[12.5px]" style={{ padding: '0.45rem 0.9rem' }}>Ã¬Â ÂÃ¬ÂÂ¥</button>
            <button onClick={() => { setAdding(false); setForm(EMPTY_CERT) }} className="btn-ghost text-[12.5px]">Ã¬Â·Â¨Ã¬ÂÂ</button>
          </div>
        </div>
      )}

      {list.length === 0 && !adding && <div className="text-[12px] text-center py-4" style={{ color: 'var(--ink-faint)' }}>Ã«ÂÂ±Ã«Â¡ÂÃ«ÂÂ GMP Ã¬Â ÂÃ­ÂÂ©Ã¬ÂÂ¸Ã¬Â ÂÃ¬ÂÂÃªÂ°Â Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤.</div>}

      <div className="space-y-2">
        {list.map((c) => {
          const st = certStatusOf(c.expiryDate)
          const tone = st === 'Ã«Â§ÂÃ«Â£Â' ? 'rose' : st === 'Ã«Â§ÂÃ«Â£ÂÃ¬ÂÂÃ«Â°Â' ? 'amber' : st === 'Ã¬ÂÂ Ã­ÂÂ¨' ? 'emerald' : 'slate'
          return (
            <div key={c.id} className="p-3 rounded-lg border" style={{ borderColor: 'var(--line)' }}>
              <div className="flex items-center justify-between">
                <div className="text-[12.5px]" style={{ color: 'var(--ink)' }}>
                  <b>{c.certNo || '(Ã«Â²ÂÃ­ÂÂ¸ Ã«Â¯Â¸Ã¬ÂÂÃ«Â Â¥)'}</b> ÃÂ· Ã«Â°ÂÃªÂ¸Â {c.issuedDate || 'Ã¢ÂÂ'} ÃÂ· Ã«Â§ÂÃ«Â£Â {c.expiryDate || 'Ã¢ÂÂ'} {st && <Badge text={st} tone={tone} />}
                </div>
                {canEdit && <button onClick={() => del(c.id)} className="text-slate-300 hover:text-rose-600"><Trash2 size={14} /></button>}
              </div>
              {c.notes && <div className="text-[12px] mt-1" style={{ color: 'var(--ink-mute)' }}>{c.notes}</div>}
              <div className="mt-1.5">
                {c.fileId ? (
                  <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-[11.5px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
                    <button type="button" onClick={() => openFile(c.fileId)} className="inline-flex items-center gap-1 hover:underline"><Download size={11} /> {c.fileName || 'Ã¬Â²Â¨Ã«Â¶ÂÃ­ÂÂÃ¬ÂÂ¼'}</button>
                  </span>
                ) : canEdit ? (
                  <FileAttachButton busy={busyId === c.id} onPick={(f) => attach(c.id, f)} label="Ã¬ÂÂ¸Ã¬Â ÂÃ¬ÂÂ Ã­ÂÂÃ¬ÂÂ¼ Ã¬Â²Â¨Ã«Â¶Â" />
                ) : (
                  <span className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>Ã¬Â²Â¨Ã«Â¶Â Ã­ÂÂÃ¬ÂÂ¼ Ã¬ÂÂÃ¬ÂÂ</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ================================================================
   Ã­ÂÂ Ã¬ÂÂ¸Ã¬Â¦ÂÃªÂ¸Â°ÃªÂ´Â Ã¬ÂÂ¤Ã¬ÂÂ¬Ã¬ÂÂÃ«Â£Â (Ã¬Â ÂÃ¬Â¡Â°Ã¬ÂÂÃ«ÂÂ¹ NÃªÂ±Â´)
   ================================================================ */
cons
const EMPTY_INSP = { scheduledDate: '', conductedDate: '', inspector: '', result: '', findings: '', action: '', notes: '' }

function InspectionScheduleCard({ siteId, canEdit }) {
  const [list, setList] = useState(() => inspectionSchedules.getForSite(siteId))
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_INSP)
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const reload = () => setList(inspectionSchedules.getForSite(siteId))

  const save = () => {
    if (!form.scheduledDate) return
    if (editId) { inspectionSchedules.update(editId, form) }
    else { inspectionSchedules.add(siteId, form) }
    reload(); setAdding(false); setEditId(null); setForm(EMPTY_INSP)
  }

  const del = (id) => { inspectionSchedules.delete(id); reload() }

  const openEdit = (rec) => { setForm({ ...rec }); setEditId(rec.id); setAdding(true) }

  const RESULT_OPTS = ['', 'Ã¬Â ÂÃ­ÂÂ©', 'Ã«Â¶ÂÃ¬Â ÂÃ­ÂÂ©', 'Ã¬Â¡Â°ÃªÂ±Â´Ã«Â¶ÂÃ¬Â ÂÃ­ÂÂ©', 'Ã¬ÂÂÃ¬Â Â']

  return (
    <div className="mt-6 rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13.5px] font-bold" style={{ color: 'var(--ink)' }}>Ã¬ÂÂ¤Ã­ÂÂÃ¬Â¡Â°Ã¬ÂÂ¬ Ã¬ÂÂ¼Ã¬Â Â</h3>
        {canEdit && !adding && (
          <button onClick={() => { setAdding(true); setEditId(null); setForm(EMPTY_INSP) }}
            className="flex items-center gap-1 text-[12px] px-2.5 py-1 rounded-lg font-semibold"
            style={{ background: 'var(--brand)', color: 'white', border: 'none', cursor: 'pointer' }}>
            <Plus size={12} />Ã¬ÂÂ¼Ã¬Â Â Ã¬Â¶ÂÃªÂ°Â
          </button>
        )}
      </div>

      {adding && (
        <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--bg-soft)', border: '1px solid var(--border)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <Field label="Ã¬ÂÂÃ¬Â ÂÃ¬ÂÂ¼ *" value={form.scheduledDate} onChange={(v) => setF('scheduledDate', v)} type="date" />
            <Field label="Ã¬ÂÂ¤Ã¬ÂÂÃ¬ÂÂ¼" value={form.conductedDate} onChange={(v) => setF('conductedDate', v)} type="date" />
            <Field label="Ã¬ÂÂ¤Ã­ÂÂÃ¬Â¡Â°Ã¬ÂÂ¬Ã¬ÂÂ" value={form.inspector} onChange={(v) => setF('inspector', v)} placeholder="Ã«ÂÂ´Ã«ÂÂ¹Ã¬ÂÂ Ã¬ÂÂ´Ã«Â¦Â" />
            <div>
              <label className="block text-[11.5px] font-semibold mb-1" style={{ color: 'var(--ink-mute)' }}>ÃªÂ²Â°ÃªÂ³Â¼</label>
              <select value={form.result} onChange={(e) => setF('result', e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-[12.5px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--ink)' }}>
                {RESULT_OPTS.map(o => <option key={o} value={o}>{o || 'Ã¬ÂÂ Ã­ÂÂ'}</option>)}
              </select>
            </div>
          </div>
          <TextAreaField label="Ã¬Â§ÂÃ¬Â ÂÃ¬ÂÂ¬Ã­ÂÂ­" value={form.findings} onChange={(v) => setF('findings', v)} rows={2} />
          <TextAreaField label="Ã¬ÂÂÃ¬Â ÂÃ¬Â¡Â°Ã¬Â¹Â" value={form.action} onChange={(v) => setF('action', v)} rows={2} />
          <TextAreaField label="Ã«Â¹ÂÃªÂ³Â " value={form.notes} onChange={(v) => setF('notes', v)} rows={1} />
          <div className="flex gap-2 mt-3">
            <button onClick={() => { setAdding(false); setEditId(null); setForm(EMPTY_INSP) }}
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold"
              style={{ background: 'var(--bg-card)', color: 'var(--ink-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}>Ã¬Â·Â¨Ã¬ÂÂ</button>
            <button onClick={save}
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold"
              style={{ background: 'var(--brand)', color: 'white', border: 'none', cursor: 'pointer' }}>{editId ? 'Ã¬ÂÂÃ¬Â Â' : 'Ã¬Â ÂÃ¬ÂÂ¥'}</button>
          </div>
        </div>
      )}

      {list.length === 0 && !adding ? (
        <p className="text-[12px] py-4 text-center" style={{ color: 'var(--ink-faint)' }}>Ã«ÂÂ±Ã«Â¡ÂÃ«ÂÂ Ã¬ÂÂ¤Ã­ÂÂÃ¬Â¡Â°Ã¬ÂÂ¬ Ã¬ÂÂ¼Ã¬Â ÂÃ¬ÂÂ´ Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤.</p>
      ) : (
        <div className="space-y-2">
          {list.map(rec => {
            const resultColor = rec.result === 'Ã¬Â ÂÃ­ÂÂ©' ? '#065f46' : rec.result === 'Ã«Â¶ÂÃ¬Â ÂÃ­ÂÂ©' ? '#991b1b' : '#92400e'
            const resultBg = rec.result === 'Ã¬Â ÂÃ­ÂÂ©' ? '#d1fae5' : rec.result === 'Ã«Â¶ÂÃ¬Â ÂÃ­ÂÂ©' ? '#fee2e2' : '#fef3c7'
            return (
              <div key={rec.id} className="flex items-start justify-between gap-3 px-4 py-3 rounded-xl" style={{ background: 'var(--bg-soft)', border: '1px solid var(--border)' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[12.5px] font-semibold" style={{ color: 'var(--ink)' }}>{rec.scheduledDate || 'Ã¬ÂÂ¼Ã¬Â Â Ã«Â¯Â¸Ã¬Â Â'}</span>
                    {rec.conductedDate && <span className="text-[11.5px]" style={{ color: 'var(--ink-mute)' }}>Ã¬ÂÂ¤Ã¬ÂÂ: {rec.conductedDate}</span>}
                    {rec.result && <span className="text-[10.5px] px-2 py-0.5 rounded-full font-medium" style={{ background: resultBg, color: resultColor }}>{rec.result}</span>}
                  </div>
                  {rec.inspector && <p className="text-[11.5px]" style={{ color: 'var(--ink-mute)' }}>Ã¬Â¡Â°Ã¬ÂÂ¬Ã¬ÂÂ: {rec.inspector}</p>}
                  {rec.findings && <p className="text-[11.5px] mt-1" style={{ color: 'var(--ink-soft)' }}>Ã¬Â§ÂÃ¬Â Â: {rec.findings}</p>}
                </div>
                {canEdit && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(rec)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mute)', padding: '4px' }}><Edit3 size={13} /></button>
                    <button onClick={() => del(rec.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', padding: '4px' }}><Trash2 size={13} /></button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const EMPTY_REPORT = { issuer: '', certType: 'CE', auditDate: '', expiryDate: '', notes: '' }

function OtherAuditReportsCard({ siteId, canEdit, onAction }) {
  const [list, setList] = useState(() => otherAuditReports.getForSite(siteId))
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY_REPORT)
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const [busyId, setBusyId] = useState(null)

  const add = () => {
    if (!requirePermission('importgmp.cert.edit')) return
    if (!form.issuer.trim()) { alert('Ã¬ÂÂ¸Ã¬Â¦ÂÃªÂ¸Â°ÃªÂ´ÂÃ«ÂªÂÃ¬ÂÂ Ã¬ÂÂÃ«Â Â¥Ã­ÂÂÃ¬ÂÂ¸Ã¬ÂÂ.'); return }
    otherAuditReports.add(siteId, form)
    setList(otherAuditReports.getForSite(siteId))
    setForm(EMPTY_REPORT)
    setAdding(false)
    onAction('Ã¬ÂÂ¤Ã¬ÂÂ¬Ã¬ÂÂÃ«Â£ÂÃªÂ°Â Ã«ÂÂ±Ã«Â¡ÂÃ«ÂÂÃ¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤.')
  }

  const del = (id) => {
    if (!requirePermission('importgmp.cert.edit')) return
    if (!window.confirm('Ã¬ÂÂ´ Ã¬ÂÂ¤Ã¬ÂÂ¬Ã¬ÂÂÃ«Â£ÂÃ«Â¥Â¼ Ã¬ÂÂ­Ã¬Â ÂÃ­ÂÂ ÃªÂ¹ÂÃ¬ÂÂ?')) return
    otherAuditReports.delete(id)
    setList(otherAuditReports.getForSite(siteId))
  }

  const attach = async (id, file) => {
    if (!requirePermission('importgmp.cert.edit')) return
    setBusyId(id)
    try {
      const fileId = await fileStore.saveFile(file)
      otherAuditReports.update(id, { resultFileId: fileId, resultFileName: file.name })
      setList(otherAuditReports.getForSite(siteId))
    } finally {
      setBusyId(null)
    }
  }
  const openFile = async (fileId) => {
    const url = await fileStore.getObjectURL(fileId)
    if (!url) { window.alert('Ã­ÂÂÃ¬ÂÂ¼Ã¬ÂÂ Ã¬Â°Â¾Ã¬ÂÂ Ã¬ÂÂ Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤.'); return }
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  }

  return (
    <div className="card-base p-4">
      <div className="flex items-center gap-2 mb-1">
        <FileSearch size={14} style={{ color: 'var(--moss)' }} />
        <div className="text-[13.5px] font-semibold" style={{ color: 'var(--ink)' }}>Ã­ÂÂ Ã¬ÂÂ¸Ã¬Â¦ÂÃªÂ¸Â°ÃªÂ´Â Ã¬ÂÂ¤Ã¬ÂÂ¬Ã¬ÂÂÃ«Â£Â ({list.length}ÃªÂ±Â´)</div>
      </div>
      <div className="text-[11.5px] mb-3" style={{ color: 'var(--ink-mute)' }}>Ã¬ÂµÂÃªÂ·Â¼ 3Ã«ÂÂ Ã¬ÂÂ´Ã«ÂÂ´ Ã«ÂÂ¤Ã«Â¥Â¸ Ã­ÂÂÃ¬Â§ÂÃ¬ÂÂÃ¬ÂÂ¤Ã­ÂÂ Ã¬ÂÂ¸Ã¬Â¦ÂÃªÂ¸Â°ÃªÂ´ÂÃ¬ÂÂ¼Ã«Â¡ÂÃ«Â¶ÂÃ­ÂÂ° Ã«Â°ÂÃ¬ÂÂ Ã¬ÂÂ¤Ã¬ÂÂ¬ ÃªÂ²Â°ÃªÂ³Â¼ÃªÂ°Â Ã¬ÂÂÃ«ÂÂ ÃªÂ²Â½Ã¬ÂÂ° Ã«ÂÂ±Ã«Â¡ÂÃ­ÂÂ©Ã«ÂÂÃ«ÂÂ¤. (Ã¬ÂÂ Ã­ÂÂ)</div>

      {canEdit && !adding && (
        <button onClick={() => setAdding(true)} className="btn-ghost text-[12px] mb-2"><Plus size={12} /> Ã¬ÂÂ¤Ã¬ÂÂ¬Ã¬ÂÂÃ«Â£Â Ã«ÂÂ±Ã«Â¡Â</button>
      )}
      {adding && (
        <div className="rounded-lg p-3 mb-3" style={{ background: 'var(--bg-soft)' }}>
          <div className="grid sm:grid-cols-2 gap-2">
            <Field label="Ã¬ÂÂ¸Ã¬Â¦ÂÃªÂ¸Â°ÃªÂ´Â" value={form.issuer} onChange={(v) => setF('issuer', v)} placeholder="Ã¬ÂÂ: TÃÂV SÃÂD" />
            <SelectField label="Ã¬ÂÂ¸Ã¬Â¦Â Ã¬Â¢ÂÃ«Â¥Â" value={form.certType} onChange={(v) => setF('certType', v)}
              options={[{v:'CE',l:'CE Ã¬ÂÂ¸Ã¬Â¦Â'}, {v:'FDA',l:'FDA 510(k)/PMA'}, {v:'ISO',l:'ISO 13485'}, {v:'ÃªÂ¸Â°Ã­ÂÂ',l:'ÃªÂ¸Â°Ã­ÂÂ'}]} />
          </div>
          <div className="grid sm:grid-cols-2 gap-2 mt-2">
            <Field label="Ã¬ÂÂ¬Ã¬ÂÂ¬Ã¬ÂÂ¼" type="date" value={form.auditDate} onChange={(v) => setF('auditDate', v)} />
            <Field label="Ã«Â§ÂÃ«Â£ÂÃ¬ÂÂ¼" type="date" value={form.expiryDate} onChange={(v) => setF('expiryDate', v)} />
          </div>
          <TextAreaField label="Ã«Â¹ÂÃªÂ³Â " value={form.notes} onChange={(v) => setF('notes', v)} className="mt-2" />
          <div className="flex gap-2 mt-2">
            <button onClick={add} className="btn-primary text-[12.5px]" style={{ padding: '0.45rem 0.9rem' }}>Ã¬Â ÂÃ¬ÂÂ¥</button>
            <button onClick={() => { setAdding(false); setForm(EMPTY_REPORT) }} className="btn-ghost text-[12.5px]">Ã¬Â·Â¨Ã¬ÂÂ</button>
          </div>
        </div>
      )}

      {list.length === 0 && !adding && <div className="text-[12px] text-center py-4" style={{ color: 'var(--ink-faint)' }}>Ã«ÂÂ±Ã«Â¡ÂÃ«ÂÂ Ã¬ÂÂ¤Ã¬ÂÂ¬Ã¬ÂÂÃ«Â£ÂÃªÂ°Â Ã¬ÂÂÃ¬ÂÂµÃ«ÂÂÃ«ÂÂ¤.</div>}

      <div className="space-y-2">
        {list.map((r) => (
          <div key={r.id} className="p-3 rounded-lg border" style={{ borderColor: 'var(--line)' }}>
            <div className="flex items-center justify-between">
              <div className="text-[12.5px]" style={{ color: 'var(--ink)' }}>
                <b>{r.issuer}</b> ÃÂ· {r.auditType || 'Ã¬ÂÂ Ã­ÂÂ Ã«Â¯Â¸Ã¬ÂÂÃ«Â Â¥'} ÃÂ· {r.auditDate || 'Ã«ÂÂ Ã¬Â§Â Ã«Â¯Â¸Ã¬ÂÂÃ«Â Â¥'}
              </div>
              {canEdit && <button onClick={() => del(r.id)} className="text-slate-300 hover:text-rose-600"><Trash2 size={14} /></button>}
            </div>
            {r.notes && <div className="text-[12px] mt-1" style={{ color: 'var(--ink-mute)' }}>{r.notes}</div>}
            <div className="mt-1.5">
              {r.resultFileId ? (
                <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-[11.5px]" style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)' }}>
                  <button type="button" onClick={() => openFile(r.resultFileId)} className="inline-flex items-center gap-1 hover:underline"><Download size={11} /> {r.resultFileName || 'Ã¬Â²Â¨Ã«Â¶ÂÃ­ÂÂÃ¬ÂÂ¼'}</button>
                </span>
              ) : canEdit ? (
                <FileAttachButton busy={busyId === r.id} onPick={(f) => attach(r.id, f)} label="Ã¬ÂÂ¤Ã¬ÂÂ¬Ã«Â³Â´ÃªÂ³Â Ã¬ÂÂ Ã­ÂÂÃ¬ÂÂ¼ Ã¬Â²Â¨Ã«Â¶Â" />
              ) : (
                <span className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>Ã¬Â²Â¨Ã«Â¶Â Ã­ÂÂÃ¬ÂÂ¼ Ã¬ÂÂÃ¬ÂÂ</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ================================================================
   ÃªÂ³ÂµÃ­ÂÂµ UI
   ================================================================ */
function FileAttachButton({ busy, onPick, label }) {
  const ref = useRef(null)
  return (
    <>
      <input ref={ref} type="file" className="hidden" onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) onPick(f) }} />
      <button type="button" onClick={() => ref.current && ref.current.click()} disabled={busy} className="inline-flex items-center gap-1 text-[11.5px] font-medium" style={{ color: 'var(--moss)' }}>
        <Paperclip size={12} /> {busy ? 'Ã¬ÂÂÃ«Â¡ÂÃ«ÂÂ Ã¬Â¤ÂÃ¢ÂÂ¦' : (label || 'Ã­ÂÂÃ¬ÂÂ¼ Ã¬Â²Â¨Ã«Â¶Â (5MB Ã¬ÂÂ´Ã­ÂÂ)')}
      </button>
    </>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>{label}</span>
      <input type={type} className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13 }} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

function SelectField({ label, value, onChange, options, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>{label}</span>
      <select className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13 }} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => {
          const v = typeof o === 'object' ? o.v : o
          const l = typeof o === 'object' ? o.l : o
          return <option key={v} value={v}>{l}</option>
        })}
      </select>
    </label>
  )
}

function TextAreaField({ label, value, onChange, placeholder, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11.5px] font-medium mb-1" style={{ color: 'var(--ink-mute)' }}>{label}</span>
      <textarea className="input-base" style={{ padding: '0.5rem 0.7rem', fontSize: 13, minHeight: 60 }} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}


function EmptyState({ icon: Icon, text }) {
  return (
    <div className="card-base p-8 text-center" style={{ borderStyle: 'dashed' }}>
      <Icon size={28} style={{ color: 'var(--ink-faint)', margin: '0 auto' }} strokeWidth={1.4} />
      <div className="mt-2 text-[13px]" style={{ color: 'var(--ink-mute)' }}>{text}</div>
    </div>
  )
}

function Badge({ text, tone = 'slate' }) {
  const map = {
    emerald: { bg: 'var(--leaf-soft)', fg: 'var(--moss)' },
    amber: { bg: 'var(--amber-soft)', fg: 'var(--amber)' },
    rose: { bg: '#fdecec', fg: '#c0392b' },
    slate: { bg: 'var(--bg-soft)', fg: 'var(--ink-mute)' },
  }
  const c = map[tone] || map.slate
  return <span className="text-[10.5px] px-1.5 py-0.5 rounded font-semibold ml-1.5" style={{ background: c.bg, color: c.fg }}>{text}</span>
}
