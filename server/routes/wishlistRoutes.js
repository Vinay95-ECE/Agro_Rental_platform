const express = require('express');
const router = express.Router();
const { getWishlist, toggleWishlistItem } = require('../controllers/wishlistController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Secure all wishlist endpoints

router.route('/')
  .get(getWishlist);

router.post('/toggle', toggleWishlistItem);

module.exports = router;
