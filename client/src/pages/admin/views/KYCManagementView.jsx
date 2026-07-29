import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useToast } from '../../../context/ToastContext';
import { Check, X, RefreshCw, ChevronLeft, ChevronRight, Eye, AlertTriangle } from 'lucide-react';

const KYC_STATUSES = ['All', 'Pending', 'Approved', 'Rejected'];

const DocImage = ({ src, label }) => {
  if (!src) return <div className="w-20 h-14 bg-slate-800 rounded-lg flex items-center justify-center text-[9px] text-slate-600 border border-slate-700">No Image</div>;
  return (
    <a href={src} target="_blank" rel="noopener noreferrer" title={`View ${label}`}>
      <img src={src} alt={label} className="w-20 h-14 object-cover rounded-lg border border-slate-700 hover:border-emerald-500 transition-all cursor-pointer" />
    </a>
  );
};

const KYCManagementView = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [action, setAction] = useState('');
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const toast = useToast();

  const fetchKYC = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (statusFilter && statusFilter !== 'All') params.status = statusFilter;
      const res = await axios.get('/api/admin/kyc', { params });
      if (res.data.success) {
        setRecords(res.data.records);
        setTotal(res.data.total);
        setPages(res.data.pages);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load KYC records.');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchKYC(); }, [fetchKYC]);

  const handleReview = async (recordId, reviewAction, rejectionReason = '') => {
    setActionLoading(true);
    try {
      await axios.put(`/api/admin/kyc/${recordId}`, { action: reviewAction, reason: rejectionReason });
      toast.success(`KYC ${reviewAction} successfully.`, 'KYC Updated');
      setSelectedRecord(null);
      setAction('');
      setReason('');
      fetchKYC();
    } catch (err) {
      toast.error(err.response?.data?.message || 'KYC review failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const submitReview = () => {
    if (!action || !selectedRecord) return;
    if (action === 'Rejected' && !reason.trim()) {
      toast.warning('Please provide a rejection reason.');
      return;
    }
    handleReview(selectedRecord._id, action, reason);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-white">KYC Management</h2>
          <p className="text-xs text-slate-500">{total} records in current filter</p>
        </div>
        <button onClick={fetchKYC} className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 hover:bg-slate-700 transition-all">
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 flex-wrap">
        {KYC_STATUSES.map(s => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s === 'All' ? '' : s); setPage(1); }}
            id={`kyc-filter-${s.toLowerCase()}`}
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

      {/* Records Grid */}
      {loading ? (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-36 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center">
          <p className="text-slate-500 text-sm">No KYC records found for this filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map(record => (
            <div
              key={record._id}
              className={`bg-slate-900/60 border rounded-2xl p-5 transition-all ${
                selectedRecord?._id === record._id ? 'border-emerald-500/50' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col lg:flex-row gap-4">
                {/* User Info */}
                <div className="flex-shrink-0 space-y-2 lg:w-56">
                  <div className="flex items-center gap-2">
                    {record.user?.avatar ? (
                      <img src={record.user.avatar} alt={record.user.name} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                        {record.user?.name?.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold text-white">{record.user?.name}</p>
                      <p className="text-[10px] text-slate-400">{record.user?.email}</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-[10px]">
                    <p className="text-slate-500">Phone: <span className="text-slate-300">{record.user?.phone}</span></p>
                    <p className="text-slate-500">Type: <span className="text-slate-300 font-bold">{record.verificationType}</span></p>
                    {record.aadhaarNumber && <p className="text-slate-500">Aadhaar: <span className="text-slate-300">{record.aadhaarNumber?.slice(0, 4)}••••{record.aadhaarNumber?.slice(-4)}</span></p>}
                    {record.panNumber && <p className="text-slate-500">PAN: <span className="text-slate-300">{record.panNumber}</span></p>}
                    <p className="text-slate-500">Submitted: <span className="text-slate-300">{new Date(record.createdAt).toLocaleDateString('en-IN')}</span></p>
                  </div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                    record.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    record.status === 'Rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                    'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>{record.status}</span>
                </div>

                {/* Documents */}
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Uploaded Documents</p>
                  <div className="flex flex-wrap gap-2">
                    <div className="text-center">
                      <DocImage src={record.aadhaarImage} label="Aadhaar" />
                      <p className="text-[9px] text-slate-500 mt-1">Aadhaar</p>
                    </div>
                    {record.selfieImage && (
                      <div className="text-center">
                        <DocImage src={record.selfieImage} label="Selfie" />
                        <p className="text-[9px] text-slate-500 mt-1">Selfie</p>
                      </div>
                    )}
                    {record.panImage && (
                      <div className="text-center">
                        <DocImage src={record.panImage} label="PAN" />
                        <p className="text-[9px] text-slate-500 mt-1">PAN</p>
                      </div>
                    )}
                    {record.machineDocImage && (
                      <div className="text-center">
                        <DocImage src={record.machineDocImage} label="Machine Doc" />
                        <p className="text-[9px] text-slate-500 mt-1">Machine</p>
                      </div>
                    )}
                    {record.shopLicenseImage && (
                      <div className="text-center">
                        <DocImage src={record.shopLicenseImage} label="Shop License" />
                        <p className="text-[9px] text-slate-500 mt-1">Shop License</p>
                      </div>
                    )}
                    {record.addressProofImage && (
                      <div className="text-center">
                        <DocImage src={record.addressProofImage} label="Address Proof" />
                        <p className="text-[9px] text-slate-500 mt-1">Address</p>
                      </div>
                    )}
                  </div>

                  {record.rejectionReason && (
                    <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <p className="text-[10px] text-red-400"><strong>Rejection Reason:</strong> {record.rejectionReason}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {record.status === 'Pending' && (
                  <div className="flex-shrink-0 flex flex-col gap-2 justify-start lg:w-40">
                    {selectedRecord?._id === record._id ? (
                      <div className="space-y-2">
                        {action === 'Rejected' && (
                          <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Reason for rejection *"
                            rows={2}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-[10px] text-white placeholder-slate-600 focus:outline-none focus:border-red-500 resize-none transition-all"
                          />
                        )}
                        <button
                          onClick={submitReview}
                          disabled={actionLoading}
                          className={`w-full py-2 text-xs font-bold rounded-xl transition-all disabled:opacity-50 ${
                            action === 'Approved' ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-red-600 text-white hover:bg-red-500'
                          }`}
                          id={`kyc-confirm-${action?.toLowerCase()}`}
                        >
                          {actionLoading ? 'Processing...' : `Confirm ${action}`}
                        </button>
                        <button
                          onClick={() => { setSelectedRecord(null); setAction(''); setReason(''); }}
                          className="w-full py-2 text-xs font-bold bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => { setSelectedRecord(record); setAction('Approved'); }}
                          id={`kyc-approve-${record._id}`}
                          className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-xl hover:bg-emerald-600/30 transition-all"
                        >
                          <Check size={12} /> Approve
                        </button>
                        <button
                          onClick={() => { setSelectedRecord(record); setAction('Rejected'); }}
                          id={`kyc-reject-${record._id}`}
                          className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold bg-red-600/20 text-red-400 border border-red-500/30 rounded-xl hover:bg-red-600/30 transition-all"
                        >
                          <X size={12} /> Reject
                        </button>
                        <button
                          onClick={() => handleReview(record._id, 'Pending')}
                          className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 rounded-xl hover:bg-slate-700 transition-all"
                        >
                          Request Resubmit
                        </button>
                      </>
                    )}
                  </div>
                )}

                {record.status !== 'Pending' && (
                  <div className="flex-shrink-0 lg:w-40">
                    <p className="text-[10px] text-slate-600 italic">Reviewed on {record.reviewedAt ? new Date(record.reviewedAt).toLocaleDateString('en-IN') : '—'}</p>
                    {record.status !== 'Pending' && (
                      <button
                        onClick={() => handleReview(record._id, 'Pending')}
                        className="mt-2 w-full py-2 text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 rounded-xl hover:bg-slate-700 transition-all"
                      >
                        Mark Pending
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-all">
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs text-slate-400">{page} / {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-all">
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default KYCManagementView;
