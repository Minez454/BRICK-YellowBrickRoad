const nodemailer = require('nodemailer');
const twilio = require('twilio');

// Email configuration
const emailTransporter = nodemailer.createTransporter({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Twilio configuration
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

class NotificationService {
  // Send email
  async sendEmail(to, subject, message, attachments = []) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        text: message,
        html: this.generateEmailHTML(message),
        attachments
      };

      const result = await emailTransporter.sendMail(mailOptions);
      console.log('Email sent:', result.messageId);
      return result;
    } catch (error) {
      console.error('Email send error:', error);
      throw new Error('Failed to send email');
    }
  }

  // Send SMS
  async sendSMS(to, message) {
    try {
      const result = await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to
      });

      console.log('SMS sent:', result.sid);
      return result;
    } catch (error) {
      console.error('SMS send error:', error);
      throw new Error('Failed to send SMS');
    }
  }

  // Generate HTML email template
  generateEmailHTML(message) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Briggs AI Guide Notification</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: #2563eb;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background: #f8fafc;
            padding: 30px;
            border-radius: 0 0 8px 8px;
          }
          .button {
            display: inline-block;
            background: #2563eb;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Briggs AI Guide</h1>
          <p>Your Personal Case Management Assistant</p>
        </div>
        <div class="content">
          ${message.replace(/\n/g, '<br>')}
          <div class="footer">
            <p>This message was sent by Briggs AI Guide. If you need assistance, please contact your case worker.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Send workbook completion notification
  async sendWorkbookCompletionNotification(user, workbook) {
    const message = `
      Congratulations ${user.firstName}!
      
      You have successfully completed the "${workbook.title}" workbook.
      
      Completion Summary:
      - Score: ${workbook.progress.overallScore}%
      - Time Spent: ${Math.round(workbook.progress.timeSpent / 60)} hours
      - Completed: ${workbook.completionDate.toLocaleDateString()}
      
      Your certificate of completion is now available in your profile.
      
      Keep up the great work!
    `;

    if (user.preferences.notifications.email) {
      await this.sendEmail(
        user.email,
        'Workbook Completed!',
        message
      );
    }

    if (user.preferences.notifications.sms) {
      await this.sendSMS(
        user.phone,
        `Congratulations! You completed the ${workbook.title} workbook. View your certificate in your profile.`
      );
    }

    // Notify case worker if assigned
    if (user.caseWorker) {
      const caseWorker = await User.findById(user.caseWorker);
      if (caseWorker) {
        await this.sendEmail(
          caseWorker.email,
          `Client Workbook Completed: ${user.firstName} ${user.lastName}`,
          `${user.firstName} ${user.lastName} has completed the "${workbook.title}" workbook with a score of ${workbook.progress.overallScore}%.`
        );
      }
    }
  }

  // Send appointment reminder
  async sendAppointmentReminder(user, appointment) {
    const message = `
      Appointment Reminder:
      
      Date: ${appointment.date.toLocaleDateString()}
      Time: ${appointment.time}
      Location: ${appointment.location}
      Type: ${appointment.type}
      
      Please arrive 15 minutes early and bring any required documents.
      
      If you need to reschedule, please contact your case worker.
    `;

    if (user.preferences.notifications.email) {
      await this.sendEmail(
        user.email,
        'Appointment Reminder',
        message
      );
    }

    if (user.preferences.notifications.sms) {
      await this.sendSMS(
        user.phone,
        `Reminder: Appointment on ${appointment.date.toLocaleDateString()} at ${appointment.time} - ${appointment.location}`
      );
    }
  }

  // Send medication reminder
  async sendMedicationReminder(user, medication) {
    const message = `Medication Reminder: It's time to take ${medication.name} - ${medication.dosage}`;

    if (user.preferences.notifications.sms) {
      await this.sendSMS(user.phone, message);
    }

    if (user.preferences.notifications.email) {
      await this.sendEmail(
        user.email,
        'Medication Reminder',
        message
      );
    }
  }

  // Send bed availability alert
  async sendBedAvailabilityAlert(users, agency, bedsAvailable) {
    const message = `
      Bed Availability Alert!
      
      ${agency.name} has ${bedsAvailable} bed(s) available.
      
      Address: ${agency.contact.address.street}, ${agency.contact.address.city}
      Phone: ${agency.contact.phone}
      
      First come, first served. Please arrive before 5:00 PM.
    `;

    for (const user of users) {
      if (user.preferences.notifications.email) {
        await this.sendEmail(
          user.email,
          'Bed Available!',
          message
        );
      }

      if (user.preferences.notifications.sms) {
        await this.sendSMS(
          user.phone,
          `URGENT: ${agency.name} has ${bedsAvailable} bed(s) available. Call ${agency.contact.phone} now!`
        );
      }
    }
  }

  // Send court date reminder
  async sendCourtDateReminder(user, courtDate) {
    const message = `
      Court Date Reminder:
      
      Date: ${courtDate.date.toLocaleDateString()}
      Time: ${courtDate.time}
      Location: ${courtDate.courthouse}
      Case Number: ${courtDate.caseNumber}
      
      Please arrive 30 minutes early and bring all required documents.
      Dress appropriately for court.
      
      If you need legal assistance, contact Legal Aid.
    `;

    if (user.preferences.notifications.email) {
      await this.sendEmail(
        user.email,
        'Court Date Reminder',
        message
      );
    }

    if (user.preferences.notifications.sms) {
      await this.sendSMS(
        user.phone,
        `Court date reminder: ${courtDate.date.toLocaleDateString()} at ${courtDate.time} - ${courtDate.courthouse}`
      );
    }
  }
}

module.exports = new NotificationService();
