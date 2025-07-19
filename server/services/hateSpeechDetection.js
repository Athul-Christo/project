const axios = require('axios');

class HateSpeechDetectionService {
  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY;
    this.baseURL = 'https://api-inference.huggingface.co/models';
    this.model = 'unitary/toxic-bert'; // Default model for hate speech detection
  }

  async detectHateSpeech(text) {
    try {
      const response = await axios.post(
        `${this.baseURL}/${this.model}`,
        { inputs: text },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const results = response.data[0];
      const labels = results.map(item => item.label);
      const scores = results.map(item => item.score);

      // Map labels to categories
      const categories = {
        'toxic': 'hate_speech',
        'severe_toxic': 'hate_speech',
        'obscene': 'explicit_content',
        'threat': 'violence',
        'insult': 'hate_speech',
        'identity_hate': 'hate_speech'
      };

      let detectedCategories = [];
      let maxConfidence = 0;
      let primaryCategory = null;

      results.forEach(result => {
        const category = categories[result.label] || 'other';
        if (result.score > 0.5) {
          detectedCategories.push({
            category: category,
            label: result.label,
            confidence: result.score
          });
          
          if (result.score > maxConfidence) {
            maxConfidence = result.score;
            primaryCategory = category;
          }
        }
      });

      return {
        success: true,
        detected: detectedCategories.length > 0,
        confidence: maxConfidence,
        primaryCategory: primaryCategory,
        categories: detectedCategories,
        rawResults: results
      };
    } catch (error) {
      console.error('Error detecting hate speech:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  async analyzeText(text, options = {}) {
    const { includeDetails = true, threshold = 0.5 } = options;
    
    const result = await this.detectHateSpeech(text);
    
    if (!result.success) {
      return result;
    }

    if (!includeDetails) {
      return {
        success: true,
        detected: result.detected,
        confidence: result.confidence,
        primaryCategory: result.primaryCategory
      };
    }

    return result;
  }
}

module.exports = new HateSpeechDetectionService(); 