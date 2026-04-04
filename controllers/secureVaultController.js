const Document = require('../models/Document');
const User = require('../models/User');
const Agency = require('../models/Agency');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/documents');
        try {
            await fs.mkdir(uploadPath, { recursive: true });
            cb(null, uploadPath);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        // SECURITY FIX: Using crypto for unpredictable filenames
        const uniqueSuffix = crypto.randomBytes(16).toString('hex');
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `vault-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { 
        fileSize: 5 * 1024 * 1024, // SECURITY FIX: 5MB limit
        files: 1 
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images, PDFs, and Word documents are allowed'));
        }
    }
});

class SecureVaultController {
    // Upload document
    async uploadDocument(req, res) {
        try {
            const { userId, type, title, description, expirationDate, issuedDate, issuingAuthority, documentNumber, tags } = req.body;

            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            if (req.file.size === 0) {
                await fs.unlink(req.file.path);
                return res.status(400).json({ error: 'File is empty.' });
            }

            const fileBuffer = await fs.readFile(req.file.path);
            const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

            const document = new Document({
                user: userId,
                type,
                title,
                description,
                fileName: req.file.filename,
                originalFileName: req.file.originalname,
                filePath: req.file.path,
                fileSize: req.file.size,
                mimeType: req.file.mimetype,
                checksum,
                expirationDate: expirationDate ? new Date(expirationDate) : null,
                issuedDate: issuedDate ? new Date(issuedDate) : null,
                issuingAuthority,
                documentNumber,
                tags: tags ? tags.split(',').map(tag => tag.trim()) : []
            });

            await document.save();
            await document.logAccess(userId, 'uploaded', req.ip, req.get('User-Agent'));

            res.status(201).json({ success: true, message: 'Document uploaded successfully', document });
        } catch (error) {
            if (req.file) await fs.unlink(req.file.path);
            res.status(500).json({ error: 'Failed to upload document' });
        }
    }

    async getUserDocuments(req, res) {
        try {
            const { userId } = req.params;
            const { type, status, page = 1, limit = 20 } = req.query;
            let filter = { user: userId };
            if (type) filter.type = type;
            if (status) filter.status = status;
            const documents = await Document.find(filter)
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .populate('access.agencies.agency', 'name type')
                .populate('access.caseWorkers.caseWorker', 'firstName lastName');
            const total = await Document.countDocuments(filter);
            res.json({
                documents,
                pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch documents' });
        }
    }

    async getDocumentsByCategory(req, res) {
        try {
            const { userId, category } = req.params;
            const documents = await Document.find({ user: userId, type: category }).sort({ createdAt: -1 });
            res.json(documents);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch documents by category' });
        }
    }

    async getExpiringDocuments(req, res) {
        try {
            const { userId } = req.params;
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            const documents = await Document.find({
                user: userId,
                expirationDate: { $lte: thirtyDaysFromNow, $gt: new Date() }
            }).sort({ expirationDate: 1 });
            res.json(documents);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch expiring documents' });
        }
    }

    async getDocument(req, res) {
        try {
            const { documentId } = req.params;
            const { userId, agencyId } = req.query;
            const document = await Document.findById(documentId)
                .populate('user', 'firstName lastName')
                .populate('access.agencies.agency', 'name type')
                .populate('access.caseWorkers.caseWorker', 'firstName lastName');
            if (!document) return res.status(404).json({ error: 'Document not found' });
            const access = document.hasAccess(userId, agencyId);
            if (!access || !access.canView) return res.status(403).json({ error: 'Access denied' });
            await document.logAccess(userId || agencyId, 'viewed', req.ip, req.get('User-Agent'));
            res.json({
                document: { ...document.toObject(), filePath: undefined }, 
                access
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch document' });
        }
    }

    async downloadDocument(req, res) {
        try {
            const { documentId } = req.params;
            const { userId, agencyId } = req.query;
            const document = await Document.findById(documentId);
            if (!document) return res.status(404).json({ error: 'Document not found' });
            const access = document.hasAccess(userId, agencyId);
            if (!access || !access.canDownload) return res.status(403).json({ error: 'Download access denied' });
            try {
                await fs.access(document.filePath);
            } catch (e) {
                return res.status(404).json({ error: 'File not found on server' });
            }
            await document.logAccess(userId || agencyId, 'downloaded', req.ip, req.get('User-Agent'));
            res.setHeader('Content-Disposition', `attachment; filename="${document.originalFileName}"`);
            res.setHeader('Content-Type', document.mimeType);
            const fileStream = require('fs').createReadStream(document.filePath);
            fileStream.pipe(res);
        } catch (error) {
            res.status(500).json({ error: 'Failed to download document' });
        }
    }

    async grantAgencyAccess(req, res) {
        try {
            const { documentId } = req.params;
            const { agencyId, permissions, purpose, expiresDate } = req.body;
            const { userId } = req.query;
            const document = await Document.findById(documentId);
            if (!document || document.user.toString() !== userId) {
                return res.status(403).json({ error: 'Unauthorized' });
            }
            await document.grantAgencyAccess(agencyId, permissions, userId, purpose, expiresDate);
            res.json({ success: true, message: 'Agency access granted' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to grant agency access' });
        }
    }

    async revokeAgencyAccess(req, res) {
        try {
            const { documentId, agencyId } = req.params;
            const { userId } = req.query;
            const document = await Document.findById(documentId);
            if (!document || document.user.toString() !== userId) {
                return res.status(403).json({ error: 'Unauthorized' });
            }
            await document.revokeAgencyAccess(agencyId, userId);
            res.json({ success: true, message: 'Access revoked' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to revoke access' });
        }
    }

    async generateRecoveryGuide(req, res) {
        try {
            const { documentId } = req.params;
            const document = await Document.findById(documentId);
            if (!document) return res.status(404).json({ error: 'Document not found' });
            const guide = {
                title: `Recovery Guide: ${document.title}`,
                steps: [
                    "Contact the issuing authority listed in the vault.",
                    "Provide the document number stored in your encrypted record.",
                    "Use the digital copy in this vault as secondary proof of identity."
                ]
            };
            res.json(guide);
        } catch (error) {
            res.status(500).json({ error: 'Failed to generate guide' });
        }
    }

    async deleteDocument(req, res) {
        try {
            const { documentId } = req.params;
            const { userId } = req.query;
            const document = await Document.findById(documentId);
            if (!document || document.user.toString() !== userId) {
                return res.status(403).json({ error: 'Unauthorized' });
            }
            try {
                await fs.unlink(document.filePath);
            } catch (fileError) {}
            await Document.findByIdAndDelete(documentId);
            res.json({ success: true, message: 'Document deleted' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to delete document' });
        }
    }

    async getDocumentAuditLog(req, res) {
        try {
            const { documentId } = req.params;
            const { userId } = req.query;
            const document = await Document.findById(documentId)
                .select('auditLog')
                .populate('auditLog.performedBy', 'firstName lastName');
            if (!document || document.user.toString() !== userId) {
                return res.status(403).json({ error: 'Access denied' });
            }
            res.json(document.auditLog);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch audit log' });
        }
    }
}

module.exports = { SecureVaultController, upload };
