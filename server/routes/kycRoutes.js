const express = require('express');
const router = express.Router();
const { submitKYC, getKYCStatus, getAllKYCRecords, reviewKYC } = require('../controllers/kycController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/submit', protect, submitKYC);
router.get('/status', protect, getKYCStatus);
router.get('/records', protect, authorize('Admin'), getAllKYCRecords);
router.put('/review/:id', protect, authorize('Admin'), reviewKYC);

module.exports = router;
