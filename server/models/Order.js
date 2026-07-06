const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // For product orders
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, min: 1 },
    price: Number,
    _id: false
  }],
  // For crop orders (direct purchase)
  cropId: { type: mongoose.Schema.Types.ObjectId, ref: 'Crop' },
  cropName: { type: String, default: '' },
  quantity: { type: Number, default: 0 },
  unit: { type: String, default: 'kg' },
  // Common
  totalAmount: { type: Number, required: true, min: 0 },
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String
  },
  paymentId: { type: String, default: '' },
  paymentStatus: {
    type: String,
    enum: ['Unpaid', 'Paid', 'Failed', 'Refunded'],
    default: 'Unpaid'
  },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Rejected'],
    default: 'Pending'
  },
  notes: { type: String, default: '' }
}, { timestamps: true });

orderSchema.index({ buyer: 1 });
orderSchema.index({ seller: 1 });
orderSchema.index({ status: 1 });

module.exports = mongoose.model('Order', orderSchema);
