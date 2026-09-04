import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Factory, ArrowRight, FileDown, FileCheck2, CheckSquare, AlertTriangle,
  Activity, Users, ShieldCheck, ClipboardList, Bell, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import { buildKgmpSections, summarizeKgmpSections } from '../../lib/kgmpProgress'
import { buildApprovedDocumentBundleHtml, downloadHtmlAsPdf } from '../../lib/kgmpDocumentBundle'
import KgmpSectionList from '../../components/KgmpSectionList'
import CertGate from '../../components/CertGate'

// ââ ìë¦¼ ìì§ âââââââââââââââââââââââââââââââââââââââââââââ
function collectAlerts() {
  const alerts = []
  const today = new Date()

  // êµì  ë§ë£ ì²´í¬
  try {
    const cals = JSON.parse(localStorage.getItem('qualytree.calibration') || '[]')
    cals.forEach(c => {
      if (!c.nextDate) return
      const diff = Math.ceil((new Date(c.nextDate) - today) / 86400000)
      const name = c.name || c.instrument || 'êµì ì¥ë¹'
      if (diff < 0) alerts.push({ level: 'danger', category: 'êµì ', message: `[${name}] êµì  ê¸°í ${Math.abs(diff)}ì¼ ì´ê³¼`, link: '/calibration' })
      else if (diff <= 30) alerts.push({ level: 'warning', category: 'êµì ', message: `[${name}] êµì  ê¸°í ${diff}ì¼ ë¨ì`, link: '/calibration' })
    })
  } catch {}

  // CAPA ë¯¸ê²° ì²´í¬
  try {
    const capas = JSON.parse(localStorage.getItem('qualytree.capa') || '[]')
    const open = capas.filter(c => c.status !== 'closed' && c.status !== 'completed')
    if (open.length > 3) alerts.push({ level: 'danger', category: 'CAPA', message: `ë¯¸ê²° CAPA ${open.length}ê±´ ì²ë¦¬ íì`, link: '/improvement' })
    else if (open.length > 0) alerts.push({ level: 'warning', category: 'CAPA', message: `ë¯¸ê²° CAPA ${open.length}ê±´ ì§í ì¤`, link: '/improvement' })
  } catch {}

  // ì­ë êµì¡ ë§ë£ ì²´í¬
  try {
    const recs = JSON.parse(localStorage.getItem('qualytree.competency_records') || '[]')
    recs.forEach(r => {
      if (!r.expiryDate) return
      const diff = Math.ceil((new Date(r.expiryDate) - today) / 86400000)
      const name = r.employeeName || r.name || 'ì§ì'
      if (diff < 0) alerts.push({ level: 'danger', category: 'ì­ë', message: `[${name}] êµì¡ ê¸°í ${Math.abs(diff)}ì¼ ì´ê³¼`, link: '/competency' })
      else if (diff <= 30) alerts.push({ level: 'warning', category: 'ì­ë', message: `[${name}] êµì¡ ë§ë£ ${diff}ì¼ ë¨ì`, link: '/competency' })
    })
  } catch {}

  // ê³µê¸ìì²´ íê° ì²´í¬
  try {
    const sups = JSON.parse(localStorage.getItem('qualytree.suppliers') || '[]')
    const uneval = sups.filter(s => !s.lastEvaluationDate)
    if (uneval.length > 0) alerts.push({ level: 'warning', category: 'ê³µê¸ìì²´', message: `ë¯¸íê° ê³µê¸ìì²´ ${uneval.length}ê°`, link: '/supplier' })
  } catch {}

  // NCR ë¯¸ê²° ì²´í¬
  try {
    const ncrs = JSON.parse(localStorage.getItem('qualytree.ncr') || '[]')
    const open = ncrs.filter(n => n.status !== 'closed')
    if (open.length > 0) alerts.push({ level: 'warning', category: 'NCR', message: `ë¯¸ê²° ë¶ì í© ${open.length}ê±´`, link: '/ncr' })
  } catch {}

  // ìê°ì ê² ê²°ê³¼ ì°ë
  try {
    const siData = JSON.parse(localStorage.getItem('qualytree.gmp_self_inspection_v2') || '{}')
    const sessions = siData.sessions || []
    const latest = sessions[0]
    if (!latest) {
      alerts.push({ level: 'warning', category: 'ìê°ì ê²', message: 'ìê°ì ê² ë¯¸ì¤ì â ì ê² ìì íì', link: '/gmp-self-inspection' })
    } else if (latest.status === 'draft') {
      alerts.push({ level: 'warning', category: 'ìê°ì ê²', message: 'ìê°ì ê² ì§í ì¤ (ë¯¸ìë£)', link: '/gmp-self-inspection' })
    }
  } catch {}

  return alerts
}

function scoreColor(pct) {
  if (pct >= 90) return { bg: '#D1FAE5', text: '#065F46', bar: '#10B981' }
  if (pct >= 70) return { bg: '#FEF3C7', text: '#92400E', bar: '#F59E0B' }
  return { bg: '#FEE2E2', text: '#991B1B', bar: '#EF4444' }
}

function readinessScore(pct, alertCount, dangerCount) {
  let score = pct
  score -= dangerCount * 8
  score -= Math.min(alertCount - dangerCount, 5) * 3
  return Math.max(0, Math.min(100, Math.round(score)))
}

export default function KgmpHub() {
  const user = auth.current ? auth.current() : auth.getUser?.() || null
  const navigate = useNavigate()
  const [alerts, setAlerts] = useState([])
  const [downloading, setDownloading] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [alertExpanded, setAlertExpanded] = useState(true)

  const sections = useMemo(() => buildKgmpSections({ user }), [user])
  const { doneCount, totalCount, pct } = useMemo(() => summarizeKgmpSections(sections), [sections])

  useEffect(() => { setAlerts(collectAlerts()) }, [])

  const danger = alerts.filter(a => a.level === 'danger')
  const warning = alerts.filter(a => a.level === 'warning')
  const readiness = readinessScore(pct, alerts.length, danger.length)
  const rColors = scoreColor(readiness)

  async function handleDownload() {
    setDownloading(true)
    try {
      const html = await buildApprovedDocumentBundleHtml({ user })
      downloadHtmlAsPdf(html, 'kgmp-documents.html')
    } catch (e) { console.error(e) }
    setDownloading(false)
  }

  const QUICK_LINKS = [
    { label: 'CAPA ê´ë¦¬', link: '/improvement', icon: CheckSquare },
    { label: 'êµì  ê´ë¦¬', link: '/calibration', icon: Activity },
    { label: 'ì­ë ê´ë¦¬', link: '/competency', icon: Users },
    { label: 'ìê°ì ê²', link: '/gmp-self-inspection', icon: ClipboardList },
    { label: 'ë´ë¶ì¬ì¬', link: '/audit', icon: FileCheck2 },
    { label: 'ê³µê¸ìì²´', link: '/supplier', icon: Factory },
  ]

  const LEVEL_STYLE = {
    danger: { bg: '#FEF2F2', border: '#FECACA', dot: '#DC2626', label: 'ê¸´ê¸' },
    warning: { bg: '#FFFBEB', border: '#FDE68A', dot: '#D97706', label: 'ì£¼ì' },
  }

  return (
    <AppLayout user={user} title="GMP ëìë³´ë" subtitle="KGMP ì¬ì¬ ì¤ë¹ë ì¢í© íí©">
      <CertGate certId="kgmp">
        <div style={{ padding: '28px 32px', fontFamily: 'inherit' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <Factory size={24} color="#D97706" />
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>KGMP ëìë³´ë</h1>
              <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>GMP ì¬ì¬ ì¤ë¹ë ë° ìë¦¼ ê¸°ë° ì²´í¬ë¦¬ì¤í¸</p>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button onClick={handleDownload} disabled={downloading}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                  background: downloading ? '#9CA3AF' : '#1D4ED8', color: '#fff',
                  border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: downloading ? 'not-allowed' : 'pointer' }}>
                <FileDown size={15} /> {downloading ? 'ìì± ì¤...' : 'ë¬¸ì ë¬¶ì ì¶ë ¥'}
              </button>
            </div>
          </div>

          {/* Readiness Score + Summary Cards */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
            {/* Main readiness gauge */}
            <div style={{ flex: '0 0 200px', background: rColors.bg, border: `1px solid ${rColors.bar}40`,
              borderRadius: 14, padding: '20px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                ì¬ì¬ ì¤ë¹ë
              </div>
              <div style={{ fontSize: 58, fontWeight: 900, color: rColors.bar, lineHeight: 1 }}>{readiness}</div>
              <div style={{ fontSize: 12, color: rColors.text, fontWeight: 700, marginTop: 6 }}>
                {readiness >= 90 ? 'ì¬ì¬ ì¤ë¹ ìë£ â' : readiness >= 70 ? 'ì¤ë¹ ì¤ â ë³´ì íì' : 'ì¤ì ë¯¸ë¹ì¬í­ ìì'}
              </div>
              <div style={{ marginTop: 12, height: 6, background: '#E5E7EB', borderRadius: 3 }}>
                <div style={{ height: '100%', borderRadius: 3, background: rColors.bar,
                  width: readiness + '%', transition: 'width 0.6s' }} />
              </div>
            </div>

            {/* Stat cards */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12 }}>
              {[
                { label: 'GMP ìê±´ ì¶©ì¡±', val: doneCount + '/' + totalCount, sub: Math.round(pct) + '% ìë£', c: '#1D4ED8' },
                { label: 'ê¸´ê¸ ìë¦¼', val: danger.length, sub: danger.length === 0 ? 'ì´ì ìì' : 'ì¦ì ì²ë¦¬ íì', c: danger.length > 0 ? '#DC2626' : '#16A34A' },
                { label: 'ì£¼ì ìë¦¼', val: warning.length, sub: warning.length === 0 ? 'ì´ì ìì' : 'ëª¨ëí°ë§ íì', c: warning.length > 0 ? '#D97706' : '#16A34A' },
                { label: 'ìê°ì ê²', val: (() => { try { const d = JSON.parse(localStorage.getItem('qualytree.gmp_self_inspection_v2')||'{}'); return (d.sessions||[]).length + 'í' } catch { return '0í' } })(), sub: 'ì ê² ì´ë ¥', c: '#6B7280' },
              ].map(({ label, val, sub, c }) => (
                <div key={label} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: c }}>{val}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginTop: 4 }}>{label}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Alert-based Readiness Checklist */}
          {alerts.length > 0 && (
            <div style={{ marginBottom: 24, border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
              <div onClick={() => setAlertExpanded(e => !e)}
                style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', background: '#F9FAFB', cursor: 'pointer' }}>
                <Bell size={16} color="#D97706" style={{ marginRight: 8 }} />
                <span style={{ fontWeight: 700, fontSize: 14 }}>ìë¦¼ ê¸°ë° ì¤ë¹ë ì²´í¬ë¦¬ì¤í¸</span>
                <span style={{ fontSize: 12, color: '#6B7280', marginLeft: 8 }}>({alerts.length}ê±´)</span>
                {danger.length > 0 && (
                  <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: '#DC2626',
                    padding: '2px 8px', background: '#FEE2E2', borderRadius: 10 }}>
                    ê¸´ê¸ {danger.length}ê±´
                  </span>
                )}
                <span style={{ marginLeft: 'auto' }}>{alertExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
              </div>
              {alertExpanded && (
                <div style={{ padding: '8px 0' }}>
                  {[...danger, ...warning].map((alert, i) => {
                    const st = LEVEL_STYLE[alert.level]
                    return (
                      <div key={i} onClick={() => navigate(alert.link)}
                        style={{ display: 'flex', alignItems: 'center', padding: '10px 16px',
                          background: i % 2 === 0 ? '#fff' : '#FAFAFA', cursor: 'pointer',
                          borderTop: i > 0 ? '1px solid #F3F4F6' : 'none' }}
                        onMouseEnter={e => e.currentTarget.style.background = st.bg}
                        onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFAFA'}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: st.dot, marginRight: 12, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: st.dot,
                          padding: '2px 7px', background: st.bg, borderRadius: 8, marginRight: 10, border: `1px solid ${st.border}`, flexShrink: 0 }}>
                          {alert.category}
                        </span>
                        <span style={{ fontSize: 13, color: '#374151', flex: 1 }}>{alert.message}</span>
                        <ArrowRight size={14} color="#9CA3AF" />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {alerts.length === 0 && (
            <div style={{ marginBottom: 24, padding: '14px 20px', background: '#F0FDF4', border: '1px solid #BBF7D0',
              borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShieldCheck size={18} color="#16A34A" />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#15803D' }}>ëª¨ë  GMP ìê±´ì´ ì ì ìíìëë¤.</span>
            </div>
          )}

          {/* Quick Links */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#374151' }}>ë¹ ë¥¸ ì´ë</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
              {QUICK_LINKS.map(({ label, link, icon: Icon }) => {
                const alertCount = alerts.filter(a => a.link === link).length
                const hasDanger = danger.some(a => a.link === link)
                return (
                  <button key={link} onClick={() => navigate(link)}
                    style={{ padding: '14px 12px', background: '#fff', border: '1px solid #E5E7EB',
                      borderRadius: 10, cursor: 'pointer', textAlign: 'center', position: 'relative',
                      transition: 'box-shadow 0.2s', fontFamily: 'inherit' }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                    <Icon size={20} color={hasDanger ? '#DC2626' : '#6B7280'} style={{ margin: '0 auto 6px', display: 'block' }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{label}</span>
                    {alertCount > 0 && (
                      <span style={{ position: 'absolute', top: 6, right: 8, fontSize: 10, fontWeight: 700,
                        background: hasDanger ? '#DC2626' : '#D97706', color: '#fff',
                        borderRadius: 10, padding: '1px 6px' }}>{alertCount}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* GMP Sections */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#374151', margin: 0 }}>GMP ìê±´ ì¹ìë³ íí©</h3>
              <button onClick={() => setShowAll(v => !v)}
                style={{ fontSize: 12, color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                {showAll ? 'ì ê¸°' : 'ì ì²´ ë³´ê¸°'}
              </button>
            </div>
            <KgmpSectionList sections={showAll ? sections : sections.slice(0, 6)} />
            {!showAll && sections.length > 6 && (
              <button onClick={() => setShowAll(true)}
                style={{ width: '100%', padding: '10px', marginTop: 8, background: '#F9FAFB',
                  border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, color: '#6B7280',
                  cursor: 'pointer', fontFamily: 'inherit' }}>
                ëë¨¸ì§ {sections.length - 6}ê° ì¹ì ë³´ê¸°
              </button>
            )}
          </div>

        </div>
      </CertGate>
    </AppLayout>
  )
}