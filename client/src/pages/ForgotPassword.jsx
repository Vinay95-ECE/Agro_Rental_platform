import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams, useParams } from 'react-router-dom';
import axios from 'axios';
import { Mail, KeyRound, Lock, ArrowLeft, CheckCircle2, ShieldAlert, Eye, EyeOff, Send } from 'lucide-react';

const ForgotPassword = () => {
  const [searchParams] = useSearchParams();
  const params = useParams();
  const navigate = useNavigate();

  // Route token if coming from URL like /reset-password/:token or ?token=...
  const urlToken = params.token || searchParams.get('token') || '';

  const [step, setStep] = useState(urlToken ? 2 : 1);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState(urlToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [devTokenNotice, setDevTokenNotice] = useState('');

  useEffect(() => {
    if (urlToken) {
      setToken(urlToken);
      setStep(2);
    }
  }, [urlToken]);

  // Step 1: Send Forgot Password Request
  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setDevTokenNotice('');
    setLoading(true);

    try {
      const response = await axios.post('/api/auth/forgot-password', { email });
      if (response.data.success) {
        setSuccessMsg(response.data.message || 'Password reset instructions sent to your email.');
        // In dev mode, server returns resetToken directly for convenience
        if (response.data.resetToken) {
          setDevTokenNotice(response.data.resetToken);
          setToken(response.data.resetToken);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset link. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('/api/auth/reset-password', {
        token,
        newPassword
      });
      if (response.data.success) {
        setSuccessMsg('Password reset successfully! Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired token. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-8 shadow-2xl relative">
        <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent"></div>

        {/* Back Link */}
        <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 font-semibold mb-6 transition-colors">
          <ArrowLeft size={16} /> Back to Sign In
        </Link>

        <div className="text-center space-y-2 mb-8">
          <span className="text-3xl">🔑</span>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {step === 1 ? 'Forgot Password?' : 'Set New Password'}
          </h2>
          <p className="text-xs text-slate-400">
            {step === 1
              ? "Don't worry! Enter your email address to receive reset instructions."
              : 'Enter your reset token and your new password to regain access.'}
          </p>
        </div>

        {/* Feedback banners */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2.5 mb-6 text-xs text-red-400">
            <ShieldAlert size={18} className="shrink-0 mt-0.5" />
            <p className="leading-normal">{error}</p>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-start gap-2.5 mb-6 text-xs text-emerald-400">
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="leading-normal">{successMsg}</p>
              {step === 1 && (
                <button
                  onClick={() => setStep(2)}
                  className="text-xs font-bold underline text-emerald-300 hover:text-emerald-200 block mt-1"
                >
                  Proceed to enter token & reset password &rarr;
                </button>
              )}
            </div>
          </div>
        )}

        {/* Dev Mode Reset Token Notice helper */}
        {devTokenNotice && step === 1 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-6 text-xs text-amber-300 space-y-2">
            <p className="font-semibold">⚡ Dev Mode Reset Token:</p>
            <p className="text-[11px] text-amber-400/90 leading-tight">
              In dev environment, your reset token is generated below:
            </p>
            <div className="bg-slate-950 p-2 rounded border border-amber-500/30 text-[10px] font-mono break-all text-amber-200">
              {devTokenNotice}
            </div>
            <button
              onClick={() => setStep(2)}
              className="w-full bg-amber-600/30 hover:bg-amber-600/40 text-amber-200 py-1.5 rounded text-xs font-bold transition-all border border-amber-500/30"
            >
              Continue to Reset Password Form
            </button>
          </div>
        )}

        {/* Step 1: Request Reset */}
        {step === 1 && (
          <form onSubmit={handleRequestReset} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-0.5">
                Registered Email Address
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-500"><Mail size={18} /></span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 placeholder-slate-600 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 disabled:text-slate-500 text-white py-3.5 rounded-xl text-xs font-bold transition-all shadow-lg hover:shadow-emerald-500/10 flex items-center justify-center gap-2 mt-2"
            >
              <Send size={16} />
              {loading ? 'Sending Request...' : 'Send Reset Instructions'}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-[11px] text-slate-400 hover:text-emerald-400 underline transition-colors"
              >
                Already have a reset token/link? Click here
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Enter Token & New Password */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-0.5">
                Reset Token
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-500"><KeyRound size={18} /></span>
                <input
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Enter reset token"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 placeholder-slate-600 transition-colors font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-0.5">
                New Password
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-500"><Lock size={18} /></span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-11 pr-10 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 placeholder-slate-600 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-0.5">
                Confirm New Password
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-500"><Lock size={18} /></span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 placeholder-slate-600 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 disabled:text-slate-500 text-white py-3.5 rounded-xl text-xs font-bold transition-all shadow-lg hover:shadow-emerald-500/10 flex items-center justify-center gap-2 mt-2"
            >
              <KeyRound size={16} />
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-[11px] text-slate-400 hover:text-emerald-400 underline transition-colors"
              >
                &larr; Re-enter email address
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
