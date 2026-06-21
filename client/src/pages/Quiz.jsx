import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import {
  Trophy, Check, ArrowRight, Star, Award, RefreshCw,
  AlertTriangle, Zap, Target, BookOpen, Medal, Crown,
  ChevronRight, Clock
} from 'lucide-react';
import { updateGamification } from '../store/authSlice';

// ─── Question bank with categories, difficulty, and explanations ──────────────
const QUESTION_BANK = [
  // CROPS - Easy
  { id: 'q1', question: 'Which nutrient is essential for healthy green leaf growth in plants?', options: ['Nitrogen', 'Phosphorus', 'Potassium', 'Calcium'], answer: 'Nitrogen', category: 'Crops', difficulty: 'Easy', explanation: 'Nitrogen (N) is the primary component of chlorophyll, which gives leaves their green color and drives photosynthesis.' },
  { id: 'q2', question: 'What is the main season for growing rice in India?', options: ['Rabi', 'Kharif', 'Zaid', 'All seasons'], answer: 'Kharif', category: 'Crops', difficulty: 'Easy', explanation: 'Rice is primarily a Kharif crop, sown in June-July and harvested in November-December during the monsoon season.' },
  { id: 'q3', question: 'Which crop is also called the "Golden Fiber"?', options: ['Cotton', 'Jute', 'Flax', 'Hemp'], answer: 'Jute', category: 'Crops', difficulty: 'Easy', explanation: 'Jute is known as "Golden Fiber" due to its golden silky shine and its major economic importance in India and Bangladesh.' },
  { id: 'q4', question: 'Wheat belongs to which plant family?', options: ['Leguminosae', 'Gramineae (Poaceae)', 'Solanaceae', 'Cruciferae'], answer: 'Gramineae (Poaceae)', category: 'Crops', difficulty: 'Medium', explanation: 'Wheat (Triticum aestivum) belongs to the grass family Poaceae, along with rice, maize, barley, and sugarcane.' },

  // DISEASES - Medium
  { id: 'q5', question: 'Which fungal disease causes spindle-shaped lesions on rice leaves and neck rot?', options: ['Brown Spot', 'Sheath Blight', 'Rice Blast', 'Bacterial Blight'], answer: 'Rice Blast', category: 'Diseases', difficulty: 'Medium', explanation: 'Rice Blast (Magnaporthe oryzae) is the most destructive rice disease worldwide, causing diamond-shaped lesions and neck rot that can destroy entire crops.' },
  { id: 'q6', question: 'What causes "Late Blight" in potato crops?', options: ['Bacteria', 'Virus', 'Fungus (Phytophthora infestans)', 'Nematode'], answer: 'Fungus (Phytophthora infestans)', category: 'Diseases', difficulty: 'Medium', explanation: 'Late Blight is caused by the oomycete Phytophthora infestans. It caused the famous Irish Potato Famine (1845-1849).' },
  { id: 'q7', question: 'Which chemical is most effective against wheat rust diseases?', options: ['Chlorpyrifos', 'Propiconazole', 'Atrazine', 'Glyphosate'], answer: 'Propiconazole', category: 'Diseases', difficulty: 'Hard', explanation: 'Propiconazole (Tilt 25 EC) is a triazole fungicide highly effective against all three wheat rust diseases: stem rust, leaf rust, and stripe rust.' },
  { id: 'q8', question: 'Early Blight of tomato is caused by which pathogen?', options: ['Alternaria solani', 'Fusarium oxysporum', 'Pythium spp.', 'Botrytis cinerea'], answer: 'Alternaria solani', category: 'Diseases', difficulty: 'Hard', explanation: 'Alternaria solani causes Early Blight, characterized by dark concentric ring (target board) lesions on older leaves, spreading upward.' },

  // IRRIGATION
  { id: 'q9', question: 'Which irrigation method has the highest water use efficiency?', options: ['Flood irrigation', 'Sprinkler irrigation', 'Drip irrigation', 'Furrow irrigation'], answer: 'Drip irrigation', category: 'Irrigation', difficulty: 'Easy', explanation: 'Drip irrigation delivers water directly to the root zone with 90-95% efficiency, compared to 50-60% for flood irrigation.' },
  { id: 'q10', question: 'What does ETc stand for in irrigation science?', options: ['Environmental Temperature coefficient', 'Crop Evapotranspiration', 'Effective Transpiration Coefficient', 'Efficiency Transfer Calculation'], answer: 'Crop Evapotranspiration', category: 'Irrigation', difficulty: 'Hard', explanation: 'Crop Evapotranspiration (ETc) = ETo × Kc, where ETo is reference evapotranspiration and Kc is the crop coefficient.' },
  { id: 'q11', question: 'Critical irrigation stage for wheat is?', options: ['Tillering', 'Crown Root Initiation (CRI)', 'Jointing', 'All of the above'], answer: 'All of the above', category: 'Irrigation', difficulty: 'Medium', explanation: 'Wheat has 5 critical irrigation stages: CRI (21 days), Tillering, Jointing, Flowering, and Grain filling. Missing any reduces yield significantly.' },

  // FERTILIZERS
  { id: 'q12', question: 'What is the NPK ratio of DAP (Di-Ammonium Phosphate)?', options: ['18-46-0', '12-32-16', '0-46-0', '46-0-0'], answer: '18-46-0', category: 'Fertilizers', difficulty: 'Medium', explanation: 'DAP contains 18% Nitrogen and 46% Phosphorus (P₂O₅), making it one of the most concentrated phosphatic fertilizers available.' },
  { id: 'q13', question: 'Which micronutrient deficiency causes "interveinal chlorosis" in plants?', options: ['Iron', 'Boron', 'Zinc', 'Manganese'], answer: 'Iron', category: 'Fertilizers', difficulty: 'Hard', explanation: 'Iron deficiency causes interveinal chlorosis (yellowing between veins while veins stay green) because iron is needed for chlorophyll synthesis.' },
  { id: 'q14', question: 'Urea contains what percentage of Nitrogen?', options: ['18%', '26%', '32%', '46%'], answer: '46%', category: 'Fertilizers', difficulty: 'Easy', explanation: 'Urea (CO(NH₂)₂) is the most concentrated solid nitrogen fertilizer with 46% N content, making it cost-effective for farmers.' },

  // MACHINERY
  { id: 'q15', question: 'What is the primary function of a rotavator?', options: ['Harvesting crops', 'Soil pulverization and seedbed preparation', 'Applying fertilizers', 'Spraying pesticides'], answer: 'Soil pulverization and seedbed preparation', category: 'Machinery', difficulty: 'Easy', explanation: 'A rotavator (rotary tiller) breaks up clods and prepares a fine seedbed by rotating its blades, saving time and fuel compared to plowing.' },
  { id: 'q16', question: 'What does PTO stand for in agricultural machinery?', options: ['Power Transfer Operation', 'Power Take-Off', 'Pump Transfer Output', 'Primary Tractor Output'], answer: 'Power Take-Off', category: 'Machinery', difficulty: 'Medium', explanation: 'PTO (Power Take-Off) is a shaft on a tractor that transfers mechanical power from the engine to attached implements like rotavators, threshers, etc.' },

  // WEATHER
  { id: 'q17', question: 'What humidity level creates maximum risk of fungal diseases in crops?', options: ['Below 40%', '40-60%', 'Above 80%', 'Humidity has no effect'], answer: 'Above 80%', category: 'Weather', difficulty: 'Medium', explanation: 'High relative humidity (>80%) combined with warm temperatures creates ideal conditions for fungal spore germination and disease spread.' },
  { id: 'q18', question: 'What is the recommended time to spray pesticides for maximum effectiveness?', options: ['Afternoon (2-4 PM)', 'Night (after 10 PM)', 'Early morning (6-9 AM)', 'After heavy rain'], answer: 'Early morning (6-9 AM)', category: 'Weather', difficulty: 'Easy', explanation: 'Early morning spraying is best because there is little wind, lower temperature reduces evaporation, and dew helps absorption. Avoid afternoon heat.' },
  { id: 'q19', question: 'La Niña weather pattern typically brings what effect on Indian agriculture?', options: ['Drought conditions', 'Above-normal monsoon rainfall', 'Frost and snowfall', 'No significant change'], answer: 'Above-normal monsoon rainfall', category: 'Weather', difficulty: 'Hard', explanation: 'La Niña (cooling of Pacific waters) usually brings above-normal monsoon rainfall to India, benefiting Kharif crops but risking floods.' },
  { id: 'q20', question: 'Which season is Mustard primarily grown in India?', options: ['Kharif (monsoon)', 'Rabi (winter)', 'Zaid (summer)', 'Year-round'], answer: 'Rabi (winter)', category: 'Weather', difficulty: 'Easy', explanation: 'Mustard is a Rabi crop sown in October-November and harvested in February-March. It requires cool dry weather and low humidity.' },
];

const CATEGORIES = ['All', 'Crops', 'Diseases', 'Irrigation', 'Fertilizers', 'Machinery', 'Weather'];
const DIFFICULTIES = ['All', 'Easy', 'Medium', 'Hard'];

const DIFFICULTY_COLORS = {
  Easy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  Medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  Hard: 'text-red-400 bg-red-500/10 border-red-500/20'
};

const ACHIEVEMENTS = [
  { id: 'first', label: 'First Steps', desc: 'Complete your first quiz', icon: '🌱', condition: (score, total) => total >= 1 },
  { id: 'perfect', label: 'Perfect Score', desc: 'Score 100% on any quiz', icon: '🏆', condition: (score, total) => score === total && total > 0 },
  { id: 'disease_master', label: 'Disease Expert', desc: 'Score 100% on disease questions', icon: '🔬', condition: () => false },
  { id: 'half', label: 'Halfway There', desc: 'Score 50% or more', icon: '⭐', condition: (score, total) => total > 0 && score / total >= 0.5 },
  { id: 'scholar', label: 'Agri Scholar', desc: 'Score 80% or more', icon: '📚', condition: (score, total) => total > 0 && score / total >= 0.8 },
];

// ─── Main Quiz Component ──────────────────────────────────────────────────────
const Quiz = () => {
  const { user, token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [questions, setQuestions] = useState([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState('');
  const [answers, setAnswers] = useState([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [xpReward, setXpReward] = useState(0);
  const [coinsReward, setCoinsReward] = useState(0);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('quiz'); // 'quiz' | 'leaderboard' | 'achievements'
  const [quizStarted, setQuizStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [earnedAchievements, setEarnedAchievements] = useState([]);

  // Filter questions by category + difficulty
  const filterAndStartQuiz = () => {
    let filtered = QUESTION_BANK;
    if (selectedCategory !== 'All') filtered = filtered.filter(q => q.category === selectedCategory);
    if (selectedDifficulty !== 'All') filtered = filtered.filter(q => q.difficulty === selectedDifficulty);
    // Shuffle and pick 10
    const shuffled = filtered.sort(() => Math.random() - 0.5).slice(0, Math.min(10, filtered.length));
    setQuestions(shuffled);
    setQuizIndex(0);
    setAnswers([]);
    setSelectedOption('');
    setShowExplanation(false);
    setIsAnswered(false);
    setFinished(false);
    setScore(0);
    setTimeLeft(30);
    setQuizStarted(true);
  };

  // Timer
  useEffect(() => {
    if (!quizStarted || finished || isAnswered || questions.length === 0) return;
    if (timeLeft <= 0) {
      handleAnswer(''); // Auto-skip on timeout
      return;
    }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, quizStarted, finished, isAnswered]);

  // Reset timer on question change
  useEffect(() => {
    setTimeLeft(30);
  }, [quizIndex]);

  // Fetch leaderboard from server
  useEffect(() => {
    setLeaderboardLoading(true);
    axios.get('/api/game/leaderboard')
      .then(res => { if (res.data.success) setLeaderboard(res.data.leaderboard); })
      .catch(() => {})
      .finally(() => setLeaderboardLoading(false));
  }, []);

  const handleAnswer = (option) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);
    setShowExplanation(true);
  };

  const handleNext = async () => {
    const currentQ = questions[quizIndex];
    const isCorrect = selectedOption === currentQ.answer;
    const newAnswers = [...answers, { id: currentQ.id, selectedOption, isCorrect }];
    setAnswers(newAnswers);
    setShowExplanation(false);
    setIsAnswered(false);
    setSelectedOption('');

    if (quizIndex < questions.length - 1) {
      setQuizIndex(qi => qi + 1);
    } else {
      // Finish - calculate score
      const finalScore = newAnswers.filter(a => a.isCorrect).length;
      setScore(finalScore);

      // Try to submit to server for XP/coins
      if (token) {
        setSubmitLoading(true);
        try {
          const serverAnswers = newAnswers.map(a => ({ id: a.id, selectedOption: a.selectedOption }));
          const res = await axios.post('/api/game/quiz/submit', { answers: serverAnswers }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.data.success) {
            setXpReward(res.data.xpReward || 0);
            setCoinsReward(res.data.coinsReward || 0);
            dispatch(updateGamification({
              xp: res.data.currentXP,
              coins: res.data.currentCoins,
              badge: res.data.currentBadge
            }));
          }
        } catch {
          // Fallback local rewards
          const xp = finalScore * 10;
          const coins = finalScore * 5;
          setXpReward(xp);
          setCoinsReward(coins);
        } finally {
          setSubmitLoading(false);
        }
      } else {
        setXpReward(finalScore * 10);
        setCoinsReward(finalScore * 5);
      }

      // Check achievements
      const earned = ACHIEVEMENTS.filter(a => a.condition(finalScore, questions.length));
      setEarnedAchievements(earned);
      setFinished(true);
    }
  };

  const handleRestart = () => {
    setQuizStarted(false);
    setFinished(false);
    setAnswers([]);
    setQuizIndex(0);
    setSelectedOption('');
    setScore(0);
  };

  const getOptionStyle = (opt) => {
    if (!isAnswered) {
      return selectedOption === opt
        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
        : 'bg-slate-900/30 border-slate-800 text-slate-300 hover:border-slate-600 hover:bg-slate-900/50';
    }
    const current = questions[quizIndex];
    if (opt === current.answer) return 'bg-emerald-500/20 border-emerald-500 text-emerald-300';
    if (opt === selectedOption && opt !== current.answer) return 'bg-red-500/20 border-red-500 text-red-300';
    return 'bg-slate-900/30 border-slate-800 text-slate-500 opacity-50';
  };

  const getOptionIcon = (opt) => {
    if (!isAnswered) return null;
    const current = questions[quizIndex];
    if (opt === current.answer) return <Check size={14} className="text-emerald-400 shrink-0" />;
    if (opt === selectedOption && opt !== current.answer) return <span className="text-red-400 text-sm shrink-0">✗</span>;
    return null;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Trophy className="text-amber-400" size={26} /> Agriculture Quiz Challenge
        </h1>
        <p className="text-slate-400 text-xs mt-1">Test your farming knowledge • Earn XP & Coins • Climb the leaderboard</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900/50 border border-slate-800 rounded-xl p-1 w-fit">
        {[['quiz', '🧠 Quiz'], ['leaderboard', '🏆 Leaderboard'], ['achievements', '🏅 Achievements']].map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── QUIZ TAB ── */}
      {activeTab === 'quiz' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">

            {/* Not Started: Config Screen */}
            {!quizStarted && !finished && (
              <div className="glass border border-slate-800 rounded-2xl p-8 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white">Configure Your Quiz</h3>
                  <p className="text-xs text-slate-400">Choose category and difficulty, then start!</p>
                </div>

                {/* Category Select */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">📚 Category</p>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                      <button key={cat} onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          selectedCategory === cat
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600'
                        }`}>{cat}</button>
                    ))}
                  </div>
                </div>

                {/* Difficulty Select */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">⚡ Difficulty</p>
                  <div className="flex gap-2">
                    {DIFFICULTIES.map(diff => (
                      <button key={diff} onClick={() => setSelectedDifficulty(diff)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
                          selectedDifficulty === diff
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600'
                        }`}>{diff}</button>
                    ))}
                  </div>
                </div>

                {/* Question count */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-xs text-slate-400">
                  📊 Available questions:
                  <span className="text-white font-bold ml-2">
                    {(() => {
                      let f = QUESTION_BANK;
                      if (selectedCategory !== 'All') f = f.filter(q => q.category === selectedCategory);
                      if (selectedDifficulty !== 'All') f = f.filter(q => q.difficulty === selectedDifficulty);
                      return `${Math.min(10, f.length)} questions`;
                    })()}
                  </span>
                  <span className="ml-2 text-slate-500">• 30 seconds per question • 10 XP per correct answer</span>
                </div>

                {!token && (
                  <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs p-3 rounded-xl">
                    <AlertTriangle size={14} /> Log in to save your score and earn XP rewards!
                  </div>
                )}

                <button onClick={filterAndStartQuiz}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2">
                  <Zap size={16} /> Start Quiz Challenge
                </button>
              </div>
            )}

            {/* Active Quiz */}
            {quizStarted && !finished && questions.length > 0 && (
              <div className="glass border border-slate-800 rounded-2xl overflow-hidden">
                {/* Progress Bar */}
                <div className="h-1.5 bg-slate-900">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${((quizIndex) / questions.length) * 100}%` }}
                  />
                </div>

                <div className="p-6 space-y-6">
                  {/* Question Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-500 font-bold">
                        {quizIndex + 1} / {questions.length}
                      </span>
                      <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${DIFFICULTY_COLORS[questions[quizIndex].difficulty]}`}>
                        {questions[quizIndex].difficulty}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                        {questions[quizIndex].category}
                      </span>
                    </div>
                    {/* Timer */}
                    <div className={`flex items-center gap-1.5 font-bold text-sm ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-slate-300'}`}>
                      <Clock size={14} />
                      {timeLeft}s
                    </div>
                  </div>

                  {/* Timer bar */}
                  <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${timeLeft <= 10 ? 'bg-red-500' : 'bg-emerald-500'}`}
                      style={{ width: `${(timeLeft / 30) * 100}%` }}
                    />
                  </div>

                  {/* Question */}
                  <h3 className="text-base font-bold text-white leading-relaxed">
                    {questions[quizIndex].question}
                  </h3>

                  {/* Options */}
                  <div className="space-y-3">
                    {questions[quizIndex].options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => handleAnswer(opt)}
                        disabled={isAnswered}
                        className={`w-full text-left p-4 rounded-xl text-xs font-semibold border transition-all flex items-center justify-between gap-3 ${getOptionStyle(opt)}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="h-6 w-6 rounded-full border border-current flex items-center justify-center text-[10px] font-bold shrink-0">
                            {['A', 'B', 'C', 'D'][i]}
                          </span>
                          <span>{opt}</span>
                        </div>
                        {getOptionIcon(opt)}
                      </button>
                    ))}
                  </div>

                  {/* Explanation */}
                  {showExplanation && (
                    <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
                      selectedOption === questions[quizIndex].answer
                        ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                        : 'bg-red-950/30 border-red-500/30 text-red-200'
                    }`}>
                      <p className="font-bold mb-1">
                        {selectedOption === questions[quizIndex].answer ? '✅ Correct!' : `❌ Incorrect. Answer: ${questions[quizIndex].answer}`}
                      </p>
                      <p className="text-slate-300 leading-relaxed">{questions[quizIndex].explanation}</p>
                    </div>
                  )}

                  {/* Next Button */}
                  <button
                    onClick={handleNext}
                    disabled={!isAnswered || submitLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold py-3 rounded-xl text-xs transition-all shadow flex items-center justify-center gap-2 uppercase tracking-wider"
                  >
                    {submitLoading ? (
                      <><RefreshCw size={13} className="animate-spin" /> Calculating...</>
                    ) : quizIndex === questions.length - 1 ? (
                      <>Finish Quiz <Trophy size={13} /></>
                    ) : (
                      <>Next Question <ArrowRight size={13} /></>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Results Screen */}
            {finished && (
              <div className="glass border border-slate-800 rounded-2xl p-8 space-y-6 text-center animate-fade-in">
                <div className="space-y-3">
                  <div className={`h-20 w-20 mx-auto rounded-full flex items-center justify-center text-4xl border-4 ${
                    score / questions.length >= 0.8
                      ? 'bg-emerald-500/10 border-emerald-500'
                      : score / questions.length >= 0.5
                      ? 'bg-amber-500/10 border-amber-500'
                      : 'bg-red-500/10 border-red-500'
                  }`}>
                    {score / questions.length >= 0.8 ? '🏆' : score / questions.length >= 0.5 ? '⭐' : '💪'}
                  </div>
                  <h3 className="text-xl font-extrabold text-white">
                    {score / questions.length >= 0.8 ? 'Excellent!' : score / questions.length >= 0.5 ? 'Good Job!' : 'Keep Practicing!'}
                  </h3>
                  <p className="text-slate-400 text-sm">
                    You scored <span className="text-emerald-400 font-extrabold text-lg">{score}</span> out of{' '}
                    <span className="text-white font-bold">{questions.length}</span>
                  </p>
                </div>

                {/* Rewards */}
                <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                    <p className="text-2xl font-extrabold text-amber-400">+{coinsReward}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">🪙 Agri Coins</p>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                    <p className="text-2xl font-extrabold text-emerald-400">+{xpReward}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">⚡ XP Points</p>
                  </div>
                </div>

                {/* Achievements earned */}
                {earnedAchievements.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">🏅 Achievements Unlocked</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {earnedAchievements.map(a => (
                        <div key={a.id} className="bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 flex items-center gap-2">
                          <span className="text-lg">{a.icon}</span>
                          <div className="text-left">
                            <p className="text-xs font-bold text-white">{a.label}</p>
                            <p className="text-[9px] text-slate-500">{a.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Answer Review */}
                <div className="text-left space-y-2 max-h-48 overflow-y-auto">
                  <p className="text-[10px] text-slate-400 uppercase font-bold text-center">Answer Review</p>
                  {answers.map((a, i) => {
                    const q = questions.find(q => q.id === a.id);
                    return q ? (
                      <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-[11px] ${
                        a.isCorrect ? 'bg-emerald-950/20 border-emerald-500/20' : 'bg-red-950/20 border-red-500/20'
                      }`}>
                        <span className="text-slate-300 truncate max-w-[240px]">{q.question}</span>
                        <span className={a.isCorrect ? 'text-emerald-400' : 'text-red-400'}>{a.isCorrect ? '✓' : '✗'}</span>
                      </div>
                    ) : null;
                  })}
                </div>

                <div className="flex gap-3">
                  <button onClick={handleRestart}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm transition-all">
                    🔄 Play Again
                  </button>
                  <button onClick={() => setActiveTab('leaderboard')}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 rounded-xl text-sm transition-all">
                    🏆 Leaderboard
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Score tracker during quiz */}
            {quizStarted && !finished && (
              <div className="glass border border-slate-800 rounded-2xl p-5 space-y-3">
                <p className="text-xs font-bold text-white uppercase tracking-wider">📊 Progress</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Question</span>
                    <span className="font-bold text-white">{quizIndex + 1} / {questions.length}</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${((quizIndex + 1) / questions.length) * 100}%` }} />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-400 font-bold">✓ {answers.filter(a => a.isCorrect).length} Correct</span>
                    <span className="text-red-400 font-bold">✗ {answers.filter(a => !a.isCorrect).length} Wrong</span>
                  </div>
                </div>
              </div>
            )}

            {/* User Stats */}
            {token && user && (
              <div className="glass border border-slate-800 rounded-2xl p-5 space-y-4">
                <p className="text-xs font-bold text-white uppercase tracking-wider">👤 Your Stats</p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Badge</span>
                    <span className="font-bold text-emerald-400">{user.badge}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total XP</span>
                    <span className="font-bold text-white">{user.xp} XP</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Agri Coins</span>
                    <span className="font-bold text-amber-400">🪙 {user.coins}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Category Info */}
            <div className="glass border border-slate-800 rounded-2xl p-5 space-y-3">
              <p className="text-xs font-bold text-white uppercase tracking-wider">📚 Categories</p>
              <div className="space-y-1.5">
                {CATEGORIES.filter(c => c !== 'All').map(cat => (
                  <button key={cat} onClick={() => { setSelectedCategory(cat); if (!quizStarted) {} }}
                    className="w-full flex items-center justify-between text-[11px] text-slate-400 hover:text-white transition-colors py-1">
                    <span>{cat}</span>
                    <span className="text-slate-600">{QUESTION_BANK.filter(q => q.category === cat).length} Qs</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── LEADERBOARD TAB ── */}
      {activeTab === 'leaderboard' && (
        <div className="glass border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Crown size={18} className="text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Top Farmers Leaderboard</h3>
          </div>

          {leaderboardLoading ? (
            <div className="text-center py-12">
              <RefreshCw size={24} className="text-emerald-500 animate-spin mx-auto mb-3" />
              <p className="text-slate-500 text-xs">Loading rankings...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <Trophy size={32} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No rankings yet. Be the first!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((item, index) => (
                <div key={item._id}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                    item._id === user?._id
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                  }`}>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-extrabold shrink-0 ${
                    index === 0 ? 'bg-amber-500/20 text-amber-400' :
                    index === 1 ? 'bg-slate-300/20 text-slate-300' :
                    index === 2 ? 'bg-amber-700/20 text-amber-600' :
                    'bg-slate-800 text-slate-500'
                  }`}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">{item.name}</p>
                    <p className="text-[10px] text-emerald-400 font-semibold">{item.badge}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-white">{item.xp} XP</p>
                    <p className="text-[10px] text-amber-400 font-semibold">🪙 {item.coins}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ACHIEVEMENTS TAB ── */}
      {activeTab === 'achievements' && (
        <div className="glass border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Medal size={18} className="text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Achievements</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ACHIEVEMENTS.map(achievement => {
              const earned = earnedAchievements.find(a => a.id === achievement.id);
              return (
                <div key={achievement.id}
                  className={`p-5 rounded-xl border space-y-3 transition-all ${
                    earned
                      ? 'bg-emerald-950/30 border-emerald-500/30'
                      : 'bg-slate-900/30 border-slate-800 opacity-60'
                  }`}>
                  <span className="text-3xl block">{achievement.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-white">{achievement.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{achievement.desc}</p>
                  </div>
                  {earned ? (
                    <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1"><Check size={10} /> Unlocked!</span>
                  ) : (
                    <span className="text-[10px] text-slate-600 font-semibold">Complete a quiz to unlock</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Quiz;
