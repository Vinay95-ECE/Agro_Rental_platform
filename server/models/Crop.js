const mongoose = require('mongoose');

const cropSchema = new mongoose.Schema({
  cropName: {
    type: String,
    required: [true, 'Crop name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  variety: { type: String, default: '', trim: true },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0.1, 'Quantity must be positive']
  },
  unit: {
    type: String,
    enum: ['kg', 'Quintal', 'Ton', 'Piece', 'Dozen'],
    default: 'kg'
  },
  harvestDate: { type: Date, required: true },
  price: {
    type: Number,
    required: [true, 'Price per unit is required'],
    min: [0, 'Price cannot be negative']
  },
  images: [{ type: String }], // Real Cloudinary URLs
  description: { type: String, default: '', maxlength: 1000 },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [77.2090, 28.6139] }
  },
  village: { type: String, default: '' },
  district: { type: String, default: '' },
  state: { type: String, default: '' },
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['Available', 'Sold', 'Reserved', 'Expired'],
    default: 'Available'
  },
  organic: { type: Boolean, default: false },
  qualityGrade: { type: String, enum: ['A', 'B', 'C', ''], default: '' },
  viewCount: { type: Number, default: 0 }
}, { timestamps: true });

cropSchema.index({ location: '2dsphere' });
cropSchema.index({ farmer: 1 });
cropSchema.index({ status: 1 });
cropSchema.index({ cropName: 'text', village: 'text' });

module.exports = mongoose.model('Crop', cropSchema);
