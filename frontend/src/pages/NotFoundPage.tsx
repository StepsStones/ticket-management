import React from 'react';
import { FileQuestion, ArrowLeft, Home, Ticket, HelpCircle } from 'lucide-react';

interface NotFoundPageProps {
  onNavigateDashboard: () => void;
  onNavigateTickets?: () => void;
  title?: string;
  message?: string;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({
  onNavigateDashboard,
  onNavigateTickets,
  title = "Page or Ticket Not Found",
  message = "The ticket record or page route you requested does not exist, has been moved, or you may not possess the required clearance to view it."
}) => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-12 text-center animate-fade-in">
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shadow-inner">
          <FileQuestion className="w-12 h-12 stroke-[1.75]" />
        </div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold border-2 border-white shadow-xs">
          404
        </div>
      </div>

      <div className="max-w-md space-y-2">
        <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
          Resource Unavailable
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {title}
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed pt-1">
          {message}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
        <button
          onClick={onNavigateDashboard}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center space-x-2 transition"
        >
          <Home className="w-4 h-4 text-amber-400" />
          <span>Operational Dashboard</span>
        </button>

        {onNavigateTickets && (
          <button
            onClick={onNavigateTickets}
            className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-xs flex items-center space-x-2 transition"
          >
            <Ticket className="w-4 h-4 text-blue-600" />
            <span>Browse All Tickets</span>
          </button>
        )}
      </div>

      <div className="mt-12 pt-8 border-t border-slate-200/80 max-w-sm text-center">
        <p className="text-xs text-slate-400 flex items-center justify-center space-x-1.5">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>StepsStone CRM &amp; Legal Operations Ticketing Engine</span>
        </p>
      </div>
    </div>
  );
};
