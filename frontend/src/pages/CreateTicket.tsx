import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Project, TicketPriority, TicketCategory, TicketDetail, User } from '../types';
import { useNotification } from '../context/NotificationContext';
import {
  FilePlus,
  Building2,
  User as UserIcon,
  UserCheck,
  AlertCircle,
  Send,
  Upload,
  Copy,
  Check,
  X,
  ArrowRight,
  PlusCircle
} from 'lucide-react';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';

interface CreateTicketProps {
  onSuccess: (ticketId: string) => void;
  onNavigateList?: () => void;
}

export const CreateTicket: React.FC<CreateTicketProps> = ({ onSuccess, onNavigateList }) => {
  const { showToast } = useNotification();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Popup Modal State
  const [createdTicket, setCreatedTicket] = useState<TicketDetail | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form Fields
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [unitOrPlot, setUnitOrPlot] = useState('');
  const [category, setCategory] = useState<TicketCategory>('Legal Query');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Optional Employee Assignment
  const [employees, setEmployees] = useState<User[]>([]);
  const [assignedToId, setAssignedToId] = useState<string>('');

  useEffect(() => {
    api
      .getProjects(true)
      .then((data) => setProjects(data))
      .catch((err) => console.error('Failed to load projects', err))
      .finally(() => setLoadingProjects(false));

    api
      .getUsers({ is_active: true })
      .then((data) => setEmployees(data))
      .catch((err) => console.error('Failed to load employees', err));
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
    setCopied(true);

    // Trigger in-app notification popup
    if (createdTicket) {
      showToast(
        `Ticket ID Copied: ${text}`,
        `Customer: ${createdTicket.customer_name} • Category: ${createdTicket.category}`,
        'SUCCESS'
      );
    }

    // Disappear popup smoothly after copying
    setTimeout(() => {
      setShowModal(false);
      resetFormFields();
    }, 900);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    if (createdTicket) {
      showToast(
        `Ticket Created: ${createdTicket.ticket_number}`,
        `Customer: ${createdTicket.customer_name} (${createdTicket.project_name || 'General'})`,
        'TICKET_CREATED'
      );
    }
    resetFormFields();
  };

  const resetFormFields = () => {
    setCustomerName('');
    setCustomerMobile('');
    setCustomerEmail('');
    setProjectId('');
    setUnitOrPlot('');
    setCategory('Legal Query');
    setSubject('');
    setDescription('');
    setPriority('MEDIUM');
    setDueDate('');
    setSelectedFile(null);
    setAssignedToId('');
    setError(null);
    setCopied(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName.trim() || !customerMobile.trim() || !subject.trim() || !description.trim()) {
      setError('Please fill in all mandatory customer and ticket fields.');
      return;
    }

    setSubmitting(true);
    try {
      const newTicket = await api.createTicket({
        customer_name: customerName.trim(),
        customer_mobile: customerMobile.trim(),
        customer_email: customerEmail.trim() || undefined,
        project_id: projectId || undefined,
        unit_or_plot_number: unitOrPlot.trim() || undefined,
        category,
        subject: subject.trim(),
        description: description.trim(),
        priority,
        due_date: dueDate ? `${dueDate}T00:00:00` : undefined,
        assigned_to_id: assignedToId || undefined,
      });

      // If a document was selected, upload it immediately
      if (selectedFile) {
        try {
          await api.uploadAttachment(newTicket.id, selectedFile);
        } catch (uploadErr) {
          console.error('File upload failed after ticket creation', uploadErr);
        }
      }

      // Display the popup modal with tick animation & copy button
      setCreatedTicket(newTicket);
      setShowModal(true);
      setCopied(false);

      // Trigger in-app notification popup
      showToast(
        `New Ticket Created: ${newTicket.ticket_number}`,
        `${newTicket.customer_name} - ${newTicket.subject.slice(0, 50)}...`,
        'TICKET_CREATED'
      );
    } catch (err: any) {
      setError(err.message || 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 relative">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Creation Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Customer Details */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
              <UserIcon className="w-3.5 h-3.5 text-blue-600" />
              <span>1. Customer Information</span>
            </h3>
            <span className="text-[11px] font-mono font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200 shadow-2xs">
              Auto Sequence: SS-TKT-2026-XXXXX
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Customer Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Dr. Sundaramurthy Iyer"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Mobile Number *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. +91 98400 12345"
                value={customerMobile}
                onChange={(e) => setCustomerMobile(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Customer Email (Optional)
              </label>
              <input
                type="email"
                placeholder="customer@domain.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Real Estate Project & Unit */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5 border-b border-slate-100 pb-2">
            <Building2 className="w-3.5 h-3.5 text-amber-600" />
            <span>2. Project & Property Details</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                StepsStone Project
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              >
                <option value="">General / Non-Project Related</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code}) - {p.location}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Unit / Plot Number (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Plot No. 42-B / Villa 12 / Flat 304"
                value={unitOrPlot}
                onChange={(e) => setUnitOrPlot(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Ticket Classification & Details */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5 border-b border-slate-100 pb-2">
            <FilePlus className="w-3.5 h-3.5 text-emerald-600" />
            <span>3. Ticket Classification & Description</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TicketCategory)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Priority *
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              >
                <option value="LOW">Low (General inquiry)</option>
                <option value="MEDIUM">Medium (Standard documentation)</option>
                <option value="HIGH">High (Active registration / SRO deadline)</option>
                <option value="CRITICAL">Critical (Bank loan stoppage / Legal dispute)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Target Resolution Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Ticket Subject *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Sub-Registrar Office Patta Transfer Online Status Pending"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Detailed Description *
            </label>
            <textarea
              required
              rows={4}
              placeholder="Provide complete facts, customer requirements, survey numbers, document dates, or loan urgency..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Supporting Customer Document (PDF, JPG, PNG, DOC, DOCX, XLSX - Max 25MB)
            </label>
            <div className="flex items-center space-x-3">
              <label className="cursor-pointer px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-2 border border-slate-200 transition">
                <Upload className="w-3.5 h-3.5" />
                <span>Choose Document</span>
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx"
                />
              </label>
              {selectedFile ? (
                <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 truncate max-w-xs">
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              ) : (
                <span className="text-xs text-slate-400">No file selected</span>
              )}
            </div>
          </div>
        </div>

        {/* Section 4: Optional Staff Assignment */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>4. Staff Assignment (Optional)</span>
            </h3>
            {assignedToId ? (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Staff Selected
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                Optional
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Assign to Employee / Staff Member
                </label>
                <select
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                >
                  <option value="">Leave Unassigned (Place in allocation queue)</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.department} • {emp.designation})
                    </option>
                  ))}
                </select>
              </div>

              {assignedToId && (
                <button
                  type="button"
                  onClick={() => setAssignedToId('')}
                  className="self-end sm:self-auto mt-auto sm:mt-5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition"
                  title="Remove employee assignment"
                >
                  Clear Assignment
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-500">
              {assignedToId ? (
                <span className="text-emerald-700 font-medium">
                  ✓ Ticket will be assigned directly upon creation with status <strong>ASSIGNED</strong> and push alert dispatched to the employee.
                </span>
              ) : (
                <span>
                  No employee selected. Ticket will be created with status <strong>OPEN</strong> and placed in the unassigned queue for supervisor allocation.
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-500">
            Initial Status:{' '}
            {assignedToId ? (
              <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                ASSIGNED
              </span>
            ) : (
              <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                OPEN (Unassigned)
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow-sm flex items-center space-x-2 transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{submitting ? 'Creating Ticket...' : 'Create & Submit Ticket'}</span>
          </button>
        </div>
      </form>

      {/* ======================================================== */}
      {/* SUCCESS POPUP MODAL WITH TICK ANIMATION & COPY TICKET ID */}
      {/* ======================================================== */}
      {showModal && createdTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-6 sm:p-7 relative animate-pop-scale text-center">
            {/* Top Right Corner 'X' Close Icon */}
            <button
              type="button"
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition"
              title="Close popup"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Elegant SVG Tick Animation */}
            <div className="w-16 h-16 mx-auto mb-3 flex items-center justify-center">
              <svg className="w-16 h-16" viewBox="0 0 52 52">
                <circle className="checkmark-circle" cx="26" cy="26" r="24" fill="none" />
                <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
              </svg>
            </div>

            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
              Ticket Created Successfully!
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Customer: <span className="font-semibold text-slate-700">{createdTicket.customer_name}</span>
              {createdTicket.project_name && (
                <> • <span className="text-slate-600">{createdTicket.project_name}</span></>
              )}
            </p>

            {/* Ticket ID Box & One-Click Copy */}
            <div className="my-5 bg-slate-900 text-white rounded-xl p-4 border border-slate-800 shadow-md flex items-center justify-between">
              <div className="text-left">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Generated Ticket ID
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-amber-400 tracking-wider">
                  {createdTicket.ticket_number}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleCopyTicketId(createdTicket.ticket_number)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition active:scale-95 shadow-sm ${
                  copied
                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
                title="Click to copy Ticket ID and close popup"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy ID</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Meta Badges */}
            <div className="flex items-center justify-center space-x-2 mb-6">
              <PriorityBadge priority={createdTicket.priority} />
              <StatusBadge status={createdTicket.status} />
              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {createdTicket.category}
              </span>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleCloseModal}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition"
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  onSuccess(createdTicket.id);
                }}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-sm transition flex items-center justify-center space-x-1.5"
              >
                <span>View Ticket</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
