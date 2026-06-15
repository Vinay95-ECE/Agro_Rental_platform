const Tool = require('../models/Tool');
const Product = require('../models/Product');
const Crop = require('../models/Crop');
const Order = require('../models/Order');
const Booking = require('../models/Booking');

// Helper: Haversine distance calculator
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// @desc    Get recommendations for a user based on history and location
const getRecommendations = async (user) => {
  try {
    const userLat = user.location.coordinates[1];
    const userLng = user.location.coordinates[0];

    // 1. Fetch user's previous activities
    const userBookings = await Booking.find({ farmer: user._id }).populate('tool');
    const userOrders = await Order.find({ buyer: user._id }).populate('items.product');

    // Determine preferred crop categories
    const rentedCategories = userBookings.map(b => b.tool ? b.tool.category : null).filter(Boolean);
    const purchasedCategories = [];
    userOrders.forEach(order => {
      order.items.forEach(item => {
        if (item.product) purchasedCategories.push(item.product.category);
      });
    });

    const preferredCategory = rentedCategories[0] || purchasedCategories[0] || 'Wheat';

    // 2. Recommend Tools near user matching preferences
    const allTools = await Tool.find({ availability: true });
    const recommendedTools = allTools
      .map(tool => {
        const dist = getDistance(userLat, userLng, tool.location.coordinates[1], tool.location.coordinates[0]);
        return { tool, distance: dist };
      })
      .filter(item => item.distance <= 25) // within 25 km
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3)
      .map(item => item.tool);

    // 3. Recommend Seeds based on location and crop preferences
    const recommendedSeeds = await Product.find({
      type: 'Seed',
      $or: [
        { category: { $regex: preferredCategory, $options: 'i' } },
        { stock: { $gt: 5 } }
      ]
    }).limit(3);

    // 4. Recommend Fertilizers matching preferred crops
    const recommendedFertilizers = await Product.find({
      type: 'Fertilizer',
      $or: [
        { category: { $regex: preferredCategory, $options: 'i' } },
        { stock: { $gt: 5 } }
      ]
    }).limit(3);

    return {
      tools: recommendedTools,
      seeds: recommendedSeeds,
      fertilizers: recommendedFertilizers
    };
  } catch (error) {
    console.error('Recommendation Engine Error:', error);
    return { tools: [], seeds: [], fertilizers: [] };
  }
};

module.exports = { getRecommendations };
