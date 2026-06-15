const mongoose = require('mongoose');

const fertilizerSchema = new mongoose.Schema({
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
    type: String, // e.g. Organic, Urea, NPK, DAP
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
    npkRatio: String, // e.g. "19-19-19"
    netWeight: String, // e.g. "50 kg"
    form: String // e.g. "Granular", "Liquid"
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Fertilizer', fertilizerSchema);
