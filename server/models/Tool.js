const mongoose = require('mongoose');

const toolSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tool name is required'],
    trim: true,
    maxlength: [200, 'Name cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  category: {
    type: String,
    enum: ['Tractor', 'Rotavator', 'Cultivator', 'Seeder', 'Harvester', 'Sprayer', 'Water Pump', 'Thresher', 'Plough', 'Other'],
    required: [true, 'Category is required']
  },
  images: [{ type: String }],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Location details
  village: { type: String, default: '', trim: true },
  district: { type: String, default: '', trim: true },
  state: { type: String, default: '', trim: true },
  address: { type: String, default: '', trim: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [77.2090, 28.6139] } // [lng, lat]
  },
  rentRates: {
    daily: { type: Number, required: [true, 'Daily rent rate is required'], min: 0 },
    weekly: { type: Number, required: [true, 'Weekly rent rate is required'], min: 0 },
    monthly: { type: Number, required: [true, 'Monthly rent rate is required'], min: 0 }
  },
  availability: { type: Boolean, default: true },
  specifications: {
    power: { type: String, default: '' },
    fuelType: { type: String, default: 'Diesel' },
    weight: { type: String, default: '' },
    capacity: { type: String, default: '' },
    yearOfMfg: { type: String, default: '' },
    brand: { type: String, default: '' }
  },
  // Approved by admin (for future admin approval flow)
  status: {
    type: String,
    enum: ['Active', 'Pending', 'Rejected', 'Suspended'],
    default: 'Active'  // Immediately active for now
  },
  ratings: { type: Number, default: 0, min: 0, max: 5 },
  reviewsCount: { type: Number, default: 0 },
  // Track booked date ranges for calendar
  bookedDates: [{
    startDate: Date,
    endDate: Date,
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    _id: false
  }],
  // Admin control fields
  isApproved: { type: Boolean, default: true },
  isHidden: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  viewCount: { type: Number, default: 0 }
}, { timestamps: true });

toolSchema.index({ location: '2dsphere' });
toolSchema.index({ owner: 1 });
toolSchema.index({ category: 1 });
toolSchema.index({ availability: 1 });
toolSchema.index({ name: 'text', description: 'text', village: 'text' });

module.exports = mongoose.model('Tool', toolSchema);
