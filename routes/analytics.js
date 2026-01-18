const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { auth, agencyAuth } = require('../middleware/auth');

// Dashboard and overview
router.get('/dashboard', auth, analyticsController.getDashboard);

// Custom reports
router.post('/reports/generate', auth, analyticsController.generateCustomReport);

// Real-time metrics
router.get('/metrics/realtime', auth, analyticsController.getRealTimeMetrics);

// Historical analytics
router.get('/metrics/historical', auth, analyticsController.getHistoricalMetrics);

// Predictive analytics
router.get('/predictions', auth, analyticsController.getPredictions);

// Insights and recommendations
router.get('/insights', auth, analyticsController.getInsights);

// Agency-specific analytics
router.get('/agency/:agencyId', agencyAuth, analyticsController.getAgencyAnalytics);

// Resource utilization analytics
router.get('/resources/utilization', auth, analyticsController.getResourceUtilization);

// Housing outcomes analytics
router.get('/housing/outcomes', auth, analyticsController.getHousingOutcomes);

// User engagement analytics
router.get('/users/engagement', auth, analyticsController.getUserEngagement);

// Health metrics analytics
router.get('/health/metrics', auth, analyticsController.getHealthMetrics);

// Benchmarking
router.get('/benchmarks', auth, analyticsController.getBenchmarks);

module.exports = router;
