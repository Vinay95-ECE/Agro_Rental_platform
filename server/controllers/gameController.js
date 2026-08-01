const User = require('../models/User');
const QUIZ_QUESTIONS = require('../data/quizQuestions');

// ─── Role-aware badge computation ────────────────────────────────────────────
const computeBadge = (xp, role) => {
  const suffix = role === 'Tool Owner' ? 'Owner' : role === 'Shopkeeper' ? 'Merchant' : role === 'Admin' ? 'Admin' : 'Farmer';
  if (role === 'Admin') return 'Super Admin';
  if (xp >= 1000) return `Master ${suffix}`;
  if (xp >= 500)  return `Expert ${suffix}`;
  if (xp >= 100)  return `Skilled ${suffix}`;
  return `Beginner ${suffix}`;
};

// Fisher-Yates shuffle
const shuffleArray = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// @desc  Get quiz questions with filters
// @route GET /api/game/quiz
// @access Private
const getDailyQuiz = async (req, res, next) => {
  try {
    const { category, difficulty, count } = req.query;
    const questionCount = Math.min(parseInt(count) || 10, 30);

    let pool = [...QUIZ_QUESTIONS];

    if (category && category !== 'All') {
      pool = pool.filter(q => q.category === category);
    }
    if (difficulty && difficulty !== 'All') {
      pool = pool.filter(q => q.difficulty === difficulty);
    }

    if (pool.length === 0) {
      pool = [...QUIZ_QUESTIONS];
    }

    const selected = shuffleArray(pool).slice(0, questionCount);

    // Strip answers before sending to client
    const secure = selected.map(q => ({
      id: q.id,
      question: q.question,
      options: shuffleArray(q.options),
      category: q.category,
      difficulty: q.difficulty
    }));

    res.json({
      success: true,
      total: QUIZ_QUESTIONS.length,
      count: secure.length,
      questions: secure
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Submit quiz answers and get XP/coins
// @route POST /api/game/quiz/submit
// @access Private
const submitQuizResult = async (req, res, next) => {
  const { answers } = req.body; // [{ id, selectedOption }]

  try {
    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      res.status(400);
      return next(new Error('Answers array is required.'));
    }

    let score = 0;
    const results = answers.map(ans => {
      const original = QUIZ_QUESTIONS.find(q => q.id === ans.id);
      if (!original) return { id: ans.id, correct: false, correctAnswer: null, explanation: null };
      const correct = original.answer === ans.selectedOption;
      if (correct) score++;
      return {
        id: ans.id,
        correct,
        correctAnswer: original.answer,
        explanation: original.explanation,
        category: original.category,
        difficulty: original.difficulty
      };
    });

    const xpReward = score * 10;
    const coinsReward = score * 5;

    const user = await User.findById(req.user._id);
    user.xp += xpReward;
    user.coins += coinsReward;

    // Badge upgrades (role-aware)
    user.badge = computeBadge(user.xp, user.role);
    await user.save();

    res.json({
      success: true,
      score,
      totalQuestions: answers.length,
      percentage: Math.round((score / answers.length) * 100),
      xpReward,
      coinsReward,
      currentXP: user.xp,
      currentCoins: user.coins,
      currentBadge: user.badge,
      results
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Get leaderboard
// @route GET /api/game/leaderboard
// @access Public
const getLeaderboard = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const users = await User.find({ isActive: true })
      .select('name role xp coins badge avatar village')
      .sort({ xp: -1 })
      .limit(limit);

    res.json({ success: true, leaderboard: users });
  } catch (error) {
    next(error);
  }
};

// @desc  Get quiz question categories and stats
// @route GET /api/game/quiz/stats
// @access Public
const getQuizStats = async (req, res, next) => {
  try {
    const categories = [...new Set(QUIZ_QUESTIONS.map(q => q.category))];
    const difficulties = ['Easy', 'Medium', 'Hard'];

    const stats = categories.map(cat => ({
      category: cat,
      total: QUIZ_QUESTIONS.filter(q => q.category === cat).length,
      easy: QUIZ_QUESTIONS.filter(q => q.category === cat && q.difficulty === 'Easy').length,
      medium: QUIZ_QUESTIONS.filter(q => q.category === cat && q.difficulty === 'Medium').length,
      hard: QUIZ_QUESTIONS.filter(q => q.category === cat && q.difficulty === 'Hard').length
    }));

    res.json({
      success: true,
      totalQuestions: QUIZ_QUESTIONS.length,
      categories,
      difficulties,
      stats
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDailyQuiz, submitQuizResult, getLeaderboard, getQuizStats };
