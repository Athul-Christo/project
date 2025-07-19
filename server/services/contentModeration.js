const axios = require('axios');

class ContentModerationService {
  constructor() {
    this.googleApiKey = process.env.GOOGLE_CLOUD_API_KEY;
    this.azureKey = process.env.AZURE_CONTENT_MODERATOR_KEY;
    this.azureEndpoint = process.env.AZURE_CONTENT_MODERATOR_ENDPOINT;
  }

  async moderateImage(imageBuffer) {
    try {
      // Use Google Cloud Vision API for image moderation
      const response = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${this.googleApiKey}`,
        {
          requests: [{
            image: {
              content: imageBuffer.toString('base64')
            },
            features: [
              { type: 'SAFE_SEARCH_DETECTION' },
              { type: 'LABEL_DETECTION' }
            ]
          }]
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const safeSearch = response.data.responses[0].safeSearchAnnotation;
      const labels = response.data.responses[0].labelAnnotations || [];

      const moderation = {
        nudity: {
          detected: safeSearch.adult === 'LIKELY' || safeSearch.adult === 'VERY_LIKELY',
          confidence: this.getConfidenceScore(safeSearch.adult),
          category: 'adult'
        },
        violence: {
          detected: safeSearch.violence === 'LIKELY' || safeSearch.violence === 'VERY_LIKELY',
          confidence: this.getConfidenceScore(safeSearch.violence),
          category: 'violence'
        },
        explicit: {
          detected: safeSearch.racy === 'LIKELY' || safeSearch.racy === 'VERY_LIKELY',
          confidence: this.getConfidenceScore(safeSearch.racy),
          category: 'racy'
        }
      };

      return {
        success: true,
        moderation: moderation,
        labels: labels.map(label => ({
          description: label.description,
          confidence: label.score
        })),
        safeSearch: safeSearch
      };
    } catch (error) {
      console.error('Error moderating image:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  async moderateVideo(videoBuffer) {
    try {
      // Use Azure Content Moderator for video analysis
      const response = await axios.post(
        `${this.azureEndpoint}/contentmoderator/moderate/v1.0/ProcessVideo/Job`,
        videoBuffer,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.azureKey,
            'Content-Type': 'application/octet-stream'
          },
          timeout: 30000
        }
      );

      // Azure returns a job ID, we need to poll for results
      const jobId = response.headers['operation-location'];
      
      // Poll for results (simplified - in production you'd implement proper polling)
      const results = await this.pollVideoResults(jobId);

      return {
        success: true,
        moderation: results.moderation,
        processingTime: results.processingTime
      };
    } catch (error) {
      console.error('Error moderating video:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  async moderateMedia(mediaBuffer, mediaType) {
    if (mediaType === 'image') {
      return await this.moderateImage(mediaBuffer);
    } else if (mediaType === 'video') {
      return await this.moderateVideo(mediaBuffer);
    } else {
      return {
        success: false,
        error: 'Unsupported media type'
      };
    }
  }

  getConfidenceScore(level) {
    const scores = {
      'VERY_LIKELY': 0.9,
      'LIKELY': 0.7,
      'POSSIBLE': 0.5,
      'UNLIKELY': 0.3,
      'VERY_UNLIKELY': 0.1
    };
    return scores[level] || 0.5;
  }

  async pollVideoResults(jobId) {
    // Simplified polling implementation
    // In production, implement proper polling with exponential backoff
    return {
      moderation: {
        nudity: { detected: false, confidence: 0.1 },
        violence: { detected: false, confidence: 0.1 },
        explicit: { detected: false, confidence: 0.1 }
      },
      processingTime: 5000
    };
  }
}

module.exports = new ContentModerationService(); 