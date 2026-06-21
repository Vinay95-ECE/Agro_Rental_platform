const mongoose = require('mongoose');

const diseaseReportSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  cropName: {
    type: String,
    required: true,
    default: 'Unknown'
  },
  imageUrl: {
    type: String,
    required: true
  },
  diseaseName: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    required: true,
    enum: ['Healthy', 'Low', 'Moderate', 'High', 'Severe']
  },
  confidenceScore: {
    type: String,
    required: true
  },
  treatment: {
    type: String,
    required: true
  },
  prevention: {
    type: String,
    default: ''
  },
  fertilizer: {
    type: String,
    default: ''
  },
  pesticide: {
    type: String,
    default: ''
  },
  explanation: {
    type: String,
    default: ''
  },
  analysisMethod: {
    type: String,
    enum: ['gemini-vision', 'rule-based', 'simulation'],
    default: 'gemini-vision'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('DiseaseReport', diseaseReportSchema);
