const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true
  },
  role: {
    type: String,
    enum: ['Farmer', 'Tool Owner', 'Shopkeeper', 'Buyer', 'Admin'],
    default: 'Farmer'
  },
  kycStatus: {
    type: String,
    enum: ['Not Submitted', 'Pending', 'Approved', 'Rejected'],
    default: 'Not Submitted'
  },
  avatar: {
    type: String,
    default: ''
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [77.2090, 28.6139] // Default New Delhi coordinates
    }
  },
  // Gamification properties
  xp: {
    type: Number,
    default: 0
  },
  coins: {
    type: Number,
    default: 0
  },
  badge: {
    type: String,
    enum: ['Beginner Farmer', 'Skilled Farmer', 'Expert Farmer', 'Master Farmer'],
    default: 'Beginner Farmer'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, {
  timestamps: true
});

// Geospatial index for nearby discovery
userSchema.index({ location: '2dsphere' });

// Bcrypt password hashing middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
