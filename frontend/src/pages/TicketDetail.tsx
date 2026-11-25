import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  TicketDetail as ITicketDetail,
  User,
  TicketStatus,
  FollowupType,
  TimelineEventType
} from '../types';
import { StatusBadge, PriorityBadge, DailyUpdateBadge } from '../components/StatusBadge';
import { EditTicketModal } from '../components/EditTicketModal';
import { NotFoundPage } from './NotFoundPage';
import { formatDateTime12h, formatTimelineDate, formatDateMedium } from '../utils/dateUtils';
import {
  ArrowLeft,
  UserCheck,
  Building2,
  Phone,
  Mail,
  Home,
  Paperclip,
  Upload,
  Send,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  RotateCcw,
  CheckSquare,
  MessageSquare,
  ShieldAlert,
  ChevronRight,
  Download,
  Copy,
  Check,
  Pencil
} from 'lucide-react';

interface TicketDetailProps {
  ticketId: string;
  onBack: () => void;
}

export const TicketDetail: React.FC<TicketDetailProps> = ({ ticketId, onBack }) => {
  const { user, isAdmin } = useAuth();
  const [ticket, setTicket] = useState<ITicketDetail | null>(null);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticketError, setTicketError] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus>('IN_PROGRESS');
  const [statusNotes, setStatusNotes] = useState('');

  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [followupType, setFollowupType] = useState<string>('Customer Called');
  const [followupDesc, setFollowupDesc] = useState('');
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [internalRemarks, setInternalRemarks] = useState('');

  const [showDailyUpdateModal, setShowDailyUpdateModal] = useState(false);
  const [currentProgress, setCurrentProgress] = useState('');
  const [delayReason, setDelayReason] = useState('');
  const [pendingDependencies, setPendingDependencies] = useState('');
  const [expectedResolutionDate, setExpectedResolutionDate] = useState('');

  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  // Comment input
  const [newComment, setNewComment] = useState('');
  const [isCommentInternal, setIsCommentInternal] = useState(true);

  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyTicketId = (text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
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
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const fetchTicket = useCallback(async () => {
    try {
      setTicketError(false);
      const data = await api.getTicketDetail(ticketId);
      setTicket(data);
    } catch (err) {
      console.error('Failed to load ticket detail', err);
      setTicketError(true);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  useEffect(() => {
    if (isAdmin) {
      api.getUsers({ is_active: true }).then(setEmployees).catch(() => {});
    }
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-9 h-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-medium text-slate-500 animate-pulse">Retrieving ticket details and timeline...</p>
      </div>
    );
  }

  if (ticketError || !ticket) {
    return (
      <NotFoundPage
        onNavigateDashboard={onBack}
        onNavigateTickets={onBack}
        title="Ticket Not Found"
        message={`We could not locate ticket #${ticketId}. It may have been removed or you may have insufficient clearance.`}
      />
    );
  }

  // --- Handlers ---
  const handleAssign = async () => {
    if (!selectedEmployeeId) return;
    try {
      await api.assignTicket(ticket.id, selectedEmployeeId, assignNotes);
      setShowAssignModal(false);
      setAssignNotes('');
      fetchTicket();
    } catch (err: any) {
      alert(err.message || 'Failed to assign ticket');
    }
  };

  const handleStatusChange = async () => {
    try {
      await api.updateTicketStatus(ticket.id, selectedStatus, statusNotes);
      setShowStatusModal(false);
      setStatusNotes('');
      fetchTicket();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleFollowup = async () => {
    if (!followupDesc) return;
    try {
      await api.createFollowup(ticket.id, {
        followup_type: followupType,
        description: followupDesc,
        followup_date: new Date().toISOString().split('T')[0],
        next_followup_date: nextFollowupDate || undefined,
        internal_remarks: internalRemarks || undefined,
      });
      setShowFollowupModal(false);
      setFollowupDesc('');
      setNextFollowupDate('');
      setInternalRemarks('');
      fetchTicket();
    } catch (err: any) {
      alert(err.message || 'Failed to submit follow-up');
    }
  };

  const handleDailyUpdate = async () => {
    if (!currentProgress) return;
    try {
      await api.submitDailyUpdate(ticket.id, {
        current_progress: currentProgress,
        delay_reason: delayReason || undefined,
        pending_dependencies: pendingDependencies || undefined,
        expected_resolution_date: expectedResolutionDate || undefined,
      });
      setShowDailyUpdateModal(false);
      setCurrentProgress('');
      setDelayReason('');
      setPendingDependencies('');
      fetchTicket();
    } catch (err: any) {
      alert(err.message || 'Failed to submit daily update');
    }
  };

  const handleResolve = async () => {
    if (!resolutionNotes) return;
    try {
      await api.resolveTicket(ticket.id, resolutionNotes);
      setShowResolveModal(false);
      setResolutionNotes('');
      fetchTicket();
    } catch (err: any) {
      alert(err.message || 'Failed to resolve ticket');
    }
  };

  const handleClose = async () => {
    if (!confirm('Are you sure you want to officially CLOSE this ticket?')) return;
    try {
      await api.closeTicket(ticket.id);
      fetchTicket();
    } catch (err: any) {
      alert(err.message || 'Failed to close ticket');
    }
  };

  const handleReopen = async () => {
    if (!reopenReason) return;
    try {
      await api.reopenTicket(ticket.id, reopenReason);
      setShowReopenModal(false);
      setReopenReason('');
      fetchTicket();
    } catch (err: any) {
      alert(err.message || 'Failed to reopen ticket');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      await api.uploadAttachment(ticket.id, file);
      fetchTicket();
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await api.addComment(ticket.id, newComment, isCommentInternal);
      setNewComment('');
      fetchTicket();
    } catch (err: any) {
      alert(err.message || 'Failed to add comment');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition"
            title="Back to list"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold font-mono text-blue-700">{ticket.ticket_number}</span>
              <button
                type="button"
                onClick={() => handleCopyTicketId(ticket.ticket_number)}
                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition flex items-center"
                title={copiedId ? 'Copied to clipboard!' : 'Copy Ticket ID'}
              >
                {copiedId ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
              <PriorityBadge priority={ticket.priority} />
              <StatusBadge status={ticket.status} />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Created on {formatDateTime12h(ticket.created_at)} by <span className="font-semibold text-slate-700">{ticket.created_by_name}</span>
            </p>
          </div>
        </div>

        {/* Action quick buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {ticket.status !== 'CLOSED' && (
            <button
              onClick={() => setShowEditModal(true)}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs flex items-center space-x-1.5 transition"
              title="Edit customer, project, priority or ticket details"
            >
              <Pencil className="w-3.5 h-3.5 text-blue-600" />
              <span>Edit Details</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => {
                setSelectedEmployeeId(ticket.assigned_to_id || '');
                setShowAssignModal(true);
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center space-x-1.5 transition"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{ticket.assigned_to_id ? 'Reassign Staff' : 'Assign Employee'}</span>
            </button>
          )}

          {ticket.status !== 'CLOSED' && (
            <button
              onClick={() => setShowFollowupModal(true)}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center space-x-1.5 transition"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Log Follow-up</span>
            </button>
          )}

          {ticket.status !== 'CLOSED' && ticket.status !== 'RESOLVED' && (
            <button
              onClick={() => setShowDailyUpdateModal(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center space-x-1.5 transition"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Daily Progress</span>
            </button>
          )}

          {ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && (
            <button
              onClick={() => setShowResolveModal(true)}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center space-x-1.5 transition"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Resolve Ticket</span>
            </button>
          )}

          {ticket.status === 'RESOLVED' && isAdmin && (
            <button
              onClick={handleClose}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center space-x-1.5 transition"
            >
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Officially Close</span>
            </button>
          )}

          {ticket.status === 'CLOSED' && isAdmin && (
            <button
              onClick={() => setShowReopenModal(true)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center space-x-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reopen Ticket</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Details, Customer, Project, Files, Comments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Subject and Description */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {ticket.category}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-2">{ticket.subject}</h3>
              </div>
            </div>
            <div className="text-sm text-slate-700 bg-slate-50/80 p-4 rounded-lg border border-slate-100 whitespace-pre-line leading-relaxed">
              {ticket.description}
            </div>

            {/* Resolution Banner if resolved */}
            {ticket.resolution_notes && (
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg text-xs space-y-1">
                <div className="font-bold text-teal-900 flex items-center space-x-1.5">
                  <CheckCircle className="w-4 h-4 text-teal-600" />
                  <span>Resolution Notes:</span>
                </div>
                <p className="text-teal-800 whitespace-pre-line leading-relaxed">{ticket.resolution_notes}</p>
                <div className="text-[10px] text-teal-600 mt-1">
                  Resolved by {ticket.resolved_by_name} on {ticket.resolved_at ? formatDateTime12h(ticket.resolved_at) : ''}
                </div>
              </div>
            )}
          </div>

          {/* Customer & Project Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Customer Details */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Customer Information</span>
              </h4>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Customer Name</span>
                  <span className="font-bold text-slate-800 text-sm">{ticket.customer_name}</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-700">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono">{ticket.customer_mobile}</span>
                </div>
                {ticket.customer_email && (
                  <div className="flex items-center space-x-2 text-slate-700">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{ticket.customer_email}</span>
                  </div>
                )}
                {ticket.unit_or_plot_number && (
                  <div className="flex items-center space-x-2 text-slate-700">
                    <Home className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold">{ticket.unit_or_plot_number}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Project Details */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-600" />
                <span>Real Estate Project</span>
              </h4>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Project Name</span>
                  <span className="font-bold text-slate-800 text-sm">{ticket.project_name || 'General Query'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Project Code</span>
                  <span className="font-mono text-slate-700 font-semibold">{ticket.project_code || 'GEN'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Attachments & Documents */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                <span>Supporting Documents ({ticket.attachments.length})</span>
              </h4>
              <label className="cursor-pointer px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold rounded flex items-center space-x-1 transition">
                <Upload className="w-3 h-3" />
                <span>{uploadingFile ? 'Uploading...' : 'Upload File'}</span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploadingFile}
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx"
                />
              </label>
            </div>

            {ticket.attachments.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
                No supporting documents attached yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ticket.attachments.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100/70 transition text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-medium text-slate-800 truncate">{a.original_file_name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {roundSize(a.file_size)} • by {a.uploaded_by_name || 'Staff'}
                      </p>
                    </div>
                    <a
                      href={a.file_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-blue-600 hover:text-blue-800 bg-white rounded border border-slate-200 shadow-2xs transition"
                      title="Download Document"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comments and Communication Thread */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
              <span>Internal Remarks & Comments ({ticket.comments.length})</span>
            </h4>

            {ticket.comments.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                No comments on this ticket yet.
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {ticket.comments.map((c) => (
                  <div key={c.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span className="font-bold text-slate-800">{c.user_name}</span>
                      <span>{formatDateTime12h(c.created_at)}</span>
                    </div>
                    <p className="text-slate-700 whitespace-pre-line leading-relaxed">{c.comment_text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Comment input form */}
            <form onSubmit={handleAddComment} className="pt-2 border-t border-slate-100 flex items-center space-x-2">
              <input
                type="text"
                placeholder="Write an internal comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Post</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column (1 span): Status, Staff Assignment, Deadlines, Follow-ups list */}
        <div className="space-y-6">
          {/* Assignment & Status Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Handling Employee
            </h4>

            {ticket.assigned_to_name ? (
              <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-100 flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-blue-900 text-amber-400 font-bold text-sm flex items-center justify-center shrink-0">
                  {ticket.assigned_to_name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate">{ticket.assigned_to_name}</div>
                  <div className="text-xs text-blue-700">Assigned Case Officer</div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-center">
                <AlertCircle className="w-6 h-6 text-amber-600 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-amber-900">Currently Unassigned</p>
                <p className="text-[11px] text-amber-700 mt-0.5">Awaiting Admin allocation</p>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Target Due Date:</span>
                <span className="font-semibold text-slate-800">
                  {ticket.due_date ? formatDateMedium(ticket.due_date) : 'Not scheduled'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Daily Update:</span>
                <DailyUpdateBadge status={ticket.daily_update_status} />
              </div>
            </div>

            {/* Quick Status changer */}
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setSelectedStatus(ticket.status);
                  setShowStatusModal(true);
                }}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
              >
                Change Workflow Status
              </button>
            </div>
          </div>

          {/* Follow-ups History */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Follow-ups ({ticket.followups.length})</span>
              </h4>
            </div>

            {ticket.followups.length === 0 ? (
              <div className="text-center py-4 text-slate-400 text-xs">
                No follow-ups recorded yet.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {ticket.followups.map((f) => (
                  <div key={f.id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 text-xs space-y-1">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>{f.followup_type}</span>
                      <span className="text-[10px] text-slate-500">{f.followup_date}</span>
                    </div>
                    <p className="text-slate-700 leading-snug">{f.description}</p>
                    {f.next_followup_date && (
                      <span className="inline-block text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        Next: {f.next_followup_date}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Daily Updates History */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>Daily Progress Updates ({ticket.daily_updates.length})</span>
            </h4>

            {ticket.daily_updates.length === 0 ? (
              <div className="text-center py-4 text-slate-400 text-xs">
                No daily updates logged yet.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {ticket.daily_updates.map((d) => (
                  <div key={d.id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 text-xs space-y-1">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>{d.update_date}</span>
                      <span className="text-[10px] text-slate-400">by {d.user_name}</span>
                    </div>
                    <p className="text-slate-700">{d.current_progress}</p>
                    {d.delay_reason && (
                      <p className="text-[11px] text-rose-600 font-medium">Delay: {d.delay_reason}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Complete Chronological Timeline (Crucial Module) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span>Complete Chronological Timeline (Immutable Audit Trail)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Permanent record of every assignment, status change, document upload, and resolution milestone.
          </p>
        </div>

        <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-6">
          {ticket.timeline.map((event, index) => {
            return (
              <div key={event.id || index} className="relative group">
                {/* Timeline node icon */}
                <span className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-blue-600 border-4 border-white shadow-xs group-hover:scale-125 transition"></span>

                <div className="bg-slate-50/80 hover:bg-slate-100/70 p-4 rounded-xl border border-slate-200 transition space-y-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs">
                    <span className="font-bold text-slate-900 text-sm">{event.title}</span>
                    <span className="text-slate-400 font-mono text-[11px] mt-0.5 sm:mt-0">
                      {formatTimelineDate(event.created_at)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed pt-1">{event.description}</p>

                  <div className="pt-1 flex items-center space-x-2 text-[10px] text-slate-400">
                    <span>Logged by: <strong className="text-slate-600">{event.user_name || 'System'}</strong></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= MODALS ================= */}

      {/* Modal: Assign / Reassign */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {ticket.assigned_to_id ? 'Reassign Ticket' : 'Assign Ticket to Staff'}
            </h3>
            <p className="text-xs text-slate-500">
              Select an active employee to take ownership of this customer ticket.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Select Employee</label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.department} - {emp.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Assignment Instructions / Notes</label>
                <textarea
                  rows={3}
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  placeholder="e.g. Please verify patta revenue office records by Friday..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedEmployeeId}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition"
              >
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Status Change */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Update Workflow Status</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">New Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as TicketStatus)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                >
                  <option value="IN_PROGRESS">IN_PROGRESS (Currently being handled)</option>
                  <option value="WAITING_FOR_CUSTOMER">WAITING_FOR_CUSTOMER (Pending customer documents/response)</option>
                  <option value="WAITING_FOR_INTERNAL_TEAM">WAITING_FOR_INTERNAL_TEAM (Pending engineering/accounts)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Remarks</label>
                <textarea
                  rows={3}
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Reason for status change..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusChange}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Follow-up */}
      {showFollowupModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Record Follow-up Communication</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Follow-up Type</label>
                <select
                  value={followupType}
                  onChange={(e) => setFollowupType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                >
                  <option value="Customer Called">Customer Called</option>
                  <option value="Customer Not Reachable">Customer Not Reachable</option>
                  <option value="Document Requested">Document Requested</option>
                  <option value="Document Received">Document Received</option>
                  <option value="Legal Verification">Legal Verification</option>
                  <option value="Internal Discussion">Internal Discussion</option>
                  <option value="Pending Approval">Pending Approval</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Description / Summary</label>
                <textarea
                  rows={3}
                  value={followupDesc}
                  onChange={(e) => setFollowupDesc(e.target.value)}
                  placeholder="Record what was discussed or action taken..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Next Follow-up Date (Optional)</label>
                <input
                  type="date"
                  value={nextFollowupDate}
                  onChange={(e) => setNextFollowupDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowFollowupModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleFollowup}
                disabled={!followupDesc.trim()}
                className="px-4 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg transition"
              >
                Save Follow-up
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Daily Progress Update */}
      {showDailyUpdateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Daily Ticket Progress Update</h3>
            <p className="text-xs text-slate-500">
              Provide your daily progress, delays, and expected completion date for management review.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Current Progress *</label>
                <textarea
                  rows={2}
                  value={currentProgress}
                  onChange={(e) => setCurrentProgress(e.target.value)}
                  placeholder="What work was accomplished today?..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Reason for Delay (if unresolved)</label>
                <input
                  type="text"
                  value={delayReason}
                  onChange={(e) => setDelayReason(e.target.value)}
                  placeholder="e.g. SRO portal maintenance, waiting for survey..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Expected Resolution Date</label>
                <input
                  type="date"
                  value={expectedResolutionDate}
                  onChange={(e) => setExpectedResolutionDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowDailyUpdateModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDailyUpdate}
                disabled={!currentProgress.trim()}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg transition"
              >
                Submit Daily Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Resolve Ticket */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Resolve Customer Ticket</h3>
            <p className="text-xs text-slate-500">
              Describe the final legal resolution, documentation provided, or solution delivered to the customer.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Resolution Summary *</label>
              <textarea
                rows={4}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="e.g. EC generated reflecting clean title, VAO sign-off obtained, delivered copy to customer via courier."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowResolveModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={!resolutionNotes.trim()}
                className="px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg transition"
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reopen Ticket */}
      {showReopenModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Reopen Ticket</h3>
            <p className="text-xs text-slate-500">
              State the mandatory reason for reopening this ticket for further action.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Reopening Reason *</label>
              <textarea
                rows={3}
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="e.g. Customer reported additional Patta name spelling discrepancy..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowReopenModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReopen}
                disabled={!reopenReason.trim()}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg transition"
              >
                Confirm Reopen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Ticket Modal */}
      {ticket && (
        <EditTicketModal
          ticket={ticket}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={fetchTicket}
        />
      )}
    </div>
  );
};

function roundSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
