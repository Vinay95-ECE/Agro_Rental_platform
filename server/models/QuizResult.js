const mongoose = require('mongoose');

const quizResultSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  totalQuestions: {
    type: Number,
    required: true,
    default: 5
  },
  xpEarned: {
    type: Number,
    required: true
  },
  coinsEarned: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('QuizResult', quizResultSchema);
