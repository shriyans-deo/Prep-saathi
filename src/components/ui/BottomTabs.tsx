import { NavLink } from 'react-router-dom';

const tabs = [
  { path: '/dashboard', label: 'Home', icon: '📊' },
  { path: '/plan', label: 'Plan', icon: '📋' },
  { path: '/library', label: 'Library', icon: '📚' },
  { path: '/quiz', label: 'Quiz', icon: '🧠' },
  { path: '/proof', label: 'Proof', icon: '📸' },
  { path: '/squad', label: 'Squad', icon: '👥' },
  { path: '/progress', label: 'Progress', icon: '📈' },
];

export default function BottomTabs() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-grey/20 z-50">
      <div className="flex justify-around items-center h-16 px-1">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 text-xs font-medium px-2 py-1 rounded-md transition-colors ${
                isActive ? 'text-blue' : 'text-grey'
              }`
            }
          >
            <span className="text-lg">{tab.icon}</span>
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
