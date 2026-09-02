// src/App.jsx Ã¢ÂÂ v4: ZERO static page imports. Only auth + react-router-dom stay static.
// Every page is lazy+vite-ignore Ã¢ÂÂ Vite builds nothing page-level at compile time.
import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { auth } from './lib/auth'
import ErrorBoundary from './components/ErrorBoundary'
import { initCloudSync } from './lib/cloudSync'
import { getCompanyMembership } from './lib/supabase'
import { deptAuth } from './lib/deptAuth'
import CloudSyncIndicator from './components/CloudSyncIndicator'
import { CompanyProfileProvider } from './contexts/CompanyProfileContext'

// Ã¢ÂÂÃ¢ÂÂ ÃªÂ¸Â°Ã¬Â¡Â´ Ã­ÂÂÃ¬ÂÂ´Ã¬Â§Â (pre-existing) Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
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

// Ã¢ÂÂÃ¢ÂÂ Ã¬ÂÂ ÃªÂ·Â Ã­ÂÂÃ«Â¸Â (Tasks #28-#61) Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
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
try {