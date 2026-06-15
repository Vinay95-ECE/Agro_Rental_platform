const express = require('express');
const router = express.Router();
const { predictCropPrice, diagnoseDisease, getAIAdvice, getAIRecommendations } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

router.post('/predict-price', predictCropPrice);
router.post('/diagnose-disease', protect, diagnoseDisease);
router.post('/chat-advisor', getAIAdvice);
router.get('/recommendations', protect, getAIRecommendations);

module.exports = router;
