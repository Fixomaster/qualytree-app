// src/App.jsx  — v3: all new hubs lazy-loaded so Vite never statically analyzes them
import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Signup from './pages/Signup'
import SignupSuccess from './pages/SignupSuccess'
import OperatorConsole from './pages/OperatorConsole'
import PlanAdmin from './pages/operator/PlanAdmin'
import MemberAdmin from './pages/manager/MemberAdmin'
import Dashboard from './pages/Dashboard'
import GMPSection from './pages/section/GMPSection'
import Onboarding from './pages/onboarding/Onboarding'
import WorkOrderQueue from './pages/operations/WorkOrderQueue'
import EBatchRecord from './pages/operations/EBatchRecord'
import InspectionStages from './pages/operations/InspectionStages'
import QualityHub from './pages/quality/QualityHub'
import QualityTree from './pages/tree/QualityTree'
import ProductsHub from './pages/products/ProductsHub'
import RegulatoryHub from './pages/regulatory/RegulatoryHub'
import Documents from './pages/Documents'
import PreviewHub from './pages/PreviewHub'
import { auth } from './lib/auth'

// Tasks #28-#61 신규 허브 — 전부 lazy+vite-ignore → Vite 정적 분석 없음
let AuditHub, ImprovementHub, DeptHome, ProcessFlow, ExportHub
let RiskHub, CalibrationHub, SupplierHub, ComplaintHub, TraceabilityHub
let ChangeControlHub, InspectionHub, WorkEnvHub, ValidationHub, QualityDashboard
let DesignHistoryHub, CompetencyHub, ServiceHub, PreservationHub, QualityPlanHub
let CustomerReqHub, InfrastructureHub, DocControlHub, QualityObjectivesHub, ProductIdHub
let OrgResponsibilityHub, PurchaseVerificationHub, QualityManualHub, DeviceFileHub
let ProductionControlHub, QualityPolicyHub, MeasurementPlanHub, CleanlinessHub, SterileControlHub

try { AuditHub              = React.lazy(() => import(/* @vite-ignore */ './pages/audit/AuditHub')) } catch {}
try { ImprovementHub        = React.lazy(() => import(/* @vite-ignore */ './pages/improvement/ImprovementHub')) } catch {}
try { DeptHome              = React.lazy(() => import(/* @vite-ignore */ './pages/home/DeptHome')) } catch {}
try { ProcessFlow           = React.lazy(() => import(/* @vite-ignore */ './pages/flow/ProcessFlow')) } catch {}
try { ExportHub             = React.lazy(() => import(/* @vite-ignore */ './pages/export/ExportHub')) } catch {}
try { RiskHub               = React.lazy(() => import(/* @vite-ignore */ './pages/risk/RiskHub')) } catch {}
try { CalibrationHub        = React.lazy(() => import(/* @vite-ignore */ './pages/calibration/CalibrationHub')) } catch {}
try { SupplierHub           = React.lazy(() => import(/* @vite-ignore */ './pages/supplier/SupplierHub')) } catch {}
try { ComplaintHub          = React.lazy(() => import(/* @vite-ignore */ './pages/complaint/ComplaintHub')) } catch {}
try { TraceabilityHub       = React.lazy(() => import(/* @vite-ignore */ './pages/traceability/TraceabilityHub')) } catch {}
try { ChangeControlHub      = React.lazy(() => import(/* @vite-ignore */ './pages/change/ChangeControlHub')) } catch {}
try { InspectionHub         = React.lazy(() => import(/* @vite-ignore */ './pages/inspection/InspectionHub')) } catch {}
try { WorkEnvHub            = React.lazy(() => import(/* @vite-ignore */ './pages/workenv/WorkEnvHub')) } catch {}
try { ValidationHub         = React.lazy(() => import(/* @vite-ignore */ './pages/validation/ValidationHub')) } catch {}
try { QualityDashboard      = React.lazy(() => import(/* @vite-ignore */ './pages/quality-dashboard/QualityDashboard')) } catch {}
try { DesignHistoryHub      = React.lazy(() => import(/* @vite-ignore */ './pages/dhf/DesignHistoryHub')) } catch {}
try { CompetencyHub         = React.lazy(() => import(/* @vite-ignore */ './pages/competency/CompetencyHub')) } catch {}
try { ServiceHub            = React.lazy(() => import(/* @vite-ignore */ './pages/service/ServiceHub')) } catch {}
try { PreservationHub       = React.lazy(() => import(/* @vite-ignore */ './pages/preservation/PreservationHub')) } catch {}
try { QualityPlanHub        = React.lazy(() => import(/* @vite-ignore */ './pages/qplan/QualityPlanHub')) } catch {}
try { CustomerReqHub        = React.lazy(() => import(/* @vite-ignore */ './pages/customer-req/CustomerReqHub')) } catch {}
try { InfrastructureHub     = React.lazy(() => import(/* @vite-ignore */ './pages/infrastructure/InfrastructureHub')) } catch {}
try { DocControlHub         = React.lazy(() => import(/* @vite-ignore */ './pages/doc-control/DocControlHub')) } catch {}
try { QualityObjectivesHub  = React.lazy(() => import(/* @vite-ignore */ './pages/quality-objectives/QualityObjectivesHub')) } catch {}
try { ProductIdHub          = React.lazy(() => import(/* @vite-ignore */ './pages/product-id/ProductIdHub')) } catch {}
try { OrgResponsibilityHub  = React.lazy(() => import(/* @vite-ignore */ './pages/org-responsibility/OrgResponsibilityHub')) } catch {}
try { PurchaseVerificationHub = React.lazy(() => import(/* @vite-ignore */ './pages/purchase-verification/PurchaseVerificationHub')) } catch {}
try { QualityManualHub      = React.lazy(() => import(/* @vite-ignore */ './pages/quality-manual/QualityManualHub')) } catch {}
try { DeviceFileHub         = React.lazy(() => import(/* @vite-ignore */ './pages/device-file/DeviceFileHub')) } catch {}
try { ProductionControlHub  = React.lazy(() => import(/* @vite-ignore */ './pages/production-control/ProductionControlHub')) } catch {}
try { QualityPolicyHub      = React.lazy(() => import(/* @vite-ignore */ './pages/quality-policy/QualityPolicyHub')) } catch {}
try { MeasurementPlanHub    = React.lazy(() => import(/* @vite-ignore */ './pages/measurement-plan/MeasurementPlanHub')) } catch {}
try { CleanlinessHub        = React.lazy(() => import(/* @vite-ignore */ './pages/cleanliness/CleanlinessHub')) } catch {}
try { SterileControlHub     = React.lazy(() => import(/* @vite-ignore */ './pages/sterile-control/SterileControlHub')) } catch {}

// CEO 추가 허브 (없으면 graceful 404)
let SalesHub, PurchaseHub, ManufacturingHub, EquipmentHub, DevHub, ManagementReviewHub, TrainingHub
try { SalesHub            = React.lazy(() => import(/* @vite-ignore */ './pages/sales/SalesHub')) } catch {}
try { PurchaseHub         = React.lazy(() => import(/* @vite-ignore */ './pages/purchase/PurchaseHub')) } catch {}
try { ManufacturingHub    = React.lazy(() => import(/* @vite-ignore */ './pages/manufacturing/ManufacturingHub')) } catch {}
try { EquipmentHub        = React.lazy(() => import(/* @vite-ignore */ './pages/equipment/EquipmentHub')) } catch {}
try { DevHub              = React.lazy(() => import(/* @vite-ignore */ './pages/development/DevHub')) } catch {}
try { ManagementReviewHub = React.lazy(() => import(/* @vite-ignore */ './pages/management/ManagementReviewHub')) } catch {}
try { TrainingHub         = React.lazy(() => import(/* @vite-ignore */ './pages/training/TrainingHub')) } catch {}

function ProtectedRoute({ children }) {
  if (!auth.isSignedIn()) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  if (auth.isSignedIn()) return <Navigate to="/dashboard" replace />
  return children
}

function LazyRoute({ Component, fallback }) {
  if (!Component) return fallback || <Navigate to="/dashboard" replace />
  return (
    <React.Suspense fallback={<div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-faint)' }}>로딩 중...</div>}>
      <Component />
    </React.Suspense>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
      <Route path="/signup/success" element={<PublicRoute><SignupSuccess /></PublicRoute>} />
      <Route path="/operator" element={<OperatorConsole />} />
      <Route path="/operator/plans" element={<PlanAdmin />} />
      <Route path="/manager/accounts" element={<MemberAdmin />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/section/:cardId" element={<ProtectedRoute><GMPSection /></ProtectedRoute>} />
      <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
      <Route path="/operations" element={<ProtectedRoute><WorkOrderQueue /></ProtectedRoute>} />
      <Route path="/operations/:woId/ebr" element={<ProtectedRoute><EBatchRecord /></ProtectedRoute>} />
      <Route path="/operations/:woId/inspection" element={<ProtectedRoute><InspectionStages /></ProtectedRoute>} />
      <Route path="/quality" element={<ProtectedRoute><QualityHub /></ProtectedRoute>} />
      <Route path="/tree" element={<ProtectedRoute><QualityTree /></ProtectedRoute>} />
      <Route path="/products" element={<ProtectedRoute><ProductsHub /></ProtectedRoute>} />
      <Route path="/regulatory" element={<ProtectedRoute><RegulatoryHub /></ProtectedRoute>} />
      <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
      <Route path="/preview" element={<PreviewHub />} />

      <Route path="/home"              element={<ProtectedRoute><LazyRoute Component={DeptHome} /></ProtectedRoute>} />
      <Route path="/flow"              element={<ProtectedRoute><LazyRoute Component={ProcessFlow} /></ProtectedRoute>} />
      <Route path="/audit"             element={<ProtectedRoute><LazyRoute Component={AuditHub} /></ProtectedRoute>} />
      <Route path="/improvement"       element={<ProtectedRoute><LazyRoute Component={ImprovementHub} /></ProtectedRoute>} />
      <Route path="/export"            element={<ProtectedRoute><LazyRoute Component={ExportHub} /></ProtectedRoute>} />
      <Route path="/risk"              element={<ProtectedRoute><LazyRoute Component={RiskHub} /></ProtectedRoute>} />
      <Route path="/calibration"       element={<ProtectedRoute><LazyRoute Component={CalibrationHub} /></ProtectedRoute>} />
      <Route path="/suppliers"         element={<ProtectedRoute><LazyRoute Component={SupplierHub} /></ProtectedRoute>} />
      <Route path="/complaints"        element={<ProtectedRoute><LazyRoute Component={ComplaintHub} /></ProtectedRoute>} />
      <Route path="/traceability"      element={<ProtectedRoute><LazyRoute Component={TraceabilityHub} /></ProtectedRoute>} />
      <Route path="/change-control"    element={<ProtectedRoute><LazyRoute Component={ChangeControlHub} /></ProtectedRoute>} />
      <Route path="/inspection"        element={<ProtectedRoute><LazyRoute Component={InspectionHub} /></ProtectedRoute>} />
      <Route path="/work-env"          element={<ProtectedRoute><LazyRoute Component={WorkEnvHub} /></ProtectedRoute>} />
      <Route path="/validation"        element={<ProtectedRoute><LazyRoute Component={ValidationHub} /></ProtectedRoute>} />
      <Route path="/quality-dashboard" element={<ProtectedRoute><LazyRoute Component={QualityDashboard} /></ProtectedRoute>} />
      <Route path="/dhf"               element={<ProtectedRoute><LazyRoute Component={DesignHistoryHub} /></ProtectedRoute>} />
      <Route path="/competency"        element={<ProtectedRoute><LazyRoute Component={CompetencyHub} /></ProtectedRoute>} />
      <Route path="/service"           element={<ProtectedRoute><LazyRoute Component={ServiceHub} /></ProtectedRoute>} />
      <Route path="/preservation"      element={<ProtectedRoute><LazyRoute Component={PreservationHub} /></ProtectedRoute>} />
      <Route path="/quality-plan"      element={<ProtectedRoute><LazyRoute Component={QualityPlanHub} /></ProtectedRoute>} />
      <Route path="/customer-req"      element={<ProtectedRoute><LazyRoute Component={CustomerReqHub} /></ProtectedRoute>} />
      <Route path="/infrastructure"    element={<ProtectedRoute><LazyRoute Component={InfrastructureHub} /></ProtectedRoute>} />
      <Route path="/doc-control"       element={<ProtectedRoute><LazyRoute Component={DocControlHub} /></ProtectedRoute>} />
      <Route path="/quality-objectives" element={<ProtectedRoute><LazyRoute Component={QualityObjectivesHub} /></ProtectedRoute>} />
      <Route path="/product-id"        element={<ProtectedRoute><LazyRoute Component={ProductIdHub} /></ProtectedRoute>} />
      <Route path="/org-responsibility" element={<ProtectedRoute><LazyRoute Component={OrgResponsibilityHub} /></ProtectedRoute>} />
      <Route path="/purchase-verification" element={<ProtectedRoute><LazyRoute Component={PurchaseVerificationHub} /></ProtectedRoute>} />
      <Route path="/quality-manual"    element={<ProtectedRoute><LazyRoute Component={QualityManualHub} /></ProtectedRoute>} />
      <Route path="/device-file"       element={<ProtectedRoute><LazyRoute Component={DeviceFileHub} /></ProtectedRoute>} />
      <Route path="/production-control" element={<ProtectedRoute><LazyRoute Component={ProductionControlHub} /></ProtectedRoute>} />
      <Route path="/quality-policy"    element={<ProtectedRoute><LazyRoute Component={QualityPolicyHub} /></ProtectedRoute>} />
      <Route path="/measurement-plan"  element={<ProtectedRoute><LazyRoute Component={MeasurementPlanHub} /></ProtectedRoute>} />
      <Route path="/cleanliness"       element={<ProtectedRoute><LazyRoute Component={CleanlinessHub} /></ProtectedRoute>} />
      <Route path="/sterile-control"   element={<ProtectedRoute><LazyRoute Component={SterileControlHub} /></ProtectedRoute>} />

      <Route path="/sales/*"             element={<ProtectedRoute><LazyRoute Component={SalesHub} /></ProtectedRoute>} />
      <Route path="/purchase/*"          element={<ProtectedRoute><LazyRoute Component={PurchaseHub} /></ProtectedRoute>} />
      <Route path="/manufacturing/*"     element={<ProtectedRoute><LazyRoute Component={ManufacturingHub} /></ProtectedRoute>} />
      <Route path="/equipment/*"         element={<ProtectedRoute><LazyRoute Component={EquipmentHub} /></ProtectedRoute>} />
      <Route path="/development/*"       element={<ProtectedRoute><LazyRoute Component={DevHub} /></ProtectedRoute>} />
      <Route path="/management-review/*" element={<ProtectedRoute><LazyRoute Component={ManagementReviewHub} /></ProtectedRoute>} />
      <Route path="/training/*"          element={<ProtectedRoute><LazyRoute Component={TrainingHub} /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
