import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useToast } from '../../../context/ToastContext';
import { RefreshCw, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

const BOOKING_STATUSES = ['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled'];

const BookingsView = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const toast = useToast();

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (statusFilter) params.status = statusFilter;
      const res = await axios.get('/api/admin/bookings', { params });
      if (res.data.success) {
        setBookings(res.data.bookings);
        setTotal(res.data.total);
        setPages(res.data.pages);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const statusColor = (s) => {
    const map = {
      Pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      Confirmed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      Completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      Cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
    };
    return map[s] || 'bg-slate-700 text-slate-400 border-slate-600';
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-white">Bookings Management</h2>
          <p className="text-xs text-slate-500">{total} total bookings</p>
        </div>
        <button onClick={fetchBookings} className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 hover:bg-slate-700 transition-all">
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 flex-wrap">
        {BOOKING_STATUSES.map(s => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s === 'All' ? '' : s); setPage(1); }}
            id={`booking-filter-${s.toLowerCase()}`}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              (statusFilter === '' && s === 'All') || statusFilter === s
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80">
                {['Tool', 'Farmer', 'From', 'To', 'Amount', 'Status', 'Booked On'].map(h => (
                  <th key={h} className="text-left text-[10px] text-slate-500 uppercase font-bold py-3 px-4 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? [...Array(8)].map((_, i) => (
                <tr key={i}>
                  {[...Array(7)].map((_, j) => <td key={j} className="py-3 px-4"><div className="h-4 bg-slate-800 rounded animate-pulse" /></td>)}
                </tr>
              )) : bookings.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-500">No bookings found.</td></tr>
              ) : bookings.map(b => (
                <tr key={b._id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-semibold text-white truncate max-w-[120px]">{b.tool?.name || '—'}</td>
                  <td className="py-3 px-4">
                    <p className="text-white font-semibold">{b.farmer?.name}</p>
                    <p className="text-[10px] text-slate-500">{b.farmer?.phone}</p>
                  </td>
                  <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{b.startDate ? new Date(b.startDate).toLocaleDateString('en-IN') : '—'}</td>
                  <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{b.endDate ? new Date(b.endDate).toLocaleDateString('en-IN') : '—'}</td>
                  <td className="py-3 px-4 text-emerald-400 font-bold">₹{b.totalAmount?.toLocaleString('en-IN') || '—'}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border whitespace-nowrap ${statusColor(b.status)}`}>{b.status}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{new Date(b.createdAt).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
            <p className="text-[10px] text-slate-500">Showing {bookings.length} of {total}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-all"><ChevronLeft size={14} /></button>
              <span className="text-[11px] text-slate-400 px-2">{page} / {pages}</span>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-all"><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingsView;
