import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  DashboardIcon,
  PlanIcon,
  LibraryIcon,
  QuizIcon,
  ProofIcon,
  SquadIcon,
  ProgressIcon,
} from './Icons';

const TABS = [
  { path: '/dashboard', label: 'Home', icon: DashboardIcon },
  { path: '/plan', label: 'Plan', icon: PlanIcon },
  { path: '/library', label: 'Library', icon: LibraryIcon },
  { path: '/quiz', label: 'Quiz', icon: QuizIcon },
  { path: '/proof', label: 'Proof', icon: ProofIcon },
  { path: '/squad', label: 'Squad', icon: SquadIcon },
  { path: '/progress', label: 'Progress', icon: ProgressIcon },
];

export default function BottomTabs() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-50 shadow-lg">
      <div className="flex justify-around items-center h-16 px-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.path;

          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={`relative flex flex-col items-center justify-center gap-1 text-[10px] font-semibold px-2 py-1.5 rounded-lg transition-colors ${
                isActive ? 'text-blue' : 'text-slate-400 hover:text-navy'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="mobileTabActivePill"
                  className="absolute -top-1 w-6 h-0.5 bg-blue rounded-full"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <Icon size={18} />
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
