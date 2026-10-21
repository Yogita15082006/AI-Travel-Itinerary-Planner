import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import './index.css'

// Pages
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'
import CreateTripPage from './pages/CreateTripPage'
import TripDetailPage from './pages/TripDetailPage'
import TripsListPage from './pages/TripsListPage'
import EditTripPage from './pages/EditTripPage'
import ProfilePage from './pages/ProfilePage'
import NotFoundPage from './pages/NotFoundPage'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Protected routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute><DashboardPage /></ProtectedRoute>
          } />
          <Route path="/trips" element={
            <ProtectedRoute><TripsListPage /></ProtectedRoute>
          } />
          <Route path="/trips/new" element={
            <ProtectedRoute><CreateTripPage /></ProtectedRoute>
          } />
          <Route path="/trips/:tripId" element={
            <ProtectedRoute><TripDetailPage /></ProtectedRoute>
          } />
          <Route path="/trips/:tripId/edit" element={
            <ProtectedRoute><EditTripPage /></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute><ProfilePage /></ProtectedRoute>
          } />

          {/* Fallbacks */}
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
