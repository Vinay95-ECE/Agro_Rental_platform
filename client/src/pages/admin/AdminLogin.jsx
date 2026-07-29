import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { authSuccess } from '../../store/authSlice';
import { useToast } from '../../context/ToastContext';
import { Shield, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Email and password are required.');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post('/api/admin/auth/login', { email, password });
      if (res.data.success) {
        dispatch(authSuccess({ user: res.data.user, token: res.data.token }));
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
        toast.success('Welcome back, Super Admin!', 'Access Granted');
        navigate('/admin/dashboard');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Authentication failed.';
      toast.error(msg, 'Access Denied');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 mb-4 shadow-lg shadow-emerald-500/10">
            <Shield size={36} className="text-emerald-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Super Admin Access</h1>
          <p className="text-slate-500 text-sm mt-1">AgriRent Hub Control Center</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-emerald-500/50" />
            <span className="text-[10px] font-bold text-emerald-500/70 uppercase tracking-widest">Restricted Area</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-emerald-500/50" />
          </div>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Admin Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  id="admin-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@agrirent.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPass ? 'text' : 'password'}
                  id="admin-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-11 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              id="admin-login-btn"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Verifying Identity...
                </>
              ) : (
                <>
                  <Shield size={16} />
                  Access Admin Panel
                </>
              )}
            </button>
          </form>

          {/* Security notice */}
          <div className="mt-6 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
            <p className="text-[10px] text-amber-400/70 text-center leading-relaxed">
              🔒 This portal is restricted to authorized administrators only. All access attempts are logged and monitored.
            </p>
          </div>
        </div>

        {/* Back to main site */}
        <p className="text-center text-xs text-slate-600 mt-6">
          <a href="/" className="hover:text-emerald-400 transition-colors">← Return to AgriRent Hub</a>
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
