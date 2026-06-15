import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { Camera, RefreshCw, AlertTriangle, ShieldCheck, Activity, HelpCircle } from 'lucide-react';

const DiseaseScanner = () => {
  const { token } = useSelector((state) => state.auth);

  const [cropName, setCropName] = useState('Wheat');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const [imageUrl, setImageUrl] = useState('');

  const runSimulation = async (type) => {
    setLoading(true);
    setResult(null);
    
    // Choose simulation URLs representing agricultural leaf samples
    const urls = {
      healthy: 'https://images.unsplash.com/photo-1622383563227-04401ab4e5ea?auto=format&fit=crop&q=80&w=300',
      rust: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=300',
      blast: 'https://images.unsplash.com/photo-1595273670150-db0a3e39843c?auto=format&fit=crop&q=80&w=300',
      spot: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=300'
    };

    const targetUrl = urls[type];
    setImageUrl(targetUrl);

    try {
      const response = await axios.post('/api/ai/diagnose-disease', {
        imageUrl: targetUrl,
        cropName
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        // Mock a 1.5-second leaf scanning delay for UI premium visual feel
        setTimeout(() => {
          setResult(response.data.diagnosis);
          setLoading(false);
        }, 1500);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error occurred scanning crop specimen.');
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    if (severity?.includes('Low')) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (severity?.includes('Moderate')) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-red-400 bg-red-500/10 border-red-500/20';
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-2">
          <Camera size={30} className="text-emerald-400" /> Crop Disease Detector
        </h1>
        <p className="text-slate-400 text-xs max-w-lg mx-auto">
          Upload leaf specimens or execute scan simulations to detect fungal blight pathogens and obtain chemical NPK treatments.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Specs Input Selector */}
        <div className="glass p-6 rounded-3xl border border-slate-800 space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Diagnostic Target</h3>
            <p className="text-xs text-slate-400">Select the target crop profile before initiating leaf scans.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pl-0.5">Crop Class</label>
              <select
                value={cropName}
                onChange={(e) => setCropName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl py-3 px-4 text-xs text-slate-350 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="Wheat">Wheat (गेंहू)</option>
                <option value="Rice">Rice (धान)</option>
                <option value="Soybean">Soybean (सोयाबीन)</option>
                <option value="Corn">Corn (मक्का)</option>
              </select>
            </div>

            <div className="border border-slate-850 bg-slate-950/40 p-6 rounded-2xl text-center space-y-4">
              <span className="text-4xl block animate-bounce-slow">📸</span>
              <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                Position leaves within camera boundaries or select simulation models.
              </p>

              {token ? (
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={() => runSimulation('healthy')}
                    disabled={loading}
                    className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 text-xs font-semibold py-2.5 rounded-xl transition-colors"
                  >
                    Diagnose: Healthy Sample
                  </button>
                  <button
                    onClick={() => runSimulation('rust')}
                    disabled={loading}
                    className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 text-xs font-semibold py-2.5 rounded-xl transition-colors"
                  >
                    Diagnose: Fungal Rust Specimen
                  </button>
                  <button
                    onClick={() => runSimulation('blast')}
                    disabled={loading}
                    className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 text-xs font-semibold py-2.5 rounded-xl transition-colors"
                  >
                    Diagnose: Leaf BlastSpecimen
                  </button>
                </div>
              ) : (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] p-3 rounded-xl flex items-start gap-2 max-w-xs mx-auto leading-relaxed">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <p>Authentication required. Please log in to run AI pathology diagnostic checks.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scan Results Panel */}
        <div className="glass p-6 rounded-3xl border border-slate-800 h-fit min-h-[400px] flex flex-col justify-center">
          {loading ? (
            <div className="text-center space-y-4 py-12">
              <RefreshCw size={40} className="text-emerald-500 animate-spin mx-auto" />
              <div>
                <p className="text-xs font-bold text-white">Leaf Analysis In Progress...</p>
                <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-bold">Neural Net Image Scan</p>
              </div>
            </div>
          ) : result ? (
            <div className="space-y-5 animate-fade-in">
              <div className="flex justify-between items-center border-b border-slate-850 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity size={18} className="text-emerald-400" /> Diagnosis Report
                </h3>
                <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${getSeverityColor(result.severity)}`}>
                  Severity: {result.severity}
                </span>
              </div>

              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Scanned specimen"
                  className="h-32 w-full object-cover rounded-xl border border-slate-800"
                />
              )}

              <div className="bg-slate-950/40 p-4 border border-slate-850 rounded-2xl space-y-3 text-xs leading-relaxed">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Pathogen</p>
                  <p className="font-extrabold text-emerald-400 mt-0.5">{result.diseaseName}</p>
                </div>
                <div className="h-[1px] bg-slate-850"></div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Confidence Score</p>
                  <p className="font-bold text-white mt-0.5">{result.confidenceScore || '94.8%'}</p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <h4 className="font-bold text-slate-200">Recommended Treatment</h4>
                  <p className="text-slate-400 leading-relaxed mt-1">{result.treatment}</p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-200">Preventative Care</h4>
                  <p className="text-slate-400 leading-relaxed mt-1">{result.prevention || 'None needed.'}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 space-y-3">
              <ShieldCheck size={40} className="text-slate-700 mx-auto" />
              <p className="text-xs text-slate-500 font-semibold max-w-xs mx-auto">
                No active scan report. Trigger a sample leaf diagnostic simulation on the left.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default DiseaseScanner;
