# YellowBrickRoad

A comprehensive case management system with BRICK AI Guide assessments and resource coordination for individuals experiencing homelessness and social service agencies.

## Features

### 🤖 BRICK AI Guide
- **AI Assessment**: Comprehensive evaluation of user situation and needs
- **Personalized Workbooks**: Custom learning modules for life skills (cooking, budgeting, scam detection, narcissism detection)
- **Smart Recommendations**: AI-driven suggestions based on assessment results
- **Progress Tracking**: Monitor workbook completion and skill development

### 📋 DOS Directory
- **Vegas Agency Portal**: Direct access to major Las Vegas agencies
- **Built-in Applications**: Apply directly to agencies through the platform
- **Private Mailbox**: Secure messaging with caseworkers
- **Mass Alerts**: Agency-to-client notifications for beds, services, and events

### 🗺️ Live Survival Map
- **Real-time Resource Mapping**: Daily updated locations for food, shelter, beds, and services
- **Pop-up Service Tracking**: Mobile clinics, needle exchanges, vaccination sites
- **Capacity Management**: Live updates on shelter availability
- **Agency Status Updates**: Real-time information from service providers

### 🔐 Secure Vault
- **Document Storage**: Secure storage for IDs, social security cards, DD214s
- **Recovery Guides**: Step-by-step instructions for replacing lost documents
- **Access Control**: Granular permissions for agencies and caseworkers
- **Audit Logging**: Complete tracking of document access

### 🏥 Health & Legal Tracker
- **Medication Reminders**: Automated notifications for medication schedules
- **Court Date Tracking**: Monitor legal obligations and deadlines
- **Appointment Management**: Schedule and track medical and legal appointments
- **Warrant Monitoring**: Alerts for active legal issues

### 📹 Zoom Link
- **Secure Video Meetings**: Face-to-face consultations with caseworkers
- **Virtual Triage**: Remote assessments from the field
- **Meeting Recording**: Secure storage of consultation recordings
- **Accessibility Features**: Live transcription and closed captioning

### 🏢 Agency Portals
- **Client Dossiers**: Comprehensive view of client history and progress
- **Workbook Monitoring**: Track client completion of life skills training
- **Certificate Export**: Generate proof of completion for housing vouchers
- **Outcome Tracking**: Measure agency performance and success rates
- **Staff Management**: Manage agency personnel and permissions

## Technology Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Multer** for file uploads
- **Node-cron** for scheduled tasks
- **Twilio** for SMS notifications
- **Nodemailer** for email notifications
- **Zoom API** for video meetings

### Security
- **Helmet.js** for security headers
- **bcryptjs** for password hashing
- **Express-rate-limit** for rate limiting
- **File encryption** for document storage
- **Audit logging** for compliance

### APIs & Integrations
- **Zoom Video SDK** for video meetings
- **Twilio** for SMS messaging
- **Mapbox/Google Maps** for mapping services
- **Email service** for notifications

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd briggs-ai-guide
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration:
   - MongoDB connection string
   - JWT secret
   - Email configuration (SMTP)
   - Twilio credentials
   - Zoom API keys
   - Map API tokens

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Start in production**
   ```bash
   npm start
   ```

## API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/agency-login` - Agency staff login
- `GET /api/auth/verify` - Verify JWT token

### AI Guide
- `POST /api/ai-guide/assessment` - Conduct AI assessment
- `GET /api/ai-guide/recommendations/:userId` - Get AI recommendations
- `GET /api/ai-guide/workbooks/:userId` - Get user workbooks
- `PUT /api/ai-guide/workbooks/:workbookId/progress` - Update workbook progress

### DOS Directory
- `GET /api/dos-directory/agencies` - Get all agencies
- `GET /api/dos-directory/agencies/:agencyId` - Get agency details
- `POST /api/dos-directory/agencies/:agencyId/apply` - Submit application
- `POST /api/dos-directory/agencies/:agencyId/messages` - Send message
- `GET /api/dos-directory/agencies/:agencyId/messages` - Get messages

### Live Survival Map
- `GET /api/survival-map/nearby` - Get nearby resources
- `GET /api/survival-map/all` - Get all map resources
- `POST /api/survival-map` - Add new resource
- `PUT /api/survival-map/:resourceId/status` - Update resource status
- `POST /api/survival-map/popup` - Add pop-up service

### Secure Vault
- `POST /api/secure-vault/upload` - Upload document
- `GET /api/secure-vault/user/:userId` - Get user documents
- `GET /api/secure-vault/:documentId` - Get document details
- `GET /api/secure-vault/:documentId/download` - Download document
- `POST /api/secure-vault/:documentId/grant-access` - Grant agency access

### Health & Legal Tracker
- `POST /api/health-legal/initialize` - Initialize tracker
- `POST /api/health-legal/medications` - Add medication
- `POST /api/health-legal/appointments` - Add appointment
- `POST /api/health-legal/court-dates` - Add court date
- `GET /api/health-legal/tracker/:userId` - Get tracker data

### Zoom Link
- `POST /api/zoom-link/meetings` - Create meeting
- `GET /api/zoom-link/meetings/:meetingId` - Get meeting details
- `POST /api/zoom-link/meetings/:meetingId/join` - Join meeting
- `GET /api/zoom-link/users/:userId/meetings` - Get user meetings

### Agency Portal
- `GET /api/agency-portal/:agencyId/dashboard` - Get agency dashboard
- `GET /api/agency-portal/:agencyId/clients/:clientId/dossier` - Get client dossier
- `GET /api/agency-portal/:agencyId/workbooks/progress` - Monitor workbook progress
- `GET /api/agency-portal/:agencyId/outcomes` - Get agency outcomes

## Database Schema

### Core Models
- **User**: Client information, assessment results, preferences
- **Agency**: Service provider information, staff, applications
- **Workbook**: Personalized learning modules and progress
- **Document**: Secure document storage with access controls
- **Resource**: Map-based resource locations and availability
- **ZoomMeeting**: Video meeting management and recordings
- **HealthLegal**: Health and legal tracking data

## Security Features

- **Encryption**: All sensitive documents are encrypted at rest
- **Access Control**: Role-based permissions for all data
- **Audit Logging**: Complete tracking of all data access
- **Rate Limiting**: Protection against API abuse
- **Input Validation**: Comprehensive input sanitization
- **Secure Headers**: Security best practices implementation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please contact the development team.

## Acknowledgments

- Las Vegas social service agencies for requirements and feedback
- Open source community for the tools and libraries used
- The individuals experiencing homelessness who inspired this solution
