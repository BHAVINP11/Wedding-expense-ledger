import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import PublicEvent from './pages/PublicEvent'

const FamilyLogin = lazy(() => import('./pages/FamilyLogin'))
const FamilyDashboard = lazy(() => import('./pages/FamilyDashboard'))

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicEvent />} />
        <Route
          path="/family/login"
          element={
            <Suspense fallback={<div className="screen-loading">Loading…</div>}>
              <FamilyLogin />
            </Suspense>
          }
        />
        <Route
          path="/family"
          element={
            <Suspense fallback={<div className="screen-loading">Loading…</div>}>
              <FamilyDashboard />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
