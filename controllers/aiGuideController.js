const User = require('../models/User');
const Workbook = require('../models/Workbook');
const { generateAssessment } = require('../utils/aiService');
const { createWorkbook } = require('../utils/workbookGenerator');

class AIGuideController {
  // Initial assessment
  async conductAssessment(req, res) {
    try {
      const { userId, assessmentData } = req.body;
      
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Generate AI assessment
      const assessmentResults = await generateAssessment(assessmentData);
      
      // Update user with assessment results
      user.assessment = {
        completed: true,
        date: new Date(),
        results: assessmentResults
      };
      
      await user.save();

      // Generate personalized workbooks based on assessment
      const workbooks = await this.generatePersonalizedWorkbooks(userId, assessmentResults);

      res.json({
        success: true,
        assessment: assessmentResults,
        workbooks: workbooks
      });
    } catch (error) {
      console.error('Assessment error:', error);
      res.status(500).json({ error: 'Assessment failed' });
    }
  }

  // Generate personalized workbooks
  async generatePersonalizedWorkbooks(userId, assessmentResults) {
    const workbooks = [];
    
    // Define workbook categories based on assessment
    const workbookCategories = this.determineWorkbookCategories(assessmentResults);
    
    for (const category of workbookCategories) {
      const workbook = await createWorkbook(userId, category, assessmentResults);
      workbooks.push(workbook);
    }

    // Update user with new workbooks
    await User.findByIdAndUpdate(userId, {
      $push: { workbooks: { $each: workbooks.map(w => w._id) } }
    });

    return workbooks;
  }

  // Determine which workbooks are needed based on assessment
  determineWorkbookCategories(assessmentResults) {
    const categories = [];
    const { lifeSkillsAssessment, priorityNeeds } = assessmentResults;

    // Low scores trigger workbook creation
    if (lifeSkillsAssessment.cooking <= 2) categories.push('cooking');
    if (lifeSkillsAssessment.budgeting <= 2) categories.push('budgeting');
    if (lifeSkillsAssessment.scamDetection <= 2) categories.push('scam-detection');
    if (lifeSkillsAssessment.narcissismDetection <= 2) categories.push('narcissism-detection');
    if (lifeSkillsAssessment.jobSearch <= 2) categories.push('job-search');
    if (lifeSkillsAssessment.healthcare <= 2) categories.push('healthcare');

    // Priority needs
    if (priorityNeeds.includes('housing')) categories.push('housing');
    if (priorityNeeds.includes('legal')) categories.push('legal');

    return [...new Set(categories)]; // Remove duplicates
  }

  // Get user's workbooks
  async getUserWorkbooks(req, res) {
    try {
      const { userId } = req.params;
      
      const workbooks = await Workbook.find({ user: userId })
        .sort({ createdAt: -1 })
        .populate('user', 'firstName lastName');

      res.json(workbooks);
    } catch (error) {
      console.error('Get workbooks error:', error);
      res.status(500).json({ error: 'Failed to fetch workbooks' });
    }
  }

  // Update workbook progress
  async updateWorkbookProgress(req, res) {
    try {
      const { workbookId } = req.params;
      const { moduleId, completed, score, timeSpent } = req.body;

      const workbook = await Workbook.findById(workbookId);
      if (!workbook) {
        return res.status(404).json({ error: 'Workbook not found' });
      }

      // Update module progress
      const module = workbook.modules.id(moduleId);
      if (module) {
        module.completed = completed;
        module.completedAt = completed ? new Date() : null;
        if (score !== undefined) module.score = score;
      }

      // Update overall progress
      workbook.progress.completedModules = workbook.modules.filter(m => m.completed).length;
      workbook.progress.overallScore = workbook.modules.reduce((sum, m) => sum + (m.score || 0), 0) / workbook.modules.length;
      workbook.progress.timeSpent += timeSpent || 0;
      workbook.progress.lastAccessed = new Date();

      // Update status if completed
      if (workbook.progress.completedModules === workbook.progress.totalModules) {
        workbook.status = 'completed';
        workbook.completionDate = new Date();
        workbook.certificate.issued = true;
        workbook.certificate.issuedDate = new Date();
        workbook.certificate.certificateId = `WB-${Date.now()}-${workbookId.slice(-6)}`;
      } else if (workbook.progress.completedModules > 0) {
        workbook.status = 'in-progress';
      }

      await workbook.save();

      res.json({ success: true, workbook });
    } catch (error) {
      console.error('Update progress error:', error);
      res.status(500).json({ error: 'Failed to update progress' });
    }
  }

  // Get AI recommendations
  async getRecommendations(req, res) {
    try {
      const { userId } = req.params;
      
      const user = await User.findById(userId).populate('workbooks');
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const recommendations = await this.generateRecommendations(user);
      
      res.json(recommendations);
    } catch (error) {
      console.error('Get recommendations error:', error);
      res.status(500).json({ error: 'Failed to get recommendations' });
    }
  }

  // Generate personalized recommendations
  async generateRecommendations(user) {
    const recommendations = [];
    const { assessment, workbooks } = user;

    // Based on assessment results
    if (assessment.results.riskLevel === 'high' || assessment.results.riskLevel === 'critical') {
      recommendations.push({
        type: 'urgent',
        title: 'Immediate Housing Assistance',
        description: 'Your assessment indicates urgent housing needs. Contact emergency services immediately.',
        action: 'Call 2-1-1 or visit nearest shelter',
        priority: 'high'
      });
    }

    // Based on workbook progress
    const incompleteWorkbooks = workbooks.filter(w => w.status === 'in-progress');
    if (incompleteWorkbooks.length > 0) {
      recommendations.push({
        type: 'continuation',
        title: 'Continue Your Learning',
        description: `You have ${incompleteWorkbooks.length} workbook(s) in progress. Keep going!`,
        action: 'Resume workbook',
        priority: 'medium'
      });
    }

    // Based on life skills gaps
    const lowSkills = Object.entries(assessment.results.lifeSkillsAssessment)
      .filter(([skill, score]) => score <= 2)
      .map(([skill]) => skill);

    if (lowSkills.length > 0) {
      recommendations.push({
        type: 'skill-development',
        title: 'Improve Your Life Skills',
        description: `Focus on improving: ${lowSkills.join(', ')}`,
        action: 'Start relevant workbooks',
        priority: 'medium'
      });
    }

    return recommendations;
  }
}

module.exports = new AIGuideController();
