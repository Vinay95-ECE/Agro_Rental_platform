const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  analyzeDiseaseImage,
  getDiseaseHistory,
  deleteDiseaseRecord
} = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

// Multer — store in memory buffer (max 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WEBP, and GIF images are allowed.'));
    }
  }
});

// POST /api/disease/analyze   — upload + analyze image
router.post('/analyze', protect, upload.single('image'), analyzeDiseaseImage);

// GET /api/disease/history    — get user scan history
router.get('/history', protect, getDiseaseHistory);

// DELETE /api/disease/history/:id — delete a scan
router.delete('/history/:id', protect, deleteDiseaseRecord);

module.exports = router;
