import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';

// Pages
import { LandingPage } from './pages/LandingPage';
import { StudentVerifiedPage } from './pages/StudentVerifiedPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { CollegeDirectoryPage } from './pages/CollegeDirectoryPage';
import { CollegeDetailPage } from './pages/CollegeDetailPage';
import { PlacementSubmissionPage } from './pages/PlacementSubmissionPage';
import { CollegeComparisonPage } from './pages/CollegeComparisonPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { StudentProfilePage } from './pages/StudentProfilePage';
import { OfficialReportsPage } from './pages/OfficialReportsPage';
import { Top50PrivateCollegesPage } from './pages/Top50PrivateCollegesPage';
import { CampusCommunityPage } from './pages/CampusCommunityPage';
import { RoiLoanSimulatorPage } from './pages/RoiLoanSimulatorPage';
import { FounderPage } from './pages/FounderPage';
import { MethodologyPage } from './pages/MethodologyPage';
import { JoinUsPage } from './pages/JoinUsPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { MandatoryPasswordChangeModal } from './components/common/MandatoryPasswordChangeModal';

// Protected Route Wrapper
const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/student-verified" replace />;
  }

  if (requiredRole === 'moderator' && !['moderator', 'admin'].includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiredRole === 'admin' && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export const App = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
          <MandatoryPasswordChangeModal />
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/join-us" element={<JoinUsPage />} />
              <Route path="/join" element={<Navigate to="/join-us" replace />} />
              <Route path="/student-verification" element={<Navigate to="/join-us" replace />} />
              <Route path="/student-verified" element={<StudentVerifiedPage />} />
              <Route path="/student-verified-comments" element={<Navigate to="/student-verified" replace />} />
              <Route path="/verified-comments" element={<Navigate to="/student-verified" replace />} />
              <Route path="/verified-stats" element={<Navigate to="/student-verified" replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signin" element={<Navigate to="/login" replace />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/colleges" element={<CollegeDirectoryPage />} />
              <Route path="/colleges/:slugOrId" element={<CollegeDetailPage />} />
              <Route path="/top-private-engineering-colleges-india" element={<Top50PrivateCollegesPage />} />
              <Route path="/top-50-private" element={<Navigate to="/top-private-engineering-colleges-india" replace />} />
              <Route path="/top-50" element={<Navigate to="/top-private-engineering-colleges-india" replace />} />
              <Route path="/roi-calculator" element={<RoiLoanSimulatorPage />} />
              <Route path="/loan-simulator" element={<Navigate to="/roi-calculator" replace />} />
              <Route path="/roi" element={<Navigate to="/roi-calculator" replace />} />
              <Route path="/community" element={<CampusCommunityPage />} />
              <Route path="/discussions" element={<Navigate to="/community" replace />} />
              <Route path="/ask" element={<Navigate to="/community" replace />} />
              <Route path="/official-reports" element={<OfficialReportsPage />} />
              <Route path="/compare" element={<CollegeComparisonPage />} />
              <Route path="/reviews" element={<Navigate to="/community" replace />} />
              <Route path="/reality-check" element={<Navigate to="/community" replace />} />
              <Route path="/advertised-vs-reality" element={<Navigate to="/community" replace />} />
              <Route path="/internships" element={<Navigate to="/community" replace />} />
              <Route path="/ai" element={<Navigate to="/colleges" replace />} />
              <Route path="/methodology" element={<MethodologyPage />} />
              <Route path="/founder" element={<FounderPage />} />
              <Route path="/about-founder" element={<Navigate to="/founder" replace />} />
              <Route path="/ceo" element={<Navigate to="/founder" replace />} />
              <Route path="/harish-sonkar" element={<Navigate to="/founder" replace />} />

              {/* Protected Student Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/submit-offer"
                element={
                  <ProtectedRoute>
                    <PlacementSubmissionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <StudentProfilePage />
                  </ProtectedRoute>
                }
              />

              {/* Protected Moderator & Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRole="moderator">
                    <AdminDashboardPage />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
