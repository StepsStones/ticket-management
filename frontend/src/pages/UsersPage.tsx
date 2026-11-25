import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User, EmployeeWorkload, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { PaginationControls } from '../components/PaginationControls';
import { Users, Plus, Shield, UserX, UserCheck, RefreshCw, Briefcase, Mail, Phone, UserPlus } from 'lucide-react';

export const UsersPage: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const { showToast } = useNotification();
  const [users, setUsers] = useState<User[]>([]);
  const [workload, setWorkload] = useState<EmployeeWorkload[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination (6 users per page)
  const PAGE_SIZE = 6;
  const [userPage, setUserPage] = useState(1);

  // New User Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('EMPLOYEE');
  const [department, setDepartment] = useState('Legal Operations');
  const [designation, setDesignation] = useState('Legal Executive');
  const [phone, setPhone] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [u, w] = await Promise.all([
        api.getUsers(),
        api.getEmployeeWorkload(),
      ]);
      setUsers(u);
      setWorkload(w);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleStatus = async (user: User) => {
    const action = user.is_active ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} user ${user.full_name}?`)) return;
    try {
      await api.toggleUserStatus(user.id);
      showToast(
        'Account Status Updated',
        `User ${user.full_name} has been ${user.is_active ? 'deactivated' : 'activated'}.`,
        'SUCCESS'
      );
      loadData();
    } catch (err: any) {
      showToast('Action Failed', err.message || 'Operation failed', 'ERROR');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createUser({
        full_name: fullName,
        username,
        email,
        password,
        role,
        department,
        designation,
        phone: phone || undefined,
        is_active: true,
      });
      setShowAddModal(false);
      setFullName('');
      setUsername('');
      setEmail('');
      setPassword('');
      setPhone('');
      showToast(
        'User Account Created',
        `Successfully registered staff member ${fullName}.`,
        'SUCCESS'
      );
      loadData();
    } catch (err: any) {
      showToast('Creation Failed', err.message || 'Failed to create user', 'ERROR');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>Staff & User Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor employee ticket workload, manage permissions, and add team members.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={loadData}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New User</span>
          </button>
        </div>
      </div>

      {/* Employee Workload Monitoring Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div>
          <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-1.5">
            <Briefcase className="w-4 h-4 text-sky-600" />
            <span>Employee Workload & Performance Monitoring</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Real-time status of assigned customer tickets across staff</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-3">Employee Name</th>
                <th className="py-2.5 px-3">Department & Role</th>
                <th className="py-2.5 px-3 text-center">Total Assigned</th>
                <th className="py-2.5 px-3 text-center">Open</th>
                <th className="py-2.5 px-3 text-center">In Progress</th>
                <th className="py-2.5 px-3 text-center">Overdue</th>
                <th className="py-2.5 px-3 text-center">Resolved</th>
                <th className="py-2.5 px-3 text-center">Pending Daily</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3 px-3"><div className="h-4 bg-slate-200 rounded w-28"></div></td>
                    <td className="py-3 px-3"><div className="h-4 bg-slate-200 rounded w-36"></div></td>
                    <td className="py-3 px-3 text-center"><div className="h-4 bg-slate-200 rounded w-8 mx-auto"></div></td>
                    <td className="py-3 px-3 text-center"><div className="h-4 bg-slate-200 rounded w-8 mx-auto"></div></td>
                    <td className="py-3 px-3 text-center"><div className="h-4 bg-slate-200 rounded w-8 mx-auto"></div></td>
                    <td className="py-3 px-3 text-center"><div className="h-4 bg-slate-200 rounded w-8 mx-auto"></div></td>
                    <td className="py-3 px-3 text-center"><div className="h-4 bg-slate-200 rounded w-8 mx-auto"></div></td>
                    <td className="py-3 px-3 text-center"><div className="h-4 bg-slate-200 rounded w-8 mx-auto"></div></td>
                  </tr>
                ))
              ) : workload.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No active employee assignments recorded yet.
                  </td>
                </tr>
              ) : (
                workload.map((w) => (
                  <tr key={w.employee_id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-bold text-slate-800">{w.employee_name}</td>
                    <td className="py-2.5 px-3 text-slate-500">{w.department} - {w.designation}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-blue-700">{w.total_assigned}</td>
                    <td className="py-2.5 px-3 text-center font-semibold text-emerald-600">{w.open_tickets}</td>
                    <td className="py-2.5 px-3 text-center font-semibold text-indigo-600">{w.in_progress}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-red-600">{w.overdue}</td>
                    <td className="py-2.5 px-3 text-center font-semibold text-teal-600">{w.resolved}</td>
                    <td className="py-2.5 px-3 text-center">
                      {w.pending_daily_updates > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                          {w.pending_daily_updates}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Users List & Access Control */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div>
          <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-1.5">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>All System Accounts ({users.length})</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Activate or deactivate employee accounts and configure roles</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-3">User</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Contact</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3 px-3"><div className="h-4 bg-slate-200 rounded w-32 mb-1"></div><div className="h-3 bg-slate-100 rounded w-20"></div></td>
                    <td className="py-3 px-3"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                    <td className="py-3 px-3"><div className="h-4 bg-slate-200 rounded w-36 mb-1"></div><div className="h-3 bg-slate-100 rounded w-24"></div></td>
                    <td className="py-3 px-3"><div className="h-5 bg-slate-200 rounded-full w-16"></div></td>
                    <td className="py-3 px-3 text-right"><div className="h-6 bg-slate-200 rounded w-16 ml-auto"></div></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No system users found.
                  </td>
                </tr>
              ) : (
                users.slice((userPage - 1) * PAGE_SIZE, userPage * PAGE_SIZE).map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{u.full_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">@{u.username}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 space-y-0.5">
                      <div>{u.email}</div>
                      <div className="text-[11px] text-slate-400">{u.phone || 'No phone'}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      {u.is_active ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-700 border border-red-200">
                          Deactivated
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                          u.is_active
                            ? 'text-red-600 hover:bg-red-50 border border-red-200'
                            : 'text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                        }`}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <PaginationControls
          currentPage={userPage}
          totalPages={Math.max(1, Math.ceil(users.length / PAGE_SIZE))}
          totalItems={users.length}
          pageSize={PAGE_SIZE}
          onPageChange={setUserPage}
          itemLabel="users"
          loading={loading}
        />
      </div>

      {/* Modal: Create User */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Add New Staff Account</h3>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    placeholder="ramesh"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="ADMIN">Admin / Legal Officer</option>
                    {isSuperAdmin && <option value="SUPER_ADMIN">Super Admin</option>}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="ramesh@stepsstone.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Designation</label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
