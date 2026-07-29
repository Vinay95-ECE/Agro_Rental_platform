import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useToast } from '../../../context/ToastContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import {
  Users, TrendingUp, DollarSign, Package, Wrench, Leaf,
  ShieldCheck, Clock, CheckCircle, XCircle, UserCheck,
  RefreshCw, Calendar, Activity, AlertCircle, BookOpen, CreditCard
} from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

const StatCard = ({ label, value, icon: Icon, color, bgColor, sub, loading }) => (
  <div className={`bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all group`}>
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1 truncate">{label}</p>
        {loading ? (
          <div className="h-7 w-16 bg-slate-800 rounded animate-pulse" />
        ) : (
          <p className="text-2xl font-extrabold text-white leading-none">{value?.toLocaleString('en-IN') ?? '—'}</p>
        )}
        {sub && !loading && <p className="text-[10px] text-emerald-400 font-semibold mt-1">{sub}</p>}
      </div>
      <div className={`flex-shrink-0 p-2.5 rounded-xl ${bgColor} group-hover:scale-110 transition-transform`}>
        <Icon size={15} className={color} />
      </div>
    </div>
  </div>
);

const SectionLabel = ({ children }) => (
  <h3 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-3">{children}</h3>
);

const OverviewView = () => {
  const [stats, setStats] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [userAnalytics, setUserAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const toast = useToast();

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [statsRes, revRes, userRes] = await Promise.all([
        axios.get('/api/admin/stats'),
        axios.get('/api/admin/analytics/revenue'),
        axios.get('/api/admin/analytics/users')
      ]);
      if (statsRes.data.success) setStats(statsRes.data);
      if (revRes.data.success) setRevenue(revRes.data);
      if (userRes.data.success) setUserAnalytics(userRes.data);
      if (silent) toast.success('Dashboard refreshed.', 'Updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const s = stats?.stats;

  // Build pie data for role distribution
  const rolePieData = (stats?.roleDistribution || []).map(r => ({
    name: r._id,
    value: r.count
  }));

  // Build booking trend chart
  const bookingChartData = (userAnalytics?.bookingTrend || []).map(b => ({
    month: b.month,
    bookings: b.count,
    revenue: b.revenue
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white">Dashboard Overview</h2>
          <p className="text-xs text-slate-500 mt-0.5">Real-time platform metrics from MongoDB</p>
        </div>
        <button
          id="admin-refresh-btn"
          onClick={() => fetchAll(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-700"
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Revenue KPIs */}
      <div>
        <SectionLabel>Revenue</SectionLabel>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard label="Total Revenue" value={s?.totalRevenue} icon={DollarSign} color="text-emerald-400" bgColor="bg-emerald-500/10" sub={`Growth: ${revenue?.growth || '0%'}`} loading={loading} />
          <StatCard label="This Month" value={s?.monthRevenue} icon={TrendingUp} color="text-blue-400" bgColor="bg-blue-500/10" loading={loading} />
          <StatCard label="Today" value={s?.todayRevenue} icon={Calendar} color="text-purple-400" bgColor="bg-purple-500/10" loading={loading} />
        </div>
      </div>

      {/* Users KPIs */}
      <div>
        <SectionLabel>Users</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          <StatCard label="Total Users" value={s?.totalUsers} icon={Users} color="text-blue-400" bgColor="bg-blue-500/10" loading={loading} />
          <StatCard label="Farmers" value={s?.totalFarmers} icon={Leaf} color="text-green-400" bgColor="bg-green-500/10" loading={loading} />
          <StatCard label="Tool Owners" value={s?.totalToolOwners} icon={Wrench} color="text-amber-400" bgColor="bg-amber-500/10" loading={loading} />
          <StatCard label="Shopkeepers" value={s?.totalShopkeepers} icon={Package} color="text-purple-400" bgColor="bg-purple-500/10" loading={loading} />
          <StatCard label="Buyers" value={s?.totalBuyers} icon={UserCheck} color="text-cyan-400" bgColor="bg-cyan-500/10" loading={loading} />
          <StatCard label="Suspended" value={s?.suspendedUsers} icon={XCircle} color="text-red-400" bgColor="bg-red-500/10" loading={loading} />
        </div>
      </div>

      {/* KYC KPIs */}
      <div>
        <SectionLabel>KYC Verification</SectionLabel>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Pending KYC" value={s?.pendingKYC} icon={Clock} color="text-amber-400" bgColor="bg-amber-500/10" loading={loading} />
          <StatCard label="Approved KYC" value={s?.approvedKYC} icon={CheckCircle} color="text-emerald-400" bgColor="bg-emerald-500/10" loading={loading} />
          <StatCard label="Rejected KYC" value={s?.rejectedKYC} icon={XCircle} color="text-red-400" bgColor="bg-red-500/10" loading={loading} />
        </div>
      </div>

      {/* Platform KPIs */}
      <div>
        <SectionLabel>Platform Activity</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Active Tools" value={s?.totalTools} icon={Wrench} color="text-amber-400" bgColor="bg-amber-500/10" loading={loading} />
          <StatCard label="Crops Listed" value={s?.totalCrops} icon={Leaf} color="text-green-400" bgColor="bg-green-500/10" loading={loading} />
          <StatCard label="Products" value={s?.totalProducts} icon={Package} color="text-blue-400" bgColor="bg-blue-500/10" loading={loading} />
          <StatCard label="Total Bookings" value={s?.totalBookings} icon={BookOpen} color="text-purple-400" bgColor="bg-purple-500/10" loading={loading} />
          <StatCard label="Pending Bookings" value={s?.pendingBookings} icon={Clock} color="text-amber-400" bgColor="bg-amber-500/10" loading={loading} />
          <StatCard label="Completed" value={s?.completedBookings} icon={CheckCircle} color="text-emerald-400" bgColor="bg-emerald-500/10" loading={loading} />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <h4 className="text-sm font-bold text-white mb-4">Monthly Revenue Trend</h4>
          {loading ? (
            <div className="h-48 bg-slate-800/50 rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={revenue?.monthlyRevenue || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                  labelStyle={{ color: '#94a3b8' }}
                  formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']}
                />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Role Distribution Pie */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <h4 className="text-sm font-bold text-white mb-4">User Role Distribution</h4>
          {loading ? (
            <div className="h-48 bg-slate-800/50 rounded-xl animate-pulse" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={rolePieData} cx="50%" cy="50%" outerRadius={70} dataKey="value">
                    {rolePieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                    formatter={(v, n) => [v, n]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-1 mt-2">
                {rolePieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-[9px] text-slate-400 truncate">{d.name}: <strong className="text-white">{d.value}</strong></span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Booking Trend */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
        <h4 className="text-sm font-bold text-white mb-4">Booking Trend (6 months)</h4>
        {loading ? (
          <div className="h-48 bg-slate-800/50 rounded-xl animate-pulse" />
        ) : bookingChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={bookingChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
              />
              <Bar dataKey="bookings" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-slate-500 text-sm">No booking data yet.</div>
        )}
      </div>

      {/* Recent Users */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
        <h4 className="text-sm font-bold text-white mb-4">Recent Registrations</h4>
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-slate-800 rounded-xl animate-pulse" />)}
          </div>
        ) : (stats?.recentUsers || []).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Name', 'Email', 'Role', 'KYC', 'Joined', 'Status'].map(h => (
                    <th key={h} className="text-left text-[10px] text-slate-500 uppercase font-bold pb-2 pr-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {(stats?.recentUsers || []).map(u => (
                  <tr key={u._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 pr-3 font-semibold text-white truncate max-w-[120px]">{u.name}</td>
                    <td className="py-2.5 pr-3 text-slate-400 truncate max-w-[140px]">{u.email}</td>
                    <td className="py-2.5 pr-3">
                      <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full text-[9px] font-bold">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                        u.kycStatus === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        u.kycStatus === 'Pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        u.kycStatus === 'Rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>{u.kycStatus}</span>
                    </td>
                    <td className="py-2.5 pr-3 text-slate-500">{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                        u.isSuspended ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>{u.isSuspended ? 'Suspended' : 'Active'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500 text-sm text-center py-8">No users found.</p>
        )}
      </div>
    </div>
  );
};

export default OverviewView;
