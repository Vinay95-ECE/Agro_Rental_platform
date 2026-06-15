const mongoose = require('mongoose');

const weatherLogSchema = new mongoose.Schema({
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  temperature: {
    type: Number,
    required: true
  },
  humidity: {
    type: Number,
    required: true
  },
  rainProbability: {
    type: Number, // Percentage 0 - 100
    required: true
  },
  windSpeed: {
    type: Number
  },
  irrigationAdvice: {
    type: String,
    required: true
  },
  harvestRecommendation: {
    type: String
  }
}, {
  timestamps: true
});

weatherLogSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('WeatherLog', weatherLogSchema);
