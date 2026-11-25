export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'EMPLOYEE';

export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: UserRole;
  department: string;
  designation: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  location: string;
  description?: string;
  is_active: boolean;
  ticket_count?: number;
  created_at: string;
  updated_at: string;
}

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TicketStatus = 
  | 'OPEN' 
  | 'ASSIGNED' 
  | 'IN_PROGRESS' 
  | 'WAITING_FOR_CUSTOMER' 
  | 'WAITING_FOR_INTERNAL_TEAM' 
  | 'RESOLVED' 
  | 'CLOSED' 
  | 'REOPENED' 
  | 'CANCELLED';

export type TicketCategory =
  | 'Legal Query'
  | 'Legal Document Verification'
  | 'Land Document Issues'
  | 'Registration Issues'
  | 'Patta / Chitta / EC Issues'
  | 'Customer Document Request'
  | 'Payment-Related Query'
  | 'Project-Related Complaint'
  | 'Other';

export type DailyUpdateStatus = 'NOT_REQUIRED' | 'PENDING' | 'SUBMITTED' | 'OVERDUE';

export interface TicketListItem {
  id: string;
  ticket_number: string;
  customer_name: string;
  customer_mobile: string;
  project_name?: string;
  project_code?: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  created_by_name: string;
  assigned_to_name?: string;
  assigned_to_id?: string;
  created_at: string;
  updated_at: string;
  due_date?: string;
  daily_update_status: DailyUpdateStatus;
  attachment_count: number;
}

export interface Attachment {
  id: string;
  ticket_id: string;
  file_name: string;
  original_file_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  uploaded_by_id: string;
  uploaded_by_name?: string;
  created_at: string;
}

export interface Comment {
  id: string;
  ticket_id: string;
  user_id: string;
  user_name?: string;
  comment_text: string;
  is_internal: boolean;
  created_at: string;
}

export type FollowupType =
  | 'Customer Called'
  | 'Customer Not Reachable'
  | 'Document Requested'
  | 'Document Received'
  | 'Legal Verification'
  | 'Internal Discussion'
  | 'Pending Approval'
  | 'Other';

export type TimelineEventType =
  | 'Ticket Created'
  | 'Ticket Assigned'
  | 'Ticket Reassigned'
  | 'Ticket Viewed'
  | 'Comment Added'
  | 'Document Uploaded'
  | 'Follow-up Scheduled'
  | 'Follow-up Completed'
  | 'Status Changed'
  | 'Daily Update Submitted'
  | 'Resolution Submitted'
  | 'Ticket Reopened'
  | 'Ticket Closed';

export interface Followup {
  id: string;
  ticket_id: string;
  user_id: string;
  user_name?: string;
  followup_type: string;
  description: string;
  followup_date: string;
  followup_time?: string;
  next_followup_date?: string;
  internal_remarks?: string;
  created_at: string;
}

export interface DailyUpdate {
  id: string;
  ticket_id: string;
  user_id: string;
  user_name?: string;
  update_date: string;
  current_progress: string;
  delay_reason?: string;
  pending_dependencies?: string;
  expected_resolution_date?: string;
  next_followup_date?: string;
  created_at: string;
}

export interface TimelineEvent {
  id: string;
  ticket_id: string;
  user_id?: string;
  user_name?: string;
  event_type: string;
  title: string;
  description?: string;
  metadata_json?: string;
  created_at: string;
}

export interface TicketDetail {
  id: string;
  ticket_number: string;
  customer_name: string;
  customer_mobile: string;
  customer_email?: string;
  project_id?: string;
  project_name?: string;
  project_code?: string;
  unit_or_plot_number?: string;
  category: TicketCategory;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  created_by_id: string;
  created_by_name: string;
  assigned_to_id?: string;
  assigned_to_name?: string;
  due_date?: string;
  resolution_notes?: string;
  resolved_by_id?: string;
  resolved_by_name?: string;
  resolved_at?: string;
  closed_by_id?: string;
  closed_by_name?: string;
  closed_at?: string;
  reopened_reason?: string;
  requires_daily_update: boolean;
  daily_update_status: DailyUpdateStatus;
  last_daily_update_at?: string;
  created_at: string;
  updated_at: string;
  attachments: Attachment[];
  comments: Comment[];
  followups: Followup[];
  daily_updates: DailyUpdate[];
  timeline: TimelineEvent[];
}

export interface NotificationItem {
  id: string;
  user_id: string;
  ticket_id?: string;
  ticket_number?: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface AuditLogItem {
  id: string;
  user_id?: string;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  previous_value?: string;
  new_value?: string;
  ip_address?: string;
  created_at: string;
}

export interface DashboardStats {
  total_tickets: number;
  new_tickets: number;
  unassigned_tickets: number;
  assigned_tickets: number;
  in_progress: number;
  waiting_customer: number;
  waiting_internal: number;
  overdue_tickets: number;
  resolved_tickets: number;
  closed_tickets: number;
  pending_daily_updates: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface DashboardCharts {
  by_project: ChartDataPoint[];
  by_category: ChartDataPoint[];
  by_priority: ChartDataPoint[];
  by_status: ChartDataPoint[];
  by_employee: ChartDataPoint[];
  monthly_trend: Array<{ month: string; created: number; resolved: number }>;
}

export interface EmployeeWorkload {
  employee_id: string;
  employee_name: string;
  department: string;
  designation: string;
  total_assigned: number;
  open_tickets: number;
  in_progress: number;
  resolved: number;
  overdue: number;
  pending_daily_updates: number;
}
