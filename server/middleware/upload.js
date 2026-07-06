const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

// ─── Cloudinary Configuration ──────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// ─── Multer: store in memory (buffer), not disk ────────────────────────────────
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

// ─── Upload buffer to Cloudinary via stream ────────────────────────────────────
const uploadToCloudinary = (fileBuffer, folder = 'agrirent', options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: `agrirent/${folder}`,
      resource_type: 'image',
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ],
      ...options
    };

    const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });

    const readable = new Readable();
    readable.push(fileBuffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
};

// ─── Delete image from Cloudinary ─────────────────────────────────────────────
const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return;
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Cloudinary delete error:', err);
  }
};

// ─── Middleware: upload single image and attach URL to req ────────────────────
const processImage = (folder) => async (req, res, next) => {
  try {
    if (!req.file) return next();

    const cloudinaryEnabled =
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name';

    if (cloudinaryEnabled) {
      const result = await uploadToCloudinary(req.file.buffer, folder);
      req.uploadedImage = {
        url: result.secure_url,
        publicId: result.public_id
      };
    } else {
      // Demo mode: return a placeholder (still functional without Cloudinary)
      req.uploadedImage = {
        url: `https://ui-avatars.com/api/?name=${encodeURIComponent(req.file.originalname)}&background=10b981&color=fff&size=200`,
        publicId: null
      };
    }
    next();
  } catch (err) {
    console.error('Image upload error:', err);
    res.status(500).json({ success: false, message: 'Image upload failed. Please try again.' });
  }
};

// ─── Middleware: upload multiple images ────────────────────────────────────────
const processMultipleImages = (folder) => async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      req.uploadedImages = [];
      return next();
    }

    const cloudinaryEnabled =
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name';

    if (cloudinaryEnabled) {
      const uploads = await Promise.all(
        req.files.map(file => uploadToCloudinary(file.buffer, folder))
      );
      req.uploadedImages = uploads.map(r => ({ url: r.secure_url, publicId: r.public_id }));
    } else {
      req.uploadedImages = req.files.map((file, i) => ({
        url: `https://picsum.photos/seed/${Date.now() + i}/400/300`,
        publicId: null
      }));
    }
    next();
  } catch (err) {
    console.error('Multiple image upload error:', err);
    res.status(500).json({ success: false, message: 'Image upload failed. Please try again.' });
  }
};

module.exports = {
  upload,
  uploadToCloudinary,
  deleteFromCloudinary,
  processImage,
  processMultipleImages,
  cloudinary
};
