import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />

        {/* App routes with layout */}
        <Route element={<AppLayout />}>
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
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
