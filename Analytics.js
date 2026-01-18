const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['user-activity', 'resource-utilization', 'housing-outcomes', 'health-metrics', 'agency-performance', 'system-performance', 'predictive-analytics'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  dateRange: {
    start: Date,
    end: Date,
    granularity: {
      type: String,
      enum: ['hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly']
    }
  },
  dimensions: {
    geography: {
      city: String,
      state: String,
      zip: String,
      coordinates: {
        lat: Number,
        lng: Number
      },
      radius: Number // for regional analysis
    },
    demographics: {
      ageGroups: [{
        range: String, // e.g., "18-25", "26-35"
        count: Number,
        percentage: Number
      }],
      gender: [{
        type: String,
        count: Number,
        percentage: Number
      }],
      ethnicity: [{
        type: String,
        count: Number,
        percentage: Number
      }],
      veteranStatus: [{
        status: String,
        count: Number,
        percentage: Number
      }],
      disabilityStatus: [{
        status: String,
        count: Number,
        percentage: Number
      }]
    },
    time: {
      hourOfDay: Number,
      dayOfWeek: Number,
      weekOfYear: Number,
      monthOfYear: Number,
      season: String,
      holidays: [String],
      weatherConditions: {
        temperature: Number,
        humidity: Number,
        precipitation: Number,
        conditions: String
      }
    },
    agency: {
      agencyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agency'
      },
      agencyType: String,
      agencySize: String, // small, medium, large
      fundingSource: [String],
      serviceArea: String
    },
    service: {
      serviceType: String,
      serviceCategory: String,
      fundingModel: String,
      capacityUtilization: Number
    }
  },
  metrics: {
    userEngagement: {
      totalUsers: Number,
      activeUsers: Number,
      newUsers: Number,
      returningUsers: Number,
      sessionDuration: {
        average: Number,
        median: Number,
        p95: Number
      },
      pageViews: {
        total: Number,
        unique: Number,
        perSession: Number
      },
      featureUsage: [{
        feature: String,
        users: Number,
        sessions: Number,
        usageRate: Number
      }],
      retentionRates: {
        day1: Number,
        day7: Number,
        day30: Number,
        day90: Number
      },
      churnRate: Number
    },
    resourceUtilization: {
      totalResources: Number,
      availableResources: Number,
      utilizationRate: Number,
      averageWaitTime: Number,
      noShowRate: Number,
      capacityByType: [{
        type: String,
        total: Number,
        used: Number,
        available: Number,
        utilizationRate: Number
      }],
      geographicDistribution: [{
        area: String,
        resourceCount: Number,
        utilizationRate: Number,
        demand: Number
      }],
      temporalPatterns: [{
        timePeriod: String,
        utilization: Number,
        demand: Number
      }]
    },
    housingOutcomes: {
      totalPlacements: Number,
      placementRate: Number,
      averageTimeToHousing: Number, // in days
      housingRetention: {
        thirtyDays: Number,
        ninetyDays: Number,
        oneYear: Number
      },
      placementByType: [{
        housingType: String,
        placements: Number,
        percentage: Number,
        averageTimeToPlacement: Number
      }],
      riskFactors: [{
        factor: String,
        impactOnPlacementTime: Number,
        correlation: Number
      }],
      successPredictors: [{
        predictor: String,
        accuracy: Number,
        importance: Number
      }]
    },
    healthMetrics: {
      medicationAdherence: {
        averageRate: Number,
        byMedicationType: [{
          type: String,
          adherenceRate: Number
        }],
        improvementOverTime: Number
      },
      appointmentAttendance: {
        scheduledCount: Number,
        attendedCount: Number,
        attendanceRate: Number,
        noShowRate: Number,
        cancellationRate: Number
      },
      healthOutcomes: [{
        metric: String,
        baseline: Number,
        current: Number,
        improvement: Number
      }],
      riskAssessments: {
        highRiskUsers: Number,
        mediumRiskUsers: Number,
        lowRiskUsers: Number,
        riskReductionRate: Number
      }
    },
    agencyPerformance: {
      efficiency: {
        applicationsProcessed: Number,
        averageProcessingTime: Number,
        costPerApplication: Number,
        staffProductivity: Number
      },
      effectiveness: {
        successRate: Number,
        clientSatisfaction: Number,
        outcomeImprovement: Number
      },
      capacity: {
        totalCapacity: Number,
        currentUtilization: Number,
        waitlistLength: Number,
        turnoverRate: Number
      },
      collaboration: {
        interAgencyReferrals: Number,
        sharedResources: Number,
        jointInitiatives: Number
      }
    },
    systemPerformance: {
      availability: {
        uptime: Number,
        downtime: Number,
        responseTime: {
          average: Number,
          p95: Number,
          p99: Number
        }
      },
      usage: {
        totalRequests: Number,
        errorRate: Number,
        throughput: Number
      },
      scalability: {
        concurrentUsers: Number,
        resourceUtilization: Number,
        bottlenecks: [String]
      }
    }
  },
  predictions: {
    housingDemand: {
      timeframe: String,
      predictedDemand: Number,
      confidence: Number,
      factors: [{
        factor: String,
        weight: Number,
        impact: String
      }]
    },
    resourceNeeds: {
      resourceType: String,
      predictedShortage: Boolean,
      severity: String,
      recommendedActions: [String]
    },
    riskAlerts: [{
      type: String,
      probability: Number,
      impact: String,
      timeframe: String,
      recommendedActions: [String]
    }],
    trends: [{
      metric: String,
      direction: String, // increasing, decreasing, stable
      rate: Number,
      significance: Number,
      projection: [{
        date: Date,
        value: Number,
        confidence: Number
      }]
    }]
  },
  insights: [{
    type: {
      type: String,
      enum: ['pattern', 'anomaly', 'correlation', 'opportunity', 'risk']
    },
    title: String,
    description: String,
    significance: {
      score: Number,
      level: String // low, medium, high, critical
    },
    confidence: Number,
    actionableInsights: [String],
    recommendations: [{
      action: String,
      priority: String,
      expectedImpact: String,
      implementation: String
    }],
    relatedMetrics: [String],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  benchmarks: {
    industry: [{
      metric: String,
      industryAverage: Number,
      ourValue: Number,
      percentile: Number,
      gap: Number
    }],
    historical: [{
      metric: String,
      period: String,
      value: Number,
      change: Number,
      changePercentage: Number
    }],
    goals: [{
      metric: String,
      target: Number,
      current: Number,
      progress: Number,
      onTrack: Boolean
    }]
  },
  metadata: {
    dataSource: [String],
    processingMethod: String,
    algorithm: String,
    version: String,
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    tags: [String],
    notes: String
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
analyticsSchema.index({ type: 1, timestamp: -1 });
analyticsSchema.index({ 'dimensions.geography.city': 1, timestamp: -1 });
analyticsSchema.index({ 'dimensions.agency.agencyId': 1, timestamp: -1 });
analyticsSchema.index({ 'predictions.riskAlerts.type': 1, timestamp: -1 });
analyticsSchema.index({ 'insights.type': 1, 'insights.significance.level': 1 });

// Static method to generate user engagement analytics
analyticsSchema.statics.generateUserEngagementAnalytics = async function(dateRange, granularity = 'daily') {
  const User = require('../models/User');
  const Workbook = require('../models/Workbook');
  const ZoomMeeting = require('../models/ZoomMeeting');
  
  const { start, end } = dateRange;
  
  // Get user metrics
  const totalUsers = await User.countDocuments();
  const newUsers = await User.countDocuments({
    createdAt: { $gte: start, $lte: end }
  });
  
  // Get active users (logged in within date range)
  const activeUsers = await User.countDocuments({
    lastLogin: { $gte: start, $lte: end }
  });
  
  // Get workbook engagement
  const workbookStats = await Workbook.aggregate([
    {
      $match: {
        updatedAt: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: null,
        totalWorkbooks: { $sum: 1 },
        completedWorkbooks: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        averageScore: { $avg: '$progress.overallScore' }
      }
    }
  ]);
  
  // Get meeting engagement
  const meetingStats = await ZoomMeeting.aggregate([
    {
      $match: {
        startTime: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: null,
        totalMeetings: { $sum: 1 },
        totalParticipants: { $sum: { $size: '$participants' } },
        averageDuration: { $avg: '$duration' }
      }
    }
  ]);
  
  const analytics = new this({
    type: 'user-activity',
    dateRange: { start, end, granularity },
    metrics: {
      userEngagement: {
        totalUsers,
        activeUsers,
        newUsers,
        returningUsers: activeUsers - newUsers,
        workbookEngagement: workbookStats[0] || {},
        meetingEngagement: meetingStats[0] || {}
      }
    }
  });
  
  return analytics.save();
};

// Static method to generate housing outcomes analytics
analyticsSchema.statics.generateHousingOutcomesAnalytics = async function(dateRange, granularity = 'monthly') {
  const User = require('../models/User');
  const Agency = require('../models/Agency');
  
  const { start, end } = dateRange;
  
  // Get housing placement data
  const housingData = await User.aggregate([
    {
      $match: {
        'currentSituation.housingStatus': 'housed',
        updatedAt: { $gte: start, $lte: end }
      }
    },
    {
      $lookup: {
        from: 'agencies',
        localField: 'agency',
        foreignField: '_id',
        as: 'agencyInfo'
      }
    },
    {
      $group: {
        _id: '$agencyInfo.type',
        placements: { $sum: 1 },
        averageTimeToHousing: { $avg: '$timeToHousing' }
      }
    }
  ]);
  
  // Calculate retention rates
  const retentionData = await User.aggregate([
    {
      $match: {
        'currentSituation.housingStatus': 'housed',
        housedDate: { $lte: new Date(end) }
      }
    },
    {
      $group: {
        _id: null,
        totalHoused: { $sum: 1 },
        retained30Days: {
          $sum: {
            $cond: [
              { $gte: ['$housedDate', new Date(end - 30 * 24 * 60 * 60 * 1000)] },
              1, 0
            ]
          }
        },
        retained90Days: {
          $sum: {
            $cond: [
              { $gte: ['$housedDate', new Date(end - 90 * 24 * 60 * 60 * 1000)] },
              1, 0
            ]
          }
        }
      }
    }
  ]);
  
  const analytics = new this({
    type: 'housing-outcomes',
    dateRange: { start, end, granularity },
    metrics: {
      housingOutcomes: {
        totalPlacements: housingData.reduce((sum, item) => sum + item.placements, 0),
        placementByType: housingData,
        housingRetention: retentionData[0] ? {
          thirtyDays: (retentionData[0].retained30Days / retentionData[0].totalHoused) * 100,
          ninetyDays: (retentionData[0].retained90Days / retentionData[0].totalHoused) * 100
        } : {}
      }
    }
  });
  
  return analytics.save();
};

// Static method to generate predictive analytics
analyticsSchema.statics.generatePredictiveAnalytics = async function(horizon = '30days') {
  const User = require('../models/User');
  const Resource = require('../models/Resource');
  
  // Predict housing demand
  const housingDemand = await this.predictHousingDemand(horizon);
  
  // Predict resource shortages
  const resourceNeeds = await this.predictResourceNeeds();
  
  // Generate risk alerts
  const riskAlerts = await this.generateRiskAlerts();
  
  const analytics = new this({
    type: 'predictive-analytics',
    predictions: {
      housingDemand,
      resourceNeeds,
      riskAlerts,
      trends: await this.identifyTrends()
    }
  });
  
  return analytics.save();
};

// Helper method to predict housing demand
analyticsSchema.statics.predictHousingDemand = async function(horizon) {
  const User = require('../models/User');
  
  // Get historical housing placement data
  const historicalData = await User.aggregate([
    {
      $match: {
        housedDate: { $exists: true }
      }
    },
    {
      $group: {
        _id: {
          month: { $month: '$housedDate' },
          year: { $year: '$housedDate' }
        },
        placements: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    }
  ]);
  
  // Simple linear regression for prediction
  const n = historicalData.length;
  if (n < 2) {
    return { timeframe: horizon, predictedDemand: 0, confidence: 0 };
  }
  
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  historicalData.forEach((data, index) => {
    sumX += index;
    sumY += data.placements;
    sumXY += index * data.placements;
    sumX2 += index * index;
  });
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Predict next period
  const predictedDemand = Math.max(0, slope * n + intercept);
  const confidence = Math.min(0.95, n / 24); // More confidence with more data
  
  return {
    timeframe: horizon,
    predictedDemand: Math.round(predictedDemand),
    confidence,
    factors: [
      { factor: 'Historical trend', weight: 0.6, impact: 'positive' },
      { factor: 'Seasonal patterns', weight: 0.3, impact: 'neutral' },
      { factor: 'Economic indicators', weight: 0.1, impact: 'negative' }
    ]
  };
};

// Helper method to predict resource needs
analyticsSchema.statics.predictResourceNeeds = async function() {
  const Resource = require('../models/Resource');
  
  const resourceTypes = await Resource.distinct('type');
  const predictions = [];
  
  for (const type of resourceTypes) {
    const utilization = await Resource.aggregate([
      { $match: { type } },
      {
        $group: {
          _id: null,
          total: { $sum: '$capacity.total' },
          current: { $sum: '$capacity.current' },
          utilizationRate: { $avg: { $divide: ['$capacity.current', '$capacity.total'] } }
        }
      }
    ]);
    
    if (utilization.length > 0) {
      const data = utilization[0];
      predictions.push({
        resourceType: type,
        predictedShortage: data.utilizationRate > 0.8,
        severity: data.utilizationRate > 0.9 ? 'high' : data.utilizationRate > 0.8 ? 'medium' : 'low',
        recommendedActions: data.utilizationRate > 0.8 ? [
          'Increase capacity',
          'Optimize scheduling',
          'Partner with additional providers'
        ] : []
      });
    }
  }
  
  return predictions;
};

// Helper method to generate risk alerts
analyticsSchema.statics.generateRiskAlerts = async function() {
  const alerts = [];
  
  // Check for high utilization rates
  const Resource = require('../models/Resource');
  const highUtilization = await Resource.find({
    $expr: { $gt: [{ $divide: ['$capacity.current', '$capacity.total'] }, 0.9] }
  });
  
  if (highUtilization.length > 0) {
    alerts.push({
      type: 'resource-shortage',
      probability: 0.8,
      impact: 'high',
      timeframe: '7days',
      recommendedActions: [
        'Increase resource capacity',
        'Activate overflow protocols',
        'Notify partner agencies'
      ]
    });
  }
  
  // Check for increasing wait times
  const Agency = require('../models/Agency');
  const longWaitTimes = await Agency.find({
    'statistics.averageProcessingTime': { $gt: 14 * 24 * 60 * 60 * 1000 } // > 14 days
  });
  
  if (longWaitTimes.length > 0) {
    alerts.push({
      type: 'processing-delay',
      probability: 0.7,
      impact: 'medium',
      timeframe: '30days',
      recommendedActions: [
        'Review processing workflows',
        'Increase staffing',
        'Implement automation'
      ]
    });
  }
  
  return alerts;
};

// Helper method to identify trends
analyticsSchema.statics.identifyTrends = async function() {
  const trends = [];
  
  // This would implement more sophisticated trend analysis
  // For now, returning placeholder data
  
  return trends;
};

module.exports = mongoose.model('Analytics', analyticsSchema);
