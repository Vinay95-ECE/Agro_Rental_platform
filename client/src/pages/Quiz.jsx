import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { Award, Trophy, Check, ArrowRight, HelpCircle, Star, Sparkles, AlertTriangle } from 'lucide-react';
import { updateGamification } from '../store/authSlice';

const Quiz = () => {
  const { user, token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  // Quiz game state
  const [questions, setQuestions] = useState([]);
  const [quizLoading, setQuizLoading] = useState(true);
  
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState('');
  const [answers, setAnswers] = useState([]); // Array of { id, selectedOption }
  
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [xpReward, setXpReward] = useState(0);
  const [coinsReward, setCoinsReward] = useState(0);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);

  const fetchQuiz = async () => {
    if (!token) return;
    setQuizLoading(true);
    try {
      const response = await axios.get('/api/game/quiz', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setQuestions(response.data.questions);
      }
    } catch (err) {
      console.error('Error fetching quiz:', err);
    } finally {
      setQuizLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    setLeaderboardLoading(true);
    try {
      const response = await axios.get('/api/game/leaderboard');
      if (response.data.success) {
        setLeaderboard(response.data.leaderboard);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  useEffect(() => {
    fetchQuiz();
    fetchLeaderboard();
  }, [token]);

  const handleNext = async () => {
    if (!selectedOption) return;

    const currentAnswer = {
      id: questions[quizIndex].id,
      selectedOption
    };

    const newAnswers = [...answers, currentAnswer];
    setAnswers(newAnswers);
    setSelectedOption('');

    if (quizIndex < questions.length - 1) {
      setQuizIndex(quizIndex + 1);
    } else {
      // Submit results to backend
      setSubmitLoading(true);
      try {
        const response = await axios.post('/api/game/quiz/submit', {
          answers: newAnswers
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success) {
          setScore(response.data.score);
          setXpReward(response.data.xpReward);
          setCoinsReward(response.data.coinsReward);
          setFinished(true);

          // Update global user state in Redux
          dispatch(updateGamification({
            xp: response.data.currentXP,
            coins: response.data.currentCoins,
            badge: response.data.currentBadge
          }));

          // Refresh leaderboard
          fetchLeaderboard();
        }
      } catch (err) {
        alert('Error submitting quiz answers.');
      } finally {
        setSubmitLoading(false);
      }
    }
  };

  const handleRestart = () => {
    setQuizIndex(0);
    setSelectedOption('');
    setAnswers([]);
    setFinished(false);
    setScore(0);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Daily Agri Quiz & Challenge</h1>
        <p className="text-slate-400 text-xs mt-1">Test your farming acumen, score daily badges, and earn spendable Agri Coins.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Quiz panel */}
        <div className="lg:col-span-2 glass p-8 rounded-3xl border border-slate-800 flex flex-col justify-center min-h-[380px]">
          {!token ? (
            <div className="text-center py-12 space-y-4 max-w-sm mx-auto">
              <AlertTriangle className="text-amber-500 mx-auto" size={40} />
              <div>
                <p className="text-xs font-bold text-white">Authentication Required</p>
                <p className="text-[10px] text-slate-500 mt-1">Please log in to participate in daily quiz challenges and earn rewards.</p>
              </div>
            </div>
          ) : quizLoading ? (
            <div className="text-center text-slate-500">Loading daily quiz...</div>
          ) : questions.length === 0 ? (
            <div className="text-center text-slate-500">No active quiz questions found. Check back tomorrow!</div>
          ) : !finished ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center text-xs text-slate-400 border-b border-slate-850 pb-3 font-semibold uppercase tracking-wider">
                <span>Question {quizIndex + 1} of {questions.length}</span>
                <span className="text-emerald-400">XP multipliers enabled</span>
              </div>
              
              <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed">
                {questions[quizIndex].question}
              </h3>

              <div className="space-y-3">
                {questions[quizIndex].options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedOption(opt)}
                    className={`w-full text-left p-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-between ${
                      selectedOption === opt
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                        : 'bg-slate-950/20 border-slate-850 text-slate-300 hover:border-slate-750 hover:bg-slate-900/10'
                    }`}
                  >
                    <span>{opt}</span>
                    {selectedOption === opt && <Check size={16} className="text-emerald-400" />}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleNext}
                disabled={!selectedOption || submitLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3.5 rounded-xl text-xs transition-colors shadow-md flex items-center justify-center gap-1.5 uppercase tracking-wider"
              >
                {submitLoading ? 'Calculating Rewards...' : quizIndex === questions.length - 1 ? 'Finish Challenge' : 'Next Question'}
                <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div className="text-center space-y-6 py-6 animate-fade-in">
              <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 mx-auto animate-pulse">
                <Trophy size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-white">Daily Quiz Completed!</h3>
                <p className="text-xs text-slate-400">
                  You scored <span className="text-emerald-400 font-bold">{score}</span> out of {questions.length} correct answers.
                </p>
              </div>

              <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-850 inline-block text-left text-xs space-y-3 min-w-[200px]">
                <p className="text-slate-300 flex items-center gap-1 font-semibold">
                  🪙 Coins: <span className="text-amber-400 font-extrabold">+{coinsReward} Agri Coins</span>
                </p>
                <div className="h-[1px] bg-slate-850"></div>
                <p className="text-slate-300 flex items-center gap-1 font-semibold">
                  ⚡ XP Earned: <span className="text-emerald-400 font-extrabold">+{xpReward} XP Points</span>
                </p>
              </div>

              <button
                onClick={handleRestart}
                className="block w-full max-w-xs mx-auto bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-3.5 rounded-xl border border-slate-700 transition-colors uppercase tracking-wider"
              >
                Retake Quiz
              </button>
            </div>
          )}
        </div>

        {/* Ranking Leaderboard */}
        <div className="glass p-6 rounded-3xl border border-slate-800 space-y-4 h-fit">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-850 pb-2 flex items-center gap-1.5">
            <Trophy size={16} className="text-amber-500" /> ranking leaderboard
          </h3>

          {leaderboardLoading ? (
            <div className="text-center py-6 text-slate-500 text-xs">Loading rankings...</div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs">No active rankings reported.</div>
          ) : (
            <div className="divide-y divide-slate-850">
              {leaderboard.map((item, index) => (
                <div key={item._id} className="py-3.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className={`w-5 font-bold ${
                      index === 0 ? 'text-amber-500 text-sm' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-amber-600' : 'text-slate-500'
                    }`}>
                      #{index + 1}
                    </span>
                    <div>
                      <p className="font-bold text-white">{item.name}</p>
                      <p className="text-[10px] text-emerald-400 font-semibold">{item.badge}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-300">{item.xp} XP</p>
                    <p className="text-[9px] text-slate-500 font-medium">{item.coins} Coins</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Quiz;
