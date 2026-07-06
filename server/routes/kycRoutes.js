const express = require('express');
const router = express.Router();
const { submitKYC, getKYCStatus, getAllKYCRecords, reviewKYC, getKYCStats } = require('../controllers/kycController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/submit', protect, submitKYC);
router.get('/status', protect, getKYCStatus);
router.get('/records', protect, authorize('Admin'), getAllKYCRecords);
router.get('/stats', protect, authorize('Admin'), getKYCStats);
router.put('/review/:id', protect, authorize('Admin'), reviewKYC);

module.exports = router;
