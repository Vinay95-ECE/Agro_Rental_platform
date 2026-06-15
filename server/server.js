require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const Chat = require('./models/Chat');
const Notification = require('./models/Notification');

// Initialize Express App
const app = express();
const server = http.createServer(app);

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Configure Socket.io actions
global.io = io; // Share Socket.io globally
io.on('connection', (socket) => {
  console.log(`Socket Connected: ${socket.id}`);

  // Join Room
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room: ${roomId}`);
  });

  // Handle Messages
  socket.on('send_msg', async (data) => {
    // data: { roomId, sender, receiver, message, image, voiceNote }
    try {
      const chatMsg = await Chat.create({
        roomId: data.roomId,
        sender: data.sender,
        receiver: data.receiver,
        message: data.message || '',
        image: data.image || '',
        voiceNote: data.voiceNote || ''
      });

      // Populate sender and receiver for client consumption
      const populatedMsg = await Chat.findById(chatMsg._id)
        .populate('sender', 'name avatar')
        .populate('receiver', 'name avatar');

      io.to(data.roomId).emit('recv_msg', populatedMsg);
      
      // Save notification to DB
      const notifyMsg = `You received a message: ${data.message ? data.message.substring(0, 30) : 'attachment'}`;
      const notification = await Notification.create({
        user: data.receiver,
        title: 'New Message',
        message: notifyMsg,
        type: 'Message'
      });
      
      // Broadcast notification trigger to receiver
      io.emit(`notify_${data.receiver}`, notification);
    } catch (err) {
      console.error('Socket message processing error:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Socket Disconnected: ${socket.id}`);
  });
});

// Connect Database
connectDB();

// Middlewares
app.use(helmet());
app.use(mongoSanitize());
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', apiLimiter);

// Route Imports
const authRoutes = require('./routes/authRoutes');
const toolRoutes = require('./routes/toolRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const productRoutes = require('./routes/productRoutes');
const cropRoutes = require('./routes/cropRoutes');
const kycRoutes = require('./routes/kycRoutes');
const aiRoutes = require('./routes/aiRoutes');
const gameRoutes = require('./routes/gameRoutes');
const chatRoutes = require('./routes/chatRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Bind Routes
app.use('/api/auth', authRoutes);
app.use('/api/tools', toolRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/products', productRoutes);
app.use('/api/crops', cropRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/notifications', notificationRoutes);

// Base Route
app.get('/', (req, res) => {
  res.json({ message: 'AgriRent Hub API is running smoothly.' });
});

// Error Handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
