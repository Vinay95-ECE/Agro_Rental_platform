const Booking = require('../models/Booking');
const Tool = require('../models/Tool');
const User = require('../models/User');
const Notification = require('../models/Notification');

// ─── Helper: compute badge from XP ──────────────────────────────────────────
const computeBadge = (xp, role) => {
  const suffix = role === 'Tool Owner' ? 'Owner' : role === 'Shopkeeper' ? 'Merchant' : 'Farmer';
  if (xp >= 1000) return `Master ${suffix}`;
  if (xp >= 500)  return `Expert ${suffix}`;
  if (xp >= 100)  return `Skilled ${suffix}`;
  return `Beginner ${suffix}`;
};

// @desc    Create a new booking request
// @route   POST /api/bookings
// @access  Private (Farmer/Buyer)
const createBooking = async (req, res, next) => {
  const { toolId, startDate, endDate, totalAmount, notes } = req.body;

  try {
    const tool = await Tool.findById(toolId);
    if (!tool) {
      res.status(404);
      return next(new Error('Tool not found'));
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      res.status(400);
      return next(new Error('End date must be after start date'));
    }

    // Atomic overlapping check to prevent double booking
    const overlappingBooking = await Booking.findOne({
      tool: toolId,
      status: { $in: ['Pending', 'Approved'] },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } }
      ]
    });

    if (overlappingBooking) {
      res.status(400);
      return next(new Error('This equipment is already booked or has a pending request during the selected dates.'));
    }

    const booking = await Booking.create({
      tool: toolId,
      farmer: req.user._id,
      startDate: start,
      endDate: end,
      totalAmount,
      notes
    });

    // Notify Tool Owner (via global Socket.io emitter if connected)
    const notification = await Notification.create({
      user: tool.owner,
      title: 'New Rental Request',
      message: `${req.user.name} has requested to rent ${tool.name}.`,
      type: 'Booking'
    });

    if (global.io) {
      global.io.emit(`notify_${tool.owner}`, notification);
    }

    res.status(201).json({
      success: true,
      message: 'Rental booking requested successfully',
      booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update booking status (Approve/Reject/Cancel/Complete)
// @route   PUT /api/bookings/:id/status
// @access  Private
const updateBookingStatus = async (req, res, next) => {
  const { status } = req.body;
  const { id } = req.params;

  try {
    const booking = await Booking.findById(id).populate('tool');
    if (!booking) {
      res.status(404);
      return next(new Error('Booking request not found'));
    }

    const isOwner = booking.tool.owner.toString() === req.user._id.toString();
    const isFarmer = booking.farmer.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'Admin';

    if (!isOwner && !isFarmer && !isAdmin) {
      res.status(401);
      return next(new Error('Not authorized to modify this booking'));
    }

    // Owners can approve/reject/complete. Farmers can cancel.
    if (status === 'Cancelled' && !isFarmer && !isAdmin) {
      res.status(400);
      return next(new Error('Only the booking farmer can cancel this request.'));
    }

    if (['Approved', 'Rejected', 'Completed'].includes(status) && !isOwner && !isAdmin) {
      res.status(400);
      return next(new Error('Only the equipment owner can approve, reject, or complete this request.'));
    }

    booking.status = status;

    // Only mark completed as paid; payment flows through Razorpay
    if (status === 'Completed') {
      booking.paymentStatus = 'Paid';
    }

    await booking.save();

    // ── Gamification: Award XP + Coins ─────────────────────────────────────
    try {
      if (status === 'Approved') {
        // Farmer gets XP + coins when their booking is approved
        const farmer = await User.findById(booking.farmer);
        if (farmer) {
          farmer.xp = (farmer.xp || 0) + 50;
          farmer.coins = (farmer.coins || 0) + 10;
          farmer.badge = computeBadge(farmer.xp, farmer.role);
          await farmer.save({ validateBeforeSave: false });
        }
      }
      if (status === 'Completed') {
        // Tool Owner earns XP + coins proportional to booking amount
        const populatedTool = await Tool.findById(booking.tool._id || booking.tool);
        if (populatedTool) {
          const owner = await User.findById(populatedTool.owner);
          if (owner) {
            const coinsEarned = Math.max(5, Math.round((booking.totalAmount || 0) / 100));
            owner.xp = (owner.xp || 0) + 30 + coinsEarned;
            owner.coins = (owner.coins || 0) + coinsEarned;
            owner.badge = computeBadge(owner.xp, owner.role);
            await owner.save({ validateBeforeSave: false });
          }
        }
      }
    } catch (gamificationErr) {
      console.error('Gamification update failed (non-critical):', gamificationErr.message);
    }

    // Notify Farmer of status change
    const notification = await Notification.create({
      user: booking.farmer,
      title: `Booking Request ${status}`,
      message: `Your booking for ${booking.tool.name} was ${status.toLowerCase()}.`,
      type: 'Booking'
    });

    if (global.io) {
      global.io.emit(`notify_${booking.farmer}`, notification);
    }

    res.json({
      success: true,
      message: `Booking status updated to ${status}`,
      booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user bookings (Farmer history)
// @route   GET /api/bookings/my-rentals
// @access  Private
const getUserBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ farmer: req.user._id }).populate('tool');
    res.json({
      success: true,
      bookings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get bookings requests (Tool Owner list)
// @route   GET /api/bookings/requests
// @access  Private
const getOwnerBookings = async (req, res, next) => {
  try {
    // Find tools owned by user
    const tools = await Tool.find({ owner: req.user._id });
    const toolIds = tools.map(t => t._id);

    const bookings = await Booking.find({ tool: { $in: toolIds } })
      .populate('tool')
      .populate('farmer', 'name email phone');

    res.json({
      success: true,
      bookings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get booking dates for a tool calendar
// @route   GET /api/bookings/calendar/:toolId
// @access  Public
const getToolBookingsCalendar = async (req, res, next) => {
  try {
    const bookings = await Booking.find({
      tool: req.params.toolId,
      status: { $in: ['Pending', 'Approved'] }
    }).select('startDate endDate status');

    res.json({
      success: true,
      bookings
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBooking,
  updateBookingStatus,
  getUserBookings,
  getOwnerBookings,
  getToolBookingsCalendar
};
