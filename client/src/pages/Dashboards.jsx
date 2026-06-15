import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { updateKYC } from '../store/authSlice';
import { BarChart3, Users, DollarSign, Tractor, ShoppingBag, ShieldCheck, FileText, Check, X, PlusCircle, Trash, Star } from 'lucide-react';

const Dashboards = () => {
  const { user, token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  // KYC submit states
  const [aadhaar, setAadhaar] = useState('');
  const [kycType, setKycType] = useState('Farmer');
  const [submittingKYC, setSubmittingKYC] = useState(false);

  // Common data states
  const [bookings, setBookings] = useState([]);
  const [myProducts, setMyProducts] = useState([]);
  const [kycRecords, setKycRecords] = useState([]);
  const [analytics, setAnalytics] = useState({ revenue: 0, count: 0 });

  // Tool Owner listing form states
  const [toolName, setToolName] = useState('');
  const [toolDesc, setToolDesc] = useState('');
  const [toolCat, setToolCat] = useState('Tractor');
  const [dailyRate, setDailyRate] = useState('');
  const [weeklyRate, setWeeklyRate] = useState('');
  const [monthlyRate, setMonthlyRate] = useState('');
  const [power, setPower] = useState('');
  const [fuel, setFuel] = useState('Diesel');

  // Shopkeeper product form states
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodType, setProdType] = useState('Seed'); // 'Seed' or 'Fertilizer'
  const [prodCat, setProdCat] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodStock, setProdStock] = useState('');

  // Initial Fetch based on role
  const loadDashboardData = async () => {
    if (!token) return;
    try {
      if (user.role === 'Farmer') {
        // Fetch my rentals
        const res = await axios.get('/api/bookings/my-rentals', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
          setBookings(res.data.bookings);
        }
      } else if (user.role === 'Tool Owner') {
        // Fetch bookings requests
        const resReq = await axios.get('/api/bookings/requests', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (resReq.data.success) {
          setBookings(resReq.data.bookings);
          
          // Calculate owner revenue
          const approved = resReq.data.bookings.filter(b => b.status === 'Approved' || b.status === 'Completed');
          const sum = approved.reduce((acc, b) => acc + b.totalAmount, 0);
          setAnalytics({ revenue: sum, count: resReq.data.bookings.length });
        }

        // Fetch my tool listings
        const resTools = await axios.get('/api/tools');
        if (resTools.data.success) {
          const mine = resTools.data.tools.filter(t => t.owner?._id === user._id || t.owner === user._id);
          setMyProducts(mine);
        }
      } else if (user.role === 'Shopkeeper') {
        // Fetch my listed shop products
        const resProd = await axios.get('/api/products');
        if (resProd.data.success) {
          const mine = resProd.data.products.filter(p => p.shopkeeper?._id === user._id || p.shopkeeper === user._id);
          setMyProducts(mine);
        }
      } else if (user.role === 'Admin') {
        // Fetch KYC records
        const resKyc = await axios.get('/api/kyc/records', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (resKyc.data.success) {
          setKycRecords(resKyc.data.records);
        }
      }
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user, token]);

  // Submit KYC Handler
  const handleKycSubmit = async (e) => {
    e.preventDefault();
    if (!aadhaar || aadhaar.length !== 12) {
      alert('Please provide a valid 12-digit Aadhaar Card number.');
      return;
    }

    setSubmittingKYC(true);
    try {
      const res = await axios.post('/api/kyc/submit', {
        aadhaarNumber: aadhaar,
        verificationType: kycType,
        documentImage: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&q=80&w=200'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        alert('KYC documents submitted successfully! Status is now Pending Admin review.');
        dispatch(updateKYC('Pending'));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error submitting KYC.');
    } finally {
      setSubmittingKYC(false);
    }
  };

  // Admin KYC Review Action
  const handleReviewKYC = async (id, status) => {
    try {
      const res = await axios.put(`/api/kyc/review/${id}`, {
        status,
        rejectionReason: status === 'Rejected' ? 'Documents could not be verified.' : ''
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        alert(`KYC status updated to ${status}!`);
        // reload admin lists
        loadDashboardData();
      }
    } catch (err) {
      alert('Error updating KYC review status.');
    }
  };

  // Owner Booking status updates
  const handleBookingAction = async (bookingId, status) => {
    try {
      const res = await axios.put(`/api/bookings/${bookingId}/status`, {
        status
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        alert(`Booking status marked as ${status}.`);
        loadDashboardData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating booking status.');
    }
  };

  // Owner Tool Listing creation
  const handleAddTool = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/tools', {
        name: toolName,
        description: toolDesc,
        category: toolCat,
        rentRates: {
          daily: Number(dailyRate),
          weekly: Number(weeklyRate),
          monthly: Number(monthlyRate)
        },
        specifications: {
          power,
          fuelType: fuel
        },
        coordinates: [77.2090, 28.6139] // Delhi
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        alert('Equipment listing published successfully!');
        setToolName('');
        setToolDesc('');
        setDailyRate('');
        setWeeklyRate('');
        setMonthlyRate('');
        setPower('');
        loadDashboardData();
      }
    } catch (err) {
      alert('Error publishing tool listing.');
    }
  };

  // Shopkeeper Product listing creation
  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/products', {
        name: prodName,
        description: prodDesc,
        type: prodType,
        category: prodCat,
        price: Number(prodPrice),
        stock: Number(prodStock),
        images: ['https://images.unsplash.com/photo-1622383563227-04401ab4e5ea?auto=format&fit=crop&q=80&w=200']
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        alert('Product listing created successfully!');
        setProdName('');
        setProdDesc('');
        setProdCat('');
        setProdPrice('');
        setProdStock('');
        loadDashboardData();
      }
    } catch (err) {
      alert('Error publishing product catalog.');
    }
  };

  if (!token) {
    return (
      <div className="text-center py-20 text-slate-500">
        Please log in to access your dashboard metrics.
      </div>
    );
  }

  return (
    <div className="space-y-12">
      
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">{user.role} Dashboard</h1>
        <p className="text-slate-400 text-xs mt-1">Review your activities, checkouts, and security profile clearances.</p>
      </div>

      {/* KYC Verification Form Gate */}
      {user.kycStatus !== 'Approved' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* KYC Submit details */}
          <div className="glass p-6 rounded-3xl border border-slate-800 space-y-6 h-fit">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="text-emerald-400" size={20} /> Submit KYC Documents
              </h3>
              <p className="text-xs text-slate-400">Verifying your identity unlocks listings marketplaces.</p>
            </div>

            <form onSubmit={handleKycSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pl-0.5">Verification Role</label>
                <select
                  value={kycType}
                  onChange={(e) => setKycType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none"
                >
                  <option value="Farmer">Farmer Aadhaar</option>
                  <option value="Tool Owner">Tool Owner Certification</option>
                  <option value="Shopkeeper">Shopkeeper Business License</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pl-0.5">Aadhaar Card Number</label>
                <input
                  type="text"
                  required
                  placeholder="12-digit number"
                  maxLength={12}
                  value={aadhaar}
                  onChange={(e) => setAadhaar(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="bg-slate-950/40 p-4 border border-slate-850 rounded-xl text-center space-y-1">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">KYC Status</p>
                <p className={`text-xs font-bold ${
                  user.kycStatus === 'Pending' ? 'text-amber-400 animate-pulse' : 'text-red-400'
                }`}>
                  {user.kycStatus}
                </p>
              </div>

              <button
                type="submit"
                disabled={submittingKYC || user.kycStatus === 'Pending'}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs transition-colors shadow-md uppercase tracking-wider"
              >
                {submittingKYC ? 'Submitting...' : 'Upload KYC'}
              </button>
            </form>
          </div>

          {/* KYC FAQ */}
          <div className="lg:col-span-2 glass p-8 rounded-3xl border border-slate-800 space-y-4 flex flex-col justify-center">
            <h3 className="text-base font-bold text-slate-200">Why does AgriRent Hub require KYC?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              To guarantee trust within our sharing ecosystem, all tool owners listing expensive tractors and shopkeepers listing premium certified crop products must submit verification.
            </p>
            <ul className="text-xs text-slate-400 space-y-2 list-disc pl-5 leading-relaxed">
              <li>Farmers verify using their unique 12-digit Aadhaar.</li>
              <li>Tool Owners must hold legal machinery log books.</li>
              <li>Shopkeepers provide official regional seed vendor certification.</li>
            </ul>
          </div>

        </div>
      )}

      {/* role specific dashboards views */}
      
      {/* 1. FARMER VIEW */}
      {user.role === 'Farmer' && (
        <div className="space-y-8 animate-fade-in">
          {/* Metrics summary widgets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/40 p-6 border border-slate-850 rounded-2xl text-center space-y-1">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Total Shared bookings</p>
              <p className="text-3xl font-extrabold text-emerald-400">{bookings.length} Orders</p>
            </div>
            <div className="bg-slate-900/40 p-6 border border-slate-850 rounded-2xl text-center space-y-1">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold font-bold">Agri Coins</p>
              <p className="text-3xl font-extrabold text-white">🪙 {user.coins}</p>
            </div>
            <div className="bg-slate-900/40 p-6 border border-slate-850 rounded-2xl text-center space-y-1">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold font-bold">XP Level status</p>
              <p className="text-3xl font-extrabold text-white">⚡ {user.xp} XP</p>
            </div>
          </div>

          {/* Bookings history table */}
          <div className="glass p-6 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-850 pb-2">
              Rental History & Tracking
            </h3>

            {bookings.length === 0 ? (
              <p className="text-slate-500 text-xs py-8 text-center">You have not requested any machinery rentals yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-850 text-slate-500 uppercase tracking-wider font-bold">
                      <th className="py-3 px-4">Equipment</th>
                      <th className="py-3 px-4">Start Date</th>
                      <th className="py-3 px-4">End Date</th>
                      <th className="py-3 px-4">Cost</th>
                      <th className="py-3 px-4">Payment</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-slate-350">
                    {bookings.map(b => (
                      <tr key={b._id} className="hover:bg-slate-950/20">
                        <td className="py-3.5 px-4 font-bold text-white">{b.tool?.name || 'Machinery'}</td>
                        <td className="py-3.5 px-4">{new Date(b.startDate).toLocaleDateString()}</td>
                        <td className="py-3.5 px-4">{new Date(b.endDate).toLocaleDateString()}</td>
                        <td className="py-3.5 px-4 font-bold text-emerald-400">₹{b.totalAmount}</td>
                        <td className="py-3.5 px-4">{b.paymentStatus}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            b.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' :
                            b.status === 'Pending' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
                          }`}>{b.status}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          {b.status === 'Pending' && (
                            <button
                              onClick={() => handleBookingAction(b._id, 'Cancelled')}
                              className="text-red-400 hover:text-red-300 font-bold transition-colors"
                            >
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
        </div>
      )}

      {/* 2. TOOL OWNER VIEW */}
      {user.role === 'Tool Owner' && (
        <div className="space-y-12 animate-fade-in">
          
          {/* Metrics summary widgets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/40 p-6 border border-slate-850 rounded-2xl text-center space-y-1">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Total earnings volume</p>
              <p className="text-3xl font-extrabold text-emerald-400">₹{analytics.revenue}</p>
            </div>
            <div className="bg-slate-900/40 p-6 border border-slate-850 rounded-2xl text-center space-y-1">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Active Listings</p>
              <p className="text-3xl font-extrabold text-white">{myProducts.length} Machines</p>
            </div>
            <div className="bg-slate-900/40 p-6 border border-slate-850 rounded-2xl text-center space-y-1">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Total Booking queries</p>
              <p className="text-3xl font-extrabold text-white">{analytics.count} Orders</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Owner listings forms */}
            <div className="glass p-6 rounded-2xl border border-slate-800 space-y-6 h-fit">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                  <PlusCircle className="text-emerald-400" size={18} /> Publish New Machine
                </h3>
                <p className="text-xs text-slate-400">Add active tractors, water pumps, sprayers...</p>
              </div>

              <form onSubmit={handleAddTool} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Equipment Name</label>
                  <input
                    type="text" required value={toolName} onChange={(e) => setToolName(e.target.value)}
                    placeholder="e.g. John Deere Harvester 505"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-white focus:outline-none"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Description</label>
                  <textarea
                    required rows={2} value={toolDesc} onChange={(e) => setToolDesc(e.target.value)}
                    placeholder="Enter horse power details, tires condition..."
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-white focus:outline-none resize-none"
                  ></textarea>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Category</label>
                    <select
                      value={toolCat} onChange={(e) => setToolCat(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="Tractor">Tractor</option>
                      <option value="Rotavator">Rotavator</option>
                      <option value="Cultivator">Cultivator</option>
                      <option value="Seeder">Seeder</option>
                      <option value="Harvester">Harvester</option>
                      <option value="Sprayer">Sprayer</option>
                      <option value="Water Pump">Water Pump</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Power HP</label>
                    <input
                      type="text" required value={power} onChange={(e) => setPower(e.target.value)}
                      placeholder="e.g. 50 HP"
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Daily (₹)</label>
                    <input
                      type="number" required value={dailyRate} onChange={(e) => setDailyRate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Weekly (₹)</label>
                    <input
                      type="number" required value={weeklyRate} onChange={(e) => setWeeklyRate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Monthly (₹)</label>
                    <input
                      type="number" required value={monthlyRate} onChange={(e) => setMonthlyRate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider"
                >
                  Publish Listing
                </button>
              </form>
            </div>

            {/* Bookings Approvals and Machinery Catalog listings */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Requests list */}
              <div className="glass p-6 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-850 pb-2">
                  Pending Bookings Requests
                </h3>

                {bookings.filter(b => b.status === 'Pending').length === 0 ? (
                  <p className="text-slate-500 text-xs py-4 text-center">No pending machinery bookings requests.</p>
                ) : (
                  <div className="space-y-3">
                    {bookings.filter(b => b.status === 'Pending').map(b => (
                      <div key={b._id} className="bg-slate-950/40 p-4 border border-slate-850 rounded-xl flex items-center justify-between text-xs gap-4">
                        <div>
                          <p className="font-bold text-white">{b.tool?.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Farmer: {b.farmer?.name} ({b.farmer?.phone})
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Dates: {new Date(b.startDate).toLocaleDateString()} to {new Date(b.endDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <p className="font-extrabold text-emerald-400">₹{b.totalAmount}</p>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleBookingAction(b._id, 'Approved')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded"
                              title="Approve Booking"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => handleBookingAction(b._id, 'Rejected')}
                              className="bg-red-600 hover:bg-red-700 text-white p-1.5 rounded"
                              title="Reject Request"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Machinery catalog list */}
              <div className="glass p-6 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-850 pb-2">
                  Active Machinery Inventory
                </h3>

                {myProducts.length === 0 ? (
                  <p className="text-slate-500 text-xs py-4 text-center">You have not listed any machinery catalog yet.</p>
                ) : (
                  <div className="divide-y divide-slate-850">
                    {myProducts.map(tool => (
                      <div key={tool._id} className="py-3 flex items-center justify-between text-xs gap-4">
                        <div>
                          <p className="font-bold text-white">{tool.name}</p>
                          <p className="text-[9px] text-slate-400 uppercase font-semibold">{tool.category} | {tool.specifications?.power}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-extrabold text-emerald-400">₹{tool.rentRates?.daily}/Day</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* 3. SHOPKEEPER VIEW */}
      {user.role === 'Shopkeeper' && (
        <div className="space-y-12 animate-fade-in">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Create Product Form */}
            <div className="glass p-6 rounded-2xl border border-slate-800 space-y-6 h-fit">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                  <PlusCircle className="text-emerald-400" size={18} /> Publish Shop Product
                </h3>
                <p className="text-xs text-slate-400">Add high-yield seeds or chemical inputs.</p>
              </div>

              <form onSubmit={handleAddProduct} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Product Name</label>
                  <input
                    type="text" required value={prodName} onChange={(e) => setProdName(e.target.value)}
                    placeholder="e.g. Shaktiman DAP Compost Bag"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Description</label>
                  <textarea
                    required rows={2} value={prodDesc} onChange={(e) => setProdDesc(e.target.value)}
                    placeholder="Enter nutrient formulas, weight sizes..."
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-white focus:outline-none resize-none"
                  ></textarea>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Input Type</label>
                    <select
                      value={prodType} onChange={(e) => setProdType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-350 focus:outline-none"
                    >
                      <option value="Seed">Seeds</option>
                      <option value="Fertilizer">Fertilizers</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Category</label>
                    <input
                      type="text" required value={prodCat} onChange={(e) => setProdCat(e.target.value)}
                      placeholder="e.g. Wheat, NPK, Organic"
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Price per bag (₹)</label>
                    <input
                      type="number" required value={prodPrice} onChange={(e) => setProdPrice(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Available Stock</label>
                    <input
                      type="number" required value={prodStock} onChange={(e) => setProdStock(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider"
                >
                  Publish Listing
                </button>
              </form>
            </div>

            {/* Shop Product Inventory Manager */}
            <div className="lg:col-span-2 glass p-6 rounded-2xl border border-slate-800 space-y-4 h-fit">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-850 pb-2">
                Active Catalog Inventory
              </h3>

              {myProducts.length === 0 ? (
                <p className="text-slate-500 text-xs py-4 text-center">You have not listed any catalog products yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-850 text-slate-500 uppercase tracking-wider font-bold">
                        <th className="py-2.5 px-2">Product</th>
                        <th className="py-2.5 px-2">Type</th>
                        <th className="py-2.5 px-2">Category</th>
                        <th className="py-2.5 px-2">Price</th>
                        <th className="py-2.5 px-2">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-855 text-slate-350">
                      {myProducts.map(p => (
                        <tr key={p._id}>
                          <td className="py-3 px-2 font-bold text-white">{p.name}</td>
                          <td className="py-3 px-2 font-semibold text-emerald-400">{p.type}</td>
                          <td className="py-3 px-2">{p.category}</td>
                          <td className="py-3 px-2 font-bold text-white">₹{p.price}</td>
                          <td className="py-3 px-2 font-extrabold">{p.stock} bags</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 4. ADMIN VIEW */}
      {user.role === 'Admin' && (
        <div className="space-y-8 animate-fade-in">
          
          {/* KYC Records approval tray */}
          <div className="glass p-6 rounded-3xl border border-slate-800 space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                <FileText className="text-emerald-400" size={20} /> KYC Registration Approvals
              </h3>
              <p className="text-xs text-slate-400">Review and verify Aadhaar uploads submitted by farmers and business shopkeepers.</p>
            </div>

            {kycRecords.length === 0 ? (
              <p className="text-slate-500 text-xs py-8 text-center">No KYC verification requests have been submitted yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-850 text-slate-500 uppercase tracking-wider font-bold">
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Role Request</th>
                      <th className="py-3 px-4">Aadhaar</th>
                      <th className="py-3 px-4">Submitted Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Review Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-slate-350">
                    {kycRecords.map(rec => (
                      <tr key={rec._id} className="hover:bg-slate-950/20">
                        <td className="py-3.5 px-4 font-bold text-white">{rec.user?.name}</td>
                        <td className="py-3.5 px-4 font-semibold text-emerald-400">{rec.verificationType}</td>
                        <td className="py-3.5 px-4 font-mono">{rec.aadhaarNumber}</td>
                        <td className="py-3.5 px-4">{new Date(rec.createdAt).toLocaleDateString()}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            rec.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' :
                            rec.status === 'Pending' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
                          }`}>{rec.status}</span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {rec.status === 'Pending' && (
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => handleReviewKYC(rec._id, 'Approved')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1 px-2.5 rounded transition-all"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReviewKYC(rec._id, 'Rejected')}
                                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-1 px-2.5 rounded transition-all"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboards;
