const mongoose = require('mongoose');
const crypto = require('crypto');

const biometricAuthSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  biometricType: {
    type: String,
    enum: ['fingerprint', 'facial', 'voice', 'iris', 'palm', 'signature'],
    required: true
  },
  biometricData: {
    // Encrypted biometric template
    template: {
      type: String,
      required: true
    },
    // Biometric features vector
    features: [Number],
    // Quality score of enrollment
    quality: {
      type: Number,
      min: 0,
      max: 100,
      required: true
    },
    // Device used for enrollment
    deviceInfo: {
      type: String,
      platform: String,
      deviceId: String,
      sensorType: String
    },
    // Enrollment metadata
    enrollmentDate: {
      type: Date,
      default: Date.now
    },
    enrollmentLocation: {
      ip: String,
      userAgent: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    }
  },
  security: {
    // Encryption algorithm used
    algorithm: {
      type: String,
      default: 'AES-256-GCM'
    },
    // Salt used for encryption
    salt: String,
    // Initialization vector
    iv: String,
    // Authentication tag
    authTag: String,
    // Hash of the biometric data for integrity
    integrityHash: String,
    // Liveness detection results
    livenessDetection: {
      enabled: { type: Boolean, default: true },
      methods: [{
        type: {
          type: String,
          enum: ['challenge-response', 'passive-liveness', 'active-liveness']
        },
        confidence: Number,
        timestamp: Date
      }]
    },
    // Anti-spoofing measures
    antiSpoofing: {
      enabled: { type: Boolean, default: true },
      confidence: Number,
      methods: [String]
    }
  },
  verification: {
    // Verification history
    attempts: [{
      timestamp: { type: Date, default: Date.now },
      success: Boolean,
      confidence: Number,
      falseAcceptRate: Number,
      falseRejectRate: Number,
      processingTime: Number, // in milliseconds
      deviceInfo: {
        platform: String,
        deviceId: String,
        sensorType: String
      },
      location: {
        ip: String,
        coordinates: {
          lat: Number,
          lng: Number
        }
      },
      riskScore: {
        overall: Number,
        factors: [{
          type: String,
          score: Number,
          description: String
        }]
      }
    }],
    // Statistics
    totalAttempts: { type: Number, default: 0 },
    successfulVerifications: { type: Number, default: 0 },
    failedVerifications: { type: Number, default: 0 },
    averageConfidence: Number,
    averageProcessingTime: Number,
    lastVerification: Date,
    // Adaptive threshold
    adaptiveThreshold: {
      current: { type: Number, default: 0.7 },
      min: { type: Number, default: 0.5 },
      max: { type: Number, default: 0.9 },
      adjustmentHistory: [{
        timestamp: Date,
        oldValue: Number,
        newValue: Number,
        reason: String
      }]
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'revoked'],
    default: 'active'
  },
  permissions: {
    canLogin: { type: Boolean, default: true },
    canAccessDocuments: { type: Boolean, default: true },
    canApproveTransactions: { type: Boolean, default: false },
    canModifySettings: { type: Boolean, default: false }
  },
  backup: {
    // Backup templates for redundancy
    backupTemplates: [{
      template: String,
      algorithm: String,
      created: Date,
      location: String // cloud, local, etc.
    }],
    // Recovery information
    recoveryQuestions: [{
      question: String,
      answerHash: String, // Hashed answer
      created: Date
    }]
  },
  compliance: {
    // Regulatory compliance
    hipaa: { type: Boolean, default: true },
    gdpr: { type: Boolean, default: true },
    ccpa: { type: Boolean, default: true },
    // Consent management
    consent: {
      given: { type: Boolean, default: false },
      date: Date,
      version: String,
      ipAddress: String,
      userAgent: String
    },
    // Data retention
    retentionPolicy: {
      autoDelete: { type: Boolean, default: false },
      retentionPeriod: Number, // in days
      lastReview: Date
    }
  },
  auditLog: [{
    action: {
      type: String,
      enum: ['enrollment', 'verification', 'update', 'deletion', 'suspension', 'revocation']
    },
    timestamp: { type: Date, default: Date.now },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    details: String,
    ipAddress: String,
    userAgent: String,
    success: Boolean,
    riskScore: Number
  }]
}, {
  timestamps: true
});

// Indexes for efficient queries
biometricAuthSchema.index({ user: 1, biometricType: 1 });
biometricAuthSchema.index({ status: 1 });
biometricAuthSchema.index({ 'verification.attempts.timestamp': -1 });
biometricAuthSchema.index({ 'auditLog.timestamp': -1 });

// Method to encrypt biometric data
biometricAuthSchema.methods.encryptBiometricData = function(biometricTemplate, features) {
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(process.env.BIOMETRIC_ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipher(algorithm, key);
  cipher.setAAD(Buffer.from('biometric-data'));
  
  let encrypted = cipher.update(biometricTemplate, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  this.biometricData.template = encrypted;
  this.security.algorithm = algorithm;
  this.security.iv = iv.toString('hex');
  this.security.authTag = authTag.toString('hex');
  this.security.integrityHash = crypto.createHash('sha256').update(biometricTemplate).digest('hex');
  this.biometricData.features = features;
};

// Method to verify biometric data
biometricAuthSchema.methods.verifyBiometric = function(candidateTemplate, deviceInfo = {}) {
  return new Promise((resolve, reject) => {
    try {
      const startTime = Date.now();
      
      // Decrypt stored template
      const key = crypto.scryptSync(process.env.BIOMETRIC_ENCRYPTION_KEY, 'salt', 32);
      const iv = Buffer.from(this.security.iv, 'hex');
      const authTag = Buffer.from(this.security.authTag, 'hex');
      
      const decipher = crypto.createDecipher(this.security.algorithm, key);
      decipher.setAAD(Buffer.from('biometric-data'));
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(this.biometricData.template, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      // Verify integrity
      const computedHash = crypto.createHash('sha256').update(decrypted).digest('hex');
      if (computedHash !== this.security.integrityHash) {
        throw new Error('Biometric data integrity check failed');
      }
      
      // Perform biometric matching
      const matchResult = this.performBiometricMatch(decrypted, candidateTemplate);
      
      const processingTime = Date.now() - startTime;
      
      // Calculate risk score
      const riskScore = this.calculateRiskScore(matchResult, deviceInfo);
      
      // Record verification attempt
      const attempt = {
        timestamp: new Date(),
        success: matchResult.match,
        confidence: matchResult.confidence,
        processingTime,
        deviceInfo,
        riskScore
      };
      
      this.verification.attempts.push(attempt);
      this.verification.totalAttempts++;
      this.verification.lastVerification = new Date();
      
      if (matchResult.match) {
        this.verification.successfulVerifications++;
      } else {
        this.verification.failedVerifications++;
      }
      
      // Update average confidence and processing time
      this.updateStatistics();
      
      // Adaptive threshold adjustment
      this.adjustAdaptiveThreshold();
      
      // Add to audit log
      this.auditLog.push({
        action: 'verification',
        success: matchResult.match,
        details: `Biometric verification: ${matchResult.match ? 'success' : 'failed'}`,
        riskScore: riskScore.overall
      });
      
      // Keep audit log to last 1000 entries
      if (this.auditLog.length > 1000) {
        this.auditLog = this.auditLog.slice(-1000);
      }
      
      this.save().then(() => {
        resolve({
          match: matchResult.match,
          confidence: matchResult.confidence,
          processingTime,
          riskScore
        });
      }).catch(reject);
      
    } catch (error) {
      reject(error);
    }
  });
};

// Method to perform biometric matching
biometricAuthSchema.methods.performBiometricMatch = function(storedTemplate, candidateTemplate) {
  // This is a simplified matching algorithm
  // In production, you'd use sophisticated biometric matching algorithms
  
  const similarity = this.calculateSimilarity(storedTemplate, candidateTemplate);
  const threshold = this.verification.adaptiveThreshold.current;
  
  return {
    match: similarity >= threshold,
    confidence: similarity,
    similarity: similarity,
    threshold: threshold
  };
};

// Method to calculate similarity between biometric templates
biometricAuthSchema.methods.calculateSimilarity = function(template1, template2) {
  // Simplified similarity calculation
  // In production, use appropriate algorithms for each biometric type
  
  if (this.biometricType === 'fingerprint') {
    return this.calculateFingerprintSimilarity(template1, template2);
  } else if (this.biometricType === 'facial') {
    return this.calculateFacialSimilarity(template1, template2);
  } else if (this.biometricType === 'voice') {
    return this.calculateVoiceSimilarity(template1, template2);
  }
  
  // Default similarity calculation
  return Math.random() * 100; // Placeholder
};

// Biometric type specific similarity methods
biometricAuthSchema.methods.calculateFingerprintSimilarity = function(template1, template2) {
  // Minutiae-based matching algorithm
  const minutiae1 = this.extractMinutiae(template1);
  const minutiae2 = this.extractMinutiae(template2);
  
  let matches = 0;
  const threshold = 15; // Distance threshold in pixels
  
  for (const m1 of minutiae1) {
    for (const m2 of minutiae2) {
      const distance = Math.sqrt(
        Math.pow(m1.x - m2.x, 2) + Math.pow(m1.y - m2.y, 2)
      );
      
      if (distance < threshold && Math.abs(m1.angle - m2.angle) < 15) {
        matches++;
        break;
      }
    }
  }
  
  const similarity = (matches / Math.min(minutiae1.length, minutiae2.length)) * 100;
  return Math.min(100, similarity);
};

biometricAuthSchema.methods.calculateFacialSimilarity = function(template1, template2) {
  // Face recognition algorithm
  const features1 = this.extractFacialFeatures(template1);
  const features2 = this.extractFacialFeatures(template2);
  
  let totalDistance = 0;
  for (let i = 0; i < features1.length; i++) {
    totalDistance += Math.abs(features1[i] - features2[i]);
  }
  
  const averageDistance = totalDistance / features1.length;
  const similarity = Math.max(0, 100 - averageDistance);
  
  return similarity;
};

biometricAuthSchema.methods.calculateVoiceSimilarity = function(template1, template2) {
  // Voice recognition algorithm
  const mfcc1 = this.extractMFCC(template1);
  const mfcc2 = this.extractMFCC(template2);
  
  let similarity = 0;
  for (let i = 0; i < mfcc1.length; i++) {
    similarity += this.cosineSimilarity(mfcc1[i], mfcc2[i]);
  }
  
  return (similarity / mfcc1.length) * 100;
};

// Helper methods
biometricAuthSchema.methods.extractMinutiae = function(template) {
  // Extract minutiae points from fingerprint template
  // This is a placeholder implementation
  return [
    { x: 100, y: 150, angle: 45 },
    { x: 200, y: 180, angle: 90 },
    { x: 150, y: 220, angle: 135 }
  ];
};

biometricAuthSchema.methods.extractFacialFeatures = function(template) {
  // Extract facial features from template
  // This is a placeholder implementation
  return [0.5, 0.3, 0.7, 0.2, 0.8, 0.4, 0.6, 0.9];
};

biometricAuthSchema.methods.extractMFCC = function(template) {
  // Extract MFCC features from voice template
  // This is a placeholder implementation
  return [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6], [0.7, 0.8, 0.9]];
};

biometricAuthSchema.methods.cosineSimilarity = function(vector1, vector2) {
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;
  
  for (let i = 0; i < vector1.length; i++) {
    dotProduct += vector1[i] * vector2[i];
    magnitude1 += vector1[i] * vector1[i];
    magnitude2 += vector2[i] * vector2[i];
  }
  
  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);
  
  return dotProduct / (magnitude1 * magnitude2);
};

// Method to calculate risk score
biometricAuthSchema.methods.calculateRiskScore = function(matchResult, deviceInfo) {
  let riskScore = 0;
  const factors = [];
  
  // Low confidence increases risk
  if (matchResult.confidence < 60) {
    riskScore += 30;
    factors.push({
      type: 'low_confidence',
      score: 30,
      description: 'Low biometric match confidence'
    });
  }
  
  // New device increases risk
  if (deviceInfo.deviceId && this.verification.attempts.length > 0) {
    const knownDevices = new Set(
      this.verification.attempts.map(a => a.deviceInfo?.deviceId).filter(Boolean)
    );
    
    if (!knownDevices.has(deviceInfo.deviceId)) {
      riskScore += 20;
      factors.push({
        type: 'new_device',
        score: 20,
        description: 'Verification from new device'
      });
    }
  }
  
  // Recent failed attempts increase risk
  const recentFailures = this.verification.attempts
    .filter(a => !a.success && a.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000))
    .length;
  
  if (recentFailures > 3) {
    riskScore += 25;
    factors.push({
      type: 'recent_failures',
      score: 25,
      description: 'Multiple recent failed attempts'
    });
  }
  
  // Unusual location increases risk
  if (deviceInfo.coordinates) {
    const knownLocations = this.verification.attempts
      .filter(a => a.location?.coordinates)
      .map(a => a.location.coordinates);
    
    if (knownLocations.length > 0) {
      const minDistance = Math.min(...knownLocations.map(loc => 
        this.calculateDistance(deviceInfo.coordinates, loc)
      ));
      
      if (minDistance > 100) { // 100km
        riskScore += 15;
        factors.push({
          type: 'unusual_location',
          score: 15,
          description: 'Verification from unusual location'
        });
      }
    }
  }
  
  return {
    overall: Math.min(100, riskScore),
    factors
  };
};

// Method to calculate distance between coordinates
biometricAuthSchema.methods.calculateDistance = function(coord1, coord2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLon = (coord2.lng - coord1.lng) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Method to update statistics
biometricAuthSchema.methods.updateStatistics = function() {
  const successfulAttempts = this.verification.attempts.filter(a => a.success);
  const allAttempts = this.verification.attempts;
  
  if (successfulAttempts.length > 0) {
    this.verification.averageConfidence = 
      successfulAttempts.reduce((sum, a) => sum + a.confidence, 0) / successfulAttempts.length;
  }
  
  if (allAttempts.length > 0) {
    this.verification.averageProcessingTime = 
      allAttempts.reduce((sum, a) => sum + a.processingTime, 0) / allAttempts.length;
  }
};

// Method to adjust adaptive threshold
biometricAuthSchema.methods.adjustAdaptiveThreshold = function() {
  const recentAttempts = this.verification.attempts.slice(-20); // Last 20 attempts
  const falseAccepts = recentAttempts.filter(a => a.success && a.confidence < 0.8).length;
  const falseRejects = recentAttempts.filter(a => !a.success && a.confidence > 0.6).length;
  
  const currentThreshold = this.verification.adaptiveThreshold.current;
  let newThreshold = currentThreshold;
  
  if (falseAccepts > 2) {
    // Increase threshold to reduce false accepts
    newThreshold = Math.min(this.verification.adaptiveThreshold.max, currentThreshold + 0.05);
  } else if (falseRejects > 3) {
    // Decrease threshold to reduce false rejects
    newThreshold = Math.max(this.verification.adaptiveThreshold.min, currentThreshold - 0.05);
  }
  
  if (newThreshold !== currentThreshold) {
    this.verification.adaptiveThreshold.adjustmentHistory.push({
      timestamp: new Date(),
      oldValue: currentThreshold,
      newValue: newThreshold,
      reason: falseAccepts > 2 ? 'reduce_false_accepts' : 'reduce_false_rejects'
    });
    
    this.verification.adaptiveThreshold.current = newThreshold;
  }
};

// Static method to find user biometrics
biometricAuthSchema.statics.findByUser = function(userId, biometricType = null) {
  const query = { user: userId, status: 'active' };
  if (biometricType) {
    query.biometricType = biometricType;
  }
  
  return this.find(query);
};

// Static method to verify user biometrics
biometricAuthSchema.statics.verifyUser = function(userId, biometricType, candidateTemplate, deviceInfo) {
  return this.findOne({ user: userId, biometricType, status: 'active' })
    .then(biometric => {
      if (!biometric) {
        throw new Error('Biometric not found');
      }
      return biometric.verifyBiometric(candidateTemplate, deviceInfo);
    });
};

module.exports = mongoose.model('BiometricAuth', biometricAuthSchema);
