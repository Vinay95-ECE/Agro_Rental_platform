import React, { useState } from 'react';
import axios from 'axios';
import { useToast } from '../../../context/ToastContext';
import { Bell, Send, Users, User, Globe, Loader2 } from 'lucide-react';

const TARGET_OPTIONS = [
  { value: 'all', label: 'All Users', icon: Globe, description: 'Send to every active user on the platform' },
  { value: 'role', label: 'By Role', icon: Users, description: 'Target users with a specific role' },
  { value: 'single', label: 'Single User', icon: User, description: 'Send to one specific user by their email' },
];

const ROLES = ['Farmer', 'Tool Owner', 'Shopkeeper', 'Buyer'];

const NotificationsView = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('all');
  const [role, setRole] = useState('Farmer');
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [foundUser, setFoundUser] = useState(null);
  const [sending, setSending] = useState(false);
  const toast = useToast();

  const lookupUser = async () => {
    if (!userEmail.trim()) { toast.warning('Enter an email to look up.'); return; }
    setLookingUp(true);
    try {
      const res = await axios.get('/api/admin/users', { params: { search: userEmail, limit: 5 } });
      const user = res.data.users?.find(u => u.email === userEmail);
      if (user) {
        setFoundUser(user);
        setUserId(user._id);
        toast.success(`Found: ${user.name}`);
      } else {
        toast.warning('No user found with that exact email.');
        setFoundUser(null);
        setUserId('');
      }
    } catch (err) {
      toast.error('Lookup failed.');
    } finally {
      setLookingUp(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) { toast.warning('Title and message are required.'); return; }
    if (target === 'single' && !userId) { toast.warning('Find a user first.'); return; }

    setSending(true);
    try {
      const payload = { title, message };
      if (target === 'role') payload.role = role;
      if (target === 'single') payload.userId = userId;

      const res = await axios.post('/api/admin/notify', payload);
      if (res.data.success) {
        toast.success(`Notification sent to ${res.data.count} user(s)!`, 'Sent!');
        setTitle('');
        setMessage('');
        setFoundUser(null);
        setUserId('');
        setUserEmail('');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send notification.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="text-lg font-extrabold text-white">Send Notifications</h2>
        <p className="text-xs text-slate-500">Broadcast messages to users via real-time socket + database</p>
      </div>

      <form onSubmit={handleSend} className="space-y-5">
        {/* Target Selection */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Target Audience</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {TARGET_OPTIONS.map(({ value, label, icon: Icon, description }) => (
              <button
                key={value}
                type="button"
                id={`notify-target-${value}`}
                onClick={() => setTarget(value)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  target === value
                    ? 'border-emerald-500/50 bg-emerald-500/10'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                <Icon size={14} className={target === value ? 'text-emerald-400 mb-1.5' : 'text-slate-500 mb-1.5'} />
                <p className={`text-xs font-bold ${target === value ? 'text-emerald-400' : 'text-slate-300'}`}>{label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Role Selector */}
        {target === 'role' && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Select Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all"
              id="notify-role-select"
            >
              {ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
        )}

        {/* User Lookup */}
        {target === 'single' && (
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Find User by Email</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={userEmail}
                onChange={(e) => { setUserEmail(e.target.value); setFoundUser(null); setUserId(''); }}
                placeholder="user@example.com"
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all"
                id="notify-user-email"
              />
              <button
                type="button"
                onClick={lookupUser}
                disabled={lookingUp}
                className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl disabled:opacity-50 transition-all"
              >
                {lookingUp ? <Loader2 size={14} className="animate-spin" /> : 'Find'}
              </button>
            </div>
            {foundUser && (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
                <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white">{foundUser.name?.charAt(0)}</div>
                <div>
                  <p className="text-xs font-bold text-emerald-400">{foundUser.name}</p>
                  <p className="text-[10px] text-slate-400">{foundUser.role} • {foundUser.email}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Notification Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Platform Maintenance Notice"
            maxLength={80}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all"
            id="notify-title"
            required
          />
          <p className="text-[10px] text-slate-600 text-right">{title.length}/80</p>
        </div>

        {/* Message */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your notification message here..."
            rows={5}
            maxLength={500}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 resize-none transition-all"
            id="notify-message"
            required
          />
          <p className="text-[10px] text-slate-600 text-right">{message.length}/500</p>
        </div>

        {/* Preview */}
        {(title || message) && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Preview</p>
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 bg-emerald-500/20 border border-emerald-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <Bell size={14} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">{title || 'Notification Title'}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{message || 'Your message will appear here...'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Send Button */}
        <button
          type="submit"
          id="admin-send-notification-btn"
          disabled={sending}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:cursor-not-allowed"
        >
          {sending ? (
            <><Loader2 size={16} className="animate-spin" /> Sending...</>
          ) : (
            <><Send size={16} /> Send Notification</>
          )}
        </button>
      </form>
    </div>
  );
};

export default NotificationsView;
