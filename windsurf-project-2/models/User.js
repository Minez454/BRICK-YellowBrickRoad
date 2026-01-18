const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  currentSituation: {
    housingStatus: {
      type: String,
      enum: ['housed', 'temporary', 'shelter', 'street', 'vehicle', 'unknown'],
      default: 'unknown'
    },
    employmentStatus: {
      type: String,
      enum: ['employed', 'unemployed', 'part-time', 'disabled', 'retired', 'student'],
      default: 'unemployed'
    },
    income: Number,
    familySize: Number,
    specialNeeds: [String]
  },
  assessment: {
    completed: {
      type: Boolean,
      default: false
    },
    date: Date,
    results: {
      riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
      },
      priorityNeeds: [String],
      recommendedServices: [String],
      lifeSkillsAssessment: {
        cooking: { type: Number, min: 1, max: 5 },
        budgeting: { type: Number, min: 1, max: 5 },
        scamDetection: { type: Number, min: 1, max: 5 },
        narcissismDetection: { type: Number, min: 1, max: 5 },
        jobSearch: { type: Number, min: 1, max: 5 },
        healthcare: { type: Number, min: 1, max: 5 }
      }
    }
  },
  workbooks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workbook'
  }],
  caseWorker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  agency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agency'
  },
  preferences: {
    language: {
      type: String,
      default: 'en'
    },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
