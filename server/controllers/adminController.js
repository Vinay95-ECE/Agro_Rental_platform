const User = require('../models/User');
const Tool = require('../models/Tool');
const Booking = require('../models/Booking');
const Crop = require('../models/Crop');
const Product = require('../models/Product');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const KYCRecord = require('../models/KYCRecord');
const Notification = require('../models/Notification');

// ─── Helper: Pagination ────────────────────────────────────────────────────────
const paginate = (query, page, limit) => query.skip((page - 1) * limit).limit(limit);

// ─── @desc  Admin Login ──────────────────────────────────────────────────────
// @route POST /api/admin/auth/login  @access Public (Admin only endpoint)
const adminLogin = async (req, res, next) => {
  const jwt = require('jsonwebtoken');
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      res.status(400);
      return next(new Error('Email and password are required.'));
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || user.role !== 'Admin') {
      res.status(401);
      return next(new Error('Invalid credentials or insufficient privileges.'));
    }

    if (!user.isActive || user.isSuspended) {
      res.status(403);
      return next(new Error('Admin account is inactive or suspended.'));
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401);
      return next(new Error('Invalid credentials.'));
    }

    // Log IP and user agent
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    user.loginActivity = [{ ip, userAgent, timestamp: new Date() }, ...user.loginActivity].slice(0, 20);
    await user.save({ validateBeforeSave: false });

    const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '8h' });

    res.cookie('adminToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000 // 8 hours
    });

    res.json({
      success: true,
      token: accessToken,
      user: user.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Get admin dashboard overview stats ──────────────────────────────
// @route GET /api/admin/stats  @access Admin
const getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      totalFarmers,
      totalToolOwners,
      totalShopkeepers,
      totalBuyers,
      totalAdmins,
      verifiedUsers,
      pendingKYC,
      approvedKYC,
      rejectedKYC,
      totalTools,
      totalCrops,
      totalProducts,
      totalBookings,
      pendingBookings,
      completedBookings,
      cancelledBookings,
      totalOrders,
      pendingOrders,
      completedOrders,
      todayRevArr,
      monthRevArr,
      totalRevArr,
      suspendedUsers
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'Farmer', isActive: true }),
      User.countDocuments({ role: 'Tool Owner', isActive: true }),
      User.countDocuments({ role: 'Shopkeeper', isActive: true }),
      User.countDocuments({ role: 'Buyer', isActive: true }),
      User.countDocuments({ role: 'Admin' }),
      User.countDocuments({ isVerified: true, isActive: true }),
      KYCRecord.countDocuments({ status: 'Pending' }),
      KYCRecord.countDocuments({ status: 'Approved' }),
      KYCRecord.countDocuments({ status: 'Rejected' }),
      Tool.countDocuments({}),
      Crop.countDocuments({}),
      Product.countDocuments({}),
      Booking.countDocuments({}),
      Booking.countDocuments({ status: 'Pending' }),
      Booking.countDocuments({ status: 'Completed' }),
      Booking.countDocuments({ status: 'Cancelled' }),
      Order.countDocuments({}),
      Order.countDocuments({ status: 'Pending' }),
      Order.countDocuments({ status: 'Delivered' }),
      Payment.aggregate([{ $match: { status: 'Completed', createdAt: { $gte: startOfToday } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.aggregate([{ $match: { status: 'Completed', createdAt: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.aggregate([{ $match: { status: 'Completed' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      User.countDocuments({ isSuspended: true })
    ]);

    const roleDistribution = await User.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const recentUsers = await User.find({ isActive: true })
      .select('name email role createdAt kycStatus avatar isSuspended')
      .sort({ createdAt: -1 })
      .limit(8);

    const recentPayments = await Payment.find({ status: 'Completed' })
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalFarmers,
        totalToolOwners,
        totalShopkeepers,
        totalBuyers,
        totalAdmins,
        verifiedUsers,
        suspendedUsers,
        pendingKYC,
        approvedKYC,
        rejectedKYC,
        totalTools,
        totalCrops,
        totalProducts,
        totalBookings,
        pendingBookings,
        completedBookings,
        cancelledBookings,
        totalOrders,
        pendingOrders,
        completedOrders,
        todayRevenue: todayRevArr[0]?.total || 0,
        monthRevenue: monthRevArr[0]?.total || 0,
        totalRevenue: totalRevArr[0]?.total || 0
      },
      roleDistribution,
      recentUsers,
      recentPayments
    });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Get all users with full filters + pagination ────────────────────
// @route GET /api/admin/users  @access Admin
const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { search, role, kycStatus, isSuspended, sort = '-createdAt' } = req.query;

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
    if (isSuspended !== undefined) filter.isSuspended = isSuspended === 'true';

    const [users, total] = await Promise.all([
      paginate(
        User.find(filter)
          .select('-password -refreshToken -verificationToken -resetPasswordToken')
          .sort(sort),
        page, limit
      ),
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

// ─── @desc  Get single user detail ─────────────────────────────────────────
// @route GET /api/admin/users/:id  @access Admin
const getUserDetail = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -refreshToken -verificationToken -resetPasswordToken');
    if (!user) {
      res.status(404);
      return next(new Error('User not found.'));
    }
    const [kycRecord, bookings, orders, payments] = await Promise.all([
      KYCRecord.findOne({ user: user._id }),
      Booking.find({ farmer: user._id }).populate('tool', 'name').sort('-createdAt').limit(10),
      Order.find({ buyer: user._id }).populate('product', 'name').sort('-createdAt').limit(10),
      Payment.find({ user: user._id }).sort('-createdAt').limit(10)
    ]);
    res.json({ success: true, user, kycRecord, bookings, orders, payments });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Suspend / Unsuspend user ────────────────────────────────────────
// @route PUT /api/admin/users/:id/suspend  @access Admin
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

// ─── @desc  Change user role ─────────────────────────────────────────────────
// @route PUT /api/admin/users/:id/role  @access Admin
const changeUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const allowedRoles = ['Farmer', 'Tool Owner', 'Shopkeeper', 'Buyer'];
    if (!allowedRoles.includes(role)) {
      res.status(400);
      return next(new Error('Invalid role. Allowed: Farmer, Tool Owner, Shopkeeper, Buyer.'));
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      return next(new Error('User not found.'));
    }
    if (user.role === 'Admin') {
      res.status(400);
      return next(new Error('Cannot change Admin role through this endpoint.'));
    }
    user.role = role;
    await user.save();
    res.json({ success: true, message: `User role changed to ${role}.`, user: user.toSafeObject() });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Admin reset user password ───────────────────────────────────────
// @route PUT /api/admin/users/:id/reset-password  @access Admin
const adminResetPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      res.status(400);
      return next(new Error('New password must be at least 8 characters.'));
    }
    const user = await User.findById(req.params.id).select('+password');
    if (!user) {
      res.status(404);
      return next(new Error('User not found.'));
    }
    if (user.role === 'Admin') {
      res.status(400);
      return next(new Error('Cannot reset another admin password through this endpoint.'));
    }
    user.password = newPassword;
    user.refreshToken = undefined;
    await user.save();
    res.json({ success: true, message: 'User password reset successfully.' });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Force logout user (invalidate tokens) ────────────────────────────
// @route PUT /api/admin/users/:id/force-logout  @access Admin
const forceLogout = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      return next(new Error('User not found.'));
    }
    user.refreshToken = undefined;
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, message: 'User has been force logged out.' });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Delete user (soft delete) ────────────────────────────────────────
// @route DELETE /api/admin/users/:id  @access Admin
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
    user.isActive = false;
    user.email = `deleted_${Date.now()}_${user.email}`;
    user.phone = `deleted_${Date.now()}_${user.phone}`;
    await user.save();
    res.json({ success: true, message: 'User account deactivated successfully.' });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Get all KYC records ──────────────────────────────────────────────
// @route GET /api/admin/kyc  @access Admin
const getAllKYC = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { status } = req.query;

    const filter = status ? { status } : {};
    const [records, total] = await Promise.all([
      paginate(
        KYCRecord.find(filter)
          .populate('user', 'name email phone role avatar')
          .sort('-createdAt'),
        page, limit
      ),
      KYCRecord.countDocuments(filter)
    ]);

    res.json({ success: true, count: records.length, total, pages: Math.ceil(total / limit), records });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Approve / Reject KYC ────────────────────────────────────────────
// @route PUT /api/admin/kyc/:id  @access Admin
const reviewKYC = async (req, res, next) => {
  try {
    const { action, reason } = req.body; // action: 'Approved' | 'Rejected' | 'Pending'
    if (!['Approved', 'Rejected', 'Pending'].includes(action)) {
      res.status(400);
      return next(new Error('Invalid action. Use: Approved, Rejected, or Pending.'));
    }

    const record = await KYCRecord.findById(req.params.id).populate('user');
    if (!record) {
      res.status(404);
      return next(new Error('KYC record not found.'));
    }

    record.status = action;
    record.reviewedAt = new Date();
    record.reviewedBy = req.user._id;
    if (action === 'Rejected') record.rejectionReason = reason || 'Rejected by admin.';
    await record.save();

    // Update user kycStatus and isVerified
    const updateData = { kycStatus: action };
    if (action === 'Approved') {
      updateData.isVerified = true;
    } else if (action === 'Rejected') {
      updateData.isVerified = false;
    }
    await User.findByIdAndUpdate(record.user._id, updateData);

    const notification = await Notification.create({
      user: record.user._id,
      title: `KYC ${action}`,
      message: action === 'Approved'
        ? 'Your KYC verification has been approved. You now have full access.'
        : action === 'Rejected'
          ? `Your KYC was rejected. Reason: ${record.rejectionReason}. Please resubmit.`
          : 'Your KYC is under review. We will notify you soon.',
      type: 'KYC'
    });

    if (global.io) global.io.emit(`notify_${record.user._id}`, notification);

    res.json({ success: true, message: `KYC ${action} successfully.`, record });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Get all tools (admin) ───────────────────────────────────────────
// @route GET /api/admin/tools  @access Admin
const getAllToolsAdmin = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { search, status } = req.query;

    let filter = {};
    if (search) filter.name = { $regex: search, $options: 'i' };
    if (status) filter.isApproved = status === 'approved';

    const [tools, total] = await Promise.all([
      paginate(
        Tool.find(filter)
          .populate('owner', 'name email phone kycStatus')
          .sort('-createdAt'),
        page, limit
      ),
      Tool.countDocuments(filter)
    ]);

    res.json({ success: true, count: tools.length, total, pages: Math.ceil(total / limit), tools });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Approve / Reject / Delete tool (admin) ─────────────────────────
// @route PUT /api/admin/tools/:id  @access Admin
const updateToolAdmin = async (req, res, next) => {
  try {
    const { action } = req.body; // 'approve' | 'reject' | 'hide' | 'feature'
    const tool = await Tool.findById(req.params.id).populate('owner', 'name email');
    if (!tool) {
      res.status(404);
      return next(new Error('Tool not found.'));
    }

    if (action === 'approve') {
      tool.isApproved = true;
      tool.isHidden = false;
    } else if (action === 'reject') {
      tool.isApproved = false;
    } else if (action === 'hide') {
      tool.isHidden = !tool.isHidden;
    } else if (action === 'feature') {
      tool.isFeatured = !tool.isFeatured;
    } else {
      res.status(400);
      return next(new Error('Invalid action.'));
    }

    await tool.save();

    if (tool.owner) {
      const notif = await Notification.create({
        user: tool.owner._id,
        title: `Tool ${action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : 'Updated'}`,
        message: `Your tool "${tool.name}" has been ${action}d by admin.`,
        type: 'System'
      });
      if (global.io) global.io.emit(`notify_${tool.owner._id}`, notif);
    }

    res.json({ success: true, message: `Tool ${action}d successfully.`, tool });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Delete tool (admin) ─────────────────────────────────────────────
// @route DELETE /api/admin/tools/:id  @access Admin
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

// ─── @desc  Get all products (admin) ────────────────────────────────────────
// @route GET /api/admin/products  @access Admin
const getAllProductsAdmin = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { search } = req.query;

    let filter = {};
    if (search) filter.name = { $regex: search, $options: 'i' };

    const [products, total] = await Promise.all([
      paginate(
        Product.find(filter)
          .populate('shopkeeper', 'name email phone')
          .sort('-createdAt'),
        page, limit
      ),
      Product.countDocuments(filter)
    ]);

    res.json({ success: true, count: products.length, total, pages: Math.ceil(total / limit), products });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Update product admin action ─────────────────────────────────────
// @route PUT /api/admin/products/:id  @access Admin
const updateProductAdmin = async (req, res, next) => {
  try {
    const { action } = req.body;
    const product = await Product.findById(req.params.id).populate('shopkeeper', 'name email _id');
    if (!product) {
      res.status(404);
      return next(new Error('Product not found.'));
    }

    if (action === 'approve') { product.isApproved = true; product.isHidden = false; }
    else if (action === 'reject') { product.isApproved = false; }
    else if (action === 'hide') { product.isHidden = !product.isHidden; }
    else if (action === 'feature') { product.isFeatured = !product.isFeatured; }
    else { res.status(400); return next(new Error('Invalid action.')); }

    await product.save();

    if (product.shopkeeper) {
      const notif = await Notification.create({
        user: product.shopkeeper._id,
        title: `Product ${action}d`,
        message: `Your product "${product.name}" was ${action}d by admin.`,
        type: 'System'
      });
      if (global.io) global.io.emit(`notify_${product.shopkeeper._id}`, notif);
    }

    res.json({ success: true, message: `Product ${action}d successfully.`, product });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Delete product (admin) ──────────────────────────────────────────
// @route DELETE /api/admin/products/:id  @access Admin
const deleteProductAdmin = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      res.status(404);
      return next(new Error('Product not found.'));
    }
    res.json({ success: true, message: 'Product deleted by admin.' });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Get all crops (admin) ────────────────────────────────────────────
// @route GET /api/admin/crops  @access Admin
const getAllCropsAdmin = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { search } = req.query;

    let filter = {};
    if (search) filter.cropName = { $regex: search, $options: 'i' };

    const [crops, total] = await Promise.all([
      paginate(
        Crop.find(filter)
          .populate('farmer', 'name email phone')
          .sort('-createdAt'),
        page, limit
      ),
      Crop.countDocuments(filter)
    ]);

    res.json({ success: true, count: crops.length, total, pages: Math.ceil(total / limit), crops });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Delete crop (admin) ──────────────────────────────────────────────
// @route DELETE /api/admin/crops/:id  @access Admin
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

// ─── @desc  Get all bookings (admin view) ────────────────────────────────────
// @route GET /api/admin/bookings  @access Admin
const getAllBookings = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { status } = req.query;

    const filter = status ? { status } : {};

    const [bookings, total] = await Promise.all([
      paginate(
        Booking.find(filter)
          .populate('tool', 'name category images')
          .populate('farmer', 'name email phone')
          .sort('-createdAt'),
        page, limit
      ),
      Booking.countDocuments(filter)
    ]);

    res.json({ success: true, count: bookings.length, total, pages: Math.ceil(total / limit), currentPage: page, bookings });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Get all payments (admin view) ────────────────────────────────────
// @route GET /api/admin/payments  @access Admin
const getAllPayments = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { status } = req.query;

    const filter = status ? { status } : {};

    const [payments, total] = await Promise.all([
      paginate(
        Payment.find(filter)
          .populate('farmer', 'name email')
          .sort('-createdAt'),
        page, limit
      ),
      Payment.countDocuments(filter)
    ]);

    res.json({ success: true, count: payments.length, total, pages: Math.ceil(total / limit), payments });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Get revenue analytics (monthly breakdown) ───────────────────────
// @route GET /api/admin/analytics/revenue  @access Admin
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
      month: `${monthNames[m._id.month - 1]} ${m._id.year}`,
      revenue: m.revenue,
      transactions: m.count
    }));

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
    const lastMonthIndex = now.getMonth() === 0 ? { month: 12, year: now.getFullYear() - 1 } : { month: now.getMonth(), year: now.getFullYear() };
    const lastMonth = monthlyRevenue.find(m => m._id.month === lastMonthIndex.month && m._id.year === lastMonthIndex.year);

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

// ─── @desc  Get user growth analytics ────────────────────────────────────────
// @route GET /api/admin/analytics/users  @access Admin
const getUserAnalytics = async (req, res, next) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

    const formattedBookings = bookingTrend.map(b => ({
      month: `${monthNames[b._id.month - 1]}`,
      count: b.count,
      revenue: b.revenue
    }));

    res.json({ success: true, monthlyUsers, bookingTrend: formattedBookings });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Send broadcast notification ──────────────────────────────────────
// @route POST /api/admin/notify  @access Admin
const sendBroadcastNotification = async (req, res, next) => {
  try {
    const { title, message, role, userId } = req.body;
    if (!title || !message) {
      res.status(400);
      return next(new Error('Title and message are required.'));
    }

    let filter = { isActive: true };
    if (userId) {
      // Send to single user
      filter = { _id: userId };
    } else if (role) {
      filter.role = role;
    }

    const users = await User.find(filter).select('_id');
    if (users.length === 0) {
      res.status(404);
      return next(new Error('No users found matching the criteria.'));
    }

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

// ─── @desc  Get admin login history ──────────────────────────────────────────
// @route GET /api/admin/login-history  @access Admin
const getAdminLoginHistory = async (req, res, next) => {
  try {
    const admin = await User.findById(req.user._id).select('loginActivity name email');
    res.json({ success: true, loginActivity: admin.loginActivity, admin: { name: admin.name, email: admin.email } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
