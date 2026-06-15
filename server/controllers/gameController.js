const User = require('../models/User');

// Daily Farming Quiz Library
const quizQuestions = [
  {
    id: 1,
    question: 'Which nutrient is primarily responsible for leaf growth and green color in crops?',
    options: ['Nitrogen', 'Phosphorus', 'Potassium', 'Calcium'],
    answer: 'Nitrogen'
  },
  {
    id: 2,
    question: 'What is the ideal pH range for growing wheat crops?',
    options: ['4.0 - 5.0', '6.0 - 7.0', '8.0 - 9.0', '5.0 - 5.5'],
    answer: '6.0 - 7.0'
  },
  {
    id: 3,
    question: 'Which irrigation technique is best for water conservation in dry regions?',
    options: ['Flood Irrigation', 'Furrow Irrigation', 'Drip Irrigation', 'Sprinkler Irrigation'],
    answer: 'Drip Irrigation'
  },
  {
    id: 4,
    question: 'What type of crop is Soybean?',
    options: ['Rabi', 'Kharif', 'Zaid', 'Cash crop'],
    answer: 'Kharif'
  },
  {
    id: 5,
    question: 'Which crop disease is commonly known as the "Cancer of Wheat"?',
    options: ['Powdery Mildew', 'Leaf Rust', 'Karnal Bunt', 'Loose Smut'],
    answer: 'Karnal Bunt'
  }
];

// @desc    Get daily quiz questions
// @route   GET /api/game/quiz
// @access  Private
const getDailyQuiz = async (req, res, next) => {
  try {
    // Return questions excluding direct answers for frontend integrity
    const secureQuestions = quizQuestions.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options
    }));

    res.json({
      success: true,
      questions: secureQuestions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Evaluate quiz answers, award XP & coins, update Badges
// @route   POST /api/game/quiz/submit
// @access  Private
const submitQuizResult = async (req, res, next) => {
  const { answers } = req.body; // Array of { id, selectedOption }

  try {
    if (!answers || !Array.isArray(answers)) {
      res.status(400);
      return next(new Error('Answers array is required'));
    }

    let score = 0;
    answers.forEach(ans => {
      const original = quizQuestions.find(q => q.id === ans.id);
      if (original && original.answer === ans.selectedOption) {
        score++;
      }
    });

    // Reward math: 10 XP per correct answer, 5 Agri Coins per correct answer
    const xpReward = score * 10;
    const coinsReward = score * 5;

    // Update user stats
    const user = await User.findById(req.user._id);
    user.xp += xpReward;
    user.coins += coinsReward;

    // Check for badge upgrades
    let newBadge = user.badge;
    if (user.xp >= 1000) {
      newBadge = 'Master Farmer';
    } else if (user.xp >= 500) {
      newBadge = 'Expert Farmer';
    } else if (user.xp >= 100) {
      newBadge = 'Skilled Farmer';
    }
    user.badge = newBadge;
    await user.save();

    res.json({
      success: true,
      score,
      totalQuestions: quizQuestions.length,
      xpReward,
      coinsReward,
      currentXP: user.xp,
      currentCoins: user.coins,
      currentBadge: user.badge
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user ranking leaderboard
// @route   GET /api/game/leaderboard
// @access  Public
const getLeaderboard = async (req, res, next) => {
  try {
    // Sort users by highest XP
    const users = await User.find()
      .select('name role xp coins badge avatar')
      .sort({ xp: -1 })
      .limit(10);

    res.json({
      success: true,
      leaderboard: users
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDailyQuiz,
  submitQuizResult,
  getLeaderboard
};
