const Agency = require('../models/Agency');
const User = require('../models/User');
const { sendEmail, sendSMS } = require('../utils/notifications');

class DOSDirectoryController {
  // Get all agencies
  async getAllAgencies(req, res) {
    try {
      const { type, services, location } = req.query;
      
      let filter = { verified: true };
      
      if (type) filter.type = type;
      if (services) filter['services.name'] = { $in: services.split(',') };
      if (location) {
        filter['contact.address.city'] = new RegExp(location, 'i');
      }

      const agencies = await Agency.find(filter)
        .select('name type description contact services hours capacity')
        .sort({ name: 1 });

      res.json(agencies);
    } catch (error) {
      console.error('Get agencies error:', error);
      res.status(500).json({ error: 'Failed to fetch agencies' });
    }
  }

  // Get agency details
  async getAgency(req, res) {
    try {
      const { agencyId } = req.params;
      
      const agency = await Agency.findById(agencyId)
        .populate('staff.user', 'firstName lastName email')
        .populate('applications.user', 'firstName lastName email');

      if (!agency) {
        return res.status(404).json({ error: 'Agency not found' });
      }

      res.json(agency);
    } catch (error) {
      console.error('Get agency error:', error);
      res.status(500).json({ error: 'Failed to fetch agency' });
    }
  }

  // Submit application to agency
  async submitApplication(req, res) {
    try {
      const { agencyId } = req.params;
      const { userId, documents, notes } = req.body;

      const agency = await Agency.findById(agencyId);
      if (!agency) {
        return res.status(404).json({ error: 'Agency not found' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Add application to agency
      await agency.addApplication(userId, documents);

      // Send confirmation to user
      if (user.preferences.notifications.email) {
        await sendEmail(
          user.email,
          'Application Submitted',
          `Your application to ${agency.name} has been submitted successfully.`
        );
      }

      // Notify agency staff
      const staffEmails = agency.staff.map(s => s.user.email).filter(Boolean);
      for (const email of staffEmails) {
        await sendEmail(
          email,
          'New Application Received',
          `A new application has been received from ${user.firstName} ${user.lastName}.`
        );
      }

      res.json({ 
        success: true, 
        message: 'Application submitted successfully',
        applicationId: agency.applications[agency.applications.length - 1]._id
      });
    } catch (error) {
      console.error('Submit application error:', error);
      res.status(500).json({ error: 'Failed to submit application' });
    }
  }

  // Get user applications
  async getUserApplications(req, res) {
    try {
      const { userId } = req.params;

      const applications = await Agency.aggregate([
        { $unwind: '$applications' },
        { $match: { 'applications.user': mongoose.Types.ObjectId(userId) } },
        {
          $lookup: {
            from: 'agencies',
            localField: '_id',
            foreignField: '_id',
            as: 'agencyInfo'
          }
        },
        { $unwind: '$agencyInfo' },
        {
          $project: {
            _id: '$applications._id',
            status: '$applications.status',
            submittedDate: '$applications.submittedDate',
            reviewedDate: '$applications.reviewedDate',
            notes: '$applications.notes',
            agency: {
              _id: '$agencyInfo._id',
              name: '$agencyInfo.name',
              type: '$agencyInfo.type',
              contact: '$agencyInfo.contact'
            }
          }
        },
        { $sort: { submittedDate: -1 } }
      ]);

      res.json(applications);
    } catch (error) {
      console.error('Get user applications error:', error);
      res.status(500).json({ error: 'Failed to fetch applications' });
    }
  }

  // Send message to agency
  async sendMessage(req, res) {
    try {
      const { agencyId } = req.params;
      const { senderId, recipientId, subject, message, type, priority } = req.body;

      const agency = await Agency.findById(agencyId);
      if (!agency) {
        return res.status(404).json({ error: 'Agency not found' });
      }

      const newMessage = {
        sender: senderId,
        recipient: recipientId,
        subject,
        message,
        type: type || 'general',
        priority: priority || 'medium'
      };

      agency.mailbox.messages.push(newMessage);
      await agency.save();

      // Send notification if urgent
      if (priority === 'urgent') {
        const recipient = await User.findById(recipientId);
        if (recipient && recipient.preferences.notifications.sms) {
          await sendSMS(
            recipient.phone,
            `URGENT: ${subject} - ${message.substring(0, 100)}...`
          );
        }
      }

      res.json({ 
        success: true, 
        messageId: agency.mailbox.messages[agency.mailbox.messages.length - 1]._id 
      });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  }

  // Get agency messages
  async getMessages(req, res) {
    try {
      const { agencyId } = req.params;
      const { userId, type, unreadOnly } = req.query;

      let filter = {};
      if (userId) {
        filter.$or = [
          { sender: userId },
          { recipient: userId }
        ];
      }
      if (type) filter.type = type;
      if (unreadOnly === 'true') filter.read = false;

      const agency = await Agency.findById(agencyId);
      if (!agency) {
        return res.status(404).json({ error: 'Agency not found' });
      }

      const messages = agency.mailbox.messages
        .filter(filter)
        .sort({ createdAt: -1 })
        .populate('sender', 'firstName lastName')
        .populate('recipient', 'firstName lastName');

      res.json(messages);
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  }

  // Mark message as read
  async markMessageRead(req, res) {
    try {
      const { agencyId, messageId } = req.params;

      const agency = await Agency.findById(agencyId);
      if (!agency) {
        return res.status(404).json({ error: 'Agency not found' });
      }

      const message = agency.mailbox.messages.id(messageId);
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      message.read = true;
      message.readDate = new Date();
      await agency.save();

      res.json({ success: true });
    } catch (error) {
      console.error('Mark message read error:', error);
      res.status(500).json({ error: 'Failed to mark message as read' });
    }
  }

  // Create agency alert
  async createAlert(req, res) {
    try {
      const { agencyId } = req.params;
      const { title, message, type, targetAudience, location, startTime, endTime } = req.body;

      const agency = await Agency.findById(agencyId);
      if (!agency) {
        return res.status(404).json({ error: 'Agency not found' });
      }

      const alert = {
        title,
        message,
        type: type || 'update',
        targetAudience: targetAudience || 'public',
        location,
        startTime: startTime ? new Date(startTime) : new Date(),
        endTime: endTime ? new Date(endTime) : null
      };

      agency.alerts.push(alert);
      await agency.save();

      // Send alert to target users
      if (targetAudience === 'all-users' || targetAudience === 'applicants-only') {
        await this.sendAlertToUsers(agency, alert, targetAudience);
      }

      res.json({ 
        success: true, 
        alertId: agency.alerts[agency.alerts.length - 1]._id 
      });
    } catch (error) {
      console.error('Create alert error:', error);
      res.status(500).json({ error: 'Failed to create alert' });
    }
  }

  // Send alert to users
  async sendAlertToUsers(agency, alert, targetAudience) {
    try {
      let users = [];
      
      if (targetAudience === 'applicants-only') {
        const applicantIds = agency.applications.map(app => app.user);
        users = await User.find({ _id: { $in: applicantIds } });
      } else {
        users = await User.find({ 'currentSituation.housingStatus': { $ne: 'housed' } });
      }

      for (const user of users) {
        if (user.preferences.notifications.email) {
          await sendEmail(
            user.email,
            `Alert from ${agency.name}: ${alert.title}`,
            alert.message
          );
        }
        
        if (alert.type === 'bed-availability' && user.preferences.notifications.sms) {
          await sendSMS(
            user.phone,
            `${agency.name}: ${alert.title} - ${alert.message.substring(0, 100)}...`
          );
        }
      }

      // Mark users as notified
      const alertObj = agency.alerts[agency.alerts.length - 1];
      alertObj.sentUsers = users.map(u => u._id);
      await agency.save();
    } catch (error) {
      console.error('Send alert to users error:', error);
    }
  }

  // Update agency capacity
  async updateCapacity(req, res) {
    try {
      const { agencyId } = req.params;
      const { current, total } = req.body;

      const agency = await Agency.findById(agencyId);
      if (!agency) {
        return res.status(404).json({ error: 'Agency not found' });
      }

      if (total) agency.capacity.total = total;
      if (current !== undefined) {
        await agency.updateCapacity(current);
      }

      res.json({ 
        success: true, 
        capacity: agency.capacity 
      });
    } catch (error) {
      console.error('Update capacity error:', error);
      res.status(500).json({ error: 'Failed to update capacity' });
    }
  }

  // Get agency statistics
  async getStatistics(req, res) {
    try {
      const { agencyId } = req.params;

      const agency = await Agency.findById(agencyId);
      if (!agency) {
        return res.status(404).json({ error: 'Agency not found' });
      }

      // Calculate current statistics
      await agency.calculateSuccessRate();

      res.json(agency.statistics);
    } catch (error) {
      console.error('Get statistics error:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  }
}

module.exports = new DOSDirectoryController();
