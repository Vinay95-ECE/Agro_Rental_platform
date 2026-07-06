const express = require('express');
const router = express.Router();
const { createCrop, getAllCrops, getMyCrops, getCropById, updateCrop, purchaseCrop, deleteCrop } = require('../controllers/cropController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(getAllCrops)
  .post(protect, authorize('Farmer', 'Admin'), createCrop);

router.get('/my-crops', protect, getMyCrops);

router.route('/:id')
  .get(getCropById)
  .put(protect, updateCrop)
  .delete(protect, deleteCrop);

router.post('/:id/purchase', protect, purchaseCrop);

module.exports = router;
