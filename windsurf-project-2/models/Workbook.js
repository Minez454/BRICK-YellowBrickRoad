const mongoose = require('mongoose');

const workbookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  category: {
    type: String,
    enum: ['cooking', 'budgeting', 'scam-detection', 'narcissism-detection', 'job-search', 'healthcare', 'housing', 'legal'],
    required: true
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  personalizedContent: {
    type: Boolean,
    default: true
  },
  modules: [{
    title: String,
    description: String,
    order: Number,
    content: String,
    exercises: [{
      question: String,
      type: {
        type: String,
        enum: ['multiple-choice', 'text', 'video', 'practical']
      },
      options: [String],
      correctAnswer: String,
      points: Number
    }],
    resources: [{
      title: String,
      type: {
        type: String,
        enum: ['video', 'article', 'pdf', 'tool', 'contact']
      },
      url: String,
      description: String
    }],
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: Date,
    score: Number
  }],
  progress: {
    totalModules: { type: Number, default: 0 },
    completedModules: { type: Number, default: 0 },
    overallScore: { type: Number, default: 0 },
    lastAccessed: Date,
    estimatedCompletionTime: Number, // in minutes
    timeSpent: { type: Number, default: 0 } // in minutes
  },
  aiGenerated: {
    type: Boolean,
    default: true
  },
  generationPrompt: String,
  personalizationFactors: [String],
  status: {
    type: String,
    enum: ['not-started', 'in-progress', 'completed', 'paused'],
    default: 'not-started'
  },
  completionDate: Date,
  certificate: {
    issued: { type: Boolean, default: false },
    issuedDate: Date,
    certificateId: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Workbook', workbookSchema);
