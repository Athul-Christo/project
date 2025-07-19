const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsappService');
const speechToTextService = require('../services/speechToText');
const hateSpeechService = require('../services/hateSpeechDetection');
const contentModerationService = require('../services/contentModeration');
const Message = require('../models/Message');
const User = require('../models/User');
const NewWord = require('../models/NewWord');

// WhatsApp webhook verification
router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('✅ WhatsApp webhook verified');
    res.status(200).send(challenge);
  } else {
    console.log('❌ WhatsApp webhook verification failed');
    res.status(403).send('Forbidden');
  }
});

// WhatsApp webhook for incoming messages
router.post('/whatsapp', async (req, res) => {
  try {
    // Verify webhook signature
    const signature = req.headers['x-hub-signature-256'];
    const payload = JSON.stringify(req.body);
    
    if (!whatsappService.verifySignature(payload, signature)) {
      console.log('❌ Invalid webhook signature');
      return res.status(401).send('Unauthorized');
    }

    // Process webhook
    const webhookData = whatsappService.processWebhook(req.body);
    
    if (!webhookData.success) {
      console.log('❌ Failed to process webhook:', webhookData.error);
      return res.status(400).json({ error: webhookData.error });
    }

    // Process each message
    for (const messageData of webhookData.messages) {
      await processIncomingMessage(messageData);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Process incoming message through moderation pipeline
async function processIncomingMessage(messageData) {
  try {
    console.log(`📥 Processing message: ${messageData.id} from ${messageData.from}`);

    // Find user by WhatsApp number
    const user = await User.findOne({ whatsappNumber: messageData.to });
    if (!user) {
      console.log(`❌ User not found for number: ${messageData.to}`);
      return;
    }

    // Create message record
    const message = new Message({
      userId: user._id,
      whatsappMessageId: messageData.id,
      from: messageData.from,
      to: messageData.to,
      messageType: messageData.type,
      content: extractContent(messageData),
      metadata: {
        timestamp: messageData.timestamp,
        direction: 'inbound',
        status: 'received'
      }
    });

    // Process based on message type
    let moderationResult = { status: 'approved' };

    if (messageData.type === 'text') {
      moderationResult = await processTextMessage(message, user);
    } else if (messageData.type === 'audio') {
      moderationResult = await processAudioMessage(message, user);
    } else if (messageData.type === 'image' || messageData.type === 'video') {
      moderationResult = await processMediaMessage(message, user);
    }

    // Update message with moderation results
    message.moderation = moderationResult;
    await message.save();

    // Handle message based on moderation result
    if (moderationResult.status === 'blocked') {
      await handleBlockedMessage(message, user);
    } else {
      await handleApprovedMessage(message, user);
    }

    console.log(`✅ Message processed: ${messageData.id} - Status: ${moderationResult.status}`);

  } catch (error) {
    console.error('❌ Error processing message:', error);
  }
}

// Process text message
async function processTextMessage(message, user) {
  const text = message.content.text;
  
  // Check user's custom blocked words
  const customBlockedWords = user.moderationSettings.customBlockedWords;
  const hasBlockedWords = customBlockedWords.some(word => 
    text.toLowerCase().includes(word.toLowerCase())
  );

  if (hasBlockedWords) {
    return {
      status: 'blocked',
      reason: 'custom_word',
      hateSpeech: { detected: true, confidence: 1.0, category: 'custom' }
    };
  }

  // Check user's custom allowed words
  const customAllowedWords = user.moderationSettings.customAllowedWords;
  const hasAllowedWords = customAllowedWords.some(word => 
    text.toLowerCase().includes(word.toLowerCase())
  );

  if (hasAllowedWords) {
    return { status: 'approved' };
  }

  // AI hate speech detection
  const hateSpeechResult = await hateSpeechService.detectHateSpeech(text);
  
  if (!hateSpeechResult.success) {
    return { status: 'error', reason: 'hate_speech_detection_failed' };
  }

  if (hateSpeechResult.detected && user.moderationSettings.hateSpeechEnabled) {
    return {
      status: 'blocked',
      reason: 'hate_speech',
      hateSpeech: {
        detected: true,
        confidence: hateSpeechResult.confidence,
        category: hateSpeechResult.primaryCategory
      }
    };
  }

  // Check for new words that might be hate speech
  await checkForNewWords(text, user);

  return { status: 'approved' };
}

// Process audio message
async function processAudioMessage(message, user) {
  try {
    // Download audio from WhatsApp
    const audioResult = await whatsappService.downloadMedia(message.content.mediaId);
    
    if (!audioResult.success) {
      return { status: 'error', reason: 'audio_download_failed' };
    }

    // Transcribe audio
    const transcriptionResult = await speechToTextService.transcribeAudio(audioResult.data);
    
    if (!transcriptionResult.success) {
      return { status: 'error', reason: 'transcription_failed' };
    }

    // Update message with transcription
    message.transcription = {
      text: transcriptionResult.text,
      confidence: transcriptionResult.confidence || 0.8,
      language: transcriptionResult.language || 'en'
    };

    // Process transcribed text
    const textModeration = await processTextMessage(message, user);
    
    if (textModeration.status === 'blocked') {
      return {
        ...textModeration,
        transcription: message.transcription
      };
    }

    return { status: 'approved', transcription: message.transcription };

  } catch (error) {
    console.error('Error processing audio message:', error);
    return { status: 'error', reason: 'audio_processing_failed' };
  }
}

// Process media message (image/video)
async function processMediaMessage(message, user) {
  try {
    // Download media from WhatsApp
    const mediaResult = await whatsappService.downloadMedia(message.content.mediaId);
    
    if (!mediaResult.success) {
      return { status: 'error', reason: 'media_download_failed' };
    }

    // Moderate media content
    const moderationResult = await contentModerationService.moderateMedia(
      mediaResult.data, 
      message.messageType
    );

    if (!moderationResult.success) {
      return { status: 'error', reason: 'media_moderation_failed' };
    }

    const moderation = moderationResult.moderation;
    let shouldBlock = false;
    let reason = '';

    // Check nudity
    if (moderation.nudity.detected && user.moderationSettings.nudityEnabled) {
      shouldBlock = true;
      reason = 'nudity';
    }

    // Check violence
    if (moderation.violence.detected && user.moderationSettings.violenceEnabled) {
      shouldBlock = true;
      reason = 'violence';
    }

    // Check explicit content
    if (moderation.explicit.detected) {
      shouldBlock = true;
      reason = 'explicit_content';
    }

    if (shouldBlock) {
      return {
        status: 'blocked',
        reason: reason,
        contentModeration: moderation
      };
    }

    return { status: 'approved', contentModeration: moderation };

  } catch (error) {
    console.error('Error processing media message:', error);
    return { status: 'error', reason: 'media_processing_failed' };
  }
}

// Handle blocked message
async function handleBlockedMessage(message, user) {
  if (user.moderationSettings.autoBlock) {
    // Send automated response explaining why message was blocked
    const response = await whatsappService.sendModerationResponse(
      message.from,
      message.moderation.reason,
      message.messageType
    );

    if (response.success) {
      message.response = {
        sent: true,
        messageId: response.messageId,
        content: response.data,
        sentAt: new Date()
      };
      await message.save();
    }
  }
}

// Handle approved message
async function handleApprovedMessage(message, user) {
  // Update message status
  message.metadata.status = 'delivered';
  await message.save();

  // Emit real-time update to user's connected clients
  // This would be handled by Socket.IO in a real implementation
  console.log(`✅ Message approved: ${message.whatsappMessageId}`);
}

// Check for new words that might be hate speech
async function checkForNewWords(text, user) {
  const words = text.toLowerCase().split(/\s+/);
  const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
  
  for (const word of words) {
    const cleanWord = word.replace(/[^\w]/g, '');
    
    if (cleanWord.length > 2 && !commonWords.includes(cleanWord)) {
      // Check if this word appears frequently in blocked messages
      const blockedMessages = await Message.find({
        userId: user._id,
        'moderation.status': 'blocked',
        'content.text': { $regex: cleanWord, $options: 'i' }
      });

      if (blockedMessages.length >= 3) {
        // Check if word is already tracked
        let newWord = await NewWord.findOne({
          userId: user._id,
          word: cleanWord
        });

        if (!newWord) {
          newWord = new NewWord({
            userId: user._id,
            word: cleanWord,
            context: {
              originalText: text,
              surroundingText: text
            },
            detection: {
              frequency: blockedMessages.length,
              confidence: 0.7
            }
          });
          await newWord.save();
        } else {
          await newWord.incrementFrequency();
        }
      }
    }
  }
}

// Extract content from message data
function extractContent(messageData) {
  const content = {};

  if (messageData.text) {
    content.text = messageData.text;
  }

  if (messageData.image) {
    content.mediaId = messageData.image.id;
    content.mediaUrl = messageData.image.link;
    content.mimeType = messageData.image.mime_type;
    content.fileSize = messageData.image.file_size;
    content.thumbnailUrl = messageData.image.thumbnail_url;
  }

  if (messageData.video) {
    content.mediaId = messageData.video.id;
    content.mediaUrl = messageData.video.link;
    content.mimeType = messageData.video.mime_type;
    content.fileSize = messageData.video.file_size;
    content.duration = messageData.video.duration;
    content.thumbnailUrl = messageData.video.thumbnail_url;
  }

  if (messageData.audio) {
    content.mediaId = messageData.audio.id;
    content.mediaUrl = messageData.audio.link;
    content.mimeType = messageData.audio.mime_type;
    content.fileSize = messageData.audio.file_size;
    content.duration = messageData.audio.duration;
  }

  if (messageData.document) {
    content.mediaId = messageData.document.id;
    content.mediaUrl = messageData.document.link;
    content.mimeType = messageData.document.mime_type;
    content.fileSize = messageData.document.file_size;
    content.fileName = messageData.document.filename;
  }

  return content;
}

module.exports = router; 