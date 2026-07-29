import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useToast } from '../../../context/ToastContext';
import { useSelector } from 'react-redux';
import { History, RefreshCw, Shield, MapPin, Monitor, Clock } from 'lucide-react';

const SecurityView = () => {
  const [loginHistory, setLoginHistory] = useState([]);
  const [adminInfo, setAdminInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useSelector(state => state.auth);
  const toast = useToast();

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/login-history');
      if (res.data.success) {
        setLoginHistory(res.data.loginActivity || []);
        setAdminInfo(res.data.admin);
      }
    } catch (err) {
      toast.error('Failed to load login history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-white">Security & Audit Log</h2>
          <p className="text-xs text-slate-500">Admin login history and IP address tracking</p>
        </div>
        <button onClick={fetchHistory} className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 hover:bg-slate-700 transition-all">
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {/* Admin Info Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <Shield size={20} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">{adminInfo?.name || user?.name}</h3>
            <p className="text-xs text-slate-400">{adminInfo?.email || user?.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Super Admin</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {[
            { label: 'Total Logins', value: loginHistory.length, icon: History },
            { label: 'Last IP', value: loginHistory[0]?.ip?.split(':').pop() || '—', icon: MapPin },
            { label: 'Browser', value: loginHistory[0]?.userAgent?.split(' ').slice(-2)[0]?.replace(/\/.+/, '') || '—', icon: Monitor },
            { label: 'Last Login', value: loginHistory[0]?.timestamp ? new Date(loginHistory[0].timestamp).toLocaleDateString('en-IN') : '—', icon: Clock },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-slate-800/50 rounded-xl p-3">
              <Icon size={14} className="text-emerald-400 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-white truncate">{value}</p>
              <p className="text-[9px] text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Security Features */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
        <h4 className="text-sm font-bold text-white mb-3">Active Security Measures</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { label: 'JWT Authentication', active: true },
            { label: 'Secure HTTP Cookies', active: true },
            { label: 'Role-Based Access (RBAC)', active: true },
            { label: 'Helmet.js Protection', active: true },
            { label: 'Rate Limiting', active: true },
            { label: 'MongoDB Sanitization', active: true },
            { label: 'XSS Protection', active: true },
            { label: 'CORS Policy', active: true },
            { label: 'IP Address Logging', active: true },
          ].map(({ label, active }) => (
            <div key={label} className={`flex items-center gap-2 p-2.5 rounded-xl border ${active ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-800 border-slate-700'}`}>
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              <span className={`text-[10px] font-semibold ${active ? 'text-emerald-300' : 'text-slate-500'}`}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Login History Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h4 className="text-sm font-bold text-white">Login History (Last 20)</h4>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-slate-800 rounded-xl animate-pulse" />)}
          </div>
        ) : loginHistory.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-sm">No login history available.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800/50 bg-slate-900/60">
                  {['#', 'IP Address', 'User Agent', 'Date & Time'].map(h => (
                    <th key={h} className="text-left text-[10px] text-slate-500 uppercase font-bold py-2.5 px-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {loginHistory.map((entry, i) => (
                  <tr key={i} className={`hover:bg-slate-800/20 transition-colors ${i === 0 ? 'bg-emerald-500/3' : ''}`}>
                    <td className="py-3 px-5 text-slate-600 font-mono">{i + 1}</td>
                    <td className="py-3 px-5 font-mono text-slate-300">
                      {entry.ip?.split(':').pop() || entry.ip}
                      {i === 0 && <span className="ml-2 text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-bold">Latest</span>}
                    </td>
                    <td className="py-3 px-5 text-slate-500 truncate max-w-[200px]" title={entry.userAgent}>
                      {entry.userAgent?.substring(0, 60)}...
                    </td>
                    <td className="py-3 px-5 text-slate-400 whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleString('en-IN', { hour12: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityView;
