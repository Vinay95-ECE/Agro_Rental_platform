import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useToast } from '../../../context/ToastContext';
import {
  Search, Filter, ChevronLeft, ChevronRight, UserX, UserCheck,
  Trash2, Shield, Key, LogOut, Eye, RefreshCw, X, Check, AlertTriangle
} from 'lucide-react';

const ROLES = ['All', 'Farmer', 'Tool Owner', 'Shopkeeper', 'Buyer'];
const KYC_STATUSES = ['All', 'Not Submitted', 'Pending', 'Approved', 'Rejected'];

const StatusBadge = ({ active, suspended }) => {
  if (suspended) return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">Suspended</span>;
  if (active) return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>;
  return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-700 text-slate-400 border border-slate-600">Inactive</span>;
};

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const UserManagementView = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [kycFilter, setKycFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionModal, setActionModal] = useState(null); // 'suspend' | 'delete' | 'role' | 'password' | 'view'
  const [reason, setReason] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const toast = useToast();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (kycFilter) params.kycStatus = kycFilter;
      const res = await axios.get('/api/admin/users', { params });
      if (res.data.success) {
        setUsers(res.data.users);
        setTotal(res.data.total);
        setPages(res.data.pages);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, kycFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Search debounce
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const openModal = (user, type) => {
    setSelectedUser(user);
    setActionModal(type);
    setReason('');
    setNewRole(user.role);
    setNewPassword('');
  };

  const closeModal = () => { setActionModal(null); setSelectedUser(null); };

  const handleSuspend = async () => {
    setActionLoading(true);
    try {
      const isSuspended = selectedUser.isSuspended;
      await axios.put(`/api/admin/users/${selectedUser._id}/suspend`, {
        suspend: !isSuspended,
        reason: reason || 'Suspended by Admin'
      });
      toast.success(`User ${isSuspended ? 'unsuspended' : 'suspended'} successfully.`);
      closeModal();
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await axios.delete(`/api/admin/users/${selectedUser._id}`);
      toast.success('User deactivated successfully.');
      closeModal();
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoleChange = async () => {
    if (!newRole || newRole === selectedUser.role) { toast.warning('Select a different role.'); return; }
    setActionLoading(true);
    try {
      await axios.put(`/api/admin/users/${selectedUser._id}/role`, { role: newRole });
      toast.success(`Role changed to ${newRole}.`);
      closeModal();
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Role change failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) { toast.warning('Password must be at least 8 characters.'); return; }
    setActionLoading(true);
    try {
      await axios.put(`/api/admin/users/${selectedUser._id}/reset-password`, { newPassword });
      toast.success('Password reset successfully.');
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password reset failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleForceLogout = async (userId) => {
    try {
      await axios.put(`/api/admin/users/${userId}/force-logout`);
      toast.success('User force logged out.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Force logout failed.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-white">User Management</h2>
          <p className="text-xs text-slate-500">{total} total users</p>
        </div>
        <button onClick={fetchUsers} className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 hover:bg-slate-700 transition-all">
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name, email, phone..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all"
            id="admin-user-search"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-all"
          id="admin-user-role-filter"
        >
          {ROLES.map(r => <option key={r} value={r === 'All' ? '' : r}>{r}</option>)}
        </select>
        <select
          value={kycFilter}
          onChange={(e) => { setKycFilter(e.target.value); setPage(1); }}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-all"
          id="admin-user-kyc-filter"
        >
          {KYC_STATUSES.map(k => <option key={k} value={k === 'All' ? '' : k}>{k}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80">
                {['User', 'Email', 'Phone', 'Role', 'KYC', 'Status', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="text-left text-[10px] text-slate-500 uppercase font-bold py-3 px-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="py-3 px-4"><div className="h-4 bg-slate-800 rounded animate-pulse w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">No users found matching filters.</td>
                </tr>
              ) : users.map(u => (
                <tr key={u._id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
                          {u.name?.charAt(0)}
                        </div>
                      )}
                      <span className="font-semibold text-white truncate max-w-[100px]">{u.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-400 truncate max-w-[140px]">{u.email}</td>
                  <td className="py-3 px-4 text-slate-400">{u.phone}</td>
                  <td className="py-3 px-4">
                    <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap">{u.role}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border whitespace-nowrap ${
                      u.kycStatus === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      u.kycStatus === 'Pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      u.kycStatus === 'Rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>{u.kycStatus}</span>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge active={u.isActive} suspended={u.isSuspended} />
                  </td>
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openModal(u, 'suspend')} title={u.isSuspended ? 'Unsuspend' : 'Suspend'} className={`p-1.5 rounded-lg transition-colors ${u.isSuspended ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-amber-400 hover:bg-amber-500/10'}`}>
                        {u.isSuspended ? <UserCheck size={13} /> : <UserX size={13} />}
                      </button>
                      <button onClick={() => openModal(u, 'role')} title="Change Role" className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors">
                        <Shield size={13} />
                      </button>
                      <button onClick={() => openModal(u, 'password')} title="Reset Password" className="p-1.5 rounded-lg text-purple-400 hover:bg-purple-500/10 transition-colors">
                        <Key size={13} />
                      </button>
                      <button onClick={() => handleForceLogout(u._id)} title="Force Logout" className="p-1.5 rounded-lg text-orange-400 hover:bg-orange-500/10 transition-colors">
                        <LogOut size={13} />
                      </button>
                      <button onClick={() => openModal(u, 'delete')} title="Delete User" className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
            <p className="text-[10px] text-slate-500">Showing {users.length} of {total} users</p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-all"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-[11px] text-slate-400 px-2">{page} / {pages}</span>
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-all"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Suspend/Unsuspend Modal */}
      <Modal open={actionModal === 'suspend'} onClose={closeModal} title={selectedUser?.isSuspended ? 'Unsuspend User' : 'Suspend User'}>
        <p className="text-xs text-slate-400 mb-3">
          {selectedUser?.isSuspended
            ? `Reinstate "${selectedUser?.name}"? They will regain full access.`
            : `Suspend "${selectedUser?.name}"? They won't be able to login.`}
        </p>
        {!selectedUser?.isSuspended && (
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for suspension (optional)"
            rows={3}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 resize-none mb-3 transition-all"
          />
        )}
        <div className="flex gap-2">
          <button onClick={closeModal} className="flex-1 py-2 text-xs font-bold bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-all">Cancel</button>
          <button
            onClick={handleSuspend}
            disabled={actionLoading}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all disabled:opacity-50 ${selectedUser?.isSuspended ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-amber-600 text-white hover:bg-amber-500'}`}
          >
            {actionLoading ? 'Processing...' : selectedUser?.isSuspended ? 'Reinstate' : 'Suspend'}
          </button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal open={actionModal === 'delete'} onClose={closeModal} title="Deactivate User">
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
          <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-300">This will permanently deactivate "{selectedUser?.name}"'s account.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={closeModal} className="flex-1 py-2 text-xs font-bold bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-all">Cancel</button>
          <button onClick={handleDelete} disabled={actionLoading} className="flex-1 py-2 text-xs font-bold bg-red-600 text-white rounded-xl hover:bg-red-500 disabled:opacity-50 transition-all">
            {actionLoading ? 'Processing...' : 'Deactivate'}
          </button>
        </div>
      </Modal>

      {/* Role Change Modal */}
      <Modal open={actionModal === 'role'} onClose={closeModal} title="Change User Role">
        <p className="text-xs text-slate-400 mb-3">Change role for "{selectedUser?.name}"</p>
        <select
          value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 mb-3 transition-all"
          id="admin-role-select"
        >
          {['Farmer', 'Tool Owner', 'Shopkeeper', 'Buyer'].map(r => <option key={r}>{r}</option>)}
        </select>
        <div className="flex gap-2">
          <button onClick={closeModal} className="flex-1 py-2 text-xs font-bold bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-all">Cancel</button>
          <button onClick={handleRoleChange} disabled={actionLoading} className="flex-1 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:opacity-50 transition-all">
            {actionLoading ? 'Saving...' : 'Change Role'}
          </button>
        </div>
      </Modal>

      {/* Password Reset Modal */}
      <Modal open={actionModal === 'password'} onClose={closeModal} title="Reset Password">
        <p className="text-xs text-slate-400 mb-3">Set new password for "{selectedUser?.name}"</p>
        <input
          type="text"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="New password (min 8 chars)"
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 mb-3 transition-all"
          id="admin-new-password"
        />
        <div className="flex gap-2">
          <button onClick={closeModal} className="flex-1 py-2 text-xs font-bold bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-all">Cancel</button>
          <button onClick={handleResetPassword} disabled={actionLoading} className="flex-1 py-2 text-xs font-bold bg-purple-600 text-white rounded-xl hover:bg-purple-500 disabled:opacity-50 transition-all">
            {actionLoading ? 'Resetting...' : 'Reset Password'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default UserManagementView;
