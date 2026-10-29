import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomTabs from './BottomTabs';
import { useAuth } from '../../context/AuthContext';

export default function AppLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-bg text-navy">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-navy text-white border-b border-navy/40 sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-blue flex items-center justify-center font-bold text-xs text-white">
              PS
            </span>
            <span className="font-bold text-sm text-white">PrepSaathi</span>
          </div>
          {profile && (
            <div className="flex items-center gap-2.5 text-xs">
              <span className="text-orange font-semibold flex items-center gap-1">
                🔥 {profile.streak_count}d
              </span>
              <span className="text-sky font-medium">
                ⭐ {profile.total_points}
              </span>
              <button
                onClick={async () => {
                  await signOut();
                  navigate('/auth');
                }}
                className="text-grey hover:text-white text-xs ml-1"
                title="Sign out"
              >
                🚪
              </button>
            </div>
          )}
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 max-w-5xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
      <BottomTabs />
    </div>
  );
}
