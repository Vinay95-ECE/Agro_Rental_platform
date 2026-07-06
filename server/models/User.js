const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number']
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
  bio: {
    type: String,
    default: '',
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  village: {
    type: String,
    default: '',
    trim: true
  },
  district: {
    type: String,
    default: '',
    trim: true
  },
  state: {
    type: String,
    default: '',
    trim: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [77.2090, 28.6139]
    }
  },
  // Gamification
  xp: { type: Number, default: 0 },
  coins: { type: Number, default: 0 },
  badge: {
    type: String,
    enum: ['Beginner Farmer', 'Skilled Farmer', 'Expert Farmer', 'Master Farmer'],
    default: 'Beginner Farmer'
  },
  // Account status
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  isSuspended: { type: Boolean, default: false },
  suspendReason: { type: String, default: '' },
  // Auth tokens
  verificationToken: { type: String, select: false },
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpires: { type: Date, select: false },
  refreshToken: { type: String, select: false },
  // Login activity log (last 10 entries)
  loginActivity: [{
    ip: String,
    userAgent: String,
    timestamp: { type: Date, default: Date.now },
    _id: false
  }]
}, {
  timestamps: true
});

// Geospatial index for nearby discovery
userSchema.index({ location: '2dsphere' });
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ role: 1 });

// Bcrypt password hashing middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
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

// Safe user object (no sensitive fields)
userSchema.methods.toSafeObject = function() {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    role: this.role,
    kycStatus: this.kycStatus,
    avatar: this.avatar,
    bio: this.bio,
    village: this.village,
    district: this.district,
    state: this.state,
    location: this.location,
    xp: this.xp,
    coins: this.coins,
    badge: this.badge,
    isVerified: this.isVerified,
    isActive: this.isActive,
    isSuspended: this.isSuspended,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', userSchema);
