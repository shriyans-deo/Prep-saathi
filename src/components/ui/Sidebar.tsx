import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/plan', label: "Today's Plan", icon: '📋' },
  { path: '/library', label: 'Library', icon: '📚' },
  { path: '/quiz', label: 'Quiz', icon: '🧠' },
  { path: '/proof', label: 'Proof', icon: '📸' },
  { path: '/squad', label: 'Squad', icon: '👥' },
  { path: '/progress', label: 'Progress', icon: '📈' },
  { path: '/whatsapp', label: 'WhatsApp Mock', icon: '💬' },
];

export default function Sidebar() {
  const { profile, signOut, isDemoUser } = useAuth();
  const navigate = useNavigate();
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [liteMode, setLiteMode] = useState(false);

  useEffect(() => {
    const savedLite = localStorage.getItem('prepsaathi_lite_mode') === 'true';
    setLiteMode(savedLite);
    if (savedLite) {
      document.documentElement.classList.add('lite-mode');
    }
  }, []);

  const toggleLiteMode = () => {
    const next = !liteMode;
    setLiteMode(next);
    localStorage.setItem('prepsaathi_lite_mode', String(next));
    if (next) {
      document.documentElement.classList.add('lite-mode');
    } else {
      document.documentElement.classList.remove('lite-mode');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 bg-navy min-h-screen p-4 border-r border-navy/40 text-white select-none">
      {/* Brand & Sync indicator (§6) */}
      <div className="mb-6 px-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-md bg-blue flex items-center justify-center font-bold text-sm text-white">
              PS
            </span>
            <span className="text-lg font-bold tracking-tight text-white">PrepSaathi</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Synced</span>
          </div>
        </div>

        {/* User Card */}
        {profile && (
          <div className="mt-4 p-2.5 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white truncate">{profile.name}</span>
              <span className="text-[10px] bg-blue/30 text-sky px-1.5 py-0.5 rounded font-mono">
                {profile.exam || 'Aspirant'}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-300">
              <span className="flex items-center gap-1 text-orange font-medium">
                🔥 {profile.streak_count}d streak
              </span>
              <span className="text-grey">·</span>
              <span className="text-sky font-medium">⭐ {profile.total_points} pts</span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation items in spec order (§6) */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue text-white shadow-sm'
                  : 'text-grey hover:text-white hover:bg-white/10'
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom controls: Lite Mode & Hindi Toggle & Logout */}
      <div className="mt-auto pt-4 border-t border-white/10 space-y-3 px-1">
        {/* Lite Mode Toggle (§1, §6) */}
        <div className="flex items-center justify-between text-xs text-grey">
          <span>Lite Mode (low-bandwidth)</span>
          <button
            type="button"
            onClick={toggleLiteMode}
            className={`w-8 h-4 rounded-full transition-colors relative ${
              liteMode ? 'bg-blue' : 'bg-white/20'
            }`}
            title="Lite mode drops charts to numbers and minimizes data usage"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                liteMode ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Hindi Toggle (§6) */}
        <div className="flex items-center justify-between text-xs text-grey">
          <span>Language / भाषा</span>
          <div className="flex rounded bg-white/10 p-0.5 text-[11px]">
            <button
              onClick={() => setLang('en')}
              className={`px-2 py-0.5 rounded transition ${
                lang === 'en' ? 'bg-blue text-white font-medium' : 'text-grey hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang('hi')}
              className={`px-2 py-0.5 rounded transition ${
                lang === 'hi' ? 'bg-blue text-white font-medium' : 'text-grey hover:text-white'
              }`}
            >
              हिन्दी
            </button>
          </div>
        </div>

        {isDemoUser && (
          <div className="px-2 py-1 rounded bg-orange/15 border border-orange/30 text-[10px] text-orange text-center">
            Pitch Demo Mode Active
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs text-grey hover:text-white hover:bg-white/10 transition"
        >
          <span>🚪</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
