const Wishlist = require('../models/Wishlist');

// @desc    Get user's wishlist
// @route   GET /api/wishlist
// @access  Private
const getWishlist = async (req, res, next) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.user._id })
      .populate('tools')
      .populate('products')
      .populate('crops');

    if (!wishlist) {
      // Create empty wishlist if it doesn't exist
      wishlist = await Wishlist.create({
        user: req.user._id,
        tools: [],
        products: [],
        crops: []
      });
    }

    res.json({
      success: true,
      wishlist
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle item in wishlist (Add/Remove)
// @route   POST /api/wishlist/toggle
// @access  Private
const toggleWishlistItem = async (req, res, next) => {
  const { targetId, itemType } = req.body; // itemType: 'tools', 'products', 'crops'

  try {
    if (!targetId || !['tools', 'products', 'crops'].includes(itemType)) {
      res.status(400);
      return next(new Error('Please provide valid targetId and itemType (tools, products, crops).'));
    }

    let wishlist = await Wishlist.findOne({ user: req.user._id });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        user: req.user._id,
        tools: [],
        products: [],
        crops: []
      });
    }

    const array = wishlist[itemType];
    const index = array.indexOf(targetId);

    if (index > -1) {
      // Remove item
      array.splice(index, 1);
    } else {
      // Add item
      array.push(targetId);
    }

    await wishlist.save();
    
    const updatedWishlist = await Wishlist.findById(wishlist._id)
      .populate('tools')
      .populate('products')
      .populate('crops');

    res.json({
      success: true,
      message: index > -1 ? 'Item removed from wishlist' : 'Item added to wishlist',
      wishlist: updatedWishlist
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWishlist,
  toggleWishlistItem
};
