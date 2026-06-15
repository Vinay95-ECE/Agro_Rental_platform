const mongoose = require('mongoose');

const diseaseReportSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  cropName: {
    type: String,
    required: true
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
    required: true
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
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('DiseaseReport', diseaseReportSchema);
