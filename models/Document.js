const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'id-card',
      'driver-license',
      'passport',
      'social-security-card',
      'birth-certificate',
      'dd214',
      'medical-card',
      'insurance-card',
      'pay-stub',
      'tax-return',
      'utility-bill',
      'lease-agreement',
      'court-document',
      'diploma',
      'certification',
      'other'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  fileName: {
    type: String,
    required: true
  },
  originalFileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  checksum: {
    type: String,
    required: true
  },
  isCertified: {
    type: Boolean,
    default: false
  },
  certifiedDate: Date,
  certifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  expirationDate: Date,
  issuedDate: Date,
  issuingAuthority: String,
  documentNumber: String,
  tags: [String],
  status: {
    type: String,
    enum: ['active', 'expired', 'lost', 'damaged', 'replaced'],
    default: 'active'
  },
  access: {
    owner: {
      canView: { type: Boolean, default: true },
      canDownload: { type: Boolean, default: true },
      canShare: { type: Boolean, default: true },
      canDelete: { type: Boolean, default: true }
    },
    agencies: [{
      agency: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agency'
      },
      canView: { type: Boolean, default: false },
      canDownload: { type: Boolean, default: false },
      grantedDate: Date,
      grantedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      expiresDate: Date,
      purpose: String
    }],
    caseWorkers: [{
      caseWorker: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      canView: { type: Boolean, default: false },
      canDownload: { type: Boolean, default: false },
      grantedDate: Date,
      grantedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      expiresDate: Date,
      purpose: String
    }]
  },
  recovery: {
    isRecoveryGuide: { type: Boolean, default: false },
    recoverySteps: [{
      step: Number,
      title: String,
      description: String,
      agency: {
        name: String,
        contact: String,
        address: String,
        requirements: [String]
      },
      estimatedTime: String,
      cost: String,
      documentsNeeded: [String],
      completed: { type: Boolean, default: false },
      completedDate: Date
    }],
    lastUpdated: Date
  },
  sharing: {
    isShared: { type: Boolean, default: false },
    shareCode: String,
    shareExpiry: Date,
    sharePassword: String,
    downloadLimit: Number,
    downloadCount: { type: Number, default: 0 },
    sharedWith: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    sharedDate: Date
  },
  verification: {
    isVerified: { type: Boolean, default: false },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedDate: Date,
    verificationMethod: {
      type: String,
      enum: ['visual', 'agency', 'government', 'third-party']
    },
    verificationNotes: String
  },
  auditLog: [{
    action: {
      type: String,
      enum: ['uploaded', 'viewed', 'downloaded', 'shared', 'access-granted', 'access-revoked', 'certified', 'deleted']
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: { type: Date, default: Date.now },
    ipAddress: String,
    userAgent: String,
    details: String
  }],
  encryption: {
    isEncrypted: { type: Boolean, default: true },
    encryptionKey: String, // Store encrypted key
    algorithm: { type: String, default: 'AES-256-GCM' }
  }
}, {
  timestamps: true
});

// Index for user documents
documentSchema.index({ user: 1, type: 1 });
documentSchema.index({ user: 1, status: 1 });
documentSchema.index({ 'access.agencies.agency': 1 });

// Method to grant agency access
documentSchema.methods.grantAgencyAccess = function(agencyId, permissions, grantedBy, purpose = '', expiresDate = null) {
  // Remove existing access for this agency
  this.access.agencies = this.access.agencies.filter(a => !a.agency.equals(agencyId));
  
  // Add new access
  this.access.agencies.push({
    agency: agencyId,
    canView: permissions.canView || false,
    canDownload: permissions.canDownload || false,
    grantedDate: new Date(),
    grantedBy,
    expiresDate,
    purpose
  });
  
  // Add to audit log
  this.auditLog.push({
    action: 'access-granted',
    performedBy: grantedBy,
    details: `Agency access granted to document: ${this.title}`
  });
  
  return this.save();
};

// Method to revoke agency access
documentSchema.methods.revokeAgencyAccess = function(agencyId, revokedBy) {
  this.access.agencies = this.access.agencies.filter(a => !a.agency.equals(agencyId));
  
  // Add to audit log
  this.auditLog.push({
    action: 'access-revoked',
    performedBy: revokedBy,
    details: `Agency access revoked for document: ${this.title}`
  });
  
  return this.save();
};

// Method to check if user has access
documentSchema.methods.hasAccess = function(userId, agencyId = null) {
  // Owner always has access
  if (this.user.toString() === userId.toString()) {
    return this.access.owner;
  }
  
  // Check agency access
  if (agencyId) {
    const agencyAccess = this.access.agencies.find(a => a.agency.toString() === agencyId.toString());
    if (agencyAccess) {
      // Check if access has expired
      if (agencyAccess.expiresDate && agencyAccess.expiresDate < new Date()) {
        return false;
      }
      return {
        canView: agencyAccess.canView,
        canDownload: agencyAccess.canDownload,
        canShare: false,
        canDelete: false
      };
    }
  }
  
  // Check case worker access
  const caseWorkerAccess = this.access.caseWorkers.find(cw => cw.caseWorker.toString() === userId.toString());
  if (caseWorkerAccess) {
    // Check if access has expired
    if (caseWorkerAccess.expiresDate && caseWorkerAccess.expiresDate < new Date()) {
      return false;
    }
    return {
      canView: caseWorkerAccess.canView,
      canDownload: caseWorkerAccess.canDownload,
      canShare: false,
      canDelete: false
    };
  }
  
  return false;
};

// Method to log access
documentSchema.methods.logAccess = function(userId, action, ipAddress, userAgent) {
  this.auditLog.push({
    action,
    performedBy: userId,
    ipAddress,
    userAgent,
    details: `${action} performed on document: ${this.title}`
  });
  
  // Keep audit log to last 100 entries
  if (this.auditLog.length > 100) {
    this.auditLog = this.auditLog.slice(-100);
  }
  
  return this.save();
};

// Method to generate recovery guide
documentSchema.methods.generateRecoveryGuide = function() {
  const recoveryGuides = {
    'social-security-card': [
      {
        step: 1,
        title: 'Gather Required Documents',
        description: 'You will need proof of identity and proof of citizenship or immigration status.',
        agency: {
          name: 'Social Security Administration',
          contact: '1-800-772-1213',
          address: 'Multiple Las Vegas locations',
          requirements: ['Birth certificate', 'Government-issued ID', 'Proof of citizenship']
        },
        estimatedTime: '2-4 weeks',
        cost: 'Free',
        documentsNeeded: ['Birth certificate', 'State ID or driver license', 'Proof of citizenship']
      },
      {
        step: 2,
        title: 'Complete Application',
        description: 'Fill out Form SS-5 (Application for a Social Security Card).',
        agency: {
          name: 'Social Security Administration',
          contact: '1-800-772-1213',
          address: 'Multiple Las Vegas locations',
          requirements: ['Completed SS-5 form', 'Supporting documents']
        },
        estimatedTime: '30 minutes',
        cost: 'Free',
        documentsNeeded: ['Completed SS-5 form']
      }
    ],
    'id-card': [
      {
        step: 1,
        title: 'Visit DMV Office',
        description: 'Go to a Nevada DMV office with required documents.',
        agency: {
          name: 'Nevada DMV',
          contact: '702-486-4368',
          address: 'Various Las Vegas locations',
          requirements: ['Proof of identity', 'Proof of Nevada residency', 'Social Security number']
        },
        estimatedTime: '1-2 hours',
        cost: '$25.25',
        documentsNeeded: ['Birth certificate', 'Utility bill', 'Social Security card']
      }
    ],
    'birth-certificate': [
      {
        step: 1,
        title: 'Request from Vital Records',
        description: 'Contact the vital records office where you were born.',
        agency: {
          name: 'Clark County Vital Records',
          contact: '702-759-1000',
          address: '170 S. Main St., Las Vegas, NV',
          requirements: ['Valid ID', 'Proof of relationship']
        },
        estimatedTime: '2-6 weeks',
        cost: '$20',
        documentsNeeded: ['Valid government ID', 'Application form']
      }
    ]
  };

  this.recovery.recoverySteps = recoveryGuides[this.type] || [];
  this.recovery.isRecoveryGuide = true;
  this.recovery.lastUpdated = new Date();
  
  return this.save();
};

// Static method to find documents by user and type
documentSchema.statics.findByUserAndType = function(userId, type) {
  return this.find({ user: userId, type, status: 'active' })
    .sort({ createdAt: -1 });
};

// Static method to find expiring documents
documentSchema.statics.findExpiringDocuments = function(days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    expirationDate: { $lte: futureDate, $gte: new Date() },
    status: 'active'
  })
  .populate('user', 'firstName lastName email phone');
};

module.exports = mongoose.model('Document', documentSchema);
