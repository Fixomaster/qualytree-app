import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Signup from './pages/Signup'
import SignupSuccess from './pages/SignupSuccess'
import OperatorConsole from './pages/OperatorConsole'
import PlanAdmin from './pages/operator/PlanAdmin'
import MemberAdmin from './pages/manager/MemberAdmin'
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
import SalesHub from './pages/sales/SalesHub'
import PurchaseHub from './pages/purchase/PurchaseHub'
import ManufacturingHub from './pages/manufacturing/ManufacturingHub'
import EquipmentHub from './pages/equipment/EquipmentHub'
import MonitoringHub from './pages/monitoring/MonitoringHub'
import TrainingHub from './pages/training/TrainingHub'
import { auth } from './lib/auth'

function ProtectedRoute({ children }) {
  if (!auth.isSignedIn()) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  if (auth.isSignedIn()) return <Navigate to="/monitoring" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/monitoring" replace />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
      <Route path="/signup/success" element={<PublicRoute><SignupSuccess /></PublicRoute>} />
      <Route path="/operator" element={<OperatorConsole />} />
      <Route path="/operator/plans" element={<PlanAdmin />} />
      <Route path="/manager/accounts" element={<MemberAdmin />} />
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
      {/* 신규 모듈 */}
      <Route path="/sales" element={<ProtectedRoute><SalesHub /></ProtectedRoute>} />
      <Route path="/purchase" element={<ProtectedRoute><PurchaseHub /></ProtectedRoute>} />
      <Route path="/manufacturing" element={<ProtectedRoute><ManufacturingHub /></ProtectedRoute>} />
      <Route path="/equipment" element={<ProtectedRoute><EquipmentHub /></ProtectedRoute>} />
      <Route path="/monitoring" element={<ProtectedRoute><MonitoringHub /></ProtectedRoute>} />
      <Route path="/training" element={<ProtectedRoute><TrainingHub /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/monitoring" replace />} />
    </Routes>
  )
}
