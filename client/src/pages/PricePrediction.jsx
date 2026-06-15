import React, { useState } from 'react';
import axios from 'axios';
import { AreaChart, TrendingUp, DollarSign, Calendar, MapPin, CalendarDays, LineChart } from 'lucide-react';

const PricePrediction = () => {
  const [crop, setCrop] = useState('Wheat');
  const [state, setState] = useState('Punjab');
  const [district, setDistrict] = useState('Ludhiana');
  const [season, setSeason] = useState('Rabi');
  
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  const handlePredict = async (e) => {
    e.preventDefault();
    if (!district.trim()) {
      alert('Please enter a district.');
      return;
    }

    setLoading(true);
    setReport(null);

    try {
      const response = await axios.post('/api/ai/predict-price', {
        crop,
        state,
        district,
        season
      });

      if (response.data.success) {
        // Mock a 1.2-second calculation delay for premium UI feel
        setTimeout(() => {
          setReport(response.data.prediction);
          setLoading(false);
        }, 1200);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error occurred calculating crop prices.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-2">
          <TrendingUp size={30} className="text-emerald-400" /> Mandi Price Predictor
        </h1>
        <p className="text-slate-400 text-xs max-w-lg mx-auto">
          Calculate expected crop Mandi prices and review month-on-month trend forecasts to determine the peak selling windows.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Scope Inputs */}
        <div className="glass p-6 rounded-3xl border border-slate-800 space-y-4 h-fit">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-850 pb-2 flex items-center gap-1.5">
            <Calendar size={16} className="text-emerald-400" /> scope parameters
          </h3>

          <form onSubmit={handlePredict} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pl-0.5">Crop Variety</label>
              <select
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="Wheat">Wheat (गेंहू)</option>
                <option value="Rice">Rice (धान)</option>
                <option value="Corn">Corn (मक्का)</option>
                <option value="Soybean">Soybean (सोयाबीन)</option>
                <option value="Mustard">Mustard (सरसों)</option>
                <option value="Cotton">Cotton (कपास)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pl-0.5">State</label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="Punjab">Punjab</option>
                <option value="Haryana">Haryana</option>
                <option value="Uttar Pradesh">Uttar Pradesh</option>
                <option value="Madhya Pradesh">Madhya Pradesh</option>
                <option value="Rajasthan">Rajasthan</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pl-0.5">District</label>
              <div className="relative flex items-center">
                <MapPin size={14} className="absolute left-3 text-slate-500" />
                <input
                  type="text"
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="e.g. Ludhiana, Karnal..."
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pl-0.5">Harvest Season</label>
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="Rabi">Rabi (Winter Cycle)</option>
                <option value="Kharif">Kharif (Monsoon Cycle)</option>
                <option value="Zaid">Zaid (Summer Cycle)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs transition-colors shadow-md uppercase tracking-wider"
            >
              {loading ? 'Analyzing Mandi Metrics...' : 'Calculate Forecast'}
            </button>
          </form>
        </div>

        {/* Prediction Results Report */}
        <div className="md:col-span-2 glass p-6 rounded-3xl border border-slate-800 flex flex-col justify-center min-h-[400px]">
          {loading ? (
            <div className="text-center space-y-4">
              <LineChart size={40} className="text-emerald-500 animate-pulse mx-auto" />
              <div>
                <p className="text-xs font-bold text-white">Aggregating Mandi Supply Indices...</p>
                <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-bold">Random Forest regression</p>
              </div>
            </div>
          ) : report ? (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-850 pb-2 flex items-center gap-1.5">
                <AreaChart size={16} className="text-emerald-400" /> Pricing Report
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-950/40 p-4 border border-slate-850 rounded-xl text-center space-y-1">
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Expected Price / Qtl</p>
                  <p className="text-2xl font-extrabold text-emerald-400">₹{report.expectedPrice}</p>
                </div>
                <div className="bg-slate-950/40 p-4 border border-slate-850 rounded-xl text-center space-y-1">
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Minimum Cap</p>
                  <p className="text-lg font-bold text-slate-300">₹{report.priceRange?.min}</p>
                </div>
                <div className="bg-slate-950/40 p-4 border border-slate-850 rounded-xl text-center space-y-1">
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Maximum Cap</p>
                  <p className="text-lg font-bold text-slate-300">₹{report.priceRange?.max}</p>
                </div>
              </div>

              <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-2 text-xs leading-relaxed">
                <p className="font-bold text-slate-300 flex items-center gap-1">
                  💡 Suggested Action:
                </p>
                <p className="text-slate-400">{report.suggestedSellingTime}</p>
              </div>

              {/* Month-on-Month SVG Bar Chart */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-400 pl-1">Month-on-Month Price Trend Index</p>
                <div className="bg-slate-950 p-6 rounded-xl border border-slate-850 h-44 flex items-end justify-between px-8 pt-8">
                  {report.trendHistory?.map((item, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end group relative">
                      <span className="absolute -top-6 bg-slate-900 border border-slate-800 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded font-extrabold opacity-0 group-hover:opacity-100 transition-opacity">
                        ₹{item.price}
                      </span>
                      <div
                        className="w-10 bg-gradient-to-t from-emerald-950 to-emerald-500 rounded-t-lg transition-all duration-700"
                        style={{ height: `${(item.price / 7000) * 100}%` }}
                      ></div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{item.month}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 space-y-3">
              <DollarSign size={40} className="text-slate-700 mx-auto" />
              <p className="text-xs text-slate-500 font-semibold max-w-xs mx-auto">
                No active calculations. Fill out Mandi scope attributes and execute check.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default PricePrediction;
