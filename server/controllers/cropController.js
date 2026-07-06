const Crop = require('../models/Crop');
const Notification = require('../models/Notification');
const Order = require('../models/Order');

// ─── @desc  Create crop listing ────────────────────────────────────────────────
// @route POST /api/crops  @access Private (Farmer, Admin)
const createCrop = async (req, res, next) => {
  const {
    cropName, variety, quantity, unit, harvestDate, price,
    images, description, latitude, longitude,
    village, district, state, organic, qualityGrade
  } = req.body;

  try {
    if (!cropName || !quantity || !harvestDate || !price) {
      res.status(400);
      return next(new Error('Crop name, quantity, harvest date, and price are required.'));
    }

    if (!images || !Array.isArray(images) || images.filter(Boolean).length === 0) {
      res.status(400);
      return next(new Error('At least one crop image is required. Please upload a photo of your crop.'));
    }

    const lng = parseFloat(longitude) || 77.2090;
    const lat = parseFloat(latitude) || 28.6139;

    const crop = await Crop.create({
      cropName: cropName.trim(),
      variety: variety || '',
      quantity: Number(quantity),
      unit: unit || 'kg',
      harvestDate: new Date(harvestDate),
      price: Number(price),
      images: images.filter(Boolean),
      description: description || '',
      location: { type: 'Point', coordinates: [lng, lat] },
      village: village || req.user.village || '',
      district: district || req.user.district || '',
      state: state || req.user.state || '',
      farmer: req.user._id,
      organic: Boolean(organic),
      qualityGrade: qualityGrade || ''
    });

    // Award XP for listing crops
    const User = require('../models/User');
    await User.findByIdAndUpdate(req.user._id, { $inc: { xp: 20 } });

    const populated = await Crop.findById(crop._id).populate('farmer', 'name email phone avatar village');

    res.status(201).json({
      success: true,
      message: 'Crop listed successfully! Buyers can now find your listing.',
      crop: populated
    });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Get all crops with filters ────────────────────────────────────────
// @route GET /api/crops  @access Public
const getAllCrops = async (req, res, next) => {
  const { search, minPrice, maxPrice, unit, organic, lat, lng, radius } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  try {
    let query = { status: 'Available' };

    if (search) {
      query.$or = [
        { cropName: { $regex: search, $options: 'i' } },
        { variety: { $regex: search, $options: 'i' } },
        { village: { $regex: search, $options: 'i' } }
      ];
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (unit) query.unit = unit;
    if (organic === 'true') query.organic = true;

    let crops = await Crop.find(query)
      .populate('farmer', 'name email phone avatar village district kycStatus')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Crop.countDocuments(query);

    // Geo-filter if coordinates provided
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const maxRadius = parseFloat(radius) || 100;

      crops = crops.map(c => {
        const cLng = c.location?.coordinates?.[0] || 77.2090;
        const cLat = c.location?.coordinates?.[1] || 28.6139;
        const R = 6371;
        const dLat = (cLat - userLat) * Math.PI / 180;
        const dLon = (cLng - userLng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(userLat * Math.PI / 180) * Math.cos(cLat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return { ...c, distance: parseFloat(distance.toFixed(2)) };
      }).filter(c => c.distance <= maxRadius).sort((a, b) => a.distance - b.distance);
    }

    res.json({ success: true, count: crops.length, total, pages: Math.ceil(total / limit), crops });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Get farmer's own crops ────────────────────────────────────────────
// @route GET /api/crops/my-crops  @access Private
const getMyCrops = async (req, res, next) => {
  try {
    const crops = await Crop.find({ farmer: req.user._id })
      .sort({ createdAt: -1 });
    res.json({ success: true, count: crops.length, crops });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Get single crop ────────────────────────────────────────────────────
// @route GET /api/crops/:id  @access Public
const getCropById = async (req, res, next) => {
  try {
    const crop = await Crop.findById(req.params.id)
      .populate('farmer', 'name email phone avatar village district state kycStatus');
    if (!crop) {
      res.status(404);
      return next(new Error('Crop listing not found.'));
    }
    await Crop.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });
    res.json({ success: true, crop });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Update crop listing ───────────────────────────────────────────────
// @route PUT /api/crops/:id  @access Private
const updateCrop = async (req, res, next) => {
  try {
    const crop = await Crop.findById(req.params.id);
    if (!crop) {
      res.status(404);
      return next(new Error('Crop not found.'));
    }
    if (crop.farmer.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      res.status(403);
      return next(new Error('Not authorized to update this listing.'));
    }

    const { cropName, variety, quantity, unit, harvestDate, price, images, description, organic, qualityGrade } = req.body;
    if (cropName) crop.cropName = cropName.trim();
    if (variety !== undefined) crop.variety = variety;
    if (quantity) crop.quantity = Number(quantity);
    if (unit) crop.unit = unit;
    if (harvestDate) crop.harvestDate = new Date(harvestDate);
    if (price) crop.price = Number(price);
    if (images && images.length > 0) crop.images = images.filter(Boolean);
    if (description !== undefined) crop.description = description;
    if (organic !== undefined) crop.organic = Boolean(organic);
    if (qualityGrade !== undefined) crop.qualityGrade = qualityGrade;

    await crop.save();
    res.json({ success: true, message: 'Crop listing updated.', crop });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Purchase crop ─────────────────────────────────────────────────────
// @route POST /api/crops/:id/purchase  @access Private
const purchaseCrop = async (req, res, next) => {
  try {
    const crop = await Crop.findById(req.params.id).populate('farmer');
    if (!crop) {
      res.status(404);
      return next(new Error('Crop listing not found.'));
    }
    if (crop.status === 'Sold') {
      res.status(400);
      return next(new Error('This crop has already been sold.'));
    }
    if (crop.farmer._id.toString() === req.user._id.toString()) {
      res.status(400);
      return next(new Error('You cannot purchase your own crop listing.'));
    }

    const { quantity: requestedQty } = req.body;
    const purchaseQty = requestedQty ? Math.min(Number(requestedQty), crop.quantity) : crop.quantity;

    // Create order record
    const order = await Order.create({
      buyer: req.user._id,
      seller: crop.farmer._id,
      cropId: crop._id,
      cropName: crop.cropName,
      quantity: purchaseQty,
      unit: crop.unit,
      totalAmount: purchaseQty * crop.price,
      status: 'Pending'
    });

    // Mark sold if full quantity taken
    if (purchaseQty >= crop.quantity) {
      crop.status = 'Sold';
    } else {
      crop.quantity -= purchaseQty;
    }
    await crop.save();

    // Notify farmer
    const notification = await Notification.create({
      user: crop.farmer._id,
      title: 'Crop Purchase Request',
      message: `${req.user.name} wants to buy ${purchaseQty} ${crop.unit} of ${crop.cropName} for ₹${order.totalAmount}.`,
      type: 'Order'
    });
    if (global.io) global.io.emit(`notify_${crop.farmer._id}`, notification);

    res.json({
      success: true,
      message: 'Purchase request sent! Farmer will contact you to confirm.',
      order,
      crop
    });
  } catch (error) {
    next(error);
  }
};

// ─── @desc  Delete crop listing ───────────────────────────────────────────────
// @route DELETE /api/crops/:id  @access Private
const deleteCrop = async (req, res, next) => {
  try {
    const crop = await Crop.findById(req.params.id);
    if (!crop) {
      res.status(404);
      return next(new Error('Crop listing not found.'));
    }
    if (crop.farmer.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      res.status(403);
      return next(new Error('Not authorized to delete this listing.'));
    }
    await crop.deleteOne();
    res.json({ success: true, message: 'Crop listing deleted.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { createCrop, getAllCrops, getMyCrops, getCropById, updateCrop, purchaseCrop, deleteCrop };
