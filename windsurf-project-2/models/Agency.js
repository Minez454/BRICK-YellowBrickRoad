const mongoose = require('mongoose');

const agencySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['shelter', 'food-bank', 'healthcare', 'legal-aid', 'employment', 'government', 'nonprofit', 'religious'],
    required: true
  },
  description: String,
  contact: {
    phone: String,
    email: String,
    website: String,
    address: {
      street: String,
      city: String,
      state: String,
      zip: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    }
  },
  services: [{
    name: String,
    description: String,
    eligibility: [String],
    requiredDocuments: [String],
    process: String
  }],
  hours: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday: { open: String, close: String },
    friday: { open: String, close: String },
    saturday: { open: String, close: String },
    sunday: { open: String, close: String }
  },
  capacity: {
    total: Number,
    current: Number,
    available: Number,
    lastUpdated: Date
  },
  requirements: {
    idRequired: Boolean,
    backgroundCheck: Boolean,
    residencyRequirement: String,
    incomeRequirement: String,
    otherRequirements: [String]
  },
  applications: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'denied', 'waitlist'],
      default: 'pending'
    },
    submittedDate: Date,
    reviewedDate: Date,
    notes: String,
    documents: [String],
    caseWorker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  mailbox: {
    messages: [{
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      subject: String,
      message: String,
      type: {
        type: String,
        enum: ['inquiry', 'update', 'alert', 'appointment', 'general'],
        default: 'general'
      },
      priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
      },
      read: {
        type: Boolean,
        default: false
      },
      readDate: Date,
      replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
      }
    }]
  },
  alerts: [{
    title: String,
    message: String,
    type: {
      type: String,
      enum: ['bed-availability', 'pop-up-service', 'emergency', 'update', 'closure'],
      default: 'update'
    },
    targetAudience: {
      type: String,
      enum: ['all-users', 'applicants-only', 'case-workers-only', 'public'],
      default: 'public'
    },
    location: {
      name: String,
      address: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    },
    startTime: Date,
    endTime: Date,
    active: {
      type: Boolean,
      default: true
    },
    sentUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  }],
  staff: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['admin', 'case-worker', 'intake', 'volunteer'],
      default: 'volunteer'
    },
    permissions: [String],
    startDate: Date
  }],
  statistics: {
    totalApplications: { type: Number, default: 0 },
    approvedApplications: { type: Number, default: 0 },
    deniedApplications: { type: Number, default: 0 },
    averageProcessingTime: Number, // in days
    successRate: { type: Number, default: 0 },
    lastCalculated: Date
  },
  verified: {
    type: Boolean,
    default: false
  },
  verificationDate: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Virtual for available capacity
agencySchema.virtual('availableCapacity').get(function() {
  return this.capacity.total - this.capacity.current;
});

// Method to update capacity
agencySchema.methods.updateCapacity = function(current) {
  this.capacity.current = current;
  this.capacity.available = this.capacity.total - current;
  this.capacity.lastUpdated = new Date();
  return this.save();
};

// Method to add application
agencySchema.methods.addApplication = function(userId, documents = []) {
  this.applications.push({
    user: userId,
    submittedDate: new Date(),
    documents
  });
  this.statistics.totalApplications += 1;
  return this.save();
};

// Method to calculate success rate
agencySchema.methods.calculateSuccessRate = function() {
  if (this.statistics.totalApplications === 0) {
    this.statistics.successRate = 0;
  } else {
    this.statistics.successRate = (this.statistics.approvedApplications / this.statistics.totalApplications) * 100;
  }
  this.statistics.lastCalculated = new Date();
  return this.save();
};

module.exports = mongoose.model('Agency', agencySchema);
