import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { TicketListItem, TicketDetail, Project, TicketPriority, TicketCategory, TicketStatus } from '../types';
import { StatusBadge, PriorityBadge, DailyUpdateBadge } from '../components/StatusBadge';
import { EditTicketModal } from '../components/EditTicketModal';
import { PaginationControls } from '../components/PaginationControls';
import { formatDateMedium, formatTime12h } from '../utils/dateUtils';
import { Search, Filter, RefreshCw, Eye, ArrowUpDown, ChevronLeft, ChevronRight, FileText, Copy, Check, Pencil } from 'lucide-react';

interface TicketListProps {
  view: string;
  title: string;
  subtitle?: string;
  onSelectTicket: (ticketId: string) => void;
  initialSearch?: string;
  initialPage?: number;
  onPageChange?: (page: number) => void;
}

export const TicketList: React.FC<TicketListProps> = ({
  view,
  title,
  subtitle,
  onSelectTicket,
  initialSearch = '',
  initialPage = 1,
  onPageChange,
}) => {
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination (6 records per page as requested)
  const PAGE_SIZE = 6;
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Sync initialPage from parent / URL
  useEffect(() => {
    if (initialPage && initialPage !== currentPage) {
      setCurrentPage(initialPage);
    }
  }, [initialPage]);

  // Filters
  const [search, setSearch] = useState(initialSearch);
  const [projectId, setProjectId] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [priority, setPriority] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [isOverdue, setIsOverdue] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingTicket, setEditingTicket] = useState<TicketDetail | null>(null);
  const [loadingEditTicket, setLoadingEditTicket] = useState<string | null>(null);

  const handleOpenEdit = async (e: React.MouseEvent, t: TicketListItem) => {
    e.stopPropagation();
    setLoadingEditTicket(t.id);
    try {
      const fullDetail = await api.getTicketDetail(t.id);
      setEditingTicket(fullDetail);
    } catch (err) {
      console.error('Failed to load ticket details for editing', err);
    } finally {
      setLoadingEditTicket(null);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'UN';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleCopyTicket = (e: React.MouseEvent, ticketNumber: string) => {
    e.stopPropagation();
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(ticketNumber);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = ticketNumber;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
      } catch (err) {
        console.error('Fallback copy failed', err);
      }
      document.body.removeChild(textArea);
    }
    setCopiedId(ticketNumber);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getTickets({
        view,
        search: search || undefined,
        project_id: projectId || undefined,
        category: category || undefined,
        priority: priority || undefined,
        status: status || undefined,
        is_overdue: isOverdue ? true : undefined,
        page: currentPage,
        limit: PAGE_SIZE,
      });
      setTickets(data.items);
      setTotalCount(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error('Failed to fetch tickets', err);
    } finally {
      setLoading(false);
    }
  }, [view, search, projectId, category, priority, status, isOverdue, currentPage]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (onPageChange) {
      onPageChange(newPage);
    }
  };

  const handleFilterUpdate = (setter: (val: string) => void, val: string) => {
    setter(val);
    setCurrentPage(1);
    if (onPageChange) {
      onPageChange(1);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    api.getProjects(false).then(setProjects).catch(() => {});
  }, []);

  const categories: TicketCategory[] = [
    'Legal Query',
    'Legal Document Verification',
    'Land Document Issues',
    'Registration Issues',
    'Patta / Chitta / EC Issues',
    'Customer Document Request',
    'Payment-Related Query',
    'Project-Related Complaint',
    'Other',
  ];

  const priorities: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

  const resetFilters = () => {
    setSearch('');
    setProjectId('');
    setCategory('');
    setPriority('');
    setStatus('');
    setIsOverdue(false);
    setCurrentPage(1);
    if (onPageChange) {
      onPageChange(1);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-2.5 min-h-0">
      {/* Consolidated Single-Line Filter & Action Toolbar */}
      <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-2 shrink-0">
        {/* Left Side: Search & Filter Dropdowns in one line */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Search Input */}
          <div className="relative w-44 lg:w-48 xl:w-56 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ID, customer, unit..."
              value={search}
              onChange={(e) => handleFilterUpdate(setSearch, e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
            />
          </div>

          {/* Project Filter */}
          <div className="w-32 lg:w-36 shrink-0">
            <select
              value={projectId}
              onChange={(e) => handleFilterUpdate(setProjectId, e.target.value)}
              className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="w-36 lg:w-40 shrink-0">
            <select
              value={category}
              onChange={(e) => handleFilterUpdate(setCategory, e.target.value)}
              className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="w-28 lg:w-32 shrink-0">
            <select
              value={priority}
              onChange={(e) => handleFilterUpdate(setPriority, e.target.value)}
              className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
            >
              <option value="">All Priorities</option>
              {priorities.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Overdue Filter */}
          <div className="w-32 lg:w-36 shrink-0">
            <select
              value={isOverdue ? 'overdue' : ''}
              onChange={(e) => {
                setIsOverdue(e.target.value === 'overdue');
                setCurrentPage(1);
                if (onPageChange) {
                  onPageChange(1);
                }
              }}
              className={`w-full px-2.5 py-1 bg-slate-50 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition ${
                isOverdue
                  ? 'border-rose-400 bg-rose-50/70 text-rose-700 font-semibold'
                  : 'border-slate-200 text-slate-700'
              }`}
            >
              <option value="">All Deadlines</option>
              <option value="overdue">⚠️ Overdue Tickets</option>
            </select>
          </div>
        </div>

        {/* Right Side: Reset Filter & Refresh Icon in one line */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={resetFilters}
            className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-2 py-0.5 hover:bg-slate-100 rounded-md transition whitespace-nowrap"
            title="Clear all active filters"
          >
            Reset Filters
          </button>

          <button
            onClick={fetchTickets}
            disabled={loading}
            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition shadow-2xs flex items-center justify-center shrink-0"
            title="Refresh ticket list"
            aria-label="Refresh ticket list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tickets Table Card - Fitted to Screen */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex-1 flex flex-col justify-between min-h-0">
        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px] sticky top-0 z-10">
                <th className="py-2.5 px-3">Ticket ID</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Project</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Assigned To</th>
                <th className="py-2.5 px-3">Created</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-2 px-3"><div className="h-4 bg-slate-200 rounded w-28"></div></td>
                    <td className="py-2 px-3"><div className="h-3.5 bg-slate-200 rounded w-36 mb-1"></div><div className="h-3 bg-slate-100 rounded w-24"></div></td>
                    <td className="py-2 px-3"><div className="h-3.5 bg-slate-200 rounded w-28"></div></td>
                    <td className="py-2 px-3"><div className="h-3.5 bg-slate-200 rounded w-32"></div></td>
                    <td className="py-2 px-3"><div className="h-4 bg-slate-200 rounded-full w-16"></div></td>
                    <td className="py-2 px-3"><div className="h-4 bg-slate-200 rounded-full w-20"></div></td>
                    <td className="py-2 px-3"><div className="h-3.5 bg-slate-200 rounded w-24"></div></td>
                    <td className="py-2 px-3"><div className="h-3.5 bg-slate-200 rounded w-20"></div></td>
                    <td className="py-2 px-3 text-right"><div className="h-5 bg-slate-200 rounded w-12 ml-auto"></div></td>
                  </tr>
                ))
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-2.5 text-slate-400">
                        <FileText className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-semibold text-slate-800">No tickets found</h3>
                      <p className="text-xs text-slate-400 mt-0.5 mb-3">
                        No customer issues match the current query or filter criteria.
                      </p>
                      {(search || projectId || category || priority || status) && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearch('');
                            setProjectId('');
                            setCategory('');
                            setPriority('');
                            setStatus('');
                          }}
                          className="px-3 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                        >
                          Clear Active Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => onSelectTicket(t.id)}
                    className="hover:bg-blue-50/40 cursor-pointer transition"
                  >
                    <td className="py-2 px-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <span>{t.ticket_number}</span>
                        <button
                          type="button"
                          onClick={(e) => handleCopyTicket(e, t.ticket_number)}
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                          title={copiedId === t.ticket_number ? 'Copied!' : 'Copy Ticket ID'}
                        >
                          {copiedId === t.ticket_number ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <div className="font-semibold text-slate-900 leading-tight">{t.customer_name}</div>
                      <div className="text-[11px] text-slate-500 leading-tight">{t.customer_mobile}</div>
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-700 max-w-[150px] truncate">
                      {t.project_name || 'General'}
                    </td>
                    <td className="py-2 px-3 text-slate-600 max-w-[160px] truncate">
                      {t.category}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <PriorityBadge priority={t.priority} />
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <StatusBadge status={t.status} />
                        {((t.assigned_to_id && t.daily_update_status === 'OVERDUE') ||
                          (t.due_date &&
                            new Date(t.due_date).setHours(23, 59, 59, 999) < Date.now() &&
                            !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(t.status))) && (
                          <span
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200"
                            title={t.daily_update_status === 'OVERDUE' ? 'Daily progress report is overdue' : 'Resolution target due date has passed'}
                          >
                            Overdue
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                      {t.assigned_to_name ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[9px] flex items-center justify-center shrink-0 border border-blue-200 shadow-2xs">
                            {getInitials(t.assigned_to_name)}
                          </div>
                          <span className="font-medium text-slate-800 text-xs">{t.assigned_to_name}</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 shrink-0"></span>
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                      <div className="leading-tight">{formatDateMedium(t.created_at)}</div>
                      <div className="text-[10px] text-slate-400 leading-tight">
                        {formatTime12h(t.created_at)} • by {t.created_by_name}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          type="button"
                          disabled={loadingEditTicket === t.id}
                          onClick={(e) => handleOpenEdit(e, t)}
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                          title="Edit Ticket"
                        >
                          <Pencil className={`w-3.5 h-3.5 ${loadingEditTicket === t.id ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTicket(t.id);
                          }}
                          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalCount}
          pageSize={PAGE_SIZE}
          onPageChange={handlePageChange}
          itemLabel="tickets"
          loading={loading}
        />
      </div>

      {/* Edit Ticket Modal */}
      {editingTicket && (
        <EditTicketModal
          ticket={editingTicket}
          isOpen={!!editingTicket}
          onClose={() => setEditingTicket(null)}
          onSuccess={fetchTickets}
        />
      )}
    </div>
  );
};
