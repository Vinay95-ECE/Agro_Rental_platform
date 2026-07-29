import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useToast } from '../../../context/ToastContext';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const AnalyticsView = () => {
  const [revenue, setRevenue] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const toast = useToast();

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [revRes, userRes] = await Promise.all([
        axios.get('/api/admin/analytics/revenue'),
        axios.get('/api/admin/analytics/users')
      ]);
      if (revRes.data.success) setRevenue(revRes.data);
      if (userRes.data.success) setUserStats(userRes.data);
      if (silent) toast.success('Analytics refreshed.');
    } catch (err) {
      toast.error('Failed to load analytics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const growthPositive = revenue?.growth && !revenue.growth.startsWith('-');

  // Build role breakdown by month for stacked bar
  const buildMonthlyUserData = () => {
    if (!userStats?.monthlyUsers) return [];
    const map = {};
    userStats.monthlyUsers.forEach(d => {
      const key = `${d._id.year}-${String(d._id.month).padStart(2, '0')}`;
      if (!map[key]) map[key] = { month: key };
      map[key][d._id.role] = (map[key][d._id.role] || 0) + d.count;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).map(d => ({
      ...d,
      month: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(d.month.split('-')[1]) - 1]
    }));
  };

  const monthlyUserData = buildMonthlyUserData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white">Analytics & Insights</h2>
          <p className="text-xs text-slate-500 mt-0.5">Powered by live MongoDB aggregations</p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 hover:bg-slate-700 transition-all"
          id="analytics-refresh-btn"
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Revenue KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `₹${(revenue?.totalRevenue || 0).toLocaleString('en-IN')}`, color: 'text-emerald-400' },
          { label: 'This Month', value: `₹${(revenue?.thisMonthRevenue || 0).toLocaleString('en-IN')}`, color: 'text-blue-400' },
          { label: 'Last Month', value: `₹${(revenue?.lastMonthRevenue || 0).toLocaleString('en-IN')}`, color: 'text-slate-300' },
          { label: 'MoM Growth', value: revenue?.growth || '0%', color: growthPositive ? 'text-emerald-400' : 'text-red-400', icon: growthPositive ? TrendingUp : TrendingDown },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">{label}</p>
            {loading ? (
              <div className="h-7 w-20 bg-slate-800 rounded animate-pulse" />
            ) : (
              <div className="flex items-center gap-1.5">
                {Icon && <Icon size={14} className={color} />}
                <p className={`text-xl font-extrabold ${color}`}>{value}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Revenue Area Chart */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
        <h4 className="text-sm font-bold text-white mb-4">Revenue Trend (12 Months)</h4>
        {loading ? (
          <div className="h-52 bg-slate-800/50 rounded-xl animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenue?.monthlyRevenue || []}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 9 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 9 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '11px' }}
                formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#revGrad)" dot={{ fill: '#10b981', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Weekly Revenue */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
        <h4 className="text-sm font-bold text-white mb-4">Weekly Revenue (Last 8 Weeks)</h4>
        {loading ? (
          <div className="h-48 bg-slate-800/50 rounded-xl animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={(revenue?.weeklyRevenue || []).map((w, i) => ({ week: `W${i + 1}`, revenue: w.revenue, count: w.count }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                formatter={(v, n) => n === 'revenue' ? [`₹${v.toLocaleString('en-IN')}`, 'Revenue'] : [v, 'Transactions']}
              />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* User Growth Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <h4 className="text-sm font-bold text-white mb-4">User Growth by Role (6 Months)</h4>
          {loading ? (
            <div className="h-48 bg-slate-800/50 rounded-xl animate-pulse" />
          ) : monthlyUserData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyUserData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }} />
                <Bar dataKey="Farmer" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Tool Owner" stackId="a" fill="#3b82f6" />
                <Bar dataKey="Shopkeeper" stackId="a" fill="#f59e0b" />
                <Bar dataKey="Buyer" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">No user data yet.</div>
          )}
        </div>

        {/* Booking Trend */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <h4 className="text-sm font-bold text-white mb-4">Booking Trend & Revenue (6 Months)</h4>
          {loading ? (
            <div className="h-48 bg-slate-800/50 rounded-xl animate-pulse" />
          ) : (userStats?.bookingTrend || []).length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={userStats.bookingTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }} />
                <Line yAxisId="left" type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Bookings" />
                <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">No booking trend data yet.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;
