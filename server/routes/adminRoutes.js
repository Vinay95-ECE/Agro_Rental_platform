const express = require('express');
const router = express.Router();
const {
  getDashboardStats, getAllUsers, suspendUser, deleteUser,
  getRevenueAnalytics, getUserAnalytics, getAllBookings,
  getAllToolsAdmin, deleteToolAdmin, deleteCropAdmin,
  sendBroadcastNotification
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All admin routes are protected and Admin-only
router.use(protect, authorize('Admin'));

router.get('/stats', getDashboardStats);
router.get('/users', getAllUsers);
router.put('/users/:id/suspend', suspendUser);
router.delete('/users/:id', deleteUser);
router.get('/analytics/revenue', getRevenueAnalytics);
router.get('/analytics/users', getUserAnalytics);
router.get('/bookings', getAllBookings);
router.get('/tools', getAllToolsAdmin);
router.delete('/tools/:id', deleteToolAdmin);
router.delete('/crops/:id', deleteCropAdmin);
router.post('/notify', sendBroadcastNotification);

module.exports = router;
