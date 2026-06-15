const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true
  },
  // Polymorphic relations (can review a tool, crop, or seed/fertilizer product)
  reviewTargetModel: {
    type: String,
    required: true,
    enum: ['Tool', 'Product', 'Crop']
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'reviewTargetModel'
  }
}, {
  timestamps: true
});

// Avoid duplicate reviews by the same user on the same item
reviewSchema.index({ user: 1, targetId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
