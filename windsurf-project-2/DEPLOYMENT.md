# 🚀 YellowBrickRoad Deployment Guide

## 📋 Prerequisites

### System Requirements
- **Node.js**: 18.x or higher
- **MongoDB**: 5.0 or higher
- **Redis**: 6.0 or higher (for caching/sessions)
- **Nginx**: 1.18+ (for production)
- **SSL Certificate**: Required for production
- **Domain**: Custom domain for PWA functionality

### External Services Setup
- **MongoDB Atlas** or self-hosted MongoDB
- **Redis** (optional but recommended)
- **Email Service**: SMTP server (Gmail, SendGrid, etc.)
- **Twilio Account**: For SMS notifications
- **Zoom API**: For video meetings
- **Map Service**: Mapbox or Google Maps API key
- **Cloud Storage**: AWS S3 or similar for file uploads

## 🔧 Environment Setup

### 1. Clone and Install Dependencies
```bash
git clone <your-repo-url>
cd yellowbrickroad
npm install
```

### 2. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

**Required Environment Variables:**
```env
# Server Configuration
NODE_ENV=production
PORT=443
DOMAIN=yourdomain.com

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/yellowbrickroad

# Security
JWT_SECRET=your-super-secure-jwt-secret-key-here
SESSION_SECRET=your-session-secret
ENCRYPTION_KEY=your-32-character-encryption-key

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# SMS Configuration
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890

# Zoom API
ZOOM_API_KEY=your-zoom-api-key
ZOOM_API_SECRET=your-zoom-api-secret

# Map Services
MAPBOX_API_TOKEN=your-mapbox-token
GOOGLE_MAPS_API_KEY=your-google-maps-key

# File Storage
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-west-2
AWS_S3_BUCKET=yellowbrickroad-files

# Blockchain
BLOCKCHAIN_NETWORK=mainnet
BLOCKCHAIN_NODE_URL=https://your-blockchain-node.com

# Biometric Security
BIOMETRIC_ENCRYPTION_KEY=your-32-character-key
```

### 3. Database Setup
```bash
# Create MongoDB indexes
npm run setup-database

# Seed initial data (optional)
npm run seed-data
```

## 🏗️ Build Process

### 1. Build Frontend
```bash
cd client
npm install
npm run build
```

### 2. Optimize for Production
```bash
# Build production version
npm run build:prod

# Generate service worker
npm run build:sw
```

## 🚀 Deployment Options

### Option 1: Docker Deployment (Recommended)

#### Create Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build frontend
RUN cd client && npm ci && npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

USER nodejs

EXPOSE 5000

CMD ["npm", "start"]
```

#### Create docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    depends_on:
      - mongodb
      - redis
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs

  mongodb:
    image: mongo:5.0
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USERNAME}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
    volumes:
      - mongodb_data:/data/db
    ports:
      - "27017:27017"

  redis:
    image: redis:6-alpine
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app

volumes:
  mongodb_data:
  redis_data:
```

#### Deploy with Docker
```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f app
```

### Option 2: Traditional Server Deployment

#### 1. Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc
sudo apt-get install gnupg
wget -qO - https://repo.mongodb.org/apt/ubuntu/dists/focal/mongodb-org/5.0/binary-amd64/mongodb-org-server_5.0.14_amd64.deb
sudo apt-get install -y ./mongodb-org-server_5.0.14_amd64.deb

# Install Nginx
sudo apt install nginx -y

# Install PM2 for process management
sudo npm install -g pm2
```

#### 2. Configure Nginx
```nginx
# /etc/nginx/sites-available/yellowbrickroad
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    root /var/www/yellowbrickroad/client/build;
    index index.html index.htm;

    # PWA and Service Worker
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Service Worker
    location /sw.js {
        add_header Cache-Control "public, max-age=0, must-revalidate";
        add_header Service-Worker-Allowed "/";
    }

    # API Routes
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # File Uploads
    location /uploads/ {
        alias /var/www/yellowbrickroad/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; media-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self';" always;
}
```

#### 3. Deploy Application
```bash
# Clone repository
git clone <your-repo-url> /var/www/yellowbrickroad
cd /var/www/yellowbrickroad

# Install dependencies
npm ci --production

# Build frontend
cd client
npm ci && npm run build
cd ..

# Set permissions
sudo chown -R www-data:www-data /var/www/yellowbrickroad
sudo chmod -R 755 /var/www/yellowbrickroad

# Start with PM2
pm2 start server.js --name "yellowbrickroad" --env production

# Configure PM2 to start on boot
pm2 startup
pm2 save
```

### Option 3: Cloud Platform Deployment

#### AWS Elastic Beanstalk
```bash
# Install EB CLI
npm install -g awsebcli

# Initialize application
eb init -p "Node.js" -r "us-west-2"

# Deploy
eb deploy
```

#### Google Cloud Platform
```bash
# Install gcloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL gcloud init

# Deploy
gcloud app deploy
```

#### Heroku
```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create yellowbrickroad

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your-mongodb-uri

# Deploy
git subtree push --prefix client heroku main
```

## 🔧 Post-Deployment Setup

### 1. SSL Certificate Setup
```bash
# Let's Encrypt (recommended)
sudo certbot --nginx -d yourdomain.com

# Or upload your own certificates
sudo cp cert.pem /etc/nginx/ssl/
sudo cp key.pem /etc/nginx/ssl/
```

### 2. Database Indexes
```bash
# Create performance indexes
npm run create-indexes
```

### 3. Background Services
```bash
# Start cron jobs
npm run setup-cron

# Or use PM2 for background processes
pm2 start scripts/background-worker.js --name "background-worker"
```

## 🧪 Testing Deployment

### 1. Health Check
```bash
# Check if server is running
curl https://yourdomain.com/api/health

# Expected response:
# {"status":"OK","timestamp":"2024-01-18T10:30:00.000Z"}
```

### 2. PWA Testing
```bash
# Test PWA installation
# Open Chrome DevTools -> Application -> Service Worker
# Should show "Activated and is running"
```

### 3. Integration Testing
```bash
# Test HMIS integration
curl -X POST https://yourdomain.com/api/integrations/hmis/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

## 📊 Monitoring Setup

### 1. Application Monitoring
```bash
# PM2 Monitoring
pm2 monit

# Log monitoring
tail -f logs/combined.log
```

### 2. Server Monitoring
```bash
# Install monitoring tools
npm install -g pm2-logrotate
pm2 install pm2-server-monit
```

### 3. Database Monitoring
```bash
# MongoDB monitoring
mongostat --host localhost:27017

# Redis monitoring
redis-cli info
```

## 🔒 Security Hardening

### 1. Firewall Setup
```bash
# UFW firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw deny 27017  # Restrict MongoDB access
```

### 2. Security Headers
```bash
# Already configured in Nginx
# Verify with: curl -I https://yourdomain.com
```

### 3. Rate Limiting
```bash
# Configure in application
# Already implemented in server.js
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Database Connection
```bash
# Check MongoDB status
sudo systemctl status mongod

# Check logs
sudo tail -f /var/log/mongodb/mongod.log
```

#### 2. SSL Certificate Issues
```bash
# Test SSL configuration
sudo nginx -t

# Check certificate expiration
openssl x509 -in /etc/nginx/ssl/cert.pem -noout -dates
```

#### 3. Memory Issues
```bash
# Check memory usage
free -h

# Node.js memory limit
node --max-old-space-size=4096 server.js
```

### Performance Optimization

#### 1. Database Optimization
```bash
# Create compound indexes
db.users.createIndex({ "currentSituation.housingStatus": 1, "assessment.completed": 1 })
```

#### 2. Caching
```bash
# Redis caching is configured
# Monitor Redis usage
redis-cli monitor
```

#### 3. CDN Setup
```bash
# Configure CloudFlare or AWS CloudFront
# Point to your domain
```

## 📱 Mobile App Deployment

### 1. PWA Registration
```bash
# PWA will be automatically registered when users visit the site
# Test on mobile devices for installation prompt
```

### 2. App Store Submission (Optional)
```bash
# Convert PWA to native app using Capacitor or Cordova
npm install -g @capacitor/cli
npx cap init
npx cap add android
npx cap add ios

# Build and submit to app stores
npx cap build android
npx cap build ios
```

## 🔄 CI/CD Pipeline

### GitHub Actions Example
```yaml
# .github/workflows/deploy.yml
name: Deploy YellowBrickRoad

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - uses: actions/setup-node@v2
      with:
        node-version: '18'
    - run: npm ci
    - run: npm run build
    - name: Deploy to server
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          cd /var/www/yellowbrickroad
          git pull origin main
          npm ci
          npm run build
          pm2 restart yellowbrickroad
```

## 📞 Support & Maintenance

### 1. Backup Strategy
```bash
# Database backup
mongodump --uri $MONGODB_URI --out /backups/$(date +%Y%m%d)

# File backup
rsync -av /var/www/yellowbrickroad/uploads/ /backups/files/
```

### 2. Update Process
```bash
# Update application
cd /var/www/yellowbrickroad
git pull origin main
npm ci
npm run build
pm2 restart yellowbrickroad
```

### 3. Monitoring Alerts
```bash
# Set up monitoring alerts
# Configure Uptime Robot or Pingdom
# Set up Slack/email alerts for downtime
```

## 🎉 Launch Checklist

- [ ] Environment variables configured
- [ ] SSL certificate installed
- [ ] Database indexes created
- [ ] Nginx configured and tested
- [ ] PWA manifest and service worker working
- [ ] All integrations tested
- [ ] Monitoring and logging set up
- [ ] Backup procedures implemented
- [ ] Security hardening completed
- [ ] Performance optimization applied
- [ ] Documentation updated
- [ ] Team training completed
- [ ] Launch announcement prepared

## 🚀 Go Live!

Once all checks are complete:
```bash
# Final deployment check
curl -f https://yourdomain.com/api/health

# If successful, announce launch!
echo "🎉 YellowBrickRoad is now LIVE!"
```

## 📞 Support

For deployment issues:
- Check logs: `pm2 logs yellowbrickroad`
- Database status: `sudo systemctl status mongod`
- Server status: `sudo systemctl status nginx`
- Network connectivity: `ping yourdomain.com`

For additional support, refer to the troubleshooting section or contact the development team.
