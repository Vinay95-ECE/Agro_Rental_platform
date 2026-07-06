const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

// ─── Token Helpers ─────────────────────────────────────────────────────────────
const generateAccessToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

const generateRefreshToken = (id) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh', {
    expiresIn: '30d'
  });

const sendTokenResponse = async (user, statusCode, res) => {
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Store hashed refresh token in DB
  user.refreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await user.save({ validateBeforeSave: false });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000
  };

  res
    .status(statusCode)
    .cookie('refreshToken', refreshToken, cookieOptions)
    .json({
      success: true,
      token: accessToken,
      user: user.toSafeObject()
    });
};

// ─── @desc  Register new user ─────────────────────────────────────────────────
// @route POST /api/auth/register  @access Public
const registerUser = async (req, res, next) => {
  const { name, email, password, phone, role, village, district, state } = req.body;

  try {
    if (!name || !email || !password || !phone) {
      res.status(400);
      return next(new Error('Name, email, password and phone are required.'));
    }

    const emailExists = await User.findOne({ email });
    if (emailExists) {
      res.status(400);
      return next(new Error('An account with this email already exists.'));
    }

    const phoneExists = await User.findOne({ phone });
    if (phoneExists) {
      res.status(400);
      return next(new Error('An account with this phone number already exists.'));
    }

    const allowedRoles = ['Farmer', 'Tool Owner', 'Shopkeeper', 'Buyer'];
    const userRole = allowedRoles.includes(role) ? role : 'Farmer';

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone.trim(),
      role: userRole,
      village: village || '',
      district: district || '',
      state: state || ''
    });

    // Re-fetch with password excluded via select
    const safeUser = await User.findById(user._id);
    await sendTokenResponse(safeUser, 201, res);
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Login user ────────────────────────────────────────────────────────
// @route POST /api/auth/login  @access Public
const loginUser = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      res.status(400);
      return next(new Error('Email and password are required.'));
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      res.status(401);
      return next(new Error('Invalid email or password.'));
    }

    if (user.isSuspended) {
      res.status(403);
      return next(new Error(`Account suspended: ${user.suspendReason || 'Contact admin.'}`));
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401);
      return next(new Error('Invalid email or password.'));
    }

    // Log login activity (keep last 10)
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    user.loginActivity = [{ ip, userAgent, timestamp: new Date() }, ...user.loginActivity].slice(0, 10);
    await user.save({ validateBeforeSave: false });

    await sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Refresh access token ──────────────────────────────────────────────
// @route POST /api/auth/refresh  @access Public
const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) {
      res.status(401);
      return next(new Error('No refresh token provided.'));
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh'
    );

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ _id: decoded.id, refreshToken: hashedToken });

    if (!user) {
      res.status(401);
      return next(new Error('Invalid or expired refresh token. Please login again.'));
    }

    const newAccessToken = generateAccessToken(user._id);
    res.json({ success: true, token: newAccessToken, user: user.toSafeObject() });
  } catch (error) {
    res.status(401);
    return next(new Error('Refresh token expired. Please login again.'));
  }
};

// ─── @desc  Get user profile ──────────────────────────────────────────────────
// @route GET /api/auth/profile  @access Private
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      return next(new Error('User not found.'));
    }
    res.json({ success: true, user: user.toSafeObject() });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Update user profile ───────────────────────────────────────────────
// @route PUT /api/auth/profile  @access Private
const updateProfile = async (req, res, next) => {
  const { name, phone, bio, village, district, state, coordinates } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      return next(new Error('User not found.'));
    }

    if (name) user.name = name.trim();
    if (phone) {
      const phoneExists = await User.findOne({ phone, _id: { $ne: user._id } });
      if (phoneExists) {
        res.status(400);
        return next(new Error('This phone number is already registered.'));
      }
      user.phone = phone.trim();
    }
    if (bio !== undefined) user.bio = bio;
    if (village !== undefined) user.village = village;
    if (district !== undefined) user.district = district;
    if (state !== undefined) user.state = state;
    if (coordinates && coordinates.length === 2) {
      user.location = { type: 'Point', coordinates: [parseFloat(coordinates[0]), parseFloat(coordinates[1])] };
    }

    await user.save();
    res.json({ success: true, message: 'Profile updated successfully.', user: user.toSafeObject() });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Upload/Update avatar ─────────────────────────────────────────────
// @route POST /api/auth/avatar  @access Private
const uploadAvatar = async (req, res, next) => {
  try {
    const { avatarUrl } = req.body;
    if (!avatarUrl) {
      res.status(400);
      return next(new Error('Avatar URL is required.'));
    }
    const user = await User.findByIdAndUpdate(req.user._id, { avatar: avatarUrl }, { new: true });
    res.json({ success: true, message: 'Avatar updated.', user: user.toSafeObject() });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Forgot password ───────────────────────────────────────────────────
// @route POST /api/auth/forgot-password  @access Public
const forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  try {
    if (!email) {
      res.status(400);
      return next(new Error('Email is required.'));
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Return success even if user not found (security best practice)
      return res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save({ validateBeforeSave: false });

    // In production, send email here. For now, return token in dev mode.
    const response = { success: true, message: 'Reset instructions sent.' };
    if (process.env.NODE_ENV !== 'production') {
      response.resetToken = resetToken; // Only expose in dev
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Reset password ────────────────────────────────────────────────────
// @route POST /api/auth/reset-password  @access Public
const resetPassword = async (req, res, next) => {
  const { token, newPassword } = req.body;
  try {
    if (!token || !newPassword) {
      res.status(400);
      return next(new Error('Token and new password are required.'));
    }

    if (newPassword.length < 6) {
      res.status(400);
      return next(new Error('Password must be at least 6 characters.'));
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    }).select('+password');

    if (!user) {
      res.status(400);
      return next(new Error('Invalid or expired password reset token.'));
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.refreshToken = undefined; // Invalidate all sessions
    await user.save();

    res.json({ success: true, message: 'Password reset successfully. Please login.' });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Change password ───────────────────────────────────────────────────
// @route PUT /api/auth/change-password  @access Private
const changePassword = async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;
  try {
    if (!oldPassword || !newPassword) {
      res.status(400);
      return next(new Error('Old and new passwords are required.'));
    }

    if (newPassword.length < 6) {
      res.status(400);
      return next(new Error('New password must be at least 6 characters.'));
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      res.status(400);
      return next(new Error('Current password is incorrect.'));
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Logout user ───────────────────────────────────────────────────────
// @route GET /api/auth/logout  @access Private
const logoutUser = async (req, res) => {
  try {
    // Clear refresh token in DB
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, { refreshToken: undefined });
    }
  } catch (e) { /* ignore */ }

  res.cookie('refreshToken', 'none', { expires: new Date(Date.now() + 10 * 1000), httpOnly: true });
  res.json({ success: true, message: 'Logged out successfully.' });
};

// ─── @desc  Get all users (chat + admin) ─────────────────────────────────────
// @route GET /api/auth/users  @access Private
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id }, isActive: true })
      .select('name role email phone avatar village kycStatus')
      .sort({ name: 1 });
    res.json({ success: true, users });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Get login activity ────────────────────────────────────────────────
// @route GET /api/auth/login-activity  @access Private
const getLoginActivity = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('loginActivity');
    res.json({ success: true, activity: user.loginActivity });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  refreshToken,
  getUserProfile,
  updateProfile,
  uploadAvatar,
  forgotPassword,
  resetPassword,
  changePassword,
  logoutUser,
  getUsers,
  getLoginActivity
};
