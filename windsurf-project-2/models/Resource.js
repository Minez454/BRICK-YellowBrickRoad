const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: [
      'shelter',
      'food',
      'medical',
      'hygiene',
      'clothing',
      'internet',
      'transportation',
      'legal-aid',
      'job-center',
      'pop-up-service'
    ],
    required: true
  },
  subType: {
    type: String,
    enum: [
      // Shelter subtypes
      'emergency-shelter',
      'transitional-housing',
      'warming-center',
      'cooling-center',
      // Food subtypes
      'food-bank',
      'soup-kitchen',
      'meal-distribution',
      'snap-office',
      // Medical subtypes
      'clinic',
      'pharmacy',
      'mental-health',
      'substance-abuse',
      'vaccination',
      // Hygiene subtypes
      'showers',
      'laundry',
      'restrooms',
      // Pop-up service subtypes
      'needle-exchange',
      'outreach',
      'mobile-clinic',
      'resource-fair'
    ]
  },
  location: {
    name: String,
    address: {
      street: String,
      city: String,
      state: String,
      zip: String
    },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    },
    directions: String,
    landmarks: [String]
  },
  contact: {
    phone: String,
    email: String,
    website: String
  },
  availability: {
    status: {
      type: String,
      enum: ['open', 'closed', 'limited', 'full'],
      default: 'open'
    },
    hours: {
      monday: { open: String, close: String, closed: Boolean },
      tuesday: { open: String, close: String, closed: Boolean },
      wednesday: { open: String, close: String, closed: Boolean },
      thursday: { open: String, close: String, closed: Boolean },
      friday: { open: String, close: String, closed: Boolean },
      saturday: { open: String, close: String, closed: Boolean },
      sunday: { open: String, close: String, closed: Boolean }
    },
    capacity: {
      total: Number,
      current: Number,
      available: Number,
      waitlist: Number
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  services: [{
    name: String,
    description: String,
    cost: {
      type: String,
      enum: ['free', 'low-cost', 'sliding-scale', 'fixed-cost']
    },
    requirements: [String],
    restrictions: [String]
  }],
  requirements: {
    idRequired: Boolean,
    residencyRequired: Boolean,
    backgroundCheck: Boolean,
    incomeRestrictions: [String],
    ageRestrictions: String,
    genderRestrictions: String,
    otherRequirements: [String]
  },
  accessibility: {
    wheelchairAccessible: Boolean,
    adaCompliant: Boolean,
    parkingAvailable: Boolean,
    publicTransportation: Boolean,
    languageServices: [String]
  },
  popUpService: {
    isPopUp: { type: Boolean, default: false },
    schedule: {
      startDate: Date,
      endDate: Date,
      recurring: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'one-time']
      },
      daysOfWeek: [String], // For recurring services
      times: [String]
    },
    organizer: String,
    partnerAgencies: [String]
  },
  verification: {
    verified: { type: Boolean, default: false },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedDate: Date,
    lastConfirmed: Date,
    confirmationMethod: {
      type: String,
      enum: ['phone', 'visit', 'website', 'agency-report']
    }
  },
  updates: [{
    timestamp: { type: Date, default: Date.now },
    type: {
      type: String,
      enum: ['status-change', 'capacity-update', 'hours-change', 'service-change', 'closure', 'reopening']
    },
    description: String,
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verified: Boolean
  }],
  ratings: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    review: String,
    helpful: Boolean,
    timestamp: { type: Date, default: Date.now }
  }],
  statistics: {
    totalCheckIns: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    lastUpdated: Date
  }
}, {
  timestamps: true
});

// Index for location-based queries
resourceSchema.index({ 'location.coordinates': '2dsphere' });

// Index for type and status queries
resourceSchema.index({ type: 1, 'availability.status': 1 });

// Virtual for available capacity
resourceSchema.virtual('availability.availableCapacity').get(function() {
  if (!this.availability.capacity.total || !this.availability.capacity.current) {
    return null;
  }
  return this.availability.capacity.total - this.availability.capacity.current;
});

// Method to update availability
resourceSchema.methods.updateAvailability = function(status, capacity = null) {
  this.availability.status = status;
  this.availability.lastUpdated = new Date();
  
  if (capacity) {
    this.availability.capacity.current = capacity.current;
    this.availability.capacity.available = capacity.available;
    this.availability.capacity.waitlist = capacity.waitlist || 0;
  }
  
  // Add update record
  this.updates.push({
    type: 'status-change',
    description: `Status changed to ${status}`,
    verified: false
  });
  
  return this.save();
};

// Method to add rating
resourceSchema.methods.addRating = function(userId, rating, review = '') {
  // Remove existing rating from same user
  this.ratings = this.ratings.filter(r => !r.user.equals(userId));
  
  // Add new rating
  this.ratings.push({
    user: userId,
    rating,
    review
  });
  
  // Calculate average rating
  this.statistics.averageRating = this.ratings.reduce((sum, r) => sum + r.rating, 0) / this.ratings.length;
  this.statistics.lastUpdated = new Date();
  
  return this.save();
};

// Method to verify resource
resourceSchema.methods.verify = function(verifiedBy, method = 'visit') {
  this.verification.verified = true;
  this.verification.verifiedBy = verifiedBy;
  this.verification.verifiedDate = new Date();
  this.verification.lastConfirmed = new Date();
  this.verification.confirmationMethod = method;
  
  return this.save();
};

// Static method to find nearby resources
resourceSchema.statics.findNearby = function(lat, lng, maxDistance = 5000, filters = {}) {
  const query = {
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        $maxDistance: maxDistance // in meters
      }
    }
  };
  
  // Apply filters
  if (filters.type) query.type = filters.type;
  if (filters.status) query['availability.status'] = filters.status;
  if (filters.verified) query['verification.verified'] = filters.verified;
  
  return this.find(query)
    .populate('verification.verifiedBy', 'firstName lastName')
    .sort({ 'availability.lastUpdated': -1 });
};

// Static method to find resources by type and availability
resourceSchema.statics.findByTypeAndAvailability = function(type, status = 'open') {
  return this.find({
    type,
    'availability.status': status,
    'verification.verified': true
  })
  .sort({ 'location.coordinates': 1 });
};

module.exports = mongoose.model('Resource', resourceSchema);
