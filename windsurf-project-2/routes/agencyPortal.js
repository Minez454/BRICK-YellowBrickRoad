const express = require('express');
const router = express.Router();
const agencyPortalController = require('../controllers/agencyPortalController');
const { agencyAuth } = require('../middleware/auth');

// Dashboard and overview
router.get('/:agencyId/dashboard', agencyAuth, agencyPortalController.getDashboard);

// Client management
router.get('/:agencyId/clients/:clientId/dossier', agencyAuth, agencyPortalController.getClientDossier);
router.get('/:agencyId/workbooks/progress', agencyAuth, agencyPortalController.getWorkbookProgress);
router.get('/:agencyId/certificates/export', agencyAuth, agencyPortalController.exportCertificates);

// Document access
router.get('/:agencyId/vault/:clientId', agencyAuth, agencyPortalController.getVaultAccess);

// Communication
router.get('/:agencyId/mailbox', agencyAuth, agencyPortalController.getMailbox);

// Analytics and reporting
router.get('/:agencyId/outcomes', agencyAuth, agencyPortalController.getOutcomes);

// Agency management
router.put('/:agencyId/profile', agencyAuth, agencyPortalController.updateProfile);
router.post('/:agencyId/staff', agencyAuth, agencyPortalController.addStaff);
router.delete('/:agencyId/staff/:userId', agencyAuth, agencyPortalController.removeStaff);

module.exports = router;
