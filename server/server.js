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

// ─── App Setup ─────────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ─── Socket.io ─────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

global.io = io;

io.on('connection', (socket) => {
  console.log(`Socket Connected: ${socket.id}`);

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
  });

  socket.on('join_user', (userId) => {
    socket.join(`user_${userId}`);
  });

  socket.on('typing', ({ roomId, userId }) => {
    socket.to(roomId).emit('user_typing', { userId });
  });

  socket.on('stop_typing', ({ roomId, userId }) => {
    socket.to(roomId).emit('user_stop_typing', { userId });
  });

  socket.on('send_msg', async (data) => {
    try {
      const chatMsg = await Chat.create({
        roomId: data.roomId,
        sender: data.sender,
        receiver: data.receiver,
        message: data.message || '',
        image: data.image || '',
        voiceNote: data.voiceNote || ''
      });

      const populatedMsg = await Chat.findById(chatMsg._id)
        .populate('sender', 'name avatar')
        .populate('receiver', 'name avatar');

      io.to(data.roomId).emit('recv_msg', populatedMsg);

      // Persist notification
      const notifyMsg = `New message: ${data.message ? data.message.substring(0, 40) : 'attachment'}`;
      const notification = await Notification.create({
        user: data.receiver,
        title: 'New Message',
        message: notifyMsg,
        type: 'Message'
      });
      io.emit(`notify_${data.receiver}`, notification);
    } catch (err) {
      console.error('Socket message error:', err.message);
    }
  });

  socket.on('mark_seen', ({ roomId, userId }) => {
    socket.to(roomId).emit('messages_seen', { userId });
  });

  socket.on('disconnect', () => {
    console.log(`Socket Disconnected: ${socket.id}`);
  });
});

// ─── Database ──────────────────────────────────────────────────────────────────
connectDB();

// ─── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));
app.use(mongoSanitize());

const allowedOrigins = process.env.CLIENT_URL
  ? [process.env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:3000']
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// ─── Rate Limiting ─────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, message: 'Too many requests. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts. Please wait 15 minutes.' }
});

app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ─── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/authRoutes'));
app.use('/api/tools',         require('./routes/toolRoutes'));
app.use('/api/bookings',      require('./routes/bookingRoutes'));
app.use('/api/products',      require('./routes/productRoutes'));
app.use('/api/crops',         require('./routes/cropRoutes'));
app.use('/api/kyc',           require('./routes/kycRoutes'));
app.use('/api/ai',            require('./routes/aiRoutes'));
app.use('/api/game',          require('./routes/gameRoutes'));
app.use('/api/chat',          require('./routes/chatRoutes'));
app.use('/api/wishlist',      require('./routes/wishlistRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/disease',       require('./routes/diseaseRoutes'));
app.use('/api/payments',      require('./routes/paymentRoutes'));
app.use('/api/weather',       require('./routes/weatherRoutes'));
app.use('/api/upload',        require('./routes/uploadRoutes'));
app.use('/api/admin',         require('./routes/adminRoutes'));

// ─── Health Check ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'AgriRent Hub API is running.',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'healthy', timestamp: new Date().toISOString() });
});

// ─── Error Handling ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`\n🚀 AgriRent Hub Server v2.0 running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`📡 Socket.io enabled`);
  console.log(`🗄️  MongoDB connecting...`);
});
