import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import axios from 'axios';

import { store } from './store';
import { logout, authSuccess, updateGamification } from './store/authSlice';
import { LanguageProvider, useLanguage } from './context/LanguageContext';

import Home from './pages/Home';
import Rentals from './pages/Rentals';
import Shop from './pages/Shop';
import Crops from './pages/Crops';
import AIAdvisory from './pages/AIAdvisory';
import DiseaseScanner from './pages/DiseaseScanner';
import PricePrediction from './pages/PricePrediction';
import Quiz from './pages/Quiz';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import Dashboards from './pages/Dashboards';
import WeatherPage from './pages/WeatherPage';

import { Bell, LogOut, Award, Shield, User as UserIcon, MessageCircle } from 'lucide-react';

const Navigation = () => {
  const { language, setLanguage, t } = useLanguage();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { user, token, isAuthenticated } = useSelector((state) => state.auth);

  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const socketRef = useRef(null);

  // Sync token with Axios headers
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Fetch Notifications from DB
  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await axios.get('/api/notifications');
      if (res.data.success) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.notifications.filter(n => !n.isRead).length);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [token, location]);

  // Handle Real-Time socket notifications
  useEffect(() => {
    if (user && token) {
      socketRef.current = io(window.location.origin || 'http://localhost:5000');

      socketRef.current.on('connect', () => {
        console.log('App socket connection established.');
      });

      socketRef.current.on(`notify_${user._id}`, (data) => {
        // Append new notification to list
        setNotifications(prev => [data, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Dynamic flash/alert or console alert for premium user notice
        console.log('Real-Time Alert Received:', data);
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [user, token]);

  const handleLogout = async () => {
    try {
      await axios.get('/api/auth/logout');
      dispatch(logout());
      navigate('/login');
    } catch (err) {
      console.error(err);
      dispatch(logout());
      navigate('/login');
    }
  };

  const markAllNotificationsRead = async () => {
    if (unreadCount === 0) return;
    try {
      const res = await axios.put('/api/notifications/read-all');
      if (res.data.success) {
        setNotifications(notifications.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-50 glass border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo brand */}
          <div className="flex items-center gap-3">
            <span className="text-3xl">🌱</span>
            <div className="flex flex-col">
              <Link to="/" className="text-lg font-bold tracking-tight text-white hover:text-emerald-400 transition-colors">
                AgriRent <span className="text-emerald-500">Hub</span>
              </Link>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Super Ecosystem</span>
            </div>
          </div>

          {/* Links menu */}
          <div className="hidden lg:flex items-center space-x-1.5">
            <Link to="/rentals" className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-colors">{t('rentNow')}</Link>
            <Link to="/shop" className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-colors">{t('buyNow')}</Link>
            <Link to="/crops" className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-colors">{t('sellCrop')}</Link>
            
            <div className="h-4 w-[1px] bg-slate-800 mx-1"></div>
            
            <Link to="/ai-advisory" className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-colors">{t('aiAssistant')}</Link>
            <Link to="/disease-scanner" className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-colors">{t('diseaseDetect')}</Link>
            <Link to="/weather" className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-colors">🌦️ Weather</Link>
            <Link to="/price-prediction" className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-colors">{t('pricePredict')}</Link>
            <Link to="/quiz" className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-colors">{t('dailyQuiz')}</Link>
            
            {isAuthenticated && (
              <>
                <div className="h-4 w-[1px] bg-slate-800 mx-1"></div>
                <Link to="/chat" className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center gap-1">
                  <MessageCircle size={14} /> Chat
                </Link>
                <Link to="/dashboard" className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-colors">Dashboards</Link>
              </>
            )}
          </div>

          {/* Right menu utility triggers */}
          <div className="flex items-center gap-4">
            
            {/* Language Selection */}
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-300 text-[10px] rounded-lg px-2 py-1.5 focus:outline-none focus:border-emerald-500 font-bold cursor-pointer"
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="hinglish">Hinglish</option>
            </select>

            {/* Notification alert dropdown */}
            {isAuthenticated && (
              <div className="relative">
                <button
                  onClick={() => {
                    setIsNotifOpen(!isNotifOpen);
                    markAllNotificationsRead();
                  }}
                  className="relative p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all"
                  title="Alert Notification Logs"
                >
                  <Bell size={16} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-2 w-2 bg-emerald-500 rounded-full animate-ping"></span>
                  )}
                </button>

                {isNotifOpen && (
                  <div className="absolute right-0 mt-3 w-80 bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-2xl z-50 space-y-3">
                    <p className="text-xs font-bold text-white border-b border-slate-850 pb-2">Platform Notifications</p>
                    <div className="divide-y divide-slate-850 max-h-60 overflow-y-auto pr-1">
                      {notifications.length === 0 ? (
                        <p className="text-[10px] text-slate-500 italic text-center py-4">No alerts logged at this time.</p>
                      ) : (
                        notifications.map((notif) => (
                          <div key={notif._id} className="py-2.5 text-[10px] space-y-0.5">
                            <div className="flex justify-between items-center">
                              <span className="font-extrabold text-white">{notif.title}</span>
                              <span className="text-slate-500 text-[8px]">{new Date(notif.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-slate-400 leading-normal">{notif.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Logged user badge */}
            {isAuthenticated && user ? (
              <div className="hidden md:flex items-center gap-3 bg-slate-950/40 border border-slate-850 rounded-xl px-3 py-1.5 text-xs font-semibold">
                <div className="flex items-center gap-1 text-amber-500">
                  <span>🪙</span>
                  <span className="font-extrabold text-slate-200">{user.coins}</span>
                </div>
                <div className="h-3 w-[1px] bg-slate-800"></div>
                <div className="flex items-center gap-1 text-emerald-400">
                  <span>⚡</span>
                  <span className="font-extrabold text-slate-200">{user.xp} XP</span>
                </div>
                <div className="h-3 w-[1px] bg-slate-800"></div>
                <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-extrabold uppercase">
                  {user.badge}
                </span>
              </div>
            ) : null}

            {/* Login control */}
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="bg-slate-900 hover:bg-slate-850 text-slate-350 p-2.5 border border-slate-850 rounded-xl transition-all"
                title="Log Out Profile"
              >
                <LogOut size={16} />
              </button>
            ) : (
              <Link to="/login" className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md">
                Login
              </Link>
            )}

          </div>

        </div>
      </div>
    </nav>
  );
};

const Footer = () => {
  return (
    <footer className="bg-slate-950 border-t border-slate-900 py-12 mt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🌾</span>
              <span className="text-white font-extrabold tracking-tight">AgriRent Hub</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Connecting farmers, tool owners, and shopkeepers across rural India through technology.
            </p>
            <div className="flex gap-2 text-[10px]">
              <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">Gemini AI</span>
              <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-bold">Razorpay</span>
              <span className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full font-bold">OpenWeather</span>
            </div>
          </div>
          {/* Marketplace */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Marketplace</p>
            <ul className="space-y-2">
              {[['Rent Equipment', '/rentals'], ['Buy Products', '/shop'], ['Sell Crops', '/crops'], ['Price Prediction', '/price-prediction']].map(([label, href]) => (
                <li key={label}><Link to={href} className="text-xs text-slate-500 hover:text-emerald-400 transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>
          {/* AI Tools */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Tools</p>
            <ul className="space-y-2">
              {[['Disease Scanner', '/disease-scanner'], ['AI Agronomist', '/ai-advisory'], ['Weather Forecast', '/weather'], ['Daily Quiz', '/quiz']].map(([label, href]) => (
                <li key={label}><Link to={href} className="text-xs text-slate-500 hover:text-emerald-400 transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>
          {/* Account */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account</p>
            <ul className="space-y-2">
              {[['Dashboard', '/dashboard'], ['Community Chat', '/chat'], ['Login', '/login'], ['Register', '/register']].map(([label, href]) => (
                <li key={label}><Link to={href} className="text-xs text-slate-500 hover:text-emerald-400 transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-900 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[10px] text-slate-600">
            © {new Date().getFullYear()} AgriRent Hub. All rights reserved. Built with MERN + AI.
          </p>
          <div className="flex items-center gap-4 text-[10px] text-slate-600">
            <span>🌾 Powered by Gemini 2.0</span>
            <span>•</span>
            <span>🌦️ Live Weather</span>
            <span>•</span>
            <span>💳 Razorpay Secure</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

const MainApp = () => {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-950 font-sans selection:bg-emerald-500/30 selection:text-emerald-300 text-slate-100">
      <Navigation />
      
      {/* Route Views Wrapper */}
      <main className="flex-grow pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/rentals" element={<Rentals />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/crops" element={<Crops />} />
          <Route path="/ai-advisory" element={<AIAdvisory />} />
          <Route path="/disease-scanner" element={<DiseaseScanner />} />
          <Route path="/price-prediction" element={<PricePrediction />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/weather" element={<WeatherPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/dashboard" element={<Dashboards />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
};

const App = () => {
  return (
    <Provider store={store}>
      <LanguageProvider>
        <Router>
          <MainApp />
        </Router>
      </LanguageProvider>
    </Provider>
  );
};

export default App;
