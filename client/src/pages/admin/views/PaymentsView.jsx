import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useToast } from '../../../context/ToastContext';
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

const PaymentsView = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const toast = useToast();

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (statusFilter) params.status = statusFilter;
      const res = await axios.get('/api/admin/payments', { params });
      if (res.data.success) {
        setPayments(res.data.payments);
        setTotal(res.data.total);
        setPages(res.data.pages);
      }
    } catch (err) {
      toast.error('Failed to load payments.');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const statusColor = (s) => ({
    Completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Failed: 'bg-red-500/10 text-red-400 border-red-500/20',
    Refunded: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  }[s] || 'bg-slate-700 text-slate-400 border-slate-600');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-white">Payment Logs</h2>
          <p className="text-xs text-slate-500">{total} total transactions</p>
        </div>
        <button onClick={fetchPayments} className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 hover:bg-slate-700 transition-all">
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 flex-wrap">
        {['All', 'Completed', 'Pending', 'Failed', 'Refunded'].map(s => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s === 'All' ? '' : s); setPage(1); }}
            id={`payment-filter-${s.toLowerCase()}`}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
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
                {['Razorpay ID', 'User', 'Amount', 'Type', 'Status', 'Date'].map(h => (
                  <th key={h} className="text-left text-[10px] text-slate-500 uppercase font-bold py-3 px-4 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? [...Array(8)].map((_, i) => (
                <tr key={i}>{[...Array(6)].map((_, j) => <td key={j} className="py-3 px-4"><div className="h-4 bg-slate-800 rounded animate-pulse" /></td>)}</tr>
              )) : payments.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-500">No payments found.</td></tr>
              ) : payments.map(p => (
                <tr key={p._id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-mono text-[10px] text-slate-400">{p.razorpayOrderId || p._id.toString().slice(-8)}</td>
                  <td className="py-3 px-4">
                    <p className="text-white font-semibold">{p.farmer?.name || 'Unknown'}</p>
                    <p className="text-[10px] text-slate-500">{p.farmer?.email}</p>
                  </td>
                  <td className="py-3 px-4 text-emerald-400 font-extrabold">₹{p.amount?.toLocaleString('en-IN') || '—'}</td>
                  <td className="py-3 px-4 text-slate-400 capitalize">{p.type || 'Payment'}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border whitespace-nowrap ${statusColor(p.status)}`}>{p.status}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{new Date(p.createdAt).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
            <p className="text-[10px] text-slate-500">Showing {payments.length} of {total}</p>
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

export default PaymentsView;
