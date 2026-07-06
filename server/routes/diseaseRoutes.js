const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  analyzeDiseaseImage,
  analyzeVideoFile,
  analyzeWebcamFrame,
  getDiseaseHistory,
  deleteDiseaseRecord
} = require('../controllers/aiController');
const { protect, optionalProtect } = require('../middleware/authMiddleware');

// ── Image upload (max 10MB, JPEG/PNG/WEBP/GIF) ────────────────────────────────
const imageUpload = multer({
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

// ── Video upload (max 100MB, MP4/AVI/MOV/WEBM) ────────────────────────────────
const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'video/mp4', 'video/avi', 'video/quicktime',
      'video/webm', 'video/x-msvideo', 'video/x-ms-wmv'
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only MP4, AVI, MOV, and WEBM videos are allowed.'));
    }
  }
});

// ── Routes ─────────────────────────────────────────────────────────────────────

// POST /api/disease/analyze        — upload image + analyze (guest or logged-in)
router.post('/analyze', optionalProtect, imageUpload.single('image'), analyzeDiseaseImage);

// POST /api/disease/analyze-video  — upload video + analyze frame by frame
router.post('/analyze-video', optionalProtect, videoUpload.single('video'), analyzeVideoFile);

// POST /api/disease/analyze-frame  — single base64 frame (webcam live stream)
router.post('/analyze-frame', analyzeWebcamFrame);

// GET  /api/disease/history        — get user scan history
router.get('/history', protect, getDiseaseHistory);

// DELETE /api/disease/history/:id  — delete a scan
router.delete('/history/:id', protect, deleteDiseaseRecord);

module.exports = router;
