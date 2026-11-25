import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AuditLogItem } from '../types';
import { formatDateTime12h } from '../utils/dateUtils';
import { PaginationControls } from '../components/PaginationControls';
import { ShieldCheck, Search, Filter, RefreshCw, Lock } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  // Pagination (6 per page)
  const PAGE_SIZE = 6;
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs({
        search: search || undefined,
        action: actionFilter || undefined,
        entity_type: entityFilter || undefined,
        page: currentPage,
        limit: PAGE_SIZE,
      });
      setLogs(data.items);
      setTotalCount(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, entityFilter, currentPage]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <span>Immutable System Audit Logs</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographically sealed, read-only operational audit trail of logins, assignments, and ticket operations.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded text-xs font-semibold flex items-center space-x-1">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span>Immutable Records</span>
          </span>
          <button
            onClick={fetchLogs}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition"
            title="Refresh Logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search action, user, or ticket ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
        >
          <option value="">All Actions</option>
          <option value="LOGIN">LOGIN</option>
          <option value="LOGOUT">LOGOUT</option>
          <option value="TICKET_CREATED">TICKET_CREATED</option>
          <option value="TICKET_ASSIGNED">TICKET_ASSIGNED</option>
          <option value="TICKET_REASSIGNED">TICKET_REASSIGNED</option>
          <option value="STATUS_CHANGED">STATUS_CHANGED</option>
          <option value="DOCUMENT_UPLOADED">DOCUMENT_UPLOADED</option>
          <option value="DOCUMENT_DOWNLOADED">DOCUMENT_DOWNLOADED</option>
          <option value="FOLLOWUP_ADDED">FOLLOWUP_ADDED</option>
          <option value="DAILY_UPDATE_SUBMITTED">DAILY_UPDATE_SUBMITTED</option>
          <option value="TICKET_RESOLVED">TICKET_RESOLVED</option>
          <option value="TICKET_CLOSED">TICKET_CLOSED</option>
          <option value="TICKET_REOPENED">TICKET_REOPENED</option>
          <option value="USER_CREATED">USER_CREATED</option>
          <option value="USER_STATUS_TOGGLED">USER_STATUS_TOGGLED</option>
        </select>

        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
        >
          <option value="">All Entity Types</option>
          <option value="Ticket">Ticket</option>
          <option value="User">User</option>
          <option value="Project">Project</option>
          <option value="TicketAttachment">TicketAttachment</option>
          <option value="TicketFollowup">TicketFollowup</option>
          <option value="DailyTicketUpdate">DailyTicketUpdate</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">User</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Entity</th>
                <th className="py-2.5 px-3">Target ID</th>
                <th className="py-2.5 px-3">Previous Value</th>
                <th className="py-2.5 px-3">New Value / Description</th>
                <th className="py-2.5 px-3">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3 px-3"><div className="h-4 bg-slate-200 rounded w-28"></div></td>
                    <td className="py-3 px-3"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                    <td className="py-3 px-3"><div className="h-4 bg-slate-200 rounded w-28"></div></td>
                    <td className="py-3 px-3"><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                    <td className="py-3 px-3"><div className="h-4 bg-slate-200 rounded w-14"></div></td>
                    <td className="py-3 px-3"><div className="h-4 bg-slate-200 rounded w-32"></div></td>
                    <td className="py-3 px-3"><div className="h-4 bg-slate-200 rounded w-48"></div></td>
                    <td className="py-3 px-3"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-500 font-sans">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-semibold text-slate-800">No audit records found</h3>
                      <p className="text-xs text-slate-400 mt-1 mb-4">
                        No cryptographic audit logs match the selected entity or search query.
                      </p>
                      {(search || actionFilter || entityFilter) && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearch('');
                            setActionFilter('');
                            setEntityFilter('');
                          }}
                          className="px-3.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                        >
                          Clear Audit Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap font-sans">
                      {formatDateTime12h(log.created_at)}
                    </td>
                    <td className="py-2.5 px-3 font-sans font-bold text-slate-800">
                      {log.user_name || 'System / Guest'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-600">
                      {log.entity_type}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-blue-700">
                      {log.entity_id || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 truncate max-w-xs">
                      {log.previous_value || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 truncate max-w-sm font-sans">
                      {log.new_value || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {log.ip_address || '127.0.0.1'}
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
          onPageChange={(p) => setCurrentPage(p)}
          itemLabel="audit records"
          loading={loading}
        />
      </div>
    </div>
  );
};
