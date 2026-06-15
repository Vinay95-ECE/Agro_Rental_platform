const express = require('express');
const router = express.Router();
const { createTool, getAllTools, getToolById, deleteTool } = require('../controllers/toolController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, authorize('Tool Owner', 'Admin'), createTool)
  .get(getAllTools);

router.route('/:id')
  .get(getToolById)
  .delete(protect, deleteTool);

module.exports = router;
