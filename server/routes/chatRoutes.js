const express = require('express');
const router = express.Router();
const { getChatHistory, createChatMessage } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, createChatMessage);

router.route('/:userId')
  .get(protect, getChatHistory);

module.exports = router;
