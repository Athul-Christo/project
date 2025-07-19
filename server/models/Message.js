const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  whatsappMessageId: {
    type: String,
    required: true,
    unique: true
  },
  from: {
    type: String,
    required: true
  },
  to: {
    type: String,
    required: true
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'document'],
    required: true
  },
  content: {
    text: String,
    mediaUrl: String,
    mediaId: String,
    fileName: String,
    fileSize: Number,
    mimeType: String,
    duration: Number, // for audio/video
    thumbnailUrl: String
  },
  transcription: {
    text: String,
    confidence: Number,
    language: String
  },
  moderation: {
    status: {
      type: String,
      enum: ['pending', 'approved', 'blocked', 'error'],
      default: 'pending'
    },
    hateSpeech: {
      detected: Boolean,
      confidence: Number,
      category: String
    },
    contentModeration: {
      nudity: {
        detected: Boolean,
        confidence: Number,
        category: String
      },
      violence: {
        detected: Boolean,
        confidence: Number,
        category: String
      },
      explicit: {
        detected: Boolean,
        confidence: Number,
        category: String
      }
    },
    customWords: {
      blockedWords: [String],
      allowedWords: [String]
    },
    reason: String,
    moderatedAt: Date
  },
  response: {
    sent: {
      type: Boolean,
      default: false
    },
    messageId: String,
    content: String,
    sentAt: Date
  },
  metadata: {
    timestamp: {
      type: Date,
      required: true
    },
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      required: true
    },
    status: {
      type: String,
      enum: ['received', 'delivered', 'read', 'failed'],
      default: 'received'
    },
    deliveryStatus: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
      default: 'pending'
    }
  },
  flags: {
    isNewWord: {
      type: Boolean,
      default: false
    },
    requiresReview: {
      type: Boolean,
      default: false
    },
    isExported: {
      type: Boolean,
      default: false
    }
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

// Indexes for better query performance
messageSchema.index({ userId: 1, createdAt: -1 });
messageSchema.index({ whatsappMessageId: 1 });
messageSchema.index({ 'moderation.status': 1 });
messageSchema.index({ 'metadata.timestamp': -1 });
messageSchema.index({ 'flags.isNewWord': 1 });

// Virtual for message preview
messageSchema.virtual('preview').get(function() {
  if (this.content.text) {
    return this.content.text.substring(0, 100);
  }
  return `[${this.messageType.toUpperCase()}]`;
});

// Method to check if message should be blocked
messageSchema.methods.shouldBlock = function() {
  const moderation = this.moderation;
  
  if (moderation.hateSpeech.detected && moderation.hateSpeech.confidence > 0.7) {
    return { blocked: true, reason: 'hate_speech' };
  }
  
  if (moderation.contentModeration.nudity.detected && moderation.contentModeration.nudity.confidence > 0.8) {
    return { blocked: true, reason: 'nudity' };
  }
  
  if (moderation.contentModeration.violence.detected && moderation.contentModeration.violence.confidence > 0.8) {
    return { blocked: true, reason: 'violence' };
  }
  
  if (moderation.contentModeration.explicit.detected && moderation.contentModeration.explicit.confidence > 0.8) {
    return { blocked: true, reason: 'explicit_content' };
  }
  
  return { blocked: false };
};

// Method to get moderation summary
messageSchema.methods.getModerationSummary = function() {
  const summary = {
    status: this.moderation.status,
    blocked: false,
    reasons: []
  };
  
  if (this.moderation.hateSpeech.detected) {
    summary.reasons.push('hate_speech');
  }
  
  if (this.moderation.contentModeration.nudity.detected) {
    summary.reasons.push('nudity');
  }
  
  if (this.moderation.contentModeration.violence.detected) {
    summary.reasons.push('violence');
  }
  
  if (this.moderation.contentModeration.explicit.detected) {
    summary.reasons.push('explicit_content');
  }
  
  summary.blocked = summary.reasons.length > 0;
  
  return summary;
};

// Method to mark as reviewed
messageSchema.methods.markAsReviewed = function() {
  this.flags.requiresReview = false;
  this.updatedAt = new Date();
  return this.save();
};

// Method to export message data
messageSchema.methods.toExportFormat = function() {
  return {
    id: this._id,
    whatsappMessageId: this.whatsappMessageId,
    from: this.from,
    to: this.to,
    messageType: this.messageType,
    content: this.content,
    transcription: this.transcription,
    moderation: this.moderation,
    metadata: this.metadata,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('Message', messageSchema); 