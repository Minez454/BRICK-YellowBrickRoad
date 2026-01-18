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
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `doc-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
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

      // Calculate file checksum
      const fileBuffer = await fs.readFile(req.file.path);
      const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // Create document record
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

      // Log upload
      await document.logAccess(userId, 'uploaded', req.ip, req.get('User-Agent'));

      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        document
      });
    } catch (error) {
      console.error('Upload document error:', error);
      
      // Clean up uploaded file if database save failed
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          console.error('File cleanup error:', cleanupError);
        }
      }
      
      res.status(500).json({ error: 'Failed to upload document' });
    }
  }

  // Get user documents
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
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get user documents error:', error);
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
  }

  // Get document details
  async getDocument(req, res) {
    try {
      const { documentId } = req.params;
      const { userId, agencyId } = req.query;

      const document = await Document.findById(documentId)
        .populate('user', 'firstName lastName')
        .populate('access.agencies.agency', 'name type')
        .populate('access.caseWorkers.caseWorker', 'firstName lastName');

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Check access permissions
      const access = document.hasAccess(userId, agencyId);
      if (!access || !access.canView) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Log access
      await document.logAccess(userId, 'viewed', req.ip, req.get('User-Agent'));

      res.json({
        document: {
          ...document.toObject(),
          filePath: undefined // Don't expose file path
        },
        access
      });
    } catch (error) {
      console.error('Get document error:', error);
      res.status(500).json({ error: 'Failed to fetch document' });
    }
  }

  // Download document
  async downloadDocument(req, res) {
    try {
      const { documentId } = req.params;
      const { userId, agencyId } = req.query;

      const document = await Document.findById(documentId);

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Check access permissions
      const access = document.hasAccess(userId, agencyId);
      if (!access || !access.canDownload) {
        return res.status(403).json({ error: 'Download access denied' });
      }

      // Check if file exists
      try {
        await fs.access(document.filePath);
      } catch (error) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Log download
      await document.logAccess(userId, 'downloaded', req.ip, req.get('User-Agent'));

      // Send file
      res.setHeader('Content-Disposition', `attachment; filename="${document.originalFileName}"`);
      res.setHeader('Content-Type', document.mimeType);
      
      const fileStream = require('fs').createReadStream(document.filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error('Download document error:', error);
      res.status(500).json({ error: 'Failed to download document' });
    }
  }

  // Grant agency access
  async grantAgencyAccess(req, res) {
    try {
      const { documentId } = req.params;
      const { agencyId, permissions, purpose, expiresDate } = req.body;
      const { userId } = req.query;

      const document = await Document.findById(documentId);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Verify user is the document owner
      if (document.user.toString() !== userId) {
        return res.status(403).json({ error: 'Only document owner can grant access' });
      }

      // Verify agency exists
      const agency = await Agency.findById(agencyId);
      if (!agency) {
        return res.status(404).json({ error: 'Agency not found' });
      }

      await document.grantAgencyAccess(
        agencyId,
        permissions,
        userId,
        purpose,
        expiresDate ? new Date(expiresDate) : null
      );

      res.json({
        success: true,
        message: 'Agency access granted successfully'
      });
    } catch (error) {
      console.error('Grant agency access error:', error);
      res.status(500).json({ error: 'Failed to grant agency access' });
    }
  }

  // Revoke agency access
  async revokeAgencyAccess(req, res) {
    try {
      const { documentId, agencyId } = req.params;
      const { userId } = req.query;

      const document = await Document.findById(documentId);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Verify user is the document owner
      if (document.user.toString() !== userId) {
        return res.status(403).json({ error: 'Only document owner can revoke access' });
      }

      await document.revokeAgencyAccess(agencyId, userId);

      res.json({
        success: true,
        message: 'Agency access revoked successfully'
      });
    } catch (error) {
      console.error('Revoke agency access error:', error);
      res.status(500).json({ error: 'Failed to revoke agency access' });
    }
  }

  // Generate recovery guide
  async generateRecoveryGuide(req, res) {
    try {
      const { documentId } = req.params;
      const { userId } = req.query;

      const document = await Document.findById(documentId);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Verify user is the document owner
      if (document.user.toString() !== userId) {
        return res.status(403).json({ error: 'Only document owner can generate recovery guide' });
      }

      await document.generateRecoveryGuide();

      res.json({
        success: true,
        message: 'Recovery guide generated successfully',
        recoverySteps: document.recovery.recoverySteps
      });
    } catch (error) {
      console.error('Generate recovery guide error:', error);
      res.status(500).json({ error: 'Failed to generate recovery guide' });
    }
  }

  // Get agency accessible documents
  async getAgencyDocuments(req, res) {
    try {
      const { agencyId } = req.params;
      const { userId, page = 1, limit = 20 } = req.query;

      const documents = await Document.find({
        'access.agencies.agency': agencyId,
        'access.agencies.canView': true,
        $or: [
          { 'access.agencies.expiresDate': { $exists: false } },
          { 'access.agencies.expiresDate': { $gt: new Date() } }
        ]
      })
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

      const total = await Document.countDocuments({
        'access.agencies.agency': agencyId,
        'access.agencies.canView': true
      });

      res.json({
        documents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get agency documents error:', error);
      res.status(500).json({ error: 'Failed to fetch agency documents' });
    }
  }

  // Get expiring documents
  async getExpiringDocuments(req, res) {
    try {
      const { days = 30 } = req.query;

      const documents = await Document.findExpiringDocuments(parseInt(days));

      res.json(documents);
    } catch (error) {
      console.error('Get expiring documents error:', error);
      res.status(500).json({ error: 'Failed to fetch expiring documents' });
    }
  }

  // Delete document
  async deleteDocument(req, res) {
    try {
      const { documentId } = req.params;
      const { userId } = req.query;

      const document = await Document.findById(documentId);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Verify user is the document owner
      if (document.user.toString() !== userId) {
        return res.status(403).json({ error: 'Only document owner can delete document' });
      }

      // Delete file
      try {
        await fs.unlink(document.filePath);
      } catch (fileError) {
        console.error('File deletion error:', fileError);
      }

      // Log deletion
      await document.logAccess(userId, 'deleted', req.ip, req.get('User-Agent'));

      // Delete document record
      await Document.findByIdAndDelete(documentId);

      res.json({
        success: true,
        message: 'Document deleted successfully'
      });
    } catch (error) {
      console.error('Delete document error:', error);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  }

  // Get document audit log
  async getDocumentAuditLog(req, res) {
    try {
      const { documentId } = req.params;
      const { userId } = req.query;

      const document = await Document.findById(documentId);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Verify user is the document owner
      if (document.user.toString() !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const auditLog = await Document.findById(documentId)
        .select('auditLog')
        .populate('auditLog.performedBy', 'firstName lastName');

      res.json(auditLog.auditLog);
    } catch (error) {
      console.error('Get audit log error:', error);
      res.status(500).json({ error: 'Failed to fetch audit log' });
    }
  }
}

module.exports = { SecureVaultController, upload };
