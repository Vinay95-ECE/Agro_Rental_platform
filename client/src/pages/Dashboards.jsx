import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { updateKYC } from '../store/authSlice';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import {
  BarChart3, Users, DollarSign, ShoppingBag, ShieldCheck, FileText, Check, X,
  PlusCircle, Trash2, Star, TrendingUp, Package, Calendar, Activity,
  Leaf, Bot, Award, CreditCard, RefreshCw, Edit2, AlertTriangle,
  CheckCircle, Clock, Zap, Eye, MapPin
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { ImageUpload, MultiImageUpload } from '../components/ImageUpload';
import { SkeletonStatCard, PageLoader } from '../components/Skeleton';


// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, color, sub }) => (
  <div className="glass border border-slate-800 rounded-2xl p-5 space-y-3 hover:border-slate-700 transition-all">
    <div className="flex items-center justify-between">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{label}</p>
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon size={14} />
      </div>
    </div>
    <p className="text-2xl font-extrabold text-white">{value}</p>
    {sub && <p className="text-[10px] text-emerald-400 font-semibold">{sub}</p>}
  </div>
);

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    Approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
    Cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
    Paid: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Unpaid: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    Success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return (
    <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${map[status] || 'bg-slate-800 text-slate-400 border-slate-700'}`}>
      {status}
    </span>
  );
};

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, title, subtitle, iconColor = 'text-emerald-400' }) => (
  <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-5">
    <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
      <Icon size={16} className={iconColor} />
    </div>
    <div>
      <h3 className="text-sm font-bold text-white">{title}</h3>
      {subtitle && <p className="text-[10px] text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// ─── Main Dashboards Component ────────────────────────────────────────────────
const Dashboards = () => {
  const { user, token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Common data
  const [bookings, setBookings] = useState([]);
  const [myProducts, setMyProducts] = useState([]);
  const [kycRecords, setKycRecords] = useState([]);
  const [payments, setPayments] = useState([]);
  const [diseaseScans, setDiseaseScans] = useState([]);
  const [analytics, setAnalytics] = useState({ revenue: 0, count: 0, pending: 0 });
  const [allUsers, setAllUsers] = useState([]);
  const [adminStats, setAdminStats] = useState(null);

  // KYC form
  const [aadhaar, setAadhaar] = useState('');
  const [kycType, setKycType] = useState('Farmer');
  const [kycAadhaarImage, setKycAadhaarImage] = useState('');
  const [kycSelfieImage, setKycSelfieImage] = useState('');
  const [submittingKYC, setSubmittingKYC] = useState(false);

  // Tool form
  const [toolForm, setToolForm] = useState({
    name: '', description: '', category: 'Tractor',
    daily: '', weekly: '', monthly: '',
    power: '', fuel: 'Diesel', brand: '',
    village: user?.village || '', district: user?.district || '', state: user?.state || ''
  });
  const [toolImages, setToolImages] = useState([]);
  const [addingTool, setAddingTool] = useState(false);

  // Product form
  const [prodForm, setProdForm] = useState({ name: '', description: '', type: 'Seed', category: '', price: '', stock: '' });
  const [prodImages, setProdImages] = useState([]);
  const [addingProd, setAddingProd] = useState(false);

  // Razorpay payment for pending booking
  const [payingBooking, setPayingBooking] = useState(null);


  const loadData = async () => {
    if (!token || !user) return;
    setLoading(true);
    try {
      if (user.role === 'Farmer' || user.role === 'Buyer') {
        const [bookRes, payRes, diseaseRes] = await Promise.allSettled([
          axios.get('/api/bookings/my-rentals', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/api/payments/history', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/api/disease/history', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        if (bookRes.status === 'fulfilled' && bookRes.value.data.success) setBookings(bookRes.value.data.bookings);
        if (payRes.status === 'fulfilled' && payRes.value.data.success) setPayments(payRes.value.data.payments);
        if (diseaseRes.status === 'fulfilled' && diseaseRes.value.data.success) setDiseaseScans(diseaseRes.value.data.reports);

      } else if (user.role === 'Tool Owner') {
        const [reqRes, toolsRes] = await Promise.allSettled([
          axios.get('/api/bookings/requests', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/api/tools/my-tools', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        if (reqRes.status === 'fulfilled' && reqRes.value.data.success) {
          const allBookings = reqRes.value.data.bookings;
          setBookings(allBookings);
          const approved = allBookings.filter(b => b.status === 'Approved' || b.status === 'Completed');
          const revenue = approved.reduce((acc, b) => acc + (b.totalAmount || 0), 0);
          const pending = allBookings.filter(b => b.status === 'Pending').length;
          setAnalytics({ revenue, count: allBookings.length, pending });
        }
        if (toolsRes.status === 'fulfilled' && toolsRes.value.data.success) {
          setMyProducts(toolsRes.value.data.tools);
        }

      } else if (user.role === 'Shopkeeper') {
        const prodRes = await axios.get('/api/products');
        if (prodRes.data.success) {
          const mine = prodRes.data.products.filter(p => p.shopkeeper?._id === user._id || p.shopkeeper === user._id);
          setMyProducts(mine);
          const totalRevenue = mine.reduce((a, p) => a + (p.price * (p.sold || 0)), 0);
          setAnalytics({ revenue: totalRevenue, count: mine.length });
        }

      } else if (user.role === 'Admin') {
        const [kycRes, usersRes, statsRes] = await Promise.allSettled([
          axios.get('/api/kyc/records', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/api/auth/users', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        if (kycRes.status === 'fulfilled' && kycRes.value.data.success) setKycRecords(kycRes.value.data.records);
        if (usersRes.status === 'fulfilled' && usersRes.value.data.success) setAllUsers(usersRes.value.data.users);
        if (statsRes.status === 'fulfilled' && statsRes.value.data.success) setAdminStats(statsRes.value.data);
      }
    } catch (err) {
      console.error('Dashboard data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user, token]);

  // ── KYC Submit ─────────────────────────────────────────────────────────────
  const handleKycSubmit = async (e) => {
    e.preventDefault();
    if (!aadhaar || aadhaar.length !== 12 || !/^\d{12}$/.test(aadhaar)) {
      toast.error('Please provide a valid 12-digit Aadhaar number (digits only).');
      return;
    }
    if (!kycAadhaarImage) {
      toast.error('Please upload your Aadhaar card image.', 'Image Required');
      return;
    }
    setSubmittingKYC(true);
    try {
      const res = await axios.post('/api/kyc/submit', {
        aadhaarNumber: aadhaar,
        verificationType: kycType,
        aadhaarImage: kycAadhaarImage,
        selfieImage: kycSelfieImage || ''
      }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        toast.success('KYC submitted successfully! Our team will review within 24 hours.');
        dispatch(updateKYC('Pending'));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error submitting KYC. Please try again.');
    } finally {
      setSubmittingKYC(false);
    }
  };


  // ── Admin KYC Review ───────────────────────────────────────────────────────
  const handleReviewKYC = async (id, status) => {
    try {
      await axios.put(`/api/kyc/review/${id}`, {
        status,
        rejectionReason: status === 'Rejected' ? 'Documents could not be verified. Please resubmit clear photos.' : ''
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`KYC ${status.toLowerCase()} successfully.`, `KYC ${status}`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating KYC status.');
    }
  };


  // ── Booking Status ─────────────────────────────────────────────────────────
  const handleBookingAction = async (id, status) => {
    try {
      await axios.put(`/api/bookings/${id}/status`, { status }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`Booking ${status.toLowerCase()} successfully.`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating booking status.');
    }
  };


  // ── Razorpay Payment ───────────────────────────────────────────────────────
  const handlePayNow = async (booking) => {
    setPayingBooking(booking._id);
    try {
      const orderRes = await axios.post('/api/payments/create-order', {
        amount: booking.totalAmount, bookingId: booking._id
      }, { headers: { Authorization: `Bearer ${token}` } });

      const { orderId, amount, keyId, demo } = orderRes.data;

      if (demo) {
        await axios.post('/api/payments/verify', {
          razorpay_order_id: orderId,
          razorpay_payment_id: `pay_demo_${Date.now()}`,
          razorpay_signature: 'demo_signature',
          bookingId: booking._id,
          amount: booking.totalAmount
        }, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('Payment successful! Booking confirmed.', 'Payment Complete ✅');
        loadData();
        return;
      }

      // Real Razorpay
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
      script.onload = () => {
        const rzp = new window.Razorpay({
          key: keyId, amount, currency: 'INR',
          name: 'AgriRent Hub',
          description: `Booking: ${booking.tool?.name || 'Equipment'}`,
          order_id: orderId,
          handler: async (response) => {
            try {
              await axios.post('/api/payments/verify', {
                ...response, bookingId: booking._id, amount: booking.totalAmount
              }, { headers: { Authorization: `Bearer ${token}` } });
              toast.success('Payment successful! Booking confirmed.', 'Payment Complete ✅');
              loadData();
            } catch {
              toast.error('Payment verification failed. Contact support.');
            }
          },
          prefill: { name: user.name, email: user.email, contact: user.phone },
          theme: { color: '#10b981' }
        });
        rzp.open();
      };
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment initiation failed. Please try again.');
    } finally {
      setPayingBooking(null);
    }
  };


  // ── Add Tool ───────────────────────────────────────────────────────────────
  const handleAddTool = async (e) => {
    e.preventDefault();
    if (!toolForm.name || !toolForm.daily) {
      toast.error('Tool name and daily rate are required.'); return;
    }
    if (toolImages.length === 0) {
      toast.error('Please upload at least one image of the tool.', 'Image Required'); return;
    }
    setAddingTool(true);
    try {
      // Try to get user's location
      let lat = 28.6139, lng = 77.2090;
      try {
        const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }));
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch { /* use defaults */ }

      await axios.post('/api/tools', {
        name: toolForm.name.trim(),
        description: toolForm.description.trim(),
        category: toolForm.category,
        images: toolImages,
        village: toolForm.village,
        district: toolForm.district,
        state: toolForm.state,
        latitude: lat,
        longitude: lng,
        rentRates: {
          daily: Number(toolForm.daily),
          weekly: Number(toolForm.weekly) || Number(toolForm.daily) * 6,
          monthly: Number(toolForm.monthly) || Number(toolForm.daily) * 22
        },
        specifications: {
          power: toolForm.power,
          fuelType: toolForm.fuel,
          brand: toolForm.brand
        }
      }, { headers: { Authorization: `Bearer ${token}` } });

      toast.success('Tool listed successfully! It is now visible in the marketplace.', 'Tool Added ✅');
      setToolForm({ name: '', description: '', category: 'Tractor', daily: '', weekly: '', monthly: '', power: '', fuel: 'Diesel', brand: '', village: user?.village || '', district: user?.district || '', state: user?.state || '' });
      setToolImages([]);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error adding tool. Please try again.');
    } finally {
      setAddingTool(false);
    }
  };


  // ── Add Product ────────────────────────────────────────────────────────────
  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!prodForm.name || !prodForm.price) {
      toast.error('Product name and price are required.'); return;
    }
    if (prodImages.length === 0) {
      toast.error('Please upload at least one product image.', 'Image Required'); return;
    }
    setAddingProd(true);
    try {
      await axios.post('/api/products', {
        name: prodForm.name.trim(),
        description: prodForm.description.trim(),
        type: prodForm.type,
        category: prodForm.category,
        price: Number(prodForm.price),
        stock: Number(prodForm.stock),
        images: prodImages
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Product listed successfully!', 'Product Added ✅');
      setProdForm({ name: '', description: '', type: 'Seed', category: '', price: '', stock: '' });
      setProdImages([]);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error adding product.');
    } finally {
      setAddingProd(false);
    }
  };


  if (!token) return (
    <div className="text-center py-20">
      <AlertTriangle size={40} className="text-amber-500 mx-auto mb-4" />
      <p className="text-slate-400 text-sm">Please log in to access your dashboard.</p>
    </div>
  );

  if (!user) return null;

  const role = user?.role;

  // ── Chart data helpers ─────────────────────────────────────────────────────
  const bookingStatusData = [
    { name: 'Pending', value: bookings.filter(b => b.status === 'Pending').length, color: '#f59e0b' },
    { name: 'Approved', value: bookings.filter(b => b.status === 'Approved').length, color: '#10b981' },
    { name: 'Rejected', value: bookings.filter(b => b.status === 'Rejected').length, color: '#ef4444' },
    { name: 'Completed', value: bookings.filter(b => b.status === 'Completed').length, color: '#3b82f6' },
  ].filter(d => d.value > 0);

  const monthlyRevenueData = bookings
    .filter(b => b.status === 'Approved' || b.status === 'Completed')
    .reduce((acc, b) => {
      const month = new Date(b.createdAt).toLocaleString('default', { month: 'short' });
      const found = acc.find(d => d.month === month);
      if (found) found.revenue += b.totalAmount || 0;
      else acc.push({ month, revenue: b.totalAmount || 0 });
      return acc;
    }, []);

  const tabs = role === 'Farmer' || role === 'Buyer'
    ? ['overview', 'bookings', 'payments', 'disease', 'kyc']
    : role === 'Tool Owner'
    ? ['overview', 'requests', 'my-tools', 'analytics', 'kyc']
    : role === 'Shopkeeper'
    ? ['overview', 'products', 'analytics', 'kyc']
    : ['users', 'kyc', 'analytics'];

  const tabLabels = {
    overview: '📊 Overview', bookings: '📅 Bookings', payments: '💳 Payments',
    disease: '🔬 Scans', kyc: '🛡️ KYC', requests: '📩 Requests',
    'my-tools': '🚜 My Tools', analytics: '📈 Analytics',
    products: '🛒 Products', users: '👥 Users'
  };

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            {role === 'Farmer' || role === 'Buyer' ? '🌾' : role === 'Tool Owner' ? '🚜' : role === 'Shopkeeper' ? '🛒' : '⚙️'}
            {role} Dashboard
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Welcome back, <span className="text-emerald-400 font-bold">{user?.name}</span> •
            <span className={`ml-1 text-[10px] font-bold px-2 py-0.5 rounded ${
              user?.kycStatus === 'Approved' ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'
            }`}>
              KYC: {user?.kycStatus}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
            <span className="text-amber-400">🪙</span>
            <span className="font-bold text-white">{user?.coins}</span>
          </div>
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
            <span className="text-emerald-400">⚡</span>
            <span className="font-bold text-white">{user?.xp} XP</span>
          </div>
          <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-1 rounded-lg font-bold">
            {user?.badge}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap bg-slate-900/50 border border-slate-800 rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 rounded-lg text-[11px] font-bold transition-all ${
              activeTab === tab
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)}
        </div>
      ) : (
        <>
          {/* ── KYC TAB ──────────────────────────────────────────────────────── */}
          {activeTab === 'kyc' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* KYC Form */}
              <div className="glass p-6 rounded-2xl border border-slate-800 space-y-5 h-fit">
                <SectionHeader icon={ShieldCheck} title="Submit KYC" subtitle="Verify identity to unlock features" />
                {user.kycStatus === 'Approved' ? (
                  <div className="text-center py-8">
                    <CheckCircle size={40} className="text-emerald-500 mx-auto mb-3" />
                    <p className="text-sm font-bold text-emerald-400">KYC Approved!</p>
                    <p className="text-xs text-slate-500 mt-1">Your identity is verified.</p>
                  </div>
                ) : (
                  <form onSubmit={handleKycSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Verification Type</label>
                      <select value={kycType} onChange={e => setKycType(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500">
                        <option>Farmer</option><option>Tool Owner</option><option>Shopkeeper</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aadhaar Number</label>
                      <input type="text" required placeholder="12-digit Aadhaar" maxLength={12}
                        value={aadhaar} onChange={e => setAadhaar(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500" />
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="space-y-1.5">
                        <ImageUpload 
                          folder="kyc"
                          label="Aadhaar Card Photo"
                          required
                          currentImage={kycAadhaarImage} 
                          onUpload={(url) => setKycAadhaarImage(url)} 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <ImageUpload 
                          folder="kyc"
                          label="Selfie Photo (Optional)"
                          currentImage={kycSelfieImage} 
                          onUpload={(url) => setKycSelfieImage(url)} 
                        />
                      </div>
                    </div>

                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-center">
                      <p className="text-[10px] text-slate-500 font-bold">Current Status</p>
                      <p className={`text-sm font-extrabold mt-0.5 ${user.kycStatus === 'Pending' ? 'text-amber-400 animate-pulse' : 'text-red-400'}`}>
                        {user.kycStatus}
                      </p>
                    </div>
                    <button type="submit" disabled={submittingKYC || user.kycStatus === 'Pending'}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all">
                      {submittingKYC ? 'Submitting...' : user.kycStatus === 'Pending' ? 'Under Review...' : 'Submit KYC'}
                    </button>
                  </form>
                )}
              </div>

              {/* Info */}
              <div className="lg:col-span-2 glass p-6 rounded-2xl border border-slate-800 space-y-4">
                <SectionHeader icon={FileText} title="Why KYC is Required" subtitle="Platform trust and safety" />
                <p className="text-xs text-slate-400 leading-relaxed">
                  All tool owners listing expensive machinery and shopkeepers listing certified agricultural products must complete KYC verification to ensure trust in our ecosystem.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { role: 'Farmers', desc: 'Verify via 12-digit Aadhaar Card', icon: '🌾' },
                    { role: 'Tool Owners', desc: 'Submit machinery registration documents', icon: '🚜' },
                    { role: 'Shopkeepers', desc: 'Provide shop license / GST certificate', icon: '🏪' },
                  ].map(item => (
                    <div key={item.role} className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-2">
                      <span className="text-2xl">{item.icon}</span>
                      <p className="text-xs font-bold text-white">{item.role}</p>
                      <p className="text-[10px] text-slate-400 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── FARMER OVERVIEW ───────────────────────────────────────────────── */}
          {activeTab === 'overview' && (role === 'Farmer' || role === 'Buyer') && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Bookings" value={bookings.length} icon={Calendar} color="bg-emerald-500/10 text-emerald-400" sub={`${bookings.filter(b=>b.status==='Approved').length} approved`} />
                <StatCard label="Total Payments" value={`₹${payments.reduce((a,p)=>a+(p.amount||0),0)}`} icon={CreditCard} color="bg-blue-500/10 text-blue-400" sub={`${payments.length} transactions`} />
                <StatCard label="Disease Scans" value={diseaseScans.length} icon={Activity} color="bg-purple-500/10 text-purple-400" sub="AI analyzed" />
                <StatCard label="XP Points" value={`${user.xp} XP`} icon={Zap} color="bg-amber-500/10 text-amber-400" sub={user.badge} />
              </div>

              {/* Quick Actions */}
              <div className="glass border border-slate-800 rounded-2xl p-5">
                <SectionHeader icon={Zap} title="Quick Actions" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Book Equipment', path: '/rentals', emoji: '🚜', color: 'border-emerald-500/30 hover:border-emerald-500' },
                    { label: 'Detect Disease', path: '/disease-scanner', emoji: '🔬', color: 'border-blue-500/30 hover:border-blue-500' },
                    { label: 'AI Agronomist', path: '/ai-advisory', emoji: '🤖', color: 'border-purple-500/30 hover:border-purple-500' },
                    { label: 'Weather Forecast', path: '/weather', emoji: '🌦️', color: 'border-amber-500/30 hover:border-amber-500' },
                  ].map(action => (
                    <a key={action.label} href={action.path}
                      className={`flex flex-col items-center gap-2 p-4 bg-slate-900/40 border rounded-xl transition-all text-center group ${action.color}`}>
                      <span className="text-2xl group-hover:scale-110 transition-transform">{action.emoji}</span>
                      <span className="text-[11px] font-bold text-slate-300 group-hover:text-white">{action.label}</span>
                    </a>
                  ))}
                </div>
              </div>

              {/* Recent Bookings */}
              {bookings.length > 0 && (
                <div className="glass border border-slate-800 rounded-2xl p-5">
                  <SectionHeader icon={Calendar} title="Recent Bookings" subtitle="Your latest tool rentals" />
                  <div className="space-y-2">
                    {bookings.slice(0, 4).map(b => (
                      <div key={b._id} className="flex items-center justify-between bg-slate-900/40 border border-slate-800 rounded-xl px-4 py-3">
                        <div>
                          <p className="text-xs font-bold text-white">{b.tool?.name || 'Equipment'}</p>
                          <p className="text-[10px] text-slate-500">{new Date(b.startDate).toLocaleDateString()} — {new Date(b.endDate).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <StatusBadge status={b.status} />
                          <p className="text-xs font-extrabold text-emerald-400">₹{b.totalAmount}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── FARMER BOOKINGS ────────────────────────────────────────────────── */}
          {activeTab === 'bookings' && (role === 'Farmer' || role === 'Buyer') && (
            <div className="glass border border-slate-800 rounded-2xl p-6">
              <SectionHeader icon={Calendar} title="Booking History" subtitle="All your tool rental bookings" />
              {bookings.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar size={32} className="text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No bookings yet. <a href="/rentals" className="text-emerald-400 hover:underline">Rent equipment now →</a></p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-3">Equipment</th>
                        <th className="py-3 px-3">Start</th>
                        <th className="py-3 px-3">End</th>
                        <th className="py-3 px-3">Amount</th>
                        <th className="py-3 px-3">Payment</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {bookings.map(b => (
                        <tr key={b._id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="py-3.5 px-3 font-bold text-white">{b.tool?.name || 'Equipment'}</td>
                          <td className="py-3.5 px-3 text-slate-400">{new Date(b.startDate).toLocaleDateString()}</td>
                          <td className="py-3.5 px-3 text-slate-400">{new Date(b.endDate).toLocaleDateString()}</td>
                          <td className="py-3.5 px-3 font-extrabold text-emerald-400">₹{b.totalAmount}</td>
                          <td className="py-3.5 px-3"><StatusBadge status={b.paymentStatus} /></td>
                          <td className="py-3.5 px-3"><StatusBadge status={b.status} /></td>
                          <td className="py-3.5 px-3">
                            {b.status === 'Approved' && b.paymentStatus === 'Unpaid' && (
                              <button
                                onClick={() => handlePayNow(b)}
                                disabled={payingBooking === b._id}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
                              >
                                {payingBooking === b._id ? <RefreshCw size={10} className="animate-spin" /> : <CreditCard size={10} />}
                                Pay ₹{b.totalAmount}
                              </button>
                            )}
                            {b.status === 'Pending' && (
                              <button onClick={() => handleBookingAction(b._id, 'Cancelled')}
                                className="text-red-400 hover:text-red-300 text-[10px] font-bold transition-colors">
                                Cancel
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── FARMER PAYMENTS ────────────────────────────────────────────────── */}
          {activeTab === 'payments' && (role === 'Farmer' || role === 'Buyer') && (
            <div className="glass border border-slate-800 rounded-2xl p-6">
              <SectionHeader icon={CreditCard} title="Payment History" subtitle="All your transactions on AgriRent Hub" />
              {payments.length === 0 ? (
                <div className="text-center py-12">
                  <CreditCard size={32} className="text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No payment records yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map(p => (
                    <div key={p._id} className="flex items-center justify-between bg-slate-900/40 border border-slate-800 rounded-xl px-4 py-3">
                      <div>
                        <p className="text-xs font-bold text-white">Payment #{p.paymentId?.slice(-8)}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{p.orderId}</p>
                        <p className="text-[10px] text-slate-600">{new Date(p.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-base font-extrabold text-emerald-400">₹{p.amount}</p>
                        <StatusBadge status={p.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── FARMER DISEASE SCANS ──────────────────────────────────────────── */}
          {activeTab === 'disease' && (role === 'Farmer' || role === 'Buyer') && (
            <div className="glass border border-slate-800 rounded-2xl p-6">
              <SectionHeader icon={Activity} title="Disease Scan History" subtitle="Your AI-powered crop diagnoses" />
              {diseaseScans.length === 0 ? (
                <div className="text-center py-12">
                  <Activity size={32} className="text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No scans yet. <a href="/disease-scanner" className="text-emerald-400 hover:underline">Scan now →</a></p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {diseaseScans.map(scan => (
                    <div key={scan._id} className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase">{scan.cropName}</span>
                        <StatusBadge status={scan.severity} />
                      </div>
                      <p className="text-xs font-bold text-white">{scan.diseaseName}</p>
                      <p className="text-[10px] text-slate-500">{scan.confidenceScore} confidence</p>
                      <p className="text-[10px] text-slate-400 line-clamp-2">{scan.treatment}</p>
                      <p className="text-[9px] text-slate-600">{new Date(scan.createdAt).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TOOL OWNER OVERVIEW ──────────────────────────────────────────── */}
          {activeTab === 'overview' && role === 'Tool Owner' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Revenue" value={`₹${analytics.revenue}`} icon={DollarSign} color="bg-emerald-500/10 text-emerald-400" sub="All time earnings" />
                <StatCard label="My Tools Listed" value={myProducts.length} icon={Package} color="bg-blue-500/10 text-blue-400" sub="Active listings" />
                <StatCard label="Total Bookings" value={analytics.count} icon={Calendar} color="bg-purple-500/10 text-purple-400" sub="All time" />
                <StatCard label="Pending Requests" value={analytics.pending} icon={Clock} color="bg-amber-500/10 text-amber-400" sub="Awaiting action" />
              </div>

              {/* Revenue Chart */}
              {monthlyRevenueData.length > 0 && (
                <div className="glass border border-slate-800 rounded-2xl p-5">
                  <SectionHeader icon={TrendingUp} title="Monthly Revenue" />
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={monthlyRevenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#475569" tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#e2e8f0', fontSize: '11px' }} />
                      <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Booking Status Pie */}
              {bookingStatusData.length > 0 && (
                <div className="glass border border-slate-800 rounded-2xl p-5">
                  <SectionHeader icon={BarChart3} title="Booking Status Breakdown" />
                  <div className="flex flex-wrap items-center gap-8">
                    <ResponsiveContainer width={180} height={180}>
                      <PieChart>
                        <Pie data={bookingStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value">
                          {bookingStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {bookingStatusData.map(d => (
                        <div key={d.name} className="flex items-center gap-3">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                          <span className="text-xs text-slate-300 font-semibold">{d.name}</span>
                          <span className="text-xs font-extrabold text-white ml-auto">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TOOL OWNER REQUESTS ───────────────────────────────────────────── */}
          {activeTab === 'requests' && role === 'Tool Owner' && (
            <div className="glass border border-slate-800 rounded-2xl p-6">
              <SectionHeader icon={Clock} title="Booking Requests" subtitle="Approve or reject farmer bookings" />
              {bookings.filter(b => b.status === 'Pending').length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle size={32} className="text-emerald-700 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No pending requests. All caught up!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.filter(b => b.status === 'Pending').map(b => (
                    <div key={b._id} className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-white">{b.tool?.name}</p>
                        <p className="text-[10px] text-slate-400">Farmer: {b.farmer?.name} • {b.farmer?.phone}</p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(b.startDate).toLocaleDateString()} → {new Date(b.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-lg font-extrabold text-emerald-400">₹{b.totalAmount}</p>
                        <button onClick={() => handleBookingAction(b._id, 'Approved')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg transition-all" title="Approve">
                          <Check size={14} />
                        </button>
                        <button onClick={() => handleBookingAction(b._id, 'Rejected')}
                          className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-all" title="Reject">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* History */}
              {bookings.filter(b => b.status !== 'Pending').length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-800">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Booking History</p>
                  <div className="space-y-2">
                    {bookings.filter(b => b.status !== 'Pending').map(b => (
                      <div key={b._id} className="flex items-center justify-between bg-slate-950/40 border border-slate-900 rounded-xl px-4 py-3">
                        <div>
                          <p className="text-xs font-bold text-white">{b.tool?.name}</p>
                          <p className="text-[10px] text-slate-500">{b.farmer?.name}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <StatusBadge status={b.status} />
                          <p className="text-xs text-emerald-400 font-bold">₹{b.totalAmount}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TOOL OWNER - MY TOOLS ─────────────────────────────────────────── */}
          {activeTab === 'my-tools' && role === 'Tool Owner' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Add Tool Form */}
              <div className="glass p-5 rounded-2xl border border-slate-800 space-y-4 h-fit">
                <SectionHeader icon={PlusCircle} title="Add New Tool" subtitle="List equipment for rent" />
                <form onSubmit={handleAddTool} className="space-y-3">
                  {[
                    { label: 'Equipment Name', key: 'name', placeholder: 'e.g. John Deere Tractor' },
                    { label: 'Description', key: 'description', placeholder: 'HP, condition, fuel type...' },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key} className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>
                      <input type="text" required placeholder={placeholder}
                        value={toolForm[key]} onChange={e => setToolForm(p => ({ ...p, [key]: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500" />
                    </div>
                  ))}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</label>
                      <select value={toolForm.category} onChange={e => setToolForm(p => ({ ...p, category: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-2 text-xs text-slate-300 focus:outline-none">
                        {['Tractor', 'Rotavator', 'Cultivator', 'Seeder', 'Harvester', 'Sprayer', 'Water Pump'].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Power (HP)</label>
                      <input type="text" placeholder="50 HP" value={toolForm.power}
                        onChange={e => setToolForm(p => ({ ...p, power: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-2 text-xs text-white focus:outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[['Daily', 'daily'], ['Weekly', 'weekly'], ['Monthly', 'monthly']].map(([label, key]) => (
                      <div key={key} className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">{label} ₹</label>
                        <input type="number" required={key === 'daily'} placeholder="0" value={toolForm[key]}
                          onChange={e => setToolForm(p => ({ ...p, [key]: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-2 text-xs text-white focus:outline-none" />
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Village/City</label>
                      <input type="text" placeholder="Your village" value={toolForm.village}
                        onChange={e => setToolForm(p => ({ ...p, village: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-2 text-xs text-white focus:outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">District</label>
                      <input type="text" placeholder="District name" value={toolForm.district}
                        onChange={e => setToolForm(p => ({ ...p, district: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-2 text-xs text-white focus:outline-none" />
                    </div>
                  </div>

                  <MultiImageUpload
                    folder="machine"
                    label="Tool Images"
                    onUpload={urls => setToolImages(urls)}
                    currentImages={toolImages}
                    maxImages={5}
                    required
                  />

                  <button type="submit" disabled={addingTool}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all">
                    {addingTool ? 'Publishing...' : 'Publish Tool Listing'}
                  </button>
                </form>
              </div>

              {/* My Tools List */}
              <div className="lg:col-span-2 glass border border-slate-800 rounded-2xl p-5">
                <SectionHeader icon={Package} title={`My Tools (${myProducts.length})`} subtitle="Active listings" />
                {myProducts.length === 0 ? (
                  <div className="text-center py-12">
                    <Package size={32} className="text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">No tools listed yet. Add your first tool!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myProducts.map(tool => (
                      <div key={tool._id} className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-3 hover:border-slate-700 transition-all">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs font-bold text-white">{tool.name}</p>
                            <p className="text-[10px] text-emerald-400 font-semibold uppercase">{tool.category}</p>
                          </div>
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
                            Active
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500">{tool.specifications?.power}</p>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          {[
                            { label: 'Daily', val: tool.rentRates?.daily },
                            { label: 'Weekly', val: tool.rentRates?.weekly },
                            { label: 'Monthly', val: tool.rentRates?.monthly },
                          ].map(({ label, val }) => (
                            <div key={label} className="bg-slate-950/60 rounded-lg p-2">
                              <p className="text-[9px] text-slate-500 uppercase font-bold">{label}</p>
                              <p className="text-xs font-extrabold text-emerald-400">₹{val}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SHOPKEEPER OVERVIEW ───────────────────────────────────────────── */}
          {activeTab === 'overview' && role === 'Shopkeeper' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard label="Products Listed" value={myProducts.length} icon={ShoppingBag} color="bg-emerald-500/10 text-emerald-400" sub="Active catalog" />
                <StatCard label="Total Stock" value={myProducts.reduce((a, p) => a + (p.stock || 0), 0)} icon={Package} color="bg-blue-500/10 text-blue-400" sub="Units available" />
                <StatCard label="Avg Price" value={`₹${myProducts.length ? Math.round(myProducts.reduce((a, p) => a + p.price, 0) / myProducts.length) : 0}`} icon={DollarSign} color="bg-amber-500/10 text-amber-400" sub="Per product" />
              </div>

              {/* Category breakdown */}
              {myProducts.length > 0 && (() => {
                const cats = myProducts.reduce((acc, p) => {
                  acc[p.type || p.category || 'Other'] = (acc[p.type || p.category || 'Other'] || 0) + 1;
                  return acc;
                }, {});
                const catData = Object.entries(cats).map(([name, value]) => ({ name, value }));
                return (
                  <div className="glass border border-slate-800 rounded-2xl p-5">
                    <SectionHeader icon={BarChart3} title="Products by Category" />
                    <div className="flex flex-wrap gap-8 items-center">
                      <ResponsiveContainer width={180} height={180}>
                        <PieChart>
                          <Pie data={catData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value">
                            {catData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '11px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2">
                        {catData.map((d, i) => (
                          <div key={d.name} className="flex items-center gap-3">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                            <span className="text-xs text-slate-300 font-semibold">{d.name}</span>
                            <span className="text-xs font-extrabold text-white ml-auto">{d.value} products</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── SHOPKEEPER PRODUCTS ───────────────────────────────────────────── */}
          {activeTab === 'products' && role === 'Shopkeeper' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Add Product Form */}
              <div className="glass p-5 rounded-2xl border border-slate-800 space-y-4 h-fit">
                <SectionHeader icon={PlusCircle} title="Add New Product" subtitle="List seeds, fertilizers, etc." />
                <form onSubmit={handleAddProduct} className="space-y-3">
                  {[
                    { label: 'Product Name', key: 'name', placeholder: 'e.g. DAP Fertilizer 50kg' },
                    { label: 'Description', key: 'description', placeholder: 'Nutrients, brand, use-case...' },
                    { label: 'Category', key: 'category', placeholder: 'e.g. NPK, Wheat, Organic' },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key} className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>
                      <input type="text" required placeholder={placeholder}
                        value={prodForm[key]} onChange={e => setProdForm(p => ({ ...p, [key]: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500" />
                    </div>
                  ))}

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Type</label>
                    <select value={prodForm.type} onChange={e => setProdForm(p => ({ ...p, type: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-300 focus:outline-none">
                      {['Seed', 'Fertilizer', 'Pesticide', 'Equipment Part'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Price ₹</label>
                      <input type="number" required value={prodForm.price}
                        onChange={e => setProdForm(p => ({ ...p, price: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stock</label>
                      <input type="number" required value={prodForm.stock}
                        onChange={e => setProdForm(p => ({ ...p, stock: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none" />
                    </div>
                  </div>

                  <MultiImageUpload
                    folder="product"
                    label="Product Images"
                    onUpload={urls => setProdImages(urls)}
                    currentImages={prodImages}
                    maxImages={4}
                    required
                  />

                  <button type="submit" disabled={addingProd}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all">
                    {addingProd ? 'Publishing...' : 'Publish Product'}
                  </button>
                </form>
              </div>

              {/* Products List */}
              <div className="lg:col-span-2 glass border border-slate-800 rounded-2xl p-5">
                <SectionHeader icon={ShoppingBag} title={`Catalog (${myProducts.length})`} />
                {myProducts.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <ShoppingBag size={32} className="mx-auto mb-3 text-slate-700" />
                    <p className="text-sm">No products listed yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider">
                          <th className="py-3 px-2">Product</th>
                          <th className="py-3 px-2">Type</th>
                          <th className="py-3 px-2">Category</th>
                          <th className="py-3 px-2">Price</th>
                          <th className="py-3 px-2">Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900">
                        {myProducts.map(p => (
                          <tr key={p._id} className="hover:bg-slate-900/30">
                            <td className="py-3 px-2 font-bold text-white">{p.name}</td>
                            <td className="py-3 px-2 text-emerald-400 font-semibold">{p.type}</td>
                            <td className="py-3 px-2 text-slate-400">{p.category}</td>
                            <td className="py-3 px-2 font-extrabold text-white">₹{p.price}</td>
                            <td className="py-3 px-2 font-bold text-slate-300">{p.stock} units</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── ADMIN USERS ───────────────────────────────────────────────────── */}
          {activeTab === 'users' && role === 'Admin' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Users" value={allUsers.length} icon={Users} color="bg-emerald-500/10 text-emerald-400" />
                <StatCard label="Farmers" value={allUsers.filter(u => u.role === 'Farmer').length} icon={Leaf} color="bg-blue-500/10 text-blue-400" />
                <StatCard label="Tool Owners" value={allUsers.filter(u => u.role === 'Tool Owner').length} icon={Package} color="bg-amber-500/10 text-amber-400" />
                <StatCard label="Shopkeepers" value={allUsers.filter(u => u.role === 'Shopkeeper').length} icon={ShoppingBag} color="bg-purple-500/10 text-purple-400" />
              </div>

              <div className="glass border border-slate-800 rounded-2xl p-6">
                <SectionHeader icon={Users} title="All Users" subtitle="Platform user management" />
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-3">Name</th>
                        <th className="py-3 px-3">Email</th>
                        <th className="py-3 px-3">Phone</th>
                        <th className="py-3 px-3">Role</th>
                        <th className="py-3 px-3">KYC</th>
                        <th className="py-3 px-3">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {allUsers.map(u => (
                        <tr key={u._id} className="hover:bg-slate-900/30">
                          <td className="py-3 px-3 font-bold text-white">{u.name}</td>
                          <td className="py-3 px-3 text-slate-400">{u.email}</td>
                          <td className="py-3 px-3 text-slate-400">{u.phone}</td>
                          <td className="py-3 px-3">
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">{u.role}</span>
                          </td>
                          <td className="py-3 px-3"><StatusBadge status={u.kycStatus || 'Not Submitted'} /></td>
                          <td className="py-3 px-3 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── ADMIN KYC ─────────────────────────────────────────────────────── */}
          {activeTab === 'kyc' && role === 'Admin' && (
            <div className="space-y-5">
              <div className="glass border border-slate-800 rounded-2xl p-6">
                <SectionHeader icon={FileText} title="KYC Verification Requests" subtitle="Review and approve identity documents" />
                {kycRecords.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle size={32} className="text-emerald-700 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">No pending KYC requests.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {kycRecords.map(rec => (
                      <div key={rec._id}
                        className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all"
                      >
                        <div className="flex flex-col lg:flex-row gap-4">
                          {/* User info */}
                          <div className="flex-shrink-0 space-y-2 lg:w-56">
                            <div className="flex items-center gap-2">
                              {rec.user?.avatar ? (
                                <img src={rec.user.avatar} alt={rec.user?.name} className="w-8 h-8 rounded-full object-cover border border-slate-700" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                                  {rec.user?.name?.charAt(0)}
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-bold text-white">{rec.user?.name}</p>
                                <p className="text-[10px] text-slate-400">{rec.user?.email}</p>
                              </div>
                            </div>
                            <div className="space-y-1 text-[10px]">
                              <p className="text-slate-500">Phone: <span className="text-slate-300">{rec.user?.phone}</span></p>
                              <p className="text-slate-500">Type: <span className="text-emerald-400 font-bold">{rec.verificationType}</span></p>
                              <p className="text-slate-500">Aadhaar: <span className="font-mono text-slate-200">{rec.aadhaarNumber}</span></p>
                              <p className="text-slate-500">Submitted: <span className="text-slate-300">{new Date(rec.createdAt).toLocaleDateString('en-IN')}</span></p>
                            </div>
                            <StatusBadge status={rec.status} />
                          </div>

                          {/* Document images */}
                          <div className="flex-1">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Uploaded Documents</p>
                            <div className="flex flex-wrap gap-3">
                              {rec.aadhaarImage ? (
                                <div className="text-center">
                                  <a href={rec.aadhaarImage} target="_blank" rel="noopener noreferrer" title="View Aadhaar">
                                    <img src={rec.aadhaarImage} alt="Aadhaar" className="w-20 h-14 object-cover rounded-lg border border-slate-700 hover:border-emerald-500 transition-all cursor-pointer" />
                                  </a>
                                  <p className="text-[9px] text-slate-500 mt-1">Aadhaar</p>
                                </div>
                              ) : (
                                <div className="text-center">
                                  <div className="w-20 h-14 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700">
                                    <p className="text-[9px] text-slate-600">No Aadhaar</p>
                                  </div>
                                  <p className="text-[9px] text-red-400 mt-1">Missing!</p>
                                </div>
                              )}
                              {rec.selfieImage && (
                                <div className="text-center">
                                  <a href={rec.selfieImage} target="_blank" rel="noopener noreferrer" title="View Selfie">
                                    <img src={rec.selfieImage} alt="Selfie" className="w-20 h-14 object-cover rounded-lg border border-slate-700 hover:border-emerald-500 transition-all cursor-pointer" />
                                  </a>
                                  <p className="text-[9px] text-slate-500 mt-1">Selfie</p>
                                </div>
                              )}
                              {rec.machineDocImage && (
                                <div className="text-center">
                                  <a href={rec.machineDocImage} target="_blank" rel="noopener noreferrer">
                                    <img src={rec.machineDocImage} alt="Machine Doc" className="w-20 h-14 object-cover rounded-lg border border-slate-700 hover:border-emerald-500 transition-all cursor-pointer" />
                                  </a>
                                  <p className="text-[9px] text-slate-500 mt-1">Machine</p>
                                </div>
                              )}
                              {rec.shopLicenseImage && (
                                <div className="text-center">
                                  <a href={rec.shopLicenseImage} target="_blank" rel="noopener noreferrer">
                                    <img src={rec.shopLicenseImage} alt="Shop License" className="w-20 h-14 object-cover rounded-lg border border-slate-700 hover:border-emerald-500 transition-all cursor-pointer" />
                                  </a>
                                  <p className="text-[9px] text-slate-500 mt-1">Shop License</p>
                                </div>
                              )}
                            </div>

                            {rec.rejectionReason && (
                              <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <p className="text-[10px] text-red-400"><strong>Rejection Reason:</strong> {rec.rejectionReason}</p>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex-shrink-0 flex flex-col gap-2 lg:w-36">
                            {rec.status === 'Pending' ? (
                              <>
                                <button
                                  onClick={() => handleReviewKYC(rec._id, 'Approved')}
                                  className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-xl hover:bg-emerald-600/40 transition-all"
                                >
                                  <Check size={12} /> Approve
                                </button>
                                <button
                                  onClick={() => handleReviewKYC(rec._id, 'Rejected')}
                                  className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold bg-red-600/20 text-red-400 border border-red-500/30 rounded-xl hover:bg-red-600/40 transition-all"
                                >
                                  <X size={12} /> Reject
                                </button>
                              </>
                            ) : (
                              <p className="text-[10px] text-slate-600 italic">
                                Reviewed {rec.reviewedAt ? new Date(rec.reviewedAt).toLocaleDateString('en-IN') : '—'}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── ANALYTICS TAB (Tool Owner / Shopkeeper / Admin) ──────────────── */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard 
                  label="Revenue" 
                  value={role === 'Admin' 
                    ? `₹${(adminStats?.stats?.totalRevenue || 0).toLocaleString('en-IN')}` 
                    : `₹${analytics.revenue}`
                  } 
                  icon={DollarSign} 
                  color="bg-emerald-500/10 text-emerald-400" 
                  sub={role === 'Admin' ? "Total platform revenue" : "Total earned"} 
                />
                <StatCard 
                  label="Items" 
                  value={role === 'Admin' 
                    ? (adminStats?.stats?.totalTools || 0) + (adminStats?.stats?.totalProducts || 0) 
                    : (analytics.count || myProducts.length)
                  } 
                  icon={Package} 
                  color="bg-blue-500/10 text-blue-400" 
                  sub={role === 'Admin' ? "Platform listings" : "Active listings"} 
                />
                <StatCard 
                  label="Bookings" 
                  value={role === 'Admin' 
                    ? (adminStats?.stats?.totalBookings || 0) 
                    : (bookings.length || analytics.count)
                  } 
                  icon={Calendar} 
                  color="bg-purple-500/10 text-purple-400" 
                  sub={role === 'Admin' ? "Platform bookings" : "All time"} 
                />
                <StatCard 
                  label="Pending" 
                  value={role === 'Admin' 
                    ? (adminStats?.stats?.pendingBookings || 0) + (adminStats?.stats?.pendingKYC || 0) 
                    : (analytics.pending || 0)
                  } 
                  icon={Clock} 
                  color="bg-amber-500/10 text-amber-400" 
                  sub="Needs action" 
                />
              </div>

              {role === 'Admin' ? (
                <div className="glass border border-slate-800 rounded-2xl p-8 text-center">
                  <TrendingUp size={32} className="text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">Please visit the dedicated Admin Panel for detailed graphical trend reports.</p>
                </div>
              ) : monthlyRevenueData.length > 0 ? (
                <div className="glass border border-slate-800 rounded-2xl p-5">
                  <SectionHeader icon={TrendingUp} title="Revenue Trend" />
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={monthlyRevenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#475569" tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#e2e8f0', fontSize: '11px' }} />
                      <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', strokeWidth: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="glass border border-slate-800 rounded-2xl p-8 text-center">
                  <TrendingUp size={32} className="text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">Revenue data will appear here once you have approved bookings or sales.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboards;
