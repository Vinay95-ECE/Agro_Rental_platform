const KYCRecord = require('../models/KYCRecord');
const User = require('../models/User');
const Notification = require('../models/Notification');

// ─── @desc  Submit KYC documents ──────────────────────────────────────────────
// @route POST /api/kyc/submit  @access Private
const submitKYC = async (req, res, next) => {
  const {
    aadhaarNumber, panNumber, verificationType,
    aadhaarImage, panImage, selfieImage,
    machineDocImage, shopLicenseImage, addressProofImage
  } = req.body;

  try {
    // Validate required fields
    if (!verificationType) {
      res.status(400);
      return next(new Error('Verification type is required.'));
    }

    if (!aadhaarNumber || !/^\d{12}$/.test(aadhaarNumber)) {
      res.status(400);
      return next(new Error('Valid 12-digit Aadhaar number is required.'));
    }

    if (!aadhaarImage) {
      res.status(400);
      return next(new Error('Aadhaar card image is required. Please upload your Aadhaar scan.'));
    }

    let record = await KYCRecord.findOne({ user: req.user._id });

    if (record && record.status === 'Approved') {
      res.status(400);
      return next(new Error('Your KYC is already approved.'));
    }

    // ── Duplicate Aadhaar check ────────────────────────────────────────────
    // Block if another user already has submitted a KYC with this Aadhaar
    const duplicate = await KYCRecord.findOne({
      aadhaarNumber,
      user: { $ne: req.user._id }
    }).populate('user', 'name');

    if (duplicate) {
      res.status(400);
      return next(new Error(
        'This Aadhaar number is already linked to another account. Each Aadhaar can only be used once.'
      ));
    }

    const kycData = {
      aadhaarNumber,
      panNumber: panNumber || '',
      verificationType,
      aadhaarImage,
      panImage: panImage || '',
      selfieImage: selfieImage || '',
      machineDocImage: machineDocImage || '',
      shopLicenseImage: shopLicenseImage || '',
      addressProofImage: addressProofImage || '',
      status: 'Pending',
      rejectionReason: '',
      submittedAt: new Date()
    };

    if (record) {
      Object.assign(record, kycData);
      await record.save();
    } else {
      record = await KYCRecord.create({ user: req.user._id, ...kycData });
    }

    // Update user KYC status to Pending
    await User.findByIdAndUpdate(req.user._id, { kycStatus: 'Pending' });

    res.status(201).json({
      success: true,
      message: 'KYC documents submitted successfully. Our team will review within 24 hours.',
      record
    });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Get current user KYC status ──────────────────────────────────────
// @route GET /api/kyc/status  @access Private
const getKYCStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const record = await KYCRecord.findOne({ user: req.user._id });
    res.json({
      success: true,
      kycStatus: user.kycStatus,
      record
    });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Get all KYC records (Admin) ───────────────────────────────────────
// @route GET /api/kyc/records  @access Admin
const getAllKYCRecords = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const records = await KYCRecord.find(filter)
      .populate('user', 'name email role phone avatar')
      .populate('reviewedBy', 'name')
      .sort({ submittedAt: -1 });

    res.json({ success: true, count: records.length, records });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Approve / Reject KYC (Admin) ─────────────────────────────────────
// @route PUT /api/kyc/review/:id  @access Admin
const reviewKYC = async (req, res, next) => {
  const { status, rejectionReason } = req.body;
  const { id } = req.params;

  try {
    if (!['Approved', 'Rejected'].includes(status)) {
      res.status(400);
      return next(new Error('Status must be Approved or Rejected.'));
    }

    const record = await KYCRecord.findById(id);
    if (!record) {
      res.status(404);
      return next(new Error('KYC record not found.'));
    }

    record.status = status;
    record.reviewedAt = new Date();
    record.reviewedBy = req.user._id;
    if (status === 'Rejected') {
      record.rejectionReason = rejectionReason || 'Documents could not be verified. Please resubmit.';
    } else {
      record.rejectionReason = '';
    }
    await record.save();

    // Update user kycStatus and isVerified
    const updateData = { kycStatus: status };
    if (status === 'Approved') {
      updateData.isVerified = true;
    } else if (status === 'Rejected') {
      updateData.isVerified = false;
    }
    const user = await User.findByIdAndUpdate(record.user, updateData, { new: true });

    // Send notification to user
    const notifMsg = status === 'Approved'
      ? '🎉 Your KYC has been approved! You are now a verified user.'
      : `Your KYC was rejected. Reason: ${record.rejectionReason}`;

    const notification = await Notification.create({
      user: record.user,
      title: `KYC ${status}`,
      message: notifMsg,
      type: 'KYC'
    });

    if (global.io) {
      global.io.emit(`notify_${record.user}`, notification);
    }

    res.json({
      success: true,
      message: `KYC ${status.toLowerCase()} successfully.`,
      record,
      userKycStatus: user.kycStatus
    });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Get KYC stats (Admin) ─────────────────────────────────────────────
// @route GET /api/kyc/stats  @access Admin
const getKYCStats = async (req, res, next) => {
  try {
    const [pending, approved, rejected] = await Promise.all([
      KYCRecord.countDocuments({ status: 'Pending' }),
      KYCRecord.countDocuments({ status: 'Approved' }),
      KYCRecord.countDocuments({ status: 'Rejected' })
    ]);
    res.json({ success: true, stats: { pending, approved, rejected, total: pending + approved + rejected } });
  } catch (error) {
    next(error);
  }
};

module.exports = { submitKYC, getKYCStatus, getAllKYCRecords, reviewKYC, getKYCStats };
