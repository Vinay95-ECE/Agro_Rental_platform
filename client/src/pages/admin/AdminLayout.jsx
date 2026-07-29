import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { logout } from '../../store/authSlice';
import {
  LayoutDashboard, Users, ShieldCheck, Wrench, Package,
  Leaf, BookOpen, CreditCard, BarChart3, Bell, LogOut,
  ChevronLeft, ChevronRight, Menu, X, Shield, Activity,
  Settings, History
} from 'lucide-react';

const NAV_ITEMS = [
  { key: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'kyc', label: 'KYC Review', icon: ShieldCheck },
  { key: 'tools', label: 'Tools', icon: Wrench },
  { key: 'products', label: 'Products', icon: Package },
  { key: 'crops', label: 'Crops', icon: Leaf },
  { key: 'bookings', label: 'Bookings', icon: BookOpen },
  { key: 'payments', label: 'Payments', icon: CreditCard },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'security', label: 'Security Log', icon: History },
];

const AdminLayout = ({ activeTab, setActiveTab, children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await axios.get('/api/auth/logout'); } catch (_) {}
    dispatch(logout());
    navigate('/admin/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-slate-800/60 ${collapsed ? 'justify-center' : ''}`}>
        <div className="flex-shrink-0 w-8 h-8 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center justify-center">
          <Shield size={16} className="text-emerald-400" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-xs font-extrabold text-white leading-tight">AgriRent</p>
            <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Admin Panel</p>
          </div>
        )}
      </div>

      {/* Admin info */}
      {!collapsed && (
        <div className="px-3 py-3 border-b border-slate-800/40">
          <div className="flex items-center gap-2 bg-slate-800/40 rounded-xl px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-[10px] font-black text-white flex-shrink-0">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-white truncate">{user?.name}</p>
              <p className="text-[9px] text-emerald-400 font-bold">Super Admin</p>
            </div>
            <div className="ml-auto flex-shrink-0 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Online" />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            id={`admin-nav-${key}`}
            onClick={() => { setActiveTab(key); setMobileOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 group
              ${activeTab === key
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white border border-transparent'
              } ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? label : undefined}
          >
            <Icon size={15} className={`flex-shrink-0 transition-transform group-hover:scale-105 ${activeTab === key ? 'text-emerald-400' : ''}`} />
            {!collapsed && <span className="text-xs font-semibold truncate">{label}</span>}
          </button>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className={`px-3 py-3 border-t border-slate-800/60 space-y-0.5`}>
        <button
          onClick={handleLogout}
          id="admin-logout-btn"
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/20 transition-all ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut size={15} className="flex-shrink-0" />
          {!collapsed && <span className="text-xs font-semibold">Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col bg-slate-900/80 backdrop-blur-xl border-r border-slate-800/60 transition-all duration-300 flex-shrink-0
        ${collapsed ? 'w-[60px]' : 'w-56'}`}>
        <SidebarContent />
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute left-0 top-1/2 -translate-y-1/2 translate-x-full bg-slate-800 border border-slate-700 rounded-r-lg p-1 text-slate-400 hover:text-white transition-colors z-20"
          style={{ left: collapsed ? '60px' : '224px' }}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-56 bg-slate-900 border-r border-slate-800 flex flex-col z-10">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between px-4 sm:px-6 h-14 bg-slate-900/60 backdrop-blur-xl border-b border-slate-800/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
            >
              <Menu size={16} />
            </button>
            <div>
              <h2 className="text-sm font-bold text-white capitalize">
                {NAV_ITEMS.find(n => n.key === activeTab)?.label || 'Dashboard'}
              </h2>
              <p className="text-[10px] text-slate-500 hidden sm:block">AgriRent Hub Admin Control Center</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-[10px]">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-400">Live • {new Date().toLocaleDateString('en-IN')}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-[11px] font-bold hover:bg-red-500/20 transition-all"
            >
              <LogOut size={12} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
