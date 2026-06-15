const express = require('express');
const router = express.Router();
const { createCrop, getAllCrops, purchaseCrop } = require('../controllers/cropController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, authorize('Farmer', 'Admin'), createCrop)
  .get(getAllCrops);

router.post('/:id/purchase', protect, purchaseCrop);

module.exports = router;
