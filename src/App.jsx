// src/App.jsx — v4: ZERO static page imports. Only auth + react-router-dom stay static.
// Every page is lazy+vite-ignore → Vite builds nothing page-level at compile time.
import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { auth } from './lib/auth'
import ErrorBoundary from './components/ErrorBoundary'
import { initCloudSync, subscribeSyncStatus, isSyncReadyFor } from './lib/cloudSync'
import { supabase, getCompanyMembership } from './lib/supabase'
import { deptAuth } from './lib/deptAuth'
import CloudSyncIndicator from './components/CloudSyncIndicator'
import { CompanyProfileProvider } from './contexts/CompanyProfileContext'

// ── 기존 페이지 (pre-existing) ──────────────────────────────────────
let Dashboard, GMPSection, Onboarding
let WorkOrderQueue, EBatchRecord, InspectionStages
let QualityHub, ContainmentHub, DeviationHub, ProcessDiagramHub, QualityTree, ProductsHub, RegulatoryHub, Documents, PreviewHub
let Login, Signup, JoinCompany, SignupSuccess, OperatorConsole, PlanAdmin, MemberAdmin, AdminPermissionsHub, SuperAdminHub
try { Login = React.lazy(() => import(/* @vite-ignore */ './pages/Login')) } catch {}
try { Signup = React.lazy(() => import(/* @vite-ignore */ './pages/Signup')) } catch {}
let TermsOfService, RefundPolicy, PrivacyPolicy, PricingPublic
try { TermsOfService = React.lazy(() => import(/* @vite-ignore */ './pages/legal/TermsOfService')) } catch {}
try { RefundPolicy = React.lazy(() => import(/* @vite-ignore */ './pages/legal/RefundPolicy')) } catch {}
try { PrivacyPolicy = React.lazy(() => import(/* @vite-ignore */ './pages/legal/PrivacyPolicy')) } catch {}
try { PricingPublic = React.lazy(() => import(/* @vite-ignore */ './pages/PricingPublic')) } catch {}
try { JoinCompany = React.lazy(() => import(/* @vite-ignore */ './pages/JoinCompany')) } catch {}
try { SignupSuccess = React.lazy(() => import(/* @vite-ignore */ './pages/SignupSuccess')) } catch {}
try { OperatorConsole= React.lazy(() => import(/* @vite-ignore */ './pages/OperatorConsole')) } catch {}
try { PlanAdmin = React.lazy(() => import(/* @vite-ignore */ './pages/operator/PlanAdmin')) } catch {}
try { MemberAdmin = React.lazy(() => import(/* @vite-ignore */ './pages/manager/MemberAdmin')) } catch {}
try { AdminPermissionsHub = React.lazy(() => import(/* @vite-ignore */ './pages/admin/AdminPermissionsHub')) } catch {}
try { SuperAdminHub = React.lazy(() => import(/* @vite-ignore */ './pages/operator/SuperAdminHub')) } catch {}
try { Dashboard = React.lazy(() => import(/* @vite-ignore */ './pages/Dashboard')) } catch {}
try { GMPSection = React.lazy(() => import(/* @vite-ignore */ './pages/section/GMPSection')) } catch {}
try { Onboarding = React.lazy(() => import(/* @vite-ignore */ './pages/onboarding/Onboarding')) } catch {}
try { WorkOrderQueue = React.lazy(() => import(/* @vite-ignore */ './pages/operations/WorkOrderQueue')) } catch {}
try { EBatchRecord = React.lazy(() => import(/* @vite-ignore */ './pages/operations/EBatchRecord')) } catch {}
try { InspectionStages= React.lazy(() => import(/* @vite-ignore */ './pages/operations/InspectionStages')) } catch {}
try { QualityHub = React.lazy(() => import(/* @vite-ignore */ './pages/quality/QualityHub')) } catch {}
try { ContainmentHub = React.lazy(() => import(/* @vite-ignore */ './pages/quality/ContainmentHub')) } catch {}
try { DeviationHub = React.lazy(() => import(/* @vite-ignore */ './pages/quality/DeviationHub')) } catch {}
try { ProcessDiagramHub = React.lazy(() => import(/* @vite-ignore */ './pages/process-diagram/ProcessDiagramHub')) } catch {}
try { QualityTree = React.lazy(() => import(/* @vite-ignore */ './pages/tree/QualityTree')) } catch {}
try { ProductsHub = React.lazy(() => import(/* @vite-ignore */ './pages/products/ProductsHub')) } catch {}
try { RegulatoryHub = React.lazy(() => import(/* @vite-ignore */ './pages/regulatory/RegulatoryHub')) } catch {}
try { Documents = React.lazy(() => import(/* @vite-ignore */ './pages/Documents')) } catch {}
try { PreviewHub = React.lazy(() => import(/* @vite-ignore */ './pages/PreviewHub')) } catch {}

// ── 신규 허브 (Tasks #28-#61) ────────────────────────────────────────
let AuditHub, ImprovementHub, DeptHome, ProcessFlow, ExportHub
let RiskHub, CalibrationHub, SupplierHub, ComplaintHub, TraceabilityHub, CustomerPropertyHub, EnterpriseRiskHub, ProductStandardHub, SopHub, LabelPackagingHub
let ChangeControlHub, InspectionHub, WorkEnvHub, ValidationHub, QualityDashboard
let DesignHistoryHub, CompetencyHub, ServiceHub, PreservationHub, QualityPlanHub, InventoryHub
let CustomerReqHub, InfrastructureHub, DocControlHub, QualityObjectivesHub, ProductIdHub
let OrgResponsibilityHub, PurchaseVerificationHub, QualityManualHub, DeviceFileHub, DeviceMasterRecordHub
let ProductionControlHub, QualityPolicyHub, MeasurementPlanHub, CleanlinessHub, SterileControlHub

try { AuditHub = React.lazy(() => import(/* @vite-ignore */ './pages/audit/AuditHub')) } catch {}
try { ImprovementHub = React.lazy(() => import(/* @vite-ignore */ './pages/improvement/ImprovementHub')) } catch {}
try { DeptHome = React.lazy(() => import(/* @vite-ignore */ './pages/home/DeptHome')) } catch {}
try { ProcessFlow = React.lazy(() => import(/* @vite-ignore */ './pages/flow/ProcessFlow')) } catch {}
try { ExportHub = React.lazy(() => import(/* @vite-ignore */ './pages/export/ExportHub')) } catch {}
try { RiskHub = React.lazy(() => import(/* @vite-ignore */ './pages/risk/RiskHub')) } catch {}
try { EnterpriseRiskHub = React.lazy(() => import(/* @vite-ignore */ './pages/enterprise-risk/EnterpriseRiskHub')) } catch {}
try { ProductStandardHub = React.lazy(() => import(/* @vite-ignore */ './pages/product-standard/ProductStandardHub')) } catch {}
try { SopHub = React.lazy(() => import(/* @vite-ignore */ './pages/sop/SopHub')) } catch {}
try { LabelPackagingHub = React.lazy(() => import(/* @vite-ignore */ './pages/label-packaging/LabelPackagingHub')) } catch {}
try { CalibrationHub = React.lazy(() => import(/* @vite-ignore */ './pages/calibration/CalibrationHub')) } catch {}
try { SupplierHub = React.lazy(() => import(/* @vite-ignore */ './pages/supplier/SupplierHub')) } catch {}
try { ComplaintHub = React.lazy(() => import(/* @vite-ignore */ './pages/complaint/ComplaintHub')) } catch {}
try { TraceabilityHub = React.lazy(() => import(/* @vite-ignore */ './pages/traceability/TraceabilityHub')) } catch {}
try { CustomerPropertyHub = React.lazy(() => import(/* @vite-ignore */ './pages/customer-property/CustomerPropertyHub')) } catch {}
try { ChangeControlHub = React.lazy(() => import(/* @vite-ignore */ './pages/change/ChangeControlHub')) } catch {}
try { InspectionHub = React.lazy(() => import(/* @vite-ignore */ './pages/inspection/InspectionHub')) } catch {}
try { WorkEnvHub = React.lazy(() => import(/* @vite-ignore */ './pages/workenv/WorkEnvHub')) } catch {}
try { ValidationHub = React.lazy(() => import(/* @vite-ignore */ './pages/validation/ValidationHub')) } catch {}
try { QualityDashboard = React.lazy(() => import(/* @vite-ignore */ './pages/quality-dashboard/QualityDashboard')) } catch {}
try { DesignHistoryHub = React.lazy(() => import(/* @vite-ignore */ './pages/dhf/DesignHistoryHub')) } catch {}
try { CompetencyHub = React.lazy(() => import(/* @vite-ignore */ './pages/competency/CompetencyHub')) } catch {}
try { ServiceHub = React.lazy(() => import(/* @vite-ignore */ './pages/service/ServiceHub')) } catch {}
try { PreservationHub = React.lazy(() => import(/* @vite-ignore */ './pages/preservation/PreservationHub')) } catch {}
try { InventoryHub = React.lazy(() => import(/* @vite-ignore */ './pages/inventory/InventoryHub')) } catch {}
try { QualityPlanHub = React.lazy(() => import(/* @vite-ignore */ './pages/qplan/QualityPlanHub')) } catch {}
try { CustomerReqHub = React.lazy(() => import(/* @vite-ignore */ './pages/customer-req/CustomerReqHub')) } catch {}
try { InfrastructureHub = React.lazy(() => import(/* @vite-ignore */ './pages/infrastructure/InfrastructureHub')) } catch {}
try { DocControlHub = React.lazy(() => import(/* @vite-ignore */ './pages/doc-control/DocControlHub')) } catch {}
try { QualityObjectivesHub = React.lazy(() => import(/* @vite-ignore */ './pages/quality-objectives/QualityObjectivesHub')) } catch {}
try { ProductIdHub = React.lazy(() => import(/* @vite-ignore */ './pages/product-id/ProductIdHub')) } catch {}
try { OrgResponsibilityHub = React.lazy(() => import(/* @vite-ignore */ './pages/org-responsibility/OrgResponsibilityHub')) } catch {}
try { PurchaseVerificationHub = React.lazy(() => import(/* @vite-ignore */ './pages/purchase-verification/PurchaseVerificationHub')) } catch {}
try { QualityManualHub = React.lazy(() => import(/* @vite-ignore */ './pages/quality-manual/QualityManualHub')) } catch {}
let QualityProcedureHub = null
try { QualityProcedureHub = React.lazy(() => import(/* @vite-ignore */ './pages/quality-procedure/QualityProcedureHub')) } catch {}
try { DeviceFileHub = React.lazy(() => import(/* @vite-ignore */ './pages/device-file/DeviceFileHub')) } catch {}
try { DeviceMasterRecordHub = React.lazy(() => import(/* @vite-ignore */ './pages/device-master-record/DeviceMasterRecordHub')) } catch {}
try { ProductionControlHub = React.lazy(() => import(/* @vite-ignore */ './pages/production-control/ProductionControlHub')) } catch {}
try { QualityPolicyHub = React.lazy(() => import(/* @vite-ignore */ './pages/quality-policy/QualityPolicyHub')) } catch {}
try { MeasurementPlanHub = React.lazy(() => import(/* @vite-ignore */ './pages/measurement-plan/MeasurementPlanHub')) } catch {}
try { CleanlinessHub = React.lazy(() => import(/* @vite-ignore */ './pages/cleanliness/CleanlinessHub')) } catch {}
try { SterileControlHub = React.lazy(() => import(/* @vite-ignore */ './pages/sterile-control/SterileControlHub')) } catch {}

// ── CEO 추가 허브 ────────────────────────────────────────────────────
let SalesHub, PurchaseHub, ManufacturingHub, EquipmentHub, DevHub, ManagementReviewHub, TrainingHub
let KgmpHub, ForeignManufacturerHub, Iso13485Hub, GmpApplicationHub, GmpSelfInspectionHub, OemFullHub, OemPartialHub, PrintExportHub, CompanyMasterHub, BackupDRHub
let CompanyHub, LogisticsHub, NoticeHub, ResourcePlanHub, QmsOverviewHub, RecordMasterHub
try { SalesHub = React.lazy(() => import(/* @vite-ignore */ './pages/sales/SalesHub')) } catch {}
try { PurchaseHub = React.lazy(() => import(/* @vite-ignore */ './pages/purchase/PurchaseHub')) } catch {}
try { ManufacturingHub = React.lazy(() => import(/* @vite-ignore */ './pages/manufacturing/ManufacturingHub')) } catch {}
let BatchRecordHub
try { BatchRecordHub = React.lazy(() => import(/* @vite-ignore */ './pages/manufacturing/BatchRecordHub')) } catch {}
try { EquipmentHub = React.lazy(() => import(/* @vite-ignore */ './pages/equipment/EquipmentHub')) } catch {}
try { DevHub = React.lazy(() => import(/* @vite-ignore */ './pages/development/DevHub')) } catch {}
try { ManagementReviewHub = React.lazy(() => import(/* @vite-ignore */ './pages/mreview/ManagementReviewHub')) } catch {}
try { TrainingHub = React.lazy(() => import(/* @vite-ignore */ './pages/training/TrainingHub')) } catch {}
try { KgmpHub = React.lazy(() => import(/* @vite-ignore */ './pages/kgmp/KgmpHub')) } catch {}
try { GmpSelfInspectionHub = React.lazy(() => import(/* @vite-ignore */ './pages/kgmp/GmpSelfInspectionHub')) } catch {}
try { OemFullHub = React.lazy(() => import(/* @vite-ignore */ './pages/oem/OemFullHub')) } catch {}
    try { OemPartialHub = React.lazy(() => import(/* @vite-ignore */ './pages/oem/OemPartialHub')) } catch {}
    try { PrintExportHub = React.lazy(() => import(/* @vite-ignore */ './pages/PrintExportHub')) } catch {}
    try { CompanyMasterHub = React.lazy(() => import(/* @vite-ignore */ './pages/CompanyMasterHub')) } catch {}
    try { BackupDRHub = React.lazy(() => import(/* @vite-ignore */ './pages/BackupDRHub')) } catch {}
try { GmpApplicationHub = React.lazy(() => import(/* @vite-ignore */ './pages/gmp-application/GmpApplicationHub')) } catch {}
try { ForeignManufacturerHub = React.lazy(() => import(/* @vite-ignore */ './pages/importgmp/ForeignManufacturerHubFixed')) } catch {}
try { Iso13485Hub = React.lazy(() => import(/* @vite-ignore */ './pages/iso13485/Iso13485Hub')) } catch {}
try { CompanyHub = React.lazy(() => import(/* @vite-ignore */ './pages/company/CompanyHub')) } catch {}
try { LogisticsHub = React.lazy(() => import(/* @vite-ignore */ './pages/logistics/LogisticsHub')) } catch {}
try { NoticeHub = React.lazy(() => import(/* @vite-ignore */ './pages/notices/NoticeHub')) } catch {}
let GuideHub
try { GuideHub = React.lazy(() => import(/* @vite-ignore */ './pages/guides/GuideHub')) } catch {}
try { ResourcePlanHub = React.lazy(() => import(/* @vite-ignore */ './pages/resource-plan/ResourcePlanHub')) } catch {}
try { QmsOverviewHub = React.lazy(() => import(/* @vite-ignore */ './pages/qms-overview/QmsOverviewHub')) } catch {}
try { RecordMasterHub = React.lazy(() => import(/* @vite-ignore */ './pages/record-master/RecordMasterHub')) } catch {}

// ── 수입 GMP 신규 허브 ──────────────────────────────────────────────
let ImportProductsHub, ImportClearanceHub, ImportManagementStandardHub
try { ImportProductsHub = React.lazy(() => import(/* @vite-ignore */ './pages/importgmp/ImportProductsHub')) } catch {}
try { ImportClearanceHub = React.lazy(() => import(/* @vite-ignore */ './pages/importgmp/ImportClearanceHub')) } catch {}
try { ImportManagementStandardHub = React.lazy(() => import(/* @vite-ignore */ './pages/importgmp/ImportManagementStandardHub')) } catch {}
let PostMarketSafetyHub
let CSVHub
let StabilityHub
try { PostMarketSafetyHub = React.lazy(() => import(/* @vite-ignore */ './pages/postmarket/PostMarketSafetyHub')) } catch {}
try { CSVHub = React.lazy(() => import(/* @vite-ignore */ './pages/csv/CSVHub')) } catch {}
try { StabilityHub = React.lazy(() => import(/* @vite-ignore */ './pages/stability/StabilityHub')) } catch {}
let PaymentHub, PaymentSuccessHub
try { PaymentHub = React.lazy(() => import(/* @vite-ignore */ './pages/billing/PaymentHub')) } catch {}
try { PaymentSuccessHub = React.lazy(() => import(/* @vite-ignore */ './pages/billing/PaymentSuccessHub')) } catch {}

// ── Route guards ─────────────────────────────────────────────────────
// 이번 로그인에서 "소속 회사 없음"으로 확인된 사용자(운영자·가입 대기 등) — 라우트 이동마다 다시 묻지 않도록
let _noCompanyFor = null
// 로그아웃(동기화 리셋) 시 다음 로그인에서 다시 확인하도록 초기화
subscribeSyncStatus((s) => { if (s === 'idle') _noCompanyFor = null })

function _gateTimeout(p, ms) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))])
}

// 지금 바로 화면을 그려도 되는지(이미 이 회사 데이터를 불러왔거나, 동기화 대상이 아닌 사용자)
function _gateReadyNow() {
  const cur = auth.current()
  if (!cur) return true
  if (cur.identityKind === 'demo') return true
  if (_noCompanyFor && _noCompanyFor === (cur.userId || cur.email)) return true
  const cid = cur.company?.id
  return !!cid && !cur._viewingAs && isSyncReadyFor(cid)
}

function ProtectedRoute({ children }) {
// #368-371 — localStorage → Supabase 동기화: 로그인된 사용자가 보호된 페이지에 진입하면
// 해당 회사의 company_data를 먼저 불러온 뒤에 화면을 그린다. 서버 데이터가 도착하기 전에
// 빈 화면이 먼저 그려지면, 그 빈 상태가 저장되면서 서버의 기존 데이터를 덮어써 버린다.
const signedIn = auth.isSignedIn()
const [gate, setGate] = React.useState(() => _gateReadyNow() ? 'ready' : 'loading')
const [attempt, setAttempt] = React.useState(0)
React.useEffect(() => {
  if (!signedIn) return
  if (_gateReadyNow()) { setGate('ready'); return }
  let cancelled = false
  ;(async () => {
    const cur = auth.current()
    // 1) 로그인 세션이 살아 있는지 — 만료된 세션으로 동기화하면 빈 데이터로 보여 덮어쓰기가 생긴다
    let session = null
    try { session = (await _gateTimeout(supabase.auth.getSession(), 15000))?.data?.session || null }
    catch { if (!cancelled) setGate('error'); return }
    if (cancelled) return
    if (!session) {
      console.warn('[cloudSync] 로그인 세션 만료 — 다시 로그인 필요')
      try { await auth.signOut() } catch { /* ignore */ }
      if (!cancelled) setGate('expired')
      return
    }
    // 2) 소속 회사 확인 (일시 오류에 대비해 한 번 더 시도)
    let m = null
    for (let i = 0; i < 2 && !m; i++) {
      try { m = await _gateTimeout(getCompanyMembership(), 15000) } catch { m = null }
      if (cancelled) return
      if (!m && i === 0 && cur?.identityKind === 'company_member') await new Promise((r) => setTimeout(r, 1500))
      else break
    }
    console.info('[cloudSync] getCompanyMembership 결과:', m)
    // #374 — 이 기기/브라우저에 아직 로컬 부서 선택이 없으면, 계정에 저장된 마지막 선택을 이어받는다.
    if (m?.last_dept) deptAuth.applyRemoteDept(m.last_dept)
    if (!m?.company_id) {
      if (cur?.identityKind === 'company_member') {
        // 회사 사용자인데 소속 확인 실패 — 동기화 없이 화면을 열면 입력이 서버에 안 남으므로 막는다
        if (!cancelled) setGate('error')
        return
      }
      console.warn('[cloudSync] 소속 회사 없음 — 동기화 대상 아님', cur?.identityKind)
      _noCompanyFor = cur?.userId || cur?.email || 'x'
      if (!cancelled) setGate('ready')
      return
    }
    const ok = await initCloudSync(m.company_id)
    if (cancelled) return
    setGate(ok ? 'ready' : 'error')
  })()
  return () => { cancelled = true }
}, [signedIn, attempt])
if (!signedIn || gate === 'expired') return <Navigate to="/login" replace />
if (gate === 'loading') {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-faint, #64748b)', fontSize: 14 }}>
      회사 데이터를 불러오는 중입니다…
    </div>
  )
}
if (gate === 'error') {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', fontSize: 14, color: '#334155' }}>
      <div style={{ fontWeight: 700 }}>서버에서 회사 데이터를 불러오지 못했습니다.</div>
      <div style={{ color: '#64748b' }}>저장된 데이터가 덮어써지지 않도록 화면을 잠시 막아 두었습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.</div>
      <button type="button" onClick={() => { setGate('loading'); setAttempt((n) => n + 1) }}
        style={{ marginTop: 4, padding: '8px 18px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>
        다시 시도
      </button>
      <button type="button" onClick={async () => { try { await auth.signOut() } catch { /* ignore */ } window.location.href = '/login' }}
        style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: 13 }}>
        로그아웃
      </button>
    </div>
  )
}
return children
}
function PublicRoute({ children }) {
if (auth.isSignedIn()) return <Navigate to="/home" replace />
return children
}
function LazyRoute({ Component, fallback }) {
if (!Component) return fallback || <Navigate to="/home" replace />
return (
<ErrorBoundary>
<React.Suspense fallback={<div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-faint)' }}>Loading.....</div>}>
<Component />
</React.Suspense>
</ErrorBoundary>
)
}

export default function App() {
return (
<CompanyProfileProvider>
<>
<ErrorBoundary><CloudSyncIndicator /></ErrorBoundary>
<Routes>
<Route path="/" element={<Navigate to="/home" replace />} />
<Route path="/login" element={<PublicRoute><LazyRoute Component={Login} /></PublicRoute>} />
<Route path="/signup" element={<PublicRoute><LazyRoute Component={Signup} /></PublicRoute>} />
<Route path="/join" element={<PublicRoute><LazyRoute Component={JoinCompany} /></PublicRoute>} />
<Route path="/signup/success" element={<PublicRoute><LazyRoute Component={SignupSuccess} /></PublicRoute>} />
<Route path="/operator" element={<LazyRoute Component={OperatorConsole} />} />
<Route path="/operator/plans" element={<LazyRoute Component={PlanAdmin} />} />
      <Route path="/operator/super" element={<LazyRoute Component={SuperAdminHub} />} />
<Route path="/manager/accounts" element={<LazyRoute Component={MemberAdmin} />} />
              <Route path="/admin/permissions" element={<LazyRoute Component={AdminPermissionsHub} />} />
<Route path="/dashboard" element={<Navigate to="/home" replace />} />
<Route path="/section/:cardId" element={<ProtectedRoute><LazyRoute Component={GMPSection} /></ProtectedRoute>} />
<Route path="/onboarding" element={<ProtectedRoute><LazyRoute Component={Onboarding} /></ProtectedRoute>} />
{/* #WO정리 — 작업지시 큐(WorkOrderQueue)는 별도 레거시 데이터(operationsState.js)를 쓰는 예전 화면.
    현재 사이드메뉴 "생산·제조 > 생산 현황"(ManufacturingHub의 작업지시(WO) 탭)이 실제로 쓰이는 화면이므로
    옛 목록 경로로 들어오면 항상 그쪽으로 보낸다. */}
<Route path="/operations" element={<Navigate to="/manufacturing?tab=wo" replace />} />
<Route path="/operations/:woId/ebr" element={<ProtectedRoute><LazyRoute Component={EBatchRecord} /></ProtectedRoute>} />
<Route path="/operations/:woId/inspection" element={<ProtectedRoute><LazyRoute Component={InspectionStages} /></ProtectedRoute>} />
<Route path="/quality" element={<ProtectedRoute><LazyRoute Component={QualityHub} /></ProtectedRoute>} />
<Route path="/containment" element={<ProtectedRoute><LazyRoute Component={ContainmentHub} /></ProtectedRoute>} />
<Route path="/deviation" element={<ProtectedRoute><LazyRoute Component={DeviationHub} /></ProtectedRoute>} />
<Route path="/process-diagram" element={<ProtectedRoute><LazyRoute Component={ProcessDiagramHub} /></ProtectedRoute>} />
<Route path="/tree" element={<ProtectedRoute><LazyRoute Component={QualityTree} /></ProtectedRoute>} />
<Route path="/products" element={<ProtectedRoute><LazyRoute Component={ProductsHub} /></ProtectedRoute>} />
<Route path="/regulatory" element={<ProtectedRoute><LazyRoute Component={RegulatoryHub} /></ProtectedRoute>} />
<Route path="/documents" element={<ProtectedRoute><LazyRoute Component={Documents} /></ProtectedRoute>} />
<Route path="/preview" element={<LazyRoute Component={PreviewHub} />} />

<Route path="/home" element={<ProtectedRoute><LazyRoute Component={DeptHome} /></ProtectedRoute>} />
<Route path="/flow" element={<ProtectedRoute><LazyRoute Component={ProcessFlow} /></ProtectedRoute>} />
<Route path="/audit" element={<ProtectedRoute><LazyRoute Component={AuditHub} /></ProtectedRoute>} />
<Route path="/improvement" element={<ProtectedRoute><LazyRoute Component={ImprovementHub} /></ProtectedRoute>} />
<Route path="/export" element={<ProtectedRoute><LazyRoute Component={ExportHub} /></ProtectedRoute>} />
<Route path="/risk" element={<ProtectedRoute><LazyRoute Component={RiskHub} /></ProtectedRoute>} />
              <Route path="/enterprise-risk" element={<ProtectedRoute><LazyRoute Component={EnterpriseRiskHub} /></ProtectedRoute>} />
              <Route path="/product-standard" element={<ProtectedRoute><LazyRoute Component={ProductStandardHub} /></ProtectedRoute>} />
              <Route path="/label-packaging" element={<ProtectedRoute><LazyRoute Component={LabelPackagingHub} /></ProtectedRoute>} />
              <Route path="/sop" element={<ProtectedRoute><LazyRoute Component={SopHub} /></ProtectedRoute>} />
<Route path="/calibration" element={<ProtectedRoute><LazyRoute Component={CalibrationHub} /></ProtectedRoute>} />
<Route path="/supplier" element={<ProtectedRoute><LazyRoute Component={SupplierHub} /></ProtectedRoute>} />
<Route path="/complaints" element={<ProtectedRoute><LazyRoute Component={ComplaintHub} /></ProtectedRoute>} />
<Route path="/traceability" element={<ProtectedRoute><LazyRoute Component={TraceabilityHub} /></ProtectedRoute>} />
<Route path="/customer-property" element={<ProtectedRoute><LazyRoute Component={CustomerPropertyHub} /></ProtectedRoute>} />
<Route path="/change-control" element={<ProtectedRoute><LazyRoute Component={ChangeControlHub} /></ProtectedRoute>} />
<Route path="/inspection" element={<ProtectedRoute><LazyRoute Component={InspectionHub} /></ProtectedRoute>} />
<Route path="/workenv" element={<ProtectedRoute><LazyRoute Component={WorkEnvHub} /></ProtectedRoute>} />
<Route path="/process-validation" element={<ProtectedRoute><LazyRoute Component={ValidationHub} /></ProtectedRoute>} />
<Route path="/kpi-dashboard" element={<ProtectedRoute><LazyRoute Component={QualityDashboard} /></ProtectedRoute>} />
<Route path="/design-history" element={<ProtectedRoute><LazyRoute Component={DesignHistoryHub} /></ProtectedRoute>} />
<Route path="/competency" element={<ProtectedRoute><LazyRoute Component={CompetencyHub} /></ProtectedRoute>} />
<Route path="/service" element={<ProtectedRoute><LazyRoute Component={ServiceHub} /></ProtectedRoute>} />
<Route path="/preservation" element={<ProtectedRoute><LazyRoute Component={PreservationHub} /></ProtectedRoute>} />
<Route path="/inventory" element={<ProtectedRoute><LazyRoute Component={InventoryHub} /></ProtectedRoute>} />
<Route path="/quality-plan" element={<ProtectedRoute><LazyRoute Component={QualityPlanHub} /></ProtectedRoute>} />
<Route path="/customer-req" element={<ProtectedRoute><LazyRoute Component={CustomerReqHub} /></ProtectedRoute>} />
<Route path="/infrastructure" element={<ProtectedRoute><LazyRoute Component={InfrastructureHub} /></ProtectedRoute>} />
<Route path="/document-control" element={<ProtectedRoute><LazyRoute Component={DocControlHub} /></ProtectedRoute>} />
<Route path="/quality-objectives" element={<ProtectedRoute><LazyRoute Component={QualityObjectivesHub} /></ProtectedRoute>} />
<Route path="/org-responsibility" element={<ProtectedRoute><LazyRoute Component={OrgResponsibilityHub} /></ProtectedRoute>} />
<Route path="/purchase-info" element={<ProtectedRoute><LazyRoute Component={PurchaseVerificationHub} /></ProtectedRoute>} />
<Route path="/quality-manual" element={<ProtectedRoute><LazyRoute Component={QualityManualHub} /></ProtectedRoute>} />
<Route path="/quality-procedure" element={<ProtectedRoute><LazyRoute Component={QualityProcedureHub} /></ProtectedRoute>} />
<Route path="/medical-device-file" element={<ProtectedRoute><LazyRoute Component={DeviceFileHub} /></ProtectedRoute>} />
              <Route path="/device-master-record" element={<ProtectedRoute><LazyRoute Component={DeviceMasterRecordHub} /></ProtectedRoute>} />
<Route path="/production-control" element={<ProtectedRoute><LazyRoute Component={ProductionControlHub} /></ProtectedRoute>} />
<Route path="/management-commitment" element={<ProtectedRoute><LazyRoute Component={QualityPolicyHub} /></ProtectedRoute>} />
<Route path="/measurement" element={<ProtectedRoute><LazyRoute Component={MeasurementPlanHub} /></ProtectedRoute>} />
<Route path="/cleanliness" element={<ProtectedRoute><LazyRoute Component={CleanlinessHub} /></ProtectedRoute>} />
<Route path="/sterile" element={<ProtectedRoute><LazyRoute Component={SterileControlHub} /></ProtectedRoute>} />

<Route path="/sales/*" element={<ProtectedRoute><LazyRoute Component={SalesHub} /></ProtectedRoute>} />
<Route path="/purchase/*" element={<ProtectedRoute><LazyRoute Component={PurchaseHub} /></ProtectedRoute>} />
<Route path="/manufacturing/*" element={<ProtectedRoute><LazyRoute Component={ManufacturingHub} /></ProtectedRoute>} />
<Route path="/batch-records" element={<ProtectedRoute><LazyRoute Component={BatchRecordHub} /></ProtectedRoute>} />
<Route path="/equipment/*" element={<ProtectedRoute><LazyRoute Component={EquipmentHub} /></ProtectedRoute>} />
<Route path="/development/*" element={<ProtectedRoute><LazyRoute Component={DevHub} /></ProtectedRoute>} />
<Route path="/management-review/*" element={<ProtectedRoute><LazyRoute Component={ManagementReviewHub} /></ProtectedRoute>} />
<Route path="/training/*" element={<ProtectedRoute><LazyRoute Component={TrainingHub} /></ProtectedRoute>} />
<Route path="/kgmp" element={<ProtectedRoute><LazyRoute Component={KgmpHub} /></ProtectedRoute>} />
<Route path="/gmp-self-inspection" element={<ProtectedRoute><LazyRoute Component={GmpSelfInspectionHub} /></ProtectedRoute>} />
<Route path="/gmp-application" element={<ProtectedRoute><LazyRoute Component={GmpApplicationHub} /></ProtectedRoute>} />
<Route path="/foreign-manufacturers" element={<ProtectedRoute><LazyRoute Component={ForeignManufacturerHub} /></ProtectedRoute>} />
<Route path="/iso13485" element={<ProtectedRoute><LazyRoute Component={Iso13485Hub} /></ProtectedRoute>} />
<Route path="/company" element={<ProtectedRoute><LazyRoute Component={CompanyHub} /></ProtectedRoute>} />
<Route path="/logistics" element={<ProtectedRoute><LazyRoute Component={LogisticsHub} /></ProtectedRoute>} />
<Route path="/notices" element={<ProtectedRoute><LazyRoute Component={NoticeHub} /></ProtectedRoute>} />
<Route path="/guides" element={<ProtectedRoute><LazyRoute Component={GuideHub} /></ProtectedRoute>} />
<Route path="/guides/:slug" element={<ProtectedRoute><LazyRoute Component={GuideHub} /></ProtectedRoute>} />
<Route path="/product-id" element={<ProtectedRoute><LazyRoute Component={ProductIdHub} /></ProtectedRoute>} />
<Route path="/resource-plan" element={<ProtectedRoute><LazyRoute Component={ResourcePlanHub} /></ProtectedRoute>} />
<Route path="/qms-overview" element={<ProtectedRoute><LazyRoute Component={QmsOverviewHub} /></ProtectedRoute>} />
<Route path="/record-master" element={<ProtectedRoute><LazyRoute Component={RecordMasterHub} /></ProtectedRoute>} />
<Route path="/import-products"  element={<ProtectedRoute><LazyRoute Component={ImportProductsHub} /></ProtectedRoute>} />
<Route path="/import-clearance" element={<ProtectedRoute><LazyRoute Component={ImportClearanceHub} /></ProtectedRoute>} />
<Route path="/post-market-safety" element={<ProtectedRoute><LazyRoute Component={PostMarketSafetyHub} /></ProtectedRoute>} />
<Route path="/import-management-standard" element={<ProtectedRoute><LazyRoute Component={ImportManagementStandardHub} /></ProtectedRoute>} />
<Route path="/csv" element={<ProtectedRoute><LazyRoute Component={CSVHub} /></ProtectedRoute>} />
<Route path="/stability" element={<ProtectedRoute><LazyRoute Component={StabilityHub} /></ProtectedRoute>} />

          <Route path="/oem-full" element={<ProtectedRoute><LazyRoute Component={OemFullHub} /></ProtectedRoute>} />
              <Route path="/oem-partial" element={<ProtectedRoute><LazyRoute Component={OemPartialHub} /></ProtectedRoute>} />
              <Route path="/print-export" element={<ProtectedRoute><LazyRoute Component={PrintExportHub} /></ProtectedRoute>} />
              <Route path="/company-master" element={<ProtectedRoute><LazyRoute Component={CompanyMasterHub} /></ProtectedRoute>} />
<Route path="/backup-dr" element={<ProtectedRoute><LazyRoute Component={BackupDRHub} /></ProtectedRoute>} />
              <Route path="/billing" element={<ProtectedRoute><LazyRoute Component={PaymentHub} /></ProtectedRoute>} />
<Route path="/billing/success" element={<ProtectedRoute><LazyRoute Component={PaymentSuccessHub} /></ProtectedRoute>} />
<Route path="/terms" element={<LazyRoute Component={TermsOfService} />} />
<Route path="/refund-policy" element={<LazyRoute Component={RefundPolicy} />} />
<Route path="/privacy" element={<LazyRoute Component={PrivacyPolicy} />} />
<Route path="/pricing" element={<LazyRoute Component={PricingPublic} />} />
<Route path="*" element={<Navigate to="/home" replace />} />
</Routes>
</>
</CompanyProfileProvider>
)
}
