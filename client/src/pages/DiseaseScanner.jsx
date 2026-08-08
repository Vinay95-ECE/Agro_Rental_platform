import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  Upload, Camera, RefreshCw, AlertTriangle, ShieldCheck, Activity,
  Trash2, Clock, Leaf, Zap, FlaskConical, Bug, ShieldAlert, Video,
  Play, Square, Radio, CheckCircle, XCircle, Info, ChevronRight,
  Volume2, VolumeX
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

// ─── Severity Badge ───────────────────────────────────────────────────────────
const SeverityBadge = ({ severity }) => {
  const map = {
    Healthy:  'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    Low:      'text-blue-400 bg-blue-500/10 border-blue-500/30',
    Moderate: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    High:     'text-orange-400 bg-orange-500/10 border-orange-500/30',
    Severe:   'text-red-400 bg-red-500/10 border-red-500/30',
    Unknown:  'text-slate-400 bg-slate-500/10 border-slate-500/30',
  };
  return (
    <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${map[severity] || map.Unknown}`}>
      {severity}
    </span>
  );
};

// ─── Confidence Bar ───────────────────────────────────────────────────────────
const ConfidenceBar = ({ score }) => {
  const pct = parseFloat(String(score || '0').replace('%', '').replace('(estimated)', '').trim()) || 0;
  const color = pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444';
  const label = pct >= 70 ? 'High Confidence' : pct >= 40 ? 'Moderate Confidence' : 'Low Confidence';
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px]">
        <span className="text-slate-400 font-semibold">Confidence Score</span>
        <span className="font-extrabold" style={{ color }}>{String(score || '0%')}</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }}
        />
      </div>
      <p className="text-[10px]" style={{ color }}>{label}</p>
    </div>
  );
};

// ─── Result Section card ──────────────────────────────────────────────────────
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

// ─── Diagnosis Result Panel ───────────────────────────────────────────────────
const DiagnosisPanel = ({ result, imagePreview, analysisMethod }) => {
  const isInvalid = result?.diseaseName?.includes('Invalid') || result?.diseaseName?.includes('Cannot Analyze');
  const isIncomplete = result?.diseaseName?.includes('Incomplete') || result?.diseaseName?.includes('Setup Required');

  const [isPlaying, setIsPlaying] = useState(false);

  const toggleSpeak = () => {
    if (!('speechSynthesis' in window)) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    const textToSpeak = `
      Diagnosis Report. Disease detected is: ${result.diseaseName}.
      Severity level is: ${result.severity}.
      Confidence level is: ${result.confidenceScore || result.confidence || ''}.
      Explanation: ${result.explanation || ''}.
      Treatment Protocol: ${result.treatment || ''}.
      Fertilizer recommendation: ${result.fertilizer || ''}.
      Pesticide or Fungicide advice: ${result.pesticide || ''}.
      Prevention advice: ${result.prevention || ''}.
    `.replace(/[#*`]/g, '');

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    
    // Auto-detect Hindi script characters to set the Hindi voice
    const hasHindi = /[\u0900-\u097F]/.test(result.diseaseName + (result.explanation || ''));
    utterance.lang = hasHindi ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.9;

    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    setIsPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (isInvalid) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-12 px-6 space-y-4 text-center">
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl">
          <XCircle size={40} className="text-red-400" />
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-red-400">Invalid Image Detected</h3>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">{result.explanation}</p>
        </div>
        <div className="w-full max-w-xs">
          <ConfidenceBar score={result.confidenceScore || result.confidence} />
        </div>
        <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-4 text-left w-full max-w-xs space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase">What to do</p>
          <p className="text-xs text-slate-300">{result.prevention}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className={`p-5 border-b border-slate-800 ${
        result.severity === 'Healthy' ? 'bg-emerald-950/30' :
        result.severity === 'Severe' || result.severity === 'High' ? 'bg-red-950/20' : 'bg-amber-950/20'
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Activity size={16} className="text-emerald-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Diagnosis Report</span>
              {analysisMethod && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${
                  analysisMethod.includes('yolo') ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                  analysisMethod.includes('gemini') ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                  'bg-slate-500/20 text-slate-400 border-slate-500/30'
                }`}>
                  {analysisMethod.includes('yolo') ? '🤖 YOLO11' :
                   analysisMethod.includes('gemini') ? '✨ Gemini AI' : '📋 Rule-based'}
                </span>
              )}
            </div>
            <h3 className="text-sm font-extrabold text-white leading-snug">{result.diseaseName}</h3>
            
            {/* Speak Audio Toggle Trigger */}
            <div className="pt-1.5">
              <button
                onClick={toggleSpeak}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                  isPlaying
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
                title={isPlaying ? "Stop Voice Report" : "Listen to Voice Report"}
              >
                {isPlaying ? <VolumeX size={12} /> : <Volume2 size={12} />}
                {isPlaying ? 'STOP SPEECH' : 'LISTEN REPORT'}
              </button>
            </div>
          </div>
          <SeverityBadge severity={result.severity} />
        </div>
      </div>

      <div className="flex-1 p-5 space-y-4 overflow-y-auto">
        {imagePreview && (
          <img src={imagePreview} alt="Analyzed leaf"
            className="w-full h-36 object-cover rounded-xl border border-slate-800"
          />
        )}
        <ConfidenceBar score={result.confidenceScore || result.confidence} />

        {result.explanation && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">What's Happening</p>
            <p className="text-xs text-slate-300 leading-relaxed">{result.explanation}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          <ResultSection icon={FlaskConical} color="bg-emerald-500/10 text-emerald-400" label="Treatment Protocol" content={result.treatment} />
          <ResultSection icon={Leaf} color="bg-blue-500/10 text-blue-400" label="Fertilizer Recommendation" content={result.fertilizer} />
          <ResultSection icon={Bug} color="bg-orange-500/10 text-orange-400" label="Pesticide / Fungicide" content={result.pesticide} />
          <ResultSection icon={ShieldAlert} color="bg-purple-500/10 text-purple-400" label="Prevention Advice" content={result.prevention} />
        </div>

        {isIncomplete && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-2">
            <p className="text-[10px] font-bold text-amber-400 uppercase">⚙️ Setup Required</p>
            <p className="text-xs text-amber-300 leading-relaxed">
              For accurate AI diagnosis, either:<br/>
              • Run: <code className="bg-slate-900 px-1 rounded">python train_yolo11.py</code> to train the model<br/>
              • Or add <code className="bg-slate-900 px-1 rounded">GEMINI_API_KEY</code> to your .env file
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main DiseaseScanner Component ───────────────────────────────────────────
const DiseaseScanner = () => {
  const { token } = useSelector((state) => state.auth);
  const toast = useToast();
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const webcamVideoRef = useRef(null);
  const webcamStreamRef = useRef(null);
  const webcamIntervalRef = useRef(null);

  const [cropName, setCropName] = useState('Tomato');
  const [activeMode, setActiveMode] = useState('image');   // 'image' | 'video' | 'webcam' | 'history'
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [analysisMethod, setAnalysisMethod] = useState('');

  // Video state
  const [videoFile, setVideoFile] = useState(null);
  const [videoResults, setVideoResults] = useState(null);
  const [videoProgress, setVideoProgress] = useState(0);

  // Webcam state
  const [webcamActive, setWebcamActive] = useState(false);
  const [webcamDetecting, setWebcamDetecting] = useState(false);
  const [webcamResult, setWebcamResult] = useState(null);
  const [webcamFrameCount, setWebcamFrameCount] = useState(0);

  const crops = ['Tomato', 'Potato', 'Wheat', 'Paddy', 'Corn', 'Apple', 'Grape', 'Soybean', 'Pepper', 'Rice'];

  // Load scan history
  const loadHistory = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get('/api/disease/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) setHistory(res.data.reports);
    } catch (err) { console.error('History fetch error:', err); }
  }, [token]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Cleanup webcam on unmount
  useEffect(() => {
    return () => stopWebcam();
  }, []);

  // ── Image Tab handlers ────────────────────────────────────────────────────
  const processFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select a valid image file (JPG, PNG, WEBP).'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('File size must be under 10MB.'); return; }
    setError('');
    setSelectedFile(file);
    setResult(null);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => processFile(e.target.files[0]);
  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false); processFile(e.dataTransfer.files[0]);
  }, []);
  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  const handleAnalyzeImage = async () => {
    if (!selectedFile) { setError('Please select an image first.'); return; }
    setLoading(true); setResult(null); setError('');
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('cropName', cropName);
      const headers = { 'Content-Type': 'multipart/form-data' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await axios.post('/api/disease/analyze', formData, { headers });
      if (res.data.success) {
        if (res.data.is_plant === false) {
          setError('Irrelevant image. Please upload a clear photo of a crop or leaf.');
          toast.error('Irrelevant image. Please upload the right image.', 'Invalid Image');
          return;
        }
        
        setResult(res.data.diagnosis);
        setAnalysisMethod(res.data.analysisMethod || res.data.diagnosis?.analysisMethod || '');
        if (res.data.imagePreview) setImagePreview(res.data.imagePreview);
        if (token) loadHistory();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null); setImagePreview(''); setResult(null); setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Video Tab handlers ────────────────────────────────────────────────────
  const handleVideoFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setVideoFile(file);
    setVideoResults(null);
    setError('');
  };

  const handleAnalyzeVideo = async () => {
    if (!videoFile) { setError('Please select a video file first.'); return; }
    setLoading(true); setVideoResults(null); setError(''); setVideoProgress(0);

    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('cropName', cropName);
      formData.append('sampleFps', '1');

      const headers = { 'Content-Type': 'multipart/form-data' };
      if (token) headers.Authorization = `Bearer ${token}`;

      // Simulate progress while waiting
      const progressInterval = setInterval(() => {
        setVideoProgress(prev => Math.min(prev + 3, 90));
      }, 500);

      const res = await axios.post('/api/disease/analyze-video', formData, {
        headers,
        timeout: 120000,
      });

      clearInterval(progressInterval);
      setVideoProgress(100);

      if (res.data.success) {
        setVideoResults(res.data);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        (err.code === 'ECONNABORTED' ? 'Video analysis timed out. Try a shorter video.' : 'Video analysis failed.')
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Webcam Tab handlers ───────────────────────────────────────────────────
  const startWebcam = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
      webcamStreamRef.current = stream;
      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream;
        webcamVideoRef.current.play();
      }
      setWebcamActive(true);
    } catch (err) {
      setError('Camera access denied. Please allow camera permissions and try again.');
    }
  };

  const stopWebcam = () => {
    if (webcamIntervalRef.current) { clearInterval(webcamIntervalRef.current); webcamIntervalRef.current = null; }
    if (webcamStreamRef.current) { webcamStreamRef.current.getTracks().forEach(t => t.stop()); webcamStreamRef.current = null; }
    if (webcamVideoRef.current) webcamVideoRef.current.srcObject = null;
    setWebcamActive(false);
    setWebcamDetecting(false);
    setWebcamFrameCount(0);
  };

  const captureFrame = () => {
    const video = webcamVideoRef.current;
    if (!video || video.readyState < 2) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.7).split(',')[1]; // base64
  };

  const startDetection = () => {
    if (!webcamActive) return;
    setWebcamDetecting(true);
    setWebcamFrameCount(0);

    webcamIntervalRef.current = setInterval(async () => {
      const b64 = captureFrame();
      if (!b64) return;

      setWebcamFrameCount(prev => prev + 1);

      try {
        const res = await axios.post('/api/disease/analyze-frame', {
          image_b64: b64,
          crop_name: cropName,
          mime_type: 'image/jpeg',
        }, { timeout: 8000 });

        if (res.data.success) {
          setWebcamResult(res.data);
          setAnalysisMethod(res.data.diagnosis?.analysisMethod || '');
        }
      } catch (err) {
        // Silent fail for individual frames
        console.warn('Frame analysis failed:', err.message);
      }
    }, 1500); // Analyze every 1.5 seconds
  };

  const stopDetection = () => {
    if (webcamIntervalRef.current) { clearInterval(webcamIntervalRef.current); webcamIntervalRef.current = null; }
    setWebcamDetecting(false);
  };

  const handleDeleteRecord = async (id) => {
    try {
      await axios.delete(`/api/disease/history/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setHistory(prev => prev.filter(r => r._id !== id));
    } catch (err) { console.error('Delete error:', err); }
  };

  // ─── Confidence color helper ────────────────────────────────────────────────
  const getConfColor = (score) => {
    const pct = parseFloat(String(score || '0').replace('%', '')) || 0;
    return pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444';
  };

  const tabConfig = [
    { id: 'image', label: '📷 Image', icon: Upload },
    { id: 'video', label: '🎬 Video', icon: Video },
    { id: 'webcam', label: '📹 Webcam', icon: Camera },
    { id: 'history', label: `📋 History (${history.length})`, icon: Clock },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
            <Camera className="text-emerald-400" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">AI Crop Disease Detector</h1>
            <p className="text-slate-400 text-xs mt-0.5">
              YOLO11 + Gemini Vision — Upload image, video, or use live webcam for instant disease diagnosis
            </p>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-1 mt-4 bg-slate-900/50 border border-slate-800 rounded-xl p-1 w-fit flex-wrap">
          {tabConfig.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => {
                setActiveMode(id);
                setError('');
                if (id !== 'webcam' && webcamActive) stopWebcam();
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeMode === id ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── IMAGE TAB ── */}
      {activeMode === 'image' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Panel */}
          <div className="space-y-4">
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
                  dragOver ? 'border-emerald-500 bg-emerald-500/5' :
                  selectedFile ? 'border-emerald-500/40 bg-slate-900/20' :
                  'border-slate-700 hover:border-slate-500 bg-slate-900/20'
                }`}
                style={{ minHeight: '220px' }}
              >
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="Uploaded leaf"
                      className="w-full object-cover rounded-2xl" style={{ maxHeight: '280px' }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent rounded-2xl" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                      <span className="text-[10px] text-slate-300 font-semibold bg-slate-900/80 px-2 py-1 rounded">
                        {selectedFile?.name || 'Uploaded image'}
                      </span>
                      <button onClick={(e) => { e.stopPropagation(); handleReset(); }}
                        className="text-red-400 hover:text-red-300 bg-slate-900/80 p-1 rounded">
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
                  </div>
                )}
              </div>

              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl">
                  <AlertTriangle size={14} className="shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleAnalyzeImage}
                  disabled={loading || !selectedFile}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-xs transition-all shadow-lg flex items-center justify-center gap-2 uppercase tracking-wider"
                >
                  {loading ? (
                    <><RefreshCw size={14} className="animate-spin" /> Analyzing...</>
                  ) : (
                    <><Zap size={14} /> Detect Disease</>
                  )}
                </button>
                {selectedFile && (
                  <button onClick={handleReset}
                    className="px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl transition-all">
                    <RefreshCw size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Tips */}
            <div className="glass p-4 rounded-2xl border border-slate-800">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">📸 Tips for Best Results</p>
              <div className="space-y-1.5 text-[11px] text-slate-400">
                {[
                  'Take photo in natural daylight',
                  'Focus on affected leaf area (close-up)',
                  'Include 2–3 leaves showing symptoms',
                  'Avoid blurry or dark images',
                  'Make sure the leaf fills most of the frame',
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
          <div className="glass rounded-2xl border border-slate-800 overflow-hidden min-h-[400px]">
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
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">YOLO11 + AI Vision Processing</p>
                </div>
              </div>
            ) : result ? (
              <DiagnosisPanel result={result} imagePreview={imagePreview} analysisMethod={analysisMethod} />
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center px-8 space-y-4">
                <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-2xl">
                  <ShieldCheck size={36} className="text-slate-600" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-400">No Scan Results Yet</p>
                  <p className="text-[10px] text-slate-600 max-w-xs leading-relaxed">
                    Upload a clear photo of your crop leaf and click "Detect Disease" for instant AI diagnosis
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── VIDEO TAB ── */}
      {activeMode === 'video' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Video Upload Panel */}
          <div className="space-y-4">
            <div className="glass p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Upload Crop Video</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">MP4, AVI, MOV, WEBM • Max 100MB</p>
                </div>
                <div className="flex items-center gap-2">
                  <Leaf size={14} className="text-emerald-400" />
                  <select value={cropName} onChange={(e) => setCropName(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2 text-[11px] text-slate-200 focus:outline-none focus:border-emerald-500">
                    {crops.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Video file picker */}
              <div
                onClick={() => videoInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl cursor-pointer transition-all p-8 text-center ${
                  videoFile ? 'border-emerald-500/40 bg-slate-900/20' : 'border-slate-700 hover:border-slate-500 bg-slate-900/20'
                }`}
              >
                {videoFile ? (
                  <div className="space-y-2">
                    <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 inline-flex">
                      <Video size={24} className="text-emerald-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-200">{videoFile.name}</p>
                    <p className="text-[10px] text-slate-500">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); setVideoFile(null); setVideoResults(null); }}
                      className="text-red-400 text-xs hover:text-red-300 mt-1"
                    >
                      Remove video
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700 inline-flex">
                      <Video size={30} className="text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-300">Click to select a video</p>
                      <p className="text-[10px] text-slate-500 mt-1">MP4, AVI, MOV, WEBM supported</p>
                    </div>
                  </div>
                )}
              </div>
              <input ref={videoInputRef} type="file" accept="video/mp4,video/avi,video/quicktime,video/webm"
                onChange={handleVideoFileChange} className="hidden" />

              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl">
                  <AlertTriangle size={14} className="shrink-0" /><p>{error}</p>
                </div>
              )}

              {loading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Analyzing video frames...</span>
                    <span>{videoProgress}%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${videoProgress}%` }} />
                  </div>
                </div>
              )}

              <button
                onClick={handleAnalyzeVideo}
                disabled={loading || !videoFile}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
              >
                {loading ? (
                  <><RefreshCw size={14} className="animate-spin" /> Processing Video...</>
                ) : (
                  <><Play size={14} /> Analyze Video</>
                )}
              </button>
            </div>

            <div className="glass p-4 rounded-2xl border border-slate-800">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">🎬 Video Analysis Info</p>
              <div className="space-y-1.5 text-[11px] text-slate-400">
                {[
                  'Analyzes 1 frame per second of video',
                  'Max 30 frames analyzed per video',
                  'Shows per-frame disease timeline',
                  'Provides overall disease summary',
                  'Best with 10–60 second crop walkthroughs',
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">•</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Video Results Panel */}
          <div className="glass rounded-2xl border border-slate-800 overflow-hidden min-h-[400px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full py-24 space-y-5 px-8">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Video size={20} className="text-emerald-400" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-white">Processing Video Frames...</p>
                  <p className="text-[10px] text-slate-500 mt-1">This may take 30-120 seconds</p>
                </div>
              </div>
            ) : videoResults ? (
              <div className="p-5 space-y-4 overflow-y-auto h-full">
                {/* Summary */}
                <div className={`p-4 rounded-xl border ${
                  videoResults.summary?.severity === 'Healthy' ? 'bg-emerald-950/30 border-emerald-500/30' :
                  videoResults.summary?.severity === 'Severe' ? 'bg-red-950/20 border-red-500/30' :
                  'bg-amber-950/20 border-amber-500/30'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Video Summary</span>
                    <SeverityBadge severity={videoResults.summary?.severity || 'Unknown'} />
                  </div>
                  <p className="text-sm font-extrabold text-white">{videoResults.summary?.dominant_disease}</p>
                  <div className="mt-3">
                    <ConfidenceBar score={videoResults.summary?.average_confidence} />
                  </div>
                </div>

                {/* Video info */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Duration', value: `${videoResults.video_info?.duration_s}s` },
                    { label: 'Frames Analyzed', value: videoResults.video_info?.frames_analyzed },
                    { label: 'Plant Frames', value: videoResults.video_info?.plant_frames },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-center">
                      <p className="text-xs font-bold text-white">{value}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Frame timeline */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Frame Timeline</p>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {videoResults.frames?.map((frame, i) => (
                      <div key={i} className={`flex items-center gap-3 p-2.5 rounded-xl border text-[11px] ${
                        !frame.is_plant ? 'border-slate-700 bg-slate-900/40' :
                        frame.severity === 'Healthy' ? 'border-emerald-500/20 bg-emerald-950/20' :
                        'border-amber-500/20 bg-amber-950/10'
                      }`}>
                        <span className="text-slate-500 font-mono w-10 shrink-0">{frame.timestamp_str}</span>
                        {frame.is_plant ? (
                          <>
                            <span className="text-slate-200 flex-1 truncate">{frame.diseaseName}</span>
                            <span style={{ color: getConfColor(frame.confidence) }} className="font-bold shrink-0">
                              {frame.confidence}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-500 flex-1">No plant detected</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-24 text-center px-8 space-y-4">
                <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-2xl">
                  <Video size={36} className="text-slate-600" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-400">No Video Analyzed</p>
                  <p className="text-[10px] text-slate-600 max-w-xs leading-relaxed">
                    Upload a video of your crop field for frame-by-frame disease detection
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── WEBCAM TAB ── */}
      {activeMode === 'webcam' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Webcam Feed */}
          <div className="space-y-4">
            <div className="glass p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Live Webcam Detection</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Real-time plant disease scanning</p>
                </div>
                <div className="flex items-center gap-2">
                  {webcamDetecting && (
                    <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 px-2 py-1 rounded-full">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-[10px] text-red-400 font-bold">LIVE</span>
                    </div>
                  )}
                  <Leaf size={14} className="text-emerald-400" />
                  <select value={cropName} onChange={(e) => setCropName(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2 text-[11px] text-slate-200 focus:outline-none focus:border-emerald-500">
                    {crops.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Camera preview */}
              <div className="relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-700"
                style={{ minHeight: '280px' }}>
                <video
                  ref={webcamVideoRef}
                  autoPlay playsInline muted
                  className="w-full h-full object-cover rounded-2xl"
                  style={{ minHeight: '280px', display: webcamActive ? 'block' : 'none' }}
                />
                {!webcamActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3">
                    <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700">
                      <Camera size={32} className="text-slate-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-400">Camera Off</p>
                    <p className="text-[10px] text-slate-600">Click "Start Camera" to begin</p>
                  </div>
                )}

                {/* Overlay when detecting */}
                {webcamDetecting && webcamResult && (
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="bg-slate-950/90 border border-slate-700 rounded-xl px-3 py-2 flex items-center justify-between">
                      <span className="text-[10px] text-slate-200 font-bold truncate max-w-[60%]">
                        {webcamResult.diagnosis?.diseaseName?.slice(0, 30) || 'Detecting...'}
                      </span>
                      <span className="text-[10px] font-bold ml-2"
                        style={{ color: getConfColor(webcamResult.diagnosis?.confidence || webcamResult.diagnosis?.confidenceScore) }}>
                        {webcamResult.diagnosis?.confidence || webcamResult.diagnosis?.confidenceScore || '--'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl">
                  <AlertTriangle size={14} className="shrink-0" /><p>{error}</p>
                </div>
              )}

              {/* Camera controls */}
              <div className="flex gap-3">
                {!webcamActive ? (
                  <button onClick={startWebcam}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2 uppercase tracking-wider">
                    <Camera size={14} /> Start Camera
                  </button>
                ) : (
                  <>
                    {!webcamDetecting ? (
                      <button onClick={startDetection}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2 uppercase tracking-wider">
                        <Radio size={14} /> Start Detection
                      </button>
                    ) : (
                      <button onClick={stopDetection}
                        className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2 uppercase tracking-wider">
                        <Square size={14} /> Stop Detection
                      </button>
                    )}
                    <button onClick={stopWebcam}
                      className="px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl transition-all text-xs">
                      Close
                    </button>
                  </>
                )}
              </div>

              {webcamDetecting && (
                <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
                  <span>🔍 Frames analyzed: {webcamFrameCount}</span>
                  <span>⏱ Every 1.5s</span>
                </div>
              )}
            </div>
          </div>

          {/* Webcam Result Panel */}
          <div className="glass rounded-2xl border border-slate-800 overflow-hidden min-h-[400px]">
            {webcamResult ? (
              <DiagnosisPanel
                result={webcamResult.diagnosis}
                imagePreview={null}
                analysisMethod={webcamResult.diagnosis?.analysisMethod || analysisMethod}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-24 text-center px-8 space-y-4">
                <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-2xl">
                  <Radio size={36} className="text-slate-600" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-400">Live Detection Inactive</p>
                  <p className="text-[10px] text-slate-600 max-w-xs leading-relaxed">
                    Start your camera and click "Start Detection" to see real-time disease analysis
                  </p>
                </div>
                <div className="text-[10px] text-slate-600 space-y-1">
                  <p>Point camera at a plant leaf to detect diseases</p>
                  <p>Results update every 1.5 seconds</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {activeMode === 'history' && (
        <div className="space-y-4">
          {!token ? (
            <div className="text-center py-16 text-slate-500 text-sm">
              <AlertTriangle size={32} className="mx-auto mb-3 text-amber-500" />
              Please log in to view your scan history.
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
                <div key={record._id}
                  className="glass border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all group">
                  <div className="relative h-40 bg-slate-900">
                    {record.imageUrl && !record.imageUrl.startsWith('data:') && !record.imageUrl.includes('uploaded-file') ? (
                      <img src={record.imageUrl} alt={record.diseaseName} className="w-full h-full object-cover" />
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
                      className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-600/90 text-white p-1.5 rounded-lg">
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="p-4 space-y-2">
                    <div>
                      <p className="text-xs font-extrabold text-white leading-snug">{record.diseaseName}</p>
                      <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">{record.cropName}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold"
                        style={{ color: getConfColor(record.confidenceScore) }}>
                        {record.confidenceScore} confidence
                      </span>
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
