const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Message = require('../models/Message');
const NewWord = require('../models/NewWord');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update user profile
router.put('/profile', auth, [
  body('name').optional().trim().isLength({ min: 2 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('phoneNumber').optional().isMobilePhone()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { name, email, phoneNumber } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      user.email = email;
    }

    // Check if phone number is already taken by another user
    if (phoneNumber && phoneNumber !== user.phoneNumber) {
      const existingUser = await User.findOne({ phoneNumber });
      if (existingUser) {
        return res.status(400).json({ error: 'Phone number already in use' });
      }
      user.phoneNumber = phoneNumber;
    }

    if (name) user.name = name;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get user settings
router.get('/settings', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      moderationSettings: user.moderationSettings,
      privacySettings: user.privacySettings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// Update moderation settings
router.put('/settings/moderation', auth, [
  body('hateSpeechEnabled').optional().isBoolean(),
  body('nudityEnabled').optional().isBoolean(),
  body('violenceEnabled').optional().isBoolean(),
  body('autoBlock').optional().isBoolean(),
  body('customBlockedWords').optional().isArray(),
  body('customAllowedWords').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const {
      hateSpeechEnabled,
      nudityEnabled,
      violenceEnabled,
      autoBlock,
      customBlockedWords,
      customAllowedWords
    } = req.body;

    // Update settings
    if (hateSpeechEnabled !== undefined) {
      user.moderationSettings.hateSpeechEnabled = hateSpeechEnabled;
    }
    if (nudityEnabled !== undefined) {
      user.moderationSettings.nudityEnabled = nudityEnabled;
    }
    if (violenceEnabled !== undefined) {
      user.moderationSettings.violenceEnabled = violenceEnabled;
    }
    if (autoBlock !== undefined) {
      user.moderationSettings.autoBlock = autoBlock;
    }
    if (customBlockedWords) {
      user.moderationSettings.customBlockedWords = customBlockedWords;
    }
    if (customAllowedWords) {
      user.moderationSettings.customAllowedWords = customAllowedWords;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Moderation settings updated successfully',
      moderationSettings: user.moderationSettings
    });
  } catch (error) {
    console.error('Update moderation settings error:', error);
    res.status(500).json({ error: 'Failed to update moderation settings' });
  }
});

// Update privacy settings
router.put('/settings/privacy', auth, [
  body('dataRetentionDays').optional().isInt({ min: 1, max: 365 }),
  body('allowDataExport').optional().isBoolean(),
  body('allowAnalytics').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const {
      dataRetentionDays,
      allowDataExport,
      allowAnalytics
    } = req.body;

    // Update settings
    if (dataRetentionDays !== undefined) {
      user.privacySettings.dataRetentionDays = dataRetentionDays;
    }
    if (allowDataExport !== undefined) {
      user.privacySettings.allowDataExport = allowDataExport;
    }
    if (allowAnalytics !== undefined) {
      user.privacySettings.allowAnalytics = allowAnalytics;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Privacy settings updated successfully',
      privacySettings: user.privacySettings
    });
  } catch (error) {
    console.error('Update privacy settings error:', error);
    res.status(500).json({ error: 'Failed to update privacy settings' });
  }
});

// Add custom blocked word
router.post('/settings/blocked-words', auth, [
  body('word').trim().isLength({ min: 2 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { word } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.addBlockedWord(word);

    res.json({
      success: true,
      message: 'Word added to blocked list',
      customBlockedWords: user.moderationSettings.customBlockedWords
    });
  } catch (error) {
    console.error('Add blocked word error:', error);
    res.status(500).json({ error: 'Failed to add blocked word' });
  }
});

// Remove custom blocked word
router.delete('/settings/blocked-words/:word', auth, async (req, res) => {
  try {
    const { word } = req.params;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.removeBlockedWord(word);

    res.json({
      success: true,
      message: 'Word removed from blocked list',
      customBlockedWords: user.moderationSettings.customBlockedWords
    });
  } catch (error) {
    console.error('Remove blocked word error:', error);
    res.status(500).json({ error: 'Failed to remove blocked word' });
  }
});

// Add custom allowed word
router.post('/settings/allowed-words', auth, [
  body('word').trim().isLength({ min: 2 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { word } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.addAllowedWord(word);

    res.json({
      success: true,
      message: 'Word added to allowed list',
      customAllowedWords: user.moderationSettings.customAllowedWords
    });
  } catch (error) {
    console.error('Add allowed word error:', error);
    res.status(500).json({ error: 'Failed to add allowed word' });
  }
});

// Remove custom allowed word
router.delete('/settings/allowed-words/:word', auth, async (req, res) => {
  try {
    const { word } = req.params;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.removeAllowedWord(word);

    res.json({
      success: true,
      message: 'Word removed from allowed list',
      customAllowedWords: user.moderationSettings.customAllowedWords
    });
  } catch (error) {
    console.error('Remove allowed word error:', error);
    res.status(500).json({ error: 'Failed to remove allowed word' });
  }
});

// Get new words for review
router.get('/new-words', auth, async (req, res) => {
  try {
    const { limit = 10, status = 'pending' } = req.query;
    
    const newWords = await NewWord.find({
      userId: req.user.userId,
      status: status
    })
    .sort({ 'detection.frequency': -1, 'detection.lastDetected': -1 })
    .limit(parseInt(limit));

    res.json({
      success: true,
      newWords: newWords.map(word => word.getSummary())
    });
  } catch (error) {
    console.error('Get new words error:', error);
    res.status(500).json({ error: 'Failed to get new words' });
  }
});

// Review new word
router.post('/new-words/:wordId/review', auth, [
  body('action').isIn(['approve', 'reject', 'ignore']),
  body('reason').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { wordId } = req.params;
    const { action, reason = '' } = req.body;

    const newWord = await NewWord.findOne({
      _id: wordId,
      userId: req.user.userId
    });

    if (!newWord) {
      return res.status(404).json({ error: 'New word not found' });
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

    res.json({
      success: true,
      message: `Word ${action}d successfully`,
      newWord: newWord.getSummary()
    });
  } catch (error) {
    console.error('Review new word error:', error);
    res.status(500).json({ error: 'Failed to review new word' });
  }
});

// Get user statistics
router.get('/statistics', auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get message statistics
    const messageStats = await Message.aggregate([
      { $match: { userId: require('mongoose').Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$moderation.status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get new word statistics
    const newWordStats = await NewWord.aggregate([
      { $match: { userId: require('mongoose').Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalFrequency: { $sum: '$detection.frequency' }
        }
      }
    ]);

    // Get recent activity
    const recentMessages = await Message.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('messageType moderation.status createdAt');

    const recentNewWords = await NewWord.find({ userId })
      .sort({ 'detection.lastDetected': -1 })
      .limit(5)
      .select('word status detection.frequency detection.lastDetected');

    res.json({
      success: true,
      statistics: {
        messages: messageStats,
        newWords: newWordStats,
        recentActivity: {
          messages: recentMessages,
          newWords: recentNewWords
        }
      }
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Delete user account
router.delete('/account', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete all user data
    await Message.deleteMany({ userId: user._id });
    await NewWord.deleteMany({ userId: user._id });
    await User.findByIdAndDelete(user._id);

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

module.exports = router; 