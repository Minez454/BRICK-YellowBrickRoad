const Resource = require('../models/Resource');
const Agency = require('../models/Agency');
const { sendBedAvailabilityAlert } = require('../utils/notifications');

class SurvivalMapController {
  // Get nearby resources
  async getNearbyResources(req, res) {
    try {
      const { lat, lng, radius = 5000, type, status, verified } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ error: 'Latitude and longitude are required' });
      }

      const filters = {};
      if (type) filters.type = type;
      if (status) filters.status = status;
      if (verified !== undefined) filters.verified = verified === 'true';

      const resources = await Resource.findNearby(
        parseFloat(lat),
        parseFloat(lng),
        parseInt(radius),
        filters
      );

      res.json(resources);
    } catch (error) {
      console.error('Get nearby resources error:', error);
      res.status(500).json({ error: 'Failed to fetch nearby resources' });
    }
  }

  // Get resources by type
  async getResourcesByType(req, res) {
    try {
      const { type, status = 'open' } = req.params;
      
      const resources = await Resource.findByTypeAndAvailability(type, status);
      
      res.json(resources);
    } catch (error) {
      console.error('Get resources by type error:', error);
      res.status(500).json({ error: 'Failed to fetch resources' });
    }
  }

  // Get all resources for map view
  async getAllMapResources(req, res) {
    try {
      const { 
        bounds, // { north, south, east, west }
        types,
        status,
        verified = 'true',
        includePopUps = 'true'
      } = req.query;

      let query = { 'verification.verified': verified === 'true' };
      
      // Apply bounds if provided
      if (bounds) {
        const { north, south, east, west } = JSON.parse(bounds);
        query['location.coordinates'] = {
          $geoWithin: {
            $box: [
              [west, south], // Southwest corner
              [east, north]  // Northeast corner
            ]
          }
        };
      }

      // Apply type filter
      if (types) {
        const typeArray = Array.isArray(types) ? types : types.split(',');
        query.type = { $in: typeArray };
      }

      // Apply status filter
      if (status) {
        query['availability.status'] = status;
      }

      // Filter out pop-up services unless requested
      if (includePopUps !== 'true') {
        query['popUpService.isPopUp'] = { $ne: true };
      }

      const resources = await Resource.find(query)
        .select('name type location availability contact requirements')
        .sort({ 'availability.lastUpdated': -1 });

      res.json(resources);
    } catch (error) {
      console.error('Get all map resources error:', error);
      res.status(500).json({ error: 'Failed to fetch map resources' });
    }
  }

  // Add new resource (crowdsourced)
  async addResource(req, res) {
    try {
      const resourceData = req.body;
      
      // Add reporting user
      resourceData.updates = [{
        type: 'service-change',
        description: 'Resource added by community member',
        reportedBy: req.user?.id,
        verified: false
      }];

      const resource = new Resource(resourceData);
      await resource.save();

      res.status(201).json({
        success: true,
        message: 'Resource submitted for verification',
        resource
      });
    } catch (error) {
      console.error('Add resource error:', error);
      res.status(500).json({ error: 'Failed to add resource' });
    }
  }

  // Update resource status
  async updateResourceStatus(req, res) {
    try {
      const { resourceId } = req.params;
      const { status, capacity, reporterId } = req.body;

      const resource = await Resource.findById(resourceId);
      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      // Update availability
      await resource.updateAvailability(status, capacity);

      // Add reporter to update
      if (reporterId) {
        const lastUpdate = resource.updates[resource.updates.length - 1];
        lastUpdate.reportedBy = reporterId;
      }

      // Send alerts if bed availability changed
      if (resource.type === 'shelter' && status === 'open' && capacity?.available > 0) {
        await this.sendBedAlerts(resource, capacity.available);
      }

      res.json({
        success: true,
        message: 'Resource status updated',
        resource
      });
    } catch (error) {
      console.error('Update resource status error:', error);
      res.status(500).json({ error: 'Failed to update resource status' });
    }
  }

  // Add pop-up service
  async addPopUpService(req, res) {
    try {
      const popUpData = {
        ...req.body,
        popUpService: {
          isPopUp: true,
          ...req.body.popUpService
        }
      };

      const resource = new Resource(popUpData);
      await resource.save();

      // Send alerts to nearby users
      await this.sendPopUpAlerts(resource);

      res.status(201).json({
        success: true,
        message: 'Pop-up service added',
        resource
      });
    } catch (error) {
      console.error('Add pop-up service error:', error);
      res.status(500).json({ error: 'Failed to add pop-up service' });
    }
  }

  // Rate resource
  async rateResource(req, res) {
    try {
      const { resourceId } = req.params;
      const { userId, rating, review, helpful } = req.body;

      const resource = await Resource.findById(resourceId);
      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      await resource.addRating(userId, rating, review);

      res.json({
        success: true,
        message: 'Rating added',
        averageRating: resource.statistics.averageRating
      });
    } catch (error) {
      console.error('Rate resource error:', error);
      res.status(500).json({ error: 'Failed to rate resource' });
    }
  }

  // Verify resource
  async verifyResource(req, res) {
    try {
      const { resourceId } = req.params;
      const { verifiedBy, method } = req.body;

      const resource = await Resource.findById(resourceId);
      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      await resource.verify(verifiedBy, method);

      res.json({
        success: true,
        message: 'Resource verified',
        resource
      });
    } catch (error) {
      console.error('Verify resource error:', error);
      res.status(500).json({ error: 'Failed to verify resource' });
    }
  }

  // Get resource updates
  async getResourceUpdates(req, res) {
    try {
      const { resourceId } = req.params;
      const { limit = 50 } = req.query;

      const resource = await Resource.findById(resourceId)
        .select('updates')
        .populate('updates.reportedBy', 'firstName lastName')
        .populate('updates.verifiedBy', 'firstName lastName');

      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      const updates = resource.updates
        .sort({ timestamp: -1 })
        .slice(0, parseInt(limit));

      res.json(updates);
    } catch (error) {
      console.error('Get resource updates error:', error);
      res.status(500).json({ error: 'Failed to fetch resource updates' });
    }
  }

  // Get agency locations for map
  async getAgencyLocations(req, res) {
    try {
      const { type, verified = 'true' } = req.query;

      let query = { verified: verified === 'true' };
      if (type) query.type = type;

      const agencies = await Agency.find(query)
        .select('name type contact capacity')
        .populate('contact.address.coordinates');

      res.json(agencies);
    } catch (error) {
      console.error('Get agency locations error:', error);
      res.status(500).json({ error: 'Failed to fetch agency locations' });
    }
  }

  // Send bed availability alerts
  async sendBedAlerts(resource, bedsAvailable) {
    try {
      // Find users within 5 miles who need housing
      const User = require('../models/User');
      const nearbyUsers = await User.find({
        'currentSituation.housingStatus': { $in: ['street', 'shelter', 'vehicle'] },
        'preferences.notifications.bedAlerts': true
      });

      if (nearbyUsers.length > 0) {
        await sendBedAvailabilityAlert(nearbyUsers, resource, bedsAvailable);
      }
    } catch (error) {
      console.error('Send bed alerts error:', error);
    }
  }

  // Send pop-up service alerts
  async sendPopUpAlerts(resource) {
    try {
      const User = require('../models/User');
      const nearbyUsers = await User.find({
        'currentSituation.housingStatus': { $ne: 'housed' },
        'preferences.notifications.popUpAlerts': true
      });

      // This would use the notification service to send alerts
      // Implementation depends on specific notification requirements
      console.log(`Would send pop-up alerts to ${nearbyUsers.length} users for ${resource.name}`);
    } catch (error) {
      console.error('Send pop-up alerts error:', error);
    }
  }

  // Get map statistics
  async getMapStatistics(req, res) {
    try {
      const { bounds } = req.query;

      let matchStage = {};
      
      // Apply bounds if provided
      if (bounds) {
        const { north, south, east, west } = JSON.parse(bounds);
        matchStage['location.coordinates'] = {
          $geoWithin: {
            $box: [
              [west, south],
              [east, north]
            ]
          }
        };
      }

      const statistics = await Resource.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            open: {
              $sum: { $cond: [{ $eq: ['$availability.status', 'open'] }, 1, 0] }
            },
            verified: {
              $sum: { $cond: ['$verification.verified', 1, 0] }
            },
            averageRating: { $avg: '$statistics.averageRating' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      res.json(statistics);
    } catch (error) {
      console.error('Get map statistics error:', error);
      res.status(500).json({ error: 'Failed to fetch map statistics' });
    }
  }
}

module.exports = new SurvivalMapController();
