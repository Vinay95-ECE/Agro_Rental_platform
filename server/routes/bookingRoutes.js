const express = require('express');
const router = express.Router();
const {
  createBooking,
  updateBookingStatus,
  getUserBookings,
  getOwnerBookings,
  getToolBookingsCalendar
} = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createBooking);
router.put('/:id/status', protect, updateBookingStatus);
router.get('/my-rentals', protect, getUserBookings);
router.get('/requests', protect, getOwnerBookings);
router.get('/calendar/:toolId', getToolBookingsCalendar);

module.exports = router;
