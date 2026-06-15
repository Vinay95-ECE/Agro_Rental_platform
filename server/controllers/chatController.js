const Chat = require('../models/Chat');

// Helper to generate unique sorted Room ID from two user IDs
const getRoomId = (uid1, uid2) => {
  return [uid1.toString(), uid2.toString()].sort().join('_');
};

// @desc    Retrieve chat history between two users
// @route   GET /api/chat/:userId
// @access  Private
const getChatHistory = async (req, res, next) => {
  const otherUserId = req.params.userId;
  const currentUserId = req.user._id;

  try {
    const roomId = getRoomId(currentUserId, otherUserId);

    // Fetch messages
    const messages = await Chat.find({ roomId })
      .sort({ createdAt: 1 })
      .populate('sender', 'name avatar')
      .populate('receiver', 'name avatar');

    // Mark unread messages as read
    await Chat.updateMany(
      { roomId, receiver: currentUserId, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({
      success: true,
      roomId,
      messages
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit a new message via REST (as backup or for attachments)
// @route   POST /api/chat
// @access  Private
const createChatMessage = async (req, res, next) => {
  const { receiverId, message, image, voiceNote } = req.body;
  const senderId = req.user._id;

  try {
    if (!receiverId) {
      res.status(400);
      return next(new Error('Receiver ID is required'));
    }

    const roomId = getRoomId(senderId, receiverId);
    const chatMsg = await Chat.create({
      roomId,
      sender: senderId,
      receiver: receiverId,
      message,
      image: image || '',
      voiceNote: voiceNote || ''
    });

    res.status(201).json({
      success: true,
      chatMsg
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getChatHistory,
  createChatMessage
};
