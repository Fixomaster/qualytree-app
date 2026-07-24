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
