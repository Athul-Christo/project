# WhatsApp AI Moderation App

A comprehensive full-stack application that integrates with WhatsApp Cloud API to provide AI-powered content moderation, including hate speech detection, content filtering, and automated responses.

## Features

### Core Functionality
- **WhatsApp Cloud API Integration**: Receive and send messages (text, voice, images, videos)
- **Speech-to-Text**: Automatic conversion of voice messages to text
- **AI Content Moderation**: 
  - Hate speech detection on text and transcribed voice messages
  - Image and video filtering for nudity, violence, and explicit content
- **Automated Filtering**: Block or allow messages based on AI analysis
- **Customizable Replies**: Automated responses explaining why messages were blocked

### User Interface
- **WhatsApp-like Chat Interface**: Display allowed messages with media previews, timestamps, and message bubbles
- **Mobile-Friendly Design**: Responsive UI optimized for mobile devices
- **Filter Customization**: User-specific settings for hate speech, nudity, and violence filtering
- **Data Management**: Download, delete, or export chat data with privacy controls

### Advanced Features
- **New Word Detection**: Automatically detect and extract new words/phrases not in the hate speech model
- **User-Driven Learning**: Allow users to mark new words as hate speech or ignore them
- **Privacy-Focused Architecture**: Secure data transmission with clear consent and data erasure capabilities

## Tech Stack

### Backend
- **Node.js/Express**: RESTful API server
- **MongoDB**: Database for user data and chat history
- **Socket.IO**: Real-time communication
- **JWT**: Authentication and authorization
- **Multer**: File upload handling
- **Winston**: Logging

### Frontend
- **React**: User interface
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Socket.IO Client**: Real-time updates
- **React Router**: Navigation
- **Axios**: HTTP client

### AI/ML Services
- **OpenAI Whisper**: Speech-to-text conversion
- **Hugging Face**: Hate speech detection
- **Google Cloud Vision API**: Image content moderation
- **Azure Content Moderator**: Video content analysis

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- MongoDB
- WhatsApp Business API account
- API keys for AI services

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd whatsapp-moderation-app
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   # Server Configuration
   PORT=3001
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/whatsapp-moderation
   JWT_SECRET=your-jwt-secret-key
   
   # WhatsApp Cloud API
   WHATSAPP_TOKEN=your-whatsapp-token
   WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
   WHATSAPP_VERIFY_TOKEN=your-verify-token
   
   # AI Services
   OPENAI_API_KEY=your-openai-key
   HUGGINGFACE_API_KEY=your-huggingface-key
   GOOGLE_CLOUD_API_KEY=your-google-cloud-key
   AZURE_CONTENT_MODERATOR_KEY=your-azure-key
   
   # Security
   RATE_LIMIT_WINDOW=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

4. **Database Setup**
   ```bash
   # Start MongoDB (if not running)
   mongod
   ```

5. **Start the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm run build
   npm start
   ```

## API Documentation

### WhatsApp Webhook Endpoints

#### POST /api/webhook/whatsapp
Receives incoming WhatsApp messages and triggers moderation pipeline.

**Headers:**
- `Content-Type: application/json`
- `X-Hub-Signature-256`: WhatsApp signature for verification

**Body:**
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "phone_number_id",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "phone_number",
              "phone_number_id": "phone_number_id"
            },
            "contacts": [...],
            "messages": [...]
          }
        }
      ]
    }
  ]
}
```

### User Management Endpoints

#### POST /api/auth/register
Register a new user account.

#### POST /api/auth/login
Authenticate user and return JWT token.

#### GET /api/user/profile
Get current user profile and settings.

#### PUT /api/user/settings
Update user's moderation preferences.

### Message Management Endpoints

#### GET /api/messages
Get paginated chat messages for the authenticated user.

#### POST /api/messages/send
Send a message through WhatsApp API.

#### DELETE /api/messages/:id
Delete a specific message.

#### GET /api/messages/export
Export user's chat data.

### Moderation Endpoints

#### POST /api/moderation/analyze
Analyze text content for hate speech.

#### POST /api/moderation/analyze-media
Analyze image/video content for inappropriate content.

#### POST /api/moderation/new-word
Report a new word for hate speech consideration.

## WhatsApp Cloud API Setup

1. **Create WhatsApp Business Account**
   - Go to [Meta for Developers](https://developers.facebook.com/)
   - Create a new app
   - Add WhatsApp product to your app

2. **Configure Webhook**
   - Set webhook URL: `https://your-domain.com/api/webhook/whatsapp`
   - Set verify token (same as in your .env file)
   - Subscribe to messages and message_status events

3. **Get Phone Number ID**
   - Add a phone number to your WhatsApp Business account
   - Note the Phone Number ID for your .env file

4. **Generate Access Token**
   - Create a permanent access token in your app settings
   - Add to your .env file

## Content Moderation Setup

### Speech-to-Text (OpenAI Whisper)
```javascript
// Example usage
const { transcribeAudio } = require('./services/speechToText');
const transcription = await transcribeAudio(audioBuffer);
```

### Hate Speech Detection (Hugging Face)
```javascript
// Example usage
const { detectHateSpeech } = require('./services/hateSpeechDetection');
const result = await detectHateSpeech(text);
```

### Image/Video Moderation
```javascript
// Example usage
const { moderateMedia } = require('./services/contentModeration');
const result = await moderateMedia(mediaBuffer, 'image');
```

## Security Considerations

### Data Privacy
- All data is transmitted over HTTPS
- User consent is required for data processing
- Users can request complete data deletion
- No end-to-end encryption (required for moderation processing)

### Rate Limiting
- API endpoints are rate-limited to prevent abuse
- WhatsApp API calls are throttled appropriately

### Access Control
- JWT-based authentication
- Role-based access control
- Secure session management

## Deployment

### Production Checklist
- [ ] Set up SSL certificate
- [ ] Configure environment variables
- [ ] Set up MongoDB Atlas or production database
- [ ] Configure WhatsApp webhook URL
- [ ] Set up monitoring and logging
- [ ] Configure backup strategies
- [ ] Test all moderation features

### Docker Deployment
```bash
# Build and run with Docker
docker build -t whatsapp-moderation-app .
docker run -p 3001:3001 whatsapp-moderation-app
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API reference

## Changelog

### v1.0.0
- Initial release with core moderation features
- WhatsApp Cloud API integration
- Speech-to-text conversion
- Hate speech detection
- Image/video content filtering
- User customization features
- Mobile-friendly interface 