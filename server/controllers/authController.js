const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT token helper
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'agrirent_secret_key_123', {
    expiresIn: '30d'
  });
};

// Set token cookie helper
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);

  const cookieOptions = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        kycStatus: user.kycStatus,
        xp: user.xp,
        coins: user.coins,
        badge: user.badge,
        isVerified: user.isVerified
      }
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  const { name, email, password, phone, role } = req.body;

  try {
    const emailExists = await User.findOne({ email });
    const phoneExists = await User.findOne({ phone });

    if (emailExists || phoneExists) {
      res.status(400);
      return next(new Error('User with this email or phone already exists'));
    }

    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: role || 'Farmer'
    });

    if (user) {
      sendTokenResponse(user, 201, res);
    } else {
      res.status(400);
      return next(new Error('Invalid user data provided'));
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await user.comparePassword(password))) {
      sendTokenResponse(user, 200, res);
    } else {
      res.status(401);
      return next(new Error('Invalid email or password'));
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.json({
        success: true,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          kycStatus: user.kycStatus,
          xp: user.xp,
          coins: user.coins,
          badge: user.badge,
          location: user.location,
          isVerified: user.isVerified
        }
      });
    } else {
      res.status(404);
      return next(new Error('User profile not found'));
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Request Password Reset
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      res.status(404);
      return next(new Error('User with this email does not exist'));
    }
    // Generate reset token
    const resetToken = Math.random().toString(36).substring(2, 15);
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    res.json({
      success: true,
      message: 'Reset token generated successfully',
      resetToken
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm Password Reset
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res, next) => {
  const { token, newPassword } = req.body;
  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      res.status(400);
      return next(new Error('Invalid or expired reset token'));
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change Password (Protected)
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;
  try {
    const user = await User.findById(req.user._id);

    if (user && (await user.comparePassword(oldPassword))) {
      user.password = newPassword;
      await user.save();
      res.json({
        success: true,
        message: 'Password updated successfully'
      });
    } else {
      res.status(400);
      return next(new Error('Invalid old password'));
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Email Address
// @route   POST /api/auth/verify-email
// @access  Public
const verifyEmail = async (req, res, next) => {
  const { token } = req.body;
  try {
    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      res.status(400);
      return next(new Error('Invalid verification token'));
    }
    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();
    res.json({
      success: true,
      message: 'Email address verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Mobile OTP
// @route   POST /api/auth/verify-mobile
// @access  Private
const verifyMobileOTP = async (req, res, next) => {
  const { otp } = req.body;
  try {
    // Sandbox verification validation
    if (otp !== '123456') {
      res.status(400);
      return next(new Error('Invalid OTP provided. Try sandbox 123456'));
    }
    req.user.isVerified = true;
    await req.user.save();
    res.json({
      success: true,
      message: 'Mobile phone number verified successfully via OTP'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user & clear cookie
// @route   GET /api/auth/logout
// @access  Public
const logoutUser = async (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.json({
    success: true,
    message: 'User logged out successfully'
  });
};

// @desc    Get all users (except current user)
// @route   GET /api/auth/users
// @access  Private
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } }).select('name role email phone avatar');
    res.json({
      success: true,
      users
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  forgotPassword,
  resetPassword,
  changePassword,
  verifyEmail,
  verifyMobileOTP,
  logoutUser,
  getUsers
};
