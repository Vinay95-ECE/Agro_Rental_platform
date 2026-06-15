const Tool = require('../models/Tool');

// Haversine formula to compute distance in km
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// @desc    Create a new farming tool listing
// @route   POST /api/tools
// @access  Private (Tool Owner)
const createTool = async (req, res, next) => {
  const { name, description, category, images, rentRates, specifications, coordinates } = req.body;

  try {
    const tool = await Tool.create({
      name,
      description,
      category,
      images,
      owner: req.user._id,
      location: {
        type: 'Point',
        coordinates: coordinates || [77.2090, 28.6139] // Default coordinates if not provided
      },
      rentRates,
      specifications
    });

    res.status(201).json({
      success: true,
      message: 'Tool listing created successfully',
      tool
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all tools / search & filter tools (including Geolocation radius)
// @route   GET /api/tools
// @access  Public
const getAllTools = async (req, res, next) => {
  const { search, category, maxRate, lat, lng, radius } = req.query;

  try {
    let query = { availability: true };

    if (category) {
      query.category = category;
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    if (maxRate) {
      query['rentRates.daily'] = { $lte: Number(maxRate) };
    }

    let tools = await Tool.find(query).populate('owner', 'name phone email');

    // If coordinates are provided, perform Haversine distance filtering
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const maxRadius = parseFloat(radius) || 50; // default 50 km

      tools = tools.map(tool => {
        const toolLng = tool.location.coordinates[0];
        const toolLat = tool.location.coordinates[1];
        const distance = calculateDistance(userLat, userLng, toolLat, toolLng);
        
        // Average speed of tractor / farm transport is ~30 km/h
        const travelTimeMinutes = Math.round((distance / 30) * 60);

        return {
          ...tool.toObject(),
          distance: parseFloat(distance.toFixed(2)),
          travelTime: travelTimeMinutes
        };
      });

      // Filter by radius boundary
      tools = tools.filter(tool => tool.distance <= maxRadius);

      // Sort by closest distance
      tools.sort((a, b) => a.distance - b.distance);
    }

    res.json({
      success: true,
      count: tools.length,
      tools
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single tool detail
// @route   GET /api/tools/:id
// @access  Public
const getToolById = async (req, res, next) => {
  try {
    const tool = await Tool.findById(req.params.id).populate('owner', 'name phone email avatar');
    if (!tool) {
      res.status(404);
      return next(new Error('Tool not found'));
    }
    res.json({
      success: true,
      tool
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a tool listing
// @route   DELETE /api/tools/:id
// @access  Private (Tool Owner)
const deleteTool = async (req, res, next) => {
  try {
    const tool = await Tool.findById(req.params.id);
    if (!tool) {
      res.status(404);
      return next(new Error('Tool listing not found'));
    }

    if (tool.owner.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      res.status(401);
      return next(new Error('User not authorized to delete this tool'));
    }

    await tool.deleteOne();
    res.json({
      success: true,
      message: 'Tool listing removed successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTool,
  getAllTools,
  getToolById,
  deleteTool
};
