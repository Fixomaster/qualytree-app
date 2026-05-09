import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Onboarding from './pages/onboarding/Onboarding'
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
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
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
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
