const mongoose = require('mongoose');

const seedSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String, // e.g. Wheat, Rice, Corn
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  stock: {
    type: Number,
    required: true,
    min: 0
  },
  images: [{
    type: String
  }],
  shopkeeper: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  specifications: {
    germinationRate: String,
    purity: String,
    harvestDuration: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Seed', seedSchema);
