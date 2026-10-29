import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/ui/AppLayout';
import AuthPage from './pages/AuthPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import PlanPage from './pages/PlanPage';
import LibraryPage from './pages/LibraryPage';
import QuizPage from './pages/QuizPage';
import ProofPage from './pages/ProofPage';
import SquadPage from './pages/SquadPage';
import ProgressPage from './pages/ProgressPage';
import WhatsAppMockPage from './pages/WhatsAppMockPage';

// Route guard checking authentication and onboarding completion (§6 Screen 1)
function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const { user, profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-grey">Loading PrepSaathi...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If user is logged in but hasn't completed onboarding (exam is null/empty), redirect to onboarding
  if (!profile?.exam && window.location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />

          {/* App routes with layout */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/plan" element={<PlanPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/quiz" element={<QuizPage />} />
            <Route path="/proof" element={<ProofPage />} />
            <Route path="/squad" element={<SquadPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/whatsapp" element={<WhatsAppMockPage />} />
          </Route>

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
