const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  type: {
    type: String,
    enum: ['Seed', 'Fertilizer'],
    required: [true, 'Product type (Seed/Fertilizer) is required']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Price is required']
  },
  stock: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock cannot be negative']
  },
  images: [{ type: String }],
  shopkeeper: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ratings: { type: Number, default: 0 },
  reviewsCount: { type: Number, default: 0 },
  // Admin control fields
  isApproved: { type: Boolean, default: true },
  isHidden: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false }
}, {
  timestamps: true
});

productSchema.index({ shopkeeper: 1 });
productSchema.index({ category: 1 });
productSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);
