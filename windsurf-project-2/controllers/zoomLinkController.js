const ZoomMeeting = require('../models/ZoomMeeting');
const User = require('../models/User');
const Agency = require('../models/Agency');
const { sendEmail, sendSMS } = require('../utils/notifications');
const axios = require('axios');
const jwt = require('jsonwebtoken');

class ZoomLinkController {
  // Zoom API configuration
  getZoomAuth() {
    const apiKey = process.env.ZOOM_API_KEY;
    const apiSecret = process.env.ZOOM_API_SECRET;
    
    const payload = {
      iss: apiKey,
      exp: Date.now() + 60 * 60 * 1000 // 1 hour expiration
    };
    
    return jwt.sign(payload, apiSecret);
  }

  // Create Zoom meeting
  async createMeeting(req, res) {
    try {
      const { 
        hostId, 
        topic, 
        description, 
        type, 
        startTime, 
        duration, 
        participants,
        caseContext,
        settings 
      } = req.body;

      // Verify host exists
      const host = await User.findById(hostId);
      if (!host) {
        return res.status(404).json({ error: 'Host not found' });
      }

      // Prepare Zoom meeting data
      const zoomData = {
        topic,
        type: 2, // Scheduled meeting
        start_time: new Date(startTime).toISOString(),
        duration: duration || 60,
        timezone: 'America/Los_Angeles',
        agenda: description,
        settings: {
          host_video: settings?.hostVideo ?? true,
          participant_video: settings?.participantVideo ?? true,
          cn_meeting: false,
          in_meeting: false,
          join_before_host: settings?.joinBeforeHost ?? false,
          mute_upon_entry: settings?.muteUponEntry ?? true,
          watermark: false,
          use_pmi: false,
          approval_type: 2,
          audio: 'both',
          auto_recording: settings?.autoRecording || 'none',
          enforce_login: false,
          waiting_room: settings?.waitingRoom ?? true,
          ...settings
        }
      };

      // Create meeting via Zoom API
      const zoomResponse = await axios.post(
        'https://api.zoom.us/v2/users/me/meetings',
        zoomData,
        {
          headers: {
            'Authorization': `Bearer ${this.getZoomAuth()}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const zoomMeetingData = zoomResponse.data;

      // Create local meeting record
      const meeting = new ZoomMeeting({
        meetingId: zoomMeetingData.id.toString(),
        uuid: zoomMeetingData.uuid,
        host: hostId,
        participants: participants || [],
        topic,
        description,
        type,
        startTime: new Date(startTime),
        duration: duration || 60,
        joinUrl: zoomMeetingData.join_url,
        startUrl: zoomMeetingData.start_url,
        password: zoomMeetingData.password,
        settings: zoomData.settings,
        caseContext
      });

      await meeting.save();

      // Log creation
      meeting.auditLog.push({
        action: 'created',
        performedBy: hostId,
        details: `Meeting created: ${topic}`
      });
      await meeting.save();

      // Send invitations to participants
      await this.sendMeetingInvitations(meeting);

      res.status(201).json({
        success: true,
        message: 'Meeting created successfully',
        meeting
      });
    } catch (error) {
      console.error('Create meeting error:', error);
      if (error.response?.status === 401) {
        res.status(401).json({ error: 'Zoom API authentication failed' });
      } else {
        res.status(500).json({ error: 'Failed to create meeting' });
      }
    }
  }

  // Update meeting
  async updateMeeting(req, res) {
    try {
      const { meetingId } = req.params;
      const updates = req.body;
      const { hostId } = req.query;

      const meeting = await ZoomMeeting.findById(meetingId);
      if (!meeting) {
        return res.status(404).json({ error: 'Meeting not found' });
      }

      // Verify host
      if (meeting.host.toString() !== hostId) {
        return res.status(403).json({ error: 'Only host can update meeting' });
      }

      // Prepare Zoom update data
      const zoomUpdateData = {
        topic: updates.topic,
        start_time: updates.startTime ? new Date(updates.startTime).toISOString() : undefined,
        duration: updates.duration,
        agenda: updates.description,
        settings: updates.settings
      };

      // Update meeting via Zoom API
      if (Object.keys(zoomUpdateData).some(key => zoomUpdateData[key] !== undefined)) {
        await axios.patch(
          `https://api.zoom.us/v2/meetings/${meeting.meetingId}`,
          zoomUpdateData,
          {
            headers: {
              'Authorization': `Bearer ${this.getZoomAuth()}`,
              'Content-Type': 'application/json'
            }
          }
        );
      }

      // Update local record
      Object.assign(meeting, updates);
      
      meeting.auditLog.push({
        action: 'updated',
        performedBy: hostId,
        details: 'Meeting updated'
      });
      
      await meeting.save();

      res.json({
        success: true,
        message: 'Meeting updated successfully',
        meeting
      });
    } catch (error) {
      console.error('Update meeting error:', error);
      res.status(500).json({ error: 'Failed to update meeting' });
    }
  }

  // Get meeting details
  async getMeeting(req, res) {
    try {
      const { meetingId } = req.params;
      const { userId } = req.query;

      const meeting = await ZoomMeeting.findById(meetingId)
        .populate('host', 'firstName lastName email')
        .populate('participants.user', 'firstName lastName email')
        .populate('caseContext.agencyId', 'name type')
        .populate('caseContext.caseWorkerId', 'firstName lastName')
        .populate('caseContext.clientId', 'firstName lastName');

      if (!meeting) {
        return res.status(404).json({ error: 'Meeting not found' });
      }

      // Check access permissions
      const hasAccess = meeting.host._id.toString() === userId ||
        meeting.participants.some(p => p.user?._id.toString() === userId);

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json(meeting);
    } catch (error) {
      console.error('Get meeting error:', error);
      res.status(500).json({ error: 'Failed to fetch meeting' });
    }
  }

  // Get user's meetings
  async getUserMeetings(req, res) {
    try {
      const { userId } = req.params;
      const { role = 'participant', status, type, startDate, endDate } = req.query;

      let meetings;
      
      if (startDate && endDate) {
        meetings = await ZoomMeeting.findMeetingsByDateRange(
          new Date(startDate),
          new Date(endDate),
          role === 'host' ? userId : null
        );
      } else {
        meetings = await ZoomMeeting.findUpcomingMeetings(userId, role);
      }

      // Apply filters
      if (status) {
        meetings = meetings.filter(m => m.status === status);
      }
      if (type) {
        meetings = meetings.filter(m => m.type === type);
      }

      res.json(meetings);
    } catch (error) {
      console.error('Get user meetings error:', error);
      res.status(500).json({ error: 'Failed to fetch meetings' });
    }
  }

  // Join meeting
  async joinMeeting(req, res) {
    try {
      const { meetingId } = req.params;
      const { userId, email, name } = req.body;

      const meeting = await ZoomMeeting.findById(meetingId);
      if (!meeting) {
        return res.status(404).json({ error: 'Meeting not found' });
      }

      // Check if meeting is active
      if (meeting.status !== 'started') {
        return res.status(400).json({ error: 'Meeting has not started yet' });
      }

      // Add participant if not already added
      const existingParticipant = meeting.participants.find(p => p.user?.toString() === userId);
      if (!existingParticipant) {
        await meeting.addParticipant(userId, email, name);
      }

      // Record join
      await meeting.recordParticipantJoin(userId);

      res.json({
        success: true,
        message: 'Joined meeting successfully',
        joinUrl: meeting.joinUrl
      });
    } catch (error) {
      console.error('Join meeting error:', error);
      res.status(500).json({ error: 'Failed to join meeting' });
    }
  }

  // Leave meeting
  async leaveMeeting(req, res) {
    try {
      const { meetingId } = req.params;
      const { userId } = req.body;

      const meeting = await ZoomMeeting.findById(meetingId);
      if (!meeting) {
        return res.status(404).json({ error: 'Meeting not found' });
      }

      await meeting.recordParticipantLeave(userId);

      res.json({
        success: true,
        message: 'Left meeting successfully'
      });
    } catch (error) {
      console.error('Leave meeting error:', error);
      res.status(500).json({ error: 'Failed to leave meeting' });
    }
  }

  // Start meeting
  async startMeeting(req, res) {
    try {
      const { meetingId } = req.params;
      const { hostId } = req.body;

      const meeting = await ZoomMeeting.findById(meetingId);
      if (!meeting) {
        return res.status(404).json({ error: 'Meeting not found' });
      }

      // Verify host
      if (meeting.host.toString() !== hostId) {
        return res.status(403).json({ error: 'Only host can start meeting' });
      }

      await meeting.startMeeting(hostId);

      res.json({
        success: true,
        message: 'Meeting started successfully',
        startUrl: meeting.startUrl
      });
    } catch (error) {
      console.error('Start meeting error:', error);
      res.status(500).json({ error: 'Failed to start meeting' });
    }
  }

  // End meeting
  async endMeeting(req, res) {
    try {
      const { meetingId } = req.params;
      const { hostId } = req.body;

      const meeting = await ZoomMeeting.findById(meetingId);
      if (!meeting) {
        return res.status(404).json({ error: 'Meeting not found' });
      }

      // Verify host
      if (meeting.host.toString() !== hostId) {
        return res.status(403).json({ error: 'Only host can end meeting' });
      }

      await meeting.endMeeting(hostId);

      // Send follow-up if required
      if (meeting.caseContext?.followUpRequired) {
        await this.sendFollowUpSummary(meeting);
      }

      res.json({
        success: true,
        message: 'Meeting ended successfully'
      });
    } catch (error) {
      console.error('End meeting error:', error);
      res.status(500).json({ error: 'Failed to end meeting' });
    }
  }

  // Cancel meeting
  async cancelMeeting(req, res) {
    try {
      const { meetingId } = req.params;
      const { hostId, reason } = req.body;

      const meeting = await ZoomMeeting.findById(meetingId);
      if (!meeting) {
        return res.status(404).json({ error: 'Meeting not found' });
      }

      // Verify host
      if (meeting.host.toString() !== hostId) {
        return res.status(403).json({ error: 'Only host can cancel meeting' });
      }

      // Delete meeting via Zoom API
      await axios.delete(
        `https://api.zoom.us/v2/meetings/${meeting.meetingId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.getZoomAuth()}`
          }
        }
      );

      await meeting.cancelMeeting(hostId, reason);

      // Send cancellation notifications
      await this.sendCancellationNotifications(meeting, reason);

      res.json({
        success: true,
        message: 'Meeting cancelled successfully'
      });
    } catch (error) {
      console.error('Cancel meeting error:', error);
      res.status(500).json({ error: 'Failed to cancel meeting' });
    }
  }

  // Add participant to meeting
  async addParticipant(req, res) {
    try {
      const { meetingId } = req.params;
      const { userId, email, name } = req.body;
      const { hostId } = req.query;

      const meeting = await ZoomMeeting.findById(meetingId);
      if (!meeting) {
        return res.status(404).json({ error: 'Meeting not found' });
      }

      // Verify host
      if (meeting.host.toString() !== hostId) {
        return res.status(403).json({ error: 'Only host can add participants' });
      }

      await meeting.addParticipant(userId, email, name);

      // Send invitation to new participant
      await this.sendMeetingInvitation(meeting, { email, name });

      res.json({
        success: true,
        message: 'Participant added successfully'
      });
    } catch (error) {
      console.error('Add participant error:', error);
      res.status(500).json({ error: 'Failed to add participant' });
    }
  }

  // Get meeting recordings
  async getRecordings(req, res) {
    try {
      const { meetingId } = req.params;
      const { userId } = req.query;

      const meeting = await ZoomMeeting.findById(meetingId);
      if (!meeting) {
        return res.status(404).json({ error: 'Meeting not found' });
      }

      // Check access permissions
      const hasAccess = meeting.host.toString() === userId ||
        meeting.participants.some(p => p.user?.toString() === userId);

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get recordings from Zoom API
      const recordingsResponse = await axios.get(
        `https://api.zoom.us/v2/meetings/${meeting.meetingId}/recordings`,
        {
          headers: {
            'Authorization': `Bearer ${this.getZoomAuth()}`
          }
        }
      );

      const recordings = recordingsResponse.data;

      // Update local record with recording info
      if (recording.recording_files) {
        meeting.recording.recordingFiles = recordings.recording_files.map(file => ({
          id: file.id,
          downloadUrl: file.download_url,
          playUrl: file.play_url,
          fileType: file.file_type,
          fileSize: file.file_size,
          recordingStart: new Date(file.recording_start),
          recordingEnd: new Date(file.recording_end)
        }));
        meeting.recording.enabled = true;
        await meeting.save();
      }

      res.json(meeting.recording);
    } catch (error) {
      console.error('Get recordings error:', error);
      res.status(500).json({ error: 'Failed to fetch recordings' });
    }
  }

  // Send meeting invitations
  async sendMeetingInvitations(meeting, specificParticipant = null) {
    try {
      const participants = specificParticipant ? [specificParticipant] : meeting.participants;
      
      for (const participant of participants) {
        if (participant.email) {
          const invitationEmail = `
            You are invited to a meeting: ${meeting.topic}
            
            Date: ${meeting.startTime.toLocaleDateString()}
            Time: ${meeting.startTime.toLocaleTimeString()}
            Duration: ${meeting.duration} minutes
            Type: ${meeting.type}
            
            ${meeting.description ? `Description: ${meeting.description}` : ''}
            
            Join URL: ${meeting.joinUrl}
            ${meeting.password ? `Password: ${meeting.password}` : ''}
            
            Please join a few minutes before the scheduled time.
          `;

          await sendEmail(
            participant.email,
            `Meeting Invitation: ${meeting.topic}`,
            invitationEmail
          );
        }
      }
    } catch (error) {
      console.error('Send meeting invitations error:', error);
    }
  }

  // Send cancellation notifications
  async sendCancellationNotifications(meeting, reason) {
    try {
      for (const participant of meeting.participants) {
        if (participant.email) {
          const cancellationEmail = `
            The following meeting has been cancelled:
            
            Meeting: ${meeting.topic}
            Originally scheduled: ${meeting.startTime.toLocaleDateString()} at ${meeting.startTime.toLocaleTimeString()}
            
            ${reason ? `Reason: ${reason}` : ''}
            
            We apologize for any inconvenience.
          `;

          await sendEmail(
            participant.email,
            `Meeting Cancelled: ${meeting.topic}`,
            cancellationEmail
          );
        }
      }
    } catch (error) {
      console.error('Send cancellation notifications error:', error);
    }
  }

  // Send follow-up summary
  async sendFollowUpSummary(meeting) {
    try {
      const host = await User.findById(meeting.host);
      const attendedParticipants = meeting.participants.filter(p => ['joined', 'left'].includes(p.status));

      for (const participant of attendedParticipants) {
        if (participant.email) {
          const summaryEmail = `
            Meeting Summary: ${meeting.topic}
            
            Date: ${meeting.startTime.toLocaleDateString()}
            Duration: ${meeting.actualDuration || 'N/A'} minutes
            Attendees: ${attendedParticipants.length}
            
            ${meeting.caseContext?.notes ? `Notes: ${meeting.caseContext.notes}` : ''}
            
            ${meeting.caseContext?.followUpDate ? `Follow-up scheduled: ${meeting.caseContext.followUpDate.toLocaleDateString()}` : ''}
            
            Thank you for attending.
          `;

          await sendEmail(
            participant.email,
            `Meeting Summary: ${meeting.topic}`,
            summaryEmail
          );
        }
      }
    } catch (error) {
      console.error('Send follow-up summary error:', error);
    }
  }
}

module.exports = new ZoomLinkController();
