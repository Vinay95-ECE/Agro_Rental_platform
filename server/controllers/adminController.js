const User = require('../models/User');
const Tool = require('../models/Tool');
const Booking = require('../models/Booking');
const Crop = require('../models/Crop');
const Product = require('../models/Product');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const KYCRecord = require('../models/KYCRecord');
const Notification = require('../models/Notification');

// @desc  Get admin dashboard overview stats
// @route GET /api/admin/stats
// @access Admin
const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalUsers, totalTools, totalCrops, totalProducts,
      totalBookings, totalOrders, pendingKYC,
      activeUsers, suspendedUsers,
      totalRevenue
    ] = await Promise.all([
      User.countDocuments({}),
      Tool.countDocuments({}),
      Crop.countDocuments({}),
      Product.countDocuments({}),
      Booking.countDocuments({}),
      Order.countDocuments({}),
      KYCRecord.countDocuments({ status: 'Pending' }),
      User.countDocuments({ isActive: true, isSuspended: false }),
      User.countDocuments({ isSuspended: true }),
      Payment.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }])
    ]);

    const roleDistribution = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const bookingStatusDist = await Booking.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const recentUsers = await User.find()
      .select('name email role createdAt kycStatus')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalTools,
        totalCrops,
        totalProducts,
        totalBookings,
        totalOrders,
        pendingKYC,
        activeUsers,
        suspendedUsers,
        totalRevenue: totalRevenue[0]?.total || 0
      },
      roleDistribution,
      bookingStatusDist,
      recentUsers
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Get all users with pagination
// @route GET /api/admin/users
// @access Admin
const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { search, role, kycStatus } = req.query;

    let filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) filter.role = role;
    if (kycStatus) filter.kycStatus = kycStatus;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password -refreshToken -verificationToken -resetPasswordToken')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(filter)
    ]);

    res.json({
      success: true,
      count: users.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      users
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Suspend / Unsuspend user
// @route PUT /api/admin/users/:id/suspend
// @access Admin
const suspendUser = async (req, res, next) => {
  try {
    const { reason, suspend } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404);
      return next(new Error('User not found.'));
    }

    if (user.role === 'Admin') {
      res.status(400);
      return next(new Error('Cannot suspend another admin.'));
    }

    user.isSuspended = suspend !== false;
    user.suspendReason = suspend !== false ? (reason || 'Suspended by Admin') : '';
    await user.save();

    const notification = await Notification.create({
      user: user._id,
      title: user.isSuspended ? 'Account Suspended' : 'Account Reinstated',
      message: user.isSuspended
        ? `Your account has been suspended. Reason: ${user.suspendReason}`
        : 'Your account has been reinstated. You can login again.',
      type: 'System'
    });

    if (global.io) global.io.emit(`notify_${user._id}`, notification);

    res.json({
      success: true,
      message: `User ${user.isSuspended ? 'suspended' : 'unsuspended'} successfully.`,
      user: user.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Delete user (soft delete)
// @route DELETE /api/admin/users/:id
// @access Admin
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      return next(new Error('User not found.'));
    }
    if (user.role === 'Admin') {
      res.status(400);
      return next(new Error('Cannot delete an admin account.'));
    }

    // Soft delete — mark inactive rather than hard delete
    user.isActive = false;
    user.email = `deleted_${Date.now()}_${user.email}`;
    user.phone = `deleted_${Date.now()}_${user.phone}`;
    await user.save();

    res.json({ success: true, message: 'User account deactivated successfully.' });
  } catch (error) {
    next(error);
  }
};

// @desc  Get revenue analytics (monthly breakdown)
// @route GET /api/admin/analytics/revenue
// @access Admin
const getRevenueAnalytics = async (req, res, next) => {
  try {
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const monthlyRevenue = await Payment.aggregate([
      { $match: { createdAt: { $gte: twelveMonthsAgo }, status: 'Completed' } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formatted = monthlyRevenue.map(m => ({
      month: monthNames[m._id.month - 1],
      year: m._id.year,
      revenue: m.revenue,
      transactions: m.count
    }));

    // Weekly revenue (last 8 weeks)
    const eightWeeksAgo = new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000);
    const weeklyRevenue = await Payment.aggregate([
      { $match: { createdAt: { $gte: eightWeeksAgo }, status: 'Completed' } },
      {
        $group: {
          _id: { week: { $week: '$createdAt' }, year: { $year: '$createdAt' } },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } }
    ]);

    const totalRevenue = monthlyRevenue.reduce((acc, m) => acc + m.revenue, 0);
    const thisMonth = monthlyRevenue.find(m => m._id.month === now.getMonth() + 1 && m._id.year === now.getFullYear());
    const lastMonth = monthlyRevenue.find(m => {
      const lm = now.getMonth() === 0 ? { month: 12, year: now.getFullYear() - 1 } : { month: now.getMonth(), year: now.getFullYear() };
      return m._id.month === lm.month && m._id.year === lm.year;
    });

    const growth = lastMonth?.revenue > 0
      ? (((thisMonth?.revenue || 0) - lastMonth.revenue) / lastMonth.revenue * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      totalRevenue,
      monthlyRevenue: formatted,
      weeklyRevenue,
      thisMonthRevenue: thisMonth?.revenue || 0,
      lastMonthRevenue: lastMonth?.revenue || 0,
      growth: `${growth}%`
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Get user growth analytics
// @route GET /api/admin/analytics/users
// @access Admin
const getUserAnalytics = async (req, res, next) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyUsers = await User.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, role: '$role' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const bookingTrend = await Booking.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({ success: true, monthlyUsers, bookingTrend });
  } catch (error) {
    next(error);
  }
};

// @desc  Get all bookings (admin view)
// @route GET /api/admin/bookings
// @access Admin
const getAllBookings = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { status } = req.query;

    const filter = status ? { status } : {};

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('tool', 'name category')
        .populate('farmer', 'name email phone')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Booking.countDocuments(filter)
    ]);

    res.json({ success: true, count: bookings.length, total, pages: Math.ceil(total / limit), bookings });
  } catch (error) {
    next(error);
  }
};

// @desc  Get all tools (admin view)
// @route GET /api/admin/tools
// @access Admin
const getAllToolsAdmin = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const [tools, total] = await Promise.all([
      Tool.find()
        .populate('owner', 'name email phone kycStatus')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Tool.countDocuments()
    ]);

    res.json({ success: true, count: tools.length, total, tools });
  } catch (error) {
    next(error);
  }
};

// @desc  Delete tool (admin)
// @route DELETE /api/admin/tools/:id
// @access Admin
const deleteToolAdmin = async (req, res, next) => {
  try {
    const tool = await Tool.findByIdAndDelete(req.params.id);
    if (!tool) {
      res.status(404);
      return next(new Error('Tool not found.'));
    }
    res.json({ success: true, message: 'Tool deleted by admin.' });
  } catch (error) {
    next(error);
  }
};

// @desc  Delete crop (admin)
// @route DELETE /api/admin/crops/:id
// @access Admin
const deleteCropAdmin = async (req, res, next) => {
  try {
    const crop = await Crop.findByIdAndDelete(req.params.id);
    if (!crop) {
      res.status(404);
      return next(new Error('Crop not found.'));
    }
    res.json({ success: true, message: 'Crop deleted by admin.' });
  } catch (error) {
    next(error);
  }
};

// @desc  Send platform notification (admin broadcast)
// @route POST /api/admin/notify
// @access Admin
const sendBroadcastNotification = async (req, res, next) => {
  try {
    const { title, message, role } = req.body;
    if (!title || !message) {
      res.status(400);
      return next(new Error('Title and message are required.'));
    }

    const filter = role ? { role, isActive: true } : { isActive: true };
    const users = await User.find(filter).select('_id');

    const notifications = await Notification.insertMany(
      users.map(u => ({ user: u._id, title, message, type: 'System' }))
    );

    if (global.io) {
      users.forEach(u => {
        const notif = notifications.find(n => n.user.toString() === u._id.toString());
        if (notif) global.io.emit(`notify_${u._id}`, notif);
      });
    }

    res.json({
      success: true,
      message: `Notification sent to ${users.length} users.`,
      count: users.length
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getAllUsers,
  suspendUser,
  deleteUser,
  getRevenueAnalytics,
  getUserAnalytics,
  getAllBookings,
  getAllToolsAdmin,
  deleteToolAdmin,
  deleteCropAdmin,
  sendBroadcastNotification
};
