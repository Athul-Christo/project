const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const Message = require('../models/Message');
const User = require('../models/User');
const whatsappService = require('../services/whatsappService');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, audio, and documents
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/avi', 'video/mov', 'video/wmv',
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Get messages with pagination
router.get('/', auth, async (req, res) => {
  try {
    const { limit = 50, offset = 0, status, messageType } = req.query;
    const userId = req.user.userId;

    const query = { userId };
    
    if (status) {
      query['moderation.status'] = status;
    }
    
    if (messageType) {
      query.messageType = messageType;
    }

    const messages = await Message.find(query)
      .sort({ 'metadata.timestamp': -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Message.countDocuments(query);

    res.json({
      success: true,
      messages,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + messages.length
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Send text message
router.post('/send', auth, [
  body('to').isMobilePhone(),
  body('type').isIn(['text', 'image', 'video', 'audio', 'document']),
  body('content').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { to, type, content } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Send message via WhatsApp API
    let whatsappResponse;
    if (type === 'text') {
      whatsappResponse = await whatsappService.sendTextMessage(to, content);
    } else {
      return res.status(400).json({ error: 'Use /send-media for media messages' });
    }

    if (!whatsappResponse.success) {
      return res.status(400).json({ error: whatsappResponse.error });
    }

    // Create message record
    const message = new Message({
      userId: user._id,
      whatsappMessageId: whatsappResponse.messageId,
      from: user.whatsappNumber,
      to: to,
      messageType: type,
      content: { text: content },
      metadata: {
        timestamp: new Date(),
        direction: 'outbound',
        status: 'sent'
      }
    });

    await message.save();

    res.json({
      success: true,
      message: 'Message sent successfully',
      messageId: message._id,
      whatsappMessageId: whatsappResponse.messageId
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Send media message
router.post('/send-media', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { to, type } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Upload media to WhatsApp
    const uploadResponse = await whatsappService.uploadMedia(req.file.buffer, req.file.mimetype);
    
    if (!uploadResponse.success) {
      return res.status(400).json({ error: uploadResponse.error });
    }

    // Send media message
    let whatsappResponse;
    if (type === 'image') {
      whatsappResponse = await whatsappService.sendMediaMessage(to, 'image', uploadResponse.mediaId);
    } else if (type === 'video') {
      whatsappResponse = await whatsappService.sendMediaMessage(to, 'video', uploadResponse.mediaId);
    } else if (type === 'audio') {
      whatsappResponse = await whatsappService.sendMediaMessage(to, 'audio', uploadResponse.mediaId);
    } else if (type === 'document') {
      whatsappResponse = await whatsappService.sendMediaMessage(to, 'document', uploadResponse.mediaId);
    } else {
      return res.status(400).json({ error: 'Invalid media type' });
    }

    if (!whatsappResponse.success) {
      return res.status(400).json({ error: whatsappResponse.error });
    }

    // Create message record
    const message = new Message({
      userId: user._id,
      whatsappMessageId: whatsappResponse.messageId,
      from: user.whatsappNumber,
      to: to,
      messageType: type,
      content: {
        mediaId: uploadResponse.mediaId,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        fileName: req.file.originalname
      },
      metadata: {
        timestamp: new Date(),
        direction: 'outbound',
        status: 'sent'
      }
    });

    await message.save();

    res.json({
      success: true,
      message: 'Media message sent successfully',
      messageId: message._id,
      whatsappMessageId: whatsappResponse.messageId
    });

  } catch (error) {
    console.error('Send media message error:', error);
    res.status(500).json({ error: 'Failed to send media message' });
  }
});

// Delete message
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const message = await Message.findOne({ _id: id, userId });
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    await Message.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Export chat data
router.get('/export', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user allows data export
    if (!user.privacySettings.allowDataExport) {
      return res.status(403).json({ error: 'Data export not allowed' });
    }

    const messages = await Message.find({ userId })
      .sort({ 'metadata.timestamp': 1 });

    const exportData = {
      user: {
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        whatsappNumber: user.whatsappNumber
      },
      exportDate: new Date().toISOString(),
      totalMessages: messages.length,
      messages: messages.map(msg => msg.toExportFormat())
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="chat-export-${new Date().toISOString().split('T')[0]}.json"`);
    
    res.json(exportData);

  } catch (error) {
    console.error('Export chat error:', error);
    res.status(500).json({ error: 'Failed to export chat data' });
  }
});

// Get message statistics
router.get('/statistics', auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const stats = await Message.aggregate([
      { $match: { userId: require('mongoose').Types.ObjectId(userId) } },
      {
        $group: {
          _id: {
            status: '$moderation.status',
            type: '$messageType'
          },
          count: { $sum: 1 }
        }
      }
    ]);

    const totalMessages = await Message.countDocuments({ userId });
    const blockedMessages = await Message.countDocuments({ 
      userId, 
      'moderation.status': 'blocked' 
    });
    const approvedMessages = await Message.countDocuments({ 
      userId, 
      'moderation.status': 'approved' 
    });

    res.json({
      success: true,
      statistics: {
        total: totalMessages,
        blocked: blockedMessages,
        approved: approvedMessages,
        blockedPercentage: totalMessages > 0 ? (blockedMessages / totalMessages) * 100 : 0,
        breakdown: stats
      }
    });

  } catch (error) {
    console.error('Get message statistics error:', error);
    res.status(500).json({ error: 'Failed to get message statistics' });
  }
});

// Search messages
router.get('/search', auth, async (req, res) => {
  try {
    const { query, limit = 20 } = req.query;
    const userId = req.user.userId;

    if (!query) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const messages = await Message.find({
      userId,
      $or: [
        { 'content.text': { $regex: query, $options: 'i' } },
        { 'transcription.text': { $regex: query, $options: 'i' } }
      ]
    })
    .sort({ 'metadata.timestamp': -1 })
    .limit(parseInt(limit));

    res.json({
      success: true,
      messages,
      query
    });

  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({ error: 'Failed to search messages' });
  }
});

module.exports = router; 