const express = require('express');
const router = express.Router();
const { getNotifications, markAsRead, markAllAsRead } = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Secure all notification routes

router.route('/')
  .get(getNotifications);

router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);

module.exports = router;
