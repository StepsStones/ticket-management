import React from 'react';
import { TicketPriority, TicketStatus, DailyUpdateStatus } from '../types';

export const PriorityBadge: React.FC<{ priority: TicketPriority }> = ({ priority }) => {
  const configs: Record<
    TicketPriority,
    { bg: string; text: string; border: string; dot: string; label: string }
  > = {
    LOW: {
      bg: 'bg-slate-50',
      text: 'text-slate-700',
      border: 'border-slate-200',
      dot: 'bg-slate-400',
      label: 'Low',
    },
    MEDIUM: {
      bg: 'bg-blue-50/70',
      text: 'text-blue-700',
      border: 'border-blue-200/80',
      dot: 'bg-blue-500',
      label: 'Medium',
    },
    HIGH: {
      bg: 'bg-amber-50/80',
      text: 'text-amber-800',
      border: 'border-amber-200/80',
      dot: 'bg-amber-500',
      label: 'High',
    },
    CRITICAL: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      dot: 'bg-red-600',
      label: 'Critical',
    },
  };

  const conf = configs[priority] || configs.MEDIUM;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${conf.bg} ${conf.text} ${conf.border} tracking-wide shadow-2xs`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${conf.dot} mr-1.5 shrink-0`}></span>
      <span>{conf.label}</span>
    </span>
  );
};

export const StatusBadge: React.FC<{ status: TicketStatus }> = ({ status }) => {
  const styles: Record<
    TicketStatus,
    { bg: string; text: string; border: string; dot: string; label: string }
  > = {
    OPEN: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200/80',
      dot: 'bg-emerald-500',
      label: 'Open',
    },
    ASSIGNED: {
      bg: 'bg-sky-50',
      text: 'text-sky-700',
      border: 'border-sky-200/80',
      dot: 'bg-sky-500',
      label: 'Assigned',
    },
    IN_PROGRESS: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200/80',
      dot: 'bg-indigo-500',
      label: 'In Progress',
    },
    WAITING_FOR_CUSTOMER: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200/80',
      dot: 'bg-amber-500',
      label: 'Waiting for Customer',
    },
    WAITING_FOR_INTERNAL_TEAM: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200/80',
      dot: 'bg-purple-500',
      label: 'Waiting for Internal',
    },
    RESOLVED: {
      bg: 'bg-teal-50',
      text: 'text-teal-700',
      border: 'border-teal-200/80',
      dot: 'bg-teal-500',
      label: 'Resolved',
    },
    CLOSED: {
      bg: 'bg-slate-100',
      text: 'text-slate-600',
      border: 'border-slate-200',
      dot: 'bg-slate-400',
      label: 'Closed',
    },
    REOPENED: {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200/80',
      dot: 'bg-rose-500',
      label: 'Reopened',
    },
    CANCELLED: {
      bg: 'bg-zinc-100',
      text: 'text-zinc-600',
      border: 'border-zinc-200',
      dot: 'bg-zinc-400',
      label: 'Cancelled',
    },
  };

  const conf = styles[status] || styles.OPEN;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${conf.bg} ${conf.text} ${conf.border} tracking-wide shadow-2xs whitespace-nowrap`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${conf.dot} mr-1.5 shrink-0`}></span>
      <span>{conf.label}</span>
    </span>
  );
};

export const DailyUpdateBadge: React.FC<{ status: DailyUpdateStatus }> = ({ status }) => {
  if (status === 'NOT_REQUIRED') return null;

  const styles: Record<DailyUpdateStatus, { bg: string; text: string; border: string; label: string }> = {
    NOT_REQUIRED: { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', label: 'Not Required' },
    PENDING: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200/80', label: 'Daily Update Required' },
    SUBMITTED: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200/80', label: 'Update Submitted' },
    OVERDUE: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200/80', label: 'Update Overdue' },
  };

  const conf = styles[status] || styles.PENDING;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${conf.bg} ${conf.text} ${conf.border}`}
    >
      {conf.label}
    </span>
  );
};
