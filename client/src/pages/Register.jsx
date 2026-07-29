import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { authStart, authSuccess, authFailure } from '../store/authSlice';
import { UserPlus, User, Mail, Lock, Phone, ShieldAlert, Users, Camera } from 'lucide-react';
import { ImageUpload } from '../components/ImageUpload';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Farmer');
  const [avatar, setAvatar] = useState('');
  
  const { loading, error } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    dispatch(authStart());
    try {
      const response = await axios.post('/api/auth/register', {
        name,
        email,
        password,
        phone,
        role,
        avatar
      });
      if (response.data.success) {
        dispatch(authSuccess({
          user: response.data.user,
          token: response.data.token
        }));
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        navigate('/');
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Error occurred during registration';
      dispatch(authFailure(message));
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-8 shadow-2xl relative">
        <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent"></div>
        
        <div className="text-center space-y-2 mb-8">
          <span className="text-3xl">🌱</span>
          <h2 className="text-2xl font-bold text-white tracking-tight">Create Account</h2>
          <p className="text-xs text-slate-400">Join the AgriRent Hub sharing ecosystem</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2.5 mb-6 text-xs text-red-400">
            <ShieldAlert size={18} className="shrink-0 mt-0.5" />
            <p className="leading-normal">{error}</p>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">

          {/* Profile Picture Upload */}
          <div className="flex flex-col items-center gap-2 pb-4">
            <ImageUpload
              folder="registerAvatar"
              label="Profile Photo (optional)"
              currentImage={avatar}
              onUpload={(url) => setAvatar(url)}
              aspectRatio="square"
              className="w-24 [&>div]:rounded-full"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-0.5">Full Name</label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-500"><User size={16} /></span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ramesh Patel"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-11 pr-4 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 placeholder-slate-600 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-0.5">Email Address</label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-500"><Mail size={16} /></span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ramesh@example.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-11 pr-4 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 placeholder-slate-600 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-0.5">Phone Number</label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-500"><Phone size={16} /></span>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-11 pr-4 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 placeholder-slate-600 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-0.5">Password</label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-500"><Lock size={16} /></span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-11 pr-4 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 placeholder-slate-600 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-0.5">Join As Role</label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-500"><Users size={16} /></span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-11 pr-4 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
              >
                <option value="Farmer">Farmer (किसान)</option>
                <option value="Tool Owner">Tool Owner (उपकरण मालिक)</option>
                <option value="Shopkeeper">Shopkeeper (दुकानदार)</option>
                <option value="Buyer">Buyer (खरीदार)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 disabled:text-slate-500 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-lg hover:shadow-emerald-500/10 flex items-center justify-center gap-2 mt-4"
          >
            <UserPlus size={16} />
            {loading ? 'Creating Account...' : 'Register Account'}
          </button>
        </form>

        <div className="text-center mt-6 pt-5 border-t border-slate-900">
          <p className="text-xs text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;

