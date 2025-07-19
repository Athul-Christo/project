# WhatsApp Moderation App - Deployment Guide

This guide will help you deploy the WhatsApp Moderation App to production.

## Prerequisites

### Required Services
1. **MongoDB Database**
   - MongoDB Atlas (recommended) or self-hosted MongoDB
   - Database name: `whatsapp-moderation`

2. **WhatsApp Business API**
   - Meta Developer Account
   - WhatsApp Business App
   - Phone Number ID
   - Access Token

3. **AI Services**
   - OpenAI API Key (for speech-to-text)
   - Hugging Face API Key (for hate speech detection)
   - Google Cloud Vision API (for image moderation)
   - Azure Content Moderator (for video moderation)

4. **Hosting Platform**
   - Node.js hosting (Heroku, DigitalOcean, AWS, etc.)
   - SSL certificate
   - Custom domain (optional but recommended)

## Step-by-Step Deployment

### 1. Environment Setup

Create a `.env` file in the root directory:

```env
# Production Configuration
PORT=3001
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/whatsapp-moderation
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters

# WhatsApp Cloud API
WHATSAPP_TOKEN=your-whatsapp-cloud-api-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_VERIFY_TOKEN=your-webhook-verify-token

# AI Services
OPENAI_API_KEY=your-openai-api-key
HUGGINGFACE_API_KEY=your-huggingface-api-key
GOOGLE_CLOUD_API_KEY=your-google-cloud-api-key
AZURE_CONTENT_MODERATOR_KEY=your-azure-content-moderator-key
AZURE_CONTENT_MODERATOR_ENDPOINT=https://your-resource.cognitiveservices.azure.com/

# Security
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100

# Client URL
CLIENT_URL=https://your-domain.com
```

### 2. Database Setup

#### MongoDB Atlas (Recommended)
1. Create a MongoDB Atlas account
2. Create a new cluster
3. Create a database user with read/write permissions
4. Get your connection string
5. Update `MONGODB_URI` in your `.env` file

#### Self-hosted MongoDB
1. Install MongoDB on your server
2. Create a database named `whatsapp-moderation`
3. Create a user with appropriate permissions
4. Update `MONGODB_URI` in your `.env` file

### 3. WhatsApp Business API Setup

1. **Create Meta Developer Account**
   - Go to [Meta for Developers](https://developers.facebook.com/)
   - Create a new app
   - Add WhatsApp product to your app

2. **Configure Phone Number**
   - Add a phone number to your WhatsApp Business account
   - Note the Phone Number ID
   - Generate a permanent access token

3. **Configure Webhook**
   - Set webhook URL: `https://your-domain.com/api/webhook/whatsapp`
   - Set verify token (same as in your .env file)
   - Subscribe to messages and message_status events

### 4. AI Services Setup

#### OpenAI (Speech-to-Text)
1. Create OpenAI account
2. Generate API key
3. Add to `.env` file

#### Hugging Face (Hate Speech Detection)
1. Create Hugging Face account
2. Generate API key
3. Add to `.env` file

#### Google Cloud Vision (Image Moderation)
1. Create Google Cloud account
2. Enable Vision API
3. Create API key
4. Add to `.env` file

#### Azure Content Moderator (Video Moderation)
1. Create Azure account
2. Create Content Moderator resource
3. Get API key and endpoint
4. Add to `.env` file

### 5. Application Deployment

#### Option A: Heroku Deployment

1. **Install Heroku CLI**
   ```bash
   npm install -g heroku
   ```

2. **Create Heroku App**
   ```bash
   heroku create your-app-name
   ```

3. **Add Environment Variables**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set MONGODB_URI=your-mongodb-uri
   heroku config:set JWT_SECRET=your-jwt-secret
   # Add all other environment variables
   ```

4. **Deploy**
   ```bash
   git add .
   git commit -m "Deploy to production"
   git push heroku main
   ```

#### Option B: DigitalOcean App Platform

1. **Create App**
   - Go to DigitalOcean App Platform
   - Connect your GitHub repository
   - Configure build settings

2. **Environment Variables**
   - Add all environment variables in the App Platform dashboard

3. **Deploy**
   - DigitalOcean will automatically deploy on git push

#### Option C: AWS EC2

1. **Launch EC2 Instance**
   - Ubuntu 20.04 LTS recommended
   - t3.medium or larger

2. **Install Dependencies**
   ```bash
   sudo apt update
   sudo apt install nodejs npm nginx
   ```

3. **Clone Repository**
   ```bash
   git clone your-repository-url
   cd whatsapp-moderation-app
   ```

4. **Install Dependencies**
   ```bash
   npm install
   cd client && npm install && npm run build
   ```

5. **Setup PM2**
   ```bash
   sudo npm install -g pm2
   pm2 start server/index.js --name "whatsapp-moderation"
   pm2 startup
   pm2 save
   ```

6. **Configure Nginx**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### 6. SSL Certificate

#### Let's Encrypt (Free)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

#### Custom SSL Certificate
- Upload your SSL certificate files
- Configure Nginx to use them

### 7. Domain Configuration

1. **Point Domain to Server**
   - Add A record pointing to your server IP
   - Add CNAME record for www subdomain

2. **Update Client URL**
   - Update `CLIENT_URL` in `.env` file
   - Rebuild and redeploy client

### 8. Production Build

1. **Build Client**
   ```bash
   cd client
   npm run build
   ```

2. **Update Server**
   - Ensure server serves static files from `client/build`
   - Update CORS settings for production domain

### 9. Monitoring and Logging

#### PM2 Monitoring
```bash
pm2 monit
pm2 logs whatsapp-moderation
```

#### Application Logs
```bash
tail -f logs/app.log
```

### 10. Security Checklist

- [ ] SSL certificate installed
- [ ] Environment variables secured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Database access restricted
- [ ] API keys rotated regularly
- [ ] Regular backups configured
- [ ] Monitoring alerts set up

### 11. Testing Production

1. **Health Check**
   ```bash
   curl https://your-domain.com/health
   ```

2. **WhatsApp Webhook Test**
   - Send test message to your WhatsApp number
   - Check logs for webhook processing

3. **API Endpoints Test**
   ```bash
   curl -X POST https://your-domain.com/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123","name":"Test User","phoneNumber":"+1234567890","whatsappNumber":"+1234567890"}'
   ```

### 12. Maintenance

#### Regular Tasks
- Monitor application logs
- Check API usage and costs
- Update dependencies
- Backup database
- Review security settings

#### Updates
```bash
git pull origin main
npm install
cd client && npm install && npm run build
pm2 restart whatsapp-moderation
```

## Troubleshooting

### Common Issues

1. **Webhook Not Receiving Messages**
   - Check webhook URL configuration
   - Verify verify token
   - Check server logs

2. **Database Connection Issues**
   - Verify MongoDB URI
   - Check network connectivity
   - Verify database user permissions

3. **AI Services Not Working**
   - Verify API keys
   - Check API quotas
   - Review error logs

4. **Client Not Loading**
   - Check build process
   - Verify static file serving
   - Check CORS configuration

### Support

For issues and questions:
- Check the application logs
- Review the README.md file
- Create an issue in the repository
- Contact the development team

## Performance Optimization

1. **Database Indexing**
   ```javascript
   // Add indexes for better performance
   db.messages.createIndex({ "userId": 1, "createdAt": -1 })
   db.messages.createIndex({ "whatsappMessageId": 1 })
   ```

2. **Caching**
   - Implement Redis for session storage
   - Cache frequently accessed data

3. **CDN**
   - Use CDN for static assets
   - Configure proper caching headers

4. **Load Balancing**
   - Use multiple server instances
   - Configure load balancer

## Backup Strategy

1. **Database Backups**
   ```bash
   # MongoDB backup
   mongodump --uri="your-mongodb-uri" --out=/backup/$(date +%Y%m%d)
   ```

2. **Application Backups**
   ```bash
   # Backup application files
   tar -czf app-backup-$(date +%Y%m%d).tar.gz /path/to/app
   ```

3. **Automated Backups**
   - Set up cron jobs for regular backups
   - Store backups in secure location
   - Test backup restoration regularly 