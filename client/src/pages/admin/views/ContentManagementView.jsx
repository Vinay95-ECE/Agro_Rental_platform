import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useToast } from '../../../context/ToastContext';
import { Search, RefreshCw, ChevronLeft, ChevronRight, Check, X, Star, Trash2, EyeOff } from 'lucide-react';


const GenericListView = ({ title, fetchUrl, updateUrl, deleteUrl, itemKey, renderRow, columns }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const toast = useToast();

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (search) params.search = search;
      const res = await axios.get(fetchUrl, { params });
      if (res.data.success) {
        setItems(res.data[itemKey] || []);
        setTotal(res.data.total || 0);
        setPages(res.data.pages || 1);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [page, search, fetchUrl, itemKey]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const doAction = async (id, action) => {
    setActionLoading(`${id}-${action}`);
    try {
      await axios.put(`${updateUrl}/${id}`, { action });
      toast.success(`${action} successful.`);
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const doDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this item?')) return;
    setActionLoading(`${id}-delete`);
    try {
      await axios.delete(`${deleteUrl}/${id}`);
      toast.success('Deleted successfully.');
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-white">{title}</h2>
          <p className="text-xs text-slate-500">{total} total items</p>
        </div>
        <button onClick={fetchItems} className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 hover:bg-slate-700 transition-all">
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={`Search ${title.toLowerCase()}...`}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all"
        />
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80">
                {columns.map(c => (
                  <th key={c} className="text-left text-[10px] text-slate-500 uppercase font-bold py-3 px-4">{c}</th>
                ))}
                <th className="text-left text-[10px] text-slate-500 uppercase font-bold py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(columns.length + 1)].map((_, j) => (
                      <td key={j} className="py-3 px-4"><div className="h-4 bg-slate-800 rounded animate-pulse w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="py-10 text-center text-slate-500">No items found.</td>
                </tr>
              ) : items.map(item => (
                <tr key={item._id} className="hover:bg-slate-800/30 transition-colors">
                  {renderRow(item)}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => doAction(item._id, 'approve')}
                        disabled={actionLoading === `${item._id}-approve`}
                        title="Approve"
                        className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50 transition-colors"
                      >
                        <Check size={12} />
                      </button>
                      <button
                        onClick={() => doAction(item._id, 'reject')}
                        disabled={actionLoading === `${item._id}-reject`}
                        title="Reject"
                        className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 disabled:opacity-50 transition-colors"
                      >
                        <X size={12} />
                      </button>
                      <button
                        onClick={() => doAction(item._id, 'hide')}
                        disabled={actionLoading === `${item._id}-hide`}
                        title="Hide/Show"
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 disabled:opacity-50 transition-colors"
                      >
                        <EyeOff size={12} />
                      </button>
                      <button
                        onClick={() => doAction(item._id, 'feature')}
                        disabled={actionLoading === `${item._id}-feature`}
                        title="Feature"
                        className="p-1.5 rounded-lg text-yellow-400 hover:bg-yellow-500/10 disabled:opacity-50 transition-colors"
                      >
                        <Star size={12} />
                      </button>
                      <button
                        onClick={() => doDelete(item._id)}
                        disabled={actionLoading === `${item._id}-delete`}
                        title="Delete"
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
            <p className="text-[10px] text-slate-500">Showing {items.length} of {total}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-all">
                <ChevronLeft size={14} />
              </button>
              <span className="text-[11px] text-slate-400 px-2">{page} / {pages}</span>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-all">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Tool Management View ─────────────────────────────────────────────────────
export const ToolManagementView = () => (
  <GenericListView
    title="Tool Management"
    fetchUrl="/api/admin/tools"
    updateUrl="/api/admin/tools"
    deleteUrl="/api/admin/tools"
    itemKey="tools"
    columns={['Tool Name', 'Category', 'Owner', 'KYC', 'Daily Rate', 'Status', 'Listed']}
    renderRow={(tool) => (
      <>
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            {tool.images?.[0] ? (
              <img src={tool.images[0]} alt={tool.name} className="w-8 h-6 object-cover rounded flex-shrink-0" />
            ) : (
              <div className="w-8 h-6 bg-slate-800 rounded flex-shrink-0" />
            )}
            <span className="font-semibold text-white truncate max-w-[120px]">{tool.name}</span>
          </div>
        </td>
        <td className="py-3 px-4 text-slate-400">{tool.category}</td>
        <td className="py-3 px-4">
          <div>
            <p className="text-white font-semibold truncate max-w-[100px]">{tool.owner?.name}</p>
            <p className="text-[10px] text-slate-500">{tool.owner?.email}</p>
          </div>
        </td>
        <td className="py-3 px-4">
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
            tool.owner?.kycStatus === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
            'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>{tool.owner?.kycStatus || 'Unknown'}</span>
        </td>
        <td className="py-3 px-4 text-slate-300 font-semibold">₹{tool.rentRates?.daily?.toLocaleString('en-IN') || '—'}</td>
        <td className="py-3 px-4">
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
            tool.isApproved ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
            'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>{tool.isApproved ? 'Approved' : 'Pending'}</span>
          {tool.isHidden && <span className="ml-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-700 text-slate-400">Hidden</span>}
          {tool.isFeatured && <span className="ml-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-yellow-500/10 text-yellow-400">★ Featured</span>}
        </td>
        <td className="py-3 px-4 text-slate-500">{new Date(tool.createdAt).toLocaleDateString('en-IN')}</td>
      </>
    )}
  />
);

// ─── Product Management View ──────────────────────────────────────────────────
export const ProductManagementView = () => (
  <GenericListView
    title="Product Management"
    fetchUrl="/api/admin/products"
    updateUrl="/api/admin/products"
    deleteUrl="/api/admin/products"
    itemKey="products"
    columns={['Product Name', 'Category', 'Seller', 'Price', 'Stock', 'Status', 'Listed']}
    renderRow={(product) => (
      <>
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            {product.images?.[0] ? (
              <img src={product.images[0]} alt={product.name} className="w-8 h-6 object-cover rounded flex-shrink-0" />
            ) : (
              <div className="w-8 h-6 bg-slate-800 rounded flex-shrink-0" />
            )}
            <span className="font-semibold text-white truncate max-w-[120px]">{product.name}</span>
          </div>
        </td>
        <td className="py-3 px-4 text-slate-400">{product.category || '—'}</td>
        <td className="py-3 px-4">
          <p className="text-white font-semibold truncate max-w-[100px]">{product.shopkeeper?.name}</p>
          <p className="text-[10px] text-slate-500">{product.shopkeeper?.email}</p>
        </td>
        <td className="py-3 px-4 text-slate-300 font-semibold">₹{product.price?.toLocaleString('en-IN') || '—'}</td>
        <td className="py-3 px-4 text-slate-400">{product.stock ?? '—'}</td>
        <td className="py-3 px-4">
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
            product.isApproved ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
            'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>{product.isApproved ? 'Approved' : 'Pending'}</span>
        </td>
        <td className="py-3 px-4 text-slate-500">{new Date(product.createdAt).toLocaleDateString('en-IN')}</td>
      </>
    )}
  />
);

// ─── Crop Management View ─────────────────────────────────────────────────────
export const CropManagementView = () => {
  const toast = useToast();
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const fetchCrops = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/crops', { params: { page, limit: 15 } });
      if (res.data.success) {
        setCrops(res.data.crops || []);
        setTotal(res.data.total || 0);
        setPages(res.data.pages || 1);
      }
    } catch (err) {
      toast.error('Failed to load crops.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchCrops(); }, [fetchCrops]);

  const deleteCrop = async (id) => {
    if (!window.confirm('Delete this crop listing?')) return;
    try {
      await axios.delete(`/api/admin/crops/${id}`);
      toast.success('Crop deleted.');
      fetchCrops();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-white">Crop Management</h2>
          <p className="text-xs text-slate-500">{total} crop listings</p>
        </div>
        <button onClick={fetchCrops} className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 hover:bg-slate-700 transition-all">
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80">
                {['Crop', 'Farmer', 'Price', 'Qty', 'Location', 'Listed', 'Delete'].map(h => (
                  <th key={h} className="text-left text-[10px] text-slate-500 uppercase font-bold py-3 px-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? [...Array(6)].map((_, i) => (
                <tr key={i}>
                  {[...Array(7)].map((_, j) => <td key={j} className="py-3 px-4"><div className="h-4 bg-slate-800 rounded animate-pulse" /></td>)}
                </tr>
              )) : crops.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-slate-500">No crops found.</td></tr>
              ) : crops.map(crop => (
                <tr key={crop._id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-semibold text-white">{crop.cropName}</td>
                  <td className="py-3 px-4">
                    <p className="text-white truncate max-w-[100px]">{crop.farmer?.name}</p>
                    <p className="text-[10px] text-slate-500">{crop.farmer?.phone}</p>
                  </td>
                  <td className="py-3 px-4 text-slate-300 font-semibold">₹{crop.pricePerKg}/kg</td>
                  <td className="py-3 px-4 text-slate-400">{crop.quantityKg} kg</td>
                  <td className="py-3 px-4 text-slate-400">{crop.district || '—'}</td>
                  <td className="py-3 px-4 text-slate-500">{new Date(crop.createdAt).toLocaleDateString('en-IN')}</td>
                  <td className="py-3 px-4">
                    <button onClick={() => deleteCrop(crop._id)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-slate-800">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 rounded-lg transition-all"><ChevronLeft size={14} /></button>
            <span className="text-xs text-slate-400">{page} / {pages}</span>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 rounded-lg transition-all"><ChevronRight size={14} /></button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolManagementView;
