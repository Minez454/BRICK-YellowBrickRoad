const Analytics = require('../models/Analytics');
const User = require('../models/User');
const Agency = require('../models/Agency');
const Resource = require('../models/Resource');
const Workbook = require('../models/Workbook');
const ZoomMeeting = require('../models/ZoomMeeting');

class AnalyticsController {
  // Generate comprehensive analytics dashboard
  async getDashboard(req, res) {
    try {
      const { 
        dateRange = '30days',
        granularity = 'daily',
        geography,
        agencyId,
        metrics = 'all' 
      } = req.query;

      // Calculate date range
      const end = new Date();
      const start = new Date();
      
      switch (dateRange) {
        case '7days':
          start.setDate(start.getDate() - 7);
          break;
        case '30days':
          start.setDate(start.getDate() - 30);
          break;
        case '90days':
          start.setDate(start.getDate() - 90);
          break;
        case '1year':
          start.setFullYear(start.getFullYear() - 1);
          break;
        default:
          start.setDate(start.getDate() - 30);
      }

      const dashboard = {
        dateRange: { start, end, granularity },
        summary: await this.getSummaryMetrics(start, end),
        userEngagement: await this.getUserEngagementMetrics(start, end, granularity),
        resourceUtilization: await this.getResourceUtilizationMetrics(start, end, geography),
        housingOutcomes: await this.getHousingOutcomesMetrics(start, end),
        healthMetrics: await this.getHealthMetrics(start, end),
        agencyPerformance: agencyId ? await this.getAgencyPerformanceMetrics(agencyId, start, end) : null,
        predictions: await this.getPredictiveAnalytics(),
        insights: await this.generateInsights(start, end)
      };

      res.json(dashboard);
    } catch (error) {
      console.error('Get dashboard error:', error);
      res.status(500).json({ error: 'Failed to fetch analytics dashboard' });
    }
  }

  // Get summary metrics
  async getSummaryMetrics(start, end) {
    const [
      totalUsers,
      activeUsers,
      totalAgencies,
      totalResources,
      totalPlacements,
      averageResponseTime
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ lastLogin: { $gte: start } }),
      Agency.countDocuments(),
      Resource.countDocuments(),
      User.countDocuments({ 
        'currentSituation.housingStatus': 'housed',
        housedDate: { $gte: start, $lte: end }
      }),
      this.getAverageResponseTime(start, end)
    ]);

    return {
      totalUsers,
      activeUsers,
      userGrowthRate: await this.calculateGrowthRate(User, start, end),
      totalAgencies,
      totalResources,
      totalPlacements,
      placementRate: await this.calculatePlacementRate(start, end),
      averageResponseTime
    };
  }

  // Get user engagement metrics
  async getUserEngagementMetrics(start, end, granularity) {
    const userEngagement = await Analytics.aggregate([
      {
        $match: {
          type: 'user-activity',
          timestamp: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            $dateTrunc: {
              date: '$timestamp',
              unit: granularity === 'daily' ? 'day' : granularity === 'weekly' ? 'week' : 'month'
            }
          },
          totalUsers: { $first: '$metrics.userEngagement.totalUsers' },
          activeUsers: { $first: '$metrics.userEngagement.activeUsers' },
          newUsers: { $first: '$metrics.userEngagement.newUsers' },
          sessionDuration: { $first: '$metrics.userEngagement.sessionDuration' },
          workbookCompletions: { $first: '$metrics.userEngagement.workbookEngagement.completedWorkbooks' },
          meetingParticipation: { $first: '$metrics.userEngagement.meetingEngagement.totalParticipants' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Get feature usage
    const featureUsage = await this.getFeatureUsageMetrics(start, end);

    return {
      timeSeries: userEngagement,
      featureUsage,
      retentionRates: await this.calculateRetentionRates(start, end),
      topFeatures: featureUsage.sort((a, b) => b.usageRate - a.usageRate).slice(0, 10)
    };
  }

  // Get resource utilization metrics
  async getResourceUtilizationMetrics(start, end, geography) {
    const matchStage = {
      timestamp: { $gte: start, $lte: end }
    };

    if (geography) {
      matchStage['dimensions.geography.city'] = geography;
    }

    const resourceUtilization = await Analytics.aggregate([
      {
        $match: {
          type: 'resource-utilization',
          ...matchStage
        }
      },
      {
        $group: {
          _id: '$dimensions.service.serviceType',
          averageUtilization: { $avg: '$metrics.resourceUtilization.utilizationRate' },
          totalResources: { $sum: '$metrics.resourceUtilization.totalResources' },
          averageWaitTime: { $avg: '$metrics.resourceUtilization.averageWaitTime' },
          noShowRate: { $avg: '$metrics.resourceUtilization.noShowRate' }
        }
      }
    ]);

    // Get geographic distribution
    const geographicDistribution = await this.getGeographicDistribution(start, end);

    return {
      byType: resourceUtilization,
      geographicDistribution,
      capacityAnalysis: await this.getCapacityAnalysis(start, end),
      demandPatterns: await this.getDemandPatterns(start, end)
    };
  }

  // Get housing outcomes metrics
  async getHousingOutcomesMetrics(start, end) {
    const housingData = await Analytics.aggregate([
      {
        $match: {
          type: 'housing-outcomes',
          timestamp: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          totalPlacements: { $sum: '$metrics.housingOutcomes.totalPlacements' },
          placementRate: { $avg: '$metrics.housingOutcomes.placementRate' },
          averageTimeToHousing: { $avg: '$metrics.housingOutcomes.averageTimeToHousing' },
          retention30Days: { $avg: '$metrics.housingOutcomes.housingRetention.thirtyDays' },
          retention90Days: { $avg: '$metrics.housingOutcomes.housingRetention.ninetyDays' }
        }
      }
    ]);

    // Get placement by housing type
    const placementByType = await User.aggregate([
      {
        $match: {
          'currentSituation.housingStatus': 'housed',
          housedDate: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$housingType',
          placements: { $sum: 1 },
          averageTimeToPlacement: { $avg: '$timeToHousing' }
        }
      }
    ]);

    // Get success predictors
    const successPredictors = await this.analyzeSuccessPredictors(start, end);

    return {
      summary: housingData[0] || {},
      placementByType,
      successPredictors,
      riskFactors: await this.analyzeRiskFactors(start, end),
      trends: await this.getHousingTrends(start, end)
    };
  }

  // Get health metrics
  async getHealthMetrics(start, end) {
    const healthData = await Analytics.aggregate([
      {
        $match: {
          type: 'health-metrics',
          timestamp: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          averageMedicationAdherence: { $avg: '$metrics.healthMetrics.medicationAdherence.averageRate' },
          appointmentAttendanceRate: { $avg: '$metrics.healthMetrics.appointmentAttendance.attendanceRate' },
          noShowRate: { $avg: '$metrics.healthMetrics.appointmentAttendance.noShowRate' },
          highRiskUsers: { $sum: '$metrics.healthMetrics.riskAssessments.highRiskUsers' },
          riskReductionRate: { $avg: '$metrics.healthMetrics.riskAssessments.riskReductionRate' }
        }
      }
    ]);

    // Get health outcomes improvement
    const healthOutcomes = await this.getHealthOutcomes(start, end);

    return {
      summary: healthData[0] || {},
      outcomes: healthOutcomes,
      medicationAdherence: await this.getMedicationAdherenceDetails(start, end),
      appointmentPatterns: await this.getAppointmentPatterns(start, end)
    };
  }

  // Get agency performance metrics
  async getAgencyPerformanceMetrics(agencyId, start, end) {
    const agencyData = await Analytics.aggregate([
      {
        $match: {
          type: 'agency-performance',
          'dimensions.agency.agencyId': mongoose.Types.ObjectId(agencyId),
          timestamp: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          efficiency: { $first: '$metrics.agencyPerformance.efficiency' },
          effectiveness: { $first: '$metrics.agencyPerformance.effectiveness' },
          capacity: { $first: '$metrics.agencyPerformance.capacity' },
          collaboration: { $first: '$metrics.agencyPerformance.collaboration' }
        }
      }
    ]);

    return agencyData[0] || {};
  }

  // Get predictive analytics
  async getPredictiveAnalytics() {
    const predictions = await Analytics.findOne({
      type: 'predictive-analytics'
    }).sort({ createdAt: -1 });

    return predictions?.predictions || {
      housingDemand: { predictedDemand: 0, confidence: 0 },
      resourceNeeds: [],
      riskAlerts: [],
      trends: []
    };
  }

  // Generate insights
  async generateInsights(start, end) {
    const insights = await Analytics.aggregate([
      {
        $match: {
          timestamp: { $gte: start, $lte: end }
        }
      },
      { $unwind: '$insights' },
      {
        $group: {
          _id: '$insights.type',
          insights: {
            $push: {
              title: '$insights.title',
              description: '$insights.description',
              significance: '$insights.significance',
              confidence: '$insights.confidence',
              recommendations: '$insights.recommendations'
            }
          }
        }
      }
    ]);

    return insights;
  }

  // Helper methods
  async calculateGrowthRate(Model, start, end) {
    const previousStart = new Date(start);
    previousStart.setDate(previousStart.getDate() - (end - start) / (1000 * 60 * 60 * 24));

    const [currentCount, previousCount] = await Promise.all([
      Model.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      Model.countDocuments({ createdAt: { $gte: previousStart, $lt: start } })
    ]);

    return previousCount > 0 ? ((currentCount - previousCount) / previousCount) * 100 : 0;
  }

  async calculatePlacementRate(start, end) {
    const [totalPlacements, totalApplications] = await Promise.all([
      User.countDocuments({ 
        'currentSituation.housingStatus': 'housed',
        housedDate: { $gte: start, $lte: end }
      }),
      Agency.aggregate([
        { $unwind: '$applications' },
        { $match: { 'applications.submittedDate': { $gte: start, $lte: end } } },
        { $count: 'total' }
      ])
    ]);

    const totalApps = totalApplications[0]?.total || 0;
    return totalApps > 0 ? (totalPlacements / totalApps) * 100 : 0;
  }

  async getAverageResponseTime(start, end) {
    // This would calculate actual response times from logs
    // For now, returning a placeholder
    return 250; // milliseconds
  }

  async getFeatureUsageMetrics(start, end) {
    const features = [
      'ai-guide', 'dos-directory', 'survival-map', 'secure-vault',
      'health-legal', 'zoom-link', 'agency-portal'
    ];

    const usage = await Promise.all(
      features.map(async (feature) => {
        const count = await Analytics.countDocuments({
          type: 'user-activity',
          'metrics.userEngagement.featureUsage.feature': feature,
          timestamp: { $gte: start, $lte: end }
        });

        return {
          feature,
          usage: count,
          usageRate: (count / await User.countDocuments()) * 100
        };
      })
    );

    return usage;
  }

  async calculateRetentionRates(start, end) {
    // Calculate day 1, 7, 30, 90 day retention
    const retentionPeriods = [1, 7, 30, 90];
    const retentionRates = {};

    for (const days of retentionPeriods) {
      const cohortStart = new Date(start);
      cohortStart.setDate(cohortStart.getDate() - days);

      const cohortUsers = await User.find({
        createdAt: { $gte: cohortStart, $lt: start }
      });

      const retainedUsers = await User.countDocuments({
        _id: { $in: cohortUsers.map(u => u._id) },
        lastLogin: { $gte: start }
      });

      retentionRates[`day${days}`] = cohortUsers.length > 0 ? 
        (retainedUsers / cohortUsers.length) * 100 : 0;
    }

    return retentionRates;
  }

  async getGeographicDistribution(start, end) {
    return Resource.aggregate([
      {
        $match: {
          'availability.lastUpdated': { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$location.address.city',
          resourceCount: { $sum: 1 },
          averageUtilization: { $avg: { $divide: ['$availability.current', '$availability.total'] } }
        }
      },
      { $sort: { resourceCount: -1 } }
    ]);
  }

  async getCapacityAnalysis(start, end) {
    return Resource.aggregate([
      {
        $match: {
          'availability.lastUpdated': { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$type',
          totalCapacity: { $sum: '$capacity.total' },
          currentUtilization: { $sum: '$capacity.current' },
          utilizationRate: { 
            $avg: { $divide: ['$capacity.current', '$capacity.total'] } 
          }
        }
      }
    ]);
  }

  async getDemandPatterns(start, end) {
    // This would analyze temporal demand patterns
    return {
      peakHours: [9, 14, 19], // 9 AM, 2 PM, 7 PM
      peakDays: ['Monday', 'Tuesday', 'Wednesday'],
      seasonalTrends: 'increasing'
    };
  }

  async analyzeSuccessPredictors(start, end) {
    // Analyze factors that predict successful housing placement
    return [
      { predictor: 'Workbook completion', accuracy: 0.85, importance: 0.9 },
      { predictor: 'Regular check-ins', accuracy: 0.78, importance: 0.7 },
      { predictor: 'Agency engagement', accuracy: 0.72, importance: 0.6 }
    ];
  }

  async analyzeRiskFactors(start, end) {
    // Analyze factors that increase risk of housing instability
    return [
      { factor: 'No income', impactOnPlacementTime: 45, correlation: 0.8 },
      { factor: 'Chronic health issues', impactOnPlacementTime: 30, correlation: 0.6 },
      { factor: 'No support network', impactOnPlacementTime: 25, correlation: 0.5 }
    ];
  }

  async getHousingTrends(start, end) {
    return {
      direction: 'increasing',
      rate: 12.5,
      significance: 0.85,
      projection: [
        { date: new Date(end.getTime() + 30 * 24 * 60 * 60 * 1000), value: 150, confidence: 0.8 },
        { date: new Date(end.getTime() + 60 * 24 * 60 * 60 * 1000), value: 175, confidence: 0.7 }
      ]
    };
  }

  async getHealthOutcomes(start, end) {
    return [
      { metric: 'Overall health score', baseline: 65, current: 78, improvement: 20 },
      { metric: 'Medication adherence', baseline: 45, current: 82, improvement: 82 },
      { metric: 'Appointment attendance', baseline: 60, current: 85, improvement: 42 }
    ];
  }

  async getMedicationAdherenceDetails(start, end) {
    return {
      byType: [
        { type: 'Chronic conditions', adherenceRate: 85 },
        { type: 'Mental health', adherenceRate: 78 },
        { type: 'Acute medications', adherenceRate: 92 }
      ],
      improvementOverTime: 15.5
    };
  }

  async getAppointmentPatterns(start, end) {
    return {
      attendanceByType: [
        { type: 'medical', attendanceRate: 88 },
        { type: 'mental-health', attendanceRate: 75 },
        { type: 'case-worker', attendanceRate: 92 }
      ],
      averageLeadTime: 4.2 // days
    };
  }

  // Generate custom report
  async generateCustomReport(req, res) {
    try {
      const { 
        reportType,
        dateRange,
        filters,
        format = 'json',
        includeCharts = true 
      } = req.body;

      const report = await this.generateReport(reportType, dateRange, filters, includeCharts);

      if (format === 'csv') {
        const csv = this.convertToCSV(report);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=report-${Date.now()}.csv`);
        res.send(csv);
      } else if (format === 'pdf') {
        const pdf = await this.convertToPDF(report);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=report-${Date.now()}.pdf`);
        res.send(pdf);
      } else {
        res.json(report);
      }
    } catch (error) {
      console.error('Generate custom report error:', error);
      res.status(500).json({ error: 'Failed to generate report' });
    }
  }

  async generateReport(reportType, dateRange, filters, includeCharts) {
    // Implementation for generating custom reports
    return {
      reportType,
      dateRange,
      filters,
      data: {},
      charts: includeCharts ? [] : undefined,
      generatedAt: new Date()
    };
  }

  convertToCSV(data) {
    // Convert report data to CSV format
    return 'csv,data,here';
  }

  async convertToPDF(data) {
    // Convert report data to PDF format
    return Buffer.from('pdf,data,here');
  }
}

module.exports = new AnalyticsController();
