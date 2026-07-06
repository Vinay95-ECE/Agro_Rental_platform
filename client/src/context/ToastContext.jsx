import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />,
  error: <XCircle size={16} className="text-red-400 flex-shrink-0" />,
  warning: <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />,
  info: <Info size={16} className="text-blue-400 flex-shrink-0" />
};

const STYLES = {
  success: 'border-emerald-500/30 bg-emerald-500/10',
  error: 'border-red-500/30 bg-red-500/10',
  warning: 'border-amber-500/30 bg-amber-500/10',
  info: 'border-blue-500/30 bg-blue-500/10'
};

const Toast = ({ id, type = 'info', title, message, onClose }) => {
  return (
    <div
      className={`flex items-start gap-3 w-full max-w-sm p-4 rounded-xl border backdrop-blur-xl shadow-2xl
        ${STYLES[type]} animate-slide-in`}
      style={{ animation: 'slideIn 0.3s ease-out' }}
    >
      <div className="mt-0.5">{ICONS[type]}</div>
      <div className="flex-1 min-w-0">
        {title && <p className="text-xs font-bold text-white leading-tight">{title}</p>}
        {message && <p className="text-[11px] text-slate-300 leading-relaxed mt-0.5">{message}</p>}
      </div>
      <button
        onClick={() => onClose(id)}
        className="flex-shrink-0 p-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700/50 transition-colors"
      >
        <X size={12} />
      </button>
    </div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  }, []);

  const addToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    setToasts(prev => [...prev.slice(-4), { id, type, title, message }]);

    if (duration > 0) {
      timersRef.current[id] = setTimeout(() => removeToast(id), duration);
    }
    return id;
  }, [removeToast]);

  const toast = {
    success: (message, title = 'Success') => addToast({ type: 'success', title, message }),
    error: (message, title = 'Error') => addToast({ type: 'error', title, message, duration: 6000 }),
    warning: (message, title = 'Warning') => addToast({ type: 'warning', title, message }),
    info: (message, title = 'Info') => addToast({ type: 'info', title, message }),
    custom: (opts) => addToast(opts)
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col-reverse gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <Toast {...t} onClose={removeToast} />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
};

export default ToastProvider;
