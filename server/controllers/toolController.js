const Tool = require('../models/Tool');
const Notification = require('../models/Notification');

// ─── Haversine distance ────────────────────────────────────────────────────────
const calcDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ─── @desc  Create tool listing ────────────────────────────────────────────────
// @route POST /api/tools  @access Private (Tool Owner, Admin)
const createTool = async (req, res, next) => {
  try {
    const {
      name, description, category, images,
      rentRates, specifications,
      village, district, state, address,
      latitude, longitude
    } = req.body;

    if (!name || !description || !category) {
      res.status(400);
      return next(new Error('Name, description, and category are required.'));
    }
    if (!rentRates?.daily || Number(rentRates.daily) <= 0) {
      res.status(400);
      return next(new Error('Daily rent rate is required and must be greater than 0.'));
    }

    const daily  = Number(rentRates.daily);
    const weekly = Number(rentRates.weekly)  || Math.round(daily * 6);
    const monthly = Number(rentRates.monthly) || Math.round(daily * 22);

    // Parse coordinates from body (sent as strings from form)
    const lng = parseFloat(longitude) || 77.2090;
    const lat = parseFloat(latitude) || 28.6139;

    const tool = await Tool.create({
      name: name.trim(),
      description: description.trim(),
      category,
      images: Array.isArray(images) ? images.filter(Boolean) : [],
      owner: req.user._id,
      village: village || '',
      district: district || '',
      state: state || '',
      address: address || '',
      location: { type: 'Point', coordinates: [lng, lat] },
      rentRates: { daily, weekly, monthly },
      specifications: {
        power: specifications?.power || '',
        fuelType: specifications?.fuelType || 'Diesel',
        weight: specifications?.weight || '',
        capacity: specifications?.capacity || '',
        yearOfMfg: specifications?.yearOfMfg || '',
        brand: specifications?.brand || ''
      },
      status: 'Active'
    });

    const populated = await Tool.findById(tool._id).populate('owner', 'name phone email avatar village');

    res.status(201).json({
      success: true,
      message: 'Tool listed successfully! It is now visible in the marketplace.',
      tool: populated
    });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Get all tools with search/filter/geo ──────────────────────────────
// @route GET /api/tools  @access Public
const getAllTools = async (req, res, next) => {
  const { search, category, maxRate, minRate, lat, lng, radius, availability } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  try {
    let query = { status: 'Active' };

    // Only filter by availability if explicitly requested
    if (availability !== undefined) {
      query.availability = availability === 'true';
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { village: { $regex: search, $options: 'i' } },
        { district: { $regex: search, $options: 'i' } }
      ];
    }

    if (maxRate) {
      query['rentRates.daily'] = { ...query['rentRates.daily'], $lte: Number(maxRate) };
    }
    if (minRate) {
      query['rentRates.daily'] = { ...query['rentRates.daily'], $gte: Number(minRate) };
    }

    let tools = await Tool.find(query)
      .populate('owner', 'name phone email avatar village district kycStatus')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Tool.countDocuments(query);

    // Geo-filtering with Haversine if coordinates provided
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const maxRadius = parseFloat(radius) || 100;

      tools = tools.map(tool => {
        const toolLng = tool.location?.coordinates?.[0] || 77.2090;
        const toolLat = tool.location?.coordinates?.[1] || 28.6139;
        const distance = calcDistance(userLat, userLng, toolLat, toolLng);
        const travelTime = Math.round((distance / 30) * 60);
        return { ...tool, distance: parseFloat(distance.toFixed(2)), travelTime };
      });

      tools = tools.filter(t => t.distance <= maxRadius);
      tools.sort((a, b) => a.distance - b.distance);
    }

    res.json({
      success: true,
      count: tools.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      tools
    });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Get owner's tools ─────────────────────────────────────────────────
// @route GET /api/tools/my-tools  @access Private
const getMyTools = async (req, res, next) => {
  try {
    const tools = await Tool.find({ owner: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, count: tools.length, tools });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Get single tool ───────────────────────────────────────────────────
// @route GET /api/tools/:id  @access Public
const getToolById = async (req, res, next) => {
  try {
    const tool = await Tool.findById(req.params.id)
      .populate('owner', 'name phone email avatar village district state kycStatus');

    if (!tool) {
      res.status(404);
      return next(new Error('Tool not found.'));
    }

    // Increment view count
    await Tool.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });

    res.json({ success: true, tool });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Update tool ───────────────────────────────────────────────────────
// @route PUT /api/tools/:id  @access Private (Owner, Admin)
const updateTool = async (req, res, next) => {
  try {
    const tool = await Tool.findById(req.params.id);
    if (!tool) {
      res.status(404);
      return next(new Error('Tool not found.'));
    }

    if (tool.owner.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      res.status(403);
      return next(new Error('Not authorized to update this tool.'));
    }

    const { name, description, category, images, rentRates, specifications,
      village, district, state, address, latitude, longitude, availability } = req.body;

    if (name) tool.name = name.trim();
    if (description) tool.description = description.trim();
    if (category) tool.category = category;
    if (images) tool.images = images.filter(Boolean);
    if (village !== undefined) tool.village = village;
    if (district !== undefined) tool.district = district;
    if (state !== undefined) tool.state = state;
    if (address !== undefined) tool.address = address;
    if (availability !== undefined) tool.availability = Boolean(availability);

    if (latitude && longitude) {
      tool.location = { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] };
    }

    if (rentRates) {
      if (rentRates.daily) tool.rentRates.daily = Number(rentRates.daily);
      if (rentRates.weekly) tool.rentRates.weekly = Number(rentRates.weekly);
      if (rentRates.monthly) tool.rentRates.monthly = Number(rentRates.monthly);
    }

    if (specifications) {
      tool.specifications = { ...tool.specifications, ...specifications };
    }

    await tool.save();
    const populated = await Tool.findById(tool._id).populate('owner', 'name phone email avatar');
    res.json({ success: true, message: 'Tool updated successfully.', tool: populated });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Toggle availability ───────────────────────────────────────────────
// @route PATCH /api/tools/:id/availability  @access Private (Owner)
const toggleAvailability = async (req, res, next) => {
  try {
    const tool = await Tool.findById(req.params.id);
    if (!tool) {
      res.status(404);
      return next(new Error('Tool not found.'));
    }
    if (tool.owner.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      res.status(403);
      return next(new Error('Not authorized.'));
    }
    tool.availability = !tool.availability;
    await tool.save();
    res.json({
      success: true,
      message: `Tool is now ${tool.availability ? 'Available' : 'Unavailable'}.`,
      availability: tool.availability
    });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Delete tool ───────────────────────────────────────────────────────
// @route DELETE /api/tools/:id  @access Private (Owner, Admin)
const deleteTool = async (req, res, next) => {
  try {
    const tool = await Tool.findById(req.params.id);
    if (!tool) {
      res.status(404);
      return next(new Error('Tool not found.'));
    }
    if (tool.owner.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      res.status(403);
      return next(new Error('Not authorized to delete this tool.'));
    }
    await tool.deleteOne();
    res.json({ success: true, message: 'Tool deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTool,
  getAllTools,
  getMyTools,
  getToolById,
  updateTool,
  toggleAvailability,
  deleteTool
};
