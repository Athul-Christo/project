const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const NewWord = require('../models/NewWord');

const setupSocketHandlers = (io) => {
  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (!user || !user.isActive) {
        return next(new Error('User not found or inactive'));
      }

      socket.userId = decoded.userId;
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);

    // Join user's room for private messages
    socket.join(`user:${socket.userId}`);

    // Handle new message
    socket.on('send_message', async (data) => {
      try {
        const { to, type, content } = data;
        
        // Validate message data
        if (!to || !type || !content) {
          socket.emit('error', { message: 'Invalid message data' });
          return;
        }

        // Create message record
        const message = new Message({
          userId: socket.userId,
          from: socket.user.whatsappNumber,
          to: to,
          messageType: type,
          content: type === 'text' ? { text: content } : content,
          metadata: {
            timestamp: new Date(),
            direction: 'outbound',
            status: 'sending'
          }
        });

        await message.save();

        // Emit to sender
        socket.emit('message_sent', {
          messageId: message._id,
          whatsappMessageId: message.whatsappMessageId,
          timestamp: message.metadata.timestamp
        });

        // Emit to user's room
        io.to(`user:${socket.userId}`).emit('new_message', message);

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle message status updates
    socket.on('message_status', async (data) => {
      try {
        const { messageId, status } = data;
        
        const message = await Message.findOne({ 
          _id: messageId, 
          userId: socket.userId 
        });

        if (message) {
          message.metadata.status = status;
          await message.save();

          // Emit status update to user
          io.to(`user:${socket.userId}`).emit('message_status_update', {
            messageId: message._id,
            status: status
          });
        }

      } catch (error) {
        console.error('Message status update error:', error);
        socket.emit('error', { message: 'Failed to update message status' });
      }
    });

    // Handle moderation updates
    socket.on('moderation_update', async (data) => {
      try {
        const { messageId, moderation } = data;
        
        const message = await Message.findOne({ 
          _id: messageId, 
          userId: socket.userId 
        });

        if (message) {
          message.moderation = { ...message.moderation, ...moderation };
          await message.save();

          // Emit moderation update to user
          io.to(`user:${socket.userId}`).emit('moderation_update', {
            messageId: message._id,
            moderation: message.moderation
          });
        }

      } catch (error) {
        console.error('Moderation update error:', error);
        socket.emit('error', { message: 'Failed to update moderation' });
      }
    });

    // Handle new word detection
    socket.on('new_word_detected', async (data) => {
      try {
        const { word, context, confidence } = data;
        
        // Check if word already exists
        let newWord = await NewWord.findOne({
          userId: socket.userId,
          word: word.toLowerCase()
        });

        if (!newWord) {
          newWord = new NewWord({
            userId: socket.userId,
            word: word.toLowerCase(),
            context: context,
            detection: {
              frequency: 1,
              confidence: confidence || 0.5
            }
          });
          await newWord.save();
        } else {
          await newWord.incrementFrequency();
        }

        // Emit to user if word needs review
        if (newWord.status === 'pending') {
          io.to(`user:${socket.userId}`).emit('new_word_detected', {
            wordId: newWord._id,
            word: newWord.word,
            frequency: newWord.detection.frequency,
            confidence: newWord.detection.confidence
          });
        }

      } catch (error) {
        console.error('New word detection error:', error);
        socket.emit('error', { message: 'Failed to process new word' });
      }
    });

    // Handle word review
    socket.on('review_word', async (data) => {
      try {
        const { wordId, action, reason } = data;
        
        const newWord = await NewWord.findOne({
          _id: wordId,
          userId: socket.userId
        });

        if (!newWord) {
          socket.emit('error', { message: 'Word not found' });
          return;
        }

        switch (action) {
          case 'approve':
            await newWord.markAsHateSpeech(reason);
            break;
          case 'reject':
            await newWord.rejectWord(reason);
            break;
          case 'ignore':
            await newWord.ignoreWord(reason);
            break;
        }

        // Emit review result to user
        io.to(`user:${socket.userId}`).emit('word_reviewed', {
          wordId: newWord._id,
          word: newWord.word,
          status: newWord.status
        });

      } catch (error) {
        console.error('Word review error:', error);
        socket.emit('error', { message: 'Failed to review word' });
      }
    });

    // Handle settings updates
    socket.on('settings_update', async (data) => {
      try {
        const { type, settings } = data;
        
        const user = await User.findById(socket.userId);
        if (!user) {
          socket.emit('error', { message: 'User not found' });
          return;
        }

        if (type === 'moderation') {
          user.moderationSettings = { ...user.moderationSettings, ...settings };
        } else if (type === 'privacy') {
          user.privacySettings = { ...user.privacySettings, ...settings };
        }

        await user.save();

        // Emit settings update to user
        io.to(`user:${socket.userId}`).emit('settings_updated', {
          type: type,
          settings: type === 'moderation' ? user.moderationSettings : user.privacySettings
        });

      } catch (error) {
        console.error('Settings update error:', error);
        socket.emit('error', { message: 'Failed to update settings' });
      }
    });

    // Handle typing indicators
    socket.on('typing_start', () => {
      socket.broadcast.to(`user:${socket.userId}`).emit('user_typing', {
        userId: socket.userId,
        typing: true
      });
    });

    socket.on('typing_stop', () => {
      socket.broadcast.to(`user:${socket.userId}`).emit('user_typing', {
        userId: socket.userId,
        typing: false
      });
    });

    // Handle connection status
    socket.on('ping', () => {
      socket.emit('pong');
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });

  // Broadcast functions for server-side events
  const broadcastToUser = (userId, event, data) => {
    io.to(`user:${userId}`).emit(event, data);
  };

  const broadcastNewMessage = (userId, message) => {
    io.to(`user:${userId}`).emit('new_message', message);
  };

  const broadcastMessageBlocked = (userId, messageId, reason) => {
    io.to(`user:${userId}`).emit('message_blocked', {
      messageId: messageId,
      reason: reason
    });
  };

  const broadcastNewWord = (userId, wordData) => {
    io.to(`user:${userId}`).emit('new_word_detected', wordData);
  };

  // Export broadcast functions
  io.broadcastToUser = broadcastToUser;
  io.broadcastNewMessage = broadcastNewMessage;
  io.broadcastMessageBlocked = broadcastMessageBlocked;
  io.broadcastNewWord = broadcastNewWord;
};

module.exports = { setupSocketHandlers }; 