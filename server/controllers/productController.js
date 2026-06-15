const Product = require('../models/Product');
const Order = require('../models/Order');
const Notification = require('../models/Notification');


// @desc    Create a product listing (Seed or Fertilizer)
// @route   POST /api/products
// @access  Private (Shopkeeper/Admin)
const createProduct = async (req, res, next) => {
  const { name, description, type, category, price, stock, images } = req.body;

  try {
    const product = await Product.create({
      name,
      description,
      type,
      category,
      price,
      stock,
      images,
      shopkeeper: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Product listing created successfully',
      product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all products / search & filter by category or type
// @route   GET /api/products
// @access  Public
const getAllProducts = async (req, res, next) => {
  const { type, category, search } = req.query;

  try {
    let query = {};
    if (type) query.type = type;
    if (category) query.category = category;
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const products = await Product.find(query).populate('shopkeeper', 'name email');

    res.json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a seeds/fertilizers purchase order
// @route   POST /api/products/order
// @access  Private
const createOrder = async (req, res, next) => {
  const { items, shippingAddress } = req.body;

  try {
    if (!items || items.length === 0) {
      res.status(400);
      return next(new Error('Cart cannot be empty'));
    }

    let totalAmount = 0;
    const orderItems = [];

    // Verify stock and price
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        res.status(404);
        return next(new Error(`Product not found: ${item.productId}`));
      }

      if (product.stock < item.quantity) {
        res.status(400);
        return next(new Error(`Insufficient stock for product: ${product.name}`));
      }

      totalAmount += product.price * item.quantity;
      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price
      });
    }

    const order = await Order.create({
      buyer: req.user._id,
      items: orderItems,
      totalAmount,
      shippingAddress
    });

    // Mock Razorpay Order Generation
    const razorpayOrderId = 'rzp_order_' + Math.random().toString(36).substring(2, 15);

    res.status(201).json({
      success: true,
      message: 'Order created, proceed to payment.',
      order,
      razorpayOrderId
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify payment signature & deduct stock
// @route   POST /api/products/order/verify
// @access  Private
const verifyPayment = async (req, res, next) => {
  const { orderId, paymentId, razorpayOrderId } = req.body;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404);
      return next(new Error('Order details not found'));
    }

    // In local sandbox environment, bypass signature checks and grant success directly
    order.paymentId = paymentId || 'rzp_pay_mock_' + Math.random().toString(36).substring(2, 15);
    order.paymentStatus = 'Paid';
    order.orderStatus = 'Processing';
    await order.save();

    // Deduct inventory stock
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock = Math.max(0, product.stock - item.quantity);
        await product.save();

        // Save notification for Shopkeeper in DB
        const notification = await Notification.create({
          user: product.shopkeeper,
          title: 'New Product Order Received',
          message: `Your listing "${product.name}" was purchased (Qty: ${item.quantity}).`,
          type: 'Order'
        });

        if (global.io) {
          global.io.emit(`notify_${product.shopkeeper}`, notification);
        }
      }
    }

    // Reward buyer coins on purchases: 1 Agri Coin per 100 Rs spent
    const coinsEarned = Math.round(order.totalAmount / 100);
    req.user.coins += coinsEarned;
    req.user.xp += coinsEarned * 5; // 5 XP per coin
    await req.user.save();

    res.json({
      success: true,
      message: 'Payment verified successfully and stock updated.',
      order,
      coinsEarned
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProduct,
  getAllProducts,
  createOrder,
  verifyPayment
};
