const express = require('express');
const router = express.Router();
const {
  registerUser, loginUser, refreshToken, getUserProfile, updateProfile,
  uploadAvatar, forgotPassword, resetPassword, changePassword,
  logoutUser, getUsers, getLoginActivity
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/refresh', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/logout', logoutUser); // Public: allow logout even with expired token

router.use(protect); // All routes below require auth
router.get('/profile', getUserProfile);
router.put('/profile', updateProfile);
router.post('/avatar', uploadAvatar);
router.put('/change-password', changePassword);
router.get('/users', getUsers);
router.get('/login-activity', getLoginActivity);


module.exports = router;
