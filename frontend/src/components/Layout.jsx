import React, { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  LayoutDashboard, 
  Utensils, 
  Receipt, 
  Wallet, 
  Users, 
  LogOut, 
  Menu, 
  X, 
  Moon, 
  Sun 
} from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isManager = user?.role === 'Manager';

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Meal Management', path: '/meals', icon: Utensils },
    { name: 'Deposits', path: '/deposits', icon: Wallet },
    { name: 'Expenses', path: '/expenses', icon: Receipt },
  ];

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex ${isDark ? 'dark' : ''}`}>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 z-30 w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div>
          {/* Logo / Header */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
            <span className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-lg">M</span>
              Mess Master
            </span>
            <button 
              className="md:hidden text-slate-400 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon size={18} />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between px-2 py-2 mb-3 bg-slate-800/40 rounded-lg">
            <div className="overflow-hidden pr-2">
              <p className="text-sm font-medium text-slate-200 truncate">{user?.name}</p>
              <p className="text-xs text-indigo-400 font-semibold">{user?.role}</p>
            </div>
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-slate-900/80 backdrop-blur border-b border-slate-800 flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-slate-400 hover:text-white"
            >
              <Menu size={22} />
            </button>
            <h1 className="text-base font-semibold text-slate-200">
              Mess Management Portal
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-400">Authenticated as</p>
              <p className="text-sm font-medium text-slate-200">{user?.email}</p>
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
