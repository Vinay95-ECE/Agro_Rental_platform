const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  tools: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tool'
  }],
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  crops: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Crop'
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Wishlist', wishlistSchema);
