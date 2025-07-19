const mongoose = require('mongoose');

const newWordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  word: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  context: {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    originalText: String,
    surroundingText: String
  },
  detection: {
    frequency: {
      type: Number,
      default: 1
    },
    firstDetected: {
      type: Date,
      default: Date.now
    },
    lastDetected: {
      type: Date,
      default: Date.now
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5
    }
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'ignored'],
    default: 'pending'
  },
  userDecision: {
    markedAsHateSpeech: {
      type: Boolean,
      default: false
    },
    decisionDate: Date,
    decisionReason: String
  },
  aiAnalysis: {
    hateSpeechProbability: Number,
    category: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    suggestedAction: {
      type: String,
      enum: ['block', 'allow', 'review'],
      default: 'review'
    }
  },
  metadata: {
    language: {
      type: String,
      default: 'en'
    },
    dialect: String,
    culturalContext: String
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

// Compound index for efficient queries
newWordSchema.index({ userId: 1, word: 1 }, { unique: true });
newWordSchema.index({ status: 1, 'detection.frequency': -1 });
newWordSchema.index({ 'detection.lastDetected': -1 });

// Method to increment frequency
newWordSchema.methods.incrementFrequency = function() {
  this.detection.frequency += 1;
  this.detection.lastDetected = new Date();
  this.updatedAt = new Date();
  return this.save();
};

// Method to mark as hate speech
newWordSchema.methods.markAsHateSpeech = function(reason = '') {
  this.status = 'approved';
  this.userDecision.markedAsHateSpeech = true;
  this.userDecision.decisionDate = new Date();
  this.userDecision.decisionReason = reason;
  this.updatedAt = new Date();
  return this.save();
};

// Method to ignore word
newWordSchema.methods.ignoreWord = function(reason = '') {
  this.status = 'ignored';
  this.userDecision.markedAsHateSpeech = false;
  this.userDecision.decisionDate = new Date();
  this.userDecision.decisionReason = reason;
  this.updatedAt = new Date();
  return this.save();
};

// Method to reject word
newWordSchema.methods.rejectWord = function(reason = '') {
  this.status = 'rejected';
  this.userDecision.markedAsHateSpeech = false;
  this.userDecision.decisionDate = new Date();
  this.userDecision.decisionReason = reason;
  this.updatedAt = new Date();
  return this.save();
};

// Static method to find words needing review
newWordSchema.statics.findPendingReview = function(userId, limit = 10) {
  return this.find({
    userId,
    status: 'pending'
  })
  .sort({ 'detection.frequency': -1, 'detection.lastDetected': -1 })
  .limit(limit);
};

// Static method to get statistics
newWordSchema.statics.getStatistics = function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalFrequency: { $sum: '$detection.frequency' }
      }
    }
  ]);
};

// Method to get word summary
newWordSchema.methods.getSummary = function() {
  return {
    word: this.word,
    frequency: this.detection.frequency,
    status: this.status,
    confidence: this.detection.confidence,
    firstDetected: this.detection.firstDetected,
    lastDetected: this.detection.lastDetected,
    userDecision: this.userDecision,
    aiAnalysis: this.aiAnalysis
  };
};

module.exports = mongoose.model('NewWord', newWordSchema); 