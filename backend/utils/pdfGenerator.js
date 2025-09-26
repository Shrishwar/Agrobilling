const PDFDocument = require('pdfkit');
const fs = require('fs').promises;
const path = require('path');
// const { format } = require('date-fns'); // Replaced with local function
const { v4: uuidv4 } = require('uuid');

// Simple date format function
const format = (date, pattern) => {
  if (pattern === 'dd/MM/yyyy') {
    return date.toLocaleDateString('en-GB');
  }
  return date.toISOString().split('T')[0];
};
const logger = require('./logger');
const { InternalServerError } = require('./errorResponse');

class PDFGenerator {
  constructor() {
    this.doc = new PDFDocument({ size: 'A4', margin: 50 });
    this.chunks = [];
    this.fileName = `document-${uuidv4()}.pdf`;
    this.filePath = path.join(__dirname, '../temp', this.fileName);
    
    // Ensure temp directory exists
    this.ensureTempDirectory();
  }

  /**
   * Ensure the temp directory exists
   */
  async ensureTempDirectory() {
    const tempDir = path.join(__dirname, '../temp');
    try {
      await fs.mkdir(tempDir, { recursive: true });
    } catch (error) {
      logger.error('Error creating temp directory:', error);
      throw new InternalServerError('Failed to create temporary directory');
    }
  }

  /**
   * Generate an invoice PDF
   * @param {Object} invoice - Invoice data
   * @param {Object} company - Company details
   * @returns {Promise<Buffer>} - PDF buffer
   */
  async generateInvoice(invoice, company = {}) {
    return new Promise((resolve, reject) => {
      try {
        const writeStream = fs.createWriteStream(this.filePath);
        
        // Handle PDF events
        this.doc.on('data', (chunk) => this.chunks.push(chunk));
        
        this.doc.pipe(writeStream);
        
        // Add header
        this.addHeader(company);
        
        // Add customer information
        this.addCustomerInfo(invoice.customer, invoice.invoiceNumber, invoice.date, invoice.dueDate);
        
        // Add invoice items table
        this.addInvoiceTable(invoice.items);
        
        // Add invoice totals
        this.addInvoiceTotals(invoice);
        
        // Add footer
        this.addFooter(company);
        
        // Finalize the PDF
        this.doc.end();
        
        // When PDF generation is complete
        writeStream.on('finish', async () => {
          try {
            // Read the generated file
            const pdfBuffer = await fs.readFile(this.filePath);
            
            // Clean up the temporary file
            await fs.unlink(this.filePath);
            
            resolve(pdfBuffer);
          } catch (error) {
            logger.error('Error reading generated PDF:', error);
            reject(new InternalServerError('Failed to generate PDF'));
          }
        });
        
        writeStream.on('error', (error) => {
          logger.error('Error writing PDF to file:', error);
          reject(new InternalServerError('Failed to generate PDF'));
        });
        
      } catch (error) {
        logger.error('Error generating PDF:', error);
        reject(new InternalServerError('Failed to generate PDF'));
      }
    });
  }

  /**
   * Add header to the PDF
   * @param {Object} company - Company details
   */
  addHeader(company) {
    // Add company logo if available
    if (company.logo) {
      this.doc.image(company.logo, 50, 45, { width: 100 });
    }
    
    // Add company name and details
    this.doc
      .fontSize(20)
      .text(company.name || 'Agro Billing System', 200, 50, { align: 'right' })
      .fontSize(10)
      .text(company.address || '123 Farm Street, Agro City', 200, 80, { align: 'right', width: 300 })
      .text(`Phone: ${company.phone || 'N/A'} | Email: ${company.email || 'contact@agrobilling.com'}`, 200, 100, { align: 'right', width: 300 })
      .text(`GSTIN: ${company.gstin || 'N/A'}`, 200, 115, { align: 'right', width: 300 });
    
    // Add a line
    this.doc.moveTo(50, 140).lineTo(550, 140).stroke();
  }

  /**
   * Add customer information to the PDF
   * @param {Object} customer - Customer details
   * @param {string} invoiceNumber - Invoice number
   * @param {Date} invoiceDate - Invoice date
   * @param {Date} dueDate - Due date
   */
  addCustomerInfo(customer, invoiceNumber, invoiceDate, dueDate) {
    // Invoice info
    this.doc
      .fontSize(20)
      .text('INVOICE', 50, 160)
      .fontSize(10)
      .text(`Invoice #: ${invoiceNumber}`, 50, 200)
      .text(`Date: ${format(new Date(invoiceDate), 'dd/MM/yyyy')}`, 50, 215)
      .text(`Due Date: ${format(new Date(dueDate), 'dd/MM/yyyy')}`, 50, 230);
    
    // Customer info
    this.doc
      .fontSize(10)
      .text('Bill To:', 350, 160)
      .font('Helvetica-Bold')
      .text(customer.name, 350, 180)
      .font('Helvetica')
      .text(customer.address, 350, 195, { width: 200 })
      .text(`Phone: ${customer.phone}`, 350, 230)
      .text(`Email: ${customer.email || 'N/A'}`, 350, 245);
    
    if (customer.gstin) {
      this.doc.text(`GSTIN: ${customer.gstin}`, 350, 260);
    }
    
    // Add a line
    this.doc.moveTo(50, 280).lineTo(550, 280).stroke();
  }

  /**
   * Add invoice items table to the PDF
   * @param {Array} items - Invoice items
   */
  addInvoiceTable(items) {
    // Table header
    this.doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('Description', 50, 300)
      .text('HSN', 200, 300, { width: 60, align: 'right' })
      .text('Qty', 270, 300, { width: 50, align: 'right' })
      .text('Rate', 330, 300, { width: 60, align: 'right' })
      .text('Tax %', 400, 300, { width: 50, align: 'right' })
      .text('Amount', 460, 300, { width: 90, align: 'right' });
    
    // Table rows
    let y = 320;
    this.doc.font('Helvetica').fontSize(10);
    
    items.forEach((item, index) => {
      // Add a small gap after every 5 items for better readability
      if (index > 0 && index % 5 === 0) {
        this.doc.moveTo(50, y - 10).lineTo(550, y - 10).stroke();
        y += 10;
      }
      
      this.doc
        .text(item.description, 50, y, { width: 140, lineGap: 5 })
        .text(item.hsn || 'N/A', 200, y, { width: 60, align: 'right' })
        .text(item.quantity.toString(), 270, y, { width: 50, align: 'right' })
        .text(this.formatCurrency(item.rate), 330, y, { width: 60, align: 'right' })
        .text(`${item.taxRate}%`, 400, y, { width: 50, align: 'right' })
        .text(this.formatCurrency(item.amount), 460, y, { width: 90, align: 'right' });
      
      y += 20;
      
      // Add page break if needed
      if (y > 700) {
        this.doc.addPage();
        y = 100;
      }
    });
    
    // Add a line after the table
    this.doc.moveTo(50, y).lineTo(550, y).stroke();
  }

  /**
   * Add invoice totals to the PDF
   * @param {Object} invoice - Invoice data
   */
  addInvoiceTotals(invoice) {
    const subtotal = invoice.items.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = invoice.taxAmount || 0;
    const discount = invoice.discount || 0;
    const total = invoice.total || (subtotal + taxAmount - discount);
    
    let y = this.doc.y + 30;
    
    this.doc
      .font('Helvetica-Bold')
      .text('Subtotal:', 400, y, { width: 150, align: 'right' })
      .font('Helvetica')
      .text(this.formatCurrency(subtotal), 460, y, { width: 90, align: 'right' });
    
    if (discount > 0) {
      y += 20;
      this.doc
        .font('Helvetica-Bold')
        .text('Discount:', 400, y, { width: 150, align: 'right' })
        .font('Helvetica')
        .text(`-${this.formatCurrency(discount)}`, 460, y, { width: 90, align: 'right' });
    }
    
    if (taxAmount > 0) {
      y += 20;
      this.doc
        .font('Helvetica-Bold')
        .text('Tax:', 400, y, { width: 150, align: 'right' })
        .font('Helvetica')
        .text(this.formatCurrency(taxAmount), 460, y, { width: 90, align: 'right' });
    }
    
    y += 20;
    this.doc
      .font('Helvetica-Bold')
      .text('Total:', 400, y, { width: 150, align: 'right' })
      .font('Helvetica')
      .text(this.formatCurrency(total), 460, y, { width: 90, align: 'right' });
    
    // Add amount in words
    y += 30;
    this.doc
      .font('Helvetica')
      .fontSize(10)
      .text('Amount in words:', 50, y)
      .font('Helvetica-Italic')
      .text(this.numberToWords(total) + ' Rupees Only', 50, y + 15, { width: 500 });
  }

  /**
   * Add footer to the PDF
   * @param {Object} company - Company details
   */
  addFooter(company) {
    const y = this.doc.page.height - 100;
    
    this.doc
      .fontSize(10)
      .text('Thank you for your business!', 50, y, { align: 'center', width: 500 })
      .fontSize(8)
      .text(company.footer || 'This is a computer-generated invoice. No signature required.', 50, y + 30, { align: 'center', width: 500 });
  }

  /**
   * Format currency
   * @param {number} amount - Amount to format
   * @returns {string} Formatted currency string
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Convert number to words
   * @param {number} num - Number to convert
   * @returns {string} Number in words
   */
  numberToWords(num) {
    const single = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const double = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const formatTens = (num) => {
      if (num < 10) return single[num];
      if (num >= 10 && num < 20) return double[num - 10];
      return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + single[num % 10] : '');
    };
    
    if (num === 0) return 'Zero';
    
    const convert = (num) => {
      if (num < 100) return formatTens(num);
      if (num < 1000) return single[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' and ' + formatTens(num % 100) : '');
      if (num < 100000) return convert(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + convert(num % 1000) : '');
      if (num < 10000000) return convert(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + convert(num % 100000) : '');
      return convert(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + convert(num % 10000000) : '');
    };
    
    return convert(Math.floor(num)) + (num % 1 !== 0 ? ' and ' + Math.round((num % 1) * 100) + '/100' : '');
  }
}

// Create a singleton instance
const pdfGenerator = new PDFGenerator();

module.exports = pdfGenerator;
