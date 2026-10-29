import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomTabs from './BottomTabs';
import { useAuth } from '../../context/AuthContext';
import { FlameIcon, StarIcon, LogOutIcon } from './Icons';

export default function AppLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg text-navy flex flex-col md:flex-row antialiased selection:bg-blue/15 selection:text-blue">
      {/* Desktop Sticky Sidebar */}
      <Sidebar />

      {/* Main Content Viewport */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile Sticky Top Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-navy text-white sticky top-0 z-40 border-b border-navy/40 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-blue flex items-center justify-center font-bold text-xs text-white shadow-xs">
              PS
            </span>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-white leading-tight">PrepSaathi</span>
              <span className="text-[10px] text-sky font-medium">{profile?.exam || 'Aspirant Engine'}</span>
            </div>
          </div>

          {profile && (
            <div className="flex items-center gap-3 text-xs">
              <span className="text-orange font-bold flex items-center gap-1 bg-orange/15 px-2 py-0.5 rounded-full border border-orange/30">
                <FlameIcon size={13} className="text-orange" />
                <span>{profile.streak_count}d</span>
              </span>
              <span className="text-sky font-bold flex items-center gap-1 bg-blue/20 px-2 py-0.5 rounded-full border border-blue/30">
                <StarIcon size={13} className="text-sky" />
                <span>{profile.total_points}</span>
              </span>
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  navigate('/auth');
                }}
                className="text-grey hover:text-white p-1 rounded-md transition"
                title="Sign out"
              >
                <LogOutIcon size={16} />
              </button>
            </div>
          )}
        </header>

        {/* Global Main Container (Max 1440px on extra-wide screens, full width responsive) */}
        <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 py-6 sm:px-6 md:px-8 md:py-8 pb-24 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomTabs />
    </div>
  );
}
