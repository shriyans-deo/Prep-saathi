import { NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { NumberTicker } from '../magicui/NumberTicker';
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
  const location = useLocation();
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
    <aside className="hidden md:flex md:flex-col md:w-68 h-screen sticky top-0 bg-[#0B1F3A] text-white flex-shrink-0 z-30 select-none border-r border-slate-800 shadow-xl">
      {/* Brand & Sync indicator */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue to-sky-400 flex items-center justify-center font-extrabold text-base text-white shadow-md shadow-blue/30">
              PS
            </span>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-white leading-none">
                PrepSaathi
              </span>
              <span className="text-[11px] text-sky font-bold tracking-wider uppercase mt-1">
                Execution Partner
              </span>
            </div>
          </div>

          {/* Sync status indicator */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[11px] font-bold text-emerald-300 shadow-xs"
            title="Real-time synchronization active"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
            <span>Live</span>
          </div>
        </div>

        {/* User Identity & Exam Card */}
        {profile && (
          <div className="mt-5 p-4 rounded-2xl bg-white/10 border border-white/15 space-y-3 backdrop-blur-md shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center font-bold text-xs text-sky-200">
                  {profile.name.charAt(0)}
                </span>
                <span className="text-sm font-bold text-white truncate max-w-[130px]">
                  {profile.name}
                </span>
              </div>
              <span className="text-xs bg-blue text-white px-2.5 py-0.5 rounded-lg font-mono font-bold shadow-xs">
                {profile.exam || 'Aspirant'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs">
              <div className="flex items-center gap-1.5 bg-orange/20 border border-orange/30 px-2.5 py-1 rounded-xl text-orange-300 font-bold">
                <FlameIcon size={14} className="text-orange" />
                <NumberTicker value={profile.streak_count} suffix="d streak" className="text-orange-300 font-bold text-xs" />
              </div>
              <div className="flex items-center gap-1.5 bg-sky-400/20 border border-sky-400/30 px-2.5 py-1 rounded-xl text-sky-200 font-bold">
                <StarIcon size={14} className="text-sky" />
                <NumberTicker value={profile.total_points} suffix=" pts" className="text-sky-200 font-bold text-xs" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* The 7 Navigation Items in exact specified order */}
      <nav className="flex-1 px-4 py-3 space-y-1.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`relative flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all ${
                isActive
                  ? 'text-white font-bold shadow-md shadow-blue/25'
                  : 'text-slate-300 hover:text-white hover:bg-white/8'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="sidebarActivePill"
                  className="absolute inset-0 bg-gradient-to-r from-blue to-blue-600 rounded-xl z-0"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-3.5">
                <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400'} />
                <span>{item.label}</span>
              </span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Controls */}
      <div className="p-4 border-t border-white/10 space-y-3 bg-[#071527]/90">
        {/* WhatsApp Delivery Channel */}
        <Link
          to="/whatsapp"
          className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition shadow-xs"
        >
          <div className="flex items-center gap-2">
            <MessageSquareIcon size={15} className="text-emerald-400" />
            <span>WhatsApp Delivery Mock</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono font-bold">Tier 2-3 →</span>
        </Link>

        {/* Lite Mode Toggle */}
        <div className="flex items-center justify-between text-xs text-slate-300 px-1.5">
          <span className="text-xs font-medium">Lite Mode (Low Bandwidth)</span>
          <button
            type="button"
            onClick={toggleLiteMode}
            className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
              liteMode ? 'bg-blue' : 'bg-white/20'
            }`}
            title="Lite mode drops charts to numbers to conserve data"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-xs ${
                liteMode ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Language Toggle */}
        <div className="flex items-center justify-between text-xs text-slate-300 px-1.5">
          <span className="text-xs font-medium">Language / भाषा</span>
          <div className="flex rounded-lg bg-white/10 p-0.5 text-xs font-bold">
            <button
              onClick={() => setLang('en')}
              className={`px-2.5 py-0.5 rounded-md transition ${
                lang === 'en' ? 'bg-blue text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang('hi')}
              className={`px-2.5 py-0.5 rounded-md transition ${
                lang === 'hi' ? 'bg-blue text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              हिन्दी
            </button>
          </div>
        </div>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/10 transition font-medium cursor-pointer"
        >
          <LogOutIcon size={15} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
