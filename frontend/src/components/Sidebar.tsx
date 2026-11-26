import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Ticket,
  PlusCircle,
  Inbox,
  UserCheck,
  CalendarClock,
  Clock,
  CheckCircle2,
  Archive,
  Bell,
  BarChart3,
  Users,
  Building2,
  ShieldCheck,
  Settings,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  unassignedCount?: number;
  pendingDailyCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  unassignedCount = 0,
  pendingDailyCount = 0,
}) => {
  const { isAdmin } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ...(isAdmin ? [{ id: 'all-tickets', label: 'All Tickets', icon: Ticket }] : []),
    { id: 'create-ticket', label: 'Create Ticket', icon: PlusCircle, highlight: true },
    {
      id: 'unassigned-tickets',
      label: 'Unassigned Tickets',
      icon: Inbox,
      badge: unassignedCount > 0 ? unassignedCount : undefined,
      badgeColor: 'bg-amber-500 text-white',
    },
    { id: 'my-created', label: 'My Created Tickets', icon: Ticket },
    { id: 'my-assigned', label: 'My Assigned Tickets', icon: UserCheck },
    { id: 'follow-ups', label: 'Follow-ups', icon: CalendarClock },
    {
      id: 'daily-updates',
      label: 'Daily Updates',
      icon: Clock,
      badge: pendingDailyCount > 0 ? pendingDailyCount : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    { id: 'resolved-tickets', label: 'Resolved Tickets', icon: CheckCircle2 },
    { id: 'closed-tickets', label: 'Closed Tickets', icon: Archive },
    { id: 'notifications-page', label: 'Notifications', icon: Bell },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    ...(isAdmin
      ? [
          { id: 'users', label: 'Users & Staff', icon: Users },
          { id: 'projects', label: 'Projects', icon: Building2 },
          { id: 'audit-logs', label: 'Audit Logs', icon: ShieldCheck },
        ]
      : []),
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0 shrink-0 select-none border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-14 px-4 border-b border-slate-800 flex items-center space-x-3 bg-slate-950/40 shrink-0">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center font-black text-lg shadow-md">
          S
        </div>
        <div>
          <div className="text-sm font-bold tracking-wider text-white uppercase font-sans">
            STEPSSTONE
          </div>
          <div className="text-[10px] text-amber-400 font-medium tracking-tight">
            PROMETERS PVT. LTD.
          </div>
        </div>
      </div>

      {/* Nav items list */}
      <div className="flex-1 overflow-y-auto py-4 pl-3 pr-2 space-y-1 custom-sidebar-scrollbar">
        <div className="px-3 pb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Ticket Operations
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : item.highlight
                  ? 'text-amber-400 hover:bg-slate-800/80 bg-slate-800/40'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.badgeColor || 'bg-slate-700 text-slate-200'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* System Status Footer */}
      <div className="p-3 border-t border-slate-800 text-[11px] bg-slate-950/40 flex items-center justify-between text-slate-400">
        <span className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>System Online</span>
        </span>
        <span className="text-[10px] text-slate-500 font-mono">v1.0.0</span>
      </div>
    </aside>
  );
};
