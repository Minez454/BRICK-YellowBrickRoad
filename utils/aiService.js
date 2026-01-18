// AI Service for generating assessments and personalized content

class AIService {
  // Generate comprehensive assessment based on user input
  async generateAssessment(assessmentData) {
    try {
      const {
        housingSituation,
        employmentStatus,
        income,
        healthStatus,
        familySituation,
        challenges,
        goals,
        skills,
        education
      } = assessmentData;

      // Calculate risk level based on multiple factors
      const riskLevel = this.calculateRiskLevel({
        housingSituation,
        employmentStatus,
        income,
        healthStatus
      });

      // Assess life skills
      const lifeSkillsAssessment = this.assessLifeSkills(skills, challenges);

      // Determine priority needs
      const priorityNeeds = this.determinePriorityNeeds({
        housingSituation,
        employmentStatus,
        income,
        healthStatus,
        challenges
      });

      // Recommend services
      const recommendedServices = this.recommendServices(priorityNeeds, riskLevel);

      return {
        riskLevel,
        priorityNeeds,
        recommendedServices,
        lifeSkillsAssessment,
        assessmentDate: new Date(),
        nextReviewDate: this.calculateNextReviewDate(riskLevel)
      };
    } catch (error) {
      console.error('AI Assessment Error:', error);
      throw new Error('Failed to generate assessment');
    }
  }

  // Calculate risk level based on user situation
  calculateRiskLevel(factors) {
    let riskScore = 0;

    // Housing risk factors
    if (factors.housingSituation === 'street') riskScore += 4;
    else if (factors.housingSituation === 'shelter') riskScore += 3;
    else if (factors.housingSituation === 'vehicle') riskScore += 3;
    else if (factors.housingSituation === 'temporary') riskScore += 2;

    // Employment risk factors
    if (factors.employmentStatus === 'unemployed') riskScore += 2;
    else if (factors.employmentStatus === 'part-time') riskScore += 1;

    // Income risk factors
    if (!factors.income || factors.income < 500) riskScore += 3;
    else if (factors.income < 1000) riskScore += 2;
    else if (factors.income < 2000) riskScore += 1;

    // Health risk factors
    if (factors.healthStatus && factors.healthStatus.includes('chronic')) riskScore += 2;
    if (factors.healthStatus && factors.healthStatus.includes('mental-health')) riskScore += 2;

    // Convert score to risk level
    if (riskScore >= 7) return 'critical';
    if (riskScore >= 5) return 'high';
    if (riskScore >= 3) return 'medium';
    return 'low';
  }

  // Assess life skills based on self-reported skills and challenges
  assessLifeSkills(skills, challenges) {
    const assessment = {
      cooking: this.calculateSkillScore(skills, challenges, 'cooking'),
      budgeting: this.calculateSkillScore(skills, challenges, 'budgeting'),
      scamDetection: this.calculateSkillScore(skills, challenges, 'scam-detection'),
      narcissismDetection: this.calculateSkillScore(skills, challenges, 'narcissism-detection'),
      jobSearch: this.calculateSkillScore(skills, challenges, 'job-search'),
      healthcare: this.calculateSkillScore(skills, challenges, 'healthcare')
    };

    return assessment;
  }

  // Calculate individual skill score (1-5 scale)
  calculateSkillScore(skills, challenges, skillType) {
    let score = 3; // Base score

    // Boost score for reported skills
    if (skills && skills.includes(skillType)) {
      score += 1;
    }

    // Reduce score for related challenges
    if (challenges) {
      if (skillType === 'budgeting' && challenges.includes('financial-management')) score -= 2;
      if (skillType === 'cooking' && challenges.includes('food-preparation')) score -= 2;
      if (skillType === 'job-search' && challenges.includes('employment')) score -= 2;
      if (skillType === 'healthcare' && challenges.includes('health-access')) score -= 2;
    }

    return Math.max(1, Math.min(5, score));
  }

  // Determine priority needs based on assessment
  determinePriorityNeeds(factors) {
    const needs = [];

    if (factors.housingSituation === 'street' || factors.housingSituation === 'shelter') {
      needs.push('housing');
    }

    if (factors.employmentStatus === 'unemployed' || !factors.income || factors.income < 1000) {
      needs.push('employment');
      needs.push('financial-assistance');
    }

    if (factors.healthStatus && (factors.healthStatus.includes('chronic') || factors.healthStatus.includes('mental-health'))) {
      needs.push('healthcare');
    }

    if (factors.challenges) {
      if (factors.challenges.includes('legal')) needs.push('legal-aid');
      if (factors.challenges.includes('transportation')) needs.push('transportation');
      if (factors.challenges.includes('childcare')) needs.push('childcare');
    }

    return needs;
  }

  // Recommend specific services based on needs
  recommendServices(priorityNeeds, riskLevel) {
    const services = [];

    const serviceMap = {
      'housing': ['Emergency Shelter', 'Rapid Rehousing', 'Housing Navigation'],
      'employment': ['Job Training', 'Employment Services', 'Career Counseling'],
      'financial-assistance': ['SNAP Benefits', 'Cash Assistance', 'Utility Assistance'],
      'healthcare': ['Community Health Clinic', 'Mental Health Services', 'Medicaid Enrollment'],
      'legal-aid': ['Legal Aid Society', 'Public Defender', 'Court Assistance'],
      'transportation': ['Bus Passes', 'Transportation Vouchers', 'Ride Share Programs'],
      'childcare': ['Childcare Assistance', 'Head Start', 'After School Programs']
    };

    priorityNeeds.forEach(need => {
      if (serviceMap[need]) {
        services.push(...serviceMap[need]);
      }
    });

    // Add urgent services for high/critical risk
    if (riskLevel === 'critical') {
      services.unshift('Emergency Services', 'Crisis Intervention');
    } else if (riskLevel === 'high') {
      services.unshift('Priority Case Management');
    }

    return [...new Set(services)]; // Remove duplicates
  }

  // Calculate next review date based on risk level
  calculateNextReviewDate(riskLevel) {
    const now = new Date();
    
    switch (riskLevel) {
      case 'critical':
        return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days
      case 'high':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 1 week
      case 'medium':
        return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 2 weeks
      case 'low':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 1 month
      default:
        return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    }
  }

  // Generate personalized workbook content
  async generateWorkbookContent(category, userAssessment, personalizationFactors) {
    const contentTemplates = {
      'cooking': {
        beginner: {
          title: 'Basic Cooking Skills for Independent Living',
          modules: [
            'Kitchen Safety and Basic Tools',
            'Simple One-Pot Meals',
            'Budget-Friendly Grocery Shopping',
            'Meal Planning for Beginners'
          ]
        },
        intermediate: {
          title: 'Intermediate Cooking for Health and Savings',
          modules: [
            'Healthy Meal Preparation',
            'Batch Cooking and Food Storage',
            'Nutrition on a Budget',
            'Cultural Cooking Techniques'
          ]
        }
      },
      'budgeting': {
        beginner: {
          title: 'Personal Budgeting Basics',
          modules: [
            'Understanding Income and Expenses',
            'Creating Your First Budget',
            'Banking Basics',
            'Saving Strategies'
          ]
        },
        intermediate: {
          title: 'Advanced Financial Management',
          modules: [
            'Debt Management',
            'Credit Building',
            'Emergency Fund Planning',
            'Long-term Financial Goals'
          ]
        }
      },
      'scam-detection': {
        beginner: {
          title: 'Recognizing and Avoiding Scams',
          modules: [
            'Common Scam Types',
            'Red Flags to Watch For',
            'Protecting Personal Information',
            'What to Do If You\'re Scammed'
          ]
        }
      },
      'narcissism-detection': {
        beginner: {
          title: 'Understanding Narcissistic Behavior',
          modules: [
            'Identifying Narcissistic Traits',
            'Setting Healthy Boundaries',
            'Protecting Your Mental Health',
            'Building Supportive Relationships'
          ]
        }
      }
    };

    const template = contentTemplates[category]?.beginner || contentTemplates[category]?.intermediate;
    
    if (!template) {
      throw new Error(`No template found for category: ${category}`);
    }

    // Personalize content based on user assessment
    return this.personalizeContent(template, userAssessment, personalizationFactors);
  }

  // Personalize workbook content based on user factors
  personalizeContent(template, assessment, factors) {
    const personalized = { ...template };

    // Add personalization notes
    personalized.personalizationNotes = [];
    
    if (assessment.riskLevel === 'critical' || assessment.riskLevel === 'high') {
      personalized.personalizationNotes.push('Content adapted for high-stress situations');
    }

    if (factors.includes('low-literacy')) {
      personalized.personalizationNotes.push('Simplified language and more visual content');
    }

    if (factors.includes('limited-time')) {
      personalized.personalizationNotes.push('Shorter, more focused modules');
    }

    return personalized;
  }
}

module.exports = new AIService();
