import { NavLink } from 'react-router-dom';
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
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-grey/20 z-50 shadow-lg">
      <div className="flex justify-around items-center h-16 px-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 text-[10px] font-semibold px-2 py-1.5 rounded-lg transition-colors ${
                  isActive ? 'text-blue' : 'text-grey hover:text-navy'
                }`
              }
            >
              <Icon size={18} />
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
