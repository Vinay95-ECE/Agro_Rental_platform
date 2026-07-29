const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { upload, processImage, processMultipleImages, deleteFromCloudinary } = require('../middleware/upload');

// @desc    Upload single image
// @route   POST /api/upload/image
// @access  Private
router.post(
  '/image',
  protect,
  upload.single('image'),
  processImage('general'),
  (req, res) => {
    if (!req.uploadedImage) {
      return res.status(400).json({ success: false, message: 'No image file provided.' });
    }
    res.json({ success: true, url: req.uploadedImage.url, publicId: req.uploadedImage.publicId });
  }
);

// @desc    Upload profile avatar
// @route   POST /api/upload/avatar
// @access  Private
router.post(
  '/avatar',
  protect,
  upload.single('avatar'),
  processImage('avatars'),
  async (req, res) => {
    if (!req.uploadedImage) {
      return res.status(400).json({ success: false, message: 'No avatar image provided.' });
    }
    const User = require('../models/User');
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: req.uploadedImage.url },
      { new: true }
    ).select('-password');
    res.json({ success: true, url: req.uploadedImage.url, user });
  }
);

// @desc    Upload profile avatar (Public for Registration)
// @route   POST /api/upload/registerAvatar
// @access  Public
router.post(
  '/registerAvatar',
  upload.single('avatar'),
  processImage('avatars'),
  (req, res) => {
    if (!req.uploadedImage) {
      return res.status(400).json({ success: false, message: 'No avatar image provided.' });
    }
    res.json({ success: true, url: req.uploadedImage.url });
  }
);

// @desc    Upload crop images (up to 5)
// @route   POST /api/upload/crop
// @access  Private
router.post(
  '/crop',
  protect,
  upload.array('images', 5),
  processMultipleImages('crops'),
  (req, res) => {
    const urls = (req.uploadedImages || []).map(img => img.url);
    res.json({ success: true, urls });
  }
);

// @desc    Upload machine/tool images (up to 8)
// @route   POST /api/upload/machine
// @access  Private
router.post(
  '/machine',
  protect,
  upload.array('images', 8),
  processMultipleImages('machines'),
  (req, res) => {
    const urls = (req.uploadedImages || []).map(img => img.url);
    res.json({ success: true, urls });
  }
);

// @desc    Upload KYC documents
// @route   POST /api/upload/kyc
// @access  Private
router.post(
  '/kyc',
  protect,
  upload.single('document'),
  processImage('kyc'),
  (req, res) => {
    if (!req.uploadedImage) {
      return res.status(400).json({ success: false, message: 'No document image provided.' });
    }
    res.json({ success: true, url: req.uploadedImage.url, publicId: req.uploadedImage.publicId });
  }
);

// @desc    Upload disease scan image
// @route   POST /api/upload/disease
// @access  Private
router.post(
  '/disease',
  protect,
  upload.single('image'),
  processImage('disease'),
  (req, res) => {
    if (!req.uploadedImage) {
      return res.status(400).json({ success: false, message: 'No image provided.' });
    }
    res.json({ success: true, url: req.uploadedImage.url, publicId: req.uploadedImage.publicId });
  }
);

// @desc    Upload product images (up to 5)
// @route   POST /api/upload/product
// @access  Private
router.post(
  '/product',
  protect,
  upload.array('images', 5),
  processMultipleImages('products'),
  (req, res) => {
    const urls = (req.uploadedImages || []).map(img => img.url);
    res.json({ success: true, urls });
  }
);

// @desc    Delete image from Cloudinary
// @route   DELETE /api/upload/:publicId
// @access  Private
router.delete('/delete', protect, async (req, res) => {
  try {
    const { publicId } = req.body;
    if (!publicId) return res.status(400).json({ success: false, message: 'publicId is required.' });
    await deleteFromCloudinary(publicId);
    res.json({ success: true, message: 'Image deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete image.' });
  }
});

module.exports = router;
