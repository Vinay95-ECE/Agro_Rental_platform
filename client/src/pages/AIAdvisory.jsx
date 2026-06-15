import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { Bot, MessageSquare, Volume2, Sparkles, Send, Award, Compass } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const AIAdvisory = () => {
  const { user, token } = useSelector((state) => state.auth);
  const { language } = useLanguage();

  const [message, setMessage] = useState('');
  const [chatLogs, setChatLogs] = useState([
    { sender: 'AI', text: 'Hello! I am your AI Agronomist advisor. Ask me anything about soil, crops, weather, or rentals in English, Hindi, or Hinglish.' }
  ]);
  const [loading, setLoading] = useState(false);

  // Recommendations state
  const [recs, setRecs] = useState(null);
  const [recsLoading, setRecsLoading] = useState(false);

  // Fetch Smart Recommendations
  const fetchRecommendations = async () => {
    if (!token) return;
    setRecsLoading(true);
    try {
      const res = await axios.get('/api/ai/recommendations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setRecs(res.data.recommendations);
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err);
    } finally {
      setRecsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [token]);

  // Speech Output Synthesis
  const speak = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'hi' ? 'hi-IN' : 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = { sender: 'Me', text: message };
    setChatLogs([...chatLogs, userMessage]);
    setMessage('');
    setLoading(true);

    try {
      const response = await axios.post('/api/ai/chat-advisor', {
        message: userMessage.text,
        language
      });

      if (response.data.success) {
        const aiMessage = { sender: 'AI', text: response.data.response };
        setChatLogs(prev => [...prev, aiMessage]);
        
        // Auto-read response if user speech synthesis works
        speak(aiMessage.text);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Error retrieving advisory feedback.';
      setChatLogs(prev => [...prev, { sender: 'AI', text: errorMsg }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">AI Farming Advisory</h1>
        <p className="text-slate-400 text-xs mt-1">Get instant crop science, weather alerts, and smart soil care advice from our AI Agronomist.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Chat Advisory Panel */}
        <div className="lg:col-span-2 glass border border-slate-800 rounded-3xl overflow-hidden flex flex-col h-[550px] justify-between">
          <div className="p-4 border-b border-slate-850 bg-slate-950/20 flex items-center gap-2">
            <div className="h-8 w-8 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400">
              <Bot size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-white">AI Agronomist Chatbot</p>
              <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">Multilingual Helper</p>
            </div>
          </div>

          {/* Messages Logs Body */}
          <div className="flex-grow p-6 overflow-y-auto space-y-4 scrollbar-hidden bg-slate-900/10">
            {chatLogs.map((log, index) => (
              <div key={index} className={`flex ${log.sender === 'Me' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-md rounded-2xl p-4 text-xs leading-relaxed flex flex-col ${
                  log.sender === 'Me'
                    ? 'bg-emerald-600 text-white rounded-tr-none'
                    : 'bg-slate-950/60 border border-slate-850 text-slate-300 rounded-tl-none'
                }`}>
                  <span className={`text-[9px] uppercase font-bold tracking-wider mb-1 ${
                    log.sender === 'Me' ? 'text-emerald-100' : 'text-emerald-400'
                  }`}>
                    {log.sender === 'Me' ? 'You' : 'AI advisor'}
                  </span>
                  <p>{log.text}</p>
                  
                  {log.sender === 'AI' && (
                    <button
                      onClick={() => speak(log.text)}
                      className="text-slate-400 hover:text-white mt-2 self-start flex items-center gap-1 text-[10px] font-semibold transition-colors"
                      title="Listen to response"
                    >
                      <Volume2 size={12} /> Read Aloud
                    </button>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-950/60 border border-slate-850 text-slate-500 rounded-2xl rounded-tl-none p-4 text-xs animate-pulse">
                  AI advisor is analyzing inputs...
                </div>
              </div>
            )}
          </div>

          {/* Input Chat Footer */}
          <form onSubmit={handleSendMessage} className="p-4 bg-slate-950/40 border-t border-slate-850 flex gap-4 items-center">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask AI: 'When is rain expected?' or 'बीज बोने की विधि...'"
              className="flex-grow bg-slate-950 border border-slate-850 rounded-xl py-3.5 px-4 text-xs focus:outline-none focus:border-emerald-500 text-white placeholder-slate-600"
            />
            <button
              type="submit"
              disabled={loading || !message.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 disabled:text-slate-500 text-white p-3.5 rounded-xl text-xs font-bold transition-all shadow-md shrink-0"
            >
              <Send size={16} />
            </button>
          </form>
        </div>

        {/* Right Column: Smart Recommendations Engine */}
        <div className="space-y-6">
          <div className="glass p-6 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <Compass className="text-emerald-400" size={20} />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Smart Recommendations</h3>
            </div>
            <p className="text-xs text-slate-400">
              Personalized tool rentals, seed selections, and soil fertilizers tailored to your locations and crop activity history.
            </p>

            {recsLoading ? (
              <div className="text-center py-10 text-slate-500 text-xs">Loading recommendation matches...</div>
            ) : !token ? (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] p-3 rounded-xl flex items-start gap-2 leading-relaxed">
                <p>Log in as a farmer to parse soil attributes and match marketplace listings dynamically.</p>
              </div>
            ) : recs ? (
              <div className="space-y-4 text-xs">
                {/* Tools Recs */}
                <div className="space-y-2">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Suggested Equipment Nearby</p>
                  {recs.tools && recs.tools.length > 0 ? (
                    recs.tools.map((tool, idx) => (
                      <div key={idx} className="bg-slate-950/40 p-3 rounded-xl border border-slate-850 flex items-center justify-between">
                        <span className="font-bold text-white truncate max-w-[150px]">{tool.name}</span>
                        <span className="text-emerald-400 font-extrabold">₹{tool.rentRates?.daily}/Day</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-slate-500 italic">No tools listed matching crop profile within 25km.</p>
                  )}
                </div>

                {/* Products Recs */}
                <div className="space-y-2 pt-2 border-t border-slate-850">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold font-bold">Suggested Organic Inputs</p>
                  {recs.seeds && recs.seeds.length > 0 ? (
                    recs.seeds.map((item, idx) => (
                      <div key={idx} className="bg-slate-950/40 p-3 rounded-xl border border-slate-850 flex items-center justify-between">
                        <span className="font-bold text-white truncate max-w-[150px]">{item.name}</span>
                        <span className="text-emerald-400 font-bold">₹{item.price}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-slate-500 italic">No seed inputs matching profile catalog.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500 text-[10px] italic">No transaction profile found. Try posting a crop harvest or booking machinery first!</div>
            )}
          </div>

          {/* Voice Command Guidance card */}
          <div className="bg-gradient-to-br from-emerald-950/20 to-slate-950 border border-slate-850 p-6 rounded-3xl space-y-3">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Award size={16} className="text-emerald-400" /> Multilingual Speech Control
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              AgriRent Hub incorporates HTML5 Speech Synthesis. The chatbot will vocalize guidance in local Hindi or English dialects.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AIAdvisory;
