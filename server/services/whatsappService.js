const axios = require('axios');
const crypto = require('crypto');

class WhatsAppService {
  constructor() {
    this.baseURL = 'https://graph.facebook.com/v18.0';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.accessToken = process.env.WHATSAPP_TOKEN;
    this.verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  }

  // Verify webhook signature
  verifySignature(payload, signature) {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.accessToken)
        .update(payload)
        .digest('hex');
      
      return `sha256=${expectedSignature}` === signature;
    } catch (error) {
      console.error('Error verifying signature:', error);
      return false;
    }
  }

  // Send text message
  async sendTextMessage(to, text) {
    try {
      const response = await axios.post(
        `${this.baseURL}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: {
            body: text
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        messageId: response.data.messages[0].id,
        data: response.data
      };
    } catch (error) {
      console.error('Error sending WhatsApp message:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  // Send template message
  async sendTemplateMessage(to, templateName, language = 'en_US', components = []) {
    try {
      const response = await axios.post(
        `${this.baseURL}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: language
            },
            components: components
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        messageId: response.data.messages[0].id,
        data: response.data
      };
    } catch (error) {
      console.error('Error sending template message:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  // Send media message
  async sendMediaMessage(to, mediaType, mediaId, caption = '') {
    try {
      const response = await axios.post(
        `${this.baseURL}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to,
          type: mediaType,
          [mediaType]: {
            id: mediaId,
            caption: caption
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        messageId: response.data.messages[0].id,
        data: response.data
      };
    } catch (error) {
      console.error('Error sending media message:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  // Upload media file
  async uploadMedia(fileBuffer, mimeType) {
    try {
      const response = await axios.post(
        `${this.baseURL}/${this.phoneNumberId}/media`,
        {
          messaging_product: 'whatsapp',
          file: fileBuffer.toString('base64')
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        mediaId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('Error uploading media:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  // Get media URL
  async getMediaUrl(mediaId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/${mediaId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return {
        success: true,
        url: response.data.url,
        mimeType: response.data.mime_type,
        sha256: response.data.sha256,
        fileSize: response.data.file_size
      };
    } catch (error) {
      console.error('Error getting media URL:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  // Download media file
  async downloadMedia(mediaId) {
    try {
      const mediaInfo = await this.getMediaUrl(mediaId);
      if (!mediaInfo.success) {
        return mediaInfo;
      }

      const response = await axios.get(mediaInfo.url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        responseType: 'arraybuffer'
      });

      return {
        success: true,
        data: Buffer.from(response.data),
        mimeType: mediaInfo.mimeType,
        fileSize: mediaInfo.fileSize
      };
    } catch (error) {
      console.error('Error downloading media:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  // Process incoming webhook
  processWebhook(body) {
    try {
      const { object, entry } = body;

      if (object !== 'whatsapp_business_account') {
        return { success: false, error: 'Invalid webhook object' };
      }

      const messages = [];

      for (const entryItem of entry) {
        const { changes } = entryItem;
        
        for (const change of changes) {
          if (change.value && change.value.messages) {
            for (const message of change.value.messages) {
              messages.push({
                id: message.id,
                from: message.from,
                timestamp: new Date(parseInt(message.timestamp) * 1000),
                type: message.type,
                text: message.text?.body,
                image: message.image,
                video: message.video,
                audio: message.audio,
                document: message.document,
                contacts: change.value.contacts,
                metadata: change.value.metadata
              });
            }
          }
        }
      }

      return {
        success: true,
        messages: messages
      };
    } catch (error) {
      console.error('Error processing webhook:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send moderation response
  async sendModerationResponse(to, reason, originalMessageType) {
    const responses = {
      hate_speech: 'Your message was blocked due to detected hate speech. Please ensure your messages are respectful and inclusive.',
      nudity: 'Your message was blocked due to inappropriate content. Please keep messages family-friendly.',
      violence: 'Your message was blocked due to violent content. Please ensure messages are peaceful and non-threatening.',
      explicit_content: 'Your message was blocked due to explicit content. Please keep messages appropriate for all audiences.',
      custom_word: 'Your message was blocked due to content that violates our community guidelines.'
    };

    const responseText = responses[reason] || 'Your message was blocked due to content that violates our community guidelines.';

    return await this.sendTextMessage(to, responseText);
  }

  // Get message status
  async getMessageStatus(messageId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/${messageId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return {
        success: true,
        status: response.data.status,
        data: response.data
      };
    } catch (error) {
      console.error('Error getting message status:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }
}

module.exports = new WhatsAppService(); 