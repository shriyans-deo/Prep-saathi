import { NavLink } from 'react-router-dom';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/plan', label: "Today's Plan", icon: '📋' },
  { path: '/library', label: 'Library', icon: '📚' },
  { path: '/quiz', label: 'Quiz', icon: '🧠' },
  { path: '/proof', label: 'Proof', icon: '📸' },
  { path: '/squad', label: 'Squad', icon: '👥' },
  { path: '/progress', label: 'Progress', icon: '📈' },
];

export default function Sidebar() {
  return (
    <aside className="hidden md:flex md:flex-col md:w-60 bg-navy min-h-screen p-4">
      <div className="mb-8 px-2">
        <h1 className="text-xl font-bold text-white">PrepSaathi</h1>
        <p className="text-sky text-xs mt-1">Execution Partner</p>
      </div>
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue text-white'
                  : 'text-grey hover:text-white hover:bg-white/10'
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto px-2 py-3 border-t border-white/10">
        <div className="flex items-center gap-2 text-xs text-grey">
          <span className="inline-block w-2 h-2 rounded-full bg-green-400"></span>
          Synced
        </div>
      </div>
    </aside>
  );
}
