const mongoose = require('mongoose');

const toolSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tool name is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  category: {
    type: String,
    enum: ['Tractor', 'Rotavator', 'Cultivator', 'Seeder', 'Harvester', 'Sprayer', 'Water Pump'],
    required: [true, 'Category is required']
  },
  images: [{
    type: String
  }],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
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
  rentRates: {
    daily: { type: Number, required: true },
    weekly: { type: Number, required: true },
    monthly: { type: Number, required: true }
  },
  availability: {
    type: Boolean,
    default: true
  },
  specifications: {
    power: String, // e.g. "50 HP"
    fuelType: String, // e.g. "Diesel"
    weight: String, // e.g. "1200 kg"
    capacity: String // e.g. "2 Ton"
  },
  ratings: {
    type: Number,
    default: 0
  },
  reviewsCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

toolSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Tool', toolSchema);
