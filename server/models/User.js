const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true
  },
  whatsappNumber: {
    type: String,
    required: true,
    unique: true
  },
  moderationSettings: {
    hateSpeechEnabled: {
      type: Boolean,
      default: true
    },
    nudityEnabled: {
      type: Boolean,
      default: true
    },
    violenceEnabled: {
      type: Boolean,
      default: true
    },
    autoBlock: {
      type: Boolean,
      default: true
    },
    customBlockedWords: [{
      type: String,
      trim: true
    }],
    customAllowedWords: [{
      type: String,
      trim: true
    }]
  },
  privacySettings: {
    dataRetentionDays: {
      type: Number,
      default: 90
    },
    allowDataExport: {
      type: Boolean,
      default: true
    },
    allowAnalytics: {
      type: Boolean,
      default: false
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Get public profile (without sensitive data)
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// Update moderation settings
userSchema.methods.updateModerationSettings = function(settings) {
  this.moderationSettings = { ...this.moderationSettings, ...settings };
  this.updatedAt = new Date();
  return this.save();
};

// Add custom blocked word
userSchema.methods.addBlockedWord = function(word) {
  if (!this.moderationSettings.customBlockedWords.includes(word)) {
    this.moderationSettings.customBlockedWords.push(word);
    this.updatedAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Remove custom blocked word
userSchema.methods.removeBlockedWord = function(word) {
  this.moderationSettings.customBlockedWords = 
    this.moderationSettings.customBlockedWords.filter(w => w !== word);
  this.updatedAt = new Date();
  return this.save();
};

// Add custom allowed word
userSchema.methods.addAllowedWord = function(word) {
  if (!this.moderationSettings.customAllowedWords.includes(word)) {
    this.moderationSettings.customAllowedWords.push(word);
    this.updatedAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Remove custom allowed word
userSchema.methods.removeAllowedWord = function(word) {
  this.moderationSettings.customAllowedWords = 
    this.moderationSettings.customAllowedWords.filter(w => w !== word);
  this.updatedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('User', userSchema); 