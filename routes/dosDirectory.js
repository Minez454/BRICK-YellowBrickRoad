const express = require('express');
const router = express.Router();
const dosDirectoryController = require('../controllers/dosDirectoryController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// Agency routes
router.get('/agencies', dosDirectoryController.getAllAgencies);
router.get('/agencies/:agencyId', auth, dosDirectoryController.getAgency);

// Application routes
router.post('/agencies/:agencyId/apply', auth, dosDirectoryController.submitApplication);
router.get('/applications/:userId', auth, dosDirectoryController.getUserApplications);

// Messaging routes
router.post('/agencies/:agencyId/messages', auth, dosDirectoryController.sendMessage);
router.get('/agencies/:agencyId/messages', auth, dosDirectoryController.getMessages);
router.put('/agencies/:agencyId/messages/:messageId/read', auth, dosDirectoryController.markMessageRead);

// Alert routes
router.post('/agencies/:agencyId/alerts', auth, dosDirectoryController.createAlert);

// Agency management routes
router.put('/agencies/:agencyId/capacity', auth, dosDirectoryController.updateCapacity);
router.get('/agencies/:agencyId/statistics', auth, dosDirectoryController.getStatistics);

module.exports = router;
