import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PrefsProvider, usePrefs } from './lib/prefs';
import { isConfigured } from './lib/supabase';
import AppLayout from './components/AppLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Button, Loading, ToastProvider } from './components/ui';
import AuthPage from './pages/AuthPage';

const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const PlanPage = lazy(() => import('./pages/PlanPage'));
const LibraryPage = lazy(() => import('./pages/LibraryPage'));
const QuizPage = lazy(() => import('./pages/QuizPage'));
const ProofPage = lazy(() => import('./pages/ProofPage'));
const SquadPage = lazy(() => import('./pages/SquadPage'));
const ProgressPage = lazy(() => import('./pages/ProgressPage'));
const WhatsAppPage = lazy(() => import('./pages/WhatsAppPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

function FullScreenLoading() {
  const { t } = usePrefs();
  return (
    <div className="min-h-dvh flex items-center justify-center">
      <Loading label={t('Loading...')} />
    </div>
  );
}

function ProfileFailed() {
  const { t } = usePrefs();
  const { signOut } = useAuth();
  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div role="alert" className="max-w-md">
        <h1 className="text-xl font-bold mb-1">{t('Could not load your account')}</h1>
        <p className="text-ink-soft mb-4">{t('Check your connection and try again.')}</p>
        <div className="flex gap-2">
          <Button onClick={() => window.location.reload()}>{t('Try again')}</Button>
          <Button variant="print" onClick={() => void signOut()}>
            {t('Sign out')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function RequireAuth({ children, onboarding }: { children: React.ReactElement; onboarding?: boolean }) {
  const { user, profile, isLoading, profileError } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullScreenLoading />;
  if (!user) return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  if (profileError) return <ProfileFailed />;
  if (!profile) return <FullScreenLoading />;
  if (!onboarding && !profile.exam) return <Navigate to="/onboarding" replace />;
  return children;
}

function NotConfigured() {
  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div role="alert" className="max-w-md">
        <h1 className="text-xl font-bold mb-1">PrepSaathi is not configured</h1>
        <p className="text-ink-soft">
          Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the environment, then rebuild. See README.md.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  if (!isConfigured) return <NotConfigured />;
  return (
    <AuthProvider>
      <PrefsProvider>
        <ToastProvider>
          <BrowserRouter>
            <ErrorBoundary>
              <Suspense fallback={<FullScreenLoading />}>
                <Routes>
                  <Route path="/auth" element={<AuthPage />} />
                  <Route
                    path="/onboarding"
                    element={
                      <RequireAuth onboarding>
                        <OnboardingPage />
                      </RequireAuth>
                    }
                  />
                  <Route
                    element={
                      <RequireAuth>
                        <AppLayout />
                      </RequireAuth>
                    }
                  >
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/plan" element={<PlanPage />} />
                    <Route path="/library" element={<LibraryPage />} />
                    <Route path="/quiz" element={<QuizPage />} />
                    <Route path="/proof" element={<ProofPage />} />
                    <Route path="/squad" element={<SquadPage />} />
                    <Route path="/progress" element={<ProgressPage />} />
                    <Route path="/whatsapp" element={<WhatsAppPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </BrowserRouter>
        </ToastProvider>
      </PrefsProvider>
    </AuthProvider>
  );
}
