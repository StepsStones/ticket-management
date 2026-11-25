import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Project, TicketPriority, TicketCategory, TicketDetail } from '../types';
import { useNotification } from '../context/NotificationContext';
import {
  X,
  Edit3,
  CheckCircle2,
  Building2,
  User,
  AlertCircle,
  Save,
  Check
} from 'lucide-react';

interface EditTicketModalProps {
  ticket: TicketDetail | {
    id: string;
    ticket_number: string;
    customer_name: string;
    customer_mobile: string;
    customer_email?: string;
    project_id?: string;
    unit_or_plot_number?: string;
    category: TicketCategory;
    priority: TicketPriority;
    subject: string;
    description: string;
    due_date?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditTicketModal: React.FC<EditTicketModalProps> = ({
  ticket,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { showToast } = useNotification();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Form Fields
  const [customerName, setCustomerName] = useState(ticket.customer_name || '');
  const [customerMobile, setCustomerMobile] = useState(ticket.customer_mobile || '');
  const [customerEmail, setCustomerEmail] = useState(ticket.customer_email || '');
  const [projectId, setProjectId] = useState<string>(ticket.project_id || '');
  const [unitOrPlot, setUnitOrPlot] = useState(ticket.unit_or_plot_number || '');
  const [category, setCategory] = useState<TicketCategory>(ticket.category || 'Legal Query');
  const [priority, setPriority] = useState<TicketPriority>(ticket.priority || 'MEDIUM');
  const [subject, setSubject] = useState(ticket.subject || '');
  const [description, setDescription] = useState(ticket.description || '');
  const [dueDate, setDueDate] = useState(
    ticket.due_date ? ticket.due_date.slice(0, 10) : ''
  );

  useEffect(() => {
    if (isOpen) {
      setCustomerName(ticket.customer_name || '');
      setCustomerMobile(ticket.customer_mobile || '');
      setCustomerEmail(ticket.customer_email || '');
      setProjectId(ticket.project_id || '');
      setUnitOrPlot(ticket.unit_or_plot_number || '');
      setCategory(ticket.category || 'Legal Query');
      setPriority(ticket.priority || 'MEDIUM');
      setSubject(ticket.subject || '');
      setDescription(ticket.description || '');
      setDueDate(ticket.due_date ? ticket.due_date.slice(0, 10) : '');
      setError(null);
      setIsSuccess(false);

      api
        .getProjects(true)
        .then((data) => setProjects(data))
        .catch(() => {})
        .finally(() => setLoadingProjects(false));
    }
  }, [isOpen, ticket]);

  if (!isOpen) return null;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName.trim() || !customerMobile.trim() || !subject.trim() || !description.trim()) {
      setError('Please fill in all mandatory fields.');
      return;
    }

    setSubmitting(true);
    try {
      await api.updateTicket(ticket.id, {
        customer_name: customerName.trim(),
        customer_mobile: customerMobile.trim(),
        customer_email: customerEmail.trim() || undefined,
        project_id: projectId || undefined,
        unit_or_plot_number: unitOrPlot.trim() || undefined,
        category,
        priority,
        subject: subject.trim(),
        description: description.trim(),
        due_date: dueDate ? `${dueDate}T00:00:00` : undefined,
      });

      setIsSuccess(true);
      showToast(
        'Ticket Edited Successfully',
        `Ticket ${ticket.ticket_number} updated. Audit log recorded with date & time.`,
        'SUCCESS'
      );

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to update ticket');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 relative animate-pop-scale overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Edit Ticket: <span className="font-mono text-blue-600">{ticket.ticket_number}</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                All edits are logged in immutable audit records with author, diffs, date, and timestamp.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Feedback View */}
        {isSuccess ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50/50">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Edited Successfully!</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Ticket details updated. Audit log captured who edited, what changed, and the timestamp.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="overflow-y-auto py-4 space-y-4 flex-1 pr-1 text-xs">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Customer Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Mobile Number *</label>
                <input
                  type="text"
                  required
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Email (Optional)</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>
            </div>

            {/* Project & Unit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">StepsStone Project</label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                >
                  <option value="">General / Non-Project Related</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Unit / Plot Number</label>
                <input
                  type="text"
                  placeholder="e.g. Plot 42 / Villa 10"
                  value={unitOrPlot}
                  onChange={(e) => setUnitOrPlot(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>
            </div>

            {/* Classification */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TicketCategory)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Priority *</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TicketPriority)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Target Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Subject *</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>

            {/* Description */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Detailed Description *</label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{submitting ? 'Saving...' : 'Save & Record Audit'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
