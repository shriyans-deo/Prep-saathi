import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  Camera,
  ClipboardList,
  Flame,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  PenLine,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePrefs } from '../lib/prefs';
import { effectiveStreak } from '../lib/stats';
import { Bubble, Button, Dialog, Loading, Logo, cx } from './ui';
import { ErrorBoundary } from './ErrorBoundary';

const PRIMARY: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/plan', label: "Today's Plan", icon: ClipboardList },
  { to: '/library', label: 'Library', icon: BookOpen },
  { to: '/quiz', label: 'Quiz', icon: PenLine },
  { to: '/proof', label: 'Proof', icon: Camera },
  { to: '/squad', label: 'Squad', icon: Users },
  { to: '/progress', label: 'Progress', icon: BarChart3 },
];

const SECONDARY: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/whatsapp', label: 'WhatsApp preview', icon: MessageCircle },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const TABS = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/plan', label: 'Plan', icon: ClipboardList },
  { to: '/quiz', label: 'Quiz', icon: PenLine },
  { to: '/proof', label: 'Proof', icon: Camera },
];

const MORE = [
  { to: '/library', label: 'Library', icon: BookOpen },
  { to: '/squad', label: 'Squad', icon: Users },
  { to: '/progress', label: 'Progress', icon: BarChart3 },
  ...SECONDARY,
];

function SampleBanner() {
  const { signOut } = useAuth();
  const { t } = usePrefs();
  const navigate = useNavigate();
  return (
    <div className="bg-warn-bg text-ink border-b border-[#e6d3a3] px-4 py-2 text-sm flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <span>
        <strong className="font-semibold">{t('Sample data.')}</strong>{' '}
        {t('This account and its numbers are made up to show how PrepSaathi works. It is deleted after 2 days.')}
      </span>
      <button
        type="button"
        className="font-semibold underline"
        onClick={async () => {
          await signOut();
          navigate('/auth?mode=signup');
        }}
      >
        {t('Create a real account')}
      </button>
    </div>
  );
}

export default function AppLayout() {
  const { profile, isSample, signOut } = useAuth();
  const { t } = usePrefs();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setMoreOpen(false);
    document.getElementById('main')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const streak = effectiveStreak(profile);
  const moreActive = MORE.some((item) => location.pathname === item.to);

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:bg-ink focus:text-white focus:px-3 focus:py-2"
      >
        {t('Skip to content')}
      </a>

      {/* Desktop rail */}
      <aside className="hidden md:flex md:flex-col h-dvh sticky top-0 bg-rail text-white p-4">
        <Link to="/dashboard" className="block -mx-4 -mt-4 bg-sheet px-4 py-3">
          <Logo className="w-full max-w-[12rem] h-auto mx-auto" />
        </Link>
        {profile?.exam && <div className="px-2 pt-3 text-sm text-[#dce9f6]">{profile.exam}</div>}

        <nav aria-label={t('Main')} className="mt-5 flex flex-col gap-0.5">
          {PRIMARY.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cx(
                  'flex items-center gap-2.5 rounded-sheet px-2.5 min-h-10 font-medium no-underline transition-colors duration-150',
                  isActive ? 'bg-sheet text-print-dark font-semibold' : 'text-white hover:bg-rail-dark'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cx('w-4 h-4 rounded-full border-[1.5px] flex-none', isActive ? 'bg-ink border-ink' : 'border-white')} aria-hidden="true" />
                  {t(item.label)}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-0.5">
          <div className="flex items-center gap-4 px-2.5 pb-3 text-sm">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <Flame size={16} aria-hidden="true" />
              {t('{n} day streak', { n: streak })}
            </span>
            <span className="font-semibold">{t('{n} pts', { n: profile?.total_points ?? 0 })}</span>
          </div>
          {SECONDARY.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cx(
                  'flex items-center gap-2.5 rounded-sheet px-2.5 min-h-10 text-sm font-medium no-underline transition-colors duration-150',
                  isActive ? 'bg-sheet text-print-dark' : 'text-white hover:bg-rail-dark'
                )
              }
            >
              <item.icon size={16} aria-hidden="true" />
              {t(item.label)}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-2.5 rounded-sheet px-2.5 min-h-10 text-sm font-medium text-white hover:bg-rail-dark transition-colors duration-150"
          >
            <LogOut size={16} aria-hidden="true" />
            {t('Sign out')}
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex flex-col min-h-dvh">
        {isSample && <SampleBanner />}

        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 h-14 border-b border-line bg-sheet">
          <Link to="/dashboard" className="block">
            <Logo className="h-11 w-auto" />
          </Link>
          <div className="flex items-center gap-3 text-sm font-semibold">
            <span className="inline-flex items-center gap-1">
              <Flame size={16} className="text-gap" aria-hidden="true" />
              {streak}
              <span className="sr-only">{t('day streak')}</span>
            </span>
            <span>{t('{n} pts', { n: profile?.total_points ?? 0 })}</span>
          </div>
        </header>

        <main id="main" tabIndex={-1} className="flex-1 w-full max-w-[76rem] mx-auto px-4 py-5 sm:px-6 md:py-7 pb-24 md:pb-8 outline-none">
          <ErrorBoundary resetKey={location.pathname}>
            <Suspense fallback={<Loading label={t('Loading...')} />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      {/* Mobile tabs */}
      <nav aria-label={t('Main')} className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-sheet border-t border-print grid grid-cols-5 pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cx('flex flex-col items-center justify-center gap-0.5 min-h-14 text-xs no-underline', isActive ? 'text-ink font-semibold' : 'text-print-dark font-medium')
            }
          >
            {({ isActive }) => (
              <>
                {isActive ? <Bubble filled size={20} /> : <tab.icon size={20} aria-hidden="true" />}
                {t(tab.label)}
              </>
            )}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-current={moreActive ? 'page' : undefined}
          className={cx('flex flex-col items-center justify-center gap-0.5 min-h-14 text-xs', moreActive ? 'text-ink font-semibold' : 'font-medium text-print-dark')}
        >
          {moreActive ? <Bubble filled size={20} /> : <Menu size={20} aria-hidden="true" />}
          {t('More')}
        </button>
      </nav>

      <Dialog open={moreOpen} onClose={() => setMoreOpen(false)} title={t('More')}>
        <nav aria-label={t('More')} className="flex flex-col">
          {MORE.map((item) => (
            <Link key={item.to} to={item.to} className="flex items-center gap-3 min-h-12 border-b border-line text-ink no-underline font-medium">
              <item.icon size={18} className="text-print" aria-hidden="true" />
              {t(item.label)}
            </Link>
          ))}
        </nav>
        <Button variant="print" className="w-full mt-4" onClick={handleSignOut}>
          <LogOut size={16} aria-hidden="true" />
          {t('Sign out')}
        </Button>
      </Dialog>
    </div>
  );
}
