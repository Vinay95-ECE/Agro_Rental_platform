const mongoose = require('mongoose');

const kycRecordSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  // Personal info
  aadhaarNumber: {
    type: String,
    match: [/^\d{12}$/, 'Please provide a valid 12-digit Aadhaar number']
  },
  panNumber: {
    type: String,
    match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Please provide a valid PAN number'],
    default: ''
  },
  verificationType: {
    type: String,
    enum: ['Farmer', 'Tool Owner', 'Shopkeeper', 'Buyer'],
    required: true
  },
  // Document image URLs (from Cloudinary)
  aadhaarImage: { type: String, default: '' },      // Aadhaar card scan
  panImage: { type: String, default: '' },          // PAN card scan
  selfieImage: { type: String, default: '' },       // Live selfie/photo
  machineDocImage: { type: String, default: '' },   // Machine ownership docs
  shopLicenseImage: { type: String, default: '' },  // Shop registration
  addressProofImage: { type: String, default: '' }, // Address proof
  // Status
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  rejectionReason: { type: String, default: '' },
  // Timestamps for audit
  submittedAt: { type: Date },
  reviewedAt: { type: Date },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

kycRecordSchema.index({ user: 1 });
kycRecordSchema.index({ status: 1 });

module.exports = mongoose.model('KYCRecord', kycRecordSchema);
