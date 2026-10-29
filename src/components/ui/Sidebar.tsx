import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import {
  DashboardIcon,
  PlanIcon,
  LibraryIcon,
  QuizIcon,
  ProofIcon,
  SquadIcon,
  ProgressIcon,
  FlameIcon,
  StarIcon,
  LogOutIcon,
  MessageSquareIcon,
} from './Icons';

// Exact seven specified navigation items in required order (§3 & §6 of spec)
const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { path: '/plan', label: "Today's Plan", icon: PlanIcon },
  { path: '/library', label: 'Library', icon: LibraryIcon },
  { path: '/quiz', label: 'Quiz', icon: QuizIcon },
  { path: '/proof', label: 'Proof', icon: ProofIcon },
  { path: '/squad', label: 'Squad', icon: SquadIcon },
  { path: '/progress', label: 'Progress', icon: ProgressIcon },
];

export default function Sidebar() {
  const { profile, signOut } = useAuth();
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
    <aside className="hidden md:flex md:flex-col md:w-64 h-screen sticky top-0 bg-navy text-white flex-shrink-0 z-30 select-none border-r border-navy/40 shadow-sm">
      {/* Brand & Sync indicator (§6) */}
      <div className="p-5 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-blue flex items-center justify-center font-bold text-sm text-white shadow-xs">
              PS
            </span>
            <div className="flex flex-col">
              <span className="text-lg font-extrabold tracking-tight text-white leading-none">
                PrepSaathi
              </span>
              <span className="text-[10px] text-sky font-semibold tracking-wide uppercase mt-0.5">
                Execution Partner
              </span>
            </div>
          </div>

          {/* Sync status indicator */}
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-semibold text-emerald-400"
            title="Real-time synchronization active"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Synced</span>
          </div>
        </div>

        {/* User Identity & Exam Pill */}
        {profile && (
          <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white truncate max-w-[130px]">
                {profile.name}
              </span>
              <span className="text-[10px] bg-blue/30 text-sky px-2 py-0.5 rounded-md font-mono font-semibold tracking-wider">
                {profile.exam || 'Aspirant'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
              <span className="flex items-center gap-1 text-orange font-bold">
                <FlameIcon size={14} className="text-orange" />
                <span>{profile.streak_count}d streak</span>
              </span>
              <span className="flex items-center gap-1 text-sky font-bold">
                <StarIcon size={14} className="text-sky" />
                <span>{profile.total_points.toLocaleString()} pts</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* The 7 Navigation Items in exact specified order (§6) */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? 'bg-blue text-white shadow-xs font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`
              }
            >
              <Icon size={18} className="flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Controls: WhatsApp Delivery Channel link, Lite Mode, Hindi, Sign Out */}
      <div className="p-4 border-t border-white/10 space-y-3 bg-navy/60">
        {/* WhatsApp Delivery Channel (Accessible without violating the 7-item nav constraint) */}
        <Link
          to="/whatsapp"
          className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 text-xs font-medium transition"
        >
          <div className="flex items-center gap-2">
            <MessageSquareIcon size={14} className="text-emerald-400" />
            <span>WhatsApp Delivery Mock</span>
          </div>
          <span className="text-[10px] opacity-75 font-mono">Tier 2-3 →</span>
        </Link>

        {/* Lite Mode Toggle (§1, §6) */}
        <div className="flex items-center justify-between text-xs text-slate-300 px-1">
          <span className="text-[11px] font-medium">Lite Mode (Low Bandwidth)</span>
          <button
            type="button"
            onClick={toggleLiteMode}
            className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${
              liteMode ? 'bg-blue' : 'bg-white/20'
            }`}
            title="Lite mode drops charts to numbers to conserve data"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                liteMode ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Hindi Toggle (§6) */}
        <div className="flex items-center justify-between text-xs text-slate-300 px-1">
          <span className="text-[11px] font-medium">Language / भाषा</span>
          <div className="flex rounded-lg bg-white/10 p-0.5 text-[10px] font-bold">
            <button
              onClick={() => setLang('en')}
              className={`px-2 py-0.5 rounded transition ${
                lang === 'en' ? 'bg-blue text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang('hi')}
              className={`px-2 py-0.5 rounded transition ${
                lang === 'hi' ? 'bg-blue text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              हिन्दी
            </button>
          </div>
        </div>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/10 transition font-medium cursor-pointer"
        >
          <LogOutIcon size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
