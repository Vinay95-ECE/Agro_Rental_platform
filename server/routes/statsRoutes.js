const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Tool = require('../models/Tool');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const KYCRecord = require('../models/KYCRecord');
const Crop = require('../models/Crop');
const Product = require('../models/Product');

// ─── @desc  Public platform stats for homepage ─────────────────────────────
// @route GET /api/stats  @access Public (no auth required)
router.get('/', async (req, res, next) => {
  try {
    const [
      totalFarmers,
      totalToolOwners,
      totalTools,
      totalBookings,
      approvedKYC,
      totalCrops,
      totalProducts,
      revenueArr
    ] = await Promise.all([
      User.countDocuments({ role: 'Farmer', isActive: true }),
      User.countDocuments({ role: 'Tool Owner', isActive: true }),
      Tool.countDocuments({}),
      Booking.countDocuments({ status: { $in: ['Approved', 'Completed'] } }),
      KYCRecord.countDocuments({ status: 'Approved' }),
      Crop.countDocuments({}),
      Product.countDocuments({}),
      // Revenue from Booking.totalAmount (Approved + Completed bookings)
      Booking.aggregate([
        { $match: { status: { $in: ['Approved', 'Completed'] } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ])
    ]);

    // KYC approval rate
    const totalKYC = await KYCRecord.countDocuments({});
    const kycApprovalRate = totalKYC > 0
      ? parseFloat(((approvedKYC / totalKYC) * 100).toFixed(1))
      : 0;

    const totalRevenue = revenueArr[0]?.total || 0;

    res.json({
      success: true,
      stats: {
        totalFarmers,
        totalToolOwners,
        totalTools,
        totalBookings,
        approvedKYC,
        kycApprovalRate,
        totalCrops,
        totalProducts,
        totalRevenue,
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
