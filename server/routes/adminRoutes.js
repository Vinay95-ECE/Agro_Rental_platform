const express = require('express');
const router = express.Router();
const {
  adminLogin,
  getDashboardStats,
  getAllUsers,
  getUserDetail,
  suspendUser,
  changeUserRole,
  adminResetPassword,
  forceLogout,
  deleteUser,
  getAllKYC,
  reviewKYC,
  getAllToolsAdmin,
  updateToolAdmin,
  deleteToolAdmin,
  getAllProductsAdmin,
  updateProductAdmin,
  deleteProductAdmin,
  getAllCropsAdmin,
  deleteCropAdmin,
  getAllBookings,
  getAllPayments,
  getRevenueAnalytics,
  getUserAnalytics,
  sendBroadcastNotification,
  getAdminLoginHistory
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

// ─── Public Admin Auth Route (No protect middleware) ──────────────────────────
router.post('/auth/login', adminLogin);

// ─── All routes below: JWT + Admin-only RBAC ─────────────────────────────────
router.use(protect, authorize('Admin'));

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/stats', getDashboardStats);

// ─── User Management ──────────────────────────────────────────────────────────
router.get('/users', getAllUsers);
router.get('/users/:id', getUserDetail);
router.put('/users/:id/suspend', suspendUser);
router.put('/users/:id/role', changeUserRole);
router.put('/users/:id/reset-password', adminResetPassword);
router.put('/users/:id/force-logout', forceLogout);
router.delete('/users/:id', deleteUser);

// ─── KYC Management ───────────────────────────────────────────────────────────
router.get('/kyc', getAllKYC);
router.put('/kyc/:id', reviewKYC);

// ─── Tool Management ──────────────────────────────────────────────────────────
router.get('/tools', getAllToolsAdmin);
router.put('/tools/:id', updateToolAdmin);
router.delete('/tools/:id', deleteToolAdmin);

// ─── Product Management ───────────────────────────────────────────────────────
router.get('/products', getAllProductsAdmin);
router.put('/products/:id', updateProductAdmin);
router.delete('/products/:id', deleteProductAdmin);

// ─── Crop Management ──────────────────────────────────────────────────────────
router.get('/crops', getAllCropsAdmin);
router.delete('/crops/:id', deleteCropAdmin);

// ─── Bookings & Payments ──────────────────────────────────────────────────────
router.get('/bookings', getAllBookings);
router.get('/payments', getAllPayments);

// ─── Analytics ────────────────────────────────────────────────────────────────
router.get('/analytics/revenue', getRevenueAnalytics);
router.get('/analytics/users', getUserAnalytics);

// ─── Notifications ────────────────────────────────────────────────────────────
router.post('/notify', sendBroadcastNotification);

// ─── Security / Audit ────────────────────────────────────────────────────────
router.get('/login-history', getAdminLoginHistory);

module.exports = router;
