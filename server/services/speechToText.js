const axios = require('axios');
const FormData = require('form-data');

class SpeechToTextService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.baseURL = 'https://api.openai.com/v1';
  }

  // Transcribe audio using OpenAI Whisper
  async transcribeAudio(audioBuffer, language = 'en') {
    try {
      const formData = new FormData();
      formData.append('file', audioBuffer, {
        filename: 'audio.wav',
        contentType: 'audio/wav'
      });
      formData.append('model', 'whisper-1');
      formData.append('language', language);
      formData.append('response_format', 'json');

      const response = await axios.post(
        `${this.baseURL}/audio/transcriptions`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            ...formData.getHeaders()
          },
          timeout: 30000 // 30 second timeout
        }
      );

      return {
        success: true,
        text: response.data.text,
        language: response.data.language,
        duration: response.data.duration
      };
    } catch (error) {
      console.error('Error transcribing audio:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  // Transcribe audio with additional options
  async transcribeAudioAdvanced(audioBuffer, options = {}) {
    try {
      const {
        language = 'en',
        prompt = '',
        temperature = 0,
        responseFormat = 'json',
        timestampGranularities = []
      } = options;

      const formData = new FormData();
      formData.append('file', audioBuffer, {
        filename: 'audio.wav',
        contentType: 'audio/wav'
      });
      formData.append('model', 'whisper-1');
      formData.append('language', language);
      formData.append('response_format', responseFormat);
      formData.append('temperature', temperature);

      if (prompt) {
        formData.append('prompt', prompt);
      }

      if (timestampGranularities.length > 0) {
        formData.append('timestamp_granularities', JSON.stringify(timestampGranularities));
      }

      const response = await axios.post(
        `${this.baseURL}/audio/transcriptions`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            ...formData.getHeaders()
          },
          timeout: 30000
        }
      );

      return {
        success: true,
        text: response.data.text,
        language: response.data.language,
        duration: response.data.duration,
        segments: response.data.segments || [],
        data: response.data
      };
    } catch (error) {
      console.error('Error transcribing audio with advanced options:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  // Detect language from audio
  async detectLanguage(audioBuffer) {
    try {
      const formData = new FormData();
      formData.append('file', audioBuffer, {
        filename: 'audio.wav',
        contentType: 'audio/wav'
      });
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'json');

      const response = await axios.post(
        `${this.baseURL}/audio/transcriptions`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            ...formData.getHeaders()
          },
          timeout: 30000
        }
      );

      return {
        success: true,
        language: response.data.language,
        confidence: response.data.language_probability || 1.0
      };
    } catch (error) {
      console.error('Error detecting language:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  // Transcribe with word-level timestamps
  async transcribeWithTimestamps(audioBuffer, language = 'en') {
    try {
      const formData = new FormData();
      formData.append('file', audioBuffer, {
        filename: 'audio.wav',
        contentType: 'audio/wav'
      });
      formData.append('model', 'whisper-1');
      formData.append('language', language);
      formData.append('response_format', 'verbose_json');
      formData.append('timestamp_granularities', JSON.stringify(['word']));

      const response = await axios.post(
        `${this.baseURL}/audio/transcriptions`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            ...formData.getHeaders()
          },
          timeout: 30000
        }
      );

      return {
        success: true,
        text: response.data.text,
        language: response.data.language,
        duration: response.data.duration,
        words: response.data.words || [],
        segments: response.data.segments || []
      };
    } catch (error) {
      console.error('Error transcribing with timestamps:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  // Validate audio format and size
  validateAudio(audioBuffer, maxSizeMB = 25) {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    if (audioBuffer.length > maxSizeBytes) {
      return {
        valid: false,
        error: `Audio file too large. Maximum size is ${maxSizeMB}MB.`
      };
    }

    // Check if it's a valid audio format (basic check)
    const header = audioBuffer.slice(0, 4);
    const isWav = header.toString('hex').startsWith('52494646'); // RIFF
    const isMp3 = header.toString('hex').startsWith('494433'); // ID3
    const isM4a = header.toString('hex').startsWith('66747970'); // ftyp

    if (!isWav && !isMp3 && !isM4a) {
      return {
        valid: false,
        error: 'Unsupported audio format. Please use WAV, MP3, or M4A.'
      };
    }

    return {
      valid: true,
      format: isWav ? 'wav' : isMp3 ? 'mp3' : 'm4a'
    };
  }

  // Convert audio to required format if needed
  async convertAudioFormat(audioBuffer, targetFormat = 'wav') {
    // This is a placeholder for audio conversion
    // In a real implementation, you might use ffmpeg or similar
    // For now, we'll return the original buffer
    return {
      success: true,
      data: audioBuffer,
      format: targetFormat
    };
  }
}

module.exports = new SpeechToTextService(); 