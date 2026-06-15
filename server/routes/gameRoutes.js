const express = require('express');
const router = express.Router();
const { getDailyQuiz, submitQuizResult, getLeaderboard } = require('../controllers/gameController');
const { protect } = require('../middleware/authMiddleware');

router.get('/quiz', protect, getDailyQuiz);
router.post('/quiz/submit', protect, submitQuizResult);
router.get('/leaderboard', getLeaderboard);

module.exports = router;
