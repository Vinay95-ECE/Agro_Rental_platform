import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { PlusCircle, Search, MessageSquare, AlertCircle, Sparkles, CheckCircle } from 'lucide-react';
import { updateGamification } from '../store/authSlice';

const Crops = () => {
  const { user, token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  // listings
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // form state (farmer)
  const [cropName, setCropName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [harvestDate, setHarvestDate] = useState('');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState('');
  const [district, setDistrict] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchCrops = async () => {
    setLoading(true);
    try {
      const searchParam = search ? `&search=${search}` : '';
      const minParam = minPrice ? `&minPrice=${minPrice}` : '';
      const maxParam = maxPrice ? `&maxPrice=${maxPrice}` : '';
      const response = await axios.get(`/api/crops?${searchParam}${minParam}${maxParam}`);
      if (response.data.success) {
        setCrops(response.data.crops);
      }
    } catch (err) {
      console.error('Error fetching crops:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCrops();
  }, [search, minPrice, maxPrice]);

  const handlePostCrop = async (e) => {
    e.preventDefault();
    if (!cropName || !quantity || !price) {
      alert('Please fill in crop name, quantity, and unit price.');
      return;
    }

    setFormLoading(true);
    try {
      const response = await axios.post('/api/crops', {
        cropName,
        quantity: Number(quantity),
        unit,
        harvestDate: harvestDate || new Date(),
        price: Number(price),
        images: [image || 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600'],
        coordinates: [77.2090, 28.6139] // Delhi fallback coordinates
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        alert('Crop listed successfully! Earned +20 XP points for direct farm posting.');
        
        // Update user XP in Redux
        if (user) {
          dispatch(updateGamification({
            xp: user.xp + 20,
            coins: user.coins,
            badge: user.badge
          }));
        }

        setCropName('');
        setQuantity('');
        setUnit('kg');
        setHarvestDate('');
        setPrice('');
        setImage('');
        setDistrict('');
        fetchCrops();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error occurred listing crop.');
    } finally {
      setFormLoading(false);
    }
  };

  const handlePurchase = async (cropId) => {
    if (!token) {
      alert('Please log in to purchase or inquire about crops.');
      return;
    }

    try {
      const res = await axios.post(`/api/crops/${cropId}/purchase`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        alert('Inquiry submitted! The farmer has been notified, and you can chat with them directly to arrange shipping.');
        fetchCrops(); // Refresh list to reflect sold status
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error executing purchase inquiry.');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Crop Marketplace</h1>
        <p className="text-slate-400 text-xs mt-1">Direct-to-buyer agricultural trade. Bypass middlemen, secure peak margins.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Post Crop Form (Farmer only) */}
        <div className="glass p-6 rounded-2xl border border-slate-800 space-y-6 h-fit">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <PlusCircle size={20} className="text-emerald-400" /> Post Harvest Listing
            </h3>
            <p className="text-xs text-slate-400 font-medium">Farmers can post crops and earn XP incentives.</p>
          </div>

          <form onSubmit={handlePostCrop} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pl-0.5">Crop Name</label>
              <input
                type="text"
                required
                value={cropName}
                onChange={(e) => setCropName(e.target.value)}
                placeholder="e.g. Organic Basmati Rice, Durum Wheat..."
                className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:border-emerald-500 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Quantity</label>
                <input
                  type="number"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:border-emerald-500 text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Unit</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:border-emerald-500 text-slate-300"
                >
                  <option value="kg">kg</option>
                  <option value="Quintal">Quintal</option>
                  <option value="Ton">Ton</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Price per Unit (₹)</label>
                <input
                  type="number"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Price"
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:border-emerald-500 text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Harvest Date</label>
                <input
                  type="date"
                  value={harvestDate}
                  onChange={(e) => setHarvestDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:border-emerald-500 text-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pl-0.5">Crop Image Link (Optional)</label>
              <input
                type="url"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://example.com/crop.jpg"
                className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:border-emerald-500 text-white"
              />
            </div>

            {token && user?.role === 'Farmer' ? (
              <button
                type="submit"
                disabled={formLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs transition-colors shadow-md uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                <Sparkles size={14} />
                {formLoading ? 'Posting harvest...' : 'Publish Listing (+20 XP)'}
              </button>
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs p-3 rounded-xl flex items-start gap-2">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p>Only logged in Farmers can list harvest cycles for direct-to-buyer sales.</p>
              </div>
            )}
          </form>
        </div>

        {/* Right Column: Active Sales Catalog */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-850 pb-3">
            <h3 className="text-base font-bold text-white">Active Harvest Offerings</h3>
            
            {/* Filter Search keyword */}
            <div className="relative flex items-center max-w-xs w-full">
              <Search size={14} className="absolute left-3.5 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search crop varieties..."
                className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-emerald-500 text-slate-200 placeholder-slate-650"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20 text-slate-500">Loading crops catalog...</div>
          ) : crops.length === 0 ? (
            <div className="text-center py-20 text-slate-500">No active crops listed at this time. Check back later!</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {crops.map((crop) => (
                <div key={crop._id} className="glass-card overflow-hidden rounded-2xl border border-slate-800 flex flex-col justify-between">
                  <img
                    src={crop.images?.[0] || 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=400'}
                    alt={crop.cropName}
                    className="h-44 w-full object-cover"
                  />
                  <div className="p-6 space-y-4 flex-grow flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="text-base font-bold text-white leading-tight">{crop.cropName}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          crop.status === 'Available' 
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                            : 'bg-red-500/10 border border-red-500/20 text-red-400'
                        }`}>
                          {crop.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Harvested by {crop.farmer?.name || 'Local Farmer'}</p>
                    </div>

                    <div className="flex items-center justify-between bg-slate-950/40 border border-slate-850 p-3 rounded-xl text-xs font-semibold">
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Batch Size</p>
                        <p className="text-slate-300 font-bold mt-0.5">{crop.quantity} {crop.unit}</p>
                      </div>
                      <div className="h-6 w-[1px] bg-slate-800"></div>
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Mandi Price</p>
                        <p className="text-emerald-400 font-extrabold mt-0.5">₹{crop.price}/{crop.unit}</p>
                      </div>
                    </div>

                    {crop.status === 'Available' ? (
                      <button
                        onClick={() => handlePurchase(crop._id)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-md flex items-center justify-center gap-1.5"
                      >
                        <MessageSquare size={14} /> Buy / Inquire Harvest
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-full bg-slate-800 border border-slate-850 text-slate-500 py-2.5 rounded-xl text-xs font-semibold cursor-not-allowed flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle size={14} /> Harvest Batch Sold Out
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Crops;
