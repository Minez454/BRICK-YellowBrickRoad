const express = require('express');
const router = express.Router();
const zoomLinkController = require('../controllers/zoomLinkController');
const auth = require('../middleware/auth');

// Meeting management
router.post('/meetings', auth, zoomLinkController.createMeeting);
router.get('/meetings/:meetingId', auth, zoomLinkController.getMeeting);
router.put('/meetings/:meetingId', auth, zoomLinkController.updateMeeting);
router.delete('/meetings/:meetingId', auth, zoomLinkController.cancelMeeting);

// Meeting participation
router.post('/meetings/:meetingId/join', auth, zoomLinkController.joinMeeting);
router.post('/meetings/:meetingId/leave', auth, zoomLinkController.leaveMeeting);
router.post('/meetings/:meetingId/start', auth, zoomLinkController.startMeeting);
router.post('/meetings/:meetingId/end', auth, zoomLinkController.endMeeting);

// Participant management
router.post('/meetings/:meetingId/participants', auth, zoomLinkController.addParticipant);

// User meetings
router.get('/users/:userId/meetings', auth, zoomLinkController.getUserMeetings);

// Recordings
router.get('/meetings/:meetingId/recordings', auth, zoomLinkController.getRecordings);

module.exports = router;
