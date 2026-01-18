const mongoose = require('mongoose');

const integrationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['hmis', 'benefits', 'law-enforcement', 'healthcare', 'employment', 'education', 'financial'],
    required: true
  },
  provider: {
    type: String,
    required: true
  },
  version: String,
  status: {
    type: String,
    enum: ['active', 'inactive', 'error', 'maintenance'],
    default: 'inactive'
  },
  configuration: {
    apiUrl: String,
    apiKey: String,
    apiSecret: String,
    authenticationMethod: {
      type: String,
      enum: ['oauth2', 'api-key', 'basic', 'certificate']
    },
    oauthConfig: {
      clientId: String,
      clientSecret: String,
      redirectUri: String,
      scopes: [String],
      accessToken: String,
      refreshToken: String,
      tokenExpiry: Date
    },
    webhookUrl: String,
    webhookSecret: String,
    customHeaders: mongoose.Schema.Types.Mixed,
    rateLimit: {
      requestsPerMinute: Number,
      requestsPerHour: Number,
      requestsPerDay: Number
    },
    timeout: Number,
    retryAttempts: Number,
    retryDelay: Number
  },
  dataMapping: {
    userFields: [{
      sourceField: String,
      targetField: String,
      transformation: String,
      required: Boolean,
      defaultValue: String
    }],
    agencyFields: [{
      sourceField: String,
      targetField: String,
      transformation: String,
      required: Boolean,
      defaultValue: String
    }],
    serviceFields: [{
      sourceField: String,
      targetField: String,
      transformation: String,
      required: Boolean,
      defaultValue: String
    }]
  },
  syncSettings: {
    syncDirection: {
      type: String,
      enum: ['inbound', 'outbound', 'bidirectional'],
      default: 'bidirectional'
    },
    syncFrequency: {
      type: String,
      enum: ['realtime', 'hourly', 'daily', 'weekly', 'manual'],
      default: 'daily'
    },
    lastSync: Date,
    nextSync: Date,
    syncSchedule: {
      hour: Number,
      minute: Number,
      dayOfWeek: Number, // 0-6 (Sunday-Saturday)
      dayOfMonth: Number
    },
    dataRetention: {
      days: Number,
      archiveAfter: Boolean
    },
    conflictResolution: {
      type: String,
      enum: ['source-wins', 'target-wins', 'manual', 'timestamp'],
      default: 'timestamp'
    }
  },
  endpoints: [{
    name: String,
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
    },
    path: String,
    description: String,
    parameters: [{
      name: String,
      type: String,
      required: Boolean,
      description: String
    }],
    responseSchema: mongoose.Schema.Types.Mixed,
    errorHandling: {
      retryOnErrors: [String],
      maxRetries: Number,
      backoffMultiplier: Number
    }
  }],
  webhooks: [{
    event: String,
    url: String,
    secret: String,
    active: { type: Boolean, default: true },
    lastTriggered: Date,
    successCount: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 }
  }],
  statistics: {
    totalRequests: { type: Number, default: 0 },
    successfulRequests: { type: Number, default: 0 },
    failedRequests: { type: Number, default: 0 },
    averageResponseTime: Number,
    lastRequestTime: Date,
    lastError: {
      message: String,
      code: String,
      timestamp: Date,
      endpoint: String
    },
    dataVolume: {
      recordsInbound: { type: Number, default: 0 },
      recordsOutbound: { type: Number, default: 0 },
      lastSyncRecords: Number
    }
  },
  monitoring: {
    healthCheck: {
      enabled: { type: Boolean, default: true },
      interval: { type: Number, default: 300000 }, // 5 minutes
      endpoint: String,
      expectedResponse: String,
      timeout: Number
    },
    alerts: [{
      type: {
        type: String,
        enum: ['error-rate', 'response-time', 'data-mismatch', 'connection-failed']
      },
      threshold: Number,
      enabled: { type: Boolean, default: true },
      notificationChannels: [{
        type: {
          type: String,
          enum: ['email', 'sms', 'slack', 'webhook']
        },
        destination: String,
        enabled: { type: Boolean, default: true }
      }]
    }]
  },
  security: {
    encryptionEnabled: { type: Boolean, default: true },
    dataMasking: [{
      field: String,
      maskType: {
        type: String,
        enum: ['partial', 'full', 'hash']
      },
      pattern: String
    }],
    accessControl: {
      allowedIPs: [String],
      requiredPermissions: [String],
      auditLogging: { type: Boolean, default: true }
    },
    compliance: {
      hipaa: { type: Boolean, default: false },
      gdpr: { type: Boolean, default: false },
      ferpa: { type: Boolean, default: false }
    }
  },
  logs: [{
    timestamp: { type: Date, default: Date.now },
    level: {
      type: String,
      enum: ['debug', 'info', 'warn', 'error', 'fatal']
    },
    message: String,
    endpoint: String,
    method: String,
    requestData: mongoose.Schema.Types.Mixed,
    responseData: mongoose.Schema.Types.Mixed,
    error: {
      message: String,
      stack: String,
      code: String
    },
    duration: Number,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
integrationSchema.index({ type: 1, status: 1 });
integrationSchema.index({ 'syncSettings.nextSync': 1 });
integrationSchema.index({ 'logs.timestamp': -1 });
integrationSchema.index({ 'webhooks.event': 1 });

// Method to test connection
integrationSchema.methods.testConnection = async function() {
  try {
    const axios = require('axios');
    
    const config = {
      method: 'GET',
      url: this.configuration.apiUrl || `${this.provider}/health`,
      timeout: this.configuration.timeout || 10000,
      headers: this.buildAuthHeaders()
    };

    const response = await axios(config);
    
    this.status = 'active';
    this.statistics.lastRequestTime = new Date();
    await this.save();

    return {
      success: true,
      responseTime: response.headers['x-response-time'] || 'N/A',
      status: response.status
    };
  } catch (error) {
    this.status = 'error';
    this.statistics.lastError = {
      message: error.message,
      code: error.code,
      timestamp: new Date(),
      endpoint: this.configuration.apiUrl
    };
    await this.save();

    return {
      success: false,
      error: error.message
    };
  }
};

// Method to build authentication headers
integrationSchema.methods.buildAuthHeaders = function() {
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'YellowBrickRoad/1.0'
  };

  // Add custom headers
  if (this.configuration.customHeaders) {
    Object.assign(headers, this.configuration.customHeaders);
  }

  // Add authentication
  switch (this.configuration.authenticationMethod) {
    case 'oauth2':
      if (this.configuration.oauthConfig.accessToken) {
        headers['Authorization'] = `Bearer ${this.configuration.oauthConfig.accessToken}`;
      }
      break;
    case 'api-key':
      if (this.configuration.apiKey) {
        headers['X-API-Key'] = this.configuration.apiKey;
      }
      break;
    case 'basic':
      if (this.configuration.apiKey && this.configuration.apiSecret) {
        const encoded = Buffer.from(`${this.configuration.apiKey}:${this.configuration.apiSecret}`).toString('base64');
        headers['Authorization'] = `Basic ${encoded}`;
      }
      break;
  }

  return headers;
};

// Method to sync data
integrationSchema.methods.syncData = async function(direction = 'bidirectional') {
  try {
    this.logs.push({
      level: 'info',
      message: `Starting ${direction} sync`,
      endpoint: 'sync'
    });

    const syncResults = {
      inbound: { success: 0, failed: 0, errors: [] },
      outbound: { success: 0, failed: 0, errors: [] }
    };

    if (direction === 'inbound' || direction === 'bidirectional') {
      await this.syncInbound(syncResults);
    }

    if (direction === 'outbound' || direction === 'bidirectional') {
      await this.syncOutbound(syncResults);
    }

    // Update sync statistics
    this.syncSettings.lastSync = new Date();
    this.calculateNextSync();
    
    // Update data volume statistics
    this.statistics.dataVolume.lastSyncRecords = 
      syncResults.inbound.success + syncResults.outbound.success;

    await this.save();

    this.logs.push({
      level: 'info',
      message: `Sync completed. Inbound: ${syncResults.inbound.success}, Outbound: ${syncResults.outbound.success}`,
      endpoint: 'sync'
    });

    return syncResults;
  } catch (error) {
    this.logs.push({
      level: 'error',
      message: `Sync failed: ${error.message}`,
      endpoint: 'sync',
      error: {
        message: error.message,
        stack: error.stack
      }
    });
    
    await this.save();
    throw error;
  }
};

// Method to sync inbound data
integrationSchema.methods.syncInbound = async function(syncResults) {
  // Implementation depends on integration type
  switch (this.type) {
    case 'hmis':
      await this.syncHMISInbound(syncResults);
      break;
    case 'benefits':
      await this.syncBenefitsInbound(syncResults);
      break;
    case 'law-enforcement':
      await this.syncLawEnforcementInbound(syncResults);
      break;
    default:
      await this.syncGenericInbound(syncResults);
  }
};

// Method to sync outbound data
integrationSchema.methods.syncOutbound = async function(syncResults) {
  // Implementation depends on integration type
  switch (this.type) {
    case 'hmis':
      await this.syncHMISOutbound(syncResults);
      break;
    case 'benefits':
      await this.syncBenefitsOutbound(syncResults);
      break;
    case 'law-enforcement':
      await this.syncLawEnforcementOutbound(syncResults);
      break;
    default:
      await this.syncGenericOutbound(syncResults);
  }
};

// HMIS specific sync methods
integrationSchema.methods.syncHMISInbound = async function(syncResults) {
  const User = require('../models/User');
  const axios = require('axios');

  try {
    // Get clients from HMIS
    const response = await axios.get(`${this.configuration.apiUrl}/clients`, {
      headers: this.buildAuthHeaders(),
      timeout: this.configuration.timeout
    });

    const clients = response.data;
    
    for (const client of clients) {
      try {
        // Map HMIS data to YellowBrickRoad user format
        const userData = this.mapUserData(client, 'hmis');
        
        // Find or create user
        await User.findOneAndUpdate(
          { 'externalIds.hmis': client.id },
          userData,
          { upsert: true, new: true }
        );
        
        syncResults.inbound.success++;
      } catch (error) {
        syncResults.inbound.failed++;
        syncResults.inbound.errors.push({
          clientId: client.id,
          error: error.message
        });
      }
    }
  } catch (error) {
    throw new Error(`HMIS inbound sync failed: ${error.message}`);
  }
};

integrationSchema.methods.syncHMISOutbound = async function(syncResults) {
  const User = require('../models/User');
  const axios = require('axios');

  try {
    // Get users that need to be synced to HMIS
    const users = await User.find({
      $or: [
        { 'externalIds.hmis': { $exists: false } },
        { 'lastUpdated': { $gt: this.syncSettings.lastSync } }
      ]
    });

    for (const user of users) {
      try {
        // Map YellowBrickRoad user data to HMIS format
        const hmisData = this.mapUserData(user, 'yellowbrickroad');
        
        let response;
        if (user.externalIds?.hmis) {
          // Update existing client
          response = await axios.put(
            `${this.configuration.apiUrl}/clients/${user.externalIds.hmis}`,
            hmisData,
            { headers: this.buildAuthHeaders() }
          );
        } else {
          // Create new client
          response = await axios.post(
            `${this.configuration.apiUrl}/clients`,
            hmisData,
            { headers: this.buildAuthHeaders() }
          );
          
          // Store the external ID
          user.externalIds = user.externalIds || {};
          user.externalIds.hmis = response.data.id;
          await user.save();
        }
        
        syncResults.outbound.success++;
      } catch (error) {
        syncResults.outbound.failed++;
        syncResults.outbound.errors.push({
          userId: user._id,
          error: error.message
        });
      }
    }
  } catch (error) {
    throw new Error(`HMIS outbound sync failed: ${error.message}`);
  }
};

// Benefits specific sync methods
integrationSchema.methods.syncBenefitsInbound = async function(syncResults) {
  const User = require('../models/User');
  const axios = require('axios');

  try {
    // Get benefit eligibility data
    const response = await axios.get(`${this.configuration.apiUrl}/eligibility`, {
      headers: this.buildAuthHeaders(),
      timeout: this.configuration.timeout
    });

    const eligibilityData = response.data;
    
    for (const eligibility of eligibilityData) {
      try {
        // Update user benefits information
        await User.findOneAndUpdate(
          { 'externalIds.benefits': eligibility.clientId },
          {
            'benefits.status': eligibility.status,
            'benefits.type': eligibility.benefits,
            'benefits.amount': eligibility.amount,
            'benefits.nextReview': eligibility.nextReview
          },
          { upsert: true }
        );
        
        syncResults.inbound.success++;
      } catch (error) {
        syncResults.inbound.failed++;
        syncResults.inbound.errors.push({
          eligibilityId: eligibility.id,
          error: error.message
        });
      }
    }
  } catch (error) {
    throw new Error(`Benefits inbound sync failed: ${error.message}`);
  }
};

// Law enforcement specific sync methods
integrationSchema.methods.syncLawEnforcementInbound = async function(syncResults) {
  const { HealthLegal } = require('../models/HealthLegal');
  const axios = require('axios');

  try {
    // Get warrant information
    const response = await axios.get(`${this.configuration.apiUrl}/warrants`, {
      headers: this.buildAuthHeaders(),
      timeout: this.configuration.timeout
    });

    const warrants = response.data;
    
    for (const warrant of warrants) {
      try {
        // Find user by matching criteria
        const user = await User.findOne({
          $or: [
            { firstName: warrant.firstName, lastName: warrant.lastName },
            { 'externalIds.dmv': warrant.licenseNumber }
          ]
        });

        if (user) {
          // Update or create warrant record
          const healthLegal = await HealthLegal.findOneAndUpdate(
            { user: user._id },
            {
              $push: {
                warrants: {
                  type: warrant.type.toLowerCase().replace(' ', '-'),
                  caseNumber: warrant.caseNumber,
                  issuingAgency: warrant.agency,
                  issuedDate: warrant.issuedDate,
                  severity: warrant.severity.toLowerCase(),
                  description: warrant.description
                }
              }
            },
            { upsert: true, new: true }
          );
          
          syncResults.inbound.success++;
        }
      } catch (error) {
        syncResults.inbound.failed++;
        syncResults.inbound.errors.push({
          warrantId: warrant.id,
          error: error.message
        });
      }
    }
  } catch (error) {
    throw new Error(`Law enforcement inbound sync failed: ${error.message}`);
  }
};

// Generic sync methods
integrationSchema.methods.syncGenericInbound = async function(syncResults) {
  // Generic implementation for other integration types
  console.log(`Generic inbound sync for ${this.type}`);
};

integrationSchema.methods.syncGenericOutbound = async function(syncResults) {
  // Generic implementation for other integration types
  console.log(`Generic outbound sync for ${this.type}`);
};

// Method to map user data between systems
integrationSchema.methods.mapUserData = function(data, source) {
  if (source === 'hmis') {
    return {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      dateOfBirth: data.dob,
      'currentSituation.housingStatus': data.housingStatus,
      'externalIds.hmis': data.id,
      lastUpdated: new Date()
    };
  } else if (source === 'yellowbrickroad') {
    return {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      dob: data.dateOfBirth,
      housingStatus: data.currentSituation?.housingStatus,
      id: data.externalIds?.hmis
    };
  }
  
  return {};
};

// Method to calculate next sync time
integrationSchema.methods.calculateNextSync = function() {
  const now = new Date();
  
  switch (this.syncSettings.syncFrequency) {
    case 'hourly':
      this.syncSettings.nextSync = new Date(now.getTime() + 60 * 60 * 1000);
      break;
    case 'daily':
      this.syncSettings.nextSync = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      break;
    case 'weekly':
      this.syncSettings.nextSync = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      break;
    case 'monthly':
      this.syncSettings.nextSync = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      break;
  }
};

// Method to log API request
integrationSchema.methods.logRequest = function(level, message, endpoint, method, requestData, responseData, error, duration) {
  this.logs.push({
    level,
    message,
    endpoint,
    method,
    requestData,
    responseData,
    error: error ? {
      message: error.message,
      stack: error.stack,
      code: error.code
    } : undefined,
    duration,
    timestamp: new Date()
  });

  // Keep logs to last 1000 entries
  if (this.logs.length > 1000) {
    this.logs = this.logs.slice(-1000);
  }
};

// Static method to get active integrations
integrationSchema.statics.getActiveIntegrations = function(type = null) {
  const filter = { status: 'active' };
  if (type) {
    filter.type = type;
  }
  
  return this.find(filter)
    .populate('createdBy', 'firstName lastName')
    .sort({ name: 1 });
};

// Static method to get integrations needing sync
integrationSchema.statics.getIntegrationsNeedingSync = function() {
  return this.find({
    status: 'active',
    'syncSettings.nextSync': { $lte: new Date() }
  });
};

module.exports = mongoose.model('Integration', integrationSchema);
