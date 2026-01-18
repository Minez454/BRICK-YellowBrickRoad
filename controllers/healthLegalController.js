const { HealthLegal } = require('../models/HealthLegal');
const { sendMedicationReminder, sendAppointmentReminder, sendCourtDateReminder } = require('../utils/notifications');
const cron = require('node-cron');

class HealthLegalController {
  // Initialize health and legal tracker for user
  async initializeTracker(req, res) {
    try {
      const { userId } = req.body;

      let tracker = await HealthLegal.findOne({ user: userId });
      
      if (tracker) {
        return res.status(400).json({ error: 'Tracker already exists for this user' });
      }

      tracker = new HealthLegal({ user: userId });
      await tracker.save();

      res.status(201).json({
        success: true,
        message: 'Health and legal tracker initialized',
        tracker
      });
    } catch (error) {
      console.error('Initialize tracker error:', error);
      res.status(500).json({ error: 'Failed to initialize tracker' });
    }
  }

  // Medication management
  async addMedication(req, res) {
    try {
      const { userId, medication } = req.body;

      let tracker = await HealthLegal.findOne({ user: userId });
      if (!tracker) {
        tracker = new HealthLegal({ user: userId });
      }

      tracker.medications.push(medication);
      await tracker.save();

      // Schedule reminders if enabled
      if (medication.reminders.enabled) {
        this.scheduleMedicationReminders(tracker._id, medication);
      }

      res.status(201).json({
        success: true,
        message: 'Medication added successfully',
        medication: tracker.medications[tracker.medications.length - 1]
      });
    } catch (error) {
      console.error('Add medication error:', error);
      res.status(500).json({ error: 'Failed to add medication' });
    }
  }

  async updateMedication(req, res) {
    try {
      const { userId, medicationId } = req.params;
      const updates = req.body;

      const tracker = await HealthLegal.findOne({ user: userId });
      if (!tracker) {
        return res.status(404).json({ error: 'Tracker not found' });
      }

      const medication = tracker.medications.id(medicationId);
      if (!medication) {
        return res.status(404).json({ error: 'Medication not found' });
      }

      Object.assign(medication, updates);
      await tracker.save();

      res.json({
        success: true,
        message: 'Medication updated successfully',
        medication
      });
    } catch (error) {
      console.error('Update medication error:', error);
      res.status(500).json({ error: 'Failed to update medication' });
    }
  }

  async recordMedicationAdherence(req, res) {
    try {
      const { userId, medicationId } = req.params;
      const { taken, time } = req.body;

      const tracker = await HealthLegal.findOne({ user: userId });
      if (!tracker) {
        return res.status(404).json({ error: 'Tracker not found' });
      }

      const medication = tracker.medications.id(medicationId);
      if (!medication) {
        return res.status(404).json({ error: 'Medication not found' });
      }

      if (taken) {
        medication.adherence.dosesTaken += 1;
      } else {
        medication.adherence.dosesMissed += 1;
      }
      medication.adherence.totalDoses += 1;
      medication.adherence.adherenceRate = (medication.adherence.dosesTaken / medication.adherence.totalDoses) * 100;

      await tracker.save();
      await tracker.calculateStatistics();

      res.json({
        success: true,
        message: 'Medication adherence recorded',
        adherence: medication.adherence
      });
    } catch (error) {
      console.error('Record medication adherence error:', error);
      res.status(500).json({ error: 'Failed to record adherence' });
    }
  }

  // Appointment management
  async addAppointment(req, res) {
    try {
      const { userId, appointment } = req.body;

      let tracker = await HealthLegal.findOne({ user: userId });
      if (!tracker) {
        tracker = new HealthLegal({ user: userId });
      }

      tracker.appointments.push(appointment);
      await tracker.save();

      // Schedule reminders if enabled
      if (appointment.reminders.enabled) {
        this.scheduleAppointmentReminders(tracker._id, appointment);
      }

      res.status(201).json({
        success: true,
        message: 'Appointment added successfully',
        appointment: tracker.appointments[tracker.appointments.length - 1]
      });
    } catch (error) {
      console.error('Add appointment error:', error);
      res.status(500).json({ error: 'Failed to add appointment' });
    }
  }

  async updateAppointment(req, res) {
    try {
      const { userId, appointmentId } = req.params;
      const updates = req.body;

      const tracker = await HealthLegal.findOne({ user: userId });
      if (!tracker) {
        return res.status(404).json({ error: 'Tracker not found' });
      }

      const appointment = tracker.appointments.id(appointmentId);
      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      Object.assign(appointment, updates);
      await tracker.save();

      res.json({
        success: true,
        message: 'Appointment updated successfully',
        appointment
      });
    } catch (error) {
      console.error('Update appointment error:', error);
      res.status(500).json({ error: 'Failed to update appointment' });
    }
  }

  async getUpcomingAppointments(req, res) {
    try {
      const { userId } = req.params;
      const { days = 7 } = req.query;

      const tracker = await HealthLegal.findUpcomingAppointments(userId, parseInt(days));
      
      if (!tracker) {
        return res.json([]);
      }

      res.json(tracker.appointments || []);
    } catch (error) {
      console.error('Get upcoming appointments error:', error);
      res.status(500).json({ error: 'Failed to fetch upcoming appointments' });
    }
  }

  // Court date management
  async addCourtDate(req, res) {
    try {
      const { userId, courtDate } = req.body;

      let tracker = await HealthLegal.findOne({ user: userId });
      if (!tracker) {
        tracker = new HealthLegal({ user: userId });
      }

      tracker.courtDates.push(courtDate);
      await tracker.save();

      // Schedule reminders if enabled
      if (courtDate.reminders.enabled) {
        this.scheduleCourtDateReminders(tracker._id, courtDate);
      }

      res.status(201).json({
        success: true,
        message: 'Court date added successfully',
        courtDate: tracker.courtDates[tracker.courtDates.length - 1]
      });
    } catch (error) {
      console.error('Add court date error:', error);
      res.status(500).json({ error: 'Failed to add court date' });
    }
  }

  async updateCourtDate(req, res) {
    try {
      const { userId, courtDateId } = req.params;
      const updates = req.body;

      const tracker = await HealthLegal.findOne({ user: userId });
      if (!tracker) {
        return res.status(404).json({ error: 'Tracker not found' });
      }

      const courtDate = tracker.courtDates.id(courtDateId);
      if (!courtDate) {
        return res.status(404).json({ error: 'Court date not found' });
      }

      Object.assign(courtDate, updates);
      await tracker.save();

      res.json({
        success: true,
        message: 'Court date updated successfully',
        courtDate
      });
    } catch (error) {
      console.error('Update court date error:', error);
      res.status(500).json({ error: 'Failed to update court date' });
    }
  }

  async getUpcomingCourtDates(req, res) {
    try {
      const { userId } = req.params;
      const { days = 30 } = req.query;

      const tracker = await HealthLegal.findUpcomingCourtDates(userId, parseInt(days));
      
      if (!tracker) {
        return res.json([]);
      }

      res.json(tracker.courtDates || []);
    } catch (error) {
      console.error('Get upcoming court dates error:', error);
      res.status(500).json({ error: 'Failed to fetch upcoming court dates' });
    }
  }

  // Warrant management
  async addWarrant(req, res) {
    try {
      const { userId, warrant } = req.body;

      let tracker = await HealthLegal.findOne({ user: userId });
      if (!tracker) {
        tracker = new HealthLegal({ user: userId });
      }

      tracker.warrants.push(warrant);
      await tracker.save();

      // Send immediate alert if active warrant
      if (warrant.status === 'active' && warrant.alerts.enabled) {
        this.sendWarrantAlert(userId, warrant);
      }

      res.status(201).json({
        success: true,
        message: 'Warrant added successfully',
        warrant: tracker.warrants[tracker.warrants.length - 1]
      });
    } catch (error) {
      console.error('Add warrant error:', error);
      res.status(500).json({ error: 'Failed to add warrant' });
    }
  }

  async getActiveWarrants(req, res) {
    try {
      const { userId } = req.params;

      const tracker = await HealthLegal.findActiveWarrants(userId);
      
      if (!tracker) {
        return res.json([]);
      }

      res.json(tracker.warrants || []);
    } catch (error) {
      console.error('Get active warrants error:', error);
      res.status(500).json({ error: 'Failed to fetch active warrants' });
    }
  }

  // Get comprehensive tracker data
  async getTracker(req, res) {
    try {
      const { userId } = req.params;

      const tracker = await HealthLegal.findOne({ user: userId })
        .populate('medications.prescribedBy')
        .populate('appointments.provider')
        .populate('courtDates.legalRepresentation.lawyer');

      if (!tracker) {
        return res.status(404).json({ error: 'Tracker not found' });
      }

      // Calculate latest statistics
      await tracker.calculateStatistics();

      res.json(tracker);
    } catch (error) {
      console.error('Get tracker error:', error);
      res.status(500).json({ error: 'Failed to fetch tracker' });
    }
  }

  // Get statistics
  async getStatistics(req, res) {
    try {
      const { userId } = req.params;

      const tracker = await HealthLegal.findOne({ user: userId });
      if (!tracker) {
        return res.status(404).json({ error: 'Tracker not found' });
      }

      await tracker.calculateStatistics();
      res.json(tracker.statistics);
    } catch (error) {
      console.error('Get statistics error:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  }

  // Reminder scheduling methods
  scheduleMedicationReminders(trackerId, medication) {
    if (!medication.reminders.enabled || !medication.times.length) return;

    medication.times.forEach(time => {
      const [hours, minutes] = time.split(':');
      const cronExpression = `${minutes} ${hours} * * *`; // Daily at specified time

      cron.schedule(cronExpression, async () => {
        try {
          const tracker = await HealthLegal.findById(trackerId).populate('user');
          if (tracker && medication.isActive) {
            await sendMedicationReminder(tracker.user, medication);
          }
        } catch (error) {
          console.error('Medication reminder error:', error);
        }
      });
    });
  }

  scheduleAppointmentReminders(trackerId, appointment) {
    if (!appointment.reminders.enabled || !appointment.reminders.times.length) return;

    appointment.reminders.times.forEach(hoursBefore => {
      const reminderTime = new Date(appointment.dateTime);
      reminderTime.setHours(reminderTime.getHours() - hoursBefore);

      // Schedule one-time reminder
      const now = new Date();
      if (reminderTime > now) {
        const delay = reminderTime - now;
        setTimeout(async () => {
          try {
            const tracker = await HealthLegal.findById(trackerId).populate('user');
            if (tracker && appointment.status === 'scheduled') {
              await sendAppointmentReminder(tracker.user, appointment);
            }
          } catch (error) {
            console.error('Appointment reminder error:', error);
          }
        }, delay);
      }
    });
  }

  scheduleCourtDateReminders(trackerId, courtDate) {
    if (!courtDate.reminders.enabled || !courtDate.reminders.times.length) return;

    courtDate.reminders.times.forEach(daysBefore => {
      const reminderTime = new Date(courtDate.date);
      reminderTime.setDate(reminderTime.getDate() - daysBefore);

      const now = new Date();
      if (reminderTime > now) {
        const delay = reminderTime - now;
        setTimeout(async () => {
          try {
            const tracker = await HealthLegal.findById(trackerId).populate('user');
            if (tracker && courtDate.status === 'scheduled') {
              await sendCourtDateReminder(tracker.user, courtDate);
            }
          } catch (error) {
            console.error('Court date reminder error:', error);
          }
        }, delay);
      }
    });
  }

  async sendWarrantAlert(userId, warrant) {
    try {
      const User = require('../models/User');
      const user = await User.findById(userId);
      
      if (user && user.preferences.notifications.email) {
        await sendEmail(
          user.email,
          'URGENT: Active Warrant Alert',
          `An active warrant has been added to your profile. Type: ${warrant.type}, Severity: ${warrant.severity}. Please contact legal assistance immediately.`
        );
      }

      if (user && user.preferences.notifications.sms) {
        await sendSMS(
          user.phone,
          `URGENT: Active warrant alert. Contact legal assistance immediately.`
        );
      }
    } catch (error) {
      console.error('Send warrant alert error:', error);
    }
  }
}

module.exports = new HealthLegalController();
