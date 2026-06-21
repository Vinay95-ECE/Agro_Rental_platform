import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  Upload, Camera, RefreshCw, AlertTriangle, ShieldCheck, Activity,
  Trash2, Clock, ChevronDown, Leaf, Zap, FlaskConical, Bug, ShieldAlert, Eye
} from 'lucide-react';

// ─── Severity Badge ───────────────────────────────────────────────────────────
const SeverityBadge = ({ severity }) => {
  const map = {
    Healthy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    Low: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    Moderate: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    High: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    Severe: 'text-red-400 bg-red-500/10 border-red-500/30'
  };
  return (
    <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${map[severity] || map.Moderate}`}>
      {severity}
    </span>
  );
};

// ─── Confidence Bar ───────────────────────────────────────────────────────────
const ConfidenceBar = ({ score }) => {
  const pct = parseFloat(score) || 0;
  const color = pct >= 90 ? '#10b981' : pct >= 75 ? '#f59e0b' : '#ef4444';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-slate-400 font-semibold">Confidence Score</span>
        <span className="font-extrabold text-white">{score}</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

// ─── Result Card ──────────────────────────────────────────────────────────────
const ResultSection = ({ icon: Icon, color, label, content }) => (
  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
    <div className="flex items-center gap-2">
      <div className={`p-1.5 rounded-lg ${color}`}>
        <Icon size={13} />
      </div>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
    </div>
    <p className="text-xs text-slate-300 leading-relaxed">{content || 'N/A'}</p>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const DiseaseScanner = () => {
  const { token } = useSelector((state) => state.auth);
  const fileInputRef = useRef(null);

  const [cropName, setCropName] = useState('Tomato');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('scan'); // 'scan' | 'history'
  const [analysisMethod, setAnalysisMethod] = useState('');
  const [error, setError] = useState('');

  const crops = ['Tomato', 'Wheat', 'Rice', 'Soybean', 'Corn', 'Potato'];

  // Load scan history
  const loadHistory = useCallback(async () => {
    if (!token) return;
    setHistoryLoading(true);
    try {
      const res = await axios.get('/api/disease/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) setHistory(res.data.reports);
    } catch (err) {
      console.error('History fetch error:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Handle file selection
  const processFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be under 10MB.');
      return;
    }
    setError('');
    setSelectedFile(file);
    setResult(null);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => processFile(e.target.files[0]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    processFile(e.dataTransfer.files[0]);
  }, []);

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  // Analyze image
  const handleAnalyze = async () => {
    if (!selectedFile) { setError('Please select an image first.'); return; }
    if (!token) { setError('Please log in to use disease detection.'); return; }

    setLoading(true);
    setResult(null);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('cropName', cropName);

      const res = await axios.post('/api/disease/analyze', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data.success) {
        setResult(res.data.diagnosis);
        setAnalysisMethod(res.data.analysisMethod);
        if (res.data.imagePreview) setImagePreview(res.data.imagePreview);
        loadHistory();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Delete history record
  const handleDeleteRecord = async (id) => {
    try {
      await axios.delete(`/api/disease/history/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(prev => prev.filter(r => r._id !== id));
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setImagePreview('');
    setResult(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
            <Camera className="text-emerald-400" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">AI Crop Disease Detector</h1>
            <p className="text-slate-400 text-xs mt-0.5">
              Upload a plant leaf photo for instant AI-powered disease diagnosis, treatment & prevention advice
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 bg-slate-900/50 border border-slate-800 rounded-xl p-1 w-fit">
          {[['scan', '🔬 Scan Now'], ['history', `📋 History (${history.length})`]].map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === tab
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── SCAN TAB ── */}
      {activeTab === 'scan' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Upload Panel */}
          <div className="space-y-5">
            {/* Crop Selector */}
            <div className="glass p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Upload Leaf Image</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, WEBP • Max 10MB</p>
                </div>
                <div className="flex items-center gap-2">
                  <Leaf size={14} className="text-emerald-400" />
                  <select
                    value={cropName}
                    onChange={(e) => setCropName(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2 text-[11px] text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {crops.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => !selectedFile && fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl transition-all cursor-pointer overflow-hidden ${
                  dragOver
                    ? 'border-emerald-500 bg-emerald-500/5'
                    : selectedFile
                    ? 'border-emerald-500/40 bg-slate-900/20'
                    : 'border-slate-700 hover:border-slate-500 bg-slate-900/20'
                }`}
                style={{ minHeight: '220px' }}
              >
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Uploaded leaf"
                      className="w-full object-cover rounded-2xl"
                      style={{ maxHeight: '280px' }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent rounded-2xl" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                      <span className="text-[10px] text-slate-300 font-semibold bg-slate-900/80 px-2 py-1 rounded">
                        {selectedFile?.name || 'Uploaded image'}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleReset(); }}
                        className="text-red-400 hover:text-red-300 bg-slate-900/80 p-1 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-14 px-6 text-center space-y-3">
                    <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700">
                      <Upload size={30} className="text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-300">Drag & drop image here</p>
                      <p className="text-[10px] text-slate-500 mt-1">or click to browse files</p>
                    </div>
                    {dragOver && (
                      <p className="text-xs text-emerald-400 font-bold animate-pulse">Release to upload!</p>
                    )}
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl">
                  <AlertTriangle size={14} className="shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {!token && (
                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs p-3 rounded-xl">
                  <AlertTriangle size={14} className="shrink-0" />
                  <p>Please log in to use disease detection.</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleAnalyze}
                  disabled={loading || !selectedFile || !token}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-xs transition-all shadow-lg flex items-center justify-center gap-2 uppercase tracking-wider"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Zap size={14} />
                      Detect Disease
                    </>
                  )}
                </button>
                {selectedFile && (
                  <button
                    onClick={handleReset}
                    className="px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl transition-all"
                  >
                    <RefreshCw size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Tips */}
            <div className="glass p-4 rounded-2xl border border-slate-800">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">📸 Tips for Best Results</p>
              <div className="space-y-1.5 text-[11px] text-slate-400">
                {[
                  'Take photo in natural daylight',
                  'Focus on affected area (close-up)',
                  'Include 2–3 leaves showing symptoms',
                  'Avoid blurry or dark images',
                  'Supported crops: Tomato, Wheat, Rice, Corn, Soybean, Potato'
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">•</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="glass rounded-2xl border border-slate-800 overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-5 px-8">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Zap size={20} className="text-emerald-400" />
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-bold text-white">Analyzing Leaf Sample...</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">AI Vision Processing</p>
                </div>
                <div className="w-full max-w-xs bg-slate-900 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full animate-pulse" style={{ width: '75%' }} />
                </div>
              </div>
            ) : result ? (
              <div className="h-full flex flex-col">
                {/* Result Header */}
                <div className={`p-5 border-b border-slate-800 ${
                  result.severity === 'Healthy'
                    ? 'bg-emerald-950/30'
                    : result.severity === 'Severe' || result.severity === 'High'
                    ? 'bg-red-950/20'
                    : 'bg-amber-950/20'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Activity size={16} className="text-emerald-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Diagnosis Report</span>
                        {analysisMethod === 'gemini-vision' && (
                          <span className="text-[9px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded font-bold">
                            AI Powered
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-extrabold text-white leading-snug">{result.diseaseName}</h3>
                    </div>
                    <SeverityBadge severity={result.severity} />
                  </div>
                </div>

                <div className="flex-1 p-5 space-y-4 overflow-y-auto">
                  {/* Scanned Image */}
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Analyzed leaf"
                      className="w-full h-36 object-cover rounded-xl border border-slate-800"
                    />
                  )}

                  {/* Confidence */}
                  <ConfidenceBar score={result.confidenceScore} />

                  {/* Explanation */}
                  {result.explanation && (
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">What's Happening</p>
                      <p className="text-xs text-slate-300 leading-relaxed">{result.explanation}</p>
                    </div>
                  )}

                  {/* Action Sections */}
                  <div className="grid grid-cols-1 gap-3">
                    <ResultSection
                      icon={FlaskConical}
                      color="bg-emerald-500/10 text-emerald-400"
                      label="Treatment Protocol"
                      content={result.treatment}
                    />
                    <ResultSection
                      icon={Leaf}
                      color="bg-blue-500/10 text-blue-400"
                      label="Fertilizer Recommendation"
                      content={result.fertilizer}
                    />
                    <ResultSection
                      icon={Bug}
                      color="bg-orange-500/10 text-orange-400"
                      label="Pesticide / Fungicide"
                      content={result.pesticide}
                    />
                    <ResultSection
                      icon={ShieldAlert}
                      color="bg-purple-500/10 text-purple-400"
                      label="Prevention Advice"
                      content={result.prevention}
                    />
                  </div>

                  <p className="text-[10px] text-slate-600 text-center">
                    ✅ Scan saved to history • {new Date(result.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center px-8 space-y-4">
                <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-2xl">
                  <ShieldCheck size={36} className="text-slate-600" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-400">No Scan Results Yet</p>
                  <p className="text-[10px] text-slate-600 max-w-xs leading-relaxed">
                    Upload a clear photo of your crop leaf and click "Detect Disease" to get instant AI diagnosis
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 w-full max-w-xs mt-2">
                  {['🌾 Wheat', '🌽 Corn', '🍅 Tomato', '🌾 Rice', '🫘 Soybean', '🥔 Potato'].map(c => (
                    <div key={c} className="bg-slate-900/50 border border-slate-800 rounded-xl py-2 text-center text-[10px] text-slate-500 font-semibold">
                      {c}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {!token ? (
            <div className="text-center py-16 text-slate-500 text-sm">
              <AlertTriangle size={32} className="mx-auto mb-3 text-amber-500" />
              Please log in to view your scan history.
            </div>
          ) : historyLoading ? (
            <div className="text-center py-16 text-slate-500 text-xs">
              <RefreshCw size={24} className="mx-auto mb-3 animate-spin text-emerald-500" />
              Loading scan history...
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Clock size={32} className="mx-auto mb-3 text-slate-700" />
              <p className="text-sm font-bold text-slate-400">No Scans Yet</p>
              <p className="text-xs text-slate-600 mt-1">Upload a leaf image to start tracking disease history</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {history.map((record) => (
                <div
                  key={record._id}
                  className="glass border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all group"
                >
                  {/* Image */}
                  <div className="relative h-40 bg-slate-900">
                    {record.imageUrl && !record.imageUrl.startsWith('data:') && !record.imageUrl.includes('uploaded-file') ? (
                      <img
                        src={record.imageUrl}
                        alt={record.diseaseName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Leaf size={32} className="text-slate-700" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <SeverityBadge severity={record.severity} />
                    </div>
                    <button
                      onClick={() => handleDeleteRecord(record._id)}
                      className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-600/90 text-white p-1.5 rounded-lg"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-2">
                    <div>
                      <p className="text-xs font-extrabold text-white leading-snug">{record.diseaseName}</p>
                      <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">{record.cropName}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-bold">{record.confidenceScore} confidence</span>
                      <span className="text-[10px] text-slate-600">{new Date(record.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">{record.treatment}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DiseaseScanner;
