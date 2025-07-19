const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const hateSpeechService = require('../services/hateSpeechDetection');
const contentModerationService = require('../services/contentModeration');
const speechToTextService = require('../services/speechToText');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
  }
});

// Analyze text for hate speech
router.post('/analyze', auth, [
  body('text').notEmpty().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { text } = req.body;
    const result = await hateSpeechService.analyzeText(text, { includeDetails: true });

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      success: true,
      analysis: result
    });

  } catch (error) {
    console.error('Text analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze text' });
  }
});

// Analyze media content
router.post('/analyze-media', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { mediaType } = req.body;
    
    if (!mediaType || !['image', 'video'].includes(mediaType)) {
      return res.status(400).json({ error: 'Invalid media type' });
    }

    const result = await contentModerationService.moderateMedia(req.file.buffer, mediaType);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      success: true,
      analysis: result
    });

  } catch (error) {
    console.error('Media analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze media' });
  }
});

// Transcribe audio
router.post('/transcribe', auth, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Validate audio format
    const validAudioTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/mp4'];
    if (!validAudioTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Invalid audio format' });
    }

    const result = await speechToTextService.transcribeAudio(req.file.buffer);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      success: true,
      transcription: result
    });

  } catch (error) {
    console.error('Audio transcription error:', error);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
});

// Analyze complete message (text + media)
router.post('/analyze-message', auth, upload.fields([
  { name: 'text', maxCount: 1 },
  { name: 'media', maxCount: 1 }
]), async (req, res) => {
  try {
    const text = req.body.text;
    const mediaFile = req.files?.media?.[0];
    const mediaType = req.body.mediaType;

    let analysis = {
      text: null,
      media: null,
      overall: {
        blocked: false,
        reasons: [],
        confidence: 0
      }
    };

    // Analyze text if provided
    if (text) {
      const textResult = await hateSpeechService.analyzeText(text);
      if (textResult.success) {
        analysis.text = textResult;
        if (textResult.detected) {
          analysis.overall.blocked = true;
          analysis.overall.reasons.push('hate_speech');
          analysis.overall.confidence = Math.max(analysis.overall.confidence, textResult.confidence);
        }
      }
    }

    // Analyze media if provided
    if (mediaFile && mediaType) {
      const mediaResult = await contentModerationService.moderateMedia(mediaFile.buffer, mediaType);
      if (mediaResult.success) {
        analysis.media = mediaResult;
        
        const moderation = mediaResult.moderation;
        if (moderation.nudity.detected) {
          analysis.overall.blocked = true;
          analysis.overall.reasons.push('nudity');
          analysis.overall.confidence = Math.max(analysis.overall.confidence, moderation.nudity.confidence);
        }
        if (moderation.violence.detected) {
          analysis.overall.blocked = true;
          analysis.overall.reasons.push('violence');
          analysis.overall.confidence = Math.max(analysis.overall.confidence, moderation.violence.confidence);
        }
        if (moderation.explicit.detected) {
          analysis.overall.blocked = true;
          analysis.overall.reasons.push('explicit_content');
          analysis.overall.confidence = Math.max(analysis.overall.confidence, moderation.explicit.confidence);
        }
      }
    }

    res.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('Message analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze message' });
  }
});

// Get moderation statistics
router.get('/statistics', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const Message = require('../models/Message');

    const stats = await Message.aggregate([
      { $match: { userId: require('mongoose').Types.ObjectId(userId) } },
      {
        $group: {
          _id: {
            status: '$moderation.status',
            reason: '$moderation.reason'
          },
          count: { $sum: 1 }
        }
      }
    ]);

    const hateSpeechStats = await Message.aggregate([
      { $match: { userId: require('mongoose').Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$moderation.hateSpeech.category',
          count: { $sum: 1 },
          avgConfidence: { $avg: '$moderation.hateSpeech.confidence' }
        }
      }
    ]);

    const mediaStats = await Message.aggregate([
      { $match: { userId: require('mongoose').Types.ObjectId(userId) } },
      {
        $group: {
          _id: {
            type: '$messageType',
            status: '$moderation.status'
          },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      statistics: {
        overall: stats,
        hateSpeech: hateSpeechStats,
        media: mediaStats
      }
    });

  } catch (error) {
    console.error('Get moderation statistics error:', error);
    res.status(500).json({ error: 'Failed to get moderation statistics' });
  }
});

// Test moderation settings
router.post('/test-settings', auth, [
  body('settings').isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { settings, testContent } = req.body;

    // Test the content against the provided settings
    let analysis = {
      blocked: false,
      reasons: [],
      confidence: 0
    };

    if (testContent.text) {
      const textResult = await hateSpeechService.analyzeText(testContent.text);
      if (textResult.success && textResult.detected && settings.hateSpeechEnabled) {
        analysis.blocked = true;
        analysis.reasons.push('hate_speech');
        analysis.confidence = Math.max(analysis.confidence, textResult.confidence);
      }
    }

    if (testContent.media && testContent.mediaType) {
      const mediaResult = await contentModerationService.moderateMedia(
        Buffer.from(testContent.media, 'base64'),
        testContent.mediaType
      );
      
      if (mediaResult.success) {
        const moderation = mediaResult.moderation;
        
        if (moderation.nudity.detected && settings.nudityEnabled) {
          analysis.blocked = true;
          analysis.reasons.push('nudity');
          analysis.confidence = Math.max(analysis.confidence, moderation.nudity.confidence);
        }
        
        if (moderation.violence.detected && settings.violenceEnabled) {
          analysis.blocked = true;
          analysis.reasons.push('violence');
          analysis.confidence = Math.max(analysis.confidence, moderation.violence.confidence);
        }
      }
    }

    res.json({
      success: true,
      testResult: analysis
    });

  } catch (error) {
    console.error('Test settings error:', error);
    res.status(500).json({ error: 'Failed to test settings' });
  }
});

module.exports = router; 