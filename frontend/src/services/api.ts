import {
  User, LoginResponse, Project, TicketListItem, TicketDetail,
  NotificationItem, AuditLogItem, DashboardStats, DashboardCharts, EmployeeWorkload
} from '../types';

const VITE_API_URL = import.meta.env.VITE_API_URL?.trim();
const CLEAN_API_URL = VITE_API_URL ? VITE_API_URL.replace(/\/+$/, '') : '';
export const API_BASE = CLEAN_API_URL ? `${CLEAN_API_URL}/api/v1` : '/api/v1';
export const BACKEND_URL = CLEAN_API_URL;

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

class ApiService {
  private getAccessToken(): string | null {
    return localStorage.getItem('stepsstone_access_token');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('stepsstone_refresh_token');
  }

  private setTokens(access: string, refresh: string) {
    localStorage.setItem('stepsstone_access_token', access);
    localStorage.setItem('stepsstone_refresh_token', refresh);
  }

  public clearTokens() {
    localStorage.removeItem('stepsstone_access_token');
    localStorage.removeItem('stepsstone_refresh_token');
    localStorage.removeItem('stepsstone_user');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    let token = this.getAccessToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    let response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    // Handle token expiration & auto refresh
    if (response.status === 401 && this.getRefreshToken()) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        token = this.getAccessToken();
        headers['Authorization'] = `Bearer ${token}`;
        response = await fetch(`${API_BASE}${endpoint}`, {
          ...options,
          headers,
        });
      }
    }

    if (!response.ok) {
      let errorDetail = 'Request failed';
      try {
        const errorData = await response.json();
        errorDetail = errorData.detail || errorData.message || errorDetail;
      } catch {
        errorDetail = `HTTP ${response.status} ${response.statusText}`;
      }
      throw new Error(errorDetail);
    }

    return response.json();
  }

  private async requestWithMeta<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T; total: number; totalPages: number; currentPage: number }> {
    let token = this.getAccessToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    let response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401 && this.getRefreshToken()) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        token = this.getAccessToken();
        headers['Authorization'] = `Bearer ${token}`;
        response = await fetch(`${API_BASE}${endpoint}`, {
          ...options,
          headers,
        });
      }
    }

    if (!response.ok) {
      let errorDetail = 'Request failed';
      try {
        const errorData = await response.json();
        errorDetail = errorData.detail || errorData.message || errorDetail;
      } catch {
        errorDetail = `HTTP ${response.status} ${response.statusText}`;
      }
      throw new Error(errorDetail);
    }

    const data = await response.json();
    const total =
      parseInt(response.headers.get('X-Total-Count') || '', 10) ||
      (Array.isArray(data) ? data.length : 0);
    const totalPages =
      parseInt(response.headers.get('X-Total-Pages') || '', 10) || 1;
    const currentPage =
      parseInt(response.headers.get('X-Current-Page') || '', 10) || 1;

    return { data, total, totalPages, currentPage };
  }

  private async refreshToken(): Promise<boolean> {
    const refresh = this.getRefreshToken();
    if (!refresh) return false;
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      if (res.ok) {
        const data: LoginResponse = await res.json();
        this.setTokens(data.access_token, data.refresh_token);
        localStorage.setItem('stepsstone_user', JSON.stringify(data.user));
        return true;
      }
    } catch {
      // refresh failed
    }
    this.clearTokens();
    return false;
  }

  // --- Auth Endpoints ---
  async login(username_or_email: string, password: string): Promise<LoginResponse> {
    const data = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username_or_email, password }),
    });
    this.setTokens(data.access_token, data.refresh_token);
    localStorage.setItem('stepsstone_user', JSON.stringify(data.user));
    return data;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      this.clearTokens();
    }
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  // --- Projects ---
  async getProjects(activeOnly = false): Promise<Project[]> {
    return this.request<Project[]>(`/projects/?active_only=${activeOnly}`);
  }

  async createProject(project: Partial<Project>): Promise<Project> {
    return this.request<Project>('/projects/', {
      method: 'POST',
      body: JSON.stringify(project),
    });
  }

  async updateProject(id: string, project: Partial<Project>): Promise<Project> {
    return this.request<Project>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(project),
    });
  }

  async toggleProjectStatus(id: string): Promise<Project> {
    return this.request<Project>(`/projects/${id}/toggle-status`, {
      method: 'PATCH',
    });
  }

  // --- Users ---
  async getUsers(params: { role?: string; is_active?: boolean; search?: string } = {}): Promise<User[]> {
    const q = new URLSearchParams();
    if (params.role) q.append('role', params.role);
    if (params.is_active !== undefined) q.append('is_active', String(params.is_active));
    if (params.search) q.append('search', params.search);
    return this.request<User[]>(`/users/?${q.toString()}`);
  }

  async createUser(user: Partial<User> & { password: string }): Promise<User> {
    return this.request<User>('/users/', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  }

  async updateUser(id: string, user: Partial<User> & { password?: string }): Promise<User> {
    return this.request<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    });
  }

  async toggleUserStatus(id: string): Promise<User> {
    return this.request<User>(`/users/${id}/toggle-status`, {
      method: 'PATCH',
    });
  }

  async getEmployeeWorkload(): Promise<EmployeeWorkload[]> {
    return this.request<EmployeeWorkload[]>('/users/workload/monitoring');
  }

  // --- Tickets ---
  async getTickets(params: {
    view?: string;
    project_id?: string;
    category?: string;
    priority?: string;
    status?: string;
    search?: string;
    is_overdue?: boolean;
    skip?: number;
    limit?: number;
    page?: number;
  } = {}): Promise<PaginatedResult<TicketListItem>> {
    const q = new URLSearchParams();
    if (params.view) q.append('view', params.view);
    if (params.project_id) q.append('project_id', params.project_id);
    if (params.category) q.append('category', params.category);
    if (params.priority) q.append('priority', params.priority);
    if (params.status) q.append('status', params.status);
    if (params.search) q.append('search', params.search);
    if (params.is_overdue !== undefined) q.append('is_overdue', String(params.is_overdue));
    if (params.skip !== undefined) q.append('skip', String(params.skip));
    if (params.limit !== undefined) q.append('limit', String(params.limit));
    if (params.page !== undefined) q.append('page', String(params.page));

    const res = await this.requestWithMeta<TicketListItem[]>(`/tickets/?${q.toString()}`);
    return {
      items: res.data,
      total: res.total,
      page: res.currentPage,
      totalPages: res.totalPages,
    };
  }

  async getTicketDetail(id: string): Promise<TicketDetail> {
    return this.request<TicketDetail>(`/tickets/${id}`);
  }

  async createTicket(ticket: {
    customer_name: string;
    customer_mobile: string;
    customer_email?: string;
    project_id?: string;
    unit_or_plot_number?: string;
    category: string;
    subject: string;
    description: string;
    priority: string;
    due_date?: string;
    assigned_to_id?: string;
  }): Promise<TicketDetail> {
    return this.request<TicketDetail>('/tickets/', {
      method: 'POST',
      body: JSON.stringify(ticket),
    });
  }

  async updateTicket(id: string, ticket: Partial<{
    customer_name: string;
    customer_mobile: string;
    customer_email: string;
    project_id: string;
    unit_or_plot_number: string;
    category: string;
    subject: string;
    description: string;
    priority: string;
    due_date: string;
  }>): Promise<TicketDetail> {
    return this.request<TicketDetail>(`/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(ticket),
    });
  }

  async assignTicket(ticketId: string, assigned_to_id: string, notes?: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/tickets/${ticketId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ assigned_to_id, notes }),
    });
  }

  async updateTicketStatus(ticketId: string, status: string, notes?: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/tickets/${ticketId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    });
  }

  async resolveTicket(ticketId: string, resolution_notes: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/tickets/${ticketId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution_notes }),
    });
  }

  async closeTicket(ticketId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/tickets/${ticketId}/close`, {
      method: 'POST',
    });
  }

  async reopenTicket(ticketId: string, reopened_reason: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/tickets/${ticketId}/reopen`, {
      method: 'POST',
      body: JSON.stringify({ reopened_reason }),
    });
  }

  async uploadAttachment(ticketId: string, file: File): Promise<{ message: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<{ message: string; filename: string }>(`/tickets/${ticketId}/attachments`, {
      method: 'POST',
      body: formData,
    });
  }

  async addComment(ticketId: string, comment_text: string, is_internal = true): Promise<Comment> {
    return this.request<Comment>(`/tickets/${ticketId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ comment_text, is_internal }),
    });
  }

  async createFollowup(ticketId: string, followup: {
    followup_type: string;
    description: string;
    followup_date: string;
    followup_time?: string;
    next_followup_date?: string;
    internal_remarks?: string;
  }): Promise<void> {
    return this.request<void>(`/tickets/${ticketId}/followups/`, {
      method: 'POST',
      body: JSON.stringify(followup),
    });
  }

  async submitDailyUpdate(ticketId: string, update: {
    current_progress: string;
    delay_reason?: string;
    pending_dependencies?: string;
    expected_resolution_date?: string;
    next_followup_date?: string;
  }): Promise<void> {
    return this.request<void>(`/tickets/${ticketId}/daily-updates/`, {
      method: 'POST',
      body: JSON.stringify(update),
    });
  }

  // --- Notifications ---
  async getNotifications(skip = 0, limit = 50): Promise<{ notifications: NotificationItem[]; unread_count: number }> {
    return this.request<{ notifications: NotificationItem[]; unread_count: number }>(`/notifications/?skip=${skip}&limit=${limit}`);
  }

  async markNotificationRead(id: string): Promise<void> {
    return this.request<void>(`/notifications/${id}/read`, { method: 'PATCH' });
  }

  async markAllNotificationsRead(): Promise<void> {
    return this.request<void>('/notifications/mark-all-read', { method: 'POST' });
  }

  // --- Audit Logs ---
  async getAuditLogs(params: {
    action?: string;
    entity_type?: string;
    search?: string;
    skip?: number;
    limit?: number;
    page?: number;
  } = {}): Promise<PaginatedResult<AuditLogItem>> {
    const q = new URLSearchParams();
    if (params.action) q.append('action', params.action);
    if (params.entity_type) q.append('entity_type', params.entity_type);
    if (params.search) q.append('search', params.search);
    if (params.skip !== undefined) q.append('skip', String(params.skip));
    if (params.limit !== undefined) q.append('limit', String(params.limit));
    if (params.page !== undefined) q.append('page', String(params.page));

    const res = await this.requestWithMeta<AuditLogItem[]>(`/audit-logs/?${q.toString()}`);
    return {
      items: res.data,
      total: res.total,
      page: res.currentPage,
      totalPages: res.totalPages,
    };
  }

  // --- Reports & Dashboard ---
  async getDashboardData(): Promise<{ stats: DashboardStats; charts: DashboardCharts }> {
    return this.request<{ stats: DashboardStats; charts: DashboardCharts }>('/reports/dashboard');
  }

  async exportTicketsCsv(): Promise<Blob> {
    const token = this.getAccessToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE}/reports/export-csv`, {
      method: 'GET',
      headers,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Failed to export CSV' }));
      throw new Error(err.detail || 'Failed to export CSV');
    }
    return response.blob();
  }

  getExportCsvUrl(): string {
    const token = this.getAccessToken();
    return `${API_BASE}/reports/export-csv${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  }
}

export const api = new ApiService();
