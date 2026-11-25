import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider, useNotification } from './context/NotificationContext';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { ToastBanner } from './components/ToastBanner';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { TicketList } from './pages/TicketList';
import { TicketDetail } from './pages/TicketDetail';
import { CreateTicket } from './pages/CreateTicket';
import { UsersPage } from './pages/UsersPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { formatDateTime12h } from './utils/dateUtils';
import { api } from './services/api';
import { CheckCheck } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { user, loading, isAdmin } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotification();
  // Helper to parse URL state
  const parseUrlState = () => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') || 'dashboard';
    const page = parseInt(params.get('page') || '1', 10);
    const id = params.get('id') || null;
    return {
      tab,
      page: isNaN(page) || page < 1 ? 1 : page,
      id,
    };
  };

  const initialUrl = parseUrlState();
  const [currentTab, setCurrentTab] = useState<string>(initialUrl.tab);
  const [currentPage, setCurrentPage] = useState<number>(initialUrl.page);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(initialUrl.id);
  const [globalSearchTerm, setGlobalSearchTerm] = useState<string>('');

  // Sync state to browser URL bar
  const syncUrl = (tab: string, page: number = 1, ticketId: string | null = null) => {
    const params = new URLSearchParams();
    if (tab !== 'dashboard') {
      params.set('tab', tab);
    }
    if (page > 1) {
      params.set('page', String(page));
    }
    if (ticketId) {
      params.set('id', ticketId);
    }
    const qs = params.toString();
    const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    if (window.location.search !== (qs ? `?${qs}` : '')) {
      window.history.pushState({ tab, page, ticketId }, '', newUrl);
    }
  };

  // Listen for browser Back/Forward navigation
  useEffect(() => {
    const onPopState = () => {
      const state = parseUrlState();
      setCurrentTab(state.tab);
      setCurrentPage(state.page);
      setActiveTicketId(state.id);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Badge counts
  const [unassignedCount, setUnassignedCount] = useState<number>(0);
  const [pendingDailyCount, setPendingDailyCount] = useState<number>(0);

  const fetchBadgeCounts = async () => {
    if (!user) return;
    try {
      const data = await api.getDashboardData();
      setUnassignedCount(data.stats.unassigned_tickets);
      setPendingDailyCount(data.stats.pending_daily_updates);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchBadgeCounts();
  }, [user, currentTab, activeTicketId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const handleSelectTab = (tab: string) => {
    setActiveTicketId(null);
    setCurrentTab(tab);
    setCurrentPage(1);
    syncUrl(tab, 1, null);
  };

  const handleSelectTicket = (ticketId: string) => {
    setActiveTicketId(ticketId);
    setCurrentTab('ticket-detail');
    syncUrl('ticket-detail', 1, ticketId);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    syncUrl(currentTab, newPage, activeTicketId);
  };

  const handleGlobalSearch = (term: string) => {
    setGlobalSearchTerm(term);
    setActiveTicketId(null);
    setCurrentTab('all-tickets');
    setCurrentPage(1);
    syncUrl('all-tickets', 1, null);
  };

  const tabTitles: Record<string, string> = {
    dashboard: 'Dashboard',
    'all-tickets': 'All Customer Tickets',
    'create-ticket': 'Create Ticket',
    'unassigned-tickets': 'Unassigned Ticket Allocation',
    'my-created': 'My Created Tickets',
    'my-assigned': 'My Assigned Tickets',
    'follow-ups': 'Customer Follow-ups',
    'daily-updates': 'Pending Daily Updates',
    'resolved-tickets': 'Resolved Customer Tickets',
    'closed-tickets': 'Closed Tickets Archive',
    'notifications-page': 'All Notifications',
    reports: 'Reports & Operational Analytics',
    users: 'Staff & Role Administration',
    projects: 'StepsStone Real Estate Projects',
    'audit-logs': 'Immutable System Audit Logs',
    settings: 'System & Reminder Settings',
    'ticket-detail': 'Ticket Detailed View',
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-800 font-sans">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        unassignedCount={unassignedCount}
        pendingDailyCount={pendingDailyCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Navbar
          pageTitle={tabTitles[currentTab] || 'StepsStone Portal'}
          onNavigateTicket={handleSelectTicket}
          onGlobalSearch={handleGlobalSearch}
        />

        <main className="flex-1 p-3.5 lg:p-4 overflow-y-auto flex flex-col min-h-0">
          {activeTicketId && currentTab === 'ticket-detail' ? (
            <TicketDetail
              ticketId={activeTicketId}
              onBack={() => {
                setActiveTicketId(null);
                setCurrentTab('all-tickets');
                syncUrl('all-tickets', currentPage, null);
              }}
            />
          ) : currentTab === 'dashboard' ? (
            <Dashboard
              onNavigateTab={(tab) => {
                handleSelectTab(tab);
              }}
              onSelectTicket={handleSelectTicket}
            />
          ) : currentTab === 'all-tickets' ? (
            <TicketList
              view="all"
              title="All Customer Tickets"
              subtitle="Global repository of legal, land, and project queries across all StepsStone properties."
              onSelectTicket={handleSelectTicket}
              initialSearch={globalSearchTerm}
              initialPage={currentPage}
              onPageChange={handlePageChange}
            />
          ) : currentTab === 'create-ticket' ? (
            <CreateTicket
              onSuccess={(id) => {
                handleSelectTicket(id);
              }}
              onNavigateList={() => {
                handleSelectTab('all-tickets');
              }}
            />
          ) : currentTab === 'unassigned-tickets' ? (
            <TicketList
              view="unassigned"
              title="Unassigned Tickets Queue"
              subtitle="Newly registered customer issues awaiting review and employee allocation."
              onSelectTicket={handleSelectTicket}
              initialPage={currentPage}
              onPageChange={handlePageChange}
            />
          ) : currentTab === 'my-created' ? (
            <TicketList
              view="my_created"
              title="Tickets Created by Me"
              subtitle="Customer issues logged by you into the system."
              onSelectTicket={handleSelectTicket}
              initialPage={currentPage}
              onPageChange={handlePageChange}
            />
          ) : currentTab === 'my-assigned' ? (
            <TicketList
              view="my_assigned"
              title="Tickets Assigned to Me"
              subtitle="Your active case responsibilities and documentation tasks."
              onSelectTicket={handleSelectTicket}
              initialPage={currentPage}
              onPageChange={handlePageChange}
            />
          ) : currentTab === 'follow-ups' ? (
            <TicketList
              view="in_progress"
              title="Active Customer Follow-ups"
              subtitle="Tickets currently requiring customer calls, government surveyor liaison, or approvals."
              onSelectTicket={handleSelectTicket}
              initialPage={currentPage}
              onPageChange={handlePageChange}
            />
          ) : currentTab === 'overdue-tickets' ? (
            <TicketList
              view="overdue"
              title="Overdue Action Tickets"
              subtitle="Tickets past their resolution target deadline or requiring mandatory daily progress reporting."
              onSelectTicket={handleSelectTicket}
              initialPage={currentPage}
              onPageChange={handlePageChange}
            />
          ) : currentTab === 'daily-updates' ? (
            <TicketList
              view="pending_daily"
              title="Pending Daily Ticket Updates"
              subtitle="Active tickets requiring today's progress report before end of business hours."
              onSelectTicket={handleSelectTicket}
              initialPage={currentPage}
              onPageChange={handlePageChange}
            />
          ) : currentTab === 'resolved-tickets' ? (
            <TicketList
              view="resolved"
              title="Resolved Tickets"
              subtitle="Tickets where resolution was completed and awaiting final administrative closure."
              onSelectTicket={handleSelectTicket}
              initialPage={currentPage}
              onPageChange={handlePageChange}
            />
          ) : currentTab === 'closed-tickets' ? (
            <TicketList
              view="closed"
              title="Officially Closed Tickets"
              subtitle="Archived tickets with verified resolutions and client acknowledgment."
              onSelectTicket={handleSelectTicket}
              initialPage={currentPage}
              onPageChange={handlePageChange}
            />
          ) : currentTab === 'notifications-page' ? (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Notification History</h2>
                  <p className="text-xs text-slate-500">
                    Real-time notifications sent via WebSockets and persisted in the database.
                  </p>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold flex items-center space-x-1 transition"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span>Mark All Read</span>
                  </button>
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
                {notifications.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    You have no notifications in your history.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (!n.is_read) markAsRead(n.id);
                        if (n.ticket_id) handleSelectTicket(n.ticket_id);
                      }}
                      className={`p-4 text-xs cursor-pointer hover:bg-slate-50 transition flex items-start justify-between ${!n.is_read ? 'bg-blue-50/40 font-medium' : ''
                        }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 text-sm">{n.title}</span>
                          {!n.is_read && (
                            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                          )}
                        </div>
                        <p className="text-slate-600 leading-relaxed">{n.message}</p>
                        <span className="text-[10px] text-slate-400 block pt-1">
                          {formatDateTime12h(n.created_at)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : currentTab === 'reports' ? (
            <ReportsPage />
          ) : currentTab === 'users' && isAdmin ? (
            <UsersPage />
          ) : currentTab === 'projects' && isAdmin ? (
            <ProjectsPage />
          ) : currentTab === 'audit-logs' && isAdmin ? (
            <AuditLogsPage />
          ) : currentTab === 'settings' ? (
            <SettingsPage />
          ) : currentTab === 'dashboard' ? (
            <Dashboard
              onNavigateTab={(tab) => setCurrentTab(tab)}
              onSelectTicket={handleSelectTicket}
            />
          ) : (
            <NotFoundPage
              onNavigateDashboard={() => setCurrentTab('dashboard')}
              onNavigateTickets={() => setCurrentTab('all-tickets')}
              title="Page Not Found"
              message={`The requested section "${currentTab}" does not exist, has been archived, or you may lack administrative privileges.`}
            />
          )}
        </main>

        {/* Real-time Toast Notifications */}
        <ToastBanner />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <MainLayout />
      </NotificationProvider>
    </AuthProvider>
  );
}
