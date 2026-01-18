const Workbook = require('../models/Workbook');
const { generateWorkbookContent } = require('./aiService');

class WorkbookGenerator {
  async createWorkbook(userId, category, userAssessment) {
    try {
      // Determine difficulty based on assessment
      const difficulty = this.determineDifficulty(userAssessment, category);
      
      // Generate personalized content
      const content = await generateWorkbookContent(category, userAssessment, []);
      
      // Create modules based on content
      const modules = this.createModules(content, category);
      
      // Calculate estimated completion time
      const estimatedTime = this.calculateEstimatedTime(modules);
      
      const workbook = new Workbook({
        title: content.title,
        description: `Personalized ${category} workbook based on your assessment results`,
        category,
        difficulty,
        user: userId,
        modules,
        progress: {
          totalModules: modules.length,
          estimatedCompletionTime: estimatedTime
        },
        aiGenerated: true,
        generationPrompt: `Generated for ${category} based on user assessment`,
        personalizationFactors: this.extractPersonalizationFactors(userAssessment)
      });

      await workbook.save();
      return workbook;
    } catch (error) {
      console.error('Workbook generation error:', error);
      throw new Error('Failed to create workbook');
    }
  }

  determineDifficulty(assessment, category) {
    const { lifeSkillsAssessment, riskLevel } = assessment.results;
    
    // Base difficulty on skill level
    const skillScore = lifeSkillsAssessment[category] || 3;
    
    // Adjust for risk level
    if (riskLevel === 'critical' || riskLevel === 'high') {
      return 'beginner'; // Start with basics for high-risk cases
    }
    
    if (skillScore >= 4) return 'advanced';
    if (skillScore >= 3) return 'intermediate';
    return 'beginner';
  }

  createModules(content, category) {
    const moduleTemplates = {
      cooking: [
        {
          title: 'Kitchen Safety and Basic Tools',
          description: 'Learn essential kitchen safety and how to use basic cooking tools',
          exercises: [
            {
              question: 'What is the first thing you should do before cooking?',
              type: 'multiple-choice',
              options: ['Wash your hands', 'Preheat the oven', 'Get ingredients', 'Turn on stove'],
              correctAnswer: 'Wash your hands',
              points: 10
            }
          ],
          resources: [
            {
              title: 'Kitchen Safety Guide',
              type: 'pdf',
              url: '/resources/kitchen-safety.pdf',
              description: 'Comprehensive kitchen safety checklist'
            }
          ]
        },
        {
          title: 'Budget-Friendly Grocery Shopping',
          description: 'Learn how to shop smart and save money on groceries',
          exercises: [
            {
              question: 'Which of these is most cost-effective for protein?',
              type: 'multiple-choice',
              options: ['Fresh salmon', 'Canned beans', 'Organic chicken', 'Steak'],
              correctAnswer: 'Canned beans',
              points: 10
            }
          ]
        }
      ],
      budgeting: [
        {
          title: 'Understanding Income and Expenses',
          description: 'Learn to track your money and understand where it goes',
          exercises: [
            {
              question: 'What percentage of income should ideally go to housing?',
              type: 'multiple-choice',
              options: ['15%', '30%', '50%', '70%'],
              correctAnswer: '30%',
              points: 10
            }
          ]
        },
        {
          title: 'Creating Your First Budget',
          description: 'Step-by-step guide to creating a realistic budget',
          exercises: [
            {
              question: 'List your top 3 monthly expenses',
              type: 'text',
              points: 15
            }
          ]
        }
      ],
      'scam-detection': [
        {
          title: 'Common Scam Types',
          description: 'Learn to recognize the most common scams targeting vulnerable populations',
          exercises: [
            {
              question: 'Someone calls saying you won a prize but need to pay a fee first. This is:',
              type: 'multiple-choice',
              options: ['Legitimate', 'A scam', 'Unclear', 'Depends on the prize'],
              correctAnswer: 'A scam',
              points: 10
            }
          ]
        },
        {
          title: 'Red Flags to Watch For',
          description: 'Identify warning signs of potential scams',
          exercises: [
            {
              question: 'Which of these is a red flag?',
              type: 'multiple-choice',
              options: ['Written communication', 'Pressure to act immediately', 'Local phone number', 'Physical address'],
              correctAnswer: 'Pressure to act immediately',
              points: 10
            }
          ]
        }
      ],
      'narcissism-detection': [
        {
          title: 'Identifying Narcissistic Traits',
          description: 'Learn to recognize narcissistic behaviors in relationships',
          exercises: [
            {
              question: 'Which trait is commonly associated with narcissism?',
              type: 'multiple-choice',
              options: ['Empathy', 'Lack of accountability', 'Humility', 'Generosity'],
              correctAnswer: 'Lack of accountability',
              points: 10
            }
          ]
        },
        {
          title: 'Setting Healthy Boundaries',
          description: 'Learn to establish and maintain healthy boundaries',
          exercises: [
            {
              question: 'What is a healthy boundary?',
              type: 'text',
              points: 15
            }
          ]
        }
      ]
    };

    const modules = moduleTemplates[category] || [];
    
    return modules.map((module, index) => ({
      ...module,
      order: index + 1,
      content: this.generateModuleContent(module, category)
    }));
  }

  generateModuleContent(module, category) {
    const contentMap = {
      cooking: `
        <h2>${module.title}</h2>
        <p>${module.description}</p>
        <h3>Key Learning Points:</h3>
        <ul>
          <li>Safety first - always prioritize your wellbeing</li>
          <li>Start simple - you don't need fancy equipment</li>
          <li>Practice makes perfect - don't be afraid to make mistakes</li>
        </ul>
        <h3>Step-by-Step Instructions:</h3>
        <p>Detailed instructions will be provided in this section...</p>
      `,
      budgeting: `
        <h2>${module.title}</h2>
        <p>${module.description}</p>
        <h3>Important Concepts:</h3>
        <ul>
          <li>Income vs Expenses</li>
          <li>Fixed vs Variable costs</li>
          <li>Saving strategies</li>
        </ul>
        <h3>Practical Examples:</h3>
        <p>Real-world examples and worksheets...</p>
      `,
      'scam-detection': `
        <h2>${module.title}</h2>
        <p>${module.description}</p>
        <h3>Warning Signs:</h3>
        <ul>
          <li>Urgency and pressure tactics</li>
          <li>Requests for personal information</li>
          <li>Too good to be true offers</li>
        </ul>
        <h3>Protection Strategies:</h3>
        <p>How to protect yourself from scams...</p>
      `,
      'narcissism-detection': `
        <h2>${module.title}</h2>
        <p>${module.description}</p>
        <h3>Key Indicators:</h3>
        <ul>
          <li>Patterns of behavior</li>
          <li>Communication styles</li>
          <li>Impact on your wellbeing</li>
        </ul>
        <h3>Coping Strategies:</h3>
        <p>Healthy ways to respond and protect yourself...</p>
      `
    };

    return contentMap[category] || `<h2>${module.title}</h2><p>${module.description}</p>`;
  }

  calculateEstimatedTime(modules) {
    // Estimate 15-30 minutes per module depending on complexity
    const avgTimePerModule = 20; // minutes
    return modules.length * avgTimePerModule;
  }

  extractPersonalizationFactors(assessment) {
    const factors = [];
    const { results } = assessment;
    
    if (results.riskLevel === 'critical' || results.riskLevel === 'high') {
      factors.push('high-risk');
    }
    
    if (results.priorityNeeds.includes('housing')) {
      factors.push('housing-insecure');
    }
    
    if (results.priorityNeeds.includes('employment')) {
      factors.push('unemployment');
    }
    
    return factors;
  }
}

module.exports = new WorkbookGenerator();
