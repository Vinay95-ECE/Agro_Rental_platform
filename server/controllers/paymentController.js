const crypto = require('crypto');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');

// @desc    Create Razorpay order
// @route   POST /api/payments/create-order
// @access  Private
const createOrder = async (req, res, next) => {
  try {
    const { amount, bookingId, currency } = req.body;

    if (!amount || amount < 1) {
      res.status(400);
      return next(new Error('Valid amount is required.'));
    }

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    // If Razorpay keys are configured, use real SDK
    if (razorpayKeyId && razorpayKeyId !== 'your_razorpay_key') {
      const Razorpay = require('razorpay');
      const razorpay = new Razorpay({
        key_id: razorpayKeyId,
        key_secret: razorpayKeySecret
      });

      const options = {
        amount: Math.round(amount * 100), // paise
        currency: currency || 'INR',
        receipt: `receipt_${bookingId || Date.now()}`,
        notes: {
          bookingId: bookingId || '',
          farmerId: req.user._id.toString(),
          platform: 'AgriRent Hub'
        }
      };

      const order = await razorpay.orders.create(options);

      return res.json({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: razorpayKeyId
      });
    }

    // Demo mode — simulate order creation (no real payment)
    const mockOrderId = `order_demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    res.json({
      success: true,
      orderId: mockOrderId,
      amount: Math.round(amount * 100),
      currency: 'INR',
      keyId: 'rzp_test_demo',
      demo: true
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Razorpay payment signature
// @route   POST /api/payments/verify
// @access  Private
const verifyPayment = async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingId,
      amount
    } = req.body;

    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    // Verify signature if Razorpay is configured
    if (razorpayKeySecret && razorpayKeySecret !== 'your_razorpay_secret') {
      const expectedSig = crypto
        .createHmac('sha256', razorpayKeySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (expectedSig !== razorpay_signature) {
        res.status(400);
        return next(new Error('Payment signature verification failed. Possible fraud.'));
      }
    }

    // Save payment record
    const payment = await Payment.create({
      booking: bookingId || null,
      farmer: req.user._id,
      amount: amount || 0,
      paymentId: razorpay_payment_id || `demo_pay_${Date.now()}`,
      orderId: razorpay_order_id || `demo_order_${Date.now()}`,
      status: 'Completed'
    });

    // Update booking payment status
    if (bookingId) {
      await Booking.findByIdAndUpdate(bookingId, {
        paymentStatus: 'Paid',
        status: 'Approved'
      });
    }

    res.json({
      success: true,
      message: 'Payment verified and booking confirmed!',
      paymentId: payment._id
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get payment history for logged-in user
// @route   GET /api/payments/history
// @access  Private
const getPaymentHistory = async (req, res, next) => {
  try {
    const payments = await Payment.find({ farmer: req.user._id })
      .populate('booking')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ success: true, payments });
  } catch (error) {
    next(error);
  }
};

module.exports = { createOrder, verifyPayment, getPaymentHistory };
