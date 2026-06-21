import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { Bot, Send, Volume2, Sparkles, Copy, Check, RefreshCw, Mic, MicOff, Trash2, ChevronRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import ReactMarkdown from 'react-markdown';

// ─── Typing Dots Animation ────────────────────────────────────────────────────
const TypingDots = () => (
  <div className="flex items-center gap-1 py-1">
    {[0, 1, 2].map(i => (
      <span
        key={i}
        className="h-2 w-2 bg-emerald-500 rounded-full animate-bounce"
        style={{ animationDelay: `${i * 0.15}s` }}
      />
    ))}
  </div>
);

// ─── Message Bubble ───────────────────────────────────────────────────────────
const MessageBubble = ({ log, onSpeak }) => {
  const [copied, setCopied] = useState(false);
  const isUser = log.sender === 'Me';

  const handleCopy = () => {
    navigator.clipboard.writeText(log.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSourceBadge = (source) => {
    if (source === 'gemini') return <span className="text-[8px] bg-blue-500/20 border border-blue-500/30 text-blue-400 px-1.5 py-0.5 rounded-full font-bold">✨ Gemini 2.0</span>;
    if (source === 'quota-exceeded') return <span className="text-[8px] bg-amber-500/20 border border-amber-500/30 text-amber-400 px-1.5 py-0.5 rounded-full font-bold">⚡ Smart KB</span>;
    return <span className="text-[8px] bg-slate-700/50 border border-slate-700 text-slate-500 px-1.5 py-0.5 rounded-full font-bold">🌾 AgriBot</span>;
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} group`}>
      <div className={`max-w-[85%] space-y-1`}>
        <div className={`flex items-center gap-2 px-1 ${isUser ? 'justify-end' : ''}`}>
          <span className={`text-[9px] font-bold uppercase tracking-wider ${isUser ? 'text-emerald-300' : 'text-emerald-400'}`}>
            {isUser ? 'You' : '🤖 AgriBot'}
          </span>
          {!isUser && log.source && getSourceBadge(log.source)}
        </div>
        <div className={`rounded-2xl p-4 text-xs leading-relaxed relative ${
          isUser
            ? 'bg-emerald-600 text-white rounded-tr-none'
            : 'bg-slate-900/80 border border-slate-800 text-slate-200 rounded-tl-none'
        }`}>
          {isUser ? (
            <p>{log.text}</p>
          ) : (
            <div className="prose prose-sm prose-invert max-w-none text-xs leading-relaxed
              [&>p]:mb-2 [&>p:last-child]:mb-0
              [&>ul]:space-y-1 [&>ul]:pl-4 [&>ul>li]:list-disc
              [&>ol]:space-y-1 [&>ol]:pl-4 [&>ol>li]:list-decimal
              [&>strong]:text-emerald-300 [&>strong]:font-bold
              [&>h1]:text-sm [&>h1]:font-bold [&>h1]:text-white [&>h1]:mb-2
              [&>h2]:text-xs [&>h2]:font-bold [&>h2]:text-white [&>h2]:mb-1.5
              [&>h3]:text-xs [&>h3]:font-bold [&>h3]:text-slate-200 [&>h3]:mb-1
            ">
              <ReactMarkdown>{log.text}</ReactMarkdown>
            </div>
          )}

          {/* AI Message Actions */}
          {!isUser && (
            <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-800">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-slate-500 hover:text-white transition-colors text-[10px] font-semibold"
              >
                {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={() => onSpeak(log.text)}
                className="flex items-center gap-1 text-slate-500 hover:text-white transition-colors text-[10px] font-semibold"
              >
                <Volume2 size={11} /> Read Aloud
              </button>
            </div>
          )}
        </div>
        <span className="text-[9px] text-slate-600 block px-1">{log.time}</span>
      </div>
    </div>
  );
};

// ─── Suggested Questions ──────────────────────────────────────────────────────
const SUGGESTIONS = [
  { emoji: '🍅', text: 'Why are my tomato leaves turning yellow?' },
  { emoji: '🌾', text: 'Best fertilizer for wheat in winter?' },
  { emoji: '🌧️', text: 'Should I irrigate today if rain expected tomorrow?' },
  { emoji: '💰', text: 'When is the best time to sell wheat?' },
  { emoji: '🦠', text: 'How to treat rice blast disease?' },
  { emoji: '🏛️', text: 'Tell me about PM-KISAN scheme benefits' },
  { emoji: '🌱', text: 'How to improve soil fertility naturally?' },
  { emoji: '🚜', text: 'What equipment do I need for 5-acre farm?' },
];

// ─── Main Component ───────────────────────────────────────────────────────────
const AIAdvisory = () => {
  const { user, token } = useSelector((state) => state.auth);
  const { language } = useLanguage();

  const [message, setMessage] = useState('');
  const [chatLogs, setChatLogs] = useState([
    {
      sender: 'AI',
      text: `# 🌱 Namaste! I'm AgriBot

Your intelligent farming assistant powered by AI.

**I can help you with:**
- 🌿 Crop disease diagnosis & treatment
- 🧪 Fertilizer & soil health recommendations  
- 🚜 Equipment rental guidance
- 🌦️ Weather-based farming advice
- 💰 Mandi prices & selling strategy
- 🏛️ Government schemes (PM-KISAN, Kisan Credit Card)

**Just ask me anything in English, Hindi, or Hinglish!**`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [recs, setRecs] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLogs, loading]);

  // Fetch smart recommendations
  useEffect(() => {
    if (!token) return;
    axios.get('/api/ai/recommendations', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      if (res.data.success) setRecs(res.data.recommendations);
    }).catch(() => {});
  }, [token]);

  const speak = useCallback((text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.replace(/[#*`]/g, ''));
      utterance.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }, [language]);

  const sendMessage = useCallback(async (msgText) => {
    const text = (msgText || message).trim();
    if (!text) return;

    const userMsg = {
      sender: 'Me',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatLogs(prev => [...prev, userMsg]);
    setMessage('');
    setShowSuggestions(false);
    setLoading(true);

    try {
      const res = await axios.post('/api/ai/chat-advisor', { message: text, language });
      const aiMsg = {
        sender: 'AI',
        text: res.data.response || 'Sorry, I could not process that request.',
        source: res.data.source || 'rule-based',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatLogs(prev => [...prev, aiMsg]);
    } catch (err) {
      setChatLogs(prev => [...prev, {
        sender: 'AI',
        text: '❌ I had trouble connecting. Please check your internet and try again.',
        source: 'error',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setLoading(false);
    }
  }, [message, language]);

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  const handleClearChat = () => {
    setChatLogs([{
      sender: 'AI',
      text: '🌱 Chat cleared! How can I help you with your farming today?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setShowSuggestions(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Bot className="text-emerald-400" size={26} /> AI Farming Advisory
        </h1>
        <p className="text-slate-400 text-xs mt-1">
          Powered by Gemini AI • Multilingual • Advanced Agronomy Knowledge
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Chat Panel ── */}
        <div className="lg:col-span-2 flex flex-col glass border border-slate-800 rounded-2xl overflow-hidden" style={{ height: '620px' }}>

          {/* Chat Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/40 shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-9 w-9 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400">
                  <Bot size={18} />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-emerald-500 rounded-full border-2 border-slate-950" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">AgriBot</p>
                <p className="text-[9px] text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  Online • Gemini 2.0 + Smart KB
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold uppercase">
                {language === 'hi' ? 'हिन्दी' : language === 'hinglish' ? 'Hinglish' : 'English'}
              </span>
              <button
                onClick={handleClearChat}
                className="text-slate-500 hover:text-red-400 transition-colors"
                title="Clear chat"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {chatLogs.map((log, i) => (
              <MessageBubble key={i} log={log} onSpeak={speak} />
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl rounded-tl-none px-5 py-3">
                  <TypingDots />
                </div>
              </div>
            )}

            {/* Suggested Questions */}
            {showSuggestions && chatLogs.length === 1 && (
              <div className="space-y-2 pt-2">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">💡 Try asking:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(s.text)}
                      className="text-left text-[11px] text-slate-300 bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 hover:text-white rounded-xl px-3 py-2.5 transition-all flex items-center gap-2 font-medium"
                    >
                      <span className="text-base">{s.emoji}</span>
                      <span className="line-clamp-1">{s.text}</span>
                      <ChevronRight size={12} className="ml-auto shrink-0 text-slate-600" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form
            onSubmit={handleSubmit}
            className="px-4 py-3.5 bg-slate-950/50 border-t border-slate-800 flex gap-3 items-center shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                language === 'hi'
                  ? 'पूछें: मेरी फसल में क्या समस्या है?'
                  : "Ask: 'Why are my leaves yellow?' or 'खाद कब डालें?'"
              }
              disabled={loading}
              className="flex-1 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl py-3 px-4 text-xs text-white placeholder-slate-600 focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !message.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 disabled:text-slate-600 text-white p-3 rounded-xl transition-all shadow flex items-center shrink-0"
            >
              {loading ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </form>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-5">

          {/* Smart Recommendations */}
          <div className="glass p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="text-amber-400" size={16} />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Smart Recommendations</h3>
            </div>

            {!token ? (
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Log in to get personalized tool and seed recommendations based on your farm profile.
              </p>
            ) : recs ? (
              <div className="space-y-4">
                {recs.tools?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">🚜 Equipment Nearby</p>
                    {recs.tools.slice(0, 3).map((t, i) => (
                      <div key={i} className="bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 flex justify-between items-center">
                        <span className="text-xs font-semibold text-slate-200 truncate max-w-[130px]">{t.name}</span>
                        <span className="text-[10px] font-bold text-emerald-400">₹{t.rentRates?.daily}/day</span>
                      </div>
                    ))}
                  </div>
                )}
                {recs.seeds?.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">🌱 Suggested Inputs</p>
                    {recs.seeds.slice(0, 3).map((s, i) => (
                      <div key={i} className="bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 flex justify-between items-center">
                        <span className="text-xs font-semibold text-slate-200 truncate max-w-[130px]">{s.name}</span>
                        <span className="text-[10px] font-bold text-emerald-400">₹{s.price}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <RefreshCw size={20} className="text-slate-700 animate-spin mx-auto mb-2" />
                <p className="text-[10px] text-slate-600">Loading recommendations...</p>
              </div>
            )}
          </div>

          {/* Quick Topics */}
          <div className="glass p-5 rounded-2xl border border-slate-800 space-y-3">
            <p className="text-xs font-bold text-white uppercase tracking-wider">📚 Quick Topics</p>
            <div className="space-y-1.5">
              {[
                ['🌾', 'Crop Disease', 'How to identify and treat plant diseases'],
                ['🧪', 'Fertilizers', 'NPK recommendations for your soil'],
                ['🌦️', 'Weather', 'Irrigation based on forecast'],
                ['💰', 'Mandi Rates', 'Best time to sell your produce'],
                ['🏛️', 'Govt Schemes', 'PM-KISAN, Kisan Credit Card info'],
              ].map(([icon, topic, desc]) => (
                <button
                  key={topic}
                  onClick={() => sendMessage(`Tell me about ${topic} for farmers`)}
                  className="w-full text-left bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800 hover:border-slate-700 rounded-xl px-3 py-2 transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{icon}</span>
                    <div>
                      <p className="text-[11px] font-bold text-slate-200 group-hover:text-white">{topic}</p>
                      <p className="text-[9px] text-slate-600">{desc}</p>
                    </div>
                    <ChevronRight size={12} className="ml-auto text-slate-700 group-hover:text-slate-400" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Voice TTS */}
          <div className="bg-gradient-to-br from-emerald-950/30 to-slate-950 border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Volume2 size={14} className="text-emerald-400" />
              <p className="text-xs font-bold text-white">Voice Playback</p>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Click "Read Aloud" on any AI response to hear it in your language (Hindi/English). 
              Uses device text-to-speech.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAdvisory;
