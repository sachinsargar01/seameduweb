import React from 'react';
import {
  LayoutDashboard,
  Users,
  UploadCloud,
  UserCheck,
  Share2,
  Target,
  Clock,
  BarChart3,
  Settings,
  LogOut,
  GraduationCap,
  Sparkles,
  ChevronRight,
  Shield,
  User,
  Database,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  openImportModal: () => void;
  openGasModal: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: any;
  isAction?: boolean;
  isActionGas?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  openImportModal,
  openGasModal,
}) => {
  const { user, role, logout } = useAuth();

  const adminNavItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'alumni', label: 'All Alumni', icon: Users },
    { id: 'import', label: 'Import Alumni', icon: UploadCloud, isAction: true },
    { id: 'sc-management', label: 'SC Management', icon: UserCheck },
    { id: 'references', label: 'References', icon: Share2 },
    { id: 'leads', label: 'Admission Leads', icon: Target },
    { id: 'followups', label: 'Follow-ups', icon: Clock },
    { id: 'reports', label: 'Reports & Export', icon: BarChart3 },
    { id: 'data-management', label: 'Data Management & Sync', icon: Database },
    { id: 'settings', label: 'Sheets & GAS API', icon: Settings, isActionGas: true },
  ];

  const scNavItems: NavItem[] = [
    { id: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard },
    { id: 'alumni', label: 'My Alumni (Calling)', icon: Users },
    { id: 'followups', label: 'My Follow-ups', icon: Clock },
    { id: 'leads', label: 'My Leads Pipeline', icon: Target },
    { id: 'references', label: 'Referral Links', icon: Share2 },
    { id: 'reports', label: 'My Performance', icon: BarChart3 },
  ];

  const navItems = role === 'ADMIN' ? adminNavItems : scNavItems;

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col h-screen shrink-0 border-r border-slate-800 selection:bg-indigo-500 selection:text-white">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 text-white font-bold tracking-wider">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold tracking-tight text-white truncate">
              SEAMEDU
            </h1>
            <p className="text-xs text-indigo-400 font-medium tracking-wide uppercase">
              Admissions FMS
            </p>
          </div>
        </div>
        <div className="mt-2 text-[10px] font-medium text-slate-400 italic truncate">
          "Industry Defined, Future Aligned"
        </div>
      </div>

      {/* User Identity Box */}
      <div className="p-3 mx-3 mt-3 bg-slate-800/80 rounded-lg border border-slate-700/60">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
          <span className="flex items-center gap-1 font-medium">
            {role === 'ADMIN' ? (
              <Shield className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <User className="w-3.5 h-3.5 text-emerald-400" />
            )}
            Logged as:
          </span>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
              role === 'ADMIN'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            {role === 'ADMIN' ? 'Admin' : 'Counsellor'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'SC'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">{user?.name}</p>
            <p className="text-[10px] text-indigo-300 font-mono">
              {role === 'SC' ? `${user?.id} • Active Desk` : 'Executive Management'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {role === 'ADMIN' ? 'Management Menu' : 'Counsellor Menu'}
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.isAction) {
                  openImportModal();
                } else if (item.isActionGas) {
                  openGasModal();
                } else {
                  setCurrentTab(item.id);
                }
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.isAction ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-300">
                  CSV
                </span>
              ) : (
                isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-200" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Quick Public Form Test Link */}
      <div className="px-3 py-2 border-t border-slate-800/80 bg-slate-900/50">
        <a
          href="#/ref/demo-token-1001"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between px-3 py-2 rounded-md bg-slate-800/60 hover:bg-slate-800 text-[11px] text-slate-300 border border-slate-700/50 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Public Ref Form</span>
          </span>
          <span className="text-[10px] text-indigo-400 font-medium">Preview ↗</span>
        </a>
      </div>

      {/* Footer & Logout */}
      <div className="p-3 border-t border-slate-800 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 uppercase">
            {user?.name.slice(0, 2) || 'SE'}
          </div>
          <div className="overflow-hidden text-left">
            <p className="text-xs font-medium text-slate-200 truncate">{user?.name}</p>
            <p className="text-[10px] text-slate-400 truncate">{user?.username}</p>
          </div>
        </div>
        <button
          onClick={logout}
          title="Sign out"
          className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
