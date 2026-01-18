const Integration = require('../models/Integration');
const User = require('../models/User');
const Agency = require('../models/Agency');
const axios = require('axios');
const cron = require('node-cron');

class IntegrationController {
  constructor() {
    this.initializeScheduledSync();
  }

  // Get all integrations
  async getIntegrations(req, res) {
    try {
      const { type, status } = req.query;
      
      let filter = {};
      if (type) filter.type = type;
      if (status) filter.status = status;

      const integrations = await Integration.find(filter)
        .populate('createdBy', 'firstName lastName')
        .populate('updatedBy', 'firstName lastName')
        .sort({ name: 1 });

      res.json(integrations);
    } catch (error) {
      console.error('Get integrations error:', error);
      res.status(500).json({ error: 'Failed to fetch integrations' });
    }
  }

  // Create new integration
  async createIntegration(req, res) {
    try {
      const integrationData = {
        ...req.body,
        createdBy: req.user.id
      };

      const integration = new Integration(integrationData);
      await integration.save();

      // Test connection if configuration is provided
      if (integration.configuration.apiUrl) {
        const connectionTest = await integration.testConnection();
        integration.statistics = {
          ...integration.statistics,
          lastConnectionTest: connectionTest
        };
        await integration.save();
      }

      res.status(201).json({
        success: true,
        message: 'Integration created successfully',
        integration
      });
    } catch (error) {
      console.error('Create integration error:', error);
      res.status(500).json({ error: 'Failed to create integration' });
    }
  }

  // Update integration
  async updateIntegration(req, res) {
    try {
      const { integrationId } = req.params;
      const updates = req.body;
      updates.updatedBy = req.user.id;

      const integration = await Integration.findByIdAndUpdate(
        integrationId,
        updates,
        { new: true }
      );

      if (!integration) {
        return res.status(404).json({ error: 'Integration not found' });
      }

      res.json({
        success: true,
        message: 'Integration updated successfully',
        integration
      });
    } catch (error) {
      console.error('Update integration error:', error);
      res.status(500).json({ error: 'Failed to update integration' });
    }
  }

  // Delete integration
  async deleteIntegration(req, res) {
    try {
      const { integrationId } = req.params;

      const integration = await Integration.findByIdAndDelete(integrationId);
      if (!integration) {
        return res.status(404).json({ error: 'Integration not found' });
      }

      res.json({
        success: true,
        message: 'Integration deleted successfully'
      });
    } catch (error) {
      console.error('Delete integration error:', error);
      res.status(500).json({ error: 'Failed to delete integration' });
    }
  }

  // Test integration connection
  async testConnection(req, res) {
    try {
      const { integrationId } = req.params;

      const integration = await Integration.findById(integrationId);
      if (!integration) {
        return res.status(404).json({ error: 'Integration not found' });
      }

      const testResult = await integration.testConnection();

      res.json({
        success: testResult.success,
        result: testResult
      });
    } catch (error) {
      console.error('Test connection error:', error);
      res.status(500).json({ error: 'Connection test failed' });
    }
  }

  // Trigger manual sync
  async triggerSync(req, res) {
    try {
      const { integrationId } = req.params;
      const { direction = 'bidirectional' } = req.body;

      const integration = await Integration.findById(integrationId);
      if (!integration) {
        return res.status(404).json({ error: 'Integration not found' });
      }

      const syncResults = await integration.syncData(direction);

      res.json({
        success: true,
        message: 'Sync completed successfully',
        results: syncResults
      });
    } catch (error) {
      console.error('Trigger sync error:', error);
      res.status(500).json({ error: 'Sync failed' });
    }
  }

  // Get integration logs
  async getLogs(req, res) {
    try {
      const { integrationId } = req.params;
      const { level, limit = 100, page = 1 } = req.query;

      const integration = await Integration.findById(integrationId);
      if (!integration) {
        return res.status(404).json({ error: 'Integration not found' });
      }

      let logs = integration.logs;
      
      // Filter by level if specified
      if (level) {
        logs = logs.filter(log => log.level === level);
      }

      // Pagination
      const startIndex = (page - 1) * limit;
      const paginatedLogs = logs
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(startIndex, startIndex + parseInt(limit));

      res.json({
        logs: paginatedLogs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: logs.length,
          pages: Math.ceil(logs.length / limit)
        }
      });
    } catch (error) {
      console.error('Get logs error:', error);
      res.status(500).json({ error: 'Failed to fetch logs' });
    }
  }

  // Get integration statistics
  async getStatistics(req, res) {
    try {
      const { integrationId } = req.params;

      const integration = await Integration.findById(integrationId);
      if (!integration) {
        return res.status(404).json({ error: 'Integration not found' });
      }

      res.json({
        statistics: integration.statistics,
        monitoring: integration.monitoring,
        lastSync: integration.syncSettings.lastSync,
        nextSync: integration.syncSettings.nextSync
      });
    } catch (error) {
      console.error('Get statistics error:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  }

  // HMIS specific endpoints
  async syncHMISClient(req, res) {
    try {
      const { clientId } = req.params;
      const { action } = req.body; // 'create', 'update', 'delete'

      const hmisIntegration = await Integration.findOne({ 
        type: 'hmis', 
        status: 'active' 
      });

      if (!hmisIntegration) {
        return res.status(404).json({ error: 'HMIS integration not found' });
      }

      let result;
      switch (action) {
        case 'create':
          result = await this.createHMISClient(clientId, hmisIntegration);
          break;
        case 'update':
          result = await this.updateHMISClient(clientId, hmisIntegration);
          break;
        case 'delete':
          result = await this.deleteHMISClient(clientId, hmisIntegration);
          break;
        default:
          return res.status(400).json({ error: 'Invalid action' });
      }

      res.json({
        success: true,
        result
      });
    } catch (error) {
      console.error('HMIS sync error:', error);
      res.status(500).json({ error: 'HMIS sync failed' });
    }
  }

  // Benefits specific endpoints
  async checkBenefitsEligibility(req, res) {
    try {
      const { userId } = req.params;
      const { benefitTypes } = req.body;

      const benefitsIntegration = await Integration.findOne({ 
        type: 'benefits', 
        status: 'active' 
      });

      if (!benefitsIntegration) {
        return res.status(404).json({ error: 'Benefits integration not found' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const eligibilityResults = await this.checkEligibility(user, benefitTypes, benefitsIntegration);

      res.json({
        success: true,
        eligibility: eligibilityResults
      });
    } catch (error) {
      console.error('Benefits eligibility check error:', error);
      res.status(500).json({ error: 'Eligibility check failed' });
    }
  }

  // Law enforcement specific endpoints
  async checkWarrants(req, res) {
    try {
      const { userId } = req.params;

      const lawEnforcementIntegration = await Integration.findOne({ 
        type: 'law-enforcement', 
        status: 'active' 
      });

      if (!lawEnforcementIntegration) {
        return res.status(404).json({ error: 'Law enforcement integration not found' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const warrantResults = await this.checkForWarrants(user, lawEnforcementIntegration);

      res.json({
        success: true,
        warrants: warrantResults
      });
    } catch (error) {
      console.error('Warrant check error:', error);
      res.status(500).json({ error: 'Warrant check failed' });
    }
  }

  // Healthcare specific endpoints
  async syncMedicalRecords(req, res) {
    try {
      const { userId } = req.params;
      const { action } = req.body;

      const healthcareIntegration = await Integration.findOne({ 
        type: 'healthcare', 
        status: 'active' 
      });

      if (!healthcareIntegration) {
        return res.status(404).json({ error: 'Healthcare integration not found' });
      }

      const result = await this.syncMedicalData(userId, action, healthcareIntegration);

      res.json({
        success: true,
        result
      });
    } catch (error) {
      console.error('Medical records sync error:', error);
      res.status(500).json({ error: 'Medical records sync failed' });
    }
  }

  // Helper methods for specific integrations
  async createHMISClient(clientId, integration) {
    const user = await User.findById(clientId);
    const hmisData = integration.mapUserData(user, 'yellowbrickroad');

    const response = await axios.post(
      `${integration.configuration.apiUrl}/clients`,
      hmisData,
      { headers: integration.buildAuthHeaders() }
    );

    // Store the external ID
    user.externalIds = user.externalIds || {};
    user.externalIds.hmis = response.data.id;
    await user.save();

    return response.data;
  }

  async updateHMISClient(clientId, integration) {
    const user = await User.findById(clientId);
    const hmisData = integration.mapUserData(user, 'yellowbrickroad');

    const response = await axios.put(
      `${integration.configuration.apiUrl}/clients/${user.externalIds.hmis}`,
      hmisData,
      { headers: integration.buildAuthHeaders() }
    );

    return response.data;
  }

  async deleteHMISClient(clientId, integration) {
    const user = await User.findById(clientId);

    const response = await axios.delete(
      `${integration.configuration.apiUrl}/clients/${user.externalIds.hmis}`,
      { headers: integration.buildAuthHeaders() }
    );

    // Remove external ID
    delete user.externalIds.hmis;
    await user.save();

    return response.data;
  }

  async checkEligibility(user, benefitTypes, integration) {
    const eligibilityData = {
      firstName: user.firstName,
      lastName: user.lastName,
      dateOfBirth: user.dateOfBirth,
      income: user.currentSituation?.income,
      familySize: user.currentSituation?.familySize,
      address: user.address,
      benefitTypes
    };

    const response = await axios.post(
      `${integration.configuration.apiUrl}/eligibility/check`,
      eligibilityData,
      { headers: integration.buildAuthHeaders() }
    );

    return response.data;
  }

  async checkForWarrants(user, integration) {
    const searchCriteria = {
      firstName: user.firstName,
      lastName: user.lastName,
      dateOfBirth: user.dateOfBirth
    };

    const response = await axios.post(
      `${integration.configuration.apiUrl}/warrants/search`,
      searchCriteria,
      { headers: integration.buildAuthHeaders() }
    );

    return response.data;
  }

  async syncMedicalData(userId, action, integration) {
    const { HealthLegal } = require('../models/HealthLegal');
    const healthLegal = await HealthLegal.findOne({ user: userId });

    if (!healthLegal) {
      throw new Error('Health and legal tracker not found');
    }

    const medicalData = {
      patientId: userId,
      medications: healthLegal.medications,
      appointments: healthLegal.appointments,
      action
    };

    const response = await axios.post(
      `${integration.configuration.apiUrl}/patients/sync`,
      medicalData,
      { headers: integration.buildAuthHeaders() }
    );

    return response.data;
  }

  // Initialize scheduled sync
  initializeScheduledSync() {
    // Run every hour to check for integrations needing sync
    cron.schedule('0 * * * *', async () => {
      try {
        const integrations = await Integration.getIntegrationsNeedingSync();
        
        for (const integration of integrations) {
          try {
            await integration.syncData();
            console.log(`Scheduled sync completed for ${integration.name}`);
          } catch (error) {
            console.error(`Scheduled sync failed for ${integration.name}:`, error);
          }
        }
      } catch (error) {
        console.error('Scheduled sync check failed:', error);
      }
    });

    // Health check every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        const activeIntegrations = await Integration.getActiveIntegrations();
        
        for (const integration of activeIntegrations) {
          if (integration.monitoring.healthCheck.enabled) {
            try {
              await integration.testConnection();
            } catch (error) {
              console.error(`Health check failed for ${integration.name}:`, error);
            }
          }
        }
      } catch (error) {
        console.error('Health check failed:', error);
      }
    });
  }

  // Get integration templates
  async getTemplates(req, res) {
    try {
      const { type } = req.query;

      const templates = {
        hmis: {
          name: 'HMIS Integration',
          provider: 'Clarity Human Services',
          type: 'hmis',
          configuration: {
            apiUrl: 'https://api.clarityhs.com/v1',
            authenticationMethod: 'oauth2',
            oauthConfig: {
              scopes: ['clients.read', 'clients.write', 'services.read']
            }
          },
          dataMapping: {
            userFields: [
              { sourceField: 'firstName', targetField: 'first_name', required: true },
              { sourceField: 'lastName', targetField: 'last_name', required: true },
              { sourceField: 'email', targetField: 'email', required: false },
              { sourceField: 'phone', targetField: 'phone', required: false }
            ]
          },
          syncSettings: {
            syncFrequency: 'daily',
            syncDirection: 'bidirectional'
          }
        },
        benefits: {
          name: 'Benefits Integration',
          provider: 'Nevada Department of Welfare',
          type: 'benefits',
          configuration: {
            apiUrl: 'https://api.dwss.nv.gov/v1',
            authenticationMethod: 'api-key'
          },
          dataMapping: {
            userFields: [
              { sourceField: 'firstName', targetField: 'first_name', required: true },
              { sourceField: 'lastName', targetField: 'last_name', required: true },
              { sourceField: 'dateOfBirth', targetField: 'dob', required: true }
            ]
          }
        },
        'law-enforcement': {
          name: 'Law Enforcement Integration',
          provider: 'Las Vegas Metropolitan Police',
          type: 'law-enforcement',
          configuration: {
            apiUrl: 'https://api.lvmpd.com/v1',
            authenticationMethod: 'certificate'
          },
          security: {
            encryptionEnabled: true,
            compliance: { hipaa: true }
          }
        }
      };

      if (type) {
        res.json(templates[type] || {});
      } else {
        res.json(templates);
      }
    } catch (error) {
      console.error('Get templates error:', error);
      res.status(500).json({ error: 'Failed to fetch templates' });
    }
  }
}

module.exports = new IntegrationController();
