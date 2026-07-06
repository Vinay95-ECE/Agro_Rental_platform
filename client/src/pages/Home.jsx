import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Mic, ArrowRight, Star, Shield, Cpu, RefreshCw, HelpCircle, BookOpen } from 'lucide-react';
import { useToast } from '../context/ToastContext';


const Home = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);


  const startVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.warning('Voice search requires Google Chrome or Edge browser.', 'Browser Not Supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language === 'hi' ? 'hi-IN' : 'en-US';
    setIsRecording(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
      setIsRecording(false);
      
      if (transcript.toLowerCase().includes('tractor') || transcript.toLowerCase().includes('ट्रैक्टर')) {
        navigate('/rentals?search=' + encodeURIComponent(transcript));
      } else if (transcript.toLowerCase().includes('weather') || transcript.toLowerCase().includes('rain') || transcript.toLowerCase().includes('मौसम')) {
        navigate('/weather');
      } else if (transcript.toLowerCase().includes('seed') || transcript.toLowerCase().includes('बीज') || transcript.toLowerCase().includes('fertilizer') || transcript.toLowerCase().includes('खाद')) {
        navigate('/shop?search=' + encodeURIComponent(transcript));
      } else if (transcript.toLowerCase().includes('disease') || transcript.toLowerCase().includes('रोग')) {
        navigate('/disease-scanner');
      } else if (transcript.toLowerCase().includes('price') || transcript.toLowerCase().includes('भाव')) {
        navigate('/price-prediction');
      } else if (transcript.toLowerCase().includes('quiz') || transcript.toLowerCase().includes('क्विज')) {
        navigate('/quiz');
      } else {
        navigate('/rentals?search=' + encodeURIComponent(transcript));
      }
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/rentals?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const blogPosts = [
    {
      id: 1,
      tag: 'Agronomy Guide',
      title: 'Optimizing Rabi Wheat Yields: Seed Selection & Nitrogen Ratios',
      desc: 'Learn how applying balanced NPK fertilizers and certified HD-3086 seed varieties doubles harvest sizes.',
      img: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600'
    },
    {
      id: 2,
      tag: 'Water Tech',
      title: 'Drip Irrigation vs Flood: Water Conservation in Dry Seasons',
      desc: 'An analytical report explaining how precision drip networks save up to 40% more groundwater in summer.',
      img: 'https://images.unsplash.com/photo-1595273670150-db0a3e39843c?auto=format&fit=crop&q=80&w=600'
    },
    {
      id: 3,
      tag: 'Market Forecast',
      title: 'Crop Mandi Pricing Forecast: Rabi Wheat Trends 2026',
      desc: 'Understanding supply thresholds, export options, and state district linear prediction models.',
      img: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=600'
    }
  ];

  return (
    <div className="space-y-20 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/20 py-20 px-6 sm:px-12 lg:px-16 flex flex-col lg:flex-row items-center gap-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent pointer-events-none"></div>
        <div className="flex-1 space-y-6 z-10">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 text-xs text-emerald-400 font-semibold uppercase tracking-wider">
            🌱 Startup AgriTech Ecosystem
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            {t('heroTitle')}
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-xl leading-relaxed">
            {t('heroSubtitle')}
          </p>
          
          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-2 max-w-md">
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3.5 pl-4 pr-12 text-sm focus:outline-none focus:border-emerald-500 placeholder-slate-500 text-white transition-all shadow-inner"
              />
              <button
                type="button"
                onClick={startVoiceSearch}
                className={`absolute right-3 p-2 rounded-lg transition-all ${isRecording ? 'bg-red-500/20 text-red-500 animate-pulse scale-110' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                title="Search with Voice"
              >
                <Mic size={20} />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 pl-1">{t('voiceSearchTip')}</p>
          </form>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link to="/rentals" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-8 rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20">
              {t('rentNow')}
            </Link>
            <Link to="/shop" className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 px-8 rounded-xl border border-slate-700 transition-all">
              {t('buyNow')}
            </Link>
          </div>
        </div>

        <div className="flex-1 w-full relative z-10">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent rounded-2xl z-10 pointer-events-none"></div>
          <img
            src="https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&q=80&w=800"
            alt="AgriRent Farming Equipment"
            className="w-full h-80 sm:h-96 object-cover rounded-2xl border border-slate-800 shadow-2xl relative"
          />
          <div className="absolute -bottom-6 -left-6 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 shadow-xl z-20">
            <span className="text-3xl">🚜</span>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Available nearby</p>
              <p className="text-sm font-bold text-white">42 Active Machines</p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="glass-card p-8 rounded-2xl space-y-4">
          <div className="h-12 w-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
            <Shield size={24} />
          </div>
          <h3 className="text-xl font-bold text-white">Shareable Machinery</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Rent high-capacity tractors, seeders, and water pumps. Search within a 5km to 50km radius with live geolocation maps.
          </p>
        </div>
        <div className="glass-card p-8 rounded-2xl space-y-4">
          <div className="h-12 w-12 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-400">
            <RefreshCw size={24} />
          </div>
          <h3 className="text-xl font-bold text-white">Direct Marketplace</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Sell grains, vegetables, and crops directly to bulk buyers. Shopkeepers manage seed inventories and checkouts.
          </p>
        </div>
        <div className="glass-card p-8 rounded-2xl space-y-4">
          <div className="h-12 w-12 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
            <Cpu size={24} />
          </div>
          <h3 className="text-xl font-bold text-white">AI Farming Intelligence</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Predict future crop mandi prices, diagnose leaf sickness via diagnostic scanners, and seek irrigation advisories.
          </p>
        </div>
      </section>

      {/* AI Features Showcase */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-xs text-blue-400 font-semibold uppercase tracking-wider">
            ✨ Newly Added Production Features
          </div>
          <h2 className="text-3xl font-bold text-white">Powered by Real AI & Live Data</h2>
          <p className="text-slate-400 text-sm max-w-2xl mx-auto">Production-grade tools to help every farmer make data-driven decisions — all in one platform.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { emoji: '🔬', title: 'AI Disease Detector', desc: 'Upload a leaf photo — Gemini Vision AI diagnoses disease with treatment, fertilizer & pesticide advice.', link: '/disease-scanner', color: 'from-emerald-950/40 to-slate-950', border: 'border-emerald-500/20 hover:border-emerald-500/50', tag: 'Gemini 2.0' },
            { emoji: '🤖', title: 'AI Agronomist Chat', desc: 'Real-time farming advice in English, Hindi or Hinglish. Ask about diseases, fertilizers, govt schemes.', link: '/ai-advisory', color: 'from-blue-950/40 to-slate-950', border: 'border-blue-500/20 hover:border-blue-500/50', tag: 'Gemini 2.0' },
            { emoji: '🌦️', title: 'Weather Forecast', desc: 'Live 7-day forecast with Rain % prediction, spraying & irrigation recommendations for your field.', link: '/weather', color: 'from-cyan-950/40 to-slate-950', border: 'border-cyan-500/20 hover:border-cyan-500/50', tag: 'Live Data' },
            { emoji: '💳', title: 'Razorpay Payments', desc: 'Secure online payments for equipment rentals. Pay after owner approval — UPI, Card, Netbanking.', link: '/dashboard', color: 'from-purple-950/40 to-slate-950', border: 'border-purple-500/20 hover:border-purple-500/50', tag: 'Secure' },
          ].map((feat) => (
            <Link key={feat.title} to={feat.link}
              className={`bg-gradient-to-br ${feat.color} border ${feat.border} rounded-2xl p-6 space-y-4 block transition-all hover:-translate-y-1 hover:shadow-lg group`}>
              <div className="flex items-center justify-between">
                <span className="text-4xl">{feat.emoji}</span>
                <span className="text-[9px] font-bold bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full uppercase tracking-wider">{feat.tag}</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">{feat.title}</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed mt-1">{feat.desc}</p>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                Try Now <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Platform Statistics */}
      <section className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-8">
        <div className="max-w-2xl mx-auto space-y-2">
          <h2 className="text-3xl font-bold text-white">Platform Statistics</h2>
          <p className="text-slate-400 text-sm">Empowering agricultural growth through technological connectivity.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="space-y-1">
            <p className="text-3xl sm:text-4xl font-extrabold text-emerald-400">₹4.8M+</p>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Rental Volume</p>
          </div>
          <div className="space-y-1">
            <p className="text-3xl sm:text-4xl font-extrabold text-white">12,000+</p>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Active Farmers</p>
          </div>
          <div className="space-y-1">
            <p className="text-3xl sm:text-4xl font-extrabold text-white">850+</p>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Verified Tool Owners</p>
          </div>
          <div className="space-y-1">
            <p className="text-3xl sm:text-4xl font-extrabold text-emerald-400">98.2%</p>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">KYC Approval Rate</p>
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-white">{t('successStories')}</h2>
          <p className="text-sm text-slate-400 font-medium">Read how direct-to-farm sharing optimization is boosting regional revenues.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="glass-card overflow-hidden rounded-2xl flex flex-col sm:flex-row">
            <img src="https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=400" className="w-full sm:w-48 h-48 sm:h-auto object-cover" alt="Farmer success" />
            <div className="p-6 flex flex-col justify-between space-y-4">
              <p className="text-sm text-slate-300 italic leading-relaxed">
                "AgriRent Hub helped me rent a high-power rotavator for my Rabi wheat crop fields at half the market price. The booking calendar is so simple!"
              </p>
              <div>
                <p className="text-sm font-bold text-white">Baldev Singh, Ludhiana</p>
                <p className="text-xs text-emerald-400 font-semibold mt-0.5">Wheat Farmer (+450 Agri Coins)</p>
              </div>
            </div>
          </div>
          <div className="glass-card overflow-hidden rounded-2xl flex flex-col sm:flex-row">
            <img src="https://images.unsplash.com/photo-1595273670150-db0a3e39843c?auto=format&fit=crop&q=80&w=400" className="w-full sm:w-48 h-48 sm:h-auto object-cover" alt="Tool owner success" />
            <div className="p-6 flex flex-col justify-between space-y-4">
              <p className="text-sm text-slate-300 italic leading-relaxed">
                "I had a tractor sitting idle for 20 days a month. Listing it on this platform has brought a steady secondary income. Best AgriTech startup!"
              </p>
              <div>
                <p className="text-sm font-bold text-white">Karan Johal, Patiala</p>
                <p className="text-xs text-emerald-400 font-semibold mt-0.5">Tool Owner (+1,200 XP earned)</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Blog/Insights Section */}
      <section className="space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold text-white flex items-center gap-2">
              <BookOpen className="text-emerald-400" size={28} /> Agricultural Insights
            </h2>
            <p className="text-sm text-slate-400">Latest expert advice on modern crop management and yield optimization.</p>
          </div>
          <button className="text-emerald-400 hover:text-emerald-300 text-sm font-semibold flex items-center gap-1.5 transition-colors group">
            View All Articles <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {blogPosts.map((post) => (
            <article key={post.id} className="glass-card rounded-2xl overflow-hidden flex flex-col justify-between border border-slate-800 hover:border-emerald-500/30">
              <img src={post.img} alt={post.title} className="h-44 w-full object-cover" />
              <div className="p-6 space-y-3 flex-grow flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    {post.tag}
                  </span>
                  <h4 className="text-base font-bold text-white leading-snug hover:text-emerald-400 transition-colors">
                    {post.title}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {post.desc}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-white flex items-center justify-center gap-2">
            <HelpCircle className="text-emerald-400" size={28} /> FAQ
          </h2>
          <p className="text-sm text-slate-400">Answers to frequently asked questions about AgriRent Hub.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <div className="bg-slate-900/30 border border-slate-850 p-6 rounded-2xl space-y-2">
            <h4 className="font-bold text-white text-sm">How do I earn Agri Coins?</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              By participating in daily quizzes, solving diagnosis challenges, or listing harvests. These coins can be redeemed for discounts on seeds and fertilizers.
            </p>
          </div>
          <div className="bg-slate-900/30 border border-slate-850 p-6 rounded-2xl space-y-2">
            <h4 className="font-bold text-white text-sm">How does radius search calculate distances?</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              The search uses the Haversine formula based on your browser geolocation coordinates. It filters equipment listings and plots the distance and estimated transport travel times.
            </p>
          </div>
          <div className="bg-slate-900/30 border border-slate-850 p-6 rounded-2xl space-y-2">
            <h4 className="font-bold text-white text-sm">How does the Airbnb calendar system block double bookings?</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Our backend executes atomic checks on overlapping start and end dates before approving booking requests, preventing race conditions or double rental assignments.
            </p>
          </div>
          <div className="bg-slate-900/30 border border-slate-850 p-6 rounded-2xl space-y-2">
            <h4 className="font-bold text-white text-sm">Who verifies the KYC documents?</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              The platform administrators check Aadhaar credentials and machinery/shop licenses via the Admin KYC dashboard, flagging profiles as approved or rejected.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
