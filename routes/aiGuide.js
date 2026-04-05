const express = require('express');
const router = express.Router();
const aiGuideController = require('../controllers/aiGuideController');
const auth = require('../middleware/auth');

// Assessment routes
router.post('/assessment', auth, aiGuideController.conductAssessment);
router.get('/recommendations/:userId', auth, aiGuideController.getRecommendations);

// Workbook routes
router.get('/workbooks/:userId', auth, aiGuideController.getUserWorkbooks);
router.put('/workbooks/:workbookId/progress', auth, aiGuideController.updateWorkbookProgress);

// Manual Chat with BRICK
router.post('/chat', auth, (req, res) => {
    const { message } = req.body;
    res.json({ 
        reply: `BRICK here. I'm processing your request: "${message}". How else can I help you navigate your journey today?` 
    });
});

module.exports = router;
