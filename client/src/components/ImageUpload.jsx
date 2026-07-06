import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, ImagePlus, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { useSelector } from 'react-redux';

// Use relative path so Vite's proxy works in dev; override with VITE_API_URL in production
const API_BASE = import.meta.env.VITE_API_URL || '/api';

// ─── Single image uploader ─────────────────────────────────────────────────────
export const ImageUpload = ({
  onUpload,           // callback (url) => void
  folder = 'general', // 'avatar', 'crop', 'machine', 'kyc', 'disease', 'product'
  currentImage = '',  // existing URL to show
  label = 'Upload Image',
  aspectRatio = 'square', // 'square', 'landscape', 'portrait'
  className = '',
  required = false
}) => {
  const [preview, setPreview] = useState(currentImage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();
  const { token } = useSelector(state => state.auth);

  const ENDPOINTS = {
    avatar: '/upload/avatar',
    crop: '/upload/crop',
    machine: '/upload/machine',
    kyc: '/upload/kyc',
    disease: '/upload/disease',
    product: '/upload/product',
    general: '/upload/image'
  };

  const aspectClasses = {
    square: 'aspect-square',
    landscape: 'aspect-video',
    portrait: 'aspect-[3/4]'
  };

  const uploadFile = useCallback(async (file) => {
    if (!file) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError('File size must be under 10MB');
      return;
    }

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setError('Only JPEG, PNG, and WebP images allowed');
      return;
    }

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      const fieldName = folder === 'kyc' ? 'document'
        : folder === 'avatar' ? 'avatar'
        : ['crop', 'machine', 'product'].includes(folder) ? 'images'
        : 'image';
      formData.append(fieldName, file);

      const endpoint = ENDPOINTS[folder] || ENDPOINTS.general;
      const res = await axios.post(`${API_BASE}${endpoint}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      const uploadedUrl = res.data.url || res.data.urls?.[0];
      setPreview(uploadedUrl);
      onUpload?.(uploadedUrl);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
      setPreview(currentImage);
    } finally {
      setLoading(false);
    }
  }, [folder, token, onUpload, currentImage]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const clearImage = (e) => {
    e.stopPropagation();
    setPreview('');
    onUpload?.('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}

      <div
        onClick={() => !loading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`
          relative ${aspectClasses[aspectRatio]} w-full rounded-xl border-2 border-dashed
          cursor-pointer overflow-hidden transition-all duration-200
          ${dragging ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800/50'}
          ${loading ? 'cursor-wait' : ''}
          ${preview ? 'border-solid border-emerald-500/30' : ''}
        `}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt="Uploaded"
              className="w-full h-full object-cover"
              onError={() => setPreview('')}
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-white font-medium">
                <ImagePlus size={12} />
                Change Image
              </div>
            </div>
            <button
              type="button"
              onClick={clearImage}
              className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-500 rounded-full text-white transition-colors"
            >
              <X size={12} />
            </button>
            {!loading && (
              <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-emerald-500/80 rounded-full px-2 py-0.5">
                <CheckCircle size={10} className="text-white" />
                <span className="text-[10px] text-white font-medium">Uploaded</span>
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
            {loading ? (
              <>
                <Loader2 size={28} className="text-emerald-400 animate-spin" />
                <p className="text-xs text-slate-400">Uploading...</p>
              </>
            ) : (
              <>
                <div className="p-3 rounded-xl bg-slate-800 border border-slate-700">
                  <Upload size={20} className="text-slate-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-300">Drop image or click to browse</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">JPEG, PNG, WebP • Max 10MB</p>
                </div>
              </>
            )}
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Loader2 size={24} className="text-emerald-400 animate-spin" />
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <AlertTriangle size={12} className="text-red-400 flex-shrink-0" />
          <p className="text-[11px] text-red-400">{error}</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

// ─── Multi-image uploader ──────────────────────────────────────────────────────
export const MultiImageUpload = ({
  onUpload,
  folder = 'general',
  currentImages = [],
  label = 'Upload Images',
  maxImages = 5,
  required = false,
  className = ''
}) => {
  const [images, setImages] = useState(currentImages);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef();
  const { token } = useSelector(state => state.auth);

  const ENDPOINTS = {
    crop: '/upload/crop',
    machine: '/upload/machine',
    product: '/upload/product',
    general: '/upload/image'
  };

  const uploadFiles = async (files) => {
    if (images.length + files.length > maxImages) {
      setError(`Maximum ${maxImages} images allowed`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      Array.from(files).forEach(f => formData.append('images', f));

      const endpoint = ENDPOINTS[folder] || ENDPOINTS.general;
      const res = await axios.post(`${API_BASE}${endpoint}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      const newUrls = res.data.urls || (res.data.url ? [res.data.url] : []);
      const updated = [...images, ...newUrls];
      setImages(updated);
      onUpload?.(updated);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed.');
    } finally {
      setLoading(false);
    }
  };

  const removeImage = (idx) => {
    const updated = images.filter((_, i) => i !== idx);
    setImages(updated);
    onUpload?.(updated);
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          {label} {required && <span className="text-red-400">*</span>}
          <span className="text-slate-500 normal-case font-normal ml-1">({images.length}/{maxImages})</span>
        </label>
      )}

      <div className="grid grid-cols-3 gap-3">
        {images.map((url, idx) => (
          <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-700 group">
            <img src={url} alt={`Image ${idx + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(idx)}
              className="absolute top-1.5 right-1.5 p-1 bg-red-500/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={10} />
            </button>
          </div>
        ))}

        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="aspect-square rounded-xl border-2 border-dashed border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800/50 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={20} className="text-emerald-400 animate-spin" />
            ) : (
              <>
                <ImagePlus size={20} className="text-slate-500" />
                <span className="text-[10px] text-slate-500">Add Photo</span>
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <AlertTriangle size={12} className="text-red-400 flex-shrink-0" />
          <p className="text-[11px] text-red-400">{error}</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple
        onChange={(e) => uploadFiles(e.target.files)}
        className="hidden"
      />
    </div>
  );
};

export default ImageUpload;
