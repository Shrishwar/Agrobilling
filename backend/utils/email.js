const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs').promises;
const logger = require('./logger');
const { InternalServerError } = require('./errorResponse');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    });

    // Verify connection configuration
    this.transporter.verify((error) => {
      if (error) {
        logger.error('Error with email configuration:', error);
      } else {
        logger.info('Email server is ready to take our messages');
      }
    });
  }

  /**
   * Send an email
   * @param {Object} options - Email options
   * @param {string|Array} options.to - Email recipient(s)
   * @param {string} options.subject - Email subject
   * @param {string} options.template - EJS template name (without extension)
   * @param {Object} options.templateVars - Variables to pass to the template
   * @param {string} options.text - Plain text version
   * @param {string} options.html - HTML version (alternative to template)
   * @param {Array} options.attachments - Email attachments
   * @returns {Promise<Object>} - Result of sending the email
   */
  async sendEmail({
    to,
    subject,
    template,
    templateVars = {},
    text,
    html,
    attachments = [],
  }) {
    try {
      // Set default from address
      const from = `"${process.env.EMAIL_FROM_NAME || 'Agro Billing System'}" <${
        process.env.EMAIL_FROM
      }>`;

      // If template is provided, render it
      if (template) {
        const templatePath = path.join(
          __dirname,
          '..',
          'templates',
          'emails',
          `${template}.ejs`
        );

        // Add default template variables
        const templateData = {
          appName: process.env.APP_NAME || 'Agro Billing System',
          appUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
          year: new Date().getFullYear(),
          ...templateVars,
        };

        // Render template
        html = await ejs.renderFile(templatePath, templateData);
        
        // If no text version provided, generate one from HTML
        if (!text) {
          text = html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
        }
      }

      // Prepare email options
      const mailOptions = {
        from,
        to,
        subject,
        text,
        html,
        attachments,
      };

      // Send email
      const info = await this.transporter.sendMail(mailOptions);
      
      logger.info(`Email sent: ${info.messageId}`);
      return {
        success: true,
        messageId: info.messageId,
        response: info.response,
      };
    } catch (error) {
      logger.error('Error sending email:', error);
      throw new InternalServerError('Failed to send email');
    }
  }

  /**
   * Send a welcome email to new users
   * @param {string} to - Email address
   * @param {string} name - User's name
   * @param {string} verificationToken - Email verification token
   * @returns {Promise<Object>} - Result of sending the email
   */
  async sendWelcomeEmail(to, name, verificationToken = null) {
    const verificationUrl = verificationToken
      ? `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`
      : null;

    return this.sendEmail({
      to,
      subject: 'Welcome to Agro Billing System',
      template: 'welcome',
      templateVars: {
        name,
        verificationUrl,
      },
    });
  }

  /**
   * Send a password reset email
   * @param {string} to - Email address
   * @param {string} name - User's name
   * @param {string} resetToken - Password reset token
   * @returns {Promise<Object>} - Result of sending the email
   */
  async sendPasswordResetEmail(to, name, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    return this.sendEmail({
      to,
      subject: 'Reset Your Password',
      template: 'password-reset',
      templateVars: {
        name,
        resetUrl,
        expiryHours: 1, // Token expiry time in hours
      },
    });
  }

  /**
   * Send an invoice email
   * @param {string} to - Email address
   * @param {string} name - Customer's name
   * @param {Object} invoice - Invoice details
   * @param {Buffer} pdfBuffer - PDF buffer of the invoice
   * @returns {Promise<Object>} - Result of sending the email
   */
  async sendInvoiceEmail(to, name, invoice, pdfBuffer) {
    return this.sendEmail({
      to,
      subject: `Your Invoice #${invoice.invoiceNumber} from ${process.env.APP_NAME || 'Agro Billing System'}`,
      template: 'invoice',
      templateVars: {
        name,
        invoice,
        companyName: process.env.COMPANY_NAME || 'Agro Billing System',
        companyEmail: process.env.EMAIL_FROM,
        companyPhone: process.env.COMPANY_PHONE || '',
      },
      attachments: [
        {
          filename: `Invoice-${invoice.invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });
  }
}

// Create a singleton instance
const emailService = new EmailService();

module.exports = emailService;
