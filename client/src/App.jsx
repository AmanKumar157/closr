import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import Navbar from './components/Navbar.jsx';
import LoginPage from './features/auth/pages/LoginPage.jsx';
import RegisterPage from './features/auth/pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ProfilePage from './features/profile/pages/ProfilePage.jsx';
import NewAnalysisPage from './features/analysis/pages/NewAnalysisPage.jsx';
import AnalysisResultPage from './features/analysis/pages/AnalysisResultPage.jsx';

export const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#ffffff',
                color: '#1e293b',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                borderRadius: '0.75rem',
                border: '1px solid #e2e8f0',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: 500
              },
              success: {
                iconTheme: {
                  primary: '#4f46e5',
                  secondary: '#ffffff'
                }
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#ffffff'
                }
              }
            }}
          />
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Default Redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* Public Auth Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analysis/new"
                element={
                  <ProtectedRoute>
                    <NewAnalysisPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analysis/:id"
                element={
                  <ProtectedRoute>
                    <AnalysisResultPage />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all 404 Route */}
              <Route
                path="*"
                element={
                  <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center p-6 text-center">
                    <h2 className="text-4xl font-extrabold text-slate-800">404</h2>
                    <p className="mt-2 text-slate-600">The page you are looking for does not exist.</p>
                    <Navigate to="/dashboard" className="mt-4 text-indigo-600 font-semibold" />
                  </div>
                }
              />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;

