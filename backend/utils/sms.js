const twilio = require('twilio');
const logger = require('./logger');
const { InternalServerError } = require('./errorResponse');

class SMSService {
  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    this.from = process.env.TWILIO_PHONE_NUMBER;
  }

  /**
   * Send an SMS message
   * @param {string} to - Recipient phone number (with country code, e.g., +1234567890)
   * @param {string} message - Message content
   * @returns {Promise<Object>} - Result of sending the SMS
   */
  async sendSMS(to, message) {
    try {
      if (!this.isValidPhoneNumber(to)) {
        throw new Error('Invalid phone number format');
      }

      const response = await this.client.messages.create({
        body: message,
        from: this.from,
        to: this.formatPhoneNumber(to),
      });

      logger.info(`SMS sent to ${to}: ${response.sid}`);
      
      return {
        success: true,
        messageId: response.sid,
        status: response.status,
        to: response.to,
        dateCreated: response.dateCreated,
      };
    } catch (error) {
      logger.error('Error sending SMS:', error);
      throw new InternalServerError('Failed to send SMS');
    }
  }

  /**
   * Send an OTP (One-Time Password) via SMS
   * @param {string} to - Recipient phone number
   * @param {string} otp - The OTP code
   * @param {number} expiryMinutes - OTP expiry time in minutes (default: 10)
   * @returns {Promise<Object>} - Result of sending the OTP
   */
  async sendOTP(to, otp, expiryMinutes = 10) {
    const message = `Your OTP for verification is: ${otp}. It will expire in ${expiryMinutes} minutes.`;
    
    return this.sendSMS(to, message);
  }

  /**
   * Send an invoice notification via SMS
   * @param {string} to - Recipient phone number
   * @param {string} customerName - Customer's name
   * @param {Object} invoice - Invoice details
   * @param {string} invoice.invoiceNumber - Invoice number
   * @param {number} invoice.amount - Invoice amount
   * @param {string} invoice.dueDate - Invoice due date
   * @returns {Promise<Object>} - Result of sending the SMS
   */
  async sendInvoiceNotification(to, customerName, invoice) {
    const message = `Hi ${customerName}, your invoice #${invoice.invoiceNumber} for ₹${invoice.amount} is due on ${invoice.dueDate}. Thank you for your business!`;
    
    return this.sendSMS(to, message);
  }

  /**
   * Send a payment confirmation via SMS
   * @param {string} to - Recipient phone number
   * @param {string} customerName - Customer's name
   * @param {Object} payment - Payment details
   * @param {string} payment.invoiceNumber - Invoice number
   * @param {number} payment.amount - Payment amount
   * @param {string} payment.date - Payment date
   * @returns {Promise<Object>} - Result of sending the SMS
   */
  async sendPaymentConfirmation(to, customerName, payment) {
    const message = `Hi ${customerName}, we've received your payment of ₹${payment.amount} for invoice #${payment.invoiceNumber} on ${payment.date}. Thank you!`;
    
    return this.sendSMS(to, message);
  }

  /**
   * Send a low stock alert to admin/staff
   * @param {string} to - Recipient phone number (admin/staff)
   * @param {Array} products - List of products with low stock
   * @returns {Promise<Object>} - Result of sending the SMS
   */
  async sendLowStockAlert(to, products) {
    const productList = products
      .map(p => `${p.name} (${p.currentStock} ${p.unit} left)`)
      .join(', ');
    
    const message = `Low stock alert! The following products are running low: ${productList}. Please restock soon.`;
    
    return this.sendSMS(to, message);
  }

  /**
   * Validate phone number format
   * @param {string} phoneNumber - Phone number to validate
   * @returns {boolean} - True if valid, false otherwise
   */
  isValidPhoneNumber(phoneNumber) {
    // Simple validation - can be enhanced with a more robust library
    return /^\+?[1-9]\d{9,14}$/.test(phoneNumber);
  }

  /**
   * Format phone number to E.164 format (e.g., +1234567890)
   * @param {string} phoneNumber - Phone number to format
   * @returns {string} - Formatted phone number
   */
  formatPhoneNumber(phoneNumber) {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');
    
    // If number doesn't start with '+', add the default country code (e.g., +91 for India)
    if (!phoneNumber.startsWith('+')) {
      return `+91${digits}`; // Default to India
    }
    
    return `+${digits}`;
  }
}

// Create a singleton instance
const smsService = new SMSService();

module.exports = smsService;
