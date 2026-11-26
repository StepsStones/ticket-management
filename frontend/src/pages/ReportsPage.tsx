import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { DashboardStats, DashboardCharts } from '../types';
import { useNotification } from '../context/NotificationContext';
import {
  BarChart3,
  FileSpreadsheet,
  Building2,
  Layers,
  RefreshCw,
  Ticket,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { showToast } = useNotification();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('Just now');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getDashboardData();
      setStats(res.stats);
      setCharts(res.charts);
      const now = new Date();
      setLastUpdated(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
      );
    } catch (err) {
      console.error('Failed to load reports data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDownloadCsv = async () => {
    setDownloading(true);
    try {
      const blob = await api.exportTicketsCsv();
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `stepsstone_tickets_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast('Export Successful', 'Ticket records exported to CSV successfully.', 'SUCCESS');
    } catch (err: any) {
      showToast('Export Failed', err.message || 'Could not export tickets', 'ERROR');
    } finally {
      setDownloading(false);
    }
  };

  const totalTickets = stats?.total_tickets || 0;
  const inProgressTickets = stats?.in_progress || 0;
  const resolvedTickets = stats?.resolved_tickets || 0;
  const overdueTickets = stats?.overdue_tickets || 0;
  const openOrAssignedTickets = Math.max(0, totalTickets - resolvedTickets - inProgressTickets - overdueTickets);

  const resolutionRate = totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0;
  const overdueRate = totalTickets > 0 ? Math.round((overdueTickets / totalTickets) * 100) : 0;
  const inProgressRate = totalTickets > 0 ? Math.round((inProgressTickets / totalTickets) * 100) : 0;

  const sortedProjects = charts?.by_project ? [...charts.by_project].sort((a, b) => b.value - a.value) : [];
  const sortedCategories = charts?.by_category ? [...charts.by_category].sort((a, b) => b.value - a.value) : [];

  const projectPalette = [
    { bar: 'bg-blue-600', dot: 'bg-blue-600', badge: 'bg-blue-50 text-blue-700 border-blue-100' },
    { bar: 'bg-indigo-600', dot: 'bg-indigo-600', badge: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
    { bar: 'bg-violet-600', dot: 'bg-violet-600', badge: 'bg-violet-50 text-violet-700 border-violet-100' },
    { bar: 'bg-sky-500', dot: 'bg-sky-500', badge: 'bg-sky-50 text-sky-700 border-sky-100' },
    { bar: 'bg-teal-500', dot: 'bg-teal-500', badge: 'bg-teal-50 text-teal-700 border-teal-100' },
    { bar: 'bg-emerald-500', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    { bar: 'bg-slate-400', dot: 'bg-slate-400', badge: 'bg-slate-50 text-slate-700 border-slate-200' },
  ];

  const categoryPalette = [
    { bar: 'bg-amber-500', dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-100' },
    { bar: 'bg-orange-500', dot: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700 border-orange-100' },
    { bar: 'bg-rose-500', dot: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700 border-rose-100' },
    { bar: 'bg-purple-500', dot: 'bg-purple-500', badge: 'bg-purple-50 text-purple-700 border-purple-100' },
    { bar: 'bg-indigo-500', dot: 'bg-indigo-500', badge: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
    { bar: 'bg-blue-500', dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 border-blue-100' },
    { bar: 'bg-emerald-500', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    { bar: 'bg-slate-400', dot: 'bg-slate-400', badge: 'bg-slate-50 text-slate-700 border-slate-200' },
  ];

  // SVG Donut calculation
  const circ = 100.53;
  const resolvedOffset = totalTickets > 0 ? (resolvedTickets / totalTickets) * circ : 0;
  const inProgressOffset = totalTickets > 0 ? (inProgressTickets / totalTickets) * circ : 0;
  const overdueOffset = totalTickets > 0 ? (overdueTickets / totalTickets) * circ : 0;
  const openOffset = Math.max(0, circ - resolvedOffset - inProgressOffset - overdueOffset);

  return (
    <div className="flex flex-col h-full space-y-2.5 min-h-0">
      {/* 1. Unified Executive Top Header & Overview Card */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3.5 shrink-0 space-y-3">
        {/* Header Action Bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Operational Analytics & SLA Intelligence
                </h2>
                {/* <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                  Live Sync
                </span> */}
              </div>
              <p className="text-[11px] text-slate-500 truncate hidden sm:block">
                Turnaround SLA compliance, real estate portfolio allocation & case lifecycle velocity.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200 transition shadow-2xs flex items-center justify-center"
              title={`Last updated at ${lastUpdated}. Click to refresh.`}
              aria-label="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
            <button
              onClick={handleDownloadCsv}
              disabled={downloading}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-2xs transition"
              title="Download full operational tickets archive as CSV"
            >
              {downloading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>{downloading ? 'Exporting...' : 'Export CSV'}</span>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100"></div>

        {/* KPI Columns + Donut Lifecycle Ring */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
          {/* KPI Columns (4 metric columns) */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
            {/* KPI 1: Total Volume */}
            <div className="px-2 first:pl-0 space-y-0.5">
              <div className="flex items-center space-x-1.5 text-slate-500">
                <Ticket className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-[11px] font-semibold">Total Tickets</span>
              </div>
              <div className="text-xl font-extrabold text-slate-900 tracking-tight">
                {totalTickets}
              </div>
              <div className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded inline-block">
                100% Case Base
              </div>
            </div>

            {/* KPI 2: In Progress */}
            <div className="px-2 pt-1.5 sm:pt-0 space-y-0.5">
              <div className="flex items-center space-x-1.5 text-slate-500">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-[11px] font-semibold">In Progress</span>
              </div>
              <div className="text-xl font-extrabold text-indigo-600 tracking-tight">
                {inProgressTickets}
              </div>
              <div className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded inline-block">
                {inProgressRate}% Active Work
              </div>
            </div>

            {/* KPI 3: Resolved */}
            <div className="px-2 pt-1.5 sm:pt-0 space-y-0.5">
              <div className="flex items-center space-x-1.5 text-slate-500">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[11px] font-semibold">Resolved</span>
              </div>
              <div className="text-xl font-extrabold text-emerald-600 tracking-tight">
                {resolvedTickets}
              </div>
              <div className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded inline-block">
                {resolutionRate}% Success Rate
              </div>
            </div>

            {/* KPI 4: Overdue */}
            <div className="px-2 pt-1.5 sm:pt-0 space-y-0.5">
              <div className="flex items-center space-x-1.5 text-slate-500">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span className="text-[11px] font-semibold">Overdue SLA</span>
              </div>
              <div className="text-xl font-extrabold text-rose-600 tracking-tight">
                {overdueTickets}
              </div>
              <div className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded inline-block">
                {overdueRate}% SLA At-Risk
              </div>
            </div>
          </div>

          {/* Donut Lifecycle Ring + Legend (Right side) */}
          <div className="lg:col-span-4 flex items-center justify-between sm:justify-center lg:justify-end gap-3 border-t lg:border-t-0 lg:border-l border-slate-100 pt-2 lg:pt-0 lg:pl-3">
            {/* SVG Donut Ring */}
            <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
              <svg className="w-14 h-14 -rotate-90 transform" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="16" fill="transparent" stroke="#f1f5f9" strokeWidth="3.5" />
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="transparent"
                  stroke="#3b82f6"
                  strokeWidth="3.5"
                  strokeDasharray={`${openOffset} ${circ - openOffset}`}
                  strokeDashoffset="0"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="transparent"
                  stroke="#6366f1"
                  strokeWidth="3.5"
                  strokeDasharray={`${inProgressOffset} ${circ - inProgressOffset}`}
                  strokeDashoffset={`-${openOffset}`}
                />
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="transparent"
                  stroke="#10b981"
                  strokeWidth="3.5"
                  strokeDasharray={`${resolvedOffset} ${circ - resolvedOffset}`}
                  strokeDashoffset={`-${openOffset + inProgressOffset}`}
                />
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="transparent"
                  stroke="#ef4444"
                  strokeWidth="3.5"
                  strokeDasharray={`${overdueOffset} ${circ - overdueOffset}`}
                  strokeDashoffset={`-${openOffset + inProgressOffset + resolvedOffset}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs font-extrabold text-slate-800">{totalTickets}</span>
                <span className="text-[7px] font-medium text-slate-400 uppercase">Cases</span>
              </div>
            </div>

            {/* Legend Chips */}
            <div className="grid grid-cols-2 gap-x-2.5 gap-y-0.5 text-[10px]">
              <div className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                <span className="text-slate-600 font-medium">Open: {openOrAssignedTickets}</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                <span className="text-slate-600 font-medium">In Prog: {inProgressTickets}</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="text-slate-600 font-medium">Resolved: {resolvedTickets}</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <span className="text-slate-600 font-medium">Overdue: {overdueTickets}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Data Breakdown: Two Panels (Cleanly Fitted, All Rows Visible Without Scrollbar / Cut-off) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 min-h-0">
        {/* Left: Project Volume Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3.5 flex flex-col min-h-0">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-xs">StepsStone Project Allocations</h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/70">
              {sortedProjects.length} Projects Total
            </span>
          </div>

          {/* Top Multi-Segment Portfolio Spectrum Bar */}
          {totalTickets > 0 && sortedProjects.length > 0 && (
            <div className="h-1.5 w-full rounded-full overflow-hidden flex gap-0.5 bg-slate-100 my-2 shrink-0">
              {sortedProjects.map((p, idx) => {
                const share = (p.value / totalTickets) * 100;
                const col = projectPalette[idx % projectPalette.length];
                return (
                  <div
                    key={idx}
                    style={{ width: `${share}%` }}
                    className={`${col.bar}`}
                    title={`${p.label}: ${p.value} tickets (${Math.round(share)}%)`}
                  />
                );
              })}
            </div>
          )}

          {/* Data Rows - All fit without scrolling or cut-off */}
          <div className="flex-1 divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="py-1.5 space-y-1 animate-pulse">
                  <div className="h-3 bg-slate-200 rounded w-1/3"></div>
                </div>
              ))
            ) : sortedProjects.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No project tickets recorded.
              </div>
            ) : (
              sortedProjects.map((p, idx) => {
                const actualRank = idx + 1;
                const percent = totalTickets > 0 ? Math.round((p.value / totalTickets) * 100) : 0;
                const col = projectPalette[idx % projectPalette.length];

                return (
                  <div
                    key={idx}
                    className="py-1 px-1.5 rounded-md hover:bg-slate-50 transition-colors flex items-center justify-between text-xs group"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <span
                        className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center shrink-0 border ${actualRank === 1
                            ? 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold shadow-2xs'
                            : actualRank === 2
                              ? 'bg-slate-100 text-slate-700 border-slate-200 font-bold'
                              : 'bg-slate-50 text-slate-500 border-slate-100'
                          }`}
                      >
                        {actualRank}
                      </span>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${col.dot}`} />
                      <span className="font-semibold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                        {p.label}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="text-[10px] font-medium text-slate-400">
                        {percent}%
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${col.badge}`}>
                        {p.value} {p.value === 1 ? 'ticket' : 'tickets'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Category Resolution Metrics */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3.5 flex flex-col min-h-0">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-amber-600" />
              <h3 className="font-bold text-slate-900 text-xs">Category Resolution Breakdown</h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/70">
              {sortedCategories.length} Categories Total
            </span>
          </div>

          {/* Top Multi-Segment Category Spectrum Bar */}
          {totalTickets > 0 && sortedCategories.length > 0 && (
            <div className="h-1.5 w-full rounded-full overflow-hidden flex gap-0.5 bg-slate-100 my-2 shrink-0">
              {sortedCategories.map((c, idx) => {
                const share = (c.value / totalTickets) * 100;
                const col = categoryPalette[idx % categoryPalette.length];
                return (
                  <div
                    key={idx}
                    style={{ width: `${share}%` }}
                    className={`${col.bar}`}
                    title={`${c.label}: ${c.value} requests (${Math.round(share)}%)`}
                  />
                );
              })}
            </div>
          )}

          {/* Data Rows - All fit without scrolling or cut-off */}
          <div className="flex-1 divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="py-1.5 space-y-1 animate-pulse">
                  <div className="h-3 bg-slate-200 rounded w-1/3"></div>
                </div>
              ))
            ) : sortedCategories.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No category metrics recorded.
              </div>
            ) : (
              sortedCategories.map((c, idx) => {
                const actualRank = idx + 1;
                const percent = totalTickets > 0 ? Math.round((c.value / totalTickets) * 100) : 0;
                const col = categoryPalette[idx % categoryPalette.length];

                return (
                  <div
                    key={idx}
                    className="py-1 px-1.5 rounded-md hover:bg-slate-50 transition-colors flex items-center justify-between text-xs group"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <span
                        className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center shrink-0 ${actualRank === 1
                            ? 'bg-amber-100 text-amber-900 border border-amber-300 font-extrabold shadow-2xs'
                            : actualRank === 2
                              ? 'bg-slate-100 text-slate-700 border border-slate-200 font-bold'
                              : 'bg-slate-50 text-slate-500 border border-slate-100'
                          }`}
                      >
                        {actualRank}
                      </span>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${col.dot}`} />
                      <span className="font-semibold text-slate-800 truncate group-hover:text-amber-700 transition-colors">
                        {c.label}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="text-[10px] font-medium text-slate-400">
                        {percent}%
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${col.badge}`}>
                        {c.value} {c.value === 1 ? 'request' : 'requests'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
