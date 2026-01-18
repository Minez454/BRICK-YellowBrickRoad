const express = require('express');
const router = express.Router();
const survivalMapController = require('../controllers/survivalMapController');
const auth = require('../middleware/auth');

// Map resource routes
router.get('/nearby', survivalMapController.getNearbyResources);
router.get('/all', survivalMapController.getAllMapResources);
router.get('/type/:type', survivalMapController.getResourcesByType);
router.get('/agencies', survivalMapController.getAgencyLocations);

// Resource management routes
router.post('/', auth, survivalMapController.addResource);
router.put('/:resourceId/status', auth, survivalMapController.updateResourceStatus);
router.post('/popup', auth, survivalMapController.addPopUpService);
router.post('/:resourceId/rate', auth, survivalMapController.rateResource);
router.put('/:resourceId/verify', auth, survivalMapController.verifyResource);

// Resource information routes
router.get('/:resourceId/updates', survivalMapController.getResourceUpdates);
router.get('/statistics', survivalMapController.getMapStatistics);

module.exports = router;
