const express = require('express');
const router = express.Router();
const { createProduct, getAllProducts, createOrder, verifyPayment } = require('../controllers/productController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, authorize('Shopkeeper', 'Admin'), createProduct)
  .get(getAllProducts);

router.post('/order', protect, createOrder);
router.post('/order/verify', protect, verifyPayment);

module.exports = router;
