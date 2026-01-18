const Agency = require('../models/Agency');
const User = require('../models/User');
const Workbook = require('../models/Workbook');
const Document = require('../models/Document');
const ZoomMeeting = require('../models/ZoomMeeting');
const { HealthLegal } = require('../models/HealthLegal');

class AgencyPortalController {
  // Get agency dashboard data
  async getDashboard(req, res) {
    try {
      const { agencyId } = req.params;

      const agency = await Agency.findById(agencyId)
        .populate('applications.user', 'firstName lastName email phone')
        .populate('staff.user', 'firstName lastName email')
        .populate('mailbox.messages.sender', 'firstName lastName')
        .populate('mailbox.messages.recipient', 'firstName lastName');

      if (!agency) {
        return res.status(404).json({ error: 'Agency not found' });
      }

      // Calculate dashboard statistics
      const dashboard = {
        agency: {
          name: agency.name,
          type: agency.type,
          capacity: agency.capacity,
          contact: agency.contact
        },
        statistics: {
          totalApplications: agency.applications.length,
          pendingApplications: agency.applications.filter(app => app.status === 'pending').length,
          approvedApplications: agency.applications.filter(app => app.status === 'approved').length,
          deniedApplications: agency.applications.filter(app => app.status === 'denied').length,
          waitlistApplications: agency.applications.filter(app => app.status === 'waitlist').length,
          unreadMessages: agency.mailbox.messages.filter(msg => !msg.read).length,
          activeStaff: agency.staff.filter(staff => staff.role !== 'volunteer').length
        },
        recentApplications: agency.applications
          .sort((a, b) => new Date(b.submittedDate) - new Date(a.submittedDate))
          .slice(0, 5),
        recentMessages: agency.mailbox.messages
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5),
        upcomingAlerts: agency.alerts
          .filter(alert => alert.active && new Date(alert.startTime) > new Date())
          .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
          .slice(0, 3)
      };

      res.json(dashboard);
    } catch (error) {
      console.error('Get dashboard error:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  }

  // Get client dossier
  async getClientDossier(req, res) {
    try {
      const { agencyId, clientId } = req.params;

      // Verify agency has access to this client
      const agency = await Agency.findById(agencyId);
      if (!agency) {
        return res.status(404).json({ error: 'Agency not found' });
      }

      const hasApplication = agency.applications.some(app => app.user.toString() === clientId);
      if (!hasApplication) {
        return res.status(403).json({ error: 'Access denied to client dossier' });
      }

      // Get comprehensive client information
      const user = await User.findById(clientId)
        .select('-password')
        .populate('caseWorker', 'firstName lastName email phone');

      if (!user) {
        return res.status(404).json({ error: 'Client not found' });
      }

      // Get client's workbooks
      const workbooks = await Workbook.find({ user: clientId })
        .sort({ createdAt: -1 })
        .populate('user', 'firstName lastName');

      // Get client's documents (accessible by agency)
      const documents = await Document.find({
        user: clientId,
        'access.agencies.agency': agencyId,
        'access.agencies.canView': true
      })
      .select('type title expirationDate isCertified status tags');

      // Get client's health and legal tracker
      const healthLegal = await HealthLegal.findOne({ user: clientId })
        .select('medications appointments courtDates warrants emergencyContacts');

      // Get client's meetings with this agency
      const meetings = await ZoomMeeting.find({
        'caseContext.agencyId': agencyId,
        'participants.user': clientId
      })
      .populate('host', 'firstName lastName')
      .sort({ startTime: -1 });

      // Get application history with this agency
      const application = agency.applications.find(app => app.user.toString() === clientId);

      const dossier = {
        personal: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          dateOfBirth: user.dateOfBirth,
          emergencyContact: user.emergencyContact
        },
        assessment: user.assessment,
        currentSituation: user.currentSituation,
        caseWorker: user.caseWorker,
        workbooks: workbooks.map(wb => ({
          id: wb._id,
          title: wb.title,
          category: wb.category,
          status: wb.status,
          progress: wb.progress,
          completionDate: wb.completionDate,
          certificate: wb.certificate
        })),
        documents: documents.map(doc => ({
          id: doc._id,
          type: doc.type,
          title: doc.title,
          expirationDate: doc.expirationDate,
          isCertified: doc.isCertified,
          status: doc.status,
          tags: doc.tags
        })),
        healthLegal: healthLegal || {},
        meetings: meetings.map(meeting => ({
          id: meeting._id,
          topic: meeting.topic,
          type: meeting.type,
          startTime: meeting.startTime,
          duration: meeting.duration,
          status: meeting.status,
          participantStatus: meeting.participants.find(p => p.user?.toString() === clientId)?.status
        })),
        application: {
          id: application._id,
          status: application.status,
          submittedDate: application.submittedDate,
          reviewedDate: application.reviewedDate,
          notes: application.notes,
          caseWorker: application.caseWorker
        },
        lastUpdated: new Date()
      };

      res.json(dossier);
    } catch (error) {
      console.error('Get client dossier error:', error);
      res.status(500).json({ error: 'Failed to fetch client dossier' });
    }
  }

  // Monitor workbook progress
  async getWorkbookProgress(req, res) {
    try {
      const { agencyId } = req.params;
      const { status, category, completedAfter } = req.query;

      // Get all clients who have applied to this agency
      const agency = await Agency.findById(agencyId);
      if (!agency) {
        return res.status(404).json({ error: 'Agency not found' });
      }

      const clientIds = agency.applications.map(app => app.user);

      // Build filter for workbooks
      let filter = { user: { $in: clientIds } };
      
      if (status) filter.status = status;
      if (category) filter.category = category;
      if (completedAfter) {
        filter.completionDate = { $gte: new Date(completedAfter) };
      }

      const workbooks = await Workbook.find(filter)
        .populate('user', 'firstName lastName email')
        .sort({ updatedAt: -1 });

      // Calculate progress statistics
      const progressStats = {
        total: workbooks.length,
        byStatus: {
          'not-started': workbooks.filter(wb => wb.status === 'not-started').length,
          'in-progress': workbooks.filter(wb => wb.status === 'in-progress').length,
          'completed': workbooks.filter(wb => wb.status === 'completed').length,
          'paused': workbooks.filter(wb => wb.status === 'paused').length
        },
        byCategory: {},
        averageCompletionRate: 0,
        readyForHousing: [] // Clients who completed budgeting and other key workbooks
      };

      workbooks.forEach(wb => {
        // Count by category
        progressStats.byCategory[wb.category] = (progressStats.byCategory[wb.category] || 0) + 1;
        
        // Calculate completion rate
        if (wb.progress.overallScore > 0) {
          progressStats.averageCompletionRate += wb.progress.overallScore;
        }
        
        // Identify clients ready for housing
        if (wb.category === 'budgeting' && wb.status === 'completed' && wb.progress.overallScore >= 80) {
          progressStats.readyForHousing.push({
            clientId: wb.user._id,
            clientName: `${wb.user.firstName} ${wb.user.lastName}`,
            completedWorkbook: wb.title,
            score: wb.progress.overallScore,
            completionDate: wb.completionDate
          });
        }
      });

      progressStats.averageCompletionRate = workbooks.length > 0 ? 
        progressStats.averageCompletionRate / workbooks.length : 0;

      res.json({
        workbooks,
        statistics: progressStats
      });
    } catch (error) {
      console.error('Get workbook progress error:', error);
      res.status(500).json({ error: 'Failed to fetch workbook progress' });
    }
  }

  // Export certificates
  async exportCertificates(req, res) {
    try {
      const { agencyId } = req.params;
      const { clientId, category, dateFrom, dateTo } = req.query;

      // Verify agency access
      const agency = await Agency.findById(agencyId);
      if (!agency) {
        return res.status(404).json({ error: 'Agency not found' });
      }

      // Build filter for certificates
      let filter = { 
        'certificate.issued': true,
        user: { $in: agency.applications.map(app => app.user) }
      };
      
      if (clientId) filter.user = clientId;
      if (category) filter.category = category;
      if (dateFrom || dateTo) {
        filter.completionDate = {};
        if (dateFrom) filter.completionDate.$gte = new Date(dateFrom);
        if (dateTo) filter.completionDate.$lte = new Date(dateTo);
      }

      const certificates = await Workbook.find(filter)
        .populate('user', 'firstName lastName email')
        .select('title category completionDate certificate user')
        .sort({ completionDate: -1 });

      // Generate certificate data for export
      const exportData = certificates.map(cert => ({
        clientName: `${cert.user.firstName} ${cert.user.lastName}`,
        clientEmail: cert.user.email,
        workbookTitle: cert.title,
        category: cert.category,
        completionDate: cert.completionDate,
        certificateId: cert.certificate.certificateId,
        issuedDate: cert.certificate.issuedDate
      }));

      res.json({
        certificates: exportData,
        total: exportData.length,
        exportDate: new Date()
      });
    } catch (error) {
      console.error('Export certificates error:', error);
      res.status(500).json({ error: 'Failed to export certificates' });
    }
  }

  // Access secure vault
  async getVaultAccess(req, res) {
    try {
      const { agencyId, clientId } = req.params;
      const { permission } = req.query; // 'view' or 'download'

      // Verify agency has permission
      const agency = await Agency.findById(agencyId);
      if (!agency) {
        return res.status(404).json({ error: 'Agency not found' });
      }

      const hasApplication = agency.applications.some(app => app.user.toString() === clientId);
      if (!hasApplication) {
        return res.status(403).json({ error: 'Access denied to client vault' });
      }

      // Get accessible documents
      const accessFilter = {
        user: clientId,
        'access.agencies.agency': agencyId,
        'access.agencies.canView': true
      };

      if (permission === 'download') {
        accessFilter['access.agencies.canDownload'] = true;
      }

      const documents = await Document.find(accessFilter)
        .select('type title originalFileName mimeType isCertified certifiedDate access.agencies')
        .sort({ createdAt: -1 });

      res.json({
        documents,
        accessLevel: permission,
        totalDocuments: documents.length
      });
    } catch (error) {
      console.error('Get vault access error:', error);
      res.status(500).json({ error: 'Failed to access vault' });
    }
  }

  // Manage agency mailbox
  async getMailbox(req, res) {
    try {
      const { agencyId } = req.params;
      const { type, status, page = 1, limit = 20 } = req.query;

      const agency = await Agency.findById(agencyId);
      if (!agency) {
        return res.status(404).json({ error: 'Agency not found' });
      }

      // Build filter
      let filter = {};
      if (type) filter.type = type;
      if (status === 'unread') filter.read = false;

      // Get messages
      const messages = agency.mailbox.messages
        .filter(filter)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice((page - 1) * limit, page * limit);

      // Populate sender and recipient info
      const populatedMessages = await Promise.all(
        messages.map(async (msg) => {
          const populated = msg.toObject();
          if (msg.sender) {
            const sender = await User.findById(msg.sender).select('firstName lastName email');
            populated.sender = sender;
          }
          if (msg.recipient) {
            const recipient = await User.findById(msg.recipient).select('firstName lastName email');
            populated.recipient = recipient;
          }
          return populated;
        })
      );

      const total = agency.mailbox.messages.filter(filter).length;

      res.json({
        messages: populatedMessages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get mailbox error:', error);
      res.status(500).json({ error: 'Failed to fetch mailbox' });
    }
  }

  // Track outcomes and performance
  async getOutcomes(req, res) {
    try {
      const { agencyId } = req.params;
      const { period = '12months', category } = req.query;

      const agency = await Agency.findById(agencyId);
      if (!agency) {
        return res.status(404).json({ error: 'Agency not found' });
      }

      // Calculate date range based on period
      const now = new Date();
      let startDate;
      switch (period) {
        case '1month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          break;
        case '3months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
          break;
        case '6months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
          break;
        case '12months':
        default:
          startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          break;
      }

      // Get client IDs
      const clientIds = agency.applications.map(app => app.user);

      // Calculate outcomes
      const outcomes = {
        period: {
          start: startDate,
          end: now,
          label: period
        },
        applications: {
          total: agency.applications.length,
          approved: agency.applications.filter(app => app.status === 'approved').length,
          denied: agency.applications.filter(app => app.status === 'denied').length,
          waitlist: agency.applications.filter(app => app.status === 'waitlist').length,
          approvalRate: 0
        },
        workbooks: {
          total: 0,
          completed: 0,
          averageScore: 0,
          byCategory: {}
        },
        housing: {
          placed: 0, // This would need to be tracked separately
          placementRate: 0
        },
        engagement: {
          totalMeetings: 0,
          averageMeetingDuration: 0,
          noShowRate: 0
        }
      };

      // Calculate application approval rate
      outcomes.applications.approvalRate = outcomes.applications.total > 0 ? 
        (outcomes.applications.approved / outcomes.applications.total) * 100 : 0;

      // Get workbook statistics
      const workbooks = await Workbook.find({
        user: { $in: clientIds },
        updatedAt: { $gte: startDate }
      });

      outcomes.workbooks.total = workbooks.length;
      outcomes.workbooks.completed = workbooks.filter(wb => wb.status === 'completed').length;
      
      if (workbooks.length > 0) {
        const totalScore = workbooks.reduce((sum, wb) => sum + (wb.progress.overallScore || 0), 0);
        outcomes.workbooks.averageScore = totalScore / workbooks.length;
      }

      // Group workbooks by category
      workbooks.forEach(wb => {
        if (!outcomes.workbooks.byCategory[wb.category]) {
          outcomes.workbooks.byCategory[wb.category] = { total: 0, completed: 0 };
        }
        outcomes.workbooks.byCategory[wb.category].total++;
        if (wb.status === 'completed') {
          outcomes.workbooks.byCategory[wb.category].completed++;
        }
      });

      // Get meeting statistics
      const meetings = await ZoomMeeting.find({
        'caseContext.agencyId': agencyId,
        startTime: { $gte: startDate }
      });

      outcomes.engagement.totalMeetings = meetings.length;
      
      const completedMeetings = meetings.filter(m => m.status === 'ended');
      if (completedMeetings.length > 0) {
        const totalDuration = completedMeetings.reduce((sum, m) => sum + (m.actualDuration || 0), 0);
        outcomes.engagement.averageMeetingDuration = totalDuration / completedMeetings.length;
        
        const totalParticipants = completedMeetings.reduce((sum, m) => sum + m.participants.length, 0);
        const noShows = completedMeetings.reduce((sum, m) => 
          sum + m.participants.filter(p => p.status === 'no-show').length, 0);
        outcomes.engagement.noShowRate = totalParticipants > 0 ? (noShows / totalParticipants) * 100 : 0;
      }

      res.json(outcomes);
    } catch (error) {
      console.error('Get outcomes error:', error);
      res.status(500).json({ error: 'Failed to fetch outcomes data' });
    }
  }

  // Update agency profile
  async updateProfile(req, res) {
    try {
      const { agencyId } = req.params;
      const updates = req.body;

      const agency = await Agency.findById(agencyId);
      if (!agency) {
        return res.status(404).json({ error: 'Agency not found' });
      }

      Object.assign(agency, updates);
      await agency.save();

      res.json({
        success: true,
        message: 'Agency profile updated successfully',
        agency
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Failed to update agency profile' });
    }
  }

  // Manage staff
  async addStaff(req, res) {
    try {
      const { agencyId } = req.params;
      const { userId, role, permissions } = req.body;

      const agency = await Agency.findById(agencyId);
      if (!agency) {
        return res.status(404).json({ error: 'Agency not found' });
      }

      // Check if user already exists as staff
      const existingStaff = agency.staff.find(s => s.user.toString() === userId);
      if (existingStaff) {
        return res.status(400).json({ error: 'User is already staff member' });
      }

      // Add new staff member
      agency.staff.push({
        user: userId,
        role,
        permissions: permissions || [],
        startDate: new Date()
      });

      await agency.save();

      res.status(201).json({
        success: true,
        message: 'Staff member added successfully'
      });
    } catch (error) {
      console.error('Add staff error:', error);
      res.status(500).json({ error: 'Failed to add staff member' });
    }
  }

  async removeStaff(req, res) {
    try {
      const { agencyId, userId } = req.params;

      const agency = await Agency.findById(agencyId);
      if (!agency) {
        return res.status(404).json({ error: 'Agency not found' });
      }

      agency.staff = agency.staff.filter(s => s.user.toString() !== userId);
      await agency.save();

      res.json({
        success: true,
        message: 'Staff member removed successfully'
      });
    } catch (error) {
      console.error('Remove staff error:', error);
      res.status(500).json({ error: 'Failed to remove staff member' });
    }
  }
}

module.exports = new AgencyPortalController();
