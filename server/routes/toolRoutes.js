const express = require('express');
const router = express.Router();
const {
  createTool, getAllTools, getMyTools,
  getToolById, updateTool, toggleAvailability, deleteTool
} = require('../controllers/toolController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(getAllTools)
  .post(protect, authorize('Tool Owner', 'Admin'), createTool);

router.get('/my-tools', protect, getMyTools);

router.route('/:id')
  .get(getToolById)
  .put(protect, updateTool)
  .delete(protect, deleteTool);

router.patch('/:id/availability', protect, toggleAvailability);

module.exports = router;
