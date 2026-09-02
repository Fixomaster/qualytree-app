import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Factory, ArrowRight, FileDown, FileCheck2, CheckSquare, AlertTriangle, CheckCircle, Clock, Activity, ChevronRight } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'
import { buildKgmpSections, summarizeKgmpSections } from '../../lib/kgmpProgress'
import { buildApprovedDocumentBundleHtml, downloadHtmlAsPdf } from '../../lib/kgmpDocumentBundle'
import KgmpSectionList from '../../components/KgmpSectionList'
import CertGate from '../../components/CertGate'

// ── 알림 체크리스트 데이터 수집 ────────────────────────────────────────
function collectAlerts() {
  const today = new Date()
  const in30 = new Date(today); in30.setDate(in30.getDate() + 30)
  const in60 = new Date(today); in60.setDate(in60.getDate() + 60)
  const alerts = []

  // 교정 만료일
  try {
    const cals = JSON.parse(localStorage.getItem('qualytree.calibration') || '[]')
    cals.forEach(c => {
      if (!c.nextCalDate) return
      const d = new Date(c.nextCalDate)
      if (d < today) alerts.push({ level: 'danger', label: '교정 만료 초과: ' + (c.equipmentName || c.name || '-'), link: '/calibration' })
      else if (d <= in30) alerts.push({ level: 'warning', label: '교정 30일 이내 만료: ' + (c.equipmentName || c.name || '-'), link: '/calibration' })
    })
  } catch {}

  // CAPA 미결
  try {
    const capas = JSON.parse(localStorage.getItem('qualytree.capa') || '[]')
    const open = capas.filter(c => c.status === 'open' || c.status === 'pending' || !c.status)
    if (open.length > 0) alerts.push({ level: 'warning', label: '미완료 CAPA ' + open.length + '건', link: '/improvement' })
  } catch {}

  // 역량 교육 만료
  try {
    const trainings = JSON.parse(localStorage.getItem('qualytree.competency_records') || '[]')
    trainings.forEach(t => {
      if (!t.expiryDate) return
      const d = new Date(t.expiryDate)
      if (d < today) alerts.push({ level: 'danger', label: '교육 만료: ' + (t.name || '-'), link: '/competency' })
      else if (d <= in30) alerts.push({ level: 'warning', label: '교육 30일 이내 만료: ' + (t.name || '-'), link: '/competency' })
    })
  } catch {}

  // 공급업체 평가 만료
  try {
    const suppliers = JSON.parse(localStorage.getItem('qualytree.suppliers') || '[]')
    suppliers.forEach(s => {
      if (!s.nextEvalDate) return
      const d = new Date(s.nextEvalDate)
      if (d < today) alerts.push({ level: 'warning', label: '공급업체 평가 만료: ' + (s.name || '-'), link: '/supplier' })
    })
  } catch {}

  // 부적합/NCR 미결
  try {
    const ncrs = JSON.parse(localStorage.getItem('qualytree.ncr') || '[]')
    const open = ncrs.filter(n => n.status !== 'closed')
    if (open.length > 0) alerts.push({ level: 'warning', label: '미체결 부적합 ' + open.length + '건', link: '/quality' })
  } catch {}

  return alerts
}

// ── 준비도 점수 색상 ──────────────────────────────────────────────────
function scoreColor(pct) {
  if (pct >= 80) return { bar: 'bg-green-500', text: 'text-green-600', badge: 'bg-green-50 border-green-200 text-green-700' }
  if (pct >= 50) return { bar: 'bg-yellow-400', text: 'text-yellow-600', badge: 'bg-yellow-50 border-yellow-200 text-yellow-700' }
  return { bar: 'bg-red-500', text: 'text-red-600', badge: 'bg-red-50 border-red-200 text-red-700' }
}

export default function KgmpHub() {
  const user = auth.getUser()
  const navigate = useNavigate()
  const [alerts, setAlerts] = useState([])
  const [downloading, setDownloading] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const sections = useMemo(() => buildKgmpSections({ user }), [user])
  const { doneCount, totalCount, pct } = useMemo(() => summarizeKgmpSections(sections), [sections])
  const colors = scoreColor(pct)

  useEffect(() => { setAlerts(collectAlerts()) }, [])

  const danger = alerts.filter(a => a.level === 'danger')
  const warning = alerts.filter(a => a.level === 'warning')

  async function handleDownload() {
    setDownloading(true)
    try {
      const html = await buildApprovedDocumentBundleHtml({ user })
      downloadHtmlAsPdf(html, 'kgmp-documents.html')
    } catch (e) { console.error(e) }
    setDownloading(false)
  }

  const QUICK_LINKS = [
    { label: 'CAPA 개선', link: '/improvement', icon: CheckSquare },
    { label: '교정 관리', link: '/calibration', icon: Activity },
    { label: '역량 관리', link: '/competency', icon: CheckCircle },
    { label: '공급업체 평가', link: '/supplier', icon: FileCheck2 },
    { label: '문서 관리', link: '/documents', icon: FileDown },
    { label: '부적합 관리', link: '/quality', icon: AlertTriangle },
  ]

  return (
    <AppLayout user={user} title="KGMP 준비도">
      <HubBanner icon={Factory} title="KGMP 준비도" subtitle="의료기기 KGMP 인증 준비 현황 및 알림" color="#2563EB" />
      <CertGate certId="kgmp">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

          {/* ── 준비도 점수 카드 ── */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-800">KGMP 준비도</h2>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${colors.badge}`}>
                {pct >= 80 ? '양호' : pct >= 50 ? '보통' : '미흡'}
              </span>
            </div>
            <div className="flex items-end gap-3 mb-2">
              <span className={`text-4xl font-bold ${colors.text}`}>{pct}%</span>
              <span className="text-sm text-gray-500 mb-1">{doneCount} / {totalCount} 항목 완료</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div className={`${colors.bar} h-3 rounded-full transition-all duration-500`} style={{ width: pct + '%' }} />
            </div>
          </div>

          {/* ── 알림 체크리스트 ── */}
          {alerts.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h2 className="text-base font-semibold text-gray-800 mb-3">주의 알림</h2>
              <div className="space-y-2">
                {(showAll ? alerts : alerts.slice(0, 5)).map((a, i) => (
                  <button key={i} onClick={() => navigate(a.link)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition ${a.level === 'danger' ? 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100' : 'bg-yellow-50 border border-yellow-200 text-yellow-700 hover:bg-yellow-100'}`}>
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1">{a.label}</span>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </button>
                ))}
              </div>
              {alerts.length > 5 && (
                <button className="mt-2 text-xs text-blue-600 hover:underline" onClick={() => setShowAll(v => !v)}>
                  {showAll ? '접기' : '더 보기 (' + (alerts.length - 5) + '건)'}
                </button>
              )}
            </div>
          )}
          {alerts.length === 0 && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-5 py-3 text-green-700 text-sm">
              <CheckCircle className="w-5 h-5" />
              <span>현재 주의 알림이 없습니다.</span>
            </div>
          )}

          {/* ── 빠른 이동 ── */}
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-3">빠른 이동</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {QUICK_LINKS.map(({ label, link, icon: Icon }) => (
                <button key={link} onClick={() => navigate(link)}
                  className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 hover:border-blue-400 hover:text-blue-600 transition shadow-sm">
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── 문서 다운로드 ── */}
          <div className="flex justify-end">
            <button onClick={handleDownload} disabled={downloading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50">
              <FileDown className="w-4 h-4" />
              {downloading ? '생성 중...' : 'KGMP 문서 번들 다운로드'}
            </button>
          </div>

          {/* ── 섹션 상세 목록 ── */}
          <KgmpSectionList sections={sections} />
        </div>
      </CertGate>
    </AppLayout>
  )
}
