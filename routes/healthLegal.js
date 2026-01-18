const express = require('express');
const router = express.Router();
const healthLegalController = require('../controllers/healthLegalController');
const auth = require('../middleware/auth');

// Tracker initialization
router.post('/initialize', auth, healthLegalController.initializeTracker);

// Medication routes
router.post('/medications', auth, healthLegalController.addMedication);
router.put('/medications/:medicationId', auth, healthLegalController.updateMedication);
router.post('/medications/:medicationId/adherence', auth, healthLegalController.recordMedicationAdherence);

// Appointment routes
router.post('/appointments', auth, healthLegalController.addAppointment);
router.put('/appointments/:appointmentId', auth, healthLegalController.updateAppointment);
router.get('/appointments/upcoming/:userId', auth, healthLegalController.getUpcomingAppointments);

// Court date routes
router.post('/court-dates', auth, healthLegalController.addCourtDate);
router.put('/court-dates/:courtDateId', auth, healthLegalController.updateCourtDate);
router.get('/court-dates/upcoming/:userId', auth, healthLegalController.getUpcomingCourtDates);

// Warrant routes
router.post('/warrants', auth, healthLegalController.addWarrant);
router.get('/warrants/active/:userId', auth, healthLegalController.getActiveWarrants);

// General tracker routes
router.get('/tracker/:userId', auth, healthLegalController.getTracker);
router.get('/statistics/:userId', auth, healthLegalController.getStatistics);

module.exports = router;
