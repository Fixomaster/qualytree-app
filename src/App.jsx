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

function ProtectedRoute({ children }) {
  if (!auth.isSignedIn()) {
    return <Navigate to="/login" replace />
  }
  return children
}

function PublicRoute({ children }) {
  if (auth.isSignedIn()) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <Signup />
          </PublicRoute>
        }
      />
      <Route
        path="/signup/success"
        element={
          <PublicRoute>
            <SignupSuccess />
          </PublicRoute>
        }
      />
        <Route path="/operator" element={<OperatorConsole />} />
        <Route path="/operator/plans" element={<PlanAdmin />} />
        <Route path="/manager/accounts" element={<MemberAdmin />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/section/:cardId"
        element={
          <ProtectedRoute>
            <GMPSection />
          </ProtectedRoute>
        }
      />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        }
      />
      <Route
        path="/operations"
        element={
          <ProtectedRoute>
            <WorkOrderQueue />
          </ProtectedRoute>
        }
      />
      <Route
        path="/operations/:woId/ebr"
        element={
          <ProtectedRoute>
            <EBatchRecord />
          </ProtectedRoute>
        }
      />
      <Route
        path="/operations/:woId/inspection"
        element={
          <ProtectedRoute>
            <InspectionStages />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quality"
        element={
          <ProtectedRoute>
            <QualityHub />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tree"
        element={
          <ProtectedRoute>
            <QualityTree />
          </ProtectedRoute>
        }
      />
      <Route
        path="/products"
        element={
          <ProtectedRoute>
            <ProductsHub />
          </ProtectedRoute>
        }
      />
      <Route
        path="/regulatory"
        element={
          <ProtectedRoute>
            <RegulatoryHub />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents"
        element={
          <ProtectedRoute>
            <Documents />
          </ProtectedRoute>
        }
      />
      <Route path="/preview" element={<PreviewHub />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
