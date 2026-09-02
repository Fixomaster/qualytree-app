// src/App.jsx â v4: ZERO static page imports. Only auth + react-router-dom stay static.
// Every page is lazy+vite-ignore â Vite builds nothing page-level at compile time.
import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { auth } from './lib/auth'
import ErrorBoundary from './components/ErrorBoundary'
import { initCloudSync } from './lib/cloudSync'
import { getCompanyMembership } from './lib/supabase'
import { deptAuth } from './lib/deptAuth'
import CloudSyncIndicator from './components/CloudSyncIndicator'
import { CompanyProfileProvider } from './contexts/CompanyProfileContext'

// ââ ê¸°ì¡´ íì´ì§ (pre-existing) ââââââââââââââââââââââââââââââââââââââ
let Login, Signup, JoinCompany, SignupSuccess, OperatorConsole, PlanAdmin, MemberAdmin, AdminPermissionsHub
let Dashboard, GMPSection, Onboarding
let WorkOrderQueue, EBatchRecord, InspectionStages
let QualityHub, ContainmentHub, QualityTree, ProductsHub, RegulatoryHub, Documents, PreviewHub

try { Login = React.lazy(() => import(/* @vite-ignore */ './pages/Login')) } catch {}
try { Signup = React.lazy(() => import(/* @vite-ignore */ './pages/Signup')) } catch {}
try { JoinCompany = React.lazy(() => import(/* @vite-ignore */ './pages/JoinCompany')) } catch {}
try { SignupSuccess = React.lazy(() => import(/* @vite-ignore */ './pages/SignupSuccess')) } catch {}
try { OperatorConsole= React.lazy(() => import(/* @vite-ignore */ './pages/OperatorConsole')) } catch {}
try { PlanAdmin = React.lazy(() => import(/* @vite-ignore */ './pages/operator/PlanAdmin')) } catch {}
try { MemberAdmin = React.lazy(() => import(/* @vite-ignore */ './pages/manager/MemberAdmin')) } catch {}
try { AdminPermissionsHub = React.lazy(() => import(/* @vite-ignore */ './pages/admin/AdminPermissionsHub')) } catch {}
try { Dashboard = React.lazy(() => import(/* @vite-ignore */ './pages/Dashboard')) } catch {}
try { GMPSection = React.lazy(() => import(/* @vite-ignore */ './pages/section/GMPSection')) } catch {}
try { Onboarding = React.lazy(() => import(/* @vite-ignore */ './pages/onboarding/Onboarding')) } catch {}
try { WorkOrderQueue = React.lazy(() => import(/* @vite-ignore */ './pages/operations/WorkOrderQueue')) } catch {}
try { EBatchRecord = React.lazy(() => import(/* @vite-ignore */ './pages/operations/EBatchRecord')) } catch {}
try { InspectionStages= React.lazy(() => import(/* @vite-ignore */ './pages/operations/InspectionStages')) } catch {}
try { QualityHub = React.lazy(() => import(/* @vite-ignore */ './pages/quality/QualityHub')) } catch {}
try { ContainmentHub = React.lazy(() => import(/* @vite-ignore */ './pages/quality/ContainmentHub')) } catch {}
try { QualityTree = React.lazy(() => import(/* @vite-ignore */ './pages/tree/QualityTree')) } catch {}
try { ProductsHub = React.lazy(() => import(/* @vite-ignore */ './pages/products/ProductsHub')) } catch {}
try { RegulatoryHub = React.lazy(() => import(/* @vite-ignore */ './pages/regulatory/RegulatoryHub')) } catch {}
try { Documents = React.lazy(() => import(/* @vite-ignore */ './pages/Documents')) } catch {}
try { PreviewHub = React.lazy(() => import(/* @vite-ignore */ './pages/PreviewHub')) } catch {}

// ââ ì ê· íë¸ (Tasks #28-#61) ââââââââââââââââââââââââââââââââââââââââ
let AuditHub, ImprovementHub, DeptHome, ProcessFlow, ExportHub
let RiskHub, CalibrationHub, SupplierHub, ComplaintHub, TraceabilityHub, CustomerPropertyHub
let ChangeControlHub, InspectionHub, WorkEnvHub, ValidationHub, QualityDashboard
let DesignHistoryHub, CompetencyHub, ServiceHub, PreservationHub, QualityPlanHub, InventoryHub
let CustomerReqHub, InfrastructureHub, DocControlHub, QualityObjectivesHub, ProductIdHub
let OrgResponsibilityHub, PurchaseVerificationHub, QualityManualHub, DeviceFileHub
let ProductionControlHub, QualityPolicyHub, MeasurementPlanHub, CleanlinessHub, SterileControlHub

try { AuditHub = React.lazy(() => import(/* @vite-ignore */ './pages/audit/AuditHub')) } catch {}
try { ImprovementHub = React.lazy(() => import(/* @vite-ignore */ './pages/improvement/ImprovementHub')) } catch {}
try { DeptHome = React.lazy(() => import(/* @vite-ignore */ './pages/home/DeptHome')) } catch {}
try { ProcessFlow = React.lazy(() => import(/* @vite-ignore */ './pages/flow/ProcessFlow')) } catch {}
try { ExportHub = React.lazy(() => import(/* @vite-ignore */ './pages/export/ExportHub')) } catch {}
try { RiskHub = React.lazy(() => import(/* @vite-ignore */ './pages/risk/RiskHub')) } catch {}
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
try { DeviceFileHub = React.lazy(() => import(/* @vite-ignore */ './pages/device-file/DeviceFileHub')) } catch {}
try { ProductionControlHub = React.lazy(() => import(/* @vite-ignore */ './pages/production-control/ProductionControlHub')) } catch {}
try { QualityPolicyHub = React.lazy(() => import(/* @vite-ignore */ './pages/quality-policy/QualityPolicyHub')) } catch {}
try { MeasurementPlanHub = React.lazy(() => import(/* @vite-ignore */ './pages/measurement-plan/MeasurementPlanHub')) } catch {}
try { CleanlinessHub = React.lazy(() => import(/* @vite-ignore */ './pages/cleanliness/CleanlinessHub')) } catch {}
try { SterileControlHub = React.lazy(() => import(/* @vite-ignore */ './pages/sterile-control/SterileControlHub')) } catch {}

// ââ CEO ì¶ê° íë¸ ââââââââââââââââââââââââââââââââââââââââââââââââââââ
let SalesHub, PurchaseHub, ManufacturingHub, EquipmentHub, DevHub, ManagementReviewHub, TrainingHub
let KgmpHub, ForeignManufacturerHub, Iso13485Hub, GmpApplicationHub, GmpSelfInspectionHub, OemFullHub
let CompanyHub, LogisticsHub, NoticeHub, ResourcePlanHub, QmsOverviewHub, RecordMasterHub
try { SalesHub = React.lazy(() => import(/* @vite-ignore */ './pages/sales/SalesHub')) } catch {}
try { PurchaseHub = React.lazy(() => import(/* @vite-ignore */ './pages/purchase/PurchaseHub')) } catch {}
try { ManufacturingHub = React.lazy(() => import(/* @vite-ignore */ './pages/manufacturing/ManufacturingHub')) } catch {}
try { EquipmentHub = React.lazy(() => import(/* @vite-ignore */ './pages/equipment/EquipmentHub')) } catch {}
try { DevHub = React.lazy(() => import(/* @vite-ignore */ './pages/development/DevHub')) } catch {}
try { ManagementReviewHub = React.lazy(() => import(/* @vite-ignore */ './pages/mreview/ManagementReviewHub')) } catch {}
try { TrainingHub = React.lazy(() => import(/* @vite-ignore */ './pages/training/TrainingHub')) } catch {}
try { KgmpHub = React.lazy(() => import(/* @vite-ignore */ './pages/kgmp/KgmpHub')) } catch {}
try { GmpSelfInspectionHub = React.lazy(() => import(/* @vite-ignore */ './pages/kgmp/GmpSelfInspectionHub')) } catch {}
try { OemFullHub = React.lazy(() => import(/* @vite-ignore */ './pages/oem/OemFullHub')) } catch {}
try { GmpApplicationHub = React.lazy(() => import(/* @vite-ignore */ './pages/gmp-application/GmpApplicationHub')) } catch {}
try { ForeignManufacturerHub = React.lazy(() => import(/* @vite-ignore */ './pages/importgmp/ForeignManufacturerHubFixed')) } catch {}
try { Iso13485Hub = React.lazy(() => import(/* @vite-ignore */ './pages/iso13485/Iso13485Hub')) } catch {}
try { CompanyHub = React.lazy(() => import(/* @vite-ignore */ './pages/company/CompanyHub')) } catch {}
try { LogisticsHub = React.lazy(() => import(/* @vite-ignore */ './pages/logistics/LogisticsHub')) } catch {}
try { NoticeHub = React.lazy(() => import(/* @vite-ignore */ './pages/notices/NoticeHub')) } catch {}
try { ResourcePlanHub = React.lazy(() => import(/* @vite-ignore */ './pages/resource-plan/ResourcePlanHub')) } catch {}
try { QmsOverviewHub = React.lazy(() => import(/* @vite-ignore */ './pages/qms-overview/QmsOverviewHub')) } catch {}
try { RecordMasterHub = React.lazy(() => import(/* @vite-ignore */ './pages/record-master/RecordMasterHub')) } catch {}

// ââ ìì GMP ì ê· íë¸ ââââââââââââââââââââââââââââââââââââââââââââââ
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

// ââ Route guards âââââââââââââââââââââââââââââââââââââââââââââââââââââ
function ProtectedRoute({ children }) {
// #368-371 â localStorage â Supabase ëê¸°í: ë¡ê·¸ì¸ë ì¬ì©ìê° ë³´í¸ë íì´ì§ì
// ì§ìí  ëë§ë¤(1íì±, íì¬ idê° ë°ëì§ ìë í ì¬ì¤í ì ë¨) í´ë¹ íì¬ì company_dataë¥¼
// ëê¸°ííë¤. ì¤í¨í´ë íë©´ì ê¸°ì¡´ì²ë¼ localStorageë§ì¼ë¡ ì ì ëìíë¯ë¡ UIë¥¼ ë§ì§ ìëë¤.
React.useEffect(() => {
  let cancelled = false
  getCompanyMembership().then((m) => {
    console.info('[cloudSync] getCompanyMembership ê²°ê³¼:', m)
    if (!cancelled && m?.company_id) initCloudSync(m.company_id)
    else if (!cancelled) console.warn('[cloudSync] company_id ìì â íì¬ ììì´ íì¸ëì§ ìì ëê¸°í ë¯¸ìì', m)
    // #374 â ì´ ê¸°ê¸°/ë¸ë¼ì°ì ì ìì§ ë¡ì»¬ ë¶ì ì íì´ ìì¼ë©´, ê³ì ì ì ì¥ë ë§ì§ë§ ì íì ì´ì´ë°ëë¤.
    if (!cancelled && m?.last_dept) deptAuth.applyRemoteDept(m.last_dept)
  }).catch((e) => console.warn('[cloudSync] getCompanyMembership ì¤ë¥:', String(e?.message || e)))
  return () => { cancelled = true }
}, [])
if (!auth.isSignedIn()) return <Navigate to="/login" replace />
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
<Route path="/manager/accounts" element={<LazyRoute Component={MemberAdmin} />} />
              <Route path="/admin/permissions" element={<LazyRoute Component={AdminPermissionsHub} />} />
<Route path="/dashboard" element={<ProtectedRoute><LazyRoute Component={Dashboard} /></ProtectedRoute>} />
<Route path="/section/:cardId" element={<ProtectedRoute><LazyRoute Component={GMPSection} /></ProtectedRoute>} />
<Route path="/onboarding" element={<ProtectedRoute><LazyRoute Component={Onboarding} /></ProtectedRoute>} />
{/* #WOì ë¦¬ â ììì§ì í(WorkOrderQueue)ë ë³ë ë ê±°ì ë°ì´í°(operationsState.js)ë¥¼ ì°ë ìì  íë©´.
    íì¬ ì¬ì´ëë©ë´ "ìì°Â·ì ì¡° > ìì° íí©"(ManufacturingHubì ììì§ì(WO) í­)ì´ ì¤ì ë¡ ì°ì´ë íë©´ì´ë¯ë¡
    ì ëª©ë¡ ê²½ë¡ë¡ ë¤ì´ì¤ë©´ í­ì ê·¸ìª½ì¼ë¡ ë³´ë¸ë¤. */}
<Route path="/operations" element={<Navigate to="/manufacturing?tab=wo" replace />} />
<Route path="/operations/:woId/ebr" element={<ProtectedRoute><LazyRoute Component={EBatchRecord} /></ProtectedRoute>} />
<Route path="/operations/:woId/inspection" element={<ProtectedRoute><LazyRoute Component={InspectionStages} /></ProtectedRoute>} />
<Route path="/quality" element={<ProtectedRoute><LazyRoute Component={QualityHub} /></ProtectedRoute>} />
<Route path="/containment" element={<ProtectedRoute><LazyRoute Component={ContainmentHub} /></ProtectedRoute>} />
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
<Route path="/medical-device-file" element={<ProtectedRoute><LazyRoute Component={DeviceFileHub} /></ProtectedRoute>} />
<Route path="/production-control" element={<ProtectedRoute><LazyRoute Component={ProductionControlHub} /></ProtectedRoute>} />
<Route path="/management-commitment" element={<ProtectedRoute><LazyRoute Component={QualityPolicyHub} /></ProtectedRoute>} />
<Route path="/measurement" element={<ProtectedRoute><LazyRoute Component={MeasurementPlanHub} /></ProtectedRoute>} />
<Route path="/cleanliness" element={<ProtectedRoute><LazyRoute Component={CleanlinessHub} /></ProtectedRoute>} />
<Route path="/sterile" element={<ProtectedRoute><LazyRoute Component={SterileControlHub} /></ProtectedRoute>} />

<Route path="/sales/*" element={<ProtectedRoute><LazyRoute Component={SalesHub} /></ProtectedRoute>} />
<Route path="/purchase/*" element={<ProtectedRoute><LazyRoute Component={PurchaseHub} /></ProtectedRoute>} />
<Route path="/manufacturing/*" element={<ProtectedRoute><LazyRoute Component={ManufacturingHub} /></ProtectedRoute>} />
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
<Route path="*" element={<Navigate to="/home" replace />} />
</Routes>
</>
</CompanyProfileProvider>
)
}
