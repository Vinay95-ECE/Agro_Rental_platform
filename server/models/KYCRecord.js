const mongoose = require('mongoose');

const kycRecordSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  aadhaarNumber: {
    type: String,
    required: [true, 'Aadhaar number is required'],
    match: [/^\d{12}$/, 'Please provide a valid 12-digit Aadhaar number']
  },
  verificationType: {
    type: String,
    enum: ['Farmer', 'Tool Owner', 'Shopkeeper', 'Buyer'],
    required: true
  },
  documentImage: {
    type: String, // URL of Aadhaar Card image
    required: [true, 'Aadhaar card scan image is required']
  },
  additionalDocs: {
    shopLicense: String, // For Shopkeeper role
    equipmentReceipt: String // For Tool Owner role
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  rejectionReason: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('KYCRecord', kycRecordSchema);
