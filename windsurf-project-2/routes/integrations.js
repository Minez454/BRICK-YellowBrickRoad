const express = require('express');
const router = express.Router();
const integrationController = require('../controllers/integrationController');
const { auth } = require('../middleware/auth');

// Integration management
router.get('/', auth, integrationController.getIntegrations);
router.post('/', auth, integrationController.createIntegration);
router.put('/:integrationId', auth, integrationController.updateIntegration);
router.delete('/:integrationId', auth, integrationController.deleteIntegration);

// Connection and sync
router.post('/:integrationId/test', auth, integrationController.testConnection);
router.post('/:integrationId/sync', auth, integrationController.triggerSync);

// Monitoring and logging
router.get('/:integrationId/logs', auth, integrationController.getLogs);
router.get('/:integrationId/statistics', auth, integrationController.getStatistics);

// HMIS specific endpoints
router.post('/hmis/:clientId/sync', auth, integrationController.syncHMISClient);

// Benefits specific endpoints
router.post('/benefits/:userId/eligibility', auth, integrationController.checkBenefitsEligibility);

// Law enforcement specific endpoints
router.post('/law-enforcement/:userId/warrants', auth, integrationController.checkWarrants);

// Healthcare specific endpoints
router.post('/healthcare/:userId/sync', auth, integrationController.syncMedicalRecords);

// Templates
router.get('/templates', auth, integrationController.getTemplates);

module.exports = router;
