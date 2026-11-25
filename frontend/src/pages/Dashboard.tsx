import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { DashboardStats, DashboardCharts, TicketListItem } from '../types';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import { formatDateMedium } from '../utils/dateUtils';
import {
  Ticket,
  Clock,
  Inbox,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  Archive,
  Hourglass,
  ArrowRight,
  TrendingUp,
  Building2,
  Layers,
  ShieldAlert
} from 'lucide-react';

interface DashboardProps {
  onNavigateTab: (tab: string) => void;
  onSelectTicket: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateTab, onSelectTicket }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [recentUnassigned, setRecentUnassigned] = useState<TicketListItem[]>([]);
  const [recentOverdue, setRecentOverdue] = useState<TicketListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [dashDataRes, unassignedRes, overdueRes] = await Promise.allSettled([
          api.getDashboardData(),
          api.getTickets({ view: 'unassigned', limit: 5 }),
          api.getTickets({ view: 'overdue', limit: 5 }),
        ]);
        if (dashDataRes.status === 'fulfilled') {
          setStats(dashDataRes.value.stats);
          setCharts(dashDataRes.value.charts);
        }
        if (unassignedRes.status === 'fulfilled') {
          setRecentUnassigned(unassignedRes.value.items);
        }
        if (overdueRes.status === 'fulfilled') {
          setRecentOverdue(overdueRes.value.items);
        }
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const cards = [
    { label: 'Total Tickets', value: stats?.total_tickets || 0, icon: Ticket, color: 'text-blue-600', bg: 'bg-blue-50', tab: 'all-tickets' },
    { label: 'New / Open', value: stats?.new_tickets || 0, icon: Clock, color: 'text-emerald-600', bg: 'bg-emerald-50', tab: 'all-tickets' },
    { label: 'Unassigned', value: stats?.unassigned_tickets || 0, icon: Inbox, color: 'text-amber-600', bg: 'bg-amber-50', tab: 'unassigned-tickets', alert: (stats?.unassigned_tickets || 0) > 0 },
    { label: 'Assigned', value: stats?.assigned_tickets || 0, icon: UserCheck, color: 'text-sky-600', bg: 'bg-sky-50', tab: 'my-assigned' },
    { label: 'In Progress', value: stats?.in_progress || 0, icon: Layers, color: 'text-indigo-600', bg: 'bg-indigo-50', tab: 'all-tickets' },
    { label: 'Waiting (Customer)', value: stats?.waiting_customer || 0, icon: Hourglass, color: 'text-orange-600', bg: 'bg-orange-50', tab: 'all-tickets' },
    { label: 'Waiting (Internal)', value: stats?.waiting_internal || 0, icon: Hourglass, color: 'text-purple-600', bg: 'bg-purple-50', tab: 'all-tickets' },
    { label: 'Overdue Tickets', value: stats?.overdue_tickets || 0, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', tab: 'overdue-tickets', alert: (stats?.overdue_tickets || 0) > 0 },
    { label: 'Resolved Tickets', value: stats?.resolved_tickets || 0, icon: CheckCircle2, color: 'text-teal-600', bg: 'bg-teal-50', tab: 'resolved-tickets' },
    { label: 'Closed Tickets', value: stats?.closed_tickets || 0, icon: Archive, color: 'text-slate-600', bg: 'bg-slate-100', tab: 'closed-tickets' },
  ];

  const maxProjectVal = Math.max(...(charts?.by_project.map((p) => p.value) || [1]), 1);
  const maxCategoryVal = Math.max(...(charts?.by_category.map((c) => c.value) || [1]), 1);

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid - 5x2 layout */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              onClick={() => onNavigateTab(c.tab)}
              className={`p-4 bg-white rounded-xl border transition shadow-xs hover:shadow-md cursor-pointer relative overflow-hidden group ${
                c.alert ? 'border-amber-300' : 'border-slate-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 leading-tight">{c.label}</span>
                <div className={`w-8 h-8 rounded-lg ${c.bg} ${c.color} flex items-center justify-center shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <div className="text-2xl font-bold text-slate-900 tracking-tight">{c.value}</div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real Estate Projects Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 text-sm flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>Tickets by StepsStone Project</span>
            </h3>
            <span className="text-xs text-slate-400">Database Live Counts</span>
          </div>
          <div className="space-y-3">
            {charts?.by_project.map((proj, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-700 truncate max-w-xs">{proj.label}</span>
                  <span className="font-bold text-slate-900">{proj.value}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(proj.value / maxProjectVal) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ticket Categories Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 text-sm flex items-center space-x-2">
              <Layers className="w-4 h-4 text-amber-600" />
              <span>Tickets by Legal & Documentation Category</span>
            </h3>
            <span className="text-xs text-slate-400">Category Breakdown</span>
          </div>
          <div className="space-y-3">
            {charts?.by_category.map((cat, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-700 truncate max-w-xs">{cat.label}</span>
                  <span className="font-bold text-slate-900">{cat.value}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(cat.value / maxCategoryVal) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tickets by Priority & Status */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <h3 className="font-semibold text-slate-800 text-sm mb-4 flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>Priority Breakdown</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {charts?.by_priority.map((p, idx) => (
              <div key={idx} className="p-3 rounded-lg border border-slate-100 bg-slate-50 text-center">
                <div className="text-xs font-semibold text-slate-500">{p.label}</div>
                <div className="text-xl font-bold text-slate-900 mt-1">{p.value}</div>
              </div>
            ))}
          </div>

          <h4 className="font-semibold text-slate-800 text-xs mt-6 mb-3">Status Distribution</h4>
          <div className="flex flex-wrap gap-2">
            {charts?.by_status.map((st, idx) => (
              <div key={idx} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span className="text-slate-700 font-medium">{st.label}:</span>
                <span className="font-bold text-slate-900">{st.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Employee Workload Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <h3 className="font-semibold text-slate-800 text-sm mb-4 flex items-center space-x-2">
            <UserCheck className="w-4 h-4 text-sky-600" />
            <span>Employee Active Workload</span>
          </h3>
          <div className="space-y-3">
            {charts?.by_employee.map((emp, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                    {emp.label.charAt(0)}
                  </div>
                  <span className="text-xs font-semibold text-slate-800">{emp.label}</span>
                </div>
                <div className="text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
                    {emp.value} {emp.value === 1 ? 'ticket' : 'tickets'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Queues: Unassigned & Overdue Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unassigned Action Queue */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Action Required: Unassigned Tickets</h3>
              <p className="text-xs text-slate-500">Requires Admin review and assignment</p>
            </div>
            <button
              onClick={() => onNavigateTab('unassigned-tickets')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentUnassigned.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                All tickets are currently assigned!
              </div>
            ) : (
              recentUnassigned.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onSelectTicket(t.id)}
                  className="py-3 flex items-center justify-between hover:bg-slate-50/80 px-2 rounded-lg cursor-pointer transition"
                >
                  <div className="space-y-0.5 min-w-0 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-blue-700 font-mono">{t.ticket_number}</span>
                      <PriorityBadge priority={t.priority} />
                    </div>
                    <div className="text-xs font-semibold text-slate-800 truncate">{t.customer_name}</div>
                    <div className="text-[11px] text-slate-500 truncate">{t.project_name} • {t.category}</div>
                  </div>
                  <button className="px-2.5 py-1 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 shrink-0">
                    Assign
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Overdue Action Queue */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm flex items-center space-x-1.5 text-rose-700">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Overdue Tickets</span>
              </h3>
              <p className="text-xs text-slate-500">Target resolution deadline crossed</p>
            </div>
            <button
              onClick={() => onNavigateTab('overdue-tickets')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentOverdue.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Zero overdue tickets! Excellent turnaround time.
              </div>
            ) : (
              recentOverdue.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onSelectTicket(t.id)}
                  className="py-3 flex items-center justify-between hover:bg-slate-50/80 px-2 rounded-lg cursor-pointer transition"
                >
                  <div className="space-y-0.5 min-w-0 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-rose-700 font-mono">{t.ticket_number}</span>
                      <StatusBadge status={t.status} />
                    </div>
                    <div className="text-xs font-semibold text-slate-800 truncate">{t.customer_name}</div>
                    <div className="text-[11px] text-slate-500">
                      Assigned: {t.assigned_to_name || 'Unassigned'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] text-rose-600 font-semibold block">Overdue</span>
                    <span className="text-[10px] text-slate-400">
                      Due: {t.due_date ? formatDateMedium(t.due_date) : 'N/A'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
