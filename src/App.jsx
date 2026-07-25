// src/App.jsx
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
import AuditHub from './pages/audit/AuditHub'
import ImprovementHub from './pages/improvement/ImprovementHub'
import DeptHome from './pages/home/DeptHome'
import ProcessFlow from './pages/flow/ProcessFlow'
import ExportHub from './pages/export/ExportHub'
import RiskHub from './pages/risk/RiskHub'
import CalibrationHub from './pages/calibration/CalibrationHub'
import SupplierHub from './pages/supplier/SupplierHub'
import ComplaintHub from './pages/complaint/ComplaintHub'
import TraceabilityHub from './pages/traceability/TraceabilityHub'
import ChangeControlHub from './pages/change/ChangeControlHub'
import InspectionHub from './pages/inspection/InspectionHub'
import WorkEnvHub from './pages/workenv/WorkEnvHub'
import ValidationHub from './pages/validation/ValidationHub'
import QualityDashboard from './pages/quality-dashboard/QualityDashboard'
import DesignHistoryHub from './pages/dhf/DesignHistoryHub'
import CompetencyHub from './pages/competency/CompetencyHub'
import ServiceHub from './pages/service/ServiceHub'
import PreservationHub from './pages/preservation/PreservationHub'
import QualityPlanHub from './pages/qplan/QualityPlanHub'
import CustomerReqHub from './pages/customer-req/CustomerReqHub'
import InfrastructureHub from './pages/infrastructure/InfrastructureHub'
import DocControlHub from './pages/doc-control/DocControlHub'
import { auth } from './lib/auth'

// 동적 import로 CEO 추가 허브 로드 (없으면 404 redirect)
let SalesHub, PurchaseHub, ManufacturingHub, EquipmentHub, DevHub, ManagementReviewHub, TrainingHub
try { SalesHub = React.lazy(() => import('./pages/sales/SalesHub')) } catch {}
try { PurchaseHub = React.lazy(() => import('./pages/purchase/PurchaseHub')) } catch {}
try { ManufacturingHub = React.lazy(() => import('./pages/manufacturing/ManufacturingHub')) } catch {}
try { EquipmentHub = React.lazy(() => import('./pages/equipment/EquipmentHub')) } catch {}
try { DevHub = React.lazy(() => import('./pages/development/DevHub')) } catch {}
try { ManagementReviewHub = React.lazy(() => import('./pages/management/ManagementReviewHub')) } catch {}
try { TrainingHub = React.lazy(() => import('./pages/training/TrainingHub')) } catch {}

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

      {/* ─── 부서별 홈 대시보드 (Task #28) ─── */}
      <Route path="/home" element={<ProtectedRoute><DeptHome /></ProtectedRoute>} />

      {/* ─── 프로세스 흐름 가시화 (Task #31) ─── */}
      <Route path="/flow" element={<ProtectedRoute><ProcessFlow /></ProtectedRoute>} />

      {/* ─── 신규 허브 (Task #30) ─── */}
      <Route path="/audit" element={<ProtectedRoute><AuditHub /></ProtectedRoute>} />
      <Route path="/improvement" element={<ProtectedRoute><ImprovementHub /></ProtectedRoute>} />

      {/* ─── 기록 내보내기 (Task #32) ─── */}
      <Route path="/export" element={<ProtectedRoute><ExportHub /></ProtectedRoute>} />

      {/* ─── 위험관리 허브 (Task #33) ─── */}
      <Route path="/risk" element={<ProtectedRoute><RiskHub /></ProtectedRoute>} />

      {/* ─── 교정 관리 허브 (Task #34) ─── */}
      <Route path="/calibration" element={<ProtectedRoute><CalibrationHub /></ProtectedRoute>} />

      {/* ─── 공급업체 관리 허브 (Task #35) ─── */}
      <Route path="/suppliers" element={<ProtectedRoute><SupplierHub /></ProtectedRoute>} />

      {/* ─── 고객불만 관리 허브 (Task #36) ─── */}
      <Route path="/complaints" element={<ProtectedRoute><ComplaintHub /></ProtectedRoute>} />

      {/* ─── 제품 추적성 허브 (Task #37) ─── */}
      <Route path="/traceability" element={<ProtectedRoute><TraceabilityHub /></ProtectedRoute>} />

      {/* ─── 변경 관리 허브 (Task #38) ─── */}
      <Route path="/change-control" element={<ProtectedRoute><ChangeControlHub /></ProtectedRoute>} />

      {/* ─── 공정·최종 검사 허브 (Task #39) ─── */}
      <Route path="/inspection" element={<ProtectedRoute><InspectionHub /></ProtectedRoute>} />

      {/* ─── 작업환경 관리 허브 (Task #40) ─── */}
      <Route path="/work-env" element={<ProtectedRoute><WorkEnvHub /></ProtectedRoute>} />

      {/* ─── 공정 유효성 확인 허브 (Task #41) ─── */}
      <Route path="/validation" element={<ProtectedRoute><ValidationHub /></ProtectedRoute>} />

      {/* ─── 통합 품질 KPI 대시보드 (Task #42) ─── */}
      <Route path="/quality-dashboard" element={<ProtectedRoute><QualityDashboard /></ProtectedRoute>} />

      {/* ─── 설계 이력 파일 허브 (Task #43) ─── */}
      <Route path="/dhf" element={<ProtectedRoute><DesignHistoryHub /></ProtectedRoute>} />

      {/* ─── 역량 관리 허브 (Task #44) ─── */}
      <Route path="/competency" element={<ProtectedRoute><CompetencyHub /></ProtectedRoute>} />

      {/* ─── 설치·서비스 활동 허브 (Task #45) ─── */}
      <Route path="/service" element={<ProtectedRoute><ServiceHub /></ProtectedRoute>} />

      {/* ─── 제품 보존·취급 관리 허브 (Task #46) ─── */}
      <Route path="/preservation" element={<ProtectedRoute><PreservationHub /></ProtectedRoute>} />

      {/* ─── 품질 계획 허브 (Task #47) ─── */}
      <Route path="/quality-plan" element={<ProtectedRoute><QualityPlanHub /></ProtectedRoute>} />

      {/* ─── 고객 요구사항 검토 허브 (Task #48) ─── */}
      <Route path="/customer-req" element={<ProtectedRoute><CustomerReqHub /></ProtectedRoute>} />

      {/* ─── 인프라 관리 허브 (Task #49) ─── */}
      <Route path="/infrastructure" element={<ProtectedRoute><InfrastructureHub /></ProtectedRoute>} />

      {/* ─── 문서 관리 허브 (Task #50) ─── */}
      <Route path="/doc-control" element={<ProtectedRoute><DocControlHub /></ProtectedRoute>} />

      {/* ─── CEO 추가 허브 (dynamic lazy load) ─── */}
      <Route path="/sales/*" element={<ProtectedRoute><LazyRoute Component={SalesHub} /></ProtectedRoute>} />
      <Route path="/purchase/*" element={<ProtectedRoute><LazyRoute Component={PurchaseHub} /></ProtectedRoute>} />
      <Route path="/manufacturing/*" element={<ProtectedRoute><LazyRoute Component={ManufacturingHub} /></ProtectedRoute>} />
      <Route path="/equipment/*" element={<ProtectedRoute><LazyRoute Component={EquipmentHub} /></ProtectedRoute>} />
      <Route path="/development/*" element={<ProtectedRoute><LazyRoute Component={DevHub} /></ProtectedRoute>} />
      <Route path="/management-review/*" element={<ProtectedRoute><LazyRoute Component={ManagementReviewHub} /></ProtectedRoute>} />
      <Route path="/training/*" element={<ProtectedRoute><LazyRoute Component={TrainingHub} /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
