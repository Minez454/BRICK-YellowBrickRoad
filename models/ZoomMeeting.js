const mongoose = require('mongoose');

const zoomMeetingSchema = new mongoose.Schema({
  meetingId: {
    type: String,
    required: true,
    unique: true
  },
  uuid: {
    type: String,
    required: true
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    email: String,
    name: String,
    joinedAt: Date,
    leftAt: Date,
    duration: Number, // in minutes
    status: {
      type: String,
      enum: ['invited', 'joined', 'left', 'no-show'],
      default: 'invited'
    }
  }],
  topic: {
    type: String,
    required: true
  },
  description: String,
  type: {
    type: String,
    enum: ['case-management', 'medical-consultation', 'legal-consultation', 'therapy', 'intake', 'follow-up', 'group-session', 'training'],
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // in minutes
    required: true
  },
  timezone: {
    type: String,
    default: 'America/Los_Angeles'
  },
  agenda: String,
  settings: {
    hostVideo: { type: Boolean, default: true },
    participantVideo: { type: Boolean, default: true },
    cnMeeting: { type: Boolean, default: false },
    inMeeting: { type: Boolean, default: false },
    joinBeforeHost: { type: Boolean, default: false },
    muteUponEntry: { type: Boolean, default: true },
    watermark: { type: Boolean, default: false },
    usePmi: { type: Boolean, default: false },
    approvalType: { type: Number, default: 2 }, // 0: automatically approve, 1: manually approve, 2: no registration required
    audio: { type: String, default: 'both' }, // both, telephony, voip
    autoRecording: { type: String, default: 'none' }, // none, local, cloud
    enforceLogin: { type: Boolean, default: false },
    alternativeHosts: [String],
    closeRegistration: { type: Boolean, default: false },
    waitingRoom: { type: Boolean, default: true },
    requestPermissionToUnmuteParticipants: { type: Boolean, default: false },
    authenticationDomains: [String],
    authenticationOption: { type: String, default: 'Sign In to Zoom' },
    authenticationName: { type: String, default: 'Sign In to Zoom' }
  },
  recurrence: {
    type: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'no_fixed_time']
    },
    repeatInterval: Number,
    weeklyDays: [Number], // 1-7 (Sunday-Saturday)
    monthlyDay: Number,
    monthlyWeek: Number, // 1-4 (first-fourth week)
    monthlyWeekDay: Number, // 1-7 (Sunday-Saturday)
    endTimes: Number,
    endDateTime: Date
  },
  status: {
    type: String,
    enum: ['scheduled', 'started', 'ended', 'cancelled'],
    default: 'scheduled'
  },
  joinUrl: {
    type: String,
    required: true
  },
  startUrl: {
    type: String,
    required: true
  },
  password: String,
  trackingFields: [{
    field: String,
    value: String,
    visible: { type: Boolean, default: true },
    required: { type: Boolean, default: false }
  }],
  caseContext: {
    caseId: String,
    agencyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agency'
    },
    caseWorkerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    relatedDocuments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document'
    }],
    notes: String,
    followUpRequired: Boolean,
    followUpDate: Date
  },
  recording: {
    enabled: { type: Boolean, default: false },
    recordingFiles: [{
      id: String,
      downloadUrl: String,
      playUrl: String,
      fileType: String,
      fileSize: Number,
      recordingStart: Date,
      recordingEnd: Date
    }],
    password: String,
    shareUrl: String
  },
  chat: {
    enabled: { type: Boolean, default: true },
    messages: [{
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      message: String,
      timestamp: { type: Date, default: Date.now },
      isPrivate: { type: Boolean, default: false },
      recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }],
    fileSharing: { type: Boolean, default: false }
  },
  security: {
    waitingRoomEnabled: { type: Boolean, default: true },
    passcodeRequired: { type: Boolean, default: false },
    authenticationRequired: { type: Boolean, default: false },
    endToEndEncryption: { type: Boolean, default: false },
    allowScreenShare: { type: Boolean, default: false },
    allowAnnotation: { type: Boolean, default: false },
    allowRemoteControl: { type: Boolean, default: false },
    lockMeeting: { type: Boolean, default: false }
  },
  accessibility: {
    liveTranscription: { type: Boolean, default: true },
    closedCaptioning: { type: Boolean, default: false },
    signLanguageInterpreter: { type: Boolean, default: false },
    screenReaderSupport: { type: Boolean, default: true }
  },
  statistics: {
    totalParticipants: { type: Number, default: 0 },
    averageDuration: Number,
    noShowRate: Number,
    satisfactionScore: Number,
    technicalIssues: [String],
    lastUpdated: Date
  },
  notifications: {
    reminderSent: { type: Boolean, default: false },
    reminderTimes: [Number], // minutes before meeting
    followUpSent: { type: Boolean, default: false },
    cancellationSent: { type: Boolean, default: false }
  },
  auditLog: [{
    action: {
      type: String,
      enum: ['created', 'updated', 'started', 'ended', 'cancelled', 'participant-joined', 'participant-left', 'recording-started', 'recording-stopped']
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: { type: Date, default: Date.now },
    details: String,
    ipAddress: String
  }]
}, {
  timestamps: true
});

// Indexes for efficient queries
zoomMeetingSchema.index({ host: 1, startTime: 1 });
zoomMeetingSchema.index({ 'participants.user': 1 });
zoomMeetingSchema.index({ status: 1 });
zoomMeetingSchema.index({ type: 1 });
zoomMeetingSchema.index({ startTime: 1 });

// Virtual for meeting duration
zoomMeetingSchema.virtual('actualDuration').get(function() {
  if (this.status === 'ended' && this.startTime) {
    const endTime = this.auditLog.find(log => log.action === 'ended')?.timestamp || new Date();
    return Math.round((endTime - this.startTime) / (1000 * 60)); // in minutes
  }
  return null;
});

// Method to add participant
zoomMeetingSchema.methods.addParticipant = function(userId, email, name) {
  // Remove existing participant if any
  this.participants = this.participants.filter(p => !p.user?.equals(userId));
  
  // Add new participant
  this.participants.push({
    user: userId,
    email,
    name,
    status: 'invited'
  });
  
  this.statistics.totalParticipants = this.participants.length;
  return this.save();
};

// Method to record participant join
zoomMeetingSchema.methods.recordParticipantJoin = function(userId) {
  const participant = this.participants.find(p => p.user?.equals(userId));
  if (participant) {
    participant.joinedAt = new Date();
    participant.status = 'joined';
  }
  
  this.auditLog.push({
    action: 'participant-joined',
    details: `Participant ${userId} joined the meeting`
  });
  
  return this.save();
};

// Method to record participant leave
zoomMeetingSchema.methods.recordParticipantLeave = function(userId) {
  const participant = this.participants.find(p => p.user?.equals(userId));
  if (participant && participant.joinedAt) {
    participant.leftAt = new Date();
    participant.duration = Math.round((participant.leftAt - participant.joinedAt) / (1000 * 60));
    participant.status = 'left';
  }
  
  this.auditLog.push({
    action: 'participant-left',
    details: `Participant ${userId} left the meeting`
  });
  
  return this.save();
};

// Method to start meeting
zoomMeetingSchema.methods.startMeeting = function(hostId) {
  this.status = 'started';
  this.auditLog.push({
    action: 'started',
    performedBy: hostId,
    details: 'Meeting started by host'
  });
  
  return this.save();
};

// Method to end meeting
zoomMeetingSchema.methods.endMeeting = function(hostId) {
  this.status = 'ended';
  this.auditLog.push({
    action: 'ended',
    performedBy: hostId,
    details: 'Meeting ended by host'
  });
  
  // Mark no-show participants
  this.participants.forEach(participant => {
    if (participant.status === 'invited') {
      participant.status = 'no-show';
    }
  });
  
  // Calculate statistics
  this.calculateStatistics();
  
  return this.save();
};

// Method to cancel meeting
zoomMeetingSchema.methods.cancelMeeting = function(hostId, reason) {
  this.status = 'cancelled';
  this.auditLog.push({
    action: 'cancelled',
    performedBy: hostId,
    details: reason || 'Meeting cancelled'
  });
  
  return this.save();
};

// Method to calculate statistics
zoomMeetingSchema.methods.calculateStatistics = function() {
  const attendedParticipants = this.participants.filter(p => ['joined', 'left'].includes(p.status));
  const totalDuration = attendedParticipants.reduce((sum, p) => sum + (p.duration || 0), 0);
  
  this.statistics.averageDuration = attendedParticipants.length > 0 ? totalDuration / attendedParticipants.length : 0;
  this.statistics.noShowRate = this.participants.length > 0 ? 
    (this.participants.filter(p => p.status === 'no-show').length / this.participants.length) * 100 : 0;
  this.statistics.lastUpdated = new Date();
  
  return this.save();
};

// Static method to find upcoming meetings for user
zoomMeetingSchema.statics.findUpcomingMeetings = function(userId, role = 'participant') {
  const now = new Date();
  const filter = {
    startTime: { $gte: now },
    status: 'scheduled'
  };
  
  if (role === 'host') {
    filter.host = userId;
  } else {
    filter['participants.user'] = userId;
  }
  
  return this.find(filter)
    .populate('host', 'firstName lastName email')
    .populate('participants.user', 'firstName lastName email')
    .populate('caseContext.agencyId', 'name type')
    .sort({ startTime: 1 });
};

// Static method to find meetings by date range
zoomMeetingSchema.statics.findMeetingsByDateRange = function(startDate, endDate, hostId = null) {
  const filter = {
    startTime: { $gte: startDate, $lte: endDate }
  };
  
  if (hostId) {
    filter.host = hostId;
  }
  
  return this.find(filter)
    .populate('host', 'firstName lastName email')
    .populate('participants.user', 'firstName lastName email')
    .sort({ startTime: -1 });
};

module.exports = mongoose.model('ZoomMeeting', zoomMeetingSchema);
