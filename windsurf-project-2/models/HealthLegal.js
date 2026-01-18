const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  dosage: {
    type: String,
    required: true
  },
  frequency: {
    type: String,
    required: true
  },
  times: [String], // e.g., ['08:00', '14:00', '20:00']
  startDate: Date,
  endDate: Date,
  prescribedBy: String,
  pharmacy: {
    name: String,
    phone: String,
    address: String
  },
  refills: {
    remaining: Number,
    lastFilled: Date,
    nextRefillDate: Date
  },
  sideEffects: [String],
  notes: String,
  isActive: {
    type: Boolean,
    default: true
  },
  reminders: {
    enabled: { type: Boolean, default: true },
    notificationTypes: [{
      type: String,
      enum: ['push', 'sms', 'email']
    }],
    advanceNotice: { type: Number, default: 15 }, // minutes before
    lastReminderSent: Date
  },
  adherence: {
    dosesTaken: { type: Number, default: 0 },
    dosesMissed: { type: Number, default: 0 },
    totalDoses: { type: Number, default: 0 },
    adherenceRate: { type: Number, default: 0 }
  }
}, { timestamps: true });

const appointmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['medical', 'dental', 'mental-health', 'specialist', 'therapy', 'case-worker', 'legal'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  dateTime: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // in minutes
    default: 60
  },
  location: {
    name: String,
    address: String,
    phone: String,
    coordinates: {
      lat: Number,
      lng: Number
    },
    directions: String
  },
  provider: {
    name: String,
    specialty: String,
    phone: String,
    email: String
  },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show'],
    default: 'scheduled'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  preparation: [String], // Things to bring or prepare
  notes: String,
  reminders: {
    enabled: { type: Boolean, default: true },
    times: [Number], // Hours before appointment to remind
    notificationTypes: [{
      type: String,
      enum: ['push', 'sms', 'email']
    }],
    lastRemindersSent: [Date]
  },
  transportation: {
    needed: { type: Boolean, default: false },
    arranged: { type: Boolean, default: false },
    method: String, // bus, ride-share, medical transport, etc.
    pickupTime: Date,
    notes: String
  },
  followUp: {
    required: Boolean,
    scheduledDate: Date,
    notes: String
  }
}, { timestamps: true });

const courtDateSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  caseNumber: {
    type: String,
    required: true
  },
  caseType: {
    type: String,
    enum: ['criminal', 'civil', 'family', 'housing', 'traffic', 'probation'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  date: {
    type: Date,
    required: true
  },
  time: String,
  courthouse: {
    name: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    department: String,
    room: String
  },
  judge: String,
  prosecutor: String,
  defenseAttorney: String,
  status: {
    type: String,
    enum: ['scheduled', 'continued', 'completed', 'missed', 'dismissed'],
    default: 'scheduled'
  },
  outcome: String,
  nextDate: Date,
  requirements: [String], // What to bring, dress code, etc.
  legalRepresentation: {
    hasLawyer: Boolean,
    lawyerName: String,
    lawyerContact: String,
    publicDefender: Boolean
  },
  reminders: {
    enabled: { type: Boolean, default: true },
    times: [Number], // Days before court date to remind
    notificationTypes: [{
      type: String,
      enum: ['push', 'sms', 'email']
    }],
    lastRemindersSent: [Date]
  },
  documents: [{
    type: String,
    description: String,
    required: Boolean,
    submitted: Boolean,
    submissionDate: Date
  }],
  preparation: {
    dressCode: String,
    arrivalTime: String,
    prohibitedItems: [String],
    checkInProcess: String
  },
  transportation: {
    needed: { type: Boolean, default: false },
    arranged: { type: Boolean, default: false },
    method: String,
    pickupTime: Date
  }
}, { timestamps: true });

const warrantSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['arrest-warrant', 'bench-warrant', 'search-warrant'],
    required: true
  },
  caseNumber: String,
  issuingAgency: String,
  issuedDate: Date,
  status: {
    type: String,
    enum: ['active', 'recalled', 'served', 'expired'],
    default: 'active'
  },
  severity: {
    type: String,
    enum: ['misdemeanor', 'felony', 'infraction'],
    required: true
  },
  description: String,
  bondAmount: Number,
  courtInfo: {
    courthouse: String,
    address: String,
    date: Date,
    time: String
  },
  attorney: {
    name: String,
    contact: String
  },
  nextSteps: [String],
  resolution: {
    resolved: Boolean,
    resolutionDate: Date,
    method: String,
    notes: String
  },
  alerts: {
    enabled: { type: Boolean, default: true },
    lastChecked: Date
  }
}, { timestamps: true });

// Health and Legal Tracker main schema
const healthLegalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  medications: [medicationSchema],
  appointments: [appointmentSchema],
  courtDates: [courtDateSchema],
  warrants: [warrantSchema],
  emergencyContacts: [{
    name: String,
    relationship: String,
    phone: String,
    email: String,
    priority: {
      type: String,
      enum: ['primary', 'secondary'],
      default: 'secondary'
    }
  }],
  medicalProviders: [{
    name: String,
    specialty: String,
    phone: String,
    address: String,
    lastVisit: Date,
    nextVisit: Date
  }],
  legalAttorneys: [{
    name: String,
    firm: String,
    specialty: String,
    phone: String,
    email: String,
    cases: [String] // Case numbers
  }],
  insurance: {
    medical: {
      provider: String,
      policyNumber: String,
      groupNumber: String,
      customerService: String,
      coverage: String
    },
    prescription: {
      provider: String,
      policyNumber: String,
      customerService: String
    }
  },
  preferences: {
    notifications: {
      medication: { type: Boolean, default: true },
      appointments: { type: Boolean, default: true },
      courtDates: { type: Boolean, default: true },
      warrants: { type: Boolean, default: true }
    },
    reminderTimes: {
      medication: { type: Number, default: 15 }, // minutes before
      appointments: [24, 72], // hours before
      courtDates: [7, 3, 1] // days before
    }
  },
  statistics: {
    medicationAdherenceRate: { type: Number, default: 0 },
    appointmentAttendanceRate: { type: Number, default: 0 },
    courtDateComplianceRate: { type: Number, default: 0 },
    activeWarrants: { type: Number, default: 0 },
    lastUpdated: Date
  }
}, { timestamps: true });

// Indexes for efficient queries
healthLegalSchema.index({ user: 1 });
healthLegalSchema.index({ 'appointments.dateTime': 1 });
healthLegalSchema.index({ 'courtDates.date': 1 });
healthLegalSchema.index({ 'warrants.status': 1 });

// Static method to find upcoming appointments
healthLegalSchema.statics.findUpcomingAppointments = function(userId, days = 7) {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  return this.findOne(
    { user: userId },
    { 
      appointments: {
        $elemMatch: {
          dateTime: { $gte: startDate, $lte: endDate },
          status: { $in: ['scheduled', 'confirmed'] }
        }
      }
    }
  ).populate('appointments.provider');
};

// Static method to find upcoming court dates
healthLegalSchema.statics.findUpcomingCourtDates = function(userId, days = 30) {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  return this.findOne(
    { user: userId },
    { 
      courtDates: {
        $elemMatch: {
          date: { $gte: startDate, $lte: endDate },
          status: 'scheduled'
        }
      }
    }
  );
};

// Static method to find active warrants
healthLegalSchema.statics.findActiveWarrants = function(userId) {
  return this.findOne(
    { user: userId, 'warrants.status': 'active' },
    { warrants: { $elemMatch: { status: 'active' } } }
  );
};

// Method to calculate statistics
healthLegalSchema.methods.calculateStatistics = function() {
  const stats = this.statistics;
  
  // Calculate medication adherence
  if (this.medications.length > 0) {
    const totalDoses = this.medications.reduce((sum, med) => sum + med.adherence.totalDoses, 0);
    const takenDoses = this.medications.reduce((sum, med) => sum + med.adherence.dosesTaken, 0);
    stats.medicationAdherenceRate = totalDoses > 0 ? (takenDoses / totalDoses) * 100 : 0;
  }
  
  // Calculate appointment attendance
  const completedAppointments = this.appointments.filter(apt => apt.status === 'completed').length;
  const totalAppointments = this.appointments.filter(apt => ['completed', 'missed', 'no-show'].includes(apt.status)).length;
  stats.appointmentAttendanceRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;
  
  // Calculate court date compliance
  const completedCourtDates = this.courtDates.filter(court => court.status === 'completed').length;
  const totalCourtDates = this.courtDates.filter(court => ['completed', 'missed'].includes(court.status)).length;
  stats.courtDateComplianceRate = totalCourtDates > 0 ? (completedCourtDates / totalCourtDates) * 100 : 0;
  
  // Count active warrants
  stats.activeWarrants = this.warrants.filter(warrant => warrant.status === 'active').length;
  
  stats.lastUpdated = new Date();
  
  return this.save();
};

const HealthLegal = mongoose.model('HealthLegal', healthLegalSchema);
module.exports = { HealthLegal, medicationSchema, appointmentSchema, courtDateSchema, warrantSchema };
