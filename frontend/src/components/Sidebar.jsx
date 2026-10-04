import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ListTodo,
  Crosshair,
  GitFork,
  BarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/tasks',        icon: ListTodo,        label: 'My Tasks'     },
  { to: '/focus',        icon: Crosshair,       label: 'Focus Mode'   },
  { to: '/dependencies', icon: GitFork,         label: 'Dependencies' },
  { to: '/analytics',   icon: BarChart2,       label: 'Analytics'    },
  { to: '/settings',    icon: Settings,        label: 'Settings'     },
];

export default function Sidebar({ open, onToggle }) {
  return (
    <aside
      className={`
        flex flex-col bg-slate-800 border-r border-slate-700
        transition-all duration-300 shrink-0
        ${open ? 'w-60' : 'w-16'}
      `}
    >
      {/* Brand */}
      <div className="flex items-center gap-2 h-16 px-4 border-b border-slate-700">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 shrink-0">
          <Zap size={16} className="text-white" />
        </div>
        {open && (
          <span className="font-bold text-lg tracking-tight text-white truncate">
            LifeQueue
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
              transition-colors duration-150 group
              ${isActive
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:bg-slate-700 hover:text-slate-100'
              }
            `}
          >
            <Icon size={18} className="shrink-0" />
            {open && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="p-3 border-t border-slate-700">
        <button
          onClick={onToggle}
          aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
          className="flex items-center justify-center w-full h-9 rounded-lg
                     text-slate-400 hover:bg-slate-700 hover:text-slate-100
                     transition-colors duration-150"
        >
          {open ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>
    </aside>
  );
}
