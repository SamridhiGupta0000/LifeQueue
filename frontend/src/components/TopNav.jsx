import { useLocation } from 'react-router-dom';
import { Menu, Bell, Search } from 'lucide-react';

const ROUTE_TITLES = {
  '/':             'Dashboard',
  '/tasks':        'My Tasks',
  '/focus':        'Focus Mode',
  '/dependencies': 'Dependencies',
  '/analytics':   'Analytics',
  '/settings':    'Settings',
};

export default function TopNav({ onMenuToggle }) {
  const { pathname } = useLocation();
  const title = ROUTE_TITLES[pathname] ?? 'LifeQueue';

  return (
    <header className="flex items-center h-16 px-6 border-b border-slate-700 bg-slate-800 shrink-0">
      {/* Mobile menu toggle */}
      <button
        onClick={onMenuToggle}
        aria-label="Toggle sidebar"
        className="p-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-slate-100
                   transition-colors mr-4 lg:hidden"
      >
        <Menu size={20} />
      </button>

      {/* Page title */}
      <h1 className="text-lg font-semibold text-slate-100 flex-1">{title}</h1>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <button
          aria-label="Search"
          className="p-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-slate-100 transition-colors"
        >
          <Search size={18} />
        </button>

        {/* Notifications */}
        <button
          aria-label="Notifications"
          className="relative p-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-slate-100 transition-colors"
        >
          <Bell size={18} />
          {/* Badge placeholder */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full" />
        </button>

        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center
                     text-white text-sm font-bold ml-2 cursor-pointer select-none"
          aria-label="User menu"
        >
          U
        </div>
      </div>
    </header>
  );
}
