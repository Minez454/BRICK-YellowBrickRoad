const express = require('express');
const router = express.Router();
const { SecureVaultController, upload } = require('../controllers/secureVaultController');
const auth = require('../middleware/auth');

// Document upload and management
router.post('/upload', auth, upload.single('document'), SecureVaultController.uploadDocument);
router.get('/user/:userId', auth, SecureVaultController.getUserDocuments);
router.get('/:documentId', auth, SecureVaultController.getDocument);
router.get('/:documentId/download', auth, SecureVaultController.downloadDocument);
router.delete('/:documentId', auth, SecureVaultController.deleteDocument);

// Access management
router.post('/:documentId/grant-access', auth, SecureVaultController.grantAgencyAccess);
router.delete('/:documentId/:agencyId/revoke-access', auth, SecureVaultController.revokeAgencyAccess);

// Agency access
router.get('/agency/:agencyId/documents', auth, SecureVaultController.getAgencyDocuments);

// Recovery and alerts
router.post('/:documentId/recovery-guide', auth, SecureVaultController.generateRecoveryGuide);
router.get('/expiring/:days', auth, SecureVaultController.getExpiringDocuments);

// Audit
router.get('/:documentId/audit-log', auth, SecureVaultController.getDocumentAuditLog);

module.exports = router;
