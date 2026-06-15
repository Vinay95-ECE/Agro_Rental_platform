const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUserProfile,
  forgotPassword,
  resetPassword,
  changePassword,
  verifyEmail,
  verifyMobileOTP,
  logoutUser,
  getUsers
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.put('/change-password', protect, changePassword);
router.post('/verify-email', verifyEmail);
router.post('/verify-mobile', protect, verifyMobileOTP);
router.get('/logout', logoutUser);
router.get('/users', protect, getUsers);

module.exports = router;

