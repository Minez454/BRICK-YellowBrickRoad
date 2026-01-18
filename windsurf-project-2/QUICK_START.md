# 🚀 Quick Start Guide - Launch YellowBrickRoad

## 🎯 5-Minute Quick Launch

### Prerequisites
- Node.js 18+ installed
- MongoDB running locally or Atlas account
- Basic command line knowledge

---

## ⚡ Option 1: Local Development (Fastest)

```bash
# 1. Clone and setup
git clone <your-repo>
cd yellowbrickroad
npm install

# 2. Quick environment setup
cp .env.example .env
# Edit .env with at minimum:
# MONGODB_URI=mongodb://localhost:27017/yellowbrickroad
# JWT_SECRET=your-secret-key-here

# 3. Start MongoDB (if local)
mongod

# 4. Launch the app
npm run dev

# 🎉 App is running on http://localhost:5000
```

---

## ⚡ Option 2: Docker Launch (Recommended)

```bash
# 1. Clone repository
git clone <your-repo>
cd yellowbrickroad

# 2. Quick environment setup
cp .env.example .env
# Add your MongoDB connection string

# 3. Launch with Docker
docker-compose up -d

# 🎉 App is running on http://localhost:5000
# MongoDB and Redis are also running
```

---

## 🌐 Option 3: Cloud Launch (Production)

### A. Railway (Easiest)
```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login and deploy
railway login
railway up

# 🎉 Your app is live! Railway gives you a URL instantly.
```

### B. Vercel (Frontend + API)
```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Deploy frontend
cd client
vercel --prod

# 3. Deploy backend (separately)
cd ..
vercel --prod

# 🎉 Both frontend and API are live!
```

### C. Heroku (Classic)
```bash
# 1. Install Heroku CLI
npm install -g heroku

# 2. Create app and deploy
heroku create yellowbrickroad
git push heroku main

# 3. Set environment variables
heroku config:set MONGODB_URI=your-mongodb-uri
heroku config:set JWT_SECRET=your-secret-key

# 🎉 App is live on Heroku!
```

---

## 🔧 Essential Setup Steps

### 1. Get External Services (5 minutes)

**Required APIs:**
- **MongoDB Atlas**: https://www.mongodb.com/atlas (Free tier available)
- **Mapbox**: https://mapbox.com (Free tier: 50,000 requests/month)
- **SendGrid** (for emails): https://sendgrid.com (Free tier: 100 emails/day)

**Quick Setup:**
```bash
# MongoDB Atlas: Create cluster → Get connection string
# Mapbox: Create account → Get public token
# SendGrid: Create account → Get API key
```

### 2. Environment Variables (2 minutes)

Create `.env` file with minimum required:
```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/yellowbrickroad

# Security
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Maps
MAPBOX_API_TOKEN=your-mapbox-public-token

# Email (optional but recommended)
EMAIL_HOST=smtp.sendgrid.net
EMAIL_USER=apikey
EMAIL_PASS=your-sendgrid-api-key
```

### 3. Database Setup (1 minute)

```bash
# Run database setup script
npm run setup-database

# This creates indexes and seeds initial data
```

---

## 🧪 Verify Installation

### Health Check
```bash
curl http://localhost:5000/api/health
# Should return: {"status":"OK","timestamp":"..."}
```

### Test Key Features
```bash
# 1. Test AI Guide
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"test@example.com","password":"password123"}'

# 2. Test Map
curl http://localhost:5000/api/survival-map/nearby?lat=36.1699&lng=-115.1398

# 3. Test PWA
# Open http://localhost:5000 in Chrome
# Go to DevTools → Application → Service Worker
# Should show "Activated and is running"
```

---

## 📱 Access Your YellowBrickRoad

### Local Development
- **Frontend**: http://localhost:3000
- **API**: http://localhost:5000
- **Database**: mongodb://localhost:27017

### Docker Deployment
- **Application**: http://localhost:5000
- **MongoDB**: mongodb://localhost:27017
- **Redis**: redis://localhost:6379

### Cloud Platforms
- **Railway**: https://your-app-name.up.railway.app
- **Vercel**: https://your-app-name.vercel.app
- **Heroku**: https://your-app-name.herokuapp.com

---

## 🎯 Next Steps After Launch

### 1. Configure External Services
- Set up your Mapbox token in the frontend
- Configure email templates in SendGrid
- Test SMS notifications (if using Twilio)

### 2. Create Admin Account
- Register first user through the web interface
- This user will have admin privileges

### 3. Test Core Features
- **BRICK AI Guide**: Take the assessment
- **DOS Directory**: Browse Vegas agencies
- **Live Survival Map**: Find nearby resources
- **Secure Vault**: Upload a test document
- **Health & Legal Tracker**: Add a medication reminder
- **Zoom Link**: Test video meeting creation

### 4. Mobile Testing
- Open the app on mobile device
- Test PWA installation prompt
- Test offline functionality
- Test push notifications

---

## 🚨 Common Quick Fixes

### Port Already in Use
```bash
# Kill existing process
sudo lsof -ti:5000 | xargs kill -9

# Or use different port
PORT=5001 npm run dev
```

### MongoDB Connection Error
```bash
# Check if MongoDB is running
brew services start mongodb-community
# or
sudo systemctl start mongod
```

### Permission Denied
```bash
# Fix file permissions
sudo chown -R $USER:$USER .
chmod -R 755 .
```

### Environment Variables Not Working
```bash
# Verify .env file exists
ls -la .env

# Check syntax
cat .env
```

---

## 🎊 You're Live! 

Your YellowBrickRoad is now running with:
- ✅ BRICK AI Guide assessments
- ✅ Real-time resource mapping
- ✅ Secure document vault
- ✅ Health & legal tracking
- ✅ Video meeting capabilities
- ✅ Agency coordination tools
- ✅ Mobile PWA functionality
- ✅ Advanced analytics
- ✅ System integrations
- ✅ Enhanced security

### 📞 Need Help?
- Check the full [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed setup
- Review the [README.md](./README.md) for feature documentation
- Check logs: `pm2 logs` or `docker-compose logs`
- Test health endpoint: `curl /api/health`

### 🚀 Production Deployment
When ready for production:
1. Follow the full deployment guide in `DEPLOYMENT.md`
2. Set up SSL certificates
3. Configure domain and DNS
4. Set up monitoring and backups
5. Test all integrations

**Welcome to YellowBrickRoad - Transforming how Las Vegas serves our community! 🏠**
