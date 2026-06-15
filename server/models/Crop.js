const mongoose = require('mongoose');

const cropSchema = new mongoose.Schema({
  cropName: {
    type: String,
    required: [true, 'Crop name is required'],
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative']
  },
  unit: {
    type: String,
    enum: ['kg', 'Quintal', 'Ton'],
    default: 'kg'
  },
  harvestDate: {
    type: Date,
    required: true
  },
  price: {
    type: Number, // price per unit
    required: [true, 'Price is required']
  },
  images: [{
    type: String
  }],
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
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['Available', 'Sold'],
    default: 'Available'
  }
}, {
  timestamps: true
});

cropSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Crop', cropSchema);
