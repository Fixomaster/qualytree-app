// src/pages/quality_dashboard/QualityDashboard.jsx
// ISO 13485 §8.4 데이터 분석 — 전 허브 통합 품질 KPI 대시보드
import React, { useState, useMemo } from 'react'
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  XCircle, Clock, BarChart2, FileText, RefreshCw,
  Shield, Thermometer, Package, Microscope, FlaskConical,
  Users, Activity, ChevronRight, ExternalLink,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'
import { getMergedEnvLogs } from '../../lib/envMonitoring'

// ── localStorage 읽기 ─────────────────────────────────────────
function lsR(k) { try { return JSON.parse(localStorage.getItem(k) || '[]') } catch { return [] } }

function loadAllData() {
  return {
    ncrs:         lsR('qualytree.ncrs'),
    capas:        lsR('qualytree.capas'),
    complaints:   lsR('qualytree.complaints'),
    risks:        lsR('qualytree.risks'),
    calibrations: lsR('qualytree.calibrations'),
    suppliers:    lsR('qualytree.suppliers'),
    supplierEvals:lsR('qualytree.supplier_evals'),
    iqc:          lsR('qualytree.iqc'),
    inspections:  lsR('qualytree.inspections'),
    changes:      lsR('qualytree.changes'),
    envLogs:      getMergedEnvLogs(), // 생산(청결·오염관리) 실측 + 과거 이력 병합 — 작업환경관리와 동일 SSoT
    validations:  lsR('qualytree.validations'),
    distributions:lsR('qualytree.distributions'),
    improvements: lsR('qualytree.improvements'),
    audits:       lsR('qualytree.audits'),
  }
}

// 날짜 유틸
function daysDiff(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
}
function thisMonthFilter(items, dateField) {
  const ym = new Date().toISOString().slice(0, 7)
  return items.filter(i => (i[dateField] || i.createdAt || '').startsWith(ym))
}
function last6Months() {
  const result = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    result.push(d.toISOString().slice(0, 7))
  }
  return result
}

// ── 메인 ─────────────────────────────────────────────────────
export default function QualityDashboard() {
  const user = auth.current()
  const navigate = useNavigate()
  const [refreshKey, setRefreshKey] = useState(0)
  const data = useMemo(() => loadAllData(), [refreshKey])

  // ── KPI 계산 ─────────────────────────────────────────────
  const kpis = useMemo(() => {
    const d = data
    const months = last6Months()

    // NCR
    const openNcrs     = d.ncrs.filter(n => !['closed','cancelled'].includes(n.status))
    const overdueNcrs  = d.ncrs.filter(n => n.dueDate && daysDiff(n.dueDate) < 0 && !['closed','cancelled'].includes(n.status))
    const ncrThisMonth = thisMonthFilter(d.ncrs, 'detectedDate').length

    // CAPA
    const openCapas    = d.capas.filter(c => !['closed','cancelled'].includes(c.status))
    const overdueCapas = d.capas.filter(c => c.dueDate && daysDiff(c.dueDate) < 0 && !['closed','cancelled'].includes(c.status))
    const capaCloseRate = d.capas.length ? Math.round((d.capas.filter(c => c.status === 'closed').length / d.capas.length) * 100) : null

    // 고객불만
    const openComplaints  = d.complaints.filter(c => !['closed','rejected'].includes(c.status))
    const mdrUnreported   = d.complaints.filter(c => c.mdrRequired && !c.mdrReportDate)
    const criticalComplaints = d.complaints.filter(c => c.severity === 'critical' && !['closed','rejected'].includes(c.status))

    // 검사
    const inspTotal = d.inspections.length
    const inspPass  = d.inspections.filter(i => i.verdict === 'pass').length
    const inspPassRate = inspTotal ? Math.round((inspPass / inspTotal) * 100) : null
    const inspFails = d.inspections.filter(i => i.verdict === 'fail' && !i.ncrId)

    // 교정
    const calOverdue = d.calibrations.filter(c => c.nextCalDate && daysDiff(c.nextCalDate) < 0 && c.status !== 'retired')
    const calDue30   = d.calibrations.filter(c => c.nextCalDate && daysDiff(c.nextCalDate) >= 0 && daysDiff(c.nextCalDate) <= 30 && c.status !== 'retired')

    // 위험관리
    const highRisks   = d.risks.filter(r => (r.severity * r.probability) >= 15 && !r.verified)
    const riskMitigated = d.risks.length ? Math.round((d.risks.filter(r => r.verified).length / d.risks.length) * 100) : null

    // 공급업체
    const dRatedSup   = d.suppliers.filter(s => s.grade === 'D')
    const avgGrade    = (() => {
      const gradeMap = { A: 4, B: 3, C: 2, D: 1 }
      const rated = d.suppliers.filter(s => s.grade)
      if (!rated.length) return null
      const avg = rated.reduce((sum, s) => sum + (gradeMap[s.grade] || 0), 0) / rated.length
      return ['D','C','B','A'][Math.round(avg) - 1] || null
    })()

    // 환경 이탈
    const envDevTotal = d.envLogs.filter(l => (l.deviations || []).length > 0)
    const envDevNoNcr = envDevTotal.filter(l => !l.ncrId)
    const envDeviRate = d.envLogs.length ? Math.round((envDevTotal.length / d.envLogs.length) * 100) : null

    // 밸리데이션
    const revalOverdue = d.validations.filter(v => v.nextRevalDate && daysDiff(v.nextRevalDate) < 0)
    const revalDue90   = d.validations.filter(v => v.nextRevalDate && daysDiff(v.nextRevalDate) >= 0 && daysDiff(v.nextRevalDate) <= 90)

    // 변경 관리
    const pendingChanges = d.changes.filter(c => c.status === 'review').length
    const regChanges     = d.changes.filter(c => c.impactItems?.regulatory && !['completed','cancelled'].includes(c.status))

    // 월별 NCR 추이
    const ncrByMonth = months.map(m => ({
      month: m,
      count: d.ncrs.filter(n => (n.detectedDate || n.createdAt || '').startsWith(m)).length,
    }))

    // 월별 검사 합격률
    const inspByMonth = months.map(m => {
      const list = d.inspections.filter(i => (i.inspDate || i.createdAt || '').startsWith(m))
      const pass  = list.filter(i => i.verdict === 'pass').length
      return { month: m, total: list.length, pass, rate: list.length ? Math.round((pass / list.length) * 100) : null }
    })

    // 개선활동
    const openImprovements = d.improvements.filter(i => !['closed','cancelled'].includes(i.status)).length

    return {
      openNcrs, overdueNcrs, ncrThisMonth,
      openCapas, overdueCapas, capaCloseRate,
      openComplaints, mdrUnreported, criticalComplaints,
      inspTotal, inspPassRate, inspFails,
      calOverdue, calDue30,
      highRisks, riskMitigated,
      dRatedSup, avgGrade,
      envDevTotal, envDevNoNcr, envDeviRate,
      revalOverdue, revalDue90,
      pendingChanges, regChanges,
      ncrByMonth, inspByMonth,
      openImprovements,
    }
  }, [data])

  // 전체 알림 수
  const totalAlerts = kpis.overdueNcrs.length + kpis.mdrUnreported.length + kpis.criticalComplaints.length
    + kpis.calOverdue.length + kpis.revalOverdue.length + kpis.envDevNoNcr.length
    + kpis.dRatedSup.length + kpis.inspFails.length

  return (
    <AppLayout user={user} title="품질 KPI 대시보드" subtitle="ISO 13485 §8.4 데이터 분석 · 전 허브 통합 현황">
      <div className="px-6 lg:px-8 py-6 max-w-[1400px] mx-auto">

        {/* 헤더 액션 */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            {totalAlerts > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}>
                <AlertTriangle size={13} style={{ color: '#DC2626' }} />
                <span className="text-[12.5px] font-bold" style={{ color: '#991B1B' }}>즉시 조치 필요 {totalAlerts}건</span>
              </div>
            )}
          </div>
          <button onClick={() => setRefreshKey(k => k + 1)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink-faint)', cursor: 'pointer' }}>
            <RefreshCw size={12} /> 새로고침
          </button>
        </div>

        {/* ── 섹션 1: 핵심 품질 지표 (상단 그리드) ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <KpiCard
            title="검사 합격률" value={kpis.inspPassRate !== null ? `${kpis.inspPassRate}%` : '-'}
            sub={`전체 ${data.inspections.length}건`}
            status={kpis.inspPassRate === null ? 'neutral' : kpis.inspPassRate >= 95 ? 'good' : kpis.inspPassRate >= 80 ? 'warn' : 'bad'}
            icon={Microscope} href="/inspection" navigate={navigate}
          />
          <KpiCard
            title="CAPA 완료율" value={kpis.capaCloseRate !== null ? `${kpis.capaCloseRate}%` : '-'}
            sub={`미결 ${kpis.openCapas.length}건`}
            status={kpis.capaCloseRate === null ? 'neutral' : kpis.capaCloseRate >= 80 ? 'good' : kpis.capaCloseRate >= 60 ? 'warn' : 'bad'}
            icon={CheckCircle2} href="/quality" navigate={navigate}
          />
          <KpiCard
            title="위험 저감률" value={kpis.riskMitigated !== null ? `${kpis.riskMitigated}%` : '-'}
            sub={`미조치 고위험 ${kpis.highRisks.length}건`}
            status={kpis.riskMitigated === null ? 'neutral' : kpis.riskMitigated >= 80 ? 'good' : kpis.riskMitigated >= 50 ? 'warn' : 'bad'}
            icon={Shield} href="/risk" navigate={navigate}
          />
          <KpiCard
            title="공급업체 평균등급" value={kpis.avgGrade || '-'}
            sub={`D등급 ${kpis.dRatedSup.length}개사`}
            status={!kpis.avgGrade ? 'neutral' : kpis.dRatedSup.length === 0 && kpis.avgGrade !== 'C' ? 'good' : kpis.dRatedSup.length > 0 ? 'bad' : 'warn'}
            icon={Users} href="/suppliers" navigate={navigate}
          />
        </div>

        {/* ── 섹션 2: 미결 사항 (빨간 카드들) ── */}
        {totalAlerts > 0 && (
          <div className="mb-6">
            <div className="text-[13px] font-bold mb-3" style={{ color: '#DC2626' }}>⚠ 즉시 조치 필요</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {kpis.overdueNcrs.length > 0 && (
                <AlertCard icon={XCircle} color="#DC2626" title={`NCR 기한 초과 ${kpis.overdueNcrs.length}건`}
                  items={kpis.overdueNcrs.slice(0,3).map(n => `${n.id} — ${n.title || n.description?.slice(0,30) || '(제목 없음)'}`)}
                  href="/quality" navigate={navigate} />
              )}
              {kpis.mdrUnreported.length > 0 && (
                <AlertCard icon={AlertTriangle} color="#DC2626" title={`MDR 미보고 ${kpis.mdrUnreported.length}건`}
                  items={kpis.mdrUnreported.slice(0,3).map(c => `${c.id} — ${c.customerName}`)}
                  href="/complaints" navigate={navigate} />
              )}
              {kpis.criticalComplaints.length > 0 && (
                <AlertCard icon={AlertTriangle} color="#DC2626" title={`중대 불만 미결 ${kpis.criticalComplaints.length}건`}
                  items={kpis.criticalComplaints.slice(0,3).map(c => `${c.id} — ${c.productName || '-'}`)}
                  href="/complaints" navigate={navigate} />
              )}
              {kpis.calOverdue.length > 0 && (
                <AlertCard icon={Clock} color="#DC2626" title={`교정 기한 초과 ${kpis.calOverdue.length}건`}
                  items={kpis.calOverdue.slice(0,3).map(c => `${c.assetId || c.id} — ${c.name}`)}
                  href="/calibration" navigate={navigate} />
              )}
              {kpis.revalOverdue.length > 0 && (
                <AlertCard icon={FlaskConical} color="#DC2626" title={`재밸리데이션 초과 ${kpis.revalOverdue.length}건`}
                  items={kpis.revalOverdue.slice(0,3).map(v => `${v.id} — ${v.title}`)}
                  href="/validation" navigate={navigate} />
              )}
              {kpis.envDevNoNcr.length > 0 && (
                <AlertCard icon={Thermometer} color="#D97706" title={`환경 이탈 NCR 미등록 ${kpis.envDevNoNcr.length}건`}
                  items={kpis.envDevNoNcr.slice(0,3).map(l => `${l.id}`)}
                  href="/work-env" navigate={navigate} />
              )}
              {kpis.dRatedSup.length > 0 && (
                <AlertCard icon={Users} color="#D97706" title={`D등급 공급업체 ${kpis.dRatedSup.length}개사`}
                  items={kpis.dRatedSup.slice(0,3).map(s => `${s.name} (${s.category || '-'})`)}
                  href="/suppliers" navigate={navigate} />
              )}
              {kpis.inspFails.length > 0 && (
                <AlertCard icon={Microscope} color="#D97706" title={`불합격 NCR 미등록 ${kpis.inspFails.length}건`}
                  items={kpis.inspFails.slice(0,3).map(i => `${i.id} — ${i.productName}`)}
                  href="/inspection" navigate={navigate} />
              )}
            </div>
          </div>
        )}

        {/* ── 섹션 3: 영역별 현황 카드 ── */}
        <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink)' }}>영역별 품질 현황</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">

          {/* NCR */}
          <HubCard title="NCR · 부적합" icon={XCircle} color="#DC2626" href="/quality" navigate={navigate}>
            <StatRow label="이번 달 발생"    value={kpis.ncrThisMonth}        warn={kpis.ncrThisMonth > 5} />
            <StatRow label="미결 NCR"        value={kpis.openNcrs.length}     warn={kpis.openNcrs.length > 0} />
            <StatRow label="기한 초과"        value={kpis.overdueNcrs.length}  bad={kpis.overdueNcrs.length > 0} />
            <StatRow label="전체"            value={data.ncrs.length} />
          </HubCard>

          {/* CAPA */}
          <HubCard title="CAPA" icon={CheckCircle2} color="#059669" href="/quality" navigate={navigate}>
            <StatRow label="완료율"          value={kpis.capaCloseRate !== null ? `${kpis.capaCloseRate}%` : '-'}
              good={kpis.capaCloseRate !== null && kpis.capaCloseRate >= 80} warn={kpis.capaCloseRate !== null && kpis.capaCloseRate < 60} />
            <StatRow label="미결"            value={kpis.openCapas.length}    warn={kpis.openCapas.length > 3} />
            <StatRow label="기한 초과"        value={kpis.overdueCapas.length} bad={kpis.overdueCapas.length > 0} />
            <StatRow label="전체"            value={data.capas.length} />
          </HubCard>

          {/* 고객불만 */}
          <HubCard title="고객불만" icon={Users} color="#F97316" href="/complaints" navigate={navigate}>
            <StatRow label="미결"            value={kpis.openComplaints.length} warn={kpis.openComplaints.length > 2} />
            <StatRow label="중대 미결"        value={kpis.criticalComplaints.length} bad={kpis.criticalComplaints.length > 0} />
            <StatRow label="MDR 미보고"       value={kpis.mdrUnreported.length} bad={kpis.mdrUnreported.length > 0} />
            <StatRow label="전체"            value={data.complaints.length} />
          </HubCard>

          {/* 검사 */}
          <HubCard title="검사 관리" icon={Microscope} color="#2563EB" href="/inspection" navigate={navigate}>
            <StatRow label="합격률"          value={kpis.inspPassRate !== null ? `${kpis.inspPassRate}%` : '-'}
              good={kpis.inspPassRate !== null && kpis.inspPassRate >= 95} bad={kpis.inspPassRate !== null && kpis.inspPassRate < 80} />
            <StatRow label="불합격 NCR 미등록" value={kpis.inspFails.length} bad={kpis.inspFails.length > 0} />
            <StatRow label="이번 달"         value={thisMonthFilter(data.inspections, 'inspDate').length} />
            <StatRow label="전체"            value={kpis.inspTotal} />
          </HubCard>

          {/* 교정 */}
          <HubCard title="교정 관리" icon={Activity} color="#7C3AED" href="/calibration" navigate={navigate}>
            <StatRow label="기한 초과"        value={kpis.calOverdue.length}  bad={kpis.calOverdue.length > 0} />
            <StatRow label="30일 내 예정"     value={kpis.calDue30.length}    warn={kpis.calDue30.length > 0} />
            <StatRow label="관리 장비"        value={data.calibrations.length} />
          </HubCard>

          {/* 위험관리 */}
          <HubCard title="위험 관리 (FMEA)" icon={Shield} color="#EF4444" href="/risk" navigate={navigate}>
            <StatRow label="저감률"          value={kpis.riskMitigated !== null ? `${kpis.riskMitigated}%` : '-'}
              good={kpis.riskMitigated !== null && kpis.riskMitigated >= 80} />
            <StatRow label="미조치 고위험"    value={kpis.highRisks.length} bad={kpis.highRisks.length > 0} />
            <StatRow label="전체 위험 항목"   value={data.risks.length} />
          </HubCard>

          {/* 환경 모니터링 */}
          <HubCard title="작업환경" icon={Thermometer} color="#06B6D4" href="/work-env" navigate={navigate}>
            <StatRow label="이탈률"          value={kpis.envDeviRate !== null ? `${kpis.envDeviRate}%` : '-'}
              good={kpis.envDeviRate !== null && kpis.envDeviRate === 0} bad={kpis.envDeviRate !== null && kpis.envDeviRate > 10} />
            <StatRow label="이탈 NCR 미등록" value={kpis.envDevNoNcr.length} bad={kpis.envDevNoNcr.length > 0} />
            <StatRow label="전체 측정 기록"   value={data.envLogs.length} />
          </HubCard>

          {/* 변경 관리 */}
          <HubCard title="변경 관리" icon={RefreshCw} color="#8B5CF6" href="/change-control" navigate={navigate}>
            <StatRow label="승인 대기"       value={kpis.pendingChanges}    warn={kpis.pendingChanges > 0} />
            <StatRow label="규제 신고 미처리" value={kpis.regChanges.length} bad={kpis.regChanges.length > 0} />
            <StatRow label="전체"           value={data.changes.length} />
          </HubCard>

          {/* 밸리데이션 */}
          <HubCard title="공정 밸리데이션" icon={FlaskConical} color="#059669" href="/validation" navigate={navigate}>
            <StatRow label="재밸리 기한 초과" value={kpis.revalOverdue.length} bad={kpis.revalOverdue.length > 0} />
            <StatRow label="90일 내 예정"    value={kpis.revalDue90.length}  warn={kpis.revalDue90.length > 0} />
            <StatRow label="유효성 확인 완료" value={data.validations.filter(v => v.status === 'validated').length} />
          </HubCard>
        </div>

        {/* ── 섹션 4: 월별 추이 ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          {/* NCR 월별 발생 */}
          <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>NCR 월별 발생 추이</div>
              <button onClick={() => navigate('/quality')} className="flex items-center gap-1 text-[11px]" style={{ color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer' }}>
                상세 <ChevronRight size={12} />
              </button>
            </div>
            <MonthBarChart data={kpis.ncrByMonth} color="#DC2626" valueKey="count" />
          </div>

          {/* 검사 합격률 월별 */}
          <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>검사 합격률 월별 추이</div>
              <button onClick={() => navigate('/inspection')} className="flex items-center gap-1 text-[11px]" style={{ color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer' }}>
                상세 <ChevronRight size={12} />
              </button>
            </div>
            <MonthBarChart data={kpis.inspByMonth} color="#059669" valueKey="rate" unit="%" emptyLabel="기록 없음" />
          </div>
        </div>

        {/* ── 섹션 5: 빠른 링크 ── */}
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
          <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--ink-soft)' }}>ISO 13485 §8.4 분석 대상 데이터</div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'NCR·CAPA', href: '/quality' },
              { label: '고객불만', href: '/complaints' },
              { label: '공급업체', href: '/suppliers' },
              { label: '검사 기록', href: '/inspection' },
              { label: '교정 관리', href: '/calibration' },
              { label: '위험관리', href: '/risk' },
              { label: '작업환경', href: '/work-env' },
              { label: '변경 관리', href: '/change-control' },
              { label: '밸리데이션', href: '/validation' },
              { label: '추적성', href: '/traceability' },
              { label: '내부감사', href: '/audit' },
              { label: '개선활동', href: '/improvement' },
              { label: '기록 내보내기', href: '/export' },
            ].map(l => (
              <button key={l.href} onClick={() => navigate(l.href)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--ink)', cursor: 'pointer' }}>
                {l.label} <ExternalLink size={10} style={{ color: 'var(--ink-faint)' }} />
              </button>
            ))}
          </div>
          <div className="text-[11.5px] mt-3" style={{ color: 'var(--ink-faint)' }}>
            §8.4 — 데이터 분석: 고객 만족, 제품 요구사항 적합성, 공정·제품 특성, 공급업체 성과에 관한 데이터를 수집·분석하여야 한다
          </div>
        </div>

      </div>
    </AppLayout>
  )
}

// ── 공용 컴포넌트 ─────────────────────────────────────────────

function KpiCard({ title, value, sub, status, icon: Icon, href, navigate }) {
  const colors = {
    good: { bg: '#D1FAE5', val: '#059669', border: '#A7F3D0' },
    warn: { bg: '#FEF3C7', val: '#D97706', border: '#FDE68A' },
    bad:  { bg: '#FEE2E2', val: '#DC2626', border: '#FECACA' },
    neutral: { bg: 'var(--bg-card)', val: 'var(--ink)', border: 'var(--line)' },
  }
  const c = colors[status] || colors.neutral

  return (
    <div className="p-4 rounded-2xl cursor-pointer transition" onClick={() => navigate(href)}
      style={{ background: c.bg, border: `1px solid ${c.border}` }}
      onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
      <div className="flex items-center justify-between mb-2">
        <Icon size={16} style={{ color: c.val }} />
        <ChevronRight size={13} style={{ color: c.val, opacity: 0.5 }} />
      </div>
      <div className="text-[28px] font-bold leading-none" style={{ color: c.val }}>{value}</div>
      <div className="text-[12px] font-bold mt-1" style={{ color: c.val, opacity: 0.8 }}>{title}</div>
      <div className="text-[11px] mt-0.5" style={{ color: c.val, opacity: 0.6 }}>{sub}</div>
    </div>
  )
}

function HubCard({ title, icon: Icon, color, href, navigate, children }) {
  return (
    <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--line)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
            <Icon size={14} style={{ color }} />
          </div>
          <span className="text-[13px] font-bold" style={{ color: 'var(--ink)' }}>{title}</span>
        </div>
        <button onClick={() => navigate(href)} className="flex items-center gap-0.5 text-[11px]"
          style={{ color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer' }}>
          상세 <ChevronRight size={11} />
        </button>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function StatRow({ label, value, good, warn, bad }) {
  const color = bad ? '#DC2626' : warn ? '#D97706' : good ? '#059669' : 'var(--ink)'
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>{label}</span>
      <span className="text-[12px] font-bold" style={{ color }}>{value}</span>
    </div>
  )
}

function AlertCard({ icon: Icon, color, title, items, href, navigate }) {
  return (
    <div className="p-4 rounded-2xl cursor-pointer" onClick={() => navigate(href)}
      style={{ background: color === '#DC2626' ? '#FFF5F5' : '#FFFBEB', border: `1px solid ${color === '#DC2626' ? '#FECACA' : '#FDE68A'}` }}
      onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} style={{ color }} />
        <span className="text-[12.5px] font-bold" style={{ color }}>{title}</span>
      </div>
      <div className="space-y-0.5">
        {items.map((item, i) => (
          <div key={i} className="text-[11px] truncate" style={{ color: '#374151' }}>• {item}</div>
        ))}
      </div>
      <div className="flex items-center gap-1 mt-2 text-[11px]" style={{ color }}>
        바로가기 <ChevronRight size={10} />
      </div>
    </div>
  )
}

function MonthBarChart({ data, color, valueKey, unit = '', emptyLabel = '' }) {
  const maxVal = Math.max(...data.map(d => d[valueKey] || 0), 1)
  return (
    <div className="flex items-end gap-2 h-[100px]">
      {data.map(d => {
        const val = d[valueKey]
        const h = val != null ? Math.max(4, Math.round((val / maxVal) * 88)) : 0
        return (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>
              {val != null ? `${val}${unit}` : '-'}
            </span>
            <div className="w-full rounded-t-md transition-all" style={{ height: `${h}px`, background: val != null ? color : '#E5E7EB', opacity: val != null ? 1 : 0.3 }} />
            <span className="text-[9px]" style={{ color: 'var(--ink-faint)' }}>{d.month.slice(5)}</span>
          </div>
        )
      })}
    </div>
  )
}
