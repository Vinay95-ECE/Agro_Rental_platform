const KYCRecord = require('../models/KYCRecord');
const User = require('../models/User');

// @desc    Submit KYC verification documents
// @route   POST /api/kyc/submit
// @access  Private
const submitKYC = async (req, res, next) => {
  const { aadhaarNumber, verificationType, documentImage, shopLicense, equipmentReceipt } = req.body;

  try {
    let record = await KYCRecord.findOne({ user: req.user._id });

    if (record && record.status === 'Approved') {
      res.status(400);
      return next(new Error('KYC has already been approved.'));
    }

    if (record) {
      // Re-submit
      record.aadhaarNumber = aadhaarNumber;
      record.verificationType = verificationType;
      record.documentImage = documentImage;
      record.additionalDocs = { shopLicense, equipmentReceipt };
      record.status = 'Pending';
      record.rejectionReason = '';
      await record.save();
    } else {
      // Create new
      record = await KYCRecord.create({
        user: req.user._id,
        aadhaarNumber,
        verificationType,
        documentImage,
        additionalDocs: { shopLicense, equipmentReceipt },
        status: 'Pending'
      });
    }

    // Update user kycStatus flag
    req.user.kycStatus = 'Pending';
    await req.user.save();

    res.status(201).json({
      success: true,
      message: 'KYC documents submitted successfully. Status is now Pending review.',
      record
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user KYC info
// @route   GET /api/kyc/status
// @access  Private
const getKYCStatus = async (req, res, next) => {
  try {
    const record = await KYCRecord.findOne({ user: req.user._id });
    res.json({
      success: true,
      kycStatus: req.user.kycStatus,
      record
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all KYC records (Admin only)
// @route   GET /api/kyc/records
// @access  Private/Admin
const getAllKYCRecords = async (req, res, next) => {
  try {
    const records = await KYCRecord.find().populate('user', 'name email role');
    res.json({
      success: true,
      records
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve/Reject KYC documents
// @route   PUT /api/kyc/review/:id
// @access  Private/Admin
const reviewKYC = async (req, res, next) => {
  const { status, rejectionReason } = req.body;
  const { id } = req.params;

  try {
    if (!['Approved', 'Rejected'].includes(status)) {
      res.status(400);
      return next(new Error('Invalid review status. Use Approved or Rejected.'));
    }

    const record = await KYCRecord.findById(id);
    if (!record) {
      res.status(404);
      return next(new Error('KYC record not found'));
    }

    record.status = status;
    if (status === 'Rejected') {
      record.rejectionReason = rejectionReason || 'Documents do not match our system criteria.';
    } else {
      record.rejectionReason = '';
    }
    await record.save();

    // Update main user record status
    const user = await User.findById(record.user);
    if (user) {
      user.kycStatus = status;
      if (status === 'Approved') {
        user.isVerified = true;
      }
      await user.save();
    }

    res.json({
      success: true,
      message: `KYC status updated to ${status}.`,
      record
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitKYC,
  getKYCStatus,
  getAllKYCRecords,
  reviewKYC
};
