const Crop = require('../models/Crop');
const Notification = require('../models/Notification');

// @desc    Create a crop listing for sale
// @route   POST /api/crops
// @access  Private (Farmer)
const createCrop = async (req, res, next) => {
  const { cropName, quantity, unit, harvestDate, price, images, coordinates } = req.body;

  try {
    const crop = await Crop.create({
      cropName,
      quantity,
      unit: unit || 'kg',
      harvestDate,
      price,
      images,
      location: {
        type: 'Point',
        coordinates: coordinates || [77.2090, 28.6139]
      },
      farmer: req.user._id
    });

    // Award XP on listing crops to incentivize participation
    req.user.xp += 20;
    await req.user.save();

    res.status(201).json({
      success: true,
      message: 'Crop listing created successfully',
      crop
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all crops / filter crops
// @route   GET /api/crops
// @access  Public
const getAllCrops = async (req, res, next) => {
  const { search, minPrice, maxPrice } = req.query;

  try {
    let query = { status: 'Available' };

    if (search) {
      query.cropName = { $regex: search, $options: 'i' };
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const crops = await Crop.find(query).populate('farmer', 'name email phone avatar');

    res.json({
      success: true,
      count: crops.length,
      crops
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Inquire / Buy a crop listing
// @route   POST /api/crops/:id/purchase
// @access  Private (Buyer)
const purchaseCrop = async (req, res, next) => {
  try {
    const crop = await Crop.findById(req.params.id).populate('farmer');
    if (!crop) {
      res.status(404);
      return next(new Error('Crop listing not found'));
    }

    if (crop.status === 'Sold') {
      res.status(400);
      return next(new Error('Crop has already been sold'));
    }

    // Flag as sold for simplicity, or generate communication room
    crop.status = 'Sold';
    await crop.save();

    // Trigger Notification to farmer
    const notification = await Notification.create({
      user: crop.farmer._id,
      title: 'Crop Listing Purchased',
      message: `${req.user.name} has purchased your crop: ${crop.cropName}.`,
      type: 'CropInquiry'
    });

    if (global.io) {
      global.io.emit(`notify_${crop.farmer._id}`, notification);
    }

    res.json({
      success: true,
      message: 'Crop purchase recorded successfully. Check notifications to contact farmer.',
      crop
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCrop,
  getAllCrops,
  purchaseCrop
};
